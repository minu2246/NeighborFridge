# HANDOFF — NeighborFridge (이웃냉장고)

> 마지막 갱신: 2026-10-02 · 작성: Claude Code
> Claude Code / Codex / ChatGPT 간 작업 인수인계 문서입니다. 작업 시작 시 먼저 읽고, 작업 종료 시 갱신합니다. (하단 "AI 작업 규칙" 참고)

## 1. 프로젝트 개요
- 유통기한 임박 식재료·남는 음식을 이웃끼리 나누거나 교환하는 위치 기반 C2C 서비스
- 목적: 음식물 폐기 감소, 지역 나눔 활성화 (`PROJECT_BRIEF.md`)
- MVP 범위
  1. 이메일·소셜 로그인, GPS 기반 동네 설정
  2. 사진·상품명·소비기한·거래 유형·거래 장소 게시물
  3. 거리순·D-Day순 주변 게시물 조회
  4. 소비기한 경과 게시물 자동 비활성화
  5. 게시물 단위 1:1 실시간 채팅
- 이후 확장: 사진 기반 자동 등록(소비기한·품목·알레르기 성분 → 게시물 자동 작성, 7절 참고), 레시피 추천, 탄소 절감량·매너 등급

## 2. Git 상태 (2026-10-02 기준)
- 브랜치: `main` (`origin/main`과 동기화), stash 없음
- 원격: `https://github.com/minu2246/NeighborFridge.git`
- 최신 커밋 `32d4ee4 Add Claude project instructions`
- 2026-10-02 커밋: 거래 약속 기능 + 모바일 ↔ 정식 API 연동 + 문서(아래 5절). 미추적(의도적으로 커밋 제외): `graphify-out/`(자동 생성물), `team-reference/`(팀원 원본 자료)
- 최근 흐름: Expo 모바일 MVP → 로컬 SQLite 저장 → 휴대폰 미리보기 → 사진 업로드 → 만료 처리 → 필터·정렬 → 소비기한 달력·거래 상태 → 상태 영속화·내 게시물

## 3. 프로젝트 구성
npm workspaces 모노레포 (Node >= 22). workspace는 `apps/api`, `apps/mobile` 두 개.

| 경로 | 내용 | 상태 |
|---|---|---|
| `apps/api` | NestJS 11 HTTP API (전역 prefix `/api`), `pg`, `@nestjs/schedule` | 구현 |
| `apps/mobile` | Expo SDK 57 / React Native 0.86 / React 19 (iOS·Android·Web 공용) | 구현 |
| `apps/worker` | 만료·알림 배치 자리 | README만 존재 |
| `packages/shared-types`, `packages/validation` | 공유 타입·검증 | README만 존재 |
| `infra/database` | `init/001_schema.sql`, `migrations/002_add_auth_fields.sql`, `migrations/003_add_chat.sql`, `migrations/004_add_neighborhood_and_appointment.sql` | |
| `scripts/` | 용량 점검·정리·휴대폰 미리보기·웹 빌드 PowerShell | |
| `storage/` | 로컬 DB·업로드·캐시·런타임 (Git 제외) | |
| `compose.yaml` | `postgis/postgis:17-3.5`, `redis:7-alpine` | |

## 4. 구현된 기능
### API (`apps/api`)
- 인증: 이메일 회원가입·로그인, 자체 JWT 발급/검증 가드, 비밀번호 해시 (`modules/auth`)
- 사용자: `GET /users/me`, `PATCH /users/me/location` (동네 이름 `neighborhoodName`·반경 `radiusKm` 선택 저장)
- 게시물: 등록·조회·수정·상태 변경(ACTIVE/RESERVED/COMPLETED)·소프트 삭제
  - PostGIS 주변 검색 `GET /posts/nearby?latitude&longitude&radiusKm&sort=distance|expiry` (ACTIVE·RESERVED 반환)
  - 거래 유형 `SHARE | TRADE | FREE_MEAL`
- 만료 스케줄러: 15분 주기 Cron (Asia/Seoul), `ENABLE_EXPIRY_SCHEDULER`로 on/off
- 채팅: 게시물 기반 채팅방 생성·목록, 메시지 조회·전송, 거래 약속 GET/PUT(`/chats/rooms/:roomId/appointment`), SSE 실시간 수신 (`/chats/rooms/:roomId/events`, rxjs `Subject` in-process)
- 로컬 저장 모드 (`modules/local-store`, `LOCAL_STORE_ENABLED=true`)
  - `node:sqlite`로 `storage/db/neighbor-fridge-local.sqlite`에 저장
  - `/api/local/*`: 회원가입/로그인, 게시물 목록·등록·상태 변경, 이미지 업로드(base64), 채팅 메시지, 거래 약속 GET/PUT(`rooms/:roomId/appointment`), 동네 정보 GET/PUT
  - 1분 주기 만료 처리, 컬럼 존재 확인 후 `ALTER`로 스키마 보강
- 정적 서빙: `/mobile`·`/` → `apps/api/public/mobile`(웹 export 결과), `/uploads` → `storage/uploads`
- 개발 현황 페이지: `GET /api` (developer 모듈)

### Mobile (`apps/mobile`)
- 화면: 인증(데모 진입 포함), 위치(동네 인증/직접 입력), 홈(필터·정렬·내 게시물), 등록(사진 선택, 소비기한 `DatePickerModal`), 게시물 상세(작성자 상태 변경), 채팅(거래 약속 배너·입력 폼), 프로필
- Android 뒤로가기 처리 (`BackHandler`)
- API 연결 표시: 연결 시 "API 연결됨", 실패 시 데모 데이터(`data/demo.ts`)
- API 호출은 `api/client.ts`에서 모드 분기: 기본은 정식 API(JWT Bearer), `EXPO_PUBLIC_USE_LOCAL_STORE=true`이면 `/api/local/*`
- 정식 모드: 게시물 `isMine` = 작성자 id 비교, 내 게시물은 채팅 버튼 숨김, 채팅 목록은 `/chats/rooms`(로컬 모드는 데모 목록), 채팅 5초 폴링

## 5. 진행 중인 작업
- 마지막 기능 작업: 로컬 저장 모드 게시물 상태 영속화 + "내 게시물" 보기 (`5b198a7`)
- 이번 세션: 테스트·빌드 실행, `HANDOFF.md` 작성, Codex용 `AGENTS.md` 추가 (코드 변경 없음)
- 2026-10-02: 팀원의 SoloSafe 진행 현황 및 창업동아리 최종 목표 참고 문서 3개를 `team-reference/solosafe/`에 원본 그대로 보관. NeighborFridge 자체 기획·구현 현황과 분리하며, SoloSafe의 완료 항목을 NeighborFridge 완료 항목으로 간주하지 않음
- 2026-10-02 (Claude Code): **거래 약속(시간·장소) 기능 — 로컬 저장 모드 한정**
  - API: `local_appointments` 테이블(채팅방당 1건, upsert), `GET/PUT /api/local/rooms/:roomId/appointment` (`meetAt`=서울 기준 `YYYY-MM-DDTHH:mm`, 지난 날짜 거부). 저장 시 "📅 약속: M월 D일 HH:mm · 장소" 메시지를 채팅에 자동 기록
  - Mobile: 채팅방 상단 약속 배너(없으면 "약속 잡기", 있으면 "변경") + 날짜(`DatePickerModal` 재사용)·시간·장소 입력 폼
  - 변경 파일: `apps/api/src/modules/local-store/local-store.{service,controller}.ts`, `apps/api/test/local-store.service.spec.ts`(신규), `apps/mobile/src/{types.ts,api/client.ts,screens/ChatScreen.tsx}`
  - 미검증: 실제 화면(웹/휴대폰)에서 약속 UI 동작 확인 안 함. 정식 API(`/chats`, PostgreSQL)에는 미반영
- 2026-10-02 (Claude Code): **모바일 ↔ 정식 API 연동 (코드 완료, DB 실행 검증 안 됨)**
  - 사용자 결정: 외부 배포는 마지막, 정식 백엔드 연동은 지금 (로컬 SQLite 모드에서 기능을 쌓으면 이중 구현이 되므로)
  - API: `users`에 `neighborhood_name`·`search_radius_km`, `chat_rooms`에 `meet_at`·`meet_place` 추가(`001_schema.sql` + 기존 DB용 `004` 마이그레이션), 정식 채팅 약속 엔드포인트, nearby가 RESERVED 포함, `imageUrls` 검증 `require_tld: false`(localhost/IP 허용), `NODE_ENV=development`에서도 CORS 허용, 약속 메시지 포맷 `formatAppointmentMessage`(`chat.types.ts`) 공용화
  - Mobile: `client.ts` 재작성(토큰 보관·Authorization 헤더, 정식 응답 → `FoodPost`/`ChatMessage` 변환, 빈 응답 null 처리), `App.tsx`·`ChatScreen.tsx`·`PostDetailScreen.tsx` 연결
  - 검증: 단위 테스트·빌드·타입체크 통과, 로컬 모드 API 스모크(동네 저장, 약속 저장/조회, 지난 날짜 400, 빈 약속 200 빈 응답, 토큰 없는 `/chats/rooms` 401) 확인
  - **미검증**: PostgreSQL/PostGIS 위에서 정식 모드 전체 흐름(이 PC에 Docker·PostgreSQL 미설치), 앱 화면 동작
- 다음 작업: ① DB 환경 준비(Docker Desktop 설치 또는 개발용 클라우드 Postgres) → `.env` 작성 → 001~004 적용 → 두 계정으로 등록·채팅·약속·상태 변경 E2E 확인 ② 정식 모드 남은 구멍(아래 7절)

## 6. 테스트·빌드 상태 (2026-10-02 재실행: test·build·mobile typecheck / 웹 export는 2026-10-01 결과)
| 명령 | 결과 |
|---|---|
| `npm test` (API Jest) | ✅ 6 suites / 17 tests 통과 (약속 테스트 3건 추가) |
| `npm run build` (API `tsc`) | ✅ 오류 없음 → `apps/api/dist/` |
| `npm run typecheck --workspace @neighbor-fridge/mobile` | ✅ 오류 없음 |
| `scripts/build-mobile-web.ps1` (Expo web export) | ✅ 성공 → `apps/api/public/mobile/` (bundle 약 469KB). 첫 실행 시 Node 경고 1건 출력, 재실행 시 재현되지 않음 |

- 모바일 단위 테스트는 없음
- 실행하지 않은 것: Docker(PostgreSQL/PostGIS·Redis) 기반 정식 API 기동, PostGIS 쿼리 통합 테스트, 실제 휴대폰(Expo Go) 테스트

## 7. 주요 남은 작업
- 정식 모드 남은 구멍 (2026-10-02 연동 후)
  - 사진 업로드가 정식 모드에서도 `/local/uploads`(인증 없음, 로컬 디스크) 사용 → 외부 배포 전 S3 호환 저장소 + 인증 업로드 필요
  - 토큰 메모리 보관 → 앱 새로고침 시 재로그인 (`expo-secure-store` 검토)
  - 채팅 상대 닉네임·마지막 메시지 미표시(채팅방 API에 없음), 게시물 상세의 작성자명·설명은 하드코딩
  - 게시물 좌표 = 인증한 동네 좌표(게시물별 위치 지정 없음)
  - 데모 진입(로그인 없이)은 정식 모드에서 조회만 가능
- 소셜 로그인 미구현 (이메일만)
- 정식 미디어 저장소(S3 호환) 미연동, 로컬 업로드만 존재
- 푸시 알림(FCM)·만료 임박 알림 미구현
- `apps/worker`, `packages/*` 비어 있음
- Redis Pub/Sub 미사용 (문서상 계획). 채팅 이벤트는 단일 프로세스 메모리 전달
- DB 마이그레이션 실행 체계 없음 (아래 주의사항)
- 모바일 테스트 부재
- 거래 약속: 로컬·정식 모두 구현(2026-10-02). 약속 알림·상대방 수락 흐름 없음
- **사진 기반 게시물 자동 작성 (사용자 요청 2026-10-02, 미구현)**
  - 목표: 포장 사진에서 소비기한뿐 아니라 품목 정보(상품명·분류·보관 방법), 알레르기 유발 성분까지 추출해 등록 폼과 설명란을 자동으로 채움
  - 방식 메모: 단순 OCR(글자 인식)만으로는 원재료명에서 알레르기 성분을 판단하기 어려움 → 이미지를 이해하는 멀티모달 AI 1회 호출로 구조화 JSON(`itemName, expiryDate, category, storage, allergens[], description`) 추출. 모델·비용은 구현 시 결정
  - 호출 위치: 서버(API 키를 앱에 넣지 않음). 예: `POST /posts/analyze-image`(업로드된 사진 기준)
  - 알레르기 기준: 식약처 알레르기 유발물질 표시 대상 목록으로 정규화. DB에 `posts.allergens`(배열) 등 컬럼 추가 필요
  - 안전 원칙: 자동 입력값은 모두 사용자가 확인·수정 후 등록("자동 추출됨 — 확인해 주세요"). 성분을 못 찾으면 "알레르기 없음"이 아니라 "표시 확인 불가"로 표기. 소비기한 인식 실패 시 달력 직접 입력
  - 한계: 직접 만든 음식(한끼 나눔)은 표시 사항이 없으므로 수동 입력
  - 시점: 정식 API E2E 확인 후, 외부 배포 전 (기능 완성 단계에 포함)
- 외부 배포 미진행: **앱 기능 구현 완료 후 시작하기로 결정(2026-10-02)**. 계획: 클라우드 Postgres(Neon/Supabase) → API 배포(Render/Railway/Fly.io) → 사진 저장소 분리(R2/Supabase Storage) → 모바일 API 주소 변경

## 8. 알려진 문제·주의사항
- **마이그레이션**: `compose.yaml`은 `infra/database/init`만 마운트 → `migrations/*`는 자동 적용되지 않음. 새 DB는 `001`에 002~004 내용이 이미 포함됨, 기존 DB만 `004` 등 수동 적용
- **`LOCAL_UPLOAD_PATH`**: `main.ts`가 `join(cwd, 값)`으로 처리해 절대경로를 넣으면 기동 실패. 상대경로만 사용
- **로컬 저장 모드 한계**: `LocalPost`는 항상 `isMine: true`(작성자 소유권 없음), 거리·D-Day를 문자열로 저장. 개발 전용이며 운영에서는 끈다
- **`DatabaseModule`**: `DATABASE_URL` 미설정 시 기동 실패(`getOrThrow`). 로컬 모드에서도 값 필요
- **CORS**: 로컬 모드에서만 localhost·`192.168.*` 출처 허용
- **JSON body 25MB**: base64 이미지 업로드 때문
- **비밀값**: `scripts/start-phone-preview.ps1`에 로컬 개발용 `JWT_SECRET`·DB 접속값이 하드코딩됨. 운영 값으로 사용 금지, 분리 검토 필요
- **`.env` 없음**: 정식 API 실행 시 `.env.example`을 복사해 직접 채워야 함
- **로컬 잔여물**: `storage/runtime/`(api.pid·로그·Expo 홈), `storage/uploads/` 이미지 3개, `storage/db/` SQLite. `api.pid`가 가리키는 프로세스가 실행 중인지는 미확인 → 필요 시 `npm run phone:stop`
- 일부 커밋 author가 `CodexSandboxOffline`(Codex 환경)으로 기록됨

## 9. 실행 방법
```powershell
npm install

# A) 정식 모드 (Docker 필요)
copy .env.example .env      # 값 채우기 (비밀값은 Git에 올리지 않음)
docker compose up -d
npm run start:api           # http://localhost:3000/api
npm run start:web           # Expo Web

# B) Docker 없이 휴대폰 테스트 (로컬 SQLite 모드)
npm run phone:check
npm run phone:start         # Expo Go로 QR 스캔
npm run phone:stop          # 종료 시

# C) 정적 웹 미리보기
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-mobile-web.ps1
# API 실행 후 http://localhost:3000/mobile/

# 검증
npm test
npm run build
npm run typecheck --workspace @neighbor-fridge/mobile

# 용량 점검 (삭제하지 않음)
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit-storage.ps1
```
- npm 캐시는 `storage/cache/npm`(`.npmrc`), Expo 홈/캐시는 `storage/runtime` 사용
- Expo 로그인 필요 시 `LOGIN_EXPO.ps1`

## 10. 중요한 설계 결정
- **단일 관리 루트**: 모든 로컬 파일은 `NeighborFridge/` 아래. 외부에 생기면 `EXTERNAL_RESOURCES.json`에 기록
- **만료 게시물**: 물리 삭제하지 않고 `EXPIRED` 상태로 전환. 삭제도 소프트 삭제(`DELETED`)
- **위치**: `GEOGRAPHY(POINT, 4326)` + GiST + `ST_DWithin`. 사용자에게 정확한 좌표 대신 거리·약속 장소만 노출
- **게시물 작성자**: 요청 body가 아니라 JWT 기준으로 결정
- **듀얼 저장 모드**: 운영은 PostgreSQL/PostGIS, Docker 없는 개발은 `node:sqlite` 로컬 저장
- **실시간 채팅**: 현재 SSE (문서상 목표는 WebSocket + Redis)
- **인증정보**: GitHub 인증은 Windows 자격 증명 관리자(`SETUP_GIT_AUTH.ps1`). 저장소 파일에 저장하지 않음

## 11. 참고 문서
- `AGENTS.md` — Codex 등 AI 에이전트 작업 규칙
- `README.md` — 개요·실행
- `PROJECT_BRIEF.md` — 목적·MVP 범위
- `PROJECT_STRUCTURE.md` — 디렉터리 구조
- `docs/architecture.md` — MVP 아키텍처
- `docs/MOBILE_TEST.md` — 실제 휴대폰 테스트
- `team-reference/solosafe/` — **외부 참고 자료**. 팀원의 SoloSafe 확정 계획·검토 보고서·진행 현황 원본이며 NeighborFridge 자체 문서가 아님
- `apps/api/README.md` — API 엔드포인트 목록
- `apps/mobile/README.md` — 모바일 실행·정적 미리보기
- `FILE_MANAGEMENT.md`, `LOCAL_STORAGE_PLAN.md` — 파일 저장·종료 시 정리 원칙
- `EXTERNAL_RESOURCES.json` — 프로젝트 외부 자원 목록

## 12. 정리·삭제 규칙
- 프로젝트 종료·정리 시 **삭제 후보 목록을 먼저 사용자에게 보여주고, 명시적 승인 후에만 삭제**한다.
  1. `scripts/audit-storage.ps1`로 현황 확인
  2. `scripts/cleanup-project.ps1`(인자 없이)로 삭제 예정 목록만 출력해 사용자에게 제시
  3. 승인 후 `scripts/cleanup-project.ps1 -Execute`
- GitHub 저장소·클라우드 DB·S3·Firebase 등 외부 자원은 항목별 별도 승인 (`deletionRequiresSeparateApproval`)
- Docker Desktop·WSL2·Docker 이미지/컨테이너는 `EXTERNAL_RESOURCES.json`에 기록됨(2026-10-02, 설치 전 선기록). 종료 시 `docker compose down` → 이미지 삭제 → Desktop/WSL2 제거 여부 사용자 확인
- 소스 폴더 전체 삭제는 영구 삭제가 아닌 휴지통 이동
- 비밀번호·API 키·토큰 등 민감정보는 이 문서와 Git에 기록하지 않는다

## 13. AI 작업 규칙
- 작업 시작 시 `HANDOFF.md`와 `git status`를 먼저 확인한다.
- 문서와 실제 코드/Git 상태가 다르면 실제 코드와 Git을 우선한다.
- 작업 종료 시 변경 파일, 수행 내용, 테스트 결과, 남은 작업을 `HANDOFF.md`에 갱신한다.
- 완료하지 않은 작업을 완료했다고 기록하지 않는다.
- 사용자 요청 없이 git commit/push하지 않는다.
- 프로젝트 원본, 데이터, 설정 파일을 임의로 삭제하지 않는다.
- 정리나 삭제가 필요하면 삭제 후보를 먼저 보여주고 사용자 승인 후 삭제한다.
