# 구현 보고: 회화 plan 묶음 7 fix 1(구현자 · Opus · high, 2026-11-05, fix 라운드 1/3)

브리프 `task-talk-7-fix1-brief.md`, 검토 보고 `task-talk-7-review-report.md` 3절의 I-1 · M-1 · M-2 · M-3 을 고쳤다. 코드는 워크트리 p13d 에 있다. M-4 와 '하지 않을 것'의 파일은 건드리지 않았다.

## 지적마다 고친 것

### I-1(Important) 다지기 · 보강 카드의 짧은 준비 활동 번호
- `src/core/conversation/attempt.ts:178~189` LessonFollowCounts 에 `prepWords`(talk.prep_words.<구간>, 부르는 쪽이 설정값에서 넘김) 칸을 더했다. todayWords 주석은 '바닥선 듣기 활동의 범위'로 고쳤다.
- `attempt.ts:191~208` lessonFollowAlongNo 의 짧은 준비 범위를 `prepRange = Math.max(todayWords, prepWords)`(201줄)로 잡고, 바닥선 번호대는 그 뒤에서 시작한다(203줄). 바닥선 범위는 오늘 쓸 말 수 그대로다(02-2:265 '아직 꺼내지 않은 새 단어'). 함수 주석에 02-2:173 · 176 근거를 적었다. 이 함수를 부르는 코드는 src 안에 아직 없다(묶음 9 가 부른다).
- 구현 보고 `task-talk-7-report.md:73` 의 부르는 꼴을 `{ todayWords: card.todayWords.length, prepWords: settings[talk.prep_words.<구간>], wrapUp }` 로 고쳤다.
- 시험(`tests/unit/talk-lesson-attempt.test.ts`, 설정값은 22줄에서 `seed/settings.json` 을 읽는다):
  - 183줄 '다지기 · 보강 카드(오늘 쓸 말 0)의 짧은 준비는 talk.prep_words.<구간> 개까지 활동 번호를 받는다(02-2:173)': **먼저 실패를 봤다**(고치기 전 `RangeError: 회화 따라 말하기 차례가 범위 밖이다: prep 0`), 고친 뒤 통과한다. prep 0 · 마지막 · 범위 밖, 정리 · 한 번 더 번호, 바닥선 0 이 던짐을 본다.
  - 204줄 '배정 카드의 오늘 쓸 말이 talk.prep_words 보다 많으면 짧은 준비 범위는 오늘 쓸 말 수다': max 의 다른 쪽을 지키는 시험이다. 고치기 전에도 통과했다(실패를 볼 수 없는 갈래다).
  - 163줄 기존 활동 번호 시험: counts 에 prepWords 3 을 넣고 제목을 새 범위 규칙으로 고쳤다. 기대값은 그대로다.

### M-1 구현 보고의 틀린 문장
- `task-talk-7-report.md:81` 을 '0006 적용 전에는 talk_turns 를 읽거나 쓰는 서버 길이 옛 흐름이든 새 흐름이든 `column "move" does not exist` 로 깨진다(Drizzle 이 select · insert · returning 에 모든 열을 적음), 그래서 Approved 뒤 0006 을 먼저 적용한다'로 바로잡았다. 코드는 고치지 않았다.

### M-2 마이그레이션 시험이 마지막 줄을 단언함
- `tests/unit/talk-lesson-attempt.test.ts:310~313` 에서 `journal.entries.at(-1)` 대신 `entries.find((e) => e.tag === "0006_talk_turns_move_prep")` 로 줄을 찾아 `idx: 6` 을 본다. 0007 이 아직 없어 고치기 전 실패는 볼 수 없다.

### M-3 AC-16a 표지
- 두 길을 섞지 않고 시험마다 맞는 쪽을 골랐다.
  - `tests/unit/talk-lesson-state.test.ts:167 · 184`(lessonClosingOf 시험 둘): 표지 AC-16a 를 두고, talkEndOf 의 결과를 함께 단언한다. 완료 넷은 `{ outcome: "completed", friendship: true }`, stop_confirmed 는 `{ outcome: "aborted", friendship: false }` 다. 까닭: 이 두 시험은 끝난 길을 입력으로 받으므로 16a 의 묶음 7 몫(어느 끝이 친한 정도가 오르는 참여 완료인가)을 바로 증명할 수 있다.
  - `tests/unit/talk-lesson-attempt.test.ts:142`(시도 꼴의 까닭 목록 시험): 표지를 '정한 것 6'으로 바꿨다. 까닭: 이 시험은 Zod 꼴이 까닭 열 개를 받는지만 보고 끝난 길 · 친한 정도와 닿지 않아, 단언을 더하면 다른 시험의 내용을 되풀이하게 된다.

## 관문 결과(2026-11-05, 출력은 스크래치패드에 둠)

| 명령 | 결과 |
|---|---|
| `pnpm vitest run` 두 파일(고치기 전) | 1 실패 · 9 통과(I-1 시험의 RangeError) |
| `pnpm biome check --write` 세 파일 | 0, 고침 없음 |
| `pnpm vitest run` 두 파일(고친 뒤) | 17 통과 |
| `pnpm biome ci` | 0, 574 파일 |
| `pnpm vitest run --project unit` | 0, 138 파일 · 1713 통과 · 6 todo |
| `pnpm exec tsc --noEmit -p .` | 0, 오류 0 |

출력 파일: `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/fix1-red-i1.txt` · `fix1-green.txt` · `fix1-ci.txt` · `fix1-unit.txt` · `fix1-tsc.txt`.

## 설계와 다르게 한 것
- 없다. 짧은 준비 범위는 브리프가 정한 max(오늘 쓸 말 수, talk.prep_words.<구간>)이다.

## 요청하는 변경 · 우려
- plan 107줄 '범위는 카드 오늘 쓸 말 수' 문장은 검토 보고대로 컨트롤러가 고친다(짧은 준비는 max(오늘 쓸 말 수, talk.prep_words.<구간>), 바닥선은 오늘 쓸 말 수).
- 다지기 · 보강 카드는 오늘 쓸 말이 비어 바닥선 듣기 활동의 범위가 0 이다. 02-2:265 의 바닥선은 '아직 꺼내지 않은 새 단어'를 들려주므로 다지기 카드에서 바닥선 낱말이 무엇인지(이월 단어인가)는 이 묶음 밖이다. 묶음 16(바닥선 동작)이 다지기 카드에서 바닥선 낱말을 둔다면, 바닥선 범위도 같은 식으로 넓혀야 한다.
