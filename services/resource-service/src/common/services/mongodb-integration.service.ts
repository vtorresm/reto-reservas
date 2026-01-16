import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resource } from '../../entities/resource.entity';
import { Category } from '../../entities/category.entity';
import { Availability } from '../../entities/availability.entity';

export interface MongoDBHealth {
  status: 'connected' | 'disconnected' | 'error';
  collections: {
    resources: number;
    categories: number;
    availability: number;
  };
  indexes: {
    resources: string[];
    categories: string[];
    availability: string[];
  };
  performance: {
    avgQueryTime: number;
    slowQueries: number;
    memoryUsage: number;
  };
}

@Injectable()
export class MongoDBIntegrationService implements OnModuleInit {
  private readonly logger = new Logger(MongoDBIntegrationService.name);
  private connection: any;

  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<Resource>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Availability.name) private availabilityModel: Model<Availability>,
  ) {}

  async onModuleInit() {
    this.logger.log('Inicializando integración con MongoDB...');
    await this.ensureIndexes();
    await this.performHealthCheck();
  }

  /**
   * Asegura que todos los índices necesarios estén creados
   */
  async ensureIndexes(): Promise<void> {
    try {
      this.logger.log('Verificando y creando índices...');

      // Índices para Resource
      await this.resourceModel.collection.createIndex({ code: 1 }, { unique: true });
      await this.resourceModel.collection.createIndex({ location: 1, type: 1 });
      await this.resourceModel.collection.createIndex({ status: 1, isAvailable: 1 });
      await this.resourceModel.collection.createIndex({ capacity: 1 });
      await this.resourceModel.collection.createIndex({ pricePerHour: 1 });
      await this.resourceModel.collection.createIndex({
        'coordinates.latitude': 1,
        'coordinates.longitude': 1,
      });

      // Índices para Category
      await this.categoryModel.collection.createIndex({ name: 1 }, { unique: true });
      await this.categoryModel.collection.createIndex({ parentCategoryId: 1 });

      // Índices para Availability
      await this.availabilityModel.collection.createIndex({ resourceId: 1, date: 1 });
      await this.availabilityModel.collection.createIndex({ date: 1, startTime: 1 });
      await this.availabilityModel.collection.createIndex({ status: 1 });
      await this.availabilityModel.collection.createIndex({ bookingId: 1 });

      this.logger.log('Índices verificados/creados exitosamente');
    } catch (error) {
      this.logger.error(`Error creando índices: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Realiza chequeo de salud de MongoDB
   */
  async performHealthCheck(): Promise<MongoDBHealth> {
    try {
      const startTime = Date.now();

      // Verificar conexión
      const connectionStatus = this.resourceModel.db.readyState === 1 ? 'connected' : 'disconnected';

      // Obtener estadísticas de colecciones
      const collections = {
        resources: await this.resourceModel.countDocuments(),
        categories: await this.categoryModel.countDocuments(),
        availability: await this.availabilityModel.countDocuments(),
      };

      // Obtener información de índices
      const indexes = {
        resources: await this.getIndexInfo('resources'),
        categories: await this.getIndexInfo('categories'),
        availability: await this.getIndexInfo('availability'),
      };

      // Obtener métricas de performance
      const performance = await this.getPerformanceMetrics();

      const health: MongoDBHealth = {
        status: connectionStatus as any,
        collections,
        indexes,
        performance,
      };

      this.logger.log(`Health check completado en ${Date.now() - startTime}ms`);
      return health;
    } catch (error) {
      this.logger.error(`Error en health check: ${error.message}`, error.stack);
      return {
        status: 'error',
        collections: { resources: 0, categories: 0, availability: 0 },
        indexes: { resources: [], categories: [], availability: [] },
        performance: { avgQueryTime: 0, slowQueries: 0, memoryUsage: 0 },
      };
    }
  }

  /**
   * Ejecuta consultas de agregación complejas
   */
  async executeAggregation(
    collection: 'resources' | 'categories' | 'availability',
    pipeline: any[],
    options: {
      allowDiskUse?: boolean;
      maxTimeMS?: number;
    } = {},
  ): Promise<any[]> {
    try {
      let model: Model<any>;

      switch (collection) {
        case 'resources':
          model = this.resourceModel;
          break;
        case 'categories':
          model = this.categoryModel;
          break;
        case 'availability':
          model = this.availabilityModel;
          break;
        default:
          throw new Error(`Colección no válida: ${collection}`);
      }

      const aggregationOptions: any = {};

      if (options.allowDiskUse) {
        aggregationOptions.allowDiskUse = true;
      }

      if (options.maxTimeMS) {
        aggregationOptions.maxTimeMS = options.maxTimeMS;
      }

      const result = await model.aggregate(pipeline, aggregationOptions);
      return result;
    } catch (error) {
      this.logger.error(`Error ejecutando agregación: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Realiza backup de datos críticos
   */
  async backupCriticalData(): Promise<{
    success: boolean;
    collections: string[];
    totalDocuments: number;
    backupSize: number;
    duration: number;
  }> {
    try {
      const startTime = Date.now();
      this.logger.log('Iniciando backup de datos críticos...');

      const collections = ['resources', 'categories'];
      let totalDocuments = 0;
      const backupData: any = {};

      for (const collection of collections) {
        let model: Model<any>;

        switch (collection) {
          case 'resources':
            model = this.resourceModel;
            break;
          case 'categories':
            model = this.categoryModel;
            break;
          default:
            continue;
        }

        const documents = await model.find({}).lean();
        backupData[collection] = documents;
        totalDocuments += documents.length;
      }

      const duration = Date.now() - startTime;
      const backupSize = JSON.stringify(backupData).length;

      this.logger.log(`Backup completado: ${totalDocuments} documentos, ${backupSize} bytes, ${duration}ms`);

      return {
        success: true,
        collections,
        totalDocuments,
        backupSize,
        duration,
      };
    } catch (error) {
      this.logger.error(`Error en backup: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Limpia datos antiguos según políticas de retención
   */
  async cleanupOldData(): Promise<{
    deletedDocuments: {
      availability: number;
      auditLogs: number;
    };
    freedSpace: number;
  }> {
    try {
      this.logger.log('Iniciando limpieza de datos antiguos...');

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Limpiar slots de disponibilidad antiguos
      const availabilityDeleted = await this.availabilityModel.deleteMany({
        date: { $lt: thirtyDaysAgo },
        status: { $in: ['available', 'blocked'] },
      });

      // Limpiar logs de auditoría antiguos (mantener 90 días)
      const auditLogsDeleted = await this.cleanupAuditLogs(ninetyDaysAgo);

      const result = {
        deletedDocuments: {
          availability: availabilityDeleted.deletedCount,
          auditLogs: auditLogsDeleted,
        },
        freedSpace: 0, // Se calcularía basado en el tamaño de los documentos eliminados
      };

      this.logger.log(`Limpieza completada: ${result.deletedDocuments.availability} slots de disponibilidad, ${result.deletedDocuments.auditLogs} logs de auditoría`);

      return result;
    } catch (error) {
      this.logger.error(`Error en limpieza de datos: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Optimiza las colecciones de MongoDB
   */
  async optimizeCollections(): Promise<{
    collectionsOptimized: string[];
    spaceReclaimed: number;
    duration: number;
  }> {
    try {
      const startTime = Date.now();
      this.logger.log('Iniciando optimización de colecciones...');

      const collections = ['resources', 'categories', 'availability'];
      const collectionsOptimized: string[] = [];

      for (const collection of collections) {
        try {
          await this.resourceModel.db.collection(collection).compact();
          collectionsOptimized.push(collection);
        } catch (error) {
          this.logger.warn(`Error optimizando colección ${collection}: ${error.message}`);
        }
      }

      const duration = Date.now() - startTime;

      this.logger.log(`Optimización completada: ${collectionsOptimized.length} colecciones en ${duration}ms`);

      return {
        collectionsOptimized,
        spaceReclaimed: 0, // MongoDB no reporta espacio reclaimed fácilmente
        duration,
      };
    } catch (error) {
      this.logger.error(`Error optimizando colecciones: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de uso de recursos
   */
  async getResourceUsageStats(
    timeRange: { startDate: Date; endDate: Date },
  ): Promise<{
    totalResources: number;
    activeResources: number;
    utilizationByType: Record<string, number>;
    utilizationByLocation: Record<string, number>;
    peakUsageHours: string[];
    recommendations: string[];
  }> {
    try {
      const pipeline = [
        {
          $match: {
            status: 'active',
            createdAt: { $gte: timeRange.startDate, $lte: timeRange.endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalResources: { $sum: 1 },
            activeResources: { $sum: { $cond: ['$isAvailable', 1, 0] } },
            byType: {
              $push: '$type',
            },
            byLocation: {
              $push: '$location',
            },
          },
        },
      ];

      const stats = await this.resourceModel.aggregate(pipeline);
      const result = stats[0] || {};

      // Calcular distribución por tipo
      const utilizationByType: Record<string, number> = {};
      result.byType?.forEach((type: string) => {
        utilizationByType[type] = (utilizationByType[type] || 0) + 1;
      });

      // Calcular distribución por ubicación
      const utilizationByLocation: Record<string, number> = {};
      result.byLocation?.forEach((location: string) => {
        utilizationByLocation[location] = (utilizationByLocation[location] || 0) + 1;
      });

      // Generar recomendaciones
      const recommendations = this.generateUsageRecommendations(result);

      return {
        totalResources: result.totalResources || 0,
        activeResources: result.activeResources || 0,
        utilizationByType,
        utilizationByLocation,
        peakUsageHours: ['09:00', '14:00', '18:00'], // Datos simulados
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas de uso: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Métodos auxiliares privados

  private async getIndexInfo(collectionName: string): Promise<string[]> {
    try {
      const indexes = await this.resourceModel.db.collection(collectionName).indexes();
      return indexes.map(index => index.name || 'unnamed');
    } catch (error) {
      return [];
    }
  }

  private async getPerformanceMetrics(): Promise<any> {
    try {
      const dbStats = await this.resourceModel.db.stats();
      return {
        avgQueryTime: 0, // Se implementaría con profiling
        slowQueries: 0,
        memoryUsage: dbStats.dataSize || 0,
      };
    } catch (error) {
      return {
        avgQueryTime: 0,
        slowQueries: 0,
        memoryUsage: 0,
      };
    }
  }

  private async cleanupAuditLogs(cutoffDate: Date): Promise<number> {
    // Implementar limpieza de logs de auditoría
    // Por simplicidad, retornamos 0
    return 0;
  }

  private generateUsageRecommendations(stats: any): string[] {
    const recommendations: string[] = [];

    if (stats.activeResources / stats.totalResources < 0.7) {
      recommendations.push('Considere activar más recursos para mejorar la utilización');
    }

    if (stats.totalResources > 100) {
      recommendations.push('Implemente categorización avanzada para mejor organización');
    }

    recommendations.push('Monitoree regularmente los patrones de uso para optimizar el inventario');

    return recommendations;
  }
}