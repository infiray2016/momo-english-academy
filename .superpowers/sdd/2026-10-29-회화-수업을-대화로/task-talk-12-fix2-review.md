# 범위 한정 재검토(라운드 3/3): 회화 plan 묶음 12 fix 2(code-reviewer · Opus · xhigh, 2026-11-05 19:3x)

판정: **컨트롤러 판단 필요**(fix 라운드 3회를 다 씀). N-1 의 어휘 까닭과 N-2 다섯 자리는 모두 닫혔다. 그러나 N-1 이 고치려던 470 · 499 자리의 말풍선 단언은 다른 까닭으로 여전히 CI 에서 걸린다(F-1, Important). 같은 결함이 손대지 않은 357줄에도 있다. 고칠 것은 단언 넷이고 줄마다 한 줄 바꾸면 된다.

본 것: 패치 `scratchpad/diff-12-fix2-spec.patch`, fix 2 보고 `task-talk-12-fix2.md`, 구현자 재현 `scratchpad/fix2/probe.ts` · `probe-out.txt`. src · seed 는 묶음 12 뒤 사본과 `diff -rq` 차이 없음을 확인했다. fix 1 뒤 바뀐 시험 파일은 `tests/e2e/talk-lesson.spec.ts` 하나다(수정 시각 19:15, 나머지 fix 1 파일은 18:37~18:47). 관문 biome 575 · tsc 빈 출력 · 단위 1781 통과 6 todo 는 보고와 같다. e2e 는 돌리지 않았고 화면 · 서버 · Playwright 코드로 대조했다.

## 1. N-1 · N-2 자리별 판정(줄은 지금 파일)

| 자리 | 판정 | 근거 |
|---|---|---|
| N-2 390 · 397(시험 377, AC-15q · p · l) | ADDRESSED | model_line 을 빼고 `[data-sound-listen="answer"]`(`:401`)와 카드 답 예시로 단언한다. 첫 막힘 카드 자리의 답은 slotOf 가 카드 항목 답 예시를 먼저 쓴다(`lesson-flow.ts:179~184`). kind answer 소리 줄도 읽기 차례에 들어(`tori.tsx:412~415`) `spoken` 단언이 맞다. 1~3단계 소리 줄은 말풍선 글 · 기록 글에 없다(`lessonShownEnglishOf` `tori.tsx:374~380` 는 s · add 만, `log.ts:153~161` 도 같음) |
| N-1 470(시험 459, AC-15f 이어 하기) | 어휘 까닭은 ADDRESSED, 단언은 **NOT ADDRESSED**(F-1) | 'What do you like?' 는 시험 어휘 안이다(구현자 재현 ok, 낱말 넷 모두 1~3단계 어휘). 그러나 `:485 · :492` 의 `toContainText("Wow, me too! What do you like?")` 는 F-1 의 까닭으로 맞지 않는다 |
| N-1 499(시험 488, AC-N8 · N10) | 어휘 까닭은 ADDRESSED, 단언은 **NOT ADDRESSED**(F-1) | 'Do you like it?' 은 범위 안이다. `:518` 이 F-1 로 맞지 않는다. `:523` 의 `reply.startsWith(t)` 는 첫 문장 'Oh, nice!' 로 찾으므로 괜찮다 |
| N-2 648 · 671(시험 662, AC-15q 선택지 ①②) | ADDRESSED · 뜻 그대로 | 말로 답한 차례는 AI 질문 차례(`lesson-flow.ts:881~907`, 참고 턴 15 · 따라가기 상한 2 전)다. 선택지 'I like pababa.' · 'I like it.' 은 범위 · 같은 꼴 · 노리는 단어(card_item 필수 1, `talk-lesson.ts:1233~1244`)를 지난다. 겹침 빼기는 질문 'Do you like it?' 이 'I like it.' 을 담지 않아 질문을 남긴다. 같은 질문 검사는 이 대화에서 물은 질문 · 막힌 질문만 견주고(`question-check.ts:95~110`, `lesson-turn.ts:978~990`, 상한 2), 카드 쉬운 질문 'Do you like it?' 은 아직 묻지 않았으니 부딪치지 않는다. 뒤 단언(①② 둘 · 선생님 쪽 글에 답 없음 · Or 없음 · ① 다시 읽기)은 그대로 이 차림에서 성립한다(2~3단계는 선택지를 따로 읽음 `tori.tsx:416~418`) |
| N-1 · N-2 730(시험 691, 회색 '못 들었어요') | ADDRESSED | 앞 응답의 card_item 필수 1 이 선생님 행 move.item 이 되어 slotOf 의 답 예시가 카드 답 예시가 된다. 그 자리의 '잘 모르겠어요'는 첫 막힘 → 같이 말하기 카드 자리 → kind answer 소리 줄이다(`lesson-flow.ts:819~826`, `lesson-turn.ts:1179~1180`). 앞 단언 'Nice!' 는 한 문장이라 F-1 에 걸리지 않는다 |
| N-1 806(시험 791, N3 듣는 동안 단추 끔) | ADDRESSED · 뜻 그대로 | 선택지 · 질문이 범위 안이고 card_item 으로 노리는 단어가 있어 `[data-answer-listen="2"]` 가 나온다. card_item 이 생겨 다음 차례 힌트 단도 카드 항목에서 온다(힌트 단 열기 길 T-83: move.item 의 카드 항목). 그래서 힌트 마지막 단까지 여는 반복(`:837~838`)이 설 곳이 생겼다. 듣는 동안 넷 꺼짐 → 끝나면 켜짐 단언은 바뀌지 않았다 |

648 의 뜻을 바꾸지 않았는지: 이 시험의 뜻은 'AC-15q 2~3단계 선택지 단추 · 읽기'이고, 막힘이었던 것은 차림일 뿐이다. 듣는 동안 단추 끔(N3)은 806 시험(791)의 뜻이며 위처럼 그대로다.

## 2. 새 지적

| 번호 | 심각도 | 자리 | 근거 | 고칠 방향 |
|---|---|---|---|---|
| F-1 | Important | `tests/e2e/talk-lesson.spec.ts:357 · :485 · :492 · :518` | 이 넷은 두 문장 응답('Okay! Let's talk more.' · 'Wow, me too! What do you like?' · 'Oh, nice! Do you like it?') 전문을 `bubble(...).toContainText(reply)` 로 본다. 새 말풍선은 문장마다 블록 span 을 따로 그린다(`tori.tsx:648~656`, `lessonShownEnglishOf :374~380`). 각 span 안에는 '흘러나온 글(aria-hidden)'과 '화면 읽기용 전문(sr-only)'이 이어 있다(TypedText `tori.tsx:150~178`). 설치된 Playwright 1.64.1 의 `toContainText` 는 `elementText(...).full`(`playwright-core/lib/coreBundle.js`)로 자식 글을 띄어쓰기 없이 잇고, script · style 만 건너뛴다(shouldSkipForTextMatching). 그래서 받은 글은 'Wow, me too!Wow, me too!What do you like?What do you like?' 꼴이라 'Wow, me too! What do you like?' 를 담지 않는다. 옛 회화 e2e 는 말풍선 전문 단언에 한 문장 응답만 썼다(옛 conversation.spec 518줄 'Welcome back, friend.'). 357줄은 묶음 11 이 쓴 것이고 이번 범위 밖이지만 같은 결함이다 | 문장마다 본다: `await expect(bubble(o.page).locator("[data-tori-line]")).toContainText(["Wow, me too!", "What do you like?"])`(배열꼴은 줄 요소를 차례로 하나씩 견준다). 또는 문장 하나씩 `toContainText`. 357 · 492 도 같은 꼴로 바꾼다 |

## 3. 범위 밖 관찰

- `required-utterance.spec.ts`(fix 1)의 AC-23f 는 `measuredTurn` 에 첫 문장(`replies[1]` 'Wow, that is nice!')만 넘겨 F-1 에 걸리지 않는다. 같은 파일 다른 말풍선 단언(147 · 163 · 195 · 321 · 621 · 634 · 734 · 880)과 teacher-window 392 는 한 문장이다.
- `:426` AC-15g(첫 막힘 설명 칸)는 여전히 판정 보류다(CI 첫 실행에서 본다).
- 이번 결함은 정적 대조로 처음 잡힌 것이다. 이 Mac 에서 e2e 가 돌지 않으니, 묶음 14 전에 e2e 를 한 번 CI 에서 돌려 보면(라벨 'e2e' 또는 workflow_dispatch) 이런 화면 글 맞춤 차이를 한 번에 볼 수 있다. 커밋 · push 는 요청자 지시 때만이다(C200).

## 4. 라운드 판정

컨트롤러 판단 필요. 남은 지적은 F-1 하나(Important, 단언 넷)다. 나머지 N-1 · N-2 자리(390 · 397 · 648 · 671 · 730 · 806)와 묶음 12 의 이전 지적은 모두 닫혔다. F-1 은 시험 줄만 바꾸는 일이고 src 영향이 없다. 그래서 컨트롤러가 직접 고치고 이 네 줄만 확인하는 길과, 요청자에게 가져가는 길 가운데 컨트롤러가 고른다.
