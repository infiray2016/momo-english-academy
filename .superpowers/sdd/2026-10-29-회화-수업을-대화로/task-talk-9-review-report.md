# 코드 검토(회화 plan 묶음 9): 서버 액션 · 화면 자료 · 맞장구 목록(검토자 rev-talk-9 · Opus · xhigh, 2026-11-05)

판정: **Changes requested**(Critical 0 · Important 1 · Minor 3). 브리프 할 것 1~4 와 보정 절은 모두 설계대로 들어갔다. 다만 새 꼴 세션에서 '힌트' 단을 열 서버 길이 없고 plan 의 어느 묶음도 그 몫을 갖지 않는다(I-1). 구현자 우려(끝맺음 턴)는 Important 가 아니다(3절).

본 범위: 보고가 적은 `src/server/conversation/index.ts` 1519~3146줄(새 갈래) · `seed/lists/talk-wait-lines.json` · `src/core/conversation/wait-line.ts` · `src/core/seed/check-wait-lines.ts` · `src/server/seed-lists.ts:116~143` · `structure.ts`/`validate.ts`/`reference-index.ts`/`schema/reference.ts` 의 맞장구 줄 · 새 시험 셋. 공용 계약 확인을 위해 `state.ts`(TalkLessonState · isTalkOpen · readTalkState) · `closing.ts`(insertLessonClosing · completeTalk · runTalkClosing · talkClosingStatus) · `ending.ts` · `lesson-flow.ts` · `attempt.ts` · `chances.ts` · `hints.ts` 의 해당 함수만 읽었다. 시험은 다시 돌리지 않았다(먼저 실패 기록 `t9-red.txt`: 함수 없음 26 · 모듈 없음 1 확인).

## 1. 설계 준수

| 항목 | 판정 | 근거 |
|---|---|---|
| (가) 짧은 준비 계획과 보인 낱말을 섞지 않음 | ✅ | 처음 스냅숏 prepWords = 계획(`index.ts:2243~2262`, 배정은 카드 prep · 다지기는 노리는 단어에서 '안다' 뺌 `chances.ts:281~299`). 판정 입력은 prepWords = 보인 낱말 · prepPlan = 계획으로 따로 둔다(`index.ts:1538~1541`, `1558~1559`). 흐름 · 기회 셈에는 보인 낱말만(`1578`, `1801`), 쪽지 낱말 · 넘김 판정에는 계획만(`1612`, `1635`, `1662`, `1668`) |
| (나) 토막 넘김 | ✅ | 인사 끝 → 계획이 있으면 짧은 준비(행 없음), 없으면 대화 첫 질문(`index.ts:1659~1679`). 대화 첫 질문은 앱이 카드 첫 필수 질문을 새 선생님 행으로(AI 없음, 02-2:169 · 188). 대화 중 연 준비 끝은 같은 토막에서 'Now let's talk.' + 다음 필수 질문, 막힘 셈 0(`lesson-flow.ts:681~688`, 시험 `talk-lesson-actions.test.ts:193~205`). 02-2:176 과 같다 |
| (다) saveFollowAlong | ✅ | talk-prep 꼴 `{ index, word, place, target, heard, failures, skipped?, clientListen? }`(`index.ts:1730~1741`), 활동 번호 `lessonFollowAlongNo(at, { todayWords, prepWords: settings.prepWords, wrapUp })`(`1710~1714`), prepWords 는 `talk.prep_words.<구간>` 설정값(`state.ts:1391~1399`). 다지기 범위 시험이 fix 1 I-1 을 증명한다(`test:288~300`). 대화 중 준비는 그 선생님 행 move.prep 낱말 · 자리 talk(`index.ts:1611~1619`) |
| (라) chooseMoreTalk | ✅ | 고를 차례에서만, 더 이야기할 거리 하나를 카드 자리 행으로(다시 쓰기 남은 낱말 → 오래된 것), AI 호출 없음 · 아이 행 없음이라 턴 셈 없음(`index.ts:1789~1835`, `2876~2929`, 시험 `test:347~357` 이 talkCount 가 그대로임을 본다). 마무리 물음이면 more_talk + 참여 완료, 마무리 제안이면 토막 그대로(02-2:294 · 295) |
| (마) stopTalk | ✅ | 확인 조건은 talkNearlySilent 하나(`ending.ts:18~27` · `87~101`), 확인 뒤는 stop_confirmed → 중단 · 학습일 · 이음매 aborted(`index.ts:3018~3034`), 참여 완료는 진행일 때만 completeTalk(`1865`, `3019`, `closing.ts:279~353` 세션마다 한 번), 끝맺음 기록은 insertLessonClosing(`3035~3041`). 02-2:288~291 표와 같다 |
| (바) 들려줄 말 출처 | ✅ | 카드 오늘 쓸 말 → 같은 단원 배정 카드(세션 시작 개정 이하 · 새 개정 먼저) → 품사 규칙 → 낱말만(`index.ts:1918~1962`, `1967~2029`). 동사는 'I + 낱말.'이고 'The' 를 붙이지 않는다(`1886`). 브리프 `seed/prompts/talk-3.md:797` 5 의 꼴과 같다. 단위 시험이 넷을 다 보인다(`test:512~605`). 첫 프리뷰 낱말을 vocab 으로 계산해 보니 beach · mountain · sky · sea 는 'The + 낱말.', rain · snow · air 는 낱말만이다 |
| (사) 맞장구 목록 | ✅ | 첫 안 다섯 줄, SEED_FILES · 검증기 규격 표 · 서버 읽기(`seed-lists.ts:128`), 검사는 금지어 · 선생님 이름 · 물음표 · 1단계 문장 길이(`reference-index.ts:592~600` 이 level-specs talk 1 에서 읽음) · 겹침(`check-wait-lines.ts`), 고르기는 턴 번호 나머지(`wait-line.ts`). 빌드 추적 `next.config.ts:37~39` 가 덮는다 |
| 할 것 3 (나) 첫 묶음 | ✅ | 쪽지 자리 talk · 넘김 · 저장이 모두 받는다. 여는 판정은 when_needed 에서만이라(`lesson-flow.ts:782~786`) 인사 뒤 준비와 활동 번호대가 겹치지 않는다 |
| 할 것 4 근거 쓰기 줄 | ✅ | 주석만(`index.ts:2845~2846`, 정한 것 22) |
| 화면 자료(브리프 할 것 1) | ⚠️ | 대화 기록 줄 · 쪽지 · 맞장구 · 고르기 · 마무리 제안은 있다. 힌트 단 자료 · 열기 길이 없다(I-1) |
| 새 꼴 세션 턴 번호 | ⚠️ | 앱 행은 최대 + 1(`index.ts:2142~2144`)이고 '아이 행 번호 = 마지막 선생님 행 번호'는 묶음 8 의 꼴이라 diff 로 확인하지 못했다. talk_turns 에 턴 번호 고유 제약은 없어 부딪쳐 던지지는 않는다 |

## 2. 잘한 점

- 판정을 DB 없는 순수 함수(lessonStepOf · lessonAdvanceOf · lessonFollowOf · lessonMoreOf · lessonStopOf · prepNoteOf · lessonLogOf)로 떼고 액션은 읽기 → 판정 → 쓰기만 한다. 단위 시험이 그 함수를 바로 부르므로 뜻(넘김 차례 · 활동 번호 · 참여 완료 한 번 · 확인 조건)을 정확히 단언한다.
- 계획과 보인 낱말을 형 칸 이름과 주석으로 갈라 둬서 묶음 5 검토 I-2 가 다시 생길 자리가 없다.
- 참여 완료를 completeTalk 의 '진행일 때만' 조건 하나에 맡겨 고르기 두 번 · 완료 뒤 그만하기에서 친한 정도가 한 번만 오른다. 통합 시험이 DB 로 그것을 본다(`talk-lesson-session.test.ts:348~382`).
- 선생님 행 text 에서 소리 줄을 빼고 다시 쓸 차례에만 넣는다(`index.ts:2168~2178`). 대화 기록 자료는 move.sound 를 읽지 않아 T2 가 꼴로 지켜진다.
- 맞장구 목록이 없을 때 조용히 빠지지 않게 경고를 한 번 남기고, 규격이 틀리면 던지는 쪽을 고른 판단이 시드 목록 규칙(seed-lists 머리 주석)과 맞다.
- 설계 숫자를 코드에 둔 곳이 없다. 새 코드 · 시험에 '트랙' · '유닛'이 없다.

## 3. 지적

### Important

**I-1. 새 꼴 세션에서 '힌트' 단을 열 길이 없다.**
- 무엇이: 옛 revealTalkHint(`index.ts:1495~1517`)는 readTalkState 를 쓰는데, 그 함수는 새 꼴 카드 세션이면 던진다(`state.ts:713~721`). 그래서 새 꼴 세션에서는 늘 `{ ok: false }` 다. 새 화면 자료 TalkLessonView(`index.ts:2528~2571`)와 current(`2430~2440`)에는 힌트 단 칸이 없다. 옛 화면 자료는 `next.hints`(HintView: 1~3단계 영어 단 글은 비우고 연 단만 revealTalkHint 로 받음, `state.ts:318~324`, `index.ts:662`)로 내렸다.
- 왜: 3.3 힌트 문단 '힌트 단 수와 차례는 그대로다'(02-2:206)와 AC-15a('힌트'를 한 번 누르면 한국어 뜻, 두 번 누르면 영어 문장과 듣기 버튼) · AC-15p(3단계 한국어 뜻 → 영어 틀 → 영어 문장)를 첫 프리뷰의 3단계 대화 턴에서 지킬 수 없다. 두 AC 는 묶음 11 이 증명하는데(plan 28줄) 화면 파일만으로는 채울 수 없다. 힌트 글을 화면 자료에 미리 다 내리면 '영어 문장을 미리 내려 주지 않는다'(HintView 주석)는 지금 보호를 깬다. plan 파일 표(168~184줄)에는 새 꼴 힌트 서버 길을 맡은 묶음이 없다. `index.ts` 는 이 묶음만 고치는 파일이고(브리프 보정 절 33줄), 구현 보고 103줄은 'hints.ts 가 맡는다'고 했지만 hints.ts 는 순수 함수(`lessonHintTiersOf`, `hints.ts:197`)일 뿐 세션 상태를 읽지 않는다.
- 어떻게: (가) current 에 그 차례의 힌트 단 보기(옛 HintView 꼴: 종류 · 듣기 · 쓸 말, 1~3단계 영어 단 글은 비움)를 더하고, (나) `revealTalkLessonHint`(lessonStateFor → 마지막 선생님 행 move.item 의 카드 항목, 없으면 그 행의 AI 힌트 → lessonHintTiersOf → 그 단의 글)를 더한다. AI 차례 힌트가 어느 칸에 저장되는지는 묶음 8 과 맞춘다(⚠️ diff 로 확인 못 함). 이 묶음 fix 로 넣는 것이 가장 짧다. 컨트롤러가 다른 묶음에 맡기면 그 브리프에 이 두 칸을 적는다.

### Minor

**M-1. 'Now let's talk.' 에 한국어 뜻이 없다.** cardLineKoOf(`index.ts:2057~2072`)는 'Do you want to talk more?' 뜻은 되찾지만 'Now let's talk.'(`lesson-flow.ts:53`, 뜻 정의 없음)는 되찾지 못한다. 정본은 1~4단계에서 화면에 글로 나온 선생님 말 아래 뜻을 붙인다(03:94 · 96). 3단계 프리뷰에서 talk.prep_mode 를 when_needed 로 견주면(정한 것 17) 그 줄만 뜻 없이 보인다. 정본에 이 앱 대사의 뜻 문구가 없으므로, 컨트롤러가 문구를 정하면 spoken 꼴(MORE_PROMPT 처럼 en · ko)로 두고 이 함수가 읽게 한다.

**M-2. 통합 시험 (나)가 중단 뒤 끝맺음을 응답 뒤로 모으는지 보지 않는다.** AC-15f 는 '그만두면 끝맺음 턴이 응답 뒤에 불려 요약이 저장되며'다. (가) 시험은 `tasks` 를 본다(`talk-lesson-session.test.ts:337` · `345`). (나) 시험(`314~327`)은 까닭 stop_confirmed 만 보고 tasks 길이를 보지 않는다. 'AI 쉬는 중'이 아닐 때 하나가 모이는지(`closing.ts:226~229` 의 aborted · schedule 참)를 한 줄 더한다.

**M-3. 구현 보고 우려 2 의 예가 코드와 다르다.** 보고 108줄은 'cook 등 동사를 겸한 명사는 낱말만'이라 했지만 vocab 의 cook 은 첫 품사가 verb 라 'I cook.'이 된다(`index.ts:1885~1886`). 코드는 브리프 꼴대로다. 첫 프리뷰에서 요청자에게 규칙을 보일 때 이 예를 쓰지 않는다.

## 4. 구현자 우려 · 요청 판정

- **우려 1(끝맺음 턴 새 갈래)은 Important 가 아니다.** (1) 지금 아이가 새 이름 액션에 닿는 길이 없다. 쪽은 loadTalkView 를 부르고(`src/app/(child)/session/[id]/page.tsx:17` · `29`) 액션 감싸기도 옛 이름뿐이다(`src/server/actions/conversation.ts:9~24`). (2) 묶음 8 이 이미 runTalkClosing 과 talkClosingStatus 를 카드 꼴로 가르고 있다(`closing.ts:580~597`, `690~697`). (3) 그 전이라도 runTalkClosing 은 안에서 오류를 잡아 실패 셈으로 남기고 던지지 않는다(`closing.ts:611~614` · `657~660`). 그러면 정리 끝인사는 카드 끝인사로 간다(02-2:208). 묶음 11 은 묶음 8 뒤라(plan 28줄) 차례로 닫힌다. 묶음 9 쪽에서 막을 것은 없다. 묶음 8 검토가 새 꼴 세션 끝맺음 시험을 보는지만 확인한다.
- **새 이름을 옛 이름과 따로 둔 판단은 정한 것 1 과 맞다.** 정한 것 1 은 '묶음 5~11 은 새 갈래만 더하고 옛 갈래 · 옛 시험은 고치지 않는다'(plan 42줄)이다. 옛 이름의 돌려주는 꼴을 바꾸지 않아 옛 화면 형이 깨지지 않는다. 묶음 12(plan 183 · 184줄)가 옛 이름 일곱(loadTalkView · advanceTalk · saveFollowAlong · chooseMoreTalk · stopTalk · leaveTalk · readTalkWrap)과 옛 revealTalkHint 를 지울 때, 새 이름을 그대로 둘지 옛 이름으로 바꿀지를 그 브리프에 적는다.
- **감싸기 · 쪽 잇기를 묶음 11 에 두는 차례는 맞다. 다만 plan 파일 표에 두 파일이 없다.** 묶음 10 · 11 파일 표(plan 179~182줄)에 `src/server/actions/conversation.ts` · `src/app/(child)/session/[id]/page.tsx` 가 없다. 묶음 11 브리프에 명시하지 않으면 첫 프리뷰에서 새 꼴 세션이 열리지 않는다(쪽이 loadTalkView 를 부르면 `state.ts:720` 에서 던짐). 새 감싸기는 첫 문장이 `requireAccess()` 여야 한다(감싸기 머리 주석의 P3b 훑기 시험, 가족 접근 쿠키).

## 5. 품질 점검

- 시험: 단위 26 · 6 은 뜻을 단언한다(넘김 차례 · 활동 번호 값 · 참여 완료 한 번 · 확인 조건 셋 · 출처 넷 · 기록 자료의 소리 줄 없음). 먼저 실패는 함수 없음으로 났다. 정적 통합 7 은 테스트 DB(createTestDatabase)만 쓰고 개발 DB 를 쓰지 않는다.
- 설정값: 짧은 준비 수 · 방식 · 화면 설정 · 맞장구 초가 모두 settings 에서 온다(`index.ts:2348~2375`, `state.ts:1391`). 맞장구 길이 상한은 단계 규격에서 읽는다.
- T2 · R2: 선생님 행 text · 대화 기록에 1~3단계 소리 줄이 들지 않는다. current.sound 와 쪽지 자료의 영어 글은 읽어 주기 · 쪽지용으로 내려가며, 1단계 쪽지에서 영어 글을 숨기는 것과 2~3단계에서 예문을 숨기는 것은 화면 몫이다(02-2:174, 묶음 11 에 넘김).
- AI 는 서버만: 새 액션은 AI 를 부르지 않는다. 시도 꼴은 parseTalkAttemptInput(Zod)으로 본 뒤 넣는다(`index.ts:2265`, `2830`).
- 쿠키 · RLS: 새 함수는 readHouseholdProfile 로 그 프로필 세션만 읽는다(옛 갈래와 같음). 쿠키 확인은 감싸기 몫이다(4절).

## 6. 범위 밖 관찰(짧게)

- '더 이야기하기'로 붙인 카드 자리 행은 move.why 가 null 이다(`move.ts:26~33` 열거에 그 까닭이 없음). 묶음 13 talk:observe 가 '카드 자리 까닭'을 셀 때(plan 30줄) 이 행을 '앱이 기회를 채우려고 만든 카드 자리'(AC-15t (마))로 잘못 세지 않게 앞 행(closing_slot · 갈래 마무리)으로 가르도록 넘긴다.
- 묶음 11 화면은 짧은 준비 마지막 낱말의 저장이 끝난 뒤 넘김을 불러야 한다. 넘김 뒤에 온 저장은 자리를 못 찾아 invalid 가 되고 그 시도 · 만남이 남지 않는다(`index.ts:1724~1729`, `2830~2831`).

## 7. 판정

**Changes requested.** I-1 하나를 고치거나 컨트롤러가 주인을 정하면 Approved 로 본다. Minor 셋은 컨트롤러 판단이다. fix 1 재검토는 I-1 · M-2 만 범위로 한다.

## 8. 덧붙인 확인(컨트롤러 11-05, 묶음 8 이 부탁한 move.item · words)

판정: **채워져 있다. Important 아님.** 앞 판정(Changes requested, I-1)은 그대로다.

- **대화 첫 질문 행(인사 끝 · 짧은 준비 뒤 · 대화 중 준비 끝)**: advanceTalkLesson 은 `teacherMoveOf(decision.plan)` 를 move 로 넣는다(`index.ts:2743~2751`). 계획은 firstQuestionPlan 이 만들고, 붙일 카드 항목이 있으면 withItem 이 `item` · `words`(그 항목 targets) · `goals` 를 채운다(`lesson-flow.ts:680~690`, `589~603`). teacherMoveOf 는 AI 차례가 아니면 `item: plan.item` · `words: plan.words` 를 그대로 싣는다(`lesson-flow.ts:1013` · `1015`). 대화 중 준비 끝은 chanceOrOldest 로 고르므로 남은 기회가 없어도 가장 오래된 더 이야기할 거리가 붙는다.
- **'더 이야기하기' 카드 자리 행**: lessonMoreOf 가 `talkMoveOf({ kind: "card_slot", item: ref, words: item.targets, goals: item.goals, streak })` 를 만들고(`index.ts:1822~1828`), chooseLessonMoreTalk 가 그 move 를 그대로 넣는다(`index.ts:2914~2921`).
- 시험: 저장된 move 의 item 은 통합 시험이 본다(대화 첫 질문 `talk-lesson-session.test.ts:309~310`, 더 이야기하기 `363~364`). words 는 더 이야기하기만 단위 시험이 본다(`talk-lesson-actions.test.ts:345`). 대화 첫 질문 행의 words 를 단언하는 줄은 없다.

**M-4(Minor). 대화 첫 질문 행의 move.words 단언이 없다.** 묶음 8 의 다음 턴 힌트 · 노린 단어가 이 칸을 읽으므로, fix 1 때 `talk-lesson-actions.test.ts:161~178` 에 `teacherMoveOf(out.plan).words` 가 카드 첫 필수 질문 targets 와 같은지 한 줄을 더하면 그 기대가 시험으로 묶인다.
