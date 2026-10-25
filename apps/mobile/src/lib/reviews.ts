import { ReceivedReview, ReviewRating } from '../types';

export const RATINGS: { value: ReviewRating; label: string }[] = [{ value: 2, label: '최고예요' }, { value: 1, label: '좋아요' }, { value: -1, label: '별로예요' }];
// 서버(post.types.ts)와 같은 목록이어야 함
export const POSITIVE_PRAISES = ['시간 약속을 잘 지켜요', '친절하고 매너가 좋아요', '응답이 빨라요', '상품 상태가 설명과 같아요', '나눔이 정성스러워요'];
export const NEGATIVE_PRAISES = ['약속 시간을 안 지켜요', '불친절해요', '응답이 느려요', '상품 상태가 설명과 달라요'];

export const ratingLabel = (value: ReviewRating) => RATINGS.find((rating) => rating.value === value)?.label ?? '';

// 받은 칭찬 항목별 횟수(좋은 평가만), 많은 순
export const countPraises = (received: ReceivedReview[]) => Object.entries(received.filter((r) => r.rating > 0).flatMap((r) => r.praises)
  .reduce<Record<string, number>>((counts, praise) => ({ ...counts, [praise]: (counts[praise] ?? 0) + 1 }), {}))
  .sort((a, b) => b[1] - a[1]);

export const mannerFace = (t: number) => t >= 50 ? '😆' : t >= 40 ? '😊' : t >= 36.5 ? '🙂' : t >= 30 ? '😐' : '😟';
