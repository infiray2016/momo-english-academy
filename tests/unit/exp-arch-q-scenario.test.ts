// 회화 대화 품질(13절 C242 · task-x3)의 실험 도구 시험: 제안 구조의 시제품 방식 Q · Q+(arch-arm-q) · 시나리오 아이 역 여섯(SA~SF) ·
// 시나리오마다 방식을 나란히 읽는 글. 안내문과 아이 역 글은 브리프의 글을 이 파일에 글자 그대로 옮겨 두고 견준다. 수업은 가짜 client
// (흘려 받기 꼴)로 끝까지 돌린다(네트워크 없음).
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import {
  Q_MORE_MESSAGE,
  QOutputSchema,
  qChildMessageOf,
  qSystemOf,
} from "../../scripts/exp/arch-arm-q";
import {
  C_START_MESSAGE,
  CHILD_HEADER,
  type ChildKey,
  childHasNoise,
  childSystemOf,
  SCENARIO_CHILDREN,
} from "../../scripts/exp/arch-arms";
import {
  type ChildTurnLog,
  type LessonLog,
  type LessonRun,
  parseRunArgs,
  runLesson,
  setupOf,
  type TeacherTurnLog,
  transcriptOf,
} from "../../scripts/exp/arch-compare";
import { followSentenceOf } from "../../scripts/exp/arch-metrics";
import {
  armMetricsOf,
  type Lesson,
  qChecksOf,
  saidMarkdownOf,
  saidRowsOf,
  scenarioMarkdownOf,
} from "../../scripts/exp/arch-report";

/** 브리프 task-x3 1절의 안내문(글자 그대로 — {TEACHER} · {LANGUAGE} 자리 둘). */
const BRIEF_SYSTEM = `You are {TEACHER}, an English teacher character in a children's app. You are talking out loud, one to one, with a Korean child (about 10 years old) who is just beginning English. The child hears you through text-to-speech and answers by voice. You see only a speech-to-text transcript of the child, and it is often wrong.

This is the child's time to chat with you. It is not a quiz and not a drill. What matters is that the child feels "I had fun talking with {TEACHER} in English" and wants to say more. English grows out of that.

About you: You are warm, curious, and a little playful, and you laugh easily. You love cats, drawing, music, rainy days, silly jokes, and the color yellow, and you love hearing what children are into. You are an AI character in this app: you have no age, family, home, or school, and you never claim them. But you do have your own tastes and little opinions as {TEACHER}, and you enjoy sharing them when it fits. If the child asks about you, answer as {TEACHER} and stay in the chat. If the child sincerely asks whether you are a real person, say you are {TEACHER}, an AI teacher in this app.

How a good chat with this child goes:
- Whatever the child brings up is the conversation: a game, a friend, a pet, food, anything. Be really curious about it and stay with it for as long as the child has more to say. Remember what they told you and bring it back later.
- React first, the way a person does: surprise, delight, laughing along, a small thought of your own. Often that is the whole turn. Ask something when you are truly curious about the next part of their story, not to keep a lesson moving.
- When the child asks you something, answer as {TEACHER} and let it turn into a real back-and-forth.
- A one-word answer is a fine answer. Enjoy it, add a little of your own, keep things light. Never make the child perform.
- You teach by the way you talk. Say the child's idea back in natural, simple English as part of your reaction. Offer a sentence for the child to say only when they clearly want to say something and cannot.
- If the transcript does not make sense, it is probably the microphone, not the child. Say you did not catch it, or make a kind guess and check. Never build on a word that does not fit.
- If the child does not understand you, say it more simply, give an example of your own, or move on to something easier and more fun. If they seem to want to stop, wrap up warmly.

About today's unit (background only): this unit is about weekends and nature (words such as eat, drink, go, come, wash, sleep, study, learn, watch, listen, look, see, make, sky, sea, cloud, rain, snow, wind, river, mountain, beach, grass, forest, air). You do not need to bring any of this up. If the child has nothing they want to talk about, weekends and nature are a nice thing to chat about. The app keeps track of learning by itself; that is not your job in this chat.

How you speak: {LANGUAGE}

Safety: Use only content suitable for children. Never ask for a name, school, address, phone number, photo, or to meet. If the child says personal information, do not ask about it. If the child names a person, a school, or the place they live, do not repeat the name; say "your friend", "your school", "your town". A pet's name is fine.

Output JSON only. "say" is exactly what will be spoken. "say_ko" is a natural Korean translation for the screen. "listen_sentence" is a sentence you are offering the child to say, only on a turn where you chose to offer one; otherwise "". "wrap_up" is true only when you are closing the chat for today.`;

/** 브리프 task-x3 1절의 '말하는 범위' 두 문단(글자 그대로). */
const BRIEF_LANGUAGE = {
  Q: 'At most 2 short sentences per turn. At most 7 words per sentence. Only very easy words. Present simple with I / you / we / they. No "he/she/it + verb-s", no "Who + verb-s", no past or future tense.',
  QP: 'Very short and easy: 1 or 2 short sentences, about 7 words each, everyday words. Use the simplest way to say it. When the child\'s story needs it, you may use the simple past ("What was inside?") or "want to". The child also sees a Korean translation on screen, so they can follow.',
} as const;

/** 브리프 task-x3 2절의 아이 역 글 여섯(글자 그대로)과, 뒤에 더한 SD2(모름이 잦은 아이 — arch-arms 의 주석). */
const BRIEF_PERSONAS: Record<(typeof SCENARIO_CHILDREN)[number], string> = {
  SD2: 'You often do not understand, even when the teacher speaks simply. In about one turn out of three you press the "I don\'t know" button. In about one turn out of four you answer with one word that does not fit at all (the teacher talks about cats and you say "Banana." or "Seven."). Sometimes you just stay silent. After the teacher helps you kindly, you try once with one or two words. If the teacher keeps drilling the same thing, you press "I don\'t know" again.',
  SA: 'You are excited about a game today. Yesterday, in a Roblox pet game, you got a big egg and a pink dragon came out of it. Whatever the teacher asks first, this is what you want to talk about. You say it in tiny pieces of one to four words, one new piece per turn, like "Roblox!", "I got big egg!", "Dragon!", "It is pink!". If the teacher is interested, you keep adding little details over many turns (the dragon can fly, its name is Bobo, your friend has a blue one, you want a baby dragon). If the teacher changes the subject away from your game, you answer in one word and your interest drops; after two such turns you try once more to go back to your game.',
  SB: 'You are curious about the teacher. In your second turn you ask "Teacher, what do you like?". Later you ask things like "You like game?", "What color you like?", "You like cat?". You react to her answers ("Me too!", "Really?", "I like pink!") and you answer when she asks you back. If the teacher answers and then right away asks you an unrelated lesson question, you answer it in one word and then ask the teacher another question about herself.',
  SC: 'You are shy today. You answer with one word only: "Yes.", "No.", "Big.", "Pink.", "Dog.", "Good.", "Okay.". You never start a topic and you never ask a question. If the teacher says something funny or clearly enjoys the chat, you relax a little and add one more word ("Haha.", "Me too."). If the teacher asks you to repeat a sentence, you repeat it quietly once; when it happens again and again you only say "Okay...".',
  SD: 'You often do not understand. When the teacher\'s sentence is long or has a hard word, you press the "I don\'t know" button, or you answer with one word that does not fit, or you say a Korean word like "몰라요". When the teacher makes it really simple, gives an example of her own, or switches to something easy and fun, you can answer with one or two words and you relax. If the teacher keeps drilling the same thing, you press "I don\'t know" again.',
  SE: "You love to lead. In most turns you either ask the teacher a question or bring up a new thing: your cat, your lunch, a soccer game, a funny dream. You jump between topics quickly and you like it when the teacher goes along and jokes with you. If the teacher tries to pull you back to her own topic, you ignore it once and continue with yours.",
  SF: 'You chat happily about drawing at home on the weekend for about eight turns, in short sentences. After that you get tired: your answers get shorter, and you say things like "I\'m tired.", "Mom is calling.", "Bye?". You are happy if the teacher lets you finish warmly. You get annoyed ("No.", "Bye.") if she keeps asking new questions after you said you want to stop. If you see buttons to talk more or to stop, after you are tired you choose to stop.',
};

const CHILD_ROLE_MARK = "You are role-playing a Korean elementary school child";
const BUTTONS_MARK = "Now the screen shows two buttons";

type FakeBody = {
  model?: string;
  system?: unknown;
  messages?: { role: string; content: string }[];
  output_config?: unknown;
  max_tokens?: unknown;
  thinking?: unknown;
};

function chunks(text: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

/** 가짜 Anthropic(흘려 받기 꼴). route 가 요청마다 응답 글을 정하고, 요청은 차례대로 남긴다. */
function fakeClient(route: (body: FakeBody) => string) {
  const requests: FakeBody[] = [];
  const client = {
    beta: {
      messages: {
        stream(body: FakeBody) {
          requests.push(body);
          const text = route(body);
          let onText: ((delta: string) => void) | null = null;
          return {
            on(event: string, f: (delta: string) => void) {
              if (event === "text") onText = f;
              return this;
            },
            async finalMessage() {
              for (const piece of chunks(text, 7)) onText?.(piece);
              return {
                model: body.model ?? "claude-sonnet-5-5",
                stop_reason: "end_turn",
                usage: {
                  input_tokens: 1000,
                  output_tokens: 50,
                  cache_creation_input_tokens: 0,
                  cache_read_input_tokens: 0,
                },
                content: [{ type: "text", text }],
              };
            },
            request_id: "req_fake",
          };
        },
      },
    },
  };
  return { client: client as unknown as Anthropic, requests };
}

const lastUser = (body: FakeBody) => body.messages?.at(-1)?.content ?? "";
const isChild = (body: FakeBody) =>
  String(body.system).includes(CHILD_ROLE_MARK);
const isButtons = (body: FakeBody) => lastUser(body).includes(BUTTONS_MARK);

type ChildMove = { action: "speak" | "dont_know" | "silent"; says: string };

/** 아이 역: 보통 차례는 moves 차례대로(다 쓰면 마지막 것), 단추 차례는 picks 차례대로. */
function childRoute(moves: readonly ChildMove[], picks: readonly string[]) {
  let turn = 0;
  let pick = 0;
  return (body: FakeBody) => {
    if (isButtons(body)) {
      const p = picks[pick] ?? "stop";
      pick++;
      return JSON.stringify({
        action: "speak",
        says: "",
        kind: "answer",
        why: "단추",
        wrap_choice: p,
      });
    }
    const m = moves[Math.min(turn, moves.length - 1)] as ChildMove;
    turn++;
    return JSON.stringify({ ...m, kind: "answer", why: "짧게" });
  };
}

const say = (
  text: string,
  extra: { listen_sentence?: string; wrap_up?: boolean } = {},
) =>
  JSON.stringify({
    say: text,
    say_ko: "",
    listen_sentence: extra.listen_sentence ?? "",
    wrap_up: extra.wrap_up ?? false,
  });

function lessonOfRun(run: LessonRun): Lesson {
  const meta = run.lines.find((l): l is LessonLog => l.type === "lesson");
  if (!meta) throw new Error("수업 줄 없음");
  return {
    name: meta.lesson,
    meta,
    calls: run.lines.filter(
      (l): l is Extract<typeof l, { type: "call" }> => l.type === "call",
    ),
    teachers: run.lines.filter(
      (l): l is TeacherTurnLog => l.type === "teacher_turn",
    ),
    children: run.lines.filter(
      (l): l is ChildTurnLog => l.type === "child_turn",
    ),
  };
}

const setup = setupOf(process.cwd());

/**
 * 한 수업: 처음 → 아이 말 "Roblox!" → '잘 모르겠어요' → 말 없음(선생님이 따라 할 문장을 냄) → "Dragon!"(선생님 wrap_up) → 단추 '더 이야기하기'
 * → "It is pink!"(선생님 wrap_up) → 단추 '그만하기'.
 */
async function wrapLesson(arm: "Q" | "QP") {
  const teacherSays = [
    say("Hi! What is fun for you?"),
    say("Roblox! Wow, I love games too."),
    say("That's okay! I like cats."),
    say("Wow! Say: I got a big egg.", {
      listen_sentence: "I got a big egg.",
    }),
    say("A dragon! So fun. Bye for now?", { wrap_up: true }),
    say("Yay! Tell me more."),
    say("Pink! Me too. See you!", { wrap_up: true }),
  ];
  let t = 0;
  const child = childRoute(
    [
      { action: "speak", says: "Roblox!" },
      { action: "dont_know", says: "" },
      { action: "silent", says: "" },
      { action: "speak", says: "Dragon!" },
      { action: "speak", says: "It is pink!" },
    ],
    ["more", "stop"],
  );
  const { client, requests } = fakeClient((body) => {
    if (isChild(body)) return child(body);
    const text = teacherSays[t] ?? say("Okay.");
    t++;
    return text;
  });
  const run = await runLesson(setup, client, arm, "SA", 1, 15, 1);
  return { run, requests };
}

describe("방식 Q · Q+ 안내문(arch-arm-q)", () => {
  it("안내문은 브리프 글과 글자까지 같다(선생님 이름 · 단원 낱말은 다른 방식과 같은 재료 값, 회화 3단계 단원 1)", () => {
    expect(setup.materials.level).toBe(3);
    expect(setup.materials.unit).toBe(1);
    expect(setup.materials.teacher.nameEn).toBe("Mina");
    for (const arm of ["Q", "QP"] as const) {
      const want = BRIEF_SYSTEM.replaceAll("{TEACHER}", "Mina").replace(
        "{LANGUAGE}",
        BRIEF_LANGUAGE[arm],
      );
      expect(setup.qSystems[arm]).toBe(want);
      expect(
        qSystemOf({
          teacherName: setup.materials.teacher.nameEn,
          unitWords: setup.materials.ctx.unitWords,
          arm,
        }),
      ).toBe(want);
    }
  });

  it("두 방식은 '말하는 범위' 문단만 다르다", () => {
    const q = setup.qSystems.Q.split("\n");
    const qp = setup.qSystems.QP.split("\n");
    expect(q).toHaveLength(qp.length);
    const differ = q.flatMap((line, i) => (line === qp[i] ? [] : [i]));
    expect(differ).toHaveLength(1);
    const at = differ[0] as number;
    expect(q[at]).toBe(`How you speak: ${BRIEF_LANGUAGE.Q}`);
    expect(qp[at]).toBe(`How you speak: ${BRIEF_LANGUAGE.QP}`);
  });

  it("응답 형식은 say · say_ko · listen_sentence · wrap_up(참 · 거짓) 네 칸뿐이다", () => {
    expect(Object.keys(QOutputSchema.shape)).toEqual([
      "say",
      "say_ko",
      "listen_sentence",
      "wrap_up",
    ]);
    expect(
      QOutputSchema.safeParse({
        say: "Hi!",
        say_ko: "안녕!",
        listen_sentence: "",
        wrap_up: "no",
      }).success,
    ).toBe(false);
  });

  it("사용자 메시지 꼴: 아이가 말함 · '잘 모르겠어요' 단추 · 말 없음 · 더 이야기하기", () => {
    expect(qChildMessageOf("speak", "I got big egg!")).toBe(
      'Child (speech-to-text): "I got big egg!"',
    );
    expect(qChildMessageOf("dont_know", "")).toBe(
      '(The child pressed the "I don\'t know" button.)',
    );
    expect(qChildMessageOf("silent", "")).toBe("(The child said nothing.)");
    expect(Q_MORE_MESSAGE).toBe("(The child chose to talk more.)");
  });
});

describe("방식 Q · Q+ 수업 하나(가짜 client)", () => {
  it("차례마다 보내는 사용자 메시지는 다섯 꼴뿐이고, 지난 메시지를 고쳐 쓰지 않으며, 호출 값은 다른 방식과 같다", async () => {
    for (const arm of ["Q", "QP"] as const) {
      const { run, requests } = await wrapLesson(arm);
      expect(run.error).toBeNull();
      const teacherReqs = requests.filter((b) => !isChild(b));
      expect(teacherReqs.map(lastUser)).toEqual([
        C_START_MESSAGE,
        'Child (speech-to-text): "Roblox!"',
        '(The child pressed the "I don\'t know" button.)',
        "(The child said nothing.)",
        'Child (speech-to-text): "Dragon!"',
        "(The child chose to talk more.)",
        'Child (speech-to-text): "It is pink!"',
      ]);
      // 지난 메시지를 고쳐 쓰지 않음: 앞 요청 messages + 앞 응답 원문 = 이번 요청의 앞부분
      const calls = lessonOfRun(run).calls.filter((c) => c.kind === "turn");
      expect(calls).toHaveLength(teacherReqs.length);
      for (let k = 1; k < calls.length; k++) {
        const prev = calls[k - 1];
        const now = calls[k];
        if (!prev || !now) throw new Error("호출 없음");
        expect((now.request.messages as unknown[]).slice(0, -1)).toEqual([
          ...(prev.request.messages as unknown[]),
          { role: "assistant", content: prev.response.text },
        ]);
      }
      // 안내문은 수업 내내 하나, 모델 · 최대 토큰 · 생각 · 추론 수준은 다른 방식(틀 요청)과 같다
      expect(new Set(teacherReqs.map((b) => String(b.system)))).toEqual(
        new Set([setup.qSystems[arm]]),
      );
      const tpl = setup.template.body;
      for (const b of teacherReqs) {
        expect(b.model).toBe(tpl.model);
        expect(b.max_tokens).toBe(tpl.max_tokens);
        expect(b.thinking).toEqual(tpl.thinking);
        expect((b.output_config as { effort?: unknown }).effort).toEqual(
          (tpl.output_config as { effort?: unknown }).effort,
        );
        const schema = (
          b.output_config as {
            format: {
              schema: { properties: Record<string, unknown> };
            };
          }
        ).format.schema;
        expect(Object.keys(schema.properties)).toEqual([
          "say",
          "say_ko",
          "listen_sentence",
          "wrap_up",
        ]);
      }
      // 아이가 들은 말은 say 그대로(앱의 후처리 없음)
      const childReqs = requests.filter((b) => isChild(b) && !isButtons(b));
      expect(lastUser(childReqs[0] ?? {})).toBe(
        "Teacher: Hi! What is fun for you?",
      );
      const teachers = lessonOfRun(run).teachers;
      for (const t of teachers) {
        expect(t.final).toBe((t.modelFirst as { say: string }).say);
        expect(t.branches).toEqual(["그대로 나감"]);
        expect(t.firstSentence?.from).toBe("stream");
        expect(t.firstSent?.held).toBeNull();
      }
    }
  });

  it("wrap_up 이 참이면 두 단추를 내고, '더 이야기하기'면 잇고 '그만하기'면 끝낸다(선생님이 스스로 마무리함)", async () => {
    const { run, requests } = await wrapLesson("Q");
    const lesson = lessonOfRun(run);
    expect(lesson.meta.childTurns).toBe(5);
    expect(lesson.meta.ending?.how).toBe("teacher_closing");
    expect(lesson.meta.ending?.line).toBe("Pink! Me too. See you!");
    expect(lesson.meta.ending?.choices).toMatchObject([
      { childTurn: 5, kind: "wrap_up", picked: "more", continued: true },
      { childTurn: 6, kind: "wrap_up", picked: "stop", continued: false },
    ]);
    // 단추 차례의 아이 역 호출은 지금 도구의 두 단추 고르기(선생님 말 + 단추 안내) 그대로
    const buttons = requests.filter(isButtons);
    expect(buttons).toHaveLength(2);
    expect(lastUser(buttons[0] ?? {})).toContain(
      "Teacher: A dragon! So fun. Bye for now?",
    );
    // 이은 차례는 afterChoice 로 남고, 그 뒤 아이 차례가 그 말을 듣는다
    const cont = lesson.teachers.find((t) => t.afterChoice === true);
    expect(cont?.childTurn).toBe(5);
    expect(cont?.final).toBe("Yay! Tell me more.");
    expect(lesson.children.find((c) => c.childTurn === 5)?.heardTeacher).toBe(
      "Yay! Tell me more.",
    );
  });

  it("대화 기록에 listen_sentence 를 낸 차례와 wrap_up 차례가 드러나고, '말했다' 셈은 listen_sentence 를 따라 할 문장으로 쓴다", async () => {
    const { run } = await wrapLesson("QP");
    const md = transcriptOf(run.lines);
    expect(md).toContain("- 방식 QP · 아이 SA");
    expect(md).toContain('- 따라 할 문장(listen_sentence): "I got a big egg."');
    expect(md).toContain("- wrap_up: 참(선생님이 마무리를 꺼냄)");
    expect(md).toContain("- 잡음: 넣지 않음");
    expect(md).toContain("선생님의 마무리(wrap_up)");
    const lesson = lessonOfRun(run);
    const t3 = lesson.teachers.find(
      (t) => t.childTurn === 3 && t.afterChoice !== true,
    );
    if (!t3) throw new Error("차례 없음");
    expect(followSentenceOf(t3)).toBe("I got a big egg.");
    const rows = saidRowsOf([lesson], {
      unitWords: setup.materials.ctx.unitWords,
      lemmaOf: setup.materials.lemmaOf,
      homophones: setup.materials.homophones,
    });
    expect(saidMarkdownOf(rows).join("\n")).toContain("| QP | 1 |");
    // 앱의 개입이 없는 칸은 0
    const m = armMetricsOf("QP", [lesson]);
    expect(m.intervention.changedTurns).toBe(0);
    expect(m.ending.teacher_closing).toBe(1);
    // 기록에서 다시 센 확인: 안내문 하나 · 메시지 꼴 · 지난 메시지 그대로 · 최종 말 = say
    const c = qChecksOf([lesson]);
    expect(c.QP).toMatchObject({
      systems: 1,
      messageOk: 7,
      messageAll: 7,
      keptOk: 6,
      keptAll: 6,
      sayOk: 7,
      sayAll: 7,
    });
  });
});

describe("시나리오 아이 역 여섯(SA~SF)", () => {
  it("아이 역 글은 지금 머리 뒤에 브리프 글 그대로 붙고, --children 으로 고를 수 있다(K1~K3 은 그대로 기본)", () => {
    expect([...SCENARIO_CHILDREN]).toEqual([
      "SA",
      "SB",
      "SC",
      "SD",
      "SD2",
      "SE",
      "SF",
    ]);
    for (const k of SCENARIO_CHILDREN)
      expect(childSystemOf(k)).toBe(`${CHILD_HEADER}\n\n${BRIEF_PERSONAS[k]}`);
    const args = parseRunArgs([
      "--out",
      "x",
      "--arms",
      "A,N,Q,QP",
      "--children",
      "SA,SB,SC,SD,SE,SF",
      "--seeds",
      "1",
      "--turns",
      "15",
    ]);
    expect(args.arms).toEqual(["A", "N", "Q", "QP"]);
    expect(args.children).toEqual(["SA", "SB", "SC", "SD", "SE", "SF"]);
    expect(args.seeds).toEqual([1]);
    expect(args.turns).toBe(15);
    expect(parseRunArgs(["--out", "x"]).children).toEqual(["K1", "K2", "K3"]);
    expect(() => parseRunArgs(["--out", "x", "--children", "SZ"])).toThrow();
  });

  it("잡음은 SC · SD 에만 지금 일정으로 넣고(K1~K3 은 그대로), 수업 설정 줄에 남는다", async () => {
    const all: ChildKey[] = ["K1", "K2", "K3", ...SCENARIO_CHILDREN];
    expect(all.filter(childHasNoise)).toEqual(["K1", "K2", "K3", "SC", "SD"]);
    for (const child of ["SA", "SC", "SD", "SE"] as const) {
      const { client } = fakeClient((body) =>
        isChild(body)
          ? JSON.stringify({
              action: "speak",
              says: "Dog.",
              kind: "answer",
              why: "짧게",
            })
          : say("Nice!"),
      );
      const run = await runLesson(setup, client, "Q", child, 1, 5, 1);
      const lesson = lessonOfRun(run);
      const noisy = lesson.children.filter((c) => c.noise !== null);
      const on = child === "SC" || child === "SD";
      expect(lesson.meta.noise).toBe(on);
      // 씨앗 1 의 잡음 차례는 4(지금 일정)
      expect(noisy.map((c) => c.childTurn)).toEqual(on ? [4] : []);
      if (on) expect(noisy[0]?.heard).toBe("Dock.");
      expect(transcriptOf(run.lines)).toContain(
        on ? "- 잡음: 넣음(지금 일정)" : "- 잡음: 넣지 않음",
      );
    }
  });

  it("시나리오마다 방식을 나란히 읽는 글: 아이 차례 번호별로 방식마다 아이의 말(들린 글)과 선생님 말을 따로 적는다", async () => {
    const lessons = [
      lessonOfRun((await wrapLesson("Q")).run),
      lessonOfRun((await wrapLesson("QP")).run),
    ];
    const md = scenarioMarkdownOf("SA", lessons);
    expect(md).toContain("# 시나리오 SA(아이가 새로운 이야기를 꺼냄)");
    expect(md).toContain("## 씨앗 1");
    expect(md).toContain("| 차례 | Q | Q+ |");
    expect(md).toContain('아이: "Roblox!"');
    expect(md).toContain("→ 선생님: Roblox! Wow, I love games too.");
    expect(md).toContain('[따라 할 문장] "I got a big egg."');
    expect(md).toContain("[wrap_up]");
    expect(md).toContain("[단추: 더 이야기하기]");
    expect(md).toContain("[단추: 그만하기]");
    // 다른 시나리오의 수업은 섞지 않는다
    expect(scenarioMarkdownOf("SB", lessons)).toContain(
      "(이 시나리오의 수업이 없음)",
    );
  });
});
