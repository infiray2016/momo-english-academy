"use client";

// 되짚기(가르치고 배우는 수업 plan 묶음 라-4 · 정본 03:26 세션 결과 행 · 03:80 세션 결과(되짚기) 행 · 델타 spec 설계 5 화면 표 · 15절 AC-6f).
// 결과 화면 첫머리는 초상과 선생님 마무리 한 줄이고, 오늘 만난 말 칸에 단원 단어(소리 단추)와 칩을 단 문장 틀(듣기 단추)이 온다.
// 들리는 차례는 마무리 한 줄(한국어 — 선생님 ko 목소리) → 단원 단어(영어 — 선생님 영어 목소리) → 문장 틀(영어 — 선생님 영어 목소리)이다.
// 읽기는 라-1 의 useTeachLine · readTeachLine 을 그대로 쓴다: 들려주지 못하면 멈추고 단추를 밝히며 '소리가 안 나와서 글로 봐요.'를
// speech.skip_notice_seconds 동안 보인다. 결과 화면은 무음 모드 줄을 세지 않는다(onLineEnd 없음). 소리 단추 · 듣기 단추는 읽는 동안 흐리다.
// 조각은 자료(줄 글 · 단어 · 문장 틀 · 선생님)와 음성 접점만 받고 세션 · 결과 상태(다시 하기 · 쓰기 초고)를 모른다 — 그 갈래는 서버가 recapView 로
// 정한다. 마무리 줄 고르기(closeKo · closeKoPracticed)도 서버 몫이다. 3D 는 쓰지 않는다(초상 — NFR-11). 다시 하기 결과는 오늘 만난 말이
// 없어 부르는 쪽이 단어를 비우고 문장 틀을 null 로 넘긴다 — 그때 읽는 것은 마무리 한 줄뿐이다(정본 03:26, 라-4 fix 1 I1).
import { Volume2 } from "lucide-react";
import { ICON_STROKE } from "@/components/activities/common";
import { SmallButton } from "@/components/board/board";
import { type ChipData, ChipSentence } from "@/components/session/teach/chips";
import {
  type LinePart,
  TEACH_TEXT,
  TeacherLine,
  type TeachLineView,
  type TeachSpeechSettings,
  useTeachLine,
  voicedSpeech,
} from "@/components/session/teach/teacher-line";
import type { TeacherView } from "@/core/teacher/roster";
import type { SpeechPort } from "@/lib/speech/types";

/**
 * 되짚기 자료: 고른 마무리 줄 글(시드) · 오늘 만난 말의 단원 단어(보여 주기에 보인 차례) · 문장 틀과 칩(시드 teach.recap). 오늘 만난 말이
 * 없는 결과(다시 하기)는 words 가 비고 frame 이 null 이다.
 */
export type RecapData = {
  lineKo: string;
  words: readonly string[];
  frame: { frameEn: string; chips: readonly ChipData[] } | null;
};

/** 읽는 차례(정본 03:80 들리는 것 '마무리 → 단원 단어 → 문장 틀'). 자료가 없으면 읽을 것이 없다. */
export function recapPartsOf(data: RecapData | undefined): LinePart[] {
  if (!data) return [];
  return [
    { text: data.lineKo, voice: "teacher_ko" },
    ...data.words.map((word) => ({ text: word, voice: "teacher_en" as const })),
    ...(data.frame
      ? [{ text: data.frame.frameEn, voice: "teacher_en" as const }]
      : []),
  ];
}

/**
 * 되짚기 읽기(그려진 뒤 · 접점이 생긴 뒤 한 번)와 다시 듣기. data 가 없으면(되짚기 없는 결과) 읽을 것이 없어 바로 밝고, listen 은 기본
 * 목소리(teacher null)로 낱말을 읽는다. listen 은 누름 처리 안에서 잠금을 풀고 선생님 영어 목소리로 읽는다.
 */
export function useRecap({
  data,
  teacher,
  speech,
  speechSettings,
}: {
  data: RecapData | undefined;
  teacher: TeacherView | null;
  speech: SpeechPort | undefined;
  speechSettings: Pick<TeachSpeechSettings, "skipNoticeMs">;
}): { line: TeachLineView; listen: (text: string) => void } {
  const line = useTeachLine({
    parts: recapPartsOf(data),
    speech,
    teacher,
    skipNoticeMs: speechSettings.skipNoticeMs,
  });
  return {
    line,
    listen: (text) => {
      if (!speech) return;
      speech.unlockFromGesture();
      void voicedSpeech(speech, teacher).speak(text);
    },
  };
}

/** 첫머리: 초상 · 이름표 · 말풍선(마무리 한 줄 — 한국어). */
export function RecapHead({
  teacher,
  lineKo,
  line,
}: {
  teacher: TeacherView | null;
  lineKo: string;
  line: Pick<TeachLineView, "speaking" | "material" | "notice">;
}) {
  return (
    <section data-recap-head="" data-teach-slot="recap">
      <TeacherLine teacher={teacher} lineKo={lineKo} line={line} />
    </section>
  );
}

/** 칩을 단 문장 틀 한 줄과 그 옆 '다시 듣기'(오늘 만난 말 칸 아래 — MetWordCards 의 children). */
export function RecapFrame({
  frameEn,
  chips,
  listenOff,
  onListen,
}: {
  frameEn: string;
  chips: readonly ChipData[];
  listenOff: boolean;
  onListen: (text: string) => void;
}) {
  return (
    <div
      data-recap-frame=""
      className="flex flex-wrap items-end gap-x-6 gap-y-4"
    >
      <ChipSentence sentence={frameEn} chips={chips} />
      <SmallButton
        data-recap-listen=""
        disabled={listenOff}
        onClick={() => onListen(frameEn)}
      >
        <Volume2 aria-hidden className="size-7" strokeWidth={ICON_STROKE} />
        {TEACH_TEXT.listenAgain}
      </SmallButton>
    </div>
  );
}
