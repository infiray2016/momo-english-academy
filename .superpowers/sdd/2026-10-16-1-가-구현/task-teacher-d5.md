# 구현 브리프: P13d 묶음 d5 — 선생님 상태 · 목소리 고르기(순수) · 음성 층(implementer · Opus · high, 2026-10-23 12:5x)

근거: `intent/2026-10-17-회화-선생님-캐릭터/plan.md`(approved — 13절 C141). **d5 몫 전부**: '작업 순서' 2(d5) 차례 1~4, '바뀌는 파일' 표의 d5 행, '파일별 값' 가운데 d5 가 가리키는 값(선생님 상태 · 칭찬 · 움직임 · 깜빡임 · 차례 번호 · 목소리 고르기 · 음성 층 높이 · 순서 · 시작 알림 · 선생님 음성 감싸기 · 가짜 음성 기록), '증명' 표의 AC-19g · 19h · 19j 함수 몫. 시제품 움직임 시험 다섯(`/Users/hikaru/workspace/momo-english-academy/prototypes/teacher-avatar/test/`)이 같은 뜻으로 통과해야 한다. 음성 층에 navigator.audioSession 쓰기를 두지 않는다(C109).

자리: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(가지 feature/1a-p13d-teacher). 모든 명령은 이 폴더에서. `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`. 시험 먼저. **커밋 · push 없음**. git stash 쓰지 않음.

- 같은 워크트리에서 다른 구현자(d1 · d2)가 다른 파일을 고친다. plan '같은 워크트리에서 나란히' 문단의 d5 범위(`src/core/teacher/{state,voice}.ts` · `src/lib/speech/` 와 그 시험) 밖은 건드리지 않는다. 전체 시험이 다른 묶음의 쓰는 중인 코드 때문에 깨지면 그 사실만 적고 자기 시험 파일은 `pnpm exec vitest run <파일>` 로 확인한다.
- 관문: `pnpm lint` · `pnpm exec next typegen && pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps`.

보고: `task-teacher-d5-report.md`(같은 폴더) — 바뀐 파일 · 시험 이름 · 관문 결과 · plan 으로 풀리지 않아 정한 것 · 우려. 마지막 답장은 한 줄 요약.
