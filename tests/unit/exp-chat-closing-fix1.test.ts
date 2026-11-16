// 실험 보고 도구의 마무리 차례 셈 고침(13절 C243 보완 9 fix 1 — 코드 검토 M-1 · M-2 · M-7): 앱이 마무리 물음을 붙였는지를 실제로 낸 줄로 정한 기록 칸
// (closingAsked)으로 세고(칸이 없는 지난 기록만 줄 꼴 어림), m-6 후보에서 앱이 붙인 상수 물음만 든 차례를 빼며, 긴 대본 절에도 같은 함수로 낸 셈을 한 줄 싣는다.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  chatTeacherLogOf,
  type LessonLog,
  type TeacherTurnLog,
} from "../../scripts/exp/arch-compare";
import { type ChatCounts, chatCountsOf } from "../../scripts/exp/arch-metrics";
import {
  chatClosingAskOf,
  chatM6CandidatesOf,
  chatMarkdownOf,
  type Lesson,
  readLessons,
} from "../../scripts/exp/arch-report";
import type { ChatScenarioTurn } from "../../scripts/talk-observe";
import { MORE_PROMPT } from "../../src/core/conversation/spoken";

/** (ㄱ) 셈이 읽는 칸만 둔 선생님 차례(나간 글 · 모델 원문 · 사실 줄 · 앱이 붙인 물음 칸). */
function closingTurn(
  final: string,
  modelFirstSpoken: string | null,
  closingAsked?: boolean,
): TeacherTurnLog {
  return {
    final,
    modelFirstSpoken,
    chat: {
      facts: ["closing"],
      wrapUp: false,
      wrapUpHeld: null,
      ...(closingAsked === undefined ? {} : { closingAsked }),
    },
  } as unknown as TeacherTurnLog;
}
function lessonOf(
  teachers: TeacherTurnLog[],
  variant?: "long",
): Pick<Lesson, "meta" | "teachers" | "children"> {
  return {
    meta: {
      arm: "CHAT",
      lesson: variant ? "CHAT-SE-s1-long" : "CHAT-SA-s1",
      child: variant ? "SE" : "SA",
      ...(variant ? { variant } : {}),
    } as unknown as LessonLog,
    teachers,
    children: [],
  };
}

/** chatTeacherLogOf 가 읽는 칸만 둔 대본 도구 차례(나머지는 빈 값). */
function scenarioTurn(lines: unknown[]): ChatScenarioTurn {
  return {
    no: 1,
    entry: "child",
    record: {
      entry: "child",
      lines,
      close: null,
      signal: null,
      turnEnd: "closing",
      facts: ["closing"],
      teacher: { move: { chat: {} } },
      value: { wrap_up: false },
      failure: null,
      diverged: false,
    },
    hints: [],
    evals: [],
    waitedMs: 0,
    note: null,
    usage: null,
    calls: { dialog: 1, hint: 0, explain: 0, eval: 0 },
    costUsd: 0,
  } as unknown as ChatScenarioTurn;
}

const ADD = {
  t: "add",
  kind: "more_prompt",
  en: MORE_PROMPT.en,
  ko: MORE_PROMPT.ko,
};

/** 고치기 전 이야기 방식 다시 돌림의 결과 폴더(저장소에 넣지 않은 실험 결과 — 작업 폴더나 위 폴더(워크트리면 본 저장소)에 있을 때만). */
const PAST_NAME = join(
  "docs",
  "research",
  "2026-11-16-회화-이야기-방식-고친-뒤-실행",
);
function pastDirOf(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const at = join(dir, PAST_NAME);
    if (existsSync(join(at, "runs"))) return at;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
const PAST = pastDirOf();

describe("앱이 붙인 마무리 물음의 기록 칸(M-2)", () => {
  it("AC-27n 대본 도구 차례 기록의 실제로 낸 줄에 add more_prompt 가 있으면 closingAsked 가 참, 선생님 말 줄만 있으면 거짓이다", () => {
    const asked = chatTeacherLogOf(
      scenarioTurn([{ t: "s", en: "Great talk today!" }, ADD]),
    );
    expect(asked.closingAsked).toBe(true);
    // 1~3단계: 따라 할 문장이 소리 줄로 놓이고 선생님의 마지막 문장이 상수 물음과 같은 글이어도 앱이 붙인 줄이 아니다
    const own = chatTeacherLogOf(
      scenarioTurn([
        { t: "s", en: "Say it with me." },
        { t: "sound", kind: "model", say: "I like the beach." },
        { t: "s", en: MORE_PROMPT.en },
      ]),
    );
    expect(own.closingAsked).toBe(false);
    // 말 칸이 빈 차례에 앱이 붙인 줄 하나만 나가도 붙인 차례다
    expect(chatTeacherLogOf(scenarioTurn([ADD])).closingAsked).toBe(true);
  });

  it("AC-27n (ㄱ) 셈은 closingAsked 칸이 있으면 그것으로 앱이 붙인 차례를 세고, 칸이 없는 지난 기록만 줄 꼴로 어림한다", () => {
    // (가) 소리 줄 뒤 선생님이 제 말로 상수 물음과 같은 물음을 함 — 나간 줄의 끝이 그 물음이지만 앱이 붙이지 않았다
    const own = closingTurn(
      `Say it with me.\nI like the beach.\n${MORE_PROMPT.en}`,
      `Say it with me. I like the beach. ${MORE_PROMPT.en}`,
      false,
    );
    // (나) 말 칸이 빈 차례에 앱이 붙임 — 나간 줄이 하나뿐이다
    const empty = closingTurn(MORE_PROMPT.en, "", true);
    // 응답이 없던 차례(모델 원문 없음)에 앱이 붙임 — 붙인 줄을 뺀 글이 모델 원문 자리다
    const failed = closingTurn(`Tell me more!\n${MORE_PROMPT.en}`, null, true);
    const one = (t: TeacherTurnLog) => chatClosingAskOf([lessonOf([t])]);
    expect(one(own)).toEqual({
      turns: 1,
      rawNoQuestion: 0,
      sentNoQuestion: 0,
      appAsked: 0,
    });
    expect(one(empty)).toEqual({
      turns: 1,
      rawNoQuestion: 1,
      sentNoQuestion: 0,
      appAsked: 1,
    });
    expect(one(failed)).toEqual({
      turns: 1,
      rawNoQuestion: 1,
      sentNoQuestion: 0,
      appAsked: 1,
    });
    // 칸이 없는 지난 기록: 지금 줄 꼴 어림 그대로
    expect(
      chatClosingAskOf([
        lessonOf([
          closingTurn(`Great talk!\n${MORE_PROMPT.en}`, "Great talk!"),
          closingTurn(MORE_PROMPT.en, MORE_PROMPT.en),
        ]),
      ]),
    ).toEqual({ turns: 2, rawNoQuestion: 1, sentNoQuestion: 0, appAsked: 1 });
  });
});

describe("m-6 후보(M-1)", () => {
  it("AC-27n 앱이 붙인 상수 물음(또는 같은 물음)만 든 마무리 차례는 m-6 후보에서 빠지고, 다른 물음이 함께 든 차례는 그대로 남는다", () => {
    const c = {
      closingQuestions: [
        { lesson: "CHAT-SA-s1", childTurn: 9, questions: [MORE_PROMPT.en] },
        {
          lesson: "CHAT-SB-s1",
          childTurn: 8,
          questions: ["What was the best part?", MORE_PROMPT.en],
        },
        {
          lesson: "CHAT-SC-s1",
          childTurn: 7,
          questions: ["Which animal do you like?"],
        },
      ],
    } as unknown as ChatCounts;
    expect(chatM6CandidatesOf(c).map((r) => r.lesson)).toEqual([
      "CHAT-SB-s1",
      "CHAT-SC-s1",
    ]);
  });
});

describe("긴 대본의 (ㄱ) 셈(M-7)", () => {
  it("AC-27n 같은 함수가 긴 대본만 골라 마무리 차례 수 · 모델 원문 기준 물음 없음 · 앱이 붙인 차례를 낸다", () => {
    const lessons = [
      lessonOf([closingTurn("Fun!", "Fun!", false)]),
      lessonOf(
        [
          closingTurn(`Fun!\n${MORE_PROMPT.en}`, "Fun!", true),
          closingTurn(`Yay!\n${MORE_PROMPT.en}`, "Yay!", true),
          closingTurn("Shall we go on?", "Shall we go on?", false),
        ],
        "long",
      ),
    ];
    expect(chatClosingAskOf(lessons, "long")).toEqual({
      turns: 3,
      rawNoQuestion: 2,
      sentNoQuestion: 0,
      appAsked: 2,
    });
    expect(chatClosingAskOf(lessons)).toEqual({
      turns: 1,
      rawNoQuestion: 1,
      sentNoQuestion: 1,
      appAsked: 0,
    });
  });

  it.skipIf(PAST === null)(
    "AC-27n 지난 결과 폴더: 긴 대본 절에 (ㄱ) 셈 한 줄이 실리고, m-6 후보 수는 상수 물음만 든 차례를 뺀 수다",
    () => {
      const all = readLessons(PAST as string);
      const md = chatMarkdownOf(all);
      const long = chatClosingAskOf(all, "long");
      expect(long.turns).toBeGreaterThan(0);
      const at = md.indexOf("## 긴 대본 한 벌");
      expect(at).toBeGreaterThan(0);
      const section = md.slice(at, md.indexOf("## 차례마다의 값(긴 대본 밖)"));
      expect(section).toContain(
        `(ㄱ) 셈(긴 대본 · 같은 함수): 앱의 마무리 차례 ${long.turns} · 모델 원문 기준 물음 없음 ${long.rawNoQuestion}/${long.turns}`,
      );
      expect(section).toContain(`앱이 상수 물음을 붙인 차례 ${long.appAsked}`);
      const m6 = chatM6CandidatesOf(chatCountsOf(all));
      expect(md).toContain(`후보 ${m6.length}(사람이 읽어 셈)`);
    },
  );
});
