# fix 2 보고: P7a 적재 · 판 규칙 Minor 넷(impl-p07a · Opus · high)

상태: DONE. review-p07a-2 의 N-1~N-4 를 모두 고쳤다. 워크트리 `.claude/worktrees/p07`, 커밋 없음, 실제 DB 접속 없음, package.json 그대로.

시험을 먼저 고쳤고 고치기 전에 둘이 실패했다. 하나는 fix 1 의 DB 오류 시험(기대 줄을 '적재 중 오류'로 바꿈)이고, 하나는 새 불변식 오류 시험(`SeedLoadInvariantError` 없음)이다.

## 지적마다

| 지적 | 판정 | 파일:줄 | 시험 |
|---|---|---|---|
| N-1 트랜잭션 전 오류도 'DB 오류'로 숨김 | ADDRESSED | `src/server/seed/load.ts:261` `SeedLoadInvariantError`(던지는 쪽과 같은 층, 메시지에 칸 키 · 파일 이름만). 칸 종류 불일치 네 곳이 이 갈래를 던진다. '검증을 넘었는데 규격 파일이 없다' 는 빠진 파일 이름을 붙여 이 갈래로 던진다(`:912`). `scripts/seed-load.ts:270` 이 그 메시지를 그대로 내고, 나머지는 `seed-load: 적재 중 오류(<이름> <코드>)`. 둘 다 종료 2. 머리 주석 6~8 줄 | `seed-load.test.ts:995` "적재 명령: 칸 종류 불일치 같은 불변식 오류는 칸 키만 담은 메시지를 그대로 내고 종료 2 다" — `buildIncoming` 에 칸 키는 수업 · 칸 종류는 이야기인 칸을 넘겨 `칸 키와 칸 종류가 맞지 않는다: <칸 키>` 를 받고, 가짜 접속이 적재 중 그 오류를 던질 때 명령 줄이 그 메시지 하나 · 표지 글 없음 · 접속 닫힘. fix 1 시험의 기대 줄은 `seed-load: 적재 중 오류(Error CONNECTION_CLOSED)` |
| N-2 조합 검사 건너뜀이 출력에 없음 | ADDRESSED | `load.ts:1017` `price-row-invalid` 글 끝에 '이 행을 바로잡기 전까지 조합 검사는 건너뛴다' | 기존 price-row-invalid 시험이 그대로 지난다 |
| N-3 될 수 없는 고침 안내 | ADDRESSED | `load.ts:1017` '새 적용일 행을 더한다'를 빼고 '그 행을 SQL 편집기에서 바로잡는다' 하나만 | 같음 |
| N-4 sentence 갈래 단언 없음 | ADDRESSED | `seed-load.test.ts:284` 근처 — `answerOf({ type: "repeat", sentence: "I like it.", no: 1, revision: 1, correction: 0 })` 가 `{ sentence: "I like it." }` | 'AC-17b 같은 판을 두 번 …' 안 |

## 망가뜨림(N-4)

`answerOf` 의 정답 칸 목록에서 `"sentence"` 를 뺀 복사본으로 'AC-17b 같은 판을 두 번' 을 돌렸다. `expected {} to deeply equal { sentence: 'I like it.' }` 로 실패했고, 원본으로 되돌린 뒤 다시 지난다.

## 바뀐 파일

- `src/server/seed/load.ts`: `SeedLoadInvariantError` 를 더하고, `buildIncoming` 을 내보내고(시험용), 규격 파일 없음 오류를 이 갈래로 바꾸고, `price-row-invalid` 글을 고쳤다.
- `scripts/seed-load.ts`: 오류 갈래를 나누고 머리 주석을 고쳤다.
- `tests/integration/seed-load.test.ts`: 새 시험 하나, fix 1 시험의 기대 줄, sentence 단언 한 줄.

## 완료 판정 대조

| 판정 | 결과 |
|---|---|
| `pnpm exec biome ci .` | exit 0 |
| `pnpm build` | exit 0 |
| `pnpm test` | 221 passed(그대로) |
| `pnpm test:int` | 6 파일 · 55 passed · 1 skipped(54 + 1 → 55 + 1) |
| `pnpm check:deps` | ✔ no dependency violations found (46 modules, 132 dependencies cruised) |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | missing-test 51(그대로) · exit 0 |
| `pnpm check:bundle` | 위반 0 |
| `pnpm seed:load --root /nonexistent-root` | `seed-load: 시드 뿌리 폴더가 없다: /nonexistent-root` · exit 2 · 접속 문자열 0(셸에 접속 변수 0 건, .env.local 없음) |
| 비밀값 grep(바뀐 파일 셋) | 0 건 |

## 알릴 것

- 검토 4절 범위 밖 관찰(`finally { await handle.close() }` 가 던지면 결과를 덮음)은 브리프에 없어 고치지 않았다.
- `buildIncoming` 은 불변식 오류 시험만을 위해 내보낸다. 다른 쪽이 부르지 않는다.

## git status --short

```
 M package.json
?? ".superpowers/sdd/2026-10-16-1-가-구현/task-p07a-fix1-report.md"
?? ".superpowers/sdd/2026-10-16-1-가-구현/task-p07a-fix2-report.md"
?? ".superpowers/sdd/2026-10-16-1-가-구현/task-p07a-report.md"
?? scripts/seed-load.ts
?? src/core/seed/settings-compare.ts
?? src/core/seed/version-pick.ts
?? src/server/seed/
?? tests/fixtures/seed/loadable.ts
?? tests/integration/seed-load.test.ts
?? tests/integration/seed-version.test.ts
?? tests/unit/settings-compare.test.ts
?? tests/unit/version-pick.test.ts
```
