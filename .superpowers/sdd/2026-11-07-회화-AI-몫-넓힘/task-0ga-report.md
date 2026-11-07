# 묶음 0-가 구현 보고 — 설정 키 둘(talk.self_line_every_turns · talk.greeting_recall)

상태: BLOCKED(같은 폴더 나란히 규칙, plan 정한 것 10). 내 묶음 파일은 모두 초록이다. 관문을 막는 것은 다른 묶음의 진행 중 파일 둘과, 이 묶음 전부터 있던 design-number 상한 초과다.
구현자: Opus high · 2026-11-07 · 워크트리 `.claude/worktrees/p13d`(HEAD 6e86881) · 커밋 없음.

## 바뀐 파일

| 파일 | 줄 | 무엇을 |
|---|---|---|
| `src/core/ai/calls/talk-lesson.ts` | 299~302 · 313~314 · 319~331 · 344 · 375~377 | TalkLessonRules.selfLineEvery(수) · greetingRecall(참거짓) · KEYS 둘 · `OnOff = z.enum(["off","on"])` · 내보내는 `TALK_PROMPT_SETTING_SCHEMAS`(selfLineEvery: 1 이상 정수 · greetingRecall: "off"/"on") · SETTING_SCHEMAS 에 펼침 · talkLessonRulesOf 가 둘을 읽음("on" 이면 참). 고정부 글은 바꾸지 않음(묶음 1 몫) |
| `src/server/conversation/turn.ts` | 8~11 · 76~78 | turnSettings 에 TALK_PROMPT_SETTING_SCHEMAS 펼침(주석 T-157). TurnRequestSchema 그대로 |
| `seed/settings.json` | 109~110 | plan 행 그대로 둘(household · 3 · "off" · changeVia advanced) |
| `tests/fixtures/settings.ts` | 175~177 | TEST_SETTINGS 에 같은 두 키 |
| `tests/unit/talk-setting-keys.test.ts` | 신규 | 아래 시험 여섯 |

손으로 만든 설정 사전을 쓰는 시험은 고치지 않았다. `tests/unit/talk-lesson-call.test.ts` 등은 `values = testSettingValues()`(TEST_SETTINGS)에서 펼쳐 쓰므로 TEST_SETTINGS 에 키를 더한 것으로 충분했고, 빠진 키를 던지는지 보는 시험(225줄)도 그대로 지난다. 대본 도구(scripts/ai-contract.ts 의 설정 출처)는 seed/settings.json 또는 TEST_SETTINGS 를 읽으므로 둘 다 키가 있다.

## 덮는 시험(`tests/unit/talk-setting-keys.test.ts`, 6건)
- 회화 턴 호출 규격 ∪ turnSettings 의 키는 모두 seed/settings.json 과 TEST_SETTINGS 에 있고 규격을 지난다
- 새 키 둘은 호출 규격과 턴 입구에 함께 있다(빠지면 턴 입구의 SettingMissingError 로 드러남)
- 시드 값으로 selfLineEvery 3 · greetingRecall 거짓이고, TEST_SETTINGS 도 같다
- talk.greeting_recall 은 'on' 이면 참이고, 꼴 밖 값 · 빠진 키는 던진다
- talk.self_line_every_turns 는 1 이상 정수이고, 0 · 소수 · 빠진 키는 던진다
- 1~3단계 회화 턴 effort 는 시드 · 시험용 설정 모두 low 다(AC-7)

먼저 써서 붉음 4 · 초록 2 를 확인한 뒤 구현했다.

## 실행 결과(긴 출력은 스크래치패드 `ai-scope-0ga-*.txt`)

| 명령 | 결과 |
|---|---|
| `vitest run --project unit` 내 시험 + 닿는 시험 넷(talk-setting-keys · talk-lesson-call · talk-prompt-fix1 · talk-prompt-fix2 · check-ids) | 5 파일 · 122 통과 |
| `biome ci` 내 파일 | 통과 |
| `pnpm test`(단위 전체) | 1997 통과 · 5 실패 · 6 todo. 실패 5 는 모두 `tests/unit/talk-observe.test.ts`, 원인은 4-가 의 새 미추적 대본 `tests/fixtures/talk-observe/l3-second-session.json` 의 `Unrecognized keys: "summaries", "settings"`(도구 규격이 아직 그 칸을 받지 않음) |
| `pnpm lint` | 실패 1: `tests/fixtures/seed/builders.ts:36` import 정렬(0-나 파일) |
| `npx tsc --noEmit` | 오류 8: reference-index.ts · validate.ts · tests/fixtures/seed/builders.ts · tests/unit/seed-schema.test.ts(모두 0-나 의 목록 넷 진행 중). 내 파일 0 |
| `pnpm check:ids`(CI 인자) | spec-setting-missing 2 → 0. 다른 fail-on 규칙 모두 0. design-number 77 → 77(경고 줄 앞뒤 diff 없음). 그러나 상한 49 를 넘어 종료 코드 1 |

## check:ids 와 브리프 전제의 차이
- 브리프는 'HEAD 6e86881 은 통과'라고 적었지만, HEAD 정본(`git archive HEAD specs`)으로 돌려도 design-number 77 > 49 로 실패한다. 이 변경 전 수치이고 늘지 않았다.
- 마지막 초록 CI 는 ed8b8be 이고, 그 뒤 7 커밋이 `src/app/dev/mic-probe/*`(probe-log.ts 21 · mic-probe.tsx 9 = 30건)를 더했다. 6e86881 의 CI 실행 기록은 없다(gh run list 최근 셋).
- 그래서 design-number 를 '최소로 고칠' 원인이 이 묶음에 없고, 제외 목록 · 상한도 건드리지 않았다. plan 위험 11 은 이것을 마이크 묶음 몫으로 적었다.
- 제안(컨트롤러 판단): design-color 가 이미 `src/app/dev/` 를 빼므로(scripts/check-ids.ts DESIGN_COLOR_DEV_DIR) design-number 도 dev 쪽을 빼면 47 ≤ 49 로 초록이 된다. 파일은 `scripts/check-ids.ts` 한 곳이고 대조 시험은 `tests/unit/check-ids.test.ts` 다.

## 설계와 다르게 한 것
- 없음. greetingRecall 은 규칙 객체에서 참거짓으로 바꿨다(설정 꼴 "off"/"on" 은 그대로).

## 남은 우려
- DB 적재: 새 키는 시드에만 있다. 첫 push · 배포 전에 설정 적재(plan 작업 순서 4번)가 없으면 턴 입구가 SettingMissingError 로 막힌다(이것이 의도된 드러남이다, T-157).
- 관문 재실행: 0-나 · 4-가 가 끝난 뒤 컨트롤러가 `pnpm lint` · `npx tsc --noEmit` · `pnpm test` 를 다시 돌려야 한다.

## 보정 1(컨트롤러 2026-11-07, plan 192줄 판 정한 것 2 · 11 · 작업 순서 1번)

상태: BLOCKED 그대로(남의 진행 중 파일 탓). 이 묶음의 완료 조건인 check:ids 는 CI 인자로 종료 0 이다.

1. **talk.greeting_recall 시드 값:** 처음부터 `"off"` 로 넣었으므로 바꾸지 않았다(seed/settings.json 110줄 · TEST_SETTINGS 같음). setting-default 0.
2. **design-number 에서 개발 도구 쪽 제외:** `scripts/check-ids.ts` 의 collectDesignNumbers 가 `DESIGN_COLOR_DEV_DIR`(`src/app/dev/`)로 시작하는 파일을 건너뛴다(518~522줄, 주석 52~55 · 514줄). 상한 49 는 그대로다. 시험은 `tests/unit/check-ids.test.ts` 의 '식별자 대조: src 의 수 글자가 설정값과 같으면 보고하고 structure.ts · …' 에 dev 쪽 파일 하나(`src/app/dev/mic-probe/probe.ts`, 30 · 0.8)를 더해 기대 목록이 그대로임을 본다. 먼저 붉음 1 을 확인한 뒤 고쳤다.

| 명령 | 결과 |
|---|---|
| `pnpm check:ids --fail-on <ci.yml 목록> --design-number-max 49` | **종료 0**. fail-on 규칙 모두 0 · design-number 77 → 46 ≤ 49 (`ai-scope-0ga-checkids-final.txt`) |
| `vitest run --project unit` check-ids · talk-setting-keys · talk-lesson-call · talk-prompt-fix1 · talk-prompt-fix2 | 5 파일 · 122 통과 |
| `biome ci` 내 파일 여섯 | 통과 |
| `pnpm lint` | 통과(0-나 의 builders.ts 정렬은 그쪽에서 고쳐짐) |
| `npx tsc --noEmit` | 오류 2, 모두 `tests/unit/talk-observe.test.ts`(4-가 진행 중) |
| `pnpm test` | 2008 통과 · 5 실패 · 6 todo. 실패 5 는 모두 talk-observe.test.ts(4-가 의 새 대본 칸, 위와 같음) |

## fix 1(검토 rev-0 Important I-1 · plan 52 · 97 · 172줄)

상태: BLOCKED 그대로(남의 진행 중 파일 탓). 내 시험 · tsc 는 초록이다.

- **새 시험 `tests/unit/talk-no-audio.test.ts`(8건, AC-8 (마) (1) 녹음 안 함):** 제품 코드는 바꾸지 않았다(TurnRequestSchema 그대로, 내보내지도 않음).
  - 요청 규격 글(turn.ts TurnRequestSchema)은 strictObject 이고 소리 칸 이름이 없으며, input 은 mode · text · nospeech 뿐이다(turn.ts 원문에서 그 블록을 잘라 audio · record · blob · wav · webm · base64 · file 이 없음과 input 칸 셋을 본다)
  - 규격을 지나는 요청은 요청 검사를 넘어 DB 로 간다(아래 시험의 기준 — 건드리면 던지는 가짜 DB 가 불림)
  - 요청 맨 위에 소리 칸 audio · recording · blob 를 더하면 DB 를 열기 전에 error 줄 하나로 끝난다(3건)
  - input 안에 소리 칸 audio · recording · blob 를 더하면 DB 를 열기 전에 error 줄 하나로 끝난다(3건)
- 판정 방법: deps.db 로 '건드리면 셈하고 던지는' Proxy 를 넘긴다. 소리 칸 요청은 셈 0 · 줄 `[{ t: "error" }]` 이고, 기준 요청은 셈이 1 이상이라 요청 검사(turn.ts 117~121줄)에서 끝났음을 가른다.

| 명령 | 결과 |
|---|---|
| `vitest run --project unit` talk-no-audio · talk-setting-keys · check-ids · talk-lesson-call · talk-prompt-fix1 · talk-prompt-fix2 | 6 파일 · 130 통과 |
| `biome ci` 내 파일 일곱 | 통과 |
| `npx tsc --noEmit` | 통과(오류 0) |
| `pnpm lint` | 실패 1: `src/core/seed/reference-index.ts:4` import 정렬(0-나 파일) |
| `pnpm test` | 2003 통과 · 34 실패 · 6 todo. 실패 8 파일(seed-check-cli · seed-validate-cli · seed-validator-complete · seed-validator-distribution · seed-validator-image · seed-teacher · vocab-allocate · dev-tree)은 모두 0-나 의 새 목록 규칙 talk-cue-lines · talk-situation-lines 위반(목록 파일 진행 중). 앞서 막던 talk-observe 는 이제 지난다. 출력 `ai-scope-0ga-unit-all-3.txt` |
