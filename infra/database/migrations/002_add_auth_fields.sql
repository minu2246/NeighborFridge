ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(30) NOT NULL DEFAULT 'EMAIL';
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_user_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_provider_identity
  ON users (auth_provider, auth_provider_user_id)
  WHERE auth_provider_user_id IS NOT NULL;
