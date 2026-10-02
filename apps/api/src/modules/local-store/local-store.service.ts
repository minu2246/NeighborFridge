import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleDestroy, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseSync } from 'node:sqlite';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PasswordService } from '../auth/password.service';
import { formatAppointmentMessage } from '../chat/chat.types';

export interface LocalPost {
  id: string; emoji: string; name: string; title: string; type: string;
  distance: string; dDay: string; place: string; color: string;
  expiryDate: string; status: 'ACTIVE' | 'RESERVED' | 'COMPLETED' | 'EXPIRED'; imageUrl?: string; isMine: true;
}

export interface LocalAppointment { roomId: string; meetAt: string; place: string; updatedAt: string; }

export interface LocalNeighborhood {
  name: string; latitude: number; longitude: number; radiusKm: number; verifiedAt: string;
}

@Injectable()
export class LocalStoreService implements OnModuleDestroy {
  private readonly db: DatabaseSync | null;
  private readonly expiryTimer: NodeJS.Timeout | null;
  private readonly uploadPath: string;

  constructor(config: ConfigService, private readonly passwords: PasswordService) {
    this.uploadPath = resolve(config.get<string>('LOCAL_UPLOAD_PATH', 'storage/uploads'));
    if (config.get<string>('LOCAL_STORE_ENABLED', 'false') !== 'true') { this.db = null; this.expiryTimer = null; return; }
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
      CREATE TABLE IF NOT EXISTS local_appointments (
        room_id TEXT PRIMARY KEY, meet_at TEXT NOT NULL, place TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS local_settings (
        key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL
      );
    `);
    const postColumns = this.db.prepare('PRAGMA table_info(local_posts)').all() as { name: string }[];
    if (!postColumns.some((column) => column.name === 'expiry_date')) this.db.exec("ALTER TABLE local_posts ADD COLUMN expiry_date TEXT NOT NULL DEFAULT '2099-12-31'");
    if (!postColumns.some((column) => column.name === 'status')) this.db.exec("ALTER TABLE local_posts ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE'");
    if (!postColumns.some((column) => column.name === 'image_url')) this.db.exec('ALTER TABLE local_posts ADD COLUMN image_url TEXT');
    this.db.exec("UPDATE local_posts SET expiry_date = d_day WHERE expiry_date = '2099-12-31' AND d_day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'");
    this.expirePosts();
    this.expiryTimer = setInterval(() => this.expirePosts(), 60_000);
    this.expiryTimer.unref();
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
    this.expirePosts();
    return (this.requireDb().prepare("SELECT * FROM local_posts WHERE status IN ('ACTIVE','RESERVED') ORDER BY created_at DESC").all() as Record<string, string>[]).map((row) => ({
      id: row.id, emoji: row.emoji, name: row.name, title: row.title, type: row.type,
      distance: row.distance, dDay: row.expiry_date === '2099-12-31' ? row.d_day : this.formatDDay(row.expiry_date), place: row.place, color: row.color,
      expiryDate: row.expiry_date, status: row.status as LocalPost['status'],
      imageUrl: row.image_url || undefined, isMine: true,
    }));
  }

  createPost(input: Omit<LocalPost, 'id' | 'isMine'>): LocalPost {
    if (input.expiryDate < this.todayInSeoul()) throw new BadRequestException('이미 지난 소비기한은 등록할 수 없습니다.');
    const post: LocalPost = { id: randomUUID(), ...input, isMine: true };
    this.requireDb().prepare(`INSERT INTO local_posts
      (id,emoji,name,title,type,distance,d_day,place,color,created_at,expiry_date,status,image_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(post.id, post.emoji, post.name, post.title, post.type, post.distance, this.formatDDay(post.expiryDate), post.place, post.color, new Date().toISOString(), post.expiryDate, 'ACTIVE', post.imageUrl ?? null);
    post.dDay = this.formatDDay(post.expiryDate);
    return post;
  }

  updatePostStatus(id: string, status: 'ACTIVE' | 'RESERVED' | 'COMPLETED'): LocalPost {
    const db = this.requireDb();
    const result = db.prepare("UPDATE local_posts SET status = ? WHERE id = ? AND status IN ('ACTIVE','RESERVED')").run(status, id);
    if (result.changes === 0) throw new NotFoundException('변경할 게시물을 찾지 못했습니다.');
    const row = db.prepare('SELECT * FROM local_posts WHERE id = ?').get(id) as Record<string, string>;
    return { id: row.id, emoji: row.emoji, name: row.name, title: row.title, type: row.type, distance: row.distance, dDay: this.formatDDay(row.expiry_date), place: row.place, color: row.color, expiryDate: row.expiry_date, status: row.status as LocalPost['status'], imageUrl: row.image_url || undefined, isMine: true };
  }

  listMessages(roomId: string) {
    return this.requireDb().prepare('SELECT id,room_id AS roomId,sender,message,sent_at AS sentAt FROM local_messages WHERE room_id = ? ORDER BY sent_at').all(roomId);
  }

  createMessage(roomId: string, sender: string, message: string) {
    const value = { id: randomUUID(), roomId, sender, message: message.trim(), sentAt: new Date().toISOString() };
    this.requireDb().prepare('INSERT INTO local_messages (id,room_id,sender,message,sent_at) VALUES (?,?,?,?,?)').run(value.id, value.roomId, value.sender, value.message, value.sentAt);
    return value;
  }

  getAppointment(roomId: string): LocalAppointment | null {
    return (this.requireDb().prepare('SELECT room_id AS roomId,meet_at AS meetAt,place,updated_at AS updatedAt FROM local_appointments WHERE room_id = ?').get(roomId) as LocalAppointment | undefined) ?? null;
  }

  // meetAt: 서울 기준 'YYYY-MM-DDTHH:mm'. 약속 저장 시 채팅방에 약속 메시지도 남긴다.
  saveAppointment(roomId: string, sender: string, meetAt: string, place: string) {
    if (meetAt.slice(0, 10) < this.todayInSeoul()) throw new BadRequestException('지난 날짜로는 약속을 잡을 수 없습니다.');
    const appointment: LocalAppointment = { roomId, meetAt, place: place.trim(), updatedAt: new Date().toISOString() };
    this.requireDb().prepare(`INSERT INTO local_appointments (room_id,meet_at,place,updated_at) VALUES (?,?,?,?)
      ON CONFLICT(room_id) DO UPDATE SET meet_at=excluded.meet_at, place=excluded.place, updated_at=excluded.updated_at`)
      .run(roomId, appointment.meetAt, appointment.place, appointment.updatedAt);
    const message = this.createMessage(roomId, sender, formatAppointmentMessage(meetAt, appointment.place));
    return { appointment, message };
  }

  saveImage(base64: string, mimeType: string): { imageUrl: string } {
    const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const extension = extensions[mimeType];
    if (!extension) throw new BadRequestException('지원하지 않는 이미지 형식입니다.');
    const cleanBase64 = base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64)) throw new BadRequestException('사진 데이터를 읽을 수 없습니다.');
    const buffer = Buffer.from(cleanBase64, 'base64');
    if (!buffer.length || buffer.length > 15 * 1024 * 1024) throw new BadRequestException('사진은 15MB 이하만 등록할 수 있습니다.');
    mkdirSync(this.uploadPath, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    writeFileSync(resolve(this.uploadPath, filename), buffer, { flag: 'wx' });
    return { imageUrl: `/uploads/${filename}` };
  }

  getNeighborhood(): LocalNeighborhood | null {
    const row = this.requireDb().prepare("SELECT value FROM local_settings WHERE key = 'neighborhood'").get() as { value: string } | undefined;
    return row ? JSON.parse(row.value) as LocalNeighborhood : null;
  }

  saveNeighborhood(input: Omit<LocalNeighborhood, 'verifiedAt'>): LocalNeighborhood {
    const value = { ...input, verifiedAt: new Date().toISOString() };
    this.requireDb().prepare(`INSERT INTO local_settings (key,value,updated_at) VALUES ('neighborhood',?,?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`)
      .run(JSON.stringify(value), value.verifiedAt);
    return value;
  }

  onModuleDestroy(): void { if (this.expiryTimer) clearInterval(this.expiryTimer); this.db?.close(); }
  private todayInSeoul(): string { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  private expirePosts(): void { this.db?.prepare("UPDATE local_posts SET status = 'EXPIRED' WHERE status IN ('ACTIVE','RESERVED') AND expiry_date < ?").run(this.todayInSeoul()); }
  private formatDDay(expiryDate: string): string {
    const today = new Date(`${this.todayInSeoul()}T00:00:00+09:00`);
    const expiry = new Date(`${expiryDate}T00:00:00+09:00`);
    const days = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
    return days === 0 ? '오늘' : `D-${days}`;
  }
  private requireDb(): DatabaseSync { if (!this.db) throw new NotFoundException(); return this.db; }
}
