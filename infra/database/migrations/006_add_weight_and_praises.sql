-- 게시물 무게(탄소 절감 추정용)와 거래 후기 칭찬/비매너 항목
ALTER TABLE posts ADD COLUMN IF NOT EXISTS weight_grams INTEGER CHECK (weight_grams > 0);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS praises TEXT[] NOT NULL DEFAULT '{}';
