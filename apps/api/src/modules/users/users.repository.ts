import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../database/database.module';
import { UserRecord, UserWithPassword } from './user.types';

type UserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  nickname: string;
  profile_image: string | null;
  neighborhood_name: string | null;
  search_radius_km: number;
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
       RETURNING id, email, password_hash, nickname, profile_image, neighborhood_name, search_radius_km,
         NULL::double precision AS latitude,
         NULL::double precision AS longitude, created_at`,
      [email, nickname, passwordHash],
    );
    return this.mapRow(result.rows[0]);
  }

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, email, password_hash, nickname, profile_image, neighborhood_name, search_radius_km,
         ST_Y(location::geometry) AS latitude,
         ST_X(location::geometry) AS longitude, created_at
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email],
    );
    return result.rows[0] ? this.mapRowWithPassword(result.rows[0]) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, email, password_hash, nickname, profile_image, neighborhood_name, search_radius_km,
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
       RETURNING id, email, password_hash, nickname, profile_image, neighborhood_name, search_radius_km,
         ST_Y(location::geometry) AS latitude,
         ST_X(location::geometry) AS longitude, created_at`,
      [id, longitude, latitude, neighborhoodName ?? null, radiusKm ?? null],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  private mapRow(row: UserRow): UserRecord {
    return {
      id: row.id,
      email: row.email,
      nickname: row.nickname,
      profileImage: row.profile_image,
      neighborhoodName: row.neighborhood_name,
      radiusKm: row.search_radius_km,
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
      createdAt: row.created_at.toISOString(),
    };
  }

  private mapRowWithPassword(row: UserRow): UserWithPassword {
    return { ...this.mapRow(row), passwordHash: row.password_hash };
  }
}
