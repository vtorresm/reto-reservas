import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingPolicy } from '../../entities/booking-policy.entity';

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(
    @InjectRepository(BookingPolicy)
    private bookingPolicyRepository: Repository<BookingPolicy>,
  ) {}

  async create(createPolicyDto: any): Promise<BookingPolicy> {
    try {
      this.logger.log(`Creando nueva política: ${createPolicyDto.name}`);

      const policy = this.bookingPolicyRepository.create(createPolicyDto);
      return await this.bookingPolicyRepository.save(policy);
    } catch (error) {
      this.logger.error(`Error creando política: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(): Promise<BookingPolicy[]> {
    try {
      return await this.bookingPolicyRepository.find({
        where: { isActive: true },
        order: { priority: 'DESC', name: 'ASC' },
      });
    } catch (error) {
      this.logger.error(`Error obteniendo políticas: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<BookingPolicy> {
    try {
      const policy = await this.bookingPolicyRepository.findOne({
        where: { id },
      });

      if (!policy) {
        throw new Error(`Política no encontrada: ${id}`);
      }

      return policy;
    } catch (error) {
      this.logger.error(`Error obteniendo política ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, updatePolicyDto: any): Promise<BookingPolicy> {
    try {
      this.logger.log(`Actualizando política: ${id}`);

      const policy = await this.bookingPolicyRepository.findOne({
        where: { id },
      });

      if (!policy) {
        throw new Error(`Política no encontrada: ${id}`);
      }

      Object.assign(policy, updatePolicyDto);
      return await this.bookingPolicyRepository.save(policy);
    } catch (error) {
      this.logger.error(`Error actualizando política ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Eliminando política: ${id}`);

      const policy = await this.bookingPolicyRepository.findOne({
        where: { id },
      });

      if (!policy) {
        throw new Error(`Política no encontrada: ${id}`);
      }

      if (policy.isSystem) {
        throw new Error('No se puede eliminar una política del sistema');
      }

      await this.bookingPolicyRepository.remove(policy);
    } catch (error) {
      this.logger.error(`Error eliminando política ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getApplicablePolicies(
    resourceType?: string,
    resourceId?: string,
    userRole?: string,
    membershipLevel?: string,
  ): Promise<BookingPolicy[]> {
    try {
      const policies = await this.bookingPolicyRepository.find({
        where: { isActive: true },
        order: { priority: 'DESC' },
      });

      return policies.filter(policy =>
        policy.isApplicableToResource(resourceType, resourceId) &&
        policy.isApplicableToUser(userRole, membershipLevel),
      );
    } catch (error) {
      this.logger.error(`Error obteniendo políticas aplicables: ${error.message}`, error.stack);
      throw error;
    }
  }

  async validateBookingAgainstPolicies(
    bookingData: any,
    policies: BookingPolicy[],
  ): Promise<{ allowed: boolean; reason?: string; appliedPolicies: string[] }> {
    const appliedPolicies: string[] = [];

    for (const policy of policies) {
      appliedPolicies.push(policy.name);

      // Validar duración
      if (policy.minBookingDuration || policy.maxBookingDuration) {
        const duration = this.calculateDuration(bookingData.startTime, bookingData.endTime);
        const durationValidation = policy.validateBookingDuration(duration);

        if (!durationValidation.valid) {
          return {
            allowed: false,
            reason: durationValidation.reason,
            appliedPolicies,
          };
        }
      }

      // Validar anticipación
      if (policy.minAdvanceBooking || policy.maxAdvanceBooking) {
        const hoursInAdvance = this.calculateHoursInAdvance(bookingData.date, bookingData.startTime);
        const advanceValidation = policy.validateAdvanceBooking(hoursInAdvance);

        if (!advanceValidation.valid) {
          return {
            allowed: false,
            reason: advanceValidation.reason,
            appliedPolicies,
          };
        }
      }

      // Validar límites de reservas
      if (policy.maxBookingsPerDay || policy.maxBookingsPerWeek || policy.maxBookingsPerMonth) {
        const bookingLimits = await this.checkBookingLimits(bookingData.userId, policy);

        if (!bookingLimits.allowed) {
          return {
            allowed: false,
            reason: bookingLimits.reason,
            appliedPolicies,
          };
        }
      }
    }

    return { allowed: true, appliedPolicies };
  }

  async getDefaultPolicies(): Promise<BookingPolicy[]> {
    try {
      // Crear políticas por defecto si no existen
      const defaultPolicies = [
        {
          name: 'Política General',
          description: 'Política general para todos los recursos',
          type: 'global',
          isActive: true,
          priority: 0,
          isSystem: true,
          minBookingDuration: 1,
          maxBookingDuration: 8,
          minAdvanceBooking: 1,
          maxAdvanceBooking: 24,
          cancellationDeadline: 2,
          requirePayment: true,
          allowFreeBooking: false,
          requireApproval: false,
          allowRecurring: true,
          maxRecurringBookings: 10,
          sendReminders: true,
          reminderHoursBefore: 24,
        },
        {
          name: 'Política Salas de Reuniones',
          description: 'Política específica para salas de reuniones',
          type: 'resource_type',
          resourceType: 'meeting_room',
          isActive: true,
          priority: 10,
          isSystem: true,
          minBookingDuration: 0.5,
          maxBookingDuration: 4,
          minAdvanceBooking: 0.5,
          maxAdvanceBooking: 48,
          cancellationDeadline: 1,
          requirePayment: true,
          allowFreeBooking: false,
          requireApproval: false,
          allowRecurring: true,
          maxRecurringBookings: 20,
          sendReminders: true,
          reminderHoursBefore: 2,
        },
        {
          name: 'Política Oficinas Privadas',
          description: 'Política específica para oficinas privadas',
          type: 'resource_type',
          resourceType: 'private_office',
          isActive: true,
          priority: 10,
          isSystem: true,
          minBookingDuration: 1,
          maxBookingDuration: 24,
          minAdvanceBooking: 2,
          maxAdvanceBooking: 168,
          cancellationDeadline: 24,
          requirePayment: true,
          allowFreeBooking: false,
          requireApproval: true,
          allowRecurring: true,
          maxRecurringBookings: 50,
          sendReminders: true,
          reminderHoursBefore: 48,
        },
      ];

      // Verificar y crear políticas por defecto
      for (const policyData of defaultPolicies) {
        const existingPolicy = await this.bookingPolicyRepository.findOne({
          where: { name: policyData.name },
        });

        if (!existingPolicy) {
          const policy = this.bookingPolicyRepository.create(policyData);
          await this.bookingPolicyRepository.save(policy);
        }
      }

      return await this.bookingPolicyRepository.find({
        where: { isSystem: true, isActive: true },
        order: { priority: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error obteniendo políticas por defecto: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Métodos auxiliares privados

  private calculateDuration(startTime: string, endTime: string): number {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    return (endMinutes - startMinutes) / 60; // Convertir a horas
  }

  private calculateHoursInAdvance(date: string, startTime: string): number {
    const bookingDateTime = new Date(`${date}T${startTime}:00`);
    const now = new Date();
    const diffMs = bookingDateTime.getTime() - now.getTime();
    return diffMs / (1000 * 60 * 60); // Convertir a horas
  }

  private async checkBookingLimits(userId: string, policy: BookingPolicy): Promise<{ allowed: boolean; reason?: string }> {
    // Verificar límites de reservas del usuario
    // Esta lógica se implementaría con consultas a la base de datos

    // Por simplicidad, retornamos permitido
    return { allowed: true };
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}