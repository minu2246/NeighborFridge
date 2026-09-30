import { Controller, Get, Header } from '@nestjs/common';

@Controller()
export class DeveloperController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  index(): string {
    return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>이웃냉장고 API</title><style>
body{font-family:system-ui,sans-serif;max-width:760px;margin:48px auto;padding:0 20px;color:#18352b;background:#f7fbf8}
h1{color:#19734b}.card{background:white;border:1px solid #dce9e1;border-radius:14px;padding:20px;margin:16px 0}
code{background:#edf6f0;padding:3px 7px;border-radius:6px}li{margin:9px 0}.ok{color:#19734b;font-weight:700}
</style></head><body><h1>🥬 이웃냉장고</h1><p class="ok">API 서버가 실행 중입니다.</p>
<div class="card"><h2>현재 구현</h2><ul>
<li>이메일 회원가입·로그인과 JWT 인증</li><li>사용자 GPS 위치 설정</li>
<li>게시물 등록·주변 검색·상세·수정·삭제</li><li>예약·완료·만료 상태 관리</li>
<li>1:1 채팅방·메시지·실시간 SSE 스트림</li></ul></div>
<div class="card"><h2>확인</h2><p><a href="./health">상태 JSON 열기</a></p>
<p>모바일 화면은 다음 프론트엔드 단계에서 연결합니다.</p></div></body></html>`;
  }
}
