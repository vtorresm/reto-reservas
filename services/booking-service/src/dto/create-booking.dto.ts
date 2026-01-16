import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  IsObject,
  IsUUID,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsPositive,
  Length,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BookingType } from '../entities/booking.entity';

export class AttendeeDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @IsString()
  @IsOptional()
  @Length(1, 255)
  email?: string;

  @IsString()
  @IsOptional()
  @Length(1, 20)
  phone?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  company?: string;
}

export class SpecialRequestDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  equipment?: string[];

  @IsString()
  @IsOptional()
  @Length(1, 500)
  setup?: string;

  @IsBoolean()
  @IsOptional()
  catering?: boolean;

  @IsBoolean()
  @IsOptional()
  accessibility?: boolean;

  @IsString()
  @IsOptional()
  @Length(1, 1000)
  notes?: string;
}

export class RecurringPatternDto {
  @IsEnum(['daily', 'weekly', 'monthly'])
  frequency: 'daily' | 'weekly' | 'monthly';

  @IsNumber()
  @Min(1)
  @Max(52)
  @Type(() => Number)
  interval: number;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  maxOccurrences?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsOptional()
  daysOfWeek?: number[]; // 0-6, domingo a sábado
}

export class CreateBookingDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  resourceId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => {
    // Asegurar formato HH:MM
    if (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value)) {
      return value;
    }
    throw new Error('startTime debe tener formato HH:MM');
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => {
    // Asegurar formato HH:MM
    if (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value)) {
      return value;
    }
    throw new Error('endTime debe tener formato HH:MM');
  })
  endTime: string;

  @IsEnum(BookingType)
  @IsOptional()
  type?: BookingType;

  @IsString()
  @IsOptional()
  @Length(1, 500)
  purpose?: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  attendeeCount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendeeDto)
  @IsOptional()
  @ArrayMinSize(0)
  @ArrayMaxSize(50)
  attendees?: AttendeeDto[];

  @IsObject()
  @ValidateNested()
  @Type(() => SpecialRequestDto)
  @IsOptional()
  specialRequests?: SpecialRequestDto;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsObject()
  @ValidateNested()
  @Type(() => RecurringPatternDto)
  @IsOptional()
  recurringPattern?: RecurringPatternDto;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  createdBy?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  updatedBy?: string;

  @IsObject()
  @IsOptional()
  metadata?: {
    source?: 'web' | 'mobile' | 'api';
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    campaign?: string;
    discountCode?: string;
    promotionId?: string;
  };
}