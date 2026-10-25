import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.types';
import { UpdateLocationDto } from './dto/update-location.dto';
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
