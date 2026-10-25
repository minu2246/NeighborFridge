import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../database/database.module';
import { UserRecord, UserStats, UserWithPassword } from './user.types';

type UserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  nickname: string;
  profile_image: string | null;
  neighborhood_name: string | null;
  search_radius_km: number;
  notify_reviews: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: Date;
};

@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async createEmailUser(email: string, nickname: string, passwordHash: string): Promise<UserRecord> {
    const result = await this.pool.query<UserRow>(
      `INSERT INTO users (email, nickname, password_hash, auth_provider)
       VALUES ($1, $2, $3, 'EMAIL')
       RETURNING id, email, password_hash, nickname, profile_image, neighborhood_name, search_radius_km, notify_reviews,
         NULL::double precision AS latitude,
         NULL::double precision AS longitude, created_at`,
      [email, nickname, passwordHash],
    );
    return this.mapRow(result.rows[0]);
  }

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, email, password_hash, nickname, profile_image, neighborhood_name, search_radius_km, notify_reviews,
         ST_Y(location::geometry) AS latitude,
         ST_X(location::geometry) AS longitude, created_at
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email],
    );
    return result.rows[0] ? this.mapRowWithPassword(result.rows[0]) : null;
  }

  async getStats(id: string): Promise<UserStats> {
    const result = await this.pool.query<UserStats>(
      `SELECT
         (SELECT COUNT(*) FROM posts WHERE user_id = $1 AND status = 'COMPLETED')::int AS "completedPosts",
         (SELECT COUNT(*) FROM posts WHERE user_id = $1 AND status IN ('ACTIVE', 'RESERVED'))::int AS "activePosts",
         (SELECT COUNT(DISTINCT CASE WHEN owner_id = $1 THEN requester_id ELSE owner_id END)
            FROM chat_rooms r WHERE (owner_id = $1 OR requester_id = $1)
              AND EXISTS (SELECT 1 FROM chat_messages m WHERE m.room_id = r.id))::int AS "chatPartners",
         -- 매너 온도: 36.5°C에서 시작, 최고예요 +0.2 / 좋아요 +0.1 / 별로예요 -0.3, 0~99 범위
         ROUND(LEAST(99, GREATEST(0, 36.5 + COALESCE((SELECT SUM(CASE rating WHEN 2 THEN 0.2 WHEN 1 THEN 0.1 ELSE -0.3 END)
            FROM reviews WHERE reviewee_id = $1), 0)))::numeric, 1)::float AS "mannerTemperature",
         (SELECT COUNT(*) FROM reviews WHERE reviewee_id = $1)::int AS "reviewCount",
         -- 나눔 완료한 식재료 무게(kg)와 탄소 절감 추정치.
         -- 계수 2.5 kgCO2e/kg: FAO(2013) Food Wastage Footprint의 식품 폐기 1kg당 온실가스 추정(전 지구 평균, 근사치)
         ROUND(COALESCE((SELECT SUM(weight_grams) FROM posts WHERE user_id = $1 AND status = 'COMPLETED'), 0) / 1000.0, 2)::float AS "sharedKg",
         ROUND(COALESCE((SELECT SUM(weight_grams) FROM posts WHERE user_id = $1 AND status = 'COMPLETED'), 0) / 1000.0 * 2.5, 2)::float AS "carbonSavedKg"`,
      [id],
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, email, password_hash, nickname, profile_image, neighborhood_name, search_radius_km, notify_reviews,
         ST_Y(location::geometry) AS latitude,
         ST_X(location::geometry) AS longitude, created_at
       FROM users WHERE id = $1 LIMIT 1`,
      [id],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async updateLocation(id: string, latitude: number, longitude: number, neighborhoodName?: string, radiusKm?: number): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `UPDATE users
       SET location = ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
           neighborhood_name = COALESCE($4, neighborhood_name),
           search_radius_km = COALESCE($5, search_radius_km),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, password_hash, nickname, profile_image, neighborhood_name, search_radius_km, notify_reviews,
         ST_Y(location::geometry) AS latitude,
         ST_X(location::geometry) AS longitude, created_at`,
      [id, longitude, latitude, neighborhoodName ?? null, radiusKm ?? null],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async updateProfile(id: string, nickname?: string, notifyReviews?: boolean): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `UPDATE users
       SET nickname = COALESCE($2, nickname), notify_reviews = COALESCE($3, notify_reviews), updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, password_hash, nickname, profile_image, neighborhood_name, search_radius_km, notify_reviews,
         ST_Y(location::geometry) AS latitude,
         ST_X(location::geometry) AS longitude, created_at`,
      [id, nickname ?? null, notifyReviews ?? null],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findPasswordHash(id: string): Promise<string | null> {
    const result = await this.pool.query<{ password_hash: string | null }>('SELECT password_hash FROM users WHERE id = $1', [id]);
    return result.rows[0]?.password_hash ?? null;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.pool.query('UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1', [id, passwordHash]);
  }

  private mapRow(row: UserRow): UserRecord {
    return {
      id: row.id,
      email: row.email,
      nickname: row.nickname,
      profileImage: row.profile_image,
      neighborhoodName: row.neighborhood_name,
      radiusKm: row.search_radius_km,
      notifyReviews: row.notify_reviews,
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapRowWithPassword(row: UserRow): UserWithPassword {
    return { ...this.mapRow(row), passwordHash: row.password_hash };
  }
}
