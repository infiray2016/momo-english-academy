# 구현 브리프: P13d 묶음 d1 — 줄인 모델 · 초상 자산 · 명단 칸 · 자산 검사(implementer · Opus · high, 2026-10-23 12:5x)

근거: `intent/2026-10-17-회화-선생님-캐릭터/plan.md`(approved — 13절 C141). 이 plan 이 자족 문서다. **d1 몫 전부**: '작업 순서' 1(d1) 차례 1~5, '바뀌는 파일' 표의 d1 행, '파일별 값' 가운데 d1 이 가리키는 값(줄이기 스크립트 · VRM 머리글 · 자산 검사 · 명단 칸 · 빼는 낱말 칸 · 대비 짝 · 출처 문서), '증명' 표의 AC-19a(명단 몫) · AC-19e(칸 옮긴 뒤 그대로) · AC-19k. 정본(본 저장소 specs/ = p13d specs/)은 13절 C130 · C131 · C141.

자리: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(가지 feature/1a-p13d-teacher). 모든 명령은 이 폴더에서. `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`. 시험 먼저. **커밋 · push 없음**(컨트롤러가 한다). git stash 쓰지 않음.

- 원본 VRM(읽기만, 덮어쓰지 않음): `/Users/hikaru/workspace/momo-english-academy/prototypes/teacher-avatar/public/models/{mina,leo}.vrm`, 초상 원본은 같은 시제품의 `public/portraits/`. 원본은 저장소에 넣지 않는다(FR-11).
- 도구: `/usr/local/bin/cwebp` · `dwebp` 1.6.0(설치돼 있음).
- **차례 2(명단 칸 필수 · `public/teachers/` 파일 넷 · 명단 채움)가 끝나 `pnpm seed:validate` 오류 0 이면, 보고 전에 SendMessage(to: main)로 '차례 2 끝'과 그때까지 바뀐 파일 목록을 알리고 차례 3 으로 계속한다.** 컨트롤러가 그 몫을 커밋하고 d2 구현자를 띄운다.
- 같은 워크트리에서 다른 구현자(d2 · d5)가 다른 파일을 고친다. plan '같은 워크트리에서 나란히 돌릴 때' 문단의 d1 범위(시드 · 스크립트 · `src/core/seed/` · `CREDITS.md` · `public/teachers/` · `package.json` 의 teacher:reduce 줄) 밖은 건드리지 않는다. `package.json` 은 다른 묶음도 고칠 수 있으니 한 줄만 더하고 lockfile 을 바꾸지 않는다(새 의존 없음). 전체 시험이 다른 묶음의 쓰는 중인 코드 때문에 깨지면 그 사실만 적고 자기 시험 파일은 `pnpm exec vitest run <파일>` 로 확인한다.
- 관문: `pnpm lint` · `pnpm exec next typegen && pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm seed:validate` · `pnpm check:ids`.

보고: `task-teacher-d1-report.md`(같은 폴더) — 바뀐 파일 · 시험 이름 · 관문 결과 · 크기(1024 파일 넷, 2048 표본 둘) · plan 으로 풀리지 않아 정한 것 · 우려. 마지막 답장은 한 줄 요약.
