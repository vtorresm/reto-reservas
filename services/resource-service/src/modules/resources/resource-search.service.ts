import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resource } from '../../entities/resource.entity';
import { Category } from '../../entities/category.entity';

export interface SearchCriteria {
  query?: string;
  type?: string;
  location?: string;
  category?: string;
  minCapacity?: number;
  maxCapacity?: number;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
  available?: boolean;
  featured?: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  sortBy?: 'name' | 'price' | 'capacity' | 'rating' | 'distance' | 'priority';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  resources: Resource[];
  total: number;
  facets: {
    types: Array<{ type: string; count: number }>;
    locations: Array<{ location: string; count: number }>;
    priceRanges: Array<{ range: string; count: number }>;
    amenities: Array<{ amenity: string; count: number }>;
  };
  suggestions?: string[];
  searchTime: number;
}

@Injectable()
export class ResourceSearchService {
  private readonly logger = new Logger(ResourceSearchService.name);

  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<Resource>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  /**
   * Búsqueda avanzada de recursos con facetas y optimización
   */
  async search(criteria: SearchCriteria): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Ejecutando búsqueda con criterios: ${JSON.stringify(criteria)}`);

      // Construir pipeline de agregación para búsqueda avanzada
      const pipeline = await this.buildSearchPipeline(criteria);

      // Ejecutar búsqueda principal
      const [searchResults, facets] = await Promise.all([
        this.executeSearch(pipeline, criteria),
        this.getSearchFacets(criteria),
      ]);

      // Generar sugerencias si no hay resultados
      const suggestions = searchResults.length === 0 ?
        await this.generateSuggestions(criteria) : undefined;

      const searchTime = Date.now() - startTime;

      const result: SearchResult = {
        resources: searchResults,
        total: searchResults.length,
        facets,
        suggestions,
        searchTime,
      };

      this.logger.log(`Búsqueda completada en ${searchTime}ms, ${result.total} resultados encontrados`);
      return result;
    } catch (error) {
      this.logger.error(`Error en búsqueda: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Búsqueda de recursos disponibles en tiempo real
   */
  async findAvailableResources(
    criteria: SearchCriteria,
    checkAvailability: boolean = true,
  ): Promise<Resource[]> {
    try {
      const baseCriteria = { ...criteria };
      baseCriteria.available = true;

      const resources = await this.search(baseCriteria);

      if (!checkAvailability) {
        return resources.resources;
      }

      // Verificar disponibilidad en tiempo real
      const availableResources = [];

      for (const resource of resources.resources) {
        const isAvailable = await this.checkRealTimeAvailability(resource.id.toString(), criteria.dateRange);
        if (isAvailable) {
          availableResources.push(resource);
        }
      }

      return availableResources;
    } catch (error) {
      this.logger.error(`Error buscando recursos disponibles: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Búsqueda geoespacial de recursos cercanos
   */
  async findNearbyResources(
    latitude: number,
    longitude: number,
    radius: number = 5,
    criteria: Partial<SearchCriteria> = {},
  ): Promise<Resource[]> {
    try {
      const pipeline = [
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            distanceField: 'distance',
            maxDistance: radius * 1000, // Convertir a metros
            spherical: true,
          },
        },
        {
          $match: {
            status: 'active',
            ...this.buildBaseFilters(criteria),
          },
        },
        {
          $sort: { distance: 1 },
        },
      ];

      const resources = await this.resourceModel.aggregate(pipeline);
      return resources;
    } catch (error) {
      this.logger.error(`Error en búsqueda geoespacial: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Optimización de búsqueda para recomendaciones
   */
  async getRecommendations(
    userId: string,
    currentLocation?: { latitude: number; longitude: number },
    preferences?: any,
  ): Promise<Resource[]> {
    try {
      // Obtener historial de usuario (simulado)
      const userHistory = await this.getUserSearchHistory(userId);

      // Construir criterios basados en preferencias e historial
      const criteria: SearchCriteria = {
        ...preferences,
        limit: 10,
        sortBy: 'priority',
      };

      // Si hay ubicación, buscar recursos cercanos
      if (currentLocation) {
        criteria.coordinates = currentLocation;
      }

      const searchResult = await this.search(criteria);

      // Aplicar algoritmo de recomendación
      const recommendations = this.applyRecommendationAlgorithm(
        searchResult.resources,
        userHistory,
        preferences,
      );

      return recommendations.slice(0, 5); // Top 5 recomendaciones
    } catch (error) {
      this.logger.error(`Error generando recomendaciones: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Métodos auxiliares privados

  private async buildSearchPipeline(criteria: SearchCriteria): Promise<any[]> {
    const pipeline: any[] = [];

    // Filtro base
    const baseFilters = this.buildBaseFilters(criteria);
    if (Object.keys(baseFilters).length > 0) {
      pipeline.push({ $match: baseFilters });
    }

    // Búsqueda de texto
    if (criteria.query) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: criteria.query, $options: 'i' } },
            { description: { $regex: criteria.query, $options: 'i' } },
            { location: { $regex: criteria.query, $options: 'i' } },
            { tags: { $in: [new RegExp(criteria.query, 'i')] } },
          ],
        },
      });
    }

    // Búsqueda geoespacial
    if (criteria.coordinates) {
      pipeline.push({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [criteria.coordinates.longitude, criteria.coordinates.latitude],
          },
          distanceField: 'distance',
          maxDistance: (criteria.coordinates.radius || 5) * 1000,
          spherical: true,
        },
      });
    }

    // Facetas para filtros
    pipeline.push({
      $facet: {
        results: this.buildResultsPipeline(criteria),
        facets: this.buildFacetsPipeline(),
      },
    });

    return pipeline;
  }

  private buildBaseFilters(criteria: Partial<SearchCriteria>): any {
    const filters: any = {
      status: 'active',
    };

    if (criteria.type) {
      filters.type = criteria.type;
    }

    if (criteria.minCapacity !== undefined) {
      filters.capacity = { ...filters.capacity, $gte: criteria.minCapacity };
    }

    if (criteria.maxCapacity !== undefined) {
      filters.capacity = { ...filters.capacity, $lte: criteria.maxCapacity };
    }

    if (criteria.minPrice !== undefined) {
      filters.pricePerHour = { ...filters.pricePerHour, $gte: criteria.minPrice };
    }

    if (criteria.maxPrice !== undefined) {
      filters.pricePerHour = { ...filters.pricePerHour, $lte: criteria.maxPrice };
    }

    if (criteria.available !== undefined) {
      filters.isAvailable = criteria.available;
    }

    if (criteria.featured !== undefined) {
      filters.isFeatured = criteria.featured;
    }

    if (criteria.amenities && criteria.amenities.length > 0) {
      filters['amenities'] = {
        $elemMatch: {
          $in: criteria.amenities,
        },
      };
    }

    return filters;
  }

  private buildResultsPipeline(criteria: SearchCriteria): any[] {
    const resultsPipeline: any[] = [];

    // Paginación
    if (criteria.offset) {
      resultsPipeline.push({ $skip: criteria.offset });
    }

    if (criteria.limit) {
      resultsPipeline.push({ $limit: criteria.limit });
    }

    // Ordenamiento
    const sort: any = {};
    switch (criteria.sortBy) {
      case 'name':
        sort.name = criteria.sortOrder === 'desc' ? -1 : 1;
        break;
      case 'price':
        sort.pricePerHour = criteria.sortOrder === 'desc' ? -1 : 1;
        break;
      case 'capacity':
        sort.capacity = criteria.sortOrder === 'desc' ? -1 : 1;
        break;
      case 'distance':
        sort.distance = 1; // La distancia ya viene del $geoNear
        break;
      case 'priority':
      default:
        sort.priority = criteria.sortOrder === 'desc' ? -1 : 1;
        sort.name = 1;
        break;
    }

    if (Object.keys(sort).length > 0) {
      resultsPipeline.push({ $sort: sort });
    }

    return resultsPipeline;
  }

  private buildFacetsPipeline(): any[] {
    return [
      {
        $group: {
          _id: null,
          types: {
            $addToSet: '$type',
          },
          locations: {
            $addToSet: '$location',
          },
          priceRanges: {
            $push: {
              $switch: {
                branches: [
                  { case: { $lt: ['$pricePerHour', 25] }, then: '0-25' },
                  { case: { $lt: ['$pricePerHour', 50] }, then: '25-50' },
                  { case: { $lt: ['$pricePerHour', 100] }, then: '50-100' },
                  { case: { $lt: ['$pricePerHour', 200] }, then: '100-200' },
                ],
                default: '200+',
              },
            },
          },
        },
      },
    ];
  }

  private async executeSearch(pipeline: any[], criteria: SearchCriteria): Promise<Resource[]> {
    const result = await this.resourceModel.aggregate(pipeline);

    if (result.length === 0) {
      return [];
    }

    return result[0].results || [];
  }

  private async getSearchFacets(criteria: SearchCriteria): Promise<any> {
    // Obtener facetas para filtros
    const facetsPipeline = [
      {
        $match: { status: 'active' },
      },
      {
        $group: {
          _id: null,
          types: { $addToSet: '$type' },
          locations: { $addToSet: '$location' },
          priceRanges: { $addToSet: '$pricePerHour' },
        },
      },
    ];

    const facets = await this.resourceModel.aggregate(facetsPipeline);

    return {
      types: facets[0]?.types?.map((type: string) => ({ type, count: 0 })) || [],
      locations: facets[0]?.locations?.map((location: string) => ({ location, count: 0 })) || [],
      priceRanges: this.calculatePriceRangeDistribution(facets[0]?.priceRanges || []),
      amenities: await this.getAmenityFacets(),
    };
  }

  private calculatePriceRangeDistribution(prices: number[]): Array<{ range: string; count: number }> {
    const ranges = [
      { range: '0-25', min: 0, max: 25 },
      { range: '25-50', min: 25, max: 50 },
      { range: '50-100', min: 50, max: 100 },
      { range: '100-200', min: 100, max: 200 },
      { range: '200+', min: 200, max: Infinity },
    ];

    return ranges.map(range => ({
      range: range.range,
      count: prices.filter(price => price >= range.min && price < range.max).length,
    }));
  }

  private async getAmenityFacets(): Promise<Array<{ amenity: string; count: number }>> {
    const amenitiesPipeline = [
      {
        $match: { status: 'active' },
      },
      {
        $unwind: '$amenities',
      },
      {
        $group: {
          _id: '$amenities',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          amenity: '$_id',
          count: 1,
          _id: 0,
        },
      },
      {
        $sort: { count: -1 },
      },
    ];

    const amenities = await this.resourceModel.aggregate(amenitiesPipeline);
    return amenities;
  }

  private async generateSuggestions(criteria: SearchCriteria): Promise<string[]> {
    const suggestions: string[] = [];

    // Sugerencias basadas en criterios de búsqueda
    if (criteria.query) {
      suggestions.push(`Intente buscar "${criteria.query}" con menos filtros`);
    }

    if (criteria.minPrice && criteria.maxPrice) {
      suggestions.push('Considere ajustar el rango de precios');
    }

    if (criteria.minCapacity) {
      suggestions.push('Pruebe con una capacidad menor');
    }

    if (criteria.coordinates) {
      suggestions.push('Amplíe el radio de búsqueda');
    }

    // Sugerencias alternativas
    suggestions.push('Explore recursos en ubicaciones cercanas');
    suggestions.push('Considere horarios alternativos');

    return suggestions;
  }

  private async checkRealTimeAvailability(resourceId: string, dateRange?: any): Promise<boolean> {
    try {
      // Verificar si el recurso está disponible en el rango de fechas
      if (!dateRange) {
        const resource = await this.resourceModel.findById(resourceId);
        return resource?.isAvailable || false;
      }

      // Verificar disponibilidad específica por fechas
      // Esta lógica se implementaría con consultas más complejas
      return true;
    } catch (error) {
      this.logger.warn(`Error verificando disponibilidad en tiempo real: ${error.message}`);
      return false;
    }
  }

  private async getUserSearchHistory(userId: string): Promise<any> {
    // Obtener historial de búsqueda del usuario
    // Por simplicidad, retornamos datos simulados
    return {
      preferredTypes: ['private_office', 'meeting_room'],
      preferredLocations: ['centro', 'zona_norte'],
      averagePriceRange: { min: 20, max: 80 },
      typicalBookingDuration: 2,
    };
  }

  private applyRecommendationAlgorithm(
    resources: Resource[],
    userHistory: any,
    preferences: any,
  ): Resource[] {
    // Aplicar algoritmo de recomendación basado en:
    // 1. Historial del usuario
    // 2. Preferencias actuales
    // 3. Popularidad del recurso
    // 4. Disponibilidad

    return resources
      .map(resource => {
        let score = 50; // Score base

        // Bonificar tipos preferidos
        if (userHistory.preferredTypes.includes(resource.type)) {
          score += 20;
        }

        // Bonificar ubicaciones preferidas
        if (userHistory.preferredLocations.some((loc: string) =>
          resource.location.toLowerCase().includes(loc),
        )) {
          score += 15;
        }

        // Bonificar recursos destacados
        if (resource.isFeatured) {
          score += 10;
        }

        // Bonificar recursos disponibles
        if (resource.isAvailable) {
          score += 5;
        }

        return { resource, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(item => item.resource);
  }
}