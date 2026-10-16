// 단계 → 구간. 12절 설정 키의 <구간> 은 단계 구간(1-3 · 4-6 · 7-9 · 10-12)이다.
// 공용 자리다. P2(음성 설정) · P3(설정 키 <구간>) · P4(단원 틀 구간)가 같이 쓴다(plan-p02 다-6, 컨트롤러 결정).

/** 12절 기본값 칸의 구간 순서. */
export const BANDS = ["1-3", "4-6", "7-9", "10-12"] as const;

export type Band = (typeof BANDS)[number];

/** 구간 이름의 첫 단계 · 끝 단계를 읽는다('4-6' → [4, 6]). */
function bandRange(band: Band): [number, number] {
  const [from, to] = band.split("-").map(Number);
  return [from ?? Number.NaN, to ?? Number.NaN];
}

/** 단계(1~12 의 정수)를 구간으로. 범위 밖이거나 정수가 아니면 던진다. */
export function bandOf(level: number): Band {
  if (Number.isInteger(level)) {
    for (const band of BANDS) {
      const [from, to] = bandRange(band);
      if (level >= from && level <= to) return band;
    }
  }
  throw new RangeError(`단계는 1~12 의 정수여야 한다: ${level}`);
}
