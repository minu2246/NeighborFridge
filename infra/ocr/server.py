"""포장지 사진 → 글자 줄 목록. POST /ocr (본문: 이미지 바이트) → {"lines": [...]}, GET /health.

해석(상품명·소비기한·알레르기)은 API 서버(apps/api/src/modules/ocr/label-parser.ts)가 한다.
2026-10-21 실사진 4장 시험 기준 설정:
- 인식 모델 korean_PP-OCRv3: PP-OCRv5 korean은 이 버전 조합에서 한글이 빠지는 문제가 있었음
- 검출 모델 mobile_det + enable_mkldnn=False: server_det은 메모리 부족, mkldnn은 Paddle 3.x CPU 버그
"""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer

import cv2
import numpy as np
from paddleocr import PaddleOCR

MAX_SIDE = 2400  # 휴대폰 원본(4000px 이상)은 줄여서 처리: 속도·메모리
ocr = PaddleOCR(
    text_recognition_model_name='korean_PP-OCRv3_mobile_rec',
    text_detection_model_name='PP-OCRv5_mobile_det',
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
    enable_mkldnn=False,
    cpu_threads=4,
    text_det_limit_side_len=1600,
    text_det_limit_type='max',
)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.reply(200, {'status': 'ok'} if self.path == '/health' else {'error': 'not found'})

    def do_POST(self):
        if self.path != '/ocr':
            return self.reply(404, {'error': 'not found'})
        length = int(self.headers.get('Content-Length', 0))
        if not 0 < length <= 15 * 1024 * 1024:
            return self.reply(400, {'error': 'image size must be 1B-15MB'})
        image = cv2.imdecode(np.frombuffer(self.rfile.read(length), np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            return self.reply(400, {'error': 'cannot decode image'})
        scale = MAX_SIDE / max(image.shape[:2])
        if scale < 1:
            image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        lines = [line for page in ocr.predict(image) for line in page['rec_texts']]
        self.reply(200, {'lines': lines})

    def reply(self, status, body):
        data = json.dumps(body, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)


# ponytail: 단일 스레드 서버 → 요청을 하나씩 처리(Paddle 예측기는 스레드 안전하지 않음). 동시 사용자가 많아지면 워커 프로세스를 늘린다.
HTTPServer(('0.0.0.0', 8866), Handler).serve_forever()
