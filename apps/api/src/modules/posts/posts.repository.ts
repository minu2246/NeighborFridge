import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../database/database.module';
import { CreatePostDto } from './dto/create-post.dto';
import { FindNearbyPostsDto } from './dto/find-nearby-posts.dto';
import { PostRecord } from './post.types';

type DbPostRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  item_name: string;
  image_urls: string[];
  expiry_date: string;
  trade_type: PostRecord['tradeType'];
  status: string;
  place_name: string | null;
  distance_km?: string;
  d_day?: number;
  created_at: Date;
};

@Injectable()
export class PostsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async create(input: CreatePostDto): Promise<PostRecord> {
    const result = await this.pool.query<DbPostRow>(
      `INSERT INTO posts (
        user_id, title, description, item_name, image_urls,
        expiry_date, trade_type, location, place_name
      ) VALUES (
        $1, $2, $3, $4, $5::jsonb, $6, $7,
        ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography, $10
      )
      RETURNING id, user_id, title, description, item_name, image_urls,
        expiry_date::text, trade_type, status, place_name, created_at`,
      [
        input.userId,
        input.title,
        input.description ?? null,
        input.itemName,
        JSON.stringify(input.imageUrls),
        input.expiryDate,
        input.tradeType,
        input.longitude,
        input.latitude,
        input.placeName ?? null,
      ],
    );
    return this.mapRow(result.rows[0]);
  }

  async findNearby(input: FindNearbyPostsDto): Promise<PostRecord[]> {
    const orderBy =
      input.sort === 'expiry'
        ? 'p.expiry_date ASC, distance_km ASC, p.created_at DESC'
        : 'distance_km ASC, p.created_at DESC';
    const result = await this.pool.query<DbPostRow>(
      `WITH params AS (
        SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS user_location
      )
      SELECT p.id, p.user_id, p.title, p.description, p.item_name, p.image_urls,
        p.expiry_date::text, p.trade_type, p.status, p.place_name, p.created_at,
        ST_Distance(p.location, params.user_location) / 1000.0 AS distance_km,
        p.expiry_date - (NOW() AT TIME ZONE 'Asia/Seoul')::date AS d_day
      FROM posts p
      CROSS JOIN params
      WHERE p.status = 'ACTIVE'
        AND p.expiry_date >= (NOW() AT TIME ZONE 'Asia/Seoul')::date
        AND ST_DWithin(p.location, params.user_location, $3 * 1000.0)
      ORDER BY ${orderBy}
      LIMIT $4 OFFSET $5`,
      [input.longitude, input.latitude, input.radiusKm, input.limit, input.offset],
    );
    return result.rows.map((row) => this.mapRow(row));
  }

  async expirePastDue(): Promise<string[]> {
    const result = await this.pool.query<{ id: string }>(
      `UPDATE posts
       SET status = 'EXPIRED', expired_at = NOW(), updated_at = NOW()
       WHERE status IN ('ACTIVE', 'RESERVED')
         AND expiry_date < (NOW() AT TIME ZONE 'Asia/Seoul')::date
       RETURNING id`,
    );
    return result.rows.map((row) => row.id);
  }

  private mapRow(row: DbPostRow): PostRecord {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      itemName: row.item_name,
      imageUrls: row.image_urls,
      expiryDate: row.expiry_date,
      tradeType: row.trade_type,
      status: row.status,
      placeName: row.place_name,
      distanceKm: row.distance_km === undefined ? undefined : Number(row.distance_km),
      dDay: row.d_day,
      createdAt: row.created_at.toISOString(),
    };
  }
}
