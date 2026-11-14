import "server-only";
// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R plan 묶음 S2 fix 2 · 13절 C243 보완 6 (5))의 단원 낱말 재료.
// 힌트 단 재료(틀 단을 만드는 단원 단어 · 원형 표)와 기록 전용 판정의 맥락(단원 단어 · 장면 낱말 · 원형 표)은 모두 단계 맥락의 단원 단어(서버
// levelContextOf 의 unitWords — 단원 규격 targetVocab, spec 표 {UNIT_WORDS})와 그 낱말들로 만든 원형 표를 쓴다. 수업 상태의 원형 표(state.lemmaOf)는
// 그 수업에 쓰인 단원 단어로만 만들어져 단계 맥락의 나머지 낱말이 꼴을 바꾸면 원형으로 읽히지 않으므로 쓰지 않는다(검토 rev-chat-t1 I-1 · O-2).
// 힌트 받는 액션(index.ts) · 닫을 때의 평가(closing.ts) · 턴 길의 판정 맥락(chat-turn.ts)이 이 파일의 함수를 부른다. 기존 두 방식은 부르지 않는다.
import {
  type ChatUnitWords,
  chatUnitWordsOf,
} from "@/core/conversation/chat-unit-words";
import type { DbOrTx } from "@/server/db";
import { lemmaEntriesOf } from "./state";

// 순수 함수는 core 에 있다(대본 도구가 같은 함수를 부름 — 묶음 S2 fix 3). 서버 쪽 이름 그대로 다시 내보낸다
export {
  type ChatUnitWords,
  chatJudgeContextFrom,
  chatUnitWordsOf,
} from "@/core/conversation/chat-unit-words";

/** 단계 맥락의 단원 단어로 재료를 읽는다(vocab 의 꼴 자료 한 번). */
export async function readChatUnitWords(
  db: DbOrTx,
  unitWords: readonly string[],
): Promise<ChatUnitWords> {
  return chatUnitWordsOf({
    unitWords,
    lemmaEntries: await lemmaEntriesOf(db, unitWords),
  });
}
