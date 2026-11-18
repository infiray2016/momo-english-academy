// 수업 안 '한국어로 물어보기'의 순수 판단(수업 안 한국어로 묻기 spec 판 3 설계 4 · 5 · plan 정한 것 10 · 접점 다 · 라, 13절 C221 · C225).
// 서버의 한국어 질문 길(server/conversation/ko-help.ts) · 화면 자료(server/conversation/index.ts) · 묶음 4-다 의 다음 영어 턴이 같은 함수를 쓴다.
// DB · AI 없음. talk_turns 의 행을 읽기만 하고 고치지 않는다 — 한국어 문답은 학습 셈 어디에도 들지 않는다(C221 · C226 (3), spec 설계 6).
import type { TalkKoHelpKind } from "@/core/ai/calls/talk-ko-help";

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
