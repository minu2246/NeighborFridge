/// <reference types="node" />
// 모바일 순수 로직 테스트: Node 기본 테스트(node:test) + tsx. 실행: 루트에서 npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FoodPost, ReceivedReview } from '../types';
import { appointmentNotice, formatMeetAt, formatTime } from './chat';
import { displayDDay, expiryDays, filterPosts } from './posts';
import { countPraises, mannerFace, ratingLabel } from './reviews';

const localDate = (offsetDays: number) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const post = (over: Partial<FoodPost>): FoodPost => ({ id: 'p', emoji: '🥕', name: 'n', title: 't', type: '나눔', distance: '1.0km', dDay: 'D-1', place: '', color: '', ...over });

test('소비기한 D-Day: 날짜가 있으면 오늘 기준 계산, 없으면 dDay 문자열', () => {
  assert.equal(displayDDay(post({ expiryDate: localDate(0) })), '오늘');
  assert.equal(displayDDay(post({ expiryDate: localDate(3) })), 'D-3');
  assert.equal(displayDDay(post({ expiryDate: '2099-12-31', dDay: 'D-7' })), 'D-7'); // 데모 데이터
  assert.equal(expiryDays(post({ dDay: '오늘' })), 0);
  assert.equal(expiryDays(post({ dDay: '모름' })), Number.MAX_SAFE_INTEGER); // 정렬 맨 뒤
});

test('홈 목록 필터·정렬', () => {
  const posts = [
    post({ id: 'far', distance: '4.0km', expiryDate: localDate(1) }),
    post({ id: 'near', distance: '0.5km', expiryDate: localDate(5), isMine: true }),
    post({ id: 'mid', distance: '2.0km', expiryDate: localDate(2), type: '교환', liked: true }),
    post({ id: 'farLiked', distance: '9.0km', expiryDate: localDate(3), liked: true }),
  ];
  const ids = (list: FoodPost[]) => list.map((p) => p.id);
  assert.deepEqual(ids(filterPosts(posts, { radiusKm: 3, trade: '전체', sort: 'distance' })), ['near', 'mid']);
  assert.deepEqual(ids(filterPosts(posts, { radiusKm: 5, trade: '전체', sort: 'expiry' })), ['far', 'mid', 'near']);
  assert.deepEqual(ids(filterPosts(posts, { radiusKm: 5, trade: '교환', sort: 'distance' })), ['mid']);
  assert.deepEqual(ids(filterPosts(posts, { only: 'mine', radiusKm: 5, trade: '전체', sort: 'distance' })), ['near']);
  assert.deepEqual(ids(filterPosts(posts, { only: 'liked', radiusKm: 1, trade: '전체', sort: 'distance' })), ['mid', 'farLiked']); // 찜은 반경 무시
});

test('후기: 칭찬 집계(좋은 평가만, 많은 순)·평가 이름·매너 얼굴', () => {
  const r = (rating: ReceivedReview['rating'], praises: string[]): ReceivedReview => ({ rating, praises, itemName: '', reviewerNickname: '', createdAt: '' });
  assert.deepEqual(countPraises([r(2, ['응답이 빨라요']), r(1, ['응답이 빨라요', '친절하고 매너가 좋아요']), r(-1, ['응답이 느려요'])]),
    [['응답이 빨라요', 2], ['친절하고 매너가 좋아요', 1]]);
  assert.equal(ratingLabel(-1), '별로예요');
  assert.deepEqual([36.5, 36.4, 40, 29].map(mannerFace), ['🙂', '😐', '😊', '😟']);
});

test('채팅: 시간 표시·약속 표시·약속 알림', () => {
  const now = new Date(2026, 9, 25, 21, 0);
  assert.equal(formatTime(new Date(2026, 9, 25, 20, 12).toISOString(), now), '오후 8:12');
  assert.equal(formatTime(new Date(2026, 9, 25, 0, 5).toISOString(), now), '오전 12:05');
  assert.equal(formatTime(new Date(2026, 9, 24, 9, 0).toISOString(), now), '어제');
  assert.equal(formatTime(new Date(2026, 9, 3, 9, 0).toISOString(), now), '10.03');
  assert.equal(formatMeetAt('2026-01-03T09:05'), '1월 3일 09:05');
  const today = '2026-10-25';
  assert.equal(appointmentNotice({ meetAt: '2026-10-26T10:00', meetStatus: 'PROPOSED', meetProposedBy: 'other' }, 'me', today), '약속 제안 받음');
  assert.equal(appointmentNotice({ meetAt: '2026-10-26T10:00', meetStatus: 'PROPOSED', meetProposedBy: 'me' }, 'me', today), undefined); // 내가 제안
  assert.equal(appointmentNotice({ meetAt: '2026-10-25T18:00', meetStatus: 'ACCEPTED', meetProposedBy: 'me' }, 'me', today), '오늘 약속');
  assert.equal(appointmentNotice({ meetAt: '2026-10-26T18:00', meetStatus: 'ACCEPTED', meetProposedBy: 'me' }, 'me', today), undefined);
  assert.equal(appointmentNotice({ meetAt: null, meetStatus: null, meetProposedBy: null }, 'me', today), undefined);
});
