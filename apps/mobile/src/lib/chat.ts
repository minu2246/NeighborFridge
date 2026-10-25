import { Appointment, ChatTarget } from '../types';

// 오늘이면 "오후 8:12", 어제면 "어제", 그 외 "10.18"
export function formatTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const days = Math.round((new Date(now.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86_400_000);
  if (days === 0) return `${date.getHours() < 12 ? '오전' : '오후'} ${date.getHours() % 12 || 12}:${String(date.getMinutes()).padStart(2, '0')}`;
  return days === 1 ? '어제' : `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, '0')}`;
}

export const formatMeetAt = (meetAt: string) => `${Number(meetAt.slice(5, 7))}월 ${Number(meetAt.slice(8, 10))}일 ${meetAt.slice(11)}`;

// 채팅 목록 표시: 상대가 제안한 약속이 있으면 "약속 제안 받음", 확정된 약속이 오늘이면 "오늘 약속"
export function appointmentNotice(
  room: { meetAt: string | null; meetStatus: Appointment['status'] | null; meetProposedBy: string | null },
  myId: string | undefined,
  today: string, // 서울 기준 YYYY-MM-DD
): ChatTarget['appointmentNotice'] {
  if (room.meetStatus === 'PROPOSED' && room.meetProposedBy !== myId) return '약속 제안 받음';
  if (room.meetStatus === 'ACCEPTED' && room.meetAt?.slice(0, 10) === today) return '오늘 약속';
  return undefined;
}
