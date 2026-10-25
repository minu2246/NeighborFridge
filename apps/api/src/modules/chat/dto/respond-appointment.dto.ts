import { IsBoolean } from 'class-validator';

export class RespondAppointmentDto {
  @IsBoolean()
  accept!: boolean;
}
