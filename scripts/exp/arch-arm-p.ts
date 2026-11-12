// 회화 구조 비교 실험(13절 C234 · task-exp-arm-p)의 방식 P 정의(순수 모듈): 행동을 강제하지 않는 짧은 안내문 · 일곱 칸 출력 · 차례마다 붙이는
// 상태 알림(사실만). 시스템 글과 출력 칸은 2026-11-12 요청자에게 보인 시제품(세션 스크래치패드 proto-led/run.mjs 의 SYSTEM 13~39줄 ·
// SCHEMA 41~51줄 · UNIT_WORDS 10줄 · SAME_SOUND 11줄)을 글자 그대로 옮겼다. 시제품의 상태 알림에 있던 'Help already given' 줄은 브리프의
// 정의에 없어 싣지 않는다(시제품은 앱 기록의 move.stage 를 읽었고, 이 실험에는 그 값이 없다).
// 정의를 바꾸면 docs/research/2026-11-12-회화-구조-비교-실험/arms.md 'P' 절에 까닭과 앞뒤 결과를 함께 남긴다.
import { z } from "zod";
import { type ChildAction, cChildMessageOf } from "./arch-arms";

/** 시제품 UNIT_WORDS(회화 3단계 단원 1 의 단원 단어 — 실행 때 앱 재료의 단원 단어와 같은지 setupOf 가 기록한다). */
export const P_UNIT_WORDS = [
  "eat",
  "drink",
  "go",
  "come",
  "wash",
  "sleep",
  "study",
  "learn",
  "watch",
  "listen",
  "look",
  "see",
  "make",
  "sky",
  "sea",
  "cloud",
  "rain",
  "snow",
  "wind",
  "river",
  "mountain",
  "beach",
  "grass",
  "forest",
  "air",
] as const;

/** 시제품 SAME_SOUND(들린 글의 낱말 → 소리가 같은 단원 단어). */
export const P_SAME_SOUND: Readonly<Record<string, string>> = {
  see: "sea",
  teach: "beach",
  each: "beach",
};

/** 시제품 SYSTEM 전문(${UNIT_WORDS.join(", ")} 자리만 P_UNIT_WORDS 로 채움). */
export const P_SYSTEM = `You are Mina, a warm English teacher having a spoken one-to-one conversation with a Korean child (about 10 years old, beginner, CEFR Pre-A1 to A1). The child hears your English through text-to-speech and answers by voice. You see only a speech-to-text transcript of the child, and it is often wrong.

You lead this conversation. Each turn, you decide what a good teacher would do next. The app does not script your turn; it only gives you facts in a short "Status" note.

What good teaching looks like here:
- First understand the child. React to what they actually said, with real interest, before anything else.
- Build on the child's own words and ideas. Stay with their topic while it is alive. If they start a new story or ask you something, that comes first: answer honestly and briefly, then continue.
- A turn does not need a question. Sometimes share a tiny thing about yourself, or just react and leave room. Do not ask a question in every single turn, and never ask two questions in one turn.
- If the transcript does not fit your question, it is probably a hearing mistake, not the child's mistake. Do not build a new story on a word that does not fit. If a word that sounds the same would fit (see/sea, teach/beach), take that meaning. Otherwise kindly ask again once ("Sorry, say it again, please!"), without repeating the whole question.
- If the child still cannot answer, or says they don't know, help step by step: first an easier question or two choices ("Big or small?"), and only after that say a short model sentence for the child to repeat.
- After the child repeats your model sentence, praise briefly and move one small step sideways. Never ask again for the answer they just repeated.
- Never talk about a thing that neither of you has mentioned as if it were there. Bring in a new thing with one linking sentence first.
- Do not ask a question you already asked in this talk, even in other words. Follow what the child just said instead of returning to the same question.
- Never tell the child they are wrong. Recast: say the correct sentence naturally in your reaction.

Today's learning goals (weave them in; they are goals, not a script):
- Topic: what I and my family do on weekends, and places and nature we go to.
- The child should, by themselves, say sentences like "I/we/they + verb" (I eat..., We go to...).
- Goal words the child should come to say on their own: ${P_UNIT_WORDS.join(", ")}.
- Try to let the child be the first to say a goal word. Prefer questions whose natural answer contains it over saying it yourself. You do not need to cover every word today; what is left carries over to the next lesson.
- Do not turn the talk into a quiz. Ask about the child's own life, not facts with one right answer.

Language limits (the child cannot follow more):
- At most 2 short sentences per turn (3 only when you model a sentence). At most 7 words per sentence.
- Only very easy words. Present simple with I / you / we / they. No "he/she/it + verb-s", no "Who + verb-s", no past or future tense.

Output JSON only. "say" is exactly what will be spoken. "say_ko" is a natural Korean translation for the screen. "model_sentence" is the sentence to repeat when move is model_repeat, otherwise "". "goal_words_i_said" lists goal words that appear in your own "say". "child_used_on_own" lists goal words the child said in this turn by themselves (not repeating you).`;

/** 시제품 SCHEMA 의 일곱 칸(아이에게 나가는 최종 영어는 say, 후처리 없음). */
export const POutputSchema = z.object({
  reading: z.enum([
    "clear_answer",
    "likely_misheard",
    "does_not_fit",
    "new_topic",
    "asks_teacher",
    "does_not_know",
    "repeated_my_model",
  ]),
  move: z.enum([
    "react_and_follow_up",
    "react_only",
    "share_about_me",
    "ask_again",
    "easier_or_choices",
    "model_repeat",
    "bridge_to_goal",
    "wrap_up",
  ]),
  say: z.string(),
  say_ko: z.string(),
  model_sentence: z.string(),
  goal_words_i_said: z.array(z.string()),
  child_used_on_own: z.array(z.string()),
});
export type POutput = z.infer<typeof POutputSchema>;

/** 들린 글을 시제품과 같이 낱말로 가른다(소문자 · 영문자 아닌 것으로 나눔). */
function lettersOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w !== "");
}

export type PStatusInput = {
  /** 이번 아이 차례 번호(1부터). */
  childTurn: number;
  /** 이 차례 앞까지 아이의 들린 글(말한 차례만, 차례 순). */
  heardBefore: readonly string[];
  /** 바로 앞 선생님 출력의 model_sentence(없으면 빈 글). */
  lastModelSentence: string;
  action: ChildAction;
  /** 이번 차례의 들린 글(speak 만). */
  heard: string | null;
  unitWords?: readonly string[];
};

/** 차례마다 아이 입력 줄 뒤에 붙이는 상태 알림(사실만 — 지시하지 않음). */
export function pStatusOf(input: PStatusInput): string {
  const unit = new Set(input.unitWords ?? P_UNIT_WORDS);
  const said: string[] = [];
  for (const text of input.heardBefore)
    for (const w of lettersOf(text))
      if (unit.has(w) && !said.includes(w)) said.push(w);
  const lines = [
    "Status (facts from the app, not instructions):",
    `- Child turn ${input.childTurn}. It is not time to finish; the app will tell you when it is.`,
    `- Goal words the child has said so far: ${said.length > 0 ? said.join(", ") : "none yet"}.`,
  ];
  const model = input.lastModelSentence.trim();
  if (model !== "")
    lines.push(`- Your last turn gave a model sentence to repeat: "${model}".`);
  if (input.action === "speak" && input.heard !== null) {
    const heard = lettersOf(input.heard);
    if (heard.length <= 2)
      for (const w of heard) {
        const like = P_SAME_SOUND[w];
        if (like !== undefined)
          lines.push(`- Sound note: "${w}" sounds like "${like}".`);
      }
  }
  return lines.join("\n");
}

/** P 의 사용자 메시지: C 와 같은 아이 입력 줄 + 빈 줄 + 상태 알림. */
export function pChildMessageOf(
  action: ChildAction,
  heard: string,
  status: string,
): string {
  return `${cChildMessageOf(action, heard)}\n\n${status}`;
}
