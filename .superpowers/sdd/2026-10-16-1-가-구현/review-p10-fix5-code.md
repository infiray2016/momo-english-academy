# 재검토 보고: P10 fix 5(review-p10-5-6-code I-1 · I-2 · M-1 · M-3 · M-4 + 요청자 프리뷰 결함 넷 + 마이크 안내 문구) — rev-p10, 2026-10-18 04:3x

**라운드 판정: Approved** — 지적 다섯 모두 ADDRESSED, 요청자 결함 넷과 안내 문구도 맞음, 새로 깨뜨린 것 없음. 새 Minor 하나(다시 확인 단추가 실제 확인 없이 연다)는 컨트롤러가 정하면 된다. 차례 5 · 6 코드 지적의 fix 라운드 1회째(M-2 는 P11 몫으로 장부).

증거:
- 커밋 df7f6cd. CI 가지 c606f5c 와 트리가 같다(`c250a46…` 둘 다).
- CI run 39060827940(시도 1번)은 10 작업 모두 success 다. 통합 작업 로그는 지킴 단계(`set -o pipefail` · `! grep -qE "(Test Files|Tests) +[0-9]+ failed" int.log`)가 돌았고 'Test Files 13 passed (13)' · 'Tests 108 passed | 1 skipped (109)' 이며 'failed' 줄이 없다. API 로 받은 작업 로그를 직접 읽었다.
- 복사본 `scratchpad/rev-p10-fix5/copy`(비밀 파일 · `.dev` 뺌, node_modules 링크)에서 DB 없이 돌렸다.

  | 명령 | 결과 |
  |---|---|
  | 단위 | 366 통과 |
  | `biome ci` | 고칠 것 없음 |
  | `check:deps` | 위반 0 |
  | tsc | `.next` 생성 타입 밖 오류 0 |
  | fix 5 순수 몫 변이 넷 | 모두 잡힘 |
- 통합 · e2e 는 돌리지 않았다. 54331 · 3001 · 프리뷰 DB 는 건드리지 않았다.

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 CI 통합이 실패를 가림 | **ADDRESSED** | 아래 |
| I-2 가려진 '세션 틀: 다시 열면 …' | **ADDRESSED** | `tests/integration/session-start.test.ts` 가 `firstReinforce(unit)` 로 다지기 칸 번호를 DB 에서 읽는다. CI 8차 통합 108 통과 안에 든다(실패 줄 없음) |
| M-1 잠금 안 바깥 연결 읽기 | **ADDRESSED** | 아래 |
| M-3 운영에서 목록 없음이 조용함 | **ADDRESSED** | `seedHomophones()` 가 목록 파일이 없으면 처음 한 번 `console.warn`(파일 이름만) 뒤 빈 묶음이다(`src/server/placement/index.ts`:218-235). 운영에서 던질지 · 적재 검사로 막을지는 컨트롤러 몫으로 남음(보고에 적힘) |
| M-4 덮개 클릭으로 초점이 샘 | **ADDRESSED** | `ConfirmSheet` 의 덮개 전체가 `role="dialog"` · `tabIndex={-1}` 이다(`src/components/board/board.tsx`:375-408). 덮개를 누르면 초점이 쪽지 자체로 가고, 거기서 Tab · Shift+Tab 은 첫 · 끝 단추로 간다. e2e 단언은 CI 통과 |
| M-2 대기열 묶음 거부 | 범위 밖(P11) | 손대지 않음 — 장부 |

**I-1 확인.**
- `scripts/pg-local.ts`:70-101 `importEmbeddedPostgres()` 는 embedded-postgres 를 동적으로 읽는다. 읽기 전에 처리기 목록을 찍어 두고, 읽는 동안 새로 걸린 처리기만 뗀다. 떼는 사건은 `beforeExit` · `message` · SIGHUP · SIGINT · SIGTERM · SIGBREAK 다.
  - **안전성**: 앞서 있던 처리기(vitest · dev-db 자기 처리기)는 남는다. 단위 '… 앞서 있던 처리기는 남긴다'가 이를 단언하고, 변이 E2(다 뗌)가 그 시험을 깨뜨린다.
  - **'exit' 남김**: `exit` 에서 async-exit-hook 은 `exit(false, …)` 로 훅만 돌리고 `process.exit` 를 부르지 않는다. 그래서 종료 코드를 덮지 않는다. 그때 자식 Postgres 에 SIGINT 를 보내는 정리는 그대로다.
  - **다른 라이브러리**: async-exit-hook 의 `uncaughtException` · `unhandledRejection` 처리기는 embedded-postgres 가 걸지 않는다(`AsyncExitHook(fn)` 만 부름).
- 쓰는 곳은 `tests/integration/global-setup.ts`(정적 가져오기를 `import type` 으로 바꿈)와 `scripts/dev-db.ts`(예전 신호 처리기 떼기 코드를 이것으로 바꿈) 둘이다. embedded-postgres 를 값으로 읽는 곳은 이제 이 도우미 하나뿐이다(전체 훑기). dev-db 의 자기 신호 처리기는 `startCluster` 앞에서 걸리므로 '앞서 있던 것'으로 남는다. 겹치지 않는다.
- **지킴 grep**: `NO_COLOR=1` 이라 vitest 요약 줄은 ' Test Files  1 failed | …' · '      Tests  1 failed | …' 꼴이다. 정규식 `(Test Files|Tests) +[0-9]+ failed` 는 이 두 줄만 맞는다.
  - 파일별 줄(`… (9 tests | 1 failed)`)은 소문자 'tests' 에 '|' 가 끼어 맞지 않는다.
  - 시험 이름은 한국어라 거짓 양성이 될 꼴이 없다.
  - vitest 출력 꼴이 바뀌면 지킴은 조용히 지나간다. 다만 진짜 고침(도우미)이 앞에 있어 두 겹이다.
- 변이 E1(`beforeExit` 를 떼는 목록에서 뺌)이 단위 '실제 embedded-postgres 를 읽은 뒤에도 beforeExit 처리기가 늘지 않는다'를 깨뜨린다.

**M-1 확인.**
- `src/server/db/index.ts`:33-35 `Tx` · `DbOrTx`(server-only 파일 안)다. 읽기 옵션(`readLessonList` · `closeStaleSessions` · seed read · settings · profile)이 `DbOrTx` 를 받는다.
- `startUnsafe` 는 목록 입력 · 수업 칸을 `tx` 로 읽는다(`src/server/session/index.ts`). 그래서 잠금을 쥔 채 둘째 연결을 받지 않는다.
- 잠금 차례는 트랙 행(FOR UPDATE) → 오래 멈춘 진행 세션 행(UPDATE) → 이전 세션 중단 → 새 행이다. 첫 활동 '홈'(세션 행 하나 FOR UPDATE · 지움)과 배치 답(평가 행 FOR UPDATE, 배치 세션은 닫기 대상 밖)은 트랙 행을 잡지 않아 고리가 없다.
- `use-lesson-start.ts` 의 `useRef` 막음이 같은 그리기 안 두 번 누름을 막는다.

## 2. 요청자 결함 넷 · 안내 문구

| 무엇 | 판정 | 근거 |
|---|---|---|
| 마이크 확인 거짓 양성 | 맞음 | `src/lib/speech/browser.ts` checkMicrophone 이 audiostart 대신 `soundstart` · `speechstart` · 첫 결과로 성공한다. 받기만 시작하고 끝나면 `MIC_CHECK_ENDED_CODE` 로 다시 듣기 갈래 실패다. 그러면 첫 실행은 실패 문구 · 알림 하나이고 기기에 '쓸 수 없음'을 남기지 않는다(정할 것 터 · 7절). 시간 상한은 `settings.maxListenMs + settings.watchdogExtraMs` = speech.max_listen_seconds + speech.watchdog_extra_seconds(12절 키)다. 변이 S1(audiostart 로 성공)과 S2(소리 들어옴을 성공으로 안 봄)가 둘 다 `tests/unit/mic-check.test.ts` 를 깨뜨린다. e2e 대본 `audio-no-sound` 는 CI 통과 |
| 닫힌 말하기 카드 '다시 확인' 단추 | 맞음(새 Minor N-1) | `home-cards.tsx` 가 `clearMicState()` 뒤 `micUsable()` 로 다시 판정한다. 브라우저 저장 상태만 건드리고 서버를 부르지 않는다(7절 '기기 상태는 그 브라우저에만'). 단추는 말하기 카드 아래 하나이고 회화 카드는 같은 판정으로 함께 열린다 |
| '내 단계 찾기' 안내 | 맞음 | `data-find-level-hint` · 문구가 plan-p10b 표와 글자 같다 |
| `/talk` 부모용 글 | 맞음 | `data-parent-info` 안 '회화 수업은 다음 차수에 들어와요'(plan-p10b 표) |
| 마이크 확인 안내 '단추를 누른 뒤 아무 말이나 한마디 해 주세요' | 맞음 | plan-p10a 표와 글자 같다. `data-mic-speak-hint` 가 `first-run-flow.tsx` · `placement-flow.tsx` 두 화면에 있다 |
| 첫 실행 `data-hydrated` · `fillPin` 대기 | 맞음 | CI 8차 e2e 전부 통과 |

## 3. 새 지적

**N-1(Minor). '다시 확인' 단추가 실제 마이크 확인 없이 카드를 연다.**
- 무엇이: 단추는 저장 상태를 지우고 판정만 다시 한다. 인식 API 가 있는 기기에서 권한이 여전히 막혀 있어도 말하기 · 회화 카드가 열린다. 단추는 아이 홈에 있어 아이도 누를 수 있다.
- 왜: AC-5c 의 부모 화면 '마이크 다시 확인'은 '눌러 **성공하면** 두 카드가 열린다'다(1-나). 1-가 임시 단추는 성공 확인이 없다. 아이가 들어가면 따라 말하기에서 다시 실패해 닫히고 알림이 하나 더 생길 뿐이라 해는 작다.
- 어떻게: 누름 처리 안에서 `createBrowserSpeech` 의 `unlockFromGesture()` → `checkMicrophone()` 를 부르고, 성공일 때만 `clearMicState()` 를 부른다. 실패면 지금 꼴 그대로 둔다. 1-가 임시라 지금 꼴로 두려면 장부 :60 에 '1-나 부모 화면이 대신할 때 확인 성공 조건' 한 줄이면 된다.

## 4. 관찰

- **다른 영역 세션 행 잠금.** `closeStaleSessions` 는 프로필 전체를 닫는다. 그래서 세션 시작 tx 가 다른 영역의 오래 멈춘 세션 행도 잠근다. 다른 영역 시작 둘이 같은 때 그런 행을 서로 다른 차례로 잠그면 이론상 교착이 될 수 있다. Postgres 가 하나를 40P01 로 끊고, 화면은 '지금은 저장할 수 없어요' 뒤 다시 누르면 된다. 오래 멈춘 세션이 드물어 지적으로 올리지 않는다.
- **지킴 grep 의 한계.** vitest 출력 꼴에 기댄다. vitest 를 올릴 때 요약 줄 꼴이 바뀌면 지킴만 조용히 무력해진다. 그래도 도우미가 앞에서 막는다. vitest 판을 올릴 때 지킴 정규식도 한 번 본다.

## 5. 장부 판정(`ledger-open.md`)

| 행 | 판정 | 근거 |
|---|---|---|
| :61 CI 통합이 실패를 가림 | **닫힘**(P10 몫) | 도우미 · 지킴 · CI 7 · 8차 실제 통과. 지난 CI 다시 보기도 행에 적혀 있다(1차 통과 · 2~4차 I-2 하나). 다른 가지는 CI 가 돈 적이 없어 합칠 때 처음 도는 CI 가 근거다 |
| :60 마이크 확인 거짓 양성 | **닫힘** — (가) 소리 조건 · (나) 되돌리기 단추 · (다) 닫힌 카드 안내 | N-1 은 1-나 부모 화면 때 볼 한 줄로 덧붙이기를 권함 |
| :53 수업 목록 해석 | 그대로(P12 몫만 남음) | fix 5 는 이 행을 건드리지 않음 |
| 새 행 권함 | M-2(대기열 묶음 나눠 보내기 · 꼴 틀린 시도 버리기)를 P11 '지킬 것'에 — 아직 장부에 없으면 | review-p10-5-6-code M-2 |
