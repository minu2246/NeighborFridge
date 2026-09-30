export const TRADE_TYPES = ['SHARE', 'TRADE', 'FREE_MEAL'] as const;
export type TradeType = (typeof TRADE_TYPES)[number];
export type PostSort = 'distance' | 'expiry';

export interface PostRecord {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  itemName: string;
  imageUrls: string[];
  expiryDate: string;
  tradeType: TradeType;
  status: string;
  placeName: string | null;
  distanceKm?: number;
  dDay?: number;
  createdAt: string;
}
