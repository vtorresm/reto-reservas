import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

// Módulos internos
import { BookingsModule } from './modules/bookings/bookings.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { PoliciesModule } from './modules/policies/policies.module';

// Servicios comunes
import { DatabaseConfigService } from './common/services/database-config.service';
import { RedisConfigService } from './common/services/redis-config.service';

// Entidades
import { Booking } from './entities/booking.entity';
import { BookingPolicy } from './entities/booking-policy.entity';

@Module({
  imports: [
    // Configuración
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Base de datos
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfigService,
      inject: [ConfigService],
    }),

    // Registrar entidades
    TypeOrmModule.forFeature([Booking, BookingPolicy]),

    // Cache Redis
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useClass: RedisConfigService,
      inject: [ConfigService],
    }),

    // Módulos de negocio
    BookingsModule,
    CalendarModule,
    PoliciesModule,
  ],
  controllers: [],
  providers: [
    // Servicios globales
    {
      provide: 'DATABASE_CONFIG',
      useClass: DatabaseConfigService,
    },
    {
      provide: 'REDIS_CONFIG',
      useClass: RedisConfigService,
    },
  ],
  exports: [TypeOrmModule, CacheModule],
})
export class BookingServiceModule {}