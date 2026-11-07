# 검토 브리프 — 묶음 0-가(설정 키 둘) · 0-나(계약) 범위 한정 코드 검토(Opus high, 가벼운 루프)

## 맥락(열 줄 안)
- 닿는 결정: 13절 C206 · C207 · C211 (1) · (5) · T-157(새 설정 키는 턴 입구에서 빠짐이 드러나게). plan `intent/2026-11-06-회화-AI-몫-넓힘/plan.md`(approved) 정한 것 2 · 3 · 5 · 6 · 11, 바뀌는 파일 표 0-가(43~48줄) · 0-나(49~52줄). spec 판 4 설계 5 · 6 · 9.
- 보고: `task-0ga-report.md`(+ '보정 1' 절: check:ids 의 design-number 훑기에서 src/app/dev/ 제외) · `task-0na-report.md`(우려: SEED_FILES 넓히며 REFERENCE_SCHEMAS · ReferenceFiles 타입 · 시험 빌더 · seed-schema 시험 표 등록).
- 워크트리 `.claude/worktrees/p13d`(HEAD 6e86881 + 미커밋). 같은 폴더에서 4-가(대본 도구 `scripts/talk-observe.ts` · `tests/fixtures/talk-observe/*` · `tests/unit/talk-observe*.test.ts`)가 아직 진행 중이라 그 파일은 보지 않는다. diff 는 `git diff -- <두 보고의 파일 목록>` 으로 직접 뜬다(읽기 전용).

## 볼 것(범위 한정)
1. 0-가: 키 꼴(정수 1 이상 · "off" · "on")이 12절(`specs/09-설정값.md` 새 키 둘)과 같은가, turnSettings 펼침이 TurnRequestSchema 를 바꾸지 않는가, 빠진 키가 턴 입구 SettingMissingError 로 드러나는가(시험 talk-setting-keys 가 실제로 가르는가), check-ids 의 dev 제외가 design-number 에만 걸리고 다른 규칙 · 상한은 그대로인가.
2. 0-나: sceneOpener 가 Zod 선택 칸이라 개정 4 카드가 new 로 읽히는가(정한 것 3), 목록 넷의 규격 · 파일 이름 · 칸(정한 것 5)이 spec 설계 5 · 6 과 같은가, SEED_FILES 확장이 seed:validate · 서버 읽기 · 빌드 포함(next.config.ts)에서 빠진 곳이 없는가, 신호 말을 저장하지 않는 꼴(정한 것 6)이 계약에 담겼는가.
3. 녹음 안 함(AC-8 (마)): 두 묶음이 소리를 잡거나 보내는 코드를 더하지 않았는가.
4. 시험이 빈 단언 없이 위 1 · 2 를 가르는가.

## 보고
`task-rev-0.md`: 판정(Approved · 수정 필요) · 지적(심각도 · 파일 · 줄). Minor 는 컨트롤러가 직접. 저에게는 판정과 Critical · Important 만 세 줄.
