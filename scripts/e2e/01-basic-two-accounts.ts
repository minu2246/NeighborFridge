import assert from 'node:assert/strict';
import * as api from '../../apps/mobile/src/api/client.ts';

const run = Date.now();
const A = { email: `owner${run}@test.local`, nick: '초록이웃', pw: 'password1234' };
const B = { email: `taker${run}@test.local`, nick: '살림초보', pw: 'password1234' };
const homeA = { name: '서울 중구', latitude: 37.5665, longitude: 126.978, radiusKm: 3 as const };
const homeB = { name: '서울 중구', latitude: 37.5700, longitude: 126.982, radiusKm: 3 as const }; // 약 500m
const step = (msg: string) => console.log('✔', msg);
const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(Date.now() + 2 * 86400000));
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

(async () => {
  assert.equal(api.USE_LOCAL_STORE, false);
  // A: 가입 → 동네 → 게시물
  await api.register(A.email, A.nick, A.pw);
  assert.equal(await api.getNeighborhood(), null); step('A 가입, 동네 미설정 시 null');
  await api.saveNeighborhood(homeA);
  assert.deepEqual(await api.getNeighborhood(), homeA); step('A 동네 저장·재조회 일치');
  const post = await api.createPost({ name: '청경채', title: '청경채 한 봉지 나눔해요', type: '나눔', expiryDate: tomorrow, place: '시청역 4번 출구', photoBase64: png, photoMimeType: 'image/png' }, homeA);
  assert.equal(post.isMine, true); assert.equal(post.type, '나눔'); assert.ok(post.imageUrl?.startsWith('http://localhost:3000/uploads/'));
  assert.equal((await fetch(post.imageUrl!)).status, 200); step('A 사진 포함 게시물 등록, 사진 URL 접근 가능');
  await assert.rejects(api.openChatRoom(post)); step('A 자기 게시물 채팅 시도 → 거부');

  // B: 가입 → 주변 조회 → 채팅 → 약속
  await api.register(B.email, B.nick, B.pw);
  await api.saveNeighborhood(homeB);
  const seen = (await api.listPosts(homeB)).find((p) => p.id === post.id);
  assert.ok(seen, 'B 주변 목록에 A 게시물이 있어야 함');
  assert.equal(seen.isMine, false); assert.equal(seen.dDay, 'D-2'); assert.match(seen.distance, /^0\.\d+km$/); assert.equal(seen.place, '시청역 4번 출구');
  step(`B 주변 조회: ${seen.distance}, ${seen.dDay}, 내 게시물 아님`);
  const room = await api.openChatRoom(seen);
  const again = await api.openChatRoom(seen); assert.equal(again.roomId, room.roomId); step('B 채팅방 생성 (재요청 시 같은 방)');
  const hello = await api.sendMessage(room.roomId, '안녕하세요! 청경채 받고 싶어요');
  assert.equal(hello.sender, 'me');
  const plan = await api.saveAppointment(room.roomId, `${tomorrow}T18:30`, '시청역 4번 출구');
  assert.equal(plan.message.sender, 'me'); assert.match(plan.message.message, /^📅 약속: .* 18:30 · 시청역 4번 출구$/); step('B 메시지·약속 저장');
  await assert.rejects(api.updatePostStatus(post.id, 'RESERVED')); step('B가 남의 게시물 상태 변경 시도 → 거부');

  // A: 채팅 확인 → 예약 → 완료
  await api.login(A.email, A.pw);
  const rooms = await api.listChatRooms();
  assert.equal(rooms.length, 1); assert.equal(rooms[0].roomId, room.roomId); assert.equal(rooms[0].neighborName, B.nick);
  const msgs = await api.listMessages(room.roomId);
  assert.deepEqual(msgs.map((m) => m.sender), ['them', 'them']);
  assert.deepEqual(await api.getAppointment(room.roomId), { roomId: room.roomId, meetAt: `${tomorrow}T18:30`, place: '시청역 4번 출구', status: 'PROPOSED', proposedByMe: false });
  step('A 로그인: 채팅방 1개, 상대 메시지 2개, 약속 조회 일치');
  await api.sendMessage(room.roomId, '네 내일 뵈어요');
  await api.updatePostStatus(post.id, 'RESERVED');
  await api.login(B.email, B.pw);
  assert.equal((await api.listPosts(homeB)).find((p) => p.id === post.id)?.status, 'RESERVED');
  assert.deepEqual((await api.listMessages(room.roomId)).map((m) => m.sender), ['me', 'me', 'them']); step('예약중 상태가 B 목록에 보임, B 기준 메시지 방향 정상');
  await api.login(A.email, A.pw);
  await api.updatePostStatus(post.id, 'COMPLETED');
  assert.equal((await api.listPosts(homeA)).some((p) => p.id === post.id), false); step('거래 완료 후 주변 목록에서 사라짐');
  await assert.rejects(api.saveAppointment(room.roomId, '2000-01-01T10:00', '시청역')); step('지난 날짜 약속 거부');
  console.log('\nE2E 통과');
})().catch((error) => { console.error('✘ 실패:', error); process.exit(1); });
