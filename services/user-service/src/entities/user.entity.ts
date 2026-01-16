import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  Index,
} from 'typeorm';
import { Role } from './role.entity';
import { Session } from './session.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ unique: true, length: 100 })
  username: string;

  @Column({ length: 255 })
  password: string; // Hashed

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ name: 'phone_number', length: 20, nullable: true })
  phoneNumber?: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'phone_verified', default: false })
  phoneVerified: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'email_verification_token', length: 255, nullable: true })
  emailVerificationToken?: string;

  @Column({ name: 'password_reset_token', length: 255, nullable: true })
  passwordResetToken?: string;

  @Column({ name: 'password_reset_expires', type: 'timestamp', nullable: true })
  passwordResetExpires?: Date;

  @Column({ name: 'profile_image_url', length: 500, nullable: true })
  profileImageUrl?: string;

  @Column({ type: 'json', name: 'preferences', nullable: true })
  preferences?: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    theme: 'light' | 'dark' | 'auto';
  };

  @Column({ type: 'json', name: 'metadata', nullable: true })
  metadata?: Record<string, any>;

  // Relaciones
  @ManyToOne(() => Role, { eager: true })
  role: Role;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Métodos auxiliares
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  canLogin(): boolean {
    return this.isActive() && this.emailVerified;
  }

  // Método para serialización segura (sin password)
  toSafeJSON() {
    const { password, emailVerificationToken, passwordResetToken, ...safeUser } = this;
    return safeUser;
  }
}