import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  POSTPONED = 'postponed',
}

export enum EventType {
  WORKSHOP = 'workshop',
  NETWORKING = 'networking',
  TRAINING = 'training',
  SOCIAL = 'social',
  BUSINESS = 'business',
  COMMUNITY = 'community',
  OTHER = 'other',
}

export enum EventVisibility {
  PUBLIC = 'public',
  MEMBERS_ONLY = 'members_only',
  INVITE_ONLY = 'invite_only',
  PRIVATE = 'private',
}

@Entity('events')
@Index(['status', 'startDate'])
@Index(['type', 'visibility'])
@Index(['createdBy'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: EventType,
  })
  type: EventType;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  @Column({
    type: 'enum',
    enum: EventVisibility,
    default: EventVisibility.PUBLIC,
  })
  visibility: EventVisibility;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({ name: 'registration_deadline', type: 'timestamp', nullable: true })
  registrationDeadline?: Date;

  @Column({ name: 'max_attendees', nullable: true })
  maxAttendees?: number;

  @Column({ name: 'current_attendees', default: 0 })
  currentAttendees: number;

  @Column({ name: 'waitlist_count', default: 0 })
  waitlistCount: number;

  @Column({ name: 'location', nullable: true })
  location?: string;

  @Column({ name: 'virtual_link', nullable: true })
  virtualLink?: string;

  @Column({ name: 'is_virtual', default: false })
  isVirtual: boolean;

  @Column({ name: 'is_free', default: true })
  isFree: boolean;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ name: 'currency', default: 'USD' })
  currency: string;

  @Column({ type: 'json', nullable: true })
  agenda?: Array<{
    time: string;
    title: string;
    description?: string;
    speaker?: string;
  }>;

  @Column({ type: 'json', nullable: true })
  requirements?: string[];

  @Column({ type: 'json', nullable: true })
  tags?: string[];

  @Column({ type: 'json', nullable: true })
  images?: string[];

  @Column({ name: 'featured_image', nullable: true })
  featuredImage?: string;

  @Column({ type: 'json', name: 'organizer_info', nullable: true })
  organizerInfo?: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    bio?: string;
  };

  @Column({ type: 'json', name: 'contact_info', nullable: true })
  contactInfo?: {
    email: string;
    phone?: string;
    website?: string;
  };

  @Column({ type: 'json', name: 'attendees', nullable: true })
  attendees?: Array<{
    userId: string;
    name: string;
    email: string;
    status: 'registered' | 'attended' | 'cancelled' | 'waitlist';
    registeredAt: Date;
    attendedAt?: Date;
  }>;

  @Column({ type: 'json', name: 'waitlist', nullable: true })
  waitlist?: Array<{
    userId: string;
    name: string;
    email: string;
    joinedAt: Date;
  }>;

  @Column({ type: 'json', name: 'metadata', nullable: true })
  metadata?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    language?: string;
    category?: string;
    targetAudience?: string[];
    prerequisites?: string[];
    learningObjectives?: string[];
    materials?: string[];
  };

  @Column({ name: 'allow_waitlist', default: true })
  allowWaitlist: boolean;

  @Column({ name: 'send_reminders', default: true })
  sendReminders: boolean;

  @Column({ name: 'reminder_hours_before', type: 'decimal', precision: 4, scale: 2, default: 24 })
  reminderHoursBefore: number;

  @Column({ name: 'auto_confirm', default: true })
  autoConfirm: boolean;

  @Column({ name: 'require_approval', default: false })
  requireApproval: boolean;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'is_cancelled', default: false })
  isCancelled: boolean;

  @Column({ name: 'cancellation_reason', length: 1000, nullable: true })
  cancellationReason?: string;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ name: 'feedback_deadline', type: 'timestamp', nullable: true })
  feedbackDeadline?: Date;

  @Column({ type: 'json', name: 'feedback_questions', nullable: true })
  feedbackQuestions?: Array<{
    id: string;
    question: string;
    type: 'rating' | 'text' | 'multiple_choice';
    options?: string[];
    required: boolean;
  }>;

  @Column({ type: 'json', name: 'feedback_responses', nullable: true })
  feedbackResponses?: Array<{
    userId: string;
    responses: Record<string, any>;
    submittedAt: Date;
  }>;

  @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, nullable: true })
  averageRating?: number;

  @Column({ name: 'total_feedback', default: 0 })
  totalFeedback: number;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos auxiliares
  isUpcoming(): boolean {
    return this.startDate > new Date() && this.status === EventStatus.PUBLISHED;
  }

  isOngoing(): boolean {
    const now = new Date();
    return this.startDate <= now && this.endDate >= now && this.status === EventStatus.PUBLISHED;
  }

  isPast(): boolean {
    return this.endDate < new Date();
  }

  isFull(): boolean {
    return this.maxAttendees ? this.currentAttendees >= this.maxAttendees : false;
  }

  hasWaitlist(): boolean {
    return this.waitlistCount > 0;
  }

  canRegister(userId?: string): boolean {
    if (this.status !== EventStatus.PUBLISHED) return false;
    if (this.isPast()) return false;
    if (this.isFull() && !this.allowWaitlist) return false;

    // Verificar si el usuario ya está registrado
    if (userId) {
      const isAlreadyRegistered = this.attendees?.some(
        attendee => attendee.userId === userId && attendee.status === 'registered'
      );
      if (isAlreadyRegistered) return false;
    }

    return true;
  }

  canJoinWaitlist(): boolean {
    return this.allowWaitlist && this.isFull();
  }

  registerAttendee(userId: string, name: string, email: string): void {
    if (!this.attendees) {
      this.attendees = [];
    }

    this.attendees.push({
      userId,
      name,
      email,
      status: 'registered',
      registeredAt: new Date(),
    });

    this.currentAttendees++;
  }

  addToWaitlist(userId: string, name: string, email: string): void {
    if (!this.waitlist) {
      this.waitlist = [];
    }

    this.waitlist.push({
      userId,
      name,
      email,
      joinedAt: new Date(),
    });

    this.waitlistCount++;
  }

  cancelAttendee(userId: string): boolean {
    const attendeeIndex = this.attendees?.findIndex(
      attendee => attendee.userId === userId && attendee.status === 'registered'
    );

    if (attendeeIndex !== undefined && attendeeIndex >= 0) {
      if (this.attendees) {
        this.attendees[attendeeIndex].status = 'cancelled';
      }
      this.currentAttendees--;

      // Mover alguien de la lista de espera si hay espacio
      if (this.waitlist && this.waitlist.length > 0 && !this.isFull()) {
        const nextInWaitlist = this.waitlist.shift();
        if (nextInWaitlist) {
          this.registerAttendee(nextInWaitlist.userId, nextInWaitlist.name, nextInWaitlist.email);
          this.waitlistCount--;
        }
      }

      return true;
    }

    return false;
  }

  markAsCompleted(): void {
    this.status = EventStatus.COMPLETED;
    this.completedAt = new Date();
    this.updatedBy = 'system';
  }

  cancel(reason: string): void {
    this.status = EventStatus.CANCELLED;
    this.cancelledAt = new Date();
    this.cancellationReason = reason;
    this.updatedBy = 'system';
  }

  getDurationInHours(): number {
    return (this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60);
  }

  getDaysUntilStart(): number {
    const diffTime = this.startDate.getTime() - Date.now();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  needsReminder(): boolean {
    if (!this.sendReminders || this.isPast()) return false;

    const hoursUntilStart = this.getDaysUntilStart() * 24;
    return hoursUntilStart <= this.reminderHoursBefore && hoursUntilStart > 0;
  }

  toPublicJSON() {
    const { attendees, waitlist, feedbackResponses, createdBy, updatedBy, metadata, ...publicData } = this;
    return publicData;
  }

  static createEvent(
    title: string,
    description: string,
    type: EventType,
    startDate: Date,
    endDate: Date,
    createdBy?: string,
  ): Event {
    const event = new Event();
    event.title = title;
    event.description = description;
    event.type = type;
    event.startDate = startDate;
    event.endDate = endDate;
    event.status = EventStatus.DRAFT;
    event.visibility = EventVisibility.PUBLIC;
    event.createdBy = createdBy;

    return event;
  }
}