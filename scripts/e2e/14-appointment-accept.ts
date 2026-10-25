import assert from 'node:assert/strict';

const step = (msg: string) => console.log('✔', msg);
const run = Date.now();
const home = { name: '서울 중구', latitude: 37.5665, longitude: 126.978, radiusKm: 3 as const };
const seoulDate = (offsetDays: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(Date.now() + offsetDays * 86400000));
const pw = 'password1234';

(async () => {
  const api = await import('../../apps/mobile/src/api/client.ts');
  const owner = `ap-owner${run}@test.local`, asker = `ap-asker${run}@test.local`;
  await api.register(owner, '약속작성자', pw); await api.saveNeighborhood(home);
  const post = await api.createPost({ name: '배추', title: '배추 나눔', type: '나눔', expiryDate: seoulDate(5), place: '시청역' }, home);
  await api.register(asker, '약속문의자', pw); await api.saveNeighborhood(home);
  const room = await api.openChatRoom((await api.listPosts(home)).find((p) => p.id === post.id)!);

  // 문의자가 제안 → 제안한 본인은 수락 불가
  const proposed = await api.saveAppointment(room.roomId, `${seoulDate(1)}T19:00`, '시청역 1번 출구');
  assert.deepEqual([proposed.appointment.status, proposed.appointment.proposedByMe], ['PROPOSED', true]);
  await assert.rejects(api.respondAppointment(room.roomId, true), /약속 제안이 없습니다/); step('제안: 상태 PROPOSED, 제안한 사람은 수락 불가');

  // 작성자: 목록에 "약속 제안 받음", 거절
  await api.login(owner, pw);
  assert.equal((await api.listChatRooms()).find((r) => r.roomId === room.roomId)?.appointmentNotice, '약속 제안 받음'); step('상대 채팅 목록에 "약속 제안 받음"');
  const declined = await api.respondAppointment(room.roomId, false);
  assert.equal(declined.appointment, null); assert.match(declined.message.message, /거절/);
  assert.equal(await api.getAppointment(room.roomId), null);
  assert.equal((await api.listChatRooms()).find((r) => r.roomId === room.roomId)?.appointmentNotice, undefined); step('거절 → 약속 비워지고 거절 메시지');
  await assert.rejects(api.respondAppointment(room.roomId, true)); step('제안 없을 때 수락 거부');

  // 작성자가 오늘 시간으로 다시 제안 → 문의자 수락 → 확정, "오늘 약속"
  await api.saveAppointment(room.roomId, `${seoulDate(0)}T23:59`, '시청역 2번 출구');
  await api.login(asker, pw);
  const accepted = await api.respondAppointment(room.roomId, true);
  assert.equal(accepted.appointment?.status, 'ACCEPTED'); assert.match(accepted.message.message, /^✅ 약속 확정: .* 23:59 · 시청역 2번 출구$/);
  assert.equal((await api.getAppointment(room.roomId))?.status, 'ACCEPTED');
  assert.equal((await api.listChatRooms()).find((r) => r.roomId === room.roomId)?.appointmentNotice, '오늘 약속'); step('수락 → 확정 메시지, 오늘 약속 표시');
  await assert.rejects(api.respondAppointment(room.roomId, false)); step('확정된 약속은 다시 수락/거절 불가');

  // 확정 뒤 변경하면 다시 제안 상태
  const changed = await api.saveAppointment(room.roomId, `${seoulDate(2)}T10:00`, '시청역');
  assert.equal(changed.appointment.status, 'PROPOSED'); step('확정 후 변경 → 다시 상대 수락 필요');
  console.log('\nE2E 통과');
})().catch((error) => { console.error('✘ 실패:', error); process.exit(1); });
