# 범위 한정 재검토: 회화 plan 묶음 12 fix 1(code-reviewer · Opus · xhigh, 2026-11-05 19:1x)

판정: **Changes requested**(라운드 2/3). 지난 지적 I-1 · I-2 (가)(나)(다) · M-1 · M-2 는 모두 ADDRESSED 다. 그러나 컨트롤러가 판정을 맡긴 구현자 우려 2 를 코드로 대조한 결과, 묶음 10 · 11 이 쓴 `tests/e2e/talk-lesson.spec.ts` 에서 CI 첫 실행에 걸릴 시험이 여섯 건이다(Important 둘, N-1 · N-2). 묶음 12 의 새 시험은 아니지만 push 전에 고쳐야 CI 가 붉지 않다.

본 것: 패치 `scratchpad/diff-12-fix1.patch`(tests 7 파일), fix 보고 `task-talk-12-fix1.md`, 부르는 서버 함수(closing.ts · lesson-turn.ts · lesson-flow.ts · question-check.ts · talk-lesson.ts · session/index.ts · lesson-list/state.ts). src · seed 가 fix 전 사본(`scratchpad/p13d-after-12/`)과 같음을 `diff -rq` 로 확인했다. 단위 `tests/unit/talk-lesson-actions.test.ts` 를 다시 돌렸다(32 통과). 1~3단계 질문 · 선택지 검사는 e2e DB 와 같은 시험용 시드 나무(devSeedTree, `scripts/dev-db.ts:487~520`)의 어휘와 저장소 형태 표로 직접 재현했다(스크립트 `scratchpad/rev12f1/probe.ts` · `probe2.ts`, 출력 `probe-out.txt` · `probe2-out.txt`). 통합 · e2e 는 돌리지 않았다.

## 1. 지난 지적 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 AC-23f 바로 보낸 1~3단계 턴 | ADDRESSED | `required-utterance.spec.ts:302~361`. 대화 첫 답의 가짜 응답에 선택지 둘과 card_item required 1 을 두고, 선택지 하나를 말한 턴을 `measuredTurn(…, { direct: true })` 로 잰다. 코드 대조: 첫 필수 질문에 말로 답한 다음 차례는 참고 턴(시험 시드 15) 전이고 따라가기 상한(2) 전이라 AI 질문 차례다(`lesson-flow.ts:881~907` answeredPlan). 선택지 노리는 단어는 card_item 에서 온다(`talk-lesson.ts:1210 · :1233~1236`, cardItemIn `:1043`). 재현: 질문 'Do you like it?' 은 checkLowLevelQuestion ok, 'I like bababa.' · 'I like it.' 은 checkChoices ok(1단계 어휘 60 낱말 · 형태 표 1단계 단원 1). 그래서 소리 줄 선택지가 남고(`lesson-turn.ts:1036~1040`), 들은 선택지와 맞아 autoSend 된다(`child-turn.tsx:463~480`). 구현자 우려 1-3(같은 질문 검사)은 앞 질문이 인사 질문 · 'What do you see?' 뿐이라 걸리지 않는다 |
| I-2 (가) 끝맺음 · 홈 진입 정리 | ADDRESSED | `talk-lesson-closing.test.ts`. runTalkClosing 은 `h.runTasks()`(:336 · :380 · :451 · :798 · :813) · 직접 부름(:480~481 · :600)으로, closeIdleTalks 는 :510~518 · :531 · :605 · :674 · :698~702, talkClosingStatus 는 :360 · :609 에서 실제로 부른다. 단언은 요청 max_tokens(:342) · talk_closing 행 하나(:352) · 요약 글(:354) · 끝맺음 상태 ready 값(:357) · {NAME} · 이름 없음 · 한글 · 상한(:384~389) · 다음 대화 요청의 최근 셋(:402~407) · 보낸 메시지 · 다시 쓸 차례 null(:457~460) · 남는 칸 같음(:461) · 두 요청이면 참 하나 · 요청 하나(:483~484) · 이른 진입 0 · 늦은 진입 1 · 다시 0(:510~522) · (다) skipped · AI 없음(:532~542) · 옛 꼴 skipped · done · none(:598~607)이다. AC-8c 의 1.5초 첫 조각 늦춤은 realtime 1초면 다시 부름이 되고 규칙이 times 1 이라 실패하므로 feedback 기다림을 가른다. 홈 진입 (가) 의 시간 거름(`closing.ts:747~765`)과 (나) 그 자리 끝맺음(`:845~852`)이 시험 기대와 맞다 |
| I-2 (나) 요청 꼴 | ADDRESSED | `talk-lesson-call.test.ts:241~511`. talkLessonTurn · talkLessonClosing 을 가짜 fetch 로 불러 요청 본문(model · effort · thinking · fallbacks · anthropic-beta · max_tokens)을 단언한다. 기대값이 지운 conversation-call 의 AC-8f 세 건(옛 :521~567)과 같다. 설정 키(ai.max_tokens.talk_turn · talk_closing · ai.timeout_seconds.* · talk.memory_summaries · talk.good_lines)는 `tests/fixtures/settings.ts` 에 있고, talk.good_lines 는 새 꼴 규격 SETTING_SCHEMAS(`talk-lesson.ts:268`)에 있어 config 시험이 실제 갈래를 지난다. 견본 넷은 `tests/fixtures/ai/samples/` 에 있다 |
| I-2 (다) 1-가 · 겹침 · 두 기기 · 마지막 턴 · AC-2c | ADDRESSED | `talk-lesson-closing.test.ts:625~823`. 1-가 첫 시험은 시작 판정 차례(resume 뒤 ai_resting, `session/index.ts:606~609`)대로 ai_resting 을 받고, 쉼 줄 · 진행 유지 · retryTurn · 다음 날 같은 id 한 행을 단언한다. 둘째 · 셋째는 skipped · tasks 0 · 쉬는 날 (나) 문(`closing.ts:837`)을 지난다. AC-2c 의 retry 판정은 '해 본 수업'(`lesson-list/state.ts:600~601` triedRef)이라 같은 수업을 다시 열면 retry 가 맞고, 옛 시험(옛 conversation-session :825~858)과 같은 차림이다 |
| M-1 따라 말하기 시도 듣기 요약 | ADDRESSED | `talk-lesson-actions.test.ts:260~286`, 짧은 준비 · 정리 두 갈래. 다시 돌려 32 통과, 먼저 실패 출력 `m1-fail.txt`(1 failed) |
| M-2 N-4 (가)(라) | ADDRESSED | `talk-lesson.spec.ts:263~271`. 'Wow, me too!' 로 바꾼 까닭이 맞다: 재현에서 3단계 'What do you do on Sunday?' 는 offband 로 걸려(시험 어휘에 sunday 없음) 잡아 둔 질문이 지워지고 카드 자리가 된다. 반응 문장은 질문이 아니라 범위 검사를 받지 않고 이미 흘러 말풍선에 남는다. 아이 차례 중에는 지금 말풍선이 아직 기록에 없으므로(`talk-frame.tsx:1262` 보낼 때만 올림) 이 단언이 pushBubbleToLog(:1340)를 가른다. ring-4 단언은 반짝임 줄이 있어야 하는데, 아이가 말한 'I see a pababa.' 가 짧은 준비 낱말 pababa 를 담아 줄이 생긴다 |

(2) `talk-lesson-turn.test.ts` 의 35줄 빠짐: 지역 `lessonAnswer` 함수를 바탕 파일 `talk-fixture.ts:155` 로 옮기고 가져오게 한 것이다. 칸 스물아홉과 차례가 글자까지 같아 뜻이 빠진 시험은 없다.

새로 깨뜨린 것: 없다(관문 biome 575 · tsc 빈 출력 · 단위 1781 통과 6 todo · check:deps 0 · check:ids 0 · spec:trace missing-test 16, fix 보고 5절과 같음).

## 2. 구현자 우려 2 판정과 새 지적

판정 근거는 두 규칙이다. 첫째, 1~3단계 AI 질문 문장과 선택지는 그 단계 이하 어휘 · 단원 단어 · 아이가 이 대화에서 말한 낱말 밖 낱말이 있으면 걸린다(`question-check.ts:166~180 · :216~227 · :251~264`, 범위 재료 `lesson-input.ts:164~201`). 걸린 질문은 화면에 나오지 않고 그 턴은 카드 자리가 된다(`lesson-turn.ts:1017~1031`). 둘째, 1~3단계 첫 막힘은 카드 답 예시가 있으면 같이 말하기 카드 자리이고, 앱이 그 답을 소리 줄 role answer 로 붙이며 AI 의 model_line · choices 는 쓰지 않는다(`lesson-flow.ts:819~826`, `lesson-turn.ts:1036 · :1179~1180` 소리 줄 kind "answer", 화면 표지 `tori.tsx:672` data-sound-listen={kind}). 둘째 규칙은 흐름 단위 시험 `talk-lesson-flow.test.ts:294` 가 단언하는 설계 동작이다.

| 줄(지금 파일) | 판정 | 까닭 |
|---|---|---|
| 243 'Sunday'(AC-15t 그만하기) | 걸리지 않음, 닫음 | 질문은 지워지고 카드 질문이 붙지만, 이 시험은 위 띠 '말 주고받기 1' 과 그만하기 · 정리만 단언한다 |
| 470 'Sunday'(AC-15f 이어 하기, 시험 459) | **걸림** | 재현 offband. `:473 · :480` 의 `toContainText(reply)` 는 응답 전문을 기다리는데 질문 문장이 화면에 없다 |
| 806 N3 선택지(시험 791) | **걸림** | 'I play tag.' 의 tag 가 3단계 어휘 · 아이 말 밖이라 offband(재현). tag 를 범위에 넣어도 next_targets · card_item 이 없어 no_target 이다(재현). 선택지가 비어 `:812` `[data-answer-listen="2"]` 가 나오지 않는다 |

같은 규칙으로 함께 걸리는 것(구현자 우려 밖, 같은 파일):

| 줄(지금 파일) | 판정 | 까닭 |
|---|---|---|
| 499 'Do you like the sea?'(AC-N8 · AC-N10, 시험 488) | 걸림 | sea 가 어휘 밖이라 offband(재현). `:505` `toContainText(reply)` 가 실패한다 |
| 671 선택지 ①②(AC-15q 2~3단계 선택지, 시험 648) | 걸림 | 첫 막힘('I don't know.' · stuck 참)이라 같이 말하기 카드 자리가 되어 AI choices 를 쓰지 않는다. 선택지 글도 go · beach · stay · home 이 어휘 밖이다 |
| 390 · 397 model 소리 줄(AC-15q · AC-15p · AC-15l, 시험 358) | 걸림 | 첫 막힘 카드 자리의 소리 줄은 kind "answer"(카드 답 예시 'I see a pababa.')라 `[data-sound-listen="model"]` 이 없고, 읽은 글에 AI model_line 'I like the beach.' 도 없다 |
| 730 model 소리 줄(AC-15q 회색 '못 들었어요', 시험 691) | 걸릴 가능성 높음 | 앞 응답 'Do you like the sea?' 가 지워져 카드 질문이 붙고, 그 자리의 첫 막힘('잘 모르겠어요')이 같이 말하기 카드 자리가 된다(카드 질문은 답 예시를 가짐). 소리 줄은 "answer" 다 |

| 번호 | 심각도 | 자리 | 근거 | 고칠 방향 |
|---|---|---|---|---|
| N-1 | Important | `talk-lesson.spec.ts:470 · :499 · :806` | 위 첫째 규칙. 1~3단계 가짜 응답의 질문 · 선택지가 시험 어휘 밖이다(재현 출력 `scratchpad/rev12f1/probe2-out.txt`) | 질문은 시험 어휘(what · do · you · like · it · see 등)와 아이가 그 대화에서 말한 낱말로 쓴다(예 'Do you like it?'). 선택지는 I-1 처럼 `I like <카드 필수 1 노리는 단어>.` · `I like it.` 과 `card_item: { kind: "required", no: 1 }` 를 둔다. 또는 말풍선 단언을 반응 문장만 보게 줄인다(뜻이 '이어 하기 · 맞장구 차례'라 질문 글이 꼭 필요하지 않다) |
| N-2 | Important | `talk-lesson.spec.ts:390 · :397 · :671 · :730` | 위 둘째 규칙. 시험이 1~3단계 첫 막힘에 AI model_line · choices 가 쓰인다고 가정했다 | 같이 말하기 소리 줄은 `[data-sound-listen="answer"]` 와 카드 답 예시(말풍선 · 기록 글에 없음, 읽은 글에 있음)로 단언한다. 선택지 ①② 시험(648)은 막힘이 아니라 말로 답한 AI 질문 차례에 범위 안 선택지 · card_item 을 두는 꼴로 바꾼다(I-1 과 같은 차림). 다시 돌 시험은 talk-lesson.spec 한 파일이다 |

## 3. 범위 밖 관찰

- 이 둘은 묶음 10 · 11 이 정적으로 쓴 e2e 의 결함이라, 이번 재현 방법(시험 시드 어휘로 checkLowLevelQuestion · checkChoices 를 돌림)을 묶음 14 전 e2e 전체 점검에 쓰면 비용이 작다. 다른 e2e 파일(required-* · teacher-window · speech-feedback)의 1~3단계 응답은 이번에 본 것만으로는 물음표 문장 · 선택지가 없어 같은 까닭으로 걸리지 않는다(전수는 아님).
- `talk-lesson.spec.ts:401` AC-15g 시험(첫 막힘 한국어 설명)도 카드 자리 차례를 지난다. 설명 칸이 카드 자리 차례에서 남는지는 이번에 확인하지 못했다(판정 보류, CI 첫 실행에서 볼 것).
- 회화 plan 증명 표에 AC-8f · AC-8c(끝맺음) · AC-16b · AC-16c 행을 더하는 일은 컨트롤러 몫 그대로다(fix 보고 4절). 시험 자리는 `talk-lesson-call.test.ts` · `talk-lesson-closing.test.ts` 다.

## 4. 라운드 판정

Changes requested(fix 2, 라운드 2/3). 고칠 파일은 `tests/e2e/talk-lesson.spec.ts` 하나다. 다음 재검토는 N-1 · N-2 의 여섯 자리와 그 fix 가 건드린 줄만 본다.
