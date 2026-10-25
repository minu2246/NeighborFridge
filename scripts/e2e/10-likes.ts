import assert from 'node:assert/strict';

const step = (msg: string) => console.log('✔', msg);
const run = Date.now();
const home = { name: '서울 중구', latitude: 37.5665, longitude: 126.978, radiusKm: 3 as const };
const expiry = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(Date.now() + 5 * 86400000));
const pw = 'password1234';

(async () => {
  const api = await import('../../apps/mobile/src/api/client.ts');
  const owner = `lk-owner${run}@test.local`, fan = `lk-fan${run}@test.local`;

  await api.register(owner, '찜받는이', pw); await api.saveNeighborhood(home);
  const a = await api.createPost({ name: '당근', title: '당근 나눔', type: '나눔', expiryDate: expiry, place: '시청역' }, home);
  const b = await api.createPost({ name: '무', title: '무 나눔', type: '나눔', expiryDate: expiry, place: '시청역' }, home);

  await api.register(fan, '찜하는이', pw); await api.saveNeighborhood(home);
  assert.deepEqual(await api.listLikedPostIds(), []); step('처음엔 관심 목록 비어 있음');
  await api.setPostLiked(a.id, true); await api.setPostLiked(a.id, true); await api.setPostLiked(b.id, true);
  assert.deepEqual(await api.listLikedPostIds(), [b.id, a.id]); step('찜 2개(중복 찜은 1번), 최근 찜한 순');
  await api.setPostLiked(b.id, false); await api.setPostLiked(b.id, false);
  assert.deepEqual(await api.listLikedPostIds(), [a.id]); step('찜 취소(두 번 취소해도 오류 없음)');

  await api.login(owner, pw);
  assert.deepEqual(await api.listLikedPostIds(), []); step('다른 사람 관심 목록은 따로');
  await api.updatePostStatus(a.id, 'RESERVED'); await api.updatePostStatus(a.id, 'COMPLETED');
  await api.login(fan, pw);
  assert.deepEqual(await api.listLikedPostIds(), []); step('거래 완료된 게시물은 관심 목록에서 빠짐');

  await assert.rejects(api.setPostLiked('00000000-0000-4000-8000-000000000000', true)); step('없는 게시물 찜 거부');
  await assert.rejects(api.setPostLiked('not-a-uuid', true)); step('잘못된 id 거부');
  console.log('\nE2E 통과');
})().catch((error) => { console.error('✘ 실패:', error); process.exit(1); });
