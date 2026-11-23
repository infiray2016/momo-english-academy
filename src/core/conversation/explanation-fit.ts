// 막힌 차례의 한국어 설명이 그 차례의 영어와 맞는가(13절 C249 (4) · 02-2 3.3 한국어 설명 문단 끝 문장 · AC-15zj (사)).
// 서버 턴 길(lesson-turn)과 대본 도구(talk:observe)가 같은 함수를 쓴다. 순수 모듈이다(시각 · DB · SDK 없음, 낱말 목록 없음 — C233).

/** 영어 낱말 덩어리(라틴 글자, 축약형 · 소유격은 한 낱말). */
const ENGLISH_WORD = /[A-Za-z]+(?:'[A-Za-z]+)*/g;

/** 아이 이름 자리(고정부 · 가면이 쓰는 {NAME}). 대소문자와 관계없이 뺀다. */
const NAME_SLOT = /\{name\}/gi;

function wordsIn(text: string): string[] {
  return [...text.replace(NAME_SLOT, " ").matchAll(ENGLISH_WORD)].map((m) =>
    m[0].toLowerCase(),
  );
}

/**
 * 설명 글의 영어 낱말(소문자, 같은 낱말은 한 번 — 차례대로). {NAME} 자리와 선생님 영어 이름(소유격 포함)은 뺀다.
 */
export function explanationEnglishWordsOf(
  explanation: string,
  teacherName: string,
): string[] {
  const teacher = teacherName.trim().toLowerCase();
  const out: string[] = [];
  for (const word of wordsIn(explanation)) {
    if (teacher !== "" && (word === teacher || word === `${teacher}'s`))
      continue;
    if (!out.includes(word)) out.push(word);
  }
  return out;
}

/**
 * 한국어 설명이 그 차례에 맞는가: 설명에 든 영어 낱말마다 그 낱말이나 원형이, 그 차례에 아이가 보거나 듣는 영어(선생님 말 · 붙인 줄 · 신호 말 ·
 * 소리 줄)와 막힌 질문(seen) 가운데 어딘가의 낱말이나 원형과 같아야 맞다. 하나라도 어디에도 없으면 맞지 않는다(부르는 쪽이 설명을 보이지 않고
 * 저장하지 않는다). 대소문자는 보지 않는다. 영어 낱말이 없는 설명은 늘 맞다. lemmaOf 는 어휘 시드의 원형 찾기(모르면 undefined).
 */
export function explanationFitsTurnOf({
  explanation,
  seen,
  teacherName,
  lemmaOf,
}: {
  explanation: string;
  seen: readonly string[];
  teacherName: string;
  lemmaOf: (surface: string) => string | undefined;
}): boolean {
  const words = explanationEnglishWordsOf(explanation, teacherName);
  if (words.length === 0) return true;
  const keysOf = (word: string): string[] => {
    const lemma = lemmaOf(word)?.toLowerCase();
    return lemma !== undefined && lemma !== word ? [word, lemma] : [word];
  };
  const known = new Set(seen.flatMap((text) => wordsIn(text).flatMap(keysOf)));
  return words.every((word) => keysOf(word).some((key) => known.has(key)));
}
