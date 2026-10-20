export const TRADE_TYPES = ['SHARE', 'TRADE', 'FREE_MEAL'] as const;
export type TradeType = (typeof TRADE_TYPES)[number];
export type PostSort = 'distance' | 'expiry';
export type MutablePostStatus = 'ACTIVE' | 'RESERVED' | 'COMPLETED';

export interface PostRecord {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  itemName: string;
  imageUrls: string[];
  expiryDate: string;
  tradeType: TradeType;
  status: 'ACTIVE' | 'RESERVED' | 'COMPLETED' | 'EXPIRED' | 'DELETED';
  placeName: string | null;
  distanceKm?: number;
  dDay?: number;
  authorNickname?: string;
  weightGrams: number | null;
  createdAt: string;
}

// -1 별로예요, 1 좋아요, 2 최고예요
export const REVIEW_RATINGS = [-1, 1, 2] as const;
export type ReviewRating = (typeof REVIEW_RATINGS)[number];

export interface PendingReview {
  postId: string;
  itemName: string;
  partnerNickname: string;
}

// 후기 항목: 좋은 평가(최고예요·좋아요)엔 칭찬, 별로예요엔 비매너 항목만 선택 가능
export const POSITIVE_PRAISES = ['시간 약속을 잘 지켜요', '친절하고 매너가 좋아요', '응답이 빨라요', '상품 상태가 설명과 같아요', '나눔이 정성스러워요'] as const;
export const NEGATIVE_PRAISES = ['약속 시간을 안 지켜요', '불친절해요', '응답이 느려요', '상품 상태가 설명과 달라요'] as const;

export interface ReceivedReview {
  rating: ReviewRating;
  praises: string[];
  itemName: string;
  reviewerNickname: string;
  createdAt: string;
}
