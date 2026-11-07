# 묶음 1 구현 보고 — 흐름 · 고정부(talk-lesson.ts 고정부 · lesson-flow.ts · child-kind.ts)

상태: DONE_WITH_CONCERNS(관문 0 · 4단계 골든 같음 · talk-output-schema 그대로. 우려는 묶음 2 가 이어 받을 서버 몫과 1단계 선택지).
구현자: Opus high · 2026-11-07 · 워크트리 `.claude/worktrees/p13d`(HEAD 6e86881 + 다른 묶음 미커밋) · 커밋 없음.

## 4단계 골든(첫 단계에서 뜸)
- 고치기 전 코드로 `tests/fixtures/talk-prompt-l4-before.txt`(385줄)를 먼저 떴다. 내용은 4 · 5 · 10단계 시스템 프롬프트와, 4단계 흐름 계획에서 만든 사용자 메시지 다섯 꼴(인사 끝 첫 턴 · AI 차례 말 입력(If stuck 포함) · 들리지 않음 · 따라가기 상한에 닿음 · 단추 막힘)이다. 생성기는 느낌 낱말 · lemmaOf 도 넘겨 '4단계는 받아도 줄이 없음'까지 묶는다.
- 생성기를 그대로 옮긴 `tests/unit/talk-ai-scope-prompt.test.ts` 첫 시험을 고치기 전 코드에서 돌려 통과를 확인한 뒤 구현했다. 구현 뒤에도 통과한다.
- 증거: 고정 파일 shasum `0ad2d535…72d` 가 뜬 직후 사본(스크래치패드 `ai-scope-1-golden-before.txt`)과 같다. 생성기 글은 뒤에 `export` 와 형 단언(`as Parameters<…>`) 둘만 뺐다(실행 값 같음, Biome noExportsInTest).

## 바뀐 파일(워크트리 줄)

| 파일 | 줄 | 무엇을 |
|---|---|---|
| `src/core/ai/calls/talk-lesson.ts` | 24 · 146~150 · 225~236 · 312~357 · 388~390 · 501~525 · 823~899 · 904~943 · 970~1047 · 1113~1117 · 1127~1129 · 1139~1142 · 1195~1226 · 1549~1551 · 1595 · 1666~1676 · 1798 | 고정부: commonRules 의 받침 · 들리지 않음 · 인사 끝 세 줄을 `UPPER_*` 상수(4단계부터 글자 그대로)와 `lowSituationRules()`(1~3)로 가름. `TALK_SITUATION_EXAMPLES`(자리 여섯 × 예 셋, 내보냄 — 묶음 3 허용 목록 · 묶음 5 넓이 시험 재료). lowBandRules(spec, rules) 를 6.1 표 1~3 행대로 다시 씀(소리 줄 자리 · 1단계 '자주'+고르기 답은 질문 안 · 2~3 '질문만' · 말 길이 문구 · 반응 문장 수 = teacher_sentences_max − 1 · 자기 이야기 `at most once in ${selfLineEvery} turns, only when it helps.` · 지어낸 경험 금지 문구 · 상황 차례 예 + '그대로 쓰지 않음 · 되풀이 않음' · 돌아오기 · Follow up · 둘째 인사 AI 질문 · greeting_recall 켬일 때만 요약 꺼내기 · 1~3 끝인사 · 신호 말 쓰지 않음). 사용자 메시지 1~3 줄 넷 + 들리지 않음 설명 줄(`NOT_HEARD_LINE`). TalkCallTurn 선택 칸 넷 · talkCallTurnOf 선택 인자 feelingWords · lemmaOf. TalkCardLine role "scene" · cardLineText(scene · 장면 쉬운 질문). keptChoicesOf 의 이어 묻기 고르기 남김 길 지움. cardChainGuardOf followUpAnswer |
| `src/core/conversation/lesson-flow.ts` | 44 · 49 · 68~76 · 109~116 · 171 · 237~276 · 353~361 · 410~420 · 662 · 713~730 · 810~816 · 920~953 · 990~995 · 1103~1109 · 1153~1156 · 1178~1192 | `TalkFlowCard`(TalkLessonCard + sceneOpener 선택) · isSceneRow · sceneSlotOf(답 예시 · 쉬운 질문 · 1단계 선택지 · scene 표시) · appAskedBefore.scene · TeacherAttachLine role "scene" · TeacherTurnPlan 선택 칸 lowBand · returnNow · followUpAnswer · greetingFallback · firstQuestionPlan(1~3 · 준비 대기 아님 · 칸 있음 → 장면 여는 질문) · greetingPlan(1~3 둘째 인사 말로 답한 뒤 → AI 차례 + greetingFallback) · stuckPlan 둘째(장면 자리 → 그 칸 쉬운 질문) · answeredPlan(1~3 상한에 닿음 → AI + returnNow, 넘음 → follow_cap 카드 자리) |
| `src/core/conversation/child-kind.ts` | 114~134 | childSaidMoreOf(글, 느낌 낱말, lemmaOf) |
| `tests/fixtures/talk-prompt-l4-before.txt` | 신규 | 위 골든 |
| `tests/fixtures/talk-lesson.ts` | 3 · 15 · 87~106 | SCENE3 · CARD3_SCENE · CARD3_GREET2. CARD3 그대로 |
| `tests/unit/talk-ai-scope-prompt.test.ts` | 신규 11 시험 | 골든 · 4단계 설정 불변 · AC-2 (가)(라) · AC-3 (다) · 수치 문구 없음 · AC-4 (나) · 신호 말 |
| `tests/unit/talk-ai-scope-flow.test.ts` | 신규 22 시험 | AC-5 (나) 흐름 · AC-2 (나) 계획 · AC-3 (가)(나) · AC-4 (가) · 들리지 않음 설명 줄 · 기회 셈 밖 · 같은 질문 셈 안 |

## 옛 시험에서 고친 줄(내 소유: plan 1 행)
- `tests/unit/talk-lesson-call.test.ts` 1080 · 1087~1088: 1~3 신호 말 단언을 '쓰지 않음'으로.
- `tests/unit/talk-lesson-flow.test.ts` 124~143: 1~3 둘째 인사가 AI 차례 + greetingFallback. 219~238: 상한에 닿은 턴은 AI + returnNow, 한 번 더 따라가면 카드 자리(followRun 기대 +1). 256~271: 4단계 상한은 그대로 카드 자리인 시험 하나 더함.
- `tests/unit/talk-prompt-fix2.test.ts` 456~461: 1~3 받침 카드 자리 고정 예 단언을 새 줄로.
- `tests/unit/talk-prompt-fix3.test.ts` 118 · 140~141: 이어 묻기 고르기 답은 버림 · 질문 남음. 258~262: 'I couldn't hear you.' 는 1~3 에 없고 4단계에 있음.
- `tests/unit/talk-follow.test.ts`: 고칠 줄 없었다(4단계 꼴 · 통과).

## 다른 묶음 시험에 손댄 줄(plan 정한 것 10, Edit 로 줄만)
- `tests/unit/talk-prompt-fix1.test.ts`(묶음 2 소유) 176 · 188: 이어 묻기 고르기 답이 남는다 → 버린다(제목 · 기대). 490~496: 1~3 고르기 줄 새 글. 521~522: 1~3 인사 끝 줄 새 글. 모두 이 묶음이 의도한 고정부 · 거름 변화로 깨진 단언이다.

## 실행 결과(전문은 스크래치패드 `ai-scope-1-*.txt`)

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit`(단위 전체) | 161 파일 · 2125 통과 · 6 todo · 실패 0 (`ai-scope-1-unit-2.txt`) |
| 내 시험 + 닿는 시험 아홉(새 둘 · talk-lesson-call · talk-lesson-flow · talk-follow · talk-prompt-fix1~3 · talk-output-schema) | 9 파일 · 237 통과 (`ai-scope-1-own.txt`) |
| `pnpm lint` | 종료 0(624 파일) |
| `npx tsc --noEmit` | 종료 0 |
| `pnpm check:ids`(CI 인자 그대로) | 종료 0 · design-number 46 ≤ 49(0-가 뒤와 같음, 내 파일 0) |

먼저 쓴 시험: 골든 시험은 고치기 전 코드에서 초록을 확인했다. 새 동작 시험은 구현과 같은 차례에 써서 붉음을 따로 남기지 못했다. 대신 옛 단언 14건이 의도대로 붉어진 것을 확인했다(`ai-scope-1-unit-1.txt`).

## 설계와 다르게 한 것 · plan 이 열어 둔 것을 정한 것
1. **TalkCallTurn 선택 칸은 셋이 아니라 넷이다.** childSaidMore · returnNow · followUpAnswer 에 notHeard 를 더했다. 사용자 메시지 함수는 단계를 모르므로, 들리지 않음 설명 줄을 1~3단계에만 넣으려면 칸이 필요했다.
2. **TeacherTurnPlan 에 lowBand · followUpAnswer 를 더했다(plan 행 밖).** talkCallTurnOf 가 단계를 받지 않아도 1~3 줄을 가르게 하려는 것이다. 그래서 서버가 4단계에 feelingWords 를 넘겨도 줄이 생기지 않고, 골든 시험이 이것을 묶는다. followUpAnswer 는 장면 자리에 받침 뒤 말로 답한 경우도 덮는다(appAsked 는 바로 앞 행이 장면 질문일 때만 있음).
3. **CARD3 는 이미 인사가 둘이다.** 그래서 CARD3_GREET2 는 같은 칸에 이름만 따로 둔 카드다(인사 턴 2 시험이 CARD3 바뀜에 묶이지 않게).
4. **장면 여는 질문 행의 판정.** 대화 첫 질문이고 카드 항목이 없으며 그 차례 질문이 sceneOpener 의 질문 열쇠(cardQuestionKeyOf)와 같으면 장면 자리로 본다. move 꼴(5절)은 바꾸지 않았다.
5. **상황 차례 예는 내가 썼다(옮겨 적는 문구 밖).** 정본 · spec 예 'Oops, my ears! Let's go on.' · 'Good to hear! Let's learn some new words!' · 'Yay! New words time!' · "Let's talk!" 를 넣고, 나머지는 자리마다 꼴을 달리했다. 따라 하라는 말 · 질문 · 'together' 는 예에 없다(시험이 본다).
6. **1~3 받침 줄의 'say it together' 안내.** 받침 단계 설명 줄은 '앱이 답을 들려주고 신호 말을 한다'로 바꿨다. 선생님에게 같이 말하자는 말을 시키지 않는다(C207 · spec 설계 1 받침 첫째 행).

## 요청하는 변경 · 묶음 2 가 이어 받을 것
- **서버 talkCallTurnOf 호출에 feelingWords · lemmaOf 넘기기**(lesson-turn.ts 2043 근처 · talk-observe.ts 1886 근처는 묶음 5). 넘기기 전에는 'Child said more' 줄이 없다.
- **greetingFallback 쓰기**: 1~3 둘째 인사 AI 질문이 검사에 걸리면 재질문 뒤 이 줄을 붙인다. 지금 서버는 이 칸을 읽지 않는다.
- **장면 여는 질문의 뜻 · 힌트**: lesson-turn.ts questionKoIn 이 sceneOpener 질문 · 쉬운 질문을 모른다. 같은 시도 id 다시 흘림에서 뜻이 빠질 수 있다. lessonHintsAt 의 장면 힌트도 묶음 2 행에 있다.
- **인사 끝 물음표 문장 지움(AC-2 (가) 뒷부분)** 은 서버 문장 문 몫이라 이 묶음에서 증명하지 않았다.

## 남은 우려
- **1단계 장면 쉬운 질문의 선택지 둘.** 자리(slot.easyQuestion.choices)에는 담지만 붙일 줄 꼴(TeacherAttachLine)에 선택지 소리 줄이 없어 화면에 나가지 않는다. 1단계는 닫혀 있어(위험 7) 지금 아이에게 닿지 않는다. 열 때 붙일 줄 꼴을 정해야 한다.
- **예 문장의 어휘.** ears · oops · sound · listen · problem 같은 낱말이 1~3 범위 밖일 수 있다. 상황 검사(묶음 2)와 허용 목록(묶음 3)이 이 표를 돌려 정한다.
- **반응 문장 수 줄.** 'at most ${teacher_sentences_max − 1} sentences' 는 설정값을 따른다. 설정이 1 이면 0 문장이 되지만 지금 값은 3 이다.

## fix 1(검토 rev-1 I-1 · M-1 · M-2 · M-3)

상태: DONE_WITH_CONCERNS. 내 파일은 관문 0 이고 4단계 골든은 같다. 단위 전체 · lint · tsc 의 붉은 줄은 모두 묶음 2 가 고치는 중인 파일 탓이다(아래).

### 고친 것(바뀐 곳에 [I-1] · [M-n] 표지)
- **[I-1]** `src/core/conversation/lesson-flow.ts` greetingAnswerOf · slotOf: 카드 인사 답은 그 행 질문이 카드 인사 질문과 같은 질문 열쇠(questionKeyOf)일 때만 쓴다. 서버 greetingHintItemOf 와 같은 대조다. 아니면 행의 답 예시(AI 답 예시)를 쓴다. slotOf 의 인자는 차례 번호 대신 '인사 토막인가'(inGreeting)로 바꿨다. 4단계는 카드 인사 질문이 없어 길이 같다.
- **[I-1] 시험** `tests/unit/talk-ai-scope-flow.test.ts`: 옛 시험(AI 답 = 카드 답)을 AI 답 "I eat rice." ≠ 카드 답 "Yes, I do." 로 바꿨다. 새 시험 하나: AI 둘째 인사 뒤 '모름'이면 받침 첫째 소리 줄이 "I eat rice." 이고, 카드 둘째 인사 질문이 붙은 행은 카드 답 "Yes, I do." 다. 옛 코드(차례 번호로 카드 답)에서는 두 시험 모두 "Yes, I do." 를 내 붉다(검토 probe 와 같은 꼴).
- **[M-1]** `src/core/ai/calls/talk-lesson.ts` TALK_SITUATION_EXAMPLES.close: 'That's okay! Listen to this one.' → "That's okay! Here is the answer." · "No problem. I will help, and then we go on." · "It's okay! Let's go on.". 고정부 시험이 예에 listen 이 없음도 본다.
- **[M-2]** lesson-flow.ts appAsked: 장면 여는 질문 행이면 칸 글 전체(장면 문장 + 질문)를 넘긴다. 4단계 · 카드 질문 길은 그대로 마지막 물음표 문장이다. 시험의 기대도 칸 글 전체로 바꿨다.
- **[M-3]** talk-lesson.ts commonRules 따라가기 줄: 1~3단계에서만 "following it comes first: follow it for up to ${N} turns (next_move follow_child) and do not cut it short to come back to today's topic. When it is time to come back, the app says 'Come back to today's topic in this turn: yes'." 로 가른다. 4단계 줄은 글자 그대로다. 고정부 시험 하나를 더했다. 옛 시험 `tests/unit/talk-lesson-call.test.ts` 214 의 3단계 단언 줄을 새 글('follow it for up to 5 turns')로 고쳤다(설정값을 따르는지 보는 시험이라 수는 그대로 봄).

### 실행 결과(스크래치패드 `ai-scope-1-fix1-*.txt`)

| 명령 | 결과 |
|---|---|
| 내 시험 + 닿는 시험(새 둘 · talk-lesson-call · talk-lesson-flow · talk-follow · talk-prompt-fix3 · talk-output-schema) | 7 파일 · 185 통과 |
| 4단계 골든 | 고정 파일 shasum `0ad2d535…72d` 그대로 · 골든 시험 통과 |
| `pnpm biome ci` 내 파일 열하나 | 통과 |
| `npx tsc --noEmit` | 내 파일 0. 오류 47 은 lesson-turn.ts · log.ts(묶음 2 진행 중 — 없는 이름 · 타입)와, lesson-turn.ts 의 새 LessonHintCard.sceneOpener 꼴(frameEn 필수 Pick)에 걸린 index.ts 1323 · 1333 |
| `pnpm lint` | 실패: lesson-turn.ts · cue-line.ts(묶음 2) 뿐 |
| `pnpm test`(단위 전체, 다시 돌린 값) | 2117 통과 · 10 실패 · 6 todo (`ai-scope-1-fix1-unit2.txt`). 실패는 talk-lesson-turn 4 · talk-prompt-fix1 1 · fix2 1(서버 문장 문 — lesson-turn.ts, 묶음 2) · talk-observe 3 · talk-metrics 1(4-가 · 4-나). 첫 실행의 34 는 묶음 2 가 고치는 도중이었다. 내가 고친 단언 줄을 가진 시험은 모두 통과 |
| `pnpm check:ids`(CI 인자) | 종료 0 · design-number 47 ≤ 49. 늘어난 1건은 묶음 2 의 `src/core/conversation/cue-line.ts`(수 3) |

### 묶음 2 에 넘길 것(검토 5절에 더함)
- lesson-turn.ts 의 새 `LessonHintCard.sceneOpener` 가 `Pick<TalkSceneOpener, "hintKo" | "hintEn" | "frameEn">` 라 frameEn 이 필수가 되어 index.ts 1323 · 1333 이 tsc 에 걸린다. `Partial`/선택 칸으로 맞춰야 한다(내 파일 밖이라 손대지 않음).
- design-number 여유가 2건 남았다(47 ≤ 49).

## fix 2(재검토 N-1 — 인사 질문 열쇠 대조)

상태: DONE_WITH_CONCERNS. 내 파일은 관문 0 이고 4단계 골든은 같다. 남은 tsc 1 · lint 3 은 묶음 2 시험 파일이다.

### 고친 것
- **[N-1]** `src/core/conversation/lesson-flow.ts` greetingAnswerOf: 카드 쪽 열쇠를 `questionKeyOf(q.question.en)`(글 전체)에서 `cardQuestionKeyOf(q.question.en)`(마지막 물음표 문장)로 바꿨다. 이제 시드 인사 'Hello, {NAME}! How are you?' 와 행의 그 차례 질문 'How are you?' 가 같은 열쇠다. AI 가 다른 질문을 물으면 지금처럼 AI 답 예시를 쓴다.
- **[N-1] 시험** `tests/unit/talk-ai-scope-flow.test.ts` 새 describe 하나에 시험 둘을 더했다. 3단계 단원 1 카드와 같은 꼴(인사 턴 하나, 질문 'Hello, {NAME}! How are you?', 답 'I am fine.')을 쓴다. (1) 인사 '모름' 뒤 받침 첫째가 카드 자리이고 소리 줄이 'I am fine.' 이다. (2) 인사 들리지 않음이면 인사 끝 카드 자리에 답 소리 'I am fine.' 가 붙는다.
- 붉음 확인: 열쇠를 fix 1 꼴로 잠시 되돌리면 두 시험이 붉고(2 failed), 되돌려 놓으면 초록이다.

### 실행 결과(스크래치패드 `ai-scope-1-fix2-*.txt`)

| 명령 | 결과 |
|---|---|
| 내 시험 + 닿는 시험(7 파일) | 187 통과 |
| 4단계 골든 | shasum `0ad2d535…72d` 그대로 · 골든 시험 통과 |
| `pnpm biome ci` 내 파일 열하나 | 통과 |
| `pnpm test`(단위 전체) | 2164 통과 · 6 todo · 실패 0 |
| `npx tsc --noEmit` | 내 파일 0. 오류 1: `tests/unit/talk-situation.test.ts:821`(묶음 2). 내 `TalkFlowCard`(sceneOpener.frameEn 선택)를 묶음 2 의 `LessonHintCard`(frameEn 필수 Pick)에 넘겨 걸린다. 원인은 fix 1 때 적은 그 Pick 이다 |
| `pnpm lint` | 실패 3: talk-cue-line · talk-lesson-turn · talk-situation 시험의 포맷(묶음 2) |

### 묶음 2 에 넘길 것
- 서버 힌트 `lesson-turn.ts` greetingHintItemOf(502 줄)도 `questionKeyOf(g.question.en)` 으로 글 전체를 견준다. 그래서 시드 꼴 인사 질문('Hello, {NAME}! How are you?')에서는 힌트가 null 이 될 수 있다. 같은 `cardQuestionKeyOf` 로 맞추면 흐름의 답 소리와 힌트가 같은 질문을 가리킨다. 검토 5절 5번 짝 시험과 함께 보면 된다.
- `LessonHintCard.sceneOpener` 의 frameEn 은 선택 칸이어야 한다. TalkSceneOpenerSchema 가 3단계에만 frameEn 을 두기 때문이다.
