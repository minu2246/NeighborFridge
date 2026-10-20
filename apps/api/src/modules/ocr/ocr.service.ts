import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LabelInfo, parseLabel } from './label-parser';

// 글자 인식은 compose의 ocr 서비스(PaddleOCR, infra/ocr)가 하고, 여기서는 결과를 규칙으로 해석한다.
// tesseract.js는 실사진 4장 중 0장 인식으로 2026-10-21 교체.
@Injectable()
export class OcrService {
  private readonly url: string;

  constructor(config: ConfigService) {
    this.url = config.get<string>('OCR_URL', 'http://localhost:8866');
  }

  async readLabel(image: Buffer): Promise<LabelInfo & { text: string }> {
    let lines: string[];
    try {
      const response = await fetch(`${this.url}/ocr`, { method: 'POST', body: new Uint8Array(image), signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`OCR ${response.status}`);
      ({ lines } = (await response.json()) as { lines: string[] });
    } catch {
      throw new ServiceUnavailableException('사진 인식 서버에 연결하지 못했어요. 잠시 후 다시 시도하거나 직접 입력해 주세요.');
    }
    const text = lines.join('\n');
    return { ...parseLabel(text), text };
  }
}
