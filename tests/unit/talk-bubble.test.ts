// 토리 말풍선의 보이는 영어 · 읽어 줄 차례(plan-p13b 파일별 값 8 · 4절 회화 세션 '토리 차례' 행 · 3.3 · T2 · 검토 I-3).
// 1~3단계 아이가 말할 영어(답 예시 say · 답 두 개 answers)는 읽어 주기만 하고 말풍선 글에 넣지 않는다.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { shouldMarkNudge } from "@/components/conversation/child-turn";
import {
  perceivedWaitOf,
  SILENT_COUNT_START,
  silentCountStep,
  talkCounterLimits,
} from "@/components/conversation/talk-frame";
import {
  answersLine,
  shownEnglishOf,
  spokenOf,
  TORI_BUBBLE_MAX_PX,
  ToriBubble,
  turnPictureShown,
} from "@/components/conversation/tori";
import { twoAnswersLine } from "@/core/ai/calls/talk";
import { speakingCounters, speakingCountersStart } from "@/core/speaking/judge";

// 브라우저 전용 표시 모듈 · 쪽 길잡이 · 서버 액션은 시험(node)에서 빈 모듈로
vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));

const content = {
  sentences: ["That's okay."],
  adds: [
    {
      t: "add" as const,
      kind: "again" as const,
      say: "I see a cat.",
      en: "What do you see?",
      ko: "뭐가 보여?",
    },
    {
      t: "add" as const,
      kind: "two_answers" as const,
      answers: ["I see a cat.", "I see a dog."] as [string, string],
    },
  ],
};

describe("토리 말풍선", () => {
  it("회화 화면: 말풍선 글은 토리 말과 다시 묻는 질문만이고 답 예시 · 답 두 개는 넣지 않는다", () => {
    const shown = shownEnglishOf(content);
    expect(shown).toEqual(["That's okay.", "What do you see?"]);
    for (const line of shown) {
      expect(line).not.toContain("I see a cat.");
      expect(line).not.toContain("I see a dog.");
    }
  });

  it("회화 화면: 읽어 줄 차례는 토리 말 → 답 예시 → 같은 질문 → 'Or' 를 사이에 둔 답 두 개다", () => {
    expect(spokenOf(content)).toEqual([
      "That's okay.",
      "I see a cat.",
      "What do you see?",
      "I see a cat. Or I see a dog.",
    ]);
  });
});

describe("답 두 개 잇기", () => {
  it("회화 화면: 답 두 개를 잇는 말은 회화 턴 규격의 이음(다시 쓸 토리 차례)과 같다", () => {
    const pair: [string, string] = ["I'm nine.", "I'm ten."];
    expect(answersLine(pair)).toBe(twoAnswersLine(pair));
  });
});

describe("차례 5 fix 1 — 말풍선 렌더 · 아이 차례 · 틀 셈", () => {
  const base = {
    englishName: "Momo",
    waitSeconds: [1, 5] as const,
    onReplay: () => {},
    onAnswer: () => {},
  };

  it("회화 화면: 그림 턴 그림은 꾸밈 그림이라 대체 글이 비어 있다(검토 M-4)", () => {
    const html = renderToStaticMarkup(
      createElement(ToriBubble, {
        ...base,
        content: { sentences: ["Look!"], adds: [], done: true },
        waiting: null,
        picture: {
          meaningKo: "apple",
          src: "/images/apple.svg",
          catalogued: true,
        },
      }),
    );
    expect(html).toContain('data-turn-picture=""');
    expect(html).toContain('alt=""');
    expect(html).not.toContain('alt="apple"');
  });

  it("회화 화면: 문장은 앞 줄이 다 흐른 뒤 다음 줄이 나온다 — 처음 그림에는 첫 줄만 있다(검토 M-5)", () => {
    const html = renderToStaticMarkup(
      createElement(ToriBubble, {
        ...base,
        content: { sentences: ["One.", "Two."], adds: [], done: false },
        waiting: null,
      }),
    );
    expect(html.match(/data-tori-line=""/g)).toHaveLength(1);
    expect(html).not.toContain("Two.");
  });

  it("AC-19c 말풍선의 접근 이름은 '[이름] 말 다시 듣기'이고 고르기 전에는 '선생님 말 다시 듣기'다", () => {
    const named = renderToStaticMarkup(
      createElement(ToriBubble, {
        ...base,
        teacherName: "미나",
        content: { sentences: ["Hi!"], adds: [], done: true },
        waiting: null,
      }),
    );
    expect(named).toContain('aria-label="미나 말 다시 듣기"');
    expect(named).not.toContain("토리");
    const before = renderToStaticMarkup(
      createElement(ToriBubble, {
        ...base,
        content: { sentences: ["Hi!"], adds: [], done: true },
        waiting: null,
      }),
    );
    expect(before).toContain('aria-label="선생님 말 다시 듣기"');
  });

  it("회화 화면: 기다림 표시(상태 줄)는 말풍선 단추 밖 칸에 있다(검토 M-9)", () => {
    const html = renderToStaticMarkup(
      createElement(ToriBubble, {
        ...base,
        content: { sentences: [], adds: [], done: false },
        waiting: 0,
      }),
    );
    expect(html).toContain('data-tori-waiting=""');
    expect(html).toContain('role="status"');
    expect(html).not.toContain("<button");
  });

  it("회화 화면: '막히면 눌러요'는 힌트 단추가 있어 보인 턴에만 남긴다(검토 M-8)", () => {
    expect(shouldMarkNudge(true, 2)).toBe(true);
    expect(shouldMarkNudge(true, 0)).toBe(false);
    expect(shouldMarkNudge(false, 2)).toBe(false);
  });

  it("회화 화면: 체감 대기는 아이가 말을 멈춘 때부터 첫 문장까지이고 시작을 모르면 없다(검토 M-1)", () => {
    expect(perceivedWaitOf(1000, 3500.4)).toBe(2500);
    expect(perceivedWaitOf(undefined, 3500)).toBeUndefined();
    expect(perceivedWaitOf(4000, 3500)).toBe(0);
  });

  it("회화 화면: 회화의 인식 실패 셈은 말소리 없음 상한을 두지 않아 P11a 셈이 막힌 안내를 따로 내지 않는다(검토 M-6)", () => {
    const limits = talkCounterLimits(3);
    let state = speakingCountersStart();
    const verdicts: string[] = [];
    for (let question = 0; question < 10; question++) {
      for (let i = 0; i < 3; i++) {
        const step = speakingCounters(
          state,
          { type: "error", code: "no-speech" },
          limits,
        );
        state = step.state;
        verdicts.push(step.verdict);
      }
      state = speakingCounters(state, { type: "next-activity" }, limits).state;
    }
    expect(verdicts).not.toContain("speech-silent");
  });
});

describe("차례 5 fix 2 — 그림 깨짐 · 말풍선 폭 · 뜻 자리", () => {
  const base = {
    englishName: "Momo",
    waitSeconds: [1, 5] as const,
    onReplay: () => {},
    onAnswer: () => {},
  };

  it("회화 화면: 그림 턴 그림은 파일이 있고 깨지지 않았을 때만 그리고 깨지면 자리도 접는다(화면 검토 I-2)", () => {
    const ok = {
      meaningKo: "사과",
      src: "/images/apple.svg",
      catalogued: true,
    };
    expect(turnPictureShown(ok, false)).toBe(true);
    expect(turnPictureShown(ok, true)).toBe(false);
    expect(turnPictureShown({ meaningKo: "", catalogued: false }, false)).toBe(
      false,
    );
    expect(turnPictureShown(undefined, false)).toBe(false);
    const none = renderToStaticMarkup(
      createElement(ToriBubble, {
        ...base,
        content: { sentences: ["Look!"], adds: [], done: true },
        waiting: null,
        picture: { meaningKo: "", catalogued: false },
      }),
    );
    expect(none).not.toContain("data-turn-picture");
  });

  it("AC-16b 말풍선 아래 설명 줄도 {NAME} 을 영어 이름으로 채워 보인다(결함 E)", () => {
    const html = renderToStaticMarkup(
      createElement(ToriBubble, {
        ...base,
        content: { sentences: ["Nice!"], adds: [], done: true },
        waiting: null,
        explanation: "{NAME}, 'fine' 은 좋다는 뜻이야.",
      }),
    );
    expect(html).toMatch(/data-tori-explanation=""[^>]*>Momo, /);
    expect(html).not.toContain("{NAME}");
  });

  it("회화 화면: 말풍선은 글 길이만큼이고 상한 폭이 있으며 뜻 줄과 답 두 개 단추는 한 묶음 자리에 있다(화면 검토 M-2 · M-3)", () => {
    const html = renderToStaticMarkup(
      createElement(ToriBubble, {
        ...base,
        content: {
          sentences: ["Hi!"],
          adds: [
            {
              t: "add",
              kind: "two_answers",
              answers: ["I'm good.", "I'm fine."],
            },
          ],
          done: false,
        },
        waiting: null,
      }),
    );
    expect(html).toContain("w-fit");
    expect(html).toContain(`max-w-[${TORI_BUBBLE_MAX_PX}px]`);
    // 뜻이 아직 없어도 묶음 자리(최소 높이)가 먼저 있고 그 안에 ①② 가 있다
    expect(html).toMatch(/data-tori-under=""[^>]*>.*data-two-answers/);
  });
});

describe("회화 말소리 없음 셈(C22 · 7절 오류 행 — no-speech 로만 끝난 질문)", () => {
  const nospeech = { kind: "send", mode: "dont_know", nospeech: true } as const;
  const passed = {
    kind: "end",
    afterDontKnow: true,
    dontKnowCount: 0,
  } as const;
  const stayed = {
    kind: "end",
    afterDontKnow: true,
    dontKnowCount: 1,
  } as const;

  it("AC-N3 한 질문의 no-speech '모름'이 여럿이어도 그 질문이 넘어갈 때 하나로 센다", () => {
    let s = SILENT_COUNT_START;
    for (let i = 0; i < 2; i++) {
      s = silentCountStep(s, nospeech);
      s = silentCountStep(s, stayed);
    }
    expect(s.passed).toBe(0);
    s = silentCountStep(s, nospeech);
    s = silentCountStep(s, passed);
    expect(s.passed).toBe(1);
  });

  it("AC-N3 말소리 없이 넘어간 질문이 이어질 때만 쌓이고 말한 턴 · '잘 모르겠어요' 단추가 낀 질문은 처음부터다", () => {
    let s = SILENT_COUNT_START;
    s = silentCountStep(silentCountStep(s, nospeech), passed);
    s = silentCountStep(silentCountStep(s, nospeech), passed);
    expect(s.passed).toBe(2);
    // 단추 '모름'이 낀 질문은 말소리 없음 질문이 아니다 — 이어짐이 끊긴다
    s = silentCountStep(s, {
      kind: "send",
      mode: "dont_know",
      nospeech: false,
    });
    s = silentCountStep(s, stayed);
    s = silentCountStep(silentCountStep(s, nospeech), passed);
    expect(s.passed).toBe(0);
    s = silentCountStep(silentCountStep(s, nospeech), passed);
    expect(s.passed).toBe(1);
    // 말한 턴은 처음부터
    s = silentCountStep(s, { kind: "send", mode: "speech", nospeech: false });
    s = silentCountStep(s, {
      kind: "end",
      afterDontKnow: false,
      dontKnowCount: 0,
    });
    expect(s.passed).toBe(0);
  });
});

describe("답 두 개 듣기 단추 꼴(전체 디자인 리뷰 M-5)", () => {
  it("회화 화면: 답 두 개 듣기 단추는 보드 글꼴(Fredoka) 숫자 1 · 2 를 원 테 안에 그리고 대체 글꼴로 떨어지는 동그라미 숫자 글자가 없으며 이름은 그대로다", () => {
    const html = renderToStaticMarkup(
      createElement(ToriBubble, {
        content: {
          sentences: ["How are you?"],
          adds: [
            {
              t: "add",
              kind: "two_answers",
              answers: ["I'm good.", "I'm fine."],
            },
          ],
          done: true,
        },
        englishName: "Momo",
        waiting: null,
        waitSeconds: [5, 10],
        onReplay: () => {},
        onAnswer: () => {},
      }),
    );
    expect(html).not.toMatch(/[①②]/);
    expect(html).toContain('aria-label="첫째 답 듣기"');
    expect(html).toContain('aria-label="둘째 답 듣기"');
    const marks = [...html.matchAll(/data-answer-mark="(\d)"[^>]*>(\d)</g)];
    expect(marks.map((m) => [m[1], m[2]])).toEqual([
      ["1", "1"],
      ["2", "2"],
    ]);
    expect(html).toMatch(/data-answer-mark="1"[^>]*class="[^"]*font-en/);
    expect(html).toMatch(/data-answer-mark="1"[^>]*class="[^"]*rounded-full/);
  });
});
