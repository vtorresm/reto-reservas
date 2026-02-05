import { IsString, IsInt, IsOptional, IsBoolean, Min, Max, IsIn } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  capacity: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  amenities?: string[];

  @IsOptional()
  equipment?: string[];

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsIn(['meeting_room', 'conference_room', 'office', 'desk', 'common_area'])
  type?: string;
}
