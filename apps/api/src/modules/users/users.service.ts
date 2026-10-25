import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PasswordService } from '../auth/password.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { ChangePasswordDto, UpdateMeDto } from './dto/update-me.dto';
import { PublicProfile, UserRecord, UserStats } from './user.types';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async updateMe(userId: string, input: UpdateMeDto): Promise<UserRecord> {
    const nickname = input.nickname?.trim();
    if (nickname !== undefined && nickname.length < 2) throw new BadRequestException('닉네임은 2자 이상이어야 합니다.');
    const user = await this.usersRepository.updateProfile(userId, nickname, input.notifyReviews);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }

  async changePassword(userId: string, input: ChangePasswordDto): Promise<void> {
    const hash = await this.usersRepository.findPasswordHash(userId);
    if (!hash || !(await this.passwordService.verify(input.currentPassword, hash))) {
      throw new BadRequestException('현재 비밀번호가 맞지 않습니다.');
    }
    await this.usersRepository.updatePasswordHash(userId, await this.passwordService.hash(input.newPassword));
  }

  async getMe(userId: string): Promise<UserRecord> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }

  getMyStats(userId: string): Promise<UserStats> {
    return this.usersRepository.getStats(userId);
  }

  async getProfile(userId: string): Promise<PublicProfile> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return { id: user.id, nickname: user.nickname, neighborhoodName: user.neighborhoodName, ...(await this.usersRepository.getStats(userId)) };
  }

  async updateMyLocation(userId: string, input: UpdateLocationDto): Promise<UserRecord> {
    const user = await this.usersRepository.updateLocation(userId, input.latitude, input.longitude, input.neighborhoodName, input.radiusKm);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }
}
