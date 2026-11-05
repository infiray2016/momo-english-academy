# 범위 한정 재검토: 회화 턴 프롬프트 · 흐름 규칙 고침 3 fix round 2(검토자 Opus · xhigh, 2026-11-06)

**라운드 판정: Approved.** M-1 · M-2 · M-3 · M-4 와 AC-15b 는 모두 ADDRESSED 다. 새 지적은 없다. 새 설정 키도 읽지 않는다. fix 2 diff 의 더한 줄에 설정을 읽는 곳이 없고, turn.ts · seed/settings.json · tests/fixtures/settings.ts 는 diff 에 없다.

읽는 법. 지난 보고는 `task-prompt-3-fix1-review.md` 이다. 대상은 69b1a4d 뒤 변경 diff `diff-prompt-3-fix2.patch`(5 파일)이고, 같은 워크트리의 마이크 묶음은 범위 밖이다. 변이는 새 사본 `prompt2-review/mut6/` 에서 돌렸다(`/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/`). 사본에서 회화 단위 시험 여섯 파일 193건이 지났다. 줄 번호는 워크트리 `.claude/worktrees/p13d` 의 지금 파일이다. 워크트리는 고치지 않았고 실호출도 하지 않았다.

## 1 항목별 판정

| 항목 | 판정 | 근거 |
|---|---|---|
| M-1 되풀이 · 반응 낱말 | ADDRESSED | `talk-lesson.ts:1357` questionField 가 마지막 물음표 문장과 그 앞 글을 함께 내고, `1401` 이 앞 글을 넘긴다. `question-check.ts:380` 은 앞 글 낱말을 '새 내용 낱말'로 치지 않는다. 시험(`talk-prompt-fix3.test.ts` 431~)에서 'Big.' → 'Yes, the lake is big! Is the lake big or small?' 과 'Cold.' → 'Cold juice, yum! Is the juice cold or hot?' 은 버리고, 'My mom is big.' → 'Oh, your mom is big! Is your dad big or small?' 은 남긴다. 정규화 한 건도 tori_en 에서 앞 글을 뽑아 거르는지 본다 |
| M-2 되풀이 동사 | ADDRESSED(프롬프트) | `talk-lesson.ts:777` "using the action your question just asked about, and keep 'like' only when your question asked what the child likes …". 'What food do you like?' + 'Rice.' → 'You like rice!' 예가 들어, 지난번 부딪침이 풀렸다. 시험은 고정부 문장이다 |
| M-3 같은 필수 질문 글이면 항목 유지 | ADDRESSED | `talk-lesson.ts:1467` asksCardQuestionAsIs 가 AI 의 마지막 물음표 문장(questionKeyOf)과 카드 항목 글의 질문(cardQuestionKeyOf — 카드 글의 마지막 질문을 같은 normalizeSpoken 으로)을 견준다. 같은 질문 셈의 열쇠와 같은 꼴이다. `1687` 은 같으면 카드 항목을 남기고 다르면 지금처럼 비운다. 시험 두 경우가 있다. fix 1 A 시험 두 곳은 질문 글을 카드 글과 다르게('Do you play a game?') 바꿔 비움 경우를 그대로 본다 |
| M-4 talk_turns 행 → lessonCallTurnOf 시험 | ADDRESSED | 시험이 talkMoveOf jsonb 를 단 tori · child 행을 lateCardRowsOf → lessonCallTurnOf 로 잇는다. 늦은 답은 켜지고, 이미 답한 행과 꼴이 틀린 move 는 켜지지 않는다. 서버 호출 자리(`lesson-turn.ts:2028` 의 state.liveRows 인자)만 남지만, 함수 사이 배선은 이제 덮인다 |
| AC-15b(CI 일곱째) | ADDRESSED(원인 판단 맞음) | 아래 2절 |

**구현자의 '변이 넷 실패 확인' 주장은 맞다.** 사본에서 넷 모두 시험이 잡았다. 넷은 앞 글 조건 뺌, 정규화가 앞 글을 넘기지 않음, 같은 질문이면 남김 뺌, 행 갈래 뒤바꿈이다. 제가 더해 본 변이(`lesson-turn.ts:2276` 의 `saidWords: said` 를 null 로)는 단위 193건이 모두 지난다. DB 에 쓰는 줄은 통합 AC-15b 가 맡는 자리라 결함은 아니다.

## 2 AC-15b 원인 판단

- **앱 저장 길은 바뀌지 않았다.** `lesson-turn.ts:2224` lessonSaidWordsOf 는 옛 식(`value && mode === "speech" ? saidWordsOf(…) : []`)과 같다. value 가 null 이거나 말 입력이 아니면 빈 목록을 돌려주고, 동음이의어 목록은 필요할 때만 읽는다. 저장 블록(`2266-2280` 부근)은 선생님 행을 넣는 같은 자리에서 이 턴 아이 행을 늘 `saidWords: said`(배열)로 갱신한다. 그래서 두 번 실패한 턴의 아이 행은 null 이 될 수 없다. 시험이 본 null 은 다른 아이 행(seed 된 인사 쪽)의 값이라는 판단이 코드와 맞는다. Postgres 는 ORDER BY 없는 읽기의 차례를 보장하지 않으므로, 앞 시험이 지운 자리에 새 행이 들어가 차례가 바뀌었다는 설명도 성립한다. 다만 이 Mac 에서는 재현하지 못했으므로 CI 로 확인한다.
- **orderBy 는 다른 단언의 뜻을 바꾸지 않는다.** AC-15b(`talk-lesson-turn.test.ts:371`)는 턴 번호 차례의 마지막 아이 행, 곧 이번 턴 행을 고른다. 아이 행의 턴 번호는 앞 선생님 차례 번호라 겹치지 않는다. 주석이 말하는 뜻과 같다. AC-15k(`339`)는 sentUserMessage 가 있는 첫 아이 행, 곧 첫째 본 턴 행을 고른다. seed 된 인사 행에는 그 칸이 없다. 이 행의 사용자 메시지가 둘째 본 턴 본문에 들어 있는지를 보는 것이 시험 제목('앞 턴 사용자 메시지')의 뜻이다. 차례가 없을 때는 둘째 본 턴 행을 고를 수도 있었다. 그 행의 메시지도 둘째 본문에 들어 있어 단언이 약하게 지났을 것이다. orderBy 는 그 단언을 본래 뜻으로 묶는다.

## 3 아직 열린 것(지난 보고들에서)

| 항목 | 상태 | 근거 |
|---|---|---|
| fix 1 재검토(고침 2) N-1: 다시 쓰기에 실패하고 남은 카드 기회도 대신 질문도 없으면 빈 차례 | 아직 열림 | settle 의 카드 자리 실패 길은 그대로다 |
| fix 1 재검토(고침 2) N-2: 잡아 두기 서버 배선 시험 | 아직 열림 | 통합 사례 없음 |
| 첫 검토 Minor 10: C204 에 셋 · 둘 낱말 기준 · 장면 낱말 규칙 한 줄 | 아직 열림 | 컨트롤러 몫 |
| 첫 검토 Minor 12: run.ts 주석 겹침 | NOT ADDRESSED | `src/server/ai/run.ts:274-284` |
| 첫 검토 Minor 13: 흘려 받기 갈래 글자 | NOT ADDRESSED | `src/core/conversation/stream.ts:154` |
| 고침 3 검토 P3-6: 관찰 도구의 관사 되풀이 기대 | 남김(impl-talk-13 몫) | — |
