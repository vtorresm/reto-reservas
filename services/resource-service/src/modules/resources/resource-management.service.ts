import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resource } from '../../entities/resource.entity';
import { Availability } from '../../entities/availability.entity';
import { AvailabilityOptimizerService } from '../availability/availability-optimizer.service';
import { ResourceSearchService } from './resource-search.service';
import { ResourceInventoryService } from './resource-inventory.service';
import { InterserviceCommunicationService } from '../../common/services/interservice-communication.service';

export interface ResourceCreationData {
  name: string;
  description: string;
  type: string;
  location: string;
  capacity: number;
  pricePerHour: number;
  amenities?: Record<string, boolean>;
  equipment?: Record<string, any>;
  availabilitySchedule?: any;
  categoryId?: string;
}

@Injectable()
export class ResourceManagementService {
  private readonly logger = new Logger(ResourceManagementService.name);

  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<Resource>,
    @InjectModel(Availability.name) private availabilityModel: Model<Availability>,
    private readonly availabilityOptimizer: AvailabilityOptimizerService,
    private readonly searchService: ResourceSearchService,
    private readonly inventoryService: ResourceInventoryService,
    private readonly interserviceCommunication: InterserviceCommunicationService,
  ) {}

  /**
   * Crea un nuevo recurso con su disponibilidad inicial
   */
  async createResourceWithAvailability(
    resourceData: ResourceCreationData,
    createdBy?: string,
  ): Promise<{ resource: Resource; availability: Availability[] }> {
    try {
      this.logger.log(`Creando recurso con disponibilidad: ${resourceData.name}`);

      // Crear el recurso
      const resource = new this.resourceModel({
        ...resourceData,
        status: 'active',
        isAvailable: true,
        createdBy,
      });

      const savedResource = await resource.save();

      // Generar disponibilidad inicial
      const availability = await this.generateInitialAvailability(savedResource.id.toString());

      // Notificar a otros servicios
      await this.interserviceCommunication.notifyResourceChange('RESOURCE_CREATED', savedResource);

      this.logger.log(`Recurso creado exitosamente: ${savedResource.id} con ${availability.length} slots de disponibilidad`);

      return {
        resource: savedResource,
        availability,
      };
    } catch (error) {
      this.logger.error(`Error creando recurso con disponibilidad: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Actualiza un recurso y regenera su disponibilidad si es necesario
   */
  async updateResourceWithAvailability(
    resourceId: string,
    updateData: Partial<ResourceCreationData>,
    updatedBy?: string,
  ): Promise<{ resource: Resource; availability: Availability[] }> {
    try {
      this.logger.log(`Actualizando recurso con disponibilidad: ${resourceId}`);

      const resource = await this.resourceModel.findById(resourceId);
      if (!resource) {
        throw new NotFoundException(`Recurso no encontrado: ${resourceId}`);
      }

      // Verificar si los cambios afectan la disponibilidad
      const availabilityAffected = this.checkIfAvailabilityAffected(resource, updateData);

      // Actualizar recurso
      Object.assign(resource, updateData, { updatedBy });
      const updatedResource = await resource.save();

      let availability: Availability[] = [];

      if (availabilityAffected) {
        // Regenerar disponibilidad
        await this.availabilityModel.deleteMany({ resourceId });
        availability = await this.generateInitialAvailability(resourceId);
      } else {
        // Mantener disponibilidad existente
        availability = await this.availabilityModel.find({ resourceId });
      }

      // Notificar cambios
      await this.interserviceCommunication.notifyResourceChange('RESOURCE_UPDATED', updatedResource);

      this.logger.log(`Recurso actualizado exitosamente: ${resourceId}`);

      return {
        resource: updatedResource,
        availability,
      };
    } catch (error) {
      this.logger.error(`Error actualizando recurso: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene recursos con su disponibilidad actual
   */
  async getResourcesWithAvailability(
    criteria: any = {},
  ): Promise<Array<Resource & { availability: Availability[] }>> {
    try {
      const resources = await this.resourceModel.find({
        status: 'active',
        ...criteria,
      });

      const resourcesWithAvailability = await Promise.all(
        resources.map(async (resource) => {
          const availability = await this.availabilityModel.find({
            resourceId: resource.id,
            date: { $gte: new Date() },
          }).limit(10);

          return {
            ...resource.toObject(),
            availability,
          };
        }),
      );

      return resourcesWithAvailability;
    } catch (error) {
      this.logger.error(`Error obteniendo recursos con disponibilidad: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Encuentra recursos alternativos cuando uno no está disponible
   */
  async findAlternativeResources(
    originalResourceId: string,
    date: Date,
    startTime: string,
    endTime: string,
    criteria: {
      sameType?: boolean;
      sameLocation?: boolean;
      similarCapacity?: boolean;
      maxPriceDifference?: number;
    } = {},
  ): Promise<Resource[]> {
    try {
      const originalResource = await this.resourceModel.findById(originalResourceId);
      if (!originalResource) {
        throw new NotFoundException(`Recurso original no encontrado: ${originalResourceId}`);
      }

      const searchCriteria: any = {};

      if (criteria.sameType) {
        searchCriteria.type = originalResource.type;
      }

      if (criteria.sameLocation) {
        searchCriteria.location = originalResource.location;
      }

      if (criteria.similarCapacity) {
        const capacity = originalResource.capacity;
        searchCriteria.capacity = {
          $gte: Math.max(1, capacity - 2),
          $lte: capacity + 2,
        };
      }

      if (criteria.maxPriceDifference) {
        const basePrice = originalResource.pricePerHour;
        searchCriteria.pricePerHour = {
          $gte: basePrice - criteria.maxPriceDifference,
          $lte: basePrice + criteria.maxPriceDifference,
        };
      }

      const alternativeResources = await this.resourceModel.find({
        ...searchCriteria,
        _id: { $ne: originalResourceId },
        status: 'active',
        isAvailable: true,
      }).limit(5);

      return alternativeResources;
    } catch (error) {
      this.logger.error(`Error buscando recursos alternativos: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Gestiona el ciclo de vida completo de un recurso
   */
  async manageResourceLifecycle(
    resourceId: string,
    action: 'activate' | 'deactivate' | 'maintenance' | 'retire',
    reason?: string,
    performedBy?: string,
  ): Promise<Resource> {
    try {
      const resource = await this.resourceModel.findById(resourceId);
      if (!resource) {
        throw new NotFoundException(`Recurso no encontrado: ${resourceId}`);
      }

      const oldStatus = resource.status;
      const oldAvailability = resource.isAvailable;

      switch (action) {
        case 'activate':
          resource.status = 'active';
          resource.isAvailable = true;
          break;
        case 'deactivate':
          resource.status = 'inactive';
          resource.isAvailable = false;
          break;
        case 'maintenance':
          resource.status = 'maintenance';
          resource.isAvailable = false;
          break;
        case 'retire':
          resource.status = 'inactive';
          resource.isAvailable = false;
          break;
      }

      resource.updatedBy = performedBy;
      const updatedResource = await resource.save();

      // Registrar en auditoría
      await this.interserviceCommunication.logAuditEvent({
        userId: performedBy,
        action: `RESOURCE_${action.toUpperCase()}`,
        resourceType: 'resource',
        resourceId,
        description: `Recurso ${action}: ${reason || 'Sin razón especificada'}`,
        metadata: {
          oldStatus,
          newStatus: resource.status,
          oldAvailability: oldAvailability,
          newAvailability: resource.isAvailable,
        },
      });

      // Notificar cambios
      await this.interserviceCommunication.notifyResourceChange('RESOURCE_UPDATED', updatedResource);

      this.logger.log(`Ciclo de vida actualizado para recurso ${resourceId}: ${oldStatus} -> ${resource.status}`);

      return updatedResource;
    } catch (error) {
      this.logger.error(`Error gestionando ciclo de vida del recurso: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Genera reporte de utilización de recursos
   */
  async generateUtilizationReport(
    resourceId?: string,
    timeRange?: { startDate: Date; endDate: Date },
  ): Promise<any> {
    try {
      const range = timeRange || {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Últimos 30 días
        endDate: new Date(),
      };

      if (resourceId) {
        // Reporte para un recurso específico
        return await this.generateSingleResourceReport(resourceId, range);
      } else {
        // Reporte general de todos los recursos
        return await this.generateGlobalResourceReport(range);
      }
    } catch (error) {
      this.logger.error(`Error generando reporte de utilización: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Métodos auxiliares privados

  private async generateInitialAvailability(resourceId: string): Promise<Availability[]> {
    try {
      const resource = await this.resourceModel.findById(resourceId);

      // Generar slots para los próximos 30 días
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const optimizationResult = await this.availabilityOptimizer.optimizeResourceAvailability(
        resourceId,
        startDate,
        endDate,
        {
          analyzeUsage: false,
          consolidateSlots: true,
          predictDemand: false,
          maxSlotsPerDay: 12,
        },
      );

      // Crear slots de disponibilidad basados en el resultado de optimización
      const availabilitySlots = await this.availabilityOptimizer.generateOptimalSlots(
        resourceId,
        startDate,
        endDate,
        {
          slotDuration: 60,
          breakDuration: 15,
          maxSlotsPerDay: 12,
        },
      );

      return availabilitySlots;
    } catch (error) {
      this.logger.error(`Error generando disponibilidad inicial: ${error.message}`, error.stack);
      throw error;
    }
  }

  private checkIfAvailabilityAffected(
    resource: Resource,
    updateData: Partial<ResourceCreationData>,
  ): boolean {
    // Verificar si los cambios afectan la generación de disponibilidad
    const affectedFields = [
      'type',
      'capacity',
      'availabilitySchedule',
      'location',
      'pricePerHour',
    ];

    return affectedFields.some(field => updateData.hasOwnProperty(field));
  }

  private async generateSingleResourceReport(
    resourceId: string,
    timeRange: { startDate: Date; endDate: Date },
  ): Promise<any> {
    const resource = await this.resourceModel.findById(resourceId);
    const availability = await this.availabilityModel.find({
      resourceId,
      date: { $gte: timeRange.startDate, $lte: timeRange.endDate },
    });

    const totalSlots = availability.length;
    const availableSlots = availability.filter(slot => slot.status === 'available').length;
    const busySlots = availability.filter(slot => slot.status === 'busy').length;
    const blockedSlots = availability.filter(slot => slot.status === 'blocked').length;

    return {
      resourceId,
      resourceName: resource?.name,
      period: timeRange,
      summary: {
        totalSlots,
        availableSlots,
        busySlots,
        blockedSlots,
        utilizationRate: totalSlots > 0 ? (busySlots / totalSlots) * 100 : 0,
      },
      details: {
        availability,
      },
    };
  }

  private async generateGlobalResourceReport(
    timeRange: { startDate: Date; endDate: Date },
  ): Promise<any> {
    const resources = await this.resourceModel.find({ status: 'active' });
    const availability = await this.availabilityModel.find({
      date: { $gte: timeRange.startDate, $lte: timeRange.endDate },
    });

    const totalSlots = availability.length;
    const availableSlots = availability.filter(slot => slot.status === 'available').length;
    const busySlots = availability.filter(slot => slot.status === 'busy').length;
    const blockedSlots = availability.filter(slot => slot.status === 'blocked').length;

    return {
      period: timeRange,
      summary: {
        totalResources: resources.length,
        totalSlots,
        availableSlots,
        busySlots,
        blockedSlots,
        overallUtilizationRate: totalSlots > 0 ? (busySlots / totalSlots) * 100 : 0,
      },
      resources: resources.map(resource => ({
        id: resource.id,
        name: resource.name,
        type: resource.type,
        location: resource.location,
        capacity: resource.capacity,
        pricePerHour: resource.pricePerHour,
      })),
    };
  }
}