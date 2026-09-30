# MVP 아키텍처

```text
React Native App
  ├─ HTTPS ───────> NestJS API ─────> PostgreSQL + PostGIS
  ├─ WebSocket ───> Chat Gateway ───> Redis Pub/Sub
  └─ Push <──────── Notification ──── Firebase Cloud Messaging

NestJS Worker ────> 만료 게시물 비활성화 및 알림 처리
Image Upload ─────> S3 호환 객체 저장소
```

만료 게시물은 즉시 물리 삭제하지 않고 `EXPIRED` 상태로 변경합니다. 감사, 신고, 채팅 연계에 필요한 보존 기간이 지난 뒤 별도 정책으로 영구 삭제합니다.

위치 데이터는 PostgreSQL의 `GEOGRAPHY(POINT, 4326)`로 저장하고 GiST 인덱스 및 `ST_DWithin`으로 반경 검색합니다. 사용자에게는 정확한 집 좌표 대신 거리와 약속 장소만 제공합니다.
