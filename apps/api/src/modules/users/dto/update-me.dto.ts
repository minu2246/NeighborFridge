import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
  // 회원가입과 같은 규칙
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nickname?: string;

  @IsOptional()
  @IsBoolean()
  notifyReviews?: boolean;
}

export class DeleteAccountDto {
  @IsString()
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  // 회원가입과 같은 규칙
  @IsString()
  @MinLength(10)
  @MaxLength(72)
  @Matches(/[a-zA-Z]/, { message: '비밀번호에는 영문자가 필요합니다.' })
  @Matches(/[0-9]/, { message: '비밀번호에는 숫자가 필요합니다.' })
  newPassword!: string;
}
