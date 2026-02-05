import { IsString, IsDateString, IsString as IsStringValidator, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  userId: string;

  @IsString()
  roomId: string;

  @IsDateString()
  date: string;

  @IsStringValidator()
  startTime: string;

  @IsStringValidator()
  endTime: string;

  @IsOptional()
  @IsStringValidator()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  attendees?: number;

  @IsOptional()
  @IsStringValidator()
  title?: string;
}
