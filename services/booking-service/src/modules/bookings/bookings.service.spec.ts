import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingsService } from './bookings.service';
import { Booking } from '../../entities/booking.entity';
import { BookingPolicy } from '../../entities/booking-policy.entity';

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingRepository: Repository<Booking>;
  let bookingPolicyRepository: Repository<BookingPolicy>;

  const mockBooking = {
    id: '507f1f77bcf86cd799439011',
    userId: '507f1f77bcf86cd799439012',
    resourceId: '507f1f77bcf86cd799439013',
    date: new Date('2024-01-15'),
    startTime: '14:00',
    endTime: '16:00',
    status: 'confirmed',
    totalHours: 2,
    totalAmount: 50,
    currency: 'USD',
    purpose: 'Reunión de equipo',
    attendeeCount: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPolicy = {
    id: '507f1f77bcf86cd799439014',
    name: 'Política General',
    description: 'Política general para todos los recursos',
    type: 'global',
    isActive: true,
    priority: 0,
    minBookingDuration: 1,
    maxBookingDuration: 8,
    minAdvanceBooking: 1,
    maxAdvanceBooking: 24,
    requirePayment: true,
    allowFreeBooking: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
              getRawMany: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(BookingPolicy),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: 'InterserviceCommunicationService',
          useValue: {
            getUserInfo: jest.fn(),
            checkResourceAvailability: jest.fn(),
            getResourceInfo: jest.fn(),
            notifyResourceBooking: jest.fn(),
            sendBookingNotification: jest.fn(),
            logAuditEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    bookingRepository = module.get<Repository<Booking>>(getRepositoryToken(Booking));
    bookingPolicyRepository = module.get<Repository<BookingPolicy>>(getRepositoryToken(BookingPolicy));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new booking', async () => {
      const createBookingDto = {
        userId: '507f1f77bcf86cd799439012',
        resourceId: '507f1f77bcf86cd799439013',
        date: '2024-01-15',
        startTime: '14:00',
        endTime: '16:00',
        purpose: 'Reunión de equipo',
        attendeeCount: 5,
      };

      const mockUserInfo = { id: '507f1f77bcf86cd799439012', role: 'member' };
      const mockResourceInfo = { id: '507f1f77bcf86cd799439013', pricePerHour: 25 };
      const mockAvailability = { available: true };

      jest.spyOn(service as any, 'interserviceCommunication')
        .mockImplementation(() => ({
          getUserInfo: jest.fn().mockResolvedValue(mockUserInfo),
          checkResourceAvailability: jest.fn().mockResolvedValue(mockAvailability),
          getResourceInfo: jest.fn().mockResolvedValue(mockResourceInfo),
          notifyResourceBooking: jest.fn().mockResolvedValue(true),
          sendBookingNotification: jest.fn().mockResolvedValue(true),
          logAuditEvent: jest.fn().mockResolvedValue(undefined),
        }));

      jest.spyOn(bookingRepository, 'save').mockResolvedValue(mockBooking as any);
      jest.spyOn(bookingPolicyRepository, 'find').mockResolvedValue([mockPolicy as any]);

      const result = await service.create(createBookingDto);

      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return an array of bookings', async () => {
      const query = { userId: '507f1f77bcf86cd799439012' };
      const mockBookings = [mockBooking];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockBookings),
      };

      jest.spyOn(bookingRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      const result = await service.findAll(query);

      expect(result).toEqual(mockBookings);
    });
  });

  describe('findOne', () => {
    it('should return a single booking', async () => {
      const bookingId = '507f1f77bcf86cd799439011';

      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(mockBooking as any);

      const result = await service.findOne(bookingId);

      expect(bookingRepository.findOne).toHaveBeenCalledWith({ where: { id: bookingId } });
      expect(result).toEqual(mockBooking);
    });
  });

  describe('update', () => {
    it('should update a booking', async () => {
      const bookingId = '507f1f77bcf86cd799439011';
      const updateBookingDto = {
        purpose: 'Reunión actualizada',
      };

      const updatedBooking = { ...mockBooking, purpose: 'Reunión actualizada' };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockBooking as any);
      jest.spyOn(bookingRepository, 'save').mockResolvedValue(updatedBooking as any);

      const result = await service.update(bookingId, updateBookingDto);

      expect(result).toEqual(updatedBooking);
    });
  });

  describe('cancel', () => {
    it('should cancel a booking', async () => {
      const bookingId = '507f1f77bcf86cd799439011';

      jest.spyOn(service, 'findOne').mockResolvedValue(mockBooking as any);
      jest.spyOn(bookingRepository, 'save').mockResolvedValue(mockBooking as any);

      await service.cancel(bookingId);

      expect(bookingRepository.save).toHaveBeenCalled();
    });
  });

  describe('checkIn', () => {
    it('should check in a booking', async () => {
      const bookingId = '507f1f77bcf86cd799439011';
      const confirmedBooking = { ...mockBooking, status: 'confirmed' };

      jest.spyOn(service, 'findOne').mockResolvedValue(confirmedBooking as any);
      jest.spyOn(bookingRepository, 'save').mockResolvedValue(confirmedBooking as any);

      const result = await service.checkIn(bookingId);

      expect(result).toBeDefined();
    });
  });

  describe('checkOut', () => {
    it('should check out a booking', async () => {
      const bookingId = '507f1f77bcf86cd799439011';
      const inProgressBooking = { ...mockBooking, status: 'in_progress' };

      jest.spyOn(service, 'findOne').mockResolvedValue(inProgressBooking as any);
      jest.spyOn(bookingRepository, 'save').mockResolvedValue(inProgressBooking as any);

      const result = await service.checkOut(bookingId);

      expect(result).toBeDefined();
    });
  });

  describe('getUserBookings', () => {
    it('should return bookings for a user', async () => {
      const userId = '507f1f77bcf86cd799439012';
      const mockBookings = [mockBooking];

      jest.spyOn(bookingRepository, 'find').mockResolvedValue(mockBookings as any);

      const result = await service.getUserBookings(userId);

      expect(bookingRepository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockBookings);
    });
  });

  describe('getResourceBookings', () => {
    it('should return bookings for a resource', async () => {
      const resourceId = '507f1f77bcf86cd799439013';
      const mockBookings = [mockBooking];

      jest.spyOn(bookingRepository, 'find').mockResolvedValue(mockBookings as any);

      const result = await service.getResourceBookings(resourceId);

      expect(bookingRepository.find).toHaveBeenCalledWith({
        where: { resourceId },
        order: { date: 'ASC', startTime: 'ASC' },
      });
      expect(result).toEqual(mockBookings);
    });
  });

  describe('getCalendarView', () => {
    it('should return calendar view for bookings', async () => {
      const resourceId = '507f1f77bcf86cd799439013';
      const dateRange = {
        startDate: '2024-01-01',
        endDate: '2024-01-07',
      };

      const mockBookings = [mockBooking];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockBookings),
      };

      jest.spyOn(bookingRepository, 'find').mockResolvedValue(mockBookings as any);

      const result = await service.getCalendarView(resourceId, dateRange);

      expect(result).toBeDefined();
    });
  });

  describe('getBookingSummary', () => {
    it('should return booking summary', async () => {
      const dateRange = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const mockSummary = [
        {
          status: 'confirmed',
          count: '10',
          totalAmount: '500.00',
        },
      ];

      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockSummary),
      };

      jest.spyOn(bookingRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      const result = await service.getBookingSummary(dateRange);

      expect(result).toBeDefined();
    });
  });
});