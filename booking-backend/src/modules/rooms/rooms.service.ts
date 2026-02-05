import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../../entities/room.entity';

export interface CreateRoomDto {
  name: string;
  capacity: number;
  description?: string;
  location?: string;
  amenities?: string[];
  equipment?: string[];
  color?: string;
  type?: string;
}

export interface UpdateRoomDto {
  name?: string;
  capacity?: number;
  description?: string;
  location?: string;
  amenities?: string[];
  equipment?: string[];
  isAvailable?: boolean;
  color?: string;
  type?: string;
}

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomsRepository: Repository<Room>,
  ) {}

  async findAll(): Promise<Room[]> {
    return this.roomsRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Room> {
    const room = await this.roomsRepository.findOne({
      where: { id },
      relations: ['reservations'],
    });

    if (!room) {
      throw new NotFoundException(`Sala con ID ${id} no encontrada`);
    }

    return room;
  }

  async findAvailable(): Promise<Room[]> {
    return this.roomsRepository.find({
      where: { isAvailable: true },
      order: { name: 'ASC' },
    });
  }

  async create(createDto: CreateRoomDto): Promise<Room> {
    const existingRoom = await this.roomsRepository.findOne({
      where: { name: createDto.name },
    });

    if (existingRoom) {
      throw new BadRequestException('Ya existe una sala con ese nombre');
    }

    const room = this.roomsRepository.create({
      ...createDto,
      isAvailable: true,
    });

    return this.roomsRepository.save(room);
  }

  async update(id: string, updateDto: UpdateRoomDto): Promise<Room> {
    const room = await this.findOne(id);

    if (updateDto.name) {
      const existingRoom = await this.roomsRepository.findOne({
        where: { name: updateDto.name },
      });

      if (existingRoom && existingRoom.id !== id) {
        throw new BadRequestException('Ya existe una sala con ese nombre');
      }
    }

    Object.assign(room, updateDto);
    return this.roomsRepository.save(room);
  }

  async remove(id: string): Promise<void> {
    const room = await this.findOne(id);
    await this.roomsRepository.remove(room);
  }

  async toggleAvailability(id: string): Promise<Room> {
    const room = await this.findOne(id);
    room.isAvailable = !room.isAvailable;
    return this.roomsRepository.save(room);
  }

  async findByCapacity(minCapacity: number): Promise<Room[]> {
    return this.roomsRepository
      .createQueryBuilder('room')
      .where('room.capacity >= :minCapacity', { minCapacity })
      .andWhere('room.isAvailable = :isAvailable', { isAvailable: true })
      .orderBy('room.capacity', 'ASC')
      .getMany();
  }

  async findByType(type: string): Promise<Room[]> {
    return this.roomsRepository.find({
      where: { type },
      order: { name: 'ASC' },
    });
  }
}
