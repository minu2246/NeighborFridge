import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LabelInfo } from './label-parser';
import { OcrService } from './ocr.service';

class ReadLabelDto {
  @IsString() base64!: string;
  @IsIn(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']) mimeType!: string;
}

@Controller('ocr')
@UseGuards(JwtAuthGuard)
export class OcrController {
  constructor(private readonly ocr: OcrService) {}

  // 포장지 사진 → 상품명·소비기한·중량·알레르기 후보. 저장하지 않고 결과만 돌려준다.
  @Post('label')
  @HttpCode(HttpStatus.OK)
  async readLabel(@Body() input: ReadLabelDto): Promise<LabelInfo> {
    const clean = input.base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) throw new BadRequestException('사진 데이터를 읽을 수 없습니다.');
    const image = Buffer.from(clean, 'base64');
    if (!image.length || image.length > 15 * 1024 * 1024) throw new BadRequestException('사진은 15MB 이하만 분석할 수 있습니다.');
    const { text: _text, ...info } = await this.ocr.readLabel(image);
    return info;
  }
}
