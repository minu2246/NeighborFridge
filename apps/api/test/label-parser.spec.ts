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

  it('prefers the net-weight line, else the largest amount, and handles kg/L/thousands', () => {
    expect(parseLabel('1회 제공량 30g\n총 500g').weightGrams).toBe(500);
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
    expect(parseLabel('밀봉 보관 맛있게 드세요 땅콩').allergens).toEqual(['땅콩']);
    // 조사 제거: "대두를", "계란과"는 인식, "하게"·"가게"는 여전히 아님
    expect(parseLabel('계란과 대두를 사용한 제품과 같은 시설 가게 하게').allergens).toEqual(['알류', '대두']);
  });

  it('reports unknown allergen status instead of "none" when no allergen label is found', () => {
    const result = parseLabel('원재료명 밀가루, 설탕, 버터');
    expect(result.allergenLabelFound).toBe(false);
    expect(result.allergens).toEqual(['우유', '밀']); // 원재료에서 찾은 후보는 제시하되 표시 확인 불가로 안내
    expect(parseLabel('')).toEqual({ allergens: [], allergenLabelFound: false });
  });
});
