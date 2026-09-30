import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatEventsService } from './chat-events.service';
import { ChatRepository } from './chat.repository';
import { ChatMessageRecord, ChatRoomRecord } from './chat.types';
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
    return this.repository.listMessages(roomId, query.limit, query.offset);
  }

  async sendMessage(userId: string, roomId: string, value: string): Promise<ChatMessageRecord> {
    await this.requireParticipant(userId, roomId);
    const message = await this.repository.createMessage(roomId, userId, value.trim());
    this.events.publish(message);
    return message;
  }

  async requireParticipant(userId: string, roomId: string): Promise<ChatRoomRecord> {
    const room = await this.repository.findRoomForUser(roomId, userId);
    if (!room) throw new NotFoundException('채팅방을 찾을 수 없습니다.');
    return room;
  }
}
