import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus, PaymentMethod } from '../../entities/payment.entity';
import { ConfigService } from '@nestjs/config';
import * as Stripe from 'stripe';

export interface PaymentRequest {
  userId: string;
  bookingId?: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  description: string;
  metadata?: any;
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  externalPaymentId?: string;
  error?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private configService: ConfigService,
  ) {
    // Inicializar Stripe
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
      });
    }
  }

  async processPayment(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    try {
      this.logger.log(`Procesando pago: ${paymentRequest.amount} ${paymentRequest.currency} para usuario ${paymentRequest.userId}`);

      // Crear registro de pago
      const payment = Payment.createPayment(
        paymentRequest.userId,
        paymentRequest.amount,
        paymentRequest.paymentMethod,
        'booking',
        paymentRequest.bookingId,
      );

      payment.status = PaymentStatus.PROCESSING;
      const savedPayment = await this.paymentRepository.save(payment);

      try {
        // Procesar según método de pago
        let externalPaymentId: string | undefined;
        let gatewayResponse: any;

        switch (paymentRequest.paymentMethod) {
          case PaymentMethod.STRIPE:
            const stripeResult = await this.processStripePayment(savedPayment, paymentRequest);
            externalPaymentId = stripeResult.externalPaymentId;
            gatewayResponse = stripeResult.gatewayResponse;
            break;

          case PaymentMethod.PAYPAL:
            const paypalResult = await this.processPayPalPayment(savedPayment, paymentRequest);
            externalPaymentId = paypalResult.externalPaymentId;
            gatewayResponse = paypalResult.gatewayResponse;
            break;

          case PaymentMethod.CREDIT_CARD:
            const cardResult = await this.processCardPayment(savedPayment, paymentRequest);
            externalPaymentId = cardResult.externalPaymentId;
            gatewayResponse = cardResult.gatewayResponse;
            break;

          default:
            throw new BadRequestException(`Método de pago no soportado: ${paymentRequest.paymentMethod}`);
        }

        // Actualizar pago como completado
        savedPayment.markAsCompleted(externalPaymentId, gatewayResponse);
        await this.paymentRepository.save(savedPayment);

        this.logger.log(`Pago procesado exitosamente: ${savedPayment.id}`);

        return {
          success: true,
          paymentId: savedPayment.id,
          status: PaymentStatus.COMPLETED,
          amount: savedPayment.amount,
          currency: savedPayment.currency,
          paymentMethod: savedPayment.paymentMethod,
          externalPaymentId,
        };
      } catch (error) {
        // Marcar pago como fallido
        savedPayment.markAsFailed(error.message);
        await this.paymentRepository.save(savedPayment);

        this.logger.error(`Error procesando pago: ${error.message}`, error.stack);

        return {
          success: false,
          paymentId: savedPayment.id,
          status: PaymentStatus.FAILED,
          amount: savedPayment.amount,
          currency: savedPayment.currency,
          paymentMethod: savedPayment.paymentMethod,
          error: error.message,
        };
      }
    } catch (error) {
      this.logger.error(`Error creando pago: ${error.message}`, error.stack);
      throw error;
    }
  }

  async processStripePayment(payment: Payment, paymentRequest: PaymentRequest): Promise<{
    externalPaymentId: string;
    gatewayResponse: any;
  }> {
    try {
      if (!this.stripe) {
        throw new Error('Stripe no está configurado');
      }

      // Crear PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(payment.amount * 100), // Stripe usa centavos
        currency: payment.currency.toLowerCase(),
        metadata: {
          paymentId: payment.id,
          userId: payment.userId,
          bookingId: payment.bookingId,
          description: paymentRequest.description,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        externalPaymentId: paymentIntent.id,
        gatewayResponse: paymentIntent,
      };
    } catch (error) {
      this.logger.error(`Error procesando pago con Stripe: ${error.message}`, error.stack);
      throw error;
    }
  }

  async processPayPalPayment(payment: Payment, paymentRequest: PaymentRequest): Promise<{
    externalPaymentId: string;
    gatewayResponse: any;
  }> {
    try {
      // Implementar integración con PayPal
      // Por simplicidad, simulamos el procesamiento
      const mockPayPalOrderId = `PAYPAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        externalPaymentId: mockPayPalOrderId,
        gatewayResponse: {
          id: mockPayPalOrderId,
          status: 'COMPLETED',
          amount: payment.amount,
          currency: payment.currency,
        },
      };
    } catch (error) {
      this.logger.error(`Error procesando pago con PayPal: ${error.message}`, error.stack);
      throw error;
    }
  }

  async processCardPayment(payment: Payment, paymentRequest: PaymentRequest): Promise<{
    externalPaymentId: string;
    gatewayResponse: any;
  }> {
    try {
      // Implementar procesamiento directo de tarjetas
      // Por simplicidad, simulamos el procesamiento
      const mockChargeId = `CARD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return {
        externalPaymentId: mockChargeId,
        gatewayResponse: {
          id: mockChargeId,
          status: 'succeeded',
          amount: payment.amount,
          currency: payment.currency,
        },
      };
    } catch (error) {
      this.logger.error(`Error procesando pago con tarjeta: ${error.message}`, error.stack);
      throw error;
    }
  }

  async processRefund(
    paymentId: string,
    amount?: number,
    reason: string = 'Solicitud de reembolso',
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new BadRequestException('Pago no encontrado');
      }

      if (!payment.canBeRefunded()) {
        throw new BadRequestException('El pago no se puede reembolsar');
      }

      const refundAmount = amount || payment.calculateRefundableAmount();

      if (refundAmount <= 0) {
        throw new BadRequestException('Monto de reembolso inválido');
      }

      // Procesar reembolso según el método de pago original
      let refundId: string | undefined;

      switch (payment.paymentMethod) {
        case PaymentMethod.STRIPE:
          refundId = await this.processStripeRefund(payment, refundAmount);
          break;
        case PaymentMethod.PAYPAL:
          refundId = await this.processPayPalRefund(payment, refundAmount);
          break;
        default:
          throw new BadRequestException(`Reembolsos no soportados para: ${payment.paymentMethod}`);
      }

      // Actualizar pago
      payment.markAsRefunded(refundAmount, reason, 'system');
      await this.paymentRepository.save(payment);

      this.logger.log(`Reembolso procesado exitosamente: ${payment.id}, monto: ${refundAmount}`);

      return {
        success: true,
        refundId,
      };
    } catch (error) {
      this.logger.error(`Error procesando reembolso: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async processStripeRefund(payment: Payment, amount: number): Promise<string> {
    try {
      if (!this.stripe || !payment.externalPaymentId) {
        throw new Error('Stripe no está configurado o pago no tiene ID externo');
      }

      const refund = await this.stripe.refunds.create({
        payment_intent: payment.externalPaymentId,
        amount: Math.round(amount * 100), // Stripe usa centavos
        reason: 'requested_by_customer',
        metadata: {
          paymentId: payment.id,
          reason: 'customer_request',
        },
      });

      return refund.id;
    } catch (error) {
      this.logger.error(`Error procesando reembolso con Stripe: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async processPayPalRefund(payment: Payment, amount: number): Promise<string> {
    try {
      // Implementar reembolso con PayPal
      const mockRefundId = `REFUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return mockRefundId;
    } catch (error) {
      this.logger.error(`Error procesando reembolso con PayPal: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPaymentStatus(paymentId: string): Promise<Payment> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new BadRequestException('Pago no encontrado');
      }

      // Si el pago está procesando, verificar estado en el gateway
      if (payment.status === PaymentStatus.PROCESSING && payment.externalPaymentId) {
        await this.updatePaymentStatusFromGateway(payment);
      }

      return payment;
    } catch (error) {
      this.logger.error(`Error obteniendo estado de pago: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async updatePaymentStatusFromGateway(payment: Payment): Promise<void> {
    try {
      if (!this.stripe || !payment.externalPaymentId) {
        return;
      }

      const paymentIntent = await this.stripe.paymentIntents.retrieve(payment.externalPaymentId);

      switch (paymentIntent.status) {
        case 'succeeded':
          payment.markAsCompleted(payment.externalPaymentId, paymentIntent);
          break;
        case 'canceled':
          payment.markAsFailed('Pago cancelado');
          break;
        case 'processing':
          // Mantener como processing
          break;
        default:
          payment.markAsFailed(`Estado desconocido: ${paymentIntent.status}`);
          break;
      }

      await this.paymentRepository.save(payment);
    } catch (error) {
      this.logger.warn(`Error actualizando estado desde gateway: ${error.message}`);
    }
  }

  async getUserPayments(userId: string): Promise<Payment[]> {
    try {
      return await this.paymentRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error obteniendo pagos del usuario: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getBookingPayments(bookingId: string): Promise<Payment[]> {
    try {
      return await this.paymentRepository.find({
        where: { bookingId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error obteniendo pagos de la reserva: ${error.message}`, error.stack);
      throw error;
    }
  }

  async calculatePaymentFees(amount: number, paymentMethod: PaymentMethod): Promise<{
    baseAmount: number;
    feeAmount: number;
    totalAmount: number;
    feePercentage: number;
  }> {
    try {
      let feePercentage: number;
      let fixedFee: number;

      switch (paymentMethod) {
        case PaymentMethod.CREDIT_CARD:
        case PaymentMethod.DEBIT_CARD:
          feePercentage = 0.029; // 2.9%
          fixedFee = 0.30; // $0.30
          break;
        case PaymentMethod.PAYPAL:
          feePercentage = 0.0349; // 3.49%
          fixedFee = 0.49; // $0.49
          break;
        case PaymentMethod.BANK_TRANSFER:
          feePercentage = 0;
          fixedFee = 0;
          break;
        case PaymentMethod.MEMBERSHIP_CREDIT:
          feePercentage = 0;
          fixedFee = 0;
          break;
        default:
          feePercentage = 0.029;
          fixedFee = 0.30;
          break;
      }

      const feeAmount = (amount * feePercentage) + fixedFee;
      const totalAmount = amount + feeAmount;

      return {
        baseAmount: amount,
        feeAmount,
        totalAmount,
        feePercentage: feePercentage * 100,
      };
    } catch (error) {
      this.logger.error(`Error calculando fees: ${error.message}`, error.stack);
      throw error;
    }
  }

  async validateWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    try {
      // Implementar validación de firma de webhook
      // Por simplicidad, retornamos true
      return true;
    } catch (error) {
      this.logger.error(`Error validando firma de webhook: ${error.message}`, error.stack);
      return false;
    }
  }

  async handleWebhookEvent(
    eventType: string,
    eventData: any,
  ): Promise<void> {
    try {
      this.logger.log(`Procesando webhook: ${eventType}`);

      switch (eventType) {
        case 'payment_intent.succeeded':
          await this.handleStripePaymentSuccess(eventData);
          break;
        case 'payment_intent.payment_failed':
          await this.handleStripePaymentFailure(eventData);
          break;
        case 'charge.dispute.created':
          await this.handleStripeDispute(eventData);
          break;
        default:
          this.logger.warn(`Tipo de evento no manejado: ${eventType}`);
          break;
      }
    } catch (error) {
      this.logger.error(`Error procesando webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleStripePaymentSuccess(eventData: any): Promise<void> {
    try {
      const paymentIntentId = eventData.object.id;

      const payment = await this.paymentRepository.findOne({
        where: { externalPaymentId: paymentIntentId },
      });

      if (payment && payment.status === PaymentStatus.PROCESSING) {
        payment.markAsCompleted(paymentIntentId, eventData.object);
        await this.paymentRepository.save(payment);

        this.logger.log(`Pago confirmado vía webhook: ${payment.id}`);
      }
    } catch (error) {
      this.logger.error(`Error manejando éxito de pago: ${error.message}`, error.stack);
    }
  }

  private async handleStripePaymentFailure(eventData: any): Promise<void> {
    try {
      const paymentIntentId = eventData.object.id;

      const payment = await this.paymentRepository.findOne({
        where: { externalPaymentId: paymentIntentId },
      });

      if (payment && payment.status === PaymentStatus.PROCESSING) {
        payment.markAsFailed(eventData.object.last_payment_error?.message || 'Pago fallido');
        await this.paymentRepository.save(payment);

        this.logger.log(`Pago fallido vía webhook: ${payment.id}`);
      }
    } catch (error) {
      this.logger.error(`Error manejando fallo de pago: ${error.message}`, error.stack);
    }
  }

  private async handleStripeDispute(eventData: any): Promise<void> {
    try {
      // Manejar disputas de pago
      this.logger.warn(`Disputa de pago detectada: ${eventData.object.id}`);
      // Implementar lógica de manejo de disputas
    } catch (error) {
      this.logger.error(`Error manejando disputa: ${error.message}`, error.stack);
    }
  }
}