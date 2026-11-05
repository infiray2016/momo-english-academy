"use client";

// 이야기 화면(가르치고 배우는 수업 plan 묶음 라-1 · spec 설계 1 '이야기' · 5 화면 표 '혼자 해 보기' · '다른 예시' · 10 듣기 자료, 표본 S11 · S14,
// C175 (3) · C177 (3) · C179 (2)). 글자 없이 소리만 — 이야기 글(storyEn)은 그리지 않고 듣기 표시만 둔다. 들어오면 저절로 한 번 들려주고
// '다시 듣기' 한 번, '다음'. 이야기는 글 자료라 지금 목소리(감싸지 않은 접점)로 읽는다(설계 4 목소리 표). 소리 없이 넘어간 들려주기는
// '다시 듣기' 횟수에 세지 않고(storyPlaysOf) '다음'은 막지 않는다 — 들었는지(heard)를 onNext 로 넘겨 부르는 쪽이 소리 없이 낸 답을 기술
// 오류(U)로 적는다. 소리가 안 날 때의 다시 해 보기 안내(UI · UX sound-retry)는 말하기 조각(라-3)이 붙인다.
import { Ear, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ICON_STROKE } from "@/components/activities/common";
import { BigButton, SmallButton } from "@/components/board/board";
import { TEACH_TEXT } from "@/components/session/teach/teacher-line";
import {
  type StoryPlays,
  storyPlaysOf,
  type TeachLineResult,
} from "@/core/session/teach-line";
import type { SpeechPort } from "@/lib/speech/types";

/** 이야기 화면이 끝나며 넘기는 사실(시도 꼴 story.replayed · 소리 없음). */
export type StoryResult = { heard: boolean; replayed: boolean };

export function StoryView({
  plays,
  playing,
  onReplay,
  onNext,
}: {
  plays: StoryPlays;
  playing: boolean;
  onReplay: () => void;
  onNext: () => void;
}) {
  return (
    <section
      data-teach-story=""
      data-story-playing={playing ? "" : undefined}
      className="flex flex-1 flex-col items-center gap-8"
    >
      <span
        aria-hidden
        data-listening-mark=""
        className="flex size-40 items-center justify-center rounded-full border-(length:--paper-edge) border-ink bg-paper text-ink"
      >
        <Ear className="size-20" strokeWidth={ICON_STROKE} />
      </span>
      <SmallButton
        data-teach-action="listen-again"
        disabled={!plays.replayLeft}
        onClick={onReplay}
      >
        <Volume2 aria-hidden className="size-7" strokeWidth={ICON_STROKE} />
        {TEACH_TEXT.listenAgain}
      </SmallButton>
      <BigButton
        className="mt-auto self-end"
        data-teach-action="next"
        disabled={!plays.nextBright}
        onClick={onNext}
      >
        {TEACH_TEXT.next}
      </BigButton>
    </section>
  );
}

/** 이야기 화면. onNext 는 '다음'을 누른 때(들었나 · 다시 들었나). */
export function StoryScreen({
  storyEn,
  speech,
  onNext,
}: {
  storyEn: string;
  speech: SpeechPort | undefined;
  onNext: (result: StoryResult) => void;
}) {
  const [results, setResults] = useState<TeachLineResult[]>([]);
  const [playing, setPlaying] = useState(false);
  const alive = useRef(true);

  const play = (port: SpeechPort) => {
    setPlaying(true);
    void port.speak(storyEn).then((outcome) => {
      if (!alive.current) return;
      setResults((prev) => [...prev, outcome]);
      setPlaying(false);
    });
  };

  // 들어오면 저절로 한 번(접점이 생긴 뒤). 이야기가 바뀌면 처음부터.
  // biome-ignore lint/correctness/useExhaustiveDependencies: play 는 그림마다 새 함수라 이야기 · 접점이 바뀔 때만 다시 들려준다
  useEffect(() => {
    if (!speech) return;
    alive.current = true;
    setResults([]);
    play(speech);
    return () => {
      alive.current = false;
      speech.cancelSpeaking();
    };
  }, [speech, storyEn]);

  const plays = storyPlaysOf(results, playing);
  return (
    <StoryView
      plays={plays}
      playing={playing}
      onReplay={() => {
        if (!speech || !plays.replayLeft) return;
        speech.unlockFromGesture();
        play(speech);
      }}
      onNext={() => onNext({ heard: plays.heard, replayed: plays.replayed })}
    />
  );
}
