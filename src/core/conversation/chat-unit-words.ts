// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R plan 묶음 S2 fix 2 · fix 3 · 13절 C243 보완 6 (5))의 단원 낱말 재료.
// 힌트 단 재료(틀 단을 만드는 단원 단어 · 원형 표)와 기록 전용 판정의 맥락(단원 단어 · 장면 낱말 · 원형 표)은 모두 단계 맥락의 단원 단어(서버
// levelContextOf 의 unitWords — 단원 규격 targetVocab, spec 표 {UNIT_WORDS})와 그 낱말들로 만든 원형 표를 쓴다. 수업 상태의 원형 표(state.lemmaOf)는
// 그 수업에 쓰인 단원 단어로만 만들어져 단계 맥락의 나머지 낱말이 꼴을 바꾸면 원형으로 읽히지 않으므로 쓰지 않는다(검토 rev-chat-t1 I-1 · O-2).
// 서버(힌트 받는 액션 · 닫을 때 · 턴 길 — src/server/conversation/chat-unit-words.ts 가 다시 내보냄)와 대본 도구가 같은 함수를 부른다(NFR-4).
// 순수 모듈이다(DB · 서버 없음).
import type { ChatJudgeContext } from "@/core/conversation/chat-judge";
import type { ChatInput } from "@/core/conversation/chat-message";
import { chatJudgeContextOf } from "@/core/conversation/chat-segments";
import { chatEvalDueOf } from "@/core/conversation/chat-turn-core";
import { lemmaLookup } from "@/core/session/attempt";

/** 이야기 방식의 단원 낱말 재료: 단계 맥락의 단원 단어와 그 낱말들의 원형 표. */
export type ChatUnitWords = {
  unitWords: readonly string[];
  lemmaOf: (surface: string) => string | undefined;
};

/**
 * 재료를 만든다(순수 — 서버와 대본 도구가 같은 함수를 부른다). lemmaEntries 는 그 단원 단어의 vocab 꼴 자료(낱말 · forms)다. 원형 표는 단원 단어 목록의
 * 차례로 만든다(꼴 자료의 차례 — DB 가 돌려준 차례 — 와 무관하게, 두 낱말이 같은 꼴을 가지면 목록에서 앞인 낱말). 단원 단어 밖의 자료는 쓰지 않는다.
 */
export function chatUnitWordsOf({
  unitWords,
  lemmaEntries,
}: {
  unitWords: readonly string[];
  lemmaEntries: readonly { word: string; forms: readonly string[] }[];
}): ChatUnitWords {
  const at = new Map(unitWords.map((word, i) => [word, i]));
  const ordered = lemmaEntries
    .filter((entry) => at.has(entry.word))
    .sort((a, b) => (at.get(a.word) ?? 0) - (at.get(b.word) ?? 0));
  return { unitWords: [...unitWords], lemmaOf: lemmaLookup(ordered) };
}

/**
 * 이미 읽은 어휘 사전(모든 vocab 의 낱말 · forms — 턴 길의 기록 전용 수준 검사 재료)으로 재료를 만든다. vocab 꼴 자료를 따로 읽은 재료(서버
 * readChatUnitWords)와 같은 행 · 같은 값이라, 턴 길이 첫 문장 앞에 DB 를 한 번 더 읽지 않아도 된다(재검토 rev-chat-s2-3 N-1 · NFR-1).
 */
export function chatUnitWordsFromLexicon({
  unitWords,
  lexicon,
}: {
  unitWords: readonly string[];
  lexicon: readonly { word: string; forms: readonly string[] }[];
}): ChatUnitWords {
  return chatUnitWordsOf({ unitWords, lemmaEntries: lexicon });
}

/**
 * 턴 길의 응답 뒤 평가를 부를 차례인가: 말 입력 차례(P3 chatEvalDueOf)이고 이 차례의 단원 낱말 재료를 읽었을 때만. 재료를 읽지 못한 차례는 원형 표
 * 없는 맥락으로 평가 저장이 수업 전체를 다시 세지 않도록 부르지 않는다 — 그 아이 행은 기다림으로 남아 닫을 때 다시 불린다(재검토 rev-chat-s2-3 M-2,
 * 가장 보수적인 쪽).
 */
export function chatTurnEvalDueOf({
  input,
  unitWordsRead,
}: {
  input: ChatInput;
  unitWordsRead: boolean;
}): boolean {
  return unitWordsRead && chatEvalDueOf(input);
}

/**
 * 기록 전용 판정의 수업 맥락(core chatJudgeContextOf)을 단원 낱말 재료로 만든다. 턴 길(첫 판정 · 응답 뒤 평가)과 닫는 길(남은 평가)이 이 함수 하나로
 * 만들어 같은 값이 된다 — 다르면 닫을 때의 다시 세기가 앞 차례의 저장된 판정을 바꾼다(검토 rev-chat-s2 I-2). 카드 · 단계 구간 · 선생님은 수업 상태에서 온다.
 */
export function chatJudgeContextFrom(
  lesson: Pick<
    Parameters<typeof chatJudgeContextOf>[0],
    "card" | "spec" | "teacher"
  >,
  unit: ChatUnitWords,
  homophones: readonly (readonly string[])[],
): ChatJudgeContext {
  return chatJudgeContextOf(
    {
      card: lesson.card,
      spec: lesson.spec,
      teacher: lesson.teacher,
      lemmaOf: unit.lemmaOf,
    },
    { unitWords: unit.unitWords, homophones },
  );
}
