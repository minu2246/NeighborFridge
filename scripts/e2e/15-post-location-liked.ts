import assert from 'node:assert/strict';

const step = (msg: string) => console.log('✔', msg);
const run = Date.now();
const home = { name: '서울 중구', latitude: 37.5665, longitude: 126.978, radiusKm: 3 as const };
const narrow = { ...home, radiusKm: 1 as const };
const expiry = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(Date.now() + 5 * 86400000));
const pw = 'password1234';

(async () => {
  const api = await import('../../apps/mobile/src/api/client.ts');
  const owner = `pl-owner${run}@test.local`, viewer = `pl-viewer${run}@test.local`;

  // 거래 위치 지정: 동네에서 약 2km 북쪽은 허용, 부산은 거부
  await api.register(owner, '위치작성자', pw); await api.saveNeighborhood(home);
  const north = { latitude: home.latitude + 0.018, longitude: home.longitude };
  const far = await api.createPost({ name: '감자', title: '감자 나눔', type: '나눔', expiryDate: expiry, place: '북쪽 공원', location: north }, home);
  await assert.rejects(api.createPost({ name: 'x', title: 'x', type: '나눔', expiryDate: expiry, place: '부산역', location: { latitude: 35.115, longitude: 129.041 } }, home), /10km 이내/);
  step('거래 위치 지정: 동네 근처 허용, 10km 넘으면 거부');

  await api.register(viewer, '위치구경꾼', pw); await api.saveNeighborhood(home);
  const seen = (await api.listPosts(home)).find((p) => p.id === far.id);
  assert.ok(seen); assert.equal(seen.distance, '2.0km'); step('반경 3km 목록: 지정 위치 기준 거리 2.0km');
  assert.equal((await api.listPosts(narrow)).some((p) => p.id === far.id), false); step('반경 1km 목록에는 안 보임');

  // 찜은 반경 밖이어도 관심 목록에 남음
  await api.setPostLiked(far.id, true);
  const liked = await api.listLikedPosts(narrow);
  assert.deepEqual(liked.map((p) => [p.id, p.distance, p.liked]), [[far.id, '2.0km', true]]); step('반경 1km여도 관심 목록에는 찜한 게시물(거리 포함)');
  console.log('\nE2E 통과');
})().catch((error) => { console.error('✘ 실패:', error); process.exit(1); });
