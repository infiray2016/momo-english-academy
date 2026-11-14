// 회화 이야기 방식의 비교 도구(intent 2026-11-13-회화-대화-구조-R spec 설계 13 '비교 도구' · '일치 비율' · '직접 대조', plan 묶음 T3 · FR-9 · AC-9 · AC-20).
// 요청자가 '새 판정을 공식에 써도 되는가'(spec '정할 것' 3)를 정할 때 읽는 표를 만든다. 학습 근거 · 통과 · 승급의 입력이 아니다. 두 갈래다.
//  - 비교(기본): 이야기 방식 수업의 행(개발 · 프리뷰 DB 읽기 전용 거래 · 모의 수업 파일)을 읽어, 저장된 파생 값을 믿지 않고 행과 저장된 평가 출력으로
//    판정 함수(chatJudgesOf)를 다시 돌려 센다. 저장값과 다르면 그 행을 적는다(P4 재검토 I-3). 수업별 표 · 실제와 모의를 가른 합계 · 일치 비율 두 값
//    (고르기 답을 넣은 값 · 뺀 값, 단위는 (차례, 낱말) 쌍) · 분모 밖 수와 까닭 · 한쪽만의 낱말 무리(까닭 표지 · 출처 여섯 값 · 같은 소리 · 물음
//    낱말로 지은 문장 답) · 사람 판독 칸을 파일로 낸다.
//  - 대조(--against-lead, AC-20): 지금 새 방식(claude)의 기록(DB 의 실제 수업 · 실험 runs/N-*.jsonl 모의 수업)에 평가 호출을 돌려 같은 차례에서 공식
//    판정(said_words)과 '기존 꼴 said'를 맞댄다. 앞 선생님 차례의 행동은 공식 값이 아니라 평가 출력으로 만들고, 따라 할 문장 자리에는 그 기록의 값을
//    넣는다(P4 보고 5절). 기록을 고치지 않는다. 실제 AI 호출은 --call 이 있을 때만 하고, 부를 호출 수와 어림 비용을 먼저 낸다(없으면 계획만 낸다).
// 사용(워크트리 뿌리에서, Node 24): pnpm talk:compare --out <저장소 밖 폴더> [--db [--db-env <이름>]] [--mock <파일>] [--since <YYYY-MM-DD>] [--session <id 앞부분>]…
//        pnpm talk:compare --against-lead --out <폴더> [--db] [--runs <실험 runs 폴더>] [--call | --fake-ai]
// 출력 파일에는 아이 말 원문이 들어가므로 저장소 밖의 경로만 받는다(저장소 안이면 거부). 아이 이름 · 프로필 id · 접속 값은 내지 않는다(세션 id 는 앞
// 여덟 자, DB 수업의 글 칸은 그 프로필의 이름 가림을 한 번 더 건다). DB 는 읽기 전용 거래로만 읽고 접속 값은 환경 변수에서 받는다.
// 띄우기: node --conditions=react-server --import tsx — server-only 를 빈 모듈로 풀어 src/server 를 가져온다. 종료 코드: 0 냄, 2 인자 · 환경 · 읽기 오류.
// 순수 꼴(행 → 표 · 합계 · 무리 · 대조 표 · 인자 · 출력 자리 판단)을 내보내고 접속 · 호출 · 출력은 직접 실행될 때만 한다.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  type ChatEvalEntry,
  TALK_CHAT_EVAL_SYSTEM,
  type TalkChatEvalInput,
  type TalkChatEvalOutput,
  talkChatEvalInputOf,
  talkChatEvalUserMessage,
} from "../src/core/ai/calls/talk-chat-eval";
import { costOf, type PriceBook } from "../src/core/ai/cost";
import {
  CHAT_COMPARE_REASONS,
  CHAT_COMPARE_SOURCES,
  type ChatAgreement,
  type ChatCompareReason,
  type ChatCompareSource,
  type ChatCompareSummary,
  type ChatCompareTotal,
  type ChatPair,
  chatAgreementOf,
  chatCompareOf,
  chatCompareTotalsOf,
  chatTurnPairsOf,
} from "../src/core/conversation/chat-compare";
import {
  CHAT_PREV_MOVE_SOURCES,
  type ChatAppCategory,
  type ChatEvalFailure,
  type ChatEvalState,
  type ChatJudge,
  type ChatJudgeContext,
  type ChatJudgeInputKind,
  type ChatJudgeRow,
  type ChatPrevMoveSource,
  chatJudgeChangesOf,
  chatJudgesOf,
  childSkipOf,
  readChatJudge,
} from "../src/core/conversation/chat-judge";
import {
  type ChatInput,
  chatInputLineOf,
} from "../src/core/conversation/chat-message";
import { homophoneHeadOf } from "../src/core/conversation/child-kind";
import type { HintTier } from "../src/core/conversation/hints";
import { isLeadAskedSentence } from "../src/core/conversation/lead-turn-core";
import { readTalkMove } from "../src/core/conversation/move";
import { metWordsIn } from "../src/core/conversation/said";
import { splitSentences } from "../src/core/seed/text";
import { normalizeForMatch } from "../src/core/speech/match-rate";
import {
  chatJudgeRowsOf,
  chatLessonSayLostOf,
} from "../src/server/conversation/chat-eval";
import {
  type ChatTurnRowLike,
  chatChildInputOf,
  chatDialogRowsOf,
  chatSaidSayOf,
} from "../src/server/conversation/chat-hint";

/** 세션 id 를 내보일 때의 앞 글자 수(아이 · 프로필을 알아볼 수 없게, 브리프 5). */
const SESSION_ID_CHARS = 8;
/** 어림 입력 토큰의 글자 수(위쪽 어림 — 영어 글은 보통 토큰당 4 자 남짓이라 3 으로 크게 잡는다, 기술 값). */
const CHARS_PER_TOKEN_ESTIMATE = 3;
/** 실제 호출을 함께 보내는 수(기술 값 — 분당 한도에 걸리지 않을 만큼 작게). */
const CALL_CONCURRENCY = 4;
/** 평가 호출 구성을 읽는 단계(이야기 방식은 1~3단계에서만 돈다 — 그 구간의 한 단계, 기술 값). */
const EVAL_CONFIG_LEVEL = 3;
/** 사람 판독 칸의 머리(spec AC-9). */
const VERDICT_HEAD = "사람 판독(앱 쪽이 맞음 · 같음 · 기존 꼴 쪽이 맞음)";
/** 대조 갈래의 사람 판독 칸 머리(공식 · 평가 호출). */
const VERDICT_HEAD_LEAD =
  "사람 판독(앱 쪽이 맞음 · 같음 · 기존 꼴 쪽이 맞음 — 여기서 '앱 쪽'은 공식 판정, '기존 꼴'은 평가 호출)";

export function shortId(id: string): string {
  return id.slice(0, SESSION_ID_CHARS);
}

/** 글 칸 가림(DB 수업은 그 프로필의 이름 가림 — 없으면 그대로). */
export type TextMask = (text: string) => string;
const NO_MASK: TextMask = (text) => text;

// ── 공통 셈 꼴 ─────────────────────────────────────────────────────

/** 쌍 수와 둘 다 인정한 쌍 수(고르기 답을 넣은 값). */
export type PairCount = { pairs: number; agreed: number };

/** 판정 없음의 까닭별 수(까닭을 모르는 옛 값은 unknown). */
export type FailureCounts = Record<ChatEvalFailure | "unknown", number>;

function emptyFailures(): FailureCounts {
  return { timeout: 0, invalid: 0, other: 0, unknown: 0 };
}

function emptyBySource(): Record<ChatPrevMoveSource, PairCount> {
  return Object.fromEntries(
    CHAT_PREV_MOVE_SOURCES.map((s) => [s, { pairs: 0, agreed: 0 }]),
  ) as Record<ChatPrevMoveSource, PairCount>;
}

function addPairs(into: PairCount, from: PairCount): void {
  into.pairs += from.pairs;
  into.agreed += from.agreed;
}

/** 키 차례를 가리지 않는 견줌용 글(jsonb 를 거친 값은 키 차례가 바뀐다). */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** 한 차례 쌍의 고르기 답 표지(chatCompareOf 의 entryOf 와 같은 길: 글자가 같은 앱 낱말 먼저, 없으면 같은 소리 대표 낱말이 같은 앱 낱말). */
function appEntryOf(
  judge: ChatJudge,
  word: string,
  head: (w: string) => string,
) {
  return (
    judge.app.words.find((w) => w.word === word) ??
    judge.app.words.find((w) => head(w.word) === head(word))
  );
}

// ── 비교 갈래: 수업별 표(AC-9 도구 몫) ─────────────────────────────────

/** 비교에 넣는 수업 하나. rows 는 그 수업의 talk_turns 행(차례 그대로가 아니어도 된다 — 대화 토막 행을 대화 차례로 고른다). */
export type CompareLesson = {
  sessionId: string;
  source: ChatCompareSource;
  rows: readonly ChatTurnRowLike[];
  ctx: ChatJudgeContext;
  /** 그 수업의 만남 낱말(표지 행에 적힌 값, 없으면 부르는 쪽이 셈). */
  met: readonly string[];
  /** 닫힐 때 쓴 비교 표지 행의 요약(없으면 null). 다시 센 요약과 다른지만 본다. */
  storedMark: ChatCompareSummary | null;
  mask?: TextMask;
};

/**
 * 한쪽만의 낱말 무리(서로 겹치지 않음): 까닭 표지가 하나라도 있는 낱말(reason — 표지별 수는 reasonCounts 에 따로, 까닭이 여럿이면 각각 셈)과 까닭
 * 없는 낱말의 세 무리 — 물음 낱말로 지은 문장 답(spec 8-3 보류 규칙이 보류로 두는 초보 아이의 흔한 답) · 같은 소리 · 나머지. 네 무리의 합이 한쪽만
 * 인정한 쌍 수다.
 */
export const COMPARE_KINDS = [
  "reason",
  "question_words_answer",
  "homophone",
  "no_reason",
] as const;
export type CompareKind = (typeof COMPARE_KINDS)[number];

/** 사람 판독 줄: 한쪽만 인정한 (차례, 낱말) 하나. verdict 는 사람이 채우는 빈 칸이다. */
export type CompareHumanRow = {
  session: string;
  source: ChatCompareSource;
  turnNo: number;
  word: string;
  side: "legacy_only" | "app_only";
  category: ChatAppCategory | null;
  reasons: ChatCompareReason[];
  prevMove: ChatPrevMoveSource | null;
  kind: CompareKind;
  teacherSay: string;
  listenSentence: string | null;
  heard: string;
  verdict: "";
};

/** 부르지 않음의 까닭(아이 입력 갈래). speech 는 말 입력인데 부르지 않음으로 저장된 행(부르는 쪽의 어긋남)이다. */
export type NotCalledCounts = Record<
  "dont_know" | "not_heard" | "quiet" | "speech",
  number
>;

export type ChatLessonTable = {
  session: string;
  source: ChatCompareSource;
  /** 다시 센 요약(chatCompareOf — 쌍의 행 번호는 아이 행의 차례 번호, 표지 행과 같은 꼴). */
  summary: ChatCompareSummary;
  /** 앞 선생님 행동의 출처 여섯 값별 쌍 수(고르기 답을 넣은 값). */
  bySource: Record<ChatPrevMoveSource, PairCount>;
  /** 저장된 chat_judge 와 다시 센 값이 다른 아이 행(다른 부분: app · legacy, 저장값이 없거나 읽지 못하면 missing). */
  stale: { turnNo: number; parts: ("app" | "legacy" | "missing")[] }[];
  /** 표지 행 요약과 다시 센 요약이 다른가(표지 행이 없으면 null). */
  markDiffers: boolean | null;
  failed: FailureCounts;
  notCalled: NotCalledCounts;
  waiting: number;
  human: CompareHumanRow[];
  /** 대화 기록 글이 없고 뺀 문장이 있어 선생님 말을 다시 세운 선생님 행 수(닫힌 수업). */
  rebuiltTeachers: number;
  /** 원문이 지워져 선생님 말을 다시 세울 수 없는 수업(chatLessonSayLostOf) — 합계에서 뺀다. */
  sayLost: boolean;
};

/** 대화 기록 글이 없고 뺀 문장(이야기 방식 move.chat.removed · 지금 새 방식 move.lead.removed)이 있는 선생님 행 수 — 선생님 말을 다시 세운 행. */
function rebuiltTeachersOf(rows: readonly ChatTurnRowLike[]): number {
  return chatDialogRowsOf(rows).filter((row) => {
    if (row.speaker !== "tori" || row.toriRewrite !== null) return false;
    const move = readTalkMove(row.move);
    return (move?.chat?.removed ?? move?.lead?.removed ?? []).length > 0;
  }).length;
}

type DialogChild = {
  row: ChatTurnRowLike;
  teacher: { say: string; listenSentence: string | null } | null;
};

/** 아이 말의 낱말 수: 정규화한 낱말에서 판정 모듈이 아이 말에서 빼는 군말 · please · 선생님 이름(childSkipOf)을 뺀 수. */
function childWordCountOf(heard: string, ctx: ChatJudgeContext): number {
  const skip = childSkipOf(ctx);
  return normalizeForMatch(heard, []).filter((w) => !skip.has(w)).length;
}

/** 선생님 말에서 이 낱말(같은 소리 대표 낱말까지)이 든 문장 가운데 물음 문장이 있는가(지금 새 방식 기록이 보는 물음 판별). */
function inAskedSentence(
  say: string,
  word: string,
  ctx: ChatJudgeContext,
  head: (w: string) => string,
): boolean {
  return splitSentences(say).some(
    (sentence) =>
      isLeadAskedSentence(sentence) &&
      metWordsIn(sentence, ctx).some((w) => head(w) === head(word)),
  );
}

function kindOf({
  side,
  category,
  reasons,
  word,
  heard,
  say,
  sameRow,
  ctx,
  head,
}: {
  side: CompareHumanRow["side"];
  category: ChatAppCategory | null;
  reasons: readonly ChatCompareReason[];
  word: string;
  heard: string;
  say: string;
  sameRow: readonly { word: string; side: CompareHumanRow["side"] }[];
  ctx: ChatJudgeContext;
  head: (w: string) => string;
}): CompareKind {
  if (reasons.length > 0) return "reason";
  // 같은 소리: 들린 글에 글자 · 원형으로 들지 않은 낱말(같은 소리로만 이음), 또는 같은 차례 반대쪽에 같은 소리 대표 낱말이 있는 낱말
  const literal = metWordsIn(heard, ctx).includes(word);
  const mate = sameRow.some(
    (o) => o.side !== side && o.word !== word && head(o.word) === head(word),
  );
  if (!literal || mate) return "homophone";
  // 물음 낱말로 지은 문장 답: 앱이 보류(echoed_word)하고 기존 꼴만 인정한 두 낱말 이상의 말이고, 앞 선생님 말에서 그 낱말이 든 문장이 물음
  if (
    side === "legacy_only" &&
    category === "echoed_word" &&
    childWordCountOf(heard, ctx) >= 2 &&
    inAskedSentence(say, word, ctx, head)
  )
    return "question_words_answer";
  return "no_reason";
}

/**
 * 한 수업의 표: 행과 저장된 평가 출력으로 판정을 다시 세고(chatJudgeRowsOf → chatJudgesOf), 저장값과 다른 행을 적고(chatJudgeChangesOf), 다시 센
 * 판정으로 비교 요약 · 출처별 쌍 수 · 분모 밖 수와 까닭 · 사람 판독 줄을 낸다. 행을 고치지 않는다.
 */
export function chatLessonTableOf(lesson: CompareLesson): ChatLessonTable {
  const { ctx, source } = lesson;
  const mask = lesson.mask ?? NO_MASK;
  const head = homophoneHeadOf(ctx.homophones);
  const judged = chatJudgeRowsOf(lesson.rows, ctx.spec);
  const byId = new Map(lesson.rows.map((row) => [row.id, row]));
  // 판정 행 번호 → 대화 행과 그 앞 선생님 행
  const children = new Map<number, DialogChild>();
  let teacher: DialogChild["teacher"] = null;
  judged.rows.forEach((row, at) => {
    if (row.role === "teacher") {
      teacher = { say: row.say, listenSentence: row.listenSentence };
      return;
    }
    const raw = byId.get(judged.ids[at] ?? "");
    if (raw !== undefined) children.set(at, { row: raw, teacher });
  });
  const turnOf = (at: number) => children.get(at)?.row.turnNo ?? at;
  const fresh = chatJudgesOf(judged.rows, ctx);
  const stale = chatJudgeChangesOf({
    rows: judged.rows,
    stored: judged.stored,
    ctx,
  }).map(({ row, judge }) => {
    const before = readChatJudge(judged.stored.get(row) ?? null);
    const parts: ("app" | "legacy" | "missing")[] =
      before === null
        ? ["missing"]
        : (["app", "legacy"] as const).filter(
            (k) => canonical(before[k]) !== canonical(judge[k]),
          );
    return { turnNo: turnOf(row), parts };
  });
  const rows = fresh.map(({ row, judge }) => ({ row: turnOf(row), judge }));
  const summary = chatCompareOf({
    rows,
    met: lesson.met,
    source,
    homophones: ctx.homophones,
  });
  const bySource = emptyBySource();
  for (const from of CHAT_PREV_MOVE_SOURCES) {
    const part = rows.filter(({ judge }) => judge.legacy.prevMove === from);
    if (part.length === 0) continue;
    const { withChoice } = chatCompareOf({
      rows: part,
      met: [],
      source,
      homophones: ctx.homophones,
    }).agreement;
    bySource[from] = { pairs: withChoice.pairs, agreed: withChoice.agreed };
  }
  const failed = emptyFailures();
  const notCalled: NotCalledCounts = {
    dont_know: 0,
    not_heard: 0,
    quiet: 0,
    speech: 0,
  };
  let waiting = 0;
  const judgeByTurn = new Map<number, { at: number; judge: ChatJudge }>();
  for (const { row: at, judge } of fresh) {
    judgeByTurn.set(turnOf(at), { at, judge });
    const { status } = judge.legacy;
    if (status === "failed") failed[judge.legacy.failure ?? "unknown"] += 1;
    if (status === "waiting") waiting += 1;
    if (status === "not_called") {
      const raw = children.get(at)?.row;
      const kind = raw === undefined ? "speech" : chatChildInputOf(raw).kind;
      notCalled[kind === "speech" ? "speech" : kind] += 1;
    }
  }
  const human: CompareHumanRow[] = summary.oneSide.map((one) => {
    const found = judgeByTurn.get(one.row);
    const child = found === undefined ? undefined : children.get(found.at);
    const heard = (child?.row.text ?? "").trim();
    const sameRow = summary.oneSide.filter((o) => o.row === one.row);
    return {
      session: shortId(lesson.sessionId),
      source,
      turnNo: one.row,
      word: one.word,
      side: one.side,
      category: one.category,
      reasons: one.reasons,
      prevMove: found?.judge.legacy.prevMove ?? null,
      kind: kindOf({
        side: one.side,
        category: one.category,
        reasons: one.reasons,
        word: one.word,
        heard,
        say: child?.teacher?.say ?? "",
        sameRow,
        ctx,
        head,
      }),
      teacherSay: mask(child?.teacher?.say ?? ""),
      listenSentence:
        child?.teacher?.listenSentence == null
          ? null
          : mask(child.teacher.listenSentence),
      heard: mask(heard),
      verdict: "",
    };
  });
  return {
    session: shortId(lesson.sessionId),
    source,
    summary,
    bySource,
    stale,
    markDiffers:
      lesson.storedMark === null
        ? null
        : canonical(lesson.storedMark) !== canonical(summary),
    failed,
    notCalled,
    waiting,
    human,
    rebuiltTeachers: rebuiltTeachersOf(lesson.rows),
    sayLost: chatLessonSayLostOf(lesson.rows),
  };
}

export type ChatCompareReport = {
  tables: ChatLessonTable[];
  /** 실제 · 모의 합계(두 가름을 더한 값은 내지 않는다). */
  totals: Record<ChatCompareSource, ChatCompareTotal>;
  /** 한쪽만의 낱말 네 무리(겹치지 않음 — 합이 한쪽만 인정한 쌍 수). */
  kinds: Record<ChatCompareSource, Record<CompareKind, number>>;
  /** 까닭 표지별 수(까닭이 여럿인 낱말은 각각 셈 — 합이 reason 무리보다 클 수 있음). */
  reasonCounts: Record<ChatCompareSource, Record<ChatCompareReason, number>>;
  bySource: Record<ChatCompareSource, Record<ChatPrevMoveSource, PairCount>>;
  failed: Record<ChatCompareSource, FailureCounts>;
  notCalled: Record<ChatCompareSource, NotCalledCounts>;
  /** 저장값과 다시 센 값이 다른 아이 행 수 · 표지 행이 다른 수업 수 · 선생님 말을 다시 세운 선생님 행 수. */
  stale: Record<
    ChatCompareSource,
    { rows: number; marks: number; rebuiltTeachers: number }
  >;
  /** 원문이 지워져 다시 세울 수 없어 표 · 합계에서 뺀 수업(세션 앞 여덟 자). */
  lost: Record<ChatCompareSource, string[]>;
};

function perSource<T>(make: () => T): Record<ChatCompareSource, T> {
  return { real: make(), mock: make() };
}

function zeros<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

/** 수업별 표들의 합계(실제 · 모의 따로 — 일치 비율은 쌍 수를 더해 다시 낸다). */
export function chatCompareReportOf(
  tables: readonly ChatLessonTable[],
): ChatCompareReport {
  const kinds = perSource(() => zeros(COMPARE_KINDS));
  const reasonCounts = perSource(() => zeros(CHAT_COMPARE_REASONS));
  const bySource = perSource(emptyBySource);
  const failed = perSource(emptyFailures);
  const notCalled = perSource<NotCalledCounts>(() => ({
    dont_know: 0,
    not_heard: 0,
    quiet: 0,
    speech: 0,
  }));
  const stale = perSource(() => ({ rows: 0, marks: 0, rebuiltTeachers: 0 }));
  const lost = perSource<string[]>(() => []);
  const kept = tables.filter((t) => {
    if (t.sayLost) lost[t.source].push(t.session);
    return !t.sayLost;
  });
  for (const t of kept) {
    for (const h of t.human) {
      kinds[t.source][h.kind] += 1;
      for (const r of h.reasons) reasonCounts[t.source][r] += 1;
    }
    for (const s of CHAT_PREV_MOVE_SOURCES)
      addPairs(bySource[t.source][s], t.bySource[s]);
    for (const k of Object.keys(t.failed) as (keyof FailureCounts)[])
      failed[t.source][k] += t.failed[k];
    for (const k of Object.keys(t.notCalled) as (keyof NotCalledCounts)[])
      notCalled[t.source][k] += t.notCalled[k];
    stale[t.source].rows += t.stale.length;
    stale[t.source].rebuiltTeachers += t.rebuiltTeachers;
    if (t.markDiffers === true) stale[t.source].marks += 1;
  }
  return {
    tables: kept,
    totals: chatCompareTotalsOf(kept.map((t) => t.summary)),
    kinds,
    reasonCounts,
    bySource,
    failed,
    notCalled,
    stale,
    lost,
  };
}

// ── 표 글(markdown) ─────────────────────────────────────────────────

function cell(text: string | number | null): string {
  if (text === null) return "-";
  return String(text)
    .replace(/\|/g, "\\|")
    .replace(/\s*\n\s*/g, " ");
}

function ratioText(value: {
  pairs: number;
  agreed: number;
  ratio?: number | null;
}): string {
  if (value.pairs === 0) return "-(쌍 0)";
  const ratio = value.ratio ?? value.agreed / value.pairs;
  return `${value.agreed}/${value.pairs} (${(ratio * 100).toFixed(1)}%)`;
}

const SOURCE_NAME: Record<ChatCompareSource, string> = {
  real: "실제 수업",
  mock: "모의 수업",
};

function countLine(
  name: string,
  counts: Readonly<Record<string, number>>,
): string {
  return `- ${name}: ${Object.entries(counts)
    .map(([k, v]) => `${k} ${v}`)
    .join(" · ")}`;
}

/** 비교 갈래의 파일 글. */
export function chatCompareMarkdownOf(report: ChatCompareReport): string {
  const out: string[] = [
    "# 이야기 방식 비교(앱 판정 · 기존 꼴 판정)",
    "",
    "일치 비율의 단위는 (아이 차례, 단원 단어) 쌍이다. 분모는 어느 한쪽이라도 인정한 쌍, 분자는 둘 다 인정한 쌍이다. 판정 없음 · 기다림 · 부르지 않음 차례는 분모 밖이다. 표는 저장된 파생 값이 아니라 행과 저장된 평가 출력으로 다시 센 값이다.",
    "",
    "- 저장값과 다른 행이 있으면 먼저 다시 세운 선생님 행 수를 봅니다(닫힌 수업의 선생님 말을 다시 세운 때문인지, 늦게 온 평가 값의 반영이 어긋난 때문인지 가르기 위해서입니다).",
    "",
  ];
  for (const source of CHAT_COMPARE_SOURCES) {
    const total = report.totals[source];
    const lost = report.lost[source];
    out.push(
      `## ${SOURCE_NAME[source]} 합계(수업 ${total.lessons})`,
      "",
      `- 원문이 지워져 다시 세울 수 없는 수업(표 · 합계 밖): ${lost.length}${lost.length > 0 ? `(${lost.join(", ")})` : ""}`,
    );
    if (total.lessons === 0) {
      out.push("- 수업 없음", "");
      continue;
    }
    out.push(
      `- 일치 비율(고르기 답을 넣은 값): ${ratioText(total.agreement.withChoice)}`,
      `- 일치 비율(고르기 답을 뺀 값): ${ratioText(total.agreement.withoutChoice)}`,
      countLine("아이 차례", total.counts),
      `- 한쪽만의 쌍: ${total.oneSide}`,
      `- 선생님 말을 다시 세운 선생님 행(대화 기록 글이 없고 뺀 문장이 있음): ${report.stale[source].rebuiltTeachers}`,
      countLine("판정 없음의 까닭", report.failed[source]),
      countLine("부르지 않음의 까닭(입력 갈래)", report.notCalled[source]),
      `- 저장값과 다시 센 값이 다른 아이 행: ${report.stale[source].rows} · 표지 행과 다른 수업: ${report.stale[source].marks}`,
      "",
      "### 한쪽만의 낱말 무리(서로 겹치지 않음)",
      "",
      "| 무리 | 수 |",
      "|---|---|",
      ...COMPARE_KINDS.map((k) => `| ${k} | ${report.kinds[source][k]} |`),
      "",
      `- 합: 까닭 있는 낱말 ${report.kinds[source].reason} + 물음 낱말 문장 답 ${report.kinds[source].question_words_answer} + 같은 소리 ${report.kinds[source].homophone} + 나머지 ${report.kinds[source].no_reason} = ${COMPARE_KINDS.reduce((a, k) => a + report.kinds[source][k], 0)}(한쪽만 인정한 쌍 ${total.oneSide})`,
      "",
      "까닭 표지별 수(까닭이 여럿이면 각각 셉니다 — 그래서 합이 위의 '까닭 있는 낱말'보다 클 수 있습니다):",
      "",
      "| 까닭 표지 | 수 |",
      "|---|---|",
      ...CHAT_COMPARE_REASONS.map(
        (r) => `| ${r} | ${report.reasonCounts[source][r]} |`,
      ),
      "",
      "### 앞 선생님 행동의 출처별 일치(고르기 답을 넣은 값)",
      "",
      "| 출처 | 일치 |",
      "|---|---|",
      ...CHAT_PREV_MOVE_SOURCES.map(
        (s) => `| ${s} | ${ratioText(report.bySource[source][s])} |`,
      ),
      "",
    );
  }
  out.push(
    "## 수업별 표",
    "",
    "| 세션 | 가름 | 아이 차례 | 있음 | 판정 없음 | 기다림 | 부르지 않음 | 일치(넣음) | 일치(뺌) | 한쪽만 | 같은 낱말 | 만남 | 다시 센 값과 다른 행 | 다시 세운 선생님 행 | 표지 행과 다름 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  );
  for (const t of report.tables) {
    const s = t.summary;
    out.push(
      `| ${t.session} | ${t.source} | ${s.counts.childTurns} | ${s.counts.done} | ${s.counts.failed} | ${s.counts.waiting} | ${s.counts.notCalled} | ${ratioText(s.agreement.withChoice)} | ${ratioText(s.agreement.withoutChoice)} | ${s.oneSide.length} | ${cell(s.same.join(", "))} | ${cell(s.met.join(", "))} | ${cell(t.stale.map((x) => `${x.turnNo}(${x.parts.join("+")})`).join(", "))} | ${t.rebuiltTeachers} | ${t.markDiffers === null ? "표지 행 없음" : t.markDiffers ? "다름" : "같음"} |`,
    );
  }
  out.push(
    "",
    "## 한쪽만의 낱말(사람 판독)",
    "",
    `| 세션 | 가름 | 차례 | 낱말 | 한쪽 | 앱 갈래 | 까닭 · 무리 | 앞 행동 출처 | 선생님 말 | 따라 할 문장 | 들린 글 | ${VERDICT_HEAD} |`,
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
  );
  for (const t of report.tables)
    for (const h of t.human)
      out.push(
        `| ${h.session} | ${h.source} | ${h.turnNo} | ${cell(h.word)} | ${h.side} | ${cell(h.category)} | ${cell([h.kind, ...h.reasons].join(", "))} | ${cell(h.prevMove)} | ${cell(h.teacherSay)} | ${cell(h.listenSentence)} | ${cell(h.heard)} |  |`,
      );
  return `${out.join("\n")}\n`;
}

// ── 대조 갈래 --against-lead(AC-20) ──────────────────────────────────

/** 지금 새 방식 수업 행(talk_turns): 판정 행 칸 + 공식 판정 · 힌트 칸. */
export type LeadRowLike = ChatTurnRowLike & {
  saidWords: string[] | null;
  hintKind: string | null;
  heardHelp: string | null;
};

/** 공식 판정(그 아이 차례 뒤 대화 호출의 기록): said_words 와 그 호출의 reading · move. */
export type LeadOfficial = { said: string[]; reading: string; move: string };

export type LeadTeacherTurn = {
  role: "teacher";
  turnNo: number;
  say: string;
  /** 그 기록의 따라 할 문장(맞음 — say 에 든 것만). */
  listenSentence: string | null;
  closing: boolean;
  first: boolean;
};

export type LeadChildTurn = {
  role: "child";
  turnNo: number;
  input: ChatJudgeInputKind;
  heard: string;
  /** 이 차례에 연 힌트 단의 종류(기록의 hint_level · hint_kind · heard_help 로 되짚은 값). */
  opened: HintTier["kind"][];
  /** 대화 호출의 공식 판정(없으면 null — 인사 답처럼 대화 호출이 판정하지 않은 차례). */
  official: LeadOfficial | null;
};

export type LeadLesson = {
  id: string;
  source: ChatCompareSource;
  ctx: ChatJudgeContext;
  turns: (LeadTeacherTurn | LeadChildTurn)[];
  mask?: TextMask;
  /** 원문이 지워져 선생님 말을 다시 세울 수 없는 수업(chatLessonSayLostOf) — 대조 표 · 합계에서 뺀다. 실험 기록은 늘 거짓. */
  sayLost: boolean;
  /** 선생님 말을 다시 세운 선생님 행 수(rebuiltTeachersOf — 닫힌 DB 수업, 뺀 문장이 말 끝에 붙음). 실험 기록은 늘 0(재검토 N-1). */
  rebuiltTeachers: number;
};

/**
 * 연 힌트 단의 종류를 기록에서 되짚는다(대조의 기존 꼴 힌트 칸이 쓰는 재료 — 힌트 종류 판단은 '영어 단이 하나라도 열림 · 뜻만 열림'만 본다).
 * 들은 도움이 없으면 공식 힌트 종류가 연 단만의 값이라 그것으로 정하고, 들은 도움이 있으면 1~3단계 단 차례(뜻 단이 맨 앞)로 본다(hasKo).
 */
export function leadOpenedOf({
  hintLevel,
  hintKind,
  heardHelp,
  hasKo,
}: {
  hintLevel: number | null;
  hintKind: string | null;
  heardHelp: string | null;
  hasKo: boolean;
}): HintTier["kind"][] {
  const level = hintLevel ?? 0;
  if (level <= 0) return [];
  const fill = (n: number, kind: HintTier["kind"]) =>
    Array.from({ length: n }, () => kind);
  if (heardHelp === null || heardHelp === "none") {
    if (hintKind === "meaning_only") return fill(level, "ko");
    if (hintKind === "english")
      return level === 1
        ? ["sentence"]
        : ["ko", ...fill(level - 1, "sentence")];
  }
  return hasKo
    ? ["ko", ...fill(level - 1, "sentence")]
    : fill(level, "sentence");
}

function hasKoOf(aiQuestion: unknown): boolean {
  if (aiQuestion === null || typeof aiQuestion !== "object") return true;
  const hintKo = (aiQuestion as { hintKo?: unknown }).hintKo;
  return typeof hintKo === "string" ? hintKo.trim() !== "" : true;
}

/**
 * DB 의 지금 새 방식 수업 행 → 대조 수업. 대화 토막 행만 대화 차례로(chatDialogRowsOf). 선생님 행은 나간 say(대화 기록 글의 say) · 따라 할 문장
 * (move.lead.model 이 say 에 든 때) · 마무리 · 첫 질문. 아이 행의 공식 판정은 바로 뒤 선생님 행이 대화 호출의 행(move.lead)이고 첫 질문이 아니며 인사
 * 토막 밖일 때만이다(첫 질문은 입구 차례라 아이 판정이 없다).
 */
export function leadLessonOfRows({
  id,
  source,
  rows,
  ctx,
  mask,
}: {
  id: string;
  source: ChatCompareSource;
  rows: readonly LeadRowLike[];
  ctx: ChatJudgeContext;
  mask?: TextMask;
}): LeadLesson {
  const dialog = chatDialogRowsOf(rows);
  const turns: LeadLesson["turns"] = [];
  let prevTeacher: LeadRowLike | null = null;
  dialog.forEach((row, at) => {
    if (row.speaker === "tori") {
      const move = readTalkMove(row.move);
      const model = move?.lead?.model;
      turns.push({
        role: "teacher",
        turnNo: row.turnNo,
        say: chatSaidSayOf(row),
        listenSentence: model?.inSay === true ? model.sentence : null,
        closing: move?.kind === "closing_slot",
        first: move?.kind === "first_question",
      });
      prevTeacher = row;
      return;
    }
    const input = chatChildInputOf(row);
    const next = dialog[at + 1];
    const nextMove = next?.speaker === "tori" ? readTalkMove(next.move) : null;
    const lead = nextMove?.lead;
    const judged =
      lead !== undefined &&
      nextMove?.kind !== "first_question" &&
      row.segment !== "greeting";
    turns.push({
      role: "child",
      turnNo: row.turnNo,
      input: input.kind,
      heard: input.kind === "speech" ? input.heard : "",
      opened: leadOpenedOf({
        hintLevel: row.hintLevel,
        hintKind: row.hintKind,
        heardHelp: row.heardHelp,
        hasKo: hasKoOf((prevTeacher as LeadRowLike | null)?.aiQuestion ?? null),
      }),
      official:
        judged && lead !== undefined
          ? {
              said: [...(row.saidWords ?? [])],
              reading: lead.reading,
              move: lead.move,
            }
          : null,
    });
  });
  return {
    id,
    source,
    ctx,
    turns,
    sayLost: chatLessonSayLostOf(rows),
    rebuiltTeachers: rebuiltTeachersOf(rows),
    ...(mask ? { mask } : {}),
  };
}

const RunChildSchema = z.object({
  text: z.string().nullable().optional(),
  saidWords: z.array(z.string()).nullable().optional(),
  hintKind: z.string().nullable().optional(),
  hintLevel: z.number().nullable().optional(),
  heardHelp: z.string().nullable().optional(),
});
const RunLeadSchema = z.object({
  kind: z.string().optional(),
  closing: z.boolean().optional(),
  reading: z.string(),
  move: z.string(),
  say: z.string().optional(),
  sound: z.object({ model: z.string().optional() }).passthrough().optional(),
  child: RunChildSchema.nullable().optional(),
});
const RunTeacherSchema = z.object({
  type: z.literal("teacher_turn"),
  childTurn: z.number(),
  final: z.string().nullable().optional(),
  lead: RunLeadSchema.nullable().optional(),
});
const RunChildTurnSchema = z.object({
  type: z.literal("child_turn"),
  childTurn: z.number(),
  action: z.string(),
  heard: z.string().nullable().optional(),
});

/**
 * 실험 기록(runs/N-*.jsonl — 지금 새 방식 팔의 대본 실행, 모의 수업) → 대조 수업. 선생님 차례는 teacher_turn(say 는 기록의 lead.say, 고정 차례는
 * final), 따라 할 문장은 소리 줄로 낸 문장(lead.sound.model), 아이 차례는 child_turn(speak 는 들린 글, dont_know 는 단추, silent 는 듣지 못함).
 * 공식 판정은 그 아이 차례 바로 뒤 teacher_turn 의 lead.child 가 있을 때만이다.
 */
export function leadLessonOfRun({
  id,
  records,
  ctx,
}: {
  id: string;
  records: readonly unknown[];
  ctx: ChatJudgeContext;
}): LeadLesson {
  const turns: LeadLesson["turns"] = [];
  for (const record of records) {
    const teacher = RunTeacherSchema.safeParse(record);
    if (teacher.success) {
      const t = teacher.data;
      const lead = t.lead ?? null;
      const last = turns.at(-1);
      if (lead?.child && last?.role === "child") {
        last.official = {
          said: [...(lead.child.saidWords ?? [])],
          reading: lead.reading,
          move: lead.move,
        };
        last.opened = leadOpenedOf({
          hintLevel: lead.child.hintLevel ?? null,
          hintKind: lead.child.hintKind ?? null,
          heardHelp: lead.child.heardHelp ?? null,
          hasKo: true,
        });
      }
      const say = lead?.say ?? (t.final ?? "").replace(/\s*\n\s*/g, " ").trim();
      turns.push({
        role: "teacher",
        turnNo: t.childTurn,
        say,
        listenSentence: lead?.sound?.model ?? null,
        closing: lead?.closing === true,
        first: lead?.kind === "first_question",
      });
      continue;
    }
    const child = RunChildTurnSchema.safeParse(record);
    if (!child.success) continue;
    const c = child.data;
    const heard = (c.heard ?? "").trim();
    const input: ChatJudgeInputKind =
      c.action === "dont_know"
        ? "dont_know"
        : c.action === "speak" && heard !== ""
          ? "speech"
          : "not_heard";
    turns.push({
      role: "child",
      turnNo: c.childTurn,
      input,
      heard: input === "speech" ? heard : "",
      opened: [],
      official: null,
    });
  }
  return { id, source: "mock", ctx, turns, sayLost: false, rebuiltTeachers: 0 };
}

function chatInputOfTurn(turn: LeadChildTurn): ChatInput {
  return turn.input === "speech"
    ? { kind: "speech", heard: turn.heard }
    : { kind: turn.input };
}

/** 평가 입력의 기록 꼴: 선생님은 나간 say, 아이는 이야기 방식의 입력 줄(지금 새 방식의 사실 줄 · 상태 줄은 싣지 않는다). */
function leadEntriesOf(lesson: LeadLesson): ChatEvalEntry[] {
  return lesson.turns.map((turn) =>
    turn.role === "teacher"
      ? { speaker: "teacher", say: turn.say }
      : { speaker: "child", message: chatInputLineOf(chatInputOfTurn(turn)) },
  );
}

/**
 * 부를 평가 호출: 말 입력 아이 차례마다 하나(공식 판정이 없는 차례도 — 다음 차례의 앞 선생님 행동을 평가 출력으로 만들어야 하므로, 이야기 방식에서
 * 서버가 부르는 차례와 같다). at 은 turns 의 번호다. contextTurns 는 talk.chat_eval_context_turns.
 */
export function leadEvalPlanOf(
  lesson: LeadLesson,
  contextTurns: number,
): { at: number; input: TalkChatEvalInput }[] {
  const entries = leadEntriesOf(lesson);
  return lesson.turns.flatMap((turn, at) =>
    turn.role === "child" && turn.input === "speech"
      ? [
          {
            at,
            input: talkChatEvalInputOf({
              entries,
              at,
              contextTurns,
              unitWords: lesson.ctx.unitWords,
            }),
          },
        ]
      : [],
  );
}

/** 평가 호출 하나의 결과(실패는 판정 없음의 까닭). */
export type LeadEvalResult =
  | { ok: true; output: TalkChatEvalOutput }
  | { ok: false; failure: ChatEvalFailure };

export type LeadHumanRow = {
  session: string;
  source: ChatCompareSource;
  turnNo: number;
  word: string;
  side: "official_only" | "legacy_only";
  choice: boolean;
  prevMove: ChatPrevMoveSource | null;
  teacherSay: string;
  listenSentence: string | null;
  heard: string;
  official: { reading: string; move: string };
  evaluated: { reading: string; move: string };
  verdict: "";
};

export type LeadAgainstTable = {
  session: string;
  source: ChatCompareSource;
  /** 원문이 지워져 다시 세울 수 없는 수업(합계에서 뺀다). */
  sayLost: boolean;
  /** 선생님 말을 다시 세운 선생님 행 수(실제 수업만, 재검토 N-1). */
  rebuiltTeachers: number;
  agreement: ChatAgreement;
  /** 쌍(합계를 쌍 수로 다시 내려고 둔다). */
  pairs: ChatPair[];
  counts: {
    childTurns: number;
    /** 공식 판정이 있는 차례. */
    official: number;
    /** 공식 판정 · 평가 출력이 함께 있어 맞댄 차례(분모에 드는 차례). */
    evaluated: number;
    /** 공식 판정이 있으나 평가가 판정 없음(분모 밖). */
    failed: number;
    /** 공식 판정이 있으나 말 입력이 아니라 부르지 않음(분모 밖). */
    notCalled: number;
    /** 공식 판정이 대화 호출의 것이 아닌 차례(분모 밖). */
    notJudged: number;
  };
  failed: FailureCounts;
  bySource: Record<ChatPrevMoveSource, PairCount>;
  /** 맞댄 차례에서 평가의 reading · teacher_move 가 공식과 같은 수. */
  sameReading: number;
  sameMove: number;
  turns: {
    turnNo: number;
    status: "evaluated" | "failed" | "not_called" | "not_judged";
    prevMove: ChatPrevMoveSource | null;
    listenSentence: string | null;
    officialSaid: string[];
    legacySaid: string[];
  }[];
  human: LeadHumanRow[];
};

/**
 * 대조 표: 평가 결과로 판정 행을 만들고(앞 선생님 행동은 평가 출력 — chatJudgesOf 가 앞 아이 차례의 평가 출력으로 만든다, 따라 할 문장은 기록의 값),
 * 공식 판정이 있는 차례마다 (차례, 낱말) 쌍을 공식 said(a) · 기존 꼴 said(b)로 맞댄다. 고르기 답 표지는 같은 기록의 앱 판정에서 얻는다. 기록을
 * 고치지 않는다(lesson 은 읽기만).
 */
export function leadAgainstTableOf(
  lesson: LeadLesson,
  results: ReadonlyMap<number, LeadEvalResult>,
): LeadAgainstTable {
  const { ctx, source } = lesson;
  const mask = lesson.mask ?? NO_MASK;
  const head = homophoneHeadOf(ctx.homophones);
  const rows: ChatJudgeRow[] = lesson.turns.map((turn, at) => {
    if (turn.role === "teacher")
      return {
        role: "teacher",
        say: turn.say,
        listenSentence: turn.listenSentence,
        explainShown: false,
        closing: turn.closing,
        first: turn.first,
      };
    const result = results.get(at);
    const state: ChatEvalState =
      result === undefined
        ? { status: "not_called" }
        : result.ok
          ? { status: "done", output: result.output }
          : { status: "failed", failure: result.failure };
    return {
      role: "child",
      input: turn.input,
      heard: turn.input === "speech" ? turn.heard : "",
      opened: [...turn.opened],
      koHelp: null,
      eval: state,
    };
  });
  const judges = new Map(
    chatJudgesOf(rows, ctx).map(({ row, judge }) => [row, judge]),
  );
  const counts: LeadAgainstTable["counts"] = {
    childTurns: 0,
    official: 0,
    evaluated: 0,
    failed: 0,
    notCalled: 0,
    notJudged: 0,
  };
  const failed = emptyFailures();
  const bySource = emptyBySource();
  const pairs: ChatPair[] = [];
  const human: LeadHumanRow[] = [];
  const turns: LeadAgainstTable["turns"] = [];
  let sameReading = 0;
  let sameMove = 0;
  let teacher: LeadTeacherTurn | null = null;
  lesson.turns.forEach((turn, at) => {
    if (turn.role === "teacher") {
      teacher = turn;
      return;
    }
    counts.childTurns += 1;
    const judge = judges.get(at);
    const prev = teacher as LeadTeacherTurn | null;
    const base = {
      turnNo: turn.turnNo,
      prevMove: judge?.legacy.prevMove ?? null,
      listenSentence:
        prev?.listenSentence == null ? null : mask(prev.listenSentence),
      officialSaid: turn.official?.said ?? [],
      legacySaid: judge?.legacy.said ?? [],
    };
    if (turn.official === null || judge === undefined) {
      counts.notJudged += 1;
      turns.push({ ...base, status: "not_judged" });
      return;
    }
    counts.official += 1;
    const { legacy } = judge;
    if (legacy.status === "failed") {
      counts.failed += 1;
      failed[legacy.failure ?? "unknown"] += 1;
      turns.push({ ...base, status: "failed" });
      return;
    }
    if (legacy.status !== "done" || legacy.output === null) {
      counts.notCalled += 1;
      turns.push({ ...base, status: "not_called" });
      return;
    }
    counts.evaluated += 1;
    turns.push({ ...base, status: "evaluated" });
    const output = legacy.output;
    if (output.reading === turn.official.reading) sameReading += 1;
    if (output.teacher_move === turn.official.move) sameMove += 1;
    const choice = [...turn.official.said, ...legacy.said].filter(
      (w) => appEntryOf(judge, w, head)?.choiceAnswer === true,
    );
    const turnPairs = chatTurnPairsOf({
      a: turn.official.said,
      b: legacy.said,
      choice,
    });
    pairs.push(...turnPairs);
    if (legacy.prevMove !== null)
      addPairs(bySource[legacy.prevMove], {
        pairs: turnPairs.length,
        agreed: turnPairs.filter((p) => p.a && p.b).length,
      });
    for (const pair of turnPairs) {
      if (pair.a && pair.b) continue;
      human.push({
        session: shortId(lesson.id),
        source,
        turnNo: turn.turnNo,
        word: pair.word,
        side: pair.a ? "official_only" : "legacy_only",
        choice: pair.choice,
        prevMove: legacy.prevMove,
        teacherSay: mask(prev?.say ?? ""),
        listenSentence:
          prev?.listenSentence == null ? null : mask(prev.listenSentence),
        heard: mask(turn.heard),
        official: { reading: turn.official.reading, move: turn.official.move },
        evaluated: { reading: output.reading, move: output.teacher_move },
        verdict: "",
      });
    }
  });
  return {
    session: shortId(lesson.id),
    source,
    sayLost: lesson.sayLost,
    rebuiltTeachers: lesson.rebuiltTeachers,
    agreement: chatAgreementOf(pairs),
    pairs,
    counts,
    failed,
    bySource,
    sameReading,
    sameMove,
    turns,
    human,
  };
}

export type LeadAgainstTotal = {
  lessons: number;
  agreement: ChatAgreement;
  counts: LeadAgainstTable["counts"];
  failed: FailureCounts;
  bySource: Record<ChatPrevMoveSource, PairCount>;
  sameReading: number;
  sameMove: number;
  rebuiltTeachers: number;
};

export type LeadAgainstReport = {
  tables: LeadAgainstTable[];
  totals: Record<ChatCompareSource, LeadAgainstTotal>;
  /** 원문이 지워져 다시 세울 수 없어 표 · 합계에서 뺀 수업(세션 앞 여덟 자). */
  lost: Record<ChatCompareSource, string[]>;
};

/** 대조 합계(실제 · 모의 따로, 일치 비율은 쌍을 모아 다시 낸다). */
export function leadAgainstReportOf(
  tables: readonly LeadAgainstTable[],
): LeadAgainstReport {
  const totals = perSource<LeadAgainstTotal>(() => ({
    lessons: 0,
    agreement: chatAgreementOf([]),
    counts: {
      childTurns: 0,
      official: 0,
      evaluated: 0,
      failed: 0,
      notCalled: 0,
      notJudged: 0,
    },
    failed: emptyFailures(),
    bySource: emptyBySource(),
    sameReading: 0,
    sameMove: 0,
    rebuiltTeachers: 0,
  }));
  for (const source of CHAT_COMPARE_SOURCES) {
    const total = totals[source];
    const mine = tables.filter((t) => t.source === source && !t.sayLost);
    total.lessons = mine.length;
    total.agreement = chatAgreementOf(mine.flatMap((t) => t.pairs));
    for (const t of mine) {
      for (const k of Object.keys(
        t.counts,
      ) as (keyof LeadAgainstTable["counts"])[])
        total.counts[k] += t.counts[k];
      for (const k of Object.keys(t.failed) as (keyof FailureCounts)[])
        total.failed[k] += t.failed[k];
      for (const s of CHAT_PREV_MOVE_SOURCES)
        addPairs(total.bySource[s], t.bySource[s]);
      total.sameReading += t.sameReading;
      total.sameMove += t.sameMove;
      total.rebuiltTeachers += t.rebuiltTeachers;
    }
  }
  const lost = perSource<string[]>(() => []);
  for (const t of tables) if (t.sayLost) lost[t.source].push(t.session);
  return { tables: tables.filter((t) => !t.sayLost), totals, lost };
}

/** 대조 갈래의 파일 글. */
export function leadAgainstMarkdownOf(report: LeadAgainstReport): string {
  const out: string[] = [
    "# 직접 대조(지금 새 방식 공식 판정 · 평가 호출의 기존 꼴 판정)",
    "",
    "같은 차례에서 공식 said_words(a)와 평가 호출을 지난 기존 꼴 said(b)를 맞댄다. 단위는 (아이 차례, 단원 단어) 쌍이고, 분모는 어느 한쪽이라도 인정한 쌍이다. 앞 선생님 행동은 공식 값이 아니라 평가 출력으로 만들었다. 공식 판정이 없는 차례 · 판정 없음 · 부르지 않음은 분모 밖이다.",
    "",
    "- 판정 없음의 까닭별 수는 앱의 기록과 견주지 않습니다(이 도구는 앱의 호출 길을 거치지 않아, 거절과 엄격 규격 실패 뒤 다시 묻기의 처리가 앱과 다릅니다).",
    "- 설정 값은 DB 가 아니라 시드 파일(seed/settings.json)에서 읽습니다(모델 · 출력 상한 · 앞 차례 수가 DB 와 다르면 앱 평가와 다른 조건입니다).",
    "- 닫힌 실제 수업의 선생님 말은 대화 기록 글이 지워져, 행 글에 뺀 문장을 끝에 붙여 다시 세운 글입니다. 문장 차례가 원래와 달라 평가 호출의 reading · teacher_move 에 닿을 수 있습니다(모의 수업은 원래 차례 그대로). 실제와 모의의 차이가 크면 다시 세운 선생님 행 수와 따라 말하기(model_repeat) 차례부터 봅니다.",
    "",
  ];
  for (const source of CHAT_COMPARE_SOURCES) {
    const total = report.totals[source];
    const lost = report.lost[source];
    out.push(
      `## ${SOURCE_NAME[source]} 합계(수업 ${total.lessons})`,
      "",
      `- 원문이 지워져 다시 세울 수 없는 수업(표 · 합계 밖, 평가 호출도 하지 않음): ${lost.length}${lost.length > 0 ? `(${lost.join(", ")})` : ""}`,
    );
    if (total.lessons === 0) {
      out.push("- 수업 없음", "");
      continue;
    }
    out.push(
      `- 일치 비율(고르기 답을 넣은 값): ${ratioText(total.agreement.withChoice)}`,
      `- 일치 비율(고르기 답을 뺀 값): ${ratioText(total.agreement.withoutChoice)}`,
      countLine("아이 차례", total.counts),
      countLine("판정 없음의 까닭", total.failed),
      `- 맞댄 차례에서 평가의 reading 이 공식과 같음: ${total.sameReading}/${total.counts.evaluated} · teacher_move 가 같음: ${total.sameMove}/${total.counts.evaluated}`,
      `- 선생님 말을 다시 세운 선생님 행: ${total.rebuiltTeachers}`,
      "",
      "| 앞 행동 출처 | 일치(넣음) |",
      "|---|---|",
      ...CHAT_PREV_MOVE_SOURCES.map(
        (s) => `| ${s} | ${ratioText(total.bySource[s])} |`,
      ),
      "",
    );
  }
  out.push(
    "## 수업별 표",
    "",
    "| 세션 | 가름 | 아이 차례 | 공식 판정 | 맞댐 | 판정 없음 | 부르지 않음 | 공식 판정 아님 | 일치(넣음) | 일치(뺌) | reading 같음 | move 같음 | 다시 세운 선생님 행 |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  );
  for (const t of report.tables)
    out.push(
      `| ${t.session} | ${t.source} | ${t.counts.childTurns} | ${t.counts.official} | ${t.counts.evaluated} | ${t.counts.failed} | ${t.counts.notCalled} | ${t.counts.notJudged} | ${ratioText(t.agreement.withChoice)} | ${ratioText(t.agreement.withoutChoice)} | ${t.sameReading} | ${t.sameMove} | ${t.rebuiltTeachers} |`,
    );
  out.push(
    "",
    "## 한쪽만의 낱말(사람 판독)",
    "",
    `| 세션 | 가름 | 차례 | 낱말 | 한쪽 | 고르기 답 | 앞 행동 출처 | 공식 reading · move | 평가 reading · move | 선생님 말 | 따라 할 문장 | 들린 글 | ${VERDICT_HEAD_LEAD} |`,
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  );
  for (const t of report.tables)
    for (const h of t.human)
      out.push(
        `| ${h.session} | ${h.source} | ${h.turnNo} | ${cell(h.word)} | ${h.side} | ${h.choice ? "예" : ""} | ${cell(h.prevMove)} | ${h.official.reading} · ${h.official.move} | ${h.evaluated.reading} · ${h.evaluated.move} | ${cell(h.teacherSay)} | ${cell(h.listenSentence)} | ${cell(h.heard)} |  |`,
      );
  return `${out.join("\n")}\n`;
}

/** 부를 호출 수와 어림 비용(입력은 글자 수로 위쪽 어림, 출력은 최대 출력으로 위쪽 어림). */
export function leadEvalEstimateOf({
  inputs,
  model,
  maxTokens,
  book,
}: {
  inputs: readonly TalkChatEvalInput[];
  model: string;
  maxTokens: number;
  book: PriceBook;
}): {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: string;
  priceMissing: boolean;
} {
  const attempts = inputs.map((input) => ({
    model,
    input: Math.ceil(
      (TALK_CHAT_EVAL_SYSTEM.length + talkChatEvalUserMessage(input).length) /
        CHARS_PER_TOKEN_ESTIMATE,
    ),
    output: maxTokens,
    cacheWrite: 0,
    cacheRead: 0,
  }));
  const cost = costOf(attempts, book);
  return {
    calls: inputs.length,
    inputTokens: cost.tokens.input,
    outputTokens: cost.tokens.output,
    costUsd: cost.costUsd,
    priceMissing: cost.priceMissing,
  };
}

// ── 인자 · 출력 자리 ─────────────────────────────────────────────────

export type CompareArgs = {
  mode: "compare" | "against-lead";
  out: string;
  db: boolean;
  dbEnv: string;
  mock: string | null;
  runs: string | null;
  /** 대조 갈래의 호출: plan 계획만(기본) · call 실제 호출 · fake 가짜 응답. 비교 갈래는 늘 none. */
  ai: "none" | "plan" | "call" | "fake";
  since: string | null;
  sessions: string[];
  /** 실제 호출의 호출 수 상한(--call 이면 꼭 있어야 함 — 계획만 실행의 수를 보고 적는다). */
  maxCalls: number | null;
};

/** 접속 문자열 환경 변수의 기본 이름(앱 서버와 같은 개발 DB). */
export const DEFAULT_DB_ENV = "DATABASE_URL";

export function parseCompareArgs(
  argv: readonly string[],
): { ok: true; args: CompareArgs } | { ok: false; error: string } {
  let against = false;
  let call = false;
  let fake = false;
  const args: CompareArgs = {
    mode: "compare",
    out: "",
    db: false,
    dbEnv: DEFAULT_DB_ENV,
    mock: null,
    runs: null,
    ai: "none",
    since: null,
    sessions: [],
    maxCalls: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = () => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) return null;
      i += 1;
      return v;
    };
    switch (flag) {
      case "--against-lead":
        against = true;
        break;
      case "--call":
        call = true;
        break;
      case "--fake-ai":
        fake = true;
        break;
      case "--db":
        args.db = true;
        break;
      case "--db-env":
      case "--out":
      case "--mock":
      case "--runs":
      case "--since":
      case "--max-calls":
      case "--session": {
        const v = value();
        if (v === null) return { ok: false, error: `${flag} 뒤에 값이 없다` };
        if (flag === "--db-env") args.dbEnv = v;
        if (flag === "--out") args.out = v;
        if (flag === "--mock") args.mock = v;
        if (flag === "--runs") args.runs = v;
        if (flag === "--session") args.sessions.push(v);
        if (flag === "--max-calls") {
          const n = Number(v);
          if (!Number.isInteger(n) || n < 1)
            return { ok: false, error: "--max-calls 는 1 이상 정수" };
          args.maxCalls = n;
        }
        if (flag === "--since") {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(v))
            return { ok: false, error: "--since 는 YYYY-MM-DD" };
          args.since = v;
        }
        break;
      }
      default:
        return { ok: false, error: `모르는 인자: ${flag}` };
    }
  }
  if (args.out === "")
    return { ok: false, error: "--out <저장소 밖 폴더> 가 필요하다" };
  if (call && fake)
    return { ok: false, error: "--call 과 --fake-ai 는 함께 쓰지 않는다" };
  if (against) {
    args.mode = "against-lead";
    args.ai = call ? "call" : fake ? "fake" : "plan";
    if (!args.db && args.runs === null)
      return {
        ok: false,
        error: "--against-lead 는 --db 나 --runs 가 필요하다",
      };
    if (args.mock !== null)
      return { ok: false, error: "--mock 은 비교 갈래에서만 쓴다" };
    if (call && args.maxCalls === null)
      return {
        ok: false,
        error:
          "--call 에는 --max-calls <수> 가 필요하다(계획만 실행으로 호출 수를 먼저 본다)",
      };
  } else {
    if (call || fake)
      return {
        ok: false,
        error: "--call · --fake-ai 는 --against-lead 에서만 쓴다",
      };
    if (args.runs !== null)
      return { ok: false, error: "--runs 는 --against-lead 에서만 쓴다" };
    if (!args.db && args.mock === null)
      return { ok: false, error: "--db 나 --mock 이 필요하다" };
  }
  return { ok: true, args };
}

/** 실제 호출 수 상한 확인: 계획한 호출 수가 상한을 넘으면 그 까닭(부르지 않는다), 아니면 null. */
export function callLimitProblemOf(
  planned: number,
  maxCalls: number,
): string | null {
  return planned > maxCalls
    ? `계획한 평가 호출 ${planned}번이 상한 ${maxCalls}번을 넘어 부르지 않았다(--since · --session 으로 좁히거나 상한을 올린다)`
    : null;
}

/** 출력 자리 문제(저장소 안이면 그 까닭, 아니면 null). out · roots 는 실제 경로로 푼 값을 넘긴다. */
export function outPathProblemOf(
  out: string,
  roots: readonly string[],
): string | null {
  const abs = resolve(out);
  for (const root of roots) {
    const rel = relative(resolve(root), abs);
    const outside =
      rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);
    if (rel === "" || !outside)
      return "출력 자리가 저장소 안이다(아이 말 원문이 든 파일은 저장소 밖에만 쓴다)";
  }
  return null;
}

/** 이 파일에서 위로 올라가며 .git 이 있는 폴더(워크트리와 본 저장소)를 실제 경로로. */
function repoRootsOf(start: string): string[] {
  const roots: string[] = [];
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, ".git"))) roots.push(realpathSync(dir));
    const up = dirname(dir);
    if (up === dir) return roots;
    dir = up;
  }
}

/** 아직 없는 경로는 가장 가까운 있는 조상의 실제 경로에 나머지를 붙여 푼다(/tmp → /private/tmp 같은 연결 경로). */
function realOf(path: string): string {
  const abs = resolve(path);
  let dir = abs;
  const rest: string[] = [];
  while (!existsSync(dir)) {
    const up = dirname(dir);
    if (up === dir) return abs;
    rest.unshift(relative(up, dir));
    dir = up;
  }
  return join(realpathSync(dir), ...rest);
}

// ── 읽기 · 호출 · 출력(직접 실행될 때만) ─────────────────────────────────

type Materials = Awaited<ReturnType<typeof loadMaterials>>;

async function loadMaterials(
  root: string,
  where: { level: number; unit: number; lesson: number; teacher: string },
) {
  const observe = await import("./talk-observe");
  const m = observe.materialsOf(
    observe.readSeedFiles(root, where.level, where.unit),
    where,
  );
  if (!m.ok) throw new Error(`시드 재료 없음(${m.missing})`);
  return m.materials;
}

async function ctxOfMaterials(m: Materials): Promise<ChatJudgeContext> {
  const { talkSceneWordsOf } = await import("../src/core/ai/calls/talk-lesson");
  const unitWords = [...m.ctx.unitWords];
  return {
    unitWords,
    lemmaOf: m.lemmaOf,
    homophones: m.homophones,
    sceneWords: talkSceneWordsOf({ card: m.card, unitWords }),
    spec: { band: m.spec.band },
    teacherName: m.teacher.nameEn,
  };
}

const MockFileSchema = z.object({
  lessons: z.array(
    z.object({
      id: z.string(),
      level: z.number(),
      unit: z.number(),
      lesson: z.number(),
      teacher: z.string(),
      rows: z.array(z.record(z.string(), z.unknown())),
      met: z.array(z.string()).optional(),
    }),
  ),
});

/** 모의 수업 파일(대본 실행이 낸 이야기 방식 수업 행): { lessons: [{ id, level, unit, lesson, teacher, rows, met? }] }. */
async function readMockLessons(
  root: string,
  file: string,
): Promise<CompareLesson[]> {
  const parsed = MockFileSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  const out: CompareLesson[] = [];
  for (const l of parsed.lessons) {
    const ctx = await ctxOfMaterials(
      await loadMaterials(root, { ...l, teacher: l.teacher.toLowerCase() }),
    );
    const rows = l.rows as unknown as ChatTurnRowLike[];
    out.push({
      sessionId: l.id,
      source: "mock",
      rows,
      ctx,
      met: l.met ?? metOfRows(rows, ctx),
      storedMark: null,
    });
  }
  return out;
}

function metOfRows(
  rows: readonly ChatTurnRowLike[],
  ctx: ChatJudgeContext,
): string[] {
  const met: string[] = [];
  for (const row of chatDialogRowsOf(rows))
    if (row.speaker === "tori")
      for (const w of metWordsIn(chatSaidSayOf(row), ctx))
        if (!met.includes(w)) met.push(w);
  return met;
}

const SetupSchema = z.object({
  level: z.number(),
  unit: z.number(),
  lesson: z.number(),
  teacher: z.string(),
});

/** 실험 runs 폴더의 지금 새 방식 팔(N) 수업들(모의). 재료는 그 실험의 setup.json(폴더 위)의 단계 · 단원 · 수업 · 선생님 시드다. */
async function readRunLessons(
  root: string,
  dir: string,
): Promise<LeadLesson[]> {
  const setup = SetupSchema.parse(
    JSON.parse(readFileSync(join(dir, "..", "setup.json"), "utf8")),
  );
  const ctx = await ctxOfMaterials(
    await loadMaterials(root, {
      ...setup,
      teacher: setup.teacher.toLowerCase(),
    }),
  );
  const out: LeadLesson[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith(".jsonl")) continue;
    const records = readFileSync(join(dir, name), "utf8")
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line) as unknown);
    const lesson = records.find(
      (r) => (r as { type?: unknown }).type === "lesson",
    ) as { arm?: unknown; lesson?: unknown } | undefined;
    if (lesson?.arm !== "N") continue;
    out.push(
      leadLessonOfRun({
        id: typeof lesson.lesson === "string" ? lesson.lesson : name,
        records,
        ctx,
      }),
    );
  }
  return out;
}

type DbLesson = {
  sessionId: string;
  rows: LeadRowLike[];
  ctx: ChatJudgeContext;
  storedMark: ChatCompareSummary | null;
  mask: TextMask;
  maskerForCall: import("../src/core/ai/mask").Masker;
};

/**
 * DB 의 이 방식(chat · claude) 1~3단계 회화 수업을 읽기 전용 거래 하나에서 읽는다(행 · 재료 · 표지 행 · 이름 가림). 접속 값은 출력하지 않는다.
 * 읽지 못한 수업은 세션 앞 여덟 자와 오류 이름만 남긴다.
 */
async function readDbLessons(
  url: string,
  {
    mode,
    since,
    sessions: prefixes,
    contactPatterns,
  }: {
    mode: "chat" | "claude";
    since: string | null;
    sessions: readonly string[];
    contactPatterns: readonly string[];
  },
): Promise<{ lessons: DbLesson[]; skipped: string[] }> {
  const { eq, like, inArray } = await import("drizzle-orm");
  const { createDb } = await import("../src/server/db");
  const { attempts, sessions } = await import("../src/db/schema/learning");
  const { parseTalkAttemptInput } = await import(
    "../src/core/conversation/attempt"
  );
  const { isChatSession, isLeadSession } = await import(
    "../src/core/conversation/lead-mode"
  );
  const { readTalkLessonState } = await import(
    "../src/server/conversation/state"
  );
  const { seedHomophones } = await import("../src/server/seed-lists");
  const { talkSceneWordsOf } = await import("../src/core/ai/calls/talk-lesson");
  const { maskerFor } = await import("../src/server/ai/run");
  const { ChatCompareMarkSchema, chatCompareAttemptId } = await import(
    "../src/server/conversation/chat-eval"
  );
  const { dbErrorTag } = await import("../src/server/db/safe-error");
  const db = createDb(url, { max: 1 });
  try {
    return await db.transaction(
      async (tx) => {
        const starts = await tx
          .select({ sessionId: attempts.sessionId, input: attempts.input })
          .from(attempts)
          .where(like(attempts.clientAttemptId, "talk-start:%"));
        const startOf = new Map(
          starts.flatMap((s) => {
            const input = parseTalkAttemptInput(s.input);
            return input?.kind === "talk-start"
              ? [[s.sessionId, input] as const]
              : [];
          }),
        );
        const ids = [...startOf.keys()];
        if (ids.length === 0) return { lessons: [], skipped: [] };
        const rows = await tx
          .select({
            id: sessions.id,
            profileId: sessions.profileId,
            level: sessions.level,
            startedAt: sessions.startedAt,
          })
          .from(sessions)
          .where(inArray(sessions.id, ids));
        const wanted = rows
          .filter((s) => {
            if (s.level === null) return false;
            const session = { start: startOf.get(s.id), level: s.level };
            if (
              mode === "chat"
                ? !isChatSession(session)
                : !isLeadSession(session)
            )
              return false;
            if (since !== null && s.startedAt < new Date(`${since}T00:00:00`))
              return false;
            return (
              prefixes.length === 0 || prefixes.some((p) => s.id.startsWith(p))
            );
          })
          .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
        const lessons: DbLesson[] = [];
        const skipped: string[] = [];
        const homophones = seedHomophones();
        for (const s of wanted) {
          try {
            // 수업마다 저장점(중첩 거래)을 둔다: 한 수업의 SQL 오류가 바깥 거래를 깨뜨려 뒤 수업까지 '읽지 못함'이 되지 않게(읽기 전용은 바깥 거래 그대로)
            const read = await tx.transaction(async (sp) => {
              const state = await readTalkLessonState(sp, {
                sessionId: s.id,
                profileId: s.profileId,
                at: new Date(),
              });
              if (state === undefined) return null;
              const unitWords = [...state.lesson.unitWords];
              const ctx: ChatJudgeContext = {
                unitWords,
                lemmaOf: state.lemmaOf,
                homophones,
                sceneWords: talkSceneWordsOf({ card: state.card, unitWords }),
                spec: { band: state.spec.band },
                teacherName: state.teacher?.nameEn ?? null,
              };
              const [mark] = await sp
                .select({ input: attempts.input })
                .from(attempts)
                .where(
                  eq(attempts.clientAttemptId, chatCompareAttemptId(s.id)),
                );
              const parsedMark = ChatCompareMarkSchema.safeParse(mark?.input);
              // 이름 가림(그 프로필 이름 — 값은 이 프로세스 밖으로 내지 않는다). 읽기만 하는 질의라 거래를 그대로 넘긴다
              const masker = await maskerFor(
                sp as unknown as Parameters<typeof maskerFor>[0],
                s.profileId,
                contactPatterns,
              );
              return {
                sessionId: s.id,
                rows: state.rows.map((r) => ({
                  id: r.id,
                  turnNo: r.turnNo,
                  segment: r.segment,
                  speaker: r.speaker,
                  text: r.text,
                  inputMode: r.inputMode,
                  hintLevel: r.hintLevel,
                  clientListen: r.clientListen,
                  sentUserMessage: r.sentUserMessage,
                  toriRewrite: r.toriRewrite,
                  aiQuestion: r.aiQuestion,
                  move: r.move,
                  chatJudge: r.chatJudge,
                  saidWords: r.saidWords,
                  hintKind: r.hintKind,
                  heardHelp: r.heardHelp,
                })),
                ctx,
                storedMark: parsedMark.success ? parsedMark.data.summary : null,
                mask: (text) => masker(text).text,
                maskerForCall: masker,
              } satisfies DbLesson;
            });
            if (read === null) skipped.push(`${shortId(s.id)}(상태 없음)`);
            else lessons.push(read);
          } catch (error) {
            skipped.push(`${shortId(s.id)}(${dbErrorTag(error)})`);
          }
        }
        return { lessons, skipped };
      },
      { accessMode: "read only" },
    );
  } finally {
    await db.$client.end().catch(() => {});
  }
}

function contactPatternsOf(root: string): string[] {
  const raw = JSON.parse(
    readFileSync(join(root, "seed", "lists", "forbidden.json"), "utf8"),
  ) as { patterns?: { category?: string; regex?: string }[] };
  return (raw.patterns ?? [])
    .filter((p) => p.category === "contact" && typeof p.regex === "string")
    .map((p) => p.regex as string);
}

/** 정해진 수만큼 함께 돌린다(차례대로 결과). */
async function pool<T, R>(
  items: readonly T[],
  size: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      out[i] = await run(items[i] as T);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, worker),
  );
  return out;
}

/** 가짜 평가(키 · 네트워크 없음 — 꼴만 본다): 늘 알아들음 · 맞장구 · 스스로 쓴 낱말 없음. */
const FAKE_OUTPUT: TalkChatEvalOutput = {
  reading: "clear_answer",
  teacher_move: "react_only",
  model_sentence: "",
  child_used_on_own: [],
};

async function runAgainstLead(
  root: string,
  args: CompareArgs,
  out: string,
): Promise<number> {
  const { loadScriptConfig, readApiKey, createScriptClient } = await import(
    "./ai-contract"
  );
  const { requestConfigOf } = await import("../src/core/ai/combo");
  const { TALK_CHAT_KEYS } = await import(
    "../src/core/conversation/lesson-turns"
  );
  const config = loadScriptConfig({ root });
  const contextTurns = z
    .int()
    .min(0)
    .parse(config.values[TALK_CHAT_KEYS.evalContextTurns]);
  const contactPatterns = contactPatternsOf(root);
  const lessons: {
    lesson: LeadLesson;
    masker: DbLesson["maskerForCall"] | null;
  }[] = [];
  const skipped: string[] = [];
  if (args.db) {
    const url = process.env[args.dbEnv];
    if (!url) {
      console.error(`talk-chat-compare: ${args.dbEnv} 이 없다`);
      return 2;
    }
    const read = await readDbLessons(url, {
      mode: "claude",
      since: args.since,
      sessions: args.sessions,
      contactPatterns,
    });
    skipped.push(...read.skipped);
    for (const l of read.lessons)
      lessons.push({
        lesson: leadLessonOfRows({
          id: l.sessionId,
          source: "real",
          rows: l.rows,
          ctx: l.ctx,
          mask: l.mask,
        }),
        masker: l.maskerForCall,
      });
  }
  if (args.runs !== null)
    for (const lesson of await readRunLessons(root, resolve(args.runs)))
      lessons.push({ lesson, masker: null });
  // 원문이 지워진 수업은 표 · 합계 밖이라 부르지 않는다
  const plans = lessons.map((l) =>
    l.lesson.sayLost ? [] : leadEvalPlanOf(l.lesson, contextTurns),
  );
  // 평가 호출의 ai.* 키(모델 · 출력 상한)는 단계로 갈리지 않는다 — 이야기 방식이 도는 1~3단계 구간의 값으로 읽는다
  const reqConfig = requestConfigOf({
    purpose: "talk_chat_eval",
    level: EVAL_CONFIG_LEVEL,
    values: config.values,
    book: config.book,
  });
  const estimate = leadEvalEstimateOf({
    inputs: plans.flat().map((p) => p.input),
    model: reqConfig.model,
    maxTokens: reqConfig.maxTokens,
    book: config.book,
  });
  const realCount = lessons.filter((l) => l.lesson.source === "real").length;
  console.log(
    `대조: 수업 ${lessons.length}(실제 ${realCount} · 모의 ${lessons.length - realCount}) · 읽지 못한 수업 ${skipped.length}`,
  );
  console.log(
    `평가 호출 ${estimate.calls}번 · 모델 ${reqConfig.model} · 어림 입력 토큰 ${estimate.inputTokens} · 최대 출력 토큰 ${estimate.outputTokens} · 어림 비용(위쪽) $${estimate.costUsd}${estimate.priceMissing ? "(단가 없음 모델)" : ""}`,
  );
  if (args.ai === "call") {
    const problem = callLimitProblemOf(estimate.calls, args.maxCalls ?? 0);
    if (problem !== null) {
      console.error(`talk-chat-compare: ${problem}`);
      return 2;
    }
  }
  if (args.ai === "plan") {
    console.log(
      "실제 호출은 하지 않았다(부르려면 --call --max-calls <위 호출 수>, 꼴만 보려면 --fake-ai).",
    );
    return 0;
  }
  let call: (
    input: TalkChatEvalInput,
    masker: DbLesson["maskerForCall"] | null,
  ) => Promise<{
    result: LeadEvalResult;
    usage: { input: number; output: number } | null;
  }>;
  if (args.ai === "fake") {
    call = async () => ({
      result: { ok: true, output: FAKE_OUTPUT },
      usage: null,
    });
  } else {
    const key = readApiKey();
    if (key === null) {
      console.error("talk-chat-compare: ANTHROPIC_API_KEY 가 없다(.env.local)");
      return 2;
    }
    const client = createScriptClient(
      key,
    ) as unknown as import("@anthropic-ai/sdk").default;
    const { buildAiRequest } = await import("../src/core/ai/request");
    const { createMasker } = await import("../src/core/ai/mask");
    const { answerTextOf, prepareAnswer } = await import(
      "../src/core/ai/calls/common"
    );
    const { talkChatEvalSpec } = await import(
      "../src/core/ai/calls/talk-chat-eval"
    );
    const { sendAttempt } = await import("../src/server/ai/client");
    const { aiOutputFormatOf } = await import("../src/server/ai/run");
    const noNames = createMasker({
      names: { displayName: "", englishName: "", nickname: null },
      isVocabWord: () => false,
      contactPatterns,
    });
    call = async (input, masker) => {
      const built = buildAiRequest(talkChatEvalSpec, input, {
        config: reqConfig,
        masker: masker ?? noNames,
        rules: {},
      });
      const sent = await sendAttempt(client, {
        body: {
          ...built.body,
          output_config: {
            ...built.body.output_config,
            format: aiOutputFormatOf(built.wireSchema),
          },
        },
        betas: built.betas,
        timeoutMs: built.timeoutMs,
      });
      if (!sent.ok)
        return {
          result: {
            ok: false,
            failure: sent.failure.kind === "timeout" ? "timeout" : "other",
          },
          usage: null,
        };
      const usage = {
        input: sent.message.usage.input_tokens,
        output: sent.message.usage.output_tokens,
      };
      try {
        const prepared = prepareAnswer(
          JSON.parse(answerTextOf(sent.message)),
          talkChatEvalSpec.enumPaths,
        );
        const output = talkChatEvalSpec.normalize(prepared, input, {});
        return output === null
          ? { result: { ok: false, failure: "invalid" }, usage }
          : { result: { ok: true, output }, usage };
      } catch {
        return { result: { ok: false, failure: "invalid" }, usage };
      }
    };
  }
  const jobs = lessons.flatMap((l, i) =>
    (plans[i] ?? []).map((p) => ({
      lesson: i,
      at: p.at,
      input: p.input,
      masker: l.masker,
    })),
  );
  const done = await pool(jobs, CALL_CONCURRENCY, (job) =>
    call(job.input, job.masker),
  );
  const results = lessons.map(() => new Map<number, LeadEvalResult>());
  const used = { input: 0, output: 0 };
  jobs.forEach((job, i) => {
    const r = done[i];
    if (r === undefined) return;
    results[job.lesson]?.set(job.at, r.result);
    if (r.usage) {
      used.input += r.usage.input;
      used.output += r.usage.output;
    }
  });
  const report = leadAgainstReportOf(
    lessons.map((l, i) =>
      leadAgainstTableOf(l.lesson, results[i] ?? new Map()),
    ),
  );
  mkdirSync(out, { recursive: true });
  writeFileSync(
    join(out, "talk-chat-against-lead.md"),
    leadAgainstMarkdownOf(report),
  );
  writeFileSync(
    join(out, "talk-chat-against-lead.json"),
    `${JSON.stringify({ skipped, estimate, report }, null, 2)}\n`,
  );
  if (args.ai === "call") {
    const spent = costOf(
      [{ model: reqConfig.model, ...used, cacheWrite: 0, cacheRead: 0 }],
      config.book,
    );
    console.log(
      `쓴 토큰: 입력 ${used.input} · 출력 ${used.output} · 비용 $${spent.costUsd}`,
    );
  }
  for (const source of CHAT_COMPARE_SOURCES) {
    const t = report.totals[source];
    if (t.lessons === 0) continue;
    console.log(
      `${SOURCE_NAME[source]}: 수업 ${t.lessons} · 맞댄 차례 ${t.counts.evaluated} · 판정 없음 ${t.counts.failed} · 일치(넣음) ${ratioText(t.agreement.withChoice)} · 일치(뺌) ${ratioText(t.agreement.withoutChoice)}`,
    );
  }
  console.log(`결과: ${out}`);
  return 0;
}

async function runCompare(
  root: string,
  args: CompareArgs,
  out: string,
): Promise<number> {
  const lessons: CompareLesson[] = [];
  const skipped: string[] = [];
  if (args.db) {
    const url = process.env[args.dbEnv];
    if (!url) {
      console.error(`talk-chat-compare: ${args.dbEnv} 이 없다`);
      return 2;
    }
    const read = await readDbLessons(url, {
      mode: "chat",
      since: args.since,
      sessions: args.sessions,
      contactPatterns: contactPatternsOf(root),
    });
    skipped.push(...read.skipped);
    for (const l of read.lessons)
      lessons.push({
        sessionId: l.sessionId,
        source: "real",
        rows: l.rows,
        ctx: l.ctx,
        met: l.storedMark?.met ?? metOfRows(l.rows, l.ctx),
        storedMark: l.storedMark,
        mask: l.mask,
      });
  }
  if (args.mock !== null)
    lessons.push(...(await readMockLessons(root, resolve(args.mock))));
  const report = chatCompareReportOf(lessons.map(chatLessonTableOf));
  mkdirSync(out, { recursive: true });
  writeFileSync(
    join(out, "talk-chat-compare.md"),
    chatCompareMarkdownOf(report),
  );
  writeFileSync(
    join(out, "talk-chat-compare.json"),
    `${JSON.stringify({ skipped, report }, null, 2)}\n`,
  );
  console.log(
    `비교: 수업 ${lessons.length} · 읽지 못한 수업 ${skipped.length}`,
  );
  for (const source of CHAT_COMPARE_SOURCES) {
    const t = report.totals[source];
    if (t.lessons === 0) continue;
    console.log(
      `${SOURCE_NAME[source]}: 수업 ${t.lessons} · 일치(넣음) ${ratioText(t.agreement.withChoice)} · 일치(뺌) ${ratioText(t.agreement.withoutChoice)} · 판정 없음 ${t.counts.failed} · 기다림 ${t.counts.waiting} · 다시 센 값과 다른 행 ${report.stale[source].rows}`,
    );
  }
  console.log(`결과: ${out}`);
  return 0;
}

async function main(): Promise<number> {
  const parsed = parseCompareArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`talk-chat-compare: ${parsed.error}`);
    return 2;
  }
  const { args } = parsed;
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "..");
  const out = realOf(args.out);
  const problem = outPathProblemOf(out, repoRootsOf(here));
  if (problem !== null) {
    console.error(`talk-chat-compare: ${problem}`);
    return 2;
  }
  try {
    return args.mode === "compare"
      ? await runCompare(root, args, out)
      : await runAgainstLead(root, args, out);
  } catch (error) {
    // 메시지에 아이 말 · 접속 값이 들 수 있어 이름만 낸다
    console.error(
      `talk-chat-compare: 실패(${error instanceof Error ? error.name : "알 수 없음"})`,
    );
    return 2;
  }
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    () => {
      console.error("talk-chat-compare: 예상 밖 오류");
      process.exitCode = 2;
    },
  );
}
