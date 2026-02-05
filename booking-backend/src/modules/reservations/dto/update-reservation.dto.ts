import { IsString, IsDateString, IsString as IsStringValidator, IsOptional } from 'class-validator';

export class UpdateReservationDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsStringValidator()
  startTime?: string;

  @IsOptional()
  @IsStringValidator()
  endTime?: string;

  @IsOptional()
  @IsStringValidator()
  notes?: string;
}
