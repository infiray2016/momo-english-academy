// 회화 실험 도구의 빈틈 둘(13절 C243 보완 10 (3) — task-g-tools, 장부 T-588 · T-581): (1) 아이 역의 한국어 설명(why)이 깨진 차례를 다음 아이 역
// 호출의 앞 기록에 '(설명 없음)'으로 바꿔 싣고 깨진 수를 실행 기록에 남긴다 (2) 가린 기록의 '(말 없음)'을 누르지 않음 · 눌렀으나 들리지 않음으로
// 가르되 방식 표지 없이 같은 글로 적는다. 깨진 예는 지난 실행 기록(docs/research 2026-11-13 · 2026-11-16 의 runs/*.jsonl)의 아이 역 why 를
// 그대로 옮겼다(유니코드 이스케이프). 네트워크를 쓰지 않는다(가짜 client).
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import {
  CHILD_WHY_NONE,
  childHistoryTextOf,
  childWhyBrokenOf,
} from "../../scripts/exp/arch-arms";
import {
  type ChatChildLog,
  type ChildTurnLog,
  childWhyBrokenOfRun,
  type LessonLog,
  runLesson,
  setupOf,
  type TeacherTurnLog,
  transcriptOf,
} from "../../scripts/exp/arch-compare";
import {
  SILENT_LABEL,
  SILENT_NOSPEECH_LABEL,
  SILENT_QUIET_LABEL,
  silentInputOf,
} from "../../scripts/exp/arch-metrics";
import {
  blindLessonMarkdownOf,
  blindOf,
  blindSilentSplitOf,
} from "../../scripts/exp/arch-report";

// ── 지난 기록의 깨진 예 · 정상 예 ───────────────────────────────────

/** 깨진 예(지난 실행의 아이 역 why — 한글 UTF-8 바이트를 한 바이트 글자표로 읽은 꼴 다섯 가지). */
const BROKEN_WHYS = {
  // 이야기 방식 고친 뒤 실행 CHAT-SE-s1 아이 차례 1(앞 기록 없음 — 첫 아이 역 호출부터 깨짐)
  latinCe:
    "\u011b\u00b8\u011b\u0179\u011b \u00ed\u0119\u0142  \u00eb\u00b0\u00eb\u0104 \u011b\u0119\u00b8\u00b0 \u011b\u00a4\u011b\u0165\u00a4 \u011b\u00b4\u011b\u017a\u0119\u00b8\u00b0\u00eb\u013d\u017a \u0119\u015f\u017a\u00eb\u00b4\u00eb\u0160\u00b0 \u011b \u011b\u00eb\u0119\u00b8\u00b0 \u011b\u00a7\u00eb\u0179\u00b8\u011b \u00ed\u00eb\u00a4",
  // 세 방식 비교 CHAT-SE-s1-long 아이 차례 1(타이 문자 꼴)
  thai: "\u0e4c\u0e03\u0e1c\u0e4b\u201e\u0e4a\u0e16\u0152\u0e4c\u201e \u0e4c\u017e\u0e01\u0e4a\u0e13  \u0e4c\u2039\u0e16\u0e4c\u2013\u0e14\u0e4c\u201e\u0153 \u0e4c\u0e16\u2022\u0e4a\u0e15\u0e0c \u0e4c\u0e14\u0e4c\u2022\u0e1c\u0e4a\u0e18\u0e10\u0e4b\u0e05\u0e1c \u0e4a\u0e1a\u0e1c\u0e4b\u201a\u0e14\u0e4a\u0e13  \u0e4c\u201e \u0e4c\u0192\u0e4b\u2039\u02dc\u0e4c\u2014\u0e4a\u0e12\u0152 \u0e4c\u0e07\u02c6\u0e4b\u0e0c\u0e18\u0e4d\u2022\u0e08",
  // 세 방식 비교 CHAT-SB-s1 아이 차례 1(맥 로만 꼴 — 낱말 사이 작은따옴표가 섞임)
  macRoman:
    "\u00cc\u00e8\u00ac\u00cc\u00f5\u00fa \u00cf\u00f9\u00ba\u00cb\u00ec\u00d1 \u00cf\u00f9\u00c4\u00cf\u00c7\u00a8\u00cf\u00f4\u00c4 '\u00cd\u220f\u221e\u00ce\u2202\u00d1 \u00cf\u00a2\u00e3\u00cf\u00f9\u00e5'\u00cf\u00f9\u00d1 \u00cd\u221e\u00d1\u00ce\u00e3\u00ae\u00cc\u00fb\u00e0 \u00ce\u00e5\u00c4\u00ce\u00e3\u00b5\u00cc\u00ef\u00ae",
  // 세 방식 비교 CHAT-SB-s1 아이 차례 5(서유럽 꼴)
  latin1: "ì§ë¬¸ì ëµíê³  ì ìëê» ì ì§ë¬¸ì í¨",
  // 이야기 방식 마무리 고친 뒤 실행 CHAT-SE-s1-long 아이 차례 1(중동유럽 꼴 — 아스키 괄호 · 낱자가 섞임)
  latinCeParen:
    "\u011b\u00b8\u011b\u0179\u011b \u00ed\u0119\u0142  \u00eb\u00b0\u00eb\u0104 \u011b\u0119\u00b8\u00b0 \u011b\u0141\u017a\u011b (\u011b\u015b\u0119\u013e\u0179)\u00eb\u013d\u017a \u0119\u015f\u017a\u00eb\u00b4\u0119\u0142  \u011b \u011b\u00eb c\u011b\u00a7\u00eb\u0179\u00b8\u00ed\u00eb\u00a4",
  // 모델 비교 R3M-SD2-s2 아이 차례 1(발트 꼴)
  baltic: "ė¸ė¬ė„¼ ė¤ģ ė°ė¼ ź°ė¨ķź² ģøģ¬ķØ",
} as const;

/** 정상 예(지난 실행의 아이 역 why 그대로 — 따옴표 · 괄호 · 영어 낱말이 섞인 것 포함). */
const CLEAN_WHYS = [
  "'weekend'는 어렵지만 'Do you like'는 알아듣고 쉽게 '좋아요'라고 대답함",
  "차는지 잡는지 묻는 질문에 kick이라고 대답하고, 자기와 나비가 팀이라고 신나게 이어 감",
  "질문에 대답하고(고양이 없음, 강아지 있음), 선생님께 마인크래프트를 좋아하는지 물어봄",
  "선생님과 더 이야기하고 싶어서 '더 이야기하기' 버튼을 누름",
  "park는 아는 단어라서 짧게 대답함, 전치사 to를 빼먹는 초보 실수",
  "크기 질문에 'Small'로 대답하고 색깔도 덧붙인 뒤, 선생님께 아이스크림을 좋아하는지 물어봄",
  "단추",
  "",
];

describe("G (1) 아이 역 설명 깨짐 판단(arch-arms — 순수)", () => {
  it("G-1 지난 기록의 깨진 설명 다섯 꼴(중동유럽 · 타이 · 맥 로만 · 서유럽 · 발트)은 깨짐으로 본다", () => {
    for (const why of Object.values(BROKEN_WHYS))
      expect(childWhyBrokenOf(why)).toBe(true);
  });

  it("G-1 지난 기록의 정상 설명(영어 낱말 · 따옴표 · 괄호가 섞인 것 · 짧은 것 · 빈 것)은 깨짐으로 보지 않는다", () => {
    for (const why of CLEAN_WHYS) expect(childWhyBrokenOf(why)).toBe(false);
  });

  it("G-1 앞 기록에 실을 글: 정상이면 응답 글을 글자까지 그대로, 깨졌으면 설명 칸만 '(설명 없음)'으로 바꾼다(다른 칸 · 칸 차례는 그대로)", () => {
    const clean = `{"action":"speak","says":"Hi teacher!","kind":"answer","why":"${CLEAN_WHYS[0]}"}`;
    expect(childHistoryTextOf(clean)).toEqual({
      text: clean,
      whyBroken: false,
    });
    const broken = JSON.stringify({
      action: "speak",
      says: "Hi teacher! You like soccer?",
      kind: "own_topic",
      why: BROKEN_WHYS.latinCe,
      wrap_choice: "more",
    });
    const kept = childHistoryTextOf(broken);
    expect(kept.whyBroken).toBe(true);
    expect(kept.text).toBe(
      JSON.stringify({
        action: "speak",
        says: "Hi teacher! You like soccer?",
        kind: "own_topic",
        why: CHILD_WHY_NONE,
        wrap_choice: "more",
      }),
    );
    expect(CHILD_WHY_NONE).toBe("(설명 없음)");
  });

  it("G-1 읽지 못하는 글 · 설명 칸이 없는 글은 그대로 두고 깨짐으로 세지 않는다", () => {
    for (const text of ["not json", "[1,2]", '{"action":"speak"}'])
      expect(childHistoryTextOf(text)).toEqual({ text, whyBroken: false });
  });
});

// ── 가짜 client(흘려 받기 꼴) ─────────────────────────────────────

const CHILD_ROLE_MARK = "You are role-playing a Korean elementary school child";
const BUTTONS_MARK = "Now the screen shows two buttons";

type FakeBody = {
  model?: string;
  system?: unknown;
  messages?: { role: string; content: string }[];
  output_config?: unknown;
};

function* chunks(text: string, size: number) {
  for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size);
}

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
const schemaOf = (body: FakeBody) => JSON.stringify(body.output_config ?? {});
const isChild = (body: FakeBody) =>
  String(body.system).includes(CHILD_ROLE_MARK);

/** 아이 역 응답: 차례마다 정한 설명(whys[n] — 모자라면 마지막 것), 단추 차례는 '그만하기'. */
function childReplyOf(whys: readonly string[]) {
  let at = 0;
  return (body: FakeBody): string => {
    const why = whys[Math.min(at, whys.length - 1)] ?? "";
    at++;
    const buttons = lastUser(body).includes(BUTTONS_MARK);
    return JSON.stringify({
      action: "speak",
      says: buttons ? "" : "I like cats.",
      kind: "answer",
      why,
      ...(buttons ? { wrap_choice: "stop" } : {}),
    });
  };
}

const lessonMeta = (lines: readonly { type: string }[]) =>
  lines.find((l): l is LessonLog => l.type === "lesson");

/** 아이 역 요청이 앞 기록으로 실은 아이 역 응답 글(assistant 칸). */
const childHistoryOf = (requests: readonly FakeBody[]) =>
  requests
    .filter(isChild)
    .map((b) =>
      (b.messages ?? [])
        .filter((m) => m.role === "assistant")
        .map((m) => m.content),
    );

describe("G (1) 깨진 설명이 다음 아이 역 호출로 이어지지 않음(가짜 client 로 수업 하나)", () => {
  const setup = setupOf(process.cwd());
  const cTeacher = () =>
    JSON.stringify({ say: "Nice! What do you like?", say_ko: "좋아!" });

  it("G-1 방식 C: 깨진 설명은 다음 아이 역 요청의 앞 기록에 '(설명 없음)'으로 실리고, 정상 설명은 응답 글 그대로 실린다. 수업 요약 · 대화 기록에 깨진 수가 남는다", async () => {
    const whys = [BROKEN_WHYS.latinCe, CLEAN_WHYS[1] as string, "끝"];
    const child = childReplyOf(whys);
    const { client, requests } = fakeClient((body) =>
      isChild(body) ? child(body) : cTeacher(),
    );
    const run = await runLesson(setup, client, "C", "K1", 1, 3, 1);
    expect(run.error).toBeNull();
    const history = childHistoryOf(requests);
    expect(history).toHaveLength(3);
    // 둘째 아이 역 요청: 첫 응답(깨짐)이 설명 없음으로 실림
    expect(history[1]).toHaveLength(1);
    expect(history[1]?.[0]).toContain(`"why":"${CHILD_WHY_NONE}"`);
    expect(history[1]?.[0]).not.toContain(BROKEN_WHYS.latinCe);
    expect(JSON.parse(history[1]?.[0] ?? "{}").says).toBe("I like cats.");
    // 셋째 아이 역 요청: 둘째 응답(정상)은 응답 글 그대로
    expect(history[2]?.[1]).toBe(
      JSON.stringify({
        action: "speak",
        says: "I like cats.",
        kind: "answer",
        why: whys[1],
      }),
    );
    // 기록에는 아이 역이 낸 설명 원문이 그대로 남는다(바꾸는 것은 다음 호출에 싣는 글뿐)
    const children = run.lines.filter(
      (l): l is ChildTurnLog => l.type === "child_turn",
    );
    expect(children[0]?.why).toBe(BROKEN_WHYS.latinCe);
    expect(lessonMeta(run.lines)?.childWhy).toEqual({ broken: 1, turns: [1] });
    expect(childWhyBrokenOfRun(run)).toBe(1);
    expect(transcriptOf(run.lines)).toContain(
      "- 아이 역 설명 깨짐: 1번(아이 차례 1) — 다음 아이 역 호출의 앞 기록에는 '(설명 없음)'으로 실음",
    );
  });

  it("G-1 깨짐이 없는 수업은 앞 기록이 응답 글과 글자까지 같고(아이 역 행동을 바꾸지 않음), 수업 요약에 0 이 남으며 대화 기록에 줄이 붙지 않는다", async () => {
    const texts: string[] = [];
    let at = 0;
    const { client, requests } = fakeClient((body) => {
      if (!isChild(body)) return cTeacher();
      at++;
      const text = JSON.stringify({
        action: "speak",
        says: `Cat ${at}.`,
        kind: "answer",
        why: CLEAN_WHYS[at % CLEAN_WHYS.length],
      });
      texts.push(text);
      return text;
    });
    const run = await runLesson(setup, client, "C", "K1", 1, 3, 1);
    expect(run.error).toBeNull();
    const history = childHistoryOf(requests);
    expect(history.at(-1)).toEqual(texts.slice(0, -1));
    expect(lessonMeta(run.lines)?.childWhy).toEqual({ broken: 0, turns: [] });
    expect(childWhyBrokenOfRun(run)).toBe(0);
    expect(transcriptOf(run.lines)).not.toContain("아이 역 설명 깨짐");
  });

  it("G-1 옛 기록(수업 요약에 칸 없음)은 깨진 수 0 으로 읽는다", () => {
    expect(childWhyBrokenOfRun({ lines: [] })).toBe(0);
  });
});

describe("G (1) 방식 CHAT 수업에서도 같은 길(아이 역 호출 · 마무리 단추 호출)", () => {
  const lesson1 = setupOf(process.cwd(), { card: "lesson1" });

  it("G-1 CHAT SE 씨앗 1: 깨진 설명은 다음 아이 역 요청에 '(설명 없음)'으로 실리고 수업 요약에 깨진 수 · 차례가 남는다", async () => {
    let at = 0;
    const whys = [BROKEN_WHYS.thai, BROKEN_WHYS.macRoman, CLEAN_WHYS[2]];
    const { client, requests } = fakeClient((body) => {
      if (isChild(body)) {
        const buttons = lastUser(body).includes(BUTTONS_MARK);
        const why = whys[Math.min(at, whys.length - 1)] ?? "";
        at++;
        return JSON.stringify({
          action: "speak",
          says: buttons ? "" : "I like cats.",
          kind: "answer",
          why,
          ...(buttons ? { wrap_choice: "stop" } : {}),
        });
      }
      const schema = schemaOf(body);
      if (schema.includes('"hint_ko"'))
        return JSON.stringify({
          hint_ko: "좋아하는 것을 말해 봐요.",
          hint_en: "I like cats.",
          explain_ko: "선생님은 좋아하는 것을 물었어요.",
        });
      if (schema.includes('"teacher_move"'))
        return JSON.stringify({
          reading: "clear_answer",
          teacher_move: "react_and_follow_up",
          model_sentence: "",
          child_used_on_own: [],
        });
      return JSON.stringify({
        listen_sentence: "",
        say: "Nice! What do you like?",
        say_ko: "좋아! 뭘 좋아해?",
        wrap_up: false,
      });
    });
    const run = await runLesson(lesson1, client, "CHAT", "SE", 1, 3, 1);
    expect(run.error).toBeNull();
    const history = childHistoryOf(requests);
    expect(history.length).toBe(3);
    const last = history.at(-1) ?? [];
    expect(last[0]).toContain(`"why":"${CHILD_WHY_NONE}"`);
    expect(last[1]).toContain(`"why":"${CHILD_WHY_NONE}"`);
    for (const t of last) {
      expect(t).not.toContain(BROKEN_WHYS.thai);
      expect(t).not.toContain(BROKEN_WHYS.macRoman);
    }
    expect(lessonMeta(run.lines)?.childWhy).toEqual({
      broken: 2,
      turns: [1, 2],
    });
    expect(childWhyBrokenOfRun(run)).toBe(2);
  });
});

// ── (2) 가린 기록의 말없음 두 갈래 ────────────────────────────────

const FIT = {
  sentences: 1,
  overSentenceMax: false,
  longSentences: [],
  offbandWords: [],
  offbandForms: [],
};

function tLine(
  lesson: string,
  arm: TeacherTurnLog["arm"],
  childTurn: number,
  final: string,
): TeacherTurnLog {
  return {
    type: "teacher_turn",
    lesson,
    arm,
    childTurn,
    called: childTurn > 0,
    modelFirst: null,
    modelFirstSpoken: final,
    directive: null,
    checks: null,
    retry: null,
    changes: { deleted: [], added: [] },
    final,
    branches: ["그대로 나감"],
    levelFit: FIT,
    calls: childTurn > 0 ? 1 : 0,
    ms: 900,
    firstMs: 900,
  };
}

function cLine(
  lesson: string,
  childTurn: number,
  action: ChildTurnLog["action"],
  chat?: Partial<ChatChildLog>,
): ChildTurnLog {
  return {
    type: "child_turn",
    lesson,
    childTurn,
    heardTeacher: "",
    action,
    says: action === "speak" ? "Cat." : "",
    kind: action === "speak" ? "answer" : "stuck",
    why: "",
    heard: action === "speak" ? "Cat." : null,
    noise: null,
    noiseSkipped: false,
    ...(chat === undefined
      ? {}
      : {
          chat: {
            input: "say",
            hintTier: 0,
            hint: null,
            recognizer: null,
            waited: false,
            ...chat,
          },
        }),
  };
}

function meta(lesson: string, arm: LessonLog["arm"], turns: number): LessonLog {
  return {
    type: "lesson",
    lesson,
    arm,
    child: "SG",
    seed: 1,
    turnsAsked: 16,
    childTurns: turns,
    ended: null,
    attempt: 1,
    failures: [],
    startedAt: "2026-11-17T00:00:00.000Z",
    finishedAt: "2026-11-17T00:01:00.000Z",
  };
}

/** 수업 하나: 처음 말 + 아이 차례마다 선생님 말 하나. */
function lessonOf(
  name: string,
  arm: LessonLog["arm"],
  children: ChildTurnLog[],
) {
  return {
    meta: meta(name, arm, children.length),
    teachers: [
      tLine(name, arm, 0, "Hi!"),
      ...children.map((c) =>
        tLine(name, arm, c.childTurn, `Reply ${c.childTurn}.`),
      ),
    ],
    children,
  };
}

const saidLines = (md: string) =>
  md.split("\n").filter((l) => l.startsWith("- 아이가 하려던 말:"));

describe("G (2) 가린 기록의 '(말 없음)' 두 갈래(누르지 않음 · 눌렀으나 들리지 않음 — 방식 표지 없이 같은 글)", () => {
  it("G-2 글은 아홉 관점 사례 칸(arch-metrics childSaidOf)과 같은 두 갈래 글이다", () => {
    expect(SILENT_QUIET_LABEL).toBe("(말 없음 — 누르지 않음)");
    expect(SILENT_NOSPEECH_LABEL).toBe("(말 없음 — 눌렀으나 들리지 않음)");
    expect(SILENT_LABEL).toBe("(말 없음)");
  });

  it("G-2 CHAT: 누르지 않음(조용함 입구) · 눌렀으나 들리지 않음 · 힌트를 누른 말없음(들리지 않음)을 갈라 적고, 힌트 · 조용함 같은 방식 낱말은 적지 않는다", () => {
    const G = "CHAT-SG-s1";
    const md = blindLessonMarkdownOf(
      "T01",
      lessonOf(G, "CHAT", [
        cLine(G, 1, "silent", { input: "quiet" }),
        cLine(G, 2, "silent", { input: "nospeech" }),
        cLine(G, 3, "silent", { input: "nospeech", hintTier: 1 }),
        cLine(G, 4, "dont_know", { input: "dont_know" }),
        cLine(G, 5, "speak", { input: "say" }),
      ]),
      { splitSilent: true },
    );
    expect(saidLines(md)).toEqual([
      `- 아이가 하려던 말: ${SILENT_QUIET_LABEL}`,
      `- 아이가 하려던 말: ${SILENT_NOSPEECH_LABEL}`,
      `- 아이가 하려던 말: ${SILENT_NOSPEECH_LABEL}`,
      "- 아이가 하려던 말: ('잘 모르겠어요' 단추)",
      '- 아이가 하려던 말: "Cat."',
    ]);
    for (const s of ["CHAT", G, "힌트", "조용함", "quiet", "nospeech"])
      expect(md).not.toContain(s);
  });

  it("G-2 방식 N(앱이 '들리지 않음'으로 받은 말없음)은 CHAT 의 눌렀으나 들리지 않음과 글자까지 같은 글이다", () => {
    const N = "N-SG-s1";
    const C = "CHAT-SG-s1";
    const nMd = blindLessonMarkdownOf(
      "T02",
      lessonOf(N, "N", [cLine(N, 1, "silent")]),
      { splitSilent: true },
    );
    const cMd = blindLessonMarkdownOf(
      "T02",
      lessonOf(C, "CHAT", [cLine(C, 1, "silent", { input: "nospeech" })]),
      { splitSilent: true },
    );
    expect(saidLines(nMd)).toEqual([
      `- 아이가 하려던 말: ${SILENT_NOSPEECH_LABEL}`,
    ]);
    expect(nMd).toBe(cMd);
  });

  it("G-2 방식 R3(선생님이 '아무 말도 안 함'으로만 받아 갈래가 없는 말없음)은 지난 글 '(말 없음)' 그대로다", () => {
    const R = "R3-SG-s1";
    const md = blindLessonMarkdownOf(
      "T03",
      lessonOf(R, "R3", [cLine(R, 1, "silent"), cLine(R, 2, "speak")]),
      { splitSilent: true },
    );
    expect(saidLines(md)).toEqual([
      `- 아이가 하려던 말: ${SILENT_LABEL}`,
      '- 아이가 하려던 말: "Cat."',
    ]);
    expect(md).not.toContain("R3");
  });

  it("G-2 말없음의 갈래(silentInputOf): CHAT 은 기록한 입력, A · B · N 은 들리지 않음, 그 밖(C · C2 · P · Q 무리)은 갈래 없음, 말한 차례는 갈래 없음", () => {
    const L = "x";
    expect(
      silentInputOf(cLine(L, 1, "silent", { input: "quiet" }), "CHAT"),
    ).toBe("quiet");
    expect(
      silentInputOf(cLine(L, 1, "silent", { input: "nospeech" }), "CHAT"),
    ).toBe("nospeech");
    for (const arm of ["A", "B", "N"] as const)
      expect(silentInputOf(cLine(L, 1, "silent"), arm)).toBe("nospeech");
    for (const arm of [
      "C",
      "C2",
      "P",
      "Q",
      "QP",
      "R",
      "R2",
      "R3",
      "R3M",
      "R3O",
    ] as const)
      expect(silentInputOf(cLine(L, 1, "silent"), arm)).toBeNull();
    expect(silentInputOf(cLine(L, 1, "speak"), "N")).toBeNull();
    expect(silentInputOf(cLine(L, 1, "dont_know"), "CHAT")).toBeNull();
  });

  it("G-2 방식이 둘 이상 섞인 가린 묶음은 갈래를 적지 않는다(blindSilentSplitOf — 갈래 글이 방식 표지가 되지 않게, C243 보완 10 (3) 해석)", () => {
    const armOnly = (arm: "CHAT" | "N" | "R3") => ({ meta: { arm } }) as never;
    expect(blindSilentSplitOf([armOnly("CHAT"), armOnly("CHAT")])).toBe(true);
    expect(blindSilentSplitOf([armOnly("R3")])).toBe(true);
    expect(blindSilentSplitOf([armOnly("CHAT"), armOnly("R3")])).toBe(false);
    expect(blindSilentSplitOf([armOnly("CHAT"), armOnly("N")])).toBe(false);
    const G = "CHAT-SG-s1";
    const md = blindLessonMarkdownOf(
      "T01",
      lessonOf(G, "CHAT", [
        cLine(G, 1, "silent", { input: "quiet" }),
        cLine(G, 2, "silent", { input: "nospeech", hintTier: 1 }),
      ]),
      { splitSilent: false },
    );
    expect(saidLines(md)).toEqual([
      `- 아이가 하려던 말: ${SILENT_LABEL}`,
      `- 아이가 하려던 말: ${SILENT_LABEL}`,
    ]);
  });

  it("G-2 splitSilent 를 주지 않으면 갈래를 적지 않는다(지난 글 — 검토 rev-g-tools M2)", () => {
    const G = "CHAT-SG-s1";
    const md = blindLessonMarkdownOf(
      "T01",
      lessonOf(G, "CHAT", [cLine(G, 1, "silent", { input: "quiet" })]),
    );
    expect(saidLines(md)).toEqual([`- 아이가 하려던 말: ${SILENT_LABEL}`]);
  });

  it("G-2 blindOf 는 묶음 전체로 정한 값을 넘긴다: 방식이 섞이면 모두 '(말 없음)', 하나뿐이면 가른다(검토 rev-g-tools M3)", () => {
    const written = (lessons: Parameters<typeof blindOf>[1]) => {
      const dir = mkdtempSync(join(tmpdir(), "g2-blind-"));
      try {
        blindOf(dir, lessons);
        return readdirSync(join(dir, "blind"))
          .sort()
          .flatMap((f) =>
            saidLines(readFileSync(join(dir, "blind", f), "utf8")),
          );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    };
    const C = "CHAT-SG-s1";
    const R = "R3-SG-s1";
    const chat = {
      name: C,
      calls: [],
      ...lessonOf(C, "CHAT", [cLine(C, 1, "silent", { input: "quiet" })]),
    };
    const r3 = {
      name: R,
      calls: [],
      ...lessonOf(R, "R3", [cLine(R, 1, "silent")]),
    };
    expect(written([chat, r3])).toEqual([
      `- 아이가 하려던 말: ${SILENT_LABEL}`,
      `- 아이가 하려던 말: ${SILENT_LABEL}`,
    ]);
    expect(written([chat])).toEqual([
      `- 아이가 하려던 말: ${SILENT_QUIET_LABEL}`,
    ]);
  });
});

describe("검토 rev-g-tools M1 — 그림 글자가 든 정상 설명은 깨짐이 아니다", () => {
  it("이모지 · 피부색 꾸밈 · 이음 글자가 섞인 짧은 설명을 깨짐으로 잡지 않고, 지난 깨진 예는 그대로 잡는다", () => {
    for (const why of [
      "응 😊",
      "좋아요 👍🏻",
      "고양이 🐈‍⬛ 좋아",
      "❤️ 재밌어요",
    ])
      expect(childWhyBrokenOf(why)).toBe(false);
    for (const why of Object.values(BROKEN_WHYS))
      expect(childWhyBrokenOf(why)).toBe(true);
  });
});
