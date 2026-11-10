import "server-only";
// 시드 목록 넷 · 회화 맞장구 목록(회화 plan 정한 것 20)과 회화 선생님 명단 읽기(5절 '빌드에 묶어 배포' · 6.4 · C63 (5), plan-p09c 파일별 값 3 · 선생님 화면 plan 값 5).
// 빌드 추적(next.config.ts outputFileTracingIncludes)으로 서버 함수 묶음에 든 파일을 실행 때 읽는다.
// 없거나 규격에 어긋나면 던진다 — 흐름은 AI 를 부르지 않는다(검사하지 않은 출력을 아이에게 보이지 않는다).
// 오류 메시지에 파일 내용을 넣지 않는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import {
  type ForbiddenFile,
  ForbiddenFileSchema,
  HomophonesFileSchema,
  ListFormsFileSchema,
  MetaSentencesFileSchema,
  type SoundAlikesFile,
  SoundAlikesFileSchema,
  type TalkAllowedWordsFile,
  TalkAllowedWordsFileSchema,
  type TalkCueLinesFile,
  TalkCueLinesFileSchema,
  type TalkListLine,
  TalkMadeUpPhrasesFileSchema,
  type TalkShortLinesFile,
  TalkShortLinesFileSchema,
  type TalkSituationLinesFile,
  TalkSituationLinesFileSchema,
  TalkWaitLinesFileSchema,
} from "@/core/seed/schema/reference";
import { TeachersFileSchema } from "@/core/seed/schema/teachers";
import {
  bandOf,
  SEED_FILES,
  TALK_CUE_BANDS,
  TALK_CUE_PLACES,
  TALK_SHORT_BANDS,
  TALK_SHORT_PLACES,
  TALK_SITUATION_FORBIDDEN_SCOPES,
  TALK_SITUATION_PLACES,
  type TalkShortPlace,
} from "@/core/seed/structure";

/** 시드 폴더 이름(P4a 배치). */
const SEED_DIR = "seed";
/** 파일이 없을 때의 Node 오류 코드. */
const NOT_FOUND = "ENOENT";

const LIST_SCHEMAS = {
  forbidden: ForbiddenFileSchema,
  homophones: HomophonesFileSchema,
  forms: ListFormsFileSchema,
  metaSentences: MetaSentencesFileSchema,
  teachers: TeachersFileSchema,
  talkWaitLines: TalkWaitLinesFileSchema,
  talkCueLines: TalkCueLinesFileSchema,
  talkSituationLines: TalkSituationLinesFileSchema,
  talkAllowedWords: TalkAllowedWordsFileSchema,
  talkMadeUpPhrases: TalkMadeUpPhrasesFileSchema,
  talkShortLines: TalkShortLinesFileSchema,
  soundAlikes: SoundAlikesFileSchema,
} as const;

export type SeedListName = keyof typeof LIST_SCHEMAS;
export type SeedListOf<N extends SeedListName> = z.output<
  (typeof LIST_SCHEMAS)[N]
>;

export class SeedListError extends Error {
  constructor(
    readonly list: SeedListName,
    readonly reason: "missing" | "invalid",
  ) {
    super(
      reason === "missing"
        ? `시드 목록 ${list} 파일이 없습니다`
        : `시드 목록 ${list} 이 규격에 맞지 않습니다`,
    );
    this.name = "SeedListError";
  }
}

/** (root, name) 마다 하나. 배포가 바뀌어야 바뀌는 파일이라 읽은 것을 모아 둔다(실패는 모아 두지 않는다). */
const cache = new Map<string, unknown>();

export type SeedListOptions = { root?: string };

/** 시드 목록 하나를 읽어 P4a 규격으로 검증한다. 없으면 missing, JSON · 규격이 틀리면 invalid. */
export function loadSeedList<N extends SeedListName>(
  name: N,
  { root = process.cwd() }: SeedListOptions = {},
): SeedListOf<N> {
  const key = JSON.stringify([root, name]);
  if (cache.has(key)) return cache.get(key) as SeedListOf<N>;
  let text: string;
  try {
    text = readFileSync(join(root, SEED_DIR, SEED_FILES[name]), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === NOT_FOUND) {
      throw new SeedListError(name, "missing");
    }
    throw error;
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new SeedListError(name, "invalid");
  }
  const parsed = LIST_SCHEMAS[name].safeParse(json);
  if (!parsed.success) throw new SeedListError(name, "invalid");
  cache.set(key, parsed.data);
  return parsed.data as SeedListOf<N>;
}

export type OutputCheckLists = { forbidden: ForbiddenFile };

/** 실시간 출력 검사 목록(6.4 끝 문단). P11 의 동음이의어 · 1-나의 메타 문장도 loadSeedList 를 쓴다. */
export function getOutputCheckLists(
  opts: SeedListOptions = {},
): OutputCheckLists {
  return { forbidden: loadSeedList("forbidden", opts) };
}

/** 목록 없음 알림을 한 번만 냈는가(서버 인스턴스마다). */
let homophonesMissingWarned = false;

/**
 * 동음이의어 묶음(배치 · 세션 채점이 같이 쓴다 — 한 곳, P11 차례 4). 시드 목록 파일이 없는 개발용 · e2e 길(시험용 시드는 DB 에만
 * 있음)에서는 빈 묶음으로 본다 — 일치율이 조금 엄해질 뿐 판정은 된다. 운영에서 빌드 추적이 빠져 없을 때 조용히 엄해지지 않게
 * 처음 한 번 경고를 남긴다(이름만, 검토 review-p10-5-6-code M-3). 규격이 틀린 파일은 던진다.
 */
export function seedHomophones(opts: SeedListOptions = {}): string[][] {
  try {
    return loadSeedList("homophones", opts).groups;
  } catch (error) {
    if (error instanceof SeedListError && error.reason === "missing") {
      if (!homophonesMissingWarned) {
        homophonesMissingWarned = true;
        console.warn(
          "동음이의어 목록(seed/lists/homophones.json)이 없어 빈 묶음으로 채점합니다",
        );
      }
      return [];
    }
    throw error;
  }
}

/** 맞장구 목록 없음 알림을 한 번만 냈는가(서버 인스턴스마다). */
let waitLinesMissingWarned = false;

/**
 * 회화 앱 맞장구 목록(회화 plan 정한 것 20 — 회화 화면 자료가 내리고 화면이 턴 번호로 고른다, core/conversation/wait-line). 시드 목록 파일이
 * 없는 개발용 · e2e 길에서는 빈 목록으로 본다(맞장구 없이 점 셋 · '생각'만 — 첫 문장은 그대로 온다). 운영에서 빌드 추적이 빠져 없을 때
 * 조용히 빠지지 않게 처음 한 번 경고를 남긴다(이름만). 규격이 틀린 파일은 던진다.
 */
export function seedTalkWaitLines(opts: SeedListOptions = {}): string[] {
  try {
    return [...loadSeedList("talkWaitLines", opts).lines];
  } catch (error) {
    if (error instanceof SeedListError && error.reason === "missing") {
      if (!waitLinesMissingWarned) {
        waitLinesMissingWarned = true;
        console.warn(
          "맞장구 목록(seed/lists/talk-wait-lines.json)이 없어 맞장구 없이 기다립니다",
        );
      }
      return [];
    }
    throw error;
  }
}

// ── 회화 1~3단계 시드 목록 넷('AI 몫 넓힘' plan 정한 것 5 · spec 판 4 설계 6 · 9) ──
// seedHomophones 꼴: 파일이 없는 개발용 · e2e 길에서는 빈 목록으로 보고 처음 한 번 경고를 남긴다(이름만). 규격이 틀린 파일은 던진다.
// 빈 목록일 때 무엇을 하는지(신호 말 없음 · 상황 줄 대신 길 · 지어낸 경험 검사 안 함)는 부르는 쪽(묶음 2)이 정한다.

/** 없음 경고를 낸 목록(서버 인스턴스마다 목록마다 한 번). */
const talkListMissingWarned = new Set<SeedListName>();

function seedListOrEmpty<N extends SeedListName>(
  name: N,
  empty: () => SeedListOf<N>,
  opts: SeedListOptions,
): SeedListOf<N> {
  try {
    return loadSeedList(name, opts);
  } catch (error) {
    if (error instanceof SeedListError && error.reason === "missing") {
      if (!talkListMissingWarned.has(name)) {
        talkListMissingWarned.add(name);
        console.warn(
          `회화 목록(seed/${SEED_FILES[name]})이 없어 빈 목록으로 봅니다`,
        );
      }
      return empty();
    }
    throw error;
  }
}

const recordOf = <K extends string, V>(
  keys: readonly K[],
  value: (key: K) => V,
) => Object.fromEntries(keys.map((key) => [key, value(key)])) as Record<K, V>;

/** 신호 말 목록(C207): 자리 × 구간마다 긴 꼴 · 짧은 꼴. 없으면 모든 자리가 빈 목록이다. */
export function seedTalkCueLines(opts: SeedListOptions = {}): TalkCueLinesFile {
  return seedListOrEmpty(
    "talkCueLines",
    () =>
      recordOf(TALK_CUE_PLACES, () =>
        recordOf(TALK_CUE_BANDS, () => ({ long: [], short: [] })),
      ),
    opts,
  );
}

/** 상황 줄 · 상황 금지 구 목록(C209 · C211). 없으면 모든 자리 · 묶음이 빈 목록이다. */
export function seedTalkSituationLines(
  opts: SeedListOptions = {},
): TalkSituationLinesFile {
  return seedListOrEmpty(
    "talkSituationLines",
    () => ({
      lines: recordOf(TALK_SITUATION_PLACES, () => []),
      forbidden: recordOf(TALK_SITUATION_FORBIDDEN_SCOPES, () => []),
    }),
    opts,
  );
}

/** 감탄 · 수업 말 허용 낱말과 느낌 낱말(C209 · C211 (1)). 없으면 둘 다 빈 목록이다. */
export function seedTalkAllowedWords(
  opts: SeedListOptions = {},
): TalkAllowedWordsFile {
  return seedListOrEmpty(
    "talkAllowedWords",
    () => ({ allowed: [], feeling: [] }),
    opts,
  );
}

/** 지어낸 경험 꼴(정규화한 구, C211 (1)). 없으면 빈 목록이다. */
export function seedTalkMadeUpPhrases(opts: SeedListOptions = {}): string[] {
  return [
    ...seedListOrEmpty("talkMadeUpPhrases", () => ({ phrases: [] }), opts)
      .phrases,
  ];
}

/** 짧은 말 목록(C213 · iPad 버리는 듣기 plan 정한 것 6): 자리 × 단계 구간마다 줄. 없으면 모든 자리가 빈 목록이다. */
export function seedTalkShortLines(
  opts: SeedListOptions = {},
): TalkShortLinesFile {
  return seedListOrEmpty(
    "talkShortLines",
    () =>
      recordOf(TALK_SHORT_PLACES, () => recordOf(TALK_SHORT_BANDS, () => [])),
    opts,
  );
}

/**
 * 소리가 가까운 낱말 목록(C217 (1) — 회화 들은 글 귀띔, core/conversation/heard-hint): 표제어와 그 낱말로 잘못 들리는 낱말들. 없으면 빈 목록이다
 * (귀띔은 동음이의어 · 답 틀만 남는다).
 */
export function seedSoundAlikes(
  opts: SeedListOptions = {},
): SoundAlikesFile["words"] {
  return [...seedListOrEmpty("soundAlikes", () => ({ words: [] }), opts).words];
}

/** 그 단계 구간의 짧은 말(회화 화면 자료 talkShortLines — 화면이 자리마다 고른다). 목록이 없으면 자리마다 빈 목록이다. */
export function seedTalkShortLinesAt(
  level: number,
  opts: SeedListOptions = {},
): Record<TalkShortPlace, TalkListLine[]> {
  const file = seedTalkShortLines(opts);
  const band = bandOf(level);
  return recordOf(TALK_SHORT_PLACES, (place) => [...file[place][band]]);
}
