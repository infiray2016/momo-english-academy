# iPad Safari 음성 인식 no-speech 조사 (2026-11-06)

범위: iOS · iPadOS Safari(WebKit)의 `webkitSpeechRecognition`, 웹 조사만(코드 변경 없음).
확인 정도: **복수** 여러 사람이 확인 · **단독** 한 사람 보고 · **추정** 미검증 설명 · **공식** WebKit 소스 · Apple 문서.

## 1. 요약

- **같은 증상이 iOS 27 회귀로 보고돼 있다**(복수, 네 사람: #1 #2). 둘째 인식부터 audiostart 만 오고 멈추면 aborted + 'No speech detected'. iOS 26 정상, 27.3 beta 1(2026-11-04)에서도 재현.
- **징후는 시작 속도다.** 못 듣는 인식은 audiostart 가 30~160ms 에 오고, 듣는 인식은 #2 에서 2초 안팎이다. 우리 기록도 갈린다(실패 10회 31~158ms, 성공 7회 278~1208ms).
- **확인된 해법은 없다.** 증상 버그(321436 · 326069 · 324436 · 325274)는 전부 NEW 이고, 27.1~27.3 beta 노트에 인식 수정이 없으며, 27.0 의 오디오 세션 수정(#5) 뒤에도 남았다. 27 회귀 사례는 모두 iPhone 이고, iPad 는 #4(iPadOS 18.7.3 · 26.2)와 MediaRecorder 건([325916](https://bugs.webkit.org/show_bug.cgi?id=325916))뿐이다.
- **WebKit 소스**(공식, main 2026-11-06 열람): audiostart 는 캡처 소스의 '시작됨' 알림이지 소리 도착이 아니고, speechstart 는 SFSpeechRecognizer 의 첫 가설 때만 온다. soundstart 를 만드는 코드는 못 찾았다. 실패는 no-speech 가 아니라 aborted + 'No speech detected'(정상 abort 도 같음). 새 start 는 앞 인식기가 살아 있으면 서버가 aborted 로 끊는다.

| 물은 조건 | 결론 | 근거 |
|---|---|---|
| 앞 객체 abort 직후 새 객체 start | 그것만으로 생기지 않는다. 앞 end 를 기다려도 27 에서는 같다 | #1 #2 |
| speechSynthesis 로 읽어 준 뒤 듣기 | 필요조건 아님. 읽는 동안 인식기를 살려 두면 죽는 별도 증상은 있다 | #3, 읽기 없이도 #1 #2 |
| continuous = true | 결정 요인 아님. false 에서도 재현 | #1 |
| 버튼을 눌러 시작하는 반복 듣기 | 바로 이 조건에서 재현. 첫 세션 정상, 이후 대부분 실패 | #1 #2 |

## 2. 같은 조건의 출처 (Safari · 웹 · Web Speech API)

| # | 출처 | 날짜 · 판 · 기기 | 재현 조건 | 우회법 · 결과 | 확인 |
|---|---|---|---|---|---|
| 1 | [WebKit 326069](https://bugs.webkit.org/show_bug.cgi?id=326069) | 2026-10-02 · 27.0~27.0.1 · iPhone 16 | 둘째 세션부터 audiostart 만, stop 에 aborted. continuous=false · 재생 없음 · 새 객체도 같음 | 새로고침 무효. 탭 닫고 다시 열면 첫 세션만 복구 | 복수(2명) |
| 2 | [WebKit 321436](https://bugs.webkit.org/show_bug.cgi?id=321436) 댓글 3~6 | 2026-10-20 · 27.2 · iPhone 13 mini 홈 화면 앱 / 2026-11-04 · 27.3 beta 1 · iPhone 15 Pro Max | 재생 · TTS · getUserMedia 없이 매번 앞 end 뒤 새 객체. 첫 세션 뒤 대부분 못 들음(start 알림 34~143ms, 들을 땐 2114ms). 27.3 beta 1 도 둘째부터 결과 없음 | stop 뒤 abort, getUserMedia 열었다 닫고 300ms 쉼: 무효(8/8 실패). play-and-record: 전부 실패. 앱 재시작만 복구 | 단독 각각 |
| 3 | 같은 버그 본문 · 댓글 2, [324436](https://bugs.webkit.org/show_bug.cgi?id=324436), [325274](https://bugs.webkit.org/show_bug.cgi?id=325274) | 2026-08-10 · 26.6 / 2026-09-17~27 · 27.0~27 beta | 재생 뒤, 또는 TTS 건너 살린 인식기가 이벤트 없이 죽음. TTS 중엔 인식기가 못 받음. 인식 중 speak() 는 무음 + 인식 중단. speechSynthesis 뒤 AudioContext 는 새로고침 전까지 무음 | TTS 앞 abort + onend 뒤 새 객체: 21회 이상 정상. 확인음은 WebAudio 비프. 3.5~5초 지연: 부분. getUserMedia 트랙은 mute | 단독 각각 |
| 4 | [WebAudio/web-speech-api #96](https://github.com/WebAudio/web-speech-api/issues/96) | 2021-07~2026-08 · 18.7.3 · 26.2 | HTMLAudioElement TTS 뒤 침묵. WebKit 담당자가 오디오 세션 비활성화로 추정 | Web Audio 재생으로 해결(1명). 10~15초 대기는 대개 통함 | 단독 + 추정 |
| 5 | [317741](https://bugs.webkit.org/show_bug.cgi?id=317741) · [317747](https://bugs.webkit.org/show_bug.cgi?id=317747) · [Safari 27 노트](https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes) | 수정 2026-06-26 · 07-02 | 인식 중 오디오 세션 유지 수정. 27.0 노트에 317747(radar 번호 일치)이 있는데도 증상이 남음 | 못 고침 | 공식 |
| 6 | [Dot PR 575](https://github.com/senoldogann/Dot/pull/575) · [SO 79991991](https://stackoverflow.com/questions/79991991) | 2026-10-24 · 26.6~27.2 / 2026-08-10 · 26.6 | 둘째 받아쓰기부터 결과 없음 / 재생 뒤 침묵 | 지연 · getUserMedia · WebAudio · audioSession 무효, Reload 안내는 검증 전 / 재시도 300~3500ms, TTS 뒤 10초 대기 | 단독 · 추정 |

선례: [Apple 포럼 694847](https://developer.apple.com/forums/thread/694847) · [SO 71443569](https://stackoverflow.com/questions/71443569)(2021-11~2022-10 · 15.1~16.0.2)에도 start · audiostart 만 오는 보고가 있다(복수, 해법은 서버 인식으로 우회뿐). react-speech-recognition · annyang · mdn/dom-examples 의 iOS 이슈는 2021~2023 의 낡은 것뿐이다.

## 3. 우회법 판정

| 우회법 | 판정 | 근거 |
|---|---|---|
| abort 뒤 end 를 기다린 뒤 start | 못 듣는 증상엔 무효 | #1 #2 |
| speechSynthesis.cancel() | 효과 보고 없음(27.0 에서 cancel 이 뒤 speak 를 지우던 버그는 고쳐짐) | #3, 27 노트 |
| 객체 새로 만들기 | 못 듣기엔 무효, TTS 건너 살린 인식기엔 유효 | 무효 #1 #2, 유효 #3 |
| continuous=false | 무효. 'false + 재시작이 안정' 은 일화([Lilting](https://lilting.ch/en/articles/ios-webspeech-api-tips)) | #1 |
| getUserMedia 유지 · 오디오 세션 범주 | 해로움: 같이 열면 트랙 mute, play-and-record 로 전부 실패 | #3 #2 |
| 대기 · 지연 재시도 | 26.x 재생 뒤엔 3.5~15초가 통하나 27 에선 무효 | #3 #4 / #2 |

## 4. 다른 조건 (참고만)

| 출처 | 왜 다른가 |
|---|---|
| [Apple 포럼 802555](https://developer.apple.com/forums/thread/802555) 2025-09~10 · 26.1 beta | getUserMedia 가 'No AVAudioSessionCaptureDevice' 로 실패, 베타 2 에서 풀렸다고 작성자가 말함. 인식 API 아님 |
| [samueleddy.com](https://samueleddy.com/writing/ios-safari-audio-sessions/) 2026-05-17 · 17~18 | getUserMedia + 서버 인식. play-and-record 가 도움이라 #2 와 반대. 인식 API 아님 |
| [expo-speech-recognition #130](https://github.com/jamsch/expo-speech-recognition/issues/130) 2025-12 · [Habla Ecuador PR 51](https://github.com/MathewDMoore/habla-ecuador/pull/51) 2026-10-26 | 네이티브 iOS(재생 뒤 AVAudioSession 충돌, 미확인) · WKWebView 다리(end 가 안 오면 3초 감시, 낡은 콜백은 객체 식별로 무시, 못 듣기는 안 고침) |
| [WebKit 323104](https://bugs.webkit.org/show_bug.cgi?id=323104) 2026-09 · 18.7 | 탭의 모든 소리가 죽음. 새로고침 무효, 주소창 이동 · Safari 종료만 복구. 탭 단위 상태라는 단서 |

## 5. 우리 앱에 바로 시험해 볼 우회법 순위(근거 · 비용 · 위험)

현재 코드는 듣기마다 새 객체(321436 우회), continuous=true, 듣기 전 읽기 취소다(워크트리 p13d 의 `src/lib/speech/browser.ts`). 새 객체 우회는 #1 #2 에서 효과 없다고 보고됐다.

| 순위 | 시험 | 근거 | 비용 | 위험 |
|---|---|---|---|---|
| 1 | **빠른 audiostart 를 징후로 즉시 다시 시작.** audiostart 가 200ms 안이면 그 객체를 abort, end(상한 300ms) 뒤 새 객체로 재시작, 최대 3회, 아이에게는 '듣는 중' 그대로. 계속되면 안내로 전환 | 징후가 독립 두 자료에서 같고(우리 31~158ms 대 278ms 이상, #2 34~143ms 대 2114ms) 말하기 전에 판정된다. 재시도로 낫는다는 근거는 약하다(우리 둘째 시도 1/4, #2 번갈아) | 중하 | 표시등 깜박임. 재시도가 상태를 더 망칠지는 미확인이라 probe 에서 성공률과 임계값부터 잰다 |
| 2 | **읽어 주기와 인식기 겹침 없애기.** 읽기 전 abort, 읽기 onend 뒤 새 객체로 start. 읽는 동안 살아 있는 인식기(wake 재시작 포함) 점검 | #3 에서 21회 이상 정상. 한계: 읽기 없이도 난다(#1 #2) | 하 | 하: 표시등이 읽을 때마다 꺼졌다 켜짐 |
| 3 | **start() 를 탭 핸들러 안에서 동기 호출.** 읽기 끊기 · 쉼 뒤에 시작하는 길 확인 | 간접: iPadOS 27.0.1 에서 MediaRecorder 가 핸들러 밖 시작이면 마이크 정지(325916). 반증: #2 는 탭 즉시 start 인데도 못 들음 | 하 | 하, 기대 낮음 |
| 4 | **직접 확인 한 번.** 못 듣는 상태에서 새로고침 뒤 첫 듣기, 새 탭 첫 듣기 | #1(새로고침 무효 · 새 탭 복구)과 #6(Reload 복구 주장)이 엇갈림. 복구되면 부모 안내문 후보 | 하 | 하: 시험 때만 상태 손실 |
| 5 | **금지 유지 + 대조군.** audioSession.type · 듣기 중 getUserMedia · 인식과 오디오 재생 혼용 금지. stop 대 abort, continuous=false, 지연은 대조군으로만 | #2 #3 #6: 27.x 에서 해롭거나 무효. 우리 듣기 경로엔 audioSession · getUserMedia 가 없다(dev 탐침에만) | 0~하 | 없음 |
| 6 | **마지막 수단.** 서버 인식(MediaRecorder + 서버) | 인식 API 를 피한다(#6). 7절(녹음 안 함) 변경 필요, 27.0.1 에서 MediaRecorder.start 는 핸들러 안 동기 호출(325916) | 큼 | 결정 변경 · 비용 · 개인정보 |

- 측정 칸 제안: 이 탭에서 몇 번째 인식인지(#1 의 '탭당 한 번' 가설), 앞 인식 end 뒤 경과 ms, audiostart ms, speechstart 여부.
- 수정 대기: 증상 버그 전부 NEW. 우리 재현 로그를 326069 에 덧붙이는 것은 외부 게시라 하지 않았다.
