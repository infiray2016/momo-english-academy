# Plan: iPad 사파리에서 아이 말을 놓치지 않게 — 선생님 말 동안 '버리는 듣기'를 켜 두는 우회

spec: `intent/2026-11-07-iPad-버리는-듣기/spec.md`(판 2 · fix 1 · 다듬음 1, 설계 검토 `spec-review-1.md` · 재검토 `spec-review-1-fix1.md` '승인 가능') · intent: `intent/2026-11-07-iPad-버리는-듣기/intent.md` · 작성일: 2026-11-07 · 상태: **approved(컨트롤러 2026-11-07 15:0x)** — 컨트롤러 결정: (1) 13절 C213 이 C212 를 대신해 정할 것 8 · 9 · 10 은 '가'로 정해졌으므로 묶음 7(정본 반영)은 'AI 몫 넓힘' 커밋 뒤 바로 띄운다. (2) 시드 기본 discard_mode 는 이 plan 대로 'off' 로 두고(TEST_SETTINGS 가 시드와 같아야 하고, 'ios' 면 가짜 음성 대본 배정이 어긋나 기존 회화 e2e 가 깨짐), 프리뷰는 개발 DB 행을 'ios' 로 고쳐 켠다. 이때 discard_mode 의 changeVia 는 'advanced'(적재기가 행을 지킴, T-158)로 두어 뒤의 seed:load 가 'ios' 를 되돌리지 않게 하고, 나머지 다섯 키는 '시드'. 묶음 8(켬 확정, 15분 실측 통과 뒤)에서 시드 기본 'ios' 와 e2e 맞춤을 함께 정한다. (3) 묶음 0 · 6 · 7 은 'AI 몫 넓힘' 커밋 뒤(같은 파일 · 정본 사본), 1 · 2-가 는 지금
승인: 대기(컨트롤러). 근거 결정은 13절 C212(컨트롤러 잠정 14:3x: speech.discard_mode 시드 기본값 'off' 로 plan · 구현 · 검토, 켜기는 요청자 정할 것 8 · 9 · 10 '가' 답 뒤)다 · 브랜치 · 워크트리: `feature/1a-p13d-teacher` · `.claude/worktrees/p13d`(머리 6e86881, 'AI 몫 넓힘' 변경 58개 파일이 커밋 전) · 작업 장부: `.superpowers/sdd/2026-11-07-iPad-버리는-듣기/`(progress.md · 브리프 `task-*.md` · 보고 `task-*-report.md` · 검토 `review-*.md`). 열린 항목은 `.superpowers/sdd/2026-10-29-회화-수업을-대화로/ledger-open.md` 에 T 번호로 잇는다(지금 끝 T-253).

읽는 법: 코드 · 시드 · 시험 경로는 p13d 워크트리 안이고, 이 plan · intent · spec 과 정본 원본은 본 저장소다(정본은 두 곳이 같아야 하며 `diff -q` 로 본다). 'F1~F12' 는 분석 보고 `.superpowers/sdd/2026-10-29-회화-수업을-대화로/task-mic-probe-analysis-report.md` 10.20.4 의 규칙이고, '기록 n' 은 `docs/research/2026-11-0{6,7}-마이크-점검-기록-n-*.md` 다. 'AC-n' · 'FR-n' · '설계 n' · '우려 n' 은 이 spec 의 것이다. 상태 이름(대기 · 버림 확인 · 버림 · 살아 있는 버림 · 닫는 중 · 간격 · 버림부터 · 진짜)과 갈래(rest · discard · live · reopen)는 spec 설계 1 표 그대로 쓴다. 새 함수 · 칸 이름은 제안이고, '접점' 절의 계약을 바꿀 때는 이 plan 을 먼저 고친다.

## 목표 (Goal)

iPad 사파리(iOS 27, WebKit 326069 · 321436)에서 회화 수업(대화 차례 · 짧은 준비 쪽지 · 정리 · 바닥선)의 듣기가 소리를 받게 한다. speech.discard_mode 가 켠 기기(iOS · iPadOS WebKit, `isIosWebkit`)에서만, 진짜가 끝나면 곧바로 결과를 버리는 인식 세션(버림)을 열어 선생님 말을 그 안에서 들려주고, 틀의 '소리 끝' 알림 뒤 소리 끝 + speech.discard_after_sound_ms 와 버림 start + speech.discard_min_ms 를 둘 다 채우면 stop 하며, 버림 end 와 마지막 소리 끝에서 speech.discard_gap_ms 가 지나고 speechSynthesis.speaking 이 거짓일 때 진짜를 연다(F1~F12). 차례는 DB 없는 순수 '듣기 차례 기계'가 정하고 음성 접점을 감싸는 층이 실행한다. 한 번 듣기 판정(`src/core/speech/listen.ts`) · 학습 규칙 · 녹음 안 함 · 버림 글 즉시 폐기(FR-12) · 기술 오류 비기록(FR-13)은 그대로다. 13절 C212 에 따라 시드 기본값은 'off' 이고, off 와 켜지 않은 기기의 동작은 지금과 글자까지 같다(AC-11). 통과 기준은 켠 뒤 요청자 iPad 15분 수업이다(10.20.7 열두 항목, 교대 10턴 결과 10 · 멈춤 0, '말하기 → 한 번 더 눌러 멈춤 → 선생님 말 → 다시 말하기' 다섯 번 넘게, AC-1).

## 정한 것 (plan 이 고른 것 · 설계는 바꾸지 않음)

1. **층 자리.** 틀은 `teacherSpeech(layer.port)` 로 감싼다. 층은 브라우저 접점 바로 위, 선생님 목소리 감싸기 아래에 놓인다. 그러면 teacher.ts 를 고치지 않고, 보류한 읽기 동안 선생님 '말하기' 상태가 켜지지 않는다(실제 시작 알림에서만 켜짐, `teacher.ts:35-43`).
2. **새 능력 둘은 SpeechPort 의 선택 칸이다(`openDiscard?` · `synthState?`).** SpeechPort 를 돌려주는 감싸개(teacher · paced · pieces · trackedSpeech · speaking 둘 · sound-retry · teacher-line)와 SpeechPort 꼴로 적은 시험 가짜 열 곳(`satisfies` · 형 선언)을 고치지 않기 위함이다. browser.ts 만 둘을 채우고, 층이 없으면 부르는 곳이 없다(AC-11).
3. **새 키 여섯은 회화 전용 모듈이 읽는다.** `src/core/speech/discard-settings.ts` 를 회화 화면 자료(`lessonViewSettingsOf`)와 첫 실행 자료(`readFirstRunView`)만 읽는다. 모든 영역의 세션 · 배치 · 결과가 읽는 `SPEECH_SETTING_KEYS` 에는 넣지 않는다. listen.ts 를 고치지 않고(설계 1 근거 (1)) 회화 밖 화면이 새 키 때문에 던질 일을 만들지 않으려는 것이다. 키가 하나라도 없거나 꼴이 틀리면 던진다(조용한 기본값 없음, AC-11).
4. **기계는 자기 시간 묶음만 받는다.** restMs · liveAsMs · minMs · afterSoundMs · gapMs · endWaitMs(= speech.watchdog_extra_seconds) · capMs(= speech.max_listen_seconds + speech.watchdog_extra_seconds)를 층이 두 설정에서 만든다(설계 4 '남은 시점 값'). 그래서 묶음 1 은 묶음 0 을 기다리지 않는다.
5. **회복(F10)은 화면이 누름 없이 listen 을 다시 부르는 것이다(press auto).** 기계는 앞 진짜가 deaf 였으면 짧은 말(mic)을 부르게 한다. 이어진 deaf 수는 지금처럼 화면이 세고(`deafStreakOf`), speech.deaf_skip_after 에 닿으면 다시 부르지 않고 지금 안내로 간다(`child-turn.tsx:492-505`).
6. **짧은 말 목록.** `seed/lists/talk-short-lines.json` 에 자리 again · mic × 구간 1-3 · 4-6 · 7-9 · 10-12 를 두고 줄마다 en · ko 를 둔다. again 은 대화의 다시 말하기 · 말소리 없음 · 결과 없음 · 다시 듣는 오류 · 읽는 중 끊김(F9) · 버림부터의 누름에 쓰고, mic 은 회복에 쓴다. 따라 말하기는 짧은 말 대신 그 낱말 · 줄의 들려줄 말을 다시 읽는다(설계 3). 검사는 'AI 몫 넓힘' 신호 말과 같은 꼴(물음표 없음 · 문장 길이 상한 · 그 구간 첫 단계 어휘 범위 · 뜻 있음)이고, 첫 내용 예는 'Okay, one more time.'(R16 '가')이다.
7. **15분 실측용 켜기는 개발 DB 행 고침이다(T-158 꼴).** 개발 DB 의 speech.discard_mode 집 전체 행 하나를 'ios' 로 고치고, 시드 · TEST_SETTINGS 는 'off' 그대로 둔다. 가짜 음성은 start 차례대로 대본을 배정하므로(`fake-web-speech.ts:129-131` runIndex), TEST_SETTINGS 를 'ios' 로 바꾸면 iPad 꼴 기기(tablet-10-9-webkit)에서 도는 기존 회화 e2e 의 대본을 버림 객체가 먼저 가져가 어긋난다. 되돌림은 그 행을 'off' 로 고치거나 seed:load 한 번이다(시드 키라 시드 값으로 돌아감). 코드 배포는 필요 없다. 시드 'ios' 확정은 실측 통과 뒤 묶음 8 이 한다.
8. **off 의 '고침 전과 같음'(AC-11)은 골든 없이 셋으로 증명한다.** (가) 층 공장이 off · 켜지 않은 기기에서 null 을 돌려 틀이 지금 객체를 그대로 쓰고, openDiscard · synthState 호출이 0이다(단위). (나) 기존 단위 · 통합 · e2e 파일의 단언을 한 줄도 고치지 않고 통과한다(검토자가 diff 로 확인). (다) 새 e2e 의 off 대조에서 누름 수 = 인식 start 수 · 버림 객체 0 · 새 문구 0 이다. 이 Mac 은 e2e 를 돌리지 못해 고침 전 e2e 골든을 뜰 수 없기 때문이다.
9. **listen.ts 는 고치지 않는다.** 예외는 15분 실측 항목 7 의 회복이 실패할 때 finishDeaf 의 abort → stop 하나이고, fix 라운드에서만 한다(M-11).
10. **browser.listen 의 안전망.** 열린 버림을 만나면 그 버림을 stop 하고 trace 에 남긴다. 기계 결함을 막는 몫이고, off 에서는 버림이 없어 닿지 않는다.
11. **시험 이름은 'AC-' 로 시작하지 않는다.** CI 의 spec:trace(`--fail-on unknown-ac`)가 시험 이름 머리의 AC 토큰을 15절과 맞대는데, 이 spec 의 AC-1~13 은 15절에 아직 없다. 머리는 '버림 F6 …' 꼴로 쓰고 AC 는 괄호 안에 둔다.
12. **같은 폴더 나란히(C142).** 시험 파일도 아래 표의 묶음이 주인이다. 남의 파일은 Edit 로 덩이를 더하기만 하고 Write 하지 않는다(T-96). 남의 붉은 시험만으로 관문이 막히면 내 시험 파일만 돌린 결과를 붙여 첫 줄 BLOCKED 로 끝낸다.

## 접점 (묶음 사이 계약)

| 접점 | 정한 꼴(제안 이름) | 내는 쪽 → 쓰는 쪽 |
|---|---|---|
| 기계 | `startDiscardFlow(times)` · `stepDiscardFlow(state, input, now) → { state, effects, wakeAt? }`(listen.ts 의 startListen · stepListen 꼴). 입력: unlock · speak-request(id) · speak-start(id) · speak-end(id, heard) · cut(started) · sound-end(여러 번 와도 하나) · server-wait(on · off) · press(auto) · dont-know · discard-audio · discard-result · discard-end · discard-error · real-end(결과 종류) · hidden · visible · leave · synth(speaking) · tick. 효과: discard-start · discard-stop · real-start · speak-release(id) · speak-drop(id) · cancel-speaking · need-sound(again · mic) · view · note | 1 → 2-나 |
| 음성 접점 | `openDiscard(on) → { stop(), abort() }`(on 은 audiostart · 결과 수 · end · error 만 받고 글은 없음) · `synthState() → { speaking, pending }` · `ListenCallbacks.started?()`(진짜가 실제로 열린 때 층이 부름) | 2-가 → 2-나 · 3 |
| 사건 기록 | `SpeechTraceEntry` 에 셋: discard-call(start · stop · abort, synth) · discard-event(PLAIN 이름 · end · `{ type: "result", count }` · error) · discard-note(진짜 listen-begin 바로 앞, dc 칸 그대로). 셋 모두 글 칸이 없다 | 2-가(형) · 2-나(note) → 4 |
| 층 | `discardLayerFor(port, { discard, speech, verdict, onTrace, now?, timers? }) → DiscardLayer \| null`(off · 켜지 않은 기기면 null). `port` · `soundEnd()` · `serverWait(on)` · `leave()` · `setSoundSource(fn)` · `subscribe(fn)`(view: waiting · sayNow · recovering · canListen) · `dispose()` | 2-나 → 3 |
| 소리 끝 | 틀은 아이 차례(phase child · choice)로 넘긴 뒤 읽기 줄이 빈 때(queue.speaking 거짓) soundEnd() 를 부른다. 다시 듣기 · 힌트 듣기 · 말풍선 누르기 뒤에도 같다. 따라 말하기 조각은 say() 가 참을 돌린 때 부른다. 서버 차례는 submit 에서 serverWait(true), onEnd · onBreak · onClose · onError · onResting 에서 false 다(N-1) | 3 |
| client_listen dc | 진짜 요약 한 줄의 선택 칸 묶음(strictObject): g(rest · discard · live · reopen) · sr(대기 사이 읽기, 참거짓) · why(sound · self_end · cap · not_played · live) · rw(self_end · cap · hidden · leave · check) · as · d · s0 · s1 · w(ms) · sk(teacher · word · short · cut · none) · np · n(정수). 글 칸은 없다. 진짜 as · 진짜 시작 때 읽기 상태는 지금 칸 as · ts 를 그대로 쓴다. TALK_SPEAK_WHATS 에 short 를 더한다 | 4 → 3 · 5 |

## 바뀌는 파일 (Files that change)

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 0 | `specs/09-설정값.md`(본 저장소 · p13d) | 수정 | 120줄 speech.deaf_skip_after 뒤에 설계 4 표의 여섯 행을 넣는다. discard_mode 기본값은 '끔'(C212)이고 뜻 칸에 'ios 는 정할 것 8 · 9 · 10 가 뒤'를, 바꾸는 곳은 시드를 적는다. 끝에 '버리는 듣기 반영' 문단(새 키는 시드 · deaf_* 는 고급, deaf_* 를 고급 화면 전에 고치려면 T-158 꼴 + 13절 한 줄, 재검토 다듬을 곳) |
| 0 | `seed/settings.json` | 수정 | 148줄 뒤 여섯 행: discard_mode "off" · rest_ms 45000 · live_as_ms 250 · min_ms 1500 · after_sound_ms 300 · gap_ms 1000, 모두 household · "seed" |
| 0 | `tests/fixtures/settings.ts` | 수정 | TEST_SETTINGS 202줄 뒤에 같은 여섯(값이 같아야 check:ids fixture-setting 0) |
| 0 | `src/core/speech/discard-settings.ts` | 신규 | DISCARD_SETTING_KEYS · DiscardSettings · discardSettingsFrom(read) · discardOnDevice(mode, verdict)(deafDetectsOn 꼴, isIosWebkit) · discardNoticeShown(mode, verdict) |
| 0 | `src/server/conversation/index.ts` | 수정 | lessonViewSettingsOf(1217)의 읽는 키에 DISCARD_SETTING_KEYS, TalkLessonViewSettings(1181)에 discard |
| 0 | `src/server/profile/index.ts` | 수정 | readFirstRunView(221)에 discardMode |
| 0 | `tests/unit/discard-settings.test.ts` | 신규 | 키 여섯이 settings.json · TEST_SETTINGS 에 있고 discard_mode 시드가 off · 키 하나를 빼면 던짐 · 모드 × 기기(iPad · iPhone · Mac 사파리 · 크롬) 표 |
| 1 | `src/core/speech/discard.ts` | 신규 | 순수 듣기 차례 기계: 설계 1 표 · 보류한 읽기 · 기다리는 누름 · 굳은 읽기 · 회복 · 숨김 · 떠남 · 안전 상한(서버 기다림 중에는 세지 않음). 시점 숫자 없음 |
| 1 | `tests/unit/discard-flow.test.ts` | 신규 | F1~F12 마다 하나 이상, 설계 1 표의 행마다 들어감 · 나감, AC-3 · 5 · 6 · 9 · 13 의 기계 몫 |
| 1 | `tests/unit/discard-flow-invariants.test.ts` | 신규 | U23: 파일 안 씨앗 난수(새 의존 없음)로 만든 사건 차례 표본에서 F6 · F8 불변식. 검사기를 따로 두고 변이 둘(간격 조건 뺌 · 진짜 중 읽기 흘림)이 걸리는지 본다(AC-7) |
| 2-가 | `src/lib/speech/types.ts` | 수정 | SpeechPort 선택 칸 둘 · DiscardHandle · ListenCallbacks.started? · SpeechTraceEntry 셋(접점 표) |
| 2-가 | `src/lib/speech/browser.ts` | 수정 | openDiscard(prepare 같음, activeListen 밖, 결과는 수만 trace) · synthState(98 synthesisStateOf 재사용) · 숨김(635) · 마이크 확인 · dispose 가 버림을 abort · 안전망(정한 것 10). speak(454 · 457) · listen(200) 길은 그대로 |
| 2-가 | `src/lib/speech/fake-web-speech.ts` | 수정 | FakeSpeechRecord.spokenAt(spoken 과 같은 차례의 시각, AC-7 e2e 용). 대본 배정은 그대로 |
| 2-가 | `tests/unit/discard-browser.test.ts` | 신규 | 가짜 Web Speech · 가짜 시계(talk-mic-deaf 꼴): 버림 trace 에 글 없음 · 버림이 열린 채 speak 해도 그 객체 stop · abort 0(AC-8) · 숨김 · dispose 가 닫음 · synthState · 안전망 |
| 2-나 | `src/lib/speech/discard-layer.ts` | 신규 | 층: speak 를 가로채 보류 · 흘림 · 버림. listen 은 손잡이를 바로 주고 진짜는 조건 뒤에 연다(걸린 누름은 하나로, cancel · dont-know 는 거둠). 시작 알림 추적(F9), 깨울 시각 타이머, discard-note, view 알림 |
| 2-나 | `tests/unit/discard-layer.test.ts` | 신규 | off · 켜지 않은 기기면 null · 접점 호출 0(AC-11) · 손잡이 꼴 · 보류한 읽기가 다음 죽은 버림 안에서 나옴(F8) |
| 2-나 | `tests/unit/discard-replay.test.ts` | 신규 | 점검 쪽 순서를 앱 길로 재현(가짜 Web Speech · 가짜 시계): 기록 8 차례 0 · 13(쉰 뒤 F1), 1~6(죽은 버림 + 소리 → 소리 끝 + 300 과 하한 → stop → end → 1000 → 진짜), 9~11(굳음 → cancel 복구), 기록 7 차례 0 · 8(abort 뒤 버림부터), 4~7(소리 없는 버림은 stop 없음, 누르면 짧은 말), 3(진짜를 열 때 speaking 참 → cancel · after 기다림 → ts speaking 으로 엶) |
| 3 | `src/components/conversation/talk-frame.tsx` | 수정 | 층 만들기(768-783, created.device()) · 소리 끝 · serverWait(submit 1123) · 떠남(쉬는 안내 · 막힘 · 마무리 · 홈, 정리 따라 말하기는 떠남이 아님)의 leave · 짧은 말 소리 공급(아이 차례 칸 위 선생님 줄 꼴, 1~4단계 뜻, 기록 · talk_turns 에 넣지 않음) · ChildTurn · FollowEnv 에 discard |
| 3 | `src/components/conversation/child-turn.tsx` | 수정 | 선택 속성 discard: '준비 중이에요'와 기다림 표시 · 진짜가 열리면 '말해 보세요'(소리 들어오면 지움) · onListening 은 started 때 · 회복은 '잠깐만요, 마이크를 다시 켤게요'와 auto listen · 다시 말하기 · 힌트 듣기 뒤 soundEnd · '잘 모르겠어요'가 걸린 누름을 거둠 |
| 3 | `src/components/conversation/follow-along.tsx` | 수정 | 선택 칸 FollowEnv.discard: useSayer(221) 흐림을 canListen 까지 늘림(문구는 '다 읽은 뒤 눌러요' 하나) · say 끝에 soundEnd · 다시 말하기 소리는 들려줄 말 다시 · 회복 문구와 auto listen |
| 3 | `src/components/answer/speak-button.tsx` | 수정 | 선택 속성 waiting(단추 글 · 기다림 표시, 듣는 동안의 고리와 다른 꼴, 표본 1번). 다른 영역은 넘기지 않으므로 그대로다 |
| 3 | `src/app/(setup)/first-run/first-run-flow.tsx` | 수정 | 음성 인식 안내(755-762)에 부모 줄을 discardNoticeShown 일 때만 둔다. 문구는 spec 설계 3 초안이고 요청자 답 뒤 바꾼다 |
| 3 | `src/core/speech/listen-gap.ts` · `src/lib/speech/speak-settle.ts` | 수정 | 머리 주석의 '누름 밖 start 는 iOS 에서 확인되지 않음' 전제만 고친다(discard 모드는 첫 누름 잠금 풀기 뒤 누름 밖 start, 기록 7 · 8, I-4). 코드는 그대로다 |
| 3 | `tests/unit/discard-screen.test.ts` | 신규 | 화면 순수 함수: 기다림 · 말해 보세요 · 회복 문구 고르기(discard 가 없으면 지금 값) · 소리 끝 부를 때(아이 차례 × 줄 빔) · 첫 실행 줄(모드 × 기기) |
| 4 | `src/core/conversation/client-listen.ts` | 수정 | ClientListenEntrySchema 에 dc · TALK_SPEAK_WHATS 에 short |
| 4 | `src/lib/speech/listen-log.ts` | 수정 | keptOf 가 discard-event end 를 rec-end 로 보고(pe), discard-note 를 다음 진짜 요약의 dc 로 붙인다. 버림 결과는 진짜 칸(fr 등)에 들지 않는다 |
| 4 | `tests/unit/discard-listen-log.test.ts` | 신규 | 새 칸 받음 · 옛 기록 통과 · 글 칸 든 dc 거부 · pe · dc 붙임 · short |
| 5 | `tests/e2e/talk-discard.spec.ts` · `tests/e2e/discard.ts` | 신규 | `withHouseholdSetting`(`tests/e2e/db.ts:78`)로 discard_mode 를 'ios' 로 켜고 3단계 고정 표본을 돈다(iPad 꼴 기기라 기기 판정까지 타며, spec 설계 8 의 all 과 같은 길이다. 증명 표). 도우미는 죽은 · 살아 있는 버림 대본, 표지 글 'ZEBRA', getUserMedia · MediaRecorder 셈이다. `tests/e2e/talk.ts` 는 가져다 쓰기만 한다 |
| 5 | `tests/integration/talk-discard-listen.test.ts` | 신규 | 회화 턴 · 따라 말하기 저장이 dc 를 받아 talk_turns.client_listen · attempts.input 에 글 없이 두고 validity 가 그대로다(AC-10 · 12 · 13). `tests/integration/talk-fixture.ts` 는 가져다 쓰기만 한다 |
| 6 | `seed/lists/talk-short-lines.json` | 신규 | 정한 것 6 |
| 6 | `src/core/seed/schema/reference.ts` · `src/core/seed/structure.ts` · `src/server/seed-lists.ts` · `src/core/seed/check-talk-lists.ts` · `src/core/seed/reference-index.ts` | 수정 | 규격 · SEED_FILES · 자리 · 구간 상수 · seedTalkShortLines · 검사 · seed:validate 등록(신호 말 꼴). 다섯 모두 'AI 몫 넓힘' 의 커밋 전 diff 안이다 |
| 6 | `src/server/conversation/index.ts` · `tests/unit/talk-short-lines.test.ts` | 수정 · 신규 | 화면 자료에 talkShortLines(그 단계 구간 것) / 규격 · 걸림 · 통과 |
| 7 | `specs/03-화면.md` · `04-데이터.md` · `07-음성과-오류.md` · `08-테스트와-기술.md` · `11-요구사항과-수용-기준.md`(13절 줄은 컨트롤러) | 수정 | 요청자 '가' 답 뒤 spec '문서 반영' 표 그대로(C211 반영 뒤의 글 위에) |
| 8 | `seed/settings.json` · `tests/fixtures/settings.ts` · `specs/09-설정값.md` · `tests/e2e/fixtures.ts` | 수정 | 실측 통과 뒤: discard_mode 'ios' · 12절 기본값 ios · e2e 공용 test 에 선택 discardMode(기본 off, 시험마다 withHouseholdSetting). 기존 회화 e2e 는 off 그대로이고 talk-discard 만 켠다 |

손대지 않는 파일: `src/core/speech/listen.ts`(정한 것 9) · `src/lib/speech/teacher.ts` · `src/components/conversation/tori.tsx` · 'AI 몫 넓힘' 이 만진 `src/core/ai/calls/talk-lesson.ts` · `src/core/conversation/{lesson-flow,situation,cue-line,made-up,question-check,chances,child-kind,log}.ts` · `src/server/conversation/{lesson-turn,closing,turn}.ts` · `src/server/ai/talk.ts` · `scripts/talk-*.ts` · 카드 시드 · 기존 시험 파일의 단언 · `src/app/dev/*`(참고 구현 `src/app/dev/mic-probe/w-round2.ts` 는 읽기만).

## 작업 순서 (Order of work)

흐름: 시작 조건 → 0 ∥ 1 ∥ 2-가 → 2-나 ∥ 4 ∥ 6 → 3 → 5 → 설정 적재 A → 커밋 · push → CI → 서버 확인 → 요청자 답 → 7 → 켜기 → 15분 실측 · 분석 → (fix) → 8. 한때 셋까지 뜨므로 다섯 상한(C142) 안이다. 커밋은 요청자가 지시할 때만 한다. 배포 차례는 '설정 적재(off) → push · 배포 → 서버 확인 → 요청자 가 → ios 켜기 → 15분 수업'이고, 되돌림은 'off' 한 번이다.

| 묶음 | 시작 조건 | 루프 · 에이전트 | 손대지 않는 파일 | 시험 | AC |
|---|---|---|---|---|---|
| 0 설정 키 여섯 | 바로(Edit 로 speech.* 행만) | 가벼운 루프: 구현자 Opus high · code-reviewer Opus high 범위 한정, Minor 는 컨트롤러 | 기계 · 접점 · 화면 | discard-settings · `pnpm check:ids`(CI 인자) | AC-4 · 11 · N3 일부 |
| 1 기계 | 바로 | 전체 루프: 구현자 Opus high → code-reviewer Opus xhigh → fix | src/lib · 화면 · 설정 | discard-flow · discard-flow-invariants | AC-3 · 5 · 6 · 7 · 9 · 13 기계 몫 |
| 2-가 음성 접점 | 바로(types.ts 가 첫 걸음) | 전체 루프(같은 꼴) | listen 판정 · 기계 · 화면 | discard-browser · 기존 음성 단위 시험 다섯 그대로 | AC-8 · 11 · 12 접점 몫 |
| 2-나 층 | 0 · 1 · 2-가 Approved(층은 DiscardSettings 를 씀) | 전체 루프 | browser.ts(고칠 일은 2-가 fix 로) · 화면 | discard-layer · discard-replay | AC-5 · 6 · 7 · 9 · 11 층 몫 |
| 4 기록 칸 | 2-가 구현자 관문 통과 | 구현자 Opus high → code-reviewer Opus xhigh 한 번(재검토는 Important 가 남을 때만) | browser.ts · 층 · 화면 | discard-listen-log · talk-mic-deaf 그대로 | AC-10 |
| 6 짧은 말 목록 | 'AI 몫 넓힘' 커밋 · 0 Approved | (가) 구현자 Opus high 규격 · 검사 → (나) curriculum-designer Opus xhigh 내용 → (다) design-reviewer Fable max 아이 눈 | 카드 · 다른 목록 내용 | talk-short-lines · `pnpm seed:validate` | AC-3 소리 몫 |
| 3 화면 잇기 | 0 · 2-나 · 4 · 6 Approved | 전체 루프 + design-reviewer Fable max(화면 · 문구, CI e2e 사진 묶음) | 기계 · 층 · browser.ts · tori.tsx | discard-screen · 기존 회화 단위 시험 그대로 | AC-2 · 3 · 4 · N2 화면 몫 |
| 5 e2e · 통합 | 3 Approved | 구현자 Opus high → code-reviewer Opus xhigh | 앱 코드(고칠 일은 그 묶음 fix 로) | talk-discard · talk-discard-listen(둘 다 CI) | AC-2~13 · N1 e2e 몫 |

1. [사람 · 컨트롤러] **시작 조건.** 'AI 몫 넓힘' 을 먼저 커밋하기를 권한다(요청자 지시 때). 그 plan 16번은 마이크 우회와 한 번에 커밋한다고 적었지만, 묶음 6 이 그 변경의 목록 장치 파일 다섯을 함께 고치고, 따로 커밋하면 15분 실측에서 두 변경의 원인을 가르기 쉽다. 커밋 전이면 묶음 0 은 Edit 로 speech.* 행만 더하고 묶음 6 · 7 은 기다린다. 바탕 관문 `pnpm lint` · tsc · `pnpm test` · `pnpm check:ids`(ci.yml 42줄 인자, `--design-number-max 49`)가 0 인지 적는다(지금 design-number 46).
2. [문서 · 설정] **묶음 0.** 정본 12절 여섯 행을 먼저 쓰고 본 저장소 ↔ p13d `specs/` 를 `diff -q` 로 같게 둔다. 완료: 관문 0 · check:ids(CI 인자) 0 · design-number 49 이하.
3. ∥ [core] **묶음 1.** 시험을 먼저 쓴다(설계 1 표를 행마다 옮긴 표 시험 → 불변식 · 변이). 완료: 관문 0 · 새 시험 통과 · 시점 숫자 0.
4. ∥ [음성] **묶음 2-가.** types.ts 를 첫 걸음으로 둔다(묶음 4 가 그것을 기다린다). 기존 음성 단위 시험(speech-speak · talk-mic-deaf · mic-check · speech-feedback · fake-web-speech-defaults)은 고치지 않는다. 완료: 관문 0.
5. [음성] **묶음 2-나**(0 · 1 · 2-가 Approved 뒤). 완료: 관문 0 · replay 시험이 기록 7 · 8 차례의 효과 순서를 낸다.
6. ∥ [기록] **묶음 4**(2-가 구현자 관문 통과 뒤). 완료: 관문 0.
7. ∥ [시드] **묶음 6**('AI 몫 넓힘' 커밋 · 0 Approved 뒤). 완료: `pnpm seed:validate` 0 · 설계 검토자 아이 눈 판정.
8. [화면] **묶음 3**(0 · 2-나 · 4 · 6 Approved 뒤). 기다림 표시 꼴 표본 셋 이상(흐린 고리 · 점 셋 꼴 포함, M-12)을 표본 쪽 아티팩트로 만들어 정할 것 8 과 함께 보이고, 답 전에는 1번으로 구현한다. 완료: 관문 0 · 기존 회화 단위 시험 고침 없이 통과 · 화면 검토 Approved.
9. [검증] **묶음 5**(3 Approved 뒤). e2e · 통합은 CI 에서만 돈다(이 Mac 불가, 보고에 '안 돌림'으로 적음). 완료: 관문 0 · `pnpm build`(되면).
10. [DB · 사람] **설정 적재 A(개발 DB, 첫 push 전).** `pnpm seed:load --reference-only --dry-run` 으로 '설정 넣음 6 · 그 밖 0'을 본 뒤 적재한다. 넣지 않으면 T-171 꼴 `--partial` 로 한다. 키가 없으면 회화 화면 · 첫 실행이 던지므로 이 차례를 바꾸지 않는다(T-157).
11. [사람] **커밋 · push**(요청자 지시 때, 비밀값 · 아이 이름 확인) 뒤 CI checks(통합 포함) · e2e 결과를 적는다. 안 돈 시험을 통과로 치지 않는다.
12. [검증] **서버 확인**(컨트롤러): 프리뷰에서 회화 3단계 단원 1 수업 1 을 인사부터 대화 턴 하나까지 돌려 설정 읽기 오류 0 · Vercel 실행 오류 0 · 개발 DB 여섯 행을 본다. off 라서 iPad 동작은 지금과 같다고 프리뷰 상태표에 적는다.
13. [사람] **요청자 답.** 정할 것 8 · 9 · 10, 부모 문구, 기다림 표시 번호를 한 물음 쪽으로 받는다. '가'가 아니면 spec 은 superseded 이고 코드는 off 로 남으며, 지울지는 따로 정한다.
14. [문서] **묶음 7**(반영 편집자 Opus high, 13절 답 줄 · 승인 줄은 컨트롤러가 먼저). 고른 부모 문구 · 표시 번호는 묶음 3 의 상수에 컨트롤러가 직접 넣는다(Minor).
15. [DB · 사람] **켜기**(정한 것 7): 개발 DB speech.discard_mode 행을 'ios' 로 고친다. 실측이 끝날 때까지 seed:load 하지 않는다.
16. [사람 · 검증] **15분 실측과 분석.** 요청자가 iPad 로 3단계 회화 수업 하나를 한다(시작 전 45초 넘게 쉼). 분석가(Opus xhigh)가 그 세션의 talk_turns.client_listen · attempts.input 의 dc 칸을 읽기 전용으로 뽑아 10.20.7 열두 항목, 우려 7 갈래 셈, 소리 종류별 낱말 인식, 기다림 셋을 채운다. 못 채우면 실패 턴의 갈래 · 끝 까닭으로 원인을 찾아 고친다(fix 3회까지, 넘으면 요청자에게). 되돌림은 'off' 한 번이다.
17. [설정] **묶음 8 켬 확정**(통과 뒤, 가벼운 루프). 시드 · TEST_SETTINGS · 12절을 'ios' 로 바꾸고 e2e 공용 test 에 discardMode 선택(기본 off)을 둔다. 13절 잠정값 확정 줄은 컨트롤러가 단다. 커밋 · push(요청자) 뒤 seed:load 한다. 그 뒤에야 'AI 몫 넓힘' 의 iPad 회화 품질 검증 완료를 칠 수 있다(C210).

## 구현 브리프 머리 '맥락' 절 (묶음마다 열 줄 안)

공통 다섯 줄(모든 브리프 머리에 그대로):
- 결정: 13절 C212(시드 discard_mode 'off', 켜기는 정할 것 8 · 9 · 10 '가' 뒤) · C210 · C210 보완(deaf_skip_after) · C53 (2) · C166 R1 · R2 · C201 · C149 · 요청자 결정 2026-11-06 6 가(녹음 안 함 · 서버형 인식 불승인 · 기술 오류 비기록).
- 정본: spec `intent/2026-11-07-iPad-버리는-듣기/spec.md` 설계 1~8 과 이 plan 의 '정한 것' · '접점'. 깊은 근거는 분석 10.20.4(F1~F12) · 10.20.7, 기록 7 · 8 이다.
- 요청자 강조: iPad 마이크 안정화가 최우선이고, 녹음하지 않으며, '말하기 → 한 번 더 눌러 멈춤 → 선생님 말 → 다시 말하기'를 꼭 본다.
- 지킬 것: off · 켜지 않은 기기는 지금과 글자까지 같다(기존 시험 단언을 고치지 않음). 시점 숫자는 설정에서 읽는다(design-number 46/49). 시험 이름은 'AC-' 로 시작하지 않는다.
- 일터: 워크트리 `.claude/worktrees/p13d`(세션 cd 금지, 서브셸만), pnpm 은 PATH 앞에 `~/.nvm/versions/node/v24.22.0/bin`, 로컬은 단위만 돈다. '손대지 않는 파일' 목록은 건드리지 않는다.

묶음별로 더할 줄:
- 0: 앞 묶음이 없다. 같은 세 파일의 talk.* 두 행은 'AI 몫 넓힘' 것이라 Edit 로 speech.* 행만 더한다. 12절 '끔'과 "off" 는 check:ids VALUE_WORDS 로 짝지어진다.
- 1: 설계 1 표 · '보류한 읽기' · '기다리는 누름' · '굳은 읽기' 문단이 정본이다. U23(F6 · F8)을 불변식으로 고정하라는 것이 분석 10.20.8 의 요구다. 시간 묶음은 정한 것 4 다.
- 2-가: 음성 접점은 모든 영역이 쓴다. 새 길은 openDiscard 와 trace 셋뿐이고, speak · listen · 감시의 지금 길은 그대로 둔다.
- 2-나: 묶음 1 의 기계 API 와 2-가 의 접점을 잇는다(접점 표). 재현 차례는 기록 8 차례표(16~31줄)와 기록 7 차례 0~8 이다. 참고 구현은 `w-round2.ts` 의 gapThenReal(559) · END_WAIT_MS 다.
- 4: C149(글 · 소리 없음)와 접점 dc 칸이 기준이다. pe 는 버림 end 도 앞 객체로 센다(설계 5).
- 6: 'AI 몫 넓힘' 의 목록 장치(`check-talk-lists.ts` 의 신호 말 검사)를 그대로 따른다. 내용은 R16 '가'(짧은 선생님 말)이고, 예처럼 서너 낱말 줄로 쓴다(기록 8 의 'Okay.' 한 낱말 꼴은 우려 1 의 대상이다).
- 3: 설계 2 · 3 과 정한 것 1 · 5 · 6 이 기준이다. 'AI 몫 넓힘' 앱 줄(신호 말 · 상황 줄 · 장면 여는 질문 · 대신 줄)은 stream(onAdd · onSound)으로 와서 같은 읽기 줄을 탄다. 기다림 표시 꼴은 표본으로 고른다(기억 '시각 결정은 표본 쪽으로').
- 5: e2e 는 CI 에서만 돈다. 가짜 음성은 start 차례로 대본을 배정하므로 버림 객체 자리에 버림 대본을 끼운다. 켬은 withHouseholdSetting('speech.discard_mode', 'ios')으로만 하고 TEST_SETTINGS 는 off 다.
- 7 · 8: 요청자 답 원문과 15분 실측 분석 보고를 먼저 읽는다. 정본 7절 9줄 · 34줄은 C211 반영 뒤의 글 위에 얹는다.

## 위험 · 제약 (Risks)

1. **읽기 줄 굳음(F7 · cancel).** 앱은 읽기마다 cancel 을 부르고(`browser.ts:457`), 굳은 speaking 은 진짜를 열 때 cancel 한 번과 after 기다림 뒤 그대로 연다(우려 7 라). 막는 것은 replay 시험(기록 8 차례 9~11 · 기록 7 차례 3)이다. cancel 로도 안 풀리는 굳음은 띵 대비책(우려 3)의 몫이고 이번에는 쓰지 않는다.
2. **살아 있는 버림(F3).** stop 만 쓰고 abort 0 을 단위 · e2e 로 고정한다. 드물어서(기록 8 0/12) 실측에서 나오면 dc.g live 로 센다.
3. **숨김 · 떠남(F11 · FR-9).** 숨김은 지금처럼 abort 하고 '버림부터'로 간다. 틀이 떠남 자리(쉬는 안내 · 막힘 · 마무리 · 홈, 정리 따라 말하기는 떠남이 아님) 하나를 빠뜨리면 버림이 열린 채 남는다. 화면 단위 시험의 자리 목록 · e2e(AC-9) · 실측 항목 10 이 막는다.
4. **오래 생각한 뒤(우려 7 바).** stop 뒤 진짜까지 1초보다 긴 때의 근거가 기록 5 하나뿐이다. 실측에서 dc.w · pe 로 센다.
5. **측정 0 갈래 둘(우려 7 가 · 나).** 대기에서도 소리 끝 뒤 간격을 두는 갈래와 discard · live 대기의 사이 읽기다. dc.sr · g 로 세고, 실측 항목 7 에 '힌트 문장 듣기 뒤 진짜'를 더한다.
6. **iOS 판 바뀜(U22).** 고쳐진 판이 나오면 버림 as 띠가 바뀔 수 있다. dc.as 로 지켜보고, 필요 없어지면 'off' 한 줄로 끈다(코드 배포 없음).
7. **'AI 몫 넓힘' 과의 겹침.** 공용 파일은 settings.json · TEST_SETTINGS · 12절 · 목록 장치 다섯 · 정본이다. 시작 조건(순서 1) · Edit 만 · 파일 주인 표가 막는다. 그 spec 의 앱 줄은 stream 으로 와 틀의 같은 읽기 줄을 타므로 소리 끝 계약(아이 차례로 넘긴 뒤 줄 빔) 하나로 덮인다. 그 변경이 뒤에 talk-frame 에 앱 줄을 더하면 이 계약을 지키도록 그 쪽 장부에 한 줄을 남긴다.
8. **설정 키 빠짐(T-157 꼴).** 새 키가 DB 에 없으면 회화 화면 · 첫 실행이 던진다. 적재 A 를 push 앞에 두고(순서 10) 서버 확인(순서 12)으로 본다.
9. **켜기 뒤 seed:load.** '시드' 키라 적재가 'off' 로 되돌린다(정한 것 7). 실측 동안 적재하지 않고, 적재했으면 'ios' 로 다시 고친다. 'AI 몫 넓힘' 카드 적재 C 와 날을 겹치지 않는다.
10. **CI 관문.** design-number 가 46/49 라서 새 src 코드에 설정값과 같은 수 글자(0 · 1 · 2 밖)를 쓰면 막힌다. 수는 설정에서 읽고, 구조 수는 맨 위 대문자 상수로 둔다. spec:trace 는 정한 것 11 로 피한다.
11. **공용 접점 · 컴포넌트.** browser.ts 와 speak-button.tsx 는 모든 영역이 쓴다. 새 함수 · 선택 속성만 더하고, 기존 음성 · 말하기 · 읽기 시험이 그대로 통과해야 한다.
12. **e2e 대본 배정.** 켬 확정(묶음 8) 때 TEST_SETTINGS 가 'ios' 가 되면 기존 회화 e2e 가 켬 모드로 돈다. e2e 공용 test 의 discardMode 기본 off 가 막는다.
13. **부모 화면이 아직 없다.** 부모 화면은 1-나 범위라 코드에 없으므로, AC-4 의 부모 화면 마이크 행은 지금 하지 못하고 첫 실행 줄만 둔다. 부모 화면이 생길 때 discardNoticeShown 으로 한 줄을 넣도록 장부에 T 번호를 단다. 요청자 가정은 첫 실행을 지나서 이 줄을 보지 못하므로, 정할 것 8 물음에 문구를 그대로 보인다.
14. **처리 위치(07:13).** 켜면 선생님 말 동안에도 기기 음성 인식이 소리를 받는다. 요청자 '가'와 부모 문구 뒤에만 켜고, getUserMedia · MediaRecorder 0 과 버림 글이 어디에도 없음을 e2e 가 본다.
15. **범위.** 회화 단계 평가 대화 · 말하기 세션 · 말하기 배치는 범위 밖이다(우려 8). 층은 회화 수업 틀(TalkLessonFrame)에서만 만든다.

## 증명 (Proof)

| 수용 기준 | 증명 | 파일 · 명령 |
|---|---|---|
| AC-1 | 요청자 iPad 15분 수업: 10.20.7 표 · 우려 7 갈래 셈 · 소리 종류별 낱말 인식 · 기다림 셋 | 순서 15 · 16, 분석 보고 |
| AC-2 | 읽는 중 누름 → 기다림 화면 · 진짜 한 번 · '말해 보세요' 지움 · 쪽지 흐림과 문구 · 버림 동안 선생님 창 · 물결 · 고리 없음 | e2e talk-discard(기다림 · 쪽지 · 선생님 창) · 단위 discard-screen |
| AC-3 | 다시 말할 자리 다섯의 소리 요청 · 소리 전 stop 없음 · deaf 뒤 auto 진짜 · deaf_skip_after 번째는 없음 · 회복 화면 차례 | 단위 discard-flow · e2e talk-discard(회복) |
| AC-4 | iPad 꼴 첫 실행 부모 줄(ios · all 만) · 모드 × 기기 표. 부모 화면 행은 위험 13 | e2e talk-discard(첫 실행) · 단위 discard-settings · discard-screen · 요청자 문구 |
| AC-5 | F1 · F2 · F4 · F5 · 대기(discard)의 읽기 · 잠금 풀기 전 start 0 | 단위 discard-flow · discard-replay |
| AC-6 | live(as 260 · audiostart 없음 · 둘째 not_played)의 stop · abort 0 · 첫째 not_played 는 연 채 · reopen(self_end · cap) · 소리 있던 cap | 단위 discard-flow · discard-replay · e2e talk-discard(살아 있는 버림) |
| AC-7 | 무작위 표본 불변식 F6 · F8 · 변이 둘이 걸림 · 진짜가 열린 동안 speak 0(spokenAt) | 단위 discard-flow-invariants · e2e talk-discard |
| AC-8 | 모든 speak 앞 cancel(`tests/unit/speech-speak.test.ts:282` 그대로) · 버림 객체 stop · abort 0 · F9 두 갈래 | 단위 speech-speak · discard-browser · discard-flow |
| AC-9 | 숨김 → interrupted:hidden · rest 안이면 reopen(hidden) · rest 뒤면 곧바로 진짜 · 떠남에 stop 한 번 | 단위 discard-flow · discard-replay · e2e talk-discard(숨김) |
| AC-10 | 기존 deaf 시험 그대로 · dc 꼴 · 옛 기록 통과 · e2e talk_turns 의 dc | 단위 talk-mic-deaf · discard-listen-log · 통합 talk-discard-listen · e2e talk-discard |
| AC-11 | 정한 것 8 의 셋 · 키 하나를 빼면 던짐 · 12절 ↔ settings.json 짝 | 단위 discard-layer · discard-settings · 기존 단위 · 통합 · e2e 전부 · `pnpm check:ids`(CI 인자) |
| AC-12 | 'ZEBRA' 표지 글이 화면 · 대화 기록 · talk_turns · 턴 요청 본문 · trace · client_listen 에 없음 · getUserMedia · MediaRecorder 0 | e2e talk-discard · 단위 discard-browser · 통합 talk-discard-listen |
| AC-13 | 버림 상태 · 기다림 · 회복이 셈 · validity 를 바꾸지 않음, deaf 가 이어진 건너뜀만 mic_deaf | 단위 discard-flow · discard-screen · 통합 talk-discard-listen |
| AC-N1 | 같은 표본을 off · ios 로 돌려 AI 호출 수(talkTurnRequests)와 /api/talk/turn 요청 본문(client_listen 뺌)이 같음 | e2e talk-discard |
| AC-N2 | 새 문구 넷이 해요체 · 단추 하나 | design-reviewer Fable max · 요청자 문구(순서 13) |
| AC-N3 | 새 모듈 · 층에 시점 숫자 없음 | code-reviewer · `pnpm check:ids` design-number 49 이하 |
| 늘 | 린트 · 타입 · 단위 · 의존 · 시드 · 추적 · 빌드 · CI | `pnpm lint` · tsc · `pnpm test` · `pnpm check:deps` · `pnpm seed:validate` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` · `pnpm build` · CI 통합 · e2e |

## 완료 보고 (Done)

구현 뒤 갱신한다: 실제 바뀐 파일(계획과 다른 것 표시) · 묶음별 시험 결과 · CI 통합 · e2e 결과(안 돈 것은 '안 돌림') · 15분 실측 결과 · 남긴 것 · 커밋.
