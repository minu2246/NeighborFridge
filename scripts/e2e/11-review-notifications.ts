import assert from 'node:assert/strict';

const step = (msg: string) => console.log('✔', msg);
const run = Date.now();
const home = { name: '서울 중구', latitude: 37.5665, longitude: 126.978, radiusKm: 3 as const };
const expiry = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(Date.now() + 5 * 86400000));
const pw = 'password1234';

(async () => {
  const api = await import('../../apps/mobile/src/api/client.ts');
  const owner = `rn-owner${run}@test.local`, asker = `rn-asker${run}@test.local`;

  await api.register(owner, '알림작성자', pw); await api.saveNeighborhood(home);
  const post = await api.createPost({ name: '오이', title: '오이 나눔', type: '나눔', expiryDate: expiry, place: '시청역' }, home);
  assert.deepEqual(await api.getReviewNotifications(), { pendingReviews: 0, newReviews: 0 }); step('처음엔 알림 0');

  await api.register(asker, '알림문의자', pw); await api.saveNeighborhood(home);
  const room = await api.openChatRoom((await api.listPosts(home)).find((p) => p.id === post.id)!);
  await api.sendMessage(room.roomId, '오이 받을게요');
  await api.login(owner, pw);
  await api.updatePostStatus(post.id, 'RESERVED');
  await api.updatePostStatus(post.id, 'COMPLETED', (await api.listPostChatPartners(post.id))[0].userId);
  assert.deepEqual(await api.getReviewNotifications(), { pendingReviews: 1, newReviews: 0 }); step('거래 완료 → 작성자에게 남길 후기 1');

  await api.login(asker, pw);
  assert.equal((await api.getReviewNotifications()).pendingReviews, 1); step('거래 상대에게도 남길 후기 1');
  await api.submitReview(post.id, 2, ['응답이 빨라요']);
  assert.deepEqual(await api.getReviewNotifications(), { pendingReviews: 0, newReviews: 0 }); step('후기를 남기면 내 알림에서 빠짐');
  assert.equal((await api.listReceivedReviews(room.neighborId))[0].isNew, true); // 작성자 후기를 문의자가 조회(읽음 처리되면 안 됨)

  await api.login(owner, pw);
  assert.deepEqual(await api.getReviewNotifications(), { pendingReviews: 1, newReviews: 1 }); step('작성자: 남길 후기 1 + 새로 받은 후기 1 (다른 사람이 봐도 읽음 처리 안 됨)');
  const received = await api.listReceivedReviews();
  assert.equal(received[0].isNew, true); step('처음 볼 때 NEW 표시');
  assert.equal((await api.getReviewNotifications()).newReviews, 0); step('내 후기를 보면 새 후기 0');
  assert.equal((await api.listReceivedReviews())[0].isNew, false); step('다시 보면 NEW 아님');
  console.log('\nE2E 통과');
})().catch((error) => { console.error('✘ 실패:', error); process.exit(1); });
