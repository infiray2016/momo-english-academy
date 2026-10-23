"use client";

// '선생님을 골라요'(선생님 화면 plan 값 10, 4절 '선생님을 골라요' 행 · 3.3 회화 세션 여는 차례 · C114 · C117 · C141 (3) 정본 밖 문구).
// 회화 수업을 처음 열 때 고른 선생님이 없으면(또는 명단에 없는 키) 막힘 · 쉼 뒤 '시작!' 앞에 한 번 나온다. 종이 판 위에 제목 → 같은
// 크기의 연두 장(그 아이에게 보일 선생님 — 둘이면 가로 · 세로 모두 두 칸 나란히) → 큰 단추 → '고른 선생님은 부모님이 바꿀 수 있어요'.
// 장 안 누름 자리(aria-pressed — 초상 · 한글 이름 · 성격 세 낱말 · 소개)와 그 아래 작은 '인사 듣기'(누름 자리 안에 단추를 넣지 않음).
// 골라진 장은 굵은 먹색 테 + '골랐어요' 표지(색만으로 가르지 않음). '인사 듣기'는 소리만 — 영어 글은 화면 · 접근 이름 어디에도 없다(T2).
// 큰 단추는 고르기 전 흐린 '선생님과 할래요', 고르면 '[이름] 선생님과 할래요'. 고르기가 되면(이미 다른 기기에서 골랐어도) onChosen —
// 회화 틀이 자료를 다시 읽는다(router.refresh — 새 자료에 선생님 · 처음 스냅숏, 아이 화면 틀의 집 선생님 이름도 새로). 명단 밖 · 보이지
// 않는 선생님(드묾)이면 '다시 골라 주세요' 한 줄과 함께 골라진 표시를 지운다. '홈'은 회화 틀 위 띠의 작은 '홈' 하나다.
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

/** 장 안 초상 지름(px, plan 값 10). */
const PORTRAIT_PX = 160;

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
      className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-8 bg-paper px-8 py-10 shadow-postit"
    >
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 -rotate-2 bg-postit-talk/90"
      />
      <h2 className="font-heading text-[36px] leading-tight">
        {TEACHER_TEXT.chooseTitle}
      </h2>
      <ul className="grid w-full grid-cols-2 gap-8">
        {choices.map((teacher) => {
          const picked = teacher.key === chosenKey;
          return (
            <li
              key={teacher.key}
              data-teacher-card={teacher.key}
              data-teacher-chosen={picked ? "" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-4 bg-postit-talk p-6 pt-9 shadow-postit",
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
                )}
              >
                <TeacherPortrait teacher={teacher} size={PORTRAIT_PX} />
                <span className="font-heading text-[36px] leading-none">
                  {teacher.nameKo}
                </span>
                <span className="flex flex-wrap justify-center gap-2">
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
              </button>
              <SmallButton
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
