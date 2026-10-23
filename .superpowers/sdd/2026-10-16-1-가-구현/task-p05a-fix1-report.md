# fix 1 보고: P5a 풀이 검사 명령(impl-p05a, 2026-10-17)

상태: DONE. 이 라운드는 브리프 `task-p05a-fix1.md` 와 검토 `review-p05a.md` 의 지적을 고쳤다.

- 지적 다섯 가운데 넷은 ADDRESSED, M-3 은 브리프대로 코드를 고치지 않았다. 범위 밖 관찰 1 도 넣었다.
- CI 순서 명령 일곱이 모두 0 이고 비밀값 grep 은 0건이다.
- 커밋 · 실제 API 호출 · 키는 없다. 검토가 받은 '다르게 한 것' 1~11 은 그대로 두었다.

시험은 시험을 먼저 더해 실패를 본 뒤 고쳤다. 고치기 전 실패 넷은 이랬다.

- 규격 파일 오류: 2 를 기대했는데 1 이었다.
- 기록 파일 깨짐: 호출이 33 이어야 하는데 41 이었다.
- `--file` 이 시드에 없음: 2 를 기대했는데 0 이었다.
- `baseUrlNotice`: 함수가 없었다.

M-4 사례는 고치기 전에도 통과했다. 그 길은 이미 있었고 시험만 없었다.

| 지적 | 판정 | 바뀐 파일:줄 | 시험 |
|---|---|---|---|
| I-1 규격 파일이 깨진 시드에서 평가 · 배치 · 이야기 칸이 풀린다 | ADDRESSED | `scripts/seed-check.ts:680~687`. `selectSolveTargets` 뒤 `picked.seed.referenceErrors > 0` 이면 입력 오류 2 로 끝난다. 문구는 `규격 파일 오류 <n>건 — pnpm seed:validate 로 먼저 고친다` 이고 풀이 · `--dry-run` · `--json` 모두 같다 | 새 시험 "명령: 규격 파일(vocab)이 규격에 맞지 않으면 2 로 끝나고 풀이 함수를 부르지 않으며 checks 를 쓰지 않는다"(`tests/unit/seed-check-cli.test.ts:366`). vocab 항목에 모르는 칸을 넣고 세 모드를 돌려 종료 2 · 풀이 호출 0 · checks 쓰기 0 을 본다 |
| M-1 기록 파일이 깨졌으면 API 를 먼저 부른다 | ADDRESSED | `scripts/seed-check.ts:498~519` 에 `readCheckFile` 을 뒀고, `writeRecord` 와 사전 확인이 함께 쓴다. `:757~782` 는 부르기 전에 이번에 풀 칸의 checks 파일을 한 번씩 읽는다. 깨졌으면 그 칸을 부르지 않고 실패로 둔다(까닭 `기록 파일이 깨졌다(JSON 이 아니다 · 규격에 맞지 않는다): <경로>`, 호출 0). 덮어쓰지 않는 규칙은 그대로다 | 새 시험 "명령: 기록 파일이 깨진 칸은 부르지 않고 실패로 센다"(`:392`). JSON 아님 하나와 규격 깨짐 하나로 실패 수 · 호출 수 · 까닭 · 파일 그대로를 본다 |
| M-2 `--file` 이 시드에 없거나 `--areas` 밖이어도 0 | ADDRESSED | `scripts/seed-check.ts:660~675` 가 확인하고 `:354~367` 의 `fileArea` 를 쓴다(토리 이야기는 회화). 문구는 `--file 이 시드에 없다: <경로>` 와 `--file 의 영역(<영역>)이 --areas 밖이다: <경로>` 다 | 기존 "명령: 키가 없거나 모르는 인자 …" 에 사례 둘(`:309~322`)을 더했다 |
| M-3 SDK 가 status enum 을 description 으로 옮긴다 | NOT ADDRESSED(브리프대로 코드 안 고침) | 없음 | 관찰표 항목: 작업 7(H4 `--probe`)과 P8 첫 표본의 관찰표에 '응답이 규격에 맞지 않는다: …status' 실패 수 칸을 한 줄 둔다. 잦으면 `output_config.format` 에 enum 이 든 JSON 스키마를 손으로 넘길지 컨트롤러가 정한다 |
| M-4 가짜 풀이의 broken 갈래를 쓰는 시험이 없다 | ADDRESSED | 시험만 고쳤다 | 기존 "명령: 풀지 못한 칸이 있으면 1 이고 다시 돌리면 그 칸만 푼다" 에 다섯째 칸 broken 을 더했다(`:574~580` 근처). 실패 4, 까닭 `응답이 규격에 맞지 않는다…`, 기록 없음, 다음 실행에서 그 칸을 다시 푸는지 본다 |
| 범위 밖 관찰 1 `ANTHROPIC_BASE_URL` | ADDRESSED(알림만, 동작 변경 없음) | `scripts/seed-check.ts:368~379` 에 `baseUrlNotice` 를 뒀다. 값이 있고 모드가 풀이 · `--probe` 면 `주소: <값>` 을 낸다. `:962~964` 의 `main` 이 시드를 읽기 전에 첫 줄 앞에 낸다. `--json` 이면 JSON 을 깨지 않게 표준 오류로 낸다. 값은 키가 아니라 가리지 않는다 | 기존 "명령: 첫 줄 요약 꼴과 --json 보고 꼴(version 1)" 에 단위 확인을 더했다(`:731~742`). 직접 실행 확인은 하지 않았다. 키 없이는 환경 확인이 먼저 2 로 끝나고, 키를 주면 실제 호출이 나기 때문이다 |

## 시험 수

| 범위 | fix 앞 | fix 뒤 |
|---|---|---|
| 전체 단위 시험 | 180 | 182 |
| seed-check-cli | 8 | 10 |

시험 이름 21개(증명 표)는 그대로다. spec-trace 의 'AC 이름 시험' 은 60, missing-test 는 58 로 바뀌지 않았다.

## CI 순서(워크트리)

| 명령 | 종료 | 요지 |
|---|---|---|
| `pnpm install --frozen-lockfile` | 0 | |
| `pnpm exec biome ci .` | 0 | |
| `pnpm build` | 0 | |
| `pnpm test` | 0 | Test Files 18 passed · Tests 182 passed |
| `pnpm check:deps` | 0 | no dependency violations found (23 modules, 69 dependencies cruised) |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 | AC 이름 시험 60 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 58 |
| `pnpm check:bundle` | 0 | 위반 0 |
| 비밀값 grep(바뀐 파일 여섯) | 0건 | |

## 검토자에게 알릴 것

- I-1 의 거부는 `referenceErrors` 전체를 본다. 이 수에는 `index.ready` 를 거짓으로 만드는 파일뿐 아니라 model-prices · 목록 넷의 규격 오류 · 규격 파일 정합 오류도 든다. seed:validate 도 이것들을 늘 실패로 센다(validate.ts 1187~1188). 그래서 같은 기준으로 묶었다.
- M-1 사전 확인은 `--max-calls` 로 자른 뒤 이번에 풀 칸에만 한다. 남은 칸은 다음 실행이 다시 본다. 기록 파일 읽기에서 예외(권한 등)가 나면 그 파일의 칸을 실패로 둔다.
- `scripts/seed-check.ts` 는 916줄에서 1005줄로 늘었다.
