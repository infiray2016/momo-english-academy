"use client";

// 홈 영역 카드 넷(4절 홈 표 · AC-2a · AC-5c, plan-p10b 바뀌는 파일). 포스트잇 노랑 읽기 · 하늘 쓰기 · 분홍 말하기 · 연두 회화.
// 카드마다 단계 · 단원 5칸 · 막대 둘 · 이번 주 n일 · 오늘 완료. 카드와 카드 안 '시작!' · '이야기 고르기'는 그 영역 수업 목록(R14).
// 차례를 따른다: 마이크를 쓸 수 없는 기기(인식 API 없음 · 목록 밖 · 저장된 '쓸 수 없음')의 말하기 · 회화 → 배치 평가 전 → 보통.
// 마이크 판정은 홈에 들어올 때마다 다시 한다(7절, 인식 API 가 없는 기기는 저장하지 않는다 — mic-state).
// '내 단계 찾기' 카드는 그 영역 배치 평가로 간다(차례 5).
// 1-가 임시(부모 화면 '마이크 다시 확인'은 1-나): 닫힌 말하기 카드 아래 '다시 확인' 단추가 저장된 '쓸 수 없음'을 지우고 다시 판정한다.
import { useEffect, useState } from "react";
import {
  AREA_LABEL,
  PostIt,
  SmallButton,
  type Tilt,
} from "@/components/board/board";
import type { Area } from "@/core/seed/structure";
import { clearMicState, micUsable } from "@/lib/mic-state";
import { cn } from "@/lib/utils";
import type { HomeCard } from "@/server/home";

/** 1-가 회화 카드가 가는 곳(C50 (1) — '토리가 준비 중이에요'). 1-나에서 수업 목록으로. */
const TALK_PATH = "/talk";
const TILTS: readonly Tilt[] = ["left", "right", "slight", "right"];
/** 마이크가 있어야 하는 영역(4절 '마이크를 쓸 수 없을 때'). */
const MIC_AREAS: readonly Area[] = ["speaking", "talk"];

const TEXT = {
  findLevel: "내 단계 찾기",
  /** '내 단계 찾기' 아래 안내(C72 — 요청자가 잠긴 것으로 봄, 2026-10-18). */
  findLevelHint: "단계를 몰라도 돼요. 짧은 문제로 찾아요",
  /** 닫힌 말하기 카드 아래 다시 확인(C72, 1-가 임시 — 1-나 부모 화면 '마이크 다시 확인'이 대신한다). */
  micRecheck: "마이크를 켰으면 여기를 눌러 다시 확인해요",
  needsSpeaking: "말하기에서 단계를 찾으면 토리를 만날 수 있어요",
  needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
  todayDone: "오늘 다 했어요",
  todayNotYet: "오늘 아직이에요",
  start: "시작!",
  chooseStory: "이야기 고르기",
  recent: "최근 성적",
  level: (n: number) => `${n}단계`,
  unit: (n: number, topic?: string) =>
    topic ? `단원 ${n} · ${topic}` : `단원 ${n}`,
  known: (n: number, of: number) => `아는 단어 ${n}/${of}`,
  talks: (n: number, of: number) => `끝낸 대화 ${n}/${of}`,
  week: (n: number) => `이번 주 ${n}일`,
} as const;

function UnitCells({ cells }: { cells: HomeCard["unitCells"] }) {
  return (
    <span data-unit-cells="" aria-hidden className="flex gap-1.5">
      {cells.map((cell, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: 단원 칸은 자리(단원 번호)가 열쇠다
          key={i}
          data-cell={cell}
          className={cn(
            "size-7 rounded-md border-2 border-ink",
            cell === "passed" && "bg-ink",
            cell === "current" && "border-4 bg-paper",
            cell === "upcoming" && "bg-paper/50",
          )}
        />
      ))}
    </span>
  );
}

function Bar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <span className="flex flex-col gap-1">
      <span>{label}</span>
      <span
        aria-hidden
        className="h-3 w-full overflow-hidden rounded-full bg-paper/70"
      >
        <span
          className="block h-full bg-ink"
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
    </span>
  );
}

function RecentCells({ cells }: { cells: HomeCard["recent"] }) {
  return (
    <span className="flex flex-col gap-1">
      <span>{TEXT.recent}</span>
      <span data-recent-cells="" aria-hidden className="flex gap-1.5">
        {cells.map((cell, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: 최근 성적 칸은 차례가 열쇠다
            key={i}
            data-cell={cell}
            className={cn(
              "h-3 flex-1 rounded-full",
              cell === "pass" ? "bg-ink" : "bg-paper/70",
            )}
          />
        ))}
      </span>
    </span>
  );
}

/** 카드 내용. action 이 거짓이면 행동 자리('시작!' · '이야기 고르기')를 비운다(마이크 판정 전, 화면 검토 H-M2). */
function CardBody({ card, action }: { card: HomeCard; action: boolean }) {
  return (
    <>
      <span className="font-heading text-3xl">{AREA_LABEL[card.area]}</span>
      <span className="font-heading text-5xl leading-none">
        {TEXT.level(card.level ?? 0)}
      </span>
      <span>{TEXT.unit(card.unit ?? 0, card.unitTopic)}</span>
      <UnitCells cells={card.unitCells} />
      <Bar
        label={TEXT.known(card.knownWords, card.unitWords)}
        value={card.knownWords}
        max={card.unitWords}
      />
      {card.talks ? (
        <Bar
          label={TEXT.talks(card.talks.done, card.talks.min)}
          value={card.talks.done}
          max={card.talks.min}
        />
      ) : (
        <RecentCells cells={card.recent} />
      )}
      <span>{TEXT.week(card.thisWeek)}</span>
      <span className="mt-auto flex flex-col gap-2">
        {card.today.done ? (
          <span data-today="done" className="font-heading text-[22px]">
            {TEXT.todayDone}
          </span>
        ) : !card.today.newLessonDone ? (
          <span data-today="not-yet">{TEXT.todayNotYet}</span>
        ) : null}
        {action ? (
          <span
            aria-hidden
            className="flex min-h-14 items-center justify-center rounded-xl bg-ink font-heading text-2xl text-paper"
          >
            {card.area === "talk" ? TEXT.chooseStory : TEXT.start}
          </span>
        ) : (
          <span aria-hidden className="min-h-14" />
        )}
      </span>
    </>
  );
}

/** 배치 평가 전 카드 내용('내 단계 찾기' · 회화는 말하기 시작 단계 전 문구). */
function GateBody({ card }: { card: HomeCard }) {
  return (
    <>
      <span className="font-heading text-3xl">{AREA_LABEL[card.area]}</span>
      {card.gate === "placement" ? (
        <>
          <span className="font-heading text-4xl leading-tight">
            {TEXT.findLevel}
          </span>
          <span data-find-level-hint="">{TEXT.findLevelHint}</span>
        </>
      ) : (
        <span>{TEXT.needsSpeaking}</span>
      )}
      <span>{TEXT.week(card.thisWeek)}</span>
    </>
  );
}

export function HomeCards({ cards }: { cards: HomeCard[] }) {
  // undefined: 아직 판정 전(첫 그리기). 그동안 말하기 · 회화 카드는 틀만 그리고 행동 자리 · 닫힘 문구를 비운다(화면 검토 H-M2)
  const [micOk, setMicOk] = useState<boolean | undefined>();
  useEffect(() => {
    setMicOk(micUsable());
  }, []);

  // 카드는 내용 높이로 위에 붙인다 — 아래로 코르크가 보이게(목업 B_Home4, 화면 검토 H-M1).
  // 카드의 읽히는 이름은 안의 글(영역 · 단계 · 상태 · 닫힘 까닭)이다 — label 을 넘기지 않는다(검토 M-3 · H-M3)
  return (
    <div className="grid grid-cols-2 items-start gap-6 landscape:grid-cols-4">
      {cards.map((card, i) => {
        const tilt = TILTS[i] ?? "none";
        const needsMic = MIC_AREAS.includes(card.area);
        if (needsMic && micOk === false) {
          const closed = (
            <PostIt
              tone={card.area}
              tilt={tilt}
              disabled
              href={`/${card.area}/lessons`}
            >
              <span data-home-card={card.area} className="contents">
                <span className="font-heading text-3xl">
                  {AREA_LABEL[card.area]}
                </span>
                <span data-mic-closed="">{TEXT.needsMic}</span>
              </span>
            </PostIt>
          );
          // 다시 확인 단추는 말하기 카드 아래 하나만(회화 카드도 같은 판정으로 함께 열린다)
          if (card.area !== "speaking")
            return <div key={card.area}>{closed}</div>;
          return (
            <div key={card.area} className="flex flex-col gap-3">
              {closed}
              <SmallButton
                data-mic-recheck=""
                className="h-auto py-2 text-left"
                onClick={() => {
                  clearMicState();
                  setMicOk(micUsable());
                }}
              >
                {TEXT.micRecheck}
              </SmallButton>
            </div>
          );
        }
        const pending = needsMic && micOk === undefined;
        if (card.gate !== null) {
          const target =
            card.gate === "needs_speaking" ? "speaking" : card.area;
          return (
            <PostIt
              key={card.area}
              tone={card.area}
              tilt={tilt}
              {...(pending ? {} : { href: `/${target}/placement` })}
            >
              <span data-home-card={card.area} className="contents">
                <GateBody card={card} />
              </span>
            </PostIt>
          );
        }
        return (
          <PostIt
            key={card.area}
            tone={card.area}
            tilt={tilt}
            {...(pending
              ? {}
              : {
                  href:
                    card.area === "talk" ? TALK_PATH : `/${card.area}/lessons`,
                })}
          >
            <span data-home-card={card.area} className="contents">
              <CardBody card={card} action={!pending} />
            </span>
          </PostIt>
        );
      })}
    </div>
  );
}
