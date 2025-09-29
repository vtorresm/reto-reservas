import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @UsePipes(ValidationPipe)
  create(@Body() createDto: CreateReservationDto) {
    return this.reservationsService.create(createDto);
  }

  @Get()
  findAll(@Query('date') date?: string) {
    return this.reservationsService.findAll(date);
  }
}
