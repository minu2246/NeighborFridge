import { PasswordService } from '../src/modules/auth/password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('stores a salted scrypt hash and verifies the password', async () => {
    const stored = await service.hash('secure12345');
    expect(stored).not.toContain('secure12345');
    await expect(service.verify('secure12345', stored)).resolves.toBe(true);
    await expect(service.verify('wrong12345', stored)).resolves.toBe(false);
  });
});
