import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FeatureFlagStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  CONDITIONAL = 'conditional',
}

export enum FeatureFlagTarget {
  ALL = 'all',
  USERS = 'users',
  ROLES = 'roles',
  SERVICES = 'services',
  ENVIRONMENTS = 'environments',
  PERCENTAGE = 'percentage',
}

@Entity('feature_flags')
@Index(['name'], { unique: true })
@Index(['status', 'target'])
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // Clave única del feature flag (ej: 'new-booking-system')

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: FeatureFlagStatus,
    default: FeatureFlagStatus.DISABLED,
  })
  status: FeatureFlagStatus;

  @Column({
    type: 'enum',
    enum: FeatureFlagTarget,
    default: FeatureFlagTarget.ALL,
  })
  target: FeatureFlagTarget;

  @Column({ name: 'target_value', nullable: true })
  targetValue?: string; // Valor específico del target (userId, role, service, etc.)

  @Column({ name: 'percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentage?: number; // Para rollouts graduales (0-100)

  @Column({ type: 'json', name: 'conditions', nullable: true })
  conditions?: {
    userRoles?: string[];
    userIds?: string[];
    services?: string[];
    environments?: string[];
    minVersion?: string;
    maxVersion?: string;
    startDate?: Date;
    endDate?: Date;
    customConditions?: Record<string, any>;
  };

  @Column({ name: 'default_value', default: false })
  defaultValue: boolean;

  @Column({ name: 'current_value', default: false })
  currentValue: boolean;

  @Column({ name: 'is_system_flag', default: false })
  isSystemFlag: boolean;

  @Column({ name: 'requires_restart', default: false })
  requiresRestart: boolean;

  @Column({ type: 'json', name: 'metadata', nullable: true })
  metadata?: {
    category?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    riskLevel?: 'low' | 'medium' | 'high';
    rollbackPlan?: string;
    documentation?: string;
    tags?: string[];
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
  isEnabled(): boolean {
    return this.status === FeatureFlagStatus.ENABLED && this.currentValue;
  }

  isDisabled(): boolean {
    return this.status === FeatureFlagStatus.DISABLED || !this.currentValue;
  }

  isApplicableToUser(userId?: string, userRole?: string): boolean {
    if (this.status === FeatureFlagStatus.DISABLED) return false;

    switch (this.target) {
      case FeatureFlagTarget.ALL:
        return true;
      case FeatureFlagTarget.USERS:
        return this.conditions?.userIds?.includes(userId || '') || false;
      case FeatureFlagTarget.ROLES:
        return this.conditions?.userRoles?.includes(userRole || '') || false;
      case FeatureFlagTarget.PERCENTAGE:
        if (!userId) return false;
        return this.getUserPercentage(userId) <= (this.percentage || 0);
      default:
        return false;
    }
  }

  isApplicableToService(serviceName?: string): boolean {
    if (this.status === FeatureFlagStatus.DISABLED) return false;

    switch (this.target) {
      case FeatureFlagTarget.ALL:
        return true;
      case FeatureFlagTarget.SERVICES:
        return this.conditions?.services?.includes(serviceName || '') || false;
      default:
        return false;
    }
  }

  isApplicableToEnvironment(environment?: string): boolean {
    if (this.status === FeatureFlagStatus.DISABLED) return false;

    switch (this.target) {
      case FeatureFlagTarget.ALL:
        return true;
      case FeatureFlagTarget.ENVIRONMENTS:
        return this.conditions?.environments?.includes(environment || '') || false;
      default:
        return false;
    }
  }

  evaluateForContext(context: {
    userId?: string;
    userRole?: string;
    serviceName?: string;
    environment?: string;
  }): boolean {
    if (this.status === FeatureFlagStatus.DISABLED) return false;

    // Verificar condiciones de tiempo
    const now = new Date();
    if (this.conditions?.startDate && now < this.conditions.startDate) return false;
    if (this.conditions?.endDate && now > this.conditions.endDate) return false;

    // Verificar target específico
    switch (this.target) {
      case FeatureFlagTarget.ALL:
        return this.currentValue;
      case FeatureFlagTarget.USERS:
        return this.isApplicableToUser(context.userId, context.userRole) && this.currentValue;
      case FeatureFlagTarget.ROLES:
        return this.isApplicableToUser(context.userId, context.userRole) && this.currentValue;
      case FeatureFlagTarget.SERVICES:
        return this.isApplicableToService(context.serviceName) && this.currentValue;
      case FeatureFlagTarget.ENVIRONMENTS:
        return this.isApplicableToEnvironment(context.environment) && this.currentValue;
      case FeatureFlagTarget.PERCENTAGE:
        return this.isApplicableToUser(context.userId, context.userRole) && this.currentValue;
      default:
        return this.currentValue;
    }
  }

  enable(): void {
    this.status = FeatureFlagStatus.ENABLED;
    this.currentValue = true;
    this.updatedBy = 'system';
  }

  disable(): void {
    this.status = FeatureFlagStatus.DISABLED;
    this.currentValue = false;
    this.updatedBy = 'system';
  }

  toggle(): void {
    this.currentValue = !this.currentValue;
    this.status = this.currentValue ? FeatureFlagStatus.ENABLED : FeatureFlagStatus.DISABLED;
    this.updatedBy = 'system';
  }

  setConditional(conditions: any): void {
    this.status = FeatureFlagStatus.CONDITIONAL;
    this.conditions = conditions;
    this.updatedBy = 'system';
  }

  private getUserPercentage(userId: string): number {
    // Hash simple para distribuir usuarios uniformemente
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32-bit integer
    }

    return Math.abs(hash) % 100;
  }

  toPublicJSON() {
    const { createdBy, updatedBy, ...publicData } = this;
    return publicData;
  }

  static createFeatureFlag(
    name: string,
    description: string,
    defaultValue: boolean = false,
    target: FeatureFlagTarget = FeatureFlagTarget.ALL,
    createdBy?: string,
  ): FeatureFlag {
    const flag = new FeatureFlag();
    flag.name = name;
    flag.description = description;
    flag.target = target;
    flag.defaultValue = defaultValue;
    flag.currentValue = defaultValue;
    flag.status = defaultValue ? FeatureFlagStatus.ENABLED : FeatureFlagStatus.DISABLED;
    flag.createdBy = createdBy;

    return flag;
  }
}