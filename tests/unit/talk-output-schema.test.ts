// 회화 턴 보낼 응답 규격의 꼴과 크기(대본 3회차 400 'The compiled grammar is too large', 2026-11-06). SDK 도우미의 $defs · $ref 꼴은 API 문법 한도를
// 넘어 펼쳐 보낸다. 보낼 꼴은 검증 규격(Zod wireSchema)과 칸 · 필수 칸이 같고(보낼 꼴 ⊆ 검증 규격), 검증은 그대로 엄격하다(열거값 등).
// 크기 울타리는 탐침으로 받은 크기다. 실제 API 를 부르지 않는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { talkLessonTurnSpec } from "@/core/ai/calls/talk-lesson";
import { hasJsonSchemaRefs, inlineJsonSchemaRefs } from "@/core/ai/inline-refs";
import {
  TALK_OUTPUT_SCHEMA_MAX_CHARS,
  TALK_OUTPUT_SCHEMA_MAX_PROPS,
  talkOutputFormatOf,
} from "@/server/ai/talk";
import { lessonInput, lessonRules } from "../fixtures/ai/talk-lesson-inputs";

const LEVELS = [3, 4, 5, 10];

/** 엄격 규격을 지나는 견본 응답(계약 표본 talk_turn.v2-l3-ai 의 글). */
function sampleAnswer(): Record<string, unknown> {
  const raw = JSON.parse(
    readFileSync(
      join(process.cwd(), "tests/fixtures/ai/samples/talk_turn.v2-l3-ai.json"),
      "utf8",
    ),
  ) as { response: { body: { content: { type: string; text?: string }[] } } };
  return JSON.parse(
    raw.response.body.content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join(""),
  ) as Record<string, unknown>;
}

describe("$defs · $ref 펼치기(core/ai/inline-refs)", () => {
  it("참조를 정의로 바꾸고 맨 위 $defs 를 빼며, 겹친 참조도 펼친다", () => {
    const schema = {
      $defs: {
        a: { type: "string", description: "A" },
        b: { type: "array", items: { $ref: "#/$defs/a" } },
      },
      type: "object",
      properties: { x: { $ref: "#/$defs/a" }, y: { $ref: "#/$defs/b" } },
      required: ["x", "y"],
    };
    expect(inlineJsonSchemaRefs(schema)).toEqual({
      type: "object",
      properties: {
        x: { type: "string", description: "A" },
        y: { type: "array", items: { type: "string", description: "A" } },
      },
      required: ["x", "y"],
    });
  });

  it("없는 정의 · 바깥 참조 · 순환 참조는 던진다", () => {
    expect(() =>
      inlineJsonSchemaRefs({ properties: { x: { $ref: "#/$defs/none" } } }),
    ).toThrow(RangeError);
    expect(() =>
      inlineJsonSchemaRefs({ properties: { x: { $ref: "http://x" } } }),
    ).toThrow(RangeError);
    expect(() =>
      inlineJsonSchemaRefs({
        $defs: { a: { items: { $ref: "#/$defs/a" } } },
        properties: { x: { $ref: "#/$defs/a" } },
      }),
    ).toThrow(RangeError);
  });
});

describe("회화 턴 보낼 규격(talkOutputFormatOf)", () => {
  for (const level of LEVELS) {
    const input = lessonInput(level);
    const wire = talkLessonTurnSpec.wireSchema(input, lessonRules(level));
    const format = talkOutputFormatOf(wire);
    const schema = format.schema as {
      properties: Record<string, unknown>;
      required: string[];
    };

    it(`${level}단계: $ref · $defs 가 없고 탐침으로 받은 크기 · 칸 수 안이다`, () => {
      expect(format.type).toBe("json_schema");
      expect(hasJsonSchemaRefs(schema)).toBe(false);
      expect(JSON.stringify(schema).length).toBeLessThanOrEqual(
        TALK_OUTPUT_SCHEMA_MAX_CHARS,
      );
      expect(Object.keys(schema.properties).length).toBeLessThanOrEqual(
        TALK_OUTPUT_SCHEMA_MAX_PROPS,
      );
    });

    it(`${level}단계: 보낼 꼴의 칸 · 필수 칸 · 차례가 검증 규격(Zod)과 같고, 검증은 그대로 엄격하다(갈래 열거값 밖은 걸림)`, () => {
      const zodKeys = Object.keys(
        (z.toJSONSchema(wire) as { properties: Record<string, unknown> })
          .properties,
      );
      expect(Object.keys(schema.properties)).toEqual(zodKeys);
      expect(schema.required).toEqual(zodKeys);
      // 보낼 꼴은 갈래를 글로 받고(열거값은 설명 글로 옮겨짐) 검증 규격은 열거값으로 좁힌다
      expect((schema.properties.child_kind as { type?: string }).type).toBe(
        "string",
      );
      const good = sampleAnswer();
      expect(wire.safeParse(good).success).toBe(true);
      expect(wire.safeParse({ ...good, child_kind: "maybe" }).success).toBe(
        false,
      );
      expect(wire.safeParse({ ...good, next_move: "jump" }).success).toBe(
        false,
      );
    });
  }
});
