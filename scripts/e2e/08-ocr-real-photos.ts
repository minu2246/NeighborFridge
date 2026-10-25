import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dir = `${process.cwd()}/storage/downloads/ocr-samples`;
const GT: Record<string, { allergens: string[]; weight?: number; name?: string }> = {
  'KakaoTalk_20261021_021757879.jpg': { allergens: ['우유', '대두', '밀'], weight: 142, name: '코하임' },
  'KakaoTalk_20261021_023055295.jpg': { allergens: ['알류', '우유', '대두', '밀', '닭고기', '쇠고기'], weight: 1000, name: '치킨너' },
  'KakaoTalk_20261021_023055295_01.jpg': { allergens: ['알류', '대두', '밀', '돼지고기', '쇠고기'], name: '신라면' },
  'KakaoTalk_20261021_023055295_02.jpg': { allergens: ['알류', '우유', '대두', '밀', '돼지고기', '쇠고기'] },
};

(async () => {
  const api = await import('../../apps/mobile/src/api/client.ts');
  await api.register(`real${Date.now()}@test.local`, '실사진', 'password1234');
  for (const [file, gt] of Object.entries(GT)) {
    const t = Date.now();
    const r = await api.readLabel(readFileSync(`${dir}/${file}`).toString('base64'), 'image/jpeg');
    console.log(`${file.slice(-12)} ${((Date.now() - t) / 1000).toFixed(1)}s ${JSON.stringify(r)}`);
    assert.deepEqual(r.allergens, gt.allergens);
    assert.equal(r.allergenLabelFound, true);
    if (gt.weight) assert.equal(r.weightGrams, gt.weight);
    if (gt.name) assert.ok(r.itemName?.includes(gt.name), `상품명 ${r.itemName}`);
  }
  console.log('✔ 실사진 4장: 알레르기 4/4 정확, 중량·상품명 기대값 일치\nE2E 통과');
})().catch((error) => { console.error('✘ 실패:', error); process.exit(1); });
