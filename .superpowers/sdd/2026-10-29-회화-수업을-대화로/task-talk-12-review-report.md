# 코드 검토 보고: 회화 plan 묶음 12 옛 흐름 걷기(code-reviewer · Opus · xhigh, 2026-11-05 18:3x)

판정: **Changes requested**(fix 라운드 1/3). Critical 0 · Important 2 · Minor 2.

본 것: 패치 `scratchpad/diff-12.patch`(89 파일)를 파일 단위 토막으로, 변경 전 사본 `scratchpad/p13d-before-12/`, 워크트리 p13d 의 지금 코드(호출부 · 공용 함수 확인만), 관문 출력 일곱, 0c664c3 의 시험 변경(`git show 0c664c3 -- tests/…`). 시험은 다시 돌리지 않았다(구체적 의심이 생긴 파일이 없음). 통합 · e2e 는 정적으로만 대조했다.

## 1. 설계 준수

| 브리프 할 것 | 판정 | 근거 |
|---|---|---|
| 1 옛 갈래 파일 몫 지움 · 공용 스키마(N-2) | ✅ | src · scripts 에 옛 이름(TalkCardV1 · talkSpecV1Of · readTalkState · loadTalkView · advanceTalk · saveTalkFollowAlong · sendTalkTurn · oldClosingCall · streamTalk · createAnswerHold · hintTiersOf · againLineOf · followAlongNo · childTurnOpensOf) grep 0. `reference.ts:278` choices · `:286` koExplainFromStuck 필수, twoAnswers 없음, `structure.ts:212 · :228` |
| 2 옛 꼴 카드 닫기(정한 것 2) | ✅ | `lesson-list/index.ts:128` listableLessonsOf, `conversation/index.ts:964 · :977 · :1552`. 아래 4절 대조 |
| 3 없앤 키 둘 | ✅ | src · tests · seed · scripts 참조 0(남은 것은 git 이 무시하는 `tests/.tmp/` 사본과 정본 12절 · 13절 · 02-2 의 역사 문장뿐). p13d `specs/09-설정값.md` 은 본 저장소 정본과 `diff -q` 같음 |
| 4 옛 시험 지움 · 새 꼴 견본 · 표지 지킴 · 위험 12 | ❌ | 표지 일곱(data-child-said · data-tori-waiting · -bubble · -line · -ko · -explanation · data-wait-hint)은 src 에 남음. 위험 12 는 거의 옮겼으나(5절) 지운 시험 가운데 새 갈래로 옮기지 않은 뜻이 여럿 남음(I-1 · I-2 · M-1) |
| 5 작은 정리 넷 | ✅ | `move.ts:56~57` 상수 · `talk-move.test.ts:114` 사본 없음, F-1 `talk-lesson.ts:1486` · `talk-lesson-call.test.ts:718`, N-3 `tori.tsx:50` · `talk-bubble.test.ts:632` |
| 6 묶음 11 이 넘긴 것(N-4 동작 몫 · N-5) | ✅(시험 일부 없음 M-2) | 6절 |
| 7 관문 0 | ✅ | biome 573 파일 0 · tsc 빈 출력 · unit 142 파일 1780 통과 6 todo · check:deps 위반 0(285 모듈) · check:ids 오류 0 · 설계 숫자 안내 47 · 12절 키 251 · spec:trace missing-test 16(모두 P12) · seed:validate 실패 0 경고 17. 보고 6절 수치와 같다 |

⚠️ diff 만으로 확인 못 하는 것: 옮긴 통합 · e2e 의 실제 통과(이 Mac 에서 안 뜸, CI 첫 실행).

## 2. 잘한 점

- 새 갈래 동작을 정말로 건드리지 않았다. `lessonTurnReadyOf`(`talk-frame.tsx:433`)는 옛 효과의 두 조건 `opening || phase !== "tori" || !bubble.done || !typedDone` · `typedLines < shown` 의 부정과 논리상 같다. `ToriBubble` 을 줄인 뒤에도 정리 조각(`follow-along.tsx:463`)은 전에도 `waiting={null}` · `onAnswer={() => {}}` 만 넘기고 `listening` · 그림 · 설명을 넘긴 적이 없어 표시가 같다. `ChildTurn` 은 이제 새 틀 한 곳(`talk-frame.tsx:1641`)에서만 쓰여 `showNotHeard` 를 늘 켠 것과 같다.
- 문장 문 지움이 안전하다. 변경 전 `server/ai/talk.ts` 의 새 꼴 키트(lessonKit)는 이미 `lowLevelQuestions: false` 였고, `checkToriSentence` · `createToriSentenceGate` 의 다른 호출부는 없다.
- 옛 꼴 세션 닫기가 기존 중단 길과 같은 칸을 쓴다. `closeOldTalkSession` 은 FOR UPDATE 잠금 안에서 진행 → 중단 · 지금 학습일(`closeStaleSessions` 와 같은 규칙) · 정리 토막 · 건너뜀 기록 · 보낸 메시지 지움 · 이음매 aborted 를 하고, 홈 진입 정리 (다)와 같은 꼴이다. 건너뜀 기록 꼴(`{ state: "skipped" }` · done)도 `insertClosingRecord` 와 같다.
- 옛 꼴 판정을 옛 칸 넷으로 바꾼 뒤에도 검증기는 스키마 오류를 그대로 함께 적어(`validate.ts:876` 뒤 `for (const issue …)`) 까닭 한 줄이 다른 오류를 가리지 않는다.
- F-1 시험이 실제로 가른다. 고치기 전 코드면 `choices: []` 인데 support 가 `choices` 로 남아 `toBe("none")` 이 실패한다. 4단계 together 는 그대로라는 반대 쪽 단언도 있다.
- 사본 없음 시험(`talk-move.test.ts:114`)은 정규식으로 상수 재정의와 `stage === <숫자>` 견줌을 모두 잡아, 빈 시험이 아니다.
- 정한 것 2 통합 시험(`talk-lesson-session.test.ts:523`)은 목록 칸 제외 · 화면 자료 없음 · 중단 · 정리 토막 · 학습일 · 끝맺음 까닭 aborted · 건너뜀을 모두 단언한다.

## 3. 지적

| 번호 | 심각도 | 자리 | 근거 | 고칠 방향 |
|---|---|---|---|---|
| I-1 | Important | `tests/e2e/required-utterance.spec.ts:291~318 · 398~410`(`direct: true` 세 곳 지움), 지운 `speech-feedback.spec.ts` U5-9 · U5-3, 지운 `conversation.spec.ts:261`(바로 보냄 · talk.hint_read_match) | 정본 11절 232줄 AC-23f 는 '말로 보낸 아이 턴마다(**바로 보낸 1~3단계 턴 포함**)'를 [필수] · Playwright(필수 경로 가)로 요구한다. 새 흐름에도 바로 보냄이 있다: `child-turn.tsx:463~480` 의 confirmPlanOf 가 들은 소리 줄(`talk-frame.tsx:1561` childHeardOf(playedSoundsOf))이나 연 영어 문장 힌트와 맞으면 autoSend 한다. 이탈 5 의 까닭('새 흐름 인사 턴은 소리 줄이 없다')은 인사 턴에만 맞고, 그 결과 지금 e2e 어디에도 바로 보낸 턴을 지나는 시험이 없다(`measuredTurn` 의 direct 단언 `:212 · :249` 은 부르는 곳 0, talk-lesson.spec 의 선택지 시험 둘 `:639 · :782` 도 선택지를 말해 보내지 않음). 단위 `talk-log.test.ts:271` 은 기록 줄 몫만 본다 | AC-23f 1단계 시험에 턴 하나를 더한다: 가짜 응답에 `choices` · `support: "choices"` 를 두고, 아이가 그 선택지 하나를 말해 바로 보내지게 한 뒤 `measuredTurn(…, { direct: true })`. 인사 턴 단언을 걷은 것은 그대로 둔다 |
| I-2 | Important | 지운 `tests/integration/conversation-session.test.ts` · `conversation-call.test.ts` · `conversation-turn.test.ts`(합 68건) | 구현 브리프 '지키는 것' 22줄 '지울 것은 지우기 전에 새 갈래 시험이 그 뜻을 덮는지 본다'. 새 꼴 세션도 지나는 공용 서버 길의 시험이 0 이 됐다. (가) 끝맺음 실행 `closing.ts:509` runTalkClosing · `:660` talkClosingStatus · `:725` closeIdleTalks 를 부르는 시험이 지금 하나도 없다(전에는 conversation-session 만). 그 뜻은 AC-8c 끝맺음 몫(정본 11절 111줄: '그만하기' 응답 뒤 · talk_closing 최대 출력 · 60초), AC-16b 요약(188줄: 한국어 · 가림 · 다음 대화 요청에 최근 talk.memory_summaries 개), AC-16c 끝난 뒤 보낸 메시지 · 다시 쓸 차례 지움, 끝맺음 두 요청이면 호출 하나, AC-15f '참여 완료 뒤 떠난 대화는 talk.idle_close_minutes 뒤 첫 홈 진입에 한 번 · 다른 기기 홈 진입은 닫지 않음'이다. 회화 plan 증명 표 268줄은 AC-15f 의 '30분 끝맺음 · 같은 시도 id' 를 talk-lesson-session 에 맡겼으나 그 시험은 없다(`talk-lesson-session.test.ts:335~352` 는 끝맺음 일을 `tasks` 에 쌓기만 하고 돌리지 않음). 이번 묶음이 더한 옛 꼴 대기 기록 건너뜀(`closing.ts:554~597`)도 같은 함수 안이라 시험이 없다. (나) 회화 턴 요청 꼴: AC-8f(정본 114줄: Haiku 설정이면 thinking disabled · fallbacks 없음, 4단계부터), AC-N4 · AC-16b 의 요청 본문 가림 · 요약 n 개, 회화 턴 하루 안전 상한 safety_cap 행 · 설정 문제 config · ai_calls 첫 문장 시간. 새 갈래에는 `talk-stream-call.test.ts:195`(1~3단계 기본값) 하나뿐이다. 1차 plan.md 269줄은 AC-8f · 16a~16d 의 증명을 옛 회화 plan(p13a)에 두었고 spec:trace 는 1차 plan.md 증명 표만 읽어(`scripts/spec-trace.ts:12`) 이 빠짐을 잡지 못한다. (다) 1-가 하루 안전 상한 회화 셋(상한 날 새 회화 막힘 · 도중 쉬는 안내와 다음 학습일 같은 시도 id · 쉬는 날 '그만하기' 끝맺음 없이 중단), 같은 시도 id 겹침 · 두 기기(진행 중이면 AI 없이 다시 읽으라는 답), AC-15f 선생님 말 없는 마지막 턴 다시 받기, AC-2c 회화 다시 하기(같은 주제 변형 · 친한 정도 안 오름): 새 갈래 통합 · e2e 에 없음(`talk-lesson-turn.test.ts:716` 은 되살리기 순수 몫만) | 새 꼴 견본(talk-fixture 새 도우미)으로 통합 시험을 옮긴다(정적, CI 첫 실행에서 확인). 먼저 (가) 셋: 그만하기 뒤 `tasks` 를 돌려 talk_closing 요청 max_tokens · 요약 저장(가림 · 상한) · 보낸 메시지 지움 · 두 요청 하나, 홈 진입 정리(시간 뒤 한 번 · 다른 기기 · 중단 (다) · 옛 꼴 대기 건너뜀). 그다음 (나) AC-8f 세 갈래와 요청 본문 가림. (다)는 같은 fix 에 넣거나, 컨트롤러가 정하면 장부에 '첫 프리뷰 뒤 시험 옮김' 목록으로 남긴다. 회화 plan 증명 표에 AC-8f · AC-8c(끝맺음) · AC-16b · AC-16c 행을 더하는 일은 컨트롤러 몫이다 |
| M-1 | Minor | `src/server/conversation/index.ts:518` · `follow-along.tsx:200`(코드는 맞음), 시험 없음 | 0c664c3 의 C149 통합 시험은 '아이 행' 과 '따라 말하기 시도에도 듣기 요약이 듦' 두 뜻을 보았다. 새 갈래는 아이 행만 옮겼다(`talk-lesson-turn.test.ts:1060` · 통합 `:398`). `talk-lesson-session.test.ts:296~312` 의 저장 시험은 clientListen 을 넘기지 않고, `talk-lesson-attempt.test.ts:98` 은 꼴만 본다 | `talk-lesson-actions.test.ts` 의 lessonFollowOf 시험에 clientListen 을 넘겨 input 에 그대로 실리는지(글 없음) 한 줄을 더한다 |
| M-2 | Minor | `talk-frame.tsx:1340`(N-4 라) · `:550 · :585~600`(N-4 가) | N-4 (나)는 `talk-follow.test.ts:753` 이 ate · went · came 을 단언하지만 (가) 멈춘 강조와 (라) 그만하기 때 말풍선 올리기는 시험이 없다. `talk-lesson.spec.ts:229` 그만하기 시험이 바로 그 길을 지난다 | 그 시험에 `[data-wrap-log]` 가 마지막 선생님 말('What do you do on Sunday?')을 담는지, `[data-wrap-shine]` 줄에 `ring-4` 가 남는지 두 줄을 더한다 |

## 4. 보고 7절 '설계와 다르게 한 것' 판정

| 번호 | 판정 | 근거 |
|---|---|---|
| 1 talkCardKindOf 를 옛 칸 넷으로 | 받아들임 | 옛 꼴의 필수 칸 firstQuestion 이 넷 안에 있어 옛 규격을 통과하던 카드는 모두 old 다(변경 전 `TalkCardV1Schema` 100줄). 새 꼴 규격에는 네 칸이 없다. 전보다 넓어져 깨진 옛 꼴 카드도 old 로 닫히는데, 정한 것 2 의 뜻(닫기)에 맞고 검증기는 스키마 오류를 함께 적는다 |
| 2 talk-start 옛 칸 둘 남김 | 받아들임 | strict 규격이라 지우면 판 1 행과 새 흐름 스냅숏(`index.ts:1137~1139` 빈 목록)이 깨진다 |
| 3 ToriBubble 을 정리 한 장 꼴로 | 받아들임 | 2절 대조대로 정리 조각 표시가 같다. 이름 합치기는 새 갈래 동작 바꾸기라 미루는 것이 맞다 |
| 4 lessonTurnReadyOf 꺼냄 | 받아들임 | 논리상 같고 U5-1 · M-1 시험이 옮겨졌다(`speech-feedback.test.ts:258 · :341`) |
| 5 AC-23f 바로 보낸 인사 턴 단언 걷음 · U5-9 · U5-3 지움 | 일부만 받아들임 | 인사 턴은 소리 줄이 없어(앱 소리 줄은 AI 응답의 choices · model_line 에서만, `lesson-turn.ts:1039~1049`) 바로 보냄이 아닌 것이 맞고, U5-3 의 '첫 문장에 사라짐'은 새 설계(기록 칸에 남음, AC-15q)와 어긋나 지우는 것이 맞다. 그러나 AC-23f 의 '바로 보낸 1~3단계 턴' 증명을 다른 턴으로 옮기지 않았다(I-1) |
| 6 N-4 (가)에 기존 테두리 | 받아들임 | 꼴은 UI · UX 묶음 6 몫이고 `child-turn.tsx:667` 과 같은 칸이다 |

## 5. 위험 12: 0c664c3 고침 대조

| 고침 | 새 갈래 시험 | 판정 |
|---|---|---|
| C149 듣기 사건 칸 | 단위 `talk-lesson-turn.test.ts:1060`(nospeech · 단추 출처, 글 없음) · 통합 `talk-lesson-turn.test.ts:398`(저장) · `talk-listen-log` 그대로 | 아이 행 덮음. 따라 말하기 시도 몫은 빠짐(M-1) |
| C148 no-speech · AC-N3 | `listen-end.test.ts:926~` · `speaking-judge.test.ts:259` 그대로, e2e `talk-lesson.spec.ts:742`(막힘 글 · speech_silent 알림 · mic_stalled 없음 · 진행) | 덮음 |
| 듣는 동안 단추 끔(N3) | 단위 `talk-child-listen.test.ts:127`(LessonToriBubble 다시 듣기 · ①② disabled) · `:140`, e2e `talk-lesson.spec.ts:782`(넷 꺼짐 → 켜짐) | 덮음 |
| 체감 대기(AC-N8) · 말소리 없음 셈 | `talk-child-listen.test.ts:61 · :70` 그대로(공용 함수) | 덮음 |
| '모름' 턴 A~E | A `talk-repeat.test.ts:196`(toriKoShownOf, 새 흐름 `state.ts:650` lessonToriKoOf 가 씀) · `talk-lesson-state.test.ts:142`, B `talk-lesson-call.test.ts:1024 · :1084`(1~3단계 고정부: 카드 자리 'Do not write the answer', 답은 model_line), C `talk-repeat.test.ts:146`(줄임꼴), D `talk-lesson-call.test.ts:502`(dont_know → recast ""), E `talk-bubble.test.ts:229`(LessonToriBubble 설명 줄 {NAME}) | 다섯 모두 덮음. 옮긴 시험은 단언이 있다(빈 시험 없음) |
| talk-hold C127 잡아 두기 | `talk-lesson-turn.test.ts:224`(정한 것 19) · `:753 · :792`(I-1 겹침) | 덮음 |

## 6. 넘긴 것 판정

| 항목 | 판정 | 근거 |
|---|---|---|
| N-2(T-57): 공용 스키마 두 칸 필수 · twoAnswers 지움 · 칸 없는 행 던짐 지움 | ADDRESSED · 닫힘 | `reference.ts:278 · :286`, `hints.ts` koExplanationShownOf · `talk-lesson.ts` koExplainRule 던짐 지움, 시험 `seed-validator-talk` AC-15m 두 건이 옛 행 · 칸 하나씩 빠짐을 거부로 단언 |
| 받침 상수(T-65 · T-67 · T-85 M-7) | ADDRESSED · 닫힘 | `move.ts:56~57`, lesson-flow · talk-lesson · lesson-turn · hints 가 가져옴(hints 의 맨 숫자 1 포함), `talk-move.test.ts:114` |
| F-1(T-77) | ADDRESSED · 닫힘 | `talk-lesson.ts:1486` 이 정규화와 같은 supportOf 로 다시 맞춤, 호출부 둘(`talk-lesson.ts:1543` · `server/ai/talk.ts:307`)이 level 을 가진 input 을 넘김, 시험 `:718` 이 가름 |
| N-3(T-99) | ADDRESSED · 닫힘 | `tori.tsx:50`, `talk-bubble.test.ts:632` 같은 글 단언, 정본 07 34줄 글과 같음 |
| N-4 (가) | ADDRESSED(동작) · 시험은 M-2 | `talk-frame.tsx:550` 멈춘 강조 + 반짝임 한 바퀴만 지움 |
| N-4 (나) | ADDRESSED · 닫힘 | `surfaceFormsOf` · `state.ts:195` lemmaEntriesOf(vocab forms), `talk-follow.test.ts:753 · :762 · :764` |
| N-4 (라) | ADDRESSED(동작) · 시험은 M-2 | `talk-frame.tsx:1340` pushBubbleToLog. 기록 덧붙임이 열쇠로 겹침을 막아(`log.ts:182`) 아이가 보낸 뒤 그만해도 두 번 올라가지 않는다 |
| N-4 (다) | 아직 열림(UI · UX 묶음 6, 서버 칸 몫 함께) | 브리프대로 이 묶음 밖 |
| N-5(T-103 · T-105) | ADDRESSED · 닫힘 | `page.tsx:58~69` 오류 이름만 남기고 다시 던짐. 닫힌 새 꼴 세션은 던지지 않고 undefined(isTalkOpen) 라 정상 길이 오류 쪽으로 가지 않는다 |
| 옛 액션 여덟 · 옛 감싸기 · 옛 talk-stream 이름(T-83 · T-86) | ADDRESSED · 닫힘 | grep 0 |

## 7. 보는 것 나머지

- **2 새 갈래 동작 불변.** 위 2절 외에, `index.ts` lessonLogOf 의 talkSegmentOf 좁힘과 `state.ts` lessonStateOf 의 좁힘은 새 꼴 세션만 지나고, 옛 꼴은 `readTalkAnyState`(`state.ts:268~279`)가 규격 · 토막을 읽기 전에 old 로 돌려준다. route.ts · talk-stream.ts · server/ai 의 변경은 지움과 주석이다. 문제 없음.
- **4 정한 것 2 · C200.** 홈 → 회화 → 세션 쪽: `page.tsx:35` area.open → loadTalkLessonView 가 옛 꼴 세션을 닫고 undefined → `sessionDestinationOf` 가 회화 수업 목록으로 보낸다(`destination.ts:24~31`). 목록은 옛 꼴 행을 칸 후보에서 빼고, 세션 시작도 같은 목록 함수(`session/index.ts` readLessonList → judgeLessonStart)로 판정해 옛 꼴 수업으로 새 세션이 생기지 않는다. 빈 단원 칸은 최소 수업 수(복사본 값)를 줄이지 않고 중단 세션은 학습일 셈(unitGateOf 는 completed 만)에 들지 않는다. 턴 요청은 새 꼴이 아니면 stale(`turn.ts:139~146`), 끝맺음 대기는 건너뜀, talkClosingStatus 는 none 이다. 무한 대기 · 막다른 화면 · 던짐 길을 찾지 못했다. talkSegmentOf 가 던지는 길은 옛 꼴 닫기보다 먼저 닿지 않는다.
- **5 시드 · 적재.** TalkLevelSpecSchema 로 DB 행을 읽는 곳은 `state.ts:675` 하나이고 새 꼴 세션(개정 3)만 닿는다. 적재기는 기존 행을 해시만 셈해(`load.ts:521~545`) 옛 개정 행에서 깨지지 않는다. 수업 목록 · 프로필 · 세션의 다른 규격 읽기는 회화 칸을 파싱하지 않는다. 시드 보기 `talk-card.tsx:166 · :278` 의 questions · turns 는 새 꼴 인사 · 평가 카드 칸이다.
- **9 문장 문.** 2절대로 새 흐름에 닿지 않는다. `talk-stream-call.test.ts:215` 가 '1~3단계 물음표 문장은 지우지 않음'을 단언한다.
- **10 제약.** 새 클라이언트 AI 호출 · 키 · Zod 빠짐 · 녹음이 없다. 그만하기 때 기록에 올리는 말풍선은 `liveTeacherEntryOf`(`log.ts:139~164`)가 글 줄(s · add)만 담아 1~3단계 소리 줄이 글로 나오지 않는다. 새 맨 숫자 없음(check:ids 설계 숫자 47 그대로).
- **8 시험 수.** notes-12 의 단위 파일별 증감 합은 −82 이고 1862 − 82 = 1780 이다. 표에 없는 단위 파일(talk-stream-call · talk-stream · ux-screen-feedback 등)은 수가 그대로다. 지운 단위 conversation-server 17건 · conversation-flow · conversation-call 은 옛 흐름 순수 함수 시험이라 새 갈래 시험(talk-lesson-*)이 대신한다. 빈자리는 통합 쪽(I-2)과 e2e 바로 보냄(I-1)이다.

## 8. 묶음 14(첫 프리뷰 눈 점검 · CI 첫 실행)에 넘길 것

- CI 첫 실행: talk-lesson.spec 17 · required-utterance 4 · required-recovery 4 · speech-feedback 10 · teacher-window 14 · teacher-choice · font-size(기본 견본이 새 꼴), 통합 talk-lesson-session(AC-15j · 정한 것 2) · talk-lesson-turn(C149), I-2 로 옮길 시험.
- `talk-lesson.spec.ts:742` C148: 들리지 않음 닫기 길에서 AI 를 부르는 수와 넣은 가짜 응답 수(speech.silent_items_max)가 맞는지. teacher-window 참고 턴 칭찬 시험은 시험용 시드 1단계 targetTurns 만큼 턴을 민다(구현 보고 우려 1).
- AC-15d 의 Playwright 회귀는 쓸 자리가 없다. `closing-cards.tsx:67` 이 두 구간 모두 첫째 · 셋째 장만 고른다(둘째 장은 4단계 몫, 묶음 16 · 17). 증명 표 AC-15d 행의 '12' 는 컨트롤러가 고친다.
- 프리뷰 상태표 '안 되는 것' 첫 줄: 1단계 회화는 둘째 프리뷰까지 닫힘(위험 14, 컨트롤러).

## 9. 다음 라운드

I-1 · I-2 를 고친 fix 1 을 받고, 재검토는 그 두 항목과 fix 가 건드린 시험 파일만 본다. M-1 · M-2 는 같은 fix 에 묶기 좋다(시험 한두 줄씩).
