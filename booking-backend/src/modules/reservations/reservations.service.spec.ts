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
          useValue: { findOneBy: jest.fn().mockResolvedValue({ id: 1 }) },
        },
        {
          provide: getRepositoryToken(Room),
          useValue: { findOneBy: jest.fn().mockResolvedValue({ id: 1 }) },
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    reservationRepo = module.get(getRepositoryToken(Reservation));
    userRepo = module.get(getRepositoryToken(User));
    roomRepo = module.get(getRepositoryToken(Room));
  });

  it('should create a reservation without overlap', async () => {
    const dto = { userId: 1, roomId: 1, date: '2025-09-30', startTime: '10:00', endTime: '11:00' };
    jest.spyOn(reservationRepo, 'create').mockReturnValue(dto as any);
    jest.spyOn(reservationRepo, 'save').mockResolvedValue(dto as any);
    expect(await service.create(dto)).toEqual(dto);
  });

  it('should throw on overlap', async () => {
    const dto = { userId: 1, roomId: 1, date: '2025-09-30', startTime: '10:00', endTime: '11:00' };
    (reservationRepo.createQueryBuilder().getCount as jest.Mock).mockResolvedValue(1);
    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });
});