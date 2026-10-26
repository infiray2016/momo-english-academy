# 검토 브리프: P5a 풀이 검사 명령(code-reviewer rev-p05a, 2026-10-17 00:0x)

역할: code-reviewer(Opus · xhigh), 읽기 전용. 저장소 · 워크트리의 어떤 파일도 고치지 않는다. 보고 파일 하나만 쓴다(Write 도구). 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴, 한글 경로는 명령 인자로 넘기지 않는다.

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a0ffe8037fa827af6`(브랜치 feature/1a-p05a-seed-check, 바탕 P4c 6bd6015, 커밋 없음 — 새 파일은 untracked). 바뀐 것: `src/core/seed/solve-check.ts`(새 749줄) · `scripts/seed-check.ts`(새 916줄) · `tests/fixtures/seed/fake-solver.ts`(새) · `tests/unit/solve-check.test.ts`(새, 13) · `tests/unit/seed-check-cli.test.ts`(새, 8) · `package.json`(scripts 한 줄). diff 는 `git -C <워크트리> status --short` 와 파일 읽기로 본다(untracked 라 `git diff` 에 안 나온다).
- 구현 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p05a-report.md`(DONE_WITH_CONCERNS, '계획과 다르게 한 것' 11 · '검토자에게 알릴 것' 7).
- 기준(메인 저장소 `/Users/hikaru/workspace/momo-english-academy/`): plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p05a-풀이-검사.md`(approved, 머리의 '컨트롤러 결정' 문단 · 함수 표 · 풀이 요청 표 · 지시문 규칙 · 응답 규격 · 판정 표 · 기록 · 대상 칸 · 명령 · 호출 설정 상수 · 증명 표), 구현 브리프 `.superpowers/sdd/2026-10-16-1-가-구현/task-p05a.md`, 13절 C51 · C62(`specs/10-결정-기록.md`), 정본 6.4 풀이 검사 행(`specs/06-시드-생성.md`) · 6.1 · 6.6(`specs/05-AI-호출.md`), P4c 의 `src/core/seed/validate.ts`(solveTargets · solveStatus · cellHash · itemsOf · collectCells) · `schema/records.ts`(CheckFileSchema).
- 컨트롤러 재확인(00:0x, 워크트리): biome 0 · build · 단위 180 · check:deps 0 · spec-trace missing-test 58 · bundle 0 · 비밀값 0 · 키 없이 `--probe` 2 · `CI=true` 2.

## 볼 것(설계 준수 → 품질)
1. 정답이 문제 보기에 새지 않는가(plan 위험 1): `buildSolveRequest` · `solveUserMessage` 가 보내는 JSON 에 answerNo · accepted · explanationKo · glossary · dictation 의 word · 그림 보기의 영어 낱말이 없는지 코드로 확인하고, 시험 "풀이 검사 문제 보기: 정답 번호 · …" 가 그것을 실제로 보는지 본다.
2. 판정(`judgeSolve`)과 P4c `solveStatus` 의 일치(plan 위험 2 · 정할 것 바): 글 답 견주기 trim · 소문자, 후보(extraAccepted) 빼기 규칙, 거절 → 모두 none(C62 (3)), 실패 갈래(max_tokens · 규격 깨짐 · 번호 어긋남 · SDK 예외)는 기록을 쓰지 않는다.
3. 기록(`buildCheckRecord` · `mergeCheckFile` · `withHumanDecisions`): `CheckFileSchema` 그대로, 해시는 `cellHash`, 번호는 `itemsOf`, 같은 해시의 human 유지 · 다른 해시면 뺌, 파일 안 차례, 임시 파일 → 이름 바꾸기, 쓰기 직전 다시 읽기(위험 8).
4. 대상 칸(`selectSolveTargets`): 검증 실패 칸 건너뜀 · 해시 같으면 안 풂 · `--force` · `--levels` · `--file` · `--max-calls`.
5. 명령: 환경 확인(CI 거부 · 키 없음 2, 키 값이 어느 출력에도 없음 — `redact` 세 겹), 입력 확인 2, 종료 코드 0 · 1 · 2, 첫 줄 꼴, `--json` version 1 꼴(plan 명령 절), `--probe`(고정 문항 · 파일 쓰기 없음), `--dry-run`.
6. 호출 설정: 상수 SOLVE_*(모델 · low · between_tools · 4000 · 60초 · 재시도 2), 요청 본문에 temperature · top_p · top_k · fallbacks · 베타 머리글 · cache_control · metadata 없음(C62 (2)), `output_config: { effort, format: zodOutputFormat }`, `apiKey` 만(authToken null — 구현자가 더함, 다르게 한 것 8), `messages.parse` 안 씀.
7. 의존 규칙 · 구조: `src/core/seed/solve-check.ts` 가 SDK · 파일 · 네트워크 · 시계를 가져오지 않는지, `@anthropic-ai/sdk` 값 가져오기가 스크립트 하나뿐인지, `Solver` · `SolveMessage` 타입이 core 에 있는 것(다르게 한 것 2)이 적절한지.
8. 시험: 증명 표의 이름 21 글자 그대로(spec-trace 가 AC-7d 를 셈), 숫자 · 글을 견본에서 읽는지, spawn 시험이 키를 빈 값으로 덮는지, 실패 사례(가짜 풀이의 broken · max_tokens · missing-item · api-error · refusal)가 각 갈래를 실제로 지나는지.
9. 구현 보고의 '계획과 다르게 한 것' 1~11 을 하나씩 받을지 판정한다(설계 변경이면 Important). 특히 5(dry-run 미리 보기 줄) · 6(실패 호출 토큰 세기) · 7(실패 까닭에 API 글 300자 — 키 가림) · 9(probe 종료 규칙) · 11(지시문 한국어).
10. 우려 1(zodOutputFormat 이 enum 을 description 으로 옮김): 설계 변경이 아닌지, 지시문이 세 값을 적는지, 다른 값이 '규격 깨짐' 실패로 가는지 확인하고 심각도를 매긴다.
11. 품질: 오류 처리 · 경계(빈 대상 · 기록 파일 깨짐 · 동시성 `--concurrency` 8 상한) · 한국어 출력 문구 · 코드 식별자 영어 · 주석 한국어 · 중복 · 죽은 코드.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p05a.md`(메인 저장소 장부, Write 도구). 판정 Approved · Changes requested. 지적마다 심각도(Critical · Important · Minor)와 근거(파일 · 줄, plan 절 · 정본 절 · 13절 번호)를 적고, 근거 없는 지적은 넣지 않는다. 설계 준수 표(빠진 것 · 넘친 것 · 잘못 이해한 것)와 '다르게 한 것' 1~11 판정 표를 둔다. 마지막 메시지는 판정 + C · I · M 수 + 요지 세 줄.
