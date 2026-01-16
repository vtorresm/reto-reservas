import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ConfigurationType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  ARRAY = 'array',
}

export enum ConfigurationScope {
  GLOBAL = 'global',
  SERVICE = 'service',
  ENVIRONMENT = 'environment',
  USER = 'user',
}

@Entity('configurations')
@Index(['key'], { unique: true })
@Index(['scope', 'service'])
@Index(['isActive'])
export class Configuration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string; // Clave única de configuración (ej: 'app.name', 'database.host')

  @Column()
  value: string; // Valor como string (se transformará según el tipo)

  @Column({
    type: 'enum',
    enum: ConfigurationType,
    default: ConfigurationType.STRING,
  })
  type: ConfigurationType;

  @Column({
    type: 'enum',
    enum: ConfigurationScope,
    default: ConfigurationScope.GLOBAL,
  })
  scope: ConfigurationScope;

  @Column({ name: 'service_name', nullable: true })
  serviceName?: string; // Para configuraciones específicas de servicio

  @Column({ name: 'environment', nullable: true })
  environment?: string; // Para configuraciones específicas de ambiente

  @Column({ name: 'user_id', nullable: true })
  userId?: string; // Para configuraciones específicas de usuario

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_sensitive', default: false })
  isSensitive: boolean; // Para configuraciones que contienen datos sensibles

  @Column({ name: 'is_system', default: false })
  isSystem: boolean; // Configuraciones del sistema que no se pueden eliminar

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'default_value', nullable: true })
  defaultValue?: string;

  @Column({ type: 'json', name: 'validation_rules', nullable: true })
  validationRules?: {
    min?: number;
    max?: number;
    pattern?: string;
    allowedValues?: string[];
    required?: boolean;
  };

  @Column({ type: 'json', name: 'metadata', nullable: true })
  metadata?: {
    category?: string;
    subcategory?: string;
    tags?: string[];
    version?: string;
    lastModifiedBy?: string;
    source?: string;
    documentation?: string;
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
  getTypedValue(): any {
    switch (this.type) {
      case ConfigurationType.STRING:
        return this.value;
      case ConfigurationType.NUMBER:
        return Number(this.value);
      case ConfigurationType.BOOLEAN:
        return this.value.toLowerCase() === 'true';
      case ConfigurationType.JSON:
        return JSON.parse(this.value);
      case ConfigurationType.ARRAY:
        return JSON.parse(this.value);
      default:
        return this.value;
    }
  }

  setTypedValue(value: any): void {
    switch (this.type) {
      case ConfigurationType.STRING:
        this.value = String(value);
        break;
      case ConfigurationType.NUMBER:
        this.value = String(Number(value));
        break;
      case ConfigurationType.BOOLEAN:
        this.value = String(Boolean(value));
        break;
      case ConfigurationType.JSON:
      case ConfigurationType.ARRAY:
        this.value = JSON.stringify(value);
        break;
      default:
        this.value = String(value);
    }
  }

  validateValue(): { valid: boolean; error?: string } {
    const rules = this.validationRules;
    if (!rules) return { valid: true };

    const value = this.getTypedValue();

    if (rules.required && (value === null || value === undefined || value === '')) {
      return { valid: false, error: 'Valor requerido' };
    }

    if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
      return { valid: false, error: `Valor mínimo: ${rules.min}` };
    }

    if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
      return { valid: false, error: `Valor máximo: ${rules.max}` };
    }

    if (rules.pattern && typeof value === 'string') {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        return { valid: false, error: `Formato inválido. Patrón requerido: ${rules.pattern}` };
      }
    }

    if (rules.allowedValues && !rules.allowedValues.includes(value)) {
      return { valid: false, error: `Valor debe ser uno de: ${rules.allowedValues.join(', ')}` };
    }

    return { valid: true };
  }

  isApplicableToService(serviceName?: string): boolean {
    if (this.scope === ConfigurationScope.GLOBAL) return true;
    if (this.scope === ConfigurationScope.SERVICE && this.serviceName === serviceName) return true;
    return false;
  }

  isApplicableToEnvironment(environment?: string): boolean {
    if (this.scope === ConfigurationScope.GLOBAL) return true;
    if (this.scope === ConfigurationScope.ENVIRONMENT && this.environment === environment) return true;
    return false;
  }

  isApplicableToUser(userId?: string): boolean {
    if (this.scope === ConfigurationScope.GLOBAL) return true;
    if (this.scope === ConfigurationScope.USER && this.userId === userId) return true;
    return false;
  }

  canBeModified(): boolean {
    return !this.isSystem;
  }

  canBeDeleted(): boolean {
    return !this.isSystem;
  }

  toPublicJSON() {
    const { isSensitive, createdBy, updatedBy, ...publicData } = this;

    // No exponer valores sensibles
    if (isSensitive) {
      const { value, defaultValue, ...safeData } = publicData;
      return { ...safeData, hasValue: !!value };
    }

    return publicData;
  }

  static createConfiguration(
    key: string,
    value: any,
    type: ConfigurationType = ConfigurationType.STRING,
    scope: ConfigurationScope = ConfigurationScope.GLOBAL,
    description?: string,
    createdBy?: string,
  ): Configuration {
    const config = new Configuration();
    config.key = key;
    config.type = type;
    config.scope = scope;
    config.description = description;
    config.setTypedValue(value);
    config.createdBy = createdBy;

    return config;
  }
}