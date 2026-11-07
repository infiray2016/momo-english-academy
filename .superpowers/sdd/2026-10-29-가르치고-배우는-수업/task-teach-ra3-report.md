# 구현 보고: 가르치고 배우는 수업 묶음 라-3, 말하기 연결(2026-10-30 04:5x, 구현자 Opus · high)
상태: DONE_WITH_CONCERNS. 워크트리 p13d이고 커밋은 하지 않았다. 라-1 조각(`src/components/session/teach/*`) · recap.ts · result.ts · result-view.tsx · evidence · attempt.ts · judge.ts · spare-outcome.ts · sound-retry.tsx · placement · 시드 수업 · globals.css · `tests/.tmp/l3-samples` 는 읽기만 했다.

## 바뀐 파일(p13d 기준 줄)
- `src/components/session/speaking.tsx`(1598줄): 머리 주석 :15 · SpeakingTeach :139 · 따라 말하기 RepeatActivity :235(teach — '왜' · 끊어 들려주기 접점 · 짝 맞음 · 틀림, 단추 줄은 teach 일 때 판 아래) · 듣기 이해 ListeningActivity :508(ListeningItemOf :492 · ListeningTeach :498 — '왜' · '한 번 더 풀기' · 대본 뒤 답 덩어리 천천히 · 짝) · 새 조각 TeachStory :889(라-1 StoryScreen + sound-retry) · JudgedQuestionActivity :1027(이야기 → 질문, 판정 길 app · meaning · ai, 기다림 표시, '왜' → 바른 답 → 같이 말해 볼까요, 짝) · questionFinalOf :1005 · ServerSavedQuestion :986 · SpeakingTogetherInput :1469(S5 고르기 · 같이 말하기 · S6 · S7 틀만 보고 말하기). 지금 1~2단계 화면 QuestionAnswerActivity :726 은 그대로다.
- `src/app/(child)/session/[id]/session-frame.tsx`: 머리 주석 :32 · TEACH_INPUT_AREAS 에 speaking :254 · TogetherSlot 말하기 갈래 :495(줄이 멈출 때마다 lineDone) · recorded 에서 appJudged 조건 뺌 :573 · aiQuestionsResting :628 · 열 때 쉼 효과 :800 · advance(also) :899 · queueEcho :925 · skipAiQuestions :945 · speakingEnv · micNotice · spokenActivity · speakingTeach · listeningTeach :1026~1070 · 같이 해 보기 마이크 안내 :1148 · 말하기 갈래(혼자 문항 teach · AI 질문 :1662 · 기기 몫 사본 :1692 · 짝 :1700) :1596~
- `src/core/session/teach-frame.ts`: 머리 주석 · chunksOf :295 · repeatTeachStageOf :317 · judgedQuestionStageOf :356 · slowRateOf :391 · aiRestSkipsOf :399(judge.ts skipAfterAiRest 를 부름) · savedQuestionInputOf :412
- 신규 `src/lib/speech/pieces.ts`(81줄): piecesSpeech — speak(text)를 정한 조각(빠르기 포함)으로 바꿔 차례로 읽고 조각 사이 speech.sentence_pause_ms 를 쉰다(pacedSpeech 와 같은 speakInTurn 길, 들려준 결과는 speakHeardOfAll 로 모음)
- `src/server/session/index.ts`: SessionConfig.speaking.slowRateFactor :227 · 읽기 :258 · :281, SessionView.aiQuestionsResting :1211 · 채우기 :1606~1615 · :1662. 시도 저장 길 · AI 호출 자리는 그대로다
- 설정 키(새): `seed/settings.json:119` · `specs/09-설정값.md:99`(12절 사본) · `tests/fixtures/settings.ts:173` — speech.slow_rate_factor 0.8(고급, 잠정)
- 시험: 신규 `tests/unit/speaking-teach.test.ts` · `tests/unit/together-speaking.test.ts`, `tests/unit/teach-frame.test.ts`(고정값 slowRateFactor · aiQuestionsResting 두 줄), `tests/e2e/teach.spec.ts`(머리 주석 · 말하기 갈래 :770~), `tests/e2e/lessons.ts`(teachSample 에 speaking)
- `src/components/answer/repeat.tsx` 는 바꾸지 않았다. 배치 평가의 RepeatAnswer 이고, 세션 따라 말하기는 speaking.tsx 의 RepeatActivity 다

## 설계와 다르게 한 것
1. 질문 답은 지금 QuestionAnswerActivity 를 고치지 않고 새 조각 JudgedQuestionActivity 를 두었다. 판정 길 셋(1~2단계 혼자 app = 서버 questionResult 와 같은 judgeAppAnswer · 질문 짝 meaning = spareQuestionResult 와 같은 judgeSpeakingQuestion · 3단계부터 혼자 ai = 서버 액션)이 같은 화면을 쓴다. teach 없는 1~2단계 화면은 그대로다.
2. 새 파일 `src/lib/speech/pieces.ts` 를 두었다. 끊어 들려주기와 '대본 뒤 답 덩어리를 천천히'를 한 감싸기로 한다.
3. 천천히 읽기는 새 키 speech.slow_rate_factor(speech.rate.<구간> 에 곱함)다. SpeechSettings 가 아니라 SessionConfig.speaking 에 넣었다(speechSettingsSchema · 음성 대본 꼴을 건드리지 않으려고). 13절 줄은 컨트롤러 몫이다.
4. 'AI 쉬는 중'은 판정 응답 ai_resting 말고도 화면 자료 aiQuestionsResting(열 때 aiRestingToday)로 안다. 열 때 알면 첫 혼자 질문의 이야기 화면도 건너뛴다(설계 10). 쉬는 안내 판은 내지 않는다(7절 말하기 3~8 예외).
5. AI 질문의 '같이 말해 볼까요' 뒤 말(echo)은 진행 시도 `{ v: 2, kind: "question", step: "progress", heard: [], failures: 0, echo }` 로 대기열에 넣는다. 끝 시도는 서버 액션이 먼저 저장했기 때문이다(다 우려 3 · M5). 아래 요청 1 참고.
6. AI 피드백 한 문장은 맞음일 때만 보인다(서버가 판정을 바꾸면 null). 가르치는 수업의 부분 · 다시는 '왜'(시드)와 바른 답(시드 modelAnswer)뿐이다. 1~3단계에서 틀린 곳을 짚지 않으려는 것이다. teach 없는 AI 질문(4단계부터의 지금 화면)은 plan-p11c 값 4 대로 부분 · 다시에도 피드백 · 문법 지적 · 서버 바른 답을 보인다.
7. 낱말 따라 말하기는 시드 chunks 가 없다. 그래서 '왜' 한 줄('끊어서 다시 들어 봐요.')은 보이되 다시 듣기는 낱말 하나 그대로다.
8. 듣기 짝이 틀리면 정답 표시와 짝의 '왜' 한 줄을 보이고 '다음'은 줄을 읽은 뒤 밝다(읽기 짝과 같은 꼴). 답을 소리로 다시 읽지는 않는다. 질문 짝이 틀리면 '왜' 뒤 바른 답을 보이며 들려주고, 들려준 뒤 '다음'이 밝다.
9. 같이 해 보기 S5: 틀린 보기는 시도 { choice } 하나로 낸다. 맞은 보기는 말하기까지 들고 있다가 { choice, heard } 한 시도로 낸다(togetherOutcomeOf 가 둘을 함께 본다). 인식이 끝내 안 되면 그때까지의 시도로 끝낸다. TogetherSlot 은 줄이 멈출 때마다 lineDone 을 켠다(틀린 반응 뒤 바른 답을 들려주는 때). 넘어가기는 여전히 맞음 · 칭찬 표지 뒤다.
10. '같이 말해 볼까요' 단계에서 인식이 끝내 안 되면 건너뜀 표시 없이 첫 답을 그 시도로 둔다. 지금 1~2단계 화면은 skipped 를 달아 점수에서 빠진다.
11. 판정 요청이 닿지 않으면(unavailable · 던짐) 안내 '인터넷이 끊겼어요. 연결되면 다시 해요'와 '다음'(같은 시도 id 로 다시 보냄)을 두고, online 때도 다시 보낸다. 다시 열면 기기 저장소의 시도 id 로 다시 보낸다. invalid · not_found 는 판정 없이 다음으로 간다.
12. 서버 액션이 저장한 AI 질문 끝 시도는 이 기기의 짝 고르기에도 넣는다(savedQuestionInputOf). judgeSpeakingQuestion 에 서버의 합친 판정을 AI 자리로 넣어 다시 세면 final 이 서버와 같다(시험으로 확인). 이것이 없으면 이 기기에서 틀린 AI 질문의 짝이 나오지 않는다.
13. 큰 단추를 판 안 아래(mt-auto)에 두는 것은 가르치는 수업일 때만이다. teach 없는 지금 화면의 배치(검토됨)는 그대로다.
14. 질문을 읽는 목소리는 지금처럼 세션 접점이다. 설계 4 목소리 표의 '질문 → 선생님 영어 목소리'는 하지 않았다(읽기 문항 라-2 와 같음).

## 시험(정본 AC 이름)
- 단위 speaking-teach(23): 'AC-4d 끊어 들려줄 조각은 시드 chunks 의 '/' 자리…' · 'AC-4d 따라 말하기는 첫 시도가 '잘 말했어요'가 아니면 '왜'…' · 'AC-4d · AC-5d 질문 답 단계…' · 'AC-N19 'AI 쉬는 중'이면 지금부터 남은 혼자 질문만…' · 'AC-4d 듣기 이해 … slow_rate_factor…' · 'AC-N20 질문 끝 시도: 이야기를 소리로 못 들었으면 기술 오류…' · 조각 읽기 셋(AC-4d 둘 · AC-N20) · 따라 말하기 화면 넷(AC-4d 셋 · AC-22c 짝) · 듣기 화면 셋(AC-4d 둘 · AC-22c 짝) · 질문 · 이야기 화면 일곱(AC-22c 이야기 → 질문 · AC-5d 기다림 · AC-4d '왜' → 같이 말해 볼까요 · AC-22c 질문 짝 · AC-N20 U · AC-N20 이야기 화면)
- 단위 together-speaking(13): 'AC-4d S5 누가 자리 …' · 'AC-4d S6 틀만 보고 말하기 …' · 화면 셋(AC-4d) · 세션 틀 여섯('AC-22c 말하기 같이 해 보기는 라-1 같이 해 보기 틀 안에…' · 'AC-22c 혼자 해 보기 첫 화면…' · 'AC-22c 혼자 질문(3단계 — AI 판정)은 이야기 화면부터…' · 'AC-3k 짝 자리…' · 'AC-22c 짝 차례는 질문 → 듣기 → 문장 → 낱말…' · 'AC-5d 1~2단계 앱 판정 수업(teach 없음)…') · 기기 몫 짝 고르기 둘('AC-22c 서버가 저장한 끝 시도를…' · 'AC-N20 판정 없이 넘어간 시도…')
- e2e(정적) teach.spec 셋: 'AC-22c 말하기 3단계 단원 1 세션은 여섯 자리를 지나고 … AC-4d … AC-5d … AC-3k …'(가짜 AI 말하기 평가 · 가짜 음성 인식 대본, 같이 해 보기 · 끊어 들려주기 · 느린 빠르기 기록 · 정한 것 6 · echo 진행 시도 · AI 호출 넷 · 이야기 요청 본문) · 'AC-N20 이야기가 소리 없이 넘어가면 …'(neverStart · sound-retry · 무음 모드 줄 · U 끝 시도) · 'AC-N19 'AI 쉬는 중'(하루 안전 상한)이면 …'
- speaking.spec · speech-feedback.spec 은 고치지 않았다. 말하기 가르치는 수업 갈래를 teach.spec 하나에 모았다(라-2 와 같은 꼴)

## 관문(p13d, Node 24, 04:4x~04:5x)
| 관문 | 결과 |
|---|---|
| pnpm lint | 533 파일, 오류 · 경고 0(종료 0) |
| pnpm exec tsc --noEmit | 종료 0 |
| pnpm test | 126 파일 · 1501 통과 · 6 todo(새 36) |
| pnpm check:deps | 위반 0(273 모듈) |
| pnpm check:ids | 종료 0, 규칙 위반 0, design-number 47(전과 같음, 이 묶음 0), fixture-setting 0, design-color 0 |
| pnpm spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0, missing-test 16(P12, 전과 같음) |
| pnpm build | 종료 0 |
| pnpm check:bundle | 위반 0 |
| 첫 JS 3D(NFR-11) | /session/[id] 첫 JS 25덩이에 3D 표지 0, three 가 든 덩이 1개는 따로(스크래치패드 first-js-3d.mjs) |

## 요청하는 변경
1. AI 질문의 echo 진행 시도를 셀 자리: englishSentencesOf(judge.ts)와 teachEvidenceOf(evidence/teach.ts)는 끝 시도만 읽어, AI 질문 echo 가 '오늘 영어로 말한 문장'과 근거 retry(echo)에 들지 않는다. 진행 시도 echo 를 같은 활동 끝 시도에 합쳐 읽게 하거나, 서버 액션이 echo 를 받아 끝 시도에 더하게 정해 주기 바란다(판정 · 근거 파일 담당 묶음).
2. 13절 한 줄과 12절 정본 반영: speech.slow_rate_factor(0.8, 고급, 잠정). 값은 iPad 음성 점검에서 정한다.
3. 화면 검토(7-가): (가) 이야기 화면에서 소리를 못 들려주면 StoryScreen 의 작은 '다시 듣기'와 sound-retry 의 큰 '다시 듣기'가 함께 보인다(5-나 우려 1 과 같은 꼴). (나) 낱말 따라 말하기의 '끊어서 다시 들어 봐요.' (다) S5 에서 맞은 보기를 골라도 빈칸이 채워져 보이지 않는다. (라) '왜' 말풍선과 단추의 자리(판 안 아래).
4. 설계 4 목소리 표의 '질문'을 선생님 영어 목소리로 할지(읽기 문항 · 말하기 질문 같이) 정해 주기 바란다.
5. 라-1 조각 props 는 모자란 것이 없었다(StoryScreen · TogetherFrame · WhyBubble · FirstLine 그대로).

## 남은 우려(iPad · 실호출 확인 항목)
1. e2e 셋은 이 기기에서 돌리지 않았다(정적, 실행은 11-01 뒤 CI). 말하기 흐름 e2e 는 인식 대본 차례(start() 마다 하나)에 기댄다.
2. iPad: 끊어 들려주기 조각 사이 쉼(speech.sentence_pause_ms)이 자연스러운지, 천천히 읽기 빠르기(1~3구간 0.64)를 사파리가 그대로 받는지, 이야기 저절로 들려주기가 앞 화면 누름의 잠금 풀기로 이어지는지, 바른 답을 읽는 중 '말하기'를 누르면 읽기가 멈추고 바로 듣는지 확인해야 한다.
3. 실호출: 말하기 평가 요청에 이야기가 실리는지(가변부 'Story the child heard'), 3단계 피드백 한 문장이 맞음에만 보여도 괜찮은지, 기다림 표시와 지연, 하루 안전 상한 응답(ai_resting) 때 남은 질문이 이야기와 함께 건너뛰어지는지 본다.
4. aiQuestionsResting 은 통합 시험을 더하지 않았다(e2e AC-N19 만). invalid · not_found 응답 뒤에는 서버에 끝 시도가 없어 끝내기에서 그 활동으로 돌아올 수 있다(드문 갈래).
5. 같이 해 보기 · '같이 말해 볼까요'의 진행은 기기에 되살리지 않는다. 도중에 닫으면 그 문항 처음부터다(연습 · AI 끝 시도는 서버 값).
