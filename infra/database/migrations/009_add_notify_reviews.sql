-- 알림 설정: 거래 후기 알림(지금은 앱 안 배지, 푸시 도입 시 같은 값 사용)
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_reviews BOOLEAN NOT NULL DEFAULT TRUE;
