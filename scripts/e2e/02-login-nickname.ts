import assert from 'node:assert/strict';

// 웹 브라우저의 localStorage 흉내 (client.ts가 웹 경로를 타게 함)
const mem = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k),
};

const step = (msg: string) => console.log('✔', msg);
const run = Date.now();
const home = { name: '서울 중구', latitude: 37.5665, longitude: 126.978, radiusKm: 3 as const };
const expiry = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(Date.now() + 5 * 86400000));

(async () => {
  const api = await import('../../apps/mobile/src/api/client.ts');
  // 작성자
  await api.register(`writer${run}@test.local`, '정동밥상', 'password1234');
  assert.ok(mem.get('neighborfridge.session'), '로그인 후 세션 저장'); step('로그인 시 세션 저장됨');
  assert.deepEqual(await api.restoreSession(), { nickname: '정동밥상' }); step('저장된 세션으로 복원 (새로고침 시나리오)');
  await api.saveNeighborhood(home);
  const created = await api.createPost({ name: '미역국', title: '소고기 미역국 2인분', type: '한끼 나눔', expiryDate: expiry, place: '정동길 벤치', description: '어제 끓였고 냉장 보관 중이에요.' }, home);
  assert.equal(created.authorName, '정동밥상'); assert.equal(created.description, '어제 끓였고 냉장 보관 중이에요.'); step('설명 포함 등록, 작성자 닉네임 표시');
  const before = await api.createPost({ name: '두부', title: '두부 한 모', type: '나눔', expiryDate: expiry, place: '정동길 벤치' }, home);
  assert.equal(before.description, undefined); step('설명 없이 등록 → 설명 없음');

  // 문의자
  await api.logout();
  assert.equal(mem.get('neighborfridge.session'), undefined); assert.equal(await api.restoreSession(), null); step('로그아웃 → 세션 삭제, 복원 안 됨');
  await api.register(`asker${run}@test.local`, '살림초보', 'password1234');
  await api.saveNeighborhood(home);
  const seen = (await api.listPosts(home)).find((p) => p.id === created.id)!;
  assert.equal(seen.authorName, '정동밥상'); assert.equal(seen.description, '어제 끓였고 냉장 보관 중이에요.'); assert.equal(seen.isMine, false); step('다른 계정 목록: 작성자 닉네임·설명 보임');
  const room = await api.openChatRoom(seen); await api.sendMessage(room.roomId, '안녕하세요');
  assert.equal(room.neighborName, '정동밥상');
  assert.equal((await api.listChatRooms())[0].neighborName, '정동밥상'); step('문의자 채팅 목록: 상대 닉네임 = 작성자');
  await api.sendMessage(room.roomId, '미역국 받고 싶어요');

  // 작성자 다시 로그인
  await api.login(`writer${run}@test.local`, 'password1234');
  assert.equal((await api.listChatRooms())[0].neighborName, '살림초보'); step('작성자 채팅 목록: 상대 닉네임 = 문의자');

  // 위조된 토큰은 복원 거부
  mem.set('neighborfridge.session', JSON.stringify({ token: 'forged', userId: 'x', nickname: 'x' }));
  assert.equal(await api.restoreSession(), null); assert.equal(mem.get('neighborfridge.session'), undefined); step('잘못된 토큰 → 복원 거부, 세션 삭제');
  console.log('\nE2E 통과');
})().catch((error) => { console.error('✘ 실패:', error); process.exit(1); });
