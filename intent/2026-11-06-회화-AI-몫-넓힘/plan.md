# Plan: 1~3단계 회화에서 AI 선생님이 실제 선생님처럼 대화하는 범위를 넓힌다

spec: `intent/2026-11-06-회화-AI-몫-넓힘/spec.md`(판 4, approved) · intent: `intent/2026-11-06-회화-AI-몫-넓힘/intent.md` · 작성일: 2026-11-07 · 상태: **approved(컨트롤러 2026-11-07 06:3x, 요청자 C211 '추가 승인 없이 구현')** — 컨트롤러 결정: 정한 것 1 의 정본 문구(6.1 표 따라가기 행 · 02-2:194 · 09:78)는 '1~3단계'로 맞춘다(15번에서) · 정한 것 4 의 표본 번호 고르기는 그대로 · 0-가 완료 조건은 'CI check-ids 초록'(HEAD 6e86881 은 통과하므로 늘어난 design-number 는 원인을 적고 최소로 고침)
승인: 컨트롤러(요청자 지시 '별도의 추가 승인 절차 없이 구현과 검증으로', C211 보완) · 브랜치 · 워크트리: `feature/1a-p13d-teacher` · `.claude/worktrees/p13d`(머리 6e86881 + 정본 사본 미커밋) · 작업 장부: `.superpowers/sdd/2026-11-07-회화-AI-몫-넓힘/`(브리프 · 보고 · 검토 · progress.md). 열린 항목은 지금처럼 `.superpowers/sdd/2026-10-29-회화-수업을-대화로/ledger-open.md` 에 T 번호로 잇는다.

읽는 법: 코드 · 시드 · 시험 경로는 모두 p13d 워크트리 안이고, 이 plan · intent · 정본 원본은 본 저장소다. `02-2:194` 꼴은 정본 줄(반영 뒤), 'AC-n'은 spec 수용 기준, '설계 n'은 spec 설계 하위 절이다.

## 목표 (Goal)

최종 목표는 아이가 정해진 대본을 따라가는 것이 아니라 실제 선생님과 영어로 이야기한다고 느끼는 것이다(C211 보완). 1~3단계에서 인사 끝 · 받침 · 들리지 않음(상황 차례)의 선생님 말은 고정 예 문장 대신 AI 가 그 자리에 맞게 쓰고, 앱은 그 말에 어휘 · 답 글 · 금지 구 검사를 걸어 걸린 문장을 시드 '상황 줄'로 바꾼다(02-2:208, 06:221). 말 길이는 아이 중심이다: 짧은 반응 하나와 질문 하나가 보통 차례이고("Keep it short and easy. One short reaction and one question is the usual turn. A second sentence is allowed, not expected."), 자기 이야기는 talk.self_line_every_turns(3, 빈도 참고값)보다 잦지 않게 도움이 될 때만 쓰며, 과거 경험 · 개인 기억은 지어내지 않는다("Do not tell made-up past experiences or memories as if they were true." + 실시간 지움, 02-2:198). 따라가기 상한은 카드 자리 대신 '이번 차례에 돌아오기' 알림이고(02-2:194), 소리 줄은 받침 · 꺼내기에서만 남고(C205), 대화 첫 질문은 카드의 장면 여는 질문 sceneOpener 이며(C206, 02-2:200), 신호 말은 앱이 시드 목록에서 돌려 붙인다(C207, 02-2:212). AI 를 부르는 자리 · 회화 턴 출력 칸(6.2) · 테이블 · effort low · 단원 통과 · 승급 · 녹음 안 함은 그대로다. 증명은 분모 · 표본 · 기준선을 정한 실호출 대본 지표(설계 8)와 설계 검토자 판정이고, 대본 통과는 'iPad 검증 전'으로 적는다(C210 · C211 (5)).

## 정한 것 (plan 이 고른 것 · 설계는 바꾸지 않음)

1. **새 흐름 · 고정부 규칙은 1~3단계에만 건다.** 따라가기 상한 알림도 1~3단계만이고, 4단계부터 고정부 · 사용자 메시지 · 흐름은 고침 전과 글자까지 같다(spec 범위 밖 '4단계 이상 규칙', 원칙 대조 '4단계 이상 규칙 불변'). 정본은 6.1 표의 따라가기 행이 '모두', 3.3 따라가기 문단(02-2:194) · 12절 talk.follow_child_turns(09:78)가 단계 구분 없이 적혀, 05 사용자 메시지 문단('1~3단계는 … 이번 차례에 돌아오기')과 어긋난다. 컨트롤러가 정본 문구를 '1~3단계'로 맞추기로 정했다(2026-11-07 06:3x, 15번에서 고침). 4단계 카드가 아직 없어 지금 아이에게 닿는 차이는 없다.
2. **새 키 둘의 꼴.** talk.self_line_every_turns 는 1 이상 정수(다른 횟수 키와 같고, 2~6 은 2차 설정 화면의 입력 범위)이고, talk.greeting_recall 은 "off" · "on"(12절 '끔' = check:ids VALUE_WORDS 의 "off")이다. 시드에 false 를 넣으면 check:ids 의 setting-default 가 1건 걸린다(시드 사본으로 잰 값: "12절 기본값 "off", settings.json false"). AI 호출 규칙(talk-lesson.ts SETTING_SCHEMAS)이 읽고, 턴 입구(turn.ts turnSettings)에도 같은 규격을 펼친다. 키가 빠졌을 때 턴 입구의 SettingMissingError 로 바로 드러나게 하려는 것이다. 호출 안의 config 실패는 1~3단계에서 칭찬 대사 한 줄로 조용히 바뀌어(lesson-turn.ts lessonOutcomeViewOf) 대본에서도 화면에서도 안 보인다.
3. **장면 여는 질문 칸은 Zod 에서 선택 칸이다.** '1~3단계 새 꼴 카드의 필수'는 검증기(check-talk.ts)가 본다. Zod 필수로 두면 DB 의 개정 4 카드가 talkCardKindOf 에서 invalid 가 되어 세션이 stale 로 닫힌다. 칸이 없는 카드는 지금처럼 첫 필수 질문으로 시작한다.
4. **두 카드는 개정 5(correction 0)로 sceneOpener 칸과 예상 흐름 첫 줄만 바꾼다.** 다른 칸까지 새로 만들면 기준선 (가)와의 지표 차이가 어디서 왔는지 가를 수 없기 때문이다. 꼴 표본(카드마다 3~5개, 한국어 뜻 · 추천 까닭)을 표본 쪽으로 보이고 요청자가 번호로 고른다(spec 미결 2, 카드마다 하나는 설계 5). 답이 오기 전에는 추천 1번으로 대본을 돌리고, 다른 번호를 고르면 그 카드로 판정 대본만 다시 돈다(약 1.5달러).
5. **시드 목록 넷의 파일.** `seed/lists/talk-cue-lines.json`(신호 말: 자리 introduce · together · choices × 구간 "1" · "2-3", 긴 꼴 long · 짧은 꼴 short, 줄마다 en · ko), `seed/lists/talk-situation-lines.json`(상황 줄 lines: greeting_end · together · easy · close · nospeech 마다 en · ko, 상황 금지 구 forbidden: all · nospeech), `seed/lists/talk-allowed-words.json`(감탄 · 수업 말 allowed, 느낌 낱말 feeling), `seed/lists/talk-made-up-phrases.json`(지어낸 경험 꼴 phrases: 정규화한 구, 낱말 경계로 본다). 모두 빌드에 묶이고(next.config.ts outputFileTracingIncludes `./seed/lists/**/*.json`) DB 에 넣지 않는다.
6. **신호 말은 저장하지 않고 다시 셀 수 있게 고른다.** 자리는 그 차례 계획과 소리 줄로, 몇 번째인지는 지난 선생님 행 move(stage · app · ai · sound)로 센다. move 꼴(5절)은 그대로이고, 같은 시도 id 다시 흘림(lessonReplayLinesOf)도 같은 줄을 낸다. 흘림 줄은 `{ t: "add", kind: "cue", en, ko? }` 이고 뜻 줄 뒤 · 소리 줄 앞에 온다. 화면은 이 줄을 이미 보이고 읽는다(talk-frame onAdd → lessonBubbleStep · 읽기 w "card", 뜻은 lessonShownKoOf). 기록에서는 log.ts liveTeacherEntryOf 가 뺀다(LiveBubbleLine 의 kind 가 string 이라 화면 타입은 안 바꾼다).
7. **새 규칙 코드는 core 순수 모듈 셋에 둔다.** `src/core/conversation/situation.ts` · `cue-line.ts` · `made-up.ts` 를 서버(lesson-turn.ts)와 대본 도구(talk-observe.ts)가 같이 부른다. 도구는 서버 턴 끝 처리를 줄여 옮긴 사본을 들고 있어(T-157 · T-163 (3)) 사본을 더 늘리지 않으려는 것이다. 사본과 서버가 같은 답을 내는지는 묶음 5 의 짝 시험이 본다.
8. **축약형 펼치기는 core/seed/text.ts 의 표를 쓴다.** 시드 어휘 범위 검사가 이미 쓰는 IRREGULAR_CONTRACTIONS · CONTRACTION_SUFFIXES(resolveWord)를 내보내 상황 검사가 함께 쓴다. 'iPad 버리는 듣기'가 고칠 `src/core/speech/*`(match-rate.ts 포함)는 건드리지 않는다.
9. **기준선 (가)는 기준 워크트리에서 돈다.** 컨트롤러가 p13d 머리 6e86881 을 `git worktree add --detach` 로 띄우고(node_modules · .env.local 은 p13d 것 심볼릭 링크, 커밋 없음), 묶음 4-가 의 도구 파일 · 대본만 복사해 돌린다. 같은 폴더의 묶음 1 · 2 가 core 를 고치는 동안 '고침 전'이 섞이지 않게 하려는 것이다. 끝나면 `git worktree remove` 로 지운다. 못 띄우면 묶음 1 · 3 을 띄우기 전에 p13d 에서 돈다.
10. **같은 폴더 나란히(C142)의 규칙.** 시험 파일도 아래 표의 묶음이 주인이다. 다른 묶음이 의도한 변화로 남의 시험 줄이 깨지면 그 줄만 Edit 로 고치고(Write 금지, T-96) 보고에 적는다. 끝내기 관문(biome ci + 단위 전체)이 남의 붉은 시험만으로 막히면 내 묶음 시험 파일만 `vitest run --project unit <파일…>` 으로 돌린 결과를 붙여 첫 줄 BLOCKED 로 끝내고, 컨트롤러가 그 묶음이 끝난 뒤 관문을 다시 돌린다.
11. **check:ids 를 CI 인자로 다시 0 으로 만든다.** 지금 실패의 원인은 둘이다. (가) spec-setting-missing 2: 정본 12절에 새 키 둘이 들어갔고 seed/settings.json 에는 없다. 정본 변경이 늘린 것은 이것뿐이다. (나) design-number 77 > 상한 49: HEAD 정본으로 돌려도 77 로 같아 정본 · 새 키와 관계없다. design-number 는 seed/settings.json 의 수 값과 같은 src 수 글자를 세는데(scripts/check-ids.ts settingNumbers), 새 키는 아직 시드에 없고 넣어도 값 3 은 이미 다른 키의 값이며 "off" 는 수가 아니다(두 행을 넣은 시드 사본으로도 77). 마지막 CI 성공 ed8b8be 뒤에 바뀐 src 는 `src/app/dev/mic-probe/*` 일곱 파일뿐이고, 77건 가운데 31건이 `src/app/dev/` 아래다(probe-log.ts 21 · mic-probe.tsx 9 · speech-probe.tsx 1, 1000 ms · 8 · 10 같은 측정용 값이 ai.max_tokens.talk_turn · ai.safety_daily_calls 의 1000 따위와 겹침). 고침은 묶음 0-가 가 design-number 훑기에서 `src/app/dev/` 아래 파일을 빼는 것 하나다. 근거: 그 폴더는 운영 배포 빌드에서 빠지는 개발 도구 쪽이고(next.config.ts pageExtensions 의 preview.tsx, 가족 접근 쿠키 뒤), design-color 가 이미 같은 폴더를 DESIGN_COLOR_DEV_DIR 로 따로 다룬다(AC-23e (1)). 빼면 46 ≤ 49 라 CI 작업의 상한 49(UI · UX plan 정한 것 8)는 바꾸지 않는다. 남는 여유가 3건뿐이라 이 plan 의 묶음은 앱 코드에 수 글자를 늘리지 않는다. 잰 것(2026-11-07, p13d, 시드 사본은 스크래치패드에만): HEAD 정본 사본 + CI 인자 → 종료 1(design-number 77 > 49, spec-setting-missing 0), 지금 정본 + CI 인자 → 종료 1(77 > 49, spec-setting-missing 2), 두 행을 넣은 시드 사본 + CI 인자 → 종료 1(77 > 49, 나머지 0), 인자 없는 실행은 셋 모두 보고만 해서 종료 0 이다. 그래서 머리 줄의 'HEAD 6e86881 은 통과'는 인자 없는 실행에서만 맞고, CI check-ids 를 초록으로 하려면 dev 폴더 빼기가 필요하다.

## 옮겨 적는 문구 (묶음 1 · 2 가 쓰는 글)

| 자리 | 글 | 출처 |
|---|---|---|
| 1~3 고정부 · 말 길이 | "Keep it short and easy. One short reaction and one question is the usual turn. A second sentence is allowed, not expected." | spec 설계 3 |
| 1~3 고정부 · 지어낸 경험 | "Do not tell made-up past experiences or memories as if they were true." | 05 6.1 표 · 02-2:198 |
| 1~3 고정부 · 자기 이야기 빈도 | "… at most once in ${talk.self_line_every_turns} turns, only when it helps." (좋아하는 것 · 지금의 느낌 · 바람 · 'Let's pretend …' 상상 놀이만, 아이가 먼저 꺼낸 이야기를 잇는 것이 먼저) | 09:88 · 02-2:198 |
| 사용자 메시지(1~3, AI 차례) | `Child said more: yes` · `Child said more: no` | 02-2:198 · AC-3 (나) |
| 사용자 메시지(1~3, 상한에 닿은 턴) | `Come back to today's topic in this turn: yes`(지금 줄 `Return to today's topic:` 은 기회 알림이라 따로 둔다) | 02-2:194, 글은 이 plan 이 정함 |
| 사용자 메시지(1~3, 장면 여는 질문 답 뒤) | `Follow up on the child's answer: yes` | 02-2:200 · spec 설계 5 |
| 사용자 메시지(1~3, 들리지 않음) | `Not heard: the microphone did not get the child's voice. It is a technical problem, not the child's answer, not "don't know" and not a mistake.` | 02-2:208, 글은 이 plan 이 정함 |
| 상황 차례 예의 바탕 | 들리지 않음 'Oops, my ears! Let's go on.' · 신호 말 긴 꼴 'Listen and say it with me!' · 짧은 꼴 'Your turn!'. 자리마다 꼴이 다른 예 셋 이상은 묶음 1 이 쓰고 설계 검토 · 넓이 시험(묶음 5)이 범위를 본다 | spec 설계 1 · 6 |
| 금지 구의 바탕 | all: 'that's wrong' · 'you don't know', nospeech 더함: 'good answer' · 'you said' | 02-2:208 |

## 바뀌는 파일 (Files that change)

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 0-가 | `seed/settings.json` | 수정 | 행 둘: `{"key": "talk.self_line_every_turns", "scope": "household", "value": 3, "changeVia": "advanced"}` · `{"key": "talk.greeting_recall", "scope": "household", "value": "off", "changeVia": "advanced"}` |
| 0-가 | `tests/fixtures/settings.ts` | 수정 | TEST_SETTINGS 에 같은 두 키(check:ids fixture-setting · 통합 시험 DB) |
| 0-가 | `src/core/ai/calls/talk-lesson.ts` | 수정 | KEYS 둘 · 내보내는 `TALK_PROMPT_SETTING_SCHEMAS`(TEACHER_SENTENCES_SETTING_SCHEMAS 꼴) · SETTING_SCHEMAS 에 펼침 · TalkLessonRules.selfLineEvery · greetingRecall(읽기만 하고, 고정부에 쓰는 것은 묶음 1) |
| 0-가 | `src/server/conversation/turn.ts` | 수정 | turnSettings 에 TALK_PROMPT_SETTING_SCHEMAS 를 펼침(TurnRequestSchema 는 그대로) |
| 0-가 | `tests/unit/talk-setting-keys.test.ts` | 신규 | talkLessonTurnSpec.settingSchemas ∪ turnSettings 의 키가 모두 seed/settings.json · TEST_SETTINGS 에 있고 규격을 지난다(T-157 막기) · 시드 값으로 selfLineEvery 3 · greetingRecall 거짓 · ai.effort.talk_turn.1-3 은 "low"(AC-7) |
| 0-가 | 손으로 만든 설정 사전을 쓰는 시험(예 `tests/unit/talk-lesson-call.test.ts` 200~230) | 수정 | 두 키를 더함(빠진 키는 던짐을 보는 시험은 그대로) |
| 0-가 | `scripts/check-ids.ts` | 수정 | design-number 훑기(collectDesignNumbers)에서 `src/app/dev/` 아래 파일을 뺀다. 폴더 이름은 DESIGN_COLOR_DEV_DIR 와 같은 상수 하나로 함께 쓴다(정한 것 11). 상한 · CI 인자는 그대로 |
| 0-가 | `tests/unit/check-ids.test.ts` | 수정 | 'src/app/dev/ 아래 수 글자는 설계 숫자로 세지 않고, 그 밖 화면 소스의 같은 수는 그대로 센다' 시험 한 덩이 |
| 0-가 | `tests/unit/talk-no-audio.test.ts` | 신규 | 소리 칸(audio 등)을 더한 회화 턴 요청은 runTalkTurnRequest 가 DB 를 열기 전에 error 줄 하나로 끝낸다(TurnRequestSchema strictObject, AC-8 (마) 녹음 안 함) |
| 0-나 | `src/core/seed/schema/talk.ts` | 수정 | TalkSceneOpenerSchema(question {en, ko?} · hintKo · hintEn · frameEn? · answerExample · easyQuestion {en, ko?} · choices? [Text, Text]) · TalkCardSchema.sceneOpener 선택 칸 · textsOfTalkCard 에 그 글. talkCardKindOf 는 그대로 |
| 0-나 | `src/core/seed/schema/reference.ts` · `src/core/seed/structure.ts` · `src/server/seed-lists.ts` | 수정 | 목록 넷의 Zod 규격 · SEED_FILES 넷(talkCueLines · talkSituationLines · talkAllowedWords · talkMadeUpPhrases) · LIST_SCHEMAS 와 읽기 함수 넷(seedHomophones 꼴) |
| 0-나 | `seed/lists/talk-cue-lines.json` · `talk-situation-lines.json` · `talk-allowed-words.json` · `talk-made-up-phrases.json` | 신규 | 규격을 지나는 첫 내용(spec 예 'Listen and say it with me!' · 'Your turn!' · 'Oops, my ears! Let's go on.' 꼴). 수 · 범위 검사와 내용 마무리는 묶음 3 |
| 0-나 | `tests/unit/talk-ai-scope-contract.test.ts` | 신규 | 칸 있는 · 없는 카드가 모두 new · 목록 넷 규격 · SEED_FILES · textsOfTalkCard 의 sceneOpener 경로 |
| 1 | `src/core/ai/calls/talk-lesson.ts` | 수정 | 고정부: commonRules 의 받침(Support stage) · 들리지 않음 · 인사 끝 세 줄을 단계로 가름(4단계부터 글자 그대로) · lowBandRules 를 정본 6.1 표의 1~3 행대로(소리 줄 자리 · 1단계 '자주' · 2~3단계 '질문만' · 말 길이 · 자기 이야기 `at most once in ${N} turns, only when it helps` · 지어낸 경험 금지 · 상황 차례(자리마다 꼴이 다른 예 셋 이상, 그대로 쓰지 않음 · 되풀이 않음, 들리지 않음은 앱이 알린 기술 문제) · greeting_recall 켬일 때만 요약 꺼내기 줄 · 1~3 끝인사 · Follow up 줄 · 신호 말 쓰지 않음), 수치 · 비율 문구 없음. 사용자 메시지 1~3 줄 넷: `Child said more: yes` · `Child said more: no`(AI 차례) · `Come back to today's topic in this turn: yes` · `Follow up on the child's answer: yes` · 들리지 않음 설명 줄(`Not heard: the microphone did not get the child's voice. It is a technical problem, not the child's answer, not "don't know" and not a mistake.`). TalkCallTurn 선택 칸 셋 · talkCallTurnOf 선택 인자 feelingWords(없으면 Child said more 줄 없음) · keptChoicesOf 의 '노리는 단어 없는 이어 묻기 고르기 남김' 길 지움(FR-4) · cardChainGuardOf 가 Follow up 차례에도 required 를 되돌림 |
| 1 | `src/core/conversation/lesson-flow.ts` | 수정 | firstQuestionPlan: 1~3 이고 카드에 sceneOpener 가 있으면 수업 첫 대화 질문을 그것으로(질문 줄 role "scene", item none, AI 없음 · 대화 중 연 준비 뒤는 지금 길) · slotOf: 장면 여는 질문 자리의 답 예시 · 쉬운 질문(1단계 선택지) · stuckPlan 둘째가 그 쉬운 질문을 붙임 · answeredPlan: 1~3 은 상한에 닿은 턴을 AI 차례 + returnNow, 넘은 턴만 follow_cap 카드 자리 · greetingPlan: 1~3 둘째 인사(말로 답한 뒤만)를 AI 차례로, greetingFallback 에 카드 둘째 인사 질문 · TeacherTurnPlan.returnNow · greetingFallback · appAsked.scene · TalkLessonPosition.appAskedBefore.scene |
| 1 | `src/core/conversation/child-kind.ts` | 수정 | childSaidMoreOf(글, 느낌 낱말, lemmaOf): 영어 낱말 셋 이상이거나 느낌 낱말이 든 말 |
| 1 | `tests/fixtures/talk-prompt-l4-before.txt` | 신규 | 고치기 전 4단계 시스템 프롬프트 · 사용자 메시지(AI 차례 · 들리지 않음 · 상한 닿음 세 꼴, 첫 단계에서 뜸) |
| 1 | `tests/unit/talk-ai-scope-prompt.test.ts` · `tests/unit/talk-ai-scope-flow.test.ts` | 신규 | AC-2 (가)(라) · AC-3 (다) · AC-4 (나) · 4단계 골든 · 수치 문구 없음 / AC-3 (가)(나) · AC-4 (가) · AC-5 (나) 흐름 몫 · AC-2 (나) 계획 몫 · 장면 여는 질문은 기회 셈 밖 · 같은 질문 셈 안 |
| 1 | `tests/fixtures/talk-lesson.ts` | 수정 | 시험 카드 둘 더함: CARD3_SCENE(sceneOpener) · CARD3_GREET2(greetingTurns 2). CARD3 는 그대로 |
| 1 | `tests/unit/talk-lesson-call.test.ts` · `talk-prompt-fix2.test.ts`(고정부 단언 줄, 457 근처) · `talk-prompt-fix3.test.ts`(257 근처) · `talk-lesson-flow.test.ts` · `talk-follow.test.ts` | 수정 | 바뀐 1~3 고정부 글 · 따라가기 상한 기대 |
| 2 | `src/core/conversation/situation.ts` | 신규 | situationPlaceOf(계획 · 토막 → greeting_end · together · easy · close · nospeech · null) · checkSituationSentence((가) 축약형을 펼친 뒤 1~3 질문 검사 범위 + 닫힌 품사 한 낱말 + allowed (나) 받침 · 들리지 않음: 답 예시 내용어(어휘 시드의 기능어 표시로 가름) 가운데 질문 글(장면 문장 포함)에 없는 낱말 (다) 금지 구) · situationLineOf(자리 · 턴 번호로 돌림) · heardFieldsBlankOf(들리지 않음 차례의 stuck · child_kind · response_fit · child_topic · child_asked · goal_suggest · self_used_words · mission_done · recast 를 빈 값으로) |
| 2 | `src/core/conversation/cue-line.ts` · `src/core/conversation/made-up.ts` | 신규 | CUE_PHRASES(lesson-turn.ts 에서 옮기고 isSoundCue 는 다시 내보냄) + 시드 신호 말 구 · cuePlaceOf · cueOrdinalOf · cueLineOf(첫 것은 긴 꼴, 뒤는 짧은 꼴 돌림, 바로 앞과 같은 줄 안 씀) / madeUpHit(문장, 구 목록) |
| 2 | `src/core/conversation/question-check.ts` · `src/core/seed/text.ts` | 수정 | 범위 밖 낱말 셈(offbandWordsIn)을 허용 낱말과 함께 내보냄 / 축약형 표 · 펼치기 함수를 내보냄(정한 것 8) |
| 2 | `src/server/conversation/lesson-turn.ts` | 수정 | 문장 문(createLessonSentenceFlow): 1~3 AI 신호 말은 늘 지움(까닭 "cue") · 상황 차례 검사(첫 걸림은 상황 줄로, 뒤 걸림은 지움, 범위를 못 읽으면 모두 걸린 것으로) · 1~3 지어낸 경험 꼴 지움 / settleLessonTurn: 신호 말 한 줄(text · rewrite 밖) · 반응이 다 지워진 상황 차례는 상황 줄 / lessonOutcomeViewOf: 1~3 상황 차례의 두 번 실패 · 거절은 상황 줄(계획의 붙일 줄 그대로, 인사 끝 뒤 카드 질문 없음) / lessonAfterLinesOf · lessonReplayLinesOf 신호 말 줄 · TalkLessonLine add kind "cue" / 들리지 않음 차례 heardFieldsBlankOf / lessonHintsAt 에 장면 여는 질문 힌트 / 둘째 인사 질문 검사 실패 → greetingFallback / talkCallTurnOf 에 feelingWords / 목록 읽기(deps, seedHomophones 꼴) |
| 2 | `src/server/conversation/closing.ts` · `src/core/conversation/log.ts` | 수정 | 1~3 끝인사가 지어낸 경험 꼴에 걸리면 카드 끝인사(지금 끝인사 걸림 길) / liveTeacherEntryOf 가 kind "cue" 를 뺌 |
| 2 | `tests/unit/talk-situation.test.ts` · `talk-cue-line.test.ts` · `talk-made-up.test.ts` | 신규 | AC-1 (가)(나)(마) 단위 · AC-6 (가) · AC-3 (라). 지어낸 경험 표: 걸림('Yesterday I went to the lake.' · 'When I was little, I swam.' · 'I remember my first fish.') · 안 걸림('I like the lake!' · 'Let's pretend we are ducks!' · 'Me too!') |
| 2 | `tests/integration/talk-ai-scope.test.ts` · `tests/integration/talk-fixture.ts` | 신규 · 수정 | 가짜 클라이언트로 AC-1 (가)(라)(마) · AC-2 (나) · AC-3 (가)(라) · AC-5 (나) 서버 몫 · AC-6 (가) talk_turns 원문 · 다시 쓸 차례에 신호 말 없음 · AC-8 (마) 가짜 클라이언트가 받은 요청의 메시지가 모두 글 블록(소리 · 그림 · 파일 블록 0)(CI 만) |
| 2 | `tests/unit/talk-lesson-turn.test.ts` · `talk-prompt-fix1.test.ts` · `talk-prompt-fix2.test.ts`(문장 문 단언 줄) · `talk-lesson-stream.test.ts` · `talk-log.test.ts` · `talk-lesson-hints.test.ts` · `tests/integration/talk-lesson-turn.test.ts` | 수정 | 신호 말 · 상황 줄 · 들리지 않음 기대 |
| 3 | `src/core/seed/check-talk.ts` | 수정 | 장면 여는 질문 검사(06:186 행 그대로: 1~3 새 꼴 카드에 있음 · 물음표 문장 마지막 하나 · 첫 낱말 조동사 · be 목록(코드 상수) · 'or' 없음 · 둘 안 · 길이 · 범위 · 이름 · {NAME} 하나 · 다른 질문과 다름 · 뜻 · 답 예시 Yes · No 시작 · 쉬운 질문 · 1단계 선택지 둘 · 노리는 단어 없음) |
| 3 | `src/core/seed/check-talk-lists.ts` · `src/core/seed/reference-index.ts` | 신규 · 수정 | 목록 넷 검사(06:187 행 그대로, 꼴 수는 검사 상수) · seed:validate 에 등록 |
| 3 | `seed/lists/*.json`(넷) | 수정 | 내용 마무리. allowed 는 손으로 적지 않고 정본 · spec 의 예 문장 · 상황 줄 · 신호 말을 축약형을 펼친 범위 검사에 돌려 걸린 낱말로 만든다(us · some · word · together · hear · again · oops · yay · yum 꼴, spec N-1) |
| 3 | `seed/prompts/talk-3.md` · `seed/prompts/_template.md` | 수정 | sceneOpener 칸 규칙 · 예상 흐름 첫 줄 '장면 여는 질문 뒤 아이 말을 따라간다'(뒤 26장 생성용) |
| 3 | `seed/lessons/talk/3/1.json` | 수정 | 배정 1 · 다지기 6 두 장 개정 5(정한 것 4) |
| 3 | `tests/unit/seed-validator-talk.test.ts` · `tests/unit/talk-lists.test.ts` | 수정 · 신규 | AC-5 (가) · AC-6 (나) |
| 4-가 | `tests/fixtures/talk-observe/l3-greet-fine.json` · `l3-greet-tired.json` · `l3-greet-more.json` · `l3-scene-yes.json` · `l3-scene-no.json` · `l3-scene-other.json` · `l3-second-session.json` | 신규 | 설계 7 의 새 대본 일곱(3단계 단원 1 수업 1 · 미나). 둘째 세션은 summaries 한 줄과 대본 칸 settings `{"talk.greeting_recall": "on"}` |
| 4-가 | `scripts/talk-observe.ts` | 수정 | 대본 꼴 선택 칸 summaries · settings(그 대본만 덮음) · `--set <키>=<값>`(명령 전체, 대본 칸보다 앞섬, 메모리에서만) · `--rounds <n>` · JSON 보고에 바퀴 · 시스템 프롬프트 · 기술 오류 자리 표시. 지금 core 에 있는 것만 가져온다(기준 워크트리에서 돈다) |
| 4-나 | `scripts/talk-metrics.ts` | 신규 | 설계 8 지표 전부(대본마다 · 합계 분자 · 분모, 분모 10 아래는 건수, 기술 오류 자리 따로, 가르는 것 넷의 자동 보조 셈) · `--baseline <json>` 견줌과 기준 판정 · `--chance-alert`(기본 0.5) · 설계 검토자가 읽을 차례 목록(걸린 차례 + 첫 바퀴 전문). 저장된 보고를 다시 센다 |
| 4-나 | `scripts/talk-observe.ts` · `package.json` | 수정 | 끝에 talk-metrics 를 불러 보고에 넣음 · `--chance-alert` · `--baseline` · 명령 `"talk:metrics"` |
| 4 | `tests/unit/talk-observe.test.ts` · `tests/unit/talk-metrics.test.ts` | 수정 · 신규 | 대본 열둘 · 새 인자 · 지표 정의(고정 문장 차례 · 틀에 박힌 맞장구 꼴 · 긴 차례 ㉠㉡㉢ · 신호 말 겹침 · 기회 알림) |
| 5 | `scripts/talk-observe.ts` | 수정 | 사본 문장 문 · settleTurn 에 묶음 2 의 core 함수 잇기 · 새 목록 읽기 · feelingWords · 장면 여는 질문 힌트 · 둘째 인사 대신 줄 |
| 5 | `tests/unit/talk-observe-parity.test.ts` · `tests/unit/talk-allowed-coverage.test.ts` | 신규 | 같은 응답 · 계획을 서버(settleLessonTurn · createLessonSentenceFlow)와 도구(settleTurn)에 넣어 text · 붙일 줄 · 신호 말 · 지운 까닭이 같다 / 1~3 고정부 예 문장 · 상황 줄 · 신호 말 · 정본 예 문장이 상황 검사를 지난다(AC-1 (나) 'That's okay!' 남음) |
| 5 | `tests/e2e/talk-lesson.spec.ts` · `tests/e2e/talk.ts` · `tests/e2e/required-utterance.spec.ts` | 수정 | 장면 여는 질문 표본 · 신호 말 · 상황 줄 · 요청 수(AC-5 (나) · AC-N1 · AC-1 (다)), CI 만. Edit 로만 덩이 끝에 더한다('iPad 버리는 듣기'가 같은 도우미를 고칠 수 있음) |

안 바뀌는 파일(겹침 피함 · 증명): `src/lib/speech/*`(browser.ts · teacher.ts) · `src/core/speech/*` · `src/components/conversation/talk-frame.tsx` · `child-turn.tsx` · `follow-along.tsx` · `tori.tsx` · `src/lib/talk-stream.ts` · 회화 턴 출력 칸(talk-lesson.ts talkLessonWire, `tests/unit/talk-output-schema.test.ts` 그대로) · `src/db/schema/*` · `drizzle/*` · `src/core/conversation/move.ts` · `said.ts` · `src/core/evidence/teach.ts` · `src/core/scoring/score.ts` · `src/server/conversation/index.ts`(첫 질문 행은 계획의 붙일 줄을 그대로 쓴다. 묶음 1 구현자가 그 길을 열어 확인한다) · ai:contract 녹음 표본 `tests/fixtures/ai/samples/*` · `.github/workflows/ci.yml`(check-ids 인자 · 상한 49 그대로) · `src/app/dev/*`(마이크 점검 쪽 파일은 그 변경 단위 몫).

## 작업 순서 (Order of work)

흐름: 0-가 ∥ 0-나 ∥ 4-가 → 설정 적재 A · 기준선 (가) → 1 ∥ 3 ∥ 4-나 → 2(1 의 구현자 관문 통과 뒤) → 5 → 대본 회차 → 설계 판정 ∥ effort 견주기 → fix(3회까지) → 커밋 · push → CI → 배포 확인 → 카드 적재 C → 서버 턴 확인 D → 상태표. 묶음 2 를 1 과 나란히 띄우지 않는 까닭은 둘이 같은 옛 시험 넷(talk-prompt-fix1~3 · talk-lesson-turn)을 크게 고치고, 2 가 1 의 계획 칸(returnNow · greetingFallback · appAsked.scene · talkCallTurnOf 인자)을 받기 때문이다. 동시에 도는 에이전트는 다섯까지다.

묶음 요약(시작 조건 · 루프 · 손대지 않는 파일 · 시험 · AC):

| 묶음 | 시작 조건 | 루프 · 에이전트 | 손대지 않는 파일 | 시험(단위 · 통합 · e2e) | AC |
|---|---|---|---|---|---|
| 0-가 설정 키 둘 · check:ids | 바로 | 가벼운 루프 · 구현자 Opus high · 검토 code-reviewer Opus high(범위 한정) | 고정부 글 · 흐름 · 시드 목록 · 카드 · ci.yml · `src/app/dev/*` | 단위 talk-setting-keys · check-ids · talk-no-audio · `pnpm check:ids`(CI 인자) 종료 0 | AC-3 (다) 일부 · AC-7 · AC-8 (마) 일부 · AC-N3 |
| 0-나 계약 | 바로 | 0-가 와 같음 | 검증기 규칙 · 카드 · 서버 턴 길 | 단위 talk-ai-scope-contract · `pnpm seed:validate` | 계약(뒤 묶음의 바탕) |
| 4-가 대본 · 도구 꼴 | 바로 | 가벼운 루프 · 구현자 Opus high | `src/core/*` · `src/server/*` 전부 | 단위 talk-observe | AC-8 (가) 재료 |
| 1 흐름 · 고정부 | 0-가 · 0-나 Approved(기준 워크트리를 못 띄웠으면 기준선 (가) 뒤) | 전체 루프 · 구현자 Opus high → code-reviewer Opus xhigh → fix | lesson-turn.ts · closing.ts · 새 core 모듈 셋 · 화면 · 도구 | 단위 talk-ai-scope-prompt · talk-ai-scope-flow · 옛 시험 다섯(표) | AC-2 (가)(나)(라) · AC-3 (가)(나)(다) · AC-4 · AC-5 (나) |
| 3 검증기 · 목록 · 카드 | 0-나 Approved | 전체 루프 · 구현자 Opus high · curriculum-designer Opus xhigh · design-reviewer Fable max | `src/core/conversation/*` · `src/server/*` · 도구 · 카드의 다른 칸 | 단위 seed-validator-talk · talk-lists · `pnpm seed:validate` · `seed:load --dry-run` | AC-5 (가) · AC-6 (나) |
| 4-나 지표 | 4-가 Approved | 가벼운 루프 · 구현자 Opus high | `src/core/*` · `src/server/*` | 단위 talk-metrics · talk-observe | AC-8 (가) · AC-N2 · AC-N3 |
| 2 턴 끝 처리 | 1 의 구현자 관문 통과(검토와 겹쳐도 됨) | 전체 루프 · 구현자 Opus high → code-reviewer Opus xhigh → fix | talk-lesson.ts 고정부 · lesson-flow.ts(고칠 일이 나오면 1 의 fix 로) · 화면 · 도구 | 단위 talk-situation · talk-cue-line · talk-made-up · 옛 시험(표) · 통합 talk-ai-scope(CI) | AC-1 (가)(나)(라)(마) · AC-2 (나) · AC-3 (라) · AC-5 (나) · AC-6 (가) |
| 5 잇기 · e2e | 2 · 3 · 4-나 Approved | 전체 루프 · 구현자 Opus high → code-reviewer Opus xhigh | 앱 규칙(고칠 일이 나오면 그 묶음 fix 로 돌림) | 단위 talk-observe-parity · talk-allowed-coverage · e2e talk-lesson · required-utterance(CI) | AC-1 (다) · AC-5 (나) e2e · AC-N1 |

커밋 지점: 커밋은 요청자가 지시할 때만 한다(프로젝트 규칙). 이 plan 은 묶음마다 커밋하지 않고, 대본 판정 · fix 가 끝난 뒤 16번에서 한 번 커밋 · push 한다. 그 전의 설정 적재 A 는 DB 쓰기라 커밋과 무관하다.

1. [설정] **묶음 0-가 설정 키 둘 · check:ids**(구현자 Opus high · 가벼운 루프: 검토 code-reviewer Opus high 범위 한정, Minor 는 컨트롤러). AC-3 (다) 일부 · AC-7 · AC-N3. 할 것은 seed/settings.json 에 키 둘("off" 포함 정한 것 2 의 꼴)을 넣고, check:ids 의 design-number 훑기에서 `src/app/dev/` 를 빼는 것이다(정한 것 11). 고정부 글은 바꾸지 않는다. 완료: 관문 0(biome ci · tsc --noEmit · 단위)과 `pnpm check:ids --fail-on spec-setting-missing,seed-setting-unknown,setting-scope,setting-change-via,setting-default,code-setting-unknown,table-mismatch,max-corrections,fixture-setting,design-color --design-number-max 49`(ci.yml 과 같은 인자) **종료 0**: spec-setting-missing 0 · setting-default 0 · 다른 fail-on 규칙 0 · design-number 46 ≤ 49(시드 사본으로 미리 잰 값). 인자 없는 `pnpm check:ids` 는 보고만 해서 지금도 종료 0 이므로 완료 판정은 CI 인자로 본다.
2. ∥ [시드] **묶음 0-나 계약**(같은 루프). 검증기 규칙 · 카드는 바꾸지 않는다. 완료: 관문 0 · `pnpm seed:validate` 0 · 개정 4 카드가 new.
3. ∥ [검증] **묶음 4-가 대본 일곱 · 도구 꼴**(구현자 Opus high · 가벼운 루프). 완료: `pnpm talk:observe`(--yes 없이)가 대본 열둘 · 예상 호출 · 비용을 내고 단위 talk-observe 0.
4. [사람 · 컨트롤러] **설정 적재 A(개발 DB).** `pnpm seed:load --reference-only --complete-through 3 --dry-run` 으로 '설정 넣음 2 · 그 밖 0'을 본 뒤 적재한다(complete-through 는 개발 DB 의 지금 값, 지난 회화 적재는 3). reference-only 가 설정을 넣지 않으면 카드 파일이 아직 개정 4 일 때 `pnpm seed:load --complete-through 3 --areas talk --partial` 로 한다. 첫 push 전에 끝낸다. push 가 프리뷰를 띄우면 새 키를 읽는 코드가 키 없이 돌기 때문이다(T-157). 옛 코드는 새 키를 읽지 않아 지금 넣어도 무해하다.
5. ∥ [검증] **기준선 (가)**(컨트롤러, 정한 것 9): 기준 워크트리에서 `pnpm talk:observe --yes --level 3 --rounds 1 --out <스크래치패드>/ai-scope-base`(약 110호출 · 1.5달러). 해시 6e86881 을 보고에 적는다. 장면 대본 셋은 고침 전 첫 질문(필수 질문)에 같은 아이 말을 넣은 것이라 '장면 여는 질문 뒤' 지표의 기준선은 없다(spec 표 '없음').
6. [서버] **묶음 1 흐름 · 고정부**(구현자 Opus high → code-reviewer Opus xhigh → fix). AC-2 (가)(나 계획)(라) · AC-3 (가)(나)(다) · AC-4 (가)(나) · AC-5 (나 흐름). 첫 단계는 고치기 전 4단계 골든 뜨기다. lesson-turn.ts · 새 core 모듈(묶음 2) · 화면은 손대지 않는다. 완료: 관문 0 · 4단계 골든 같음 · talk-output-schema 그대로.
7. ∥ [시드] **묶음 3 검증기 · 목록 · 카드.** (가) 구현자 Opus high: 장면 여는 질문 검사 · 목록 검사 → (나) curriculum-designer Opus xhigh: 장면 여는 질문 꼴 표본 → 컨트롤러가 표본 쪽 아티팩트로 요청자에게 → [사람] 번호(답 전 추천 1번, 정한 것 4) → (다) 같은 설계자: 개정 5 두 장 · 목록 내용 → design-reviewer Fable max: 표본 · 카드 · 목록 아이 눈 검토 → (라) `pnpm seed:validate` 0 · `pnpm seed:load --complete-through 3 --areas talk --partial --dry-run`(개정 5 두 장 '넣음'만 보고, 적재는 C). AC-5 (가) · AC-6 (나). 다른 카드 칸 · 단원 규격은 바꾸지 않는다.
8. ∥ [검증] **묶음 4-나 지표**(구현자 Opus high · 가벼운 루프). AC-8 (가) · AC-N2 · AC-N3 재료. 완료: `pnpm talk:metrics <기준선 json>` 이 설계 8 표의 분자 · 분모를 대본마다 · 합계로 낸다.
9. [서버] **묶음 2 턴 끝 처리 · 실시간 검사**(1 의 구현자 관문 통과 뒤 시작, 구현자 Opus high → code-reviewer Opus xhigh → fix). AC-1 (가)(나)(라)(마) · AC-2 (나 서버) · AC-3 (라) · AC-5 (나 서버) · AC-6 (가). talk-frame.tsx · tori.tsx · child-turn.tsx · talk-observe.ts 는 손대지 않는다. 완료: 관문 0. 통합 시험은 CI 에서만 돈다(이 Mac 불가, 보고에 '안 돌림'으로 적음).
10. [검증] **묶음 5 잇기 · e2e**(2 · 3 · 4-나 Approved 뒤, 구현자 Opus high → code-reviewer Opus xhigh). AC-1 (나 넓이)(다) · AC-5 (나 e2e) · AC-N1. 완료: 관문 0 · 짝 시험 · 넓이 시험 0 · `pnpm talk:observe`(--yes 없이) 정상 · `pnpm build`(되면, 안 되면 CI e2e 의 빌드로 갈음).
11. [검증] **대본 회차**(컨트롤러): `pnpm talk:observe --yes --level 3 --rounds 2 --baseline <기준선 json> --out <스크래치패드>/ai-scope-r1`(약 220호출 · 3달러, 둘째 세션은 대본 칸으로 켬) + `--script l3-second-session --set talk.greeting_recall=off --rounds 1`(약 8호출 · 0.1달러). 완료: 보고 JSON · 지표 표 · 기준 판정 · 설계 검토자 읽을 목록이 스크래치패드에 있고 컨트롤러는 요약만 읽는다.
12. [검증] **설계 판정**(design-reviewer Fable max): 첫 바퀴 전문 + 둘째 바퀴 걸린 차례 + 기준선 (나)(`task-talk-quality-review-3.md`). 대본마다 '대화 같다 · 아니다'와 까닭, 사람 판정 칸(이어짐 · 맥락 낱말 vs 불필요하게 어려운 낱말 · 말을 위한 말 · 아이 말 끊음 · 지어낸 경험 · 요약 밖 기억 · 막힘 판정 틀림 · 답 먼저 · 카드 질문 억지 끼움), 재발 목록 일곱(일방통행 · 같은 질문 반복 · 두 번 읽기 · 형식적 인사 · 한글 해석 · 한국어로 묻기 · 지어낸 경험)을 점검표 고정 항목으로 적는다. AC-2 (다)(라) · AC-3 (라)(마) · AC-5 (다) · AC-8 (나)(다).
13. ∥ [검증] **effort 견주기**(컨트롤러, FR-7): 같은 코드 · 카드로 `--effort medium --rounds 2`. talk-metrics 로 low · medium 나란히 표(지표 · 첫 문장 p50 · p95 · 턴 시간 · 토큰 · 비용 · 최대 출력 닿음 · 재질문 · 검사 걸림)와 설계 검토자의 A · B 가린 판정을 만들어 요청자에게 표 한 장으로 보인다. 설정 시드는 low 그대로다(AC-7).
14. [서버] **fix 라운드**(3회까지, 넘으면 요청자에게): 고친 뒤에는 걸린 대본만 다시 돈다(대본당 약 0.1~0.15달러).
15. [문서] 문서 반영 편집자(Opus high): 6.6 1~3단계 비용 행 값을 잰 값으로 · 정한 것 1 의 정본 문구를 '1~3단계'로(6.1 표 따라가기 행의 단계 칸 · 02-2:194 · 09:78, 13절 한 줄은 컨트롤러가 먼저) · 본 저장소 ↔ p13d `specs/` 를 `diff -q` 로 같게.
16. [사람] **커밋 · push**(요청자 지시 때, 코드 · 시드 · 정본 사본, 마이크 우회와 함께 한 번): 커밋 전 비밀값 · 아이 이름 확인(T-117 점검 그대로). 이어 CI `gh workflow run ci.yml --ref feature/1a-p13d-teacher -f e2e=true` 로 통합 · e2e 를 실제로 돌려 결과를 적는다(안 돈 시험을 통과로 치지 않음). 화면 파일은 바꾸지 않지만 새 줄 둘이 화면에 나오므로, CI 의 e2e 사진 묶음(e2e-photos)에서 장면 여는 질문 · 신호 말 줄이 든 회화 화면을 design-reviewer(Fable max)가 정본 4절 회화 세션 행 · 아이 화면 원칙(한 화면 한 행동 · 뜻 줄 · 큰 글자)과 대조한다.
17. [사람 · 컨트롤러] **카드 적재 C**: 새 코드가 프리뷰에 뜬 것을 본 뒤 `pnpm seed:load --complete-through 3 --areas talk --partial --dry-run` → 개정 5 두 장 '넣음' 확인 → 적재. 배포 전에 넣지 않는다. 옛 코드의 엄격 규격이 sceneOpener 를 모르는 칸으로 거부해 세션이 stale 로 닫히기 때문이다(정한 것 3).
18. [검증] **서버 턴 확인 D**: 프리뷰에서 3단계 단원 1 수업 1 을 인사 → 준비 → 장면 여는 질문 → 답 한 번까지 끝까지 돌리고, ai_calls 의 talk_turn 행이 성공(error_code 비움)이며 Vercel 실행 오류(/api/talk/turn)가 0 인 것을 본 뒤에만 요청자에게 알린다(기억 feedback-behavior-check-before-preview (5)).
19. [문서] 프리뷰 상태표 아티팩트 · 장부에 '대본 통과, iPad 검증 전'을 적는다(AC-8 (라)). iPad 회화 품질 검증 완료는 마이크 우회 15분 실측 통과 뒤 요청자 iPad 세션 메모(AC-15w 꼴)가 있을 때만 친다.

## 위험 · 제약 (Risks)

1. **설정 키 빠짐(T-157 꼴).** 새 키를 읽는 코드가 DB 에 키 없이 돌면 1~3단계는 칭찬 대사만 나온다. 막는 것: 4번 설정 적재 A 를 첫 push 앞에 두고, turnSettings 에도 펼쳐 턴 입구에서 드러나게 하며(정한 것 2), 짝 시험(talk-setting-keys)과 18번 서버 턴 확인을 둔다.
2. **카드 칸과 배포 차례.** 옛 코드 + 새 카드는 stale, 새 코드 + 옛 카드는 지금 길(첫 필수 질문)이다. 그래서 설정은 배포 앞(A), 카드는 배포 뒤(C)다. 개정 5 가 DB 의 최신보다 높아야 적재기가 받는다(version-pick 의 revision-not-new). C 의 --dry-run 으로 먼저 본다. 배포를 되돌릴 때도 같다: 개정 5 가 DB 에 들어간 뒤 옛 코드로 되돌리면 옛 규격이 그 카드를 못 읽어 세션이 stale 이 된다. 판은 내릴 수 없으므로 되돌림은 새 코드를 고쳐 앞으로 가거나, 개정 4 내용을 개정 6 으로 다시 넣는 길뿐이다(컨트롤러가 C 전에 이 길을 알고 들어간다).
3. **4단계 불변과 정본 문구.** 4단계 골든(시스템 프롬프트 · 사용자 메시지 세 꼴)이 글자까지 같아야 한다. 정본 6.1 표 · 02-2:194 · 09:78 은 따라가기 알림을 단계 구분 없이 적어 05 사용자 메시지 문단과 어긋나고, 컨트롤러 결정대로 15번에서 '1~3단계'로 맞춘다(정한 것 1). 그 전까지 구현자는 정본의 그 세 자리를 '1~3단계'로 읽는다(브리프 맥락 절에 적음).
4. **대본 도구의 사본 어긋남.** talk-observe 는 서버 턴 끝 처리를 줄여 옮긴 사본이라, 서버만 고치면 대본이 서버와 다른 대화를 잰다(T-157 이 못 본 까닭). 새 규칙은 core 모듈로 두고(정한 것 7), 묶음 5 의 짝 시험이 같은 입력에서 같은 결과를 본다. 짝이 다르면 대본 회차를 돌리지 않는다.
5. **같은 폴더 나란히의 관문 간섭.** 끝내기 관문이 단위 전체를 돌려, 다른 묶음의 붉은 시험(시험 먼저 쓰는 중)에 막힐 수 있다. 정한 것 10 의 BLOCKED 규칙으로 푼다. 공용 시험 도우미(`tests/fixtures/talk-lesson.ts`)는 묶음 1 이 더하고 2 는 쓰기만 한다.
6. **옛 시험의 고정 문구.** 'Let's say it together.' · 'I couldn't hear you.' · 'Listen and say!' 꼴을 가짜 응답 · 기대 글로 쓰는 파일이 29개다(단위 · 통합 · e2e · 표본). 묶음마다 자기 동작을 단언하는 줄만 고치고, 녹음 표본(`tests/fixtures/ai/samples/*`)은 그대로 두어 옛 응답 꼴에도 정규화가 도는지 본다.
7. **1단계 카드.** 1단계 회화는 둘째 프리뷰까지 닫혀 있어(회화 plan 정한 것 2) 이 변경의 1단계 줄('자주' 행 · 처음 묻는 선택지 · 장면 여는 질문 선택지)은 지금 아이에게 닿지 않고 시험 카드로만 증명한다. p08 워크트리의 `seed/lessons/talk/1/*.json` 은 sceneOpener 가 없어, 들여올 때 검증기에 걸린다. 그 전에 칸을 채워 다시 만들고 같은 지표로 잰다(spec 미결 3).
8. **허용 목록이 좁으면 상황 줄이 는다.** 그러면 고정 문장 차례 지표가 나빠진다(spec 우려 1). 넓이 시험(묶음 5)과 대본 보고의 '상황 줄로 바뀐 문장 수 · 걸린 낱말'로 보고, 허용 목록에 넣을지는 '맥락 낱말' 사람 판정으로 정한다.
9. **카드 다시 만들기의 통과 기준.** 개정 5 는 `pnpm seed:validate` 0, 장면 여는 질문 검사(06:186) 전부, 지어낸 경험 꼴 · 금지어 0, design-reviewer 아이 눈 검토 통과일 때만 적재한다. 다른 칸이 개정 4 와 같은지 diff 로 본다(정한 것 4).
10. **CI · 배포가 묶여 있다.** CI 는 가지를 push 해야 돌고, push 는 프리뷰 배포를 새로 띄운다(Vercel git 연동이면 그렇다. 컨트롤러가 확인한다). 배포를 '마이크 우회'와 함께 하려면 CI 도 그때 돈다. 먼저 보려면 따로 가지(ci/…)로 push 하는 길이 있으나 그것도 push 라 요청자 지시가 필요하다.
11. **check:ids 의 여유가 작다.** 묶음 0-가 뒤 design-number 는 46 이고 상한은 49 다(정한 것 11). 앱 코드에 설정값과 같은 수 글자가 넷 늘면 CI 가 다시 실패하므로, 새 수는 설정값이나 맨 위 대문자 상수로 둔다(구현 브리프 · 검토 점검 항목). dev 폴더를 빼는 규칙은 마이크 점검 쪽 파일을 고치지 않고 푸는 길이라 그 변경 단위와 겹치지 않는다. 컨트롤러는 장부에 이 규칙 변경의 근거 한 줄을 남긴다.
12. **비용 · 토큰 · 호출 수.** 호출 수는 그대로다(AI 를 부르는 자리 불변, AC-N1). 대본 전체는 약 7.6달러(기준선 1.5 · low 두 바퀴 3 · 끔 0.1 · medium 두 바퀴 3)에 fix 뒤 걸린 대본만 더한다. 고정부 늘림은 1,000 토큰 안으로 두고(지금 첫 턴 캐시 쓰기 약 8,600 토큰, 대본 6회차), 턴 출력 토큰 중앙값이 기준선보다 30% 넘게 늘거나 턴 비용 중앙값이 20% 넘게 늘면 보고 첫머리에 알린다. 이 문턱은 보고 알림이지 판정 기준이 아니다(C211 (2)).
13. **선생님 말 양.** 두 문장 반응 · 자기 이야기로 선생님 말이 늘 수 있다. 판정은 AC-8 (나)의 '선생님 말 양 · 차례 길이 고침 전 이하 · 긴 차례 0'이고, 수치를 맞추려 말을 줄이거나 더한 대본은 사람 판정에서 통과가 아니다.
14. **녹음 · 서버형 인식.** 새 코드는 소리를 저장 · 전송하지 않는다. 검토 점검 항목: diff 에 MediaRecorder · getUserMedia · AudioContext · 소리 업로드의 새 사용 0, TurnRequestSchema(소리 칸 없음) 그대로, Anthropic 으로 가는 것은 인식 글뿐.
15. **'iPad 버리는 듣기'와의 겹침.** 위 '안 바뀌는 파일'을 지킨다. e2e 도우미 `tests/e2e/talk.ts` 는 둘 다 고칠 수 있어 묶음 5 가 Edit 로 덩이 끝에만 더한다. 같은 가지에 두 변경 단위가 쌓이므로 push 는 한 번이다.
16. **기술 오류 경계.** 인식기가 바꿔 적은 글(spec 우려 4)은 이 변경이 다루지 않는다. 막힘 경계(C204)와 아이 말 갈래는 그대로다.

## 증명 (Proof)

| 수용 기준 | 증명 | 파일 · 명령 |
|---|---|---|
| AC-1 (가) 들리지 않음 판단 칸 무시 | 단위 heardFieldsBlankOf + 통합(가짜 응답 stuck 참 · not_understood · 능력 · 스스로 쓴 단어 → 받침 단계 · 막힘 · 바닥선 · '말했다' · 근거 U 그대로) | `tests/unit/talk-situation.test.ts` · `tests/integration/talk-ai-scope.test.ts`(CI) |
| AC-1 (나) 상황 차례 검사 | 단위(범위 밖 · 금지 구 · 답 글 → 상황 줄 · 지움, 'That's okay!' · 질문 글 낱말만 쓴 장면 반응은 남음) + 넓이 시험 | `talk-situation.test.ts` · `tests/unit/talk-allowed-coverage.test.ts` |
| AC-1 (다) 기술 오류에 요청 0 | 이 변경이 고치지 않는 길: 지금 시험이 그대로 지남 + e2e deaf · 권한 거부(failingRun('not-allowed')) 덩이에 '회화 턴 요청 0 · 막힘 기록 0' 단언. 읽어 주기 오류는 화면 길이 그대로라 새 단언 없음으로 보고 | `tests/unit/talk-mic-deaf.test.ts` · `tests/e2e/talk-lesson.spec.ts`(CI) |
| AC-1 (라)(마) 받침 붙일 줄 · 실패 때 상황 줄 | 통합 + 단위 lessonOutcomeViewOf | `talk-ai-scope.test.ts` · `tests/unit/talk-lesson-turn.test.ts` |
| AC-2 (가)(라) 예 셋 이상 · recall 줄 켬 · 끔 | 단위(고정부 글) + 대본 둘째 세션 켬 · 끔 사람 판정 | `tests/unit/talk-ai-scope-prompt.test.ts` · 11 · 12번 |
| AC-2 (나) 인사 턴 2 | 단위(계획) + 통합(검사 실패 → 재질문 → 카드 둘째 인사) | `talk-ai-scope-flow.test.ts` · `talk-ai-scope.test.ts` |
| AC-2 (다) 인사 끝 셋이 다르고 아이 답에 닿음 | 대본 l3-greet-* 사람 판정 | 12번 |
| AC-3 (가)(나) 상한 · Child said more | 단위 | `talk-ai-scope-flow.test.ts` |
| AC-3 (다) 설정 따라 바뀜 · 수치 문구 없음 | 단위 + check:ids(CI 인자) 종료 0 | `talk-ai-scope-prompt.test.ts` · `pnpm check:ids` |
| AC-3 (라)(마) 지어낸 경험 · 긴 차례 | 단위(지움 · 질문 남음) + 대본 지표 ㉠㉡㉢ · 사람 판정 | `talk-made-up.test.ts` · `pnpm talk:metrics` · 12번 |
| AC-4 (가)(나)(다) 소리 줄 자리 | 단위 keptChoicesOf · 고정부 '자주' 1단계만 + 대본 '남기는 차례 밖 소리 줄 0' | `talk-ai-scope-flow.test.ts` · `talk-ai-scope-prompt.test.ts` · talk:metrics |
| AC-5 (가) 장면 여는 질문 검증기 | 단위(막는 꼴 전부) | `tests/unit/seed-validator-talk.test.ts` |
| AC-5 (나) 보이고 읽힘 · 요청 0 · 쉬운 질문 · Follow up · 되돌림 | 단위(계획 · 사용자 메시지 · cardChainGuardOf) + 통합 + Playwright 고정 표본 | `talk-ai-scope-flow.test.ts` · `talk-ai-scope.test.ts` · `tests/e2e/talk-lesson.spec.ts`(CI) |
| AC-5 (다) 예 · 아니요 · 딴 말 뒤 이어 묻기 | 대본 l3-scene-* 사람 판정 | 12번 |
| AC-6 (가) 신호 말 자리 · 긴 꼴 · 되풀이 없음 · 기록 밖 | 단위 + 통합(talk_turns 원문 · 다시 쓸 차례) + 짝 시험 | `talk-cue-line.test.ts` · `talk-log.test.ts` · `talk-ai-scope.test.ts` · `talk-observe-parity.test.ts` |
| AC-6 (나) 목록 검증 | 단위 + `pnpm seed:validate` 0 | `tests/unit/talk-lists.test.ts` |
| AC-7 견주기 보고 · 기본 low | 13번 보고 + 시드 값 시험 | `tests/unit/talk-setting-keys.test.ts` · 보고 파일 |
| AC-8 (가)(나) 표본 · 기준선 · 분자 분모 · 기준 안 | talk:observe 두 바퀴 + talk:metrics --baseline | 11번 · `pnpm talk:metrics` |
| AC-8 (다) 대본 전부 '대화 같다' | design-reviewer Fable max 판정 보고 | 12번 |
| AC-8 (라) 'iPad 검증 전' 표기 | 상태표 · 장부 | 19번 |
| AC-8 (마) 학습 목표 판정 · 단원 통과 · 단계 평가 · 승급 규칙 불변 | 다음 단위 시험이 고치지 않은 채(diff 없음) 지난다: `conversation-said` · `talk-lesson-attempt` · `teach-evidence` · `score` · `talk-move` · `talk-output-schema`. 단원 통과 · 승급 코드는 p13d 에 아직 없고(평가 plan P12 몫) 이 변경도 만들지 않는다 | `pnpm test` · 검토 점검(diff 에 그 파일 없음) |
| AC-8 (마) 녹음 안 함(NFR-4 · C211 보완 7항, 정본 AC-15zh (마) · spec 원칙 대조 '녹음하지 않음') | (1) 회화 턴 요청 규격 turn.ts TurnRequestSchema 가 strictObject 그대로(input 은 mode · text · nospeech, 소리 칸 없음)이고 소리 칸을 더한 요청은 error 로 끝난다 (2) talk_turns 열 · 마이그레이션 그대로(check:ids table-mismatch 0, `drizzle/*` diff 없음) (3) Anthropic 으로 가는 것은 인식 글뿐: 통합에서 가짜 클라이언트가 받은 메시지가 모두 글 블록 (4) 새 코드에 소리를 잡거나 보내는 길 0: diff 에 MediaRecorder · getUserMedia · AudioContext · 소리 Blob · FormData 업로드의 새 사용 0(code-reviewer 점검 항목) (5) 대본 · 측정은 대본의 인식 글과 기록 칸만 쓴다 | `tests/unit/talk-no-audio.test.ts` · `pnpm check:ids` · `tests/integration/talk-ai-scope.test.ts`(CI) · 검토 점검 |
| AC-N1 요청 수 같음 | Playwright: 같은 아이 입력을 칸 있는 카드 · 없는 카드로 돌려 가짜 AI 요청 수가 같음 + 대본마다 부른 자리 수가 기준선과 같음 | `tests/e2e/talk-lesson.spec.ts`(CI) · talk:metrics |
| AC-N2 첫 문장 p95 | talk:metrics(기준선 대비 +0.3초 안, NFR-8 2.5초와의 차이 따로) | 11번 |
| AC-N3 키 · 옵션 · 토큰 | 단위(키 짝) · talk:observe `--chance-alert` · 보고의 턴당 토큰 · 비용 | `talk-setting-keys.test.ts` · `talk-observe.test.ts` |
| 늘 | biome ci · tsc --noEmit · 단위(`pnpm test`) · `pnpm check:ids`(CI 인자) 종료 0 · `pnpm seed:validate` · CI 통합 · e2e(실제 실행 여부 표기) | 묶음마다 · 16번 |

## 브리프 머리 '맥락' 절 (묶음마다, 열 줄 안)

| 묶음 | 닿는 결정 | 넘겨받은 것 | 요청자 강조 | 읽을 정본 절 |
|---|---|---|---|---|
| 0-가 | C211 (1) · (5) · C211 보완 · T-157 · UI · UX plan 정한 것 8(상한 49) | 12절 새 키 둘(09:88 · 89) · check:ids 실패 둘(spec-setting-missing 2 · design-number 77 > 49, dev 폴더 31건) · 정한 것 2 · 11 | "빨리 진행해" · 추가 승인 없음 | 09:78~89 · 217 · 05 6.1 고정부 머리 · `scripts/check-ids.ts` 머리 주석(AC-23e (1)) |
| 0-나 | C206 · C207 · C211 (1) | 정한 것 3 · 5 · 6 | 대본 같은 고정 질문이 되지 않게 | 06 6.3 회화 카드 행 · 06:186 · 187 |
| 1 | C205 · C206 · C209 '나' · C211 (1)~(4) · C202 · C203 · C204 · C19 · C188 | 0-가 rules 칸 · 0-나 sceneOpener 꼴 · 정한 것 1(정본 따라가기 세 자리 6.1 표 · 02-2:194 · 09:78 은 '1~3단계'로 읽음, 정본 고침은 15번) · 4단계 골든 먼저 | '실제 선생님과 이야기한다고 느끼는 것' · 고정부에 수치 넣지 않음 | 05 6.1 표 · 사용자 메시지 문단 · 02-2:162~212 · 02-2 받침 표 · 처음 묻는 턴 |
| 2 | C207 · C209 '나' · C210 · C211 (4) · C125 · C194 (1) · C204 (5) | 묶음 1 의 계획 칸 · talkCallTurnOf feelingWords 인자 · 0-나 목록 읽기 · 정한 것 6 · 7 · 8 | 기술 오류는 앱이 판단하고 학습 실패로 적지 않음 | 02-2:204~212 · 03 4절 '대화 기록' · '선생님 차례' · 06:221 · 07 7절 읽어 주기 · 8절 회화 턴 실패 |
| 3 | C206 · C207 · C211 (1) | 0-나 꼴 · 정한 것 4 · 5 · 표본 번호 | 장면 · 주제만 준비하고 '예 뒤 · 아니요 뒤' 대본을 두지 않음 | 06 6.3 생성 문단 · 06:186 · 187 · 02-2:200 |
| 4-가 · 4-나 | C211 (2) · (5) · T-157 · T-160 · T-164 | spec 설계 7 · 8 표 · 대본 다섯 · 정한 것 9 | 수치는 검증 기준이고 말을 늘릴 목표가 아님 | spec 설계 8 · 11:194(AC-15zh) |
| 5 | T-157 · T-163 (3) · C211 (5) | 2 · 3 · 4 보고 · 위험 4 | 배포 전 행동 검증 · 대본 통과는 iPad 검증 전 | 11:187~194 · 264(AC-15za~zh · AC-N22) |

## 완료 보고 (Done)

구현 뒤 채운다: 실제 바뀐 파일(계획과 다른 것 표시) · 묶음마다 관문 결과 · 통합 · e2e 실제 실행 여부와 결과 · 대본 지표 표(기준선 (가) 대비, 분자 · 분모) · 설계 판정 · effort 견주기 표 · 남긴 것(정한 것 1 의 정본 문구 · 1단계 카드 · 6.6 값) · 커밋 · CI 실행 번호.
