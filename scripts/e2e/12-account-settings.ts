import assert from 'node:assert/strict';

const step = (msg: string) => console.log('✔', msg);
const run = Date.now();
const home = { name: '서울 중구', latitude: 37.5665, longitude: 126.978, radiusKm: 3 as const };
const expiry = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(Date.now() + 5 * 86400000));
const pw = 'password1234';

(async () => {
  const api = await import('../../apps/mobile/src/api/client.ts');
  const owner = `st-owner${run}@test.local`, asker = `st-asker${run}@test.local`;

  await api.register(owner, '설정작성자', pw); await api.saveNeighborhood(home);
  const me = await api.getMe();
  assert.equal(me.email, owner); assert.equal(me.notifyReviews, true); step('내 계정: 이메일, 후기 알림 기본 켜짐');

  // 닉네임 변경
  assert.equal((await api.updateMe({ nickname: '  새닉네임  ' })).nickname, '새닉네임');
  assert.equal((await api.getMe()).nickname, '새닉네임'); step('닉네임 변경(앞뒤 공백 제거), 서버에 저장');
  await assert.rejects(api.updateMe({ nickname: '   ' })); await assert.rejects(api.updateMe({ nickname: 'a' })); step('빈·1자 닉네임 거부');
  const post = await api.createPost({ name: '호박', title: '호박 나눔', type: '나눔', expiryDate: expiry, place: '시청역' }, home);

  // 알림 설정: 끄면 배지 0
  await api.register(asker, '설정문의자', pw); await api.saveNeighborhood(home);
  assert.equal((await api.listPosts(home)).find((p) => p.id === post.id)?.authorName, '새닉네임'); step('다른 사람 화면에도 바뀐 닉네임');
  const room = await api.openChatRoom((await api.listPosts(home)).find((p) => p.id === post.id)!);
  await api.sendMessage(room.roomId, '호박 주세요');
  await api.login(owner, pw);
  await api.updatePostStatus(post.id, 'RESERVED');
  await api.updatePostStatus(post.id, 'COMPLETED', (await api.listPostChatPartners(post.id))[0].userId);
  assert.equal((await api.getReviewNotifications()).pendingReviews, 1);
  assert.equal((await api.updateMe({ notifyReviews: false })).notifyReviews, false);
  assert.deepEqual(await api.getReviewNotifications(), { pendingReviews: 0, newReviews: 0 }); step('후기 알림 끄면 배지 0');
  await api.updateMe({ notifyReviews: true });
  assert.equal((await api.getReviewNotifications()).pendingReviews, 1); step('다시 켜면 배지 복귀');
  assert.equal((await api.getMe()).nickname, '새닉네임'); step('알림 설정만 바꿔도 닉네임 유지');

  // 비밀번호 변경
  await assert.rejects(api.changePassword('wrongpass123', 'newpass12345'), /현재 비밀번호/); step('현재 비밀번호 틀리면 거부');
  await assert.rejects(api.changePassword(pw, 'short1')); step('새 비밀번호 규칙(10자 이상) 검사');
  await api.changePassword(pw, 'newpass12345');
  await assert.rejects(api.login(owner, pw));
  await api.login(owner, 'newpass12345'); step('변경 후 옛 비밀번호 로그인 실패, 새 비밀번호 성공');
  console.log('\nE2E 통과');
})().catch((error) => { console.error('✘ 실패:', error); process.exit(1); });
