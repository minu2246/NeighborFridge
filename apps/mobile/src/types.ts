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
}
