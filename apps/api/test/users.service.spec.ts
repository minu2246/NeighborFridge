import { NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../src/modules/users/users.repository';
import { UsersService } from '../src/modules/users/users.service';

describe('UsersService', () => {
  const repository = { updateLocation: jest.fn(), findById: jest.fn() } as unknown as UsersRepository;
  const service = new UsersService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('updates only the authenticated user location', async () => {
    (repository.updateLocation as jest.Mock).mockResolvedValue({ id: 'user-1' });
    await service.updateMyLocation('user-1', { latitude: 37.5, longitude: 127.0 });
    expect(repository.updateLocation).toHaveBeenCalledWith('user-1', 37.5, 127.0);
  });

  it('returns not found when the user no longer exists', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(null);
    await expect(service.getMe('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
