import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RedisEventService } from './redis-event.service';

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number;
  lastChecked: Date;
}

@Injectable()
export class InterserviceCommunicationService implements OnModuleDestroy {
  private readonly logger = new Logger(InterserviceCommunicationService.name);
  private serviceHealthCache: Map<string, ServiceHealth> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly redisEventService: RedisEventService,
  ) {
    this.startHealthMonitoring();
  }

  /**
   * Verifica la salud de un servicio específico
   */
  async checkServiceHealth(serviceName: string): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      const serviceUrl = this.getServiceUrl(serviceName);
      const healthEndpoint = `${serviceUrl}/health`;

      const response = await firstValueFrom(
        this.httpService.get(healthEndpoint, {
          timeout: 5000,
          validateStatus: () => true, // No validar status para detectar errores
        }),
      );

      const responseTime = Date.now() - startTime;
      const isHealthy = response.status >= 200 && response.status < 300;

      const health: ServiceHealth = {
        service: serviceName,
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime,
        lastChecked: new Date(),
      };

      this.serviceHealthCache.set(serviceName, health);
      return health;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      const health: ServiceHealth = {
        service: serviceName,
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date(),
      };

      this.serviceHealthCache.set(serviceName, health);
      this.logger.warn(`Servicio ${serviceName} no responde: ${error.message}`);
      return health;
    }
  }

  /**
   * Obtiene el estado de salud de todos los servicios conocidos
   */
  async getAllServicesHealth(): Promise<Map<string, ServiceHealth>> {
    const services = [
      'user-service',
      'booking-service',
      'payment-service',
      'notification-service',
      'config-service',
      'audit-service',
    ];

    const healthPromises = services.map(service => this.checkServiceHealth(service));
    await Promise.allSettled(healthPromises);

    return this.serviceHealthCache;
  }

  /**
   * Notifica a otros servicios sobre cambios en recursos
   */
  async notifyResourceChange(
    eventType: 'RESOURCE_CREATED' | 'RESOURCE_UPDATED' | 'RESOURCE_DELETED',
    resourceData: any,
  ): Promise<void> {
    try {
      await this.redisEventService.publishEvent({
        eventType,
        data: resourceData,
        correlationId: `resource-${resourceData.id || resourceData._id}`,
      });

      this.logger.log(`Notificación enviada: ${eventType} para recurso ${resourceData.id}`);
    } catch (error) {
      this.logger.error(`Error notificando cambio de recurso: ${error.message}`, error.stack);
    }
  }

  /**
   * Consulta disponibilidad de recursos en Booking Service
   */
  async checkResourceAvailability(
    resourceId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<{
    available: boolean;
    conflicts?: any[];
    suggestions?: string[];
  }> {
    try {
      const bookingServiceUrl = this.getServiceUrl('booking-service');
      const availabilityEndpoint = `${bookingServiceUrl}/api/v1/bookings/availability/check`;

      const response = await firstValueFrom(
        this.httpService.get(availabilityEndpoint, {
          params: {
            resourceId,
            date: date.toISOString().split('T')[0],
            startTime,
            endTime,
          },
          timeout: 3000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.warn(`Error consultando disponibilidad: ${error.message}`);
      // En caso de error, asumir que está disponible
      return { available: true };
    }
  }

  /**
   * Obtiene información de usuario desde User Service
   */
  async getUserInfo(userId: string): Promise<any> {
    try {
      const userServiceUrl = this.getServiceUrl('user-service');
      const userEndpoint = `${userServiceUrl}/api/v1/users/${userId}`;

      const response = await firstValueFrom(
        this.httpService.get(userEndpoint, {
          timeout: 3000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.warn(`Error obteniendo información de usuario: ${error.message}`);
      return null;
    }
  }

  /**
   * Procesa pago para una reserva
   */
  async processBookingPayment(
    bookingData: {
      userId: string;
      resourceId: string;
      amount: number;
      currency: string;
      description: string;
    },
  ): Promise<{
    success: boolean;
    paymentId?: string;
    error?: string;
  }> {
    try {
      const paymentServiceUrl = this.getServiceUrl('payment-service');
      const paymentEndpoint = `${paymentServiceUrl}/api/v1/payments/process`;

      const response = await firstValueFrom(
        this.httpService.post(paymentEndpoint, bookingData, {
          timeout: 10000,
        }),
      );

      return {
        success: true,
        paymentId: response.data.id,
      };
    } catch (error) {
      this.logger.error(`Error procesando pago: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envía notificación sobre una reserva
   */
  async sendBookingNotification(
    userId: string,
    notificationData: {
      type: 'booking_confirmed' | 'booking_cancelled' | 'booking_reminder';
      title: string;
      content: string;
      bookingId: string;
      resourceName: string;
    },
  ): Promise<boolean> {
    try {
      const notificationServiceUrl = this.getServiceUrl('notification-service');
      const notificationEndpoint = `${notificationServiceUrl}/api/v1/notifications/send`;

      await firstValueFrom(
        this.httpService.post(notificationEndpoint, {
          userId,
          ...notificationData,
        }, {
          timeout: 5000,
        }),
      );

      return true;
    } catch (error) {
      this.logger.warn(`Error enviando notificación: ${error.message}`);
      return false;
    }
  }

  /**
   * Registra evento de auditoría
   */
  async logAuditEvent(
    eventData: {
      userId?: string;
      action: string;
      resourceType: string;
      resourceId: string;
      description: string;
      metadata?: any;
    },
  ): Promise<void> {
    try {
      const auditServiceUrl = this.getServiceUrl('audit-service');
      const auditEndpoint = `${auditServiceUrl}/api/v1/audit/logs`;

      await firstValueFrom(
        this.httpService.post(auditEndpoint, {
          serviceName: 'resource-service',
          ...eventData,
        }, {
          timeout: 3000,
        }),
      );
    } catch (error) {
      this.logger.warn(`Error registrando evento de auditoría: ${error.message}`);
    }
  }

  /**
   * Obtiene configuración desde Config Service
   */
  async getConfiguration(key: string, defaultValue?: any): Promise<any> {
    try {
      const configServiceUrl = this.getServiceUrl('config-service');
      const configEndpoint = `${configServiceUrl}/api/v1/config/${key}`;

      const response = await firstValueFrom(
        this.httpService.get(configEndpoint, {
          timeout: 3000,
        }),
      );

      return response.data.value;
    } catch (error) {
      this.logger.warn(`Error obteniendo configuración: ${error.message}`);
      return defaultValue;
    }
  }

  /**
   * Verifica si un feature flag está habilitado
   */
  async isFeatureEnabled(
    featureName: string,
    userId?: string,
    serviceName?: string,
  ): Promise<boolean> {
    try {
      const configServiceUrl = this.getServiceUrl('config-service');
      const featureEndpoint = `${configServiceUrl}/api/v1/features/${featureName}/evaluate`;

      const response = await firstValueFrom(
        this.httpService.post(featureEndpoint, {
          userId,
          serviceName,
        }, {
          timeout: 3000,
        }),
      );

      return response.data.enabled;
    } catch (error) {
      this.logger.warn(`Error verificando feature flag: ${error.message}`);
      return false;
    }
  }

  // Métodos auxiliares privados

  private getServiceUrl(serviceName: string): string {
    const baseUrl = this.configService.get<string>(`${serviceName.toUpperCase()}_SERVICE_URL`);

    if (baseUrl) {
      return baseUrl;
    }

    // URLs por defecto para desarrollo
    const defaultUrls: Record<string, string> = {
      'user-service': 'http://localhost:3001',
      'booking-service': 'http://localhost:3003',
      'payment-service': 'http://localhost:3004',
      'notification-service': 'http://localhost:3005',
      'config-service': 'http://localhost:3006',
      'audit-service': 'http://localhost:3007',
    };

    return defaultUrls[serviceName] || `http://localhost:3000`;
  }

  private startHealthMonitoring(): void {
    // Verificar salud de servicios cada 30 segundos
    setInterval(async () => {
      const services = ['user-service', 'booking-service', 'payment-service'];
      await Promise.allSettled(services.map(service => this.checkServiceHealth(service)));
    }, 30000);

    this.logger.log('Monitoreo de salud de servicios iniciado');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Servicio de comunicación inter-servicios detenido');
  }
}