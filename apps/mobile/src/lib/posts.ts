import { FoodPost } from '../types';

// 소비기한까지 남은 날(오늘 0). '2099-12-31'은 데모 데이터의 "기한 없음" 표시라 dDay 문자열을 쓴다.
export function expiryDays(post: FoodPost): number {
  if (post.expiryDate && post.expiryDate !== '2099-12-31') {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((new Date(`${post.expiryDate}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
  }
  if (post.dDay === '오늘') return 0;
  const match = post.dDay.match(/D-(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

export function displayDDay(post: FoodPost): string {
  if (!post.expiryDate || post.expiryDate === '2099-12-31') return post.dDay;
  const days = expiryDays(post);
  return days === 0 ? '오늘' : `D-${days}`;
}

export interface PostFilter {
  only?: 'mine' | 'liked';
  radiusKm: number;
  trade: '전체' | FoodPost['type'];
  sort: 'distance' | 'expiry';
}

// 홈 목록: 내 게시물/찜 → 반경 → 거래 유형 → 거리순·소비기한순.
// 찜 목록은 반경과 상관없이 보여 준다(동네 범위를 줄여도 찜한 게시물이 사라지지 않게).
export function filterPosts(posts: FoodPost[], filter: PostFilter): FoodPost[] {
  return posts
    .filter((post) => filter.only === 'mine' ? post.isMine : filter.only === 'liked' ? post.liked : true)
    .filter((post) => filter.only === 'liked' || Number.parseFloat(post.distance) <= filter.radiusKm)
    .filter((post) => filter.trade === '전체' || post.type === filter.trade)
    .sort((a, b) => filter.sort === 'distance'
      ? Number.parseFloat(a.distance) - Number.parseFloat(b.distance)
      : expiryDays(a) - expiryDays(b));
}
