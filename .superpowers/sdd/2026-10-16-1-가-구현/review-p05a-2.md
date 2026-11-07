Approved(C 0 · I 0 · M 1)

# 재검토: P5a 풀이 검사 명령 fix 1(code-reviewer rev-p05a · Opus · xhigh, 2026-10-17)

범위 한정 재검토다. 대상은 같은 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a0ffe8037fa827af6` 의 fix 1 보고와 바뀐 두 파일(`scripts/seed-check.ts` 1005줄 · `tests/unit/seed-check-cli.test.ts` 시험 10)이다. 파일:줄은 이 워크트리 기준이다. 앞 검토는 `review-p05a.md` 다.

확인 방법은 이렇다.
- 바뀐 자리 여섯(`fileArea` · `baseUrlNotice` 353~379, `readCheckFile` · `writeRecord` 497~538, `runCheck` 의 `--file` 확인 660~673 · 규격 파일 오류 680~687 · 기록 파일 사전 확인 757~791, `main` 962~964)과 새 시험 둘 · 보탠 사례 셋을 읽었다. 늘어난 89줄이 이 여섯 군데로 설명된다.
- 첫 검토의 I-1 재현 스크립트를 고친 코드에 다시 돌렸다(스크래치패드, 워크트리 파일은 고치지 않음). 결과는 아래 I-1 줄에 있다.
- 시험은 다시 돌리지 않았다(컨트롤러 재확인 182 통과).

## 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 규격 파일이 깨진 시드에서 평가 · 배치 · 이야기 칸이 풀림 | ADDRESSED | `selectSolveTargets` 바로 뒤에서 `picked.seed.referenceErrors > 0` 이면 입력 오류 2 로 끝난다(seed-check.ts:680~687). dry-run 분기(:719) 앞이라 풀이 · `--dry-run` · `--json` 모두 막힌다. 새 시험(seed-check-cli.test.ts:366~390)은 vocab 항목에 모르는 칸을 넣고 세 모드에서 종료 2 · 첫 줄 문구 · 풀이 호출 0 · checks 쓰기 0 을 실제로 본다. 재현 스크립트 결과는 '종료 2 · 영어 낱말 그림 보기 0 · vocab 을 고친 뒤 대상 151(수업 68 + 평가 · 배치 · 이야기 83)'이다. 고치기 전에 남던 83칸 기록이 이제 생기지 않는다 |
| I-1 '알릴 것' 1(referenceErrors 전체 기준) | 받음 | seed:validate 도 규격 파일 오류를 errors 에 넣어 늘 실패로 센다(validate.ts:626~634 · 1187~1188). 같은 기준이면 'seed:validate 를 먼저 통과시킨다'는 문구와도 맞는다. 덧: 규격 파일 열 개 가운데 하나만 없어도 `reference-missing` 으로 세어진다(validate.ts:663~668). P6a 가 열 개를 모두 두므로 실시드에서는 문제가 없다 |
| M-1 기록 파일이 깨졌으면 API 를 먼저 부름 | ADDRESSED | `readCheckFile`(:498~517)을 사전 확인과 `writeRecord`(:527~528)가 함께 쓴다. 사전 확인은 `--max-calls` 로 자른 `toSolve` 의 checks 파일만 한 번씩 읽는다(:758~770). 깨졌으면 그 칸을 `called: false` 실패로 두고 부르지 않는다(:771~781). 읽기 예외(권한 등)는 '기록 파일을 읽지 못했다'로 가려 담는다(:763~767). 쓰기 쪽 확인은 그대로 남아 사전 확인 뒤에 파일이 바뀌어도 덮어쓰지 않는다. 새 시험(seed-check-cli.test.ts:392~426)은 JSON 아님 · 규격 깨짐 두 파일로 실패 수 · 호출 수 · 까닭 머리 · 파일 그대로를 본다 |
| M-2 `--file` 없음 · `--areas` 밖이어도 0 | ADDRESSED | `deps.files.has(args.file)` 가 거짓이면 2(:661~666), `fileArea`(:354~367, 이야기는 회화)가 `--areas` 밖이면 2(:667~672). 사례 둘이 종료 2 와 문구를 본다(seed-check-cli.test.ts:309~322) |
| M-3 SDK 가 status enum 을 API 에 싣지 않음 | 받음(코드 그대로) | 앞 검토가 요구한 조치는 코드 변경이 아니라 관찰표 항목이었다. fix 보고가 작업 7(H4 `--probe`) · P8 첫 표본 관찰표에 '응답이 규격에 맞지 않는다: …status' 실패 수 칸을 둔다고 적었다. 장부 ledger-open 의 '구현하며 확인할 것'으로 옮기면 닫힌다 |
| M-4 broken 사례 없음 | ADDRESSED | 다섯째 칸 e 에 broken 을 더했다(seed-check-cli.test.ts:548~557). 첫 실행에서 '실패 e 응답이 규격에 맞지 않는다…'와 기록 없음(:574~580), 미리 보기의 다음 대상에 e 가 들고(:596~598), 둘째 실행이 e 를 다시 푼다(:608~613) |
| 범위 밖 관찰 1 ANTHROPIC_BASE_URL | ADDRESSED(알림만) | `baseUrlNotice`(:373~379)는 dry-run 이 아니고 값이 있을 때만 줄을 낸다. 환경 확인을 통과한 뒤(키가 있고 CI 가 아닐 때) 시드를 읽기 전에 낸다(:962~964). `--json` 이면 표준 오류로 낸다. 호출 동작은 바뀌지 않는다. 단위 확인 다섯 줄이 있다(seed-check-cli.test.ts:731~741). 아래 새 지적 N-1 을 함께 본다 |

## fix 1 이 바꾼 줄에서 생긴 새 지적

### Minor

**N-1. 주소 알림 줄이 사람 출력 첫 줄 자리를 차지하고, 주소 전체를 그대로 낸다.**
- 무엇이: `--json` 이 아니면 알림을 표준 출력에 낸다(seed-check.ts:964). 그래서 `ANTHROPIC_BASE_URL` 이 있을 때 표준 출력 첫 줄이 `주소: <값>` 이 된다. plan '명령' 139줄은 사람 출력 첫 줄을 `seed-check: 대상 …` 으로 정했다. 작업 7(plan 190줄)은 요청자가 `--probe` '첫 줄만' 알리게 한다. 이 줄에는 다른 줄의 `seed-check:` 머리도 없다. 또 값을 통째로 내므로(:378), 주소에 사용자 정보(`user:pass@`)나 질의 토큰이 들면 그대로 찍힌다. plan 129줄은 '키 값 · 접속 정보는 어느 출력 · 오류에도 내지 않는다'다.
- 어떻게: 알림을 늘 표준 오류로 내고 머리를 `seed-check: ` 로 맞춘다. 값은 `new URL(base).host` 만 내고, URL 로 읽히지 않으면 '꼴이 아닌 값'이라고만 낸다. 시험 다섯 줄의 기대 글만 바뀐다. 동작에는 닿지 않으므로 컨트롤러가 직접 고쳐도 된다(가벼운 루프의 Minor).

## 판정

Approved. 앞 검토의 I-1 · M-1 · M-2 · M-4 와 범위 밖 관찰 1 은 ADDRESSED 다. M-3 은 코드 그대로 두고 관찰 항목으로 옮긴 것을 받는다. 새로 깨뜨린 것은 없다. N-1 은 커밋 전에 고치기를 권하지만 막지 않는다.
