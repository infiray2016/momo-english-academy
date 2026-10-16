// 실시간 출력 검사(6.4 끝 문단 · C63 (4), plan-p09b 파일별 값 3).
// 아이에게 보이거나 읽어 주는 칸마다 금지어 · 폭력 · 개인 정보 질문 패턴 · 연락처 꼴을 찾고,
// 영어 칸은 문장마다 단계의 3.6 문장 길이 상한을 본다. 판정용 AI 호출은 쓰지 않는다(6.4).
// 6.4 시드 검사와 같은 P4a 글 도구를 쓴다.
import { BUILTIN_CONTACT_PATTERNS } from "@/core/ai/mask";
import {
  type ForbiddenList,
  forbiddenHits,
  isEnglishSentence,
  sentenceWords,
  splitSentences,
} from "@/core/seed/text";

/** 연락처 꼴의 범주 이름(시드 forbidden 의 contact 와 같다). */
const CONTACT_CATEGORY = "contact";

/**
 * 아이에게 보이거나 읽어 주는 칸 하나. path 는 응답 값 안의 자리(`fixes.0.corrected` 꼴).
 * checkLength 가 거짓이면 문장 길이를 보지 않는다(아이 글을 인용한 원문 칸 — 길이 대상은 영어 학습 글 칸, C63 (4) · 검토 M-5). 기본 참.
 */
export type CheckField = {
  path: string;
  lang: "ko" | "en";
  text: string;
  checkLength?: boolean;
};

export type FieldHit =
  | { kind: "forbidden"; match: string; category?: string }
  | { kind: "too-long"; words: number; max: number };

export type OutputCheckOptions = {
  forbidden: ForbiddenList;
  /** 단계의 3.6 문장 길이 상한(level_specs sentenceMaxWords). */
  sentenceMaxWords: number;
};

const builtinContacts = BUILTIN_CONTACT_PATTERNS.map(
  ({ source, keepsPrefix }) => ({
    regex: new RegExp(source, "iu"),
    group: keepsPrefix ? 2 : 0,
  }),
);

function forbiddenOf(text: string, forbidden: ForbiddenList): FieldHit[] {
  const hits: FieldHit[] = forbiddenHits(text, forbidden).map((hit) =>
    hit.kind === "pattern"
      ? { kind: "forbidden", match: hit.match, category: hit.category }
      : { kind: "forbidden", match: hit.match },
  );
  for (const { regex, group } of builtinContacts) {
    const match = regex.exec(text)?.[group];
    if (match === undefined) continue;
    const duplicate = hits.some(
      (h) =>
        h.kind === "forbidden" &&
        h.category === CONTACT_CATEGORY &&
        h.match === match,
    );
    if (!duplicate) {
      hits.push({ kind: "forbidden", match, category: CONTACT_CATEGORY });
    }
  }
  return hits;
}

function tooLongOf(text: string, max: number): FieldHit[] {
  const hits: FieldHit[] = [];
  for (const sentence of splitSentences(text)) {
    if (!isEnglishSentence(sentence)) continue;
    const words = sentenceWords(sentence);
    if (words > max) hits.push({ kind: "too-long", words, max });
  }
  return hits;
}

/** 걸린 칸만 돌려준다(path → 걸린 것들). */
export function checkOutputFields(
  fields: readonly CheckField[],
  { forbidden, sentenceMaxWords }: OutputCheckOptions,
): Map<string, FieldHit[]> {
  const result = new Map<string, FieldHit[]>();
  for (const field of fields) {
    const hits = forbiddenOf(field.text, forbidden);
    if (field.lang === "en" && field.checkLength !== false)
      hits.push(...tooLongOf(field.text, sentenceMaxWords));
    if (hits.length > 0) result.set(field.path, hits);
  }
  return result;
}
