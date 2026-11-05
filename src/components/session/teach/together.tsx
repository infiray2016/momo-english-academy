"use client";

// 같이 해 보기 틀(가르치고 배우는 수업 plan 묶음 라-1 · spec 설계 1 '같이 해 보기의 꼴과 수' · 5 화면 표 '같이 해 보기' · 6 teach.together[],
// 표본 R6 · R7 · W6 · W7 · S5 · S7). 초상 · 말풍선(teach.together[].lineKo, 맞음 · 틀림 뒤에는 rightKo · wrongKo)과 거의 채운 글(띠 칠 말
// highlight) · 이야기(들은 뒤 보임) · 질문과 뜻 · 빈 자리 문장(이름표 askRole)을 그린다. 고르기 · 놓기 · 말하기 입력은 영역 조각(라-2 · 라-3)이
// children 으로 붙인다. 읽는 차례: 이야기(글 자료) → 질문(선생님 영어) → 짧은 글(선생님 영어) → 선생님 한 줄. 반응을 넘기면 그 줄만 읽고, 다
// 읽으면 onLineEnd(맞음 반응 뒤 넘어가기 — 부르는 쪽). 칭찬 표지(praise)는 부르는 쪽이 talk.teacher_praise_seconds 동안 켠다.
import type { ReactNode } from "react";
import {
  CHILD_SIZE,
  FrameText,
  GuideLine,
} from "@/components/activities/common";
import { AskTag } from "@/components/session/teach/chips";
import {
  type LinePart,
  TeacherLine,
  type TeachLineEnd,
  type TeachLineView,
  type TeachSpeechSettings,
  useTeachLine,
} from "@/components/session/teach/teacher-line";
import { highlightSegmentsOf } from "@/core/session/teach-line";
import type { TeacherView } from "@/core/teacher/roster";
import type { SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";

/** 같이 해 보기 문항의 보이는 칸(시드 teach.together[] 에서 영역 조각이 고른 것). */
export type TogetherData = {
  lineKo?: string | undefined;
  /** 읽기: 짧은 글과 띠 칠 말. */
  textEn?: string | undefined;
  highlight?: readonly string[] | undefined;
  /** 말하기: 이야기(들은 뒤 보임) · 질문 · 뜻. */
  storyEn?: string | undefined;
  questionEn?: string | undefined;
  questionKo?: string | undefined;
  /** 쓰기: 뜻(반말). */
  meaningKo?: string | undefined;
  /** 빈 자리 문장('___ come to my room.' · 'No, ___ eat cookies.'). */
  prompt?: string | undefined;
  askRole?: "who" | "what" | "where" | undefined;
};

/** 선생님 반응(맞음 rightKo · 틀림 wrongKo). */
export type TogetherReaction = { kind: "right" | "wrong"; ko: string };

/** 읽을 토막. 반응이 있으면 그 한 줄만. */
export function togetherPartsOf(
  data: TogetherData,
  reaction: TogetherReaction | undefined,
): LinePart[] {
  if (reaction) return [{ text: reaction.ko, voice: "teacher_ko" }];
  const parts: LinePart[] = [];
  if (data.storyEn) parts.push({ text: data.storyEn, voice: "material" });
  if (data.questionEn)
    parts.push({ text: data.questionEn, voice: "teacher_en" });
  // 같이 해 보기 글은 선생님이 보이는 영어(설계 4 목소리 표 '같이 해 보기 문장') — 이야기만 글 자료다
  if (data.textEn) parts.push({ text: data.textEn, voice: "teacher_en" });
  if (data.lineKo) parts.push({ text: data.lineKo, voice: "teacher_ko" });
  return parts;
}

/** 띠를 친 글(띠는 노랑 — 표본 R6 '노란 띠'). */
export function HighlightedText({
  text,
  highlight,
}: {
  text: string;
  highlight: readonly string[];
}) {
  return (
    <p lang="en" className={cn(CHILD_SIZE.english, "leading-relaxed")}>
      {highlightSegmentsOf(text, highlight).map((segment) =>
        segment.marked ? (
          <mark
            key={segment.at}
            data-highlight=""
            className="rounded-sm bg-postit-reading px-1 text-ink"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={segment.at}>{segment.text}</span>
        ),
      )}
    </p>
  );
}

export function TogetherView({
  data,
  reaction,
  teacher,
  line,
  praise = false,
  storyShown,
  children,
}: {
  data: TogetherData;
  reaction?: TogetherReaction | undefined;
  teacher: TeacherView | null;
  line: TeachLineView;
  praise?: boolean;
  storyShown: boolean;
  children?: ReactNode;
}) {
  const lineKo = reaction?.ko ?? data.lineKo;
  return (
    <section
      data-teach-slot="together"
      data-together-reaction={reaction?.kind}
      className="flex flex-1 flex-col gap-6"
    >
      {lineKo ? (
        <TeacherLine
          teacher={teacher}
          lineKo={lineKo}
          line={line}
          praise={praise}
        />
      ) : null}
      <div
        data-together-item=""
        className="flex flex-col gap-4 rounded-card border-(length:--paper-edge) border-ink bg-paper px-6 py-5 text-ink"
      >
        {data.storyEn && storyShown ? (
          <p lang="en" className={CHILD_SIZE.english}>
            {data.storyEn}
          </p>
        ) : null}
        {data.questionEn ? (
          <p lang="en" className={CHILD_SIZE.english}>
            {data.questionEn}
          </p>
        ) : null}
        {data.questionKo ? <GuideLine>{data.questionKo}</GuideLine> : null}
        {data.textEn ? (
          <HighlightedText
            text={data.textEn}
            highlight={data.highlight ?? []}
          />
        ) : null}
        {data.meaningKo ? <GuideLine>{data.meaningKo}</GuideLine> : null}
        {data.askRole ? <AskTag role={data.askRole} /> : null}
        {data.prompt ? <FrameText frame={data.prompt} /> : null}
      </div>
      {children}
    </section>
  );
}

/** 같이 해 보기 틀. 반응이 바뀌면 그 줄을 읽고, 다 읽으면 onLineEnd. */
export function TogetherFrame({
  data,
  reaction,
  teacher,
  speech,
  speechSettings,
  onLineEnd,
  praise,
  children,
}: {
  data: TogetherData;
  reaction?: TogetherReaction | undefined;
  teacher: TeacherView | null;
  speech: SpeechPort | undefined;
  speechSettings: TeachSpeechSettings;
  /** 선생님 줄이 멈춘 때 한 번(notice — 세션 틀이 무음 모드 줄 셈에 쓴다, 설계 10). */
  onLineEnd?: (end: TeachLineEnd) => void;
  praise?: boolean;
  children?: ReactNode;
}) {
  const line = useTeachLine({
    parts: togetherPartsOf(data, reaction),
    speech,
    teacher,
    skipNoticeMs: speechSettings.skipNoticeMs,
    onEnd: onLineEnd,
  });
  return (
    <TogetherView
      data={data}
      reaction={reaction}
      teacher={teacher}
      line={line}
      praise={praise ?? false}
      // 반응을 읽는 때는 이미 이야기를 들은 뒤다
      storyShown={reaction !== undefined || line.bright || line.done >= 1}
    >
      {children}
    </TogetherView>
  );
}
