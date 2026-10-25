export interface ChatRoomRecord {
  id: string;
  postId: string;
  postTitle: string;
  ownerId: string;
  requesterId: string;
  meetAt: string | null;
  meetPlace: string | null;
  meetStatus: AppointmentStatus | null;
  meetProposedBy: string | null;
  // 아래는 목록 조회 시에만 채워짐
  partnerNickname?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  createdAt: string;
}

export interface ChatMessageRecord {
  id: string;
  roomId: string;
  senderId: string;
  message: string;
  sentAt: string;
  readAt: string | null;
}

// 제안(PROPOSED) → 상대 수락(ACCEPTED). 거절하면 약속을 비움(null)
export type AppointmentStatus = 'PROPOSED' | 'ACCEPTED';

export interface AppointmentRecord {
  roomId: string;
  meetAt: string;
  place: string;
  status: AppointmentStatus;
  proposedByMe: boolean;
}

// meetAt: 서울 기준 'YYYY-MM-DDTHH:mm'
const describeAppointment = (meetAt: string, place: string) => `${Number(meetAt.slice(5, 7))}월 ${Number(meetAt.slice(8, 10))}일 ${meetAt.slice(11, 16)} · ${place}`;

export function formatAppointmentMessage(meetAt: string, place: string): string {
  return `📅 약속: ${describeAppointment(meetAt, place)}`;
}

export function formatAppointmentAccepted(meetAt: string, place: string): string {
  return `✅ 약속 확정: ${describeAppointment(meetAt, place)}`;
}

export const APPOINTMENT_DECLINED_MESSAGE = '❌ 약속 제안을 거절했어요. 다른 시간을 정해 주세요.';
