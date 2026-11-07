# 구현 보고: P13d 묶음 d5 — 선생님 상태 · 목소리 고르기(순수) · 음성 층(impl-teacher-d5 · Opus · high, 2026-10-23)

상태: DONE_WITH_CONCERNS(d5 몫은 다 됐고 관문도 d5 몫은 초록이다. 우려는 아래 '남은 우려' 1 — 다른 묶음의 쓰는 중인 시험이 tsc 를 깨뜨림).

근거: `intent/2026-10-17-회화-선생님-캐릭터/plan.md`(approved, C141 · C142) 값 11 · 값 12 · 작업 순서 2 · 증명 AC-19g · 19h · 19j 함수 몫. 자리는 워크트리 `.claude/worktrees/p13d`(가지 feature/1a-p13d-teacher). 커밋 · push · stash 없음.

참고: 워크트리 가지에는 plan.md 가 아직 없어서(plan 게이트 커밋 74ebdf7 이 본 저장소 main 쪽에만 있음) 본 저장소의 approved 판을 읽었다.

## 바뀐 파일

| 파일 | 신규 · 수정 | 줄 | 내용 |
|---|---|---|---|
| `src/core/teacher/state.ts` | 신규 | 1~169 | `TEACHER_STATES` · `TeacherState` · `teacherStateOf` · `praiseUntilOf` · `MOTION`(이름 붙인 진폭 · 주기 · 깜빡임 0.18초) · `TeacherPose` · `sampleMotion` · `blinkAt` · `createLoadTurn` |
| `src/core/teacher/voice.ts` | 신규 | 1~24 | `preferredVoice(voices, lang, prefer)` |
| `src/lib/speech/types.ts` | 수정 | 18~28, 149 | `SpeakOptions` 에 `pitch?` · `voicePrefer?` · `onStart?`, 기록 'speak' 줄에 `pitch?` |
| `src/lib/speech/browser.ts` | 수정 | 25, 434~450, 467~471 | `preferredVoice` 가져오기, 목소리 = 순서가 있으면 preferredVoice 아니면(또는 맞는 것 없으면) pickVoice, pitch 는 넘긴 때만 utterance.pitch 와 기록, `onstart` 에서 기록 뒤 `onStart`(지금 발화일 때만). `unlockFromGesture` 그대로 |
| `src/lib/speech/fake-web-speech.ts` | 수정 | 19~22, 53~54, 265~267 | `FakeSpeechRecord.pitches: number[]` · `voices: (string \| null)[]`(spoken 과 같은 차례) |
| `src/lib/speech/teacher.ts` | 신규 | 1~60 | `teacherSpeech(port, { pitch, voicePrefer, onSpeaking })` · `TeacherVoiceOptions` |
| `tests/unit/teacher-state.test.ts` | 신규 | 1~176 | 아래 시험 이름 |
| `tests/unit/teacher-voice.test.ts` | 신규 | 1~52 | 〃 |
| `tests/unit/teacher-speech.test.ts` | 신규 | 1~198 | 〃 |
| `tests/unit/speech-speak.test.ts` | 수정 | 3~4, 20~56, 72, 76, 105~210 | 가짜 utterance 에 pitch · 시작 알림, 목소리 목록을 시험마다 둠, 시험 일곱 더함 |
| `tests/unit/fake-web-speech-defaults.test.ts` | 수정 | 19~22, 41, 110~134 | 읽어 주기 목소리를 넘길 수 있게, 시험 하나 더함 |

d5 범위(`src/core/teacher/{state,voice}.ts` · `src/lib/speech/` 와 그 시험) 밖은 건드리지 않았다.

## 덮는 시험 이름

`tests/unit/teacher-state.test.ts`(14)
- 선생님 움직임: 말하기 밖(쉬기 · 듣기 · 생각 · 칭찬)에는 입이 0 이다 — 시제품 1
- 선생님 움직임: 말하기는 입을 0.3 넘게 여는 때가 있고 늘 0~0.65 안이다 — 시제품 2
- 선생님 움직임: 움직임 줄이기면 몸 · 고개가 시간과 관계없이 같고 말하기 입만 바뀐다 — 시제품 3 + 다섯 상태 모두 (AC-19h)
- 선생님 움직임: 듣기는 고개를 기울이고 칭찬은 웃음이 눈에 띄게 커진다 — 시제품 4
- 선생님 움직임: 모르는 상태는 쉬기와 같고 입을 열지 않는다 — 시제품 5
- 선생님 움직임: 움직임 줄이기가 아니면 쉬기도 시간에 따라 몸이 움직인다
- 선생님 상태: 듣기 → 생각 → 말하기 → 칭찬 → 쉬기 차례로 앞이 이긴다
- 선생님 상태: 칭찬은 now 가 praiseUntil 앞일 때만이고 닿으면 쉬기다
- 선생님 상태: 칭찬 끝 시각은 지금 + 설정 초 × 1000 이다
- 선생님 상태: 다섯 상태 이름은 쉬기 · 말하기 · 듣기 · 칭찬 · 생각이다
- 선생님 깜빡임: 시작 뒤 깜빡임 시간 동안 사인 곡선이고 그 밖은 0 이다
- 선생님 깜빡임: 움직임 줄이기면 늘 0 이다 (AC-19h)
- 불러오기 차례: 마지막으로 받은 번호만 지금 차례다
- 불러오기 차례: 따로 만든 차례 번호는 서로 섞이지 않는다

`tests/unit/teacher-voice.test.ts`(6, AC-19j)
- 선생님 목소리 고르기: 순서 조각의 차례가 목소리 목록 차례보다 앞선다
- 선생님 목소리 고르기: 첫 조각에 맞는 목소리가 없으면 다음 조각으로 간다
- 선생님 목소리 고르기: 언어가 같은(소문자 · '_' 를 '-' 로) 목소리만 고르고 en-GB · en-AU 는 고르지 않는다
- 선생님 목소리 고르기: 맞는 목소리가 없거나 순서가 비면 undefined 다
- 선생님 목소리 고르기: 빈 조각은 아무 목소리에나 맞지 않게 건너뛴다
- 선생님 목소리 고르기: 받은 목소리 객체를 그대로 돌린다

`tests/unit/teacher-speech.test.ts`(13, AC-19g 감싸기 몫)
- 선생님 음성: speak 마다 선생님 높이 · 목소리 순서를 넣고 빠르기는 부르는 쪽 값 그대로다
- 선생님 음성: 시작 알림 없는 발화는 말하기가 아니고 결과에도 끄는 알림이 없다
- 선생님 음성: 미지원(unsupported) 결과도 시작이 없었으면 알림이 없다
- 선생님 음성: 시작 알림에 켜고 ended · cancelled · error 뒤 끈다(셋)
- 선생님 음성: 부르는 쪽의 시작 알림도 함께 부른다
- 선생님 음성: 겹친 발화는 마지막 시작 발화가 끝날 때만 끈다
- 선생님 음성: 앞 발화가 끝난 뒤 다음 발화가 시작하면 다시 켠다
- 선생님 음성: 결과가 난 뒤 늦게 온 시작 알림은 말하기를 켜지 않는다
- 선생님 음성: 한 발화의 시작 알림이 두 번 와도 한 번만 센다
- 선생님 음성: 듣기 · 장치 · 잠금 풀기 · 끊기 · 마이크 · 닫기는 그대로 넘긴다
- 음성 층: src/lib/speech 는 navigator.audioSession 을 쓰지(바꾸지) 않는다(C109) — 모든 파일 쓰기 없음, browser.ts · teacher.ts 는 낱말도 없음

`tests/unit/speech-speak.test.ts` 더한 일곱(AC-19j 음성 층 · AC-19g 시작 알림)
- 음성 접점: 넘긴 높이는 utterance.pitch 로 읽고 넘기지 않으면 기본 높이 그대로다
- 음성 접점: 목소리 순서가 있으면 그 목소리, 맞는 것이 없거나 순서가 없으면 pickVoice 목소리다
- 음성 접점: 기록 speak 줄에 넘긴 높이가 남는다
- 음성 접점: 시작 알림은 발화가 실제로 시작한 뒤 한 번, 결과보다 앞에 온다
- 음성 접점: 시작하지 않은 발화(오류로 끝남)는 시작 알림이 없다
- 음성 접점: 끊긴 발화의 늦은 시작 알림은 넘기지 않는다
- 음성 접점: 잠금 풀기는 시작 알림을 넘기지 않고 이어진 읽어 주기만 알린다

`tests/unit/fake-web-speech-defaults.test.ts` 더한 하나
- 가짜 음성: 기록에 읽어 준 높이 · 목소리 이름이 spoken 과 같은 차례로 남는다(목소리 없으면 null)

시제품 대조(저장소 밖 scratch, 한 번): 시제품 `motion.js` 와 `sampleMotion` 을 여섯 상태(모르는 상태 포함) × 움직임 줄이기 둘 × 시간 500점 = 6000 표본에서 JSON 으로 비교해 다른 것 0. 셈 차례를 그대로 두어 부동소수 값까지 같다.

## 관문 결과(워크트리, Node 24.22.0)

```
pnpm lint                                   → Checked 412 files. No fixes applied.
pnpm exec next typegen && pnpm exec tsc --noEmit
                                            → error TS 6개, 모두 tests/integration/teacher.test.ts(d2 가 쓰는 중 — '@/server/teacher' · '@/server/actions/teacher' 없음 등). d5 파일 오류 0.
pnpm test                                   → Test Files 86 passed (86) · Tests 906 passed | 6 todo (912)
pnpm check:deps                             → no dependency violations found (207 modules, 1092 dependencies cruised)
pnpm exec vitest run (d5 다섯 파일)          → Test Files 5 passed (5) · Tests 45 passed (45)
```

## plan 으로 풀리지 않아 정한 것

1. **음성 접점의 시작 알림은 지금 발화일 때만**: plan 은 '`utterance.onstart` 에서 기록 뒤 onStart'다. 끊긴 발화의 onstart 가 늦게 오면 말하기가 켜진 채 남을 수 있어 `speaking === current` 일 때만 넘긴다(기록 줄은 그대로 남김). 감싸기도 결과 뒤 늦은 알림 · 두 번째 알림을 세지 않아 두 겹으로 막았다.
2. **감싸기에서 선생님 값이 이긴다**: 감싼 접점의 speak 에 부르는 쪽이 pitch · voicePrefer 를 넘겨도 선생님 값으로 덮는다(빠르기 · onStart 는 부르는 쪽 것 그대로, onStart 는 함께 부름). 감싼 접점은 회화 쪽 전부가 같은 목소리를 내는 자리라서다. '인사 듣기'(d6)는 감싸지 않은 접점에 직접 넘기므로 걸리지 않는다.
3. **onSpeaking 은 바뀔 때만**: 0 → 1 에 true, 1 → 0 에 false. 겹친 발화(앞 발화가 끊기고 다음이 시작)에서는 앞 결과가 먼저 오면 false → true 로 잠깐 꺼졌다 켜진다(브라우저가 끊긴 발화의 결과를 다음 시작보다 먼저 내기 때문). 수를 세므로 어느 차례로 와도 마지막 결과 뒤에는 꺼진다.
4. **감싸기 끝 처리는 finally**: 드물게 port.speak 가 거절해도 센 수가 남지 않게 했다.
5. **빈 목소리 조각은 건너뜀**: 빈 문자열은 모든 이름에 들어 있어 첫 목소리를 고르게 된다. 명단 검사(d1)가 빈 조각을 막는지는 확인하지 않았다.
6. **blinkAt 의 음수 나이는 0**: 시제품은 blinkStart 가 elapsed 뒤면 음수 사인을 낸다(실제로는 생기지 않음). 0 으로 막았다. 그 밖 값은 시제품과 같다.
7. **sampleMotion 의 state 형은 TeacherState**: 모르는 값은 switch 의 default(쉬기)로 간다. 시험은 `as TeacherState` 로 흉내.
8. **MOTION 묶음 이름**: base(숨쉬기 흔들림) · speaking(nod · smile · mouth) · listening(tiltZ · nodX · smile) · praise(nod · tiltZ · smile) · thinking(turnY · nodX · tiltZ · smile) · blinkSeconds. 다음 깜빡임 간격 3~6초는 plan 대로 그림 층(d8) 몫이라 넣지 않았다.
9. **audioSession 훑기 자리**: 증명 표는 이 훑기를 `teacher-scan.test.ts` 에 두지만 그 파일은 d4 몫이라 `teacher-speech.test.ts` 에 두었다. d4 가 teacher-scan 에 같은 훑기를 두면 겹친다(하나로 합칠지는 컨트롤러가).
10. **fake-web-speech-defaults 는 '확인'이었지만 시험 하나를 더함**: 새 기록 칸(pitches · voices)을 덮는 시험이 따로 없어서다.

## 요청하는 변경(공용 파일 · 설계)

없음.

## 남은 우려

1. `pnpm exec tsc --noEmit` 이 d2 의 `tests/integration/teacher.test.ts`(쓰는 중) 때문에 오류 6개로 끝난다. d5 파일에는 오류가 없다. d2 가 서버 파일을 마치면 풀릴 것으로 본다.
2. 기록 'speak' 줄에는 plan 대로 pitch 만 더했고 voicePrefer 는 넣지 않았다(고른 목소리 이름은 원래 voice 칸에 있음).
3. e2e(AC-19g · 19j 화면 몫 — 회화 읽어 주기 pitch 1.08 · 읽기 세션 pitch 1 등)는 d7 몫이라 돌리지 않았다. 가짜 기록 칸은 준비됐다.
