import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ReservationsService, UpdateReservationDto } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @UsePipes(ValidationPipe)
  create(@Body() createDto: CreateReservationDto) {
    return this.reservationsService.create(createDto);
  }

  @Get()
  findAll(@Query('date') date?: string, @Query('userId') userId?: string) {
    return this.reservationsService.findAll(date, userId);
  }

  @Get('user/:userId')
  getUserReservations(@Param('userId') userId: string) {
    return this.reservationsService.getUserReservations(userId);
  }

  @Get('room/:roomId')
  getRoomReservations(
    @Param('roomId') roomId: string,
    @Query('date') date?: string,
  ) {
    return this.reservationsService.getRoomReservations(roomId, date);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateReservationDto,
    @Query('userId') userId: string,
  ) {
    return this.reservationsService.update(id, updateDto, userId);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string, @Query('userId') userId: string) {
    return this.reservationsService.cancel(id, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Query('userId') userId: string) {
    return this.reservationsService.remove(id, userId);
  }
}
