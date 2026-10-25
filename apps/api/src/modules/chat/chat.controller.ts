import {
  Body, Controller, Get, MessageEvent, Param, ParseUUIDPipe, Post, Put, Query, Sse, UseGuards,
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
import { RespondAppointmentDto } from './dto/respond-appointment.dto';
import { SaveAppointmentDto } from './dto/save-appointment.dto';
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

  @Get('rooms/:roomId/appointment')
  getAppointment(@CurrentUser() user: AuthenticatedUser, @Param('roomId', ParseUUIDPipe) roomId: string) {
    return this.chatService.getAppointment(user.id, roomId);
  }

  @Put('rooms/:roomId/appointment')
  saveAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() input: SaveAppointmentDto,
  ) {
    return this.chatService.saveAppointment(user.id, roomId, input.meetAt, input.place);
  }

  // 상대가 제안한 약속 수락/거절
  @Post('rooms/:roomId/appointment/respond')
  respondAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() input: RespondAppointmentDto,
  ) {
    return this.chatService.respondAppointment(user.id, roomId, input.accept);
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
