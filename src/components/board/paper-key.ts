// 카드 열쇠 → 종이 꼴(UI · UX plan 묶음 2-가 · spec 설계 5.2 모양 토큰 · D-9). 테이프 길이 · 테이프 각도 · 카드 기울기 · 테이프 색은
// 카드 열쇠(영역 · 수업 번호 같은 글)로 고르는 값 목록이라 같은 카드는 늘 같은 꼴이다(그릴 때마다 흔들리지 않는다). 순수 함수 하나와 값
// 목록(화면 꼴 상수, C72 꼴 — 설정값이 아니다, 12절 머리 문단)이다. 색 값은 globals.css 의 tape-1~5 토큰이고 여기는 이름만 둔다.

/** 테이프 기준 크기(px, 시안 ② 104 × 30). 길이만 열쇠로 ±12% 바뀌고 두께는 그대로다. */
export const TAPE_BASE = { width: 104, height: 30 } as const;
/** 테이프 길이 차이(기준에 곱함, ±12%). */
export const TAPE_LENGTH_STEPS = [-0.12, -0.06, 0, 0.06, 0.12] as const;
/** 가운데 테이프 기준 각도(°). */
export const TAPE_ANGLE_BASE = -3;
/** 가운데 테이프 각도 차이(°, ±3°). */
export const TAPE_ANGLE_STEPS = [-3, -1.5, 0, 1.5, 3] as const;
/** 모서리 테이프 각도(°, 왼쪽 위 · 오른쪽 위). */
export const TAPE_CORNER_ANGLE = { left: -34, right: 32 } as const;
/** 카드 기울기(°, 시안 ② 판 차례 넷). */
export const PAPER_TILTS = [-1.4, 1, -0.6, 1.2] as const;
/** 가장 크게 기운 카드 기울기의 크기(°, PAPER_TILTS 의 절댓값 최대). */
export const PAPER_TILT_MAX = Math.max(...PAPER_TILTS.map(Math.abs));

/**
 * 가운데를 축으로 deg 만큼 돌린 종이(너비 × 높이 px)의 회전 상자가 한쪽 옆으로 원래 상자보다 나오는 너비(px, 순수).
 * 회전 상자 너비는 너비·cos + 높이·sin 이라 높은 카드일수록 많이 나온다(꾸밈 낙서 띠와의 겹침 셈 — AC-23e (3), 첫 프리뷰 분류 J-2).
 */
export function tiltOverhangPx(
  width: number,
  height: number,
  deg: number,
): number {
  const rad = (Math.abs(deg) * Math.PI) / 180;
  return (width * Math.cos(rad) + height * Math.sin(rad) - width) / 2;
}

/** 확인 쪽지 기울기(°). */
export const NOTE_TILT = 1.4;
/** 테이프 색 토큰 이름(globals.css --color-tape-1~5). */
export const TAPE_TONES = [
  "tape-1",
  "tape-2",
  "tape-3",
  "tape-4",
  "tape-5",
] as const;
export type TapeTone = (typeof TAPE_TONES)[number];

/** 32비트 FNV-1a(열쇠 글 → 수, 같은 글이면 같은 수). */
const FNV = { offset: 0x811c9dc5, prime: 0x01000193 } as const;
/** 값마다 다른 갈래로 고르도록 열쇠 뒤에 붙이는 표(길이 · 각도 · 기울기 · 색이 서로 묶이지 않게). */
const SALT = { length: "#len", angle: "#ang", tilt: "#tilt", tone: "#tone" };

function hashOf(text: string): number {
  let h: number = FNV.offset;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, FNV.prime) >>> 0;
  }
  return h;
}

function pick<T>(list: readonly T[], key: string, salt: string): T {
  return list[hashOf(key + salt) % list.length] as T;
}

/** 종이 한 장의 꼴: 테이프 길이 · 두께(px) · 각도(°) · 카드 기울기(°) · 테이프 색 토큰 이름. */
export type PaperLook = {
  tapeWidth: number;
  tapeHeight: number;
  tapeAngle: number;
  tilt: number;
  tapeTone: TapeTone;
};

/** 카드 열쇠 → 꼴(순수). 같은 열쇠면 늘 같은 값이다. */
export function paperLookOf(key: string): PaperLook {
  return {
    tapeWidth:
      TAPE_BASE.width * (1 + pick(TAPE_LENGTH_STEPS, key, SALT.length)),
    tapeHeight: TAPE_BASE.height,
    tapeAngle: TAPE_ANGLE_BASE + pick(TAPE_ANGLE_STEPS, key, SALT.angle),
    tilt: pick(PAPER_TILTS, key, SALT.tilt),
    tapeTone: pick(TAPE_TONES, key, SALT.tone),
  };
}
