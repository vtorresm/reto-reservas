import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resource } from '../../entities/resource.entity';

export interface InventorySnapshot {
  timestamp: Date;
  totalResources: number;
  activeResources: number;
  inactiveResources: number;
  maintenanceResources: number;
  availableResources: number;
  utilizationRate: number;
  resourcesByType: Record<string, number>;
  resourcesByLocation: Record<string, number>;
}

export interface InventoryAlert {
  type: 'low_availability' | 'maintenance_overdue' | 'utilization_high' | 'utilization_low';
  severity: 'info' | 'warning' | 'critical';
  resourceId?: string;
  message: string;
  data: Record<string, any>;
  createdAt: Date;
}

@Injectable()
export class ResourceInventoryService {
  private readonly logger = new Logger(ResourceInventoryService.name);

  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<Resource>,
  ) {}

  /**
   * Genera snapshot del inventario actual
   */
  async generateInventorySnapshot(): Promise<InventorySnapshot> {
    try {
      const resources = await this.resourceModel.find({}).exec();

      const snapshot: InventorySnapshot = {
        timestamp: new Date(),
        totalResources: resources.length,
        activeResources: resources.filter(r => r.status === 'active').length,
        inactiveResources: resources.filter(r => r.status === 'inactive').length,
        maintenanceResources: resources.filter(r => r.status === 'maintenance').length,
        availableResources: resources.filter(r => r.isAvailable).length,
        utilizationRate: 0,
        resourcesByType: {},
        resourcesByLocation: {},
      };

      // Calcular distribución por tipo
      resources.forEach(resource => {
        snapshot.resourcesByType[resource.type] =
          (snapshot.resourcesByType[resource.type] || 0) + 1;

        snapshot.resourcesByLocation[resource.location] =
          (snapshot.resourcesByLocation[resource.location] || 0) + 1;
      });

      // Calcular tasa de utilización
      if (snapshot.totalResources > 0) {
        snapshot.utilizationRate = (snapshot.availableResources / snapshot.totalResources) * 100;
      }

      return snapshot;
    } catch (error) {
      this.logger.error(`Error generando snapshot de inventario: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verifica y genera alertas de inventario
   */
  async checkInventoryAlerts(): Promise<InventoryAlert[]> {
    try {
      const alerts: InventoryAlert[] = [];
      const snapshot = await this.generateInventorySnapshot();

      // Alerta de baja disponibilidad
      if (snapshot.utilizationRate > 90) {
        alerts.push({
          type: 'low_availability',
          severity: 'critical',
          message: `Utilización del inventario al ${snapshot.utilizationRate.toFixed(1)}%`,
          data: { utilizationRate: snapshot.utilizationRate },
          createdAt: new Date(),
        });
      }

      // Alerta de recursos en mantenimiento por mucho tiempo
      const maintenanceResources = await this.resourceModel.find({
        status: 'maintenance',
      }).exec();

      const overdueMaintenance = maintenanceResources.filter(resource => {
        // Verificar si el mantenimiento excede el tiempo esperado
        return this.isMaintenanceOverdue(resource);
      });

      if (overdueMaintenance.length > 0) {
        alerts.push({
          type: 'maintenance_overdue',
          severity: 'warning',
          message: `${overdueMaintenance.length} recursos con mantenimiento vencido`,
          data: { overdueCount: overdueMaintenance.length },
          createdAt: new Date(),
        });
      }

      // Alerta de utilización baja (posible sobreoferta)
      if (snapshot.utilizationRate < 30) {
        alerts.push({
          type: 'utilization_low',
          severity: 'info',
          message: `Baja utilización del inventario: ${snapshot.utilizationRate.toFixed(1)}%`,
          data: { utilizationRate: snapshot.utilizationRate },
          createdAt: new Date(),
        });
      }

      return alerts;
    } catch (error) {
      this.logger.error(`Error verificando alertas de inventario: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene métricas de rendimiento del inventario
   */
  async getInventoryMetrics(
    timeRange: { startDate: Date; endDate: Date },
  ): Promise<{
    averageUtilization: number;
    peakUtilization: number;
    totalRevenue: number;
    bookingsCount: number;
    topPerformingResources: Array<{
      resourceId: string;
      name: string;
      utilization: number;
      revenue: number;
    }>;
  }> {
    try {
      // Obtener datos históricos (simulados por ahora)
      const historicalData = await this.getHistoricalInventoryData(timeRange);

      const averageUtilization = historicalData.reduce((sum, data) => sum + data.utilization, 0) / historicalData.length;
      const peakUtilization = Math.max(...historicalData.map(data => data.utilization));
      const totalRevenue = historicalData.reduce((sum, data) => sum + data.revenue, 0);
      const bookingsCount = historicalData.reduce((sum, data) => sum + data.bookings, 0);

      // Recursos con mejor rendimiento
      const topPerformingResources = historicalData
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(data => ({
          resourceId: data.resourceId,
          name: data.resourceName,
          utilization: data.utilization,
          revenue: data.revenue,
        }));

      return {
        averageUtilization,
        peakUtilization,
        totalRevenue,
        bookingsCount,
        topPerformingResources,
      };
    } catch (error) {
      this.logger.error(`Error obteniendo métricas de inventario: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Optimiza el inventario basado en patrones de uso
   */
  async optimizeInventory(): Promise<{
    recommendations: string[];
    suggestedChanges: Array<{
      resourceId: string;
      action: 'activate' | 'deactivate' | 'maintenance' | 'relocate';
      reason: string;
      expectedImpact: string;
    }>;
  }> {
    try {
      const snapshot = await this.generateInventorySnapshot();
      const alerts = await this.checkInventoryAlerts();
      const metrics = await this.getInventoryMetrics({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Últimos 30 días
        endDate: new Date(),
      });

      const recommendations: string[] = [];
      const suggestedChanges: any[] = [];

      // Generar recomendaciones basadas en métricas
      if (snapshot.utilizationRate > 85) {
        recommendations.push('Considere expandir el inventario - alta demanda detectada');
        recommendations.push('Implemente precios dinámicos para maximizar ingresos');
      }

      if (snapshot.utilizationRate < 40) {
        recommendations.push('Analice la posibilidad de reducir slots en horarios de baja demanda');
        recommendations.push('Considere promociones para aumentar la utilización');
      }

      // Identificar recursos subutilizados
      const underutilizedResources = await this.findUnderutilizedResources();
      underutilizedResources.forEach(resource => {
        suggestedChanges.push({
          resourceId: resource.id,
          action: 'maintenance' as const,
          reason: 'Baja utilización detectada',
          expectedImpact: 'Optimizar costos operativos',
        });
      });

      // Identificar recursos sobreutilizados
      const overutilizedResources = await this.findOverutilizedResources();
      overutilizedResources.forEach(resource => {
        suggestedChanges.push({
          resourceId: resource.id,
          action: 'activate' as const,
          reason: 'Alta demanda detectada',
          expectedImpact: 'Aumentar capacidad disponible',
        });
      });

      return {
        recommendations,
        suggestedChanges,
      };
    } catch (error) {
      this.logger.error(`Error optimizando inventario: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Genera reporte de inventario para exportación
   */
  async generateInventoryReport(
    format: 'json' | 'csv' | 'excel' = 'json',
  ): Promise<any> {
    try {
      const snapshot = await this.generateInventorySnapshot();
      const alerts = await this.checkInventoryAlerts();
      const metrics = await this.getInventoryMetrics({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      const report = {
        generatedAt: new Date(),
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        summary: snapshot,
        alerts: alerts,
        metrics: metrics,
        recommendations: await this.generateInventoryRecommendations(snapshot),
      };

      if (format === 'json') {
        return report;
      }

      // Para otros formatos, se implementaría la conversión correspondiente
      return report;
    } catch (error) {
      this.logger.error(`Error generando reporte de inventario: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Métodos auxiliares privados

  private isMaintenanceOverdue(resource: Resource): boolean {
    // Verificar si el recurso ha estado en mantenimiento por más tiempo del esperado
    // Por simplicidad, consideramos que más de 7 días es overdue
    const daysInMaintenance = resource.status === 'maintenance' ?
      Math.floor((Date.now() - resource.updatedAt.getTime()) / (24 * 60 * 60 * 1000)) : 0;

    return daysInMaintenance > 7;
  }

  private async findUnderutilizedResources(): Promise<Resource[]> {
    // Encontrar recursos con baja utilización
    // Por simplicidad, retornamos recursos que no han sido marcados como featured
    const resources = await this.resourceModel.find({
      status: 'active',
      isFeatured: false,
    }).limit(10).exec();

    return resources;
  }

  private async findOverutilizedResources(): Promise<Resource[]> {
    // Encontrar recursos con alta utilización
    // Por simplicidad, retornamos recursos marcados como featured
    const resources = await this.resourceModel.find({
      status: 'active',
      isFeatured: true,
    }).limit(10).exec();

    return resources;
  }

  private async getHistoricalInventoryData(timeRange: { startDate: Date; endDate: Date }): Promise<any[]> {
    // Obtener datos históricos de inventario
    // Por simplicidad, retornamos datos simulados
    const days = Math.ceil((timeRange.endDate.getTime() - timeRange.startDate.getTime()) / (24 * 60 * 60 * 1000));
    const historicalData = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(timeRange.startDate);
      date.setDate(date.getDate() + i);

      historicalData.push({
        date,
        utilization: 60 + Math.random() * 30, // 60-90%
        revenue: 500 + Math.random() * 1000, // $500-1500
        bookings: Math.floor(10 + Math.random() * 20), // 10-30 reservas
        resourceId: 'example-resource-id',
        resourceName: 'Example Resource',
      });
    }

    return historicalData;
  }

  private generateInventoryRecommendations(snapshot: InventorySnapshot): string[] {
    const recommendations: string[] = [];

    if (snapshot.utilizationRate > 85) {
      recommendations.push('Considere agregar más recursos - alta demanda detectada');
    }

    if (snapshot.utilizationRate < 40) {
      recommendations.push('Optimice horarios de operación para mejorar utilización');
    }

    if (snapshot.maintenanceResources > snapshot.totalResources * 0.1) {
      recommendations.push('Revise procesos de mantenimiento - alto número de recursos en mantenimiento');
    }

    recommendations.push('Implemente monitoreo continuo de utilización de recursos');
    recommendations.push('Considere implementar precios dinámicos basados en demanda');

    return recommendations;
  }
}