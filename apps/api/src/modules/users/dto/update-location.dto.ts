import { Type } from 'class-transformer';
import { IsIn, IsLatitude, IsLongitude, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateLocationDto {
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  neighborhoodName?: string;

  @IsOptional()
  @IsIn([1, 3, 5])
  radiusKm?: number;
}
