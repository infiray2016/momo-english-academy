# 코드 검토: 가르치고 배우는 수업 묶음 라-3(말하기 연결) — 2026-10-30, 검토자 Opus · xhigh

판정: **Changes Requested** (Critical 0 · Important 1 · Minor 3). fix 라운드 항목은 I1 하나다. 범위는 보고의 바뀐 파일이다(tests/.tmp/l3-samples 는 보지 않음). 직접 확인한 것은 둘이다. 바뀐 파일 열하나의 biome check 오류는 0 이고, 단위 셋(speaking-teach · together-speaking · teach-frame)은 59 통과다(04:56). e2e 는 정적이다.

## 1. 설계 준수
- ✅ 틀린 뒤 차례(설계 1 표) 셋.
  - 따라 말하기: 첫 시도 결과 말이 '잘 말했어요'가 아니면 '왜'(앱 문구 '끊어서 다시 들어 봐요.') → '한 번 더 말하기' → 시드 chunks 로 끊어 들려준 뒤 다시 말한다. 상한은 없고 점수는 지금 규칙이다(repeatTeachStageOf · chunksOf — 조각을 이은 글이 문장과 다르면 문장 하나).
  - 듣기 이해: '왜'(시드) → '한 번 더 풀기' → 대본 다시 + 답 덩어리(retryHighlight)를 speech.rate.<구간> × speech.slow_rate_factor 로 읽는다. 둘째 틀림은 정답이다.
  - 질문 답: 부분 · 다시면 '왜'(시드) → '한 번 더 말하기' → 바른 답(시드 modelAnswer)을 보이며 들려줌 → '같이 말해 볼까요' → 결과 말 없이 다음이다(judgedQuestionStageOf). 아이 말의 틀린 곳은 짚지 않는다.
- ✅ 이야기 화면(설계 5): 라-1 StoryScreen(글자 없음 · 저절로 한 번 · 다시 듣기 한 번 · 다음)에 sound-retry 를 붙였다. heard · replayed 는 시도 꼴 story.replayed 로 남고, 소리로 못 들었으면 techError speak_fail(U)이다(questionFinalOf). 질문 화면은 영어 질문과 뜻을 보이고 이야기 글은 없으며, 인식 글은 5-나 HeardLine 이다.
- ✅ 판정 글자 없음(AC-5d): 단계에 판정 글자가 없고, 맞음은 '잘 말했어요'(결과 말, C39)다. AI 피드백 한 문장은 맞음일 때만 보이고, 서버가 판정을 바꾸면 null 이다(정한 것 6). 가르치는 수업의 부분 · 다시에는 AI 글이 없다(6.2).
- ✅ 'AI 쉬는 중'(설계 10): 판정 응답 ai_resting 이나 열 때 aiQuestionsResting 이면, 지금부터 남은 혼자 질문(그 앞 이야기 포함)을 skipped ai_rest 끝 시도로 넣는다(aiRestSkipsOf → judge.ts skipAfterAiRest). 그 짝은 soloOutcomeOf 가 U 로 보아 내지 않고, 되짚기에서도 U 다. 질문 짝 · 같이 해 보기(앱 판정)는 남는다.
- ✅ 같이 해 보기 S5~S7: 누가 자리 고르기 뒤 같이 말하기, 틀만 보고 말하기이고 허용 답 일치율로 채점한다. 맞으면 rightKo 를 읽고 칭찬 표지 뒤에 넘어간다. 틀리면 wrongKo → 바른 답 → 맞힐 때까지다. 시도 꼴은 together({choice, heard} 한 시도 — 공용 togetherOutcomeOf 계약)이고 점수 · 근거 밖이다.
- ✅ 짝: 질문 → 듣기 → 문장 → 낱말 차례(나 spareActivities)다. 질문 짝은 이야기 뒤 앱 판정(judgeSpeakingQuestion · view.meaningWords, 서버 spareQuestionResult 와 같은 함수)이다. 짝도 틀리면 바른 답(질문 짝은 들려줌)과 짝 '왜'만 보이고, '다음'은 줄을 읽은 뒤 밝다(라-2 I1 과 같은 꼴).
- ✅ 다른 묶음 파일: 라-1 조각 · sound-retry · recap · result · evidence · attempt · judge · spare-outcome · server/speaking 은 라-3 작업보다 먼저 고쳐졌고(02:09~02:52) 흔적이 없다. story.tsx · together.tsx 의 '라-3' 글은 라-1 주석이다. repeat.tsx 를 고치지 않은 것도 맞다. 그것은 배치 평가의 RepeatAnswer 이고, 세션 따라 말하기는 speaking.tsx RepeatActivity 다.
- ✅ 설정값: 느린 빠르기는 새 키 speech.slow_rate_factor(0.8, 고급, 잠정)다. seed/settings.json:119 · p13d 12절 사본(specs/09-설정값.md:99) · 시험 고정값(:173)에 넣었고, 코드에 0.64 같은 고정 값이 없다. 기존 키(speech.rate.<구간>)만으로는 '더 느리게'를 나타낼 수 없으므로 새 키가 필요하다. 13절 한 줄과 정본 12절은 컨트롤러 몫이다.
- ❌ AI 질문의 '같이 말해 볼까요' 뒤 말(I1).

## 2. 지적
- **I1 AI 질문의 echo 가 따로 된 진행 시도 행으로 저장되어 '오늘 영어로 말한 문장'과 근거에서 빠진다**(session-frame.tsx queueEcho :925~940, 우려 1 · 요청 1). 판정 근거는 셋이다.
  - (가) 정본 03:112 '오늘 영어로 말한 문장'은 '말하기 · 회화에서 인식 글이 있는 영어 발화를 한 번에 하나씩 모두 센다'고 한다. 델타 spec 설계 8 '점수와 셈'도 같이 해 보기 · 짝의 말까지 넣는다. 그러나 englishSentencesOf(judge.ts)와 끝내기는 끝 시도만 읽어 이 발화를 세지 않는다.
  - (나) 델타 spec 설계 8 표와 정본 3.8 '세 영역 수업의 자리'는 '왜' 뒤 같은 문제 다시를 '같은 행의 도움받은 시도(말하기 질문은 echo)'로 정한다. 정본 04 는 근거를 행마다(끝 시도 행 하나) 두고, 근거 계산은 그 칸만 읽는다고 한다. 따로 된 행은 바 의 teachEvidenceOf(끝 시도 · retry echo)가 읽지 못한다.
  - (다) 1~2단계 질문은 이미 echo 를 끝 시도 꼴의 칸으로 둔다(attempt.ts question 꼴 echo). 그러니 셈 함수가 진행 시도까지 읽게 바꿀 것이 아니라, echo 를 같은 끝 시도 행에 합쳐 저장하는 것이 정본에 맞다.
  - 고칠 방법: 서버가 같은 활동의 저장된 AI 질문 끝 시도에 echo 를 더하는 길을 둔다. 예를 들어 evaluateSpeakingAnswer 를 같은 clientAttemptId + echo 로 다시 부르면 그 행의 input.echo 와 word_count 를 채우고 AI 는 다시 부르지 않는다. 또는 접근 확인 · Zod 를 갖춘 작은 서버 액션 하나를 둔다. 그러면 queueEcho 진행 시도는 지운다. englishSentencesOf · teachEvidenceOf 는 고칠 필요가 없다.
  - 이 고침은 다 의 파일(src/server/speaking/index.ts · src/server/actions/speaking.ts)에 닿는다. 그러니 컨트롤러가 라-3 fix 에 그 두 파일을 허용하거나 따로 맡긴다. 시험은 '같은 시도 id + echo 로 부르면 끝 시도 행에 echo 가 들고 AI 호출 수는 그대로'(통합, 정적)와 englishSentencesOf 셈 단위 하나다.
- **M1 질문 · 읽기 문항을 선생님 영어 목소리로 읽지 않는다**(요청 4, '설계와 다르게 한 것' 14). 델타 spec 설계 4 목소리 표는 '질문 · 읽어 줄 때의 읽기 문항 · 바른 답'을 선생님 영어 목소리 쪽에 둔다. 지금은 말하기 질문과 라-2 의 읽기 문항이 세션 접점(지금 목소리)으로 읽는다. 라-2 검토에서 이것을 짚지 못했다. teach 수업에서 voicedSpeech 로 바꿀지, 지금처럼 둘지는 컨트롤러가 정한다. 바꾼다면 세 영역 문항 읽기 자리 몇 줄이다.
- **M2 판정 요청이 invalid · not_found 면 끝 시도 없이 넘어간다**(우려 4, '설계와 다르게 한 것' 11). 끝내기는 그 활동을 빠진 것으로 보고 다시 그 질문으로 돌린다. 같은 까닭(예: 세션이 진행이 아님)이면 다시 실패할 수 있어 돌아오는 길이 생길 수 있다. 드문 갈래이고 unavailable 은 같은 시도 id 로 다시 보내므로 막힘은 아니다. 장부에 확인 항목으로 둔다.
- **M3 7-가 · iPad 로 넘길 것**(우려 2 · 3 · 요청 3). 7-가 화면 검토로는 네 가지를 넘긴다. (가) 이야기 소리 실패 때 작은 '다시 듣기'와 sound-retry 큰 '다시 듣기'가 함께 보임, (나) 낱말 따라 말하기의 '끊어서 다시 들어 봐요.'(낱말은 chunks 가 없어 그대로 다시 들려줌), (다) S5 에서 맞은 보기를 골라도 빈칸이 채워져 보이지 않음, (라) '왜' 말풍선 · 단추의 자리다. 음성 점검(장부 L-2)으로는 네 가지를 넘긴다. 끊어 들려주기 쉼, 느린 빠르기(1~3구간 0.64)를 사파리가 받는지, 이야기 저절로 들려주기가 앞 누름의 잠금 풀기로 이어지는지, 바른 답을 읽는 중 '말하기'를 누르면 끊기는지다. 실호출 확인(가변부 이야기 줄 · 기다림 · ai_resting 때 남은 질문 건너뜀)도 함께다.

## 3. 구현자 판단
- 새 파일 pieces.ts: 타당하다. pacedSpeech 와 같은 speakInTurn 길이고 들림을 speakHeardOfAll 로 모아 0-라 규칙 안이다.
- 질문 답 새 조각 JudgedQuestionActivity: 타당하다. teach 없는 1~2단계 화면(QuestionAnswerActivity)은 그대로이고(정한 것 1), 3단계 이상 AI 질문(teach 없음 포함)은 plan-p11c 값 4 를 당긴 정한 것 5 범위다.
- AI 피드백을 맞음일 때만: 정한 것 6 · 6.2 에 맞는다.
- 기기 짝 고르기용 사본 savedQuestionInputOf: 서버 judgeSpeakingQuestion 에 서버가 돌려준 합친 판정을 AI 자리로 넣어 다시 센다. 의미 실패면 '다시', 묶음과 문턱 이상이면 맞음, 그 밖은 넣은 판정 그대로이므로 세 갈래 모두에서 final 이 서버와 같다(시험 'AC-22c 서버가 저장한 끝 시도를 …'). 보내지 않는 기기 몫이고 서버 값이 정본이라 어긋날 위험은 맥락(품사 표)이 다른 때뿐이다. 맥락은 view.meaningWords 로 같다.
- recorded 에서 appJudged 조건을 뺀 것: AI 질문이 이제 서버 액션으로 끝 시도를 남기므로 맞다.
- aiQuestionsResting(열 때 쉼): 설계 10 '말하기 3단계는 혼자 질문 · 이야기만 건너뜀'과 맞는다.

## 4. 시험 · 관문
- 시험 36 의 이름이 정본 AC-22c · 4d · N20 · 5d · 3k · N19 를 품고 갈래를 덮는다. 끊어 들려주기 · 듣기 다시 · 질문 '왜' → 같이 말해 볼까요 · 이야기 → 질문 · 이야기 소리 없음 U · 판정 글자 없음 · AI 쉬는 중 · 짝 차례 · 짝 자리 · 같이 해 보기 S5 · S6 · 기기 몫 사본이다. e2e 견본(lessons.ts teachSample)에 말하기 승인 수업(seed/lessons/speaking/3/1.json 배정 1 · 변형 1)이 들어갔다. 빠진 갈래는 I1 의 echo 저장 · 셈이다.
- 관문(구현자 보고 그대로, 04:4x~04:5x): lint 0(533 파일) · tsc 0 · test 1501 통과 · check:deps 0 · check:ids 0(design-number 47) · spec:trace 0(unknown-ac 0) · build 0 · check:bundle 0 · 세션 첫 JS 25 덩이 3D 0.

## 5. 판정
**Changes Requested.** fix 1: I1(서버 두 파일 허용 여부는 컨트롤러). M1 은 컨트롤러 결정이고, M2 · M3 은 장부 · 7-가 · 음성 점검으로 넘긴다.
