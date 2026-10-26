# 코드 검토 보고: P10 차례 5 배치 평가 · 차례 6 세션 틀 · fix 4 — 검토 묶음 A3 · A2 · B3 코드 몫 + fix 4 재검토(rev-p10, 2026-10-18 02:5x)

**판정: Changes requested** — Critical 0 · Important 2 · Minor 4. fix 4 여덟은 모두 ADDRESSED.

**먼저 알릴 것: CI 의 통합(integration) 작업은 시험이 실패해도 성공으로 끝난다.** 증거로 받은 run 39051573610 에도 통합 실패 하나가 가려져 있다(I-1 · I-2). 이번 검토의 통합 몫 근거는 그래서 '작업 성공'이 아니라 로그의 시험 줄이다.

대상과 증거:
- P10 가지 커밋 bc3e1ba. 워크트리의 코드 변경은 그 뒤 없다(구현 보고 · 사진만).
- CI 가지 771d53e 는 bc3e1ba 와 구현 보고 17줄만 다르다(`git diff --stat`).
- CI run 39051573610(시도 1번, 10 작업 모두 success)의 작업 로그를 읽었다. 결과는 다음과 같다.

  | 작업 | 로그의 시험 줄 |
  |---|---|
  | unit | 360 통과 |
  | integration | **1 failed** · 107 통과 · 1 건너뜀 |
  | e2e | 46 통과 |
- 복사본 `scratchpad/rev-p10-5-6/copy`(비밀 파일 · `.dev` 뺌, node_modules 링크)에서 DB 없이 돌렸다.

  | 명령 | 결과 |
  |---|---|
  | `biome ci` | 고칠 것 없음 |
  | `check:deps` | 위반 0(130 모듈) |
  | tsc | `.next` 생성 타입(LayoutProps · PageProps) 밖 오류 0 |
  | 단위 | 360 통과(다섯 번 가운데 한 번 실패 1 — 이름을 잡지 못함, 관찰 2) |
  | 순수 함수 변이 스물 | **모두 잡힘**(아래 2절 표) |
- 통합 · e2e 는 돌리지 않았다(이 Mac 공유 메모리 고갈). 54331 · 3001 · 프리뷰 DB 는 건드리지 않았다.

## 1. 설계 준수

| 항목 | 판정 | 근거 |
|---|---|---|
| **A3 답 맞춤**(값 10 · 정할 것 차 · 카 · C73) — 고르기 번호 · 글자 타일 글자 그대로 · fill-letters 무늬 · 조립 카드(문장 부호 카드 앞에 붙임, 대소문자 · 차례 그대로) · 쓴 답(굽은 따옴표 · 겹 빈칸 · 문장 부호 앞 빈칸 · 앞뒤 공백 정규화, 낱말 답 대소문자 무시, 문장 답 그대로) · 따라 말하기(시도 가운데 높은 일치율 ≥ 기준, 기준 없으면 던짐) · 몰라요 틀림 | ✅ | `src/core/answer/check.ts`:59-193. 변이 C1~C5 모두 잡힘. 문장 답은 문장 안 대소문자까지 가린다 — C73 은 '첫 글자 대문자 · 끝 문장 부호를 구별'만 적어 더 엄한 쪽이지만 쓰기 1~3 은 낱말 · 짧은 문장이라 받는다(관찰 3) |
| 화면용 문항에 정답 칸 없음 | ✅ | `src/core/answer/display.ts`:83-153 — answerNo · accepted · build-tiles word 를 뺀다. 받아쓰기 · fill-letters 의 읽어 줄 글은 소리 자리 때문에 실린다(구현 보고에 적힘) |
| 조각은 채점 없이 onAnswer 하나 · 평가 중 정오 안 보임 | ✅ | `src/components/answer/*` 에 정답 · 채점 코드가 없다. 서버가 `checkAnswer` 로 다시 채점한다(`src/server/placement/index.ts`:660-666) |
| 1~3단계 앱 안 자판(받아쓰기) · 입력란 자동 수정 끔 | ✅ | `typing.tsx`:105-139 · 160-172. 받아쓰기는 3.3 2단계 '단어 받아쓰기'(`specs/02-2-세션과-단계표.md`:45)라 소문자 자판으로 충분하다 |
| '대문자' 단추(첫 칸 낱말 카드) · '처음부터' · '다 놓았어요' | ✅ | `tiles.tsx`:51-80 · 186-196 |
| 따라 말하기: 첫 시도 뒤 인식 글 없이 '한 번 더' · 다시 듣기 갈래 실패 셈(두 시도 합쳐 speech.max_retries) · network 안 셈 · audio-capture 세 번 이어짐이 예비보다 먼저 · mic-unavailable · stalled | ✅ | `repeat.tsx`:92-147. `key={current.itemId}`(`placement-flow.tsx`:350)로 문항마다 셈이 새로 시작한다 |
| 녹음 없음 · AI 0 | ✅ | 새 파일에 `getUserMedia` · `MediaRecorder` · AI 층 가져오기가 없다. AC-1b 통합은 CI 로그에서 통과 |
| **A2 배치 적응(C71 · 값 9 · 정할 것 라 · 처)** — 블록 판정 · 처음 두 틀림 멈춤 · 두 단계 · 건너뛴 단계 · 끝 셋 · 시작 = max(1, 최고 − 1) ≤ 판정 때 seed.complete_through_level · 실패 3회는 세지 않고 그 문항부터 예비 · 이어 보기는 같은 기록 재계산 · 기록이 차례와 어긋나면 던짐 | ✅ | `src/core/placement/adaptive.ts`:66-204. 변이 P1~P8 모두 잡힘. 규칙 수(시작 단계 · 단계마다 문항 · 영역 상한)는 평가 행 복사본에서(`index.ts`:298-312), 범위 끝은 답할 때 설정에서 |
| 결과 행(값 12): 트랙 · 알파벳 단원 0 · 회화 min(시작, talk.placement_cap)(배치 대기일 때만) · 단원 들기(첫 실행과 같은 `unitEntryOf`) · progress_events `{ area, source: "placement" }` · alphabet_sound · speaking_placement_listening · 범위 끝 | ✅ | `src/core/placement/finish.ts` · `start.ts`:424-475. 변이 F1 · F2 잡힘 |
| 시작: `placement.*` 복사본 · 시작 개정 · 두 기기 동시 시작은 진행 세션 부분 유일 색인 → 첫째 배치 | ✅ | `index.ts`:458-547 |
| 답: 평가 행 FOR UPDATE · 같은 시도 id 두 겹(앞서 받음 · onConflictDoNothing) · 지금 차례 문항만 · 서버 다시 채점 · 결과까지 한 트랜잭션 | ✅ | `index.ts`:583-793 |
| 오래 멈춰도 배치는 안 닫힘(AC-11d) | ✅ | `closeStaleSessions` 의 `ne(kind, "placement")`(차례 4). AC-11d 통합 · e2e 는 CI 로그에서 통과 |
| `seed-lists.ts` = P9c(정할 것 타) | ✅ | dae3afd 의 같은 파일과 바이트까지 같다 |
| 홈 `PLACEMENT_OPEN` 제거 · 배치 전 카드 링크 | ✅ | 구현 보고 · CI e2e AC-2a 통과 |
| **B3 미리보기**(값 3 · 정할 것 ㄹ · ㅁ) · 활동 차례 | ✅ | `src/core/session/preview.ts`. 변이 R1 · R2 잡힘. 만난 단어는 같은 영역 미리보기 시도의 `shownWords`(`index.ts` loadSessionView) |
| 시도 대기열(값 8 · 위험 10) — 같은 id 한 번 · 받은 id 만 지움 · online · 다음 넣기 때 다시 · 저장소 없으면 메모리 | ✅(P11 빈틈 M-2) | `src/lib/attempt-queue.ts`. 변이 Q1 · Q2 잡힘 |
| 세션 시작(값 6 · 위험 3 · 4 · 5) — 트랙 FOR UPDATE · 목록과 같은 함수로 재판정 · needs_confirm · 확인 뒤 이전 세션 aborted(learning_day) · resume · 판(회차 시작 개정, 다시 하기는 처음 개정 · 그 개정 가장 높은 정정, R5) · 변형(다시 하기는 처음 변형, 없으면 가장 낮은 변형) · 동시 시작 유일 위반 → 진행 세션 | ✅(교착 빈틈 M-1) | `src/server/session/index.ts`:153-309 |
| 시도 저장 · 첫 활동 '홈'(첫 활동이고 시도 0 일 때만 지움) · 다시 열면 저장한 시도 다음 활동 | ✅ | `index.ts`:314-400 · 462-490 |
| 세션 쪽: 그 프로필의 진행 세션만 · 그 밖은 목록/홈 | ✅ | `src/app/(child)/session/[id]/page.tsx` · loadSessionView 의 프로필 · 상태 조건 |
| 액션 첫 문장 `requireAccess()` · 오류는 `dbErrorTag` · 설정 키 이름만 | ✅ | `src/server/actions/{placement,session}.ts` · `placement/index.ts`:448-455 · `session/index.ts`:124-128 |
| 'use client' 경계 · 한 시계 | ✅ | 화면은 서버 액션과 `import type` 만 가져온다. 서버는 `now` 주입 |
| 시험 이름(plan 증명 표 글자 그대로) | ✅ | 단위 AC-11a 여섯 · AC-11c 둘 · AC-11d 하나 · 답 맞춤 · AC-2f 둘 · 세션 틀 대기열. 통합 · e2e 이름은 구현 보고 목록과 CI 로그가 같다 |
| **통합 시험이 실제로 통과** | ❌ **I-1 · I-2** | 아래 |

## 2. 순수 함수 변이 표본(복사본, 단위만)

| 표본 | 결과 |
|---|---|
| P1 하나 틀림 한 단계 없음 · P2 처음 두 틀림 멈춤 없음 · P8 영역 문항 상한 없음 | 각 3 실패 |
| P3 건너뛴 단계 안 봄 | 2 실패 |
| P4 시작 = 최고(−1 없음) | 5 실패 |
| P5 범위 상한 없음 · P6 실패 3회를 틀림으로 셈 · P7 예비 문항 안 냄 · F1 회화 min → max · F2 알파벳 단원 0 없음 | 각 1 실패 |
| C1 낱말 답도 대소문자 가림 · C2 문장 부호 앞 빈칸 · C3 문장 부호 카드 안 붙임 · C4 따라 말하기 첫 시도만 | 각 1 실패 |
| C5 굽은 따옴표 정규화 없음 · R1 못 만난 단어 안 더함 · Q2 받은 id 안 지움 | 각 2 실패 |
| R2 다지기가 '안다'를 안 뺌 · Q1 같은 id 두 번 · N1 로마자 관용 표 안 씀 | 각 1 실패 |

스물 모두 잡힌다. 변이를 되돌린 뒤 파일이 워크트리와 같음을 `cmp` 로 확인했다.

## 3. 지적

### Critical
없음.

### Important

**I-1. 통합 시험이 실패해도 vitest 가 0 으로 끝나 CI 통합 작업이 늘 성공한다(P3a 부터).**
- 무엇이: 통합 global setup(`tests/integration/global-setup.ts`)이 embedded-postgres 를 읽는다. embedded-postgres 는 읽힐 때 async-exit-hook 을 걸고, async-exit-hook 은 `beforeExit` 에 '코드 0 으로 `process.exit`'를 건다(`node_modules/.pnpm/async-exit-hook@2.0.1/.../index.js`:85-104, `add.hookEvent('beforeExit', 0)`). vitest 는 실패하면 `process.exitCode = 1` 을 두고 이벤트 고리를 비우는데, 그때 `beforeExit` 처리기가 `process.exit(0)` 으로 덮는다.
- 재현(복사본, DB 없이 — 일부러 실패하는 시험 하나):

  | global setup | vitest 종료 코드 |
  |---|---|
  | 아무것도 읽지 않음 | 1 |
  | embedded-postgres 를 읽기만 함 | **0** |
  | 읽은 뒤 새로 걸린 `beforeExit` 처리기를 뗌 | 1 |
- CI 증거:
  - run 39051573610 통합 작업 로그에 'Test Files 1 failed | 12 passed' · 'Tests 1 failed | 107 passed | 1 skipped' · `##[error]Error: 수업 행 없음` 이 있다. 그런데도 'Process completed with exit code' 줄이 없고 작업은 success 다.
  - run 39050999951(3차)도 같다.
  - 구현 보고의 CI 표는 두 실행의 통합을 '통과'로 적었다.
- 왜: 통합 시험(RLS · 판 규칙 · 첫 실행 · 배치 · 세션)이 깨져도 CI 와 로컬 종료 코드가 아무것도 막지 않는다. 이번 차례처럼 로컬에서 DB 를 못 띄워 CI 만 믿는 때 그대로 숨는다. P3a 이후 모든 'CI 통합 성공'은 로그를 다시 봐야 근거가 된다. e2e(Playwright — 러너가 embedded-postgres 를 읽지 않음)와 단위는 해당 없다.
- 어떻게:
  1. global setup 에서 embedded-postgres 를 동적으로 읽고, 읽은 뒤 새로 걸린 `beforeExit` · `exit` · 신호 처리기를 뗀다(dev-db 의 신호 처리기 떼기와 같은 꼴). `scripts/pg-local.ts` 에 `importEmbeddedPostgres()`(제안) 하나로 두어 dev-db 와 함께 쓰면 두 벌이 생기지 않는다. 테스트 끝 정리는 지금처럼 global setup 이 돌려준 cleanUp 이 한다.
  2. 다시 생기지 않게 CI 통합 단계에 지킴 하나를 둔다. 예: `set -o pipefail; pnpm test:int 2>&1 | tee int.log; ! grep -qE "Tests +[0-9]+ failed" int.log`. 또는 global setup 의 teardown 에서 vitest 결과를 볼 수 없으니 JUnit 보고 파일을 검사하는 꼴도 된다.
  3. 고친 뒤 main · 다른 가지의 지난 통합 결과를 한 번 다시 돌린다(컨트롤러).

**I-2. 가려진 통합 실패 — '세션 틀: 다시 열면 저장한 시도 다음 활동부터 이어진다'가 늘 실패하고, 뒤쪽 '만난 단어' 단언(정할 것 ㄹ)은 한 번도 돌지 않았다.**
- 무엇이: `tests/integration/session-start.test.ts`:327-330 이 `lessonRow(1, "reinforce", 1)` 을 찾는다. 시험용 시드의 수업 번호는 배정 · 다지기를 이어 1부터 센다(`tests/fixtures/seed/builders.ts` — `lessonNo: i + 1`, 작은 틀은 배정 2 · 다지기 1 이라 다지기는 3번). 그래서 `수업 행 없음` 으로 던진다(CI 로그 :122:19 · :329:8).
- 왜: 이 시험 앞 절반(다시 열면 활동 2 · 남의 세션은 없음)은 지나지만 시험 전체는 빨강이다. '미리보기에서 보인 단어는 같은 영역의 다음 세션에서 만난 단어'는 통합으로 증명된 적이 없다. e2e AC-2f 가 화면 쪽 '더해 보인다'는 본다.
- 어떻게: e2e AC-2f 처럼 그 단원의 다지기 칸을 DB 에서 읽어 번호를 쓴다(`kind === "reinforce"` 첫 칸의 `lessonNo`). I-1 을 고친 뒤 이 시험이 실제로 초록인지 CI 로그로 확인한다.

### Minor

**M-1. 세션 시작이 트랜잭션(트랙 행 잠금) 안에서 목록 입력을 바깥 연결로 읽어, 연결 풀(3)이 차면 서로 기다린다.**
- 무엇이: `startUnsafe` 는 `tx` 로 트랙 행을 FOR UPDATE 한 뒤 `readLessonList({ db, … })` 를 바깥 `db` 로 부른다(`src/server/session/index.ts`:213-229, 다르게 한 것 1). 연결 풀은 `POOL_MAX = 3`(`src/server/db/index.ts`:12)이다.
  - 같은 영역 시작 셋이 한 서버 인스턴스에서 겹친다고 하자(두 기기 + 두 번 누름).
  - 둘째 · 셋째는 잠금을 기다리며 연결 둘을 쥔다.
  - 첫째는 바깥 읽기에 쓸 넷째 연결을 못 받아 멈춘다.
  - 함수 시간 상한까지 세 요청이 모두 멈춘다.
  - 두 번 누름 막기는 상태 값(`busy`, `use-lesson-start.ts`:20-29)이라 같은 그리기 안의 두 누름이 둘 다 지난다.
- 왜: 드물지만 생기면 아이 화면이 오래 멈추고 DB 에 '트랜잭션 안 쉼' 연결이 잠금을 쥔 채 남는다.
- 어떻게: 동결이 풀렸으니 `readLessonList` · `closeStaleSessions` 가 `Db | Tx` 를 받게 하고 `tx` 를 넘긴다. READ COMMITTED 라 문장마다 커밋된 값을 읽어 지금과 같은 판정이다. 훅에는 `useRef` 막음을 더한다(`if (inFlight.current) return`).

**M-2. 시도 대기열은 서버가 묶음 전체를 거부하면 영영 비지 않는다(P11 에서 닿음).**
- 무엇이: 서버는 묶음이 `ATTEMPTS_PER_BATCH_MAX`(50)를 넘거나 한 줄이라도 꼴이 틀리면(`INPUT_JSON_MAX` 4000 등) 묶음 전체를 invalid 로 돌려준다(`session/index.ts` AttemptBatchSchema). 화면의 보내기는 ok 가 아니면 던지고(`session-frame.tsx`:206-210), 대기열은 남은 것 전부를 다시 보낸다(`attempt-queue.ts` sendOnce).
- 왜: P10 은 첫 활동 시도(보인 단어) 하나뿐이라 닿지 않는다. 그러나 P11 은 활동마다 시도를 쌓는다. 오래 끊긴 기기 · 큰 답 글 하나가 그 기기의 대기열을 막고, 뒤 시도도 영영 보내지 못한다.
- 어떻게: 대기열이 `ATTEMPTS_PER_BATCH_MAX` 씩 나눠 보낸다(상수를 공용으로). 서버는 꼴이 틀린 시도를 '받음(버림)'으로 돌려주거나 줄마다 판정한다. P11 브리프 '지킬 것'에 넣어도 된다.

**M-3. 운영에서 동음이의어 목록 파일이 빠지면 따라 말하기 채점이 조용히 엄해진다.**
- 무엇이: `seedHomophones()` 는 목록 파일이 없으면 빈 묶음을 돌려주고 아무것도 남기지 않는다(`placement/index.ts`:214-225, 다르게 한 것 7). 개발용 · e2e 길에서는 맞는 선택이다.
- 왜: 운영 빌드에서 파일 추적이 빠지면(장부 P9 '빌드 추적 /* 첫 프리뷰 확인') 'two/too' 같은 말이 틀림이 되어 말하기 시작 단계가 낮아진다. 그런데 로그 한 줄 없이 지나간다.
- 어떻게: 운영(`VERCEL_ENV === "production"` 또는 `NODE_ENV === "production"`)에서는 없음을 오류로 던지거나, 적어도 `console.error("동음이의어 목록 없음")` 한 줄(이름만)을 남긴다.

**M-4. 확인 쪽지 초점 가두기가 쪽지 안 키 처리라, 덮개를 눌러 초점이 빠지면 Tab 이 뒤 화면으로 간다.**
- 무엇이: `ConfirmSheet` 의 Tab 맴돌기는 대화 상자 `onKeyDown` 에만 걸린다(`src/components/board/board.tsx`:376-400). 덮개(비초점 요소)를 누르면 초점이 body 로 가고, 그 뒤 Tab 은 뒤 화면 '홈' 링크 등으로 간다.
- 왜: fix3-design N-5 의 목적(쪽지 밖으로 초점이 새지 않음)이 한 길에서 빈다. 터치 위주라 영향은 작다.
- 어떻게: 덮개 `onMouseDown` 에서 `preventDefault()`(초점이 안 빠짐). 또는 쪽지가 열린 동안 뒤 화면 감싸개에 `inert` 를 둔다(훅 없이 속성 하나). 화면 판정은 des-p10 을 따른다.

## 4. 다르게 한 것 판정

| 절 | # | 무엇 | 판정 |
|---|---|---|---|
| 차례 5 | 1 | 화면 자료에서 정답 칸 뺌(`display.ts`) · 누르는 보기 · 타일을 직접 그림 | 받아들임 — 평가 중 정답이 쪽에 실리지 않는다 |
| | 2 | 결과 행을 순수 함수 `finish.ts` 로 · `unitEntryOf` 를 첫 실행과 함께 | 받아들임(값 12 '값 8 과 같은 함수') |
| | 3 | placement_level = 판정한 시작 단계 | 받아들임. 1-나 부모 화면의 '배치 평가로 정했어요'가 보일 단계와 같은 수다 |
| | 4 | 실패 3회 시도는 영역 문항 상한에도 안 셈 | 받아들임. 한 번 생기면 남은 따라 말하기 자리가 듣고 고르기라 더 생기지 않아 최대 한 문항 더다 |
| | 5 | 결과 알림 직접 넣기 · 마이크 알림은 `createAlertOnce`(학습일 종류마다 한 번) | 받아들임(영역 배치는 한 번만 끝남) |
| | 6 | 첫 마이크 안내는 이 기기에서 처음일 때만 | 받아들임 — 4절 '처음 마이크 안내는 기기마다 한 번' |
| | 7 | 동음이의어 목록 없으면 빈 묶음 | 개발 · e2e 는 받음. 운영 경고는 M-3 |
| | 8 | '여섯 번 이어진 실패'는 배치에 안 넣음 · stalled 는 넣음 | 받아들임(한 문항 3회 실패면 예비로 넘어가 여섯에 닿지 않음) |
| | 9 | 닿지 않은 답은 같은 시도 id 로 다시 · 대기열 안 씀 | 받아들임(배치는 답마다 서버가 다음 문항을 정함) |
| | 10 | 쓴 답에서 문장 부호 앞 빈칸을 지움 | 받아들임 — C73 '그 밖 문장 부호 꼴은 정규화'의 범위, 단위 시험 있음(변이 C2) |
| 차례 6 | 1 | 재판정 입력을 `readLessonList` 로 모음 · 트랙 FOR UPDATE · 목록 읽기는 바깥 연결 | 같은 함수는 받아들임(위험 3). 바깥 연결은 M-1 |
| | 2 | 판 고르기 | 받아들임(R5 · 3.2 다시 하기) |
| | 3 | 남의 · 끝난 세션 시도를 받음으로 돌려줌(넣지 않음) | 받아들임(위험 10 · 값 6 '버린다') |
| | 4 | 세션 화면 자료에 정답 칸 실림 | 받아들임(평가가 아니고 P11 '틀리면 정답을 보여 주고 다시') |
| | 5 | 배치는 시도 대기열 안 씀 | 받아들임(차례 5 의 9 와 같음) |
| | 6 | 세션 e2e 새 파일 | 받아들임 |
| 차례 6 나머지 | — | AC-2f e2e 를 '배정 1 · 2 를 건너뛴 다지기'로 | 받아들임. 시험용 시드에서 배정 2 의 단원 단어에 배정 1 의 새 단어가 없다. 단위 둘이 plan 글자 그대로다. P8 실시드 뒤 plan 의 배정 2 꼴로 한 번 더(장부) |
| fix 4 | N-5 | `showModal()` 대신 키 처리 | 받아들임(board.tsx 훅 없음). 남은 빈틈 M-4 |

## 5. fix 4 재검토(ADDRESSED)

| 지적 | 판정 | 근거 |
|---|---|---|
| 로마자 관용 표(C74 잠정) | **ADDRESSED** | `src/core/profile/romanize-spellings.ts` 132 음절 · `romanize.ts`:150-161 이 표를 먼저 쓰고 없으면 고시, ㄹㄹ 은 표 철자에도 l. 단위 'AC-1c 로마자: 음절별 관용 철자 표 …'가 있다. 변이 N1(표 안 씀)이 잡힌다. 기존 고시 보기(Boknam · Bitna)도 초록. C74 되읽기는 요청자 · 컨트롤러 몫 |
| fix2-design N-4 단계 단추 열 14rem | 코드 반영 | 화면 판정은 des-p10 |
| fix2-code N-1 이름 칸 복원 | **ADDRESSED** | `tests/e2e/first-run.spec.ts`:218-220. CI e2e 통과 |
| fix2-code N-2 `speechPage` 도우미 | **ADDRESSED** | `tests/e2e/fixtures.ts`:58-68. home · placement 가 쓴다 |
| fix3-design N-5 쪽지 초점 가두기 | **ADDRESSED**(빈틈 M-4) | `board.tsx`:376-400 Tab · Shift+Tab · Esc · 첫 단추 autoFocus |
| fix3-design N-6 '잠긴 단원' 숨은 글 | **ADDRESSED** | `lesson-board.tsx`:53-54 |
| fix3-code N-1 앞 회차 끝낸 수업 retry | **ADDRESSED** | `tests/unit/lesson-list-state.test.ts`:478 |
| fix3-code N-2 맨 위 포스트잇 이름 | **ADDRESSED** | `topCard` 가 `label` 을 넘기지 않는다(`lesson-board.tsx` topCard). e2e 이름 단언이 CI 통과 |

## 6. 장부 판정(`ledger-open.md`)

| 행 | 판정 | 근거 |
|---|---|---|
| :26 P5b e2e:local 7 | **닫힘** | CI run 39051573610 e2e-local 작업 success(Playwright 라 I-1 과 무관) |
| :31 · :41 시작 개정 · lesson_id 끝까지 | P10 몫 **닫힘** · 행은 P11 · P12 몫으로 열림 | 배치 시작 개정(`placement/index.ts`:501) · 세션 판(`session/index.ts`:262-298) · 진행 세션은 lesson_id 행(`loadSessionView`) |
| :46 차례 4 · 5 | 차례 5 몫(PLACEMENT_OPEN · AC-2a href · 눌러 들어가기)과 차례 6 몫(AC-2b 세션 열림) **닫힘** | CI e2e 통과 · 구현 보고. 배치 전 카드 누름 표시(H-M6)는 des-p10 |
| :49 가짜 음성 도우미 | **닫힘** | fix 4 N-2 |
| :50 순수 함수 다르게 한 것 | **닫힘**(review-p10-fix3-code 에서 판정됨) | — |
| :52 PLACEMENT_OPEN · SESSION_START_OPEN · 지난 수업 고르기 · SmallLink | **닫힘** | 상수 둘 제거 · `past-lessons.tsx` · SmallLink(fix 3) |
| :53 로마자 | 코드 몫 **닫힘** · C74 되읽기만 남음 | 5절 |
| :43 · :44 · :9 · :19 · :36 · :47 | 아직 열림 | 이번 몫 밖 |
| 새 행 권함 | (1) I-1 통합 종료 코드 · 지난 CI 결과 다시 보기 (2) AC-2f e2e 를 P8 실시드 뒤 plan 의 '배정 1 을 건너뛴 배정 2'로 (3) M-2 대기열 나눠 보내기 · 꼴 틀린 시도 버리기를 P11 '지킬 것'에 | — |

## 7. 관찰

1. **시도 시각.** `saveSessionAttempts` 는 시도 시각을 서버가 받은 때(`now()`)로 적는다. 끊겼다 보낸 시도는 아이가 답한 때와 다르다. P11 이 학습일 · 최근 성적에 시도 시각을 쓰면 화면이 만든 시각을 함께 보낼지 정해야 한다.
2. **단위 흔들림.** 복사본 단위 다섯 번 가운데 한 번 '1 failed | 359 passed' 였다. 무거운 명령(biome · tsc)과 함께 돌린 첫 판이었고, 이름을 잡기 전에 다시 넷 모두 360 통과였다. 부하 때 시간 초과로 본다(추측). CI 단위는 360 통과다.
3. **C73 문장 답.** 문장 답 비교가 문장 안 대소문자까지 가린다. C73 글자보다 엄하지만 쓰기 1~3 의 문장 답 꼴(짧은 문장 · 이름)에서는 맞는 쪽으로 본다. P8 시드가 허용 정답을 넉넉히 둔다.
