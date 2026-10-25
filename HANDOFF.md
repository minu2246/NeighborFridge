# HANDOFF — NeighborFridge (이웃냉장고)

> 마지막 갱신: 2026-10-25 · 작성: Claude Code (다음 세션 인계용 정리)
> Claude Code / Codex / ChatGPT 간 작업 인수인계 문서입니다. 작업 시작 시 먼저 읽고, 작업 종료 시 갱신합니다. (하단 "AI 작업 규칙" 참고)

## 0. 다음 세션 빠른 시작 (2026-10-25)
- **현재 상태**: 상대 프로필·관심 목록(찜)·마이그레이션 실행 스크립트 구현, 커밋 `ad8dc8f`로 `origin/main`에 푸시함. 그 뒤 후기 알림 구현(아래)도 커밋·푸시함. 이어서 알림 설정·계정 설정·상세 화면 오류 표시 버그 수정(아래)도 커밋·푸시함. 그 뒤 회원 탈퇴 구현(아래)도 커밋·푸시함. 이어서 약속 수락 흐름·이메일 변경·모바일 테스트·관심 목록 반경 밖·게시물별 거래 위치·배지 자동 갱신(아래 "2026-10-25 묶음")도 커밋·푸시함. 서버·Docker 컨테이너는 모두 꺼 둠(Docker Desktop은 부팅 자동 시작 꺼짐)
- **2026-10-25 상대 프로필**: `GET /users/:id/profile`(닉네임·동네·통계, 이메일·좌표 제외), `GET /reviews/received?userId=`(없으면 내 후기). 게시물 상세에서 작성자 줄을 누르면 `components/NeighborProfileCard.tsx`(매너 온도·칭찬 상위 3·최근 후기 3) 펼침. `ProfileScreen`의 칭찬 집계를 `countPraises`로 꺼내 공유. 채팅방 머리글의 상대 이름(▾)을 눌러도 같은 카드가 펼쳐짐(`ChatTarget.neighborId`). E2E `09-neighbor-profile.ts` 추가. 브라우저(http://localhost:8081)에서 게시물 상세·채팅방 두 곳 모두 카드 표시 확인(2026-10-25)
- **2026-10-25 관심 목록(찜)**: 테이블 `post_likes`(`migrations/007`, `init/001`에도 추가, 개발 DB에 적용함). API `PUT·DELETE /posts/:id/like`, `GET /posts/liked`(거래 중인 찜 게시물 id, 최근 순). 앱: 상세 ♡ 버튼(내 게시물·로컬 모드·데모 진입은 비활성), 프로필 "관심 목록 N" → 홈에서 찜한 것만 보기. HomeScreen `mineOnly` → `only: 'mine' | 'liked'`로 바꿈. E2E `10-likes.ts`, 브라우저에서 찜→관심 목록 확인.
- **2026-10-25 마이그레이션 실행**: `npm run db:migrate`(`scripts/db-migrate.mjs`, `pg` + `.env`의 `DATABASE_URL`). `migrations/*.sql` 중 `schema_migrations`에 없는 것을 이름순으로 트랜잭션 적용·기록, 실패 시 롤백·중단(종료 코드 1), UTF-8 BOM 제거. 확인한 것: 개발 DB 첫 실행 6개 적용→두 번째 "없음", 임시 새 DB(init/001 → migrate) 정상 후 삭제, 일부러 실패하는 임시 마이그레이션이 롤백·미기록. 개발 DB는 009까지 기록됨
- **2026-10-25 후기 알림(앱 안, 푸시 없음)**: `users.reviews_seen_at`(`migrations/008`, `init/001`에도 추가, `db:migrate`로 개발 DB 적용). `GET /reviews/notifications` → `{ pendingReviews, newReviews }`. `GET /reviews/received`는 **내 후기를 볼 때만** 읽음 처리(다른 이웃 후기 조회는 안 함), 응답에 `isNew`. 앱: "나의 냉장고" 탭 빨간 배지 = 남길 후기 + 새 후기(탭 이동마다 갱신, 프로필 탭에 있는 동안 새 후기는 빼고 표시), 받은 후기 목록에 NEW 표시. 단위 테스트 1개 + E2E `11-review-notifications.ts`, 브라우저에서 배지 2 → 프로필 진입 시 NEW 표시·배지 1 확인. 한계: 실시간 아님(탭 이동 시에만 갱신), 휴대폰 푸시(FCM) 없음
- **2026-10-25 계정·알림 설정 + 버그 수정**: `users.notify_reviews`(`migrations/009`, `init/001`에도 추가, 개발 DB 적용). API `PATCH /users/me`(닉네임 앞뒤 공백 제거·2자 이상, `notifyReviews`), `PATCH /users/me/password`(현재 비밀번호 확인, 회원가입과 같은 규칙), `GET /users/me`에 `notifyReviews` 포함. 후기 알림을 끄면 `GET /reviews/notifications`가 0. 앱: `screens/SettingsScreen.tsx`(프로필 메뉴 "알림 설정"·"계정 및 개인정보"), 닉네임 바꾸면 프로필·저장된 로그인 정보에 반영. 버그: 게시물 상세의 오류(찜·채팅 실패)가 작성자 관리 영역 안에만 표시돼 일반 사용자에게 안 보이던 것 → 하단 버튼 위에 표시. 단위 테스트 2개 + E2E `12-account-settings.ts`, 브라우저에서 알림 끄기→배지 사라짐, 닉네임 변경, API 끈 상태에서 찜 → 오류 표시 확인.
- **2026-10-25 회원 탈퇴(완전 삭제, 사용자 결정)**: `DELETE /users/me` body `{ password }`(비밀번호 확인). `UsersRepository.deleteAccount`가 한 트랜잭션에서 삭제: 참여한 채팅방·메시지(상대 쪽 대화 포함), 주고받은 후기·내 게시물에 달린 후기, 찜(내가 누른 것·내 게시물에 달린 것), 내 게시물, 사용자. 다른 사람 게시물의 `completed_with`만 NULL로 비움(게시물은 남음, 상대 매너 온도는 탈퇴자 후기만큼 되돌아감). 게시물 사진 파일도 `storage/uploads`에서 삭제(업로드 파일명 형식 `uuid.확장자`만). FK에 ON DELETE CASCADE 없음 → **사용자를 참조하는 테이블을 새로 만들면 `deleteAccount`에도 추가해야 함**. 앱: 계정 화면 맨 아래 "회원 탈퇴"(비밀번호 + 두 번 누르기) → 로그인 화면. 단위 테스트 1개 + E2E `13-delete-account.ts`, DB 고아 행 0 확인, 브라우저에서 테스트 계정 탈퇴 확인
- **2026-10-25 묶음 (사용자 요청 1~4번)**
  1. **약속 수락 흐름**: `chat_rooms.meet_status`(PROPOSED/ACCEPTED)·`meet_proposed_by`(`migrations/010`, 기존 약속은 ACCEPTED로 채움). 약속 저장 = 제안(메시지 `📅 약속: …` 그대로), `POST /chats/rooms/:id/appointment/respond {accept}`는 제안하지 않은 쪽만 → 수락 `✅ 약속 확정: …`, 거절 시 약속 비우고 `❌ …` 메시지. 확정 뒤 변경하면 다시 제안 상태. GET 약속에 `status`·`proposedByMe`. 앱: 약속 배너에 수락/거절 버튼·상태 문구(5초마다 갱신), 채팅 목록에 "약속 제안 받음"/"오늘 약속", **채팅 탭 배지 = 안 읽은 메시지 + 받은 제안**. `meet_proposed_by`는 참여자만 들어가므로 탈퇴 삭제(채팅방 통째 삭제)로 처리됨. 로컬 모드는 예전 그대로. E2E `14-appointment-accept.ts`, E2E 01 기대값 수정
  2. **이메일 변경**: `PATCH /users/me/email {email, password}` — 비밀번호 확인, 소문자 저장, 중복이면 409. 이메일 인증 메일은 없음(메일 서비스 없음). 계정 화면에 입력칸. E2E 12에 추가
  3. **모바일 테스트**: 새 의존성 없이 `node:test` + `tsx`. 화면 파일은 react-native를 불러와 Node에서 못 돌리므로 순수 로직을 `src/lib/{posts,reviews,chat}.ts`로 옮김(중복이던 `displayDDay` 2개 → 1개). `apps/mobile`의 `npm test` = `tsx --test src/lib/lib.test.ts`, 루트 `npm test`가 API + 모바일 모두 실행
  4. **작은 개선**: (a) 관심 목록은 반경과 무관 — `GET /posts/liked?latitude&longitude`가 게시물(거리 포함)을 돌려주고, 앱이 반경 밖 찜 게시물을 합쳐 관심 목록에서만 보여 줌(`filterPosts`). (b) 등록 화면 "지금 위치로"(expo-location) → 그 좌표로 등록, 서버는 인증한 동네 10km 이내만 허용(`MAX_POST_DISTANCE_KM`). (c) 탭 배지 30초마다 자동 갱신. E2E `15-post-location-liked.ts`
  - 검증: API 37 + 모바일 4 단위 테스트, 빌드, 타입체크, E2E 01~15 전부(08 실사진 포함) 통과. 브라우저: 채팅 배지 3 → 제안 수락 → 확정 표시, 등록 화면 위치 버튼·계정 화면 이메일 칸 배치 확인. "지금 위치로"는 브라우저 위치 권한 팝업 때문에 직접 누르지 않음(E2E로 좌표 등록 검증)
- **OCR 실사진 추가 채점**: 사용자가 당장 더 찍을 여건이 안 됨(2026-10-25). 현재 사진은 10/21 카톡 4장뿐 → 사진이 생기면 `storage/downloads/ocr-samples`에 넣고 정답표 + 자동 채점 작성
- **환경 띄우기** (Windows, 루트에서)
  1. 시작 메뉴에서 Docker Desktop 실행(또는 `Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"`) → 엔진 준비까지 대기
  2. `docker compose up -d` → postgres·redis·ocr(PaddleOCR, 8866) 기동. DB 데이터는 `storage/db/postgres`에 유지. 새 마이그레이션이 있으면 `npm run db:migrate`
  3. `npm run start:api` (API 빌드 후 루트에서 `node apps/api/dist/main.js`, 자동 재시작 없음) → http://localhost:3000/api
  4. 화면: 개발용 `npm run start:web`(http://localhost:8081, 코드 수정 즉시 반영) 또는 정적 `scripts/build-mobile-web.ps1` 후 http://localhost:3000/mobile/ (코드 바꾸면 다시 빌드)
- **검증 명령**: `npm test`(API 37개 + 모바일 4개) · `npm run build` · `npm run typecheck --workspace @neighbor-fridge/mobile` · `npm run e2e`(API·Docker 켠 상태에서 `scripts/e2e/01~07`, `09`~`15`) · `npx tsx scripts/e2e/08-ocr-real-photos.ts`(로컬 실사진 필요)
- **꼭 지킬 것 (이번 작업에서 실제로 문제됐던 것)**
  - npm/npx/jest는 **루트에서만** 실행(하위 폴더에서 실행하면 그 아래 `storage/cache/npm`이 생김 — 2회 발생 후 삭제)
  - 정규식·이스케이프가 들어간 코드를 node/bash heredoc 스크립트로 쓰지 말 것 — 역슬래시가 사라진 버그 2회(약속 시간 정규식, 테스트 문자열). **Edit 도구 사용**
  - 로그인 정보는 주소·포트마다 따로 저장(8081과 3000은 별개). "기능이 안 된다"는 제보는 로그인 여부부터 확인
  - Expo Web을 `CI=1`로 띄우면 파일 변경 감지가 꺼져 옛 코드가 나옴
  - 프로젝트 밖에 무언가 설치·생성하면 **먼저** `EXTERNAL_RESOURCES.json`에 기록(사용자는 종료 시 전부 삭제를 원함, 12절)
  - `graphify-out/`은 현재 코드 기준으로 오래됨 → 사용하려면 사용자 동의 후 `/graphify . --update`

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

## 2. Git 상태 (2026-10-21 기준)
- 브랜치: `main` (`origin/main`과 동기화), stash 없음
- 원격: `https://github.com/minu2246/NeighborFridge.git`
- 2026-10-20 커밋·push: `d8e9c0d`(약속 시간 검증·start:api 수정), `0042ae7`(로그인 유지·닉네임·설명), `b0881ea`(프로필 통계·후기/매너 온도·OCR 1차), 2026-10-21 무게·탄소·채팅 목록·후기 확장·빈 채팅방 수정·PaddleOCR 교체 커밋(이 HANDOFF 포함). 미커밋 변경 없음
- 미추적(의도적으로 커밋 제외): `graphify-out/`(자동 생성물, 현재 코드 기준으로 오래됨), `team-reference/`(팀원 원본 자료)
- 최근 흐름(10/21): 무게·탄소 절감 → 채팅 목록(마지막 메시지·안 읽음) → 후기 칭찬 항목 → 빈 채팅방 버그 수정 → 실사진 OCR 실패 확인 → PaddleOCR 교체
- 10/20 흐름: Docker 정식 DB E2E → 버그 2건 수정 → 로그인 유지·닉네임 → 프로필 통계 → 거래 후기·매너 온도 → 무료 OCR 자동 작성
- 이전 흐름: Expo 모바일 MVP → 로컬 SQLite 저장 → 휴대폰 미리보기 → 사진 업로드 → 만료 처리 → 필터·정렬 → 소비기한 달력·거래 상태 → 상태 영속화·내 게시물

## 3. 프로젝트 구성
npm workspaces 모노레포 (Node >= 22). workspace는 `apps/api`, `apps/mobile` 두 개.

| 경로 | 내용 | 상태 |
|---|---|---|
| `apps/api` | NestJS 11 HTTP API (전역 prefix `/api`), `pg`, `@nestjs/schedule` | 구현 |
| `apps/mobile` | Expo SDK 57 / React Native 0.86 / React 19 (iOS·Android·Web 공용) | 구현 |
| `apps/worker` | 만료·알림 배치 자리 | README만 존재 |
| `packages/shared-types`, `packages/validation` | 공유 타입·검증 | README만 존재 |
| `infra/database` | `init/001_schema.sql`(002~010 내용 포함), `migrations/002`~`010` (인증, 채팅, 동네·약속, 후기, 무게·칭찬, 찜, 후기 읽음, 알림 설정, 약속 상태) | |
| `infra/ocr` | PaddleOCR 서버(Dockerfile, `server.py`) — compose `ocr` 서비스 | 구현 |
| `scripts/` | 용량 점검·정리·휴대폰 미리보기·웹 빌드 PowerShell, `scripts/e2e/`(정식 모드 E2E 8개 + `fixtures/`) | |
| `storage/` | 로컬 DB·업로드·캐시·런타임 (Git 제외) | |
| `compose.yaml` | `postgis/postgis:17-3.5`, `redis:7-alpine`, `ocr`(이미지 `neighborfridge-ocr`, 2.28GB) | |

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
- 사용자 통계: `GET /users/me/stats` → 나눔 완료·나눔 중·대화한 이웃·매너 온도·받은 후기 수
- 거래 후기: 완료 시 거래 상대 지정(`completedWith`), `GET /reviews/pending`, `POST /reviews` (매너 온도 36.5°C 시작, +0.2/+0.1/-0.3)
- 포장지 OCR: `POST /ocr/label` → compose `ocr` 서비스(PaddleOCR, `infra/ocr`) 인식 + 규칙 해석 `modules/ocr/label-parser.ts`
- 게시물 무게(`weightGrams`)·탄소 절감 추정, 채팅 목록 마지막 메시지·안 읽은 수(읽음 처리), 후기 칭찬 항목·받은 후기(`GET /reviews/received`, `?userId=`로 다른 이웃 후기)
- 다른 이웃 프로필: `GET /users/:id/profile` (닉네임·동네·통계, 이메일·좌표 제외)

### Mobile (`apps/mobile`)
- 화면: 인증(데모 진입 포함), 위치(동네 인증/직접 입력), 홈(필터·정렬·내 게시물), 등록(사진 선택, 소비기한 `DatePickerModal`), 게시물 상세(작성자 상태 변경), 채팅(거래 약속 배너·입력 폼), 프로필
- 로그인 유지(앱 `expo-secure-store`, 웹 `localStorage`)·로그아웃, 프로필 통계·매너 온도·후기 남기기, 거래 완료 시 거래 상대 선택, 등록 화면 "포장지 사진으로 자동 작성"
- Android 뒤로가기 처리 (`BackHandler`)
- API 연결 표시: 연결 시 "API 연결됨", 실패 시 데모 데이터(`data/demo.ts`)
- API 호출은 `api/client.ts`에서 모드 분기: 기본은 정식 API(JWT Bearer), `EXPO_PUBLIC_USE_LOCAL_STORE=true`이면 `/api/local/*`
- 정식 모드: 게시물 `isMine` = 작성자 id 비교, 내 게시물은 채팅 버튼 숨김, 채팅 목록은 `/chats/rooms`(로컬 모드는 데모 목록), 채팅 5초 폴링

## 5. 진행 중인 작업
- 마지막 기능 작업: 로컬 저장 모드 게시물 상태 영속화 + "내 게시물" 보기 (`5b198a7`)
- 2026-10-01 (Codex): 테스트·빌드 실행, `HANDOFF.md` 작성, Codex용 `AGENTS.md` 추가 (코드 변경 없음)
- 2026-10-02: 팀원의 SoloSafe 진행 현황 및 창업동아리 최종 목표 참고 문서 3개를 `team-reference/solosafe/`에 원본 그대로 보관. NeighborFridge 자체 기획·구현 현황과 분리하며, SoloSafe의 완료 항목을 NeighborFridge 완료 항목으로 간주하지 않음
- 2026-10-02 (Claude Code): **거래 약속(시간·장소) 기능 — 로컬 저장 모드 먼저 구현 (이후 아래 연동 작업에서 정식 API에도 반영)**
  - API: `local_appointments` 테이블(채팅방당 1건, upsert), `GET/PUT /api/local/rooms/:roomId/appointment` (`meetAt`=서울 기준 `YYYY-MM-DDTHH:mm`, 지난 날짜 거부). 저장 시 "📅 약속: M월 D일 HH:mm · 장소" 메시지를 채팅에 자동 기록
  - Mobile: 채팅방 상단 약속 배너(없으면 "약속 잡기", 있으면 "변경") + 날짜(`DatePickerModal` 재사용)·시간·장소 입력 폼
  - 변경 파일: `apps/api/src/modules/local-store/local-store.{service,controller}.ts`, `apps/api/test/local-store.service.spec.ts`(신규), `apps/mobile/src/{types.ts,api/client.ts,screens/ChatScreen.tsx}`
  - 미검증: 실제 화면(웹/휴대폰)에서 약속 UI 동작 확인 안 함
- 2026-10-02 (Claude Code): **모바일 ↔ 정식 API 연동 (코드 완료, DB 실행 검증 안 됨)**
  - 사용자 결정: 외부 배포는 마지막, 정식 백엔드 연동은 지금 (로컬 SQLite 모드에서 기능을 쌓으면 이중 구현이 되므로)
  - API: `users`에 `neighborhood_name`·`search_radius_km`, `chat_rooms`에 `meet_at`·`meet_place` 추가(`001_schema.sql` + 기존 DB용 `004` 마이그레이션), 정식 채팅 약속 엔드포인트, nearby가 RESERVED 포함, `imageUrls` 검증 `require_tld: false`(localhost/IP 허용), `NODE_ENV=development`에서도 CORS 허용, 약속 메시지 포맷 `formatAppointmentMessage`(`chat.types.ts`) 공용화
  - Mobile: `client.ts` 재작성(토큰 보관·Authorization 헤더, 정식 응답 → `FoodPost`/`ChatMessage` 변환, 빈 응답 null 처리), `App.tsx`·`ChatScreen.tsx`·`PostDetailScreen.tsx` 연결
  - 검증: 단위 테스트·빌드·타입체크 통과, 로컬 모드 API 스모크(동네 저장, 약속 저장/조회, 지난 날짜 400, 빈 약속 200 빈 응답, 토큰 없는 `/chats/rooms` 401) 확인
  - 실행 모드: `npm run start:web`은 정식 모드(기본). `phone:start`는 스크립트가 `EXPO_PUBLIC_USE_LOCAL_STORE=true`를 설정하므로 로컬 모드. `build-mobile-web.ps1`은 2026-10-21부터 기본 정식 모드(`-LocalStore`로 로컬 모드)
  - **미검증**: PostgreSQL/PostGIS 위에서 정식 모드 전체 흐름(이 PC에 Docker·PostgreSQL 미설치), 앱 화면 동작
- 2026-10-02 (Claude Code): DB 환경은 **Docker Desktop으로 결정**(사양 확인: RAM 31GB, 가상화 켜짐, WSL2 미설치로 보임). 사용자가 직접 설치 예정(`winget install Docker.DockerDesktop`, 재부팅 필요할 수 있음). Docker 관련 외부 자원은 설치 전에 `EXTERNAL_RESOURCES.json`·`FILE_MANAGEMENT.md`에 기록
- 2026-10-02: 사진 기반 게시물 자동 작성(소비기한·품목·알레르기 성분) 요구사항·설계 메모를 7절과 `PROJECT_BRIEF.md`에 기록 (미구현, AI 서비스·API 키 미정)
- 2026-10-03 (Claude Code): `README.md` 재작성 (개발 배경·목적·목표, 기능 진행 현황표, 기술 스택, 구조, 실행 방법, 문서 링크). 개발 배경의 1인 가구 문구는 Claude가 작성한 서술이라 사용자 검토 필요
- 2026-10-20 (Claude Code): **정식 모드 E2E 검증 완료**
  - 환경: Docker Desktop 4.95.0 + WSL 3.0.3.0 설치·재부팅 완료, `docker compose up -d`로 PostGIS 3.5/Redis 기동, `001_schema.sql`로 테이블·신규 컬럼(`neighborhood_name`, `search_radius_km`, `meet_at`, `meet_place`) 생성 확인. 루트 `.env` 생성(Git 제외, `JWT_SECRET` 무작위)
  - **버그 수정 1**: `npm run start:api`가 `tsx watch`로 실행돼 Nest DI 실패(`Cannot read properties of undefined (reading 'getOrThrow')`, esbuild가 데코레이터 메타데이터 미생성) + `apps/api`에서 실행돼 루트 `.env` 미인식 → 루트 `start:api`를 "API 빌드 후 루트에서 `node apps/api/dist/main.js`"로, `apps/api`의 `start:dev`도 `tsc` 빌드 후 실행으로 변경. 자동 재시작(watch)은 없음. `tsx`는 API 실행에는 안 쓰고 `npm run e2e`(E2E 스크립트 실행)에 사용
  - **버그 수정 2**: 약속 시간 정규식의 역슬래시 누락(10/2 작업 시 스크립트로 파일을 쓰며 발생) → 정식 API `SaveAppointmentDto`가 모든 시간을 거부, 앱 `ChatScreen`도 모든 시간을 "형식 오류" 처리하던 문제 수정. 재발 방지 테스트 `apps/api/test/save-appointment.dto.spec.ts` 추가
  - E2E: 앱의 실제 `client.ts`를 tsx로 불러와 두 계정 시나리오 12단계 통과 (가입·동네 저장/조회, 사진 포함 등록·사진 URL 접근, 자기 게시물 채팅 거부, 주변 조회 거리·D-Day·isMine, 채팅방 생성/재사용, 메시지·약속, 남의 게시물 상태 변경 거부, 상대 기준 메시지 방향, 예약중 표시, 완료 후 목록 제외, 지난 날짜 거부). Expo Web 출처 CORS 허용 확인. 스크립트는 세션 임시 폴더에만 있음(저장소 미포함)
  - 남은 테스트 데이터: 개발 DB(`storage/db/postgres`)에 테스트 계정 2개·게시물 1개, `storage/uploads/`에 1x1 PNG 1개 (정리 스크립트 대상)
  - UI 테스트: 사용자가 Expo Web(정식 모드, 두 창)에서 가입·동네 인증·사진 게시물 등록·채팅·약속·예약중/거래 완료 흐름을 직접 확인, 모두 정상 (2026-10-20). 휴대폰 실기기 정식 모드는 미확인
  - Docker Desktop 부팅 자동 시작 해제, 바탕 화면 바로가기는 사용자 시작 메뉴 폴더로 이동(사용자 요청). 개발 시 Docker Desktop을 직접 실행해야 함
- 2026-10-20 (Claude Code): **정식 모드 남은 구멍 정리**
  - 로그인 유지: `expo-secure-store` 추가(`npx expo install`, `app.json`에 플러그인 자동 추가). 웹은 `localStorage`, 앱은 secure-store에 `{token, userId, nickname}` 저장 → 앱 시작 시 `restoreSession()`이 `/users/me`로 검증, 실패 시 삭제. 로컬 모드는 저장 안 함. secure-store는 사용 시점 `require`(Node E2E에서 client.ts를 불러오기 위함)
  - 로그아웃: 프로필 화면에 버튼 추가(데모 진입이면 "로그인하러 가기"), 상태 전체 초기화
  - 닉네임: `GET /posts/nearby`에 `authorNickname`, `GET /chats/rooms`에 `partnerNickname`(요청자 기준 상대) 추가. 게시물 상세 작성자명, 채팅방 상대명에 반영
  - 고정 문구 제거: 게시물 상세의 가짜 설명·"매너온도 48.5°"·"보관 상태 냉장 보관" 삭제 → 실제 `description` 표시(없으면 숨김). 등록 화면에 "설명 (선택)" 입력 추가, 프로필 이름은 실제 닉네임
  - 검증: 테스트 18개·빌드·타입체크 통과, 기존 E2E 12단계 + 신규 E2E 9단계(세션 저장/복원/로그아웃/위조 토큰 거부, 설명, 작성자·상대 닉네임) 통과, 웹 번들에 새 코드 반영 확인
  - 참고: Expo Web을 `CI=1`로 띄우면 Metro가 파일 변경을 감지하지 않아 옛 코드가 계속 나옴 → `CI` 없이 실행
  - 정리: `npx expo install`을 `apps/mobile`에서 실행해 생긴 `apps/mobile/storage/cache/npm`(npm 캐시 43MB)은 사용자 승인 후 삭제. 이후 npm/expo 명령은 루트에서 실행할 것
- 2026-10-20 (Claude Code): **프로필 통계 실제 데이터화**
  - `GET /users/me/stats` → `{ completedPosts, activePosts, chatPartners }` (거래 완료 게시물 수, ACTIVE·RESERVED 게시물 수, 채팅한 서로 다른 이웃 수)
  - 프로필 통계를 "나눔 완료 / 나눔 중 / 대화한 이웃"으로 변경, 화면 열 때마다 조회. 로컬 모드·데모 진입은 "-"
  - 결정: 기존 "탄소 절감 3.2kg"·"매너 온도 48.5°"는 근거 데이터(식재료 무게, 거래 후기)가 없어 실제 값으로 계산 불가 → 지표 교체. 되살리려면 등록 시 무게 입력, 거래 후기 기능이 먼저 필요
  - 검증: 테스트 18개·빌드·타입체크 통과, 통계 E2E 5단계(0 초기값, 상태별 집계, 같은 이웃 중복 제거, 양쪽 시점, 로그아웃 시 null) + 기존 E2E 2종 통과
- 2026-10-20 (Claude Code): **거래 후기·매너 온도**
  - 사용자 요청: 당근마켓 매너온도와 비슷하게. 공개된 방식(36.5°C 시작, 거래 후기·매너 평가로 증감, 상한 99°C)을 참고했고 정확한 당근 계산식은 비공개라 자체 규칙 사용
  - 규칙(기본값, `users.repository.ts` `getStats` SQL 한 곳): 36.5°C 시작, 최고예요 +0.2 / 좋아요 +0.1 / 별로예요 -0.3, 0~99 범위, 소수 첫째 자리
  - DB: `posts.completed_with`(거래 상대), `reviews` 테이블(게시물·작성자별 1회, rating -1/1/2) — `005_add_reviews.sql` + `001_schema.sql` 끝에 동일 내용. 개발 DB에는 005 적용 완료
  - API: `PATCH /posts/:id/status`에 선택 `completedWith`(완료 시에만, 그 게시물로 채팅한 이웃만 허용), `GET /reviews/pending`, `POST /reviews {postId, rating}`(거래 당사자만, 1회), 통계에 `mannerTemperature`·`reviewCount`
  - Mobile: 게시물 상세 "거래 완료" → 채팅한 이웃이 있으면 "누구와 거래했나요?" 선택(또는 "앱 밖에서 거래했어요"), 프로필에 매너 온도 막대·얼굴 아이콘·받은 후기 수, "후기 남길 거래" 섹션(최고예요/좋아요/별로예요). 프로필 화면 스크롤 가능하게 변경
  - 검증: 테스트 19개(거래 상대 검증 테스트 추가)·빌드·타입체크 통과, 후기 E2E 13단계(후보 목록, 비채팅 상대 거부, 앱 밖 거래 후기 불가, 중복·제3자 후기 거부, 양쪽 온도 계산 36.4/36.8/36.5) + 기존 E2E 3종 통과, 웹 번들 반영 확인
  - 미구현: 선택형 칭찬 항목("시간 약속을 잘 지켜요" 등), 받은 후기 목록 보기, 후기 알림, 로컬 모드 지원
- 2026-10-20 (Claude Code): **포장지 사진 자동 작성 — 무료 OCR**
  - 사용자 결정: 비용이 드는 방식(유료 AI API·유료 OCR)은 사용하지 않음 → 오픈소스 `tesseract.js`(서버, 한국어+영어, 키·계정 불필요) + 규칙 기반 해석
  - 언어 데이터(kor/eng traineddata)는 첫 실행 시 CDN에서 무료 다운로드 → `storage/cache/tesseract/`(Git 제외, 정리 스크립트 대상)
  - API: `POST /ocr/label {base64, mimeType}`(로그인 필요, 저장 안 함) → `{ itemName?, expiryDate?, weightText?, weightGrams?, allergens[], allergenLabelFound }`. 워커 1개 재사용
  - 해석 규칙(`apps/api/src/modules/ocr/label-parser.ts`, 순수 함수): 상품명은 "제품명/품명/상품명" 줄만, 소비기한은 키워드 줄(다음 줄 포함) 우선·제조일 줄 제외·없으면 가장 늦은 날짜·불가능한 날짜 제거, 중량은 내용량 줄 우선·없으면 최댓값·g→9 OCR 오인식 보정(내용량 줄에 단위 없을 때만), 알레르기는 식약처 표시 대상 19종 + 표현 사전·토큰 정확 일치(밀봉/맛있게 오탐 방지)·조사 제거. 표시 문구가 없으면 `allergenLabelFound=false` → "없음"이 아니라 "확인 불가"
  - Mobile: 등록 화면에서 사진 선택 시 "📷 포장지 사진으로 자동 작성" 버튼(정식 모드). 비어 있는 칸만 채우고, 내용량·알레르기는 설명란에 추가, "자동 입력됨 — 포장지와 꼭 비교해 확인해 주세요" 안내와 항목별 결과(찾지 못함/확인 불가 포함) 표시
  - 검증: 해석 규칙 테스트 7개(총 26개) 통과, 실제 OCR E2E — 생성한 두부 라벨(PNG)과 기울어지고 작은 글씨의 저화질 식빵 라벨(JPEG) 모두 상품명·소비기한·중량·알레르기 정확, 응답 약 0.2~0.3초(워커 준비 후). 기존 E2E 4종 통과
  - 테스트 사진: `storage/downloads/ocr-samples/`(Git 제외). 실제 휴대폰 촬영 사진(반사·굴곡·조명)으로는 미검증
  - 정리: 테스트를 `apps/api`에서 실행해 생긴 `apps/api/storage/`(npm 로그 16KB)는 사용자 승인 후 삭제. **npm/npx/jest 명령은 항상 루트에서 실행**(`.npmrc` 캐시 경로가 상대경로라 하위 폴더에서 실행하면 그 아래 `storage/`가 생김)
  - 한계: 구조화 저장 없음(내용량·알레르기는 설명 텍스트로만 저장 → 탄소 절감 계산하려면 `posts`에 무게 컬럼 필요), 로컬 모드 미지원, 이미지 전처리(대비·회전 보정) 없음
- 2026-10-21 (Claude Code): **무게·탄소 절감, 채팅 목록 개선, 후기 확장**
  - DB: `006_add_weight_and_praises.sql`(`posts.weight_grams`, `reviews.praises TEXT[]`) + `001_schema.sql` 끝에 동일 내용. 개발 DB 적용 완료
  - 무게·탄소: 게시물 등록에 "무게 (선택, g)" 입력(1~100000, OCR 중량 자동 채움), 상세에 무게 표시. 통계에 `sharedKg`·`carbonSavedKg` = 나눔 완료 무게 합 × 2.5 kgCO2e/kg (FAO 2013 Food Wastage Footprint 기반 근사치, 화면에 "추정" 표기). 무게 없는 게시물은 제외
  - 채팅 목록: `GET /chats/rooms`에 `lastMessage`·`lastMessageAt`·`unreadCount`, 최근 대화 순 정렬. 메시지 조회 시 상대 메시지 읽음 처리(`read_at`). 앱 목록에 시간(오늘 오전/오후 h:mm·어제·M.DD)·미리보기·안 읽은 수 배지, 목록 화면 10초 갱신
  - 후기: 평가 선택 후 항목 선택(좋은 평가 → 칭찬 5종, 별로예요 → 아쉬운 점 4종, 서버에서 평가와 항목 일치 검증) → "후기 보내기". `GET /reviews/received`(최근 20개). 프로필에 "받은 매너 칭찬"(항목별 횟수)과 "받은 거래 후기" 목록. 항목 목록은 서버 `post.types.ts`와 앱 `ProfileScreen.tsx`에 같은 값으로 있음(바꿀 때 둘 다)
  - 검증: 테스트 28개(읽음 처리·칭찬 항목 검증 추가)·빌드·타입체크 통과, 신규 E2E 12단계 + 기존 E2E 5종 통과, 웹 번들 반영 확인
  - **버그 수정(사용자 제보)**: "채팅으로 약속 잡기"만 누르고 메시지를 안 보내도 채팅 목록에 대화가 있는 것처럼 보임(방이 즉시 생성되기 때문) → 메시지가 1개 이상인 방만 채팅 목록·"대화한 이웃" 수·거래 상대 후보로 인정. 방 자체는 유지(재진입 시 같은 방). 재현 E2E 8단계 + 기존 E2E 6종 통과
- 2026-10-21 (Claude Code): **사진 OCR 엔진 교체 tesseract → PaddleOCR + 해석 규칙 보강**
  - 계기: 사용자 실사진 4장(쵸코하임·치킨너겟·신라면·핫도그, `storage/downloads/ocr-samples/KakaoTalk_*`)에서 tesseract는 "함유" 줄 0/4, 전처리(sharp 흑백·대비·이진화·반전 × PSM 3/6/11 × 해상도) 실험에서도 1/4. 교차오염 안내("같은 제조시설") 성분을 함유로 잘못 잡는 위험 확인
  - 엔진: `infra/ocr`(Dockerfile + `server.py`, 표준 라이브러리 HTTP 서버) → compose `ocr` 서비스(포트 8866, 이미지 `neighborfridge-ocr` 2.28GB, 모델 `storage/cache/paddleocr`). API는 `OCR_URL`(기본 http://localhost:8866)로 호출, 서버가 꺼져 있으면 503 안내. `tesseract.js` 의존성 제거
  - 설정 근거(시험 결과): 인식 모델 korean_PP-OCRv3(PP-OCRv5 korean은 한글이 통째로 빠짐), 검출 mobile_det + enable_mkldnn=False(server_det은 메모리 부족 종료 137, mkldnn은 Paddle 3.x CPU 버그), 긴 변 2400px로 축소. 한 장 약 5~6초, 대기 메모리 약 413MB
  - 해석 규칙(`label-parser.ts`): 교차오염 줄 제외, 함유 줄 못 찾으면 추측 안 함("확인 불가"), 띄어쓰기 없는 함유 줄 분해(가장 긴 이름부터, 한 글자 이름은 앞뒤 구분자 조건), 3글자 이상 이름은 한 글자 오인식 허용(대지고기→돼지고기), 계라→계란, 표 형태(항목명 다음 줄 값), "100g당" 제외, 10g 미만 제외, 내용량 줄 없으면 중량 추측 안 함
  - 결과(실사진 4장, 원본·앱과 같은 JPEG 품질 45% 압축본 모두): 알레르기 4/4 정확, 틀린 값 0. 중량은 읽을 수 있는 것만(쵸코 142g·너겟 1kg, 압축본 너겟은 "19"로 읽혀 빈칸), 상품명 3/3 찾음(원본은 효코하임·치킨너겠처럼 한 글자 오인식 가능 → 사용자 확인 단계에서 수정)
  - 검증: 테스트 30개(실사진 OCR 문자열 회귀 테스트 포함)·빌드·타입체크 통과, 실사진 E2E(원본·압축)·합성 라벨 E2E 통과
  - 정리(사용자 승인 후 삭제): `storage/cache/tesseract/`(7.1MB), Docker 이미지 `neighborfridge-paddleocr-bench`(시험용). 실험용 `sharp`는 세션 임시 폴더에만 설치(프로젝트 밖, 프로젝트 코드 미사용)
- 2026-10-21 (Claude Code): **사용자 제보 "서버에서 실행하면 사진 자동 작성이 안 됨"**
  - 원인: `http://localhost:3000/mobile/`(API가 서빙하는 정적 웹)은 2026-10-01 빌드 그대로였고 `build-mobile-web.ps1`이 로컬 저장 모드로 고정 → 최근 기능 전부 없음, OCR 버튼 없음
  - 조치: 스크립트 기본값을 정식 모드로 변경(`-LocalStore` 스위치 추가), 정적 웹 재빌드 → 서빙 번들에 `/ocr/label`·후기 기능 포함 확인. **코드를 바꾼 뒤 서버 주소로 확인하려면 이 스크립트를 다시 실행해야 함**(개발 서버 `npm run start:web`/8081은 자동 반영)
  - 참고: `phone:start`(휴대폰 미리보기)는 여전히 로컬 모드라 OCR·후기 등 정식 모드 기능이 없음
  - 추가 제보 "버튼은 있는데 눌러도 자동 작성이 안 됨": 브라우저 확인 결과 localhost:3000에 로그인 정보가 없어 `/ocr/label`이 401(로그인 정보는 주소·포트마다 따로 저장 → 8081에서 로그인해도 3000에선 다시 로그인 필요, 데모 진입도 동일). 오류 문구가 폼 맨 아래에 떠서 반응이 없는 것처럼 보였음. 로그인 상태에서는 같은 브라우저에서 200 정상
  - 조치: 로그인 안 했으면 버튼 대신 "로그인하면 사용할 수 있어요" 안내, 자동 작성 오류는 버튼 바로 아래 표시(`isLoggedIn()` 추가). 정적 웹 재빌드, 서빙 번들 반영 확인
- **다음 작업** (2026-10-21 사용자와 합의한 OCR 개선 순서)
  1. **OCR 채점 세트**: 사용자가 포장지 사진 10~15장 추가 예정(`storage/downloads/ocr-samples`, 과자·라면·냉동·유제품·두부/계란 등, 소비기한 날짜 면 포함) → Claude가 정답표 작성 → 사진별 상품명·중량·알레르기·소비기한 정확도를 자동 채점하는 스크립트. 이후 개선은 이 점수로 판단
  2. **소비기한 날짜 따로 찍기**: 실사진 4장 모두 "측면/후면 표기일까지"라 날짜가 다른 면에 있음 → 등록 화면에 날짜만 읽는 두 번째 사진 버튼
  3. **속도 5~6초 → 2초 안팎 목표**: Paddle 버전 고정으로 mkldnn 버그 회피 또는 ONNX 실행 엔진
  4. **상품명 한 글자 오류**: PP-OCRv5 korean 재시도(현재 버전 조합에서 한글 누락 버그)
  5. 기울어진·굽은 사진: 글자 줄 방향 보정 켜고 측정
  - 그 외: 휴대폰 미리보기(`phone:start`) 정식 모드 지원, 외부 배포(OCR 서버 자원 고려), 소셜 로그인·푸시 알림

## 6. 테스트·빌드 상태 (2026-10-25 재실행: test·build·mobile typecheck·E2E 전체)
| 명령 | 결과 |
|---|---|
| `npm test` (API Jest) | ✅ API 8 suites / 37 tests + 모바일 4 tests(`apps/mobile/src/lib/lib.test.ts`, node:test + tsx) 통과 (2026-10-25) |
| `scripts/e2e/09-neighbor-profile.ts` | ✅ 통과 (2026-10-25). 같은 날 01~06도 재실행 통과, 07(OCR 컨테이너 필요)은 이번엔 미실행 |
| `npm run e2e` (`scripts/e2e/01~07`, 앱의 `client.ts`로 정식 API 호출) | ✅ 7개 모두 통과 (2026-10-25): 두 계정 기본 흐름, 로그인 유지·닉네임, 프로필 통계, 후기·매너 온도, 무게·채팅 목록·칭찬, 빈 채팅방, 합성 라벨 OCR |
| `scripts/e2e/08-ocr-real-photos.ts` | ✅ 실사진 4장 알레르기 4/4 (2026-10-25). 사진은 Git 제외라 로컬에만 있음 |
| `npm run build` (API `tsc`) | ✅ 오류 없음 → `apps/api/dist/` |
| `npm run typecheck --workspace @neighbor-fridge/mobile` | ✅ 오류 없음 |
| `scripts/build-mobile-web.ps1` (Expo web export) | ✅ 2026-10-21 정식 모드로 재빌드 성공 → `apps/api/public/mobile/` |

- 모바일 단위 테스트는 없음
- 실행하지 않은 것: 실제 휴대폰(Expo Go)에서 정식 모드 테스트(`phone:start`는 로컬 모드), 앱 화면 자동 UI 테스트(브라우저 자동화로 사진 선택 창을 열 수 없음)
- E2E는 실행할 때마다 개발 DB에 테스트 계정·게시물을 만든다(정리 스크립트로 `storage/db/` 삭제 시 함께 사라짐)

## 7. 주요 남은 작업
- 정식 모드 남은 구멍 (2026-10-02 연동 후)
  - 사진 업로드가 정식 모드에서도 `/local/uploads`(인증 없음, 로컬 디스크) 사용 → 외부 배포 전 S3 호환 저장소 + 인증 업로드 필요
  - 탄소 절감은 무게를 입력한 게시물만 계산(추정치)
  - 게시물 좌표 = 등록 화면에서 "지금 위치로" 지정한 곳 또는 동네 좌표. 서버가 동네 10km 이내만 허용
  - 데모 진입(로그인 없이)은 정식 모드에서 조회만 가능
- 소셜 로그인 미구현 (이메일만)
- 정식 미디어 저장소(S3 호환) 미연동, 로컬 업로드만 존재
- 푸시 알림(FCM)·만료 임박 알림 미구현
- `apps/worker`, `packages/*` 비어 있음
- Redis Pub/Sub 미사용 (문서상 계획). 채팅 이벤트는 단일 프로세스 메모리 전달
- 모바일 테스트: 순수 로직(`src/lib`)만. 화면 컴포넌트 테스트는 없음
- 거래 약속: 정식 모드는 제안→수락/거절(2026-10-25). 로컬 모드는 예전처럼 바로 확정. 약속 시간 전 알림(푸시)은 없음
- 사진 자동 작성: PaddleOCR로 교체(2026-10-21, 5절). 남은 것 — 더 많은 실사진으로 규칙 보강, 상품명 한 글자 오인식, 속도(5~6초, mkldnn 버그로 CPU 가속 꺼짐), 알레르기 구조화 저장(지금은 설명 텍스트), 외부 배포 시 OCR 서버 자원(이미지 2.3GB·메모리 약 0.4GB 이상) 고려. 유료 AI API는 사용자 결정으로 사용 안 함
- 후기 알림: 앱 안 배지만 있음(실시간·푸시 없음)
- 외부 배포 미진행: **앱 기능 구현 완료 후 시작하기로 결정(2026-10-02)**. 계획: 클라우드 Postgres(Neon/Supabase) → API 배포(Render/Railway/Fly.io) → 사진 저장소 분리(R2/Supabase Storage) → 모바일 API 주소 변경

## 8. 알려진 문제·주의사항
- **마이그레이션**: `compose.yaml`은 `infra/database/init`만 마운트 → `migrations/*`는 자동 적용되지 않음. 새 DB는 `001`에 002~010 내용이 이미 포함됨. 기존 DB에는 `npm run db:migrate`로 적용(현재 개발 DB는 010까지 기록됨). 새 DB는 처음 실행 때 001에 이미 들어간 마이그레이션도 다시 돌므로 **마이그레이션은 `IF NOT EXISTS` 등으로 재실행해도 안전하게 작성**하고, 새 마이그레이션 내용은 `init/001`에도 추가. API 시작 시 자동 실행은 하지 않음(배포 시 배포 전 단계에서 실행)
- **`LOCAL_UPLOAD_PATH`**: `main.ts`가 `join(cwd, 값)`으로 처리해 절대경로를 넣으면 기동 실패. 상대경로만 사용
- **로컬 저장 모드 한계**: `LocalPost`는 항상 `isMine: true`(작성자 소유권 없음), 거리·D-Day를 문자열로 저장. 개발 전용이며 운영에서는 끈다
- **`DatabaseModule`**: `DATABASE_URL` 미설정 시 기동 실패(`getOrThrow`). 로컬 모드에서도 값 필요
- **CORS**: 로컬 모드 또는 `NODE_ENV=development`에서 localhost·`192.168.*` 출처 허용
- **JSON body 25MB**: base64 이미지 업로드 때문
- **비밀값**: `scripts/start-phone-preview.ps1`에 로컬 개발용 `JWT_SECRET`·DB 접속값이 하드코딩됨. 운영 값으로 사용 금지, 분리 검토 필요
- **`.env`**: 루트에 있음(Git 제외, 2026-10-20 생성, `OCR_URL` 포함). 새 PC에서는 `.env.example`을 복사해 채움
- **로컬 잔여물**: `storage/runtime/`(api.pid·로그·Expo 홈), `storage/uploads/` 이미지 3개, `storage/db/` SQLite. `api.pid`가 가리키는 프로세스가 실행 중인지는 미확인 → 필요 시 `npm run phone:stop`
- 일부 커밋 author가 `CodexSandboxOffline`(Codex 환경)으로 기록됨

## 9. 실행 방법
```powershell
npm install

# A) 정식 모드 (Docker 필요 — Docker Desktop을 먼저 실행)
copy .env.example .env      # 값 채우기 (비밀값은 Git에 올리지 않음)
docker compose up -d        # DB·Redis·사진 OCR 서버(첫 빌드 몇 분)
npm run start:api           # 빌드 후 실행, http://localhost:3000/api
npm run start:web           # Expo Web

# B) Docker 없이 휴대폰 테스트 (로컬 SQLite 모드)
npm run phone:check
npm run phone:start         # Expo Go로 QR 스캔
npm run phone:stop          # 종료 시

# C) 정적 웹 미리보기
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-mobile-web.ps1   # 기본 정식 모드, 로컬 모드는 -LocalStore
# API 실행 후 http://localhost:3000/mobile/

# 검증
npm test
npm run build
npm run typecheck --workspace @neighbor-fridge/mobile
npm run e2e                 # API·Docker 켠 상태

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
- 프로젝트 밖 설치물(Docker Desktop, WSL, 가상 머신 플랫폼 기능, Docker 데이터 폴더, docker-desktop WSL 배포판, 이미지/컨테이너, 2026-10-21 PaddleOCR 시험 이미지)은 `EXTERNAL_RESOURCES.json`에 기록됨(2026-10-20 실제 설치 기준 보완). 제거 순서는 같은 파일의 `uninstallOrder`. Desktop·WSL·가상화 기능 제거는 사용자 확인 후
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
