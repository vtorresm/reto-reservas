import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
  DIGITAL_WALLET = 'digital_wallet',
  CASH = 'cash',
  MEMBERSHIP_CREDIT = 'membership_credit',
}

export enum PaymentType {
  BOOKING = 'booking',
  MEMBERSHIP = 'membership',
  DEPOSIT = 'deposit',
  REFUND = 'refund',
  FEE = 'fee',
  OTHER = 'other',
}

@Entity('payments')
@Index(['userId', 'status'])
@Index(['bookingId'])
@Index(['status', 'createdAt'])
@Index(['paymentMethod'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'booking_id', nullable: true })
  bookingId?: string;

  @Column({ name: 'invoice_id', nullable: true })
  invoiceId?: string;

  @Column({ name: 'subscription_id', nullable: true })
  subscriptionId?: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.BOOKING,
  })
  type: PaymentType;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'currency', default: 'USD' })
  currency: string;

  @Column({ name: 'amount_refunded', type: 'decimal', precision: 10, scale: 2, default: 0 })
  amountRefunded: number;

  @Column({ name: 'fee_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  feeAmount: number;

  @Column({ name: 'net_amount', type: 'decimal', precision: 10, scale: 2 })
  netAmount: number;

  @Column({ name: 'exchange_rate', type: 'decimal', precision: 10, scale: 4, nullable: true })
  exchangeRate?: number;

  @Column({ name: 'original_currency', nullable: true })
  originalCurrency?: string;

  @Column({ name: 'original_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  originalAmount?: number;

  @Column({ type: 'json', name: 'payment_details', nullable: true })
  paymentDetails?: {
    // Stripe
    stripePaymentIntentId?: string;
    stripeChargeId?: string;

    // PayPal
    paypalOrderId?: string;
    paypalCaptureId?: string;

    // Tarjeta
    cardLast4?: string;
    cardBrand?: string;
    cardExpiryMonth?: number;
    cardExpiryYear?: number;

    // Transferencia bancaria
    bankReference?: string;
    bankName?: string;

    // Billetera digital
    walletType?: string;
    walletReference?: string;
  };

  @Column({ type: 'json', name: 'billing_address', nullable: true })
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };

  @Column({ type: 'json', name: 'metadata', nullable: true })
  metadata?: {
    description?: string;
    internalNotes?: string;
    campaignId?: string;
    discountCode?: string;
    promotionId?: string;
    taxAmount?: number;
    taxPercentage?: number;
    discountAmount?: number;
    source?: 'web' | 'mobile' | 'api';
    userAgent?: string;
    ipAddress?: string;
  };

  @Column({ name: 'external_payment_id', nullable: true })
  externalPaymentId?: string; // ID del proveedor externo (Stripe, PayPal)

  @Column({ name: 'gateway_response', type: 'json', nullable: true })
  gatewayResponse?: any; // Respuesta completa del gateway de pago

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt?: Date;

  @Column({ name: 'failed_at', type: 'timestamp', nullable: true })
  failedAt?: Date;

  @Column({ name: 'failure_reason', length: 1000, nullable: true })
  failureReason?: string;

  @Column({ name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt?: Date;

  @Column({ name: 'refund_reason', length: 500, nullable: true })
  refundReason?: string;

  @Column({ name: 'refunded_by', nullable: true })
  refundedBy?: string;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', default: 3 })
  maxRetries: number;

  @Column({ name: 'next_retry_at', type: 'timestamp', nullable: true })
  nextRetryAt?: Date;

  @Column({ name: 'webhook_verified', default: false })
  webhookVerified: boolean;

  @Column({ name: 'webhook_received_at', type: 'timestamp', nullable: true })
  webhookReceivedAt?: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos auxiliares
  isCompleted(): boolean {
    return this.status === PaymentStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  isRefunded(): boolean {
    return this.status === PaymentStatus.REFUNDED || this.status === PaymentStatus.PARTIALLY_REFUNDED;
  }

  canBeRefunded(): boolean {
    return this.isCompleted() && this.amountRefunded < this.amount;
  }

  canBeRetried(): boolean {
    return this.isFailed() && this.retryCount < this.maxRetries;
  }

  markAsProcessing(): void {
    this.status = PaymentStatus.PROCESSING;
    this.updatedBy = 'system';
  }

  markAsCompleted(externalPaymentId?: string, gatewayResponse?: any): void {
    this.status = PaymentStatus.COMPLETED;
    this.processedAt = new Date();
    this.externalPaymentId = externalPaymentId;
    this.gatewayResponse = gatewayResponse;
    this.updatedBy = 'system';
  }

  markAsFailed(reason: string, canRetry: boolean = true): void {
    this.status = PaymentStatus.FAILED;
    this.failedAt = new Date();
    this.failureReason = reason;
    this.updatedBy = 'system';

    if (canRetry && this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.nextRetryAt = new Date(Date.now() + (this.retryCount * 60 * 1000)); // Retry cada minuto
    }
  }

  markAsRefunded(amount: number, reason: string, refundedBy: string): void {
    this.amountRefunded += amount;
    this.refundedAt = new Date();
    this.refundReason = reason;
    this.refundedBy = refundedBy;

    if (this.amountRefunded >= this.amount) {
      this.status = PaymentStatus.REFUNDED;
    } else {
      this.status = PaymentStatus.PARTIALLY_REFUNDED;
    }

    this.updatedBy = refundedBy;
  }

  calculateRefundableAmount(): number {
    return Math.max(0, this.amount - this.amountRefunded);
  }

  getTotalAmount(): number {
    return this.amount + this.feeAmount;
  }

  getRefundedPercentage(): number {
    if (this.amount === 0) return 0;
    return (this.amountRefunded / this.amount) * 100;
  }

  toPublicJSON() {
    const { gatewayResponse, webhookVerified, webhookReceivedAt, createdBy, updatedBy, ...publicData } = this;
    return publicData;
  }

  static createPayment(
    userId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    type: PaymentType = PaymentType.BOOKING,
    bookingId?: string,
    createdBy?: string,
  ): Payment {
    const payment = new Payment();
    payment.userId = userId;
    payment.amount = amount;
    payment.paymentMethod = paymentMethod;
    payment.type = type;
    payment.bookingId = bookingId;
    payment.feeAmount = payment.calculateFee(amount, paymentMethod);
    payment.netAmount = amount - payment.feeAmount;
    payment.status = PaymentStatus.PENDING;
    payment.createdBy = createdBy;

    return payment;
  }

  private calculateFee(amount: number, paymentMethod: PaymentMethod): number {
    // Lógica básica de cálculo de fees
    const baseFee = 0.029; // 2.9%
    const fixedFee = 0.30; // $0.30

    switch (paymentMethod) {
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.DEBIT_CARD:
        return (amount * baseFee) + fixedFee;
      case PaymentMethod.PAYPAL:
        return (amount * 0.0349) + fixedFee; // Fee de PayPal
      case PaymentMethod.BANK_TRANSFER:
        return 0; // Sin fee para transferencias
      case PaymentMethod.MEMBERSHIP_CREDIT:
        return 0; // Sin fee para créditos
      default:
        return (amount * baseFee) + fixedFee;
    }
  }
}