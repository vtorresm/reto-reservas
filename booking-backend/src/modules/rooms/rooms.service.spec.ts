import { Test, TestingModule } from '@nestjs/testing';
import { RoomsService } from './rooms.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../../entities/room.entity';

describe('RoomsService', () => {
  let service: RoomsService;
  let roomsRepo: Repository<Room>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        {
          provide: getRepositoryToken(Room),
          useValue: {
            find: jest.fn().mockResolvedValue([{ id: 1, name: 'Sala A' }, { id: 2, name: 'Sala B' }]),
          },
        },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    roomsRepo = module.get(getRepositoryToken(Room));
  });

  it('should return all rooms', async () => {
    const rooms = await service.findAll();
    expect(rooms).toHaveLength(2);
    expect(rooms[0].name).toBe('Sala A');
    expect(rooms[1].name).toBe('Sala B');
  });
});