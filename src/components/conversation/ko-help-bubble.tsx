"use client";

// 수업 안 한국어로 묻기의 곁 말풍선(spec 판 3 설계 2 '선생님의 답' · '답의 소리' · '소리가 안 났을 때', 13절 C226 — B1 '한국어 도움' 딱지).
// 지금 질문 턴 아래에 아이의 한국어 질문(아이 말풍선, 한국어 글꼴)과 선생님의 한국어 답(선생님 말풍선 꼴 + 딱지)을 붙인다. 한국어 답은 글만이고
// 읽지 않는다. 4단계부터는 가르친 표현을 영어 글(24px)로 보이고, 1~3단계는 그 글을 그리지 않고 한글 글이 보이는 단추 '알려 준 말 듣기'를 둔다.
// 1~3단계 표현 답을 들려주지 못하면 '소리가 안 나왔어요. 다시 들어 봐요'와 큰 '알려 준 말 듣기', 다시도 못 들려주면 무음 모드 줄과 작은 '다음'
// (저절로 넘기지 않는다, 7절 '들려주지 못함'). 말풍선 자체를 누르는 동작은 두지 않는다 — 1~3단계는 '알려 준 말 듣기' 단추 하나로 다시 듣는다(컨트롤러
// 판정 b5-fix1, 코드 검토 rev-b5a M-2). 쉬는 동안(아이 차례가 아직 열리지 않음)은 그 단추가 꺼져 있다.
import { Volume2 } from "lucide-react";
import { CHILD_SIZE } from "@/components/activities/common";
import { BigButton, FOCUS_RING, SmallButton } from "@/components/board/board";
import {
  SOUND_RETRY_TEXT,
  type SoundRetryStep,
} from "@/components/session/sound-retry";
import { fillName } from "@/core/ai/mask";
import { cn } from "@/lib/utils";
import { SilentModeNote } from "./silent-mode-note";
import { BUBBLE_CLASS } from "./tori";

export const KO_HELP_TEXT = {
  /** B1 딱지(plan '옮겨 적는 문구' 도움 말풍선의 표지 — 요청자가 고른 표본의 글, 색은 화면 검토에서 굳힘). */
  badge: "한국어 도움",
  /** 1~3단계 표현 답의 듣기 단추(한글 글이 보이는 단추 — 접근 이름만이 아니다). */
  replayTaught: "알려 준 말 듣기",
} as const;

/** 곁 말풍선 하나의 화면 값(틀이 응답의 help 와 소리 결과로 짓는다). */
export type KoHelpExchange = {
  /** 열쇠(턴 번호 · 순번). */
  key: string;
  question: string;
  /** 선생님의 한국어 답(빈 글이면 답이 빈 행 — 이어 하기로 되살린, 호출 중에 끊긴 질문 — 이라 물은 말만 그린다, 정본 03 대화 기록). */
  sayKo: string;
  /** 4단계부터 보이는 가르친 표현 글(1~3단계는 늘 없다 — 소리로만). */
  shownEn?: string | undefined;
  /** 1~3단계 표현 답(글 없이 소리로만 — '알려 준 말 듣기'를 둔다). */
  soundOnly: boolean;
  /** 1~3단계 표현 답의 들려주지 못함 안내(SoundRetryStep). */
  retry: SoundRetryStep;
};

/**
 * 1~3단계 '알려 준 말 듣기' 알약 단추(한글 글이 보이는 단추). 곁 말풍선 안과, 되묻는 차례 뒤 이어받은 차례(묶음 5-나 — 끝 줄 lesson.koCarry)에서
 * 같은 꼴로 쓴다.
 */
export function KoReplayButton({
  disabled,
  onReplay,
}: {
  disabled: boolean;
  onReplay: () => void;
}) {
  return (
    <button
      type="button"
      data-ko-replay=""
      disabled={disabled}
      onClick={onReplay}
      className={cn(
        FOCUS_RING,
        CHILD_SIZE.target,
        // 꺼진 꼴은 공용 단추와 같은 옅은 값(board.tsx — C226 보완 2 (4))
        "inline-flex items-center gap-2 self-start rounded-full border-2 border-ink bg-paper px-5 font-heading text-[22px] disabled:cursor-not-allowed disabled:border-ink-off-edge disabled:text-ink-off",
      )}
    >
      <Volume2 aria-hidden className="size-6" />
      {KO_HELP_TEXT.replayTaught}
    </button>
  );
}

export function KoHelpBubble({
  exchange,
  englishName,
  /** 아이 차례가 열려 있어 누를 수 있는가(쉬는 동안 · 듣는 동안 · 차례가 지난 뒤는 거짓). */
  canReplay,
  onReplay,
  onNext,
}: {
  exchange: KoHelpExchange;
  englishName: string;
  canReplay: boolean;
  onReplay: () => void;
  onNext: () => void;
}) {
  const replayButton = (big: boolean) =>
    big ? (
      <BigButton
        data-ko-replay=""
        data-retry-size="big"
        disabled={!canReplay}
        onClick={onReplay}
      >
        <Volume2 aria-hidden className="size-6" />
        {KO_HELP_TEXT.replayTaught}
      </BigButton>
    ) : (
      <KoReplayButton disabled={!canReplay} onReplay={onReplay} />
    );
  return (
    <div data-ko-exchange="" className="flex flex-col gap-3">
      <p
        lang="ko"
        data-ko-question=""
        className="self-end rounded-[18px_4px_18px_18px] border-[3px] border-ink bg-postit-reading px-5 py-3 font-heading text-2xl"
      >
        {fillName(exchange.question, englishName)}
      </p>
      {exchange.sayKo.trim() === "" ? null : (
        <div data-ko-help="" className="relative self-start pt-4.5">
          {/* B1 딱지: 말풍선 위 테두리에 걸친 '한국어 도움'(글로 밝힘 — 색만으로 가르지 않는다). 글은 아이용 20px(4절 · C226 보완 2 (2)) — 딱지 높이
              36px 의 절반(pt-4.5)이 말풍선 위로 나오고, 말풍선 위 안쪽 여백(pt-6)이 딱지 아래를 비운다 */}
          <span
            data-ko-badge=""
            className="absolute top-0 left-4 rounded-full border-2 border-ink bg-tape-3 px-3 py-0.5 font-heading text-xl"
          >
            {KO_HELP_TEXT.badge}
          </span>
          <div className={cn(BUBBLE_CLASS, "pt-6")}>
            <p lang="ko" data-ko-say="" className={CHILD_SIZE.guide}>
              {fillName(exchange.sayKo, englishName)}
            </p>
            {exchange.shownEn ? (
              <button
                type="button"
                lang="en"
                data-ko-taught=""
                disabled={!canReplay}
                onClick={onReplay}
                // 누르는 곳 56px 이상(4절 · C226 보완 2 (7))
                className={cn(
                  FOCUS_RING,
                  CHILD_SIZE.english,
                  CHILD_SIZE.target,
                  "inline-flex items-center self-start text-left font-en font-bold",
                )}
              >
                {fillName(exchange.shownEn, englishName)}
              </button>
            ) : null}
            {exchange.soundOnly && exchange.retry === "none"
              ? replayButton(false)
              : null}
          </div>
        </div>
      )}
      {exchange.soundOnly && exchange.retry !== "none" ? (
        <div
          data-ko-retry={exchange.retry}
          className="flex flex-col gap-2 px-2"
        >
          <p role="status" className={CHILD_SIZE.guide}>
            {SOUND_RETRY_TEXT.notice}
          </p>
          {exchange.retry !== "retry" ? <SilentModeNote /> : null}
          <div className="flex flex-wrap items-center gap-3">
            {replayButton(true)}
            {exchange.retry === "next" ? (
              <SmallButton data-ko-next="" onClick={onNext}>
                {SOUND_RETRY_TEXT.next}
              </SmallButton>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
