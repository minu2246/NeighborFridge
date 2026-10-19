import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.types';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UserRecord, UserStats } from './user.types';
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
