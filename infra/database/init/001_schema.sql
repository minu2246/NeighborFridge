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
  nickname VARCHAR(50) NOT NULL,
  profile_image TEXT,
  location GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
