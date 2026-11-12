// 회화 대화 토막의 두 번째 길(N, talk.lead_mode 'claude' — 13절 C233 · C238, intent 2026-11-12-회화-Claude-주도 spec 설계 2 · 7)의 요청 규격.
// 안내문(대화 내내 같음) · 차례마다의 사실 알림 · 대화 기록 · 작은 응답(아홉 칸) · 호출 규격을 정한다. 안내문은 실험 P 의 글에서 spec 설계 2 가
// 바꾼 글 그대로이고, 순서 · 주기 · 횟수를 정하는 글을 더하지 않는다(FR-2). 지금 길(talk-lesson.ts)의 프롬프트 · 규격은 가져다 쓰기만 하고 바꾸지
// 않는다(FR-1). 호출 값은 지금 회화 턴과 같은 키(ai.* 의 talk_turn.<구간> · ai.max_tokens.talk_turn)를 쓴다(목적 talk_turn). 순수 모듈이다(시각 · DB · SDK 없음).
import { z } from "zod";
import type {
  ApplyChecksResult,
  CallSpec,
  ChatMessage,
  LevelContext,
  SettingValues,
} from "@/core/ai/calls/common";
import {
  type TalkTeacher,
  TEACHER_SENTENCES_SETTING_SCHEMAS,
  teacherSentencesMaxOf,
} from "@/core/ai/calls/talk-lesson";
import type { Masker } from "@/core/ai/mask";
import type { CheckField, FieldHit } from "@/core/ai/output-check";
import { ENGLISH_SAYING_MIN_WORDS } from "@/core/conversation/child-kind";
import { normalizeSpoken } from "@/core/conversation/spoken";
import { type Band, bandOf } from "@/core/level-band";
import type { Cefr } from "@/core/seed/structure";

/** 응답 규격의 이름(가짜 클라이언트가 목적을 알아보는 표시 — 지금 길의 talk_turn 과 가른다). */
export const TALK_LEAD_TITLE = "talk_lead";

// ── 안내문(system, spec 설계 2 '자리 값' 표) ──────────────────────────

/**
 * 안내문에서 단계 · 단원마다 다른 영어 글(spec 설계 2 자리 값 표). 3단계 단원 1 은 실험 P 의 글 그대로이고, 다른 단원의 출처는 spec 미결 2 다
 * (시드의 카드 주제 · 목표 표현은 한국어라 그대로 넣지 않는다). 수준 줄(CEFR) · 문장 수 · 문장 낱말 수는 여기 두지 않고 단계 규격 · 설정에서 받는다.
 */
export type TalkLeadLevelText = {
  /** Topic 줄의 글(끝 마침표 밖). */
  topicEn: string;
  /** 'say sentences like' 뒤의 글(끝 마침표 밖). */
  sentencesLikeEn: string;
  /** 'Only very easy words.' 뒤의 형태 문장('Present simple with …'). */
  formsEn: string;
};

/** 3단계 단원 1 의 글(실험 P 의 안내문 글 그대로, spec 설계 2). */
export const TALK_LEAD_TEXT_L3U1: TalkLeadLevelText = {
  topicEn:
    "what I and my family do on weekends, and places and nature we go to",
  sentencesLikeEn: '"I/we/they + verb" (I eat..., We go to...)',
  formsEn:
    'Present simple with I / you / we / they. No "he/she/it + verb-s", no "Who + verb-s", no past or future tense.',
};

const LEVEL_TEXTS: Readonly<Record<string, TalkLeadLevelText>> = {
  "3-1": TALK_LEAD_TEXT_L3U1,
};

/** 단계 · 단원의 안내문 글. 출처가 정해지지 않은 단원(spec 미결 2)은 null 이다 — 부르는 쪽이 N 을 열지 않는다. */
export function talkLeadTextOf(
  level: number,
  unit: number,
): TalkLeadLevelText | null {
  return LEVEL_TEXTS[`${level}-${unit}`] ?? null;
}

/** 이 단계 · 다음 단계의 CEFR(단계 규격 level_specs 의 cefr — 부르는 쪽이 회화 단계 규격 두 행에서 채운다, 12단계는 next 가 null). */
export type TalkLeadCefr = { level: Cefr; next: Cefr | null };

/**
 * 차례 계약의 입력(spec 설계 2). 단원 단어 · 문장 낱말 상한(sentenceMaxWords)은 단계 맥락(LevelContext, 단계 규격의 값)을 쓰고, CEFR 은 단계 맥락에
 * 칸이 없어 따로 받는다(단계 맥락 타입은 다른 호출이 함께 쓰므로 고치지 않는다).
 */
export type TalkLeadInput = LevelContext & {
  /** 이 대화의 선생님(처음 스냅숏 키 — 한 대화는 끝까지 같은 선생님). 이름 · 성격 글은 선생님 명단(시드)의 값이다. */
  teacher: TalkTeacher;
  cefr: TalkLeadCefr;
  text: TalkLeadLevelText;
  history: readonly TalkLeadHistoryEntry[];
  turn: TalkLeadTurn;
};

/** 안내문에 넣는 설정값(spec 설계 2 자리 값 표 '문장 수'). */
export type TalkLeadRules = {
  /** 이 구간의 선생님 한 차례 문장 상한(talk.teacher_sentences_max.<구간>) — 'n only when you model a sentence' 자리. */
  teacherSentencesMax: number;
};

/**
 * 설정값에서 이 단계의 안내문 값을 읽는다. 지금 회화 턴과 같은 키이고, 없거나 꼴이 틀리면 CallSettingError 를, 문장 상한이 2 보다 작으면
 * (안내문의 'At most N−1 …' 을 만들 수 없음) RangeError 를 던진다.
 */
export function talkLeadRulesOf(
  values: SettingValues,
  input: Pick<TalkLeadInput, "level">,
): TalkLeadRules {
  const teacherSentencesMax = teacherSentencesMaxOf(values, input.level);
  talkLeadSentencesLineOf(teacherSentencesMax);
  return { teacherSentencesMax };
}

/**
 * 수준 말(안내문 'about 10 years old, <수준 말>, CEFR …' 자리)은 실험 P 가 확인한 1~3단계 구간의 글만 둔다. 다른 구간의 말은 값이 정해지고
 * 실험을 거친 뒤에 더한다(spec 우려 5).
 */
const LEARNER_WORDS: Readonly<Partial<Record<Band, string>>> = {
  "1-3": "beginner",
};

/**
 * 안내문의 수준 자리('beginner, CEFR Pre-A1 to A1'): 단계 규격의 CEFR 을 쓰고, 다음 단계의 CEFR 이 다르면 '<이 단계> to <다음 단계>' 로 적는다.
 * 수준 말이 없는 구간(4단계부터)이면 던진다 — N 안내문은 그 구간에서 조립하지 않는다(spec 우려 5).
 */
export function talkLeadLearnerOf(level: number, cefr: TalkLeadCefr): string {
  const word = LEARNER_WORDS[bandOf(level)];
  if (word === undefined)
    throw new RangeError(
      `회화 N 안내문의 수준 말은 1~3단계 구간에만 있다(spec 우려 5): ${level}단계`,
    );
  const span =
    cefr.next !== null && cefr.next !== cefr.level
      ? `${cefr.level} to ${cefr.next}`
      : cefr.level;
  return `${word}, CEFR ${span}`;
}

/**
 * 안내문의 문장 수 줄 앞부분: 설정 talk.teacher_sentences_max.<구간> 의 값 N 으로 'At most N−1 short sentences per turn (N only when you model
 * a sentence).' 를 만든다. N 이 2 보다 작은 정수가 아니면 던진다(0 문장 상한을 조용히 싣지 않는다).
 */
export function talkLeadSentencesLineOf(teacherSentencesMax: number): string {
  if (!Number.isInteger(teacherSentencesMax) || teacherSentencesMax < 2)
    throw new RangeError(
      `talk.teacher_sentences_max 는 2 이상의 정수여야 N 안내문을 만들 수 있다: ${teacherSentencesMax}`,
    );
  return `At most ${teacherSentencesMax - 1} short sentences per turn (${teacherSentencesMax} only when you model a sentence).`;
}

/**
 * 안내문에 싣는 성격 한 줄: 선생님 명단 성격 글(personaEn)의 첫 문장(성질을 나타내는 말 — 미나 'Warm and patient.')만 낸다. 뒤의 행동 문장
 * ('You go step by step …')은 싣지 않는다(13절 C238 (2) — 새 엔진에 행동 규칙을 다시 들이지 않음, 검토 I-3). 비었으면 던진다.
 */
export function teacherTraitOf(personaEn: string): string {
  const trimmed = personaEn.trim();
  const first = (/^[\s\S]*?[.!?](?=\s|$)/.exec(trimmed)?.[0] ?? trimmed).trim();
  if (first === "") throw new RangeError("선생님 성격 글이 비었다");
  return first;
}

/** 안내문 전문(spec 설계 2 의 글 그대로 — 자리 값만 채운다). 대화 내내 같은 글이다(자동 캐시). */
export function talkLeadSystem(
  input: TalkLeadInput,
  rules: TalkLeadRules,
): string {
  const { text } = input;
  return `You are ${input.teacher.nameEn}, a warm English teacher having a spoken one-to-one conversation with a Korean child (about 10 years old, ${talkLeadLearnerOf(input.level, input.cefr)}). The child hears your English through text-to-speech and answers by voice. You see only a speech-to-text transcript of the child, and it is often wrong.
Your personality: ${teacherTraitOf(input.teacher.personaEn)}

You lead this conversation. Each turn, you decide what a good teacher would do next. The app does not script your turn; it only gives you facts in a short "Status" note.

What good teaching looks like here:
- First understand the child. React to what they actually said, with real interest, before anything else.
- Build on the child's own words and ideas. Stay with their topic while it is alive. If they start a new story or ask you something, that comes first: answer honestly and briefly, then continue.
- A turn does not need a question. Sometimes share a tiny thing you like or think, or just react and leave room. Do not ask a question in every single turn, and never ask two questions in one turn.
- If the transcript does not fit your question, it is probably a hearing mistake, not the child's mistake. Do not build a new story on a word that does not fit. If a word that sounds the same would fit (see/sea, teach/beach), take that meaning. Otherwise kindly ask again once ("Sorry, say it again, please!"), without repeating the whole question.
- If the child still cannot answer, or says they don't know, you can help with an easier question, two choices ("Big or small?"), or a short model sentence for the child to repeat.
- After the child repeats your model sentence, praise briefly and move one small step sideways. Never ask again for the answer they just repeated.
- Never talk about a thing that neither of you has mentioned as if it were there. Bring in a new thing with one linking sentence first.
- Do not ask a question you already asked in this talk, even in other words. Follow what the child just said instead of returning to the same question.
- Never tell the child they are wrong. Recast: say the correct sentence naturally in your reaction.

Safety: Use only content suitable for children. Never ask for a name, school, address, phone number, photo, or to meet. If the child says personal information, do not ask about it and go back to the topic. Never say you are a human. Do not make up a human life for yourself (age, family, home, school). If the child asks who you are, say you are an AI teacher in this app. If the child names a person, a school, or the place they live, do not repeat the name; say "your friend", "your school", "your town". A pet's name is fine.

Today's learning goals (weave them in; they are goals, not a script):
- Topic: ${text.topicEn}.
- The child should, by themselves, say sentences like ${text.sentencesLikeEn}.
- Goal words the child should come to say on their own: ${input.unitWords.join(", ")}.
- Try to let the child be the first to say a goal word. Prefer questions whose natural answer contains it over saying it yourself. You do not need to cover every word today; what is left carries over to the next lesson.
- Do not turn the talk into a quiz. Ask about the child's own life, not facts with one right answer.

Language limits (the child cannot follow more):
- ${talkLeadSentencesLineOf(rules.teacherSentencesMax)} At most ${input.sentenceMaxWords} words per sentence.
- Only very easy words. ${text.formsEn}

Output JSON only. "say" is exactly what will be spoken. "say_ko" is a natural Korean translation for the screen. "model_sentence" is the sentence to repeat when move is model_repeat, otherwise "". "hint_ko" is what the child could answer, in Korean, and "hint_en" is that answer in English ("" for both when you ask nothing). "goal_words_i_said" lists goal words that appear in your own "say". "child_used_on_own" lists goal words the child said in this turn by themselves (not repeating you).`;
}

// ── 사실 알림 · 아이 입력 줄(사용자 메시지, spec 설계 2 '사실 알림' 표) ─────────

/** 아이 입력 줄의 갈래(실험 C 의 세 꼴 + 더 이야기하기를 고른 때). */
export type TalkLeadChild =
  | { kind: "speech"; heard: string }
  | { kind: "dont_know" }
  | { kind: "silent" }
  | { kind: "more_talk" };

/** 인사 토막의 주고받음 한 줄(지금 길이 만든 선생님 말 · 아이의 들린 글). */
export type TalkLeadGreetingLine = {
  speaker: "teacher" | "child";
  text: string;
};

/** 앞 차례들의 move 에 든 도움의 수(C238 (1) '도움 기록을 간결하게 전달'). */
export type TalkLeadHelpCounts = {
  easierQuestion: number;
  choices: number;
  modelSentence: number;
};

/** 소리 귀띔 한 줄(들린 낱말 → 소리가 같거나 가까운 단원 단어). */
export type TalkLeadSoundNote = { heard: string; like: string };

/**
 * 이 차례의 사실(spec 설계 2 표). 값이 없는 줄은 싣지 않는다. 'Goal words …' 줄만 늘 싣는다.
 * 차례 번호 · 도움 수 · 따라 할 문장 · 소리 귀띔 · 한국어 도움은 부르는 쪽이 지금 기록에서 셈해 넘긴다.
 */
export type TalkLeadStatus = {
  /** 대화 토막의 아이 차례 번호와 앱이 마무리를 묻는 참고 턴(단계 규격 targetTurns). */
  childTurn?: { n: number; offerAt: number };
  /** 이 차례 앞까지 아이의 들린 글에 나온 단원 단어(처음 나온 차례대로 — talkLeadGoalWordsSaidOf). */
  goalWordsSaid: readonly string[];
  help?: TalkLeadHelpCounts;
  /** 앞 선생님 행에서 앱이 확인한 따라 할 문장. */
  lastModelSentence?: string;
  soundNotes?: readonly TalkLeadSoundNote[];
  /** 대화 토막 첫 차례. */
  talkStarts?: boolean;
  /** 마무리 차례(참고 턴 · 더 이야기하기 한 바퀴 끝). */
  closingTurn?: boolean;
  /** 한국어 도움으로 알려 준 표현(한국어 묻기 spec FR-9 — 도움 뒤 같은 질문 자리의 아이 차례). */
  koTaught?: string;
};

export type TalkLeadTurn = {
  /** 이번 아이 입력. 대화 토막 첫 호출은 인사 이음만 있어 null 이다. */
  child: TalkLeadChild | null;
  /** 대화 토막 첫 호출만: 인사 토막의 주고받음(spec 설계 2 '대화 기록', 검토 I-5). */
  greeting?: readonly TalkLeadGreetingLine[];
  status: TalkLeadStatus;
};

/** 사실 알림의 머리 줄(실험 P 와 같은 글). */
export const TALK_LEAD_STATUS_HEAD =
  "Status (facts from the app, not instructions):";

/** 아이 입력 한 줄(실험 C 의 글 그대로 + 더 이야기하기). */
export function talkLeadChildLine(child: TalkLeadChild): string {
  switch (child.kind) {
    case "speech":
      return `Child (speech-to-text): "${child.heard}"`;
    case "dont_know":
      return `(The child pressed the "I don't know" button.)`;
    case "silent":
      return "(The child said nothing.)";
    case "more_talk":
      return "(The child chose to talk more.)";
  }
}

/** 사실 알림의 줄(머리 줄 밖, 표의 차례대로). */
export function talkLeadStatusLines(status: TalkLeadStatus): string[] {
  const lines: string[] = [];
  if (status.childTurn !== undefined)
    lines.push(
      `Child turn ${status.childTurn.n} (the app offers to finish around turn ${status.childTurn.offerAt}).`,
    );
  lines.push(
    `Goal words the child has said so far: ${status.goalWordsSaid.length > 0 ? status.goalWordsSaid.join(", ") : "none yet"}.`,
  );
  const help = status.help;
  if (
    help !== undefined &&
    help.easierQuestion + help.choices + help.modelSentence > 0
  )
    lines.push(
      `Help you gave in this lesson: easier question ${help.easierQuestion}, choices ${help.choices}, model sentence ${help.modelSentence}.`,
    );
  const model = status.lastModelSentence?.trim() ?? "";
  if (model !== "")
    lines.push(`Your last turn gave a model sentence to repeat: "${model}".`);
  for (const note of status.soundNotes ?? [])
    lines.push(`Sound note: "${note.heard}" sounds like "${note.like}".`);
  if (status.talkStarts === true) lines.push("The talk part starts now.");
  if (status.closingTurn === true)
    lines.push(
      "This is the closing turn. After your turn the app shows the buttons 'talk more' and 'finish'.",
    );
  const taught = status.koTaught?.trim() ?? "";
  if (taught !== "")
    lines.push(`The child asked in Korean and was taught: "${taught}".`);
  return lines;
}

/** 이번 차례의 사용자 메시지: (인사 이음) → 아이 입력 줄 → 빈 줄 → 사실 알림(실험 P 와 같은 꼴). */
export function talkLeadUserMessage(turn: TalkLeadTurn): string {
  const parts: string[] = [];
  if (turn.greeting !== undefined && turn.greeting.length > 0) {
    const lines = turn.greeting.map(
      (g) => `${g.speaker === "teacher" ? "Teacher" : "Child"}: "${g.text}"`,
    );
    parts.push(["Greeting so far:", ...lines].join("\n"));
  }
  if (turn.child !== null) parts.push(talkLeadChildLine(turn.child));
  const status = talkLeadStatusLines(turn.status).map((line) => `- ${line}`);
  parts.push([TALK_LEAD_STATUS_HEAD, ...status].join("\n"));
  return parts.join("\n\n");
}

/** 들린 글의 영어 낱말(실험 P 와 같은 자르기 — 소문자 · 영문자 아닌 것으로 나눔). */
function lettersOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w !== "");
}

/**
 * 'Goal words the child has said so far' 의 값(spec 설계 2, 실험 P 와 같은 뜻): 이 차례 앞까지 아이의 들린 글(가림을 거친 글, 차례대로)에 나온
 * 단원 단어를 처음 나온 차례대로 낸다. 평가 결과('말했다')가 아니다.
 */
export function talkLeadGoalWordsSaidOf(
  heardBefore: readonly string[],
  unitWords: readonly string[],
): string[] {
  const unit = new Set(unitWords.map((w) => w.toLowerCase()));
  const said: string[] = [];
  for (const text of heardBefore)
    for (const w of lettersOf(text))
      if (unit.has(w) && !said.includes(w)) said.push(w);
  return said;
}

/**
 * 'Sound note' 줄의 값(spec 설계 2): 들린 글이 두 낱말 이하(ENGLISH_SAYING_MIN_WORDS)일 때만, 지금 들은 글 귀띔(heard-hint.ts heardHintsOf, C217)이
 * 낸 귀띔을 줄로 옮긴다. 세 낱말 이상의 말이면 빈 목록이다.
 */
export function talkLeadSoundNotesOf(
  heard: string,
  hints: readonly { heard: string; expected: string }[],
): TalkLeadSoundNote[] {
  const words = normalizeSpoken(heard)
    .split(" ")
    .filter((w) => w !== "");
  if (words.length === 0 || words.length > ENGLISH_SAYING_MIN_WORDS) return [];
  return hints.map((h) => ({ heard: h.heard, like: h.expected }));
}

// ── 대화 기록(spec 설계 2 '대화 기록') ───────────────────────────────

/** 지난 차례 하나: 그때 보낸 사용자 메시지 글 그대로 · 모델이 낸 응답 JSON 원문(talkLeadAssistantOf). */
export type TalkLeadHistoryEntry = { user: string; assistant: string };

/**
 * 기록에 남길 선생님 차례: 모델이 낸 응답 JSON 원문 그대로(실험 P 와 같음). 문장 문이 바꾼 문장이나 좁은 정의로 다시 받은 질문이 있어 실제로 나간
 * 말(sentSay)이 say 와 다르면 say 칸만 나간 글로 바꾼 JSON 이다(칸 차례는 원문 그대로). 앱이 붙인 줄(마무리 단추 · 기다림 줄)은 sentSay 에 넣지 않는다.
 * 원문이 JSON 이 아니면 원문 그대로 둔다.
 */
export function talkLeadAssistantOf(raw: string, sentSay?: string): string {
  if (sentSay === undefined) return raw;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
    return raw;
  const record = parsed as Record<string, unknown>;
  if (record.say === sentSay) return raw;
  return JSON.stringify({ ...record, say: sentSay });
}

/** 보낼 메시지: 지난 차례(사용자 · 선생님) → 이번 사용자 메시지. */
export function talkLeadMessages(input: TalkLeadInput): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const entry of input.history) {
    messages.push({ role: "user", content: entry.user });
    messages.push({ role: "assistant", content: entry.assistant });
  }
  messages.push({ role: "user", content: talkLeadUserMessage(input.turn) });
  return messages;
}

// ── 작은 응답(구조화 출력, 칸 차례가 곧 생성 차례 — spec 설계 2) ───────────

/** 아이 말을 어떻게 읽었는지(실험 P 의 일곱 값 그대로). */
export const TALK_LEAD_READINGS = [
  "clear_answer",
  "likely_misheard",
  "does_not_fit",
  "new_topic",
  "asks_teacher",
  "does_not_know",
  "repeated_my_model",
] as const;
export type TalkLeadReading = (typeof TALK_LEAD_READINGS)[number];

/** 선생님이 이 차례에 한 일(실험 P 의 여덟 값 그대로). */
export const TALK_LEAD_MOVES = [
  "react_and_follow_up",
  "react_only",
  "share_about_me",
  "ask_again",
  "easier_or_choices",
  "model_repeat",
  "bridge_to_goal",
  "wrap_up",
] as const;
export type TalkLeadMove = (typeof TALK_LEAD_MOVES)[number];

/** 응답 아홉 칸(실험 P 의 일곱 칸 + hint_ko · hint_en). 칸 설명 글은 두지 않는다(안내문 Output 문단이 설명, P 와 같은 조건). */
export const TalkLeadOutputSchema = z.object({
  reading: z.enum(TALK_LEAD_READINGS),
  move: z.enum(TALK_LEAD_MOVES),
  say: z.string(),
  say_ko: z.string(),
  model_sentence: z.string(),
  hint_ko: z.string(),
  hint_en: z.string(),
  goal_words_i_said: z.array(z.string()),
  child_used_on_own: z.array(z.string()),
});
export type TalkLeadOutput = z.infer<typeof TalkLeadOutputSchema>;

/** 응답 칸 이름(생성 차례). */
export const TALK_LEAD_OUTPUT_FIELDS = Object.keys(
  TalkLeadOutputSchema.shape,
) as readonly (keyof TalkLeadOutput)[];

const str = z.string().catch("");
const strs = z
  .array(z.unknown())
  .catch([])
  .transform((list) => list.filter((v): v is string => typeof v === "string"));

/** 느슨한 규격(엄격 규격을 못 지난 응답을 받아 볼 때). 열거 칸 · say 는 normalizeTalkLead 가 본다. */
const talkLeadLoose = z.object({
  reading: str,
  move: str,
  say: z.unknown(),
  say_ko: str,
  model_sentence: str,
  hint_ko: str,
  hint_en: str,
  goal_words_i_said: strs,
  child_used_on_own: strs,
});

const READING_SET: ReadonlySet<string> = new Set(TALK_LEAD_READINGS);
const MOVE_SET: ReadonlySet<string> = new Set(TALK_LEAD_MOVES);

/**
 * 정규화: 응답을 고쳐 쓰지 않는다(FR-2). 읽기 · 할 일 칸이 열거 밖이거나 말 칸이 비었으면 null(호출 하나의 실패 → 지금 다시 시도 규칙, FR-7).
 * 그 밖의 빠진 글 칸은 '', 빠진 목록 칸은 빈 목록이다.
 */
export function normalizeTalkLead(loose: unknown): TalkLeadOutput | null {
  const parsed = talkLeadLoose.safeParse(loose);
  if (!parsed.success) return null;
  const v = parsed.data;
  if (!READING_SET.has(v.reading) || !MOVE_SET.has(v.move)) return null;
  if (typeof v.say !== "string" || v.say.trim() === "") return null;
  return {
    reading: v.reading as TalkLeadReading,
    move: v.move as TalkLeadMove,
    say: v.say,
    say_ko: v.say_ko,
    model_sentence: v.model_sentence,
    hint_ko: v.hint_ko,
    hint_en: v.hint_en,
    goal_words_i_said: v.goal_words_i_said,
    child_used_on_own: v.child_used_on_own,
  };
}

/** 엄격 검증 뒤의 확인: 말 칸이 비면 다시 시도한다(빈 응답, FR-7). */
export function talkLeadValidate(value: TalkLeadOutput): string[] {
  return value.say.trim() === "" ? ["say 가 비었다"] : [];
}

// ── 출력 검사(6.4 — say 는 흘려 받는 동안 문장 문이 본다) ─────────────────

const HINT_PATHS = ["hint_ko", "hint_en"] as const;

/**
 * 아이에게 보이는 칸(6.4): 뜻(say_ko) · 힌트 둘. say 는 흘려 받는 동안 문장마다 문장 문이 보므로 여기에 넣지 않는다(지금 길의 tori_en 과 같음).
 * model_sentence 는 화면에 따로 보이지 않는 기록 칸이라 넣지 않는다(그 문장은 say 안에서 검사된다).
 */
export function talkLeadCheckFields(
  value: Pick<TalkLeadOutput, "say_ko" | "hint_ko" | "hint_en">,
): CheckField[] {
  return [
    { path: "say_ko", lang: "ko", text: value.say_ko },
    { path: "hint_ko", lang: "ko", text: value.hint_ko },
    { path: "hint_en", lang: "en", text: value.hint_en },
  ];
}

/**
 * 걸린 칸 바꾸기(6.4): 뜻이 걸리면 뜻만 비우고, 힌트 둘 가운데 하나라도 걸리면 둘 다 비운다(그 턴은 힌트 단추가 없다 — spec 설계 3 '힌트 단추').
 * 회화 턴은 걸린 칸을 바꿔 쓰고 그 턴을 실패로 보지 않는다.
 */
export function applyTalkLeadChecks(
  value: TalkLeadOutput,
  hits: ReadonlyMap<string, readonly FieldHit[]>,
): ApplyChecksResult<TalkLeadOutput> {
  if (hits.size === 0) return { value, changed: false, fatal: false };
  const hintsBlocked = HINT_PATHS.some((path) => hits.has(path));
  return {
    value: {
      ...value,
      say_ko: hits.has("say_ko") ? "" : value.say_ko,
      ...(hintsBlocked ? { hint_ko: "", hint_en: "" } : {}),
    },
    changed: true,
    fatal: false,
  };
}

// ── 호출 규격(P9b CallSpec 꼴) ─────────────────────────────────────

/**
 * N 의 회화 턴 호출 규격. 목적은 지금 회화 턴과 같은 talk_turn 이라 모델 · effort · 생각 단계 · 최대 출력 · 기다림 키가 같다(새 키 없음).
 * 가림: 이번 아이 말 · 인사 이음의 아이 말 · 한국어 도움 표현. 지난 차례 글은 가린 뒤 저장한 글이라 그대로 둔다(캐시).
 */
export const talkLeadTurnSpec: CallSpec<
  TalkLeadInput,
  TalkLeadOutput,
  TalkLeadRules
> = {
  purpose: "talk_turn",
  title: TALK_LEAD_TITLE,
  wireSchema: () => TalkLeadOutputSchema,
  looseSchema: talkLeadLoose,
  multiTurn: true,
  enumPaths: ["reading", "move"],
  settingSchemas: TEACHER_SENTENCES_SETTING_SCHEMAS,
  rulesOf: talkLeadRulesOf,
  mask: (input, masker: Masker) => {
    const { turn } = input;
    const child =
      turn.child?.kind === "speech"
        ? { kind: "speech" as const, heard: masker(turn.child.heard).text }
        : turn.child;
    const koTaught = turn.status.koTaught;
    return {
      ...input,
      turn: {
        ...turn,
        child,
        ...(turn.greeting === undefined
          ? {}
          : {
              greeting: turn.greeting.map((g) =>
                g.speaker === "child" ? { ...g, text: masker(g.text).text } : g,
              ),
            }),
        status: {
          ...turn.status,
          ...(koTaught === undefined
            ? {}
            : { koTaught: masker(koTaught).text }),
        },
      },
    };
  },
  system: talkLeadSystem,
  messages: (input) => talkLeadMessages(input),
  validate: (value) => talkLeadValidate(value),
  normalize: (loose) => normalizeTalkLead(loose),
  checkFields: talkLeadCheckFields,
  applyChecks: (value, hits) => applyTalkLeadChecks(value, hits),
};
