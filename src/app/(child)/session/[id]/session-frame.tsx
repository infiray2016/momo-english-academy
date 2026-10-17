"use client";

// 세션 틀 화면(3.3 첫 활동 새 단어 미리보기 · 영역별 세션 순서 · 5절 · 8절, plan-p10b 파일별 값 7 · 정할 것 ㅈ · 위험 7 · 12).
// 위 종이 띠(수업 제목 · '<n>단계 · 단원 <u>' · '홈') · 활동 점 · 영역 색 활동 카드 · 큰 '다음'.
// 활동 1(미리보기)의 '다음'은 보인 단어를 시도로 기기 대기열에 넣고(정할 것 ㄹ) 다음 활동으로 간다. 활동 2부터는 P5b 표시 조각으로
// 보기만 하고 '다음'(시도 없음 — P11 이 활동마다 상호작용 · 채점을 붙인다). 마지막 활동 뒤에는 수업 목록으로(세션은 진행으로 남음).
// '홈'은 첫 활동이면 세션 행을 지우게 서버에 알린 뒤 홈으로 간다(AC-2e). 소리 자리는 그리기만 한다(P11).
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ActivityCard,
  NewWordsPreview,
  type PictureLookup,
} from "@/components/activities/common";
import {
  ReadingPassage,
  ReadingQuestion,
} from "@/components/activities/reading";
import {
  ListeningItem,
  PictureTask,
  PresentationTask,
  RepeatItem,
  SpeakingQuestion,
} from "@/components/activities/speaking";
import {
  WritingComposition,
  WritingGuidedSentence,
  WritingGuidedTask,
  WritingItem,
} from "@/components/activities/writing";
import {
  BigButton,
  ChildScreen,
  PaperBand,
  SmallButton,
} from "@/components/board/board";
import type { Activity } from "@/core/session/preview";
import { type AttemptQueue, createAttemptQueue } from "@/lib/attempt-queue";
import { cn } from "@/lib/utils";
import { leaveSession, saveAttempts } from "@/server/actions/session";
import type { SessionView } from "@/server/session";

/** 화면 글(4절 · 정본 밖 문구 표 세션 틀 행). */
const TEXT = {
  next: "다음",
  home: "홈",
  levelUnit: (level: number, unit: number) => `${level}단계 · 단원 ${unit}`,
} as const;

/** 활동 점 색(영역 포스트잇 토큰). */
const DOT_TONE = {
  reading: "bg-postit-reading",
  writing: "bg-postit-writing",
  speaking: "bg-postit-speaking",
} as const;

function storageOrUndefined(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function ActivityBody({
  view,
  activity,
  pictures,
}: {
  view: SessionView;
  activity: Activity;
  pictures: PictureLookup;
}) {
  switch (activity.kind) {
    case "preview":
      return (
        <NewWordsPreview
          entries={view.preview.map(({ word, meaningKo, example }) => ({
            word,
            meaningKo,
            example,
          }))}
        />
      );
    case "reading-passage":
      if (view.area !== "reading") return null;
      return (
        <ReadingPassage
          passage={view.lesson.content.passage}
          glossary={view.lesson.content.glossary}
          markWords={[
            ...view.lesson.newWords,
            ...view.lesson.content.targetWords,
          ]}
          pictureWords={view.lesson.newWords}
          level={view.level}
          pictures={pictures}
        />
      );
    case "reading-question": {
      if (view.area !== "reading") return null;
      const question = view.lesson.content.questions[activity.index];
      return question ? (
        <ReadingQuestion question={question} pictures={pictures} />
      ) : null;
    }
    case "writing-item": {
      if (view.area !== "writing" || view.lesson.content.shape !== "items")
        return null;
      const item = view.lesson.content.items[activity.index];
      return item ? <WritingItem item={item} pictures={pictures} /> : null;
    }
    case "writing-task":
      if (view.area !== "writing" || view.lesson.content.shape !== "guided")
        return null;
      return (
        <WritingGuidedTask
          task={view.lesson.content.task}
          example={view.lesson.content.example}
        />
      );
    // P11 차례 1 꿰맞춤: 문장 전부 한 활동 · 초고 활동을 P10 자리 표시 그대로(차례 2 가 틀을 다시 쓴다)
    case "writing-guided":
      if (view.area !== "writing" || view.lesson.content.shape !== "guided")
        return null;
      return (
        <>
          {view.lesson.content.sentences.map((sentence) => (
            <WritingGuidedSentence
              key={sentence.frame}
              frame={sentence.frame}
              wordBox={sentence.wordBox}
            />
          ))}
        </>
      );
    case "draft":
      if (
        view.area !== "writing" ||
        view.lesson.content.shape !== "composition"
      )
        return null;
      return (
        <WritingComposition
          task={view.lesson.content.task}
          example={view.lesson.content.example}
          hints={view.lesson.content.hints}
        />
      );
    case "repeat-word":
    case "repeat-sentence": {
      if (view.area !== "speaking") return null;
      const { repeat } = view.lesson.content;
      const text =
        activity.kind === "repeat-word"
          ? repeat.words[activity.index]
          : repeat.sentences[activity.index];
      return text ? <RepeatItem text={text} /> : null;
    }
    case "listening": {
      if (view.area !== "speaking") return null;
      const item = view.lesson.content.listening[activity.index];
      return item ? <ListeningItem item={item} pictures={pictures} /> : null;
    }
    case "question": {
      if (view.area !== "speaking") return null;
      const question = view.lesson.content.questions[activity.index];
      return question ? (
        <SpeakingQuestion question={question} showKo={view.showKo} />
      ) : null;
    }
    case "picture-task":
      if (view.area !== "speaking" || !view.lesson.content.pictureTask)
        return null;
      return (
        <PictureTask
          task={view.lesson.content.pictureTask}
          pictures={pictures}
        />
      );
    case "presentation":
      if (view.area !== "speaking" || !view.lesson.content.presentation)
        return null;
      return (
        <PresentationTask
          topic={view.lesson.content.presentation.topic}
          prepWords={view.lesson.content.presentation.prepWords}
        />
      );
    default:
      // b · c 몫 활동(자리 표시 없음)
      return null;
  }
}

export function SessionFrame({ view }: { view: SessionView }) {
  const router = useRouter();
  const [current, setCurrent] = useState(view.current);
  const [busy, setBusy] = useState(false);
  const queue = useRef<AttemptQueue | undefined>(undefined);
  const cardRef = useRef<HTMLDivElement>(null);
  // 하이드레이션 끝 표시(e2e 가 누르기 전에 기다린다)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const total = view.activities.length;
  const activity = view.activities[current - 1];

  // 기기 대기열(8절): 남은 시도를 먼저 보내고, 다시 연결되면 또 보낸다
  useEffect(() => {
    const created = createAttemptQueue({
      storage: storageOrUndefined(),
      send: async (batch) => {
        const out = await saveAttempts(batch);
        if (!out.ok) throw new Error(out.reason);
        return out.accepted;
      },
      onlineTarget: window,
    });
    queue.current = created;
    void created.flush();
    return () => created.dispose();
  }, []);

  // 활동이 바뀌면 활동 카드로 초점을 옮긴다(보조 기술이 새 활동을 읽게)
  useEffect(() => {
    if (current > 0) cardRef.current?.focus();
  }, [current]);

  const pictures: PictureLookup = {
    ofWord: (word) =>
      view.wordPictures[word] ?? { meaningKo: word, catalogued: false },
    ofKey: (key) =>
      view.keyPictures[key] ?? { meaningKo: key, catalogued: false },
  };

  async function next() {
    if (busy) return;
    if (activity?.kind === "preview") {
      // 보인 단어는 그때 만난 것으로 기록한다(3.2, 정할 것 ㄹ) — 끊겨도 기기에 쌓였다가 다시 보낸다
      await queue.current?.add({
        clientAttemptId: crypto.randomUUID(),
        sessionId: view.sessionId,
        activityNo: current,
        input: { shownWords: view.preview.map((w) => w.word) },
      });
    }
    if (current < total) {
      setCurrent(current + 1);
      return;
    }
    // 마지막 활동 뒤 — 세션은 진행으로 남는다(완료 · 결과는 P11 · P12)
    setBusy(true);
    await queue.current?.idle();
    router.push(`/${view.area}/lessons`);
  }

  async function home() {
    setBusy(true);
    try {
      await leaveSession({
        sessionId: view.sessionId,
        onFirstActivity: current === 1,
      });
    } catch {
      // 닿지 않으면 세션은 진행으로 남는다(다음 목록 요청 · 오래 멈춤 닫기가 정리)
    }
    router.push("/");
  }

  return (
    <ChildScreen>
      <PaperBand
        heading
        title={view.title}
        detail={TEXT.levelUnit(view.level, view.unit)}
        right={
          <SmallButton disabled={busy} onClick={() => void home()}>
            {TEXT.home}
          </SmallButton>
        }
      />
      <ol
        data-activity-dots=""
        aria-hidden
        className="flex flex-wrap justify-center gap-2"
      >
        {view.activities.map((a, i) => (
          <li
            // 활동 차례가 곧 자리다
            // biome-ignore lint/suspicious/noArrayIndexKey: 활동 번호(1부터)가 열쇠다
            key={i}
            data-dot={
              i + 1 === current ? "current" : i + 1 < current ? "done" : "next"
            }
            className={cn(
              "size-4 rounded-full border-2 border-ink",
              i + 1 < current && DOT_TONE[view.area],
              i + 1 === current && "size-5 bg-ink",
              i + 1 > current && "bg-paper",
              a.kind === "preview" && "rounded-sm",
            )}
          />
        ))}
      </ol>
      <div
        ref={cardRef}
        tabIndex={-1}
        data-activity={activity?.kind ?? "none"}
        data-hydrated={hydrated ? "" : undefined}
        data-activity-no={current}
        className="outline-none"
      >
        <ActivityCard area={view.area} className="shadow-postit">
          {activity ? (
            <ActivityBody view={view} activity={activity} pictures={pictures} />
          ) : null}
        </ActivityCard>
      </div>
      <BigButton
        className="self-end"
        disabled={busy}
        onClick={() => void next()}
      >
        {TEXT.next}
      </BigButton>
    </ChildScreen>
  );
}
