import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SaveAppointmentDto {
  @Matches(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/)
  meetAt!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  place!: string;
}
