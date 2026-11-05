"use client";

// 앱 오류 화면 · 없는 주소 판(UI · UX 묶음 0-나 · spec 설계 4 '필수 (나) 막다른 화면이 없다' N-15 · N-16 · 8절 '앱 오류' 행 R-52 ·
// 설계 6 문구 표). 아이 화면에서 잡히지 않은 오류가 나면 앱 오류 화면('잠깐 문제가 생겼어요', 큰 '다시 해 볼래요', 작은 '홈')을 보인다.
// '다시 해 볼래요'는 그 화면을 다시 그린다(오류 경계가 넘기는 Next 의 retry — 한 전환 안에서 router.refresh + reset, plan 위험 9).
// 세션 · 회화는 진행으로 남으므로 다시 그리면 같은 활동에서 이어진다. 없는 주소이거나 열 수 없는 세션이면 '찾는 화면이 없어요'와 큰
// '홈'이다(돌아갈 자리가 없는 유일한 경우). 단추 차례는 막힘 판과 같은 결이다(그 화면 글이 권하는 행동이 큰 단추 — [승인 UX3]).
// 루트 오류 경계는 (child) 틀 밖에서 그리므로 이 판은 틀 · 선생님 공유 값에 기대지 않고 아이 화면 한 장(ChildScreen)을 스스로 그린다.
// "use client" 인 까닭: 오류 경계가 누름 처리를 넘기고 다시 읽는 동안을 전환(useTransition)으로 본다. 단추 차례 · 문구는 막힘 판과 같은 값을
// 의존 없는 모듈(stuck-buttons)에서 가져온다 — 막힘 판(mic-blocked)은 음성 층을 들여 모든 쪽 첫 JS 에 실리므로(묶음 2-가 보탬 · 0-나 M1).
// fix 1(검토 M2 · spec FR-U1 누르면 바로 보이는 반응): '다시 해 볼래요'는 전환(useTransition) 안에서 retry 를 부르고, 다시 읽는 동안
// 단추를 흐리게(누를 수 없게) 두며 표지 data-trouble-retrying 을 단다(새 문구 없음).
// 묶음 5-가(spec 설계 5.4 막힘 · 쉼 · 오류 행 · D-1): 화면 가운데 큰 판 하나(FamilyBoard standalone — 최소 높이가 화면 높이의 2/3 넘음, 빈
// 바탕 1/3 아래)에 안내와 단추 둘. 단추 차례 · 문구는 그대로다.
import { useTransition } from "react";
import {
  BigButton,
  BigLink,
  ChildScreen,
  SmallButton,
  SmallLink,
} from "@/components/board/board";
import { FamilyBoard } from "@/components/session/family-board";
import {
  MIC_BLOCKED_TEXT,
  type StuckButton,
  stuckButtonsOf,
} from "@/components/session/stuck-buttons";

export const APP_TROUBLE_TEXT = {
  /** 앱 오류 화면 안내(R-52 · 설계 6 새 문구). */
  error: "잠깐 문제가 생겼어요",
  /** 없는 주소 · 열 수 없는 세션 안내(R-52 · 설계 6 새 문구). */
  missing: "찾는 화면이 없어요",
  /** 같은 화면 다시 그리기(막힘 판과 같은 말). */
  retry: MIC_BLOCKED_TEXT.retry,
  home: MIC_BLOCKED_TEXT.home,
} as const;

/** 판의 갈래: 앱 오류(error) · 없는 주소(missing). */
export type TroubleKind = "error" | "missing";

/**
 * 판의 단추 차례(순수): 앱 오류는 고친 뒤 할 일이 다시 해 보기라 막힘 판과 같이 큰 '다시 해 볼래요' · 작은 '홈'이고, 없는 주소는 돌아갈
 * 자리가 없어 큰 '홈' 하나뿐이다.
 */
export function troubleButtonsOf(kind: TroubleKind): {
  big: StuckButton;
  small?: StuckButton;
} {
  return kind === "error" ? stuckButtonsOf("blocked") : { big: "home" };
}

/** 판 한 장: 아이 화면 가운데 큰 판 하나에 안내 한 줄(쪽 제목) → 큰 단추 → 작은 단추. */
function TroubleBoard({
  kind,
  onRetry,
  retrying = false,
}: {
  kind: TroubleKind;
  onRetry?: () => void;
  /** 다시 읽는 중(단추를 흐리고 표지를 단다). */
  retrying?: boolean;
}) {
  const order = troubleButtonsOf(kind);
  const button = (which: StuckButton, size: "big" | "small") => {
    if (which === "home") {
      const Link = size === "big" ? BigLink : SmallLink;
      return (
        <Link key="home" data-button-size={size} href="/">
          {APP_TROUBLE_TEXT.home}
        </Link>
      );
    }
    const Button = size === "big" ? BigButton : SmallButton;
    return (
      <Button
        key="retry"
        data-app-retry=""
        data-button-size={size}
        data-trouble-retrying={retrying ? "" : undefined}
        disabled={retrying}
        onClick={onRetry}
      >
        {APP_TROUBLE_TEXT.retry}
      </Button>
    );
  };
  return (
    <ChildScreen className="items-center justify-center">
      <FamilyBoard
        kind="stuck"
        standalone
        center
        paperKey={`trouble:${kind}`}
        className="max-w-3xl gap-8"
      >
        <h1
          data-trouble-line=""
          className="font-heading text-[28px] leading-snug"
        >
          {kind === "error" ? APP_TROUBLE_TEXT.error : APP_TROUBLE_TEXT.missing}
        </h1>
        {button(order.big, "big")}
        {order.small ? button(order.small, "small") : null}
      </FamilyBoard>
    </ChildScreen>
  );
}

/** 앱 오류 화면 한 장(N-15, 훅 없음): 다시 읽는 중이면 '다시 해 볼래요'가 흐리다. */
export function AppErrorBoard({
  onRetry,
  retrying,
}: {
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <div data-app-error="" className="contents">
      <TroubleBoard kind="error" onRetry={onRetry} retrying={retrying} />
    </div>
  );
}

/**
 * 앱 오류 화면(N-15): '다시 해 볼래요'는 쓰는 쪽(오류 경계)이 넘긴 다시 그리기(Next retry — 서버 자료를 다시 읽음)를 전환 안에서 부르고,
 * 그 전환이 끝날 때까지 단추를 흐린다. 다시 그리기가 되면 이 판은 그 화면으로 바뀌고, 또 실패하면 같은 판이 다시 누를 수 있게 돌아온다.
 */
export function AppErrorPanel({ onRetry }: { onRetry: () => void }) {
  const [retrying, startRetry] = useTransition();
  return (
    <AppErrorBoard
      retrying={retrying}
      onRetry={() => {
        if (retrying) return;
        startRetry(onRetry);
      }}
    />
  );
}

/** 없는 주소 판(N-16): 없는 주소 · 열 수 없는 세션. */
export function NotFoundPanel() {
  return (
    <div data-not-found="" className="contents">
      <TroubleBoard kind="missing" />
    </div>
  );
}
