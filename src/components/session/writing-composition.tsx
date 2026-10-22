"use client";

// 쓰기 6~12 첫 세션 조각(3.3 쓰기 6~12 행 · 생각 꺼내기 문단 · 4절 쓰기 세션 행 '6단계부터 자유 입력란' · 6.2 생각 꺼내기 · 8절 '생각 꺼내기'
// 실패 길, plan-p11b 파일별 값 7 · 'AI 실패 갈래별 화면 길' 생각 꺼내기 행 · 정할 것 ㄹ · plan-p11a 정본 밖 문구 표 b 행, 13절 C77 · C78).
// 과제(과제 · 예시) → 생각 꺼내기(한국어 질문 + 보기 셋을 누르거나 '직접 쓸래요' → 한글로 짧게 · '보내기', 마지막 턴은 서버가 끝냄) →
// 초고('내 생각' · '쓸 수 있는 단어'(누르면 읽어 줌) · '이렇게 시작해 봐요', 실패면 '이번에는 바로 써 볼까요' + 예시 · 시드 힌트,
// 분량 줄 · 지금 낱말 수, 영어 입력란(자동 수정 · 자동 대문자 · 맞춤법 · 추천 끔), 멈추면 · 떠나면 · 숨으면 자동 저장) → '다 썼어요'.
// AI 를 기다리는 동안 WaitHint. 서버에 닿지 못하면 7절 끊김 안내 · online 때 같은 시도 id 로 다시. 일기 과제 '부모님도 볼 수 있어요'는
// 시드에 표시 칸이 없어(정할 것 ㄹ — 2차 P4) 1-가는 그리지 않는다.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CHILD_SIZE,
  EnglishLine,
  GuideLine,
} from "@/components/activities/common";
import { WritingGuidedTask } from "@/components/activities/writing";
import {
  BigButton,
  FOCUS_RING,
  SmallButton,
  StatusLine,
} from "@/components/board/board";
import { WaitHint } from "@/components/session/wait-hint";
import { DRAFT_TEXT_MAX, THINKOUT_ANSWER_MAX } from "@/core/writing/feedback";
import type { SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";
import type { CompositionView } from "@/server/session";
import type { DraftOutcome, ThinkoutOutcome } from "@/server/writing";

/** 조각 글(정본 밖 문구 표 b 행 · 8절 · 7절 네트워크 행 · 세션 틀 저장 실패 줄, C78). */
export const COMPOSITION_TEXT = {
  next: "다음",
  thinkout: "생각 꺼내기",
  typeOwn: "직접 쓸래요",
  send: "보내기",
  koreanHint: "한글로 짧게 써도 돼요",
  fallback: "이번에는 바로 써 볼까요",
  myIdea: "내 생각",
  words: "쓸 수 있는 단어",
  starters: "이렇게 시작해 봐요",
  example: "예시",
  amount: (unit: "words" | "sentences", min: number, max: number) =>
    unit === "words"
      ? `${min}~${max}단어로 써요`
      : `${min}~${max}문장으로 써요`,
  count: (n: number) => `지금 ${n}단어`,
  written: "다 썼어요",
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  failed: "지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요",
} as const;

/** 초고가 멈춘 뒤 자동 저장까지(기술 값 — plan-p11b 값 7 DRAFT_AUTOSAVE_MS). */
export const DRAFT_AUTOSAVE_MS = 3000;
/** 초고 입력란 줄 수: 처음 · 최소 5줄, 글이 길면 늘어나되 가로 8 · 세로 10줄까지(한 화면 안 — 화면 꼴 값, 설계 숫자 아님,
 * 화면 검토 review-p11-6-design M-2). 그보다 길면 입력란 안에서 넘긴다(2차 7~12단계 분량). */
export const DRAFT_ROWS_MIN = 5;
const DRAFT_ROWS_MAX_LANDSCAPE = 8;
const DRAFT_ROWS_MAX_PORTRAIT = 10;
const LANDSCAPE_QUERY = "(orientation: landscape)";
/** 글 입력란 초점 꼴(쓰기 4~5 입력란과 같은 먹색 점선 4px). */
export const INPUT_FOCUS =
  "focus:outline-4 focus:outline-offset-4 focus:outline-dashed focus:outline-ink";

const wordsIn = (text: string) =>
  text.trim().split(/\s+/).filter(Boolean).length;

// ── 과제 ──

/** 과제 화면(과제 · 예시 — P5b WritingGuidedTask 와 같은 꼴). */
export function CompositionTaskActivity({
  task,
  example,
  onDone,
}: {
  task: string;
  example: string;
  onDone: () => void;
}) {
  return (
    <div data-composition-task="" className="flex flex-col gap-6">
      <WritingGuidedTask task={task} example={example} />
      <BigButton className="self-end" onClick={onDone}>
        {COMPOSITION_TEXT.next}
      </BigButton>
    </div>
  );
}

// ── 생각 꺼내기 ──

/** 활동 안 입력(이 기기에 되살림): 보내는 중인 답과 그 시도 id(다시 보낼 때 같은 id). */
export type ThinkoutInput = { attemptId?: string; answer?: string | null };

type Turn = { turn: number; question: string; options: string[] };

export function ThinkoutActivity({
  initialTurn,
  waitHintSeconds,
  initial,
  onChange,
  step,
  onDone,
  onResting,
  onLeave,
}: {
  /** 다시 열 때 마지막 질문(없으면 첫 턴을 부른다). */
  initialTurn: Turn | null;
  waitHintSeconds: readonly [number, number];
  initial?: ThinkoutInput;
  onChange: (value: ThinkoutInput) => void;
  /** 생각 꺼내기 서버 액션(틀이 세션 · 활동 번호를 붙임). 닿지 못하면 던진다. */
  step: (req: {
    clientAttemptId: string;
    answer: string | null;
  }) => Promise<ThinkoutOutcome>;
  /** 끝 — 요약 · 낱말 · 틀(성공) 또는 null('이번에는 바로 써 볼까요'). 끝 시도는 서버가 저장했다. */
  onDone: (
    result: { summary: string; words: string[]; starters: string[] } | null,
  ) => void;
  onResting: () => void;
  onLeave: () => void;
}) {
  const [turn, setTurn] = useState<Turn | null>(initialTurn);
  const [waiting, setWaiting] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [typing, setTyping] = useState(false);
  const [status, setStatus] = useState("");
  const [waitingOnline, setWaitingOnline] = useState(false);
  const pending = useRef<ThinkoutInput>(initial ?? {});
  const busy = useRef(false);
  // 한글 조합이 깨지지 않게 비제어 입력(P10 첫 실행 이름 칸과 같은 꼴, 위험 6)
  const field = useRef<HTMLInputElement>(null);

  async function send(answer: string | null) {
    if (busy.current) return;
    busy.current = true;
    const attemptId =
      pending.current.attemptId && pending.current.answer === answer
        ? pending.current.attemptId
        : crypto.randomUUID();
    pending.current = { attemptId, answer };
    onChange(pending.current);
    setStatus("");
    setWaitingOnline(false);
    setStartedAt(performance.now());
    setWaiting(true);
    let out: ThinkoutOutcome;
    try {
      out = await step({ clientAttemptId: attemptId, answer });
    } catch {
      busy.current = false;
      setWaiting(false);
      setStatus(
        navigator.onLine ? COMPOSITION_TEXT.failed : COMPOSITION_TEXT.offline,
      );
      setWaitingOnline(true);
      return;
    }
    busy.current = false;
    setWaiting(false);
    if (out.ok) {
      pending.current = {};
      onChange({});
      if (out.done) {
        onDone({
          summary: out.summary,
          words: out.words,
          starters: out.starters,
        });
        return;
      }
      setTyping(false);
      setTurn({ turn: out.turn, question: out.question, options: out.options });
      return;
    }
    switch (out.reason) {
      case "fallback":
        onDone(null);
        return;
      case "ai_resting":
        onResting();
        return;
      case "not_found":
        onLeave();
        return;
      default:
        setStatus(COMPOSITION_TEXT.failed);
    }
  }

  // 첫 턴: 들어오면 바로 첫 질문을 부른다(다시 열 때 마지막 질문이 있으면 그대로)
  const sendRef = useRef(send);
  sendRef.current = send;
  // biome-ignore lint/correctness/useExhaustiveDependencies: 활동에 들어올 때 한 번
  useEffect(() => {
    if (!initialTurn) void sendRef.current(pending.current.answer ?? null);
  }, []);
  // 끊긴 뒤 다시 연결되면 같은 시도 id 로 다시(7절 네트워크 행)
  useEffect(() => {
    if (!waitingOnline) return;
    const retry = () => void sendRef.current(pending.current.answer ?? null);
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [waitingOnline]);

  return (
    <div
      data-thinkout={waiting ? "waiting" : typing ? "typing" : "asking"}
      data-thinkout-turn={turn?.turn ?? 0}
      className="flex flex-col gap-6"
    >
      <GuideLine className="font-bold">{COMPOSITION_TEXT.thinkout}</GuideLine>
      {turn ? (
        <p
          data-thinkout-question=""
          className="font-heading text-[28px] leading-snug"
        >
          {turn.question}
        </p>
      ) : null}
      {waiting ? (
        <WaitHint startedAt={startedAt} seconds={waitHintSeconds} />
      ) : turn && !typing ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {turn.options.map((option) => (
              <button
                key={option}
                type="button"
                data-thinkout-option={option}
                onClick={() => void send(option)}
                className={cn(
                  CHILD_SIZE.choice,
                  CHILD_SIZE.target,
                  FOCUS_RING,
                  "rounded-xl border-2 border-ink bg-paper px-5 py-2 text-left",
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <SmallButton className="self-start" onClick={() => setTyping(true)}>
            {COMPOSITION_TEXT.typeOwn}
          </SmallButton>
        </div>
      ) : turn && typing ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const text = field.current?.value.trim() ?? "";
            if (text !== "") void send(text);
          }}
        >
          <label className="flex flex-col gap-2">
            <GuideLine>{COMPOSITION_TEXT.koreanHint}</GuideLine>
            <input
              ref={field}
              type="text"
              data-thinkout-answer=""
              lang="ko"
              maxLength={THINKOUT_ANSWER_MAX}
              autoComplete="off"
              className={cn(
                CHILD_SIZE.choice,
                CHILD_SIZE.target,
                INPUT_FOCUS,
                "w-full rounded-xl border-2 border-ink bg-white px-4",
              )}
            />
          </label>
          <BigButton type="submit" className="self-end">
            {COMPOSITION_TEXT.send}
          </BigButton>
        </form>
      ) : null}
      <StatusLine tone="error" className={status ? undefined : "sr-only"}>
        {status}
      </StatusLine>
    </div>
  );
}

/**
 * 글 입력란 높이를 글에 맞춘다(최소 DRAFT_ROWS_MIN 줄 — rows, 가로 · 세로 줄 상한까지, 화면 검토 review-p11-6-design M-2). 초고 · 고쳐
 * 쓰기 입력란이 같이 쓴다. 입력란에 달 ref 를 돌려준다.
 */
export function useDraftRows(text: string) {
  const box = useRef<HTMLTextAreaElement>(null);
  const [landscape, setLandscape] = useState(false);
  // 방향이 바뀌면 줄 상한을 다시 고른다
  useEffect(() => {
    const query = window.matchMedia(LANDSCAPE_QUERY);
    const on = () => setLandscape(query.matches);
    on();
    query.addEventListener("change", on);
    return () => query.removeEventListener("change", on);
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: 글 · 방향이 바뀔 때마다 잰다
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const css = window.getComputedStyle(el);
    const line = Number.parseFloat(css.lineHeight);
    const borders =
      Number.parseFloat(css.borderTopWidth) +
      Number.parseFloat(css.borderBottomWidth);
    const frame =
      Number.parseFloat(css.paddingTop) +
      Number.parseFloat(css.paddingBottom) +
      borders;
    const maxRows = landscape
      ? DRAFT_ROWS_MAX_LANDSCAPE
      : DRAFT_ROWS_MAX_PORTRAIT;
    el.style.height = "auto";
    const natural = el.scrollHeight + borders;
    if (natural > el.offsetHeight && Number.isFinite(line))
      el.style.height = `${Math.min(natural, maxRows * line + frame)}px`;
  }, [text, landscape]);
  return box;
}

// ── 초고 ──

/** 활동 안 입력(이 기기에 되살림): 쓴 글 · 낸 시도 id. */
export type DraftInput = { text?: string; attemptId?: string };

export function DraftActivity({
  task,
  example,
  hints,
  thinkout,
  amount,
  speech,
  initialText,
  initial,
  onChange,
  autosave,
  registerFlush,
  submit,
  onLeave,
}: {
  task: string;
  example: string;
  hints: readonly string[];
  /** 생각 꺼내기 결과 — done 이면 '내 생각' 쪽, failed 면 '이번에는 바로 써 볼까요' + 예시 · 힌트, null 이면(생각 꺼내기 없는 단계) 예시 · 힌트. */
  thinkout: CompositionView["thinkout"];
  amount: CompositionView["amount"];
  speech: SpeechPort | undefined;
  /** 서버에 자동 저장된 글(다른 기기에서 이어 쓰기). 이 기기 입력이 있으면 그것이 먼저. */
  initialText: string | null;
  initial?: DraftInput;
  onChange: (value: DraftInput) => void;
  /** 진행 시도(초고 글)를 대기열에 넣는다. */
  autosave: (text: string) => void;
  /** '홈' 앞에 틀이 부를 저장(마지막 글을 대기열에). */
  registerFlush: (flush: (() => void) | undefined) => void;
  /** 초고 제출(틀이 대기열을 비우고 서버 액션을 부름). 닿지 못하면 던진다. */
  submit: (req: {
    clientAttemptId: string;
    text: string;
  }) => Promise<DraftOutcome>;
  onLeave: () => void;
}) {
  const [text, setText] = useState(initial?.text ?? initialText ?? "");
  const attemptId = useRef(initial?.attemptId);
  const saved = useRef(initialText ?? "");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [waitingOnline, setWaitingOnline] = useState(false);
  const count = wordsIn(text);
  const box = useDraftRows(text);

  const latest = useRef(text);
  latest.current = text;
  function flush() {
    if (latest.current === saved.current) return;
    saved.current = latest.current;
    autosave(latest.current);
  }
  const flushRef = useRef(flush);
  flushRef.current = flush;

  // 글이 멈추면 자동 저장(DRAFT_AUTOSAVE_MS)
  useEffect(() => {
    if (text === saved.current) return;
    const timer = window.setTimeout(
      () => flushRef.current(),
      DRAFT_AUTOSAVE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [text]);
  // 화면이 숨을 때 · 틀의 '홈' 앞에 저장
  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") flushRef.current();
    };
    document.addEventListener("visibilitychange", hide);
    registerFlush(() => flushRef.current());
    return () => {
      document.removeEventListener("visibilitychange", hide);
      registerFlush(undefined);
    };
  }, [registerFlush]);

  async function send() {
    if (busy || count === 0) return;
    setBusy(true);
    setStatus("");
    setWaitingOnline(false);
    attemptId.current ??= crypto.randomUUID();
    onChange({ text, attemptId: attemptId.current });
    let out: DraftOutcome;
    try {
      out = await submit({ clientAttemptId: attemptId.current, text });
    } catch {
      setBusy(false);
      setStatus(
        navigator.onLine ? COMPOSITION_TEXT.failed : COMPOSITION_TEXT.offline,
      );
      setWaitingOnline(true);
      return;
    }
    if (out.ok) return; // 틀이 결과로 옮긴다
    setBusy(false);
    if (out.reason === "not_found") {
      onLeave();
      return;
    }
    setStatus(COMPOSITION_TEXT.failed);
  }
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    if (!waitingOnline) return;
    const retry = () => void sendRef.current();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [waitingOnline]);

  const done = thinkout?.state === "done" ? thinkout : null;
  return (
    <div
      data-draft=""
      // 가로 화면은 왼쪽에 도움(생각 · 예시), 오른쪽에 쓰는 칸(세로 넘침을 줄임 — 4절 두 방향)
      className="flex flex-col gap-6 landscape:grid landscape:grid-cols-2 landscape:items-start landscape:gap-8"
    >
      <div className="flex flex-col gap-5">
        <GuideLine>{task}</GuideLine>
        {done ? (
          <>
            <div data-draft-idea="" className="flex flex-col gap-1">
              <GuideLine className="font-bold">
                {COMPOSITION_TEXT.myIdea}
              </GuideLine>
              <GuideLine>{done.summary}</GuideLine>
            </div>
            <div data-draft-words="" className="flex flex-col gap-2">
              <GuideLine className="font-bold">
                {COMPOSITION_TEXT.words}
              </GuideLine>
              <div className="flex flex-wrap gap-3">
                {done.words.map((word) => (
                  // 영어 낱말이라 24px(4절 영어 하한 · C82 — 22px 단추 글이 아님, 코드 검토 review-p11-6-code M-2). 누르면 읽어 줌
                  <button
                    key={word}
                    type="button"
                    lang="en"
                    data-draft-word={word}
                    disabled={!speech}
                    onClick={() => {
                      speech?.unlockFromGesture();
                      void speech?.speak(word);
                    }}
                    className={cn(
                      CHILD_SIZE.choice,
                      CHILD_SIZE.target,
                      FOCUS_RING,
                      "rounded-xl border-2 border-ink bg-paper px-4 font-bold shadow-sm disabled:opacity-60",
                    )}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
            <div data-draft-starters="" className="flex flex-col gap-1">
              <GuideLine className="font-bold">
                {COMPOSITION_TEXT.starters}
              </GuideLine>
              {done.starters.map((starter) => (
                <EnglishLine key={starter}>{starter}</EnglishLine>
              ))}
            </div>
          </>
        ) : (
          <>
            {thinkout?.state === "failed" ? (
              <p
                data-draft-fallback=""
                className={cn(CHILD_SIZE.guide, "font-bold")}
              >
                {COMPOSITION_TEXT.fallback}
              </p>
            ) : null}
            <div data-draft-example="" className="flex flex-col gap-1">
              <GuideLine className="font-bold">
                {COMPOSITION_TEXT.example}
              </GuideLine>
              <EnglishLine>{example}</EnglishLine>
            </div>
            {hints.length > 0 ? (
              <ul data-draft-hints="" className="flex flex-col gap-1">
                {hints.map((hint) => (
                  <li key={hint} className={CHILD_SIZE.guide}>
                    {hint}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <GuideLine>
            {COMPOSITION_TEXT.amount(amount.unit, amount.min, amount.max)}
          </GuideLine>
          <span data-draft-count={count} className={CHILD_SIZE.guide}>
            {COMPOSITION_TEXT.count(count)}
          </span>
        </div>
        <textarea
          ref={box}
          data-draft-text=""
          lang="en"
          rows={DRAFT_ROWS_MIN}
          maxLength={DRAFT_TEXT_MAX}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={text}
          disabled={busy}
          onChange={(e) => {
            setText(e.target.value);
            onChange({
              text: e.target.value,
              ...(attemptId.current ? { attemptId: attemptId.current } : {}),
            });
          }}
          onBlur={() => flushRef.current()}
          className={cn(
            CHILD_SIZE.english,
            INPUT_FOCUS,
            "w-full resize-none rounded-xl border-2 border-ink bg-white p-3 leading-snug",
          )}
        />
        <StatusLine tone="error" className={status ? undefined : "sr-only"}>
          {status}
        </StatusLine>
        <BigButton
          className="self-end"
          disabled={busy || count === 0}
          onClick={() => void send()}
        >
          {COMPOSITION_TEXT.written}
        </BigButton>
      </div>
    </div>
  );
}
