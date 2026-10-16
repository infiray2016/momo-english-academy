// 호출 규격 꼴 · 단계 맥락 · 공통 고정부 · 응답 글 꺼내기 · 다듬기 · 한 줄 · 한 문장 · 안전한 대사
// (6.1 · 6.2 · 6.4 끝 문단 · C63 (4), plan-p09b 파일별 값 4). 순수 모듈이다(시각 · DB · SDK 없음).
import type { z } from "zod";
import type { AiPurpose } from "@/core/ai/combo";
import type { Masker } from "@/core/ai/mask";
import type { CheckField, FieldHit } from "@/core/ai/output-check";
import { splitSentences } from "@/core/seed/text";

/** 걸린 칭찬 · 피드백 칸을 바꾸는 안전한 대사(6.4 의 예 그대로, C63 (4)). */
export const SAFE_LINE_KO = "좋아요, 다음으로 가 볼까요?";

/** 프롬프트 가변부 재료. P11 이 level_specs(can_do · sentenceMaxWords) · unit_specs(학습 요소 · 목표 어휘)에서 채운다. */
export type LevelContext = {
  level: number;
  canDo: string;
  learningElement: string;
  prevLearningElements: string[];
  unitWords: string[];
  sentenceMaxWords: number;
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type SettingValues = Readonly<Record<string, unknown>>;

/** 호출 설정값이 없거나 그 단계 값이 없을 때(P9c 가 '설정 문제'로 처리). */
export class CallSettingError extends Error {
  constructor(
    readonly key: string,
    detail: string,
  ) {
    super(`설정 ${key}: ${detail}`);
    this.name = "CallSettingError";
  }
}

export type ApplyChecksResult<O> = {
  value: O;
  /** 어느 칸이든 걸렸다(그 시도는 ai_calls '검증 실패', 6.4 · C63 (4)). */
  changed: boolean;
  /** 그 턴을 실패로 본다(생각 꺼내기 질문이 걸림, 8절). */
  fatal: boolean;
};

/**
 * 호출 규격 하나 = 입력 형 · 프롬프트 · 엄격 · 느슨한 응답 규격 · 다듬기 · 검증 · 정규화 · 출력 검사 · 걸린 칸 바꾸기.
 * title 은 응답 규격의 루트 제목이고 가짜 클라이언트가 목적을 알아보는 표시다.
 * 엄격 규격은 입력 · 규칙에 따라 개수가 달라 함수다(규격 설명 글에 숫자가 들어간다).
 * normalize 가 null 이면 필수 칸이 없다는 뜻이다(6.1 → '호출 하나의 실패').
 */
export type CallSpec<I, O, R> = {
  purpose: AiPurpose;
  title: string;
  wireSchema(input: I, rules: R): z.ZodType<O>;
  looseSchema: z.ZodType;
  multiTurn: boolean;
  /** 소문자로 다듬을 열거값 칸(점으로 이은 자리). */
  enumPaths: readonly string[];
  /** 이 규격이 읽는 설정 키의 규격(ai.* 밖). */
  settingSchemas: Readonly<Record<string, z.ZodType>>;
  rulesOf(values: SettingValues, input: I): R;
  mask(input: I, masker: Masker): I;
  system(input: I, rules: R): string;
  messages(input: I, rules: R): ChatMessage[];
  validate(value: O, input: I, rules: R): string[];
  normalize(loose: unknown, input: I, rules: R): O | null;
  checkFields(value: O): CheckField[];
  applyChecks(
    value: O,
    hits: ReadonlyMap<string, readonly FieldHit[]>,
    input: I,
  ): ApplyChecksResult<O>;
  historyEntry?(value: O): string;
};

/**
 * 고정부 공통 규칙(6.1 고정부, 정할 것 라 · 사). 지시는 영어로, 아이에게 보이는 글의 언어 · 말투는 칸마다 밝힌다.
 */
export const COMMON_FIXED_RULES: readonly string[] = [
  "The learner is a Korean child from 4th grade of elementary school to middle school, studying English alone at home.",
  "Use only content suitable for children.",
  "Write every explanation, praise, reason and feedback in Korean, in the polite 해요체 style (e.g. '대문자와 마침표를 빠짐없이 썼어요.'), short and warm.",
  "Never ask for a name, school, address, phone number, photo, or to meet. If the child writes personal information, do not ask about it and move on.",
  "Keep the placeholder {NAME} exactly as it is.",
  "Do not scold the child for mistakes.",
  "Fill only the given JSON fields.",
  "Do not write your reasoning or thinking process in any answer field.",
];

// ── 응답 글 ──────────────────────────────────────────────────────

export type ContentBlockText = { type: string; text?: string };

/**
 * 응답 내용에서 마지막 fallback 블록 뒤의 text 블록을 이어 붙인 글.
 * 비스트리밍은 거절된 부분 출력이 빠지고 대체 모델이 처음부터 답한다(P9a 확인한 사실 2).
 */
export function answerTextOf(message: {
  content: readonly ContentBlockText[];
}): string {
  let start = 0;
  message.content.forEach((block, index) => {
    if (block.type === "fallback") start = index + 1;
  });
  return message.content
    .slice(start)
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");
}

function trimDeep(value: unknown): unknown {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(trimDeep);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, trimDeep(v)]),
    );
  }
  return value;
}

function lowerAt(value: unknown, path: readonly string[]): unknown {
  if (path.length === 0) {
    return typeof value === "string" ? value.toLowerCase() : value;
  }
  const [head, ...rest] = path;
  if (head === "*" && Array.isArray(value)) {
    return value.map((item) => lowerAt(item, rest));
  }
  if (
    head !== undefined &&
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    head in value
  ) {
    return {
      ...value,
      [head]: lowerAt((value as Record<string, unknown>)[head], rest),
    };
  }
  return value;
}

/**
 * 엄격 검증 앞 다듬기: 모든 글 칸의 앞뒤 공백을 지우고 enumPaths 칸을 소문자로(열거값이 설명 글로만 가서
 * 대소문자가 바뀔 수 있다, P9a 확인한 사실 7 · 8). 자리는 점으로 잇고 배열 항목은 `*`.
 */
export function prepareAnswer(
  json: unknown,
  enumPaths: readonly string[],
): unknown {
  let value = trimDeep(json);
  for (const path of enumPaths) value = lowerAt(value, path.split("."));
  return value;
}

/** 첫 줄(빈 줄은 건너뜀). 6.2 가 '한 줄'이라 적은 한국어 칸(C63 (4)). */
export function firstLine(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line !== "") ?? ""
  );
}

/** 한글 음절. */
const HANGUL = /[\uAC00-\uD7A3]/;

/**
 * 첫 문장. 6.2 가 '한 문장'이라 적은 한국어 칸(C63 (4)). 영어 문장 자르기(splitSentences) 조각 가운데
 * 처음으로 한글이 든 조각까지를 공백으로 잇는다 — 따옴표 속 영어 인용('I like apples.' 라고 …)에서 잘려
 * 한국어가 사라지지 않게(검토 I-1). 한글이 없으면 첫 조각.
 */
export function firstSentence(text: string): string {
  const pieces = splitSentences(firstLine(text));
  const korean = pieces.findIndex((piece) => HANGUL.test(piece));
  return pieces.slice(0, korean < 0 ? 1 : korean + 1).join(" ");
}

/** 단계 맥락의 가변부 항목(차례 고정). */
export function levelVariable(
  ctx: LevelContext,
): readonly (readonly [string, string])[] {
  return [
    ["Level", String(ctx.level)],
    ["Can-do", ctx.canDo],
    ["Learning element of this unit", ctx.learningElement],
    [
      "Learning elements of earlier units",
      ctx.prevLearningElements.join("; ") || "(none)",
    ],
    ["Unit words", ctx.unitWords.join(", ")],
    ["Maximum words per English sentence", String(ctx.sentenceMaxWords)],
  ];
}

/** 고정부 규칙 목록 뒤에 가변부(이름표 · 값)를 정해진 차례로 이은 글. 같은 입력이면 같은 글(캐시가 깨지지 않게). */
export function buildSystem({
  fixed,
  variable,
}: {
  fixed: readonly string[];
  variable: readonly (readonly [string, string])[];
}): string {
  const rules = fixed.map((rule) => `- ${rule}`).join("\n");
  const context = variable
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
  return `Rules:\n${rules}\n\nContext:\n${context}`;
}

/** 걸린 자리: 그 칸이거나 그 칸 아래(`fixes.0` → `fixes.0.reason`). */
export function hitUnder(
  hits: ReadonlyMap<string, readonly FieldHit[]>,
  path: string,
): boolean {
  for (const key of hits.keys()) {
    if (key === path || key.startsWith(`${path}.`)) return true;
  }
  return false;
}

/** 점수를 반올림해 범위 안으로 자른다(6.1 '범위 밖 점수는 범위 안으로'). */
export function clampScore(
  value: number,
  range: { readonly min: number; readonly max: number },
): number {
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}
