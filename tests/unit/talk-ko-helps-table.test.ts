// 표 talk_ko_helps · 열거형 둘 · 마이그레이션 0010(수업 안 한국어로 묻기 묶음 4-가 — spec 판 3 설계 5 · plan '새 설정 키와 마이그레이션' ·
// 정한 것 7 · 다시 맞춤(2026-11-17) · 13절 C225 (1) · (6) · C225 보완 1 (5)). 한국어 문답은 talk_turns 에 넣지 않고 따로 둔 표에 남긴다.
// 열거 값을 더하는 문장과 그 값을 쓰는 문장을 한 마이그레이션에 두지 않는다(Drizzle 은 밀린 마이그레이션을 한 거래로 돌린다).
// DB 에 닿지 않는다(적용 · RLS 실측은 CI 통합 시험 rls-grants 와 컨트롤러의 적용).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  TALK_KO_HELP_FALLBACK_SHAPES,
  TALK_KO_HELP_KINDS,
} from "@/core/ai/calls/talk-ko-help";
import { AI_PURPOSES } from "@/core/ai/combo";
import { koHelpFallbackEnum, koHelpKindEnum } from "@/db/schema/content";
import { sessions, talkKoHelps, talkTurns } from "@/db/schema/learning";
import { schemaTableNames } from "../../scripts/check-data-api";

const DRIZZLE = join(process.cwd(), "drizzle");
const MIGRATION = "0010_talk_ko_helps";
const PREV = "0009";

/** plan '새 설정 키와 마이그레이션' 의 칸 표(정한 것 7 의 shown_en 포함): [열, SQL 꼴, 비울 수 있는가]. */
const COLUMNS: readonly [string, string, boolean][] = [
  ["id", "uuid", false],
  ["session_id", "uuid", false],
  ["turn_no", "smallint", false],
  ["seq", "smallint", false],
  ["client_attempt_id", "text", false],
  ["question", "text", false],
  ["kind", "ko_help_kind", true],
  ["say_ko", "text", true],
  ["teach_en", "text", true],
  ["shown_en", "text[]", true],
  ["text_shown", "boolean", true],
  ["heard", "boolean", true],
  ["replays", "smallint", true],
  ["out_of_range", "smallint", true],
  ["fallback", "ko_help_fallback", true],
  ["client_listen", "jsonb", true],
  ["asked_at", "timestamp with time zone", false],
  ["answered_at", "timestamp with time zone", true],
];

describe("표 talk_ko_helps(spec 설계 5 · plan 정한 것 7)", () => {
  const config = getTableConfig(talkKoHelps);

  it("AC-25i 칸은 plan 표 그대로이고(새로 보인 영어 글 shown_en 포함) 답이 오기 전에 비는 칸만 비울 수 있다", () => {
    expect(getTableName(talkKoHelps)).toBe("talk_ko_helps");
    const columns = Object.values(getTableColumns(talkKoHelps));
    expect(columns.map((c) => [c.name, c.getSQLType(), !c.notNull])).toEqual(
      COLUMNS,
    );
  });

  it("AC-25i (session_id, turn_no, seq) 와 client_attempt_id 가 유일하고, 세션을 지우면 함께 지우며, RLS 를 켠다", () => {
    expect(
      config.uniqueConstraints.map((u) => [
        u.getName(),
        u.columns.map((c) => c.name),
      ]),
    ).toEqual([
      ["talk_ko_helps_turn_seq_unique", ["session_id", "turn_no", "seq"]],
      ["talk_ko_helps_client_attempt_id_unique", ["client_attempt_id"]],
    ]);
    expect(config.foreignKeys).toHaveLength(1);
    const fk = config.foreignKeys[0];
    const ref = fk?.reference();
    expect(ref?.columns.map((c) => c.name)).toEqual(["session_id"]);
    expect(ref && getTableName(ref.foreignTable)).toBe(getTableName(sessions));
    expect(fk?.onDelete).toBe("cascade");
    expect(config.enableRLS).toBe(true);
  });

  it("AC-25i 갈래 · 대신 줄 꼴 열거형은 호출 조각의 값과 같은 차례다(대신 줄 꼴은 none 이 앞)", () => {
    expect([...koHelpKindEnum.enumValues]).toEqual([...TALK_KO_HELP_KINDS]);
    expect(koHelpKindEnum.enumName).toBe("ko_help_kind");
    expect([...koHelpFallbackEnum.enumValues]).toEqual([
      "none",
      ...TALK_KO_HELP_FALLBACK_SHAPES,
    ]);
    expect(koHelpFallbackEnum.enumName).toBe("ko_help_fallback");
  });

  it("AC-25i talk_turns 의 칸은 그대로다(한국어 문답은 따로 표에 둔다 — FR-9 · NFR-1)", () => {
    const names = Object.values(getTableColumns(talkTurns)).map((c) => c.name);
    for (const name of ["kind", "say_ko", "teach_en", "shown_en", "seq"])
      expect(names).not.toContain(name);
  });

  it("AC-25i 스키마의 테이블 목록(Data API 확인 · RLS 시험이 읽는 것)에 talk_ko_helps 가 든다", () => {
    expect(schemaTableNames()).toContain("talk_ko_helps");
  });
});

describe("마이그레이션 0010(더하기만 · C225 보완 1 (5))", () => {
  const sql = readFileSync(join(DRIZZLE, `${MIGRATION}.sql`), "utf8");
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s !== "");

  it("AC-25i 든 것은 ai_purpose 값 talk_ko_help 더하기 · 새 열거형 둘 · 표 · RLS 켜기 · 세션 참조이고 지우거나 바꾸는 문장이 없다", () => {
    const heads = statements.map((s) => s.split("(")[0]?.trim());
    expect(heads).toEqual([
      `CREATE TYPE "public"."ko_help_fallback" AS ENUM`,
      `CREATE TYPE "public"."ko_help_kind" AS ENUM`,
      `ALTER TYPE "public"."ai_purpose" ADD VALUE 'talk_ko_help';`,
      `CREATE TABLE "talk_ko_helps"`,
      `ALTER TABLE "talk_ko_helps" ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE "talk_ko_helps" ADD CONSTRAINT "talk_ko_helps_session_id_sessions_id_fk" FOREIGN KEY`,
    ]);
    expect(sql).toMatch(/ON DELETE cascade/);
    for (const s of statements) {
      expect(s).toMatch(/^(CREATE|ALTER) (TYPE|TABLE) "/);
      expect(s).not.toMatch(
        /\b(DROP|RENAME|INSERT|DELETE FROM|SET DATA TYPE|SET NOT NULL|BEFORE|AFTER)\b/,
      );
    }
  });

  it("AC-25i 더한 열거 값 talk_ko_help 는 그 값을 더하는 문장에만 나온다(같은 거래 안에서 쓰지 않는다)", () => {
    const uses = statements.filter((s) => s.includes("'talk_ko_help'"));
    expect(uses).toEqual([
      `ALTER TYPE "public"."ai_purpose" ADD VALUE 'talk_ko_help';`,
    ]);
  });

  it("AC-25i 0010 은 journal 의 열한째 줄이고 스냅숏이 0009 에서 이어 새 열거 값 · 표를 담는다", () => {
    const journal = JSON.parse(
      readFileSync(join(DRIZZLE, "meta/_journal.json"), "utf8"),
    ) as { entries: { idx: number; tag: string; breakpoints: boolean }[] };
    expect(journal.entries.find((e) => e.tag === MIGRATION)).toMatchObject({
      idx: 10,
      breakpoints: true,
    });
    const snap = JSON.parse(
      readFileSync(join(DRIZZLE, "meta/0010_snapshot.json"), "utf8"),
    ) as {
      prevId: string;
      enums: Record<string, { values: string[] }>;
      tables: Record<string, { isRLSEnabled: boolean }>;
    };
    const prev = JSON.parse(
      readFileSync(join(DRIZZLE, `meta/${PREV}_snapshot.json`), "utf8"),
    ) as { id: string };
    expect(snap.prevId).toBe(prev.id);
    expect(snap.enums["public.ai_purpose"]?.values).toEqual([...AI_PURPOSES]);
    expect(snap.enums["public.ko_help_kind"]?.values).toEqual([
      ...TALK_KO_HELP_KINDS,
    ]);
    expect(snap.tables["public.talk_ko_helps"]?.isRLSEnabled).toBe(true);
  });
});
