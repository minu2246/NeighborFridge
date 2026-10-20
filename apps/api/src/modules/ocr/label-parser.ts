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
  알류: ['알류', '난류', '계란', '계라', '달걀', '난백', '난황', '가금류'], // 계라: OCR이 받침을 빠뜨린 경우
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
const SYNONYMS_LONGEST_FIRST = [...SYNONYM_TO_ALLERGEN.keys()].sort((a, b) => b.length - a.length);

const EXPIRY_KEYWORD = /소비기한|유통기한|품질유지기한|까지|EXP/i;
const MANUFACTURE_KEYWORD = /제조/;
const ALLERGEN_KEYWORD = /알레르기|알러지|알레르겐|함유/;
const WEIGHT_KEYWORD = /내용량|중량|용량/;
const CROSS_CONTAMINATION = /같은\s*(제조)?\s*시설|혼입|사용한\s*제품과/;
// 표 형태 포장지: "제품명: 두부" 또는 "제품명" 줄 다음 줄에 값. "제 품 명"처럼 띄어 쓴 경우도 허용
const NAME_LABEL = /^(?:제\s*품\s*명|품\s*명|상\s*품\s*명)\s*[:：]?\s*/;
const OTHER_LABEL = /^(?:내\s*용\s*량|식품\s*유형|식품의\s*유형|소비기한|원재료|포장재질|품목)/;
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
  for (let i = 0; i < lines.length; i++) {
    const match = NAME_LABEL.exec(lines[i]);
    if (!match) continue;
    const sameLine = lines[i].slice(match[0].length).trim();
    const value = sameLine || (lines[i + 1] && !OTHER_LABEL.test(lines[i + 1]) ? lines[i + 1].trim() : '');
    if (value) return value.slice(0, 50);
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
  // 표 형태: "내용량" 칸만 있는 줄 다음에 값이 오면 그 줄도 내용량 줄로 본다("-" 같은 1글자 줄은 건너뜀)
  const keyedAt = (index: number): boolean => {
    if (WEIGHT_KEYWORD.test(lines[index])) return true;
    for (let j = index - 1; j >= 0 && j >= index - 2; j--) {
      if (lines[j].length <= 1) continue;
      return WEIGHT_KEYWORD.test(lines[j]) && !/\d/.test(lines[j]);
    }
    return false;
  };
  const candidates = lines.flatMap((raw, index) => {
    const keyed = keyedAt(index);
    const line = keyed ? fixWeightOcr(raw) : raw;
    return [...line.matchAll(WEIGHT)]
      .filter((m) => line[m.index! + m[0].length] !== '당') // "100g당 245kcal"은 영양정보 기준량
      .map((m) => {
        const number = m[1].replace(/,(\d{3})$/, '$1').replace(',', '.'); // 1,000 → 1000, 1,5 → 1.5
        const unit = m[2].toLowerCase();
        const grams = unit === 'kg' || unit === 'l' ? Number(number) * 1000 : Number(number);
        return { text: `${number}${unit === 'l' ? 'L' : unit}`, grams, keyed };
      })
      // 10g 미만은 오인식으로 본다(실사진: "1 kg"을 "19"로 읽어 1g이 된 사례). 틀린 값보다 빈칸이 낫다
      .filter((c) => c.grams >= 10);
  });
  // 내용량·중량 줄에서 읽은 값만 쓴다. "가장 큰 값" 추측은 실사진에서 "탄수화물 79g"을 잡아 제거
  const best = candidates.find((c) => c.keyed);
  return best ? { weightText: best.text, weightGrams: best.grams } : {};
}

// OCR은 g를 9로 자주 읽는다("300g" → "3009", "1kg" → "1k9"). 내용량 줄에 단위가 하나도 없을 때만 보정.
function fixWeightOcr(line: string): string {
  if ([...line.matchAll(WEIGHT)].length) return line;
  return line.replace(/(\d)\s*k9(?!\d)/i, '$1kg').replace(/(\d)9(?!\d)/, '$1g');
}

function findAllergens(lines: string[]): Pick<LabelInfo, 'allergens' | 'allergenLabelFound'> {
  // "○○ 함유"/"알레르기 유발물질" 줄과 그다음 줄만 본다. 교차오염 안내("같은 제조시설", "혼입 가능")는 함유가 아니므로 제외.
  // 표시 줄을 못 찾으면 추측하지 않는다(실사진 OCR에서 교차오염 성분을 잘못 잡은 사례 있음) → "확인 불가"
  const labelIndex = lines.findIndex((line) => ALLERGEN_KEYWORD.test(line) && !CROSS_CONTAMINATION.test(line));
  if (labelIndex < 0) return { allergens: [], allergenLabelFound: false };
  // "알레르기 유발물질:"처럼 목록이 다음 줄로 넘어가는 경우만 다음 줄 포함("○○ 함유"로 끝나는 줄은 그 줄만)
  const label = lines[labelIndex];
  const next = lines[labelIndex + 1];
  const region = /함유/.test(label) || !next || CROSS_CONTAMINATION.test(next) ? label : `${label},${next}`;
  const found = allergensIn(region);
  return { allergens: Object.keys(ALLERGENS).filter((name) => found.has(name)), allergenLabelFound: true };
}

// 함유 줄에서 성분 이름 찾기. OCR이 띄어쓰기·쉼표를 빼먹어도("밀대두우유함유") 읽도록 앞에서부터 가장 긴 이름부터 맞춘다.
// 한 글자 이름(밀·게·콩·닭·굴·잣)은 다른 단어 속이면 무시("밀봉", "가게"): 앞뒤가 구분자·조사·다른 성분·"함유"일 때만 인정.
function allergensIn(text: string): Set<string> {
  const s = text.replace(/\s/g, '');
  const beforeSeparator = /[,·•/()[\]{}:;.|과와및]/; // "가게"의 '가'처럼 단어 일부일 수 있는 조사는 앞쪽 구분자로 보지 않음
  const afterSeparator = /[,·•/()[\]{}:;.|과와및을를은는이가도]/;
  // 정확히 일치하는 가장 긴 이름, 없으면 3글자 이상 이름 중 한 글자만 다른 것(OCR 오인식: "대지고기" → 돼지고기)
  const matchAt = (at: number): string | undefined =>
    SYNONYMS_LONGEST_FIRST.find((w) => s.startsWith(w, at)) ??
    SYNONYMS_LONGEST_FIRST.find((w) => w.length >= 3 && [...w].filter((ch, k) => s[at + k] !== ch).length === 1 && at + w.length <= s.length);
  const startsAllergen = (at: number) => matchAt(at) !== undefined;
  const found = new Set<string>();
  let lastEnd = -1;
  for (let i = 0; i < s.length;) {
    const word = matchAt(i);
    if (word) {
      const end = i + word.length;
      const before = i === 0 || i === lastEnd || beforeSeparator.test(s[i - 1]);
      const after = end >= s.length || afterSeparator.test(s[end]) || s.startsWith('함유', end) || startsAllergen(end);
      if (word.length > 1 || (before && after)) {
        found.add(SYNONYM_TO_ALLERGEN.get(word)!);
        lastEnd = end;
        i = end;
        continue;
      }
    }
    i++;
  }
  return found;
}
