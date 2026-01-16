import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

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
          validateStatus: () => true,
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
   * Verifica disponibilidad de recursos en Resource Service
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
      const resourceServiceUrl = this.getServiceUrl('resource-service');
      const availabilityEndpoint = `${resourceServiceUrl}/api/v1/availability/conflicts/check`;

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
      return { available: true };
    }
  }

  /**
   * Obtiene información de recurso desde Resource Service
   */
  async getResourceInfo(resourceId: string): Promise<any> {
    try {
      const resourceServiceUrl = this.getServiceUrl('resource-service');
      const resourceEndpoint = `${resourceServiceUrl}/api/v1/resources/${resourceId}`;

      const response = await firstValueFrom(
        this.httpService.get(resourceEndpoint, {
          timeout: 3000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.warn(`Error obteniendo información del recurso: ${error.message}`);
      return null;
    }
  }

  /**
   * Notifica al Resource Service sobre una nueva reserva
   */
  async notifyResourceBooking(
    resourceId: string,
    bookingId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<boolean> {
    try {
      const resourceServiceUrl = this.getServiceUrl('resource-service');
      const bookingEndpoint = `${resourceServiceUrl}/api/v1/resources/${resourceId}/book`;

      await firstValueFrom(
        this.httpService.post(bookingEndpoint, {
          bookingId,
          date: date.toISOString().split('T')[0],
          startTime,
          endTime,
        }, {
          timeout: 5000,
        }),
      );

      return true;
    } catch (error) {
      this.logger.warn(`Error notificando reserva al servicio de recursos: ${error.message}`);
      return false;
    }
  }

  /**
   * Libera slots de recursos cuando se cancela una reserva
   */
  async releaseResourceSlots(
    resourceId: string,
    bookingId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<boolean> {
    try {
      const resourceServiceUrl = this.getServiceUrl('resource-service');
      const releaseEndpoint = `${resourceServiceUrl}/api/v1/resources/${resourceId}/release`;

      await firstValueFrom(
        this.httpService.post(releaseEndpoint, {
          bookingId,
          date: date.toISOString().split('T')[0],
          startTime,
          endTime,
        }, {
          timeout: 5000,
        }),
      );

      return true;
    } catch (error) {
      this.logger.warn(`Error liberando slots de recursos: ${error.message}`);
      return false;
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
   * Procesa reembolso
   */
  async processRefund(
    paymentId: string,
    amount: number,
    reason: string,
  ): Promise<boolean> {
    try {
      const paymentServiceUrl = this.getServiceUrl('payment-service');
      const refundEndpoint = `${paymentServiceUrl}/api/v1/payments/refund`;

      await firstValueFrom(
        this.httpService.post(refundEndpoint, {
          paymentId,
          amount,
          reason,
        }, {
          timeout: 10000,
        }),
      );

      return true;
    } catch (error) {
      this.logger.error(`Error procesando reembolso: ${error.message}`, error.stack);
      return false;
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
          serviceName: 'booking-service',
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

  // Métodos auxiliares privados

  private getServiceUrl(serviceName: string): string {
    const baseUrl = this.configService.get<string>(`${serviceName.toUpperCase()}_SERVICE_URL`);

    if (baseUrl) {
      return baseUrl;
    }

    // URLs por defecto para desarrollo
    const defaultUrls: Record<string, string> = {
      'user-service': 'http://localhost:3001',
      'resource-service': 'http://localhost:3002',
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
      const services = ['user-service', 'resource-service', 'payment-service'];
      await Promise.allSettled(services.map(service => this.checkServiceHealth(service)));
    }, 30000);

    this.logger.log('Monitoreo de salud de servicios iniciado');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Servicio de comunicación inter-servicios detenido');
  }
}