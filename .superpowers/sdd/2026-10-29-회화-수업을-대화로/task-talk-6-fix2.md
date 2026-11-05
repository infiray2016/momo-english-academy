# fix 2 보고: 회화 plan 묶음 6 — 재검토 N-1 · N-2(구현자 · Opus · high, 2026-10-30 10:0x, fix 라운드 2/3)

상태: DONE. 고친 파일은 `src/core/ai/calls/talk-lesson.ts`(고정부 문장)와 `tests/unit/talk-lesson-call.test.ts` 둘뿐이다. 표본 18개에는 고친 문장이 들어 있지 않아(grep 0) 그대로 두었다. 커밋 · push 없음.

순서: 새 시험 셋을 먼저 썼다. 고정부 글을 보는 두 건(N-1 단계별 문장 · N-2 괄호)이 실패하는 것을 본 뒤 고쳤다. 셋째 시험(probe2 와 같은 묶음 5 계획 → 호출 입력 → 정규화)은 처음부터 지났다. 계획 옮기기와 정규화는 이미 맞았고, 어긋난 것은 프롬프트 글뿐이었기 때문이다. 이 시험은 그 길을 지키는 회귀 시험으로 둔다.

## 고친 줄

| 지적 | 자리(talk-lesson.ts) | 고친 뒤 |
|---|---|---|
| N-1 | 712~715 | 712: 'Levels 1-3: when Turn is card_slot in support turns or after nospeech, the app plays the answer and adds the easier or next question. Write only a short reaction or cue (…). Do not write the answer or a question.'(카드 자리에 묶음). 713: 'Levels 1-3, Turn ai with Question: no after a stuck turn (saying it together): put the answer to say in model_line, not in tori_en.'(받침 첫째 — 02-2:259). 714: 'Levels 1-3, Turn ai at Support stage 2: do not give the answer. Ask an easier yes-or-no question, or put two answer choices in choices.'(02-2:260). 715: 'Levels 1-3, Turn ai at Support stage 3 or after nospeech: put the answer in model_line, not in tori_en, then ask about the next topic.'(02-2:261, 붙일 기회가 없는 드문 길). 옛 'When Turn is ai after a stuck or nospeech turn, put the answer to say in model_line'은 지웠다 |
| N-2 | 680 | 'When Question: no, do not ask any question. Write only a reaction (from level 4, with the answer example to say together; or a short line moving on).' |

## 시험(tests/unit/talk-lesson-call.test.ts, 38 → 41)

새 describe 'fix 2 받침 단계별 1~3단계 AI 차례 규칙(재검토 N-1 · N-2)':
1. 1032줄: 1~3단계 고정부가 받침 단계마다 AI 차례 문장을 나누고(카드 자리 · Question: no · 단계 2 · 단계 3 / 들리지 않음 네 문장), 옛 문장이 없으며, 4단계 고정부에는 이 문장들이 없다.
2. 1054줄: probe2 와 같은 묶음 5 계획(3단계 · AI 이어 묻기 'Who do you play with?' → 단추 → 받침 첫째 카드 자리 → 단추)을 `talkCallTurnOf` 로 옮기면 kind ai · aiAsks 참 · Support stage 2 · Card line - 이다. 메시지는 'Turn: ai · Question: yes · Card line: - · Support stage: 2'이다. 그 응답의 선택지 둘(같은 꼴 · 카드 항목 없음 · next_targets 의 노리는 단어)은 정규화를 지나고 model_line 은 빈 값이다.
3. 1110줄: N-2 괄호 글.

바꾼 시험 하나: '1~3단계 받침 · 들리지 않음 카드 자리 규칙'(fix 1)의 기대 문장을 712줄의 새 글로 바꿨다.

## 관문(2026-10-30 10:0x, Node 24)

| 명령 | 결과 |
|---|---|
| `pnpm vitest run tests/unit/talk-lesson-call.test.ts tests/contract/ai-schemas.test.ts` | 68 passed · 6 todo |
| `pnpm test`(단위 전체) | 138 files · 1709 passed · 6 todo, 실패 0 |
| `pnpm tsc --noEmit -p .` | 종료 0 |
| `pnpm lint` | 종료 0 |
| `pnpm check:deps` | no dependency violations(281 modules) |
| `pnpm check:ids --fail-on …(CI 꼴) --design-number-max 49` | 종료 0 |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 종료 0 |

fix 1 때 다른 손 때문에 깨졌던 tsc(conversation-server.test.ts) · lint(structure.ts)는 이번 실행에서 0이다.

## 남은 우려

- 재검토 4절 관찰(막힘 계획 메시지의 'Turns left'가 답함 계획 값)은 범위 밖이라 고치지 않았다. 참고 정보라 흐름에는 닿지 않는다.
- 715줄의 셋째 · 들리지 않음 AI 차례 길에서 '답 소리가 새 질문 뒤'에 읽히는 차례 문제는 장부의 '구현하며 확인할 것'에 그대로 남는다(재검토 3 수용).
