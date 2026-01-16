import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheModuleOptions, CacheOptionsFactory } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

@Injectable()
export class RedisConfigService implements CacheOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createCacheOptions(): CacheModuleOptions {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const db = this.configService.get<number>('REDIS_DB', 2);
    const ttl = this.configService.get<number>('REDIS_DEFAULT_TTL', 3600);

    return {
      store: redisStore,
      host,
      port,
      password,
      db,
      ttl, // Tiempo de vida por defecto en segundos
      max: this.configService.get<number>('REDIS_MAX_CONNECTIONS', 100),
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Redis retry time exhausted');
        }
        if (options.attempt > 10) {
          return new Error('Redis retry attempts exhausted');
        }
        // Reintentar después de un tiempo exponencial
        return Math.min(options.attempt * 100, 3000);
      },
      // Configuración adicional
      keyPrefix: 'resource-service:',
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableOfflineQueue: true,
      family: 4, // IPv4
    };
  }
}