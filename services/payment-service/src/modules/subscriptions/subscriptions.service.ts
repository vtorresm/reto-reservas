import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from '../../entities/subscription.entity';

export interface CreateSubscriptionDto {
  userId: string;
  type: string;
  name: string;
  amount: number;
  interval: string;
  intervalCount?: number;
  trialDays?: number;
  paymentMethodId?: string;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
  ) {}

  async create(createSubscriptionDto: CreateSubscriptionDto): Promise<Subscription> {
    try {
      this.logger.log(`Creando suscripción para usuario ${createSubscriptionDto.userId}`);

      const subscription = Subscription.createSubscription(
        createSubscriptionDto.userId,
        createSubscriptionDto.type as any,
        createSubscriptionDto.name,
        createSubscriptionDto.amount,
        createSubscriptionDto.interval as any,
        createSubscriptionDto.intervalCount || 1,
        createSubscriptionDto.trialDays || 0,
      );

      if (createSubscriptionDto.paymentMethodId) {
        subscription.paymentMethodId = createSubscriptionDto.paymentMethodId;
      }

      const savedSubscription = await this.subscriptionRepository.save(subscription);

      this.logger.log(`Suscripción creada exitosamente: ${savedSubscription.id}`);
      return savedSubscription;
    } catch (error) {
      this.logger.error(`Error creando suscripción: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(query: any = {}): Promise<Subscription[]> {
    try {
      const {
        userId,
        status,
        type,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = query;

      const queryBuilder = this.subscriptionRepository.createQueryBuilder('subscription');

      if (userId) {
        queryBuilder.where('subscription.userId = :userId', { userId });
      }

      if (status) {
        queryBuilder.andWhere('subscription.status = :status', { status });
      }

      if (type) {
        queryBuilder.andWhere('subscription.type = :type', { type });
      }

      queryBuilder
        .orderBy(`subscription.${sortBy}`, sortOrder.toUpperCase())
        .skip((page - 1) * limit)
        .take(limit);

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(`Error obteniendo suscripciones: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<Subscription> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id },
      });

      if (!subscription) {
        throw new NotFoundException(`Suscripción no encontrada: ${id}`);
      }

      return subscription;
    } catch (error) {
      this.logger.error(`Error obteniendo suscripción ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, updateSubscriptionDto: any): Promise<Subscription> {
    try {
      this.logger.log(`Actualizando suscripción: ${id}`);

      const subscription = await this.findOne(id);
      Object.assign(subscription, updateSubscriptionDto);
      return await this.subscriptionRepository.save(subscription);
    } catch (error) {
      this.logger.error(`Error actualizando suscripción ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async cancel(id: string, reason?: string): Promise<Subscription> {
    try {
      const subscription = await this.findOne(id);

      if (!subscription.canBeCancelled()) {
        throw new BadRequestException('La suscripción no se puede cancelar');
      }

      subscription.markAsCancelled(reason);
      return await this.subscriptionRepository.save(subscription);
    } catch (error) {
      this.logger.error(`Error cancelando suscripción ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async reactivate(id: string): Promise<Subscription> {
    try {
      const subscription = await this.findOne(id);

      if (!subscription.canBeReactivated()) {
        throw new BadRequestException('La suscripción no se puede reactivar');
      }

      subscription.reactivate();
      return await this.subscriptionRepository.save(subscription);
    } catch (error) {
      this.logger.error(`Error reactivando suscripción ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    try {
      return await this.subscriptionRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error obteniendo suscripciones del usuario: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getActiveSubscriptions(): Promise<Subscription[]> {
    try {
      return await this.subscriptionRepository.find({
        where: { status: SubscriptionStatus.ACTIVE },
        order: { nextBillingDate: 'ASC' },
      });
    } catch (error) {
      this.logger.error(`Error obteniendo suscripciones activas: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getSubscriptionsDueForBilling(): Promise<Subscription[]> {
    try {
      const now = new Date();
      return await this.subscriptionRepository.find({
        where: {
          status: SubscriptionStatus.ACTIVE,
          nextBillingDate: { $lte: now },
        },
        order: { nextBillingDate: 'ASC' },
      });
    } catch (error) {
      this.logger.error(`Error obteniendo suscripciones para facturación: ${error.message}`, error.stack);
      throw error;
    }
  }

  async processBillingCycle(subscriptionId: string): Promise<{
    success: boolean;
    nextBillingDate: Date;
    error?: string;
  }> {
    try {
      const subscription = await this.findOne(subscriptionId);

      if (subscription.status !== SubscriptionStatus.ACTIVE) {
        throw new BadRequestException('La suscripción no está activa');
      }

      // Procesar pago (simulado)
      const paymentSuccess = await this.processSubscriptionPayment(subscription);

      if (paymentSuccess) {
        subscription.markPaymentSuccessful();
        subscription.nextBillingDate = subscription.calculateNextBillingDate();
        await this.subscriptionRepository.save(subscription);

        return {
          success: true,
          nextBillingDate: subscription.nextBillingDate,
        };
      } else {
        subscription.markAsPastDue();
        await this.subscriptionRepository.save(subscription);

        return {
          success: false,
          nextBillingDate: subscription.nextBillingDate,
          error: 'Error procesando pago de suscripción',
        };
      }
    } catch (error) {
      this.logger.error(`Error procesando ciclo de facturación: ${error.message}`, error.stack);
      return {
        success: false,
        nextBillingDate: new Date(),
        error: error.message,
      };
    }
  }

  async getSubscriptionStats(): Promise<any> {
    try {
      const stats = await this.subscriptionRepository
        .createQueryBuilder('subscription')
        .select([
          'subscription.status',
          'COUNT(*) as count',
          'SUM(subscription.amount) as totalAmount',
        ])
        .groupBy('subscription.status')
        .getRawMany();

      const totalSubscriptions = stats.reduce((sum, item) => sum + parseInt(item.count), 0);
      const totalRevenue = stats.reduce((sum, item) => sum + parseFloat(item.totalAmount || 0), 0);

      return {
        totalSubscriptions,
        totalRevenue,
        statusBreakdown: stats,
      };
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas de suscripciones: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Métodos auxiliares privados

  private async processSubscriptionPayment(subscription: Subscription): Promise<boolean> {
    try {
      // Simular procesamiento de pago
      // En implementación real, se integraría con el servicio de pagos
      this.logger.log(`Procesando pago para suscripción ${subscription.id}: $${subscription.amount}`);

      // Simular éxito de pago
      return Math.random() > 0.1; // 90% éxito
    } catch (error) {
      this.logger.error(`Error procesando pago de suscripción: ${error.message}`);
      return false;
    }
  }
}