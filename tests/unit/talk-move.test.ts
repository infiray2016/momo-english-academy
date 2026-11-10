// 회화 수업 선생님 행 차례 정보 칸 move(5절 talk_turns.move · 회화 plan '이름' 절 move 표 · 정한 것 5 · 6 · 8).
// 꼴 · 만들기 · 읽기 · 원문을 지울 때 남는 값을 본다. 통합(선생님 행마다 move)은 묶음 7 · 8 이다.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  eraseTalkMoveText,
  readTalkMove,
  TALK_CHILD_CAUSES,
  TALK_MOVE_VERSION,
  TALK_SLOT_WHYS,
  TALK_SUPPORT_STAGE_EASY,
  TALK_SUPPORT_STAGE_MAX,
  TALK_SUPPORT_STAGE_TOGETHER,
  type TalkMove,
  TalkMoveSchema,
  talkMoveOf,
} from "@/core/conversation/move";

const full: TalkMove = talkMoveOf({
  kind: "card_slot",
  why: "support",
  next: "required",
  item: { kind: "required", no: 2 },
  goals: ["talk-3-1-1"],
  words: ["play"],
  stage: 1,
  cause: "button",
  streak: 1,
  app: ["together", "answer_example"],
  ai: "together",
  intro: ["soccer"],
  suggest: {
    fit: true,
    topic: false,
    asked: false,
    goals: [{ id: "talk-3-1-1", why: "아이가 스스로 주말 일을 말했다" }],
  },
  sound: { answer: "I play soccer." },
  prep: { words: ["soccer"] },
});

describe("move 꼴(판 1)", () => {
  it("AC-15v 만들기는 빈 칸을 기본값으로 채우고 규격을 지난다", () => {
    const m = talkMoveOf({ kind: "ai" });
    expect(m).toEqual({
      v: TALK_MOVE_VERSION,
      kind: "ai",
      why: null,
      next: "none",
      item: { kind: "none", no: 0 },
      goals: [],
      words: [],
      stage: 0,
      cause: null,
      streak: 0,
      app: [],
      ai: "none",
      intro: [],
      suggest: { fit: false, topic: false, asked: false, goals: [] },
      linked: [],
      held: [],
    });
    expect(TalkMoveSchema.safeParse(m).success).toBe(true);
  });

  it("AC-15v 모든 칸을 채운 move 가 규격을 지난다", () => {
    expect(TalkMoveSchema.parse(full)).toEqual(full);
  });

  it("AC-15v 모르는 값 · 모르는 칸 · 받침 단계 범위 밖은 거부한다", () => {
    expect(
      TalkMoveSchema.safeParse({ ...full, kind: "practice" }).success,
    ).toBe(false);
    expect(TalkMoveSchema.safeParse({ ...full, extra: 1 }).success).toBe(false);
    expect(TalkMoveSchema.safeParse({ ...full, stage: 4 }).success).toBe(false);
    expect(TalkMoveSchema.safeParse({ ...full, v: 2 }).success).toBe(false);
  });

  it("AC-15v 읽기는 비었거나 틀린 칸이면 null 이다(옛 행 · 칸이 빈 행)", () => {
    expect(readTalkMove(null)).toBeNull();
    expect(readTalkMove(undefined)).toBeNull();
    expect(readTalkMove({ kind: "ai" })).toBeNull();
    expect(readTalkMove(JSON.parse(JSON.stringify(full)))).toEqual(full);
  });
});

describe("되묻는 차례의 열거 값(회화 내용 고침 2 묶음 2-0 — 13절 C218, 5절 04:35 '카드 자리의 까닭 되묻기와 앞 아이 차례의 까닭 되물음')", () => {
  it("카드 자리의 까닭에 ask_again, 앞 아이 차례의 까닭에 unclear 가 더해졌고 앞의 값과 차례는 그대로다(더하기만)", () => {
    expect([...TALK_SLOT_WHYS]).toEqual([
      "follow_cap",
      "question_check",
      "same_question",
      "support",
      "cut",
      "fail",
      "ask_again",
    ]);
    expect([...TALK_CHILD_CAUSES]).toEqual([
      "button",
      "stuck",
      "nospeech",
      "unclear",
    ]);
  });

  it("move 판은 올리지 않는다(plan 정한 것 4): 판 1 그대로이고 옛 행(새 값이 없는 move)이 그대로 읽힌다", () => {
    expect(TALK_MOVE_VERSION).toBe(1);
    expect(readTalkMove(JSON.parse(JSON.stringify(full)))).toEqual(full);
  });

  it("되묻는 차례의 move(카드 자리 · 까닭 ask_again · 앞 아이 차례의 까닭 unclear)가 규격을 지나고 읽힌다", () => {
    const asked = talkMoveOf({
      kind: "card_slot",
      why: "ask_again",
      cause: "unclear",
      item: { kind: "required", no: 1 },
      words: ["play"],
    });
    expect(asked).toMatchObject({
      v: 1,
      kind: "card_slot",
      why: "ask_again",
      cause: "unclear",
      stage: 0,
      streak: 0,
    });
    expect(TalkMoveSchema.safeParse(asked).success).toBe(true);
    expect(readTalkMove(JSON.parse(JSON.stringify(asked)))).toEqual(asked);
    // 모르는 까닭은 여전히 거부한다
    expect(
      TalkMoveSchema.safeParse({ ...asked, why: "ask_twice" }).success,
    ).toBe(false);
    expect(
      TalkMoveSchema.safeParse({ ...asked, cause: "misheard" }).success,
    ).toBe(false);
  });
});

describe("원문을 지울 때(정한 것 5)", () => {
  it("AC-15v 소리 줄 글은 통째로, 근거 한 줄은 why 만 지우고 나머지는 남긴다", () => {
    const erased = eraseTalkMoveText(full);
    expect(erased.sound).toBeUndefined();
    expect("sound" in erased).toBe(false);
    expect(erased.suggest.goals).toEqual([{ id: "talk-3-1-1", why: "" }]);
    const { sound: _s, suggest: _g, ...rest } = full;
    const { suggest: _e, ...erasedRest } = erased;
    expect(erasedRest).toEqual(rest);
    expect(erased.suggest.fit).toBe(true);
    expect(TalkMoveSchema.safeParse(erased).success).toBe(true);
  });

  it("AC-15v 지운 move 를 다시 지워도 같다", () => {
    const once = eraseTalkMoveText(full);
    expect(eraseTalkMoveText(once)).toEqual(once);
  });
});

describe("받침 단계 번호는 move.ts 상수 하나(회화 plan 묶음 12 — '5-다' 우려 · 묶음 8 검토 M-7)", () => {
  /** src 아래 .ts · .tsx 파일 전부. */
  const sources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const path = join(dir, e.name);
      if (e.isDirectory()) return sources(path);
      return /\.tsx?$/.test(e.name) ? [path] : [];
    });

  it("받침 첫째 · 둘째 · 끝 번호는 1 · 2 · 3 이고(3.3 막힘 표의 줄), 다른 파일에 받침 번호 상수의 사본이나 move.stage 와 맨 숫자 견줌이 없다", () => {
    expect([
      TALK_SUPPORT_STAGE_TOGETHER,
      TALK_SUPPORT_STAGE_EASY,
      TALK_SUPPORT_STAGE_MAX,
    ]).toEqual([1, 2, 3]);
    const root = join(process.cwd(), "src");
    const copies: string[] = [];
    for (const file of sources(root)) {
      if (file.endsWith(join("core", "conversation", "move.ts"))) continue;
      const text = readFileSync(file, "utf8");
      // 받침 번호를 숫자로 다시 정의한 상수(SUPPORT_STAGE_EASY = 2 · STAGE_EASY = 2 꼴)
      for (const m of text.matchAll(
        /\bconst\s+\w*STAGE_(?:TOGETHER|EASY|CLOSE|MAX)\w*\s*=\s*\d/g,
      ))
        copies.push(`${file}: ${m[0]}`);
      // 받침 단계를 맨 숫자와 견줌(move.stage === 1 · supportStage !== 2 꼴)
      for (const m of text.matchAll(/\b(?:stage|supportStage)\s*[!=]==\s*\d/g))
        copies.push(`${file}: ${m[0]}`);
    }
    expect(copies).toEqual([]);
  });
});
