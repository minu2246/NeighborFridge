import { Type } from 'class-transformer';
import { IsIn, IsInt, IsLatitude, IsLongitude, IsNumber, Max, Min } from 'class-validator';
import { PostSort } from '../post.types';

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
