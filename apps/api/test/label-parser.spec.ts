import { parseLabel } from '../src/modules/ocr/label-parser';

describe('parseLabel', () => {
  it('reads a typical Korean food label', () => {
    const text = [
      '제품명: 국산콩 두부',
      '식품유형 두부',
      '내용량 300g',
      '원재료명 대두(국산) 98%, 정제수, 응고제',
      '제조일자 2026.10.18',
      '소비기한 2026.10.30까지',
      '알레르기 유발물질: 대두 함유',
      '나트륨 10mg 당류 1g',
    ].join('\n');
    expect(parseLabel(text)).toEqual({
      itemName: '국산콩 두부', expiryDate: '2026-10-30', weightText: '300g', weightGrams: 300,
      allergens: ['대두'], allergenLabelFound: true,
    });
  });

  it('skips manufacture dates and reads dates on the line after the label', () => {
    expect(parseLabel('제조일 26.10.01\n소비기한\n26.11.15').expiryDate).toBe('2026-11-15');
    expect(parseLabel('EXP 20270105').expiryDate).toBe('2027-01-05');
    expect(parseLabel('2026년 12월 3일 까지').expiryDate).toBe('2026-12-03');
  });

  it('falls back to the latest date when no keyword exists, and drops impossible dates', () => {
    expect(parseLabel('2026.10.01\n2026.10.20').expiryDate).toBe('2026-10-20');
    expect(parseLabel('2026.13.40').expiryDate).toBeUndefined();
    expect(parseLabel('2026.02.30').expiryDate).toBeUndefined();
  });

  it('reads the net-weight line only and handles kg/L/thousands', () => {
    expect(parseLabel('1회 제공량 30g\n총 내용량 500g').weightGrams).toBe(500);
    expect(parseLabel('1회 제공량 30g\n탄수화물 79g').weightText).toBeUndefined(); // 내용량 줄이 없으면 추측하지 않음
    expect(parseLabel('당류 12g\n내용량 200g').weightText).toBe('200g');
    expect(parseLabel('중량 1.2kg').weightGrams).toBe(1200);
    expect(parseLabel('용량 1L').weightText).toBe('1L');
    expect(parseLabel('내용량 1,000g').weightGrams).toBe(1000);
    expect(parseLabel('나트륨 400mg').weightText).toBeUndefined();
  });

  it('corrects the common OCR g→9 confusion only on net-weight lines without a unit', () => {
    expect(parseLabel('내용량 3009').weightText).toBe('300g'); // 실제 tesseract 결과
    expect(parseLabel('중량 1.5k9').weightGrams).toBe(1500);
    expect(parseLabel('내용량 300g 3009').weightText).toBe('300g'); // 단위가 이미 있으면 손대지 않음
    expect(parseLabel('제품번호 3009').weightText).toBeUndefined(); // 내용량 줄이 아니면 보정 안 함
  });

  it('maps label words to official allergen names without substring false positives', () => {
    const result = parseLabel('알레르기 유발물질: 계란, 우유, 밀, 새우 함유\n밀봉하여 맛있게 드세요');
    expect(result.allergens).toEqual(['알류', '우유', '밀', '새우']);
    expect(result.allergenLabelFound).toBe(true);
    // "밀봉", "맛있게"는 밀·게가 아님, "땅콩"은 콩(대두)이 아님
    expect(parseLabel('땅콩 함유 밀봉 맛있게').allergens).toEqual(['땅콩']);
    // 조사 제거: "계란과", "대두를"은 인식, "하게"·"가게"는 여전히 아님
    expect(parseLabel('알레르기: 계란과 대두를 함유 가게 하게').allergens).toEqual(['알류', '대두']);
  });

  it('ignores cross-contamination notices (실제 포장지 사진 사례)', () => {
    // 쵸코하임: 함유 줄 다음에 "혼입가능" 줄
    expect(parseLabel('밀,대두,우유 함유\n·땅콩,계란,돼지고기,쇠고기 혼입가능').allergens).toEqual(['우유', '대두', '밀']);
    // 치킨너겟: "같은 제조시설" 안내만 있고 함유 줄은 OCR이 놓친 경우 → 추측하지 않음
    const missed = parseLabel('이 제품은 땅콩, 토마토, 게, 메추리알, 새우, 메밀, 고등어를 사용한 제품과 같은 제조시설에서 제조하고 있습니다.');
    expect(missed).toEqual({ allergens: [], allergenLabelFound: false });
    // 함유 줄과 교차오염 줄이 함께 있으면 함유 줄만
    expect(parseLabel('닭고기, 우유, 대두, 밀, 쇠고기, 난류 함유\n이 제품은 땅콩, 새우를 사용한 제품과 같은 제조시설에서 제조').allergens)
      .toEqual(['알류', '우유', '대두', '밀', '닭고기', '쇠고기']);
  });

  it('reads real-photo OCR output (PaddleOCR): no spaces, table cells on separate lines', () => {
    // 쵸코하임 실사진: 표의 칸이 한 줄씩, g→9, 쵸→효 오인식
    const choco = parseLabel('제품명\n효코하임\n내용량\n1429\n소비기한\n측면표기일까지\n밀대두우유함유\n땅콩계란돼지고기쇠고기혼입가능');
    expect(choco).toEqual({ itemName: '효코하임', weightText: '142g', weightGrams: 142, allergens: ['우유', '대두', '밀'], allergenLabelFound: true });
    // 치킨너겟 실사진: 제품명이 같은 줄, 내용량 다음에 "-" 줄, 1kg → 1k9
    const nugget = parseLabel('제품명사파리에간공룡치킨너겠\n내용량\n-\n1k9\n닭고기우유대두밀쇠고기난류함유\n총내용량1%9[1009당245ka');
    expect(nugget.itemName).toBe('사파리에간공룡치킨너겠');
    expect(nugget.weightText).toBe('1kg');
    expect(nugget.allergens).toEqual(['알류', '우유', '대두', '밀', '닭고기', '쇠고기']);
    // 신라면·핫도그 실사진: 계란 → 계라(받침 누락)
    expect(parseLabel('제품명\n신라면\n밀대두돼지고기계라쇠고기함유').allergens).toEqual(['알류', '대두', '밀', '돼지고기', '쇠고기']);
    expect(parseLabel('제품명\n신라면').itemName).toBe('신라면');
    expect(parseLabel('계라우유대두밀돼지고기쇠고기함유').allergens).toEqual(['알류', '우유', '대두', '밀', '돼지고기', '쇠고기']);
    // 압축 사진의 핫도그: 돼지고기 → 대지고기(한 글자 오인식), 그 앞의 '밀'도 함께 인정
    expect(parseLabel('계라우유대두밀대지고기쇠고기함유').allergens).toEqual(['알류', '우유', '대두', '밀', '돼지고기', '쇠고기']);
    // 압축 사진에서 "1 kg"을 "19"로 읽은 사례: 1g으로 채우지 않고 비움, "100g당"도 내용량으로 보지 않음
    expect(parseLabel('내용량\n19\n총내용량1%9[1009당245ka').weightText).toBeUndefined();
    expect(parseLabel('총 내용량 142 g\n100 g당 538 kcal').weightText).toBe('142g');
    // 다음 줄이 다른 항목 이름이면 상품명으로 쓰지 않음
    expect(parseLabel('제품명\n내용량\n300g').itemName).toBeUndefined();
  });

  it('reports unknown allergen status instead of guessing when no allergen label is found', () => {
    expect(parseLabel('원재료명 밀가루, 설탕, 버터')).toEqual({ allergens: [], allergenLabelFound: false });
    expect(parseLabel('')).toEqual({ allergens: [], allergenLabelFound: false });
  });
});
