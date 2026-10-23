// 선생님 관찰 쪽의 글 · 목소리 목록 꼴(선생님 화면 plan 값 16 · 정본 밖 문구 표의 '관찰 쪽' 줄, 컨트롤러 덧 2026-10-23 '단원 바로 가기').
// 관찰 도구라 아이 화면 원칙 밖이다(음성 관찰 쪽과 같음). e2e 가 같은 글을 읽도록 React 없는 모듈로 둔다. 순수 모듈이다.
import { TEACHER_TEXT } from "@/core/teacher/name";

export const PROBE_TEXT = {
  title: "선생님 관찰(프리뷰 전용)",
  noProfile: "프로필이 없어요. 첫 실행을 먼저 해 주세요",
  teacherHeading: "회화 선생님",
  teacherNow: (nameKo: string | null) =>
    `지금 선생님: ${nameKo ?? "아직 고르지 않음"}`,
  clear: TEACHER_TEXT.probeClear,
  cleared: "지웠어요 · 다음 회화에서 다시 골라요",
  clearFailed: "지우지 못했어요",
  jumpHeading: "단원 바로 가기",
  jumpNote:
    "1단계 단원 하나를 그 영역의 지금 단원으로 바꿔요. 단원 통과 전에 다른 단원 수업을 열어 볼 때 써요(프리뷰 시험용).",
  trackNow: (level: number | null, unit: number | null) =>
    level === null || unit === null ? "배치 전" : `${level}단계 · 단원 ${unit}`,
  jumpLabel: (areaLabel: string, unit: number) =>
    `${areaLabel} 단원 ${unit} 열기`,
  jumped: (areaLabel: string, level: number, unit: number) =>
    `바꿨어요 — ${areaLabel} ${level}단계 · 단원 ${unit}`,
  jumpRefused: "운영 배포에서는 쓸 수 없어요",
  jumpFailed: "바꾸지 못했어요",
  home: "홈에서 보기",
  voicesHeading: "목소리 목록",
  voicesNote: "이 기기의 en 으로 시작하는 목소리(기기 차례 그대로)",
  voiceColumns: ["이름", "언어", "기본", "기기 안"] as const,
  yes: "예",
  no: "아니요",
  noVoices: "목소리가 아직 없어요. 잠시 뒤 다시 열어 보세요",
  copy: "목록 복사",
  copied: "복사했어요 · 대화창에 붙여 넣어 주세요",
  copyFailed: "복사하지 못했어요. 표를 길게 눌러 복사해 주세요",
} as const;

/** 목소리 목록 한 줄. */
export type VoiceRow = {
  name: string;
  lang: string;
  isDefault: boolean;
  local: boolean;
};

/** 브라우저 목소리(SpeechSynthesisVoice 꼴)에서 en 으로 시작하는 것만, 기기 차례 그대로. */
export function voiceRowsOf(
  voices: readonly {
    name: string;
    lang: string;
    default: boolean;
    localService: boolean;
  }[],
): VoiceRow[] {
  return voices
    .filter((v) => v.lang.toLowerCase().startsWith("en"))
    .map((v) => ({
      name: v.name,
      lang: v.lang,
      isDefault: v.default,
      local: v.localService,
    }));
}

/** '목록 복사' 글: 기기 줄 · 머리 줄 · 목소리마다 한 줄(탭으로 가름). */
export function voiceListText(
  rows: readonly VoiceRow[],
  userAgent: string,
): string {
  const yesNo = (v: boolean) => (v ? PROBE_TEXT.yes : PROBE_TEXT.no);
  return [
    `기기: ${userAgent}`,
    PROBE_TEXT.voiceColumns.join("\t"),
    ...(rows.length === 0
      ? [PROBE_TEXT.noVoices]
      : rows.map((r) =>
          [r.name, r.lang, yesNo(r.isDefault), yesNo(r.local)].join("\t"),
        )),
  ].join("\n");
}
