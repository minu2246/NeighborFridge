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
}

export interface NewPostInput {
  name: string;
  title: string;
  type: TradeType;
  expiryDate: string;
  place: string;
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
