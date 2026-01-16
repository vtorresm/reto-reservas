import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

export interface EventData {
  eventType: string;
  eventId: string;
  timestamp: Date;
  source: string;
  data: Record<string, any>;
  correlationId?: string;
  userId?: string;
}

@Injectable()
export class RedisEventService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisEventService.name);
  private readonly redis: Redis;
  private readonly eventStreamKey: string;
  private readonly eventChannel: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const db = this.configService.get<number>('USER_SERVICE_REDIS_DB', 1);

    this.redis = new Redis({
      host,
      port,
      password,
      db,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.eventStreamKey = this.configService.get<string>('REDIS_EVENTS_STREAM', 'coworking-events-stream');
    this.eventChannel = this.configService.get<string>('REDIS_EVENTS_CHANNEL', 'coworking-events');

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.redis.on('connect', () => {
      this.logger.log('✅ Conectado a Redis para eventos');
    });

    this.redis.on('error', (error) => {
      this.logger.error('❌ Error en conexión Redis:', error);
    });

    this.redis.on('close', () => {
      this.logger.warn('⚠️ Conexión Redis cerrada');
    });
  }

  /**
   * Publica un evento en el stream de Redis
   */
  async publishEvent(eventData: Omit<EventData, 'eventId' | 'timestamp' | 'source'>): Promise<string> {
    const event: EventData = {
      ...eventData,
      eventId: this.generateEventId(),
      timestamp: new Date(),
      source: 'user-service',
    };

    try {
      // Agregar evento al stream
      const streamId = await this.redis.xadd(
        this.eventStreamKey,
        '*',
        'eventType', event.eventType,
        'eventId', event.eventId,
        'timestamp', event.timestamp.toISOString(),
        'source', event.source,
        'data', JSON.stringify(event.data),
        'correlationId', event.correlationId || '',
        'userId', event.userId || '',
      );

      // Publicar también en el canal de pub/sub para notificaciones inmediatas
      await this.redis.publish(this.eventChannel, JSON.stringify(event));

      this.logger.log(`📤 Evento publicado: ${event.eventType} (${event.eventId})`);

      return event.eventId;
    } catch (error) {
      this.logger.error('❌ Error publicando evento:', error);
      throw error;
    }
  }

  /**
   * Se suscribe a eventos específicos
   */
  async subscribeToEvents(
    eventTypes: string[],
    callback: (event: EventData) => Promise<void>,
  ): Promise<void> {
    try {
      const subscriber = new Redis({
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        db: this.configService.get<number>('USER_SERVICE_REDIS_DB', 1),
      });

      await subscriber.subscribe(this.eventChannel);

      subscriber.on('message', async (channel, message) => {
        if (channel === this.eventChannel) {
          try {
            const event: EventData = JSON.parse(message);

            if (eventTypes.includes(event.eventType)) {
              await callback(event);
            }
          } catch (error) {
            this.logger.error('❌ Error procesando evento recibido:', error);
          }
        }
      });

      this.logger.log(`📥 Suscrito a eventos: ${eventTypes.join(', ')}`);
    } catch (error) {
      this.logger.error('❌ Error suscribiéndose a eventos:', error);
      throw error;
    }
  }

  /**
   * Obtiene eventos desde el stream
   */
  async getEvents(
    startId: string = '-',
    endId: string = '+',
    count: number = 100,
  ): Promise<EventData[]> {
    try {
      const results = await this.redis.xrange(this.eventStreamKey, startId, endId, 'COUNT', count);

      return results.map(([id, fields]) => ({
        eventId: fields[1],
        eventType: fields[3],
        timestamp: new Date(fields[5]),
        source: fields[7],
        data: JSON.parse(fields[9]),
        correlationId: fields[11] || undefined,
        userId: fields[13] || undefined,
      }));
    } catch (error) {
      this.logger.error('❌ Error obteniendo eventos:', error);
      throw error;
    }
  }

  /**
   * Publica evento de usuario creado
   */
  async publishUserCreated(userId: string, userData: any): Promise<string> {
    return this.publishEvent({
      eventType: 'USER_CREATED',
      data: {
        userId,
        email: userData.email,
        role: userData.role,
        createdAt: new Date(),
      },
      userId,
    });
  }

  /**
   * Publica evento de usuario actualizado
   */
  async publishUserUpdated(userId: string, changes: any): Promise<string> {
    return this.publishEvent({
      eventType: 'USER_UPDATED',
      data: {
        userId,
        changes,
        updatedAt: new Date(),
      },
      userId,
    });
  }

  /**
   * Publica evento de login de usuario
   */
  async publishUserLoggedIn(userId: string, loginData: any): Promise<string> {
    return this.publishEvent({
      eventType: 'USER_LOGGED_IN',
      data: {
        userId,
        loginMethod: loginData.method,
        ipAddress: loginData.ipAddress,
        userAgent: loginData.userAgent,
        loggedInAt: new Date(),
      },
      userId,
    });
  }

  /**
   * Publica evento de logout de usuario
   */
  async publishUserLoggedOut(userId: string, sessionId: string): Promise<string> {
    return this.publishEvent({
      eventType: 'USER_LOGGED_OUT',
      data: {
        userId,
        sessionId,
        loggedOutAt: new Date(),
      },
      userId,
    });
  }

  /**
   * Almacena datos en caché
   */
  async setCache(key: string, data: any, ttl: number = 3600): Promise<void> {
    try {
      const cacheKey = `user-service:cache:${key}`;
      await this.redis.setex(cacheKey, ttl, JSON.stringify(data));
      this.logger.debug(`💾 Datos en caché: ${cacheKey}`);
    } catch (error) {
      this.logger.error('❌ Error guardando en caché:', error);
    }
  }

  /**
   * Obtiene datos del caché
   */
  async getCache(key: string): Promise<any | null> {
    try {
      const cacheKey = `user-service:cache:${key}`;
      const data = await this.redis.get(cacheKey);

      if (data) {
        this.logger.debug(`📖 Datos obtenidos del caché: ${cacheKey}`);
        return JSON.parse(data);
      }

      return null;
    } catch (error) {
      this.logger.error('❌ Error obteniendo del caché:', error);
      return null;
    }
  }

  /**
   * Elimina datos del caché
   */
  async deleteCache(key: string): Promise<void> {
    try {
      const cacheKey = `user-service:cache:${key}`;
      await this.redis.del(cacheKey);
      this.logger.debug(`🗑️ Datos eliminados del caché: ${cacheKey}`);
    } catch (error) {
      this.logger.error('❌ Error eliminando del caché:', error);
    }
  }

  /**
   * Genera un ID único para el evento
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Limpia el módulo
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.log('🔌 Conexión Redis cerrada');
    } catch (error) {
      this.logger.error('❌ Error cerrando conexión Redis:', error);
    }
  }

  /**
   * Obtiene estadísticas de Redis
   */
  async getStats(): Promise<any> {
    try {
      const info = await this.redis.info();
      const memory = await this.redis.info('memory');

      return {
        connected: this.redis.status === 'ready',
        info: this.parseRedisInfo(info),
        memory: this.parseRedisInfo(memory),
      };
    } catch (error) {
      this.logger.error('❌ Error obteniendo estadísticas de Redis:', error);
      return null;
    }
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const lines = info.split('\r\n');
    const result: Record<string, string> = {};

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    }

    return result;
  }
}