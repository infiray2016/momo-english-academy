"use client";

// 개발용 회화 방식 전환 쪽 본체(회화 Claude 주도 plan 묶음 D · spec FR-13 · 정본 AC-26o). 프리뷰 배포에서 어른(요청자)이 쓰는 시험 도구이고
// 아이 화면이 아니다. 지금 값(기존 방식 app · 새 방식 claude)을 보이고 둘 가운데 하나로 바꾸는 단추 둘과 안내 두 줄(바뀌는 때 · 새 방식이 도는 단원)을 둔다.
// 바꾸기는 쪽(page.preview.tsx)이 넘긴 서버 액션(src/server/dev/talk-mode.ts changeTalkMode — 접근 쿠키 · 운영 배포 거절 · 두 값만)이 한다.
import { useState, useTransition } from "react";
import type {
  DevTalkMode,
  TalkModeOutcome,
  TalkModeRead,
} from "@/server/dev/talk-mode";

export const TALK_MODE_TEXT = {
  title: "회화 방식 바꾸기(프리뷰 전용)",
  label: { app: "기존 방식", claude: "새 방식" } satisfies Record<
    DevTalkMode,
    string
  >,
  now: (label: string) => `지금 회화 방식: ${label}`,
  unknown: "지금 회화 방식을 읽지 못했어요",
  pick: {
    claude: "새 방식으로 바꾸기",
    app: "기존 방식으로 바꾸기",
  } satisfies Record<DevTalkMode, string>,
  notice: "진행 중인 수업은 처음 값 그대로이고, 새로 여는 수업부터 바뀌어요.",
  /** 새 방식이 도는 단원(13절 'C241 보완' — 단원 번호는 적지 않는다, 단원이 늘면 문구가 그대로 맞게). */
  scope:
    "새 방식은 안내문이 준비된 단원에서만 돌아요. 그 밖의 단원 수업은 새 방식을 골라도 기존 방식으로 열려요.",
  changed: "바꿨어요",
  same: "이미 그 방식이에요",
  notAllowed: "운영 배포에서는 바꿀 수 없어요",
  failed: "바꾸지 못했어요",
} as const;

/** 단추 차례: 새 방식으로 · 기존 방식으로. */
const PICK_ORDER: readonly DevTalkMode[] = ["claude", "app"];

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
