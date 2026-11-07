# 보고: 마이크 점검 쪽 /dev/mic-probe(구현자 impl-mic-probe · Opus · high, 2026-11-06 05:xx)

상태: DONE_WITH_CONCERNS. 제 파일의 시험 · 검사는 모두 통과했습니다. 다만 워크트리 전체의 tsc · 단위 관문은 impl-mic-1 이 고치고 있는 음성 파일 때문에 지금 0 이 아닙니다(아래 '관문'). 커밋하지 않았습니다. 실호출은 없었습니다.

## 쪽 경로와 파일(워크트리 `.claude/worktrees/p13d`, 모두 새 파일)

- `src/app/dev/mic-probe/page.preview.tsx` 1~13줄: 쪽 몸입니다. 운영 배포 빌드에서는 빠집니다(pageExtensions). 가족 접근 쿠키는 proxy 가 모든 경로에 걸어 둔 그대로입니다. DB 는 읽지도 쓰지도 않습니다.
- `src/app/dev/mic-probe/mic-probe.tsx`: 클라이언트 본체입니다. 듣기 진행은 React 밖의 `ProbeRunner` 클래스가 맡습니다(사건 시각을 화면 갱신과 떼어 재기 위함). `webkitSpeechRecognition` 을 먼저 쓰고 없으면 `SpeechRecognition` 을 씁니다. 앱 음성 접점(`src/lib/speech/*`)은 가져오지 않습니다.
- `src/app/dev/mic-probe/probe-log.ts`: 순수 모듈입니다. 기록 꼴(Zod), 표 한 줄 계산 `rowOf`, B 의 다시 시작 판정 `fastRestartDue`, 전략별 성공률 `summaryOf`, 복사 글 `copyTextOf`, 저장 기록 읽기 `parseStored`, 측정 조건 상수가 있습니다.
- `src/app/dev/mic-probe/probe-text.ts`: 쪽 글입니다. 안내 두 줄은 브리프 문구 그대로입니다.
- `tests/unit/mic-probe.test.ts`(시험 셋), `tests/e2e/mic-probe.spec.ts`(시험 하나, 이 Mac 에서 돌리지 않음).
- 공용 파일 변경: 없습니다. dev 쪽 목록 쪽이 저장소에 없어서 링크 한 줄도 더하지 않았습니다.

## 전략별 동작

모든 전략은 단추 한 번에 듣기 한 번이고, 끝나면 표에 한 줄이 생깁니다. 인식 객체는 시도마다 새로 만들고 lang · continuous=true · interimResults=true · maxAlternatives=1 을 줍니다. 듣기는 세 조건 가운데 먼저 오는 것으로 stop 합니다: 마지막 결과 뒤 2초 조용함, 결과 없이 6초, 상한 10초. stop 뒤 3초 안에 end 가 없으면 abort 하고 'end-missing' 으로 끝냅니다. '멈추기' 단추로 직접 멈출 수도 있습니다.

- **A 그냥 듣기**: 누름 처리 안에서 읽기 취소(speechSynthesis.cancel) → 화면 갱신 → 새 객체 start 순서로 동기 호출합니다. 지금 앱의 듣기와 같은 꼴입니다.
- **B 빠른 시작이면 다시 듣기**: A 와 같이 시작합니다. start 호출 1.5초 뒤에 audiostart 가 200ms 안이었고 soundstart · speechstart · result 가 하나도 없으면 abort 합니다. end 를 받거나 300ms 가 지나면 새 객체로 다시 start 합니다. 다시 시작은 최대 3회입니다. 다시 시작은 누름 밖(타이머)에서 일어납니다.
- **C 누르자마자 듣기**: 누름 처리의 첫 일로 새 객체를 만들고 start 합니다. 읽기 취소 · 화면 갱신 · setTimeout · await 는 start 뒤에만 있습니다.
- **D 읽어 준 뒤 듣기**: 앞 듣기의 인식기를 abort 하고 'Please say one word.'(en-US)를 읽습니다. 읽기 끝 알림(또는 오류)에서 새 객체로 start 합니다. 끝 알림이 6초 안에 오지 않으면 'speak-end-missing' 을 적고 그대로 듣습니다. 표의 '읽기 끝 뒤' 칸이 읽기 끝 → start 호출 ms 입니다.
- **E 한국어 듣기**: A 와 같은 꼴이고 lang 만 ko-KR 입니다. 들은 글은 표와 '들은 글' 줄에 그대로 보입니다.

기록 칸은 start-call · audiostart · soundstart · speechstart · result(중간 · final, 글 길이) · error(code · message) · end 입니다. ms 는 모두 그 시도의 start 호출 기준입니다. 여기에 전략 · 재시작 횟수 · 시도별 audiostart(예: 35 → 41 → 380) · 결과 글(final, 없으면 중간 글)을 더했습니다. 원 기록 JSON 에는 speechend · soundend · audioend · stop-call · abort-call · 읽기 사건 · 화면 숨김 · 보임 사건까지 모두 들어갑니다. 쪽 머리에는 UA · 화면 숨김 여부(visibilityState, 바뀌면 갱신) · `navigator.audioSession?.type`(읽기만, 없으면 '없음') · 인식 객체 이름 · 쪽 연 횟수를 보입니다. 표 위에 전략별 성공률 요약이 있고, 성공은 final 결과가 있는 듣기입니다. '기록 복사'는 환경 줄 + 요약 표 + 기록 표(마크다운) + 원 기록 JSON 을 클립보드에 넣습니다. 복사가 실패하면 같은 글을 textarea 에 보이고 길게 눌러 복사하라고 안내합니다.

## 요청자에게 부탁할 순서

프리뷰 주소의 `/dev/mic-probe` 를 iPad Safari 에서 엽니다(접근 코드를 넣은 같은 탭). A 부터 E 까지 단추마다 세 번씩 누르고, 누를 때마다 'apple' 처럼 한 낱말을 말합니다. E 는 '사과'라고 말합니다. 듣기가 끝나 '단추를 눌러 주세요'가 다시 보이면 다음을 누릅니다. 한 번도 안 들리는 상태가 이어지면 새로 고침한 뒤 A 를 다시 세 번 누릅니다. 기록은 새로 고침 뒤에도 남고 '쪽' 칸으로 갈립니다. 끝나면 '기록 복사'를 눌러 대화창에 붙여 넣어 보냅니다. 열다섯 번과 새로 고침 뒤 세 번이면 듣기마다 3~10초라서 10분 안팎에 끝납니다.

## 설계와 다르게 하거나 더한 것

- **A 와 C 의 차이가 작습니다.** 앱도 이미 누름 처리 안에서 start 를 동기로 부릅니다(`child-turn.tsx` 435~444줄 → `browser.ts` 321~334줄, 분석 보고 3절). 그래서 A 는 'start 앞에 읽기 취소와 화면 갱신이 있는 꼴', C 는 'start 가 맨 먼저인 꼴'로 갈랐습니다. 앱이 쪽마다 한 번 하는 무음 읽기(unlockFromGesture)는 A 에 넣지 않았습니다. 읽기 뒤 듣기는 D 가 잽니다.
- **측정 칸 둘을 더했습니다.** 조사 5절이 제안한 'n번째(이 쪽을 연 뒤 몇 번째 인식 객체)'와 '앞 끝 뒤(앞 듣기 end → start 호출 ms)'입니다. 같은 까닭으로 '숨김' 칸과 '멈춤'(stop 까닭) 칸도 있습니다.
- **기록을 sessionStorage 에 둡니다.** 브리프가 새로 고침 뒤 회복을 보려 하므로 새로 고침으로 기록이 지워지면 안 됩니다. 쪽 연 횟수도 같이 셉니다. 기기 밖으로는 복사할 때만 나갑니다. 그래서 '기록 지우기' 단추를 더했습니다.
- **측정 조건 숫자는 settings 가 아니라 이 모듈의 이름 붙은 상수입니다.** 200ms · 1.5초 · 3회 · 300ms 는 브리프 · 조사 값입니다. 2초 · 6초 · 10초 · 3초 · 6초 는 한 낱말 말하기에 맞춘 제 값입니다. 관찰 도구의 측정 조건이라 음성 관찰 쪽(`probe-audio.ts`)의 전례를 따랐습니다. check:ids 의 design-number 경고 두 줄(표 상자 줄 수 10, 백분율 100)이 제 파일에서 나오지만 실패 항목은 아닙니다.
- **단위 시험의 둘째 시험에 B 판정을 넣었습니다.** 브리프의 시험 셋(성공률 · ms 계산 · 복사 글) 가운데 ms 계산 시험 안에서 `fastRestartDue` 의 경계 다섯 경우를 함께 봅니다.

## 덮는 시험

- `tests/unit/mic-probe.test.ts`
  - "전략별 성공률은 final 결과가 있는 듣기 수 ÷ 누른 수이고, 누른 적 없는 전략은 null 이다"
  - "ms 는 시도마다 그 start 호출 기준이고, B 는 빠른 시작 알림 · 소리 없음 · 횟수가 남았을 때만 다시 시작한다"
  - "복사 글은 환경 줄 · 요약 표 · 기록 표 · 원 기록 JSON 이고, JSON 은 저장 꼴로 다시 읽힌다"
- `tests/e2e/mic-probe.spec.ts`: "마이크 점검 쪽이 뜨고 전략 단추 다섯과 기록 복사 단추가 있다"(이 Mac 에서 돌리지 않음).

## 관문(출력 전문은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/mic-g-*.txt`)

| 관문 | 결과 |
|---|---|
| `pnpm biome ci` | 0, 600 파일 |
| `pnpm tsc --noEmit` | 2, 오류 6건 모두 impl-mic-1 작업 중인 파일(speech-probe.tsx 3 · core/speech/script.ts 1 · lib/speech/listen-log.ts 1 · tests/unit/listen-end.test.ts 1). mic-probe 파일 오류 0 |
| `pnpm test` | 1, 시험 파일 21 실패 · 시험 5 실패 · 1663 통과. 실패는 음성 타입 변경(`deafAudiostartMs` 등)과 12절에 없는 설정 키 셋(`speech.deaf_*`, check:ids 의 code-setting-unknown)에서 납니다. `pnpm vitest run tests/unit/mic-probe.test.ts` 는 3/3 통과 |
| `pnpm spec:trace` | 0 |
| `pnpm seed:validate` | 0(기존 경고만) |
| `pnpm check:deps` | 0 |

## 남은 우려

- iOS 재현이 이 Mac 에서는 안 되므로 전략 동작은 가짜 음성으로도 돌려 보지 못했습니다(e2e 미실행). 실제 확인은 요청자 iPad 몫입니다.
- 워크트리 tsc · 단위 관문이 0 이 되려면 impl-mic-1 의 작업이 끝나야 합니다. 컨트롤러가 두 작업을 합친 뒤 관문을 다시 돌려야 합니다.
- 개발 서버(Strict Mode)에서는 마운트 효과가 두 번 돌아 '쪽 연 횟수'가 2씩 늘 수 있습니다. 프리뷰 배포(운영 빌드)에서는 1씩 늘어납니다.

## fix 1(2026-11-06, 검토 `task-mic-review.md` I-3 · M-4 · M-5)

상태: DONE. 관문 다섯이 모두 0 입니다. 공용 파일은 바꾸지 않았고, 녹음 · getUserMedia · DB 쓰기는 여전히 없습니다.

### 바뀐 것
- **I-3 닫힘(전략 일곱).** 세 전략 모두 읽기 전에 앞 인식기를 abort 합니다.
  - D 는 이름표만 'D 읽기 끝 뒤 자동 시작(누름 밖)'으로 바꿨고, 동작은 그대로입니다. 누름 밖 시작을 재는 자료가 됩니다.
  - 'F 읽기 끝 뒤 누름'은 짧은 문장을 읽어 준 뒤 '지금 눌러 말하세요'를 보이고, 새 단추 '지금 눌러 말하기'를 켭니다. 그 누름 안에서 읽기 취소 · 화면 갱신 뒤 동기로 start 합니다. 앱의 child-turn 경로와 같은 꼴입니다. 끝 알림이 6초 안에 오지 않으면 'speak-end-missing' 을 적고 단추를 켭니다.
  - 'G 읽는 중 누름'은 긴 문장(8초 안팎)을 읽는 동안 '지금 눌러 말하기'를 켜 둡니다. 누르면 speechSynthesis.cancel() 바로 뒤에 start 합니다. 읽기가 먼저 끝나면 F 처럼 기다리고, 그 사실은 기록에 남습니다.
  - 기록 칸 '읽기 끝 뒤'는 D · F 의 읽기 끝 알림부터 첫 start 호출까지의 ms 입니다. F 는 아이가 누르기까지 기다린 시간을 포함합니다.
  - 새 칸 '취소 뒤(읽는 중)'는 G 의 cancel 호출부터 첫 start 호출까지의 ms 입니다. 괄호에는 누른 때 아직 읽는 중이었는지(speechSynthesis.speaking)를 적습니다.
  - 두 칸 모두 듣기 앞의 사건만 셉니다. 그래서 cancel 뒤에 늦게 온 읽기 끝 · 'interrupted' 는 들어가지 않습니다. 원 기록에는 새 사건 'press' · 'speak-cancel' 이 남습니다.
  - 요약 표와 복사 글은 일곱 전략을 셉니다. 복사 글 머리에 두 칸의 뜻을 한 줄로 적었습니다. 안내는 "A~G 단추마다 세 번씩 눌러 'apple' 처럼 한 낱말만, 다른 말 없이 말해 주세요. E 는 '사과'." 와 F · G 누름 안내 한 줄입니다.
- **M-5 닫힘.** 중간 결과 사건에는 글 길이만 남기고 원문을 남기지 않습니다. final 사건에만 final 글이 남습니다. 시도마다 마지막 들은 글 하나만 덮어써서 '(중간) …' 으로 보입니다. 안내에도 '다른 말 없이'를 더했습니다.
- **M-4 닫힘.** 중간 결과 사건은 시도마다 20개까지만 남기고(`keepResultEvent`), 넘친 수는 새 칸 '버린 중간'에 적습니다. final 은 늘 남습니다. sessionStorage 저장이 실패하면 "기록을 이 기기에 저장하지 못했어요 · 새로 고침 전에 '기록 복사'를 먼저 눌러 주세요"를 빨간 줄로 보입니다. 끝난 기록에는 늦게 온 알림을 더하지 않습니다.
- 저장 꼴의 새 칸(lastText · droppedInterims)에는 기본값을 두었습니다. 그래서 fix 1 앞에 저장된 기록도 읽힙니다.

### 바뀐 파일(워크트리 p13d)
- `src/app/dev/mic-probe/probe-log.ts`: 전략 일곱 · `SPEAK_FIRST` · `LONG_SENTENCE` · `MAX_INTERIM_EVENTS`, 사건 'press' · 'speak-cancel', 결과 사건 꼴(length · final 글만), `rowOf` 의 새 칸, `keepResultEvent`, 표 칸 둘('취소 뒤(읽는 중)' · '버린 중간'), 복사 글 설명 줄을 고쳤습니다.
- `src/app/dev/mic-probe/mic-probe.tsx`: `pressNow` · `speakFirst`(D · F · G 공통), 상태 'await-press' · 읽는 중 누름 가능, '지금 눌러 말하기' 단추, 결과 사건 줄이기, 저장 실패 줄, 끝난 기록 보호를 고쳤습니다.
- `src/app/dev/mic-probe/probe-text.ts`: 안내 · 이름표 · 새 문구를 고쳤습니다.
- `tests/unit/mic-probe.test.ts`(셋 모두 고침), `tests/e2e/mic-probe.spec.ts`(일곱 단추 · '지금 눌러 말하기' 꺼짐).

### 덮는 시험
- "전략별 성공률은 final 결과가 있는 듣기 수 ÷ 누른 수이고, 누른 적 없는 전략은 null 이다"(F · G 포함 일곱 줄)
- "ms 는 시도마다 그 start 호출 기준이고, B 는 빠른 시작 알림 · 소리 없음 · 횟수가 남았을 때만 다시 시작하며, 읽기 끝 · 취소 → start 는 듣기 앞의 사건만 센다"
- "복사 글은 환경 줄 · 요약 표 · 기록 표 · 원 기록 JSON 이고, JSON 은 저장 꼴로 다시 읽히며, 중간 결과는 시도마다 상한까지만 남긴다"
- e2e "마이크 점검 쪽이 뜨고 전략 단추 일곱과 기록 복사 단추가 있다"(이 Mac 에서 돌리지 않음)

### 관문(출력은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/mic-f1-g-*.txt`)

| 관문 | 결과 |
|---|---|
| `pnpm biome ci` | 0 |
| `pnpm tsc --noEmit` | 0 |
| `pnpm test` | 0, 시험 파일 151 통과 · 시험 1960 통과(todo 6) |
| `pnpm spec:trace` | 0 |
| `pnpm seed:validate` | 0 |
| `pnpm check:deps` · `pnpm check:ids` | 0 · 0(design-number 경고 두 줄은 그대로) |

### 요청자에게 부탁할 순서(고침)
A 부터 G 까지 단추마다 세 번씩 누르고, 한 낱말만 다른 말 없이 말합니다. E 는 '사과'라고 말합니다. F 는 읽기가 끝나고 '지금 눌러 말하세요'가 보이면 '지금 눌러 말하기'를 누른 뒤 말합니다. G 는 긴 문장을 읽는 도중에 '지금 눌러 말하기'를 누른 뒤 말합니다. 한 번도 안 들리는 상태가 이어지면 새로 고침한 뒤 A 를 세 번 누릅니다. 끝나면 '기록 복사'를 눌러 대화창에 붙여 넣습니다. 스물한 번과 새로 고침 뒤 세 번이면 12~15분쯤 걸립니다.

### 남은 우려
- 전략 동작은 이번에도 가짜 음성으로 돌려 보지 못했습니다(e2e 미실행). 실제 확인은 요청자 iPad 몫입니다.
- G 는 누름 처리 안에서 cancel 과 start 사이에 화면 갱신이 없습니다. 앱은 그 사이에 화면 갱신과 상태 기계를 거치므로 몇 ms 차이가 날 수 있습니다. 표의 '취소 뒤' 값으로 차이를 볼 수 있습니다.

## fix 2(2026-11-06 밤, 요청자 측정 둘 뒤 · 분석 `task-mic-probe-analysis-report.md` P1~P6 · 조사 '추가 조사' 절)

상태: DONE. 관문 다섯이 모두 0 입니다. 공용 파일은 바꾸지 않았고, 녹음 · getUserMedia · DB 쓰기는 없습니다. K 는 0 음량 재생만 합니다. 실호출도 없습니다.

### 더한 것
- **머리 표시(P1).**
  - 기기 종류를 보입니다. iPad 는 UA 나 'MacIntel' + 터치 점 2 이상으로 가릅니다(`deviceKindOf`). platform · 터치 점 수도 함께 보입니다.
  - 마이크 권한(`navigator.permissions.query({name:'microphone'})`)을 보이고, 바뀌면 갱신합니다. 지원하지 않으면 '-' 입니다.
  - 탭 표지(sessionStorage 의 무작위 8자)와 '이 탭에서 처음 연 쪽' 여부를 보입니다.
  - 쪽 연 방법(navigate · reload), 연 때, 쪽 연 횟수(이 기기 전체), 무음 WebAudio 상태(running · suspended · 꺼짐)도 보입니다.
- **기록 보존(P2 · P3).** 기록을 localStorage 에 둡니다. 탭 · 사파리 종료를 넘어 남고, 상한 300건과 '기록 지우기'는 그대로입니다. 여러 탭이 같은 저장소에 쓰므로 저장소를 정본으로 둡니다. 번호는 붙일 때 매기고(`appendRecord`), 다른 탭이 쓰면 저장소 알림으로 화면을 맞춥니다. 기록마다 탭 표지 · 처음 연 쪽 · 연 방법과 '지금 한 일'이 붙습니다. '지금 한 일'은 고르기 칸에서 고르고, 다음 기록부터 붙습니다. 값은 그대로 · 새로 고침 뒤 · 새 탭 뒤 · 사파리 종료 뒤 · 재시동 뒤 · 받아쓰기 확인 뒤입니다. 받아쓰기 확인 뒤는 분석 P3 의 값이고, 새 탭에서는 기본값이 '새 탭 뒤'입니다.
- **새 전략.** 단추는 한 줄에 하나씩이고, A~G 는 그대로입니다.
  - **H 무음 읽기 뒤 누름**: 앱 unlockFromGesture 와 같은 무음 읽기를 부릅니다(글 한 칸 · 음량 0). 앱처럼 끝 알림을 기다리지 않고 곧바로 '지금 눌러 말하기'를 켭니다. 누르면 그 누름 안에서 start 합니다.
  - **I 앱 첫 차례 재현**: 무음 읽기 → 선생님 인사 → 끝 뒤 1.5초 쉼 → '지금 눌러 말하기' → 누름 안에서 start 합니다. 인사는 명단 첫 선생님의 영어 인사이고, 목소리 높이 1.08 과 목소리 순서도 명단 값입니다. 쪽 몸이 `rosterOf` 로 읽어 넘기며, 못 읽으면 짧은 기본 문장을 읽습니다.
  - **K 무음 WebAudio 켜 둔 채**: 첫 K 누름 안에서 AudioContext 와 발진기를 켭니다. 발진기는 GainNode 0 을 거쳐 출력으로 갑니다. 그 뒤 K 는 켜 둔 채 새 세션으로 듣습니다. 상태는 머리에 보이고 기록마다 '첫 start 때 WebAudio 상태'로 남습니다. '무음 WebAudio 끄기' 단추로 끌 수 있습니다(덧붙임).
  - **L 넷(transient · transient-solo · ambient · playback)**: audioSession.type 을 두고 같은 누름 안에서 start 합니다. 끝나면 'auto' 로 되돌리고, 둔 값 · 읽은 값 · 되돌린 값을 사건으로 남깁니다. audioSession 이 없으면 꺼집니다.
  - **M 새 탭에서 첫 듣기**: `window.open(같은 주소 + '#newtab', '_blank', 'noopener')` 로 새 탭을 엽니다. 새 탭 쪽은 머리에 '새 탭' 표지와 'M 새 탭에서 듣기' 단추만 보입니다. 이 단추는 A 꼴이고, 기록 전략은 M 입니다. 기록은 저장소로 합쳐집니다.
- **앞 세션 칸(4).** 모든 기록에 세 칸이 있습니다. '앞 멈춤'은 같은 쪽 앞 듣기의 멈춤 까닭입니다(silence · no-result · cap · user · natural · end-missing — end-missing 은 abort 로 끝냄). '앞 끝 뒤'는 있던 칸입니다. '사이 읽기'는 앞 듣기 끝(그 쪽 첫 듣기는 쪽 연 때) 뒤 첫 start 까지 무음 읽기를 포함한 읽기가 있었는지입니다. 같은 까닭으로 '세션 꼴'(첫 start 때 audioSession.type)도 남깁니다.
- **요약 · 복사 · 안내(5 · P6).**
  - 요약 표에 '중간만' 칸을 더했습니다. final 없이 중간 결과만 있었던 듣기 수입니다.
  - 복사 글의 요약에는 누른 전략만 넣고, 머리에 기기 · 권한 · 탭 · 연 방법 · WebAudio 줄을 넣습니다.
  - 쪽 위에 요청자 순서 여섯 줄을 둡니다: 지금 상태에서 K 세 번 → L 넷 각 한 번 → H 두 번 → I 두 번 → M(새 탭)에서 세 번 → 기록 복사.
  - 안내는 '한 낱말만, 다른 말 없이' · F · G · H · I 누름 · 새로 고침 뒤 '지금 한 일' 고르기입니다.

### 설계와 다르게 하거나 고른 것
- **N 은 따로 만들지 않았습니다.** 지시 목록에 N 의 정의가 없었습니다. 조사 '추가 조사' 절의 N(무음 읽기 → 선생님 말 → 1.5초 쉼 → 누름)은 지시의 I 와 같은 흐름입니다. 그래서 I 하나로 두었고, 글자는 A~I · K · L · M 입니다. 분석 P5 의 '두 문장'은 명단 인사(세 문장)로 갈음했습니다.
- **M 은 'noopener' 로 엽니다.** 여는 쪽과 묶인 창은 같은 웹 처리 단위를 나눌 수 있습니다. 그러면 '탭 단위 상태' 확인이 흐려지므로 묶지 않았습니다. 대가로 팝업 차단은 감지할 수 없습니다. 그래서 열기 뒤 안내에 '안 열렸으면 팝업 차단을 끄거나 주소 끝에 #newtab 을 붙여 열기'를 적었습니다. window.open 이 sessionStorage 를 복사해도 '#newtab' 이면 새 표지를 만듭니다(`tabMarkOf`). 그 뒤 주소 끝을 지워서, 새로 고침하면 '처음 연 쪽 아님'으로 읽힙니다.
- **K 뒤의 전략도 WebAudio 가 켜진 채 잽니다.** 지시가 'K 단추마다 그대로'라서 켜 둔 상태는 L · H · I · M 순서까지 이어집니다. 그래서 기록마다 WebAudio 상태를 남기고 끄기 단추를 두었습니다. 다만 새 탭(M)은 새 쪽이라 꺼진 상태입니다.
- **fix 1 앞 sessionStorage 기록은 옮기지 않습니다.** 저장 열쇠를 v2 로 바꿨습니다. 옛 꼴은 기본값으로 읽히지만, 옛 열쇠를 읽지는 않습니다.

### 바뀐 파일(워크트리 p13d, 모두 mic-probe 안)
- `src/app/dev/mic-probe/probe-log.ts`: 다시 썼습니다. 전략 15개 · `SESSION_TYPES` · `RESET_STEPS`, 기록 새 칸(기본값으로 옛 꼴도 읽힘), `deviceKindOf` · `tabMarkOf` · `appendRecord` · `sessionTypeOf` · `isInterimOnly`, 표 · 요약 칸, 복사 글 머리가 들어 있습니다.
- `src/app/dev/mic-probe/mic-probe.tsx`: 다시 썼습니다. H · I · K · L · M, localStorage 정본과 탭 동기화, 머리 표시, 지금 한 일 고르기, 새 탭 모드, WebAudio 끄기가 들어 있습니다.
- `src/app/dev/mic-probe/probe-text.ts`: 다시 썼습니다. `src/app/dev/mic-probe/page.preview.tsx` 는 첫 선생님 말을 넘깁니다.
- `tests/unit/mic-probe.test.ts`(시험 넷), `tests/e2e/mic-probe.spec.ts`(전략 단추 전부 · 지금 한 일 기본값).

### 덮는 시험
- "전략별 성공률은 final 결과가 있는 듣기 수 ÷ 누른 수이고, 중간 결과만 있는 듣기는 '중간만'으로 따로 세며, 누른 적 없는 전략은 null 이다"
- "ms 는 시도마다 그 start 호출 기준이고, B 는 빠른 시작 알림 · 소리 없음 · 횟수가 남았을 때만 다시 시작하며, 읽기 끝 · 취소 → start 는 듣기 앞의 마지막 사건을 센다"
- "복사 글은 환경 줄 · 요약 표 · 기록 표 · 원 기록 JSON 이고, 저장 꼴로 다시 읽히며(앞 판 꼴 포함), 붙일 때 번호를 매기고 상한을 지키며, 중간 결과는 시도마다 상한까지만 남긴다"
- "기기 종류는 데스크톱 꼴 UA 의 iPad 를 터치 점으로 가르고, 탭 표지는 없을 때 · 새 탭일 때만 새로 만들며, L 전략은 audioSession.type 넷에 맞는다"
- e2e "마이크 점검 쪽이 뜨고 전략 단추 전부와 지금 한 일 고르기 · 기록 복사 단추가 있다"(이 Mac 에서 돌리지 않음)

### 관문(출력은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/mic-f2-g-*.txt`)

| 관문 | 결과 |
|---|---|
| `pnpm biome ci` | 0 |
| `pnpm tsc --noEmit` | 0 |
| `pnpm test` | 0, 시험 파일 151 통과 · 시험 1961 통과(todo 6). mic-probe 4/4 |
| `pnpm spec:trace` | 0 |
| `pnpm seed:validate` | 0 |
| `pnpm check:deps` · `pnpm check:ids` | 0 · 0(design-number 경고 셋: 탭 표지 8자 · 표 상자 10줄 · 백분율 100) |

### 요청자에게 부탁할 순서(쪽 위에 같은 글)
점검 쪽을 그대로 열고 K 를 세 번 누릅니다. L 네 단추를 하나씩 한 번 누르고, H 를 두 번, I 를 두 번 누릅니다. H · I 는 '지금 눌러 말하세요'가 보이면 '지금 눌러 말하기'를 누르고 말합니다. M 을 눌러 새 탭을 열고, 새 탭에서 'M 새 탭에서 듣기'를 세 번 누릅니다. 새 탭을 닫고 처음 탭에서 '기록 복사'를 눌러 붙여 넣습니다. 듣기는 열넷이고 I 는 인사 4~5초가 더 들어, 10~12분으로 어림합니다.

### 남은 우려
- 이번에도 가짜 음성으로 동작을 돌려 보지 못했습니다(e2e 미실행). 실제 확인은 요청자 iPad 몫입니다.
- Safari 가 'microphone' 권한 이름을 지원하는지, 그 값이 음성 인식 권한까지 비추는지는 확인하지 않았습니다(분석 P1 과 같은 추정).
- 'noopener' 로 연 탭이 WebKit 에서 정말 새 처리 단위를 받는지는 확인하지 않았습니다. 기록의 탭 표지 · 처음 연 쪽 칸은 쪽 쪽 사실만 말합니다.
- 사파리 종료 뒤 탭이 복원되면 sessionStorage 도 복원되어 '처음 연 쪽'이 아니요로 보일 수 있습니다. 그때는 '지금 한 일'이 가릅니다.

## fix 3(2026-11-06 밤, 분석 `task-mic-probe-analysis-report.md` 10절 — 앞 듣기 뒤 40초 넘게 쉬면 5/5 성공 · 5초 안 1/14)

상태: DONE. 관문 다섯이 모두 0 입니다. 공용 파일은 바꾸지 않았고, 녹음 · getUserMedia · DB 쓰기는 없습니다.

### 더한 것
- **쉼 블록.** '지금 한 일'에 '45초 쉼 뒤' · '90초 쉼 뒤'(pause-45 · pause-90)를 더했습니다. 쪽에는 "앞 듣기 끝난 뒤 N초"를 크게 보이는 쉼 시계를 두었습니다. 0.25초마다 갱신하고, 기준은 기록의 '앞 끝 뒤'와 같은 그 쪽의 앞 듣기 끝 시각입니다.
- **S 한 세션 계속 듣기.** continuous 세션 하나를 start 하고 앱은 자동으로 멈추지 않습니다. 끝은 60초 상한 stop 이나 '멈추기'뿐입니다. 결과마다 사건 ms 가 남고, 표에 새 칸 'final ms'(예: 3000 · 13000 · 23500)가 있습니다. 세션이 저절로 끝나면 end ms · 오류 code 와 '멈춤' natural 로 남습니다.
- **S2 세션 중 읽기.** S 와 같되 첫 final 뒤에 'Please say one word.' 를 한 번 읽습니다. 세션 중에 final 이 늦게 오는 경우를 대비해, 첫 결과 뒤 2초 조용해도 읽습니다. 세션은 멈추지 않습니다. 새 칸 '세션 중 읽기 뒤(결과·final·들림)'에는 읽기 시작 뒤 온 결과 수, final 수, 결과에 읽은 문장의 낱말이 들었는지(선생님 목소리를 듣는지, 분석 Q4)를 남깁니다.
- **T abort 로 끝낸 뒤 한 번 더.** A 처럼 듣되, 끝낼 때 stop() 대신 abort() 를 부릅니다. 끝나면 '지금 눌러 말하기'가 켜지고, 누르면 그 누름 안에서 A 꼴 듣기를 한 번 더 합니다. 이 듣기는 전략 'T-next' 로 기록됩니다. 기록에 '앱이 끝낸 방법'(stop · abort)을 더했고, '앞 멈춤'과 '멈춤' 칸은 'silence·abort' 꼴로 보입니다.
- **요청자 순서.** 쪽 위에 여덟 줄로 다시 썼습니다: 그대로 A → 45초 쉼 A → 90초 쉼 A, H 둘 · I 둘, L 넷, T(+ 한 번 더), S, S2, K 셋, M 새 탭 셋 → 기록 복사.

### 분석 보고와 쪽 안 이름 대응

| 분석 10.8 | 쪽 안 |
|---|---|
| Q1 쉼 시계 · '45초 쉬기' · '90초 쉬기' | 쉼 시계 + '지금 한 일'의 45초 · 90초 쉼 뒤(단추가 A 를 켜지는 않고, 요청자가 시계를 보고 A 를 누름) |
| Q3 K '한 세션 유지' | S 한 세션 계속 듣기 |
| Q4 K2 '세션 중 읽기' | S2 세션 중 읽기(읽기는 '지금 읽기' 단추가 아니라 첫 final 뒤 자동) |
| Q5 끝내기 abort | T abort 로 끝낸 뒤 한 번 더(+ T-next) |
| 분석의 M '10-22 재현' · J 'iframe 새 문서' · Q7 창 사건 | 이번 지시 밖이라 넣지 않음(쪽 안 M 은 fix 2 의 새 탭) |
| 쪽 안 K(무음 WebAudio) | 분석 10.8 에는 대응 없음(fix 2 의 지시) |

### 바뀐 파일(워크트리 p13d, 모두 mic-probe 안)
- `src/app/dev/mic-probe/probe-log.ts`: 전략 S · S2 · T · T-next, `BUTTON_STRATEGIES` · `CONTINUOUS_SESSION` · `SESSION_MAX_MS` · `STOP_METHODS`, 쉼 값 둘, 기록 칸 stopMethod · prevStopMethod(기본 null), 표 칸 'final ms' · '세션 중 읽기 뒤', 복사 글 설명 줄을 고쳤습니다.
- `src/app/dev/mic-probe/mic-probe.tsx`: 한 세션 흐름(자동 멈춤 없음), S2 세션 중 읽기, T 의 abort 끝내기와 이어 듣기, 쉼 시계를 넣었습니다.
- `src/app/dev/mic-probe/probe-text.ts`: 순서 · 이름표 · 쉼 문구를 고쳤습니다.
- `tests/unit/mic-probe.test.ts`(기대 줄 고침 + 시험 하나 더함, 다섯), `tests/e2e/mic-probe.spec.ts`(단추 전략 목록으로 셈).

### 덮는 시험(더한 것)
- "S · S2 는 한 세션의 final ms 를 모두 남기고, S2 는 세션 중 읽기 뒤의 결과 · final 수와 읽은 문장 낱말이 들렸는지를 남기며, T 는 abort 로 끝낸 것이 다음 기록의 앞 멈춤에 붙는다"

### 관문(출력은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/mic-f3-g-*.txt`)

| 관문 | 결과 |
|---|---|
| `pnpm biome ci` · `pnpm tsc --noEmit` | 0 · 0 |
| `pnpm test` | 0, 시험 파일 151 통과 · 시험 1962 통과(todo 6). mic-probe 5/5 |
| `pnpm spec:trace` · `pnpm seed:validate` | 0 · 0 |
| `pnpm check:deps` · `pnpm check:ids` | 0 · 0(mic-probe 의 design-number 경고 넷) |

### 남은 우려
- iOS Safari 의 continuous 세션이 말 사이마다 final 을 내는지, stop 때에만 내는지는 모릅니다. 뒤의 경우 S 의 'final ms' 는 하나뿐일 수 있습니다. 그래도 원 기록 JSON 의 중간 결과 사건 ms 로 말한 때를 볼 수 있습니다. 시도마다 20개 상한이 있습니다.
- 이번에도 e2e 와 가짜 음성으로 동작을 돌려 보지 못했습니다. 실제 확인은 요청자 iPad 몫입니다.

## fix 4(2026-11-06 밤, 자동 측정 + 서버 로그 · fix 2 검토 `task-mic-probe-fix2-review.md` Minor 셋 합침)

상태: DONE. 관문 다섯이 모두 0 입니다. 공용 쪽에는 Route Handler 하나만 더했습니다. 녹음 · getUserMedia · DB · 파일 쓰기는 없습니다.

### 더한 것
- **'자동 측정 시작' 단추(쪽 맨 위, 새 탭 쪽에는 없음).**
  - 첫 A 는 그 누름 안에서 곧바로 start 하고, 나머지는 타이머로 start 합니다.
  - 순서는 `autoPlanOf` 의 열여섯 차례입니다: A → (45초 쉼) A → (90초 쉼) A → H → I → L 넷 → T → T 뒤 A → K 셋 → WebAudio 끄기 → A.
  - 듣기마다 4초 뒤 stop 합니다(결과가 없으면 no-result, 있으면 cap). 앞 듣기 end 와 다음 start 의 간격은 2초입니다.
  - H · I · T 뒤에 '지금 눌러 말하기'가 켜지면 1초 뒤 쪽이 대신 누릅니다. 이 누름은 누름 밖 start 라서, 안 되면 그 사실이 기록에 남습니다.
  - 쉼 차례의 기록에는 '지금 한 일'이 45초 · 90초 쉼 뒤로 저절로 붙고, 기록마다 회차 표지(autoRun)와 차례(autoStep)가 붙습니다.
  - 진행 중에는 "자동 측정 3/16 · A(90초 쉼 뒤) · 다음까지 N초" 또는 "· 도는 중이에요"를 크게 보입니다. 끝나면 "끝났어요. 이제 한 낱말 확인"을 보입니다.
  - 자동 중의 화면 숨김은 듣기 기록의 hidden 사건과, 요약의 hiddenCount(차례 사이 숨김까지 셈)에 남습니다. '멈추기'를 누르면 자동 측정도 멈춥니다.
  - 전체는 듣기 열다섯에 4분쯤입니다.
- **서버 로그.**
  - 듣기 기록 하나가 끝날 때마다 몸을 보냅니다. 수동 기록도 같습니다(`recordLogOf`). 몸에는 표 한 줄 값과 짧은 사건 목록(종류 · 누른 때 기준 ms · 시도 · code · final · 길이)이 들고, 들은 글은 길이만 갑니다.
  - 자동 끝에는 요약 몸을 보냅니다(`summaryLogOf`: 전략별 성공률, 차례마다 전략 · 지금 한 일 · 앞 끝 뒤 · 시도별 as · 성공 · 멈춤 · 숨김).
  - 보내는 방법은 `fetch(keepalive, same-origin)` 입니다. POST 라 Origin 이 붙어 같은 출처 검사를 지납니다. 머리에 '서버 기록: 보냄 N · 실패 M' 이 보입니다.
  - 몸이 8000자를 넘으면 사건 목록을 빼고 truncated · eventCount 만 남깁니다. 그래도 넘으면 UA 를 뺍니다.
- **Route Handler `src/app/api/dev/mic-probe-log/route.ts`(POST).**
  - 첫 문장은 `requireAccess()` 입니다(쿠키가 없으면 401, 다른 API 와 같은 길). AC-N5 시험이 첫 문장을 보므로 운영 배포 404(`previewToolsAllowed`)는 그 뒤에 둡니다.
  - 그다음 같은 출처(403), 본문 상한 8000자(머리글이면 읽기 전에 413), JSON 객체(400)를 차례로 봅니다.
  - 받은 몸은 `redactLogBody` 로 글 칸(finalText · lastText · heardText · text)을 길이로 바꿉니다. 그 뒤 `console.log("[mic-probe]", JSON 한 줄)` 로만 남기고 204 를 돌려줍니다.
  - proxy 는 이미 /api 를 쿠키 없이 401 로 막습니다.

### 검토 Minor 셋(fix 2 검토)
- M-a 닫힘: I 는 선생님 인사를 문장마다 따로 읽습니다(`sentencesOf`). 빠르기는 0.8(speech.rate.1-3)이고, 문장 사이에 700ms(speech.sentence_pause_ms)를 쉽니다. 두 값은 쪽이 설정을 못 읽어 같은 값의 상수로 두고 출처를 주석에 적었습니다.
- M-b 닫힘: 표지 이름을 '이 쪽에서 첫 듣기'로 바꿨습니다. 머리에 "새 탭 · 사파리 종료 뒤가 아니면 탭 상태는 몰라요(같은 탭에서 앱이 먼저 음성 인식을 썼는지는 가르지 못해요)" 한 줄을 더했습니다.
- M-c 닫힘: WebAudio 를 끌 때 `ctx.onstatechange = null` 을 먼저 둡니다. 그래서 닫기 알림이 머리를 'closed' 로 되살리지 않고, 끄기 단추도 다시 나타나지 않습니다(dispose 도 같음). I-1(안내 순서)은 fix 3 의 수동 순서와 자동 순서로 닫힙니다.

### 바뀐 파일(워크트리 p13d)
- 새 파일: `src/app/api/dev/mic-probe-log/route.ts`, `tests/unit/mic-probe-log-route.test.ts`(시험 셋).
- `src/app/dev/mic-probe/probe-log.ts`: `autoPlanOf` · 자동 상수, `recordLogOf` · `summaryLogOf` · `redactLogBody` · `LOG_TAG` · `LOG_BODY_MAX_CHARS`, `sentencesOf` · `I_RATE` · `I_SENTENCE_PAUSE_MS`, 기록 칸 autoRun · autoStep(기본 null), 복사 글의 표지 이름을 고쳤습니다.
- `src/app/dev/mic-probe/mic-probe.tsx`: 자동 진행기(startAuto · runStep · scheduleNext · cancelAuto), 자동 4초 stop · 대신 누르기, 로그 전송 · 보냄 수, I 문장별 읽기, M-c, 자동 단추 · 진행 표시를 넣었습니다.
- `src/app/dev/mic-probe/probe-text.ts`: 자동 문구 · 서버 기록 줄 · 표지 이름 · 탭 안내를 고쳤습니다.
- `tests/unit/mic-probe.test.ts`: 시험 둘을 더해 일곱이 됐습니다.

### 덮는 시험(더한 것)
- "자동 측정 순서는 A · 45초 쉼 A · 90초 쉼 A · H · I · L 넷 · T · T 뒤 A · K 셋 · WebAudio 끄기 · A 이고, 첫 차례만 기다림 0 · 나머지는 2초 간격이다"(I 의 문장 나누기도)
- "서버 로그 몸은 들은 글 대신 길이만 넣고 상한을 넘으면 사건 목록을 빼며, 자동 끝 요약은 그 회차의 기록만 센다"
- "마이크 점검 로그 끝점: 접근 쿠키가 없으면 requireAccess 의 unauthorized()(401)로 끝나고, 접근을 지난 운영 배포는 404 이며, 둘 다 로그를 남기지 않는다"
- "마이크 점검 로그 끝점: 본문이 상한을 넘으면 413(머리글이면 읽기 전에), 다른 출처는 403, JSON 객체가 아니면 400 이고 로그를 남기지 않는다"
- "마이크 점검 로그 끝점: 받은 JSON 을 '[mic-probe]' 머리와 한 줄로 console.log 하고, 들은 글 칸은 길이로 바꿔 원문을 남기지 않으며 204 다"

### 관문(출력은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/mic-f4-g-*.txt`)

| 관문 | 결과 |
|---|---|
| `pnpm biome ci` · `pnpm tsc --noEmit` | 0 · 0 |
| `pnpm test` | 0, 시험 파일 152 통과 · 시험 1967 통과(todo 6). AC-N5 첫 문장 규칙 통과 |
| `pnpm spec:trace` · `pnpm seed:validate` | 0 · 0 |
| `pnpm check:deps` · `pnpm check:ids` · `pnpm check:data-api` | 0 · 0 · 0(mic-probe 의 design-number 경고 다섯) |

### 남은 우려
- 자동 측정의 K 는 타이머 안에서 AudioContext 를 만듭니다. iOS 는 누름 밖에서 만든 AudioContext 를 suspended 로 둘 수 있습니다. 그러면 자동 K 셋은 A 와 같아집니다. 기록의 'WebAudio' 칸(첫 start 때 상태)과 webaudio-start 사건으로 가를 수 있으므로, suspended 면 수동 K 로 다시 재야 합니다.
- 누름 밖 start(타이머)가 iOS 에서 막히면 둘째 차례부터 start-threw · not-allowed 가 남습니다. 브리프대로 그 자체가 결과입니다.
- Vercel 로그는 줄 길이 제한이 있을 수 있습니다(확인하지 않음). 몸은 8000자 안이지만, 잘리면 truncated 꼴로 다시 보내지는 않습니다.
- e2e 는 이번에도 돌리지 않았습니다. 실제 확인은 요청자 iPad 몫입니다.

## fix 5(2026-11-07, 분석 `task-mic-probe-analysis-report.md` 10.16 — S2 의 읽기가 버려져 세션 중 읽기를 못 잼)

상태: DONE. 관문 다섯이 모두 0 입니다. 공용 파일은 바꾸지 않았고(mic-probe 쪽 파일 셋과 그 단위 시험만), 녹음 · getUserMedia · DB 쓰기는 없습니다.

### 바뀐 것
- **U-1.** S · S2 를 누르면, 그 누름 안에서 읽기 취소 뒤 앱과 같은 무음 읽기(글 한 칸 · 음량 0)를 먼저 부릅니다. 그런 다음 같은 누름 안에서 start 합니다. 읽기 제약을 풀어 세션 중 읽기가 버려지지 않게 하려는 것입니다. 이 무음 읽기는 '사이 읽기' 칸을 '예'로 만듭니다.
- **U-2.** '세션 중 읽기(듣기는 그대로)' 단추를 '지금 눌러 말하기' 아래에 두었습니다. S · S2 세션이 듣는 동안에만 켜집니다. 누를 때마다 그 누름 안에서 'Please say one word.' 를 읽고, 인식은 끊지 않습니다. 기록에는 press 사건이 남습니다. S2 의 자동 읽기(첫 final 뒤)도 그대로입니다.
- **U-3.** speak() 직전마다 'speak-call' 사건을 남깁니다. 사건에는 utterance(unlock · line), speaking · pending 값, code `speaking=… pending=…` 가 들어갑니다. 서버 로그의 짧은 사건 목록에도 code 로 보입니다. speak-start · speak-end · speak-error 는 그대로입니다. 부름보다 시작 알림이 적으면 브라우저가 버린 것입니다.
- **U-4.** 표 칸 '세션 중 읽기(부름·시작 / 앞·뒤 결과 · 뒤 final · 들림)'를 두었습니다(예: `2·1 / 1·3 · 3 · 아니요`).
  - 듣기 시작 뒤의 읽어 주기 글만 셉니다(무음 읽기 제외). 값은 부른 수 · 시작 알림 수, 첫 부름 앞 · 뒤의 결과 수, 뒤의 final 수, 들림입니다.
  - 들림은 들은 글(final 글 · 마지막 들은 글)에 읽은 문장의 낱말이 들었는지를 참 · 거짓으로만 남깁니다. 서버 로그에는 글 대신 이 값과 길이만 갑니다.
  - fix 5 앞 기록에는 speak-call 이 없으므로 시작 알림을 기준으로 셉니다. 행 값 이름은 afterSpeak 에서 sessionSpeak 로 바뀌었습니다.
- **쪽 위 순서(2분).** S 누름 → 'apple' → '세션 중 읽기' → 'banana' → 'cat' → '세션 중 읽기'를 다시 누르고 읽는 중에 'dog' → 'egg' → '멈추기' → 10초 쉬고(쉼 시계) A 한 번. 기록은 서버로 가니 복사하지 않아도 된다는 말을 덧붙였습니다. fix 3 의 긴 순서는 쪽에서 뺐고, 이 보고의 fix 3 절에 남아 있습니다.

### 바뀐 파일(워크트리 p13d)
- `src/app/dev/mic-probe/probe-log.ts`: 사건 'speak-call', 사건 칸 speaking · pending, 행 값 sessionSpeak · 표 칸, 복사 글 설명 줄을 고쳤습니다.
- `src/app/dev/mic-probe/mic-probe.tsx`: S · S2 누름 안 무음 읽기, `speakInSession` 과 단추, speak() 직전 speak-call 을 넣었습니다.
- `src/app/dev/mic-probe/probe-text.ts`: 2분 순서 · 단추 이름을 고쳤습니다.
- `tests/unit/mic-probe.test.ts`: S · S2 시험을 고쳤습니다. 옛 꼴 대체 셈을 더했고, S 에서 두 번 부르고 한 번 시작한 사례로 칸 글까지 봅니다.

### 덮는 시험(고친 것)
- "S · S2 는 한 세션의 final ms 를 모두 남기고, 세션 중 읽기는 부른 수 · 시작 알림 수 · 앞 뒤 결과 수 · 뒤 final 수와 읽은 문장 낱말이 들렸는지를 남기며, T 는 abort 로 끝낸 것이 다음 기록의 앞 멈춤에 붙는다"

### 관문(출력은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/mic-f5-g-*.txt`)

| 관문 | 결과 |
|---|---|
| `pnpm biome ci` · `pnpm tsc --noEmit` | 0 · 0 |
| `pnpm test` | 0, 시험 파일 152 통과 · 시험 1967 통과(todo 6). mic-probe 7/7 · 로그 끝점 3/3 |
| `pnpm spec:trace` · `pnpm seed:validate` | 0 · 0 |
| `pnpm check:deps` · `pnpm check:ids` | 0 · 0 |

### 남은 우려
- S 누름의 무음 읽기는 start 바로 앞에 부르므로, 읽기 제약 풀기와 인식 시작이 같은 때에 겹칩니다. 그것이 세션 시작(as)에 영향을 주는지는 이번 순서로 가르지 못합니다. 이번 기록의 as 를 기록 4 의 S(무음 읽기 없음)와 견주면 볼 수 있습니다.
- '세션 중 읽기'를 읽는 도중에 다시 누르면 앞 읽기 뒤에 줄을 섭니다(취소하지 않음). 그때 speak-call 의 pending 이 참으로 남습니다.
- e2e 는 이번에도 돌리지 않았습니다. 실제 확인은 요청자 iPad 몫입니다.

## fix 6(2026-11-07, 분석 `task-mic-probe-analysis-report.md` 10.17 — 캡처 시작과 겹친 읽기 · 죽은 세션을 오래 연 뒤 살아남)

상태: DONE. 관문 다섯이 모두 0 입니다. 공용 파일은 바꾸지 않았고(mic-probe 쪽 파일 셋과 그 단위 시험만), 녹음 · getUserMedia · DB 쓰기는 없습니다. V-4 까지 넣었습니다.

### 바뀐 것
- **V-1 '읽기 제약 풀기' 단추.** 그 누름 안에서 앱과 같은 무음 읽기만 하고, 듣지 않습니다. 결과(시작 · 끝 알림 · 오류)는 단추 아래 한 줄로 보이고, 다음 듣기 기록의 새 칸 '앞 제약 풀기(누른 뒤 ms·시작·끝)'에 붙습니다. 듣기가 끝나면 지웁니다. fix 5 의 S · S2 누름 안 무음 읽기는 뺐습니다. 이제 S · S2 는 start 만 하므로, 캡처 시작과 읽기가 겹치지 않습니다.
- **V-2.** '세션 중 읽기'는 읽기 전에 그때의 speaking · pending 을 담은 'speak-cancel'(code queue-clear) 사건을 남깁니다. 그다음 speechSynthesis.cancel() 로 줄을 비우고 읽습니다. speak-call 표지는 그대로입니다. 듣기 앞 cancel 만 세는 G 의 '취소 뒤' 칸에는 들어가지 않습니다.
- **V-3 전략 W3 · W10 · W25 '버림 → 진짜'.**
  - 누름 안에서 버림 세션(시도 1)을 start 합니다. n초 뒤 stop 하고, end 뒤 1초에 진짜 세션(시도 2)을 누름 밖 타이머로 start 합니다. end 가 3초 안에 오지 않으면 end-missing 을 적고 엽니다.
  - 버림 세션의 audiostart 가 250ms 를 넘으면 살아 있는 세션입니다. 그때는 'decoy-alive'(as 값)를 남기고, abort 한 뒤 곧바로 진짜를 엽니다.
  - 'W 읽기: 켬 · 끔' 토글을 두었고, 누를 때의 값이 기록에 붙습니다. 켬이면 버림 세션 2초 때 짧은 문장을 누름 밖에서 읽습니다(speak-call 이 남음).
  - 진짜 세션은 A 와 같은 자동 멈춤(2초 조용함 · 6초 결과 없음 · 10초 상한)을 씁니다.
  - 화면에는 버림 중 "W10 버림 세션 10초예요 · 아직 말하지 마세요", 진짜 중 "W10 진짜 세션이에요 · 지금 'apple' 이라고 말해 주세요"가 보입니다.
  - 새 칸 '버림(길이·as·살아 있음·읽기 부름/시작) → 진짜(as·결과)'의 예는 `10s·35·아니요·1/0 → 380·성공` 입니다.
- **V-4 'WebAudio 소리 1초' 단추.** 듣는 중에도 켜져 있습니다. 누름 안에서 새 AudioContext 를 만들고, 440Hz 발진기를 음량 0.2 로 1초 재생합니다. 듣는 중이면 그 기록에 'webaudio-beep' 사건(시작 때 상태 · ended)을 남기고, 화면에는 상태 한 줄이 보입니다.
- **쪽 위 순서(3분).** ① 읽기 제약 풀기 → S → 'apple' → 세션 중 읽기(줄 비움) → 'banana' → 멈추기 ② W 읽기 켬 · W10 ×3 ③ W3 ×2 ④ W 읽기 끔 · W10 ×2 ⑤ W25 ×1 ⑥ WebAudio 소리 1초.

### 설계와 다르게 하거나 고른 것
- W 의 읽기 켬 · 끔은 전략 이름을 나누지 않고 기록의 값(decoy.speak)으로 둡니다. 그래서 요약 표의 W10 줄에는 켬 · 끔이 섞이고, 가르는 것은 표의 버림 칸('끔' 또는 부름/시작 수)입니다.
- '읽기 제약 풀기'는 듣기 기록을 만들지 않습니다. 그 결과는 다음 기록의 칸과 화면 한 줄에만 남고, 그 자체로 서버 로그를 보내지는 않습니다.

### 바뀐 파일(워크트리 p13d)
- `src/app/dev/mic-probe/probe-log.ts`: 전략 W3 · W10 · W25, `DECOY_*` · `BEEP_*` 상수, 사건 webaudio-beep · decoy-alive, 기록 칸 decoy · unlockBefore(기본 null), 행 값 decoy(`decoyOf`) · unlockBefore, 표 칸 둘, 복사 글 설명 줄을 넣었습니다. 세션 중 읽기 칸은 S · S2 에만 둡니다.
- `src/app/dev/mic-probe/mic-probe.tsx`: `unlockSpeech` · `beep` · `endDecoy`, 줄 비우는 `speakInSession`, 버림 세션 타이머 · 살아 있음 판정, 다시 열기 지연(restartDelayMs), 단추 셋 · 상태 글을 넣었습니다.
- `src/app/dev/mic-probe/probe-text.ts`: 3분 순서 · 단추 · 상태 문구를 고쳤습니다.
- `tests/unit/mic-probe.test.ts`: 새 칸에 맞춰 고치고 시험 하나를 더해 여덟이 됐습니다.

### 덮는 시험(더한 것)
- "W 는 버림 세션(시도 1)의 길이 · as · 살아 있음 · 버림 중 읽기 부름/시작과 진짜 세션(시도 2)의 as · 결과를 남기고, 앞 '읽기 제약 풀기'는 누른 뒤 ms · 시작 · 끝 알림으로 남는다"

### 관문(출력은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/mic-f6-g-*.txt`)

| 관문 | 결과 |
|---|---|
| `pnpm biome ci` · `pnpm tsc --noEmit` | 0 · 0 |
| `pnpm test` | 0, 시험 파일 152 통과 · 시험 1968 통과(todo 6). mic-probe 8/8 · 로그 끝점 3/3 |
| `pnpm spec:trace` · `pnpm seed:validate` | 0 · 0 |
| `pnpm check:deps` · `pnpm check:ids` | 0 · 0 |

### 남은 우려
- W 의 진짜 세션은 누름 밖 타이머로 엽니다(브리프대로). 그래서 진짜 결과에는 '누름 밖 시작'이 섞여 있습니다. 같은 길이 · 같은 꼴의 누름 안 대조군은 없습니다.
- W 의 버림 → 진짜 사이 1초와 end-missing 대기 중에는 '멈추기'가 바로 듣지 않습니다(다시 여는 중). 진짜가 열린 뒤에는 멈춥니다.
- V-4 의 소리는 기기 스피커로 들리므로, 듣는 중이면 그 소리가 인식에 들어갈 수 있습니다. 그것도 결과입니다.
- e2e 는 이번에도 돌리지 않았습니다. 실제 확인은 요청자 iPad 몫입니다.

## fix 7(2026-11-07, 브리프 `task-mic-probe-fix7.md` · 분석 10.18.3 X-1~X-6 · 자동 차례 0~8 — '자동 W 라운드')

상태: DONE_WITH_CONCERNS. 관문은 모두 0 입니다. 앱 본 코드 · 설정값 · DB · 로그 끝점은 건드리지 않았고, 녹음 · getUserMedia 는 없습니다. 우려는 아래 '남은 우려'에 적었습니다.

### 자동 차례 구현 요약
- **X-1 단추 하나.** '자동 W 라운드'를 누르면 그 누름 안에서 무음 읽기(기존 unlock 과 같은 글 · 음량 0)를 부릅니다. 끝 알림(또는 15초 상한) 뒤 45초를 쉬고, 그다음 차례 0~8 을 타이머로 스스로 돕니다. 인식 start 는 모두 누름 밖입니다. 기존 '자동 측정 시작'과 손 단추는 그대로 두었습니다.
- **X-2 화면 글.** 라운드가 도는 동안에는 쪽 전체가 큰 글씨 한 줄과 '멈추기'만 남습니다. 진짜 세션의 start 를 부르는 순간에만 '지금 apple 이라고 말해요'(text-7xl)가 보이고, 차례 7 은 읽기 끝 뒤 '이제 banana 라고 말해요'가 보입니다. 버림 · 읽기 · 차례 사이는 '기다려요', 45초 쉼은 '준비 중 · 남은 n초'입니다. 진짜에서 final 이 오면 곧바로 '기다려요'로 돌아갑니다. 손 W 단추의 상태 글도 '기다려요' · '지금 apple 이라고 말해요'로 바꿨습니다.
- **X-3 버림 변형.** 차례 표 그대로 길이 10 · 10 · 5 · 3 · 10 · 10 · 10 · 10 · 10초, 읽기 켬 · 켬 · 켬 · 켬 · 끔 · 켬 · 끔 · 켬 · 켬입니다. 읽기는 버림 2초 때 SPEAK_SENTENCE 를 첫 선생님 높이 · 목소리 순서 · 빠르기 0.8 로 읽습니다. 버림은 정한 길이 뒤 stop 하고, end 뒤 1초에 진짜를 엽니다.
- **X-4 살아 있는 버림.** 버림 as 가 250ms 를 넘으면 decoy-alive 를 남기고 abort 합니다. 차례 0 은 (나) 두 번째 버림 10초 · 읽기 켬 → 진짜로 가고, 두 번째도 살아 있으면 abort 뒤 (가)로 갑니다. 차례 8 은 (가) 세션 없이 한 문장 읽기 → 읽기 끝 1초 뒤 진짜로 갑니다. 첫 버림이 죽어 있으면 W10 으로 이어 갑니다. 탄 길은 기록의 round.path(dead · na · na-ga · ga)에 남습니다.
- **X-5 차례 7 의 S 꼴.** 진짜 세션은 첫 final 로 멈추지 않습니다. 첫 final 2초 뒤 speak-cancel(code queue-clear, 그때 speaking · pending)을 남기고 cancel() 한 뒤, speak-call 표지와 함께 한 문장을 읽습니다. 읽기 끝(또는 15초) 뒤 'banana' 를 보이고, 그 뒤 final 이 오면 stop(멈춤 final), 6초 안에 없으면 stop(no-result)합니다. 상한은 20초입니다.
- **X-6 기록.** 차례 하나가 기록 한 줄(전략 WR, autoStep 0~8)이고, 새 칸 round(차례 · 정한 값 · 탄 길 · 시도마다 버림인지 진짜인지)는 zod 기본값 null 이라 옛 기록도 읽힙니다. 행 값 round 가 버림마다 as · 살아 있음 · 실제 길이 · 읽기 시작 · 끝, 세션 없이 읽기, 진짜 as · speechstart · final 글 길이 · 들은 길이 · apple · banana 를 사건에서 계산합니다. 진짜는 결과가 없으면 6초, 결과 뒤 1.5초 조용하면 stop 합니다. 라운드 끝에 화면 '끝났어요 · 진짜 살아남 n/m' 과 '기록 복사' 단추가 보이고, 서버 로그에는 kind round · line '진짜 살아남 n/m' 몸이 갑니다. 기록마다의 로그는 지금처럼 저절로 갑니다.
- 가짜 시계로 잰 한 라운드는 3분 40초 안팎입니다(아래 시험 '4분 안').

### 설계와 다르게 하거나 고른 것
- **러너를 새 파일 `src/app/dev/mic-probe/w-round.ts` 에 두었습니다.** 컨트롤러가 적은 파일 넷 밖이지만, 브리프 '지킬 것'의 범위(`src/app/dev/mic-probe/*`) 안입니다. 기존 러너는 tsx 안에서 window · document 를 바로 써서 node 단위 시험으로 돌릴 수 없습니다. 그래서 인식 · 읽기 · 시계 · 타이머를 주입받는 React 없는 클래스로 분리했습니다. ProbeRunner 는 이 러너를 만들고, 앞 듣기 끝 · 인식 객체 번호 · 읽기 여부를 나눠 줍니다.
- **차례 1~7 의 버림이 뜻밖에 살아 있을 때**는 표에 정해진 것이 없어 (나)로 보냈습니다. 탄 길이 기록에 남으므로 판정 때 걸러 낼 수 있습니다.
- **(가)의 '세션 없이 읽기 → 진짜' 사이**에는 버림 stop → 진짜와 같은 1초(DECOY_GAP_MS)를 두었습니다.
- **S 꼴의 보조 길.** 세션 중에는 final 이 늦을 수 있어서, apple 단계에서 중간 결과 뒤 1.5초 조용하면 첫 final 과 같게 2초 뒤 읽기로 넘어갑니다. banana 단계도 중간 결과 뒤 1.5초 조용하면 stop 합니다. stop 하면 iOS 가 final 을 내므로 살아남 셈은 final 로만 합니다.
- **기록 꼴에 값 넷을 더했습니다.** 전략 WR(손 단추 목록에서는 뺌), 사건 prompt(code apple · banana — 낱말을 보인 때), 멈춤 final, 읽기 종류 bare(세션 없이 읽기)입니다. 표에는 마지막 칸 'W 라운드(…)'를 더했고, 복사 글 머리에 '- W 라운드 <표지>: 진짜 살아남 n/m' 줄이 붙습니다.
- **fix 6 의 '순서(3분)' 목록을 화면과 문구에서 뺐습니다.** 브리프의 '그 밖의 안내 글은 모두 없앤다'에 따라 라운드 안내 글(MIC_TEXT.roundGuide, 브리프 글 그대로)로 바꾼 것입니다. 손 단추 안내 셋(guide · pressGuide · reloadGuide)은 라운드가 도는 동안에는 보이지 않으므로 두었습니다.
- **`pnpm typecheck` 는 package.json 에 없습니다.** 그래서 `pnpm exec tsc --noEmit -p .` 로 대신했습니다.

### 바뀐 파일(워크트리 p13d, 커밋 안 함)
- `src/app/dev/mic-probe/w-round.ts`(새 파일): WRoundRunner 입니다. start(누름 안 무음 읽기) · 차례 예약 · openDecoy · endDecoy · afterDecoy · bareSpeak · openReal · S 꼴 toReading · promptBanana · stopReal · stop(멈추기) · dispose 가 들어 있습니다.
- `src/app/dev/mic-probe/probe-log.ts`: 52 · 58줄 WR 과 손 단추 목록, 183 · 197 · 215줄 prompt · final · bare, 301줄 round 칸, 1085~1099줄 ROUND_* 상수, 1128줄 roundPlanOf, 1165 · 1176줄 roundNextOf · roundPathOf, 1222줄 roundRowOf, 1307줄 roundCellOf, 1331줄 roundSurvivalOf, 1353줄 roundLogOf 와 표 칸 · 복사 글 줄을 고쳤습니다.
- `src/app/dev/mic-probe/mic-probe.tsx`: 503줄 ProbeRunner.startRound, 1436줄 읽기 연결 roundSpeechOf, 1775줄 단추 처리, 1798줄 라운드 칸, 1850줄 라운드 중 화면, 2211줄 roundText 를 더했고 press · pressNow · startAuto · unlockSpeech 는 라운드 중 받지 않게 했습니다. stopNow · note · dispose 도 라운드로 이어 줍니다.
- `src/app/dev/mic-probe/probe-text.ts`: round* 문구 일곱, 전략 WR 이름, 손 W 상태 글 둘을 고치고 순서 목록을 뺐습니다.
- `tests/unit/mic-probe-round.test.ts`(새 파일, 시험 9) · `tests/unit/mic-probe.test.ts`(기록 꼴에 round 칸 셋) · `tests/e2e/mic-probe.spec.ts`(라운드 단추 · 안내 글 확인)입니다.

### 덮는 시험(새로 더한 것, `tests/unit/mic-probe-round.test.ts`)
- "자동 차례는 0~8 아홉이고 버림 길이 · 읽기 · 살아 있는 버림의 길 · 진짜 꼴 · 쉼이 브리프 표와 같다"
- "살아 있는 버림의 길: 죽은 버림은 진짜, 살아 있는 첫 버림은 (나)면 두 번째 버림 · (가)면 세션 없이 읽기, 두 번째도 살아 있으면 세션 없이 읽기"
- "누름 안에서 무음 읽기를 하고 끝 알림 뒤 45초 쉰 다음, 차례 0 의 첫 버림이 죽어 있으면 W10(2초 때 읽기 · 10초 stop · 1초 뒤 진짜)으로 이어 가고 진짜 start 때만 'apple' 을 보인다"
- "차례 0 의 첫 버림이 살아 있으면(as > 250) abort 하고 (나) 두 번째 버림 10초 · 읽기 켬 → 진짜, 두 번째도 살아 있으면 abort 뒤 세션 없이 읽기 → 진짜로 가며 탄 길을 남긴다"
- "차례 8 은 45초 쉰 뒤 첫 버림이 살아 있으면 abort 하고 (가) 세션 없이 읽기 → 진짜, 죽어 있으면 W10 으로 이어 간다"
- "차례 7 의 진짜는 S 꼴: 첫 final 로 멈추지 않고 2초 뒤 줄을 비우고(speak-cancel) speak-call 표지와 한 문장을 읽은 뒤 '이제 banana' 를 보이고, banana final 이면 stop · 없으면 6초 뒤 stop 한다"
- "라운드 한 번은 차례 0~8 을 4분 안에 돌고 끝에 '진짜 살아남 n/m'(차례 7 은 apple · banana 둘 다)을 화면 · 로그 · 복사 글에 남기며, 기록은 저장 꼴로 다시 읽힌다"
- "'멈추기'를 누르면 도는 차례를 abort 로 끝내 기록하고(멈춤 user) 라운드를 끝낸다"
- "안내 글 상수: 요청자 안내 글은 브리프 그대로이고, 화면 글은 '지금 apple 이라고 말해요' · '이제 banana 라고 말해요' · '기다려요' · '준비 중 · 남은 초' · '끝났어요 · 진짜 살아남 n/m' 이다"

### 관문(출력은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/mic-f7-*.txt`)

| 관문 | 결과 |
|---|---|
| `pnpm lint` · `pnpm biome ci` | 0 · 0(605 파일) |
| `pnpm typecheck` | 스크립트 없음(ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL). 대신 `pnpm exec tsc --noEmit -p .` 0 |
| `pnpm test` | 0, 시험 파일 153 통과 · 시험 1977 통과(todo 6). fix 6 의 1968 에 새 시험 9 를 더한 수입니다 |
| `pnpm spec:trace` · `pnpm seed:validate` | 0 · 0 |
| `pnpm check:deps` · `pnpm check:ids` | 0 · 0 |

### 스스로 확인한 것
- 브리프 X-1~X-6 과 차례 표 0~8 을 하나씩 대조했습니다. 길이 · 읽기 · 길 · S 꼴 · 쉼은 첫 시험이, 'apple' 이 진짜 start 순간에만 보이는 것은 셋째 · 일곱째 시험이 확인합니다.
- 옛 기록(round 칸 없음)이 기본값 null 로 읽히는 것은 기존 복사 글 시험이, WR 기록이 저장 꼴로 다시 읽히는 것은 일곱째 시험이 확인합니다.
- 라운드 끝 로그 몸에는 들은 글이 들어가지 않습니다. 기록마다의 로그에도 finalText 가 없습니다(일곱째 시험).

### 못 한 것
- e2e(`tests/e2e/mic-probe.spec.ts`)는 고쳤지만 돌리지 않았습니다. 라운드 자체는 e2e 에서 누르지 않습니다.
- 실제 iPad 에서의 동작은 확인하지 못했습니다. 요청자 몫입니다.

### 남은 우려
- 진짜 세션은 모두 누름 밖 타이머로 엽니다(브리프대로). 누름 안 대조군은 이 라운드에 없습니다.
- 버림 안 읽기 문장은 브리프가 고른 SPEAK_SENTENCE("Please say one word.")입니다. 글 뜻이 '한 낱말을 말해요'라서 요청자가 따라 말할 수 있습니다. 안내 글에 '선생님 목소리가 나와도 따라 하지 않아요'가 있지만, 판정 때 버림 중 결과(as 뒤 result)가 있는지 함께 보는 편이 안전합니다.
- 가짜 시계의 읽기 길이는 1.5초로 두었습니다. 실제 기기에서 읽기가 길면 차례 3(버림 3초)은 읽기가 버림 stop 뒤에 끝납니다. 그 값도 버림 칸의 읽기 끝 ms 로 남습니다.
- 차례 1~7 의 살아 있는 버림을 (나)로 보낸 것은 제 판단입니다. 다르게 정하면 roundPlanOf 의 live 값 하나만 바꾸면 됩니다.

## fix 8(2026-11-07, 브리프 `task-mic-probe-fix8.md` 갱신 절(04:3x) · 분석 10.19.5 Z-1~Z-7 · 자동 차례 0~13 — '자동 W 라운드 2')

상태: DONE_WITH_CONCERNS. 관문은 모두 0 입니다. 브리프 갱신 절이 위 표(Y-1~Y-6 · 차례 0~12)를 대신한다고 해서, 갱신 절의 Z 표와 차례 0~13 을 따랐습니다. 앱 본 코드 · 설정값 · DB · 로그 끝점은 건드리지 않았고, 녹음 · getUserMedia 는 없습니다.

### 차례 구현 요약
- **단추.** '자동 W 라운드 2'를 맨 위에 두고, fix 7 의 '자동 W 라운드'는 그 아래에 그대로 두었습니다. 한 라운드가 도는 동안에는 다른 라운드 칸이 숨습니다.
- **Z-1 누름 안.** 누름 안에서 띵용 AudioContext 를 만들어 resume 하고, 러너가 cancel 뒤 무음 읽기를 부릅니다. 끝 알림(또는 15초) 뒤 곧바로 차례 0 을 엽니다. AudioContext 상태는 첫 기록에 webaudio-start 로 남고, 라운드가 끝나면 닫습니다.
- **차례 0 · 13(버림 없음).** cancel → 0.3초 → 세션 없이 '보통 말' → 끝 알림 → speaking 거짓 확인 → 1초 → 진짜입니다. 차례 13 앞은 45초를 쉬고, 화면에 '쉬는 중 · 남은 n초'가 보입니다.
- **차례 1~8 · 10~12(버림 있음).** 차례 사이 2초 안에 버림을 엽니다. 소리는 버림 audiostart 0.2초 뒤에 부르고, 1초까지 audiostart 가 없으면 1초에 부릅니다. 소리는 차례 1 이 '보통 말'("That is good."), 2~6 · 10~12 가 '짧은 말'("Okay."), 7 · 8 이 띵(440Hz · 1초 · 음량 0.1)입니다. 읽기는 모두 기본 빠르기입니다.
- **Z-4 버림 닫기.** '소리 끝(읽기 끝 알림 · 띵 재생 끝) + 300ms'와 '버림 하한(5 · 3 · 1.5초)'을 둘 다 채운 뒤 stop 합니다. 소리 시작 뒤 3초(시작 알림이 없으면 부른 뒤 3초, 띵은 1초 + 3초) 안에 끝이 없으면 '끝 없음'을 남기고 cancel 한 뒤 stop 합니다. end 뒤에는 speaking 이 거짓이 되기를 0.3초까지(50ms 마다) 기다려 남기고, 그 뒤 1초에 진짜를 엽니다.
- **차례 9(굳음 만들기).** cancel 없이 긴 문장을 버림 2초에 부르고, 하한 3초에 소리 끝을 기다리지 않고 stop 합니다. 거짓 확인 없이 end 1초 뒤 진짜를 열어 읽는 도중에 캡처를 시작합니다.
- **차례 12(U16, S 꼴).** 'apple' 이 든 첫 결과(중간 포함) 2초 뒤 cancel → 0.3초 → '짧은 말' → 끝 알림(또는 5초) 뒤 '이제 banana 라고 말해요'를 보입니다. final 글에 'banana' 가 들면 1.5초 뒤 stop 하고, 없으면 'banana' 를 보인 뒤 6초에 stop 합니다. 전체 상한은 20초입니다.
- **진짜(보통 꼴).** 'apple' 이 든 결과가 오면 '기다려요'로 바꾸고, 그 뒤 1.5초 조용하면 stop 합니다. 6초 안에 'apple' 이 든 결과가 없으면 stop 합니다. stop 하면 곧바로 '기다려요'로 바꿉니다(검토 M2).
- **기록 · 줄.** 차례 하나가 기록 한 줄(전략 WR2)입니다. 끝에 '끝났어요'와 갈래별 줄('대조군 n/m · 3초 짧은 말 n/m · 1.5초 n/m · 띵 n/m · 복구 n/m · 쉰 첫 n/m · U16 됨/안 됨 · 뺀 차례 …')과 '기록 복사'가 보입니다. 기록마다의 로그는 지금처럼 저절로 가고, 끝에 kind round2 로그가 한 번 더 갑니다. 가짜 시계로 잰 한 라운드는 2분 45초 안팎입니다.

### 검토 C1~C3 · I1 반영 자리
- **C1 모든 읽기 앞 cancel**: `w-round2.ts:364` cancelFirst 입니다. 버림 · 세션 없이 · 세션 중 읽기와 무음 읽기(`:141` start) 앞에 부르고, 차례 9 만 뺍니다. cancel 때와 0.3초 뒤의 speaking · pending 을 speak-cancel(before-speak) · speak-state(after-cancel)로 남깁니다.
- **C2 버림은 소리가 끝난 뒤 닫고, 거짓 확인 뒤 1초에 진짜**: `w-round2.ts:447` callSound · `:511` closeDecoy · `:534` gapThenReal 입니다. stop 때와 거짓 확인 때 speaking 을 speak-state(stop · gap)로 남깁니다.
- **C3 banana 는 'banana' 든 final 만**: `w-round2.ts:598` onRealResult 입니다. 다른 final · 중간 결과 · 메아리로는 멈추지 않습니다. 행의 banana 셈은 `probe-log.ts:1675` round2RowOf 입니다.
- **I1 apple 은 중간 결과도**: 결과 사건마다 apple · banana · echo 표지를 붙이고(`probe-log.ts:224`), 행이 그 표지로 셉니다. 표지가 처음 든 중간 결과는 중간 결과 상한을 넘어도 남깁니다.

### 설계와 다르게 하거나 고른 것
- **새 전략 WR2 와 round 칸 확장.** round 칸에 sound · sentence · cancel · waitSound · group 다섯을 더했고, 모두 zod 기본값 null 이라 옛 기록이 그대로 읽힙니다. 사건 종류 speak-state 하나와 결과 표지 셋(apple · banana · echo)도 더했습니다. fix 7 의 행 · 살아남 셈 · 복사 줄은 WR 기록만 보게 좁혀, 두 라운드가 섞이지 않습니다.
- **fix 7 러너의 동작은 바꾸지 않았습니다.** C1~C3 · I1 은 라운드 2 에만 넣었습니다. 기록 7 과 같은 조건으로 다시 잴 수 있게 두려는 것입니다. fix 7 러너에는 새 칸의 null 값과 도움 함수 둘의 내보내기만 더했습니다.
- **버림 앞 cancel 은 버림 start 0.3초 앞에 부릅니다.** 0.3초 뒤에 잰 speaking · pending 이 새 읽기가 아니라 cancel 의 결과를 보이게 하려는 것입니다. 그래서 소리는 브리프대로 audiostart 0.2초 뒤에 나오고, 앞 진짜 end 에서 버림 start 까지는 그대로 2초입니다. 세션 없이 · 세션 중 읽기는 cancel 0.3초 뒤에 부릅니다.
- **살아 있는 버림(as > 250)도 abort 하지 않습니다.** 분석 10.19.2 규칙 5 와 맞추었습니다. 기록에는 '살아 있음'으로 남고, 그 차례는 깨끗하지 않은 것으로 보아 갈래 셈에서 뺍니다.
- **'끝 없음' 3초는 소리 시작 알림부터 잽니다(갱신 절 Z-4).** 줄이 굳어 시작 알림이 아예 오지 않으면 부른 때부터 잽니다. 띵은 부르는 순간이 시작이라 재생 1초를 더합니다.
- **차례 12 의 대비 길.** 결과가 왔는데 'apple' 로 들리지 않으면 1.5초 조용할 때 읽기로 넘어갑니다. 기록의 cancel message 가 'quiet' 로 남아 가를 수 있습니다.
- **'깨끗한 차례'의 뜻.** 버림이 죽어 있고(as ≤ 250) 소리가 시작 · 끝나 버림 stop 전에 끝난 차례입니다. 세션 없이 읽기 차례는 읽기가 시작 · 끝난 차례입니다. 차례 9 는 늘 빼고, 차례 12 는 U16 줄로만 셉니다.
- **메아리 낱말.** 짧은 말은 okay · ok, 보통 말은 good, 긴 문장은 sea · blue · sun · warm · today 입니다. 이번에 바뀐 결과 글에 들 때만 셉니다.
- **목소리.** 기본 빠르기로 읽되, 높이 · 목소리 순서는 fix 7 처럼 첫 선생님 것을 씁니다.

### 바뀐 파일(워크트리 p13d, 커밋 안 함)
- `src/app/dev/mic-probe/w-round2.ts`(새 파일): WRound2Runner 입니다.
- `src/app/dev/mic-probe/probe-log.ts`: 55 · 61줄 WR2 와 손 단추 목록, 189줄 speak-state, 224줄 결과 표지, 325줄 round 칸 확장, 602줄 행 칸, 928줄 복사 줄, 1279줄 fix 7 행 좁힘, 1466줄부터 ROUND2_* 상수 · round2PlanOf(1553) · round2RowOf(1675) · round2CellOf(1838) · round2LinesOf(1867) · round2LineOf(1899) · round2LogOf(1911)입니다.
- `src/app/dev/mic-probe/mic-probe.tsx`: 337줄 rounding 막음, 635줄 ProbeRunner.startRound2(AudioContext · 띵 연결), 1934줄 단추 처리, 1976줄 라운드 2 칸, 2464줄 round2Text 입니다. stopNow · note · dispose 도 라운드 2 로 이어 줍니다.
- `src/app/dev/mic-probe/probe-text.ts`: round2Start · round2Guide(브리프 글 그대로) · round2Rest · round2Done, 전략 WR2 이름입니다.
- `src/app/dev/mic-probe/w-round.ts`: 새 round 칸 null 값과 tryCall · errorFields 내보내기만 더했습니다.
- `tests/unit/mic-probe-round2.test.ts`(새 파일, 시험 15) · `tests/e2e/mic-probe.spec.ts`(라운드 2 단추 · 안내 글 확인)입니다.

### 덮는 시험(`tests/unit/mic-probe-round2.test.ts`)
가짜 읽기는 문장마다 길이가 다르고(짧은 말 0.6 · 보통 말 1.3 · 긴 문장 2.6초), 시험마다 부른 차례별로 길이를 바꾸거나 끝 알림을 없앨 수 있습니다. 캡처 시작 때 읽는 중이면 줄이 굳고, cancel 만 그 줄을 풉니다. fix 7 검토 M4 의 '늘 1.5초라 못 잡음'을 이것으로 고쳤습니다.
- "자동 차례는 0~13 열넷이고 버림 하한 · 소리 · cancel · 소리 끝 기다림 · 진짜 꼴 · 갈래 · 쉼이 브리프 갱신 절 표와 같다"
- "누름 안에서 줄을 비우고(cancel) 무음 읽기를 부르며, 차례 0 은 버림 없이 cancel → 0.3초 → 세션 없이 보통 말 → 끝 → 1초 → 진짜(start 때만 'apple')"
- "버림 닫기: 소리가 하한보다 짧으면 하한(3초)에 stop, 길면 '소리 끝 + 300ms' 에 stop 하고, 버림 앞 cancel 은 0.3초 먼저 · 소리는 audiostart 0.2초 뒤다"
- "소리 끝 알림이 소리 시작 뒤 3초 안에 안 오면 '끝 없음' 을 남기고 cancel 뒤 stop 하며, 그 차례는 깨끗하지 않아 갈래 셈에서 뺀다"
- "버림 end 뒤 speaking 이 거짓이 되기를 0.3초까지 기다려 남기고 그 뒤 1초에 진짜를 연다(거짓이 안 되면 0.3초에 그대로 남기고 연다)"
- "차례 7 · 8 의 띵: cancel 없이 audiostart 0.2초 뒤 440Hz · 1초 · 음량 0.1 을 내고, 재생 끝 + 300ms 와 하한 3초를 채운 뒤 stop 한다"
- "차례 9 는 cancel 없이 긴 문장을 버림 2초에 부르고 하한 3초에 바로 stop → 1초 뒤 읽는 도중 진짜를 열어 줄을 굳히고, 차례 10 의 cancel 이 그 줄을 풀어 읽기가 시작된다"
- "읽기 앞 cancel: 라운드 전체에서 버림 · 세션 없이 · 세션 중 읽기 모두 앞에 cancel 표지가 있고(차례 9 만 없음), 세션 없이 · 세션 중 읽기는 cancel 0.3초 뒤에 부른다"
- "차례 12(U16): 진짜를 S 꼴로 열어 'apple' 이 든 중간 결과 2초 뒤 cancel → 0.3초 → 짧은 말 → 끝 뒤 'banana' 를 보이고, 메아리 · 'banana' 없는 final · 중간 결과로는 멈추지 않고 'banana' 든 final 1.5초 뒤 stop 한다"
- "보통 꼴 진짜: 'apple' 은 중간 결과에만 들어도 들음이고, 'apple' 이 든 결과 전의 메아리 결과로는 멈추지 않으며, 'apple' 이 6초 안에 없으면 stop 한다"
- "차례 13 은 45초 쉼(화면 '쉬는 중 · 남은 초') 뒤 버림 없이 cancel → 세션 없이 보통 말 → 끝 → 1초 → 진짜를 연다"
- "라운드 한 번은 차례 0~13 을 4분 안에 돌고 끝에 '끝났어요' 와 갈래별 줄을 화면 · 로그 · 복사 글에 남기며, 기록은 저장 꼴로 다시 읽히고 fix 7 셈과 섞이지 않는다"
- "옛 기록(round 칸에 fix 8 칸 없음)은 기본값 null 로 읽히고 WR2 행이 생기지 않는다"
- "'멈추기'는 도는 차례를 abort 로 끝내 기록하고 읽기를 cancel 하며, 쪽을 떠나면(dispose) 알림 없이 인식 · 읽기를 끊는다"
- "안내 글 상수: 요청자 안내 글과 단추 · 쉼 · 끝 글은 브리프 그대로다"

### 관문(출력은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/mic-f8-*.txt`)

| 관문 | 결과 |
|---|---|
| `pnpm lint` | 0(607 파일) |
| `npx tsc --noEmit` | 0 |
| `pnpm test` | 0, 시험 파일 154 통과 · 시험 1992 통과(todo 6). fix 7 의 1977 에 새 시험 15 를 더한 수입니다 |

### 못 한 것
- e2e(`tests/e2e/mic-probe.spec.ts`)는 단추 · 안내 글 확인을 더했지만 돌리지 않았습니다.
- 실제 iPad 에서의 동작은 확인하지 못했습니다. 요청자 몫입니다.

### 남은 우려
- **AudioContext 가 라운드 내내 켜져 있습니다.** 브리프대로 누름 안에서 만들어 resume 했고, 소리 없이 열린 채 라운드 끝까지 남습니다. 이 상태가 iOS 의 캡처 장치에 영향을 주면 fix 7 라운드와 조건이 달라집니다. 첫 기록의 webaudio-start 값으로 상태는 보이지만, 영향 여부는 이번 라운드로 가를 수 없습니다.
- **'짧은 말'이 "Okay." 라 요청자의 맞장구와 헷갈릴 수 있습니다.** 메아리 셈은 결과 글의 'okay' · 'ok' 로 하므로, 요청자가 따라 말해도 메아리로 셉니다.
- **보통 꼴 진짜에서 'apple' 이 다른 글로 들리면** 6초에 stop 되고 apple 아니요로 남습니다. 들은 글은 '기록 복사'의 '들은 글' 칸으로 되짚을 수 있습니다.

### fix 8 고침 1(컨트롤러 갱신 알림 뒤, 같은 날)
- 컨트롤러가 갱신 절(차례 0~13 · Z-1~Z-7)을 다시 알려 왔습니다. 차례 표 · 문장 셋 · cancel 기록 · 세기 규칙 · Z-7 줄은 이미 그 절대로 만들어 두어 그대로입니다.
- 한 곳만 맞췄습니다. '소리 끝 없음' 3초를 소리 시작 알림부터 재고, 시작 알림이 없으면 부른 때부터 잽니다(`w-round2.ts` callSound · bareSpeak 의 watch, speakLine 의 시작 알림 이음). 시험 '소리 끝 알림이 소리 시작 뒤 3초 안에 안 오면 …'에 시작 알림이 없는 갈래를 더했습니다.
- 관문은 다시 모두 0 입니다(lint 607 파일 · tsc · 단위 1992 통과, todo 6). 가짜 시계로 잰 한 라운드는 2분 45초 안팎입니다. 분석의 3분 10초 어림과의 차이는 가짜 인식이 1.2초에 답하는 데서 옵니다.

## fix 8-1(2026-11-07, 검토 `task-mic-probe-fix8-review.md` — Critical 1 · Important 1 · Minor 4)

상태: DONE. 관문은 모두 0 입니다. '고침 1'(끝 없음 3초를 시작 알림부터)은 그대로 두고 그 위에 고쳤습니다. 커밋은 하지 않았습니다. 검토 M5(스테이징 판과 작업 트리 차이)는 커밋 때 다시 스테이징하는 일이라 컨트롤러 몫으로 남겼습니다.

### 고친 것
- **C1 U16 줄을 넷으로 나눔**(`probe-log.ts:1920` u16Of). '됨'은 세션 중 읽기가 시작 · 끝나고 'banana' 든 final 이 있을 때만입니다. 읽기는 끝났는데 banana final 이 없으면 '안 됨'입니다. 읽기를 불렀는데 끝 알림이 없으면(시작만 했거나 시작도 없음) '읽기 멈춤'입니다. 세션 중 읽기를 부르지 못했으면(진짜가 apple 결과 없이 멈춤) '못 잼'입니다. 줄에는 그 세션의 메아리 수를 붙입니다(예: 'U16 됨(메아리 0)').
- **I1 저절로 끝난 버림**(`w-round2.ts:547` decoyEndedEarly · `:516` maybeClose). 부른 소리가 아직 나오는 중이면 소리 끝 + 300ms(또는 '끝 없음' 감시)를 기다린 뒤 거짓 확인 → 1초 → 진짜로 갑니다. 소리를 부르기 전이거나 차례 9 면 곧바로 갑니다. 행은 stop 전에 end 가 온 버림을 '저절로 끝남'으로 표시하고 깨끗에서 뺍니다(`probe-log.ts:1750`). 소리 끝은 그 end 와 견줍니다. 차례 칸에는 '(저절로 끝남)'이 보이고, 끝 로그의 버림 값에도 들어갑니다.
- **M1** 버림 없는 차례는 시작하자마자 화면을 '기다려요'로 바꿉니다(`w-round2.ts:391`). 그래서 '남은 0초'가 남지 않습니다.
- **M2** banana 는 이번 알림에 새로 final 이 된 글만 봅니다(`w-round2.ts:853`). 앞 final 에 든 banana 뒤의 메아리 final 로는 멈추지 않습니다.
- **M3** 낱말 검사가 복수형(apples · bananas)도 셉니다(`probe-log.ts:1607` hasWord, 메아리 낱말에도 같이 적용).
- **M4** 줄에 '복구 읽기 시작 n/m'을 더했습니다(`probe-log.ts:1929`). 차례 10 · 11 가운데 cancel 뒤 읽기 시작 알림이 온 수를 깨끗함과 따로 셉니다.

### 시험(`tests/unit/mic-probe-round2.test.ts`, 15 → 19)
- 고친 시험: 차례 12 시험의 '시작만 하고 끝 없음'은 이제 '읽기 멈춤'을 기대합니다. '진짜가 못 들음 → 못 잼' 갈래도 더했습니다. 라운드 전체 시험의 줄 글도 새 꼴로 바꿨습니다.
- 새 시험: "버림이 소리 도중 저절로 끝나면 소리 끝 + 300ms 를 기다린 뒤 거짓 확인 → 1초 → 진짜를 열고, 그 차례는 '저절로 끝남' 으로 깨끗에서 뺀다(검토 fix 8 I1)"
- 새 시험: "banana 는 이번 알림에 새로 final 이 된 글만 보고(앞 final 의 banana 뒤 메아리로 멈추지 않음), 낱말 검사는 복수형 apples · bananas 도 센다(검토 fix 8 M2 · M3)"
- 새 시험: "복구 갈래 줄은 깨끗함과 따로 'cancel 뒤 읽기가 시작됐는지' 를 센다(검토 fix 8 M4)"
- 새 시험: "버림 없는 차례는 시작하자마자 화면을 '기다려요' 로 바꿔 쉼 화면 '남은 0초' 를 남기지 않는다(검토 fix 8 M1)"

### 관문(출력은 스크래치패드 `mic-f81-*.txt`)

| 관문 | 결과 |
|---|---|
| `pnpm lint` | 0(607 파일) |
| `npx tsc --noEmit` | 0 |
| `pnpm test` | 0, 시험 파일 154 통과 · 시험 1996 통과(todo 6) |

### 배포 판(da45fe5)으로 돈 기록을 읽을 때
- 지금 돌고 있는 da45fe5 판의 줄은 'U16 됨 · 안 됨' 꼴입니다. 차례 12 행이 '읽기 n~끝 없음'이면 '됨'을 '읽기 멈춤'으로 읽어야 합니다. 'apple 아니요'에 읽기 칸이 '-~-'이면 '안 됨'을 '못 잼'으로 읽어야 합니다.
- 그 판에서는 버림 칸의 실제 길이가 하한보다 짧고 stop 이 없으면 저절로 끝난 버림입니다. 그 차례는 깨끗으로 셌더라도 빼야 합니다.
