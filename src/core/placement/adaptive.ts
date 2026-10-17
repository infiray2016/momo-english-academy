// 배치 평가 적응 규칙(3.2 배치 평가 표 · 13절 C71 · plan-p10a 파일별 값 9 · 정할 것 라 · 처).
// 상태는 답 기록뿐이다 — 이어 보기는 같은 기록으로 다음 차례를 다시 센다(AC-11d). DB · 시계 없는 순수 함수.
// 설정 값(시작 단계 · 단계마다 문항 수 · 영역 문항 수 상한)은 level_tests 복사본에서, 시드 범위 끝은 판정 때의 설정에서
// 부르는 쪽이 넘긴다.
import { LEVEL_MIN } from "@/core/seed/structure";

/** 답 기록 한 줄(level_tests.answers 의 채점 칸). */
export type PlacementAnswerRecord = {
  level: number;
  slot: "main" | "spare";
  no: number;
  correct: boolean;
  dontKnow: boolean;
  /** 한 문항 인식이 두 시도를 합쳐 speech.max_retries 번 실패함 — 틀림으로 세지 않고 그 문항을 예비로 다시 낸다(정할 것 처). */
  repeatFailed: boolean;
};

export type PlacementRules = {
  /** placement.start_level */
  startLevel: number;
  /** placement.items_per_level */
  perLevel: number;
  /** placement.items_per_area */
  maxItems: number;
  /** 단계 상한(structure LEVEL_MAX). */
  levelMax: number;
  /** seed.complete_through_level(판정 때의 값, 6.3). */
  through: number;
};

export type PlacementInput = PlacementRules & {
  answers: readonly PlacementAnswerRecord[];
  /** 본 문항이 따라 말하기인 칸(slotKey). 실패 3회가 한 번이라도 있으면 이 칸들은 같은 (단계, 번호)의 예비 문항으로 낸다. */
  repeatSlots: ReadonlySet<string>;
};

export type PlacementResult = {
  /** 시작 단계 = max(1, 넘은 최고 단계 − 1), seed.complete_through_level 이하. */
  start: number;
  /** 넘은 최고 단계(없으면 null). */
  highest: number | null;
  /** 1단계도 못 넘음 — 읽기 · 쓰기는 알파벳 · 소리 단원(3.1). */
  alphabet: boolean;
  /** 예비 문항을 낸 적이 있음('말하기 일부는 듣기로 봤어요'). */
  usedSpares: boolean;
};

export type PlacementStep =
  | {
      kind: "item";
      level: number;
      slot: "main" | "spare";
      no: number;
      /** 화면의 '문제 n'(센 답 수 + 1 — 실패 3회 난 시도는 세지 않는다). */
      itemNo: number;
    }
  | { kind: "done"; result: PlacementResult };

/** (단계, 번호) 칸 이름. */
export function slotKey(level: number, no: number): string {
  return `${level}:${no}`;
}

type BlockOutcome = "continue" | "up2" | "up1" | "fail";

/**
 * 한 단계 묶음의 판정(C71): perLevel 문항을 다 맞히면 두 단계, 하나만 틀리면(perLevel ≥ 2) 한 단계, 그 밖은 못 넘음.
 * 남은 문항을 다 맞혀도 한 단계에 못 미치면(c + r < perLevel − 1, perLevel = 1 이면 c + r < 1) 거기서 못 넘음.
 */
function judgeBlock(
  block: readonly PlacementAnswerRecord[],
  perLevel: number,
): BlockOutcome {
  const correct = block.filter((a) => a.correct).length;
  const remaining = perLevel - block.length;
  const needed = perLevel >= 2 ? perLevel - 1 : 1;
  if (block.length >= perLevel) {
    if (correct >= perLevel) return "up2";
    if (perLevel >= 2 && correct === perLevel - 1) return "up1";
    return "fail";
  }
  if (correct + remaining < needed) return "fail";
  return "continue";
}

type ReplayState = {
  level: number;
  block: PlacementAnswerRecord[];
  passed: Set<number>;
  failed: Set<number>;
  skipped: number | undefined;
  counted: number;
  spareMode: boolean;
  usedSpares: boolean;
  done: boolean;
};

function slotOf(state: ReplayState, input: PlacementInput): "main" | "spare" {
  const no = state.block.length + 1;
  return state.spareMode && input.repeatSlots.has(slotKey(state.level, no))
    ? "spare"
    : "main";
}

/** 묶음이 끝난 뒤 다음 단계(3.2 오르기 · 내리기 · 끝 행). */
function move(state: ReplayState, outcome: BlockOutcome, levelMax: number) {
  const level = state.level;
  const seen = (l: number) => state.passed.has(l) || state.failed.has(l);
  if (outcome === "up2" || outcome === "up1") {
    state.passed.add(level);
    if (level >= levelMax || state.failed.has(level + 1)) {
      state.done = true;
    } else if (outcome === "up2" && level + 2 <= levelMax && !seen(level + 2)) {
      state.skipped = level + 1;
      state.level = level + 2;
    } else if (!seen(level + 1)) {
      state.level = level + 1;
    } else {
      state.done = true;
    }
    return;
  }
  state.failed.add(level);
  if (state.passed.has(level - 1)) {
    state.done = true;
  } else if (state.skipped !== undefined && !seen(state.skipped)) {
    state.level = state.skipped;
    state.skipped = undefined;
  } else if (state.passed.size === 0 && level > LEVEL_MIN && !seen(level - 1)) {
    state.level = level - 1;
  } else {
    state.done = true;
  }
}

function replay(input: PlacementInput): ReplayState {
  const state: ReplayState = {
    level: input.startLevel,
    block: [],
    passed: new Set(),
    failed: new Set(),
    skipped: undefined,
    counted: 0,
    spareMode: false,
    usedSpares: false,
    done: false,
  };
  for (const answer of input.answers) {
    const expected = {
      level: state.level,
      no: state.block.length + 1,
      slot: slotOf(state, input),
    };
    if (
      state.done ||
      answer.level !== expected.level ||
      answer.no !== expected.no ||
      answer.slot !== expected.slot
    ) {
      throw new Error(
        `배치 답 기록이 차례와 맞지 않는다: ${answer.level}:${answer.no}(${answer.slot})`,
      );
    }
    if (answer.slot === "spare") state.usedSpares = true;
    if (answer.repeatFailed) {
      state.spareMode = true;
      continue;
    }
    state.block.push(answer);
    state.counted += 1;
    const outcome = judgeBlock(state.block, input.perLevel);
    if (outcome !== "continue") {
      state.block = [];
      move(state, outcome, input.levelMax);
    }
    if (state.counted >= input.maxItems) state.done = true;
  }
  return state;
}

/** 답 기록에서 다음 차례(문항 칸 또는 끝과 판정)를 센다. 기록이 차례와 맞지 않으면 던진다. */
export function nextPlacementStep(input: PlacementInput): PlacementStep {
  const state = replay(input);
  if (!state.done) {
    return {
      kind: "item",
      level: state.level,
      slot: slotOf(state, input),
      no: state.block.length + 1,
      itemNo: state.counted + 1,
    };
  }
  const highest = state.passed.size > 0 ? Math.max(...state.passed) : null;
  const start = highest === null ? LEVEL_MIN : Math.max(LEVEL_MIN, highest - 1);
  return {
    kind: "done",
    result: {
      start: Math.min(start, Math.max(LEVEL_MIN, input.through)),
      highest,
      alphabet: highest === null,
      usedSpares: state.usedSpares,
    },
  };
}
