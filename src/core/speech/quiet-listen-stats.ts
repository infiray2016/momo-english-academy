// 조용함 차례 듣기 집계(회화 대화 구조 R spec 설계 6 '세는 기준' · '끄는 잣대' · AC-6 · 미결 11, plan 묶음 P6). 순수 모듈이다.
// 수업 기록(talk_turns 의 화자 · 토막 · 입력 방식 · '모름' 출처 · client_listen.listens)을 읽어 세 줄의 첫 진짜 결과를 세고, 끄는 잣대에 닿았는지 낸다.
// 아이 말의 글 · 이름은 받지 않는다(듣기 요약의 수 칸과 갈래 칸만, C149). 끄는 잣대의 수는 인자로 받는다(권고값 다섯 · 20%포인트 · 처음 셋 —
// 기본값을 두지 않는다). 둘째 줄은 같은 수업들에서 센 값만 쓴다: 지난 기록의 값(2026-11-08 수업의 14/15 — C216 고침 전 코드)은 기준값으로
// 쓰지 않는다(분석 보고 task-chat-a 4절).
//
// 줄 고르기(분석 보고 task-chat-a 1절의 정의, P6 fix 1 I-1): 아이 행 바로 앞이 선생님 행인 아이 행만 보고, 그 선생님 행의 바로 앞 행
// 하나(이 선생님 차례를 연 행)로 가른다. 선생님 행을 묶어 걷지 않는다.
// - 첫째 줄(afterQuiet): 앞 행이 quiet 아이 행. 조용함 차례가 잇달아 오면 마지막 조용함 뒤 아이 차례가 이 줄이고, quiet 행 자체는 어느 줄에도 들지 않는다.
// - 둘째 줄(afterSpeech): 앞 행이 말한 아이 행(input_mode speech).
// - 셋째 줄(afterHelpReadOutside): 앞 행이 단추 '모름' 아이 행(dont_know · src button)이거나 '더 이야기하기' 입구인 차례 가운데, 첫 진짜의 dc 가
//   g discard · sr 참(대기의 discard 갈래에서 세션 없이 읽음, spec 설계 6 '세는 기준')인 것. 같은 차례들의 모든 첫 진짜는 afterHelpAll 에 따로 낸다.
//   앞 행이 선생님 행이면 아이 행 없이 연 입구다. 그 앞 선생님 행이 고를 차례(마무리 물음 · 마무리 제안)였으면 '더 이야기하기' 입구다. 행에
//   고를 차례 표지(choice)가 있으면 그것으로 정하고(null 이면 고를 차례가 아님 → 어느 줄도 아님), 표지 칸이 없으면 같은 토막이거나 more_talk 로
//   들어간 선생님 → 선생님을 입구로 읽는다(마무리 제안 뒤는 토막이 그대로이고 마무리 물음 뒤는 more_talk 로 옮김 — 02-2:294-295). 토막이 바뀌는
//   선생님 → 선생님(인사 뒤 대화의 첫 차례)은 어느 줄도 아니다.
// 첫 진짜는 그 아이 행 listens 의 첫 칸이다. 듣기가 없으면 그 줄의 '첫 진짜 없음'(noFirstReal)이다. 행 묶음은 수업마다 따로 잇고, 대화 토막
// (greeting · talk · more_talk) 밖 행은 줄을 잇지 않는다.
//
// 첫째 줄의 흐름 가르기(묶음 V 검토 6절 · fix 1 보고): dc.rw === "quiet" 를 먼저 거르고(판정 뒤 숨김 · 마이크 확인이면 rw 가 hidden · check 이면서
// ql · qa 가 남는다) ql · g · sr · why 로 가른다. 표 밖 흐름 둘(다시 연 버림 뒤 세션 없이 읽음 · 조용함 버림이 소리 전에 저절로 끝남)은 따로 센다.
// 오래 쉰 뒤의 첫 진짜(g rest)는 rw 를 거르기 전에 따로 둔다(noteOf 는 rest 에 rw 를 적지 않으나 qa · ql 은 남김 — P6 fix 1 M-3).
import type {
  ClientListenEntry,
  DiscardNote,
} from "@/core/conversation/client-listen";
import { TALK_LOG_SEGMENTS } from "@/core/conversation/log";

/** 집계가 읽는 듣기 요약 칸(결과 종류 · 그 앞 버림 · 인식기 칸). */
export type QuietStatsListen = Pick<
  ClientListenEntry,
  "o" | "dc" | "cf" | "na" | "int" | "mx"
>;

/** 집계가 읽는 행 칸(talk_turns 의 화자 · 토막 · 입력 방식 · '모름' 출처 · client_listen.listens). 글 칸은 없다. */
export type QuietStatsRow = {
  speaker: "tori" | "child";
  segment: string;
  inputMode?: "speech" | "dont_know" | "quiet" | null | undefined;
  src?: "button" | "nospeech" | undefined;
  listens?: readonly QuietStatsListen[] | undefined;
  /**
   * 선생님 행이 고를 차례였는가(talk_turns.move 의 다음 차례 · 끝 줄에서 얻음): closing 마무리 물음 · suggestion 마무리 제안 · null 고를 차례
   * 아님. 칸이 없으면 모름(토막으로 읽음). 아이 행에는 쓰지 않는다.
   */
  choice?: "closing" | "suggestion" | null | undefined;
};

/**
 * 첫째 줄의 흐름. dead_first (ㄱ) · live_then_dead (ㄴ) · live_twice (ㄴ') 는 spec 설계 6 '흐름별 기대값' 표의 세 줄이다.
 * reopen_read_outside: rw quiet · g reopen · sr 참(다시 연 버림 뒤 세션 없이 읽음, 검토 장면 2b). self_end_before_sound: rw quiet · g live ·
 * why self_end · ql 거짓(조용함 버림이 소리 전에 저절로 끝남, 장면 6a). other_quiet: rw quiet 이나 위 어디에도 맞지 않음.
 * long_rest: g rest(45초 넘게 쉰 뒤 세션 없이 읽은 첫 진짜 — 잇달아 말한 수가 상한에 닿아 기다리는 차례 등, spec 160줄 (나)).
 * not_quiet_opened: dc 는 있으나 rw 가 quiet 가 아님(열린 죽은 버림에서 받은 quiet · 판정 뒤 숨김 · 마이크 확인 등). no_discard: dc 없음(버림 끔 · 켜지 않은 기기).
 */
export const QUIET_FLOWS = [
  "dead_first",
  "live_then_dead",
  "live_twice",
  "reopen_read_outside",
  "self_end_before_sound",
  "other_quiet",
  "long_rest",
  "not_quiet_opened",
  "no_discard",
] as const;
export type QuietFlow = (typeof QUIET_FLOWS)[number];

/** 한 줄의 수. deafRate 는 첫 진짜 가운데 '마이크 안 잡힘'의 비율(첫 진짜가 없으면 null). */
export type QuietLineStats = {
  firstReals: number;
  /** 마이크 안 잡힘(o deaf). */
  deaf: number;
  /** 들음(o result). */
  heard: number;
  /** 말소리 없음(o no-result · error:no-speech). */
  noSpeech: number;
  /** 그 밖(멈춤 · 끊김 · 다른 오류). */
  other: number;
  /** 다음 아이 차례에 듣기가 없었던 수(단추만 누름). */
  noFirstReal: number;
  deafRate: number | null;
};

/** 끄는 잣대의 수(spec 설계 6 권고값: 다섯 이상 · 20%포인트 초과 · 처음 셋). */
export type QuietOffCriteria = {
  /** 차이로 끄려면 첫째 줄의 첫 진짜가 이 수 이상. */
  minCount: number;
  /** 차이(첫째 줄 비율 − 둘째 줄 비율, %포인트)가 이 값을 넘으면 닿음. */
  marginPoints: number;
  /** 첫째 줄의 처음 이 수의 첫 진짜가 모두 '마이크 안 잡힘'이면 닿음. */
  firstRun: number;
};

export type QuietListenStats = {
  afterQuiet: QuietLineStats & { flows: Record<QuietFlow, QuietLineStats> };
  afterSpeech: QuietLineStats;
  afterHelpReadOutside: QuietLineStats;
  afterHelpAll: QuietLineStats;
  /** 첫째 줄 비율 − 둘째 줄 비율(%포인트). 어느 줄이든 첫 진짜가 없으면 null. */
  differencePoints: number | null;
  off: { reached: boolean; byMargin: boolean; byFirstRun: boolean };
  /**
   * 인식기 칸(spec 미결 11): 대화 토막 아이 행의 모든 듣기 가운데 들음(results) · 인식기 칸이 있는 듣기(withInfo — cf · na · int · mx 가운데
   * 하나라도 있음) · 중간 결과만으로 끝남(int 참) · 확정 결과와 중간 결과가 섞임(mx 참)의 수.
   */
  recognizer: {
    results: number;
    withInfo: number;
    interimOnly: number;
    mixed: number;
  };
};

type Outcome = "deaf" | "heard" | "noSpeech" | "other";

function outcomeOf(o: string): Outcome {
  if (o === "deaf") return "deaf";
  if (o === "result") return "heard";
  if (o === "no-result" || o === "error:no-speech") return "noSpeech";
  return "other";
}

type Tally = {
  deaf: number;
  heard: number;
  noSpeech: number;
  other: number;
  noFirstReal: number;
};

const emptyTally = (): Tally => ({
  deaf: 0,
  heard: 0,
  noSpeech: 0,
  other: 0,
  noFirstReal: 0,
});

function lineOf(t: Tally): QuietLineStats {
  const firstReals = t.deaf + t.heard + t.noSpeech + t.other;
  return {
    firstReals,
    deaf: t.deaf,
    heard: t.heard,
    noSpeech: t.noSpeech,
    other: t.other,
    noFirstReal: t.noFirstReal,
    deafRate: firstReals === 0 ? null : t.deaf / firstReals,
  };
}

/** 첫째 줄 첫 진짜의 흐름(dc.rw quiet 를 먼저 거름). */
export function quietFlowOf(dc: DiscardNote | undefined): QuietFlow {
  if (dc === undefined) return "no_discard";
  if (dc.g === "rest") return "long_rest";
  if (dc.rw !== "quiet") return "not_quiet_opened";
  if (dc.g === "reopen") {
    if (dc.sr === true) return "reopen_read_outside";
    if (dc.ql === false) return "dead_first";
    if (dc.ql === true) return "live_then_dead";
    return "other_quiet";
  }
  if (dc.g === "live") {
    if (dc.ql === true && dc.sr === true) return "live_twice";
    if (dc.why === "self_end" && dc.ql === false)
      return "self_end_before_sound";
  }
  return "other_quiet";
}

const DIALOGUE_SEGMENTS: ReadonlySet<string> = new Set(TALK_LOG_SEGMENTS);

type Line = "quiet" | "speech" | "help" | null;

/** 선생님 → 선생님(opener → teacher)이 '더 이야기하기' 입구인가. */
function isMoreEntry(opener: QuietStatsRow, teacher: QuietStatsRow): boolean {
  if (opener.choice !== undefined) return opener.choice !== null;
  return teacher.segment === opener.segment || teacher.segment === "more_talk";
}

/** i 번째 아이 행의 줄(아이 행 바로 앞 선생님 행의 바로 앞 행 하나로 가름). */
function lineAt(rows: readonly QuietStatsRow[], i: number): Line {
  const teacher = rows[i - 1];
  const opener = rows[i - 2];
  if (teacher === undefined || teacher.speaker !== "tori") return null;
  if (opener === undefined) return null;
  if (
    !DIALOGUE_SEGMENTS.has(teacher.segment) ||
    !DIALOGUE_SEGMENTS.has(opener.segment)
  )
    return null;
  if (opener.speaker === "tori")
    return isMoreEntry(opener, teacher) ? "help" : null;
  if (opener.inputMode === "quiet") return "quiet";
  if (opener.inputMode === "speech") return "speech";
  if (opener.inputMode === "dont_know" && opener.src === "button")
    return "help";
  return null;
}

function add(t: Tally, first: QuietStatsListen | undefined): void {
  if (first === undefined) t.noFirstReal += 1;
  else t[outcomeOf(first.o)] += 1;
}

/** 첫째 줄이 둘째 줄보다 marginPoints 를 넘게 높은가(정수 곱으로 견줌 — 소수 오차 없음). */
function overMargin(
  quiet: QuietLineStats,
  speech: QuietLineStats,
  marginPoints: number,
): boolean {
  if (quiet.firstReals === 0 || speech.firstReals === 0) return false;
  const lhs =
    (quiet.deaf * speech.firstReals - speech.deaf * quiet.firstReals) * 100;
  return lhs > marginPoints * quiet.firstReals * speech.firstReals;
}

/**
 * 세 줄의 수 · 첫째 줄 흐름 · 차이 · 끄는 잣대 · 인식기 칸 수. sessions 는 수업마다의 행 목록(행 차례대로)이고, 수업도 때 차례로 넘긴다
 * (끄는 잣대의 '처음 셋'은 이 차례로 센다). 어느 기기의 수업을 셀지는 부르는 쪽이 고른다.
 */
export function quietListenStatsOf(
  sessions: readonly (readonly QuietStatsRow[])[],
  criteria: QuietOffCriteria,
): QuietListenStats {
  const quiet = emptyTally();
  const flows = Object.fromEntries(
    QUIET_FLOWS.map((f) => [f, emptyTally()]),
  ) as Record<QuietFlow, Tally>;
  const speech = emptyTally();
  const helpOutside = emptyTally();
  const helpAll = emptyTally();
  const quietOrder: Outcome[] = [];
  const recognizer = { results: 0, withInfo: 0, interimOnly: 0, mixed: 0 };

  for (const rows of sessions) {
    rows.forEach((row, i) => {
      if (row.speaker !== "child" || !DIALOGUE_SEGMENTS.has(row.segment))
        return;
      const listens = row.listens ?? [];
      for (const l of listens) {
        if (l.o === "result") recognizer.results += 1;
        if (
          l.cf !== undefined ||
          l.na !== undefined ||
          l.int !== undefined ||
          l.mx !== undefined
        )
          recognizer.withInfo += 1;
        if (l.int === true) recognizer.interimOnly += 1;
        if (l.mx === true) recognizer.mixed += 1;
      }
      if (row.inputMode === "quiet") return;
      const first = listens[0];
      switch (lineAt(rows, i)) {
        case "quiet":
          add(quiet, first);
          if (first !== undefined) {
            add(flows[quietFlowOf(first.dc)], first);
            quietOrder.push(outcomeOf(first.o));
          }
          return;
        case "speech":
          add(speech, first);
          return;
        case "help":
          add(helpAll, first);
          // 첫 진짜가 없으면 sr 을 알 수 없으므로 셋째 줄에는 세지 않는다(넓은 줄의 noFirstReal 에만).
          if (first?.dc?.g === "discard" && first.dc.sr === true)
            add(helpOutside, first);
          return;
        case null:
          return;
      }
    });
  }

  const afterQuiet = lineOf(quiet);
  const afterSpeech = lineOf(speech);
  const differencePoints =
    afterQuiet.firstReals === 0 || afterSpeech.firstReals === 0
      ? null
      : ((afterQuiet.deaf * afterSpeech.firstReals -
          afterSpeech.deaf * afterQuiet.firstReals) *
          100) /
        (afterQuiet.firstReals * afterSpeech.firstReals);
  const byMargin =
    afterQuiet.firstReals >= criteria.minCount &&
    overMargin(afterQuiet, afterSpeech, criteria.marginPoints);
  const head = quietOrder.slice(0, criteria.firstRun);
  const byFirstRun =
    criteria.firstRun > 0 &&
    head.length === criteria.firstRun &&
    head.every((o) => o === "deaf");

  return {
    afterQuiet: {
      ...afterQuiet,
      flows: Object.fromEntries(
        QUIET_FLOWS.map((f) => [f, lineOf(flows[f])]),
      ) as Record<QuietFlow, QuietLineStats>,
    },
    afterSpeech,
    afterHelpReadOutside: lineOf(helpOutside),
    afterHelpAll: lineOf(helpAll),
    differencePoints,
    off: { reached: byMargin || byFirstRun, byMargin, byFirstRun },
    recognizer,
  };
}
