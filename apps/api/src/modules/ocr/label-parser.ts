// 포장지 OCR 텍스트 → 등록 폼 자동 입력값. 규칙 기반이라 결과는 항상 사용자가 확인한다.
// ponytail: 키워드·정규식 규칙. 인식률이 부족하면 이 함수만 AI 호출로 바꾸면 된다(입출력 형태 유지).

export interface LabelInfo {
  itemName?: string;
  expiryDate?: string; // YYYY-MM-DD
  weightText?: string; // 예: "500g"
  weightGrams?: number; // ml·L는 1ml≈1g로 근사
  allergens: string[]; // 식약처 알레르기 유발물질 표시 대상 기준 이름
  allergenLabelFound: boolean; // 포장지의 알레르기 표시 문구를 찾았는지. false면 "없음"이 아니라 "확인 불가"
}

// 식약처 알레르기 유발물질 표시 대상 → 포장지에 쓰이는 표현
const ALLERGENS: Record<string, string[]> = {
  알류: ['알류', '난류', '계란', '달걀', '난백', '난황', '가금류'],
  우유: ['우유', '유청', '분유', '탈지분유', '전지분유', '연유', '버터', '치즈'],
  메밀: ['메밀'],
  땅콩: ['땅콩'],
  대두: ['대두', '콩', '두유', '대두유'],
  밀: ['밀', '밀가루', '소맥', '소맥분', '글루텐'],
  고등어: ['고등어'],
  게: ['게'],
  새우: ['새우'],
  돼지고기: ['돼지고기', '돼지', '돈육'],
  복숭아: ['복숭아'],
  토마토: ['토마토'],
  아황산류: ['아황산류', '아황산', '이산화황'],
  호두: ['호두'],
  닭고기: ['닭고기', '닭', '계육'],
  쇠고기: ['쇠고기', '소고기', '우육'],
  오징어: ['오징어'],
  조개류: ['조개류', '조개', '굴', '전복', '홍합'],
  잣: ['잣'],
};
const SYNONYM_TO_ALLERGEN = new Map(Object.entries(ALLERGENS).flatMap(([name, words]) => words.map((word) => [word, name] as const)));

const EXPIRY_KEYWORD = /소비기한|유통기한|품질유지기한|까지|EXP/i;
const MANUFACTURE_KEYWORD = /제조/;
const ALLERGEN_KEYWORD = /알레르기|알러지|알레르겐|함유/;
const WEIGHT_KEYWORD = /내용량|중량|용량/;
const NAME_LINE = /^(?:제품명|품명|상품명)\s*[:：]?\s*(.+)$/;
// 2026.10.25 / 26-10-25 / 2026년 10월 25일 (OCR이 넣는 공백 허용)
const DATE = /(20\d{2}|\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})\s*일?/g;
const COMPACT_DATE = /(?<!\d)(20\d{2})(\d{2})(\d{2})(?!\d)/g; // 20261025 (키워드 있는 줄에서만)
const WEIGHT = /(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)(?![a-z])/gi;

export function parseLabel(text: string): LabelInfo {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return {
    itemName: findItemName(lines),
    expiryDate: findExpiryDate(lines),
    ...findWeight(lines),
    ...findAllergens(lines),
  };
}

function findItemName(lines: string[]): string | undefined {
  for (const line of lines) {
    const match = NAME_LINE.exec(line);
    if (match) return match[1].trim().slice(0, 50) || undefined;
  }
  return undefined;
}

function findExpiryDate(lines: string[]): string | undefined {
  const keyed: string[] = [];
  const others: string[] = [];
  lines.forEach((line, index) => {
    if (MANUFACTURE_KEYWORD.test(line) && !EXPIRY_KEYWORD.test(line)) return; // 제조일자 줄은 제외
    const dates = datesIn(line);
    // "소비기한" 라벨만 있는 줄 다음 줄에 날짜가 오는 경우도 키워드 날짜로 본다
    const previousIsLabel = index > 0 && EXPIRY_KEYWORD.test(lines[index - 1]) && datesIn(lines[index - 1]).length === 0;
    if (EXPIRY_KEYWORD.test(line) || previousIsLabel) {
      keyed.push(...dates, ...compactDatesIn(line));
    } else {
      others.push(...dates);
    }
  });
  if (keyed.length) return keyed[0];
  return others.sort().at(-1); // 키워드가 없으면 가장 늦은 날짜(제조일보다 소비기한이 늦음)
}

function datesIn(line: string): string[] {
  return [...line.matchAll(DATE)].flatMap((m) => toDate(m[1], m[2], m[3]));
}

function compactDatesIn(line: string): string[] {
  return [...line.matchAll(COMPACT_DATE)].flatMap((m) => toDate(m[1], m[2], m[3]));
}

function toDate(year: string, month: string, day: string): string[] {
  const y = year.length === 2 ? 2000 + Number(year) : Number(year);
  const m = Number(month);
  const d = Number(day);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (m < 1 || m > 12 || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return []; // 13월, 2월 30일 등 OCR 오인식 제거
  return [`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`];
}

function findWeight(lines: string[]): Pick<LabelInfo, 'weightText' | 'weightGrams'> {
  const candidates = lines.map(fixWeightOcr).flatMap((line) => [...line.matchAll(WEIGHT)].map((m) => {
    const number = m[1].replace(/,(\d{3})$/, '$1').replace(',', '.'); // 1,000 → 1000, 1,5 → 1.5
    const unit = m[2].toLowerCase();
    const grams = unit === 'kg' || unit === 'l' ? Number(number) * 1000 : Number(number);
    return { text: `${number}${unit === 'l' ? 'L' : unit}`, grams, keyed: WEIGHT_KEYWORD.test(line) };
  }));
  // 내용량 줄 우선, 없으면 가장 큰 값(영양성분 "당류 12g"보다 총 내용량이 큼)
  const best = candidates.find((c) => c.keyed) ?? candidates.sort((a, b) => b.grams - a.grams)[0];
  return best ? { weightText: best.text, weightGrams: best.grams } : {};
}

// OCR은 g를 9로 자주 읽는다("300g" → "3009"). 내용량 줄에 단위가 하나도 없을 때만 보정.
function fixWeightOcr(line: string): string {
  if (!WEIGHT_KEYWORD.test(line) || [...line.matchAll(WEIGHT)].length) return line;
  return line.replace(/(\d)\s*k9(?!\d)/i, '$1kg').replace(/(\d)9(?!\d)/, '$1g');
}

function findAllergens(lines: string[]): Pick<LabelInfo, 'allergens' | 'allergenLabelFound'> {
  const labelIndex = lines.findIndex((line) => ALLERGEN_KEYWORD.test(line));
  // 표시 문구가 있으면 그 줄과 다음 줄만, 없으면 전체(원재료명)에서 찾는다
  const region = labelIndex >= 0 ? lines.slice(labelIndex, labelIndex + 2) : lines;
  const found = new Set<string>();
  for (const token of region.join(' ').split(/[\s,·•/()[\]{}:;.|]+/)) {
    const word = token.replace(/(함유|포함|등)$/, '');
    // "대두를", "계란과"처럼 조사가 붙은 경우: 떼어낸 결과가 목록과 정확히 일치할 때만 인정
    const allergen = SYNONYM_TO_ALLERGEN.get(word) ?? SYNONYM_TO_ALLERGEN.get(word.replace(/(을|를|은|는|이|가|와|과|및)$/, ''));
    if (allergen) found.add(allergen);
  }
  return { allergens: Object.keys(ALLERGENS).filter((name) => found.has(name)), allergenLabelFound: labelIndex >= 0 };
}
