// 수업 안 '한국어로 물어보기' 설정 읽기(수업 안 한국어로 묻기 spec 판 3 설계 7 · plan 정한 것 13 · 접점 라 · 13절 C225 (6)).
// 회화 화면 자료와 한국어 질문 끝점만 읽는다. 모든 영역이 읽는 음성 설정 목록(SPEECH_SETTING_KEYS)과 회화 턴 입구 목록에는 넣지 않는다 —
// 회화 밖 화면이 새 키 때문에 던질 일을 만들지 않으려는 것이다(버리는 듣기 설정 discard-settings 와 같은 꼴).
// 키가 없거나 꼴이 틀리면 그 키 이름으로 던진다(조용한 기본값 없음). 숫자는 모두 12절 설정값이고 이 파일에 두지 않는다.
// 새 키 아홉 가운데 ai.max_tokens.talk_ko_help 는 호출 조합(settingKeysOf)이, talk.ko_ask_reply_max_chars 는 한국어 도움 호출 규격(talkKoHelpSpec)이 읽는다.
import { z } from "zod";
import { LISTEN_LANG_PATTERN } from "@/core/conversation/client-listen";

/** talk.ko_ask_mode 의 값: on(켬) · off(끔 — 되돌림 스위치, 단추가 없고 서버가 한국어 질문 요청을 받지 않는다, C221). */
export const KO_ASK_MODE_VALUES = ["on", "off"] as const;
export type KoAskMode = (typeof KO_ASK_MODE_VALUES)[number];

/** 화면 자료의 한국어 질문 설정(접점 라 `koAsk`). 시간은 밀리초로 바꿔 싣는다. */
export type KoAskSettings = {
  /** talk.ko_ask_mode 가 on 인가. */
  on: boolean;
  /** speech.lang_ko — 한국어 질문 듣기의 인식 언어(한국어 질문 끝 규칙의 lang). */
  lang: string;
  /** speech.end_silence_seconds.ko_ask(초 → 밀리초) — 마지막 중간 결과 뒤 이만큼 조용하면 듣기를 끝낸다. */
  endSilenceMs: number;
  /** talk.ko_ask_confirm_seconds(초 → 밀리초) — 한국어 인식 글을 보이고 '다시 말하기' · '보내기'를 받는 시간. */
  confirmMs: number;
  /** talk.ko_ask_sound_pause_ms — 1~3단계 표현 답에서 한국어 답 글이 보인 뒤 가르친 표현을 읽기까지 쉬는 시간. */
  soundPauseMs: number;
  /** talk.ko_ask_fail_hide_after — 한 수업에서 한국어 듣기가 글 없이 이만큼 이어져 끝나면 그 수업 동안 단추를 숨긴다. */
  failHideAfter: number;
};

/** 되돌림 스위치(화면 자료 · 한국어 질문 끝점이 읽는다). */
export const KO_ASK_MODE_KEY = "talk.ko_ask_mode";
const LANG_KEY = "speech.lang_ko";
const END_SILENCE_KEY = "speech.end_silence_seconds.ko_ask";
const CONFIRM_KEY = "talk.ko_ask_confirm_seconds";
const SOUND_PAUSE_KEY = "talk.ko_ask_sound_pause_ms";
const FAIL_HIDE_KEY = "talk.ko_ask_fail_hide_after";
/** 한국어 도움 호출에 넣는 앞 대화 줄 수(한국어 질문 끝점이 읽는다 — 사용자 메시지의 Earlier turns). */
export const KO_ASK_CONTEXT_TURNS_KEY = "talk.ko_ask_context_turns";
/** 한국어 답의 글자 수 상한(빈칸 뺌 — 한국어 도움 규격의 규칙 값 · 대신 줄 시드의 꼴 검사). */
export const KO_ASK_REPLY_MAX_CHARS_KEY = "talk.ko_ask_reply_max_chars";

/** koAskSettingsFrom 이 읽는 12절 키 여섯(회화 화면 자료가 읽는 목록에 더한다). */
export const KO_ASK_SETTING_KEYS: readonly string[] = [
  KO_ASK_MODE_KEY,
  LANG_KEY,
  END_SILENCE_KEY,
  CONFIRM_KEY,
  SOUND_PAUSE_KEY,
  FAIL_HIDE_KEY,
];

/** 초 → 밀리초(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;

const modeSchema = z.enum(KO_ASK_MODE_VALUES);
/** 듣기 요약 lg 와 같은 꼴(코드 검토 묶음 3 M-1 — 꼴 밖이면 한국어 듣기가 lg 없이 남는다). */
const langSchema = z.string().regex(LISTEN_LANG_PATTERN);
const positiveSecondsSchema = z.number().positive();
const secondsSchema = z.number().nonnegative();
const msSchema = z.int().nonnegative();
const countSchema = z.int().positive();
const linesSchema = z.int().nonnegative();
/** 한국어 답 글자 수 상한의 꼴(한국어 도움 규격의 설정 규격이 같이 쓴다). */
export const koAskReplyMaxCharsSchema = z.int().positive();

/**
 * 한국어 도움 대신 줄의 꼴(시드 목록의 두 꼴 — 목록 규격의 열쇠). 호출 실패 꼴은 서버가 정하고, 검사 걸림 꼴은 한국어 도움 조각의 검사 뒤 값이 알린다.
 * 시드 꼴 검사(check-talk-lists)와 한국어 도움 호출 규격(talk-ko-help)이 이 하나를 쓴다(코드 검토 묶음 4-가 M-2).
 */
export const TALK_KO_HELP_FALLBACK_SHAPES = [
  "call_failed",
  "check_blocked",
] as const;

const WHITESPACE_RUN = /\s+/g;
/**
 * 한국어 답의 글자 수(코드 포인트, 빈칸은 뺀다 — 설정 talk.ko_ask_reply_max_chars 의 정의, spec 264줄 · 코드 검토 I-2).
 * 런타임 자르기 · 표본 도구의 '글자 수 잘림' 표지 · 시드 대신 줄 검사가 이 셈 하나를 쓴다(코드 검토 묶음 4-가 M-2).
 */
export const koReplyCharsOf = (text: string) =>
  [...text.replace(WHITESPACE_RUN, "")].length;

function readSetting<T>(
  read: (key: string) => unknown,
  key: string,
  schema: z.ZodType<T>,
): T {
  const parsed = schema.safeParse(read(key));
  if (!parsed.success) {
    const reason = parsed.error.issues[0]?.message ?? "";
    throw new Error(
      `한국어 질문 설정 '${key}' 가 없거나 꼴이 틀렸다: ${reason}`,
    );
  }
  return parsed.data;
}

/** talk.ko_ask_mode 하나만 읽는다(한국어 질문 끝점의 첫 확인). 없거나 꼴이 틀리면 던진다. */
export function koAskModeFrom(read: (key: string) => unknown): KoAskMode {
  return readSetting(read, KO_ASK_MODE_KEY, modeSchema);
}

/** 화면 자료의 한국어 질문 설정(키 여섯). 끔이어도 나머지 키를 모두 읽는다 — 켤 때 처음 드러나지 않게 한다. */
export function koAskSettingsFrom(
  read: (key: string) => unknown,
): KoAskSettings {
  return {
    on: koAskModeFrom(read) === "on",
    lang: readSetting(read, LANG_KEY, langSchema),
    endSilenceMs: Math.round(
      readSetting(read, END_SILENCE_KEY, positiveSecondsSchema) * MS_PER_SECOND,
    ),
    confirmMs: Math.round(
      readSetting(read, CONFIRM_KEY, secondsSchema) * MS_PER_SECOND,
    ),
    soundPauseMs: readSetting(read, SOUND_PAUSE_KEY, msSchema),
    failHideAfter: readSetting(read, FAIL_HIDE_KEY, countSchema),
  };
}

/** 한국어 도움 호출에 넣는 앞 대화 줄 수(0 이상 정수 — 0 이면 앞 대화를 넣지 않는다). 없거나 꼴이 틀리면 던진다. */
export function koAskContextTurnsFrom(read: (key: string) => unknown): number {
  return readSetting(read, KO_ASK_CONTEXT_TURNS_KEY, linesSchema);
}

// ── 화면 순수 판정(묶음 5-가 — spec 판 3 설계 2 · 3, plan 정한 것 3 · 11 · 12) ──────────────
// 한국어 듣기의 결과는 영어 듣기의 셈 기계(core/speaking/judge · 화면의 onSpeech)에 넣지 않는다. 넘기는 것은 '마이크를 쓸 수 없음'(not-allowed ·
// 받아쓰기 꺼짐)과 network 뿐이다(정한 것 3 — 7절 그대로). judge 는 group 이 아니라 code 로 다시 가르므로(코드 검토 묶음 3 O-1) 그 밖의 결과는
// 여기서 걸러 화면이 따로 센다(한국어 듣기 실패 셈 · 단추 숨김).

/**
 * 한국어 듣기 하나의 끝(화면이 할 일): heard(글이 왔다 — 인식 확인), english(영어 셈 기계에 넘길 오류 — 마이크를 쓸 수 없음 · network),
 * not-heard(글 없이 끝남 — 말소리 없음 · 결과 없음 · 다시 듣는 오류 · 감시 타이머 멈춤 · 빈 글), deaf(마이크 안 잡힘), lang(그 언어만 안 됨),
 * none(끊김 — 일 없음).
 */
export type KoListenEnd =
  | { kind: "heard"; text: string }
  | { kind: "english"; event: { type: "error"; code: string } }
  | { kind: "not-heard" }
  | { kind: "deaf" }
  | { kind: "lang" }
  | { kind: "none" };

/** 한국어 듣기의 결과 꼴(core/speech/listen ListenOutcome 가운데 이 판정이 읽는 칸 — 그 꼴을 그대로 받는다). */
export type KoListenOutcome =
  | { kind: "result"; text: string }
  | { kind: "no-result" }
  | {
      kind: "error";
      code: string;
      group: "retry" | "mic-unavailable" | "network" | "lang-unavailable";
    }
  | { kind: "stalled" }
  | { kind: "interrupted" }
  | { kind: "deaf" };

/** 한국어 듣기의 끝을 가른다(순수, spec 설계 3 표). */
export function koListenEndOf(outcome: KoListenOutcome): KoListenEnd {
  switch (outcome.kind) {
    case "result": {
      const text = outcome.text.trim();
      return text === "" ? { kind: "not-heard" } : { kind: "heard", text };
    }
    case "error":
      if (outcome.group === "lang-unavailable") return { kind: "lang" };
      if (outcome.group === "mic-unavailable" || outcome.group === "network")
        return {
          kind: "english",
          event: { type: "error", code: outcome.code },
        };
      return { kind: "not-heard" };
    case "no-result":
    case "stalled":
      return { kind: "not-heard" };
    case "deaf":
      return { kind: "deaf" };
    case "interrupted":
      return { kind: "none" };
  }
}

/**
 * 한국어 듣기 실패 셈의 한 걸음(순수, spec 설계 3 표 · talk.ko_ask_fail_hide_after): 글이 오면 0, 글 없이 끝남 · 마이크 안 잡힘이면 하나 늘리고
 * 문턱에 닿으면 숨김, 그 언어만 안 됨은 셈과 관계없이 숨김, 그 밖(영어 셈 기계로 넘긴 오류 · 끊김)은 그대로다. 숨김은 그 수업 화면에 있는 동안이다.
 */
export function koFailStepOf(
  fails: number,
  end: KoListenEnd["kind"],
  hideAfter: number,
): { fails: number; hide: boolean } {
  if (end === "heard") return { fails: 0, hide: false };
  if (end === "lang") return { fails, hide: true };
  if (end === "not-heard" || end === "deaf") {
    const next = fails + 1;
    return { fails: next, hide: next >= hideAfter };
  }
  return { fails, hide: false };
}

/** 합친 안내 두 꼴(plan '옮겨 적는 문구' — 정본 03 4절 '한국어로 물어보기' 행 글자 그대로). */
export const KO_ASK_NOTICE = {
  hint: "지금은 한국어로 물어볼 수 없어요. '힌트'를 눌러 봐요",
  talk: "지금은 한국어로 물어볼 수 없어요. 아는 말로 말해 봐요",
} as const;

/**
 * 합친 안내 고르기(순수, 정한 것 12 · [N-3]): 단계가 아니라 그 턴에 '힌트' 단추가 있고 열 단이 남았는가로 고른다. 그렇지 않은 턴('힌트'가 없는
 * 10~12단계 · 검사에 걸려 단추가 없는 턴 · 단을 다 연 턴)은 '아는 말로 말해 봐요'다.
 */
export function koAskNoticeOf({
  hintButton,
  tiersLeft,
}: {
  hintButton: boolean;
  tiersLeft: boolean;
}): string {
  return hintButton && tiersLeft ? KO_ASK_NOTICE.hint : KO_ASK_NOTICE.talk;
}

/**
 * 답 뒤의 영어 소리(순수, spec 설계 2 '답의 소리' · 정한 것 11 · [N-2]): 가르친 표현이 있으면 그 표현이고, 1~3단계(글 없는 단계)만 한국어 답 글이
 * 보인 뒤 soundPauseMs 를 쉬고 읽으며 그 소리가 시작한 뒤(또는 들려주지 못한 뒤)에 아이 차례를 연다(waitOpen). 4단계부터의 표현은 쉼 없이 글과
 * 함께 읽는다. 표현이 없으면(뜻 · 불분명 · 그 밖 · 대신 줄) 선생님의 지금 말을 소리 줄까지 한 번 다시 읽고 바로 연다.
 */
export type KoHelpSound =
  | { kind: "taught"; text: string; pauseMs: number; waitOpen: boolean }
  | { kind: "teacher_line" };

export function koHelpSoundOf(
  help: { replay: "taught" | "teacher_line"; teachEn?: string | undefined },
  { lowBand, soundPauseMs }: { lowBand: boolean; soundPauseMs: number },
): KoHelpSound {
  const text = (help.teachEn ?? "").trim();
  if (help.replay !== "taught" || text === "") return { kind: "teacher_line" };
  return lowBand
    ? { kind: "taught", text, pauseMs: soundPauseMs, waitOpen: true }
    : { kind: "taught", text, pauseMs: 0, waitOpen: false };
}

/**
 * 답 뒤 아이 차례를 열까(순수, spec 설계 2 '답 뒤 아이 차례'): 소리를 기다리지 않는 답은 바로, 1~3단계 표현 답은 그 소리가 시작했거나 들려주지
 * 못한 결과가 온 뒤다(쉬는 동안 누르면 답을 못 듣고 지나간다).
 */
export function koChildOpenOf({
  waitOpen,
  started,
  failed,
  settled = false,
}: {
  waitOpen: boolean;
  started: boolean;
  failed: boolean;
  /**
   * 그 소리의 결과가 하나라도 왔는가(재검토 rev-b5a-2 N-1 — 시작 알림 전의 '끊김'은 셈이 들은 것으로 보아 failed 가 오르지 않는다. 그래도 결과가 온
   * 뒤에는 더 기다릴 소리가 없으므로 연다).
   */
  settled?: boolean;
}): boolean {
  return !waitOpen || started || failed || settled;
}

/**
 * 걸어 둔 표현 답의 소리가 시작하기 전에 읽기 줄이 비었는가(순수, 코드 검토 rev-b5a I-2 (나)): 답을 받아 그 소리를 기다리는 동안(질문을 보내는 중이
 * 아님) 줄이 멈췄는데 시작 알림도 결과도 오지 않은 때다(쉬는 중 줄을 비움 · 음성 접점이 없음). 그러면 '들려주지 못함'으로 보고 아이 차례를 연다 —
 * 단추가 모두 꺼진 채 남지 않게.
 */
export function koSoundDroppedOf({
  waiting,
  speaking,
  sound,
}: {
  /** 한국어 처리 중이고 질문 요청은 끝났다(답의 소리를 기다림). */
  waiting: boolean;
  /** 읽기 줄이 읽는 중 · 쉬는 중인가. */
  speaking: boolean;
  /** 지금 걸어 둔 답의 소리(없으면 기다릴 소리가 없음). */
  sound:
    | {
        waitOpen: boolean;
        started: boolean;
        failed: boolean;
        settled?: boolean;
      }
    | undefined;
}): boolean {
  if (!waiting || speaking || sound === undefined) return false;
  return !koChildOpenOf(sound);
}

/** 다음 영어 턴 요청에 싣는 도움 하나(plan 접점 마 — 들었는가 · '알려 준 말 듣기'로 다시 들은 수). */
export type KoHelpTurnEntry = {
  turnNo: number;
  seq: number;
  heard: boolean;
  replays: number;
};

/**
 * 회화 턴 요청의 선택 칸(순수, 접점 마): 그 아이 차례에 받은 도움이 있으면 `koHelp`, 없으면 칸 자체가 없다(한국어로 묻지 않은 턴의 요청 본문이
 * 그대로 — AC-N26).
 */
export function koHelpTurnPartOf(entries: readonly KoHelpTurnEntry[]): {
  koHelp?: KoHelpTurnEntry[];
} {
  return entries.length === 0
    ? {}
    : {
        koHelp: entries.slice(-KO_HELP_TURN_ENTRIES_MAX).map((e) => ({ ...e })),
      };
}

/**
 * 회화 턴 요청에 싣는 도움 항목 수(기술 값 — 서버가 읽는 수 KO_HELP_ENTRIES_MAX 와 같다, 단위 시험이 둘을 맞댄다). 한 차례에 이보다 많이 물으면
 * 마지막 것들만 싣는다: 거절하지 않고 횟수로 수업을 멈추지 않으며, 회화 턴 끝점의 본문 크기 상한에 막히지 않게 한다(검토 rev-b4c M-2 · b5-fix2).
 */
export const KO_HELP_TURN_ENTRIES_MAX = 50;

/**
 * 표현 답 소리의 '들었음'(순수, 코드 검토 rev-b5b I-2 · C221): 이 차례에 받은 도움은 셈 그대로(한 번이라도 들려줬나)이고, 이어 하기로 되살린 도움은
 * 다시 열기 전에 들은 것으로 보므로(heardBefore) 다시 듣기가 소리를 못 내도 거짓으로 내려가지 않는다. 셈 자체는 그대로라 '소리가 안 나왔어요'
 * 안내는 뜬다.
 */
export function koHeardOf({
  heardBefore,
  track,
}: {
  heardBefore: boolean;
  track: { everHeard: boolean };
}): boolean {
  return heardBefore || track.everHeard;
}

/**
 * 인식 확인의 '들려준 답'에 더할 가르친 표현(순수, 1~3단계 바로 보냄): 그 아이 차례에서 받은 도움의 가르친 표현(빈 것은 뺀다, 같은 것은 하나).
 * 인식 글이 이 표현과 talk.hint_read_match 이상 맞으면 confirmPlanOf 가 바로 보낸다(들은 답과 같은 대접).
 */
export function koTaughtOf(
  helps: readonly { teachEn?: string | undefined }[],
): string[] {
  const out: string[] = [];
  for (const h of helps) {
    const t = (h.teachEn ?? "").trim();
    if (t !== "" && !out.includes(t)) out.push(t);
  }
  return out;
}

// ── 화면 순수 판정 2(묶음 5-나 — 이어 하기 · 이어받은 차례 · 첫 안내) ──

/** 첫 안내(프로필마다 한 번 — 정본 03 4절 '한국어로 물어보기' 행 · plan '옮겨 적는 문구', 안내 본 표시 열쇠 talk_ko_ask_tip). */
export const KO_ASK_TIP = "모르는 말은 한국어로 물어봐요";

/**
 * 첫 안내를 보일까(순수, AC-25k): 프로필이 아직 보지 않았고, 그 차례에 '한국어로 물어보기' 단추가 보이며, '막히면 눌러요'가 보이지 않는 차례다
 * (두 안내를 한 차례에 겹쳐 보이지 않는다 — '막히면 눌러요'가 먼저다).
 */
export function koTipShownOf({
  unseen,
  buttonShown,
  nudgeShown,
}: {
  unseen: boolean;
  buttonShown: boolean;
  nudgeShown: boolean;
}): boolean {
  return unseen && buttonShown && !nudgeShown;
}

/** 이어 하기 자료의 도움 한 건(화면 자료 koHelps 항목 — 구조로 받는다, 접점 라). */
export type KoResumeHelp = {
  turnNo: number;
  seq: number;
  question: string;
  sayKo: string | null;
  teachEn?: string | undefined;
  replay: "taught" | "teacher_line";
  open: boolean;
};

/**
 * 이어 열 때 도움 목록 가르기(순수, 묶음 5-나 · 접점 라 · AC-25i): 지금 열린 아이 차례(turnNo)의 열린 도움은 곁 말풍선으로 되살리고(live), 되묻는
 * 차례를 건너 이어받은 열린 도움(carried — 앞 턴 번호)은 대화 기록의 그 턴 자리에 두고 '알려 준 말 듣기'만 지금 차례에 다시 둔다. 나머지
 * 도움은 기록(log)이다. 답이 아직 없는 행(sayKo null — 호출 중에 끊긴 것)은 물은 말만 그리고 다시 부르지 않는다(정본 03 대화 기록 · rev-b5b
 * I-1 (나)): 지금 차례면 live 에 남아 질문 말풍선만 그리고, 이어받지 않는다(carried 에 없음). 소리 · koHelp 는 koAnsweredOf 로 거른다.
 */
export function koResumeOf<H extends KoResumeHelp>(
  helps: readonly H[],
  { turnNo }: { turnNo: number | undefined },
): { live: H[]; carried: H[]; log: H[] } {
  const sorted = [...helps].sort(
    (a, b) => a.turnNo - b.turnNo || a.seq - b.seq,
  );
  const live = sorted.filter((h) => h.open && h.turnNo === turnNo);
  return {
    live,
    carried: koAnsweredOf(sorted.filter((h) => h.open && h.turnNo !== turnNo)),
    log: sorted.filter((h) => !live.includes(h)),
  };
}

/** 답이 있는 도움만(순수): 답이 빈 행은 물은 말만 그리고 다시 부르지 않는다 — 소리 · 다음 턴의 koHelp · 가르친 표현에 넣지 않는다. */
export function koAnsweredOf<H extends { sayKo: string | null }>(
  helps: readonly H[],
): H[] {
  return helps.filter((h) => (h.sayKo ?? "").trim() !== "");
}

/** 이어받은 도움 한 건(회화 턴 끝 줄 lesson.koCarry 의 항목 — 접점 마. 표현 글은 실릴 수도 있고, 없으면 화면이 받아 둔 도움에서 찾는다). */
export type KoCarryItem = { turnNo: number; seq: number; teachEn?: string };

/** 이어받은 차례에 다시 둘 '알려 준 말 듣기' 하나(열쇠 · 읽을 표현). */
export type KoCarrySound = { key: string; text: string };

/**
 * 되묻는 차례 뒤 이어받은 차례의 '알려 준 말 듣기'(순수, 접점 마 · AC-25o): 1~3단계만, 이어받은 도움 가운데 가르친 표현이 있는 것마다 하나다(끝 줄의
 * 글이 먼저, 없으면 받아 둔 도움의 글). 칸이 없거나 비면 아무것도 두지 않는다(지금과 같다). 4단계부터는 기록에 글로 남아 있으므로 두지 않는다.
 */
export function koCarrySoundsOf(
  carry: readonly KoCarryItem[] | undefined,
  known: readonly {
    turnNo: number;
    seq: number;
    teachEn?: string | undefined;
  }[],
  { lowBand }: { lowBand: boolean },
): KoCarrySound[] {
  if (!lowBand || !carry || carry.length === 0) return [];
  const out: KoCarrySound[] = [];
  for (const item of carry) {
    const key = `${item.turnNo}:${item.seq}`;
    const text = (
      item.teachEn ??
      known.find((k) => k.turnNo === item.turnNo && k.seq === item.seq)
        ?.teachEn ??
      ""
    ).trim();
    if (text !== "" && !out.some((o) => o.key === key)) out.push({ key, text });
  }
  return out;
}
