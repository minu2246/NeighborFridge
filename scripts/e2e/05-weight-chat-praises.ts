import assert from 'node:assert/strict';

const step = (msg: string) => console.log('✔', msg);
const run = Date.now();
const home = { name: '서울 중구', latitude: 37.5665, longitude: 126.978, radiusKm: 3 as const };
const expiry = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(Date.now() + 5 * 86400000));
const pw = 'password1234';

(async () => {
  const api = await import('../../apps/mobile/src/api/client.ts');
  const owner = `v3-owner${run}@test.local`, asker = `v3-asker${run}@test.local`;

  // 1) 무게 + 탄소 절감
  await api.register(owner, '무게왕', pw); await api.saveNeighborhood(home);
  const tofu = await api.createPost({ name: '두부', title: '두부 나눔', type: '나눔', expiryDate: expiry, place: '시청역', weightGrams: 300 }, home);
  const rice = await api.createPost({ name: '쌀', title: '쌀 나눔', type: '나눔', expiryDate: expiry, place: '시청역', weightGrams: 1700 }, home);
  const noWeight = await api.createPost({ name: '김치', title: '김치', type: '나눔', expiryDate: expiry, place: '시청역' }, home);
  assert.equal(tofu.weightGrams, 300); assert.equal(noWeight.weightGrams, undefined); step('무게 저장 (입력 안 하면 없음)');
  await assert.rejects(api.createPost({ name: 'x', title: 'x', type: '나눔', expiryDate: expiry, place: '시청역', weightGrams: 200000 }, home)); step('100kg 초과 무게 거부');

  await api.register(asker, '문의왕', pw); await api.saveNeighborhood(home);
  assert.equal((await api.listPosts(home)).find((p) => p.id === tofu.id)?.weightGrams, 300); step('다른 계정 목록에도 무게 표시');

  // 2) 채팅 목록: 마지막 메시지, 안 읽은 수, 최근 대화 순
  const roomTofu = await api.openChatRoom(tofu);
  const roomRice = await api.openChatRoom(rice);
  await api.sendMessage(roomTofu.roomId, '두부 받을 수 있을까요?');
  await api.sendMessage(roomTofu.roomId, '내일 저녁 괜찮으세요?');
  await api.sendMessage(roomRice.roomId, '쌀도 받고 싶어요');
  await api.login(owner, pw);
  let rooms = await api.listChatRooms();
  assert.equal(rooms[0].roomId, roomRice.roomId); step('채팅 목록: 가장 최근 대화가 위');
  const t = rooms.find((r) => r.roomId === roomTofu.roomId)!;
  assert.equal(t.lastMessage, '내일 저녁 괜찮으세요?'); assert.equal(t.unread, 2); assert.ok(t.lastMessageAt); step('마지막 메시지·안 읽은 수 2');
  await api.listMessages(roomTofu.roomId); // 방 열기
  rooms = await api.listChatRooms();
  assert.equal(rooms.find((r) => r.roomId === roomTofu.roomId)!.unread, 0); assert.equal(rooms.find((r) => r.roomId === roomRice.roomId)!.unread, 1); step('방을 열면 그 방만 읽음 처리');
  await api.sendMessage(roomTofu.roomId, '네 좋아요');
  await api.login(asker, pw);
  assert.equal((await api.listChatRooms()).find((r) => r.roomId === roomTofu.roomId)!.unread, 1); step('내가 보낸 메시지는 상대 쪽에서만 안 읽음으로 셈');

  // 3) 후기 확장 + 탄소 절감 계산
  await api.login(owner, pw);
  const asker_id = (await api.listPostChatPartners(tofu.id))[0].userId;
  for (const p of [tofu, rice, noWeight]) await api.updatePostStatus(p.id, 'RESERVED');
  await api.updatePostStatus(tofu.id, 'COMPLETED', asker_id);
  await api.updatePostStatus(rice.id, 'COMPLETED', asker_id);
  await api.updatePostStatus(noWeight.id, 'COMPLETED');
  const s = await api.getMyStats();
  assert.equal(s!.sharedKg, 2); assert.equal(s!.carbonSavedKg, 5); step('탄소 절감: 나눔 완료 2kg(무게 없는 건 제외) × 2.5 = 5kg CO2e');

  await assert.rejects(api.submitReview(tofu.id, 2, ['불친절해요'])); step('좋은 평가에 비매너 항목 → 거부');
  await api.submitReview(tofu.id, 2, ['시간 약속을 잘 지켜요', '응답이 빨라요']);
  await api.login(asker, pw);
  await api.submitReview(tofu.id, 2, ['친절하고 매너가 좋아요']);
  await api.submitReview(rice.id, -1, ['응답이 느려요']);
  const mine = await api.listReceivedReviews();
  assert.equal(mine.length, 1); assert.equal(mine[0].reviewerNickname, '무게왕'); assert.deepEqual(mine[0].praises, ['시간 약속을 잘 지켜요', '응답이 빨라요']); assert.equal(mine[0].itemName, '두부'); step('문의자가 받은 후기: 작성자·상품·칭찬 항목');
  await api.login(owner, pw);
  const got = await api.listReceivedReviews();
  assert.equal(got.length, 2); assert.equal(got.find((r) => r.rating === -1)?.praises[0], '응답이 느려요'); step('작성자가 받은 후기 2개(아쉬운 점 포함)');
  assert.equal((await api.getMyStats())!.mannerTemperature, 36.4); step('매너 온도 반영 36.5 +0.2 -0.3 = 36.4');
  console.log('\nE2E 통과');
})().catch((error) => { console.error('✘ 실패:', error); process.exit(1); });
