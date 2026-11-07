# 구현 보고: e2e 첫 실행 고침 1 — 회화 도우미 · 회화 e2e(impl-e2e-1, 2026-11-05)

상태: DONE_WITH_CONCERNS. 워크트리 p13d(HEAD ed5d845)에서 맡은 파일 넷만 고쳤습니다. e2e 는 이 Mac 에서 돌리지 못해 코드 줄 대조로만 확인했습니다. diff 는 스크래치패드 `fix1-diff.txt` 에 있습니다(4 파일, +140 −42).

## 1. 묶음별 바꾼 줄과 대조한 코드 줄

| 묶음 | 바꾼 줄 | 대조한 코드 줄 |
|---|---|---|
| A(18) | `tests/e2e/talk.ts:131~154`(함수 140) talkHousehold: 단계가 LEVEL_MIN 보다 크면 insertHousehold 를 `withHouseholdSetting("seed.complete_through_level", LEVEL_MAX, …)` 로 감쌈. 집 넣기 동안만 올리고 되돌림 | 던진 자리 `src/core/profile/start.ts:199~216` trackStartsOf(범위 검사). 같은 꼴 `tests/e2e/lessons.ts:107` atLevel. 집 넣은 뒤 범위 끝을 읽는 곳은 수업 시작 판정 `src/server/session/index.ts:590~594` → `src/core/lesson-list/state.ts:547` 뿐이고, openTalkSession 은 세션을 바로 넣어 이 판정을 거치지 않음 |
| B(7) | `talk.ts:156~179`(함수 165) 새 도우미 skipStartPrep(profileId, level): 프로필 설정 행 `talk.prep_mode.<구간>` = when_needed 를 넣음(집 비우기로 함께 지워짐). 부르는 곳: `required-utterance.spec.ts:163` openTalkAt, `required-recovery.spec.ts:266` openTalkAt, `teacher-window.spec.ts:267` openWindowTalk(견본을 넘기지 않을 때만, 칭찬 시험은 설정 그대로). `talk.ts:412~419` greetingTalkLesson 주석을 '카드만으로는 준비 토막이 없어지지 않는다'로 고침 | `src/server/conversation/index.ts:1122~1131` prep_mode always 일 때만 startPrepWordsOf, when_needed 면 빈 계획. `src/core/conversation/chances.ts:290~297` 카드 prep 이 비면 노리는 단어에서 고름. `index.ts:1086~1094` 노리는 단어 = required · more targets. `index.ts:432~448` 계획이 비면 인사 뒤 talk 로. 프로필 행이 집 행보다 앞섬 `src/server/settings/index.ts:62~100` getSettings, 세션 상태가 profileId 로 읽음 `src/server/conversation/state.ts:674~677`. 값 꼴 `src/core/conversation/lesson-turns.ts:100` TALK_PREP_MODES |
| E(1) | `teacher-window.spec.ts:629~640` 따라 말하기 대본을 `card.todayWords` 에서 그 낱말의 modelLine 으로 | 쪽지 들려줄 말 `src/components/conversation/follow-along.tsx:530~539`(1~3단계 say = modelLine), 서버 출처 `src/server/conversation/index.ts:728~749` prepNoteOf(카드 오늘 쓸 말 먼저). 견본 `tests/fixtures/seed/builders.ts:2088~2089`(prep ⊂ newWords) · `2200~2212`(todayWords = newWords, 낮은 구간 modelLine = childLine) |
| F(1) + :421 | `required-utterance.spec.ts:122~154` recordTurnSends(init script 로 window.fetch 를 감싸 회화 턴 경로를 부른 때의 performance.now 를 남김) · turnSendsOf. `:171` openTalkAt 이 goto 앞에 부름. `:211~227` sentAtOf 가 자원 시간 기록 대신 이 기록을 읽음. screen-sampler 의 requestStartsOf 가져오기는 뺌(파일은 그대로) | 앱은 `src/lib/talk-stream.ts:62 · 67` 에서 전역 fetch(기본 인자 — 부를 때 window.fetch)로 보냄. 표본 시각도 쪽 performance.now(`tests/e2e/screen-sampler.ts:73`)라 같은 시계. 붙잡기 `delayTurnRequests` 는 fetch 뒤 route 에서 기다리므로 보낸 시각에 들지 않음. :421 끝인사 시험도 같은 sentAtOf 를 씀 |
| N(1) | `required-recovery.spec.ts:658~697` N-9 장면을 C80 대로: 첨삭이 온 초고 + 상한 날 → 홈 '첨삭이 왔어요' → 바로 `/session/…`, 첫 활동 feedback-praise · 칭찬 글, 세션 행 `{ lessonId, writingPart: "rewrite" }`, 홈 요청 0. 머리 주석 6~7줄도 고침 | `src/server/session/index.ts:603~605` 상한이어도 rewrite 는 막지 않음, 홈 쪽지는 startLesson 으로 감(`src/app/(child)/home-cards.tsx:580~607`), 세션 화면은 rewrite 면 aiNeeded 가 거짓이라 쉼을 보이지 않음(`index.ts:1602~1616`). 단언 꼴은 같은 파일 N-13(`:955~972`)과 같음 |
| flaky | `required-recovery.spec.ts:297~313` turnRows 를 `orderBy(turnNo, speaker)` 로 | 앱 차례 `src/server/conversation/state.ts:145~152` sortTurns(같은 차례면 tori 먼저), enum 차례 `src/db/schema/content.ts:67` ["tori", "child"] |
| G 몫 | `required-utterance.spec.ts:40 · 625~626` 말하기 1단계 수업 번호 92 → **95**(숫자 대신 `E2E_LESSON_NO.requiredUtteranceQuestions` 를 가져다 씀) | impl-e2e-2 가 정한 번호표 `tests/e2e/lessons.ts:58~70` E2E_LESSON_NO: 91 speaking 질문만 · 92 speaking 따라 말하기 문장만 · 93 speaking 상한 날 · 94 speech-feedback 듣기만 · 95 required-utterance 질문 답 · 가르치는 수업 81. 처음에 96 을 알렸다가 impl-e2e-2 의 답을 받아 95 로 맞춤 |

## 2. 설계와 다르게 한 것과 이유

- **B 는 견본이 아니라 프로필 설정으로 풀었습니다.** 노리는 단어(targets)를 비우면 선택지 검사(`src/core/conversation/question-check.ts:251~263` no_target), 질문 검사, 힌트 · 단어 기록(`lesson-flow.ts:191 · 601`, `lesson-turn.ts:783`)이 함께 바뀌어 시험의 뜻이 흔들립니다. 프로필 행은 서버가 짧은 준비 계획만 비우게 합니다. 근거는 4단계(when_needed) N-12 가 대화 턴까지 간 기록입니다.
- **flaky 둘째 정렬은 recorded_at · id 가 아니라 speaker 입니다.** id 는 무작위 uuid(`learning.ts:184`)이고, recorded_at 은 같은 시험의 pastTurnInFlight(`talk.ts`)가 아이 행을 5분 물립니다. speaker enum 차례가 앱 sortTurns 와 같습니다.

## 3. 요청하는 변경(내 파일 밖)

- **speech-feedback.spec.ts:114 도 B 에 걸립니다.** greetingTalkLesson(1) 을 쓰는데 skipStartPrep 을 부르지 않습니다. 맡은 구현자가 talkHousehold 뒤에 `await skipStartPrep(profileId, 1)` 한 줄을 더하면 C 를 고친 :295(U5-4)가 준비 쪽지에 막히지 않습니다. 단 `full` 견본(talkLessonCard) 갈래는 부르지 않아야 합니다.
- UI · UX spec 표의 N-9 한 줄(C80 경우)은 컨트롤러 몫 그대로입니다.

## 4. 관문(워크트리 p13d, 다른 구현자의 미커밋 변경 포함)

- `pnpm biome ci`(내 파일 넷): 통과, 고칠 것 없음.
- `pnpm biome ci`(전체): 오류 1 · 경고 1. 오류는 `tests/e2e/lessons.ts:15` useImportType 이고 고침 2 담당이 수정 중인 파일입니다. 내 파일에서는 나지 않습니다. 출력은 스크래치패드 `fix1-biome-ci.txt`.
- `pnpm exec tsc --noEmit`: 0.
- `pnpm vitest run --project unit`: 143 파일 · 1792 통과 · 6 todo · 실패 0(`fix1-unit.txt`).
- e2e: 돌리지 않음(시험용 Postgres 없음).

## 5. 다음 CI 에서 새로 드러날 수 있는 것

- **talk-lesson 17건이 처음으로 화면을 지납니다.** 3단계 견본의 짧은 준비 낱말은 e2e DB 값 1개(prep_words 1)라, 낱말 여럿을 가정한 단언이 있으면 걸립니다. 또 그 시험이 수업 목록에서 새 수업을 여는 길(다음 이야기 · 다시 하기)을 타면 범위 끝 1 때문에 beyond_seed 로 막힙니다. 지금 talk-lesson.spec 에는 그런 누름이 보이지 않습니다.
- **F 의 fetch 감싸기는 이 시험 쪽에만 있습니다.** 앱이 나중에 회화 턴을 fetch 밖(예: EventSource)으로 보내면 sentAtOf 가 '보낸 기록 없음'으로 실패합니다. 실패 글로 바로 드러납니다.
- **required-utterance:302 셋째 턴(선택지를 말해 바로 보냄)은 B 뒤 처음 닿습니다.** 이번 실행은 둘째 턴에서 멈춰 그 뒤는 검증되지 않았습니다.
- teacher-window:899 등 B 행의 뒷부분도 이번에 처음 닿습니다.

## 6. 남은 우려

- 번호는 impl-e2e-2 의 번호표(95)와 맞췄습니다. 표의 값을 가져다 쓰므로 표가 바뀌어도 이 파일은 따라갑니다. 단 required-utterance 는 lessons.ts 의 E2E_LESSON_NO 가 있어야 컴파일됩니다(두 고침을 함께 커밋해야 함).
- 분류 보고 6절의 withHouseholdSetting 시간 초과 약점은 talkHousehold 쪽에서 감싸는 범위를 집 넣기 한 번으로 줄여 피했습니다. 다른 곳의 약점은 그대로입니다.
