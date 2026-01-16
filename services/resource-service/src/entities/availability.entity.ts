import {
  Entity,
  ObjectId,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AvailabilityStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  BLOCKED = 'blocked',
  MAINTENANCE = 'maintenance',
}

@Entity('availability')
@Index(['resourceId', 'date'])
@Index(['date', 'startTime'])
@Index(['status'])
export class Availability {
  @ObjectIdColumn()
  id: ObjectId;

  @Column({ name: 'resource_id' })
  resourceId: ObjectId;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string; // Formato HH:MM

  @Column({ name: 'end_time', type: 'time' })
  endTime: string; // Formato HH:MM

  @Column({
    type: 'enum',
    enum: AvailabilityStatus,
    default: AvailabilityStatus.AVAILABLE,
  })
  status: AvailabilityStatus;

  @Column({ name: 'is_recurring', default: false })
  isRecurring: boolean;

  @Column({ name: 'recurring_pattern', nullable: true })
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number; // Cada cuántos días/semanas/meses
    endDate?: Date;
    daysOfWeek?: number[]; // 0-6, domingo a sábado
  };

  @Column({ name: 'booking_id', nullable: true })
  bookingId?: ObjectId;

  @Column({ name: 'blocked_by', nullable: true })
  blockedBy?: string; // Usuario que bloqueó

  @Column({ name: 'block_reason', nullable: true })
  blockReason?: string;

  @Column({ type: 'json', name: 'metadata', nullable: true })
  metadata?: {
    price?: number;
    minimumDuration?: number;
    maximumDuration?: number;
    requiresApproval?: boolean;
    notes?: string;
  };

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

  overlapsWith(startTime: string, endTime: string): boolean {
    const thisStart = this.timeToMinutes(this.startTime);
    const thisEnd = this.timeToMinutes(this.endTime);
    const otherStart = this.timeToMinutes(startTime);
    const otherEnd = this.timeToMinutes(endTime);

    return thisStart < otherEnd && otherStart < thisEnd;
  }

  containsTime(time: string): boolean {
    const thisStart = this.timeToMinutes(this.startTime);
    const thisEnd = this.timeToMinutes(this.endTime);
    const checkTime = this.timeToMinutes(time);

    return checkTime >= thisStart && checkTime <= thisEnd;
  }

  isInThePast(): boolean {
    const now = new Date();
    const slotDateTime = new Date(this.date);
    const [hours, minutes] = this.endTime.split(':').map(Number);
    slotDateTime.setHours(hours, minutes, 0, 0);

    return slotDateTime < now;
  }

  isCurrentlyActive(): boolean {
    if (this.status !== AvailabilityStatus.AVAILABLE) {
      return false;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const slotDate = new Date(this.date);

    // Verificar si es el día correcto
    if (slotDate.getTime() !== today.getTime()) {
      return false;
    }

    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return this.containsTime(currentTime);
  }

  canBeBooked(): boolean {
    return (
      this.status === AvailabilityStatus.AVAILABLE &&
      !this.isInThePast() &&
      !this.bookingId
    );
  }

  markAsBooked(bookingId: ObjectId, bookedBy: string): void {
    this.status = AvailabilityStatus.BUSY;
    this.bookingId = bookingId;
    this.updatedBy = bookedBy;
  }

  markAsAvailable(updatedBy: string): void {
    this.status = AvailabilityStatus.AVAILABLE;
    this.bookingId = undefined;
    this.updatedBy = updatedBy;
  }

  block(reason: string, blockedBy: string): void {
    this.status = AvailabilityStatus.BLOCKED;
    this.blockReason = reason;
    this.blockedBy = blockedBy;
  }

  unblock(unblockedBy: string): void {
    this.status = AvailabilityStatus.AVAILABLE;
    this.blockReason = undefined;
    this.blockedBy = undefined;
    this.updatedBy = unblockedBy;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  toPublicJSON() {
    const { bookingId, blockedBy, createdBy, updatedBy, ...publicData } = this;
    return publicData;
  }

  static createSlot(
    resourceId: ObjectId,
    date: Date,
    startTime: string,
    endTime: string,
    createdBy?: string,
  ): Availability {
    const availability = new Availability();
    availability.resourceId = resourceId;
    availability.date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    availability.startTime = startTime;
    availability.endTime = endTime;
    availability.status = AvailabilityStatus.AVAILABLE;
    availability.createdBy = createdBy;

    return availability;
  }

  static createRecurringSlot(
    resourceId: ObjectId,
    startDate: Date,
    endDate: Date,
    startTime: string,
    endTime: string,
    pattern: {
      frequency: 'daily' | 'weekly' | 'monthly';
      interval: number;
      daysOfWeek?: number[];
    },
    createdBy?: string,
  ): Availability[] {
    const slots: Availability[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Verificar si el día actual cumple con el patrón semanal
      if (pattern.frequency === 'weekly' && pattern.daysOfWeek) {
        const dayOfWeek = currentDate.getDay();
        if (!pattern.daysOfWeek.includes(dayOfWeek)) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }
      }

      const slot = Availability.createSlot(
        resourceId,
        currentDate,
        startTime,
        endTime,
        createdBy,
      );

      slot.isRecurring = true;
      slot.recurringPattern = pattern;
      slots.push(slot);

      // Avanzar según la frecuencia
      if (pattern.frequency === 'daily') {
        currentDate.setDate(currentDate.getDate() + pattern.interval);
      } else if (pattern.frequency === 'weekly') {
        currentDate.setDate(currentDate.getDate() + (pattern.interval * 7));
      } else if (pattern.frequency === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + pattern.interval);
      }
    }

    return slots;
  }
}