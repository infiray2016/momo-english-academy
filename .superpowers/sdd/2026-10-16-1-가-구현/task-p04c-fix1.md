# fix 1 브리프: P4c 시드 검증(implementer impl-p04a · Opus · high, 같은 워크트리)

검토 `review-p04c.md`(rev-p04a, Approved C 0 · I 0 · M 4)의 Minor 넷을 고친다. 보고의 '고치는 법'을 따르고, 컨트롤러 결정은 메인 저장소 plan-p04c 끝의 '검토 뒤 결정(21:5x)' 문단에 있다(`/Users/hikaru/workspace/momo-english-academy/intent/2026-10-15-모모-잉글리시-아카데미/plan-p04c-묶음-검사-명령.md`, 워크트리 사본은 옛 판).

## 작업 폴더 · 명령
- 지금 있는 격리 워크트리(브랜치 `feature/1a-p04c-seed-validate`, P4a · P4b 커밋 위). git 쓰기 금지. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴, `pnpm spec:trace` 는 인자 없이.
- 허용 파일: `src/core/seed/validate.ts` · `scripts/seed-validate.ts` · `src/core/seed/check-assessment.ts` · `src/core/seed/reference-index.ts`(M-2 정합) · `tests/unit/{seed-validate-cli,seed-validator-complete,seed-validator-distribution,vocab-allocate}.test.ts`(사례 더하기) · 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p04c-fix1-report.md`. 그 밖은 손대지 않는다. 증명 표 시험 이름은 그대로, 새 시험에 AC 접두 없음.

## 지적과 고치는 법
1. **M-1**(첫 줄 요약 · json 오류). 칸 키 없는 오류(파일 · 단원 단위)만 있을 때 첫 줄이 '실패 0 · 규격 파일 오류 0' 인데 종료는 1 이다. 첫 줄의 수가 종료 코드와 맞게 — 칸 키 없는 오류도 '실패'(또는 따로 '그 밖 오류 n')로 센다. JSON 이 아닌 파일은 plan 명령 절대로 그 파일의 칸 전부를 `json` 오류로 센다(지금은 다르게 센다 — 재현 사례를 시험으로). `--json` summary 도 같은 셈.
2. **M-2**(`seed.complete_through_level` 범위). 설정값 정합 `settings` 규칙에 '1~12 정수'를 더한다(`reference-index.ts`). `--complete-through settings` 가 그 밖의 값을 읽으면 입력 오류 2 로 끝나고, PR 모드의 빈 칸 셈도 범위 밖이면 정합 오류를 낸다. 시험: 0 · 13 · 소수로 각각.
3. **M-3**(`check-assessment.ts:322~324`). 말하기 9~12단계 평가의 `question` 문항을 막는 규칙을 지운다 — 6.3 은 AI 과제(허용 답 없는 말하기 질문 답 포함)를 말하기 9단계 이상에 2개까지 허용하고, plan 의 level-test-type(question 은 `acceptedMin` > 0 단계면 허용 답 필수) · level-test-ai(허용 답 없는 question 은 AI 과제, `TEST_AI_ITEMS_MAX` 개까지, 벌 끝) 행이 다룬다. 통과 사례(9단계 평가에 허용 답 없는 question 둘이 벌 끝) · 거부 사례(셋 또는 끝이 아님)를 시험에.
4. **M-4**(`validateSeed` 498줄). 칸 걷기(파일 묶음 → 칸 키 · 칸 · 파일 · 경로 목록)를 `collectCells` 로 떼어 내보내고 `validateSeed` 가 그것을 쓴다. 동작은 그대로(시험 159 전부 그대로 통과, 실기 셋 결과 그대로). P5 · P7 이 쓸 이름 · 꼴을 보고에 적는다.

## 끝나면
`pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` · `pnpm spec:trace`(missing-test 58 그대로) · `pnpm check:bundle` · 실기 셋(`tests/.tmp` 에 miniSeed 를 써서 PR 모드 · `--complete-through 1` · `--complete-through 2`, 끝나면 지움) + seed/ 없을 때 2. 보고 `task-p04c-fix1-report.md`: 넷마다 ADDRESSED(파일:줄 · 시험 이름) · 설계와 다르게 한 것 · 바뀐 파일:줄 · 명령 출력(시험 수 · 실기 첫 줄 셋) · `collectCells` 꼴. 마지막 메시지 첫 줄은 DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED.
