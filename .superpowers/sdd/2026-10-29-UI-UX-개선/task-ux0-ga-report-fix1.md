# fix 1 보고: 묶음 0-가 코드 검토 Minor M1 · M2 · M3 · M5 · M6(구현자 · Opus · high, 2026-10-30)

상태: DONE · 워크트리 p13d(커밋 안 함) · M4 는 지시대로 손대지 않음(0-마 몫). 0-나 · 0-라 파일과 talk-frame 의 WrapView · 마무리 카드 자리는 건드리지 않음.

## 지적별
- **M1** `src/app/(child)/[area]/lessons/lesson-board.tsx`: 순수 `selectionKeptOf`(:116)를 더했다. 효과(:195)는 오류 줄이 있거나 쉼 글이 보이면 고른 표시를 되돌린다. 시험 'M1 목록 고른 표시 …'.
- **M2** `src/components/session/ai-rest.tsx`: `runAiRestRetry` 결과를 released · still · failed 셋으로 나눴다(:66). `troubleTextOf`(:39)와 `aiRestTroubleOf`(:44)는 있는 글(LESSON_START_TEXT.offline · failed)을 쓴다. `useAiRestRetry` 는 trouble 을 싣고, AiRest 는 끊김 · 실패 한 줄을 보인다(:182, data-ai-rest-trouble). 새 문구는 없다. 시험 'M2 …'과 'UX4 다시 확인 한 번'(던짐을 failed 로 고침).
- **M3** `src/app/(child)/home-cards.tsx`: 순수 `micRecheckPressOf`(:405)를 더했다. 설정을 읽지 못하면 단추를 켠 채 끊김 · 실패 한 줄을 보이고(:473), 누르면 다시 읽는다. 읽은 뒤 한 번 더 누르면 마이크 확인이다. 단추가 꺼지는 때는 읽는 중과 확인 중뿐이다. 시험 'M3 …'.
- **M5** `src/components/conversation/talk-frame.tsx`: 순수 `takeRestResend`(:295)를 더했다. 이 함수는 멈춘 턴을 꺼내고 listenEndedAt 을 비운다. 쉼 풀림 처리(:360)가 이 함수를 쓴다. 시험 'M5 …'.
- **M6** 낡은 주석을 고쳤다.
  - home-cards.tsx :8 · :64 는 R-10 대로 1-나 뒤에도 둔다는 말로 바꿨다.
  - talk-frame.tsx :422 · :594 와 talk-stream.ts :14 는 '다시 해 볼래요'로 바꿨다.
  - 남은 '다시 해 보기'는 단추 글이 아닌 일반 서술이라 두었다.

시험: `tests/unit/ux-recover.test.ts` 에 'fix 1 돌아갈 길 보정' 묶음(:310) 넷을 더하고 하나를 고쳤다. 이 파일은 17 통과다. 먼저 실패하는 것을 확인했다(5 실패).

## 관문(p13d, 0-나 · 0-라 변경 포함)
| 관문 | 결과 |
|---|---|
| pnpm lint | 460 files, No fixes applied |
| pnpm exec tsc --noEmit | exit 0 |
| pnpm test | 102 files · 1121 passed · 6 todo |
| pnpm check:deps | 위반 0 (237 modules, 1271 deps) |
| pnpm check:ids | 위반 0, design-number 49(넘지 않음) |
| pnpm spec:trace --fail-on unknown-ac | exit 0, unknown-ac 0, missing-test 16(모두 P12) |

## 우려(1)
1. M2 를 고치면서 `ai-rest.tsx`(components)가 `use-lesson-start.ts`(app)의 글을 읽게 됐다. closing-cards 와 같은 방향이고 check:deps 는 통과한다. 글을 공용 자리로 옮기는 일은 0-다 이후로 둔다.
