// e2e 가짜 AI 조종(plan-p11b 파일별 값 8 · 위험 7 · 13절 C81). playwright.config 가 띄운 가짜 Anthropic 서버(fake-ai-server.ts)의
// /__fake/{reset,rules,requests} 를 부른다. workers 1 이라 서버 하나를 시험마다 비우고 규칙을 넣는다 — AI 를 쓰는 e2e 파일은
// test.beforeEach(resetFakeAi) 로 시작하고 뒤 파일에 규칙이 남지 않게 afterEach 에서도 비운다.
// 응답은 P9a messageBody 꼴이고 내용은 시험의 수업 내용(문장 수)에 맞춰 시험 안에서 만든다 — 견본 JSON 이 수업과 안 맞으면
// 정규화가 실패 길로 간다(위험 7). 모델은 TEST_SETTINGS 의 ai.model.<목적>.
import { E2E_AI_PORT } from "../../playwright.config";
import {
  type FakeReply,
  type FakeRequest,
  type FakeRule,
  messageBody,
} from "../fixtures/ai/fake-anthropic";
import { TEST_SETTINGS } from "../fixtures/settings";

const FAKE_AI_URL = `http://127.0.0.1:${E2E_AI_PORT}`;

async function call(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${FAKE_AI_URL}${path}`, init);
  if (!res.ok) throw new Error(`가짜 AI ${path} 실패(${res.status})`);
  return res;
}

/** 규칙과 받은 요청을 모두 지운다. */
export async function resetFakeAi(): Promise<void> {
  await call("/__fake/reset", { method: "POST", body: "{}" });
}

/** 규칙을 뒤에 더한다(앞 규칙이 먼저 맞는다). */
export async function pushFakeAi(rules: readonly FakeRule[]): Promise<void> {
  await call("/__fake/rules", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rules }),
  });
}

/** 가짜가 받은 Messages 요청(차례대로). */
export async function fakeAiRequests(): Promise<FakeRequest[]> {
  return (await (await call("/__fake/requests")).json()) as FakeRequest[];
}

/** 받은 요청 가운데 그 목적(응답 규격 제목)의 것. */
export async function fakeAiRequestsOf(
  purpose: string,
): Promise<FakeRequest[]> {
  return (await fakeAiRequests()).filter(
    (r) =>
      (
        r.body as {
          output_config?: { format?: { schema?: { title?: unknown } } };
        } | null
      )?.output_config?.format?.schema?.title === purpose,
  );
}

export type WritingCheckFix = {
  sentenceIndex: number;
  original: string;
  corrected: string;
  distractors: string[];
};

/** 칭찬 한 줄(시험 고정 글 — 금지어 목록에 걸리지 않는 해요체). */
export const FAKE_PRAISE = "단어 상자의 낱말을 알맞게 골라 문장을 완성했어요.";
/** 고칠 곳 이유(6.2 규격의 칸 — 바르게 고친 뒤에만 보인다, 13절 C86). */
export const FAKE_REASON = "이 자리에는 다른 낱말이 알맞아요.";

/** 쓰기 확인(4~5단계) 응답 — 문장마다 맞음 · 틀림, 고칠 곳은 많아야 하나(6.2). */
export function writingCheckReply({
  correct,
  fix,
  delayMs,
}: {
  correct: readonly boolean[];
  fix?: WritingCheckFix;
  delayMs?: number;
}): FakeReply {
  return {
    kind: "message",
    body: messageBody({
      model: TEST_SETTINGS["ai.model.writing_check"].value,
      json: {
        praise: FAKE_PRAISE,
        sentences: correct.map((ok, index) => ({ index, correct: ok })),
        fixes: fix ? [{ ...fix, reason: FAKE_REASON }] : [],
      },
    }),
    ...(delayMs === undefined ? {} : { delayMs }),
  };
}

/** 목적 하나에만 맞는 규칙. */
export function ruleFor(
  purpose: string,
  reply: FakeReply,
  times?: number,
): FakeRule {
  return {
    when: { purpose },
    reply,
    ...(times === undefined ? {} : { times }),
  };
}

/** 생각 꺼내기 질문(시험 고정 글 — 한국어 해요체 · 보기 셋). */
export const FAKE_THINKOUT = {
  question: "무엇을 쓰고 싶어요?",
  options: ["강아지", "공원", "학교"],
  summary: "강아지와 공원에서 노는 하루를 쓰고 싶어요.",
  starters: ["I have", "Every day"],
} as const;

/** 생각 꺼내기 한 턴 응답 — 끝이 아니면 질문 · 보기 셋, 끝이면 요약 · 낱말(4개 — 규격 하한) · 시작 틀 둘. */
export function thinkoutReply({
  done,
  words = ["dog", "park", "play", "day"],
  delayMs,
}: {
  done: boolean;
  words?: readonly string[];
  delayMs?: number;
}): FakeReply {
  return {
    kind: "message",
    body: messageBody({
      model: TEST_SETTINGS["ai.model.thinkout"].value,
      json: done
        ? {
            question: "",
            options: [],
            done: true,
            summary: FAKE_THINKOUT.summary,
            words: [...words],
            starters: [...FAKE_THINKOUT.starters],
          }
        : {
            question: FAKE_THINKOUT.question,
            options: [...FAKE_THINKOUT.options],
            done: false,
            summary: "",
            words: [],
            starters: [],
          },
    }),
    ...(delayMs === undefined ? {} : { delayMs }),
  };
}

/** 첨삭 응답(교정 하나 · 모범 답안 · 채점표). */
export function feedbackReply({
  rubric = { task: 4, grammar: 3, vocabulary: 3 },
  delayMs,
}: {
  rubric?: { task: number; grammar: number; vocabulary: number };
  delayMs?: number;
} = {}): FakeReply {
  return {
    kind: "message",
    body: messageBody({
      model: TEST_SETTINGS["ai.model.writing_feedback"].value,
      json: {
        praise: "하루 일을 차례대로 잘 썼어요.",
        corrections: [
          {
            original: "I love it.",
            corrected: "I love my dog.",
            reason: "무엇을 좋아하는지 분명히 써요.",
          },
        ],
        modelAnswer: "I have a small dog. We play in the park every day.",
        rubric,
      },
    }),
    ...(delayMs === undefined ? {} : { delayMs }),
  };
}
