// 회화 새 엔진 e2e(talk-lead.spec.ts)의 가짜 응답 대본(CI 고침 2 — e2e 와 단위 시험 talk-lead-script.test.ts 가 같은 자료를 읽는다).
// e2e 는 CI 에서 한 번에 오래 걸리므로, 차례마다 서버 턴 길이 쓰는 core 함수(좁은 정의 · 고르기 판정 · 글 빼기 · 힌트 재료 · 막힌 뒤 뜻 ·
// 마무리 차례)를 이 대본으로 단위 시험이 먼저 지나게 한다. 재료는 e2e 가 넣는 것과 같다: 단계 · 단원 규격 · 어휘는 e2e DB 의 시험용 시드
// (devSeedTree — 3단계 어휘는 기능어와 가상 낱말뿐), 형태 표 · 허용 목록 · 동음이의어는 저장소 seed/lists(서버가 파일로 읽음), 수업은
// talkLessonCard(3). 물음 문장은 그 재료의 아는 낱말로만 쓴다 — 'Cats or dogs?' 처럼 시드에 없는 낱말로 고르기를 쓰면 좁은 정의에 걸려
// 앱이 '같은 뜻으로 다시 말하기'를 부르고, 가짜의 다시 말하기 응답(retryQuestion)으로 바뀌어 고르기 소리 줄이 사라진다(CI 첫 실행 실패).
// 묶음 S5(화면 검토 1.4): 되묻는 차례 · 'Say, "…"' 꼴 · 뜻 줄과 막힌 뒤 뜻이 함께인 차례 · 마무리 제안 차례를 더했다. Playwright 를 불러오지
// 않는다(단위 시험이 읽음).
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

/**
 * 막힌 뒤 한국어 뜻(hint_ko — 말풍선 아래 글). 실제 응답의 꼴(안내문 talk-lead.ts 의 '아이가 할 수 있는 답의 한국어')로 쓴다 — 지시문이 아니다
 * (화면 검토 M-3).
 */
export const LEAD_SCRIPT_HINT_KO = "나도 이거 좋아.";

/** 막힌 뒤 한국어 뜻 차례의 뜻 줄(say_ko — 뜻 줄과 막힌 뒤 뜻이 한 차례에 함께, 화면 검토 1.4 의 5 · M-3). */
export const LEAD_SCRIPT_HINT_SAY_KO = "괜찮아. 나는 이게 좋아. 너는?";

/** 'Say, "…"' 꼴로 따라 할 문장을 내는 차례의 글(따라 할 문장을 뺀 뒤 안내 말 끝 쉼표가 쌍점이 된다 — 화면 검토 M-2). */
export const LEAD_SCRIPT_SAY_COMMA_SHOWN = ["Good!", "Say:"] as const;

/**
 * 앞선 대화 차례를 DB 에 넣기 전까지 '말 주고받기'로 센 아이 차례 수(인사 끝의 말 · 대화 첫 차례 뒤 · 따라 할 문장 뒤(되물음) · 되묻는 차례 뒤의
 * 말 — 단추 차례는 세지 않음). e2e 는 (참고 턴 − 1 − 이 수) 쌍을 넣어 다음 말 차례에서 셈이 참고 턴에 닿게 한다(앱이 정한 마무리 때 — 묶음 S5 전에는 2 · 참고 턴 − 2 로 한 쌍 더 넣었다).
 * 단위 시험(talk-lead-script.test.ts)이 위치 되짚기로 이 수를 지킨다.
 */
export const LEAD_SCRIPT_COUNTED_BEFORE_INSERT = 4;

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
  /**
   * 아이 말 → 되묻는 차례(move ask_again, 따라 할 문장 차례 바로 뒤): 선생님 말만 글로 보이고, 1~3단계는 앞 차례의 듣기 단추(따라 할 문장)를
   * 그대로 둔다 — 저절로 다시 읽지 않고 누르면 들린다(정본 03 4절 98줄 · 화면 검토 I-1).
   */
  askAgain: {
    child: speech,
    reply: {
      reading: "likely_misheard",
      move: "ask_again",
      say: "Sorry? Say it again, please.",
      say_ko: "응? 한 번 더 말해 줘.",
    },
  },
  /** 아이 말 → 'Say, "…"' 꼴의 따라 할 문장(model_repeat — 글은 'Good! Say:', 따라 할 문장은 소리 줄 model). */
  sayComma: {
    child: speech,
    reply: {
      move: "model_repeat",
      say: `Good! Say, "${LEAD_SCRIPT_MODEL}"`,
      say_ko: "좋아! 따라 말해 봐.",
      model_sentence: LEAD_SCRIPT_MODEL,
    },
  },
  /** '잘 모르겠어요' → 막힌 뒤 고르기 물음(easier_or_choices, hint_ko 없음). */
  choices: {
    child: dontKnow,
    reply: {
      reading: "does_not_know",
      move: "easier_or_choices",
      say: `That's okay! ${LEAD_SCRIPT_CHOICES}`,
    },
  },
  /** 또 '잘 모르겠어요' → 뜻 줄(say_ko)과 막힌 뒤 한국어 뜻(hint_ko)이 함께 있는 차례. */
  hintKo: {
    child: dontKnow,
    reply: {
      reading: "does_not_know",
      move: "share_about_me",
      say: "That's okay. I like this. And you?",
      say_ko: LEAD_SCRIPT_HINT_SAY_KO,
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
  /** 아이 말 → 마무리 제안(move wrap_up — 마무리 제안 길: 말하기와 두 단추가 함께, 화면 검토 M-4). */
  wrapUp: {
    child: speech,
    reply: { move: "wrap_up", say: "You did great today! Let's stop here." },
  },
} as const satisfies Record<string, LeadScriptStep>;
