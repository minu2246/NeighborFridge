import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChatEventsService } from '../src/modules/chat/chat-events.service';
import { ChatRepository } from '../src/modules/chat/chat.repository';
import { ChatService } from '../src/modules/chat/chat.service';

describe('ChatService', () => {
  const repository = {
    createRoom: jest.fn(), findRoomForUser: jest.fn(), createMessage: jest.fn(),
    listRooms: jest.fn(), listMessages: jest.fn(),
  } as unknown as ChatRepository;
  const events = { publish: jest.fn() } as unknown as ChatEventsService;
  const service = new ChatService(repository, events);

  beforeEach(() => jest.clearAllMocks());

  it('rejects a room for an unavailable or self-owned post', async () => {
    (repository.createRoom as jest.Mock).mockResolvedValue(null);
    await expect(service.createRoom('user-1', 'post-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents non-participants from reading messages', async () => {
    (repository.findRoomForUser as jest.Mock).mockResolvedValue(null);
    await expect(service.listMessages('outsider', 'room-1', { limit: 50, offset: 0 }))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('persists and publishes a participant message', async () => {
    const room = { id: 'room-1' };
    const message = { id: 'message-1', roomId: 'room-1', message: '안녕하세요' };
    (repository.findRoomForUser as jest.Mock).mockResolvedValue(room);
    (repository.createMessage as jest.Mock).mockResolvedValue(message);
    await expect(service.sendMessage('user-1', 'room-1', ' 안녕하세요 ')).resolves.toEqual(message);
    expect(repository.createMessage).toHaveBeenCalledWith('room-1', 'user-1', '안녕하세요');
    expect(events.publish).toHaveBeenCalledWith(message);
  });
});
