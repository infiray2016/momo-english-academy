// 점검 틀: 회화 수업 화면의 배치(S5 fix 7 · 13절 C241 보완 4 · 화면 재검토 des-s5 D-1). 앱의 실제 스타일(Tailwind)과 실제 조각(아이 화면 한 장 ·
// 위 띠 · 단추 · 선생님 창 · 기록 칸 · 말풍선 · 아이 차례 · 정리)을 그리고, 수업 틀(talk-frame)의 판 짜임과 '보는 창 지키기' 효과는 옮겨 둔다
// (그 조각은 서버 액션 · 말소리 · 흐름에 기대어 이 틀에서 묶지 않는다 — 옮긴 클래스 글은 장면이 talk-frame.tsx 의 글과 같은지 먼저 본다).
// 쿼리: scene=child(아이 차례) · hint(가장 큰 지금 턴의 아이 차례) · suggest(마무리 제안: 말하기와 두 단추) · teacher(선생님 차례 — 지키지 않음) ·
// wrap(정리) · legacy=1(고치기 전 틀의 효과 — 조각 전체의 아래 끝으로 넘김, 기록 칸 높이 맞춤 없음).
// window.__scene(이름) 으로 같은 쪽에서 차례를 바꾼다(차례가 바뀔 때 쪽이 움직이는지 잼).
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { CHILD_SIZE } from "@/components/activities/common";
import {
  BigButton,
  ChildScreen,
  PaperBand,
  SmallButton,
} from "@/components/board/board";
import { ChildTurn } from "@/components/conversation/child-turn";
import { LessonWrapUp } from "@/components/conversation/follow-along";
import * as talkLog from "@/components/conversation/talk-log";
import { LessonToriBubble } from "@/components/conversation/tori";
import { TeacherWindow } from "@/components/teacher/teacher-window";
import type { TalkLogEntry } from "@/core/conversation/log";
import { TEACHER_TEXT } from "@/core/teacher/name";
import type { TeacherView } from "@/core/teacher/roster";
import { cn } from "@/lib/utils";
import { FRAME_CLASSES } from "./frame-classes.mjs";

const { TalkLog } = talkLog;
const params = new URLSearchParams(location.search);
const LEGACY = params.get("legacy") === "1";
const PAIRS = Number(params.get("pairs") ?? 7);

const TEACHER: TeacherView = {
  key: "mina",
  nameKo: "미나",
  introKo: "",
  traitsKo: [],
  greetingEn: "Hi!",
  color: { room: "#e8fbd8", accent: "#7cc35b" },
  modelPath: "",
  // 그림 파일은 읽지 않는다(자리는 창 크기 클래스가 정함) — 투명한 한 화소
  portraitPath:
    "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
  voice: { pitch: 1, prefer: [] },
};
const TOPICS = ["호수에 가기", "점심 먹고 마시기", "손 씻고 집에 오기"];

function entriesOf(pairs: number): TalkLogEntry[] {
  return Array.from({ length: pairs }, (_, i) => [
    {
      who: "teacher",
      key: `t${i}`,
      turnNo: i * 2 + 1,
      lines: [{ en: "Nice! I like it too.", ko: "좋아! 나도 그거 좋아." }],
    },
    {
      who: "child",
      key: `c${i}`,
      turnNo: i * 2 + 2,
      said: { kind: "speech", text: "I like it." },
    },
  ]).flat() as unknown as TalkLogEntry[];
}

const SPEECH_SETTINGS = new Proxy(
  {},
  { get: (_t, key) => (key === "then" ? undefined : 1000) },
) as never;
const noop = () => {};

type Scene = "child" | "hint" | "suggest" | "teacher" | "wrap";

/** 고치기 전(e72c403) 틀의 효과: 판의 마지막 조각 전체의 아래 끝 + 여유가 보는 창 밖이면 넘긴다. */
function legacyKeep(panel: HTMLElement) {
  const target = panel.lastElementChild;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const over = rect.bottom + 16 - viewportHeight;
  const by = over <= 0 ? 0 : Math.max(0, Math.min(over, rect.top));
  if (by > 0) window.scrollBy(0, by);
}

function App() {
  const [scene, setScene] = useState<Scene>(
    (params.get("scene") as Scene | null) ?? "child",
  );
  const [turnKey, setTurnKey] = useState(0);
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    (window as unknown as { __scene: (s: Scene) => void }).__scene = (s) => {
      setScene(s);
      setTurnKey((k) => k + 1);
    };
  }, []);
  const keepActive = scene !== "teacher";
  // 틀의 효과를 옮김(talk-frame.tsx 의 keepActive 효과 — 장면이 그 글과 같은지 본다)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 실제 틀처럼 차례 · 턴 열쇠가 바뀔 때 다시 건다
  useEffect(() => {
    const panel = panelRef.current;
    if (!keepActive || !panel) return;
    if (LEGACY) {
      const keep = () => legacyKeep(panel);
      keep();
      const observer = new ResizeObserver(keep);
      observer.observe(panel);
      const turned = window.matchMedia("(orientation: portrait)");
      turned.addEventListener("change", keep);
      return () => {
        observer.disconnect();
        turned.removeEventListener("change", keep);
      };
    }
    let frame = 0;
    const keep = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() =>
        talkLog.keepLessonInView(panel),
      );
    };
    keep();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(keep);
    for (const el of [
      panel,
      panel.querySelector("[data-talk-log]"),
      panel.querySelector("[data-talk-log-now]"),
      panel.closest("[data-child-screen]"),
    ])
      if (el) observer?.observe(el);
    const turned = window.matchMedia("(orientation: portrait)");
    turned.addEventListener("change", keep);
    const viewport = window.visualViewport ?? window;
    viewport.addEventListener("resize", keep);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      turned.removeEventListener("change", keep);
      viewport.removeEventListener("resize", keep);
    };
  }, [keepActive, scene, turnKey]);

  const entries = entriesOf(PAIRS);
  const bubble =
    scene === "hint"
      ? {
          lines: [
            { t: "s" as const, en: "That's okay." },
            { t: "s" as const, en: "I like this one." },
            { t: "s" as const, en: "What about you?" },
          ],
          ko: "괜찮아. 나는 이게 좋아. 너는?",
          done: true,
        }
      : {
          lines: [
            { t: "s" as const, en: "Great!" },
            { t: "s" as const, en: "I like it too." },
          ],
          ko: "좋아! 나도 그거 좋아.",
          done: true,
        };
  const childTurn = (
    <ChildTurn
      key={`${turnKey}:${scene}`}
      sessionId="check"
      speech={undefined}
      level={3}
      lowLevel
      englishName="Momo"
      teacherName="미나"
      hints={[]}
      dontKnowCount={0}
      heard={{}}
      settings={{
        speech: SPEECH_SETTINGS,
        talkSpeech: SPEECH_SETTINGS,
        confirmSeconds: 2,
        hintReadMatch: 0.8,
        nospeechDontknowCount: 2,
      }}
      rate={1}
      homophones={[]}
      nudge={false}
      onNudgeShown={noop}
      onSpeech={() => "ok" as never}
      onListenStart={noop}
      onHintListen={noop}
      onListening={noop}
      reveal={async () => undefined}
      onSend={noop}
    />
  );
  const main =
    scene === "wrap" ? (
      <>
        <div data-wrap-log="">
          <TalkLog entries={entries} englishName="Momo" onReplay={noop} />
        </div>
        <LessonWrapUp
          lines={[
            { en: "You talked about the lake.", ko: "호수 이야기를 했어요." },
            { en: "You said, I like it.", ko: "좋아한다고 말했어요." },
          ]}
          farewell={{ en: "Bye!", ko: "안녕!" }}
          env={
            {
              sessionId: "check",
              speech: undefined,
              level: 3,
              lowLevel: true,
              englishName: "Momo",
              teacherName: "미나",
              rate: 1,
              homophones: [],
              settings: {
                speech: SPEECH_SETTINGS,
                talkSpeech: SPEECH_SETTINGS,
                matchPhraseLevels: [0.5, 0.8],
                autoNextSeconds: 2,
                hintReadMatch: 0.8,
                waitHintSeconds: [5, 10],
              },
              onSpeech: () => "ok",
              onNextItem: noop,
              onListening: noop,
              onPraise: noop,
              clientListen: () => ({}),
              saveFollow: noop,
            } as never
          }
          closingFarewell={async () => undefined}
          onDone={noop}
        />
      </>
    ) : null;
  return (
    <ChildScreen>
      <PaperBand
        heading
        title="가족과 호수 나들이"
        detail={
          <span className={FRAME_CLASSES.detail}>
            <span>회화 · 3단계 · 단원 1</span>
            <span data-talk-segment="" className={FRAME_CLASSES.segment}>
              {scene === "wrap" ? "정리" : "대화"}
            </span>
            <span data-talk-count="">말 주고받기 {PAIRS + 1}</span>
          </span>
        }
        right={
          <>
            <SmallButton data-talk-stop="">그만하기</SmallButton>
            <SmallButton>홈</SmallButton>
          </>
        }
      />
      <div data-talk-layout="" className={FRAME_CLASSES.layout}>
        <div data-teacher-column="" className={FRAME_CLASSES.column}>
          <TeacherWindow teacher={TEACHER} state="idle" reducedMotion started />
          <aside data-talk-topics="" className={FRAME_CLASSES.topics}>
            <p className={FRAME_CLASSES.topicsTitle}>오늘 이야기 목록</p>
            <ul className={cn(CHILD_SIZE.guide, FRAME_CLASSES.topicsList)}>
              {TOPICS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </aside>
        </div>
        <div className={FRAME_CLASSES.body}>
          <section
            ref={panelRef}
            data-talk-panel=""
            data-talk-phase={scene}
            className={FRAME_CLASSES.panel}
          >
            <span aria-hidden className={FRAME_CLASSES.tape} />
            {main ?? (
              <>
                <TalkLog
                  entries={entries}
                  englishName="Momo"
                  teacherName="미나"
                  bottomKey={turnKey}
                  onReplay={noop}
                >
                  <LessonToriBubble
                    key={turnKey}
                    content={bubble}
                    level={3}
                    englishName="Momo"
                    teacherName="미나"
                    waiting={null}
                    waitSeconds={[5, 10]}
                    {...(scene === "hint"
                      ? { explanation: "나도 이거 좋아." }
                      : {})}
                    onReplay={noop}
                    onSound={noop}
                  />
                </TalkLog>
                <div className={FRAME_CLASSES.foot}>
                  {scene === "child" || scene === "hint" || scene === "suggest"
                    ? childTurn
                    : null}
                  {scene === "suggest" ? (
                    <div data-talk-choice="" className={FRAME_CLASSES.choice}>
                      <BigButton>더 이야기하기</BigButton>
                      <SmallButton>그만하기</SmallButton>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
      <p
        data-tori-promise=""
        className={cn(CHILD_SIZE.guide, FRAME_CLASSES.promise)}
      >
        <span className="font-heading">{TEACHER_TEXT.promiseLabel}</span>{" "}
        {TEACHER_TEXT.promise("미나")}
      </p>
    </ChildScreen>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
