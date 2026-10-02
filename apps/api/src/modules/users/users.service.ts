import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UserRecord } from './user.types';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getMe(userId: string): Promise<UserRecord> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }

  async updateMyLocation(userId: string, input: UpdateLocationDto): Promise<UserRecord> {
    const user = await this.usersRepository.updateLocation(userId, input.latitude, input.longitude, input.neighborhoodName, input.radiusKm);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }
}
