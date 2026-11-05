# 브리프: 가르치고 배우는 수업 plan 묶음 다 — 판정(쓰기 틀린 까닭 · 말하기 질문 판정 · 짝 · 같이 해 보기 채점 · P11c 질문 답 AI 길)(구현자 · Opus · high, 2026-10-30 01:1x 작성, 나 와 타 가 끝난 뒤 시작 — attempt.ts · judge.ts 잠금, meaning.ts 의존)

plan `intent/2026-10-29-가르치고-배우는-수업/plan.md`(approved C186) 116~127줄 '다 · 판정' 표와 정한 것 5(P11c 질문 답 몫 당김: 서버 함수 · 서버 액션 · 화면 가운데 서버 몫만 이 묶음, 화면은 라-3) · 6(의미 검사 실패는 AI 가 맞음이라 해도 '다시'(오답, 점수 0)로 적고 AI 원 판정을 judge.ai 에 남김 — 컨트롤러 2판 보정) · 7(의미 검사 자료: 낱말 품사 표를 세션 자료에 실어 기기 · 서버가 같은 표) · 8(쓰기 까닭 차례: 차례 다름 → whyKo, 차례 같고 첫 글자 대문자 아님 → 대문자 문구, 그 밖 마침표 자리 → 마침표 문구, 둘 다면 대문자만) · 9(근거 칸은 평가 plan 몫 — 사실만 남김)를 구현한다. 근거는 spec 3판 설계 2(쓰기 1~3단계 문항의 틀린 뒤 차례) · 설계 8(말하기 질문 판정과 의사소통 정답 · 의미 검사 · 점수와 셈) · AC-2b(정본 AC-3d) · AC-6g(정본 AC-22k — C182 (1) 의미 검증 · (2) 일관성 · (3) A9 운영 미반영), 평가 spec 5판 3절(값 이름은 plan 이름 표), plan-p11c(approved, `intent/2026-10-15-모모-잉글리시-아카데미/plan-p11c-말하기-AI-평가.md`) 값 1~4 의 질문 답 몫. 묶음 나 보고(`task-teach-na-report.md`: 시도 꼴 판 2 실제 꼴)와 타 보고(`task-teach-ta-report.md`: meaning.ts 입력 꼴)를 먼저 읽는다. 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지.

## 할 것(plan 다 표 그대로)
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/writing/why.ts`(제안) | 신규 | `writingWhyOf`(정한 것 8): 틀린 까닭 셋(차례 · 대문자 · 마침표)과 둘 다 틀림의 우선 규칙, 앱 문구는 spec 설계 5 '정본 밖 문구' 표의 글자 그대로(새 문구 금지) |
| `src/core/speaking/judge.ts` | 수정 | `judgeSpeakingQuestion`(제안): 의미 검사(meaning.ts) → 두 묶음 가르기(speaking.answer_match_pass 문턱 · 높은 쪽 · 같으면 accepted) → AI 판정 합치기(설계 8 · 정한 것 6). 결과는 plan 이름 표의 judge { meaning, bundle?, ai?, final, by } · communicative · expressionDone. plan-p11c 값 2 의 aiAnswerScore · skipAfterAiRest 는 질문 답 몫만 |
| `src/core/session/attempt.ts` | 수정 | 짝 · 같이 해 보기의 앱 채점(읽기 · 듣기 · 쓰기는 checkAnswer, 따라 말하기는 repeatResult, 질문은 judgeSpeakingQuestion), 질문 끝 시도 꼴(plan-p11c 값 3). 나 가 놓은 판 2 꼴을 바꾸지 않고 채운다 |
| `src/core/ai/calls/speaking.ts` | 수정 | SpeakingAnswerInput 에 story(시드 storyEn)와 가변부 'Story the child heard'(정한 것 5 — 아이 자료가 아닌 시드 글, NFR-4 그대로) |
| `src/server/speaking/index.ts` · `src/server/actions/speaking.ts` | 신규 | plan-p11c 값 1 의 evaluateAnswer(질문 답만): 첫 문장 requireAccess(접근 쿠키, 없으면 401), 같은 시도 id 는 저장된 결과, 판정 합치기를 서버가 다시 함(서버 값이 정본), 'AI 쉬는 중'은 건너뜀 끝 시도, Zod 로 응답 검증, 모델은 ai.model.speaking_eval 설정값 |
| `tests/unit/writing-why.test.ts`(제안) · `speaking-judge.test.ts` · `speaking-meaning.test.ts`(타 의 파일에 더함) · `tests/integration/speaking-eval.test.ts`(P11c 신규) · `retry.test.ts` | 신규 · 수정 | plan 증명 절 '말하기 질문 판정의 증명'(AC-22k): 의미 검증 긍정(정규 시드 셋의 바른 답 · 허용 답 전부) · 부정(방향 · 핵심 정보 · 부정 · 틀린 정보, 일치율이 문턱을 넘는 글 포함) · 가르기(accepted · acceptedMeaning · expressionDone) · 일관성(같은 인식 글 묶음을 혼자 질문(가짜 AI 맞음 · 부분 · 다시)과 짝(앱)에 넣어 같은 결과, AI '부분' + 'Yes, they do.' 는 맞음 · acceptedMeaning · communicative · expressionDone 거짓, AI '맞음' + 'Yes, they drink milk.' 는 '다시'(정한 것 6), 바꿔 말하기만 알려진 차이) · 통합(가짜 AI 클라이언트: 저장된 끝 시도 값, 세션 점수에 맞음 1, A9 확정 전 단원 판정 입력에 수준 값 없음 — C182 (3)) · 쓰기 까닭 셋과 둘 다 틀림 · 첫 시도 점수 |

## 지키는 것
- 1~3단계 새 자리는 AI 0회(말하기 3단계 혼자 질문만 AI, NFR-2). AI 호출은 서버에서만 · 키는 서버에만 · 응답 Zod 검증. 녹음 없음. 설계 숫자 코드 금지(문턱 · 모델은 설정 키). 식별자 영어. 아이 화면 문구는 설계 5 표 그대로(쓰기 대문자 · 마침표 '왜' 문구).
- 화면(라-2 · 라-3)은 손대지 않는다. attempt.ts · judge.ts 는 이 묶음이 잠근다(나 · 타 가 끝난 뒤). 커밋하지 않는다.

## 관문 · 보고
TDD. 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드) · `pnpm spec:trace --fail-on unknown-ac`(시험 이름은 정본 15절 번호: 델타 2b → AC-3d, 6g → AC-22k, 6a~6f → AC-22e~j, N2 → AC-N19). 통합 시험은 작성만(이 Mac 못 돌림). 보고 `task-teach-da-report.md`(50줄 안): 바뀐 파일 · 판정 함수의 입력 · 출력 꼴 · 서버 액션 · 시험(증명 절 항목마다 시험 이름) · 관문 · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.

보탬(01:3x, 나 검토 M2): 묶음 나 가 communicative · expressionDone 을 judge 안에 두었다(`judge { meaning, bundle?, ai?, final, by, communicative?, expressionDone }`). plan 이름 표도 그렇게 맞췄으니 이 꼴을 쓴다. 또 나 검토 fix 1 로 판 2 칸은 v 2 에서만 받고(판 1 은 거부), 기기 짝 고르기 맥락 공용 함수가 생긴다 — 그 보고(`task-teach-na-report-fix1.md`)를 읽고 시작한다.

보탬(01:4x, 아 검토 M1): 짝 채점이 attempt.ts 와 지표(teach-metrics spareOutcomeOf)에 두 벌이다. 이 묶음이 core 에 짝 · 같이 해 보기 채점 공용 순수 함수를 두고(제안 `src/core/session/spare-outcome.ts`), attempt.ts 와 teach-metrics · 사(되짚기)가 그것을 쓰게 한다(지표 파일은 호출만 바꿈). 또 혼자 질문의 끝 시도에 judge 를 남겨야 질문 짝이 나온다(나 검토).
