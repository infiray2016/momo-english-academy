"use client";

// 보여 주기(가르치고 배우는 수업 plan 묶음 라-1 · spec 설계 1 자리 2 · 5 화면 표 '보여 주기: 새 단어' · '보여 주기: 본보기' · 6 preview[].parts ·
// teach.models[], 표본 R2~R5 · W2~W5 · S2~S4).
// - 새 단어: 낱말 카드(낱말 · 뜻 · 소리 표시 · 그림이 있으면 그림 · parts 가 있으면 띄워 보임), 예문은 없다(C170 (3)). 낱말을 차례로 읽고
//   선생님 한 줄 '새 낱말 다섯이에요. 누르면 다시 들려요.'. 카드를 누르면 그 낱말을 다시 읽는다(선생님 영어).
// - 본보기: 문장과 칩(선생님 한 줄에 맞춰 켜짐), 뜻(반말), 그림이 있으면 그림. 쓰기는 앞 꼴(fromEn)을 위에, 말하기는 이야기(들은 뒤 보임) ·
//   질문(칩이 온 자리 from) · 낱말 답(작게)을 위에 둔다. 본보기 → 선생님 한 줄 차례로 읽는다(설계 5 '들리는 것').
// 두 화면 모두 읽기가 끝나면 '다음'이 밝아진다(설계 5 · 10, AC-N20). 조각은 자료와 콜백만 받는다.
import { ArrowDown, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CHILD_SIZE,
  EnglishLine,
  GuideLine,
  ICON_STROKE,
  type PictureInfo,
} from "@/components/activities/common";
import { AnswerPicture } from "@/components/answer/choice";
import { BigButton, FOCUS_RING } from "@/components/board/board";
import {
  CHIP_NAME,
  type ChipData,
  ChipSentence,
  keyedByText,
} from "@/components/session/teach/chips";
import {
  type LinePart,
  TEACH_TEXT,
  TeacherLine,
  type TeachLineEnd,
  type TeachLineView,
  type TeachSpeechSettings,
  useTeachLine,
  voicedSpeech,
} from "@/components/session/teach/teacher-line";
import {
  chipLightOf,
  chipsLitOf,
  lineProgressOf,
} from "@/core/session/teach-line";
import type { TeacherView } from "@/core/teacher/roster";
import type { SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";

/** 칩 켜짐을 다시 재는 간격(ms, 화면 꼴 상수 — 움직임 단위). */
const CHIP_TICK_MS = 100;

// ── 새 단어 ──────────────────────────────────────────────────────

/** 새 단어 카드 하나(시드 preview[] 의 word · meaningKo · parts + 부르는 쪽이 찾은 그림). 예문은 받지 않는다. */
export type NewWordCard = {
  word: string;
  meaningKo: string;
  parts?: readonly string[] | undefined;
  picture?: PictureInfo | undefined;
};

/** 읽을 토막: 낱말 차례로(선생님 영어) → 선생님 한 줄. */
export function newWordsPartsOf(cards: readonly NewWordCard[]): LinePart[] {
  return [
    ...cards.map((card) => ({ text: card.word, voice: "teacher_en" as const })),
    { text: TEACH_TEXT.newWords(cards.length), voice: "teacher_ko" },
  ];
}

/** 낱말 글(parts 가 있으면 조각을 띄워 보임 — bed room). 보조 기술은 숨긴 낱말 하나(sr-only)로 읽는다. */
function WordText({ card }: { card: NewWordCard }) {
  if (!card.parts || card.parts.length < 2)
    return (
      <span lang="en" className={cn(CHILD_SIZE.english, "font-bold")}>
        {card.word}
      </span>
    );
  return (
    <span
      lang="en"
      data-word-parts={card.parts.join("·")}
      className={cn(CHILD_SIZE.english, "inline-flex gap-2 font-bold")}
    >
      <span className="sr-only">{card.word}</span>
      {keyedByText(card.parts.map((text) => ({ text }))).map(
        ({ key, item }) => (
          <span key={key} aria-hidden>
            {item.text}
          </span>
        ),
      )}
    </span>
  );
}

export function NewWordsView({
  cards,
  teacher,
  line,
  onListen,
  onNext,
}: {
  cards: readonly NewWordCard[];
  teacher: TeacherView | null;
  line: TeachLineView;
  onListen: (word: string) => void;
  onNext: () => void;
}) {
  return (
    <section
      data-teach-slot="show"
      data-teach-show="words"
      className="flex flex-1 flex-col gap-6"
    >
      <TeacherLine
        teacher={teacher}
        lineKo={TEACH_TEXT.newWords(cards.length)}
        line={line}
      />
      <ul className="flex flex-col gap-3">
        {cards.map((card) => (
          <li key={card.word}>
            <button
              type="button"
              data-touch=""
              data-new-word={card.word}
              onClick={() => onListen(card.word)}
              className={cn(
                CHILD_SIZE.target,
                FOCUS_RING,
                "flex w-full items-center gap-4 rounded-card border-(length:--paper-edge) border-ink bg-paper px-5 py-3 text-left text-ink",
              )}
            >
              <Volume2
                aria-hidden
                className="size-8 shrink-0"
                strokeWidth={ICON_STROKE}
              />
              <WordText card={card} />
              <span className={CHILD_SIZE.guide}>{card.meaningKo}</span>
              {card.picture ? (
                <span className="ml-auto">
                  <AnswerPicture picture={card.picture} />
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <BigButton
        className="mt-auto self-end"
        data-teach-action="next"
        disabled={!line.bright}
        onClick={onNext}
      >
        {TEACH_TEXT.next}
      </BigButton>
    </section>
  );
}

/** 새 단어 화면. onNext 는 '다음'을 누른 때. */
export function NewWordsScreen({
  cards,
  teacher,
  speech,
  speechSettings,
  onLineEnd,
  onNext,
}: {
  cards: readonly NewWordCard[];
  teacher: TeacherView | null;
  speech: SpeechPort | undefined;
  speechSettings: TeachSpeechSettings;
  /** 선생님 줄이 멈춘 때 한 번(notice — 세션 틀이 무음 모드 줄 셈에 쓴다, 설계 10). */
  onLineEnd?: (end: TeachLineEnd) => void;
  onNext: () => void;
}) {
  const line = useTeachLine({
    parts: newWordsPartsOf(cards),
    speech,
    teacher,
    skipNoticeMs: speechSettings.skipNoticeMs,
    onEnd: onLineEnd,
  });
  return (
    <NewWordsView
      cards={cards}
      teacher={teacher}
      line={line}
      onListen={(word) => {
        if (!speech) return;
        speech.unlockFromGesture();
        void voicedSpeech(speech, teacher).speak(word);
      }}
      onNext={onNext}
    />
  );
}

// ── 본보기 ──────────────────────────────────────────────────────

/** 본보기 시드 칸(teach.models[] — 쓰기 fromEn, 말하기 storyEn · questionEn · wordAnswerEn, 칩 from). */
export type ModelData = {
  en: string;
  ko: string;
  chips: readonly (ChipData & { from?: string | undefined })[];
  lineKo: string;
  fromEn?: string | undefined;
  storyEn?: string | undefined;
  questionEn?: string | undefined;
  wordAnswerEn?: string | undefined;
};

/**
 * 읽을 토막(설계 5 '본보기 → 선생님 한 줄', 표본 S3 '이야기 → 질문 → 낱말 답 → 문장 답 → 선생님'): 이야기(글 자료) → 질문 → 낱말 답 →
 * 앞 꼴 → 본보기(선생님 영어) → 선생님 한 줄(한국어).
 */
export function modelPartsOf(model: ModelData): LinePart[] {
  const parts: LinePart[] = [];
  if (model.storyEn) parts.push({ text: model.storyEn, voice: "material" });
  for (const text of [model.questionEn, model.wordAnswerEn, model.fromEn])
    if (text) parts.push({ text, voice: "teacher_en" });
  parts.push({ text: model.en, voice: "teacher_en" });
  parts.push({ text: model.lineKo, voice: "teacher_ko" });
  return parts;
}

/** 칩이 온 질문 쪽 덩어리(from 이 있는 칩만, 말하기 본보기 2). */
function questionChipsOf(model: ModelData): ChipData[] {
  return model.chips.flatMap((chip) =>
    chip.from ? [{ text: chip.from, role: chip.role }] : [],
  );
}

export function ModelView({
  model,
  picture,
  teacher,
  line,
  chipLit,
  storyShown,
  onNext,
}: {
  model: ModelData;
  picture?: PictureInfo | undefined;
  teacher: TeacherView | null;
  line: TeachLineView;
  /** 칩마다 켜짐(model.chips 차례). */
  chipLit: readonly boolean[];
  /** 이야기를 들은 뒤인가(이야기 글은 들은 뒤에 보인다, 표본 S3). */
  storyShown: boolean;
  onNext: () => void;
}) {
  const fromChips = questionChipsOf(model);
  return (
    <section
      data-teach-slot="show"
      data-teach-show="model"
      className="flex flex-1 flex-col gap-6"
    >
      <TeacherLine teacher={teacher} lineKo={model.lineKo} line={line} />
      <div
        data-teach-model=""
        className="flex flex-col gap-4 rounded-card border-(length:--paper-edge) border-ink bg-paper px-6 py-5 text-ink"
      >
        {model.storyEn && storyShown ? (
          <EnglishLine>{model.storyEn}</EnglishLine>
        ) : null}
        {model.questionEn ? (
          fromChips.length > 0 ? (
            <ChipSentence sentence={model.questionEn} chips={fromChips} />
          ) : (
            <EnglishLine>{model.questionEn}</EnglishLine>
          )
        ) : null}
        {model.wordAnswerEn ? (
          <EnglishLine className="text-ink-soft">
            {model.wordAnswerEn}
          </EnglishLine>
        ) : null}
        {model.fromEn ? (
          <span className="flex items-center gap-3 text-ink-soft">
            <EnglishLine>{model.fromEn}</EnglishLine>
            <ArrowDown
              aria-hidden
              className="size-7 shrink-0"
              strokeWidth={ICON_STROKE}
            />
          </span>
        ) : null}
        <div className="flex flex-wrap items-center gap-6">
          <ChipSentence sentence={model.en} chips={model.chips} lit={chipLit} />
          {picture ? <AnswerPicture picture={picture} /> : null}
        </div>
        <GuideLine>{model.ko}</GuideLine>
      </div>
      <BigButton
        className="mt-auto self-end"
        data-teach-action="next"
        disabled={!line.bright}
        onClick={onNext}
      >
        {TEACH_TEXT.next}
      </BigButton>
    </section>
  );
}

/** 칩 이름 찾기(시드 role → 화면 이름). */
const chipNameOf = (role: string) =>
  CHIP_NAME[role as keyof typeof CHIP_NAME] ?? role;

/** 본보기 화면. picture 는 부르는 쪽이 그림 키(model.picture)로 찾은 그림. onNext 는 '다음'을 누른 때. */
export function ModelScreen({
  model,
  picture,
  teacher,
  speech,
  speechSettings,
  onLineEnd,
  onNext,
}: {
  model: ModelData;
  picture?: PictureInfo | undefined;
  teacher: TeacherView | null;
  speech: SpeechPort | undefined;
  speechSettings: TeachSpeechSettings;
  /** 선생님 줄이 멈춘 때 한 번(notice — 세션 틀이 무음 모드 줄 셈에 쓴다, 설계 10). */
  onLineEnd?: (end: TeachLineEnd) => void;
  onNext: () => void;
}) {
  const parts = modelPartsOf(model);
  const koIndex = parts.length - 1;
  const line = useTeachLine({
    parts,
    speech,
    teacher,
    skipNoticeMs: speechSettings.skipNoticeMs,
    onEnd: onLineEnd,
  });
  const koStartedAt = line.startedAt[koIndex];
  const koDone = line.bright || line.done > koIndex;
  const [now, setNow] = useState(0);
  // 한국어 줄을 읽는 동안만 시계를 돌려 칩을 켠다
  useEffect(() => {
    if (koStartedAt === undefined || koDone) return;
    setNow(performance.now());
    const timer = setInterval(() => setNow(performance.now()), CHIP_TICK_MS);
    return () => clearInterval(timer);
  }, [koStartedAt, koDone]);
  const marks = chipLightOf(model.chips, model.lineKo, chipNameOf);
  const chipLit = chipsLitOf(
    marks,
    koDone
      ? "done"
      : lineProgressOf({
          text: model.lineKo,
          startedAt: koStartedAt,
          now,
          speech: speechSettings,
        }),
  );
  return (
    <ModelView
      model={model}
      picture={picture}
      teacher={teacher}
      line={line}
      chipLit={chipLit}
      storyShown={line.bright || line.done >= 1}
      onNext={onNext}
    />
  );
}
