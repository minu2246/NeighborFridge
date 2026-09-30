export interface ChatRoomRecord {
  id: string;
  postId: string;
  postTitle: string;
  ownerId: string;
  requesterId: string;
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
