# e2e 실패 13건 분류(2026-11-06, CI 여섯째 실행 42084600273, 커밋 806801f)

분석가 보고입니다. 코드 · 시험 · 설정은 바꾸지 않았습니다. 판정은 로그 · 실패 증거(error-context · trace) · 코드 · 정본 대조입니다.

## 0. 먼저 알릴 것

- **'WebKit 전용' 전제는 확인되지 않습니다.** `playwright.config.ts:83~88` 의 프로젝트는 `tablet-10-9-webkit` 하나뿐이고, 크로미움 프로젝트는 없습니다. CI 의 e2e · e2e-local 두 작업도 WebKit 만 설치합니다(`.github/workflows/ci.yml:81 · 115`). 그래서 "같은 시험이 크로미움에서 통과했다"는 기록은 어디에도 없습니다. 13건은 브라우저 차이로 가르지 않고, 실패마다 앱 · 시험 코드와 정본을 대조해 갈랐습니다.
- **13건은 직전 실행에서도 똑같이 실패했습니다.** f4ec058 실행(42038674393, 13 failed · 185 passed)에서 같은 13건이 같은 줄 · 같은 값으로 실패했고, 두 실행 모두 첫 시도와 재시도가 같았습니다(결정적). 그래서 C202~C204(b462c21 · 806801f)가 낳은 실패가 아닙니다. 첫 실행 고침 A · B · D 로 시험이 처음으로 화면 뒤쪽까지 닿으면서 드러난 실패입니다. 이번 실행에서 새로 생긴 것은 흔들림 1건(talk-lesson:819)뿐입니다.
- **판정 결과는 (나) 1 · (가) 1 · (다) 11 이고, 흔들림 1 은 (다)입니다.** (나) 1건은 WebKit 전용이 아니라 브라우저와 관계없는 앱 결함이며, 실제 iPad 에서도 납니다.

## 1. 대조 범위와 본 자료

- 로그: 스크래치패드 `ci-6-e2e-clean.log`(13 failed · 1 flaky · 184 passed, 38.4분, 일꾼 1). 직전 실행은 `ci-4-e2e-clean.log` · `ci-4-job-raw.log`(f4ec058 확인).
- 실패 증거: `gh run download` 로 받은 27벌(실패 13 × 2회 + 흔들림 첫 시도)이 스크래치패드 `ci6-evidence/files/` 에 있습니다. trace 다섯을 `ci6-trace-x/`(safety · tw · stop · wait · flaky)에 풀었고, 읽기 도구는 `tools/net.py` · `tools/actions.py` 입니다(실행 파일은 돌리지 않음).
- 지난 분류 `task-e2e-first-run-triage.md` 와 고침 보고 `task-e2e-fix-1-report.md` · `task-e2e-fix-2-report.md` 를 읽었습니다. 지난 분류의 WebKit 원인은 F(자원 시간 기록) 하나였고, 이번 실패에서 F 고침(fetch 감싸기)은 제대로 돌았습니다(로그 L1442 보낸 때 15868 직후 L1470 기다림 표시).
- 읽은 코드(워크트리 p13d): 시험 `tests/e2e/talk-lesson.spec.ts` · `required-utterance.spec.ts` · `speech-feedback.spec.ts` · `teacher-window.spec.ts` · `talk.ts` · `screen-sampler.ts`, `tests/fixtures/settings.ts` · `seed/builders.ts`, 앱 `src/lib/speech/fake-web-speech.ts` · `browser.ts`, `src/core/speech/listen.ts`, `src/core/conversation/listen.ts` · `lesson-flow.ts`, `src/components/conversation/talk-frame.tsx` · `child-turn.tsx` · `talk-log.tsx` · `follow-along.tsx` · `tori.tsx`, `src/server/conversation/lesson-turn.ts` · `closing.ts`, `src/core/ai/calls/talk-lesson.ts`.
- 정본: `specs/02-2-세션과-단계표.md:162 · 227 · 230 · 282`, `specs/03-화면.md:93 · 99`, `specs/07-음성과-오류.md:25 · 32`, `specs/11-요구사항과-수용-기준.md:170`, 13절 C10(`specs/10-결정-기록.md:158`) · C148(318).

## 2. 판정 표((나)를 맨 위에)

| 묶음 | 판정 | 수 | 시험(spec:줄) | 고칠 자리 | 비용 |
|---|---|---|---|---|---|
| N1 막힘이 풀리면 짧은 준비 쪽지가 첫 낱말로 돌아감 | (나) 앱 · Important | 1 | speech-feedback:442 | `talk-frame.tsx` TalkFrame 의 `prep` 상태 · onRecovered | 작음 |
| E1 가짜 발화 900ms 창이 WebKit 누름 지연보다 짧음 | (가) | 1 | teacher-window:492 | `teacher-window.spec.ts` 시험 대본 | 작음 |
| T1 대화 기록 칸의 지난 아이 말을 표본이 읽음 | (다) | 3 | required-utterance:335 · 396 · 454 | `required-utterance.spec.ts` TALK_WATCH · `screen-sampler.ts` | 작음 |
| T2 인사 턴도 '말 주고받기'에 드는 것을 시험이 빠뜨림 | (다) | 2 | talk-lesson:245 · 480 | `talk-lesson.spec.ts:264 · 508` | 작음 |
| T3 보내기까지의 설정 시간(약 5.3초)보다 짧은 기다림 | (다) | 2 | talk-lesson:512 · 551 | `talk-lesson.spec.ts` 말하고 보내는 도우미 | 작음 |
| T4 말소리 없는 가짜 듣기는 15초 상한에서 끝남 · 두 번 누름은 한 시도 | (다) | 2 | talk-lesson:451 · 779 | `talk-lesson.spec.ts` 말 없이 멈추는 도우미 | 작음 |
| T5 '막히면 눌러요'는 인사 차례에서 보이고 꺼짐 | (다) | 1 | talk-lesson:378 | `talk-lesson.spec.ts:391` | 작음 |
| T6 끝맺음 호출이 회화 턴 표지에 걸림 | (다) | 1 | talk-lesson:877 | `talk-lesson.spec.ts:890~900`(셈 도우미를 `talk.ts` 로) | 작음 |
| 흔들림: 힌트 글을 받는 동안 넷째 누름 | (다) | (1) | talk-lesson:819 | `talk-lesson.spec.ts:851~852` | 작음 |

### N1 (나) 짧은 준비 쪽지 복귀 차례(speech-feedback:442 U4-5 M-3)

- 정본: 막힘 화면의 '다시 해 볼래요'가 되면 '같은 자리'로 돌아가고, 같은 자리는 "회화의 그 턴(따라 말하기는 막힌 그 낱말, 정리는 정리 첫 줄)"입니다(`specs/07-음성과-오류.md:32`).
- 증상: 첫 낱말을 잘 말한 뒤 둘째 낱말에서 막혔고(시험 478 · 482줄 통과), 풀린 뒤 쪽지가 `greeting:0` 입니다(기대 `greeting:1`, 로그 L1874~1890). error-context 의 쪽지 꼴에도 첫 낱말 '가상 낱말 1-1' 이 떠 있습니다.
- 코드가 하는 것: 막힘 판이 본문을 바꾸면서 쪽지(PrepNote)가 내려갑니다. 풀릴 때 onRecovered 는 셈을 비우고 `setBlocked(undefined)` 만 합니다(`src/components/conversation/talk-frame.tsx:1441~1444`). 다시 그린 쪽지는 처음 연 때의 `prep` 상태(688 · 1550~1557줄)로 남은 차례를 셉니다(`src/components/conversation/follow-along.tsx:568~572 · 592~593`). 첫 낱말 저장은 서버로 보내기만 하고 화면 상태는 바꾸지 않습니다(같은 파일 189~205줄).
- 영향: 실제 iPad 에서 권한 거부 · Siri 꺼짐으로 짧은 준비 중에 막힌 아이는 풀린 뒤 이미 말한 낱말부터 다시 합니다. 브라우저와 관계없이 납니다. 같은 시도 id 로 다시 저장하므로 기록이 겹칠 가능성은 낮습니다(추정, 서버 저장 쪽은 읽지 않음).
- 권고: TalkFrame 이 쪽지에서 끝낸 낱말을 `prep.done` 에 더해 두거나(PrepNote onNext 때), 막힘이 풀리면 서버 상태로 `prep` 을 다시 읽습니다. 순수 함수(prepStepsOf)와 복귀 차례의 단위 시험을 함께 둡니다. 시험(U4-5)은 그대로 맞습니다.
- 같은 꼴은 follow-along.tsx 안에서 PrepNote 에만 있습니다(그 파일만 훑음).

### E1 (가) 선생님 창 말하기 기록(teacher-window:492 AC-19g)

- 증상: '시작한 발화가 오류(취소)로 끝난 기록'이 없습니다(527줄, 로그 L2510~2530). 네 번 모두 같습니다.
- trace 쪽 기록(`ci6-trace-x/tw`): 첫 실제 발화 'How are you today?' 가 쪽 시각 1628ms 에 시작했고 2529ms 에 저절로 끝났습니다(대본 endAfter 900, 시험 496줄). 다시 듣기 누름이 만든 새 발화는 2543ms 입니다. 시작을 본 poll 이 약 0.3초 늦었고, 두 단언에 약 0.2초, WebKit 누름 동작에 약 0.35초가 걸렸습니다(trace 동작 시각 2056759 · 2057050~2057401). 그래서 누른 때에는 읽던 발화가 이미 끝나 있었습니다.
- 앱은 맞습니다. 다시 듣기는 읽기 줄을 끊고(`src/components/conversation/tori.tsx:837~851`), 음성 접점은 `speechSynthesis.cancel()` 을 부르며(`src/lib/speech/browser.ts:177~180`), 가짜는 읽던 발화에 interrupted 오류를 냅니다(`src/lib/speech/fake-web-speech.ts:271~282`).
- 권고: 시험 대본의 첫 실제 발화를 수 초로 길게 하거나 neverEnd 로 붙잡고 누른 뒤 확인합니다. 시험이 기대는 창(900ms)이 이 실행 환경의 누름 지연 합(약 0.9초)과 거의 같아서 결정적으로 넘쳤습니다.

### T1 (다) 표본이 지난 아이 말을 읽음(required-utterance:335 · 396 · 454)

- 증상: 둘째 턴 표본 내내 `said` 가 인사 답('I'm good.' · 'I'm fine, thank you.')입니다(로그 L1443~1485 · L1592~1630 · L1735~1772). 선생님 말 · 기다림 표시 · 반응은 제때 왔습니다.
- 원인: 표본의 아이 말풍선 선택자가 `[data-child-said]` 이고(`tests/e2e/required-utterance.spec.ts:96`), 표본기는 문서 차례로 첫 보이는 요소를 읽습니다(`tests/e2e/screen-sampler.ts:54~56 · 64~71`). 대화 기록 칸(묶음 10)은 지난 아이 말을 같은 표지로 그립니다(`src/components/conversation/talk-log.tsx:134` → `child-turn.tsx:217`). 첫 턴은 기록 칸이 비어 통과했습니다.
- 권고: 표본의 `said` 를 마지막 보이는 요소로 읽게 하거나(screen-sampler Watch 에 고르기 선택을 더함), 지금 턴 자리로 좁힙니다. 보낸 뒤 아이 말이 기록 칸으로 옮겨 가는지 모르니 '마지막 보이는 요소'가 안전합니다.
- 고친 뒤 처음 닿는 자리: :335 셋째 턴(선택지를 말해 바로 보냄), :454 상한 턴 뒤 `[data-talk-closed]`.

### T2 (다) 인사 턴의 말 주고받기 셈(talk-lesson:480 AC-15f · :245 AC-15t)

- 정본: 인사 턴은 말 주고받기 수에 듭니다(`specs/02-2-세션과-단계표.md:162 · 227`, `specs/03-화면.md:93`). 앱 셈도 인사 · 대화 구별 없이 말 턴마다 하나를 더합니다(`src/core/conversation/lesson-flow.ts:400~407`). 대화 첫 질문 화면은 이미 '말 주고받기 1' 입니다(error-context 2cacb · e9326 · d5347).
- AC-15f: 다시 연 뒤 '말 주고받기 2'(인사 1 + 대화 1)가 맞는데 시험은 1 을 기대합니다(508줄, 로그 L2168~2180).
- AC-15t: 264줄의 '말 주고받기 1' 이 인사 몫으로 바로 맞아 대화 답을 기다리지 않았습니다. trace(`ci6-trace-x/stop`)에서 말하기 누름(1034127) 180ms 뒤 '그만하기'(1034307)를 눌렀고, 회화 턴 요청은 인사 한 번뿐입니다. 대화 토막의 말 턴이 0 이라 '참여가 거의 없음' 확인 쪽지가 정본대로 떴습니다(`specs/02-2-세션과-단계표.md:230 · 282`).
- 권고: 두 줄의 기대값을 2 로 고치고(또는 인사 뒤 셈 + 1), 264줄 앞에서 회화 턴 응답이 올 때까지 기다립니다.

### T3 (다) 보내기 전 설정 시간보다 짧은 기다림(talk-lesson:512 AC-N8 · :551 AC-15p)

- 증상: AC-N8 은 말한 뒤 기본 5초 안에 `[data-tori-waiting]` 이 없고(529줄), AC-15p 는 583줄 untilChildTurn 이 옛 아이 차례로 바로 통과한 뒤 584줄 5초 안에 힌트 문장 단이 없습니다. 두 화면 모두 인식 확인 칸('다시 말하기' · '보내기')이 떠 있습니다(error-context 11f90 · 55fee). AC-N8 trace 에서 말하기 누름(1301728) 뒤 5초 동안 회화 턴 요청이 없습니다.
- 원인: 1~3단계에서 연 힌트 · 들은 답이 없으면 확인 칸을 `talk.confirm_seconds`(2초) 보인 뒤 보냅니다(`src/core/conversation/listen.ts:105~119`). 그 앞에 끝 침묵 `speech.end_silence_seconds.talk.1-3` 3초가 있습니다(같은 파일 72줄, `tests/fixtures/settings.ts:143 · 176`). 지난 분류 C 와 뿌리가 같습니다.
- 권고: talk-lesson 에 '말하고 보냄' 도우미(required-utterance `sendTurn` 192~200줄 꼴: 확인 칸이 뜨면 '보내기')를 두고 두 시험이 씁니다. 지금의 `speak` 를 바꾸면 통과 중인 시험이 흔들릴 수 있으니 새 도우미로 둡니다.

### T4 (다) 말소리 없는 가짜 듣기(talk-lesson:451 AC-15s · :779 C148 AC-N3)

- 원인: `webkitSilentRun` 은 결과 · 오류 없이 앱이 멈출 때까지 기다리는 10-22 실측 꼴입니다(`tests/e2e/talk.ts:268~288`). 결과가 없으면 끝 침묵 기한이 없고(`src/core/speech/listen.ts:336~339`), 듣기는 상한 `speech.max_listen_seconds` 15초에서 멈춥니다(`specs/07-음성과-오류.md:25`). 멈추면 가짜가 aborted 'No speech detected' 를 내고 앱은 C148 대로 no-speech 로 읽습니다.
- AC-15s: 첫 시도 뒤 5초 안에 '못 들었어요'를 기다렸지만(470줄) 화면은 아직 '듣고 있어요'(누름 상태)입니다(error-context e9326).
- C148 AC-N3: 801줄은 기다림 없이 말하기 단추를 두 번 누릅니다. 둘째 누름은 듣기를 멈추는 단추라 질문 자리마다 시도가 하나만 생깁니다. 끝 화면에는 닫힌 질문 자리 하나와 지금 턴의 '못 들었어요' 하나가 있어(error-context d5347) `speech.silent_items_max`(3)에 닿지 않았습니다.
- 권고: '말 없이 멈춤' 도우미(누름 → `[data-listening]` 하나 → 다시 누름 → '못 들었어요'가 보일 때까지)를 두고 시도마다 한 번씩 씁니다. 15초 상한을 기다리는 길은 시험 시간만 늘립니다.

### T5 (다) '막히면 눌러요' 자리(talk-lesson:378)

- 정본: 프로필의 첫 회화 수업에서 '힌트' 단추에 한 번 보입니다(`specs/03-화면.md:99`, C10).
- 앱: 힌트 단추가 있는 첫 아이 차례에서 보이고 '보였음'을 남기며(`src/components/conversation/child-turn.tsx:385~388`, `talk-frame.tsx:718`), 듣기를 시작하면 끕니다(`talk-frame.tsx:1672~1675`). 견본 인사 질문에 힌트가 있어(`tests/fixtures/seed/builders.ts:2184~2191`) 인사 차례에서 보이고 꺼졌습니다. 대화 첫 질문 화면에는 표지가 없습니다(error-context 2cacb).
- 권고: 391줄 단언을 인사 차례로 옮기고, 대화 차례에서는 없음을 봅니다.

### T6 (다) 안전 상한 뒤 AI 요청 셈(talk-lesson:877 AC-15j)

- 증상: 상한 끝인사는 보였고(894줄 통과) 회화 턴 표지 요청이 1 에서 2 로 늘었습니다(900줄).
- 브라우저가 보낸 회화 턴 요청은 인사(18:58:31)와 대화 답(18:58:44) 둘입니다(trace `ci6-trace-x/safety`). 서버는 상한 턴을 AI 없이 닫고(`src/server/conversation/lesson-turn.ts:1909~1912`) 끝맺음을 예약합니다(1950줄).
- 끝맺음 호출은 'Closing: yes' 이지만(`src/server/conversation/closing.ts:434~466`), 앞 턴 사용자 메시지 전문을 대화 기록으로 다시 보냅니다(`src/core/ai/calls/talk-lesson.ts:234~236 · 1121~1125`). 그래서 인사 턴의 'Closing: no' 가 본문에 들어가 표지(`tests/e2e/talk.ts:37`)에 걸립니다. teacher-window 의 셈은 이미 'Closing: yes' 를 뺍니다(`tests/e2e/teacher-window.spec.ts:301~306`).
- AC-15j 문장은 끝맺음 호출을 막지 않습니다(`specs/11-요구사항과-수용-기준.md:170`).
- 권고: 890~900줄 셈에서 'Closing: yes' 를 뺍니다. 셈 도우미 하나를 `talk.ts` 로 옮겨 speech-feedback(99~102줄) · talk-lesson · teacher-window 가 함께 쓰면 같은 일이 되풀이되지 않습니다.

### 흔들림 (다) 7절 말하기 버튼 행(talk-lesson:819)

- 첫 시도가 852줄에서 120초를 넘겼습니다(로그 L2566~2600). trace(`ci6-trace-x/flaky`)에서 힌트를 세 번 누르고(1601595 · 1601648 · 1601852) 150ms 뒤 듣기 단추 수가 0 이라 넷째로 눌렀습니다. 그때 단추는 다 열려 꺼져 있습니다(`child-turn.tsx:641~651`). 넷째 누름은 꺼진 단추를 끝까지 기다렸습니다.
- 1~3단계 영어 단 글은 열 때 서버에서 받고(`child-turn.tsx:367~381`), 받기 전에는 듣기 단추를 그리지 않습니다(594줄). 재시도는 받기가 빨라 통과했습니다.
- 권고: 반복을 '문장 단이 열릴 때까지 누름 → 듣기 단추가 보일 때까지 기다림'으로 바꿉니다. 7절 버튼 행 동작(듣는 동안 꺼짐 · 끝나면 켜짐) 자체는 재시도에서 확인됐습니다.

## 3. 물으신 것: 듣기 시작 순서 · 읽어 주기 사건 · 타이머와 닿는가

- 듣기 시작 순서와 닿는 실패는 없습니다.
- 타이머와 닿는 실패는 다섯이고 흔들림이 하나 더 있습니다. T3 둘은 끝 침묵 3초 + 확인 2초, T4 둘은 15초 상한, T2 의 AC-15t 는 듣는 중 그만하기, 흔들림은 힌트 글 받기 시간입니다. 모두 시험이 설정 시간을 기다리지 않은 것이고, 앱 타이머는 정본 값대로 돌았습니다.
- 읽어 주기 사건과 닿는 실패는 E1 하나입니다. 가짜 발화 900ms 창이 WebKit 누름 지연을 견디지 못했습니다.
- ana-ipad-listen 이 쓸 사실은 넷입니다.
  1. e2e 가짜 대본에는 실제 iPad Safari 27 꼴('audiostart 뒤 31~41ms 에 no-speech')이 없습니다. `webkitSilentRun` 은 스스로 끝내지 않고 앱이 멈추면 aborted 'No speech detected' 를 내는 10-22 꼴이고(`tests/e2e/talk.ts:268~288`), `failingRun("no-speech")` 는 audiostart 없이 100ms 에 오류를 냅니다(같은 파일 258~266줄). 그래서 e2e 의 통과 · 실패는 실제 iPad 의 이른 no-speech 를 가리지도 드러내지도 못합니다.
  2. 듣는 중에 브라우저가 낸 no-speech 는 모은 글이 없으면 앱 판정에서 바로 '말소리 없음'으로 끝납니다(`src/core/speech/listen.ts:539`). 끝 침묵 · 상한 타이머를 거치지 않습니다.
  3. 가짜가 `webkitSpeechRecognition` · `speechSynthesis` 를 통째로 덮으므로(`src/lib/speech/fake-web-speech.ts:189~194 · 340~342`) Playwright WebKit 흉내로는 실제 기기의 소리 길 문제를 재현할 수 없습니다.
  4. C201 의 읽기 뒤 쉼(`data-speak-waiting`)을 기다리는 시험 줄은 모두 통과했습니다(talk-lesson 145~149 · 187~191 · 289~291줄 등).

## 4. 고치는 차례 제안(파일 겹침 기준)

1. **N1(앱)**: `talk-frame.tsx` · `follow-along.tsx` 만 고치므로 시험 묶음과 나란히 띄울 수 있습니다.
2. **talk-lesson.spec 한 구현자**: T2 · T3 · T4 · T5 · T6 · 흔들림(8건 + 흔들림)입니다. T6 셈 도우미를 `talk.ts` 로 옮기면 speech-feedback · teacher-window 도 바뀌므로, 옮기는 일은 이 구현자가 셋을 함께 맡거나 뒤로 미룹니다.
3. **required-utterance.spec + screen-sampler**: T1(3)입니다.
4. **teacher-window.spec**: E1(1)입니다.

## 5. 우려 사항

- **크로미움 비교 실행이 없습니다.** 브리프의 'WebKit 전용 · 크로미움 통과'가 장부 · 결정 목록에 사실로 남지 않게 해 주세요. 브라우저 차이를 가를 일이 생기면 크로미움 프로젝트를 더해야 하고, e2e 분이 약 두 배(이번 38.4분 기준 70분 남짓)가 됩니다.
- **같은 꼴이 통과 중인 시험에 숨어 있을 수 있습니다.** talk-lesson 의 untilChildTurn(123~128줄)은 말하기 뒤 옛 아이 차례로 바로 통과합니다. 뒤 단언이 30초 창이면 우연히 통과합니다. T3 도우미를 들인 뒤 `speak` → `untilChildTurn` 이 이어진 다른 줄도 훑기를 권합니다.
- **e2e 가 실제 iPad 의 말소리 없음 꼴을 보지 못합니다**(3절 1). C148 · iPad 듣기 고침의 회귀를 e2e 로 지키려면 'audiostart 뒤 곧 no-speech' 대본을 하나 더해야 합니다. 대본 하나와 시험 한 건이면 됩니다.
- **회화 시도 기록 23503 두 줄이 그대로 있습니다**(로그 첫 진행 줄 뒤, 지난 분류 6절 둘째 우려). 실패와는 관계가 없고, 아직 어느 시험인지 정하지 못했습니다.

## 6. 결정이 필요한 것

없습니다. 크로미움 프로젝트를 더할지는 5절 첫 우려에 비용과 함께 적었고, 고침에는 필요하지 않습니다.

## 7. 집계

- 어긋남(실패 원인 묶음): 8. 앱 1(N1 · 13건 중 1), WebKit 환경 1(E1 · 1), 시험 6(T1~T6 · 11), 흔들림 1 은 따로(시험)
- 우려: 4
- 결정 필요: 0
