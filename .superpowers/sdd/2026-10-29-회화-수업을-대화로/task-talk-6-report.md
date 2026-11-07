# 구현 보고: 회화 plan 묶음 6 — 회화 턴 호출 새 꼴(구현자 · Opus · high, 2026-10-30 09:0x)

상태: DONE_WITH_CONCERNS(우려는 끝 절). 워크트리 `.claude/worktrees/p13d`, 커밋 · push 없음.

## 새 파일 · 고친 파일

| 파일 | 신규 · 수정 | 내용 |
|---|---|---|
| `src/core/ai/calls/talk-lesson.ts` | 신규 | 새 응답 꼴 · 고정부 · 가변부 · 사용자 메시지 · 다시 쓸 선생님 차례 · 정규화 · 엄격 검사 · 출력 검사 칸 · 걸린 칸 바꾸기 · CallSpec 둘 · 함께 쓰는 형 |
| `tests/fixtures/ai/talk-lesson-inputs.ts` | 신규 | 새 꼴 견본 입력(3 · 4 · 5 · 10단계 단계 규격 보기, 3단계 새 꼴 카드 · 4단계 · 5단계 미션 카드, 어휘 범위 견본, 표본 이름 → 입력). 묶음 3 의 builders 를 쓰지 않는다 |
| `tests/unit/talk-lesson-call.test.ts` | 신규 | 단위 25개 |
| `tests/fixtures/ai/samples/talk_turn.v2-*.json` | 신규 12개 | 계약 표본 |
| `tests/contract/ai-schemas.test.ts` | 수정 | 22~25줄 가져오기, 169줄 `TALK_V2_PREFIX`, 198~206줄 v2 표본을 새 규격 · 새 견본 입력으로 보내는 갈래, 405~490줄 새 describe(시험 4개). 옛 갈래 · 옛 시험은 그대로 |

`talk-lesson.ts` 주요 자리: 형 41~232줄, 설정 읽기 `talkLessonRulesOf` 269줄, `isLowBandLevel` 293줄, `holdsQuestionSentence` 308줄, 응답 규격 317줄, 느슨한 규격 455줄 부근, `teacherBlockOf` 513줄, 고정부 518~590줄, 가변부 594줄, `talkLessonSystem` 650줄, `talkLessonUserMessage` 676줄, `talkLessonContextDelta` 736줄, `talkLessonRewriteOf` 763줄, `allowedGoalsOf` · `cardItemIn` · `modelLineFallbackOf` 849~895줄, `normalizeTalkLesson` 975줄, 엄격 검사 1103줄, `talkLessonCheckFields` 1166줄, `applyTalkLessonChecks` 1220줄, `talkLessonTurnSpec` · `talkLessonClosingSpec` 1309 · 1311줄.

## 응답 Zod 칸(차례 그대로, 모두 required · null 없음, 제목 `talk_turn`)

| 차례 | 칸 | 꼴 | 앱 확인(정규화) |
|---|---|---|---|
| 1 · 2 | stuck · tori_en | 참거짓 · 글 | tori_en 이 비면 null(끝맺음 턴 빼고) |
| 3 | model_line | 글 | 1~3단계 AI 차례만. 범위 검사(`checkSoundLine`)에 걸리면 꺼낸 새 단어의 카드 들려줄 말 → 막힌 질문의 답 예시(turn.stuckAnswer) → 빈 글 |
| 4 | choices | 글 목록 | 1~3단계 AI 차례 · 정확히 둘 · `checkChoices`(같은 꼴 · 정규화한 next_targets 를 노리는 단어로)일 때만, 아니면 [] |
| 5~7 | tori_ko · recast · explanation | 글 | 뜻은 koMeaning 단계만, '모름' 턴 되풀이는 빈 글 |
| 8 | new_words | 글 목록 | 원형으로 카드 오늘 쓸 말 안이고 tori_en · (바꾼 뒤) model_line 에 있을 때만 |
| 9 · 10 | self_used_words · mission_done | 그대로 | 말 입력 턴만. 미션은 1~미션 수, 겹침 없음, 평가 대화 밖 |
| 11~13 | response_fit · child_topic · child_asked | 참거짓 | 말 입력 턴만(기록 전용) |
| 14 | goal_suggest | `{ goal, why_ko }` 목록 | 카드 목표 · 이월 목표(input.carryGoals)만, 목표마다 하나, 말 입력 턴만 |
| 15 | next_move | TALK_NEXT_MOVES(9값) | AI 차례만. closing 은 allChancesUsed 턴만(정한 것 11), mission 은 미션 단계만, role_swap 은 카드에 roleSwap 이 있을 때만 |
| 16 | card_item | `{ kind: required · more · none, no }` | 카드에 있는 번호만, 아니면 none · 0 |
| 17 | next_goal | 글 목록 | 카드 목표 · 이월 목표만 |
| 18 | support | TALK_SUPPORTS(5값) | 모르는 값은 none |
| 19~23 | next_targets · next_hint_ko · next_hints · next_usable_phrases · next_answer_example | 그대로 | AI 차례만(1~3단계 AI 차례 포함). 힌트 없는 단계(10~12)는 노리는 단어 · 답 예시만. 힌트 영어 단 · 쓸 수 있는 말 수 자르기 |
| 24 | image_word | 글 | 1~3단계이고 input.imageWords(카탈로그)에 있을 때만(소문자) |
| 25~29 | farewell · farewell_ko · good_lines · next_time_lines · summary | 그대로 | 끝맺음 턴만. 잘한 말 · 다음엔 이렇게는 talk.feedback_from_level 부터 설정 수까지 |

카드 자리 · 마무리 자리 · 평가 대화 턴은 다음 질문 칸(갈래 · 카드 항목 · 노린 목표 · 힌트 묶음 · 소리 줄)을 비운다. 열거값 칸(next_move · support · card_item.kind)은 소문자로 다듬는다. 엄격 검사는 개수 · 범위 외에 선택지 0 · 2개, 4단계부터 소리 줄 빈 값, 카드 항목, 정한 것 11, 목표 ID 범위, '모름' 턴 미션, tori_en 을 본다.

## 고정부 · 가변부

- 고정부 = 선생님 블록(6.1 글 그대로) + 모든 단계 규칙(으뜸 원칙 · 네 낱말 안 첫 반응 · 한 차례 질문 하나와 문장 상한 `talk.teacher_sentences_max.<구간>` · 넓혀 되풀이 · 칭찬 · 이어 묻기 `talk.follow_up_min_every_turns` · 따라가기 `talk.follow_child_turns` · 기회 알림 차례와 A4-03 · 돌아오기 알림 · 새 단어 꺼내기 · 받침 단계 1~3 · 한국어 설명 단계 · 들리지 않음 · 카드 자리 · 마무리 자리 · 마무리 제안(정한 것 11) · 참고 턴은 채울 몫이 아님 · 바닥선 · 인사 끝 · 범위 밖 꼴 · 아이가 보인 능력 · 출력 칸 설명 · 개인 정보 · 사람 아님 · 인식 오류 · 되받기 · 끝인사 · 반말 · {NAME} · 규칙 유지 · 생각 글 없음 · 빈 칸 · 평가 대화 · 끝맺음) + 1~3단계 규칙(예 · 아니요 · 고르기 질문, 질문은 tori_en 끝에, 아이가 말할 영어는 model_line · choices 에, 'Listen and say!' 신호, AI 차례 힌트 · 그림 낱말) 또는 4단계부터 규칙(답 예시 · 쉬운 질문은 tori_en 안에, 받침 둘째는 쉬운 영어로) + 미션 단계(단계 규격 missions > 0)의 미션 · 역할 바꾸기 규칙(`talk.role_swap_turns`).
- 숫자는 모두 `talkLessonRulesOf` 가 설정에서 읽는다(키 7 + 구간 키 4, 없거나 꼴이 틀리면 CallSettingError). `talk.reask_sentence_every_turns` 는 읽지 않는다.
- 가변부 = 단계 맥락(levelVariable) + 대화 방식 · 참고 턴('not a quota') · 힌트 단 · 어휘 · 주제 · 목표 표현 · 카드 목표(글) · 이월 목표(글) · 예상 흐름 · 오늘 쓸 말(들려줄 말) · 짧은 준비 낱말 · 필수 질문(번호 · 노리는 단어 · 목표) · 더 이야기할 거리 · 미션(목표) · 역할 바꾸기 · 지난 대화 요약. 턴마다 바뀌는 값은 넣지 않는다(시험으로 확인).

## 사용자 메시지 꼴

```
[Mina (app): <앱의 첫 말>]          ← 첫 턴만
Child: … / Input: … / Segment: … / Hint: <종류> (<단>) / Heard help: -
Reason: - | button | stuck | nospeech
Turn: ai | card_slot | closing_slot
Card line: - | required 2: What sport is fun?
Support stage: 0~3
Stuck question: - | <막힌 질문 글>
Chances, carry-over goals: … / Chances, carry-over words: …
Chances, required questions: 2 (aims at: soccer); 3 (aims at: sunday)
Chances, words to use again: … / Chances, new words to introduce: …
Return to today's topic: yes|no / All card chances used: yes|no
Following child's topic: n / Turns left before closing question: n / Floor: yes|no
Closing: yes|no / Level test: yes|no
[Unit words not known yet · Already met among them · New words of this lesson · Friendship · Missions done]  ← 첫 턴 · 바뀐 턴만
```

옛 줄 Don't-know count · Target reached · More-talk material used up · AI question slot 은 없다. 다시 쓸 선생님 차례(`talkLessonRewriteOf`)는 검사를 지난 tori_en 한 줄 → 따라 할 말 → 선택지 줄('A Or B') → 앱이 붙인 줄(카드 질문 · 받침 줄 · 답 예시 · 마무리 물음) 차례이고 tori_ko · 맞장구는 없다.

## 출력 검사 칸(6.4)

model_line(en, 길이 봄) · choices.n(en) · tori_ko · recast(en, 길이 안 봄) · explanation · goal_suggest.n.why_ko(ko) · next_hint_ko · next_hints.n · next_usable_phrases.n · next_answer_example · farewell(길이 안 봄) · farewell_ko · good_lines.n(길이 안 봄) · next_time_lines.n · summary. 걸리면 따라 할 말은 바꿀 글로(modelLineReplaced), 선택지는 비움(choicesBlocked), 그 제안은 뺌, 힌트 묶음은 비우고 알림(hintsBlocked — 노리는 단어 · 갈래 · 카드 항목은 남겨 서버가 카드 항목의 힌트로 바꾸는 근거로 쓴다), 끝인사 · 요약은 옛 꼴과 같다. 회화 턴은 걸려도 실패로 보지 않는다(fatal false). tori_en 문장 검사는 흘려 받기(stream.ts) 몫 그대로다.

정한 것 19 의 호출 쪽 몫: `holdsQuestionSentence(level, sentence)`(1~3단계 물음표 문장이면 참)와 고정부 '질문은 tori_en 끝에'. 잡아 두기 자체와 문장 검사는 서버(묶음 8)가 묶음 5 의 `checkLowLevelQuestion` · `sameQuestionHit` 으로 한다.

## 표본(tests/fixtures/ai/samples, source handmade, 모두 200 · end_turn)

| 표본 | 단계 · 턴 | 엄격 | 정규화 기대 |
|---|---|---|---|
| v2-l3-ai | 3단계 AI 차례 | 지남 | 카드 항목 required 3 · 노리는 단어 1 · 제안 1 |
| v2-l3-card-slot | 카드 자리(AI 가 다음 질문 칸을 잘못 채움) | 지남 | 갈래 none · 카드 항목 none · 소리 줄 · 힌트 빈 값 |
| v2-l3-support-together | 받침 첫째(단추) | 지남 | 따라 할 말 'I play.' · support together · 되풀이 빈 값 |
| v2-l3-support-easy | 받침 둘째 | 지남 | 선택지 2 |
| v2-l3-support-close | 받침 셋째(카드 자리) | 지남 | 갈래 none · 소리 줄 없음 |
| v2-l3-nospeech | 들리지 않음 | 지남 | 되풀이 · 제안 · 알맞은 응답 비움, 카드 항목 more 2 |
| v2-l3-closing-suggest | 카드 기회 다 다룸 + 마무리 제안 | 지남 | 갈래 closing |
| v2-l3-closing-early | 다 다루지 않은 턴의 마무리 | 걸림 | 갈래 none |
| v2-l3-model-offband | 범위 밖 따라 할 말 | 지남 | 카드 들려줄 말 'The weekend.' · 꺼낸 새 단어 1 |
| v2-l4-ai | 4단계 AI 차례 | 걸림 | 카드 항목 none · 노린 목표 1 · 꺼낸 새 단어 0 · 따라 할 말 빈 값 |
| v2-l5-mission | 5단계 미션 | 지남 | 미션 1 · 갈래 mission · 쓸 수 있는 말 3 · 뜻 빈 값 |
| v2-l5-closing | 5단계 끝맺음(talk_closing) | 걸림 | 다음엔 이렇게 1 · 끝인사 뜻 빈 값 · 잘한 말 2 |

## 시험 이름(AC 번호)

`tests/unit/talk-lesson-call.test.ts`(25): AC-15c 새 칸 · 차례 · 판정 칸 없음 · 두 목적 같은 규격 / AC-19d 스키마 글 선생님 무관 / AC-19d 고정부 선생님 블록 · 블록 밖 같음 / 고정부 수는 설정에서(없으면 던짐) / 단계별 규칙 자리 / 가변부 새 꼴 카드 · 캐시(턴이 바뀌어도 시스템 프롬프트 같음) / AC-15k 사용자 메시지 줄 차례 · 옛 줄 없음 / AC-15c 사용자 메시지의 힌트 종류 · 아직 '안다'가 아닌 단원 단어 · 까닭 · 받침 · 막힌 질문 / AC-15k 첫 턴 이름표 · 앞 턴 짝 글자 그대로 · 바뀐 값만 / AC-15k 바뀐 값 셈 / AC-15k 다시 쓸 선생님 차례 / AC-15c 목표 ID 걸러 냄 / AC-15c 카드 항목 / AC-15c 꺼낸 새 단어 / AC-15c 범위 밖 따라 할 말 / AC-15c 선택지 꼴 / AC-15c '모름' 턴 미션 · 제안 / 카드 자리 · 마무리 자리 · 평가 대화 다음 질문 칸 비움 / 4단계 소리 줄 · 10단계 힌트 / 그림 낱말 / 회화 plan 정한 것 11 / 열거값 다듬기 · null / AC-15d 끝맺음 정규화 / AC-15b 출력 검사 칸 · 걸린 칸 바꾸기 / 회화 plan 정한 것 19.

`tests/contract/ai-schemas.test.ts` 새 describe '회화 수업 턴 새 꼴 계약 표본'(4): AC-15c 표본 덮기 / AC-15c 엄격 · 정규화 기대 / AC-15c 응답 본문 칸 차례 · 판정 칸 없음 / 회화 plan 정한 것 11. 기존 '9절 계약' 시험 셋(엄격 통과 · 개수 넘음 · 거절)도 v2 표본을 함께 돈다.

## 관문 결과(2026-10-30 09:0x, 워크트리, Node 24)

| 명령 | 결과 |
|---|---|
| `pnpm vitest run tests/unit/talk-lesson-call.test.ts` | 25 passed |
| `pnpm vitest run tests/contract/ai-schemas.test.ts` | 26 passed · 6 todo |
| `pnpm test`(단위 전체) | 133 files · 1634 passed · 6 todo, 실패 0 |
| `pnpm tsc --noEmit -p .` | 출력 없음(0) |
| `pnpm lint`(biome check) | 561 files, 고칠 것 없음 |
| `pnpm check:deps` | no dependency violations(280 modules) |
| `pnpm check:ids --fail-on …(CI 꼴) --design-number-max 49` | 종료 0(design-number 47, 이 묶음 파일은 목록에 없음) |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 종료 0 |

builders 가 깨진 상태는 이번에 만나지 않았다(단위 전체가 지났다).

## 설계와 다르게 한 것 · 해석한 것

1. **시험을 먼저 쓰지 않았다.** 모듈을 먼저 쓰고 시험을 붙였다. 대신 정규화 두 곳(정한 것 11 조건 · '모름' 턴 판단)을 일부러 깨뜨려 시험 2개가 실패하는 것을 본 뒤 되돌렸다.
2. 입력 칸을 plan 표보다 넓혔다: `goalTexts`(가변부의 목표 글) · `carryGoals`(앱 확인의 허용 범위, talk-start 스냅숏) · `lineRange`(따라 할 말 · 선택지 범위 검사 재료) · `imageWords`(그림 카탈로그, 둘째) · `turn.stuckAnswer`(따라 할 말이 걸렸을 때 바꿀 글, 사용자 메시지에는 넣지 않음). 정규화가 순수 함수로 6.1 앱 확인을 하려면 필요했다.
3. 정규화에 plan 표에 없는 정리 셋을 더했다: 카드 자리 · 마무리 자리 · 평가 대화 턴은 다음 질문 칸을 비움, '모름' 턴은 알맞은 응답 · 아이가 꺼낸 이야기 · 아이가 물음 · 제안 · 스스로 쓴 단어 · 되풀이를 비움(서버 turn.ts 의 0c664c3 되풀이 비움과 같은 결), 갈래 mission · role_swap 은 그 칸이 있는 단계 · 카드만.
4. 'Card line' 줄에 붙일 카드 질문 글까지 넣었다(연결 말을 쓰게). 'Chances' 는 다섯 줄('Chances, …' 이름표)로 나눴다. 'Floor: yes' · 돌아오기 알림에는 고정부 규칙 한 줄씩을 더했다.
5. 응답 규격 제목은 옛 꼴과 같은 `talk_turn` 이다(ai_calls 목적 이름 그대로). 계약 시험은 표본 이름 머리 `talk_turn.v2-` 로 새 규격에 보낸다.
6. 고정부 글의 '네 낱말'과 '1~4단계 · 5단계부터'(한국어 설명)는 정본 6.1 · 3.3 의 글을 영어로 옮긴 것이고 설정 키가 없어 글로 두었다(옛 꼴과 같은 방식, 흐름 판단에는 쓰지 않는다).
7. 엄격 검사(validate)는 따라 할 말 · 선택지의 범위를 보지 않는다. 범위는 정규화가 본다(lineRange 를 쓰므로).

## 묶음 3 뒤 할 것(calls/talk.ts 와 잇기)

1. `src/core/ai/calls/talk.ts`: 함께 쓰는 형 · 함수(TalkTurnSegment · TalkInputMode · TalkHintKind · TalkHeardHelp 와 그 목록, TalkTeacher · TalkHistoryEntry, teacherBlockOf · englishHintTiersOf)를 `talk-lesson.ts` 에서 가져와 다시 내보내게 바꾼다(지금은 두 파일에 같은 정의가 있다). 묶음 5 의 `src/core/conversation/lesson-turns.ts` 가 옛 talk.ts 에서 가져오는 TalkInputMode · TalkTurnSegment 도 `talk-lesson.ts` 로 바꾼다.
2. `TalkLessonCardView` · `TalkLessonSpecView` 는 묶음 3 의 `TalkCard` · `TalkLevelSpec`(지금 작업 트리의 미승인 형)에서 Pick 한 것이다. 묶음 3 이 Approved 된 뒤 고른 칸 이름(goals · todayWords.modelLine · prep · required · more · missions.goals · roleSwap)이 그대로인지 tsc 로 다시 본다. `TALK_NEXT_MOVES` · `TALK_SUPPORTS` · `TALK_CARD_ITEM_KINDS` · `TALK_LOW_BAND`(structure.ts)도 같다.
3. `tests/fixtures/ai/talk-lesson-inputs.ts` 의 손 카드는 builders 의 새 꼴 카드 빌더가 안정되면 그것으로 바꿀 수 있다(지금은 겹침을 피하려고 따로 둠).
4. 묶음 12: 옛 talk.ts · 옛 표본(talk_turn.l*-*) · 계약 시험의 옛 갈래 · `conversation-call.test.ts` 를 지우고 `TALK_V2_PREFIX` 갈래를 기본으로 한다.

## 우려

1. 이 파일은 미승인 작업물 두 곳에 기댄다: 묶음 3 의 형(위 2번)과 묶음 5 의 `src/core/conversation/question-check.ts`(`checkSoundLine` · `checkChoices` · `LowLevelLineOptions`). 둘 가운데 하나의 이름이 바뀌면 tsc 가 깨진다(묶음 5 의 lesson-turns.ts · chances.ts 도 같은 형에 기대고 있다).
2. 정본 15절 AC-19d 의 끝 문장 '1~3단계 tori_en 질문이 0'은 C189(1~3단계 AI 차례도 tori_en 에 질문)와 어긋난다. 이 묶음 시험은 그 문장을 쓰지 않았다. 정본 정리가 필요한지 컨트롤러가 본다.
3. 선택지 검사의 '노리는 단어'는 정규화한 next_targets 다. AI 가 next_targets 를 비우면 바른 선택지도 빈 값이 된다(질문만 남음 — 6.1 의 걸린 때와 같은 결과).
4. 받침 셋째 · 들리지 않음에서 1~3단계 '답을 한 번 들려주기'를 AI 의 model_line 으로 할지 앱의 카드 답 예시 소리로 할지는 서버(묶음 8)의 차례 계획이 정한다. 이 규격은 AI 차례면 model_line 을 받고, 카드 자리면 비운다.
