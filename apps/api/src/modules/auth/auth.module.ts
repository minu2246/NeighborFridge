import { Module } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { JwtTokenService } from './jwt-token.service';
import { PasswordService } from './password.service';

@Module({
  controllers: [AuthController],
  providers: [UsersRepository, PasswordService, JwtTokenService, AuthService, JwtAuthGuard],
  exports: [JwtTokenService, JwtAuthGuard, PasswordService],
})
export class AuthModule {}
