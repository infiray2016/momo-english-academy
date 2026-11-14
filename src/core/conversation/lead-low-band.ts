// 새 회화 엔진(Claude 가 이끄는 대화, talk.lead_mode claude)의 1~3단계 화면 글(spec '회화 Claude 주도' 설계 8 · FR-9 · AC-9, plan 묶음 R5).
// 1~3단계 대화에서는 영어 답 문장과 선택지를 글로 미리 보이지 않는다(정본 02-2 소리 줄 · 듣기 단추 문단, 13절 C204 · T2). 이 모듈은 화면 글과
// 소리 줄(글 없는 듣기 단추, 문장 하나에 단추 하나)의 가름만 맡는다 — 소리로는 말 칸이 그대로 모두 나간다. 순수 모듈이다(시각 · DB 없음).
import { isLowBandLevel } from "@/core/ai/calls/talk-lesson";
import {
  hasLeadChoiceQuestion,
  leadChoicesOf,
} from "@/core/conversation/lead-record";
import type { TalkLeadMove } from "@/core/conversation/move";
import { withoutEnglishSentencesOf } from "@/core/conversation/spoken";
import { splitSentences } from "@/core/seed/text";

export type LeadLowBandInput = {
  /** 회화 단계(1~12). 1~3단계(isLowBandLevel)에서만 뺀다. */
  level: number;
  move: TalkLeadMove;
  /** 아이에게 나갈 말 칸(문장 문 · 좁은 정의 다시 받기를 지난 글, 검토 M-7). */
  say: string;
  /** 응답의 model_sentence(model_repeat 가 아니면 보지 않는다). */
  modelSentence: string;
  /** 앞 아이 차례가 아이 쪽 막힘(단추 · 막힘 말)인가(lead-record leadPrevStuckOf 와 같은 값). */
  prevStuck: boolean;
  /** 앱이 정한 마무리 차례인가(그 차례의 물음은 두 단추로 답하므로 빼지 않는다, C205 · 재검토 M2-1). */
  closing: boolean;
  /**
   * 같은 따라 할 문장의 다른 글자 조각(이야기 방식 — 줄임꼴 · 대소문자가 다른 꼴, chat-reply listenLiteralsOf 의 둘째부터). model_repeat
   * 차례에서 modelSentence 와 같이 문장 첫머리에서만 빼고, 앞서 뺀 자리와 겹치는 자리는 빼지 않는다. 없으면 빈 목록.
   */
  moreModels?: readonly string[];
};

/** 소리 줄의 갈래(따라 할 문장 model · 막힌 뒤 고르기 물음 answer). */
export type LowBandSoundKind = "model" | "answer";

/**
 * 소리 줄의 자리(13절 C241 보완 7 — 선생님 말 칸의 제자리): 글에서 그 소리 줄 앞에 오는 글자 수. 소리 줄은 그 앞 글 뒤 · 그 뒤 글 앞에서
 * 읽는다. 칸이 없거나 뒤에 글이 없으면 글 뒤(지금 차례)다.
 */
export type LowBandSoundAt = { model?: number; answer?: number };

export type LeadLowBandShown = {
  /** 말풍선에 보이는 글. 뺀 자리에 남은 따옴표 · 홀로 남은 부호 · 겹친 빈칸을 정리하고 뺀 자리 앞에 쌍점을 둔 글. 다 빠지면 빈 글. */
  text: string;
  /**
   * 글에서 뺀 문장(원래 차례대로) = 소리 줄. 문장 하나에 듣기 단추 하나이고, 단추 자리는 글 뒤다(03 100줄). move.lead.removed 에 적는다.
   * 따라 할 문장은 확인된 그 글자 그대로, 고르기 물음은 그 물음 문장 전체다(두 물음 문장으로 나뉜 고르기는 두 문장을 묶은 한 조각).
   */
  removed: string[];
  /** removed 와 같은 차례로, 그 뺀 자리 앞에 오는 text 의 글자 수. */
  cutsAt: number[];
  /**
   * model_repeat 차례(1~3단계)의 따라 할 문장 처리: sentence 는 다듬은 model_sentence(비었으면 빈 글), removed 는 말 칸에서 글자 그대로
   * 찾아 뺐는가. 글자 그대로 없거나 빈 문장이거나 문장 첫머리에 없으면 빼지 않고 false 다(글이 그대로 보인다). model_repeat 가 아니거나
   * 4단계부터는 null.
   */
  model: { sentence: string; removed: boolean } | null;
  /** moreModels 가운데 글에서 뺀 조각(받은 차례대로). */
  moreRemoved: string[];
  /**
   * 소리 줄의 자리(text 의 글자 수): model 은 따라 할 문장을 뺀 마지막 자리(같은 문장이 두 자리면 소리 줄은 마지막 자리 하나 — C241 보완 7),
   * answer 는 그 밖의 뺀 자리(고르기 물음)의 마지막. 뺀 것이 없으면 칸이 없다.
   */
  soundAt: LowBandSoundAt;
  /**
   * 소리 줄 뒤에 글이 남아, 글 뒤에 놓인 듣기 단추의 자리가 원래 문장 차례(소리 줄을 읽는 제자리)와 다르다(move.lead.soundMoved — 미결 11 의
   * 화면 판단 재료, C241 보완 7 로 뜻을 좁힘).
   */
  soundMoved: boolean;
};

type Span = { start: number; end: number };

/** 글자 · 숫자(낱말 경계를 가르는 글자. 남은 조각에 이것이 없으면 남은 말로 보지 않는다 — 따옴표 · 문장 부호 · 빈칸만 든 조각). */
const WORD_CHAR = /[\p{L}\p{N}]/u;
/** 문장 끝 부호. */
const SENTENCE_END = /[.!?]/;
/** 문장 뒤에 붙는 닫는 따옴표 · 괄호. */
const CLOSER = /["”’')\]]/;
/** 문장 앞에 바로 붙는 여는 따옴표 · 괄호(곧은 따옴표는 바로 뒤에 낱말이 붙으면 여는 쪽이다). */
const OPENER = /["“‘'([]/;
/**
 * 따라 말하게 하는 안내 말 바로 뒤의 쉼표('Say it, I see the sun.' · 'Can you say, I like cats?' — 검토 rev-s5 M-4 · rev-chat 의 꼴): 그 뒤는
 * 들려줄 말의 첫머리로 본다.
 */
const GUIDE_BEFORE_COMMA =
  /\b(?:say|repeat)(?:\s+(?:it|after me|with me|again|together))*\s*,$/i;

/**
 * 찾은 자리가 문장 첫머리인가(13절 C241 보완 7 · 분석 L2 4-2): 앞이 글 처음이거나, 바로 앞이 여는 따옴표 · 괄호이거나, 빈칸을 건너 앞이 쌍점 ·
 * 문장 끝 부호(닫는 따옴표 · 괄호를 건너)이거나, 따라 말하게 하는 안내 말 뒤의 쉼표다. 문장의 일부('Rain sounds go tap, tap, tap.' 의 뒤 조각 ·
 * 'Wow, I play soccer.' 의 'I play soccer.')는 첫머리가 아니다.
 */
function atSentenceHead(text: string, start: number): boolean {
  if (start === 0) return true;
  if (OPENER.test(text.charAt(start - 1))) return true;
  let i = start - 1;
  while (i >= 0 && /\s/.test(text.charAt(i))) i--;
  if (i < 0) return true;
  const c = text.charAt(i);
  if (c === ":") return true;
  if (c === "," && GUIDE_BEFORE_COMMA.test(text.slice(0, i + 1))) return true;
  let j = i;
  while (j >= 0 && CLOSER.test(text.charAt(j))) j--;
  return j >= 0 && SENTENCE_END.test(text.charAt(j));
}

/**
 * 찾은 자리가 문장 경계에 맞는가(검토 M-1 · C241 보완 7): 문장 첫머리이고(atSentenceHead), 끝은 문장 끝과 맞는다 — 따라 할 문장이 문장 부호로
 * 끝나면 뒤가 닫는 따옴표 · 빈칸 · 글 끝, 문장 부호 없이 끝나면 바로 뒤가 문장 끝 부호나 닫는 따옴표.
 */
function atSentenceBounds(text: string, start: number, piece: string): boolean {
  if (!atSentenceHead(text, start)) return false;
  const after = text.charAt(start + piece.length);
  if (SENTENCE_END.test(piece.charAt(piece.length - 1))) {
    return after === "" || /\s/.test(after) || CLOSER.test(after);
  }
  return SENTENCE_END.test(after) || CLOSER.test(after);
}

/** 말 칸에서 글자 그대로 든 자리(문장 경계에 맞는 것만, 겹치지 않게 앞에서부터 모두). */
function literalSpansOf(text: string, piece: string): Span[] {
  const spans: Span[] = [];
  let from = 0;
  for (;;) {
    const at = text.indexOf(piece, from);
    if (at < 0) return spans;
    if (atSentenceBounds(text, at, piece)) {
      spans.push({ start: at, end: at + piece.length });
      from = at + piece.length;
    } else {
      from = at + 1;
    }
  }
}

/**
 * 고르기 물음 문장의 자리(검토 I-1): 고르기인지는 기록과 같은 판정(lead-record hasLeadChoiceQuestion)으로 가른다. 한 문장이 고르기면 그 문장,
 * 'Or' 로 시작하는 물음이 바로 앞 물음 문장과 이어서만 고르기가 되면('Do you go to the beach? Or the mountain?') 두 문장을 한 자리로 묶는다
 * (소리 줄 하나). 문장 나누기는 지금 길의 splitSentences 다.
 */
function choiceQuestionSpansOf(text: string): Span[] {
  const sentences: { sentence: string; span: Span }[] = [];
  let from = 0;
  for (const sentence of splitSentences(text)) {
    const at = text.indexOf(sentence, from);
    if (at < 0) continue;
    from = at + sentence.length;
    sentences.push({
      sentence,
      span: { start: at, end: at + sentence.length },
    });
  }
  const spans: Span[] = [];
  sentences.forEach(({ sentence, span }, i) => {
    if (hasLeadChoiceQuestion(sentence)) {
      spans.push(span);
      return;
    }
    const prev = i > 0 ? sentences[i - 1] : undefined;
    if (
      prev !== undefined &&
      !hasLeadChoiceQuestion(prev.sentence) &&
      hasLeadChoiceQuestion(`${prev.sentence} ${sentence}`)
    ) {
      spans.push({ start: prev.span.start, end: span.end });
    }
  });
  return spans;
}

/** 자리를 앞에서부터 늘어놓고 겹치는 자리는 하나로 묶는다. */
function mergedSpans(spans: Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Span[] = [];
  for (const span of sorted) {
    const last = out.at(-1);
    if (last !== undefined && span.start < last.end) {
      last.end = Math.max(last.end, span.end);
    } else {
      out.push({ ...span });
    }
  }
  return out;
}

/** 뺀 자리 표지(다듬기 동안만 쓰는 글자 — 응답 글에 들지 않는 사용자 영역 글자). */
const CUT = "\uE000";
/** 뺀 자리 앞 조각의 끝이 낱말(글자 · 숫자 · {NAME} 자리의 닫는 괄호)인가. */
const ENDS_WITH_WORD = /[\p{L}\p{N}}]$/u;

/**
 * 뺀 뒤 남은 글 다듬기(설계 8 '따옴표 · 끝 쉼표를 정리한다' · 13절 C241 보완 7 — 두 새 방식이 함께 쓰는 한 곳, S1 재검토 2 M2-1): 뺀 자리마다
 * 표지를 두고, 속이 빈(문장 부호 · 빈칸 · 뺀 자리만 든) 따옴표 쌍 · 괄호와 홀로 남은 마침표 · 느낌표 · 물음표를 지우고 빈칸을 하나로 모은다.
 * 뺀 자리 바로 앞 조각이 낱말로 끝나면 쌍점을 붙이고 쉼표로 끝나면 쉼표를 쌍점으로 바꾼다('Say "…" What …' → 'Say: What …' · 'Say, "…"' →
 * 'Say:'). 문장 끝 부호 · 쌍점(그 밖의 부호)으로 끝나면 그대로 둔다. 낱말이 하나도 없는 조각은 지운다. 돌려주는 cutsAt 은 뺀 자리마다 그 앞에
 * 오는 다듬은 글의 글자 수다.
 */
function cutTextOf(
  text: string,
  spans: readonly Span[],
): { text: string; cutsAt: number[] } {
  const kept: string[] = [];
  let at = 0;
  for (const span of spans) {
    kept.push(text.slice(at, span.start));
    at = span.end;
  }
  kept.push(text.slice(at));
  const keepCut = (m: string, pre = "") =>
    m.includes(CUT) ? `${pre} ${CUT} ` : pre;
  const joined = kept
    .join(` ${CUT} `)
    .replace(
      /(^|[\s:,])["“‘'][\s.,!?\uE000]*["”’'](?=$|[\s.,!?])/g,
      (m: string, pre: string) => keepCut(m, pre),
    )
    .replace(/\((?:\s|\uE000)*\)/g, (m: string) => keepCut(m) || " ")
    .replace(/(^|\s)[.!?]+(?=\s|$)/g, "$1");
  const parts = joined.split(CUT).map((part) => {
    const squashed = part.replace(/\s+/g, " ").trim();
    return WORD_CHAR.test(squashed) ? squashed : "";
  });
  const shown: string[] = [];
  const cutsAt: number[] = [];
  parts.forEach((part, i) => {
    let piece = part;
    if (i < parts.length - 1 && piece !== "") {
      if (piece.endsWith(",")) piece = `${piece.slice(0, -1).trimEnd()}:`;
      else if (ENDS_WITH_WORD.test(piece)) piece = `${piece}:`;
    }
    if (piece !== "") shown.push(piece);
    if (i < parts.length - 1) cutsAt.push(shown.join(" ").length);
  });
  return { text: shown.join(" "), cutsAt };
}

/**
 * 이야기 방식의 잡아 둔 글(say 의 끝 조각)에서 본체가 뺀 조각들을 지운 글(chat-turn-result — 본체와 같은 다듬기 cutTextOf). 조각은 받은 차례대로
 * 앞에서부터 찾고(같은 조각이 둘이면 두 자리), 찾은 조각의 자리마다 cutsAt(그 앞 글자 수)을, 못 찾은 조각은 undefined 를 둔다. 하나도 못
 * 찾으면 빈칸만 모은 글이다.
 */
export function lowBandStrippedOf(
  held: string,
  pieces: readonly string[],
): { text: string; cutsAt: (number | undefined)[] } {
  const spans: Span[] = [];
  const found: number[] = [];
  let from = 0;
  for (const piece of pieces) {
    const at = piece === "" ? -1 : held.indexOf(piece, from);
    if (at < 0) {
      found.push(-1);
      continue;
    }
    found.push(spans.length);
    spans.push({ start: at, end: at + piece.length });
    from = at + piece.length;
  }
  if (spans.length === 0)
    return {
      text: held.replace(/\s+/g, " ").trim(),
      cutsAt: pieces.map(() => undefined),
    };
  const cut = cutTextOf(held, spans);
  return {
    text: cut.text,
    cutsAt: found.map((i) => (i < 0 ? undefined : cut.cutsAt[i])),
  };
}

/** 글자 자리 뒤에 낱말이 남았는가(그 자리의 소리 줄이 글 사이에 놓이는가). */
function wordsAfter(text: string, at: number): boolean {
  return WORD_CHAR.test(text.slice(at));
}

/** 줄 차례의 한 줄: 글 줄(문장 하나) 또는 소리 줄의 자리(before 는 이 줄들 가운데 그 앞의 글 줄 수). */
export type LowBandPlacedLine =
  | { t: "s"; en: string }
  | { t: "slot"; kind: LowBandSoundKind; before: number };

/**
 * 글과 소리 줄 자리 → 줄 차례(13절 C241 보완 7 — 서버 실시간 길 · 같은 시도 다시 흘림 · 대본 도구가 같은 함수): 글은 자리에서 나눈 조각마다
 * splitSentences 로 글 줄을 만들고, 뒤에 글이 남는 자리에만 소리 줄 자리(slot)를 그 앞 글 줄 뒤에 둔다. 같은 자리면 model 다음 answer 다.
 * 자리가 없거나 뒤에 글이 없는 소리 줄은 slot 을 두지 않는다 — 부르는 쪽이 지금 차례(글 · 뜻 뒤)로 낸다.
 */
export function lowBandPlacedLinesOf(
  text: string,
  at: LowBandSoundAt,
): LowBandPlacedLine[] {
  const mids = (["model", "answer"] as const)
    .flatMap((kind) => {
      const pos = at[kind];
      return pos !== undefined &&
        pos >= 0 &&
        pos <= text.length &&
        wordsAfter(text, pos)
        ? [{ kind, pos }]
        : [];
    })
    .sort((a, b) => a.pos - b.pos);
  const out: LowBandPlacedLine[] = [];
  let count = 0;
  let prev = 0;
  const pushText = (chunk: string) => {
    for (const en of splitSentences(chunk)) {
      const s = en.trim();
      if (s === "") continue;
      out.push({ t: "s", en: s });
      count += 1;
    }
  };
  for (const { kind, pos } of mids) {
    pushText(text.slice(prev, pos));
    out.push({ t: "slot", kind, before: count });
    prev = pos;
  }
  pushText(text.slice(prev));
  return out;
}

/**
 * 줄 차례에서 행에 남길 소리 줄 자리(move.lead · move.chat 의 soundAt): slot 마다 앞서 나간 글 줄(prefix)과 그 앞 글 줄을 빈칸으로 이은 글의 글자
 * 수. 행 글이 그 글 줄을 이은 글이므로 다시 흘림 · 이어 하기가 같은 자리에서 나눈다. slot 이 없으면 빈 값.
 */
export function lowBandSoundAtOf(
  lines: readonly LowBandPlacedLine[],
  prefix: readonly string[] = [],
): LowBandSoundAt {
  const texts = lines.flatMap((l) => (l.t === "s" ? [l.en] : []));
  const out: LowBandSoundAt = {};
  for (const line of lines)
    if (line.t === "slot")
      out[line.kind] = [...prefix, ...texts.slice(0, line.before)].join(
        " ",
      ).length;
  return out;
}

/**
 * 1~3단계 N 차례의 화면 글과 소리 줄(설계 8 · 13절 C241 보완 7): (가) model_repeat 차례에서 확인된 따라 할 문장(model_sentence)이 말 칸에
 * 글자 그대로 문장 첫머리에 들면 그 문장만 빼고(붙은 안내 말은 글로 남김), (나) 막힌 뒤 고르기 차례에서 고르기 물음 문장(기록과 같은 판정, 나뉜
 * 꼴은 두 문장)을 통째로 빼서 소리 줄로 돌린다. 글자 그대로 없거나 문장의 일부로만 든 따라 할 문장은 빼지 않고 model.removed false 로 알린다.
 * 4단계부터는 아무것도 빼지 않는다.
 */
export function leadLowBandShownOf(input: LeadLowBandInput): LeadLowBandShown {
  const { level, move, say, modelSentence } = input;
  const none = (model: LeadLowBandShown["model"]): LeadLowBandShown => ({
    text: say,
    removed: [],
    cutsAt: [],
    model,
    moreRemoved: [],
    soundAt: {},
    soundMoved: false,
  });
  if (!isLowBandLevel(level)) return none(null);

  const spans: Span[] = [];
  const literals: string[] = [];
  const moreRemoved: string[] = [];
  let model: LeadLowBandShown["model"] = null;
  if (move === "model_repeat") {
    const sentence = modelSentence.trim();
    const found = sentence === "" ? [] : literalSpansOf(say, sentence);
    spans.push(...found);
    model = { sentence, removed: found.length > 0 };
    if (found.length > 0) literals.push(sentence);
  }
  // 막힌 뒤 고르기 차례인지는 기록(leadChoicesOf)과 같은 판정이다: easier_or_choices 이거나 앞 아이 차례가 막힘, 마무리 차례 · wrap_up 제외
  if (leadChoicesOf(input)) spans.push(...choiceQuestionSpansOf(say));
  // 같은 따라 할 문장의 다른 글자 조각(이야기 방식): 앞서 정한 자리와 겹치지 않는 자리만
  if (move === "model_repeat") {
    for (const more of input.moreModels ?? []) {
      const piece = more.trim();
      if (piece === "") continue;
      const fresh = literalSpansOf(say, piece).filter(
        (s) => !spans.some((t) => s.start < t.end && t.start < s.end),
      );
      if (fresh.length === 0) continue;
      spans.push(...fresh);
      literals.push(piece);
      moreRemoved.push(piece);
    }
  }

  const merged = mergedSpans(spans);
  if (merged.length === 0) return none(model);

  const removed = merged.map((span) => say.slice(span.start, span.end));
  const { text, cutsAt } = cutTextOf(say, merged);
  // 소리 줄 자리: model 은 따라 할 문장만 뺀 마지막 자리(그런 자리가 없고 고르기 물음 자리가 품었으면 그 자리), answer 는 그 밖의 마지막 자리
  const lastAt = (test: (piece: string) => boolean): number | undefined => {
    const i = removed.findLastIndex(test);
    return i < 0 ? undefined : cutsAt[i];
  };
  const isModel = (piece: string) => literals.includes(piece);
  const modelAt =
    literals.length === 0
      ? undefined
      : (lastAt(isModel) ??
        lastAt((piece) => literals.some((l) => piece.includes(l))));
  const answerAt = lastAt((piece) => !isModel(piece));
  const soundAt: LowBandSoundAt = {
    ...(modelAt === undefined ? {} : { model: modelAt }),
    ...(answerAt === undefined ? {} : { answer: answerAt }),
  };
  return {
    text,
    removed,
    cutsAt,
    model,
    moreRemoved,
    soundAt,
    soundMoved: Object.values(soundAt).some((pos) => wordsAfter(text, pos)),
  };
}

/**
 * 1~3단계 뜻 줄(say_ko) · 막힌 뒤 뜻(hint_ko)의 화면 글(설계 8 · C204 (4)): 지금 길의 영어 문장 거르개(withoutEnglishSentencesOf)를
 * 그대로 건다. 4단계부터는 받은 글 그대로다.
 */
export function leadKoLineOf(level: number, ko: string): string {
  return isLowBandLevel(level) ? withoutEnglishSentencesOf(ko) : ko;
}
