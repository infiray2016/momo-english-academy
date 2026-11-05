# 브리프 A 구현 보고 — 불편 1차 묶음: 음성 · 듣기 피드백(2026-10-29 18:2x)

상태: DONE_WITH_CONCERNS — 단위 · 형 · 린트 · 의존 · 식별자 관문은 모두 통과했다. e2e 는 새로 썼고 기존 시험의 기다림도 고쳤지만, 로컬에서 임시 Postgres 가 뜨지 않아 한 번도 돌리지 못했다(아래 '남은 우려' 1).

작업 자리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(0c664c3 위, 커밋 안 함). 브리프 B 구현자와 같은 워크트리라 겹치는 파일(talk-frame · session-frame · 설정 셋 · e2e 셋)은 Edit 로 해당 줄만 고쳤고, 고칠 자리를 B 에게 미리 알렸다.

## 1. 바뀐 파일:줄

| 파일 | 줄(지금 판) | 무엇 |
|---|---|---|
| src/core/speech/listen.ts | 20~28 · 36~44 · 52~55 · 103~113 · 121~124 | SpeechSettings 에 칸 넷(speakStartTimeoutMs · speakEndExtraMs · speakCharsPerSecond · skipNoticeMs), SPEECH_SETTING_KEYS 에 키 넷, speechSettingsFrom 이 읽음(없으면 던짐) |
| src/core/speech/pace.ts | 15~41 | 순수 함수 speakWatchOf — 시작 안 옴 상한 · 끝 안 옴 상한(글 길이 ÷ (글자/초 × 빠르기) + 여유) |
| src/core/speech/script.ts | 83~86 | 대본 규격 speechSettingsSchema 에 같은 칸 넷 |
| src/lib/speech/types.ts | 48~50 · 62~66 · 161~162 | ListenCallbacks(text · sound), listen 둘째 인자 형, 기록 speak-event 에 type 'timeout' |
| src/lib/speech/browser.ts | 231~254 · 463~502 | 듣기마다 소리 들어옴(soundstart · speechstart) 한 번 on.sound, speak 감시(시작 안 옴 → no-start, 끝 안 옴 → no-end 기록 뒤 ended 로 끝내고 synth.cancel()) |
| src/components/answer/speak-button.tsx | 8~14 · 22~96 · 101~214 | SPEAK_BUTTON_TEXT('듣고 있어요' · '다 읽은 뒤 눌러요' · '이건 다음에 다시 해요'), speakButtonLabelOf · speakPressOf(순수), trackedSpeech · useSpeakingPort(읽는 중 알림), SpeakButton 의 soundIn(마이크 표시 → 소리 물결, data-sound-in) · waiting(흐림 opacity-50, data-speak-waiting, 누르면 안내 한 줄 data-speak-wait-note) |
| src/components/answer/repeat.tsx | 61~63 · 81~95 · 163 | 배치 따라 말하기에 소리 들어옴 표시 잇기(단추 글 '듣고 있어요'는 조각이 저절로) |
| src/components/session/mic-blocked.tsx | 5~13 · 21~44 · 65~131 | '다시 해 볼래요'(MicRetry 를 넘길 때만) — 누름 처리 안에서 checkMicrophone, 되면 clearMicState + onRecovered, 안 되면 그대로. 확인 중 '아무 말이나 한마디 해 주세요' 한 줄. 순수 micRetryNextOf |
| src/components/session/speaking.tsx | 8~11 · 18~22 · 57~58 · 91~131 · 177~185 · 232~292 · 445~553 | 듣는 중 표시 · 소리 들어옴, 따라 말하기는 useSpeakingPort 로 들어올 때 읽기 · '다시 듣기' 동안 흐림, 따라 말하기 · 1~2단계 질문 답 모두 skip 이면 '이건 다음에 다시 해요'를 speech.skip_notice_seconds 보인 뒤 넘김(data-skipping) |
| src/components/conversation/follow-along.tsx | 17~20 · 32~35 · 72~74 · 321~348 · 399~403 · 426~430 · 498~645 · 736~853 | 오늘 쓸 말 · 말해 보기 카드: 읽는 중 흐림(waiting = sayer.speaking), 정리 카드: waiting = !typed ‖ 읽는 중(전에는 !typed 면 disabled), 소리 들어옴 표시, skip 이면 안내(data-follow-skipped) 뒤 speech.skip_notice_seconds 에 다음 |
| src/components/conversation/child-turn.tsx | 10~13 · 53~59 · 132~168 · 188~194 · 237~291 · 340~346 · 452~498 | nospeechMove 문구 · 말소리 없음 '모름' 전 한 줄 안내(data-nospeech-move, 그동안 단추 끔), 소리 들어옴 표시, 순수 childSaidOf · childTurnOpensOf, 남긴 말풍선 ChildBubble(data-child-said) |
| src/components/conversation/talk-frame.tsx | 91~97 · 320 · 476~489 · 634 · 781 · 955~968 · 1086~1088 · 1131~1133(B 의 변경과 함께라 줄은 18:2x 판) | 아이 차례 여는 효과를 childTurnOpensOf 로(읽기 끝을 기다리지 않음 — R1), 아이 말풍선 상태(보낼 때 세우고 다음 선생님 첫 문장에 지움 · 아래 칸에 그림), 막힘 화면 retry(셈 둘 비우고 막힘 풂), 판 section 에 data-talk-reading |
| src/app/(child)/session/[id]/session-frame.tsx | 1087~1100 | 막힘 화면 retry(말하기 셈 비우고 막힘 풂) |
| seed/settings.json | 112~115 | 새 키 넷(잠정값 3 · 5 · 8 · 1.5, 고급) |
| specs/09-설정값.md(12절 사본) | 93~96 | 같은 네 행 |
| tests/fixtures/settings.ts · tests/fixtures/speech/settings.json | 163~167 · 14~18 | 시험용 설정에 같은 키 |
| tests/unit/speech-feedback.test.ts(새) | 전부 | 단위 13 |
| tests/unit/speech-speak.test.ts · speech-pace.test.ts · mic-check.test.ts | 끝 describe · 설정 머리 | 감시 단위 6, 시험 설정을 고정본에서 읽게 |
| tests/e2e/speech-feedback.spec.ts(새) | 전부 | e2e 8 |
| tests/e2e/conversation.spec.ts | 132~145 · 고르개 9곳 · 정리 다시 읽기 시험 2260~2270 | untilChildTurn 이 읽기 끝(data-talk-reading 없음)까지 기다림, '[data-follow] [data-speak]' · '[data-talk-wrap] [data-speak]' 에 ':not([data-speak-waiting])' |
| tests/e2e/teacher-window.spec.ts | 279~287 · 고르개 2곳 | 같은 고침 |
| tests/e2e/speaking.spec.ts | 157~160 | speakButton 고르개에 ':not([data-speak-waiting])' |

## 2. 설계와 다르게 한 것과 이유

1. **설정 키가 둘이 아니라 넷이다.** 끝 안 옴 상한을 글 길이로 재려면 '1초에 읽는 글자 수'가 필요하다. 고정 상한을 두면 읽기 지문처럼 긴 글이 끝나기 전에 끊긴다. 그래서 speech.speak_chars_per_second(8)를 더했다. 1.5초 안내 시간은 브리프가 키 이름을 정하지 않아 speech.skip_notice_seconds 로 두었다. speech 갈래에 두면 모든 서버 화면 자료가 SPEECH_SETTING_KEYS 로 저절로 싣는다. 그래서 서버 파일을 고치지 않아도 된다.
2. **소리 들어옴 표시는 고리 색이 아니라 마이크 표시를 소리 물결(AudioLines)로 바꾸는 꼴이다.** 고리 바로 안쪽 틈이 카드색(분홍 · 연두)이다. 그래서 고리 색을 카드색 계열로 바꾸면 틈과 섞여 안 보인다. 단추 글 '듣고 있어요'는 브리프 그대로다. 두 문장 이상 답의 '다 말했어요'(C37)는 그대로 이긴다.
3. **'다시 해 볼래요'는 작은 단추(SmallButton)로 막힘 글 아래에 두고 '홈' 큰 단추는 그대로다.** 7절의 '홈' 하나를 쓰는 쪽이 그대로 두게 했다. 마이크 확인은 소리가 들어와야 성공이다(C72). 그래서 확인 중 '아무 말이나 한마디 해 주세요'(첫 실행 C72 안내의 뒷부분, 정본 밖 문구)를 보인다. 배치 막힘 화면에는 retry 를 넘기지 않았다. 브리프 항목 6 의 근거(U4-5 · U6-1)가 세션 · 회화뿐이다.
4. **R2 흐림은 회화 정리 카드(1~3단계 되짚을 말 따라 말하기)에도 걸었다.** 같은 follow-along 조각이다. 전의 '글이 다 흐른 뒤 disabled' 조건(화면 검토 b3 M-1)은 waiting 으로 옮겨 흐림 + 안내가 되었다.
5. **U4-4 안내는 말하기 1~2단계 질문 답의 skip 에도 걸었다.** 같은 조각 안의 같은 일이다. 말소리 없음 막힘(speech-silent)은 막힘 화면이 바로 뜨므로 안내 없이 그대로다.
6. **R1 은 '더 이야기할래?' 고르기에도 같은 판정으로 걸린다.** 고르기 단추는 마이크를 쓰지 않는다. '그만'은 읽기를 멈춘다.
7. **talk-frame 은 '함수 하나'보다 조금 넘었다.** 표시 상태 하나(childSaid)와 그 세움 · 지움 두 줄, 그리기 한 줄을 더했다. 항목 1(R1 효과)과 항목 6(막힘 retry)도 이 파일에 걸려 있다. 판 section 의 data-talk-reading 은 e2e 가 '읽기 끝'을 기다리는 표지다. 아이 차례가 열린 것이 더는 읽기 끝을 뜻하지 않아서 더했다. B 에게 자리를 알렸다.

## 3. 요청하는 변경(공용 파일 · 설계)

- **브리프 밖 파일을 고쳤다(승인 요청).** src/lib/speech/types.ts(형 셋), src/components/answer/repeat.tsx(배치 소리 들어옴), src/app/(child)/session/[id]/session-frame.tsx(막힘 retry), tests/e2e 세 파일(기다림 고침)이다.
- **개발 DB 설정 적용(컨트롤러).** 새 키 넷이 SPEECH_SETTING_KEYS 에 들어 speechSettingsFrom 이 반드시 읽는다. 개발 · 프리뷰 DB 에 이 키가 없으면 말하기 · 회화 · 배치 화면 자료 읽기가 던진다. 시드 설정 적재가 먼저다.
- **정본 반영(UI · UX spec 몫).** 아래 줄이 필요하다.
  - 7절 말하기 버튼 행: 대화 턴은 읽는 중에도 단추를 보임(R1), 따라 말하기는 읽는 중 흐림 + '다 읽은 뒤 눌러요'(R2), 듣는 중 글 '듣고 있어요' · 소리 들어옴 표시.
  - 7절 읽어 주기: 감시 상한 키 셋.
  - 7절 오류 행: '이건 다음에 다시 해요'.
  - 3.3 막힘 문단: '잘 안 들려서 다음으로 가요'.
  - 7절 마이크 행: '다시 해 볼래요' · '아무 말이나 한마디 해 주세요'.
  - 4절 회화 아이 차례: 아이 말풍선을 다음 선생님 턴까지 남김.
  - 13절 C166 에 키 넷 이름.
- **잠정값 실측.** speech.speak_start_timeout_seconds 3 · speech.speak_chars_per_second 8 은 iPad 실측 뒤 정한다. 시작 알림이 3초 넘어 오는 기기가 있으면 그 문장은 읽히지 않고 넘어간다.

## 4. 덮는 시험 이름

단위(tests/unit):
- speech-feedback.test.ts: 'U4-2 말하기 단추: 듣는 동안 글이 '듣고 있어요'로…' · 'U4-2 말하기 단추: … 소리 들어옴 표시(data-sound-in)…' · 'U4-2 음성 접점: 듣는 동안 소리 들어옴(soundstart · speechstart)을 듣기마다 한 번 알린다' · 'R2 말하기 단추: 읽는 중이면 흐리게(data-speak-waiting) 두되 끄지 않는다' · 'R2 말하기 단추: 읽는 중 누르면 … '다 읽은 뒤 눌러요' …' · 'R2 읽는 중 알림: 감싼 음성 접점이 …' · 'U4-4 건너뜀 안내: … '이건 다음에 다시 해요' …' · 'U5-4 '모름' 전환 안내: … '잘 안 들려서 다음으로 가요' …' · 'U6-1 막힘 화면: 다시 해 보기를 넘기면 '다시 해 볼래요' …' · 'U4-5 막힘 화면: 마이크 다시 확인이 되면 같은 자리로 …' · 'U5-9 아이 말풍선: 말로 보낸 턴은 바로 보냈어도 …' · 'U5-1 대화 턴: 끝 줄을 받고 글이 다 흐르면 읽어 주기가 끝나기를 기다리지 않고 …'
- speech-speak.test.ts: 'U5-1 읽어 주기 감시: 시작 알림이 speech.speak_start_timeout_seconds 안에 오지 않으면 …' · 'U5-1 읽어 주기 감시: 시작은 왔는데 끝 알림이 …' · 'U5-1 읽어 주기 감시: 제때 끝난 발화 · 끊은 발화에는 감시가 남지 않는다'
- speech-pace.test.ts: 'U5-1 읽어 주기 감시: 시작 안 옴 상한은 …' · 'U4-4 건너뜀 안내: speech.skip_notice_seconds 를 ms 로 읽는다' · 'U5-1 읽어 주기 감시: 감시 키 · 건너뜀 안내 키가 하나라도 없으면 던진다'
- listen-end.test.ts '음성 설정: 시험용 음성 설정값은 12절 기본값과 같다'(새 키 넷이 12절 사본 · 고정본과 같음을 봄)

e2e(tests/e2e/speech-feedback.spec.ts — **돌리지 못함**):
- 'U5-1 R1 대화 턴: 선생님이 읽는 중에도 말하기 단추가 보이고 누르면 읽기를 멈추고 듣는다'
- 'U5-1 R2 읽어 주기 시작 알림이 오지 않는 기기에서도 감시 상한 뒤 오늘 쓸 말이 열리고, …'
- 'U4-2 회화 듣는 동안 … '듣고 있어요' … 소리 들어옴 표시'
- 'U4-4 회화 오늘 쓸 말 … '이건 다음에 다시 해요' …'
- 'U5-4 회화 … '잘 안 들려서 다음으로 가요'를 보인 뒤 보낸다'
- 'U5-9 U5-3 회화 1단계 … 아이 말풍선이 다음 선생님 턴 첫 문장까지 남는다'
- 'U6-1 회화 막힘 화면의 '다시 해 볼래요' …'
- 'R2 U4-4 말하기 따라 말하기: …'

## 5. 실행 명령과 출력

먼저 쓴 시험이 실패하는 것을 보았다. 첫 실행은 세 파일 34건 가운데 17건 실패였다(speakWatchOf 없음 · 설정 칸 없음 · 조각 내보내기 없음).

```
export PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH
pnpm vitest run --project unit tests/unit/speech-feedback.test.ts tests/unit/speech-pace.test.ts tests/unit/speech-speak.test.ts tests/unit/mic-check.test.ts tests/unit/listen-end.test.ts tests/unit/mic-blocked.test.ts tests/unit/talk-follow.test.ts tests/unit/talk-child-listen.test.ts tests/unit/teacher-speech.test.ts tests/unit/talk-listen-log.test.ts
  Test Files  10 passed (10) · Tests  100 passed (100)
pnpm test
  Test Files  96 passed (96) · Tests  1027 passed | 6 todo (1033)
pnpm lint            → 오류 없음(B 의 작업 중 파일 포함 전체)
pnpm exec tsc --noEmit → 오류 없음
pnpm check:deps      → no dependency violations found (228 modules, 1231 dependencies cruised)
pnpm check:ids       → spec-setting-missing 0 · seed-setting-unknown 0 · setting-default 0 · fixture-setting 0 · code-setting-unknown 0 · design-number 47(모두 전부터 있던 자리, 이번 변경 몫 0)
pnpm exec playwright test tests/e2e/speech-feedback.spec.ts
  → e2e-db 가 뜨지 않음: initdb 'could not create shared memory segment: Cannot allocate memory'(shmget size=56). 샌드박스 안 · 밖 모두 같음
```

## 6. 남은 우려

1. **e2e 를 한 번도 돌리지 못했다.** 로컬 임시 Postgres(embedded-postgres initdb)가 shmget ENOMEM 으로 뜨지 않는다. 그 시각 공유 메모리 세그먼트는 p10 개발 DB 하나뿐이었고 sysctl 한도도 넉넉했다. 그래서 원인을 확정하지 못했다. CI 는 Actions 분 한도(11-01 전 push 금지)로 쓰지 않았다. 새 e2e 8건과 기존 e2e 의 기다림 고침은 검증되지 않은 상태다. 특히 아래 둘이 위험하다.
   - R1 로 아이 차례가 읽는 중에 열린다. 기존 시험 가운데 untilChildTurn 을 거치지 않고 읽힌 글을 보는 곳이 있으면 빨강이 날 수 있다. 훑어본 곳은 모두 untilChildTurn 을 거쳤고, 정리 다시 읽기 시험은 고쳤다.
   - R2 로 따라 말하기 누름이 읽기 끝까지 미뤄진다. 회화 · 선생님 창 · 말하기 e2e 의 고르개에 ':not([data-speak-waiting])' 를 붙여 Playwright 가 기다리게 했다. writing.spec 은 '내 글 소리 내어 읽기'를 건너뛰기만 하고 말하기 단추를 누르지 않아 고칠 곳이 없다.
2. **읽기 시작 알림이 3초 넘어 오는 기기.** 감시가 그 발화를 '끝남'으로 보고 synth.cancel() 한다. 그래서 그 문장은 소리 없이 넘어간다. 잠정값이라 iPad 실측이 필요하다.
3. **회화 아이 말풍선 자리.** 남긴 말풍선은 아래 칸(전 인식 확인 자리)의 오른쪽에 있고, 선생님 기다림 점 셋은 위 말풍선 자리에 있다. C162 의 '앞 질문은 흐리게 둔 채'(보낼 때 말풍선을 비우는 onAttempt)는 이번 범위 밖이라 그대로다.
4. **화면 꼴 검토 필요.** '다시 해 볼래요' 작은 단추의 크기 · 자리, 흐림 opacity-50, 소리 물결 표시, 안내 줄 20px 은 화면 검토자가 보아야 한다.

## 추가 작업(컨트롤러 지시 — B 조각 둘 꽂기, 18:3x)

두 조각 파일이 이미 있어 그대로 꽂았다. 두 파일은 만들거나 고치지 않았다.

| 파일:줄 | 무엇 |
|---|---|
| src/components/conversation/follow-along.tsx:59 · 225~226 | TalkStart '시작!' 단추 아래 `<SilentModeNote />`(아이패드 사파리만 무음 모드 한 줄, U5-8). talk-frame 에 같은 줄이 따로 그려지지 않는 것을 확인했다(겹침 없음) |
| src/components/conversation/child-turn.tsx:41 · 409~412 | 힌트 단에서 글이 아직 없을 때(text === undefined) null 대신 `<HintLoadingDots />`(U5-10) |

다시 돌린 관문: `biome ci` 448파일 고칠 것 없음 · `tsc --noEmit` 오류 없음 · `check:deps` 위반 없음(230 modules, 1238 dependencies) · `pnpm test` 1028 passed | 6 todo. 이 둘의 e2e 확인은 앞 '남은 우려' 1 과 같은 까닭으로 하지 못했다.

## 정정 지시 보류(18:4x)

컨트롤러의 정정 지시는 두 가지였다. 첫째는 힌트 점 셋을 tori.tsx 의 HintLoading 에서 가져오는 것, 둘째는 follow-along.tsx 의 SilentModeNote 를 빼는 것이다. 둘 다 워크트리 상태와 맞지 않아 적용하지 않았다.

- tori.tsx 에는 HintLoading 내보내기가 없다. 그래서 그 이름을 가져오면 형 검사가 깨진다. 대신 B 의 hint-loading-dots.tsx 와 그 시험이 있다.
- talk-frame.tsx 에는 무음 모드 줄이 없다. B 는 메시지에서 그 줄을 걷어 냈다고 하고 A 에게 TalkStart 에 꽂아 달라고 했다. 그래서 SilentModeNote 를 빼면 안내가 화면에서 사라진다.

지금 둔 상태는 다음과 같다. child-turn.tsx 는 `<HintLoadingDots />`(./hint-loading-dots), follow-along.tsx 는 `<SilentModeNote />`(./silent-mode-note)를 그린다. 컨트롤러에게 이 사실을 보냈다. B 가 조각을 옮기면 가져오는 곳과 SilentModeNote 두 줄만 바꾸면 된다.

pnpm lint 는 448파일 오류 없이 통과했다(teacher-window.spec.ts 포함). tsc 는 오류 없고 pnpm test 는 1028 passed 다.

## fix 1(코드 검토 A — Changes requested I 2 · M 9, 브리프 task-ux-fix-a-round1.md, 18:5x~19:1x)

먼저 쓴 시험 8건이 모두 빨강인 것을 보았다(함수 없음 6 · 'child' 가 열림 1 · tc 'cut' 1). 그 뒤 고쳤다. 줄은 19:1x 판이다.

| 지적 | 판정 | 파일:줄 | 덮는 시험 |
|---|---|---|---|
| I-1 힌트 문장 듣기가 선생님 읽기에 끊김 | ADDRESSED | child-turn.tsx:134(onHintListen 속성) · 190~205(listenHint — 읽기 줄을 먼저 멈추고 힌트를 읽음) · 497~505(단추가 listenHint 를 부름), talk-frame.tsx:1193(onHintListen → queue.cancel()) | 단위 'I-1 힌트 문장 듣기: 선생님 읽기 줄이 도는 중 누르면 줄을 먼저 멈추고 힌트가 마지막 발화다'(speech-feedback.test.ts — speakInTurn 으로 읽기 줄을 흉내 내고 발화 차례가 ['One.', 힌트]임을 봄) |
| I-2 U5-4 문구 | ADDRESSED | child-turn.tsx:52~61(nospeechMove 가 함수: '말소리가 안 들려서 {이름}(이/가) 도와줄게요', 문구 표의 teacherNameOf · josa) · 안내 자리(props.teacherName) | 단위 'U5-4 '모름' 전환 안내: … '말소리가 안 들려서 [이름](이/가) 도와줄게요' 한 줄이다'(이름 없음 · 받침 있음 · 없음), e2e 상수 T.nospeechMove '말소리가 안 들려서 미나가 도와줄게요' · 'U5-4 회화 … 보인 뒤 보낸다'(speech-feedback.spec.ts:271) |
| M-1 이어 붙인 질문 전에 아이 차례가 열림 | ADDRESSED | child-turn.tsx:156~182(childTurnOpensOf 에 typedLines · shownLines — 다 흘렀다고 알린 때의 줄 수가 지금 보일 줄 수보다 적으면 안 엶), talk-frame.tsx:320(typedLines 상태) · 486~494(판정에 넘김) · 1133~1137(다 흐름 알림 때 그 줄 수 저장) · 554(따라 말하기 뒤 새 말풍선이면 typedDone 을 내림 — 앞 말풍선의 '다 흐름'이 남는 같은 꼴) | 단위 'M-1 대화 턴: 같은 말풍선에 질문을 이어 붙여 흐른 줄 수가 보일 줄 수보다 적으면 아이 차례를 열지 않는다' |
| M-2 감시 timeout 이 듣기 요약에서 cut | ADDRESSED | listen-log.ts:28(speak-timeout 사건) · 81(timeout 을 따로 읽음) · 88~108(감시가 끝낸 발화는 시작 알림이 없었어도 그때 끝난 것으로 — tc 가 ms) | 단위 'M-2 시작 알림 없이 감시 상한이 끝낸 발화(timeout no-start) 뒤의 듣기는 읽는 중 끊음(cut)이 아니라 감시 끝 뒤 ms 다'(talk-listen-log.test.ts) |
| M-3 따라 말하기 중 막힘 → 쪽을 연 때의 차례로 | ADDRESSED | talk-frame.tsx:896~905(unblockOnRefresh — 새 자료가 오면 막힘을 풂) · 980~992(따라 말하기 중이면 router.refresh() 뒤에 풂, 그 밖은 바로 풂) | e2e 'U4-5 M-3 회화 오늘 쓸 말 둘째 낱말에서 막혔다가 '다시 해 볼래요'로 풀리면 첫 낱말이 아니라 둘째 낱말부터 이어진다'(speech-feedback.spec.ts:378 — **돌리지 못함**) |
| M-6 힌트 받기 실패 때 점 셋이 안 끝남 | ADDRESSED | child-turn.tsx:207~214(hintTierStateOf) · 250(failedTiers) · 각 단 받기에 실패(undefined · 거절)하면 failedTiers 를 세움 · 473~479(받는 중만 점 셋, 실패면 빈 단 — 전과 같음). 조각 hint-loading-dots.tsx 는 안 고침 | 단위 'M-6 힌트 단: 글을 받는 동안은 점 셋, 받기에 실패하면 점을 거두고 빈 단, 글이 있으면 글이다' |
| M-7 쉬는 안내 · 끝인사 아래 아이 말풍선 | ADDRESSED | child-turn.tsx:148~157(childSaidStep), talk-frame.tsx:607(끝인사) · 641(첫 문장) · 685(쉬는 안내) · 789(보냄) | 단위 'M-7 아이 말풍선: 보낸 말은 다음 선생님 말(첫 문장 · 쉬는 안내 · 끝인사)이 오면 지운다' |
| M-8 배치 막힘 화면에 '다시 해 볼래요' 없음 | ADDRESSED | placement-flow.tsx:86~100(micGateAfterRecovery — 판정 전에 막혔으면 안내 · 준비로) · 279~291(retry 를 넘김, 풀리면 막힘 없음 + 마이크 길) | 단위 'M-8 배치 막힘 화면 다시 해 보기: …'(speech-feedback.test.ts — placement-flow 를 서버 액션 빈 모듈로 가져옴) |
| M-5 (다) 막힘 '같은 자리' 시험이 행동을 못 잠금 | ADDRESSED | mic-blocked.tsx:36~58(runMicRetry 로 떼어 냄 — 잠금 풀기 → 확인 → 되면 clear · onRecovered), 단추는 그 함수를 부름 | 단위 'M-5 U4-5 막힘 화면 다시 해 보기: 마이크가 되면 저장된 '쓸 수 없음'을 지우고 같은 자리로, 안 되면 아무것도 하지 않는다'(부름 차례 unlock · check · clear · recovered / 실패면 unlock · check 만) |
| M-4 목표 턴 칭찬 가림 | 고치지 않음(컨트롤러 결정 — 화면 검토 L-9) | — | — |
| M-5 (가) · (나) | e2e 몫으로 둠(컨트롤러 결정) | — | — |
| M-9 새 키 없는 DB 범위 | 코드 고침 없음(컨트롤러 결정 — 개발 DB 적재 끝, L-7 닫힘) | — | — |

설계와 다르게 한 것:
- M-3 은 '새 자료를 다시 읽기'를 골랐다. 다만 막힘을 바로 풀면 옛 차례(첫 낱말)가 잠깐 그려지고 읽기를 시작한다. 그래서 새 자료(view.follow)가 온 뒤에 푼다. 다시 읽기가 실패하면(끊김) 막힘 화면에 남고 '다시 해 볼래요'를 다시 누를 수 있다. 정리 토막(WrapUp)은 서버 자료가 아니라 이 길로 차례를 되살리지 못한다. 정리 중 막히면 정리 첫 줄부터 다시 시작한다(되짚을 말 몇 줄, 저장은 고정 id 라 겹치지 않음).
- M-2 는 감시 끝을 '읽기 끝'으로 세었다. tc 칸은 'cut' · ms 둘뿐이라(core/conversation/client-listen.ts, DB 칸 규격 — A 소유 아님) 감시가 살린 턴을 따로 적는 값(C53 (5))은 두지 않았다. 따로 적으려면 그 규격에 값 하나를 더하는 변경이 필요하다(요청).
- M-6 은 실패 때 빈 단(전과 같음)을 골랐다. 새 문구 '힌트를 못 가져왔어요'는 정본 밖 문구라 넣지 않았다.
- 브리프 밖 파일: tests/unit/talk-child-listen.test.ts 에 onHintListen 속성 한 줄(ChildTurnProps 가 요구).

실행 명령과 출력:

```
export PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH
pnpm vitest run --project unit tests/unit/speech-feedback.test.ts tests/unit/talk-listen-log.test.ts   (고치기 전)
  Tests  8 failed | 17 passed (25)
pnpm test                 → Test Files 99 passed · Tests 1041 passed | 6 todo (1047)
pnpm lint / biome ci      → 450 files, No fixes applied(오류 없음)
pnpm exec tsc --noEmit    → 오류 없음
pnpm check:deps           → no dependency violations found (231 modules, 1243 dependencies cruised)
pnpm check:ids            → 모든 대조 0 · design-number 47(전과 같음)
```

남은 우려: e2e 는 이번에도 돌리지 못했다(이 Mac 의 임시 Postgres). 새 M-3 e2e 와 바뀐 U5-4 e2e 는 정적으로만 맞췄다.
