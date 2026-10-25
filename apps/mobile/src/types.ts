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
  authorId?: string;
  weightGrams?: number;
  liked?: boolean;
}

export interface NewPostInput {
  name: string;
  title: string;
  type: TradeType;
  expiryDate: string;
  place: string;
  description?: string;
  weightGrams?: number;
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
  neighborId?: string; // 정식 모드에서 상대 프로필 보기용
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: number;
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
  sharedKg: number;
  carbonSavedKg: number;
}

export interface NeighborProfile extends UserStats {
  id: string;
  nickname: string;
  neighborhoodName: string | null;
}

export interface PendingReview {
  postId: string;
  itemName: string;
  partnerNickname: string;
}

export type ReviewRating = -1 | 1 | 2;

export interface ReceivedReview {
  rating: ReviewRating;
  praises: string[];
  itemName: string;
  reviewerNickname: string;
  createdAt: string;
  isNew?: boolean;
}

export interface ReviewNotifications {
  pendingReviews: number;
  newReviews: number;
}

// 포장지 OCR 결과. allergenLabelFound가 false면 "없음"이 아니라 "확인 불가".
export interface LabelInfo {
  itemName?: string;
  expiryDate?: string;
  weightText?: string;
  weightGrams?: number;
  allergens: string[];
  allergenLabelFound: boolean;
}
