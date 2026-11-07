# 코드 검토: 가르치고 배우는 수업 묶음 나(활동 차례 · 시도 꼴 판 2 · 짝 고르기 · 이어 하기 · 서버 다시 셈) — 2026-10-30, 검토자 Opus · xhigh

판정: **Approved** (Critical 0 · Important 0 · Minor 4). 필수 fix 는 없다. 범위는 구현 보고의 바뀐 파일 diff 이고, 같은 파일의 다른 묶음 줄(0-다 met 이름 · 별 · 설정 고정값의 다른 키)은 판정하지 않았다. 시험은 다시 돌리지 않았다.

## 1. 설계 준수
- ✅ 여섯 자리 차례: teachOrder(`src/core/session/preview.ts:252`)는 teach 칸이 있고 첫 활동이 미리보기일 때만 오늘 배울 것 → 새 단어 → 본보기 → 같이 해 보기 → 혼자 → 짝 차례를 만든다. 단계 숫자는 보지 않는다(정한 것 1). 서버는 lesson.teach 가 있을 때만 넘긴다(`src/server/session/index.ts:339`).
- ✅ 짝 번호 고정: spareActivities(preview.ts:220)가 모든 짝을 말하기 질문 → 듣기 → 문장 → 낱말 차례로, 읽기 · 쓰기는 문항 차례로 늘 놓는다(정한 것 3, spec 설계 9).
- ✅ 낼 짝 고르기: sparesToShow(`src/core/session/spares.ts:35`)는 혼자 첫 시도가 '틀림'인 것만 목록 차례로 상한까지 고르고 나머지를 skip 으로 낸다. 상한은 설정값 lesson.spares_per_session.<영역> 이고 teach 수업에서만 읽는다(index.ts:342). U(건너뜀 · techError · 판정 없는 AI 질문 · 진행 시도)는 soloOutcomeOf(`src/core/session/attempt.ts:751`)가 가른다.
- ✅ 판 1 호환: 옛 종류의 머리 head(attempt.ts:36)는 v 1 · 2 를 모두 받고 새 칸은 모두 선택 칸이다. 그래서 대기열에 남은 판 1 시도가 거부되지 않는다. 꼬리표 없는 P10 미리보기는 v 1 로 읽고, 기기 대기열(`src/lib/attempt-queue.ts:66`)도 같은 parseAttemptInput 을 쓴다.
- ✅ 이어 하기: resumePointOf(attempt.ts:316)의 셋째 인자가 내지 않은 짝을 건너뛰고, loadSessionView 는 서버가 고른 skip 을 넘긴다(index.ts:1412).
- ✅ 서버가 다시 고른 짝만 받음: 짝 시도가 오면 저장된 첫 끝 시도와 이 묶음 앞의 끝 시도로 sparesFromFinals 를 다시 돌리고, show 에 없으면 거부한다(index.ts:878). 질문 짝은 AI 길로 보내지 않는다(index.ts:441, spec 설계 1 '채점').
- ✅ 끝내기: 서버가 고른 skip 을 빠진 활동에서 뺀다(index.ts:1010). 짝 · 같이 해 보기의 점수는 null 이라 세션 점수는 혼자 첫 시도만 세고, 단어별 정오는 짝만 낸다(spec 설계 8 '점수와 셈'). 영어로 말한 문장 수에는 같이 해 보기 · 짝의 말이 든다(`src/core/speaking/judge.ts:296`).
- ✅ 미리보기: PREVIEW_ACTIVITY 를 지우고 previewActivityNoOf(preview.ts:298)를 두었다. 만난 단어 질의 두 곳은 kind "preview" 와 P10 옛 행 조건으로 찾는다(index.ts:102 · `src/server/session/result.ts:77`, 정한 것 4).
- ✅ teach 없는 수업은 옛 차례 그대로다(session-preview 'AC-3c … teach 가 없는 같은 수업' 시험, spareCap 이 없으면 view.spares 는 null).
- ✅ 정한 것 9: 근거 열 · 기록 함수는 만들지 않았고, 시도 꼴에 사실(slot · aid · story · judge.bundle · communicative · expressionDone · techError)만 둔다.
- ✅ 위험 9: 3단계 단원 1 정규 시드 첫 수업의 활동 수를 직접 세니 말하기 42 · 쓰기 17 · 읽기 14 였다. 활동 번호 상한 200 과 겹치지 않는다.
- ✅ 0-다 의 met 이름(metWordsOf · metWords)은 그대로이고, 옛 이름 grep(얻은 · gotWord · data-got-)은 0 건이다.
- ⚠️ AC-3e 통합 시험 둘은 정적으로만 썼다. plan 위험 12 대로 CI 실행 기록이 생기기 전에는 AC-3e 를 닫지 않는다.

## 2. 잘한 점
- 기기와 서버가 같은 순수 함수 sparesFromFinals 를 쓰고, 서버는 묶음 안의 차례(found.batch)까지 맞춘다. 그래서 혼자 첫 시도와 짝이 한 묶음에 함께 와도 같은 답을 내며, 통합 시험이 이 경우를 따로 덮는다.
- 시험 견본을 손으로 만들지 않고 3단계 정규 시드 셋을 읽는다(`tests/fixtures/seed/builders.ts:1930`). 상한도 seed/settings.json 에서 읽어 숫자를 다시 적지 않았다.
- AC-22b 다섯 시험이 브리프의 갈래(빈 목록 · 읽기 둘 · 말하기 여섯에서 앞 넷 · U 뺌)와 쓰기 첫 시도 기준을 덮고, '차례 번호는 낸 짝과 상관없이 같다'도 단언한다.
- 따라 말하기의 '틀림'을 화면의 결과 말과 같은 셈(bestMatchRate · any-word · 경계값은 위 말, `src/components/session/speaking.tsx:185`)으로 정해서, '왜'와 짝이 서로 다른 기준으로 갈릴 틈을 줄였다.

## 3. 지적
Critical 없음. Important 없음.

- **M1 판 1 머리가 판 2 칸도 받는다**(attempt.ts:36 · 48~61). head() 는 v 1 · 2 를 모두 받으면서 옛 종류에 slot · aid · techError · story · judge 를 더했다. 그래서 v 1 꼬리표 시도도 새 칸을 지닐 수 있다. 지금 화면은 끝 시도를 `v: 1` 로 고정해 보낸다(`src/app/(child)/session/[id]/session-frame.tsx:574`). 라-2 가 이 줄을 그대로 두고 aid 를 채우면, 평가 plan 의 채움 함수는 '도움을 쓰지 않음(판 2 인데 aid 없음, spec 설계 8 읽기 도움 문단의 기기 출처 독립)'과 '도움을 기록하지 않던 옛 시도(판 1)'를 가를 수 없다. 판 1 은 옛 칸만 받게 나누거나, 적어도 라-2 브리프에 '끝 시도 판은 INPUT_VERSION' 을 넣고 장부에 남기기를 권한다.
- **M2 시도 꼴 이름이 plan 이름 표와 다르다**(attempt.ts:61). communicative · expressionDone 이 judge 안에 있지만, plan 53~64줄 표는 judge 옆 칸으로 적었다. 꼴 자체는 합리적이다. 다만 다 · 바 · 평가 plan 이 같은 이름을 쓰도록 plan 이름 표나 장부를 한 줄 고친다(구현 보고 '이름 표와 다른 곳' 1~4 도 함께 옮긴다).
- **M3 쓰기 서버의 activitiesOf 호출에 teach 가 빠졌다**(`src/server/writing/index.ts:213` · `composition.ts:163` · `:720`, 구현자 우려 3). 지금은 guided · composition 시드에 teach 가 없어 이 길에 닿지 않는다. 그러나 4~5단계에 teach 가 생기면 세션 서버(여섯 자리)와 쓰기 서버(옛 차례)의 활동 번호가 어긋나고, 쓰기 확인 · 초고 · 고쳐 쓰기가 not_found 로 막힌다. 정한 것 1 의 '활동 차례 · 서버 · 화면이 같은 갈래'에 맞추려면 세 곳에 lesson.teach 를 넘기거나, 둘째 묶음을 시작하는 조건으로 장부에 올린다.
- **M4 기기가 짝을 고를 맥락(OutcomeContext)을 만드는 공용 함수가 없다.** 서버는 scoringOf(index.ts:385~394)로 맥락을 만들지만, 기기는 통합 시험처럼 repeatGoodRate = matchPhraseLevels[0] · appJudgedQuestions = view.appJudged 를 손으로 맞춰야 한다. 정한 것 3 의 '기기 · 서버가 같은 함수'를 맥락까지 지키려면, 화면 자료의 설정에서 맥락을 만드는 순수 함수를 core 에 두고 라-2 가 그것을 부르게 하기를 권한다.

## 4. 구현자 우려의 심각도
1. 화면 연결(라-2 전 멈춤): 범위 밖이며 plan 순서대로다. 다만 영향은 보고가 적은 '짝 자리'보다 넓다. 지금 화면은 today · model · together 를 그리지 않고(session-frame.tsx:301 default 는 null) `v: 1` 로 보내므로, 판 2 전용 종류가 거부되어 첫 활동부터 끝낼 수 없다. 라-2 가 끝나기 전에는 3단계 teach 시드를 아이가 쓰는 DB 에 적재하지 않는다는 조건을 장부에 둔다.
2. 시험 설정 고정값: 보정에서 풀렸다. 짝 상한 세 키가 들었고 값이 seed/settings.json 과 같다.
3. 쓰기 서버 teach: Minor(M3).
4. AI 판정 질문은 judge 가 없으면 U: 설계와 맞는다. 3단계 질문의 끝 시도가 대기열로 오는 길은 건너뜀뿐이고(needsAiPath), 이는 정한 것 3 의 U 정의에 든다. 다 의 evaluateAnswer 가 혼자 질문 끝 시도에 judge 를 남겨야 질문 짝이 나온다는 점을 다 브리프에 적는다.
5. 따라 말하기 틀림 기준: spec 설계 1 '틀린 뒤 차례' 표의 따라 말하기 행 경계('잘 말했어요'가 아니면 '왜')와 같다. 설계 1 '첫 시도에 틀린 혼자 문항의 짝' · AC-7b '첫 시도 맞음'과도 어긋나지 않으므로 결함이 아니다. 라-3 이 '왜'를 띄우는 조건도 soloOutcomeOf 를 부르게 하면 두 기준이 갈리지 않는다.
6. 통합 시험 미실행: 결함이 아니며 1절의 ⚠️ 와 같다. CI 첫 실행에서 확인한다.

## 5. 판정
**Approved.** 필수 fix 항목은 없다. Minor M1~M4 는 컨트롤러가 직접 고치거나 장부(라-2 · 다 브리프, 둘째 묶음 시작 조건)에 올린다.
