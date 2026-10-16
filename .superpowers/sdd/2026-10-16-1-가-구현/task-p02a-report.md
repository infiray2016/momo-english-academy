# 구현 보고: P2a 음성 판정 함수

상태: DONE_WITH_CONCERNS · 작성 2026-10-16 · 구현자(implementer · Opus · high) · 워크트리 `agent-a0ffe8037fa827af6`(바탕 b0be5ae) · git 쓰기 없음

## 바뀐 파일(모두 새 파일, 줄 수는 Biome 꼴 뒤)

| 파일 | 줄 | 무엇 |
|---|---|---|
| `src/core/level-band.ts` | 24 | `BANDS` · `Band` · `bandOf`(1~12 정수 → 1-3 · 4-6 · 7-9 · 10-12, 밖이면 RangeError). 다-6 공용 자리 |
| `src/core/speech/match-rate.ts` | 263 | `NAME_SLOT` · `MatchOptions` · `normalizeForMatch` · `matchRate` · `bestMatchRate`. 정규화 (1)~(6) 값 1 그대로, LCS(나-1) |
| `src/core/speech/listen.ts` | 474 | `SpeechSettings` · `SPEECH_SETTING_KEYS` · `speechSettingsFrom`(:51) · `EndRule` · `endRuleFor`(:93) · `ErrorGroup` · `START_FAILED_CODE` · `classifyRecognitionError`(:133) · `ListenOutcome` · `ListenInput` · `ListenEffect` · `ListenState` · `ListenStep` · `stepListen`(:405) · `startListen`(:449). 감시 타이머 `onWatchdog`(:333) |
| `src/core/speech/device.ts` | 140 | `DeviceFacts` · `DeviceVerdict` · `describeDevice` |
| `src/core/speech/script.ts` | 178 | 대본 규격 Zod(`speechScriptSchema` 와 이벤트 · 실행 · 발화 · EndRule · SpeechSettings · ListenOutcome 스키마), 형(`z.infer`), `DEFAULT_EXPOSE` · `DEFAULT_ON_STOP` · `DEFAULT_ON_ABORT` · `parseSpeechScript` |
| `tests/unit/match-rate.test.ts` | 186 | 9 시험 |
| `tests/unit/listen-end.test.ts` | 885 | 20 시험 + `recorded/` 파일마다 1(지금 0). 대본 흉내 `simulate` · `replayObserved` 는 시험 파일 안 |
| `tests/unit/speech-device.test.ts` | 192 | 6 시험. UA 표본 줄마다 출처 주석 |
| `tests/fixtures/speech/settings.json` | 10 | 12절 키 7개 기본값 + `_source` |
| `tests/fixtures/speech/homophones.json` | 7 | 값 5 의 묶음 다섯 |
| `tests/fixtures/speech/scripts/*.json` | 11 파일 | 값 5 표 그대로: default-ok · one-sentence-ok · multi-sentence-pauses · first-pause-end · alternation-ok · hang-twice · hang-then-ok · not-allowed · network · no-speech · no-recognition-api |

`package.json` · `pnpm-lock.yaml` · 공용 파일 · `src/lib` · `src/app` 변화 0(`git status` 는 위 새 파일만).

## 설계와 다르게 한 것과 이유

1. **감시 타이머가 멈추는 중에도 '아무 일도 없던 객체'를 다시 시작한다(값 2 판정 표와 다름, 7절에는 맞춤).** 판정 표대로면 '듣는 중 · watchdogAt 도달' 줄에 닿을 수 없다. watchdogAt = 마지막 신호 + max_listen + watchdog_extra 이고 마지막 신호 ≥ 객체 시작이므로, chunkAt(객체 시작 + max_listen)과 capAt(begin + max_listen, 한 문장 답)이 늘 먼저 와서 stop 을 부르고 '멈추는 중'이 된다. 그러면 멈춘 객체는 '멈추는 중 · watchdogAt' 줄(stall-after-stop, 다시 시작 안 함)로만 끝나 증명 표의 "감시 타이머: 결과 · 오류 · 끝이 없으면 한 번 다시 시작하고 또 멈추면 '멈춤'으로 끝난다"가 성립하지 않는다. 그래서 감시 타이머 도달 때 이렇게 가른다(`listen.ts` `onWatchdog`).
   - 멈추는 중이고 지금 객체가 시작 뒤 결과 · 오류 · 끝을 하나라도 냈으면 → 표대로 abort, 모은 글로 done(stall-after-stop). 나-2 시험이 이것이다.
   - 그 밖(듣는 중이거나, 멈추는 중이어도 객체가 시작 뒤 아무 일도 내지 않음 = 7절 '시작한 뒤 … 하나도 없으면') → abort 하고 감시 다시 시작 0회면 새 객체, 1회면 '멈춤'.
2. **감시 타이머의 다시 시작은 듣기 창을 새로 잰다(capAt 기준과 조용함 기준을 그때로).** 값 2 는 'capAt 은 begin + capMs'다. 그대로 두면 한 문장 답(cap = max_listen)에서 다시 시작한 객체가 이미 지난 capAt 때문에 곧바로 stop 되어 hang-then-ok 가 '결과 없음'으로 끝난다(다시 시작이 쓸모없다). 다시 시작 뒤 아이가 다시 말할 시간을 준다. 브라우저 스스로 끝 · chunk 의 이어 붙이기는 창을 그대로 둔다.
3. `listen.ts` 는 `Band` · `bandOf` 를 다시 내보내지 않는다. 다-6 결정대로 `src/core/level-band.ts` 에서 가져오게 한 곳으로 모았다(값 2 의 내보내기 목록에는 있었다).
4. `restarts` 는 감시 타이머 밖의 새 객체 수 전부다(브라우저 스스로 끝 · 글 뒤 no-speech · chunk). 표는 브라우저 끝 줄에만 '+1'을 적었다.
5. 판정 표에 없는 코드는 retry 로 둔다(`classifyRecognitionError` 기본값). start() 가 던진 경우의 코드는 `start-failed`(retry).

## 넘친 것(브리프 · plan 밖으로 더한 것)

- `script.ts` 의 `endRuleSchema` · `speechSettingsSchema` · `listenOutcomeSchema`(observed 칸 검증에 필요), `DEFAULT_EXPOSE` · `DEFAULT_ON_STOP` · `DEFAULT_ON_ABORT`(가짜 · 흉내가 같은 기본값을 쓰게. 단 P2b 가짜는 addInitScript 제약으로 값을 가져올 수 없다).
- `listen.ts` 의 `SPEECH_SETTING_KEYS`(키 누락 시험과 12절 대조 시험이 씀) · `START_FAILED_CODE`.
- 증명 표 밖 시험 다섯: "듣기 끝: 단계 구간(1-3 · 4-6 · 7-9 · 10-12)과 답 꼴로 듣기 끝 규칙을 고른다" · "듣기 끝: 새 인식 객체의 start 가 던지면 retry 오류로 끝난다" · "오류 갈래: language-not-supported 는 mic-unavailable, phrases-not-supported · bad-grammar 는 retry(C53)" · "대본: 손으로 쓴 대본은 모두 대본 규격을 통과하고 파일 이름이 대본 이름이다" · "기록 대본 다시 돌려 보기 함수: observed 의 규칙 · 설정 · 버튼 시각으로 돌려 같은 결과를 낸다"(recorded/ 가 비어 있어도 다시 돌려 보기 코드를 덮으려고).

## 요청하는 변경(공용 파일 · 설계)

1. plan-p02 값 2 판정 표에 위 '다르게 한 것' 1 · 2 를 반영해 주기(감시 타이머 줄을 '객체가 시작 뒤 아무 일도 없음'으로 가르고, 감시 다시 시작이 듣기 창을 새로 잰다는 줄). 정본 7절 문장과는 맞으므로 13절 줄은 필요 없다고 본다. 컨트롤러 판단.
2. P2b 에 넘길 것: 기록 대본의 다시 돌려 보기는 **observed 를 차례로 돌리며 recognitions 차례가 observed 를 건너 이어진다**고 보았다(`replayObserved`). 관찰 페이지 내보내기가 이 순서(듣기마다 start() 순서대로 실행을 적고, observed 도 같은 순서)를 지켜야 한다. 다르게 내보내려면 대본 규격에 'observed 마다 몇 번째 실행부터'를 더해야 한다.
3. 다-7(P4 · P8 브리프로 옮길 표기)에 더할 것: 소수(3.5)는 바꾸지 않고 (5)에서 점이 지워져 '35'가 된다. 'a.m.' 은 'am' 이 된다. 시드 문장에 소수 · a.m. 을 쓰지 않거나 낱말로 적는 규칙이 필요하다. 'd 는 늘 would 로 편다(I'd gone 의 had 와 어긋남).

## 덮는 시험 이름(35 + recorded/ 파일마다 1)

`tests/unit/match-rate.test.ts`
- AC-5a 목표 'I have two dogs' 에 인식 'i have 2 dogs.' 는 1, 'I have dogs' 는 0.75 다
- AC-5a 목표에 없는 말을 덧붙여도 감점하지 않는다
- 일치율: 축약형을 펼쳐 견준다
- 일치율: 동음이의어 묶음은 같은 낱말로 본다
- 일치율: 숫자 · 서수 · 시각을 낱말로 바꾼다
- 일치율: 순서를 지킨 낱말만 센다
- 일치율: {NAME} 자리는 아무 낱말 하나와 맞고 빼기를 고르면 분자 · 분모에서 빠진다
- 일치율: 허용 답이 여럿이면 가장 높은 값을 쓴다
- 일치율: 인식이 비면 0, 목표가 비면 오류다

`tests/unit/listen-end.test.ts`
- AC-5e 말하기 1단계 한 문장 답은 마지막 중간 결과 뒤 speech.end_silence_seconds.1-3 만큼 조용하면 stop 을 부르고 끝난다
- AC-5e 말하기 4단계 한 문장 답은 speech.end_silence_seconds.4-6 만큼 조용하면 끝난다
- AC-5e 말하기 6단계 그림 보고 말하기(두 문장 이상)는 2초 쉼 두 번에도 끝나지 않고 말하기 버튼('다 말했어요')을 누를 때 끝난다
- AC-5e 브라우저가 첫 쉼에서 인식을 끝내면 새 인식 객체로 다시 시작해 두 조각을 이어 붙인다
- 듣기 끝: 한 문장 답은 speech.max_listen_seconds 에서 끝나고 두 문장 이상 답은 그만큼마다 끊어 듣고 이어 붙인다
- 듣기 끝: 단계 구간(1-3 · 4-6 · 7-9 · 10-12)과 답 꼴로 듣기 끝 규칙을 고른다
- 듣기 끝: 앱이 끊은 객체와 옛 객체의 일은 버린다
- 듣기 끝: 글 없이 끝나면 '결과 없음', 글 뒤 no-speech 는 한 문장 답이면 끝나고 두 문장 이상이면 다시 시작한다
- 듣기 끝: 말하기 버튼은 abort 가 아니라 stop 을 부른다
- 듣기 끝: cancel 은 abort 하고 '끊김'으로 끝난다
- 듣기 끝: 새 인식 객체의 start 가 던지면 retry 오류로 끝난다
- 감시 타이머: 결과 · 오류 · 끝이 없으면 한 번 다시 시작하고 또 멈추면 '멈춤'으로 끝난다
- 감시 타이머: 다시 시작한 뒤 결과가 오면 이어 간다
- 감시 타이머: stop 뒤 끝이 오지 않으면 모은 글로 끝내고 다시 시작하지 않는다
- 오류 갈래: not-allowed · service-not-allowed 는 mic-unavailable, network 는 network, no-speech · aborted · audio-capture 는 retry
- 오류 갈래: language-not-supported 는 mic-unavailable, phrases-not-supported · bad-grammar 는 retry(C53)
- 음성 설정: 시험용 음성 설정값은 12절 기본값과 같다
- 음성 설정: 키가 하나라도 없으면 읽기가 실패한다
- 대본: 손으로 쓴 대본은 모두 대본 규격을 통과하고 파일 이름이 대본 이름이다
- 기록 대본 다시 돌려 보기 함수: observed 의 규칙 · 설정 · 버튼 시각으로 돌려 같은 결과를 낸다
- 기록 대본 다시 돌려 보기: <파일> <이름>(H2 뒤 `recorded/*.json` 마다 생김, 지금 0)

`tests/unit/speech-device.test.ts`
- 기기 판정: iPad Safari(데스크톱 UA · 터치)는 ok 이고 이름이 'iPad Safari <판>' 이다
- 기기 판정: iPad 의 Chrome(CriOS) · 인앱 브라우저는 not-listed
- 기기 판정: Firefox 는 not-listed, 인식 API 가 없으면 no-api
- 기기 판정: Android Chrome · Windows Edge · Windows Chrome 은 ok
- 기기 판정: 7절 표 밖(macOS Safari · 삼성 인터넷)은 API 가 있으면 ok 이고 listed 는 거짓
- 기기 판정: 안전한 출처가 아니면 insecure

감시 타이머 시험에 AC-N3 를 붙이지 않았다(다-8).

## 시험 먼저

- match-rate: 시험을 쓰고 `pnpm vitest run tests/unit/match-rate.test.ts` → 가져오기 실패(Test Files 1 failed) 확인 → 구현 → 9 통과.
- listen-end: 시험 파일을 listen.ts 보다 먼저 썼으나, 첫 실행은 script.ts · listen.ts 를 쓴 뒤였다. 실패 확인을 위해 listen.ts 를 잠시 치우고 돌려 가져오기 실패(Test Files 1 failed)를 본 뒤 되돌렸다 → 20 통과(첫 실행에서 모두 통과).
- speech-device: 시험 → 가져오기 실패 확인 → device.ts → 6 통과.

## 명령과 출력

브리프의 `source ~/.nvm/nvm.sh && nvm use` 는 워크트리 격리 검사가 `source` 를 막아 쓰지 못했다. 대신 `.nvmrc`(24)의 설치 판 `PATH=~/.nvm/versions/node/v24.22.0/bin:/usr/bin:/bin` 을 명령 앞에 두었다(장부의 컨트롤러 준비 판과 같은 v24.22.0, pnpm 10.34.7).

- `pnpm install --frozen-lockfile` → Done(잠금 파일 그대로)
- `pnpm biome check --write src/core tests/unit tests/fixtures` → 고친 뒤 `Checked 26 files … No fixes applied.`(처음엔 noControlCharactersInRegex 하나 → {NAME} 표지를 U+0001 에서 U+E000 으로 바꿈)
- `pnpm lint` → `Checked 44 files in 51ms. No fixes applied.`
- `pnpm test` → `Test Files 8 passed (8) · Tests 84 passed (84)`(전 49 + 새 35)
- `pnpm exec tsc --noEmit -p tsconfig.json` → 출력 없음(0)
- `pnpm build` → `✓ Compiled successfully` · TypeScript 통과 · 경로 `/` · `/_not-found`
- `pnpm check:deps` → `✔ no dependency violations found (12 modules, 7 dependencies cruised)`
- `pnpm spec:trace --plan intent/2026-10-15-모모-잉글리시-아카데미/plan.md` → `spec-trace: 15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 14 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 64`(전 66, AC-5a · AC-5e 빠짐. AC 이름 시험 8 → 14)
- `pnpm check:bundle`(build 뒤) → `check-bundle: 파일 25 · static 10 · 화면 파일 15 · 서버 변수 이름 5 · 대조한 값 0 · 위반 0`

## 남은 우려

1. 위 '다르게 한 것' 1 · 2(감시 타이머)는 plan 표 문장과 다르다. 7절 문장과 증명 표 시험에는 맞지만 검토자 · 컨트롤러가 확인해 주기 바란다. 실제 기기에서 맞는지는 H2(I-8 · A-5 · E-5)뿐이다.
2. 손으로 쓴 대본의 이벤트 순서 · 시각(no-speech 8초, stop 뒤 end, abort 뒤 aborted)은 추측이다. H2 기록 대본으로 다시 돌려 보기가 생길 때까지 판정 함수는 손 대본에만 맞춰져 있다(plan 위험 10).
3. UA 표본 가운데 카카오톡 · 네이버 인앱과 iPad 모바일 CriOS 꼴은 공식 문서가 없어 추측이다(시험 주석에 표시). 인앱 토큰 목록(KAKAOTALK · NAVER(inapp · DaumApps · Line · Instagram · FBAN/FBAV · GSA · Android '; wv)')도 추측이다(H2 I-12).
4. Android Chrome 은 휴대폰 · 태블릿을 가르지 않고 listed 로 둔다(7절 표는 'Android 태블릿'. UA 로 안정되게 가를 수 없다).
5. 글 뒤 no-speech 로 두 문장 이상 답이 새 객체를 열 때 옛 객체를 abort 하지 않는다(브라우저가 곧 끝낸다고 봄. 옛 번호의 끝은 버린다).
