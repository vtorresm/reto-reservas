import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from '../../entities/booking.entity';
import { BookingPolicy } from '../../entities/booking-policy.entity';
import { InterserviceCommunicationService } from '../../common/services/interservice-communication.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingPolicy]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, InterserviceCommunicationService],
  exports: [BookingsService],
})
export class BookingsModule {}