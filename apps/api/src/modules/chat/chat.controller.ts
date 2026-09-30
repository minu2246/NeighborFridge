import {
  Body, Controller, Get, MessageEvent, Param, ParseUUIDPipe, Post, Query, Sse, UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.types';
import { ChatEventsService } from './chat-events.service';
import { ChatService } from './chat.service';
import { ChatMessageRecord, ChatRoomRecord } from './chat.types';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { ListMessagesDto } from './dto/list-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly events: ChatEventsService,
  ) {}

  @Post('rooms')
  createRoom(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateChatRoomDto): Promise<ChatRoomRecord> {
    return this.chatService.createRoom(user.id, input.postId);
  }

  @Get('rooms')
  listRooms(@CurrentUser() user: AuthenticatedUser): Promise<ChatRoomRecord[]> {
    return this.chatService.listRooms(user.id);
  }

  @Get('rooms/:roomId/messages')
  listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: ListMessagesDto,
  ): Promise<ChatMessageRecord[]> {
    return this.chatService.listMessages(user.id, roomId, query);
  }

  @Post('rooms/:roomId/messages')
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() input: SendMessageDto,
  ): Promise<ChatMessageRecord> {
    return this.chatService.sendMessage(user.id, roomId, input.message);
  }

  @Sse('rooms/:roomId/events')
  async streamMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ): Promise<Observable<MessageEvent>> {
    await this.chatService.requireParticipant(user.id, roomId);
    return this.events.stream(roomId);
  }
}
