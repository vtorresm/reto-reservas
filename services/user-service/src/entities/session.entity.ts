import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('sessions')
@Index(['token'], { unique: true })
@Index(['user', 'isActive'])
@Index(['expiresAt'])
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 500 })
  token: string;

  @Column({ name: 'refresh_token', length: 500 })
  refreshToken: string;

  @Column({ name: 'device_info', type: 'json', nullable: true })
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
    platform: string;
    browser?: string;
  };

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'refresh_expires_at', type: 'timestamp' })
  refreshExpiresAt: Date;

  @Column({ name: 'last_activity_at', type: 'timestamp', nullable: true })
  lastActivityAt?: Date;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos auxiliares
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isRefreshExpired(): boolean {
    return new Date() > this.refreshExpiresAt;
  }

  updateActivity(): void {
    this.lastActivityAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
  }
}