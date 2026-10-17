"use client";

// 쓴 답 조각(plan-p10a 파일별 값 11 · 정할 것 카): 받아쓰기는 앱 안 영문 자판(a~z · '지우기' · '띄우기', 기기 자판을 띄우지 않음 —
// 4절 쓰기 '1~3단계는 … 앱 안 영문 자판만')과 '다시 듣기', 빈칸 채우기 · 문장 고치기는 입력란(자동 수정 · 자동 대문자 ·
// 맞춤법 검사 · 단어 추천 끔 — 4절). 채점하지 않고 '다음'에서 onAnswer 하나로 쓴 글을 넘긴다(비교 정규화는 check.ts).
import { useId, useState } from "react";
import {
  CHILD_SIZE,
  EnglishLine,
  FrameText,
} from "@/components/activities/common";
import { BigButton, FOCUS_RING, SmallButton } from "@/components/board/board";
import type { Answer } from "@/core/answer/check";
import type { DisplayItem } from "@/core/answer/display";
import type { SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";
import { ANSWER_TEXT, SoundButton } from "./choice";

/** 자판 단추 글(정본 밖 문구 표 쓰기 조각 행, C72). */
export const KEYBOARD_TEXT = {
  erase: "지우기",
  space: "띄우기",
} as const;

/** 자판 줄(영문 소문자, 화면 꼴 상수). */
const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"] as const;
/** 받아쓰기 글자 수 상한(기술 값 — 서버 입력 상한보다 작게). */
const DICTATION_MAX = 40;
/** 입력란 글자 수 상한(기술 값). */
const TYPED_MAX = 200;

type TypingItem = Extract<
  DisplayItem,
  { type: "dictation" | "fill-blank" | "fix-sentence" }
>;

const KEY_FRAME = cn(
  CHILD_SIZE.target,
  FOCUS_RING,
  "flex items-center justify-center rounded-lg border-2 border-ink bg-paper font-bold text-[22px] text-ink disabled:cursor-not-allowed",
);

function AppKeyboard({
  disabled,
  onKey,
  onErase,
  onSpace,
}: {
  disabled: boolean;
  onKey: (letter: string) => void;
  onErase: () => void;
  onSpace: () => void;
}) {
  return (
    <div data-app-keyboard="" className="flex flex-col items-center gap-2">
      {KEY_ROWS.map((row) => (
        <div key={row} className="flex gap-1.5">
          {[...row].map((letter) => (
            <button
              key={letter}
              type="button"
              data-touch=""
              data-key={letter}
              lang="en"
              disabled={disabled}
              onClick={() => onKey(letter)}
              className={cn(KEY_FRAME, "w-14")}
            >
              {letter}
            </button>
          ))}
        </div>
      ))}
      <div className="flex gap-3">
        <SmallButton disabled={disabled} onClick={onSpace} className="min-w-48">
          {KEYBOARD_TEXT.space}
        </SmallButton>
        <SmallButton disabled={disabled} onClick={onErase}>
          {KEYBOARD_TEXT.erase}
        </SmallButton>
      </div>
    </div>
  );
}

export function TypingAnswer({
  item,
  speech,
  disabled = false,
  onAnswer,
}: {
  item: TypingItem;
  speech?: SpeechPort;
  disabled?: boolean;
  onAnswer: (answer: Answer) => void;
}) {
  const [text, setText] = useState("");
  const inputId = useId();
  const ready = text.trim() !== "";
  const submit = () => {
    if (ready) onAnswer({ kind: "text", text });
  };

  if (item.type === "dictation") {
    return (
      <div className="flex flex-col gap-6">
        <SoundButton speech={speech} text={item.audioText} />
        <output
          data-typed=""
          lang="en"
          aria-live="polite"
          className={cn(
            CHILD_SIZE.english,
            "flex min-h-16 w-full items-center rounded-xl border-2 border-dashed border-ink bg-white px-5 font-bold whitespace-pre",
          )}
        >
          {text}
        </output>
        <AppKeyboard
          disabled={disabled}
          onKey={(letter) =>
            setText((t) => (t.length < DICTATION_MAX ? t + letter : t))
          }
          onErase={() => setText((t) => t.slice(0, -1))}
          onSpace={() =>
            setText((t) =>
              t.length < DICTATION_MAX && t !== "" && !t.endsWith(" ")
                ? `${t} `
                : t,
            )
          }
        />
        <BigButton
          className="self-end"
          disabled={disabled || !ready}
          onClick={submit}
        >
          {ANSWER_TEXT.next}
        </BigButton>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {/* 입력란의 읽히는 이름은 문항 글(새 문구 없이) */}
      <div id={`${inputId}-prompt`}>
        {item.type === "fill-blank" ? (
          <FrameText frame={item.prompt} />
        ) : (
          <EnglishLine className="font-bold">{item.prompt}</EnglishLine>
        )}
      </div>
      <input
        id={inputId}
        aria-labelledby={`${inputId}-prompt`}
        data-touch=""
        lang="en"
        value={text}
        maxLength={TYPED_MAX}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        className={cn(
          CHILD_SIZE.english,
          CHILD_SIZE.target,
          FOCUS_RING,
          "w-full rounded-xl border-2 border-ink bg-white px-5",
        )}
      />
      <BigButton
        type="submit"
        className="self-end"
        disabled={disabled || !ready}
      >
        {ANSWER_TEXT.next}
      </BigButton>
    </form>
  );
}
