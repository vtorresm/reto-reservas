import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResourcesService } from './resources.service';
import { Resource } from '../../entities/resource.entity';
import { Category } from '../../entities/category.entity';
import { Availability } from '../../entities/availability.entity';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let resourceModel: Model<Resource>;
  let categoryModel: Model<Category>;
  let availabilityModel: Model<Availability>;

  const mockResource = {
    _id: '507f1f77bcf86cd799439011',
    code: 'MR-001',
    name: 'Sala de Reuniones 1',
    description: 'Sala de reuniones para 8 personas',
    type: 'meeting_room',
    status: 'active',
    isAvailable: true,
    location: 'Edificio A - Piso 1',
    capacity: 8,
    pricePerHour: 25,
    currency: 'USD',
    amenities: {
      wifi: true,
      airConditioning: true,
      projector: true,
      whiteboard: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategory = {
    _id: '507f1f77bcf86cd799439012',
    name: 'salas_reuniones',
    displayName: 'Salas de Reuniones',
    description: 'Espacios para reuniones y conferencias',
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        {
          provide: getModelToken(Resource.name),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findByIdAndDelete: jest.fn(),
            aggregate: jest.fn(),
            countDocuments: jest.fn(),
          },
        },
        {
          provide: getModelToken(Category.name),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getModelToken(Availability.name),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            insertMany: jest.fn(),
            deleteMany: jest.fn(),
          },
        },
        {
          provide: 'CACHE_MANAGER',
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
    resourceModel = module.get<Model<Resource>>(getModelToken(Resource.name));
    categoryModel = module.get<Model<Category>>(getModelToken(Category.name));
    availabilityModel = module.get<Model<Availability>>(getModelToken(Availability.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new resource', async () => {
      const createResourceDto = {
        code: 'MR-001',
        name: 'Sala de Reuniones 1',
        description: 'Sala de reuniones para 8 personas',
        type: 'meeting_room',
        location: 'Edificio A - Piso 1',
        capacity: 8,
        pricePerHour: 25,
        currency: 'USD',
      };

      jest.spyOn(resourceModel, 'findOne').mockResolvedValue(null);
      jest.spyOn(resourceModel, 'create').mockResolvedValue(mockResource as any);

      const result = await service.create(createResourceDto);

      expect(resourceModel.findOne).toHaveBeenCalledWith({ code: createResourceDto.code });
      expect(resourceModel.create).toHaveBeenCalledWith(createResourceDto);
      expect(result).toEqual(mockResource);
    });

    it('should throw ConflictException if code already exists', async () => {
      const createResourceDto = {
        code: 'MR-001',
        name: 'Sala de Reuniones 1',
        description: 'Sala de reuniones para 8 personas',
        type: 'meeting_room',
        location: 'Edificio A - Piso 1',
        capacity: 8,
        pricePerHour: 25,
        currency: 'USD',
      };

      jest.spyOn(resourceModel, 'findOne').mockResolvedValue(mockResource as any);

      await expect(service.create(createResourceDto)).rejects.toThrow('Ya existe un recurso con el código');
    });
  });

  describe('findAll', () => {
    it('should return an array of resources', async () => {
      const query = { page: 1, limit: 10 };
      const mockResources = [mockResource];

      jest.spyOn(resourceModel, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockResources),
              }),
            }),
          }),
        }),
      } as any);

      const result = await service.findAll(query);

      expect(result).toEqual(mockResources);
    });
  });

  describe('findOne', () => {
    it('should return a single resource', async () => {
      const resourceId = '507f1f77bcf86cd799439011';

      jest.spyOn(resourceModel, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockResource),
        }),
      } as any);

      const result = await service.findOne(resourceId);

      expect(resourceModel.findById).toHaveBeenCalledWith(resourceId);
      expect(result).toEqual(mockResource);
    });
  });

  describe('update', () => {
    it('should update a resource', async () => {
      const resourceId = '507f1f77bcf86cd799439011';
      const updateResourceDto = {
        name: 'Sala de Reuniones 1 - Actualizada',
        pricePerHour: 30,
      };

      const updatedResource = { ...mockResource, ...updateResourceDto };

      jest.spyOn(resourceModel, 'findByIdAndUpdate').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedResource),
        }),
      } as any);

      const result = await service.update(resourceId, updateResourceDto);

      expect(resourceModel.findByIdAndUpdate).toHaveBeenCalledWith(
        resourceId,
        updateResourceDto,
        { new: true, runValidators: true },
      );
      expect(result).toEqual(updatedResource);
    });
  });

  describe('remove', () => {
    it('should remove a resource', async () => {
      const resourceId = '507f1f77bcf86cd799439011';

      jest.spyOn(resourceModel, 'findByIdAndDelete').mockResolvedValue(mockResource as any);

      await service.remove(resourceId);

      expect(resourceModel.findByIdAndDelete).toHaveBeenCalledWith(resourceId);
    });
  });

  describe('getAvailability', () => {
    it('should return availability for a resource', async () => {
      const resourceId = '507f1f77bcf86cd799439011';
      const dateRange = {
        startDate: '2024-01-01',
        endDate: '2024-01-07',
      };

      const mockAvailability = [
        {
          _id: '507f1f77bcf86cd799439013',
          resourceId,
          date: new Date('2024-01-01'),
          startTime: '09:00',
          endTime: '10:00',
          status: 'available',
        },
      ];

      jest.spyOn(service, 'findOne').mockResolvedValue(mockResource as any);
      jest.spyOn(availabilityModel, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockAvailability),
        }),
      } as any);

      const result = await service.getAvailability(resourceId, dateRange);

      expect(result).toEqual(mockAvailability);
    });
  });

  describe('findNearby', () => {
    it('should return nearby resources', async () => {
      const coordinates = { latitude: -12.0464, longitude: -77.0428 };
      const radius = 5;
      const limit = 10;

      const mockNearbyResources = [mockResource];

      jest.spyOn(resourceModel, 'find').mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockNearbyResources),
        }),
      } as any);

      const result = await service.findNearby(coordinates, radius, limit);

      expect(result).toEqual(mockNearbyResources);
    });
  });

  describe('getResourcesByType', () => {
    it('should return resources grouped by type', async () => {
      const mockAggregationResult = [
        {
          _id: 'meeting_room',
          count: 5,
          averagePrice: 25.5,
          totalCapacity: 40,
        },
      ];

      jest.spyOn(resourceModel, 'aggregate').mockResolvedValue(mockAggregationResult);

      const result = await service.getResourcesByType();

      expect(resourceModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual(mockAggregationResult);
    });
  });

  describe('toggleFeatured', () => {
    it('should toggle featured status of a resource', async () => {
      const resourceId = '507f1f77bcf86cd799439011';
      const updatedResource = { ...mockResource, isFeatured: true };

      jest.spyOn(resourceModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResource),
      } as any);

      jest.spyOn(resourceModel, 'findById').mockReturnValue({
        save: jest.fn().mockResolvedValue(updatedResource),
      } as any);

      const result = await service.toggleFeatured(resourceId);

      expect(result).toEqual(updatedResource);
    });
  });
});