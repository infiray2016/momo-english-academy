// 수업 안 '한국어로 물어보기'의 순수 판단(수업 안 한국어로 묻기 spec 판 3 설계 4 · 5 · plan 정한 것 10 · 접점 다 · 라, 13절 C221 · C225).
// 서버의 한국어 질문 길(server/conversation/ko-help.ts) · 화면 자료(server/conversation/index.ts) · 묶음 4-다 의 다음 영어 턴이 같은 함수를 쓴다.
// DB · AI 없음. talk_turns 의 행을 읽기만 하고 고치지 않는다 — 한국어 문답은 학습 셈 어디에도 들지 않는다(C221 · C226 (3), spec 설계 6).
import type { TalkKoHelpKind } from "@/core/ai/calls/talk-ko-help";
import {
  TALK_HINT_KINDS,
  type TalkHintKind,
} from "@/core/conversation/lesson-turns";
import { bestMatchRate } from "@/core/speech/match-rate";

// ── 읽을 턴 번호([N-1] — 되묻는 차례를 건너 이어받기) ────────────────────

/**
 * 턴 번호를 고르는 데 필요한 talk_turns 행의 꼴(차례대로). 아이 행의 askAgain 은 되물음 표지(talk_turns.ask_again, C218)이고, 선생님 행의
 * askAgain 은 그 행이 되묻는 차례인가(move 의 까닭 why ask_again 또는 새 엔진 move.lead.move ask_again)다. 둘 중 하나만 있어도 되물은 차례로 본다.
 */
export type KoHelpTurnRow = {
  speaker: "child" | "teacher";
  turnNo: number;
  askAgain?: boolean;
};

/**
 * 지금 열린 아이 차례가 읽는 한국어 도움의 턴 번호(오래된 것부터). 마지막 행이 선생님 행이면 그 턴 번호가 지금 아이 차례의 턴 번호이고, 그 앞 아이
 * 행이 되물은 아이 차례이면(그 아이 행의 표지 또는 바로 뒤 선생님 행이 되묻는 차례) 그 아이 행의 턴 번호도 읽는다. 되묻는 차례가 이어지는 동안
 * 거슬러 올라간다(talk.ask_again_max 가 1 보다 커도 같다). 아이 차례가 열려 있지 않으면(행이 없음 · 마지막이 아이 행) 빈 목록이다.
 */
export function koHelpTurnNosOf(rows: readonly KoHelpTurnRow[]): number[] {
  let at = rows.length - 1;
  const last = rows[at];
  if (last?.speaker !== "teacher") return [];
  const out = [last.turnNo];
  for (;;) {
    const teacher = rows[at];
    const child = rows[at - 1];
    if (teacher?.speaker !== "teacher" || child?.speaker !== "child") break;
    if (child.askAgain !== true && teacher.askAgain !== true) break;
    out.unshift(child.turnNo);
    at -= 2;
  }
  return out;
}

// ── 한국어 질문을 받을 차례인가(설계 4 입력 문단) ──────────────────────

/** 한국어 질문을 받는 토막(인사 · 대화 · 더 이야기하기). */
export const KO_ASK_SEGMENTS = ["greeting", "talk", "more_talk"] as const;

export type KoAskTurnFacts = {
  segment: string;
  /** 선생님 말이 없는 아이 행이 남아 있다(회화 턴이 진행 중이거나 끊겼다). */
  orphan: boolean;
  /** 대화가 닫혔다(흐름 위치의 closed). */
  closed: boolean;
  /** 마지막 행이 선생님 행이다(아이 차례가 열린 상태). */
  lastRowTeacher: boolean;
  /** 대화 첫 질문을 아직 붙이지 않았다 · 대화 중 연 준비가 아직 대화로 돌아가지 않았다(회화 턴 끝점과 같은 판단). */
  firstQuestionDue: boolean;
  prepPending: boolean;
  /** 고르기 차례(마무리 물음 · 마무리 제안). */
  choice: "closing" | "suggestion" | null;
};

/**
 * 지금 한국어 질문을 받을 수 있는가: 인사 · 대화 · 더 이야기하기 토막에서 아이 차례가 열려 있고(마지막 행이 선생님 행이고 끊긴 아이 행이 없음),
 * 회화 턴 끝점이 아이 말을 받지 않는 때(닫힘 · 대화 첫 질문 전 · 준비 중)가 아니며, 마무리 물음 · 마무리 제안 턴이 아니다.
 */
export function koAskTurnOpenOf(facts: KoAskTurnFacts): boolean {
  return (
    (KO_ASK_SEGMENTS as readonly string[]).includes(facts.segment) &&
    !facts.orphan &&
    !facts.closed &&
    facts.lastRowTeacher &&
    !facts.firstQuestionDue &&
    !facts.prepPending &&
    facts.choice === null
  );
}

// ── 순번 · 앞 대화 · 답의 소리 ────────────────────────────────────────

/** 그 아이 차례의 다음 순번(1 부터 — 같은 턴 번호의 도움 행 순번 가운데 가장 큰 것 + 1). */
export function nextKoHelpSeqOf(
  helps: readonly { turnNo: number; seq: number }[],
  turnNo: number,
): number {
  return (
    helps
      .filter((h) => h.turnNo === turnNo)
      .reduce((max, h) => Math.max(max, h.seq), 0) + 1
  );
}

/** 앞 대화 한 줄(호출 조각 TalkKoHelpEarlierLine 과 같은 꼴). */
export type KoHelpEarlierLine = { who: "teacher" | "child"; text: string };

/**
 * 앞 대화 줄(오래된 것부터, 많아야 count 줄): 지금 선생님 행 앞의 행들 가운데 글이 있는 것. 아이 행 글이 없는 차례('잘 모르겠어요' ·
 * 들리지 않음)는 줄이 아니다. 글은 저장한 그대로다(이미 가린 글 · {NAME} 틀). count 가 0 이면 빈 목록이다.
 */
export function koHelpEarlierOf(
  rows: readonly { who: "teacher" | "child"; text: string | null }[],
  count: number,
): KoHelpEarlierLine[] {
  if (count <= 0) return [];
  const lines = rows.flatMap((row) => {
    const text = (row.text ?? "").replace(/\s+/g, " ").trim();
    return text === "" ? [] : [{ who: row.who, text }];
  });
  return lines.slice(-count);
}

/** 답 뒤에 읽을 영어 소리(설계 2 '답의 소리'): 가르친 표현이 있으면 그 표현, 없으면 선생님의 지금 말 다시 읽기. */
export type KoHelpReplay = "taught" | "teacher_line";

export function koHelpReplayOf(
  teachEn: string | null | undefined,
): KoHelpReplay {
  return teachEn ? "taught" : "teacher_line";
}

// ── 응답 · 화면 자료의 도움 하나(접점 다 · 라) ──────────────────────────

export type KoHelpFallback = "none" | "call_failed" | "check_blocked";

/**
 * 한국어 도움 하나(응답의 help · 화면 자료 koHelps 의 항목). kind 는 호출 실패 꼴의 대신 줄이면 null 이다(모델 답이 없어 갈래가 없다).
 * 답이 아직 없는 행(호출 중에 끊김)은 sayKo 가 null 이다. teachEn 은 읽기 재료이고 1~3단계 화면은 그리지 않는다(T2).
 */
export type TalkKoHelpView = {
  turnNo: number;
  seq: number;
  question: string;
  kind: TalkKoHelpKind | null;
  sayKo: string | null;
  teachEn?: string;
  textShown: boolean;
  fallback: KoHelpFallback | null;
  replay: KoHelpReplay;
};

/**
 * 답이 있는 도움(응답의 help 는 늘 이 꼴). kind 가 null 이면 호출 실패 꼴의 대신 줄이다(fallback call_failed — 모델 답이 없다). 검사 걸림 꼴
 * (check_blocked)은 모델이 낸 갈래를 남기므로 kind 가 expression 인데 teachEn 이 없을 수 있다 — 화면과 다음 영어 턴은 kind 가 아니라 fallback 과
 * teachEn 이 있는지로 가른다(검토 rev-b4b 4절 우려 2).
 */
export type TalkKoHelpAnswered = TalkKoHelpView & {
  sayKo: string;
  fallback: KoHelpFallback;
};

/**
 * 답이 아직 없는 도움(호출 중 · 끊김 · 호출 앞 안전 상한에 걸림). 아이가 본 것이 없으므로 도움 말풍선을 그리지 않고 다음 영어 턴은 도움 없음으로
 * 읽는다. 화면 자료 koHelps 에만 나오고, open 이 참이면 같은 시도 id 로 다시 보내 답을 받을 수 있다(검토 rev-b4b 4절 우려 2).
 */
export type TalkKoHelpPending = TalkKoHelpView & {
  kind: null;
  sayKo: null;
  teachEn?: never;
  textShown: false;
  fallback: null;
  replay: "teacher_line";
};

/** 응답 · 화면 자료의 도움 하나 — 답이 있는 꼴과 없는 꼴의 합. */
export type TalkKoHelpItem = TalkKoHelpAnswered | TalkKoHelpPending;

/** 답이 있는 꼴인가(sayKo · fallback 이 둘 다 있음). */
export function isKoHelpAnswered(
  help: TalkKoHelpItem,
): help is TalkKoHelpAnswered {
  return help.sayKo !== null && help.fallback !== null;
}

/** 저장한 도움 행에서 읽는 칸(talk_ko_helps). */
export type KoHelpRowFacts = {
  turnNo: number;
  seq: number;
  question: string;
  kind: TalkKoHelpKind | null;
  sayKo: string | null;
  teachEn: string | null;
  textShown: boolean | null;
  fallback: KoHelpFallback | null;
};

/**
 * 저장한 행 → 도움 보기. withTeach 가 거짓이면 teachEn 을 내리지 않는다(1~3단계에서 지금 열린 아이 차례가 읽지 않는 도움 — 소리로만 준
 * 표현 글이 화면 자료로 새지 않게, 접점 라 · 위험 8). 답의 소리 고르기는 가르친 표현이 있었는가로 정한다(내리지 않아도 같다).
 * 답 칸(sayKo · fallback — 답을 채울 때 함께 쓴다) 가운데 하나라도 비면 답이 아직 없는 꼴이다(물은 말만).
 */
export function koHelpViewOf(
  row: KoHelpRowFacts,
  { withTeach }: { withTeach: boolean },
): TalkKoHelpItem {
  if (row.sayKo === null || row.fallback === null)
    return {
      turnNo: row.turnNo,
      seq: row.seq,
      question: row.question,
      kind: null,
      sayKo: null,
      textShown: false,
      fallback: null,
      replay: "teacher_line",
    };
  const teach = row.teachEn ?? "";
  return {
    turnNo: row.turnNo,
    seq: row.seq,
    question: row.question,
    kind: row.kind,
    sayKo: row.sayKo,
    ...(withTeach && teach !== "" ? { teachEn: teach } : {}),
    textShown: row.textShown === true,
    fallback: row.fallback,
    replay: koHelpReplayOf(teach),
  };
}

// ── 다음 영어 턴의 대접(묶음 4-다 — spec 판 3 설계 4 '다음 영어 턴' 표 · plan 정한 것 8 · 9, 세 방식 공통) ──

/** 회화 턴 요청의 선택 칸 koHelp 의 항목 하나(접점 마 — 기기가 보낸 값, 힌트의 '들은 도움'과 같은 믿음 수준). */
export type KoHelpDeviceEntry = {
  turnNo: number;
  seq: number;
  /** 소리를 한 번이라도 들려줬는가(없으면 들은 것으로 본다). */
  heard?: boolean | undefined;
  /** '알려 준 말 듣기' 누른 수. */
  replays?: number | undefined;
};

/** 대접 판정이 읽는 도움 행의 칸(talk_ko_helps — 새로 보인 영어 글 shown_en · 들려줬는가 heard 포함). */
export type KoHelpStandingRow = Pick<
  KoHelpRowFacts,
  "turnNo" | "seq" | "kind" | "sayKo" | "teachEn" | "textShown" | "fallback"
> & {
  shownEn: readonly string[] | null;
  heard: boolean | null;
};

/** 회화 턴 사용자 메시지에 더하는 한 줄의 꼴(기존 방식 — 6.2 회화 턴 입력). */
export type KoHelpLine =
  | { kind: "taught"; taught: readonly string[] }
  | { kind: "meaning" };

/** 도움의 대접(koHelpStandingOf). 도움이 없으면 hintKind 'none' · koHelp 거짓 · 빈 목록 · line null. */
export type KoHelpStanding = {
  /** 아이 행의 힌트 종류에 올릴 값(그 행의 hintKindOf 값과 높은 쪽을 고른다 — raiseHintKind). */
  hintKind: KoHelpHintKind;
  /** 근거 칸 도움 ko_help 가 있는가(근거 칸은 P12 몫 — plan 정한 것 8, 그때까지 이 값과 단위 시험이 증명이다). */
  koHelp: boolean;
  /** 가르친 표현(보았거나 들은 것만 — 귀띔의 기대 낱말 · 막힘 무름 · 한 줄이 읽는다). 차례대로, 같은 글은 하나. */
  taught: string[];
  line: KoHelpLine | null;
  /** 한국어 도움이 새로 보인 영어 낱말(소문자 — '말했다' 거름이 넘기는 단원 단어 목록에서 뺀다, [N-4]). */
  shownWords: string[];
};

/** 힌트 종류 셋(낮은 것부터 — 회화 턴 행의 목록 lesson-turns TALK_HINT_KINDS 하나를 쓴다, 검토 rev-b4c M-4). */
export const KO_HELP_HINT_KINDS = TALK_HINT_KINDS;
export type KoHelpHintKind = TalkHintKind;

/** 두 힌트 종류 가운데 높은 쪽('영어' > '뜻만' > '없음' — 이미 더 높으면 그대로). */
export function raiseHintKind<K extends KoHelpHintKind>(
  base: K,
  by: KoHelpHintKind,
): K | KoHelpHintKind {
  return KO_HELP_HINT_KINDS.indexOf(by) > KO_HELP_HINT_KINDS.indexOf(base)
    ? by
    : base;
}

const EN_WORD = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;

/** 글의 영어 낱말(적힌 차례). */
function enWordsIn(text: string): string[] {
  return text.match(EN_WORD) ?? [];
}

/**
 * 그 아이 차례가 읽는 도움 행들(koHelpTurnNosOf 의 턴 번호에 붙은 것 — 되묻는 차례를 건너 이어받은 것 포함 [N-1]) → 다음 영어 턴의 대접.
 * 행마다(설계 4 표):
 * - 답이 없는 행 · 대신 줄(fallback 이 none 이 아님) · 갈래 불분명 · 그 밖 → 도움 없음(검토 rev-b4b 6절 — kind 가 아니라 fallback 으로 먼저 가른다).
 * - 표현을 글로 보았다(4단계부터 행의 textShown — 4-나 가 가르친 표현 글이나 한국어 답 속 새 영어 토막을 보였을 때 적는다) → '영어' · ko_help ·
 *   한 줄 taught(가르친 표현, 그 칸이 비면 그 행의 새로 보인 영어 글 가운데 낱말이 둘 이상인 것).
 * - 표현을 소리로 들었다(1~3단계 가르친 표현 — 기기 값 heard 가 거짓이 아니면) → '영어' · ko_help · 한 줄 taught.
 * - 1~3단계에서 한 번도 들려주지 못한 표현 → 도움 없음(들려주지 못한 소리는 도움으로 적지 않는다, I-6).
 * - 뜻만 받았다(갈래 뜻) → '뜻만' · ko_help · 한 줄 meaning only.
 * 여럿이면 가장 높은 대접을 따르고 한 줄에는 가르친 표현을 모두 적는다. 기기 값(device)은 같은 턴 번호 · 순번의 행 값보다 앞선다. 새로 보인 낱말은
 * 대접과 관계없이 답이 있는 행의 shown_en 에서 모은다(낱말 단위 거름 — 힌트 종류와 관계없이).
 */
export function koHelpStandingOf(
  rows: readonly KoHelpStandingRow[],
  {
    lowBand,
    device = [],
  }: { lowBand: boolean; device?: readonly KoHelpDeviceEntry[] },
): KoHelpStanding {
  let hintKind: KoHelpHintKind = "none";
  let koHelp = false;
  let meaning = false;
  const taught: string[] = [];
  const shownWords: string[] = [];
  const addTaught = (t: string) => {
    const v = t.trim();
    if (v !== "" && !taught.includes(v)) taught.push(v);
  };
  for (const row of rows) {
    if (row.sayKo === null || row.fallback === null) continue;
    for (const chunk of row.shownEn ?? [])
      for (const w of enWordsIn(chunk)) {
        const lower = w.toLowerCase();
        if (!shownWords.includes(lower)) shownWords.push(lower);
      }
    if (row.fallback !== "none") continue;
    if (row.kind !== "expression" && row.kind !== "meaning") continue;
    const teach = (row.teachEn ?? "").trim();
    // 4단계부터의 '보았다'는 행의 textShown 하나로 본다(4-나 가 토막 여부를 정해 적은 값 — shown_en 의 조각 글은 쉼표를 버려 늘어놓은 낱말도
    // 이어 보이므로 다시 세지 않는다, 검토 rev-b4c M-1). 가르친 표현 칸이 빈 때 한 줄의 토막도 보았다고 적힌 행의 것만 고른다
    const seen = !lowBand && row.textShown === true;
    const chunks = seen
      ? (row.shownEn ?? []).filter((c) => enWordsIn(c).length >= 2)
      : [];
    const entry = device.find(
      (d) => d.turnNo === row.turnNo && d.seq === row.seq,
    );
    const heard = (entry?.heard ?? row.heard) !== false;
    if (seen || (lowBand && teach !== "" && heard)) {
      hintKind = "english";
      koHelp = true;
      if (teach !== "") addTaught(teach);
      else for (const c of chunks) addTaught(c);
      continue;
    }
    if (lowBand && teach !== "") continue;
    if (row.kind === "meaning") {
      hintKind = raiseHintKind(hintKind, "meaning_only");
      koHelp = true;
      meaning = true;
    }
  }
  const line: KoHelpLine | null =
    taught.length > 0
      ? { kind: "taught", taught }
      : meaning
        ? { kind: "meaning" }
        : null;
  return { hintKind, koHelp, taught, line, shownWords };
}

/** 사용자 메시지 한 줄의 글(6.2 회화 턴 입력 — 여럿이면 `'A'; 'B'`). */
export function koHelpLineText(line: KoHelpLine): string {
  return line.kind === "taught"
    ? `Korean help before this answer: taught ${line.taught.map((t) => `'${t}'`).join("; ")}`
    : "Korean help before this answer: meaning only";
}

/**
 * '말했다' 거름(plan 정한 것 9 — said.ts 는 고치지 않는다): saidWordsOf 에 넘기는 단원 단어 목록에서 한국어 도움이 새로 보인 낱말을 뺀다. 표기형은
 * 원형으로도 맞댄다(lemmaOf). 새로 보인 낱말이 없으면 목록을 그대로 돌려준다(한국어로 묻지 않은 턴은 같은 값).
 */
export function unitWordsWithoutShownOf(
  unitWords: readonly string[],
  shownWords: readonly string[],
  lemmaOf: (surface: string) => string | undefined,
): readonly string[] {
  if (shownWords.length === 0) return unitWords;
  const keys = new Set(
    shownWords.flatMap((w) => [w, lemmaOf(w)?.toLowerCase() ?? w]),
  );
  return unitWords.filter((u) => {
    const lower = u.toLowerCase();
    return (
      !keys.has(lower) && !keys.has(lemmaOf(lower)?.toLowerCase() ?? lower)
    );
  });
}

/**
 * 도움 뒤 선생님 턴이 넘기는 단원 단어 목록 둘(검토 rev-b4c I-1): '말했다'(saidWordsOf)에는 새로 보인 낱말을 뺀 목록, '만났다'(metWordsIn —
 * 선생님의 다음 영어 말)에는 받은 목록 그대로. 거름은 '말했다'만이다(정본 3.4 · plan 정한 것 9). 도움이 없으면 둘 다 받은 목록이다(AC-N26).
 */
export function koHelpUnitWordsOf(
  unitWords: readonly string[],
  shownWords: readonly string[],
  lemmaOf: (surface: string) => string | undefined,
): { said: readonly string[]; met: readonly string[] } {
  return {
    said: unitWordsWithoutShownOf(unitWords, shownWords, lemmaOf),
    met: unitWords,
  };
}

/**
 * 가르친 표현과의 일치(막힘 무름 한 꼴 · C225 (3)): 인식 글이 가르친 표현 가운데 하나와 일치율(6.2, {NAME} 자리 뺌) minMatch 이상이면 참이다.
 * 일치율 함수는 부르는 쪽이 넘긴다(보통은 koTaughtHeardOf 가 6.2 bestMatchRate 로 부른다). 견줄 영어 낱말이 없는 표현은 보지 않는다.
 */
export function koTaughtMatchedOf({
  heard,
  taught,
  minMatch,
  rateOf,
}: {
  heard: string;
  taught: readonly string[];
  minMatch: number;
  rateOf: (targets: readonly string[], heard: string) => number;
}): boolean {
  const usable = taught.filter((t) => enWordsIn(t).length > 0);
  if (usable.length === 0 || enWordsIn(heard).length === 0) return false;
  return rateOf(usable, heard) >= minMatch;
}

// ── 기존 방식 턴 길의 배선(서버 lesson-turn · 대본 도구 talk:observe 가 같은 함수를 쓴다) ──────────────

/** 귀띔 재료에 가르친 표현을 더한다(귀띔을 쓰는 단계 — 재료가 없으면 그대로, 도움이 없으면 같은 값). */
export function heardWithTaughtOf<T extends { taught?: readonly string[] }>(
  heard: T | undefined,
  ko: Pick<KoHelpStanding, "taught"> | null,
): T | undefined {
  if (heard === undefined || ko === null || ko.taught.length === 0)
    return heard;
  return { ...heard, taught: ko.taught };
}

/** 회화 턴 입력에 한국어 도움 한 줄을 얹는다(기존 방식 — 줄이 없으면 같은 값, AC-N26). */
export function withKoHelpLineOf<T extends { koHelpLine?: string }>(
  turn: T,
  ko: Pick<KoHelpStanding, "line"> | null,
): T {
  return ko?.line ? { ...turn, koHelpLine: koHelpLineText(ko.line) } : turn;
}

/** 막힘 무름 한 꼴(C225 (3)): 인식 글이 가르친 표현과 일치율(6.2 bestMatchRate, {NAME} 자리 뺌) minMatch 이상인가. 도움이 없으면 거짓. */
export function koTaughtHeardOf(
  ko: Pick<KoHelpStanding, "taught"> | null,
  heard: string,
  {
    minMatch,
    homophones,
  }: { minMatch: number; homophones: readonly (readonly string[])[] },
): boolean {
  if (ko === null) return false;
  return koTaughtMatchedOf({
    heard,
    taught: ko.taught,
    minMatch,
    rateOf: (targets, text) =>
      bestMatchRate(targets, text, { homophones, nameSlot: "excluded" }),
  });
}

/**
 * 되묻는 차례 뒤에 이어받은 도움([N-1] — 끝 줄 lesson.koCarry 의 재료): 지금 아이 차례가 읽는 턴 번호(koHelpTurnNosOf) 가운데 지금 턴 번호가
 * 아닌 것에 붙은 도움. 기존 방식에는 되묻는 차례를 쓰는 서버 코드가 없어 지금은 늘 빈 목록이고(다시 맞춤 2026-11-17), Claude 주도 방식(묶음 4-라)이
 * 끝 줄에 쓴다.
 */
export function koHelpCarryOf<T extends { turnNo: number }>(
  helps: readonly T[],
  turnNos: readonly number[],
): T[] {
  const now = turnNos.at(-1);
  return helps.filter((h) => h.turnNo !== now && turnNos.includes(h.turnNo));
}

/**
 * 화면 자료의 도움 목록(이어 하기용, 접점 라): 행마다 open(지금 열린 아이 차례가 읽는 도움인가 — 되묻는 차례를 건너 이어받은 것 포함 [N-1]).
 * 1~3단계(lowBand)는 open 이 거짓인 항목의 teachEn 을 내리지 않는다. 4단계부터는 가르친 표현을 글로 보였으므로 늘 싣는다.
 */
export function koHelpViewsOf(
  helps: readonly KoHelpRowFacts[],
  {
    openTurnNos,
    lowBand,
  }: { openTurnNos: readonly number[]; lowBand: boolean },
): (TalkKoHelpItem & { open: boolean })[] {
  return [...helps]
    .sort((a, b) => a.turnNo - b.turnNo || a.seq - b.seq)
    .map((row) => {
      const open = openTurnNos.includes(row.turnNo);
      return { ...koHelpViewOf(row, { withTeach: open || !lowBand }), open };
    });
}
