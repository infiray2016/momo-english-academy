// 회화 선생님 몫의 시드 검사(6.4 '선생님 이름' 행 · 명단 자료 행, C122 · C130, AC-19a · AC-19e 의 시드 몫).
// (1) '선생님 이름': 회화 시나리오 카드 · 회화 평가 카드 · 선생님 이야기의 모든 글 칸에 'Tori' · '토리'와 명단의 영어 · 한글 이름이 없다.
//     영어는 대소문자를 가리지 않고 낱말 경계로, 한국어는 앞 글자가 한글이 아니면 뒤에 무엇이 붙어도 걸고 이름으로 시작하는 보통 낱말만 뺀다(C132 (1)).
//     회화 영역의 단원 규격 주제 · 단계 규격 can-do 글과 대화 방식(C135)도 본다(C132 (2)). 명단이 검사 입력이라 명단을 늘리면 모든 시드를 다시 본다.
//     읽기 · 쓰기 · 말하기 글은 이 검사가 보지 않는다(토리는 그 글의 등장인물, C122). {TEACHER} 는 틀 자리 검사(talk-placeholder)가 막는다.
// (2) 명단 검사: 키 · 이름 겹침, vocab 단어인 영어 이름, 성격 낱말 셋, AI 성격 글 · 인사 · 소개 · 이름표 대비 · 빼는 낱말.
// (3) 자산 검사(AC-19k): 모델 · 초상 파일 있음 · 바이트 · 해시 · 크기 상한 · VRM 메타 · 표정 · 뼈 · 원본 없음 · 출처 문서.
// DB · 파일 시스템을 읽지 않는 순수 함수다(파일 읽기 · 해시는 부르는 쪽이 io 로 넘긴다).
import type { Report, SeedIssue } from "@/core/seed/issue";
import type { ForbiddenFile } from "@/core/seed/schema/reference";
import type { TeachersFile } from "@/core/seed/schema/teachers";
import {
  type Area,
  BYTES_PER_KB,
  BYTES_PER_MB,
  OLD_TEACHER_NAMES,
  SEED_FILES,
  TEACHER_ASSET_DIR,
  TEACHER_ASSET_HASH_CHARS,
  TEACHER_INTRO_LINES,
  TEACHER_LABEL_CONTRAST_MIN,
  TEACHER_LABEL_TEXT,
  TEACHER_PERSONA_MAX_SENTENCES,
  TEACHER_TRAITS,
  type TextFragment,
  VRM_REQUIRED_BONES,
  VRM_REQUIRED_EXPRESSIONS,
  WCAG,
} from "@/core/seed/structure";
import {
  forbiddenHits,
  type Lexicon,
  placeholdersIn,
  sentenceWords,
  splitSentences,
} from "@/core/seed/text";
import { parseGlb, vrmFactsOf } from "@/core/seed/vrm";

// ── '선생님 이름' 검사 ───────────────────────────────────────────

/** 막는 이름(옛 이름 Tori · 토리 + 명단의 영어 · 한글 이름)과 한글 이름으로 시작하는 보통 낱말(빼는 낱말). */
export type TeacherNames = {
  readonly en: readonly string[];
  readonly ko: readonly string[];
  /**
   * 이름으로 시작하는 보통 낱말(C132 (1)). 한국어 이름은 앞 글자가 한글이 아니면 뒤에 무엇이 붙어도 이름으로 보되(토리라고 · 미나이고 · 미나쌤 · 받침 줄임 토린 …),
   * 그 자리에서 이 낱말들 가운데 하나가 시작하면 뺀다(미나리 · 토리노 · 리오넬 …). 막는 쪽으로 틀린다 — 헛걸림은 칸을 다시 만들면 되고, 놓침은 아이 화면에 다른 선생님 이름이 나간다.
   * 앞부분이 맞으면 빼므로 '이름 + 조사'로도 읽히는 낱말은 두지 않는다('토리이'는 '토리이야기' · '토리이랑'을, '미나토'는 '미나토 구'처럼 이름 뒤 낱말을 가린다).
   * 옛 이름 몫은 OLD_TEACHER_NAMES.koWordExceptions(코드), 명단 이름 몫은 명단 칸 nameKoWordExceptions 다(C141 · 장부 N-3 — 명단을 늘려도 코드 고침 없음).
   */
  readonly koExceptions: readonly string[];
};

/** 명단(없거나 깨졌으면 undefined)에서 막는 이름 · 빼는 낱말을 만든다. 옛 이름 몫은 늘 든다. */
export function teacherNamesOf(roster: TeachersFile | undefined): TeacherNames {
  const en = new Map<string, string>();
  const ko = new Set<string>();
  const koExceptions = new Set<string>(OLD_TEACHER_NAMES.koWordExceptions);
  for (const name of OLD_TEACHER_NAMES.en) en.set(name.toLowerCase(), name);
  for (const name of OLD_TEACHER_NAMES.ko) ko.add(name);
  for (const t of roster?.teachers ?? []) {
    if (t.nameEn !== "" && !en.has(t.nameEn.toLowerCase()))
      en.set(t.nameEn.toLowerCase(), t.nameEn);
    if (t.nameKo !== "") ko.add(t.nameKo);
    for (const word of t.nameKoWordExceptions) koExceptions.add(word);
  }
  return { en: [...en.values()], ko: [...ko], koExceptions: [...koExceptions] };
}

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

function hasKoreanName(
  text: string,
  name: string,
  exceptions: readonly string[],
): boolean {
  if (name === "") return false;
  for (let at = 0; at + name.length <= text.length; at++) {
    if (!nameAt(text, at, name)) continue;
    if (at > 0 && HANGUL_SYLLABLE.test(text.charAt(at - 1))) continue;
    const rest = text.slice(at);
    if (exceptions.some((word) => rest.startsWith(word))) continue;
    return true;
  }
  return false;
}

/** 글 하나에 든 막는 이름(영어 이름 먼저, 명단 차례). 영어 이름은 한국어 칸에서도, 한글 이름은 영어 칸에서도 찾는다. */
export function teacherNameHits(text: string, names: TeacherNames): string[] {
  return [
    ...names.en.filter((name) => name !== "" && hasEnglishName(text, name)),
    ...names.ko.filter(
      (name) => name !== "" && hasKoreanName(text, name, names.koExceptions),
    ),
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

    const ratio = contrastRatio(t.color.accent, TEACHER_LABEL_TEXT);
    if (ratio < TEACHER_LABEL_CONTRAST_MIN) {
      report(
        at("color"),
        `이름표(accent 바탕 · 종이색 글자) 대비: ${t.color.accent} ↔ ${TEACHER_LABEL_TEXT} 가 ${ratio.toFixed(2)}:1 이라 ${TEACHER_LABEL_CONTRAST_MIN}:1 보다 낮다`,
      );
    }

    for (const word of t.nameKoWordExceptions) {
      if (word.length <= t.nameKo.length) {
        report(
          at("nameKoWordExceptions"),
          `빼는 낱말 ${word} 가 이름 ${t.nameKo} 보다 길지 않다(이름 자체를 빼게 된다)`,
        );
      } else if (!nameAt(word, 0, t.nameKo)) {
        report(
          at("nameKoWordExceptions"),
          `빼는 낱말 ${word} 가 이름 ${t.nameKo} 자리에서 걸리지 않는다`,
        );
      }
    }
  });
  return out;
}

// ── 자산 검사 ────────────────────────────────────────────────────

/**
 * 자산 검사가 읽는 것(부르는 쪽 — scripts/seed-validate.ts 가 저장소 뿌리의 public/ · CREDITS.md · node:crypto 로 만든다).
 * 경로는 public/ 기준이다. limits 는 읽은 시드 settings.json 의 talk.teacher_model_max_mb · talk.teacher_portrait_max_kb(12절 '자산 검사(CI)가 읽는다').
 */
export type TeacherAssetIo = {
  /** public/ 기준 경로의 파일 바이트(없으면 undefined). */
  read(path: string): Uint8Array | undefined;
  sha256(bytes: Uint8Array): string;
  /** public/ 아래 모든 .vrm(public/ 기준 경로). */
  publicVrmFiles: readonly string[];
  /** 출처 문서 CREDITS.md 글(없으면 undefined). */
  credits: string | undefined;
  limits: { modelMaxMb: number; portraitMaxKb: number };
};

/** 명단의 허용 설정 글 꼴(source.permissions — VRM 0.x 메타 두 칸). */
function permissionsOf(meta: {
  allowedUserName?: string;
  commercialUssageName?: string;
}): string {
  return `allowedUserName=${meta.allowedUserName ?? ""} · commercialUssageName=${meta.commercialUssageName ?? ""}`;
}

/** 자산 파일 이름 teachers/<키>.<SHA-256 앞 8자>.<확장자>(이름에 내용 해시 — 오래 캐시해도 바뀐 파일은 새 이름). */
export function teacherAssetPath(
  key: string,
  sha256: string,
  ext: "vrm" | "webp",
): string {
  return `${TEACHER_ASSET_DIR}/${key}.${sha256.slice(0, TEACHER_ASSET_HASH_CHARS)}.${ext}`;
}

/**
 * 선생님 자산 검사(6.4 자산 검사 · AC-19k). 규칙 `teacher-asset`, 경로 `teachers.<차례>.<칸>`(명단 밖 파일 · 출처 문서 없음은 `teachers`).
 * (a) 모델 · 초상 파일 있음 (b) 모델 바이트 · SHA-256, 초상 바이트가 명단과 같음, 모델 경로는 teachers/<키>.<명단 해시 앞 8자>.vrm ·
 * 초상 경로는 teachers/<키>.<읽은 바이트 해시 앞 8자>.webp (c) 크기 상한(10진 MB · KB)
 * (d) VRM 0.x · licenseName · 허용 설정 · 조건 주소 둘 · 표정 · 뼈 (e) public/ 의 .vrm 은 명단 모델뿐이고 원본 해시와 다름
 * (f) CREDITS.md 에 원 제작자 · 배포처 · 원본 제목 · 원본 SHA-256 · 줄인 파일 SHA-256 · 줄인 방법이 글자 그대로 있음.
 */
export function checkTeacherAssets(
  file: TeachersFile,
  io: TeacherAssetIo,
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
  // 상한 바이트는 정수로 반올림한다(소수 MB · KB 의 곱셈 오차로 1바이트 모자라지 않게).
  const modelMax = Math.round(io.limits.modelMaxMb * BYTES_PER_MB);
  const portraitMax = Math.round(io.limits.portraitMaxKb * BYTES_PER_KB);
  const originals = new Set(file.teachers.map((t) => t.source.originalSha256));
  const modelPaths = new Set(file.teachers.map((t) => t.model.path));

  file.teachers.forEach((t, i) => {
    const at = (key: string) => `teachers.${i}.${key}`;

    const modelName = teacherAssetPath(t.key, t.model.sha256, "vrm");
    if (t.model.path !== modelName)
      report(
        at("model.path"),
        `모델 경로 ${t.model.path} 가 ${modelName} 꼴이 아니다(teachers/<키>.<명단 SHA-256 앞 ${TEACHER_ASSET_HASH_CHARS}자>.vrm)`,
      );
    const model = io.read(t.model.path);
    if (model === undefined) {
      report(at("model.path"), `모델 파일 ${t.model.path} 가 없다`);
    } else {
      if (model.length !== t.model.bytes)
        report(
          at("model.bytes"),
          `모델 ${t.model.path} 가 ${model.length}바이트라 명단 ${t.model.bytes} 와 다르다`,
        );
      const digest = io.sha256(model);
      if (digest !== t.model.sha256)
        report(
          at("model.sha256"),
          `모델 ${t.model.path} 의 SHA-256 ${digest} 가 명단과 다르다`,
        );
      if (originals.has(digest))
        report(
          at("model.sha256"),
          `모델 ${t.model.path} 가 원본 VRM 이다(원본은 저장소에 넣지 않는다 — 줄인 파일만)`,
        );
      if (model.length > modelMax)
        report(
          at("model.bytes"),
          `모델 ${t.model.path} ${model.length}바이트가 talk.teacher_model_max_mb ${io.limits.modelMaxMb}MB 를 넘는다`,
        );
      checkVrm(model, t, at, report);
    }

    const portrait = io.read(t.portrait.path);
    if (portrait === undefined) {
      report(at("portrait.path"), `초상 파일 ${t.portrait.path} 가 없다`);
    } else {
      const portraitName = teacherAssetPath(t.key, io.sha256(portrait), "webp");
      if (t.portrait.path !== portraitName)
        report(
          at("portrait.path"),
          `초상 경로 ${t.portrait.path} 가 ${portraitName} 꼴이 아니다(teachers/<키>.<읽은 바이트 SHA-256 앞 ${TEACHER_ASSET_HASH_CHARS}자>.webp)`,
        );
      if (portrait.length !== t.portrait.bytes)
        report(
          at("portrait.bytes"),
          `초상 ${t.portrait.path} 가 ${portrait.length}바이트라 명단 ${t.portrait.bytes} 와 다르다`,
        );
      if (portrait.length > portraitMax)
        report(
          at("portrait.bytes"),
          `초상 ${t.portrait.path} ${portrait.length}바이트가 talk.teacher_portrait_max_kb ${io.limits.portraitMaxKb}KB 를 넘는다`,
        );
    }

    if (io.credits !== undefined) {
      const credits = io.credits;
      const fields: [string, string][] = [
        ["source.creator", t.source.creator],
        ["source.distributionUrl", t.source.distributionUrl],
        ["source.originalTitle", t.source.originalTitle],
        ["source.originalSha256", t.source.originalSha256],
        ["model.sha256", t.model.sha256],
        ["source.reduction", t.source.reduction],
      ];
      for (const [key, value] of fields) {
        if (!credits.includes(value))
          report(at(key), `출처 문서 CREDITS.md 에 ${key} '${value}' 가 없다`);
      }
    }
  });

  for (const path of io.publicVrmFiles) {
    if (modelPaths.has(path)) continue;
    const bytes = io.read(path);
    const original = bytes !== undefined && originals.has(io.sha256(bytes));
    report(
      "teachers",
      original
        ? `public/${path} 가 원본 VRM 이다(원본은 저장소에 넣지 않는다)`
        : `public/${path} 는 명단 모델이 아니다(public/ 의 .vrm 은 명단 model.path 만)`,
    );
  }
  if (io.credits === undefined)
    report("teachers", "출처 문서 CREDITS.md 가 없다");
  return out;
}

/** 모델 VRM 의 판 · 메타 · 표정 · 뼈(자산 검사 (d)). */
function checkVrm(
  bytes: Uint8Array,
  t: TeachersFile["teachers"][number],
  at: (key: string) => string,
  report: (path: string, message: string) => void,
): void {
  const glb = parseGlb(bytes);
  if (!glb.ok) {
    report(
      at("model.path"),
      `모델 ${t.model.path} 를 GLB 로 풀 수 없다: ${glb.reason}`,
    );
    return;
  }
  const facts = vrmFactsOf(glb.json);
  if (facts.version !== "0.x") {
    report(
      at("model.path"),
      facts.version === "1.0"
        ? `모델 ${t.model.path} 가 VRM 1.0 이다 — 1-가 명단은 VRM 0.x 만 받는다(1.0 메타 대조는 명단을 늘리는 변경에서)`
        : `모델 ${t.model.path} 에 VRM 확장이 없다`,
    );
    return;
  }
  const { meta } = facts;
  if (meta.licenseName !== t.source.licenseName)
    report(
      at("source.licenseName"),
      `VRM licenseName '${meta.licenseName ?? ""}' 가 명단 '${t.source.licenseName}' 와 다르다`,
    );
  const permissions = permissionsOf(meta);
  if (permissions !== t.source.permissions)
    report(
      at("source.permissions"),
      `VRM 허용 설정 '${permissions}' 가 명단 '${t.source.permissions}' 와 다르다`,
    );
  for (const key of ["otherPermissionUrl", "otherLicenseUrl"] as const) {
    if (meta[key] !== t.source.conditionsUrl)
      report(
        at("source.conditionsUrl"),
        `VRM ${key} '${meta[key] ?? ""}' 가 명단 조건 주소와 다르다`,
      );
  }
  const expressions = VRM_REQUIRED_EXPRESSIONS.filter(
    (e) => !facts.expressions.includes(e),
  );
  if (expressions.length > 0)
    report(
      at("model.path"),
      `모델 ${t.model.path} 에 표정 ${expressions.join(" · ")} 가 없다`,
    );
  const bones = VRM_REQUIRED_BONES.filter((b) => !facts.bones.includes(b));
  if (bones.length > 0)
    report(
      at("model.path"),
      `모델 ${t.model.path} 에 뼈 ${bones.join(" · ")} 가 없다`,
    );
}
