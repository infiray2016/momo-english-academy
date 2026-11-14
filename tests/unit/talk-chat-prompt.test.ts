// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R spec 설계 2 · 3 · 11, plan 묶음 P1)의 요청 조립: 안내문 골든과 R3
// 글과의 줄 대조 · 자리 값 여섯 · 응답 네 칸의 차례 · 호출 규격 · 사용자 메시지 꼴(수업 시작 · 입력 줄 여섯 · 돌아옴 · 사실 줄 넷) · 대화 기록 ·
// 인식기 정보와 알림 줄 · 이름 가림. 실제 API 를 부르지 않는다. 3단계 단원 1 의 값은 시드와 시제품 R3(scripts/exp/arch-arm-q.ts)에서 읽는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CallSettingError, prepareAnswer } from "@/core/ai/calls/common";
import {
  applyTalkChatChecks,
  CHAT_LANGUAGE_TEMPLATE,
  CHAT_SYSTEM_SLOTS,
  CHAT_SYSTEM_TEMPLATE,
  normalizeTalkChat,
  TALK_CHAT_OUTPUT_FIELDS,
  TALK_CHAT_RECORD_TAG,
  TALK_CHAT_SETTING_SCHEMAS,
  TALK_CHAT_TITLE,
  type TalkChatInput,
  type TalkChatOutput,
  TalkChatOutputSchema,
  type TalkChatTeacher,
  talkChatAssistantOf,
  talkChatCheckFields,
  talkChatLanguageOf,
  talkChatMessages,
  talkChatRulesOf,
  talkChatSystem,
  talkChatTopicOf,
  talkChatTurnSpec,
} from "@/core/ai/calls/talk-chat";
import { TALK_LEAD_TEXT_L3U1, talkLeadTextOf } from "@/core/ai/calls/talk-lead";
import { settingKeysOf } from "@/core/ai/combo";
import { fillName, type Masker } from "@/core/ai/mask";
import { checkOutputFields } from "@/core/ai/output-check";
import { buildAiRequest } from "@/core/ai/request";
import {
  CHAT_DAY_PARTS,
  CHAT_MESSAGE_SETTING_SCHEMAS,
  type ChatFact,
  type ChatInput,
  type ChatRecognizerRules,
  type ChatUserMessage,
  chatClockOf,
  chatDayPartHoursOf,
  chatDayPartOf,
  chatFactLineOf,
  chatInputLineOf,
  chatMetSentenceOf,
  chatRecognizerNoteOf,
  chatRecognizerRulesOf,
  chatRecognizerSchemaOf,
  chatStartLineOf,
  chatUserMessageOf,
} from "@/core/conversation/chat-message";
import {
  Q_LANGUAGE,
  qChildMessageOf,
  qSystemOf,
  R3_SYSTEM_TEMPLATE,
  r2StartMessageOf,
} from "../../scripts/exp/arch-arm-q";
import { SAMPLE_FORBIDDEN } from "../fixtures/ai/sample-inputs";
import { testSettingValues } from "../fixtures/settings";

const ROOT = join(__dirname, "../..");
const readJson = (path: string) =>
  JSON.parse(readFileSync(join(ROOT, path), "utf8"));
const GOLDEN = readFileSync(
  join(ROOT, "tests/fixtures/talk-chat-system-l3u1-mina.txt"),
  "utf8",
);

/**
 * 시험용 설정값. 이야기 방식의 새 키(spec 설정 표)는 묶음 C 가 시험 설정(tests/fixtures/settings.ts)에 더한다 — 그 전에는 spec 설정 표의 잠정
 * 값을 쓰고, 시험 설정에 키가 생기면 그 값이 이긴다.
 */
const SPEC_DEFAULTS: Readonly<Record<string, unknown>> = {
  "talk.chat_turn_words.1-3": 12,
  "talk.chat_day_part_hours": [5, 12, 18],
  "talk.chat_unsure_confidence": 0.5,
  "talk.chat_unsure_on_partial": false,
};
const values: Record<string, unknown> = {
  ...SPEC_DEFAULTS,
  ...testSettingValues(),
};

const UNIT = (
  readJson("seed/unit-specs.json").unitSpecs as {
    area: string;
    level: number;
    unit: number;
    words: string[];
  }[]
).find((u) => u.area === "talk" && u.level === 3 && u.unit === 1);
const MINA = (
  readJson("seed/teachers.json").teachers as { key: string; nameEn: string }[]
).find((t) => t.key === "mina");

/** R3 글의 About you 문단에서 성격 · 좋아하는 것의 자리(spec 설계 2 자리 값 표 '미나는 R3 의 글'). */
const R3_PERSONA =
  "You are warm, curious, and a little playful, and you laugh easily.";
const R3_FAVORITES =
  "you like small animals (cats most of all), drawing, music, puzzles, kites, picture books, the sea, and stars; your favorite fruit is strawberries and your favorite color is yellow.";
const R3_TOPIC = "weekends and nature";

function mina(): TalkChatTeacher {
  if (!MINA) throw new Error("시드에 미나가 없다");
  return {
    nameEn: MINA.nameEn,
    chatPersonaEn: R3_PERSONA,
    chatFavoritesEn: R3_FAVORITES,
  };
}

function chatInput(over: Partial<TalkChatInput> = {}): TalkChatInput {
  if (!UNIT) throw new Error("시드에 회화 3단계 단원 1 이 없다");
  return {
    level: 3,
    unitWords: UNIT.words,
    teacher: mina(),
    topicEn: R3_TOPIC,
    history: [],
    message: {
      facts: [],
      input: {
        kind: "start",
        clock: { weekday: "Friday", dayPart: "afternoon" },
        met: 0,
      },
    },
    ...over,
  };
}

const rules = talkChatRulesOf(values, { level: 3 });

const CONFIG = {
  purpose: "talk_turn" as const,
  model: "claude-sonnet-5-5",
  effort: "low" as const,
  thinking: { type: "disabled" as const },
  maxTokens: 1000,
  timeoutMs: 10_000,
  fallbacks: null,
  betas: [],
};
const noMask: Masker = (text) => ({ text, names: 0, contacts: 0 });

const OUTPUT: TalkChatOutput = {
  listen_sentence: "",
  say: "Oh, you went to the beach! I love the sea.",
  say_ko: "오, 바다에 갔구나! 나는 바다가 좋아.",
  wrap_up: false,
};

/** 줄 단위 차이(가장 긴 공통 부분열): 지운 줄 · 더한 줄의 묶음을 차례대로 낸다. */
type Hunk = { removed: string[]; added: string[] };
function lineDiff(before: string, after: string): Hunk[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i -= 1)
    for (let j = b.length - 1; j >= 0; j -= 1)
      (table[i] as number[])[j] =
        a[i] === b[j]
          ? ((table[i + 1] as number[])[j + 1] as number) + 1
          : Math.max(
              (table[i + 1] as number[])[j] as number,
              (table[i] as number[])[j + 1] as number,
            );
  const hunks: Hunk[] = [];
  let open: Hunk | null = null;
  let i = 0;
  let j = 0;
  const hunk = (): Hunk => {
    if (open === null) {
      open = { removed: [], added: [] };
      hunks.push(open);
    }
    return open;
  };
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      open = null;
      i += 1;
      j += 1;
    } else if (
      j < b.length &&
      (i >= a.length ||
        ((table[i] as number[])[j + 1] as number) >=
          ((table[i + 1] as number[])[j] as number))
    ) {
      hunk().added.push(b[j] as string);
      j += 1;
    } else {
      hunk().removed.push(a[i] as string);
      i += 1;
    }
  }
  return hunks;
}

/** 두 글의 줄 차이를 차례대로 모은 것(지운 줄 · 더한 줄). */
function changedLines(
  before: string,
  after: string,
): { removed: string[]; added: string[] } {
  const hunks = lineDiff(before, after);
  return {
    removed: hunks.flatMap((h) => h.removed),
    added: hunks.flatMap((h) => h.added),
  };
}

const NAME_PARAGRAPH =
  "The child's name: when you call the child by name, write {NAME}, and the app puts in the child's name. If you see {NAME} in the child's words, it is the child's name, hidden by the app.";

describe("AC-27b 이야기 방식 안내문(spec 설계 2)", () => {
  it("AC-27b 3단계 단원 1 · 미나의 값으로 조립한 안내문이 골든과 글자까지 같다", () => {
    expect(talkChatSystem(chatInput(), rules)).toBe(GOLDEN);
  });

  it("AC-27b 틀은 R3 틀과 줄 단위로 다섯 곳만 다르다(About you · 차례 문단 · 오늘 단원 · 이름 자리 문단 · 마지막 문단)", () => {
    const { removed, added } = changedLines(
      R3_SYSTEM_TEMPLATE,
      CHAT_SYSTEM_TEMPLATE,
    );
    // 바뀐 줄 넷(R3 의 줄 → 이야기 방식의 줄) + 새로 더한 문단 하나(앞의 빈 줄 하나와 함께)
    expect(removed.filter((line) => line !== "")).toHaveLength(4);
    expect(removed.filter((line) => line === "")).toHaveLength(0);
    expect(added.filter((line) => line !== "")).toHaveLength(5);
    expect(added.filter((line) => line === "")).toHaveLength(1);
    const [aboutYouOld, turnsOld, unitOld, outputOld] = removed.filter(
      (line) => line !== "",
    );
    const [aboutYou, turns, unit, name, output] = added.filter(
      (line) => line !== "",
    );
    // (1) About you: 자리 둘만 바뀌고, 그 자리에 R3 의 글을 넣으면 R3 의 줄과 같다
    expect(aboutYou).toMatch(
      /^About you: \{PERSONA\} Like anyone, you have favorites, so that you can answer as yourself when the child asks: \{FAVORITES\} These are answers /,
    );
    expect(
      aboutYou
        ?.replace("{PERSONA}", R3_PERSONA)
        .replace("{FAVORITES}", R3_FAVORITES),
    ).toBe(aboutYouOld);
    // (2) 차례 문단: 앱의 사실로 고쳐 쓴 글(말 없음 두 갈래 · 잇달아 말하기 상한 · 한국어 도움 줄)
    expect(turnsOld).toMatch(/^How turns work here: /);
    expect([turns]).toEqual([
      'How turns work here: after you speak, it is the child\'s turn. The child presses a button to talk and can say anything they like; they do not need a question from you to speak. If the child does not press it for a while, you get the next turn as well, and you see "(The child did not press the talk button.)". A quiet turn is not a failure, but it tells you something: the child may not know what to say, or how to say it. Then make it easy to join in: a choice between two things, a yes or no, a guess they can confirm, or something silly to laugh at. If the child stays quiet for several turns in a row, the app stops giving you extra turns and simply waits for the child. If the child pressed the button but the app could not hear any words, you see "(The child pressed the talk button, but the app could not hear any words.)"; that is a problem with the microphone, not the child\'s answer. A line such as "Korean help before this answer: …" before the child\'s words tells you that the child first asked for help in Korean in the app; you did not say that help.',
    ]);
    // R3 의 '조용한 차례' 두 문장은 글자를 바꾸지 않고 '누르지 않음' 문장 바로 뒤로 옮겼다(m-2)
    const quiet =
      "A quiet turn is not a failure, but it tells you something: the child may not know what to say, or how to say it. Then make it easy to join in: a choice between two things, a yes or no, a guess they can confirm, or something silly to laugh at.";
    expect(turnsOld).toContain(quiet);
    expect(turns).toContain(
      `you see "(The child did not press the talk button.)". ${quiet} If the child stays quiet`,
    );
    // (3) 오늘 단원: 주제 자리 하나만 바뀐다
    expect(unit).toContain("this unit is about {TOPIC} (words such as");
    expect(unit?.replace("{TOPIC}", R3_TOPIC)).toBe(unitOld);
    // (4) 이름 자리 문단: Safety 바로 뒤 · 마지막 문단 바로 앞에 새로 더한 한 문단
    expect(name).toBe(NAME_PARAGRAPH);
    const lines = CHAT_SYSTEM_TEMPLATE.split("\n");
    const at = lines.indexOf(NAME_PARAGRAPH);
    expect(lines[at - 2]).toMatch(/^Safety: /);
    expect(lines[at + 2]).toMatch(/^Output JSON only/);
    // (5) 마지막 문단: 칸 차례(listen_sentence 앞) · wrap_up 뒤 앱이 하는 일
    expect(outputOld).toMatch(/^Output JSON only\. /);
    expect([output]).toEqual([
      'Output JSON only, with the fields in this order. "listen_sentence" is a sentence you are offering the child to say, only on a turn where you chose to offer one, and it must appear word for word in "say"; otherwise "". "say" is exactly what will be spoken. "say_ko" is a natural Korean translation for the screen. "wrap_up" is true only when you are closing the chat for today; then the app shows the child the buttons "talk more" and "finish", and if the child finishes, the app does a short review and says goodbye.',
    ]);
  });

  it("AC-27b 골든은 채운 R3 글(미나 · 단원 단어)과 세 곳만 다르다(미나 · 3단계 단원 1 의 성격 · 좋아하는 것 · 주제는 R3 의 글 그대로)", () => {
    if (!UNIT) throw new Error("시드에 회화 3단계 단원 1 이 없다");
    const r3 = qSystemOf({
      teacherName: "Mina",
      unitWords: UNIT.words,
      arm: "R3",
    });
    const { removed, added } = changedLines(r3, GOLDEN);
    expect(removed.filter((line) => line !== "")).toHaveLength(2);
    const changed = added.filter((line) => line !== "");
    expect(changed).toHaveLength(3);
    expect(changed[0]).toMatch(/^How turns work here: /);
    expect(changed[1]).toBe(NAME_PARAGRAPH);
    expect(changed[2]).toMatch(
      /^Output JSON only, with the fields in this order\./,
    );
  });

  it("AC-27b 자리 값 여섯(선생님 · 성격 · 좋아하는 것 · 주제 · 단원 단어 · 말하는 범위)을 채우고 이름 자리 {NAME} 만 남긴다", () => {
    expect(CHAT_SYSTEM_SLOTS).toEqual([
      "{TEACHER}",
      "{PERSONA}",
      "{FAVORITES}",
      "{TOPIC}",
      "{UNIT_WORDS}",
      "{LANGUAGE}",
    ]);
    const system = talkChatSystem(
      chatInput({
        teacher: {
          nameEn: "Ari",
          chatPersonaEn: "You are calm and bright.",
          chatFavoritesEn: "you like trains and the color green.",
        },
        topicEn: "my school day",
        unitWords: ["swim", "run"],
      }),
      talkChatRulesOf(
        { ...values, "talk.chat_turn_words.1-3": 9 },
        {
          level: 2,
        },
      ),
    );
    expect(system).toMatch(/^You are Ari, an English teacher character/);
    expect(system).not.toContain("Mina");
    expect(system).toContain(
      "About you: You are calm and bright. Like anyone, you have favorites, so that you can answer as yourself when the child asks: you like trains and the color green. These are answers",
    );
    expect(system).toContain(
      "this unit is about my school day (words such as swim, run).",
    );
    expect(system).toContain(
      "How you speak: The child is listening, not reading, and knows only a few hundred easy English words. Keep every turn short enough to take in by ear: about 9 words in all, in one or two short sentences.",
    );
    expect(system).toContain(
      'I had fun talking with Ari in English" and wants to say more.',
    );
    for (const slot of CHAT_SYSTEM_SLOTS) expect(system).not.toContain(slot);
    expect(system.split("{NAME}")).toHaveLength(3);
    // 자리 값의 '$' 는 바꾸기 꼴로 읽히지 않는다
    expect(
      talkChatSystem(chatInput({ topicEn: "money ($&)" }), rules),
    ).toContain("this unit is about money ($&) (words such as");
  });

  it("AC-27b 말하는 범위는 R3 의 글에서 한 차례 낱말 수만 설정값(talk.chat_turn_words.<구간>)으로 채운다", () => {
    expect(CHAT_LANGUAGE_TEMPLATE.split("{TURN_WORDS}")).toHaveLength(2);
    expect(talkChatLanguageOf(12)).toBe(Q_LANGUAGE.R3);
    expect(talkChatLanguageOf(rules.turnWords)).toContain(
      `about ${values["talk.chat_turn_words.1-3"]} words in all`,
    );
    expect(() => talkChatLanguageOf(0)).toThrow(RangeError);
    expect(() => talkChatLanguageOf(2.5)).toThrow(RangeError);
  });

  it("AC-27b 설정 읽기: 1~3단계 구간 키만 읽고, 없거나 꼴이 틀리면 CallSettingError, 다른 구간이면 던진다", () => {
    expect(Object.keys(TALK_CHAT_SETTING_SCHEMAS)).toEqual([
      "talk.chat_turn_words.1-3",
    ]);
    expect(talkChatRulesOf(values, { level: 1 })).toEqual({
      turnWords: values["talk.chat_turn_words.1-3"],
    });
    const { "talk.chat_turn_words.1-3": _gone, ...missing } = values;
    expect(() => talkChatRulesOf(missing, { level: 3 })).toThrow(
      CallSettingError,
    );
    expect(() =>
      talkChatRulesOf(
        { ...values, "talk.chat_turn_words.1-3": "12" },
        {
          level: 3,
        },
      ),
    ).toThrow(CallSettingError);
    expect(() => talkChatRulesOf(values, { level: 4 })).toThrow(RangeError);
  });

  it("AC-27b 성격 · 좋아하는 것 · 주제 · 선생님 이름이 비면 안내문을 만들지 않는다", () => {
    for (const over of [
      { teacher: { ...mina(), chatPersonaEn: " " } },
      { teacher: { ...mina(), chatFavoritesEn: "" } },
      { teacher: { ...mina(), nameEn: "" } },
      { topicEn: "" },
    ])
      expect(() => talkChatSystem(chatInput(over), rules)).toThrow(RangeError);
  });

  it("AC-27b 단원 단어가 없으면 안내문을 만들지 않는다(빈 '(words such as )' 를 내지 않음)", () => {
    expect(() => talkChatSystem(chatInput({ unitWords: [] }), rules)).toThrow(
      RangeError,
    );
    expect(() =>
      talkChatSystem(chatInput({ unitWords: [" ", ""] }), rules),
    ).toThrow(RangeError);
  });

  it("AC-27b 단원 재료 표: 3단계 단원 1 에만 이야기 방식 주제가 있고, 지금 새 방식의 글 칸은 그대로다", () => {
    expect(talkChatTopicOf(3, 1)).toBe(R3_TOPIC);
    expect(TALK_LEAD_TEXT_L3U1.chatTopicEn).toBe(R3_TOPIC);
    expect(talkChatTopicOf(3, 2)).toBeNull();
    expect(talkChatTopicOf(4, 1)).toBeNull();
    expect(talkLeadTextOf(3, 1)).toBe(TALK_LEAD_TEXT_L3U1);
    expect(TALK_LEAD_TEXT_L3U1.topicEn).toBe(
      "what I and my family do on weekends, and places and nature we go to",
    );
  });

  it("AC-27b 응답 규격은 네 칸이고 칸 차례가 listen_sentence · say · say_ko · wrap_up 이다", () => {
    expect(TALK_CHAT_OUTPUT_FIELDS).toEqual([
      "listen_sentence",
      "say",
      "say_ko",
      "wrap_up",
    ]);
    expect(Object.keys(TalkChatOutputSchema.shape)).toEqual(
      TALK_CHAT_OUTPUT_FIELDS,
    );
    expect(TalkChatOutputSchema.safeParse(OUTPUT).success).toBe(true);
    expect(
      TalkChatOutputSchema.safeParse({ ...OUTPUT, wrap_up: "no" }).success,
    ).toBe(false);
    expect(talkChatTurnSpec.wireSchema(chatInput(), rules)).toBe(
      TalkChatOutputSchema,
    );
  });

  it("AC-27b 호출은 지금 회화 턴과 같은 설정 키(talk_turn)를 쓰고 기록 표지는 chat 이다", () => {
    expect(talkChatTurnSpec.purpose).toBe("talk_turn");
    expect(talkChatTurnSpec.title).toBe(TALK_CHAT_TITLE);
    expect(TALK_CHAT_TITLE).not.toBe("talk_lead");
    expect(TALK_CHAT_RECORD_TAG).toBe("chat");
    expect(talkChatTurnSpec.multiTurn).toBe(true);
    expect(talkChatTurnSpec.enumPaths).toEqual([]);
    expect(talkChatTurnSpec.settingSchemas).toBe(TALK_CHAT_SETTING_SCHEMAS);
    expect(settingKeysOf(talkChatTurnSpec.purpose, 3)).toEqual({
      model: "ai.model.talk_turn.1-3",
      effort: "ai.effort.talk_turn.1-3",
      thinking: "ai.thinking.talk_turn.1-3",
      maxTokens: "ai.max_tokens.talk_turn",
      timeout: "ai.timeout_seconds.realtime",
    });
  });

  it("AC-27b 정규화는 응답을 고쳐 쓰지 않고, 말 칸이 비거나 글이 아니면 null(다시 시도 규칙)이다", () => {
    const prepared = prepareAnswer(OUTPUT, talkChatTurnSpec.enumPaths);
    expect(normalizeTalkChat(prepared)).toEqual(OUTPUT);
    expect(normalizeTalkChat({ ...OUTPUT, say: "" })).toBeNull();
    expect(normalizeTalkChat({ ...OUTPUT, say: "  " })).toBeNull();
    expect(normalizeTalkChat({ ...OUTPUT, say: 3 })).toBeNull();
    expect(normalizeTalkChat("oops")).toBeNull();
    // 빠진 글 칸은 '', 빠지거나 참거짓이 아닌 wrap_up 은 거짓(맺지 않음)
    const { listen_sentence: _l, say_ko: _k, wrap_up: _w, ...rest } = OUTPUT;
    expect(normalizeTalkChat(rest)).toEqual({
      ...OUTPUT,
      listen_sentence: "",
      say_ko: "",
      wrap_up: false,
    });
    expect(normalizeTalkChat({ ...OUTPUT, wrap_up: "yes" })).toEqual({
      ...OUTPUT,
      wrap_up: false,
    });
    expect(
      talkChatTurnSpec.validate({ ...OUTPUT, say: " " }, chatInput(), rules),
    ).toHaveLength(1);
    expect(talkChatTurnSpec.validate(OUTPUT, chatInput(), rules)).toEqual([]);
  });

  it("AC-27b 출력 검사(6.4)는 say_ko · listen_sentence 를 보고(길이는 기록 전용이라 보지 않음), 걸린 칸만 비우며 턴을 실패로 보지 않는다", () => {
    const withListen = {
      ...OUTPUT,
      listen_sentence: "I go to the beach.",
      say: "You can say: I go to the beach.",
    };
    expect(talkChatCheckFields(withListen)).toEqual([
      { path: "say_ko", lang: "ko", text: withListen.say_ko },
      {
        path: "listen_sentence",
        lang: "en",
        text: withListen.listen_sentence,
        checkLength: false,
      },
    ]);
    const options = { forbidden: SAMPLE_FORBIDDEN, sentenceMaxWords: 3 };
    const clean = checkOutputFields(talkChatCheckFields(withListen), options);
    expect(clean.size).toBe(0);
    expect(applyTalkChatChecks(withListen, clean)).toEqual({
      value: withListen,
      changed: false,
      fatal: false,
    });
    const bad = { ...withListen, listen_sentence: "You are stupid." };
    const hits = checkOutputFields(talkChatCheckFields(bad), options);
    expect([...hits.keys()]).toEqual(["listen_sentence"]);
    expect(applyTalkChatChecks(bad, hits)).toEqual({
      value: { ...bad, listen_sentence: "" },
      changed: true,
      fatal: false,
    });
    const badKo = new Map([
      ["say_ko", [{ kind: "forbidden" as const, match: "x" }]],
    ]);
    expect(applyTalkChatChecks(withListen, badKo).value).toEqual({
      ...withListen,
      say_ko: "",
    });
  });

  it("AC-27b 응답 say 의 {NAME} 은 나간 글에서 아이 이름으로 채워진다(저장 · 기록은 가린 글 그대로)", () => {
    const raw = JSON.stringify({ ...OUTPUT, say: "Hi, {NAME}! I like cats." });
    const parsed = normalizeTalkChat(JSON.parse(raw));
    expect(parsed).not.toBeNull();
    expect(fillName(parsed?.say ?? "", "Jisu")).toBe("Hi, Jisu! I like cats.");
    expect(talkChatAssistantOf(raw, [])).toContain("{NAME}");
  });
});

// ── 사용자 메시지(spec 설계 3) ─────────────────────────────────────

const msg = (input: ChatInput, facts: readonly ChatFact[] = []) =>
  chatUserMessageOf({ facts, input });

const speech = (heard: string): ChatInput => ({ kind: "speech", heard });

describe("AC-27c 수업 시작의 사실(spec 설계 3)", () => {
  it("AC-27c 만남 문장은 0번 · 1번 · 여러 번이 시제품(r2StartMessageOf)과 글자까지 같다", () => {
    expect(chatMetSentenceOf(0)).toBe(
      "This is your first chat with this child.",
    );
    expect(chatMetSentenceOf(1)).toBe(
      "You and this child have chatted 1 time before.",
    );
    expect(chatMetSentenceOf(7)).toBe(
      "You and this child have chatted 7 times before.",
    );
    for (const met of [0, 1, 2, 12]) {
      const clock = { weekday: "Friday", dayPart: "afternoon" } as const;
      expect(chatStartLineOf({ clock, met })).toBe(
        r2StartMessageOf({ now: "Friday afternoon", met }),
      );
      expect(msg({ kind: "start", clock, met })).toBe(
        r2StartMessageOf({ now: "Friday afternoon", met }),
      );
    }
    expect(() => chatMetSentenceOf(-1)).toThrow(RangeError);
    expect(() => chatMetSentenceOf(1.5)).toThrow(RangeError);
  });

  it("AC-27c 때는 경계 시각(talk.chat_day_part_hours) 5 · 12 · 18 에서 바뀐다", () => {
    const hours = chatDayPartHoursOf(values);
    expect(hours).toEqual(values["talk.chat_day_part_hours"]);
    expect(CHAT_DAY_PARTS).toEqual(["morning", "afternoon", "evening"]);
    const [morning, afternoon, evening] = hours;
    expect(chatDayPartOf(morning - 1, hours)).toBe("evening");
    expect(chatDayPartOf(morning, hours)).toBe("morning");
    expect(chatDayPartOf(afternoon - 1, hours)).toBe("morning");
    expect(chatDayPartOf(afternoon, hours)).toBe("afternoon");
    expect(chatDayPartOf(evening - 1, hours)).toBe("afternoon");
    expect(chatDayPartOf(evening, hours)).toBe("evening");
    expect(chatDayPartOf(23, hours)).toBe("evening");
    expect(chatDayPartOf(0, hours)).toBe("evening");
    expect(() => chatDayPartOf(24, hours)).toThrow(RangeError);
  });

  it("AC-27c 요일 · 때는 가족 시간대(app.timezone)의 벽시계로 센다", () => {
    const hours = chatDayPartHoursOf(values);
    const zone = values["app.timezone"] as string;
    // 2026-11-13(금) 서울 12:00 · 11:59 · 18:00 · 다음 날(토) 05:00
    expect(chatClockOf(new Date("2026-11-13T03:00:00Z"), zone, hours)).toEqual({
      weekday: "Friday",
      dayPart: "afternoon",
    });
    expect(chatClockOf(new Date("2026-11-13T02:59:00Z"), zone, hours)).toEqual({
      weekday: "Friday",
      dayPart: "morning",
    });
    expect(chatClockOf(new Date("2026-11-13T09:00:00Z"), zone, hours)).toEqual({
      weekday: "Friday",
      dayPart: "evening",
    });
    expect(chatClockOf(new Date("2026-11-13T20:00:00Z"), zone, hours)).toEqual({
      weekday: "Saturday",
      dayPart: "morning",
    });
    // UTC 금요일 03:00 은 첫 경계 전이라 목요일 저녁이다
    expect(chatClockOf(new Date("2026-11-13T03:00:00Z"), "UTC", hours)).toEqual(
      { weekday: "Thursday", dayPart: "evening" },
    );
  });

  it("AC-27c 첫 경계 전(새벽)의 요일은 전날 요일이고 때는 evening 이다(토요일 00:00 · 02:00 · 04:59 → 금요일 저녁, 05:00 → 토요일 아침)", () => {
    const hours = chatDayPartHoursOf(values);
    const zone = values["app.timezone"] as string;
    const friday = { weekday: "Friday", dayPart: "evening" };
    // 서울 2026-11-14(토) 00:00 · 02:00 · 04:59 · 05:00
    expect(chatClockOf(new Date("2026-11-13T15:00:00Z"), zone, hours)).toEqual(
      friday,
    );
    expect(chatClockOf(new Date("2026-11-13T17:00:00Z"), zone, hours)).toEqual(
      friday,
    );
    expect(chatClockOf(new Date("2026-11-13T19:59:00Z"), zone, hours)).toEqual(
      friday,
    );
    expect(chatClockOf(new Date("2026-11-13T20:00:00Z"), zone, hours)).toEqual({
      weekday: "Saturday",
      dayPart: "morning",
    });
    // 일요일 새벽은 토요일 저녁이고, 월요일 새벽은 일요일 저녁이다(주의 끝을 넘어감)
    expect(
      chatClockOf(new Date("2026-11-14T16:30:00Z"), zone, hours).weekday,
    ).toBe("Saturday");
    expect(
      chatClockOf(new Date("2026-11-15T16:30:00Z"), zone, hours).weekday,
    ).toBe("Sunday");
    // 경계는 설정값을 그대로 쓴다(첫 경계 6시면 05:30 은 아직 전날)
    expect(
      chatClockOf(new Date("2026-11-13T20:30:00Z"), zone, [6, 12, 18]),
    ).toEqual(friday);
    expect(
      chatClockOf(new Date("2026-11-13T21:00:00Z"), zone, [6, 12, 18]),
    ).toEqual({ weekday: "Saturday", dayPart: "morning" });
  });

  it("AC-27c 경계 시각 설정은 0~23 의 오름차순 정수 셋이어야 하고, 아니면 CallSettingError 다", () => {
    expect(Object.keys(CHAT_MESSAGE_SETTING_SCHEMAS).sort()).toEqual([
      "talk.chat_day_part_hours",
      "talk.chat_unsure_confidence",
      "talk.chat_unsure_on_partial",
    ]);
    for (const bad of [
      undefined,
      [5, 12],
      [5, 12, 18, 20],
      [12, 5, 18],
      [5, 5, 18],
      [5, 12, 24],
      [5.5, 12, 18],
      "5,12,18",
    ])
      expect(() =>
        chatDayPartHoursOf({ ...values, "talk.chat_day_part_hours": bad }),
      ).toThrow(CallSettingError);
  });
});

describe("AC-27c 입력 줄 · 돌아옴 · 사실 줄(spec 설계 3)", () => {
  it("AC-27c 입력 줄 여섯 꼴(말함 · 모름 단추 · 누르지 않음 · 눌렀으나 듣지 못함 · 더 이야기하기 · 인식기 알림이 붙은 말함)", () => {
    expect(msg(speech("I go to the sea."))).toBe(
      'Child (speech-to-text): "I go to the sea."',
    );
    expect(msg({ kind: "dont_know" })).toBe(
      '(The child pressed the "I don\'t know" button.)',
    );
    expect(msg({ kind: "quiet" })).toBe(
      "(The child did not press the talk button.)",
    );
    expect(msg({ kind: "not_heard" })).toBe(
      "(The child pressed the talk button, but the app could not hear any words.)",
    );
    expect(msg({ kind: "more" })).toBe("(The child chose to talk more.)");
    expect(
      msg({
        kind: "speech",
        heard: "I see sea.",
        note: { alternative: "I see." },
      }),
    ).toBe(
      'Child (speech-to-text): "I see sea."\n(The recognizer was unsure about this. It may also have been: "I see.")',
    );
    expect(msg({ kind: "speech", heard: "I see sea.", note: {} })).toBe(
      'Child (speech-to-text): "I see sea."\n(The recognizer was unsure about this.)',
    );
    // 시제품의 같은 꼴과 글자까지 같다(말함 · 모름 · 알림 두 꼴)
    expect(msg(speech("Hi."))).toBe(qChildMessageOf("speak", "Hi."));
    expect(msg({ kind: "dont_know" })).toBe(qChildMessageOf("dont_know", ""));
    expect(
      msg({ kind: "speech", heard: "Hi.", note: { alternative: "High." } }),
    ).toBe(qChildMessageOf("speak", "Hi.", { unsure: true, alt: "High." }));
    expect(msg({ kind: "speech", heard: "Hi.", note: {} })).toBe(
      qChildMessageOf("speak", "Hi.", { unsure: true }),
    );
  });

  it("AC-27c 조용함 입구와 말소리 없음 두 번의 차례는 서로 다른 입력 줄을 받는다", () => {
    expect(chatInputLineOf({ kind: "quiet" })).not.toBe(
      chatInputLineOf({ kind: "not_heard" }),
    );
    // 시제품의 '아무 말도 하지 않음' 한 꼴은 쓰지 않는다
    for (const kind of ["quiet", "not_heard"] as const)
      expect(chatInputLineOf({ kind })).not.toBe("(The child said nothing.)");
  });

  it("AC-27c 짧은 준비 뒤 대화로 돌아오는 차례는 입구 메시지 한 줄이다", () => {
    expect(msg({ kind: "back" })).toBe(
      "(The child is back from a short word practice in the app.)",
    );
  });

  it("AC-27c 사실 줄 넷의 글", () => {
    expect(chatFactLineOf({ kind: "prep_next" })).toBe(
      "After your turn the app does a short word practice with the child, and then your chat goes on.",
    );
    expect(chatFactLineOf({ kind: "ko_help", taught: "I like cats." })).toBe(
      "Korean help before this answer: taught 'I like cats.'",
    );
    expect(chatFactLineOf({ kind: "ko_help", taught: null })).toBe(
      "Korean help before this answer: meaning only",
    );
    expect(chatFactLineOf({ kind: "ko_help", taught: "  " })).toBe(
      "Korean help before this answer: meaning only",
    );
    expect(chatFactLineOf({ kind: "closing" })).toBe(
      "This is the closing turn. After your turn the app shows the buttons 'talk more' and 'finish'. If the child finishes, the app does a short review and says goodbye.",
    );
    // 앞 두 문장은 지금 새 방식의 마무리 줄과 글자까지 같다(I-7)
    expect(chatFactLineOf({ kind: "closing" })).toMatch(
      /^This is the closing turn\. After your turn the app shows the buttons 'talk more' and 'finish'\. /,
    );
    expect(chatFactLineOf({ kind: "last_turn" })).toBe(
      "This is the last turn of today's chat. After your turn the app ends the chat.",
    );
  });

  it("AC-27c 사실 줄은 입력 줄 앞에 한 줄로 두고 줄을 바꿔 입력 줄을 두며, 여럿이면 한 번씩 두고 한국어 도움 줄은 맨 뒤(입력 줄 바로 앞)다", () => {
    expect(msg(speech("Yes."), [{ kind: "closing" }])).toBe(
      `${chatFactLineOf({ kind: "closing" })}\nChild (speech-to-text): "Yes."`,
    );
    expect(
      msg({ kind: "quiet" }, [
        { kind: "last_turn" },
        { kind: "ko_help", taught: null },
        { kind: "last_turn" },
      ]),
    ).toBe(
      [
        "This is the last turn of today's chat. After your turn the app ends the chat.",
        "Korean help before this answer: meaning only",
        "(The child did not press the talk button.)",
      ].join("\n"),
    );
    // 마무리 줄과 함께 와도 한국어 도움 줄이 아이 말 줄 바로 앞이다(안내문 'before the child's words')
    expect(
      msg(speech("I like cats."), [
        { kind: "ko_help", taught: "I like cats." },
        { kind: "closing" },
      ]),
    ).toBe(
      [
        chatFactLineOf({ kind: "closing" }),
        "Korean help before this answer: taught 'I like cats.'",
        'Child (speech-to-text): "I like cats."',
      ].join("\n"),
    );
    expect(
      msg({ kind: "speech", heard: "Sea.", note: {} }, [{ kind: "prep_next" }]),
    ).toBe(
      [
        chatFactLineOf({ kind: "prep_next" }),
        'Child (speech-to-text): "Sea."',
        "(The recognizer was unsure about this.)",
      ].join("\n"),
    );
  });

  it("AC-27c 안전 상한 줄이 있으면 마무리 줄 · 짧은 준비 줄은 내지 않고, 한국어 도움 줄은 그대로 낸다(묶음 P3 chatFactsOf 와 같은 계약)", () => {
    const last = chatFactLineOf({ kind: "last_turn" });
    expect(
      msg(speech("Bye."), [
        { kind: "closing" },
        { kind: "prep_next" },
        { kind: "last_turn" },
      ]),
    ).toBe([last, 'Child (speech-to-text): "Bye."'].join("\n"));
    expect(
      msg({ kind: "quiet" }, [
        { kind: "prep_next" },
        { kind: "ko_help", taught: null },
        { kind: "closing" },
        { kind: "last_turn" },
      ]),
    ).toBe(
      [
        last,
        "Korean help before this answer: meaning only",
        "(The child did not press the talk button.)",
      ].join("\n"),
    );
    // 안전 상한 줄이 없으면 마무리 줄 · 짧은 준비 줄은 그대로 낸다
    expect(msg({ kind: "quiet" }, [{ kind: "closing" }])).toContain(
      chatFactLineOf({ kind: "closing" }),
    );
  });

  it("AC-27c 말함 입력의 들린 글이 비었거나 공백뿐이면 던진다(빈 말은 서버가 '눌렀으나 듣지 못함'으로 보낸다)", () => {
    for (const heard of ["", "   ", "\n"]) {
      expect(() => chatInputLineOf(speech(heard))).toThrow(RangeError);
      expect(() => msg(speech(heard), [{ kind: "closing" }])).toThrow(
        RangeError,
      );
    }
  });

  it("AC-27c 'Goal words' · 'Child turn' · 'Help you gave' · 'Status' 줄은 어느 차례에도 없다", () => {
    const clock = { weekday: "Monday", dayPart: "evening" } as const;
    const inputs: ChatInput[] = [
      { kind: "start", clock, met: 3 },
      speech("I eat rice."),
      { kind: "speech", heard: "I eat rice.", note: { alternative: "Ice." } },
      { kind: "dont_know" },
      { kind: "quiet" },
      { kind: "not_heard" },
      { kind: "more" },
      { kind: "back" },
    ];
    const facts: ChatFact[] = [
      { kind: "prep_next" },
      { kind: "ko_help", taught: "I eat." },
      { kind: "closing" },
      { kind: "last_turn" },
    ];
    const all: ChatUserMessage[] = inputs.flatMap((input) => [
      { facts: [], input },
      { facts, input },
    ]);
    for (const message of all) {
      const text = chatUserMessageOf(message);
      for (const banned of [
        "Goal words",
        "Child turn",
        "Help you gave",
        "Status",
        "Sound note",
        "model sentence",
      ])
        expect(text).not.toContain(banned);
    }
  });
});

describe("AC-27c 대화 기록(spec 설계 2 '대화 기록')", () => {
  const RAW = JSON.stringify({
    listen_sentence: "",
    say: "Wow, a cat! Tell me your address. I love cats.",
    say_ko: "와, 고양이! 나는 고양이가 좋아.",
    wrap_up: false,
  });

  it("AC-27c 앞 차례의 assistant 칸은 응답 JSON 원문 그대로다(앱이 붙인 기다림 줄은 넣지 않음)", () => {
    expect(talkChatAssistantOf(RAW, [])).toBe(RAW);
    const messages = talkChatMessages(
      chatInput({
        history: [
          { user: "(The chat starts now.)", assistant: RAW },
          { user: 'Child (speech-to-text): "Cat."', assistant: RAW },
        ],
        message: { facts: [], input: speech("I like cats.") },
      }),
    );
    expect(messages).toEqual([
      { role: "user", content: "(The chat starts now.)" },
      { role: "assistant", content: RAW },
      { role: "user", content: 'Child (speech-to-text): "Cat."' },
      { role: "assistant", content: RAW },
      { role: "user", content: 'Child (speech-to-text): "I like cats."' },
    ]);
  });

  it("AC-27c 안전 검사가 바꾼 문장이 있으면 그 문장만 실제로 나간 글로 넣고(칸 차례 그대로), 지운 문장은 빼다", () => {
    const replaced = talkChatAssistantOf(RAW, [
      { from: "Tell me your address.", to: "Let's talk about cats." },
    ]);
    expect(Object.keys(JSON.parse(replaced))).toEqual(TALK_CHAT_OUTPUT_FIELDS);
    expect(JSON.parse(replaced)).toEqual({
      ...JSON.parse(RAW),
      say: "Wow, a cat! Let's talk about cats. I love cats.",
    });
    const removed = talkChatAssistantOf(RAW, [
      { from: "Tell me your address.", to: "" },
    ]);
    expect(JSON.parse(removed).say).toBe("Wow, a cat! I love cats.");
    // 원문이 JSON 이 아니거나 바꿀 문장이 say 에 없으면 원문 그대로
    expect(talkChatAssistantOf("not json", [{ from: "a", to: "b" }])).toBe(
      "not json",
    );
    expect(talkChatAssistantOf(RAW, [{ from: "Nope.", to: "" }])).toBe(RAW);
  });

  it("AC-27c 바꾼 문장이 둘 이상이거나 say 의 맨 앞 · 맨 끝 문장이어도 그 문장들만 바뀐다", () => {
    const sayOf = (changes: { from: string; to: string }[]) =>
      JSON.parse(talkChatAssistantOf(RAW, changes)).say;
    // 둘 이상: 맨 앞은 바꾸고 가운데는 지움
    expect(
      sayOf([
        { from: "Wow, a cat!", to: "Oh, nice!" },
        { from: "Tell me your address.", to: "" },
      ]),
    ).toBe("Oh, nice! I love cats.");
    // 맨 앞 문장을 지움 · 맨 끝 문장을 지움 · 맨 끝 문장을 바꿈
    expect(sayOf([{ from: "Wow, a cat!", to: "" }])).toBe(
      "Tell me your address. I love cats.",
    );
    expect(sayOf([{ from: "I love cats.", to: "" }])).toBe(
      "Wow, a cat! Tell me your address.",
    );
    expect(sayOf([{ from: "I love cats.", to: "Cats are fun." }])).toBe(
      "Wow, a cat! Tell me your address. Cats are fun.",
    );
    // 셋 모두 바꿈
    expect(
      sayOf([
        { from: "Wow, a cat!", to: "A." },
        { from: "Tell me your address.", to: "B." },
        { from: "I love cats.", to: "C." },
      ]),
    ).toBe("A. B. C.");
  });
});

describe("AC-27c 같은 수업의 요청은 앞 차례 요청의 앞머리를 그대로 잇는다(프롬프트 캐시의 전제)", () => {
  it("AC-27c n−1 차례 요청의 system · messages 가 n 차례 요청의 앞머리와 글자까지 같다", () => {
    const name = "Jisu";
    const masker: Masker = (text) => ({
      text: text.replaceAll(name, "{NAME}"),
      names: text.includes(name) ? 1 : 0,
      contacts: 0,
    });
    const turns: ChatUserMessage[] = [
      {
        facts: [],
        input: {
          kind: "start",
          clock: { weekday: "Friday", dayPart: "afternoon" },
          met: 2,
        },
      },
      {
        facts: [{ kind: "prep_next" }],
        input: {
          kind: "speech",
          heard: `I am ${name}.`,
          note: { alternative: `I am ${name}s.` },
        },
      },
      { facts: [], input: { kind: "back" } },
      { facts: [], input: { kind: "quiet" } },
      {
        facts: [{ kind: "ko_help", taught: null }, { kind: "closing" }],
        input: speech("I go to the sea."),
      },
    ];
    const history: { user: string; assistant: string }[] = [];
    let previous: ReturnType<typeof buildAiRequest> | null = null;
    turns.forEach((message, n) => {
      const built = buildAiRequest(
        talkChatTurnSpec,
        chatInput({ history: [...history], message }),
        { config: CONFIG, masker, rules },
      );
      const messages = built.body.messages;
      expect(messages).toHaveLength(2 * n + 1);
      if (previous !== null) {
        expect(built.body.system).toBe(previous.body.system);
        const before = previous.body.messages;
        expect(messages.slice(0, before.length)).toEqual(before);
      }
      expect(JSON.stringify(built.body)).not.toContain(name);
      // 서버가 저장하는 대로: 보낸 사용자 메시지(가린 글) · 응답 JSON 원문
      const sent = messages.at(-1)?.content ?? "";
      history.push({
        user: sent,
        assistant: talkChatAssistantOf(
          JSON.stringify({ ...OUTPUT, say: `Turn ${n}. Nice!` }),
          [],
        ),
      });
      previous = built;
    });
  });
});

// ── 인식기 정보(spec 설계 11) ──────────────────────────────────────

const recRules = chatRecognizerRulesOf(values);
const threshold = recRules.unsureConfidence;
const below = Math.round((threshold - 0.1) * 100) / 100;

describe("AC-27l 인식기 정보와 알림 줄(spec 설계 11)", () => {
  it("AC-27l 인식기 정보 Zod: 확신 정도 0~1 · 다른 후보 글 · 중간 결과 표지, 다른 후보 글은 길이 상한 안", () => {
    const schema = chatRecognizerSchemaOf(20);
    expect(
      schema.safeParse({
        confidence: 0.42,
        alternative: "I see.",
        interimOnly: false,
      }).success,
    ).toBe(true);
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ confidence: null }).success).toBe(true);
    expect(schema.safeParse({ confidence: 1.2 }).success).toBe(false);
    expect(schema.safeParse({ confidence: -0.1 }).success).toBe(false);
    expect(schema.safeParse({ alternative: "x".repeat(21) }).success).toBe(
      false,
    );
    expect(schema.safeParse({ interimOnly: "yes" }).success).toBe(false);
  });

  it("AC-27l 설정: 문턱(talk.chat_unsure_confidence)과 중간 결과 알림 켬(talk.chat_unsure_on_partial, 기본 거짓)을 읽고, 틀리면 CallSettingError", () => {
    expect(recRules).toEqual({
      unsureConfidence: values["talk.chat_unsure_confidence"],
      unsureOnPartial: values["talk.chat_unsure_on_partial"],
    });
    expect(SPEC_DEFAULTS["talk.chat_unsure_on_partial"]).toBe(false);
    for (const [key, bad] of [
      ["talk.chat_unsure_confidence", 1.5],
      ["talk.chat_unsure_confidence", "0.5"],
      ["talk.chat_unsure_on_partial", "false"],
      ["talk.chat_unsure_on_partial", undefined],
    ] as const)
      expect(() => chatRecognizerRulesOf({ ...values, [key]: bad })).toThrow(
        CallSettingError,
      );
  });

  it("AC-27l 확신 정도가 문턱보다 낮으면 알림이 붙는다(후보 있음 · 없음 두 꼴)", () => {
    expect(
      chatRecognizerNoteOf(
        { confidence: below, alternative: "I see." },
        "I sea.",
        recRules,
      ),
    ).toEqual({ alternative: "I see." });
    expect(
      chatRecognizerNoteOf({ confidence: below }, "I sea.", recRules),
    ).toEqual({});
    // 다른 후보가 비었거나 들린 글과 같으면 첫 꼴이다
    expect(
      chatRecognizerNoteOf(
        { confidence: below, alternative: "  " },
        "I sea.",
        recRules,
      ),
    ).toEqual({});
    expect(
      chatRecognizerNoteOf(
        { confidence: below, alternative: " i SEA. " },
        "I sea.",
        recRules,
      ),
    ).toEqual({});
  });

  it("AC-27l 문턱 이상이거나 확신 정도가 없거나 0 이면, 중간 결과 사유도 서지 않을 때 알림이 붙지 않는다(다른 후보가 있어도)", () => {
    for (const rec of [
      { confidence: threshold, alternative: "I see." },
      { confidence: 0.99 },
      { alternative: "I see." },
      { confidence: null, alternative: "I see." },
      { confidence: 0, alternative: "I see." },
      {},
      { interimOnly: false },
    ])
      expect(chatRecognizerNoteOf(rec, "I sea.", recRules)).toBeNull();
    expect(chatRecognizerNoteOf(undefined, "I sea.", recRules)).toBeNull();
  });

  it("AC-27l 중간 결과만으로 끝난 말은 기본값(거짓)이면 알림이 없고, 참이면 확신 정도가 없어도 첫 꼴이 붙는다", () => {
    expect(
      chatRecognizerNoteOf({ interimOnly: true }, "I sea.", recRules),
    ).toBeNull();
    const on: ChatRecognizerRules = { ...recRules, unsureOnPartial: true };
    expect(chatRecognizerNoteOf({ interimOnly: true }, "I sea.", on)).toEqual(
      {},
    );
    // 중간 결과 갈래에는 다른 후보를 싣지 않는다(첫 꼴)
    expect(
      chatRecognizerNoteOf(
        { interimOnly: true, confidence: below, alternative: "I see." },
        "I sea.",
        on,
      ),
    ).toEqual({});
    expect(
      chatRecognizerNoteOf(
        { interimOnly: true, confidence: below, alternative: "I see." },
        "I sea.",
        recRules,
      ),
    ).toEqual({});
  });

  it("AC-27l 알림 판단을 지난 말 입력 줄은 들린 글 다음 줄에 알림을 둔다", () => {
    const note = chatRecognizerNoteOf(
      { confidence: below, alternative: "I see." },
      "I sea.",
      recRules,
    );
    expect(chatInputLineOf({ kind: "speech", heard: "I sea.", note })).toBe(
      'Child (speech-to-text): "I sea."\n(The recognizer was unsure about this. It may also have been: "I see.")',
    );
    expect(
      chatInputLineOf({ kind: "speech", heard: "I sea.", note: null }),
    ).toBe('Child (speech-to-text): "I sea."');
  });
});

describe("AC-27q 이름 자리 밖 아이 이름 없음(NFR-3)", () => {
  const name = "Jisu";
  const masker: Masker = (text) => ({
    text: text.replaceAll(name, "{NAME}"),
    names: text.includes(name) ? 1 : 0,
    contacts: 0,
  });

  it("AC-27q 가림은 이번 아이 말 · 인식기의 다른 후보 · 한국어 도움 표현에 걸리고, 안내문 · 요청 어디에도 아이 이름이 없다", () => {
    const built = buildAiRequest(
      talkChatTurnSpec,
      chatInput({
        history: [
          {
            user: 'Child (speech-to-text): "I am {NAME}."',
            assistant: JSON.stringify(OUTPUT),
          },
        ],
        message: {
          facts: [{ kind: "ko_help", taught: `${name} likes cats.` }],
          input: {
            kind: "speech",
            heard: `My name is ${name}.`,
            note: { alternative: `My name is ${name}s.` },
          },
        },
      }),
      { config: CONFIG, masker, rules },
    );
    const request = [
      built.body.system,
      ...built.body.messages.map((m) => m.content),
    ].join("\n");
    expect(request).not.toContain(name);
    expect(built.body.system).toBe(GOLDEN);
    expect(built.body.messages.at(-1)?.content).toBe(
      [
        "Korean help before this answer: taught '{NAME} likes cats.'",
        'Child (speech-to-text): "My name is {NAME}."',
        '(The recognizer was unsure about this. It may also have been: "My name is {NAME}s.")',
      ].join("\n"),
    );
    expect(built.body.cache_control).toBeDefined();
  });

  it("AC-27q 가림이 없는 입력(시작 · 입구 · 단추)은 그대로 간다", () => {
    for (const input of [
      {
        kind: "start",
        clock: { weekday: "Sunday", dayPart: "morning" },
        met: 2,
      },
      { kind: "back" },
      { kind: "more" },
      { kind: "quiet" },
      { kind: "not_heard" },
      { kind: "dont_know" },
    ] as ChatInput[]) {
      const built = buildAiRequest(
        talkChatTurnSpec,
        chatInput({ message: { facts: [], input } }),
        { config: CONFIG, masker: noMask, rules },
      );
      expect(built.body.messages).toEqual([
        { role: "user", content: chatInputLineOf(input) },
      ]);
    }
  });
});
