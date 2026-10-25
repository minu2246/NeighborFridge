import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const S = `${process.cwd()}/scripts/e2e/fixtures`;

(async () => {
  const api = await import('../../apps/mobile/src/api/client.ts');
  await assert.rejects(api.readLabel('aGVsbG8=', 'image/png')); console.log('✔ 로그인 없이 호출 → 거부');
  await api.register(`ocr${Date.now()}@test.local`, '사진테스트', 'password1234');
  const started = Date.now();
  const result = await api.readLabel(readFileSync(`${S}/tofu-label.png`).toString('base64'), 'image/png');
  console.log(`OCR ${((Date.now() - started) / 1000).toFixed(1)}s`, JSON.stringify(result));
  assert.equal(result.expiryDate, '2026-10-30'); console.log('✔ 소비기한 (제조일 제외)');
  assert.equal(result.weightText, '300g'); console.log('✔ 중량');
  assert.deepEqual(result.allergens, ['대두', '밀']); assert.equal(result.allergenLabelFound, true); console.log('✔ 알레르기 (표시 문구에서)');
  assert.ok(result.itemName?.includes('두부'), `상품명: ${result.itemName}`); console.log('✔ 상품명');
  const t2 = Date.now();
  await api.readLabel(readFileSync(`${S}/tofu-label.png`).toString('base64'), 'image/png');
  console.log(`✔ 두 번째 호출(워커 재사용) ${((Date.now() - t2) / 1000).toFixed(1)}s`);
  console.log('\nE2E 통과');
})().catch((error) => { console.error('✘ 실패:', error); process.exit(1); });
