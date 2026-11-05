// 세션 진행 표시 — 활동 묶음 막대(UI · UX plan 묶음 5-가 · spec 설계 5.4 세션 '진행 표시는 점 대신 활동 묶음 막대(묶음 이름 · 지금 자리)' ·
// UX 검토 3판 D-7 '작은 점 18개라 셀 수 없다'). DB 없는 순수 함수다. 이웃한 활동을 같은 묶음 이름끼리 묶고, 묶음마다 끝낸 수 · 지금 자리 ·
// 칸 상태(칸 하나 = 활동 하나)를 낸다. 묶음 이름은 정본 3.2 · 3.3 의 활동 · 자리 이름에서 가져와 새 문구를 만들지 않는다(plan 정한 것 8 —
// 새 단어 · 과제 · 따라 말하기 · 듣기 · 질문 …). 이름 표는 이 파일 한 곳이다.
// 가르치는 수업(활동에 오늘 배울 것이 있는 수업 — 가르치고 배우는 수업 plan 묶음 라-2 · 정한 것 1 · 16)은 묶음을 자리로 낸다: 오늘 배울 것 ·
// 살펴보기(새 단어 + 본보기) · 같이 해 보기 · 혼자 해 보기(혼자 문항 전부 — 지문 · 문항 · 따라 말하기 · 듣기 · 질문) · 스스로 해 보기(짝).
// 자리 이름은 위 띠 자리 이름 표(core/session/teach-line TEACH_SLOT_NAME) 하나에서 온다. teach 가 없는 수업의 표는 그대로다.
import type { Activity, ActivityKind } from "@/core/session/preview";
import { TEACH_SLOT_NAME } from "@/core/session/teach-line";

/** 묶음 이름 표(정본 3.2 · 3.3 의 활동 · 자리 이름). */
export const ACTIVITY_GROUP_NAME = {
  // 세 영역 수업의 자리(3.3 '세 영역 수업의 여섯 자리', C184) — 가르치는 수업에만 있는 묶음. 이름은 위 띠 자리 이름 표 그대로(정한 것 16)
  today: TEACH_SLOT_NAME.today,
  show: TEACH_SLOT_NAME.show,
  together: TEACH_SLOT_NAME.together,
  solo: TEACH_SLOT_NAME.solo,
  spare: TEACH_SLOT_NAME.spare,
  // 3.2 첫 활동 새 단어 미리보기
  preview: "새 단어",
  // 읽기(3.3 '지문 읽기 → 객관식 이해 문제')
  passage: "지문 읽기",
  problem: "문제",
  // 쓰기 4~12(3.3 쓰기 세션 순서)
  // 쓰기 4~5 의 과제 → 문장 틀 쓰기는 정본 3.3 쓰기 4단계 행이 한 묶음(혼자 해 보기)이라 '과제' 하나로(5-가 검토 M1 — 새 문구 없음)
  task: "과제",
  thinkout: "생각 꺼내기",
  draft: "초고 쓰기",
  feedback: "첨삭 보기",
  rewrite: "고쳐 쓰기",
  modelAnswer: "모범 답안",
  ownSpeak: "내 문장 말하기",
  // 말하기(3.3 단계표 머리 '따라 말하기 · 듣기 이해 · 질문 답 · 발표', 9단계부터 주제 말하기 · 확인 질문)
  repeat: "따라 말하기",
  listening: "듣기",
  question: "질문",
  presentation: "주제 말하기",
  confirm: "확인 질문",
} as const;

export type ActivityGroupKey = keyof typeof ACTIVITY_GROUP_NAME;

/** 활동 종류 → 묶음(쓰기 '내 문장 듣고 따라 말하기'는 따라 말하기, 쓰기 1~3 문항 · 읽기 문항은 문제). */
export const ACTIVITY_GROUP_OF = {
  today: "today",
  model: "show",
  together: "together",
  spare: "spare",
  preview: "preview",
  "reading-passage": "passage",
  "reading-question": "problem",
  "writing-item": "problem",
  "writing-task": "task",
  "writing-guided": "task",
  "writing-own-repeat": "repeat",
  thinkout: "thinkout",
  draft: "draft",
  "feedback-praise": "feedback",
  "feedback-correction": "feedback",
  rewrite: "rewrite",
  "model-answer": "modelAnswer",
  "own-speak": "ownSpeak",
  "repeat-word": "repeat",
  "repeat-sentence": "repeat",
  listening: "listening",
  "picture-task": "question",
  question: "question",
  presentation: "presentation",
  "confirm-question": "confirm",
} as const satisfies Record<ActivityKind, ActivityGroupKey>;

/** 가르치는 수업의 자리(위 띠 자리 이름 표의 열쇠 — 되짚기는 결과 화면 몫이라 없다). */
export type TeachSlot = keyof typeof TEACH_SLOT_NAME;

/**
 * 가르치는 수업에서 활동 종류 → 자리(정한 것 16). 새 단어는 본보기와 함께 살펴보기, 짝은 스스로 해 보기, 그 밖 과제 활동은 모두 혼자 해 보기다.
 */
export const TEACH_SLOT_OF = {
  today: "today",
  model: "show",
  together: "together",
  spare: "spare",
  preview: "show",
  "reading-passage": "solo",
  "reading-question": "solo",
  "writing-item": "solo",
  "writing-task": "solo",
  "writing-guided": "solo",
  "writing-own-repeat": "solo",
  thinkout: "solo",
  draft: "solo",
  "feedback-praise": "solo",
  "feedback-correction": "solo",
  rewrite: "solo",
  "model-answer": "solo",
  "own-speak": "solo",
  "repeat-word": "solo",
  "repeat-sentence": "solo",
  listening: "solo",
  "picture-task": "solo",
  question: "solo",
  presentation: "solo",
  "confirm-question": "solo",
} as const satisfies Record<ActivityKind, TeachSlot>;

/** 가르치는 수업의 활동 목록인가(오늘 배울 것이 있다 — teach 칸이 있는 수업만 여섯 자리 차례, 정한 것 1). */
export function isTeachActivities(
  activities: readonly Pick<Activity, "kind">[],
): boolean {
  return activities.some((a) => a.kind === "today");
}

/** 칸 하나(활동 하나)의 상태: 끝냄 · 지금 · 아직. */
export type ProgressCell = "done" | "current" | "next";

/** 활동 묶음 하나. */
export type ActivityGroup = {
  key: ActivityGroupKey;
  name: string;
  /** 묶음 첫 활동 번호(1부터 — attempts.activity_no). */
  first: number;
  /** 묶음 안 활동 수. */
  size: number;
  /** 묶음 안 끝낸 활동 수. */
  done: number;
  /** 지금 활동이 든 묶음 · 다 끝낸 묶음 · 아직. */
  state: ProgressCell;
  /** 지금 묶음 안 자리(1부터). 지금 묶음이 아니면 없음. */
  at?: number;
  /** 칸마다 상태(묶음 안 차례). */
  cells: ProgressCell[];
};

/**
 * 활동 목록 → 묶음 막대(순수). current 는 지금 활동 번호(1부터), finals 는 끝 시도가 있는 활동 번호다. 이웃한 같은 묶음만 합친다(떨어진
 * 같은 이름은 따로 — 차례가 곧 자리). 지금 활동이 목록 밖이면(끝낸 뒤) 지금 묶음이 없다. 가르치는 수업은 자리 표(TEACH_SLOT_OF)로 묶는다.
 * hidden 은 막대에서 뺄 활동 번호다(가르치는 수업의 내지 않을 짝 — teach-frame progressHiddenOf).
 */
export function activityGroupsOf(
  activities: readonly Pick<Activity, "kind">[],
  current: number,
  finals: ReadonlySet<number>,
  hidden: ReadonlySet<number> = new Set(),
): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  const teach = isTeachActivities(activities);
  activities.forEach((activity, i) => {
    const no = i + 1;
    // 막대에서 뺀 활동(가르치는 수업의 내지 않을 짝 — 칸 · 묶음을 만들지 않음, first 는 남은 칸의 번호)
    if (hidden.has(no)) return;
    const key: ActivityGroupKey = teach
      ? TEACH_SLOT_OF[activity.kind]
      : ACTIVITY_GROUP_OF[activity.kind];
    const cell: ProgressCell =
      no === current ? "current" : finals.has(no) ? "done" : "next";
    const last = groups.at(-1);
    const group =
      last && last.key === key
        ? last
        : (() => {
            const created: ActivityGroup = {
              key,
              name: ACTIVITY_GROUP_NAME[key],
              first: no,
              size: 0,
              done: 0,
              state: "next",
              cells: [],
            };
            groups.push(created);
            return created;
          })();
    group.size += 1;
    group.cells.push(cell);
    if (cell === "done") group.done += 1;
    if (cell === "current") group.at = group.size;
  });
  for (const group of groups) {
    group.state =
      group.at !== undefined
        ? "current"
        : group.done === group.size
          ? "done"
          : "next";
  }
  return groups;
}
