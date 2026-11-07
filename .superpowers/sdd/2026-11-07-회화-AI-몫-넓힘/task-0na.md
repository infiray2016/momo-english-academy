# 묶음 0-나 — 계약(카드 칸 sceneOpener · 시드 목록 넷의 꼴)

브리프: 컨트롤러 · 2026-11-07 06:3x · 구현자 Opus high · 가벼운 루프(검토 code-reviewer Opus high 범위 한정)

## 맥락(열 줄 안)
- 닿는 결정: 13절 C206(장면 여는 질문) · C207(신호 말은 앱이 시드 목록에서) · C211 (1)(지어낸 경험 금지 목록). 정본 6.3 회화 카드 행 · `specs/06-시드-생성.md` 186 · 187 안팎(장면 여는 질문 · 목록 넷 검사 규칙은 묶음 3 몫 — 이 묶음은 꼴만).
- plan: `intent/2026-11-06-회화-AI-몫-넓힘/plan.md`(approved) — 바뀌는 파일 표 0-나 행(49~52줄), 정한 것 3(sceneOpener 는 Zod 선택 칸 — 개정 4 카드가 invalid 되지 않게) · 5(목록 넷 파일 이름 · 칸 · 빌드 포함 next.config.ts outputFileTracingIncludes) · 6(신호 말 저장 안 함), 작업 순서 2번. spec 판 4 설계 5 · 6 · 9.
- 요청자 강조: 대본 같은 고정 질문이 되지 않게(장면 · 주제만 준비). 검증기 규칙 · 카드 내용 · 서버 턴 길은 손대지 않는다(묶음 3 · 1 · 2 몫).

## 할 것(plan 0-나 행 그대로)
- `src/core/seed/schema/talk.ts` TalkSceneOpenerSchema(선택 칸) · `src/core/seed/schema/reference.ts` · `src/core/seed/structure.ts` · `src/server/seed-lists.ts` 목록 넷 Zod 규격 · SEED_FILES · 읽기 · `seed/lists/talk-cue-lines.json` · `talk-situation-lines.json` · `talk-allowed-words.json` · `talk-made-up-phrases.json` 신규(규격에 맞는 최소 내용 — 내용 마무리는 묶음 3) · `next.config.ts` 빌드 포함 확인 · 새 시험 `tests/unit/talk-ai-scope-contract.test.ts`(칸 있는 · 없는 카드가 모두 new · 목록 넷 규격 · SEED_FILES · textsOfTalkCard 의 sceneOpener 경로).
- 완료 조건: 관문 0(lint · tsc · 단위) · `pnpm seed:validate` 0 · 개정 4 카드가 new 로 읽힘.

## 지킬 것
- 워크트리 · 명령 · 스크래치패드(`ai-scope-0na-*.txt`) · 나란히 규칙(plan 정한 것 10) · 커밋 금지는 묶음 0-가 브리프와 같다. 다른 묶음 소유 파일(talk-lesson.ts · turn.ts · settings.json · check-talk.ts · talk-observe.ts · 카드 JSON)은 건드리지 않는다.
- 보고: `.superpowers/sdd/2026-11-07-회화-AI-몫-넓힘/task-0na-report.md`. 저에게는 요지 세 줄.
