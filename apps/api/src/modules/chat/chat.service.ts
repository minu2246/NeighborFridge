import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatEventsService } from './chat-events.service';
import { ChatRepository } from './chat.repository';
import { APPOINTMENT_DECLINED_MESSAGE, AppointmentRecord, ChatMessageRecord, ChatRoomRecord, formatAppointmentAccepted, formatAppointmentMessage } from './chat.types';
import { ListMessagesDto } from './dto/list-messages.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly repository: ChatRepository,
    private readonly events: ChatEventsService,
  ) {}

  async createRoom(userId: string, postId: string): Promise<ChatRoomRecord> {
    const room = await this.repository.createRoom(postId, userId);
    if (!room) throw new BadRequestException('거래 가능한 다른 사용자의 게시물만 채팅할 수 있습니다.');
    return room;
  }

  listRooms(userId: string): Promise<ChatRoomRecord[]> {
    return this.repository.listRooms(userId);
  }

  async listMessages(userId: string, roomId: string, query: ListMessagesDto): Promise<ChatMessageRecord[]> {
    await this.requireParticipant(userId, roomId);
    await this.repository.markRead(roomId, userId); // 메시지를 불러오면 = 채팅방을 보고 있으면 읽음
    return this.repository.listMessages(roomId, query.limit, query.offset);
  }

  async sendMessage(userId: string, roomId: string, value: string): Promise<ChatMessageRecord> {
    await this.requireParticipant(userId, roomId);
    const message = await this.repository.createMessage(roomId, userId, value.trim());
    this.events.publish(message);
    return message;
  }

  async getAppointment(userId: string, roomId: string): Promise<AppointmentRecord | null> {
    return this.toAppointment(await this.requireParticipant(userId, roomId), userId);
  }

  // 약속 제안(새로 잡기·변경 모두). 상대가 수락해야 확정
  async saveAppointment(userId: string, roomId: string, meetAt: string, value: string) {
    await this.requireParticipant(userId, roomId);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
    if (meetAt.slice(0, 10) < today) throw new BadRequestException('지난 날짜로는 약속을 잡을 수 없습니다.');
    const place = value.trim();
    await this.repository.saveAppointment(roomId, meetAt, place, userId);
    const message = await this.sendMessage(userId, roomId, formatAppointmentMessage(meetAt, place));
    const appointment: AppointmentRecord = { roomId, meetAt, place, status: 'PROPOSED', proposedByMe: true };
    return { appointment, message };
  }

  // 상대가 제안한 약속에만 수락/거절 가능
  async respondAppointment(userId: string, roomId: string, accept: boolean) {
    const room = await this.requireParticipant(userId, roomId);
    if (room.meetStatus !== 'PROPOSED' || !room.meetAt || !room.meetPlace || room.meetProposedBy === userId) {
      throw new BadRequestException('수락하거나 거절할 약속 제안이 없습니다.');
    }
    if (accept) await this.repository.acceptAppointment(roomId);
    else await this.repository.clearAppointment(roomId);
    const message = await this.sendMessage(userId, roomId, accept ? formatAppointmentAccepted(room.meetAt, room.meetPlace) : APPOINTMENT_DECLINED_MESSAGE);
    const appointment: AppointmentRecord | null = accept ? { roomId, meetAt: room.meetAt, place: room.meetPlace, status: 'ACCEPTED', proposedByMe: false } : null;
    return { appointment, message };
  }

  private toAppointment(room: ChatRoomRecord, userId: string): AppointmentRecord | null {
    if (!room.meetAt || !room.meetPlace) return null;
    return { roomId: room.id, meetAt: room.meetAt, place: room.meetPlace, status: room.meetStatus ?? 'ACCEPTED', proposedByMe: room.meetProposedBy === userId };
  }

  async requireParticipant(userId: string, roomId: string): Promise<ChatRoomRecord> {
    const room = await this.repository.findRoomForUser(roomId, userId);
    if (!room) throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    return room;
  }
}
