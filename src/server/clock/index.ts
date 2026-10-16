import "server-only";

// 한 시계(11절 (4-1) · AC-7g, plan-p03a 파일별 값 7, C55 (3)).
// 앱의 모든 시각은 여기서 읽는다. 저장소에서 이 파일만 현재 시각(Date.now)을 부른다.
// 프리뷰 배포(VERCEL_ENV=preview)와 시험(NODE_ENV=test)에서만 CLOCK_SHIFT_DAYS 날 수를 더한다.
// 운영 배포 · VERCEL_ENV 없는 next start · next dev 는 그 변수를 아예 읽지 않는다.
// 이 모듈은 DB · 설정을 가져오지 않는다(P3b 의 proxy 가 모든 요청에서 가져온다).
// 오늘 학습일은 부르는 쪽이 설정 app.timezone · app.day_start_hour 를 읽어 learningDayOf(now(), …) 로 센다.

/** 하루의 밀리초(단위 바꿈 상수). */
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SHIFT_DAYS_PATTERN = /^\d+$/;

export class ClockConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClockConfigError";
  }
}

export type ClockEnv = Readonly<Record<string, string | undefined>>;

export type Clock = {
  now(): Date;
  readonly shiftDays: number;
};

/** 당길 날 수. 프리뷰 · 시험이 아니면 CLOCK_SHIFT_DAYS 를 읽지 않고 0 이다. */
export function readShiftDays(env: ClockEnv): number {
  const enabled = env.VERCEL_ENV === "preview" || env.NODE_ENV === "test";
  if (!enabled) return 0;
  const raw = env.CLOCK_SHIFT_DAYS;
  if (raw === undefined || raw === "") return 0;
  if (!SHIFT_DAYS_PATTERN.test(raw)) {
    throw new ClockConfigError(
      `CLOCK_SHIFT_DAYS 는 0 이상의 정수여야 합니다: ${JSON.stringify(raw)}`,
    );
  }
  return Number(raw);
}

export function createClock({
  env = process.env,
  realNow = () => Date.now(),
}: {
  env?: ClockEnv;
  realNow?: () => number;
} = {}): Clock {
  const shiftDays = readShiftDays(env);
  const offsetMs = shiftDays * MS_PER_DAY;
  return {
    now: () => new Date(realNow() + offsetMs),
    shiftDays,
  };
}

export const appClock = createClock();

/** 앱의 현재 시각. */
export function now(): Date {
  return appClock.now();
}
