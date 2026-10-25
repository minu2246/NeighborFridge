import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { rm } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { PasswordService } from '../auth/password.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { ChangeEmailDto, ChangePasswordDto, UpdateMeDto } from './dto/update-me.dto';
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
    await this.verifyPassword(userId, input.currentPassword);
    await this.usersRepository.updatePasswordHash(userId, await this.passwordService.hash(input.newPassword));
  }

  // 이메일 변경(로그인 아이디가 바뀜): 비밀번호 확인, 다른 계정과 중복 불가. 가입과 같이 소문자로 저장
  async changeEmail(userId: string, input: ChangeEmailDto): Promise<UserRecord> {
    await this.verifyPassword(userId, input.password);
    const email = input.email.trim().toLowerCase();
    const existing = await this.usersRepository.findByEmail(email);
    if (existing && existing.id !== userId) throw new ConflictException('이미 가입된 이메일입니다.');
    try {
      const user = await this.usersRepository.updateEmail(userId, email);
      if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
      return user;
    } catch (error) {
      // 확인과 저장 사이에 다른 가입이 끼어든 경우
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') throw new ConflictException('이미 가입된 이메일입니다.');
      throw error;
    }
  }

  // 회원 탈퇴: 비밀번호 확인 후 DB 데이터와 게시물 사진 파일까지 삭제
  async deleteAccount(userId: string, password: string): Promise<void> {
    await this.verifyPassword(userId, password);
    const imageUrls = await this.usersRepository.deleteAccount(userId);
    const uploadRoot = resolve(process.env.LOCAL_UPLOAD_PATH ?? 'storage/uploads'); // main.ts 정적 서빙과 같은 경로
    for (const url of imageUrls) {
      const name = basename(url);
      // 업로드가 만든 파일 이름(uuid.확장자)만 지운다
      if (/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(name)) await rm(resolve(uploadRoot, name), { force: true });
    }
  }

  private async verifyPassword(userId: string, password: string): Promise<void> {
    const hash = await this.usersRepository.findPasswordHash(userId);
    if (!hash || !(await this.passwordService.verify(password, hash))) {
      throw new BadRequestException('현재 비밀번호가 맞지 않습니다.');
    }
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
