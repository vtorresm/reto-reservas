import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nueva suscripción' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Suscripción creada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de suscripción inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async create(@Body() createSubscriptionDto: any) {
    return this.subscriptionsService.create(createSubscriptionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener suscripciones' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de suscripciones obtenida exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async findAll(@Query() query: any) {
    return this.subscriptionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener suscripción por ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Suscripción encontrada',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Suscripción no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obtener suscripciones de un usuario' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Suscripciones del usuario obtenidas exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async getUserSubscriptions(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.subscriptionsService.getUserSubscriptions(userId);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancelar suscripción' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Suscripción cancelada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Suscripción no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'La suscripción no se puede cancelar',
  })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelDto: { reason?: string },
  ) {
    return this.subscriptionsService.cancel(id, cancelDto.reason);
  }

  @Put(':id/reactivate')
  @ApiOperation({ summary: 'Reactivar suscripción' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Suscripción reactivada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Suscripción no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'La suscripción no se puede reactivar',
  })
  async reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.reactivate(id);
  }

  @Get('active/list')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Obtener suscripciones activas' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Suscripciones activas obtenidas exitosamente',
  })
  async getActiveSubscriptions() {
    return this.subscriptionsService.getActiveSubscriptions();
  }

  @Get('billing/due')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Obtener suscripciones para facturación' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Suscripciones para facturación obtenidas exitosamente',
  })
  async getSubscriptionsDueForBilling() {
    return this.subscriptionsService.getSubscriptionsDueForBilling();
  }

  @Post(':id/process-billing')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Procesar ciclo de facturación de suscripción' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Ciclo de facturación procesado exitosamente',
  })
  async processBillingCycle(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.processBillingCycle(id);
  }

  @Get('stats/summary')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Obtener estadísticas de suscripciones' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadísticas obtenidas exitosamente',
  })
  async getSubscriptionStats() {
    return this.subscriptionsService.getSubscriptionStats();
  }
}