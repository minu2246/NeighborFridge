# 🥬 NeighborFridge (이웃냉장고)

> 냉장고 속 남는 식재료를 가까운 이웃과 나누는 위치 기반 C2C 나눔·교환 앱

유통기한이 얼마 남지 않은 식재료나 만들고 남은 음식을 버리지 않고 같은 동네 이웃과 **나눔 · 교환 · 한끼 나눔**으로 주고받을 수 있게 합니다.

<br>

## 📌 개발 배경

- 1인 가구가 늘면서 **대용량 식재료를 다 쓰지 못하고 버리는 일**이 잦아졌습니다.
- 버리기 아까운 식재료가 있어도 **주변에 필요한 사람을 찾을 마땅한 방법이 없습니다.**
- 기존 중고거래 앱은 유통기한이 짧은 식품에 맞춰져 있지 않습니다. 소비기한이 언제인지, 언제 마감되는지, 가까운 곳에서 빨리 만날 수 있는지가 잘 드러나지 않습니다.

## 🎯 개발 목적

| 목적 | 설명 |
|---|---|
| **음식물 폐기 감소** | 버려질 식재료가 필요한 이웃에게 소비기한 안에 전달되도록 돕습니다 |
| **지역 나눔 활성화** | 같은 동네 이웃끼리 부담 없이 주고받는 문화를 만듭니다 |
| **안전한 거래** | 정확한 집 주소 대신 거리와 공공장소 약속만 공유합니다 |

## 🚀 목표

### 1단계 · MVP
1. 이메일·소셜 로그인과 GPS 기반 동네 인증
2. 사진·상품명·소비기한·거래 유형·거래 장소를 담은 게시물 등록
3. 주변 게시물을 **거리순 / 소비기한(D-Day)순**으로 조회
4. 소비기한이 지난 게시물 자동 비활성화
5. 게시물 단위 1:1 채팅과 거래 약속(시간·장소)

### 2단계 · 확장
- 📷 **사진 기반 자동 작성**: 포장 사진에서 소비기한·품목 정보·알레르기 유발 성분을 추출해 게시물을 자동으로 채움 (사용자가 확인한 뒤 등록) — 1차 구현 완료, 인식률 개선 중
- 🌱 탄소 절감량 기록, 매너 온도 — 구현 (탄소 절감은 무게를 입력한 게시물 기준 추정치). 절약 금액은 예정
- 🔔 알림 — 앱 안 배지(채팅·약속 제안·후기) 구현. 소비기한 임박·채팅 **푸시** 알림은 예정
- 🍳 동네에 올라온 식재료를 조합한 레시피 추천 — 예정

<br>

## ✨ 주요 기능과 진행 현황

| 기능 | 상태 |
|---|---|
| 이메일 회원가입·로그인 (JWT), 로그인 유지 | ✅ 구현 |
| 소셜 로그인 | ⬜ 예정 |
| GPS 동네 인증 / 직접 입력, 검색 반경(1·3·5km) | ✅ 구현 |
| 게시물 등록 (사진, 소비기한 달력, 거래 유형, 무게, "지금 위치로" 거래 위치 지정) | ✅ 구현 |
| 주변 게시물 조회 (PostGIS 거리 검색, 거리순·D-Day순, 유형 필터) | ✅ 구현 |
| 거래 상태 변경 (예약중 · 거래 완료), 내 게시물 보기 | ✅ 구현 |
| 소비기한 경과 게시물 자동 만료 | ✅ 구현 |
| 찜 · 관심 목록 | ✅ 구현 |
| 게시물별 1:1 채팅 (안 읽은 수 표시) | ✅ 구현 (앱은 5초 간격으로 새 메시지 확인) |
| 거래 약속: 한쪽이 시간·장소 제안 → 상대가 수락/거절 | ✅ 구현 |
| 포장지 사진으로 상품명·소비기한·중량·알레르기 자동 입력 (무료 OCR PaddleOCR, 사용자 확인 후 등록) | ✅ 구현 |
| 거래 후기·칭찬 항목과 매너 온도, 프로필 통계, 탄소 절감 추정 | ✅ 구현 |
| 다른 이웃 프로필 보기 (매너 온도·받은 칭찬·후기) | ✅ 구현 |
| 앱 안 알림 배지 (안 읽은 채팅·약속 제안·남길 후기·새 후기) | ✅ 구현 (30초마다 갱신) |
| 계정 설정: 닉네임·이메일·비밀번호 변경, 후기 알림 끄기, 회원 탈퇴(데이터 완전 삭제) | ✅ 구현 |
| 푸시 알림 | ⬜ 예정 |
| 외부 배포 | 🔧 준비 중 (사진 저장소 분리·업로드 인증 정리 후 진행) |

<br>

## 🛠 기술 스택

| 영역 | 기술 |
|---|---|
| **Mobile** | Expo SDK 57 · React Native 0.86 · React 19 · TypeScript (iOS · Android · Web) |
| **API** | NestJS 11 · class-validator · 자체 JWT 인증 |
| **Database** | PostgreSQL 17 + PostGIS (`GEOGRAPHY` + GiST 인덱스, `ST_DWithin`) |
| **사진 인식** | PaddleOCR (무료 오픈소스, 별도 컨테이너) + 규칙 기반 라벨 해석 |
| **실시간** | 앱은 폴링(채팅 5초, 배지 30초). API에 SSE 엔드포인트 있음, WebSocket + Redis Pub/Sub로 확장 예정 |
| **테스트** | Jest(API 단위), `node:test`(모바일 로직), 앱 API 클라이언트로 실제 서버를 호출하는 E2E 스크립트 15개 |
| **로컬 개발** | Docker Compose (PostGIS, Redis, OCR), Docker 없이 쓸 수 있는 `node:sqlite` 로컬 저장 모드 |
| **예정** | S3 호환 사진 저장소(Cloudflare R2), Firebase Cloud Messaging |

<br>

## 📂 프로젝트 구조

```
NeighborFridge/
├── apps/
│   ├── mobile/      # Expo 앱 (화면, API 클라이언트)
│   ├── api/         # NestJS API (auth · users · posts · chat · ocr · local-store)
│   └── worker/      # 만료·알림 배치 (예정)
├── packages/        # 공유 타입·검증 규칙 (예정)
├── infra/
│   ├── database/    # 스키마(init)와 마이그레이션
│   └── ocr/         # PaddleOCR 서버
├── scripts/         # DB 마이그레이션, E2E, 휴대폰 미리보기, 웹 빌드, 용량 점검·정리
├── docs/            # 아키텍처, 휴대폰 테스트 안내
└── storage/         # 로컬 DB·업로드·캐시 (Git 제외)
```

<br>

## ▶️ 실행 방법

> Node.js 22 이상이 필요합니다.

```powershell
npm install
```

**A. 정식 모드** (Docker 필요)
```powershell
copy .env.example .env      # 값을 채워 넣기 (비밀값은 Git에 올리지 않음)
docker compose up -d        # PostgreSQL/PostGIS, Redis, 사진 OCR 서버(첫 실행 시 빌드 몇 분, 약 2.3GB)
npm run db:migrate          # 새 DB 마이그레이션 적용 (적용된 것은 건너뜀)
npm run start:api           # http://localhost:3000/api
npm run start:web           # 브라우저에서 앱 확인
```

**B. 휴대폰으로 바로 테스트** (Docker 없이, 로컬 SQLite 모드)
```powershell
npm run phone:check
npm run phone:start         # Expo Go로 QR 코드 스캔
npm run phone:stop          # 테스트를 마친 뒤 종료
```
PC와 휴대폰이 같은 Wi-Fi에 연결되어 있어야 합니다. 자세한 내용은 [휴대폰 테스트 안내](docs/MOBILE_TEST.md)를 참고하세요.

**검증**
```powershell
npm test                                          # API + 모바일 단위 테스트
npm run build                                     # API 빌드
npm run typecheck --workspace @neighbor-fridge/mobile
npm run e2e                                       # 정식 모드 E2E 14개 (Docker·API 실행 중일 때)
npx tsx scripts/e2e/08-ocr-real-photos.ts         # 실사진 OCR (로컬 사진 필요, Git 제외)
```

<br>

## 📚 문서

| 문서 | 내용 |
|---|---|
| [PROJECT_BRIEF.md](PROJECT_BRIEF.md) | 목적과 MVP 범위 |
| [docs/architecture.md](docs/architecture.md) | MVP 아키텍처 |
| [apps/api/README.md](apps/api/README.md) | API 엔드포인트 |
| [apps/mobile/README.md](apps/mobile/README.md) | 모바일 실행 방법 |
