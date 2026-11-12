// 새 회화 엔진의 단계에 맞는 말 시험(spec '회화 Claude 주도' 설계 6 · plan 묶음 R4 · AC-26g 순수 몫 · 13절 C238 (3)).
// 재료는 대본 도구와 같은 시드 읽기(3단계 단원 1 — 분류 표 task-level-fit-report 의 실험 수업)다. 분류 표 4절의 일곱 차례가 걸리고, 단원
// 주제 낱말(weekends) · '무리 없음' 사례 · 반응 문장은 걸리지 않으며, 다시 말하기 요청 글에 다른 질문을 시키는 말이 없음을 본다.
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { TALK_LEAD_TEXT_L3U1 } from "@/core/ai/calls/talk-lead";
import {
  LEAD_ANSWER_FRAME_FORMS,
  type LeadFormRule,
  type LeadLevelInput,
  leadChoiceWordsOf,
  leadNarrowHitsOf,
  leadNarrowItemOf,
  leadNarrowOutcomeOf,
  leadNarrowRetryAccepted,
  leadNarrowRetryPrompt,
  leadWideCheckOf,
} from "@/core/conversation/lead-level";
import type { LowLevelLineOptions } from "@/core/conversation/question-check";
import { questionKeyOf } from "@/core/conversation/question-check";
import { buildLexicon } from "@/core/seed/text";
import { materialsOf, readSeedFiles } from "../../scripts/talk-observe";

const ROOT = process.cwd();
const LEVEL = 3;

let input: LeadLevelInput;
let range: LowLevelLineOptions;
let allowedList: ReadonlySet<string>;

beforeAll(() => {
  const m = materialsOf(readSeedFiles(ROOT, LEVEL, 1), {
    level: LEVEL,
    unit: 1,
    lesson: 1,
    teacher: "mina",
  });
  if (!m.ok) throw new Error(m.missing);
  const mat = m.materials;
  const forms = (
    JSON.parse(readFileSync(`${ROOT}/seed/lists/forms.json`, "utf8")) as {
      forms: LeadFormRule[];
    }
  ).forms;
  const lexicon = buildLexicon(
    (
      JSON.parse(readFileSync(`${ROOT}/seed/vocab.json`, "utf8")) as {
        vocab: Parameters<typeof buildLexicon>[0];
      }
    ).vocab,
  );
  allowedList = new Set(mat.talkLists.allowed.allowed);
  range = {
    sentenceMaxWords: mat.ctx.sentenceMaxWords,
    allowedWords: mat.allowedWords,
    unitWords: mat.ctx.unitWords,
    childWords: [],
    teacherName: mat.teacher.nameEn,
    lemmaOf: mat.lemmaOf,
    forms: mat.forms,
    allowedForms: mat.allowedForms,
  };
  input = {
    level: LEVEL,
    range,
    forms,
    lexicon,
    promptLines: [
      TALK_LEAD_TEXT_L3U1.topicEn,
      TALK_LEAD_TEXT_L3U1.sentencesLikeEn,
    ],
    allowed: allowedList,
    allowedLemmaOf: mat.allowedLemmaOf,
  };
});

const texts = (sentence: string, i: LeadLevelInput = input) =>
  leadNarrowHitsOf(sentence, i).map((h) => `${h.kind}:${h.text}`);

describe("좁은 정의(spec 설계 6 (나), 분류 표 4절)", () => {
  // 분류 표 4절의 일곱 차례(P-K1-s1 #13 · P-K1-s2 #15 · #16 · P-K2-s1 #7 · P-K2-s2 #4 · #16 · P-K3-s2 #9)
  const SEVEN: readonly [string, string[]][] = [
    ["Do you go in summer or winter?", ["choice:summer", "choice:winter"]],
    [
      "Do you watch TV or go outside on weekends?",
      ["choice:tv", "choice:outside"],
    ],
    ["Watch TV, or go outside?", ["choice:tv", "choice:outside"]],
    ["What do you want to do there?", ["form:want to"]],
    ["Where does the whale live?", ["form:does"]],
    ["What do you do after the park?", ["axis:after"]],
    ["Do you eat sandwiches or noodles?", ["choice:noodles"]],
  ];

  it.each(SEVEN)(
    "AC-26g 분류 표 일곱 차례가 걸린다: %s",
    (sentence, expected) => {
      expect(texts(sentence)).toEqual(expected);
    },
  );

  it("AC-26g TV 헛걸림(분류 표 P-K3-s1 #6)은 허용 목록에 없으면 걸리고, 있으면 걸리지 않는다(plan 확인할 것 11 — 목록은 고치지 않음)", () => {
    expect(texts("Do you watch TV, or play games?")).toEqual(["choice:tv"]);
    expect(
      texts("Do you watch TV, or play games?", {
        ...input,
        allowed: new Set([...allowedList, "tv"]),
      }),
    ).toEqual([]);
  });

  it("AC-26g 'What do you do on weekends?' 는 단원 주제 낱말이라 걸리지 않는다(재검토 M2-4)", () => {
    expect(texts("What do you do on weekends?")).toEqual([]);
    expect(texts("What do you do on the weekend?")).toEqual([]);
  });

  it("AC-26g weekends 는 안내문 목표 줄이 없으면 범위 밖이지만 명사라 (ㄷ)에도 걸리지 않는다", () => {
    expect(
      texts("What do you do on weekends?", { ...input, promptLines: [] }),
    ).toEqual([]);
  });

  it.each([
    "Do you sleep a lot, or play a lot?",
    "Which one?",
    "Do you go there on Sunday?",
    "Do you go to play?",
    "Is there grass in the park?",
    "Who goes with you?",
    "How are you today?",
    "Do you want to talk more?",
  ])("AC-26g 분류 표의 '무리 없음' 질문은 걸리지 않는다: %s", (sentence) => {
    expect(texts(sentence)).toEqual([]);
  });

  it.each([
    "Ha ha, Coco eats your sock!",
    "Sorry, I didn't hear well!",
    "You can see something!",
    "Great job!",
    "Let's try together!",
    "It is warm today.",
  ])("AC-26g 반응 문장은 보지 않는다: %s", (sentence) => {
    expect(texts(sentence)).toEqual([]);
  });

  it("AC-26g 분류 표의 바꾼 문장은 TV 말고는 걸리지 않는다(분류 표 4절 '질문 문장에 남은 걸림이 TV 뿐')", () => {
    expect(texts("Is it hot or cold then?")).toEqual([]);
    expect(texts("Do you watch TV or go out?")).toEqual(["choice:tv"]);
    expect(texts("Watch TV, or go out?")).toEqual(["choice:tv"]);
    expect(texts("What do you do at the sea?")).toEqual([]);
    expect(texts("Where do whales live?")).toEqual([]);
    expect(texts("Then what do you do?")).toEqual([]);
    expect(texts("Do you eat sandwiches or rice?")).toEqual([]);
  });

  it("AC-26g 여러 문장이 들어오면 마지막 질문 문장만 본다(검토 R4 Minor 2 — 반응 속 didn't 는 걸리지 않고, 반응 뒤 wh 질문은 걸린다)", () => {
    expect(texts("Sorry, I didn't hear. What do you eat?")).toEqual([]);
    expect(texts("Great job! What do you do after the park?")).toEqual([
      "axis:after",
    ]);
    expect(
      texts("What do you do after the park? Do you want to talk more?"),
    ).toEqual(["axis:after"]);
    expect(texts("Sorry, I didn't hear well. Great job!")).toEqual([]);
  });

  it("AC-26g 아이가 이 수업에서 말한 낱말은 선택지여도 걸리지 않는다", () => {
    const said = { ...input, range: { ...range, childWords: ["noodles"] } };
    expect(texts("Do you eat sandwiches or noodles?", said)).toEqual([]);
  });

  it("AC-26g 단계를 올리면 같은 목록으로 넓어진다(does 는 4단계, want to 는 5단계부터 걸리지 않음)", () => {
    expect(texts("Where does the whale live?", { ...input, level: 4 })).toEqual(
      [],
    );
    expect(
      texts("What do you want to do there?", { ...input, level: 4 }),
    ).toEqual(["form:want to"]);
    expect(
      texts("What do you want to do there?", { ...input, level: 5 }),
    ).toEqual([]);
  });

  it("답 틀 꼴은 분류 표 4절의 열아홉 꼴이고 형태 표에 모두 있다", () => {
    const forms = new Set(input.forms.map((f) => f.id));
    expect(LEAD_ANSWER_FRAME_FORMS.size).toBe(19);
    for (const id of LEAD_ANSWER_FRAME_FORMS)
      expect(forms.has(id), id).toBe(true);
    for (const id of ["third-person-s", "to-infinitive", "there-is", "lets"])
      expect(LEAD_ANSWER_FRAME_FORMS.has(id)).toBe(false);
  });

  it("선택지는 'or' 오른쪽 첫 전치사 앞까지 · 왼쪽 같은 수이고 양쪽에 다 있는 낱말은 뺀다", () => {
    expect(
      leadChoiceWordsOf("Do you watch TV or go outside on weekends?"),
    ).toEqual(["watch", "tv", "go", "outside"]);
    expect(leadChoiceWordsOf("Do you sleep a lot, or play a lot?")).toEqual([
      "sleep",
      "play",
    ]);
    expect(leadChoiceWordsOf("Do you play in the park or in the sea?")).toEqual(
      ["park", "sea"],
    );
    expect(leadChoiceWordsOf("What do you eat?")).toEqual([]);
  });
});

describe("다시 말하기 요청 글(spec 설계 6 (나))", () => {
  it("AC-26g 요청 글은 spec 의 글 그대로이고 다른 것을 물으라는 말이 없다", () => {
    const sentence = "Do you go in summer or winter?";
    const prompt = leadNarrowRetryPrompt(
      sentence,
      leadNarrowHitsOf(sentence, input),
    );
    expect(prompt).toBe(
      'Your question "Do you go in summer or winter?" uses "summer, winter", which may be hard for this child. Say the same question again in easier words, with the same meaning. Output only that question.',
    );
    expect(prompt).not.toMatch(
      /\b(?:different|another|other|new|instead|change|topic|card)\b/i,
    );
  });

  it("AC-26g 기록 항목은 걸린 글을 차례대로 잇는다", () => {
    expect(
      leadNarrowItemOf(
        leadNarrowHitsOf("What do you want to do there?", input),
      ),
    ).toBe("want to");
  });
});

describe("받는 조건 · 다시 걸려도 그대로(spec 설계 6 (나) · (다))", () => {
  it("AC-26g 물음표로 끝나는 한 문장만 받는다", () => {
    expect(leadNarrowRetryAccepted(" Is it hot or cold then? ")).toBe(
      "Is it hot or cold then?",
    );
    expect(
      leadNarrowRetryAccepted("Nice! What do you do at the sea?"),
    ).toBeNull();
    expect(leadNarrowRetryAccepted("You go to the beach.")).toBeNull();
    expect(leadNarrowRetryAccepted("")).toBeNull();
    expect(leadNarrowRetryAccepted(null)).toBeNull();
    expect(leadNarrowRetryAccepted(undefined)).toBeNull();
  });

  // 검토 R4 Critical 1: 'Output JSON only' 안내문 위에서 받은 글이 JSON · 감싼 글 · 한국어여도 아이에게 나가지 않는다.
  it.each([
    ["곧은 큰따옴표", '"Do you like cats?"'],
    ["곧은 작은따옴표", "'Do you like cats?'"],
    ["굽은 큰따옴표", "“Do you like cats?”"],
    ["굽은 작은따옴표", "‘Do you like cats?’"],
    ["따옴표 바깥 빈칸", '  "Do you like cats?"  '],
  ])("AC-26g 양끝을 감싼 따옴표 한 겹은 벗기고 받는다: %s", (_name, text) => {
    expect(leadNarrowRetryAccepted(text)).toBe("Do you like cats?");
  });

  it("AC-26g 문장 안의 줄임 따옴표는 그대로 받는다", () => {
    expect(leadNarrowRetryAccepted("What's your dog's name?")).toBe(
      "What's your dog's name?",
    );
    expect(leadNarrowRetryAccepted("Mina, what’s fun there?")).toBe(
      "Mina, what’s fun there?",
    );
  });

  it.each([
    ["JSON say 칸으로 끝남", '{"say": "Do you like cats?"}'],
    [
      "JSON 여러 칸 · say 로 끝남",
      '{"reading":"answered","move":"follow_up","say":"Do you like cats?"}',
    ],
    [
      "JSON 아홉 칸",
      '{"reading":"answered","move":"follow_up","say":"Do you like cats?","model_repeat":"","hint_ko":"","hint_en":"","said_words":[],"wrap_up":false,"choices":[]}',
    ],
    ["코드 울타리 속 JSON", '```json\n{"say":"Do you like cats?"}\n```'],
    ["백틱으로 감쌈", "`Do you like cats?`"],
    ["괄호로 감쌈", "(Do you like cats?)"],
    ["대괄호로 감쌈", "[Do you like cats?]"],
    ["중괄호로 감쌈", "{Do you like cats?}"],
    ["따옴표 두 겹", '""Do you like cats?""'],
    ["따옴표 한쪽만", '"Do you like cats?'],
    ["따옴표 뒤에 물음표", '"Do you like cats"?'],
    ["콜론으로 시작하는 칸 이름", "say: Do you like cats?"],
    ["따옴표 칸 이름", '"say": "Do you like cats?"'],
    ["한국어 물음", "고양이 좋아해요?"],
    ["영어에 한글 섞임", "Do you like 고양이?"],
    ["줄바꿈으로 두 줄", "Do you like cats?\nDo you like dogs?"],
    ["줄바꿈 뒤 한 문장", "Sure.\nDo you like cats?"],
    ["두 문장", "Okay. Do you like cats?"],
    ["물음표 두 문장", "Do you like cats? Or dogs?"],
    ["글자 없는 물음표", "??"],
  ])("AC-26g 받지 않는다(원래 질문이 나감): %s", (_name, text) => {
    expect(leadNarrowRetryAccepted(text)).toBeNull();
    expect(
      leadNarrowOutcomeOf({
        original: "Do you eat sandwiches or noodles?",
        received: text,
        input,
        passes: () => true,
      }),
    ).toEqual({
      sentence: "Do you eat sandwiches or noodles?",
      retry: "",
      again: false,
    });
  });

  it("AC-26g 따옴표를 벗긴 문장이 나가고 기록된다", () => {
    expect(
      leadNarrowOutcomeOf({
        original: "Do you eat sandwiches or noodles?",
        received: "“Do you eat sandwiches or rice?”",
        input,
        passes: () => true,
      }),
    ).toEqual({
      sentence: "Do you eat sandwiches or rice?",
      retry: "Do you eat sandwiches or rice?",
      again: false,
    });
  });

  it("AC-26g 안전 검사는 따옴표를 벗긴 문장을 받는다", () => {
    const seen: string[] = [];
    leadNarrowOutcomeOf({
      original: "Do you eat sandwiches or noodles?",
      received: '"Do you eat sandwiches or rice?"',
      input,
      passes: (s) => {
        seen.push(s);
        return true;
      },
    });
    expect(seen).toEqual(["Do you eat sandwiches or rice?"]);
  });

  const original = "Do you eat sandwiches or noodles?";

  it("AC-26g 받은 문장이 지나면 그 문장이 나간다", () => {
    expect(
      leadNarrowOutcomeOf({
        original,
        received: "Do you eat sandwiches or rice?",
        input,
        passes: () => true,
      }),
    ).toEqual({
      sentence: "Do you eat sandwiches or rice?",
      retry: "Do you eat sandwiches or rice?",
      again: false,
    });
  });

  it("AC-26g 다시 걸린 문장은 지우지 않고 그대로 나간다", () => {
    expect(
      leadNarrowOutcomeOf({
        original,
        received: "Do you eat noodles or pasta?",
        input,
        passes: () => true,
      }),
    ).toEqual({
      sentence: "Do you eat noodles or pasta?",
      retry: "Do you eat noodles or pasta?",
      again: true,
    });
  });

  it.each([
    ["빈 응답", ""],
    ["오류 · 시간 넘음", null],
    ["두 문장", "Yum! Do you eat sandwiches or rice?"],
    ["물음표로 끝나지 않음", "Do you eat sandwiches or rice."],
  ])("AC-26g %s 이면 원래 질문이 나간다", (_name, received) => {
    expect(
      leadNarrowOutcomeOf({ original, received, input, passes: () => true }),
    ).toEqual({
      sentence: original,
      retry: "",
      again: false,
    });
  });

  it("AC-26g 안전 검사 콜백은 빠뜨릴 수 없다(형 검사, 검토 R4 Minor 3)", () => {
    const call = () =>
      // @ts-expect-error passes 를 빠뜨리면 형 검사가 막는다
      leadNarrowOutcomeOf({ original, received: original, input });
    expect(call).toBeTypeOf("function");
  });

  it("AC-26g 안전 검사에 걸리면 원래 질문이 나간다", () => {
    expect(
      leadNarrowOutcomeOf({
        original,
        received: "Do you eat sandwiches or rice?",
        input,
        passes: () => false,
      }),
    ).toEqual({ sentence: original, retry: "", again: false });
  });
});

describe("넓은 검사는 기록 전용(spec 설계 6)", () => {
  it("AC-26g 넓은 검사는 수치만 내고, 반응 속 범위 밖 낱말 · 꼴과 weekends 질문을 센다", () => {
    const say = "Ha ha, Coco eats your sock! What do you do on weekends?";
    const wide = leadWideCheckOf(say, {
      range,
      extra: { allowed: allowedList },
      sentenceMax: 3,
    });
    expect(wide.sentences).toBe(2);
    expect(wide.overSentenceMax).toBe(0);
    expect(wide.offbandWords).toBeGreaterThan(0);
    expect(wide.offbandForms).toBeGreaterThan(0);
    expect(wide.questionsHit).toBe(1);
    expect(wide.sameQuestion).toBeUndefined();
    for (const v of Object.values(wide)) expect(typeof v).toBe("number");
    // 같은 글의 좁은 정의는 걸림이 없다
    expect(
      say.split(/(?<=[!?])\s+/).flatMap((s) => leadNarrowHitsOf(s, input)),
    ).toEqual([]);
  });

  it("AC-26g 같은 질문 열쇠 · 문장 길이 · 문장 수를 센다", () => {
    const say =
      "I like that very very much and I want to say it again now. What do you eat? Yum. Nice.";
    const wide = leadWideCheckOf(say, {
      range,
      sentenceMax: 3,
      same: {
        blocked: [],
        asked: new Map([[questionKeyOf("What do you eat?"), 2]]),
        max: 2,
      },
    });
    expect(wide.sentences).toBe(4);
    expect(wide.overSentenceMax).toBe(1);
    expect(wide.longSentences).toBe(1);
    expect(wide.maxWords).toBe(14);
    expect(wide.sameQuestion).toBe(2);
  });
});
