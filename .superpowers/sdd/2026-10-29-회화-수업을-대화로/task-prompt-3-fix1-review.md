# 범위 한정 재검토: 회화 턴 프롬프트 · 흐름 규칙 고침 3 fix round 1(검토자 Opus · xhigh, 2026-11-06)

**라운드 판정: Approved.** A~E 는 모두 ADDRESSED 이고 Critical 은 없다. 서버 턴 길이 새로 읽는 설정 키가 없고, turnSettings · seed/settings.json · 시험용 설정도 바뀌지 않았다. 새 Minor 는 넷이다. 그 가운데 M-1(좁힌 선택지 거름이 4회차에 실제로 나온 되묻는 고르기 하나를 다시 통과시킴)은 한 줄 고침이라 요청자 시험 전에 고치기를 권한다.

읽는 법. 지난 보고는 `task-prompt-3-review.md` 이다. fix 1 변경만 떼어 보려고 지난 검토 때 떠 둔 사본(`prompt2-review/mut4/`)과 지금 워크트리를 견줬다(`prompt2-review/fix3-1-src.clean.diff` · `fix3-1-tests.clean.diff`). 변이와 탐침은 새 사본 `prompt2-review/mut5/` 에서 돌렸다. 모두 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/` 아래에 있다. 줄 번호는 워크트리 `.claude/worktrees/p13d` 의 지금 파일이다. 워크트리는 고치지 않았고 실호출도 하지 않았다. 사본에서 회화 단위 시험 여섯 파일 189건이 지났다.

## 1 항목별 판정

| 항목 | 판정 | 근거 |
|---|---|---|
| A N-2 (b) 정규화 | ADDRESSED | `talk-lesson.ts:1468-1471`: 앞 차례가 카드 기회이고 갈래가 follow_up · follow_child 인데 카드 항목이 필수 질문이면 카드 항목을 비운다(`1655`). 고정부 `781` 에 'card_item can never be a required question either' 를 더했다. 비우기를 빼는 변이에 시험 3건이 실패한다. 지난번의 '고침 없이도 지나던' 정규화 시험(`talk-prompt-fix3.test.ts` 159~)은 비운 값을 단언하게 바뀌었다. 곁효과는 M-3 |
| B N-10 되풀이 동사 | ADDRESSED(프롬프트) | `talk-lesson.ts:775` '…, using the verb of the question you just asked, not 'like' …'. 시험은 고정부 문장이다. 문구 빈틈은 M-2 |
| C 늦은 답 | ADDRESSED | `lesson-flow.ts:504` 이 그 필수 질문 뒤 노린 단어를 처음 담은 말이고 아이 차례가 폭(`489`) 안일 때만 참이다. 이미 답했으면(`541`) 거짓이다. 서버 손질은 순수 `lesson-turn.ts:1406` lessonCallTurnOf 로 뺐다. 서버는 `2028` 에서 이를 부르고, 판정 재료는 talk_turns 행(`1381` lateCardRowsOf)이다. 지금 아이 말은 `state.liveRows` 에 들지 않는다. 새 요청은 행을 넣기 전에 상태를 읽고, 다시 보낸 요청은 그 행을 orphan 으로 뗀다(`state.ts:156` splitOrphan). 그래서 '이미 답함'이 자기 자신에 걸리지 않는다. 관찰 도구(`scripts/talk-observe.ts:1712~`)도 같은 rows 꼴로 넘긴다 |
| D 장면 낱말 표 | ADDRESSED | `talk-lesson.ts:1435` 가 흐름 글 · 주제 글을 뺐고, `child-kind.ts:116-127` 이 진행 말을 장면 낱말에서 뺀다. 흐름 글을 되살리는 변이를 시험이 잡는다 |
| E 선택지 거름 좁힘 | ADDRESSED(거짓 양성) | `question-check.ts:341` · `375` 는 질문(`talk-lesson.ts:1355` 마지막 물음표 문장)에 아이 말에도 바뀌는 자리에도 없는 내용 낱말이 있으면 새 물음으로 본다. 'My mom is big.' → 'Is your dad big or small?', 'It is hot.' → 'Is the water hot or cold?' 는 이제 남는다. 다만 새 거짓 음성이 생겼다(M-1) |
| 설정 키(Critical 점검) | 문제 없음 | 고침 3 + fix 1 전체 diff 의 더한 줄에 설정을 읽는 곳(positiveInt · readSetting · `s["…"]` · 설정 키 글)이 없다. `src/server/conversation/turn.ts` · `seed/settings.json` · `tests/fixtures/settings.ts` 는 diff 에 없다. 폭 2 는 코드 상수다(T-163, 지적하지 않음) |

**구현자의 '변이 여섯에서 모두 실패' 주장은 맞다.** 사본에서 같은 여섯을 넣었더니 모두 시험이 잡았다(카드 항목 비우기 3건, 서버 손질의 늦은 답 1건, 이미 답함 2건, 폭 1건, 흐름 글 1건, 새 낱말 조건 1건). 남는 배선은 서버가 넘기는 행 인자 하나다. `lesson-turn.ts:2028` 을 `rows: []` 로 바꿔도 189건이 모두 지난다(M-4).

## 2 새 지적

| # | 심각도 | 무엇이 · 왜 | 어떻게 |
|---|---|---|---|
| M-1 | Minor(요청자 시험 전 권함) | **좁힌 거름이 4회차의 실제 되묻는 고르기를 다시 통과시킨다.** 사본 탐침 결과, word-answers 7('Big.' → 'Yes, the lake is big! Is the lake big or small?' 〈It is big.〉〈It is small.〉)이 지금은 되묻기가 아니라고 나온다. 'lake' 는 아이가 말하지 않았고 선생님이 바로 앞 되풀이에서 꺼낸 낱말인데, 이를 '새 내용 낱말'로 보기 때문이다. 'Cold.' → 'Is the juice cold or hot?' 도 같다. 4회차 N-1 네 자리 가운데 셋(word-answers 5 · preview-1 5 · 7)은 그대로 걸린다(근거: 설계 재판정 N-1 · 02-2:196) | 같은 tori_en 에서 질문 앞의 선생님 문장(반응 · 되풀이) 낱말도 '아는 낱말'에 넣는다. 그러면 word-answers 7 과 juice 꼴은 다시 걸리고, dad · water 꼴은 반응에 그 낱말이 없을 때 그대로 남는다. word-answers 7 꼴을 시험에 더한다 |
| M-2 | Minor | B 의 문구 'using the verb of the question you just asked, not 'like'' 는 질문 동사가 like 일 때 서로 부딪친다. 'What food do you like?' + 'Rice.' 에는 'You like rice!' 가 맞는데, 규칙이 'not like' 라 AI 가 'You eat rice!' 처럼 뜻을 바꿀 수 있다(02-2:198 '뜻을 바꾸지 않는다'). 첫 예('What do you do with the juice?' → 'You drink juice!')도 질문 동사(do)가 아니라 묻는 행동(drink)을 쓴다 | "using the action of the question you just asked; do not switch to 'like' when the question did not use it" 처럼 고친다 |
| M-3 | Minor(관찰) | A 는 컨트롤러 결정(T-161)대로 카드 항목을 비운다. 하지만 4회차 word-answers 4 처럼 AI 가 필수 질문 글을 그대로 물은 경우에도 그 항목을 다룬 것으로 세지 않는다. 그래서 같은 필수 질문이 뒤 카드 자리에서 같은 글로 한 번 더 나올 수 있다. talk.same_question_max(2) 안이라 정본(02-2:200)은 어기지 않지만, 요청자의 '두 번씩 말함'과 닿는다. 그 차례는 이어 묻기 뒤 셈에서도 진짜 이어 묻기로 센다(구현자도 밝힘) | 질문 글이 그 카드 항목 질문과 같으면(questionKeyOf) 항목을 남기는 조건을 더한다. 아니면 6회차 대본에서 같은 필수 질문이 두 번 나오는지 센다 |
| M-4 | Minor | 서버가 넘기는 판정 재료(`lesson-turn.ts:2028` lateCardRowsOf(state.liveRows))를 시험이 가르지 못한다. lateCardRowsOf 자체도 단위 시험이 없다 | lateCardRowsOf 에 talk_turns 꼴 행(tori · child)을 넣어 lessonCallTurnOf 까지 잇는 시험 하나를 둔다 |

## 3 지난 보고에서 아직 열린 것

| 항목 | 상태 | 근거 |
|---|---|---|
| fix 1 재검토 N-1: 다시 쓰기에 실패하고 남은 카드 기회도 대신 질문도 없으면 빈 차례 | 아직 열림 | `lesson-turn.ts` settle 은 카드 자리를 못 만들면 그대로 둔다 |
| fix 1 재검토 N-2: 잡아 두기 서버 배선 시험 | 아직 열림 | 통합 사례 없음 |
| 첫 검토 Minor 10: C204 에 셋 · 둘 낱말 기준 · 장면 낱말 규칙 한 줄 | 아직 열림 | `specs/10-결정-기록.md` C204 에 없다(컨트롤러 몫) |
| 첫 검토 Minor 12: run.ts 주석 겹침 | NOT ADDRESSED | `src/server/ai/run.ts:274-284` |
| 첫 검토 Minor 13: 흘려 받기 갈래 글자 | NOT ADDRESSED | `src/core/conversation/stream.ts:154` |
| 고침 3 검토 P3-6: 관찰 도구의 관사 되풀이 기대 | 남김(impl-talk-13 몫) | 구현 보고 '고치지 않고 남긴 것' |

## 4 넘길 것

1. 6회차 대본에서 M-1 꼴(선생님이 되풀이에서 꺼낸 낱말로 다시 묻는 고르기)과 M-3 꼴(같은 필수 질문 글 두 번)을 센다.
2. 폭 2 를 12절 키로 올리는 묶음(T-163)에서는 turnSettings · seed/settings.json · tests/fixtures/settings.ts 셋을 함께 바꾸고, turnSettings 키만으로 턴 길을 도는 시험을 함께 둔다(T-157 재발 막기).
