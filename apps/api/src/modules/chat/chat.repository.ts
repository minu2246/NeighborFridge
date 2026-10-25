import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../database/database.module';
import { AppointmentStatus, ChatMessageRecord, ChatRoomRecord } from './chat.types';

type RoomRow = {
  id: string; post_id: string; post_title: string; owner_id: string;
  requester_id: string; meet_at: string | null; meet_place: string | null; created_at: Date;
  meet_status: AppointmentStatus | null; meet_proposed_by: string | null;
  partner_nickname?: string; last_message?: string | null; last_message_at?: Date | null; unread_count?: number;
};
type MessageRow = {
  id: string; room_id: string; sender_id: string; message: string;
  sent_at: Date; read_at: Date | null;
};

@Injectable()
export class ChatRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async createRoom(postId: string, requesterId: string): Promise<ChatRoomRecord | null> {
    const result = await this.pool.query<RoomRow>(
      `WITH inserted AS (
         INSERT INTO chat_rooms (post_id, owner_id, requester_id)
         SELECT p.id, p.user_id, $2
         FROM posts p
         WHERE p.id = $1 AND p.status IN ('ACTIVE', 'RESERVED') AND p.user_id <> $2
         ON CONFLICT (post_id, owner_id, requester_id)
         DO UPDATE SET post_id = EXCLUDED.post_id
         RETURNING *
       )
       SELECT r.id, r.post_id, p.title AS post_title, r.owner_id, r.requester_id, to_char(r.meet_at, 'YYYY-MM-DD"T"HH24:MI') AS meet_at, r.meet_place, r.meet_status, r.meet_proposed_by, r.created_at
       FROM inserted r JOIN posts p ON p.id = r.post_id`,
      [postId, requesterId],
    );
    return result.rows[0] ? this.mapRoom(result.rows[0]) : null;
  }

  async listRooms(userId: string): Promise<ChatRoomRecord[]> {
    const result = await this.pool.query<RoomRow>(
      `SELECT r.id, r.post_id, p.title AS post_title, r.owner_id, r.requester_id, to_char(r.meet_at, 'YYYY-MM-DD"T"HH24:MI') AS meet_at, r.meet_place, r.meet_status, r.meet_proposed_by, r.created_at,
         partner.nickname AS partner_nickname, last.message AS last_message, last.sent_at AS last_message_at,
         (SELECT COUNT(*) FROM chat_messages m WHERE m.room_id = r.id AND m.sender_id <> $1 AND m.read_at IS NULL)::int AS unread_count
       FROM chat_rooms r JOIN posts p ON p.id = r.post_id
       JOIN users partner ON partner.id = CASE WHEN r.owner_id = $1 THEN r.requester_id ELSE r.owner_id END
       LEFT JOIN LATERAL (SELECT m.message, m.sent_at FROM chat_messages m WHERE m.room_id = r.id ORDER BY m.sent_at DESC LIMIT 1) last ON true
       -- "채팅으로 약속 잡기"만 누르고 메시지가 없는 방은 목록에 보이지 않게
       WHERE (r.owner_id = $1 OR r.requester_id = $1) AND last.sent_at IS NOT NULL
       ORDER BY last.sent_at DESC`,
      [userId],
    );
    return result.rows.map((row) => this.mapRoom(row));
  }

  async findRoomForUser(roomId: string, userId: string): Promise<ChatRoomRecord | null> {
    const result = await this.pool.query<RoomRow>(
      `SELECT r.id, r.post_id, p.title AS post_title, r.owner_id, r.requester_id, to_char(r.meet_at, 'YYYY-MM-DD"T"HH24:MI') AS meet_at, r.meet_place, r.meet_status, r.meet_proposed_by, r.created_at
       FROM chat_rooms r JOIN posts p ON p.id = r.post_id
       WHERE r.id = $1 AND (r.owner_id = $2 OR r.requester_id = $2)
       LIMIT 1`,
      [roomId, userId],
    );
    return result.rows[0] ? this.mapRoom(result.rows[0]) : null;
  }

  // 새로 잡거나 바꾼 약속은 항상 상대 수락 전(PROPOSED)
  async saveAppointment(roomId: string, meetAt: string, place: string, proposerId: string): Promise<void> {
    await this.pool.query(
      `UPDATE chat_rooms SET meet_at = $2, meet_place = $3, meet_status = 'PROPOSED', meet_proposed_by = $4 WHERE id = $1`,
      [roomId, meetAt, place, proposerId],
    );
  }

  async acceptAppointment(roomId: string): Promise<void> {
    await this.pool.query(`UPDATE chat_rooms SET meet_status = 'ACCEPTED' WHERE id = $1`, [roomId]);
  }

  async clearAppointment(roomId: string): Promise<void> {
    await this.pool.query('UPDATE chat_rooms SET meet_at = NULL, meet_place = NULL, meet_status = NULL, meet_proposed_by = NULL WHERE id = $1', [roomId]);
  }

  // 상대가 보낸 안 읽은 메시지를 읽음 처리
  async markRead(roomId: string, readerId: string): Promise<void> {
    await this.pool.query('UPDATE chat_messages SET read_at = NOW() WHERE room_id = $1 AND sender_id <> $2 AND read_at IS NULL', [roomId, readerId]);
  }

  async listMessages(roomId: string, limit: number, offset: number): Promise<ChatMessageRecord[]> {
    const result = await this.pool.query<MessageRow>(
      `SELECT id, room_id, sender_id, message, sent_at, read_at
       FROM chat_messages WHERE room_id = $1
       ORDER BY sent_at ASC LIMIT $2 OFFSET $3`,
      [roomId, limit, offset],
    );
    return result.rows.map((row) => this.mapMessage(row));
  }

  async createMessage(roomId: string, senderId: string, message: string): Promise<ChatMessageRecord> {
    const result = await this.pool.query<MessageRow>(
      `INSERT INTO chat_messages (room_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, room_id, sender_id, message, sent_at, read_at`,
      [roomId, senderId, message],
    );
    return this.mapMessage(result.rows[0]);
  }

  private mapRoom(row: RoomRow): ChatRoomRecord {
    return {
      id: row.id, postId: row.post_id, postTitle: row.post_title,
      ownerId: row.owner_id, requesterId: row.requester_id,
      meetAt: row.meet_at, meetPlace: row.meet_place, meetStatus: row.meet_status, meetProposedBy: row.meet_proposed_by, partnerNickname: row.partner_nickname,
      lastMessage: row.last_message ?? undefined, lastMessageAt: row.last_message_at?.toISOString(), unreadCount: row.unread_count,
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapMessage(row: MessageRow): ChatMessageRecord {
    return {
      id: row.id, roomId: row.room_id, senderId: row.sender_id,
      message: row.message, sentAt: row.sent_at.toISOString(),
      readAt: row.read_at?.toISOString() ?? null,
    };
  }
}
