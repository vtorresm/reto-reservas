import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

// Módulos internos
import { PaymentsModule } from './modules/payments/payments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';

// Servicios comunes
import { DatabaseConfigService } from './common/services/database-config.service';
import { RedisConfigService } from './common/services/redis-config.service';

// Entidades
import { Payment } from './entities/payment.entity';
import { Invoice } from './entities/invoice.entity';
import { Subscription } from './entities/subscription.entity';

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
    TypeOrmModule.forFeature([Payment, Invoice, Subscription]),

    // Cache Redis
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useClass: RedisConfigService,
      inject: [ConfigService],
    }),

    // Módulos de negocio
    PaymentsModule,
    InvoicesModule,
    SubscriptionsModule,
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
export class PaymentServiceModule {}