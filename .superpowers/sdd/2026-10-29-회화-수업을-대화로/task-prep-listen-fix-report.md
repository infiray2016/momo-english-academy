# 보고: 짧은 준비 쪽지의 듣기 시작, iPad 사파리 no-speech 고침(구현자 impl-prep-listen · Opus · high, 2026-11-05 22:2x)

상태: DONE_WITH_CONCERNS. 워크트리 `.claude/worktrees/p13d`(HEAD ed5d845 위, 커밋하지 않음).

## 1. 쪽지와 ChildTurn 의 듣기 시작 길 대조(코드)

| 항목 | 짧은 준비 쪽지(PrepCard, `follow-along.tsx`) — 고치기 전 | 대화 아이 차례(ChildTurn, `child-turn.tsx`) |
|---|---|---|
| 읽는 중 누름 | 단추 흐림(`waiting={sayer.speaking}`), 누르면 듣지 않고 '다 읽은 뒤 눌러요'(7절 말하기 버튼 행 · C166 R2) | 누를 수 있음. 누르면 틀의 읽기 줄을 멈추고 바로 듣기(`onListenStart → queue.cancel()`, C53 (2)) |
| 읽기 멈춤 뒤 쉼 | **없음**. 읽기 끝(끝 알림 · 감시 상한)과 같은 렌더에서 단추가 켜짐 | **코드에도 없음**. `speak()` 가 `speech.listen` 을 바로 부름(child-turn.tsx:435-444) |
| 실제로 생기는 간격 | 낱말 하나("Eat.")라 읽기가 짧고, 아이는 켜지자마자 누름. 읽기 끝 0.7초 안 누름이 흔함 | 선생님 턴이 끝난 뒤 아이가 생각하는 동안 자연스러운 간격이 생김(인사 턴 as 1005ms 는 그 결과이고 코드 쉼이 아님) |
| 듣기 시작 | 누름 처리 안에서 동기로: `unlockFromGesture → listen`(useFollowListen) | 같음(누름 처리 안 동기) |
| 음성 접점 | `browser.ts listen()` 같은 함수. 읽는 중이면 `cancelSpeaking` 뒤 바로 인식 시작, 쉼 없음(browser.ts:182-186) | 같음 |
| 듣기 규칙 | `talkEndRuleFor({ mode: "follow" })`. 8단계 아래는 대화와 같은 끝 조용함 · 상한 | `talkEndRuleFor({ mode: "dialogue" })` |
| '듣고 있어요' · 소리 들어옴 | 같은 `SpeakButton`, `listening` · `soundIn` 을 넘김(follow-along.tsx 쪽지 단추) | 같은 `SpeakButton`, 같은 두 값 |
| 자동 시작 | 없음(누를 때만) | 없음(누를 때만) |
| no-speech 이어짐 | `speech.max_retries` 번째에 건너뜀 'recognition'과 '이건 다음에 다시 해요' | `talk.nospeech_dontknow_count` 번째에 '모름' |

브리프 가설의 앞부분은 코드와 다릅니다. ChildTurn 에는 '멈춤 → 짧은 쉼 → 듣기'가 코드로 없고, 둘 다 같은 음성 접점을 누름 처리 안에서 바로 부릅니다. 차이는 **읽기가 멈춘 뒤 누를 때까지의 간격**입니다. 이것은 10-26 분석 보고(`2026-10-16-1-가-구현/task-talk-speech-analysis-report.md` 12 · 59 · 128줄)의 1순위 후보와 같습니다. C109 가 확인한 것은 '읽기 끝 0.7~2.1초 뒤 누름'뿐이고, 그 아래 빈 곳에서 쪽지가 실패합니다.

'듣고 있어요' 표시도 두 길이 같은 조각과 같은 값을 씁니다. 표시가 안 보였다는 관찰에는 두 가지 설명이 가능하지만, 코드만으로는 어느 쪽인지 가를 수 없습니다(추정).
- (가) 소리가 안 들어와 소리 물결이 끝까지 안 바뀌었고, 그래서 '안 듣는다'고 느꼈다.
- (나) iPad 에서 읽기 끝 알림이 늦어 감시 상한까지 단추가 흐렸고, 그동안 누르면 '다 읽은 뒤 눌러요'만 보였다.

## 2. 고친 것(브리프와 다르게 한 것 포함)

**설계와 다르게 한 것**: 브리프 '할 것' 2는 '읽기 멈춤 → 쉼 → 듣기'를 누름 뒤에 하는 길입니다. 이 길은 쉼 뒤 누름 밖에서 `start()` 를 부르게 됩니다. 앞 분석 보고(N0' · 187줄 (다))는 iOS 에서 누름 밖 start 가 되는지 확인되지 않았다는 이유로 이 길을 권하지 않았습니다. 그래서 차례는 지키되 쉼을 누름 앞에 두었습니다. 읽기 멈춤 → 쉼(설정값) 동안 단추 흐림 → 아이 누름 → 누름 안 동기 듣기입니다. 쉼 동안 누르면 읽는 중과 같이 듣지 않고 '다 읽은 뒤 눌러요'를 보입니다(7절 R2 꼴 그대로).

바꾼 줄은 다음과 같습니다.
- `src/core/speech/listen-gap.ts`(새 파일, 순수): `listenGapMsOf`(14줄)는 쉼 길이를 설정에서 읽고, `listenReadyOf`(27줄)는 읽는 중 · 멈춘 때 · 지금 · 쉼으로 켤 수 있는지와 남은 쉼을 냅니다. 기존 `pauseLeftMs`(pace.ts)를 다시 씁니다.
- `src/lib/speech/speak-settle.ts`(새 파일, 공용 도우미): `createSpeakSettle`(30줄)는 읽기 시작 · 멈춤을 받아 쉼이 지나면 '켬'을 알립니다. 시계 · 타이머를 넘겨받아 window 를 읽지 않습니다. 다른 따라 말하기(말하기 세션 · 가르치는 수업)도 같은 도우미를 쓸 수 있습니다.
- `src/components/conversation/follow-along.tsx`
  - 51 · 55줄: 가져오기 둘.
  - 207-276줄 `useSayer`: 읽기 시작에 `settle.began()`(237), 읽기 끝에 `settle.stopped()`(251), 끊음에 `settle.stopped()`(262), 사라질 때 `settle.dispose()`(269)를 둡니다. `waiting = speaking || !settled`(275)를 돌려줍니다.
  - 774줄 쪽지 말하기 단추: `waiting={sayer.waiting}`.
  - 514줄 정리(WrapCard) 말하기 단추: `waiting={!typed || sayer.waiting}`. 같은 hook 이라 정리 따라 말하기에도 같은 쉼이 들어갑니다. 브리프는 쪽지만 적었지만 같은 결함 꼴이라 함께 맞췄습니다.
- 바꾸지 않은 것은 다음과 같습니다. `browser.ts` · `types.ts`(SpeechPort) · ChildTurn · 표지 이름(`data-speak` · `data-speak-waiting` · `data-listening` · `data-sound-in` · `data-prep-*` · `data-follow-*`)입니다. 건너뜀 길(`speech.max_retries` 번 뒤 skipped recognition · `speech.skip_notice_seconds` 안내)도 그대로입니다(할 것 3).

## 3. 설정 키

- 지금은 `speech.sentence_pause_ms`(기본 700, 읽어 주기 문장 사이 쉼)를 **잠정으로** 씁니다. 코드에 숫자를 두지 않았고, 바꾸는 곳은 `listenGapMsOf` 한 줄입니다. 700 은 C109 가 인식을 확인한 '읽기 끝 0.7초 뒤'의 아래 끝입니다.
- **새 키 제안**: `speech.listen_after_speak_ms`. 범위는 집 전체, 기본 700(잠정, iPad 실측 뒤), 바꾸는 곳은 고급입니다. 뜻은 '따라 말하기에서 읽어 주기가 멈춘 뒤 말하기 단추를 켜기까지 두는 쉼(밀리초)'입니다. 키를 넣으려면 09절 표 · `seed/settings.json` · `SPEECH_SETTING_KEYS`(core/speech/listen.ts) · 시험 설정 fixture 를 함께 고쳐야 합니다. 이 파일들은 맡은 범위 밖이라 컨트롤러에 요청합니다. 7절 말하기 버튼 행에 '읽기가 끝나거나 감시가 끝내면 이 쉼 뒤 켠다'는 한 줄과 13절 결정 한 줄도 필요합니다.

## 4. 시험 · 관문

- 새 단위 시험 `tests/unit/speech-listen-gap.test.ts` 6개:
  - 쉼 길이 설정값
  - 읽는 중 · 읽은 적 없음 · 멈춘 뒤 쉼 경계
  - 읽기 시작에 흐림 → 멈춘 뒤 쉼 동안 누름은 안내 → 쉼이 지나면 누름이 듣기를 엶
  - 쉼 동안 다시 듣기는 쉼을 다시 셈
  - 읽지 않을 때 멈춤 · 거둔 뒤 늦은 알림 없음
  - '듣고 있어요' · 소리 들어옴 · 흐림 표지
- 기존 `tests/unit/talk-follow.test.ts` 는 바꾸지 않았고 그대로 통과합니다.
- 관문 결과(긴 출력은 스크래치패드 `prep-*.txt`)는 다음과 같습니다.
  - tsc 0, `vitest run --project unit`: 143 파일 · 1792 통과 · 6 todo · 실패 0, check:ids 0, check:deps 0.
  - 내 파일 넷의 biome ci 는 0입니다. 전체 biome ci 는 2 오류이고, 둘 다 다른 구현자가 지금 고치는 `tests/e2e/db.ts` · `tests/e2e/lessons.ts` · `tests/e2e/required-utterance.spec.ts` 의 서식 · import type 오류입니다(내 파일 아님, 손대지 않음).

## 5. 다음 e2e(고치지 않음)

- 쪽지 · 정리 e2e 는 이미 `[data-speak]:not([data-speak-waiting])` 를 기다린 뒤 누릅니다. 따라서 쉼은 기다림 안에 들어가고, 단언을 바꿀 것은 없어 보입니다(정적 확인만 했습니다).
  - talk-lesson.spec.ts:144-190
  - teacher-window.spec.ts:652 · 895
  - speech-feedback.spec.ts:219-235
  - required-recovery.spec.ts:592
- 새로 넣을 만한 e2e: 쪽지에서 읽기 끝 직후에는 `data-speak-waiting` 이 남아 있고, 쉼 뒤 사라지는지 봅니다. 가짜 음성의 끝 알림 시각과 단추 켜짐 시각의 차가 쉼 이상인지도 봅니다.

## 6. 첫 프리뷰 뒤 iPad 에서 확인할 것

1. 쪽지 낱말을 읽은 뒤 단추가 짧게(약 0.7초) 더 흐렸다가 켜지는지 봅니다. 켜진 뒤 바로 누르고 말하면 '듣고 있어요' → 소리 물결 → 인식 글이 나오는지도 봅니다.
2. 서버 기록 talk-prep 시도의 clientListen 에서 다음을 봅니다. `tc`(듣기 시작 앞 읽기 끝과의 ms)가 쉼 이상이고, `snd true` · `as` 가 인사 턴(약 1000ms)과 비슷한지 확인합니다. **이번 실패 기록의 `tc` 값을 먼저 보면 가설을 바로 가를 수 있습니다.** tc 가 700 미만이면 가설이 맞고, 1000 이상인데도 실패했으면 다른 원인입니다(아래 우려 1).
3. 정리 토막(1~3단계 되짚을 말 따라 말하기)도 같은지 봅니다.
4. 쉼 동안 누르면 '다 읽은 뒤 눌러요'가 잠깐 보이는지 봅니다. 어색하면 문구 · 쉼 길이를 정합니다.

## 7. 남은 우려

1. **같은 쪽지 안 둘째 · 셋째 시도도 실패했다(eat · drink 각 3번)**. 둘째부터는 앞이 듣기이고 읽기가 아니므로, 아이가 그사이 다시 듣기를 누르지 않았다면 쉼만으로는 설명되지 않습니다. 10-26 분석도 '그 상태가 그 쪽 안에서 이어졌다'고 적었습니다. 쉼이 첫 시도를 살리면 둘째 시도는 생기지 않지만, 첫 시도도 실패하면 다음 길을 실측으로 봐야 합니다. 앞 듣기의 인식 객체를 끝낸 뒤 새 객체 사이의 쉼, Audio Session 은 C109 로 쓰지 않음.
2. ChildTurn 의 '읽는 중 누름 → 바로 듣기'(C53 (2))도 같은 조건을 만듭니다. 이번에는 맡은 범위 밖이라 바꾸지 않았습니다. 대화 턴에서 같은 no-speech 가 보이면 같은 도우미를 쓰는 결정이 필요합니다. 그때는 7절이 읽는 중 누름을 허용하므로 결정 기록이 먼저 있어야 합니다.
3. 잠정 키(`speech.sentence_pause_ms`)를 쓰므로 그 값을 바꾸면 문장 사이 쉼과 듣기 쉼이 함께 바뀝니다. 새 키를 넣을 때 갈라야 합니다.
