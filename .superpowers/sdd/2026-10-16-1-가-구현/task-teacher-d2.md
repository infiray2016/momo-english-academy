# 구현 브리프: P13d 묶음 d2 — profiles.teacher_key · 명단 서버 · 보일 선생님 · 고르기 액션 · 회화 화면 자료(implementer · Opus · high, 2026-10-23 13:0x)

근거: `intent/2026-10-17-회화-선생님-캐릭터/plan.md`(approved — 13절 C141). **d2 몫 전부**: '작업 순서' 3(d2) 차례 1~6, '바뀌는 파일' 표의 d2 행, '파일별 값' 가운데 d2 가 가리키는 값(마이그레이션 · 명단 서버 · 보일 선생님 · chooseTeacher · TalkState.teacher · 처음 스냅숏 키 · 시험 집 기본값 teacher_key 'mina'), '증명' 표의 AC-19a(보일 선생님 셋) · AC-19b(액션 · 스냅숏). 바탕: d1 차례 1 · 2 커밋 ff745d8(명단 칸 필수 · `public/teachers/`).

자리: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(가지 feature/1a-p13d-teacher). 모든 명령은 이 폴더에서. `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`. 시험 먼저. **커밋 · push 없음**(컨트롤러). git stash 쓰지 않음. 개발용 DB 에 마이그레이션을 적용하지 않는다(코드 검토 뒤 컨트롤러 몫 — plan 최단 차례 3).

- 같은 워크트리에서 다른 구현자(d1 차례 3~5 · d5)가 다른 파일을 고친다. plan '같은 워크트리에서 나란히' 문단의 d2 범위(`src/db` · `drizzle` · `src/server` · `src/core/teacher/roster.ts` · `src/core/conversation/attempt.ts` · `next.config.ts` 와 그 시험 · 시험 집 fixtures) 밖은 건드리지 않는다. d3 이 `src/server/conversation/state.ts` 를 뒤에 고치니 d2 는 plan 이 정한 몫만. 전체 시험이 다른 묶음의 쓰는 중인 코드 때문에 깨지면 그 사실만 적고 자기 시험 파일은 `pnpm exec vitest run <파일>` 로 확인한다.
- 통합 · e2e 는 이 Mac 에서 돌지 않는다(새 Postgres 가 뜨지 않음) — 통합 시험은 쓰고 CI 에서 확인한다. 컨트롤러가 CI 를 돌린다.
- 관문: `pnpm lint` · `pnpm exec next typegen && pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm seed:validate` · `pnpm check:ids`.

보고: `task-teacher-d2-report.md`(같은 폴더) — 바뀐 파일 · 마이그레이션 SQL · 시험 이름 · 관문 결과 · plan 으로 풀리지 않아 정한 것 · 우려. 마지막 답장은 한 줄 요약.
