"use client";

// 개발용 회화 방식 전환 쪽 본체(회화 Claude 주도 plan 묶음 D · spec FR-13 · 정본 AC-26o). 프리뷰 배포에서 어른(요청자)이 쓰는 시험 도구이고
// 아이 화면이 아니다. 지금 값(기존 방식 app · 새 방식 claude · 이야기 방식 chat)을 보이고 셋 가운데 하나로 바꾸는 단추 셋과 안내 세 줄(바뀌는 때 ·
// 새 방식이 도는 단원 · 이야기 방식이 열리는 단원과 선생님 — 이야기 방식 plan 묶음 E)을 둔다. 이야기 방식이 열리는 조건은 이 쪽이 셈하지 않고 수업을
// 열 때의 스냅숏 조건이 판단하므로, 여기서는 안내 줄로만 알린다.
// 바꾸기는 쪽(page.preview.tsx)이 넘긴 서버 액션(src/server/dev/talk-mode.ts changeTalkMode — 접근 쿠키 · 운영 배포 거절 · 세 값만)이 한다.
import { useState, useTransition } from "react";
import type {
  DevTalkMode,
  TalkModeOutcome,
  TalkModeRead,
} from "@/server/dev/talk-mode";

export const TALK_MODE_TEXT = {
  title: "회화 방식 바꾸기(프리뷰 전용)",
  label: {
    app: "기존 방식",
    claude: "새 방식(Claude 주도)",
    chat: "이야기 방식(실험)",
  } satisfies Record<DevTalkMode, string>,
  now: (label: string) => `지금 회화 방식: ${label}`,
  unknown: "지금 회화 방식을 읽지 못했어요",
  pick: {
    app: "기존 방식으로 바꾸기",
    claude: "새 방식(Claude 주도)으로 바꾸기",
    chat: "이야기 방식(실험)으로 바꾸기",
  } satisfies Record<DevTalkMode, string>,
  notice: "진행 중인 수업은 처음 값 그대로이고, 새로 여는 수업부터 바뀌어요.",
  /** 새 방식이 도는 단원(13절 'C241 보완' — 단원 번호는 적지 않는다, 단원이 늘면 문구가 그대로 맞게). */
  scope:
    "새 방식은 안내문이 준비된 단원에서만 돌아요. 그 밖의 단원 수업은 새 방식을 골라도 기존 방식으로 열려요.",
  /**
   * 이야기 방식이 열리는 단원과 선생님(이야기 방식 spec 설계 1 '개발용 전환 쪽' · 정본 03 4절 — 재료가 있는 곳은 지금 회화 3단계 단원 1 · 미나뿐).
   * 번호와 이름을 적으므로, 재료가 늘면 dev-talk-mode.test.ts 의 사실 단언이 걸려 이 글을 함께 고친다.
   */
  chatScope: "이야기 방식은 회화 3단계 단원 1 을 미나 선생님과 할 때만 열려요.",
  changed: "바꿨어요",
  same: "이미 그 방식이에요",
  notAllowed: "운영 배포에서는 바꿀 수 없어요",
  failed: "바꾸지 못했어요",
} as const;

/** 단추 차례: 기존 방식으로 · 새 방식으로 · 이야기 방식으로(spec 설계 1 의 이름 차례). */
const PICK_ORDER: readonly DevTalkMode[] = ["app", "claude", "chat"];

const buttonClass =
  "min-h-11 rounded-md border border-neutral-500 bg-neutral-100 px-4 py-2 text-base disabled:opacity-40";

/** 바꾸기 결과 줄. */
export function outcomeLine(outcome: TalkModeOutcome): string {
  if (outcome.ok)
    return outcome.changed ? TALK_MODE_TEXT.changed : TALK_MODE_TEXT.same;
  return outcome.reason === "not-allowed"
    ? TALK_MODE_TEXT.notAllowed
    : TALK_MODE_TEXT.failed;
}

/** 그림만 하는 패널(정적 HTML 로 시험한다). 지금 값의 단추는 누를 수 없다. */
export function TalkModePanel({
  mode,
  busy,
  line,
  onPick,
}: {
  mode: DevTalkMode | null;
  busy: boolean;
  line: string | null;
  onPick: (mode: DevTalkMode) => void;
}) {
  return (
    <section className="space-y-4">
      <p data-testid="talk-mode-now" className="font-semibold text-lg">
        {mode === null
          ? TALK_MODE_TEXT.unknown
          : TALK_MODE_TEXT.now(TALK_MODE_TEXT.label[mode])}
      </p>
      <div className="flex flex-wrap gap-2">
        {PICK_ORDER.map((target) => (
          <button
            key={target}
            type="button"
            data-talk-mode-pick={target}
            className={buttonClass}
            disabled={busy || mode === target}
            onClick={() => onPick(target)}
          >
            {TALK_MODE_TEXT.pick[target]}
          </button>
        ))}
      </div>
      <p>{TALK_MODE_TEXT.notice}</p>
      <p data-testid="talk-mode-scope">{TALK_MODE_TEXT.scope}</p>
      <p data-testid="talk-mode-chat-scope">{TALK_MODE_TEXT.chatScope}</p>
      {line !== null && (
        <p data-testid="talk-mode-line" role="status">
          {line}
        </p>
      )}
    </section>
  );
}

export function TalkMode({
  initial,
  change,
}: {
  initial: TalkModeRead;
  change: (input: unknown) => Promise<TalkModeOutcome>;
}) {
  const [mode, setMode] = useState<DevTalkMode | null>(
    initial.ok ? initial.mode : null,
  );
  const [line, setLine] = useState<string | null>(
    !initial.ok && initial.reason === "not-allowed"
      ? TALK_MODE_TEXT.notAllowed
      : null,
  );
  const [busy, startTransition] = useTransition();

  const onPick = (target: DevTalkMode) => {
    startTransition(async () => {
      try {
        const outcome = await change(target);
        if (outcome.ok) setMode(outcome.mode);
        setLine(outcomeLine(outcome));
      } catch {
        setLine(TALK_MODE_TEXT.failed);
      }
    });
  };

  return (
    <main data-testid="talk-mode" className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="font-bold text-2xl">{TALK_MODE_TEXT.title}</h1>
      <TalkModePanel mode={mode} busy={busy} line={line} onPick={onPick} />
    </main>
  );
}
