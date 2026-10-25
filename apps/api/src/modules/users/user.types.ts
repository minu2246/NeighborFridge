export interface UserRecord {
  id: string;
  email: string;
  nickname: string;
  profileImage: string | null;
  neighborhoodName: string | null;
  radiusKm: number;
  notifyReviews: boolean; // 거래 후기 알림
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

export interface UserStats {
  completedPosts: number;
  activePosts: number;
  chatPartners: number;
  mannerTemperature: number;
  reviewCount: number;
  sharedKg: number;
  carbonSavedKg: number; // 추정치
}

export interface PublicProfile extends UserStats {
  id: string;
  nickname: string;
  neighborhoodName: string | null;
}

export interface UserWithPassword extends UserRecord {
  passwordHash: string | null;
}
