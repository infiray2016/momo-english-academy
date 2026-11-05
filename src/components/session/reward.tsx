// 결과 · 마무리 보상 표시(13절 C166 R3 · C167 (5) — P12 일부 당김, UX 검토 3판 U4-1 · 불편 장면 14). 별을 받는 세션(판정은
// core/reward/star earnsStar — 홈 별 합과 같은 셈)이면 서버가 실은 reward.star_complete 개만큼 별 그림을 그리고 글은 숫자 없이 둔다.
// 오늘 만난 말(세 영역 결과 칸 — 정본 03:26 · 가르치고 배우는 수업 spec 설계 5 문구 표, C173 (1) · C178 UX1)은 단어 카드(영어 · 뜻 · 소리 단추)이고,
// 되짚기가 있으면 그 아래 칩을 단 문장 틀(children — teach/recap.tsx RecapFrame)이 같은 칸에 온다. 회화 마무리 첫 장의 칸 이름은 '오늘 만난
// 단어'(정본 03:24) 그대로다(REWARD_TEXT.metWordsTalk — 회화 마무리는 제 조각 closing-cards 가 그린다). 별 그림은 회화 마무리 첫 장과 세 영역
// 결과가 같이 쓴다.
// 훅이 없어 서버 · 클라이언트 둘 다에서 그린다. 숫자 · 퍼센트를 보이지 않는다.
// UI · UX 묶음 5-가(spec 설계 5.4 결과 판 배치): 결과 판 오른쪽 열(세로는 맨 위)의 큰 별은 size="big"(큰 별 그림 위 · 글 아래, 가운데),
// 회화 마무리 첫 장은 지금 꼴(한 줄). 단어 카드는 노랑 둥근 종이(종이 테 · 카드 모서리) 꼴이다. 아이콘 획은 ICON_STROKE(5.2 · D-8).
import { Star, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { CHILD_SIZE, ICON_STROKE } from "@/components/activities/common";
import { FOCUS_RING } from "@/components/board/board";
import { cn } from "@/lib/utils";

/**
 * 보상 글(4절 세션 결과 · 회화 마무리 행 '별' · '다시 했어요', 정본 밖 문구 C78 · C166). 칸 이름은 둘로 가른다: 세 영역 결과 '오늘 만난 말'
 * (가르치고 배우는 수업 spec 설계 5 문구 표 '결과 칸 이름' — teach 없는 수업도 같은 이름), 회화 마무리 첫 장 '오늘 만난 단어'(정본 03:24).
 * 낱말 소리 단추의 이름 '단어 듣기'는 회화 마무리 첫 장의 같은 단추 글(closing-cards CLOSING_TEXT.listenWord)을 그대로 쓴다(새 문구 아님).
 */
export const REWARD_TEXT = {
  star: "별을 받았어요",
  retried: "다시 했어요",
  metWords: "오늘 만난 말",
  metWordsTalk: "오늘 만난 단어",
  listenWord: "단어 듣기",
} as const;

/**
 * 낱말 소리 단추의 접근 이름(라-4 fix 1 M4): 보이는 글은 없고(소리 그림만), 화면 읽기 기능이 어느 낱말의 단추인지 알도록 '단어 듣기: apple'
 * 꼴로 낱말을 잇는다. 세 영역 결과와 회화 마무리 첫 장(closing-cards)이 같이 쓴다.
 */
export function listenWordLabel(word: string): string {
  return `${REWARD_TEXT.listenWord}: ${word}`;
}

/** 별 꼴: 한 줄(별 그림 옆 글 — 회화 마무리) · 큰 별(별 그림 위 · 글 아래 — 결과 판 별 열). */
const STAR_LOOK = {
  line: {
    box: "flex-wrap items-center gap-3",
    icon: "size-12",
  },
  big: {
    box: "flex-col items-center justify-center gap-4 text-center",
    icon: "size-28",
  },
} as const;

/** 받은 별(큰 노랑 별 count 개 · 글 한 줄). count 는 reward.star_complete — 0 이면 그리지 않는다. */
export function RewardStar({
  count,
  size = "line",
}: {
  count: number;
  size?: keyof typeof STAR_LOOK;
}) {
  if (count <= 0) return null;
  const look = STAR_LOOK[size];
  return (
    <p
      data-reward-star=""
      className={cn("flex font-heading text-[30px] leading-snug", look.box)}
    >
      <span aria-hidden className="flex flex-wrap justify-center gap-1">
        {Array.from({ length: count }, (_, i) => (
          <Star
            // biome-ignore lint/suspicious/noArrayIndexKey: 같은 별 그림의 차례가 열쇠다
            key={i}
            data-star-icon=""
            className={cn("shrink-0 fill-postit-reading text-ink", look.icon)}
            strokeWidth={ICON_STROKE}
          />
        ))}
      </span>
      {REWARD_TEXT.star}
    </p>
  );
}

/**
 * 오늘 만난 말 카드(영어 · 뜻). onListen 을 넘기면 카드마다 소리 단추(낱말 듣기 — 정본 03:26 '소리 단추')를 두고, listenOff 동안(되짚기를
 * 읽는 중) 흐리다. children 은 같은 칸 아래에 붙는 것(칩을 단 문장 틀 · 듣기 단추)이다. 단어도 children 도 없으면 그리지 않는다.
 */
export function MetWordCards({
  words,
  label = REWARD_TEXT.metWords,
  onListen,
  listenOff = false,
  children,
}: {
  words: readonly { word: string; meaningKo: string }[];
  /** 칸 이름(세 영역 결과 '오늘 만난 말' — 기본값). */
  label?: string;
  onListen?: (word: string) => void;
  listenOff?: boolean;
  children?: ReactNode;
}) {
  if (words.length === 0 && !children) return null;
  return (
    <div data-met-words="" className="flex flex-col gap-4">
      <p className="font-heading text-[26px] leading-tight">{label}</p>
      {words.length > 0 ? (
        <ul className="flex flex-wrap gap-5">
          {words.map((w, i) => (
            <li
              key={w.word}
              data-met-word={w.word}
              className={cn(
                "flex min-w-40 items-center gap-4 rounded-card border-(length:--paper-edge) border-ink bg-postit-reading px-5 py-4 shadow-postit",
                i % 2 === 0 ? "-rotate-1" : "rotate-1",
              )}
            >
              <span className="flex flex-col gap-1">
                <span lang="en" className="font-en text-[28px] font-bold">
                  {w.word}
                </span>
                {w.meaningKo ? (
                  <span className={CHILD_SIZE.guide}>{w.meaningKo}</span>
                ) : null}
              </span>
              {onListen ? (
                <button
                  type="button"
                  data-touch=""
                  data-met-word-listen={w.word}
                  aria-label={listenWordLabel(w.word)}
                  disabled={listenOff}
                  onClick={() => onListen(w.word)}
                  className={cn(
                    FOCUS_RING,
                    CHILD_SIZE.target,
                    "ml-auto inline-flex items-center justify-center rounded-full border-(length:--paper-edge) border-ink bg-paper disabled:cursor-not-allowed disabled:border-ink-off-edge disabled:text-ink-off",
                  )}
                >
                  <Volume2
                    aria-hidden
                    className="size-8"
                    strokeWidth={ICON_STROKE}
                  />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {children}
    </div>
  );
}
