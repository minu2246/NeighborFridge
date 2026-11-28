# 프로젝트 구조

```text
NeighborFridge/
├─ apps/
│  ├─ mobile/       # React Native 앱
│  ├─ api/          # NestJS HTTP/WebSocket API
│  └─ worker/       # 만료·알림 작업
├─ packages/
│  ├─ shared-types/
│  └─ validation/
├─ docs/
│  └─ architecture.md
├─ infra/
│  └─ database/
├─ scripts/
├─ storage/         # 로컬 생성 파일; 내용은 Git에서 제외
├─ .env.example
├─ .gitignore
└─ README.md
```

프로젝트 관련 파일은 예외 없이 이 저장소 루트 아래에 둡니다. 운영 비밀정보는 저장소가 아닌 배포 환경의 비밀 저장소에서 관리합니다.
