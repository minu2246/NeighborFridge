# API

NestJS HTTP API입니다. 현재 구현 범위는 이메일 인증, 사용자 위치, 상태 확인, 게시물 등록, PostGIS 주변 검색, 만료 배치입니다.

## 엔드포인트

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users/me` — Bearer 토큰 필요
- `PATCH /api/users/me/location` — Bearer 토큰 필요
- `POST /api/posts` — Bearer 토큰 필요, 작성자는 토큰 기준으로 결정
- `GET /api/posts/:id`
- `PATCH /api/posts/:id` — 작성자만 가능
- `PATCH /api/posts/:id/status` — 작성자의 예약·완료 상태 변경
- `DELETE /api/posts/:id` — 작성자 소프트 삭제
- `GET /api/posts/nearby?latitude=37.5665&longitude=126.978&radiusKm=3&sort=distance`

루트의 `.env.example`을 `.env`로 복사한 뒤 PostgreSQL/PostGIS를 실행해야 서버가 시작됩니다.
