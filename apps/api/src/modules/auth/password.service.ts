import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const [algorithm, saltValue, keyValue] = storedHash.split('$');
    if (algorithm !== 'scrypt' || !saltValue || !keyValue) return false;
    try {
      const salt = Buffer.from(saltValue, 'base64url');
      const storedKey = Buffer.from(keyValue, 'base64url');
      const candidateKey = (await scrypt(password, salt, storedKey.length)) as Buffer;
      return storedKey.length === candidateKey.length && timingSafeEqual(storedKey, candidateKey);
    } catch {
      return false;
    }
  }
}
