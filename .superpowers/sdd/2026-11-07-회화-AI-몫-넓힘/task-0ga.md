# 묶음 0-가 — 설정 키 둘(talk.self_line_every_turns · talk.greeting_recall)

브리프: 컨트롤러 · 2026-11-07 06:3x · 구현자 Opus high · 가벼운 루프(검토 code-reviewer Opus high 범위 한정, Minor 는 컨트롤러)

## 맥락(열 줄 안)
- 닿는 결정: 13절 C211 (1) · (5) · C211 보완 · 장부 T-157(새 설정 키는 적재 → 배포 → 서버 턴 확인, 턴 입구에서 빠짐이 드러나게). 정본 12절 새 키 둘: `specs/09-설정값.md` 88~89줄 안팎(talk.self_line_every_turns 3 '빈도 참고값' · talk.greeting_recall 끔).
- plan: `intent/2026-11-06-회화-AI-몫-넓힘/plan.md`(approved) — 바뀌는 파일 표의 0-가 행(43~48줄), 정한 것 2(키 꼴: 정수 1 이상 · "off" · "on"), 작업 순서 1번, 위험 1 · 11. spec 판 4 설계 3 · 9(`intent/2026-11-06-회화-AI-몫-넓힘/spec.md`).
- 요청자 강조: "빨리 진행해" · 추가 승인 없음. 고정부 글 · 흐름 · 시드 목록 · 카드는 이 묶음이 건드리지 않는다(다른 묶음이 나란히 돈다 — 0-나 는 시드 규격 · 목록, 4-가 는 대본 도구).

## 할 것(plan 0-가 행 그대로)
- `seed/settings.json` 행 둘(scope household · changeVia 는 plan 행대로) · `tests/fixtures/settings.ts` TEST_SETTINGS 같은 두 키 · `src/core/ai/calls/talk-lesson.ts` KEYS 둘 + 내보내는 `TALK_PROMPT_SETTING_SCHEMAS`(TEACHER_SENTENCES_SETTING_SCHEMAS 꼴) · `src/server/conversation/turn.ts` turnSettings 에 펼침(TurnRequestSchema 그대로) · 새 시험 `tests/unit/talk-setting-keys.test.ts`(설정 규격 ∪ turnSettings 의 키가 모두 seed/settings.json · TEST_SETTINGS 에 있음) · 손으로 만든 설정 사전을 쓰는 시험에 두 키 더함(빠진 키는 던짐을 보는 시험은 그대로).
- 완료 조건: 관문 0(`pnpm lint` · `npx tsc --noEmit` · `pnpm test`) · **`pnpm check:ids` 가 CI 와 같은 인자로 초록**(spec-setting-missing 0; HEAD 6e86881 은 통과하므로 design-number 가 늘었으면 원인을 보고에 적고 최소로 고침 — 제외 목록 · 상한 조정은 근거와 함께).

## 지킬 것
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(HEAD 6e86881 + 정본 사본 변경 미커밋). 명령은 서브셸만: `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && … )`. 긴 출력은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/` 에 `ai-scope-0ga-*.txt` 로.
- 같은 폴더 나란히 규칙(plan 정한 것 10): 다른 묶음 소유 파일은 건드리지 않고, 남의 붉은 시험만으로 관문이 막히면 내 시험 파일만 `vitest run --project unit <파일…>` 결과를 붙여 보고 첫 줄 BLOCKED. 시드 목록 · 검증기 · 대본 도구 · 고정부 글은 남의 것.
- 커밋하지 않는다. 보고: `.superpowers/sdd/2026-11-07-회화-AI-몫-넓힘/task-0ga-report.md`(바뀐 파일 · check:ids 결과 · 시험 수 · 관문 · 못 한 것). 저에게는 요지 세 줄.
