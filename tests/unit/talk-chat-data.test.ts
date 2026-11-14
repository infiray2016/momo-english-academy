// 이야기 방식 묶음 D(데이터 꼴, plan 2026-11-13-회화-대화-구조-R 묶음 표 'D 데이터 꼴' · spec 판 3 데이터 절 · AC-1 의 미나 재료).
// DB 열거 값 셋(input_mode quiet · ai_purpose talk_chat_hint · talk_chat_eval) · 새 열 talk_turns.chat_judge · 마이그레이션 0009 ·
// 선생님 시드 새 칸 둘(chatPersonaEn · chatFavoritesEn — 미나는 시제품 R3 의 글 그대로, 리오는 비움).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { AI_PURPOSES, settingKeysOf } from "@/core/ai/combo";
import { checkTeacherRoster } from "@/core/seed/check-teacher";
import { buildReferenceIndex } from "@/core/seed/reference-index";
import {
  type TeachersFile,
  TeachersFileSchema,
} from "@/core/seed/schema/teachers";
import { SEED_FILES } from "@/core/seed/structure";
import { chatMaterialOf, teacherViewOf } from "@/core/teacher/roster";
import { aiPurposeEnum, inputModeEnum } from "@/db/schema/content";
import { talkTurns } from "@/db/schema/learning";
import { R3_SYSTEM_TEMPLATE } from "../../scripts/exp/arch-arm-q";
import {
  defaultSettings,
  referenceSet,
  teacherRoster,
} from "../fixtures/seed/builders";

const DRIZZLE = join(process.cwd(), "drizzle");
const MIGRATION = "0009_talk_chat";

function seedRoster(): TeachersFile {
  return TeachersFileSchema.parse(
    JSON.parse(
      readFileSync(join(process.cwd(), "seed", SEED_FILES.teachers), "utf8"),
    ),
  );
}

function teacher(r: TeachersFile, key: string) {
  const t = r.teachers.find((x) => x.key === key);
  if (!t) throw new Error(`명단에 ${key} 없음`);
  return t;
}

describe("마이그레이션 0009(이야기 방식 데이터 꼴, 더하기만)", () => {
  const sql = readFileSync(join(DRIZZLE, `${MIGRATION}.sql`), "utf8");
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s !== "");

  it("AC-27a 마이그레이션 0009 는 열거 값 셋과 chat_judge 열을 더하기만 하고 기존 값 차례를 바꾸지 않는다", () => {
    expect([...statements].sort()).toEqual(
      [
        `ALTER TYPE "public"."ai_purpose" ADD VALUE 'talk_chat_hint';`,
        `ALTER TYPE "public"."ai_purpose" ADD VALUE 'talk_chat_eval';`,
        `ALTER TYPE "public"."input_mode" ADD VALUE 'quiet';`,
        `ALTER TABLE "talk_turns" ADD COLUMN "chat_judge" jsonb;`,
      ].sort(),
    );
    // BEFORE · AFTER 없이 끝에 더한다 — 기존 값의 차례가 그대로다
    expect(sql).not.toMatch(/\b(BEFORE|AFTER)\b/);
    // ai_purpose 두 값은 hint → eval 차례로 더한다(코드 AI_PURPOSES 와 같은 차례)
    expect(sql.indexOf("'talk_chat_hint'")).toBeLessThan(
      sql.indexOf("'talk_chat_eval'"),
    );
  });

  it("AC-27a 마이그레이션 0009 는 더한 열거 값을 같은 파일에서 쓰지 않는다(같은 거래 안에서 쓸 수 없음) · 지우거나 바꾸는 문장이 없다", () => {
    for (const s of statements) {
      expect(s).toMatch(/^ALTER (TYPE|TABLE) "/);
      expect(s).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|RENAME|DEFAULT)\b/);
    }
  });

  it("AC-27a 0009 는 journal 의 열째 줄이고 스냅숏이 열거 값 · 새 열을 담는다", () => {
    const journal = JSON.parse(
      readFileSync(join(DRIZZLE, "meta/_journal.json"), "utf8"),
    ) as { entries: { idx: number; tag: string }[] };
    expect(journal.entries.find((e) => e.tag === MIGRATION)).toMatchObject({
      idx: 9,
    });
    expect(journal.entries.at(-1)?.tag).toBe(MIGRATION);
    const snap = JSON.parse(
      readFileSync(join(DRIZZLE, "meta/0009_snapshot.json"), "utf8"),
    ) as {
      prevId: string;
      enums: Record<string, { values: string[] }>;
      tables: Record<
        string,
        { columns: Record<string, { type: string; notNull: boolean }> }
      >;
    };
    const prev = JSON.parse(
      readFileSync(join(DRIZZLE, "meta/0008_snapshot.json"), "utf8"),
    ) as { id: string };
    expect(snap.prevId).toBe(prev.id);
    expect(snap.enums["public.input_mode"]?.values).toEqual([
      "speech",
      "dont_know",
      "quiet",
    ]);
    expect(snap.enums["public.ai_purpose"]?.values).toEqual([...AI_PURPOSES]);
    expect(snap.tables["public.talk_turns"]?.columns.chat_judge).toMatchObject({
      type: "jsonb",
      notNull: false,
    });
  });
});

describe("DB 열거 값과 새 열(스키마)", () => {
  it("AC-27a input_mode 는 speech · dont_know 뒤에 quiet 하나를 더한다", () => {
    expect([...inputModeEnum.enumValues]).toEqual([
      "speech",
      "dont_know",
      "quiet",
    ]);
  });

  it("AC-27a ai_purpose 는 기존 일곱의 차례 그대로 뒤에 talk_chat_hint · talk_chat_eval 을 더하고 AI_PURPOSES 와 같다", () => {
    expect([...aiPurposeEnum.enumValues]).toEqual([
      "writing_feedback",
      "writing_check",
      "speaking_eval",
      "thinkout",
      "talk_turn",
      "talk_closing",
      "probe",
      "talk_chat_hint",
      "talk_chat_eval",
    ]);
    expect([...AI_PURPOSES]).toEqual([...aiPurposeEnum.enumValues]);
  });

  it("AC-27a 새 호출 목적 둘의 설정 키는 구간 없는 목적 키이고, 평가 호출만 feedback 시간 상한이다(spec 설계 7 · 8-2)", () => {
    expect(settingKeysOf("talk_chat_hint")).toEqual({
      model: "ai.model.talk_chat_hint",
      effort: "ai.effort.talk_chat_hint",
      thinking: "ai.thinking.talk_chat_hint",
      maxTokens: "ai.max_tokens.talk_chat_hint",
      timeout: "ai.timeout_seconds.realtime",
    });
    expect(settingKeysOf("talk_chat_eval")).toEqual({
      model: "ai.model.talk_chat_eval",
      effort: "ai.effort.talk_chat_eval",
      thinking: "ai.thinking.talk_chat_eval",
      maxTokens: "ai.max_tokens.talk_chat_eval",
      timeout: "ai.timeout_seconds.feedback",
    });
  });

  it("AC-27a talk_turns.chat_judge 는 비울 수 있는 jsonb 열이다(기본값 없음)", () => {
    const col = getTableColumns(talkTurns).chatJudge;
    expect(col.name).toBe("chat_judge");
    expect(col.getSQLType()).toBe("jsonb");
    expect(col.notNull).toBe(false);
    expect(col.hasDefault).toBe(false);
  });
});

describe("선생님 시드의 이야기 방식 재료", () => {
  it("AC-27a 미나만 이야기 방식 재료가 있다", () => {
    const seed = seedRoster();
    const mina = chatMaterialOf(teacher(seed, "mina"));
    expect(mina).not.toBeNull();
    // 시제품 R3 의 'About you' 글에서 성격 · 좋아하는 것 자리를 글자 그대로 옮겼다(spec 설계 2 자리 값)
    expect(R3_SYSTEM_TEMPLATE).toContain(
      `About you: ${mina?.personaEn} Like anyone, you have favorites, so that you can answer as yourself when the child asks: ${mina?.favoritesEn} These are answers`,
    );
    expect(mina).toEqual({
      personaEn:
        "You are warm, curious, and a little playful, and you laugh easily.",
      favoritesEn:
        "you like small animals (cats most of all), drawing, music, puzzles, kites, picture books, the sea, and stars; your favorite fruit is strawberries and your favorite color is yellow.",
    });
    // 리오는 비움(미결 2) — 리오 수업은 기존 방식
    const leo = teacher(seed, "leo");
    expect(leo.chatPersonaEn).toBeUndefined();
    expect(leo.chatFavoritesEn).toBeUndefined();
    expect(chatMaterialOf(leo)).toBeNull();
    // 지금 personaEn 은 기존 방식 · 지금 새 방식이 쓰므로 그대로다
    expect(teacher(seed, "mina").personaEn).toBe(
      "Warm and patient. You go step by step and laugh together with the child.",
    );
  });

  it("AC-27a 이야기 방식 재료는 둘 다 있을 때만 있고, 하나만 있으면 없다", () => {
    const base = teacher(teacherRoster(), "mina");
    const persona = "You are kind.";
    const favorites = "you like stars.";
    expect(
      chatMaterialOf({
        ...base,
        chatPersonaEn: persona,
        chatFavoritesEn: favorites,
      }),
    ).toEqual({ personaEn: persona, favoritesEn: favorites });
    expect(chatMaterialOf({ ...base, chatPersonaEn: persona })).toBeNull();
    expect(chatMaterialOf({ ...base, chatFavoritesEn: favorites })).toBeNull();
    expect(chatMaterialOf(base)).toBeNull();
  });

  it("AC-27a 이야기 방식 재료는 화면 몫(TeacherView)에 가지 않는다", () => {
    const view = teacherViewOf(teacher(seedRoster(), "mina"));
    expect(JSON.stringify(view)).not.toContain("favorite");
    expect(Object.keys(view)).not.toContain("chatPersonaEn");
    expect(Object.keys(view)).not.toContain("chatFavoritesEn");
  });

  it("AC-27a 시드 규격은 두 칸을 선택 칸으로 받고 빈 글은 받지 않는다", () => {
    const r = teacherRoster();
    expect(TeachersFileSchema.safeParse(r).success).toBe(true);
    const t = r.teachers[0];
    if (!t) throw new Error("명단 없음");
    t.chatPersonaEn = " ";
    expect(TeachersFileSchema.safeParse(r).success).toBe(false);
    t.chatPersonaEn = "You are kind.";
    t.chatFavoritesEn = "";
    expect(TeachersFileSchema.safeParse(r).success).toBe(false);
  });
});

describe("명단 검사의 이야기 방식 재료", () => {
  const ref = referenceSet(defaultSettings());
  const { index } = buildReferenceIndex(ref);
  const ctx = { lexicon: index.lexicon, forbidden: index.forbidden };
  const withMina = (
    patch: Partial<TeachersFile["teachers"][number]>,
  ): TeachersFile => {
    const r = teacherRoster();
    const t = r.teachers[0];
    if (!t) throw new Error("명단 없음");
    Object.assign(t, patch);
    return r;
  };
  const issuesOf = (r: TeachersFile) =>
    checkTeacherRoster(r, ctx).map((i) => `${i.rule} ${i.path}`);

  it("AC-27a 시드 명단(미나 재료 있음 · 리오 비움)은 명단 검사를 통과한다", () => {
    expect(checkTeacherRoster(seedRoster(), ctx)).toEqual([]);
  });

  it("AC-27a 한 칸만 채운 선생님은 명단 검사에 걸린다(둘 다 있거나 둘 다 없음)", () => {
    expect(issuesOf(withMina({ chatPersonaEn: "You are kind." }))).toEqual([
      "teacher-roster teachers.0.chatFavoritesEn",
    ]);
    expect(issuesOf(withMina({ chatFavoritesEn: "you like stars." }))).toEqual([
      "teacher-roster teachers.0.chatPersonaEn",
    ]);
  });

  it("AC-27a 재료 칸은 한 문장 · 마침표 끝 · 틀 자리 없음이다", () => {
    const ok = {
      chatPersonaEn: "You are kind.",
      chatFavoritesEn: "you like stars.",
    };
    expect(issuesOf(withMina(ok))).toEqual([]);
    expect(
      issuesOf(withMina({ ...ok, chatPersonaEn: "You are kind. You laugh." })),
    ).toEqual(["teacher-roster teachers.0.chatPersonaEn"]);
    expect(
      issuesOf(withMina({ ...ok, chatFavoritesEn: "you like stars" })),
    ).toEqual(["teacher-roster teachers.0.chatFavoritesEn"]);
    expect(
      issuesOf(withMina({ ...ok, chatPersonaEn: "You are {TEACHER}." })),
    ).toEqual(["teacher-roster teachers.0.chatPersonaEn"]);
  });
});
