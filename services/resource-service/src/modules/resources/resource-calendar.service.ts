import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resource } from '../../entities/resource.entity';
import { Availability } from '../../entities/availability.entity';

export interface CalendarSlot {
  date: Date;
  startTime: string;
  endTime: string;
  status: 'available' | 'busy' | 'blocked' | 'maintenance';
  resourceId: string;
  resourceName: string;
  bookingId?: string;
  isOptimal?: boolean;
}

export interface CalendarView {
  date: Date;
  slots: CalendarSlot[];
  summary: {
    total: number;
    available: number;
    busy: number;
    blocked: number;
    efficiency: number;
  };
}

@Injectable()
export class ResourceCalendarService {
  private readonly logger = new Logger(ResourceCalendarService.name);

  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<Resource>,
    @InjectModel(Availability.name) private availabilityModel: Model<Availability>,
  ) {}

  /**
   * Obtiene vista de calendario para un recurso específico
   */
  async getResourceCalendar(
    resourceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarView[]> {
    try {
      const resource = await this.resourceModel.findById(resourceId);
      if (!resource) {
        throw new Error(`Recurso no encontrado: ${resourceId}`);
      }

      const calendarViews: CalendarView[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const daySlots = await this.getDayCalendarView(resourceId, currentDate);
        calendarViews.push(daySlots);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return calendarViews;
    } catch (error) {
      this.logger.error(`Error obteniendo calendario del recurso: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene vista de calendario para múltiples recursos
   */
  async getMultiResourceCalendar(
    resourceIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Map<string, CalendarView[]>> {
    try {
      const calendarMap = new Map<string, CalendarView[]>();

      const calendarPromises = resourceIds.map(async (resourceId) => {
        const calendar = await this.getResourceCalendar(resourceId, startDate, endDate);
        return { resourceId, calendar };
      });

      const results = await Promise.all(calendarPromises);

      results.forEach(({ resourceId, calendar }) => {
        calendarMap.set(resourceId, calendar);
      });

      return calendarMap;
    } catch (error) {
      this.logger.error(`Error obteniendo calendario multi-recurso: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Encuentra slots disponibles para una duración específica
   */
  async findAvailableSlots(
    resourceId: string,
    date: Date,
    durationHours: number,
    options: {
      startTime?: string;
      endTime?: string;
      allowSplitSlots?: boolean;
    } = {},
  ): Promise<CalendarSlot[]> {
    try {
      const { startTime = '09:00', endTime = '18:00', allowSplitSlots = false } = options;

      const dayStart = new Date(date);
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      dayStart.setHours(startHour, startMin, 0, 0);

      // Obtener todos los slots del día
      const daySlots = await this.availabilityModel.find({
        resourceId,
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      }).sort({ startTime: 1 });

      const availableSlots: CalendarSlot[] = [];
      let currentSlotStart: string | null = null;

      for (const slot of daySlots) {
        if (slot.status === 'available') {
          if (!currentSlotStart) {
            currentSlotStart = slot.startTime;
          }

          const slotDuration = this.calculateSlotDuration(slot.startTime, slot.endTime);

          if (slotDuration >= durationHours * 60) { // Convertir horas a minutos
            availableSlots.push({
              date: slot.date,
              startTime: currentSlotStart,
              endTime: slot.endTime,
              status: 'available',
              resourceId,
              resourceName: '', // Se llenaría desde el recurso
              isOptimal: this.isOptimalTimeSlot(currentSlotStart, slot.endTime),
            });
            currentSlotStart = null;
          }
        } else {
          currentSlotStart = null;
        }
      }

      return availableSlots;
    } catch (error) {
      this.logger.error(`Error buscando slots disponibles: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Identifica slots óptimos basados en patrones de uso
   */
  async identifyOptimalSlots(
    resourceId: string,
    date: Date,
    durationHours: number,
  ): Promise<CalendarSlot[]> {
    try {
      const allSlots = await this.findAvailableSlots(resourceId, date, durationHours);

      return allSlots
        .map(slot => ({
          ...slot,
          score: this.calculateSlotScore(slot),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5) // Top 5 slots óptimos
        .map(({ score, ...slot }) => ({
          ...slot,
          isOptimal: true,
        }));
    } catch (error) {
      this.logger.error(`Error identificando slots óptimos: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Genera sugerencias de horarios alternativos
   */
  async suggestAlternativeTimes(
    resourceId: string,
    preferredDate: Date,
    durationHours: number,
    options: {
      daysRange?: number;
      excludeWeekends?: boolean;
    } = {},
  ): Promise<Array<{
    date: Date;
    startTime: string;
    endTime: string;
    reason: string;
    score: number;
  }>> {
    try {
      const { daysRange = 7, excludeWeekends = false } = options;
      const suggestions: any[] = [];

      for (let i = 0; i < daysRange; i++) {
        const checkDate = new Date(preferredDate);
        checkDate.setDate(checkDate.getDate() + i);

        // Excluir fines de semana si está configurado
        if (excludeWeekends && (checkDate.getDay() === 0 || checkDate.getDay() === 6)) {
          continue;
        }

        const optimalSlots = await this.identifyOptimalSlots(resourceId, checkDate, durationHours);

        optimalSlots.forEach(slot => {
          suggestions.push({
            date: checkDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            reason: this.getSuggestionReason(slot, i),
            score: slot.score || 0,
          });
        });
      }

      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    } catch (error) {
      this.logger.error(`Error generando sugerencias alternativas: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Analiza patrones de uso del calendario
   */
  async analyzeCalendarPatterns(
    resourceId: string,
    timeRange: { startDate: Date; endDate: Date },
  ): Promise<{
    peakHours: string[];
    lowDemandHours: string[];
    averageUtilization: number;
    recommendations: string[];
  }> {
    try {
      const availability = await this.availabilityModel.find({
        resourceId,
        date: { $gte: timeRange.startDate, $lte: timeRange.endDate },
      });

      const hourlyStats = new Map<string, { total: number; busy: number }>();

      // Inicializar estadísticas por hora
      for (let hour = 9; hour <= 18; hour++) {
        const timeKey = `${hour.toString().padStart(2, '0')}:00`;
        hourlyStats.set(timeKey, { total: 0, busy: 0 });
      }

      // Calcular estadísticas
      availability.forEach(slot => {
        const hour = slot.startTime.split(':')[0];
        const timeKey = `${hour}:00`;

        if (hourlyStats.has(timeKey)) {
          const stats = hourlyStats.get(timeKey)!;
          stats.total++;
          if (slot.status === 'busy') {
            stats.busy++;
          }
        }
      });

      // Identificar horas pico y de baja demanda
      const peakHours: string[] = [];
      const lowDemandHours: string[] = [];
      let totalSlots = 0;
      let busySlots = 0;

      hourlyStats.forEach((stats, hour) => {
        totalSlots += stats.total;
        busySlots += stats.busy;

        const utilization = stats.total > 0 ? (stats.busy / stats.total) * 100 : 0;

        if (utilization > 80) {
          peakHours.push(hour);
        } else if (utilization < 30) {
          lowDemandHours.push(hour);
        }
      });

      const averageUtilization = totalSlots > 0 ? (busySlots / totalSlots) * 100 : 0;

      // Generar recomendaciones
      const recommendations: string[] = [];

      if (averageUtilization > 85) {
        recommendations.push('Considere expandir horarios de atención');
      }

      if (lowDemandHours.length > 0) {
        recommendations.push(`Considere reducir disponibilidad en horas de baja demanda: ${lowDemandHours.join(', ')}`);
      }

      if (peakHours.length > 0) {
        recommendations.push(`Horas de mayor demanda identificadas: ${peakHours.join(', ')}`);
      }

      return {
        peakHours,
        lowDemandHours,
        averageUtilization,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Error analizando patrones de calendario: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Métodos auxiliares privados

  private async getDayCalendarView(resourceId: string, date: Date): Promise<CalendarView> {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const slots = await this.availabilityModel.find({
      resourceId,
      date: dayStart,
    }).sort({ startTime: 1 });

    const calendarSlots: CalendarSlot[] = slots.map(slot => ({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: slot.status as any,
      resourceId,
      resourceName: '', // Se obtendría del recurso
      bookingId: slot.bookingId?.toString(),
      isOptimal: this.isOptimalTimeSlot(slot.startTime, slot.endTime),
    }));

    const available = calendarSlots.filter(slot => slot.status === 'available').length;
    const busy = calendarSlots.filter(slot => slot.status === 'busy').length;
    const blocked = calendarSlots.filter(slot => slot.status === 'blocked').length;
    const total = calendarSlots.length;

    return {
      date: dayStart,
      slots: calendarSlots,
      summary: {
        total,
        available,
        busy,
        blocked,
        efficiency: total > 0 ? (busy / total) * 100 : 0,
      },
    };
  }

  private calculateSlotScore(slot: CalendarSlot): number {
    let score = 50; // Score base

    // Bonificar horas pico (9-11, 14-16)
    const hour = parseInt(slot.startTime.split(':')[0]);
    if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16)) {
      score += 30;
    }

    // Penalizar horas de almuerzo (12-14)
    if (hour >= 12 && hour <= 14) {
      score -= 20;
    }

    // Bonificar slots más largos
    const duration = this.calculateSlotDuration(slot.startTime, slot.endTime);
    if (duration >= 120) { // 2 horas o más
      score += 15;
    }

    return score;
  }

  private isOptimalTimeSlot(startTime: string, endTime: string): boolean {
    const hour = parseInt(startTime.split(':')[0]);
    const duration = this.calculateSlotDuration(startTime, endTime);

    // Considerar óptimo si está en horas pico y tiene duración adecuada
    const isPeakHour = (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16);
    const hasGoodDuration = duration >= 60 && duration <= 240; // 1-4 horas

    return isPeakHour && hasGoodDuration;
  }

  private calculateSlotDuration(startTime: string, endTime: string): number {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    return endMinutes - startMinutes;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private getSuggestionReason(slot: CalendarSlot, daysOffset: number): string {
    if (daysOffset === 0) {
      return 'Horario alternativo para hoy';
    } else if (daysOffset === 1) {
      return 'Horario sugerido para mañana';
    } else if (daysOffset <= 3) {
      return `Horario sugerido en ${daysOffset} días`;
    } else {
      return 'Horario sugerido para la próxima semana';
    }
  }
}