import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cache } from '@nestjs/cache-manager';
import { Resource } from '../../entities/resource.entity';
import { Category } from '../../entities/category.entity';
import { Availability } from '../../entities/availability.entity';
import { CreateResourceDto } from '../../dto/create-resource.dto';

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<Resource>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Availability.name) private availabilityModel: Model<Availability>,
    private cacheManager: Cache,
  ) {}

  async create(createResourceDto: CreateResourceDto): Promise<Resource> {
    try {
      this.logger.log(`Creando nuevo recurso: ${createResourceDto.name}`);

      // Verificar si el código ya existe
      const existingResource = await this.resourceModel.findOne({ code: createResourceDto.code });
      if (existingResource) {
        throw new ConflictException(`Ya existe un recurso con el código: ${createResourceDto.code}`);
      }

      // Crear el recurso
      const resource = new this.resourceModel(createResourceDto);
      const savedResource = await resource.save();

      // Invalidar caché relacionado
      await this.invalidateResourceCache();

      // Publicar evento de recurso creado (si hay integración con Redis)
      await this.publishResourceEvent('RESOURCE_CREATED', savedResource);

      this.logger.log(`Recurso creado exitosamente: ${savedResource.id}`);
      return savedResource;
    } catch (error) {
      this.logger.error(`Error creando recurso: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(query: any = {}): Promise<Resource[]> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        type,
        location,
        category,
        minCapacity,
        maxCapacity,
        minPrice,
        maxPrice,
        available,
        featured,
        sortBy = 'priority',
        sortOrder = 'desc'
      } = query;

      // Construir filtros
      const filters: any = {};

      if (search) {
        filters.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
        ];
      }

      if (type) {
        filters.type = type;
      }

      if (location) {
        filters.location = { $regex: location, $options: 'i' };
      }

      if (category) {
        filters.categoryId = category;
      }

      if (minCapacity || maxCapacity) {
        filters.capacity = {};
        if (minCapacity) filters.capacity.$gte = minCapacity;
        if (maxCapacity) filters.capacity.$lte = maxCapacity;
      }

      if (minPrice || maxPrice) {
        filters.pricePerHour = {};
        if (minPrice) filters.pricePerHour.$gte = minPrice;
        if (maxPrice) filters.pricePerHour.$lte = maxPrice;
      }

      if (available !== undefined) {
        filters.isAvailable = available === 'true';
      }

      if (featured !== undefined) {
        filters.isFeatured = featured === 'true';
      }

      // Solo recursos activos por defecto
      filters.status = 'active';

      // Construir ordenamiento
      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit;

      const resources = await this.resourceModel
        .find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('categoryId')
        .exec();

      return resources;
    } catch (error) {
      this.logger.error(`Error obteniendo recursos: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<Resource> {
    try {
      // Intentar obtener del caché primero
      const cacheKey = `resource:${id}`;
      const cachedResource = await this.cacheManager.get<Resource>(cacheKey);

      if (cachedResource) {
        return cachedResource;
      }

      const resource = await this.resourceModel
        .findById(id)
        .populate('categoryId')
        .exec();

      if (!resource) {
        throw new NotFoundException(`Recurso no encontrado: ${id}`);
      }

      // Guardar en caché por 5 minutos
      await this.cacheManager.set(cacheKey, resource, 300);

      return resource;
    } catch (error) {
      this.logger.error(`Error obteniendo recurso ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, updateResourceDto: Partial<CreateResourceDto>): Promise<Resource> {
    try {
      this.logger.log(`Actualizando recurso: ${id}`);

      const resource = await this.resourceModel
        .findByIdAndUpdate(id, updateResourceDto, { new: true, runValidators: true })
        .populate('categoryId')
        .exec();

      if (!resource) {
        throw new NotFoundException(`Recurso no encontrado: ${id}`);
      }

      // Invalidar caché
      await this.invalidateResourceCache(id);

      // Publicar evento de actualización
      await this.publishResourceEvent('RESOURCE_UPDATED', resource);

      this.logger.log(`Recurso actualizado exitosamente: ${id}`);
      return resource;
    } catch (error) {
      this.logger.error(`Error actualizando recurso ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Eliminando recurso: ${id}`);

      // Verificar si hay reservas activas
      const activeBookings = await this.checkActiveBookings(id);
      if (activeBookings > 0) {
        throw new BadRequestException(
          `No se puede eliminar el recurso. Tiene ${activeBookings} reservas activas`
        );
      }

      const resource = await this.resourceModel.findByIdAndDelete(id).exec();

      if (!resource) {
        throw new NotFoundException(`Recurso no encontrado: ${id}`);
      }

      // Invalidar caché
      await this.invalidateResourceCache(id);

      // Publicar evento de eliminación
      await this.publishResourceEvent('RESOURCE_DELETED', { id, name: resource.name });

      this.logger.log(`Recurso eliminado exitosamente: ${id}`);
    } catch (error) {
      this.logger.error(`Error eliminando recurso ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAvailability(
    resourceId: string,
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<Availability[]> {
    try {
      const resource = await this.findOne(resourceId);

      let startDate: Date;
      let endDate: Date;

      if (dateRange?.startDate && dateRange?.endDate) {
        startDate = new Date(dateRange.startDate);
        endDate = new Date(dateRange.endDate);
      } else {
        // Por defecto, próximos 7 días
        startDate = new Date();
        endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);
      }

      const availability = await this.availabilityModel
        .find({
          resourceId,
          date: { $gte: startDate, $lte: endDate },
          status: 'available',
        })
        .sort({ date: 1, startTime: 1 })
        .exec();

      return availability;
    } catch (error) {
      this.logger.error(`Error obteniendo disponibilidad para recurso ${resourceId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async generateAvailability(
    resourceId: string,
    config: {
      startDate: string;
      endDate: string;
      timeSlots: Array<{ startTime: string; endTime: string }>;
      recurring?: boolean;
    }
  ): Promise<Availability[]> {
    try {
      const resource = await this.findOne(resourceId);
      const startDate = new Date(config.startDate);
      const endDate = new Date(config.endDate);
      const generatedSlots: Availability[] = [];

      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        for (const slot of config.timeSlots) {
          const availability = new this.availabilityModel({
            resourceId,
            date: new Date(currentDate),
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: 'available',
          });

          generatedSlots.push(availability);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Guardar en lotes
      const savedSlots = await this.availabilityModel.insertMany(generatedSlots);

      // Invalidar caché de disponibilidad
      await this.invalidateAvailabilityCache(resourceId);

      this.logger.log(`Disponibilidad generada para recurso ${resourceId}: ${savedSlots.length} slots`);
      return savedSlots;
    } catch (error) {
      this.logger.error(`Error generando disponibilidad para recurso ${resourceId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findNearby(
    coordinates: { latitude: number; longitude: number },
    radius: number = 5,
    limit: number = 20
  ): Promise<Resource[]> {
    try {
      const resources = await this.resourceModel
        .find({
          'coordinates.latitude': { $exists: true },
          'coordinates.longitude': { $exists: true },
          status: 'active',
        })
        .limit(limit)
        .exec();

      // Calcular distancia y filtrar por radio
      const nearbyResources = resources.filter(resource => {
        if (!resource.coordinates) return false;

        const distance = this.calculateDistance(
          coordinates.latitude,
          coordinates.longitude,
          resource.coordinates.latitude,
          resource.coordinates.longitude
        );

        return distance <= radius;
      });

      return nearbyResources;
    } catch (error) {
      this.logger.error(`Error buscando recursos cercanos: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getResourcesByType(): Promise<any[]> {
    try {
      const pipeline = [
        {
          $match: { status: 'active' }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            averagePrice: { $avg: '$pricePerHour' },
            totalCapacity: { $sum: '$capacity' },
          }
        },
        {
          $project: {
            type: '$_id',
            count: 1,
            averagePrice: { $round: ['$averagePrice', 2] },
            totalCapacity: 1,
            _id: 0
          }
        },
        {
          $sort: { count: -1 }
        }
      ];

      const stats = await this.resourceModel.aggregate(pipeline);
      return stats;
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas por tipo: ${error.message}`, error.stack);
      throw error;
    }
  }

  async toggleFeatured(id: string): Promise<Resource> {
    try {
      const resource = await this.resourceModel
        .findById(id)
        .exec();

      if (!resource) {
        throw new NotFoundException(`Recurso no encontrado: ${id}`);
      }

      resource.isFeatured = !resource.isFeatured;
      const updatedResource = await resource.save();

      // Invalidar caché
      await this.invalidateResourceCache(id);

      this.logger.log(`Estado destacado cambiado para recurso ${id}: ${updatedResource.isFeatured}`);
      return updatedResource;
    } catch (error) {
      this.logger.error(`Error cambiando estado destacado del recurso ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getResourceStats(): Promise<any> {
    try {
      const cacheKey = 'resource-stats';
      const cachedStats = await this.cacheManager.get(cacheKey);

      if (cachedStats) {
        return cachedStats;
      }

      const stats = await this.resourceModel.aggregate([
        {
          $match: { status: 'active' }
        },
        {
          $group: {
            _id: null,
            totalResources: { $sum: 1 },
            totalCapacity: { $sum: '$capacity' },
            averagePrice: { $avg: '$pricePerHour' },
            featuredCount: {
              $sum: { $cond: ['$isFeatured', 1, 0] }
            },
            availableCount: {
              $sum: { $cond: ['$isAvailable', 1, 0] }
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalResources: 1,
            totalCapacity: 1,
            averagePrice: { $round: ['$averagePrice', 2] },
            featuredCount: 1,
            availableCount: 1,
            utilizationRate: {
              $multiply: [
                { $divide: ['$availableCount', '$totalResources'] },
                100
              ]
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalResources: 0,
        totalCapacity: 0,
        averagePrice: 0,
        featuredCount: 0,
        availableCount: 0,
        utilizationRate: 0
      };

      // Guardar en caché por 10 minutos
      await this.cacheManager.set(cacheKey, result, 600);

      return result;
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas de recursos: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Métodos auxiliares privados
  private async checkActiveBookings(resourceId: string): Promise<number> {
    // Esta consulta se implementaría cuando esté disponible el Booking Service
    // Por ahora retornamos 0
    return 0;
  }

  private async invalidateResourceCache(resourceId?: string): Promise<void> {
    try {
      if (resourceId) {
        await this.cacheManager.del(`resource:${resourceId}`);
      }

      // Invalidar cachés relacionados
      await this.cacheManager.del('resource-stats');
      await this.cacheManager.del('resources:list');
    } catch (error) {
      this.logger.warn(`Error invalidando caché: ${error.message}`);
    }
  }

  private async invalidateAvailabilityCache(resourceId: string): Promise<void> {
    try {
      const pattern = `availability:${resourceId}:*`;
      // Implementar lógica para eliminar claves por patrón
      await this.cacheManager.del(`availability:${resourceId}`);
    } catch (error) {
      this.logger.warn(`Error invalidando caché de disponibilidad: ${error.message}`);
    }
  }

  private async publishResourceEvent(eventType: string, resource: any): Promise<void> {
    try {
      // Aquí se implementaría la publicación de eventos con Redis/Kafka
      this.logger.log(`Evento publicado: ${eventType} para recurso ${resource.id || resource._id}`);
    } catch (error) {
      this.logger.warn(`Error publicando evento: ${error.message}`);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}