const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; nickname: string };
}

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
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    throw new Error(message ?? '요청을 처리하지 못했습니다.');
  }
  return response.json() as Promise<T>;
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function register(email: string, nickname: string, password: string): Promise<AuthResponse> {
  return request('/auth/register', { method: 'POST', body: JSON.stringify({ email, nickname, password }) });
}
