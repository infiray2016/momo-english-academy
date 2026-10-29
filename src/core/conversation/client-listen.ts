// 회화 듣기 사건 요약 칸(13절 C149 · 5절 talk_turns client_listen · 분석 보고 task-talk-speech-analysis 4.1). 순수 모듈이다.
// 아이 행(talk_turns.client_listen jsonb)과 따라 말하기 시도 꼴(attempts.input 의 clientListen)이 같은 꼴을 쓴다.
// 글 · 인식 글 · 오류 메시지 · 소리는 넣지 않는다(녹음 금지 · 이름 가림). 값은 화면이 음성 접점의 기록 사건에서 모은다(lib/speech/listen-log).
import { z } from "zod";

/** 한 기록에 남기는 듣기 요약 수 상한(기술 값 — 최근 것부터 남김). */
export const CLIENT_LISTENS_MAX = 20;
/** 기기 판정 이름 길이 상한(기술 값 — readDeviceVerdict().name). */
const BROWSER_NAME_MAX = 80;
/** ms 값 상한(기술 값 — 꼴 검사, 10분). */
const MS_MAX = 600_000;
/** 세션 실패 셈 상한(기술 값 — 꼴 검사). */
const FAILURES_MAX = 1000;

/** 듣기 결과 종류: result · no-result · stalled · error:<코드> · interrupted:<까닭>. 코드는 영어 소문자 · 붙임표만(모르면 other). */
export const LISTEN_RESULT_PATTERN =
  /^(result|no-result|stalled|error:[a-z][a-z-]{0,39}|interrupted:(hidden|speak|leave))$/;

const ms = z.int().min(0).max(MS_MAX);

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
});
export type ClientListenEntry = z.infer<typeof ClientListenEntrySchema>;

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
