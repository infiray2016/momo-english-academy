# 구현 보고: 회화 턴 프롬프트 · 흐름 규칙 고침 1(구현자 impl-talk-prompt-1 · Opus · high, 2026-11-05 23:2x)

상태: DONE_WITH_CONCERNS(관문 넷 0. 우려는 맡은 파일 밖 e2e 세 건이 바뀐 거름 규칙에 걸릴 것으로 보임 — 7절 U1).
워크트리 `.claude/worktrees/p13d`(HEAD f4ec058). 커밋 · push · 개발 DB 쓰기 · 실호출 없음.

## 1 관문

| 명령 | 결과 |
|---|---|
| `pnpm biome ci` | 587 파일, 오류 0 |
| `pnpm tsc --noEmit -p .` | 오류 0(다른 구현자의 `scripts/talk-observe.ts` 포함) |
| `pnpm vitest run --project unit` | 145 파일 · 1840 통과 · 6 todo · 실패 0(기준 1792 → 새 시험 26 + 기존 시험 변경) |
| `pnpm check:ids` | exit 0 · setting-default 0 · fixture-setting 0 · design-number 47(기준과 같음) |

시험 먼저: 새 시험 파일을 먼저 써서 23건 실패를 확인한 뒤 구현했다(기존 동작과 같은 2건만 처음부터 통과). 출력 파일은 스크래치패드 `prompt1/` (red.txt · unit5.txt · ids3.txt).
check:ids 의 setting-default 는 컨트롤러가 워크트리 `specs/09-설정값.md` 88줄을 3 으로 고쳐 두어 0 이다(내 질문 메시지는 답이 필요 없어졌다).

## 2 항목별 바뀐 곳 · 대조한 정본

| 할 것 | 바꾼 곳(워크트리 줄) | 대조한 정본 |
|---|---|---|
| 1 1~3단계 고정부 다시 쓰기(5.1 1) | `talk-lesson.ts` lowBandRules(spec) 785~811 — 단계 규격 choices 로 가름, 고르는 곳 talkLessonSystem | 02-2:180 · 204 · 241 · 271 · 328, 05:49, C202 (1) |
| 2 이어 묻기 먼저(5.1 2) | `talk-lesson.ts` 739~740(규칙 두 문장) | 02-2:156 · 184 · 192, 09:74, C202 (2) |
| 3 장면 단정 금지(5.1 3) | `talk-lesson.ts` 744 | 변경 spec 267, C202 (3) |
| 4 인사 끝 · 인사 반응(5.1 4) | `talk-lesson.ts` 731~735(되풀이는 대화 토막만 · 인사 반응), 757(인사 끝 예 되살림 · 'Next part'), 사용자 메시지 913 · 984~991, `lesson-turn.ts` 1801(nextPart: start.prepPlan 이 있으면 prep) | 02-2:162 · 169, C202 (4) |
| 5 한국어 뜻 알리기(5.1 5) | 가변부 'Korean meaning: yes/no' 844, 규칙 769, 칸 설명 524 | 13절 C194 (2) 근거 문장, plan 정한 것 9, C202 (5) |
| 6 선택지 오답도 말이 되게(5.1 6) | lowBandRules choices 거짓 갈래 셋째 문장, 참(1단계) 갈래에 장난 오답 예 | 표본 2 턴 11, C202 |
| 7 맞장구 시간(5.1 7) | `seed/settings.json` talk.wait_line_seconds 1.5 → 3, `tests/fixtures/settings.ts` 같은 값 | 09:88(컨트롤러 사본 반영), C202 (6) |
| 8 소리 줄 거름(5.2 1) | `talk-lesson.ts` 정규화 1370~1425 · keptChoicesOf 1299 · sameAsChoice 1283, 입력 TalkLineRange.reaskWords 238 · TalkLessonSpecView choices, `lesson-flow.ts` reaskWordsOf 460, `lesson-input.ts` lessonRangeOf 244, `server/ai/talk.ts` soundPairsOf 286 | 02-2:180 · 204 · 271, C125 (3), C202 (1), A1 · A4 · A8 |
| 9 사용자 메시지 두 줄(5.2 2) | `lesson-flow.ts` 셈 149 · 174 · 308 · 431, 계획 칸 560 · 639, `talk-lesson.ts` talkCallTurnOf · 사용자 메시지 984~988 | 02-2:184 · 192, C202 (2) |
| 10 뜻을 문장마다(5.2 3) | 응답 규격 tori_ko 문자열 → 문장 목록 524, 느슨한 규격 koList 641(옛 한 글 꼴은 한 덩이로), 정규화 koPerSentenceOf 1336 · 1464, 출력 검사 문장마다 1587 · 1672, `spoken.ts` toriKoShownOf 107, `lesson-turn.ts` 1072(끝 처리) · 802 · 1397(문장 문에 걸린 수) | plan 정한 것 9 를 바꿈(C202 (5)), T2 |
| 11 Minor 셋(5.2 4) | A7 `lesson-turn.ts` lessonOverLengthOf 1353 · 1921, `talk-lesson.ts` teacherSentencesMaxOf 334 / A9 `lesson-input.ts` skippedPrepWordsOf 105 · readSkippedPrepWords 118 · lessonContextAt 141 · 307 / 인사 끝 다음 토막 줄은 4 와 같음 | 변경 spec 263, 02-2:177 |
| 12 단위 시험 | `tests/unit/talk-prompt-fix1.test.ts`(26건, 아래 6절) | — |

저장 꼴: talk_turns.tori_ko 칸은 그대로 text 다. 정규화가 뜻을 문장 목록으로 받고, 끝 처리가 남은 문장의 뜻만 이어 한 글로 저장 · 흘린다(흘려 보낼 줄 `{t:"ko"}` 하나 · 다시 흘림 · 화면은 바꾸지 않음). 스키마 · 마이그레이션 없음. `tori.tsx` · `talk-log.tsx` 는 고칠 필요가 없어 손대지 않았다(같은 답 두 번 읽기는 서버에서 따라 할 말을 버려 막는다).

## 3 프롬프트 고정부(바뀐 문장 전문)

모든 단계(commonRules):
- 바꿈: "In the talk (Segment talk or more_talk), if the child's English is wrong, say the correct sentence back naturally (recast), … (뒤는 그대로)"
- 더함: "In the greeting, do not say the child's answer back (not 'You are fine!'). React like a person (e.g. 'Good to hear!', 'Me too!')."
- 더함: "When 'Previous turn was a card chance: yes' and the child answered, your next question follows up on the child's answer (next_move follow_up). Bring up the next card chance only when the child's words reach it."
- 더함: "'AI turns since last follow-up' counts your AI turns since your last follow-up question."
- 더함: "Never state the child's feeling, state or action as a fact unless the child said it (not 'You are thirsty.'). Before a card question, set the scene with a thing or a question (e.g. 'Oh, cold juice!')."
- 바꿈: "When Segment is greeting_end, write only a reaction and a short line moving on to the part in 'Next part' (short preparation: e.g. 'Let's learn some new words!'; talk: e.g. 'Let's talk!'). Do not ask a question."
- 더함: "When 'Korean meaning: yes', write in tori_ko the Korean meaning of every sentence of tori_en in the same order, one item per sentence (the reaction and the cue too). When 'Korean meaning: no', leave tori_ko and farewell_ko empty."

1~3단계(lowBandRules, 옛 첫 줄 '고르기 꼴 자주'와 옛 소리 줄 문장을 바꿈):
- "Levels 1-3: your question is the last question sentence of tori_en; a cue like 'Listen and say!' may come after it only when you fill model_line or choices."
- 단계 규격 choices 참(1단계): "At this level, ask yes-or-no or choice questions often." · "Choices are two sentences of the same shape, one with the target word. A playful wrong choice is fine at this level (e.g. 'A banana? Or a horse?')."
- 거짓(2~3단계): "At this level, ask so that the child answers with one sentence by themselves. Never give choices with a card question or a question about a unit word; when the child is stuck, the hint button gives the Korean meaning, an English frame and the sentence." · "Use choices only for a follow-up this-or-that question about the child's own answer." · "Choices are two sentences of the same shape. Both choices must make sense as answers (e.g. 'I drink milk.' / 'I drink juice.', not 'I wash the juice.')."
- "Levels 1-3: fill model_line only at Support stage 1 or 3, after nospeech, or when you bring up a word from 'Chances, new words to introduce' for the first time. Never fill model_line and choices in the same turn."
- "When you ask about a word again (you asked it before, or it was a short preparation word), give no model_line and no choices: let the child try first."
- "Levels 1-3: never write in tori_en the English the child should say. When you fill model_line or choices, end tori_en with a cue like 'Listen and say!'."
- 받침 카드 자리 · Question: no · 받침 2 · 받침 3 · 힌트 칸 문장은 그대로다.

가변부: "Korean meaning: yes|no" 줄(대화 방식 다음). 사용자 메시지: "Previous turn was a card chance: yes|no", "AI turns since last follow-up: N"(흐름 계획이 있는 턴만 — 끝맺음 턴은 없음), 인사 끝 턴만 "Next part: short preparation|talk". 칸 설명: model_line · choices · tori_ko(문장 목록).

## 4 소리 줄 거름 규칙 표(정규화, 1~3단계 AI 차례)

'다시 묻는 턴 낱말' = 앞 세션 만남(start.metBefore) ∪ 인사 뒤 준비에서 보인 낱말(건너뛴 것 포함) ∪ 대화 중 준비 낱말 ∪ 이 대화 선생님 행이 노린(move.words) · 꺼낸(move.intro) 낱말. '노림' = next_targets ∪ 카드 항목 노리는 단어 ∪ 선택지 안의 단원 단어.

| 경우 | 따라 할 말 | 선택지 |
|---|---|---|
| 받침 1(같이 말하기) · 3(닫기) · 들리지 않음 | 남김(범위 밖이면 카드 들려줄 말 · 답 예시) | 아래 행대로 |
| 받침 2(쉬운 질문) | 버림(그대로) | 남김(꼴 · 범위 · 노리는 단어 검사) |
| 받침 0, '꺼낼 새 단어'(다시 묻는 턴 낱말 뺌)를 담음 | 남김 | 아래 행대로 |
| 받침 0, 그 밖 | 버림 | 아래 행대로 |
| 노림에 다시 묻는 턴 낱말 | — | 버림 |
| 노림이 비었음(단원 단어 없는 이어 묻기) | — | 꼴 · 범위 검사만(두 답의 낱말을 노리는 자리로 봄) |
| 노림 있음, 규격 choices 거짓(2~3단계) | — | 버림(처음 묻는 질문에 선택지 없음) |
| 노림 있음, 규격 choices 참(1단계) | — | 노리는 단어 검사로 남김 |
| 따라 할 말이 선택지 하나와 같음(서로 담음) | 버림 | 남김 |
| 꺼낸 새 단어 | '꺼낼 새 단어' 안이고 tori_en · 남은 따라 할 말에 있을 때만(A8) | — |

support 칸은 옛 규칙대로 남은 줄과 다시 맞춘다. 서버 soundPairsOf 도 선택지와 같은 따라 할 말 짝을 넣지 않는다.

## 5 talk:observe 로 볼 것

1. 기록 6 · 7턴 장면(첫 질문 막힘 둘 → 쉬운 질문 답 'Yes I am hungry'): 다음 AI 차례가 답 줄 없이 아이 답에 이어 묻는가('Previous turn was a card chance: yes'), 'Listen and say!' 가 없는가.
2. 3단계 카드 필수 질문(짧은 준비 낱말 eat · drink · go)을 AI 가 꺼낼 때 따라 할 말 · 선택지가 응답에 남는가(남으면 서버가 버리지만 ai_calls 는 '검증 실패' — 빈도를 본다).
3. 'You are thirsty.' 같은 장면 단정이 사라졌는가, 카드 질문 사이에 이어 묻기가 끼는가(AI turns since last follow-up 값이 follow_up_min_every_turns 에 닿기 전).
4. 인사 끝 말이 'Let's learn some new words!' 꼴이고 'you are fine' 되받기가 없는가.
5. tori_ko 가 문장 수와 같은 목록으로 오는가(다르면 한 덩이로 묶여 옛 규칙 — 선생님 문장이 빠지면 뜻 전체가 사라짐). 2~3단계 이어 묻기 선택지가 실제로 나오는지와 그 오답이 말이 되는지.
6. 맞장구(3초)와 첫 문장 겹침 체감.
7. U5(분석): 다시 쓸 선생님 차례에 남은 소리 줄이 이어 붙어 AI 가 앞 턴 꼴을 따라 하는지.

## 6 덮는 시험

새 파일 `tests/unit/talk-prompt-fix1.test.ts` 26건: 다시 묻는 턴 거름 · 1단계 처음 묻는 턴 선택지 · 선택지 안 단원 단어 · 2~3단계 카드 질문 선택지 버림과 이어 묻기 선택지 · 받침 2 · 받침 0 꺼내기 · 받침 1 · 3 · 들리지 않음 · 따라 할 말 = 선택지 · A8 · soundPairsOf / 사용자 메시지 두 줄 · 다음 토막 · 흐름 셈(afterChance · sinceFollowUp · talkCallTurnOf) · reaskWordsOf / 고정부 규칙 문장 다섯 묶음 / 뜻 정규화 · 문장마다 출력 검사 · toriKoShownOf · 끝 처리(빠진 문장 뜻만 뺌 · 문장 문 걸림이면 뜻 없음) / wait_line 3 · A7 · A9.

바꾼 기존 시험(옛 규칙을 적던 것): `talk-lesson-call.test.ts`(고정부 문장 · 꺼낸 새 단어 A8 · 받침 0 따라 할 말 · 선택지 시험은 1단계 꼴 CHOICES_ON 으로 · 10단계 뜻 [] · M-3 · N-2), `talk-lesson-turn.test.ts`(뜻 목록 꼴, '한 덩이 뜻은 옛 규칙' 주석), `talk-stream-call.test.ts`(걸린 문장 뜻만 빔).

## 7 설계와 다르게 한 것 · 요청하는 변경 · 우려

맡은 파일 밖에서 고친 시험 자료(형 · 계약 때문에 필요): `tests/fixtures/ai/talk-lesson-inputs.ts`(규격 choices · reaskWords), `tests/fixtures/ai/samples/talk_turn.v2-*.json` 19개(tori_ko 를 문장 목록으로, 다른 칸 그대로), `tests/e2e/talk.ts` 443줄 · `tests/integration/talk-fixture.ts` 163줄(tori_ko 빈 목록 · 목록 — 문자열이면 엄격 규격에 걸려 ai_calls 가 '검증 실패'가 됨).

- **U1 [Important] e2e 세 건이 CI 에서 걸릴 것으로 본다(맡은 파일 밖이라 고치지 않음, 로컬에서 e2e 를 돌릴 수 없음).** `tests/e2e/talk-lesson.spec.ts` 의 'AC-15q 2~3단계 선택지는 글 없는 ①② 단추…'와 '7절 말하기 버튼 행…', `tests/e2e/required-utterance.spec.ts` 의 'AC-23f 회화 1단계…'가 가짜 AI 선택지를 카드 필수 1(이미 물은 낱말)을 노린 받침 0 턴에 넣는다. 새 거름은 이 선택지를 버린다(다시 묻는 턴 · 3단계는 카드 질문 선택지 없음). 고칠 안: 가짜 응답을 단원 단어 없는 이어 묻기 선택지로 바꾼다 — 예 `choices: ["I like it.", "I like you."]`, `card_item: none`, `next_targets: []`, `next_move: "follow_up"`(you 는 시험 어휘 builders.ts 921줄에 있음). 아니면 받침 2(쉬운 질문) 턴으로 옮긴다.
- U2 D1 (나)의 '이어 묻기 선택지'를 살리려고, 노림이 빈 선택지는 두 답의 낱말을 노리는 자리로 보고 꼴 · 범위만 검사한다. 1단계에도 같이 적용되어 예전에는 버리던 '노리는 단어 없는 고르기 답'이 이제 남는다(장난 오답 예와 같은 결). 요청자 D1 이 (가)로 정해지면 keptChoicesOf 의 이 갈래 한 줄을 지우면 된다.
- U3 서버는 '따라 할 말과 선택지를 한 턴에 함께'를 막지 않는다(같은 말일 때만 따라 할 말을 버림). 프롬프트 규칙만 있다 — 대본에서 남으면 서버 규칙으로 올릴지 정해야 한다.
- U4 문장 문(금지어 등)에 걸린 응답은 뜻 목록을 문장과 맞출 수 없어 뜻을 보이지 않게 했다(전에는 뜻 전체를 보였다). 드문 길이다.
- U5 `src/server/conversation/state.ts` 의 lessonToriKoOf 는 이제 아무도 부르지 않는다(맡은 파일 밖이라 남김). 지울지 컨트롤러가 정한다.
- U6 talk_turns.over_length 가 이제 선생님 문장 수 초과도 참으로 적는다(A7) — 부모 화면 · 집계가 이 칸을 '낱말 수 초과'로만 읽는 곳이 있으면 뜻이 넓어진다(코드에서 찾은 읽는 곳은 없음).
- U7 '이미 만난 낱말'(A9)을 위해 회화 턴마다 attempts 를 한 번 더 읽는다(세션 시도 행 수만큼, 같은 Promise.all 안).

공개 서명 바뀜: `TalkLessonOutput.tori_ko` string → string[]; `TalkLineRange` 에 필수 `reaskWords`; `TalkLessonSpecView` 에 `choices`; `TalkCallTurn` 에 선택 `afterCardChance` · `aiTurnsSinceFollowUp` · `nextPart`; `TeacherTurnPlan` 에 `afterChance` · `sinceFollowUp`; `TalkLessonPosition` 에 `aiTurnsSinceFollowUp` · `afterCardChance`; `LessonOutcomeView`(ok)에 선택 `blocked`; `toriKoShownOf` 의 ko 가 string | string[] | null; `lessonContextAt` 둘째 인자에 선택 `skippedPrep`; `lessonRangeOf` state 에 turns · prepWords · start. 새로 내보냄: teacherSentencesMaxOf · reaskWordsOf · skippedPrepWordsOf · readSkippedPrepWords · lessonOverLengthOf. 다른 구현자의 `scripts/talk-observe.ts` 는 이미 reaskWordsOf · toriKoShownOf 를 쓰고 tsc 를 지난다.

## 추가 1(컨트롤러 요청 23:3x — task-talk-13-report 9절 2)

앱이 붙인 대화 첫 질문은 앞에 아이 행이 없어 앞 턴 전문(historyOf)에 들지 않는다. 그 질문에 답한 턴의 사용자 메시지에 질문 글과 카드 기회 표시를 한 줄 넣었다. 이 줄은 'Child:' 바로 앞에 둔다.

- `lesson-flow.ts` TalkLessonPosition.appAskedBefore 156줄, 셈 293줄(대화 토막의 first_question 행이면 질문 글 · 카드 기회, 그 뒤 선생님 행이 오면 null), TeacherTurnPlan.appAsked.
- `talk-lesson.ts` TalkCallTurn.appAsked(선택), talkCallTurnOf 옮김, 사용자 메시지 974줄: "App question just before (not in the turns above): <질문> (card chance: yes|no)". 고정부 746줄: "'App question just before' is the question the app asked right before the child's words (it is not in the turns above). The child's words answer that question."
- 시험: talk-prompt-fix1 에 1건 더했다(첫 질문 답 턴은 줄이 있고 'Child:' 바로 앞, AI 질문 답 턴은 줄이 없음, 고정부 문장). 이 건은 구현과 함께 써서 먼저 실패하는 것을 따로 확인하지 않았다.
- 관문: biome ci 0 · tsc 0 · 단위 145 파일 1841 통과 · check:ids 0.
- talk:observe 로 볼 것: 첫 질문 답 뒤의 반응이 그 질문에 맞게 이어 묻는가(9절 2 의 영향).

## 보탬(컨트롤러 요청 — 우려 U1 e2e 세 건 고침)

가짜 AI 선택지를 새 거름에 맞는 견본으로 바꿨다. 받침 0 에서 이미 물은 낱말(카드 필수 1)을 노리던 선택지를 단원 단어 없는 이어 묻기 고르기 답으로 바꿨다. 시험이 보는 것(①② 단추 · 읽기 차례 · 말하기 버튼 행 · 아이 말풍선)은 그대로다.

| 파일 · 줄 | 바꾼 것 |
|---|---|
| `tests/e2e/talk-lesson.spec.ts` 88 | choicesOf: `["I like it.", "I like you."]`(시험 어휘 builders.ts 920~921줄의 I · you, 카드 낱말 안 씀) |
| 같은 파일 692 'AC-15q 2~3단계 선택지' | 가짜 응답에서 `card_item: required 1` 을 뺌(노림 없음 · next_move follow_up), 주석 고침 |
| 같은 파일 838~841 '7절 말하기 버튼 행' | `card_item` 을 빼고, 힌트 마지막 단까지 열 수 있게 AI 질문 힌트 묶음(next_hint_ko · next_hints · next_answer_example)을 넣음 |
| `tests/e2e/required-utterance.spec.ts` 328 · 363 'AC-23f 1단계' | 같은 choicesOf, 가짜 응답에서 `card_item` 을 뺌 |

대조한 거름 규칙: `src/core/ai/calls/talk-lesson.ts` keptChoicesOf 1311줄의 두 갈래다. 1338줄은 노림이 다시 묻는 턴 낱말이면 버린다(옛 견본이 여기서 걸림). 1339줄은 노림이 비면 두 답의 낱말로 꼴 · 범위만 검사한다(새 견본이 여기를 지남). 2~3단계 규격 choices 거짓 갈래는 노림이 있을 때만 버리므로 새 견본은 걸리지 않는다.

관문: biome ci 0 · tsc 0 · 단위 1841 통과. e2e 는 로컬에서 돌리지 않았다(CI 몫). '7절 말하기 버튼 행'의 힌트 단은 AI 질문 힌트 묶음에서 열린다고 보고 고쳤다(카드 항목 힌트 → AI 힌트로 출처가 바뀜). CI 에서 이 시험이 걸리면 이 점부터 본다.

## 보탬 2(같은 요청 재전달 — 확인만)

e2e 세 건 고침은 바로 위 '보탬' 절에서 이미 끝냈다. 다시 확인했다.
- `tests/e2e/talk-lesson.spec.ts` 89줄과 `tests/e2e/required-utterance.spec.ts` 329줄의 choicesOf 는 `["I like it.", "I like you."]` 이다.
- 세 시험의 가짜 응답에는 card_item 이 없다.
- 같은 파일 740줄의 `card_item: required 1` 은 '못 들었어요' 시험이다. 선택지 · 따라 할 말이 없어 거름과 관계없으므로 그대로 두었다.

대조한 거름 코드: `src/core/ai/calls/talk-lesson.ts` keptChoicesOf(1311줄)의 두 갈래다.
- 1338줄은 노림이 다시 묻는 턴 낱말이면 버린다. 옛 견본이 여기서 걸렸다.
- 1339줄은 노림이 비면 꼴 · 범위만 검사한다. 새 견본이 여기를 지난다.

관문(다시 돌림): biome ci 0 · tsc 0 · 단위 1841 통과. e2e 는 CI 몫이다.

## fix round 1(검토 rev-night-2 Changes requested — I-3 · M-1 · M-3 · M-4 · M-5 · M-7 · 13절 C203)

상태: DONE_WITH_CONCERNS. 재호출 기록 방식은 컨트롤러 답(23:5x)에 따라 (나)다. purpose 는 talk_turn 그대로이고, error_code 에 'question_retry' 표지를 적는다(아래 U-f1). 정식 purpose 값 talk_question_retry 와 마이그레이션 0008 은 요청자 D9 확정 뒤에 한다.

| 지적 | 바꾼 곳(워크트리 줄) | 대조 |
|---|---|---|
| I-3 빈 단언 | `tests/unit/talk-prompt-fix1.test.ts` 521 — buildSystem 의 Context 절 줄만 잘라 3단계 'yes'만 · 5단계 'no'만 있음을 단언 | common.ts:208~212 |
| M-1 (a) 받침 둘째 선택지 모순 | `talk-lesson.ts` 806 "Except at Support stage 2, never give choices …" — 서버 keptChoicesOf 의 받침 둘째 갈래와 맞춤 | 02-2:258~260 |
| M-1 (b) 'an English frame' | 같은 줄 "when the child is stuck, the hint button helps."(단 이름을 적지 않음 — 2단계는 틀 단이 없음) | level-specs 2단계 hintTiers |
| M-1 (c) 예에 단원 단어 | 808 "(e.g. 'It is red.' / 'It is blue.', not 'It is sleepy.')" | keptChoicesOf 노림 갈래 |
| M-3 묻는 꼴 | 758 "set the scene with a thing, not with another question (e.g. 'Oh, cold juice!')" | 'Ask only one question in a turn' |
| M-4 받침 0 따라 할 말 | `talk-lesson.ts` 1413 aimsReask — 다음 질문 노림(next_targets · 카드 항목)이 다시 묻는 턴 낱말이면 꺼내는 줄도 버림 + 시험 1건 | 02-2:271 |
| M-5 이어 묻기 뒤 셈 | `lesson-flow.ts` 185 · 331 — AI 차례 · 카드 자리 · 대화 첫 질문을 센다(받침 차례 · 인사 끝 반응 · 마무리 자리 뺌). 이름을 teacherTurnsSinceFollowUp, 사용자 메시지 'Teacher turns since last follow-up', 고정부 753 "… counts your turns, including the app's card turns, …". 시험 견본에 카드 자리 행 · 받침 카드 자리 행을 넣어 2 · 2 를 단언 | 02-2:184 |
| M-7 lessonToriKoOf | `src/server/conversation/state.ts` 635 주석을 '옛 규칙 — 쓰지 않음'으로(지우면 talk-lesson-state 시험도 지워야 해 표시만) | C202 (5) |
| C203 (1) 아이가 말한 낱말 | `question-check.ts` childSaidSet 249 · checkLowLevelQuestion 276 — 노리는 단어 가운데 아이가 이 대화에서 말한 낱말(소문자 · 원형)은 질문 검사에서 뺀다 | 13절 C203 (1) |
| C203 (2) 닫힌 품사 한 낱말 | `question-check.ts` CLOSED_CLASS_PASS_WORDS 152(too · also · now · here · there · then · very · so · really), 범위 밖 낱말이 이 목록의 한 낱말뿐이면 통과. 질문 검사만(소리 줄 · 선택지에는 안 씀). 걸리면 LineCheck 에 words(걸린 낱말) | 13절 C203 (2) |
| C203 (3) 다시 쓰기 | 새 순수 모듈 `src/core/conversation/question-retry.ts`, 서버 `lesson-turn.ts` withQuestionRetry 1370 · 턴 길 1976, 입력 `talk-lesson.ts` TalkLessonInput.retry 272 · 메시지 1100(가림: note 를 아이 말처럼 가림), 기록 `server/ai/talk.ts` TALK_QUESTION_RETRY_TAG 165 · taggedErrorCode 168 | 13절 C203 (3) |

C203 (3) 동작: 성공 응답 · 질문을 쓰는 AI 차례 · 1~3단계 범위를 읽은 턴에서 잡아 둔 질문이 길이 · 노리는 단어 · 범위 밖 낱말 · 형태 검사에 걸리면, 같은 입력에 [앞 응답 tori_en(assistant) · 다시 쓰기 메시지(user)]를 이어 talk_turn 을 한 번 더 부른다. 다시 쓴 응답의 문장은 아이에게 바로 보내지 않고 새 문장 문에만 넣는다. 그 첫 물음표 문장부터를 앞 응답의 보낸 반응 뒤에 잇고, 끝 처리(settleLessonTurn)가 같은 검사를 다시 한다. 다시 쓴 것도 걸리거나 응답 · 질문이 없으면 지금처럼 카드 자리다. 다시 부르기는 한 턴에 1회이고 같은 질문 · 끊김 · 한 줄 길은 다시 쓰지 않는다. 아이 말에 대한 칸(막힘 · 되풀이 · 스스로 쓴 단어 · 아이가 보인 능력 · 미션 …)은 앞 응답 값, 다음 질문 칸(갈래 · 카드 항목 · 노린 것 · 힌트 · 소리 줄)은 다시 쓴 응답 값이다. 뜻은 두 응답이 모두 문장마다 맞을 때만 문장마다 잇는다.

talk:observe 가 가져다 쓸 순수 함수(impl-talk-13 몫):
```ts
// src/core/conversation/question-check.ts
export const CLOSED_CLASS_PASS_WORDS: ReadonlySet<string>;
export type LineCheck = { ok: true } | { ok: false; reason: LowLevelLineReason; words?: string[] };
export function checkLowLevelQuestion(sentence, options & { targets }): LineCheck; // C203 (1)(2) 반영
// src/core/conversation/question-retry.ts
export type RetrySentence = { en: string; question: boolean; cue: boolean; state: "sent" | "held" | "dropped"; reason?: "question" | "same" | "overlap" };
export type HeldQuestionFail = { question: string; reason: "empty" | "too_long" | "target_word" | "offband" | "form"; words: string[] };
export function heldQuestionFailOf({ entries, targets, options }): HeldQuestionFail | null;
export function questionRetryNoteOf(fail, { sentenceMaxWords, targets, childWords }): string;
export function mergeQuestionRetry<V>({ first, firstEntries, retry, retryEntries }): { entries: RetrySentence[]; value: V } | null;
// src/core/ai/calls/talk-lesson.ts — 입력에 retry?: { previous: string; note: string } 를 두면 메시지 끝에 assistant · user 두 줄이 붙는다
// src/server/conversation/lesson-turn.ts(server-only) — withQuestionRetry({ flow, view, lineOptions, sentenceMaxWords, retry }) 가 위 셋을 잇는 차례(도구는 이 차례를 흉내 내면 된다)
```
그 밖의 이름 바뀜: TalkCallTurn.aiTurnsSinceFollowUp → teacherTurnsSinceFollowUp, TalkLessonPosition.aiTurnsSinceFollowUp → teacherTurnsSinceFollowUp(도구는 이 칸을 쓰지 않아 tsc 를 지남).

시험: `talk-prompt-fix1.test.ts` 34건(새로 C203 (3) 6건 · M-4 1건, I-3 · M-1 · M-3 · M-5 는 바꿈), `talk-question-check.test.ts` 16건(C203 (1) · (2) 2건 더함, 걸린 낱말 단언). 이번 라운드 시험은 구현과 함께 써서 먼저 실패하는 것을 따로 확인하지 않았다.
관문: biome ci 오류 0(588 파일) · tsc 0 · 단위 145 파일 1852 통과 · check:ids 0(design-number 47 그대로).

우려:
- U-f1 재호출 기록: ai_calls.purpose 는 Postgres 열거형이라 새 값은 마이그레이션 · 5절 바꿈이 필요하다. 그래서 purpose 는 talk_turn 그대로 두고 error_code 에 'question_retry'(오류가 있으면 'question_retry:<갈래>')를 단다. 하루 안전 상한(dailyUsage 는 목적을 가리지 않음) · 비용 셈에 그대로 든다. 같은 오류 알림(store.ts 153 LIKE '<갈래>%')은 표지가 붙은 오류 행을 같은 갈래로 세지 않는다. 정식 purpose 값 talk_question_retry 와 마이그레이션 0008 은 요청자 D9 확정 뒤에 한다(컨트롤러 결정 23:5x). 그때 기록 자리 한 곳(talk.ts record)과 AI_PURPOSES · 조합 키 · 04-데이터 5절을 함께 바꾼다.
- U-f2 다시 쓰기는 한 턴에 AI 호출 하나를 더하므로 첫 질문이 늦게 나온다(반응은 이미 나가 있음). 대본으로 지연 · 빈도를 재야 한다.
- U-f3 C203 (1)은 아이가 말한 낱말을 노리는 단어 검사에서 빼므로, 아이가 eat 을 말한 뒤 AI 가 'What do you eat?' 처럼 노리는 단어로 되묻는 것도 통과한다(되묻기의 뜻 그대로). 이 차례의 '말했다' 셈은 그대로다(아이 말에서 센다).

## fix round 2(재검토 rev-night-2 fix1 — N-1 Important · N-3 · N-4 · N-5 Minor)

| 지적 | 바꾼 곳 | 내용 |
|---|---|---|
| N-1 뜻 잇기 | `src/core/conversation/question-retry.ts` mergeQuestionRetry(firstAligned 부근) | 뜻을 문장 자리마다 둔다. 문장 수와 맞는 응답 쪽은 그 뜻을, 맞지 않는 쪽의 자리는 빈 뜻을 둔다. 둘 다 맞지 않으면 빈 목록(뜻 없음)이다. 걸린 질문 · 버린 반응의 뜻을 한 덩이로 잇던 갈래를 없앴다(C202 (5) '빠진 문장의 뜻만 뺀다'). 재현 장면(앞 뜻 한 덩이 + 다시 쓴 뜻 문장마다)은 이제 화면 뜻이 '밥 좋아해?'만이다 |
| N-3 끝점 상한 | `src/server/conversation/lesson-turn.ts` questionRetryFits, 턴 길 canRetry, `src/app/api/talk/turn/route.ts` maxDuration 주석 | 받은 때부터 지난 시간 + AI_WAIT_TIMEOUT_MULTIPLE × ai.timeout_seconds.realtime + TURN_SAVE_GRACE_MS 가 TURN_IN_FLIGHT_MS(=maxDuration 60초) 안일 때만 다시 부른다. 넘으면 다시 쓰지 않고 지금처럼 카드 자리다. route 주석에 '다시 쓰기가 든 턴은 최악 네 배'와 이 판정을 적었다. 시험이 route 의 maxDuration 글자와 TURN_IN_FLIGHT_MS 가 같은지 본다 |
| N-4 soundFixed · 첫 문장 시간 | QuestionRetryAnswer.soundFixed, withQuestionRetry 가 view 로 넘김, 다시 쓰기 호출의 requestReceivedAt 을 다시 부른 때(deps.now())로 | 다시 쓴 응답의 따라 할 말을 앱이 바꾸면 move.app 에 'model_line' 이 적힌다. 다시 쓰기 행의 첫 문장 시간에 첫 호출 시간이 섞이지 않는다 |
| N-5 시험 빈칸 | `tests/unit/talk-prompt-fix1.test.ts` 'fix 2(…)' describe | 메시지 차례(user → assistant 앞 응답 → user 다시 쓰기) · 다시 쓰기 메시지 가림 · ok 가 아닌 결과(끊김) · 질문을 쓰지 않는 차례(카드 자리) · canRetry 거짓에서 calls 0 |

시험: talk-prompt-fix1 38건(fix 2 4건 더함 — N-1 시험은 옛 코드에서 한 덩이 뜻이 나와 걸리는 꼴). 이번에도 구현과 함께 써서 먼저 실패하는 것을 따로 돌려 보지는 않았다.
관문: biome ci 0 · tsc 0 · 단위 145 파일 1861 통과 · check:ids 0(design-number 47 그대로).

남은 우려:
- 같은 시도 id 진행 중 판정(turnInFlight)은 마지막 호출이 성공이면 그 끝 + 저장 여유까지만 진행 중으로 본다. 첫 호출이 성공(질문만 걸림)으로 기록된 뒤 다시 쓰기가 도는 동안 같은 시도 id 가 다시 오면 진행 중이 아니라고 볼 수 있다(다시 쓰기 행은 끝난 뒤 기록된다). 드문 길이고 이번 지적 범위 밖이라 고치지 않았다.
- talk:observe 는 같은 core 함수(mergeQuestionRetry)를 쓰면 N-1 고침이 그대로 든다. 도구 쪽 다시 쓰기 흉내는 impl-talk-13 몫이다.
