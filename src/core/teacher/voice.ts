// 목소리 고르기(plan 회화-선생님-캐릭터 값 12, AC-19j · 가르치고 배우는 수업 spec 설계 4 · 10, AC-3h). DB · 브라우저 없는 순수 함수.
// 명단 voice.prefer(이름 조각 차례)로 고르고, 맞는 것이 없으면 pickVoice(지금 목소리)로 간다. 쓰임(선생님 한국어 줄 · 선생님 영어 ·
// 글 자료)마다 목소리 · lang · 높이 · 빠르기를 정한다. 명단 · 기기 상태에는 칸을 더하지 않는다(plan 정한 것 10).
import type { SpeechSettings } from "@/core/speech/listen";

const normalizeLang = (lang: string) => lang.toLowerCase().replaceAll("_", "-");

/** 선생님 한국어 줄의 lang(BCP 47). 기기 목소리도 이 lang 인 것만 고른다(spec 설계 4 'ko-KR'). */
export const KOREAN_LANG = "ko-KR";

/** 한국어 lang 인가(언어 앞부분이 ko). 소문자 · '_' 를 '-' 로 맞춰 본다. */
export function isKoreanLang(lang: string | undefined): boolean {
  if (lang === undefined) return false;
  const primary = normalizeLang(lang).split("-")[0];
  return primary === normalizeLang(KOREAN_LANG).split("-")[0];
}

/**
 * 지금 목소리 고르기(plan-p02 나-3). lang 이 같은 것 가운데 기본 → 기기 안 → 첫째, 없으면 그 언어 앞부분('en')으로 시작하는 것,
 * 그것도 없으면 고르지 않는다(lang 만으로 읽는다).
 */
export function pickVoice<
  V extends { lang: string; default: boolean; localService: boolean },
>(voices: readonly V[], lang: string): V | undefined {
  const want = normalizeLang(lang);
  const exact = voices.filter((v) => normalizeLang(v.lang) === want);
  const chosen =
    exact.find((v) => v.default) ??
    exact.find((v) => v.localService) ??
    exact[0];
  if (chosen !== undefined) return chosen;
  const family = want.split("-")[0] ?? want;
  return voices.find((v) => normalizeLang(v.lang).startsWith(family));
}

/**
 * lang 이 같은(소문자 · '_' 를 '-' 로) 목소리 가운데, prefer 조각 차례로 이름에 그 조각(대소문자 무시)이 든 첫 목소리.
 * 언어 앞부분(en)만 같은 목소리는 고르지 않는다. 빈 조각은 건너뛴다(아무 목소리에나 맞지 않게).
 */
export function preferredVoice<V extends { name: string; lang: string }>(
  voices: readonly V[],
  lang: string,
  prefer: readonly string[],
): V | undefined {
  const want = normalizeLang(lang);
  const same = voices.filter((v) => normalizeLang(v.lang) === want);
  for (const piece of prefer) {
    const needle = piece.toLowerCase();
    if (needle === "") continue;
    const found = same.find((v) => v.name.toLowerCase().includes(needle));
    if (found !== undefined) return found;
  }
  return undefined;
}

/** 무엇을 읽나(spec 설계 4 표): 선생님 한국어 줄 · 선생님이 보이는 영어 · 글 자료(지문 · 짝 글 · 듣기 대본 · 이야기). */
export type VoiceUse = "teacher_ko" | "teacher_en" | "material";

/** 읽지 않는 까닭: speech.read_ko 끔 · 기기에 ko-KR 목소리 없음. 둘 다 글로만 보이고 안내 줄은 없다(spec 설계 10). */
export type SpeakSkipReason = "read_ko_off" | "no_ko_voice";

/** 목소리 고르기 결과. speak 의 pitch · rate 가 undefined 면 브라우저 기본값으로 읽는다. */
export type VoiceChoice<V> =
  | {
      kind: "speak";
      voice: V | undefined;
      lang: string;
      pitch: number | undefined;
      rate: number | undefined;
    }
  | { kind: "skip"; reason: SpeakSkipReason };

type DeviceVoice = {
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
};

/**
 * 쓰임별 목소리 고르기(순수, AC-3h). teacher 는 고른 선생님의 명단 voice(없으면 고르기 전 — 기본 높이 · 지금 목소리), rate 는 부르는
 * 쪽이 넘긴 단계 구간 빠르기(speech.rate.<구간>).
 * - 선생님 한국어 줄: speech.read_ko 끔이면 읽지 않음. ko-KR 가운데 기기 기본, 없으면 첫 ko-KR, 없으면 읽지 않음. 선생님 높이 ·
 *   speech.rate_ko(넘긴 단계 빠르기는 쓰지 않는다).
 * - 선생님 영어: 명단 voice.prefer 순서의 speech.lang 목소리, 없으면 pickVoice. 선생님 높이 · 넘긴 빠르기.
 * - 글 자료: pickVoice · 기본 높이 · 넘긴 빠르기(선생님과 관계없다).
 */
export function voiceFor<V extends DeviceVoice>({
  use,
  voices,
  teacher,
  rate,
  speech,
}: {
  use: VoiceUse;
  voices: readonly V[];
  teacher?: {
    pitch?: number | undefined;
    prefer?: readonly string[] | undefined;
  };
  rate?: number | undefined;
  speech: Pick<SpeechSettings, "lang" | "rateKo" | "readKo">;
}): VoiceChoice<V> {
  if (use === "teacher_ko") {
    if (!speech.readKo) return { kind: "skip", reason: "read_ko_off" };
    const want = normalizeLang(KOREAN_LANG);
    const korean = voices.filter((v) => normalizeLang(v.lang) === want);
    const voice = korean.find((v) => v.default) ?? korean[0];
    if (voice === undefined) return { kind: "skip", reason: "no_ko_voice" };
    return {
      kind: "speak",
      voice,
      lang: KOREAN_LANG,
      pitch: teacher?.pitch,
      rate: speech.rateKo,
    };
  }
  if (use === "teacher_en") {
    const prefer = teacher?.prefer ?? [];
    const voice =
      (prefer.length > 0
        ? preferredVoice(voices, speech.lang, prefer)
        : undefined) ?? pickVoice(voices, speech.lang);
    return {
      kind: "speak",
      voice,
      lang: speech.lang,
      pitch: teacher?.pitch,
      rate,
    };
  }
  return {
    kind: "speak",
    voice: pickVoice(voices, speech.lang),
    lang: speech.lang,
    pitch: undefined,
    rate,
  };
}

/**
 * 읽어 주기 선택 칸으로 쓰임을 정한다(음성 접점이 voiceFor 앞에서 부른다). 한국어 lang 이면 선생님 한국어 줄, 선생님 높이나 목소리
 * 순서가 있으면(선생님 음성 감싸기 teacher.ts 가 넣음) 선생님 영어, 둘 다 없으면 글 자료다.
 */
export function voiceUseOf(options: {
  lang?: string | undefined;
  pitch?: number | undefined;
  voicePrefer?: readonly string[] | undefined;
}): VoiceUse {
  if (isKoreanLang(options.lang)) return "teacher_ko";
  if (options.pitch !== undefined || options.voicePrefer !== undefined)
    return "teacher_en";
  return "material";
}
