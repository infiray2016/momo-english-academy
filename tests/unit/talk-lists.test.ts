// 회화 1~3단계 시드 목록 넷 검사(6.4 '회화 시드 목록' 행 06:187, C207 · C209 · C211 — 'AI 몫 넓힘' plan 묶음 3 · AC-15zf (나)).
// 신호 말 꼴 수 · 물음표 · 길이 · 구간 첫 단계 어휘 범위(허용 낱말 포함), 상황 줄 수 · 범위 · 상황 금지 구, 허용 낱말이 걸린 낱말인지,
// 지어낸 경험 꼴의 1인칭 · 줄이 꼴에 걸리지 않는지를 보고, seed:validate 의 규격 파일 정합(buildReferenceIndex)에 들었는지 본다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkTalkLists,
  FIRST_PERSON_WORDS,
  firstLevelOfBand,
  offbandListWords,
  phrasesIn,
  situationLinesMinOf,
  TALK_ASK_AGAIN_KO_FORBIDDEN,
  TALK_ASK_AGAIN_LINES_MIN,
  TALK_CUE_LONG_MIN,
  TALK_CUE_SHORT_MIN,
  TALK_SAME_SENTENCE_MIN_WORDS,
  TALK_SITUATION_LINES_MIN,
  type TalkListsFiles,
} from "@/core/seed/check-talk-lists";
import type { SeedIssue } from "@/core/seed/issue";
import { buildReferenceIndex } from "@/core/seed/reference-index";
import { SEED_FILES, TALK_SITUATION_PLACES } from "@/core/seed/structure";
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

describe("되묻기 자리의 상황 줄 검사(06:187 (2) · 13절 C218 · 'C218 · C222 보완 2' — 내용 고침 2 묶음 2-0, AC-15zo (라))", () => {
  const FILE = SEED_FILES.talkSituationLines;
  const askAgainAt = (issues: SeedIssue[]) =>
    at(issues, "talk-situation-lines").filter((p) =>
      p.startsWith(`${FILE}:lines.ask_again`),
    );

  it("AC-15zo 줄 수 하한은 되묻기 자리만 다섯이고 그 밖의 자리는 셋이다(시드 꼴 검사 상수)", () => {
    expect(TALK_ASK_AGAIN_LINES_MIN).toBe(5);
    expect(
      Object.fromEntries(
        TALK_SITUATION_PLACES.map((place) => [
          place,
          situationLinesMinOf(place),
        ]),
      ),
    ).toEqual({
      greeting_end: 3,
      together: 3,
      easy: 3,
      close: 3,
      nospeech: 3,
      ask_again: 5,
    });
    const files = lists();
    files.talkSituationLines.lines.ask_again.pop();
    expect(askAgainAt(checkTalkLists(files, ctx))).toEqual([
      `${FILE}:lines.ask_again`,
    ]);
  });

  it("AC-15zo 되묻기 줄은 물음표가 없다(다른 상황 자리의 줄은 물음표 검사를 받지 않는다 — 고치기 전 그대로)", () => {
    const files = lists();
    files.talkSituationLines.lines.ask_again[0] = line("Oh! Say it again?");
    files.talkSituationLines.lines.easy[0] = line("Okay! Try this one?");
    const issues = checkTalkLists(files, ctx);
    expect(at(issues, "talk-situation-lines")).toEqual([
      `${FILE}:lines.ask_again.0.en`,
    ]);
    expect(issues[0]?.message).toContain("물음표");
  });

  it("AC-15zo 되묻기 줄에는 금지 구 셋(모든 상황 차례 · 들리지 않음 · 되묻기 자리)을 모두 건다 — 'my ears' · 'try again' · 'louder' 꼴", () => {
    const files = lists();
    const { lines } = files.talkSituationLines;
    files.talkAllowedWords.allowed.push("said", "louder", "my");
    lines.ask_again[0] = line("Oops, my ears! Say it again.");
    lines.ask_again[1] = line("Oh! Try again.");
    lines.ask_again[2] = line("Oh! Say it louder.");
    lines.ask_again[3] = line("You said it! Say it again.");
    lines.ask_again[4] = line("That's wrong! Say it again.");
    const issues = checkTalkLists(files, ctx);
    expect(askAgainAt(issues)).toEqual(
      [0, 1, 2, 3, 4].map((i) => `${FILE}:lines.ask_again.${i}.en`),
    );
    const messages = issues.map((i) => i.message);
    expect(messages[0]).toContain("'my ears'");
    expect(messages[1]).toContain("'try again'");
    expect(messages[2]).toContain("'louder'");
    expect(messages[3]).toContain("'you said'");
    expect(messages[4]).toContain("'that's wrong'");
    // 되묻기 자리의 금지 구는 다른 자리에는 걸지 않는다(들리지 않음 자리의 'my ears' 견본 줄은 그대로 지난다)
    expect(at(checkTalkLists(lists(), ctx), "talk-situation-lines")).toEqual(
      [],
    );
  });

  it("AC-15zo 되묻기 줄은 들리지 않음 자리의 줄과 같은 줄 · 같은 문장을 쓰지 않는다(한 낱말 감탄은 함께 쓴다)", () => {
    expect(TALK_SAME_SENTENCE_MIN_WORDS).toBe(2);
    const files = lists();
    const { lines } = files.talkSituationLines;
    // 들리지 않음 견본: "Oops, my ears! Let's go on." · "Oops! Let's go on." · "Oh no! Let's go on."
    lines.ask_again[0] = line("Okay! Let's go on.");
    lines.ask_again[1] = line("Oh no! Let's go on.");
    // 'Oops!' 한 낱말 감탄은 들리지 않음 줄에도 있지만 견주지 않는다
    lines.ask_again[2] = line("Oops! Say it again.");
    expect(askAgainAt(checkTalkLists(files, ctx))).toEqual([
      `${FILE}:lines.ask_again.0.en`,
      `${FILE}:lines.ask_again.1.en`,
    ]);
    expect(checkTalkLists(files, ctx)[0]?.message).toContain(
      "들리지 않음 자리의 줄과 같은 문장",
    );
  });

  it("AC-15zo 되묻기 줄의 한국어 뜻은 '내가 다시 들어 볼게' 쪽이다 — 틀렸다 · 못 알아듣겠다 · 다시 해 봐 · 크게 말해 꼴을 거부한다", () => {
    expect(TALK_ASK_AGAIN_KO_FORBIDDEN).toEqual([
      "틀렸",
      "틀린",
      "못 알아",
      "모르겠",
      "다시 해",
      "크게",
    ]);
    const files = lists();
    const { lines } = files.talkSituationLines;
    const ko = (i: number, text: string) => {
      const row = lines.ask_again[i];
      if (row) row.ko = text;
    };
    ko(0, "틀렸어! 다시 말해 줘.");
    ko(1, "무슨 말인지 못 알아듣겠어.");
    ko(2, "다시 해 봐!");
    ko(3, "더 크게 말해 줘!");
    ko(4, "미안! 다시 잘 들어 볼게.");
    // 다른 자리의 뜻에는 걸지 않는다
    const easy = lines.easy[0];
    if (easy) easy.ko = "괜찮아! 다시 해 보자.";
    const issues = checkTalkLists(files, ctx);
    expect(askAgainAt(issues)).toEqual(
      [0, 1, 2, 3].map((i) => `${FILE}:lines.ask_again.${i}.ko`),
    );
    expect(at(issues, "talk-situation-lines")).toHaveLength(4);
  });

  it("AC-15zo 실제 시드: 되묻기 줄 다섯은 again 을 쓰는 '한 번 더 말해 줘' 꼴이고, 검사에 걸리는 뜻 · 물음표가 없다", () => {
    const seed = JSON.parse(
      readFileSync(join(process.cwd(), "seed", FILE), "utf8"),
    ) as {
      lines: { ask_again: { en: string; ko: string }[] };
      forbidden: { ask_again: string[] };
    };
    const rows = seed.lines.ask_again;
    expect(rows.length).toBeGreaterThanOrEqual(TALK_ASK_AGAIN_LINES_MIN);
    for (const row of rows) {
      expect(row.en.toLowerCase(), row.en).toMatch(/\bagain\b/);
      expect(row.en, row.en).not.toContain("?");
      expect(phrasesIn(row.en, seed.forbidden.ask_again), row.en).toEqual([]);
      expect(
        TALK_ASK_AGAIN_KO_FORBIDDEN.filter((w) => row.ko.includes(w)),
        row.ko,
      ).toEqual([]);
    }
    expect(new Set(rows.map((row) => row.en)).size).toBe(rows.length);
  });
});

describe("실제 시드의 인사 끝 상황 줄 — 짧은 준비가 없는 수업에서도 쓰인다('AI 몫 넓힘' CI 고침 1 우려)", () => {
  it("인사 끝 줄은 다음 토막을 가정하지 않는다 — 새 단어를 배우자는 꼴도, 이야기하자는 꼴도 없다(예문만 다음 토막으로 가른다, situation.ts situationExamplesOf · greetingEndPrep · greetingEndTalk)", () => {
    const seed = JSON.parse(
      readFileSync(
        join(process.cwd(), "seed", SEED_FILES.talkSituationLines),
        "utf8",
      ),
    ) as { lines: { greeting_end: { en: string }[] } };
    const lines = seed.lines.greeting_end.map((l) => l.en.toLowerCase());
    // 줄 수는 시드 검사 하한과 같으므로(check-talk-lists) 고칠 때는 줄을 빼지 말고 더한다(검토 M-2)
    expect(lines.length).toBeGreaterThanOrEqual(TALK_SITUATION_LINES_MIN);
    // 넘김 낱말: 짧은 준비 쪽(learn · new · word) · 대화 쪽(talk · chat)
    expect(
      lines.filter((en) => /\b(learn|new|words?|talk(ing)?|chat)\b/.test(en)),
    ).toEqual([]);
  });
});
