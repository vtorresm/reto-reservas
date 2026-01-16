import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
  IN_PROGRESS = 'in_progress',
}

export enum BookingType {
  INSTANT = 'instant',
  SCHEDULED = 'scheduled',
  RECURRING = 'recurring',
}

export enum CancellationReason {
  USER_CANCELLED = 'user_cancelled',
  ADMIN_CANCELLED = 'admin_cancelled',
  RESOURCE_UNAVAILABLE = 'resource_unavailable',
  MAINTENANCE = 'maintenance',
  EMERGENCY = 'emergency',
  NO_SHOW = 'no_show',
}

@Entity('bookings')
@Index(['userId', 'status'])
@Index(['resourceId', 'date'])
@Index(['date', 'startTime'])
@Index(['status', 'createdAt'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'resource_id' })
  resourceId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({
    type: 'enum',
    enum: BookingType,
    default: BookingType.INSTANT,
  })
  type: BookingType;

  @Column({ name: 'total_hours', type: 'decimal', precision: 4, scale: 2 })
  totalHours: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ name: 'currency', default: 'USD' })
  currency: string;

  @Column({ name: 'purpose', length: 500, nullable: true })
  purpose?: string;

  @Column({ name: 'attendee_count', default: 1 })
  attendeeCount: number;

  @Column({ type: 'json', name: 'attendees', nullable: true })
  attendees?: Array<{
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  }>;

  @Column({ type: 'json', name: 'special_requests', nullable: true })
  specialRequests?: {
    equipment?: string[];
    setup?: string;
    catering?: boolean;
    accessibility?: boolean;
    notes?: string;
  };

  @Column({ name: 'is_recurring', default: false })
  isRecurring: boolean;

  @Column({ name: 'recurring_pattern', nullable: true })
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
    maxOccurrences?: number;
    daysOfWeek?: number[];
  };

  @Column({ name: 'parent_booking_id', nullable: true })
  parentBookingId?: string; // Para reservas recurrentes

  @Column({ name: 'check_in_time', type: 'timestamp', nullable: true })
  checkInTime?: Date;

  @Column({ name: 'check_out_time', type: 'timestamp', nullable: true })
  checkOutTime?: Date;

  @Column({ name: 'actual_duration', type: 'decimal', precision: 4, scale: 2, nullable: true })
  actualDuration?: number;

  @Column({ name: 'cancellation_reason', nullable: true })
  cancellationReason?: CancellationReason;

  @Column({ name: 'cancellation_notes', length: 1000, nullable: true })
  cancellationNotes?: string;

  @Column({ name: 'cancelled_by', nullable: true })
  cancelledBy?: string;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'requires_approval', default: false })
  requiresApproval: boolean;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy?: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'rejection_reason', length: 500, nullable: true })
  rejectionReason?: string;

  @Column({ name: 'payment_id', nullable: true })
  paymentId?: string;

  @Column({ name: 'invoice_id', nullable: true })
  invoiceId?: string;

  @Column({ type: 'json', name: 'metadata', nullable: true })
  metadata?: {
    source?: 'web' | 'mobile' | 'api';
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    campaign?: string;
    discountCode?: string;
    promotionId?: string;
  };

  @Column({ name: 'reminder_sent', default: false })
  reminderSent: boolean;

  @Column({ name: 'notification_sent', default: false })
  notificationSent: boolean;

  @Column({ name: 'rating', type: 'decimal', precision: 2, scale: 1, nullable: true })
  rating?: number;

  @Column({ name: 'feedback', length: 1000, nullable: true })
  feedback?: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos auxiliares
  getDurationInMinutes(): number {
    const start = this.timeToMinutes(this.startTime);
    const end = this.timeToMinutes(this.endTime);
    return end - start;
  }

  getDurationInHours(): number {
    return this.getDurationInMinutes() / 60;
  }

  isInThePast(): boolean {
    const now = new Date();
    const bookingDateTime = new Date(this.date);
    const [hours, minutes] = this.endTime.split(':').map(Number);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    return bookingDateTime < now;
  }

  isCurrentlyActive(): boolean {
    if (this.status !== BookingStatus.CONFIRMED) {
      return false;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const bookingDate = new Date(this.date);

    if (bookingDate.getTime() !== today.getTime()) {
      return false;
    }

    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return this.containsTime(currentTime);
  }

  containsTime(time: string): boolean {
    const start = this.timeToMinutes(this.startTime);
    const end = this.timeToMinutes(this.endTime);
    const checkTime = this.timeToMinutes(time);

    return checkTime >= start && checkTime <= end;
  }

  overlapsWith(startTime: string, endTime: string): boolean {
    const thisStart = this.timeToMinutes(this.startTime);
    const thisEnd = this.timeToMinutes(this.endTime);
    const otherStart = this.timeToMinutes(startTime);
    const otherEnd = this.timeToMinutes(endTime);

    return thisStart < otherEnd && otherStart < thisEnd;
  }

  canBeCancelled(): boolean {
    if (this.status === BookingStatus.CANCELLED || this.status === BookingStatus.COMPLETED) {
      return false;
    }

    // No se puede cancelar 2 horas antes del inicio
    const now = new Date();
    const bookingDateTime = new Date(this.date);
    const [hours, minutes] = this.startTime.split(':').map(Number);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    return bookingDateTime > twoHoursFromNow;
  }

  canBeModified(): boolean {
    if (this.status !== BookingStatus.CONFIRMED) {
      return false;
    }

    // No se puede modificar 4 horas antes del inicio
    const now = new Date();
    const bookingDateTime = new Date(this.date);
    const [hours, minutes] = this.startTime.split(':').map(Number);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    return bookingDateTime > fourHoursFromNow;
  }

  markAsConfirmed(approvedBy?: string): void {
    this.status = BookingStatus.CONFIRMED;
    if (approvedBy) {
      this.approvedBy = approvedBy;
      this.approvedAt = new Date();
    }
  }

  markAsInProgress(): void {
    if (this.status === BookingStatus.CONFIRMED) {
      this.status = BookingStatus.IN_PROGRESS;
    }
  }

  markAsCompleted(): void {
    this.status = BookingStatus.COMPLETED;
    this.checkOutTime = new Date();

    if (this.checkInTime) {
      this.actualDuration = (this.checkOutTime.getTime() - this.checkInTime.getTime()) / (1000 * 60 * 60);
    }
  }

  cancel(reason: string, notes?: string, cancelledBy?: string): void {
    this.status = BookingStatus.CANCELLED;
    this.cancellationReason = reason as CancellationReason;
    this.cancellationNotes = notes;
    this.cancelledBy = cancelledBy;
    this.cancelledAt = new Date();
    this.updatedBy = cancelledBy;
  }

  checkIn(): void {
    this.checkInTime = new Date();
    if (this.status === BookingStatus.CONFIRMED) {
      this.status = BookingStatus.IN_PROGRESS;
    }
  }

  checkOut(): void {
    this.checkOutTime = new Date();
    if (this.status === BookingStatus.IN_PROGRESS) {
      this.status = BookingStatus.COMPLETED;
    }

    if (this.checkInTime && this.checkOutTime) {
      this.actualDuration = (this.checkOutTime.getTime() - this.checkInTime.getTime()) / (1000 * 60 * 60);
    }
  }

  calculateRefundAmount(): number {
    if (this.status !== BookingStatus.CANCELLED) {
      return 0;
    }

    const now = new Date();
    const bookingDateTime = new Date(this.date);
    const [hours, minutes] = this.startTime.split(':').map(Number);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Política de reembolso
    if (hoursUntilBooking > 24) {
      return this.totalAmount; // 100% reembolso
    } else if (hoursUntilBooking > 2) {
      return this.totalAmount * 0.5; // 50% reembolso
    } else {
      return 0; // Sin reembolso
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  toPublicJSON() {
    const { metadata, createdBy, updatedBy, ...publicData } = this;
    return publicData;
  }

  static createBooking(
    userId: string,
    resourceId: string,
    date: Date,
    startTime: string,
    endTime: string,
    totalAmount: number,
    createdBy?: string,
  ): Booking {
    const booking = new Booking();
    booking.userId = userId;
    booking.resourceId = resourceId;
    booking.date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    booking.startTime = startTime;
    booking.endTime = endTime;
    booking.totalAmount = totalAmount;
    booking.totalHours = booking.getDurationInHours();
    booking.status = BookingStatus.PENDING;
    booking.type = BookingType.SCHEDULED;
    booking.createdBy = createdBy;

    return booking;
  }
}