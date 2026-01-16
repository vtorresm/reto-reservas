import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../entities/booking.entity';

export interface CalendarDay {
  date: Date;
  bookings: Array<{
    id: string;
    startTime: string;
    endTime: string;
    status: string;
    userId: string;
    purpose?: string;
    resourceId: string;
  }>;
  summary: {
    totalBookings: number;
    confirmedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    totalHours: number;
  };
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async getCalendarView(
    resourceId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CalendarDay[]> {
    try {
      const start = startDate || new Date();
      const end = endDate || new Date();
      end.setDate(end.getDate() + 30); // 30 días por defecto

      const bookings = await this.bookingRepository.find({
        where: {
          date: { $gte: start, $lte: end },
          ...(resourceId && { resourceId }),
        },
        order: { date: 'ASC', startTime: 'ASC' },
      });

      // Agrupar por fecha
      const calendarMap = new Map<string, CalendarDay>();

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        calendarMap.set(dateKey, {
          date: new Date(d),
          bookings: [],
          summary: {
            totalBookings: 0,
            confirmedBookings: 0,
            pendingBookings: 0,
            cancelledBookings: 0,
            totalHours: 0,
          },
        });
      }

      // Llenar datos de reservas
      bookings.forEach(booking => {
        const dateKey = booking.date.toISOString().split('T')[0];
        const day = calendarMap.get(dateKey);

        if (day) {
          const bookingData = {
            id: booking.id,
            startTime: booking.startTime,
            endTime: booking.endTime,
            status: booking.status,
            userId: booking.userId,
            purpose: booking.purpose,
            resourceId: booking.resourceId,
          };

          day.bookings.push(bookingData);

          // Actualizar resumen
          day.summary.totalBookings++;
          if (booking.status === 'confirmed') day.summary.confirmedBookings++;
          if (booking.status === 'pending') day.summary.pendingBookings++;
          if (booking.status === 'cancelled') day.summary.cancelledBookings++;
          day.summary.totalHours += booking.totalHours;
        }
      });

      return Array.from(calendarMap.values());
    } catch (error) {
      this.logger.error(`Error obteniendo vista de calendario: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getResourceUtilization(
    resourceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    resourceId: string;
    period: { startDate: Date; endDate: Date };
    utilization: {
      totalSlots: number;
      bookedSlots: number;
      availableSlots: number;
      utilizationRate: number;
      peakHours: string[];
      lowDemandHours: string[];
    };
    recommendations: string[];
  }> {
    try {
      const bookings = await this.bookingRepository.find({
        where: {
          resourceId,
          date: { $gte: startDate, $lte: endDate },
        },
      });

      // Calcular utilización por hora
      const hourlyUtilization = new Map<string, { total: number; booked: number }>();

      // Inicializar todas las horas del día
      for (let hour = 9; hour <= 18; hour++) {
        const timeKey = `${hour.toString().padStart(2, '0')}:00`;
        hourlyUtilization.set(timeKey, { total: 0, booked: 0 });
      }

      // Contar reservas por hora
      bookings.forEach(booking => {
        const hour = parseInt(booking.startTime.split(':')[0]);
        const timeKey = `${hour.toString().padStart(2, '0')}:00`;

        if (hourlyUtilization.has(timeKey)) {
          const stats = hourlyUtilization.get(timeKey)!;
          stats.total++;
          if (booking.status === 'confirmed') {
            stats.booked++;
          }
        }
      });

      // Calcular métricas
      const totalSlots = Array.from(hourlyUtilization.values()).reduce((sum, stats) => sum + stats.total, 0);
      const bookedSlots = Array.from(hourlyUtilization.values()).reduce((sum, stats) => sum + stats.booked, 0);
      const utilizationRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

      // Identificar horas pico y de baja demanda
      const peakHours: string[] = [];
      const lowDemandHours: string[] = [];

      hourlyUtilization.forEach((stats, hour) => {
        const utilization = stats.total > 0 ? (stats.booked / stats.total) * 100 : 0;

        if (utilization > 80) {
          peakHours.push(hour);
        } else if (utilization < 30) {
          lowDemandHours.push(hour);
        }
      });

      // Generar recomendaciones
      const recommendations: string[] = [];

      if (utilizationRate > 85) {
        recommendations.push('Considere expandir horarios de atención');
      }

      if (lowDemandHours.length > 0) {
        recommendations.push(`Considere reducir disponibilidad en horas de baja demanda: ${lowDemandHours.join(', ')}`);
      }

      return {
        resourceId,
        period: { startDate, endDate },
        utilization: {
          totalSlots,
          bookedSlots,
          availableSlots: totalSlots - bookedSlots,
          utilizationRate,
          peakHours,
          lowDemandHours,
        },
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Error obteniendo utilización del recurso: ${error.message}`, error.stack);
      throw error;
    }
  }

  async detectSchedulingConflicts(
    resourceId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeBookingId?: string,
  ): Promise<{
    hasConflicts: boolean;
    conflicts: Array<{
      bookingId: string;
      startTime: string;
      endTime: string;
      status: string;
      userId: string;
    }>;
    suggestions: string[];
  }> {
    try {
      const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      const conflictingBookings = await this.bookingRepository.find({
        where: {
          resourceId,
          date: targetDate,
          status: { $in: ['confirmed', 'pending'] },
          ...(excludeBookingId && { id: { $ne: excludeBookingId } }),
        },
      });

      const conflicts = conflictingBookings.filter(booking => {
        return this.timeSlotsOverlap(
          booking.startTime,
          booking.endTime,
          startTime,
          endTime,
        );
      }).map(booking => ({
        bookingId: booking.id,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        userId: booking.userId,
      }));

      const suggestions: string[] = [];

      if (conflicts.length > 0) {
        suggestions.push('El horario solicitado tiene conflictos con reservas existentes');
        suggestions.push('Considere horarios alternativos en el mismo día');
        suggestions.push('Verifique la disponibilidad en días cercanos');
      } else {
        suggestions.push('Horario disponible - puede proceder con la reserva');
      }

      return {
        hasConflicts: conflicts.length > 0,
        conflicts,
        suggestions,
      };
    } catch (error) {
      this.logger.error(`Error detectando conflictos: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getOptimalBookingTimes(
    resourceId: string,
    date: Date,
    durationHours: number,
  ): Promise<Array<{
    startTime: string;
    endTime: string;
    score: number;
    reason: string;
  }>> {
    try {
      const dayBookings = await this.bookingRepository.find({
        where: {
          resourceId,
          date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        },
        order: { startTime: 'ASC' },
      });

      const optimalTimes: any[] = [];
      const durationMinutes = durationHours * 60;

      // Generar posibles slots
      for (let hour = 9; hour <= 18; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const startMinutes = hour * 60 + minute;
          const endMinutes = startMinutes + durationMinutes;

          if (endMinutes > 18 * 60) break;

          const endTime = this.minutesToTime(endMinutes);

          // Verificar si hay conflictos
          const hasConflict = dayBookings.some(booking =>
            this.timeSlotsOverlap(booking.startTime, booking.endTime, startTime, endTime),
          );

          if (!hasConflict) {
            const score = this.calculateOptimalTimeScore(startTime, durationHours);
            const reason = this.getOptimalTimeReason(startTime, score);

            optimalTimes.push({
              startTime,
              endTime,
              score,
              reason,
            });
          }
        }
      }

      return optimalTimes
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    } catch (error) {
      this.logger.error(`Error obteniendo horarios óptimos: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Métodos auxiliares privados

  private timeSlotsOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    const start1Min = this.timeToMinutes(start1);
    const end1Min = this.timeToMinutes(end1);
    const start2Min = this.timeToMinutes(start2);
    const end2Min = this.timeToMinutes(end2);

    return start1Min < end2Min && start2Min < end1Min;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private calculateOptimalTimeScore(startTime: string, durationHours: number): number {
    let score = 50; // Score base

    const hour = parseInt(startTime.split(':')[0]);

    // Bonificar horas pico (9-11, 14-16)
    if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16)) {
      score += 30;
    }

    // Penalizar horas de almuerzo (12-14)
    if (hour >= 12 && hour <= 14) {
      score -= 20;
    }

    // Bonificar slots más largos
    if (durationHours >= 2) {
      score += 15;
    }

    return score;
  }

  private getOptimalTimeReason(startTime: string, score: number): string {
    const hour = parseInt(startTime.split(':')[0]);

    if (score > 80) {
      return 'Horario óptimo con alta demanda';
    } else if (score > 60) {
      return 'Buen horario disponible';
    } else if (hour >= 12 && hour <= 14) {
      return 'Horario de almuerzo - menor demanda';
    } else {
      return 'Horario disponible';
    }
  }
}