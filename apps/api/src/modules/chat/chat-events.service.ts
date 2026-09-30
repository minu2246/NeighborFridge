import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';
import { ChatMessageRecord } from './chat.types';

@Injectable()
export class ChatEventsService {
  private readonly messages = new Subject<ChatMessageRecord>();

  publish(message: ChatMessageRecord): void {
    this.messages.next(message);
  }

  stream(roomId: string): Observable<MessageEvent> {
    return this.messages.pipe(
      filter((message) => message.roomId === roomId),
      map((message) => ({ type: 'message', data: message })),
    );
  }
}
