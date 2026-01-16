import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Availability } from '../../entities/availability.entity';

export interface ConflictCheck {
  resourceId: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  conflicts: Array<{
    type: 'busy' | 'blocked' | 'maintenance';
    startTime: string;
    endTime: string;
    reason?: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  canProceed: boolean;
  suggestions: string[];
}

export interface ConflictResolution {
  resolution: 'automatic' | 'manual' | 'alternative_found';
  newSlot?: {
    startTime: string;
    endTime: string;
    date: Date;
  };
  alternatives?: Array<{
    startTime: string;
    endTime: string;
    date: Date;
    score: number;
    reason: string;
  }>;
  message: string;
}

@Injectable()
export class ResourceConflictService {
  private readonly logger = new Logger(ResourceConflictService.name);

  constructor(
    @InjectModel(Availability.name) private availabilityModel: Model<Availability>,
  ) {}

  /**
   * Verifica conflictos para un horario específico
   */
  async checkConflicts(
    resourceId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<ConflictCheck> {
    try {
      const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const duration = this.calculateDuration(startTime, endTime);

      // Buscar slots conflictivos
      const conflicts = await this.findConflictingSlots(resourceId, targetDate, startTime, endTime);

      const conflictCheck: ConflictCheck = {
        resourceId,
        date: targetDate,
        startTime,
        endTime,
        duration,
        conflicts: conflicts.map(slot => ({
          type: this.determineConflictType(slot),
          startTime: slot.startTime,
          endTime: slot.endTime,
          reason: this.getConflictReason(slot),
          severity: this.calculateConflictSeverity(slot),
        })),
        canProceed: conflicts.length === 0,
        suggestions: this.generateConflictSuggestions(conflicts, duration),
      };

      return conflictCheck;
    } catch (error) {
      this.logger.error(`Error verificando conflictos: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Intenta resolver conflictos automáticamente
   */
  async resolveConflicts(
    resourceId: string,
    date: Date,
    startTime: string,
    endTime: string,
    options: {
      allowTimeShift?: boolean;
      allowDateShift?: boolean;
      maxAlternatives?: number;
    } = {},
  ): Promise<ConflictResolution> {
    try {
      const {
        allowTimeShift = true,
        allowDateShift = true,
        maxAlternatives = 5,
      } = options;

      const conflictCheck = await this.checkConflicts(resourceId, date, startTime, endTime);

      if (conflictCheck.canProceed) {
        return {
          resolution: 'automatic',
          message: 'No se encontraron conflictos',
        };
      }

      // Intentar resolver automáticamente
      if (allowTimeShift) {
        const timeShiftResolution = await this.tryResolveByTimeShift(
          resourceId,
          date,
          startTime,
          endTime,
          conflictCheck.conflicts,
        );

        if (timeShiftResolution.resolution === 'automatic') {
          return timeShiftResolution;
        }
      }

      // Buscar alternativas en otros días
      if (allowDateShift) {
        const alternatives = await this.findAlternativeSlots(
          resourceId,
          date,
          startTime,
          endTime,
          maxAlternatives,
        );

        if (alternatives.length > 0) {
          return {
            resolution: 'alternative_found',
            alternatives,
            message: `Se encontraron ${alternatives.length} alternativas disponibles`,
          };
        }
      }

      return {
        resolution: 'manual',
        message: 'No se pudo resolver automáticamente. Se requiere intervención manual.',
      };
    } catch (error) {
      this.logger.error(`Error resolviendo conflictos: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Encuentra slots alternativos disponibles
   */
  async findAlternativeSlots(
    resourceId: string,
    originalDate: Date,
    startTime: string,
    endTime: string,
    maxAlternatives: number = 5,
  ): Promise<Array<{
    startTime: string;
    endTime: string;
    date: Date;
    score: number;
    reason: string;
  }>> {
    try {
      const duration = this.calculateDuration(startTime, endTime);
      const alternatives: any[] = [];

      // Buscar en los próximos 7 días
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(originalDate);
        checkDate.setDate(checkDate.getDate() + i);

        // Saltar el día original si ya tiene conflictos
        if (i === 0) continue;

        const dayAlternatives = await this.findAlternativesForDay(
          resourceId,
          checkDate,
          startTime,
          duration,
        );

        alternatives.push(...dayAlternatives);
      }

      return alternatives
        .sort((a, b) => b.score - a.score)
        .slice(0, maxAlternatives);
    } catch (error) {
      this.logger.error(`Error buscando alternativas: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Gestiona conflictos en tiempo real
   */
  async handleRealTimeConflicts(
    resourceId: string,
    bookingId: string,
    originalSlot: { date: Date; startTime: string; endTime: string },
    newSlot: { date: Date; startTime: string; endTime: string },
  ): Promise<{
    success: boolean;
    action: 'updated' | 'cancelled' | 'rescheduled';
    message: string;
  }> {
    try {
      // Verificar si hay conflictos con el nuevo horario
      const conflictCheck = await this.checkConflicts(
        resourceId,
        newSlot.date,
        newSlot.startTime,
        newSlot.endTime,
      );

      if (conflictCheck.canProceed) {
        // No hay conflictos, proceder con la actualización
        return {
          success: true,
          action: 'updated',
          message: 'Horario actualizado sin conflictos',
        };
      }

      // Intentar resolver automáticamente
      const resolution = await this.resolveConflicts(
        resourceId,
        newSlot.date,
        newSlot.startTime,
        newSlot.endTime,
      );

      if (resolution.resolution === 'alternative_found' && resolution.alternatives) {
        // Usar la primera alternativa disponible
        const bestAlternative = resolution.alternatives[0];

        return {
          success: true,
          action: 'rescheduled',
          message: `Reserva reagendada automáticamente a ${bestAlternative.date.toDateString()} ${bestAlternative.startTime}`,
        };
      }

      // No se pudo resolver automáticamente
      return {
        success: false,
        action: 'cancelled',
        message: 'Conflicto de horarios detectado. La reserva ha sido cancelada.',
      };
    } catch (error) {
      this.logger.error(`Error manejando conflictos en tiempo real: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Métodos auxiliares privados

  private async findConflictingSlots(
    resourceId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<Availability[]> {
    return await this.availabilityModel.find({
      resourceId,
      date,
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime },
          status: { $in: ['busy', 'blocked'] },
        },
      ],
    });
  }

  private determineConflictType(slot: Availability): 'busy' | 'blocked' | 'maintenance' {
    if (slot.status === 'blocked') return 'blocked';
    if (slot.status === 'busy') return 'busy';
    return 'maintenance';
  }

  private getConflictReason(slot: Availability): string {
    if (slot.status === 'blocked') {
      return slot.blockReason || 'Horario bloqueado';
    }
    if (slot.status === 'busy') {
      return 'Horario ocupado por otra reserva';
    }
    return 'Recurso en mantenimiento';
  }

  private calculateConflictSeverity(slot: Availability): 'low' | 'medium' | 'high' {
    if (slot.status === 'blocked') return 'high';
    if (slot.status === 'busy') return 'medium';
    return 'low';
  }

  private generateConflictSuggestions(conflicts: Availability[], duration: number): string[] {
    const suggestions: string[] = [];

    if (conflicts.length === 0) {
      suggestions.push('Horario disponible - puede proceder con la reserva');
      return suggestions;
    }

    const busyConflicts = conflicts.filter(c => c.status === 'busy');
    const blockedConflicts = conflicts.filter(c => c.status === 'blocked');

    if (busyConflicts.length > 0) {
      suggestions.push('El horario solicitado está ocupado por otras reservas');
      suggestions.push('Considere horarios alternativos en el mismo día');
    }

    if (blockedConflicts.length > 0) {
      suggestions.push('Algunos horarios están bloqueados por mantenimiento');
      suggestions.push('Verifique el calendario de mantenimiento del recurso');
    }

    suggestions.push('Use la función de búsqueda de alternativas para encontrar horarios disponibles');

    return suggestions;
  }

  private async tryResolveByTimeShift(
    resourceId: string,
    date: Date,
    startTime: string,
    endTime: string,
    conflicts: any[],
  ): Promise<ConflictResolution> {
    const duration = this.calculateDuration(startTime, endTime);

    // Intentar mover el horario en incrementos de 30 minutos
    const timeShifts = [-60, -30, 30, 60, 90]; // minutos

    for (const shift of timeShifts) {
      const newStartMinutes = this.timeToMinutes(startTime) + shift;
      const newEndMinutes = newStartMinutes + duration;

      if (newStartMinutes < 0 || newEndMinutes > 24 * 60) continue;

      const newStartTime = this.minutesToTime(newStartMinutes);
      const newEndTime = this.minutesToTime(newEndMinutes);

      const shiftConflicts = await this.findConflictingSlots(
        resourceId,
        date,
        newStartTime,
        newEndTime,
      );

      if (shiftConflicts.length === 0) {
        return {
          resolution: 'automatic',
          newSlot: {
            startTime: newStartTime,
            endTime: newEndTime,
            date,
          },
          message: `Horario ajustado automáticamente en ${shift > 0 ? '+' : ''}${shift} minutos`,
        };
      }
    }

    return {
      resolution: 'manual',
      message: 'No se pudo encontrar un horario alternativo automáticamente',
    };
  }

  private async findAlternativesForDay(
    resourceId: string,
    date: Date,
    preferredStartTime: string,
    duration: number,
  ): Promise<any[]> {
    const alternatives: any[] = [];

    // Buscar slots disponibles en el día
    const availableSlots = await this.availabilityModel.find({
      resourceId,
      date,
      status: 'available',
    }).sort({ startTime: 1 });

    for (const slot of availableSlots) {
      const slotDuration = this.calculateDuration(slot.startTime, slot.endTime);

      if (slotDuration >= duration) {
        const score = this.calculateAlternativeScore(slot, preferredStartTime, duration);

        alternatives.push({
          startTime: slot.startTime,
          endTime: slot.endTime,
          date,
          score,
          reason: this.getAlternativeReason(slot, preferredStartTime),
        });
      }
    }

    return alternatives;
  }

  private calculateAlternativeScore(
    slot: Availability,
    preferredStartTime: string,
    duration: number,
  ): number {
    let score = 50; // Score base

    // Preferir horarios cercanos al horario original
    const preferredHour = parseInt(preferredStartTime.split(':')[0]);
    const slotHour = parseInt(slot.startTime.split(':')[0]);
    const hourDifference = Math.abs(preferredHour - slotHour);

    score -= hourDifference * 5; // Penalizar diferencia de horas

    // Bonificar slots con duración exacta
    const slotDuration = this.calculateDuration(slot.startTime, slot.endTime);
    if (slotDuration === duration) {
      score += 20;
    }

    // Bonificar horas pico
    if ((slotHour >= 9 && slotHour <= 11) || (slotHour >= 14 && slotHour <= 16)) {
      score += 15;
    }

    return score;
  }

  private getAlternativeReason(slot: Availability, preferredStartTime: string): string {
    const preferredHour = parseInt(preferredStartTime.split(':')[0]);
    const slotHour = parseInt(slot.startTime.split(':')[0]);
    const hourDifference = Math.abs(preferredHour - slotHour);

    if (hourDifference === 0) {
      return 'Mismo horario, diferente día';
    } else if (hourDifference <= 1) {
      return 'Horario similar disponible';
    } else {
      return 'Horario alternativo disponible';
    }
  }

  private calculateDuration(startTime: string, endTime: string): number {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    return endMinutes - startMinutes;
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
}