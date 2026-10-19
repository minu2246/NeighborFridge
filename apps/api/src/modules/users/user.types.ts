export interface UserRecord {
  id: string;
  email: string;
  nickname: string;
  profileImage: string | null;
  neighborhoodName: string | null;
  radiusKm: number;
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
}

export interface UserWithPassword extends UserRecord {
  passwordHash: string | null;
}
