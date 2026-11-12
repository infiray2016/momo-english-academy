// 회화 N 길(talk.lead_mode 'claude', 13절 C233 · C238)의 AI 차례 힌트 재료(spec 설계 3 '힌트 단추' · FR-10). 응답의 hint_ko · hint_en 두 칸에서
// 지금 힌트 단추가 쓰는 단(lessonHintTiersOf)을 만든다. 단 수 · 차례 · 듣기 단추 · 힌트 종류 규칙은 지금 그대로이고, 영어 틀은 앱이 hint_en 의
// 단원 단어 자리를 비워 만든다(단원 단어가 둘 이상이면 첫 것만, 활용형은 원형 대조, 없으면 틀 단 없이). 빈 칸이면 그 턴은 힌트 단추가 없다(검사에
// 걸린 힌트는 applyTalkLeadChecks 가 둘 다 비운다). 순수 모듈이다.
import { talkLeadCheckFields } from "@/core/ai/calls/talk-lead";
import {
  checkOutputFields,
  type OutputCheckOptions,
} from "@/core/ai/output-check";
import {
  type AiHints,
  type HintTier,
  type LessonHintSpec,
  lessonHintTiersOf,
} from "@/core/conversation/hints";
import {
  type LeadLevelInput,
  leadUnknownWordsIn,
} from "@/core/conversation/lead-level";
import { withoutEnglishSentencesOf } from "@/core/conversation/spoken";
import { type AskKind, TALK_LOW_BAND } from "@/core/seed/structure";
import { splitSentences } from "@/core/seed/text";

/** 틀의 빈 자리(시드 카드 frameEn 과 같은 꼴). */
export const LEAD_FRAME_BLANK = "___";

/** 영어 낱말(줄임꼴 한 덩이). */
const WORD = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;

/**
 * hint_en 의 영어 틀: 처음 나온 단원 단어(글자 그대로 또는 원형이 단원 단어) 한 자리를 비운다. 단원 단어가 없으면 null(틀 단 없음).
 */
export function leadHintFrameOf({
  hintEn,
  unitWords,
  lemmaOf,
}: {
  hintEn: string;
  unitWords: readonly string[];
  /** 표기형 → 원형(vocab forms). */
  lemmaOf: (surface: string) => string | undefined;
}): string | null {
  const unit = new Set(unitWords.map((w) => w.toLowerCase()));
  for (const match of hintEn.matchAll(WORD)) {
    const lower = match[0].toLowerCase();
    const lemma = lemmaOf(lower)?.toLowerCase();
    if (!unit.has(lower) && (lemma === undefined || !unit.has(lemma))) continue;
    const at = match.index ?? 0;
    return `${hintEn.slice(0, at)}${LEAD_FRAME_BLANK}${hintEn.slice(at + match[0].length)}`;
  }
  return null;
}

/**
 * 응답 힌트 두 칸을 지금 힌트 단 재료(AiHints)로 옮긴다: 영어 단은 단계 규격 hintTiers 의 ko 밖 차례대로 틀(frame) · 문장(sentence = hint_en)이다.
 * 1~3단계 구간의 뜻(hint_ko)은 영어 문장 거르개(withoutEnglishSentencesOf)를 지난 글을 쓴다(spec 설계 8 — 영어 문장을 뜻 단에 미리 보이지 않음,
 * 검토 M-3). 두 칸 가운데 하나라도 비면(거른 뒤 포함) undefined(힌트 단추 없음). 쓸 수 있는 말은 없다.
 */
export function leadAiHintsOf({
  hintKo,
  hintEn,
  spec,
  unitWords,
  lemmaOf,
}: {
  hintKo: string;
  hintEn: string;
  spec: Pick<LessonHintSpec, "band" | "hintTiers">;
  unitWords: readonly string[];
  lemmaOf: (surface: string) => string | undefined;
}): AiHints | undefined {
  const ko = (
    spec.band === TALK_LOW_BAND ? withoutEnglishSentencesOf(hintKo) : hintKo
  ).trim();
  const en = hintEn.trim();
  if (ko === "" || en === "") return undefined;
  const frame = leadHintFrameOf({ hintEn: en, unitWords, lemmaOf }) ?? "";
  const hints = spec.hintTiers
    .filter((tier) => tier !== "ko")
    .map((tier) => (tier === "frame" ? frame : en));
  return { hintKo: ko, hints, usable: [] };
}

/** 힌트를 막은 까닭(그 턴은 힌트 단추가 없다 — 부르는 쪽이 기록에 쓴다). */
export type LeadHintBlock =
  /** 6.4 출력 검사(금지어 · 연락처 · 문장 길이)에 걸린 칸. */
  | { kind: "output_check"; paths: string[] }
  /** hint_en 의 아는 낱말 밖 낱말(spec 설계 3 '6.4 의 범위 밖 낱말은 설계 6 의 아는 낱말 범위로 본다', 소문자 · 차례대로). */
  | { kind: "out_of_range"; words: string[] };

const HINT_PATHS: ReadonlySet<string> = new Set(["hint_ko", "hint_en"]);

/**
 * 힌트 두 칸의 검사(spec 설계 3 '힌트 단추'): 지금 엔진이 AI 힌트에 거는 6.4 출력 검사(checkOutputFields — talkLeadCheckFields 의 힌트 칸)를 먼저
 * 보고, 지나면 hint_en 의 문장마다 묶음 R4 의 아는 낱말 범위(leadUnknownWordsIn — 단계 어휘 · 단원 단어 · 아이가 말한 낱말 · 선생님 이름 ·
 * 안내문 목표 줄 낱말 · 허용 목록) 밖 낱말을 찾는다. 둘 다 지나면 null 이다.
 */
export function leadHintBlockOf({
  output,
  check,
  range,
}: {
  output: { hint_ko: string; hint_en: string };
  check: OutputCheckOptions;
  range: LeadLevelInput;
}): LeadHintBlock | null {
  const hits = checkOutputFields(
    talkLeadCheckFields({ say_ko: "", ...output }),
    check,
  );
  const paths = [...hits.keys()].filter((path) => HINT_PATHS.has(path));
  if (paths.length > 0) return { kind: "output_check", paths };
  const words: string[] = [];
  for (const sentence of splitSentences(output.hint_en))
    for (const word of leadUnknownWordsIn(sentence, range))
      if (!words.includes(word)) words.push(word);
  return words.length > 0 ? { kind: "out_of_range", words } : null;
}

/**
 * N 의 AI 차례 힌트 단(지금 lessonHintTiersOf 에 카드 항목 없이 넘긴다 — 빈 틀 단은 거기서 빠진다). 힌트가 검사(leadHintBlockOf)에 걸리면
 * 힌트 단추를 내지 않고(빈 단) 걸린 까닭을 함께 돌려준다.
 */
export function leadHintTiersOf({
  output,
  spec,
  unitWords,
  lemmaOf,
  askKind,
  check,
  range,
}: {
  output: { hint_ko: string; hint_en: string };
  spec: LessonHintSpec;
  unitWords: readonly string[];
  lemmaOf: (surface: string) => string | undefined;
  askKind: AskKind;
  check: OutputCheckOptions;
  range: LeadLevelInput;
}): { tiers: HintTier[]; blocked: LeadHintBlock | null } {
  const blocked =
    output.hint_ko.trim() === "" || output.hint_en.trim() === ""
      ? null
      : leadHintBlockOf({ output, check, range });
  const ai =
    blocked === null
      ? leadAiHintsOf({
          hintKo: output.hint_ko,
          hintEn: output.hint_en,
          spec,
          unitWords,
          lemmaOf,
        })
      : undefined;
  return {
    tiers: lessonHintTiersOf({ spec, item: null, ai, askKind }),
    blocked,
  };
}
