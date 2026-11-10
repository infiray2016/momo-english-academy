// 회화 1~3단계 시드 목록 넷 검사(6.4 '회화 시드 목록' 행 06:187, C207 · C209 · C211 — 'AI 몫 넓힘' plan 묶음 3).
// (1) 신호 말: 자리 × 단계 구간마다 긴 꼴 · 짧은 꼴 수, 물음표 없음, 문장 길이 상한 · 그 구간 첫 단계의 어휘 범위(허용 낱말 포함).
// (2) 상황 줄: 자리마다 줄 수, 같은 길이 · 어휘 검사(1~3단계 모두에 쓰므로 첫 단계 1), 상황 금지 구에 걸리지 않음.
// (3) 허용 낱말: 손으로 적지 않고 예 문장을 상황 차례 어휘 검사에 돌려 '걸린' 낱말로 만들므로, 첫 단계 범위 안 낱말은 둘 까닭이 없다.
// (4) 지어낸 경험 꼴: 1인칭 꼴이고, 신호 말 · 상황 줄이 이 꼴에 걸리지 않는다(카드의 안전한 대사는 check-talk 가 본다).
// (5) 짧은 말(C213 · iPad 버리는 듣기 plan 정한 것 6): 자리 × 단계 구간마다 줄 수, 신호 말과 같은 꼴(물음표 없음 · 문장 길이 상한 · 그 구간 첫 단계의
//     어휘 범위(허용 낱말 포함) · 지어낸 경험 꼴). 뜻(ko)이 비지 않음은 Zod 규격이 막는다.
// (6) 소리가 가까운 낱말(C217 (1) — 회화 들은 글 귀띔): 표제어는 어휘에 있는 원형이고, 가까운 낱말은 자기 자신 · 같은 원형의 활용형 · 같은 소리
//     낱말(동음이의어 묶음 몫) · 기능어(I · to · it — 문장마다 귀띔이 붙는다)가 아니다. 표제어 겹침 · 빈 목록은 Zod 규격이 막는다.
//     표제어와 같은 회화 단원의 단원 단어인 가까운 낱말(wash 의 watch — 아이가 정말 그 낱말을 말했을 수 있다)은 막고, 표제어 둘에 겹친 가까운
//     낱말(each: eat · beach — 귀띔이 앞 표제어 쪽으로만 난다)은 경고로 알린다(13절 C217 보완 · 코드 검토 rev-content-1 M-3).
// 꼴 수(셋 이상 · 하나 이상 · 둘 이상)는 시드 꼴 검사 상수이고 설정값이 아니다(06:187). 한국어 뜻 · 빈 목록 · 겹침은 Zod 규격이 먼저 막는다.
// DB · 파일을 읽지 않는 순수 함수다.
import {
  homophoneHeadOf,
  isSceneFunctionWord,
} from "@/core/conversation/child-kind";
import { normalizeSpoken } from "@/core/conversation/spoken";
import type { SeedIssue } from "@/core/seed/issue";
import type {
  HomophonesFile,
  SoundAlikesFile,
  TalkAllowedWordsFile,
  TalkCueLinesFile,
  TalkListLine,
  TalkMadeUpPhrasesFile,
  TalkShortLinesFile,
  TalkSituationLinesFile,
} from "@/core/seed/schema/reference";
import {
  bandInfo,
  LEVEL_MIN,
  SEED_FILES,
  TALK_CUE_BANDS,
  TALK_CUE_PLACES,
  TALK_SHORT_BANDS,
  TALK_SHORT_PLACES,
  TALK_SITUATION_PLACES,
  type TalkCueBand,
} from "@/core/seed/structure";
import {
  isEnglishSentence,
  type Lexicon,
  lemmasOf,
  sentenceWords,
  splitSentences,
  tokenize,
} from "@/core/seed/text";

/** 목록 꼴 수(06:187 '꼴 수는 시드 꼴 검사 상수') — 신호 말 긴 꼴 · 짧은 꼴, 상황 줄. */
export const TALK_CUE_LONG_MIN = 1;
export const TALK_CUE_SHORT_MIN = 2;
export const TALK_SITUATION_LINES_MIN = 3;
/** 짧은 말 자리 · 구간마다 줄 수 하한(plan 정한 것 6). 시드 꼴 검사 상수다. */
export const TALK_SHORT_LINES_MIN = 1;
/** 1인칭 낱말(지어낸 경험 꼴은 '선생님 자신'의 경험 · 기억 꼴이다, 06:187 (4)). 영어 문법 목록이라 코드 상수다. */
export const FIRST_PERSON_WORDS: ReadonlySet<string> = new Set([
  "i",
  "me",
  "my",
  "we",
  "us",
  "our",
]);

export type TalkListsFiles = {
  talkCueLines?: TalkCueLinesFile;
  talkSituationLines?: TalkSituationLinesFile;
  talkAllowedWords?: TalkAllowedWordsFile;
  talkMadeUpPhrases?: TalkMadeUpPhrasesFile;
};
/** 짧은 말 목록(C213). 1~3단계 목록 넷과 따로 두되 같은 검사가 본다. */
export type TalkShortListFiles = { talkShortLines?: TalkShortLinesFile };
/** 소리가 가까운 낱말 목록(C217 (1))과 그 검사가 견주는 동음이의어 묶음. 같은 검사가 본다. */
export type SoundAlikeListFiles = {
  soundAlikes?: SoundAlikesFile;
  homophones?: HomophonesFile;
};

export type TalkListsContext = {
  /** 어휘 범위를 읽는 사전. vocab 이 없으면 비워 어휘 검사(1)(2)(3)를 건너뛴다. */
  lexicon?: Lexicon;
  /** 회화 그 단계의 문장 길이 상한(level-specs sentenceMaxWords). 단계 규격이 없으면 undefined(길이는 보지 않는다). */
  maxWordsAt: (level: number) => number | undefined;
  /**
   * 회화 단원마다의 단원 단어(unit-specs 의 회화 단원 words). 주면 소리가 가까운 낱말 검사 (6)이 '표제어와 같은 단원의 단원 단어인 가까운 낱말'을
   * 막는다. 단원 규격이 없으면 비운다(그 검사를 건너뛴다).
   */
  talkUnitWords?: readonly (readonly string[])[];
};

/** 단계 구간 열쇠('1' · '2-3')의 첫 단계. */
export function firstLevelOfBand(band: TalkCueBand): number {
  return Number(band.split("-")[0]);
}

/**
 * 그 단계 어휘 범위 밖 낱말(소문자, 같은 낱말은 한 번). 축약형은 펼친 조각마다 본다(06:187 (3) '축약형을 펼친 범위 검사'):
 * 조각의 원형 하나라도 그 단계 이하면 범위 안이고, 아니면 표기나 원형이 허용 낱말(감탄 · 수업 말)에 있을 때만 범위 안이다.
 */
export function offbandListWords(
  text: string,
  lexicon: Lexicon,
  level: number,
  allowed: ReadonlySet<string>,
): string[] {
  const out: string[] = [];
  for (const match of lemmasOf(tokenize(text), lexicon)) {
    for (const part of match.parts) {
      const lower = part.text.toLowerCase();
      const inLevel = part.ids.some(
        (id) =>
          (lexicon.entries.get(id)?.level ?? Number.POSITIVE_INFINITY) <= level,
      );
      // 허용 낱말은 표기 그대로이거나 원형(활용형 · 축약형을 덮음: 'let' 이 "let's" · 'lets' 를 덮는다)
      const isAllowed =
        allowed.has(lower) ||
        part.ids.some((id) => allowed.has(id.toLowerCase()));
      if (!inLevel && !isAllowed && !out.includes(lower)) out.push(lower);
    }
  }
  return out;
}

/** 정규화한 글(normalizeSpoken)에 정규화한 구가 낱말 경계로 들어 있는가. */
function containsPhrase(normalized: string, phrase: string): boolean {
  const key = normalizeSpoken(phrase);
  return key !== "" && ` ${normalized} `.includes(` ${key} `);
}

/**
 * 글이 걸린 구(정규화 · 낱말 경계, 줄임꼴은 펼쳐 견준다 — 지어낸 경험 꼴 06:187 (4) · 상황 금지 구 (2)). 걸린 것이 없으면 빈 목록.
 */
export function phrasesIn(text: string, phrases: readonly string[]): string[] {
  const normalized = normalizeSpoken(text);
  return phrases.filter((p) => containsPhrase(normalized, p));
}

/** 한 줄의 길이 · 어휘 문제(없으면 빈 목록). */
function lineRangeProblems(
  en: string,
  level: number,
  ctx: TalkListsContext,
  allowed: ReadonlySet<string>,
): string[] {
  const problems: string[] = [];
  const max = ctx.maxWordsAt(level);
  if (max !== undefined)
    for (const sentence of splitSentences(en).filter(isEnglishSentence)) {
      const words = sentenceWords(sentence);
      if (words > max)
        problems.push(
          `문장 낱말 ${words}개가 회화 ${level}단계 상한 ${max}(3.6)를 넘는다`,
        );
    }
  if (ctx.lexicon) {
    const off = offbandListWords(en, ctx.lexicon, level, allowed);
    if (off.length > 0)
      problems.push(
        `회화 ${level}단계 어휘 범위 · 허용 낱말 밖 낱말 ${off.join(", ")} 가 있다`,
      );
  }
  return problems;
}

/** 시드 목록 넷 검사(06:187)와 짧은 말 검사(C213). 없는 파일의 몫은 건너뛴다(규격 파일 '없음'은 seed:validate 가 따로 막는다). */
export function checkTalkLists(
  files: TalkListsFiles & TalkShortListFiles & SoundAlikeListFiles,
  ctx: TalkListsContext,
): SeedIssue[] {
  const out: SeedIssue[] = [];
  const push = (
    rule: string,
    file: string,
    path: string,
    message: string,
    severity: SeedIssue["severity"] = "error",
  ): void => {
    out.push({ rule, severity, message, file, path });
  };
  const allowed = new Set(files.talkAllowedWords?.allowed ?? []);
  const madeUp = files.talkMadeUpPhrases?.phrases ?? [];

  /** 줄 하나에 공통으로 거는 지어낸 경험 꼴 검사. */
  const madeUpProblems = (en: string): string[] =>
    phrasesIn(en, madeUp).map(
      (p) => `지어낸 경험 꼴 '${p}' 에 걸린다(C211 (1))`,
    );

  // (1) 신호 말
  const cue = files.talkCueLines;
  if (cue) {
    const file = SEED_FILES.talkCueLines;
    for (const place of TALK_CUE_PLACES) {
      for (const band of TALK_CUE_BANDS) {
        const forms = cue[place][band];
        const at = `${place}.${band}`;
        if (forms.long.length < TALK_CUE_LONG_MIN)
          push(
            "talk-cue-lines",
            file,
            `${at}.long`,
            `신호 말 긴 꼴 ${forms.long.length}개가 ${TALK_CUE_LONG_MIN}개보다 적다`,
          );
        if (forms.short.length < TALK_CUE_SHORT_MIN)
          push(
            "talk-cue-lines",
            file,
            `${at}.short`,
            `신호 말 짧은 꼴 ${forms.short.length}개가 ${TALK_CUE_SHORT_MIN}개보다 적다`,
          );
        const level = firstLevelOfBand(band);
        for (const kind of ["long", "short"] as const) {
          forms[kind].forEach((line: TalkListLine, i) => {
            const problems = [
              ...(line.en.includes("?")
                ? ["물음표가 있다(신호 말은 질문이 아니다)"]
                : []),
              ...lineRangeProblems(line.en, level, ctx, allowed),
              ...madeUpProblems(line.en),
            ];
            if (problems.length > 0)
              push(
                "talk-cue-lines",
                file,
                `${at}.${kind}.${i}.en`,
                `신호 말 '${line.en}': ${problems.join(" · ")}`,
              );
          });
        }
      }
    }
  }

  // (2) 상황 줄 · 상황 금지 구
  const situation = files.talkSituationLines;
  if (situation) {
    const file = SEED_FILES.talkSituationLines;
    const forbiddenAll = situation.forbidden.all;
    const forbiddenNospeech = situation.forbidden.nospeech;
    for (const place of TALK_SITUATION_PLACES) {
      const lines = situation.lines[place];
      if (lines.length < TALK_SITUATION_LINES_MIN)
        push(
          "talk-situation-lines",
          file,
          `lines.${place}`,
          `상황 줄 ${lines.length}개가 ${TALK_SITUATION_LINES_MIN}개보다 적다`,
        );
      const forbidden =
        place === "nospeech"
          ? [...forbiddenAll, ...forbiddenNospeech]
          : forbiddenAll;
      lines.forEach((line, i) => {
        const problems = [
          ...lineRangeProblems(line.en, LEVEL_MIN, ctx, allowed),
          ...phrasesIn(line.en, forbidden).map(
            (p) => `상황 금지 구 '${p}' 에 걸린다`,
          ),
          ...madeUpProblems(line.en),
        ];
        if (problems.length > 0)
          push(
            "talk-situation-lines",
            file,
            `lines.${place}.${i}.en`,
            `상황 줄 '${line.en}': ${problems.join(" · ")}`,
          );
      });
    }
  }

  // (3) 허용 낱말: 첫 단계 어휘 범위 안 낱말은 범위 검사에 걸리지 않으므로 목록에 둘 까닭이 없다(손으로 적은 낱말)
  const words = files.talkAllowedWords;
  if (words && ctx.lexicon) {
    const lexicon = ctx.lexicon;
    words.allowed.forEach((word, i) => {
      if (offbandListWords(word, lexicon, LEVEL_MIN, new Set()).length === 0)
        push(
          "talk-allowed-words",
          SEED_FILES.talkAllowedWords,
          `allowed.${i}`,
          `허용 낱말 ${word} 는 회화 ${LEVEL_MIN}단계 어휘 범위 안이라 범위 검사에 걸리지 않는다(허용 목록은 걸린 낱말로 만든다)`,
        );
    });
  }

  // (4) 지어낸 경험 꼴: 1인칭 꼴
  const phrases = files.talkMadeUpPhrases;
  if (phrases) {
    phrases.phrases.forEach((phrase, i) => {
      if (!phrase.split(" ").some((w) => FIRST_PERSON_WORDS.has(w)))
        push(
          "talk-made-up-phrases",
          SEED_FILES.talkMadeUpPhrases,
          `phrases.${i}`,
          `지어낸 경험 꼴 '${phrase}' 에 1인칭 낱말(${[...FIRST_PERSON_WORDS].join(" · ")})이 없다`,
        );
    });
  }

  // (5) 짧은 말: 신호 말과 같은 꼴, 어휘 · 길이는 그 구간의 첫 단계(bandInfo first)로 본다
  const short = files.talkShortLines;
  if (short) {
    const file = SEED_FILES.talkShortLines;
    for (const place of TALK_SHORT_PLACES) {
      for (const band of TALK_SHORT_BANDS) {
        const lines = short[place][band];
        const at = `${place}.${band}`;
        if (lines.length < TALK_SHORT_LINES_MIN)
          push(
            "talk-short-lines",
            file,
            at,
            `짧은 말 ${lines.length}개가 ${TALK_SHORT_LINES_MIN}개보다 적다`,
          );
        const level = bandInfo(band).first;
        lines.forEach((line, i) => {
          const problems = [
            ...(line.en.includes("?")
              ? ["물음표가 있다(짧은 말은 질문이 아니다)"]
              : []),
            ...lineRangeProblems(line.en, level, ctx, allowed),
            ...madeUpProblems(line.en),
          ];
          if (problems.length > 0)
            push(
              "talk-short-lines",
              file,
              `${at}.${i}.en`,
              `짧은 말 '${line.en}': ${problems.join(" · ")}`,
            );
        });
      }
    }
  }

  // (6) 소리가 가까운 낱말: 표제어는 어휘 원형, 가까운 낱말은 자기 자신 · 활용형 · 같은 소리 낱말 · 기능어가 아니다
  const alike = files.soundAlikes;
  if (alike) {
    const file = SEED_FILES.soundAlikes;
    const headOf = homophoneHeadOf(files.homophones?.groups ?? []);
    const lexicon = ctx.lexicon;
    const units = (ctx.talkUnitWords ?? []).map(
      (words) => new Set(words.map((w) => w.toLowerCase())),
    );
    /** 가까운 낱말 → 그 낱말을 처음 적은 표제어(표제어 둘에 겹친 낱말 찾기). */
    const firstHead = new Map<string, string>();
    alike.words.forEach((entry, i) => {
      if (lexicon && !lexicon.entries.has(entry.word))
        push(
          "sound-alikes",
          file,
          `words.${i}.word`,
          `표제어 ${entry.word} 가 어휘(vocab)에 없다(원형으로 적는다)`,
        );
      entry.alikes.forEach((word, j) => {
        const problems = [
          ...(word === entry.word ? ["표제어와 같은 낱말이다"] : []),
          ...(word !== entry.word &&
          lexicon?.forms.get(word)?.includes(entry.word) === true
            ? ["표제어의 활용형이다(원형으로 이미 맞댄다)"]
            : []),
          ...(word !== entry.word && headOf(word) === headOf(entry.word)
            ? ["표제어와 같은 소리 낱말이다(동음이의어 묶음에 둔다)"]
            : []),
          ...(isSceneFunctionWord(word)
            ? ["기능어다(문장마다 귀띔이 붙는다)"]
            : []),
          ...(word !== entry.word &&
          units.some((unit) => unit.has(entry.word) && unit.has(word))
            ? [
                "표제어와 같은 단원의 단원 단어다(아이가 정말 그 낱말을 말했을 수 있다)",
              ]
            : []),
        ];
        const other = firstHead.get(word);
        if (other === undefined) firstHead.set(word, entry.word);
        else if (other !== entry.word)
          push(
            "sound-alikes",
            file,
            `words.${i}.alikes.${j}`,
            `소리가 가까운 낱말 '${word}'(표제어 ${entry.word})가 표제어 ${other} 에도 있다(귀띔이 한쪽으로만 난다 — 더 가까운 쪽에만 둔다)`,
            "warning",
          );
        if (problems.length > 0)
          push(
            "sound-alikes",
            file,
            `words.${i}.alikes.${j}`,
            `소리가 가까운 낱말 '${word}'(표제어 ${entry.word}): ${problems.join(" · ")}`,
          );
      });
    });
  }
  return out;
}
