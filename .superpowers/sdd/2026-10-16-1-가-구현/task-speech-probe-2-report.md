# 구현 보고: 음성 관찰 페이지 2판 — 사파리 원인 잡기(impl-probe, 2026-10-22 20:2x)

상태: **DONE_WITH_CONCERNS**(관문 전부 초록 — 아래 수는 1차, 추가분 뒤 수는 "추가" 절. 우려는 아래 '남은 우려' 1 · 2 — e2e 전체 묶음을 이 맥에서 못 돌림, 실제 iPad 동작은 요청자 측정으로만 확인됨)

워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p11`(가지 `feature/1a-p11-session-activities`, HEAD cce2238). 커밋하지 않음.

## 바뀐 파일

| 파일 | 무엇 |
|---|---|
| `src/lib/speech/types.ts:135-256` | `SpeechTraceEntry` 에 새 종류 여섯(아래) 더함. 사실 꼴 `ProbeEnvFacts` · `AudioContextFacts` · `ProbeDevice` · `ProbeDevicesPhase` · `ProbeOutputTest` · `MicLevelResult`(224). 기존 종류 · 필드 이름은 그대로 |
| `src/app/dev/speech-probe/probe-audio.ts`(새, 245줄) | 순수 꼴: 관찰 페이지 상수(`MIC_LEVEL_DURATION_MS` 3000 · `MIC_LEVEL_SAMPLE_INTERVAL_MS` 50 · `MIC_LEVEL_FRAMES` · `MIC_LEVEL_HEARD_RMS` 0.01 · `ANALYSER_FFT_SIZE` · `BEEP_FREQUENCY_HZ` 440 · `BEEP_DURATION_MS` 500 · `BEEP_GAIN` · `AUDIO_SESSION_TYPES`), `rmsOf` · `byteSamplesToUnit` · `summarizeLevels`(최대 · 평균 · 들린 비율 · 모두 0) · `formatLevel` · `micLevelSummary` · `describeDeviceCounts` · `probeEntryDetail`(새 줄의 '내용' 글) · `envFactLines` · `formatProbeLog`(복사 글) |
| `src/app/dev/speech-probe/probe-browser.ts`(새, 382줄, `client-only`) | 브라우저 쪽: `readAudioContextFacts`(만들고 읽고 바로 닫음) · `readEnvFacts` · `listDevices`(kind · label 만, deviceId · groupId 안 읽음) · `measureMicLevel`(getUserMedia → AudioContext + AnalyserNode → 50ms 마다 RMS 60틀 → 트랙 stop · 처리기 close) · `playBeep` · `readAudioSession` · `setAudioSessionType` · `watchAudioSession`(statechange) |
| `src/app/dev/speech-probe/speech-probe.tsx` | `pushTrace`(424, 기존 onTrace 몸통을 useCallback 으로 뺌) · 환경 효과(462~) · 단추 처리(728~ `onMicLevel` · 비프 · 읽어 주기 · 들렸어요 · 세션 꼴, 823 `onCopyLog`) · 새 칸 2~6(925~) · 기록 칸 '기록 표 복사' + 글 상자(1327~) · `traceDetail` 새 종류 갈래(1441). 칸 번호를 1~12 로 다시 매김(시험은 testId 만 읽음) |
| `tests/unit/speech-probe-audio.test.ts`(새) | 단위 16 |
| `tests/e2e/speech-probe.spec.ts:57-` | 가짜 `getUserMedia` · `enumerateDevices` · `AudioContext` · `audioSession` · `navigator.standalone`(`installFakeAudio`, addInitScript) + e2e 5 |

`src/lib/speech/browser.ts` 는 **바꾸지 않았다** — 새 줄은 모두 관찰 페이지가 직접 남기므로 음성 접점에 더할 것이 없었다. `checkMicrophone` 그대로.

## 새 사건 종류(기록 표 '종류' 칸)

(fix 1 뒤: devices · mic-level 줄의 장치 · 마이크 이름 원문은 갈래로 바뀌었고, '트랙' 낱말은 '마이크'로, 새 종류 `speak-request` 와 비프 `no-end` 가 더해졌다 — 'fix 1' 절이 지금 꼴이다.)

| 종류 | 언제 | 내용 |
|---|---|---|
| `env` | 쪽이 열림(load) · 음성 수 바뀜(voices) · 보이는 상태 바뀜(visibility) | standalone · display-mode standalone · 보이는 상태 · audioSession type(state) · AudioContext sampleRate · state · outputLatency · baseLatency · 음성 수 · 영어 음성 수 |
| `devices` | 권한 전(before-permission, 쪽이 열림) · 권한 뒤(after-permission, 소리 재기 성공 뒤) · 다시 보기(again) | 수 · kind 와 label(이름은 기록 표에만, 화면은 종류별 수만) |
| `mic-level` | '마이크 소리 재기' 끝 | 최대 · 평균 RMS · 들린 비율(RMS ≥ 0.01 인 틀) · 모두 0 · 틀 수 · 잰 ms · 처리기 상태 · 트랙 이름 · readyState · muted(처음 → 끝) · 트랙 설정(echoCancellation 등) · 트랙 멈춤 · 세션 꼴. 실패면 코드(NotAllowedError 등) · 단계(api · permission · audio) |
| `beep` | 비프 start(깨운 뒤 처리기 상태 · 세션 꼴) · end · error | |
| `heard` | '들렸어요' · '안 들렸어요' | 시험(beep · speak) · 답 · 그때 세션 꼴 |
| `audio-session` | 꼴 바꾸기(set: 앞 → 요청 · 읽은 값 · 던짐) · 상태 바뀜(state) | |

## 시험

단위(`tests/unit/speech-probe-audio.test.ts`, 16):
- 입력 소리 세기 요약 5: rmsOf / byteSamplesToUnit / summarizeLevels 두 개 / formatLevel
- 화면 요약 3: MIC_LEVEL_FRAMES / micLevelSummary(장치 이름 · 설정 없음) / describeDeviceCounts
- 새 기록 줄의 글 6: mic-level 성공 · 실패 · 모두 0 / devices / beep · heard · audio-session / env
- 기록 표 복사 글 2: envFactLines / formatProbeLog

e2e(`tests/e2e/speech-probe.spec.ts`, 새 5 — 기존 8 그대로 초록):
- 관찰 페이지 2판: 쪽이 열리면 환경 사실 칸과 기록 표에 env · devices 줄이 보이고 오디오 세션 API 가 없으면 꼴 바꾸기가 꺼진다
- 관찰 페이지 2판: '마이크 소리 재기'가 인식 없이 3초 동안 재어 mic-level 줄을 남기고 스트림 트랙을 멈추며 권한 뒤 장치 목록을 다시 적는다
- 관찰 페이지 2판: 마이크 권한 거부는 '마이크 소리 재기'에 코드로 남는다
- 관찰 페이지 2판: 오디오 세션 꼴을 바꾸면 audio-session 줄이 남고 비프 · 읽어 주기 뒤 들렸어요 · 안 들렸어요가 heard 줄로 남는다
- 관찰 페이지 2판: 기록 표 복사 글은 사실 줄을 머리에 한 줄씩 두고 표 머리 뒤에 기록 줄을 잇는다

빨강 → 초록: 단위는 모듈 없이 먼저 빨강(가져오기 실패) → 초록. e2e 는 구현 전 판으로 돌릴 수 없었다(HEAD 본체는 새 사건 종류 때문에 빌드 형 검사에서 막힘). 대신 변이 확인 한 번: `measureMicLevel` 의 `track.stop()` 을 빼자 소리 재기 시험이 '트랙 멈춤 아니오'로 빨강 → 되돌리고(cmp 확인) 초록.

## 관문 결과(Node 24 PATH)

| 명령 | 결과 |
|---|---|
| `pnpm biome ci .` | 0 — 323 파일, 고칠 것 없음 |
| `pnpm exec tsc --noEmit` | 0 |
| `pnpm test` | 0 — 55 파일, 525 통과 · 6 todo(전 509 + 새 16) |
| `pnpm build` | 0 — `○ /dev/speech-probe` |
| `pnpm check:deps` | 0 — 위반 없음(169 모듈) |
| `pnpm check:ids` | 0 — 보고가 바꾸기 전과 같음(기존 design-number 한 줄 — `buildScript` 날짜 자르기 `slice(0, 10)` — 의 줄 번호만 238 → 267). CI 의 `--fail-on` 규칙 묶음도 0 |
| `pnpm check:bundle` | 0 — 위반 0 |
| 관찰 페이지 e2e(아래 우려 1 의 임시 설정) | 13 통과(WebKit iPad Pro 11, 11.7s) |

## 설계와 다르게 한 것 · 까닭

1. **`browser.ts` 손대지 않음.** 브리프는 '종류를 더하는 범위에서만'이라 했고, 새 줄은 관찰 페이지가 만들므로 더할 일이 없었다.
2. **새 파일 둘을 관찰 페이지 폴더에 둠**(`probe-audio.ts` 순수 · `probe-browser.ts` 브라우저). 순수 함수에 단위 시험을 붙이려고 갈랐다. 운영 빌드에서 빠지는 것은 `page.preview.tsx` 하나이고, 두 파일은 그 쪽만 가져오므로 운영 묶음에 들어가지 않는다.
3. **화면에는 장치 이름을 안 보임.** '이름은 기록 표에만'을 마이크 트랙 이름에도 적용해, 화면의 소리 재기 결과는 수치만(`micLevelSummary`) 보이고 트랙 이름 · 설정은 기록 표 줄에만 둔다.
4. **'기록 표 복사' 단추와 글 상자를 새로 둠.** 기존 '대본으로 내보내기 · 복사'(대본 JSON)는 그대로 두고, 요청자가 붙여 넣을 글(사실 줄 한 줄씩 → 빈 줄 → 표 머리 → 탭으로 가른 줄)을 따로 낸다. 클립보드가 막히면 글 상자에서 길게 눌러 복사하게 안내한다.
5. **소리 재기의 분석 노드를 이득 0 노드로 destination 에 이음.** WebKit 이 destination 에 닿지 않은 분석 노드를 돌리지 않을 수 있어서다(추측, 확인 정도 낮음). 소리는 나가지 않는다.
6. **환경 사실을 쪽이 열릴 때 말고도 다시 남김**(음성 수가 바뀜 · 보이는 상태가 바뀜). 사파리는 음성 목록이 늦게 차서 load 줄에는 0 일 수 있다. 처리기는 load 때 한 번만 만든다.
7. **칸 번호 다시 매김.** 확인 순서대로 1 기기 · 2 환경 사실 · 3 장치 목록 · 4 오디오 세션 꼴 · 5 마이크 소리 재기 · 6 소리 나가기 · 7 설정 · 8 마이크 확인 · 9 교대 · 10 긴 말 · 11 감시 · 12 기록. 시험은 testId 만 읽어 영향 없다.

## 남은 우려

1. **e2e 전체 묶음을 이 맥에서 못 돌림.** `pnpm e2e` 의 임시 Postgres 가 샌드박스 안에서 공유 메모리를 못 잡는다(`shmget … Cannot allocate memory`). 관찰 페이지는 DB 를 쓰지 않으므로, 저장소 밖 임시 설정(스크래치패드 `probe-only.config.ts`, Next build + start 만)으로 같은 시험 파일을 돌려 13 통과를 봤다. CI 재생성(ci/p11-c2)에서 다른 e2e 와 함께 다시 확인이 필요하다.
2. **실제 iPad 동작은 요청자 측정으로만 가려진다.** 가짜로는 꼴만 확인했다. 특히 소리 재기 처리기가 사파리에서 suspended 로 남는지, 비프가 무음 모드 · `auto` 꼴에서 막히는지가 측정 대상이다.
3. **Playwright WebKit 에도 `navigator.audioSession` 이 있다.** 가짜를 넣지 않은 기존 시험 화면에서 꼴 `auto` · state 없음 · 듣기 때마다 statechange 줄이 찍힌다(화면 사진 확인). 해롭지 않지만 기록 표 줄이 늘어난다.
4. **들린 비율 문턱 0.01(약 -40 dBFS)은 어림이다.** 판단은 최대 · 평균 수치와 '모두 0'을 함께 본다.
5. 쪽이 열릴 때 처리기를 하나 만들고 바로 닫는다(브리프 요구). 이것이 iOS 오디오 세션 상태를 건드릴 가능성은 낮지만 0 은 아니다.

## 추가(팀 리드 20:3x — 사파리 단독 실측 뒤 셋)

| 요청 | 한 것 | 자리 |
|---|---|---|
| (가) 듣기 지연 한 줄 | `listenLatencyLines(trace)` — 듣기 · 인식 객체마다 start 호출 기준 `start 이벤트 +a · audiostart +b(start 뒤 +c[, 같은 ms]) · 첫 soundstart/speechstart · 첫 결과 · 끝(오류 코드)`. 듣기의 첫 객체 줄에만 규칙(endSilenceMs · capMs · chunkMs). 화면 12칸 '듣기 지연' 목록, 복사 글에는 사실 줄 · 빈 줄 뒤 제목 `듣기 지연(start 호출 기준 ms):` 과 줄들 · 빈 줄 · 표 | `probe-audio.ts` · `speech-probe.tsx` 12칸 |
| (나) 듣는 동안 함께 재기 | 5칸 선택 상자 '듣기 중 함께 재기'. 켜면 9 · 10 · 11 의 듣기가 인식 객체를 start 한 바로 뒤(같은 누름 안)에 `openLevelMeter()` 로 getUserMedia + AnalyserNode 재기를 열고, 듣기가 끝나면(끊김 포함) 다음 틀에서 멈춰 트랙 stop · 처리기 close. 결과(최대 · 평균 · 들린 비율 · 트랙 멈춤 · 세션)는 그 듣기의 listen-done 줄 끝에 `함께 잰 소리 …` 로 붙는다. getUserMedia 가 실패하면 코드 · 단계가 그 자리에, 인식이 깨지면 인식 사건 줄에 그대로 남는다 | `probe-browser.ts` `openLevelMeter`(마이크 소리 재기도 같은 함수에 틀 수를 주어 쓴다) · `speech-probe.tsx` `startListen` |
| (다) playback 으로 두고 읽어 주기 | 6칸 셋째 줄 'playback 으로 두고 읽어 주기'. 같은 누름 안에서 세션 꼴을 playback 으로 바꾸고(audio-session 줄) 지금 문장을 읽는다. 들렸어요 답은 `heard` 줄 `speak-playback`. API 가 없으면 꺼짐 | `types.ts` `ProbeOutputTest` 에 `speak-playback` · `speech-probe.tsx` |

새 시험: 단위 4(`listenLatencyLines` 셋 — 되는 듣기 · 같은 ms 와 오류 끝 · 다시 시작 객체와 던짐, `formatProbeLog` 요약 줄), e2e 3:
- 관찰 페이지 2판: 듣기 지연 요약이 듣기 · 객체마다 start 호출 기준 start 이벤트 · audiostart(start 뒤 틈) · 첫 소리 · 첫 결과를 한 줄로 보이고 복사 글에 들어간다
- 관찰 페이지 2판: '듣기 중 함께 재기'를 켜면 인식이 도는 동안 소리 세기를 재어 listen-done 줄에 붙이고 듣기가 끝나면 트랙을 멈춘다
- 관찰 페이지 2판: 'playback 으로 두고 읽어 주기'는 세션 꼴을 playback 으로 바꾼 뒤 지금 문장을 읽고 답이 speak-playback heard 줄로 남는다

(그리고 환경 사실 시험에 'API 가 없으면 playback 단추 꺼짐' 한 줄.) 빨강: 단위는 함수 없이 4 실패 → 초록. 변이 확인: 듣기 끝의 `meter.stop()` 을 빼자 함께 재기 시험이 '함께 잰 소리 재는 중'으로 빨강 → 되돌리고(cmp) 초록.

관문 다시(최종 코드): biome ci 0(323 파일) · tsc 0 · `pnpm test` 55 파일 529 통과 · 6 todo · build 0 · check:deps 위반 0 · check:ids 0(기존 한 줄 줄 번호만 238 → 269, CI fail-on 묶음 0) · check:bundle 위반 0 · 관찰 페이지 e2e 16 통과(임시 설정, 우려 1 그대로).

추가로 다르게 한 것 · 우려:
- 함께 잰 값은 새 기록 종류를 만들지 않고 listen-done 줄의 '내용' 글에만 붙였다(팀 리드 지시). 그래서 '대본으로 내보내기' JSON 에는 들어가지 않고, 기록 표 · 복사 글에만 있다.
- 함께 재기 스트림은 인식 start 호출 **뒤**에 연다(같은 누름 안). 앞에 여는 순서는 재지 않는다 — 순서가 원인이면 다음 판에서 갈래를 더해야 한다.
- 지연 기준은 `recognizer-call start` 기록 시각이다. 이 시각은 `start()` 가 돌아온 뒤에 찍히므로, start() 안에서 동기로 이벤트가 오면 음수가 아니라 +0 근처로 보인다.

## 추가 2(팀 리드 20:5x — 원인 iPad 무음 모드, Audio Session 실험을 첫째 자리로)

| 요청 | 한 것 | 자리 |
|---|---|---|
| (1) Audio Session 실험을 첫째 자리로 · '자동으로 두기' | 오디오 세션 칸을 쪽 맨 앞 '1. 오디오 세션 꼴(먼저)'로 옮기고 선택 상자 '자동으로 두기'를 둠(기본 꺼짐). 켜면 읽어 주기(6칸 읽어 주기 · 9칸 교대의 매 문장) · 비프 앞에 `playback`, 듣기(9 · 10 · 11) · 마이크 확인(8) · 마이크 소리 재기(5) 앞에 `play-and-record` 로 둔다. 이미 그 꼴이면 바꾸지 않고 줄도 남기지 않는다. 바꾸면 `audio-session` 줄 끝에 '자동'(playback 단추는 '단추'), 환경 사실 칸 · 지금 꼴도 바로 바뀐다. API 가 없으면 스위치 · 선택 상자 · playback 단추가 꺼지고 환경 사실 칸에 '없음' | `speech-probe.tsx` `applySessionType` · `autoSession` · 첫 칸, `types.ts` set 줄에 `by?: "auto" \| "button"` |
| 지연 줄에 세션 꼴 | 듣기 첫 객체 줄의 규칙 뒤에 '세션 X'(그 듣기 시작 앞의 마지막 env · audio-session 값) — 무음 모드 · 스위치 묶음끼리 바로 비교 | `probe-audio.ts` `listenLatencyLines` |
| (2) 나머지 그대로 | 입력 소리 세기 · 비프 · 들렸어요 · 장치 목록 · 지연 요약 · 듣기 중 함께 재기 그대로 | |
| (3) 쪽 머리 안내 | h1 바로 아래 노란 띠 "iPad 사파리에서 소리가 안 나거나 말이 안 잡히면 제어 센터의 무음 모드(벨)를 먼저 확인해요"(관찰 페이지 전용) | `speech-probe.tsx` |

칸 번호가 다시 바뀌었다: 1 오디오 세션 꼴 · 2 기기 · 3 환경 사실 · 4 장치 목록 · 5 마이크 소리 재기 · 6 소리 나가기 · 7 설정 · 8 마이크 확인 · 9 교대 · 10 긴 말 · 11 감시 · 12 기록(5 이후는 그대로).

새 시험: 단위 2(set 줄의 '자동' · '단추' / 지연 줄의 세션 꼴), e2e 2:
- 관찰 페이지 2판: '자동으로 두기'를 켜면 읽어 주기 앞에 playback, 듣기 · 마이크 확인 앞에 play-and-record 로 두고 바꿀 때만 audio-session 줄을 남기며 지연 줄에 세션 꼴이 보인다
- 관찰 페이지 2판: '자동으로 두기'를 끈 채면 읽어 주기 · 듣기가 세션 꼴을 바꾸지 않는다

(환경 사실 시험에 '안내 줄 문구' · 'API 없으면 스위치 꺼짐' 두 줄.) 빨강: 단위 2 실패 → 초록. 변이 확인: 스위치 조건(`if (!autoSessionOn) return;`)을 빼자 '끈 채' 시험이 audio-session 줄 2개로 빨강 → 되돌리고(cmp) 초록.

관문(최종 코드): biome ci 0(323 파일) · tsc 0 · `pnpm test` 55 파일 531 통과 · 6 todo · build 0 · check:deps 위반 0 · check:ids 0(기존 한 줄 줄 번호만 238 → 269, CI fail-on 묶음 0) · check:bundle 위반 0 · 관찰 페이지 e2e 18 통과(임시 설정, 우려 1 그대로).

추가로 다르게 한 것 · 우려:
- 교대 시험은 둘째 문장부터 누름 없이 읽어 준다. 스위치를 켜면 그 자리(사용자 동작 밖)에서도 playback 으로 바꾼다. Safari 가 사용자 동작 밖의 꼴 바꾸기를 받는지는 기록 줄('읽은 값')로 드러난다.
- 교대 시험은 문장마다 playback ↔ play-and-record 를 오가므로 audio-session 줄이 턴마다 둘씩 생긴다(의도 — 꼴 전환이 인식 · 소리를 깨는지 보려는 것).
- 마이크 소리 재기에도 play-and-record 를 둔다(팀 리드 목록 밖, 마이크를 쓰는 일이라 같은 규칙에 넣음).
- 듣기 중 함께 재기와 지연 요약은 스위치와 상관없이 그대로 쓴다.

## fix 1(코드 검토 review-speech-probe-2 — I 2 · M 5, 브리프 task-speech-probe-2-fix1)

| 지적 | 어떻게 고쳤나 | 자리 |
|---|---|---|
| I-1 처리기 깨우기가 머물면 마이크가 안 꺼짐 | `openLevelMeter` 를 다시 짬. `stop()` 은 깃발과 함께 받은 스트림의 마이크를 **그 자리에서** 끄고 처리기를 닫는다(`release` — 몇 번 불러도 되고 닫기는 한 번). 깨우기(resume)는 `RESUME_WAIT_MS`(2000, 관찰 페이지 상수)와 멈춤 요청 가운데 먼저 오는 것과 겨루고, 상한을 넘으면 마이크 끔 · 처리기 닫음 뒤 mic-level 줄에 '처리기 깨우기 없음(상한 2000ms) · 처리기 suspended · 마이크 끔 예'(수치 없음). 깨우기 전 · 스트림을 받기 전에 멈춤 요청이 오면 '처리기 깨우기 전에 멈춤'. 함께 재기도 같은 길. 멈춤 뒤 틀은 더 읽지 않고, 처리기 상태는 마지막으로 읽은 틀의 값을 남긴다 | `probe-browser.ts` `openLevelMeter` · `sampleLevels`, `probe-audio.ts` `RESUME_WAIT_MS` · `RESUME_TIMEOUT_CODE` · `STOPPED_EARLY_CODE`, `types.ts` 실패 꼴에 `contextState?` · `stopped?` |
| I-2 장치 · 마이크 이름 원문이 기록 · 복사 글에 | 원문 label 은 `listDevices` · `sampleLevels` 안에서 바로 `deviceLabelGroup` 으로 갈래만 바꾸고 기록 · 상태 어디에도 넣지 않는다. 갈래: AirPods · Beats · Bluetooth · BT(낱말) · 헤드셋 · headset · 이어폰 · earbuds → '블루투스 · 외부', Built-in · iPad · MacBook · 내장 → '내장', 비어 있음 → '권한 전', 나머지 '그 밖'. 장치 줄은 `audioinput 3[내장 1, 블루투스 · 외부 2] · videoinput 1[권한 전 1]` 꼴, 마이크 줄은 '마이크 갈래 … live'. 복사 글 첫 줄 '기기 이름은 기록에 넣지 않아요', 장치 칸 설명 글도 고침 | `probe-audio.ts` `deviceLabelGroup` · `DEVICE_NAMES_NOTE`, `types.ts` `DeviceLabelGroup` · `ProbeDevice.group` · `track.group` |
| M-1 비프 처리기가 안 닫히는 길 | 깨우기 거부 → error 뒤 닫음. `BEEP_DURATION_MS` + `BEEP_END_GRACE_MS`(1000) 뒤에도 end 가 없으면 '비프 end 없음(1500ms 기다림) · 처리기 닫음' 줄(`beep` phase `no-end`). end 가 오면 지킴이 타이머를 지운다 | `probe-browser.ts` `playBeep` |
| M-2 화면 · 기록의 '트랙' | '마이크 끔 예' · '마이크 소리 끊김(muted) 아니오 → 아니오' · '마이크 갈래 …'로. 코드 식별자 `track` 은 그대로, 주석의 낱말도 '마이크'로. `grep 트랙 src/app/dev/speech-probe` 0 | `probe-audio.ts` · `probe-browser.ts` |
| M-3 읽어 주기 길마다 꼴 바꾸는 때가 다름 | `onSpeakTest` · `onAltStart` 모두 `autoSession("playback")` → `unlockFromGesture` → 읽기(playback 단추 길과 같은 순서) | `speech-probe.tsx` |
| M-4 누름 밖 꼴 바꾸기가 기록에 안 드러남 | `readUserActive()`(= `navigator.userActivation?.isActive`, 없으면 '없음')를 audio-session set 줄 · 비프 start 줄에 '누름 안 예/아니오/없음'으로 붙임. 읽어 주기 줄은 음성 접점(browser.ts)이 내므로 그 바로 앞에 관찰 페이지가 새 줄 `speak-request`(어디서 · 교대면 몇째 문장 · 세션 꼴 · 누름 안 여부)를 남긴다 | `types.ts` `speak-request` · `userActive`, `speech-probe.tsx` `speakTurn` · `onSpeakTest` · `onBeep` · `applySessionType` |
| M-5 가짜 getUserMedia 가 같은 마이크를 되돌림 | e2e 가짜가 부를 때마다 새 마이크 · 스트림을 주고 마이크마다 멈춤을 한 번 센다. 가짜 마이크 · 장치 이름은 사람 이름 꼴('홍길동의 AirPods' — 지어낸 자리 채움 이름), 가짜 비프는 처리기가 깨어 있을 때만 end, 깨우기 '안 풀림' 갈래 더함 | `tests/e2e/speech-probe.spec.ts` `installFakeAudio` |

다르게 한 것: M-4 의 '읽어 주기 줄에 덧붙이기'는 음성 접점(browser.ts)을 고치지 않으려고 바로 앞 새 줄(`speak-request`)로 했다. 교대 시험의 문장 번호도 이 줄에 들어가 '몇째 문장부터 안 들렸는지'와 바로 맞춰 볼 수 있다.

시험(빨강 → 초록):
- 단위 `tests/unit/speech-probe-audio.test.ts` 22 → 42. 기대 글을 마이크 낱말 · 갈래 · 누름 안 여부 · 복사 글 첫 줄에 맞췄다. 새로 더한 것은 `deviceLabelGroup` 표 15 + 'BT 낱말' 1, 복사 글 첫 줄 1, 깨우기 없음 · 깨우기 전 멈춤 줄 1, 비프 end 없음 줄 1, 읽어 주기 요청 줄 1이다. 함수가 없을 때 빨강 28을 봤다.
- 단위 `tests/unit/speech-probe-browser.test.ts`(새, 8) — node 에서 가짜 AudioContext · getUserMedia · 가짜 시계: 깨우기 머묾 → 상한 뒤 마이크 끔 · 닫음 / 깨우기 기다리는 중 stop → 그 자리에서 끔 / 스트림 받기 전 stop / 재는 중 stop → 다음 틀 기다리지 않고 끔 · 틀 더 안 읽음 / 정해진 틀 끝 · 결과에 이름 원문 없음 / 비프 거부 → 닫음 / 비프 머묾 → end 없음 · 닫음 / 비프 정상 → end 뒤 end 없음 안 더함. 고치기 전 7 빨강 · 1 초록(정상 비프).
- e2e 새 2:
  - 관찰 페이지 2판 fix 1: 처리기 깨우기가 안 풀리면 소리 재기는 상한 뒤 마이크를 끄고 '처리기 깨우기 없음' 줄을, 비프는 end 없음 뒤 처리기를 닫고 줄을 남긴다
  - 관찰 페이지 2판 fix 1: '마이크 소리 재기' 뒤 '듣기 중 함께 재기'로 두 번 재면 마이크를 둘 다 끄고, 장치 이름 원문은 화면 · 복사 글 어디에도 없다
- 기존 e2e 고친 단언: 장치 줄 갈래 꼴, '마이크 끔 예', 복사 글 첫 줄. 자동 시험에는 줄 순서(audio-session → speak → speak-request)와 speak-request 줄을, '끈 채' 시험에는 교대 '1째 문장' 줄을 더했다.
- 변이 확인: 깨우기 상한 타이머를 무력화하자 새 e2e 가 '재는 중'으로 빨강 → 되돌리고(cmp) 초록.

관문(최종 코드, Node 24 PATH): biome ci 0(324 파일) · tsc 0 · `pnpm test` 56 파일 559 통과 · 6 todo · build 0 · check:deps 위반 0 · check:ids 0(기존 한 줄 줄 번호만 238 → 270, CI fail-on 묶음 0) · check:bundle 위반 0 · 관찰 페이지 e2e 20 통과(임시 설정 — 우려 1 그대로, 전체 e2e 는 CI 21차 몫).

남은 우려(fix 1):
- `RESUME_WAIT_MS` 2000 은 어림이다. 실제 사파리에서 깨우기가 2초 넘게 걸리고 결국 풀리는 꼴이면, '처리기 깨우기 없음'으로 끝나 수치를 못 얻는다. 그것도 기록 줄로 드러난다.
- `navigator.userActivation` 이 iPad 사파리에 있는지는 측정으로 드러난다. 없으면 모든 줄이 '누름 안 없음'이다.
- 이름 갈래는 낱말 목록 기반이다. 목록 밖 블루투스 장치(예 'Galaxy Buds')는 '그 밖'으로 든다. 원문은 어느 경우에도 남지 않는다.

fix 1b(재검토 Approved 의 새 Minor N-1): 깨우기를 기다리는 중 `stop()` 이 오면 처리기를 닫기 전 상태를 `stateAtStop` 에 담아 두고, mic-level 줄에 그 값(suspended · interrupted)을 쓴다. 전에는 닫힌 뒤의 'closed' 가 남았다(`probe-browser.ts` `openLevelMeter`). 단위 하나를 더했다('깨우기를 기다리는 중 stop() 의 줄에는 닫기 전 처리기 상태(suspended)가 남는다'). 고치기 전에는 closed 로 빨강이었다. 관문: biome ci 0 · tsc 0 · `pnpm test` 560 통과 · build 0 · check:deps 0 · check:ids 0(fail-on 0) · check:bundle 0 · 관찰 페이지 e2e 20 통과.

## 요청자에게 보낼 '사파리에서 확인할 순서'

크롬은 완전히 닫고, iPad 사파리 앱에서 관찰 페이지를 새 탭으로 엽니다. 세 묶음을 같은 차례로 재고, 묶음마다 끝에 '12. 기록'의 '기록 표 복사'를 눌러 붙여 넣어 보내 주세요. 복사 글에는 기기 이름이 들어가지 않아요(첫 줄에 그렇게 적혀 있어요). 복사가 안 되면 그 아래 글 상자를 길게 눌러 모두 선택해 복사하면 됩니다. 한 묶음의 차례는 이렇습니다. 먼저 '3. 환경 사실'의 audioSession 값을 봅니다. '5. 마이크 소리 재기'를 누르고 3초 동안 아무 말이나 합니다. '6. 소리 나가기'에서 '비프 소리' · '읽어 주기'를 차례로 누르고, 누를 때마다 '들렸어요' 또는 '안 들렸어요'로 답합니다. '9. 교대 시험'에서 '시작'을 누르고, 문장을 읽어 주면 '말하기'를 누른 뒤 2초 기다렸다가 따라 말합니다. 문장 셋까지 이어 하고, 교대에서 몇째 문장부터 읽어 주는 소리가 안 들렸는지 붙여 넣을 때 글로 함께 적어 주세요. '10. 긴 말 시험'에서는 '듣기 시작'을 누르고 바로 글을 읽은 뒤 '다 말했어요'를 누릅니다. 첫째 묶음은 제어 센터의 무음 모드(벨)를 켠 채, '1. 오디오 세션 꼴'의 '자동으로 두기'를 끈 채로 잽니다. 둘째 묶음은 무음 모드를 켠 채로 '자동으로 두기'만 켜고 잽니다. 이때 '자동으로 두기'가 회색으로 눌리지 않으면 그 사실만 알려 주세요. 셋째 묶음은 무음 모드를 끄고 '자동으로 두기'도 끈 채로 잽니다. 묶음 사이에는 쪽을 새로 고쳐도 됩니다.
