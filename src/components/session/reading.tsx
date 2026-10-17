"use client";

// 읽기 세션 조각(3.3 읽기 '지문 읽기(읽어 주기 · 단어를 누르면 뜻) → 객관식 이해 문제 → 틀린 문제 해설과 다시 풀기' · AC-3a,
// plan-p11a 값 9 · 정할 것 마 (1) · 사 · 13절 C77 (1) · C78). 채점은 차례 1 의 같은 순수 함수(checkAnswer)로 바로 하고, 서버가
// 저장 때 같은 함수로 다시 채점한다(위험 2). 조각은 끝을 onDone(끝 내용) 하나로 알리고, 활동 안 입력은 onChange 로 넘겨 틀이
// 기기에 쓴다(값 6). 지문은 '읽어 주기'를 누를 때만 읽는다(저절로 읽지 않음). 문항 활동의 지문 보기에는 그림 줄이 없다
// (그림이 정답을 가리키지 않게 — 컨트롤러 결정, 장부 P8 행). 정본 밖 문구는 plan 표(C78) 글자 그대로.
import { Volume2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CHILD_SIZE,
  EnglishLine,
  GuideLine,
  type PictureInfo,
  type PictureLookup,
  VocabPicture,
} from "@/components/activities/common";
import {
  type GlossaryEntry,
  ReadingPassage,
} from "@/components/activities/reading";
import { AnswerPicture } from "@/components/answer/choice";
import {
  BigButton,
  FOCUS_RING,
  SELECTED_RING,
  SelectedMark,
  SmallButton,
  StatusLine,
} from "@/components/board/board";
import { checkAnswer } from "@/core/answer/check";
import type { ReadingQuestion } from "@/core/seed/schema/lesson";
import type { SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";

/** 틀린 보기 표(✕)의 선 굵기 — 고른 표시(SelectedMark 체크)와 같은 굵기(화면 꼴 값). */
const MARK_STROKE = 3;

/** 조각 글(4절 · 3.3 · 정본 밖 문구 표 a 행, C78). */
export const READING_TEXT = {
  next: "다음",
  tapHint: "모르는 단어를 누르면 뜻이 보여요",
  readAloud: "읽어 주기",
  right: "맞았어요!",
  answerIs: "정답은 이거예요",
  tryAgain: "한 번 더 풀기",
  showPassage: "지문 보기",
  close: "닫기",
} as const;

/** '읽어 주기': 누르면 지문 전체를 읽고, 읽는 중에 다시 누르면 멈춘다. 저절로 읽지 않는다(정할 것 사). */
export function ReadAloudButton({
  speech,
  text,
}: {
  speech: SpeechPort | undefined;
  text: string;
}) {
  const [speaking, setSpeaking] = useState(false);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      speech?.cancelSpeaking();
    };
  }, [speech]);
  return (
    <SmallButton
      className="self-start"
      data-read-aloud=""
      aria-pressed={speaking}
      disabled={!speech}
      onClick={() => {
        if (!speech) return;
        speech.unlockFromGesture();
        if (speaking) {
          speech.cancelSpeaking();
          setSpeaking(false);
          return;
        }
        setSpeaking(true);
        void speech.speak(text).then(() => {
          if (live.current) setSpeaking(false);
        });
      }}
    >
      <Volume2 aria-hidden className="size-7" />
      {READING_TEXT.readAloud}
    </SmallButton>
  );
}

export type PassageInput = { tappedWords: string[] };

/**
 * 지문 그림 하나 — 파일을 못 열면 수업 지문은 뜻 글 점선 상자(data-picture-missing), 평가 지문(꾸밈 그림)은 그리지 않는다
 * (P10 AnswerPicture 와 같은 깨짐 대체, 화면 검토 I-2).
 */
export function SafePicture({
  picture,
  decorative,
}: {
  picture: PictureInfo;
  decorative: boolean;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
    if (!picture.src) return;
    const probe = new window.Image();
    probe.onerror = () => setBroken(true);
    probe.src = picture.src;
    return () => {
      probe.onerror = null;
    };
  }, [picture.src]);
  if (broken && decorative) return null;
  return (
    <VocabPicture
      picture={
        broken
          ? { meaningKo: picture.meaningKo, catalogued: picture.catalogued }
          : picture
      }
      decorative={decorative}
    />
  );
}

type OpenNote = {
  at: number;
  meaningKo: string;
  align: "start" | "end";
  shift: number;
  /** 자리를 다 쟀는가(잰 뒤에는 다시 재지 않는다 — 크기가 바뀌면 다시). */
  placed: boolean;
};

/** 지문 활동: 그림 줄 · 새 단어 표시(P5b 그대로) · '읽어 주기' · 아무 글로서리 낱말이나 누르면 그 위에 뜻 쪽지. 누른 원형을 모은다. */
export function PassageActivity({
  passage,
  glossary,
  markWords,
  pictureWords,
  level,
  pictures,
  speech,
  initial,
  onChange,
  onDone,
}: {
  passage: string;
  glossary: readonly GlossaryEntry[];
  markWords: readonly string[];
  pictureWords: readonly string[];
  level: number;
  pictures: PictureLookup;
  speech: SpeechPort | undefined;
  initial?: PassageInput;
  onChange: (input: PassageInput) => void;
  onDone: (input: PassageInput) => void;
}) {
  const [tapped, setTapped] = useState<string[]>(initial?.tappedWords ?? []);
  const [open, setOpen] = useState<OpenNote>();
  const rootRef = useRef<HTMLDivElement>(null);

  // 쪽지 자리(화면 검토 I-3): 낱말이 카드 오른쪽 반이면 오른쪽 끝을 맞추고, 그래도 카드를 넘으면 카드 안으로 당긴다
  useLayoutEffect(() => {
    if (!open || open.placed) return;
    const root = rootRef.current;
    const button = root?.querySelector<HTMLElement>(
      '[data-word-tap][aria-expanded="true"]',
    );
    const note = root?.querySelector<HTMLElement>("[data-word-note]");
    const card = root?.closest<HTMLElement>("[data-activity-card]") ?? root;
    if (!button || !note || !card) return;
    const c = card.getBoundingClientRect();
    const b = button.getBoundingClientRect();
    const align = b.left + b.width / 2 > c.left + c.width / 2 ? "end" : "start";
    if (align !== open.align) {
      setOpen({ ...open, align, shift: 0 });
      return;
    }
    const n = note.getBoundingClientRect();
    const shift =
      n.right > c.right
        ? c.right - n.right
        : n.left < c.left
          ? c.left - n.left
          : 0;
    setOpen({ ...open, shift, placed: true });
  }, [open]);

  // 화면 크기가 바뀌면 다시 잰다 · 쪽지 밖(지문 빈 곳 · 카드 · 다른 곳)을 누르면 닫는다(화면 검토 M-4)
  const isOpen = open !== undefined;
  useEffect(() => {
    if (!isOpen) return;
    const remeasure = () =>
      setOpen((o) =>
        o ? { ...o, align: "start", shift: 0, placed: false } : o,
      );
    const outside = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest("[data-word-tap], [data-word-note]"))
        setOpen(undefined);
    };
    window.addEventListener("resize", remeasure);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("resize", remeasure);
      document.removeEventListener("pointerdown", outside);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="flex flex-col gap-5" data-passage-activity="">
      <GuideLine>{READING_TEXT.tapHint}</GuideLine>
      <ReadAloudButton speech={speech} text={passage} />
      <ReadingPassage
        passage={passage}
        glossary={glossary}
        markWords={markWords}
        pictureWords={pictureWords}
        level={level}
        pictures={pictures}
        readAloud={false}
        openWord={open}
        renderPicture={(picture, decorative) => (
          <SafePicture picture={picture} decorative={decorative} />
        )}
        onWordTap={(entry, at) => {
          setOpen(
            open?.at === at
              ? undefined
              : {
                  at,
                  meaningKo: entry.meaningKo,
                  align: "start",
                  shift: 0,
                  placed: false,
                },
          );
          if (!tapped.includes(entry.lemma)) {
            const next = [...tapped, entry.lemma];
            setTapped(next);
            onChange({ tappedWords: next });
          }
        }}
      />
      <BigButton
        className="self-end"
        onClick={() => onDone({ tappedWords: tapped })}
      >
        {READING_TEXT.next}
      </BigButton>
    </div>
  );
}

export type QuestionInput = { tries: number[]; retrying?: boolean };

type Stage = "ask" | "right" | "wrong" | "reveal";

function stageOf(
  tries: readonly number[],
  answerNo: number,
  retrying: boolean,
): Stage {
  if (tries.length === 0) return "ask";
  if (tries.length >= 2) return "reveal";
  if (tries[0] === answerNo) return "right";
  return retrying ? "ask" : "wrong";
}

/** 문항 활동 지문 보기: 글과 '읽어 주기'만(그림 줄 없음). */
function PassageText({
  passage,
  speech,
}: {
  passage: string;
  speech: SpeechPort | undefined;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ReadAloudButton speech={speech} text={passage} />
      <p lang="en" className={cn(CHILD_SIZE.english, "leading-relaxed")}>
        {passage}
      </p>
    </div>
  );
}

/** 세로 화면의 '지문 보기' 쪽지(덮개 · Esc · '닫기'). 열리면 '닫기'로 초점을 옮긴다. */
function PassageSheet({
  passage,
  speech,
  onClose,
}: {
  passage: string;
  speech: SpeechPort | undefined;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={READING_TEXT.showPassage}
      data-passage-sheet=""
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6 outline-none"
    >
      <div className="flex max-h-[85dvh] w-full max-w-2xl flex-col gap-5 overflow-y-auto rounded bg-paper p-8 text-ink shadow-postit">
        <PassageText passage={passage} speech={speech} />
        <SmallButton autoFocus className="self-end" onClick={onClose}>
          {READING_TEXT.close}
        </SmallButton>
      </div>
    </div>
  );
}

function OptionButton({
  question,
  no,
  pictures,
  state,
  disabled,
  onPick,
}: {
  question: ReadingQuestion;
  no: number;
  pictures: PictureLookup;
  /** picked-right 고른 정답 · picked-wrong 고른 오답 · answer 정답 표시 · none. */
  state: "picked-right" | "picked-wrong" | "answer" | "none";
  disabled: boolean;
  onPick: () => void;
}) {
  const option = question.options[no - 1] ?? "";
  return (
    <button
      type="button"
      data-touch=""
      data-answer-choice={no}
      data-choice-state={state}
      aria-pressed={state === "picked-right" || state === "picked-wrong"}
      disabled={disabled}
      onClick={onPick}
      className={cn(
        CHILD_SIZE.choice,
        CHILD_SIZE.target,
        FOCUS_RING,
        "relative flex w-full items-center gap-3 rounded-xl border-2 border-ink bg-paper px-5 py-3 text-left text-ink disabled:cursor-default",
        question.kind === "picture" && "justify-center",
        // 가로 화면은 문항 칸이 좁아 그림 보기 2 × 2 가 '다음'을 보는 창 아래로 민다 — 그림 칸을 줄인다(누르는 곳 56 · 글자 24 는 그대로, 화면 검토 I-1)
        question.kind === "picture" &&
          "landscape:py-2 landscape:[&_[data-picture-missing]]:size-28 landscape:[&_img]:size-28",
        state !== "none" && SELECTED_RING,
        state === "picked-wrong" && "opacity-70",
      )}
    >
      {question.kind === "picture" ? (
        <AnswerPicture picture={pictures.ofWord(option)} />
      ) : (
        <span lang="en">{option}</span>
      )}
      {state === "picked-right" || state === "answer" ? <SelectedMark /> : null}
      {state === "picked-wrong" ? (
        <span
          aria-hidden
          className="absolute -top-3 -right-3 flex size-9 items-center justify-center rounded-full border-2 border-ink bg-paper text-ink"
        >
          <X className="size-6" strokeWidth={MARK_STROKE} />
        </span>
      ) : null}
    </button>
  );
}

/**
 * 문항 활동(C77 (1)): 고르면 바로 채점. 맞으면 '맞았어요!' + 해설 + '다음'. 처음 틀리면 해설 + '한 번 더 풀기'(정답은 아직 안 보임) →
 * 둘째 고름 뒤 정답을 표시하고 '다음'(둘째는 점수 없음 — 점수는 첫 시도). 지문: 가로 화면은 지문 칸 · 문항 칸 나란히(지문 칸 안 세로
 * 넘김), 세로 화면은 문항 위 '지문 보기' → 쪽지.
 */
export function QuestionActivity({
  question,
  passage,
  pictures,
  speech,
  initial,
  onChange,
  onDone,
}: {
  question: ReadingQuestion;
  passage: string;
  pictures: PictureLookup;
  speech: SpeechPort | undefined;
  initial?: QuestionInput;
  onChange: (input: QuestionInput) => void;
  onDone: (input: { tries: number[] }) => void;
}) {
  const [tries, setTries] = useState<number[]>(initial?.tries ?? []);
  const [retrying, setRetrying] = useState(initial?.retrying ?? false);
  const [sheet, setSheet] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const stage = stageOf(tries, question.answerNo, retrying);
  const correctOf = (no: number) =>
    checkAnswer(
      { type: question.type, answerNo: question.answerNo },
      { kind: "choice", no },
      { homophones: [] },
    ).correct;

  // 고른 보기는 끝까지 표시를 남긴다 — 다시 고를 때 · 정답 보기에서도 처음 고른 오답은 ✕(고를 수 없음, 화면 검토 M-1)
  const stateOf = (no: number) => {
    if (stage === "reveal" && no === question.answerNo)
      return tries.includes(no) ? "picked-right" : "answer";
    if (!tries.includes(no)) return "none";
    return correctOf(no) ? "picked-right" : "picked-wrong";
  };

  function pick(no: number) {
    if (stage !== "ask") return;
    const next = [...tries, no];
    setTries(next);
    setRetrying(false);
    onChange({ tries: next, retrying: false });
  }

  const lastRight = tries.length > 0 && correctOf(tries.at(-1) ?? 0);
  return (
    <div
      data-question-stage={stage}
      className="grid gap-6 landscape:grid-cols-2 landscape:items-start"
    >
      {/* 가로: 지문 칸(세로 넘김) */}
      <div
        data-passage-pane=""
        className="hidden max-h-[60dvh] overflow-y-auto rounded-xl bg-paper p-5 landscape:flex landscape:flex-col"
      >
        <PassageText passage={passage} speech={speech} />
      </div>
      <div className="flex flex-col gap-5">
        <SmallButton
          ref={opener}
          className="self-start landscape:hidden"
          data-show-passage=""
          onClick={() => setSheet(true)}
        >
          {READING_TEXT.showPassage}
        </SmallButton>
        <EnglishLine className="font-bold">{question.prompt}</EnglishLine>
        <ol
          className={cn(
            "grid gap-4",
            question.kind === "picture" ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          {question.options.map((_, i) => {
            const no = i + 1;
            const state = stateOf(no);
            return (
              // 보기 차례는 시드 그대로라 번호가 열쇠다
              // biome-ignore lint/suspicious/noArrayIndexKey: 보기 번호(1부터)가 곧 답이다
              <li key={i}>
                <OptionButton
                  question={question}
                  no={no}
                  pictures={pictures}
                  state={state}
                  disabled={stage !== "ask" || state === "picked-wrong"}
                  onPick={() => pick(no)}
                />
              </li>
            );
          })}
        </ol>
        {stage === "right" || (stage === "reveal" && lastRight) ? (
          <StatusLine tone="ok">{READING_TEXT.right}</StatusLine>
        ) : null}
        {stage === "reveal" && !lastRight ? (
          <StatusLine>{READING_TEXT.answerIs}</StatusLine>
        ) : null}
        {/* 다시 고르는 동안에도 해설을 남긴다(화면 검토 M-2) */}
        {tries.length > 0 ? (
          <div data-explanation="">
            <GuideLine>{question.explanationKo}</GuideLine>
          </div>
        ) : null}
        {stage === "wrong" ? (
          <BigButton
            className="self-end"
            onClick={() => {
              setRetrying(true);
              onChange({ tries, retrying: true });
            }}
          >
            {READING_TEXT.tryAgain}
          </BigButton>
        ) : null}
        {stage === "right" || stage === "reveal" ? (
          <BigButton className="self-end" onClick={() => onDone({ tries })}>
            {READING_TEXT.next}
          </BigButton>
        ) : null}
      </div>
      {sheet ? (
        <PassageSheet
          passage={passage}
          speech={speech}
          onClose={() => {
            setSheet(false);
            opener.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}
