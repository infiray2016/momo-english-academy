# 코드 검토: 가르치고 배우는 수업 묶음 다(판정) — 2026-10-30, 검토자 Opus · xhigh

판정: **Changes requested** (Critical 0 · Important 1 · Minor 5). fix 항목은 I1 하나다. 범위는 구현 보고의 바뀐 파일이고(attempt.ts · judge.ts 는 이 묶음 몫 줄만), 시험은 다시 돌리지 않았다.

## 1. 설계 준수
- ✅ 판정 차례(spec 설계 8 · 정한 것 6): judgeSpeakingQuestion(`src/core/speaking/judge.ts:130`)은 의미 검사가 실패하면 AI 와 상관없이 '다시'이고 judge.ai 에 원 판정을 남긴다. 의미가 맞으면 두 묶음 가운데 높은 쪽이 문턱 이상일 때 맞음이다(같으면 accepted). 둘 다 문턱 아래면 AI 판정을 따르고, AI 가 없으면 '다시'다. communicative · expressionDone 은 judge 안에 있다(plan 이름 표).
- ✅ 증명 절 '말하기 질문 판정의 증명': 항목마다 시험이 있고 단언이 맞다.
  - 의미 검증 긍정: `tests/unit/speaking-meaning.test.ts:156`(정규 시드 52개) · `speaking-judge.test.ts:507`
  - 부정: `speaking-judge.test.ts:468`(문턱을 넘는 글 다섯의 일치율도 단언)
  - 가르기: `speaking-judge.test.ts:517`
  - 일관성: `speaking-judge.test.ts:562`(AI 세 갈래 × 허용 답 · 부정 글, 부분 + 'Yes, they do.', 맞음 + 'Yes, they drink milk.' → '다시'). 증명 절의 'They have pizza.'는 eat 이 빠져 key 에 걸리므로, 알려진 차이를 의미가 맞는 다른 글로 잰 것은 타당하다.
  - 통합: `tests/integration/speaking-eval.test.ts:120` · `:177` · `:406`(A9 · AC-N19)
- ✅ 쓰기 까닭(정한 것 8): writingWhyOf(`src/core/writing/why.ts:79`)는 차례 → 대문자 → 마침표 차례로 가르고, 둘 다 틀리면 대문자 하나다. 앱 문구 둘은 spec 설계 5 표의 글자 그대로다. 시험은 writing-why 넷과 `session-attempt.test.ts:1265` 다.
- ✅ 서버 액션: evaluateSpeakingAnswer 의 첫 문장이 requireAccess 다. 입력은 Zod 로 보고, AI 는 P9c evaluateSpeaking(목적 speaking_eval)로만 부른다. 같은 시도 id 와 같은 활동 끝 시도는 저장된 결과를 돌려준다. 안전 상한이면 시도 없이 ai_resting 이고, techError 는 AI 없이 U 다. 점수는 합친 판정이다(`src/server/speaking/index.ts:180~372`). 로그에는 오류 이름만 남는다.
- ✅ 1~3단계 새 자리 AI 0회: 질문 짝은 AI 길이 아니고, 같이 해 보기는 question 종류가 아니다. 이야기 줄은 시드 글이라 NFR-4 의 '보내는 것'이 늘지 않는다(`src/core/ai/calls/speaking.ts:147`).
- ✅ 근거 칸(정한 것 9)은 만들지 않았다. 문턱은 설정값이다. 점수 1 · 0.5 · 0 은 3.7 · plan-p11c 값 2 의 규칙 값이다.
- ✅ 품사 표(정한 것 7 · C187): meaningWordsOf(`src/server/speaking/words.ts:17`)는 DB 를 넓게 거른 뒤 순수 함수 meaningWordsFor 로 표를 정한다. SQL 은 열 꼴(parts_of_speech text[] · forms jsonb)과 맞는다.
- ⚠️ 통합 시험 여덟과 words.ts SQL 은 정적 작성이다. CI 첫 실행 전에는 AC-22k 통합 몫을 닫지 않는다(plan 위험 12).

## 2. 잘한 점
- 판정 함수 하나를 혼자 질문 · 짝 · 같이 해 보기 · 서버 저장(withAppJudge) · 지표가 함께 쓴다. 일관성 시험은 이 함수 하나에 AI 세 갈래를 넣어 C182 (2)를 직접 단언한다.
- 서버가 기기가 보낸 짝 · 같이 해 보기 judge 를 믿지 않고 저장 때 다시 쓴다(`src/server/session/index.ts:918`). 통합 시험도 이를 본다(speaking-eval:346).
- 나 fix 1 우려 1(서버 scoringOf → outcomeContextOf)을 함께 닫았다(index.ts:393).

## 3. 지적
- **I1 같이 해 보기 판정이 저장된 행에서 첫 시도의 고른 보기를 보지 않는다**(`src/core/session/spare-outcome.ts:185`). togetherOutcomeOf 는 judge 가 있으면 곧바로 judge.final 을 돌려준다. 그런데 서버는 말하기 같이 해 보기의 judge 를 '처음 말한 글이 든 시도'로 매긴다(`src/core/session/attempt.ts:757~766`). 말하기 3단계 같이 해 보기 0 은 누가 자리를 고른 뒤 같이 말하는 꼴이다(choices · answerNo · accepted). 그래서 tries 가 [{choice: 틀림}, {choice: 맞음, heard: 바른 말}]이면, 저장된 행의 첫 시도는 틀렸는데 '맞음'으로 센다. 서버가 말이 든 행에는 늘 judge 를 쓰므로, 지표(FR-10 '같이 해 보기 첫 시도 정답률' · spec 설계 8 표 360줄)는 저장된 행에서 늘 이렇게 센다. 이 지름길은 아 검토 I1 의 권고에서 왔고, 그 권고가 고르기와 말하기가 함께 있는 문항을 고려하지 않았다. 고칠 방법: 늘 tries[0] 의 칸마다 정오를 보고, judge.final 은 tries[0] 에 말이 있을 때 그 말의 정오로만 쓴다. 시험을 하나 더한다(judge 가 correct 이고 tries[0] 의 고른 보기가 틀림 → wrong).
- **M1 대기열로 온 혼자 질문 시도의 judge 가 그대로 저장된다**(attempt.ts:768 의 '그 밖은 그대로'). 3단계 혼자 질문은 건너뜀 끝 시도만 대기열로 오고, 1~2단계 질문 판정은 judge 를 쓰지 않는다. 그런데도 기기가 judge 를 붙여 보내면 그 값이 시도 꼴에 남는다. 지금 점수 · 짝 고르기는 skipped 와 앱 채점을 먼저 보므로 영향이 없다. 하지만 '서버 값이 정본'(spec 설계 9)과 뒤의 근거 채움(바)을 생각하면, activity.kind 가 question 이면 withoutJudge 로 빼는 편이 안전하다.
- **M2 바꿔 말하기에 표현 수행이 참으로 남는다**(judge.ts 의 bundled · `speaking-judge.test.ts` 끝 단언 'Pizza, they eat.' + AI 맞음 → accepted · expressionDone true). spec 설계 9 는 표현 수행을 '목표 표현을 다 갖춰 말했는가'로 정하고 'accepted 쪽일 때만 참'이라 했다. 문턱 아래 바꿔 말하기는 accepted 꼴과 맞지 않았으니, 글자대로는 맞아도 뜻에는 어긋난다. accepted 일치율이 문턱 이상일 때만 참으로 할지 컨트롤러가 정하고 장부에 남긴다.
- **M3 의미 검사를 Do 질문 꼴 밖에도 건다**(우려 4). 질문 짝 판정(spareQuestionResult)은 단계와 상관없이 judgeSpeakingQuestion 을 쓴다. 그러나 spec 설계 8 끝 문장은 이 검사를 '3단계 단원 1~4 의 Do 질문 꼴'에 맞췄다고 적었다. 1~2단계에 짝이 생기면, 혼자 질문(judgeAppAnswer)과 짝(의미 검사)이 다른 함수로 판정되어 C182 (2) 일관성이 깨진다. 둘째 묶음 시작 조건으로 장부에 올린다.
- **M4 A9 통합 시험의 단원 진행 행 검사는 지금 늘 참이다**(speaking-eval:460, 우려 6). 세션 끝내기는 unit_progress 를 쓰지 않으므로(쓰는 곳은 프로필 · 배치 평가뿐) 그 반복은 아무것도 걸러내지 않는다. 세션 점수가 같다는 단언은 의미가 있다. P12 단원 판정이 생기면 다시 쓰는 일을 장부에 남긴다.
- **M5 '같이 말해 볼까요' 뒤 말(echo)을 담을 자리가 없다**(우려 3). 서버 액션이 끝 시도를 먼저 저장하므로 3단계 혼자 질문의 echo 는 '오늘 영어로 말한 문장'(C12 · C41)에 들지 못한다. 라-3 브리프에 담을 자리(진행 시도 등)를 정하게 한다.

## 4. 구현자가 정한 것 둘 · 범위 밖 고침
- 품사 표 필수 칸: 타당하다. 표가 비면 대명사 · 기능어를 몰라 not 범위와 핵심 낱말이 조용히 틀어진다. 필수 칸이면 빠뜨린 자리가 타입 오류로 드러난다. 범위 밖 고침 넷은 이 필수 칸과 story 칸을 기계적으로 따른 것이다. spares.ts 의 SpareContextSource 에 칸 하나가 늘고 화면 자료가 그것을 싣는다. 지표 스크립트는 수업마다 표를 읽는다. 시험 맥락 한 줄씩과 고정값 story: null 도 같은 이유다. 나 · 아 의 꼴과 동작은 깨지지 않았다. 지표의 말하기 판정이 의미 검사를 거치게 된 것은 의도한 개선이다.
- AI 판정을 앱이 바꾼 때 피드백 · 문법 지적을 내지 않고, 맞음을 '다시'로 바꾸면 시드 바른 답을 쓴 것: 타당하다. 아이 반응이 짝과 같아야 하고(C182 (2)), 1~3단계는 아이 말의 틀린 곳을 짚지 않는다(spec 설계 1 '틀린 뒤 차례' 말하기 행). AI 가 맞음이라 한 답의 correctSentence 는 틀린 답을 되풀이할 수 있다.
- 공용 짝 채점: spareOutcomeOf · togetherOutcomeOf 는 지표가 쓰고, 사(되짚기)도 같은 입력 꼴(OutcomeContext)로 부를 수 있다. 다만 사는 독립 해냄을 가르려고 judge.communicative 와 aid 를 따로 읽어야 한다. attempt.ts 는 가져오는 방향 때문에 이 모듈을 부르지 못하지만, 같은 원시 함수(checkAnswer · judgeSpeakingQuestion)를 써서 판정이 같다.

## 5. 구현자 우려의 심각도
1 범위 밖 파일: 타당하다(4절). 2 정적 통합 · SQL: ⚠️, CI 첫 실행에서 확인한다. 3 echo: Minor(M5). 4 What · Where 꼴: Minor(M3). 5 그림 보고 말하기 제외: 설계대로다(정한 것 5). 6 A9 시험: Minor(M4). 7 라-3 연결: 범위 밖이다. 라-3 브리프에 evaluateSpeakingAnswer · skipAfterAiRest · view.meaningWords 와 판정 글자를 그리지 않음(AC-5d)을 넣는다.

## 6. 판정
**Changes requested.** fix: I1. Minor M1~M5 는 컨트롤러가 직접 고치거나 장부에 올린다(M2 는 컨트롤러 판단).
