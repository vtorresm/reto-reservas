import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export enum LogCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BOOKING = 'booking',
  PAYMENT = 'payment',
  RESOURCE = 'resource',
  USER = 'user',
  SYSTEM = 'system',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  BUSINESS = 'business',
}

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  FAILED_LOGIN = 'failed_login',
  PASSWORD_CHANGE = 'password_change',
  ROLE_CHANGE = 'role_change',
  PERMISSION_CHANGE = 'permission_change',
  BOOKING_CREATE = 'booking_create',
  BOOKING_CANCEL = 'booking_cancel',
  BOOKING_MODIFY = 'booking_modify',
  PAYMENT_PROCESS = 'payment_process',
  PAYMENT_REFUND = 'payment_refund',
  RESOURCE_CREATE = 'resource_create',
  RESOURCE_MODIFY = 'resource_modify',
  RESOURCE_DELETE = 'resource_delete',
  SYSTEM_CONFIG = 'system_config',
  DATA_EXPORT = 'data_export',
  DATA_IMPORT = 'data_import',
  BACKUP = 'backup',
  RESTORE = 'restore',
}

@Entity('audit_logs')
@Index(['timestamp'])
@Index(['userId', 'timestamp'])
@Index(['service', 'timestamp'])
@Index(['category', 'action'])
@Index(['level', 'timestamp'])
@Index(['correlationId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'timestamp', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ name: 'correlation_id', nullable: true })
  correlationId?: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({ name: 'session_id', nullable: true })
  sessionId?: string;

  @Column({ name: 'service_name' })
  serviceName: string;

  @Column({
    type: 'enum',
    enum: LogLevel,
    default: LogLevel.INFO,
  })
  level: LogLevel;

  @Column({
    type: 'enum',
    enum: LogCategory,
  })
  category: LogCategory;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ name: 'resource_type', nullable: true })
  resourceType?: string; // Tipo de entidad afectada (user, booking, payment, etc.)

  @Column({ name: 'resource_id', nullable: true })
  resourceId?: string; // ID de la entidad afectada

  @Column({ name: 'old_values', type: 'json', nullable: true })
  oldValues?: Record<string, any>; // Valores anteriores (para updates)

  @Column({ name: 'new_values', type: 'json', nullable: true })
  newValues?: Record<string, any>; // Valores nuevos (para creates/updates)

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    requestMethod?: string;
    requestUrl?: string;
    responseStatus?: number;
    responseTime?: number;
    errorCode?: string;
    errorMessage?: string;
    stackTrace?: string;
    requestHeaders?: Record<string, string>;
    requestBody?: any;
    responseBody?: any;
    tags?: string[];
    severity?: 'low' | 'medium' | 'high' | 'critical';
  };

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @Column({ name: 'request_id', nullable: true })
  requestId?: string;

  @Column({ name: 'trace_id', nullable: true })
  traceId?: string;

  @Column({ name: 'span_id', nullable: true })
  spanId?: string;

  @Column({ name: 'parent_span_id', nullable: true })
  parentSpanId?: string;

  @Column({ name: 'environment', default: 'development' })
  environment: string;

  @Column({ name: 'version', nullable: true })
  version?: string;

  @Column({ name: 'commit_hash', nullable: true })
  commitHash?: string;

  @Column({ name: 'is_sensitive', default: false })
  isSensitive: boolean;

  @Column({ name: 'retention_until', type: 'timestamp', nullable: true })
  retentionUntil?: Date;

  @Column({ name: 'archived', default: false })
  archived: boolean;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt?: Date;

  @Column({ name: 'compliance_flags', type: 'json', nullable: true })
  complianceFlags?: {
    gdpr?: boolean;
    pci?: boolean;
    hipaa?: boolean;
    sox?: boolean;
    custom?: string[];
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
  isExpired(): boolean {
    return this.retentionUntil ? new Date() > this.retentionUntil : false;
  }

  shouldBeArchived(): boolean {
    return this.isExpired() || this.archived;
  }

  containsSensitiveData(): boolean {
    return this.isSensitive || this.category === LogCategory.SECURITY;
  }

  getDuration(): number | null {
    if (this.metadata?.responseTime) {
      return this.metadata.responseTime;
    }
    return null;
  }

  hasError(): boolean {
    return this.level === LogLevel.ERROR || this.level === LogLevel.FATAL;
  }

  isSecurityEvent(): boolean {
    return this.category === LogCategory.SECURITY ||
           this.action === AuditAction.FAILED_LOGIN ||
           this.metadata?.errorCode === 'UNAUTHORIZED';
  }

  toPublicJSON() {
    const { isSensitive, metadata, createdBy, updatedBy, ...publicData } = this;

    // No exponer datos sensibles en logs públicos
    if (isSensitive) {
      const { oldValues, newValues, metadata: logMetadata, ...safeData } = publicData;
      return {
        ...safeData,
        hasSensitiveData: true,
        sanitized: true
      };
    }

    return publicData;
  }

  static createLog(
    serviceName: string,
    level: LogLevel,
    category: LogCategory,
    action: AuditAction,
    description: string,
    userId?: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: any,
    correlationId?: string,
    createdBy?: string,
  ): AuditLog {
    const log = new AuditLog();
    log.serviceName = serviceName;
    log.level = level;
    log.category = category;
    log.action = action;
    log.description = description;
    log.timestamp = new Date();
    log.userId = userId;
    log.resourceType = resourceType;
    log.resourceId = resourceId;
    log.metadata = metadata;
    log.correlationId = correlationId;
    log.createdBy = createdBy;

    return log;
  }

  static createSecurityLog(
    serviceName: string,
    action: AuditAction,
    description: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: any,
    createdBy?: string,
  ): AuditLog {
    const log = AuditLog.createLog(
      serviceName,
      LogLevel.WARN,
      LogCategory.SECURITY,
      action,
      description,
      userId,
      undefined,
      undefined,
      { ...metadata, ipAddress, userAgent },
      undefined,
      createdBy,
    );

    log.isSensitive = true;
    log.complianceFlags = { gdpr: true };

    return log;
  }

  static createErrorLog(
    serviceName: string,
    category: LogCategory,
    action: AuditAction,
    description: string,
    error: Error,
    userId?: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: any,
    createdBy?: string,
  ): AuditLog {
    const log = AuditLog.createLog(
      serviceName,
      LogLevel.ERROR,
      category,
      action,
      description,
      userId,
      resourceType,
      resourceId,
      {
        ...metadata,
        errorMessage: error.message,
        stackTrace: error.stack,
      },
      undefined,
      createdBy,
    );

    return log;
  }
}