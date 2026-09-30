# API

NestJS HTTP API입니다. 현재 구현 범위는 상태 확인, 게시물 등록, PostGIS 주변 검색, 만료 배치입니다.

## 엔드포인트

- `GET /api/health`
- `POST /api/posts`
- `GET /api/posts/nearby?latitude=37.5665&longitude=126.978&radiusKm=3&sort=distance`

루트의 `.env.example`을 `.env`로 복사한 뒤 PostgreSQL/PostGIS를 실행해야 서버가 시작됩니다.
