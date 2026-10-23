# 구현 브리프: P13d 묶음 d7 — 선생님 창(초상 · 상태 표시 · 이름표) · 상태 연결 · 칭찬(implementer · Opus · high, 2026-10-23 14:1x)

근거: `intent/2026-10-17-회화-선생님-캐릭터/plan.md`(approved — 13절 C141 · C142, '작업 순서' 머리 컨트롤러 덧). **d7 몫 전부**: '작업 순서' 7(d7) 차례 1~4, '바뀌는 파일' 표의 d7 행, '파일별 값' 가운데 d7 이 가리키는 값(선생님 창 · 창 칸 레이아웃 · 상태 연결 · 선생님 음성 감싸기 · 칭찬 때 · onPraise · tori · follow-along 정리 · 디자인 리뷰 2 N-3 회화 세로 띠 · e2e WebGL 끔 · 상태 속성 data-teacher-*), 정본 4절 회화 세션 '선생님 창' 행, '증명' 표의 AC-19c(창 · 말풍선 접근 이름) · 19g · 19h(초상 몫) · 19j(화면). 창은 이 묶음에서 **늘 초상**이다(3D 와 대신 표시 까닭 속성은 d8). 바탕: d6 이 끝난 작업 트리(고르는 화면 · 초상 조각 `src/components/teacher/` · 관찰 쪽 · talk-frame 고르기 차례 — 아직 커밋 전, 같은 트리).

자리: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 모든 명령은 이 폴더에서. `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`. 시험 먼저. **커밋 · push 없음**. git stash 쓰지 않음.
- 같은 워크트리에서 손질 1 구현자가 검토 1 지적 넷을 고치고 있다 — `tests/unit/{teacher-state,teacher-voice,teacher-speech,speech-speak}.test.ts` 의 시험 이름 · `src/server/conversation/index.ts` 의 stopTalk · `src/core/seed/{structure,check-teacher}.ts` · `src/core/seed/schema/teachers.ts` · `src/core/conversation/attempt.ts` · `src/server/teacher/index.ts` · `tests/unit/seed-teacher.test.ts`. 이 파일들은 건드리지 않는다(필요하면 보고에 적는다). 전체 시험이 그쪽 쓰는 중인 코드로 깨지면 그 사실만 적고 자기 시험 파일은 `pnpm exec vitest run <파일>` 로 확인한다.
- 3D 는 d8 몫이다. 창은 초상 · 상태 표시(쉬기 · 말하기 · 듣기 · 칭찬 · 생각) · 이름표(accent 바탕 · 종이색 글자 — C141)로 끝까지 수업이 되게 한다. e2e 는 WebGL 을 끈 채(plan 값) 돈다 — 이 Mac 에서는 돌지 않으니 쓰고 CI 에서 본다. 사진 이름은 plan 대로(teacher-window-* 가로 · 세로).
- 관문: `pnpm lint` · `pnpm exec next typegen && pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps`.

보고: `task-teacher-d7-report.md`(같은 폴더) — 바뀐 파일 · 시험 이름 · 관문 결과 · 사진 이름 · plan 으로 풀리지 않아 정한 것 · 우려. 마지막 답장은 한 줄 요약.
