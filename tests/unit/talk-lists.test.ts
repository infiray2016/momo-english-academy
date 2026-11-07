// 회화 1~3단계 시드 목록 넷 검사(6.4 '회화 시드 목록' 행 06:187, C207 · C209 · C211 — 'AI 몫 넓힘' plan 묶음 3 · AC-15zf (나)).
// 신호 말 꼴 수 · 물음표 · 길이 · 구간 첫 단계 어휘 범위(허용 낱말 포함), 상황 줄 수 · 범위 · 상황 금지 구, 허용 낱말이 걸린 낱말인지,
// 지어낸 경험 꼴의 1인칭 · 줄이 꼴에 걸리지 않는지를 보고, seed:validate 의 규격 파일 정합(buildReferenceIndex)에 들었는지 본다.
import { describe, expect, it } from "vitest";
import {
  checkTalkLists,
  FIRST_PERSON_WORDS,
  firstLevelOfBand,
  offbandListWords,
  phrasesIn,
  TALK_CUE_LONG_MIN,
  TALK_CUE_SHORT_MIN,
  TALK_SITUATION_LINES_MIN,
  type TalkListsFiles,
} from "@/core/seed/check-talk-lists";
import type { SeedIssue } from "@/core/seed/issue";
import { buildReferenceIndex } from "@/core/seed/reference-index";
import { SEED_FILES } from "@/core/seed/structure";
import { buildLexicon } from "@/core/seed/text";
import { defaultSettings, referenceSet } from "../fixtures/seed/builders";

const ref = referenceSet(defaultSettings());
const { index } = buildReferenceIndex(ref);
const ctx = {
  lexicon: index.lexicon,
  maxWordsAt: (level: number) =>
    index.levelSpec("talk", level)?.sentenceMaxWords,
};

function lists(): Required<TalkListsFiles> {
  return structuredClone({
    talkCueLines: ref.talkCueLines,
    talkSituationLines: ref.talkSituationLines,
    talkAllowedWords: ref.talkAllowedWords,
    talkMadeUpPhrases: ref.talkMadeUpPhrases,
  });
}
const at = (issues: SeedIssue[], rule: string) =>
  issues.filter((i) => i.rule === rule).map((i) => `${i.file}:${i.path}`);
const line = (en: string) => ({ en, ko: "뜻" });

describe("회화 시드 목록 넷 검사(06:187, AC-15zf (나))", () => {
  it("AC-15zf 견본 목록 넷은 검사를 지난다(꼴 수 · 범위 · 금지 구 · 지어낸 경험 꼴)", () => {
    expect(checkTalkLists(lists(), ctx)).toEqual([]);
  });

  it("AC-15zf 꼴 수는 검사 상수다: 신호 말 긴 꼴 하나 이상 · 짧은 꼴 둘 이상, 상황 줄 자리마다 셋 이상", () => {
    expect([
      TALK_CUE_LONG_MIN,
      TALK_CUE_SHORT_MIN,
      TALK_SITUATION_LINES_MIN,
    ]).toEqual([1, 2, 3]);
    const files = lists();
    files.talkCueLines.introduce["1"].long = [];
    files.talkCueLines.together["2-3"].short = [line("With me!")];
    files.talkSituationLines.lines.nospeech = [
      line("Oops! Let's go on."),
      line("Oh no! Let's go on."),
    ];
    const issues = checkTalkLists(files, ctx);
    expect(at(issues, "talk-cue-lines")).toEqual([
      `${SEED_FILES.talkCueLines}:introduce.1.long`,
      `${SEED_FILES.talkCueLines}:together.2-3.short`,
    ]);
    expect(at(issues, "talk-situation-lines")).toEqual([
      `${SEED_FILES.talkSituationLines}:lines.nospeech`,
    ]);
  });

  it("AC-15zf 신호 말은 물음표 · 문장 길이 상한 · 그 구간 첫 단계 어휘 범위(허용 낱말 포함) 밖 낱말을 거부한다", () => {
    expect(firstLevelOfBand("1")).toBe(1);
    expect(firstLevelOfBand("2-3")).toBe(2);
    const files = lists();
    const short = files.talkCueLines.choices["1"].short;
    short[0] = line("Can you pick?");
    short[1] = line("Pick it and say it with me here!");
    files.talkCueLines.introduce["2-3"].long = [line("Say the zebra!")];
    const issues = checkTalkLists(files, ctx);
    expect(at(issues, "talk-cue-lines")).toEqual([
      `${SEED_FILES.talkCueLines}:introduce.2-3.long.0.en`,
      `${SEED_FILES.talkCueLines}:choices.1.short.0.en`,
      `${SEED_FILES.talkCueLines}:choices.1.short.1.en`,
    ]);
    const messages = issues.map((i) => i.message).join("\n");
    expect(messages).toContain("물음표");
    expect(messages).toContain("상한");
    expect(messages).toContain("zebra");
    // 허용 낱말에 넣으면 범위 안이다
    files.talkAllowedWords.allowed.push("zebra");
    expect(at(checkTalkLists(files, ctx), "talk-cue-lines")).not.toContain(
      `${SEED_FILES.talkCueLines}:introduce.2-3.long.0.en`,
    );
  });

  it("AC-15zf 어휘 범위는 축약형을 펼친 조각마다 본다(조각 하나라도 범위 밖이면 그 조각을 낸다)", () => {
    const none = new Set<string>();
    expect(
      offbandListWords("That's it. Let's go!", index.lexicon, 1, none),
    ).toEqual(["go"]);
    expect(
      offbandListWords("We can't go.", index.lexicon, 1, new Set(["go"])),
    ).toEqual([]);
    expect(offbandListWords("Oops!", index.lexicon, 1, none)).toEqual(["oops"]);
    // 허용 낱말이 원형이면 활용형 · 축약형도 덮는다
    const lexicon = buildLexicon([
      { word: "let", pos: ["verb"], level: 3, forms: ["lets", "let's"] },
      { word: "go", pos: ["verb"], level: 3, forms: ["goes", "going"] },
    ]);
    expect(
      offbandListWords("Let's keep going!", lexicon, 1, new Set(["let", "go"])),
    ).toEqual(["keep"]);
  });

  it("AC-15zf 상황 줄은 같은 어휘 · 길이 검사(1단계)를 받고, 상황 금지 구(all 은 모든 자리 · nospeech 는 들리지 않음만)에 걸리면 거부한다", () => {
    const files = lists();
    const { lines } = files.talkSituationLines;
    files.talkAllowedWords.allowed.push("said");
    lines.easy[0] = line("That's wrong! Try this one.");
    lines.close[0] = line("You said it! Let's go on.");
    lines.nospeech[0] = line("You said it! Let's go on.");
    lines.greeting_end[0] = line("Okay! Let's talk about the zebra!");
    const issues = checkTalkLists(files, ctx);
    expect(at(issues, "talk-situation-lines")).toEqual([
      `${SEED_FILES.talkSituationLines}:lines.greeting_end.0.en`,
      `${SEED_FILES.talkSituationLines}:lines.easy.0.en`,
      `${SEED_FILES.talkSituationLines}:lines.nospeech.0.en`,
    ]);
    // 줄임꼴은 펼쳐 견준다(that is wrong = that's wrong)
    lines.easy[0] = line("That is wrong! Try this one.");
    expect(at(checkTalkLists(files, ctx), "talk-situation-lines")).toContain(
      `${SEED_FILES.talkSituationLines}:lines.easy.0.en`,
    );
  });

  it("AC-15zf 허용 낱말은 첫 단계 범위 검사에 걸린 낱말만 둔다(범위 안 낱말은 거부)", () => {
    const files = lists();
    files.talkAllowedWords.allowed.push("it", "like");
    const issues = checkTalkLists(files, ctx);
    const n = files.talkAllowedWords.allowed.length;
    expect(at(issues, "talk-allowed-words")).toEqual([
      `${SEED_FILES.talkAllowedWords}:allowed.${n - 2}`,
      `${SEED_FILES.talkAllowedWords}:allowed.${n - 1}`,
    ]);
  });

  it("AC-15zf 지어낸 경험 꼴은 1인칭 꼴이고, 신호 말 · 상황 줄이 그 꼴(낱말 경계)에 걸리면 거부한다", () => {
    expect([...FIRST_PERSON_WORDS]).toContain("i");
    const files = lists();
    files.talkMadeUpPhrases.phrases.push("last summer");
    files.talkSituationLines.lines.close[1] = line(
      "When I was here, I said it.",
    );
    files.talkCueLines.together["1"].short[0] = line("I remember it!");
    const issues = checkTalkLists(files, ctx);
    expect(at(issues, "talk-made-up-phrases")).toEqual([
      `${SEED_FILES.talkMadeUpPhrases}:phrases.3`,
    ]);
    expect(at(issues, "talk-situation-lines")).toEqual([
      `${SEED_FILES.talkSituationLines}:lines.close.1.en`,
    ]);
    expect(at(issues, "talk-cue-lines")).toEqual([
      `${SEED_FILES.talkCueLines}:together.1.short.0.en`,
    ]);
    // 낱말 경계: 'i remembered' 는 'i remember' 에 걸리지 않는다
    expect(phrasesIn("I remembered it.", ["i remember"])).toEqual([]);
    expect(phrasesIn("Yesterday, I went there.", ["yesterday i"])).toEqual([
      "yesterday i",
    ]);
  });

  it("AC-15zf 사전(vocab)이 없으면 어휘 검사는 건너뛰고 꼴 수 · 물음표 · 금지 구는 그대로 본다", () => {
    const files = lists();
    files.talkCueLines.introduce["1"].short[0] = line("Say the zebra?");
    const issues = checkTalkLists(files, { maxWordsAt: ctx.maxWordsAt });
    expect(issues.map((i) => i.message).join("\n")).not.toContain("어휘 범위");
    expect(at(issues, "talk-cue-lines")).toEqual([
      `${SEED_FILES.talkCueLines}:introduce.1.short.0.en`,
    ]);
    expect(at(issues, "talk-allowed-words")).toEqual([]);
  });

  it("AC-15zf seed:validate 의 규격 파일 정합(buildReferenceIndex)이 목록 검사를 부르고, 지어낸 경험 꼴을 색인에 낸다", () => {
    const bad = structuredClone(ref);
    bad.talkCueLines.choices["2-3"].short = [line("Pick!")];
    const built = buildReferenceIndex(bad);
    expect(at(built.issues, "talk-cue-lines")).toEqual([
      `${SEED_FILES.talkCueLines}:choices.2-3.short`,
    ]);
    expect(built.issues.every((i) => i.severity === "error")).toBe(true);
    expect(buildReferenceIndex(ref).issues).toEqual([]);
    expect(index.talkMadeUpPhrases).toEqual(ref.talkMadeUpPhrases.phrases);
    const { talkMadeUpPhrases: _drop, ...rest } = ref;
    expect(buildReferenceIndex(rest).index.talkMadeUpPhrases).toEqual([]);
  });
});
