# 보고: 회화 plan 묶음 1 · 2(설정 키 · p13d 정본 사본 · seed:load --partial)

구현자 Opus · high, 2026-10-30 05:4x 시작 → 사용량 한도로 05:45 멈춤 → 08:0x 이어서 끝냄. 작업 자리는 워크트리 `.claude/worktrees/p13d`(커밋 · push 없음, 개발 DB 적재 안 돌림). 상태: DONE_WITH_CONCERNS(우려는 끝 절, 막는 것 없음).

이어 받을 때 확인: 05:41 의 settings.json(249행) · 시험 고정값 · 09 사본(전용 줄 둘)과 05:45 의 통합 시험 추가분이 그대로였고, 다른 손의 변경은 없었다(파일 수정 시각 · 정본 대조).

## 묶음 1

### 넣은 행 24(seed/settings.json 87~110줄 · tests/fixtures/settings.ts 151~175줄, 범위 household, 값 · 바꾸는 곳은 정본 12절 75~89줄 그대로, 모두 잠정)

| 키 | 값 | 바꾸는 곳 |
|---|---|---|
| talk.prep_mode.1-3 · 4-6 · 7-9 · 10-12 | always · when_needed · when_needed · when_needed | advanced |
| talk.prep_words.1-3 · 4-6 · 7-9 · 10-12 | 3 · 2 · 2 · 2 | seed |
| talk.prep_offer_stuck | 2 | advanced |
| talk.follow_child_turns | 2 | advanced |
| talk.required_gap_turns | 3 | advanced |
| talk.reask_per_word | 1 | advanced |
| talk.required_max_ratio | 0.5 | seed |
| talk.valid_turns_ratio | 0.3 | advanced |
| talk.floor_after_stuck | 3 | decision-first |
| talk.same_question_max | 2 | advanced |
| talk.self_goal_link | true | advanced |
| talk.carry_independent_min | 2 | advanced |
| talk.teacher_sentences_max.1-3 · 4-6 · 7-9 · 10-12 | 3 · 3 · 4 · 5 | advanced |
| talk.wait_line_seconds | 1.5 | advanced |
| talk.role_swap_turns | 4 | advanced |

- talk.dontknow_max 의 바꾸는 곳: settings.json 83줄 advanced → decision-first(값 3 그대로). 시험 고정값에는 바꾸는 곳 칸이 없어 그대로다.
- 다른 행은 손대지 않았다(settings.json 225 → 249행, 더하기만). 새 행은 talk.follow_up_min_every_turns 바로 뒤에 정본 순서로 두었다.

### 사본(p13d specs)

- 복사 전 사본: `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/3b649d12-fbb9-4aea-bf0d-1f8734a04e7d/scratchpad/p13d-specs-before/`(15 파일).
- 복사한 장: 01 · 02-1 · 02-2 · 02-3 · 03 · 04 · 05 · 06 · 07 · 08 · 09 · 10 · 11(열세 장) + README.md. 2026-10-15 단일 spec 파일은 이미 같았다. 복사 뒤 09 를 뺀 열네 파일이 본 저장소 정본과 바이트까지 같다.
- 복사 전 사본에만 있던 줄은 없앤 키 둘 · 옛 뜻 글뿐이었고, speech.slow_rate_factor 행은 정본(C190)에 이미 있다. '사본 전용' 표시 줄은 복사 전에도 없었다.
- 사본 전용 줄 둘(09 사본 70 · 75줄, 정본과의 차이는 이 두 줄뿐):
  - `talk.practice_rounds | 집 전체 | 2 | … | 고급`(talk.more_talk_turns 앞)
  - `talk.reask_sentence_every_turns | 집 전체 | 3 | … | 고급`(talk.nospeech_dontknow_count 뒤)
  - 두 줄 뜻 칸 끝에 '**p13d 사본 전용 줄**: 정본에서 없앤 키(C189)인데 p13d 코드가 아직 읽어 회화 plan(C192) 묶음 12 에서 settings.json · 시험 고정값 · 코드와 함께 지운다(정한 것 14). 정본에 옮기지 않는다'를 적었다.

### check:ids(ci.yml 42줄과 같은 인자: `--fail-on spec-setting-missing,seed-setting-unknown,setting-scope,setting-change-via,setting-default,code-setting-unknown,table-mismatch,max-corrections,fixture-setting,design-color --design-number-max 49`)

| 때 | 12절 키 | 시드 키 | spec-setting-missing | seed-setting-unknown | code-setting-unknown | setting-change-via | design-number | 종료 |
|---|---|---|---|---|---|---|---|---|
| 전: 옛 사본 | 229 | 225 | 0 | 0 | 0 | 0 | 47 | 0 |
| 전: 정본 specs(`--specs`) | 251 | 225 | 24 | 2 | 7 | 1 | 47 | 1 |
| 뒤: 새 사본 | 253 | 249 | 0 | 0 | 0 | 0 | 47 | 0 |

그 밖의 규칙(setting-scope · setting-default · table-mismatch · max-corrections · fixture-setting · design-color)은 전후 모두 0 이다. '대조 안 함'(기본값 칸을 못 풀어 대조하지 않은 키)은 12 → 13 이고, 늘어난 하나는 talk.self_goal_link('켬')다. speech.read_ko('켬')와 같은 꼴이라 막지 않는다.

### 관문(묶음 1 끝, 묶음 2 뒤 다시 돌림)

- `pnpm check:ids …(CI 인자)` 종료 0, 위 표.
- `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` 종료 0(unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 16 은 P12 몫으로 CI 에서도 막지 않음).
- `pnpm seed:validate` 종료 0: 칸 925 · 통과 922 · 실패 0 · 빈 칸 3967 · 풀이 검사 안 됨 3 · 사람 확인 0 · 경고 17 · 규격 파일 오류 0.
- `pnpm test` 126 파일 · 1506 통과 · 6 todo(묶음 1 끝에는 1504, 묶음 2 단위 시험 둘이 늘었다).
- `pnpm biome ci .` 종료 0(533 파일), `tsc --noEmit -p .` 종료 0(통합 시험 파일 포함).

## 묶음 2

### 바뀐 파일(p13d 기준 새 줄 번호)

- `scripts/seed-load.ts`: 2~3줄(사용 글 · --partial 설명), 45~46줄(LoadCliArgs.partial), 60줄(기본 false), 108~110줄(`--partial` 인자), 133~138줄(--reference-only 와 함께면 거부: '--partial 은 --reference-only 와 함께 못 쓴다'), 181~187줄(사람용 출력에 '일부 받기(--partial): 완전성 빈 칸 n 는 막지 않고 보고만 했다' 한 줄), 279줄(loadSeedWithKeys 에 partial 넘김).
- `src/server/seed/load.ts`: 104~108줄(LoadOptions.partial), 137~138줄(LoadReport.partial — `--json` version 1 에 더한 칸), 816~823줄(`loadValidationCode`(제안): 일부 받기면 완전성 빈 칸만 빼고 exitCodeOf 와 같은 종료 코드), 867 · 876줄(옵션 읽기 · 보고 칸), 898줄(검증 종료 코드를 loadValidationCode 로).
- `.github/workflows/dev-load.yml`: 22~26줄(입력 partial, boolean, required, 기본 false), 63~65줄(seed-validate 단계 env PARTIAL), 67~70줄(reference_only 와 partial 을 함께 켜면 `::error::` 뒤 exit 1), 73~74줄(partial 이면 `pnpm seed:validate --areas "$AREAS"` — PR 모드라 빈 칸은 보고만, 오류는 막음), 81줄(seed-load 단계 env PARTIAL), 85~86줄(partial 이면 `pnpm seed:load --complete-through "$THROUGH" --areas "$AREAS" --partial`). main.yml 은 손대지 않았다.
- `tests/integration/seed-load.test.ts`: 395~449줄 · 1120~1153줄(시험 둘, 아래).
- `tests/unit/seed-validate-cli.test.ts`: 266~311줄(시험 둘, 아래).

### 시험 이름

- 통합(정적 — 이 Mac 에서는 embedded-postgres 가 'done is not a function' 으로 뜨지 않아 못 돌림, tsc 는 통과, 실행은 11-01 뒤 CI 차례 12):
  - `AC-7a 개발 일부 받기(--partial, 회화 plan 정한 것 15): 완전성 빈 칸은 보고만 하고 넣으며 검증 오류 · 판 규칙 위반은 그대로 거부한다`
  - `AC-7a 적재 명령 --partial: --reference-only 와 함께 못 쓰고, 빈 칸이 있어도 넣음 0 이며 빈 칸 수를 한 줄로 알린다`
- 단위(통과):
  - `AC-7a 일부 받기 검증(dev-load partial, 회화 plan 정한 것 15): --complete-through 없이 --areas 만 주면 빈 칸은 보고만 하고 0, 검증 실패 칸이 있으면 1`
  - `AC-7a dev-load 입력 partial: 기본 끔이고, 켜면 seed:validate 는 --complete-through 없이 --areas 로, seed:load 는 --partial 로 돌며 reference_only 와 함께 켜면 멈추고 운영(main)은 --partial 을 쓰지 않는다`
- 실행: `pnpm vitest run --project unit tests/unit/seed-validate-cli.test.ts tests/unit/ci-workflows.test.ts` 2 파일 16 통과(ci-workflows 의 dev-load 시험은 고치지 않고 그대로 통과).

### 설계와 다르게 하거나 고른 것

1. **'완전성 빈 칸'만 보고로 돌렸다.** 일부 받기에서도 '풀이 검사 안 됨' · '사람 확인 남음' · 검증 오류 · 판 규칙 위반은 그대로 막는다. 정한 것 15 의 글이 빈 칸만 말하고, 회화 카드는 풀이 검사 대상이 없어(not-needed) 3단계 카드 적재를 막지 않는다.
2. **dev-load 의 partial 입력은 단계 env 로만 넘겼다.** `tests/unit/ci-workflows.test.ts` 가 작업 수준 env 를 정확히 세 줄로 보는데, 그 파일은 허용 목록 밖이라 고치지 않았다. 그래서 partial 의 정적 확인은 허용된 `tests/unit/seed-validate-cli.test.ts` 에 두었다.
3. **dev-load partial 의 검증 단계는 `seed:validate --areas`(PR 모드)다.** seed:validate 에는 --partial 이 없고(scripts/seed-validate.ts 는 허용 밖), PR 모드가 '오류는 막고 빈 칸은 보고'라 정한 것 15 와 같다. 그 단계의 빈 칸 셈은 settings 의 seed.complete_through_level 기준이고, 막는 관문은 뒤의 seed:load --partial 이다.

### 요청하는 변경(공용 · 허용 밖)

- `tests/unit/ci-workflows.test.ts` 의 dev-load 시험(AC-7g)에 입력 partial 과 두 갈래를 더하면 작업 파일 시험이 한 곳에 모인다. 지금은 seed-validate-cli 시험이 대신 지킨다.

## 남은 우려

1. `--partial --complete-through N` 은 지금 적재 길처럼 개발 DB 의 seed.complete_through_level 을 N 으로 덮는다. 컨트롤러 명령(`--complete-through 1 --areas talk --partial`)은 1 이라 지금과 같지만, 빈 칸이 있는 단계를 N 으로 주면 앱이 그 단계까지 차 있다고 볼 수 있다.
2. 묶음 3 이 옛 1단계 회화 파일을 빼면, 그 적재 명령은 회화 1단계 빈 칸을 '일부 받기' 줄로 알리고 넣는다(설계대로). 운영 적재(main.yml)에는 --partial 이 없어 AC-7a 완전성이 그대로다.
3. `LoadReport` 의 `--json` version 1 꼴에 partial 칸이 하나 늘었다(더하기만). 이 보고를 읽는 manifest 쓰기 쪽은 칸을 고르지 않아 영향이 없을 것으로 보지만, P8 묶음에서 확인이 필요하다.
4. 통합 시험 둘은 CI(11-01 뒤)에서 처음 돈다. 실패하면 차례 12 에서 고친다.
5. talk.self_goal_link 의 기본값('켬' ↔ true)은 check:ids 가 대조하지 않는다(speech.read_ko 와 같음).
