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
