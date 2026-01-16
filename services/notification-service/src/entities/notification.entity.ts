import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationType {
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationCategory {
  BOOKING = 'booking',
  PAYMENT = 'payment',
  SYSTEM = 'system',
  MARKETING = 'marketing',
  COMMUNITY = 'community',
  REMINDER = 'reminder',
  ALERT = 'alert',
}

@Entity('notifications')
@Index(['userId', 'status'])
@Index(['status', 'scheduledFor'])
@Index(['type', 'category'])
@Index(['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @Column({
    type: 'enum',
    enum: NotificationCategory,
  })
  category: NotificationCategory;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json', nullable: true })
  data?: Record<string, any>; // Datos adicionales para templates

  @Column({ name: 'recipient_email', nullable: true })
  recipientEmail?: string;

  @Column({ name: 'recipient_phone', nullable: true })
  recipientPhone?: string;

  @Column({ name: 'recipient_device_token', nullable: true })
  recipientDeviceToken?: string;

  @Column({ name: 'recipient_webhook_url', nullable: true })
  recipientWebhookUrl?: string;

  @Column({ name: 'scheduled_for', type: 'timestamp', nullable: true })
  scheduledFor?: Date;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date;

  @Column({ name: 'failed_at', type: 'timestamp', nullable: true })
  failedAt?: Date;

  @Column({ name: 'failure_reason', length: 1000, nullable: true })
  failureReason?: string;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', default: 3 })
  maxRetries: number;

  @Column({ name: 'next_retry_at', type: 'timestamp', nullable: true })
  nextRetryAt?: Date;

  @Column({ name: 'template_id', nullable: true })
  templateId?: string;

  @Column({ name: 'template_variables', type: 'json', nullable: true })
  templateVariables?: Record<string, any>;

  @Column({ name: 'provider_response', type: 'json', nullable: true })
  providerResponse?: any; // Respuesta del proveedor (SendGrid, Firebase, etc.)

  @Column({ name: 'external_message_id', nullable: true })
  externalMessageId?: string; // ID del mensaje en el proveedor externo

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_by_user', default: false })
  readByUser: boolean;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'tags', type: 'json', nullable: true })
  tags?: string[];

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata?: {
    source?: 'system' | 'user' | 'admin';
    campaignId?: string;
    batchId?: string;
    userAgent?: string;
    ipAddress?: string;
    language?: string;
    timezone?: string;
  };

  @Column({ name: 'related_entity_type', nullable: true })
  relatedEntityType?: string; // 'booking', 'payment', 'user', etc.

  @Column({ name: 'related_entity_id', nullable: true })
  relatedEntityId?: string;

  @Column({ name: 'action_url', nullable: true })
  actionUrl?: string; // URL para acciones (ej: confirmar asistencia)

  @Column({ name: 'action_text', nullable: true })
  actionText?: string; // Texto del botón de acción

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ name: 'icon', nullable: true })
  icon?: string;

  @Column({ name: 'sound', nullable: true })
  sound?: string;

  @Column({ name: 'badge_count', nullable: true })
  badgeCount?: number;

  @Column({ name: 'group_id', nullable: true })
  groupId?: string; // Para agrupar notificaciones relacionadas

  @Column({ name: 'thread_id', nullable: true })
  threadId?: string; // Para conversaciones

  @Column({ name: 'is_silent', default: false })
  isSilent: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos auxiliares
  isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  isPending(): boolean {
    return this.status === NotificationStatus.PENDING;
  }

  isFailed(): boolean {
    return this.status === NotificationStatus.FAILED;
  }

  canBeRetried(): boolean {
    return this.isFailed() && this.retryCount < this.maxRetries;
  }

  markAsSent(providerResponse?: any): void {
    this.status = NotificationStatus.SENT;
    this.sentAt = new Date();
    this.providerResponse = providerResponse;
    this.updatedBy = 'system';
  }

  markAsDelivered(externalMessageId?: string): void {
    this.status = NotificationStatus.DELIVERED;
    this.deliveredAt = new Date();
    this.externalMessageId = externalMessageId;
    this.updatedBy = 'system';
  }

  markAsRead(): void {
    this.isRead = true;
    this.readByUser = true;
    this.readAt = new Date();
    this.updatedBy = 'user';
  }

  markAsFailed(reason: string, canRetry: boolean = true): void {
    this.status = NotificationStatus.FAILED;
    this.failedAt = new Date();
    this.failureReason = reason;
    this.updatedBy = 'system';

    if (canRetry && this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.nextRetryAt = new Date(Date.now() + (this.retryCount * 60 * 1000)); // Retry cada minuto
    }
  }

  scheduleForLater(scheduledTime: Date): void {
    this.scheduledFor = scheduledTime;
    this.updatedBy = 'system';
  }

  cancel(reason?: string): void {
    this.status = NotificationStatus.CANCELLED;
    this.updatedBy = 'system';
  }

  getTimeToSend(): number | null {
    if (!this.scheduledFor) return null;
    return Math.max(0, this.scheduledFor.getTime() - Date.now());
  }

  shouldBeSentNow(): boolean {
    if (this.status !== NotificationStatus.PENDING) return false;
    if (this.isExpired()) return false;

    return !this.scheduledFor || new Date() >= this.scheduledFor;
  }

  toPublicJSON() {
    const { providerResponse, externalMessageId, createdBy, updatedBy, metadata, ...publicData } = this;
    return publicData;
  }

  static createNotification(
    userId: string,
    type: NotificationType,
    category: NotificationCategory,
    title: string,
    content: string,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    scheduledFor?: Date,
    createdBy?: string,
  ): Notification {
    const notification = new Notification();
    notification.userId = userId;
    notification.type = type;
    notification.category = category;
    notification.title = title;
    notification.content = content;
    notification.priority = priority;
    notification.status = NotificationStatus.PENDING;

    if (scheduledFor) {
      notification.scheduledFor = scheduledFor;
    }

    notification.createdBy = createdBy;

    return notification;
  }

  static createBookingNotification(
    userId: string,
    bookingId: string,
    title: string,
    content: string,
    type: NotificationType = NotificationType.EMAIL,
    createdBy?: string,
  ): Notification {
    const notification = Notification.createNotification(
      userId,
      type,
      NotificationCategory.BOOKING,
      title,
      content,
      NotificationPriority.NORMAL,
      undefined,
      createdBy,
    );

    notification.relatedEntityType = 'booking';
    notification.relatedEntityId = bookingId;

    return notification;
  }

  static createPaymentNotification(
    userId: string,
    paymentId: string,
    title: string,
    content: string,
    type: NotificationType = NotificationType.EMAIL,
    createdBy?: string,
  ): Notification {
    const notification = Notification.createNotification(
      userId,
      type,
      NotificationCategory.PAYMENT,
      title,
      content,
      NotificationPriority.HIGH,
      undefined,
      createdBy,
    );

    notification.relatedEntityType = 'payment';
    notification.relatedEntityId = paymentId;

    return notification;
  }
}