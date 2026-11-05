// 회화 수업 새 흐름의 시도 꼴 · 감시 기록 칸 · 마이그레이션(회화 plan 묶음 7 — plan '이름' 절 107줄 시도 꼴, 정한 것 6 · 10 · 22).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  lessonFollowAlongNo,
  lessonFollowDoneOf,
  parseTalkAttemptInput,
  prepWordsShownOf,
  TALK_CLOSING_REASONS,
  type TalkAttemptInput,
} from "@/core/conversation/attempt";
import {
  CLIENT_LISTENS_MAX,
  ClientListenSchema,
  TALK_SPEAK_HITCHES,
  TALK_SPEAK_WHATS,
} from "@/core/conversation/client-listen";
import { TALK_SEGMENTS } from "@/core/seed/structure";
import { talkSegmentEnum } from "@/db/schema/content";
import { talkSegmentOf } from "@/server/conversation/state";

const SETTINGS = JSON.parse(
  readFileSync(join(process.cwd(), "seed/settings.json"), "utf8"),
) as { settings: { key: string; value: unknown }[] };
const settingOf = (key: string): number => {
  const value = SETTINGS.settings.find((row) => row.key === key)?.value;
  if (typeof value !== "number") throw new Error(`${key} 없음`);
  return value;
};

const head = { v: 1, step: "final" } as const;
const spoken = {
  target: "I play soccer.",
  heard: ["I play soccer"],
  failures: 0,
};

function prep(
  index: number,
  word: string,
  place: "greeting" | "talk" = "greeting",
  extra: Record<string, unknown> = {},
): TalkAttemptInput {
  const raw = {
    ...head,
    kind: "talk-prep",
    ...spoken,
    index,
    word,
    place,
    ...extra,
  };
  const parsed = parseTalkAttemptInput(raw);
  if (!parsed) throw new Error("talk-prep 꼴이 아니다");
  return parsed;
}

describe("회화 수업 시도 꼴(attempts.input 판 1, 더하기만)", () => {
  it("처음 스냅숏은 짧은 준비 계획 낱말 · 이월(선택)을 받고, 칸이 없는 옛 스냅숏도 그대로 읽는다", () => {
    const old = {
      ...head,
      kind: "talk-start",
      shownWords: ["apple"],
      metBefore: [],
      practiceOrder: [[0]],
      teacherKey: "mina",
    };
    expect(parseTalkAttemptInput(old)).toEqual(old);
    const lesson = {
      ...old,
      shownWords: [],
      practiceOrder: [],
      prepWords: ["play", "soccer", "sunday"],
      carry: { goals: ["talk-3-1-1"], words: ["watch"] },
    };
    expect(parseTalkAttemptInput(lesson)).toEqual(lesson);
    expect(
      parseTalkAttemptInput({ ...lesson, carry: { goals: [] } }),
    ).toBeUndefined();
  });

  it("짧은 준비 시도(talk-prep)는 낱말 · 열린 자리(인사 뒤 · 대화 중)를 두고, 바닥선 듣기 활동(talk-floor)은 작은 '다음' 건너뜀을 받는다", () => {
    expect(prep(0, "play")).toMatchObject({
      kind: "talk-prep",
      word: "play",
      place: "greeting",
    });
    expect(prep(1, "soccer", "talk", { skipped: "recognition" })).toMatchObject(
      {
        place: "talk",
        skipped: "recognition",
      },
    );
    // 따라 말하기 시도와 같은 감시 칸(client_listen)을 둔다
    expect(
      prep(0, "play", "greeting", {
        clientListen: { br: "iPad Safari 27.0", r3d: true, listens: [], mf: 0 },
      }),
    ).toMatchObject({ clientListen: { br: "iPad Safari 27.0" } });
    expect(
      parseTalkAttemptInput({
        ...head,
        kind: "talk-prep",
        ...spoken,
        index: 0,
        word: "play",
      }),
    ).toBeUndefined();
    expect(
      parseTalkAttemptInput({
        ...head,
        kind: "talk-prep",
        ...spoken,
        index: 0,
        word: "play",
        place: "floor",
      }),
    ).toBeUndefined();
    const floor = {
      ...head,
      kind: "talk-floor",
      ...spoken,
      index: 0,
      word: "sunday",
      skipped: "next",
    };
    expect(parseTalkAttemptInput(floor)).toEqual(floor);
    // '다음' 건너뜀은 바닥선 듣기 활동만이다
    expect(
      parseTalkAttemptInput({
        ...head,
        kind: "talk-prep",
        ...spoken,
        index: 0,
        word: "play",
        place: "greeting",
        skipped: "next",
      }),
    ).toBeUndefined();
  });

  it("정한 것 6 끝맺음 기록의 까닭에 마무리 물음 · 마무리 제안 · 바닥선 · 확인 뒤 그만두기를 더하고 옛 까닭도 그대로 받는다", () => {
    for (const reason of [
      "closing_question",
      "suggestion",
      "floor",
      "stop_confirmed",
      "stop",
      "leave",
      "safety",
      "resting",
      "idle",
      "aborted",
    ]) {
      expect(TALK_CLOSING_REASONS).toContain(reason);
      expect(
        parseTalkAttemptInput({ ...head, kind: "talk-closing", reason }),
      ).toEqual({ ...head, kind: "talk-closing", reason });
    }
    expect(TALK_CLOSING_REASONS).toHaveLength(10);
  });

  it("활동 번호: 처음 스냅숏 뒤로 짧은 준비 → 바닥선 → 정리 → 한 번 더 말해 보기, 짧은 준비 범위는 max(오늘 쓸 말 수, talk.prep_words) · 바닥선 범위는 오늘 쓸 말 수다", () => {
    const counts = { todayWords: 3, prepWords: 3, wrapUp: 2 };
    expect(lessonFollowAlongNo({ segment: "prep", index: 0 }, counts)).toBe(2);
    expect(lessonFollowAlongNo({ segment: "prep", index: 2 }, counts)).toBe(4);
    expect(lessonFollowAlongNo({ segment: "floor", index: 0 }, counts)).toBe(5);
    expect(lessonFollowAlongNo({ segment: "floor", index: 2 }, counts)).toBe(7);
    expect(lessonFollowAlongNo({ segment: "wrap_up", index: 1 }, counts)).toBe(
      9,
    );
    expect(lessonFollowAlongNo({ segment: "again", index: 0 }, counts)).toBe(
      10,
    );
    expect(() =>
      lessonFollowAlongNo({ segment: "prep", index: 3 }, counts),
    ).toThrow(RangeError);
    expect(() =>
      lessonFollowAlongNo({ segment: "wrap_up", index: 2 }, counts),
    ).toThrow(RangeError);
  });

  it("다지기 · 보강 카드(오늘 쓸 말 0)의 짧은 준비는 talk.prep_words.<구간> 개까지 활동 번호를 받는다(02-2:173)", () => {
    const prepWords = settingOf("talk.prep_words.1-3");
    const counts = { todayWords: 0, prepWords, wrapUp: 2 };
    expect(lessonFollowAlongNo({ segment: "prep", index: 0 }, counts)).toBe(2);
    expect(
      lessonFollowAlongNo({ segment: "prep", index: prepWords - 1 }, counts),
    ).toBe(1 + prepWords);
    expect(lessonFollowAlongNo({ segment: "wrap_up", index: 0 }, counts)).toBe(
      2 + prepWords,
    );
    expect(lessonFollowAlongNo({ segment: "again", index: 0 }, counts)).toBe(
      2 + prepWords + 2,
    );
    expect(() =>
      lessonFollowAlongNo({ segment: "prep", index: prepWords }, counts),
    ).toThrow(RangeError);
    expect(() =>
      lessonFollowAlongNo({ segment: "floor", index: 0 }, counts),
    ).toThrow(RangeError);
  });

  it("배정 카드의 오늘 쓸 말이 talk.prep_words 보다 많으면 짧은 준비 범위는 오늘 쓸 말 수다", () => {
    const prepWords = settingOf("talk.prep_words.4-6");
    const todayWords = prepWords + 1;
    const counts = { todayWords, prepWords, wrapUp: 1 };
    expect(
      lessonFollowAlongNo({ segment: "prep", index: todayWords - 1 }, counts),
    ).toBe(1 + todayWords);
    expect(lessonFollowAlongNo({ segment: "floor", index: 0 }, counts)).toBe(
      2 + todayWords,
    );
    expect(() =>
      lessonFollowAlongNo({ segment: "prep", index: todayWords }, counts),
    ).toThrow(RangeError);
  });

  it("흐름 입력 prepWords: 인사 뒤 준비 토막에서 쪽지로 보인 낱말 전부(건너뛴 낱말 포함, 차례대로)이고 대화 중 연 준비 · 계획 목록은 들지 않는다", () => {
    const start = {
      ...head,
      kind: "talk-start",
      shownWords: [],
      metBefore: [],
      practiceOrder: [],
      prepWords: ["play", "soccer", "sunday"],
    };
    // when_needed 수업: 인사 뒤 준비를 하지 않았으면 계획 목록이 있어도 빈 목록이다
    expect(prepWordsShownOf([start])).toEqual([]);
    const inputs = [
      start,
      prep(1, "soccer", "greeting", { skipped: "recognition" }),
      prep(0, "play"),
      prep(0, "play"),
      prep(0, "watch", "talk"),
    ];
    expect(prepWordsShownOf(inputs)).toEqual(["play", "soccer"]);
    const done = lessonFollowDoneOf([
      ...inputs,
      { ...head, kind: "talk-wrapup", ...spoken, index: 0 },
      { ...head, kind: "talk-again", ...spoken },
      { ...head, kind: "talk-floor", ...spoken, index: 1, word: "sunday" },
    ]);
    expect(done.prep).toEqual([
      { place: "greeting", index: 0, word: "play" },
      { place: "greeting", index: 1, word: "soccer" },
      { place: "talk", index: 0, word: "watch" },
    ]);
    expect(done.floor).toEqual([1]);
    expect(done.wrapUp).toEqual([0]);
    expect(done.again).toBe(true);
  });
});

describe("감시 기록 칸 sp(정한 것 10, client_listen)", () => {
  it("선생님 쪽 발화의 감시 결과를 { w, h } 로 최근 CLIENT_LISTENS_MAX 개까지 받고, 글 · 들려줌 칸은 받지 않는다", () => {
    const base = { br: "iPad Safari 27.0", r3d: false, listens: [], mf: 0 };
    expect(ClientListenSchema.parse(base)).toEqual(base);
    const sp = TALK_SPEAK_WHATS.map((w, i) => ({
      w,
      h: TALK_SPEAK_HITCHES[i % TALK_SPEAK_HITCHES.length],
    }));
    expect(ClientListenSchema.parse({ ...base, sp })).toEqual({ ...base, sp });
    expect([...TALK_SPEAK_WHATS]).toEqual([
      "tori",
      "card",
      "sound",
      "wait",
      "prep",
      "floor",
      "wrap",
    ]);
    expect([...TALK_SPEAK_HITCHES]).toEqual(["no_end", "not_played"]);
    const many = Array.from({ length: CLIENT_LISTENS_MAX + 1 }, () => ({
      w: "tori",
      h: "no_end",
    }));
    expect(ClientListenSchema.safeParse({ ...base, sp: many }).success).toBe(
      false,
    );
    for (const bad of [
      { w: "tori", h: "played" },
      { w: "tori", h: "no_end", text: "Hello!" },
      { w: "child", h: "no_end" },
    ])
      expect(
        ClientListenSchema.safeParse({ ...base, sp: [bad] }).success,
        JSON.stringify(bad),
      ).toBe(false);
  });
});

describe("마이그레이션(정한 것 8 · 22, 더하기만)", () => {
  it("AC-15v 0006 은 talk_segment 에 prep 을 더하고 talk_turns 에 move jsonb 를 더하기만 하며, 더한 값을 같은 파일에서 쓰지 않는다", () => {
    const sql = readFileSync(
      join(process.cwd(), "drizzle/0006_talk_turns_move_prep.sql"),
      "utf8",
    );
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s !== "");
    expect(statements).toEqual([
      `ALTER TYPE "public"."talk_segment" ADD VALUE 'prep' BEFORE 'today_words';`,
      `ALTER TABLE "talk_turns" ADD COLUMN "move" jsonb;`,
    ]);
    const journal = JSON.parse(
      readFileSync(join(process.cwd(), "drizzle/meta/_journal.json"), "utf8"),
    ) as { entries: { idx: number; tag: string }[] };
    // 뒤에 0007 · 0008 이 더해져도 깨지지 않게 tag 로 그 줄을 찾는다(묶음 7 검토 M-2).
    expect(
      journal.entries.find((e) => e.tag === "0006_talk_turns_move_prep"),
    ).toMatchObject({ idx: 6 });
  });

  it("DB 열거 talk_segment 는 코드 토막 TALK_SEGMENTS 를 같은 차례로 담고 옛 흐름 토막 값 둘만 더 둔다(마이그레이션은 더하기만 — 정한 것 8, 묶음 12)", () => {
    const db = [...talkSegmentEnum.enumValues];
    const code = [...TALK_SEGMENTS] as string[];
    // 코드 토막은 DB 열거의 같은 차례 부분열이다(prep 은 인사 뒤)
    expect(db.filter((v) => code.includes(v))).toEqual(code);
    expect(TALK_SEGMENTS.indexOf("prep")).toBe(
      TALK_SEGMENTS.indexOf("greeting") + 1,
    );
    // DB 에만 남은 값은 옛 흐름의 오늘 쓸 말 · 말해 보기 토막 둘이고, 새 흐름 상태 읽기는 그 값을 던진다(조용히 바꾸지 않음)
    const old = db.filter((v) => !code.includes(v));
    expect(old).toHaveLength(2);
    for (const value of old) expect(() => talkSegmentOf(value)).toThrow();
    expect(talkSegmentOf(null)).toBe("greeting");
    for (const value of TALK_SEGMENTS) expect(talkSegmentOf(value)).toBe(value);
  });
});
