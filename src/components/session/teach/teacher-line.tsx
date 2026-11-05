"use client";

// 선생님 줄(가르치고 배우는 수업 plan 묶음 라-1 · spec 설계 4 '초상 자리 · 목소리 · 말투' · 5 화면 표 · '정본 밖 문구' 표 · 10 '읽어 주기 실패',
// 15절 AC-3g · AC-N20). 초상(TeacherPortrait 동그라미 — 4-가 파일은 고치지 않음)과 흰 종이 이름표 '[이름] 선생님', 말풍선(한국어 한 줄,
// 영어 토막은 그 아래 24px), 상태 표지(4-가 windowStatusOf · STATUS_BADGE_CLASS — 말하기 물결 · 칭찬 별). 3D 는 쓰지 않는다(NFR-11).
// useTeachLine 은 토막(한국어 줄 · 선생님 영어 · 글 자료)을 차례로 읽고 단추 상태를 순수 함수 teachLineStateOf 로 정한다: 다 읽으면 밝음,
// 감시가 넘긴 들려주지 못함이면 멈추고 밝음 + '소리가 안 나와서 글로 봐요.'(speech.skip_notice_seconds 동안), 읽지 않음(skipped — ko-KR
// 없음 · read_ko 끔)이면 바로 밝음 · 안내 없음. 저절로 넘어가지 않는다. 목소리는 마-1 voiceFor 쓰임대로: 한국어 줄은 lang ko-KR(+ 선생님
// 높이), 선생님 영어는 선생님 음성 감싸기(teacherSpeech — 높이 · 목소리 순서), 글 자료(이야기 · 짧은 글)는 지금 목소리(감싸지 않은 접점).
// 조각은 자료와 콜백만 받고 세션 상태를 모른다.
import { AudioLines, Star, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  CHILD_SIZE,
  EnglishLine,
  ICON_STROKE,
} from "@/components/activities/common";
import { StatusLine } from "@/components/board/board";
import { TeacherPortrait } from "@/components/teacher/teacher-portrait";
import {
  STATUS_BADGE_CLASS,
  windowStatusOf,
} from "@/components/teacher/teacher-window";
import type { Area } from "@/core/seed/structure";
import {
  type TeachLineResult,
  teachLineStateOf,
} from "@/core/session/teach-line";
import type { SpeechSettings } from "@/core/speech/listen";
import { josa, TEACHER_TEXT } from "@/core/teacher/name";
import type { TeacherView } from "@/core/teacher/roster";
import type { TeacherState } from "@/core/teacher/state";
import { KOREAN_LANG } from "@/core/teacher/voice";
import { teacherSpeech } from "@/lib/speech/teacher";
import type { SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";

/** 새 단어 수를 읽는 우리말 수(새 단어 화면 한 줄 '새 낱말 다섯이에요' — 수는 그 수업 새 단어 수): 하나~아홉과 열~아흔. */
const KOREAN_ONES = [
  "",
  "하나",
  "둘",
  "셋",
  "넷",
  "다섯",
  "여섯",
  "일곱",
  "여덟",
  "아홉",
] as const;
const KOREAN_TENS = [
  "",
  "열",
  "스물",
  "서른",
  "마흔",
  "쉰",
  "예순",
  "일흔",
  "여든",
  "아흔",
] as const;
const TEN = 10;

/** 1~99 를 우리말 수로(열하나 · 스물 · 스물하나 …). 그 밖은 숫자 글. */
export function koreanCountOf(n: number): string {
  const tens = KOREAN_TENS[Math.floor(n / TEN)];
  const ones = KOREAN_ONES[n % TEN];
  if (!Number.isInteger(n) || n < 1 || tens === undefined || ones === undefined)
    return String(n);
  return `${tens}${ones}`;
}

/** 우리말 수 + '이에요 · 예요'(끝 글자 받침으로). */
function countIs(n: number): string {
  const word = koreanCountOf(n);
  return `${word}${josa(word, "이/가") === "이" ? "이에요" : "예요"}`;
}

/** 세 영역(가르치는 수업이 있는 영역). */
export type TeachArea = Exclude<Area, "talk">;

/**
 * 조각 글(spec 설계 5 '정본 밖 문구' 표 글자 그대로 — 새 문구 금지). 쓰기 '왜' 앱 문구는 core/writing/why.ts WRITING_WHY_KO, 위 띠 자리
 * 이름은 core/session/teach-line.ts TEACH_SLOT_NAME 에 있다. '다음' · '다시 듣기'는 정본 4절 단추 글.
 */
export const TEACH_TEXT = {
  start: "시작",
  next: "다음",
  listenAgain: "다시 듣기",
  newWords: (count: number) => `새 낱말 ${countIs(count)}. 누르면 다시 들려요.`,
  soloFirst: "이제 혼자 해 봐요.",
  spareFirst: {
    reading: "다른 글에서 혼자 해 봐요.",
    writing: "다른 문장도 혼자 놓아 봐요.",
    speaking: "다른 이야기로 혼자 해 봐요.",
  } satisfies Record<TeachArea, string>,
  spareRight: "혼자 해냈어요!",
  whyRepeat: "끊어서 다시 들어 봐요.",
  retry: {
    solve: "한 번 더 풀기",
    do: "한 번 더 하기",
    speak: "한 번 더 말하기",
  },
  recapWords: "오늘 만난 말",
  soundless: "소리가 안 나와서 글로 봐요.",
} as const;

/** 초상 지름(px, 화면 꼴 상수 — 화면 검토가 정함). */
export const TEACH_PORTRAIT_PX = 96;
/** 초상 위 상태 표지 크기(4-가 표지 꼴을 작은 초상에 맞춰 줄임). */
const TEACH_BADGE_CLASS = "size-10 lg:size-10 right-[-6px] bottom-[-6px]";

/** 읽는 쓰임(마-1 voiceFor 쓰임과 같다): 선생님 한국어 줄 · 선생님이 보이는 영어 · 글 자료. */
export type LineVoice = "teacher_ko" | "teacher_en" | "material";
/** 선생님 줄의 한 토막. */
export type LinePart = { text: string; voice: LineVoice };

/** 조각이 받는 음성 설정(12절 speech.skip_notice_seconds · speak_chars_per_second_ko · rate_ko). */
export type TeachSpeechSettings = Pick<
  SpeechSettings,
  "skipNoticeMs" | "speakCharsPerSecondKo" | "rateKo"
>;

/** 선생님 줄 상태(화면이 읽는 값). */
export type TeachLineView = {
  /** 단추가 밝은가. */
  bright: boolean;
  /** '소리가 안 나와서 글로 봐요.'를 지금 보이나(speech.skip_notice_seconds 동안). */
  notice: boolean;
  /** 선생님 말(한국어 줄 · 선생님 영어)이 소리 나는 중. */
  speaking: boolean;
  /** 글 자료(이야기 · 짧은 글)를 들려주는 중 — 초상 대신 듣기 표시(설계 4 목소리 표). */
  material: boolean;
  /** 끝난 토막 수. */
  done: number;
  /** 토막마다 시작 알림 시각(performance.now ms, 아직이면 undefined). */
  startedAt: readonly (number | undefined)[];
};

/** 아직 읽지 않은 줄(흐림). */
export const LINE_WAITING: TeachLineView = {
  bright: false,
  notice: false,
  speaking: false,
  material: false,
  done: 0,
  startedAt: [],
};

/** 선생님 목소리를 얹은 접점(고르기 전이면 감싸지 않음 — 기본 목소리, C130). */
export function voicedSpeech(
  speech: SpeechPort,
  teacher: TeacherView | null,
): SpeechPort {
  if (!teacher) return speech;
  return teacherSpeech(speech, {
    pitch: teacher.voice.pitch,
    voicePrefer: teacher.voice.prefer,
    onSpeaking: () => {},
  });
}

type LineRecord = {
  key: string;
  results: TeachLineResult[];
  startedAt: (number | undefined)[];
  notice: boolean;
  speaking: boolean;
  material: boolean;
};
const freshRecord = (key: string): LineRecord => ({
  key,
  results: [],
  startedAt: [],
  notice: false,
  speaking: false,
  material: false,
});

/** 선생님 줄이 멈춘 때 넘기는 사실: '소리가 안 나와서 글로 봐요.'를 띄웠나(설계 10 — 세션 틀이 두 번째면 무음 모드 줄을 더한다). */
export type TeachLineEnd = { notice: boolean };

/**
 * 선생님 줄 토막을 차례로 읽는다(React 없음 — useTeachLine 이 부르고 단위 시험이 가짜 접점으로 돌린다). 다음 토막은 teachLineStateOf 가
 * 정하고, 멈추면(다 읽음 · 들려주지 못함 · 끊김) onEnd 를 한 번 부른다. alive 가 거짓이 되면(화면이 바뀜) 알림 없이 그만둔다.
 * 한국어 줄은 lang ko-KR, 선생님 영어는 선생님 음성 감싸기, 글 자료는 감싸지 않은 접점이다(마-1 voiceFor 쓰임).
 */
export async function readTeachLine({
  parts,
  speech,
  teacher,
  alive = () => true,
  onStart,
  onResult,
  onEnd,
}: {
  parts: readonly LinePart[];
  speech: SpeechPort;
  teacher: TeacherView | null;
  alive?: () => boolean;
  onStart?: (index: number, isMaterial: boolean) => void;
  onResult?: (results: TeachLineResult[]) => void;
  onEnd?: (end: TeachLineEnd) => void;
}): Promise<void> {
  const voiced = voicedSpeech(speech, teacher);
  const results: TeachLineResult[] = [];
  for (;;) {
    const state = teachLineStateOf(parts.length, results);
    const index = state.next;
    const part = index === undefined ? undefined : parts[index];
    if (index === undefined || part === undefined) {
      onEnd?.({ notice: state.notice });
      return;
    }
    const isMaterial = part.voice === "material";
    const outcome = await (isMaterial ? speech : voiced).speak(part.text, {
      ...(part.voice === "teacher_ko" ? { lang: KOREAN_LANG } : {}),
      onStart: () => {
        if (alive()) onStart?.(index, isMaterial);
      },
    });
    if (!alive()) return;
    results.push(outcome);
    onResult?.([...results]);
  }
}

/**
 * 선생님 줄을 차례로 읽는다(그려진 뒤 · 접점이 생긴 뒤 한 번, 토막 글이 바뀌면 처음부터). onEnd 는 읽기가 멈춘 때 한 번(다 읽음 · 들려주지
 * 못함 · 끊김)이고, notice 는 그때 '소리가 안 나와서 글로 봐요.'를 띄웠나다(세션 틀이 세션에서 두 번째면 iPad 무음 모드 줄을 더한다 — 설계 10).
 * 접점이 없는 동안은 흐리다(세션 틀이 그려진 뒤 만든다).
 */
export function useTeachLine({
  parts,
  speech,
  teacher,
  skipNoticeMs,
  onEnd,
}: {
  parts: readonly LinePart[];
  speech: SpeechPort | undefined;
  teacher: TeacherView | null;
  skipNoticeMs: number;
  onEnd?: (end: TeachLineEnd) => void;
}): TeachLineView {
  const key = JSON.stringify(parts);
  const [record, setRecord] = useState<LineRecord>(() => freshRecord(key));
  const teacherRef = useRef(teacher);
  teacherRef.current = teacher;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const teacherKey = teacher?.key;

  // biome-ignore lint/correctness/useExhaustiveDependencies: 선생님은 ref 로 읽고 고유 키(teacherKey)가 바뀔 때만 처음부터 다시 읽는다(자료를 다시 읽어 같은 선생님 객체가 새로 와도 줄을 다시 읽지 않게)
  useEffect(() => {
    if (!speech) return;
    const list = JSON.parse(key) as LinePart[];
    let alive = true;
    let noticeTimer: ReturnType<typeof setTimeout> | undefined;
    const patch = (change: (prev: LineRecord) => Partial<LineRecord>) =>
      setRecord((prev) => {
        const base = prev.key === key ? prev : freshRecord(key);
        return { ...base, ...change(base) };
      });
    setRecord(freshRecord(key));
    void readTeachLine({
      parts: list,
      speech,
      teacher: teacherRef.current,
      alive: () => alive,
      onStart: (index, isMaterial) => {
        const at = performance.now();
        patch((prev) => {
          const startedAt = [...prev.startedAt];
          startedAt[index] ??= at;
          return isMaterial
            ? { startedAt, material: true }
            : { startedAt, speaking: true };
        });
      },
      onResult: (results) =>
        patch(() => ({ results, speaking: false, material: false })),
      onEnd: (end) => {
        if (end.notice) {
          patch(() => ({ notice: true }));
          noticeTimer = setTimeout(() => {
            if (alive) patch(() => ({ notice: false }));
          }, skipNoticeMs);
        }
        onEndRef.current?.(end);
      },
    });
    return () => {
      alive = false;
      if (noticeTimer !== undefined) clearTimeout(noticeTimer);
      speech.cancelSpeaking();
    };
  }, [speech, key, teacherKey, skipNoticeMs]);

  const current = record.key === key ? record : freshRecord(key);
  const state = teachLineStateOf(parts.length, current.results);
  return {
    bright: state.bright,
    notice: current.notice,
    speaking: current.speaking,
    material: current.material,
    done: current.results.length,
    startedAt: current.startedAt,
  };
}

/** 초상의 상태(쉬기 · 말하기 · 칭찬 — 4-가 표지 갈래). */
function portraitStateOf(speaking: boolean, praise: boolean): TeacherState {
  if (speaking) return "speaking";
  if (praise) return "praise";
  return "idle";
}

/**
 * 선생님 줄 그림: 초상(또는 글 자료를 들려주는 동안 듣기 표시) · 이름표 · 말풍선(한국어 한 줄 → 영어 토막 24px) · 안내 줄(role=status,
 * 비면 자리만). praise 는 같이 해 보기 맞음 반응을 읽는 동안(talk.teacher_praise_seconds — 부르는 쪽이 정함).
 */
export function TeacherLine({
  teacher,
  lineKo,
  en,
  line,
  praise = false,
  className,
}: {
  teacher: TeacherView | null;
  lineKo: string;
  en?: string | undefined;
  line: Pick<TeachLineView, "speaking" | "material" | "notice">;
  praise?: boolean;
  className?: string;
}) {
  const state = portraitStateOf(line.speaking, praise);
  const { badge } = windowStatusOf(state, false);
  return (
    <div
      data-teacher-line=""
      data-teacher-state={state}
      className={cn("flex items-start gap-4", className)}
    >
      <figure className="flex shrink-0 flex-col items-center gap-2">
        <span className="relative">
          {line.material ? (
            <span
              data-listening-mark=""
              aria-hidden
              className="flex items-center justify-center rounded-full border-[3px] border-ink bg-paper"
              style={{ width: TEACH_PORTRAIT_PX, height: TEACH_PORTRAIT_PX }}
            >
              <Volume2 className="size-12" strokeWidth={ICON_STROKE} />
            </span>
          ) : (
            <TeacherPortrait teacher={teacher} size={TEACH_PORTRAIT_PX} />
          )}
          {badge && !line.material ? (
            <span
              data-teacher-badge={badge}
              aria-hidden
              className={cn(STATUS_BADGE_CLASS, TEACH_BADGE_CLASS)}
            >
              {badge === "praise" ? (
                <Star
                  className="size-6 fill-postit-reading"
                  strokeWidth={ICON_STROKE}
                />
              ) : (
                <AudioLines
                  className="size-6"
                  strokeWidth={ICON_STROKE}
                  style={teacher ? { color: teacher.color.accent } : undefined}
                />
              )}
            </span>
          ) : null}
        </span>
        <figcaption
          data-teacher-name-tag=""
          className="rounded-card border-(length:--paper-edge) border-ink bg-paper px-3 font-heading text-xl text-ink"
        >
          {TEACHER_TEXT.windowName(teacher?.nameKo)}
        </figcaption>
      </figure>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div
          data-teacher-bubble=""
          className="flex flex-col gap-2 rounded-card border-(length:--paper-edge) border-ink bg-paper px-6 py-4 text-ink shadow-postit"
        >
          <p className={cn(CHILD_SIZE.guide, "leading-snug")}>{lineKo}</p>
          {en ? <EnglishLine>{en}</EnglishLine> : null}
        </div>
        <StatusLine>
          {line.notice ? TEACH_TEXT.soundless : undefined}
        </StatusLine>
      </div>
    </div>
  );
}
