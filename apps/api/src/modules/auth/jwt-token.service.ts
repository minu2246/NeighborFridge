import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { JwtPayload } from './jwt.types';

type StoredJwtPayload = JwtPayload & { iat: number; exp: number };

@Injectable()
export class JwtTokenService {
  private readonly secret: string;
  readonly expiresInSeconds = 60 * 60;

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>('JWT_SECRET');
    if (this.secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters.');
  }

  sign(payload: JwtPayload): string {
    const now = Math.floor(Date.now() / 1000);
    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const body = this.encode({ ...payload, iat: now, exp: now + this.expiresInSeconds });
    const signature = this.signature(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  }

  verify(token: string): JwtPayload {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) throw new UnauthorizedException();
    const expected = Buffer.from(this.signature(`${header}.${body}`));
    const supplied = Buffer.from(signature);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      throw new UnauthorizedException();
    }
    try {
      const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as StoredJwtPayload;
      if (!parsed.sub || !parsed.email || parsed.exp <= Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException();
      }
      return { sub: parsed.sub, email: parsed.email };
    } catch {
      throw new UnauthorizedException();
    }
  }

  private encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private signature(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }
}
