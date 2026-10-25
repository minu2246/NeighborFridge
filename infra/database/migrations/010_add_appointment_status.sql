-- 거래 약속 수락 흐름: 한쪽이 제안(PROPOSED) → 상대가 수락(ACCEPTED). 거절하면 약속을 비운다.
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS meet_status VARCHAR(10) CHECK (meet_status IN ('PROPOSED', 'ACCEPTED'));
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS meet_proposed_by UUID REFERENCES users(id);
-- 이 기능 전에 잡힌 약속은 확정으로 본다
UPDATE chat_rooms SET meet_status = 'ACCEPTED' WHERE meet_at IS NOT NULL AND meet_status IS NULL;
