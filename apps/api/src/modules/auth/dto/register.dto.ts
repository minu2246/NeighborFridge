import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nickname!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(72)
  @Matches(/[a-zA-Z]/, { message: '비밀번호에는 영문자가 필요합니다.' })
  @Matches(/[0-9]/, { message: '비밀번호에는 숫자가 필요합니다.' })
  password!: string;
}
