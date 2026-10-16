Approved(C 0 · I 0 · M 2)

# 검토: P2b 음성 접점 · 관찰 페이지 · 점검표(code-reviewer rev-p02a · Opus · xhigh)

2026-10-16 · 대상 워크트리 `agent-a0ffe8037fa827af6`(커밋 전) · 브리프 `task-p02b-review.md` · 구현 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p02b-report.md` · 화면 사진 같은 폴더 `p02b-speech-probe.png`

P2b 는 plan 값 6~10, 공용 변경 셋, 컨트롤러 추가 넷을 지킨다. 막을 결함은 없다. Minor 둘은 관찰 페이지와 마이크 확인의 끊기 처리다. 실제 인식 · 읽어 주기는 이 검토로 판정할 수 없고 H2 만이 증거다(plan 위험 21).

## 확인한 것과 방법

| 확인 | 결과 |
|---|---|
| `git -C <워크트리> status --short -uall` · `git diff` | 고친 공용 파일 넷(next.config.ts · ci.yml · .dependency-cruiser.cjs · dependency-rules.test.ts), 새 파일은 허용 목록과 보고 · 사진뿐. smoke.spec.ts · package.json · 잠금 파일 · playwright 설정 변화 없음 |
| P2a 파일 변화(모두 커밋 전이라 수정 시각으로 봄) | P2a 파일의 마지막 수정은 fix 2(20:29, match-rate 둘)다. P2b 새 파일은 20:38 부터다. P2b 가 P2a 파일을 고치지 않았다 |
| `src/` 의 getUserMedia · MediaRecorder · fetch · sendBeacon · XHR · WebSocket · localStorage · indexedDB | 0건(browser.ts:2 주석 한 줄만 걸림) |
| 가짜를 가져오는 곳 | tests/e2e/fixtures.ts · speech-probe.spec.ts(형만) · 의존 규칙 시험 fixture. src/ 0건 |
| `client-only` | 설치되지 않았다. 설치판 Next 의 webpack 경로는 `client-only$` 를 내부 꾸러미로 바꾼다(`node_modules/next/dist/build/webpack-config.js:233-239`). Turbopack 쪽은 바이너리 안이라 원본을 볼 수 없고, 빌드 통과가 증거다(확인 정도: 간접). 단위 시험 가운데 실제 browser.ts 를 가져오는 것은 없다 |
| 증명 표 P2b e2e 이름 ↔ 시험 이름(파이썬 글자 비교) | 6/6 글자 그대로 |
| probe-text.json | 문장 열 10개가 5~7 낱말(숫자 7 · 10 · 3, 축약형 It's · don't · I'm · She's · o'clock), 사람 이름 없음. 발표 글 133 낱말에 [쉼] 셋 |
| 시험 재실행 | 하지 않음. 컨트롤러 21:0x 재확인(단위 93 · e2e 7 통과)이 있고, 통과 여부에 대한 구체적 의심이 없었다 |

## 1. 값 6~10 대조

| 값 · 항목 | 판정 |
|---|---|
| 6 `SpeechPort` 일곱 메서드 · `ListenHandle`(press · cancel · outcome · capAt) | 맞음(types.ts:23-46). capAt 은 `readonly` 이고 구현은 getter 로 지금 state 의 windowStartAt + capMs 를 읽는다(browser.ts:376-381, 컨트롤러 추가 3) |
| 6 Web Speech 최소 형 · 결과 목록은 lib.dom · window 전역 형을 늘리지 않음 | 맞음(types.ts:52-85, browser.ts:62-69 는 함수 안 좁힘) |
| 7 `import "client-only"` · window 는 함수 안에서만 | 맞음(browser.ts:5) |
| 7 생성자(표준 → webkit) · 듣기 · 다시 시작마다 새 객체 · lang · continuous · interimResults · maxAlternatives · processLocally 없음 | 맞음(:71-78 · :149-154 · :290-303) |
| 7 결과 글(첫 후보, 확정 · 중간 가리지 않고 이어 빈칸 하나) | 맞음(:109-129) |
| 7 listen.ts 판정 · performance.now · wakeAt 타이머 하나 | 맞음, 묶음 타이머 하나 더(다르게 한 것 1, 아래 표에서 수용) |
| 7 앱이 abort 한 객체 · 옛 번호 이벤트 버림 | 맞음. 번호로 P2a stepListen 이 버린다 |
| 7 겹침(listen 앞 읽어 주기 cancelled + speechSynthesis.cancel, speak 앞 cancel('speak') + cancel) · speak 는 await 없이 같은 차례 · 발화 객체 붙듦 | 맞음(:171-173 · :385-432) |
| 7 음성 고르기(나-3: en-US 대소문자 · '_' 무시, 기본 → 기기 안 → 첫째, 'en' 앞부분, 없으면 lang 만) | 맞음(:88-106, 비면 speak 마다 다시 고름) |
| 7 unlockFromGesture(동기, 소리 0 빈칸) | 맞음(:435-456) |
| 7 checkMicrophone(getUserMedia 없음, audiostart · 첫 결과 성공, 오류 실패, max_listen + watchdog_extra 시간 넘김) | 맞음(:458-504). 다만 M-2(확인 객체를 다른 듣기 · 닫기 · 숨김이 끊지 않음) |
| 7 visibilitychange(나-4) · onTrace · recognitionCtor | 맞음(:518-524, 옵션 :54-60) |
| 8 함수 하나 · `import type` 만 · 생성자 안 대입(`declare`) · 밖 이름 없음 · setTimeout 매번 읽기 | 맞음(fake-web-speech.ts:6-11 · :26 · :39-40 · :77-113) |
| 8 expose(정의 · undefined) · start 마다 다음 실행 · 모자라면 마지막 되풀이 · stop · abort 는 예약 지우고 onStop · onAbort · hang · startThrows | 맞음(:115-156 · :180-185) |
| 8 onX 와 addEventListener 둘 다(EventTarget) · result 꼴 results[i][0].transcript · isFinal · resultIndex | 맞음(:60-75 · :158-169) |
| 8 합성 가짜(getVoices · utterances 차례 · cancel 의 interrupted · canceled · speaking · pending) · `__fakeSpeech` | 맞음(:188-333, defaults 칸 더함 — 다르게 한 것 3) |
| 9 일곱 부분(기기 · 설정 · 마이크 확인 · 교대 · 긴 말 · 감시 흉내 · 기록과 내보내기) | 맞음(speech-probe.tsx:646-973, 화면 사진과 같음) |
| 9 시험용 설정 · 글 · 동음이의어를 fixture 에서(다-5) · 서버 구성 요소 · robots noindex | 맞음(page.preview.tsx:4-12) |
| 9 '같은 객체 되풀이' · '이벤트 무시' 생성자 감싸기 | 맞음(:49-90) |
| 9 교대 시험: [시작] 누름 안에서 제약 풀기 + 첫 문장, 둘째 턴부터 누름 없이 읽기, 턴마다 글 · 일치율 · 결과 꼴 · 다시 시작 수 · 감시 다시 시작 | 맞음(:462-517 · :799-808). 다만 M-1(끊긴 듣기에도 다음 문장으로 넘어가 읽음) |
| 9 긴 말 시험: 조각 · 틈 · 이어 붙인 글 · 원문과 일치율 · 인식 객체 수 · 다시 시작 수 | 맞음(:840-873, 컨트롤러 추가 2) |
| 9 기록 표 · 대본 내보내기(규격 + device + observed, 끝까지 들은 듣기만 start() 순서, 마이크 확인 제외) · 복사 · 내려받기 · 소리 저장 · 전송 없음 · 어른용 한국어 · 사람 이름 없음 | 맞음(:110-248 · :911-972) |
| 10 머리(목적 · 주소 자리 · 하는 사람 · 기기 표) · (가) I-1~I-12 · A-1~A-6 · E-1~E-5 · F-1 · (나) N-1~N-5 · 결과 칸 비움 · 판정(가-5) | 맞음(speech-check.md 전부) |
| 공용 1 next.config.ts | 맞음. plan 55-60줄 글자 그대로(조건 · 기본 넷 · 주석 두 줄) |
| 공용 2 ci.yml e2e | 맞음. 다른 작업과 같은 준비 네 줄 + `playwright install --with-deps webkit` + `pnpm e2e`, `if: ${{ false }}` 뺌 |
| 공용 3 `no-fake-speech-in-app` + 시험 둘 | 맞음. plan 64줄 글자 그대로, 막는 예 · 허용 예 하나씩(dependency-rules.test.ts:178-192) |

## 2. 지적

### M-1 Minor — 관찰 페이지 교대 시험이 끊긴 듣기(숨김 · 떠남)에서도 다음 문장으로 넘어가 누름 없이 읽는다

- 자리: speech-probe.tsx:500-516(`outcome.then` 이 결과 꼴과 관계없이 턴을 쌓고 `speakTurn(index + 1)`).
- 근거: plan 값 2 갈래 표 'interrupted' 줄(118줄)은 "셈에 넣지 않고 말하기 버튼을 다시 보임(정할 것 나-4)"이다. 나-4(316줄)도 "돌아오면 말하기 버튼을 다시 보인다"고 한다. 점검표 I-11 은 "끊김, 돌아와 다시 됨"을 본다.
- 영향(코드 읽기로 확인): 듣는 중 쪽을 숨기면 cancel('hidden') 뒤 곧바로 다음 문장을 읽기 시작한다. 쪽이 숨은 채로 speak 가 불린다. 또 교대 시험이 듣는 중에 긴 말 · 감시 흉내 '듣기'를 누르면, 교대 듣기가 'leave' 로 끊긴 뒤 다음 문장 읽기가 막 시작한 그 듣기를 cancel('speak') 로 끊는다. 이 탓에 H2 I-11 결과가 앱의 실제 동작(나-4)과 달라지고, 교대 턴 목록에 끊김 턴이 섞인다.
- 고치는 법: `outcome.kind === "interrupted"` 이면 턴을 쌓지 않고 같은 문장에 머물러 상태를 'ready' 로 두고, 읽지 않는다.

### M-2 Minor — 마이크 확인 중의 인식 객체를 다른 듣기 · 닫기 · 쪽 숨김이 끊지 않는다

- 자리: browser.ts:458-504(확인 객체는 함수 안 지역 값이라 `activeListen` 처럼 붙들지 않는다). 그래서 :171(listen 시작), :536-542(dispose), :519-523(숨김)이 이 객체를 보지 못한다.
- 근거: plan 위험 20(299줄, 추측) "옛 객체가 끝나기 전에 새 객체를 시작하면 브라우저가 둘째를 거절하거나 옛 것을 끊을 수 있다"와 그 막는 법 "옛 객체 일은 버린다"를 따르면 확인 객체도 같아야 한다. 나-4(316줄)는 쪽이 숨을 때 듣기를 끊는다. 값 7 은 dispose 가 남은 일을 정리한다는 뜻이다.
- 영향: 확인 도중 듣기를 시작하면 인식 객체 둘이 함께 돈다. 확인 도중 화면을 떠나면(dispose) 그 객체가 시간 상한(18초)까지 마이크를 잡는다. 쪽이 숨으면 WebKit 이 확인 객체를 끊어 aborted 실패로 끝나고(위험 4 의 사실), P10 첫 실행 확인이 부모 알림(N-5)을 잘못 만들 수 있다.
- 고치는 법: 확인도 `activeListen` 과 같은 자리에 두어 listen · speak · dispose · 숨김 때 abort 하고 결과를 버린다. 숨김으로 끊긴 결과를 실패로 셀지는 P10 몫으로 넘긴다. P10 착수 전에 고쳐도 된다.

## 3. 다르게 한 것 · 우려 · 컨트롤러 추가

| 항목 | 판정 | 근거 |
|---|---|---|
| 다르게 한 것 1(같은 ms 차례를 setTimeout(0) 묶음으로) | 수용 | 기한은 이벤트 처리기에서 잡은 `at` 으로 잰다(browser.ts:216 · :233 · :244). 그래서 묶음이 효과 실행만 몇 ms 늦추고, 7절의 조용함 · 상한 · 감시 시각(초 단위)은 바뀌지 않는다. Playwright 시계는 같은 시각 타이머를 예약 차례대로 돌리고, 묶음 타이머는 그 시각의 일 가운데 가장 늦게 예약된다. 그래서 같은 시각의 이벤트 · 깨우기가 모두 쌓인 뒤 묶음이 돌아 (now, 이벤트 → 버튼 → 타이머)로 정렬된다(:333-339). 이는 단위 흉내(listen-end.test.ts:166-182)의 차례와 같다. 숨은 쪽의 타이머 늦춤은 숨김 cancel 이 먼저라 상관없다 |
| 다르게 한 것 2(pickVoice 내보내기, 단위 시험 없음) | 수용 | 관찰 페이지가 쓴다. 나-3 규칙이 짧고 H2 A-4 · I-1 이 실기에서 본다 |
| 다르게 한 것 3(`__fakeSpeech.defaults`) | 수용 | 단위 시험이 `DEFAULT_*` 와 실제로 견주고(fake-web-speech-defaults.test.ts:68-74), 그 기본값대로 stop · abort 이벤트가 나는지도 본다(:76-105) |
| 다르게 한 것 4(확인에서 audiostart · 결과 없이 끝 → `ended-without-audio`, retry) | 수용 | 나-5 가 비운 경우다. 시간 상한(18초)을 기다리지 않고 retry 갈래로 끝내 '마이크를 쓸 수 없음'으로 굳히지 않는다. iPad 에서 audiostart 가 실제로 오는지는 H2 I-2 가 본다 |
| 우려: 가짜 합성 cancel 꼴 · 인식 기본 onStop · onAbort 는 추측 | 수용 | 합성 오류 값의 뜻(cancel 로 시작 전 줄에서 빠지면 canceled, 말하는 도중 끊기면 interrupted)은 MDN SpeechSynthesisErrorEvent.error 문서의 정의와 같다(확인 정도: 기억, 이번에 다시 열지 않음). 가짜는 시작 전인 지금 발화에도 interrupted 를 낸다. 그러나 browser.ts 는 둘을 같은 cancelled 로 다루므로(:426-429) 결과는 같다. 인식 기본값은 plan 값 4 가 추측으로 정했고, H2 recorded 다시 돌려 보기가 고정한다 |
| 우려: `client-only` | 수용 | 위 '확인한 것' 표. 단위 시험 · tsx 에서 browser.ts 를 가져오는 곳이 없다. 앞으로 단위 시험이 browser.ts 를 가져와야 하면 그때 vitest 별칭 한 줄이 필요하다 |
| 우려: e2e 는 WebKit 만 | 수용 | playwright 설정은 P1a 것이고 허용 파일 밖이다. Chrome 엔진은 H2 A · E 줄이 실기로 본다 |
| 우려(보고 4 · 1): 토글마다 접점 새로 만듦 · 실기 확인 못 함 | 수용 | 점검표 I-4 · I-8 을 할 때 알아 둘 일이다. 실기는 H2 몫(위험 21) |
| 컨트롤러 추가 1(capAt getter) | 수용 | browser.ts:376-381 |
| 컨트롤러 추가 2(빠른 되풀이는 막지 않고 보임) | 수용 | 긴 말 시험의 '인식 객체 수' · '다시 시작 수'(:842-849), 점검표 A-6 메모 |
| 컨트롤러 추가 3(같은 ms 차례 이벤트 → 버튼 → 타이머) | 수용 | INPUT_ORDER(:43-52)와 묶음 정렬(:333-339), 다르게 한 것 1 과 같음 |
| 컨트롤러 추가 4(observed 는 start() 순서, 끝까지 들은 듣기만) | 수용 | buildScript(:197-248)가 끊긴 듣기와 마이크 확인을 빼고 듣기 차례대로 recognitions · observed 를 쌓는다. 단위 `replayObserved` 는 듣기의 start 만 실행을 소비하므로 맞는다. 다만 recorded 대본을 가짜(e2e)에 그대로 넣으면 가짜는 확인의 start 도 실행을 소비한다. 그래서 recorded 대본은 단위 다시 돌려 보기에만 쓴다(관찰) |
| TDD 차례를 지키지 않음(보고 '요청하는 변경' 참고) | 기록만 | plan 작업 순서 P2b 4(e2e 먼저)를 어겼다. 고친 교대 시험 기대(speech-probe.spec.ts:121-123)는 넷째 문장도 누름 없이 읽는 바른 동작을 받아들이려고 앞 넷만 견준 것이다. 새 객체 수 · start 호출 수 · 서로 다른 객체 id 단언(:114 · :124-127)은 그대로 엄격하다. 느슨해진 단언은 찾지 못했다 |

## 4. 증명 표 P2b 행

| 증명 표 줄 | 시험 |
|---|---|
| AC-5e(e2e 몫) | 있음: "AC-5e 관찰 페이지: 첫 쉼에서 끝나는 가짜 인식에서 새 인식 객체로 다시 시작해 두 조각을 이어 붙인다"(speech-probe.spec.ts:60). 조각 둘 · 이은 글 · 인식 객체 2 · 다시 시작 1 · 가짜 created 2 를 단언 |
| 접점 · 가짜 · 관찰 페이지 | 있음 다섯: 교대 세 턴(:91, 턴마다 created 증가 · 다음 문장이 누름 없이 spoken · start 3 · 서로 다른 객체 3) · 감시 타이머(:137, 18초 뒤 '듣는 중' · 36초 뒤 '멈춤' · 객체 2) · 인식 API 없음(:155, no-api · 확인 실패 mic-unavailable) · not-allowed(:171, 확인과 듣기 둘 다 mic-unavailable) · 내보낸 대본(:193, parseSpeechScript 통과 · recognitions 1 · observed 1 · 설정 = fixture). `page.clock.install` 이 goto 앞(:25-26)이고 미는 값은 대본 · 시험용 설정에서 계산한다(:12-20 은 기술 여유 · 장면 상수로 이름을 붙였다) |
| 운영 빌드에서 관찰 페이지 빠짐 | 시험이 아니라 명령 증명. 보고에 두 경로 목록이 있고 컨트롤러 21:0x 재확인 |
| AC-N3(P2 몫) | 점검표 (가) F-1 · I-5 · I-7 · A-2 줄과 판정 칸. 결과는 H2 몫이라 비어 있는 것이 맞다 |

## 5. 범위 밖 관찰(지적 아님)

- 마이크 확인의 결과 꼴에 '끊김'이 없다(나-5 는 성공 · 실패 · 시간 넘김만). M-2 를 고칠 때 숨김으로 끊긴 확인을 어떻게 돌려줄지는 P10 브리프에서 정하면 된다.
- 관찰 페이지 기록 표의 ms 칸은 접점을 새로 만들 때마다 기준(origin)이 바뀐다(:373). 토글을 바꾼 앞뒤 줄의 시각은 견줄 수 없다. 내보낸 대본은 상대 시각이라 영향이 없다.
- 이번에 시험을 다시 돌리지 않았다. 컨트롤러 재확인 결과를 그대로 받았다.

## 6. 판정

Approved. 값 6~10, 공용 변경 셋, 증명 표 P2b 행이 모두 맞는다. M-1 은 관찰 페이지 한 곳이라 H2 전에 컨트롤러가 직접 고칠 만하다. M-2 는 P10 착수 전까지 고치면 된다.
