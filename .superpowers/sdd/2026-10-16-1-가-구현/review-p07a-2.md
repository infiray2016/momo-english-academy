# 재검토: P7a 적재 · 판 규칙 fix 1(rev-p07a · Opus · xhigh, 범위 한정, 2026-10-17)

판정: **Approved** — 지난 지적 일곱과 덤 하나 모두 ADDRESSED. 새 지적은 Minor 4(Critical · Important 0). Minor 는 컨트롤러가 직접 고치거나 P7b 와 함께 고쳐도 된다.

대상은 워크트리 `.claude/worktrees/p07`(커밋 없음)이다. 파일이 추적되지 않아 diff 가 없어, 수정 시각(14:08~14:09)으로 바뀐 파일 넷을 확인하고 지난 검토 때 읽은 글과 견줬다. 바뀐 파일은 보고대로 `scripts/seed-load.ts` · `src/server/seed/load.ts` · `tests/integration/seed-load.test.ts` · `tests/integration/seed-version.test.ts` 넷이다.

검토자가 직접 돌린 것(워크트리는 고치지 않음, 실제 DB 접속 없음):
- 지난 검토의 가짜 접속 재현을 지금 코드로 다시 돌렸다(1절 I-1).
- 읽을 수 없는 시드 파일로 명령을 실제 프로세스로 띄워 진입 함수의 오류 받기 길을 봤다.
- 스크래치패드 복사본(node_modules 만 이어 둠)에서 대상 시험 다섯을 손대지 않고 한 번 돌리고(5 통과), 규칙을 하나씩 망가뜨려 다시 돌렸다.

```
망가뜨린 규칙                         대상 시험                       결과
answerOf 에서 sentence 뺌              AC-17b 같은 판 두 번(정답 열)   통과 — 깨지지 않음(N-4)
읽기가 정정을 무시                     AC-17a 정정 3.1(다시 하기)      실패 '3.0' ≠ '3.1'
조합 검사를 건너뛰지 않음              price-row-invalid               실패 위반 1 → 2
적재 중 오류를 다시 던짐               적재 중 DB 오류                 실패 Connection terminated
orphan 줄을 내지 않음                  지킨 키 · 시드에 없는 키        실패 [] ≠ orphan 21줄
```

## 1. 지난 지적

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 적재 중 DB 오류 | ADDRESSED | seed-load.ts:266-270 이 오류를 잡아 `seed-load: DB 오류로 적재를 되돌렸다(<이름 코드>)` 한 줄과 종료 2 를 돌려준다. 원인(cause)이 있으면 원인의 이름 · 코드만 쓴다. 진입 함수도 거부를 받아 이름 · 코드만 내고 exitCode 2 다(304-313). 가짜 접속 재현: 사람용 · `--json` 둘 다 종료 2 · 표준 출력 0 줄 · 표지 글 0 · `insert into` 0 · close 1 번. 진입 함수 길: 읽기 권한 없는 vocab.json 으로 띄우니 `seed-load: 예상 밖 오류(Error EACCES)` · 종료 2, 경로가 든 메시지는 나오지 않았다. 시험 seed-load.test.ts:855 |
| M-1 접속 확인 실패 때 닫기 | ADDRESSED | seed-load.ts:240-248 이 handle 이 있으면 닫고 닫기 실패는 삼킨다. 시험 seed-load.test.ts:900-925 가 close 1 번을 본다 |
| M-2 DB 단가 행 규격 어긋남 | ADDRESSED | load.ts:977-993 이 DB 행마다 safeParse 해 어긋난 행마다 `price-row-invalid` 하나(table model_prices · key `<모델> <적용일>` · 값 없는 고정 글)를 낸다. 그 키의 시드 줄은 다시 세지 않는다(997). 조합 검사는 건너뛴다(1031 · 703). 시험 seed-load.test.ts:499 는 위반이 정확히 하나 · 보고 JSON 에 표지 값 없음 · 행 수 그대로를 본다. 망가뜨린 복사본에서 깨진다. 출력 꼴과 안내 문구는 N-2 · N-3 |
| M-3 칸 종류 불일치 | ADDRESSED | load.ts:258-260 의 오류는 칸 키만 담고 네 곳(326 · 345 · 381 · 398)이 던진다. 닿지 않는 길이라 시험이 없는 것은 맞다. 명령이 그 메시지를 숨기는 것은 N-1 |
| M-4 지킨 키 · 시드에 없는 키 이름 | ADDRESSED | load.ts:189-191 · 833-838 · 963-964, seed-load.ts:155-181. 값 없이 이름만, 종류마다 20 줄 뒤 `… 외 n`. `--json` 에는 이름이 없고 수만 있다. 시험 seed-load.test.ts:938 이 부모 값 · 표지 값이 출력에 없음까지 본다. 망가뜨린 복사본에서 깨진다 |
| M-5 '다시 하기' 단언 | ADDRESSED | seed-version.test.ts:169-204 가 지난 검토가 권한 꼴이다. 3.0 으로 끝낸 세션을 넣고, 정정 뒤 그 세션은 3.0 행을 가리키며, 새로 읽은 다시 하기는 다른 행 id 의 3.1 이다. 읽기가 정정을 무시하게 망가뜨리면 깨진다 |
| M-6 배치 answer 열 | ADDRESSED | seed-load.test.ts:248-272 가 모든 배치 행의 answer 를 칸 객체의 정답 칸과 answerOf 둘에 견주고 빈 객체가 아님도 본다. 다만 시험용 시드에 sentence 를 쓰는 문항이 없어 셋 가운데 하나는 증명되지 않는다(N-4) |
| 덤 `--areas` 공백 | ADDRESSED | seed-load.ts:82-85 `split(",").map(trim).filter(Boolean)`. 시험 seed-load.test.ts:744 |

보고의 '새 시험 넷은 고치기 전에 실패했다'는 시험 내용으로 보아 믿을 만하다. 고치기 전 `runSeedLoad` 는 오류를 다시 던졌고 접속 확인 실패 때 닫지 않았다(I-1 · M-1). 단가 시험은 고치기 전에 price-row-changed 와 조합 위반 둘이 났을 것이고, 조합 건너뜀을 끈 복사본도 위반 둘을 냈다(M-2). `SETTING_KEY_LINES` 는 고치기 전에 없었다(M-4). 공백 든 `--areas` 는 `args()` 가 던졌다(덤).

## 2. 다르게 한 것 판정

| 선택 | 판정 | 근거 |
|---|---|---|
| `loadSeedWithKeys` 를 더해 `loadSeed` 꼴을 지킴 | 받음 | `loadSeed` 는 한 줄 감싸기다(load.ts:825-830). 본문은 하나뿐이라 두 길을 따로 고칠 일이 없다. 키 이름을 LoadReport 에 넣으면 `--json` version 1 꼴이 바뀌므로 따로 돌려주는 것이 맞다. 거부 · 미리 돌림 때도 키 이름을 채워 사람용 줄에 나온다(963-964 가 검사 전에 채움) — 요청자가 지울 행을 고르는 데 도움이 된다 |
| DB 단가 행이 어긋나면 조합 검사를 건너뜀 | 받음(출력은 N-2) | 거부는 `price-row-invalid` 로 이미 된다. 믿을 수 없는 단가표로 `unknown-model` 같은 덧붙은 위반을 내면 원인이 흐려진다. 다만 건너뛴 사실이 출력에 없어, 행을 고친 뒤 다시 돌릴 때 처음 보는 조합 위반이 나올 수 있다 |

## 3. 새 지적(fix 1 이 바꾼 줄)

**N-1 Minor. 명령이 모든 적재 오류를 'DB 오류로 되돌렸다'로 적고 칸 키 메시지를 숨긴다.**
- 무엇이: seed-load.ts:266-270 은 `loadSeedWithKeys` 의 모든 오류를 잡는다. 트랜잭션 전에 나는 오류(M-3 의 칸 종류 불일치 load.ts:326 등, '검증을 넘었는데 규격 파일이 없다' load.ts:887)도 `DB 오류로 적재를 되돌렸다(Error)` 로만 나온다.
- 왜: M-3 에서 칸 키만 담게 만든 메시지가 운영자에게 닿지 않는다. 'DB 오류'라는 이름도 틀린다(DB 에 닿기 전이다). 출력에 칸 내용이 새지 않는다는 I-1 의 목적은 지켜진다.
- 어떻게: 칸 키 · 파일 이름만 담는 오류 갈래 하나(예: `SeedLoadInvariantError`)를 두고 명령은 그 메시지를 그대로 낸다. 나머지는 '적재 중 오류(<이름 코드>)'로 적는다.

**N-2 Minor. 조합 검사를 건너뛴 사실이 출력에 없다.** load.ts:1031 에서 건너뛰지만 위반 글(991)과 사람용 줄 어디에도 그 말이 없다. `price-row-invalid` 글 끝에 '그동안 조합 검사는 건너뛴다'를 붙이면 된다(브리프 기준 Minor).

**N-3 Minor. `price-row-invalid` 안내가 될 수 없는 고침을 권한다.** 글은 '고친 행을 바로잡거나 새 적용일 행을 더한다'이다(load.ts:991). 그러나 어긋난 DB 행이 남아 있는 한 모든 적재가 거부되고(977-981 은 DB 의 모든 행을 본다), 거부되니 새 적용일 행도 들어가지 않는다. 앱의 `loadPriceBook` 도 그 모델의 줄을 모두 뺀다(src/server/ai/store.ts:90-107). '그 행을 SQL 편집기에서 바로잡는다' 하나만 적는다.

**N-4 Minor. 배치 정답 열 시험이 sentence 갈래를 증명하지 않는다.** 시험용 시드의 배치 문항은 읽기 picture(answerNo) 12 · 말하기 listening(answerNo) 24 · 쓰기 copy-tiles(accepted) 12 뿐이다. 말하기 배치 규격의 repeat(sentence, assessment.ts:81 · 183-186)가 없다. 그래서 answerOf 에서 sentence 를 뺀 복사본에서도 시험이 지난다. 기대 값도 같은 이름 목록(seed-load.test.ts:92)에서 만든다. `answerOf({ type: "repeat", sentence: …, no: 1, revision: 1, correction: 0 })` 가 `{ sentence }` 라는 단언 한 줄을 더한다. P11 의 따라 말하기 배치 채점이 이 칸에 기댄다.

새로 깨뜨린 것은 없다. 경계 규칙을 다시 봤다. 바뀐 줄에 행 삭제 · SQL now() · 인자 없는 시계 · 환경 변수 새 읽기 · 비밀값 꼴이 없다. 트랜잭션 경계는 그대로이고, 자문 잠금은 트랜잭션 잠금이라 되돌림과 함께 풀린다. 명령의 오류 받기는 트랜잭션 밖이다.

## 4. 범위 밖 관찰(세지 않음)

- seed-load.ts:271-273 의 `finally { await handle.close() }` 는 fix 1 이 바꾸지 않은 줄이다. 적재가 끝난 뒤 닫기가 던지면 결과가 덮여 진입 함수가 '예상 밖 오류' · 종료 2 를 낸다(넣은 것은 그대로다). postgres.js 의 end 가 거의 던지지 않아 닿기 어렵다. 접속 확인 쪽처럼 닫기 실패를 삼키면 같은 꼴이 된다.

## 5. 열린 장부(ledger-open.md 의 P7 관련 행)

| 행 | 판정 | 근거 |
|---|---|---|
| 13 opus-4-8 thinkingDefault | 아직 열림 | fix 1 과 무관(P6 몫) |
| 25 PASSAGE_PICTURE_UNTIL_LEVEL | 아직 열림 | P7b 구현 몫 |
| 27 · 38 P8 | 아직 열림 | P8 몫. new-cell-in-open-group 은 바뀌지 않았다 |
| 28 · 39 P10~P12 | 아직 열림 | 39 행의 '배치 answer 열은 answerNo · accepted · sentence' 는 코드가 맞다. sentence 는 시험이 없다(N-4) |
| 29 P6 판 올리기 | 아직 열림 | 무관 |
| 30 · 40 1-나 | 아직 열림 | 무관 |
| 37 P7b | 아직 열림(일부 확인) | 이 행의 '`--areas` 공백은 fix 1 에서 다듬음' · '적재 중 DB 오류도 종료 2' 두 몫은 이번에 확인됐다. 행 전체는 P7b 브리프 몫이라 열려 있다. 새 상수 `SETTING_KEY_LINES` 는 scripts/ 라 허용 목록이 필요 없다 |

## 6. 라운드 판정

fix 1 라운드: **Approved**(지난 지적 7 + 덤 1 ADDRESSED, 새 Minor 4 — N-1~N-4). fix 라운드 1 회째다.
