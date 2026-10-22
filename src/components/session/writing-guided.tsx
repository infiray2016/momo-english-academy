"use client";

// 쓰기 4~5 세션 조각(3.3 쓰기 4 · 5단계 행 · 4절 쓰기 세션 행 '확인은 같은 화면에' · 6.2 쓰기 확인 · 8절 'AI 호출 하나의 실패', plan-p11b
// 파일별 값 7 · 'AI 실패 갈래별 화면 길' 쓰기 확인 행 · plan-p11a 정할 것 마 (6) · 정본 밖 문구 표 b 행, 13절 C77 · C78 · C80).
// 과제(과제 · 예시, 4단계는 단어 상자) → 문장 쓰기(문장 전부 한 화면 — 4단계 빈칸은 누르는 칸 · 단어 상자 칩, 5단계 빈칸은 기기 자판
// 입력란 · 자동 수정 · 자동 대문자 · 맞춤법 검사 · 단어 추천 끔) → '다 썼어요' → 같은 화면에 확인(칭찬 한 줄 · 고칠 곳 하나 색칠 →
// '알맞은 말을 골라요' 보기 → 고침) → 내 문장 듣고 따라 말하기(선택 · '건너뛰기' · 마이크 없으면 건너뜀). 시드 hints · rubric 은
// 보이지 않는다. 확인 기다림은 WaitHint(ui.wait_hint_seconds). 확인이 실패하면 확인 없이 넘어가고(점수 없는 세션), 하루 안전 상한이면
// 틀이 안내를 보인다. 서버에 닿지 못하면 7절 끊김 안내를 보이고 online 때 같은 시도 id 로 다시 낸다(서버가 같은 결과를 돌려줌).
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import {
  RepeatActivity,
  type SpeakingEnv,
} from "@/components/session/speaking";
import { WaitHint } from "@/components/session/wait-hint";
import {
  type SpeechEvent,
  type SpeechVerdict,
  speakingCounters,
  speakingCountersStart,
} from "@/core/speaking/judge";
import {
  applyFix,
  assembleSentence,
  BLANK_TEXT_MAX,
  fixSpotOf,
  frameBlanks,
  frameParts,
  ownRepeatStopOf,
} from "@/core/writing/guided";
import { markMicUnavailable } from "@/lib/mic-state";
import { cn } from "@/lib/utils";
import type { GuidedCheckOutcome, GuidedFix } from "@/server/writing";

/** 조각 글(정본 밖 문구 표 b 행 · 7절 네트워크 행 · 세션 틀 저장 실패 줄, C78). */
export const WRITING_GUIDED_TEXT = {
  wordBox: "단어 상자",
  written: "다 썼어요",
  fixHint: "색칠한 곳을 눌러 고쳐 봐요",
  pick: "알맞은 말을 골라요",
  pickAgain: "다시 골라 볼까요",
  fixed: "잘 고쳤어요!",
  ownRepeat: "내 문장을 듣고 따라 말해 봐요",
  skip: "건너뛰기",
  next: "다음",
  example: "예시",
  /** 보조 기술 이름(칸마다 — 화면 검토 참고). */
  blankName: (sentence: number, blank: number) =>
    `문장 ${sentence} 빈칸 ${blank}`,
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  failed: "지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요",
} as const;

/** 틀린 보기 표(✕)의 선 굵기(답 조각 ChoiceAnswer 와 같은 화면 꼴 값). */
const MARK_STROKE = 3;
/** 쓰기 카드 위 말하기 단추의 고리 틈 색(활동 카드 바탕 — 하늘). */
const WRITING_CARD_GAP = "bg-postit-writing";

type GuidedSentence = { frame: string; wordBox?: readonly string[] };

// ── 과제 ──

/** 과제 화면(과제 · 예시 — P5b WritingGuidedTask, 4단계는 단어 상자 칩 보기). */
export function GuidedTaskActivity({
  task,
  example,
  wordBox,
  onDone,
}: {
  task: string;
  example: string;
  /** 4단계(단어 상자 누르기)면 수업 문장들의 단어 상자 낱말, 5단계면 없음. */
  wordBox?: readonly string[];
  onDone: () => void;
}) {
  return (
    <div data-guided-task="" className="flex flex-col gap-6">
      <WritingGuidedTask task={task} example={example} />
      {wordBox && wordBox.length > 0 ? (
        <div data-word-box="" className="flex flex-col gap-3">
          <GuideLine className="font-bold">
            {WRITING_GUIDED_TEXT.wordBox}
          </GuideLine>
          {/* 보기만 하는 낱말 줄 — 누르는 칩 꼴(테 · 그림자)이 아니다(한 화면 한 행동 '다음', 화면 검토 review-p11-5-design M-3) */}
          <p
            lang="en"
            className={cn(
              CHILD_SIZE.english,
              "flex flex-wrap gap-x-6 gap-y-2 font-bold",
            )}
          >
            {wordBox.map((word, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 같은 낱말이 둘일 수 있다
              <span key={`${word}:${i}`}>{word}</span>
            ))}
          </p>
        </div>
      ) : null}
      <BigButton className="self-end" onClick={onDone}>
        {WRITING_GUIDED_TEXT.next}
      </BigButton>
    </div>
  );
}

// ── 문장 쓰기 · 확인 · 고칠 곳 ──

/** 활동 안 입력(이 기기에 되살림): 빈칸마다 쓴 글 · 낸 시도 id(다시 낼 때 같은 id). */
export type GuidedInput = { filled: string[][]; attemptId?: string };

type Phase = "write" | "checking" | "result";

/** 단어 상자에서 아직 놓지 않은 낱말(같은 낱말이 둘이면 하나씩 셈). */
function leftInBox(box: readonly string[], placed: readonly string[]) {
  const used = [...placed];
  return box.filter((word) => {
    const at = used.indexOf(word);
    if (at < 0) return true;
    used.splice(at, 1);
    return false;
  });
}

/** 빈칸 꼴(누르는 칸 · 입력란 공통 — 바탕이 보이는 쓰는 자리, 목업 B_Writing). 초점은 단추와 같은 먹색 점선 4px(화면 검토 M-2). */
const BLANK_FRAME = cn(
  CHILD_SIZE.english,
  CHILD_SIZE.target,
  FOCUS_RING,
  "mx-1 inline-flex min-w-36 items-center justify-center rounded-t-lg border-b-4 border-ink bg-white px-3 align-middle font-bold",
);
/** 글 입력란은 마우스 · 손가락 초점에도 늘 같은 고리(focus-visible 이 아닌 focus — 글 쓰는 자리를 늘 보이게). */
const INPUT_FOCUS =
  "focus:outline-4 focus:outline-offset-4 focus:outline-dashed focus:outline-ink";
/** 5단계 입력란의 최소 글자 칸 수(글이 길면 늘어남 — 화면 꼴 값, 화면 검토 M-1). */
const BLANK_INPUT_SIZE_MIN = 8;

export function GuidedWritingActivity({
  task,
  example,
  sentences,
  input,
  waitHintSeconds,
  initial,
  onChange,
  check,
  onResting,
  onLeave,
  onDone,
}: {
  task: string;
  /** 예시문(5단계는 문장 쓰기 화면에도 — 4절 '예시문 아래 바꿀 칸만'). */
  example: string;
  sentences: readonly GuidedSentence[];
  /** 단계 규격 amount.input — 4단계 단어 상자 누르기 · 5단계 기기 자판. */
  input: "word-box" | "slot";
  waitHintSeconds: readonly [number, number];
  initial?: GuidedInput;
  onChange: (value: GuidedInput) => void;
  /** 쓰기 확인 서버 액션(틀이 세션 · 활동 번호를 붙임). 닿지 못하면 던진다. */
  check: (req: {
    clientAttemptId: string;
    sentences: string[];
  }) => Promise<GuidedCheckOutcome>;
  /** 하루 안전 상한(틀이 '토리가 잠깐 쉬어요' — 세션은 진행). */
  onResting: () => void;
  /** 진행 세션이 아님(다른 기기에서 닫힘) — 틀이 수업 목록으로. */
  onLeave: () => void;
  /** 끝: 낸 문장(고쳤으면 고친 문장) — 틀이 다음 활동으로. */
  onDone: (sentences: string[], fixed: boolean) => void;
}) {
  const [filled, setFilled] = useState<string[][]>(() =>
    sentences.map((s, i) =>
      Array.from(
        { length: frameBlanks(s.frame) },
        (_, j) => initial?.filled?.[i]?.[j] ?? "",
      ),
    ),
  );
  const attemptId = useRef(initial?.attemptId);
  const [phase, setPhase] = useState<Phase>("write");
  const [startedAt, setStartedAt] = useState(0);
  const [status, setStatus] = useState("");
  const [waitingOnline, setWaitingOnline] = useState(false);
  const [result, setResult] = useState<{ praise: string; fix?: GuidedFix }>();
  const [fixOpen, setFixOpen] = useState(false);
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [fixDone, setFixDone] = useState(false);
  const busy = useRef(false);

  const texts = sentences.map((s, i) =>
    assembleSentence(s.frame, filled[i] ?? []),
  );
  const complete = filled.every((row) => row.every((v) => v.trim() !== ""));

  function save(next: string[][]) {
    setFilled(next);
    onChange({
      filled: next,
      ...(attemptId.current ? { attemptId: attemptId.current } : {}),
    });
  }
  function setBlank(i: number, j: number, value: string) {
    save(
      filled.map((row, k) =>
        k === i ? row.map((v, m) => (m === j ? value : v)) : row,
      ),
    );
  }
  /** 단어 상자 칩: 그 문장의 첫 빈칸으로. */
  function place(i: number, word: string) {
    const j = (filled[i] ?? []).indexOf("");
    if (j >= 0) setBlank(i, j, word);
  }

  async function submit() {
    if (!complete || busy.current) return;
    busy.current = true;
    attemptId.current ??= crypto.randomUUID();
    const sent = texts;
    onChange({ filled, attemptId: attemptId.current });
    setStatus("");
    setWaitingOnline(false);
    setStartedAt(performance.now());
    setPhase("checking");
    let out: GuidedCheckOutcome;
    try {
      out = await check({
        clientAttemptId: attemptId.current,
        sentences: sent,
      });
    } catch {
      // 서버에 닿지 못함 — 같은 시도 id 로 다시(online 때 저절로 · '다 썼어요'로)
      busy.current = false;
      setPhase("write");
      setStatus(
        navigator.onLine
          ? WRITING_GUIDED_TEXT.failed
          : WRITING_GUIDED_TEXT.offline,
      );
      setWaitingOnline(true);
      return;
    }
    busy.current = false;
    if (out.ok) {
      setResult({ praise: out.praise, ...(out.fix ? { fix: out.fix } : {}) });
      setPhase("result");
      return;
    }
    switch (out.reason) {
      case "skipped":
        // 확인 없이 넘어간다(8절 — 점수 없는 세션)
        onDone(sent, false);
        return;
      case "ai_resting":
        onResting();
        return;
      case "not_found":
        onLeave();
        return;
      default:
        setPhase("write");
        setStatus(WRITING_GUIDED_TEXT.failed);
    }
  }

  // 끊긴 뒤 다시 연결되면 같은 시도 id 로 다시 낸다(7절 네트워크 행)
  const again = useRef(submit);
  again.current = submit;
  useEffect(() => {
    if (!waitingOnline) return;
    const retry = () => void again.current();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [waitingOnline]);

  const fix = result?.fix;
  const finalTexts =
    fix && fixDone
      ? texts.map((t, i) =>
          i === fix.sentenceIndex ? applyFix(t, fix.original, fix.correct) : t,
        )
      : texts;

  /** 확인 뒤 문장 한 줄(고칠 곳이면 그 자리를 색칠한 누르는 칸). */
  function checkedLine(text: string, i: number) {
    if (!fix || i !== fix.sentenceIndex) return text;
    const at = fixSpotOf(text, fix.original);
    if (at < 0) return text;
    const before = text.slice(0, at);
    const after = text.slice(at + fix.original.length);
    if (fixDone)
      return (
        <>
          {before}
          <span data-fix-done="" className="font-bold underline">
            {fix.correct}
          </span>
          {after}
        </>
      );
    return (
      <>
        {before}
        <button
          type="button"
          data-fix-spot=""
          aria-expanded={fixOpen}
          onClick={() => setFixOpen(true)}
          className={cn(
            CHILD_SIZE.target,
            "mx-1 inline-flex items-center rounded-lg border-2 border-ink bg-postit-reading px-2 align-middle font-bold",
          )}
        >
          {text.slice(at, at + fix.original.length)}
        </button>
        {after}
      </>
    );
  }

  return (
    <div
      data-guided-writing={phase}
      data-guided-input={input}
      className="flex flex-col gap-6"
    >
      {/* 과제 줄 · 예시문은 쓰기 · 기다림 동안만. 결과 단계(칭찬 · 고칠 곳 · 보기 · 이유)는 한 화면에 들게 숨기고 문장 줄 간격을
          좁힌다(글자 20 · 24px · 누르는 곳 56px 은 그대로 — CI 12차 가로 820 넘침, 컨트롤러 fix 5c, 실시드 4문장 여유) */}
      {phase === "result" ? null : <GuideLine>{task}</GuideLine>}
      {input === "slot" && phase !== "result" ? (
        // 5단계: 예시문을 보며 바꿀 칸만 쓴다(4절 쓰기 세션 행 · 3.3 5단계, 화면 검토 review-p11-5-design I-1)
        <div data-guided-example="" className="flex flex-col gap-1">
          <GuideLine className="font-bold">
            {WRITING_GUIDED_TEXT.example}
          </GuideLine>
          <EnglishLine>{example}</EnglishLine>
        </div>
      ) : null}
      <ol
        className={cn("flex flex-col", phase === "result" ? "gap-2" : "gap-6")}
      >
        {sentences.map((s, i) => {
          const parts = frameParts(s.frame);
          const row = filled[i] ?? [];
          const box =
            input === "word-box" ? leftInBox(s.wordBox ?? [], row) : [];
          return (
            <li
              // 시드 문장 차례가 곧 자리다(같은 틀이 두 번 나올 수 있음)
              // biome-ignore lint/suspicious/noArrayIndexKey: 문장 번호가 열쇠다
              key={i}
              data-guided-sentence={i}
              // 가로 화면은 문장 줄 옆에 단어 상자(세로 넘침을 줄임 — 4절 두 방향)
              className="flex flex-col gap-3 landscape:flex-row landscape:flex-wrap landscape:items-center landscape:gap-x-6"
            >
              {phase === "result" ? (
                <EnglishLine className="leading-[3.5rem]">
                  {checkedLine(texts[i] ?? "", i)}
                </EnglishLine>
              ) : (
                <p
                  lang="en"
                  className={cn(CHILD_SIZE.english, "leading-[4rem]")}
                >
                  {parts.map((part, j) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: 빈칸 차례가 곧 자리다
                    <span key={j}>
                      {part}
                      {j < parts.length - 1 ? (
                        input === "slot" ? (
                          <input
                            type="text"
                            data-blank-input=""
                            aria-label={WRITING_GUIDED_TEXT.blankName(
                              i + 1,
                              j + 1,
                            )}
                            lang="en"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            enterKeyHint="done"
                            disabled={phase !== "write"}
                            value={row[j] ?? ""}
                            onChange={(e) => setBlank(i, j, e.target.value)}
                            maxLength={BLANK_TEXT_MAX}
                            size={Math.max(
                              BLANK_INPUT_SIZE_MIN,
                              (row[j] ?? "").length + 1,
                            )}
                            className={cn(
                              BLANK_FRAME,
                              INPUT_FOCUS,
                              // 글 길이만큼 늘되 문장 줄 너비를 넘지 않게(코드 재검토 review-p11-fix5-code Minor)
                              "w-auto min-w-40 max-w-full font-normal",
                            )}
                          />
                        ) : (
                          <button
                            type="button"
                            data-blank-slot={row[j] ? "filled" : "empty"}
                            aria-label={
                              row[j] ||
                              WRITING_GUIDED_TEXT.blankName(i + 1, j + 1)
                            }
                            disabled={phase !== "write" || !row[j]}
                            onClick={() => setBlank(i, j, "")}
                            className={cn(
                              BLANK_FRAME,
                              !row[j] && "border-dashed",
                            )}
                          >
                            {row[j] ?? ""}
                          </button>
                        )
                      ) : null}
                    </span>
                  ))}
                </p>
              )}
              {phase === "write" && input === "word-box" && box.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold">
                    {WRITING_GUIDED_TEXT.wordBox}
                  </span>
                  {box.map((word, k) => (
                    <button
                      // biome-ignore lint/suspicious/noArrayIndexKey: 같은 낱말 칩이 둘일 수 있다
                      key={`${word}:${k}`}
                      type="button"
                      data-word-chip={word}
                      lang="en"
                      onClick={() => place(i, word)}
                      className={cn(
                        CHILD_SIZE.choice,
                        CHILD_SIZE.target,
                        "rounded-xl border-2 border-ink bg-paper px-4 font-bold shadow-sm",
                      )}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {phase === "checking" ? (
        <WaitHint startedAt={startedAt} seconds={waitHintSeconds} />
      ) : null}

      {phase === "result" && result ? (
        <div data-guided-result="" className="flex flex-col gap-4">
          <StatusLine tone="ok">{result.praise}</StatusLine>
          {fix && !fixDone && !fixOpen ? (
            <GuideLine>{WRITING_GUIDED_TEXT.fixHint}</GuideLine>
          ) : null}
          {fix && !fixDone && fixOpen ? (
            <div data-fix-options="" className="flex flex-col gap-3">
              <GuideLine>{WRITING_GUIDED_TEXT.pick}</GuideLine>
              <div className="flex flex-wrap gap-4">
                {fix.options.map((option) => {
                  const wrong = wrongPicks.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      data-fix-option={option}
                      data-choice-state={wrong ? "picked-wrong" : undefined}
                      lang="en"
                      disabled={wrong}
                      onClick={() => {
                        if (option === fix.correct) setFixDone(true);
                        else setWrongPicks([...wrongPicks, option]);
                      }}
                      className={cn(
                        CHILD_SIZE.choice,
                        CHILD_SIZE.target,
                        "inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-paper px-5 font-bold disabled:opacity-60",
                      )}
                    >
                      {wrong ? (
                        <X
                          aria-hidden
                          className="size-6"
                          strokeWidth={MARK_STROKE}
                        />
                      ) : null}
                      {option}
                    </button>
                  );
                })}
              </div>
              {wrongPicks.length > 0 ? (
                <StatusLine>{WRITING_GUIDED_TEXT.pickAgain}</StatusLine>
              ) : null}
            </div>
          ) : null}
          {fixDone ? (
            <>
              <StatusLine tone="ok">{WRITING_GUIDED_TEXT.fixed}</StatusLine>
              {/* 바르게 고친 뒤에만 AI 의 한 문장 이유(13절 C86 — 고르기 전에는 없음, 이름은 서버가 채움) */}
              {fix?.reason ? (
                // GuideLine 은 data 속성을 넘기지 않아 같은 꼴(안내 20px)의 p 에 표지를 단다(CI 11차)
                <p data-fix-reason="" className={CHILD_SIZE.guide}>
                  {fix.reason}
                </p>
              ) : null}
            </>
          ) : null}
          {!fix || fixDone ? (
            <BigButton
              className="self-end"
              onClick={() => onDone(finalTexts, Boolean(fix && fixDone))}
            >
              {WRITING_GUIDED_TEXT.next}
            </BigButton>
          ) : null}
        </div>
      ) : null}

      {phase === "write" ? (
        <>
          <StatusLine tone="error" className={status ? undefined : "sr-only"}>
            {status}
          </StatusLine>
          <BigButton
            className="self-end"
            disabled={!complete}
            onClick={() => void submit()}
          >
            {WRITING_GUIDED_TEXT.written}
          </BigButton>
        </>
      ) : null}
    </div>
  );
}

// ── 내 문장 듣고 따라 말하기(선택) ──

export type OwnRepeatResult = {
  heard?: string[];
  skipped?: "chose_skip" | "no_mic";
};

/**
 * 내 문장 듣고 따라 말하기(3.3 쓰기 4~5 '(선택)' · plan-p11a 정할 것 마 (6)): 낸(고친) 문장을 하나씩 읽어 주고 '말하기' — a 따라
 * 말하기 조각(결과 말 셋 · '잘 말했어요'면 저절로 다음)을 문장마다 쓴다. 점수 · 영어로 말한 문장 수에 넣지 않는다. '건너뛰기'는
 * 언제나 있고, 마이크가 막히면(쓸 수 없음 · 멈춤 · 말소리 없음) 이 활동만 건너뛴다(쓰기 세션은 막지 않음).
 */
export function OwnRepeatActivity({
  sentences,
  env,
  phraseLevels,
  autoNextSeconds,
  limits,
  onDone,
}: {
  sentences: readonly string[];
  env: Omit<SpeakingEnv, "onSpeech">;
  phraseLevels: readonly number[];
  autoNextSeconds: number;
  limits: { maxRetries: number; silentItemsMax: number };
  onDone: (result: OwnRepeatResult) => void;
}) {
  const [index, setIndex] = useState(0);
  const heard = useRef<string[]>([]);
  const counters = useRef(speakingCountersStart());
  const finished = useRef(false);
  const finish = (result: OwnRepeatResult) => {
    if (finished.current) return;
    finished.current = true;
    onDone(result);
  };
  const withHeard = (): OwnRepeatResult =>
    heard.current.length > 0 ? { heard: [...heard.current] } : {};

  function onSpeech(event: SpeechEvent): SpeechVerdict {
    const step = speakingCounters(counters.current, event, limits);
    counters.current = step.state;
    const stop = ownRepeatStopOf(step.verdict);
    if (stop) {
      // 마이크를 쓸 수 없음은 기기 상태로 남긴다(홈의 말하기 · 회화 카드가 안다 — 검토 review-p11-5-code M-1, 7절)
      if (stop.markDevice)
        markMicUnavailable(event.type === "error" ? event.code : "");
      finish({ ...withHeard(), skipped: "no_mic" });
      return "none";
    }
    return step.verdict;
  }

  const text = sentences[index];
  if (text === undefined) return null;
  return (
    <div data-own-repeat={index} className="flex flex-col gap-4">
      <RepeatActivity
        key={index}
        text={text}
        env={{ ...env, onSpeech }}
        phraseLevels={phraseLevels}
        autoNextSeconds={autoNextSeconds}
        guide={WRITING_GUIDED_TEXT.ownRepeat}
        ringGapClassName={WRITING_CARD_GAP}
        onChange={() => {}}
        onDone={(input) => {
          heard.current.push(...input.heard);
          counters.current = speakingCounters(
            counters.current,
            { type: "next-activity" },
            limits,
          ).state;
          if (index + 1 < sentences.length) setIndex(index + 1);
          else finish(withHeard());
        }}
      />
      <SmallButton
        className="self-start"
        onClick={() => finish({ ...withHeard(), skipped: "chose_skip" })}
      >
        {WRITING_GUIDED_TEXT.skip}
      </SmallButton>
    </div>
  );
}
