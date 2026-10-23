# 구현 브리프: P13d 묶음 d3 — 회화 AI 고정부의 선생님 블록(implementer · Opus · high, 2026-10-23 13:4x)

근거: `intent/2026-10-17-회화-선생님-캐릭터/plan.md`(approved — 13절 C141 · C142). **d3 몫 전부**: '작업 순서' 4(d3) 차례 1~4, '바뀌는 파일' 표의 d3 행, '파일별 값' 가운데 d3 가 가리키는 값(회화 턴 · 끝맺음 턴 고정부 첫머리 선생님 블록 · 사람의 삶을 지어내지 않는 줄 · 스키마 설명 글에 이름 없음 · 첫 사용자 메시지 이름표 'Mina (app):' · 실시간 낱말 범위의 선생님 영어 이름 · 이어 하는 세션은 처음 스냅숏 키), 회화 쪽 Minor(재검토 rev-p13b N-1 흘려 받기 실패 길 onStuck · N-4 하루 안전 상한 기록 감싸기 · 같은 단위 이름 — `review-p13-feel-fix1-code.md`), '증명' 표의 AC-19d(수동 표본 밖). 바탕: p13d 커밋 f9651ea(d2 — 대화 상태의 선생님 · 처음 스냅숏 키).

자리: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(가지 feature/1a-p13d-teacher). 모든 명령은 이 폴더에서. `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`. 시험 먼저. **커밋 · push 없음**. git stash 쓰지 않음.

- 같은 워크트리에서 d1(시드 · 스크립트 · `src/core/seed/` · CREDITS.md)과 d4(`src/core/teacher/name.ts` · `src/components` · `src/app`)가 함께 고친다. d3 범위(`src/core/ai/calls/talk.ts` · `src/server/conversation/{state,turn}.ts` · `src/server/ai/talk.ts` · 그 시험 · AI 견본 입력) 밖은 건드리지 않는다. 전체 시험이 다른 묶음의 쓰는 중인 코드로 깨지면 그 사실만 적고 자기 시험 파일은 `pnpm exec vitest run <파일>` 로 확인한다.
- `pnpm ai:contract --dry-run`(요청 꼴만, 실호출 없음)으로 고정부 · 스키마 설명을 확인한다. 통합 시험은 이 Mac 에서 돌지 않으니 쓰고 CI 에서 본다.
- 관문: `pnpm lint` · `pnpm exec next typegen && pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps`.

보고: `task-teacher-d3-report.md`(같은 폴더) — 바뀐 파일 · 시험 이름 · 관문 결과 · 미나 · 리오 고정부 글 차이(선생님 블록 밖은 글자까지 같은지) · plan 으로 풀리지 않아 정한 것 · 우려. 마지막 답장은 한 줄 요약.
