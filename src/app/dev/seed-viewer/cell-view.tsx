// 시드 보기 화면의 칸 하나(plan-p05b '보기 화면' 칸 행): 머리 → 화면 차례마다 아이 화면 틀(너비 820px) + 어른용 덧붙임
// → 풀이 검사 결과 → 표본 검토 행 → 쓰기 칸(plan-p05c review-panel: 사람 확인 · 표본 검토). 아이 화면 틀 안에는 시드 글과 정본 · 목업 글만 둔다.
// 덧붙임 · 머리 · 표는 어른용이라 작은 글자를 쓴다(4절 '이보다 작은 글자는 부모용 정보에만').
// 이름표의 '문항 k' 는 itemsOf 번호(cell.items)에서 찾는다 — P5c 의 표본 검토 · 사람 확인 문항 번호와 같은 셈(검토 M-1).
import type { ReactNode } from "react";
import {
  ActivityCard,
  NewWordsPreview,
  type PreviewEntry,
} from "@/components/activities/common";
import {
  ReadingPassage,
  ReadingQuestion,
  ReadingTestItem,
  type ReadingTestItemData,
  StoryQuestion,
  StoryText,
} from "@/components/activities/reading";
import {
  ListeningItem,
  PictureTask,
  PresentationTask,
  RepeatItem,
  SpeakingQuestion,
  SpeakingTestItem,
  type SpeakingTestItemData,
} from "@/components/activities/speaking";
import {
  CompositionTestItem,
  FillBlankItem,
  FixSentenceItem,
  WritingComposition,
  WritingGuidedSentence,
  WritingGuidedTask,
  WritingItem,
} from "@/components/activities/writing";
import { isAiItem } from "@/core/seed/check-assessment";
import type { ReferenceIndex } from "@/core/seed/reference-index";
import type {
  PlacementItem,
  Story,
  TestItem,
  WritingTestItem as WritingTestItemType,
} from "@/core/seed/schema/assessment";
import type {
  ReadingLesson,
  SpeakingLesson,
  TalkLesson,
  WritingItem as WritingItemData,
  WritingLesson,
} from "@/core/seed/schema/lesson";
import type { TalkTestSheet } from "@/core/seed/schema/talk";
import { seedAnswerOf } from "@/core/seed/solve-check";
import {
  type Area,
  type Band,
  type CellRef,
  parseCellKey,
  STORY_KO_BANDS,
} from "@/core/seed/structure";
import type { SolveStatus } from "@/core/seed/validate";
import type {
  PictureCatalog,
  PictureNote,
  ViewerCell,
} from "@/server/seed-viewer/files";
import { type HumanCheckItem, ReviewPanel } from "./review-panel";
import { TalkCardTable, TalkSheetTable } from "./talk-card";

/** 아이 화면 틀 너비(10.9형 세로, playwright TABLET_10_9_VIEWPORT 의 너비). */
const CHILD_FRAME_WIDTH = "w-[820px]";
/** 틀을 쪽(main)의 좌우 여백(px-6) 밖으로 빼서 820px 화면에서 가로로 넘치지 않게 한다(page.local.tsx 의 main 여백과 짝). */
const CHILD_FRAME_BLEED = "-mx-6";
/** 내용 해시는 앞 몇 자만 보인다. */
const HASH_PREVIEW_LENGTH = 12;

export const STATUS_LABEL: Record<SolveStatus, string> = {
  passed: "통과",
  "pending-human": "사람 확인",
  unchecked: "풀이 검사 안 됨",
  "not-needed": "대상 아님",
};
export const KIND_LABEL: Record<ViewerCell["kind"], string> = {
  lesson: "수업",
  "test-item": "단계 평가 문항",
  "talk-sheet": "회화 평가 장",
  placement: "배치 문항",
  story: "토리 이야기",
};
const VERDICT_LABEL = {
  same: "같음",
  different: "다름",
  multiple: "답이 여럿",
  none: "답 없음",
} as const;
const DECISION_LABEL = { correct: "정답 맞음", fixed: "고침" } as const;
const REASON_LABEL = {
  ok: "알맞음",
  easy: "쉬움",
  hard: "어려움",
  error: "오류",
} as const;

/** 덧붙임 한 칸(머리글 · 값). */
type Extra = { label: string; value: ReactNode };
/** 화면 차례 하나: 아이 화면 내용과 덧붙임. itemPath 는 itemsOf 의 문항 경로(문항 화면만). */
type Screen = {
  activity: string;
  itemPath?: string;
  child: ReactNode;
  extras: Extra[];
};
/** 칸을 그릴 때 함께 쓰는 것(그림 찾기 · 규격 색인 · 칸 키를 푼 값). */
type Context = {
  cell: ViewerCell;
  catalog: PictureCatalog;
  index: ReferenceIndex;
  ref: CellRef | null;
};

function levelOf(ref: CellRef | null): number | undefined {
  return ref && ref.type !== "story" ? ref.level : undefined;
}
function bandOfRef(ref: CellRef | null): Band | undefined {
  return ref?.type === "story" ? ref.band : undefined;
}

/** 그 단계 말하기 질문에 한국어 뜻을 보이는가(C39, 말하기 단계 규격 questions.koMeaning). */
function speakingKo(ctx: Context): boolean {
  const level = levelOf(ctx.ref);
  if (level === undefined) return false;
  const spec = ctx.index.levelSpec("speaking", level);
  return spec?.area === "speaking" && spec.questions.koMeaning;
}

function joined(values: readonly string[]): string {
  return values.length === 0 ? "없음" : values.join(", ");
}

function pictureNoteText(note: PictureNote): string {
  const parts = [
    `${note.name}(${note.meaningKo})`,
    `그림 키 ${note.key ?? "없음"}`,
  ];
  if (note.license) parts.push(`라이선스 ${note.license}`);
  if (note.attribution) parts.push(`저작자 표시 ${note.attribution}`);
  parts.push(
    note.file
      ? note.exists
        ? note.file
        : `${note.file} 파일 없음`
      : "카탈로그에 없음",
  );
  return parts.join(" · ");
}

function pictureExtra(label: string, notes: readonly PictureNote[]): Extra {
  return {
    label,
    value: (
      <ul className="list-disc pl-5">
        {notes.map((note) => (
          <li key={note.name}>{pictureNoteText(note)}</li>
        ))}
      </ul>
    ),
  };
}

/** 정답 번호와 보기 글(그림 보기는 단어 id 와 한국어 뜻). */
function answerText(
  options: readonly string[],
  answerNo: number,
  pictureOf?: (word: string) => PictureNote,
): string {
  const option = options[answerNo - 1] ?? "(보기 밖)";
  if (pictureOf)
    return `${answerNo}. ${option}(${pictureOf(option).meaningKo})`;
  return `${answerNo}. ${option}`;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 낱말(원형 · 활용형) 가운데 글에 나온 것(대소문자 무시, 낱말 경계). 평가 지문 그림 고르기에 쓴다. */
function wordsInText(
  words: readonly string[],
  text: string,
  index: ReferenceIndex,
): string[] {
  return words.filter((word) => {
    const forms = [word, ...(index.vocab.get(word)?.forms ?? [])];
    return forms.some((form) =>
      new RegExp(`(?<![A-Za-z'])${escapeRegExp(form)}(?![A-Za-z'])`, "i").test(
        text,
      ),
    );
  });
}

function previewScreen(
  preview: readonly PreviewEntry[],
  newWords: readonly string[],
  unitWords: readonly string[],
): Screen {
  return {
    activity: "새 단어 미리보기",
    child: <NewWordsPreview entries={preview} />,
    extras: [
      { label: "새 단어", value: joined(newWords) },
      { label: "단원 단어", value: joined(unitWords) },
    ],
  };
}

// ── 수업 칸 ──────────────────────────────────────────────────────

function readingScreens(lesson: ReadingLesson, ctx: Context): Screen[] {
  const { content } = lesson;
  const { catalog } = ctx;
  const level = levelOf(ctx.ref) ?? 0;
  return [
    previewScreen(lesson.preview, lesson.newWords, lesson.unitWords),
    {
      activity: "지문",
      child: (
        <ReadingPassage
          passage={content.passage}
          glossary={content.glossary}
          markWords={[...lesson.newWords, ...content.targetWords]}
          pictureWords={lesson.newWords}
          level={level}
          pictures={catalog}
        />
      ),
      extras: [
        { label: "목표 단어", value: joined(content.targetWords) },
        {
          label: "글로서리",
          value: (
            <ul className="list-disc pl-5">
              {content.glossary.map((entry) => (
                <li key={`${entry.surface}-${entry.lemma}`}>
                  <span lang="en">{entry.surface}</span>
                  {entry.lemma === entry.surface ? "" : `(${entry.lemma})`} ·{" "}
                  {entry.meaningKo}
                  {entry.proper ? " · 고유 명사" : ""}
                </li>
              ))}
            </ul>
          ),
        },
        pictureExtra(
          "지문 그림 후보(새 단어)",
          lesson.newWords.map(catalog.noteOfWord),
        ),
      ],
    },
    ...content.questions.map((question, i) => ({
      activity: "문항",
      itemPath: `content.questions.${i}`,
      child: <ReadingQuestion question={question} pictures={catalog} reveal />,
      extras: [
        {
          label: "정답",
          value: answerText(
            question.options,
            question.answerNo,
            question.kind === "picture" ? catalog.noteOfWord : undefined,
          ),
        },
        { label: "해설", value: question.explanationKo },
        { label: "유형", value: question.type },
        ...(question.kind === "picture"
          ? [pictureExtra("그림", question.options.map(catalog.noteOfWord))]
          : []),
      ],
    })),
  ];
}

function writingItemExtras(
  item: WritingItemData,
  catalog: PictureCatalog,
): Extra[] {
  const extras: Extra[] = [
    { label: "허용 정답", value: joined(item.accepted) },
    { label: "유형", value: item.type },
  ];
  if (item.type === "pick-word") {
    extras.unshift({
      label: "정답",
      value: answerText(item.options, item.answerNo),
    });
    extras.push(pictureExtra("그림", [catalog.noteOfWord(item.picture)]));
  }
  if (item.type === "fill-letters") {
    extras.push(pictureExtra("그림", [catalog.noteOfWord(item.word)]));
  }
  if (item.type === "dictation") {
    extras.push({ label: "읽어 줄 글", value: item.audioText });
  }
  return extras;
}

function writingScreens(lesson: WritingLesson, ctx: Context): Screen[] {
  const { catalog } = ctx;
  const head = previewScreen(lesson.preview, lesson.newWords, lesson.unitWords);
  const { content } = lesson;
  switch (content.shape) {
    case "items":
      return [
        head,
        ...content.items.map((item, i) => ({
          activity: "문항",
          itemPath: `content.items.${i}`,
          child: <WritingItem item={item} pictures={catalog} reveal />,
          extras: writingItemExtras(item, catalog),
        })),
      ];
    case "guided":
      return [
        head,
        {
          activity: "과제",
          child: (
            <WritingGuidedTask task={content.task} example={content.example} />
          ),
          extras: [
            { label: "힌트", value: joined(content.hints) },
            { label: "채점 기준", value: joined(content.rubric) },
          ],
        },
        ...content.sentences.map((sentence, i) => ({
          activity: "문장",
          itemPath: `content.sentences.${i}`,
          child: (
            <WritingGuidedSentence
              frame={sentence.frame}
              wordBox={sentence.wordBox}
            />
          ),
          extras: [{ label: "모범 문장", value: sentence.model }],
        })),
      ];
    case "composition":
      return [
        head,
        {
          activity: "과제",
          itemPath: "content",
          child: (
            <WritingComposition
              task={content.task}
              example={content.example}
              hints={content.hints}
            />
          ),
          extras: [
            { label: "채점 기준", value: joined(content.rubric) },
            {
              label: "실시간 호출",
              value: "생각 꺼내기 · 첨삭은 실시간 호출이라 시드에 없어요",
            },
          ],
        },
      ];
  }
}

function speakingScreens(lesson: SpeakingLesson, ctx: Context): Screen[] {
  const { catalog } = ctx;
  const { content } = lesson;
  const showKo = speakingKo(ctx);
  const screens: Screen[] = [
    previewScreen(lesson.preview, lesson.newWords, lesson.unitWords),
  ];
  content.repeat.words.forEach((word, i) => {
    screens.push({
      activity: "따라 말하기(낱말)",
      itemPath: `content.repeat.words.${i}`,
      child: <RepeatItem text={word} />,
      extras: [],
    });
  });
  content.repeat.sentences.forEach((sentence, i) => {
    screens.push({
      activity: "따라 말하기(문장)",
      itemPath: `content.repeat.sentences.${i}`,
      child: <RepeatItem text={sentence} />,
      extras: [],
    });
  });
  content.listening.forEach((item, i) => {
    screens.push({
      activity: "듣기",
      itemPath: `content.listening.${i}`,
      child: <ListeningItem item={item} pictures={catalog} reveal />,
      extras: [
        { label: "읽어 줄 글", value: item.script },
        {
          label: "정답",
          value: answerText(
            item.options,
            item.answerNo,
            item.kind === "picture" ? catalog.noteOfWord : undefined,
          ),
        },
        ...(item.kind === "picture"
          ? [pictureExtra("그림", item.options.map(catalog.noteOfWord))]
          : []),
      ],
    });
  });
  content.questions.forEach((question, i) => {
    screens.push({
      activity: "질문",
      itemPath: `content.questions.${i}`,
      child: <SpeakingQuestion question={question} showKo={showKo} />,
      extras: [
        {
          label: showKo ? "한국어 뜻" : "한국어 뜻(이 단계는 아이에게 안 보임)",
          value: question.ko ?? "없음",
        },
        { label: "바른 답", value: question.modelAnswer ?? "없음" },
        { label: "허용 답", value: joined(question.accepted ?? []) },
      ],
    });
  });
  if (content.pictureTask) {
    const task = content.pictureTask;
    screens.push({
      activity: "그림 보고 말하기",
      itemPath: "content.pictureTask",
      child: <PictureTask task={task} pictures={catalog} />,
      extras: [
        { label: "장면 설명(아이에게 안 보임)", value: task.scene },
        pictureExtra("그림", task.images.map(catalog.noteOfKey)),
      ],
    });
  }
  if (content.presentation) {
    const task = content.presentation;
    screens.push({
      activity: "발표",
      itemPath: "content.presentation",
      child: <PresentationTask topic={task.topic} prepWords={task.prepWords} />,
      extras: [
        { label: "예비 확인 질문", value: joined(task.fallbackQuestions) },
      ],
    });
  }
  return screens;
}

// ── 평가 · 배치 문항 칸 ───────────────────────────────────────────

type AnyTestItem = TestItem | PlacementItem;

/** 평가 · 배치 읽기 지문에 그림을 붙일 낱말: 연결 단원(배치는 그 단계 단원 전부)의 단어 가운데 지문에 나온 것. */
function testPictureWords(
  passage: string,
  unit: number | undefined,
  ctx: Context,
): string[] {
  const level = levelOf(ctx.ref);
  if (level === undefined) return [];
  const units =
    unit === undefined
      ? ctx.index.unitsOf("reading", level)
      : [ctx.index.unitSpec("reading", level, unit)].filter(
          (spec) => spec !== undefined,
        );
  return wordsInText(
    units.flatMap((spec) => spec.words),
    passage,
    ctx.index,
  );
}

function testItemChild(item: AnyTestItem, ctx: Context): ReactNode {
  const { catalog } = ctx;
  const level = levelOf(ctx.ref) ?? 0;
  switch (ctx.cell.area) {
    case "reading": {
      const reading = item as ReadingTestItemData;
      return (
        <ReadingTestItem
          item={reading}
          level={level}
          pictureWords={testPictureWords(
            reading.passage,
            "unit" in reading ? reading.unit : undefined,
            ctx,
          )}
          pictures={catalog}
          reveal
        />
      );
    }
    case "speaking":
      return (
        <SpeakingTestItem
          item={item as SpeakingTestItemData}
          pictures={catalog}
          showKo={speakingKo(ctx)}
          reveal
        />
      );
    default: {
      const writing = item as WritingTestItemType;
      switch (writing.type) {
        case "fill-blank":
          return (
            <FillBlankItem
              prompt={writing.prompt}
              accepted={writing.accepted}
              reveal
            />
          );
        case "fix-sentence":
          return (
            <FixSentenceItem
              prompt={writing.prompt}
              accepted={writing.accepted}
              reveal
            />
          );
        case "composition":
          return (
            <CompositionTestItem
              task={writing.task}
              example={writing.example}
            />
          );
        default:
          return <WritingItem item={writing} pictures={catalog} reveal />;
      }
    }
  }
}

function testItemExtras(item: AnyTestItem, ctx: Context): Extra[] {
  const { catalog, cell, ref } = ctx;
  const extras: Extra[] = [];
  if ("options" in item && "answerNo" in item) {
    const picture =
      item.type === "picture" || ("kind" in item && item.kind === "picture");
    extras.push({
      label: "정답",
      value: answerText(
        item.options,
        item.answerNo,
        picture ? catalog.noteOfWord : undefined,
      ),
    });
    if (picture) {
      extras.push(pictureExtra("그림", item.options.map(catalog.noteOfWord)));
    }
  }
  if ("accepted" in item && item.accepted) {
    extras.push({ label: "허용 정답", value: joined(item.accepted) });
  }
  if ("script" in item)
    extras.push({ label: "읽어 줄 글", value: item.script });
  if ("audioText" in item)
    extras.push({ label: "읽어 줄 글", value: item.audioText });
  if ("ko" in item && item.ko) {
    extras.push({
      label: speakingKo(ctx)
        ? "한국어 뜻"
        : "한국어 뜻(이 단계는 아이에게 안 보임)",
      value: item.ko,
    });
  }
  if ("modelAnswer" in item && item.modelAnswer)
    extras.push({ label: "바른 답", value: item.modelAnswer });
  if ("rubric" in item)
    extras.push({ label: "채점 기준", value: joined(item.rubric) });
  if ("explanationKo" in item && item.explanationKo)
    extras.push({ label: "해설", value: item.explanationKo });
  if ("unit" in item)
    extras.push({ label: "연결 단원", value: `단원 ${item.unit}` });
  extras.push({ label: "유형", value: item.type });
  if (cell.kind === "test-item") {
    extras.push({
      label: "AI 과제",
      value: isAiItem(item) ? "예(실시간 채점)" : "아니오(앱 채점)",
    });
  }
  if (ref?.type === "placement") {
    extras.push({ label: "예비 문항", value: ref.spare ? "예" : "아니오" });
  }
  return extras;
}

// ── 토리 이야기 칸 ───────────────────────────────────────────────

function storyScreens(story: Story, ctx: Context): Screen[] {
  const band = bandOfRef(ctx.ref);
  const showKo = band !== undefined && STORY_KO_BANDS.includes(band);
  return [
    {
      activity: "이야기",
      child: <StoryText story={story} showKo={showKo} />,
      extras: story.textKo
        ? [
            {
              label: showKo
                ? "한국어 뜻"
                : "한국어 뜻(이 구간은 아이에게 안 보임)",
              value: story.textKo,
            },
          ]
        : [],
    },
    ...story.questions.map((question, i) => ({
      activity: "질문",
      itemPath: `questions.${i}`,
      child: <StoryQuestion question={question} reveal />,
      extras: [
        {
          label: "정답",
          value: answerText(question.options, question.answerNo),
        },
        { label: "해설", value: question.explanationKo },
      ],
    })),
  ];
}

// ── 칸 그리기 ───────────────────────────────────────────────────

function screensOf(ctx: Context): Screen[] {
  const { cell } = ctx;
  switch (cell.kind) {
    case "lesson":
      switch (cell.area) {
        case "reading":
          return readingScreens(cell.value as ReadingLesson, ctx);
        case "writing":
          return writingScreens(cell.value as WritingLesson, ctx);
        case "speaking":
          return speakingScreens(cell.value as SpeakingLesson, ctx);
        default:
          return [];
      }
    case "test-item":
    case "placement": {
      const item = cell.value as AnyTestItem;
      return [
        {
          activity: "문항",
          itemPath: "",
          child: testItemChild(item, ctx),
          extras: testItemExtras(item, ctx),
        },
      ];
    }
    case "story":
      return storyScreens(cell.value as Story, ctx);
    default:
      return [];
  }
}

/** 칸의 제목: 수업 목록 제목 · 문항 유형 · 이야기 제목 · 장 번호. */
export function cellTitle(cell: ViewerCell): string {
  const value = cell.value as Record<string, unknown> | null;
  if (cell.broken || !value || typeof value !== "object") return "-";
  switch (cell.kind) {
    case "lesson":
      return typeof value.title === "string" ? value.title : "-";
    case "test-item":
    case "placement":
      return typeof value.type === "string" ? value.type : "-";
    case "story":
      return typeof value.title === "string"
        ? value.title
        : `이야기 ${String(value.no)}`;
    case "talk-sheet":
      return `장 ${String(value.sheet)}`;
  }
}

function ScreenView({
  screen,
  n,
  itemNo,
  area,
}: {
  screen: Screen;
  n: number;
  itemNo: number | undefined;
  area: Area;
}) {
  const labelId = `screen-${n}-label`;
  return (
    <section aria-labelledby={labelId} className="flex flex-col gap-2">
      <p id={labelId} className="text-sm font-semibold text-neutral-700">
        활동 {n} · {screen.activity}
        {itemNo === undefined ? "" : ` · 문항 ${itemNo}`}
      </p>
      <section
        aria-label={`아이 화면 ${n}`}
        className={`${CHILD_FRAME_WIDTH} ${CHILD_FRAME_BLEED} shrink-0 border-y border-neutral-300 bg-neutral-100 p-6`}
      >
        <ActivityCard area={area}>{screen.child}</ActivityCard>
      </section>
      <section
        aria-label={`덧붙임 ${n}`}
        className="rounded-lg border border-neutral-300 bg-white p-3 text-sm"
      >
        {screen.extras.length === 0 ? (
          <p className="text-neutral-600">덧붙일 것이 없어요</p>
        ) : (
          <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-1">
            {screen.extras.map((extra) => (
              <div key={extra.label} className="contents">
                <dt className="font-semibold">{extra.label}</dt>
                <dd>{extra.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </section>
  );
}

function SolveCheckView({ cell }: { cell: ViewerCell }) {
  const record = cell.record;
  if (cell.status === "not-needed") {
    return <p>풀이 검사 대상이 아니에요.</p>;
  }
  if (!record) return <p>풀이 검사 기록이 없어요.</p>;
  if (record.contentHash !== cell.hash) {
    return <p>내용이 바뀌어 풀이 검사가 안 됐어요.</p>;
  }
  const human =
    record.human?.contentHash === cell.hash ? record.human : undefined;
  return (
    <div className="flex flex-col gap-2">
      <p>
        {record.solve.model} · {record.solve.at} · 입력{" "}
        {record.solve.inputTokens} · 출력 {record.solve.outputTokens} 토큰 ·{" "}
        {record.solve.costUsd} 달러
      </p>
      <table className="w-full" aria-label="풀이 검사">
        <thead>
          <tr className="text-left">
            <th className="py-1 pr-2">문항</th>
            <th className="py-1 pr-2">판단</th>
            <th className="py-1 pr-2">풀이 답</th>
            <th className="py-1 pr-2">허용 정답 후보</th>
            <th className="py-1">사람 확인</th>
          </tr>
        </thead>
        <tbody>
          {record.solve.items.map((item) => {
            const decision = human?.items.find(
              (h) => h.no === item.no,
            )?.decision;
            return (
              <tr key={item.no} className="border-t border-neutral-200">
                <td className="py-1 pr-2">{item.no}</td>
                <td className="py-1 pr-2">{VERDICT_LABEL[item.verdict]}</td>
                <td className="py-1 pr-2">
                  {item.solverAnswer === undefined
                    ? "-"
                    : String(item.solverAnswer)}
                </td>
                <td className="py-1 pr-2">
                  {joined(item.extraAccepted ?? [])}
                </td>
                <td className="py-1">
                  {decision ? DECISION_LABEL[decision] : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReviewRowsView({ cell }: { cell: ViewerCell }) {
  if (cell.reviews.length === 0) return <p>표본 검토 행이 없어요.</p>;
  const numbered = cell.reviews.map((row, i) => ({ row, no: i + 1 }));
  return (
    <table className="w-full" aria-label="표본 검토">
      <thead>
        <tr className="text-left">
          <th className="py-1 pr-2">날짜</th>
          <th className="py-1 pr-2">사유</th>
          <th className="py-1 pr-2">문항</th>
          <th className="py-1">메모</th>
        </tr>
      </thead>
      <tbody>
        {numbered.map(({ row, no }) => (
          <tr key={no} className="border-t border-neutral-200">
            <td className="py-1 pr-2">{row.date}</td>
            <td className="py-1 pr-2">{REASON_LABEL[row.reason]}</td>
            <td className="py-1 pr-2">{row.itemNo ?? "칸 전체"}</td>
            <td className="py-1">{row.memo === "" ? "-" : row.memo}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** 허용 정답 견주기(앞뒤 공백 · 대소문자 무시, P4c solveStatus 와 같은 셈). */
function normalizedAnswer(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * 사람 확인 칸에 보일 걸린 문항(plan-p05c '화면'): 칸이 사람 확인 상태일 때, 같은 해시 풀이 기록에서 판단이 '같음'이 아니거나
 * 시드 밖 허용 정답 후보가 있는 문항(solveStatus 와 같은 셈). 같은 해시로 남긴 확인이 있으면 함께 보인다.
 */
function humanCheckItems(cell: ViewerCell): HumanCheckItem[] {
  const record = cell.record;
  if (
    cell.status !== "pending-human" ||
    !record ||
    record.contentHash !== cell.hash
  ) {
    return [];
  }
  const human =
    record.human?.contentHash === cell.hash ? record.human : undefined;
  return record.solve.items.flatMap((item) => {
    const seed = seedAnswerOf(cell, item.no);
    const accepted = new Set((seed.accepted ?? []).map(normalizedAnswer));
    const outside = (item.extraAccepted ?? []).filter(
      (candidate) => !accepted.has(normalizedAnswer(candidate)),
    );
    if (item.verdict === "same" && outside.length === 0) return [];
    const decision = human?.items.find((h) => h.no === item.no)?.decision;
    return [
      {
        no: item.no,
        verdict: VERDICT_LABEL[item.verdict],
        solverAnswer:
          item.solverAnswer === undefined ? "-" : String(item.solverAnswer),
        candidates: joined(item.extraAccepted ?? []),
        seedAnswer:
          seed.answerNo === undefined
            ? joined(seed.accepted ?? [])
            : `보기 ${seed.answerNo}`,
        ...(decision ? { decided: DECISION_LABEL[decision] } : {}),
      },
    ];
  });
}

function ErrorList({ cell }: { cell: ViewerCell }) {
  return (
    <ul className="list-disc pl-5">
      {cell.errors.map((error) => (
        <li key={`${error.rule}-${error.path}-${error.message}`}>
          [{error.rule}] {error.path} · {error.message}
        </li>
      ))}
    </ul>
  );
}

/** 칸 하나의 보기. */
export function CellView({
  cell,
  catalog,
  index,
}: {
  cell: ViewerCell;
  catalog: PictureCatalog;
  index: ReferenceIndex;
}) {
  const area: Area = cell.area ?? "talk";
  const ctx: Context = { cell, catalog, index, ref: parseCellKey(cell.key) };
  const itemNoOf = (path: string | undefined) =>
    path === undefined
      ? undefined
      : cell.items.find((item) => item.path === path)?.no;
  return (
    <article className="flex flex-col gap-6">
      <header data-cell-head={cell.key} className="flex flex-col gap-2">
        <h1 className="break-all text-2xl font-bold">{cell.key}</h1>
        <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="font-semibold">종류</dt>
          <dd>{KIND_LABEL[cell.kind]}</dd>
          <dt className="font-semibold">제목 · 유형</dt>
          <dd>{cellTitle(cell)}</dd>
          <dt className="font-semibold">풀이 검사</dt>
          <dd>{STATUS_LABEL[cell.status]}</dd>
          <dt className="font-semibold">내용 해시</dt>
          <dd className="font-mono">
            {cell.hash.slice(0, HASH_PREVIEW_LENGTH)}
          </dd>
          <dt className="font-semibold">파일 안 자리</dt>
          <dd className="font-mono">{cell.path}</dd>
        </dl>
      </header>

      {cell.broken ? (
        <section
          aria-label="규격이 깨진 칸"
          className="flex flex-col gap-2 text-sm"
        >
          <h2 className="text-lg font-bold">규격이 깨진 칸이에요</h2>
          <ErrorList cell={cell} />
          <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-4 text-xs text-neutral-100">
            {JSON.stringify(cell.value, null, 2)}
          </pre>
        </section>
      ) : cell.kind === "lesson" && cell.area === "talk" ? (
        <section aria-label="회화 카드" className="flex flex-col gap-2">
          <p className="text-sm text-neutral-700">
            회화 아이 화면은 1-나에서 만들어요. 카드 내용을 어른용 표로 보여요.
          </p>
          <TalkCardTable
            lesson={cell.value as TalkLesson}
            noteOfKey={catalog.noteOfKey}
          />
        </section>
      ) : cell.kind === "talk-sheet" ? (
        <section aria-label="회화 평가 장" className="flex flex-col gap-2">
          <p className="text-sm text-neutral-700">
            회화 평가는 아이 화면 없이 장 내용을 어른용 표로 보여요.
          </p>
          <TalkSheetTable sheet={cell.value as TalkTestSheet} />
        </section>
      ) : (
        <div className="flex flex-col gap-8">
          {screensOf(ctx).map((screen, i) => (
            <ScreenView
              key={`${screen.activity}-${screen.itemPath ?? "-"}`}
              screen={screen}
              n={i + 1}
              itemNo={itemNoOf(screen.itemPath)}
              area={area}
            />
          ))}
        </div>
      )}

      {cell.errors.length > 0 && !cell.broken ? (
        <section aria-label="칸 오류" className="text-sm">
          <h2 className="text-lg font-bold">칸 오류</h2>
          <ErrorList cell={cell} />
        </section>
      ) : null}

      <section
        aria-label="풀이 검사 결과"
        className="flex flex-col gap-2 text-sm"
      >
        <h2 className="text-lg font-bold">풀이 검사</h2>
        <SolveCheckView cell={cell} />
      </section>

      <section
        aria-label="표본 검토 행"
        className="flex flex-col gap-2 text-sm"
      >
        <h2 className="text-lg font-bold">표본 검토</h2>
        <ReviewRowsView cell={cell} />
      </section>

      <ReviewPanel
        key={cell.key}
        file={cell.file}
        cell={cell.key}
        contentHash={cell.hash}
        itemNos={cell.items.map((item) => item.no)}
        humanItems={humanCheckItems(cell)}
      />
    </article>
  );
}
