# 범위 한정 재검토: 회화 plan 묶음 8 fix 1(rev-talk-8 · Opus · xhigh, 2026-11-05, 라운드 1/3)

판정: **Changes requested(라운드 1/3)**. 지난 지적 I-1 · I-2 · M-1(첫 몫) · M-2 · M-3 · M-4 · M-5 와 우려 2 의 묶음, T-87 목표 채움은 모두 ADDRESSED 다. 다만 M-1 의 둘째 몫(앞서 보낸 질문이 남으면 카드 자리로 바꾸지 않음)이 AC-15r 을 깨뜨린다(새 Important N-1). 이 규칙은 지난 보고에서 내가 제안한 것이어서, 제안이 틀렸음을 함께 적는다. 고침은 한 줄 지우기와 시험 단언 고치기다.

범위: fix 보고 `task-talk-8-fix1.md`(보탬 절 포함)가 적은 자리만 본다. 시험 전체는 다시 돌리지 않았다. 지난 재현 넷과 새 의심 하나를 스크래치패드 스크립트로 지금 코드에 다시 돌렸다(워크트리는 바꾸지 않음). 출력은 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/r8/probe3-out.txt` 다.

## 1. 지적별 판정

| 지적 | 판정 | 근거(파일:줄은 워크트리 p13d) |
|---|---|---|
| I-1 잡아 둔 문장의 소리 줄 겹침 | ADDRESSED | `lesson-turn.ts:1024~1038` 이 소리 줄을 정한 뒤 잡아 둔 문장(신호 말 밖)을 sayingAnswer 로 지운다. 지난 재현(선택지 'I like Sunday.' · 잡아 둔 'I like Sunday!')은 이제 text 'Oh, nice! Do you like it? Listen and say!' 이고 그 문장이 빠진다(probe3-out.txt 'I-1'). 다시 쓸 차례 · 뜻 줄에서도 빠지는 것을 시험이 단언한다(talk-lesson-turn.test.ts:757~794). T2 는 잡아 둔 몫에서 지켜진다 |
| I-1 이미 흘린 겹침의 기록 | ADDRESSED(Minor N-2 남김) | lessonSoundFixedOf 가 overlap 을 내고(`talk.ts:288~309`), 그 턴의 ai_calls 를 '검증 실패'로 남긴다(700~707). 이 상태는 'AI 쉬는 중' 셈에 들지 않는다. 같은 오류 알림은 status error 만 세고(store.ts:141~157 · run.ts:241~257), ai_status 를 읽거나 세는 코드는 아직 없다(지난 보고 범위 밖 관찰). 다만 표시가 잡아 둔 뒤 지운 문장까지 센다(N-2) |
| I-2 인사 질문 자리 힌트 단 | ADDRESSED | greetingHintItemOf(`lesson-turn.ts:404~423`)가 카드 인사 질문의 hintKo 와 hintTiers 차례의 frameEn · hintEn 을 카드 항목 꼴로 만들고, lessonHintsAt 이 카드 항목 → 인사 질문 → AI 힌트 차례로 고른다(429~461). 빈 단은 건너뛴다(hints.ts:226). 시험이 3단계 세 단 · 1단계 두 단을 단언한다(test:813~861). 같은 함수를 아이 행(`lesson-turn.ts:496`) · 끝 줄 hints(1268) · 묶음 9 의 힌트 단 길(index.ts:2455 · 2465)이 부르므로 함께 채워진다. 4단계부터 인사는 카드 질문이 없어(greeting.firstLine) 지금처럼 AI 힌트다 |
| M-1 한 턴에 질문 둘 | 첫 몫 ADDRESSED · 둘째 몫이 N-1 | 같은 질문으로 지운 뒤의 물음표 문장을 지운다(`lesson-turn.ts:605` · 637~639 · 650). 지난 재현은 이제 '\nWhich class is hard?' 한 질문이다(probe3-out.txt 'M-1 old'). 둘째 몫(995줄)은 아래 N-1 |
| M-2 다시 부른 시도의 stuck | ADDRESSED | 시도마다 덮어쓴다(`lesson-turn.ts:610~613`). 재현 값이 false 다(probe3-out.txt 'M-2'). 시험 889~902 |
| M-3 끊긴 턴의 카드 힌트 | ADDRESSED | 값 없이 끊긴 AI 차례에 보낸 질문이 남으면 item · words · goals 를 비운다(`lesson-turn.ts:1059~1070`). 시험 904~928 이 받침 둘째 · 'Is math easy for you?' 뒤 끊김으로 item none 을 단언한다 |
| M-4 제목을 단언하지 않는 시험 | ADDRESSED | 실패 길 갈래를 순수 함수 lessonOutcomeViewOf(`lesson-turn.ts:1325~1365`)로 빼고 서버가 그 값을 쓴다(1802~1813). 시험 930~967 이 4단계 'Oops'(뜻 있음 · 없음) · 1~3단계 칭찬 · 거절 안전한 대사를 단언하고, 통합 시험이 아이 행 saidWords 빈 목록을 단언한다(integration:341) |
| M-5 4단계 거절의 카드 질문 | ADDRESSED(기록) | fix 보고 '설계와 다르게 한 것' 1. 판단은 컨트롤러 몫 그대로다 |
| 우려 2 · 보정 (7) 단원 목표 글 | ADDRESSED | 0007 은 `ALTER TABLE "unit_specs" ADD COLUMN "goals" jsonb;` 하나뿐인 더하기다. Drizzle `content.ts` goals jsonb(비울 수 있음). 적재기는 목표가 있을 때만 행 값 · 해시 몸통에 goals 를 넣는다(load.ts:252~254 · 260~279 · 344~360). DB 되살림 해시가 goals 열을 읽는다(load.ts:556~563). 읽기 readUnitGoalTexts · goalTextsOf(lesson-input.ts)는 UnitGoalSchema 의 id · ko 칸(reference.ts:316~318)을 꺼낸다. 두 부름은 같은 시작 개정으로 읽어(`lesson-turn.ts:1584~1589` · 1748, `closing.ts:509~524`) 턴과 끝맺음의 가변부가 같아 캐시가 유지된다 |
| T-87 목표 채움 규칙 | ADDRESSED | unitGoalFillsOf(load.ts:483~515)는 같은 판(개정 · 정정) DB 행이 goals 없음이고 그 해시가 들어온 행의 'goals 뺀 몸통' 해시와 같을 때만 계획 해시를 맞추고 채움 목록에 넣는다. 그래서 그 칸은 건너뜀이 되고, 넣기 단계가 같은 판 행의 goals 열만 UPDATE 한다(1243~1258). 다른 칸이 다르면 해시가 달라 지금처럼 거부되고, DB 에 goals 가 이미 있으면 채우지 않는다. 미리 돌림 · 적재 보고에 '목표 채움 N'(load.ts:1210, scripts/seed-load.ts)이 있다. 단위 시험 둘(seed-load-goals.test.ts:104~)이 채움 1 · 거부를 단언한다. 실제 DB 넣기는 통합(CI)에서 처음 확인된다 |

## 2. 새로 깨뜨린 것

### Important
**N-1. 반응 물음 뒤에 막힌 질문을 되풀이한 턴에서 받침 줄이 붙지 않는다(AC-15r, 4단계부터).**
- 무엇이: `lesson-turn.ts:995` `if (why === "same_question" && keptQuestion) why = null;` 이 앞서 보낸 물음표 문장이 하나라도 남으면 카드 자리로 바꾸지 않는다. 4단계부터는 반응 물음('Really?' · 'Oh, is it hard?')도 문장이 끝날 때 바로 보내지므로, 그 뒤 AI 가 막힌 질문을 되풀이하면 지워지기만 하고 받침 줄이 붙지 않는다.
- 재현: 받침 둘째 자리(테스트 372~405 와 같은 행), 문장 'Oh, is it hard?' · 'What is your favorite subject?' → text 'Oh, is it hard?', move ai · item none · replaced null(probe3-out.txt 'AC-15r react'). 같은 자리에서 반응이 'It's okay.' 면 'It's okay.\nEasy first 1?' 로 카드 쉬운 질문이 붙는다('AC-15r plain'). 갈래가 none · item none · aiQuestion 없음이라 다음 차례 '힌트' 단추도 없다.
- 왜: 정본 02-2:200 은 '걸린 AI 질문 문장은 지우고 그 턴을 카드 자리로 바꾼다. 막힌 뒤라면 받침 단계의 카드 줄을 붙이고'로 조건 없이 적고, AC-15r 은 '(AI 가 썼으면 지워지고 받침 줄이 붙음)'이다. 고정부도 그 차례 질문을 tori_en 의 마지막 물음표 문장으로 정한다(talk-lesson.ts:734). 그래서 앞서 보낸 물음표 문장은 반응으로 보는 것이 정본과 맞다. 지난 보고 M-1 의 '앞서 이미 보낸 AI 질문이 남아 있으면 카드 자리로 바꾸지 않는다'는 내 제안이 이 점을 놓쳤다.
- 어떻게: 995줄을 지운다(같은 질문으로 지우면 늘 카드 자리, 뒤 물음표 문장 지우기 605 · 637 · 650 은 그대로 둔다). M-1 시험의 둘째 단언(test:878~886 'before' — replaced null · kind ai 기대)은 카드 자리와 카드 질문으로 바꾼다. AI 가 정말 질문 둘을 쓰고 둘째가 되풀이인 드문 턴에 질문이 둘 보이는 것은 흘려 보내기의 한계로 보고에 적는다. 새 단위 시험: 위 'AC-15r react' 문장에서 카드 쉬운 질문이 붙는다. 시험을 먼저 써서 실패를 본다.

### Minor
- **N-2. '이미 흘린 겹침' 표시가 잡아 둔 뒤 지운 문장까지 센다.** lessonSoundFixedOf 에 넘기는 gate.sent()(`talk.ts:695~699`)는 흘려 받기 문장 문을 지나 서버 턴 길로 넘어간 문장 전부다. 서버 턴 길이 잡아 두었다가 I-1 로 지운 문장, 카드 자리로 바뀌어 AI 소리 줄을 버린 턴의 문장도 겹침으로 세어 ai_calls 가 '검증 실패'가 된다. 'AI 쉬는 중' 셈에는 들지 않으므로 아이 쪽 결함은 아니다. 다만 묶음 13 talk:observe 가 이 값을 'T2 가 깨진 턴'으로 읽으면 실제보다 많게 센다. 고침(둘 중 하나): 이 값의 뜻을 'AI 가 고정부를 어기고 답을 tori_en 에 쓴 턴'으로 talk:observe 브리프에 적는다. 또는 화면에 실제로 보낸 문장(LessonSentence state sent)과 최종 소리 줄로 서버 턴 길이 따로 남긴다(move 칸은 move.ts 가 다른 묶음 파일이라 장부 몫).

## 3. 범위 밖 관찰
- 1~3단계에서 따라 할 말을 감싼 반응('The weekend is fun!' · 따라 할 말 'The weekend.')도 두 낱말부터 '들어 있음'이라 겹침으로 본다(fix 보고 우려 3). 잡아 둔 것이면 지워져 반응이 짧아지고, 흘린 것이면 기록만 남는다. 정본 C125 의 판정 그대로라 결함은 아니다. 첫 프리뷰에서 3단계 반응이 지나치게 잘리는지 talk:observe 로 볼 거리다.
- 목표 채움은 개발 DB 의 목표 든 단원 규격 네 칸(T-87)에 처음 쓰인다. 0007 적용 뒤 `seed:load --dry-run` 의 '목표 채움 4 · 거부 0'을 확인하고 적재하면, 통합 시험 전에 실제 DB 에서 규칙이 맞는지 먼저 보인다.

## 4. 라운드 판정
**Changes requested(라운드 1/3).** 남은 것은 N-1 하나(995줄 지우기 · M-1 시험 둘째 단언 고치기 · AC-15r 반응 물음 시험 하나)다. 나머지 지적과 우려 2 · T-87 은 닫혔다. N-2 는 Minor 라 컨트롤러가 talk:observe 브리프에 뜻을 적는 것으로 닫아도 된다. 재검토는 N-1 만 범위로 한다.
