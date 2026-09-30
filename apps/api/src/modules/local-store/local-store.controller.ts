import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { LocalPost, LocalStoreService } from './local-store.service';

class LocalRegisterDto { @IsEmail() email!: string; @IsString() @MinLength(2) nickname!: string; @IsString() @MinLength(10) password!: string; }
class LocalLoginDto { @IsEmail() email!: string; @IsString() password!: string; }
class LocalPostDto { @IsString() emoji!: string; @IsString() name!: string; @IsString() title!: string; @IsString() type!: string; @IsString() distance!: string; @IsString() dDay!: string; @IsString() place!: string; @IsString() color!: string; }
class LocalMessageDto { @IsString() sender!: string; @IsString() @MinLength(1) @MaxLength(2000) message!: string; }

@Controller('local')
export class LocalStoreController {
  constructor(private readonly store: LocalStoreService) {}
  @Post('auth/register') register(@Body() input: LocalRegisterDto) { return this.store.register(input.email, input.nickname, input.password); }
  @Post('auth/login') login(@Body() input: LocalLoginDto) { return this.store.login(input.email, input.password); }
  @Get('posts') listPosts(): LocalPost[] { return this.store.listPosts(); }
  @Post('posts') createPost(@Body() input: LocalPostDto): LocalPost { return this.store.createPost(input); }
  @Get('rooms/:roomId/messages') listMessages(@Param('roomId') roomId: string) { return this.store.listMessages(roomId); }
  @Post('rooms/:roomId/messages') createMessage(@Param('roomId') roomId: string, @Body() input: LocalMessageDto) { return this.store.createMessage(roomId, input.sender, input.message); }
}
