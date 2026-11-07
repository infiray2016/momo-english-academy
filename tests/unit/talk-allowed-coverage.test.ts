// 상황 차례 허용 낱말의 넓이 시험('AI 몫 넓힘' plan 묶음 5 · 위험 8 · spec 판 4 설계 1 말 검사 (가) · AC-1 (나) · N-1, 정본 06:187 (3)).
// 허용 목록(seed/lists/talk-allowed-words.json allowed)은 손으로 적지 않고 예 문장 전체를 1단계 범위 검사에 돌려 걸린 낱말로 만든다(묶음 3-(다)
// 절차). 이 시험은 그 예 문장(시드 신호 말 · 상황 줄 · 고정부 1~3 예 · 고정부 짧은 반응 예 · 정본 · spec 예)이 앱의 실제 상황 차례 검사
// (core situation checkSituationSentence — 축약형 펼침 · 닫힌 품사 한 낱말 · 허용 목록)를 1단계 범위로 모두 지나는지, 허용 목록에 예 문장에서
// 걸리지 않은 낱말(손으로 더한 낱말)이 없는지 본다. 1단계가 가장 좁은 범위라 2 · 3단계는 따라서 지난다(어휘 범위는 아래 단계를 품는다).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TALK_SITUATION_EXAMPLES } from "@/core/ai/calls/talk-lesson";
import type { LowLevelLineOptions } from "@/core/conversation/question-check";
import {
  checkSituationSentence,
  type SituationPlace,
  TALK_LOW_REACTION_EXAMPLES,
} from "@/core/conversation/situation";
import { offbandListWords } from "@/core/seed/check-talk-lists";
import { buildLexicon, lemmasOf, tokenize } from "@/core/seed/text";
import {
  type Materials,
  materialsOf,
  readSeedFiles,
} from "../../scripts/talk-observe";

const ROOT = process.cwd();

/** 그 단계의 상황 차례 검사 재료(대본 도구와 같은 시드 읽기 — 3단계 카드 파일을 빌려 그 단계 규격 · 어휘로 돌린다). */
function materialsAt(level: number): Materials {
  const three = readSeedFiles(ROOT, 3, 1);
  const files = readSeedFiles(ROOT, level, 1);
  const m = materialsOf(
    { ...files, lessonFile: three.lessonFile },
    { level, unit: 1, lesson: 1, teacher: "mina" },
  );
  if (!m.ok) throw new Error(m.missing);
  return m.materials;
}

/** 단원 단어 · 아이 말 없이 그 단계 어휘 범위만(가장 좁은 범위). */
function rangeOf(m: Materials): LowLevelLineOptions {
  return {
    sentenceMaxWords: m.ctx.sentenceMaxWords,
    allowedWords: m.allowedWords,
    unitWords: [],
    childWords: [],
    teacherName: m.teacher.nameEn,
    lemmaOf: m.lemmaOf,
    forms: m.forms,
    allowedForms: m.allowedForms,
  };
}

type Example = { source: string; place: SituationPlace; en: string };

/** 고정부 1~3 예의 자리(TALK_SITUATION_EXAMPLES 열쇠 → 상황 자리). */
const EXAMPLE_PLACE: Readonly<
  Record<keyof typeof TALK_SITUATION_EXAMPLES, SituationPlace>
> = {
  greetingEndPrep: "greeting_end",
  greetingEndTalk: "greeting_end",
  together: "together",
  easy: "easy",
  close: "close",
  nospeech: "nospeech",
};

/** 넓이 시험의 예 문장 전부(묶음 3-(다) 허용 낱말을 뽑은 것과 같은 출처). */
function examplesOf(m: Materials): Example[] {
  const out: Example[] = [];
  // 신호 말은 상황 차례 문장이 아니지만 같은 범위 검사(06:187 신호 말 행)를 받는다 — 금지 구는 모든 상황 몫으로 본다
  for (const [, bands] of Object.entries(m.talkLists.cue))
    for (const [, forms] of Object.entries(bands))
      for (const line of [...forms.long, ...forms.short])
        out.push({ source: "신호 말", place: "together", en: line.en });
  for (const [place, lines] of Object.entries(m.talkLists.situation.lines))
    for (const line of lines ?? [])
      out.push({
        source: "상황 줄",
        place: place as SituationPlace,
        en: line.en,
      });
  for (const [key, lines] of Object.entries(TALK_SITUATION_EXAMPLES))
    for (const en of lines)
      out.push({
        source: "고정부 1~3 예",
        place: EXAMPLE_PLACE[key as keyof typeof TALK_SITUATION_EXAMPLES],
        en,
      });
  // 고정부 짧은 반응 예(05:38 '네 낱말 안의 짧은 반응' · 1~3단계 짧은 반응 예 — 대본 회차 r2 판정 N-1 (라) yummy)
  for (const en of [
    "Me too!",
    "Yum!",
    "Good to hear!",
    ...TALK_LOW_REACTION_EXAMPLES,
  ])
    out.push({ source: "고정부 짧은 반응 예", place: "together", en });
  // 정본 · spec 예(02-2:212 신호 말 · spec 설계 1 들리지 않음 · AC-1 (나))
  out.push(
    {
      source: "정본 · spec 예",
      place: "together",
      en: "Listen and say it with me!",
    },
    { source: "정본 · spec 예", place: "together", en: "Your turn!" },
    {
      source: "정본 · spec 예",
      place: "nospeech",
      en: "Oops, my ears! Let's go on.",
    },
    { source: "정본 · spec 예", place: "together", en: "That's okay!" },
  );
  return out;
}

/**
 * 서버와 같은 상황 차례 검사(허용 낱말 대조는 모든 단계 원형 사전 — 서버 readAllowedLemmaOf 와 같은 core allowedLemmaOfVocab, 대본 도구
 * materials.allowedLemmaOf). dictionary 거짓이면 사전 없는 길(규칙 꼬리 떼기)로 본다.
 */
function checkAt(
  m: Materials,
  e: Pick<Example, "place" | "en">,
  allowed: ReadonlySet<string>,
  dictionary = true,
) {
  return checkSituationSentence(e.en, {
    place: e.place,
    options: rangeOf(m),
    allowed,
    ...(dictionary ? { allowedLemmaOf: m.allowedLemmaOf } : {}),
    forbidden: m.talkLists.situation.forbidden,
    answer: null,
  });
}

describe("허용 목록의 넓이(1단계 범위)", () => {
  const m = materialsAt(1);
  const allowed = new Set(m.talkLists.allowed.allowed);
  const examples = examplesOf(m);

  it("예 문장 출처 다섯이 모두 들어 있다", () => {
    expect(new Set(examples.map((e) => e.source))).toEqual(
      new Set([
        "신호 말",
        "상황 줄",
        "고정부 1~3 예",
        "고정부 짧은 반응 예",
        "정본 · spec 예",
      ]),
    );
  });

  it("예 문장이 모두 상황 차례 검사를 지난다(허용 목록 + 1단계 범위)", () => {
    const failed = examples.flatMap((e) => {
      const check = checkAt(m, e, allowed);
      return check.ok
        ? []
        : [
            `${e.source} · ${e.place} · "${e.en}" → ${check.reason}(${(check.words ?? []).join(", ")})`,
          ];
    });
    expect(failed).toEqual([]);
  });

  it("사전 없는 길(규칙 꼬리 떼기)로도 예 문장이 모두 지난다(순수 시험 · 옛 배선의 대신 길)", () => {
    const failed = examples.filter((e) => !checkAt(m, e, allowed, false).ok);
    expect(failed.map((e) => e.en)).toEqual([]);
  });

  it("허용 목록이 없으면 걸리는 예 문장이 있다(시험이 범위를 실제로 본다)", () => {
    expect(examples.some((e) => !checkAt(m, e, new Set<string>()).ok)).toBe(
      true,
    );
  });

  it("허용 낱말은 모두 예 문장에서 1단계 범위 밖으로 걸린 낱말이다(손으로 더한 낱말 없음 · 06:187 (3))", () => {
    const lexicon = buildLexicon(
      (
        JSON.parse(readFileSync(`${ROOT}/seed/vocab.json`, "utf8")) as {
          vocab: Parameters<typeof buildLexicon>[0];
        }
      ).vocab,
    );
    const hit = new Set<string>();
    for (const e of examples)
      for (const w of offbandListWords(e.en, lexicon, 1, new Set())) {
        const part = lemmasOf(tokenize(w), lexicon)
          .flatMap((x) => x.parts)
          .find((p) => p.text.toLowerCase() === w);
        hit.add((part?.ids[0] ?? w).toLowerCase());
      }
    expect([...allowed].filter((w) => !hit.has(w))).toEqual([]);
  });

  it("'That's okay!' 는 받침 · 들리지 않음 자리에서 남는다(AC-1 (나) — 축약형을 펼친 뒤 범위 안)", () => {
    for (const place of ["together", "easy", "close", "nospeech"] as const)
      expect(checkAt(m, { place, en: "That's okay!" }, allowed)).toEqual({
        ok: true,
      });
  });
});

describe("답 글 검사와 함께(3단계 카드 · 실제 목록)", () => {
  const m = materialsAt(3);
  const allowed = new Set(m.talkLists.allowed.allowed);
  const question = m.card.required[0];

  it("질문 글의 낱말만 쓴 반응은 남고 질문 글에 없는 답 예시 내용어는 걸린다(AC-1 (나) · N-2)", () => {
    if (!question) throw new Error("필수 질문 없음");
    const ctx = (en: string) =>
      checkSituationSentence(en, {
        place: "together",
        options: rangeOf(m),
        allowed,
        allowedLemmaOf: m.allowedLemmaOf,
        forbidden: m.talkLists.situation.forbidden,
        answer: {
          example: question.answerExample,
          question: question.en,
          functionWords: m.functionWords,
        },
      });
    expect(ctx("Rice and fish, yum!")).toEqual({ ok: true });
    expect(ctx("That's okay!")).toEqual({ ok: true });
    expect(ctx("You eat it!")).toEqual(
      expect.objectContaining({ ok: false, reason: "answer" }),
    );
  });

  it("시드 상황 줄은 3단계 범위로도 모두 지난다", () => {
    for (const e of examplesOf(m).filter((x) => x.source === "상황 줄"))
      expect(checkAt(m, e, allowed)).toEqual({ ok: true });
  });
});
