# 코드 검토: 가르치고 배우는 수업 묶음 바(근거 값 함수 teachEvidenceOf) — 2026-10-30, 검토자 Opus · xhigh

판정: **Changes Requested** (Critical 0 · Important 1 · Minor 3). fix 라운드 항목은 I1 하나다. 범위는 `src/core/evidence/teach.ts`(신규) · `tests/unit/teach-evidence.test.ts`(신규)다. 시험 파일 하나는 직접 돌렸다(23 통과, 03:25). attempts.evidence 열이 없음은 `src/db/schema/learning.ts` 에서 확인했고(grep 0), 그래서 서버 두 파일을 손대지 않은 것은 브리프 조건대로다.

## 1. 설계 준수(값 대응)
- ✅ 같이 해 보기(AC-22e): validity practice · assist ["together"] · task 는 그 문항 type 이다(teach.ts togetherFacts). goals 빈 목록은 together 문항에 goal 칸이 없어서다. 정본 04 '정의 전 · 연결 모호면 비운다'와 맞고, 연습이라 기회도 아니다(우려 1 결함 아님).
- ✅ '왜' 뒤 다시(AC-22e · 22g): 같은 칸의 retry { assist, accuracy } 다. 읽기 · 듣기 · 쓰기는 tries[1] → retry_after_answer, 질문은 echo → echo, 따라 말하기는 둘째 인식 글 → model_heard 다. 정본 3.8 '세 영역 수업의 자리' 문단과 같다. retry 를 assist 목록과 나눈 것은 같은 행 안에서 독립 첫 시도와 도움 시도를 가르려는 것이라 타당하다. 첫 다시 하나만 보는 것도 맞다. 쓰기 둘째 틀림 뒤는 정답을 보고 놓는 일이라 근거가 아니다(우려 2). 단, 짝은 M3 을 본다.
- ✅ 짝(AC-22e · 22g): 새 칸이다. task · goals 는 짝을 둔 혼자 문항 것이고, ctx.item 은 `<key>:<종류>.<i>.spare`, ctx.example 은 짝 자극(.textEn · .script · .storyEn)이며, purpose 는 비운다.
- ✅ 읽기 도움(AC-22j): aid 의 readAloud · gloss 를 read_aloud · gloss 로 옮기고, 쓰지 않았으면 ["none"] 이며, 출처는 늘 device 다. 정본 04 '입력의 출처' 표('안 썼다는 독립으로 받되 출처 기기')와 같다.
- ✅ 노출(AC-22h): 말하기 질문만 판정하고, 질문 글에 있는 단원 단어는 question_word, 이야기에만 있는 것은 none 이다. 정본 3.8 노출 판정 '말하기의 노출 판정은 질문 글에만 건다' · 델타 spec 설계 8 · plan 이름 표와 같다. 선택지는 노출이 아니라 도움이고, 수업 문항의 보기 · 따라 말하기 본보기는 그 과제의 꼴이라 도움도 아니다(정본 A1 표). 그래서 우려 3 은 결함이 아니다.
- ✅ 기술 오류: techError speak_fail, skipped 를 정본 04 이름(recognition · no_mic · nospeech · ai_rest)으로 옮기고(stalled → recognition), 판정 칸 없는 AI 질문은 ai_fail 이다. 기기가 알린 것은 출처 device 다.
- ✅ NFR-15: 값은 단원 단어 원형 · 키 · 열거 값 · 수뿐이고 인식 글이 없다(시험 'AC-22k 근거 칸에 인식 글 원문이 없다').
- ✅ 순수 함수 · 경계: core 만 가져오고 server · DB 가 없다. 일치율 경계는 ctx.matchCut 으로 받아 숫자를 고정하지 않는다. 관문 check:deps 위반 0 은 구현자 보고 그대로다.
- ❌ 의사소통 정답의 정확도(I1).

## 2. 지적
- **I1 의사소통 정답의 정확도를 '맞음'으로 적는다**(teach.ts judgeAccuracy · judgeResult, 시험 'AC-22k AI '부분'이어도 … 맞음 + communicative'). 정본 3.8 근거 계산 규칙 A1 표의 두 행은 acceptedMeaning 으로 갈린 답을 '부분과 의사소통 정답 표시'로 적으라고 한다(`specs/02-3-어휘-복습-동기-점수.md:136 · :137`). 하나는 1~2 질문 답('… acceptedMeaning 쪽으로 갈린 답은 부분과 의사소통 정답 표시'), 다른 하나는 3~12 질문 답('AI 판정이 맞음이어도 … 부분과 의사소통 정답 표시')이다. A9 문단(:155)도 '정확도 부분과 의사소통 정답 표시를 남기는 것은 C175 (2)로 정해졌고 수준 값만 확인을 기다린다'고 쓴다. 정본 04 accuracy 칸(`specs/04-데이터.md:72`)도 같다. C182 (3)이 막는 것은 '수준 값의 운영 반영'이지 정확도 이름이 아니다. plan 정한 것 9 · 이름 표의 'A9 의 부분은 저장하지 않는다'는 정본(C183 반영)과 어긋나고, 정본이 우선한다(C186). 지금 꼴의 위험은 이렇다. 정본대로 짠 평가 plan 의 근거 상태 함수가 이 칸을 읽으면, 의사소통 정답을 독립 정답(2)으로 세게 된다. 이는 A9 를 반대쪽으로 정해 버리는 일이다. 정본 꼴('부분' + communicative)이면 A9 가 확정되어도 이 함수는 고칠 곳이 0 이고, 상태 함수의 수준 값만 바뀐다. 고칠 방법: judge.communicative 가 참이면 accuracy 를 'partial' 로 둔다. result.judge('correct') · bundle · communicative · expressionDone 은 그대로 둔다. AC-22k 시험 기대를 고치고, plan 정한 것 9 와 이름 표의 그 문장은 컨트롤러가 장부로 고친다. 컨트롤러가 plan 쪽을 지키려면 13절 한 줄로 정본을 먼저 바꿔야 한다.
- **M1 1~2단계 갈래가 정본 A1 표와 다르다**(우려 4, 지금 teach 수업이 3단계뿐이라 닿지 않음). (가) 1~2 질문 답: 허용 답이 있으면 judgeSpeakingQuestion 만 쓴다. 그래서 일치율이 match_cut 첫째 값과 answer_match_pass 사이인 답이 '부분'이 아니라 '오답'이 된다(A1 1~2 행). (나) 쓰기 1~3: writingWhyOf 의 대문자 · 마침표만 부분이고, A1 의 '글자 하나만 다르면 부분'(받아쓰기 · 빠진 글자)이 없다. 다 검토 M3(의미 검사를 Do 질문 꼴 밖에 거는 문제)과 함께 둘째 묶음 시작 조건으로 장부에 올린다.
- **M2 시험의 임시 경계가 평가 spec 기본값과 다르다**(`tests/unit/teach-evidence.test.ts:33` MATCH_CUT [0.6, 0.9]). 평가 spec 8절 설정 표의 evidence.match_cut 은 0.6 · 0.8 이다(`intent/2026-10-29-학습-평가-체계/spec.md:459`). 기본값에 맞춰 두면, 평가 plan 이 키를 넣을 때 시험 기대가 갈리지 않는다.
- **M3 짝 행에도 retry 를 적는다**(choiceFacts · 쓰기 · 따라 말하기 갈래, 우려 2 후반). 정본 3.8 은 '짝을 틀리면 그 기회는 0 이고, 바른 답 · 왜를 본 기록만 남는다'고 한다. 화면이 짝에 다시를 두지 않으므로 지금은 닿지 않는다. 그러나 다시 시도가 들어오면 상태 함수가 짝 기회를 도움 1 로 셀 수 있다. activity.kind 가 spare 면 retry 를 빼는 편이 정본을 코드로 지킨다.

## 3. 이름 표와 다른 곳 · 요청 둘
- retry 분리 · words 더함 · 인자 { lessonKey, lesson, activity, input, ctx }: 평가 plan 채움 함수가 그대로 쓸 수 있는 꼴이다. 채움 함수는 저장된 시도 행마다 활동 차례(activitiesOf) · 수업 행 · 채점 맥락(서버 scoringOf + matchCut)을 이미 가지므로 같은 인자를 만들 수 있다. words 는 정본 04 의 값(goal · purpose · demands · words 행)이라 더한 것이 맞다.
- 요청 1 evidence.match_cut: 기존 키로 갈음하지 않는다. 평가 spec 8절이 따로 정한 새 키(0.6 · 0.8, 바꾸는 길 '결정 기록 먼저')이고 정본 12절 · seed/settings.json · 시험 고정값에 아직 없다. 평가 plan 몫이며, 이 함수가 ctx 로 받는 지금 꼴이 맞다.
- 요청 2 lessonKey: 평가 plan 몫이다. 정본 04 는 ctx.item 을 '시드 행 id + 문항 번호'로 정하고 '코드 이름과 jsonb 꼴은 plan 이 정한다'고 한다. 시드 수업에는 id 칸이 없으므로(kind · lessonNo · variant · revision …), 행 uuid 와 시드 경로 키 가운데 무엇으로 할지는 근거 칸의 주인인 평가 plan 이 정한다. '새 예시' 판정이 개정 사이에도 같은 문항을 알아봐야 하므로, 시드 경로 키(영역 · 단계 · 단원 · 종류 · 번호 · 변형)를 권한다.

## 4. 시험 · 관문
- 시험 23 은 describe 이름에 AC-22e · 22g · 22h · 22j · 22k 를 품는다. AC 다섯의 근거 몫 갈래(같이 해 보기 practice · 다시 셋 · 짝 새 칸 · 두 목표 목록 · 질문 속 낱말 · 이야기 낱말 none · 읽기 도움 셋 · 의사소통 정답 · 원문 없음)를 덮는다. 수준 셈(22g 의 1 · 2 · 0, 22h 의 2, 22j 의 최대 1)은 근거 상태 함수가 생긴 뒤 평가 plan 이 덮는다. 빠진 갈래는 I1 의 '부분' 기대와 M3 의 '짝에는 retry 없음'이다.
- 관문(구현자 보고 그대로, 03:2x): lint 종료 0(519 파일) · tsc 종료 0 · test 종료 0(118 파일 · 1391 통과 · 6 todo) · check:deps 위반 없음 · check:ids 종료 0(design-number 47, 새 파일 0) · spec:trace --fail-on unknown-ac 종료 0(unknown-ac 0 · missing-test 16).

## 5. 판정
**Changes Requested.** fix 1: I1. Minor M1~M3 은 컨트롤러가 직접 고치거나 장부에 올린다(M1 은 다 M3 항목과 합침).
