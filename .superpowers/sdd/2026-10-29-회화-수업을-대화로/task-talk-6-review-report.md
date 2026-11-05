# 검토 보고: 회화 plan 묶음 6(회화 턴 호출 새 꼴)

검토자: rev-talk-6(Opus · xhigh, 읽기 전용) · 2026-10-30 09:3x · 작업 트리 `.claude/worktrees/p13d`
범위: `src/core/ai/calls/talk-lesson.ts` · `tests/unit/talk-lesson-call.test.ts` · `tests/fixtures/ai/talk-lesson-inputs.ts` · `tests/fixtures/ai/samples/talk_turn.v2-*.json` 12개 · `tests/contract/ai-schemas.test.ts` 의 더한 갈래(git diff 112줄)
견준 것: plan(C192) 묶음 6 행 · 이름 절 응답 칸 표(plan.md:67-87) · 사용자 메시지 문단(:105) · 정한 것 5 · 11 · 19(:46 · :52 · :60) · 끝 보정 둘(:345 · :347), spec 4판 설계 2 · 3 · 5, 정본 05(6.1 · 6.2) · 02-2(:190 · :192 · :200 · :202 · :204 · :257-261 · :269) · 11(AC-15b · 15c · 15d · 15k · 19d) · 10(C194), 묶음 5 검토 5절과 지금 작업 트리의 묶음 5 모듈(fix 1 진행 중이라 줄 번호 대신 함수 이름으로 적는다).
확인 방법: diff 와 파일을 읽었고, 시험은 다시 돌리지 않았다. 의심 넷은 스크래치패드의 작은 tsx 스크립트로 이 모듈 함수를 직접 불러 확인했다(작업 트리에 쓰지 않음).

## 판정: Changes requested (Critical 0 · Important 3 · Minor 4)

응답 칸 · 고정부의 숫자 · 사용자 메시지 줄 · 앱 확인 · 출력 검사는 정본과 맞고 시험도 단단하다. 다만 묶음 5 의 차례 계획(TeacherTurnPlan)이 호출로 넘어오는 자리 둘이 비어 있고(막혔다고 볼 때의 계획, 질문을 쓰지 않는 AI 차례), 1~3단계 받침 표본 셋이 C194 (1) · 02-2:259-261 의 1~3단계 길이 아닌 AI 차례 길을 기대값으로 굳힌다. 셋 모두 묶음 8 이 이 호출 위에 서버 길을 짓기 전에 고쳐야 한다.

## 1. 설계 준수

| 항목 | 판정 | 근거 |
|---|---|---|
| 응답 칸 29개 Zod 꼴(6.2 출력 칸 표 · plan 이름 절 1~25번) | ✅ | talk-lesson.ts:317-446. 칸 이름 · 차례가 plan 표와 같고(stuck → tori_en → model_line → choices, 끝맺음 넷이 맨 뒤), 모두 required · null 없음, 없앤 칸 셋(card_question_no · next_question_en · next_question_ko)이 없다. 열거는 TALK_NEXT_MOVES 9 · TALK_SUPPORTS 5 · TALK_CARD_ITEM_KINDS 3 으로 plan 79 · 80 · 82줄과 같다. 두 목적이 같은 규격 · 같은 제목(:1277-1311, 05:56 '같은 스키마') |
| 스키마 글에 선생님 이름 없음(AC-19d · C130) | ✅ | describe 글이 'Your' 꼴이고 시험이 미나 · 리오 JSON 스키마가 같음을 본다(test:136-140) |
| 고정부: 선생님 블록 · 6.1 '회화 턴 고정부 규칙' 표 열다섯 행 | ✅ 대부분 · ❌ 둘 | 블록 글이 05:31 과 글자까지 같다(:513-515). 표의 으뜸 원칙 · 네 낱말 반응 · 질문 하나와 문장 상한 · 넓혀 되풀이 · 칭찬 · 이어 묻기 · 따라가기 · 기회 알림 · 꺼내기 · 막힌 뒤 · 카드 자리 · 마무리 제안 · 1~3단계 소리 줄 · 범위 밖 꼴 · 역할 바꾸기(5~7) · 아이가 보인 능력이 모두 있다(:518-584). ❌ 1~3단계 받침 줄이 카드(앱) 몫이라는 점이 없다(I-3), ❌ 같이 말하기 차례에 새 질문을 쓰지 않는다는 점을 전할 길이 없다(I-2) |
| 가변부(새 꼴 카드 · 이월 목표 · 지난 요약, 턴 값 없음) | ✅ | :594-647. 시험이 턴 값을 바꿔도 시스템 프롬프트가 같음을 직접 비교한다(test:220-233) |
| 사용자 메시지(6.1 늘 넣는 값 · 바뀐 값만) | ✅ 줄 · ❌ 막힘 말 | 05:56 의 늘 넣는 값이 모두 있고 옛 줄 넷이 없다(:676-730, test:238-277 이 줄 전체를 고정). ❌ '차례의 까닭: 막힘 말'과 그때의 받침 단계를 부르기 전에 채울 수 없다(I-1) |
| 다시 쓸 선생님 차례(05:56 · AC-15k) | ✅ | :763-782. tori_en 한 줄 → 소리 줄 → 앱이 붙인 줄 차례, tori_ko 없음(test:348-372) |
| 앱 확인(05:60 '새 칸은 앱이 확인한다') | ✅ · 구석 하나 | 목표 ID 범위 · 카드 항목 · 꺼낸 새 단어 · 따라 할 말 범위와 대체 · 선택지 꼴 · '모름' 턴 미션(:975-1100). 대체 글이 꺼낸 새 단어 확인을 스스로 채우는 구석은 M-1 |
| 정한 것 11(갈래 '마무리'는 '다 다룸: 예' 턴만) | ✅ | 고정부 :536 · 정규화 :1021 · 엄격 검사 :1131 · 표본 쌍(closing-early 걸림 · closing-suggest 지남)이 같은 조건이다 |
| 정한 것 19(1~3단계 물음표 문장 잡아 두기)의 호출 몫 | ✅ · ⚠️ | holdsQuestionSentence(:308-313)와 '질문은 tori_en 끝에'(:563). 잡아 두기와 검사 자체는 묶음 8 몫이라 diff 로 확인하지 못한다. 묶음 5 fix 1 의 '그 차례의 질문만'(마지막 물음표 문장 · 붙인 카드 질문)과 어긋나지 않는다. 02-2:202 가 1~3단계 tori_en 의 물음표 문장 전부를 검사 대상으로 두므로 잡아 두기를 모든 물음표 문장에 거는 것도 맞다. 글 충돌 하나는 M-2 |
| 카드 자리 · 마무리 자리 · 평가 대화 턴의 다음 질문 칸 비우기 | ✅ · ❌ 빠진 턴 | 02-2:190 · 05:75 '반응만'과 맞다(:1027-1028 · :1085-1091). ❌ 인사 끝 · 바닥선 · 같이 말하기 턴은 비우지 않는다(I-2) |
| '모름' 턴 칸 비우기 | ✅ | 미션 완료 제안(05:60) · 되풀이(0c664c3) · 알맞은 응답 · 꺼낸 이야기 · 물음 · 아이가 보인 능력 · 스스로 쓴 단어. '앞 아이 말'이 없는 턴이라 정본 칸 뜻과 맞다(:1059-1084, test:462-486) |
| 출력 검사 칸 · 걸린 칸 바꾸기(6.4) | ✅ | model_line · choices 포함(:1166-1199). 힌트 묶음이 걸리면 비우되 card_item 을 남겨 05:99 '출력이 가리킨 카드 항목의 힌트' 길을 연다(:1253-1260, test:670-671). 회화 턴은 fatal false(:1300-1304) |
| 숫자는 설정값(C44) | ✅ · ⚠️ | 키 7 + 구간 키 4 를 talkLessonRulesOf 한 곳이 읽고 없으면 던진다(:235-290, test:162-187). reask 키는 읽지 않는다. 고정부 글의 '네 낱말' · '1~4단계 첫 막힘 · 5단계 둘째 막힘'(:523 · :533)은 정본 05:38 · 02-2:263 의 글이고 12절 키가 없어 옛 꼴과 같은 방식이다 |
| AI 는 서버만 · 키 · Zod · 녹음 없음 | ✅ · ⚠️ | SDK · 환경 변수 · 시각 · DB 가 없는 순수 모듈이고, 엄격 규격 + 느슨한 규격 + 정규화를 거친다. 서버에서만 부르는지는 묶음 8 의 연결에서 본다 |
| C194 (3) AC-19d 끝 문장 | ✅ | 시험이 옛 문장('1~3단계 tori_en 질문 0')을 쓰지 않는다 |
| C194 (1) 1~3단계 닫기 · 들리지 않음은 카드 자리 | ❌ | 표본 · 고정부가 AI 차례 길을 둔다(I-3) |

## 2. 잘한 점

- 응답 칸 29개가 plan 표와 차례까지 같고, 시험이 JSON 스키마 키 차례(앞 넷 · 끝 다섯)와 없앤 칸 · 판정 칸 없음 · 두 목적 같은 규격을 한 번에 고정한다(test:90-134). 계약 시험도 표본 본문의 칸 차례를 따로 본다(ai-schemas.test.ts 새 describe 셋째).
- 고정부에 넣는 수를 설정에서만 읽고, 시험이 값을 바꾸면 글이 바뀌는 것과 키를 빼면 CallSettingError 가 나는 것을 함께 본다(test:162-187). 구간 키(talk.teacher_sentences_max.4-6)도 따로 확인한다.
- 사용자 메시지 시험이 toContain 이 아니라 줄 목록 전체를 toEqual 로 고정해, 줄 차례 · 이름표 · 옛 줄 없음을 함께 지킨다(test:238-277). 캐시 규칙은 턴 값 다섯을 바꾼 입력의 시스템 프롬프트를 글자 비교로 본다(test:220-233).
- 앱 확인 시험 대부분이 막는 쪽과 통과하는 쪽을 함께 둔다. 목표 ID(카드 · 이월은 남고 다른 단원 · 겹침은 빠짐), 카드 항목(more 2 는 남고 more 3 · required 9 는 빠짐), 선택지(같은 꼴은 남고 꼴 다름 · 노리는 단어 없음 · 하나는 빠짐), '모름' 턴과 말 입력 턴의 미션이 그렇다. 기대값을 구현에서 베낀 곳은 M-4 하나뿐이다.
- 호출 입력의 기회 알림 꼴(TalkCallChances)이 묶음 5 의 TalkChances(`src/core/conversation/chances.ts` 23-44줄)의 부분 꼴이라 서버가 바꾸지 않고 넘길 수 있다.
- 표본 열둘이 막는 쪽(closing-early · l4-ai · l5-closing · card-slot 의 잘못 채운 칸 · model-offband)과 지나는 쪽을 함께 갖고, 정규화 기대를 표본 안에 적어 계약 시험이 그대로 읽는다.
- '모름' 턴 칸 비우기를 0c664c3 의 되풀이 비움과 같은 결로 넓힌 것과, 걸린 힌트 묶음에서 card_item 을 남긴 것은 정본 문장을 정확히 읽은 결과다.

## 3. 지적

### Important

**I-1. 말 입력 턴을 막혔다고 볼 때의 계획(ifStuck)이 사용자 메시지와 정규화에 없다.**
- 무엇: TalkCallTurn 은 계획 하나만 받는다(talk-lesson.ts:141-178). 말 입력 턴의 막힘은 이 응답의 첫 칸(stuck)이 정하므로, 서버는 부르기 전에 `reason: "stuck"`(:150) 과 그때의 `supportStage`(:155) · `stuckQuestion` · `kind` 를 채울 수 없다. 고정부는 'When Input is speech and you set stuck to true, give the help of the next stage.'(:532) 한 줄로 대신하지만, '다음 단계'를 셀 재료가 없다. 정규화도 `turn.kind` 하나로 칸을 고른다(:987 · :1000 · :1085).
- 왜: (1) 같은 질문 자리의 둘째 막힘이 말('What?')로 오면 정본은 쉬운 질문(02-2:260 둘째)이다. 답함 계획의 메시지에는 'Support stage: 0' · 'Reason: -' · 'Stuck question: -'가 들어가므로, 선생님은 0 의 다음인 같이 말하기(첫째)를 되풀이하고 막힌 질문 글도 받지 못한다. (2) 1~3단계에서 막힘 계획은 카드 답 소리를 붙이는 카드 자리인데(묶음 5 stuckPlan, 02-2:259 1~3단계 줄), 메시지가 'Turn: ai'라 선생님이 따라 할 말 · 다음 질문 칸을 채우고, 정규화는 AI 차례로 보고 그 칸을 남긴다. 서버가 막힘 계획을 고르면 AI 따라 할 말과 카드 답 소리가 겹친다. 정본 05:56 은 사용자 메시지에 '받침 단계와 차례의 까닭(단추 · 막힘 말 · 들리지 않음) · 막힌 질문 글'을 늘 넣으라 하고, 05:99 는 stuck 을 tori_en 앞에 두어 서버가 흘려 받는 처음에 계획을 바꾸게 한다. 묶음 5 는 이 몫을 `teacherTurnPlansOf`(ifAnswered · ifStuck)로 냈고, 묶음 5 검토 5절 (나)가 묶음 6 이 할 일 넷을 적었다.
- 어떻게: (1) TalkCallTurn 에 `ifStuck`(Turn · Card line · Support stage · Stuck question · 질문을 쓰는지, I-2 의 칸)을 더하고, 말 입력 턴이면 사용자 메시지에 'If stuck, Turn: … / If stuck, Support stage: … / If stuck, Stuck question: …' 꼴의 줄을 늘 넣는다(턴마다 바뀌는 값이라 사용자 메시지 자리가 맞다). (2) 고정부: 'Decide stuck first. If you set stuck to true, follow the If stuck lines instead.' (3) 정규화: `turn.input === "speech" && a.stuck` 이면 ifStuck 의 kind · 질문 여부로 칸을 고른다. (4) 계약 표본: 같은 말 입력에 stuck 참 · 거짓 둘(3단계 · 4단계 하나씩). 계획 → 호출 입력 대응을 순수 함수(예: `talkCallTurnOf(plans)`)로 두고 단위 시험하면 묶음 8 이 대응을 새로 짓지 않는다.

**I-2. 질문을 쓰지 않는 AI 차례를 호출이 구분하지 못하고, 그 턴의 다음 질문 칸을 남긴다.**
- 무엇: 묶음 5 의 TeacherTurnPlan 은 `aiAsks`(lesson-flow.ts 439줄)로 'AI 차례이지만 질문을 쓰지 않음'을 가른다. 4단계부터 같이 말하기(stuckPlan 의 받침 첫째), 1~3단계에서 답이 없는 같이 말하기, 인사 끝(greetingEndPlan), 인사 토막의 받침 첫째가 그렇다. 호출 입력에는 이 칸이 없다. 고정부의 받침 첫째 줄(:532)은 'say it together … and then one answer'만 쓰고 새 질문을 쓰지 말라고 하지 않으며, tori_en 설명 글은 모든 턴에 'then one next question'(:330), 공통 규칙은 'Ask only one question in a turn'(:524)이다. 정규화는 `turn.kind === "ai"` 이면 갈래 · 카드 항목 · 노린 목표 · 노리는 단어 · 힌트를 남긴다(:987 · :1027-1047 · :1085-1091).
- 확인: 인사 끝 턴(`segment: "greeting_end"`)에 갈래 required · 카드 항목 required 2 를 준 응답을 정규화하면 그 칸이 그대로 남는다(스크래치패드 probe: `greeting_end: required {"kind":"required","no":2} [talk-3-1-1] [soccer] [___ is fun., Soccer is fun.]`). 바닥선 턴(`floor: true`)도 같다.
- 왜: (1) 정본 02-2:259 받침 첫째는 '답 하나를 들려주고 아이가 따라 한다'이다. 4단계부터는 문장을 잡아 두지 않고 흘려 보내므로(정한 것 19), 선생님이 이 턴에 새 질문을 쓰면 서버가 지울 틈 없이 아이 앞에 나온다. 아이는 따라 할지 답할지 알 수 없다. (2) 인사 끝 행은 대화 토막의 선생님 행으로 셈에 들고(chances.ts talkTeacherRows · 117-122줄 `covered.add(m.item.no)`), 묶음 5 teacherMoveOf 는 AI 차례면 응답의 카드 항목 · 노린 단어를 move 에 옮긴다. 그래서 인사 끝에서 AI 가 적은 카드 항목은 묻지 않았는데도 다룬 기회로 세어, 그 필수 질문이 기회 알림과 카드 자리 후보에서 빠진다(02-2:192 '다루지 않은 필수 질문'). 다음 아이 차례의 힌트도 묻지 않은 질문의 것이 된다.
- 어떻게: TalkCallTurn 에 `aiAsks`(또는 'Turn: ai_no_question' 같은 값)를 더해 사용자 메시지 'Question: no' 줄과 고정부 'When Question: no, do not ask any question; the child says it together (or the app moves on) next.'로 잇는다. 정규화는 질문 없는 턴(aiAsks 거짓 · 인사 끝 · 바닥선)에서 카드 자리처럼 다음 질문 칸(갈래 · 카드 항목 · 노린 목표 · 힌트 묶음)을 비운다. 시험은 4단계 받침 첫째 · 인사 끝 · 바닥선 셋에서 칸이 비는 것과, 고정부 · 메시지에 그 줄이 드는 것을 본다.

**I-3. 1~3단계 받침 · 들리지 않음 표본 셋과 고정부가 정본 1~3단계 줄(앱이 카드 답 소리 → 카드 질문)이 아닌 AI 차례 길을 굳힌다.**
- 무엇:
  - `talk_turn.v2-l3-nospeech`: 입력이 AI 차례이고(talk-lesson-inputs.ts:373-377), 응답 tori_en 이 'I couldn't hear you. That's okay! What day is it today?', model_line 이 'I play.'이며, 정규화 기대가 model_line 'I play.'이다. 아이는 새 질문을 들은 뒤 앞 질문의 답 소리를 듣는다.
  - `talk_turn.v2-l3-support-together`: 막힌 질문이 답 예시가 있는 카드 필수 1 인데(:349-356) AI 차례로 두고 AI model_line 'I play.'를 기대한다.
  - `talk_turn.v2-l3-support-easy`: 막힌 질문에 카드 쉬운 질문('Do you like it?', :92)이 있는데 AI 차례로 두고 AI 질문 'What do you like?'와 AI 선택지 둘을 기대한다.
  - 고정부의 받침 줄 · 들리지 않음 줄(:532 · :534)은 모든 단계에서 선생님이 답을 말하고 쉬운 질문을 쓰게 한다. 1~3단계에서 이 턴은 카드 자리라 카드 자리 줄(:535 'No question and no answer example')과 부딪친다.
- 왜: 정본 02-2:259-261 의 1~3단계 줄은 첫째 '카드 답 예시를 소리로', 둘째 '카드 쉬운 질문', 셋째 '카드 답 예시 소리 뒤 다음 카드 자리'이다. C194 (1)은 1~3단계 닫기 · 들리지 않음 닫기를 붙일 기회가 없어도 카드 자리로 만들었다. 까닭은 바로 이 표본처럼 AI 차례로 두면 '답 소리 → 다음 질문' 차례(02-2:261)와 소리 줄을 tori_en 뒤에 읽는 규칙(02-2:204)을 함께 지킬 수 없기 때문이다. 묶음 5 의 stuckPlan · noSpeechPlan 도 이 입력에서 카드 자리를 낸다. 지금 표본은 계약 시험이 그 반대 길을 '맞는 정규화'로 지키게 만들어, 묶음 8 이 표본을 따라 잇는 순간 아이가 듣는 차례가 뒤집힌다. 구현 보고(09:0x)가 C194(09:2x)보다 먼저라 구현자 잘못은 아니지만, 정본이 이미 바뀌었다.
- 어떻게: (1) 세 표본의 입력을 묶음 5 계획대로 바꾼다. 받침 첫째 · 들리지 않음은 `kind: "card_slot"`(들리지 않음은 C194 의 cardLine 포함), 받침 둘째는 `kind: "card_slot"` + 카드 쉬운 질문 cardLine 이다. 정규화 기대는 model_line '' · choices 0 · 갈래 none 이다. (2) 1~3단계 규칙에 'Levels 1-3: in support turns and after nospeech the app plays the answer and adds the easier or next question. Write only a short reaction or cue (e.g. "That's okay! Let's say it together."). Do not write the answer or a question.'를 더하고, 공통 받침 줄은 '4단계부터' 몫으로 좁힌다. (3) AI 가 답 · 쉬운 질문을 쓰는 길(02-2:259-261 의 4단계부터 줄)은 4단계 표본 둘(받침 첫째 · 들리지 않음)로 덮는다.

### Minor

**M-1. 따라 할 말 대체 글이 꺼낸 새 단어 확인을 스스로 채운다.** 대체 글은 확인 전 목록(rawNewWords)에서 고르고(:997 · :1003 · :886-893), 그 뒤 '따라 할 말에 있음' 확인은 바뀐 글로 한다(:1014-1017). probe: tori_en 'The weekend is fun! Listen and say!', new_words ['sunday'], 범위 밖 model_line → model_line 'Sunday.' · new_words ['sunday']. tori_en 에도 AI 의 원래 줄에도 없는 낱말이 꺼낸 새 단어로 남고, 아이는 '주말' 이야기 뒤에 'Sunday.'를 따라 하게 된다(AC-15c 'tori_en 에 없는 꺼낸 새 단어를 걸러 낸다', 05:60). AI 실수 둘이 겹칠 때만 생긴다. 고칠 길: 꺼낸 새 단어는 tori_en 과 AI 의 원래 model_line 으로 먼저 거르고, 대체 글은 거른 목록에서 고른다. 시험 한 건을 더한다.

**M-2. 고정부 글끼리 부딪치는 곳 둘.** (1) 1~3단계 'Put your question at the end of tori_en.'(:563)과 'end tori_en with a cue like "Listen and say!"'(:564)가 함께 있다(표본 support-easy 는 'What do you like? Listen and say!'). (2) tori_en 설명 글 'a short reaction first, then one next question'(:330)이 카드 자리 · 마무리 자리 · 인사 끝 · 평가 대화 · 바닥선에도 걸린다. '질문은 마지막 물음표 문장으로, 신호 말은 그 뒤', 'On AI turns: a short reaction, then one next question'으로 고친다. 묶음 5 fix 1 의 '그 차례의 질문 = 마지막 물음표 문장' 읽기와도 맞아진다.

**M-3. 선택지의 '노리는 단어'를 AI 의 next_targets 로만 본다.** :1005-1013 은 AI 가 next_targets 를 비우면 꼴이 맞는 선택지도 지운다(보고 우려 3). 05:60 · 02-2:240 의 '하나는 노리는 단어'에서 노리는 단어는 카드 항목을 노린 턴이면 카드 항목 targets 로도 알 수 있다. 정규화한 card_item 이 있으면 그 항목 targets 를 함께 넘긴다.

**M-4. AC-19d 시험이 구현 함수의 글을 기대값으로 쓰고 '첫머리'를 고정하지 않는다.** test:151 은 `teacherBlockOf(LESSON_TEACHER)` 를 기대값으로 쓰므로 블록 글이 정본에서 벗어나도 지난다. :152-154 는 'You are Mina'가 'Never say you are a human.'보다 앞인지만 본다. 첫 규칙 줄이 05:31 의 블록 문장(미나 · 견본 성격 글을 넣은 글자)과 같은지 문자열로 비교한다.

## 4. 보고의 '설계와 다르게 한 것' 일곱

1. 시험을 모듈 뒤에 쓴 것: 받아들일 만하다. 시험 대부분이 막는 쪽 · 통과하는 쪽을 함께 보고 기대값이 구체적이며, 구현에서 베낀 기대값은 M-4 하나다. 다만 브리프의 '먼저 실패를 본다'를 지키지 않았고 깨뜨려 본 곳이 둘뿐이라는 사실은 장부에 남긴다. fix 의 새 시험(I-1 · I-2 · I-3 · M-1)은 먼저 써서 실패를 본다.
2. 입력 칸 다섯: 순수 함수 원칙과 정본에 맞다. goalTexts · carryGoals 는 세션 시작 스냅숏(정한 것 7)이라 가변부에 두어도 캐시가 깨지지 않고, carryGoals 는 05:60 '카드 목표와 이월 목표만'의 허용 범위다. lineRange 는 05:60 따라 할 말 · 선택지 범위 검사 재료이고, 턴마다 바뀌는 childWords 는 정규화에만 쓰여 시스템 프롬프트에 들지 않는다. imageWords 는 05:95 '카탈로그에 있을 때만'이다. turn.stuckAnswer 는 05:60 '카드의 답 예시'로 바꿀 글이고 사용자 메시지에 넣지 않는다. 모두 DB · 시각 없이 값으로 받는다.
3. 정리 셋: 정본과 맞다(카드 자리 · 마무리 자리 · 평가 대화는 05:75 '반응만', '모름' 턴은 05:60 과 0c664c3, 미션 · 역할 바꾸기는 02-2 단계표 5~7과 카드 roleSwap). 빠진 턴은 I-2 다.
4. Card line 의 카드 질문 글 · Chances 다섯 줄 · Floor 규칙 줄: 맞다(05:56 '붙일 카드 항목' · 기회 알림 차례, 3.3 바닥선).
5. 규격 제목 talk_turn: 맞다(05:99 두 목적 같은 스키마, plan:87 목적 이름 그대로).
6. 글 속 '네 낱말' · '1~4 · 5단계부터': 정본 05:38 · 02-2:263 의 글이고 12절 키가 없어 받아들일 만하다(옛 꼴과 같음).
7. 엄격 검사가 범위를 보지 않는 것: 받아들일 만하다. 서버가 엄격을 지난 값도 정규화를 거친다(`src/server/ai/talk.ts` 504줄). 다만 ai_calls 상태는 정규화가 바꾼 것을 반영하지 않는다(6절 관찰).

## 5. 묶음 3 · 5 의 이름이 바뀌면 깨질 곳

| 기대는 것 | 자리 | 깨지는 꼴 |
|---|---|---|
| 묶음 3 `TalkLevelSpec` 칸 여섯(mode · targetTurns · hintTiers · usablePhrases · missions · koMeaning) | talk-lesson.ts:84-92 | tsc |
| 묶음 3 `TalkCard` 칸 열과 안쪽 칸(required · more 의 no · en · targets · goals, todayWords 의 word · modelLine, missions 의 en · goals, roleSwap 의 firstLine · hint) | :95-107 · :586-592 · :621 · :632 · :639 · :891 | tsc. 견본 손 카드(talk-lesson-inputs.ts:75-198)도 같은 칸 |
| 묶음 3 structure.ts 열거 넷 · bandKey | :31-37 | tsc. 열거 값이 바뀌면 계약 표본 JSON 의 next_move · support · card_item.kind 도 |
| 묶음 5 question-check 의 checkSoundLine · checkChoices · LowLevelLineOptions | :22-26 · :870-881 | tsc. fix 1 이 LowLevelLineOptions 에 칸을 더하면 lineOptions 를 고친다 |
| 묶음 5 계획 → 호출 입력 대응(kind · stage · cause · stuckQuestion · answerFallback · attach → cardLine · chances · followRun · turnsLeft · aiAsks) | 함수가 없음 | 이름 · 뜻이 바뀌어도 tsc 가 잡지 못한다. I-1 의 대응 함수로 묶는다 |
| 옛 talk.ts 와 겹친 형(TalkTurnSegment · TalkInputMode …) | :48-70 · lesson-turns.ts | 묶음 12 가 옛 파일을 지울 때. 보고 '묶음 3 뒤 할 것' 1 대로 |

보고 '묶음 3 뒤 할 것' 넷은 순서 · 내용 모두 맞다. 묶음 3 검토(task-talk-3-review-report.md)는 이 묶음이 고른 칸 이름을 바꾸라고 하지 않았다.

## 6. 계약 표본 · 시험 · AC 표지

- 표본 열둘은 plan 의 덮을 목록(3단계 AI 차례 · 카드 자리 · 받침 셋 · 들리지 않음 · 마무리 제안 · 4단계 · 5단계 미션 · 끝맺음)을 이름으로는 모두 덮는다. 뜻으로는 받침 둘 · 들리지 않음이 정본 길이 아니다(I-3). 빠진 갈래는 말 입력 막힘 두 갈래(I-1)와 4단계부터의 받침 · 들리지 않음(I-3 (3))이다.
- AC 표지는 대체로 뜻을 증명한다. AC-15c 는 스키마 · 앱 확인 · 사용자 메시지의 힌트 종류 · 아직 '안다'가 아닌 단원 단어를, AC-15d 는 5단계 3 → 1 · 10단계 2 · 4단계 없음을, AC-15k(단위 몫)는 첫 턴 이름표 · 앞 턴 짝 글자 그대로 · 바뀐 값만 · 다시 쓸 차례를 본다. AC-15b 는 출력 검사 칸 · 걸린 칸 바꾸기의 단위 몫이고 흘려 받기 몫은 묶음 8 이다. 계약 시험 'AC-15c 표본 덮기'는 이름 목록만 보아 AC-15c 의 뜻과 닿는 정도가 약하지만, 바로 뒤 시험이 정규화 기대를 보므로 지적하지 않는다. AC-19d 는 M-4.

## 7. 장부 열린 항목

- **T-2: 닫힘(이 묶음 몫).** 범위 파일 다섯과 src · seed · tests · scripts 에서 `participation_ratio` grep 이 0 이다. 사용자 메시지의 'Turns left before closing question'은 정본 05:56 '참고 턴까지 남은 수'이고, 고정부가 'It is not a number of turns to fill.'(:537), 가변부가 'Reference turns (… not a quota)'(:603)로 문턱이 아님을 밝힌다. 고정부의 다른 턴 수(이어 묻기 · 따라가기 · 역할 바꾸기)는 12절 설정 키이고 완료 · 중단 판단에 쓰이지 않는다. 끝 판정(grep 0)은 plan 대로 묶음 12 에 남는다.

## 8. 범위 밖 관찰(근거가 있는 것만)

- 1~3단계 마무리 제안이 물음표 문장이면(표본 closing-suggest 'Do you want to stop here?') 02-2:202 AI 질문 검사를 받는다. 걸려 지워지면 그 턴은 카드 자리가 되는데 갈래 closing 은 남는다. 묶음 8 은 제안 문장이 지워진 턴의 closing 을 없음으로 바꾸고(두 버튼을 보이지 않게) 시험으로 보인다.
- 꺼내기 AI 차례에서 따라 할 말이 걸리고 대체 글도 없으면(꺼낸 새 단어 없음 · 막힌 차례 아님) model_line 이 비는데 tori_en 끝 'Listen and say!'는 남는다. 묶음 8 이 소리 줄이 빈 턴의 신호 말을 어떻게 다룰지 정한다.
- 설명 칸(explanation)은 정규화가 막힘 단계와 관계없이 남긴다(:1060). 02-2:263 의 '1~4단계 첫 막힘 · 5단계 둘째 막힘' 보이기는 묶음 5 검토 8절 3 이 권한 hints 쪽 순수 함수가 맡는지 묶음 8 브리프에 적는다.
- 서버 실행기는 엄격 통과 · 출력 검사 바뀜 없음이면 ai_calls 를 'success'로 적어(`src/server/ai/talk.ts` 529-532줄), 정규화가 따라 할 말 · 선택지를 바꾼 턴이 상태에 드러나지 않는다. talk:observe(묶음 13)가 이 비율을 보려면 move 나 감시 기록에 표시가 필요하다.

## 9. fix 범위(권함)

I-1 · I-2 · I-3 은 모두 새 파일 셋(talk-lesson.ts · 견본 입력 · 표본) 안이라 묶음 3 · 5 의 파일 잠금과 겹치지 않는다. I-1 · I-2 의 칸 이름은 묶음 5 fix 1 의 TeacherTurnPlan 이름(aiAsks · stage · cause · stuckQuestion)에 맞추고, fix 1 이 Approved 된 뒤 대응 함수 시험을 한 번 더 돌린다. Minor 넷은 같은 fix 에 넣거나 컨트롤러가 직접 고친다.
