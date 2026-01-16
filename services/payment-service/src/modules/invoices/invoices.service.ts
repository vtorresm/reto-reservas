import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../../entities/invoice.entity';
import { Payment } from '../../entities/payment.entity';

export interface CreateInvoiceDto {
  userId: string;
  bookingId?: string;
  subscriptionId?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    period?: { startDate: Date; endDate: Date };
  }>;
  type?: string;
  dueDate?: Date;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
    try {
      this.logger.log(`Creando factura para usuario ${createInvoiceDto.userId}`);

      const invoice = Invoice.createInvoice(
        createInvoiceDto.userId,
        createInvoiceDto.lineItems,
        createInvoiceDto.type as any,
        createInvoiceDto.bookingId,
      );

      if (createInvoiceDto.dueDate) {
        invoice.dueDate = createInvoiceDto.dueDate;
      }

      const savedInvoice = await this.invoiceRepository.save(invoice);

      this.logger.log(`Factura creada exitosamente: ${savedInvoice.id}`);
      return savedInvoice;
    } catch (error) {
      this.logger.error(`Error creando factura: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(query: any = {}): Promise<Invoice[]> {
    try {
      const {
        userId,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = query;

      const queryBuilder = this.invoiceRepository.createQueryBuilder('invoice');

      if (userId) {
        queryBuilder.where('invoice.userId = :userId', { userId });
      }

      if (status) {
        queryBuilder.andWhere('invoice.status = :status', { status });
      }

      if (startDate && endDate) {
        queryBuilder.andWhere('invoice.issueDate BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      }

      queryBuilder
        .orderBy(`invoice.${sortBy}`, sortOrder.toUpperCase())
        .skip((page - 1) * limit)
        .take(limit);

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(`Error obteniendo facturas: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<Invoice> {
    try {
      const invoice = await this.invoiceRepository.findOne({
        where: { id },
      });

      if (!invoice) {
        throw new NotFoundException(`Factura no encontrada: ${id}`);
      }

      return invoice;
    } catch (error) {
      this.logger.error(`Error obteniendo factura ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async markAsSent(id: string): Promise<Invoice> {
    try {
      const invoice = await this.findOne(id);
      invoice.markAsSent();
      return await this.invoiceRepository.save(invoice);
    } catch (error) {
      this.logger.error(`Error marcando factura como enviada: ${error.message}`, error.stack);
      throw error;
    }
  }

  async markAsPaid(paymentId: string): Promise<Invoice> {
    try {
      const invoice = await this.findOne(paymentId);
      invoice.markAsPaid();
      return await this.invoiceRepository.save(invoice);
    } catch (error) {
      this.logger.error(`Error marcando factura como pagada: ${error.message}`, error.stack);
      throw error;
    }
  }

  async addPayment(invoiceId: string, paymentId: string, amount: number): Promise<Invoice> {
    try {
      const invoice = await this.findOne(invoiceId);
      invoice.addPayment(paymentId, amount);
      return await this.invoiceRepository.save(invoice);
    } catch (error) {
      this.logger.error(`Error agregando pago a factura: ${error.message}`, error.stack);
      throw error;
    }
  }

  async markAsOverdue(id: string): Promise<Invoice> {
    try {
      const invoice = await this.findOne(id);
      invoice.markAsOverdue();
      return await this.invoiceRepository.save(invoice);
    } catch (error) {
      this.logger.error(`Error marcando factura como vencida: ${error.message}`, error.stack);
      throw error;
    }
  }

  async cancel(id: string, reason: string): Promise<Invoice> {
    try {
      const invoice = await this.findOne(id);
      invoice.cancel(reason);
      return await this.invoiceRepository.save(invoice);
    } catch (error) {
      this.logger.error(`Error cancelando factura: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserInvoices(userId: string): Promise<Invoice[]> {
    try {
      return await this.invoiceRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error obteniendo facturas del usuario: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getOverdueInvoices(): Promise<Invoice[]> {
    try {
      return await this.invoiceRepository.find({
        where: {
          status: InvoiceStatus.SENT,
          dueDate: { $lt: new Date() },
        },
        order: { dueDate: 'ASC' },
      });
    } catch (error) {
      this.logger.error(`Error obteniendo facturas vencidas: ${error.message}`, error.stack);
      throw error;
    }
  }

  async generateInvoiceFromBooking(bookingId: string, userId: string): Promise<Invoice> {
    try {
      // Obtener información de la reserva (simulado)
      const bookingInfo = {
        resourceName: 'Sala de Reuniones A',
        date: new Date(),
        startTime: '14:00',
        endTime: '16:00',
        duration: 2,
        pricePerHour: 25,
      };

      const lineItems = [{
        description: `Reserva de ${bookingInfo.resourceName} - ${bookingInfo.date.toDateString()}`,
        quantity: bookingInfo.duration,
        unitPrice: bookingInfo.pricePerHour,
        period: {
          startDate: bookingInfo.date,
          endDate: bookingInfo.date,
        },
      }];

      const createInvoiceDto: CreateInvoiceDto = {
        userId,
        bookingId,
        lineItems,
        type: 'booking',
      };

      return await this.create(createInvoiceDto);
    } catch (error) {
      this.logger.error(`Error generando factura desde reserva: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getInvoiceSummary(dateRange?: { startDate?: string; endDate?: string }): Promise<any> {
    try {
      const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : new Date();
      const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : new Date();

      const summary = await this.invoiceRepository
        .createQueryBuilder('invoice')
        .select([
          'invoice.status',
          'COUNT(*) as count',
          'SUM(invoice.totalAmount) as totalAmount',
          'SUM(invoice.amountPaid) as totalPaid',
          'SUM(invoice.amountDue) as totalDue',
        ])
        .where('invoice.issueDate BETWEEN :startDate AND :endDate', { startDate, endDate })
        .groupBy('invoice.status')
        .getRawMany();

      const totalInvoices = summary.reduce((sum, item) => sum + parseInt(item.count), 0);
      const totalRevenue = summary.reduce((sum, item) => sum + parseFloat(item.totalAmount || 0), 0);
      const totalPaid = summary.reduce((sum, item) => sum + parseFloat(item.totalPaid || 0), 0);
      const totalDue = summary.reduce((sum, item) => sum + parseFloat(item.totalDue || 0), 0);

      return {
        period: { startDate, endDate },
        summary: {
          totalInvoices,
          totalRevenue,
          totalPaid,
          totalDue,
          collectionRate: totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0,
          statusBreakdown: summary,
        },
      };
    } catch (error) {
      this.logger.error(`Error generando resumen de facturas: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendInvoiceReminders(): Promise<{ sent: number; failed: number }> {
    try {
      const overdueInvoices = await this.getOverdueInvoices();
      let sent = 0;
      let failed = 0;

      for (const invoice of overdueInvoices) {
        try {
          // Enviar recordatorio
          await this.sendInvoiceReminder(invoice);
          invoice.scheduleReminder();
          await this.invoiceRepository.save(invoice);
          sent++;
        } catch (error) {
          this.logger.warn(`Error enviando recordatorio para factura ${invoice.id}: ${error.message}`);
          failed++;
        }
      }

      this.logger.log(`Recordatorios de facturas enviados: ${sent} exitosos, ${failed} fallidos`);
      return { sent, failed };
    } catch (error) {
      this.logger.error(`Error enviando recordatorios de facturas: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async sendInvoiceReminder(invoice: Invoice): Promise<void> {
    // Implementar envío de recordatorio por email
    this.logger.log(`Enviando recordatorio para factura ${invoice.id}`);
  }

  async exportInvoices(
    format: 'pdf' | 'csv' | 'excel',
    filters: any = {},
  ): Promise<any> {
    try {
      const invoices = await this.findAll({ ...filters, limit: 10000 });

      switch (format) {
        case 'csv':
          return this.generateCSVExport(invoices);
        case 'excel':
          return this.generateExcelExport(invoices);
        case 'pdf':
          return this.generatePDFExport(invoices);
        default:
          return invoices;
      }
    } catch (error) {
      this.logger.error(`Error exportando facturas: ${error.message}`, error.stack);
      throw error;
    }
  }

  private generateCSVExport(invoices: Invoice[]): string {
    const headers = ['Número', 'Usuario', 'Fecha Emisión', 'Fecha Vencimiento', 'Total', 'Pagado', 'Estado'];
    const rows = invoices.map(invoice => [
      invoice.invoiceNumber,
      invoice.userId,
      invoice.issueDate.toISOString().split('T')[0],
      invoice.dueDate.toISOString().split('T')[0],
      invoice.totalAmount.toString(),
      invoice.amountPaid.toString(),
      invoice.status,
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private generateExcelExport(invoices: Invoice[]): any {
    // Implementar exportación a Excel
    return {
      format: 'excel',
      data: invoices,
      message: 'Exportación Excel no implementada completamente',
    };
  }

  private generatePDFExport(invoices: Invoice[]): any {
    // Implementar exportación a PDF
    return {
      format: 'pdf',
      data: invoices,
      message: 'Exportación PDF no implementada completamente',
    };
  }
}