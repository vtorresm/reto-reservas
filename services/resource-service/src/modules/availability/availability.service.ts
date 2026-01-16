import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Availability } from '../../entities/availability.entity';

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    @InjectModel(Availability.name) private availabilityModel: Model<Availability>,
  ) {}

  async create(createAvailabilityDto: any): Promise<Availability> {
    try {
      this.logger.log(`Creando nueva disponibilidad`);

      const availability = new this.availabilityModel(createAvailabilityDto);
      return await availability.save();
    } catch (error) {
      this.logger.error(`Error creando disponibilidad: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(query: any = {}): Promise<Availability[]> {
    try {
      const {
        resourceId,
        date,
        startTime,
        endTime,
        status,
        page = 1,
        limit = 50
      } = query;

      const filters: any = {};

      if (resourceId) {
        filters.resourceId = resourceId;
      }

      if (date) {
        filters.date = new Date(date);
      }

      if (startTime) {
        filters.startTime = { $gte: startTime };
      }

      if (endTime) {
        filters.endTime = { $lte: endTime };
      }

      if (status) {
        filters.status = status;
      }

      const skip = (page - 1) * limit;

      return await this.availabilityModel
        .find(filters)
        .sort({ date: 1, startTime: 1 })
        .skip(skip)
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error(`Error obteniendo disponibilidad: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<Availability> {
    try {
      const availability = await this.availabilityModel.findById(id).exec();

      if (!availability) {
        throw new NotFoundException(`Disponibilidad no encontrada: ${id}`);
      }

      return availability;
    } catch (error) {
      this.logger.error(`Error obteniendo disponibilidad ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, updateAvailabilityDto: any): Promise<Availability> {
    try {
      this.logger.log(`Actualizando disponibilidad: ${id}`);

      const availability = await this.availabilityModel
        .findByIdAndUpdate(id, updateAvailabilityDto, { new: true, runValidators: true })
        .exec();

      if (!availability) {
        throw new NotFoundException(`Disponibilidad no encontrada: ${id}`);
      }

      return availability;
    } catch (error) {
      this.logger.error(`Error actualizando disponibilidad ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Eliminando disponibilidad: ${id}`);

      const availability = await this.availabilityModel.findByIdAndDelete(id).exec();

      if (!availability) {
        throw new NotFoundException(`Disponibilidad no encontrada: ${id}`);
      }
    } catch (error) {
      this.logger.error(`Error eliminando disponibilidad ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAvailabilityForDateRange(
    resourceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Availability[]> {
    try {
      return await this.availabilityModel
        .find({
          resourceId,
          date: { $gte: startDate, $lte: endDate },
          status: 'available',
        })
        .sort({ date: 1, startTime: 1 })
        .exec();
    } catch (error) {
      this.logger.error(`Error obteniendo disponibilidad para rango de fechas: ${error.message}`, error.stack);
      throw error;
    }
  }

  async blockTimeSlot(
    resourceId: string,
    date: Date,
    startTime: string,
    endTime: string,
    reason: string,
    blockedBy: string
  ): Promise<Availability> {
    try {
      // Verificar si ya existe un slot para este horario
      const existingSlot = await this.availabilityModel.findOne({
        resourceId,
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        startTime,
        endTime,
      });

      if (existingSlot) {
        // Actualizar slot existente
        existingSlot.status = 'blocked';
        existingSlot.blockedBy = blockedBy;
        existingSlot.blockReason = reason;
        return await existingSlot.save();
      } else {
        // Crear nuevo slot bloqueado
        const blockedSlot = new this.availabilityModel({
          resourceId,
          date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          startTime,
          endTime,
          status: 'blocked',
          blockedBy,
          blockReason: reason,
        });

        return await blockedSlot.save();
      }
    } catch (error) {
      this.logger.error(`Error bloqueando horario: ${error.message}`, error.stack);
      throw error;
    }
  }

  async unblockTimeSlot(
    resourceId: string,
    date: Date,
    startTime: string,
    endTime: string,
    unblockedBy: string
  ): Promise<Availability> {
    try {
      const slot = await this.availabilityModel.findOne({
        resourceId,
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        startTime,
        endTime,
      });

      if (!slot) {
        throw new NotFoundException('Horario no encontrado');
      }

      slot.status = 'available';
      slot.blockedBy = undefined;
      slot.blockReason = undefined;
      slot.updatedBy = unblockedBy;

      return await slot.save();
    } catch (error) {
      this.logger.error(`Error desbloqueando horario: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getConflictingSlots(
    resourceId: string,
    date: Date,
    startTime: string,
    endTime: string
  ): Promise<Availability[]> {
    try {
      const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      return await this.availabilityModel
        .find({
          resourceId,
          date: targetDate,
          status: { $in: ['busy', 'blocked'] },
          $or: [
            {
              startTime: { $lt: endTime },
              endTime: { $gt: startTime }
            }
          ]
        })
        .exec();
    } catch (error) {
      this.logger.error(`Error verificando conflictos: ${error.message}`, error.stack);
      throw error;
    }
  }

  async markSlotsAsBusy(
    resourceId: string,
    date: Date,
    startTime: string,
    endTime: string,
    bookingId: string
  ): Promise<Availability[]> {
    try {
      const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      // Encontrar todos los slots que se superponen con el horario de reserva
      const overlappingSlots = await this.availabilityModel
        .find({
          resourceId,
          date: targetDate,
          status: 'available',
          $or: [
            {
              startTime: { $lt: endTime },
              endTime: { $gt: startTime }
            }
          ]
        })
        .exec();

      // Marcar slots como ocupados
      const updatedSlots = await Promise.all(
        overlappingSlots.map(slot => {
          slot.status = 'busy';
          slot.bookingId = bookingId;
          return slot.save();
        })
      );

      return updatedSlots;
    } catch (error) {
      this.logger.error(`Error marcando slots como ocupados: ${error.message}`, error.stack);
      throw error;
    }
  }

  async freeSlots(
    resourceId: string,
    date: Date,
    startTime: string,
    endTime: string,
    bookingId: string
  ): Promise<Availability[]> {
    try {
      const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      // Encontrar slots ocupados por la reserva
      const busySlots = await this.availabilityModel
        .find({
          resourceId,
          date: targetDate,
          bookingId,
          status: 'busy',
        })
        .exec();

      // Marcar slots como disponibles
      const freedSlots = await Promise.all(
        busySlots.map(slot => {
          slot.status = 'available';
          slot.bookingId = undefined;
          return slot.save();
        })
      );

      return freedSlots;
    } catch (error) {
      this.logger.error(`Error liberando slots: ${error.message}`, error.stack);
      throw error;
    }
  }
}