export interface UserRecord {
  id: string;
  email: string;
  nickname: string;
  profileImage: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

export interface UserWithPassword extends UserRecord {
  passwordHash: string | null;
}
