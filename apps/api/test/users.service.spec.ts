import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PasswordService } from '../src/modules/auth/password.service';
import { UsersRepository } from '../src/modules/users/users.repository';
import { UsersService } from '../src/modules/users/users.service';

describe('UsersService', () => {
  const repository = { updateLocation: jest.fn(), findById: jest.fn(), getStats: jest.fn(), updateProfile: jest.fn(), findPasswordHash: jest.fn(), updatePasswordHash: jest.fn(), deleteAccount: jest.fn() } as unknown as UsersRepository;
  const passwords = new PasswordService();
  const service = new UsersService(repository, passwords);

  beforeEach(() => jest.clearAllMocks());

  it('updates only the authenticated user location', async () => {
    (repository.updateLocation as jest.Mock).mockResolvedValue({ id: 'user-1' });
    await service.updateMyLocation('user-1', { latitude: 37.5, longitude: 127.0 });
    expect(repository.updateLocation).toHaveBeenCalledWith('user-1', 37.5, 127.0, undefined, undefined);
  });

  it('returns not found when the user no longer exists', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(null);
    await expect(service.getMe('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a blank nickname after trimming', async () => {
    await expect(service.updateMe('u', { nickname: '   ' })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });

  it('changes password only with the current password', async () => {
    (repository.findPasswordHash as jest.Mock).mockResolvedValue(await passwords.hash('oldpass1234'));
    await expect(service.changePassword('u', { currentPassword: 'wrong', newPassword: 'newpass1234' })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updatePasswordHash).not.toHaveBeenCalled();
    await service.changePassword('u', { currentPassword: 'oldpass1234', newPassword: 'newpass1234' });
    const saved = (repository.updatePasswordHash as jest.Mock).mock.calls[0][1] as string;
    expect(await passwords.verify('newpass1234', saved)).toBe(true);
  });

  it('deletes the account only with the right password', async () => {
    (repository.findPasswordHash as jest.Mock).mockResolvedValue(await passwords.hash('oldpass1234'));
    (repository.deleteAccount as jest.Mock).mockResolvedValue(['http://x/uploads/../../.env']);
    await expect(service.deleteAccount('u', 'wrong')).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.deleteAccount).not.toHaveBeenCalled();
    await service.deleteAccount('u', 'oldpass1234'); // 업로드 파일명 형식이 아니면 파일은 건드리지 않음
    expect(repository.deleteAccount).toHaveBeenCalledWith('u');
  });

  it('public profile hides email and location', async () => {
    (repository.findById as jest.Mock).mockResolvedValue({ id: 'user-2', email: 'a@b.c', nickname: '이웃', neighborhoodName: '중구', latitude: 37.5, longitude: 127 });
    (repository.getStats as jest.Mock).mockResolvedValue({ mannerTemperature: 36.7, reviewCount: 1 });
    expect(await service.getProfile('user-2')).toEqual({ id: 'user-2', nickname: '이웃', neighborhoodName: '중구', mannerTemperature: 36.7, reviewCount: 1 });
  });
});
