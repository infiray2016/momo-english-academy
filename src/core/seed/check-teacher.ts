// 회화 선생님 몫의 시드 검사(6.4 '선생님 이름' 행 · 명단 자료 행, C122 · C130, AC-19a · AC-19e 의 시드 몫).
// (1) '선생님 이름': 회화 시나리오 카드 · 회화 평가 카드 · 선생님 이야기의 모든 글 칸에 'Tori' · '토리'와 명단의 영어 · 한글 이름이 없다.
//     영어는 대소문자를 가리지 않고 낱말 경계로, 한국어는 앞 글자가 한글이 아니면 뒤에 무엇이 붙어도 걸고 이름으로 시작하는 보통 낱말만 뺀다(C132 (1)).
//     회화 영역의 단원 규격 주제 · 단계 규격 can-do 글과 대화 방식(C135)도 본다(C132 (2)). 명단이 검사 입력이라 명단을 늘리면 모든 시드를 다시 본다.
//     읽기 · 쓰기 · 말하기 글은 이 검사가 보지 않는다(토리는 그 글의 등장인물, C122). {TEACHER} 는 틀 자리 검사(talk-placeholder)가 막는다.
// (2) 명단 검사: 키 · 이름 겹침, vocab 단어인 영어 이름, 성격 낱말 셋, AI 성격 글 · 인사 · 소개 · 색 대비. (3) 채워진 모델 · 초상의 파일 있음.
// DB · 파일 시스템을 읽지 않는 순수 함수다(파일 있음은 부르는 쪽이 함수로 넘긴다).
import type { Report, SeedIssue } from "@/core/seed/issue";
import type { ForbiddenFile } from "@/core/seed/schema/reference";
import type { TeachersFile } from "@/core/seed/schema/teachers";
import {
  type Area,
  OLD_TEACHER_NAMES,
  SEED_FILES,
  TEACHER_INTRO_LINES,
  TEACHER_LABEL_CONTRAST_MIN,
  TEACHER_PERSONA_MAX_SENTENCES,
  TEACHER_TRAITS,
  type TextFragment,
  WCAG,
} from "@/core/seed/structure";
import {
  forbiddenHits,
  type Lexicon,
  placeholdersIn,
  sentenceWords,
  splitSentences,
} from "@/core/seed/text";

// ── '선생님 이름' 검사 ───────────────────────────────────────────

/** 막는 이름(옛 이름 Tori · 토리 + 명단의 영어 · 한글 이름). */
export type TeacherNames = {
  readonly en: readonly string[];
  readonly ko: readonly string[];
};

/** 명단(없거나 깨졌으면 undefined)에서 막는 이름을 만든다. 옛 이름은 늘 든다. */
export function teacherNamesOf(roster: TeachersFile | undefined): TeacherNames {
  const en = new Map<string, string>();
  const ko = new Set<string>();
  for (const name of OLD_TEACHER_NAMES.en) en.set(name.toLowerCase(), name);
  for (const name of OLD_TEACHER_NAMES.ko) ko.add(name);
  for (const t of roster?.teachers ?? []) {
    if (t.nameEn !== "" && !en.has(t.nameEn.toLowerCase()))
      en.set(t.nameEn.toLowerCase(), t.nameEn);
    if (t.nameKo !== "") ko.add(t.nameKo);
  }
  return { en: [...en.values()], ko: [...ko] };
}

/**
 * 이름으로 시작하는 보통 낱말(C132 (1)). 한국어 이름은 앞 글자가 한글이 아니면 뒤에 무엇이 붙어도 이름으로 보되(토리라고 · 미나이고 · 미나쌤 · 받침 줄임 토린 …),
 * 그 자리에서 이 낱말들 가운데 하나가 시작하면 뺀다(미나리 · 토리노 · 리오넬 …). 막는 쪽으로 틀린다 — 헛걸림은 칸을 다시 만들면 되고, 놓침은 아이 화면에 다른 선생님 이름이 나간다.
 * 앞부분이 맞으면 빼므로 '이름 + 조사'로도 읽히는 낱말은 두지 않는다('토리이'는 '토리이야기' · '토리이랑'을, '미나토'는 '미나토 구'처럼 이름 뒤 낱말을 가린다).
 * 명단에 이름을 더하면 그 이름으로 시작하는 보통 낱말을 여기에 더한다.
 */
export const KO_NAME_WORD_EXCEPTIONS = [
  "미나리",
  "토리노",
  "리오넬",
  "리오데자네이루",
  "리옹",
] as const;

const HANGUL_SYLLABLE = /[가-힣]/;
/** 유니코드 한글 음절 표의 시작 '가'와 받침 수(받침 없음 포함 28, 유니코드 표 구조라 설계 숫자 아님). */
const HANGUL_BASE = "가".charCodeAt(0);
const HANGUL_FINALS = "갛".charCodeAt(0) - HANGUL_BASE + 1;
/** 받침 없는 끝 음절에 붙는 줄임 받침 ㄴ · ㄹ 의 받침 번호(유니코드 한글 음절 표의 받침 차례라 설계 숫자 아님). */
const FINAL_NIEUN = "간".charCodeAt(0) - HANGUL_BASE;
const FINAL_RIEUL = "갈".charCodeAt(0) - HANGUL_BASE;
const SHORTENED_FINALS: readonly number[] = [FINAL_NIEUN, FINAL_RIEUL];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasEnglishName(text: string, name: string): boolean {
  return new RegExp(`(?<![A-Za-z])${escapeRegExp(name)}(?![A-Za-z])`, "i").test(
    text,
  );
}

/** 한글 음절의 받침을 뗀 꼴(초성 · 중성)과 받침 번호. 한글 음절이 아니면 undefined. */
function syllableParts(
  ch: string,
): { body: number; final: number } | undefined {
  if (!HANGUL_SYLLABLE.test(ch)) return undefined;
  const code = ch.charCodeAt(0) - HANGUL_BASE;
  return {
    body: Math.floor(code / HANGUL_FINALS),
    final: code % HANGUL_FINALS,
  };
}

/**
 * text 의 at 자리에서 이름이 시작하는가. 마지막 음절에 받침이 없으면 줄임 받침 ㄴ · ㄹ 이 붙은 꼴도 이름으로 본다(토리 + ㄴ = '토린', 토리 + ㄹ = '토릴').
 * 다른 받침은 받지 않는다('미남' · '미납' · '토림'). '리온'(리오 + ㄴ)은 '토린'과 같은 줄임 꼴이라 걸린다(막는 쪽, C132 (1)). 이름의 마지막 음절에 받침이 있으면 같은 받침만 받는다.
 */
function nameAt(text: string, at: number, name: string): boolean {
  const last = name.length - 1;
  if (text.slice(at, at + last) !== name.slice(0, last)) return false;
  const want = syllableParts(name.charAt(last));
  const got = syllableParts(text.charAt(at + last));
  if (!want || !got) return text.charAt(at + last) === name.charAt(last);
  if (want.body !== got.body) return false;
  if (want.final !== 0) return want.final === got.final;
  return got.final === 0 || SHORTENED_FINALS.includes(got.final);
}

function hasKoreanName(text: string, name: string): boolean {
  if (name === "") return false;
  for (let at = 0; at + name.length <= text.length; at++) {
    if (!nameAt(text, at, name)) continue;
    if (at > 0 && HANGUL_SYLLABLE.test(text.charAt(at - 1))) continue;
    const rest = text.slice(at);
    if (KO_NAME_WORD_EXCEPTIONS.some((word) => rest.startsWith(word))) continue;
    return true;
  }
  return false;
}

/** 글 하나에 든 막는 이름(영어 이름 먼저, 명단 차례). 영어 이름은 한국어 칸에서도, 한글 이름은 영어 칸에서도 찾는다. */
export function teacherNameHits(text: string, names: TeacherNames): string[] {
  return [
    ...names.en.filter((name) => name !== "" && hasEnglishName(text, name)),
    ...names.ko.filter((name) => name !== "" && hasKoreanName(text, name)),
  ];
}

/** 글 조각마다 막는 이름이 있으면 그 칸 오류 `teacher-name`(6.4 '선생님 이름'). */
export function checkTeacherNames(
  fragments: readonly TextFragment[],
  names: TeacherNames,
  report: Report,
): void {
  for (const fragment of fragments) {
    const hits = teacherNameHits(fragment.text, names);
    if (hits.length === 0) continue;
    report(
      "teacher-name",
      fragment.path,
      `선생님 이름 ${hits.map((h) => `'${h}'`).join(" · ")} 이 있다 — 회화 카드 · 회화 평가 카드 · 선생님 이야기에는 선생님 이름을 두지 않는다(6.4 · C130)`,
    );
  }
}

/** 규격 글을 보는 영역(회화). */
const TALK_AREA: Area = "talk";

/**
 * 회화 영역 규격 글의 '선생님 이름'(C132 (2)): 단원 규격 주제(홈 카드에 나감)와 단계 규격 can-do · 대화 방식(AI 가변부로 감, C135).
 * 읽기 · 쓰기 · 말하기 행은 보지 않는다(그 행에는 대화 방식 칸이 없다). 결과는 규격 파일 오류(칸 키 없음)다.
 */
export function checkTeacherNamesInSpecs(
  levelSpecs: readonly { area: string; canDo: string; mode?: string }[],
  unitSpecs: readonly { area: string; topic: string }[],
  names: TeacherNames,
): SeedIssue[] {
  const out: SeedIssue[] = [];
  const fragments = (file: string, list: readonly TextFragment[]): void => {
    checkTeacherNames(list, names, (rule, path, message) => {
      out.push({ rule, severity: "error", message, file, path });
    });
  };
  fragments(
    SEED_FILES.levelSpecs,
    levelSpecs.flatMap((s, i) =>
      s.area === TALK_AREA
        ? [
            {
              path: `levelSpecs.${i}.canDo`,
              role: "ko" as const,
              text: s.canDo,
            },
            ...(s.mode === undefined
              ? []
              : [
                  {
                    path: `levelSpecs.${i}.mode`,
                    role: "ko" as const,
                    text: s.mode,
                  },
                ]),
          ]
        : [],
    ),
  );
  fragments(
    SEED_FILES.unitSpecs,
    unitSpecs.flatMap((u, i) =>
      u.area === TALK_AREA
        ? [{ path: `unitSpecs.${i}.topic`, role: "ko" as const, text: u.topic }]
        : [],
    ),
  );
  return out;
}

// ── 명단 검사 ────────────────────────────────────────────────────

export type TeacherRosterContext = {
  lexicon: Lexicon;
  forbidden: ForbiddenFile;
  /** 인사가 따르는 문장 길이 상한(회화 1단계 규격, 3.6). 규격이 없으면 보지 않는다. */
  greetingMaxWords?: number;
};

/** sRGB 한 채널(0~255)의 선형 값(WCAG 2 상대 휘도 식). */
function linear(value: number): number {
  const c = value / WCAG.channelMax;
  return c <= WCAG.linearKnee
    ? c / WCAG.linearSlope
    : ((c + WCAG.gammaOffset) / (1 + WCAG.gammaOffset)) ** WCAG.gamma;
}

/** WCAG 상대 휘도(`#rrggbb`). */
function luminance(hex: string): number {
  const [r, g, b] = (hex.match(/[0-9a-fA-F]{2}/g) ?? []).map((h) =>
    linear(Number.parseInt(h, 16)),
  );
  return (
    WCAG.weights.r * (r ?? 0) +
    WCAG.weights.g * (g ?? 0) +
    WCAG.weights.b * (b ?? 0)
  );
}

/** 두 색의 WCAG 대비(1~21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + WCAG.flare) / (lo + WCAG.flare);
}

/**
 * 명단 자료 검사(6.4 명단 자료 행 · AC-19a 의 시드 몫). 규칙은 `teacher-roster`, 경로는 `teachers.<차례>.<칸>`.
 * 칸 꼴(키 소문자 · 한글만 · 영문자만 · vrm · 높이 0~2 · 출처 빈칸)은 Zod 규격이 먼저 막는다.
 */
export function checkTeacherRoster(
  file: TeachersFile,
  ctx: TeacherRosterContext,
): SeedIssue[] {
  const out: SeedIssue[] = [];
  const report = (path: string, message: string) => {
    out.push({
      rule: "teacher-roster",
      severity: "error",
      message,
      file: SEED_FILES.teachers,
      path,
    });
  };
  const seen = {
    key: new Set<string>(),
    ko: new Set<string>(),
    en: new Set<string>(),
  };
  file.teachers.forEach((t, i) => {
    const at = (key: string) => `teachers.${i}.${key}`;
    if (seen.key.has(t.key)) report(at("key"), `키 ${t.key} 가 겹친다`);
    seen.key.add(t.key);
    if (seen.ko.has(t.nameKo))
      report(at("nameKo"), `한글 이름 ${t.nameKo} 이 겹친다`);
    seen.ko.add(t.nameKo);
    const en = t.nameEn.toLowerCase();
    if (seen.en.has(en))
      report(at("nameEn"), `영어 이름 ${t.nameEn} 이 겹친다(대소문자 무시)`);
    seen.en.add(en);
    if (ctx.lexicon.forms.has(en)) {
      report(
        at("nameEn"),
        `영어 이름 ${t.nameEn} 이 vocab 낱말이다(아이 말 · 일치율과 섞인다)`,
      );
    }

    const lines = t.introKo.split("\n").filter((l) => l.trim() !== "");
    if (
      lines.length < TEACHER_INTRO_LINES.min ||
      lines.length > TEACHER_INTRO_LINES.max
    ) {
      report(
        at("introKo"),
        `소개가 ${lines.length}줄이라 ${TEACHER_INTRO_LINES.min}~${TEACHER_INTRO_LINES.max}줄 밖이다`,
      );
    }
    if (t.traitsKo.length !== TEACHER_TRAITS) {
      report(
        at("traitsKo"),
        `성격 낱말이 ${t.traitsKo.length}개라 ${TEACHER_TRAITS}개가 아니다`,
      );
    }

    const persona = splitSentences(t.personaEn).length;
    if (persona > TEACHER_PERSONA_MAX_SENTENCES) {
      report(
        at("personaEn"),
        `AI 성격 글이 ${persona}문장이라 ${TEACHER_PERSONA_MAX_SENTENCES}문장을 넘는다`,
      );
    }
    for (const p of placeholdersIn(t.personaEn))
      report(at("personaEn"), `AI 성격 글에 틀 자리 ${p} 를 쓸 수 없다`);

    if (t.greetingEn.includes("?"))
      report(at("greetingEn"), "인사에 물음표가 있다(답할 길이 없다)");
    if (ctx.greetingMaxWords !== undefined) {
      for (const sentence of splitSentences(t.greetingEn)) {
        const words = sentenceWords(sentence);
        if (words > ctx.greetingMaxWords) {
          report(
            at("greetingEn"),
            `인사 문장 낱말 ${words}개가 1단계 상한 ${ctx.greetingMaxWords}(3.6)를 넘는다: ${sentence}`,
          );
        }
      }
    }
    for (const key of ["personaEn", "greetingEn"] as const) {
      for (const hit of forbiddenHits(t[key], ctx.forbidden)) {
        const what =
          hit.kind === "pattern"
            ? `금지 정규식 ${hit.id}(${hit.category})`
            : `금지어 ${hit.match}`;
        report(at(key), `${what} 에 걸린다`);
      }
    }

    const ratio = contrastRatio(t.color.accent, t.color.room);
    if (ratio < TEACHER_LABEL_CONTRAST_MIN) {
      report(
        at("color"),
        `이름표 색 ${t.color.accent} 와 창 바탕 ${t.color.room} 의 대비 ${ratio.toFixed(2)}:1 이 ${TEACHER_LABEL_CONTRAST_MIN}:1 보다 낮다`,
      );
    }

    if (t.model && t.source.reduction === undefined)
      report(at("source.reduction"), "모델이 있는데 줄인 방법이 비었다");
  });
  return out;
}

/**
 * 채워진 모델 · 초상 칸의 파일이 있는가(6.4 자산 검사의 '파일 있음' 몫). 칸이 비면 보지 않는다(선생님 화면 plan 때 필수).
 * 크기 · 해시 · VRM 메타 검사는 선생님 화면 plan 의 자산 검사가 더한다. 있음 판정은 부르는 쪽(public/ 기준 경로)이 넘긴다.
 */
export function checkTeacherAssets(
  file: TeachersFile,
  assetExists: (path: string) => boolean,
): SeedIssue[] {
  const out: SeedIssue[] = [];
  const report = (path: string, message: string) => {
    out.push({
      rule: "teacher-asset",
      severity: "error",
      message,
      file: SEED_FILES.teachers,
      path,
    });
  };
  file.teachers.forEach((t, i) => {
    if (t.model && !assetExists(t.model.path))
      report(`teachers.${i}.model.path`, `모델 파일 ${t.model.path} 가 없다`);
    if (t.portrait && !assetExists(t.portrait.path))
      report(
        `teachers.${i}.portrait.path`,
        `초상 파일 ${t.portrait.path} 가 없다`,
      );
  });
  return out;
}
