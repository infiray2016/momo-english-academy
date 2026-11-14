// 회화 듣기 사건 요약 칸(13절 C149 · 5절 talk_turns client_listen · 분석 보고 task-talk-speech-analysis 4.1). 순수 모듈이다.
// 아이 행(talk_turns.client_listen jsonb)과 따라 말하기 시도 꼴(attempts.input 의 clientListen)이 같은 꼴을 쓴다.
// 글 · 인식 글 · 오류 메시지 · 소리는 넣지 않는다(녹음 금지 · 이름 가림). 값은 화면이 음성 접점의 기록 사건에서 모은다(lib/speech/listen-log).
import { z } from "zod";
import {
  DISCARD_BRANCHES,
  DISCARD_END_WHYS,
  DISCARD_REOPEN_WHYS,
  DISCARD_SOUND_KINDS,
} from "@/core/speech/discard";

/** 한 기록에 남기는 듣기 요약 수 상한(기술 값 — 최근 것부터 남김). */
export const CLIENT_LISTENS_MAX = 20;
/** 기기 판정 이름 길이 상한(기술 값 — readDeviceVerdict().name). */
const BROWSER_NAME_MAX = 80;
/** ms 값 상한(기술 값 — 꼴 검사, 10분). 화면은 이 값으로 잘라 보낸다(상한에 걸린 값은 이 값 그대로 — 검토 rev-mic-1 I-1). */
export const CLIENT_LISTEN_MS_MAX = 600_000;
const MS_MAX = CLIENT_LISTEN_MS_MAX;
/** 세션 실패 셈 상한(기술 값 — 꼴 검사). */
const FAILURES_MAX = 1000;
/** 한 듣기 안에서 다시 연 객체 수 상한(기술 값 — 꼴 검사). */
const RESTARTS_MAX = 100;
/** 버림 칸의 셈(np · n) 상한(기술 값 — 꼴 검사). 화면은 이 값으로 잘라 보낸다(ms 와 같음). */
export const DISCARD_COUNT_MAX = 1000;
/** 듣기 사이 읽기 요청 수(kn) 상한(기술 값 — 꼴 검사). 화면은 이 값으로 잘라 보낸다(ms 와 같음). */
export const CLIENT_SPEAKS_MAX = 1000;
/** 인식기 후보 수(na) 상한(기술 값 — 꼴 검사, 화면이 여는 maxAlternatives 는 설정값 talk.chat_alternatives). 화면은 이 값으로 잘라 보낸다. */
export const CLIENT_ALTERNATIVES_MAX = 100;

/**
 * 듣기 결과 종류: result · no-result · stalled · deaf(마이크 안 잡힘 — audiostart 가 빨리 오고 소리 · 결과 없음, 잠정 11-06) · error:<코드> ·
 * interrupted:<까닭>. 코드는 영어 소문자 · 붙임표만(모르면 other).
 */
export const LISTEN_RESULT_PATTERN =
  /^(result|no-result|stalled|deaf|error:[a-z][a-z-]{0,39}|interrupted:(hidden|speak|leave))$/;

/** start 호출 때 읽어 주기 상태(ts). */
export const LISTEN_SYNTH_STATES = ["speaking", "pending", "idle"] as const;
/** 듣기 앞 마지막 읽기의 끝 까닭(te): 끝 알림 · 감시 상한 · 끊김(interrupted · canceled) · 그 밖 오류. */
export const LISTEN_SPEAK_ENDS = ["end", "timeout", "cancel", "error"] as const;

const ms = z.int().min(0).max(MS_MAX);
const discardCount = z.int().min(0).max(DISCARD_COUNT_MAX);

/**
 * 진짜 듣기 요약에 붙는 '그 앞 버림' 칸 묶음(dc — iPad 버리는 듣기 spec 설계 5 · plan 접점 표 'client_listen dc'). 모두 선택 칸이고 글 칸이
 * 없다(C149). 값 목록은 버림 기계(core/speech/discard)의 것을 쓴다. 진짜 as · 진짜 시작 때 읽기 상태는 요약의 as · ts 를 그대로 쓴다.
 */
export const DiscardNoteSchema = z.strictObject({
  /** 갈래: rest(F1 쉰 뒤) · discard(F2) · live(F3) · reopen('버림부터'에서 다시 연 버림). */
  g: z.enum(DISCARD_BRANCHES).optional(),
  /** discard · live · reopen 갈래의 대기 사이에 읽은 것이 있는가. */
  sr: z.boolean().optional(),
  /** 이 진짜 앞 버림이 닫힌 까닭. */
  why: z.enum(DISCARD_END_WHYS).optional(),
  /** reopen 이면 다시 열게 한 앞 닫힘의 까닭. */
  rw: z.enum(DISCARD_REOPEN_WHYS).optional(),
  /** 버림 start → audiostart(ms). 오지 않았으면 없다. */
  as: ms.optional(),
  /** 버림 길이(start → end 또는 end 상한, ms). */
  d: ms.optional(),
  /** 버림 start → 첫 소리 시작 알림(ms). */
  s0: ms.optional(),
  /** 버림 start → 마지막 소리 끝(ms). */
  s1: ms.optional(),
  /** 누름 → 진짜 start(ms). 기다리지 않았으면 없다. */
  w: ms.optional(),
  /** 버림 안에서 낸 소리 종류(마지막 소리). */
  sk: z.enum(DISCARD_SOUND_KINDS).optional(),
  /** 들려주지 못한 읽기 수. */
  np: discardCount.optional(),
  /** 버림 결과 수(글 없음 — 연속 인식에서 쌓이는 결과 목록의 마지막 길이로 센다, 검토 2-가 4절 6). */
  n: discardCount.optional(),
  // ── 아래 두 칸은 2026-11-13 에 더함(회화 대화 구조 R spec 설계 6 '기록 칸' (ㄴ) — 조용함 입구가 버림을 연 다음 진짜에만 있다) ──
  /** 조용함 입구에서 처음 연 버림의 start → audiostart(ms). 오지 않았으면 없다. */
  qa: ms.optional(),
  /** 조용함 입구에서 처음 연 버림이 살아 있는 버림으로 판정되었나. */
  ql: z.boolean().optional(),
});
export type DiscardNote = z.infer<typeof DiscardNoteSchema>;

export const ClientListenEntrySchema = z.strictObject({
  /** 결과 종류. */
  o: z.string().regex(LISTEN_RESULT_PATTERN),
  /** 끝난 까닭(들음은 판정의 endedBy, 그 밖은 단추 · 상한 · 브라우저). 끊김 · 멈춤에는 없다. */
  by: z
    .enum(["silence", "button", "cap", "browser", "stall-after-stop"])
    .optional(),
  /** 듣기 길이(시작 → 끝 ms). */
  d: ms,
  /** 첫 객체 start → audiostart(ms). 오지 않았으면 없다. */
  as: ms.optional(),
  /** soundstart · speechstart 를 봤는가(소리가 들어왔는가). */
  snd: z.boolean(),
  /** 시작 → 첫 결과(ms). 결과가 없으면 없다. */
  fr: ms.optional(),
  /** 직전 읽어 주기와의 관계: 읽는 중 끊고 들음이면 'cut', 읽기가 끝난 뒤면 그 뒤 ms. 앞에 읽기가 없으면 없다. */
  tc: z.union([z.literal("cut"), ms]).optional(),
  // ── 아래 여섯 칸은 2026-11-06 에 더함(분석 task-ipad-listen-analysis 6.2 — 옛 기록에는 없다) ──
  /** 앞 인식 객체 end(어느 인식 객체든, 버리는 듣기의 버림 포함) → 이 듣기 첫 start 호출(ms). 앞 객체가 없으면 없다. */
  pe: ms.optional(),
  /** 첫 start 호출 → 첫 soundstart · speechstart(ms). 소리가 없으면 없다. */
  ss: ms.optional(),
  /** 이 듣기 안에서 다시 연 객체 수(끊어 듣기 · 브라우저 끝 · 감시 · 못 듣는 마이크). */
  rs: z.int().min(0).max(RESTARTS_MAX).optional(),
  /** 첫 start 호출 때 읽어 주기 상태(speaking · pending · idle). */
  ts: z.enum(LISTEN_SYNTH_STATES).optional(),
  /** 듣기 앞 마지막 읽기의 끝 까닭. 앞에 읽기가 없거나 끝 알림이 아직 없으면 없다. */
  te: z.enum(LISTEN_SPEAK_ENDS).optional(),
  /** 앞 듣기(없으면 기록 처음) 뒤 이 듣기 앞에 쪽이 숨은 적이 있는가. */
  hid: z.boolean().optional(),
  /** 그 앞 버림(2026-11-07 iPad 버리는 듣기 — 끔 · 켜지 않은 기기와 옛 기록에는 없다). */
  dc: DiscardNoteSchema.optional(),
  // ── 아래 네 칸은 2026-11-13 에 더함(회화 Claude 주도 plan 묶음 V · 13절 C238 (6) — 옛 기록에는 없다). 화면 시각은 서버 시각과 맞출 수 없어
  // 이 듣기 시작에서 거꾸로 잰다: 읽어 주기 시작 = 듣기 시작 − k0 + ks, 끝 = 듣기 시작 − tc(수치일 때). 앞 듣기 끝 뒤 읽기가 없으면 넷 다 없다 ──
  /** 앞 듣기 끝(없으면 기록 처음) 뒤 첫 읽기 요청 → 이 듣기 시작(ms). */
  k0: ms.optional(),
  /** 그 첫 읽기 요청 → 첫 시작 알림(읽어 주기 시작 지연, ms). 시작 알림이 듣기 앞에 없으면 없다. */
  ks: ms.optional(),
  /** 첫 시작 알림 → 마지막 읽기의 끝 · 감시 알림(읽어 주기 길이, ms — tc 와 같은 끝). 읽는 중 끊었거나(tc cut) 시작 알림이 없으면 없다. */
  kd: ms.optional(),
  /** 앞 듣기 끝 뒤 이 듣기 앞의 읽기 요청 수(소리 없는 풀기 글은 셈 밖). */
  kn: z.int().min(0).max(CLIENT_SPEAKS_MAX).optional(),
  // ── 아래 세 칸은 2026-11-13 에 더함(회화 대화 구조 R spec 설계 11 — 이야기 방식에서 후보 수를 넘겨 연 듣기만, 결과가 있었을 때. 글은 없다 ──
  /** 확신 정도: 아이 말 글을 이룬 확정 결과들의 confidence 가운데 가장 낮은 값(소수 둘째 자리). 확정 결과가 없거나 값이 없거나 0 이면 없다. */
  cf: z.number().min(0).max(1).optional(),
  /** 후보 수: 확정 결과가 낸 후보 수의 최댓값(확정 결과가 없으면 중간 결과의 것). */
  na: z.int().min(0).max(CLIENT_ALTERNATIVES_MAX).optional(),
  /** 중간 결과 표지: 확정 결과 없이 중간 결과만으로 끝났는가. */
  int: z.boolean().optional(),
  /** 섞인 글 표지(묶음 V fix 1 컨트롤러 결정): 확정 결과와 중간 결과가 섞인 글로 끝났을 때만 참으로 싣는다(int 의 뜻은 그대로). */
  mx: z.boolean().optional(),
});
export type ClientListenEntry = z.infer<typeof ClientListenEntrySchema>;

/**
 * 선생님 쪽 발화 감시 기록(회화 plan 정한 것 10 · UI · UX L-15): 무엇을 읽었나(선생님 말 · 붙인 카드 줄 · 소리 줄 · 맞장구 · 짧은 준비 ·
 * 바닥선 · 정리 · 짧은 말 — short 는 2026-11-07 iPad 버리는 듣기 접점 표)와 감시가 끝낸 까닭(끝 신호 없음 · 들려주지 못함). 들려줌(played) · 글 · 소리는 남기지 않는다.
 */
export const TALK_SPEAK_WHATS = [
  "tori",
  "card",
  "sound",
  "wait",
  "prep",
  "floor",
  "wrap",
  "short",
] as const;
export const TALK_SPEAK_HITCHES = ["no_end", "not_played"] as const;
export const ClientSpeakEntrySchema = z.strictObject({
  w: z.enum(TALK_SPEAK_WHATS),
  h: z.enum(TALK_SPEAK_HITCHES),
});
export type ClientSpeakEntry = z.infer<typeof ClientSpeakEntrySchema>;

/** 화면이 보내는 꼴(회화 턴 요청 · 따라 말하기 저장). '모름'의 출처(src)는 서버가 입력에서 정하므로 받지 않는다. */
export const ClientListenSchema = z.strictObject({
  /** 기기 판정 이름(readDeviceVerdict().name — 예: 'iPad Safari 27.0'). */
  br: z.string().min(1).max(BROWSER_NAME_MAX),
  /** 선생님 창이 3D 그림으로 돌고 있었는가. */
  r3d: z.boolean(),
  /** 그 기록까지의 듣기(앞 기록 뒤부터, 최근 CLIENT_LISTENS_MAX 개). */
  listens: z.array(ClientListenEntrySchema).max(CLIENT_LISTENS_MAX),
  /** 보낼 때의 세션 실패 셈(여섯 번 셈 — judge micFailures). */
  mf: z.int().min(0).max(FAILURES_MAX),
  /** 앞 기록 뒤 선생님 쪽 발화 가운데 감시가 끝낸 것(최근 CLIENT_LISTENS_MAX 개, 정한 것 10). 이 칸 전 옛 기록에는 없다. */
  sp: z.array(ClientSpeakEntrySchema).max(CLIENT_LISTENS_MAX).optional(),
});
export type ClientListen = z.infer<typeof ClientListenSchema>;

/** '모름'의 출처: '잘 모르겠어요' 단추 · 같은 질문 말소리 없음(C44). */
export type DontKnowSource = "button" | "nospeech";

/** 아이 행에 저장하는 칸(화면 꼴 + '모름'의 출처). 화면 꼴이 없는 '모름'은 출처만. */
export type ClientListenRow = Partial<ClientListen> & { src?: DontKnowSource };

/**
 * 아이 행의 client_listen 값(순수). '모름'이면 화면이 보낸 nospeech 표시로 출처를 정한다(nospeech · button). 화면 꼴이 없고 '모름'도
 * 아니면 비운다(null).
 */
export function clientListenRowOf(
  input: { mode: "speech" | "dont_know"; nospeech?: boolean | undefined },
  clientListen: ClientListen | undefined,
): ClientListenRow | null {
  const src: DontKnowSource | undefined =
    input.mode === "dont_know"
      ? input.nospeech === true
        ? "nospeech"
        : "button"
      : undefined;
  if (clientListen === undefined && src === undefined) return null;
  return { ...(clientListen ?? {}), ...(src ? { src } : {}) };
}
