"use client";

// '선생님을 골라요'(선생님 화면 plan 값 10, 4절 '선생님을 골라요' 행 · 3.3 회화 세션 여는 차례 · C114 · C117 · C141 (3) 정본 밖 문구).
// 회화 수업을 처음 열 때 고른 선생님이 없으면(또는 명단에 없는 키) 막힘 · 쉼 뒤 '시작!' 앞에 한 번 나온다. 종이 판 위에 제목 → 같은
// 크기의 연두 장(그 아이에게 보일 선생님 — 둘이면 가로 · 세로 모두 두 칸 나란히) → 큰 단추 → '고른 선생님은 부모님이 바꿀 수 있어요'.
// 장 안 누름 자리(aria-pressed — 초상 · 한글 이름 · 성격 세 낱말 · 소개)와 그 아래 작은 '인사 듣기'(누름 자리 안에 단추를 넣지 않음).
// 골라진 장은 굵은 먹색 테 + '골랐어요' 표지(색만으로 가르지 않음). '인사 듣기'는 소리만 — 영어 글은 화면 · 접근 이름 어디에도 없다(T2).
// 큰 단추는 고르기 전 흐린 '선생님과 할래요', 고르면 '[이름] 선생님과 할래요'. 고르기가 되면(이미 다른 기기에서 골랐어도) onChosen —
// 회화 틀이 자료를 다시 읽는다(router.refresh — 새 자료에 선생님 · 처음 스냅숏, 아이 화면 틀의 집 선생님 이름도 새로). 명단 밖 · 보이지
// 않는 선생님(드묾)이면 '다시 골라 주세요' 한 줄과 함께 골라진 표시를 지운다. '홈'은 회화 틀 위 띠의 작은 '홈' 하나다.
// 가로(lg)에서는 장을 눕힌다(화면 검토 1 I-1 — 큰 단추가 가로 1180 × 820 의 보는 창 안에 들게): 왼쪽 칸에 초상(작게)과 그 아래 '인사
// 듣기', 오른쪽 칸에 이름 · 성격 칩 · 소개. '인사 듣기'는 누름 자리와 같은 격자 칸에 겹쳐 놓을 뿐 누름 자리 밖 단추다(단추 안에 단추를
// 넣지 않음 — 누름 자리 왼쪽 칸은 그 자리만큼 비워 둔다). 보일 선생님이 하나면 장 하나를 가운데에 같은 크기로(M-7).
import { Check, Volume2 } from "lucide-react";
import { useState } from "react";
import { CHILD_SIZE } from "@/components/activities/common";
import {
  BigButton,
  FOCUS_RING,
  SELECTED_RING,
  SmallButton,
  StatusLine,
} from "@/components/board/board";
import { TEACHER_TEXT } from "@/core/teacher/name";
import type { TeacherView } from "@/core/teacher/roster";
import type { SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";
import { chooseTeacher } from "@/server/actions/teacher";
import { TeacherPortrait } from "./teacher-portrait";

/** 장 안 초상 지름(px, plan 값 10): 세로 · 가로(눕힌 장 — 화면 검토 1 I-1). */
const PORTRAIT_PX = { portrait: 160, landscape: 128 } as const;

export function TeacherChoice({
  choices,
  speech,
  rate,
  onChosen,
}: {
  /** 그 아이에게 보일 선생님(명단 차례). */
  choices: TeacherView[];
  /** 회화 틀의 음성 접점(렌더 뒤에 생김 — 그 전에는 '인사 듣기'를 누를 수 없음). */
  speech: SpeechPort | undefined;
  /** 세션 단계 구간의 읽어 주기 빠르기(speech.rate.<구간>, C125). */
  rate: number;
  onChosen: () => void;
}) {
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  const [retry, setRetry] = useState(false);
  const [busy, setBusy] = useState(false);
  const chosen = choices.find((t) => t.key === chosenKey);

  function greet(teacher: TeacherView) {
    if (!speech) return;
    // 이 누름이 읽어 주기를 연다(iPad Safari — 7절). 선생님 높이 · 목소리 순서로(값 12)
    speech.unlockFromGesture();
    void speech.speak(teacher.greetingEn, {
      rate,
      pitch: teacher.voice.pitch,
      voicePrefer: teacher.voice.prefer,
    });
  }

  async function go() {
    if (!chosen || busy) return;
    setBusy(true);
    speech?.cancelSpeaking();
    const out = await chooseTeacher({ key: chosen.key }).catch(() => undefined);
    if (out?.ok || (out && out.reason === "already")) {
      // 다시 읽는 동안 단추를 잠가 둔다(틀이 새 자료로 다시 그려짐)
      onChosen();
      return;
    }
    setBusy(false);
    setChosenKey(null);
    setRetry(true);
  }

  return (
    <section
      data-teacher-choice=""
      className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-8 bg-paper px-8 py-10 shadow-postit lg:max-w-none lg:gap-6 lg:py-8"
    >
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 -rotate-2 bg-postit-talk/90"
      />
      <h2 className="font-heading text-[36px] leading-tight">
        {TEACHER_TEXT.chooseTitle}
      </h2>
      <ul className="grid w-full grid-cols-2 gap-8 lg:gap-6">
        {choices.map((teacher) => {
          const picked = teacher.key === chosenKey;
          return (
            <li
              key={teacher.key}
              data-teacher-card={teacher.key}
              data-teacher-chosen={picked ? "" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-4 bg-postit-talk p-6 pt-9 shadow-postit lg:items-stretch",
                // 가로: 왼쪽 칸(초상 · '인사 듣기') | 오른쪽 칸(글) — 누름 자리도 같은 칸 나눔
                "lg:grid lg:grid-cols-[176px_1fr] lg:gap-x-5",
                // 한 장이면 두 칸 격자의 가운데에 두 장일 때와 같은 너비로(칸 사이 gap 의 절반을 뺌)
                choices.length === 1 &&
                  "col-span-2 w-[calc(50%-16px)] justify-self-center lg:w-[calc(50%-12px)]",
                picked && SELECTED_RING,
              )}
            >
              <span
                aria-hidden
                className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-3 bg-tape"
              />
              {picked ? (
                <span
                  data-teacher-chosen-mark=""
                  className="absolute -top-4 -right-4 flex items-center gap-1 rounded-full bg-ink px-4 py-1 font-heading text-[22px] text-paper"
                >
                  <Check aria-hidden className="size-6" strokeWidth={3} />
                  {TEACHER_TEXT.chosen}
                </span>
              ) : null}
              <button
                type="button"
                data-touch=""
                aria-pressed={picked}
                disabled={busy}
                onClick={() => {
                  setChosenKey(teacher.key);
                  setRetry(false);
                }}
                className={cn(
                  CHILD_SIZE.target,
                  FOCUS_RING,
                  "flex w-full flex-1 flex-col items-center gap-4 rounded-xl text-center text-ink",
                  "lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:grid lg:min-h-[200px] lg:grid-cols-[176px_1fr] lg:items-start lg:gap-x-5 lg:text-left",
                )}
              >
                <TeacherPortrait
                  teacher={teacher}
                  size={PORTRAIT_PX.portrait}
                  className="lg:hidden"
                />
                <TeacherPortrait
                  teacher={teacher}
                  size={PORTRAIT_PX.landscape}
                  className="hidden justify-self-center lg:flex"
                />
                <span className="flex flex-col items-center gap-4 lg:items-start">
                  <span className="font-heading text-[36px] leading-none">
                    {teacher.nameKo}
                  </span>
                  {/* 칩 칸은 두 줄 높이를 늘 잡는다(칩이 한 줄인 장도 소개 줄이 같은 높이에서 시작 — 화면 검토 1 M-4) */}
                  <span className="flex min-h-[82px] flex-wrap content-start justify-center gap-2 lg:justify-start">
                    {teacher.traitsKo.map((trait) => (
                      <span
                        key={trait}
                        className="rounded-full border-2 border-ink bg-paper px-3 py-1 text-xl leading-tight"
                      >
                        {trait}
                      </span>
                    ))}
                  </span>
                  <span className={cn(CHILD_SIZE.guide, "whitespace-pre-line")}>
                    {teacher.introKo}
                  </span>
                </span>
              </button>
              <SmallButton
                className="lg:relative lg:col-start-1 lg:row-start-1 lg:self-end lg:justify-self-center lg:px-4"
                data-teacher-greet=""
                aria-label={TEACHER_TEXT.chooseGreetLabel(teacher.nameKo)}
                disabled={!speech}
                onClick={() => greet(teacher)}
              >
                <Volume2 aria-hidden className="size-6" />
                {TEACHER_TEXT.chooseGreet}
              </SmallButton>
            </li>
          );
        })}
      </ul>
      {retry ? (
        <StatusLine tone="error">{TEACHER_TEXT.chooseRetry}</StatusLine>
      ) : null}
      <BigButton
        data-teacher-go=""
        disabled={!chosen || busy}
        onClick={() => void go()}
      >
        {TEACHER_TEXT.chooseGo(chosen?.nameKo)}
      </BigButton>
      <p className={CHILD_SIZE.guide}>{TEACHER_TEXT.chooseParents}</p>
    </section>
  );
}
