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
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from '../../dto/create-resource.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Resources')
@Controller('resources')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nuevo recurso' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Recurso creado exitosamente',
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
  async create(@Body() createResourceDto: CreateResourceDto) {
    return this.resourcesService.create(createResourceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener lista de recursos' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de recursos obtenida exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async findAll(@Query() query: any) {
    return this.resourcesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener recurso por ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recurso encontrado',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Recurso no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.resourcesService.findOne(id);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Obtener disponibilidad de un recurso' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Disponibilidad obtenida exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Recurso no encontrado',
  })
  async getAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.resourcesService.getAvailability(id, { startDate, endDate });
  }

  @Put(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Actualizar recurso' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recurso actualizado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Recurso no encontrado',
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
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateResourceDto: Partial<CreateResourceDto>,
  ) {
    return this.resourcesService.update(id, updateResourceDto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar recurso' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Recurso eliminado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Recurso no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT inválido o expirado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuario sin permisos suficientes',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.resourcesService.remove(id);
  }

  @Post(':id/availability/generate')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Generar disponibilidad automática para un recurso' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Disponibilidad generada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Recurso no encontrado',
  })
  async generateAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() config: {
      startDate: string;
      endDate: string;
      timeSlots: Array<{ startTime: string; endTime: string }>;
      recurring?: boolean;
    },
  ) {
    return this.resourcesService.generateAvailability(id, config);
  }

  @Get('search/nearby')
  @ApiOperation({ summary: 'Buscar recursos cercanos por ubicación' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recursos cercanos encontrados',
  })
  async findNearby(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius?: number,
    @Query('limit') limit?: number,
  ) {
    return this.resourcesService.findNearby(
      { latitude, longitude },
      radius || 5,
      limit || 20,
    );
  }

  @Get('types/summary')
  @ApiOperation({ summary: 'Obtener resumen por tipos de recursos' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resumen obtenido exitosamente',
  })
  async getResourcesByType() {
    return this.resourcesService.getResourcesByType();
  }

  @Post(':id/toggle-featured')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Alternar estado destacado de un recurso' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estado destacado actualizado',
  })
  async toggleFeatured(@Param('id', ParseUUIDPipe) id: string) {
    return this.resourcesService.toggleFeatured(id);
  }
}