// 수업 설계 지표 보고 명령(델타 spec 2026-10-29 가르치고 배우는 수업 FR-10 · 설계 8, plan 아 · 정본 15절 AC-22o).
// 사용: pnpm teach:metrics [--from <YYYY-MM-DD>] [--to <YYYY-MM-DD>] [--areas <영역,…>] [--levels <n|n-m>]
//        [--by area|level|unit|lesson|profile] [--items]
// 개발 DB(.env.local 의 DATABASE_URL)를 서버 Drizzle 로 읽어 지표 넷(src/core/session/teach-metrics.ts)을 markdown 표로 낸다.
// 프리뷰 첫 주 보고 · 사용 시험 보고용 개발 도구이고 운영 DB 에는 돌리지 않는다. 앱 화면 · 운영 빌드에는 들지 않는다.
// 아이 이름 · 프로필 id · 수업 id · 접속 문자열을 내지 않는다(프로필은 첫 세션 차례 번호만). 기간은 이 컴퓨터 시간대의 날짜이고 --to 는 그날까지.
// 읽는 법(검토 M3 · M4). 스스로 해냄의 '맞힘'은 짝 첫 시도 맞음이고, 첫 답 전에 읽기 도움(읽어 주기 · 낱말 뜻)을 쓴 맞음과 말하기
// 의사소통 정답(judge.final correct)도 든다 — 되짚기의 독립 해냄(FR-7 · AC-7b)보다 넓다. 짝 시도가 없는 틀린 문항(상한 · 아직 안 함)과
// U 짝은 분모에서 빼고 따로 센다. 자리별 시간은 attempts.attempted_at 으로 재는데 이 값은 서버가 묶음을 받은 시각이라, 오프라인으로
// 쌓였다가 한 묶음으로 간 시도는 자리 시간이 0 근처로 나오고 중단 뒤 이어 한 세션은 쉰 시간이 든다. 첫 주 보고에서는 이런 이상값을
// 사람이 거른다. 되짚기(결과 화면)는 시도 기록이 없어 재지 않는다.
// 띄우기: node --conditions=react-server --import tsx — server-only 를 빈 모듈로 풀어 src/server/{db,settings,seed} 를 가져온다.
// 종료 코드: 0 냄(세션이 없어도), 2 인자 · 환경 · 접속 · 질의 오류(오류 이름 · 코드만 낸다).
// 순수 꼴(parseTeachMetricsArgs · formatTeachReport)을 내보내고 접속 · 출력은 직접 실행될 때만 한다.
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { and, gte, inArray, isNotNull, lt, lte } from "drizzle-orm";
import { z } from "zod";
import { LESSON_SCHEMAS, type LessonOf } from "../src/core/seed/schema/lesson";
import { LEVEL_MAX, LEVEL_MIN } from "../src/core/seed/structure";
import { lemmaLookup, type OutcomeContext } from "../src/core/session/attempt";
import {
  type ActivityModelInput,
  activitiesOf,
} from "../src/core/session/preview";
import {
  type ItemMetric,
  type MetricGroup,
  type MetricGroupBy,
  type MetricSession,
  type Ratio,
  secondsSummary,
  TEACH_SLOTS,
  type TeachMetrics,
  type TeachSlot,
  teachMetricsBy,
  teachMetricsOf,
} from "../src/core/session/teach-metrics";
import type { MeaningWord } from "../src/core/speaking/meaning";
import { lessons, vocab } from "../src/db/schema/content";
import { attempts, sessions } from "../src/db/schema/learning";
import { createDb, type Db } from "../src/server/db";
import { dbErrorTag } from "../src/server/db/safe-error";
import { readLevelSpec } from "../src/server/seed/read";
import { seedHomophones } from "../src/server/seed-lists";
import { getSettings } from "../src/server/settings";
import { meaningWordsOf } from "../src/server/speaking/words";

/** 접속 문자열 환경 변수 이름(앱 서버와 같은 개발 DB). */
export const DATABASE_URL_ENV = "DATABASE_URL";
/** 보고는 연결 하나로 돈다(기술 값). */
const CONNECTIONS = 1;
/** 비율을 백분율로(단위 값). */
const PERCENT = 100;

const TEACH_AREAS = ["reading", "writing", "speaking"] as const;
type TeachArea = (typeof TEACH_AREAS)[number];
const GROUP_BYS = ["area", "level", "unit", "lesson", "profile"] as const;
/** 상한 키가 있는 자리(12절 lesson.slot_seconds_max.<자리> — 혼자 해 보기는 단계표 목표 시간 몫이라 키가 없다). */
const CAPPED_SLOTS = ["today", "show", "together", "spare"] as const;
const SLOT_CAP_KEY = "lesson.slot_seconds_max.";
const DATE_LIKE = /^\d{4}-\d{2}-\d{2}$/;
const LEVEL_RANGE = /^(\d{1,2})(?:-(\d{1,2}))?$/;

export type TeachMetricsArgs = {
  from?: string;
  to?: string;
  areas: TeachArea[];
  levels?: { min: number; max: number };
  by: MetricGroupBy;
  items: boolean;
};
export type ParsedTeachMetricsArgs =
  | { ok: true; args: TeachMetricsArgs }
  | { ok: false; error: string };

const validDate = (text: string): boolean =>
  DATE_LIKE.test(text) &&
  !Number.isNaN(new Date(`${text}T00:00:00`).getTime()) &&
  new Date(`${text}T00:00:00Z`).toISOString().startsWith(text);

/** 명령 인자를 읽는다. 모르는 인자 · 값 없는 인자 · 틀린 값은 오류. */
export function parseTeachMetricsArgs(
  argv: readonly string[],
): ParsedTeachMetricsArgs {
  const args: TeachMetricsArgs = {
    areas: [...TEACH_AREAS],
    by: "lesson",
    items: false,
  };
  const fail = (error: string): ParsedTeachMetricsArgs => ({
    ok: false,
    error,
  });
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--items") {
      args.items = true;
      continue;
    }
    const value = argv[i + 1];
    if (
      flag !== "--from" &&
      flag !== "--to" &&
      flag !== "--areas" &&
      flag !== "--levels" &&
      flag !== "--by"
    )
      return fail(`모르는 인자 ${flag}`);
    if (value === undefined || value.startsWith("--"))
      return fail(`${flag} 에 값이 없다`);
    i += 1;
    switch (flag) {
      case "--from":
      case "--to":
        if (!validDate(value))
          return fail(`${flag} 는 YYYY-MM-DD 날짜다: ${value}`);
        args[flag === "--from" ? "from" : "to"] = value;
        break;
      case "--areas": {
        const list = value.split(",").map((a) => a.trim());
        const bad = list.find(
          (a) => !(TEACH_AREAS as readonly string[]).includes(a),
        );
        if (bad !== undefined || list.length === 0)
          return fail(`--areas 는 ${TEACH_AREAS.join(",")} 가운데다: ${value}`);
        args.areas = list as TeachArea[];
        break;
      }
      case "--levels": {
        const m = LEVEL_RANGE.exec(value);
        const min = Number(m?.[1]);
        const max = m?.[2] === undefined ? min : Number(m[2]);
        if (!m || min < LEVEL_MIN || max > LEVEL_MAX || min > max)
          return fail(
            `--levels 는 ${LEVEL_MIN}~${LEVEL_MAX} 의 n 또는 n-m 이다: ${value}`,
          );
        args.levels = { min, max };
        break;
      }
      case "--by":
        if (!(GROUP_BYS as readonly string[]).includes(value))
          return fail(`--by 는 ${GROUP_BYS.join(" · ")} 가운데다: ${value}`);
        args.by = value as MetricGroupBy;
        break;
    }
  }
  if (args.from && args.to && args.from > args.to)
    return fail("--from 이 --to 보다 늦다");
  return { ok: true, args };
}

// ── 표 짓기 ──

const AREA_KO: Record<TeachArea, string> = {
  reading: "읽기",
  writing: "쓰기",
  speaking: "말하기",
};
/** 위 띠 자리 이름(델타 spec 설계 5). */
const SLOT_KO: Record<TeachSlot, string> = {
  today: "오늘 배울 것",
  show: "살펴보기",
  together: "같이 해 보기",
  solo: "혼자 해 보기",
  spare: "스스로 해 보기",
};
const ITEM_KO: Record<string, string> = {
  together: "같이 해 보기",
  "reading-question": "읽기 문제",
  "writing-item": "쓰기 문항",
  listening: "듣기",
  question: "질문",
  "repeat-word": "따라 말하기 낱말",
  "repeat-sentence": "따라 말하기 문장",
};

const unitKo = (unit: number | null) => (unit === null ? "" : ` 단원 ${unit}`);
const lessonKo = (l: ItemMetric["lesson"]): string =>
  `${AREA_KO[l.area]} ${l.level}단계${unitKo(l.unit)} 수업 ${l.lessonNo}`;

function groupLabel(group: MetricGroup): string {
  const l = group.lesson;
  switch (group.by) {
    case "area":
      return AREA_KO[l.area];
    case "level":
      return `${AREA_KO[l.area]} ${l.level}단계`;
    case "unit":
      return `${AREA_KO[l.area]} ${l.level}단계${unitKo(l.unit)}`;
    case "lesson":
      return lessonKo(l);
    case "profile":
      return `프로필 ${group.profileNo}`;
  }
}

const ratioText = (r: Ratio): string =>
  r.rate === null
    ? `0/0`
    : `${r.hits}/${r.total} (${Math.round(r.rate * PERCENT)}%)`;
const secondsText = (value: number | null): string =>
  value === null ? "—" : String(Math.round(value));

function metricsRow(label: string, m: TeachMetrics): string {
  return `| ${label} | ${m.sessions} | ${ratioText(m.selfDone)} | ${m.selfDone.missing} | ${m.selfDone.unscored} | ${ratioText(m.soloFirst)} | ${m.soloFirst.unscored} | ${ratioText(m.togetherFirst)} |`;
}

/** 보고 markdown 줄. 묶음 표 · 전체 줄 · 자리별 시간(전체) · 문항별 첫 시도(--items). */
export function formatTeachReport(input: {
  groups: readonly MetricGroup[];
  total: TeachMetrics;
  caps: Partial<Record<TeachSlot, number>>;
  period: { from?: string; to?: string };
  items: boolean;
}): string[] {
  const { total } = input;
  const lines = [
    "# 수업 설계 지표(개발 DB)",
    "",
    `기간 ${input.period.from ?? "처음"} ~ ${input.period.to ?? "지금"} · 가르치는 수업 세션 ${total.sessions} · 가르치는 수업이 아니라 뺀 세션 ${total.skippedSessions}`,
    "",
    "스스로 해냄은 첫 시도에 틀린 혼자 문항 가운데 그 짝을 첫 시도에 맞힌 비율이다. 짝 맞음에는 첫 답 전에 읽기 도움(읽어 주기 · 낱말 뜻)을 쓴 맞음과 말하기 의사소통 정답도 들어, 되짚기의 독립 해냄보다 넓다. 짝 시도가 없는 틀린 문항(상한 · 아직 안 함)과 U(건너뜀 · 'AI 쉬는 중' · 소리 없음 · 판정 없음)는 분모에서 빼고 따로 적었다.",
    "",
    "| 묶음 | 세션 | 스스로 해냄 | 짝 시도 없음 | 짝 U | 혼자 첫 시도 정답률 | 혼자 U | 같이 해 보기 첫 시도 정답률 |",
    "|---|---|---|---|---|---|---|---|",
    ...input.groups.map((g) => metricsRow(groupLabel(g), g.metrics)),
    metricsRow("전체", total),
    "",
    "## 자리별 걸린 시간(초, 전체)",
    "",
    "앞 자리 끝 시도(첫 자리는 세션 시작)부터 그 자리 끝 시도까지다. 시도 시각은 서버가 묶음을 받은 시각이라, 오프라인으로 쌓였다가 한 묶음으로 간 시도는 0 근처로 나오고 중단 뒤 이어 한 세션은 쉰 시간이 든다. 이런 이상값은 사람이 거른다. 되짚기(결과 화면)는 시도 기록이 없어 재지 않는다.",
    "",
    "| 자리 | 세션 | 가운데값 | 가장 긴 값 | 상한 |",
    "|---|---|---|---|---|",
    ...TEACH_SLOTS.map((slot) => {
      const s = secondsSummary(total.slotSeconds[slot]);
      return `| ${SLOT_KO[slot]} | ${s.n} | ${secondsText(s.median)} | ${secondsText(s.max)} | ${secondsText(input.caps[slot] ?? null)} |`;
    }),
  ];
  if (input.items)
    lines.push(
      "",
      "## 문항별 첫 시도 정답률(전체)",
      "",
      "| 수업 | 자리 | 문항 | 첫 시도 정답 | U |",
      "|---|---|---|---|---|",
      ...total.items.map(
        (i) =>
          `| ${lessonKo(i.lesson)} | ${SLOT_KO[i.slot]} | ${ITEM_KO[i.kind] ?? i.kind} ${i.index + 1} | ${ratioText(i.first)} | ${i.first.unscored} |`,
      ),
    );
  return lines;
}

// ── DB 읽기(직접 실행 때만) ──

type AppLesson = LessonOf[TeachArea];
const matchLevelsSchema = z.tuple([z.number(), z.number()]);

/** 기간 · 영역 · 단계에 드는 수업 세션을 읽어 지표 입력으로 만든다. 프로필은 첫 세션 차례 번호로 바꾼다. */
export async function loadTeachSessions(
  db: Db,
  args: TeachMetricsArgs,
): Promise<MetricSession[]> {
  const where = [
    isNotNull(sessions.lessonId),
    inArray(sessions.area, args.areas),
    ...(args.from
      ? [gte(sessions.startedAt, new Date(`${args.from}T00:00:00`))]
      : []),
    ...(args.to ? [lt(sessions.startedAt, dayAfter(args.to))] : []),
    ...(args.levels
      ? [
          gte(sessions.level, args.levels.min),
          lte(sessions.level, args.levels.max),
        ]
      : []),
  ];
  const sessionRows = await db
    .select({
      id: sessions.id,
      profileId: sessions.profileId,
      area: sessions.area,
      level: sessions.level,
      lessonId: sessions.lessonId,
      startedAt: sessions.startedAt,
      seedRevision: sessions.seedRevision,
    })
    .from(sessions)
    .where(and(...where))
    .orderBy(sessions.startedAt);
  if (sessionRows.length === 0) return [];

  const lessonIds = [
    ...new Set(sessionRows.flatMap((s) => (s.lessonId ? [s.lessonId] : []))),
  ];
  const lessonRows = await db
    .select()
    .from(lessons)
    .where(inArray(lessons.id, lessonIds));
  const lessonById = new Map(lessonRows.map((l) => [l.id, l]));
  const attemptRows = await db
    .select({
      sessionId: attempts.sessionId,
      activityNo: attempts.activityNo,
      input: attempts.input,
      attemptedAt: attempts.attemptedAt,
    })
    .from(attempts)
    .where(
      inArray(
        attempts.sessionId,
        sessionRows.map((s) => s.id),
      ),
    );
  const unitWords = [...new Set(lessonRows.flatMap((l) => l.unitWords))];
  const vocabRows =
    unitWords.length === 0
      ? []
      : await db
          .select({ word: vocab.word, forms: vocab.forms })
          .from(vocab)
          .where(inArray(vocab.word, unitWords));
  const lemmaOf = lemmaLookup(
    vocabRows.map((r) => ({
      word: r.word,
      forms: Array.isArray(r.forms)
        ? r.forms.filter((f): f is string => typeof f === "string")
        : [],
    })),
  );
  const homophones = seedHomophones();

  const profileNos = new Map<string, number>();
  const scoringByProfile = new Map<string, { pass: number; good: number }>();
  const appJudgedByKey = new Map<string, boolean>();
  const meaningWordsByLesson = new Map<string, MeaningWord[]>();
  const out: MetricSession[] = [];
  for (const row of sessionRows) {
    const lessonRow = row.lessonId ? lessonById.get(row.lessonId) : undefined;
    if (!lessonRow) continue;
    const area = row.area as TeachArea;
    const level = row.level ?? lessonRow.level;
    if (!profileNos.has(row.profileId))
      profileNos.set(row.profileId, profileNos.size + 1);
    let scoring = scoringByProfile.get(row.profileId);
    if (!scoring) {
      const values = await getSettings(
        {
          "speaking.answer_match_pass": z.number(),
          "ui.match_phrase_levels": matchLevelsSchema,
        },
        { db, profileId: row.profileId },
      );
      scoring = {
        pass: values["speaking.answer_match_pass"],
        good: values["ui.match_phrase_levels"][0],
      };
      scoringByProfile.set(row.profileId, scoring);
    }
    const revision = row.seedRevision ?? lessonRow.revision;
    const specKey = `${area} ${level} ${revision}`;
    let appJudged = appJudgedByKey.get(specKey);
    if (appJudged === undefined) {
      const spec = (
        await readLevelSpec({ area, level, startRevision: revision }, { db })
      )?.spec as { questions?: { acceptedMin?: number } } | undefined;
      appJudged =
        area === "speaking" && (spec?.questions?.acceptedMin ?? 0) > 0;
      appJudgedByKey.set(specKey, appJudged);
    }
    const lesson = LESSON_SCHEMAS[area].parse(lessonRow.content) as AppLesson;
    // 가르치는 수업(teach 칸)만 여섯 자리 차례다. 나머지는 빈 차례로 넘겨 '뺀 세션'으로만 센다
    const activities = lesson.teach
      ? activitiesOf({
          area,
          level,
          content: lesson.content,
          teach: lesson.teach,
        } as ActivityModelInput)
      : [];
    // 말하기 질문 판정 품사 표(세션 서버와 같은 함수 — 묶음 다 · 정한 것 7). 수업마다 한 번 읽는다
    let meaningWords = meaningWordsByLesson.get(lessonRow.id);
    if (!meaningWords) {
      meaningWords = await meaningWordsOf(db, lesson, homophones);
      meaningWordsByLesson.set(lessonRow.id, meaningWords);
    }
    const ctx: OutcomeContext = {
      answerMatchPass: scoring.pass,
      homophones,
      unitWords: lesson.unitWords,
      lemmaOf,
      appJudgedQuestions: appJudged,
      repeatGoodRate: scoring.good,
      meaningWords,
    };
    out.push({
      profileNo: profileNos.get(row.profileId) ?? 0,
      lessonRef: {
        id: lessonRow.id,
        area,
        level: lessonRow.level,
        unit: lessonRow.unit,
        lessonNo: lessonRow.lessonNo,
      },
      lesson,
      activities,
      startedAt: row.startedAt,
      attempts: attemptRows
        .filter((a) => a.sessionId === row.id)
        .map((a) => ({
          activityNo: a.activityNo,
          input: a.input,
          attemptedAt: a.attemptedAt,
        })),
      ctx,
    });
  }
  return out;
}

function dayAfter(date: string): Date {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d;
}

/** 자리 상한(lesson.slot_seconds_max.<자리>, 집 기본 행). 키가 없는 DB 면 그 자리는 '—'. */
async function readSlotCaps(
  db: Db,
): Promise<Partial<Record<TeachSlot, number>>> {
  const caps: Partial<Record<TeachSlot, number>> = {};
  for (const slot of CAPPED_SLOTS) {
    const key = `${SLOT_CAP_KEY}${slot}`;
    try {
      const values = await getSettings({ [key]: z.number() }, { db });
      caps[slot] = values[key] as number;
    } catch {
      // 키가 없거나 꼴이 틀리면 상한 칸만 비운다(보고는 그대로 낸다)
    }
  }
  return caps;
}

async function main(): Promise<number> {
  const parsed = parseTeachMetricsArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`teach-metrics: ${parsed.error}`);
    return 2;
  }
  const url = process.env[DATABASE_URL_ENV];
  if (!url) {
    console.error(`teach-metrics: ${DATABASE_URL_ENV} 이 없다(.env.local)`);
    return 2;
  }
  const db = createDb(url, { max: CONNECTIONS });
  try {
    const { args } = parsed;
    const list = await loadTeachSessions(db, args);
    const lines = formatTeachReport({
      groups: teachMetricsBy(list, args.by),
      total: teachMetricsOf(list),
      caps: await readSlotCaps(db),
      period: {
        ...(args.from ? { from: args.from } : {}),
        ...(args.to ? { to: args.to } : {}),
      },
      items: args.items,
    });
    for (const line of lines) console.log(line);
    return 0;
  } catch (error) {
    // 메시지 · SQL 에 시도 내용이 들 수 있어 이름 · 코드만 낸다
    console.error(`teach-metrics: 읽기 오류(${dbErrorTag(error)})`);
    return 2;
  } finally {
    await db.$client.end().catch(() => {});
  }
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      console.error(`teach-metrics: 예상 밖 오류(${dbErrorTag(error)})`);
      process.exitCode = 2;
    },
  );
}
