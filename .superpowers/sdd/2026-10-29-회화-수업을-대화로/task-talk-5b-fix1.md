# fix 1 보고: 회화 plan 묶음 '5-나' 앞 차례(2026-10-30 10:1x, 구현자 impl-talk-5 · Opus · high)

상태: DONE. 검토 `task-talk-5b-review.md` 의 지적을 고쳤다.
- Important I-1 은 컨트롤러 결정 13절 C195 대로 단계 규격 칸으로 옮겼다.
- Minor 넷(M-1~M-4)도 모두 고쳤다.
- 묶음 6 의 파일(talk-lesson.ts 고정부의 같은 경계 포함)과 묶음 7 의 파일(structure.ts 포함)은 고치지 않았다.
- 커밋 · push 는 하지 않았다.

시험을 먼저 고쳐 넷이 실패하는 것을 본 뒤 구현했다. 실패한 넷은 C195 칸 · 단계 경계 · M-1 · M-2 다. 검증기 거부 경우 하나는 시험과 구현을 이어서 썼다. 구현이 없으면 거부가 0 건이라 실패하는 단언이다. 줄 번호는 워크트리 `.claude/worktrees/p13d` 의 고친 뒤 기준이다.

## I-1(C195) 한국어 설명 막힘 차례를 회화 단계 규격 칸으로

- **`src/core/seed/schema/reference.ts:289`:** 회화 단계 규격에 `koExplainFromStuck`(양의 정수)을 더했다. 같은 질문 자리에서 몇 번째 막힘부터 한국어 설명을 보이는지다.
  - 스키마에서는 선택 칸이다. 개발 DB 에 남은 옛 판 회화 행(앞 개정)을 런타임이 엄격히 읽기 때문이다. 필수로 두면 옛 흐름이 그 행에서 던진다.
  - 새 꼴 행에서는 아래 규격 정합 검사가 반드시 두게 한다. `choices` 칸과 같은 꼴이다.
- **`src/core/seed/reference-index.ts:424 · 436-437 · 443`:** 규격 정합 level-spec-talk-v1 에 'koExplainFromStuck 없음'을 더했다. 시드 파일의 회화 행에 이 칸이 없으면 거부한다. 이 파일은 지시의 세 파일 밖이지만 같은 닫힌 묶음 3 의 파일이다. 새 칸을 새 꼴 행에 지키게 하는 자리가 여기뿐이라 함께 고쳤다.
- **`seed/level-specs.json`:** 회화 12행에 `"koExplainFromStuck"` 을 넣었다. 1~4단계는 1, 5~12단계는 2 다.
  - koMeaning 바로 뒤에 넣었고, 다른 줄 · revision(잠정 3)은 그대로다.
  - 고치기 전 판과 견주면 바뀐 줄이 12 다. 그 판은 스크래치패드 `level-specs.before-5b-fix1.json` 에 두었다.
- **`tests/fixtures/seed/builders.ts:833`:** 회화 단계 규격 견본에 `koExplainFromStuck: level <= 4 ? 1 : 2` 를 넣었다.
- **`src/core/conversation/hints.ts`:** 대문자 상수 둘(KO_EXPLAIN_EARLY_LAST_LEVEL · KO_EXPLAIN_LATE_FROM_STUCK)을 지웠다.
  - `koExplanationShownOf({ spec, stuckInSlot, cause })`(:241-252)는 `spec.koExplainFromStuck` 을 읽는다.
  - 칸이 없는 행(옛 판)이면 던진다. 조용한 기본값을 두지 않으려는 것이다.
  - 둘째 막힘 2 도 칸 값이 되어 structure.ts 에 둘 구조 수는 남지 않았다.
- **묶음 6 고정부:** talk-lesson.ts 681줄 근처의 같은 경계는 지시대로 건드리지 않았다. '5-나' 뒤 차례(할 것 3)에서 같은 칸을 읽게 해야 한다.
- **시험:**
  - talk-lesson-hints 'AC-15g 한국어 설명의 막힘 차례는 회화 단계 규격 칸 koExplainFromStuck 이다(1~4단계 1 · 5단계부터 2, C195)'. 실시드 12행의 값과, 칸이 없는 행에서 던짐을 본다.
  - 'AC-15g 1~4단계는 첫 막힘부터 …'는 실시드 3 · 4 · 5단계 규격을 넘긴다.
  - seed-validator-talk 'AC-15m 회화 단계 규격 행의 옛 칸은 하나만 어겨도 거부한다(… koExplainFromStuck 없음 각각, C195)' 에 경우 하나를 더했다.
  - 같은 파일의 새 꼴 견본 확인에 칸 값 단언을 더했다.

## Minor

- **M-1 4단계부터 AI 가 말로 답을 준 차례.** `hints.ts:280-282`. heardHelpsOfMove 가 계획이 정한 사실(move.stage 1 같이 말하기 · stage 3 닫기 · cause nospeech 들리지 않음 닫기)이면 AI 의 support 값과 관계없이 답 예시를 들은 것으로 본다. 받침 둘째(쉬운 질문)는 들은 도움이 아니다.
  - 시험: 'AC-15h 4단계부터 AI 가 말로 답을 준 차례(같이 말하기 · 닫기 · 들리지 않음)는 AI 의 support 값과 관계없이 답 예시를 들은 것이다'.
- **M-2 정리 따라 말하기의 뜻.** `wrap-up.ts:164`. 모든 줄에 뜻이 있을 때만 이어 붙인다. 되풀이 문장에는 뜻이 없으므로 보통은 따라 말하기 항목에 뜻이 없고, 줄마다의 뜻은 정리 말풍선(부르는 쪽)이 보인다.
  - 시험은 뜻이 섞인 경우(뜻 없음)와 모든 줄에 뜻이 있는 경우(이어 붙임) 둘로 바꿨다.
- **M-3 힌트 단계 규격 형.** `hints.ts:179` 의 LessonHintSpec 을 `Pick<TalkLevelSpec, "band" | "hintTiers" | "usablePhrases">` 로 바꿨다. 쓰지 않게 된 형 가져오기(Band · TALK_HINT_TIERS)는 지웠다.
  - 힌트 시험은 손으로 적은 규격 대신 실시드 `seed/level-specs.json` 의 3 · 5 · 6 · 8 · 10단계 행을 읽는다.
- **M-4 시험 손질.**
  - (1) 'AC-15h 6단계 처음 묻는 턴의 첫 단은 AI 출력과 관계없이 영어 틀이고 …'는 AI 힌트(뜻 단 포함)를 함께 넘기고 첫 단이 카드 영어 틀인지 본다.
  - (2) '소리 줄을 들은 턴은 … '말했다'가 아니다'는 saidWordsOf 를 함께 불러 빈 목록을 본다.
  - (3) 같은 시험에 8단계 다시 묻는 턴을 더했다. '힌트'를 두 번 누르면 뜻 다음 영어 틀이다.
  - (4) talk-lesson-wrap '4단계는 마지막 되풀이 문장 …'의 AC-15e 표지를 뗐다.

## 관문(10:1x, 워크트리, Node 24)

```
pnpm exec tsc --noEmit        종료 0(전체)
pnpm lint                     Checked 574 files · No fixes applied(오류 0)
pnpm test                     Test Files 138 passed · Tests 1711 passed | 6 todo
pnpm check:deps               no dependency violations found(281 modules)
pnpm check:ids --fail-on …(CI 목록) --design-number-max 49   종료 0 · 위반 0 · design-number 47
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec --plan 본 저장소 회화 plan   종료 0 · unknown-ac 0 · plan-ac-not-in-spec 0
pnpm seed:validate            종료 0 · 실패 0 · 규격 파일 오류 0 · 경고 16(모두 unit-goals 목표 정의 전, 이 변경 전과 같은 종류)
```

## 남은 것

- 묶음 6 고정부의 같은 경계(talk-lesson.ts 681줄 근처 'from the first stuck at levels 1-4 and from the second stuck from level 5')를 같은 칸에서 만들게 하는 일은 할 것 3 차례 몫이다. 옛 고정부(talk.ts 384줄)는 묶음 12 가 지운다.
- 개발 DB 적재: 이 칸은 앱 동작만 바꾸는 칸이고(C195), 회화 단계 규격 행은 잠정 revision 3 그대로 적재 전이다. 적재 때 새 칸이 함께 든다.
