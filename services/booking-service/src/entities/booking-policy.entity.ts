import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PolicyType {
  GLOBAL = 'global',
  RESOURCE_TYPE = 'resource_type',
  RESOURCE_SPECIFIC = 'resource_specific',
  USER_ROLE = 'user_role',
  MEMBERSHIP_LEVEL = 'membership_level',
}

export enum TimeUnit {
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks',
}

@Entity('booking_policies')
@Index(['type', 'isActive'])
@Index(['resourceType'])
@Index(['userRole'])
export class BookingPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: PolicyType,
  })
  type: PolicyType;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'priority', default: 0 })
  priority: number; // Mayor número = mayor prioridad

  // Aplicabilidad de la política
  @Column({ name: 'resource_type', nullable: true })
  resourceType?: string;

  @Column({ name: 'resource_id', nullable: true })
  resourceId?: string;

  @Column({ name: 'user_role', nullable: true })
  userRole?: string;

  @Column({ name: 'membership_level', nullable: true })
  membershipLevel?: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId?: string;

  // Límites de tiempo
  @Column({ name: 'min_booking_duration', type: 'decimal', precision: 4, scale: 2, nullable: true })
  minBookingDuration?: number;

  @Column({ name: 'max_booking_duration', type: 'decimal', precision: 4, scale: 2, nullable: true })
  maxBookingDuration?: number;

  @Column({ name: 'min_advance_booking', type: 'decimal', precision: 4, scale: 2, nullable: true })
  minAdvanceBooking?: number; // Horas mínimas de anticipación

  @Column({ name: 'max_advance_booking', type: 'decimal', precision: 4, scale: 2, nullable: true })
  maxAdvanceBooking?: number; // Días máximos de anticipación

  @Column({ name: 'cancellation_deadline', type: 'decimal', precision: 4, scale: 2, nullable: true })
  cancellationDeadline?: number; // Horas antes para cancelar sin penalización

  // Límites de reservas
  @Column({ name: 'max_bookings_per_day', nullable: true })
  maxBookingsPerDay?: number;

  @Column({ name: 'max_bookings_per_week', nullable: true })
  maxBookingsPerWeek?: number;

  @Column({ name: 'max_bookings_per_month', nullable: true })
  maxBookingsPerMonth?: number;

  @Column({ name: 'max_concurrent_bookings', nullable: true })
  maxConcurrentBookings?: number;

  // Políticas de precios
  @Column({ name: 'require_payment', default: false })
  requirePayment: boolean;

  @Column({ name: 'allow_free_booking', default: true })
  allowFreeBooking: boolean;

  @Column({ name: 'require_deposit', default: false })
  requireDeposit: boolean;

  @Column({ name: 'deposit_percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  depositPercentage?: number;

  @Column({ name: 'cancellation_fee_percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  cancellationFeePercentage?: number;

  // Políticas de aprobación
  @Column({ name: 'require_approval', default: false })
  requireApproval: boolean;

  @Column({ name: 'auto_approve_free', default: true })
  autoApproveFree: boolean;

  @Column({ name: 'approval_deadline', type: 'decimal', precision: 4, scale: 2, nullable: true })
  approvalDeadline?: number; // Horas para aprobar

  // Políticas de recurrencia
  @Column({ name: 'allow_recurring', default: true })
  allowRecurring: boolean;

  @Column({ name: 'max_recurring_bookings', nullable: true })
  maxRecurringBookings?: number;

  @Column({ name: 'recurring_advance_notice', type: 'decimal', precision: 4, scale: 2, nullable: true })
  recurringAdvanceNotice?: number; // Días de anticipación para reservas recurrentes

  // Restricciones de horario
  @Column({ type: 'json', name: 'allowed_days', nullable: true })
  allowedDays?: number[]; // 0-6, domingo a sábado

  @Column({ name: 'allowed_start_time', type: 'time', nullable: true })
  allowedStartTime?: string;

  @Column({ name: 'allowed_end_time', type: 'time', nullable: true })
  allowedEndTime?: string;

  @Column({ name: 'block_weekends', default: false })
  blockWeekends: boolean;

  @Column({ name: 'block_holidays', default: false })
  blockHolidays: boolean;

  // Políticas especiales
  @Column({ name: 'max_attendees', nullable: true })
  maxAttendees?: number;

  @Column({ name: 'require_attendee_details', default: false })
  requireAttendeeDetails: boolean;

  @Column({ name: 'allow_waitlist', default: true })
  allowWaitlist: boolean;

  @Column({ name: 'send_reminders', default: true })
  sendReminders: boolean;

  @Column({ name: 'reminder_hours_before', type: 'decimal', precision: 4, scale: 2, default: 24 })
  reminderHoursBefore: number;

  // Configuración avanzada
  @Column({ type: 'json', name: 'conditions', nullable: true })
  conditions?: {
    minUserAge?: number;
    requireMembership?: boolean;
    requireVerification?: boolean;
    allowedUserTypes?: string[];
    excludedUserTypes?: string[];
    requireCreditCheck?: boolean;
    seasonalPricing?: boolean;
  };

  @Column({ type: 'json', name: 'exceptions', nullable: true })
  exceptions?: Array<{
    date: Date;
    reason: string;
    overrideRules?: Partial<BookingPolicy>;
  }>;

  @Column({ name: 'effective_from', type: 'timestamp', nullable: true })
  effectiveFrom?: Date;

  @Column({ name: 'effective_until', type: 'timestamp', nullable: true })
  effectiveUntil?: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos auxiliares
  isApplicableToResource(resourceType?: string, resourceId?: string): boolean {
    if (!this.isActive) return false;

    const now = new Date();
    if (this.effectiveFrom && now < this.effectiveFrom) return false;
    if (this.effectiveUntil && now > this.effectiveUntil) return false;

    switch (this.type) {
      case PolicyType.GLOBAL:
        return true;
      case PolicyType.RESOURCE_TYPE:
        return this.resourceType === resourceType;
      case PolicyType.RESOURCE_SPECIFIC:
        return this.resourceId === resourceId;
      default:
        return false;
    }
  }

  isApplicableToUser(userRole?: string, membershipLevel?: string): boolean {
    if (!this.isActive) return false;

    switch (this.type) {
      case PolicyType.GLOBAL:
      case PolicyType.RESOURCE_TYPE:
      case PolicyType.RESOURCE_SPECIFIC:
        return true;
      case PolicyType.USER_ROLE:
        return this.userRole === userRole;
      case PolicyType.MEMBERSHIP_LEVEL:
        return this.membershipLevel === membershipLevel;
      default:
        return false;
    }
  }

  validateBookingDuration(duration: number): { valid: boolean; reason?: string } {
    if (this.minBookingDuration && duration < this.minBookingDuration) {
      return {
        valid: false,
        reason: `Duración mínima requerida: ${this.minBookingDuration} horas`,
      };
    }

    if (this.maxBookingDuration && duration > this.maxBookingDuration) {
      return {
        valid: false,
        reason: `Duración máxima permitida: ${this.maxBookingDuration} horas`,
      };
    }

    return { valid: true };
  }

  validateAdvanceBooking(hoursInAdvance: number): { valid: boolean; reason?: string } {
    if (this.minAdvanceBooking && hoursInAdvance < this.minAdvanceBooking) {
      return {
        valid: false,
        reason: `Reserva mínima con ${this.minAdvanceBooking} horas de anticipación`,
      };
    }

    if (this.maxAdvanceBooking && hoursInAdvance > (this.maxAdvanceBooking * 24)) {
      return {
        valid: false,
        reason: `Reserva máxima con ${this.maxAdvanceBooking} días de anticipación`,
      };
    }

    return { valid: true };
  }

  calculateCancellationFee(bookingAmount: number, hoursUntilBooking: number): number {
    if (!this.cancellationFeePercentage) return 0;

    if (hoursUntilBooking <= (this.cancellationDeadline || 0)) {
      return bookingAmount * (this.cancellationFeePercentage / 100);
    }

    return 0;
  }

  requiresDeposit(): boolean {
    return this.requireDeposit && this.depositPercentage && this.depositPercentage > 0;
  }

  calculateDeposit(bookingAmount: number): number {
    if (!this.requiresDeposit()) return 0;
    return bookingAmount * (this.depositPercentage! / 100);
  }

  allowsRecurringBookings(): boolean {
    return this.allowRecurring && this.maxRecurringBookings && this.maxRecurringBookings > 0;
  }

  getMaxBookingDuration(): number | null {
    return this.maxBookingDuration || null;
  }

  getMinBookingDuration(): number | null {
    return this.minBookingDuration || null;
  }

  toPublicJSON() {
    const { createdBy, updatedBy, conditions, exceptions, ...publicData } = this;
    return publicData;
  }
}