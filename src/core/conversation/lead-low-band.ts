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
};

export type LeadLowBandShown = {
  /** 말풍선에 보이는 글. 뺀 자리에 남은 따옴표 · 끝 쉼표 · 홀로 남은 마침표 · 겹친 빈칸을 정리했다. 다 빠지면 빈 글. */
  text: string;
  /**
   * 글에서 뺀 문장(원래 차례대로) = 소리 줄. 문장 하나에 듣기 단추 하나이고, 첫 판의 자리는 글 뒤다(미결 11). move.lead.removed 에 적는다.
   * 따라 할 문장은 확인된 그 글자 그대로, 고르기 물음은 그 물음 문장 전체다(두 물음 문장으로 나뉜 고르기는 두 문장을 묶은 한 조각).
   */
  removed: string[];
  /**
   * model_repeat 차례(1~3단계)의 따라 할 문장 처리: sentence 는 다듬은 model_sentence(비었으면 빈 글), removed 는 말 칸에서 글자 그대로
   * 찾아 뺐는가. 글자 그대로 없거나 빈 문장이면 빼지 않고 false 다(글이 그대로 보인다). model_repeat 가 아니거나 4단계부터는 null.
   */
  model: { sentence: string; removed: boolean } | null;
  /** 뺀 문장 뒤에 글로 남은 말이 있어, 글 뒤에 붙는 소리 줄의 차례가 원래 문장 차례와 달라졌다(move.lead.soundMoved, plan 확인할 것 4). */
  soundMoved: boolean;
};

type Span = { start: number; end: number };

/** 글자 · 숫자(낱말 경계를 가르는 글자. 남은 조각에 이것이 없으면 남은 말로 보지 않는다 — 따옴표 · 문장 부호 · 빈칸만 든 조각). */
const WORD_CHAR = /[\p{L}\p{N}]/u;
/** 문장 끝 부호. */
const SENTENCE_END = /[.!?]/;
/** 문장 뒤에 붙는 닫는 따옴표 · 괄호. */
const CLOSER = /["”’')\]]/;

/**
 * 찾은 자리가 문장 경계에 맞는가(검토 M-1): 앞 글자가 글자 · 숫자가 아니고, 끝은 문장 끝과 맞는다 — 따라 할 문장이 문장 부호로 끝나면 뒤가
 * 닫는 따옴표 · 빈칸 · 글 끝, 문장 부호 없이 끝나면 바로 뒤가 문장 끝 부호나 닫는 따옴표.
 */
function atSentenceBounds(text: string, start: number, piece: string): boolean {
  const before = start > 0 ? text.charAt(start - 1) : "";
  if (before !== "" && WORD_CHAR.test(before)) return false;
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

/**
 * 뺀 뒤 남은 글 다듬기(설계 8 '따옴표 · 끝 쉼표를 정리한다'): 속이 빈(문장 부호 · 빈칸만 든) 따옴표 쌍, 홀로 남은 마침표 · 느낌표 · 물음표,
 * 끝 쉼표를 지우고 빈칸을 하나로 모은다. 안내 말(Say · Say it with me: …)과 쌍점은 그대로 둔다.
 */
function tidied(text: string): string {
  return text
    .replace(/(^|[\s:,])["“‘'][\s.,!?]*["”’'](?=$|[\s.,!?])/g, "$1")
    .replace(/(^|\s)[.!?]+(?=\s|$)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*,\s*$/, "");
}

/**
 * 1~3단계 N 차례의 화면 글과 소리 줄(설계 8): (가) model_repeat 차례에서 확인된 따라 할 문장(model_sentence)이 말 칸에 글자 그대로 들면
 * 그 문장만 빼고(붙은 안내 말은 글로 남김), (나) 막힌 뒤 고르기 차례에서 고르기 물음 문장(기록과 같은 판정, 나뉜 꼴은 두 문장)을 통째로 빼서 소리 줄로 돌린다. 글자
 * 그대로 없는 따라 할 문장은 빼지 않고 model.removed false 로 알린다. 4단계부터는 아무것도 빼지 않는다.
 */
export function leadLowBandShownOf(input: LeadLowBandInput): LeadLowBandShown {
  const { level, move, say, modelSentence } = input;
  if (!isLowBandLevel(level)) {
    return { text: say, removed: [], model: null, soundMoved: false };
  }

  const spans: Span[] = [];
  let model: LeadLowBandShown["model"] = null;
  if (move === "model_repeat") {
    const sentence = modelSentence.trim();
    const found = sentence === "" ? [] : literalSpansOf(say, sentence);
    spans.push(...found);
    model = { sentence, removed: found.length > 0 };
  }
  // 막힌 뒤 고르기 차례인지는 기록(leadChoicesOf)과 같은 판정이다: easier_or_choices 이거나 앞 아이 차례가 막힘, 마무리 차례 · wrap_up 제외
  if (leadChoicesOf(input)) spans.push(...choiceQuestionSpansOf(say));

  const merged = mergedSpans(spans);
  if (merged.length === 0) {
    return { text: say, removed: [], model, soundMoved: false };
  }

  const kept: string[] = [];
  let at = 0;
  for (const span of merged) {
    kept.push(say.slice(at, span.start));
    at = span.end;
  }
  kept.push(say.slice(at));

  // 첫 뺀 자리 뒤에 남은 글 조각(kept[1..])에 말이 있으면 소리 줄이 원래 차례보다 뒤로 간다
  const soundMoved = kept.slice(1).some((piece) => WORD_CHAR.test(piece));

  return {
    text: tidied(kept.join(" ")),
    removed: merged.map((span) => say.slice(span.start, span.end)),
    model,
    soundMoved,
  };
}

/**
 * 1~3단계 뜻 줄(say_ko) · 막힌 뒤 뜻(hint_ko)의 화면 글(설계 8 · C204 (4)): 지금 길의 영어 문장 거르개(withoutEnglishSentencesOf)를
 * 그대로 건다. 4단계부터는 받은 글 그대로다.
 */
export function leadKoLineOf(level: number, ko: string): string {
  return isLowBandLevel(level) ? withoutEnglishSentencesOf(ko) : ko;
}
