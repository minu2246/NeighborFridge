CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE trade_type AS ENUM ('SHARE', 'TRADE', 'FREE_MEAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE post_status AS ENUM ('ACTIVE', 'RESERVED', 'COMPLETED', 'EXPIRED', 'DELETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  auth_provider VARCHAR(30) NOT NULL DEFAULT 'EMAIL',
  auth_provider_user_id VARCHAR(255),
  nickname VARCHAR(50) NOT NULL,
  profile_image TEXT,
  location GEOGRAPHY(POINT, 4326),
  neighborhood_name VARCHAR(80),
  search_radius_km SMALLINT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_provider_identity
  ON users (auth_provider, auth_provider_user_id)
  WHERE auth_provider_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(120) NOT NULL,
  description TEXT,
  item_name VARCHAR(100) NOT NULL,
  image_urls JSONB NOT NULL DEFAULT '[]'::JSONB,
  expiry_date DATE NOT NULL,
  trade_type trade_type NOT NULL,
  status post_status NOT NULL DEFAULT 'ACTIVE',
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  place_name VARCHAR(150),
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT posts_longitude_latitude_valid CHECK (
    ST_X(location::geometry) BETWEEN -180 AND 180
    AND ST_Y(location::geometry) BETWEEN -90 AND 90
  )
);

CREATE INDEX IF NOT EXISTS idx_users_location ON users USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_posts_active_expiry
  ON posts (expiry_date)
  WHERE status IN ('ACTIVE', 'RESERVED');

CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id),
  owner_id UUID NOT NULL REFERENCES users(id),
  requester_id UUID NOT NULL REFERENCES users(id),
  meet_at TIMESTAMP,
  meet_place VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, owner_id, requester_id),
  CHECK (owner_id <> requester_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_owner ON chat_rooms (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_requester ON chat_rooms (requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_sent ON chat_messages (room_id, sent_at DESC);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS completed_with UUID REFERENCES users(id);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  reviewee_id UUID NOT NULL REFERENCES users(id),
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1, 2)), -- -1 별로예요, 1 좋아요, 2 최고예요
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, reviewer_id),
  CHECK (reviewer_id <> reviewee_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews (reviewee_id);
