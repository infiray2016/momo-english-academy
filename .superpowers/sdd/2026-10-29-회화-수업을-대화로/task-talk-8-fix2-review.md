# 범위 한정 재검토: 회화 plan 묶음 8 fix 2(rev-talk-8 · Opus · xhigh, 2026-11-05, 라운드 2/3)

판정: **Approved.** N-1 은 ADDRESSED, N-2 는 뜻을 적어 닫혔다. 새로 깨뜨린 것은 없다.

범위: fix 2 보고 `task-talk-8-fix2.md` 가 적은 자리만 본다(`src/server/conversation/lesson-turn.ts` 의 끝 처리, `tests/unit/talk-lesson-turn.test.ts` 의 M-1 시험 · 새 AC-15r 시험). 시험 전체는 다시 돌리지 않았다. 지난 재현 스크립트(probe3)를 지금 코드로 다시 돌렸고, 출력은 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/r8/probe4-out.txt` 다.

## 1. 지적별 판정

| 지적 | 판정 | 근거(워크트리 p13d) |
|---|---|---|
| N-1 반응 물음 뒤 되풀이한 막힌 질문에 받침 줄이 붙지 않음 | ADDRESSED | `lesson-turn.ts:993~996` 에서 `why === "same_question" && keptQuestion` 줄이 지워지고 까닭 · 흘려 보내기 한계 주석만 남았다. 같은 질문으로 지우면 늘 카드 자리로 간다(1004~1010). 지난 재현 'AC-15r react'(받침 둘째, 'Oh, is it hard?' · 'What is your favorite subject?')가 이제 text 'Oh, is it hard?\nEasy first 1?', move card_slot · same_question · easy_question · required 1 이다(probe4-out.txt). 'AC-15r plain' · 'M-1 old' · I-1 · M-2 재현 값은 fix 1 때와 같다. 시험: M-1 둘째 단언이 카드 자리 · 'What color do you like?\nWhich class is hard?' 로 바뀌었고(test:877~893), 새 시험 'AC-15r 4단계부터 반응 물음 …'(896~925)이 같은 꼴을 단언한다. 정본 02-2:200 · AC-15r 과 맞다 |
| N-2 흘린 겹침 표시의 뜻 | ADDRESSED(뜻 기록) | 코드는 그대로이고, fix 2 보고가 이 값을 'AI 가 고정부를 어기고 답을 tori_en 에 쓴 턴'(화면에서 T2 가 깨진 턴이 아님)으로 적었다. 묶음 13 talk:observe 브리프로 옮기는 것은 컨트롤러 몫이다. T2 가 깨진 턴을 따로 세는 move 칸은 장부 몫으로 남는다 |

## 2. 새로 깨뜨린 것
없다. 지운 줄 뒤의 길은 fix 1 전과 같다. keptQuestion 은 끊김 · 한 줄 결과의 카드 자리(998~1001)와 M-3 의 끊긴 턴 판정(1060~1064)에만 남아 그대로 쓰인다. 남는 한계(AI 가 정말 질문 둘을 쓰고 둘째가 되풀이인 드문 턴에 질문 둘)는 보고와 주석에 적혀 있고, 4단계부터 문장을 바로 보내는 설계(정한 것 19)에서 오는 것이다.

## 3. 범위 밖 관찰
- 0007 적용 뒤 `seed:load --dry-run` 에서 '목표 채움 4 · 거부 0'을 먼저 확인하면, 목표 채움 규칙(T-87)이 통합 시험 전에 실제 DB 에서 맞는지 보인다(fix 1 재검토 관찰 그대로).

## 4. 라운드 판정
**Approved(라운드 2/3).** 묶음 8 의 열린 코드 지적은 없다. 장부에 남는 것은 M-5(4단계 거절의 카드 질문 확인) · M-6(잠금표 · plan 파일 줄의 새 파일 둘) · M-7(받침 번호 사본) · N-2 의 talk:observe 브리프 옮김이고, 모두 컨트롤러 몫이다.
