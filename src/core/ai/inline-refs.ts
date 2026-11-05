// 구조화 출력 응답 규격의 $defs · $ref 풀기(대본 3회차 400 'The compiled grammar is too large', 2026-11-06 탐침). SDK 도우미(zodOutputFormat)는
// z.toJSONSchema(…, { reused: 'ref' }) 로 칸마다 $defs 항목을 만들고 $ref 로 가리키는데, 회화 턴 규격(칸 서른)은 이 꼴에서 API 의 문법 컴파일
// 한도를 넘는다. 같은 규격을 $ref 없이 펼쳐 보내면 받는다(탐침: 펼친 꼴 5785자 OK, $ref 꼴 7667자 · 설명 뺀 $ref 꼴 3868자 모두 400).
// 순수 모듈이다(SDK · 시각 · DB 없음). 순환 참조 규격은 받지 않는다(회화 규격에는 없다).

/** 펼칠 수 있는 가장 깊은 참조 깊이(순환을 막는 기술 값 — 회화 규격은 2단). */
const MAX_REF_DEPTH = 16;
const LOCAL_DEF = "#/$defs/";

type Json = unknown;

/** JSON 스키마의 '#/$defs/<이름>' 참조를 그 정의로 바꾸고 맨 위 $defs 를 뺀다. 모르는 참조 · 너무 깊은 참조(순환)는 던진다. */
export function inlineJsonSchemaRefs(
  schema: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const defs = (schema.$defs ?? {}) as Readonly<Record<string, Json>>;
  const walk = (node: Json, depth: number): Json => {
    if (depth > MAX_REF_DEPTH)
      throw new RangeError("응답 규격 참조가 너무 깊다(순환 참조)");
    if (Array.isArray(node)) return node.map((n) => walk(n, depth));
    if (node === null || typeof node !== "object") return node;
    const obj = node as Record<string, Json>;
    const ref = obj.$ref;
    if (typeof ref === "string") {
      if (!ref.startsWith(LOCAL_DEF))
        throw new RangeError(`모르는 응답 규격 참조: ${ref}`);
      const target = defs[ref.slice(LOCAL_DEF.length)];
      if (target === undefined)
        throw new RangeError(`없는 응답 규격 정의: ${ref}`);
      const { $ref: _ref, ...rest } = obj;
      return {
        ...(walk(target, depth + 1) as object),
        ...(walk(rest, depth) as object),
      };
    }
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([key]) => key !== "$defs")
        .map(([key, value]) => [key, walk(value, depth)]),
    );
  };
  return walk(schema, 0) as Record<string, unknown>;
}

/** 규격에 남은 참조가 있는가(시험 · 보내기 전 확인). */
export function hasJsonSchemaRefs(schema: unknown): boolean {
  return /"\$(ref|defs)"/.test(JSON.stringify(schema));
}
