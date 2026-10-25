import assert from 'node:assert/strict';

const core = (s: { completedPosts: number; activePosts: number; chatPartners: number } | null) => s && { completedPosts: s.completedPosts, activePosts: s.activePosts, chatPartners: s.chatPartners };
const step = (msg: string) => console.log('✔', msg);
const run = Date.now();
const home = { name: '서울 중구', latitude: 37.5665, longitude: 126.978, radiusKm: 3 as const };
const expiry = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(Date.now() + 5 * 86400000));
const draft = (name: string) => ({ name, title: `${name} 나눔`, type: '나눔' as const, expiryDate: expiry, place: '시청역' });

(async () => {
  const api = await import('../../apps/mobile/src/api/client.ts');
  const owner = { email: `s-owner${run}@test.local`, pw: 'password1234' };
  await api.register(owner.email, '나눔왕', owner.pw);
  assert.deepEqual(core(await api.getMyStats()), { completedPosts: 0, activePosts: 0, chatPartners: 0 }); step('새 계정: 모두 0');
  await api.saveNeighborhood(home);
  const a = await api.createPost(draft('당근'), home);
  const b = await api.createPost(draft('양파'), home);
  const c = await api.createPost(draft('감자'), home);
  await api.updatePostStatus(b.id, 'RESERVED');
  await api.updatePostStatus(c.id, 'COMPLETED');
  assert.deepEqual(core(await api.getMyStats()), { completedPosts: 1, activePosts: 2, chatPartners: 0 }); step('게시물 3개(진행·예약·완료) → 완료 1, 나눔 중 2');

  // 같은 이웃이 게시물 2개에 문의 → 대화한 이웃은 1명
  await api.register(`s-asker${run}@test.local`, '문의1', 'password1234');
  await api.sendMessage((await api.openChatRoom(a)).roomId, '문의드려요'); await api.sendMessage((await api.openChatRoom(b)).roomId, '문의드려요');
  assert.deepEqual(core(await api.getMyStats()), { completedPosts: 0, activePosts: 0, chatPartners: 1 }); step('문의자 쪽: 대화한 이웃 1');
  await api.register(`s-asker2${run}@test.local`, '문의2', 'password1234');
  await api.sendMessage((await api.openChatRoom(a)).roomId, '문의드려요');

  await api.login(owner.email, owner.pw);
  assert.deepEqual(core(await api.getMyStats()), { completedPosts: 1, activePosts: 2, chatPartners: 2 }); step('작성자 쪽: 같은 이웃의 방 2개는 1명으로, 다른 이웃 포함 2명');
  await api.logout();
  assert.equal(await api.getMyStats(), null); step('로그아웃 상태 → null (화면에 "-")');
  console.log('\nE2E 통과');
})().catch((error) => { console.error('✘ 실패:', error); process.exit(1); });
