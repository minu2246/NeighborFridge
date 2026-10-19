import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createWorker, Worker } from 'tesseract.js';
import { LabelInfo, parseLabel } from './label-parser';

// 무료 오픈소스 OCR(tesseract.js, 한국어+영어). 언어 데이터는 첫 실행 때 내려받아 storage/cache/tesseract에 보관.
// ponytail: 워커 1개를 재사용해 요청을 순서대로 처리. 동시 요청이 많아지면 tesseract.js createScheduler로 워커를 늘린다.
@Injectable()
export class OcrService implements OnModuleDestroy {
  private worker: Promise<Worker> | null = null;

  async readLabel(image: Buffer): Promise<LabelInfo & { text: string }> {
    const { data } = await (await this.getWorker()).recognize(image);
    return { ...parseLabel(data.text), text: data.text };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) await (await this.worker).terminate();
  }

  private getWorker(): Promise<Worker> {
    if (!this.worker) {
      const cachePath = resolve('storage/cache/tesseract');
      mkdirSync(cachePath, { recursive: true });
      this.worker = createWorker(['kor', 'eng'], 1, { cachePath });
      this.worker.catch(() => { this.worker = null; }); // 언어 데이터 다운로드 실패 시 다음 요청에서 재시도
    }
    return this.worker;
  }
}
