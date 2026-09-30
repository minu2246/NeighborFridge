import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRecord } from '../users/user.types';
import { UsersRepository } from '../users/users.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtTokenService } from './jwt-token.service';
import { PasswordService } from './password.service';

export interface AuthResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: UserRecord;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtTokenService,
    private readonly passwordService: PasswordService,
  ) {}

  async register(input: RegisterDto): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    if (await this.usersRepository.findByEmail(email)) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }
    const passwordHash = await this.passwordService.hash(input.password);
    try {
      const user = await this.usersRepository.createEmailUser(email, input.nickname.trim(), passwordHash);
      return this.issueToken(user);
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('이미 가입된 이메일입니다.');
      throw error;
    }
  }

  async login(input: LoginDto): Promise<AuthResult> {
    const user = await this.usersRepository.findByEmail(input.email.trim().toLowerCase());
    if (!user?.passwordHash || !(await this.passwordService.verify(input.password, user.passwordHash))) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return this.issueToken(safeUser);
  }

  private async issueToken(user: UserRecord): Promise<AuthResult> {
    return {
      accessToken: this.jwtService.sign({ sub: user.id, email: user.email }),
      tokenType: 'Bearer',
      expiresIn: this.jwtService.expiresInSeconds,
      user,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }
}
