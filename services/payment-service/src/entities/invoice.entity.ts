import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum InvoiceType {
  BOOKING = 'booking',
  MEMBERSHIP = 'membership',
  DEPOSIT = 'deposit',
  FEE = 'fee',
  REFUND = 'refund',
  OTHER = 'other',
}

@Entity('invoices')
@Index(['userId', 'status'])
@Index(['invoiceNumber'], { unique: true })
@Index(['status', 'dueDate'])
@Index(['createdAt'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'booking_id', nullable: true })
  bookingId?: string;

  @Column({ name: 'subscription_id', nullable: true })
  subscriptionId?: string;

  @Column({ name: 'invoice_number', unique: true })
  invoiceNumber: string; // Formato: INV-2025-001

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  @Column({
    type: 'enum',
    enum: InvoiceType,
    default: InvoiceType.BOOKING,
  })
  type: InvoiceType;

  @Column({ name: 'subtotal', type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'tax_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxPercentage: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'discount_code', nullable: true })
  discountCode?: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ name: 'amount_paid', type: 'decimal', precision: 10, scale: 2, default: 0 })
  amountPaid: number;

  @Column({ name: 'amount_due', type: 'decimal', precision: 10, scale: 2 })
  amountDue: number;

  @Column({ name: 'currency', default: 'USD' })
  currency: string;

  @Column({ name: 'issue_date', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  issueDate: Date;

  @Column({ name: 'due_date', type: 'timestamp' })
  dueDate: Date;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ name: 'viewed_at', type: 'timestamp', nullable: true })
  viewedAt?: Date;

  @Column({ type: 'json', name: 'line_items' })
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    period?: {
      startDate: Date;
      endDate: Date;
    };
    metadata?: Record<string, any>;
  }>;

  @Column({ type: 'json', name: 'billing_address', nullable: true })
  billingAddress?: {
    company?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };

  @Column({ type: 'json', name: 'payment_terms', nullable: true })
  paymentTerms?: string;

  @Column({ type: 'json', name: 'notes', nullable: true })
  notes?: string;

  @Column({ type: 'json', name: 'metadata', nullable: true })
  metadata?: {
    source?: 'web' | 'mobile' | 'api';
    campaignId?: string;
    promotionId?: string;
    internalNotes?: string;
    tags?: string[];
  };

  @Column({ name: 'payment_ids', type: 'json', nullable: true })
  paymentIds?: string[];

  @Column({ name: 'refunded_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  refundedAmount: number;

  @Column({ name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt?: Date;

  @Column({ name: 'refund_reason', length: 500, nullable: true })
  refundReason?: string;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'cancellation_reason', length: 500, nullable: true })
  cancellationReason?: string;

  @Column({ name: 'reminder_count', default: 0 })
  reminderCount: number;

  @Column({ name: 'last_reminder_at', type: 'timestamp', nullable: true })
  lastReminderAt?: Date;

  @Column({ name: 'next_reminder_at', type: 'timestamp', nullable: true })
  nextReminderAt?: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos auxiliares
  isPaid(): boolean {
    return this.status === InvoiceStatus.PAID;
  }

  isOverdue(): boolean {
    return this.status === InvoiceStatus.OVERDUE || (this.amountDue > 0 && new Date() > this.dueDate);
  }

  isPartiallyPaid(): boolean {
    return this.amountPaid > 0 && this.amountPaid < this.totalAmount;
  }

  canBePaid(): boolean {
    return ![InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED].includes(this.status);
  }

  canBeCancelled(): boolean {
    return ![InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED].includes(this.status);
  }

  canBeRefunded(): boolean {
    return this.isPaid() && this.refundedAmount < this.totalAmount;
  }

  markAsSent(): void {
    this.status = InvoiceStatus.SENT;
    this.sentAt = new Date();
    this.updatedBy = 'system';
  }

  markAsPaid(paymentId?: string): void {
    this.status = InvoiceStatus.PAID;
    this.paidAt = new Date();
    this.amountPaid = this.totalAmount;
    this.amountDue = 0;

    if (paymentId) {
      if (!this.paymentIds) {
        this.paymentIds = [];
      }
      this.paymentIds.push(paymentId);
    }

    this.updatedBy = 'system';
  }

  addPayment(paymentId: string, amount: number): void {
    if (!this.paymentIds) {
      this.paymentIds = [];
    }
    this.paymentIds.push(paymentId);
    this.amountPaid += amount;
    this.amountDue = Math.max(0, this.totalAmount - this.amountPaid);

    if (this.amountDue === 0) {
      this.status = InvoiceStatus.PAID;
      this.paidAt = new Date();
    }

    this.updatedBy = 'system';
  }

  markAsOverdue(): void {
    if (this.status === InvoiceStatus.SENT) {
      this.status = InvoiceStatus.OVERDUE;
      this.updatedBy = 'system';
    }
  }

  markAsRefunded(amount: number, reason: string): void {
    this.refundedAmount += amount;
    this.refundedAt = new Date();
    this.refundReason = reason;

    if (this.refundedAmount >= this.totalAmount) {
      this.status = InvoiceStatus.REFUNDED;
    }

    this.updatedBy = 'system';
  }

  cancel(reason: string): void {
    this.status = InvoiceStatus.CANCELLED;
    this.cancelledAt = new Date();
    this.cancellationReason = reason;
    this.updatedBy = 'system';
  }

  scheduleReminder(): void {
    this.reminderCount++;
    this.lastReminderAt = new Date();

    // Programar siguiente recordatorio (cada 7 días)
    const nextReminder = new Date();
    nextReminder.setDate(nextReminder.getDate() + 7);
    this.nextReminderAt = nextReminder;

    this.updatedBy = 'system';
  }

  calculateDaysOverdue(): number {
    if (!this.isOverdue()) return 0;

    const today = new Date();
    const diffTime = today.getTime() - this.dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getPaidPercentage(): number {
    if (this.totalAmount === 0) return 0;
    return (this.amountPaid / this.totalAmount) * 100;
  }

  getRefundedPercentage(): number {
    if (this.totalAmount === 0) return 0;
    return (this.refundedAmount / this.totalAmount) * 100;
  }

  toPublicJSON() {
    const { createdBy, updatedBy, metadata, ...publicData } = this;
    return publicData;
  }

  static generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `INV-${year}-${timestamp}`;
  }

  static createInvoice(
    userId: string,
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      period?: { startDate: Date; endDate: Date };
    }>,
    type: InvoiceType = InvoiceType.BOOKING,
    bookingId?: string,
    createdBy?: string,
  ): Invoice {
    const invoice = new Invoice();

    // Calcular totales
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * 0.18; // 18% IVA (ejemplo)
    const totalAmount = subtotal + taxAmount;

    invoice.userId = userId;
    invoice.bookingId = bookingId;
    invoice.invoiceNumber = Invoice.generateInvoiceNumber();
    invoice.type = type;
    invoice.subtotal = subtotal;
    invoice.taxAmount = taxAmount;
    invoice.taxPercentage = 18;
    invoice.totalAmount = totalAmount;
    invoice.amountPaid = 0;
    invoice.amountDue = totalAmount;
    invoice.lineItems = lineItems.map(item => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice,
    }));
    invoice.issueDate = new Date();

    // Fecha de vencimiento (30 días por defecto)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    invoice.dueDate = dueDate;

    invoice.status = InvoiceStatus.DRAFT;
    invoice.createdBy = createdBy;

    return invoice;
  }
}