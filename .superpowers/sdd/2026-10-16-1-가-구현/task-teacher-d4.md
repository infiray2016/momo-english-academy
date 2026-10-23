# 구현 브리프: P13d 묶음 d4 — 아이 화면 글의 선생님 이름 자리(implementer · Opus · high, 2026-10-23 13:4x)

근거: `intent/2026-10-17-회화-선생님-캐릭터/plan.md`(approved — 13절 C141 · C142). **d4 몫 전부**: '작업 순서' 5(d4) 차례 1~6, '바뀌는 파일' 표의 d4 행, '파일별 값' 가운데 d4 가 가리키는 값(조사 고르기 · 문구 표 · 이름 공유 provider · (child) layout · AiRest · 회화 화면 글 — tori · talk-frame · follow-along · child-turn · closing-cards · 홈 · 배치 · 첫 실행 글 · 화면 글자 훑기), 정본 4절 머리 문단([이름] · 조사), '정본 밖 문구' 표는 d6 몫, '증명' 표의 AC-19c(문구 · 훑기). 고르기 전 이름은 '선생님'. 바탕: p13d 커밋 f9651ea(d2 — 회화 화면 자료의 선생님).

자리: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(가지 feature/1a-p13d-teacher). 모든 명령은 이 폴더에서. `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`. 시험 먼저. **커밋 · push 없음**. git stash 쓰지 않음.

- 같은 워크트리에서 d1(시드 · 스크립트 · `src/core/seed/` · CREDITS.md)과 d3(`src/core/ai/calls/talk.ts` · `src/server/conversation/` · `src/server/ai/`)이 함께 고친다. d4 범위(`src/core/teacher/name.ts` · `src/components` · `src/app` · 그 시험 · e2e 문구 상수) 밖은 건드리지 않는다. `talk-frame.tsx` 는 d6 · d7 · d8 이 뒤에 이어 고치니 d4 는 글 자리만.
- 음성 층의 navigator.audioSession 훑기는 d5 가 `tests/unit/teacher-speech.test.ts` 에 이미 넣었다 — 화면 글자 훑기(teacher-scan)에 같은 훑기를 다시 넣지 않는다.
- e2e 는 이 Mac 에서 돌지 않는다. e2e 문구 상수 · 단언을 고치고 CI 에서 본다. 전체 시험이 다른 묶음의 쓰는 중인 코드로 깨지면 그 사실만 적고 자기 시험 파일은 `pnpm exec vitest run <파일>` 로 확인한다.
- 관문: `pnpm lint` · `pnpm exec next typegen && pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps`.

보고: `task-teacher-d4-report.md`(같은 폴더) — 바뀐 파일 · 시험 이름 · 관문 결과 · '토리' 훑기 결과 · plan 으로 풀리지 않아 정한 것 · 우려. 마지막 답장은 한 줄 요약.
