# 구현 보고: 가르치고 배우는 수업 묶음 다(판정) — 2026-10-30 02:1x, 구현자 Opus · high

상태 DONE_WITH_CONCERNS. 워크트리 p13d 커밋 전 변경 위, 커밋 안 함. 화면 · 2-가 · e2e · seed/prompts · 검증기는 손대지 않았다.

## 바뀐 파일(※ 는 브리프 표 밖)
- `src/core/writing/why.ts`(신규) WRITING_WHY_KO :13(설계 5 문구 그대로) · writingWhyOf :79 — 입력 (문항 + whyKo?, Answer), 출력 { reason: order·capital·period, textKo } 또는 맞으면 undefined. 차례 → 대문자 → 마침표, 둘 다면 대문자.
- `src/core/speaking/judge.ts` judgeableQuestion :118 · judgeSpeakingQuestion :130 — 입력 (문항 {en, modelAnswer?, accepted, acceptedMeaning?}, 인식 글, { pass, homophones, words }, ai?), 출력 judge { meaning, bundle?, ai?, final, by, communicative?, expressionDone }(나 의 QuestionJudgeSchema 꼴). questionTextsOf :205(품사 표 재료) · AI_ANSWER_SCORES :232 · aiAnswerScore · skipAfterAiRest :250.
- `src/core/session/attempt.ts` 질문 skipped 에 ai_rest :102 · 채점 맥락 meaningWords(필수) :381 · questionJudgeContextOf :385 · 질문 짝 판정 spareQuestionResult :691 · withAppJudge :737(질문 짝 · 말하기 같이 해 보기 judge 를 앱 판정으로 다시 씀). 판 2 꼴은 그대로.
- ※ `src/core/session/spare-outcome.ts`(신규, 보탬 01:4x) spareOutcomeOf :55 · togetherOutcomeOf :167 — teach-metrics 의 두 벌을 옮기고 말은 judgeSpeakingQuestion 으로. teach-metrics.ts 는 가져오기 · 다시 내보내기만 바꿈.
- `src/core/ai/calls/speaking.ts` story :66 · 가변부 'Story the child heard' :147(이야기가 없으면 줄 없음).
- `src/server/speaking/index.ts`(신규) evaluateAnswer :180 · `src/server/actions/speaking.ts`(신규) evaluateSpeakingAnswer(첫 문장 requireAccess).
- ※ `src/server/speaking/words.ts`(신규) meaningWordsOf :17 — DB 에서 넓게 거른 뒤 meaningWordsFor 로 같은 표.
- ※ `src/server/session/index.ts`(장부 L-34 '서버 scoringOf → outcomeContextOf 는 다'): scoringOf :393 이 outcomeContextOf 를 부름 · 품사 표 :860 · :1039 · :1429 · 저장 때 withAppJudge :918 · 화면 자료 meaningWords :1172 · sessionContextOf · lemmaEntriesOf 내보냄.
- ※ 필수 칸 때문에 고친 맥락 자리: spares.ts:107 · :125(나), scripts/teach-metrics.ts:384(아), 시험 고정값 sample-inputs(story: null), session-spares · teach-metrics · session-flow 시험의 맥락 한 줄.

## 서버 액션 evaluateAnswer
입력 { sessionId, clientAttemptId, activityNo, transcript, failures?, story?, techError? }(Zod). 그 프로필 말하기 세션 · AI 판정 혼자 질문만. 같은 시도 id · 같은 활동 끝 시도는 저장된 결과. 안전 상한은 시도 없이 ai_resting. AI 실패는 판정 없는 끝 시도(점수 null) · skipped. techError 는 AI 없이 U 끝 시도. 성공은 judgeSpeakingQuestion(…, ai) 로 judge 를 정하고 점수 aiAnswerScore(final). 돌려줌 { judgement: final, feedback, correctSentence, grammarNotes }.
설계와 다르게 한 것: 합친 판정이 AI 판정과 다르면 feedback null · 문법 지적 없음, 맞음을 '다시'로 바꾸면 시드 바른 답(AI 글은 아이 답을 되풀이할 수 있음). spec 에 없는 정한 것이라 검토 확인을 바란다.

## 시험(증명 절 '말하기 질문 판정의 증명' 항목별)
- 의미 검증 부정: speaking-judge 'AC-22k 의미 검사가 실패한 답은 … 다시다'(문턱을 넘는 글 다섯 일치율 단언 포함). 긍정: 'AC-22k 의미 검사 긍정 예문', speaking-meaning 'AC-22k 정규 시드 셋 … accepted 는 … acceptedMeaning 은 …'(타 의 52개 통과 시험은 그대로).
- 가르기: 'AC-22k 두 묶음 가르기'. 일관성: 'AC-22k 일관성 …'(셋 × 묶음 · 부정 글, 부분 + Yes they do, 맞음 + Yes they drink milk, 알려진 차이). 증명 절의 'They have pizza.'는 eat 이 빠져 key 로 걸려서, 알려진 차이는 'Pizza, they eat.' · 'Yes, they wash them.'으로 쟀다(시험에 key 단언도 둠).
- 짝 · 덧씌우기: session-attempt 'AC-22k 질문 짝은 …' · 'AC-22k 서버 판정 덧씌우기 …' · spare-outcome 두 시험 · speaking-eval 'AC-22k 질문 짝 시도의 judge 칸은 …'.
- 통합(정적, 이 Mac 못 돌림): speaking-eval 'AC-22k … 부분에 Yes, they do. …' · 'AC-22k AI 맞음이라도 …' · 'AC-22k A9 확정 전 … · AC-N19 말하기 3단계 … 넷뿐' · 같은 시도 id · 실패와 소리 없음 · 안전 상한과 ai_rest 끝내기. retry 'AC-2c 다시 하기 말하기 세션에서도 …'.
- 쓰기: writing-why 'AC-3d' 넷 · session-attempt 'AC-3d 세션 점수는 첫 시도로만'. 그 밖 ai-request '말하기 질문 답의 가변부에 … 이야기', speaking-judge 점수 · 건너뛸 활동 · 품사 표 재료.

## 관문(p13d, 02:1x)
| 명령 | 결과 |
|---|---|
| pnpm lint | 종료 0, 492 파일 |
| pnpm exec tsc --noEmit | 종료 0 |
| pnpm test | 종료 0, 111 파일 · 1254 통과 · 6 todo |
| pnpm check:deps | 종료 0, 위반 없음(251 모듈) |
| pnpm check:ids | 종료 0, design-number 44 · fixture-setting 0 |
| pnpm spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0 · missing-test 16 |

## 우려(7)
1. 브리프 표 밖 파일(index.ts · spares.ts · 지표 스크립트 · 시험 넷)을 고쳤다. meaningWords 를 필수 칸으로 두어 기기 · 서버 · 지표가 같은 표를 쓰게 한 대가다.
2. 통합 시험 여덟과 words.ts 의 SQL(sql.join · arrayOverlaps · jsonb 꼴 거름)은 Postgres 에서 돌려 보지 못했다. CI 첫 실행에서 확인해야 한다.
3. '같이 말해 볼까요' 뒤 말(echo)은 서버 액션이 끝 시도를 먼저 저장해 끝 시도에 담을 수 없다. 영어로 말한 문장 수에 넣으려면 라-3 이 담을 자리를 정해야 한다.
4. 의미 검사는 허용 답이 있는 모든 질문에 건다. 3단계 단원 5 의 What · Where 질문이 생기면 그 꼴을 가를 조건이 필요하다(설계 8 끝 문장).
5. skipAfterAiRest 는 질문 답만 낸다. 그림 보고 말하기(picture-task)는 P11c 가 더한다.
6. A9 통합 시험은 세션 점수가 같고 단원 진행 행에 communicative · partial 글이 없음을 본다. 단원 판정(P12)이 생기면 그 입력으로 다시 봐야 한다.
7. 화면 연결(라-3)은 evaluateSpeakingAnswer · skipAfterAiRest · view.meaningWords 를 써야 하고, 판정 글자를 그리지 않아야 한다(AC-5d).
