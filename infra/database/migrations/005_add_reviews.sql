-- 거래 상대 기록과 거래 후기(매너 온도 계산용)
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
