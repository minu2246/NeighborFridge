# 실제 휴대폰 테스트

## 준비

1. PC와 휴대폰을 같은 Wi-Fi에 연결합니다.
2. 휴대폰에 **Expo Go**를 설치합니다.
3. 저장소 루트에서 `npm run phone:check`를 실행해 연결 주소를 확인합니다.
4. `npm run phone:start`를 실행합니다.
5. Android는 Expo Go의 QR 스캐너로, iPhone은 기본 카메라로 표시된 QR을 스캔합니다.

앱에서 위치 권한 요청이 나타나면 테스트 목적에 맞게 직접 허용하거나 거부합니다. 거부해도 동네 직접 입력 흐름을 확인할 수 있습니다.

## 연결되지 않을 때

- PC와 휴대폰이 동일한 Wi-Fi인지 확인합니다.
- Windows가 Node.js 네트워크 접근을 묻는 경우 **개인 네트워크**만 허용합니다.
- 회사·공용 Wi-Fi는 기기 간 통신을 차단할 수 있으므로 개인 Wi-Fi 또는 휴대폰 핫스팟을 사용합니다.
- 자동으로 잡힌 PC 주소가 틀리면 `powershell -File .\scripts\start-phone-preview.ps1 -ComputerIp 192.168.x.x`처럼 직접 지정합니다.

## 종료와 파일 관리

테스트가 끝나면 Expo 실행 창에서 `Ctrl+C`를 누른 후 `npm run phone:stop`을 실행합니다. 실행 기록과 로그는 모두 `storage/runtime`에 있으며 프로젝트 정리 도구의 삭제 대상입니다. Expo Go는 휴대폰 앱이므로 프로젝트 종료 시 휴대폰에서 별도로 제거할 수 있습니다.
