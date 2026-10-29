// 가짜 풀이 함수(plan-p05a 'fake-solver.ts'). 시드 정답대로 풀거나, 지정한 칸 · 문항을 다르게 · 둘 이상 · 없음 · 후보 더함 · 거절 ·
// 규격 깨짐 · max_tokens · 번호 어긋남 · API 오류로 돌려준다. 네트워크를 쓰지 않는다. P5a · P5c 시험이 같이 쓴다.
import {
  type SolveMessage,
  type SolveOutput,
  type SolveRequest,
  type Solver,
  type SolveUsage,
  seedAnswerOf,
} from "@/core/seed/solve-check";
import { collectCells, type SeedCell } from "@/core/seed/validate";

/** 가짜 응답의 토큰(견본 값). 캐시 토큰을 넣어 입력 토큰 셈(입력 + 캐시 쓰기 + 캐시 읽기)을 시험한다. */
export const FAKE_USAGE: SolveUsage = {
  input_tokens: 900,
  output_tokens: 60,
  cache_creation_input_tokens: 40,
  cache_read_input_tokens: 20,
};
/** 다르게 풀 때 쓰는 글 답(어느 시드 허용 정답과도 같지 않다). */
export const FAKE_WRONG_TEXT = "zzz wrong answer";

export type FakeBehavior =
  /** 문항 하나(no 가 없으면 모두)를 앱 정답과 다르게 푼다. */
  | { kind: "different"; no?: number }
  | { kind: "multiple"; no?: number }
  | { kind: "none"; no?: number }
  /** 조립 · 받아쓰기 문항에 허용 정답 후보를 더한다. */
  | { kind: "alternatives"; no: number; alternatives: string[] }
  | { kind: "refusal" }
  /** 응답 JSON 이 규격에 맞지 않는다. */
  | { kind: "broken" }
  | { kind: "max_tokens" }
  /** 응답에서 첫 문항을 뺀다(번호 어긋남). */
  | { kind: "missing-item" }
  /** SDK 예외. message 에 아무 글이나 넣어 출력 가리기를 시험한다. */
  | { kind: "api-error"; status?: number; message?: string };

/** 시드 정답대로 푼 응답(behavior 가 있으면 그대로 바꾼다). */
export function answerOutput(
  cell: SeedCell,
  request: SolveRequest,
  behavior?: FakeBehavior,
): SolveOutput {
  const perItem = new Set(["different", "multiple", "none", "alternatives"]);
  const hits = (no: number) => {
    if (!behavior || !perItem.has(behavior.kind)) return false;
    const only = "no" in behavior ? behavior.no : undefined;
    return only === undefined || only === no;
  };
  const items = request.items.map((view) => {
    const seed = seedAnswerOf(cell, view.no);
    const base = {
      no: view.no,
      status: "one" as const,
      choice: null as number | null,
      text: null as string | null,
      alternatives: [] as string[],
    };
    if (view.answer === "choice") base.choice = seed.answerNo ?? null;
    else base.text = seed.accepted?.[0] ?? null;
    if (!hits(view.no)) return base;
    switch (behavior?.kind) {
      case "different":
        return view.answer === "choice"
          ? {
              ...base,
              choice: ((seed.answerNo ?? 0) % view.options.length) + 1,
            }
          : { ...base, text: FAKE_WRONG_TEXT };
      case "multiple":
        return { ...base, status: "multiple" as const };
      case "none":
        return {
          ...base,
          status: "none" as const,
          choice: null,
          text: null,
        };
      case "alternatives":
        return { ...base, alternatives: [...behavior.alternatives] };
      default:
        return base;
    }
  });
  return { items };
}

/** SDK 응답 꼴 하나(필요한 칸만). output 이 글이면 그대로 text 블록에 넣는다. */
export function solveMessage(
  output: SolveOutput | string | null,
  options: { model: string; stopReason?: string; usage?: SolveUsage },
): SolveMessage {
  return {
    model: options.model,
    stop_reason: options.stopReason ?? "end_turn",
    content:
      output === null
        ? []
        : [
            {
              type: "text",
              text:
                typeof output === "string" ? output : JSON.stringify(output),
            },
          ],
    usage: options.usage ?? FAKE_USAGE,
  };
}

export type FakeSolver = Solver & {
  /** 받은 요청(차례대로). */
  calls: SolveRequest[];
  /** 칸 키 → 동작. 시험이 돌리는 사이에 지우거나 바꿀 수 있다. */
  behaviors: Map<string, FakeBehavior>;
};

/**
 * 파일 묶음(seed/ 뿌리 기준 경로 → 글)의 칸 정답으로 푸는 가짜 풀이 함수. 요청에는 정답이 없으므로(위험 1) 칸 키로 시드 칸을 찾는다.
 */
export function fakeSolver(
  files: ReadonlyMap<string, string>,
  options: { model: string; behaviors?: Record<string, FakeBehavior> },
): FakeSolver {
  const cells = new Map(collectCells(files).cells.map((c) => [c.key, c]));
  const calls: SolveRequest[] = [];
  const behaviors = new Map(Object.entries(options.behaviors ?? {}));
  const solver = async (request: SolveRequest): Promise<SolveMessage> => {
    calls.push(request);
    const cell = cells.get(request.cell);
    if (!cell) throw new Error(`가짜 풀이: 칸이 없다 ${request.cell}`);
    const behavior = behaviors.get(request.cell);
    const model = { model: options.model };
    switch (behavior?.kind) {
      case "api-error":
        throw Object.assign(
          new Error(behavior.message ?? "가짜 API 오류"),
          behavior.status === undefined ? {} : { status: behavior.status },
        );
      case "refusal":
        return solveMessage(null, { ...model, stopReason: "refusal" });
      case "max_tokens":
        return solveMessage('{"items": [', {
          ...model,
          stopReason: "max_tokens",
        });
      case "broken":
        return solveMessage('{"items": "none"}', model);
      case "missing-item": {
        const output = answerOutput(cell, request);
        return solveMessage({ items: output.items.slice(1) }, model);
      }
      default:
        return solveMessage(answerOutput(cell, request, behavior), model);
    }
  };
  return Object.assign(solver, { calls, behaviors });
}
