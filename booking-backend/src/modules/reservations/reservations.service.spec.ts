import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from '../../entities/reservation.entity';
import { User } from '../../entities/user.entity';
import { Room } from '../../entities/room.entity';
import { BadRequestException } from '@nestjs/common';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let reservationRepo: Repository<Reservation>;
  let userRepo: Repository<User>;
  let roomRepo: Repository<Room>;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
  };

  const mockRoom = {
    id: 1,
    name: 'Sala de Test',
    capacity: 10,
  };

  const mockReservation = {
    id: 1,
    user: mockUser,
    room: mockRoom,
    date: new Date('2025-09-30'),
    startTime: '10:00',
    endTime: '11:00',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: getRepositoryToken(Reservation),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getCount: jest.fn().mockResolvedValue(0),
            }),
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOneBy: jest.fn().mockResolvedValue(mockUser),
          },
        },
        {
          provide: getRepositoryToken(Room),
          useValue: {
            findOneBy: jest.fn().mockResolvedValue(mockRoom),
          },
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    reservationRepo = module.get(getRepositoryToken(Reservation));
    userRepo = module.get(getRepositoryToken(User));
    roomRepo = module.get(getRepositoryToken(Room));
  });

  describe('create', () => {
    const createDto = {
      userId: 1,
      roomId: 1,
      date: '2025-09-30',
      startTime: '10:00',
      endTime: '11:00',
    };

    it('should create a reservation successfully without conflicts', async () => {
      // Arrange
      const expectedReservation = { ...mockReservation, ...createDto };
      jest
        .spyOn(reservationRepo, 'create')
        .mockReturnValue(expectedReservation as any);
      jest
        .spyOn(reservationRepo, 'save')
        .mockResolvedValue(expectedReservation as any);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(expectedReservation);
      expect(reservationRepo.createQueryBuilder).toHaveBeenCalled();
      expect(reservationRepo.create).toHaveBeenCalledWith({
        user: mockUser,
        room: mockRoom,
        date: new Date(createDto.date),
        startTime: createDto.startTime,
        endTime: createDto.endTime,
      });
      expect(reservationRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when there is a schedule conflict', async () => {
      // Arrange
      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1), // Simula solapamiento
      };
      jest
        .spyOn(reservationRepo, 'createQueryBuilder')
        .mockReturnValue(queryBuilderMock as any);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        new BadRequestException(
          'No se puede reservar: solapamiento de horario',
        ),
      );

      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'r.roomId = :roomId AND r.date = :date',
        { roomId: createDto.roomId, date: createDto.date },
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        '(r.startTime < :endTime AND r.endTime > :startTime)',
        { startTime: createDto.startTime, endTime: createDto.endTime },
      );
      expect(queryBuilderMock.getCount).toHaveBeenCalled();
    });

    it('should throw BadRequestException when user is not found', async () => {
      // Arrange
      jest.spyOn(userRepo, 'findOneBy').mockResolvedValue(null);
      jest.spyOn(roomRepo, 'findOneBy').mockResolvedValue(mockRoom);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        new BadRequestException('Usuario no encontrado'),
      );

      expect(userRepo.findOneBy).toHaveBeenCalledWith({ id: createDto.userId });
    });

    it('should throw BadRequestException when room is not found', async () => {
      // Arrange
      jest.spyOn(userRepo, 'findOneBy').mockResolvedValue(mockUser);
      jest.spyOn(roomRepo, 'findOneBy').mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        new BadRequestException('Sala no encontrada'),
      );

      expect(roomRepo.findOneBy).toHaveBeenCalledWith({ id: createDto.roomId });
    });

    it('should throw BadRequestException when both user and room are not found', async () => {
      // Arrange
      jest.spyOn(userRepo, 'findOneBy').mockResolvedValue(null);
      jest.spyOn(roomRepo, 'findOneBy').mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(
        new BadRequestException('Usuario y sala no encontrados'),
      );
    });

    it('should handle partial schedule overlap correctly', async () => {
      // Arrange - Simula solapamiento parcial (10:30-11:30 vs 10:00-11:00)
      const conflictingDto = {
        userId: 1,
        roomId: 1,
        date: '2025-09-30',
        startTime: '10:30',
        endTime: '11:30',
      };

      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1), // Hay solapamiento
      };
      jest
        .spyOn(reservationRepo, 'createQueryBuilder')
        .mockReturnValue(queryBuilderMock as any);

      // Act & Assert
      await expect(service.create(conflictingDto)).rejects.toThrow(
        new BadRequestException(
          'No se puede reservar: solapamiento de horario',
        ),
      );
    });

    it('should handle exact same time conflict', async () => {
      // Arrange - Simula mismo horario exacto
      const sameTimeDto = {
        userId: 1,
        roomId: 1,
        date: '2025-09-30',
        startTime: '10:00',
        endTime: '11:00',
      };

      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1), // Conflicto exacto
      };
      jest
        .spyOn(reservationRepo, 'createQueryBuilder')
        .mockReturnValue(queryBuilderMock as any);

      // Act & Assert
      await expect(service.create(sameTimeDto)).rejects.toThrow(
        new BadRequestException(
          'No se puede reservar: solapamiento de horario',
        ),
      );
    });
  });

  describe('findAll', () => {
    it('should return all reservations without date filter', async () => {
      // Arrange
      const mockReservations = [mockReservation];
      jest
        .spyOn(reservationRepo, 'find')
        .mockResolvedValue(mockReservations as any);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(mockReservations);
      expect(reservationRepo.find).toHaveBeenCalledWith({
        relations: ['user', 'room'],
        where: {},
      });
    });

    it('should return reservations filtered by date', async () => {
      // Arrange
      const mockReservations = [mockReservation];
      const filterDate = '2025-09-30';
      jest
        .spyOn(reservationRepo, 'find')
        .mockResolvedValue(mockReservations as any);

      // Act
      const result = await service.findAll(filterDate);

      // Assert
      expect(result).toEqual(mockReservations);
      expect(reservationRepo.find).toHaveBeenCalledWith({
        relations: ['user', 'room'],
        where: { date: new Date(filterDate) },
      });
    });
  });
});
