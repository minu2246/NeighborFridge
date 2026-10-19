import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SaveAppointmentDto } from '../src/modules/chat/dto/save-appointment.dto';

describe('SaveAppointmentDto', () => {
  const errors = (meetAt: string) => validateSync(plainToInstance(SaveAppointmentDto, { meetAt, place: '시청역' }));

  it('accepts Seoul local date-time and rejects malformed values', () => {
    expect(errors('2099-01-03T18:30')).toHaveLength(0);
    for (const bad of ['2099-01-03 18:30', '2099-01-03T24:00', '2099-01-03T18:60', 'dddd-dd-ddTdd:dd']) expect(errors(bad)).not.toHaveLength(0);
  });
});
