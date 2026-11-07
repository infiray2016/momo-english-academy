# 묶음 2 fix 1 범위 한정 재검토 · rev-2-fix1

검토자: code-reviewer(Opus xhigh) · 2026-11-07 · 워크트리 `.claude/worktrees/p13d`. 지난 보고 `task-rev-2-report.md` 의 I-1 · M-1~M-4, 허용 낱말 활용형 고침(구현 보고 'fix 1' 절과 'fix 1 더함' 절), 고침이 만든 새 어긋남만 봤다. 묶음 5 진행 중 파일(talk-observe.ts · 짝 시험 · 넓이 시험) 탓의 biome · tsc 붉음은 판정에서 뺐다. 시험은 다시 돌리지 않았다. 의심 둘을 스크래치패드 스크립트(`rev2f1-madeup-probe.ts` · `rev2f1-bases-probe.ts`)로 확인했다. 판정은 07:49 의 파일로 했다(마지막 수정 question-check.ts 07:48:05).

## 라운드 판정: 수정 필요 (fix 라운드 1/3 · Critical 0 · Important 1 · Minor 1)

## 1. 지난 지적

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 통합 시험 신호 말 기대 long[0] | ADDRESSED | `tests/integration/talk-ai-scope.test.ts:307~322` 가 저장된 선생님 행 move(turnNo 차례, 선생님 행은 턴 번호마다 하나라 서버 state.turns 차례와 같다)로 `cueLinesOfMoves(...).at(-1)` 을 기대로 꺼내고, 그 줄이 together '1' 긴 꼴 목록에 드는지 따로 본다. 다시 흘림 동일성 단언(344~346줄)은 그대로다 |
| M-1 상황 줄 겹침 | ADDRESSED | `situation.ts:162~209` SituationAvoid: 이 턴에 남긴 문장과 한 문장이 같은 줄, 이 대화 앞 선생님 행 글에 그대로 든 줄을 건너뛰고, 모두 걸리면 돌림 차례 줄이다. 서버 세 자리(`lesson-turn.ts:800` 문장 문 · 1287 반응 자리 · 2624 실패 대신 줄)가 모두 넘긴다. 시험 `talk-situation.test.ts:502~543` 이 같은 턴 겹침 · 앞 차례 되풀이 · 모두 걸림을 단언한다 |
| M-2 시드 꼴 신호 말 앞뒤 붙음 | ADDRESSED | `cue-line.ts:61~124`: 낱말 둘 이상인 시드 꼴이 문장 앞이나 끝에 오고 나머지가 채움 낱말 · 이름뿐이면 신호 말이다. 낱말 하나 꼴은 문장 전체만 본다. 시험 `talk-cue-line.test.ts:412~` 가 지울 것 넷과 남길 것 다섯('Come with me!' · 'Is it your turn to play?' 포함)을 가른다 |
| M-3 가르지 않는 단언 둘 | ADDRESSED | `talk-situation.test.ts:1112` 이 AI 답 예시 "Yes, I do." 와 같음을 단언한다. '4단계 불변'(1126~1160줄)은 4단계 계획을 상황 재료와 함께 문장 문 · 끝 처리에 돌려 kept 가 AI 글 그대로이고 상황 줄이 없음을 본다. 상수 되읽기는 지워졌다 |
| M-4 끝인사 배선 시험 | **NOT ADDRESSED** | 시험은 더했지만(`talk-ai-scope.test.ts:486~504`) CI 에서 실패하는 꼴이다. 아래 3절 N-1 |

## 2. 허용 낱말 활용형 고침이 범위 판정을 느슨하게 했는가

- **범위 판정 자체는 그대로다.** 바뀐 것은 `question-check.ts:228~236` 의 허용 낱말 대조(allowedHas)뿐이다. 범위 재료(allowedWords · unitWords · childWords · lemmaOf)는 손대지 않았다. 1~3단계 AI 질문 검사(`question-check.ts:254 · 333`)는 셋째 인자를 넘기지 않아 이 고침이 닿지 않는다. 허용 목록은 상황 차례 검사(`situation.ts:147~153`)에만 넘어간다.
- **서버 길(사전 있음)은 실제 활용형만 받는다.** `lesson-turn.ts:2087~2110` readAllowedLemmaOf 는 허용 낱말 41개인 vocab 행의 forms 만 원형에 잇는다. 사전이 있으면 꼬리 떼기를 하지 않는다(236~238줄). 실제 `seed/vocab.json` 은 go(goes · went · gone · going) · word(words) · keep(kept) 처럼 허용 낱말의 활용형을 모두 담고 있어, 넓어지는 것은 허용 낱말의 진짜 활용형뿐이다. 허용 목록이 원형만 담는다는 spec 설계 1 (가)의 뜻과 맞다.
- **사전 없는 길(대본 도구 · 순수 시험)은 조금 느슨하고 서버와 다르다.** 꼬리 떼기(allowedBases 205~219줄)는 허용 낱말에 꼬리가 붙은 꼴을 활용형이 아니어도 받는다. 스크래치패드 `rev2f1-bases-probe.ts` 로 재 보니 'news'(new) · 'cans'(can) · 'wells'(well) · 'goods'(good)가 사전 없는 길에서는 통과하고 서버 길에서는 범위 밖이다. 반대로 'went' · 'kept' 는 서버 길만 통과한다. 아래 3절 N-2 다.

## 3. 새로 깨뜨린 것

### Important

**N-1. 새 끝맺음 시험의 걸림 예 'I remember it!' 은 시드 지어낸 경험 꼴에 걸리지 않아, 시험이 CI 에서 실패한다(M-4 NOT ADDRESSED).**
- 어디: `tests/integration/talk-ai-scope.test.ts:503`(`farewellOf("I remember it! Bye bye!")` 가 카드 끝인사이기를 기대)과 `seed/lists/talk-made-up-phrases.json`.
- 왜: 시드 꼴 목록은 'i remember when' · 'i remember my' 만 두고 'i remember' 단독 꼴이 없다. 시험 도우미(`talk-fixture.ts` deps)는 talkLists 를 넘기지 않으므로 runTalkClosing 은 시드 목록을 그대로 쓴다. 스크래치패드 `rev2f1-madeup-probe.ts` 로 같은 판정 함수(madeUpHit)를 시드 목록에 돌리니 "I remember it! Bye bye!" 는 null 이고 "I remember my fish! Bye bye!" 는 'i remember my' 로 걸렸다. 그래서 끝인사는 AI 글 그대로 남고, 503줄 기대(카드 끝인사)가 어긋난다. 단위 talk-made-up 은 견본 목록(PHRASES, 'i remember' 포함)을 써서 이 차이가 드러나지 않았다.
- 어떻게: 걸림 예를 시드 꼴이 실제로 잡는 글로 바꾼다(예 "Yesterday I went to the lake! Bye bye!" 또는 "I remember my fish! Bye bye!"). 그리고 시험 안에서 먼저 `madeUpHit(글, seedTalkMadeUpPhrases())` 가 null 이 아님을 단언해, 목록 내용(묶음 3 몫)이 바뀌어도 시험이 스스로 전제를 드러내게 한다. 대조군 'Bye bye!' 는 그대로 둔다.

### Minor

**N-2. 허용 낱말 대조가 서버(사전)와 대본 도구 · 넓이 시험(꼬리 떼기)에서 다르게 판정한다.**
- 어디: `question-check.ts:228~236`(사전 유무로 갈림) · `lesson-turn.ts:2549`(서버만 사전을 넘김).
- 왜: plan 정한 것 7 은 서버와 대본 도구가 같은 규칙으로 같은 답을 내게 하려고 core 모듈을 나눴다(위험 4 '사본 어긋남'). 지금은 같은 함수라도 입력이 달라 'news' · 'went' 같은 낱말에서 결과가 갈린다(2절). 넓이 시험이 초록인 것도 사전 없는 길의 결과라 서버 길을 그대로 재지 않는다. 구현 보고 'fix 1 더함' 절이 이미 묶음 5 로 넘겼다.
- 어떻게: 묶음 5 가 대본 도구와 넓이 시험에서 `seed/vocab.json` 으로 같은 사전(lemmaLookup, 허용 낱말 행의 forms)을 만들어 allowedLemmaOf 로 넘기고, 짝 시험에 'news' 꼴 낱말 하나를 넣어 두 길이 같은지 본다. 사전을 늘 넘기게 되면 꼬리 떼기 길은 순수 시험용으로만 남긴다.

## 4. 범위 밖 관찰
- M-2 의 채움 낱말에 'is' · 'it' 이 들어 있어, AI 질문 'Is it your turn?' 은 신호 말로 지워진다('your turn' 이 끝에 오고 앞이 채움 낱말뿐). 회화 수업에서 나올 일이 드물어 지적으로 두지 않는다. 대본에서 신호 말로 지운 질문이 나오면 이 줄부터 본다.
