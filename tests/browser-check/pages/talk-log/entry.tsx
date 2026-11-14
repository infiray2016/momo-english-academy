// 재현 틀: 실제 TalkLog 조각(src/components/conversation/talk-log.tsx)을 그대로 올리고, 지금 턴의 말풍선이 실제 수업처럼 자라게 한다
// (기다림 줄 → 첫 문장 → 둘째 문장 → 아래 줄(뜻)). 틀의 판(으뜸 단추 줄)과 '보는 창 지키기'는 mode=keep 일 때만 흉내 낸다.
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { TalkLog } from "@/components/conversation/talk-log";
import type { TalkLogEntry } from "@/core/conversation/log";

const params = new URLSearchParams(location.search);
const KEEP = params.get("keep") === "1";

function teacher(n: number): TalkLogEntry {
  return {
    who: "teacher",
    key: `t${n}`,
    turnNo: n,
    lines: [{ en: "Nice! I like it too.", ko: "좋아요! 나도 그거 좋아해요." }],
  } as unknown as TalkLogEntry;
}
function child(n: number): TalkLogEntry {
  return {
    who: "child",
    key: `c${n}`,
    turnNo: n,
    said: { kind: "text", text: "I like it." },
  } as unknown as TalkLogEntry;
}

const TYPE_MS = Number(params.get("type") ?? 30);
/** 실제 TypedText 와 같은 꼴: 처음엔 빈 글, TYPE_MS 마다 한 글자. */
function Typed({ text }: { text: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    let n = 0;
    const timer = window.setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= text.length) window.clearInterval(timer);
    }, TYPE_MS);
    return () => window.clearInterval(timer);
  }, [text]);
  return <span aria-hidden>{text.slice(0, shown)}</span>;
}

/** 지금 턴의 말풍선(실제 LessonToriBubble 의 자람을 흉내): step 0 기다림 · 1 첫 문장 · 2 둘째 문장 · 3 아래 줄(자리) · 4 뜻 글. */
function Bubble({ step }: { step: number }) {
  return (
    <div className="row">
      <div className="col">
        {step === 0 ? (
          <div data-tori-waiting="" className="bubble bubblew">
            <span className="dots" />
          </div>
        ) : (
          <button type="button" data-tori-bubble="" className="bubble bubblew">
            <span className="lines">
              <span className="line">
                <Typed text="Great!" />
              </span>
              {step >= 2 ? (
                <span className="line">
                  <Typed text="I like it too." />
                </span>
              ) : null}
            </span>
          </button>
        )}
        {step >= 3 ? (
          <div data-tori-under="" className="under">
            {step >= 4 ? <p data-tori-ko="">좋아요! 나도 그거 좋아.</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function App() {
  const [entries, setEntries] = useState<TalkLogEntry[]>(() =>
    Array.from({ length: 6 }, (_, i) => [teacher(i), child(i)]).flat(),
  );
  const [turnKey, setTurnKey] = useState(0);
  const [step, setStep] = useState(4);
  const [phase, setPhase] = useState<"child" | "reading">("child");
  const panel = useRef<HTMLElement>(null);
  // 새 차례: 실제 틀처럼 (1) 아이 말 줄이 기록에 들고 (2) 턴 열쇠가 바뀌어 말풍선이 새로 열리고 (3) 문장이 차례로 흐른다
  useEffect(() => {
    (window as unknown as { __next: (gap?: number) => void }).__next = (
      gap = 120,
    ) => {
      setPhase("reading");
      setEntries((e) => [...e, teacher(100 + e.length), child(100 + e.length)]);
      setTurnKey((k) => k + 1);
      setStep(0);
      const at = (ms: number, s: number) => setTimeout(() => setStep(s), ms);
      at(gap * 2, 1);
      at(gap * 4, 2);
      at(gap * 5, 3);
      at(gap * 7, 4);
      setTimeout(() => setPhase("child"), gap * 9);
    };
  }, []);
  // 틀의 '보는 창 지키기'(I-2): 판의 마지막 조각이 보는 창 밖이면 창을 넘긴다
  // biome-ignore lint/correctness/useExhaustiveDependencies: 실제 틀처럼 차례(phase)와 턴 열쇠가 바뀔 때마다 다시 지킨다
  useEffect(() => {
    if (!KEEP) return;
    const p = panel.current;
    if (!p) return;
    const keep = () => {
      const target = p.lastElementChild;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const by = rect.bottom + 16 - vh;
      if (by > 0) window.scrollBy(0, by);
    };
    keep();
    const ro = new ResizeObserver(keep);
    ro.observe(p);
    return () => ro.disconnect();
  }, [phase, turnKey]);
  return (
    <main>
      <header className="top">오늘 이야기 목록</header>
      <section ref={panel} className="panel">
        <TalkLog
          entries={entries}
          englishName="Momo"
          bottomKey={turnKey}
          onReplay={() => {}}
        >
          <Bubble key={turnKey} step={step} />
        </TalkLog>
        <div className="foot">
          {phase === "child" ? (
            <button type="button" data-speak="">
              말하기
            </button>
          ) : (
            <span>…</span>
          )}
        </div>
      </section>
    </main>
  );
}

const BUSY = Number(params.get("busy") ?? 0);
if (BUSY > 0) {
  const spin = () => {
    const until = performance.now() + BUSY;
    while (performance.now() < until) {
      /* 붙잡기 */
    }
    requestAnimationFrame(spin);
  };
  requestAnimationFrame(spin);
}
createRoot(document.getElementById("root") as HTMLElement).render(<App />);
