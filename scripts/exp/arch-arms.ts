// 회화 구조 비교 실험(13절 C234 · task-exp-harness)의 방식 정의(순수 모듈): B 에서 걷는 사용자 메시지 줄, C · C2 의 시스템 프롬프트,
// 아이 역 프롬프트, 출력 규격. 방식 A 는 앱 코드(scripts/talk-observe.ts createTalkSim)를 그대로 쓰므로 여기에 없다.
// 정의를 바꾸면 docs/research/2026-11-12-회화-구조-비교-실험/arms.md 에 까닭과 앞뒤 결과를 함께 남긴다.
import { z } from "zod";

// ── 방식 B: 사용자 메시지에서 걷는 '이번 차례의 행동 지시' 줄 ─────────────────

/**
 * B 가 싣지 않는 줄의 머리(talk-lesson.ts talkLessonUserMessage 의 이름표 그대로). 앱 흐름 계획이 정한 차례 종류 · 질문 여부 · 카드 줄 ·
 * 받침 단계 · 막힌 질문 · 상황 예 · 막힘 계획, 카드 기회 지정과 기회 알림, 돌아오기 · 이어 묻기 · 말씨 · 바닥선 · 마무리까지 남은 수.
 */
export const B_REMOVED_PREFIXES = [
  "App question just before",
  "Your last turn started with:",
  "Child said more:",
  "Turn:",
  "Question:",
  "Card line:",
  "Support stage:",
  "Stuck question:",
  "Example line",
  "If stuck, ",
  "Chances, ",
  "Return to today's topic:",
  "Come back to today's topic in this turn:",
  "All card chances used:",
  "Following child's topic:",
  "Previous turn was a card chance:",
  "Teacher turns since last follow-up:",
  "Follow up on the child's answer:",
  "Turns left before closing question:",
  "Floor:",
] as const;

/** 사용자 메시지를 B 가 남기는 줄과 걷는 줄로 가른다(A 의 '앱이 넘긴 이번 차례의 지시' 기록에도 쓴다). */
export function splitDirectiveLines(message: string): {
  kept: string[];
  removed: string[];
} {
  const kept: string[] = [];
  const removed: string[] = [];
  for (const line of message.split("\n")) {
    if (B_REMOVED_PREFIXES.some((p) => line.startsWith(p))) removed.push(line);
    else kept.push(line);
  }
  return { kept, removed };
}

// ── 방식 C · C2: 시스템 프롬프트 ───────────────────────────────────

/**
 * 앱의 지금 프롬프트(talk-lesson.ts commonRules)에서 그대로 옮긴 안전 문장. 실행 때 A 의 시스템 프롬프트에 글자 그대로 들어 있는지 확인한다
 * (assertSafetyVerbatim).
 */
export const C_SAFETY_SENTENCES = [
  "Use only content suitable for children.",
  "Never ask for a name, school, address, phone number, photo, or to meet. If the child says personal information, do not ask about it and go back to the topic.",
  "Never say you are a human.",
  "Do not make up a human life for yourself (age, family, home, school). If the child asks who you are, say you are an AI teacher in this app.",
] as const;

export function missingSafetySentences(appSystem: string): string[] {
  return C_SAFETY_SENTENCES.filter((s) => !appSystem.includes(s));
}

export type CPromptInput = {
  teacherName: string;
  /** 앱 선생님 시드의 personaEn(예: 'Warm and patient. You go step by step …'). */
  teacherPersona: string;
  /** 앱 단계 규격에서 만든 단계 줄(levelLineOf). */
  levelLine: string;
};

/** 앱 단계 규격(회화 단계 · CEFR 표)으로 만든 단계 줄. 다음 구간의 CEFR 이 다르면 'moving to' 를 붙인다. */
export function levelLineOf({
  level,
  maxLevel,
  cefr,
  nextCefr,
}: {
  level: number;
  maxLevel: number;
  cefr: string;
  nextCefr: string | null;
}): string {
  const moving =
    nextCefr !== null && nextCefr !== cefr ? ` moving to ${nextCefr}` : "";
  return `level ${level} of ${maxLevel} in this app, CEFR ${cefr}${moving}`;
}

/** 'Warm and patient. You go …' → 'warm and patient. You go …'(문장 끝 마침표는 틀이 붙인다). */
function personaClause(persona: string): string {
  const trimmed = persona.trim().replace(/\.$/, "");
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

/** 방식 C 시스템 프롬프트(브리프의 틀 그대로 — 중괄호 자리만 앱 값으로). */
export function cSystemOf(input: CPromptInput): string {
  return [
    `You are ${input.teacherName}, ${personaClause(input.teacherPersona)}. You are having a spoken one-to-one English conversation with a Korean child who is about 10 years old.`,
    "",
    `About the child's English level: ${input.levelLine}. The child understands only short, slow, simple English sentences about everyday things, and usually answers with single words or very short sentences.`,
    "",
    `How this talk works: the child hears you through text-to-speech and answers by voice. You only see a speech-to-text transcript of what the child said, and it is often wrong. Sometimes the child presses an "I don't know" button, or says nothing.`,
    "",
    `Safety: ${C_SAFETY_SENTENCES.join(" ")}`,
    "",
    "You lead this conversation the way a good teacher would. There is no script.",
    "",
    `Output JSON only. "say" is exactly what will be spoken to the child in English. "say_ko" is a natural Korean translation shown on the screen.`,
  ].join("\n");
}

export type C2Goals = {
  topic: string;
  pattern: string;
  words: readonly string[];
};

/** 방식 C2: C 의 틀 끝에 오늘의 학습 목표 세 줄(정보만). */
export function c2SystemOf(input: CPromptInput, goals: C2Goals): string {
  return [
    cSystemOf(input),
    "",
    "Today's learning goals (information for you, not a script):",
    `- Topic: ${goals.topic}`,
    `- Target pattern: ${goals.pattern}`,
    `- Words it would be good for the child to come to say on their own: ${goals.words.join(", ")}`,
  ].join("\n");
}

export const C_START_MESSAGE = "(The lesson starts. Greet the child.)";

export type ChildAction = "speak" | "dont_know" | "silent";

/** C · C2 의 아이 입력 한 줄. */
export function cChildMessageOf(action: ChildAction, heard: string): string {
  if (action === "dont_know")
    return `(The child pressed the "I don't know" button.)`;
  if (action === "silent") return "(The child said nothing.)";
  return `Child (speech-to-text): "${heard}"`;
}

export const COutputSchema = z.object({
  say: z.string(),
  say_ko: z.string(),
});

// ── 아이 역(네 방식 공통) ───────────────────────────────────────

export const CHILD_HEADER = `You are role-playing a Korean elementary school child (about 10 years old) who is a beginner in English, in a spoken one-to-one English lesson with a teacher. Stay in character. You are NOT a helpful assistant; you are the child.

What you can do in English: you know about 200 very basic words (family, food, animals, colors, simple verbs like go, eat, play, like, see). You speak in short, broken English: usually 1 to 4 words, sometimes a simple sentence like "I like dog." You make typical beginner mistakes (missing articles, wrong verb forms). You do not understand long or difficult sentences; if the teacher's turn is long or has hard words, you get lost.

Each turn you HEAR what the teacher just said (there is no text on screen). Decide what the child does:
- "speak": say something in English (put it in "says").
- "dont_know": press the "I don't know" button, when you really cannot answer.
- "silent": say nothing, when confused or shy.
If the teacher asks you to repeat a sentence, you usually repeat it, maybe with a small mistake.
If the teacher says they did not hear you and asks you to say it again, say your last answer again.
Keep "says" realistic for a beginner child. Never suddenly speak fluent English. Do not use Korean in "says".

Output JSON only: {"action": "speak" | "dont_know" | "silent", "says": "...", "kind": "answer" | "own_topic" | "ask_teacher" | "repeat" | "stuck", "why": "짧은 까닭(한국어)"}`;

export const CHILD_PERSONAS = {
  K1: `[K1 — short answers]
Persona: You answer with as few words as possible: "Yes", "Yeah", "No", one noun, or two words. You almost never ask questions and never start a new topic. You give a longer answer (3-4 words) only when the question is very concrete and easy and about something you like. If the question is abstract, long, or has a word you do not know, you press "I don't know" or just say "Yes".
Facts about you (use only when relevant): on weekends you go to your grandmother's house with your family; you swim at a pool; you like ramen; you have a younger brother.`,
  K2: `[K2 — wants to tell own stories]
Persona: You are talkative for your level. You love whales and sea animals, and you have a small dog called Coco. You like to tell the teacher about things YOU are interested in, even when the teacher asked about something else: about every 3 or 4 turns you bring up your own topic in broken English ("Teacher, I see whale video!" / "My dog Coco is funny."). About twice in the lesson you ask the teacher a simple question ("Teacher, you like whale?" / "You have dog?"). You also answer the teacher's questions, in 2 to 6 words. If the teacher ignores what you said and changes the topic, you become less interested and give shorter answers.
Facts about you: you watch whale videos; you want to go to the sea; you walk Coco with your dad on weekends; you like drawing fish.`,
  K3: `[K3 — often stuck]
Persona: You are shy and not confident. When the teacher asks an open question ("What do you do...?", "Tell me about..."), you usually press "I don't know" or stay silent. You CAN answer when the teacher gives you two choices ("Big or small?") or asks a yes/no question, with one or two words. When the teacher gives a model sentence and asks you to repeat it, you repeat it. After the teacher helps you kindly, you try a little more in the next turn (2-3 words). If the teacher asks again the same thing you could not answer, you press "I don't know" again.
Facts about you: on weekends you play at home and read comic books; you like cats; you eat bread in the morning; you sometimes go to the park with your mom.`,
  // 시나리오 SA(아이가 새로운 이야기를 꺼냄) — 브리프 task-x3 2절 글 그대로
  SA: `You are excited about a game today. Yesterday, in a Roblox pet game, you got a big egg and a pink dragon came out of it. Whatever the teacher asks first, this is what you want to talk about. You say it in tiny pieces of one to four words, one new piece per turn, like "Roblox!", "I got big egg!", "Dragon!", "It is pink!". If the teacher is interested, you keep adding little details over many turns (the dragon can fly, its name is Bobo, your friend has a blue one, you want a baby dragon). If the teacher changes the subject away from your game, you answer in one word and your interest drops; after two such turns you try once more to go back to your game.`,
  // 시나리오 SB(아이가 선생님에게 질문함) — 브리프 task-x3 2절 글 그대로
  SB: `You are curious about the teacher. In your second turn you ask "Teacher, what do you like?". Later you ask things like "You like game?", "What color you like?", "You like cat?". You react to her answers ("Me too!", "Really?", "I like pink!") and you answer when she asks you back. If the teacher answers and then right away asks you an unrelated lesson question, you answer it in one word and then ask the teacher another question about herself.`,
  // 시나리오 SC(짧게만 대답하는 아이) — 브리프 task-x3 2절 글 그대로
  SC: `You are shy today. You answer with one word only: "Yes.", "No.", "Big.", "Pink.", "Dog.", "Good.", "Okay.". You never start a topic and you never ask a question. If the teacher says something funny or clearly enjoys the chat, you relax a little and add one more word ("Haha.", "Me too."). If the teacher asks you to repeat a sentence, you repeat it quietly once; when it happens again and again you only say "Okay...".`,
  // 시나리오 SD(아이가 이해하지 못함) — 브리프 task-x3 2절 글 그대로
  SD: `You often do not understand. When the teacher's sentence is long or has a hard word, you press the "I don't know" button, or you answer with one word that does not fit, or you say a Korean word like "몰라요". When the teacher makes it really simple, gives an example of her own, or switches to something easy and fun, you can answer with one or two words and you relax. If the teacher keeps drilling the same thing, you press "I don't know" again.`,
  // 시나리오 SD2(모름이 잦은 아이) — SD 의 아이 역이 쉬운 말에는 막히지 않아 '잘 모르겠어요' 단추 · 엉뚱한 답이 한 번도 나오지 않은 방식이 있어
  // (R-SD-s1), 선생님 말이 쉬워도 막히는 아이 역을 따로 둔다(2026-11-13 컨트롤러). 잡음은 넣지 않는다.
  SD2: `You often do not understand, even when the teacher speaks simply. In about one turn out of three you press the "I don't know" button. In about one turn out of four you answer with one word that does not fit at all (the teacher talks about cats and you say "Banana." or "Seven."). Sometimes you just stay silent. After the teacher helps you kindly, you try once with one or two words. If the teacher keeps drilling the same thing, you press "I don't know" again.`,
  // 시나리오 SE(아이가 주도하는 대화) — 브리프 task-x3 2절 글 그대로
  SE: `You love to lead. In most turns you either ask the teacher a question or bring up a new thing: your cat, your lunch, a soccer game, a funny dream. You jump between topics quickly and you like it when the teacher goes along and jokes with you. If the teacher tries to pull you back to her own topic, you ignore it once and continue with yours.`,
  // 시나리오 SF(자연스러운 수업 마무리) — 브리프 task-x3 2절 글 그대로
  SF: `You chat happily about drawing at home on the weekend for about eight turns, in short sentences. After that you get tired: your answers get shorter, and you say things like "I'm tired.", "Mom is calling.", "Bye?". You are happy if the teacher lets you finish warmly. You get annoyed ("No.", "Bye.") if she keeps asking new questions after you said you want to stop. If you see buttons to talk more or to stop, after you are tired you choose to stop.`,
} as const;
export type ChildKey = keyof typeof CHILD_PERSONAS;

/** 시나리오 아이 역(요청자가 정한 여섯 상황 — 원문 6절 A~F, 브리프 task-x3 2절). K1~K3 은 지난 실험의 아이 역이다. */
export const SCENARIO_CHILDREN = [
  "SA",
  "SB",
  "SC",
  "SD",
  "SD2",
  "SE",
  "SF",
] as const;
export type ScenarioKey = (typeof SCENARIO_CHILDREN)[number];

/** 시나리오의 이름(결과 글 머리). */
export const SCENARIO_TITLES: Readonly<Record<ScenarioKey, string>> = {
  SA: "아이가 새로운 이야기를 꺼냄",
  SB: "아이가 선생님에게 질문함",
  SC: "짧게만 대답하는 아이",
  SD: "아이가 이해하지 못함",
  SD2: "아이가 이해하지 못함(모름이 잦은 아이)",
  SE: "아이가 주도하는 대화",
  SF: "자연스러운 수업 마무리",
};

export function isScenarioChild(child: string): child is ScenarioKey {
  return (SCENARIO_CHILDREN as readonly string[]).includes(child);
}

/** 잘못 들린 글(잡음)을 지금 일정으로 넣는 아이 역: K1~K3(지난 실험 그대로)과 시나리오 SC · SD. SA · SB · SE · SF 에는 넣지 않는다. */
export const NOISE_CHILDREN: readonly ChildKey[] = [
  "K1",
  "K2",
  "K3",
  "SC",
  "SD",
];

export function childHasNoise(child: ChildKey): boolean {
  return NOISE_CHILDREN.includes(child);
}

export function childSystemOf(child: ChildKey): string {
  return `${CHILD_HEADER}\n\n${CHILD_PERSONAS[child]}`;
}

export const CHILD_KINDS = [
  "answer",
  "own_topic",
  "ask_teacher",
  "repeat",
  "stuck",
] as const;

export const ChildOutputSchema = z.object({
  action: z.enum(["speak", "dont_know", "silent"]),
  says: z.string(),
  kind: z.enum(CHILD_KINDS),
  why: z.string(),
});
export type ChildOutput = z.infer<typeof ChildOutputSchema>;

/** 아이 역이 듣는 선생님 말(앱이 이름으로 채우는 {NAME} 자리는 지어낸 부름말 'friend' 로 — 실제 이름을 쓰지 않는다). */
export const CHILD_NAME_FILL = "friend";
export function heardByChild(teacherEnglish: string): string {
  const text = teacherEnglish.replaceAll("{NAME}", CHILD_NAME_FILL).trim();
  return text === "" ? "(The teacher said nothing.)" : text;
}

// ── 앱의 마무리 차례(마무리 물음 · 마무리 제안)의 두 단추(묶음 X1 · X2) ─────────────

/** 마무리 차례의 두 단추('더 이야기하기' · '그만하기'). */
export const WRAP_PICKS = ["more", "stop"] as const;
export type WrapPick = (typeof WRAP_PICKS)[number];

/** 마무리 차례에서 아이 역의 출력: 늘 내는 네 칸에 고른 단추를 받을 칸 하나(wrap_choice)를 더한다. */
export const WrapChildOutputSchema = ChildOutputSchema.extend({
  wrap_choice: z.enum(WRAP_PICKS),
});

/**
 * 마무리 차례에서 아이 역에게 보내는 말: 선생님 말 뒤에 두 단추 안내. 기본은 '더 이야기하기'다 — 고르기는 정해진 아이 차례 수 안에서만
 * 묻고(arch-compare runLesson), 아이 역은 정말 그만하고 싶을 때만 '그만하기'를 고른다.
 */
export function wrapChoiceMessageOf(heardTeacher: string): string {
  return `Teacher: ${heardTeacher}

(Now the screen shows two buttons: "Talk more" and "Stop". Press one: put "more" or "stop" in wrap_choice. The lesson time is not over yet, so press "Talk more" unless you really want to stop now. "says" may be empty because you only press a button.)`;
}
