import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Calendar')
@Controller('calendar')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('resource/:resourceId')
  @ApiOperation({ summary: 'Obtener vista de calendario para un recurso' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vista de calendario obtenida exitosamente',
  })
  async getResourceCalendar(
    @Param('resourceId') resourceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    end.setDate(end.getDate() + 30);

    return this.calendarService.getCalendarView(resourceId, start, end);
  }

  @Get('utilization/:resourceId')
  @ApiOperation({ summary: 'Obtener métricas de utilización de un recurso' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Métricas de utilización obtenidas exitosamente',
  })
  async getResourceUtilization(
    @Param('resourceId') resourceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    end.setDate(end.getDate() + 30);

    return this.calendarService.getResourceUtilization(resourceId, start, end);
  }

  @Get('optimal-times/:resourceId')
  @ApiOperation({ summary: 'Obtener horarios óptimos para reservas' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Horarios óptimos obtenidos exitosamente',
  })
  async getOptimalBookingTimes(
    @Param('resourceId') resourceId: string,
    @Query('date') date: string,
    @Query('durationHours') durationHours: number,
  ) {
    return this.calendarService.getOptimalBookingTimes(
      resourceId,
      new Date(date),
      durationHours,
    );
  }

  @Post('conflicts/check')
  @ApiOperation({ summary: 'Verificar conflictos de horarios' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verificación de conflictos completada',
  })
  async checkConflicts(@Body() conflictDto: {
    resourceId: string;
    date: string;
    startTime: string;
    endTime: string;
    excludeBookingId?: string;
  }) {
    return this.calendarService.detectSchedulingConflicts(
      conflictDto.resourceId,
      new Date(conflictDto.date),
      conflictDto.startTime,
      conflictDto.endTime,
      conflictDto.excludeBookingId,
    );
  }
}