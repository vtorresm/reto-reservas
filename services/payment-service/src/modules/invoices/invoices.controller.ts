import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nueva factura' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Factura creada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de factura inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuario sin permisos suficientes',
  })
  async create(@Body() createInvoiceDto: any) {
    return this.invoicesService.create(createInvoiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener facturas' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de facturas obtenida exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async findAll(@Query() query: any) {
    return this.invoicesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener factura por ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Factura encontrada',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Factura no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.findOne(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obtener facturas de un usuario' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Facturas del usuario obtenidas exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async getUserInvoices(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.invoicesService.getUserInvoices(userId);
  }

  @Put(':id/sent')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Marcar factura como enviada' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Factura marcada como enviada',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Factura no encontrada',
  })
  async markAsSent(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.markAsSent(id);
  }

  @Put(':id/paid')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Marcar factura como pagada' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Factura marcada como pagada',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Factura no encontrada',
  })
  async markAsPaid(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.markAsPaid(id);
  }

  @Post(':id/payment')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Agregar pago a factura' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pago agregado a factura',
  })
  async addPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() paymentDto: { paymentId: string; amount: number },
  ) {
    return this.invoicesService.addPayment(id, paymentDto.paymentId, paymentDto.amount);
  }

  @Put(':id/overdue')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Marcar factura como vencida' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Factura marcada como vencida',
  })
  async markAsOverdue(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.markAsOverdue(id);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancelar factura' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Factura cancelada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Factura no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuario sin permisos suficientes',
  })
  async cancel(@Param('id', ParseUUIDPipe) id: string, @Body() cancelDto: { reason: string }) {
    await this.invoicesService.cancel(id, cancelDto.reason);
  }

  @Get('overdue/list')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Obtener facturas vencidas' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Facturas vencidas obtenidas exitosamente',
  })
  async getOverdueInvoices() {
    return this.invoicesService.getOverdueInvoices();
  }

  @Post('reminders/send')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Enviar recordatorios de facturas' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recordatorios enviados exitosamente',
  })
  async sendReminders() {
    return this.invoicesService.sendInvoiceReminders();
  }

  @Get('summary/report')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Obtener resumen de facturas' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resumen generado exitosamente',
  })
  async getSummary(@Query() query: any) {
    return this.invoicesService.getInvoiceSummary(query);
  }

  @Get('export/:format')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Exportar facturas' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Facturas exportadas exitosamente',
  })
  async exportInvoices(
    @Param('format') format: 'pdf' | 'csv' | 'excel',
    @Query() filters: any,
  ) {
    return this.invoicesService.exportInvoices(format, filters);
  }
}