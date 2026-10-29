// 회화 아이 차례의 듣기 끝 처리(iPad '결과 없음' 고침 N1 · N3 · N4, 13절 C148 · 3.3 막힘 문단 · 7절 오류 · 말하기 버튼 행 · C23).
// N1: 같은 질문 말소리 없음 셈에는 no-speech 로 끝난 듣기만 든다(결과 없음은 들지 않음).
// N3: 듣는 동안 토리 말 다시 듣기 · 답 듣기 ①② · 힌트 문장 듣기 단추는 꺼진다(누르면 듣기가 안내 없이 끝나므로).
// N4: 결과 없음 · 오류로 끝난 듣기는 말을 멈춘 때 = 듣기 끝(끝 조용함을 빼지 않음).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  ChildTurn,
  type ChildTurnProps,
  silentListenOf,
  speechStoppedAt,
} from "@/components/conversation/child-turn";
import { perceivedWaitOf } from "@/components/conversation/talk-frame";
import { ToriBubble } from "@/components/conversation/tori";
import { OPEN_ALL_HINTS_FROM_DONT_KNOW } from "@/core/conversation/hints";
import {
  talkEndRuleFor,
  talkSpeechSettingsFrom,
} from "@/core/conversation/listen";
import type { ListenOutcome } from "@/core/speech/listen";
import { speechSettingsFrom } from "@/core/speech/listen";
import type { SpeechPort } from "@/lib/speech/types";
import { testSettingValues } from "../fixtures/settings";

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));

const values = testSettingValues();
const read = (key: string) => values[key];
const speech = speechSettingsFrom(read);
const talkSpeech = talkSpeechSettingsFrom(read);
/** 1단계 대화 듣기 규칙(끝 조용함 speech.end_silence_seconds.talk.1-3). */
const RULE = talkEndRuleFor({ level: 1, mode: "dialogue" }, speech, talkSpeech);
const END_SILENCE_MS = RULE.endSilenceMs ?? 0;

const noSpeech: ListenOutcome = {
  kind: "error",
  code: "no-speech",
  group: "retry",
  partialText: "",
};
const heard: ListenOutcome = {
  kind: "result",
  text: "I'm good",
  pieces: ["I'm good"],
  endedBy: "silence",
  restarts: 0,
  watchdogRestarts: 0,
};

describe("N1 같은 질문 말소리 없음 셈(C148 · 3.3 막힘 문단)", () => {
  it("C148 회화 아이 차례의 말소리 없음 셈에는 no-speech 로 끝난 듣기만 들고 결과 없음 · 다른 오류는 들지 않는다", () => {
    expect(silentListenOf({ type: "error", code: "no-speech" })).toBe(true);
    expect(silentListenOf({ type: "no-result" })).toBe(false);
    expect(silentListenOf({ type: "error", code: "aborted" })).toBe(false);
    expect(silentListenOf({ type: "heard", text: "hi" })).toBe(false);
  });
});

describe("N4 말을 멈춘 때(C23 · NFR-8)", () => {
  it("AC-N8 말소리 없음 '모름' 뒤 체감 대기는 첫 문장 − 마지막 듣기 끝이고 들은 턴만 끝 조용함을 뺀다", () => {
    expect(END_SILENCE_MS).toBeGreaterThan(0);
    const doneAt = 20_000;
    const firstSentenceAt = 21_600;
    const stopped = speechStoppedAt(noSpeech, doneAt, RULE.endSilenceMs);
    expect(stopped).toBe(doneAt);
    expect(perceivedWaitOf(stopped, firstSentenceAt)).toBe(
      firstSentenceAt - doneAt,
    );
    expect(speechStoppedAt({ kind: "no-result" }, doneAt, END_SILENCE_MS)).toBe(
      doneAt,
    );
    expect(
      speechStoppedAt(
        { kind: "stalled", partialText: "" },
        doneAt,
        END_SILENCE_MS,
      ),
    ).toBe(doneAt);
    // 들은 턴은 그대로(듣기 끝 − 끝 조용함 — AC-N8 은 listen_end_seconds 로 뺀다)
    expect(speechStoppedAt(heard, doneAt, END_SILENCE_MS)).toBe(
      doneAt - END_SILENCE_MS,
    );
    expect(speechStoppedAt(heard, doneAt, undefined)).toBe(doneAt);
  });
});

describe("N3 듣는 동안 읽어 주기 단추(7절 말하기 버튼 행)", () => {
  const bubbleContent = {
    sentences: ["How are you?"],
    adds: [
      {
        t: "add" as const,
        kind: "two_answers" as const,
        answers: ["I'm good.", "I'm OK."] as [string, string],
      },
    ],
    done: true,
  };
  const bubble = (listening: boolean) =>
    renderToStaticMarkup(
      createElement(ToriBubble, {
        content: bubbleContent,
        englishName: "Momo",
        waiting: null,
        waitSeconds: values["ui.wait_hint_seconds"] as [number, number],
        listening,
        onReplay: () => {},
        onAnswer: () => {},
      }),
    );
  const disabledOf = (html: string, attr: string) => {
    const tags = html.match(new RegExp(`<button[^>]*${attr}[^>]*>`, "g")) ?? [];
    return tags.map((t) => / disabled=""/.test(t));
  };

  it("7절 말하기 버튼 행(분석 A2 · N3) 듣는 동안 토리 말 다시 듣기와 답 듣기 ①② 단추는 꺼지고 듣지 않을 때는 켜져 있다", () => {
    expect(disabledOf(bubble(true), "data-tori-bubble")).toEqual([true]);
    expect(disabledOf(bubble(true), "data-answer-listen")).toEqual([
      true,
      true,
    ]);
    expect(disabledOf(bubble(false), "data-tori-bubble")).toEqual([false]);
    expect(disabledOf(bubble(false), "data-answer-listen")).toEqual([
      false,
      false,
    ]);
  });

  it("7절 말하기 버튼 행(분석 A2 · N3) 듣지 않을 때 힌트 문장 듣기 단추는 켜져 있다(듣는 동안 꺼짐은 e2e)", () => {
    const port = {} as SpeechPort;
    const props: ChildTurnProps = {
      sessionId: "s",
      speech: port,
      level: 1,
      lowLevel: true,
      englishName: "Momo",
      hints: [{ kind: "sentence", text: "I'm good.", listen: true }],
      // 둘째 '모름'부터 모든 단이 열린 채(힌트 문장 듣기 단추가 보임)
      dontKnowCount: OPEN_ALL_HINTS_FROM_DONT_KNOW,
      heard: {},
      settings: {
        speech,
        talkSpeech,
        confirmSeconds: values["talk.confirm_seconds"] as number,
        hintReadMatch: values["talk.hint_read_match"] as number,
        nospeechDontknowCount: values["talk.nospeech_dontknow_count"] as number,
      },
      rate: speech.rate["1-3"],
      homophones: [],
      nudge: false,
      onNudgeShown: () => {},
      onSpeech: () => "heard",
      onListenStart: () => {},
      onListening: () => {},
      reveal: async () => undefined,
      onSend: () => {},
    };
    const html = renderToStaticMarkup(createElement(ChildTurn, props));
    expect(disabledOf(html, "data-hint-listen")).toEqual([false]);
  });
});
