# 묶음 2 구현 보고 — 턴 끝 처리 · 실시간 검사(core 순수 모듈 셋 · lesson-turn.ts · closing.ts)

상태: DONE_WITH_CONCERNS(관문 0 초록 · 통합 시험은 쓰고 안 돌림 · 우려는 아래 '남은 우려').
구현자: Opus high · 2026-11-07 · 워크트리 `.claude/worktrees/p13d`(HEAD 6e86881 + 다른 묶음 미커밋) · 커밋 없음. 호출 수 불변(AI 를 더 부르지 않음).

## 바뀐 파일(워크트리 줄)

| 파일 | 줄 | 무엇을 |
|---|---|---|
| `src/core/conversation/situation.ts` | 신규 189줄 | situationPlaceOf(1~3 계획 → greeting_end · together · easy · close · nospeech · null, 들리지 않음 먼저) · answerOnlyWordsOf · checkSituationSentence((다) 금지 구 all + nospeech → (나) 답 글: 질문 글에 없는 답 예시 내용어(기능어 모음으로 가름) → (가) 어휘: 축약형 펼침 + 질문 검사 범위 + 허용 낱말, 닫힌 품사 한 낱말 통과, 범위 없으면 'range') · situationLineOf(턴 번호 돌림, 비면 null) · heardFieldsBlankOf(아홉 칸) |
| `src/core/conversation/cue-line.ts` | 신규 178줄 | CUE_PHRASES(lesson-turn 에서 옮김) · seedCuePhrasesOf · isSoundCue(신호 구는 낱말 경계, 시드 줄은 문장 전체 같음) · cueBandOf(bandOf · LEVEL_MIN, 숫자 글자 없음) · cuePlaceOf(move 의 stage · cause · sound) · cueOrdinalOf · cueLineOf(첫 것 긴 꼴, 뒤 짧은 꼴 돌림, 바로 앞과 같으면 건너뜀) · cueLinesOfMoves · cueLineForTurn · TALK_CUE_LINE_KIND |
| `src/core/conversation/made-up.ts` | 신규 23줄 | madeUpHit(normalizeSpoken · 낱말 경계, 빈 목록이면 검사 안 함) |
| `src/core/conversation/question-check.ts` | 9 · 188~227 | offbandWordsIn 내보냄 + 셋째 인자 OffbandExtra(allowed · expand). 질문 검사(인자 없음)는 그대로 |
| `src/core/seed/text.ts` | 196~232 | IRREGULAR_CONTRACTIONS · CONTRACTION_SUFFIXES 내보냄 · expandContraction(정한 것 8, core/speech 안 건드림) |
| `src/server/conversation/lesson-turn.ts` | 631(isSoundCue 다시 내보냄) · 594~800(LessonSentence 까닭 cue · made_up · situation, ai · ko 칸, LessonLiveChecks · LessonSituationChecks, 문장 문 liveDrop · lastText) · 870~890(LessonSettleLive · LessonCueLine · result.cue) · 1139~1470(settle: 둘째 인사 대신 줄 · 반응 다 지워진 상황 차례의 상황 줄 · situationKoOf · 신호 말) · 317(TalkLessonLine add kind cue) · 1511(흘림 차례 뜻 → 신호 말 → 소리 줄) · 1547 · 1565(장면 여는 질문 뜻 · 다시 흘림 신호 말) · 460~490(sceneHintItemOf · lessonHintsAt) · 1936(lessonOutcomeViewOf situation) · 2006~2075(LessonTalkLists · seedLessonTalkLists · slotQuestionTextOf · readFunctionWords · lessonCueOfRows) · 2107(replayLesson) · 2271~2700(서버 배선: 목록 deps, 기능어 읽기, feelingWords · lemmaOf, live 재료, 들리지 않음 판단 칸 비움 두 자리, 실패 상황 줄, settle live) | plan 2 행 그대로 |
| `src/server/conversation/closing.ts` | 21 · 31 · 52 · 406 · 414~432 · 534 · 594~606 | ClosingDeps(talkLists?) · farewellMadeUp(1~3 + 꼴) → 끝인사를 비워 farewellOf 의 카드 끝인사 길 |
| `src/core/conversation/log.ts` | 9 · 138 · 162 | liveTeacherEntryOf 가 add kind cue 를 뺌 |
| `tests/unit/talk-situation.test.ts` · `talk-cue-line.test.ts` · `talk-made-up.test.ts` | 신규(24 · 11 · 6 시험) | 아래 '덮는 시험' |
| `tests/integration/talk-ai-scope.test.ts` | 신규(9 시험) | CI 몫 — **안 돌림** |
| `tests/integration/talk-fixture.ts` | 258~281 | nonTextBlocksOf(AC-8 (마)) |

## 옛 시험에서 고친 줄(내 소유: plan 2 행, Edit 로 줄만)
- `tests/unit/talk-lesson-turn.test.ts` 511 · 519 · 528~530: '(나)' 1~3 AI 신호 말은 소리 줄이 있어도 지움. 666~671: AC-15k 반응의 신호 말을 신호 말 없는 문장으로(다시 쓸 차례 차례 단언 그대로). 699~700 · 774~775: text · release 에서 'Listen and say!' 빠짐.
- `tests/unit/talk-prompt-fix1.test.ts` 675~677: 신호 말 문장과 그 뜻이 빠짐.
- `tests/unit/talk-prompt-fix2.test.ts` 377 · 387: 받침 첫째도 AI 신호 말은 drop.
- `talk-lesson-stream` · `talk-log` · `talk-lesson-hints` · 통합 `talk-lesson-turn` 은 깨진 줄이 없어 고치지 않았다(새 동작은 새 파일 셋이 본다).

## 설계와 다르게 한 것 · plan 이 열어 둔 것을 정한 것
1. **실시간 검사는 '재료가 있을 때만'.** 문장 문 · settle 의 새 인자(live)는 선택이고, 없으면 상황 검사 · 지어낸 경험 · 상황 줄 · 신호 말이 없다(4단계 · 옛 시험 길). 다만 1~3 AI 신호 말 지움(cue)은 재료와 관계없이 늘 한다(브리프 '늘 지움').
2. **지어낸 경험 · 상황 검사는 물음표 아닌 문장만.** 질문은 질문 검사 · 재질문 · 카드 자리 길이 이미 맡고, 잡아 둔 질문을 지우면 '질문 없는 AI 차례'가 생긴다(AC-3 (라) '질문은 남는다').
3. **시드 신호 말 줄은 문장 전체가 같을 때만 신호 말로 본다.** 'Together!' · 'Your turn!' 같은 짧은 꼴이 'We play together!' 같은 반응을 지우지 않게 했다. 신호 구(CUE_PHRASES)는 지금처럼 낱말 경계 포함이다.
4. **신호 말 자리는 저장된 move 로 정한다(계획이 아님).** cuePlaceOf 는 move 의 stage · cause · sound 만 본다: 선택지 → 고르기, 받침 첫째 + 소리 → 같이 말하기, 그 밖 따라 할 말 → 꺼내기. 그래서 다시 흘림(lessonCueOfRows)과 대본 도구가 같은 줄을 낸다. '바로 앞 신호 말'은 자리와 관계없이 그 대화의 바로 앞 신호 말이다.
5. **답 글 검사의 질문 글 = 그 질문 자리를 연 선생님 행(opensSlot)부터 지금까지 선생님 행 text.** 장면 문장 · 받침 둘째 쉬운 질문이 든다. 기능어는 vocab 의 기능어 표시를 서버가 읽는다(readFunctionWords, 받침 · 들리지 않음 계획에 답 예시가 있을 때만 · 1~3단계만, 실패하면 빈 모음 = 더 걸림). lesson-input.ts 의 범위 읽기를 고치지 않으려고 lesson-turn.ts 에 둔 DB 읽기 하나다(AI 호출 아님).
6. **반응이 다 지워진 상황 차례의 상황 줄은 반응 자리 맨 앞.** 1~3단계는 질문을 늘 잡아 두고 이 턴은 보낸 반응이 없어 화면 차례가 맞다. 성공 응답(ok)일 때만이고, 실패 · 거절은 lessonOutcomeViewOf 가 같은 상황 줄을 쓴다.
7. **상황 줄로 바뀐 문장의 뜻.** 문장마다 뜻이고 수가 맞으면 그 자리를 상황 줄 뜻으로 바꾼다. 맞출 수 없으면 남은 문장이 모두 상황 줄일 때만 그 뜻, 아니면 뜻 없음(T2 옛 규칙 쪽으로 보수적).
8. **들리지 않음 판단 칸 비움은 1~3단계만**(정한 것 1 의 4단계 불변). 응답 받은 직후와 재질문 합친 뒤 두 자리에서 비운다. 정규화가 이미 '모름' 턴의 제안 칸을 비우지만 서버가 읽지 않는 것까지 묶었다.
9. **둘째 인사 대신 줄.** 재질문 뒤 걸리면 lessonCardSlotOf(카드 기회 질문) 대신 계획의 greetingFallback 하나를 붙인 카드 자리다(why 는 question_check · same_question · fail 그대로).
10. **'기술 오류 자리는 AI 에 보내지 않음'**: 마이크 안 잡힘 · 첫 말소리 없음 · 인식 오류 · 권한 · 읽어 주기 오류는 화면이 턴을 보내지 않는 지금 길 그대로이고 서버 입력(TurnRequestSchema)에도 그 칸이 없다. 이 묶음에서 새로 막은 길은 없다. 서버 몫은 들리지 않음 차례의 판단 칸 비움(8)이다.

## 요청하는 변경 · 다음 묶음이 이어 받을 것
- **묶음 5(talk-observe 짝)**: 도구 사본이 같은 결과를 내려면 문장 문 사본에 cue-line(isSoundCue 둘째 인자) · made-up · situation 을 잇고, settle 사본에 반응 자리 상황 줄 · situationKoOf 꼴 · cueLineForTurn · greetingFallback 을 잇는다. 서버의 LessonLiveChecks · LessonSettleLive 꼴을 그대로 쓰면 된다.
- **묶음 5 e2e**: `tests/e2e/talk-lesson.spec.ts`(474 · 503 · 635 · 764 · 831 · 916) · `required-utterance.spec.ts`(378)는 가짜 응답에 'Listen and say!' · 'Let's say it together.' 를 쓴다. 단언은 그 글을 보지 않아 깨질 줄은 못 찾았지만, 이제 그 문장은 지워지고 앱 신호 말 줄(add · cue)이 하나 더 흐른다. 말풍선 줄 수 · 읽어 주기 차례를 세는 단언이 있으면 CI 에서 걸릴 수 있다.
- **묶음 3(목록 내용)**: 3-(가) 보고의 'let 이 let's 를 덮음'과 맞췄다(expandContraction 이 let's → let · is). 허용 낱말 · 상황 줄을 바꾸면 talk-situation 시험은 견본 목록이라 영향이 없고, talk-cue-line 의 '시드 줄은 모두 신호 말로 알아봄' 하나와 talk-made-up 의 '시드 꼴이 plan 표를 가름' 하나만 실제 파일을 읽는다.

## 덮는 시험
- `tests/unit/talk-situation.test.ts`(24): situationPlaceOf 자리 · 흐름 계획 자리 · 'That's okay!' 통과(축약형) · 범위 밖 · range · 금지 구(all · nospeech) · 답 글(N-2 예 'You eat it!' 걸림 · 'Rice and fish, yum!' 남음) · 상황 줄 돌림 · AC-1 (가) heardFieldsBlankOf · 비운 응답의 move · AC-1 (나) 첫 걸림 상황 줄 · 뒤 걸림 지움 · 답 글 바뀜 · 범위 못 읽은 턴 · 반응 다 지워진 상황 줄 · 바뀐 문장 뜻 · AC-1 (라) 받침 첫째 · 둘째 · 셋째 붙일 줄 같음 · AC-1 (마) 실패 · 거절 상황 줄 · 인사 끝 카드 질문 없음 · AC-2 (가) 인사 끝 물음표 지움 · 말로 답한 AI 차례 · 4단계 검사 없음 · AC-2 (나) 둘째 인사 대신 줄 · 안 걸리면 그대로 · AC-5 (나) 장면 힌트 · 다시 흘림 뜻 · 질문 글 · 4단계 불변.
- `tests/unit/talk-cue-line.test.ts`(11): AC-6 (가) 자리 · 구간 · 긴 꼴 · 짧은 꼴 돌림 · 바로 앞 건너뜀 · 대화 차례 셈 · isSoundCue(시드 줄 문장 전체) · 시드 줄 알아봄 · 흘림 차례(뜻 → 신호 말 → 소리 줄) · text · rewrite 밖 · 둘째 짧은 꼴 · 셋째 · 들리지 않음 · 소리 줄 없음 · 꺼내기 · 다시 흘림 같은 줄 · 기록 밖.
- `tests/unit/talk-made-up.test.ts`(6): AC-3 (라) plan 표 걸림 셋 · 안 걸림 셋 · 낱말 경계 · 빈 목록 · 시드 목록 · 문장 문 지움(질문 남음 · 뜻 빠짐) · 4단계 그대로 · 끝인사 farewellMadeUp.
- `tests/integration/talk-ai-scope.test.ts`(9, CI 만 · **안 돌림**): AC-1 (가) 들리지 않음 · AC-1 (나)(라) · AC-6 (가) 받침 첫째 + 같은 시도 id 다시 흘림 · AC-1 (마) 인사 끝 실패 · AC-2 (가) · AC-2 (나)(카드 내용을 인사 턴 2 로 바꿨다가 finally 에서 되돌림) · AC-3 (가) Child said more · AC-3 (라) · AC-5 (나) Follow up · 쉬운 질문 · 힌트 · AC-8 (마) 글 블록뿐.
- 먼저 쓴 시험: 새 시험 셋은 구현과 같은 차례에 썼다. 붉음은 구현을 잠시 끈 사본(liveDrop · 반응 자리 상황 줄 · 신호 말 끔)으로 따로 확인했다: 41 가운데 10 실패 → 원본으로 되돌림(cmp 같음). 출력은 스크래치패드 `ai-scope-2-red.txt`.

## 실행 명령과 결과(전문은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-2-*.txt`)

| 명령 | 결과 |
|---|---|
| `pnpm test`(단위 전체) | 164 파일 · 2170 통과 · 6 todo · 실패 0 (`ai-scope-2-unit-all.txt`) |
| 새 시험 셋 + 고친 옛 시험 셋 | 6 파일 모두 통과(talk-situation 24 · talk-cue-line 11 · talk-made-up 6 · 옛 셋 88) |
| `pnpm lint` | 종료 0(631 파일) |
| `npx tsc --noEmit` | 종료 0(통합 시험 포함) |
| `pnpm check:ids`(CI 인자 그대로) | 종료 0 · design-number 46 ≤ 49(처음 47 — cueBandOf 의 3 을 bandOf · LEVEL_MIN 으로 바꿔 46) |
| 통합 `tests/integration/talk-ai-scope.test.ts` · 통합 `talk-lesson-turn.test.ts` | **안 돌림**(CI 몫, 이 Mac 불가) |

## 남은 우려
- **통합 시험은 한 번도 돌지 않았다.** 시험 시드 어휘(기능어 + 지어낸 낱말)에 맞춰 반응 글을 'We can do it!' 처럼 1단계 기능어로만 썼고, 기대 글은 seed-lists 읽기 함수로 꺼낸다. 그래도 CI 첫 실행에서 줄 순서 · 플래그(flashDontKnow · 힌트 JSON) 같은 단언이 어긋날 수 있다.
- **허용 목록이 좁으면 상황 줄이 는다(위험 8).** 시험 시드 · 실제 vocab 모두 'okay' 같은 낱말이 범위에 없으면 'That's okay!' 도 상황 줄로 바뀐다. 실제 1단계 vocab 에는 okay 가 있다(3-(가) 보고). 대본 회차의 '상황 줄로 바뀐 문장 수'로 봐야 한다.
- **답 글 검사의 질문 글은 화면 글 기준이다.** 1~3단계 카드 자리의 질문 줄은 text 에 들지만 소리 줄(답)은 들지 않으므로 맞다. 다만 AI 질문 자리(aiQuestion)는 그 행의 AI 반응까지 질문 글로 보아 답 글 걸림이 조금 줄 수 있다.
- **기능어 DB 읽기 하나가 받침 · 들리지 않음 턴에 더해진다**(AI 호출 아님, 범위 읽기와 나란히 시작). 첫 문장 지연 지표(AC-N2)에서 같이 본다.
- 끝인사 지어낸 경험 길은 단위(farewellMadeUp)로만 본다. 끝맺음 통합 시험은 더하지 않았다.

## 넘겨받은 항목 반영(검토 rev-1 5절 · fix 1 · fix 2 넘김, 2026-11-07)

| 넘긴 항목 | 상태 | 자리 |
|---|---|---|
| (1) greetingFallback 연결 | 이미 반영 | settle `greetingFallbackSlotOf` — 걸리면 남은 필수 질문 대신 카드 둘째 인사 질문. 시험: talk-situation 'AC-2 (나)' 둘 · 통합 'AC-2 (나)' |
| (2) feelingWords 넘기기 | 이미 반영 | lessonTurnAfterChild talkCallTurnOf(feelingWords · range.lemmaOf). 시험: 통합 'AC-3 (가)' |
| (3) 장면 여는 질문 뜻 · 힌트 | 이미 반영 | questionKoIn 의 sceneOpener 질문 · 쉬운 질문 · sceneHintItemOf. 시험: talk-situation 'AC-5 (나)' 둘 |
| (4) 인사 끝 물음표 지움 증명 | 이미 반영 | talk-situation 'AC-2 (가)' · 통합 'AC-2 (가)' |
| (5) 인사 자리 힌트 ↔ 답 짝 시험 | 이번에 더함 | talk-situation '인사 자리의 힌트와 답이 같은 질문을 가리킨다' 둘. 시드 꼴 'Hello, {NAME}! How are you?' · 답 'I am fine.' 로 흐름의 slot.answerExample · 받침 첫째 답 소리 · 서버 힌트 문장 단이 같은 칸이고, AI 가 다른 질문을 물은 자리는 카드 힌트를 쓰지 않는다 |
| 서버 인사 힌트 열쇠 어긋남(fix 2 넘김) | 이번에 고침 | `lesson-turn.ts` greetingHintItemOf: 양쪽을 `cardQuestionKeyOf`(마지막 물음표 문장)로 견준다(흐름 greetingAnswerOf 와 같은 열쇠). 붉음 확인: 옛 열쇠(글 전체)로 잠시 되돌리면 짝 시험 1 실패 → 되돌림(cmp 같음) |
| LessonHintCard.sceneOpener frameEn(fix 1 넘김) | 이번에 고침 | `frameEn?: string \| undefined` 선택 칸(0-나 꼴). index.ts 쪽 tsc 0 |
| design-number(컨트롤러 참고) | 앞서 고침 | cueBandOf 의 수 3 을 bandOf · TALK_LOW_BAND · LEVEL_MIN 으로 → 46, 제 파일 0 건 |

실행(스크래치패드 `ai-scope-2-f1-*.txt`): `pnpm biome ci` 0 · `npx tsc --noEmit` 0 · `pnpm test` 164 파일 · 2172 통과 · 실패 0 · `pnpm check:ids`(CI 인자) 0 · design-number 46. 통합 시험은 여전히 안 돌림(CI 몫).

## 설계 검토 des-3 M-2 반영(둘째 긴 꼴, 2026-11-07 — rev-2 지적과 합쳐 fix 1 로 이어짐)

- **지적:** 자리 · 구간마다 긴 꼴이 둘인데 첫 신호 말은 늘 long[0] 이었고, 둘째 긴 꼴에 닿는 길이 없었다.
- **고침(`src/core/conversation/cue-line.ts` cueLineOf · cueLinesOfMoves):** 그 자리의 첫 신호 말은 긴 꼴을 그 행의 선생님 차례 순번(대화의 몇 번째 선생님 행인가, move 차례의 자리)으로 돌려 고른다. 대화마다 첫 신호 말이 달라진다(3-(다)가 긴 꼴을 둘로 늘린 뜻). 뒤는 지금처럼 짧은 꼴 셋을 차례로 돌리고, 바로 앞과 같은 줄은 건너뛴다. 순번은 move 차례에서 나오므로 저장하지 않아도 다시 흘림 · 대본 도구가 같은 줄을 낸다.
- **정한 것:** 둘째 이후에 긴 꼴을 다시 섞지 않았다. 정본 02-2:212 '첫 신호 말은 긴 꼴, 그 뒤는 짧은 꼴'을 지키고, 긴 꼴 둘은 대화끼리 돌려 모두 쓰이게 했다.
- **시험:** `tests/unit/talk-cue-line.test.ts` '긴 꼴이 여럿인 목록' 하나. 꺼내기만 넷 이어지면 긴 꼴 첫째 뒤 짧은 꼴 셋이고, 둘째 선생님 행에서 처음 붙으면 둘째 긴 꼴이며, 시드 목록 여섯 자리 · 구간 모두 둘째 긴 꼴에 닿는다. 붉음 확인: 순번 돌림을 끄면 이 시험이 실패하고 되돌리면 통과한다(cmp 같음).
- **관문(스크래치패드 `ai-scope-2-m2-*.txt`):** `pnpm biome ci` 0 · `npx tsc --noEmit` 0 · `pnpm test` 164 파일 · 2173 통과 · 실패 0 · `pnpm check:ids`(CI 인자) 0 · design-number 46.

## fix 1(검토 rev-2 I-1 · M-1~M-4 + 설계 검토 des-3 M-2, 2026-11-07)

상태: BLOCKED(plan 정한 것 10 — 내 파일은 모두 초록이고, 끝내기 관문의 lint · tsc 붉은 줄은 묶음 5 가 쓰는 중인 파일 셋뿐이다).

| 지적 | 판정 | 고친 곳 · 시험 |
|---|---|---|
| des-3 M-2 둘째 긴 꼴(07:30 고침, 앞 보고에 빠졌던 것) | 고침 | `cue-line.ts` cueLineOf(turn) · cueLinesOfMoves(move 차례 순번): 그 자리의 첫 신호 말은 긴 꼴을 그 행이 대화의 몇 번째 선생님 행인가로 돌린다. 뒤는 짧은 꼴 셋을 돌린다(둘째 뒤에 긴 꼴을 섞지 않음 — 02-2:212). 시험 `talk-cue-line` '긴 꼴이 여럿인 목록' |
| rev-2 I-1 통합 시험의 첫 신호 말 기대 long[0] | 고침 | `tests/integration/talk-ai-scope.test.ts` 받침 첫째 시험: 기대 줄을 저장된 선생님 행 move 차례로 `cueLinesOfMoves(...).at(-1)` 에서 꺼내고, 그 줄이 together '1' 긴 꼴 목록 안에 드는지 따로 본다. 같은 가정을 둔 다른 시험을 찾았다: 단위는 견본 목록(긴 꼴 하나)이라 영향이 없고, `talk-ai-scope-contract.test.ts:189` 는 0-나 의 목록 내용 시험(고르기와 무관), e2e 에는 cue 줄 단언이 없다 |
| rev-2 M-1 상황 줄 겹침(같은 턴 · 앞 차례) | 고침 | `situation.ts` situationLineOf 넷째 인자 SituationAvoid: 돌림 차례는 그대로 두고, 이 턴에 남긴 문장과 한 문장이 같은 줄 · 이 대화 앞 선생님 행 글에 그대로 든 줄은 건너뛴다(모두 걸리면 돌림 차례 줄). 서버는 문장 문(지금까지 남긴 문장 · 앞 선생님 행 글 — LessonSituationChecks.spoken) · 반응 자리 상황 줄 · 실패 대신 줄 세 자리에서 넘긴다(teacherTextsOf). 시험 `talk-situation` 둘 |
| rev-2 M-2 시드 꼴 신호 말이 문장 전체가 아니면 안 지워짐 | 고침 | `cue-line.ts` isSoundCue: 낱말 둘 이상인 시드 꼴이 문장 앞 · 끝에 오고 나머지 낱말이 맞장구 · 이어 주는 말(CUE_FILLER_WORDS, 코드 상수) · 이름(첫 낱말 아닌 대문자 낱말)뿐이면 신호 말. 낱말 하나 꼴은 지금처럼 문장 전체만. 'Now it's your turn!' · 'Pick one, okay?' · 'Your turn, Mina!' · 'Okay, say it!' 은 지우고, 'I can say it!' · 'Can you try?' · 'Come with me!' · 'Is it your turn to play?' · 'We play together!' 는 남는다. 'come' · 'on' 은 'Come with me!' 거짓 양성 때문에 채움 낱말에서 뺐다. 시험 `talk-cue-line` 하나 |
| rev-2 M-3 가르지 않는 단언 둘 | 고침 | `talk-situation`: AI 인사 질문 자리의 답은 AI 답 예시 'Yes, I do.' 와 같음을 단언. '4단계 불변'은 4단계 계획을 상황 재료와 함께 문장 문 · 끝 처리에 돌려 상황 줄이 나오지 않고 'Zebrafish!' · 'Let's say it together.' 가 그대로 남음을 단언(상수 되읽기 지움) |
| rev-2 M-4 끝인사 배선 시험 없음 | 고침(CI 몫) | `talk-ai-scope.test.ts` 끝맺음 시험 하나: 끝맺음 기록을 넣고 runTalkClosing → talkClosingStatus. 대조군 'Bye bye!' 는 그대로, 'I remember it! Bye bye!' 는 카드 끝인사. **안 돌림** |
| (더함) 허용 낱말이 활용형을 덮지 못함 | 고침 | 묶음 5 의 넓이 시험(`talk-allowed-coverage`)이 'Let's learn some new words!' · 'Hmm, no sound! Let's keep going.' 를 범위 밖으로 잡았다. 서버 원형 표는 그 단계 이하 vocab 만 알아 4단계 낱말 word · go 의 활용형을 못 바꾼다. `question-check.ts` allowedBases 가 허용 목록에만 규칙 활용 꼬리(-s · -es · -ies · -ing · -ed · -d)를 떼어 본다. 시험 `talk-situation` 하나('swords' 는 여전히 걸림). 넓이 시험이 이제 지난다 |

범위 밖 관찰(rev-2 6절)은 고치지 않았다: 6.4 일반 검사가 바꾼 안전한 대사의 상황 차례 처리는 spec 이 정하지 않은 자리라 컨트롤러 판단 거리이고, 까닭 'together' 는 1~3 에서 더 생기지 않음을 묶음 5 에 넘긴다(5절과 같음).

### 실행(스크래치패드 `ai-scope-2-fix1-*.txt`)

| 명령 | 결과 |
|---|---|
| `pnpm test`(단위 전체) | 166 파일 · 2206 통과 · 6 todo · 실패 0(묶음 5 넓이 · 짝 시험 포함) |
| `pnpm biome ci` 내 파일 16 | 통과 |
| `pnpm biome ci`(전체) | 실패: `scripts/talk-observe.ts` · `tests/unit/talk-allowed-coverage.test.ts` · `tests/unit/talk-observe-parity.test.ts` 형식 · 가져오기 차례(모두 묶음 5) |
| `npx tsc --noEmit` | 오류 2, 모두 `tests/unit/talk-observe-parity.test.ts:723 · 759`(묶음 5). 내 파일 0 |
| `pnpm check:ids`(CI 인자) | 종료 0 · design-number 46 |
| 통합 `talk-ai-scope.test.ts` | **안 돌림**(CI 몫) |

### fix 1 더함 — 허용 낱말 대조는 모든 단계 원형 찾기(컨트롤러 결정 (나), 묶음 5 넓이 시험 · `ai-scope-5-probe.txt`)

- **고침:** `question-check.ts` OffbandExtra.allowedLemmaOf(표기형 → 원형). 허용 낱말 대조만 표기형 그대로 또는 이 원형으로 하고, 범위 판정(allowedWords · lemmaOf)은 그대로다. `situation.ts` SituationCheckContext.allowedLemmaOf 로 넘긴다. 서버(`lesson-turn.ts` readAllowedLemmaOf)는 허용 낱말인 vocab 행의 활용형을 단계와 관계없이 읽어 lemmaLookup 으로 잇는다(허용 낱말 수만큼의 행, 상황 차례 계획일 때만 범위 읽기와 나란히, 읽지 못하면 null). 예: word(4단계) → words, go(3) → going, keep(4) → keeping.
- **사전이 없는 길:** allowedLemmaOf 를 넘기지 않으면(대본 도구 · 넓이 시험 · 순수 시험) 앞 fix 의 규칙 꼬리 떼기(allowedBases)를 쓴다. 넓이 시험은 지금 이 길로 초록이다. 사전을 넘기면 사전만 보고 꼬리 떼기를 하지 않는다.
- **묶음 5 에 넘김:** 대본 도구가 서버와 같은 결과를 내려면 `talk-observe` 사본도 모든 단계 vocab 으로 같은 사전을 만들어 allowedLemmaOf 로 넘겨야 한다(꼬리 떼기와 사전은 'news' 같은 낱말에서 다를 수 있음). 넓이 시험도 같은 사전을 넘기면 서버 길을 그대로 잰다.
- **시험:** `talk-situation` '컨트롤러 결정 (나)' 하나. 실제 `seed/vocab.json` 과 시드 허용 목록으로 서버와 같은 사전을 만들고, 1단계 · 3단계 범위에서 'Let's learn some new words!' · "Let's keep going." 이 허용으로 지나며 'swords' 는 범위 밖이고 사전이 원형을 모르면 'words' 가 걸림을 본다. 붉음 확인: 사전 대조를 끄면 이 시험이 실패하고 되돌리면 통과한다(cmp 같음).
- **관문(`ai-scope-2-fix1b-*.txt`):** `pnpm test` 166 파일 · 2207 통과 · 실패 0(넓이 시험 포함) · 내 파일 biome · tsc 0 · `pnpm check:ids`(CI 인자) 0 · design-number 46. 전체 biome ci · tsc 의 붉은 줄은 앞과 같은 묶음 5 파일 셋(`scripts/talk-observe.ts` · `talk-allowed-coverage.test.ts` 형식 · `talk-observe-parity.test.ts` 형식 · 타입 2)뿐이다.

## fix 2(재검토 rev-2 fix 1 — N-1 Important · N-2 Minor, 2026-11-07)

상태: BLOCKED(plan 정한 것 10 — 내 파일 · 단위는 초록이고, 전체 biome ci · tsc 붉음은 묶음 5 파일뿐이다).

| 지적 | 판정 | 고친 곳 |
|---|---|---|
| N-1 끝맺음 통합 시험의 걸림 예 'I remember it!' 이 시드 꼴('i remember when' · 'i remember my')에 안 걸림(M-4) | 고침 | `tests/integration/talk-ai-scope.test.ts` 끝맺음 시험: 걸림 예를 'I remember my fish! Bye bye!' 로 바꿨다. 시험 안에서 먼저 시드 목록(seedTalkMadeUpPhrases)으로 그 글은 걸리고 대조군 'Bye bye!' 는 안 걸림을 단언한 뒤 카드 끝인사로 바뀌는지 본다(목록 내용이 바뀌면 전제 단언이 먼저 실패해 까닭을 드러냄). **안 돌림**(CI 몫) |
| N-2 허용 낱말 대조가 서버(사전)와 도구 · 넓이 시험(꼬리 떼기)에서 갈림 | 일부 고침 · 나머지 묶음 5 | 사전 만들기를 core 순수 함수 `allowedLemmaOfVocab(어휘 행, 허용 낱말)`(`situation.ts`)로 빼고 서버 readAllowedLemmaOf 가 그것을 부른다. 대본 도구 · 넓이 시험은 `seed/vocab.json` 행을 같은 함수에 넣으면 서버와 같은 사전이 된다. 도구 · 넓이 시험 · 짝 시험('news' 꼴)에 넣는 일은 묶음 5 파일이라 손대지 않았다. 시험: `talk-situation` '결정 (나)' 시험이 이 함수로 사전을 만들고 words → word · going → go · 허용 아닌 swords 는 없음을 본다 |

범위 밖 관찰(채움 낱말 'is' · 'it' 때문에 AI 질문 'Is it your turn?' 이 신호 말로 지워짐)은 검토자가 지적으로 두지 않아 고치지 않았다. 대본에서 신호 말로 지운 질문이 나오면 CUE_FILLER_WORDS 부터 본다.

| 명령 | 결과 |
|---|---|
| `pnpm test`(단위 전체) | 166 파일 · 2207 통과 · 6 todo · 실패 0 |
| `pnpm biome ci` 내 파일 16 | 통과 |
| `npx tsc --noEmit` | 내 파일 0. 오류 2 는 `tests/unit/talk-observe-parity.test.ts`(묶음 5) |
| `pnpm biome ci`(전체) | 실패: `scripts/talk-observe.ts` · `tests/e2e/talk-lesson.spec.ts` · `tests/unit/talk-allowed-coverage.test.ts` · `tests/unit/talk-observe-parity.test.ts`(모두 묶음 5) |
| `pnpm check:ids`(CI 인자) | 종료 0 · design-number 46 |

출력: 스크래치패드 `ai-scope-2-fix2-*.txt`.
