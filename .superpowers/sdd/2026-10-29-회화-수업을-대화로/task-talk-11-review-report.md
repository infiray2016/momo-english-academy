# 코드 검토: 회화 plan 묶음 11 · 네 토막 · 짧은 준비 쪽지 · 받침 · 두 버튼 · 확인 쪽지 · 위 띠 · 처음 안내 + 서버 액션 감싸기 · 쪽 잇기 · 흘려 받기(검토자 rev-talk-11 · Opus · xhigh, 2026-11-05)

판정: **Changes requested(수정 필요, fix 라운드 1/3)**. Important 다섯이다. I-1 은 이 묶음 파일에서 고친다. I-2 · I-3 은 서버 칸 하나씩이 필요해서 묶음 8 · 9 파일의 작은 고침과 함께 간다(칸 이름 · 자리를 적었다). I-4 는 정본 요구인데 plan 파일 표에 주인이 흐려서 컨트롤러가 이 묶음에서 할지 UI · UX 묶음 6 으로 넘길지 정해야 한다. I-5 는 묶음 10 fix 1 이 이 묶음에 넘긴 잇기다. 감싸기 · 쪽 갈래 · 위 띠 · 짧은 준비 쪽지 · 정리 한 번 · 흘려 받기는 브리프대로다. T2 · R2 는 코드와 단위 시험 양쪽에서 지켜진다.

확인한 것: 브리프 `task-talk-11.md`, 구현 보고 `task-talk-11-report.md`, 묶음 10 fix 1 보고 `task-talk-10-fix1.md`(넘길 것 절), 워크트리 p13d 의 묶음 11 파일(talk-frame diff 는 스크래치패드 `r11/talk-frame.diff`), 정본 02-2 3.3(173~176 · 180 · 208 · 229~230 · 255~263 · 290~295 · 311 · 322줄) · 03 회화 세션 표(88~104줄) · 07 33~34 · 53~54줄 · 11 AC-15e · 15g · 15l · 15t, plan 묶음 표 28줄 · 파일 표 181줄 · 정한 것 11 · 12 · 17 · 보정 11-05 (3)~(11). 시험은 다시 돌리지 않았다. 검토 중에 묶음 10 fix 1 이 talk-frame.tsx 의 힌트 흐림 두 곳을 지웠다(컨트롤러 결정 (가)). 아래 줄 번호는 그 뒤의 파일 기준이다.

## 1. 설계 준수

| 브리프 할 것 | 판정 | 근거 |
|---|---|---|
| 1 감싸기 여덟 | ✅ | `src/server/actions/conversation.ts:105~160`. 여덟 함수 모두 첫 문장이 `await requireAccess()` 다. 옛 감싸기(`:43~100`)는 그대로다. 훑기 시험 `tests/unit/access-gate.test.ts:349` 가 모든 'use server' 함수의 첫 문장을 보므로 새 함수도 401 길에 든다 |
| 2 쪽 갈래 | ✅ · ⚠️ | `src/app/(child)/session/[id]/page.tsx:63~74` 한 함수가 고르고, 옛 꼴은 옛 자료 · TalkFrame 그대로다. ⚠️ 그 사이 닫힌 새 꼴 세션은 옛 갈래로 떨어져 던진다(M-3) |
| 3 네 토막 | ✅ · ❌ | 토막 넘김은 서버 step 을 따른다(`talk-frame.tsx:2054~2065` advance · `:2068~2082` reload · `:2011~2035` applyMove). 위 띠는 분모가 없고 숨길 때도 자리를 둔다(`:1581~1614` · `:2848`). '그만하기'는 서버 판정을 먼저 묻고 needs_confirm 이면 확인 쪽지다(`:2377~2405` · `:2891~2901`, 정한 것 12). 두 버튼의 '더 이야기하기'는 chooseLessonMoreTalk 이고 AI 호출이 없다(`:2408~2421`). 막힘 화면 · 받침 설명 · 첫 질문 · 'Now let's talk.' 행(새 선생님 행 → 새 말풍선, `:1998~2008`)이 있다. 처음 회화 안내는 정본 322줄 네 문장과 같다(`src/core/teacher/name.ts:84~89`). ❌ 마무리 제안 뒤 말로 답하는 길이 없다(I-1) |
| 4 짧은 준비 쪽지 | ✅ | `follow-along.tsx:942~965`. 1단계는 그림 · 뜻 · 소리, 2~3단계는 낱말 글, 4단계부터 예문 글이다. 정적 그림 시험이 1단계에 `lang="en"` 이 없음까지 본다(`tests/unit/talk-follow.test.ts:428~458`). 저장은 saveLessonFollowAlong 꼴이고 서버 LessonFollowSchema(`index.ts:2804~2815`)와 칸이 맞으며, 시도 id 는 자리 · 차례로 고정이다(`follow-along.tsx:296~313`, 길이 72자 · 상한 100). '대화로' 단추가 없는 것은 정본과 맞다(아래 2절 우려 3) |
| 5 정리 · 첫 장 | ✅ · ❌ | 1~3단계는 되짚을 말 전체를 한 번 따라 말하고(`follow-along.tsx:1185~1191`), 끝인사는 정리에서 한 번 읽고 첫 장에는 글로만 남는다(`:1197~1257` · `talk-frame.tsx:2554~2570`, C167 (1)). 첫 장 끝난 길(`closing-cards.tsx:88~94` · data-closing-end)과 '단어 듣기: <낱말>' 두 줄이 그대로다. ❌ 정리 화면에 대화 기록 · 반짝임이 없다(I-4) |
| 6 힌트 · 반짝임 | ✅ · ⚠️ | 힌트 단은 current.hints · 끝 줄 hints 를 ChildTurn 에 넘기고 revealTalkLessonHint 를 부른다(`talk-frame.tsx:2715~2722`). 인사 턴 예외가 없다. 반짝임은 view · 끝 줄 flashDontKnow 를 넘긴다. ⚠️ 둘째 막힘부터 힌트를 다 여는 셈이 근사다(I-2) |
| 7 시험 | ✅ · ⚠️ | 단위 11 + talk-stream 2 + teacher-name 1 이 뜻을 단언한다. ⚠️ 늘 참인 단언 하나와 이름보다 좁은 e2e 하나가 있다(M-4) |
| 보정 (5) | ✅ | 감싸기 · page.tsx 가 이 묶음에 있고 첫 문장이 requireAccess 다 |
| 보정 (9) talk-stream | ✅ | 새 이름 sendTalkLessonTurn · sendTalkLessonTurnRetrying(`src/lib/talk-stream.ts:310~333`)과 처리기 onSound · onEnd(lesson)가 있다. '더하기만'과 달리 옛 몸통을 readTurnLines · retryTurnLines(`:120~172` · `:216~248`)로 나눠 함께 쓰지만, diff 로 보면 옛 동작은 같다(HTTP 오류 onError · 줄 갈래 dispatch · 되풀이 규칙 · 같은 본문). 같은 시도 id 는 같은 본문 객체를 다시 보내서 지켜진다 |

넘친 것: talk-stream 몸통 나누기와 teacher-name 시험 고침뿐이고 둘 다 필요한 일이다. 옛 TalkFrame 몸통에는 묶음 11 의 변경이 머리 주석 · 가져오기 말고 없다(`r11/talk-frame.diff` 1~605줄).

## 2. 잘한 점

- 서버 판정을 그대로 따르게 짰다. 옛 틀은 고르기의 '그만하기'를 confirmed true 로 보냈지만(`talk-frame.tsx:1350`), 새 틀은 늘 confirmed false 로 묻고 서버가 needs_confirm 을 정한다. 정한 것 12 의 '확인 조건은 서버 한 곳'과 맞다.
- 짧은 준비 쪽지의 단계별 글을 순수 함수로 두고 정적 그림까지 시험했다. 1단계 쪽지에는 영어 글이 하나도 없음을 HTML 로 본다.
- 위 띠는 숨길 때 invisible 과 aria-hidden 으로 자리를 두고, '그만하기'는 숨길 때 tabIndex -1 과 disabled 다. 띠가 흔들리지 않고 보이지 않는 단추가 눌리지 않는다.
- 흘려 받기 몸통을 두 꼴이 함께 써서 되풀이 · 시도 id 규칙이 두 길에서 갈라질 자리가 없다.
- 설계 숫자를 박지 않았다. talk.dontknow_max · talk.more_talk_round_turns · talk.wait_line_seconds · ui.auto_next_seconds 를 모두 view.settings 에서 읽는다. 새 구간에 숫자 글자는 꼴 값뿐이다.

## 3. 지적

### Important

**I-1 마무리 제안 뒤 말로 답하는 길이 없다.** `talk-frame.tsx:2728~2734` 의 고르기 차례는 LessonChoice 두 단추만 그리고 ChildTurn 을 두지 않는다. 정본 02-2 295줄은 마무리 제안 턴에서 "'더 이야기하기'를 고르거나 말로 답하면 대화를 잇는다"고 하고, plan 정한 것 11(52줄)은 "말로 답하면 보통 턴이다"라고 한다. 서버 step 주석(`index.ts:1599`)과 끝 줄 주석(`lesson-turn.ts:220`)도 "말로 답해도 된다"이다. 지금은 선생님이 'Shall we stop here?'라고 물으면 아이는 말로 답할 수 없다. 고칠 길: position.choice 가 "suggestion" 이면 두 단추와 함께 ChildTurn(말하기 단추)을 둔다. "closing"(마무리 물음)은 정본 294줄대로 두 단추만 둔다. 꼴은 UI · UX 묶음 6 이 입히고 이 묶음은 길만 둔다. e2e `talk-lesson.spec.ts:245~273` 에 말로 답한 턴이 보통 턴으로 가는 단언을 더한다.

**I-2 둘째 막힘부터 힌트를 다 여는 셈이 막힘 말 · 이어 열기에서 틀린다.** 틀은 이어 누른 '잘 모르겠어요' 수만 센다(`talk-frame.tsx:1777` · `:2321~2324` · `:2688`). 정본 02-2 255줄은 막힌 차례를 '잘 모르겠어요' 단추와 막힘 말(C36, 'I don't know' 같은 말) 둘로 정하고, 263줄 · 03 99줄 · AC-15g 는 "같은 질문 자리의 둘째 막힘부터 힌트 마지막 단까지"를 요구한다. 지금은 첫 막힘이 단추이고 둘째가 'I don't know' 말이면 셈이 0 으로 돌아가 단이 열리지 않는다. 쪽을 다시 열어도 0 부터다. 서버는 이미 이 수를 안다. lesson-flow 자리의 `stuckInSlot`(`src/core/conversation/lesson-flow.ts:116~117`)이고, 아이 행의 dontKnowCount 로 이미 쓴다(`lesson-turn.ts:500`). 고칠 길(구현자 요청 2 가 맞다):
- 묶음 8 파일: `lesson-turn.ts:215~241` TalkLessonNext 에 `stuckInSlot: number` 를 더하고, `lessonNextOf`(`:1246~`)가 `pos.stuckInSlot` 을 싣는다.
- 묶음 9 파일: `index.ts:2533~2549` LessonPositionView 의 Pick 과 `:2551~2568` positionViewOf 에 `stuckInSlot` 을 더한다.
- 이 묶음: dontKnowRun 을 걷고 `dontKnowCount={position.stuckInSlot}` 로 넘기며, applyEnd(`talk-frame.tsx:2161~2172`)가 그 칸을 옮긴다.
- 시험: 지금은 이 규칙을 보는 단위 · e2e 가 없다. 둘째 막힘 뒤 data-hint-tier 셋이 열려 있음을 하나 더한다.

**I-3 1~3단계 그림 턴(C32)이 새 흐름에서 빠졌다.** 정본 03 96줄(선생님 차례 행)은 "1~3단계는 그 턴에 그림이 있으면 선생님 말풍선 옆에 크게 보인다"고 한다. 3단계 단계 규격은 turnImages 가 참이고(`seed/level-specs.json` 41줄), 3단계 시드에는 필수 질문 · 더 이야기할 거리에 그림 키가 있다(`seed/lessons/talk/3/1.json` 둘째 수업 required[1] whale · required[3] shell · more[2] octopus 등 열 곳). 옛 틀은 그 그림을 보였다(`talk-frame.tsx:1079`). 새 흐름은 current(`index.ts:2469~2499`) · 끝 줄 · add 줄 어디에도 그림 키가 없어서 첫 프리뷰의 3단계 고래 질문에 그림이 나오지 않는다. 구현자 보고는 '1단계 그림 낱말은 묶음 16 몫'이라 했지만, 묶음 16 의 '그림 낱말'은 AI 가 제안하는 응답 칸이고(plan 정한 것 4, 45줄) 카드 그림 턴과 다르다. plan 파일 표 어느 묶음에도 주인이 없다. 고칠 길: 서버가 그 차례 선생님 행 move.item 의 카드 항목 imageKey 를 TalkLessonCurrent 와 TalkLessonNext(또는 add 줄 kind question)에 싣고, 틀은 view.pictures 로 말풍선 옆에 그린다. view.pictures 는 이미 카드 항목 그림 키를 모두 싣는다(`index.ts:2615~2629`). 컨트롤러가 주인을 정한다(I-2 와 같은 서버 fix 에 묶으면 한 번에 끝난다).

**I-4 정리 화면에 대화 기록과 반짝임이 없다.** 정본 03 92줄 정리 행은 "대화 기록에서 아이가 스스로 한 말 가운데 오늘 쓸 말이 든 줄을 반짝인다"이고, spec 델타 367줄도 같다. 03 94줄 대화 기록 행은 기록 칸이 없는 화면을 짧은 준비 · 바닥선 듣기 활동으로만 적는다. 틀은 정리 차례에 기록 칸 자리를 LessonWrapUp 으로 바꿔 그린다(`talk-frame.tsx:2573~2603`). 구현 우려 5 의 까닭('정리에는 기록 칸이 없어서')은 정본과 다르다. 다만 plan 파일 표 181줄은 '정리 1~3단계 한 번'만 적어서 이 묶음 몫인지 흐리다. 반짝일 줄을 고르려면 오늘 쓸 말 목록이나 서버가 단 '스스로 한 말' 표지가 필요한데, 지금 화면 자료(`index.ts:2582` card 는 topic · todayTopicsKo 뿐)에 없다. 고칠 길은 둘이다. (가) 이 묶음 fix: 정리 차례에도 TalkLog 를 두고 그 아래 되짚을 말 말풍선을 둔다. 서버가 기록 행에 `todayWordSaid` 같은 표지를 실어 주면 틀이 반짝인다. (나) 컨트롤러가 UI · UX 묶음 6(정리 꼴)으로 넘기고 장부에 한 줄을 남긴다.

**I-5 묶음 10 fix 1 이 넘긴 '소리가 안 나와서 글로 봐요' 잇기가 없다.** 정본 07 34줄은 1~3단계 회화 말풍선에 그 안내를 요구한다. 묶음 10 fix 1 이 조각 쪽(`tori.tsx:663` LessonToriBubble 의 soundless 속성 · soundlessOf)을 만들고 잇는 길을 이 묶음에 넘겼다(`task-talk-10-fix1.md` 46줄). 지금 틀의 onSpoken(`talk-frame.tsx:1839~1844`)은 그 셈을 하지 않고, LessonToriBubble(`:2639`)에 soundless 를 넘기지 않는다. 그래서 새 흐름에서는 안내가 나오지 않는다. 고칠 길: onSpoken 에서 `soundlessOf(item, outcome)`(`tori.tsx:558`)이 참이면 `{ at: performance.now(), count: count + 1 }` 을 틀 상태로 둔다. count 는 세션 동안 쌓는 셈이고 새 말풍선마다 비우지 않는다(07 33줄 '두 번 나오면' 무음 모드 줄 — 조각의 SILENT_MODE_FROM_SOUNDLESS 가 본다). LessonToriBubble 에 `soundless={{ at, count, noticeMs: view.settings.speech.skipNoticeMs }}` 로 넘긴다. 묶음 10 이 fix 1 재검토 Approved 로 닫혀 받는 쪽 꼴은 굳었다.

### Minor

- **M-1 이어 열어 다시 보낼 때 끊긴 아이 말이 기록에 없다.** `talk-frame.tsx:1909~1922` 는 앞 말풍선만 기록에 올리고 다시 보낸다. 화면 자료 log 는 liveRows 로 만들어 끊긴 아이 행(orphan)이 빠진다(`state.ts:309~313` · `index.ts:2683`). 그래서 기록이 선생님 말 → 다음 선생님 말로 이어지고 그 사이 아이 말이 없다. 정본 03 94줄은 이어 하기 때 talk_turns 로 다시 그린다고 한다. 고칠 길: pushBubbleToLog 뒤 `talkLogAppend(l, childLogEntryOf(teacherTurnNo.current, input))` 를 한 줄 더한다.
- **M-2 다음 선생님 행 번호를 끝 줄마다 하나 더한 값으로 본다(`talk-frame.tsx:2159`, 구현 우려 3).** I-2 의 서버 fix 때 TalkLessonNext 에 그 행의 `turnNo` 를 함께 실으면 어림이 없어진다.
- **M-3 쪽 갈래가 '옛 꼴'과 '닫힘'을 같은 undefined 로 받는다.** `page.tsx:70~73`. 쪽을 여는 사이 다른 기기에서 새 꼴 세션이 닫히면 loadTalkLessonView 는 undefined 이고, loadTalkView 가 새 꼴 카드에서 던져(`state.ts:719~722`) 갈 곳 대신 오류 쪽이 된다. 옛 꼴 세션은 상태를 두 번 읽는다(readTalkAnyState 의 v1StateOf, 그다음 loadTalkView). 묶음 12 가 옛 갈래를 지우면 사라지는 일이라 그때까지는 loadTalkView 를 try 로 감싸 sessionDestinationOf 로 보내는 정도면 된다.
- **M-4 시험 단언 셋.** `tests/unit/talk-follow.test.ts:456` 은 말하기 단추 수를 `toBeLessThanOrEqual(1)` 로 봐서 0개여도 통과한다(정본 03 90줄 '말하기 버튼 하나') — `toBe(1)` 로 바꾼다. `tests/e2e/talk-lesson.spec.ts:265` 는 고르기 칸에 고정 대사가 없음을 보는데, 고정 대사는 말풍선에 붙으므로 늘 참이다 — `bubble(o.page)` 에 대해 단언한다. `:445` 시험 이름은 마무리 물음 뒤 띠를 말하지만 본문은 대화 중 띠만 본다 — 이름을 줄이거나 마무리 물음까지 간다.
- **M-5 들려주지 못한 소리 줄도 '들음'으로 넘긴다(묶음 10 fix 1 이 넘긴 잇기 둘째 — 이번 fix 라운드에 넣는다).** 지금 틀은 `childHeardOf(lessonSoundsOf(bubble))` 다(`talk-frame.tsx:2485` · `:2605`). 그래서 1~3단계 바로 보내기와 힌트 종류 '영어' 기록이 실제로 듣지 못한 답까지 기준으로 삼는다. 받는 값은 `task-talk-10-fix1.md` 47줄이다. 고칠 길 셋:
  - 받은 소리 줄을 읽기 줄에 넣을 때 쌓기 전 줄 차례를 넘긴다. 지금 `:2226` 은 `lessonSpeakItemsOf(line, view.level)` 로 차례 없이 넣어 항목에 line 이 없다. 처리기는 옛 bubble 을 잡으므로 줄 수는 ref 로 센다. 열 때 · 새 말풍선 · 다시 읽기는 이미 lessonSpokenOf 가 차례를 싣는다(`tori.tsx:575~579`).
  - onSpoken(`:1839`)에서 item.w 가 sound 이고 speakHeardOutcomeOf 가 not_played 가 아니면 item.line 을 들려준 차례 집합에 더한다. 새 말풍선(showTeacherRow · onAttempt)마다 그 집합을 비운다.
  - 아이 차례에 `childHeardOf(playedSoundsOf(bubble, played))`(`tori.tsx:541`)를 넘긴다. 심각도는 묶음 10 검토와 같이 Minor 로 두되, 근거 기록(힌트 종류)이 걸려 있어 미루지 않는다.
- **M-6 이어 열면 받침 한국어 설명이 사라진다(구현 우려 6).** 화면 자료 current 에 explanation 이 없다. I-2 · I-3 의 서버 fix 에 묶어 current 에 싣는다.

## 4. 구현자 우려 넷의 판정

1. **힌트 막힘 셈 근사** — 서버 칸을 더하는 것이 맞다. 칸 이름 `stuckInSlot`, 자리는 I-2 의 세 곳이다. 작은 fix 로 맡길 수 있다.
2. **대화 말풍선 그림** — 정본이 요구한다(03 96줄 C32, 3단계 turnImages 참, 3단계 시드 그림 키 열 곳). I-3 이다. '묶음 16 몫'은 아니다.
3. **'대화로' 단추** — 정본 요구가 없다. 02-2 175줄 · 03 90줄은 결과 말을 ui.auto_next_seconds 보인 뒤 다음 낱말로 저절로 넘어가고, speech.max_retries 번 실패한 낱말은 '이건 다음에 다시 해요' 뒤 건너뛴다고만 한다. 단추를 둔 것은 바닥선 듣기 활동의 작은 '다음'(03 91줄)뿐이다. 서버 advanceTalkLesson 이 덜 한 쪽지에서도 넘김을 받으니 '다 하지 않아도 넘길 수 있음'은 건너뜀 길로 지켜진다. 지금 그대로가 맞다.
4. **묶음 10 의존** — 묶음 10 fix 1 이 이 묶음 파일의 힌트 흐림 두 곳을 지웠고 동작은 같다(아이 차례가 끝 줄 뒤에만 열림, 보정 (11)). 묶음 10 은 fix 1 재검토 Approved 로 닫혔다. 남은 의존은 fix 1 이 넘긴 잇기 둘이고 I-5 · M-5 다. 이 묶음 fix 에서 두 잇기를 넣은 뒤 tsc · 단위를 한 번 더 본다.

## 5. 범위 밖 관찰

- 묶음 14 눈 점검에 더할 것: (가) 마무리 제안 뒤 말로 답한 턴(I-1 뒤). (나) 3단계 그림 턴 고래 · 조개 질문에 그림이 크게 보이는지(I-3 뒤). (다) talk.prep_mode.1-3 를 when_needed 로 둔 3단계에서 대화 중 짧은 준비 → 'Now let's talk.' + 다음 필수 질문(정한 것 17 — e2e 가 이 길을 보지 않는다).
- 'AI 쉬는 중'에는 새 틀 · 옛 틀 모두 '그만하기'를 숨긴다(`talk-frame.tsx:2810~2819` · `:1433~1442`). 정본 07 53줄은 쉬는 동안 '그만하기'를 누르면 참여 완료로 같은 길로 간다고 한다. 옛 동작 그대로라 이 묶음 지적은 아니고, UI · UX 묶음 6 이나 쉼 화면 묶음에 넘길 일이다.
- 묶음 12 지울 목록은 구현 보고 112~118줄이 맞다. `TALK_SEGMENT_LABEL` 의 today_words · practice 와 LESSON_SEGMENT_LABEL 의 같은 두 칸(`talk-frame.tsx:1561~1562`)도 함께 지운다.

## 6. 판정

**Changes requested.** I-1 · I-5 는 이 묶음 파일에서 고친다. I-2 · I-3 은 묶음 8 · 9 파일에 칸을 하나씩 더하는 작은 서버 fix 와 이 묶음의 잇기가 함께 간다. M-2 · M-6 도 같은 서버 fix 에 묶으면 좋다. I-4 는 컨트롤러가 (가) 이 묶음 fix 또는 (나) UI · UX 묶음 6 으로 넘김 가운데 정한다. M-5 는 묶음 10 에서 넘어온 잇기라 I-5 와 함께 이번 fix 에 넣는다. 나머지 Minor 는 fix 때 함께 고치거나 컨트롤러가 직접 고친다. 재검토는 Important 다섯이 닫혔는지와 새로 깨진 것만 본다.
