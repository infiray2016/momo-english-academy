"use client";

// 쓰기 1~3 세션 조각(3.3 쓰기 1~3 행 '고르기 · 베끼기 · 조립, 틀리면 정답을 보여 주고 다시, AI 없음' · AC-4a, plan-p11a 값 11 ·
// 정할 것 마 (2) · 사 · 13절 C73 · C77 (2) · C78, 목업 B_W1_Words · B_W3_Order). 갈래마다 안내 줄 + P10 답 조각(고르기 ·
// 글자 타일 · 낱말 카드 · 앱 안 자판). 판정은 서버와 같은 checkAnswer(위험 2). 맞으면 '맞았어요!'와 낱말 · 뜻 두 줄 + '다음',
// 틀리면 '정답은 이거예요'와 정답(타일 · 카드 차례 그대로) + '한 번 더 풀기' → 맞힐 때까지(점수는 첫 시도). 끝 내용은 { tries }.
// 기기 자판을 띄우는 요소(input · textarea · contenteditable)를 두지 않는다(AC-4a — 받아쓰기는 앱 안 자판). 받아쓰기 · 빈 글자
// 채우기는 들어올 때 낱말을 한 번 읽는다(답 조각의 '다시 듣기'). 활동 안 입력(시도 · 지금 놓은 것)은 onChange 로 넘긴다(값 6).
// 가르치는 수업(teach 칸이 있는 수업, 가르치고 배우는 수업 plan 묶음 라-2 · 델타 spec 설계 1 '틀린 뒤 차례' 쓰기 행 · 5 화면 표 · 정한 것 8,
// 정본 15절 AC-3d · 표본 W9 · W10 · W11): 처음 틀리면 정답을 보이지 않고 같은 문항 위에 '왜' 한 줄(writingWhyOf — 차례는 시드 whyKo, 대문자 ·
// 마침표는 앱 문구) + '한 번 더 하기', 같은 문제 다시는 칸의 칩(색 칸)을 켜고 대문자 단추를 반짝인다. 둘째도 틀리면 그때 정답을 보이고 그대로
// 놓게 한다(지금 규칙 — 맞힐 때까지). 짝은 처음 맞으면 '혼자 해냈어요!', 틀리면 바른 답과 짝의 '왜'만 보이고 다시 하지 않는다.
import { useState } from "react";
import {
  EnglishLine,
  GuideLine,
  type PictureLookup,
} from "@/components/activities/common";
import { ChoiceAnswer } from "@/components/answer/choice";
import { TileAnswer, type TilePlacement } from "@/components/answer/tiles";
import { TypingAnswer } from "@/components/answer/typing";
import { BigButton, StatusLine } from "@/components/board/board";
import {
  TEACH_TEXT,
  type TeachLineEnd,
  type TeachSpeechSettings,
} from "@/components/session/teach/teacher-line";
import { WhyBubble } from "@/components/session/teach/why-bubble";
import { type Answer, checkAnswer } from "@/core/answer/check";
import type { DisplayItem } from "@/core/answer/display";
import { displayCardsOf, expectedAnswerOf } from "@/core/answer/expected";
import type { WritingItem } from "@/core/seed/schema/lesson";
import { assembleRolesOf } from "@/core/session/teach-frame";
import type { TeacherView } from "@/core/teacher/roster";
import { writingWhyOf } from "@/core/writing/why";
import type { SpeechPort } from "@/lib/speech/types";

/** 조각 글(정본 밖 문구 표 쓰기 1~3 행 · 세션 공통 행, C78). */
export const WRITING_TEXT = {
  guide: {
    "pick-word": "그림에 맞는 단어를 골라요",
    "copy-tiles": "단어를 보고 글자를 차례대로 놓아요",
    "build-tiles": "뜻에 맞게 글자를 놓아 단어를 만들어요",
    "fill-letters": "빈칸에 들어갈 글자를 놓아요",
    dictation: "잘 듣고 단어를 써요",
    "assemble-phrase": "이 뜻이 되게 카드를 놓아요",
    "assemble-sentence": "이 뜻이 되게 카드를 놓아요",
  } satisfies Record<WritingItem["type"], string>,
  cardHint: "카드를 누르면 빈칸으로 가요",
  right: "맞았어요!",
  answerIs: "정답은 이거예요",
  tryAgain: "한 번 더 풀기",
  next: "다음",
  /** 받아쓰기 내기(넘기기 '다음'과 가름 — 컨트롤러 결정, plan 정본 밖 문구 표 a 행 · 쓰기 4~5 와 같은 말). */
  written: "다 썼어요",
} as const;

/** 활동 안 입력: 지금까지의 시도 · 다시 하는 중 · 지금 고르거나 놓은 것(답 조각 꼴). */
export type WritingItemInput = {
  tries: Answer[];
  retrying?: boolean;
  draft?: unknown;
};

type Stage = "answer" | "right" | "wrong";

/** 가르치는 수업 쓰기 문항의 단계: 놓기 · '왜'(처음 틀림) · 맞음 · 정답 보기(둘째 뒤 틀림) · 짝 맞음 · 짝 틀림. */
export type WritingTeachStage =
  | "answer"
  | "why"
  | "right"
  | "wrong"
  | "spare-right"
  | "spare-wrong";

/** 가르치는 수업 쓰기 문항의 단계(델타 spec 설계 1 '틀린 뒤 차례' 쓰기 행 · '다른 예시' 짝도 틀리면). */
export function writingTeachStageOf(
  mode: "solo" | "spare",
  item: WritingItem,
  tries: readonly Answer[],
  retrying: boolean,
): WritingTeachStage {
  const last = tries.at(-1);
  const correct = (answer: Answer) =>
    checkAnswer(item, answer, { homophones: [] }).correct;
  if (!last) return "answer";
  if (mode === "spare")
    return tries[0] && correct(tries[0]) ? "spare-right" : "spare-wrong";
  if (correct(last)) return "right";
  if (retrying) return "answer";
  return tries.length === 1 ? "why" : "wrong";
}

/** 가르치는 수업 쓰기 문항의 자료 · 콜백(세션 틀이 준다). 없으면 지금 흐름 그대로다. */
export type WritingTeach = {
  mode: "solo" | "spare";
  teacher: TeacherView | null;
  speechSettings: TeachSpeechSettings;
  /** 선생님 줄('왜')이 멈춘 때(세션 틀이 무음 모드 줄 셈에 쓴다). */
  onLineEnd?: (end: TeachLineEnd) => void;
};

/** 쓰기 문항을 답 조각 꼴로(정답 칸을 빼고 그림은 그림 정보로 — P10 displayItemOf 와 같은 결). */
export function displayOfWritingItem(
  item: WritingItem,
  pictures: PictureLookup,
): DisplayItem {
  switch (item.type) {
    case "pick-word":
      return {
        type: "pick-word",
        picture: pictures.ofWord(item.picture),
        choices: item.options.map((text) => ({ kind: "text", text })),
      };
    case "copy-tiles":
      return { type: "copy-tiles", word: item.word, tiles: [...item.tiles] };
    case "build-tiles":
      return {
        type: "build-tiles",
        meaningKo: item.meaningKo,
        tiles: [...item.tiles],
      };
    case "fill-letters":
      return {
        type: "fill-letters",
        pattern: item.pattern,
        picture: pictures.ofWord(item.word),
        audioText: item.word,
        tiles: [...item.tiles],
      };
    case "dictation":
      return { type: "dictation", audioText: item.audioText };
    case "assemble-phrase":
    case "assemble-sentence":
      return {
        type: item.type,
        // 문장 가운데 대문자 낱말(고유 명사 · I) 카드는 정답 꼴로(첫 카드는 소문자 그대로 — 대문자 단추, C73)
        cards: displayCardsOf(item),
        ...(item.meaningKo ? { meaningKo: item.meaningKo } : {}),
      };
  }
}

/** 맞았을 때 둘째 줄의 뜻(없거나 낱말 그대로면 없음). */
function meaningOf(
  item: WritingItem,
  pictures: PictureLookup,
): string | undefined {
  const meaning =
    item.type === "pick-word"
      ? pictures.ofWord(item.picture).meaningKo
      : item.type === "build-tiles" ||
          item.type === "assemble-phrase" ||
          item.type === "assemble-sentence"
        ? item.meaningKo
        : pictures.ofWord(item.word).meaningKo;
  const word = item.accepted[0] ?? "";
  return meaning && meaning !== word ? meaning : undefined;
}

function stageOf(
  item: WritingItem,
  tries: readonly Answer[],
  retrying: boolean,
): Stage {
  const last = tries.at(-1);
  if (!last || retrying) return "answer";
  return checkAnswer(item, last, { homophones: [] }).correct
    ? "right"
    : "wrong";
}

export function WritingItemActivity({
  item,
  level,
  pictures,
  speech,
  initial,
  onChange,
  onDone,
  teach,
}: {
  item: WritingItem;
  level: number;
  pictures: PictureLookup;
  speech: SpeechPort | undefined;
  initial?: WritingItemInput;
  onChange: (input: WritingItemInput) => void;
  onDone: (input: { tries: Answer[] }) => void;
  teach?: WritingTeach;
}) {
  const [tries, setTries] = useState<Answer[]>(initial?.tries ?? []);
  const [retrying, setRetrying] = useState(initial?.retrying ?? false);
  const [draft, setDraft] = useState<unknown>(initial?.draft);
  /** 짝도 틀린 '왜' 줄이 멈췄나(설계 5 — '왜' 화면의 단추는 읽어 주기 뒤에 밝다. 소리가 안 나도 줄이 멈추면 밝음). */
  const [spareWhyDone, setSpareWhyDone] = useState(false);
  const teachStage = teach
    ? writingTeachStageOf(teach.mode, item, tries, retrying)
    : undefined;
  const stage: Stage =
    teachStage === undefined
      ? stageOf(item, tries, retrying)
      : teachStage === "answer"
        ? "answer"
        : teachStage === "right" || teachStage === "spare-right"
          ? "right"
          : "wrong";
  const display = displayOfWritingItem(item, pictures);
  // 시도마다 답 조각을 새로 만든다(다시 할 때 빈 채로). 막 낸 시도의 결과 동안은 같은 조각에 정답을 보인다
  const attemptKey = stage === "answer" ? tries.length : tries.length - 1;
  const last = tries.at(-1);
  const expected = expectedAnswerOf(item);

  const submit = (answer: Answer) => {
    const next = [...tries, answer];
    setTries(next);
    setRetrying(false);
    setDraft(undefined);
    onChange({ tries: next, retrying: false });
  };
  const keepDraft = (value: unknown) => {
    setDraft(value);
    onChange({ tries, retrying, draft: value });
  };
  /** 결과 동안 답 조각에 보일 것: 맞으면 아이가 낸 답, 틀리면 정답(가르치는 수업의 '왜' 동안은 아이가 낸 답 — 정답을 먼저 보이지 않음). */
  const shown =
    stage === "right" || teachStage === "why"
      ? last
      : stage === "wrong"
        ? expected
        : undefined;
  /** 같은 문제 다시(가르치는 수업 혼자 문항, 처음 틀린 뒤): 색 칸과 대문자 단추 반짝임. */
  const helped =
    teach?.mode === "solo" && teachStage === "answer" && tries.length >= 1;
  const slotRoles =
    helped &&
    (item.type === "assemble-phrase" || item.type === "assemble-sentence")
      ? assembleRolesOf(item.accepted[0] ?? "")
      : undefined;
  /** '왜' 한 줄(처음 틀림 · 짝 틀림 — 까닭별, 정한 것 8). 없으면 줄 없이 단추만. */
  const why =
    teachStage === "why" || teachStage === "spare-wrong"
      ? (() => {
          const answer = teachStage === "spare-wrong" ? tries[0] : tries.at(-1);
          return answer ? writingWhyOf(item, answer)?.textKo : undefined;
        })()
      : undefined;
  const retry = () => {
    setRetrying(true);
    setDraft(undefined);
    onChange({ tries, retrying: true });
  };

  let answerPart: React.ReactNode;
  switch (display.type) {
    case "pick-word":
      answerPart = (
        <ChoiceAnswer
          key={attemptKey}
          item={display}
          level={level}
          speech={speech}
          initial={typeof draft === "number" ? draft : undefined}
          onChange={keepDraft}
          // 고르면 바로 채점(읽기 문항과 같은 꼴 — 화면 검토 review-p11-3-design M-2)
          instant
          reveal={
            shown && last?.kind === "choice" && expected.kind === "choice"
              ? teachStage === "why"
                ? // '왜' 동안은 고른 오답만 표시하고 정답은 아직 보이지 않는다(설계 1 쓰기 행)
                  { picked: last.no }
                : { answerNo: expected.no, picked: last.no }
              : undefined
          }
          onAnswer={submit}
        />
      );
      break;
    case "dictation":
      answerPart = (
        <TypingAnswer
          key={attemptKey}
          item={display}
          speech={speech}
          initial={typeof draft === "string" ? draft : undefined}
          onChange={keepDraft}
          reveal={shown?.kind === "text" ? shown.text : undefined}
          submitLabel={WRITING_TEXT.written}
          onAnswer={submit}
        />
      );
      break;
    case "copy-tiles":
    case "build-tiles":
    case "fill-letters":
    case "assemble-phrase":
    case "assemble-sentence":
      answerPart = (
        <TileAnswer
          key={attemptKey}
          item={display}
          speech={speech}
          initial={draft as TilePlacement | undefined}
          onChange={keepDraft}
          reveal={shown?.kind === "tiles" ? shown.pieces : undefined}
          slots={
            display.type === "assemble-phrase" ||
            display.type === "assemble-sentence"
          }
          // 놓는 자리가 다 찼을 때만 '다 놓았어요'(조립 = 카드 수 · 타일 = 정답 글자 수 — 화면 검토 I-2)
          needed={
            expected.kind === "tiles" ? expected.pieces.length : undefined
          }
          {...(slotRoles ? { slotRoles } : {})}
          flashCapital={helped && item.type === "assemble-sentence"}
          onAnswer={submit}
        />
      );
      break;
    default:
      answerPart = null;
  }

  const cards =
    item.type === "assemble-phrase" || item.type === "assemble-sentence";
  // 조립은 뜻이 답 조각 위에 크게 있으니 맞음 단계에서 다시 쓰지 않는다(화면 검토 M-3)
  const meaning = cards ? undefined : meaningOf(item, pictures);
  return (
    <div
      data-writing-item={item.type}
      data-writing-stage={stage}
      className="flex flex-col gap-5"
    >
      {/* '왜'는 화면을 바꾸지 않고 같은 문항 위에(설계 5 — 초상은 이때만) */}
      {teach && teachStage === "why" && why ? (
        <WhyBubble
          whyKo={why}
          retry="do"
          teacher={teach.teacher}
          speech={speech}
          speechSettings={teach.speechSettings}
          onLineEnd={teach.onLineEnd}
          onRetry={retry}
        />
      ) : null}
      <GuideLine>{WRITING_TEXT.guide[item.type]}</GuideLine>
      {cards && stage === "answer" ? (
        <GuideLine>{WRITING_TEXT.cardHint}</GuideLine>
      ) : null}
      {answerPart}
      {teach && teachStage === "why" && !why ? (
        <BigButton className="self-end" onClick={retry}>
          {TEACH_TEXT.retry.do}
        </BigButton>
      ) : null}
      {teach && teachStage === "spare-wrong" ? (
        // 짝도 틀리면 바른 답과 짝의 '왜' 한 줄만 보이고 끝낸다(설계 1 — 다시 없음)
        <div data-writing-wrong="" className="flex flex-col gap-2">
          <StatusLine>{WRITING_TEXT.answerIs}</StatusLine>
          {why ? (
            <WhyBubble
              whyKo={why}
              teacher={teach.teacher}
              speech={speech}
              speechSettings={teach.speechSettings}
              onLineEnd={(end) => {
                teach.onLineEnd?.(end);
                setSpareWhyDone(true);
              }}
            />
          ) : null}
          <BigButton
            className="self-end"
            data-teach-next=""
            // 선생님이 '왜' 줄을 읽은 뒤에 밝다('왜' 줄이 없으면 바로 밝음)
            disabled={Boolean(why) && !spareWhyDone}
            onClick={() => onDone({ tries })}
          >
            {WRITING_TEXT.next}
          </BigButton>
        </div>
      ) : null}
      {stage === "right" ? (
        <div data-writing-right="" className="flex flex-col gap-2">
          <StatusLine tone="ok">
            {teachStage === "spare-right"
              ? TEACH_TEXT.spareRight
              : WRITING_TEXT.right}
          </StatusLine>
          <EnglishLine className="font-bold">{item.accepted[0]}</EnglishLine>
          {meaning ? <GuideLine>{meaning}</GuideLine> : null}
          <BigButton className="self-end" onClick={() => onDone({ tries })}>
            {WRITING_TEXT.next}
          </BigButton>
        </div>
      ) : null}
      {stage === "wrong" &&
      (teachStage === undefined || teachStage === "wrong") ? (
        <div data-writing-wrong="" className="flex flex-col gap-2">
          <StatusLine>{WRITING_TEXT.answerIs}</StatusLine>
          <BigButton className="self-end" onClick={retry}>
            {teach ? TEACH_TEXT.retry.do : WRITING_TEXT.tryAgain}
          </BigButton>
        </div>
      ) : null}
    </div>
  );
}
