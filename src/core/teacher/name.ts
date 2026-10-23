// 아이 화면 글의 선생님 이름 자리 · 조사 고르기 · 문구 표(선생님 화면 plan 값 9, 4절 머리 문단 '[이름] · 조사' · 3.3 · 7절 · 8절 ·
// C123 · C130 (7) · C141 (3) 정본 밖 문구). [이름] 은 아이가 고른 회화 선생님의 한글 이름이고 고르기 전에는 '선생님'이다. 괄호 안 조사
// 짝은 이름 끝 받침으로 고른다. 아이 화면 소스는 이 표만 쓰고 선생님 이름 · 옛 이름을 직접 쓰지 않는다(단위 훑기 teacher-scan). 순수 모듈이다.

/** 조사 짝(4절 머리 문단 — 이/가 · 은/는 · 와/과 · 을/를 · 아/야). */
export type JosaPair = "이/가" | "은/는" | "와/과" | "을/를" | "아/야";

/** 받침 있을 때 · 없을 때(와/과는 받침 있을 때 '과'). */
const JOSA: Record<JosaPair, readonly [withFinal: string, without: string]> = {
  "이/가": ["이", "가"],
  "은/는": ["은", "는"],
  "와/과": ["과", "와"],
  "을/를": ["을", "를"],
  "아/야": ["아", "야"],
};

/** 한글 음절 범위(가 ~ 힣)와 한 첫소리 · 가운뎃소리 묶음의 끝소리 수(받침 없음 포함 28). */
const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
const FINALS = 28;

/** 고르기 전 · 이름을 모를 때의 이름 자리(4절 머리 문단). */
export const TEACHER_FALLBACK_NAME = "선생님";

/** 끝 글자가 받침 있는 한글 음절인가(한글 음절이 아니면 거짓). */
function endsWithFinal(word: string): boolean {
  const last = word.codePointAt(word.length - 1);
  if (last === undefined || last < HANGUL_FIRST || last > HANGUL_LAST)
    return false;
  return (last - HANGUL_FIRST) % FINALS !== 0;
}

/** 조사 고르기: 끝 글자가 받침 있는 한글 음절이면 이 · 은 · 과 · 을 · 아, 아니면 가 · 는 · 와 · 를 · 야. */
export function josa(name: string, pair: JosaPair): string {
  const [withFinal, without] = JOSA[pair];
  return endsWithFinal(name) ? withFinal : without;
}

/** 이름 자리에 쓸 이름(없거나 빈 글이면 '선생님'). */
export function teacherNameOf(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : TEACHER_FALLBACK_NAME;
}

/** 이름 + 조사. */
function named(name: string | null | undefined, pair: JosaPair): string {
  const n = teacherNameOf(name);
  return `${n}${josa(n, pair)}`;
}

/** '[이름] 선생님' — 고르기 전이면 '선생님'('선생님 선생님'이 되지 않게). */
function withTitle(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed
    ? `${trimmed} ${TEACHER_FALLBACK_NAME}`
    : TEACHER_FALLBACK_NAME;
}

type Name = string | null | undefined;

/**
 * 문구 표(plan 값 9 표 그대로). 이름 자리 글은 이름을 받는 함수이고 이름이 없으면 '선생님'이다. 회화 세션 안 글은 그 세션의 선생님
 * (처음 스냅숏), 그 밖은 집 선생님(아이 화면 공유 값)을 넘긴다.
 */
export const TEACHER_TEXT = {
  /** 4절 '선생님 차례' — 말풍선 기다림이 ui.wait_hint_seconds 둘째 값을 넘으면. */
  thinking: (n?: Name) => `${named(n, "이/가")} 생각하고 있어요`,
  /** 4절 — 말풍선 접근 이름. */
  replay: (n?: Name) => `${teacherNameOf(n)} 말 다시 듣기`,
  /** 4절 '선생님 창' — 이름표 · 창 접근 이름. */
  windowName: (n?: Name) => withTitle(n),
  /** 4절 '아래 줄' 이름. */
  promiseLabel: "선생님의 약속",
  /** 4절 '아래 줄'. */
  promise: (n?: Name) =>
    `${named(n, "은/는")} 집 · 학교 · 전화번호를 묻지 않아요 · 부모님도 볼 수 있어요`,
  /** 3.3 '그만하기' 확인(C34). */
  stopConfirm: (n?: Name) =>
    `${named(n, "와/과")} 그만 이야기할까요? 지금 그만두면 이 이야기는 다음에 처음부터 해요`,
  /** 7절 오류 행 회화 문장(인식 실패 — 같은 차례). */
  notHeard: (n?: Name) =>
    `${teacherNameOf(n)}에게 잘 안 들렸어요. 조금 더 크게 말해 볼까요`,
  /** 3.3 처음 회화 안내(문장마다 한 줄). */
  intro: (n?: Name) => [
    `${named(n, "은/는")} 앱 속 AI 선생님이에요.`,
    `${named(n, "은/는")} 오늘 이야기에 나오는 것만 물어요.`,
    "집 주소, 학교 이름, 전화번호는 묻지 않아요.",
    `${named(n, "은/는")} 지난 이야기를 조금 기억해요.`,
    `${named(n, "와/과")} 나눈 이야기는 부모님도 볼 수 있어요`,
  ],
  /** 따라 말하기 안내(4절 머리 문단 규칙). */
  followGuide: (n?: Name) => `${named(n, "을/를")} 따라 말해 봐요`,
  /** 8절 'AI 쉬는 중' · 1-가 하루 안전 상한(모든 영역 같은 문구 — C16 · C123). */
  aiRest: (n?: Name) =>
    `${named(n, "이/가")} 잠깐 쉬어요. 다른 공부를 해 볼까요`,
  /** 4절 회화 마무리 셋째 장. */
  friendship: (n?: Name) => `${named(n, "와/과")} 친한 정도`,
  /** 4절 홈 — 배치 전 회화 카드. */
  needsSpeaking: "말하기에서 단계를 찾으면 회화 선생님을 만날 수 있어요",
  /** 4절 배치 결과(말하기). */
  meetTeacher: "이제 회화 선생님을 만날 수 있어요",
  /** 4절 첫 실행 — 이름표 · 별명 안내. */
  firstRunEnglishName: "선생님이 부를 영어 이름",
  firstRunNickname: "선생님이 부를 다른 영어 이름(별명)을 골라 주세요",
  /** 4절 '선생님을 골라요'. */
  chooseTitle: "선생님을 골라요",
  chooseGreet: "인사 듣기",
  chooseParents: "고른 선생님은 부모님이 바꿀 수 있어요",
  /** 큰 단추 — 고르기 전(흐림)은 '선생님과 할래요'(정본 밖 문구, C141 (3)). */
  chooseGo: (n?: Name) => `${withTitle(n)}과 할래요`,
  /** 정본 밖 문구(C141 (3)) — '인사 듣기' 접근 이름 · 골라진 표지 · 고르기 실패. */
  chooseGreetLabel: (n?: Name) => `${teacherNameOf(n)} 인사 듣기`,
  chosen: "골랐어요",
  chooseRetry: "다시 골라 주세요",
  /** 4절 수업 목록(회화) — 잠긴 다음 단원 · 단어 익히기(P12 가 씀). */
  talkLockWords: (n?: Name) => `${named(n, "와/과")} 며칠 더 이야기하면 열려요`,
  talkWordPractice: (n?: Name) =>
    `내일 ${named(n, "와/과")} 또 이야기해요. 아직 덜 익은 말을 ${named(n, "이/가")} 물어볼 거예요`,
  /** 4절 회화 마무리 둘째 장(4단계) · 홈 카드 · 마무리 셋째 장(P13c 가 씀). */
  recastTitle: (n?: Name) => `${named(n, "이/가")} 바꿔 말해 준 문장`,
  story: "선생님 이야기",
  storyListen: "선생님 이야기 듣기",
  /** 관찰 쪽(프리뷰만). */
  probeClear: "이 프로필의 선생님 지우기",
  /** 초상이 없을 때의 글자 동그라미(4절 머리 문단 '글자 동그라미' — 고르기 전 · 초상 조각이 오기 전). */
  initial: "선",
} as const;
