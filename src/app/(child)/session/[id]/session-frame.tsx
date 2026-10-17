"use client";

// 세션 틀 화면(3.3 첫 활동 새 단어 미리보기 · 영역별 세션 순서 · 4절 · 5절 · 8절, plan-p10b 파일별 값 7 · plan-p11a 값 7 · 위험 3 · 4 · 8).
// 위 종이 띠(수업 제목 · '<n>단계 · 단원 <u>' · '홈') · 활동 점 · 영역 색 활동 카드. 활동마다 조각을 고르고, 조각은 끝을 onDone(끝 내용)
// 하나로 알린다 → 틀이 끝 시도 { v: 1, kind, step: "final", … } 를 기기 대기열에 넣고 끝 시도가 없는 가장 앞 활동으로 간다.
// 마지막 활동 뒤 queue.idle() · flush() → finishSession → incomplete 면 한 번 더 → 안 되면 7절 끊김 안내와 online 때 다시 →
// /result/<id>. 이어 할 자리는 서버 끝 시도 ∪ 이 기기 대기열의 끝 시도로 다시 세고(값 2), 활동 안 입력은 이 기기에 되살린다(값 6).
// 첫 누름(미리보기 '다음')에서 unlockFromGesture() 를 불러 뒤 활동의 읽기를 연다(위험 8). 읽기(차례 2) · 쓰기 1~3(차례 3)
// 활동에 상호작용을 붙이고, 아직 조각이 없는 활동(쓰기 4~12 · 말하기 — 차례 4 · b · c)은 P10 처럼 보기만 하고 '다음'
// (시도 없음, 마지막 뒤 수업 목록). 활동이 바뀌면 조각을 새로 만든다(활동 번호 열쇠 — 앞 활동의 입력을 다시 쓰지 않게).
// '홈'은 대기열을 비운 뒤, 첫 활동이고 끝 시도가 없으면 세션 행을 지우게 서버에 알리고 홈으로 간다(AC-2e).
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityCard,
  NewWordsPreview,
  type PictureLookup,
} from "@/components/activities/common";
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
  StatusLine,
} from "@/components/board/board";
import {
  PassageActivity,
  type PassageInput,
  QuestionActivity,
  type QuestionInput,
} from "@/components/session/reading";
import {
  WritingItemActivity,
  type WritingItemInput,
} from "@/components/session/writing-items";
import { resumePointOf } from "@/core/session/attempt";
import type { Activity, ActivityKind } from "@/core/session/preview";
import { type AttemptQueue, createAttemptQueue } from "@/lib/attempt-queue";
import { createSessionInputStore } from "@/lib/session-input";
import { createBrowserSpeech } from "@/lib/speech/browser";
import type { SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";
import {
  finishSession,
  leaveSession,
  saveAttempts,
} from "@/server/actions/session";
import type { SessionView } from "@/server/session";

/** 화면 글(4절 · 7절 네트워크 행 · 정본 밖 문구 표 세션 틀 행). */
const TEXT = {
  next: "다음",
  home: "홈",
  levelUnit: (level: number, unit: number) => `${level}단계 · 단원 ${unit}`,
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  failed: "지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요",
} as const;

/** 활동 점 색(영역 포스트잇 토큰). */
const DOT_TONE = {
  reading: "bg-postit-reading",
  writing: "bg-postit-writing",
  speaking: "bg-postit-speaking",
} as const;

/** 끝 시도를 보내는 활동(차례 2 읽기 · 차례 3 쓰기 1~3). 그 밖은 아직 보기만(차례 4 · b · c 가 더한다). */
const RECORDED_KINDS: ReadonlySet<ActivityKind> = new Set([
  "preview",
  "reading-passage",
  "reading-question",
  "writing-item",
]);

function storageOrUndefined(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** 보기만 하는 활동 몸통(P5b 표시 조각). 미리보기와 아직 상호작용이 없는 활동. */
function DisplayBody({
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
    // 쓰기 4~12 · 말하기 활동은 b · c · 차례 3 · 4 가 상호작용을 붙일 때까지 P10 자리 표시 그대로(보기만)
    case "writing-guided":
      if (view.area !== "writing" || view.lesson.content.shape !== "guided")
        return null;
      return (
        <>
          {view.lesson.content.sentences.map((sentence, i) => (
            <WritingGuidedSentence
              // 같은 틀이 두 번 나올 수 있어 문장 번호가 열쇠다(검토 review-p11-1-code M-5)
              // biome-ignore lint/suspicious/noArrayIndexKey: 시드 문장 차례가 곧 자리다
              key={i}
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
  const [finals, setFinals] = useState<ReadonlySet<number>>(
    () => new Set(view.finals),
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  /** 끝내기가 막혀 다시 해야 하는가('다음'과 online 이 다시 부른다). */
  const [finishPending, setFinishPending] = useState(false);
  const [speech, setSpeech] = useState<SpeechPort | undefined>();
  const queue = useRef<AttemptQueue | undefined>(undefined);
  const cardRef = useRef<HTMLDivElement>(null);
  const finishing = useRef(false);
  const inputs = useMemo(
    () =>
      createSessionInputStore(
        typeof window === "undefined" ? undefined : storageOrUndefined(),
      ),
    [],
  );
  // 하이드레이션 끝 표시(e2e 가 누르기 전에 기다린다) — 기기 저장소의 활동 안 입력은 그 뒤에만 읽는다(서버 그림과 같게)
  const [hydrated, setHydrated] = useState(false);
  const total = view.activities.length;
  const activity = view.activities[current - 1];
  const allRecorded = view.activities.every((a) => RECORDED_KINDS.has(a.kind));

  // 기기 대기열(8절): 남은 시도를 먼저 보내고, 다시 연결되면 또 보낸다. 대기열의 끝 시도를 합쳐 이어 할 자리를 다시 센다
  // biome-ignore lint/correctness/useExhaustiveDependencies: 세션 하나에 한 번만 만든다
  useEffect(() => {
    const created = createAttemptQueue({
      storage: storageOrUndefined(),
      send: async (batch) => {
        const out = await saveAttempts(batch);
        if (!out.ok) throw new Error(out.reason);
        return { accepted: out.accepted, rejected: out.rejected };
      },
      onlineTarget: window,
    });
    queue.current = created;
    // 이 기기의 활동 안 입력에서 그 프로필의 진행 세션이 아닌 줄을 지운다(검토 review-p11-2-code M-1)
    inputs.prune(view.openSessionIds);
    const merged = new Set([...view.finals, ...created.finals(view.sessionId)]);
    setFinals(merged);
    const point = resumePointOf(view.activities, merged);
    if ("next" in point) setCurrent(point.next);
    setHydrated(true);
    void created.flush();
    if ("done" in point && allRecorded) void finish();
    return () => created.dispose();
  }, []);

  // 음성 접점은 렌더 뒤에 만든다(SpeechPort.device 는 useEffect 에서만, P2b)
  useEffect(() => {
    const created = createBrowserSpeech({ settings: view.config.speech });
    setSpeech(created);
    return () => created.dispose();
  }, [view.config.speech]);

  // 끝내기가 막혔으면 다시 연결될 때 다시 해 본다(7절 네트워크 행)
  // biome-ignore lint/correctness/useExhaustiveDependencies: finish 는 매 그림 새로 만들어진다
  useEffect(() => {
    if (!finishPending) return;
    const again = () => void finish();
    window.addEventListener("online", again);
    return () => window.removeEventListener("online", again);
  }, [finishPending]);

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

  async function finish() {
    if (finishing.current) return;
    finishing.current = true;
    setBusy(true);
    setStatus("");
    try {
      let out: Awaited<ReturnType<typeof finishSession>> | undefined;
      for (let round = 0; round < 2; round += 1) {
        await queue.current?.idle();
        await queue.current?.flush();
        try {
          out = await finishSession({ sessionId: view.sessionId });
        } catch {
          out = undefined;
        }
        if (out?.ok || out?.reason !== "incomplete") break;
      }
      if (out?.ok) {
        inputs.clear(view.sessionId);
        router.push(`/result/${view.sessionId}`);
        return;
      }
      if (
        out?.reason === "incomplete" &&
        (queue.current?.finals(view.sessionId).length ?? 0) === 0
      ) {
        // 이 기기에도 없는 활동(다른 기기에서 하다 만 것) — 그 활동에서 다시
        const missing = new Set(out.missing);
        setFinals(
          (before) => new Set([...before].filter((n) => !missing.has(n))),
        );
        setCurrent(out.missing[0] ?? current);
        setFinishPending(false);
        return;
      }
      if (
        out &&
        !out.ok &&
        ["not_found", "closed", "invalid", "no_profile"].includes(out.reason)
      ) {
        inputs.clear(view.sessionId);
        router.push(`/${view.area}/lessons`);
        return;
      }
      setStatus(navigator.onLine ? TEXT.failed : TEXT.offline);
      setFinishPending(true);
    } finally {
      finishing.current = false;
      setBusy(false);
    }
  }

  /** 활동 끝: 끝 시도를 대기열에 넣고(저장소에 바로 쌓임 — 보내기는 기다리지 않음) 끝 시도가 없는 가장 앞 활동으로. */
  function complete(content: Record<string, unknown>) {
    if (!activity) return;
    const no = current;
    void queue.current?.add({
      clientAttemptId: crypto.randomUUID(),
      sessionId: view.sessionId,
      activityNo: no,
      input: { v: 1, kind: activity.kind, step: "final", ...content },
    });
    inputs.clear(view.sessionId, no);
    const next = new Set(finals);
    next.add(no);
    setFinals(next);
    const point = resumePointOf(view.activities, next);
    if ("next" in point) {
      setCurrent(point.next);
      return;
    }
    void finish();
  }

  /** 아직 상호작용이 없는 활동의 '다음'(P10 그대로 — 시도 없음, 마지막 뒤 수업 목록으로, 세션은 진행으로 남음). */
  async function showNext() {
    if (current < total) {
      setCurrent(current + 1);
      return;
    }
    setBusy(true);
    await queue.current?.idle();
    router.push(`/${view.area}/lessons`);
  }

  async function onFrameNext() {
    if (busy) return;
    if (finishPending) {
      void finish();
      return;
    }
    if (activity?.kind === "preview") {
      // 첫 누름에서 뒤 활동의 읽기를 연다(iOS — 위험 8). 보인 단어는 그때 만난 것으로 기록한다(3.2, 정할 것 ㄹ)
      speech?.unlockFromGesture();
      complete({ shownWords: view.preview.map((w) => w.word) });
      return;
    }
    await showNext();
  }

  async function home() {
    setBusy(true);
    try {
      await queue.current?.idle();
      await queue.current?.flush();
      await leaveSession({
        sessionId: view.sessionId,
        onFirstActivity: current === 1 && finals.size === 0,
      });
    } catch {
      // 닿지 않으면 세션은 진행으로 남는다(다음 목록 요청 · 오래 멈춤 닫기가 정리)
    }
    router.push("/");
  }

  const restored = hydrated
    ? (inputs.read(view.sessionId, current) as
        | Record<string, unknown>
        | undefined)
    : undefined;
  const save = (value: unknown) => inputs.write(view.sessionId, current, value);

  let body: React.ReactNode = null;
  let ownButtons = false;
  if (activity?.kind === "reading-passage" && view.area === "reading") {
    ownButtons = true;
    body = (
      <PassageActivity
        passage={view.lesson.content.passage}
        glossary={view.lesson.content.glossary}
        markWords={[
          ...view.lesson.newWords,
          ...view.lesson.content.targetWords,
        ]}
        pictureWords={view.lesson.newWords}
        level={view.level}
        pictures={pictures}
        speech={speech}
        initial={restored as PassageInput | undefined}
        onChange={save}
        onDone={(input) => complete(input)}
      />
    );
  } else if (activity?.kind === "reading-question" && view.area === "reading") {
    const question = view.lesson.content.questions[activity.index];
    if (question) {
      ownButtons = true;
      body = (
        <QuestionActivity
          question={question}
          passage={view.lesson.content.passage}
          pictures={pictures}
          speech={speech}
          initial={restored as QuestionInput | undefined}
          onChange={save}
          onDone={(input) => complete(input)}
        />
      );
    }
  } else if (
    activity?.kind === "writing-item" &&
    view.area === "writing" &&
    view.lesson.content.shape === "items"
  ) {
    const item = view.lesson.content.items[activity.index];
    if (item) {
      ownButtons = true;
      body = (
        <WritingItemActivity
          item={item}
          level={view.level}
          pictures={pictures}
          speech={speech}
          initial={restored as WritingItemInput | undefined}
          onChange={save}
          onDone={(input) => complete(input)}
        />
      );
    }
  } else if (activity) {
    body = <DisplayBody view={view} activity={activity} pictures={pictures} />;
  }
  // 끝내기가 막힌 동안은 마지막 활동 자리에 안내와 '다음'(다시 해 봄)만
  if (finishPending) ownButtons = false;

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
              i + 1 === current
                ? "current"
                : finals.has(i + 1)
                  ? "done"
                  : "next"
            }
            className={cn(
              "size-4 rounded-full border-2 border-ink",
              finals.has(i + 1) && i + 1 !== current && DOT_TONE[view.area],
              i + 1 === current && "size-5 bg-ink",
              !finals.has(i + 1) && i + 1 !== current && "bg-paper",
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
          {finishPending ? null : (
            // 기기 저장소를 읽은 뒤 한 번 다시 그린다(되살린 입력으로)
            <div
              key={`${current}:${hydrated ? "h" : "s"}`}
              className="contents"
            >
              {body}
            </div>
          )}
          {/* 알림 줄은 늘 두어 읽기 도구가 끊김 안내를 읽게 하고, 글이 없으면 화면 배치에서만 뺀다(카드 간격도 안 남김 — 화면 검토 M-5 · 재검토 N-1) */}
          <StatusLine tone="error" className={status ? undefined : "sr-only"}>
            {status}
          </StatusLine>
        </ActivityCard>
      </div>
      {ownButtons ? null : (
        <BigButton
          className="self-end"
          disabled={busy}
          onClick={() => void onFrameNext()}
        >
          {TEXT.next}
        </BigButton>
      )}
    </ChildScreen>
  );
}
