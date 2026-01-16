import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resource } from '../../entities/resource.entity';
import { Availability } from '../../entities/availability.entity';

export interface AvailabilitySlot {
  date: Date;
  startTime: string;
  endTime: string;
  duration: number; // en minutos
  resourceId: string;
  isOptimal?: boolean;
  score?: number;
}

export interface OptimizationResult {
  resourceId: string;
  originalSlots: number;
  optimizedSlots: number;
  efficiency: number;
  recommendations: string[];
}

@Injectable()
export class AvailabilityOptimizerService {
  private readonly logger = new Logger(AvailabilityOptimizerService.name);

  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<Resource>,
    @InjectModel(Availability.name) private availabilityModel: Model<Availability>,
  ) {}

  /**
   * Optimiza la disponibilidad de un recurso basado en patrones de uso
   */
  async optimizeResourceAvailability(
    resourceId: string,
    startDate: Date,
    endDate: Date,
    options: {
      analyzeUsage?: boolean;
      consolidateSlots?: boolean;
      predictDemand?: boolean;
      maxSlotsPerDay?: number;
    } = {},
  ): Promise<OptimizationResult> {
    try {
      this.logger.log(`Optimizando disponibilidad para recurso ${resourceId}`);

      const resource = await this.resourceModel.findById(resourceId);
      if (!resource) {
        throw new Error(`Recurso no encontrado: ${resourceId}`);
      }

      // Obtener slots existentes
      const existingSlots = await this.availabilityModel.find({
        resourceId,
        date: { $gte: startDate, $lte: endDate },
      });

      let optimizedSlots = [...existingSlots];

      // 1. Análisis de uso histórico
      if (options.analyzeUsage) {
        const usageAnalysis = await this.analyzeUsagePatterns(resourceId, startDate, endDate);
        optimizedSlots = this.applyUsageBasedOptimization(optimizedSlots, usageAnalysis);
      }

      // 2. Consolidación de slots
      if (options.consolidateSlots) {
        optimizedSlots = this.consolidateSlots(optimizedSlots);
      }

      // 3. Predicción de demanda
      if (options.predictDemand) {
        const demandPrediction = await this.predictDemand(resourceId, startDate, endDate);
        optimizedSlots = this.applyDemandBasedOptimization(optimizedSlots, demandPrediction);
      }

      // 4. Limitar slots por día
      if (options.maxSlotsPerDay) {
        optimizedSlots = this.limitSlotsPerDay(optimizedSlots, options.maxSlotsPerDay);
      }

      // Calcular métricas de optimización
      const result: OptimizationResult = {
        resourceId,
        originalSlots: existingSlots.length,
        optimizedSlots: optimizedSlots.length,
        efficiency: this.calculateEfficiency(existingSlots, optimizedSlots),
        recommendations: this.generateRecommendations(resource, existingSlots, optimizedSlots),
      };

      this.logger.log(`Optimización completada para recurso ${resourceId}: ${result.efficiency}% eficiencia`);
      return result;
    } catch (error) {
      this.logger.error(`Error optimizando disponibilidad: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Genera slots de disponibilidad óptimos para un recurso
   */
  async generateOptimalSlots(
    resourceId: string,
    startDate: Date,
    endDate: Date,
    options: {
      slotDuration?: number; // en minutos
      breakDuration?: number; // en minutos
      maxSlotsPerDay?: number;
      considerResourceType?: boolean;
    } = {},
  ): Promise<Availability[]> {
    try {
      const resource = await this.resourceModel.findById(resourceId);
      if (!resource) {
        throw new Error(`Recurso no encontrado: ${resourceId}`);
      }

      const {
        slotDuration = 60, // 1 hora por defecto
        breakDuration = 15, // 15 minutos de descanso
        maxSlotsPerDay = 12,
        considerResourceType = true,
      } = options;

      const slots: Availability[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const daySlots = await this.generateOptimalSlotsForDay(
          resource,
          currentDate,
          slotDuration,
          breakDuration,
          maxSlotsPerDay,
          considerResourceType,
        );

        slots.push(...daySlots);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return slots;
    } catch (error) {
      this.logger.error(`Error generando slots óptimos: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Detecta y resuelve conflictos de disponibilidad
   */
  async detectAndResolveConflicts(
    resourceId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<{
    conflicts: Availability[];
    resolution: 'resolved' | 'manual_action_required';
    suggestions: string[];
  }> {
    try {
      const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      // Buscar slots conflictivos
      const conflicts = await this.availabilityModel.find({
        resourceId,
        date: targetDate,
        $or: [
          {
            startTime: { $lt: endTime },
            endTime: { $gt: startTime },
          },
        ],
      });

      if (conflicts.length === 0) {
        return {
          conflicts: [],
          resolution: 'resolved',
          suggestions: ['No se detectaron conflictos'],
        };
      }

      // Intentar resolver automáticamente
      const resolution = await this.resolveConflictsAutomatically(conflicts, {
        resourceId,
        date,
        startTime,
        endTime,
      });

      return {
        conflicts,
        resolution,
        suggestions: this.generateConflictSuggestions(conflicts),
      };
    } catch (error) {
      this.logger.error(`Error detectando conflictos: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calcula la ocupación óptima para maximizar ingresos
   */
  async calculateOptimalOccupancy(
    resourceId: string,
    timeRange: { startDate: Date; endDate: Date },
  ): Promise<{
    optimalSlots: number;
    expectedOccupancy: number;
    revenueOptimization: number;
    recommendations: string[];
  }> {
    try {
      const resource = await this.resourceModel.findById(resourceId);
      if (!resource) {
        throw new Error(`Recurso no encontrado: ${resourceId}`);
      }

      // Análisis de patrones históricos
      const historicalData = await this.getHistoricalOccupancy(resourceId, timeRange);
      const demandPatterns = await this.analyzeDemandPatterns(resourceId, timeRange);

      // Calcular métricas
      const avgOccupancy = this.calculateAverageOccupancy(historicalData);
      const peakHours = this.identifyPeakHours(demandPatterns);
      const optimalSlots = this.calculateOptimalSlotCount(resource, avgOccupancy, peakHours);

      // Simular diferentes escenarios
      const scenarios = await this.simulateOccupancyScenarios(
        resource,
        optimalSlots,
        historicalData,
      );

      const bestScenario = scenarios.reduce((best, current) =>
        current.expectedRevenue > best.expectedRevenue ? current : best,
      );

      return {
        optimalSlots,
        expectedOccupancy: bestScenario.expectedOccupancy,
        revenueOptimization: bestScenario.expectedRevenue,
        recommendations: this.generateOccupancyRecommendations(
          resource,
          historicalData,
          bestScenario,
        ),
      };
    } catch (error) {
      this.logger.error(`Error calculando ocupación óptima: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Métodos auxiliares privados

  private async analyzeUsagePatterns(
    resourceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    // Análisis de patrones de uso basado en datos históricos
    // Por simplicidad, retornamos datos simulados
    return {
      peakHours: ['09:00', '14:00', '18:00'],
      lowDemandHours: ['12:00', '17:00'],
      averageUtilization: 0.75,
      seasonalTrends: 'increasing',
    };
  }

  private applyUsageBasedOptimization(
    slots: Availability[],
    usageAnalysis: any,
  ): Availability[] {
    // Aplicar optimizaciones basadas en patrones de uso
    return slots.filter(slot => {
      const hour = parseInt(slot.startTime.split(':')[0]);
      const isPeakHour = usageAnalysis.peakHours.some((peak: string) =>
        parseInt(peak.split(':')[0]) === hour,
      );

      // Mantener slots en horas pico, reducir en horas de baja demanda
      if (usageAnalysis.lowDemandHours.some((low: string) =>
        parseInt(low.split(':')[0]) === hour,
      )) {
        // Reducir slots en horas de baja demanda
        return Math.random() > 0.3; // Mantener 70% de slots
      }

      return true;
    });
  }

  private consolidateSlots(slots: Availability[]): Availability[] {
    // Consolidar slots adyacentes
    const sortedSlots = slots.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime() ||
      a.startTime.localeCompare(b.startTime),
    );

    const consolidated: Availability[] = [];
    let currentSlot: Availability | null = null;

    for (const slot of sortedSlots) {
      if (!currentSlot) {
        currentSlot = { ...slot };
        continue;
      }

      // Verificar si el slot actual es adyacente al anterior
      const currentEnd = this.timeToMinutes(currentSlot.endTime);
      const slotStart = this.timeToMinutes(slot.startTime);
      const sameDay = new Date(currentSlot.date).getTime() === new Date(slot.date).getTime();

      if (sameDay && slotStart === currentEnd) {
        // Consolidar slots
        currentSlot.endTime = slot.endTime;
      } else {
        consolidated.push(currentSlot);
        currentSlot = { ...slot };
      }
    }

    if (currentSlot) {
      consolidated.push(currentSlot);
    }

    return consolidated;
  }

  private async predictDemand(
    resourceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    // Predicción de demanda basada en datos históricos
    return {
      highDemandDays: ['monday', 'tuesday', 'wednesday'],
      highDemandPeriods: ['09:00-11:00', '14:00-16:00'],
      expectedUtilization: 0.85,
    };
  }

  private applyDemandBasedOptimization(
    slots: Availability[],
    demandPrediction: any,
  ): Availability[] {
    // Ajustar slots basado en predicción de demanda
    return slots.map(slot => {
      const dayOfWeek = new Date(slot.date).toLocaleLowerCase();
      const isHighDemandDay = demandPrediction.highDemandDays.includes(dayOfWeek);

      if (isHighDemandDay) {
        // Aumentar disponibilidad en días de alta demanda
        slot.status = 'available';
      }

      return slot;
    });
  }

  private limitSlotsPerDay(slots: Availability[], maxSlots: number): Availability[] {
    // Limitar número de slots por día
    const slotsByDay = new Map<string, Availability[]>();

    slots.forEach(slot => {
      const dayKey = slot.date.toDateString();
      if (!slotsByDay.has(dayKey)) {
        slotsByDay.set(dayKey, []);
      }
      slotsByDay.get(dayKey)!.push(slot);
    });

    const limitedSlots: Availability[] = [];
    slotsByDay.forEach(daySlots => {
      // Ordenar por puntuación y mantener los mejores
      const sortedSlots = daySlots
        .map(slot => ({
          slot,
          score: this.calculateSlotScore(slot),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, maxSlots)
        .map(item => item.slot);

      limitedSlots.push(...sortedSlots);
    });

    return limitedSlots;
  }

  private calculateSlotScore(slot: Availability): number {
    // Calcular puntuación basada en hora del día y otros factores
    const hour = parseInt(slot.startTime.split(':')[0]);
    let score = 50; // Base score

    // Bonificar horas pico (9-11, 14-16)
    if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16)) {
      score += 30;
    }

    // Penalizar horas de almuerzo (12-14)
    if (hour >= 12 && hour <= 14) {
      score -= 20;
    }

    // Bonificar fines de semana para eventos sociales
    const dayOfWeek = new Date(slot.date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      score += 10;
    }

    return score;
  }

  private async generateOptimalSlotsForDay(
    resource: Resource,
    date: Date,
    slotDuration: number,
    breakDuration: number,
    maxSlots: number,
    considerResourceType: boolean,
  ): Promise<Availability[]> {
    const slots: Availability[] = [];

    // Determinar horarios óptimos basado en tipo de recurso
    let operatingHours = { start: '09:00', end: '18:00' };

    if (considerResourceType) {
      switch (resource.type) {
        case 'meeting_room':
          operatingHours = { start: '08:00', end: '20:00' };
          break;
        case 'private_office':
          operatingHours = { start: '08:00', end: '20:00' };
          break;
        case 'shared_desk':
          operatingHours = { start: '07:00', end: '22:00' };
          break;
        case 'event_space':
          operatingHours = { start: '08:00', end: '24:00' };
          break;
      }
    }

    const dayStartMinutes = this.timeToMinutes(operatingHours.start);
    const dayEndMinutes = this.timeToMinutes(operatingHours.end);
    const totalOperatingMinutes = dayEndMinutes - dayStartMinutes;

    const maxPossibleSlots = Math.floor(totalOperatingMinutes / (slotDuration + breakDuration));

    for (let i = 0; i < Math.min(maxSlots, maxPossibleSlots); i++) {
      const slotStartMinutes = dayStartMinutes + (i * (slotDuration + breakDuration));
      const slotEndMinutes = slotStartMinutes + slotDuration;

      if (slotEndMinutes > dayEndMinutes) break;

      const slot = new this.availabilityModel({
        resourceId: resource.id,
        date: new Date(date),
        startTime: this.minutesToTime(slotStartMinutes),
        endTime: this.minutesToTime(slotEndMinutes),
        status: 'available',
      });

      slots.push(slot);
    }

    return slots;
  }

  private async resolveConflictsAutomatically(
    conflicts: Availability[],
    newSlot: { resourceId: string; date: Date; startTime: string; endTime: string },
  ): Promise<'resolved' | 'manual_action_required'> {
    // Intentar resolver conflictos automáticamente
    // Por ejemplo, ajustar horarios, encontrar slots alternativos, etc.

    // Si hay muchos conflictos, requerir acción manual
    if (conflicts.length > 5) {
      return 'manual_action_required';
    }

    // Intentar ajustar el horario del nuevo slot
    const adjustedSlot = this.findAlternativeSlot(conflicts, newSlot);
    if (adjustedSlot) {
      return 'resolved';
    }

    return 'manual_action_required';
  }

  private findAlternativeSlot(
    conflicts: Availability[],
    newSlot: { resourceId: string; date: Date; startTime: string; endTime: string },
  ): { startTime: string; endTime: string } | null {
    // Buscar slots alternativos cercanos
    const newSlotStart = this.timeToMinutes(newSlot.startTime);
    const newSlotEnd = this.timeToMinutes(newSlot.endTime);
    const duration = newSlotEnd - newSlotStart;

    // Buscar gaps entre conflictos
    const sortedConflicts = conflicts.sort((a, b) =>
      this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime),
    );

    for (let i = 0; i < sortedConflicts.length - 1; i++) {
      const currentEnd = this.timeToMinutes(sortedConflicts[i].endTime);
      const nextStart = this.timeToMinutes(sortedConflicts[i + 1].startTime);
      const gap = nextStart - currentEnd;

      if (gap >= duration) {
        return {
          startTime: this.minutesToTime(currentEnd),
          endTime: this.minutesToTime(currentEnd + duration),
        };
      }
    }

    return null;
  }

  private generateConflictSuggestions(conflicts: Availability[]): string[] {
    const suggestions: string[] = [];

    if (conflicts.length > 3) {
      suggestions.push('Considere reagendar para otro horario con menos conflictos');
    }

    if (conflicts.some(c => c.status === 'blocked')) {
      suggestions.push('Algunos horarios están bloqueados por mantenimiento');
    }

    suggestions.push('Verifique la disponibilidad en días alternativos');

    return suggestions;
  }

  private async getHistoricalOccupancy(
    resourceId: string,
    timeRange: { startDate: Date; endDate: Date },
  ): Promise<any[]> {
    // Obtener datos históricos de ocupación
    // Por simplicidad, retornamos datos simulados
    return [
      { date: '2024-01-15', occupancy: 0.85, revenue: 150.00 },
      { date: '2024-01-16', occupancy: 0.72, revenue: 120.00 },
      { date: '2024-01-17', occupancy: 0.90, revenue: 180.00 },
    ];
  }

  private calculateAverageOccupancy(historicalData: any[]): number {
    if (historicalData.length === 0) return 0;
    return historicalData.reduce((sum, data) => sum + data.occupancy, 0) / historicalData.length;
  }

  private identifyPeakHours(demandPatterns: any[]): string[] {
    // Identificar horas de mayor demanda
    return ['09:00', '10:00', '14:00', '15:00'];
  }

  private calculateOptimalSlotCount(
    resource: Resource,
    avgOccupancy: number,
    peakHours: string[],
  ): number {
    // Calcular número óptimo de slots basado en ocupación y tipo de recurso
    const baseSlots = Math.ceil(resource.capacity * 1.5);
    const occupancyMultiplier = avgOccupancy > 0.8 ? 1.2 : 1.0;

    return Math.ceil(baseSlots * occupancyMultiplier);
  }

  private async simulateOccupancyScenarios(
    resource: Resource,
    slotCount: number,
    historicalData: any[],
  ): Promise<any[]> {
    // Simular diferentes escenarios de ocupación
    const scenarios = [
      { slots: slotCount * 0.8, efficiency: 0.85 },
      { slots: slotCount, efficiency: 0.90 },
      { slots: slotCount * 1.2, efficiency: 0.75 },
    ];

    return scenarios.map(scenario => ({
      slots: scenario.slots,
      expectedOccupancy: scenario.efficiency,
      expectedRevenue: scenario.slots * resource.pricePerHour * scenario.efficiency,
    }));
  }

  private generateOccupancyRecommendations(
    resource: Resource,
    historicalData: any[],
    bestScenario: any,
  ): string[] {
    const recommendations: string[] = [];

    if (bestScenario.expectedOccupancy > 0.9) {
      recommendations.push('Considere aumentar precios en horas pico');
    }

    if (historicalData.some(data => data.occupancy < 0.5)) {
      recommendations.push('Considere reducir slots en horarios de baja demanda');
    }

    recommendations.push(`Número óptimo de slots: ${Math.round(bestScenario.slots)}`);

    return recommendations;
  }

  private calculateEfficiency(originalSlots: Availability[], optimizedSlots: Availability[]): number {
    if (originalSlots.length === 0) return 100;

    // Calcular eficiencia basada en reducción de slots sin perder cobertura
    const efficiency = (optimizedSlots.length / originalSlots.length) * 100;
    return Math.round(efficiency * 100) / 100;
  }

  private generateRecommendations(
    resource: Resource,
    originalSlots: Availability[],
    optimizedSlots: Availability[],
  ): string[] {
    const recommendations: string[] = [];

    if (optimizedSlots.length < originalSlots.length) {
      recommendations.push(`Reducción de ${originalSlots.length - optimizedSlots.length} slots para optimizar eficiencia`);
    }

    if (resource.type === 'meeting_room') {
      recommendations.push('Considere slots de 30 minutos para reuniones rápidas');
    }

    if (resource.type === 'event_space') {
      recommendations.push('Considere slots más largos para eventos');
    }

    return recommendations;
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