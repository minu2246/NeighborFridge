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
