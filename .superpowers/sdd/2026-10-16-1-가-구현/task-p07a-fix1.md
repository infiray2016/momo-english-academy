# fix 1 브리프: P7a 적재 · 판 규칙(implementer impl-p07a 이어 하기 · Opus · high, 2026-10-17 14:0x)

코드 검토 `review-p07a.md`(rev-p07a)는 Changes requested(C 0 · I 1 · M 6)다. 아래 컨트롤러 판정대로 고친다. 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p07`(feature/1a-p07-seed-load). 커밋 없음. 실제 DB 없음(시험용 Postgres 만). 공용 파일은 그대로(package.json seed:load 한 줄 밖 수정 금지). 시험을 먼저 고치고 실패를 본 뒤 구현한다. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴.

## 지적과 판정
- **I-1 적재 중 DB 오류가 종료 1 로 끝나고 칸 내용을 찍음**(seed-load.ts:223~240 try/finally 만, 270~274 catch 없음; DrizzleQueryError 메시지에 SQL · params 전체). 판정: 검토 권고대로 — `runSeedLoad` 가 `loadSeed` 오류를 잡아 `seed-load: DB 오류로 적재를 되돌렸다(<오류 이름 · 코드>)` 한 줄과 종료 2 를 돌려준다(`error.cause ?? error` 의 이름 · 코드만, 메시지 · params 금지). `main` 에 `.catch` 를 달아 오류 이름만 내고 exitCode 2. 명령 시험에 '`openDb` 의 transaction 이 던지면 종료 2 이고 표지 글이 표준 출력 · 표준 오류 어디에도 없다' 단언을 더한다(검토의 가짜 접속 재현 꼴). 스크립트 머리 주석의 종료 코드 2 에 '적재 중 DB 오류'를 적는다.
- **M-1 접속 확인 실패 때 접속을 안 닫음**(seed-load.ts:216~222). 판정: catch 안에서 handle 이 있으면 닫는다.
- **M-2 DB 단가 행의 조합 칸이 규격에 안 맞으면 그 줄만 말없이 빠짐**(load.ts:648~660 · 693~695, P9a loadPriceBook 과 다름). 판정: `price-row-invalid` 위반으로 **적재 전체를 거부**한다(사람이 SQL 로 고친 행은 드러나야 하고, 검사하지 않은 값으로 조합 검사를 지나게 두지 않는다). 위반 줄에 모델 · 적용일만(값 없음). 시험 하나(단가 행 하나를 깨뜨린 DB 에서 거부 · 표 그대로).
- **M-3 칸 키와 칸 종류가 안 맞으면 말없이 건너뜀**(load.ts:317 · 336 · 372 · 389). 판정: load.ts:866 처럼 불변식 오류로 던진다(메시지에 칸 키만).
- **M-4 지킨 키 · 시드에 없는 DB 키 이름이 보고에 없음**. 판정: 사람용 출력에 값 없이 `kept <키>` · `orphan <키>` 줄을 더한다(키마다 한 줄, 많으면 20 줄 뒤 '… 외 n'). `--json` version 1 꼴은 바꾸지 않는다.
- **M-5 'AC-17a 정정 3.1 …' 시험의 '다시 하기' 확인이 같은 호출 반복**(seed-version.test.ts:173~175). 판정: 끝낸 3.0 세션을 하나 넣고 '그 세션은 3.0 · 다시 하기로 새로 읽으면 3.1' 로 바꾼다.
- **M-6 배치 문항 answer 열 단언 없음**. 판정: 기존 적재 시험 하나에 'placement_items 한 행의 answer 가 칸 객체의 answerNo · accepted · sentence 가운데 문항에 있는 것과 같다' 단언을 더한다(`answerOf` 사용).
- **덤(P7b 메모)**: `--areas` 값의 공백을 다듬는다(seed-load.ts:75, `split(',').map(s => s.trim()).filter(Boolean)`) — dev-load 입력에 공백이 들어와도 되게. 명령 시험의 인자 줄에 한 사례.

## 완료 판정
CI 순서 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int`(건너뜀 1 그대로) → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec`(missing-test 51) → `pnpm check:bundle`, 비밀값 grep 0(바뀐 파일), 규격 파일 없는 뿌리 `pnpm seed:load --root tests/.tmp` 종료 2 · 접속 문자열 없음. 바뀐 파일은 지적이 가리키는 것만(seed-load.ts · load.ts · 시험 셋).

## 보고
`<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p07a-fix1-report.md`(Write 도구): 지적마다 ADDRESSED · 파일:줄 · 시험, 시험 수(221 · 51 + 1 → 새 수), 명령 출력 첫 줄, 다르게 한 것 · 알릴 것. 마지막 메시지는 상태 + 요약 한 줄.
