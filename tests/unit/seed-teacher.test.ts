// 회화 선생님 몫의 시드 검사(6.4 '선생님 이름' · 명단 자료, C130 · AC-19a · AC-19e 의 시드 몫).
// 명단 · 설계 숫자는 견본(teacherRoster · structure 상수)에서 읽는다. 이름은 1-가 명단(미나 · 리오)과 옛 이름(토리)만 쓴다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkLevelTestFile,
  checkStoryFile,
  lessonCorpus,
} from "@/core/seed/check-assessment";
import { checkRemedialCoverage } from "@/core/seed/check-cross";
import { checkLessonCell, type SeedIssue } from "@/core/seed/check-lesson";
import { checkTalkCard } from "@/core/seed/check-talk";
import {
  checkTeacherAssets,
  checkTeacherNames,
  checkTeacherNamesInSpecs,
  checkTeacherRoster,
  contrastRatio,
  teacherNameHits,
  teacherNamesOf,
} from "@/core/seed/check-teacher";
import { buildReferenceIndex } from "@/core/seed/reference-index";
import type { TalkLesson } from "@/core/seed/schema/lesson";
import {
  type TeachersFile,
  TeachersFileSchema,
} from "@/core/seed/schema/teachers";
import {
  AREAS,
  lessonFilePath,
  levelTestFilePath,
  OLD_TEACHER_NAMES,
  SEED_FILES,
  storyFilePath,
  TEACHER_LABEL_CONTRAST_MIN,
  TEACHER_PERSONA_MAX_SENTENCES,
  TEACHER_PITCH,
  TEACHER_TRAITS,
  type TextFragment,
} from "@/core/seed/structure";
import { exitCodeOf, validateSeed } from "@/core/seed/validate";
import { runValidate } from "../../scripts/seed-validate";
import {
  defaultSettings,
  miniSeed,
  readingLesson,
  referenceSet,
  seedTreeFiles,
  speakingLesson,
  storyFile,
  talkLesson,
  talkLevelTest,
  talkUnitCards,
  teacherRoster,
  writingLesson,
} from "../fixtures/seed/builders";

const ref = referenceSet(defaultSettings());
const { index } = buildReferenceIndex(ref);
const names = teacherNamesOf(teacherRoster());

const errorRules = (issues: readonly SeedIssue[]) =>
  [
    ...new Set(issues.filter((i) => i.severity === "error").map((i) => i.rule)),
  ].sort();

function namesIn(text: string): string[] {
  return teacherNameHits(text, names);
}

describe("시드 검증 선생님 이름", () => {
  it("AC-19e 막는 이름은 옛 이름 Tori · 토리와 명단의 영어 · 한글 이름이다(명단이 없으면 옛 이름만)", () => {
    expect(names.en).toEqual([...OLD_TEACHER_NAMES.en, "Mina", "Leo"]);
    expect(names.ko).toEqual([...OLD_TEACHER_NAMES.ko, "미나", "리오"]);
    expect(teacherNamesOf(undefined)).toEqual({
      en: [...OLD_TEACHER_NAMES.en],
      ko: [...OLD_TEACHER_NAMES.ko],
    });
    // 명단을 늘리면 그 이름도 막는다(명단이 검사 입력).
    const roster = teacherRoster();
    const [first] = roster.teachers;
    if (!first) throw new Error("명단 없음");
    roster.teachers.push({ ...first, key: "jun", nameKo: "준", nameEn: "Jun" });
    expect(teacherNameHits("Hi, Jun!", teacherNamesOf(roster))).toEqual([
      "Jun",
    ]);
    expect(teacherNameHits("준이 웃어.", teacherNamesOf(roster))).toEqual([
      "준",
    ]);
  });

  it("AC-19e 영어 이름은 대소문자를 가리지 않고 낱말 경계로 본다", () => {
    expect(namesIn("Hello, I am Tori.")).toEqual(["Tori"]);
    expect(namesIn("TORI and mina play.")).toEqual(["Tori", "Mina"]);
    expect(namesIn("Say hello to leo!")).toEqual(["Leo"]);
    expect(namesIn("This is Tori's ball.")).toEqual(["Tori"]);
    expect(namesIn("Mina가 웃어.")).toEqual(["Mina"]);
    // 낱말 안에 든 글자는 이름이 아니다.
    expect(namesIn("I have stamina.")).toEqual([]);
    expect(namesIn("Leon has a leopard story.")).toEqual([]);
    expect(namesIn("Victoria likes history.")).toEqual([]);
  });

  it("AC-19e 한국어 이름은 앞 글자가 한글이 아니면 뒤에 무엇이 붙어도 걸고, 이름으로 시작하는 보통 낱말 · 낱말 안에 든 글자는 뺀다(C132 (1))", () => {
    for (const text of [
      // 검토 I-1 이 놓쳤다고 한 아홉 꼴
      "내 이름은 토리라고 해.",
      "토리라는 친구",
      "나는 토리인데",
      "미나이고",
      "토리잖아",
      "토리지!",
      "미나쌤",
      "미나선생님",
      "토린 좋아",
      "토릴 불러.",
      // 조사 · 띄어 쓴 꼴
      "토리",
      "토리가 웃어.",
      "토리와 놀자.",
      "토리야, 안녕!",
      "토리는 다람쥐야.",
      "미나랑 이야기해.",
      "미나에게는 비밀이야.",
      "리오의 공이야.",
      "리오예요.",
      "미나 선생님",
      "(리오)",
      // 빼는 목록이 앞부분 일치라 가리던 꼴(fix 1 재검토 N-1) — '토리이' · '미나토'는 빼는 목록에 두지 않는다.
      "토리이 앞에서",
      "미나토 구",
      "토리이야기",
      "토리이랑",
      // '리온'은 리오 + 줄임 받침 ㄴ 이라 '토린'(토리 + ㄴ)과 같은 꼴로 걸린다(막는 쪽, N-2 의 ㄴ · ㄹ 규칙).
      "리온이",
    ]) {
      expect(namesIn(text), text).not.toEqual([]);
    }
    for (const text of [
      // 이름으로 시작하는 보통 낱말(빼는 목록)
      "미나리를 먹어.",
      "토리노에 가.",
      "리오넬이 왔어.",
      "리옹에 가.",
      // 받침 없는 끝 음절의 줄임 받침은 ㄴ · ㄹ 뿐이다(N-2) — 다른 받침이 붙은 낱말은 이름이 아니다.
      "미남이야",
      "미납",
      "토림",
      // 앞 글자가 한글(낱말 안에 든 글자)
      "세미나가 있어.",
      "시나리오를 읽어.",
      "스토리가 재밌어.",
      "히스토리",
      "포트폴리오",
      "마리오",
      "카테고리를 골라.",
      "도토리를 주워.",
    ]) {
      expect(namesIn(text), text).toEqual([]);
    }
  });

  it("AC-19e 글 조각마다 이름이 있으면 그 칸 경로로 teacher-name 오류 하나를 낸다", () => {
    const fragments: TextFragment[] = [
      { path: "a", role: "tori", text: "I'm Mina. Hi, Tori!" },
      { path: "b", role: "ko", text: "오늘 쓸 말이야." },
      { path: "c", role: "ko", text: "리오가 물어봐." },
    ];
    const out: { rule: string; path: string }[] = [];
    checkTeacherNames(fragments, names, (rule, path) => {
      out.push({ rule, path });
    });
    expect(out).toEqual([
      { rule: "teacher-name", path: "a" },
      { rule: "teacher-name", path: "c" },
    ]);
  });

  it("AC-19e 회화 카드의 영어 · 한국어 글 칸(질문 · 예상 흐름 · 오늘 쓸 말 예문 · 안전한 대사 · 끝인사 · 목록 제목)에 이름이 있으면 거부한다", () => {
    const ctx = (level: number) => ({
      area: "talk" as const,
      level,
      unit: 1,
      file: lessonFilePath("talk", level, 1),
      index,
    });
    for (const level of [1, 3, 4, 5] as const) {
      expect(checkTalkCard(talkLesson(ref, level).lesson, ctx(level))).toEqual(
        [],
      );
    }
    const edits: [string, (l: TalkLesson) => void][] = [
      ["card.flow.0", (l) => (l.card.flow[0] = "Tori asks about things.")],
      [
        "card.todayWords.0.example",
        (l) => {
          const w = l.card.todayWords[0];
          if (w) w.example = "Hello, I am Tori.";
        },
      ],
      [
        "card.safeLines.0.ko",
        (l) => {
          const line = l.card.safeLines[0];
          if (line) line.ko = "미나랑 계속 이야기하자.";
        },
      ],
      ["card.farewell.en", (l) => (l.card.farewell.en = "Bye! Leo says hi.")],
      ["title", (l) => (l.title = "토리와 이야기")],
      [
        "card.turns.0.question.ko",
        (l) => {
          const turn = l.card.turns?.[0];
          if (turn) turn.question.ko = "리오는 뭘 좋아해?";
        },
      ],
    ];
    for (const [path, edit] of edits) {
      const lesson = structuredClone(talkLesson(ref, 1).lesson);
      edit(lesson);
      const issues = checkTalkCard(lesson, ctx(1));
      expect(errorRules(issues), path).toEqual(["teacher-name"]);
      expect(issues[0]?.path, path).toBe(path);
      expect(issues[0]?.cell, path).toBeDefined();
    }
  });

  it("C132 (3) 회화 카드의 예상 흐름은 문장 길이 상한을 받지 않고, 다른 영어 칸은 그대로 받는다", () => {
    const ctx1 = {
      area: "talk" as const,
      level: 1,
      unit: 1,
      file: lessonFilePath("talk", 1, 1),
      index,
    };
    const max = index.levelSpec("talk", 1)?.sentenceMaxWords ?? 0;
    const long = `The teacher asks ${Array.from({ length: max }, () => "very").join(" ")} slowly.`;
    expect(long.split(" ").length).toBeGreaterThan(max);
    const flow = structuredClone(talkLesson(ref, 1).lesson);
    flow.card.flow[0] = long;
    expect(checkTalkCard(flow, ctx1)).toEqual([]);
    const safe = structuredClone(talkLesson(ref, 1).lesson);
    const line = safe.card.safeLines[0];
    if (!line) throw new Error("안전한 대사 없음");
    line.en = long;
    expect(errorRules(checkTalkCard(safe, ctx1))).toEqual([
      "learning-elements",
    ]);
  });

  it("C134 회화 카드의 예상 흐름도 금지어 검사는 받는다", () => {
    const ctx1 = {
      area: "talk" as const,
      level: 1,
      unit: 1,
      file: lessonFilePath("talk", 1, 1),
      index,
    };
    const [word] = ref.forbidden.words.en;
    if (!word) throw new Error("금지어 없음");
    const lesson = structuredClone(talkLesson(ref, 1).lesson);
    lesson.card.flow[0] = `The teacher says ${word}.`;
    const issues = checkTalkCard(lesson, ctx1);
    expect(errorRules(issues)).toEqual(["forbidden"]);
    expect(issues[0]?.path).toBe("card.flow.0");
  });

  it("C134 미션 영어 등 다른 prompt 역할 글은 문장 길이 상한을 그대로 받는다(5단계 회화 카드)", () => {
    const ctx5 = {
      area: "talk" as const,
      level: 5,
      unit: 1,
      file: lessonFilePath("talk", 5, 1),
      index,
    };
    const max = index.levelSpec("talk", 5)?.sentenceMaxWords ?? 0;
    const long = `Buy ${Array.from({ length: max }, () => "very").join(" ")} nice things.`;
    expect(long.split(" ").length).toBeGreaterThan(max);
    const flow = structuredClone(talkLesson(ref, 5).lesson);
    flow.card.flow[0] = long;
    expect(checkTalkCard(flow, ctx5)).toEqual([]);
    const mission = structuredClone(talkLesson(ref, 5).lesson);
    const first = mission.card.missions?.[0];
    if (!first) throw new Error("미션 없음");
    first.en = long;
    const issues = checkTalkCard(mission, ctx5);
    expect(errorRules(issues)).toEqual(["learning-elements"]);
    expect(issues[0]?.path).toBe("card.missions.0.en");
  });

  it("C134 예상 흐름에만 나온 단원 단어는 단원 단어 확인과 보강 덮기 '나옴'에서 세지 않는다", () => {
    // 단원 단어 확인(check-lesson): 예상 흐름에만 둔 단원 단어는 '수업 글에 나오지 않는다'.
    const ctx1 = {
      area: "talk" as const,
      level: 1,
      unit: 1,
      file: lessonFilePath("talk", 1, 1),
      index,
    };
    const base = talkLesson(ref, 1).lesson;
    const word = index
      .unitSpec("talk", 1, 1)
      ?.words.find((w) => !base.unitWords.includes(w));
    if (!word) throw new Error("이 카드에 안 나온 단원 단어 없음");
    const flowOnly = structuredClone(base);
    flowOnly.card.flow[0] = `The teacher says ${word}.`;
    expect(checkTalkCard(flowOnly, ctx1)).toEqual([]);
    flowOnly.unitWords = [...flowOnly.unitWords, word];
    const unitIssues = checkTalkCard(flowOnly, ctx1);
    expect(errorRules(unitIssues)).toEqual(["unit-words"]);
    expect(unitIssues[0]?.message).toContain(word);

    // 보강 덮기(check-cross): 보강 카드들의 아이에게 보이는 칸에서 단원 단어 하나를 빼면 덮기 오류이고,
    // 예상 흐름에 덮기 수만큼 넣어도 그대로이며, 보이는 칸(안전한 대사)에 넣으면 풀린다.
    const tree = miniSeed({ areas: AREAS, through: 1, frame: "small" });
    const file = tree.lessons.find(
      (f) => f.area === "talk" && f.level === 1 && f.unit === 1,
    );
    if (file?.area !== "talk") throw new Error("회화 수업 파일 없음");
    const { index: miniIndex } = buildReferenceIndex(tree.reference);
    const group = (lessons: TalkLesson[]) => ({
      area: "talk" as const,
      level: 1,
      unit: 1,
      file: lessonFilePath("talk", 1, 1),
      lessons,
    });
    expect(
      checkRemedialCoverage(group(file.lessons), miniIndex).issues,
    ).toEqual([]);
    const target = miniIndex.unitSpec("talk", 1, 1)?.words[0];
    const coverage = miniIndex.frame("talk", 1, 1)?.remedialCoverage ?? 0;
    if (!target || coverage === 0) throw new Error("단원 단어 · 덮기 수 없음");
    const pattern = new RegExp(`\\b${target}\\b`, "gi");
    const said = Array.from(
      { length: coverage },
      () => `The teacher says ${target}.`,
    ).join(" ");
    const withRemedial = (edit: (l: TalkLesson) => void): TalkLesson[] =>
      file.lessons.map((l) => {
        if (l.kind !== "remedial" || l.variant !== 1) return l;
        const out = JSON.parse(
          JSON.stringify(l).replace(pattern, "it"),
        ) as TalkLesson;
        edit(out);
        return out;
      });
    const coverageRules = (lessons: TalkLesson[]) =>
      checkRemedialCoverage(group(lessons), miniIndex).issues.map((i) => [
        i.rule,
        i.message.includes(target),
      ]);
    expect(coverageRules(withRemedial(() => {}))).toEqual([
      ["remedial-coverage", true],
    ]);
    expect(
      coverageRules(
        withRemedial((l) => {
          l.card.flow[0] = said;
        }),
      ),
    ).toEqual([["remedial-coverage", true]]);
    expect(
      coverageRules(
        withRemedial((l) => {
          const line = l.card.safeLines[0];
          if (line) line.en = said;
        }),
      ),
    ).toEqual([]);
  });

  it("AC-19e {TEACHER} 는 지금처럼 틀 자리 오류(talk-placeholder)이고 선생님 이름 오류가 아니다", () => {
    const lesson = structuredClone(talkLesson(ref, 4).lesson);
    if (!("firstLine" in lesson.card.greeting)) throw new Error("첫 말 없음");
    lesson.card.greeting.firstLine.en = "Hi {NAME}! I'm {TEACHER}.";
    const issues = checkTalkCard(lesson, {
      area: "talk",
      level: 4,
      unit: 1,
      file: lessonFilePath("talk", 4, 1),
      index,
    });
    expect(errorRules(issues)).toEqual(["talk-placeholder"]);
  });

  it("AC-19e 회화 평가 카드 장과 선생님 이야기의 글 칸에 이름이 있으면 거부한다", () => {
    const corpus = lessonCorpus("talk", talkUnitCards(ref, 1));
    const testCtx = { file: levelTestFilePath("talk", 1), index, corpus };
    const test = talkLevelTest(ref);
    expect(checkLevelTestFile(test, testCtx)).toEqual([]);
    const named = structuredClone(test);
    const form = named.forms[0];
    const sheet = form && "sheets" in form ? form.sheets[0] : undefined;
    if (!sheet) throw new Error("장 없음");
    sheet.firstLine.en = "Hi! I'm Mina.";
    const sheetIssues = checkLevelTestFile(named, testCtx);
    expect(errorRules(sheetIssues)).toEqual(["teacher-name"]);
    expect(sheetIssues[0]?.path).toBe("forms.0.sheets.0.firstLine.en");

    const storyCtx = { file: storyFilePath("1-3"), index };
    const stories = storyFile(ref, "1-3");
    expect(checkStoryFile(stories, storyCtx)).toEqual([]);
    const story = structuredClone(stories);
    const first = story.stories[0];
    if (!first) throw new Error("이야기 없음");
    first.textKo = "토리가 그걸 찾아.";
    const storyIssues = checkStoryFile(story, storyCtx);
    expect(errorRules(storyIssues)).toEqual(["teacher-name"]);
    expect(storyIssues[0]?.path).toBe("stories.0.textKo");
  });

  it("AC-19e 읽기 · 쓰기 · 말하기 글의 Tori · 명단 이름은 이 검사가 보지 않는다", () => {
    const sample = readingLesson(ref, 4);
    const passage = JSON.stringify(sample.lesson);
    expect(passage).toContain("Tori");
    const lesson = structuredClone(sample.lesson);
    const ctx = {
      area: "reading" as const,
      level: sample.level,
      unit: sample.unit,
      file: lessonFilePath("reading", sample.level, sample.unit),
      index,
    };
    const before = errorRules(checkLessonCell(lesson, ctx));
    expect(before).not.toContain("teacher-name");
    lesson.title = "미나와 리오";
    expect(errorRules(checkLessonCell(lesson, ctx))).not.toContain(
      "teacher-name",
    );
    // 쓰기 · 말하기 견본도 같다(검토 M-2).
    for (const other of [writingLesson(ref, 1), speakingLesson(ref, 1)]) {
      const named = structuredClone(other.lesson);
      named.title = "미나와 리오 · Tori";
      const issues = checkLessonCell(named, {
        area: other.area,
        level: other.level,
        unit: other.unit,
        file: lessonFilePath(other.area, other.level, other.unit),
        index,
      } as Parameters<typeof checkLessonCell>[1]);
      expect(errorRules(issues), other.area).not.toContain("teacher-name");
    }
  });

  it("AC-19e 회화 영역의 단원 규격 주제와 단계 규격 can-do 글에 이름이 있으면 규격 파일 오류다(읽기 · 쓰기 · 말하기 행은 안 봄, C132 (2))", () => {
    expect(buildReferenceIndex(ref).issues).toEqual([]);
    const named = structuredClone(ref);
    const topicAt = named.unitSpecs.unitSpecs.findIndex(
      (u) => u.area === "talk",
    );
    const canDoAt = named.levelSpecs.levelSpecs.findIndex(
      (l) => l.area === "talk",
    );
    const readingTopic = named.unitSpecs.unitSpecs.findIndex(
      (u) => u.area === "reading",
    );
    const readingCanDo = named.levelSpecs.levelSpecs.findIndex(
      (l) => l.area === "reading",
    );
    const at = <T>(list: T[], i: number): T => {
      const v = list[i];
      if (v === undefined) throw new Error("행 없음");
      return v;
    };
    at(named.unitSpecs.unitSpecs, topicAt).topic = "토리와 첫 만남";
    at(named.levelSpecs.levelSpecs, canDoAt).canDo =
      "토리와 5번 말을 주고받을 수 있다";
    at(named.unitSpecs.unitSpecs, readingTopic).topic = "토리와 모모";
    at(named.levelSpecs.levelSpecs, readingCanDo).canDo = "Tori 글을 읽는다";
    // 회화 단계 규격의 대화 방식도 AI 프롬프트로 간다(C135).
    const talkRow = at(named.levelSpecs.levelSpecs, canDoAt);
    if (talkRow.area !== "talk") throw new Error("회화 행 아님");
    talkRow.mode = "토리가 상대역";
    const issues = buildReferenceIndex(named).issues;
    expect(issues.map((i) => [i.rule, i.file, i.path])).toEqual([
      ["teacher-name", SEED_FILES.levelSpecs, `levelSpecs.${canDoAt}.canDo`],
      ["teacher-name", SEED_FILES.levelSpecs, `levelSpecs.${canDoAt}.mode`],
      ["teacher-name", SEED_FILES.unitSpecs, `unitSpecs.${topicAt}.topic`],
    ]);
    // 읽기 행에는 대화 방식 칸이 없지만(규격), 들어와도 이 검사는 회화 행만 본다.
    const direct = checkTeacherNamesInSpecs(
      [
        { area: "reading", canDo: "글을 읽는다", mode: "토리가 상대역" },
        { area: "talk", canDo: "말을 주고받는다", mode: "토리가 상대역" },
      ],
      [],
      names,
    );
    expect(direct.map((i) => [i.rule, i.file, i.path])).toEqual([
      ["teacher-name", SEED_FILES.levelSpecs, "levelSpecs.1.mode"],
    ]);
  });

  it("AC-19e 고친 시험용 시드 나무(영역 넷 · 회화 카드 · 평가 장 · 이야기)가 시드 검증을 통과하고, 이름 하나를 넣으면 막는다", () => {
    const tree = miniSeed({ areas: AREAS, through: 1, frame: "small" });
    const report = validateSeed(seedTreeFiles(tree), {
      mode: "complete",
      through: 1,
      areas: AREAS,
    });
    expect(report.errors).toEqual([]);
    expect(exitCodeOf(report)).toBe(0);
    const talkFile = tree.lessons.find((f) => f.area === "talk");
    const card = talkFile?.lessons[0] as TalkLesson | undefined;
    if (!card) throw new Error("회화 카드 없음");
    card.card.flow[0] = "Tori asks about things.";
    const named = validateSeed(seedTreeFiles(tree), {
      mode: "complete",
      through: 1,
      areas: AREAS,
    });
    expect(named.errors.map((e) => e.rule)).toEqual(["teacher-name"]);
    expect(named.errors[0]?.cell).not.toBeNull();
    expect(exitCodeOf(named)).toBe(1);
  });
});

describe("명단 검사", () => {
  const ctx = {
    lexicon: index.lexicon,
    forbidden: index.forbidden,
    greetingMaxWords: index.levelSpec("talk", 1)?.sentenceMaxWords,
  };
  const roster = (edit: (r: TeachersFile) => void): TeachersFile => {
    const r = teacherRoster();
    edit(r);
    return r;
  };
  const mina = (r: TeachersFile) => {
    const t = r.teachers[0];
    if (!t) throw new Error("명단 없음");
    return t;
  };
  const check = (r: TeachersFile) => checkTeacherRoster(r, ctx);

  it("AC-19a 1-가 명단(미나 · 리오)과 견본 명단이 규격과 명단 검사를 통과한다", () => {
    expect(TeachersFileSchema.safeParse(teacherRoster()).success).toBe(true);
    expect(check(teacherRoster())).toEqual([]);
    const seed = TeachersFileSchema.parse(
      JSON.parse(
        readFileSync(join(process.cwd(), "seed", SEED_FILES.teachers), "utf8"),
      ),
    );
    expect(seed.teachers.map((t) => [t.key, t.nameKo, t.nameEn])).toEqual([
      ["mina", "미나", "Mina"],
      ["leo", "리오", "Leo"],
    ]);
    expect(check(seed)).toEqual([]);
  });

  it("AC-19a 가짜 명단마다 거부 하나: 키 겹침 · 이름 겹침 · vocab 단어인 영어 이름 · 물음표 인사 · 성격 낱말 셋 아님 · 대비 미달 · 그 밖", () => {
    const word = ref.vocab.vocab.find((v) => /^[a-z]{4,}$/.test(v.word))?.word;
    if (!word) throw new Error("vocab 낱말 없음");
    const cases: [string, TeachersFile][] = [
      [
        "teachers.1.key",
        roster((r) => {
          const t = r.teachers[1];
          if (t) t.key = mina(r).key;
        }),
      ],
      [
        "teachers.1.nameKo",
        roster((r) => {
          const t = r.teachers[1];
          if (t) t.nameKo = mina(r).nameKo;
        }),
      ],
      [
        "teachers.1.nameEn",
        roster((r) => {
          const t = r.teachers[1];
          if (t) t.nameEn = mina(r).nameEn.toUpperCase();
        }),
      ],
      [
        "teachers.0.nameEn",
        roster((r) => {
          mina(r).nameEn = word.charAt(0).toUpperCase() + word.slice(1);
        }),
      ],
      [
        "teachers.0.greetingEn",
        roster((r) => {
          mina(r).greetingEn = "Hi! What do you like?";
        }),
      ],
      [
        "teachers.0.traitsKo",
        roster((r) => {
          mina(r).traitsKo = mina(r).traitsKo.slice(0, TEACHER_TRAITS - 1);
        }),
      ],
      [
        "teachers.0.color",
        roster((r) => {
          mina(r).color = { room: "#e8e9d9", accent: "#b8c4a0" };
        }),
      ],
      [
        "teachers.0.personaEn",
        roster((r) => {
          mina(r).personaEn = Array.from(
            { length: TEACHER_PERSONA_MAX_SENTENCES + 1 },
            () => "You are kind.",
          ).join(" ");
        }),
      ],
      [
        "teachers.0.personaEn",
        roster((r) => {
          mina(r).personaEn = "Warm and patient with {NAME}.";
        }),
      ],
      [
        "teachers.0.greetingEn",
        roster((r) => {
          mina(r).greetingEn =
            "Hello! Let's learn a lot of English words together today!";
        }),
      ],
      [
        "teachers.0.greetingEn",
        roster((r) => {
          mina(r).greetingEn =
            `Hello! You are ${ref.forbidden.words.en[0] ?? ""}.`;
        }),
      ],
      [
        "teachers.0.introKo",
        roster((r) => {
          mina(r).introKo = "한 줄.\n두 줄.\n세 줄.";
        }),
      ],
    ];
    for (const [path, file] of cases) {
      expect(TeachersFileSchema.safeParse(file).success, path).toBe(true);
      const issues = check(file);
      expect(
        issues.map((i) => [i.rule, i.path]),
        path,
      ).toEqual([["teacher-roster", path]]);
      expect(issues[0]?.file).toBe(SEED_FILES.teachers);
    }
  });

  it("AC-19a 규격이 꼴을 거부한다: vrm 밖 꼴 · 한글 밖 한글 이름 · 영문자 밖 영어 이름 · 높이 0~2 밖 · 빈 출처 · 대문자 키", () => {
    const cases: [string, (r: TeachersFile) => void][] = [
      ["kind", (r) => Object.assign(mina(r), { kind: "emoji" })],
      ["nameKo", (r) => (mina(r).nameKo = "미나1")],
      ["nameEn", (r) => (mina(r).nameEn = "Mi-na")],
      [
        "voice",
        (r) => (mina(r).voice = { pitch: TEACHER_PITCH.max + 0.1, prefer: [] }),
      ],
      ["source", (r) => (mina(r).source.creator = " ")],
      ["key", (r) => (mina(r).key = "Mina")],
    ];
    for (const [label, edit] of cases) {
      const result = TeachersFileSchema.safeParse(roster(edit));
      expect(result.success, label).toBe(false);
      expect(result.error?.issues, label).toHaveLength(1);
    }
    // 모델 · 초상 · 목소리 · 줄인 방법 · 빼는 낱말 칸은 필수다(선생님 화면 plan 값 2, C141). 목소리 순서는 빈 목록을 받는다.
    for (const field of [
      "model",
      "portrait",
      "voice",
      "nameKoWordExceptions",
    ] as const) {
      const bare = roster((r) => {
        delete (mina(r) as Partial<TeachersFile["teachers"][number]>)[field];
      });
      expect(TeachersFileSchema.safeParse(bare).success, field).toBe(false);
    }
    const noReduction = roster((r) => {
      delete (mina(r).source as { reduction?: string }).reduction;
    });
    expect(TeachersFileSchema.safeParse(noReduction).success).toBe(false);
    const noPrefer = roster((r) => {
      delete (mina(r).voice as { prefer?: string[] }).prefer;
    });
    expect(TeachersFileSchema.safeParse(noPrefer).success).toBe(false);
  });

  it("AC-19a 모델 · 초상 파일이 없으면 그 칸 오류다", () => {
    const r = teacherRoster();
    const all = new Set(
      r.teachers.flatMap((t) => [t.model.path, t.portrait.path]),
    );
    expect(checkTeacherAssets(r, (p) => all.has(p))).toEqual([]);
    all.delete(mina(r).portrait.path);
    expect(
      checkTeacherAssets(r, (p) => all.has(p)).map((i) => [i.rule, i.path]),
    ).toEqual([["teacher-asset", "teachers.0.portrait.path"]]);
  });

  it("AC-19a 시드 검증 · 명령은 assetExists 로 채워진 모델 칸의 파일 없음을 규격 파일 오류 하나로 낸다(검토 M-2)", () => {
    const tree = miniSeed({ areas: AREAS, through: 1, frame: "small" });
    const files = seedTreeFiles(tree);
    const r = teacherRoster();
    const report = validateSeed(files, {
      mode: "pr",
      areas: AREAS,
      assetExists: (p) => p !== mina(r).model.path,
    });
    expect(report.errors.map((e) => [e.rule, e.path])).toEqual([
      ["teacher-asset", "teachers.0.model.path"],
    ]);
    expect(report.summary.referenceErrors).toBe(1);
    expect(exitCodeOf(report)).toBe(1);
    // 넘기지 않으면 보지 않는다.
    expect(validateSeed(files, { mode: "pr", areas: AREAS }).errors).toEqual(
      [],
    );
    const args = { root: "seed", areas: [...AREAS], json: false, stats: false };
    expect(runValidate(args, files, () => false).code).toBe(1);
    expect(runValidate(args, files, () => true).code).toBe(0);
    expect(runValidate(args, files).code).toBe(0);
  });

  it("AC-19a 자산 경로는 빈 조각('//' · 끝 '/')을 받지 않는다(검토 M-3)", () => {
    for (const path of ["teachers//mina.vrm", "teachers/", "teachers/./x"]) {
      const file = roster((r) => {
        mina(r).portrait = { path, bytes: 1 };
      });
      expect(TeachersFileSchema.safeParse(file).success, path).toBe(false);
    }
    const ok = roster((r) => {
      mina(r).portrait = { path: "teachers/mina.png", bytes: 1 };
    });
    expect(TeachersFileSchema.safeParse(ok).success).toBe(true);
  });

  it("AC-19a 이름표 색 대비는 WCAG 대비(흰 · 검정 21:1)로 세고 1-가 명단 둘은 상한을 넘는다", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
    for (const t of teacherRoster().teachers) {
      expect(
        contrastRatio(t.color.accent, t.color.room),
        t.key,
      ).toBeGreaterThanOrEqual(TEACHER_LABEL_CONTRAST_MIN);
    }
  });

  it("AC-19a 명단 검사 오류는 시드 검증의 규격 파일 오류이고, 명단이 없으면 규격 파일이 없다는 오류다", () => {
    const tree = miniSeed({ areas: AREAS, through: 1, frame: "small" });
    const files = seedTreeFiles(tree);
    const broken = teacherRoster();
    const t = broken.teachers[1];
    if (t) t.key = "mina";
    files.set(SEED_FILES.teachers, JSON.stringify(broken));
    const report = validateSeed(files, { mode: "pr", areas: AREAS });
    expect(report.errors.map((e) => e.rule)).toEqual(["teacher-roster"]);
    expect(report.summary.referenceErrors).toBe(1);
    expect(exitCodeOf(report)).toBe(1);
    files.delete(SEED_FILES.teachers);
    const missing = validateSeed(files, { mode: "pr", areas: AREAS });
    expect(missing.errors.map((e) => [e.rule, e.file])).toEqual([
      ["reference-missing", SEED_FILES.teachers],
    ]);
  });
});
