import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { IsDateString, IsEmail, IsIn, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { LocalPost, LocalStoreService } from './local-store.service';

class LocalRegisterDto { @IsEmail() email!: string; @IsString() @MinLength(2) nickname!: string; @IsString() @MinLength(10) password!: string; }
class LocalLoginDto { @IsEmail() email!: string; @IsString() password!: string; }
class LocalPostDto { @IsString() emoji!: string; @IsString() name!: string; @IsString() title!: string; @IsString() type!: string; @IsString() distance!: string; @IsString() dDay!: string; @IsString() place!: string; @IsString() color!: string; @IsDateString() expiryDate!: string; @IsIn(['ACTIVE']) status!: 'ACTIVE'; @IsOptional() @IsString() imageUrl?: string; }
class LocalMessageDto { @IsString() sender!: string; @IsString() @MinLength(1) @MaxLength(2000) message!: string; }
class LocalImageDto { @IsString() base64!: string; @IsIn(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']) mimeType!: string; }
class LocalPostStatusDto { @IsIn(['ACTIVE', 'RESERVED', 'COMPLETED']) status!: 'ACTIVE' | 'RESERVED' | 'COMPLETED'; }
class LocalNeighborhoodDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsLatitude() latitude!: number;
  @IsLongitude() longitude!: number;
  @IsNumber() @IsIn([1, 3, 5]) radiusKm!: number;
}

@Controller('local')
export class LocalStoreController {
  constructor(private readonly store: LocalStoreService) {}
  @Post('auth/register') register(@Body() input: LocalRegisterDto) { return this.store.register(input.email, input.nickname, input.password); }
  @Post('auth/login') login(@Body() input: LocalLoginDto) { return this.store.login(input.email, input.password); }
  @Get('posts') listPosts(): LocalPost[] { return this.store.listPosts(); }
  @Post('posts') createPost(@Body() input: LocalPostDto): LocalPost { return this.store.createPost(input); }
  @Patch('posts/:postId/status') updatePostStatus(@Param('postId') postId: string, @Body() input: LocalPostStatusDto): LocalPost { return this.store.updatePostStatus(postId, input.status); }
  @Post('uploads') saveImage(@Body() input: LocalImageDto) { return this.store.saveImage(input.base64, input.mimeType); }
  @Get('rooms/:roomId/messages') listMessages(@Param('roomId') roomId: string) { return this.store.listMessages(roomId); }
  @Post('rooms/:roomId/messages') createMessage(@Param('roomId') roomId: string, @Body() input: LocalMessageDto) { return this.store.createMessage(roomId, input.sender, input.message); }
  @Get('neighborhood') getNeighborhood() { return this.store.getNeighborhood(); }
  @Put('neighborhood') saveNeighborhood(@Body() input: LocalNeighborhoodDto) { return this.store.saveNeighborhood(input); }
}
