import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

// Módulos internos
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CommunityModule } from './modules/community/community.module';

// Servicios comunes
import { DatabaseConfigService } from './common/services/database-config.service';
import { RedisConfigService } from './common/services/redis-config.service';

// Entidades
import { Notification } from './entities/notification.entity';
import { Event } from './entities/event.entity';
import { Message } from './entities/message.entity';

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
    TypeOrmModule.forFeature([Notification, Event, Message]),

    // Cache Redis
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useClass: RedisConfigService,
      inject: [ConfigService],
    }),

    // Módulos de negocio
    NotificationsModule,
    CommunityModule,
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
export class NotificationServiceModule {}