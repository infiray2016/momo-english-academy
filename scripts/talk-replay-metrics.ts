// 실제 입력 지표 넷(13절 C217 (4) · AC-15zl — talk:metrics 가 지표 표 끝에 붙인다). 대본 열둘의 아이 말이 모두 틀림 없는 글이라 재지 못한
// 것을 talk:observe JSON 보고에서 다시 센다(호출 없음):
//   (가) 못 알아들음 — 기대 낱말 주석(대본 칸 meant)이 있는 말 차례에서 선생님 말이 기대 낱말로 받았는지 · 잘못 들린 낱말을 되풀이했는지
//   (나) 같은 꼴 반응 — AI 반응의 첫 낱말 분포와 연달아 같은 첫 낱말 수
//   (다) 도움 차례 비율 — 대화 토막 선생님 차례 가운데 받침(도움) 차례
//   (라) 카드 글 그대로 붙임 — 선생님 말에 카드 질문 글이나 장면 문장이 글자 그대로 든 차례
// 분자 · 분모를 함께 낸다. 수치는 실측 · 검증 기준이고 선생님이 맞출 목표가 아니다(13절 C211 (2)). 자동 셈은 사람 판정의 보조다 — 낱말이
// 들었는지만 보므로 뜻으로 받은 말('I can swim' 을 'Yes, you can!' 으로 받음)은 가리지 못한다. 재생 대본(대본 칸 replay)은 고정 입력
// 재생이라 선생님 말이 실제 수업과 달라지면 뒤 입력이 그 질문과 어긋난다 — 차례마다 앞 질문이 실제 수업과 같은지(lessonBefore)를 함께 적는다.
// 자리 재현(talk:observe --anchored)으로 받은 차례는 앞 상태가 실제 수업 기록이라 어긋남이 없다: 모든 차례가 같은 자리이고, (나)는 새 응답의 첫
// 낱말을 기록에서 그 앞의 가장 가까운 AI 반응의 첫 낱말과 견준다(차례들이 서로 이어지지 않으므로). 기준선(--baseline)도 자리 재현이면 차례별로
// '실제 수업 ↔ 기준선 ↔ 지금' 선생님 말을 나란히 낸다.
// 순수 함수만 둔다(파일 · 네트워크 없음).
import { normalizeSpoken } from "../src/core/conversation/spoken";
import { isQuestionSentence } from "../src/core/conversation/stream";
import type { TalkCard } from "../src/core/seed/schema/talk";
import { splitSentences, tokenize } from "../src/core/seed/text";
import {
  ANCHORED_NOTICE,
  CHILD_DONT_KNOW_TEXT,
  CHILD_NOSPEECH_TEXT,
  REPLAY_NOTICE,
  type RunReport,
  type TurnRecord,
} from "./talk-observe";

const PERCENT = 100;
/** 분모가 이보다 작으면 백분율을 붙이지 않는다(talk-metrics COUNT_BELOW 와 같은 판정 단위). */
const COUNT_BELOW = 10;
/** 소리 줄(글 없이 소리로만 나가는 줄) 표시 — 대본 칸 lessonBefore · design 의 〈 〉. */
const SOUND_MARK = /〈([^〉]*)〉/g;

// ── 재료 ─────────────────────────────────────────────────────────

/** 카드 질문 글의 문장 하나(필수 질문 · 더 이야기할 거리의 en 을 문장으로 나눈 것 — 장면 문장과 질문 문장). */
export type CardLine = {
  kind: "required" | "more";
  no: number;
  /** 카드의 글 그대로. */
  en: string;
  /** 견주는 꼴(normalizeSpoken). */
  key: string;
  /** 질문 문장인가(아니면 장면 문장). */
  question: boolean;
};

/** 카드의 필수 질문 · 더 이야기할 거리 글을 문장으로 나눈다(쉬운 질문 · 장면 여는 질문은 앱이 계획대로 보이는 글이라 뺀다). */
export function cardLinesOf(
  card: Pick<TalkCard, "required" | "more">,
): CardLine[] {
  const linesOf = (
    kind: CardLine["kind"],
    items: readonly { no: number; en: string }[],
  ) =>
    items.flatMap((item) =>
      splitSentences(item.en).flatMap((en) => {
        const key = normalizeSpoken(en);
        return key === ""
          ? []
          : [{ kind, no: item.no, en, key, question: isQuestionSentence(en) }];
      }),
    );
  return [...linesOf("required", card.required), ...linesOf("more", card.more)];
}

/** 대본 하나를 셀 재료(talk-metrics MetricsKit 의 두 칸). */
export type ReplayKit = {
  cardLines: readonly CardLine[];
  lemmaOf: (word: string) => string | undefined;
};

// ── 차례 ─────────────────────────────────────────────────────────

/** (가) 판정: taken 기대 낱말로 받음 · echoed 잘못 들린 낱말을 되풀이함(기대 낱말 없음) · neither 둘 다 없음. */
export type HeardVerdict = "taken" | "echoed" | "neither";

export type ReplayTurn = {
  no: number;
  child: string;
  /** 이 차례 앞 선생님 쪽 글(앞 차례 응답 · 붙인 줄 · 소리 줄 · 앱 다음 차례, 첫 차례는 앱 첫 차례). */
  before: string;
  /** 실제 수업의 앞 선생님 말(대본 칸 lessonBefore, 없으면 null). */
  lessonBefore: string | null;
  /** 앞 질문(질문이 없으면 소리 줄)이 실제 수업과 같은가(lessonBefore 가 없으면 null). 자리 재현 차례는 늘 같다. */
  sameSpot: boolean | null;
  /** 자리 재현으로 받은 차례인가. */
  anchored: boolean;
  /**
   * 자리 재현 차례만: 기록에서 이 차례 앞의 가장 가까운 AI 반응의 첫 낱말(없으면 null). 있으면 (나)가 이웃한 새 응답 대신 이 낱말과 견준다.
   * 이어 돌린 차례는 칸이 없다.
   */
  prevFirstWord?: string | null;
  /** 기술 오류 자리(들리지 않음 · 호출 실패 — 지표 분자 · 분모 밖). */
  tech: boolean;
  /** (나) · (다) · (라)의 분모: 대화 토막의 선생님 차례이고 기술 오류 자리가 아니다. */
  counted: boolean;
  /** 받침 단계(0 이면 받침 차례가 아니다). */
  stage: number;
  /** 받침 차례를 부른 것: button '잘 모르겠어요' 단추 · speech 말했는데 막힘으로 봄(받침이 아니면 null). */
  supportCause: "button" | "speech" | null;
  /** AI 반응의 첫 낱말(소문자 — 받침 차례 · 앱 글뿐인 차례 · 분모 밖이면 null). */
  firstWord: string | null;
  /** 선생님 말에 글자 그대로 든 카드 문장(by: ai AI 가 쓴 글 · app 앱이 붙인 줄). */
  cardHits: (CardLine & { by: "ai" | "app" })[];
  /** 기대 낱말 주석이 있는 말 차례의 판정(없으면 null). stuck 은 앱이 그 말을 막힘으로 셌는가. */
  heard: {
    word: string;
    heardAs: string[];
    verdict: HeardVerdict;
    stuck: boolean;
  } | null;
};

function wordsIn(text: string): string[] {
  return tokenize(text).flatMap((t) =>
    t.kind === "word" ? [t.text.toLowerCase()] : [],
  );
}

/** 글에 그 낱말(또는 그 낱말이 원형인 꼴)이 들었는가. */
function hasWord(
  kit: Pick<ReplayKit, "lemmaOf">,
  words: readonly string[],
  target: string,
): boolean {
  const want = target.toLowerCase();
  return words.some(
    (w) => w === want || kit.lemmaOf(w)?.toLowerCase() === want,
  );
}

/** 견줄 '자리' 열쇠: 마지막 질문 문장, 질문이 없으면 소리 줄, 그것도 없으면 글 전체(정규화). */
export function spotKeyOf(text: string, sound = ""): string {
  const marked = [...text.matchAll(SOUND_MARK)].map((m) => m[1] ?? "");
  const plain = text.replace(SOUND_MARK, " ");
  const question = splitSentences(plain).filter(isQuestionSentence).at(-1);
  if (question !== undefined) return normalizeSpoken(question);
  const heard = [...marked, sound].filter((s) => s.trim() !== "").at(-1);
  return normalizeSpoken(heard ?? plain);
}

function soundOf(t: TurnRecord): string {
  return t.sound.answer ?? t.sound.model ?? "";
}

/** AI 가 쓴 문장(앱이 상황 줄로 바꾸거나 반응 자리에 둔 문장은 뺀다). */
function aiOwnSentences(t: TurnRecord): string[] {
  const app = new Set(
    (t.situationLines ?? []).flatMap(splitSentences).map(normalizeSpoken),
  );
  return splitSentences(t.teacher).filter((s) => !app.has(normalizeSpoken(s)));
}

/** (가): 기대 낱말이 있으면 받음, 없고 잘못 들린 낱말이 있으면 되풀이, 둘 다 없으면 neither. 카드 글 그대로인 문장은 빼고 본다. */
export function heardVerdictOf(
  kit: ReplayKit,
  sentences: readonly string[],
  meant: { word: string; heardAs: readonly string[] },
): HeardVerdict {
  const card = new Set(kit.cardLines.map((l) => l.key));
  const words = sentences
    .filter((s) => !card.has(normalizeSpoken(s)))
    .flatMap(wordsIn);
  if (hasWord(kit, words, meant.word)) return "taken";
  return meant.heardAs.some((w) => hasWord(kit, words, w))
    ? "echoed"
    : "neither";
}

/** 대본 한 바퀴의 차례 재료. */
export function replayTurnsOf(run: RunReport, kit: ReplayKit): ReplayTurn[] {
  const byKey = new Map(kit.cardLines.map((l) => [l.key, l]));
  const out: ReplayTurn[] = [];
  let before = run.opening.join(" ");
  let beforeSound = "";
  for (const t of run.turns) {
    const mark = t.techError ?? null;
    const nospeech = mark?.nospeech === true || t.child === CHILD_NOSPEECH_TEXT;
    const callTech = (mark?.call ?? null) !== null;
    const tech = nospeech || callTech;
    const button = t.child === CHILD_DONT_KNOW_TEXT;
    const spoke = !nospeech && !button && t.child.trim() !== "";
    const stage = t.move?.stage ?? 0;
    const counted =
      !tech && (t.segment === "talk" || t.segment === "more_talk");
    const ai = callTech ? [] : splitSentences(t.teacher);
    const own = callTech ? [] : aiOwnSentences(t);
    const hitsOf = (sentences: readonly string[], by: "ai" | "app") =>
      sentences.flatMap((s) => {
        const line = byKey.get(normalizeSpoken(s));
        return line ? [{ ...line, by }] : [];
      });
    const lessonBefore = t.lessonBefore ?? null;
    const anchored = t.anchored !== undefined;
    out.push({
      no: t.no,
      child: t.child,
      // 자리 재현은 앞 상태가 실제 수업 기록이다(앞 차례의 새 응답을 잇지 않는다)
      before: anchored ? (lessonBefore ?? "") : before,
      lessonBefore,
      sameSpot:
        lessonBefore === null
          ? null
          : anchored ||
            spotKeyOf(lessonBefore) === spotKeyOf(before, beforeSound),
      anchored,
      ...(t.anchored !== undefined
        ? { prevFirstWord: t.anchored.prevFirstWord }
        : {}),
      tech,
      counted,
      stage,
      supportCause: stage > 0 ? (button ? "button" : "speech") : null,
      firstWord:
        counted && stage === 0 ? (wordsIn(own[0] ?? "")[0] ?? null) : null,
      cardHits: counted
        ? [
            ...hitsOf(ai, "ai"),
            ...hitsOf(t.attach.flatMap(splitSentences), "app"),
          ]
        : [],
      heard:
        t.meant !== undefined && spoke && !callTech
          ? {
              word: t.meant.word,
              heardAs: [...t.meant.heardAs],
              verdict: heardVerdictOf(kit, ai, t.meant),
              stuck: t.stuck?.app ?? false,
            }
          : null,
    });
    before = [t.teacher, ...t.attach, ...t.appAfter].join(" ");
    // 앱 다음 차례(대화 첫 질문 등)가 뒤따르면 그 질문이 '자리'다 — 소리 줄은 그 앞의 것이라 견주지 않는다
    beforeSound = t.appAfter.length > 0 ? "" : soundOf(t);
  }
  return out;
}

// ── 셈 ───────────────────────────────────────────────────────────

export type ReplayTally = {
  /** 센 바퀴 수. */
  runs: number;
  /** (가) den 기대 낱말 주석이 있는 말 차례 · taken 받음 · echoed 되풀이 · neither 둘 다 없음 · stuck 막힘으로 셈. */
  heard: {
    den: number;
    taken: number;
    echoed: number;
    neither: number;
    stuck: number;
    /** 앞 질문이 실제 수업과 같은 차례만 다시 센 것(고정 입력 재생이 어긋나지 않은 차례). */
    sameSpot: { den: number; taken: number };
  };
  /** (나) reactions AI 반응 수 · firstWords 첫 낱말 분포 · pairs 이웃한 AI 반응 쌍 · same 그 가운데 첫 낱말이 같은 쌍 · longest 가장 긴 줄. */
  shape: {
    reactions: number;
    firstWords: Record<string, number>;
    pairs: number;
    same: number;
    longest: number;
  };
  /** (다) den 대화 토막 선생님 차례 · num 받침 차례(button 단추 · speech 말했는데 막힘) · stages 받침 단계별. */
  support: {
    den: number;
    num: number;
    button: number;
    speech: number;
    stages: Record<string, number>;
  };
  /** (라) den 대화 토막 선생님 차례 · num 카드 문장이 그대로 든 차례 · ai AI 글에 든 차례 · app 앱이 붙인 줄에 든 차례. */
  card: { den: number; num: number; ai: number; app: number };
  /** 고정 입력 재생의 어긋남: den 실제 수업의 앞 말이 적힌 차례 · num 앞 질문이 실제 수업과 다른 차례. */
  drift: { den: number; num: number };
};

export function emptyReplayTally(): ReplayTally {
  return {
    runs: 0,
    heard: {
      den: 0,
      taken: 0,
      echoed: 0,
      neither: 0,
      stuck: 0,
      sameSpot: { den: 0, taken: 0 },
    },
    shape: { reactions: 0, firstWords: {}, pairs: 0, same: 0, longest: 0 },
    support: { den: 0, num: 0, button: 0, speech: 0, stages: {} },
    card: { den: 0, num: 0, ai: 0, app: 0 },
    drift: { den: 0, num: 0 },
  };
}

function addCounts(
  a: Readonly<Record<string, number>>,
  b: Readonly<Record<string, number>>,
): Record<string, number> {
  const out: Record<string, number> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] ?? 0) + v;
  return out;
}

export function addReplayTally(a: ReplayTally, b: ReplayTally): ReplayTally {
  return {
    runs: a.runs + b.runs,
    heard: {
      den: a.heard.den + b.heard.den,
      taken: a.heard.taken + b.heard.taken,
      echoed: a.heard.echoed + b.heard.echoed,
      neither: a.heard.neither + b.heard.neither,
      stuck: a.heard.stuck + b.heard.stuck,
      sameSpot: {
        den: a.heard.sameSpot.den + b.heard.sameSpot.den,
        taken: a.heard.sameSpot.taken + b.heard.sameSpot.taken,
      },
    },
    shape: {
      reactions: a.shape.reactions + b.shape.reactions,
      firstWords: addCounts(a.shape.firstWords, b.shape.firstWords),
      pairs: a.shape.pairs + b.shape.pairs,
      same: a.shape.same + b.shape.same,
      longest: Math.max(a.shape.longest, b.shape.longest),
    },
    support: {
      den: a.support.den + b.support.den,
      num: a.support.num + b.support.num,
      button: a.support.button + b.support.button,
      speech: a.support.speech + b.support.speech,
      stages: addCounts(a.support.stages, b.support.stages),
    },
    card: {
      den: a.card.den + b.card.den,
      num: a.card.num + b.card.num,
      ai: a.card.ai + b.card.ai,
      app: a.card.app + b.card.app,
    },
    drift: {
      den: a.drift.den + b.drift.den,
      num: a.drift.num + b.drift.num,
    },
  };
}

/**
 * 한 바퀴를 센다. 연달아 같은 첫 낱말은 그 바퀴의 AI 반응 줄에서 이웃한 둘을 견준다(사이의 받침 차례는 건너뛴다). 자리 재현 차례는 이웃한 새
 * 응답이 아니라 기록의 앞 AI 반응(prevFirstWord)과 견준다 — 가장 긴 줄은 같으면 2 다.
 */
export function tallyReplay(turns: readonly ReplayTurn[]): ReplayTally {
  const t = emptyReplayTally();
  t.runs = 1;
  let prev: string | null = null;
  let streak = 0;
  for (const turn of turns) {
    if (turn.heard) {
      t.heard.den += 1;
      t.heard[turn.heard.verdict] += 1;
      if (turn.heard.stuck) t.heard.stuck += 1;
      if (turn.sameSpot === true) {
        t.heard.sameSpot.den += 1;
        if (turn.heard.verdict === "taken") t.heard.sameSpot.taken += 1;
      }
    }
    if (turn.sameSpot !== null) {
      t.drift.den += 1;
      if (!turn.sameSpot) t.drift.num += 1;
    }
    if (!turn.counted) continue;
    t.support.den += 1;
    t.card.den += 1;
    if (turn.stage > 0) {
      t.support.num += 1;
      if (turn.supportCause === "button") t.support.button += 1;
      else t.support.speech += 1;
      const key = String(turn.stage);
      t.support.stages[key] = (t.support.stages[key] ?? 0) + 1;
    }
    if (turn.cardHits.length > 0) {
      t.card.num += 1;
      if (turn.cardHits.some((h) => h.by === "ai")) t.card.ai += 1;
      if (turn.cardHits.some((h) => h.by === "app")) t.card.app += 1;
    }
    if (turn.firstWord !== null) {
      const word = turn.firstWord;
      t.shape.reactions += 1;
      t.shape.firstWords[word] = (t.shape.firstWords[word] ?? 0) + 1;
      const against: string | null =
        turn.prevFirstWord !== undefined ? turn.prevFirstWord : prev;
      if (against !== null) {
        t.shape.pairs += 1;
        if (against === word) t.shape.same += 1;
      }
      if (turn.prevFirstWord !== undefined) streak = against === word ? 2 : 1;
      else streak = against === word ? streak + 1 : 1;
      t.shape.longest = Math.max(t.shape.longest, streak);
      prev = word;
    }
  }
  return t;
}

export type ReplayScriptMetrics = {
  name: string;
  /** 고정 입력 재생 대본인가(대본 칸 replay). */
  replay: boolean;
  /** 자리 재현으로 돈 바퀴가 있는가(talk:observe --anchored). */
  anchored: boolean;
  tally: ReplayTally;
};

export type ReplayMetrics = {
  total: ReplayTally;
  scripts: ReplayScriptMetrics[];
  /** 차례별 재료(차례별 선생님 말 표 — 재생 대본만 보인다). */
  turns: {
    script: string;
    round: number;
    replay: boolean;
    turns: ReplayTurn[];
    run: RunReport;
  }[];
};

/** 보고 하나를 센다(대본마다 바퀴를 합친 분자 · 분모와 합계). 재료가 없는 대본(시드에 카드 없음)은 건너뛴다. */
export function replayMetricsOf(
  runs: readonly RunReport[],
  kitFor: (run: RunReport) => ReplayKit | null,
): ReplayMetrics {
  const byScript = new Map<string, ReplayScriptMetrics>();
  const turns: ReplayMetrics["turns"] = [];
  for (const run of runs) {
    const kit = kitFor(run);
    if (!kit) continue;
    const rows = replayTurnsOf(run, kit);
    const name = run.script.name;
    const replay = run.script.replay === true;
    const had = byScript.get(name);
    byScript.set(name, {
      name,
      replay,
      anchored: run.anchored === true || had?.anchored === true,
      tally: addReplayTally(
        had?.tally ?? emptyReplayTally(),
        tallyReplay(rows),
      ),
    });
    turns.push({ script: name, round: run.round, replay, turns: rows, run });
  }
  const scripts = [...byScript.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return {
    total: scripts.reduce(
      (sum, s) => addReplayTally(sum, s.tally),
      emptyReplayTally(),
    ),
    scripts,
    turns,
  };
}

// ── 글 ───────────────────────────────────────────────────────────

/** 분자 · 분모 글(분모 10 부터 백분율을 붙인다). */
export function fractionText(num: number, den: number): string {
  if (den === 0) return "0/0";
  return den < COUNT_BELOW
    ? `${num}/${den}`
    : `${num}/${den}(${Math.round((num / den) * PERCENT)}%)`;
}

/** 첫 낱말 분포 글(많은 것부터, 같은 수면 글자 차례). */
export function firstWordsText(
  firstWords: Readonly<Record<string, number>>,
): string {
  const rows = Object.entries(firstWords).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  return rows.length === 0
    ? "—"
    : rows.map(([word, n]) => `${word} ${n}`).join(" · ");
}

const cell = (text: string) =>
  text.replaceAll("|", "\\|").replaceAll("\n", " / ").trim() || "—";

/** 지표 넷의 값 글(합계 표 · 대본 표가 같은 글을 쓴다). */
export function replayValueTexts(t: ReplayTally) {
  const missed = t.heard.den - t.heard.taken;
  const stages = Object.entries(t.support.stages)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([stage, n]) => `받침 ${stage}: ${n}`)
    .join(" · ");
  return {
    heard:
      t.heard.den === 0
        ? "주석 없음(0/0)"
        : `${fractionText(missed, t.heard.den)} — 되풀이 ${t.heard.echoed} · 둘 다 없음 ${t.heard.neither} · 막힘으로 셈 ${t.heard.stuck}`,
    heardSameSpot:
      t.heard.sameSpot.den === 0
        ? "0/0"
        : fractionText(
            t.heard.sameSpot.den - t.heard.sameSpot.taken,
            t.heard.sameSpot.den,
          ),
    shape: `${fractionText(t.shape.same, t.shape.pairs)} · 가장 긴 줄 ${t.shape.longest}`,
    firstWords: `${firstWordsText(t.shape.firstWords)}(AI 반응 ${t.shape.reactions})`,
    support: `${fractionText(t.support.num, t.support.den)} — 단추 ${t.support.button} · 말했는데 막힘 ${t.support.speech}${stages ? ` · ${stages}` : ""}`,
    card: `${fractionText(t.card.num, t.card.den)} — AI 글 ${t.card.ai} · 앱이 붙임 ${t.card.app}`,
    drift: t.drift.den === 0 ? "—" : fractionText(t.drift.num, t.drift.den),
  };
}

const VERDICT_TEXT: Readonly<Record<HeardVerdict, string>> = {
  taken: "받음",
  echoed: "잘못 들린 낱말 되풀이",
  neither: "둘 다 없음",
};

function soundCell(t: TurnRecord): string {
  return [
    t.sound.model !== undefined ? `따라 할 말 〈${t.sound.model}〉` : "",
    t.sound.choices ? `선택지 〈${t.sound.choices.join("〉〈")}〉` : "",
    t.sound.answer !== undefined ? `답 소리 〈${t.sound.answer}〉` : "",
  ]
    .filter((x) => x !== "")
    .join(" · ");
}

/** 사용자 메시지의 들은 글 귀띔 줄('Heard hint …: ' 뒤의 글 — 없으면 빈 글). */
export function heardHintLineOf(userMessage: string): string {
  const line = userMessage
    .split("\n")
    .find((one) => one.startsWith("Heard hint"));
  return line === undefined ? "" : line.replace(/^Heard hint[^:]*:\s*/, "");
}

/** 한 차례에 선생님 쪽에서 나간 말 전부(AI 글 / 붙인 줄 / 〈소리 줄〉 — 표 한 칸). */
function saidCell(t: TurnRecord): string {
  return [t.teacher, ...t.attach, soundCell(t)]
    .filter((x) => x !== "")
    .join(" / ");
}

/** 막힘 칸 글: 말했는데 앱이 막힘으로 셈 · AI 막힘을 앱이 무름 · 아니면 빈 글. */
function stuckCell(t: TurnRecord): string {
  if (t.stuck?.overridden) return "막힘 무름";
  if (t.stuck?.app) return `막힘으로 셈(받침 ${t.move?.stage ?? 0})`;
  return "";
}

/** 다시 쓰기 칸 글(까닭 — 다시 써도 걸렸으면 카드 자리). */
function reaskCell(t: TurnRecord): string {
  if (!t.reask) return "";
  return `${t.reask.firstFail.reason}${t.reask.retryFail ? " → 또 걸려 카드 자리" : ""}`;
}

/**
 * 자리 재현 바퀴의 차례별 표(차례마다 한 줄 — 앞 선생님 말 · 아이 들은 글 · 귀띔 줄 · 새 선생님 말 · 막힘 · 다시 쓰기). 기준선도 같은 대본 ·
 * 같은 바퀴의 자리 재현이면 그 선생님 말 · 판정을 나란히 둔다.
 */
function anchoredTableOf(
  r: ReplayMetrics["turns"][number],
  base: ReplayMetrics | null,
): string[] {
  const baseRun =
    base?.turns.find(
      (x) =>
        x.script === r.script && x.round === r.round && x.run.anchored === true,
    ) ?? null;
  const baseAt = new Map(
    (baseRun?.turns ?? []).map((f, i) => [
      f.no,
      { f, t: baseRun?.run.turns[i] as TurnRecord },
    ]),
  );
  const verdictOf = (f: ReplayTurn) =>
    f.heard ? VERDICT_TEXT[f.heard.verdict] : "";
  const head = [
    "차례",
    "앞 선생님 말(실제 수업)",
    "아이 들은 글",
    "기대 낱말 ← 잘못 들린 낱말",
    "실제 수업의 선생님 말",
    ...(baseRun ? ["기준선 선생님 말", "기준선: (가) · 막힘 · 다시 쓰기"] : []),
    "귀띔 줄",
    "새 선생님 말",
    "(가)",
    "막힘",
    "다시 쓰기(까닭)",
  ];
  const out: string[] = [
    `### 자리 재현: ${r.script} · 바퀴 ${r.round}`,
    "",
    "차례마다 따로 받은 응답이다. 앞 상태는 실제 수업 기록이고 새 응답은 다음 차례로 잇지 않았다. 〈 〉 는 글 없이 소리로만 나가는 줄이다.",
    "",
    `| ${head.join(" | ")} |`,
    `|${head.map(() => "---").join("|")}|`,
  ];
  const off: string[] = [];
  for (const [i, f] of r.turns.entries()) {
    const t = r.run.turns[i] as TurnRecord;
    const b = baseAt.get(f.no);
    if ((t.anchored?.check.length ?? 0) > 0)
      off.push(`차례 ${f.no}(${t.anchored?.check.join(" · ")})`);
    const cells = [
      String(f.no),
      f.lessonBefore ?? "",
      f.child,
      f.heard ? `${f.heard.word} ← ${f.heard.heardAs.join(" · ")}` : "",
      t.anchored?.lessonAfter ?? "",
      ...(baseRun
        ? [
            b ? saidCell(b.t) : "",
            b
              ? [verdictOf(b.f), stuckCell(b.t), reaskCell(b.t)]
                  .filter((x) => x !== "")
                  .join(" · ")
              : "",
          ]
        : []),
      heardHintLineOf(t.userMessage ?? ""),
      saidCell(t),
      verdictOf(f),
      stuckCell(t),
      reaskCell(t),
    ];
    out.push(`| ${cells.map(cell).join(" | ")} |`);
  }
  out.push(
    "",
    off.length > 0
      ? `깐 상태가 기록과 다른 차례(도구가 그 자리에서 셈한 아이 행 칸): ${off.join(" · ")}`
      : "깐 상태 대조: 도구가 그 자리에서 셈한 아이 행 칸(노린 단어 · 들은 도움 · 힌트 종류 · 단)이 모든 차례에서 기록과 같다.",
  );
  if (r.run.stopped) out.push("", `멈춤: ${r.run.stopped}`);
  out.push("");
  return out;
}

/** 지표 표 끝에 붙이는 절(합계 · 대본마다 · 재생 대본의 차례별 선생님 말). base 는 --baseline 보고의 같은 셈. */
export function replayMarkdown(
  now: ReplayMetrics,
  base: ReplayMetrics | null,
): string {
  const a = replayValueTexts(now.total);
  const b = base ? replayValueTexts(base.total) : null;
  const row = (label: string, key: keyof typeof a) =>
    `| ${label} | ${cell(a[key])} | ${cell(b ? b[key] : "—")} |`;
  const anyAnchored = now.scripts.some((s) => s.anchored);
  const anyReplay = now.scripts.some((s) => s.replay && !s.anchored);
  const out: string[] = [
    "## 실제 입력 지표 넷(13절 C217 (4) · AC-15zl)",
    "",
    "읽는 법. 분자 ÷ 분모이고 바퀴 · 대본을 합친 값이다. 기술 오류 자리는 분자 · 분모 밖이다. (가)는 대본에 기대 낱말 주석(meant)이 있는 말 차례만 세고, 낱말이 선생님 말에 들었는지만 본다(카드 글 그대로인 문장은 빼고 본다) — 뜻으로 받은 말은 가리지 못하므로 사람 판정의 보조다. (나)의 AI 반응은 대화 토막에서 받침이 아닌 차례의 AI 글이고, 그 줄에서 이웃한 둘의 첫 낱말을 견준다. (다) · (라)의 분모는 대화 토막의 선생님 차례다. (라)는 카드의 필수 질문 · 더 이야기할 거리 글(장면 문장 + 질문 문장)을 문장마다 견준다. 수치는 실측 · 검증 기준이고 선생님이 맞출 목표가 아니다(13절 C211 (2)).",
    "",
    ...(anyAnchored ? [`${ANCHORED_NOTICE}.`, ""] : []),
    ...(anyReplay
      ? [
          `${REPLAY_NOTICE}. 아래 '어긋남'과 차례별 표의 '같은 자리' 칸이 그 정도를 보인다. '같은 자리'는 앞 선생님 말의 마지막 질문(질문이 없으면 소리 줄)이 실제 수업과 글자로 같은가만 본다(대소문자 · 문장부호 · 줄임꼴은 같게 봄) — 뜻이 같아도 글이 다르면 '다름'이다.`,
          "",
        ]
      : []),
    "| 지표 | 지금(분자/분모) | 기준선 |",
    "|---|---|---|",
    row(
      "(가) 못 알아들음: 기대 낱말로 받지 못한 차례 ÷ 기대 낱말 주석이 있는 말 차례",
      "heard",
    ),
    row("(가) 가운데 앞 질문이 실제 수업과 같은 차례만", "heardSameSpot"),
    row("(나) 같은 꼴 반응: 연달아 같은 첫 낱말 ÷ 이웃한 AI 반응 쌍", "shape"),
    row("(나) AI 반응의 첫 낱말 분포", "firstWords"),
    row("(다) 도움 차례 비율: 받침 차례 ÷ 대화 토막 선생님 차례", "support"),
    row(
      "(라) 카드 글 그대로 붙임: 카드 문장이 그대로 든 차례 ÷ 대화 토막 선생님 차례",
      "card",
    ),
    row(
      "고정 입력 재생의 어긋남: 앞 질문이 실제 수업과 다른 차례 ÷ 실제 수업의 앞 말이 적힌 차례",
      "drift",
    ),
    "",
    "### 대본마다(지표 넷)",
    "",
    "| 대본 | 바퀴 | (가) 못 알아들음 | (나) 연달아 같은 첫 낱말 | (나) 첫 낱말 분포 | (다) 도움 차례 | (라) 카드 글 그대로 | 어긋남 |",
    "|---|---|---|---|---|---|---|---|",
    ...now.scripts.map((s) => {
      const v = replayValueTexts(s.tally);
      return `| ${s.name}${s.anchored ? "(자리 재현)" : s.replay ? "(고정 입력 재생)" : ""} | ${s.tally.runs} | ${cell(v.heard)} | ${cell(v.shape)} | ${cell(v.firstWords)} | ${cell(v.support)} | ${cell(v.card)} | ${cell(v.drift)} |`;
    }),
    "",
  ];
  for (const r of now.turns.filter((x) => x.run.anchored === true))
    out.push(...anchoredTableOf(r, base));
  for (const r of now.turns.filter(
    (x) => x.replay && x.run.anchored !== true,
  )) {
    out.push(
      `### 차례별 선생님 말: ${r.script} · 바퀴 ${r.round}(고정 입력 재생)`,
      "",
      `앱 첫 차례: ${r.run.opening.map(cell).join(" / ") || "—"}`,
      "",
      "| 차례 | 실제 수업의 앞 선생님 말 | 같은 자리 | 아이 입력(들은 글) | 기대 낱말 ← 잘못 들린 낱말 | 선생님 말 | 붙인 줄 · 소리 줄 | 앱 다음 차례 | (가) | (나) 첫 낱말 | (다) 받침 | (라) 카드 문장 |",
      "|---|---|---|---|---|---|---|---|---|---|---|---|",
    );
    for (const [i, f] of r.turns.entries()) {
      const t = r.run.turns[i] as TurnRecord;
      const lines = [...t.attach, soundCell(t)].filter((x) => x !== "");
      out.push(
        `| ${f.no} | ${cell(f.lessonBefore ?? "")} | ${f.sameSpot === null ? "—" : f.sameSpot ? "같음" : "다름"} | ${cell(f.child)} | ${f.heard ? `${f.heard.word} ← ${f.heard.heardAs.join(" · ")}` : "—"} | ${cell(t.teacher)} | ${cell(lines.join(" / "))} | ${cell(t.appAfter.join(" / "))} | ${f.heard ? `${VERDICT_TEXT[f.heard.verdict]}${f.heard.stuck ? " · 막힘으로 셈" : ""}` : "—"} | ${f.firstWord ?? "—"} | ${f.stage > 0 ? `받침 ${f.stage}(${f.supportCause === "button" ? "단추" : "말"})` : f.tech ? "기술 오류 자리" : "—"} | ${cell(f.cardHits.map((h) => `${h.by === "ai" ? "AI 글" : "앱이 붙임"}: ${h.en}`).join(" / "))} |`,
      );
    }
    if (r.run.stopped) out.push("", `멈춤: ${r.run.stopped}`);
    out.push("");
  }
  return out.join("\n");
}

/** JSON 보고에 넣는 꼴(차례 재료에서 보고 원문은 뺀다). */
export function replayJson(now: ReplayMetrics, base: ReplayMetrics | null) {
  return {
    total: now.total,
    scripts: now.scripts,
    baselineTotal: base?.total ?? null,
    baselineScripts: base?.scripts ?? null,
    turns: now.turns.map(({ script, round, replay, turns }) => ({
      script,
      round,
      replay,
      turns,
    })),
  };
}
