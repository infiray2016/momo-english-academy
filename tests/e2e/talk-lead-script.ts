// 회화 새 엔진 e2e(talk-lead.spec.ts)의 가짜 응답 대본(CI 고침 2 — e2e 와 단위 시험 talk-lead-script.test.ts 가 같은 자료를 읽는다).
// e2e 는 CI 에서 한 번에 오래 걸리므로, 차례마다 서버 턴 길이 쓰는 core 함수(좁은 정의 · 고르기 판정 · 글 빼기 · 힌트 재료 · 막힌 뒤 뜻 ·
// 마무리 차례)를 이 대본으로 단위 시험이 먼저 지나게 한다. 재료는 e2e 가 넣는 것과 같다: 단계 · 단원 규격 · 어휘는 e2e DB 의 시험용 시드
// (devSeedTree — 3단계 어휘는 기능어와 가상 낱말뿐), 형태 표 · 허용 목록 · 동음이의어는 저장소 seed/lists(서버가 파일로 읽음), 수업은
// talkLessonCard(3). 물음 문장은 그 재료의 아는 낱말로만 쓴다 — 'Cats or dogs?' 처럼 시드에 없는 낱말로 고르기를 쓰면 좁은 정의에 걸려
// 앱이 '같은 뜻으로 다시 말하기'를 부르고, 가짜의 다시 말하기 응답(retryQuestion)으로 바뀌어 고르기 소리 줄이 사라진다(CI 첫 실행 실패).
// Playwright 를 불러오지 않는다(단위 시험이 읽음).
import type {
  TalkLeadMove,
  TalkLeadReading,
} from "../../src/core/conversation/move";

/** 새 엔진 응답 칸 가운데 대본이 정하는 칸(나머지는 빈 값 — talk-lead.spec.ts leadReply). */
export type LeadScriptReply = {
  reading?: TalkLeadReading;
  move: TalkLeadMove;
  say: string;
  say_ko?: string;
  model_sentence?: string;
  hint_ko?: string;
  hint_en?: string;
};

/** 대본 한 차례: 아이 쪽 입력(입구 차례는 null)과 선생님 응답. */
export type LeadScriptStep = {
  child: { mode: "speech"; text: string } | { mode: "dont_know" } | null;
  reply: LeadScriptReply;
};

/** 아이가 말로 답할 때 들리는 글(가짜 음성 대본 — 모든 듣기가 같은 말). */
export const LEAD_SCRIPT_CHILD_SAYS = "I like it.";

/** 좁은 정의 다시 말하기 응답(대본 물음은 걸리지 않게 썼다 — 걸리면 이 말로 바뀐다). */
export const LEAD_SCRIPT_RETRY = "Do you like it?";

/** 인사 끝 차례(지금 길 회화 턴 응답 tori_en). */
export const LEAD_SCRIPT_GREETING_END = "Great! Now let's start!";

/** 따라 할 문장(1~3단계 — 글에서 빠지고 소리 줄 model). */
export const LEAD_SCRIPT_MODEL = "I like it.";

/** 막힌 뒤 고르기 물음(1~3단계 — 글에서 빠지고 소리 줄 answer). 두 낱말 모두 3단계 이하 시험용 어휘다. */
export const LEAD_SCRIPT_CHOICES = "This or that?";

/** 막힌 뒤 한국어 뜻(hint_ko — 말풍선 아래 글). */
export const LEAD_SCRIPT_HINT_KO = "좋은 쪽을 골라서 말해 봐요.";

const speech = { mode: "speech", text: LEAD_SCRIPT_CHILD_SAYS } as const;
const dontKnow = { mode: "dont_know" } as const;

/** 대본 차례(e2e 의 차례 그대로). */
export const LEAD_SCRIPT = {
  /** 대화 토막의 첫 차례(입구 start — 아이 말 없음): 뜻 줄, 힌트 재료 없음. */
  opening: {
    child: null,
    reply: {
      move: "react_and_follow_up",
      say: "Hello again! Do you like it?",
      say_ko: "또 만나서 반가워! 너는 그거 좋아하니?",
    },
  },
  /** 아이 답 → 따라 할 문장(model_repeat). */
  model: {
    child: speech,
    reply: {
      move: "model_repeat",
      say: `Great! Say it with me. ${LEAD_SCRIPT_MODEL}`,
      say_ko: "좋아! 나랑 같이 말해 봐.",
      model_sentence: LEAD_SCRIPT_MODEL,
    },
  },
  /** '잘 모르겠어요' → 되묻는 차례(막힌 뒤 고르기 물음, hint_ko 없음). */
  choices: {
    child: dontKnow,
    reply: {
      reading: "does_not_know",
      move: "easier_or_choices",
      say: `That's okay! ${LEAD_SCRIPT_CHOICES}`,
    },
  },
  /** 또 '잘 모르겠어요' → 막힌 뒤 한국어 뜻(hint_ko). */
  hintKo: {
    child: dontKnow,
    reply: {
      reading: "does_not_know",
      move: "share_about_me",
      say: "That's okay. I like this. And you?",
      hint_ko: LEAD_SCRIPT_HINT_KO,
    },
  },
  /** 마무리 차례(앱이 정한 때 — 말 칸에 물음이 없어 앱이 지금 상수 물음을 붙이고 두 단추가 나온다). */
  closing: {
    child: speech,
    reply: { move: "react_only", say: "You did great today!" },
  },
  /** '더 이야기하기' 뒤의 차례(입구 more — 아이 말 없음). */
  more: {
    child: null,
    reply: { move: "react_only", say: "Yay! Let's talk more." },
  },
} as const satisfies Record<string, LeadScriptStep>;
