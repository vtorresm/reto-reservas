import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckService, HealthCheck, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { RedisEventService } from '@/common/services/redis-event.service';

export interface HealthCheckResponse {
  status: 'ok' | 'error' | 'shutting_down';
  info?: {
    database?: { status: string };
    redis?: { status: string };
    memory?: { status: string };
    disk?: { status: string };
  };
  error?: {
    database?: string[];
    redis?: string[];
    memory?: string[];
    disk?: string[];
  };
  details?: {
    database?: any;
    redis?: any;
    memory?: any;
    disk?: any;
  };
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly configService: ConfigService,
    private readonly redisEventService: RedisEventService,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([
      async () => this.checkDatabase(),
      async () => this.checkRedis(),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),
    ]);
  }

  @Get('detailed')
  async detailedCheck(): Promise<HealthCheckResponse> {
    const response: HealthCheckResponse = {
      status: 'ok',
      info: {},
      details: {},
    };

    try {
      // Verificar base de datos
      const dbCheck = await this.checkDatabase();
      response.info.database = { status: dbCheck.database.status };
      response.details.database = dbCheck.database;

      // Verificar Redis
      const redisCheck = await this.checkRedis();
      response.info.redis = { status: redisCheck.redis.status };
      response.details.redis = redisCheck.redis;

      // Verificar memoria
      const memoryCheck = await this.memory.checkHeap('memory_heap', 150 * 1024 * 1024);
      response.info.memory = { status: memoryCheck.memory_heap.status };
      response.details.memory = memoryCheck.memory_heap;

      // Verificar disco
      const diskCheck = await this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 });
      response.info.disk = { status: diskCheck.storage.status };
      response.details.disk = diskCheck.storage;

    } catch (error) {
      response.status = 'error';
      response.error = {
        database: [`Error checking database: ${error.message}`],
        redis: [`Error checking Redis: ${error.message}`],
        memory: [`Error checking memory: ${error.message}`],
        disk: [`Error checking disk: ${error.message}`],
      };
    }

    return response;
  }

  @Get('readiness')
  async readiness() {
    try {
      // Verificaciones críticas para readiness
      await this.checkDatabase();
      await this.checkRedis();

      return {
        status: HttpStatus.OK,
        message: 'Service is ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Service is not ready',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('liveness')
  async liveness() {
    try {
      // Verificación básica de que el servicio está vivo
      const memoryCheck = await this.memory.checkHeap('memory_heap', 500 * 1024 * 1024); // 500MB

      return {
        status: HttpStatus.OK,
        message: 'Service is alive',
        memory: memoryCheck.memory_heap,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Service is not healthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async checkDatabase() {
    try {
      // Aquí iría la lógica real de verificación de base de datos
      // Por ahora simulamos una verificación exitosa
      return {
        database: {
          status: 'up',
          responseTime: Math.random() * 100,
          connections: {
            active: 5,
            idle: 10,
            max: 20,
          },
        },
      };
    } catch (error) {
      throw new Error(`Database check failed: ${error.message}`);
    }
  }

  private async checkRedis() {
    try {
      const startTime = Date.now();
      const stats = await this.redisEventService.getStats();
      const responseTime = Date.now() - startTime;

      if (!stats || !stats.connected) {
        throw new Error('Redis connection failed');
      }

      return {
        redis: {
          status: 'up',
          responseTime,
          connected: stats.connected,
          memory: stats.memory,
        },
      };
    } catch (error) {
      throw new Error(`Redis check failed: ${error.message}`);
    }
  }
}