# 구현 보고: iPad '못 듣는 마이크' 감지 · 기록 칸 · 쪽지 되돌아감 고침(impl-mic-1 · Opus · high, 2026-11-06 08시)

상태: DONE_WITH_CONCERNS. 관문 다섯은 모두 0입니다. 단위 시험은 1943개 통과, 할 일 6개입니다. 실호출은 하지 않았습니다. 커밋은 하지 않았습니다.
iOS 에서는 재현할 수 없어 가짜 음성으로만 검증했습니다. 실제 확인은 요청자 iPad 몫입니다.

## 0. 배포 전에 컨트롤러가 할 일

- **설정 적재가 먼저 필요합니다.** 새 키 셋(`speech.deaf_audiostart_ms` 200 · `speech.deaf_silence_ms` 1500 · `speech.deaf_retry_max` 0)을 `SPEECH_SETTING_KEYS` 에 넣었습니다. `speechSettingsFrom` 은 키가 없으면 던지므로, 개발 DB 에 적재하기 전에 배포하면 음성 설정을 읽는 모든 화면(회화 턴 · 말하기 · 배치 · 결과)이 실패합니다(T-157 과 같은 꼴). 배포 전에 `seed:load` 로 설정을 넣어야 합니다.

## 1. 바꾼 것(워크트리 p13d)

### 감지(브리프 1)
- `src/core/speech/listen.ts`
  - 설정 키 셋과 `SpeechSettings` 칸 셋을 더했습니다(81 · 151줄 부근, 서버가 읽는 목록 `SPEECH_SETTING_KEYS` 에 듦).
  - `DeafRule` · `deafRuleOf`(200 · 207줄)를 더하고 `EndRule.deaf` 를 선택 칸으로 두었습니다.
  - `ListenOutcome` 에 `{ kind: "deaf"; audiostartMs; retries }`(338줄)를 더했습니다.
  - 상태 기계 입력 `audio` · `sound` 를 더했습니다. 둘 다 신호로 세지 않으므로 감시 타이머 동작은 그대로입니다.
  - 판정(626줄 부근): 이 듣기에 소리 · 결과 · 모은 글이 없고, 지금 객체의 start → audiostart 가 문턱보다 빠르면 기한(audiostart + silence)을 둡니다. 소리나 결과가 오면 기한을 지웁니다.
  - 기한이 지나면 `onDeaf`(566줄)가 돕니다. `retryMax` 번까지는 옛 객체를 abort 하고 조용히 새 객체를 엽니다. 그 수를 넘으면 `finishDeaf`(553줄)가 abort 하고 deaf 로 끝냅니다. `retryMax` 기본값은 0 이라 다시 열지 않습니다.
  - `deafOr`(576줄): 의심 중에 결과 없음이나 말소리 없음(iPad 의 aborted 'No speech detected')으로 끝나면 deaf 로 바꿉니다. 그 밖의 끝은 그대로 둡니다.
- `src/lib/speech/browser.ts`: `attach()` 가 audiostart 를 `audio`, soundstart · speechstart 를 `sound` 로 상태 기계에 넣습니다(242줄). `INPUT_ORDER` 에 두 입력을 더했습니다.
- `src/core/conversation/listen.ts:73`: `talkEndRuleFor` 가 모든 꼴(대화 · 따라 말하기 · 평가)에 `deaf` 를 싣습니다. 그래서 말하기 세션 · 배치 평가의 듣기는 바뀌지 않습니다.

### 아이 화면(브리프 2)
- 문구 `CHILD_TURN_TEXT.micDeaf` 는 "마이크가 안 잡혔어요. 한 번 더 눌러 주세요"입니다(`child-turn.tsx:71`). 정본 7절에 이 행의 문구가 없어 브리프 예시를 그대로 썼습니다(정본 밖 문구).
- 대화 차례(`child-turn.tsx:470`): deaf 면 `onSpeech` 를 부르지 않고 한 줄만 보인 뒤 돌아갑니다.
  - 틀의 실패 셈(여섯 번 셈)에 넣지 않습니다.
  - 같은 질문 말소리 없음 셈(`talk.nospeech_dontknow_count`)에 넣지 않습니다.
  - 회색 '못 들었어요'를 보이지 않고 턴도 보내지 않습니다. 말하기 단추는 그대로입니다.
- 쪽지 · 정리(`follow-along.tsx:311 · 339`): 듣기가 `"deaf"` 를 돌려주면 `tryOnce` 가 한 줄만 보이고 끝냅니다. 틀 셈 · 그 차례 실패 수 · 건너뜀에 들지 않습니다.
- `speechEventOf` 는 deaf 에서 없음을 돌려줍니다(`core/speaking/judge.ts:457`). 중단(interrupted)과 같은 갈래입니다.

### 기록 칸(브리프 3)
- `src/core/conversation/client-listen.ts`
  - `LISTEN_RESULT_PATTERN` 에 `deaf` 를 더했습니다(22줄).
  - 선택 칸 여섯을 더했습니다(50~60줄). 옛 기록도 그대로 읽힙니다.
- `src/lib/speech/listen-log.ts`: 칸 정의는 분석 보고 6.2 를 따랐습니다.

| 칸 | 계산 |
|---|---|
| `pe` | 이 듣기 첫 start 호출 − 그 앞 마지막 인식 객체 end(어느 듣기든) |
| `ss` | 첫 soundstart · speechstart − 첫 start 호출 |
| `rs` | 이 듣기의 start 호출 수 − 1 |
| `ts` | 첫 start 호출 때의 `speechSynthesis` 상태(speaking · pending · idle) |
| `te` | 시작 앞 마지막 읽기 뒤, 듣기 끝까지 처음 온 알림(end · timeout · cancel · error). cancel 은 interrupted · canceled 입니다 |
| `hid` | 앞 듣기 끝(없으면 기록 처음) 뒤, 이 듣기 시작 앞에 쪽이 숨었는가 |

- 이 칸을 채우려고 기록 사건 둘을 더했습니다(`src/lib/speech/types.ts`).
  - `recognizer-call.synth` 는 start 호출 때 읽기만 합니다(`browser.ts:305`).
  - `page-hidden` 사건은 `browser.ts:634` 에서 냅니다.
- 저장은 jsonb 이고 `ClientListenSchema` 를 지나므로 마이그레이션은 없습니다.

### 쪽지 되돌아감(브리프 4, e2e 분류 N1)
- `follow-along.tsx:587` 에 `prepWithDone`(순수)을 더했습니다.
- `PrepNote` 는 남은 차례를 그린 때 한 번만 정합니다(618줄 `useState`). 그래서 틀이 `done` 을 늘려도 그리는 동안 차례가 밀리지 않습니다.
- `PrepCard` 는 저장할 때(들음 · 건너뜀) `onSaved` 를 부릅니다(713 · 722줄).
- `talk-frame.tsx:1559` 의 `onWordDone` 이 `prep.done` 에 그 낱말을 더합니다. 막힘 판이 풀려 쪽지를 다시 그리면 막힌 그 낱말부터 다시 셉니다. e2e U4-5(`speech-feedback.spec.ts:442`)는 고치지 않았습니다. 분류 보고대로 그 시험의 기대가 맞습니다.

### 설정 · 정본
- 새 키는 `seed/settings.json:142-144` · `tests/fixtures/settings.ts:193-195` · `tests/fixtures/speech/settings.json`(관찰 쪽 · e2e 음성 설정) 세 곳에 넣었습니다.
- `specs/09-설정값.md` 114~116줄에 한 줄씩 넣었습니다(C-잠정 · 11-06).

## 2. 설계 · 브리프와 다르게 한 것과 이유

- **허용 목록 밖 파일을 고쳤습니다.**
  - `src/core/speech/listen.ts` 는 설정 목록과 `ListenOutcome` 이 있는 곳입니다. 판정을 순수 상태 기계에 두어야 단위 시험이 됩니다.
  - `src/core/conversation/listen.ts` 는 회화 규칙에만 감지를 켜는 곳입니다.
  - `src/core/speaking/judge.ts` 는 `speechEventOf` 의 case 한 줄입니다.
  - `src/core/speech/script.ts` 는 기록 대본 Zod 입니다(새 설정 칸 · `EndRule.deaf` · deaf 결과).
  - `src/app/dev/speech-probe/speech-probe.tsx` 는 switch 의 case 둘이고 tsc 때문입니다. `/dev/mic-probe` 는 건드리지 않았습니다.
- **e2e 를 U4-5 밖에서 하나 고쳤습니다.** `tests/e2e/talk.ts:277` `webkitSilentRun` 의 audiostart 를 100 에서 400 으로 바꿨습니다. 100 이면 새 감지가 deaf 로 끝내므로, 그 듣기를 쓰는 회화 e2e 셋이 깨집니다(AC-15s · C148 AC-N3 · 7절 말하기 버튼 행). 이 시험들은 마이크가 듣는데 아이가 말하지 않은 꼴을 뜻하므로 늦은 audiostart 가 맞습니다. `saidRun` · `lateSoundRun` 은 소리가 기한 안에 오므로 그대로입니다(lateSoundRun 은 1500 대 1600 으로, 100ms 차이밖에 없습니다).
- **brief 1 의 '1500 안에 소리 없음'을 넓혔습니다.** 의심 중에 말하기 단추 · 브라우저 끝으로 결과 없음이나 말소리 없음이 되어도 deaf 로 셉니다(`deafOr`). 아이가 1.5초 안에 단추를 누르면 iPad 에서 같은 꼴이 말소리 없음으로 세어지기 때문입니다. 분석 보고 5절 의사 코드도 이 갈래에서 바꿉니다.
- `fake-web-speech.ts` 는 고치지 않았습니다. 대본의 audiostart 시각을 그대로 내므로 빠른 audiostart 장면을 그대로 만들 수 있습니다.
- 다시 열기의 자리(`retryMax`)는 상태 기계에 두었고 시험도 있습니다. 기본값 0 이라 켜지지 않습니다.

## 3. 요청하는 변경(정본 · 결정, 컨트롤러 몫)

- 13절 한 줄: 분석 9절 D2 · D5 입니다. 입력 막힘 꼴을 아이 실패로 세지 않는 것과 client_listen 칸 여섯(C149 보완)입니다.
- 7절 오류 행에 'deaf' 갈래와 문구를 적어야 합니다. 5절 client_listen 칸 설명에는 o deaf 와 칸 여섯을 적어야 합니다. 저는 09절만 고쳤습니다.
- 배포 전에 `seed:load` 가 필요합니다(0절).

## 4. 덮는 시험

- `tests/unit/talk-mic-deaf.test.ts`(새, 14개)
  - 상태 기계: 빠른 audiostart(41ms)에 소리가 없으면 deaf 이고 abort 합니다. 297ms 에 소리가 있으면 result, 41ms 뒤 결과가 오면 result 입니다. 의심 중 단추 → no-speech 는 deaf 입니다. deaf 규칙이 없으면 no-speech 그대로입니다. retryMax 1 은 다시 연 뒤 deaf(retries 1)이고, 옛 객체의 일은 버립니다. 설정 키 목록과 키가 빠지면 던지는 것도 봅니다.
  - 셈: `speechEventOf(deaf)` 는 없음입니다. 그래서 no-speech 처럼 셈이 오르는 일이 없습니다. 문구는 대화 · 쪽지가 같은 줄을 씁니다.
  - 음성 접점 + 가짜 Web Speech + 듣기 요약: 41ms 이면 o deaf · as 41 · snd 거짓 · rs 0 · hid 거짓이고 Zod 를 지납니다. 297ms 이면 o result · ss 400 입니다. 41ms 뒤 결과가 오면 result 입니다. retryMax 1 에서 둘째 객체가 들으면 result · rs 1 입니다.
  - 쪽지: `prepWithDone` · `prepStepsOf` 로 막힌 그 낱말부터 셉니다.
- 고친 시험
  - `tests/unit/talk-listen-log.test.ts`: 기대 요약에 새 칸(te cancel · end, pe 2680, ss 200, rs, hid)을 넣었습니다.
  - `tests/unit/conversation-listen.test.ts`: 회화 규칙에 deaf 를 넣었습니다.

## 5. 실행 명령과 결과

- PATH 는 Node 24 입니다. 출력 전문은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/` 의 mic1-biome.txt · mic1-tsc.txt · mic1-unit.txt · mic1-trace.txt · mic1-seed.txt 에 있습니다.

| 관문 | 결과 |
|---|---|
| `pnpm biome ci .` | 0(601 파일) |
| `pnpm exec tsc --noEmit -p .` | 0 |
| `pnpm test` | 0, 151 파일 · 1943 통과 · 6 할 일 |
| `pnpm spec:trace` | 0(missing-test 줄은 원래 있던 P12 몫) |
| `pnpm seed:validate` | 0(경고는 원래 있던 talk 목표) |

- e2e 와 통합 시험은 이 Mac 에서 돌리지 않았습니다. U4-5 와 회화 e2e 셋은 CI 에서 확인해야 합니다.

## 6. 남은 우려

- **U1(Important): 기기를 가리지 않습니다.** 분석 5절은 처음에는 iPad 에서만 갈래를 바꾸자고 권했습니다. 브리프에 그 조건이 없어 모든 기기의 회화 듣기에 켰습니다. iPad 밖 기기의 audiostart 기록은 없습니다. 데스크톱 Chrome 이나 Android 에서 audiostart 가 200ms 아래로 오고 조용한 방이면, 아이가 말하기 전 1.5초 동안 soundstart 가 없어 잘못 deaf 가 될 수 있습니다(추정). 프리뷰에서 다른 기기의 client_listen as 를 보고, 필요하면 `describeDevice` 로 iPad 에서만 켜는 판단이 필요합니다.
- **U2: 회복 수단이 없습니다.** deaf 는 셈에 들지 않으므로 막힘 화면 · 부모 알림도 생기지 않습니다. 같은 꼴이 계속되면 아이는 한 줄 안내만 되풀이해 봅니다. 회복 전략은 관찰 쪽 측정 뒤에 정합니다(브리프 맥락). 한 세션에서 deaf 가 이어질 때의 상한 · 안내는 정해야 할 일입니다.
- **U3: 다시 열기는 누름 밖에서 합니다.** `deaf_retry_max` 를 올리면 타이머가 새 객체를 엽니다. iOS 에서 누름 밖 start 가 되는지는 확인되지 않았습니다(분석 5절 (a)). 그 키를 올리기 전에 관찰 쪽 B 전략의 결과가 필요합니다.
- **U4(Minor): 옛 기록 대본을 못 읽습니다.** `script.ts` 의 기록 대본 설정 칸이 필수가 되어, 저장소 밖에 둔 옛 관찰 쪽 기록 대본(observed.settings)은 읽히지 않습니다. 저장소 안에는 그런 대본이 없습니다.
- **U5(Minor): 다시 연 객체의 as 는 남기지 않습니다.** 요약 as 는 여전히 첫 객체만 봅니다(분석 U4). 대신 rs 로 다시 연 수는 보입니다.
- 워크트리에는 제 작업 전부터 다른 변경이 있었습니다(talk-lesson · lesson-turn 등). 다른 구현자의 `/dev/mic-probe` 파일도 있습니다. 둘 다 건드리지 않았습니다.

## fix round 1(2026-11-06 08시, 컨트롤러 지시: 우려 U1 닫기 — 감지를 켤 기기를 설정값으로)

상태: DONE. U1 은 닫혔습니다. 관문 다섯은 모두 0이고, 단위 시험은 1953개 통과 · 6개 할 일입니다(새 시험 일곱 포함). 실호출은 하지 않았습니다.

### 바꾼 것
- 새 키 `speech.deaf_detect` 를 더했습니다. 값은 ios · all · off 이고 기본값은 ios 입니다.
  - 설정 목록과 읽기: `src/core/speech/listen.ts` 의 `DEAF_DETECT_VALUES`(52줄)와 `SPEECH_SETTING_KEYS`(95줄)입니다. `speechSettingsFrom` 이 이 키를 읽고, 그 밖의 값이면 던집니다.
  - 기본값 파일: `seed/settings.json:145` · `tests/fixtures/settings.ts:197` · `tests/fixtures/speech/settings.json:25` 입니다.
  - 기록 대본 Zod 에도 이 칸을 더했습니다(`src/core/speech/script.ts:105`).
  - 정본은 `specs/09-설정값.md:117` 한 줄입니다(C-잠정 · 11-06).
- 순수 함수 셋을 더했습니다(`src/core/speech/listen.ts`).
  - `isIosWebkit`(228줄)는 기기 판정 이름이 iPad · iPhone 으로 시작하는지 봅니다. 이 이름은 client_listen 의 br 을 만드는 `describeDevice` 의 것입니다. iOS 의 브라우저는 모두 WebKit 이라 iPad Chrome 도 듭니다. iPadOS 13+ 의 데스크톱 꼴 UA 도 터치 점으로 iPad 가 됩니다.
  - `deafDetectsOn`(233줄)은 all 이면 켜고, off 면 끄고, ios 면 `isIosWebkit` 를 따릅니다.
  - `deafRuleForDevice`(243줄)는 감지를 켜지 않는 기기에서 규칙의 deaf 칸만 뺍니다.
- 음성 접점 `src/lib/speech/browser.ts:196`: `listen()` 이 시작할 때 `deafRuleForDevice(규칙, settings.deafDetect, device())` 로 규칙을 맞춥니다. 감지를 켜지 않은 기기의 듣기는 fix 1 전과 같은 말소리 없음 갈래로 가고, 같은 질문 셈에도 듭니다. 기록 사건 listen-begin 에는 맞춘 규칙이 남습니다.
- 회화 규칙(`talkEndRuleFor`)은 바꾸지 않았습니다. 화면 쪽 코드도 그대로입니다.

### 설계와 다르게 한 것
- 기기 판정을 화면에서 하지 않고 음성 접점 한 곳에서 합니다. 대화 차례와 쪽지 · 정리가 같은 길을 쓰고, 화면에 기기 값을 넘기지 않아도 됩니다.
- `device.ts` 는 고치지 않았습니다. 판별은 기기 판정 이름을 읽는 `listen.ts` 의 순수 함수에 두었습니다.

### 덮는 시험(`tests/unit/talk-mic-deaf.test.ts`, 21개)
- (1) 기본값 ios 에서 데스크톱 크롬 UA 는 audiostart 50ms 에 침묵이어도 deaf 가 아닙니다. 상한에서 말소리 없음으로 끝나고, 같은 질문 셈(`silentListenOf`)에 듭니다.
- (2) iPad UA 는 지금 시험대로 deaf 입니다. 앞 장면 넷이 iPad UA 로 돕니다. iPadOS 의 데스크톱 꼴 UA 와 터치 점 5 도 deaf 입니다.
- (3) all 이면 데스크톱 크롬도 deaf 입니다. off 면 iPad 도 말소리 없음입니다.
- 순수 함수로 `isIosWebkit` · `deafRuleForDevice` · `deafDetectsOn` 을 보고, 그 밖의 값(android)은 던지는지 봅니다.
- e2e `tests/e2e/talk.ts` 의 webkitSilentRun 400ms 는 그대로 둡니다. e2e 는 iPad Pro 11 UA 라 감지가 켜집니다.

### 실행
- 출력 전문은 스크래치패드의 mic1-fix1-biome.txt · mic1-fix1-tsc.txt · mic1-fix1-unit.txt · mic1-fix1-trace.txt · mic1-fix1-seed.txt 에 있습니다.

| 관문 | 결과 |
|---|---|
| biome ci | 0 |
| tsc | 0 |
| 단위 | 0, 151 파일 · 1953 통과 · 6 할 일 |
| spec:trace | 0 |
| seed:validate | 0 |

### 배포 전 적재(컨트롤러 몫)
배포 전에 `seed:load` 로 아래 네 키를 개발 DB 에 넣어야 합니다. 없으면 음성 설정을 읽는 모든 화면이 실패합니다.

| 키 | 기본값 | 바꾸는 곳 |
|---|---|---|
| speech.deaf_audiostart_ms | 200 | 고급 |
| speech.deaf_silence_ms | 1500 | 고급 |
| speech.deaf_retry_max | 0 | 고급 |
| speech.deaf_detect | ios | 고급 |

### 남은 우려
- 앞 U2(이어지는 deaf 의 회복 · 안내 없음)와 U3(누름 밖 다시 열기)는 그대로입니다. U4 · U5 도 그대로입니다.
- 실제 iPad 확인은 요청자 몫이고, e2e 는 CI 에서 확인해야 합니다.
- 다른 구현자의 파일(`question-check.ts` · `talk-lesson.ts` · `lesson-turn.ts` · `lesson-flow.ts` · `src/app/dev/mic-probe/`)은 건드리지 않았습니다.

## fix round 2(2026-11-06 09시, 검토 rev-mic-1 `task-mic-review.md` 의 구현자 몫)

상태: DONE_WITH_CONCERNS. I-1 · I-2 · M-1 · M-2 · M-3 은 닫았습니다. 관문 다섯은 모두 0이고, 단위 시험은 1960개 통과 · 6개 할 일입니다(talk-mic-deaf 27개). 실호출은 하지 않았습니다.

### A. I-1 기록 칸 상한
- `src/core/conversation/client-listen.ts:11` 이 서버 꼴의 상한 `CLIENT_LISTEN_MS_MAX`(600,000)를 내보냅니다.
- `src/lib/speech/listen-log.ts:22` 의 `clampListenMs` 가 요약의 ms 칸 여섯(d · as · fr · tc · pe · ss)을 0 ~ 상한으로 자릅니다. 상한에 걸린 값은 상한 그대로 남으므로 '10분 이상'임을 알 수 있습니다. 기존 칸 tc 도 같이 자릅니다(검토 범위 밖 관찰).
- 그래서 10분 넘게 쉰 뒤의 턴 요청과 따라 말하기 저장이 Zod 에서 거절되지 않습니다.

### B. I-2 이어진 마이크 안 잡힘(13절 C210 보완, 컨트롤러 잠정)
- 새 키 `speech.deaf_skip_after` 를 다섯 곳에 넣었습니다. 기본값은 3 이고 1 이상만 받습니다.
  - `seed/settings.json:146` · `tests/fixtures/settings.ts:199` · `tests/fixtures/speech/settings.json:26`
  - `SPEECH_SETTING_KEYS`(`src/core/speech/listen.ts:102`)
  - `specs/09-설정값.md:118`
  - 기록 대본 Zod(`script.ts`)에도 칸을 더했습니다.
- 순수 함수 `deafStreakOf`(`child-turn.tsx:118`)는 deaf 면 하나 늘리고 다른 결과면 0 으로 되돌립니다. 문턱에 닿으면 over 입니다.
- 쪽지 · 정리(`follow-along.tsx`)
  - `useFollowTry` 가 차례마다 이어진 수를 셉니다. 문턱에 닿으면 "마이크가 계속 안 잡혀서 다음으로 넘어가요"를 보이고 `deaf-skip` 을 돌려줍니다(356줄).
  - 정리 카드(479줄)와 쪽지 카드(729줄)는 실패 수를 올리지 않습니다. 대신 사유 `mic_deaf` 로 저장하고, `speech.skip_notice_seconds` 뒤 다음 항목으로 넘어갑니다.
  - 쪽지 낱말은 끝낸 차례(`onSaved`)에도 듭니다. 틀의 셈(`onSpeech`)은 부르지 않습니다.
- 대화 차례(`child-turn.tsx:495`)는 넘기지 않습니다. 같은 횟수 이어지면 안내만 같은 줄로 바꿉니다. 길은 그대로 '잘 모르겠어요'입니다.
- 사유를 받는 꼴
  - `src/core/conversation/attempt.ts:31` 에 `TALK_FOLLOW_SKIPS` 를 두고 mic_deaf 를 더했습니다.
  - 서버 저장 꼴 `src/server/conversation/index.ts:500 · 1718` 이 같은 목록을 씁니다.
  - mic_deaf 로 건너뛴 인사 뒤 쪽지 낱말은 다른 사유처럼 '건너뛴 준비 낱말'(`lesson-input.ts` skippedPrepWordsOf)에 듭니다.

### C. M-1 lateSoundRun 여유
- `tests/e2e/speech-feedback.spec.ts:197` 의 audiostart 를 100 에서 400 으로 옮겼습니다. 문턱 200 보다 늦으므로 의심 자체가 생기지 않아, 기한과 겨루지 않습니다. 이 함수는 브리프가 말한 `talk.ts` 가 아니라 `speech-feedback.spec.ts` 에 있습니다.

### D. 그 밖의 Minor
- **M-2 닫힘:** `deafListenOf` 를 `silentListenOf` 의 주석 위로 옮겨 주석이 겹치지 않게 했습니다.
- **M-3 닫힘(단언):** ts 값, hid 참과 그 뒤 거짓, pe · tc 상한을 단언하는 시험을 더했습니다. 화면 deaf 갈래를 화면 단위로 누르는 시험은 두지 못했습니다. 단위 시험이 node 환경과 정적 그리기뿐이라 누름을 흉내 낼 수 없기 때문입니다. 대신 카드가 하는 일을 순수 조각과 저장 함수로 되밟는 시험을 두었습니다.
- **M-6 남김:** 배포 순서 문제이므로 컨트롤러 몫입니다. 배포 직전에 개발 DB settings 에서 다섯 키를 조회하기를 권합니다.
- M-4 · M-5 와 I-3 은 `/dev/mic-probe` 몫이라 건드리지 않았습니다.

### 덮는 시험(`tests/unit/talk-mic-deaf.test.ts`, fix 2 에서 6개 더함)
- 11분 뒤 pe · tc 가 상한 그대로 잘려 칸 · 요청 꼴 Zod 를 지나는지 봅니다. `clampListenMs` 의 반올림 · 0 아래 · 상한 위도 봅니다.
- M-3 의 ts · hid 를 봅니다.
- `speech.deaf_skip_after` 가 키 목록에 있고 0 이면 던지는지 봅니다.
- `deafStreakOf` 가 셋째에 over 이고, 다른 결과가 끼면 0 으로 되돌리는지 봅니다.
- 쪽지에서 deaf 셋 뒤의 일을 봅니다. 셈의 일이 없고 실패 수는 0 그대로입니다. 저장 요청에는 skipped mic_deaf 가 실리고, 시도 기록 꼴이 그것을 받습니다.
- 안내 문구가 같은 한 줄인지 봅니다.

### 실행
- 출력 전문은 스크래치패드의 mic1-fix2-biome.txt · mic1-fix2-tsc.txt · mic1-fix2-unit.txt · mic1-fix2-trace.txt · mic1-fix2-seed.txt 에 있습니다.

| 관문 | 결과 |
|---|---|
| biome ci | 0 |
| tsc | 0 |
| 단위 | 0, 151 파일 · 1960 통과 · 6 할 일 |
| spec:trace | 0 |
| seed:validate | 0 |

- 중간에 한 번 biome · tsc 가 `/dev/mic-probe` 파일 때문에 실패했습니다. 다른 구현자가 고치던 중이었고, 다시 돌렸을 때는 0이었습니다.

### 배포 전 적재(컨트롤러 몫, 키 다섯)

| 키 | 기본값 | 바꾸는 곳 |
|---|---|---|
| speech.deaf_audiostart_ms | 200 | 고급 |
| speech.deaf_silence_ms | 1500 | 고급 |
| speech.deaf_retry_max | 0 | 고급 |
| speech.deaf_detect | ios | 고급 |
| speech.deaf_skip_after | 3 | 고급 |

### 남은 우려
- **대화 차례 문구가 하는 일과 맞지 않습니다(Minor).** 대화 차례에서는 "다음으로 넘어가요"를 보여도 실제로 넘어가지 않습니다. 지시대로 같은 줄을 썼지만, 아이는 기다리다가 '잘 모르겠어요'를 찾아야 합니다. 대화 차례에만 다른 줄(예: '마이크가 계속 안 잡혀요. 잘 모르겠어요를 눌러도 돼요')을 둘지는 컨트롤러가 정해야 합니다.
- **부모 알림은 아직 없습니다.** I-2 의 두 번째 절반입니다. 지시 범위 밖이라 넣지 않았습니다.
- 앞 U3(누름 밖 다시 열기)와 U4 · U5 는 그대로입니다. e2e 는 CI 에서, 실제 동작은 요청자 iPad 에서 확인해야 합니다.
- 다른 구현자의 파일(`question-check.ts` · `talk-lesson.ts` · `lesson-turn.ts` · `lesson-flow.ts` · `/dev/mic-probe`)은 건드리지 않았습니다.

## fix round 3(2026-11-06, 컨트롤러 지시: 대화 차례 안내 문구)

- 상태는 DONE 입니다. 관문 다섯이 모두 0이고, 단위 시험은 1960개 통과 · 6개 할 일입니다(출력은 스크래치패드 mic1-fix3-*.txt).
- 대화 차례에 `CHILD_TURN_TEXT.micDeafStuck` "마이크가 계속 안 잡혀요. '잘 모르겠어요'를 눌러 넘어가 주세요"를 새로 두었습니다(`child-turn.tsx:78`). 마이크 안 잡힘이 `speech.deaf_skip_after` 번 이어지면 이 줄을 보입니다(502줄). 쪽지 · 정리의 "마이크가 계속 안 잡혀서 다음으로 넘어가요"는 그대로입니다.
- 문구 시험 한 건(`talk-mic-deaf.test.ts`)을 두 줄을 가르도록 맞췄습니다. 시험은 새 줄 원문과, 그 줄에 '잘 모르겠어요' 단추 이름이 드는지를 봅니다.
- 이로써 fix 2 의 문구 우려는 닫혔습니다.
