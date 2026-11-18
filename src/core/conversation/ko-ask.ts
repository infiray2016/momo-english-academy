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
