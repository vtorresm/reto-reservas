import {
  Entity,
  ObjectId,
  ObjectIdColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ResourceType {
  PRIVATE_OFFICE = 'private_office',
  SHARED_DESK = 'shared_desk',
  MEETING_ROOM = 'meeting_room',
  EVENT_SPACE = 'event_space',
  PHONE_BOOTH = 'phone_booth',
  COMMON_AREA = 'common_area',
  EQUIPMENT = 'equipment',
}

export enum ResourceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  UNAVAILABLE = 'unavailable',
}

@Entity('resources')
@Index(['location', 'type'])
@Index(['status', 'isAvailable'])
@Index(['capacity'])
@Index(['pricePerHour'])
export class Resource {
  @ObjectIdColumn()
  id: ObjectId;

  @Column({ unique: true })
  code: string; // Código único interno (ej: "PO-001", "MR-A1")

  @Column()
  name: string; // Nombre descriptivo

  @Column({
    type: 'text',
  })
  description: string;

  @Column({
    type: 'enum',
    enum: ResourceType,
  })
  type: ResourceType;

  @Column({
    type: 'enum',
    enum: ResourceStatus,
    default: ResourceStatus.ACTIVE,
  })
  status: ResourceStatus;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  // Información de ubicación
  @Column()
  location: string; // Edificio, piso, zona

  @Column({ name: 'floor_number', nullable: true })
  floorNumber?: number;

  @Column({ name: 'room_number', nullable: true })
  roomNumber?: string;

  @Column({ type: 'json', nullable: true })
  coordinates?: {
    latitude: number;
    longitude: number;
    building?: string;
    floor?: string;
  };

  // Características físicas
  @Column({ name: 'capacity', default: 1 })
  capacity: number; // Número de personas

  @Column({ name: 'area_sqm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  areaSqm?: number;

  @Column({ type: 'json', nullable: true })
  amenities?: {
    wifi: boolean;
    airConditioning: boolean;
    heating: boolean;
    naturalLight: boolean;
    projector: boolean;
    whiteboard: boolean;
    videoConference: boolean;
    phone: boolean;
    kitchen: boolean;
    parking: boolean;
    accessibility: boolean;
    storage: boolean;
  };

  @Column({ type: 'json', nullable: true })
  equipment?: {
    chairs: number;
    tables: number;
    monitors: number;
    keyboards: number;
    mice: number;
    headphones: number;
    chargers: number;
    cables: string[];
  };

  // Información de precios
  @Column({ name: 'price_per_hour', type: 'decimal', precision: 10, scale: 2 })
  pricePerHour: number;

  @Column({ name: 'price_per_day', type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerDay?: number;

  @Column({ name: 'price_per_month', type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerMonth?: number;

  @Column({ name: 'currency', default: 'USD' })
  currency: string;

  @Column({ name: 'minimum_booking_hours', default: 1 })
  minimumBookingHours: number;

  @Column({ name: 'maximum_booking_hours', nullable: true })
  maximumBookingHours?: number;

  // Información de disponibilidad
  @Column({ type: 'json', nullable: true })
  availabilitySchedule?: {
    monday: { open: string; close: string; available: boolean };
    tuesday: { open: string; close: string; available: boolean };
    wednesday: { open: string; close: string; available: boolean };
    thursday: { open: string; close: string; available: boolean };
    friday: { open: string; close: string; available: boolean };
    saturday: { open: string; close: string; available: boolean };
    sunday: { open: string; close: string; available: boolean };
  };

  @Column({ type: 'json', name: 'unavailable_periods', nullable: true })
  unavailablePeriods?: Array<{
    startDate: Date;
    endDate: Date;
    reason: string;
    createdBy: string;
  }>;

  @Column({ type: 'json', name: 'maintenance_schedule', nullable: true })
  maintenanceSchedule?: Array<{
    date: Date;
    duration: number; // horas
    type: 'cleaning' | 'maintenance' | 'inspection';
    notes?: string;
  }>;

  // Información adicional
  @Column({ type: 'json', nullable: true })
  images?: string[]; // URLs de imágenes

  @Column({ type: 'json', nullable: true })
  tags?: string[]; // Etiquetas para búsqueda

  @Column({ type: 'json', name: 'custom_fields', nullable: true })
  customFields?: Record<string, any>;

  @Column({ name: 'priority', default: 0 })
  priority: number; // Para ordenamiento en listados

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'requires_approval', default: false })
  requiresApproval: boolean;

  @Column({ name: 'max_advance_booking_days', default: 90 })
  maxAdvanceBookingDays: number;

  // Auditoría
  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos auxiliares
  isCurrentlyAvailable(): boolean {
    if (!this.isAvailable || this.status !== ResourceStatus.ACTIVE) {
      return false;
    }

    const now = new Date();
    const currentDay = now.toLocaleLowerCase();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    if (!this.availabilitySchedule?.[currentDay]?.available) {
      return false;
    }

    const schedule = this.availabilitySchedule[currentDay];
    return currentTime >= schedule.open && currentTime <= schedule.close;
  }

  getPriceForDuration(hours: number): number {
    if (hours >= 24 * 30) { // Más de 30 días
      const months = Math.ceil(hours / (24 * 30));
      return (this.pricePerMonth || this.pricePerDay * 30) * months;
    } else if (hours >= 24) { // Más de 24 horas
      const days = Math.ceil(hours / 24);
      return (this.pricePerDay || this.pricePerHour * 24) * days;
    } else { // Por horas
      return this.pricePerHour * hours;
    }
  }

  canBeBookedBy(user: any): boolean {
    if (this.requiresApproval && !user?.isAdmin) {
      return false;
    }

    if (this.status !== ResourceStatus.ACTIVE) {
      return false;
    }

    return this.isAvailable;
  }

  addUnavailablePeriod(startDate: Date, endDate: Date, reason: string, createdBy: string): void {
    if (!this.unavailablePeriods) {
      this.unavailablePeriods = [];
    }

    this.unavailablePeriods.push({
      startDate,
      endDate,
      reason,
      createdBy,
    });

    // Si el período incluye el día actual, marcar como no disponible
    const now = new Date();
    if (startDate <= now && endDate >= now) {
      this.isAvailable = false;
    }
  }

  removeUnavailablePeriod(periodIndex: number): void {
    if (this.unavailablePeriods && this.unavailablePeriods[periodIndex]) {
      this.unavailablePeriods.splice(periodIndex, 1);

      // Verificar si aún hay períodos que afecten la disponibilidad actual
      const now = new Date();
      const hasCurrentUnavailablePeriod = this.unavailablePeriods.some(
        period => period.startDate <= now && period.endDate >= now
      );

      if (!hasCurrentUnavailablePeriod) {
        this.isAvailable = true;
      }
    }
  }

  updateMaintenanceSchedule(schedule: any[]): void {
    this.maintenanceSchedule = schedule;

    // Verificar si hay mantenimiento programado para hoy
    const today = new Date().toDateString();
    const hasMaintenanceToday = this.maintenanceSchedule?.some(
      maintenance => new Date(maintenance.date).toDateString() === today
    );

    if (hasMaintenanceToday) {
      this.status = ResourceStatus.MAINTENANCE;
      this.isAvailable = false;
    }
  }

  toPublicJSON() {
    const { unavailablePeriods, maintenanceSchedule, createdBy, updatedBy, ...publicData } = this;
    return publicData;
  }
}