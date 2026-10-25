import assert from 'node:assert/strict';

const step = (msg: string) => console.log('✔', msg);
const run = Date.now();
const home = { name: '서울 중구', latitude: 37.5665, longitude: 126.978, radiusKm: 3 as const };
const expiry = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(Date.now() + 5 * 86400000));
const pw = 'password1234';

(async () => {
  const api = await import('../../apps/mobile/src/api/client.ts');
  const owner = `np-owner${run}@test.local`, asker = `np-asker${run}@test.local`;

  await api.register(owner, '프로필왕', pw); await api.saveNeighborhood(home);
  const post = await api.createPost({ name: '사과', title: '사과 나눔', type: '나눔', expiryDate: expiry, place: '시청역' }, home);
  await api.register(asker, '구경꾼', pw); await api.saveNeighborhood(home);
  const seen = (await api.listPosts(home)).find((p) => p.id === post.id)!;
  assert.ok(seen.authorId); step('목록 게시물에 작성자 id 포함');

  const room = await api.openChatRoom(seen);
  await api.sendMessage(room.roomId, '사과 받을게요');
  await api.login(owner, pw);
  const askerId = (await api.listPostChatPartners(post.id))[0].userId;
  assert.equal(room.neighborId, seen.authorId);
  assert.equal((await api.listChatRooms()).find((r) => r.roomId === room.roomId)?.neighborId, askerId); step('채팅방 상대 id: 문의자→작성자, 작성자→문의자');
  await api.updatePostStatus(post.id, 'RESERVED');
  await api.updatePostStatus(post.id, 'COMPLETED', askerId);
  await api.login(asker, pw);
  await api.submitReview(post.id, 2, ['친절하고 매너가 좋아요']);

  const profile = (await api.getUserProfile(seen.authorId!))!;
  assert.equal(profile.nickname, '프로필왕'); assert.equal(profile.neighborhoodName, '서울 중구');
  assert.equal(profile.mannerTemperature, 36.7); assert.equal(profile.completedPosts, 1); assert.equal(profile.reviewCount, 1);
  assert.ok(!('email' in profile) && !('latitude' in profile)); step('작성자 프로필: 매너 온도 36.7·나눔 1·후기 1, 이메일·좌표 없음');

  const reviews = await api.listReceivedReviews(seen.authorId);
  assert.equal(reviews.length, 1); assert.equal(reviews[0].reviewerNickname, '구경꾼'); assert.deepEqual(reviews[0].praises, ['친절하고 매너가 좋아요']); step('작성자가 받은 후기·칭찬 조회');
  assert.equal((await api.listReceivedReviews()).length, 0); step('userId 없으면 기존대로 내 후기');

  await assert.rejects(api.getUserProfile('not-a-uuid')); await assert.rejects(api.listReceivedReviews('not-a-uuid')); step('잘못된 id 거부');
  await assert.rejects(api.getUserProfile('00000000-0000-4000-8000-000000000000')); step('없는 사용자 404');
  console.log('\nE2E 통과');
})().catch((error) => { console.error('✘ 실패:', error); process.exit(1); });
