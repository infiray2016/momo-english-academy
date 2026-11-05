// 같은 말 견주기 · 겹침 없애기 · 마무리 물음(13절 C125 (3) · C127 · 3.3 마무리 물음, 회화 plan 묶음 '5-나' 할 것 1). flow.ts 에서 동작
// 그대로 옮겼다(flow.ts 는 묶음 12 가 지웠다). 새 흐름(question-check · lesson-flow · lesson-turn)이 쓴다. 순수 모듈이다.
import { splitSentences } from "@/core/seed/text";
import { normalizeForMatch } from "@/core/speech/match-rate";

/** 목표 턴에 닿은 턴 · '더 이야기하기' 한 번이 끝난 턴에 붙이는 말(3.3 — 'Do you want to talk more?'(더 이야기할래?)). */
export const MORE_PROMPT = {
  en: "Do you want to talk more?",
  ko: "더 이야기할래?",
} as const;

// ── 앱이 붙일 말의 꼴(3.3 1~3단계 토리 말 · 8절 회화 턴 실패 · C19 · C36) ──

export type AppendLine =
  | { kind: "question"; en: string; ko?: string }
  | { kind: "answer_example"; en: string }
  | { kind: "two_answers"; answers: [string, string] }
  | { kind: "more_prompt"; en: string; ko?: string }
  | { kind: "praise"; en: string };

/**
 * 같은 문장 견주기 꼴(C125 (3)): 대소문자 · 따옴표(I'm = I’m) · 문장부호 · 띄어쓰기를 지운 낱말 줄. 줄임꼴(I'm · it's · don't · let's …)은
 * 일치율과 같은 표로 펼쳐 'I'm fine' 과 'I am fine' 을 같은 말로 본다(C127 보완(2026-10-29)).
 */
export function normalizeSpoken(text: string): string {
  // 일치율 정규화는 이름 자리를 대문자 '{NAME}' 으로 돌려주므로 소문자로 바꿔 고치기 전처럼 한 낱말 'name' 으로 남긴다
  return normalizeForMatch(text.normalize("NFKC").replace(/`/g, "'"), [])
    .join(" ")
    .toLowerCase()
    .replace(/['’‘]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * '들어 있음'(낱말 경계)으로 같은 말을 보는 가장 짧은 낱말 수(13절 C127 — C125 (3) '같은 말'의 뜻 풀이, 설정값이 아닌 기술 판정).
 * 찾는 쪽(답 · 붙일 줄의 문장)이 이보다 짧으면 정규화한 문장 전체가 같을 때만 같은 말이다 — 한 낱말 답 'Yes.' 가
 * 'Yes, that's right!' 반응을, 'Good!' 이 'It is good.' 을 같은 말로 보지 않게. 두 낱말인 까닭: 정규화가 따옴표를 지워 "I'm good" 이
 * 'im good' 두 낱말이 되므로, 이 답이 든 'You can say, I'm good.' 을 같은 말로 보려면 두 낱말부터 '들어 있음'을 써야 한다(줄임꼴을
 * 펼친 뒤로는 'i am good' 세 낱말이라 문턱 2 를 그대로 넘는다 — C127 보완(2026-10-29)).
 */
export const SAME_SAYING_MIN_WORDS = 2;

/** 정규화한 글의 낱말 수(띄어쓰기로). */
const spokenWords = (normalized: string) =>
  normalized === "" ? 0 : normalized.split(" ").length;

const holds = (said: string, line: string) =>
  line !== "" &&
  (said === line ||
    (spokenWords(line) >= SAME_SAYING_MIN_WORDS &&
      ` ${said} `.includes(` ${line} `)));

/** 토리 문장이 답 두 개 가운데 어느 하나를 담는가(정규화 · 낱말 경계 — 스트리밍 중 잡아 둘 문장을 고를 때도 쓴다). */
export function sayingAnswer(
  sentence: string,
  pairs: readonly (readonly [string, string])[],
): boolean {
  const n = normalizeSpoken(sentence);
  return pairs.some((pair) => pair.some((a) => holds(n, normalizeSpoken(a))));
}

/**
 * 한 턴에 같은 말 두 번 안 읽기(13절 C125 (3) · 컨트롤러 판정 2026-10-23): 읽고 보이는 토리 문장과 붙일 말. 1단계 답 두 개 줄(①②)은
 * 칭찬 대사와 함께 늘 남긴다. 토리 문장 가운데 답 두 개 어느 하나를 담은 문장은 뺀다. 앱이 붙일 답 예시 · 질문 같은 줄은 남은
 * 토리 문장 · 답 두 개 · 앞서 붙인 줄에 이미 든 문장이면 뺀다(정규화해 견줌 — 짧은 줄은 문장 전체가 같을 때만, SAME_SAYING_MIN_WORDS).
 * 저장 글 · 다시 쓸 토리 차례 · 질문 차례 셈은 바꾸지 않는다.
 */
export function shownTurnOf(
  sentences: readonly string[],
  append: readonly AppendLine[],
): { sentences: string[]; append: AppendLine[] } {
  const pairs = append.flatMap((l) =>
    l.kind === "two_answers" ? [l.answers] : [],
  );
  const shown = sentences.filter((s) => !sayingAnswer(s, pairs));
  const said = [...shown, ...pairs.flat()]
    .flatMap(splitSentences)
    .map(normalizeSpoken)
    .filter((s) => s !== "");
  const heard = (sentence: string) => {
    const n = normalizeSpoken(sentence);
    return n !== "" && said.some((s) => holds(s, n));
  };
  const out: AppendLine[] = [];
  for (const line of append) {
    // 답 두 개(①②)와 칭찬 대사(실패 길에서 토리 반응 자리 — 8절 '회화 턴 실패')는 늘 남긴다
    if (line.kind === "two_answers" || line.kind === "praise") {
      out.push(line);
      continue;
    }
    const parts = splitSentences(line.en);
    if (parts.length > 0 && parts.every(heard)) continue;
    out.push(line);
    said.push(...parts.map(normalizeSpoken).filter((s) => s !== ""));
  }
  return { sentences: shown, append: out };
}

/**
 * 겹침 없애기 뒤 그 턴의 토리 뜻 줄(3.3 '답은 화면에 보이지 않는다' · T2 · 13절 C202 (5)). 뜻이 선생님 문장마다의 목록이고 그 수가 보낸 문장
 * 수와 같으면, 빠진 문장(답 두 개 · 소리 줄의 답을 담은 말, 질문을 쓰지 않는 차례의 물음표 등)의 뜻만 빼고 남은 문장의 뜻을 차례대로 잇는다 —
 * 모든 단계. 목록의 수가 다르거나 옛 한 글 꼴이면 문장과 맞출 수 없어 옛 규칙이다: 1~3단계에서 shownTurnOf 가 토리 문장을 하나라도 뺐으면 그
 * 턴의 뜻 줄은 흘리지도 저장하지도 않는다(빠진 문장의 뜻이 영어 답을 화면 글로 보이게 하고 말풍선과도 맞지 않는다). 4단계부터는 판정하지 않는다.
 * 남은 뜻이 없으면 null. 다시 흘리기 · 이어 열기는 저장값(이은 한 글)을 따른다.
 */
export function toriKoShownOf({
  ko,
  sent,
  shown,
  lowBand,
}: {
  ko: string | readonly string[] | null;
  sent: readonly string[];
  shown: readonly string[];
  lowBand: boolean;
}): string | null {
  if (ko === null) return null;
  const nonEmpty = (list: readonly string[]) => {
    const joined = list
      .map((k) => k.trim())
      .filter((k) => k !== "")
      .join(" ");
    return joined === "" ? null : joined;
  };
  if (typeof ko !== "string" && ko.length === sent.length) {
    // shown 은 sent 의 차례를 지킨 부분 목록이다 — 앞에서부터 짝지어 남은 문장의 뜻만 고른다
    let at = 0;
    const kept: string[] = [];
    sent.forEach((sentence, i) => {
      if (at < shown.length && shown[at] === sentence) {
        kept.push(ko[i] ?? "");
        at += 1;
      }
    });
    return nonEmpty(kept);
  }
  const whole = typeof ko === "string" ? nonEmpty([ko]) : nonEmpty(ko);
  if (whole === null || !lowBand) return whole;
  return shown.length < sent.length ? null : whole;
}

/** 영어 낱말이 두 개 넘게 이어진 자리(따옴표 · 쉼표 · 띄어쓰기를 사이에 둠 — 영어 문장 · 영어 답의 꼴). 영어 낱말 하나('eat')는 아니다. */
const ENGLISH_RUN = /[A-Za-z][A-Za-z']*(?:[\s,"'‘’“”]+[A-Za-z][A-Za-z']*)+/;

/**
 * 한국어 글(설명 · 뜻)에서 영어 문장 · 영어 답을 담은 문장을 뺀다(13절 C204 (4) — 1~3단계는 영어 문장을 글로 미리 보이지 않는다, T2 · 02-2 204 ·
 * 235). 문장(문장부호 바로 뒤 띄어쓰기로 나눔) 가운데 영어 낱말이 둘 이상 이어진 것(따옴표 안 영어 포함)을 통째로 빼고, 영어 낱말 하나와 뜻('먹다'는 eat 이야)은 남긴다. {NAME} 자리는
 * 낱말로 보지 않는다. 다 빠지면 빈 글.
 */
export function withoutEnglishSentencesOf(text: string): string {
  // 한국어 문장 끝(문장부호 바로 뒤 띄어쓰기)으로만 나눈다 — 따옴표 안 영어 문장('… big.' 이라고)은 나누지 않고 그 문장째 뺀다
  return text
    .split(/(?<=[.!?。])\s+/)
    .filter((sentence) => !ENGLISH_RUN.test(sentence.replace(/\{NAME\}/g, "")))
    .join(" ")
    .trim();
}
