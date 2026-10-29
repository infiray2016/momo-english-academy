// 쓰기 4~5 문장 틀 · 고칠 곳(3.3 쓰기 4~5 행 · 6.2 쓰기 확인, plan-p11b 파일별 값 3 · 7). DB · 시계 없는 순수 함수다.
// 화면은 빈칸을 채운 온 문장을 만들어 서버 액션으로 내고, 서버 · 화면은 같은 함수로 고칠 곳(원문) 자리를 찾는다.
// 빈칸 꼴은 시드 규칙(밑줄 셋 이상, P4a BLANK)을 그대로 쓴다.
import { BLANK } from "@/core/seed/structure";
import type { SpeechVerdict } from "@/core/speaking/judge";
import { splitLeadingPunctuation } from "@/core/text/punctuation";

const BLANKS = new RegExp(BLANK.source, "g");
/**
 * 5단계 빈칸 입력 한 칸의 글자 수 상한(기술 값 — 설계 숫자 아님). 모든 빈칸을 채워도 쓰기 확인 시도 꼴 상한(INPUT_JSON_MAX) 안에
 * 들게 해, 긴 글이 '저장할 수 없어요'로 막히지 않게 한다(검토 review-p11-5-code 범위 밖 관찰, 단위 시험이 맞댐).
 */
export const BLANK_TEXT_MAX = 60;

/** 문장 틀을 빈칸으로 가른 글 조각(빈칸 수 + 1). */
export function frameParts(frame: string): string[] {
  return frame.split(BLANKS);
}

/**
 * 그리기용 토막(빈칸 수 + 1): 빈칸 뒤 토막 앞의 문장부호는 그 빈칸의 꼬리(blankTail)로 옮긴다 — 빈칸 상자와 부호를 한 덩이로 그려
 * 줄이 부호로 시작하지 않게(전체 디자인 리뷰 M-7). 온 글(assembleSentence)은 frameParts 그대로다.
 */
export function frameSegments(
  frame: string,
): { text: string; blankTail: string }[] {
  const parts = frameParts(frame);
  return parts.map((part, j) => {
    const next = parts[j + 1];
    return {
      text: j === 0 ? part : splitLeadingPunctuation(part).rest,
      blankTail: next === undefined ? "" : splitLeadingPunctuation(next).punct,
    };
  });
}

/** 문장 틀의 빈칸 수. */
export function frameBlanks(frame: string): number {
  return frameParts(frame).length - 1;
}

/** 빈칸을 차례로 채운 온 문장(낱말은 앞뒤 빈칸을 다듬음, 덜 채운 빈칸은 빈 글). */
export function assembleSentence(
  frame: string,
  values: readonly string[],
): string {
  const parts = frameParts(frame);
  return parts
    .map((part, i) =>
      i < parts.length - 1 ? `${part}${(values[i] ?? "").trim()}` : part,
    )
    .join("");
}

/** 아이 문장 안의 고칠 곳 자리(대소문자 무시). 없으면 -1 — 색칠할 수 없는 고칠 곳은 보이지 않는다. */
export function fixSpotOf(sentence: string, original: string): number {
  if (original === "") return -1;
  return sentence.toLowerCase().indexOf(original.toLowerCase());
}

/** 고칠 곳을 바른 말로 바꾼 문장(자리가 없으면 그대로). */
export function applyFix(
  sentence: string,
  original: string,
  correct: string,
): string {
  const at = fixSpotOf(sentence, original);
  if (at < 0) return sentence;
  return `${sentence.slice(0, at)}${correct}${sentence.slice(at + original.length)}`;
}

/**
 * 쓰기 '내 문장 듣고 따라 말하기'에서 인식 판정이 이 활동을 멈추는가(plan-p11b 값 7 · 7절 '마이크를 쓸 수 없음' 행). 마이크를 쓸 수 없음은
 * 기기 상태도 남긴다(홈의 말하기 · 회화 카드가 그 기기를 알게 — 검토 review-p11-5-code M-1). 멈춤 · 말소리 없음은 이 활동만 건너뛴다.
 * 쓰기 세션은 막지 않고 막힌 안내 · 기기 알림도 내지 않는다. 그 밖 판정은 따라 말하기 조각이 그대로 다룬다(undefined).
 */
export function ownRepeatStopOf(
  verdict: SpeechVerdict,
): { markDevice: boolean } | undefined {
  switch (verdict) {
    case "mic-unavailable":
      return { markDevice: true };
    case "mic-stalled":
    case "speech-silent":
      return { markDevice: false };
    default:
      return undefined;
  }
}
