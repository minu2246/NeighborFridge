import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtTokenService } from '../src/modules/auth/jwt-token.service';
import { PasswordService } from '../src/modules/auth/password.service';
import { UsersRepository } from '../src/modules/users/users.repository';

describe('AuthService', () => {
  const repository = {
    findByEmail: jest.fn(),
    createEmailUser: jest.fn(),
  } as unknown as UsersRepository;
  const jwt = {
    sign: jest.fn().mockReturnValue('signed-token'),
    expiresInSeconds: 3600,
  } as unknown as JwtTokenService;
  const password = {
    hash: jest.fn().mockResolvedValue('scrypt$salt$key'),
    verify: jest.fn(),
  } as unknown as PasswordService;
  const service = new AuthService(repository, jwt, password);

  beforeEach(() => jest.clearAllMocks());

  it('normalizes email and never returns a password hash when registering', async () => {
    (repository.findByEmail as jest.Mock).mockResolvedValue(null);
    (repository.createEmailUser as jest.Mock).mockResolvedValue({
      id: 'user-1', email: 'hello@example.com', nickname: '이웃', profileImage: null,
      latitude: null, longitude: null, createdAt: new Date().toISOString(),
    });
    const result = await service.register({
      email: ' Hello@Example.com ', nickname: ' 이웃 ', password: 'secure12345',
    });
    expect(repository.createEmailUser).toHaveBeenCalledWith(
      'hello@example.com', '이웃', expect.any(String),
    );
    expect(result.accessToken).toBe('signed-token');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate email registration', async () => {
    (repository.findByEmail as jest.Mock).mockResolvedValue({ id: 'existing' });
    await expect(service.register({
      email: 'a@example.com', nickname: '이웃', password: 'secure12345',
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an invalid password', async () => {
    (repository.findByEmail as jest.Mock).mockResolvedValue({
      id: 'user-1', email: 'a@example.com', passwordHash: 'scrypt$salt$key',
    });
    (password.verify as jest.Mock).mockResolvedValue(false);
    await expect(service.login({ email: 'a@example.com', password: 'wrong12345' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });
});
