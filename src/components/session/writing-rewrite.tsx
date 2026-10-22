"use client";

// 쓰기 6~12 둘째 세션 조각(3.3 쓰기 6~12 둘째 세션 행 · 4절 첫 문단 '첨삭처럼 내용이 많은 화면도 칭찬 → 교정 하나씩 → 고쳐 쓰기 순서로 한 번에
// 하나만' · AC-4c, plan-p11b 파일별 값 7 writing-rewrite · 정할 것 ㄹ · 위험 9 · plan-p11a 정본 밖 문구 표 b 행, 13절 C77 · C78).
// 칭찬('잘한 점') → 교정 하나씩('이렇게 고쳐 봐요' — 원문 · 수정 · 이유) → 고쳐 쓰기(초고를 채운 입력란 + 위에 교정 칩 '원문 → 수정',
// '다 고쳤어요') → 모범 답안(고쳐 쓰기를 낸 뒤에만 — 서버가 그때 돌려줌, 빈 글이면 틀이 건너뜀) → 내 글 소리 내어 읽기(쓰기 4~5 조각).
// 교정 수는 3.3 한도(6~9단계 2 · 10~12단계 3 — 첨삭 호출이 writing.max_corrections 로 막음)만큼이다. AI 글은 서버가 이름을 채움.
import { useEffect, useRef, useState } from "react";
import {
  CHILD_SIZE,
  EnglishLine,
  GuideLine,
} from "@/components/activities/common";
import { BigButton, StatusLine } from "@/components/board/board";
import {
  DRAFT_ROWS_MIN,
  INPUT_FOCUS,
  useDraftRows,
} from "@/components/session/writing-composition";
import { DRAFT_TEXT_MAX } from "@/core/writing/feedback";
import { cn } from "@/lib/utils";
import type { RewriteView } from "@/server/session";
import type { RewriteOutcome } from "@/server/writing";

/** 조각 글(정본 밖 문구 표 b 행 · 7절 네트워크 행 · 세션 틀 저장 실패 줄, C78). */
export const REWRITE_TEXT = {
  praise: "잘한 점",
  correction: "이렇게 고쳐 봐요",
  rewrite: "고쳐 쓰기",
  rewritten: "다 고쳤어요",
  model: "모범 답안",
  ownSpeak: "내 글을 소리 내어 읽어 봐요",
  next: "다음",
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  failed: "지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요",
} as const;

const wordsIn = (text: string) =>
  text.trim().split(/\s+/).filter(Boolean).length;

/** 고친 글을 문장으로 나눈다(내 글 소리 내어 읽기 — 마침표 · 물음표 · 느낌표 뒤). */
export function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 칭찬 화면('잘한 점' + 칭찬). */
export function FeedbackPraiseActivity({
  praise,
  onDone,
}: {
  praise: string;
  onDone: () => void;
}) {
  return (
    <div data-feedback-praise="" className="flex flex-col gap-6">
      <GuideLine className="font-bold">{REWRITE_TEXT.praise}</GuideLine>
      <p className="font-heading text-[28px] leading-snug">{praise}</p>
      <BigButton className="self-end" onClick={onDone}>
        {REWRITE_TEXT.next}
      </BigButton>
    </div>
  );
}

/** 교정 하나('이렇게 고쳐 봐요' — 원문 → 수정, 한국어 이유). */
export function FeedbackCorrectionActivity({
  correction,
  onDone,
}: {
  correction: RewriteView["corrections"][number];
  onDone: () => void;
}) {
  return (
    <div data-feedback-correction="" className="flex flex-col gap-6">
      <GuideLine className="font-bold">{REWRITE_TEXT.correction}</GuideLine>
      <div className="flex flex-col gap-2">
        <EnglishLine className="text-ink/70 line-through">
          {correction.original}
        </EnglishLine>
        <EnglishLine className="font-bold">{correction.corrected}</EnglishLine>
      </div>
      <GuideLine>{correction.reason}</GuideLine>
      <BigButton className="self-end" onClick={onDone}>
        {REWRITE_TEXT.next}
      </BigButton>
    </div>
  );
}

/** 활동 안 입력(이 기기에 되살림): 고쳐 쓰는 글 · 낸 시도 id. */
export type RewriteInput = { text?: string; attemptId?: string };

/** 고쳐 쓰기 1회(초고를 채운 입력란 + 위에 교정 칩, '다 고쳤어요' → 서버가 모범 답안을 돌려줌). */
export function RewriteActivity({
  draftText,
  corrections,
  initial,
  onChange,
  submit,
  onDone,
  onLeave,
}: {
  draftText: string;
  corrections: RewriteView["corrections"];
  initial?: RewriteInput;
  onChange: (value: RewriteInput) => void;
  /** 고쳐 쓰기 서버 액션(틀이 세션 · 활동 번호를 붙임). 닿지 못하면 던진다. */
  submit: (req: {
    clientAttemptId: string;
    text: string;
  }) => Promise<RewriteOutcome>;
  /** 낸 글과 모범 답안(빈 글이면 null). 끝 시도는 서버가 저장했다. */
  onDone: (text: string, modelAnswer: string | null) => void;
  onLeave: () => void;
}) {
  const [text, setText] = useState(initial?.text ?? draftText);
  const attemptId = useRef(initial?.attemptId);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [waitingOnline, setWaitingOnline] = useState(false);
  const box = useDraftRows(text);
  const count = wordsIn(text);

  async function send() {
    if (busy || count === 0) return;
    setBusy(true);
    setStatus("");
    setWaitingOnline(false);
    attemptId.current ??= crypto.randomUUID();
    onChange({ text, attemptId: attemptId.current });
    let out: RewriteOutcome;
    try {
      out = await submit({ clientAttemptId: attemptId.current, text });
    } catch {
      setBusy(false);
      setStatus(navigator.onLine ? REWRITE_TEXT.failed : REWRITE_TEXT.offline);
      setWaitingOnline(true);
      return;
    }
    setBusy(false);
    if (out.ok) {
      onDone(text, out.modelAnswer);
      return;
    }
    if (out.reason === "not_found") {
      onLeave();
      return;
    }
    setStatus(REWRITE_TEXT.failed);
  }
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    if (!waitingOnline) return;
    const retry = () => void sendRef.current();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [waitingOnline]);

  return (
    <div data-rewrite="" className="flex flex-col gap-5">
      <GuideLine className="font-bold">{REWRITE_TEXT.rewrite}</GuideLine>
      {corrections.length > 0 ? (
        // 교정 칩(작게 — 누르지 않는 글 상자, 영어는 24px)
        <ul data-rewrite-chips="" className="flex flex-wrap gap-3">
          {corrections.map((c) => (
            <li
              key={`${c.original}→${c.corrected}`}
              lang="en"
              className={cn(
                CHILD_SIZE.english,
                "rounded-lg border-2 border-dashed border-ink/60 bg-paper px-3 py-1",
              )}
            >
              <span className="line-through">{c.original}</span>
              {" → "}
              <span className="font-bold">{c.corrected}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <textarea
        ref={box}
        data-rewrite-text=""
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
        {REWRITE_TEXT.rewritten}
      </BigButton>
    </div>
  );
}

/** 모범 답안(고쳐 쓰기를 낸 뒤에만). */
export function ModelAnswerActivity({
  text,
  onDone,
}: {
  text: string;
  onDone: () => void;
}) {
  return (
    <div data-model-answer-view="" className="flex flex-col gap-6">
      <GuideLine className="font-bold">{REWRITE_TEXT.model}</GuideLine>
      <EnglishLine>{text}</EnglishLine>
      <BigButton className="self-end" onClick={onDone}>
        {REWRITE_TEXT.next}
      </BigButton>
    </div>
  );
}
