# 코드 검토: 회화 plan 묶음 8 — 서버 턴 길(rev-talk-8 · Opus · xhigh, 2026-11-05)

판정: **Changes requested**(Critical 0 · Important 2 · Minor 7). fix 1 을 권한다. Important 둘은 1~3단계 AI 소리 줄의 겹침 없애기(02-2:204, T2)가 빠진 것과, 1~3단계 인사 질문 자리에 '힌트' 단이 없는 것이다(컨트롤러 추가 물음, I-2). 한 턴의 차례 · 파일 나눔 · 끝맺음 새 갈래 · 참여 완료는 설계대로다.

검토 범위: 보고가 적은 파일(`lesson-turn.ts` · `lesson-input.ts` 전문, `turn.ts` · `closing.ts` · `server/ai/talk.ts` · `route.ts` · `talk-fixture.ts` 의 diff, 새 시험 셋). '5-다' fix 2 파일과 묶음 9 의 `index.ts` 는 범위 밖이다. 전체 시험은 다시 돌리지 않았다. 구체적 의심 넷은 스크래치패드 스크립트(tsx · react-server 조건, 워크트리는 바꾸지 않음)로 재현했고, 출력은 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/r8/probe-out.txt` · `probe2-out.txt` 다.

## 1. 설계 준수

| 브리프 항목 | 판정 | 근거(파일:줄은 워크트리 p13d) |
|---|---|---|
| 할 것 1 새 갈래는 new 카드만 | ✅ | `turn.ts:701~719` 가 `sessionCardKindOf`(프로필로 거름, 642~659)이 "new" 일 때만 `runTalkLessonTurn` 으로 보낸다. 옛 갈래 본문은 옮긴 상수의 다시 내보내기 밖에 그대로다 |
| 할 것 2 (가) 한 턴의 차례 | ✅(I-1 제외) | 상태(`lesson-turn.ts:1345`) → 흐름 계획(1555~1566, prepWords 는 state.prepWords 303) → 호출 입력(1606~1623) → 사용자 메시지(1625) → 흘려 받기 · 문장 문(1633~1668: 1~3단계 잡아 둠 587~589, 그 차례 질문 909, asked = position.askedQuestions 1637) → stuck 으로 고름(561 · 1677) → 카드 자리 · 붙일 줄 · 겹침 없애기(951~979) → move(996~1018) → 저장(1748~1815). 같은 질문 열쇠는 '5-다'의 cardQuestionKeyOf 와 같은 questionKeyOf 꼴이다(question-check.ts:20 · 64). AI 소리 줄 겹침 없애기가 빠진 것은 I-1 |
| 힌트 단(정본 02-2:206 · 4절 03:97 · 99) | ❌ | 1~3단계 인사 질문 자리에 단이 없다(I-2) |
| 할 것 3 (나) text · move.sound · tori_ko | ✅ | text 는 lessonTextOf(813~821, 소리 줄은 783 에서 뺌), 소리 줄은 move.sound(1009~1017 · lesson-flow.ts:1025), tori_ko 는 lessonToriKoOf(988) |
| 할 것 4 (다) 참여 완료 | ✅ | completeTalk(`closing.ts:279~`)는 진행일 때만 바꿔 세션마다 한 번이고, 다시 하기면 친한 정도를 올리지 않는다. 턴 길은 closingAnswered 가 새로 참일 때만 부른다(`lesson-turn.ts:1796~1808`). 단추 길 · aborted 는 묶음 9 가 부른다(index.ts 2899 · 3019 · 3035) |
| 할 것 5 (라) 끝맺음 새 갈래 | ✅ | runTalkClosing · talkClosingStatus 가 readTalkAnyState 로 가른다(`closing.ts:581~597` · 689). lessonClosingCall(503~)은 턴 길과 같은 입력 함수를 쓴다. ending → insertLessonClosing → schedule 은 묶음 9 가 부른다 |
| 할 것 6 (마) 실패 길 | ✅ / M-5 | 1~3단계 칭찬 대사 + 카드 자리(`lesson-turn.ts:1692~1698` · 947), 4단계부터 'Oops'(1699~1706), 거절의 안전한 대사(1687~1691), 끊김(1685 · 898 · 946), 턴 앞 하루 안전 상한(1474~1496). 4단계 거절에도 카드 질문을 붙이는 것은 M-5 |
| 할 것 7 (바) 관찰 넷 | ✅ | (가) keepNext(995) · 시험 469~502. (나) 신호 말 잡기 · 지우기(601~609 · 967~975) · 시험 504~535. (다) lessonExplanationOf(1211~1224) · 부르기 전 판정(1589) · 시험 537~581. (라) lessonSoundFixedOf(`talk.ts:164~178` · 285~292) · move.app model_line(1000~1008) · 시험 둘 |
| 보정 M-4 closing.ts | ✅ | 위 할 것 5 |
| 보정 prepWords · LessonFollowCounts | ✅ | 흐름 입력 prepWords 는 303줄이다. LessonFollowCounts 는 따라 말하기 저장(index.ts, 묶음 9)만 써서 이 묶음에 부를 자리가 없다 |
| 보정 함께 쓰는 형은 talk-lesson.ts 에서 | ✅ | `lesson-turn.ts:10~19` · `lesson-input.ts:7~15` |
| 하지 않을 것 | ✅ | index.ts · '5-다' 파일 · state.ts 를 고치지 않았다. 근거 쓰기 줄이 없다 |
| server/ai/talk.ts 일반 꼴의 옛 동작 | ✅ | oldKit(`talk.ts:143~153`)이 지운 줄(옛 232~234)과 같은 값을 넘기고, soundFixed 가 없으면 기록 상태 식이 옛 식과 같다(285~292) |
| 구조: 파일 나눔과 뒤 묶음 차례 | ✅ / M-6 | 순환을 피한 나눔이 맞고(check:deps 0, 보고), 묶음 12 는 turn.ts 의 옛 본문만 지우면 된다. 다만 16 · 17 · 18 의 파일 줄과 잠금표가 새 파일을 모른다(M-6) |
| 정적 통합 시험 다섯 실행 | ⚠️ | 이 Mac 에서 돌지 않는다(보고 우려 1). 꼴은 실제 runTalkTurnRequest + 가짜 Anthropic + DB 단언이라 맞다 |

## 2. 잘한 점
- 순환을 피하려고 `lesson-input.ts` 를 따로 둔 구조가 깔끔하다. 턴 길과 끝맺음이 같은 talkLessonInputOf 를 써서 고정부 · 가변부 · 앞 턴 전문이 같고 캐시를 그대로 탄다(`lesson-input.ts:206~272`, `closing.ts:503~`). lineRange 는 정규화 검사에만 쓰여 프롬프트 글을 바꾸지 않는다(talk-lesson.ts:1076~1085).
- 흘려 받기를 StreamKit 으로 일반화하면서 옛 꼴 값을 한 줄씩 그대로 옮겨 옛 동작을 지켰다(`talk.ts:143~153`).
- 설명 판정의 던짐을 AI 를 부르기 전으로 당겨(`lesson-turn.ts:1589`) 아이 턴 가운데에서 터지지 않게 했다. hints.ts:251~255 가 까닭을 보기 전에 던지므로 앞당긴 확인이 늘 걸린다.
- 1~3단계 범위를 읽지 못하면 빈 범위로 모든 AI 질문을 걸리게 해서(1596~1605 · 1725) 검사하지 않은 질문을 보이지 않는다.
- 카드 자리로 바꾼 턴에서 AI 소리 줄 · 갈래 · AI 도움을 버리고 화면에 남은 새 단어만 남기는 규칙(833~862)이 다음 차례 들은 도움 판정과 맞물린다.
- 고아 아이 행은 splitOrphan 이 liveRows 에서 빼므로(state.ts:309~313), 같은 시도 id 로 다시 부를 때 흐름 · 기록에 아이 말이 두 번 들지 않는다.

## 3. 지적

### Critical
없음.

### Important
**I-1. 1~3단계 AI 소리 줄(따라 할 말 · 선택지)에 겹침 없애기가 없다. 잡아 둔 문장조차 빼지 않는다(T2).**
- 무엇이: 문장 문의 겹침 검사는 계획이 붙일 답 소리(soundAnswersOf, `lesson-turn.ts:514~515` · 572~582)만 본다. AI 의 model_line · choices 는 끝 처리(960~977)에서 신호 말을 지울지 정하는 데만 쓰이고, 잡아 둔 문장과 견주지 않는다. 정규화(talk-lesson.ts)에도 그 몫이 없다.
- 재현: 3단계 AI 차례 문장 "Oh, nice!" · "Do you like it?" · "I like Sunday!" · "Listen and say!" 에 choices ["I like it.", "I like Sunday."] → 'I like Sunday!' 가 release · kept · text 에 남는다(probe-out.txt 첫 줄). 아이는 선택지 ②의 답을 화면 글로 읽게 된다.
- 왜: 정본 02-2:204 "답이 든 선생님 문장을 읽고 보이는 글에서 빼는 겹침 없애기(C125)를 이 줄에도 쓴다", 브리프 할 것 2 '붙일 줄(… 소리 줄 …, 겹침 없애기 C125)', 요청자가 강조한 T2 · R2 다. 고정부가 tori_en 에 쓰지 말라고 하지만(talk-lesson.ts:739) 정본은 그 위에 앱 안전망을 둔다. 보고 우려 2 가 '잡아 둔 문장만 가능'이라 적은 몫도 구현되지 않았다.
- 어떻게: (1) settleLessonTurn 에서 sound 를 정한 뒤, held 인 문장(신호 말 밖)이 sayingAnswer(e.en, [[model, model], [c0, c1]]) 이면 dropped(reason overlap)로 바꿔 release · kept · text · rewrite 에서 뺀다. (2) 이미 보낸 문장이 겹치면 지울 수 없으니 그 사실을 남겨(예: move.app 의 표시 또는 ai_calls '검증 실패') 묶음 13 talk:observe 가 세게 한다. (3) 단위 시험: 위 재현 문장에서 잡아 둔 겹침 문장은 빠지고, 보낸 겹침 문장은 표시가 남는다. 시험을 먼저 써서 실패를 본다.

**I-2. 1~3단계 인사 질문 자리에 '힌트' 단이 없다(컨트롤러 추가 물음 — 정본이 요구함).**
- 무엇이: lessonHintsAt(`lesson-turn.ts:391~417`)은 카드 항목(필수 질문 · 더 이야기할 거리)이나 그 질문을 쓴 선생님 행의 aiQuestion 에서만 힌트를 찾는다. 인사 질문 자리는 열리고 답 예시도 인사 질문에서 가져오지만(lesson-flow.ts:180~184) item 이 none 이고, 앱이 붙인 인사 질문 행에는 aiQuestion 이 없어 lessonHintTiersOf 가 빈 단을 돌려준다(hints.ts:207~214). 그래서 새 꼴 세션의 인사 턴에는 '힌트' 단추가 없고, 같은 값을 쓰는 아이 행 hintKind · hintLevel(453~480)과 끝 줄 hints(1197)도 비고, 묶음 9 fix 1 의 힌트 단 길도 이 함수에 기댄다.
- 정본이 요구하는가: 요구한다.
  - 4절 회화 화면의 '아이 차례' 행은 말하기 버튼 옆에 '힌트' 버튼을 두고 10~12단계만 뺀다(03-화면.md:97). '힌트' 행은 숨기는 때를 카드 항목이 없는 턴의 AI 힌트가 검사에 걸린 턴으로만 적는다(03:99). 인사 토막도 같은 말풍선 칸 · 아이 차례다(03:94).
  - 6.3 카드 행은 인사(1~3단계 인사 질문)를 '그대로인 칸'으로 두고(06-시드-생성.md:30), 새 꼴 스키마도 인사 질문에 hintKo · hintEn · frameEn 을 필수 · 선택 칸으로 남겼다(src/core/seed/schema/talk.ts:128~136). 시드가 만드는 힌트 칸을 새 흐름이 읽지 않는다.
  - 옛 흐름은 인사 질문의 그 칸으로 힌트 단을 만들었고(src/core/conversation/flow.ts:385~387), 옛 e2e 가 3단계 인사 질문에서 뜻 → 영어 틀 → 영어 문장을 단언한다(tests/e2e/conversation.spec.ts:558~597). 정한 것 1 은 옛 흐름을 새 흐름으로 바꾸는 것이지 인사 힌트를 없애는 결정이 아니고, 13절에도 그런 결정이 없다.
  - 02-2:206 힌트 문단은 출처(카드 항목은 카드 것, 이어 묻기 · 따라가기 · 꺼내기는 회화 턴 출력)를 정하고 '힌트 단 수와 차례는 그대로다'로 맺는다. 인사 질문을 빼는 문장이 아니다. AC-15a 의 힌트 문장(1단계 고정 표본, 두 단)과 AC-15p('3단계 대화 턴')는 인사를 따로 적지 않아 이 물음을 직접 정하지 않는다. 판정 근거는 위 4절 · 6.3 · 옛 동작이다.
- 왜 Important: 인사는 1단계(영어를 처음 배우는 아이 자리, C151)에서 아이가 처음 영어로 답하는 차례이고 말 주고받기 수에 든다(02-2:162 · 275). 받침('잘 모르겠어요')은 있지만 정본이 준 힌트가 빠져, 옛 흐름에서 되던 것이 새 흐름에서 사라진 회귀다. 잘못된 내용을 보이지는 않으므로 Critical 은 아니다.
- 어떻게: lessonHintsAt 에서 slot.item 이 none 이고 slot.question 이 카드 인사 질문 글과 같으면(questionKoIn 과 같은 찾기, 1116~1128), 그 인사 질문을 LessonHintItem 꼴로 바꿔 item 으로 넘긴다: hintKo 는 그대로, hints 는 단계 규격 hintTiers 의 '영어 틀' 자리에 frameEn · '영어 문장' 자리에 hintEn 을 둔 차례, usablePhrases 는 빈 목록. 4단계부터 인사는 카드 첫 말 뒤가 AI 차례라 지금처럼 aiQuestion 의 AI 힌트를 쓴다(카드 첫 말 lines 는 힌트 칸이 없어 정본도 요구하지 않음). 단위 시험: 1단계 인사 자리 → 뜻 · 영어 문장, 3단계 → 뜻 · 영어 틀 · 영어 문장(카드 인사 칸의 글), lessonNextOf 의 hints 가 비지 않음. 시험을 먼저 써서 실패를 본다.

### Minor
- **M-1. 4단계부터 같은 질문으로 한 문장을 지운 뒤 다른 질문이 보내지면 한 턴에 질문이 둘이다.** `lesson-turn.ts:590~600` 이 문장마다 같은 질문만 보고 그 뒤 문장은 그대로 보내고, 끝 처리는 지운 것이 하나라도 있으면 카드 자리로 바꿔 카드 질문을 붙인다(890~893 · 951~957). 재현: 'Do you like math?'(상한) · 'What color do you like?' → text 'What color do you like?\nWhich class is hard?', move card_slot(probe-out.txt 둘째 줄). 정본 02-2:190 카드 자리는 '질문 문장은 지운다', 200줄은 걸린 질문을 지우고 카드 자리로 바꾼다고 적는다. 고정부가 질문 하나를 쓰게 해서 드문 길이다. 고침: 같은 질문으로 지운 뒤의 물음표 문장은 지우고(reason question), 앞서 이미 보낸 AI 질문이 남아 있으면 카드 자리로 바꾸지 않는다. 시험 하나.
- **M-2. 다시 부른 시도의 stuck 을 받지 않는다.** createLessonSentenceFlow 의 stuck 은 첫 값만 받는다(`lesson-turn.ts:564~566`). 흘려 받기는 시도마다 다시 알리고(`talk.ts:425~431`), 다시 부름은 lesson 흐름에 문장이 하나도 닿지 않았을 때만 일어난다(talk.ts:520~531 firstSentenceSent). 그래서 덮어써도 안전한데, 지금은 첫 시도의 참이 남아 최종 응답(거짓)과 다른 막힘 계획 · stuckPhrase · 막힘 셈이 저장된다(probe-out.txt 셋째 줄). 옛 잡아 두기는 덮어쓴다(spoken.ts:85~87). 고침: 늘 덮어쓰고(주석 528 '시도마다 한 번'과 맞춤) 시험 하나.
- **M-3. 4단계부터 끊긴 턴에 보낸 질문이 있어도 다음 차례 힌트가 카드 항목 것이 된다.** 값이 없으면 aiMoveOf 가 빈 값을 돌려(`lesson-turn.ts:839`) teacherMoveOf 가 계획의 item 을 쓰고(lesson-flow.ts:1013), 받침 계획은 막힌 자리의 카드 항목을 든다(lesson-flow.ts:812). 재현: 받침 둘째 AI 차례가 'Is math easy for you?' 를 보낸 뒤 끊김 → move.item · 다음 자리 item 이 required 1(probe2-out.txt) → lessonHintsAt(391~417)가 그 카드 힌트를 고른다. 정본 07:60 은 '보낸 문장에 질문이 있으면 … 힌트 버튼을 보이지 않는다'이다. 받침 셋째(닫고 다음 이야기)에서는 닫은 질문의 힌트가 된다. 시험 628~640 은 보통 AI 차례만 본다. 고침: 끊김 · 질문 남음이면 item 을 NO_CARD_ITEM 으로 두고 시험 하나.
- **M-4. 제목이 말한 뜻을 단언하지 않는 시험 둘.** 단위 642~655 의 '4단계부터는 'Oops' 쉼'은 상수 글자만 본다(654). 서버 갈래(`lesson-turn.ts:1699~1706`, 선생님 행 없음 · 세션 진행)는 시험이 없다. 통합 318~334 의 '('말했다' 없음)'은 단언이 없다. 고침: 4단계 두 번 실패 통합 시험(break 줄 · 선생님 행 없음 · 아이 행 남음)과 '말했다' 단언(saidWords 빈 목록).
- **M-5. 4단계부터 거절에도 카드 질문을 붙이는데 '다르게 한 것'에 없다.** 947줄이 단계와 관계없이 한 줄 결과를 카드 자리(fail)로 바꾼다. 정본 07:60 은 거절 뒤 '1~3단계는 그 턴을 카드 자리로 보아 카드 질문을 붙인다'만 적는다. 질문 없는 차례를 남기지 않는 정한 것 18 의 뜻과는 맞으므로, 해석 3 과 함께 컨트롤러가 확인할 항목으로 장부에 둔다(4단계는 둘째 프리뷰).
- **M-6. plan 파일 표 · 잠금표에 새 파일 둘이 없다.** 새 흐름 본문이 `lesson-turn.ts` · `lesson-input.ts` 로 갔는데, 묶음 16 · 17 · 18 행(plan 197 · 199 · 201줄)과 잠금표(장부 T-19)는 turn.ts 만 적는다. closing.ts 가 lesson-input.ts 를 가져오므로 16 · 18 이 겹칠 수 있다. 고침: 잠금표에 lesson-turn.ts(8 · 12 · 16 · 17 · 18) · lesson-input.ts(8 · 16 · 18)를 더하고 그 묶음 브리프에 적는다(컨트롤러 장부 몫).
- **M-7. 받침 둘째 번호의 셋째 사본.** `lesson-turn.ts:158` SUPPORT_STAGE_EASY = 2 는 lesson-flow STAGE_EASY · talk-lesson.ts 와 같은 값의 셋째 사본이다(T-67 이 앞의 둘을 묶음 12 정리로 둠). 묶음 12 정리 목록에 이 줄을 더한다.

## 4. 우려 · 컨트롤러 물음 판정
- **해석 3(끊김 · 실패 길의 대신 질문): 닫힘(잠정).** 07:60~61 과 어긋나지 않는다. 두 행은 '가장 앞의 남은 기회의 카드 질문'만 적고 기회가 없을 때를 정하지 않는다. 3.3 의 '붙일 것이 없으면 AI 차례로 둔다'를 실패 길에 쓰면 AI 글이 없어 질문 없는 차례가 되므로, 정한 것 18 의 뜻대로 넓힌 해석이 맞다.
- **우려 1: 닫힘.** 컨트롤러 판정('5-다' fix 1 I-A)대로다. 이 묶음은 흐름의 closingAnswered · 위치만 읽어(1796~1800) 따로 고칠 것이 없다.
- **우려 2(goalTexts): 아직 열림. 장부 T-75 의 '개정 3 적재 뒤 채워짐'은 맞지 않다.** 적재기는 단원 규격 행에 목표를 담지 않는다(load.ts:324~336 의 행 값 · 246~261 의 해시 몸통에 goals 가 없고, unit_specs 열에도 없다). 읽는 이음매(talkLessonInputOf 의 goalTexts 인자, `lesson-input.ts:215`)는 맞지만 부르는 두 곳(`lesson-turn.ts:1616`, `closing.ts:509`)이 넘기지 않는다. 그래서 개정 3 을 적재해도 가변부는 'G1: -' 꼴 그대로다(talk-lesson.ts:771~774). 적재 스키마 · 읽기 함수 · 두 부름을 한 묶음으로 맡겨야 한다. 첫 프리뷰에서 AI 가 목표 뜻 없이 next_goal · goal_suggest 를 고르게 되므로 프리뷰 전에 정할 일이다(묶음 8 밖의 Important 후보, 컨트롤러 판단).
- **우려 3(시험 먼저 아님): 부분적으로 충분.** 깨뜨려 본 규칙 일곱 · 흘려 받기 둘은 그 규칙을 지킨다. 다만 이번에 찾은 I-1 · M-1~M-3 은 모두 시험이 없던 자리이므로, fix 1 은 시험을 먼저 써서 실패를 본다.
- **우려 4(koExplainFromStuck 칸 없음): 닫힘.** 보고 우려 4 에 적혀 있다. 일반 Error 라 isConfigError 에 들지 않고 error 줄로 끝난다(`lesson-turn.ts:1440~1443`). 아이 행은 이미 저장되어 같은 시도 id 로 다시 와도 같은 오류지만, 새 판 규격 행만 쓰는 동안은 생기지 않으므로 컨트롤러 판정대로 둔다.
- **'AI 쉬는 중' 관계:** 턴 앞은 하루 안전 상한만 본다(1474, 옛 길과 같고 보고 '다르게 한 것' 10 에 적힘). 나머지 까닭은 아래 범위 밖 관찰 첫 줄이다.
- **묶음 9 가 넘긴 것: 닫힘.** runTalkClosing 새 갈래는 이 묶음이 넣었다(`closing.ts:581~597`). 서버 액션 감싸기 · page.tsx 잇기는 묶음 11 이다.

## 5. 범위 밖 관찰
- ai_status 를 읽는 코드가 src 에 없다(표 정의 operations.ts:146 뿐). 그래서 까닭 (2) 콘솔 한도 · (3) 이어진 실패 · (4) 계정 확인의 'AI 쉬는 중'을 턴 길이 알지 못하고 턴마다 AI 를 부른다. 1~3단계는 그때 칭찬 대사 + 카드 질문 턴이 이어지고, 기회가 다 떨어지면 대신 질문도 상한에 걸려 질문 없는 턴이 된다(lessonCardSlotOf 701). 정본 07:45 '하던 활동 도중에 들어가면 … 같은 안내'를 맡은 묶음이 장부에 있는지 컨트롤러가 본다.
- 신호 말 목록(`lesson-turn.ts:494~501`)은 고정부가 예로만 든 신호 말('a cue like …', talk-lesson.ts:734 · 739) 밖의 말을 알아보지 못해, 소리 줄이 빈 턴에도 그 말을 그대로 보낸다. 묶음 13 talk:observe 가 알아보지 못한 신호 말을 세면 목록을 고칠 근거가 된다.
- sessionCardKindOf(`turn.ts:642~659`)가 카드 JSON 을 한 번 더 읽어 첫 문장 앞 길에 DB 왕복이 하나 늘었다. 묶음 12 가 갈래를 지우면 사라진다.
- 1~3단계는 첫 문장이 잡아 둔 질문이어도 firstSentenceMs 가 그때 찍히고(talk.ts:409~410) 다시 부름도 막힌다. 첫 문장 시간 지표(NFR-8 · plan 위험 9)를 볼 때 이 차이를 알고 본다.

## 판정
**Changes requested.** fix 1 에 I-1 · I-2 를 넣고, M-1~M-4 는 같은 파일 · 같은 시험 파일이라 함께 고치기를 권한다. I-2 를 고치면 묶음 9 fix 1 의 힌트 단 길도 인사 턴에서 단을 받는다. M-5 · M-6 · M-7 과 우려 2 는 컨트롤러 장부 몫이다. 재검토는 I-1 · I-2 와 함께 고친 항목만 범위로 한다(fix 라운드 1/3).
