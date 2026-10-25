import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const step = (msg: string) => console.log('✔', msg);
const run = Date.now();
const home = { name: '서울 중구', latitude: 37.5665, longitude: 126.978, radiusKm: 3 as const };
const expiry = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(Date.now() + 5 * 86400000));
const pw = 'password1234';

(async () => {
  const api = await import('../../apps/mobile/src/api/client.ts');
  const leaver = `del-leaver${run}@test.local`, stayer = `del-stayer${run}@test.local`;
  const photo = readFileSync(`${process.cwd()}/scripts/e2e/fixtures/tofu-label.png`).toString('base64');

  // 떠날 사람(A): 사진 있는 게시물 / 남을 사람(B): 자기 게시물
  await api.register(leaver, '탈퇴할이웃', pw); await api.saveNeighborhood(home);
  const aPost = await api.createPost({ name: '두부', title: '두부 나눔', type: '나눔', expiryDate: expiry, place: '시청역', photoBase64: photo, photoMimeType: 'image/png' }, home);
  assert.ok(aPost.imageUrl); assert.equal((await fetch(aPost.imageUrl!)).status, 200);
  const leaverId = (await api.getMe() as unknown as { id: string }).id;
  await api.register(stayer, '남는이웃', pw); await api.saveNeighborhood(home);
  const bPost = await api.createPost({ name: '양파', title: '양파 나눔', type: '나눔', expiryDate: expiry, place: '시청역' }, home);

  // B → A 게시물: 채팅·찜·거래 완료·후기 / A → B 게시물: 채팅·거래 완료·후기
  const roomA = await api.openChatRoom((await api.listPosts(home)).find((p) => p.id === aPost.id)!);
  await api.sendMessage(roomA.roomId, '두부 주세요');
  await api.setPostLiked(aPost.id, true);
  await api.login(leaver, pw);
  const roomB = await api.openChatRoom((await api.listPosts(home)).find((p) => p.id === bPost.id)!);
  await api.sendMessage(roomB.roomId, '양파 주세요');
  await api.updatePostStatus(aPost.id, 'RESERVED');
  await api.updatePostStatus(aPost.id, 'COMPLETED', (await api.listPostChatPartners(aPost.id))[0].userId);
  await api.submitReview(aPost.id, 2, ['응답이 빨라요']);
  await api.login(stayer, pw);
  await api.updatePostStatus(bPost.id, 'RESERVED');
  await api.updatePostStatus(bPost.id, 'COMPLETED', leaverId);
  await api.submitReview(bPost.id, 2, []);
  await api.submitReview(aPost.id, 1, []);
  await api.login(leaver, pw);
  await api.submitReview(bPost.id, -1, ['응답이 느려요']);
  await api.login(stayer, pw);
  assert.equal((await api.listChatRooms()).length, 2); assert.equal((await api.listReceivedReviews()).length, 2); step('준비: 채팅 2·후기 주고받음·찜');

  // 탈퇴
  await api.login(leaver, pw);
  await assert.rejects(api.deleteAccount('wrongpass123'), /현재 비밀번호/);
  assert.equal((await api.getMe()).email, leaver); step('비밀번호 틀리면 탈퇴 거부(계정 그대로)');
  await api.deleteAccount(pw);
  await assert.rejects(api.login(leaver, pw)); step('탈퇴 후 로그인 불가');
  assert.equal((await fetch(aPost.imageUrl!)).status, 404); step('게시물 사진 파일 삭제');

  await api.login(stayer, pw);
  assert.equal((await api.listChatRooms()).length, 0); step('남은 사람 채팅 목록에서 탈퇴자와의 대화 모두 사라짐');
  assert.equal((await api.listReceivedReviews()).length, 0); step('탈퇴자가 쓴 후기 삭제');
  assert.deepEqual(await api.getReviewNotifications(), { pendingReviews: 0, newReviews: 0 });
  assert.deepEqual((await api.listLikedPosts()).map((p) => p.id), []); step('탈퇴자 게시물에 대한 찜·남길 후기 정리');
  const stats = (await api.getMyStats())!;
  assert.equal(stats.mannerTemperature, 36.5); assert.equal(stats.completedPosts, 1); step('남은 사람 게시물은 그대로(나눔 완료 1), 매너 온도는 탈퇴자 후기만큼 되돌아감');
  assert.equal((await api.listPosts(home)).some((p) => p.id === aPost.id), false); step('탈퇴자 게시물 목록에서 사라짐');
  await assert.rejects(api.getUserProfile(leaverId)); step('탈퇴자 프로필 404');

  await api.register(leaver, '다시가입', pw);
  assert.equal((await api.getMe()).nickname, '다시가입'); step('같은 이메일로 다시 가입 가능');
  console.log('\nE2E 통과');
})().catch((error) => { console.error('✘ 실패:', error); process.exit(1); });
