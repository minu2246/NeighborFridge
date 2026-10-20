import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TRADE_TYPES, TradeType } from '../post.types';

export class CreatePostDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @MaxLength(100)
  itemName!: string;

  @IsDateString({ strict: true })
  expiryDate!: string;

  @IsIn(TRADE_TYPES)
  tradeType!: TradeType;

  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({ require_tld: false }, { each: true })
  imageUrls: string[] = [];

  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  placeName?: string;

  // 탄소 절감 추정용 무게(g). 최대 100kg
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  weightGrams?: number;
}
