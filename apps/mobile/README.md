# Mobile

Expo SDK 57 기반 React Native 앱입니다. iOS, Android, Web에서 같은 화면 코드를 사용합니다.

## 확인

루트에서 `npm run start:web`을 실행하면 Expo 개발 화면이 열립니다. 실행 포트가 제한된 환경에서는 다음 명령으로 정적 미리보기를 만듭니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-mobile-web.ps1
```

API 서버가 실행 중이면 `http://localhost:3000/mobile/`에서 확인할 수 있습니다. PostgreSQL이 준비되지 않은 경우 앱은 데모 데이터를 표시합니다.

정적 미리보기 빌드는 로컬 저장 API를 사용하도록 설정됩니다. 등록한 데이터는 프로젝트 내부 `storage/db`에 남으므로 새로고침 후에도 다시 불러올 수 있습니다.
