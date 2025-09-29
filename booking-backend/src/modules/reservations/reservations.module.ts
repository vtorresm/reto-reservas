import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { Reservation } from '../../entities/reservation.entity';
import { User } from '../../entities/user.entity';
import { Room } from '../../entities/room.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, User, Room])],
  providers: [ReservationsService],
  controllers: [ReservationsController],
})
export class ReservationsModule {}
