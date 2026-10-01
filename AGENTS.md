# AGENTS.md — NeighborFridge

Codex 등 AI 에이전트용 작업 규칙입니다. 프로젝트 상세 정보는 `HANDOFF.md`를 참고합니다.

## 작업 시작
- `HANDOFF.md`를 먼저 읽는다.
- `git status`와 현재 브랜치(`git branch --show-current`)를 확인한다.
- `HANDOFF.md`와 실제 코드/Git 상태가 다르면 실제 코드/Git을 우선한다.

## 탐색
- 프로젝트 전체를 무작정 탐색하지 않고, 파일명·함수명·오류 메시지로 검색한 뒤 필요한 파일만 확인한다.
- 캐시, 의존성, 빌드 결과물은 필요한 경우가 아니면 읽지 않는다.
  - `node_modules/`, `storage/cache/`, `storage/runtime/`, `storage/db/`, `storage/uploads/`, `apps/api/dist/`, `apps/api/public/mobile/`, `.expo/`, `package-lock.json`

## 수정
- 요청한 문제에 필요한 최소한만 수정한다.
- 요청하지 않은 리팩토링을 하지 않는다.
- 기존 코드 스타일과 구조를 따른다.
- 비밀번호, API 키, 토큰 등 민감정보를 파일이나 Git에 기록하지 않는다.

## 테스트·빌드 (저장소 루트에서 실행)
| 목적 | 명령 |
|---|---|
| API 단위 테스트 (Jest) | `npm test` |
| API 빌드 (`tsc`) | `npm run build` |
| 모바일 타입체크 | `npm run typecheck --workspace @neighbor-fridge/mobile` |
| 모바일 웹 정적 빌드 | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-mobile-web.ps1` |

- 수정 범위에 맞는 가장 작은 범위부터 실행한다. (API 변경 → `npm test`/`npm run build`, 모바일 변경 → typecheck)
- PostgreSQL/PostGIS가 필요한 정식 API 실행은 Docker(`docker compose up -d`)와 `.env`가 필요하다.

## Git
- 사용자 요청 없이 commit/push하지 않는다.

## 삭제
- 프로젝트 원본, 데이터, 설정 파일을 임의로 삭제하지 않는다.
- 삭제가 필요하면 삭제 후보를 먼저 사용자에게 보여주고, 승인 후 수행한다.
  - 정리 도구: `scripts/cleanup-project.ps1`(목록만 출력) → 승인 후 `-Execute`

## 작업 종료
- `HANDOFF.md`에 변경 파일, 수행 내용, 테스트 결과, 남은 작업을 갱신한다.
- 완료하지 않은 작업을 완료했다고 기록하지 않는다.

## 커뮤니케이션
- 사용자에게는 한국어로 간결하게 답한다. 코드·명령어·오류 원문은 영어를 유지한다.
