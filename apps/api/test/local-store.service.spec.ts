import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PasswordService } from '../src/modules/auth/password.service';
import { LocalStoreService } from '../src/modules/local-store/local-store.service';

describe('LocalStoreService appointments', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nf-local-'));
  const config = { get: (key: string, fallback?: string) => ({ LOCAL_STORE_ENABLED: 'true', LOCAL_DB_PATH: join(dir, 'test.sqlite') } as Record<string, string>)[key] ?? fallback } as unknown as ConfigService;
  const service = new LocalStoreService(config, {} as PasswordService);

  afterAll(() => { service.onModuleDestroy(); rmSync(dir, { recursive: true, force: true }); });

  it('saves, updates the appointment and records a chat message', () => {
    expect(service.getAppointment('room-1')).toBeNull();
    service.saveAppointment('room-1', 'me', '2099-01-02T18:30', ' 시청역 4번 출구 ');
    const { message } = service.saveAppointment('room-1', 'me', '2099-01-03T09:05', '정동길 카페');
    expect(service.getAppointment('room-1')).toMatchObject({ meetAt: '2099-01-03T09:05', place: '정동길 카페' });
    expect(message.message).toBe('📅 약속: 1월 3일 09:05 · 정동길 카페');
    expect(service.listMessages('room-1')).toHaveLength(2);
  });

  it('rejects past dates', () => {
    expect(() => service.saveAppointment('room-2', 'me', '2000-01-01T10:00', '시청역')).toThrow(BadRequestException);
  });
});
