import assert from 'node:assert/strict';

const step = (msg: string) => console.log('✔', msg);
const run = Date.now();
const home = { name: '서울 중구', latitude: 37.5665, longitude: 126.978, radiusKm: 3 as const };
const expiry = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(Date.now() + 5 * 86400000));
const draft = (name: string) => ({ name, title: `${name} 나눔`, type: '나눔' as const, expiryDate: expiry, place: '시청역' });
const pw = 'password1234';

(async () => {
  const api = await import('../../apps/mobile/src/api/client.ts');
  const owner = `r-owner${run}@test.local`, asker = `r-asker${run}@test.local`, other = `r-other${run}@test.local`;
  await api.register(owner, '나눔왕', pw); await api.saveNeighborhood(home);
  const p1 = await api.createPost(draft('당근'), home);
  const p2 = await api.createPost(draft('양파'), home);
  const p3 = await api.createPost(draft('감자'), home);
  await api.register(asker, '문의왕', pw); await api.saveNeighborhood(home);
  for (const p of [p1, p2]) await api.sendMessage((await api.openChatRoom(p)).roomId, '문의드려요');
  await api.register(other, '구경꾼', pw);

  await api.login(owner, pw);
  const partners = await api.listPostChatPartners(p1.id);
  assert.equal(partners.length, 1); assert.equal(partners[0].nickname, '문의왕'); step('거래 상대 후보 = 이 게시물로 채팅한 이웃');
  assert.deepEqual(await api.listPostChatPartners(p3.id), []); step('채팅 없는 게시물 → 후보 없음');
  const stranger = (await api.listChatRooms()).length; void stranger;
  for (const p of [p1, p2, p3]) await api.updatePostStatus(p.id, 'RESERVED');
  await assert.rejects(api.updatePostStatus(p1.id, 'COMPLETED', '00000000-0000-0000-0000-000000000000')); step('채팅 안 한 사람을 거래 상대로 지정 → 거부');
  await api.updatePostStatus(p1.id, 'COMPLETED', partners[0].userId);
  await api.updatePostStatus(p2.id, 'COMPLETED', partners[0].userId);
  await api.updatePostStatus(p3.id, 'COMPLETED'); step('거래 완료 2건(상대 지정) + 1건(앱 밖 거래)');

  const ownerPending = await api.listPendingReviews();
  assert.deepEqual(ownerPending.map((r) => r.itemName).sort(), ['당근', '양파']); assert.equal(ownerPending[0].partnerNickname, '문의왕'); step('작성자 후기 대기: 상대 지정한 2건만');
  await api.submitReview(p1.id, 2);
  await assert.rejects(api.submitReview(p1.id, 2)); step('같은 거래 두 번 후기 → 거부');
  await assert.rejects(api.submitReview(p3.id, 2)); step('앱 밖 거래 후기 → 거부');
  await api.submitReview(p2.id, -1);
  assert.deepEqual(await api.listPendingReviews(), []); step('후기 남기면 대기 목록에서 사라짐');

  await api.login(other, pw);
  await assert.rejects(api.submitReview(p1.id, 2)); step('거래 당사자 아닌 사람 후기 → 거부');

  await api.login(asker, pw);
  let s = await api.getMyStats();
  assert.equal(s!.mannerTemperature, 36.4); assert.equal(s!.reviewCount, 2); step(`문의자 온도: 36.5 +0.2(최고예요) -0.3(별로예요) = ${s!.mannerTemperature}°C`);
  assert.equal((await api.listPendingReviews()).length, 2); step('문의자 쪽에도 후기 대기 2건');
  await api.submitReview(p1.id, 1); await api.submitReview(p2.id, 2);

  await api.login(owner, pw);
  s = await api.getMyStats();
  assert.equal(s!.mannerTemperature, 36.8); assert.equal(s!.reviewCount, 2); step(`작성자 온도: 36.5 +0.1 +0.2 = ${s!.mannerTemperature}°C`);
  await api.login(other, pw);
  assert.equal((await api.getMyStats())!.mannerTemperature, 36.5); step('후기 없는 사람: 36.5°C');
  console.log('\nE2E 통과');
})().catch((error) => { console.error('✘ 실패:', error); process.exit(1); });
