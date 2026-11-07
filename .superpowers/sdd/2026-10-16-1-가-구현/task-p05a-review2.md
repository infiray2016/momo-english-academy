# 재검토 브리프: P5a 풀이 검사 명령 fix 1(code-reviewer rev-p05a 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-17 00:4x)

범위 한정 재검토다. `review-p05a.md` 의 지적 I-1 · M-1 · M-2 · M-3 · M-4 와 범위 밖 관찰(ANTHROPIC_BASE_URL)이 fix 1 에서 어떻게 처리됐는지 ADDRESSED · NOT ADDRESSED 로 가른다. 새 지적은 fix 1 이 바꾼 줄에서 생긴 것만 받는다.

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a0ffe8037fa827af6`(feature/1a-p05a-seed-check, 커밋 없음). fix 1 이 바꾼 파일: `scripts/seed-check.ts`(916 → 1005줄) · `tests/unit/seed-check-cli.test.ts`(시험 8 → 10).
- fix 1 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p05a-fix1-report.md`(지적마다 판정 · 파일:줄 · 시험, '검토자에게 알릴 것' 셋 — referenceErrors 전체를 봄 · M-1 사전 확인은 이번에 풀 칸만 · 파일 길이).
- 컨트롤러 재확인(00:4x): biome 0 · build · 단위 182 · check:deps 0 · spec-trace 58 · bundle 0 · 비밀값 0.

## 볼 것
1. I-1: `selectSolveTargets` 뒤 `referenceErrors > 0` 이면 2(풀이 · --dry-run · --json 모두) — 문구, 풀이 함수 호출 0 · checks 쓰기 0 을 새 시험이 실제로 보는지, 정상 miniSeed 에서 referenceErrors 0 이라 기존 시험이 그대로인지. 보고 '알릴 것' 1(referenceErrors 전체 기준)을 받을지.
2. M-1: 부르기 전 checks 파일 사전 확인(`readCheckFile`)이 이번에 풀 칸만 보는 것, 깨진 파일은 덮어쓰지 않는 규칙 유지, 실패 까닭 문구, 예외(권한) 처리.
3. M-2: `--file` 없는 파일 · `--areas` 밖 영역 → 2, 토리 이야기는 회화 영역으로 보는 것(`fileArea`).
4. M-4: broken 사례가 기록 없는 실패 · 다음 실행 재풀이를 보는지.
5. 범위 밖 관찰: `baseUrlNotice` 가 풀이 · --probe 때만, --json 이면 표준 오류, 키 값 아님 — 동작 변경 없음.
6. M-3: 코드 그대로 두고 관찰표 항목만 — 받을지.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p05a-2.md`(Bash 로 써도 된다). 첫 줄 판정(Approved · Changes requested, C · I · M 수), 지적마다 ADDRESSED · NOT ADDRESSED(근거 파일:줄), 새 지적(있으면 심각도 · 근거). 마지막 메시지는 판정 + 요지 세 줄.
