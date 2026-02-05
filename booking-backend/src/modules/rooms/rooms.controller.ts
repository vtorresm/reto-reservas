import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoomsService, CreateRoomDto, UpdateRoomDto } from './rooms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Room } from '../../entities/room.entity';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  findAll() {
    return this.roomsService.findAll();
  }

  @Get('available')
  findAvailable() {
    return this.roomsService.findAvailable();
  }

  @Get('capacity')
  findByCapacity(@Query('minCapacity') minCapacity: string) {
    return this.roomsService.findByCapacity(+minCapacity);
  }

  @Get('type/:type')
  findByType(@Param('type') type: string) {
    return this.roomsService.findByType(type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createDto: CreateRoomDto) {
    return this.roomsService.create(createDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateDto: UpdateRoomDto) {
    return this.roomsService.update(id, updateDto);
  }

  @Patch(':id/availability')
  @UseGuards(JwtAuthGuard)
  toggleAvailability(@Param('id') id: string) {
    return this.roomsService.toggleAvailability(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.roomsService.remove(id);
  }
}
