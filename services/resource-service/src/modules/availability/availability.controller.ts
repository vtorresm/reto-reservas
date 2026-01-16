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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Availability')
@Controller('availability')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nueva disponibilidad' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Disponibilidad creada exitosamente',
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
  async create(@Body() createAvailabilityDto: any) {
    return this.availabilityService.create(createAvailabilityDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener disponibilidad' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de disponibilidad obtenida exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async findAll(@Query() query: any) {
    return this.availabilityService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener disponibilidad por ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Disponibilidad encontrada',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Disponibilidad no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async findOne(@Param('id') id: string) {
    return this.availabilityService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Actualizar disponibilidad' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Disponibilidad actualizada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Disponibilidad no encontrada',
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
    @Param('id') id: string,
    @Body() updateAvailabilityDto: any,
  ) {
    return this.availabilityService.update(id, updateAvailabilityDto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar disponibilidad' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Disponibilidad eliminada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Disponibilidad no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuario sin permisos suficientes',
  })
  async remove(@Param('id') id: string) {
    await this.availabilityService.remove(id);
  }

  @Get('resource/:resourceId')
  @ApiOperation({ summary: 'Obtener disponibilidad de un recurso' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Disponibilidad del recurso obtenida exitosamente',
  })
  async getResourceAvailability(
    @Param('resourceId') resourceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return this.availabilityService.getAvailabilityForDateRange(resourceId, start, end);
  }

  @Post('block')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Bloquear horario' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Horario bloqueado exitosamente',
  })
  async blockTimeSlot(@Body() blockDto: {
    resourceId: string;
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
  }) {
    return this.availabilityService.blockTimeSlot(
      blockDto.resourceId,
      new Date(blockDto.date),
      blockDto.startTime,
      blockDto.endTime,
      blockDto.reason,
      'admin'
    );
  }

  @Post('unblock')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Desbloquear horario' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Horario desbloqueado exitosamente',
  })
  async unblockTimeSlot(@Body() unblockDto: {
    resourceId: string;
    date: string;
    startTime: string;
    endTime: string;
  }) {
    return this.availabilityService.unblockTimeSlot(
      unblockDto.resourceId,
      new Date(unblockDto.date),
      unblockDto.startTime,
      unblockDto.endTime,
      'admin'
    );
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
  ) {
    return this.availabilityService.getConflictingSlots(
      resourceId,
      new Date(date),
      startTime,
      endTime
    );
  }
}