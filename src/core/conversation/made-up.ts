// 회화 1~3단계 '지어낸 경험 꼴' 실시간 검사('AI 몫 넓힘' spec 판 4 설계 3 자기 이야기 행 · 13절 C211 (1) · 정본 02-2 198줄 · 6.4).
// 선생님(AI)이 과거 경험 · 개인 기억('Yesterday I …' · 'When I was little …' · 'I remember …')을 사실처럼 지어낸 문장을 앱이 지운다.
// 꼴 목록은 시드(seed/lists/talk-made-up-phrases.json — 정규화한 구)이고, 문장은 normalizeSpoken 으로 줄임꼴을 펼쳐 낱말 경계로 견준다.
// 순수 모듈이다. 서버 턴 길(lesson-turn) · 끝맺음(closing)과 대본 도구(talk-observe)가 같이 부른다.
import { normalizeSpoken } from "@/core/conversation/spoken";

/**
 * 문장이 지어낸 경험 꼴에 걸리는가: 정규화한 문장에 꼴 하나가 낱말 경계로 들면 그 꼴(정규화 글)을, 아니면 null. 꼴 목록이 비었으면 늘 null
 * (목록이 없는 개발 길 — 검사하지 않음).
 */
export function madeUpHit(
  sentence: string,
  phrases: readonly string[],
): string | null {
  const n = normalizeSpoken(sentence);
  if (n === "") return null;
  const padded = ` ${n} `;
  for (const phrase of phrases) {
    const p = normalizeSpoken(phrase);
    if (p !== "" && padded.includes(` ${p} `)) return p;
  }
  return null;
}
