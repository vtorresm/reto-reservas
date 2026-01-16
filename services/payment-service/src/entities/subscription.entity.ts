import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
  PENDING = 'pending',
  PAST_DUE = 'past_due',
}

export enum SubscriptionInterval {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum SubscriptionType {
  MEMBERSHIP = 'membership',
  PREMIUM_FEATURES = 'premium_features',
  UNLIMITED_ACCESS = 'unlimited_access',
  PRIORITY_SUPPORT = 'priority_support',
  CUSTOM = 'custom',
}

@Entity('subscriptions')
@Index(['userId', 'status'])
@Index(['status', 'nextBillingDate'])
@Index(['subscriptionId'], { unique: true })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'subscription_id', unique: true })
  subscriptionId: string; // ID único de la suscripción

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING,
  })
  status: SubscriptionStatus;

  @Column({
    type: 'enum',
    enum: SubscriptionType,
  })
  type: SubscriptionType;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'currency', default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: SubscriptionInterval,
    default: SubscriptionInterval.MONTH,
  })
  interval: SubscriptionInterval;

  @Column({ name: 'interval_count', default: 1 })
  intervalCount: number; // Cada cuántos intervalos (ej: cada 3 meses)

  @Column({ name: 'current_period_start', type: 'timestamp' })
  currentPeriodStart: Date;

  @Column({ name: 'current_period_end', type: 'timestamp' })
  currentPeriodEnd: Date;

  @Column({ name: 'next_billing_date', type: 'timestamp' })
  nextBillingDate: Date;

  @Column({ name: 'cancel_at_period_end', default: false })
  cancelAtPeriodEnd: boolean;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'cancellation_reason', length: 500, nullable: true })
  cancellationReason?: string;

  @Column({ name: 'trial_start', type: 'timestamp', nullable: true })
  trialStart?: Date;

  @Column({ name: 'trial_end', type: 'timestamp', nullable: true })
  trialEnd?: Date;

  @Column({ name: 'trial_period_days', nullable: true })
  trialPeriodDays?: number;

  @Column({ name: 'max_booking_hours_per_month', nullable: true })
  maxBookingHoursPerMonth?: number;

  @Column({ name: 'discount_percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountPercentage?: number;

  @Column({ name: 'setup_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  setupFee: number;

  @Column({ name: 'proration_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  prorationAmount: number;

  @Column({ type: 'json', name: 'features', nullable: true })
  features?: Record<string, any>;

  @Column({ type: 'json', name: 'metadata', nullable: true })
  metadata?: {
    source?: 'web' | 'mobile' | 'api';
    campaignId?: string;
    promotionId?: string;
    referralCode?: string;
    internalNotes?: string;
  };

  @Column({ name: 'payment_method_id', nullable: true })
  paymentMethodId?: string;

  @Column({ name: 'last_payment_date', type: 'timestamp', nullable: true })
  lastPaymentDate?: Date;

  @Column({ name: 'failed_payment_count', default: 0 })
  failedPaymentCount: number;

  @Column({ name: 'max_failed_payments', default: 3 })
  maxFailedPayments: number;

  @Column({ name: 'next_retry_date', type: 'timestamp', nullable: true })
  nextRetryDate?: Date;

  @Column({ name: 'suspended_at', type: 'timestamp', nullable: true })
  suspendedAt?: Date;

  @Column({ name: 'suspension_reason', length: 500, nullable: true })
  suspensionReason?: string;

  @Column({ name: 'reactivated_at', type: 'timestamp', nullable: true })
  reactivatedAt?: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos auxiliares
  isActive(): boolean {
    return this.status === SubscriptionStatus.ACTIVE;
  }

  isInTrial(): boolean {
    return this.trialEnd ? new Date() < this.trialEnd : false;
  }

  isPastDue(): boolean {
    return this.status === SubscriptionStatus.PAST_DUE;
  }

  isCancelled(): boolean {
    return this.status === SubscriptionStatus.CANCELLED;
  }

  isExpiringSoon(days: number = 7): boolean {
    const daysUntilExpiry = Math.ceil((this.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= days && daysUntilExpiry > 0;
  }

  canBeCancelled(): boolean {
    return this.isActive() && !this.cancelAtPeriodEnd;
  }

  canBeReactivated(): boolean {
    return this.status === SubscriptionStatus.CANCELLED || this.status === SubscriptionStatus.EXPIRED;
  }

  canRetryPayment(): boolean {
    return this.failedPaymentCount < this.maxFailedPayments && this.nextRetryDate && new Date() >= this.nextRetryDate;
  }

  markAsActive(): void {
    this.status = SubscriptionStatus.ACTIVE;
    this.updatedBy = 'system';
  }

  markAsCancelled(reason?: string): void {
    this.status = SubscriptionStatus.CANCELLED;
    this.cancelledAt = new Date();
    this.cancellationReason = reason;
    this.updatedBy = 'system';
  }

  markAsSuspended(reason: string): void {
    this.status = SubscriptionStatus.SUSPENDED;
    this.suspendedAt = new Date();
    this.suspensionReason = reason;
    this.updatedBy = 'system';
  }

  markAsPastDue(): void {
    this.status = SubscriptionStatus.PAST_DUE;
    this.failedPaymentCount++;
    this.nextRetryDate = new Date(Date.now() + (24 * 60 * 60 * 1000)); // Retry en 24 horas
    this.updatedBy = 'system';
  }

  markPaymentSuccessful(): void {
    this.lastPaymentDate = new Date();
    this.failedPaymentCount = 0;
    this.nextRetryDate = undefined;

    if (this.status === SubscriptionStatus.PAST_DUE) {
      this.status = SubscriptionStatus.ACTIVE;
    }

    this.updatedBy = 'system';
  }

  scheduleCancellation(): void {
    this.cancelAtPeriodEnd = true;
    this.updatedBy = 'system';
  }

  cancelScheduledCancellation(): void {
    this.cancelAtPeriodEnd = false;
    this.updatedBy = 'system';
  }

  reactivate(): void {
    this.status = SubscriptionStatus.ACTIVE;
    this.cancelAtPeriodEnd = false;
    this.cancelledAt = undefined;
    this.cancellationReason = undefined;
    this.reactivatedAt = new Date();
    this.updatedBy = 'system';
  }

  calculateNextBillingDate(): Date {
    const nextDate = new Date(this.nextBillingDate);

    switch (this.interval) {
      case SubscriptionInterval.DAY:
        nextDate.setDate(nextDate.getDate() + this.intervalCount);
        break;
      case SubscriptionInterval.WEEK:
        nextDate.setDate(nextDate.getDate() + (this.intervalCount * 7));
        break;
      case SubscriptionInterval.MONTH:
        nextDate.setMonth(nextDate.getMonth() + this.intervalCount);
        break;
      case SubscriptionInterval.QUARTER:
        nextDate.setMonth(nextDate.getMonth() + (this.intervalCount * 3));
        break;
      case SubscriptionInterval.YEAR:
        nextDate.setFullYear(nextDate.getFullYear() + this.intervalCount);
        break;
    }

    return nextDate;
  }

  getDaysUntilNextBilling(): number {
    const diffTime = this.nextBillingDate.getTime() - Date.now();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getCurrentPeriodDays(): number {
    const diffTime = this.currentPeriodEnd.getTime() - this.currentPeriodStart.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getRemainingDays(): number {
    const diffTime = this.currentPeriodEnd.getTime() - Date.now();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  calculateProrationAmount(startDate: Date, endDate: Date): number {
    const totalPeriodDays = this.getCurrentPeriodDays();
    const remainingDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (remainingDays <= 0) return 0;

    const dailyRate = this.amount / totalPeriodDays;
    return dailyRate * remainingDays;
  }

  toPublicJSON() {
    const { createdBy, updatedBy, metadata, ...publicData } = this;
    return publicData;
  }

  static createSubscription(
    userId: string,
    type: SubscriptionType,
    name: string,
    amount: number,
    interval: SubscriptionInterval,
    intervalCount: number = 1,
    trialDays: number = 0,
    createdBy?: string,
  ): Subscription {
    const subscription = new Subscription();
    const now = new Date();

    subscription.userId = userId;
    subscription.subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    subscription.type = type;
    subscription.name = name;
    subscription.amount = amount;
    subscription.interval = interval;
    subscription.intervalCount = intervalCount;

    // Configurar período actual
    subscription.currentPeriodStart = now;

    if (trialDays > 0) {
      subscription.trialStart = now;
      subscription.trialEnd = new Date(now.getTime() + (trialDays * 24 * 60 * 60 * 1000));
      subscription.currentPeriodEnd = subscription.trialEnd;
    } else {
      subscription.currentPeriodEnd = subscription.calculateNextBillingDate();
    }

    subscription.nextBillingDate = subscription.currentPeriodEnd;
    subscription.status = trialDays > 0 ? SubscriptionStatus.PENDING : SubscriptionStatus.ACTIVE;
    subscription.createdBy = createdBy;

    return subscription;
  }

  private calculateNextBillingDate(): Date {
    const nextDate = new Date(this.currentPeriodStart);

    switch (this.interval) {
      case SubscriptionInterval.DAY:
        nextDate.setDate(nextDate.getDate() + this.intervalCount);
        break;
      case SubscriptionInterval.WEEK:
        nextDate.setDate(nextDate.getDate() + (this.intervalCount * 7));
        break;
      case SubscriptionInterval.MONTH:
        nextDate.setMonth(nextDate.getMonth() + this.intervalCount);
        break;
      case SubscriptionInterval.QUARTER:
        nextDate.setMonth(nextDate.getMonth() + (this.intervalCount * 3));
        break;
      case SubscriptionInterval.YEAR:
        nextDate.setFullYear(nextDate.getFullYear() + this.intervalCount);
        break;
    }

    return nextDate;
  }
}