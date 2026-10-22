import { describe, expect, it } from "vitest";
import { buildReferenceIndex } from "@/core/seed/reference-index";
import type { ReadingLesson, WritingItem } from "@/core/seed/schema/lesson";
import type { CheckRecord } from "@/core/seed/schema/records";
import type { ModelPrice } from "@/core/seed/schema/reference";
import {
  buildCheckRecord,
  buildSolveRequest,
  COST_DECIMALS,
  costOf,
  interpretSolveMessage,
  judgeSolve,
  mergeCheckFile,
  priceOf,
  type SolveInterpretation,
  type SolveRequest,
  seedAnswerOf,
  selectSolveTargets,
  solveCallAccepted,
  solveUserMessage,
  TOKENS_PER_MTOK,
  withHumanDecisions,
} from "@/core/seed/solve-check";
import {
  AREAS,
  cellKey,
  checksFilePath,
  lessonFilePath,
} from "@/core/seed/structure";
import {
  cellHash,
  collectCells,
  itemsOf,
  type SeedCell,
  solveStatus,
  solveTargets,
} from "@/core/seed/validate";
import {
  type AnyLessonSample,
  defaultSettings,
  miniSeed,
  readingLesson,
  readingLevelTest,
  referenceSet,
  type SeedTree,
  seedTreeFiles,
  smallReferenceSet,
  speakingLesson,
  speakingPlacement,
  storyFile,
  talkLesson,
  writingLesson,
} from "../fixtures/seed/builders";
import {
  answerOutput,
  FAKE_USAGE,
  FAKE_WRONG_TEXT,
  type FakeBehavior,
  solveMessage,
} from "../fixtures/seed/fake-solver";

const ref = referenceSet(defaultSettings());
const { index } = buildReferenceIndex(ref);
/** 풀이 검사 조합(between_tools · low)을 받는 견본 단가 행(6.1 조합 표의 Sonnet). */
const solvePrice = (() => {
  const row = ref.modelPrices.models.find(
    (m) => m.thinkingOff === "between_tools" && m.effortDefault === "medium",
  );
  if (!row) throw new Error("견본 단가 행 없음");
  return row;
})();
const MODEL = solvePrice.model;
const AT = `${solvePrice.effectiveFrom}T00:00:00.000Z`;
const SOLVE_CALL = { thinking: "between_tools", effort: "low" } as const;

function lessonCell(sample: AnyLessonSample): SeedCell {
  const { area, level, unit, lesson } = sample;
  return {
    key: cellKey({
      type: "lesson",
      area,
      level,
      unit,
      kind: lesson.kind,
      lessonNo: lesson.lessonNo,
      variant: lesson.variant,
    }),
    kind: "lesson",
    area,
    value: lesson,
  };
}

function requestOf(cell: SeedCell): SolveRequest {
  const request = buildSolveRequest(cell, index);
  if (!request) throw new Error(`풀이 대상 없음: ${cell.key}`);
  return request;
}

/** 칸 하나를 가짜 응답으로 풀어 기록까지 만든다. */
function solveCell(
  cell: SeedCell,
  behavior?: FakeBehavior,
  previous?: CheckRecord,
): { record: CheckRecord; request: SolveRequest } {
  const request = requestOf(cell);
  const interpreted = interpretSolveMessage(
    solveMessage(answerOutput(cell, request, behavior), { model: MODEL }),
  );
  if (interpreted.kind === "failed") throw new Error(interpreted.reason);
  const judged = judgeSolve(cell, request, interpreted);
  if (!judged.ok) throw new Error(judged.reason);
  return {
    request,
    record: buildCheckRecord({
      request,
      items: judged.items,
      model: interpreted.model,
      usage: interpreted.usage,
      costUsd: costOf(interpreted.usage, solvePrice),
      at: AT,
      ...(previous ? { previous } : {}),
    }),
  };
}

/** 견본 칸 여럿(수업 · 단계 평가 · 배치 · 토리 이야기, 그림 · 듣기 · 쓰기 · 조립 포함). */
function sampleCells(): SeedCell[] {
  const test = readingLevelTest(ref);
  const testForm = test.forms[0];
  const testItem = testForm && "items" in testForm ? testForm.items[0] : null;
  const placement = speakingPlacement(ref);
  const placementEntry = placement.levels[0];
  const listening = placementEntry?.items.find((i) => i.type === "listening");
  const story = storyFile(ref, "1-3").stories[0];
  if (!testItem || !listening || !placementEntry || !story)
    throw new Error("견본 없음");
  return [
    lessonCell(readingLesson(ref, 1)),
    lessonCell(readingLesson(ref, 4)),
    lessonCell(writingLesson(ref, 1)),
    lessonCell(writingLesson(ref, 3)),
    lessonCell(speakingLesson(ref, 1)),
    {
      key: cellKey({
        type: "level-test",
        area: "reading",
        level: test.level,
        form: 1,
        no: testItem.no,
      }),
      kind: "test-item",
      area: "reading",
      value: testItem,
    },
    {
      key: cellKey({
        type: "placement",
        area: "speaking",
        level: placementEntry.level,
        form: placement.form,
        no: listening.no,
        spare: false,
      }),
      kind: "placement",
      area: "speaking",
      value: listening,
    },
    {
      key: cellKey({ type: "story", band: "1-3", no: story.no }),
      kind: "story",
      area: "talk",
      value: story,
    },
  ];
}

/** 쓰기 3단계 견본 수업의 첫 문항을 받아쓰기로 바꾼 칸(받아쓰기 · 조립이 함께 있는 칸). */
function dictationCell(): { cell: SeedCell; word: string } {
  const sample = writingLesson(ref, 3);
  const content = sample.lesson.content;
  if (content.shape !== "items") throw new Error("견본 꼴이 다르다");
  const word = sample.lesson.unitWords[0];
  if (!word) throw new Error("견본 단어 없음");
  const dictation: WritingItem = {
    type: "dictation",
    word,
    audioText: word,
    accepted: [word],
  };
  content.items = [dictation, ...content.items];
  return { cell: lessonCell(sample), word };
}

/** JSON 안의 모든 키와 글 값. */
function walk(value: unknown, keys: Set<string>, texts: Set<string>): void {
  if (typeof value === "string") texts.add(value);
  else if (Array.isArray(value)) for (const v of value) walk(v, keys, texts);
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      keys.add(k);
      walk(v, keys, texts);
    }
  }
}

function mini(): SeedTree {
  return miniSeed({ areas: AREAS, through: 1, frame: "small" });
}

describe("풀이 검사(6.4)", () => {
  it("AC-7d 풀이 검사: 앱 정답과 다르게 풀린 문항은 different 로 적히고 그 칸은 사람 확인(pending-human)이다", () => {
    for (const cell of sampleCells()) {
      const targets = solveTargets(cell);
      const no = targets[targets.length - 1];
      if (no === undefined) throw new Error("대상 없음");
      const { record, request } = solveCell(cell, { kind: "different", no });
      const item = record.solve.items.find((i) => i.no === no);
      expect(item?.verdict, cell.key).toBe("different");
      const view = request.items.find((i) => i.no === no);
      if (view?.answer === "choice") {
        expect(typeof item?.solverAnswer).toBe("number");
        expect(item?.solverAnswer).not.toBe(seedAnswerOf(cell, no).answerNo);
      } else expect(item?.solverAnswer).toBe(FAKE_WRONG_TEXT);
      expect(
        record.solve.items.filter((i) => i.no !== no).map((i) => i.verdict),
      ).toEqual(targets.filter((n) => n !== no).map(() => "same"));
      expect(solveStatus(cell, record), cell.key).toBe("pending-human");
    }
  });

  it("AC-7d 풀이 검사: '둘 이상 맞음' · '답 없음'은 multiple · none 으로 적히고 사람 확인이다", () => {
    const cell = lessonCell(readingLesson(ref, 4));
    const [first] = solveTargets(cell);
    if (first === undefined) throw new Error("대상 없음");
    const multiple = solveCell(cell, { kind: "multiple", no: first }).record;
    expect(multiple.solve.items.find((i) => i.no === first)?.verdict).toBe(
      "multiple",
    );
    expect(solveStatus(cell, multiple)).toBe("pending-human");
    const none = solveCell(cell, { kind: "none", no: first }).record;
    const noneItem = none.solve.items.find((i) => i.no === first);
    expect(noneItem?.verdict).toBe("none");
    expect(noneItem?.solverAnswer).toBeUndefined();
    expect(solveStatus(cell, none)).toBe("pending-human");
    // 글 답 문항도 같다(조립).
    const writing = lessonCell(writingLesson(ref, 3));
    const [no] = solveTargets(writing);
    if (no === undefined) throw new Error("대상 없음");
    const writingNone = solveCell(writing, { kind: "none", no }).record;
    expect(writingNone.solve.items.find((i) => i.no === no)?.verdict).toBe(
      "none",
    );
    expect(solveStatus(writing, writingNone)).toBe("pending-human");
  });

  it("AC-7d 풀이 검사: 조립 · 받아쓰기의 허용 정답 후보가 시드 밖이면 사람 확인이고 시드 안이면 통과다", () => {
    const { cell, word } = dictationCell();
    const request = requestOf(cell);
    const [dictationNo, assembleNo] = request.items.map((i) => i.no);
    if (dictationNo === undefined || assembleNo === undefined)
      throw new Error("대상 없음");
    expect(request.items.filter((i) => i.answer === "text")).toHaveLength(
      request.items.length,
    );
    expect(
      request.items.every((i) => i.answer === "text" && i.listAlternatives),
    ).toBe(true);
    // 시드 밖 후보(받아쓰기)
    const outside = solveCell(cell, {
      kind: "alternatives",
      no: dictationNo,
      alternatives: [`${word}s`, "", word.toUpperCase(), `${word}s`],
    }).record;
    const outsideItem = outside.solve.items.find((i) => i.no === dictationNo);
    expect(outsideItem?.verdict).toBe("same");
    // 빈 글 · 답 글과 같은 것(대소문자 무시) · 겹친 것을 뺀다.
    expect(outsideItem?.extraAccepted).toEqual([`${word}s`]);
    expect(solveStatus(cell, outside)).toBe("pending-human");
    // 시드 안 후보(조립): 시드 허용 정답에 둘째 답을 더하면 통과
    const content = (cell.value as { content: { items: WritingItem[] } })
      .content;
    const assemble = content.items[assembleNo - 1];
    if (assemble?.type !== "assemble-sentence")
      throw new Error("조립 문항 없음");
    const second = `${assemble.accepted[0]?.replace(/\.$/, "")}!`;
    assemble.accepted = [...assemble.accepted, second];
    const inside = solveCell(cell, {
      kind: "alternatives",
      no: assembleNo,
      alternatives: [second.toUpperCase()],
    }).record;
    expect(
      inside.solve.items.find((i) => i.no === assembleNo)?.extraAccepted,
    ).toEqual([second.toUpperCase()]);
    expect(solveStatus(cell, inside)).toBe("passed");
    // 후보를 받지 않는 문항(베끼기)은 후보를 적지 않는다.
    const copy = lessonCell(writingLesson(ref, 1));
    const copyNo = requestOf(copy).items.find(
      (i) => i.answer === "text" && i.task === "copy-tiles",
    )?.no;
    if (copyNo === undefined) throw new Error("베끼기 문항 없음");
    const copied = solveCell(copy, {
      kind: "alternatives",
      no: copyNo,
      alternatives: [FAKE_WRONG_TEXT],
    }).record;
    expect(
      copied.solve.items.find((i) => i.no === copyNo)?.extraAccepted,
    ).toBeUndefined();
    expect(solveStatus(copy, copied)).toBe("passed");
  });

  it("AC-7d 풀이 검사: 정답대로 풀리면 그 칸의 내용 해시로 적히고 solveStatus 가 passed 다", () => {
    for (const cell of [...sampleCells(), dictationCell().cell]) {
      const { record, request } = solveCell(cell);
      expect(record.cell).toBe(cell.key);
      expect(record.contentHash).toBe(cellHash(cell.key, cell.value));
      expect(request.contentHash).toBe(record.contentHash);
      expect(record.solve.items.map((i) => i.no)).toEqual(solveTargets(cell));
      expect(record.solve.items.every((i) => i.verdict === "same")).toBe(true);
      expect(record.solve.model).toBe(MODEL);
      expect(record.solve.at).toBe(AT);
      expect(solveStatus(cell, record), cell.key).toBe("passed");
    }
  });

  it("AC-7d 풀이 검사 대상: 해시가 그대로이고 기록이 있는 칸은 다시 풀지 않고 검증에 실패한 칸은 건너뛴다", () => {
    // 모든 대상 칸에 통과 기록이 있는 꽉 찬 시드: 풀 칸이 없다.
    const tree = mini();
    const all = collectCells(seedTreeFiles(tree));
    const solvable = all.cells.filter((c) => solveTargets(c).length > 0);
    expect(solvable.length).toBeGreaterThan(0);
    expect(selectSolveTargets(seedTreeFiles(tree), {}).targets).toEqual([]);
    // 내용을 바꾼 칸 · 기록을 뺀 파일의 칸만 대상이고, 검증에 실패한 칸은 건너뛴다.
    const file = tree.lessons.find(
      (f) => f.area === "reading" && f.level === 1 && f.unit === 2,
    );
    const changed = file?.lessons[0] as ReadingLesson | undefined;
    const broken = file?.lessons[1] as ReadingLesson | undefined;
    if (!changed || !broken) throw new Error("견본 없음");
    changed.content.passage = `${changed.content.passage} `;
    const question = broken.content.questions[0];
    if (!question) throw new Error("견본 없음");
    question.answerNo = question.options.length + 1;
    const dropped = lessonFilePath("writing", 1, 3);
    tree.checks = tree.checks.filter((c) => c.path !== checksFilePath(dropped));
    const files = seedTreeFiles(tree);
    const keyOf = (lesson: ReadingLesson) =>
      cellKey({
        type: "lesson",
        area: "reading",
        level: 1,
        unit: 2,
        kind: lesson.kind,
        lessonNo: lesson.lessonNo,
        variant: lesson.variant,
      });
    const droppedKeys = collectCells(files)
      .cells.filter((c) => c.file === dropped && solveTargets(c).length > 0)
      .map((c) => c.key);
    expect(droppedKeys.length).toBeGreaterThan(0);
    const picked = selectSolveTargets(files, {});
    expect(picked.targets.map((c) => c.key).sort()).toEqual(
      [keyOf(changed), ...droppedKeys].sort(),
    );
    expect(picked.skipped.map((c) => c.key)).toEqual([keyOf(broken)]);
    // --force 는 해시가 그대로인 칸도 고르지만 검증에 실패한 칸은 여전히 건너뛴다.
    const forced = selectSolveTargets(files, { force: true });
    expect(forced.targets).toHaveLength(solvable.length - 1);
    expect(forced.skipped.map((c) => c.key)).toEqual([keyOf(broken)]);
    // 풀이 대상이 없는 칸(회화 카드)은 고르지 않는다.
    expect(
      forced.targets.some((c) => c.area === "talk" && c.kind === "lesson"),
    ).toBe(false);
  });

  it("풀이 검사 문제 보기: 정답 번호 · 허용 정답 · 해설 · 바른 답 · 받아쓰기 낱말이 들어가지 않는다", () => {
    const forbiddenKeys = [
      "answerNo",
      "accepted",
      "explanationKo",
      "modelAnswer",
      "glossary",
      "preview",
      "targetWords",
      "newWords",
      "unitWords",
      "textKo",
      "title",
      "cell",
      "contentHash",
      "unit",
      "revision",
      "generation",
    ];
    const { cell: dictation, word } = dictationCell();
    for (const cell of [...sampleCells(), dictation]) {
      const request = requestOf(cell);
      const message = solveUserMessage(request);
      const keys = new Set<string>();
      const texts = new Set<string>();
      walk(JSON.parse(message), keys, texts);
      for (const key of forbiddenKeys) expect(keys.has(key), key).toBe(false);
      expect(message).not.toContain(cell.key);
      expect(message).not.toContain(request.contentHash);
      // 칸의 해설 · 바른 답 · 허용 답 글이 보기에 없다(보기 · 지문에도 나오는 글은 뺀다).
      const seedKeys = new Set<string>();
      const seedTexts = new Set<string>();
      walk(cell.value, seedKeys, seedTexts);
      const hidden = new Set<string>();
      const collect = (value: unknown) => {
        if (Array.isArray(value)) value.forEach(collect);
        else if (value && typeof value === "object") {
          for (const [k, v] of Object.entries(value)) {
            if (["explanationKo", "modelAnswer", "textKo"].includes(k))
              hidden.add(String(v));
            if (k === "accepted" && Array.isArray(v))
              for (const a of v) hidden.add(String(a));
            collect(v);
          }
        }
      };
      collect(cell.value);
      for (const text of hidden) {
        if (texts.has(text)) {
          // 베끼기 낱말 · 보기 글 · 받아쓰기로 읽어 줄 글처럼 아이가 보거나 듣는 글만 겹칠 수 있다.
          const visible = request.items.some(
            (i) =>
              i.listen === text ||
              (i.answer === "text" && i.word === text) ||
              (i.answer === "choice" && i.options.includes(text)),
          );
          expect(visible, `${cell.key} ${text}`).toBe(true);
        }
      }
    }
    // 받아쓰기 문항은 읽어 줄 글만 있고 낱말 칸이 없다.
    const view = requestOf(dictation).items[0];
    expect(view).toEqual({
      no: 1,
      answer: "text",
      task: "dictation",
      listen: word,
      listAlternatives: true,
    });
  });

  it("풀이 검사 문제 보기: 듣기 문항은 읽어 줄 글과 보기만 주고 그림 보기는 vocab 한국어 뜻으로 준다", () => {
    const sample = speakingLesson(ref, 1);
    const cell = lessonCell(sample);
    const request = requestOf(cell);
    const meaning = (word: string) => {
      const entry = ref.vocab.vocab.find((v) => v.word === word);
      if (!entry) throw new Error(`vocab 없음 ${word}`);
      return `그림: ${entry.meaningKo}`;
    };
    expect(request.context).toEqual({});
    expect(request.items).toEqual(
      sample.lesson.content.listening.map((item, i) => ({
        no: solveTargets(cell)[i],
        answer: "choice",
        listen: item.script,
        options:
          item.kind === "picture" ? item.options.map(meaning) : item.options,
      })),
    );
    // 그림 보기의 영어 낱말(단어 id)은 보기에 없다.
    for (const item of sample.lesson.content.listening) {
      for (const option of item.options)
        expect(
          request.items.some(
            (v) => v.answer === "choice" && v.options.includes(option),
          ),
        ).toBe(false);
    }
    // 읽기 그림 문제 · 쓰기 그림 보고 고르기도 같다.
    const reading = lessonCell(readingLesson(ref, 1));
    const readingRequest = requestOf(reading);
    expect(readingRequest.context.passage).toBeTruthy();
    for (const view of readingRequest.items) {
      if (view.answer !== "choice") throw new Error("고르기 문항이 아니다");
      expect(view.options.every((o) => o.startsWith("그림: "))).toBe(true);
    }
    const pick = requestOf(lessonCell(writingLesson(ref, 1))).items[0];
    if (pick?.answer !== "choice") throw new Error("그림 보고 고르기 없음");
    expect(pick.picture).toMatch(/^그림: /);
    // 단계 평가 읽기 문항은 지문을 context 에 둔다.
    const test = sampleCells().find((c) => c.kind === "test-item");
    if (!test) throw new Error("평가 문항 없음");
    expect(requestOf(test).context.passage).toBe(
      (test.value as { passage: string }).passage,
    );
    // vocab 에 없는 그림 단어는 낱말 그대로 준다.
    const lone = buildSolveRequest(cell, { vocab: new Map() });
    const first = lone?.items[0];
    if (first?.answer !== "choice") throw new Error("고르기 문항이 아니다");
    expect(first.options[0]).toBe(
      `그림: ${sample.lesson.content.listening[0]?.options[0]}`,
    );
  });

  it("풀이 검사 문제 보기: 문항 번호는 itemsOf 번호이고 solveTargets 문항만 든다", () => {
    for (const cell of sampleCells()) {
      const request = requestOf(cell);
      expect(
        request.items.map((i) => i.no),
        cell.key,
      ).toEqual(solveTargets(cell));
      const numbers = itemsOf(cell).map((i) => i.no);
      for (const view of request.items) expect(numbers).toContain(view.no);
    }
    // 말하기는 따라 말하기 · 질문을 빼고 듣기 문항만(번호는 따라 말하기 다음부터).
    const speaking = lessonCell(speakingLesson(ref, 1));
    const repeat = speakingLesson(ref, 1).lesson.content.repeat;
    expect(requestOf(speaking).items[0]?.no).toBe(
      repeat.words.length + repeat.sentences.length + 1,
    );
    // 대상이 없는 칸(회화 카드 · 쓰기 4단계 과제)은 요청이 없다.
    expect(buildSolveRequest(lessonCell(talkLesson(ref, 1)), index)).toBeNull();
    expect(
      buildSolveRequest(lessonCell(writingLesson(ref, 4)), index),
    ).toBeNull();
  });

  it("풀이 검사 응답 읽기: 거절은 대상 문항 모두 none 이고 max_tokens · 규격 깨짐 · 번호 어긋남은 기록 없는 실패다", () => {
    const cell = lessonCell(readingLesson(ref, 4));
    const request = requestOf(cell);
    const refusal = interpretSolveMessage(
      solveMessage(null, { model: MODEL, stopReason: "refusal" }),
    );
    if (refusal.kind !== "refusal") throw new Error("거절로 읽지 않았다");
    const refused = judgeSolve(cell, request, refusal);
    if (!refused.ok) throw new Error(refused.reason);
    expect(refused.items).toEqual(
      solveTargets(cell).map((no) => ({ no, verdict: "none" })),
    );
    const good = answerOutput(cell, request);
    const failures: SolveInterpretation[] = [
      interpretSolveMessage(
        solveMessage(good, { model: MODEL, stopReason: "max_tokens" }),
      ),
      interpretSolveMessage(solveMessage(null, { model: MODEL })),
      interpretSolveMessage(solveMessage("{ not json", { model: MODEL })),
      interpretSolveMessage(
        solveMessage('{"items": [{"no": 1}]}', { model: MODEL }),
      ),
    ];
    for (const f of failures) {
      expect(f.kind).toBe("failed");
      if (f.kind === "failed") expect(f.reason).not.toBe("");
    }
    // 실패에도 토큰이 있으면 남긴다(과금은 된다).
    const cut = failures[0];
    if (cut?.kind !== "failed") throw new Error("실패가 아니다");
    expect(cut.usage).toEqual(FAKE_USAGE);
    expect(cut.model).toBe(MODEL);
    // 번호 어긋남(빠짐 · 더함 · 겹침)은 판정이 실패로 돌린다.
    const variants = [
      good.items.slice(1),
      [...good.items, { ...good.items[0], no: 999 }],
      [...good.items, good.items[0]],
    ];
    for (const items of variants) {
      const answer = interpretSolveMessage(
        solveMessage({ items } as typeof good, { model: MODEL }),
      );
      expect(answer.kind).toBe("ok");
      if (answer.kind === "failed") continue;
      const judged = judgeSolve(cell, request, answer);
      expect(judged.ok).toBe(false);
    }
  });

  it("풀이 검사 기록: 같은 해시의 사람 확인은 남기고 해시가 바뀌면 지우며 파일 안 차례는 칸 차례다", () => {
    const tree = mini();
    const files = seedTreeFiles(tree);
    const seed = collectCells(files);
    const path = lessonFilePath("reading", 1, 1);
    const cells = seed.cells.filter(
      (c) => c.file === path && solveTargets(c).length > 0,
    );
    const [a, b, c] = cells;
    if (!a || !b || !c) throw new Error("견본 없음");
    const first = solveCell(a).record;
    const human = withHumanDecisions(
      { records: [first] },
      {
        cell: a.key,
        contentHash: first.contentHash,
        at: AT,
        items: [{ no: 1, decision: "correct" }],
      },
    );
    if (!human.ok) throw new Error(human.reason);
    const withHuman = human.file.records[0];
    if (!withHuman?.human) throw new Error("사람 확인 없음");
    // 같은 내용을 다시 풀면(--force) 사람 확인이 남는다.
    const again = solveCell(a, undefined, withHuman).record;
    expect(again.human).toEqual(withHuman.human);
    // 내용이 바뀌면 사람 확인을 뺀다.
    const changedValue = structuredClone(a.value) as {
      content: { passage: string };
    };
    changedValue.content.passage = `${changedValue.content.passage} `;
    const changed = solveCell(
      { ...a, value: changedValue },
      undefined,
      withHuman,
    ).record;
    expect(changed.contentHash).not.toBe(withHuman.contentHash);
    expect(changed.human).toBeUndefined();
    // 차례: 칸 차례, 지금 칸에 없는 옛 기록은 뒤에 그대로.
    const stale: CheckRecord = {
      ...solveCell(c).record,
      cell: cellKey({
        type: "lesson",
        area: "reading",
        level: 1,
        unit: 1,
        kind: "remedial",
        lessonNo: 99,
        variant: 1,
      }),
    };
    const oldB = solveCell(b).record;
    const merged = mergeCheckFile(
      { records: [oldB, stale, first] },
      [again],
      cells.map((x) => x.key),
    );
    expect(merged.records.map((r) => r.cell)).toEqual([
      a.key,
      b.key,
      stale.cell,
    ]);
    expect(merged.records[0]).toBe(again);
    expect(merged.records[1]).toBe(oldB);
    const fresh = mergeCheckFile(
      undefined,
      [solveCell(c).record, again],
      cells.map((x) => x.key),
    );
    expect(fresh.records.map((r) => r.cell)).toEqual([a.key, c.key]);
  });

  it("6.4 사람 확인: 해시가 같은 풀이 기록에만 '정답 맞음' · '고침'을 적고 solveStatus 는 정답 맞음만 통과로 센다", () => {
    const cell = lessonCell(readingLesson(ref, 4));
    const [one, two] = solveTargets(cell);
    if (one === undefined || two === undefined) throw new Error("대상 없음");
    const record = solveCell(cell, { kind: "different" }).record;
    expect(solveStatus(cell, record)).toBe("pending-human");
    const file = { records: [record] };
    // 기록이 없거나 해시가 다르면 거부
    const otherKey = lessonCell(readingLesson(ref, 1)).key;
    const missing = withHumanDecisions(file, {
      cell: otherKey,
      contentHash: record.contentHash,
      at: AT,
      items: [{ no: one, decision: "correct" }],
    });
    expect(missing.ok).toBe(false);
    const stale = withHumanDecisions(file, {
      cell: cell.key,
      contentHash: "0".repeat(64),
      at: AT,
      items: [{ no: one, decision: "correct" }],
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.reason).toContain("풀이 기록");
    // 한 문항만 정답 맞음 → 아직 사람 확인
    const partial = withHumanDecisions(file, {
      cell: cell.key,
      contentHash: record.contentHash,
      at: AT,
      items: [{ no: one, decision: "correct" }],
    });
    if (!partial.ok) throw new Error(partial.reason);
    expect(solveStatus(cell, partial.file.records[0])).toBe("pending-human");
    // 나머지를 '고침'으로 → 고침은 통과로 세지 않는다
    const others = solveTargets(cell).filter((n) => n !== one);
    const fixed = withHumanDecisions(partial.file, {
      cell: cell.key,
      contentHash: record.contentHash,
      at: AT,
      items: others.map((no) => ({ no, decision: "fixed" as const })),
    });
    if (!fixed.ok) throw new Error(fixed.reason);
    expect(fixed.file.records[0]?.human?.items).toEqual([
      { no: one, decision: "correct" },
      ...others.map((no) => ({ no, decision: "fixed" })),
    ]);
    expect(solveStatus(cell, fixed.file.records[0])).toBe("pending-human");
    // 모두 정답 맞음 → 통과(앞 결정을 문항마다 바꾼다)
    const correct = withHumanDecisions(fixed.file, {
      cell: cell.key,
      contentHash: record.contentHash,
      at: AT,
      items: others.map((no) => ({ no, decision: "correct" as const })),
    });
    if (!correct.ok) throw new Error(correct.reason);
    expect(correct.file.records[0]?.human?.items).toHaveLength(
      solveTargets(cell).length,
    );
    expect(solveStatus(cell, correct.file.records[0])).toBe("passed");
    // 원래 파일은 바뀌지 않는다.
    expect(file.records[0]?.human).toBeUndefined();
  });

  it("풀이 검사 비용: model-prices 에서 그 모델의 그날 이전 가장 늦은 단가로 입력 · 출력 · 캐시 토큰을 센다", () => {
    const later = new Date(`${solvePrice.effectiveFrom}T00:00:00Z`);
    later.setUTCDate(later.getUTCDate() + 1);
    const laterDate = later.toISOString().slice(0, 10);
    const raised: ModelPrice = {
      ...solvePrice,
      inputUsdPerMTok: solvePrice.inputUsdPerMTok * 2,
      outputUsdPerMTok: solvePrice.outputUsdPerMTok * 2,
      effectiveFrom: laterDate,
    };
    const models = [raised, ...ref.modelPrices.models];
    expect(priceOf(models, MODEL, solvePrice.effectiveFrom)).toBe(solvePrice);
    expect(priceOf(models, MODEL, laterDate)).toBe(raised);
    const before = new Date(`${solvePrice.effectiveFrom}T00:00:00Z`);
    before.setUTCDate(before.getUTCDate() - 1);
    expect(
      priceOf(models, MODEL, before.toISOString().slice(0, 10)),
    ).toBeUndefined();
    expect(
      priceOf(models, "no-such-model", solvePrice.effectiveFrom),
    ).toBeUndefined();
    const u = FAKE_USAGE;
    const expected =
      (u.input_tokens * solvePrice.inputUsdPerMTok +
        u.output_tokens * solvePrice.outputUsdPerMTok +
        (u.cache_creation_input_tokens ?? 0) * solvePrice.cacheWriteUsdPerMTok +
        (u.cache_read_input_tokens ?? 0) * solvePrice.cacheReadUsdPerMTok) /
      TOKENS_PER_MTOK;
    const cost = costOf(u, solvePrice);
    expect(cost).toBeCloseTo(expected, COST_DECIMALS);
    expect(Number(cost.toFixed(COST_DECIMALS))).toBe(cost);
    // 캐시 칸이 null 이면 0 으로 센다.
    expect(
      costOf(
        {
          input_tokens: u.input_tokens,
          output_tokens: u.output_tokens,
          cache_creation_input_tokens: null,
          cache_read_input_tokens: null,
        },
        solvePrice,
      ),
    ).toBeCloseTo(
      (u.input_tokens * solvePrice.inputUsdPerMTok +
        u.output_tokens * solvePrice.outputUsdPerMTok) /
        TOKENS_PER_MTOK,
      COST_DECIMALS,
    );
    // 기록의 입력 토큰은 입력 + 캐시 쓰기 + 캐시 읽기
    const { record } = solveCell(lessonCell(readingLesson(ref, 4)));
    expect(record.solve.inputTokens).toBe(
      u.input_tokens +
        (u.cache_creation_input_tokens ?? 0) +
        (u.cache_read_input_tokens ?? 0),
    );
    expect(record.solve.outputTokens).toBe(u.output_tokens);
    expect(record.solve.costUsd).toBe(cost);
  });

  it("풀이 검사 조합: 단가 행이 없거나 between_tools · low 를 받지 않는 모델이면 시작하지 않는다", () => {
    expect(solveCallAccepted(solvePrice, SOLVE_CALL)).toBe(true);
    for (const row of smallReferenceSet().modelPrices.models) {
      expect(solveCallAccepted(row, SOLVE_CALL), row.model).toBe(
        row.thinkingOff === "between_tools" &&
          row.thinkingOffEfforts.includes("low"),
      );
    }
    expect(
      solveCallAccepted({ ...solvePrice, thinkingOff: "disabled" }, SOLVE_CALL),
    ).toBe(false);
    expect(
      solveCallAccepted(
        { ...solvePrice, thinkingOffEfforts: ["medium"] },
        SOLVE_CALL,
      ),
    ).toBe(false);
    expect(
      solveCallAccepted({ ...solvePrice, thinkingOff: null }, SOLVE_CALL),
    ).toBe(false);
    expect(priceOf([], MODEL, solvePrice.effectiveFrom)).toBeUndefined();
  });
});
