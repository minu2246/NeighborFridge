import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.types';
import { UpdateLocationDto } from './dto/update-location.dto';
import { ChangePasswordDto, DeleteAccountDto, UpdateMeDto } from './dto/update-me.dto';
import { PublicProfile, UserRecord, UserStats } from './user.types';
import { UsersService } from './users.service';

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserRecord> {
    return this.usersService.getMe(user.id);
  }

  // 닉네임·알림 설정 변경
  @Patch()
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() input: UpdateMeDto): Promise<UserRecord> {
    return this.usersService.updateMe(user.id, input);
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() input: ChangePasswordDto): Promise<void> {
    return this.usersService.changePassword(user.id, input);
  }

  // 회원 탈퇴(되돌릴 수 없음)
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMe(@CurrentUser() user: AuthenticatedUser, @Body() input: DeleteAccountDto): Promise<void> {
    return this.usersService.deleteAccount(user.id, input.password);
  }

  @Get('stats')
  getStats(@CurrentUser() user: AuthenticatedUser): Promise<UserStats> {
    return this.usersService.getMyStats(user.id);
  }

  @Patch('location')
  updateLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateLocationDto,
  ): Promise<UserRecord> {
    return this.usersService.updateMyLocation(user.id, input);
  }
}

// 다른 이웃 프로필(이메일·좌표 제외)
@Controller('users')
@UseGuards(JwtAuthGuard)
export class PublicUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id/profile')
  getProfile(@Param('id', ParseUUIDPipe) id: string): Promise<PublicProfile> {
    return this.usersService.getProfile(id);
  }
}
