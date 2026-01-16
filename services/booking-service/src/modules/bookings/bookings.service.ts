import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking, CancellationReason } from '../../entities/booking.entity';
import { BookingPolicy } from '../../entities/booking-policy.entity';
import { CreateBookingDto } from '../../dto/create-booking.dto';
import { InterserviceCommunicationService } from '../../common/services/interservice-communication.service';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(BookingPolicy)
    private bookingPolicyRepository: Repository<BookingPolicy>,
    private readonly interserviceCommunication: InterserviceCommunicationService,
  ) {}

  async create(createBookingDto: CreateBookingDto): Promise<Booking> {
    try {
      this.logger.log(`Creando nueva reserva para usuario ${createBookingDto.userId}`);

      // 1. Verificar que el usuario existe
      const userInfo = await this.interserviceCommunication.getUserInfo(createBookingDto.userId);
      if (!userInfo) {
        throw new BadRequestException('Usuario no encontrado');
      }

      // 2. Verificar que el recurso existe y está disponible
      const resourceInfo = await this.interserviceCommunication.checkResourceAvailability(
        createBookingDto.resourceId,
        new Date(createBookingDto.date),
        createBookingDto.startTime,
        createBookingDto.endTime,
      );

      if (!resourceInfo.available) {
        throw new ConflictException('El recurso no está disponible en el horario solicitado');
      }

      // 3. Verificar políticas de reserva
      const policies = await this.getApplicablePolicies(createBookingDto);
      const policyValidation = await this.validateBookingAgainstPolicies(createBookingDto, policies);

      if (!policyValidation.allowed) {
        throw new BadRequestException(policyValidation.reason);
      }

      // 4. Calcular precio total
      const totalAmount = await this.calculateBookingPrice(createBookingDto);

      // 5. Crear la reserva
      const booking = Booking.createBooking(
        createBookingDto.userId,
        createBookingDto.resourceId,
        new Date(createBookingDto.date),
        createBookingDto.startTime,
        createBookingDto.endTime,
        totalAmount,
        createBookingDto.createdBy,
      );

      // Configurar propiedades adicionales
      if (createBookingDto.purpose) {
        booking.purpose = createBookingDto.purpose;
      }

      if (createBookingDto.attendeeCount) {
        booking.attendeeCount = createBookingDto.attendeeCount;
      }

      if (createBookingDto.attendees) {
        booking.attendees = createBookingDto.attendees;
      }

      if (createBookingDto.specialRequests) {
        booking.specialRequests = createBookingDto.specialRequests;
      }

      if (createBookingDto.isRecurring && createBookingDto.recurringPattern) {
        booking.isRecurring = true;
        booking.recurringPattern = {
          frequency: createBookingDto.recurringPattern.frequency,
          interval: createBookingDto.recurringPattern.interval,
          endDate: createBookingDto.recurringPattern.endDate ? new Date(createBookingDto.recurringPattern.endDate) : undefined,
          maxOccurrences: createBookingDto.recurringPattern.maxOccurrences,
          daysOfWeek: createBookingDto.recurringPattern.daysOfWeek,
        };
      }

      if (createBookingDto.metadata) {
        booking.metadata = createBookingDto.metadata;
      }

      // 6. Guardar la reserva
      const savedBooking = await this.bookingRepository.save(booking);

      // 7. Marcar slots como ocupados en el servicio de recursos
      await this.interserviceCommunication.notifyResourceBooking(
        createBookingDto.resourceId,
        savedBooking.id,
        new Date(createBookingDto.date),
        createBookingDto.startTime,
        createBookingDto.endTime,
      );

      // 8. Enviar notificación de confirmación
      await this.interserviceCommunication.sendBookingNotification(
        createBookingDto.userId,
        {
          type: 'booking_confirmed',
          title: 'Reserva Confirmada',
          content: `Tu reserva ha sido confirmada para ${createBookingDto.date} de ${createBookingDto.startTime} a ${createBookingDto.endTime}`,
          bookingId: savedBooking.id,
          resourceName: 'Recurso Reservado', // Se obtendría del servicio de recursos
        },
      );

      // 9. Registrar en auditoría
      await this.interserviceCommunication.logAuditEvent({
        userId: createBookingDto.userId,
        action: 'BOOKING_CREATE',
        resourceType: 'booking',
        resourceId: savedBooking.id,
        description: `Reserva creada para recurso ${createBookingDto.resourceId}`,
        metadata: {
          date: createBookingDto.date,
          startTime: createBookingDto.startTime,
          endTime: createBookingDto.endTime,
          totalAmount,
        },
      });

      this.logger.log(`Reserva creada exitosamente: ${savedBooking.id}`);
      return savedBooking;
    } catch (error) {
      this.logger.error(`Error creando reserva: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(query: any = {}): Promise<Booking[]> {
    try {
      const {
        userId,
        resourceId,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = query;

      const queryBuilder = this.bookingRepository.createQueryBuilder('booking');

      if (userId) {
        queryBuilder.where('booking.userId = :userId', { userId });
      }

      if (resourceId) {
        queryBuilder.andWhere('booking.resourceId = :resourceId', { resourceId });
      }

      if (status) {
        queryBuilder.andWhere('booking.status = :status', { status });
      }

      if (startDate && endDate) {
        queryBuilder.andWhere('booking.date BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      }

      queryBuilder
        .orderBy(`booking.${sortBy}`, sortOrder.toUpperCase())
        .skip((page - 1) * limit)
        .take(limit);

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(`Error obteniendo reservas: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<Booking> {
    try {
      const booking = await this.bookingRepository.findOne({
        where: { id },
      });

      if (!booking) {
        throw new NotFoundException(`Reserva no encontrada: ${id}`);
      }

      return booking;
    } catch (error) {
      this.logger.error(`Error obteniendo reserva ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, updateBookingDto: Partial<CreateBookingDto>): Promise<Booking> {
    try {
      this.logger.log(`Actualizando reserva: ${id}`);

      const booking = await this.findOne(id);

      // Verificar si se puede modificar
      if (!booking.canBeModified()) {
        throw new BadRequestException('La reserva no se puede modificar en este momento');
      }

      // Si se cambian fechas/horarios, verificar disponibilidad
      if (updateBookingDto.date || updateBookingDto.startTime || updateBookingDto.endTime) {
        const newDate = updateBookingDto.date ? new Date(updateBookingDto.date) : booking.date;
        const newStartTime = updateBookingDto.startTime || booking.startTime;
        const newEndTime = updateBookingDto.endTime || booking.endTime;

        const availabilityCheck = await this.interserviceCommunication.checkResourceAvailability(
          booking.resourceId,
          newDate,
          newStartTime,
          newEndTime,
        );

        if (!availabilityCheck.available) {
          throw new ConflictException('El nuevo horario no está disponible');
        }
      }

      // Actualizar propiedades
      Object.assign(booking, updateBookingDto);
      booking.updatedBy = updateBookingDto.updatedBy;

      const updatedBooking = await this.bookingRepository.save(booking);

      // Registrar en auditoría
      await this.interserviceCommunication.logAuditEvent({
        userId: updateBookingDto.updatedBy,
        action: 'BOOKING_MODIFY',
        resourceType: 'booking',
        resourceId: id,
        description: 'Reserva modificada',
        metadata: updateBookingDto,
      });

      this.logger.log(`Reserva actualizada exitosamente: ${id}`);
      return updatedBooking;
    } catch (error) {
      this.logger.error(`Error actualizando reserva ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async cancel(id: string, cancelledBy?: string, reason?: string): Promise<void> {
    try {
      this.logger.log(`Cancelando reserva: ${id}`);

      const booking = await this.findOne(id);

      if (!booking.canBeCancelled()) {
        throw new BadRequestException('La reserva no se puede cancelar en este momento');
      }

      // Calcular reembolso si aplica
      const refundAmount = booking.calculateRefundAmount();

      // Cancelar la reserva
      booking.cancel(CancellationReason.USER_CANCELLED, reason, cancelledBy);
      await this.bookingRepository.save(booking);

      // Liberar slots en el servicio de recursos
      await this.interserviceCommunication.releaseResourceSlots(
        booking.resourceId,
        booking.id,
        booking.date,
        booking.startTime,
        booking.endTime,
      );

      // Procesar reembolso si aplica
      if (refundAmount > 0) {
        await this.interserviceCommunication.processRefund(
          booking.paymentId,
          refundAmount,
          'Reserva cancelada por usuario',
        );
      }

      // Enviar notificación de cancelación
      await this.interserviceCommunication.sendBookingNotification(
        booking.userId,
        {
          type: 'booking_cancelled',
          title: 'Reserva Cancelada',
          content: `Tu reserva ha sido cancelada. ${refundAmount > 0 ? `Se procesará un reembolso de $${refundAmount}.` : ''}`,
          bookingId: booking.id,
          resourceName: 'Recurso Cancelado',
        },
      );

      // Registrar en auditoría
      await this.interserviceCommunication.logAuditEvent({
        userId: cancelledBy,
        action: 'BOOKING_CANCEL',
        resourceType: 'booking',
        resourceId: id,
        description: `Reserva cancelada: ${reason || 'Sin razón especificada'}`,
        metadata: {
          refundAmount,
          cancellationReason: reason,
        },
      });

      this.logger.log(`Reserva cancelada exitosamente: ${id}`);
    } catch (error) {
      this.logger.error(`Error cancelando reserva ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async checkIn(id: string): Promise<Booking> {
    try {
      const booking = await this.findOne(id);

      if (booking.status !== 'confirmed') {
        throw new BadRequestException('Solo se puede hacer check-in de reservas confirmadas');
      }

      booking.checkIn();
      const updatedBooking = await this.bookingRepository.save(booking);

      // Enviar notificación
      await this.interserviceCommunication.sendBookingNotification(
        booking.userId,
        {
          type: 'booking_reminder',
          title: 'Check-in Realizado',
          content: 'Has realizado el check-in exitosamente',
          bookingId: booking.id,
          resourceName: 'Recurso',
        },
      );

      this.logger.log(`Check-in realizado para reserva: ${id}`);
      return updatedBooking;
    } catch (error) {
      this.logger.error(`Error en check-in de reserva ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async checkOut(id: string): Promise<Booking> {
    try {
      const booking = await this.findOne(id);

      if (booking.status !== 'in_progress') {
        throw new BadRequestException('La reserva debe estar en progreso para hacer check-out');
      }

      booking.checkOut();
      const updatedBooking = await this.bookingRepository.save(booking);

      // Enviar notificación
      await this.interserviceCommunication.sendBookingNotification(
        booking.userId,
        {
          type: 'booking_reminder',
          title: 'Check-out Realizado',
          content: 'Has completado tu reserva exitosamente',
          bookingId: booking.id,
          resourceName: 'Recurso',
        },
      );

      this.logger.log(`Check-out realizado para reserva: ${id}`);
      return updatedBooking;
    } catch (error) {
      this.logger.error(`Error en check-out de reserva ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    try {
      return await this.bookingRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error obteniendo reservas del usuario ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getResourceBookings(resourceId: string): Promise<Booking[]> {
    try {
      return await this.bookingRepository.find({
        where: { resourceId },
        order: { date: 'ASC', startTime: 'ASC' },
      });
    } catch (error) {
      this.logger.error(`Error obteniendo reservas del recurso ${resourceId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCalendarView(
    resourceId?: string,
    dateRange?: { startDate?: string; endDate?: string },
  ): Promise<any> {
    try {
      const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : new Date();
      const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : new Date();
      endDate.setDate(endDate.getDate() + 30); // 30 días por defecto

      const whereConditions: any = {
        date: { $gte: startDate, $lte: endDate },
      };

      if (resourceId) {
        whereConditions.resourceId = resourceId;
      }

      const bookings = await this.bookingRepository.find({
        where: whereConditions,
        order: { date: 'ASC', startTime: 'ASC' },
      });

      // Agrupar por fecha
      const calendarView = new Map();

      bookings.forEach(booking => {
        const dateKey = booking.date.toISOString().split('T')[0];

        if (!calendarView.has(dateKey)) {
          calendarView.set(dateKey, []);
        }

        calendarView.get(dateKey).push({
          id: booking.id,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status,
          userId: booking.userId,
          purpose: booking.purpose,
        });
      });

      return Object.fromEntries(calendarView);
    } catch (error) {
      this.logger.error(`Error obteniendo vista de calendario: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getBookingSummary(dateRange?: { startDate?: string; endDate?: string }): Promise<any> {
    try {
      const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : new Date();
      const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : new Date();

      const summary = await this.bookingRepository
        .createQueryBuilder('booking')
        .select([
          'booking.status',
          'COUNT(*) as count',
          'SUM(booking.totalAmount) as totalAmount',
          'AVG(booking.totalHours) as avgHours',
        ])
        .where('booking.date BETWEEN :startDate AND :endDate', { startDate, endDate })
        .groupBy('booking.status')
        .getRawMany();

      const totalBookings = summary.reduce((sum, item) => sum + parseInt(item.count), 0);
      const totalRevenue = summary.reduce((sum, item) => sum + parseFloat(item.totalAmount || 0), 0);

      return {
        period: { startDate, endDate },
        summary: {
          totalBookings,
          totalRevenue,
          averageBookingValue: totalBookings > 0 ? totalRevenue / totalBookings : 0,
          statusBreakdown: summary,
        },
      };
    } catch (error) {
      this.logger.error(`Error generando resumen de reservas: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Métodos auxiliares privados

  private async getApplicablePolicies(bookingDto: CreateBookingDto): Promise<BookingPolicy[]> {
    // Obtener políticas aplicables para esta reserva
    // Por simplicidad, retornamos políticas globales
    return await this.bookingPolicyRepository.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });
  }

  private async validateBookingAgainstPolicies(
    bookingDto: CreateBookingDto,
    policies: BookingPolicy[],
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Validar contra políticas
    for (const policy of policies) {
      if (policy.isApplicableToResource(undefined, bookingDto.resourceId)) {
        const durationValidation = policy.validateBookingDuration(
          this.calculateDuration(bookingDto.startTime, bookingDto.endTime),
        );

        if (!durationValidation.valid) {
          return { allowed: false, reason: durationValidation.reason };
        }
      }
    }

    return { allowed: true };
  }

  private async calculateBookingPrice(bookingDto: CreateBookingDto): Promise<number> {
    try {
      // Obtener información del recurso para calcular precio
      const resourceInfo = await this.interserviceCommunication.getResourceInfo(bookingDto.resourceId);

      if (!resourceInfo) {
        throw new Error('Información del recurso no disponible');
      }

      const duration = this.calculateDuration(bookingDto.startTime, bookingDto.endTime);
      const basePrice = resourceInfo.pricePerHour * duration;

      // Aplicar descuentos si hay código de promoción
      let finalPrice = basePrice;

      if (bookingDto.metadata?.discountCode) {
        // Lógica de aplicación de descuentos
        finalPrice = basePrice * 0.9; // 10% descuento como ejemplo
      }

      return finalPrice;
    } catch (error) {
      this.logger.warn(`Error calculando precio: ${error.message}`);
      // Retornar precio por defecto
      return 50; // $50 como precio por defecto
    }
  }

  private calculateDuration(startTime: string, endTime: string): number {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    return (endMinutes - startMinutes) / 60; // Convertir a horas
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}