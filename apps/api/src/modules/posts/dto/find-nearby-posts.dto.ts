import { Type } from 'class-transformer';
import { IsIn, IsInt, IsLatitude, IsLongitude, IsNumber, IsOptional, Max, Min, ValidateIf } from 'class-validator';
import { PostSort } from '../post.types';

// 거리 계산용 좌표(둘 다 있거나 둘 다 없거나)
export class OptionalPointDto {
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ValidateIf((point: OptionalPointDto) => point.latitude !== undefined)
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;
}

export class FindNearbyPostsDto {
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(20)
  radiusKm = 3;

  @IsIn(['distance', 'expiry'])
  sort: PostSort = 'distance';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}
