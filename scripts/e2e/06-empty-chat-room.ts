import assert from 'node:assert/strict';

const step = (msg: string) => console.log('✔', msg);
const run = Date.now();
const home = { name: '서울 중구', latitude: 37.5665, longitude: 126.978, radiusKm: 3 as const };
const expiry = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(Date.now() + 5 * 86400000));
const pw = 'password1234';

(async () => {
  const api = await import('../../apps/mobile/src/api/client.ts');
  const owner = `er-owner${run}@test.local`, asker = `er-asker${run}@test.local`;
  await api.register(owner, '빈방주인', pw); await api.saveNeighborhood(home);
  const post = await api.createPost({ name: '양배추', title: '양배추 반 통', type: '나눔', expiryDate: expiry, place: '시청역' }, home);
  await api.register(asker, '빈방손님', pw); await api.saveNeighborhood(home);

  // 버그 재현: "채팅으로 약속 잡기"만 누르고 아무 말도 안 함
  const room = await api.openChatRoom(post);
  assert.deepEqual(await api.listChatRooms(), []); step('문의자 채팅 목록: 빈 방 안 보임');
  assert.equal((await api.getMyStats())!.chatPartners, 0); step('문의자 대화한 이웃 0');
  await api.login(owner, pw);
  assert.deepEqual(await api.listChatRooms(), []); step('작성자 채팅 목록: 빈 방 안 보임');
  assert.deepEqual(await api.listPostChatPartners(post.id), []); step('거래 상대 후보에도 없음');
  await api.updatePostStatus(post.id, 'RESERVED');
  const askerId = (await api.listChatRooms()).length; void askerId;

  // 다시 들어가면 같은 방, 메시지를 보내면 그때부터 목록에 보임
  await api.login(asker, pw);
  const again = await api.openChatRoom(post);
  assert.equal(again.roomId, room.roomId); step('다시 눌러도 같은 방');
  await api.sendMessage(room.roomId, '양배추 받고 싶어요');
  assert.equal((await api.listChatRooms())[0]?.lastMessage, '양배추 받고 싶어요'); step('첫 메시지 후 목록에 표시');
  await api.login(owner, pw);
  assert.equal((await api.listChatRooms()).length, 1); assert.equal((await api.listPostChatPartners(post.id))[0]?.nickname, '빈방손님'); step('작성자 목록·거래 상대 후보에도 표시');
  assert.equal((await api.getMyStats())!.chatPartners, 1); step('대화한 이웃 1');
  console.log('\nE2E 통과');
})().catch((error) => { console.error('✘ 실패:', error); process.exit(1); });
