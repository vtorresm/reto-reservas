import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      username: this.configService.get<string>('DB_USERNAME', 'coworking_config_user'),
      password: this.configService.get<string>('DB_PASSWORD', 'coworking_config_password'),
      database: this.configService.get<string>('DB_DATABASE', 'coworking_config'),

      // Entidades
      entities: [__dirname + '/../entities/*.entity{.ts,.js}'],

      // Sincronización (solo desarrollo)
      synchronize: this.configService.get<string>('NODE_ENV') !== 'production',

      // Logging
      logging: this.configService.get<string>('NODE_ENV') === 'development',

      // SSL (producción)
      ssl: this.configService.get<string>('NODE_ENV') === 'production' ? {
        rejectUnauthorized: false,
      } : false,

      // Pool de conexiones
      extra: {
        connectionLimit: this.configService.get<number>('DB_CONNECTION_LIMIT', 10),
        acquireTimeout: this.configService.get<number>('DB_ACQUIRE_TIMEOUT', 60000),
        timeout: this.configService.get<number>('DB_TIMEOUT', 60000),
      },

      // Configuración avanzada
      cache: {
        type: 'redis',
        options: {
          host: this.configService.get<string>('REDIS_HOST', 'localhost'),
          port: this.configService.get<number>('REDIS_PORT', 6379),
          password: this.configService.get<string>('REDIS_PASSWORD'),
          db: this.configService.get<number>('REDIS_DB', 6),
        },
      },

      // Migraciones
      migrations: [__dirname + '/../migration/*{.ts,.js}'],
      migrationsRun: true,

      // Configuración de consultas
      maxQueryExecutionTime: this.configService.get<number>('DB_MAX_QUERY_TIME', 5000),

      // Retry automático
      retryAttempts: 3,
      retryDelay: 1000,
    };
  }
}