import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TRADE_TYPES, TradeType } from '../post.types';

export class CreatePostDto {
  @IsUUID()
  userId!: string;

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
  @IsUrl({}, { each: true })
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
}
