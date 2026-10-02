import { Appointment, ChatMessage, ChatTarget, FoodPost, Neighborhood, NewPostInput, TradeType } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';
const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

export interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; nickname: string };
}
export const USE_LOCAL_STORE = process.env.EXPO_PUBLIC_USE_LOCAL_STORE === 'true';

// ponytail: 토큰은 메모리에만 보관 → 앱 새로고침 시 재로그인 필요. 자동 로그인이 필요하면 expo-secure-store로 옮긴다.
let session: { token: string; userId: string } | null = null;

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
  session = { token: result.accessToken, userId: result.user.id };
  return result;
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return authenticate(USE_LOCAL_STORE ? '/local/auth/login' : '/auth/login', { email, password });
}

export function register(email: string, nickname: string, password: string): Promise<AuthResponse> {
  return authenticate(USE_LOCAL_STORE ? '/local/auth/register' : '/auth/register', { email, nickname, password });
}

// ---- 정식 API 응답 → 화면 타입 변환 ----
interface ApiPost {
  id: string; userId: string; title: string; itemName: string; imageUrls: string[]; expiryDate: string;
  tradeType: 'SHARE' | 'TRADE' | 'FREE_MEAL'; status: FoodPost['status']; placeName: string | null; distanceKm?: number; dDay?: number;
}
const tradeTypes: Record<ApiPost['tradeType'], TradeType> = { SHARE: '나눔', TRADE: '교환', FREE_MEAL: '한끼 나눔' };
const tradeCodes = { '나눔': 'SHARE', '교환': 'TRADE', '한끼 나눔': 'FREE_MEAL' } as const;

function toFoodPost(post: ApiPost): FoodPost {
  return {
    id: post.id, emoji: '🥕', name: post.itemName, title: post.title, type: tradeTypes[post.tradeType],
    distance: `${(post.distanceKm ?? 0).toFixed(1)}km`, dDay: post.dDay === undefined ? post.expiryDate : post.dDay === 0 ? '오늘' : `D-${post.dDay}`,
    place: post.placeName ?? '', color: '#E6F4DE', expiryDate: post.expiryDate, status: post.status,
    imageUrl: post.imageUrls[0], isMine: post.userId === session?.userId,
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
  // ponytail: 게시물 좌표 = 인증한 동네 좌표. 게시물별 거래 위치 지정이 필요하면 등록 화면에서 좌표를 받는다.
  const body = { title: input.title, itemName: input.name, expiryDate: input.expiryDate, tradeType: tradeCodes[input.type], imageUrls: imageUrl ? [imageUrl] : [], latitude: neighborhood.latitude, longitude: neighborhood.longitude, placeName: input.place };
  return toFoodPost(await request<ApiPost>('/posts', { method: 'POST', body: JSON.stringify(body) }));
}

export async function updatePostStatus(postId: string, status: 'ACTIVE' | 'RESERVED' | 'COMPLETED'): Promise<void> {
  await request(`/${USE_LOCAL_STORE ? 'local/posts' : 'posts'}/${encodeURIComponent(postId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function getNeighborhood(): Promise<Neighborhood | null> {
  if (USE_LOCAL_STORE) return request('/local/neighborhood', { method: 'GET' });
  const me = await request<{ neighborhoodName: string | null; latitude: number | null; longitude: number | null; radiusKm: number }>('/users/me', { method: 'GET' });
  return me.neighborhoodName && me.latitude !== null && me.longitude !== null
    ? { name: me.neighborhoodName, latitude: me.latitude, longitude: me.longitude, radiusKm: me.radiusKm as Neighborhood['radiusKm'] } : null;
}

export async function saveNeighborhood(value: Neighborhood): Promise<Neighborhood> {
  if (USE_LOCAL_STORE) return request('/local/neighborhood', { method: 'PUT', body: JSON.stringify({ name: value.name, latitude: value.latitude, longitude: value.longitude, radiusKm: value.radiusKm }) });
  await request('/users/me/location', { method: 'PATCH', body: JSON.stringify({ latitude: value.latitude, longitude: value.longitude, neighborhoodName: value.name, radiusKm: value.radiusKm }) });
  return value;
}

// ---- 채팅 ----
export async function openChatRoom(post: FoodPost): Promise<ChatTarget> {
  const target = { item: post.name, emoji: post.emoji, neighborName: '게시물 이웃' };
  if (USE_LOCAL_STORE) return { roomId: `post-${post.id}`, ...target };
  const room = await request<{ id: string }>('/chats/rooms', { method: 'POST', body: JSON.stringify({ postId: post.id }) });
  return { roomId: room.id, ...target };
}

export async function listChatRooms(): Promise<ChatTarget[]> {
  const rooms = await request<{ id: string; postTitle: string; ownerId: string }[]>('/chats/rooms', { method: 'GET' });
  return rooms.map((room) => ({ roomId: room.id, item: room.postTitle, emoji: '🥕', neighborName: room.ownerId === session?.userId ? '문의한 이웃' : '게시물 이웃' }));
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

export async function saveAppointment(roomId: string, meetAt: string, place: string): Promise<{ appointment: Appointment; message: ChatMessage }> {
  const result = await request<{ appointment: Appointment; message: ChatMessage }>(`${roomPath(roomId)}/appointment`, { method: 'PUT', body: JSON.stringify(USE_LOCAL_STORE ? { sender: 'me', meetAt, place } : { meetAt, place }) });
  return { appointment: result.appointment, message: toChatMessage(result.message) };
}

// ponytail: 정식 모드도 로컬 디스크 업로드(/local/uploads, 인증 없음) 사용. 외부 배포 전 S3 호환 저장소 + 인증 업로드로 교체.
export async function uploadImage(base64: string, mimeType: string): Promise<string> {
  const result = await request<{ imageUrl: string }>('/local/uploads', { method: 'POST', body: JSON.stringify({ base64, mimeType }) });
  return `${SERVER_URL}${result.imageUrl}`;
}
