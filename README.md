# NeighborFridge (이웃냉장고)

유통기한 임박 식재료와 남는 음식을 이웃끼리 나누거나 교환하는 위치 기반 C2C 서비스입니다.

## 저장소 구성

- `apps/mobile`: React Native 모바일 앱
- `apps/api`: NestJS API 및 WebSocket 서버
- `apps/worker`: 만료 처리와 알림 배치
- `packages`: 앱 사이에서 공유하는 타입과 검증 규칙
- `docs`: 제품·아키텍처·운영 문서
- `infra`: 로컬 개발 및 배포 설정
- `scripts`: 설치, 실행, 점검, 정리 스크립트
- `storage`: 로컬 전용 다운로드·업로드·캐시 영역(Git 제외)

프로젝트 파일의 저장·다운로드·정리 원칙은 [FILE_MANAGEMENT.md](FILE_MANAGEMENT.md)를 참고하세요.

로컬 용량과 잔여물은 다음 명령으로 언제든 점검할 수 있습니다. 이 명령은 파일을 삭제하지 않습니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit-storage.ps1
```

## 기본 기술 방향

- Mobile: React Native
- API/Batch: NestJS
- Database: PostgreSQL + PostGIS
- Cache/Realtime: Redis + WebSocket
- Media: S3 호환 객체 저장소
- Push: Firebase Cloud Messaging

현재 저장소는 시스템 설계와 MVP 구현을 시작하기 위한 초기 구조입니다.

## 개발 시작

```powershell
npm install
docker compose up -d
npm run start:api
```

Docker가 없는 환경에서도 `npm test`와 `npm run build`로 API 로직을 검증할 수 있습니다. npm 다운로드 캐시는 프로젝트 내부 `storage/cache/npm`에 저장됩니다.
