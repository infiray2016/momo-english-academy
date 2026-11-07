# fix 브리프: P7a 적재 · 판 규칙 fix 2 — Minor 넷(implementer impl-p07a 이어 보기 · Opus · high, 2026-10-17 14:5x)

`review-p07a-2.md`(rev-p07a, **Approved** — C 0 · I 0 · M 4, 지난 일곱 · 덤 모두 ADDRESSED, `loadSeedWithKeys` · 조합 검사 건너뜀 선택 받음)의 Minor 넷을 고친다. Minor 만이라 재검토 없이 컨트롤러가 diff 와 시험으로 확인한다(C52). 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p07`(feature/1a-p07-seed-load, 커밋 없음). 커밋하지 않는다. 공용 파일 변경 없음(package.json 그대로). 실제 DB 접속 없음(embedded-postgres 통합 시험은 된다). 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴.

## 고칠 것(컨트롤러 판정)
1. **N-1** — `scripts/seed-load.ts:266-270` 이 `loadSeedWithKeys` 의 모든 오류를 'DB 오류로 적재를 되돌렸다(Error)'로 적어, 트랜잭션 전에 나는 오류(칸 종류 불일치 `load.ts:326`, '검증을 넘었는데 규격 파일이 없다' `load.ts:887`)의 메시지를 숨긴다. 판정: 칸 키 · 파일 이름만 담는 오류 갈래 하나(`SeedLoadInvariantError`, 경계 규칙에 맞는 자리 — 던지는 쪽과 같은 층)를 두고, 명령은 그 갈래의 메시지를 그대로 내고 나머지는 '적재 중 오류(<이름> <코드>)'로 적는다. 종료 코드는 둘 다 2. 칸 내용 · SQL · 질의 인자는 여전히 어디에도 없다(I-1 유지). 시험: 칸 종류 불일치 사례에서 메시지가 칸 키만 담고 그대로 나오는지.
2. **N-2** — `load.ts:1031` 조합 검사 건너뜀을 `price-row-invalid` 글(991) 끝에 '이 행을 바로잡기 전까지 조합 검사는 건너뛴다'로 적는다.
3. **N-3** — `price-row-invalid` 안내(991)에서 '새 적용일 행을 더한다'를 뺀다. 어긋난 DB 행이 남아 있는 한 모든 적재가 거부되고(977-981) 앱의 `loadPriceBook` 도 그 모델 줄을 모두 빼므로(store.ts:90-107), '그 행을 SQL 편집기에서 바로잡는다' 하나만 적는다.
4. **N-4** — `tests/integration/seed-load.test.ts` 배치 정답 열 시험에 sentence 갈래 단언 한 줄: `answerOf({ type: "repeat", sentence: …, no: 1, revision: 1, correction: 0 })` 가 `{ sentence }`. (시험용 시드에 말하기 repeat 문항을 더하는 길은 적재 수 기대값이 바뀌니 이번엔 단언 한 줄만.) `answerOf` 에서 sentence 갈래를 뺀 복사본에서 깨지는지 한 번.

## 지킬 것
- 아이 이름 · 비밀값 · 칸 내용을 출력에 적지 않는다. 경계 규칙은 `pnpm check:deps`. 수는 상수 · 설정.
- 완료 판정: biome 0 · `pnpm build` · `pnpm test` 221 · `pnpm test:int` 54 + 1 그대로 또는 늘어남 · check:deps 0 · spec:trace 그대로 · check:bundle 0 · `pnpm seed:load --root /nonexistent-root` 종료 2 · 접속 문자열 출력 0.

## 보고
`<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p07a-fix2-report.md`: 지적마다 ADDRESSED · 파일:줄 · 시험, 망가뜨림(N-4), 바뀐 파일, 완료 판정 대조, 끝에 `git status --short`. 끝나면 상태와 요지 5줄을 컨트롤러에게 SendMessage 로. 그 뒤 컨트롤러가 확인하고 plan-p07a 완료 보고를 채워 요청자에게 커밋을 요청한다.
