import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';

export enum Permission {
  // Usuarios
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',

  // Recursos
  RESOURCE_READ = 'resource:read',
  RESOURCE_WRITE = 'resource:write',
  RESOURCE_DELETE = 'resource:delete',

  // Reservas
  BOOKING_READ = 'booking:read',
  BOOKING_WRITE = 'booking:write',
  BOOKING_DELETE = 'booking:delete',
  BOOKING_APPROVE = 'booking:approve',

  // Pagos
  PAYMENT_READ = 'payment:read',
  PAYMENT_WRITE = 'payment:write',
  PAYMENT_REFUND = 'payment:refund',

  // Sistema
  ADMIN_ACCESS = 'admin:access',
  AUDIT_READ = 'audit:read',
  CONFIG_WRITE = 'config:write',
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  name: string;

  @Column({ length: 255, nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: Permission,
    array: true,
    default: [],
  })
  permissions: Permission[];

  @Column({ name: 'is_system_role', default: false })
  isSystemRole: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos auxiliares
  hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission);
  }

  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  addPermission(permission: Permission): void {
    if (!this.hasPermission(permission)) {
      this.permissions.push(permission);
    }
  }

  removePermission(permission: Permission): void {
    this.permissions = this.permissions.filter(p => p !== permission);
  }
}