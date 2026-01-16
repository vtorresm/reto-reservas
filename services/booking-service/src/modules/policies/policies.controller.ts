import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PoliciesService } from './policies.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Booking Policies')
@Controller('policies')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Post()
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nueva política de reservas' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Política creada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuario sin permisos suficientes',
  })
  async create(@Body() createPolicyDto: any) {
    return this.policiesService.create(createPolicyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las políticas activas' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de políticas obtenida exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async findAll() {
    return this.policiesService.findAll();
  }

  @Get('defaults')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Obtener políticas por defecto del sistema' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Políticas por defecto obtenidas exitosamente',
  })
  async getDefaultPolicies() {
    return this.policiesService.getDefaultPolicies();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener política por ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Política encontrada',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Política no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async findOne(@Param('id') id: string) {
    return this.policiesService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Actualizar política' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Política actualizada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Política no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuario sin permisos suficientes',
  })
  async update(
    @Param('id') id: string,
    @Body() updatePolicyDto: any,
  ) {
    return this.policiesService.update(id, updatePolicyDto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar política' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Política eliminada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Política no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No se puede eliminar la política',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuario sin permisos suficientes',
  })
  async remove(@Param('id') id: string) {
    await this.policiesService.remove(id);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validar reserva contra políticas aplicables' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Validación completada',
  })
  async validateBooking(@Body() validationDto: {
    userId: string;
    resourceId: string;
    date: string;
    startTime: string;
    endTime: string;
  }) {
    return this.policiesService.validateBookingAgainstPolicies(validationDto, []);
  }
}