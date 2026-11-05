# 브리프: 가르치고 배우는 수업 plan 묶음 바 — 근거 값 함수(평가 spec 3절 이름) · 열이 있으면 저장 길(구현자 · Opus · high, 2026-10-30 01:3x 작성, 나 · 다 뒤 시작)

plan `intent/2026-10-29-가르치고-배우는-수업/plan.md`(approved C186) 160~168줄 '바 · 사 · 아' 표의 바 행 · 정한 것 9(근거 칸 열과 기록 함수는 평가 plan(P12 앞머리) 몫, 이 plan 은 시도 꼴의 사실을 평가 spec 3절 값으로 바꾸는 순수 함수 teachEvidenceOf 를 만든다. 열이 먼저 생기면 저장 길에서 함께 쓰고, 늦으면 평가 plan 의 채움 함수가 시도 꼴에서 채운다. 의사소통 정답은 communicative 표시와 가른 묶음만 남기고 수준(A9)은 근거 상태 함수가 '잠정 A9' 규칙으로만 계산) · '이름' 절의 근거 칸 값 이름 제안 표(task · goals · assist · exposure · accuracy · result · validity · ctx · source · purpose)와 증명 표 AC-6a · 6c · 6d · 6f(정본 **AC-22e · 22g · 22h · 22j**) · 6g 근거 몫(**AC-22k**)을 구현한다. 근거는 평가 spec 5판 `intent/2026-10-29-학습-평가-체계/spec.md` 3절(근거 값 · 수준 · A9 잠정)과 정본 02-3 3.8 · 04 '수행 근거 칸'(C183 반영: assist 값 목록 none · choices · model_shown · model_heard · retry_after_answer · echo · together · hint_meaning …, exposure 넷, validity valid · technical(… 읽어 주기 실패) · dont_know · stuck · practice), 가르치고 spec 3판 설계 8 · 9(기록), 묶음 나 · 다 보고의 시도 꼴 실제 꼴. 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지.

## 할 것
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/evidence/teach.ts`(제안) | 신규 | 순수 함수 `teachEvidenceOf(attempt, lesson)`(제안): 시도 꼴 판 2 의 사실(자리 · 도움 · 가른 묶음 · 의사소통 정답 · 표현 수행 · 이야기 다시 듣기 · 소리 없음 · 읽기 도움)을 평가 spec 3절 값으로: task(시드 type) · goals(문항 goal 목록) · assist(같이 해 보기 together, '왜' 뒤 다시 retry_after_answer(읽기 · 쓰기 · 듣기) · echo(질문), 따라 말하기 끊어 듣기 뒤 model_heard, 읽기 read_aloud · gloss) · exposure(질문 속 낱말 question_word, 이야기 낱말 none …) · accuracy · result(판정 그대로 + bundle? · communicative?; A9 의 '부분'은 저장하지 않음) · validity(같이 해 보기 practice, 소리 없이 낸 답 technical(종류 이름은 정본 04 의 읽어 주기 실패 값), 그 밖 valid) · ctx { item, example }(짝은 ctx.item 에 짝 키 · example 에 짝 자극) · source · purpose 비움. 이름이 평가 정본 04 와 다르면 정본을 따르고 보고에 적는다 |
| `src/server/session/index.ts` · `src/server/speaking/index.ts` | 수정(조건부) | attempts.evidence 열(평가 plan 몫)이 이미 있으면 끝 시도와 같은 트랜잭션에 teachEvidenceOf 결과를 쓰고, 열이 없으면 이 줄은 넣지 않는다(보고에 '열 없음 — 평가 plan 채움 함수 몫'으로 적음). 다른 동작은 바꾸지 않는다 |
| `tests/unit/teach-evidence.test.ts`(제안) | 신규 | AC-22e(같이 해 보기 practice) · 22g('왜' 뒤 같은 행 도움 · 짝은 새 행 — 같은 task · goals, 다른 ctx.item) · 22h(질문 속 낱말 question_word) · 22j(읽기 도움 read_aloud · gloss, 출처 device) · 22k 근거 몫(의사소통 정답 → 맞음 + communicative, 표현 수행 거짓, 수준 값 없음) · 소리 없이 낸 답 technical. 수준 셈(22g · 22h 의 수준)은 평가 plan 의 근거 함수와 같이 돈다고 적는다 |

## 지키는 것
DB 의존 없는 순수 함수. 설계 숫자 코드 금지. 식별자 영어(값 이름은 정본 04 · 평가 spec 3절의 영어 그대로). A9 확정 전 운영 판정에 수준 값이 새지 않게(통합 시험은 묶음 다 의 speaking-eval 에 있음 — 여기서는 단위). 화면 · 다른 묶음 파일은 손대지 않는다. 커밋하지 않는다.

## 관문 · 보고
TDD. 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드) · `pnpm spec:trace --fail-on unknown-ac`. 보고 `task-teach-ba-report.md`(40줄 안): 값 이름 표(plan 제안 → 실제, 정본과 다른 곳) · 열 유무와 저장 길 · 시험 · 관문 · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.

보탬(01:3x, 나 검토 M2): 묶음 나 가 communicative · expressionDone 을 judge 안에 두었다(`judge { meaning, bundle?, ai?, final, by, communicative?, expressionDone }`). plan 이름 표도 그렇게 맞췄으니 이 꼴을 쓴다. 또 나 검토 fix 1 로 판 2 칸은 v 2 에서만 받고(판 1 은 거부), 기기 짝 고르기 맥락 공용 함수가 생긴다 — 그 보고(`task-teach-na-report-fix1.md`)를 읽고 시작한다.
