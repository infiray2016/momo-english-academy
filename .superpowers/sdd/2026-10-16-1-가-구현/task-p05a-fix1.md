# fix 1 브리프: P5a 풀이 검사 명령(implementer impl-p05a, 2026-10-17 00:4x)

검토 `review-p05a.md`(rev-p05a, Changes requested — C 0 · I 1 · M 4)의 지적을 고친다. 같은 워크트리(`.claude/worktrees/agent-a0ffe8037fa827af6`, feature/1a-p05a-seed-check)에서, 시험을 먼저 고치거나 더해 실패를 본 뒤 코드를 고친다. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. 검토 보고의 파일:줄은 그 워크트리 기준이다. 검토가 받은 '다르게 한 것' 1~11 은 그대로 둔다.

| 번호 | 지적 | 고치는 법(검토 보고 3절 그대로) | 시험 |
|---|---|---|---|
| I-1 | 규격 파일이 깨진 시드에서 평가 · 배치 · 이야기 칸이 대상이 되어 풀리고(그림 보기가 영어 낱말로 나감) 기록이 남는다 | `runCheck` 에서 `selectSolveTargets` 뒤 `picked.seed.referenceErrors > 0` 이면 입력 오류 2 로 끝낸다(풀이 · `--dry-run` 둘 다). 문구 `규격 파일 오류 <n>건 — pnpm seed:validate 로 먼저 고친다` | "명령: 규격 파일(vocab)이 규격에 맞지 않으면 2 로 끝나고 풀이 함수를 부르지 않으며 checks 를 쓰지 않는다" |
| M-1 | 기록 파일이 깨존으면 API 를 먼저 부른 뒤 쓰기에서 실패해 비용만 쓴다 | 대상을 정한 뒤 부르기 전에 대상 칸의 checks 파일을 읽어 보고, JSON 이 아니거나 규격에 맞지 않으면 그 칸들을 실패(까닭 '기록 파일이 깨졌다 …')로 두고 부르지 않는다. 덮어쓰지 않는 규칙은 그대로 | "명령: 기록 파일이 깨진 칸은 부르지 않고 실패로 센다" |
| M-2 | `--file` 이 시드에 없는 파일이거나 `--areas` 와 어긋나도 대상 0 · 종료 0 | `runCheck` 에서 `args.file` 이 시드 파일 묶음에 없거나 `--areas` 밖이면 입력 오류 2 | 기존 "명령: 키가 없거나 모르는 인자 …" 시험에 사례 둘 추가 |
| M-3 | SDK 가 status enum 을 description 으로 옮김 | 코드 고치지 않음. 보고에 '관찰표 항목(응답이 규격에 맞지 않는다: status 실패 수)' 한 줄만 | — |
| M-4 | 가짜 풀이의 broken 갈래를 쓰는 시험 없음 | 명령 시험 하나에 broken(규격 깨짐) 사례를 더해 기록 없는 실패 · 다음 실행 재풀이를 본다 | 기존 "명령: 풀지 못한 칸이 있으면 1 이고 다시 돌리면 그 칸만 푼다" 에 사례 추가 |
| 관찰(범위 밖) | SDK 가 `ANTHROPIC_BASE_URL` 을 환경에서 읽어 요청자 셸에 그 값이 있으면 개발용 키가 그 주소로 간다 | 동작은 바꾸지 않는다. `ANTHROPIC_BASE_URL` 이 있으면 풀이 · `--probe` 첫 줄 앞에 `주소: <값>` 한 줄을 낸다(값은 가리지 않음 — 키가 아님) | 선택(단위 하나면 좋다) |

끝나면 CI 순서 전부(`pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle`) 0 · 비밀값 grep 0 을 확인하고, 보고 `task-p05a-fix1-report.md`(워크트리 장부, Write 도구)에 지적마다 ADDRESSED · NOT ADDRESSED(까닭) · 바뀐 파일:줄 · 시험 수를 적는다. 마지막 메시지는 상태 + 요약 한 줄. 커밋 · 실제 API 호출 · 키 없음.
