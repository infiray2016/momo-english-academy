// 200ms 화면 표본 도우미(UI · UX plan 묶음 0-마 · spec 설계 3 '재는 법' · 정본 9절 '필수 경로 가' · AC-23a (4) · AC-23f).
// 쪽 안에서 SAMPLE_MS 마다 표본 하나를 남긴다: 화면에 표시(SHOWN_SELECTORS 의 보이는 것 하나 이상 — 아이 말풍선 · 선생님 말풍선 · 말풍선 줄 ·
// 기다림 말풍선 · 기다림 점 · 말하기 단추 · 글이 있는 안내 줄)가 있는지와, 시험이 넘긴 이름별 고르개의 글(또는 속성 값, 없으면 null).
// 시험은 표본 줄로 (1) 빈 구간의 가장 긴 길이(longestBlankMs ≤ MAX_BLANK_MS — 표본 시각 차), (2) 아이 말풍선이 보낸 시각(회화 턴 요청의
// 시작, requestStartsOf)부터 다음 반응까지 같은 글로 끊김 없이 있는지(heldUntil fromAt), (3) 보낸 뒤 기다림 표시까지의 시간을 잰다.
// 시험 쪽 상수 둘(앱 설정값이 아님): SAMPLE_MS 200 은 정본 9절 '200ms 표본마다'의 값, MAX_BLANK_MS 5000 은 AC-23a (4) '빈 구간 5초 이하'의
// 값이다. 앱 설정값이 있는 문턱(ui.wait_hint_seconds 첫 값 — '보낸 뒤 1초 안')은 시험 DB 의 설정값을 읽어 쓴다(db.ts settingValueOf).
// 분석 함수는 순수라 tests/unit/required-e2e-helpers.test.ts 가 잠근다. 이 파일은 Playwright 형만 가져온다(값 없음).
// 쪽 이동(주소가 바뀌는 문서 이동)이 있으면 표본이 끊긴다 — 한 쪽 안의 흐름(회화 · 세션)에만 쓴다.
import type { Page } from "@playwright/test";

/** 표본 간격(ms) — 정본 9절 '필수 경로 가' 의 '200ms 표본마다'. */
export const SAMPLE_MS = 200;
/** 빈 구간 상한(ms) — AC-23a (4) '빈 구간 5초 이하'. */
export const MAX_BLANK_MS = 5000;

/** 화면에 무엇인가 보인다고 치는 표지(plan 0-마 표 · 1차 묶음 표지). 안내 줄은 글이 있는 role=status 다. */
export const SHOWN_SELECTORS = [
  "[data-child-said]",
  "[data-tori-bubble]",
  "[data-tori-line]",
  "[data-tori-waiting]",
  "[data-wait-hint]",
  "[data-speak]",
] as const;
const STATUS_SELECTOR = "[role='status']";

/** 이름별로 읽을 것: 고르개의 첫 보이는 요소의 글(attr 이 있으면 그 속성 값). */
export type Watch = Record<string, { selector: string; attr?: string }>;

export type Sample = {
  /** 표본 시각(쪽의 performance.now, ms). */
  at: number;
  /** 표시가 하나 이상 있는가. */
  shown: boolean;
  /** 이름별 값(그 고르개가 보이지 않으면 null). */
  values: Record<string, string | null>;
};

type SamplerWindow = Window & {
  __screenSamples?: Sample[];
  __screenSampler?: number;
};

/** 쪽 안 표본기(page.evaluate 로 넘어가므로 바깥 이름을 쓰지 않는다). */
function installSampler(args: {
  period: number;
  shown: readonly string[];
  status: string;
  watch: Watch;
}): void {
  const w = window as SamplerWindow;
  if (w.__screenSampler !== undefined) window.clearInterval(w.__screenSampler);
  const visible = (el: Element) => el.getClientRects().length > 0;
  const firstVisible = (selector: string) =>
    Array.from(document.querySelectorAll(selector)).find(visible);
  const take = () => {
    const shown =
      args.shown.some((s) => firstVisible(s) !== undefined) ||
      Array.from(document.querySelectorAll(args.status)).some(
        (el) => visible(el) && (el.textContent ?? "").trim() !== "",
      );
    const values: Record<string, string | null> = {};
    for (const [name, { selector, attr }] of Object.entries(args.watch)) {
      const el = firstVisible(selector);
      values[name] =
        el === undefined
          ? null
          : attr
            ? el.getAttribute(attr)
            : (el.textContent ?? "").trim();
    }
    w.__screenSamples?.push({ at: performance.now(), shown, values });
  };
  w.__screenSamples = [];
  take();
  w.__screenSampler = window.setInterval(take, args.period);
}

/** 지금부터 표본을 남긴다(앞 표본은 지움). */
export async function startSampler(page: Page, watch: Watch = {}) {
  await page.evaluate(installSampler, {
    period: SAMPLE_MS,
    shown: [...SHOWN_SELECTORS],
    status: STATUS_SELECTOR,
    watch,
  });
}

/** 표본을 멈추고 남긴 표본 줄을 돌려준다. */
export async function stopSampler(page: Page): Promise<Sample[]> {
  return page.evaluate(() => {
    const w = window as SamplerWindow;
    if (w.__screenSampler !== undefined)
      window.clearInterval(w.__screenSampler);
    w.__screenSampler = undefined;
    return w.__screenSamples ?? [];
  });
}

/** 지금까지 남긴 표본(멈추지 않음 — 기다리며 볼 때). */
export async function samplesSoFar(page: Page): Promise<Sample[]> {
  return page.evaluate(() => (window as SamplerWindow).__screenSamples ?? []);
}

/**
 * 빈 구간의 가장 긴 길이(ms, 순수 — 0-마 검토 M2): 표본 수가 아니라 표본 시각 차로 잰다. 빈 표본이 이어진 동안의 길이는 그 첫 빈 표본부터
 * 다음 표시 표본까지(끝까지 비면 마지막 표본까지)다 — 표본기가 밀려 간격이 벌어져도 실제 경과 시간을 센다.
 */
export function longestBlankMs(samples: readonly Sample[]): number {
  let longest = 0;
  let start: number | undefined;
  for (const s of samples) {
    if (!s.shown) {
      start ??= s.at;
      continue;
    }
    if (start !== undefined) longest = Math.max(longest, s.at - start);
    start = undefined;
  }
  const last = samples.at(-1);
  if (start !== undefined && last) longest = Math.max(longest, last.at - start);
  return longest;
}

/** 조건을 처음 채운 표본 번호(from 부터, 순수). 없으면 -1. */
export function firstIndexOf(
  samples: readonly Sample[],
  pred: (s: Sample) => boolean,
  from = 0,
): number {
  for (let i = from; i < samples.length; i++) {
    const s = samples[i];
    if (s && pred(s)) return i;
  }
  return -1;
}

/**
 * 남음(순수, AC-23f): 시작 표본부터 until 을 처음 채운 표본(다음 반응이 보인 때) 앞까지 표본마다 name 의 값이 text 인가. 시작 표본은
 * fromAt(보낸 시각 — 쪽 시계)을 주면 그 시각 뒤 첫 표본이고(그때 글이 아직 없으면 실패 — 말풍선이 늦게 뜨는 결함도 잡음, 0-마 검토 M2),
 * 주지 않으면 그 글이 처음 보인 표본이다. 다음 반응이 오지 않았거나, 반응 앞에 그 글이 보인 표본이 하나도 없으면(시작 표본이 이미 반응)
 * ok 가 거짓이다.
 */
export function heldUntil(
  samples: readonly Sample[],
  name: string,
  text: string,
  until: (s: Sample) => boolean,
  { fromAt }: { fromAt?: number } = {},
):
  | { ok: true; fromIndex: number; untilIndex: number }
  | { ok: false; fromIndex: number; untilIndex: number; brokeAt?: number } {
  const fromIndex =
    fromAt === undefined
      ? firstIndexOf(samples, (s) => s.values[name] === text)
      : firstIndexOf(samples, (s) => s.at > fromAt);
  if (fromIndex < 0) return { ok: false, fromIndex, untilIndex: -1 };
  const untilIndex = firstIndexOf(samples, until, fromIndex);
  for (
    let i = fromIndex;
    i < (untilIndex < 0 ? samples.length : untilIndex);
    i++
  ) {
    if (samples[i]?.values[name] !== text)
      return { ok: false, fromIndex, untilIndex, brokeAt: i };
  }
  if (untilIndex < 0) return { ok: false, fromIndex, untilIndex };
  // 반응 앞에 그 글이 보인 표본이 적어도 하나(시작 표본이 이미 반응이면 잰 것이 없다 — 0-마 재검토 Important)
  if (untilIndex <= fromIndex) return { ok: false, fromIndex, untilIndex };
  return { ok: true, fromIndex, untilIndex };
}

/**
 * 그 경로로 보낸 요청의 시작 시각들(쪽 시계 performance.now — 표본 at 과 같은 시계, 자원 시간 기록). 회화 턴 요청(/api/talk/turn)의 시작이
 * '보낸 때'다(1~3단계는 듣기가 끝나면 저절로 보내므로 누른 때가 아니다). 응답이 끝난 요청만 기록에 든다.
 */
export async function requestStartsOf(
  page: Page,
  pathPart: string,
): Promise<number[]> {
  return page.evaluate(
    (part) =>
      performance
        .getEntriesByType("resource")
        .filter((e) => e.name.includes(part))
        .map((e) => e.startTime),
    pathPart,
  );
}
