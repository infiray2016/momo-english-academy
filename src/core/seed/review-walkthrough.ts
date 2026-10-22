// 아이 눈 순회 질문(plan-p05c '아이 눈 순회 질문', 정할 것 차, 역분석 제안 9): 6.3 표본 검토의 판정 기준이
// 사람과 날에 따라 흔들리지 않게 두는 점검표 여덟(인지 순회 넷 + 우리 넷). '아니오'인 질문의 짧은 이름을 메모 머리에 붙인다
// (reviews 행 꼴은 그대로). 시계 · 파일 · 프레임워크를 가져오지 않는 순수 모듈이다.

export type WalkthroughQuestion = {
  id: string;
  /** 점검표 글(어른용 해요체). */
  question: string;
  /** 메모 머리에 붙는 짧은 이름. */
  short: string;
  group: "cognitive" | "ours";
};

/** 질문 여덟(표 차례 = 메모 머리 차례). 일곱째만 '아니오'가 문제를 뜻하도록 뒤집어 적었다. */
export const WALKTHROUGH_QUESTIONS = [
  {
    id: "try",
    question: "아이가 이 활동에서 맞는 결과를 얻으려고 해 볼까요?",
    short: "시도",
    group: "cognitive",
  },
  {
    id: "notice",
    question: "맞는 행동(누를 곳 · 말할 것)이 있다는 것을 알아챌까요?",
    short: "알아챔",
    group: "cognitive",
  },
  {
    id: "connect",
    question: "그 행동이 원하는 결과로 이어진다고 알까요?",
    short: "연결",
    group: "cognitive",
  },
  {
    id: "progress",
    question: "한 뒤에 잘 되고 있다는 것이 보일까요?",
    short: "진전",
    group: "cognitive",
  },
  {
    id: "one-action",
    question: "화면에 할 일이 하나인가요?",
    short: "행동 하나",
    group: "ours",
  },
  {
    id: "no-instructions",
    question: "안내를 읽지 않고도 할 일이 보이나요?",
    short: "안내 없이",
    group: "ours",
  },
  {
    id: "no-unknown-words",
    question: "단계 어휘 범위 밖의 모르는 말이 없나요?",
    short: "모르는 말 없음",
    group: "ours",
  },
  {
    id: "explanation",
    question: "틀렸을 때 해설이 4학년 눈에 이해되나요?",
    short: "해설 이해",
    group: "ours",
  },
] as const satisfies readonly WalkthroughQuestion[];

export type WalkthroughId = (typeof WALKTHROUGH_QUESTIONS)[number]["id"];

/** 질문 id 목록(Zod enum 에 넘긴다). */
export const WALKTHROUGH_IDS = WALKTHROUGH_QUESTIONS.map((q) => q.id) as [
  WalkthroughId,
  ...WalkthroughId[],
];

/** 메모 머리 꼴: `[순회 아니오: 이름 · 이름]`. */
const MEMO_HEAD_LABEL = "순회 아니오";
const SHORT_SEPARATOR = " · ";

/**
 * '아니오'로 고른 질문이 있으면 표 차례대로 짧은 이름을 이어 `[순회 아니오: …] ` 를 메모(앞뒤 공백을 뺀 것) 앞에 붙인다.
 * 메모가 비면 머리만 남긴다. 고른 질문이 없으면 메모 그대로다. 모르는 id 는 거부한다(RangeError).
 */
export function composeReviewMemo(
  ids: readonly string[],
  memo: string,
): string {
  const known = new Set<string>(WALKTHROUGH_IDS);
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new RangeError(`모르는 순회 질문 id: ${unknown.join(", ")}`);
  }
  if (ids.length === 0) return memo;
  const chosen = new Set(ids);
  const names = WALKTHROUGH_QUESTIONS.filter((q) => chosen.has(q.id)).map(
    (q) => q.short,
  );
  const head = `[${MEMO_HEAD_LABEL}: ${names.join(SHORT_SEPARATOR)}]`;
  const body = memo.trim();
  return body === "" ? head : `${head} ${body}`;
}
