# 편집 보고: plan-p11b 완료 보고 채우기(문서 반영 편집자 edit-p11b-done · Opus · high, 2026-10-22 19:2x)

브리프 `task-p11b-done-edit.md`(덧 19:1x 포함)와 팀장 지시대로 했다. 저장소 `/Users/hikaru/workspace/momo-english-academy`(문서 가지) 작업 트리의 plan 두 파일만 고쳤다. 커밋 · push 는 하지 않았다. 워크트리 p11 은 읽기만 했다(HEAD cce2238, `git status` 비어 있음).

## 바뀐 파일 둘

| 파일 | 줄 | 바뀐 것 |
|---|---|---|
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p11b-쓰기-AI-첨삭.md` | +229 −2 | 3행 머리 상태 `approved(컨트롤러 2026-10-18 04:1x — …)` → `done(2026-10-22, 커밋 cce2238)`. 168행 '구현 뒤 채운다.' → 완료 보고 228줄(절 머리까지 230줄, 파일 168 → 395줄). 나머지 줄은 그대로 |
| `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` | +1 −1 | 85행 배정표 P11b 행. 완료 판정 칸 앞에 `**done · 커밋 cce2238**(2026-10-22, plan-p11b 완료 보고) — ` 를 더함(P10 · P11a 행과 같은 꼴). 증명 칸은 실제 시험 파일로 고침 — `tests/unit/{writing-feedback-state,lesson-list-state}.test.ts` · `tests/integration/{writing-check,writing-feedback,safety-cap}.test.ts` · `tests/e2e/{writing,timeout,resume,home}.spec.ts`(`session-start` 뺌 · `lesson-list-state` 더함). 다른 칸은 그대로 |

완료 보고의 소절은 열둘이다. 흐름 · 커밋 · CI · 로컬 관문(시험 수 · 증명 표 대조) · 프리뷰 확인 · 실제 바뀐 파일(계획 표 36 + 표 밖 18) · 공용 변경 · 계획과 다르게 한 것(23) · Codex 지적 2 · 3 · 안 한 것(5) · 남긴 것(12) · PR · 합침이다. 표 열둘은 기계로 칸 수를 맞댔다(어긋남 0). 주소 · 키 꼴 · 메일 · 견본 이름 · '트랙' · '유닛' 글은 없다(grep 0).

## 브리프 · 팀장 지시와 다르게 하거나 판단한 것

1. **묶음 plan 증명 칸을 실제 시험 파일로 고쳤다.** 브리프는 '배정표 · 완료 판정 · 증명 칸을 done · 커밋으로'라고 적었다. 증명 칸에 'done' 글을 넣는 대신, 칸이 가리키는 파일을 cce2238 의 증명 표 시험 자리와 맞췄다(P10 · P11a 증명 칸도 컨트롤러가 뒤에 같은 식으로 고쳤음 — progress 10-22 13:5x). `session-start.test.ts` 는 P11b 가 고치지 않았고, `lesson-list-state.test.ts` 에 증명 '목록: …'이 있다. 되돌리려면 그 칸만 옛 글로 바꾸면 된다.
2. **plan-p11b 증명 표의 파일 칸(본문)은 고치지 않았다.** 차례 7 코드 검토는 "plan 증명 표의 파일 칸을 완료 보고 때 고치면 된다"고 했다. 그러나 브리프가 '설계 · 본문은 고치지 않는다'라서, 실제 자리(`writing-feedback.test.ts` 643 · 705행)는 완료 보고 '증명 표 대조' 문단과 다르게 한 것 15 에만 적었다. 본문을 고칠지는 컨트롤러 판단이다.
3. **CI 10차 run 번호 · 결과는 원문 밖에서 옮기고 출처를 달았다.** 장부에 10차 줄이 없다. 화면 검토 브리프 `task-p11-review-5-design.md` 덧(14:4x)의 'run 39727795150 · 전부 초록'을 각주와 함께 적었다.
4. **10차 사진은 109장으로 적었다.** 브리프 덧은 91장(9차와 같은 수)이고, 화면 검토 보고는 폴더를 세어 109장이다. 차례마다 더한 사진 이름으로 세면 77 + 32 = 109 라 보고 쪽을 따랐다.
5. **통합 · e2e 총수와 사진 내역은 편집자 셈이다.** 원문에 CI 19차의 작업별 수가 없다. P11a 끝(CI 8차) 151 · 63 에 시험 선언 줄 차이(+17 · +14)를 더해 168 · 77 로 적고, 셈이라고 표에 밝혔다. GitHub Actions 로그는 원문 목록 밖이라 열지 않았다.

## 원문에서 못 찾은 것(완료 보고에 '기록 없음' 또는 편집자 셈으로 적음)

| 무엇 | 적은 꼴 |
|---|---|
| CI 10차 run 번호 · 결과 | 장부에 없음 → 검토 브리프 덧에서 옮기고 각주 |
| CI 11 · 12 · 15 · 16 · 18차 사진 세트 | 내려받은 기록 없음 → 표에 '—' |
| CI 19차 작업별 결과 · 통합 · e2e · e2e-local 수 | '전부 초록'뿐 → 작업별 줄은 '원문에 없음', 수는 편집자 셈(168 · 77), e2e-local 은 P11a 끝 7 그대로(P11b 가 바꾼 파일 없음) |
| 차례 7 뒤 spec:trace missing-test 수 | 기록 없음(21 → 19 → 17 까지만) |
| fix 8b 뒤 biome 파일 수 · check:deps 모듈 수 | 구현 보고에 '0'만 있음 → 차례 7 셈(320 파일 · 모듈 167 · 의존 790)이라고 밝혀 적음 |
| 커밋 셋에 대한 요청자 지시 | 장부에 기록 없음 |
| 비밀값 grep(공통 증명) | 따로 돌린 기록 없음 → 차례 5 코드 검토의 `tests/e2e` 확인 · CI bundle-secrets 9~19차 초록을 함께 적음 |
| 56acaec 배포 확인 줄 · cce2238 배포 확인 | '배포 뜸'뿐 · 컨트롤러 몫 |
| 요청자가 프리뷰에서 수업을 끝까지 해 본 기록 | 없음(지적 둘만 — 장부 89 · 91행) |
| 개발용 DB '5단계 과제 글 고침'(브리프 원문 3 이 적음) | progress 에 없음. 장부 91행 (1)에 할 일로만 있음 → '한 기록 없음' |
| fix 6b 화면 재검토 보고 | 없음. 차례 7 화면 검토가 6b 사진(`draft-long`)을 '맞음'으로 봄 |
| PR #4 의 지금 상태 | 장부에 기록 없음 |
| 쓰기 7~12단계를 따로 돌린 기록 | 없음(e2e 견본은 4 · 5 · 6단계) |

## 대조로 찾은 것

1. **증명 표 시험 이름 스물넷이 모두 cce2238 의 시험 선언 줄에 글자 그대로 있다**(건너뜀 · todo · only 없음 — 해당 파일 grep). 둘은 증명 표 파일 칸과 자리가 다르다(아래 표 ※). 표는 이 보고 끝에 있다.
2. **바뀐 파일 54 = 계획 표 35 + 공용 변경 1 + 표 밖 18 로 맞는다**(새 20 · 고침 34, 726198f → cce2238 +9,149 −190). 계획 표 서른여섯 가운데 `tests/integration/session-start.test.ts` 하나만 안 바뀌었다.
3. **시험 수가 구현 보고와 맞는다.** 726198f → cce2238 시험 선언 차이는 단위 +15 · 통합 +17 · e2e +14 이고, 구현 보고의 차례별 수(단위 494 → 509, 통합 5 · 2 · 5 · 1 · 3 · 1, e2e 4 · 3 · 1 · 3 · 1 · 2)와 같다. 더한 시험 46 가운데 증명 표 밖은 22 다(단위 13 · 통합 5 · e2e 4). 뺀 시험은 0 이다.
4. **사진 수가 차례마다 맞는다.** 구현 보고의 사진 이름으로 세면 P11b 몫이 81장이고, 세트 수 109(10차) · 121(13차) · 139(14차) · 154(17차) · 158(19차)가 77 에서 차례별 몫을 더한 값과 모두 같다.
5. **장부 91행 (2)가 안 됐다.** '`tests/e2e/lessons.ts` guidedSample(5) · 빌더에 5단계 과제 글 따로(P11b 차례 7)'는 차례 7 브리프 `task-p11-7.md` · fix 8 · 8b 브리프 어디에도 없고, cce2238 의 `guidedSample(5)` 는 4단계 수업을 그대로 복제한다(`tests/e2e/lessons.ts:137-141`). 완료 보고 '남긴 것 — 컨트롤러'에 적었다.
6. **plan-p11a 의 C86 이유 줄 행이 다른 표에 들어가 있다.** `plan-p11a-세션-바탕-앱-채점.md:231` 의 '쓰기 4~5 확인 — 고친 뒤 | (AI 가 돌려준 한 문장 이유 …)' 행은 '정본 밖 문구' 표(171~191행)가 아니라 '정할 것' 표의 가 · 나 행 사이에 있다. 칸 머리(번호 · 무엇 · 권함 · 13절)와 행 꼴(화면 · 자리 · 문구 · plan)이 다르다. 고치지 않았다(브리프 범위 밖).
7. **열린 장부에 닫힌 행이 남아 있다**(고치지 않음).
   - 77 · 78행 Codex 2 · 3 — fix 5 가 고치고 `review-p11-fix5-code.md` 13 · 14 가 닫았다. 행의 처리 칸은 'P11b 차례 6 fix' 로 적혀 있다(Codex 판정표도 '차례 6 브리프'라 적음).
   - 80행 '쓰던 글은 기기 입력만 — plan-p11b 완료 보고 다르게 한 것에' — 이 완료 보고 다르게 한 것 1 로 닫을 수 있다.
   - 82행 쓰기 4~5 사진 보강 — `review-p11-6-design.md` 장부 판정이 '닫힘(fix 5 재검토에서 확인)'.
   - 44행 '생각 꺼내기 · 첨삭 몫은 차례 6 · 7' — `review-p11-6-code.md` · `-6-design.md` · `-7-design.md` 가 닫았다.
   - 33행 — 쓰기 몫(생각 꺼내기 기록 · 결과 자리 · 4~5 제출 단위 · 빈 모범 답안 건너뜀)은 차례 5~7 에서 닫혔고 말하기 6 · 8 그림 차례만 c 몫으로 남는다.
8. **묶음 plan AC 표 AC-2e 행(207행) 파일 칸에 `writing-feedback.test.ts` 가 없다.** P11b 의 AC-2e 통합은 그 파일 643행이다. 지금 칸은 `session-start.test.ts` · `writing.spec.ts` 다(고치지 않음 — P11b 행 밖).
9. **차례 7 화면 검토 보고 머리의 '16차'는 17차 사진이다.** 16차 e2e 는 취소됐고, 검토 브리프 덧이 'CI 17차 run 39748532706' 사진이라고 적었다. 완료 보고 CI 절에 밝혔다.
10. **구현 보고 차례 7 이 `src/app/(child)/[area]/lessons/page.tsx` 를 '계획 표 그대로(B3)'에 묶었으나 계획 표에 그 파일이 없다.** 완료 보고는 표 밖 열여덟에 넣었다.
11. **장부 행이 없는 화면 참고가 있다**(지적 아님). `review-p11-6-design.md` — '직접 쓸래요' 뒤 보기로 돌아가는 길 · 입력란 autoFocus · 초고 입력란 보조 기술 이름 · 첨삭 기다림 둘째 줄 문구. `review-p11-fix5-design.md` — 5단계 빈 입력란 실선 · 긴 글 사진 없음. 검토자 범위 밖 관찰(두 기기 동시 초고 · `fitsBothWays` 한 그림 기다림)도 장부 행이 없다. 완료 보고 '남긴 것'에 모아 적었다.
12. **완료 판정 '쓰기 4~12'의 근거는 4 · 5 · 6단계 견본 e2e 다.** 7~12단계는 같은 길(writing.split_from_level 부터 두 세션)이지만 시험용 수업이 없어 따로 돈 기록이 없다. P10 · P11a 행과 같은 꼴로 done 을 표시했고 이 차이는 완료 보고 '증명 표 대조'에 적었다.
13. **녹음 API 는 src 에 없다**(`getUserMedia` · `MediaRecorder` 는 `src/lib/speech/browser.ts` 의 '쓰지 않음' 주석 한 줄뿐).

## 증명 표 대조(cce2238 시험 글, 읽기만)

| 수용 기준 | 시험 이름(앞부분) | 있는 곳(cce2238) |
|---|---|---|
| AC-4c | AC-4c 쓰기 6단계 첫 세션에서 생각 꺼내기는 writing.thin… | `tests/e2e/writing.spec.ts:710` |
| AC-4c | AC-4c 다음 쓰기 세션은 첨삭(칭찬 → 교정 하나씩) · 고쳐 쓰기 … | `tests/e2e/writing.spec.ts:864` |
| AC-4c | AC-4c 초고 제출 서버 액션은 첨삭을 기다리지 않고 돌아오고 첨삭은 … | `tests/integration/writing-feedback.test.ts:441` |
| AC-4c | AC-4c 생각 꺼내기는 writing.thinkout_max_turns… | `tests/integration/writing-feedback.test.ts:481` |
| AC-2e(P11 몫) | AC-2e 쓰기 6단계 초고를 쓰다 다른 수업을 고른 뒤 그 수업을 다시… | `tests/e2e/writing.spec.ts:961` |
| AC-2e(P11 몫) | AC-2e 중단된 첫 세션의 마지막 초고 글이 같은 수업의 새 첫 세션 … | ※ `tests/integration/writing-feedback.test.ts:643`(증명 표는 `session-start.test.ts`) |
| AC-2a(첨삭 몫) | AC-2a 첨삭이 오면 홈에 '첨삭이 왔어요'가 보이고 누르면 그 수업의… | `tests/e2e/home.spec.ts:341` |
| AC-6a(초고 몫) | AC-6a 쓰기 6단계 초고를 쓰다 앱을 닫고 다시 열면 초고 화면에 쓴… | `tests/e2e/resume.spec.ts:190` |
| AC-8d(화면 몫) | AC-8d 응답을 늦춘 고정 표본에서 10초 타임아웃 뒤 생각 꺼내기는 … | `tests/e2e/timeout.spec.ts:155` |
| AC-N6(1-가 몫) | AC-N6 쓰기 확인이 ai.timeout_seconds.realtime… | `tests/e2e/timeout.spec.ts:115` |
| AC-N10 | AC-N10 응답을 늦춘 고정 표본에서 1초 안에 기다림 표시가 보이고 … | `tests/e2e/timeout.spec.ts:75` |
| AC-8k | AC-8k 같은 초고의 첨삭이 거절로 두 번 끝나면 더 부르지 않고 at… | `tests/integration/writing-feedback.test.ts:600` |
| AC-8n(첨삭 몫) | AC-8n 거절이 아닌 까닭으로 같은 초고의 첨삭이 ai.feedback… | `tests/integration/writing-feedback.test.ts:883` |
| 쓰기 4~5 | 쓰기 4~5: 세션 점수는 첫 제출에서 맞다고 본 문장 수 ÷ 문장 수이… | `tests/integration/writing-check.test.ts:263` |
| 쓰기 4~5 | 쓰기 4~5: 같은 시도 id 로 다시 내면 AI 를 다시 부르지 않고 … | `tests/integration/writing-check.test.ts:400` |
| 쓰기 4~5 | 쓰기 AI: 가변부의 앞 단원 학습 요소는 앞 단계 전부와 같은 단계 앞… | `tests/integration/writing-check.test.ts:519` |
| 쓰기 4~5 | 쓰기 4~5: 문장을 다 쓰고 내면 칭찬 한 줄과 고칠 곳 하나가 같은 … | `tests/e2e/writing.spec.ts:364` |
| 1-가 안전 상한 | 1-가 안전 상한: 그 학습일 호출이 ai.safety_daily_cal… | `tests/integration/safety-cap.test.ts:435` |
| 1-가 안전 상한 | 1-가 안전 상한: 쓰기 5단계 수업을 고르면 '토리가 잠깐 쉬어요. 다… | `tests/e2e/writing.spec.ts:593` |
| 첨삭 흐름 | 첨삭 상태: 거절 둘이면 못 함 · 그 밖 실패는 ai.feedback_… | `tests/unit/writing-feedback-state.test.ts:27` |
| 첨삭 흐름 | 목록: 첫 세션만 끝난 칸은 남은 수업이고 둘째 세션이 끝나야 끝낸 수업… | `tests/unit/lesson-list-state.test.ts:677` |
| 첨삭 흐름 | 첨삭: 같은 초고를 두 요청이 함께 부르면 호출은 하나다 | `tests/integration/writing-feedback.test.ts:947` |
| 첨삭 흐름 | 첨삭: 앱 진입마다 밀린 첨삭을 오래된 것부터 많아야 둘 부른다 | `tests/integration/writing-feedback.test.ts:850` |
| 첨삭 흐름 | 둘째 세션: 첨삭이 대기면 시작할 때 한 번 더 부르고 그래도 없으면 대… | ※ `tests/integration/writing-feedback.test.ts:705`(증명 표는 `session-start.test.ts`) |

대조 방법: 증명 표 행의 따옴표 안 글을 뽑아 워크트리 `tests/**/*.ts` 의 `test(` · `it(` 선언 줄 이름과 글자 그대로 맞댔다(스크립트는 스크래치패드 `proof_check.py`). '공통' 행은 시험 이름이 아니라 빼고 셌다.
