import { ConflictException, Injectable, NotFoundException, OnModuleDestroy, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseSync } from 'node:sqlite';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PasswordService } from '../auth/password.service';

export interface LocalPost {
  id: string; emoji: string; name: string; title: string; type: string;
  distance: string; dDay: string; place: string; color: string;
}

@Injectable()
export class LocalStoreService implements OnModuleDestroy {
  private readonly db: DatabaseSync | null;

  constructor(config: ConfigService, private readonly passwords: PasswordService) {
    if (config.get<string>('LOCAL_STORE_ENABLED', 'false') !== 'true') { this.db = null; return; }
    const path = resolve(config.get<string>('LOCAL_DB_PATH', 'storage/db/neighbor-fridge-local.sqlite'));
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS local_users (
        id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, nickname TEXT NOT NULL,
        password_hash TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS local_posts (
        id TEXT PRIMARY KEY, emoji TEXT NOT NULL, name TEXT NOT NULL, title TEXT NOT NULL,
        type TEXT NOT NULL, distance TEXT NOT NULL, d_day TEXT NOT NULL,
        place TEXT NOT NULL, color TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS local_messages (
        id TEXT PRIMARY KEY, room_id TEXT NOT NULL, sender TEXT NOT NULL,
        message TEXT NOT NULL, sent_at TEXT NOT NULL
      );
    `);
  }

  isEnabled(): boolean { return this.db !== null; }

  async register(email: string, nickname: string, password: string) {
    const db = this.requireDb(); const normalized = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM local_users WHERE email = ?').get(normalized);
    if (existing) throw new ConflictException('이미 가입된 이메일입니다.');
    const user = { id: randomUUID(), email: normalized, nickname: nickname.trim(), createdAt: new Date().toISOString() };
    db.prepare('INSERT INTO local_users (id,email,nickname,password_hash,created_at) VALUES (?,?,?,?,?)')
      .run(user.id, user.email, user.nickname, await this.passwords.hash(password), user.createdAt);
    return { accessToken: `local-${randomUUID()}`, user };
  }

  async login(email: string, password: string) {
    const row = this.requireDb().prepare('SELECT * FROM local_users WHERE email = ?').get(email.trim().toLowerCase()) as Record<string, string> | undefined;
    if (!row || !(await this.passwords.verify(password, row.password_hash))) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    return { accessToken: `local-${randomUUID()}`, user: { id: row.id, email: row.email, nickname: row.nickname, createdAt: row.created_at } };
  }

  listPosts(): LocalPost[] {
    return (this.requireDb().prepare('SELECT * FROM local_posts ORDER BY created_at DESC').all() as Record<string, string>[]).map((row) => ({
      id: row.id, emoji: row.emoji, name: row.name, title: row.title, type: row.type,
      distance: row.distance, dDay: row.d_day, place: row.place, color: row.color,
    }));
  }

  createPost(input: Omit<LocalPost, 'id'>): LocalPost {
    const post = { id: randomUUID(), ...input };
    this.requireDb().prepare(`INSERT INTO local_posts
      (id,emoji,name,title,type,distance,d_day,place,color,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(post.id, post.emoji, post.name, post.title, post.type, post.distance, post.dDay, post.place, post.color, new Date().toISOString());
    return post;
  }

  listMessages(roomId: string) {
    return this.requireDb().prepare('SELECT id,room_id AS roomId,sender,message,sent_at AS sentAt FROM local_messages WHERE room_id = ? ORDER BY sent_at').all(roomId);
  }

  createMessage(roomId: string, sender: string, message: string) {
    const value = { id: randomUUID(), roomId, sender, message: message.trim(), sentAt: new Date().toISOString() };
    this.requireDb().prepare('INSERT INTO local_messages (id,room_id,sender,message,sent_at) VALUES (?,?,?,?,?)').run(value.id, value.roomId, value.sender, value.message, value.sentAt);
    return value;
  }

  onModuleDestroy(): void { this.db?.close(); }
  private requireDb(): DatabaseSync { if (!this.db) throw new NotFoundException(); return this.db; }
}
