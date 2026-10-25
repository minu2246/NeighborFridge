-- 후기 알림: 내가 받은 후기를 마지막으로 본 시각(이후 받은 후기 = 새 후기)
ALTER TABLE users ADD COLUMN IF NOT EXISTS reviews_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
