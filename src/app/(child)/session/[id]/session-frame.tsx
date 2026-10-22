"use client";

// 세션 틀 화면(3.3 첫 활동 새 단어 미리보기 · 영역별 세션 순서 · 4절 · 5절 · 8절, plan-p10b 파일별 값 7 · plan-p11a 값 7 · 위험 3 · 4 · 8).
// 위 종이 띠(수업 제목 · '<n>단계 · 단원 <u>' · '홈') · 활동 점 · 영역 색 활동 카드. 활동마다 조각을 고르고, 조각은 끝을 onDone(끝 내용)
// 하나로 알린다 → 틀이 끝 시도 { v: 1, kind, step: "final", … } 를 기기 대기열에 넣고 끝 시도가 없는 가장 앞 활동으로 간다.
// 마지막 활동 뒤 queue.idle() · flush() → finishSession → incomplete 면 한 번 더 → 안 되면 7절 끊김 안내와 online 때 다시 →
// /result/<id>. 이어 할 자리는 서버 끝 시도 ∪ 이 기기 대기열의 끝 시도로 다시 세고(값 2), 활동 안 입력은 이 기기에 되살린다(값 6).
// 첫 누름(미리보기 '다음')에서 unlockFromGesture() 를 불러 뒤 활동의 읽기를 연다(위험 8). 읽기(차례 2) · 쓰기 1~3(차례 3) ·
// 말하기 1~2(차례 4 — 따라 말하기 · 듣기 이해 · 앱 판정 질문 답) 활동에 상호작용을 붙이고, 아직 조각이 없는 활동(쓰기 4~12 ·
// 말하기 3~12 AI 활동 — b · c)은 P10 처럼 보기만 하고 '다음'(시도 없음, 마지막 뒤 수업 목록). 활동이 바뀌면 조각을 새로 만든다.
// 말하기 세션(값 7 · 12 · 7절): 열 때 마이크를 쓸 수 없는 기기면 '마이크가 필요해요. 부모님께 말해 주세요'와 '홈'만(세션은 진행으로
// 남음), 처음 말하는 활동에서 기기마다 한 번 마이크 안내, 인식 실패 셈(speakingCounters)이 막힌 안내 셋과 기기 알림을 낸다.
// '홈'은 대기열을 비운 뒤, 첫 활동이고 끝 시도가 없으면 세션 행을 지우게 서버에 알리고 홈으로 간다(AC-2e).
// 쓰기 4~5(plan-p11b 값 7 · 9): 과제 · 문장 쓰기(확인은 서버 액션이 AI 결과와 함께 끝 시도를 저장 — 틀은 대기열에 넣지 않고 다음 활동으로,
// 고친 문장은 진행 시도로) · 내 문장 듣고 따라 말하기(마이크를 쓸 수 없으면 건너뜀). 1-가 하루 안전 상한(C50 (2) · C80)이면 열 때 · 도중에
// '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요'와 '홈' 하나(세션은 진행). 막힌 안내는 끝내기 실패보다 먼저 보인다('홈'이 늘 있게).
// 쓰기 6~12 첫 세션(plan-p11b 값 7 · 9): 과제 · 생각 꺼내기(턴마다 서버 액션이 시도를 저장) · 초고(자동 저장은 진행 시도로 대기열에,
// '다 썼어요'는 대기열을 비운 뒤 초고 제출 서버 액션이 세션을 끝냄 — finishSession 을 부르지 않음) → 결과.
// 쓰기 6~12 둘째 세션(plan-p11b 값 7 · 9 · 11): 칭찬 → 교정 하나씩 → 고쳐 쓰기(서버 액션이 끝 시도 저장 · 모범 답안을 돌려줌) → 모범 답안
// (빈 글이면 건너뜀) → 내 글 소리 내어 읽기(마이크를 쓸 수 없으면 건너뜀) → finishSession(점수 없음).
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
import { AiRest } from "@/components/session/ai-rest";
import {
  PassageActivity,
  type PassageInput,
  QuestionActivity,
  type QuestionInput,
} from "@/components/session/reading";
import {
  ListeningActivity,
  type ListeningInput,
  MicNotice,
  QuestionAnswerActivity,
  type QuestionAnswerInput,
  RepeatActivity,
  type RepeatInput,
  type SpeakingEnv,
} from "@/components/session/speaking";
import {
  CompositionTaskActivity,
  DraftActivity,
  type DraftInput,
  ThinkoutActivity,
  type ThinkoutInput,
} from "@/components/session/writing-composition";
import {
  type GuidedInput,
  GuidedTaskActivity,
  GuidedWritingActivity,
  OwnRepeatActivity,
} from "@/components/session/writing-guided";
import {
  WritingItemActivity,
  type WritingItemInput,
} from "@/components/session/writing-items";
import {
  FeedbackCorrectionActivity,
  FeedbackPraiseActivity,
  ModelAnswerActivity,
  REWRITE_TEXT,
  RewriteActivity,
  type RewriteInput,
  sentencesOf,
} from "@/components/session/writing-rewrite";
import { resumePointOf } from "@/core/session/attempt";
import type { Activity, ActivityKind } from "@/core/session/preview";
import {
  type SpeechEvent,
  type SpeechVerdict,
  speakingCounters,
  speakingCountersStart,
} from "@/core/speaking/judge";
import { type AttemptQueue, createAttemptQueue } from "@/lib/attempt-queue";
import {
  markMicNoticeSeen,
  markMicUnavailable,
  micNoticeSeen,
  micUsable,
  readDeviceVerdict,
} from "@/lib/mic-state";
import { createSessionInputStore } from "@/lib/session-input";
import { createBrowserSpeech } from "@/lib/speech/browser";
import type { SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";
import {
  finishSession,
  leaveSession,
  reportSessionMic,
  saveAttempts,
} from "@/server/actions/session";
import {
  checkGuidedWriting,
  submitDraft,
  submitRewrite,
  thinkoutNext,
} from "@/server/actions/writing";
import type { SessionView } from "@/server/session";

/** 화면 글(4절 · 7절 네트워크 행 · 정본 밖 문구 표 세션 틀 행). */
const TEXT = {
  next: "다음",
  home: "홈",
  levelUnit: (level: number, unit: number) => `${level}단계 · 단원 ${unit}`,
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  failed: "지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요",
  /** 막힌 안내 셋(7절 '마이크를 쓸 수 없음' · '오류' · '감시 타이머' 행 · C22). */
  blocked: {
    needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
    stalled: "마이크가 잘 안 돼요. 부모님께 말해 주세요",
    silent: "말소리가 잘 안 들려요. 부모님께 말해 주세요",
  },
} as const;

type Blocked = keyof typeof TEXT.blocked;
/** 말로 답하는 활동(처음 마이크 안내를 그 앞에 둔다). */
const SPOKEN_KINDS: ReadonlySet<ActivityKind> = new Set([
  "repeat-word",
  "repeat-sentence",
  "question",
  "writing-own-repeat",
  "own-speak",
]);

/** 활동 점 색(영역 포스트잇 토큰). */
const DOT_TONE = {
  reading: "bg-postit-reading",
  writing: "bg-postit-writing",
  speaking: "bg-postit-speaking",
} as const;

/** 끝 시도를 보내는 활동(차례 2 읽기 · 차례 3 쓰기 1~3 · 차례 4 말하기 1~2 · 차례 5 쓰기 4~5). 그 밖은 아직 보기만(b · c 가 더한다). */
const RECORDED_KINDS: ReadonlySet<ActivityKind> = new Set([
  "preview",
  "reading-passage",
  "reading-question",
  "writing-item",
  "repeat-word",
  "repeat-sentence",
  "listening",
  "question",
  "writing-task",
  "writing-guided",
  "writing-own-repeat",
  "thinkout",
  "draft",
  "feedback-praise",
  "feedback-correction",
  "rewrite",
  "model-answer",
  "own-speak",
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
  // 질문 답은 앱 판정 단계(1~2)만 이 길(3단계부터 AI — c), 과제는 쓰기 4~5 · 6~12 첫 세션
  const recorded = (a: Activity) =>
    RECORDED_KINDS.has(a.kind) &&
    (a.kind !== "question" || view.appJudged) &&
    (a.kind !== "writing-task" ||
      view.guided !== null ||
      view.composition !== null);
  const allRecorded = view.activities.every(recorded);
  const [blocked, setBlocked] = useState<Blocked | undefined>();
  /** 1-가 하루 안전 상한 — 열 때(서버 화면 자료) · 쓰기 확인 도중(서버 액션)에 켜진다. */
  const [resting, setResting] = useState(view.aiResting);
  /** 내 문장 듣고 따라 말하기의 문장(확인을 낸 뒤 — 고쳤으면 고친 문장). */
  const [ownSentences, setOwnSentences] = useState<string[] | null>(
    view.guided?.sentences ?? null,
  );
  const [noticeSeen, setNoticeSeen] = useState(true);
  /** 쓰기 6~12: 생각 꺼내기 결과(초고 화면이 씀 — 서버 화면 자료 또는 방금 끝낸 턴). */
  const [thinkoutResult, setThinkoutResult] = useState(
    view.composition?.thinkout ?? null,
  );
  /** 쓰기 둘째 세션: 낸 고쳐 쓰기 글 · 모범 답안(서버 화면 자료 또는 방금 낸 것 — 낸 뒤에만 있음). */
  const [rewritten, setRewritten] = useState<{
    text: string;
    modelAnswer: string | null;
  } | null>(
    view.rewrite?.rewriteText
      ? {
          text: view.rewrite.rewriteText,
          modelAnswer: view.rewrite.modelAnswer,
        }
      : null,
  );
  /** 초고 조각이 맡긴 '홈' 앞 저장. */
  const draftFlush = useRef<(() => void) | undefined>(undefined);
  const counters = useRef(speakingCountersStart());
  const limits = {
    maxRetries: view.config.maxRetries,
    silentItemsMax: view.config.silentItemsMax,
  };

  // 말하기 세션: 마이크를 쓸 수 없는 기기면 막힌 안내(세션은 진행으로 남음), 처음 마이크 안내를 봤는지(기기마다 한 번 — 쓰기
  // '내 문장 듣고 따라 말하기'도 같은 안내를 쓴다. 쓰기는 마이크가 없어도 막지 않고 그 활동만 건너뛴다)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 세션을 열 때 한 번만 본다
  useEffect(() => {
    if (view.area === "reading") return;
    if (view.area === "speaking" && !micUsable()) setBlocked("needsMic");
    setNoticeSeen(micNoticeSeen());
  }, []);

  /** 기기 알림(코드 · 브라우저 이름만 — 인식 글 없음). 닿지 않아도 화면은 그대로 막힌 안내다. */
  function report(
    kind: "mic_unavailable" | "mic_stalled" | "speech_silent",
    code: string,
  ) {
    void reportSessionMic({
      kind,
      code: code || kind,
      browser: readDeviceVerdict().name,
    }).catch(() => {});
  }

  /** 인식 결과를 셈에 넣는다(7절 오류 행 · C22). 막힌 판정이면 안내 · 알림, 판정을 조각에 돌려준다. */
  function onSpeech(event: SpeechEvent): SpeechVerdict {
    const step = speakingCounters(counters.current, event, limits);
    counters.current = step.state;
    const code =
      event.type === "error"
        ? event.code
        : event.type === "stalled"
          ? "stalled"
          : event.type === "no-result" || event.type === "heard"
            ? "no-result"
            : "";
    if (step.verdict === "mic-unavailable") {
      markMicUnavailable(code);
      report("mic_unavailable", code);
      setBlocked("needsMic");
    }
    if (step.verdict === "mic-stalled") {
      report("mic_stalled", code);
      setBlocked("stalled");
    }
    if (step.verdict === "speech-silent") {
      report("speech_silent", "no-speech");
      setBlocked("silent");
    }
    return step.verdict;
  }

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

  // 쓰기 '내 문장 듣고 따라 말하기' · '내 글 소리 내어 읽기'(선택): 마이크를 쓸 수 없는 기기면 건너뛰고(쓰기 세션은 막지 않음),
  // 문장이 없으면(다른 기기에서 냈고 글이 아직 닿지 않음 등) 빈 끝 시도로 넘어간다(plan-p11a 정할 것 마 (6)). 모범 답안이 빈 글이면
  // 그 활동을 건너뛴다(값 3 — 걸린 칸 바꾸기 뒤 빈 모범 답안은 보이지 않는다)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 그 활동에 들어올 때 한 번 본다
  useEffect(() => {
    if (!hydrated) return;
    if (activity?.kind === "model-answer" && !rewritten?.modelAnswer) {
      complete({});
      return;
    }
    const spoken =
      activity?.kind === "writing-own-repeat"
        ? ownSentences
        : activity?.kind === "own-speak"
          ? rewritten
            ? sentencesOf(rewritten.text)
            : null
          : undefined;
    if (spoken === undefined) return;
    if (!micUsable()) complete({ skipped: "no_mic" });
    else if (!spoken || spoken.length === 0) complete({});
  }, [hydrated, current]);

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
    void queue.current?.add({
      clientAttemptId: crypto.randomUUID(),
      sessionId: view.sessionId,
      activityNo: current,
      input: { v: 1, kind: activity.kind, step: "final", ...content },
    });
    advance();
  }

  /** 지금 활동을 끝낸 것으로 두고 다음으로(끝 시도는 complete 가 대기열에, AI 활동은 서버 액션이 이미 저장). */
  function advance() {
    const no = current;
    inputs.clear(view.sessionId, no);
    // 새 활동 — 활동 몫 셈을 지운다(세션 몫 '여섯 번' · 말소리 없음 이어짐은 이어진다)
    counters.current = speakingCounters(
      counters.current,
      { type: "next-activity" },
      limits,
    ).state;
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
    // 초고를 쓰던 중이면 마지막 글을 먼저 대기열에(plan-p11b 값 7 · 위험 3)
    draftFlush.current?.();
    try {
      await queue.current?.idle();
      await queue.current?.flush();
      await leaveSession({
        sessionId: view.sessionId,
        // 막힌 안내 · 안전 상한 안내의 '홈'은 세션을 진행으로 남긴다(7절 · C50 (2) — 첫 활동이어도 지우지 않음, 검토 review-p11-4-code M-1)
        onFirstActivity:
          !blocked && !resting && current === 1 && finals.size === 0,
      });
    } catch {
      // 닿지 않으면 세션은 진행으로 남는다(다음 목록 요청 · 오래 멈춤 닫기가 정리)
    }
    router.push("/");
  }

  const registerDraftFlush = useMemo(
    () => (flush: (() => void) | undefined) => {
      draftFlush.current = flush;
    },
    [],
  );
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
  } else if (
    view.area === "writing" &&
    view.lesson.content.shape === "guided" &&
    view.guided &&
    activity?.kind === "writing-task"
  ) {
    const content = view.lesson.content;
    ownButtons = true;
    body = (
      <GuidedTaskActivity
        task={content.task}
        example={content.example}
        {...(view.guided.input === "word-box"
          ? {
              wordBox: [
                ...new Set(content.sentences.flatMap((s) => s.wordBox ?? [])),
              ],
            }
          : {})}
        onDone={() => complete({})}
      />
    );
  } else if (
    view.area === "writing" &&
    view.lesson.content.shape === "guided" &&
    view.guided &&
    activity?.kind === "writing-guided"
  ) {
    const activityNo = current;
    ownButtons = true;
    body = (
      <GuidedWritingActivity
        task={view.lesson.content.task}
        example={view.lesson.content.example}
        sentences={view.lesson.content.sentences}
        input={view.guided.input}
        waitHintSeconds={view.config.ui.waitHintSeconds}
        initial={restored as GuidedInput | undefined}
        onChange={save}
        check={(req) =>
          checkGuidedWriting({
            sessionId: view.sessionId,
            activityNo,
            ...req,
          })
        }
        onResting={() => setResting(true)}
        onLeave={() => {
          inputs.clear(view.sessionId);
          router.push(`/${view.area}/lessons`);
        }}
        onDone={(sentences, fixed) => {
          // 끝 시도는 서버 액션이 저장했다. 고친 문장은 진행 시도로(내 문장 듣기 · 다시 열 때)
          if (fixed)
            void queue.current?.add({
              clientAttemptId: crypto.randomUUID(),
              sessionId: view.sessionId,
              activityNo,
              input: {
                v: 1,
                kind: "writing-guided-fix",
                step: "progress",
                fixed: sentences,
              },
            });
          setOwnSentences(sentences);
          advance();
        }}
      />
    );
  } else if (
    view.area === "writing" &&
    view.lesson.content.shape === "composition" &&
    view.composition &&
    activity?.kind === "writing-task"
  ) {
    ownButtons = true;
    body = (
      <CompositionTaskActivity
        task={view.lesson.content.task}
        example={view.lesson.content.example}
        onDone={() => complete({})}
      />
    );
  } else if (
    view.area === "writing" &&
    view.composition &&
    activity?.kind === "thinkout"
  ) {
    const activityNo = current;
    ownButtons = true;
    body = (
      <ThinkoutActivity
        initialTurn={view.composition.thinkoutTurn}
        waitHintSeconds={view.config.ui.waitHintSeconds}
        initial={restored as ThinkoutInput | undefined}
        onChange={save}
        step={(req) =>
          thinkoutNext({ sessionId: view.sessionId, activityNo, ...req })
        }
        onDone={(result) => {
          // 끝 시도는 서버 액션이 저장했다
          setThinkoutResult(
            result ? { state: "done", ...result } : { state: "failed" },
          );
          advance();
        }}
        onResting={() => setResting(true)}
        onLeave={() => {
          inputs.clear(view.sessionId);
          router.push(`/${view.area}/lessons`);
        }}
      />
    );
  } else if (
    view.area === "writing" &&
    view.lesson.content.shape === "composition" &&
    view.composition &&
    activity?.kind === "draft"
  ) {
    const activityNo = current;
    const content = view.lesson.content;
    ownButtons = true;
    body = (
      <DraftActivity
        task={content.task}
        example={content.example}
        hints={content.hints}
        thinkout={thinkoutResult}
        amount={view.composition.amount}
        speech={speech}
        initialText={view.composition.draftText}
        initial={restored as DraftInput | undefined}
        onChange={save}
        autosave={(text) =>
          void queue.current?.add({
            clientAttemptId: crypto.randomUUID(),
            sessionId: view.sessionId,
            activityNo,
            input: { v: 1, kind: "draft", step: "progress", text },
          })
        }
        registerFlush={registerDraftFlush}
        submit={async (req) => {
          // 앞 활동의 끝 시도를 먼저 보낸 뒤 낸다(서버가 앞 활동이 다 있어야 받는다 — 빠졌으면 한 번 더)
          let out: Awaited<ReturnType<typeof submitDraft>> | undefined;
          for (let round = 0; round < 2; round += 1) {
            await queue.current?.idle();
            await queue.current?.flush();
            out = await submitDraft({
              sessionId: view.sessionId,
              activityNo,
              ...req,
            });
            if (out.ok || out.reason !== "incomplete") break;
          }
          if (!out) throw new Error("초고를 내지 못했다");
          if (out.ok) {
            inputs.clear(view.sessionId);
            router.push(out.resultPath);
            return out;
          }
          if (out.reason === "incomplete") {
            // 서버에도 이 기기 대기열에도 없는 앞 활동(서버가 버린 시도 · 다른 기기) — 끝내기와 같은 꼴로 그 활동으로 돌아간다.
            // 쓴 초고는 기기 입력에 남아 다시 오면 그대로다(코드 검토 review-p11-6-code M-3)
            const queued = new Set(queue.current?.finals(view.sessionId) ?? []);
            const lost = out.missing.filter((no) => !queued.has(no));
            const back = lost[0];
            if (back !== undefined) {
              setFinals(
                (before) =>
                  new Set([...before].filter((n) => !lost.includes(n))),
              );
              setCurrent(back);
            }
          }
          return out;
        }}
        onLeave={() => {
          inputs.clear(view.sessionId);
          router.push(`/${view.area}/lessons`);
        }}
      />
    );
  } else if (view.area === "writing" && view.rewrite && activity) {
    const rv = view.rewrite;
    const activityNo = current;
    if (activity.kind === "feedback-praise") {
      ownButtons = true;
      body = (
        <FeedbackPraiseActivity
          praise={rv.praise}
          onDone={() => complete({})}
        />
      );
    } else if (activity.kind === "feedback-correction") {
      const correction = rv.corrections[activity.index];
      if (correction) {
        ownButtons = true;
        body = (
          <FeedbackCorrectionActivity
            correction={correction}
            onDone={() => complete({})}
          />
        );
      }
    } else if (activity.kind === "rewrite") {
      ownButtons = true;
      body = (
        <RewriteActivity
          draftText={rv.draftText}
          corrections={rv.corrections}
          initial={restored as RewriteInput | undefined}
          onChange={save}
          submit={(req) =>
            submitRewrite({ sessionId: view.sessionId, activityNo, ...req })
          }
          onDone={(text, modelAnswer) => {
            // 끝 시도는 서버 액션이 저장했다 — 모범 답안은 이제 보인다(AC-4c)
            setRewritten({ text, modelAnswer });
            advance();
          }}
          onLeave={() => {
            inputs.clear(view.sessionId);
            router.push(`/${view.area}/lessons`);
          }}
        />
      );
    } else if (activity.kind === "model-answer" && rewritten?.modelAnswer) {
      ownButtons = true;
      body = (
        <ModelAnswerActivity
          text={rewritten.modelAnswer}
          onDone={() => complete({})}
        />
      );
    } else if (activity.kind === "own-speak" && rewritten) {
      ownButtons = true;
      body = !noticeSeen ? (
        <MicNotice
          onOk={() => {
            speech?.unlockFromGesture();
            markMicNoticeSeen();
            setNoticeSeen(true);
          }}
        />
      ) : (
        <OwnRepeatActivity
          sentences={sentencesOf(rewritten.text)}
          guide={REWRITE_TEXT.ownSpeak}
          env={{
            speech,
            speechSettings: view.config.speech,
            level: view.level,
            homophones: view.homophones,
          }}
          phraseLevels={view.config.ui.matchPhraseLevels}
          autoNextSeconds={view.config.ui.autoNextSeconds}
          limits={limits}
          onDone={(result) => complete(result)}
        />
      );
    } else {
      ownButtons = true;
    }
  } else if (
    view.area === "writing" &&
    activity?.kind === "writing-own-repeat"
  ) {
    ownButtons = true;
    body =
      !noticeSeen && ownSentences && ownSentences.length > 0 ? (
        <MicNotice
          onOk={() => {
            speech?.unlockFromGesture();
            markMicNoticeSeen();
            setNoticeSeen(true);
          }}
        />
      ) : ownSentences && ownSentences.length > 0 ? (
        <OwnRepeatActivity
          sentences={ownSentences}
          env={{
            speech,
            speechSettings: view.config.speech,
            level: view.level,
            homophones: view.homophones,
          }}
          phraseLevels={view.config.ui.matchPhraseLevels}
          autoNextSeconds={view.config.ui.autoNextSeconds}
          limits={limits}
          onDone={(result) => complete(result)}
        />
      ) : null;
  } else if (
    view.area === "speaking" &&
    activity &&
    recorded(activity) &&
    activity.kind !== "preview"
  ) {
    const env: SpeakingEnv = {
      speech,
      speechSettings: view.config.speech,
      level: view.level,
      homophones: view.homophones,
      onSpeech,
    };
    const c = view.lesson.content;
    ownButtons = true;
    if (!noticeSeen && SPOKEN_KINDS.has(activity.kind)) {
      body = (
        <MicNotice
          onOk={() => {
            speech?.unlockFromGesture();
            markMicNoticeSeen();
            setNoticeSeen(true);
          }}
        />
      );
    } else if (
      activity.kind === "repeat-word" ||
      activity.kind === "repeat-sentence"
    ) {
      const text =
        activity.kind === "repeat-word"
          ? c.repeat.words[activity.index]
          : c.repeat.sentences[activity.index];
      body = text ? (
        <RepeatActivity
          text={text}
          env={env}
          phraseLevels={view.config.ui.matchPhraseLevels}
          autoNextSeconds={view.config.ui.autoNextSeconds}
          initial={restored as RepeatInput | undefined}
          onChange={save}
          onDone={(input) => complete(input)}
        />
      ) : null;
    } else if (activity.kind === "listening") {
      const item = c.listening[activity.index];
      body = item ? (
        <ListeningActivity
          item={item}
          level={view.level}
          pictures={pictures}
          speech={speech}
          initial={restored as ListeningInput | undefined}
          onChange={save}
          onDone={(input) => complete(input)}
        />
      ) : null;
    } else if (activity.kind === "question") {
      const question = c.questions[activity.index];
      body = question ? (
        <QuestionAnswerActivity
          question={question}
          showKo={view.showKo}
          env={env}
          answerShape={view.answerShapes[current - 1] ?? "one-sentence"}
          capSeconds={view.config.speaking.answerMaxSeconds}
          pass={view.config.speaking.answerMatchPass}
          initial={restored as QuestionAnswerInput | undefined}
          onChange={save}
          onDone={(input) => complete(input)}
        />
      ) : null;
    }
  } else if (activity) {
    body = <DisplayBody view={view} activity={activity} pictures={pictures} />;
  }
  // 1-가 하루 안전 상한(한 화면 — 안내와 '홈'만, 세션은 진행으로 남음, C50 (2) · C80)
  if (resting && !blocked) {
    ownButtons = true;
    body = <AiRest busy={busy} onHome={() => void home()} />;
  }
  // 막힌 안내(한 화면 — 안내와 '홈'만, 세션은 진행으로 남음, 7절)
  if (blocked) {
    ownButtons = true;
    body = (
      <div
        data-blocked={blocked}
        className="flex flex-col items-center gap-8 py-6"
      >
        <p className="text-center font-heading text-[28px] leading-snug">
          {TEXT.blocked[blocked]}
        </p>
        {/* '홈' 버튼 하나(7절) — 종이 띠의 '홈'은 숨기고 같은 길(대기열 비우기 · 세션은 진행으로) */}
        <BigButton disabled={busy} onClick={() => void home()}>
          {TEXT.home}
        </BigButton>
      </div>
    );
  }
  // 끝내기가 막힌 동안은 마지막 활동 자리에 안내와 '다음'(다시 해 봄)만. 막힌 안내 · 안전 상한 안내가 먼저다('홈'이 늘 보이게 —
  // 마지막 활동이 말소리 없음으로 막힌 채 끝내기가 실패한 때, 검토 review-p11-fix4-code M-2)
  const stopped = Boolean(blocked) || resting;
  const showFinishRetry = finishPending && !stopped;
  if (showFinishRetry) ownButtons = false;

  return (
    <ChildScreen>
      <PaperBand
        heading
        title={view.title}
        detail={TEXT.levelUnit(view.level, view.unit)}
        right={
          stopped ? undefined : (
            <SmallButton disabled={busy} onClick={() => void home()}>
              {TEXT.home}
            </SmallButton>
          )
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
          {showFinishRetry ? null : (
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
