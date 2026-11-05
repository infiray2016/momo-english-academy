// 가르치는 수업 읽기 연결(가르치고 배우는 수업 plan 묶음 라-2 · 델타 spec 설계 1 '틀린 뒤 차례' 읽기 행 · 5 화면 표 · 9 읽기 도움, 정본 15절
// AC-3d · AC-3k · AC-22c). 입력은 정규 시드 셋의 승인 수업(seed/lessons/reading/3/1.json) 그대로다. 조각을 renderToStaticMarkup 으로 그려
// 단계(initial 시도로 되살림)마다 보이는 것을 본다(효과 · 누름은 돌지 않음 — 누름 흐름은 e2e teach.spec.ts).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/session", () => ({}));
vi.mock("@/server/actions/teacher", () => ({}));
vi.mock("@/server/actions/conversation", () => ({}));

import type { PictureLookup } from "@/components/activities/common";
import {
  QuestionActivity,
  type QuestionInput,
  type QuestionTeach,
  READING_TEXT,
  ReadingTogetherChoices,
  teachQuestionStageOf,
} from "@/components/session/reading";
import { TEACH_TEXT } from "@/components/session/teach/teacher-line";
import { LessonFileSchema, type LessonOf } from "@/core/seed/schema/lesson";

const lesson = (() => {
  const file = LessonFileSchema.parse(
    JSON.parse(
      readFileSync(
        join(process.cwd(), "seed", "lessons", "reading", "3", "1.json"),
        "utf8",
      ),
    ),
  );
  return file.lessons[0] as LessonOf["reading"];
})();
const question = lesson.content.questions[0];
if (!question?.spare || !question.whyKo || !question.retryHighlight)
  throw new Error("승인 수업 문항 꼴이 바뀌었다");
const spare = question.spare;
const retryHighlight = question.retryHighlight;
const right = question.answerNo;
const wrong = (right % 4) + 1;
const wrong2 = (wrong % 4) + 1 === right ? (right % 4) + 2 : (wrong % 4) + 1;

const pictures: PictureLookup = {
  ofWord: (word) => ({ meaningKo: word, catalogued: false }),
  ofKey: (key) => ({ meaningKo: key, catalogued: false }),
};
const teachOf = (mode: "solo" | "spare"): QuestionTeach => ({
  mode,
  teacher: null,
  speechSettings: {
    skipNoticeMs: 1500,
    speakCharsPerSecondKo: 5,
    rateKo: 1,
  },
  aidNow: () => undefined,
  onReadAloud: () => {},
});
const html = (
  initial: QuestionInput | undefined,
  teach: QuestionTeach | undefined,
  q = question,
  passage = lesson.content.passage,
) =>
  renderToStaticMarkup(
    createElement(QuestionActivity, {
      question: q,
      passage,
      pictures,
      speech: undefined,
      ...(initial ? { initial } : {}),
      onChange: () => {},
      onDone: () => {},
      ...(teach ? { teach } : {}),
    }),
  );

describe("가르치는 수업 읽기 문항(AC-3k · AC-3d)", () => {
  it("AC-3k 3단계 읽기 문제 화면은 지문을 두 방향 모두 늘 함께 보이고('지문 보기' 단추 없음), 문항 위에 이름표가 있다", () => {
    const out = html(undefined, teachOf("solo"));
    expect(out).toContain("data-passage-always");
    // 세로 화면에서 숨기지 않는다(hidden 은 가르치는 수업이 아닐 때만)
    expect(out).not.toMatch(/data-passage-pane=""[^>]*class="[^"]*\bhidden\b/);
    expect(out).toContain(lesson.content.passage.slice(0, 20));
    expect(out).not.toContain("data-show-passage");
    expect(out).toContain('data-ask-role="who"');
    expect(out).toContain("누가");
    expect(out).toContain(question.prompt);
    // 이름표가 빈칸 문장보다 앞(문항 위)
    expect(out.indexOf("data-ask-role")).toBeLessThan(
      out.indexOf(question.prompt),
    );
  });

  it("AC-3d 처음 틀리면 같은 문항 위에 '왜' 한 줄(시드 whyKo)과 '한 번 더 풀기'가 나오고, 정답 · 해설 칸은 아직 없다", () => {
    const out = html({ tries: [wrong] }, teachOf("solo"));
    expect(out).toContain('data-teach-stage="why"');
    expect(out).toContain("data-teach-why");
    expect(out).toContain(question.whyKo);
    expect(out).toContain(TEACH_TEXT.retry.solve);
    expect(out).not.toContain(READING_TEXT.answerIs);
    expect(out).not.toContain('data-choice-state="answer"');
    expect(out).not.toContain("data-explanation");
    // 초상은 '왜' 와 함께만(선생님 줄)
    expect(out).toContain("data-teacher-line");
  });

  it("AC-3d 같은 문제 다시에서 지문의 답 문장(retryHighlight)에 띠가 쳐진다", () => {
    const out = html({ tries: [wrong], retrying: true }, teachOf("solo"));
    expect(out).toContain('data-teach-stage="ask"');
    expect(out).toContain("data-retry-highlight");
    expect(out).toMatch(
      new RegExp(
        `<mark[^>]*data-highlight=""[^>]*>${retryHighlight.replace(".", "\\.")}</mark>`,
      ),
    );
    expect(out).not.toContain("data-teach-why");
    // 처음 고르기 전에는 띠가 없다
    expect(html(undefined, teachOf("solo"))).not.toContain("data-highlight");
  });

  it("AC-3d 둘째도 틀리면 지금처럼 '정답은 이거예요'와 정답 표시, 맞으면 '맞았어요!'만(해설 칸 없음)", () => {
    const reveal = html({ tries: [wrong, wrong2] }, teachOf("solo"));
    expect(reveal).toContain('data-teach-stage="reveal"');
    expect(reveal).toContain(READING_TEXT.answerIs);
    expect(reveal).toContain('data-choice-state="answer"');
    expect(reveal).not.toContain("data-explanation");
    const ok = html({ tries: [right] }, teachOf("solo"));
    expect(ok).toContain(READING_TEXT.right);
    expect(ok).not.toContain("data-explanation");
    expect(ok).not.toContain("data-teach-why");
    // 다시 맞혀도 '맞았어요!'
    const retried = html({ tries: [wrong, right] }, teachOf("solo"));
    expect(retried).toContain(READING_TEXT.right);
  });

  it("AC-22c 짝은 짝 글과 빈칸 문장 · 이름표를 보이고, 처음 맞으면 '혼자 해냈어요!', 틀리면 바른 답과 짝의 '왜'만(다시 없음)", () => {
    const ask = html(undefined, teachOf("spare"), spare, spare.textEn);
    expect(ask).toContain(spare.textEn);
    expect(ask).toContain('data-ask-role="who"');
    // 짝에는 띠가 없다
    expect(ask).not.toContain("data-highlight");
    const ok = html(
      { tries: [spare.answerNo] },
      teachOf("spare"),
      spare,
      spare.textEn,
    );
    expect(ok).toContain(TEACH_TEXT.spareRight);
    expect(ok).not.toContain(READING_TEXT.right);
    const miss = html(
      { tries: [(spare.answerNo % 4) + 1] },
      teachOf("spare"),
      spare,
      spare.textEn,
    );
    expect(miss).toContain('data-teach-stage="spare-wrong"');
    expect(miss).toContain(spare.whyKo ?? "");
    expect(miss).toContain('data-choice-state="answer"');
    expect(miss).not.toContain(TEACH_TEXT.retry.solve);
    expect(miss).not.toContain('data-teach-action="retry"');
    expect(miss).toContain(READING_TEXT.next);
  });

  it("AC-3d 짝도 틀린 '왜' 화면의 '다음'은 선생님이 줄을 읽기 전에는 흐리고(설계 5), 짝을 맞힌 화면의 '다음'은 바로 밝다", () => {
    const miss = html(
      { tries: [(spare.answerNo % 4) + 1] },
      teachOf("spare"),
      spare,
      spare.textEn,
    );
    expect(miss).toMatch(/<button[^>]*data-teach-next=""[^>]*disabled=""/);
    expect(miss).toContain("data-teach-why");
    const ok = html(
      { tries: [spare.answerNo] },
      teachOf("spare"),
      spare,
      spare.textEn,
    );
    const next = ok.match(/<button[^>]*>다음<\/button>/)?.[0] ?? "";
    expect(next).not.toBe("");
    expect(next).not.toContain('disabled=""');
    // 혼자 문항 둘째 틀림(정답 보기)의 '다음'도 흐리지 않는다
    const reveal = html({ tries: [wrong, wrong2] }, teachOf("solo"));
    expect(reveal.match(/<button[^>]*>다음<\/button>/)?.[0]).not.toContain(
      'disabled=""',
    );
  });

  it("AC-3d teach 없는 수업은 지금 차례 그대로다('지문 보기' · 해설 칸 · '한 번 더 풀기')", () => {
    const out = html({ tries: [wrong] }, undefined);
    expect(out).toContain("data-show-passage");
    expect(out).toContain("data-explanation");
    expect(out).toContain(READING_TEXT.tryAgain);
    expect(out).not.toContain("data-teach-why");
    expect(out).not.toContain("data-passage-always");
  });

  it("AC-3d 단계 함수: 혼자 문항은 묻기 → 왜 → 다시 묻기 → 맞음 · 정답 보기, 짝은 첫 고름 하나로 끝", () => {
    expect(teachQuestionStageOf("solo", [], 2, false)).toBe("ask");
    expect(teachQuestionStageOf("solo", [1], 2, false)).toBe("why");
    expect(teachQuestionStageOf("solo", [1], 2, true)).toBe("ask");
    expect(teachQuestionStageOf("solo", [1, 2], 2, false)).toBe("right");
    expect(teachQuestionStageOf("solo", [1, 3], 2, false)).toBe("reveal");
    expect(teachQuestionStageOf("solo", [2], 2, false)).toBe("right");
    expect(teachQuestionStageOf("spare", [2], 2, false)).toBe("spare-right");
    expect(teachQuestionStageOf("spare", [1], 2, false)).toBe("spare-wrong");
  });
});

describe("같이 해 보기 읽기 보기(R6 · R7)", () => {
  it("AC-3d 보기 둘을 그리고 고른 오답은 ✕ 로 남아 다시 고를 수 없으며 고른 정답은 표시된다", () => {
    const together = lesson.teach?.together[0];
    if (!together) throw new Error("같이 해 보기 없음");
    const out = renderToStaticMarkup(
      createElement(ReadingTogetherChoices, {
        choices: together.choices,
        marks: { 2: "wrong", 1: "right" },
        disabled: false,
        onPick: () => {},
      }),
    );
    expect(out.match(/data-answer-choice=/g)).toHaveLength(
      together.choices.length,
    );
    expect(out).toContain('data-choice-state="picked-wrong"');
    expect(out).toContain('data-choice-state="picked-right"');
    for (const choice of together.choices) expect(out).toContain(choice);
  });
});
