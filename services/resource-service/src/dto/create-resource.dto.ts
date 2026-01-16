import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsArray,
  IsObject,
  IsUUID,
  Min,
  Max,
  IsDateString,
  ValidateNested,
  IsPositive,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ResourceType, ResourceStatus } from '../entities/resource.entity';

export class CreateResourceDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(ResourceType)
  type: ResourceType;

  @IsEnum(ResourceStatus)
  @IsOptional()
  status?: ResourceStatus;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  floorNumber?: number;

  @IsString()
  @IsOptional()
  roomNumber?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  coordinates?: {
    latitude: number;
    longitude: number;
    building?: string;
    floor?: string;
  };

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  capacity: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  areaSqm?: number;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  amenities?: {
    wifi?: boolean;
    airConditioning?: boolean;
    heating?: boolean;
    naturalLight?: boolean;
    projector?: boolean;
    whiteboard?: boolean;
    videoConference?: boolean;
    phone?: boolean;
    kitchen?: boolean;
    parking?: boolean;
    accessibility?: boolean;
    storage?: boolean;
  };

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  equipment?: {
    chairs?: number;
    tables?: number;
    monitors?: number;
    keyboards?: number;
    mice?: number;
    headphones?: number;
    chargers?: number;
    cables?: string[];
  };

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  pricePerHour: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  pricePerDay?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  pricePerMonth?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  minimumBookingHours?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  maximumBookingHours?: number;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  availabilitySchedule?: {
    monday?: { open: string; close: string; available: boolean };
    tuesday?: { open: string; close: string; available: boolean };
    wednesday?: { open: string; close: string; available: boolean };
    thursday?: { open: string; close: string; available: boolean };
    friday?: { open: string; close: string; available: boolean };
    saturday?: { open: string; close: string; available: boolean };
    sunday?: { open: string; close: string; available: boolean };
  };

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @IsNumber()
  @Min(1)
  @Max(365)
  @IsOptional()
  @Type(() => Number)
  maxAdvanceBookingDays?: number;

  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;

  @IsString()
  @IsOptional()
  createdBy?: string;
}