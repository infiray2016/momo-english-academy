# 편집 보고: plan-p11a 완료 보고 채우기(문서 반영 편집자 edit-p11a-done · Opus · high, 2026-10-22 13:4x)

브리프 `task-p11a-done-edit.md` 와 팀장 지시대로 했다. 저장소 `/Users/hikaru/workspace/momo-english-academy`(문서 가지) 작업 트리만 고쳤다. 커밋 · push 는 하지 않았고 워크트리 p11 은 읽기만 했다(79ee1cc, `git status` 비어 있음).

## 바뀐 파일 둘

| 파일 | 줄 | 바뀐 것 |
|---|---|---|
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p11a-세션-바탕-앱-채점.md` | +185 −2 | 3행 머리 상태 `approved(컨트롤러 2026-10-18 04:1x — …)` → `done(2026-10-22, 커밋 79ee1cc)`. 313행 '구현 뒤 채운다.' → 완료 보고 184줄. 본문(1~310행)은 그대로 |
| `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` | +1 −1 | 84행 P11a 행 완료 판정 칸 앞에 `**done · 커밋 79ee1cc**(2026-10-22, plan-p11a 완료 보고) — ` 를 더함(P10 행과 같은 꼴). 다른 칸은 그대로 |

완료 보고의 소절은 열하나다. 흐름 · 커밋 · CI · 로컬 관문(시험 수 · 증명 표 대조) · 프리뷰 확인 · 실제 바뀐 파일(계획 표 38 + 표 밖 12) · 공용 변경 · 계획과 다르게 한 것(16) · 안 한 것(4) · 남긴 것(9) · PR 이다. 표 열 개는 기계로 칸 수를 맞댔다(어긋남 0). 아이 이름 · 비밀값 · 접근 코드 · 프리뷰 주소는 없다(grep 확인).

## 브리프 · 팀장 지시와 다르게 한 것

1. **머리 상태 날짜는 10-22 로 적었다.** 브리프 3행은 `done(2026-10-18, 커밋 79ee1cc)` 이고 팀장 지시는 `done(2026-10-22, 커밋 79ee1cc)` 다. 79ee1cc 의 커밋 날짜(2026-10-22 13:31)와 같은 팀장 지시를 따랐다.
2. **CI 8차 e2e 는 68 이 아니라 63 으로 적었다.** 팀장 지시는 'e2e 68' 이었다. 그러나 run 39081857257 의 e2e 작업 로그는 `63 passed (6.6m)` 다. 코드로 맞대도 63 이다 — P11a 가 더한 e2e 13(읽기 1 · 쓰기 1 · 이어 하기 1 · 말하기 10)에 P10 끝 50(CI 11차 49 + fix 8 하나)을 더한 수다. CI 7차도 63 이었다.
3. **검토 보고는 열넷을 읽었다.** 팀장 지시는 '열둘'이었으나 장부 폴더의 `review-p11-*.md` 는 fix 4 재검토 둘을 더해 열넷이다.
4. **묶음 plan P11a 행은 완료 판정 칸만 고쳤다**(브리프 '배정표 · 완료 판정 칸'). 증명 칸의 빈칸은 아래 '대조로 찾은 것' 4 에 적었다.

## 원문에서 못 찾은 것(완료 보고에 '기록 없음' 또는 다른 원문으로 적음)

| 무엇 | 적은 꼴 |
|---|---|
| 차례 1~3 커밋에 대한 요청자 지시 | '장부에 기록이 없다'. 차례 4 커밋만 요청자 지시 줄이 있다(10-22 13:2x) |
| 바탕만으로 돌린 CI(plan 작업 순서 0 완료 조건 'CI 한 번 초록') | '기록 없음(첫 CI 는 차례 2)' |
| 비밀값 grep(공통 증명) | '따로 돌린 기록 없음', CI bundle-secrets 8차 성공을 함께 적음 |
| CI 8차의 작업별 시험 수 | 장부 · 구현 보고에 없음 → GitHub Actions 로그에서 읽어 옮김(unit 52 파일 · 494 · 6 todo, integration 20 파일 · 151, e2e 63, e2e-local 7, 작업 열하나 성공) |
| 바탕(dc5308d) 시점의 통합 · e2e 수 | 없음 → 'P11a 가 더한 것'과 '끝' 수만 적음 |
| fix 4 뒤 lint 파일 수 · check:deps 의존 수 | 구현 보고에 '0'만 있음 → 0 으로만 적음 |
| CI 6차의 열한째 작업 결과 | 장부는 '8 작업 성공' + 실패 둘 → 작업 수를 적지 않음 |
| CI 3 · 6차 사진 | 내려받은 세트 없음 → 표에 '—' |
| 요청자가 프리뷰에서 수업을 끝까지 해 본 기록 · 재부팅 기록 | 둘 다 없음 → 그대로 적음 |

## 대조로 찾은 것

1. **증명 표 시험 이름 서른 가운데 스물아홉이 79ee1cc 의 시험 선언 줄에 글자 그대로 있다**(건너뜀 · todo 없음). 차례 4 e2e 열(AC-5b · 5c · 5e · 5f 셋 · N3 넷)도 모두 있다. 없는 하나는 e2e AC-N9(P11 화면)로, 차례 10(c 마무리) 몫이다. `font-size.spec.ts` 에 P10 의 AC-N9 시험이 있어 spec-trace 는 이 빈칸을 잡지 않는다. 표는 이 보고 끝에 있다.
2. **커밋 넷의 파일 50 = 계획 표 38 + 표 밖 12** 로 맞는다(새 27 · 고침 23, +9,082 −586). 표 밖 열둘 가운데 셋은 plan 글에 미리 적혀 있었다 — `repeat.tsx`(값 4) · `safe-error.test.ts`(제약) · `session-start.test.ts`(위험 3).
3. **review-p11-fix4-code M-3(완료 보고 fix 4 몫)은 이 완료 보고로 닫았다.** `speak-button.tsx` 는 표 밖 파일 표에, 배치 화면 듣는 중 꼴 · `compact` 는 다르게 한 것 14 에, 말하기 1~2 안내 줄 행은 15 에 있다.
4. **묶음 plan 의 파일 칸 둘이 코드와 다르다**(고치지 않음, 컨트롤러가 볼 것).
   - AC 표 AC-4a 행(208행)의 파일 칸이 `score.test.ts` · `writing.spec.ts` 다. AC-4a 단위 시험은 `tests/unit/answer-check.test.ts:178` 에 있고 `score.test.ts` 에는 AC-4a 가 없다(plan-p11a 증명 표는 answer-check).
   - P11a 행 증명 칸에 `tests/unit/answer-check.test.ts`(AC-4a 단위) · `tests/unit/attempt-queue.test.ts`('대기열:')가 없다.
5. **ledger-open 행 넷이 P11a 결과와 어긋난다**(완료 보고는 원문대로 적고 장부는 고치지 않음).
   - 43행 '쓰기 평가 빈칸 채우기 — P11 브리프'는 plan-p11a '다른 P 에 넘길 것'에서 P12 몫으로 넘어갔다.
   - 25행 `bandOf` 중복 'P11 또는 P12'는 정할 것 차로 P12 다. P11a 는 하지 않았다.
   - 31행 'P11: … 말하기 6 · 8단계 그림 · 질문 차례 · 조립 칸 수 · 갈래별 안내 문장 …' 가운데 활동 차례(활동 모델 단위 시험) · 조립 칸 수 · 쓰기 1~3 · 말하기 1~2 안내 문장은 P11a 가 했다. 나머지는 b · c 몫이다.
   - 49행 '홈 카드 아는 단어 · 최근 성적 · 끝낸 대화 칸은 P11 · P12 가 채움'은 P11a 원문에 다룬 기록이 없다.
6. **검토자 범위 밖 관찰 둘이 장부에 줄이 없다.** 완료 보고 '남긴 것' 1-나 에 원문대로 적었다.
   - review-p11-4-code: 세션 서버 액션이 `device.ts` 를 거쳐 `@/server/ai/store` 의 `createAlertOnce` 를 가져온다 — 알림 공용 모듈로 옮길 만함.
   - review-p11-fix4-code: 마지막 활동이 말소리 없음이면 안내를 잠깐 보인 뒤 결과로 간다 — 1-나 부모 화면 때 볼 것.
7. **완료 판정 '프리뷰에서 1단계 … 끝까지 돌고'의 근거는 CI 와 프리뷰 길 확인이다.** 세 영역 1단계 수업 끝까지는 CI 8차 e2e 와 사진 77장, 점수 · 단어별 정오는 통합 시험이 보였다. 프리뷰 79ee1cc 는 배포 READY · 접근 · 홈 · 말하기 수업 목록까지 확인했다. 남아 있던 진행 세션은 중단 처리되어 프리뷰에서 세션을 끝까지 한 기록은 없다(차례 11). P10 행과 같은 꼴로 done 을 표시했고 이 차이는 완료 보고 '프리뷰 확인'에 적었다.
8. **구현 보고 차례 2 의 '통합 +7'은 +8 로 보인다**(참고). 같은 줄의 내역이 session-flow 일곱 + retry 하나다. 완료 보고에는 코드에서 센 P11a 통합 +9(session-flow 7 · retry 1 · device-alert 1)를 적었다.

## 증명 표 대조(79ee1cc 시험 글, 읽기만)

| 수용 기준 | 시험 이름(앞부분) | 있는 곳(79ee1cc) |
|---|---|---|
| AC-3a(P11 몫) | AC-3a 읽기 4단계 세션의 지문은 55~80단어이고 문제는 4개이… | `tests/e2e/reading.spec.ts:47` |
| AC-4a | AC-4a 쓰기 1단계 빈 글자 채우기와 3단계 카드 조립은 앱이 채… | `tests/unit/answer-check.test.ts:178` |
| AC-4a | AC-4a 쓰기 1 · 3단계 세션은 AI 호출 0회로 채점되고 기기… | `tests/e2e/writing.spec.ts:164` |
| AC-6a | AC-6a 세션 도중 앱을 닫고 다시 열면 같은 활동 · 같은 입력에… | `tests/e2e/resume.spec.ts:81` |
| AC-6c | AC-6c 점수 함수는 3.7 표의 경계값을 맞게 낸다(읽기 · 쓰기… | `tests/unit/score.test.ts:21` |
| AC-6c | AC-6c 쓰기 4단계 3문장 가운데 고칠 곳 없는 문장이 2개면 0… | `tests/unit/score.test.ts:83` |
| AC-6c | AC-6c 말하기 1~8단계는 a = speaking.match_we… | `tests/unit/score.test.ts:100` |
| AC-6c | AC-6c 점수 없는 세션(쓰기 확인 실패 · 첨삭 전 · 말하기 9… | `tests/unit/score.test.ts:148` |
| AC-5b(1단계 몫) | AC-5b 말하기 1단계 세션은 따라 말하기 단어 5 · 문장 5, … | `tests/e2e/speaking.spec.ts:244` |
| AC-5c(세션 몫) | AC-5c 말하기 세션 도중 마이크 권한을 거두면 세션이 진행으로 남… | `tests/e2e/speaking.spec.ts:382` |
| AC-5e(말하기 1 · 4 몫) | AC-5e 말하기 1단계 따라 말하기는 마지막 중간 결과 뒤 3초 조… | `tests/e2e/speaking.spec.ts:420` |
| AC-5f(1~2단계 몫) | AC-5f 말하기 1단계 질문 답은 허용 답과의 일치율이 speaki… | `tests/unit/speaking-judge.test.ts:53` |
| AC-5f(1~2단계 몫) | AC-5f 일치율 0.95 는 '잘 말했어요', 0.7 은 '거의 다… | `tests/unit/speaking-judge.test.ts:118` |
| AC-5f(1~2단계 몫) | AC-5f 말하기 1단계 질문 답은 AI 호출 0회로 판정되고 다시면… | `tests/e2e/speaking.spec.ts:469` |
| AC-5f(1~2단계 몫) | AC-5f 따라 말하기 일치율 0.95 는 '잘 말했어요'와 ui.a… | `tests/e2e/speaking.spec.ts:528` |
| AC-5f(1~2단계 몫) | AC-5f 하루 안전 상한에 닿은 날에도 말하기 1~2단계 질문 답은… | `tests/e2e/speaking.spec.ts:589` |
| AC-N3(세션 몫) | AC-N3 인식 이벤트가 오지 않는 가짜 API 에서 감시 타이머가 … | `tests/e2e/speaking.spec.ts:635` |
| AC-N3(세션 몫) | AC-N3 aborted 가 이어지는 가짜 API 에서 인식 실패가 … | `tests/e2e/speaking.spec.ts:662` |
| AC-N3(세션 몫) | AC-N3 no-speech 로만 끝난 말하기 문항이 speech.s… | `tests/e2e/speaking.spec.ts:709` |
| AC-N3(세션 몫) | AC-N3 network 오류는 '인터넷이 끊겼어요. 연결되면 다시 … | `tests/e2e/speaking.spec.ts:745` |
| AC-2c(읽기 몫) | AC-2c 지난 단원의 읽기 수업을 다시 하기로 끝내면 세션 점수가 … | `tests/integration/retry.test.ts:161` |
| AC-N9(P11 화면) | AC-N9 세션 활동 화면(읽기 · 쓰기 · 말하기 · 마이크 안내 … | **없음** — 차례 10(c 마무리) 몫 |
| 세션 바탕(AC 접두 없음) | 세션 바탕: 이어 할 자리는 끝 시도가 없는 가장 앞 활동이고 P10… | `tests/unit/session-attempt.test.ts:57` |
| 세션 바탕(AC 접두 없음) | 단어별 정오: 앱이 정답을 아는 낱말 문항의 단원 단어만 내고 따라 … | `tests/unit/session-attempt.test.ts:375` |
| 세션 바탕(AC 접두 없음) | 영어로 말한 문장 수: 인식 글이 있는 발화마다 하나다 | `tests/unit/speaking-judge.test.ts:351` |
| 세션 바탕(AC 접두 없음) | 대기열: 50개씩 나눠 보내고 거부된 id 도 지운다 | `tests/unit/attempt-queue.test.ts:103` |
| 세션 바탕(AC 접두 없음) | 세션 바탕: 서버가 저장 때 다시 채점해 attempts 의 scor… | `tests/integration/session-flow.test.ts:178` |
| 세션 바탕(AC 접두 없음) | 세션 바탕: 꼴이 틀린 시도는 그 시도만 거부되고 나머지는 받는다 | `tests/integration/session-flow.test.ts:227` |
| 세션 바탕(AC 접두 없음) | 세션 바탕: 끝내기는 모든 활동의 끝 시도가 있어야 되고 학습일 · … | `tests/integration/session-flow.test.ts:282` |
| 세션 바탕(AC 접두 없음) | 세션 바탕: DB 오류 로그에 시도 입력 글이 없다 | `tests/integration/session-flow.test.ts:490` |
