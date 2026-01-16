import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

// Módulos internos
import { LogsModule } from './modules/logs/logs.module';
import { ReportsModule } from './modules/reports/reports.module';

// Servicios comunes
import { DatabaseConfigService } from './common/services/database-config.service';
import { RedisConfigService } from './common/services/redis-config.service';

// Entidades
import { AuditLog } from './entities/audit-log.entity';

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
    TypeOrmModule.forFeature([AuditLog]),

    // Cache Redis
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useClass: RedisConfigService,
      inject: [ConfigService],
    }),

    // Módulos de negocio
    LogsModule,
    ReportsModule,
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
export class AuditServiceModule {}