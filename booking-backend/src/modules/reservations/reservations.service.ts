import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Reservation } from '../../entities/reservation.entity';
import { User } from '../../entities/user.entity';
import { Room } from '../../entities/room.entity';

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

export interface UpdateReservationDto {
  date?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

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
    const overlapping = await this.checkOverlap(
      createDto.roomId,
      createDto.date,
      createDto.startTime,
      createDto.endTime,
    );

    if (overlapping > 0) {
      throw new BadRequestException(
        'No se puede reservar: solapamiento de horario',
      );
    }

    const user = await this.userRepository.findOneBy({ id: createDto.userId });
    const room = await this.roomRepository.findOneBy({ id: createDto.roomId });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }
    if (!room) {
      throw new BadRequestException('Sala no encontrada');
    }
    if (!room.isAvailable) {
      throw new BadRequestException('La sala no está disponible');
    }

    const reservation = this.reservationRepository.create({
      user,
      room,
      date: this.parseDate(createDto.date),
      startTime: createDto.startTime,
      endTime: createDto.endTime,
      notes: createDto.notes,
      status: ReservationStatus.CONFIRMED,
    });

    return this.reservationRepository.save(reservation);
  }

  async findAll(date?: string, userId?: string): Promise<Reservation[]> {
    const queryBuilder = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.user', 'user')
      .leftJoinAndSelect('reservation.room', 'room');

    if (date) {
      queryBuilder.andWhere('reservation.date = :date', {
        date: this.parseDate(date),
      });
    }

    if (userId) {
      queryBuilder.andWhere('reservation.userId = :userId', { userId });
    }

    queryBuilder.orderBy('reservation.date', 'ASC');
    queryBuilder.addOrderBy('reservation.startTime', 'ASC');

    return queryBuilder.getMany();
  }

  async findOne(id: string): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['user', 'room'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    return reservation;
  }

  async cancel(id: string, userId: string): Promise<Reservation> {
    const reservation = await this.findOne(id);

    if (reservation.user.id !== userId) {
      throw new ForbiddenException('No puedes cancelar esta reserva');
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('La reserva ya está cancelada');
    }

    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new BadRequestException('No se puede cancelar una reserva completada');
    }

    reservation.status = ReservationStatus.CANCELLED;
    return this.reservationRepository.save(reservation);
  }

  async update(id: string, updateDto: UpdateReservationDto, userId: string): Promise<Reservation> {
    const reservation = await this.findOne(id);

    if (reservation.user.id !== userId) {
      throw new ForbiddenException('No puedes modificar esta reserva');
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('No se puede modificar una reserva cancelada');
    }

    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new BadRequestException('No se puede modificar una reserva completada');
    }

    // Si hay cambios de horario, verificar solapamiento
    if (updateDto.date || updateDto.startTime || updateDto.endTime) {
      const newDate = updateDto.date || reservation.date.toISOString().split('T')[0];
      const newStartTime = updateDto.startTime || reservation.startTime;
      const newEndTime = updateDto.endTime || reservation.endTime;

      const overlapping = await this.checkOverlap(
        reservation.room.id,
        newDate,
        newStartTime,
        newEndTime,
        id, // Excluir esta reserva de la verificación
      );

      if (overlapping > 0) {
        throw new BadRequestException(
          'No se puede modificar: solapamiento de horario',
        );
      }

      if (updateDto.date) {
        reservation.date = this.parseDate(updateDto.date);
      }
    }

    if (updateDto.startTime) {
      reservation.startTime = updateDto.startTime;
    }
    if (updateDto.endTime) {
      reservation.endTime = updateDto.endTime;
    }
    if (updateDto.notes !== undefined) {
      reservation.notes = updateDto.notes;
    }

    return this.reservationRepository.save(reservation);
  }

  async remove(id: string, userId: string): Promise<void> {
    const reservation = await this.findOne(id);

    if (reservation.user.id !== userId) {
      throw new ForbiddenException('No puedes eliminar esta reserva');
    }

    await this.reservationRepository.remove(reservation);
  }

  async getUserReservations(userId: string): Promise<Reservation[]> {
    return this.reservationRepository.find({
      where: { user: { id: userId } as any },
      relations: ['room'],
      order: { date: 'DESC', startTime: 'DESC' },
    });
  }

  async getRoomReservations(roomId: string, date?: string): Promise<Reservation[]> {
    const queryBuilder = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.user', 'user')
      .where('reservation.roomId = :roomId', { roomId });

    if (date) {
      queryBuilder.andWhere('reservation.date = :date', {
        date: this.parseDate(date),
      });
    }

    queryBuilder.orderBy('reservation.startTime', 'ASC');

    return queryBuilder.getMany();
  }

  private async checkOverlap(
    roomId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeReservationId?: string,
  ): Promise<number> {
    const queryBuilder = this.reservationRepository
      .createQueryBuilder('r')
      .where('r.roomId = :roomId', { roomId })
      .andWhere('r.date = :date', { date: this.parseDate(date) })
      .andWhere('(r.startTime < :endTime AND r.endTime > :startTime)', {
        startTime,
        endTime,
      })
      .andWhere('r.status != :cancelledStatus', {
        cancelledStatus: ReservationStatus.CANCELLED,
      });

    if (excludeReservationId) {
      queryBuilder.andWhere('r.id != :excludeId', { excludeId: excludeReservationId });
    }

    return queryBuilder.getCount();
  }

  private parseDate(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date;
  }
}
