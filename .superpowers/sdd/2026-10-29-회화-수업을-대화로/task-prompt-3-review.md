# 범위 한정 검토: 회화 턴 프롬프트 · 흐름 규칙 고침 3(검토자 Opus · xhigh, 2026-11-06)

**라운드 판정: 수정 필요(Important 1).** N-2 (b)의 앱 되돌림은 판정만 하고 아무 값도 바꾸지 않으며, 프롬프트도 그 꼴을 새로 막지 않는다. 나머지 일곱 항목(N-1 · N-2 (a) · 두 낱말 · N-3 · N-5 · N-6 · N-8)과 AC-15k 는 ADDRESSED 다. 새 Minor 는 여섯이다.

읽는 법. 줄 번호는 워크트리 `.claude/worktrees/p13d` 의 지금 파일이다. '설계 재판정'은 `task-talk-quality-review-2.md`, '구현 보고'는 `task-talk-prompt-2-report.md` 의 '고침 3' 절이다. 변이와 탐침은 스크래치패드 `prompt2-review/mut4/` 사본에서 돌렸고(`/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/prompt2-review/`), 워크트리는 고치지 않았으며 실호출도 하지 않았다. 사본의 단위 전체 기준은 실패 16건인데, 모두 사본에 옮기지 않은 CI · 마이그레이션 · 환경 견본 파일 때문이다.

## 1 항목별 판정

| 항목 | 판정 | 근거 |
|---|---|---|
| N-1 되묻는 고르기 | ADDRESSED | 프롬프트 `talk-lesson.ts:784`(짧은 답 뒤엔 새 것을 묻고, 아이 말을 선택지에 넣지 않으며, 이미 답한 질문을 같은 글로 다시 묻지 않음). 앱 거름 `talk-lesson.ts:1381` → `question-check.ts:340` choicesEchoChild. 거름을 빼는 변이를 시험이 잡는다. '이미 답한 질문을 같은 글로'(word-answers 6)는 프롬프트에만 기댄다. 설계도 앱 쪽은 선택 사항으로 두었다 |
| N-2 (a) 늦은 카드 답 | ADDRESSED(신호) | `lesson-flow.ts:493` lateCardAnswerOf → `lesson-turn.ts:1972` 가 사용자 메시지의 'Previous turn was a card chance: yes'를 켠다. `planned` 는 talkCallTurnOf 결과라 이 칸이 실제로 메시지에 닿는다. 프롬프트 `talk-lesson.ts:785` 도 더했다. 다만 판정이 넓고(Minor P3-3) 서버 배선은 시험이 가르지 못한다(Minor P3-4) |
| N-2 (b) 카드 항목만 필수 | **NOT ADDRESSED** | Important P3-1 |
| 두 낱말 관련 말 | ADDRESSED | `child-kind.ts:109` · `156` touchesScene, `talk-lesson.ts:1426` talkSceneWordsOf. 정규화(`talk-lesson.ts:1478`)와 흘려 받기(`talk.ts`)가 같은 표를 쓴다. 장면 조건을 빼는 변이를 시험이 잡는다. 설계는 이 자리를 '대본에서 볼 것'으로만 두었는데 구현자가 앱 규칙을 더했다. 방향은 C204 와 맞으나 장면 낱말 표가 넓다(Minor P3-5) |
| N-3 다시 쓰기에서 노리는 단어 | ADDRESSED | `talk-lesson.ts:788` · `question-retry.ts` 다시 쓰기 메시지('ask about the thing or the person instead') |
| N-5 들리지 않음 첫 줄 | ADDRESSED | `talk-lesson.ts:799` 'Start with 'I couldn't hear you.'' |
| N-6 뜻 한 덩이 | ADDRESSED | `talk-lesson.ts:1407` 이 문장 수가 다르면 한국어 문장 끝으로 다시 나눠, 수가 맞으면 문장마다로 본다. 다시 나누기를 빼는 변이를 시험이 잡는다. 수가 같은데 어긋나게 나뉘는 경우는 드물다고 본다 |
| N-8 설명 · 되풀이 | ADDRESSED(설명) | `talk-lesson.ts:572` 'only about the word your question aims at'. 관사 되풀이 쪽은 고칠 것이 아니다(P3-6) |
| AC-15k(CI 여섯째) | ADDRESSED | 2절 (3) |

## 2 특히 봐 달라고 한 셋

1. **choicesEchoChild 의 정규화와 거짓 양성.** 아이 말은 tokenize 로 낱말을 뽑아 소문자와 원형(lemmaOf)을 함께 넣는다. 선택지는 plainWords(소문자 · 문장부호 뺌)로 나눈다. 두 선택지의 낱말 수가 같을 때 자리마다 견주고, 서로 다른 자리의 낱말(또는 그 원형)이 아이 말에 있으면 참이다. 사본 탐침으로 'COLD!' 와 "It's cold." / "It's hot.", 'My dog eats rice.' 와 'It eats rice.' / 'It eats fish.' 가 모두 참이었다. 대소문자 · 문장부호 · 어간은 맞게 다룬다. 낱말 수가 다른 짝은 보지 않지만, 선택지 검사가 낱말 하나만 다른 짝만 받으므로 실제로 빠지는 경우는 없다. **거짓 양성은 있다.** 'My mom is big.' 뒤의 'He is big.' / 'He is small.'(다른 사람), 'It is hot.' 뒤의 'The water is hot.' / 'The water is cold.'(다른 물건), 'I like fish and rice.' 뒤의 'I like fish more.' / 'I like rice more.'(무엇을 더 좋아하는지)를 모두 버린다. 프롬프트 784 가 권하는 '다른 물건 · 누구'를 묻는 고르기가 형용사를 그대로 쓰면 걸리는 셈이다. 버리는 것은 선택지 소리뿐이고 질문은 남으므로 3단계에서는 해가 작다. 1 · 2단계처럼 선택지가 주된 도움인 단계에서는 열린 질문만 남는다(Minor P3-2).
2. **lateCardAnswerOf 와 N-2 (b).** 판정은 '이 대화에서 가장 최근의 필수 질문 차례(move.item required)의 노린 단어(move.words)를 아이의 마지막 말이 낱말 또는 원형으로 담았는가'다. 언제 물었는지, 이미 답했는지는 보지 않는다. 사본 탐침에서 카드 질문 뒤 이어 묻기 두 턴이 더 지나도 아이가 같은 낱말('play')을 쓰면 다시 참이었다. 이 판정은 '늦은 답'이 아니라 '그 주제로 계속 말함'에도 켜지고, 그동안 AI 는 다음 카드 기회를 꺼낼 수 없다(Minor P3-3). 신호가 사용자 메시지에 닿으므로 (a)는 프롬프트를 거쳐 실제 효과가 있다. **(b)는 닫히지 않는다.** cardChainGuardOf(`talk-lesson.ts:1454`)는 chained 를 계산하지만, 갈래가 이미 follow_up 이고 카드 항목은 남기므로(fix 1 E) 정규화 값이 하나도 바뀌지 않는다. chained 를 읽는 곳도 없다. 그래서 word-answers 4 꼴(follow_up 이름표 + 필수 3 질문 글)은 지금도 그대로 나간다. 그 꼴을 막는 것은 고침 전부터 있던 프롬프트 781('Bring up the next card chance only in a later turn')뿐이고, AI 는 그 줄을 어긴 채로 4회차에 그 꼴을 냈다. 곧 (b)는 프롬프트에만 기대며, 그 프롬프트도 이번에 바뀌지 않았다.
3. **AC-15k.** 견본이 아니라 단언을 고쳤고, 그 선택이 맞다. 이 시험은 '둘째 턴 본문이 붙인 카드 질문을 포함한 앞 선생님 차례를 그대로 둔다'를 보므로, 첫 턴이 질문 검사에 걸려 카드 질문이 붙어야 한다. 범위 밖 질문(zebrafish aquariums)은 그 장치이고, C203 (3) 뒤에는 그 걸림이 다시 쓰기 요청 하나를 부르는 것이 맞는 행동이다. 견본을 범위 안 질문으로 바꾸면 시험이 보려던 '붙인 카드 질문'이 사라진다. 고친 단언(`tests/integration/talk-lesson-turn.test.ts` 323~)은 본문 셋 = 본 턴 둘 + 다시 쓰기 하나를 못 박고 다시 쓰기 본문을 빼고 대조하므로 뜻이 그대로다. 다시 쓰기 본문을 'App check: your question' 글로 가리는 것은 메시지 문구에 묶이지만, 문구가 바뀌면 조용히 지나지 않고 실패하므로 받아들일 만하다.

## 3 새 지적

| # | 심각도 | 무엇이 · 왜 | 어떻게 |
|---|---|---|---|
| P3-1 | **Important** | **N-2 (b)가 효과 없이 닫힌 것처럼 보인다.** `talk-lesson.ts:1454` chained 는 쓰는 곳이 없고 정규화 값이 바뀌지 않는다(구현자 우려 1). 정규화 시험(`talk-prompt-fix3.test.ts:141-155`)은 AI 가 이미 적은 follow_up · required 를 그대로 단언하므로 고침이 없어도 지난다. 설계 재판정의 '조건부 통과' 두 조건 가운데 하나(N-2)의 한 갈래가 그대로다(근거: 설계 재판정 N-2 (b) · 02-2:184 · 192 · C204 (6)) | 둘 가운데 하나를 컨트롤러가 고른다. (가) 값싼 길: 프롬프트 781 에 'In this turn card_item can never be a required question either.' 를 더하고, 정규화 시험이 아니라 프롬프트 문장을 시험한다. (나) 앱 길: 1~3단계는 질문을 잡아 두므로, chained 인 턴을 C203 다시 쓰기 길로 '아이 답에 이어 묻기'를 한 번 쓰게 한다(D8 (나), 그 턴마다 호출 하나 더). 어느 쪽이든 chained 를 쓰지 않을 거라면 계산과 시험을 빼서, 막는 것처럼 보이지 않게 한다 |
| P3-2 | Minor | 선택지 거름의 거짓 양성(2절 (1)). 다른 사람 · 다른 물건을 묻는 고르기도 아이 말의 형용사가 선택지에 들면 버린다. 1 · 2단계에서는 선택지가 주된 도움이다 | 3단계에만 거르거나, 질문 문장이 아이 말의 명사 · 주어를 그대로 묻는 때만 거른다. 아니면 3회차 대본에서 버린 횟수를 세어 정한다 |
| P3-3 | Minor | 늦은 카드 답 판정이 넓다(2절 (2)). 가장 최근 필수 질문 뒤 아이가 그 낱말을 다시 쓸 때마다 켜져, 아이가 그 주제로 말하는 동안 다음 카드 기회가 막힌다(구현자 우려 3) | 그 필수 질문 차례 뒤 아이 말 가운데 노린 단어를 처음 담은 말에만 켠다. 이미 답한 질문에는 켜지 않는다 |
| P3-4 | Minor | 늦은 답의 서버 배선(`lesson-turn.ts:1972`)을 꺼도(`false &&`) 단위 시험 결과가 기준과 같다. 판정 함수만 시험한다 | 통합 사례 하나: 늦은 답 턴의 요청 본문에 'Previous turn was a card chance: yes' 가 드는지 본다 |
| P3-5 | Minor | 장면 낱말 표가 카드 흐름 글(`talk-lesson.ts:1439` card.flow — AI 에게 주는 진행 설명)까지 담는다. 카드 3-1 의 표는 53낱말이고 teacher · child · question · asks · talks · me · one · now · time · more · can 처럼 장면과 관계없는 낱말이 섞인다. 그래서 그런 낱말이 든 두 낱말 말은 갈래와 관계없이 막힘이 아니게 된다 | 흐름 글을 빼고, 필수 · 더 이야기할 거리 · 오늘 쓸 말 · 단원 단어로만 만든다 |
| P3-6 | Minor | N-8 의 관사 갈래('I drink juice.' 에 되풀이 없음)는 고칠 것이 아니다. 'I drink juice.' 는 바른 문장이고, 고정부는 바른 문장의 말을 바꾸지 말라고 한다(773). 고친 것이 없는 것이 맞다 | 관찰 도구의 AC-15o (가) 기대(recastWord juice)를 바른 문장에는 되풀이를 기대하지 않게 고친다(impl-talk-13 몫) |

## 4 지난 보고에서 아직 열린 것

| 항목 | 상태 | 근거 |
|---|---|---|
| fix 1 재검토 N-1: 다시 쓰기에 실패하고 남은 카드 기회도 대신 질문도 없으면 빈 차례 | 아직 열림 | `lesson-turn.ts` settle 은 카드 자리를 못 만들면 그대로 둔다. 안전한 대사로 메우는 고침이 없다 |
| fix 1 재검토 N-2: 잡아 두기 서버 배선 시험 | 아직 열림 | 통합 사례 없음(P3-4 와 같은 꼴) |
| 첫 검토 Minor 4 · 7 | 남김(합의) | 3회차 이후 도구로 센다 |
| 첫 검토 Minor 10: C204 에 셋 · 둘 낱말 기준과 맞바꿈 한 줄 | 아직 열림 | `specs/10-결정-기록.md` C204 에 없다(컨트롤러 몫). 이번 두 낱말 장면 규칙도 같은 줄에 적을 거리다 |
| 첫 검토 Minor 12: run.ts 주석 겹침 | NOT ADDRESSED | `src/server/ai/run.ts:274-284` |
| 첫 검토 Minor 13: 흘려 받기 갈래 글자 | NOT ADDRESSED | `src/core/conversation/stream.ts:154` |

## 5 변이(사본, 단위 전체)

| 변이 | 결과 |
|---|---|
| 선택지 거름 뺌 · 장면 조건 뺌 · 뜻 다시 나누기 뺌 | 잡음 |
| 되돌림이 카드 항목을 보지 않음 | 잡음(되돌림 함수 시험 하나 — chained 값만 단언) |
| 늦은 답 서버 배선 끔 | **생존** |

## 6 넘길 것

1. 5회차 대본에서 선택지를 버린 횟수와 버린 질문(P3-2), 늦은 답 신호가 켜진 턴과 그 턴의 다음 질문(P3-3), word-answers 4 꼴(follow_up 이름표 + 필수 질문 글)의 재발(P3-1)을 센다.
2. 두 낱말 장면 규칙은 설계 재판정이 '대본에서 볼 것'으로 둔 자리에 앱 규칙을 더한 것이다. 설계 검토자가 5회차에서 'Big fish.' · 'Cold juice.' 와 장면 밖 두 낱말을 함께 보아 받아들일지 정한다.
