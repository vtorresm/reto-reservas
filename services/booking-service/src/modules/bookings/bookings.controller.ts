import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from '../../dto/create-booking.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nueva reserva' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Reserva creada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos o conflicto de horarios',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuario sin permisos suficientes',
  })
  async create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(createBookingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener reservas del usuario' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de reservas obtenida exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async findAll(@Query() query: any) {
    return this.bookingsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener reserva por ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reserva encontrada',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Reserva no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.findOne(id);
  }

  @Get(':id/calendar')
  @ApiOperation({ summary: 'Obtener vista de calendario para una reserva' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vista de calendario obtenida exitosamente',
  })
  async getCalendarView(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bookingsService.getCalendarView(id, { startDate, endDate });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar reserva' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reserva actualizada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Reserva no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuario sin permisos suficientes',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBookingDto: Partial<CreateBookingDto>,
  ) {
    return this.bookingsService.update(id, updateBookingDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancelar reserva' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Reserva cancelada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Reserva no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No se puede cancelar la reserva (fuera de tiempo)',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    await this.bookingsService.cancel(id);
  }

  @Post(':id/checkin')
  @ApiOperation({ summary: 'Registrar check-in de reserva' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Check-in registrado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Reserva no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No se puede hacer check-in',
  })
  async checkIn(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.checkIn(id);
  }

  @Post(':id/checkout')
  @ApiOperation({ summary: 'Registrar check-out de reserva' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Check-out registrado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Reserva no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No se puede hacer check-out',
  })
  async checkOut(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.checkOut(id);
  }

  @Get('user/:userId')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Obtener reservas de un usuario específico' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reservas del usuario obtenidas exitosamente',
  })
  async getUserBookings(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.bookingsService.getUserBookings(userId);
  }

  @Get('resource/:resourceId')
  @ApiOperation({ summary: 'Obtener reservas de un recurso específico' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reservas del recurso obtenidas exitosamente',
  })
  async getResourceBookings(@Param('resourceId', ParseUUIDPipe) resourceId: string) {
    return this.bookingsService.getResourceBookings(resourceId);
  }

  @Get('conflicts/check')
  @ApiOperation({ summary: 'Verificar conflictos de horarios' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verificación de conflictos completada',
  })
  async checkConflicts(
    @Query('resourceId') resourceId: string,
    @Query('date') date: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('excludeBookingId') excludeBookingId?: string,
  ) {
    return this.bookingsService.checkConflicts({
      resourceId,
      date,
      startTime,
      endTime,
      excludeBookingId,
    });
  }

  @Get('availability/check')
  @ApiOperation({ summary: 'Verificar disponibilidad para nueva reserva' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verificación de disponibilidad completada',
  })
  async checkAvailability(
    @Query('resourceId') resourceId: string,
    @Query('date') date: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.bookingsService.checkAvailability({
      resourceId,
      date,
      startTime,
      endTime,
    });
  }

  @Get('recurring/generate')
  @ApiOperation({ summary: 'Generar reservas recurrentes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reservas recurrentes generadas exitosamente',
  })
  async generateRecurringBookings(
    @Query('resourceId') resourceId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('pattern') pattern: string,
  ) {
    return this.bookingsService.generateRecurringBookings({
      resourceId,
      startDate,
      endDate,
      pattern: JSON.parse(pattern),
    });
  }

  @Get('reports/summary')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Obtener reporte resumen de reservas' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reporte generado exitosamente',
  })
  async getBookingSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bookingsService.getBookingSummary({ startDate, endDate });
  }
}