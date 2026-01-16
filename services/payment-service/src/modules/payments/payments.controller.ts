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
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

export interface ProcessPaymentDto {
  userId: string;
  bookingId?: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  description: string;
  metadata?: any;
}

export interface RefundDto {
  paymentId: string;
  amount?: number;
  reason: string;
}

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('process')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Procesar nuevo pago' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Pago procesado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de pago inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async processPayment(@Body() processPaymentDto: ProcessPaymentDto) {
    return this.paymentsService.processPayment(processPaymentDto);
  }

  @Post('refund')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Procesar reembolso' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reembolso procesado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de reembolso inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuario sin permisos suficientes',
  })
  async processRefund(@Body() refundDto: RefundDto) {
    return this.paymentsService.processRefund(
      refundDto.paymentId,
      refundDto.amount,
      refundDto.reason,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener pago por ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pago encontrado',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pago no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async getPayment(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getPaymentStatus(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obtener pagos de un usuario' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pagos del usuario obtenidos exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async getUserPayments(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.paymentsService.getUserPayments(userId);
  }

  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Obtener pagos de una reserva' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pagos de la reserva obtenidos exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async getBookingPayments(@Param('bookingId', ParseUUIDPipe) bookingId: string) {
    return this.paymentsService.getBookingPayments(bookingId);
  }

  @Post('calculate-fees')
  @ApiOperation({ summary: 'Calcular fees de pago' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fees calculados exitosamente',
  })
  async calculateFees(@Body() feeDto: {
    amount: number;
    paymentMethod: string;
  }) {
    return this.paymentsService.calculatePaymentFees(
      feeDto.amount,
      feeDto.paymentMethod as any,
    );
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Procesar webhook de pago' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook procesado exitosamente',
  })
  async handleWebhook(@Body() webhookDto: {
    eventType: string;
    eventData: any;
    signature?: string;
  }) {
    return this.paymentsService.handleWebhookEvent(
      webhookDto.eventType,
      webhookDto.eventData,
    );
  }

  @Get('methods/supported')
  @ApiOperation({ summary: 'Obtener métodos de pago soportados' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Métodos de pago obtenidos exitosamente',
  })
  async getSupportedPaymentMethods() {
    return {
      methods: [
        {
          id: 'credit_card',
          name: 'Tarjeta de Crédito',
          description: 'Visa, MasterCard, American Express',
          fees: { percentage: 2.9, fixed: 0.3 },
        },
        {
          id: 'debit_card',
          name: 'Tarjeta de Débito',
          description: 'Tarjetas de débito',
          fees: { percentage: 2.9, fixed: 0.3 },
        },
        {
          id: 'paypal',
          name: 'PayPal',
          description: 'Pago a través de PayPal',
          fees: { percentage: 3.49, fixed: 0.49 },
        },
        {
          id: 'bank_transfer',
          name: 'Transferencia Bancaria',
          description: 'Transferencia directa',
          fees: { percentage: 0, fixed: 0 },
        },
      ],
    };
  }

  @Get('stats/summary')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Obtener estadísticas de pagos' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadísticas obtenidas exitosamente',
  })
  async getPaymentStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentsService.getPaymentStats({ startDate, endDate });
  }
}