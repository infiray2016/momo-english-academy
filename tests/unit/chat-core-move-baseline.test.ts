// 이야기 방식 서버 배선을 core 로 옮긴 것의 기준 파일 대조(13절 C243 보완 10 (1)). 기준 파일 tests/fixtures/chat-core-move-baseline/baseline.json 은
// 옮기기 전 판(2433e9c)의 서버 함수(server/ai/talk.ts · server/conversation/index.ts · chat-hint.ts · chat-eval.ts)로 만든 값이다. 재료는 대본
// 도구 짝 시험(talk-observe-parity 'AC-27r 서버 배선 사본이 서버 export 와 같다' · 'M-2 직접 맞대지 않던 사본' · 'M-2 이어진 막힘의 힌트 칸')의
// 수업 행과 그 재료에 없던 갈래를 손으로 만든 행(토막 거름 · 같은 차례 번호 · 기록 글 꼴 · 입력 갈래 · 지운 표지)이다. 옮긴 core 함수에 같은 재료를
// 넣어 JSON 글자까지 같은지 본다 — 이야기 방식 길의 동작이 바뀌지 않았다는 근거다(켜기 전 관문 (가)를 다시 돌리지 않는 조건).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { TalkChatInput } from "@/core/ai/calls/talk-chat";
import { talkChatHintSpec } from "@/core/ai/calls/talk-chat-hint";
import { createMasker } from "@/core/ai/mask";
import type { ChatEvalState } from "@/core/conversation/chat-judge";
import {
  CHAT_DIALOG_SEGMENTS,
  type ChatTurnRowLike,
  chatChildInputOf,
  chatDialogRowsOf,
  chatEvalEntriesOf,
  chatEvalFailureOf,
  chatEvalInputFor,
  chatEvalPendingOf,
  chatEvalStateOf,
  chatEvalWritesOf,
  chatHintInputOf,
  chatJudgeRowsOf,
  chatLessonSayLostOf,
  chatSaidSayLostOf,
  chatSaidSayOf,
  chatSayFromRowOf,
  levelCallSpecOf,
  levelInputOf,
} from "@/core/conversation/chat-rows";
import { lessonStartModeOf } from "@/core/conversation/chat-start";
import {
  chatListenCheckedOf,
  chatSayChangesOf,
  TALK_CHAT_READER_KEYS,
  talkChatSentUserMessageOf,
} from "@/core/conversation/chat-stream-check";
import {
  chatJudgeContextFrom,
  chatUnitWordsOf,
} from "@/core/conversation/chat-unit-words";
import { bandOf } from "@/core/seed/structure";
import { seedHomophones } from "@/server/seed-lists";
import {
  type Materials,
  materialsOf,
  readSeedFiles,
} from "../../scripts/talk-observe";
import {
  SAMPLE_CONTACT_PATTERNS,
  SAMPLE_NAMES,
} from "../fixtures/ai/sample-inputs";

const ROOT = process.cwd();

type Teacher = { chatPersonaEn?: string; chatFavoritesEn?: string } | null;
type SetBaseline = {
  rows: ChatTurnRowLike[];
  dialogIds: string[];
  perRow: unknown[];
  hint: { teacherRowId: string; out: unknown }[];
  evalInput: { childRowId: string; contextTurns: number; out: unknown }[];
  evalEntries: unknown;
  lessonSayLost: boolean;
  judgeRows: unknown;
  judgeRowsOverride: { id: string; out: unknown }[];
  writes: {
    childRowId: string;
    stateIndex: number;
    out: unknown;
    readBack: unknown[];
  }[];
};
const B = JSON.parse(
  readFileSync(
    `${ROOT}/tests/fixtures/chat-core-move-baseline/baseline.json`,
    "utf8",
  ),
) as {
  dialogSegments: string[];
  readerKeys: unknown;
  startMode: {
    args: {
      mode: "app" | "claude" | "chat";
      level: number;
      unit: number;
      teacher: string;
    };
    out: string;
  }[];
  startModeBlankTopic: string;
  startModeNoText: string;
  teachers: Record<string, Teacher>;
  listen: { args: { text: string; sentenceMaxWords: number }; out: string }[];
  sayChanges: {
    args: { say: string; safeLine: string; sentenceMaxWords: number };
    out: unknown;
  }[];
  sentUserMessage: { chatInput: TalkChatInput; out: string };
  sets: Record<string, SetBaseline>;
  failure: { reason: string; out: string }[];
  levelInputs: {
    input: object;
    level: number;
    sentenceMaxWords: number;
    out: unknown;
  }[];
  levelSpec: { keys: string[]; sameExceptMask: boolean; masked: unknown };
};

/** 글자까지 같음(JSON 글로 견줌 — 칸 차례 · 빠진 칸까지). */
const same = (actual: unknown, expected: unknown) =>
  expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));

function materialsAt(level: number): Materials {
  const m = materialsOf(readSeedFiles(ROOT, level, 1), {
    level,
    unit: 1,
    lesson: 1,
    teacher: "mina",
  });
  if (!m.ok) throw new Error(m.missing);
  return m.materials;
}
const M3 = materialsAt(3);
const VOCAB_ROWS = (
  JSON.parse(readFileSync(`${ROOT}/seed/vocab.json`, "utf8")) as {
    vocab: { word: string; forms: string[] }[];
  }
).vocab;
const sampleMasker = createMasker({
  names: SAMPLE_NAMES,
  isVocabWord: () => false,
  contactPatterns: SAMPLE_CONTACT_PATTERNS,
});
/** 기준 파일의 평가 상태 셋(생성기와 같은 차례). */
const STATES: ChatEvalState[] = [
  {
    status: "done",
    output: {
      reading: "clear_answer",
      teacher_move: "react_and_follow_up",
      model_sentence: "",
      child_used_on_own: ["soccer"],
    },
  },
  { status: "failed", failure: "timeout" },
  { status: "failed" },
];
const judgedJson = (j: ReturnType<typeof chatJudgeRowsOf>) => ({
  rows: j.rows,
  ids: j.ids,
  stored: [...j.stored.entries()],
});

describe("이야기 방식 서버 배선의 core 옮김(13절 C243 보완 10 (1)) — 옮기기 전 기준 파일과 글자까지 같다", () => {
  it("AC-27r 시작 방식(lessonStartModeOf): 방식 셋 × 1~5단계 × 단원 1~5 × 선생님(미나 · 레오 · 없음)과 단원 표 출처를 바꾼 꼴", () => {
    expect(B.startMode).toHaveLength(225);
    for (const { args, out } of B.startMode)
      expect(
        lessonStartModeOf({
          mode: args.mode,
          level: args.level,
          unit: args.unit,
          teacher: B.teachers[args.teacher] ?? null,
        }),
        JSON.stringify(args),
      ).toBe(out);
    expect(
      lessonStartModeOf({
        mode: "chat",
        level: 3,
        unit: 1,
        teacher: B.teachers.mina ?? null,
        leadText: () =>
          ({ chatTopicEn: "  " }) as unknown as ReturnType<
            NonNullable<Parameters<typeof lessonStartModeOf>[0]["leadText"]>
          >,
      }),
    ).toBe(B.startModeBlankTopic);
    expect(
      lessonStartModeOf({
        mode: "chat",
        level: 3,
        unit: 1,
        teacher: B.teachers.mina ?? null,
        leadText: () => null,
      }),
    ).toBe(B.startModeNoText);
  });

  it("AC-27r 흘려 받기: 흘려 받는 칸 이름 · 따라 할 문장 6.4 · 문장 문 짝 · 저장할 사용자 메시지", () => {
    same(TALK_CHAT_READER_KEYS, B.readerKeys);
    for (const { args, out } of B.listen)
      expect(
        chatListenCheckedOf(args.text, M3.forbidden, args.sentenceMaxWords),
      ).toBe(out);
    for (const { args, out } of B.sayChanges)
      same(
        chatSayChangesOf(args.say, {
          forbidden: M3.forbidden,
          metaPhrases: M3.metaPhrases,
          safeLine: args.safeLine,
          sentenceMaxWords: args.sentenceMaxWords,
        }),
        out,
      );
    expect(
      talkChatSentUserMessageOf(B.sentUserMessage.chatInput, sampleMasker),
    ).toBe(B.sentUserMessage.out);
  });

  it("AC-27r 수업 행 읽기 · 힌트 입력 · 평가 입력 · 판정 행 · 평가 쓰기(행 묶음 여섯: 짝 시험 재료 셋 · 손으로 만든 갈래 둘)", () => {
    same(CHAT_DIALOG_SEGMENTS, B.dialogSegments);
    const ctx = chatJudgeContextFrom(
      { card: M3.card, spec: { band: bandOf(3) }, teacher: M3.teacher },
      chatUnitWordsOf({
        unitWords: M3.ctx.unitWords,
        lemmaEntries: VOCAB_ROWS.filter((v) =>
          new Set(M3.ctx.unitWords).has(v.word),
        ),
      }),
      seedHomophones(),
    );
    expect(Object.keys(B.sets)).toEqual(["A", "B", "C", "E", "F"]);
    for (const [name, set] of Object.entries(B.sets)) {
      const { rows } = set;
      same(
        chatDialogRowsOf(rows).map((r) => r.id),
        set.dialogIds,
      );
      same(
        rows.map((row) => ({
          id: row.id,
          sayFromRow: chatSayFromRowOf(row),
          saidSayLost: chatSaidSayLostOf(row),
          saidSay: chatSaidSayOf(row),
          childInput: chatChildInputOf(row),
          evalState: chatEvalStateOf(row),
          evalPending: chatEvalPendingOf(row),
        })),
        set.perRow,
      );
      for (const h of set.hint)
        same(
          chatHintInputOf({
            rows,
            teacherRowId: h.teacherRowId,
            level: 3,
            sentenceMaxWords: M3.ctx.sentenceMaxWords,
            hintTiers: M3.spec.hintTiers,
            teacherNameEn: M3.teacher.nameEn,
          }),
          h.out,
        );
      for (const e of set.evalInput)
        same(
          chatEvalInputFor({
            rows,
            childRowId: e.childRowId,
            contextTurns: e.contextTurns,
            unitWords: M3.ctx.unitWords,
          }),
          e.out,
        );
      const entries = chatEvalEntriesOf(chatDialogRowsOf(rows));
      same(
        { entries: entries.entries, childAt: [...entries.childAt.entries()] },
        set.evalEntries,
      );
      expect(chatLessonSayLostOf(rows), name).toBe(set.lessonSayLost);
      same(
        judgedJson(chatJudgeRowsOf(rows, { band: bandOf(3) })),
        set.judgeRows,
      );
      for (const o of set.judgeRowsOverride)
        same(
          judgedJson(
            chatJudgeRowsOf(
              rows,
              { band: bandOf(3) },
              { id: o.id, state: STATES[0] as ChatEvalState },
            ),
          ),
          o.out,
        );
      for (const w of set.writes) {
        const out = chatEvalWritesOf({
          rows,
          childRowId: w.childRowId,
          state: STATES[w.stateIndex] as ChatEvalState,
          ctx,
        });
        same(out, w.out);
        same(
          (out ?? []).map((x) =>
            chatEvalStateOf({
              ...(rows.find((r) => r.id === x.id) as ChatTurnRowLike),
              chatJudge: x.judge,
            }),
          ),
          w.readBack,
        );
      }
    }
  });

  it("AC-27r 평가 실패 갈래 · 단계 맥락 칸(levelInputOf · levelCallSpecOf)", () => {
    for (const { reason, out } of B.failure)
      expect(chatEvalFailureOf(reason)).toBe(out);
    for (const x of B.levelInputs)
      same(
        levelInputOf(x.input, {
          level: x.level,
          sentenceMaxWords: x.sentenceMaxWords,
        }),
        x.out,
      );
    const spec = levelCallSpecOf(talkChatHintSpec);
    expect(Object.keys(spec).sort()).toEqual(B.levelSpec.keys);
    expect(
      Object.keys(talkChatHintSpec).every(
        (k) =>
          k === "mask" ||
          (spec as unknown as Record<string, unknown>)[k] ===
            (talkChatHintSpec as unknown as Record<string, unknown>)[k],
      ),
    ).toBe(B.levelSpec.sameExceptMask);
    const hintA = B.levelInputs[0];
    if (hintA === undefined) throw new Error("단계 맥락 재료 없음");
    same(spec.mask(hintA.out as never, sampleMasker), B.levelSpec.masked);
  });
});
