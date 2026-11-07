# 묶음 5(잇기 · e2e) 코드 검토 · rev-5

검토자: code-reviewer(Opus xhigh) · 2026-11-07 · 워크트리 `.claude/worktrees/p13d`. 판정은 08:03 의 파일로 했다(보고 '추가' 절과 범위 밖 e2e 세 파일 고침 포함). 단위 시험은 다시 돌리지 않았다. 추가 고침 뒤의 관문 기록이 없어 e2e 여섯 파일의 `biome ci` 와 `tsc --noEmit` 만 돌렸고 둘 다 종료 0 이다(스크래치패드 `rev5-biome-e2e.txt` · `rev5-tsc.txt`). diff 사본은 스크래치패드 `rev5-diff-observe.txt` · `rev5-diff-e2e.txt` · `rev5-diff-e2e-extra.txt` 에 있다.

## 판정: 수정 필요 (Critical 0 · Important 1 · Minor 3)

## 1. 설계 준수

- ✅ **짝 시험이 같은 입력을 서버와 도구에 넣는다.** `tests/unit/talk-observe-parity.test.ts:399~461`(stepBoth)은 같은 응답 · 계획 · 행을 서버 함수(createLessonSentenceFlow · settleLessonTurn · lessonOutcomeViewOf)와 도구 sim.finish 에 넣는다. 화면 글 · rewrite · move · 뜻 · 신호 말 · 붙일 줄 · 소리 줄 · 지운 까닭 · 응답 값을 견준다. 상황 차례 · 신호 말 · 지어낸 경험 · 범위 밖 질문 · 둘째 인사 대신 줄 · 실패 대신 줄 · 장면 질문 힌트와 뜻 · 4단계 불변이 모두 있다.
- ✅ **'went' · 'news' 두 길을 가른다(묶음 2 넘김 (2)).** parity:654~690 에서 서버와 도구 모두 사전 길로 went 는 지나고 news 는 상황 줄로 바뀐다. 같은 재료를 사전 없이 돌리면 결과가 거꾸로라 시험이 두 길을 실제로 가른다. 함수 칸인 사전은 표기형 열 개로 따로 견준다(parity:417~422).
- ✅ **시험 안의 서버 배선이 실제 서버와 같다.** parity:277~393 을 `src/server/conversation/lesson-turn.ts:2472~2725` 와 줄마다 대조했다. 시드 목록, 상황 차례 계획일 때만 읽는 사전, 질문 검사 범위, 들리지 않음 판단 칸 비움, 실패 대신 줄, 아이 행이 같다. 턴 번호도 같다: 아이 행 번호가 마지막 선생님 행 번호다(lesson-turn.ts:2280 · talk-observe.ts:2693). 다른 점은 기능어를 늘 넘기는 것 하나다. 서버가 읽는 조건(answerCheckedPlan, lesson-turn.ts:2062~2065)과 쓰는 조건(situationContextOf, 733~740)이 같아 판정이 같다.
- ✅ **도구가 core 함수를 직접 부르고 같은 사전을 넘긴다(묶음 2 넘김 (1)).** situation 의 다섯 함수(talk-observe.ts:139~146), cue-line 의 넷(66~72), made-up 의 madeUpHit(114)를 가져다 쓴다. 사전은 서버 readAllowedLemmaOf 와 같은 allowedLemmaOfVocab 에 모든 단계 vocab 행과 허용 낱말을 넘긴다(663). 기능어도 모든 단계다(664~668).
- ✅ **넓이 시험이 출처 다섯을 모두 돌린다.** `tests/unit/talk-allowed-coverage.test.ts:65~105` 는 신호 말 · 상황 줄 · 고정부 1~3 예 · 짧은 반응 예 · 정본 · spec 예를 모은다. 고정부 예는 core 상수 TALK_SITUATION_EXAMPLES 를 직접 읽는다. 1단계 범위 · 허용 목록 · 사전으로 돌리고, 사전 없는 길로도 돌리며, 허용 목록에 손으로 더한 낱말이 없음을 본다(132~191). spec 설계 절의 상황 차례 예 문장이 모두 든다.
- ✅ **e2e 기대 글을 박지 않았다.** 신호 말 · 상황 줄 기대는 서버가 읽는 같은 seed/lists 파일에서 읽는다(talk-lesson.spec.ts:1144~1157, 서버 `src/server/seed-lists.ts:34 · 84`). 장면 여는 질문 기대는 견본 카드 값에서 읽는다.
- ✅ **앱 규칙을 건드리지 않았다.** 묶음 5 기간(07:29 뒤)에 바뀐 src · seed 파일은 07:31~07:51 의 묶음 3 목록과 묶음 2 fix 1 · 2 파일뿐이다. 07:52 뒤에 바뀐 파일은 tests 와 scripts 뿐이다.
- ✅ **선택지 시험 셋이 C205 와 맞는다.** 3단계 둘은 받침 둘째 AI 차례로 옮겼다(talk-lesson.spec.ts:706~764 untilEasyChoices, 쓰는 곳 841 · 985). 1단계 하나는 아직 묻지 않은 둘째 필수 질문의 노리는 단어를 노린 AI 질문으로 옮겼다(required-utterance.spec.ts:351~358 · 392). spec 설계 4 표(spec.md:82 '받침 둘째, 1단계에서 아직 만나지 않은 새 단어를 처음 물을 때')와 서버 거름(`src/core/ai/calls/talk-lesson.ts:1577 · 1594~1602`)에 맞는다.
- ✅ **범위 밖 e2e 세 파일 고침이 최소다.** 각 파일에서 카드를 넣는 한 줄과 가져오기 한 줄만 바꿨다. 회화 카드를 넣는 e2e 파일 여덟 가운데 나머지 자리(font-size:124 · teacher-choice:87 · teacher-window:484)는 대화 첫 질문에 기대지 않는다.
- ❌ **AC-5 (나) 의 'Follow up' 줄을 e2e 가 증명하지 못한다(I-1).**
- ⚠️ **변형 열세 경우의 붉음은 기록만 봤다.** `ai-scope-5-mutations.txt` 를 읽었고 다시 돌리지 않았다.
- ⚠️ **e2e 는 한 번도 돌지 않았다.** 아래 4절의 줄을 첫 CI 실행에서 본다.

## 2. 잘한 점

- 짝 시험이 사본의 결과만이 아니라 재료(live)까지 견준다. 함수 칸인 사전은 표기형 열 개로 따로 견주어 '같은 함수를 넘겼는가'를 실제로 잰다.
- 처음에 실패가 0 이었던 변형 넷(판단 칸 비움 · 되풀이 피하기 셋)을 보고 시험을 더해 붉게 만들었고, 그 과정을 기록에 남겼다.
- 'went' · 'news' 시험은 사전 없는 길에서 결과가 거꾸로임까지 단언한다. 그래서 시험 자체가 두 길을 가르는지 증명된다.
- e2e 옛 시험은 장면 여는 질문 칸을 뺀 견본으로 돌려 옛 단언을 고치지 않았다(위험 6 '최소로'). 새 길은 새 시험 둘에 모았다.
- e2e 서버가 시드 목록은 저장소에서, 어휘는 시험 DB 에서 읽는다는 점을 맞게 짚었다. 그래서 'okay' 가 든 가짜 반응이 상황 줄로 바뀐다는 전제로 기대를 '그 자리 상황 줄 하나'로 두었다. 이 전제는 맞다(builders.ts:888~931 에 okay 가 없고, 허용 목록에도 없으며, CLOSED_CLASS_PASS_WORDS 에도 없다).

## 3. 지적

### Important

**I-1. AC-5 (나) e2e 의 사용자 메시지 단언 둘이 시스템 프롬프트만으로 통과한다.**
- 자리: `tests/e2e/talk-lesson.spec.ts:1235 · 1237`.
- 무엇: `last` 는 가짜 AI 가 받은 요청 본문 전체다(`tests/fixtures/ai/fake-anthropic.ts:456`, system 칸 포함). 'App question just before' 는 모든 단계의 고정부 규칙(`src/core/ai/calls/talk-lesson.ts:926`)에 글자 그대로 든다. "Follow up on the child's answer: yes" 도 1~3단계 고정부 규칙(같은 파일 1018, lowBandRules)에 글자 그대로 든다. 그래서 3단계 회화 턴 요청이면 사용자 메시지에 그 줄이 없어도 두 단언은 늘 지난다. 1236 의 장면 질문 단언은 장면 질문이 앱 질문 줄(1194)에만 들어 가른다. 'Follow up' 줄은 가르지 못한다.
- 왜: spec AC-5 (나)는 '아이 답 뒤 첫 AI 차례 사용자 메시지에 … 'Follow up on the child's answer: yes' 가 든다'를 Playwright 몫으로 둔다. 서버 배선(lessonCallTurnOf · talkLessonInputOf)이 이 표시를 떨어뜨려도 이 시험은 초록이다. 같은 꼴의 통합 단언(5절)도 같은 까닭으로 가르지 못해, 서버에서 요청까지의 길을 잡는 시험이 없다. 단위 시험(`tests/unit/talk-ai-scope-flow.test.ts:196~211`)은 core 의 줄 목록만 본다.
- 어떻게: 사용자 메시지의 줄 꼴로 단언한다. 본문이 JSON 이라 줄바꿈은 `\n` 두 글자다(TURN_MARK 와 같은 꼴, `tests/e2e/talk.ts:38`).
  ```ts
  expect(last).toContain(`App question just before (not in the turns above): ${scene}`);
  expect(last).toContain("\\nFollow up on the child's answer: yes");
  ```
  다른 길로는 body.messages 의 마지막 사용자 글을 꺼내 줄로 나눠 본다. `scene` 은 칸 글 전체("This is it. Do we like it?")이고, 앱 질문 줄에도 칸 글 전체가 든다(lesson-flow.ts 의 sceneText).

### Minor

**M-1. 짝 시험의 신호 말 시험 이름이 단언하지 않는 것을 말한다.**
- 자리: parity:706~731.
- 무엇: 이름은 '같은 자리 둘째 신호 말은 짧은 꼴, 받침 셋째 · 들리지 않음에는 없다'다. 그러나 세 차례는 받침 첫째 · 둘째 · 셋째이고, 같은 자리의 둘째 신호 말과 들리지 않음 차례가 없다. 마지막 단언 `two.record.no > one.record.no`(730)는 늘 참이다.
- 왜: stepBoth 가 차례마다 신호 말을 견주므로 짝은 잡힌다. 그러나 '같은 자리 둘째부터의 꼴' 셈을 서버와 도구가 같은 move 열로 하는지는 이 시험이 밟지 않는다.
- 어떻게: 다음 자리의 받침 첫째(같이 말하기 둘째 신호 말)까지 가서 `result.cue.en` 이 짧은 꼴 목록에 있음을 단언한다. 들리지 않음 한 차례를 더해 `result.cue` 가 null 임을 단언한다. 아니면 이름을 실제 범위로 줄인다.

**M-2. 열린 힌트 단 수의 짝을 서버 함수와 견주지 않는다.**
- 자리: parity:883~892.
- 무엇: `p.hintTier` 를 도구 자신의 `p.hintTiers.length` 와 견준다. 힌트 단 목록은 sameHints 가 서버 lessonHintsAt 와 견주지만, 열린 단 수(사용자 메시지의 hintTier)는 서버 lessonChildRowOf(lesson-turn.ts:597~601 · 625)와 견주지 않는다.
- 왜: 두 쪽 모두 core openedTierCount 에 stuckInSlot 을 넘겨(talk-observe.ts:2541~2545) 어긋날 위험은 낮다. 그래도 시험 이름이 말하는 '서버 openedTierCount 와 같음'은 증명되지 않는다.
- 어떻게: lessonChildRowOf 를 가짜 요청 · 가리개로 불러 hintLevel · hintKind 를 도구 값과 견준다.

**M-3. 도구에 server-only 모듈 순수 도우미의 사본이 늘었다(plan 정한 것 7 '사본을 더 늘리지 않음').**
- 자리: `scripts/talk-observe.ts` 의 greetingFallbackSlotOf(1139) · slotQuestionTextOf(1211) · teacherTextsOf(1223) · situationContextOf(1275) · cueLineView(1414) · observeFailLineOf(1432) · situationKoOf(1470) · keptHasWord(1513) · teacherMovesOf(1523), observeHintTiersOf 안의 장면 · 인사 힌트 항목(1917~1943).
- 무엇: 서버 sceneHintItemOf · greetingHintItemOf 는 이미 export 된 순수 함수인데 도구는 그 몸을 옮겨 적었다. 나머지도 lesson-turn.ts 의 순수 함수 사본이다.
- 왜: lesson-turn.ts 가 server-only(1줄)라 도구가 부를 수 없고, 묶음 5 는 core · server 를 고칠 수 없다. 그래서 이번 선택은 맞고, 짝 시험이 이 길을 모두 지난다. 다만 서버를 고칠 때 사본도 함께 고쳐야 하는 짐이 늘었다.
- 어떻게: 묶음 2 후속이나 다음 변경 단위에서 이 순수 함수들을 core 로 옮겨 서버와 도구가 함께 부르게 한다. 장부 열린 항목으로 둔다.

## 4. CI 에서 깨질 위험이 있는 e2e 줄

diff 와 코드로 길을 따라갔고 e2e 는 돌리지 않았다. 아래는 화면 · 읽어 주기 동작에 기대는 자리라 첫 CI 실행에서 볼 곳이다.

1. **talk-lesson.spec.ts:706~764 untilEasyChoices(쓰는 곳 841 · 985).** 받침 첫째의 'It's okay!' 는 e2e 어휘에서 상황 줄로 바뀐다. 받침 둘째의 AI 선택지는 next_targets 로 준 첫 필수 질문 노리는 단어 때문에 남아야 한다(keptChoicesOf 쉬운 질문 단 · checkChoices). 쉬운 질문 'Do you like this?' 는 노리는 단어를 담지 않아 질문 검사(question-check.ts:343~345 A4-03)를 지난다고 읽었다.
2. **talk-lesson.spec.ts:985~1003 iPad 말하기 단추 시험.** 힌트 묶음을 받침 둘째 응답으로 옮겼다. 받침 차례는 자리 질문 글을 새 질문으로 바꾸므로(lesson-flow.ts:420) 그 행의 AI 힌트가 읽힌다고 읽었다. 단이 이미 다 열린 경우는 while 이 받는다.
3. **required-utterance.spec.ts:384~395 · 414 1단계 처음 묻는 선택지.** 서버 거름(talk-lesson.ts:1579~1602)의 되묻기 거름 · 다시 묻는 낱말 · spec.choices 를 지나야 ①② 둘이 보인다. 노리는 단어는 수업 행이 아니라 단원 규격(`src/server/session/ai-context.ts:86`)으로 걸러진다. 그래서 greetingTalkLesson 의 빈 unitWords 와는 관계없다.
4. **talk-lesson.spec.ts:1205~1210.** 장면 여는 질문을 읽은 글이 speechRecord 에 있어야 한다.
5. **talk-lesson.spec.ts:1268~1287.** 신호 말(긴 꼴)이 말풍선에 보이고, 읽은 차례에서 답 소리('Yes, I do.')보다 앞이어야 한다. 신호 말과 답 소리가 서로 다른 읽기 항목이라는 전제다(tori.tsx:401 lessonSpeakItemsOf 의 card · sound).
6. **talk-lesson.spec.ts:1298~1301.** 받침 둘째의 뜻 줄에 쉬운 질문 뜻이 들어야 한다. 화면은 붙인 줄의 뜻을 뜻 줄에 잇는다(tori.tsx:383~388).
7. **talk-lesson.spec.ts:1303.** 신호 말이 대화 기록 칸에 없어야 한다.
8. **옛 시험의 상황 차례 가짜 반응.** e2e 서버는 허용 낱말 사전을 시험 DB 에서 읽는다(lesson-turn.ts:2087~2105). 시험 DB 에 word 행이 없고, 사전이 있으면 꼬리를 떼지 않으므로(question-check.ts:236~239) 'words' 가 걸린다. 그래서 'Let's learn some new words!'(talk-lesson:226 · 1047), "Let's learn words."(speech-feedback:255 · 329 · 466, teacher-window:648), 인사 끝의 'Nice!'(teacher-window:695)는 상황 줄로 바뀐다. 이 글을 단언하는 줄은 찾지 못했다(talk-lesson:261 · 271 은 이번에 고쳤다).

## 5. 범위 밖 관찰

- `tests/integration/talk-ai-scope.test.ts:468`(묶음 2, 닫힘)의 `lastBody()` 도 요청 본문 전체다(256). 그래서 'Follow up' 단언이 I-1 과 같은 까닭으로 늘 지난다. I-1 과 같은 꼴로 고치면 서버 길이 잡힌다. 묶음 2 파일이라 컨트롤러 판단으로 넘긴다.
- 보고의 '덮는 시험' 절은 짝 시험을 24 로, '열린 항목 닫기' 절은 25 로 적었다. went · news 시험을 더한 뒤의 25 가 맞다.
