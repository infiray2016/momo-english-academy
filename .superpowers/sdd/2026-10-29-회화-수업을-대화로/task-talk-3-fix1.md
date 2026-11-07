# fix 1 보고: 회화 plan 묶음 3(구현자 · Opus · high, 2026-10-30 09:2x)

상태: DONE_WITH_CONCERNS. 검토 지적 I-1 · I-2 · M-1 · M-3 · M-5 를 고쳤고, M-2 는 주석 근거만, M-4 는 보고 문장만 고쳤다. 제 몫의 관문은 0 이다. 전체 lint · tsc · 단위 관문은 묶음 5 고침(impl-talk-5)이 09:23:44 에 고친 `tests/unit/talk-lesson-flow.test.ts` 한 파일 때문에 0 이 아니다(아래 '관문 결과').

검토 보고는 `task-talk-3-review-report.md`, 지시는 컨트롤러 09:2x 다. 시험을 먼저 고쳐 실패를 본 뒤(새 시험 8건 가운데 I-1 · M-1 두 건이 실패) 코드를 고쳐 통과시켰다. 나머지 여섯 건은 지금 코드의 갈래를 덮는 시험이라 처음부터 통과한다(I-2 · M-3 의 뜻이 '시험이 그 길을 지나게'였기 때문이다).

## 지적별 고친 줄

| 지적 | 고친 곳(줄은 고친 뒤) | 무엇을 |
|---|---|---|
| I-1 단원 덮기 범위 | `src/core/seed/check-talk.ts` 855~863(againTargets) | 필수 질문은 다지기 · 보강 카드(kind ≠ assigned) 것만 센다. 더 이야기할 거리는 모든 카드 그대로 센다(06:175 · 06:187). 주석도 같은 뜻으로 고쳤다 |
| I-1 보고 문장 | `task-talk-3-report.md` '설계와 다르게 한 것' 5 · '요청하는 변경' 3 | 실제 동작('배정 카드의 필수 질문은 다시 묻는 질문이어도 세지 않는다')으로 고쳤다 |
| I-2 단원 갈림길 시험 | `tests/unit/seed-validator-talk.test.ts` 758 · 800 | 옵션 없이 checkTalkUnit 을 부르는 시험 둘: 단원 틀대로 변형 둘 × 정규 10 · 보강 3 을 다 넣은 단원은 덮기를 깨면 talk-known-days 오류이고, 보강 카드 둘의 필수 질문이 덮기를 채운다. 세 장만 넣으면 talk-unit-incomplete 경고 하나(variant.1) |
| M-1 앞쪽 절반 | `src/core/seed/check-talk.ts` 371~374 · 414~415 | '앞쪽 절반'은 1~3단계(isLow) 배정 카드에만 건다. 4단계부터는 두면 개수 · 오늘 쓸 말 안만 본다 |
| M-2 쉬운 질문 뜻 | `src/core/seed/check-talk.ts` 740 · `src/core/seed/schema/talk.ts` 173 | 규칙은 그대로, 주석 근거를 13절 C194 (2)로 맞췄다 |
| M-3 막는 쪽 시험 | `tests/unit/seed-validator-talk.test.ts` 302 · 493 · 510 · 846 | talk-demands 의 home 밖 purpose(home 안 purpose 는 받음, demands 를 두면 통과), talk-shape(인사 질문 수 ≠ 인사 턴 수 · 4단계 인사 질문), talk-hints(쓸 수 있는 말 수 모자람 · 둘 수 없는 단계에 둠 · 3단계 인사 질문 영어 틀 없음 · 1단계에 영어 틀 둠), level-spec-talk-v1 을 segments · cardShape · choices 없음 · twoAnswers 한 칸씩 |
| M-4 '동작 그대로'의 예외 | `task-talk-3-report.md` '설계와 다르게 한 것' 2 | 옛 흐름 'Conversation mode' 줄(src/core/ai/calls/talk.ts:395)이 새 꼴 행의 mode 글을 읽는다는 예외 한 줄을 더했다. 코드는 그대로(위험 2) |
| M-5 e2e 변수 이름 | `tests/e2e/conversation.spec.ts` 906 · 910 · 911 | 기계 바꾸기로 talkCardV1 이 된 홈 카드 찾기 변수를 talkHomeCard 로 바꿨다. 다른 시험 · 코드에서 같은 꼴(변수 · 주석 · 글자)로 잘못 바뀐 곳은 grep 으로 찾지 못했다 |

## 시험 이름(더한 것, 모두 AC-15m)

- AC-15m 목표 home 밖 purpose 를 단 질문에 요구 능력이 없으면 거부한다(talk-demands)
- AC-15m 인사 꼴: 1~3단계 인사 질문 수가 인사 턴 수와 다르거나 4단계부터 인사 질문을 두면 거부한다(talk-shape)
- AC-15m 힌트: 쓸 수 있는 말 수가 단계 규격과 다르거나 인사 질문의 영어 틀이 단계 규격과 어긋나면 거부한다(talk-hints)
- AC-15m 4단계부터 배정 카드의 짧은 준비 낱말은 두면 개수 · 오늘 쓸 말 안만 보고 앞쪽 절반은 보지 않는다(06:186) — 고치기 전 실패
- AC-15m 단원 덮기는 배정 카드의 다시 묻는 필수 질문을 세지 않는다(다지기 · 보강 필수 질문 · 더 이야기할 거리만, 06:187) — 고치기 전 실패
- AC-15m 단원 칸이 다 찼는지는 검증기가 단원 틀로 가른다: 다 찬 단원(정규 · 보강 · 주제 변형 전부)은 덮기 모자람이 오류이고 보강 카드의 필수 질문도 센다
- AC-15m 단원 칸이 덜 찬 단원(세 장 먼저)은 옵션 없이도 단원 덮기를 talk-unit-incomplete 경고 하나로만 낸다
- AC-15m 회화 단계 규격 행의 옛 칸은 하나만 어겨도 거부한다(segments · cardShape · choices 없음 · twoAnswers 각각)

seed-validator-talk 는 30 → 38건이고 모두 통과한다.

## 관문 결과(09:2x, Node 24)

```
seed:validate   칸 795 · 통과 792 · 실패 0 · 빈 칸 4097 · 풀이 검사 안 됨 3 · 사람 확인 0 · 경고 16 · 규격 파일 오류 0  (종료 0)
check:ids       CI 목록 → 위반 0, design-number 47 / 상한 49  (종료 0)
spec:trace      --fail-on unknown-ac,plan-ac-not-in-spec --plan 회화 plan  (종료 0)
check:deps      no dependency violations found  (종료 0)
pnpm test       Test Files 1 failed | 132 passed (133) · Tests 10 failed | 1643 passed | 6 todo
tsc             오류 4 — 모두 tests/unit/talk-lesson-flow.test.ts(prepWords 칸이 LessonArgs 에 없음)
lint            오류 1 — tests/unit/talk-lesson-flow.test.ts 형식
```

실패 열 건 · tsc 넷 · lint 하나는 모두 `tests/unit/talk-lesson-flow.test.ts` 다. 이 파일은 묶음 5 고침이 09:23:44 에 고쳤고(구현 `src/core/conversation/lesson-flow.ts` 는 08:48 그대로), 아직 구현이 따라오지 않은 '시험 먼저' 단계로 보인다. 지시대로 묶음 5 파일은 고치지 않았다. 그 파일을 빼면 lint · tsc · 단위는 0 이다.

## 남은 우려

- 첫 보고의 남은 우려(옛 흐름 e2e · 로컬 개발 DB 회화 1단계, talk-3 브리프에 옮길 규칙, evidence.* 몫)는 그대로다. talk-3 브리프에는 이번 고침 둘(단원 덮기는 다지기 · 보강 필수 질문과 더 이야기할 거리만 셈, 4단계부터 짧은 준비 낱말은 앞쪽 절반 검사 없음)을 같이 옮겨야 한다.
