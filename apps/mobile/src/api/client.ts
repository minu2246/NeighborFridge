import { Appointment, ChatMessage, ChatTarget, FoodPost, Neighborhood, LabelInfo, MyAccount, NeighborProfile, NewPostInput, PendingReview, ReceivedReview, ReviewNotifications, ReviewRating, TradeType, UserStats } from '../types';

import { appointmentNotice } from '../lib/chat';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';
const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

export interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; nickname: string };
}
export const USE_LOCAL_STORE = process.env.EXPO_PUBLIC_USE_LOCAL_STORE === 'true';

let session: { token: string; userId: string; nickname: string } | null = null;

// 로그인 유지: 웹은 localStorage, 앱(localStorage 없음)은 expo-secure-store(기기 암호화 저장소). 정식 모드에서만 사용.
// secure-store는 쓰는 시점에 불러온다 → Node에서 이 파일을 불러오는 E2E 스크립트도 동작.
const SESSION_KEY = 'neighborfridge.session';
const secureStore = () => require('expo-secure-store') as typeof import('expo-secure-store');
const sessionStore = {
  get: async () => typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_KEY) : secureStore().getItemAsync(SESSION_KEY),
  set: async (value: string) => typeof localStorage !== 'undefined' ? localStorage.setItem(SESSION_KEY, value) : secureStore().setItemAsync(SESSION_KEY, value),
  remove: async () => typeof localStorage !== 'undefined' ? localStorage.removeItem(SESSION_KEY) : secureStore().deleteItemAsync(SESSION_KEY),
};

export async function getHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(session && !USE_LOCAL_STORE ? { Authorization: `Bearer ${session.token}` } : {}), ...init.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    throw new Error(message ?? '요청을 처리하지 못했습니다.');
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

async function authenticate(path: string, body: object): Promise<AuthResponse> {
  const result = await request<AuthResponse>(path, { method: 'POST', body: JSON.stringify(body) });
  session = { token: result.accessToken, userId: result.user.id, nickname: result.user.nickname };
  if (!USE_LOCAL_STORE) await sessionStore.set(JSON.stringify(session)).catch(() => undefined);
  return result;
}

// 저장된 로그인 복원. 토큰이 만료됐거나 서버가 거부하면 지우고 null.
export async function restoreSession(): Promise<{ nickname: string } | null> {
  if (USE_LOCAL_STORE) return null;
  const saved = await sessionStore.get().catch(() => null);
  if (!saved) return null;
  session = JSON.parse(saved) as NonNullable<typeof session>;
  try {
    const me = await request<{ nickname: string }>('/users/me', { method: 'GET' });
    session.nickname = me.nickname;
    return { nickname: me.nickname };
  } catch {
    await logout();
    return null;
  }
}

export const isLoggedIn = (): boolean => session !== null;

export async function logout(): Promise<void> {
  session = null;
  await sessionStore.remove().catch(() => undefined);
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return authenticate(USE_LOCAL_STORE ? '/local/auth/login' : '/auth/login', { email, password });
}

export function register(email: string, nickname: string, password: string): Promise<AuthResponse> {
  return authenticate(USE_LOCAL_STORE ? '/local/auth/register' : '/auth/register', { email, nickname, password });
}

// ---- 정식 API 응답 → 화면 타입 변환 ----
interface ApiPost {
  id: string; userId: string; title: string; description: string | null; authorNickname?: string; itemName: string; imageUrls: string[]; expiryDate: string;
  tradeType: 'SHARE' | 'TRADE' | 'FREE_MEAL'; status: FoodPost['status']; placeName: string | null; distanceKm?: number; dDay?: number; weightGrams?: number | null;
}
const tradeTypes: Record<ApiPost['tradeType'], TradeType> = { SHARE: '나눔', TRADE: '교환', FREE_MEAL: '한끼 나눔' };
const tradeCodes = { '나눔': 'SHARE', '교환': 'TRADE', '한끼 나눔': 'FREE_MEAL' } as const;

function toFoodPost(post: ApiPost): FoodPost {
  return {
    id: post.id, emoji: '🥕', name: post.itemName, title: post.title, type: tradeTypes[post.tradeType],
    distance: `${(post.distanceKm ?? 0).toFixed(1)}km`, dDay: post.dDay === undefined ? post.expiryDate : post.dDay === 0 ? '오늘' : `D-${post.dDay}`,
    place: post.placeName ?? '', color: '#E6F4DE', expiryDate: post.expiryDate, status: post.status,
    imageUrl: post.imageUrls[0], isMine: post.userId === session?.userId,
    description: post.description ?? undefined, authorName: post.authorNickname, authorId: post.userId, weightGrams: post.weightGrams ?? undefined,
  };
}

export async function listPosts(neighborhood: Neighborhood): Promise<FoodPost[]> {
  if (USE_LOCAL_STORE) return request('/local/posts', { method: 'GET' });
  const query = `latitude=${neighborhood.latitude}&longitude=${neighborhood.longitude}&radiusKm=${neighborhood.radiusKm}&limit=100`;
  return (await request<ApiPost[]>(`/posts/nearby?${query}`, { method: 'GET' })).map(toFoodPost);
}

export async function createPost(input: NewPostInput, neighborhood: Neighborhood): Promise<FoodPost> {
  const imageUrl = input.photoBase64 && input.photoMimeType ? await uploadImage(input.photoBase64, input.photoMimeType) : undefined;
  if (USE_LOCAL_STORE) {
    const draft = { emoji: '🥕', name: input.name, title: input.title, type: input.type, distance: '0km', dDay: input.expiryDate, place: input.place, color: '#E6F4DE', expiryDate: input.expiryDate, status: 'ACTIVE' as const, imageUrl };
    return request('/local/posts', { method: 'POST', body: JSON.stringify(draft) });
  }
  // 게시물 좌표 = 등록 화면에서 지정한 거래 위치, 없으면 인증한 동네 좌표(서버가 동네 10km 이내인지 확인)
  const point = input.location ?? neighborhood;
  const body = { title: input.title, itemName: input.name, expiryDate: input.expiryDate, tradeType: tradeCodes[input.type], imageUrls: imageUrl ? [imageUrl] : [], latitude: point.latitude, longitude: point.longitude, placeName: input.place, ...(input.description ? { description: input.description } : {}), ...(input.weightGrams ? { weightGrams: input.weightGrams } : {}) };
  return { ...toFoodPost(await request<ApiPost>('/posts', { method: 'POST', body: JSON.stringify(body) })), authorName: session?.nickname };
}

// completedWith: 거래 완료 시 거래 상대 userId (정식 모드 전용)
export async function updatePostStatus(postId: string, status: 'ACTIVE' | 'RESERVED' | 'COMPLETED', completedWith?: string): Promise<void> {
  await request(`/${USE_LOCAL_STORE ? 'local/posts' : 'posts'}/${encodeURIComponent(postId)}/status`, { method: 'PATCH', body: JSON.stringify(completedWith ? { status, completedWith } : { status }) });
}

// 내 게시물로 채팅한 이웃 = 거래 상대 후보. 로컬 모드는 빈 목록.
export async function listPostChatPartners(postId: string): Promise<{ userId: string; nickname: string }[]> {
  if (USE_LOCAL_STORE) return [];
  const rooms = await request<{ postId: string; ownerId: string; requesterId: string; partnerNickname?: string }[]>('/chats/rooms', { method: 'GET' });
  return rooms.filter((room) => room.postId === postId && room.ownerId === session?.userId).map((room) => ({ userId: room.requesterId, nickname: room.partnerNickname ?? '이웃' }));
}

// 관심 목록(찜): 동네 반경과 상관없이 거래 중인 찜 게시물. 동네를 주면 거리 계산. 정식 모드 + 로그인 전용
export async function listLikedPosts(neighborhood?: Neighborhood): Promise<FoodPost[]> {
  if (USE_LOCAL_STORE || !session) return [];
  const query = neighborhood ? `?latitude=${neighborhood.latitude}&longitude=${neighborhood.longitude}` : '';
  return (await request<ApiPost[]>(`/posts/liked${query}`, { method: 'GET' })).map((post) => ({ ...toFoodPost(post), liked: true }));
}

export async function setPostLiked(postId: string, liked: boolean): Promise<void> {
  await request(`/posts/${encodeURIComponent(postId)}/like`, { method: liked ? 'PUT' : 'DELETE' });
}

export async function listPendingReviews(): Promise<PendingReview[]> {
  if (USE_LOCAL_STORE || !session) return [];
  return request('/reviews/pending', { method: 'GET' });
}

export async function submitReview(postId: string, rating: ReviewRating, praises: string[] = []): Promise<void> {
  await request('/reviews', { method: 'POST', body: JSON.stringify({ postId, rating, praises }) });
}

// userId 없으면 내가 받은 후기
export async function listReceivedReviews(userId?: string): Promise<ReceivedReview[]> {
  if (USE_LOCAL_STORE || !session) return [];
  return request(`/reviews/received${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, { method: 'GET' });
}

// 후기 알림 배지. 로컬 모드·데모 진입은 0.
export async function getReviewNotifications(): Promise<ReviewNotifications> {
  if (USE_LOCAL_STORE || !session) return { pendingReviews: 0, newReviews: 0 };
  return request('/reviews/notifications', { method: 'GET' });
}

// 다른 이웃 프로필. 로컬 모드·데모 진입은 null.
export async function getUserProfile(userId: string): Promise<NeighborProfile | null> {
  if (USE_LOCAL_STORE || !session) return null;
  return request(`/users/${encodeURIComponent(userId)}/profile`, { method: 'GET' });
}

export async function getNeighborhood(): Promise<Neighborhood | null> {
  if (USE_LOCAL_STORE) return request('/local/neighborhood', { method: 'GET' });
  const me = await request<{ neighborhoodName: string | null; latitude: number | null; longitude: number | null; radiusKm: number }>('/users/me', { method: 'GET' });
  return me.neighborhoodName && me.latitude !== null && me.longitude !== null
    ? { name: me.neighborhoodName, latitude: me.latitude, longitude: me.longitude, radiusKm: me.radiusKm as Neighborhood['radiusKm'] } : null;
}

// 계정 설정(정식 모드 + 로그인 전용)
export function getMe(): Promise<MyAccount> {
  return request('/users/me', { method: 'GET' });
}

export async function updateMe(input: { nickname?: string; notifyReviews?: boolean }): Promise<MyAccount> {
  const me = await request<MyAccount>('/users/me', { method: 'PATCH', body: JSON.stringify(input) });
  if (session && session.nickname !== me.nickname) {
    session.nickname = me.nickname;
    await sessionStore.set(JSON.stringify(session)).catch(() => undefined);
  }
  return me;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request('/users/me/password', { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) });
}

// 이메일(로그인 아이디) 변경. 비밀번호 확인 필요
export function changeEmail(email: string, password: string): Promise<MyAccount> {
  return request('/users/me/email', { method: 'PATCH', body: JSON.stringify({ email, password }) });
}

// 회원 탈퇴(되돌릴 수 없음). 성공하면 저장된 로그인도 지운다.
export async function deleteAccount(password: string): Promise<void> {
  await request('/users/me', { method: 'DELETE', body: JSON.stringify({ password }) });
  await logout();
}

// 정식 모드 전용. 로컬 모드·데모 진입(토큰 없음)은 null.
export async function getMyStats(): Promise<UserStats | null> {
  if (USE_LOCAL_STORE || !session) return null;
  return request('/users/me/stats', { method: 'GET' });
}

export async function saveNeighborhood(value: Neighborhood): Promise<Neighborhood> {
  if (USE_LOCAL_STORE) return request('/local/neighborhood', { method: 'PUT', body: JSON.stringify({ name: value.name, latitude: value.latitude, longitude: value.longitude, radiusKm: value.radiusKm }) });
  await request('/users/me/location', { method: 'PATCH', body: JSON.stringify({ latitude: value.latitude, longitude: value.longitude, neighborhoodName: value.name, radiusKm: value.radiusKm }) });
  return value;
}

// ---- 채팅 ----
export async function openChatRoom(post: FoodPost): Promise<ChatTarget> {
  const target = { item: post.name, emoji: post.emoji, neighborName: post.authorName ?? '게시물 이웃' };
  if (USE_LOCAL_STORE) return { roomId: `post-${post.id}`, ...target };
  const room = await request<{ id: string }>('/chats/rooms', { method: 'POST', body: JSON.stringify({ postId: post.id }) });
  return { roomId: room.id, ...target, neighborId: post.authorId };
}

export async function listChatRooms(): Promise<ChatTarget[]> {
  const rooms = await request<{ id: string; postTitle: string; ownerId: string; requesterId: string; partnerNickname?: string; lastMessage?: string; lastMessageAt?: string; unreadCount?: number; meetAt: string | null; meetStatus: Appointment['status'] | null; meetProposedBy: string | null }[]>('/chats/rooms', { method: 'GET' });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  return rooms.map((room) => ({ roomId: room.id, item: room.postTitle, emoji: '🥕', neighborName: room.partnerNickname ?? (room.ownerId === session?.userId ? '문의한 이웃' : '게시물 이웃'), neighborId: room.ownerId === session?.userId ? room.requesterId : room.ownerId, appointmentNotice: appointmentNotice(room, session?.userId, today), lastMessage: room.lastMessage, lastMessageAt: room.lastMessageAt, unread: room.unreadCount }));
}

const roomPath = (roomId: string) => `/${USE_LOCAL_STORE ? 'local' : 'chats'}/rooms/${encodeURIComponent(roomId)}`;
// 정식 API는 senderId를 주므로 화면용 sender('me' | 'them')로 맞춘다.
const toChatMessage = (message: ChatMessage & { senderId?: string }): ChatMessage =>
  USE_LOCAL_STORE ? message : { ...message, sender: message.senderId === session?.userId ? 'me' : 'them' };

export async function listMessages(roomId: string): Promise<ChatMessage[]> {
  return (await request<ChatMessage[]>(`${roomPath(roomId)}/messages${USE_LOCAL_STORE ? '' : '?limit=100'}`, { method: 'GET' })).map(toChatMessage);
}

export async function sendMessage(roomId: string, message: string): Promise<ChatMessage> {
  return toChatMessage(await request(`${roomPath(roomId)}/messages`, { method: 'POST', body: JSON.stringify(USE_LOCAL_STORE ? { sender: 'me', message } : { message }) }));
}

export function getAppointment(roomId: string): Promise<Appointment | null> {
  return request(`${roomPath(roomId)}/appointment`, { method: 'GET' });
}

// 상대가 제안한 약속 수락/거절(정식 모드 전용). 거절하면 appointment는 null
export async function respondAppointment(roomId: string, accept: boolean): Promise<{ appointment: Appointment | null; message: ChatMessage }> {
  const result = await request<{ appointment: Appointment | null; message: ChatMessage }>(`${roomPath(roomId)}/appointment/respond`, { method: 'POST', body: JSON.stringify({ accept }) });
  return { appointment: result.appointment, message: toChatMessage(result.message) };
}

export async function saveAppointment(roomId: string, meetAt: string, place: string): Promise<{ appointment: Appointment; message: ChatMessage }> {
  const result = await request<{ appointment: Appointment; message: ChatMessage }>(`${roomPath(roomId)}/appointment`, { method: 'PUT', body: JSON.stringify(USE_LOCAL_STORE ? { sender: 'me', meetAt, place } : { meetAt, place }) });
  return { appointment: result.appointment, message: toChatMessage(result.message) };
}

// 포장지 사진 OCR(무료, 서버의 tesseract.js). 정식 모드·로그인 필요.
export function readLabel(base64: string, mimeType: string): Promise<LabelInfo> {
  return request('/ocr/label', { method: 'POST', body: JSON.stringify({ base64, mimeType }) });
}

// ponytail: 정식 모드도 로컬 디스크 업로드(/local/uploads, 인증 없음) 사용. 외부 배포 전 S3 호환 저장소 + 인증 업로드로 교체.
export async function uploadImage(base64: string, mimeType: string): Promise<string> {
  const result = await request<{ imageUrl: string }>('/local/uploads', { method: 'POST', body: JSON.stringify({ base64, mimeType }) });
  return `${SERVER_URL}${result.imageUrl}`;
}
