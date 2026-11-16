// 실험 보고 도구의 (ㄱ) 셈(13절 C243 보완 9 — spec '회화 대화 구조 R' 설계 9): 앱의 마무리 차례 가운데 물음 없는 차례를 모델 원문 기준과 나간 글
// (앱이 붙인 상수 물음 포함) 기준으로 함께 낸다. 지난 결과 폴더(고치기 전 기록)에서는 두 값이 같고 chatCountsOf 의 (ㄱ)과 같다.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import type { LessonLog, TeacherTurnLog } from "../../scripts/exp/arch-compare";
import { chatCountsOf } from "../../scripts/exp/arch-metrics";
import {
  chatClosingAskOf,
  chatMarkdownOf,
  type Lesson,
  readLessons,
} from "../../scripts/exp/arch-report";
import { MORE_PROMPT } from "../../src/core/conversation/spoken";

/** (ㄱ) 셈이 읽는 칸만 둔 선생님 차례(나간 글 · 모델 원문 · 사실 줄 · wrap_up). */
function closingTurn(
  final: string,
  modelFirstSpoken: string | null,
  { facts = ["closing"], wrapUp = false } = {},
): TeacherTurnLog {
  return {
    final,
    modelFirstSpoken,
    chat: { facts, wrapUp, wrapUpHeld: null },
  } as unknown as TeacherTurnLog;
}
function lessonOf(
  teachers: TeacherTurnLog[],
  variant?: "long",
): Pick<Lesson, "meta" | "teachers" | "children"> {
  return {
    meta: {
      arm: "CHAT",
      lesson: "CHAT-SA-s1",
      child: "SA",
      ...(variant ? { variant } : {}),
    } as unknown as LessonLog,
    teachers,
    children: [],
  };
}

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

describe("(ㄱ) 셈의 두 값(13절 C243 보완 9)", () => {
  it("AC-27n 앱의 마무리 차례만 세고, 모델 원문 기준 · 나간 글 기준(앱이 붙인 상수 물음 포함) · 앱이 붙인 차례를 함께 낸다(wrap_up 차례 · 긴 대본은 세지 않음)", () => {
    const appAsked = closingTurn(
      `Great talk today!\n${MORE_PROMPT.en}`,
      "Great talk today!",
    );
    const ownAsk = closingTurn(
      "That was fun! Shall we keep talking?",
      "That was fun! Shall we keep talking?",
    );
    // 응답이 없던 마무리 차례(모델 원문 없음): 나간 글에서 붙인 물음 줄을 뺀 글이 모델 원문 자리다
    const failed = closingTurn(`Tell me more!\n${MORE_PROMPT.en}`, null);
    const wrap = closingTurn("Bye!", "Bye!", { facts: [], wrapUp: true });
    const lessons = [
      lessonOf([appAsked, ownAsk, failed, wrap]),
      lessonOf([closingTurn("See you!", "See you!")], "long"),
    ];
    expect(chatClosingAskOf(lessons)).toEqual({
      turns: 3,
      rawNoQuestion: 2,
      sentNoQuestion: 0,
      appAsked: 2,
    });
    // 선생님 말 한 줄이 상수 물음과 같아도 앱이 붙인 줄로 세지 않는다(줄이 하나뿐)
    expect(
      chatClosingAskOf([
        lessonOf([closingTurn(MORE_PROMPT.en, MORE_PROMPT.en)]),
      ]),
    ).toEqual({ turns: 1, rawNoQuestion: 0, sentNoQuestion: 0, appAsked: 0 });
  });

  it.skipIf(PAST === null)(
    "AC-27n 지난 결과 폴더(고치기 전 기록): 붙인 물음이 없어 두 값이 같고 chatCountsOf 의 (ㄱ)과 같으며, chat.md 의 (ㄱ) 줄에 두 값이 함께 실린다",
    () => {
      const all = readLessons(PAST as string);
      const ask = chatClosingAskOf(all);
      const c = chatCountsOf(all);
      expect(ask.turns).toBe(c.closing.turns);
      expect(ask.turns).toBeGreaterThan(0);
      expect(ask.appAsked).toBe(0);
      expect(ask.rawNoQuestion).toBe(c.closing.noQuestion);
      expect(ask.sentNoQuestion).toBe(c.closing.noQuestion);
      const row = chatMarkdownOf(all)
        .split("\n")
        .find((line) => line.startsWith("| (ㄱ) "));
      expect(row).toContain(`모델 원문 기준 ${ask.rawNoQuestion}/${ask.turns}`);
      expect(row).toContain(
        `나간 글 기준(앱이 붙인 상수 물음 포함) ${c.closing.noQuestion}/${c.closing.turns}`,
      );
      expect(row).toContain("앱이 상수 물음을 붙인 차례 0");
    },
  );
});
