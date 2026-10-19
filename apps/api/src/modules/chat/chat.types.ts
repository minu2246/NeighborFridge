export interface ChatRoomRecord {
  id: string;
  postId: string;
  postTitle: string;
  ownerId: string;
  requesterId: string;
  meetAt: string | null;
  meetPlace: string | null;
  partnerNickname?: string; // 목록 조회 시에만 채워짐
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

// meetAt: 서울 기준 'YYYY-MM-DDTHH:mm'
export function formatAppointmentMessage(meetAt: string, place: string): string {
  return `📅 약속: ${Number(meetAt.slice(5, 7))}월 ${Number(meetAt.slice(8, 10))}일 ${meetAt.slice(11, 16)} · ${place}`;
}
