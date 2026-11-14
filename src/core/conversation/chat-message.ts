// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R spec 설계 3 · 11, plan 묶음 P1)의 사용자 메시지 꼴.
// 차례마다 Claude 에게 보내는 글은 '사실 줄(있을 때만) + 입력 줄 한 줄(+ 인식기 알림 한 줄)' 하나다. 입력 줄은 수업 시작 · 말함 · 모름 단추 ·
// 누르지 않음 · 눌렀으나 듣지 못함 · 더 이야기하기 · 짧은 준비 뒤 돌아옴이고, 사실 줄은 인사 끝 · 한국어 도움 · 마무리 차례 · 안전 상한의 넷뿐이다.
// 목표 낱말 · 턴 수 · 도움 기록 · 지난 수업 요약은 보내지 않는다(FR-3). 글은 시제품 R3(scripts/exp/arch-arm-q.ts)와 spec 표의 글 그대로다.
// 인식기 정보(확신 정도 · 다른 후보 · 중간 결과 표지)의 꼴과 알림 줄을 붙일지의 판단도 여기 둔다(spec 설계 11). 어떤 사실 줄을 어느 차례에 붙일지는
// 차례 판단(chat-turn-core, 묶음 P3)이 정한다. 순수 모듈이다(DB · SDK 없음, 현재 시각을 읽지 않는다).
import { z } from "zod";
import { CallSettingError, type SettingValues } from "@/core/ai/calls/common";

// ── 설정(spec 설정 표) ──────────────────────────────────────────────

export const CHAT_DAY_PART_HOURS_KEY = "talk.chat_day_part_hours";
export const CHAT_UNSURE_CONFIDENCE_KEY = "talk.chat_unsure_confidence";
export const CHAT_UNSURE_ON_PARTIAL_KEY = "talk.chat_unsure_on_partial";

/** 하루의 시 수(시각 범위 0 ~ 23 의 끝, 단위 값). */
const HOURS_PER_DAY = 24;

/** 수업 시작 사실의 때 셋(경계 시각 talk.chat_day_part_hours 의 차례와 같다). */
export const CHAT_DAY_PARTS = ["morning", "afternoon", "evening"] as const;
export type ChatDayPart = (typeof CHAT_DAY_PARTS)[number];

/** morning · afternoon · evening 이 시작하는 시(0~23 의 오름차순 정수 셋). */
export type ChatDayPartHours = readonly [number, number, number];

const DayPartHours = z
  .array(
    z
      .int()
      .min(0)
      .max(HOURS_PER_DAY - 1),
  )
  .length(CHAT_DAY_PARTS.length)
  .refine((hours) => hours.every((h, i) => i === 0 || h > (hours[i - 1] ?? h)));

/** 이야기 방식 사용자 메시지가 읽는 설정 키의 규격(턴 길의 설정 읽기에 넣는다). */
export const CHAT_MESSAGE_SETTING_SCHEMAS: Readonly<Record<string, z.ZodType>> =
  {
    [CHAT_DAY_PART_HOURS_KEY]: DayPartHours,
    [CHAT_UNSURE_CONFIDENCE_KEY]: z.number().min(0).max(1),
    [CHAT_UNSURE_ON_PARTIAL_KEY]: z.boolean(),
  };

function readSetting<T>(values: SettingValues, key: string): T {
  const parsed = CHAT_MESSAGE_SETTING_SCHEMAS[key]?.safeParse(values[key]);
  if (!parsed?.success) throw new CallSettingError(key, "없거나 꼴이 틀렸다");
  return parsed.data as T;
}

/** 때의 경계 시각(talk.chat_day_part_hours). 없거나 꼴이 틀리면 CallSettingError 를 던진다. */
export function chatDayPartHoursOf(values: SettingValues): ChatDayPartHours {
  return readSetting<ChatDayPartHours>(values, CHAT_DAY_PART_HOURS_KEY);
}

/** 인식기 알림의 설정(spec 설계 11 — 확신 정도 문턱 · 중간 결과만으로 끝난 말에 알림을 붙일지). */
export type ChatRecognizerRules = {
  unsureConfidence: number;
  unsureOnPartial: boolean;
};

/** 인식기 알림의 설정을 읽는다. 없거나 꼴이 틀리면 CallSettingError 를 던진다. */
export function chatRecognizerRulesOf(
  values: SettingValues,
): ChatRecognizerRules {
  return {
    unsureConfidence: readSetting<number>(values, CHAT_UNSURE_CONFIDENCE_KEY),
    unsureOnPartial: readSetting<boolean>(values, CHAT_UNSURE_ON_PARTIAL_KEY),
  };
}

// ── 수업 시작의 사실(입구 start, spec 설계 3 첫 줄) ─────────────────────

/**
 * 그 시의 때: 첫 경계(morning) 이상 둘째 경계 미만은 morning, 둘째 이상 셋째 미만은 afternoon, 그 밖(셋째 경계부터 자정을 넘어 첫 경계 전까지)은
 * evening 이다. 시가 0~23 의 정수가 아니면 던진다.
 */
export function chatDayPartOf(
  hour: number,
  hours: ChatDayPartHours,
): ChatDayPart {
  if (!Number.isInteger(hour) || hour < 0 || hour >= HOURS_PER_DAY)
    throw new RangeError(
      `시는 0 이상 ${HOURS_PER_DAY} 미만 정수여야 합니다: ${hour}`,
    );
  const [morning, afternoon, evening] = hours;
  if (hour >= morning && hour < afternoon) return "morning";
  if (hour >= afternoon && hour < evening) return "afternoon";
  return "evening";
}

/** 수업 시작 사실의 요일(영어 이름, 'Friday') · 때. */
export type ChatClock = { weekday: string; dayPart: ChatDayPart };

const clockFormatters = new Map<string, Intl.DateTimeFormat>();

function clockFormatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = clockFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      hour: "2-digit",
      hourCycle: "h23",
    });
    clockFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** 요일의 영어 이름(Intl 'en-US' long 과 같은 글, 일요일부터 — 전날 요일을 셀 때 쓴다). */
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * 그 순간의 요일 · 때(가족 시간대 app.timezone 의 벽시계 — 학습일의 하루 시작 시각은 쓰지 않는다). 시각은 부르는 쪽이 넘긴다.
 * 첫 경계(talk.chat_day_part_hours 의 첫 값) 전의 새벽은 전날 밤에서 이어진 때이므로 전날 요일과 evening 이다(토요일 02시 → 'Friday evening',
 * 고침 브리프 P1 fix 1 M1). 틀린 시간대면 Intl 이 RangeError 를 던진다.
 */
export function chatClockOf(
  instant: Date,
  timeZone: string,
  hours: ChatDayPartHours,
): ChatClock {
  const parts = clockFormatterFor(timeZone).formatToParts(instant);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = parts.find((p) => p.type === "hour")?.value;
  const index = (WEEKDAYS as readonly string[]).indexOf(weekday ?? "");
  if (index < 0 || hour === undefined)
    throw new RangeError("시각을 읽지 못했습니다(요일 · 시)");
  const h = Number(hour);
  const dayPart = chatDayPartOf(h, hours);
  if (h >= hours[0]) return { weekday: WEEKDAYS[index] as string, dayPart };
  const before = (index + WEEKDAYS.length - 1) % WEEKDAYS.length;
  return { weekday: WEEKDAYS[before] as string, dayPart };
}

/** 만남 문장(시제품 r2StartMessageOf 그대로): met 은 같은 프로필이 같은 선생님과 정리까지 닫은 회화 수업 수다. */
export function chatMetSentenceOf(met: number): string {
  if (!Number.isInteger(met) || met < 0)
    throw new RangeError(`만난 횟수는 0 이상 정수여야 합니다: ${met}`);
  if (met === 0) return "This is your first chat with this child.";
  return `You and this child have chatted ${met} ${met === 1 ? "time" : "times"} before.`;
}

/** 수업 시작 메시지(입구 start, spec 설계 3). */
export function chatStartLineOf({
  clock,
  met,
}: {
  clock: ChatClock;
  met: number;
}): string {
  return `(The chat starts now. It is ${clock.weekday} ${clock.dayPart}. ${chatMetSentenceOf(met)} Say hello.)`;
}

// ── 인식기 정보(spec 설계 11) ──────────────────────────────────────

/**
 * 턴 요청에 싣는 인식기 정보의 꼴: 확신 정도(0~1, 없거나 모르면 비움) · 다른 후보 글(아이 말 글이 확정 결과 하나일 때 그 결과의 둘째 후보) ·
 * 중간 결과만으로 끝났는지. textMax 는 다른 후보 글의 길이 상한이다(아이 말 글과 같은 상한을 부르는 쪽이 넘긴다).
 */
export function chatRecognizerSchemaOf(textMax: number) {
  return z.object({
    confidence: z.number().min(0).max(1).nullable().optional(),
    alternative: z.string().max(textMax).optional(),
    interimOnly: z.boolean().optional(),
  });
}
export type ChatRecognizer = z.infer<ReturnType<typeof chatRecognizerSchemaOf>>;

/** 알림 줄 하나(다른 후보가 있으면 둘째 꼴). 빈 객체면 첫 꼴이다. */
export type ChatRecognizerNote = { alternative?: string };

/** 들린 글과 다른 후보를 견줄 때의 꼴(앞뒤 빈칸 · 대소문자만 무시). */
function sameText(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * 알림 줄을 붙일지(spec 설계 11 '알림 줄'): (ㄱ) 확신 정도가 있고(0 은 '모름'으로 보아 비운 것과 같다) 문턱보다 낮을 때, (ㄴ) 아이 말 글이 중간 결과만으로
 * 끝났고 talk.chat_unsure_on_partial 이 참일 때 붙인다. 중간 결과만으로 끝난 말에는 다른 후보를 싣지 않는다(첫 꼴). 다른 후보가 비었거나 들린 글과
 * 같으면 싣지 않는다. 둘 다 서지 않으면 다른 후보가 있어도 null 이다. 질문을 강제하지 않는 정보이고 아이 차례의 흐름 · 셈을 바꾸지 않는다.
 * 다른 후보 글의 이름 가림은 요청을 조립할 때 아이 말과 같이 한다(호출 규격의 mask).
 */
export function chatRecognizerNoteOf(
  recognizer: ChatRecognizer | undefined,
  heard: string,
  rules: ChatRecognizerRules,
): ChatRecognizerNote | null {
  if (recognizer === undefined) return null;
  const interimOnly = recognizer.interimOnly === true;
  const confidence = recognizer.confidence ?? null;
  const lowConfidence =
    confidence !== null &&
    confidence > 0 &&
    confidence < rules.unsureConfidence;
  if (interimOnly) return lowConfidence || rules.unsureOnPartial ? {} : null;
  if (!lowConfidence) return null;
  const alternative = recognizer.alternative?.trim() ?? "";
  if (alternative === "" || sameText(alternative, heard)) return {};
  return { alternative };
}

const RECOGNIZER_UNSURE = "(The recognizer was unsure about this.)";

/** 알림 줄의 글(시제품 qChildMessageOf 의 두 꼴 그대로). */
export function chatRecognizerNoteLineOf(note: ChatRecognizerNote): string {
  return note.alternative === undefined
    ? RECOGNIZER_UNSURE
    : `(The recognizer was unsure about this. It may also have been: "${note.alternative}")`;
}

// ── 입력 줄(spec 설계 3 표) ─────────────────────────────────────────

/**
 * 이번 차례의 입력. speech 의 heard 는 가림을 지날 들린 글이고 note 는 알림 판단(chatRecognizerNoteOf)을 지난 알림이다(null · 없음이면 알림 없음).
 * quiet 는 누르지 않고 기다림이 지난 차례(입구 quiet), not_heard 는 눌렀으나 앱이 말소리를 듣지 못한 차례(talk.nospeech_dontknow_count 번),
 * start · more · back 은 아이 말 없이 선생님 차례를 여는 입구(수업 시작 · '더 이야기하기' · 짧은 준비 뒤 돌아옴)다.
 */
export type ChatInput =
  | { kind: "start"; clock: ChatClock; met: number }
  | { kind: "speech"; heard: string; note?: ChatRecognizerNote | null }
  | { kind: "dont_know" }
  | { kind: "quiet" }
  | { kind: "not_heard" }
  | { kind: "more" }
  | { kind: "back" };

/** 입력 줄(말함은 알림이 서면 다음 줄에 알림 줄까지). */
export function chatInputLineOf(input: ChatInput): string {
  switch (input.kind) {
    case "start":
      return chatStartLineOf(input);
    case "speech": {
      // 빈 말은 서버가 '눌렀으나 듣지 못함'(not_heard)으로 보낸다 — 빈 들린 글 줄을 내지 않는다(고침 브리프 P1 fix 1 M4)
      if (input.heard.trim() === "")
        throw new RangeError(
          "말함 입력의 들린 글이 비었다(not_heard 로 보낸다)",
        );
      const line = `Child (speech-to-text): "${input.heard}"`;
      const note = input.note ?? null;
      return note === null
        ? line
        : `${line}\n${chatRecognizerNoteLineOf(note)}`;
    }
    case "dont_know":
      return `(The child pressed the "I don't know" button.)`;
    case "quiet":
      return "(The child did not press the talk button.)";
    case "not_heard":
      return "(The child pressed the talk button, but the app could not hear any words.)";
    case "more":
      return "(The child chose to talk more.)";
    case "back":
      return "(The child is back from a short word practice in the app.)";
  }
}

// ── 사실 줄(spec 설계 3 '사실 줄은 네 때뿐이다') ──────────────────────────

/**
 * 사실 줄 넷: prep_next 인사 토막의 끝 차례이고 그 뒤 짧은 준비가 열릴 때 · ko_help 한국어 도움 뒤의 영어 차례(taught 는 알려 준 표현, 뜻만
 * 풀이했으면 null) · closing 앱의 마무리 차례 · last_turn 이 아이 차례로 대화 안전 상한에 닿을 때.
 */
export type ChatFact =
  | { kind: "prep_next" }
  | { kind: "ko_help"; taught: string | null }
  | { kind: "closing" }
  | { kind: "last_turn" };

/** spec 설계 3 표의 사실 갈래 차례(글에 둘 차례는 CHAT_FACT_LINE_ORDER). */
export const CHAT_FACT_KINDS = [
  "prep_next",
  "ko_help",
  "closing",
  "last_turn",
] as const satisfies readonly ChatFact["kind"][];

/**
 * 사실 줄을 글에 둘 차례: 표의 차례에서 한국어 도움 줄만 맨 뒤(입력 줄 바로 앞)로 옮겼다 — 안내문이 그 줄을 "before the child's words" 라고
 * 알리기 때문이다(고침 브리프 P1 fix 1 M2).
 */
const CHAT_FACT_LINE_ORDER = [
  "prep_next",
  "closing",
  "last_turn",
  "ko_help",
] as const satisfies readonly ChatFact["kind"][];

/** 안전 상한 줄(last_turn)이 있으면 내지 않는 갈래(묶음 P3 chatFactsOf 와 같은 계약 — 고침 브리프 P1 fix 1 M3). */
const CLOSED_BY_LAST_TURN: ReadonlySet<ChatFact["kind"]> = new Set([
  "closing",
  "prep_next",
]);

/** 사실 줄의 글(spec 설계 3 표의 글 그대로). */
export function chatFactLineOf(fact: ChatFact): string {
  switch (fact.kind) {
    case "prep_next":
      return "After your turn the app does a short word practice with the child, and then your chat goes on.";
    case "ko_help": {
      const taught = fact.taught?.trim() ?? "";
      return taught === ""
        ? "Korean help before this answer: meaning only"
        : `Korean help before this answer: taught '${taught}'`;
    }
    case "closing":
      return "This is the closing turn. After your turn the app shows the buttons 'talk more' and 'finish'. If the child finishes, the app does a short review and says goodbye.";
    case "last_turn":
      return "This is the last turn of today's chat. After your turn the app ends the chat.";
  }
}

// ── 사용자 메시지 ───────────────────────────────────────────────────

/** 이번 차례의 사용자 메시지 재료: 붙일 사실 줄(차례 판단이 고름) · 입력. */
export type ChatUserMessage = {
  facts: readonly ChatFact[];
  input: ChatInput;
};

/**
 * 사용자 메시지 글: 사실 줄(갈래마다 한 번, 한 줄씩 — 짧은 준비 → 마무리 → 안전 상한 → 한국어 도움) → 입력 줄. 사실 줄이 없으면 입력 줄뿐이다.
 * 같은 갈래의 사실이 둘이면 앞의 것을 쓴다. 안전 상한 줄이 있으면 마무리 줄 · 짧은 준비 줄은 내지 않는다(대화를 닫는 차례에 두 단추 · 낱말 연습을
 * 알리지 않음). 한국어 도움 줄은 지난 일이라 그대로 낸다.
 */
export function chatUserMessageOf(message: ChatUserMessage): string {
  const lastTurn = message.facts.some((f) => f.kind === "last_turn");
  const lines: string[] = [];
  for (const kind of CHAT_FACT_LINE_ORDER) {
    if (lastTurn && CLOSED_BY_LAST_TURN.has(kind)) continue;
    const fact = message.facts.find((f) => f.kind === kind);
    if (fact !== undefined) lines.push(chatFactLineOf(fact));
  }
  lines.push(chatInputLineOf(message.input));
  return lines.join("\n");
}
