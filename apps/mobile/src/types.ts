export type TradeType = '나눔' | '교환' | '한끼 나눔';
export type TabName = 'home' | 'add' | 'chat' | 'profile';

export interface FoodPost {
  id: string;
  emoji: string;
  name: string;
  title: string;
  type: TradeType;
  distance: string;
  dDay: string;
  place: string;
  color: string;
  expiryDate?: string;
  status?: 'ACTIVE' | 'RESERVED' | 'COMPLETED' | 'EXPIRED';
  imageUrl?: string;
  isMine?: boolean;
  description?: string;
  authorName?: string;
}

export interface NewPostInput {
  name: string;
  title: string;
  type: TradeType;
  expiryDate: string;
  place: string;
  description?: string;
  photoBase64?: string;
  photoMimeType?: string;
}

export interface Neighborhood {
  name: string;
  latitude: number;
  longitude: number;
  radiusKm: 1 | 3 | 5;
  verifiedAt?: string;
}

export interface ChatTarget {
  roomId: string;
  item: string;
  emoji: string;
  neighborName: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  sender: string;
  message: string;
  sentAt: string;
}

export interface Appointment {
  roomId: string;
  meetAt: string;
  place: string;
  updatedAt?: string;
}

export interface UserStats {
  completedPosts: number;
  activePosts: number;
  chatPartners: number;
  mannerTemperature: number;
  reviewCount: number;
}

export interface PendingReview {
  postId: string;
  itemName: string;
  partnerNickname: string;
}

export type ReviewRating = -1 | 1 | 2;

// 포장지 OCR 결과. allergenLabelFound가 false면 "없음"이 아니라 "확인 불가".
export interface LabelInfo {
  itemName?: string;
  expiryDate?: string;
  weightText?: string;
  weightGrams?: number;
  allergens: string[];
  allergenLabelFound: boolean;
}
