# 코드 검토: 가르치고 배우는 수업 묶음 사(되짚기 마무리 줄) — 2026-10-30, 검토자 Opus · xhigh

판정: **Changes Requested** (Critical 0 · Important 1 · Minor 3). fix 라운드 항목은 I1 하나다. 범위는 `src/core/session/recap.ts`(신규) · `src/server/session/result.ts`(recapOf · ResultView.recap) · `tests/unit/session-recap.test.ts`(신규)와 컨트롤러가 더한 고정값 두 줄이다. 시험 파일 하나는 직접 돌렸다(11 통과).

## 1. 설계 준수
- ✅ 네 갈래: 해냄은 첫 시도 맞음 또는 짝 첫 시도 맞음이다(recap.ts:161~187). 도움 기록(aid 의 readAloud · gloss)과 의사소통 정답(judge.communicative)은 독립 해냄이 아니고 분모에 남는다. 짝도 틀림 · 짝 없음 · 상한으로 못 낸 짝은 '해내지 못함'으로 분모에 남는다. 첫 시도를 판정하지 못한 문항은 U 로 뺀다. 문턱 판정은 '유효 문항 ≥ lesson.recap_min_evidence 이고 비율 ≥ lesson.recap_can_ratio'다(recap.ts:210~225). 정본 03 세션 결과 행(`specs/03-화면.md:26`) · AC-6g(`specs/11-요구사항과-수용-기준.md:99`)과 같다. 단, 낸 짝을 판정하지 못한 문항은 다르다(I1). 하한은 브리프의 '유효 독립 기회 수'가 아니라 정본의 '유효 문항'을 따랐고, 그것이 맞다.
- ✅ 같은 차례 · 맥락: recapOf(result.ts:123~170)는 sessionContextOf · scoringOf(품사 표 포함)를 쓴다. 시도를 attempted_at 차례로 읽어 firstFinalsOf 로 첫 끝 시도를 고른다. 혼자 · 짝 판정은 soloOutcomeOf · spareOutcomeOf 이고, 짝 고르기 · 지표와 같은 함수다.
- ✅ 문턱은 설정 두 키로만 읽는다. 숫자를 코드에 두지 않았다. teach 없는 수업과 쓰기 draft 세션은 recap 을 싣지 않는다(정본 '쓰기 6단계 이상은 둘째 세션 결과에만').
- ✅ 다른 묶음 파일: attempt.ts · judge.ts · spare-outcome.ts(02:19~02:20) · spares.ts(02:00)는 사의 파일(02:29)보다 먼저 고쳐졌다. 그 diff 에는 recap 흔적이 0 건이다. 커밋 전 변경이 섞여 있어 git diff 로 묶음별로 가를 수는 없지만, 수정 시각과 내용으로 보아 손대지 않았다. 고정값 두 줄(`tests/fixtures/settings.ts`, 2 · 0.8)은 seed/settings.json 과 같다.

## 2. 구현자가 '설계와 다르게 한 것' 넷
1. **상한으로 못 낸 짝 → 분모 안 '해내지 못함': 구현자가 맞다.** 정본 03:26 은 '도움 기록이 붙은 것과 의사소통 정답, 상한 때문에 짝을 내지 못한 문항은 독립 해냄이 아니다'라고 하고, U 는 '판정하지 못한 문항(인식 실패 · AI 쉬는 중 · 소리가 나지 않은 듣기 등 기술 오류)'로만 정한다. AC-6g 도 상한 문항을 '독립 해냄으로 세지 않는다'에 넣었다. 브리프 표의 '분모에서 뺌'은 정본과 어긋나고, 정본이 우선한다(C186).
2. **입력 꼴 변경: 타당하다.** 목표 연결과 짝 판정에는 수업 내용 · 활동 차례 · 첫 끝 시도 · 채점 맥락이 필요하다. sparesFromFinals 와 같은 꼴이라 서버 · 지표가 같은 재료를 넘긴다.
3. **낸 짝이 U 면 그 문항도 U: 근거가 없고 '해내지 못함'이 맞다(I1).**
4. **결과 자료에 줄 이름 · 근거만: 타당하다.** 브리프의 결과 꼴({ line, evidence })과 같다. 라-4 는 teach.recap 글(closeKo · closeKoPracticed · 문장 틀)을 결과 자료에 더해야 한다. 라-4 브리프에 적는다.

## 3. 지적
- **I1 낸 짝을 판정하지 못한 문항을 U 로 뺀다**(recap.ts:182 `if (spare === "unscored") return "unscored";`, 시험 session-recap.test.ts:422). 정본의 U 는 '판정하지 못한 문항'이고 예시는 모두 그 문항 자체의 판정 실패다. 이 경우 혼자 첫 시도는 판정되었고(틀림), 짝 첫 시도도 '맞음'이 아니다. 그래서 정본의 해냄 정의('첫 시도가 맞았거나 그 짝의 첫 시도가 맞았으면')를 채우지 못한다. 정본은 짝 근거가 없는 같은 꼴(상한으로 못 낸 짝)을 분모에 남기라 했다. U 로 빼면 틀린 문항이 분모에서 사라져, 독립 근거 없이 '할 수 있어요'(closeKo)가 나올 수 있다. 예를 들어 맞음 둘에 '틀림 → 짝 소리 없음' 하나면 2/2 로 closeKo 이고, 정본대로면 2/3 으로 closeKoPracticed 다. 이는 C175 (4) · C177 (1) '독립 수행 근거가 모자라면 단정하지 않는다'와 반대 방향이다. 고칠 방법: 짝 결과가 unscored 면 'not_done' 으로 두고, 시험(:422)의 기대를 not_done 으로 바꾼다. 줄 판정 단언도 하나 더한다(위 예).
- **M1 1~2단계 앱 판정 질문에서 맞음과 의사소통 정답을 다른 함수로 가른다**(recap.ts:133~140, 우려 3). 맞음은 soloOutcomeOf → questionResult(judgeAppAnswer, 의미 검사 없음)이고, 의사소통 정답은 judgeSpeakingQuestion 이다. 의미 검사에 걸리지만 일치율은 넘는 답이면 맞음이면서 judge 의 communicative 는 비어 '독립 해냄'이 된다. 지금 teach 수업은 3단계뿐이고 3단계 혼자 질문에는 서버가 쓴 judge 가 있으므로 닿지 않는다. 다 검토 M3(의미 검사를 Do 질문 꼴 밖에 거는 문제)과 같은 뿌리이므로 그 장부 항목(둘째 묶음 시작 조건)에 함께 둔다.
- **M2 '같은 문제 다시'에서 맞힌 문항을 보는 시험이 없다**(session-recap.test.ts, readSolo 의 틀림은 시도 하나뿐). 정본은 해냄을 첫 시도 · 짝 첫 시도로만 정한다. tries [틀림, 맞음] · 짝 없음 → not_done 인 단언을 하나 더하면, 뒤 시도가 해냄으로 새는 퇴행을 막는다. 유효 문항 = minEvidence 경계(같으면 closeKo)도 함께 단언하면 좋다.
- **M3 recapOf 를 단언하는 통합 시험이 없다**(우려 2). session-flow 'AC-3e 가르치는 수업 짝'이 teach 수업으로 loadResultView 를 부르므로 길은 지나간다. 다만 recap 값을 보지 않는다. 그 시험에 `result.recap` 의 line · evidence 단언 한 줄을 더하고, CI 첫 실행에서 확인한다.

## 4. 시험 덮음(요청 목록)
11 개가 '모두 맞힘 · 짝으로 되찾음 · U 제외(하나만 남음) · 유효 모자람 · 모두 U · 읽어 주기 · 뜻 보기(혼자 · 짝) · 의사소통 정답(judge 있음 · 없는 짝) · 상한 · 낸 짝 U · 문턱 설정값(경계 2/3 포함) · 첫 목표만 · teach 없음'을 덮는다. 빠진 갈래는 M2 뿐이다. 이름은 모두 정본 'AC-6g' 를 품어 spec:trace 에 걸린다.

## 5. 관문(구현자 보고 그대로, p13d 02:30)
lint 종료 0(504 파일) · tsc 종료 0 · test 종료 0(114 파일 · 1296 통과 · 6 todo) · check:deps 종료 0 · check:ids 종료 0(design-number 47 · fixture-setting 0, 이 묶음 파일 경고 0) · spec:trace --fail-on unknown-ac 종료 0(unknown-ac 0 · missing-test 16). 검토자 직접 실행: session-recap 11 통과(02:42).

## 6. 판정
**Changes Requested.** fix 1: I1. Minor M1~M3 은 컨트롤러가 직접 고치거나 장부에 올린다(M1 은 다 M3 항목에 합침).
