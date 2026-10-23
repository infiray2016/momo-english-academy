# 구현 브리프: P13d 손질 1 — 묶음 검토 1 지적 넷(implementer · Opus · high, 2026-10-23 14:0x)

근거: 검토 보고 `review-teacher-1-code.md`(같은 폴더, Changes requested — I-1 · M-1 · M-2 · M-3). plan `intent/2026-10-17-회화-선생님-캐릭터/plan.md`(approved). 아래 넷만 고친다.

1. **I-1**: d5 시험 이름 앞에 정본 번호를 붙인다(본문은 그대로) — `tests/unit/teacher-state.test.ts` · `teacher-voice.test.ts` · `teacher-speech.test.ts` · `speech-speak.test.ts` 의 d5 새 시험. 상태 차례 · 칭찬 · 시제품 다섯 · 감싸기 · 시작 알림 · audioSession → `AC-19g …`, 움직임 줄이기 · 깜빡임 → `AC-19h …`, 목소리 고르기 · 접점 높이 · 목소리 → `AC-19j …`. `pnpm spec-trace`(또는 package.json 의 이름)로 세 번호가 잡히는지 확인한다.
2. **M-1**: `src/server/conversation/index.ts` stopTalk — 처음 스냅숏이 없는 세션(선생님을 아직 안 고름)이면 중단 · 끝맺음 기록 · 끝맺음 턴 예약 없이 not_found(기존 결과 꼴)로 돌려준다. 통합 시험 한 줄(이 Mac 에서는 못 돌림 — CI).
3. **M-2**: 선생님 키 정규식을 `src/core/seed/structure.ts` 한 곳에 두고 `src/core/seed/schema/teachers.ts` · `src/core/conversation/attempt.ts` · `src/server/teacher/index.ts` 가 그것을 쓴다(뜻 그대로).
4. **M-3**: `src/core/seed/check-teacher.ts` checkTeacherAssets — 모델 경로가 `teachers/<키>.<sha256 앞 8자>.vrm` 꼴이고 그 8자가 명단 모델 해시 앞 8자와 같은지, 초상 경로가 `teachers/<키>.<8자>.webp` 이고 그 8자가 읽은 바이트 해시 앞 8자와 같은지 본다(규칙 teacher-asset). 깨뜨린 자료마다 거부 하나 시험. 실제 명단이 통과하는지.

자리: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`. 시험 먼저. **커밋 · push 없음**. git stash 쓰지 않음. 같은 워크트리에서 d6 구현자가 고르는 화면 · 관찰 쪽 · talk-frame · 단원 바로 가기를 고치고 있다 — 위 넷의 파일 밖은 건드리지 않는다(특히 `src/components` · `src/app` · `src/core/profile`). 전체 시험이 d6 의 쓰는 중인 코드로 깨지면 그 사실만 적고 자기 시험 파일은 `pnpm exec vitest run <파일>` 로 확인한다.
- 관문: `pnpm lint` · `pnpm exec next typegen && pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm seed:validate`.

보고: `task-teacher-fix1-report.md`(같은 폴더) — 지적마다 고친 파일:줄 · 시험 이름 · 관문 결과. 마지막 답장은 한 줄 요약.
