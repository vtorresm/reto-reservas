import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Reservation } from '../../entities/reservation.entity';
import { User } from '../../entities/user.entity';
import { Room } from '../../entities/room.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
  ) {}

  async create(createDto: CreateReservationDto): Promise<Reservation> {
    const overlapping = await this.reservationRepository
      .createQueryBuilder('r')
      .where('r.roomId = :roomId AND r.date = :date', {
        roomId: createDto.roomId,
        date: createDto.date,
      })
      .andWhere('(r.startTime < :endTime AND r.endTime > :startTime)', {
        startTime: createDto.startTime,
        endTime: createDto.endTime,
      })
      .getCount();

    if (overlapping > 0) {
      throw new BadRequestException(
        'No se puede reservar: solapamiento de horario',
      );
    }

    const user = await this.userRepository.findOneBy({ id: createDto.userId });
    const room = await this.roomRepository.findOneBy({ id: createDto.roomId });

    if (!user && !room) {
      throw new BadRequestException('Usuario y sala no encontrados');
    } else if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    } else if (!room) {
      throw new BadRequestException('Sala no encontrada');
    }

    const reservation = this.reservationRepository.create({
      user,
      room,
      date: new Date(createDto.date),
      startTime: createDto.startTime,
      endTime: createDto.endTime,
    });

    return this.reservationRepository.save(reservation);
  }

  async findAll(date?: string): Promise<Reservation[]> {
    return this.reservationRepository.find({
      relations: ['user', 'room'],
      where: date ? { date: new Date(date) } : {},
    });
  }
}
