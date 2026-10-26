# 코드 검토 보고: P10 차례 2(보드 · 첫 실행 · 마이크 상태) + 차례 1 Minor 정리 — 검토 묶음 A1 코드 몫(rev-p10, 2026-10-17 22:5x)

**판정: Changes requested** — Critical 0 · Important 1 · Minor 3. 차례 1 Minor 다섯은 모두 ADDRESSED.

범위와 기준:
- 브리프 `task-p10-review-2-code.md` 의 차례 2 파일과 Minor 정리 파일을 봤다. 화면 · 문구는 des-p10 몫이라 코드 쪽만 적었다.
- 기준은 plan-p10a(값 4~8 · 정할 것 커 · 터 · 퍼 · 처) · `task-p10-2.md` · `task-p10-minor-1.md` · 13절 C61 (2) · C72 · 정본 4절 첫 실행 행 · 5절이다.
- 판: 22:3x 판을 봤다. 22:45 에 구현자가 화면 검토 반영(묶음 대표 낱말 · `readFirstRunView` 그림 찾기 · 보드 고르기 단추 · 상태 줄 · 시험 둘)을 시작했다. I-1 · M-1 · M-2 가 가리키는 줄은 지금 판에서도 그대로임을 다시 확인했다.

재현(워크트리 파일은 고치지 않음, 포트 54417~54419, 3001 · e2e:local 은 건드리지 않음):
- 스크래치패드 복사본(비밀 파일 · `.dev` 를 빼고 node_modules 는 링크)에서 했다.
- 단위 변이 표본 일곱: 규칙을 하나씩 망가뜨리고 `tests/unit/first-run.test.ts` 를 돌림 → 여섯은 깨지고 하나는 살아남음(M-1).
- 통합 재현 하나: 첫 실행 저장 중 DB 오류가 나면 던진 오류 글에 무엇이 실리는가 → I-1.
- dev-db 재현 둘: 시작 중 신호 여섯 · 켜 둔 채 다른 포트 `--reset` → 차례 1 M-1 · M-2 확인.
- 남긴 것: 프로세스 · 듣는 포트 · OS 임시 폴더 0. 복사본 폴더(`scratchpad/rev-p10-2/copy`)는 지우기가 권한에서 막혀 남아 있다. 안에는 시험 때 만든 비밀번호와 로컬 주소뿐이고 실제 비밀값은 없다.

## 1. 설계 준수

| 항목 | 판정 | 근거 |
|---|---|---|
| 여덟 화면 차례 · 한 화면 하나 · '다음'은 값이 맞을 때만 · 상태는 화면 메모리 · 마지막 한 번 저장(정할 것 커) | ✅ | `src/app/(setup)/first-run/first-run-flow.tsx`:91-100 · 313-633. e2e 차례 시험이 여덟 차례와 h1 하나를 단언 |
| PIN 6자리 · 두 번 같게 · argon2id · parent_auth pin 한 행 | ✅ | `src/server/profile/index.ts`:123 · 147-152. `@node-rs/argon2` 2.2.2 기본값은 Argon2id · 19 MiB · t 2 · p 1(`index.d.ts`:15-58). 통합 AC-1a 가 `$argon2id$` 머리와 `verify` 를 단언 |
| 트랜잭션 안 '프로필 있음' → already_done · 동시 저장은 PIN 부분 유일 색인(23505) → already_done | ✅ | `index.ts`:127-132 · 91-98 · 165-166 · `src/db/schema/operations.ts`:97-99. 통합 '두 기기가 함께'는 풀 3(`src/server/db/index.ts`:12)이라 실제로 겹칠 수 있다 |
| profiles · 별명은 영어 이름이 vocab 낱말일 때만 | ✅ | `index.ts`:116-121 · `src/core/profile/start.ts` `householdRowsOf` |
| profile_tracks 넷(배치 대기는 level · unit 비움 · `chosenStartLevel`) | ✅ | `start.ts` `householdRowsOf` 트랙 줄 |
| settings `profile.start_level.<영역>` 은 고른 영역만(C61 (2)) | ✅ | 단위 '집 행' · 통합 '행 전부'. 판은 행마다 +1 이고 `tests/integration/test-db.ts`:78 과 같은 꼴 |
| unit_progress: 시작 개정 = `currentSeedRevision()` · 설정 판 · 단원 복사본 20키 | ✅ | `index.ts`:124 · `start.ts` `unitSnapshotOf`(없는 키는 던짐) |
| progress_events target `{ area, source }` · parent_adjustment/auto_judgement | ✅ | 단위 · 통합 단언 |
| parent_alerts `mic_unavailable { browser, code }` · `seed_range_end_near`(기준 키 `seed.range_end_alert_margin:<영역>`) | ✅ | `createAlertOnce` 와 같은 열 · 같은 키 꼴(`src/server/ai/store.ts`:175-218). 뒤의 `once: "key"` 호출은 kind · profileId · thresholdKey 로 찾으므로 이 행을 중복으로 본다 |
| 회화 = min(말하기, talk.placement_cap) · 부모가 고르면 상한 없음 | ✅ | `start.ts` `trackStartsOf`. 단위 AC-11b · AC-1c · 통합 둘 |
| 알파벳 모름 → 읽기 · 쓰기 1단계 단원 0 · 그 칸은 고를 수 없음 | ✅(시험 빈틈 M-1) | `start.ts`:210 · `checkFirstRunInput` · 화면 `locked` |
| 시작 단계 1~through · 예시 줄 can-do 해요체(C72) | ✅ | `index.ts` `readFirstRunView` · `start.ts` `canDoExample` |
| 구조 상수와 설정값이 섞이지 않음 | ✅ | PIN · 이름 상한 · 묶음 · 아바타는 `start.ts` 맨 위 상수다. through · cap · margin · target_minutes · 음성 키는 설정에서 읽는다. 상한 곱셈 하나는 M-2 |
| 액션 첫 문장 `await requireAccess()` | ✅ | `src/server/actions/first-run.ts`:19 · 29. AC-N5 훑기 시험(`tests/unit/access-gate.test.ts`:304)이 `src` 의 모든 'use server' 를 덮는다 |
| 한 시계 | ✅ | 서버는 `now` 주입(`index.ts`:106 · 125). `new Date()` 는 이 브라우저 기록인 `mic-state.ts` 하나뿐이고 서버 판정에 안 쓴다 |
| **아이 이름 · 비밀값이 로그 · 오류에 안 남음** | ❌ **I-1** | 아래 |
| 마이크(정할 것 터): 끊김은 알림 없이 다시 · 그 밖 실패는 알림 하나 · mic-unavailable 이면 기기 상태 저장 | ✅ | `first-run-flow.tsx` `checkMic`. 성공이면 `clearMicState` 를 부른다(plan 에 없지만 맞는 쪽). e2e 가 알림 하나와 `momo.mic.v1` 을 단언 |
| 녹음 없음 · P2 접점 재사용 | ✅ | `getUserMedia` · `MediaRecorder` 없음(새 파일 전부 훑음). `createBrowserSpeech` · `checkMicrophone` · `describeDevice` 를 쓴다 |
| 보드 토큰: AREA_TONE · PAPER → 토큰, 값 같음 | ✅ · ⚠️ | `src/app/globals.css` `@theme` 의 hex 가 P5b 값과 같다(#ffe566 · #9fd8ff · #ffb3c7 · #c9f2b2 · #fffdf7). e2e:local 7 은 구현자 보고(차례 2 끝)뿐이고 이번에는 지시대로 돌리지 않았다 |
| 글꼴 next/font/google 셋 · 빌드 때 내려받기(위험 5) | ✅ · ⚠️ | `src/app/layout.tsx`. 빌드 성공은 구현자 · 컨트롤러 보고다. CI 는 H15 뒤 확인 |
| 시험 이름: plan 증명 표 글자 그대로 · AC 접두 | ✅ | e2e AC-1a 하나 · AC-1c 여섯, 통합 AC-1a · AC-1c · AC-11b, 단위 AC-1c 로마자 |
| 단위 시험이 규칙을 증명 | ✅(6/7) | 변이 표본 표(3절 M-1) |
| 통합: 트랜잭션 · 유일 제약 · 둘째 기기 | ✅ | 위 행 |
| e2e: 쿠키 도우미 · 임시 DB · 파일마다 `resetHousehold` | ✅ | `tests/e2e/first-run.spec.ts`:46-48 · `tests/e2e/household.ts`(서버와 같은 `householdRowsOf`) |
| 경계 · check-bundle | ✅ | 화면은 서버 액션과 `import type` 만 가져온다. deps 0 · bundle 0 은 컨트롤러 재확인 |
| 공용 변경 표시 | ✅ | 보고의 5 · 6 · 7 · 8 표. 9 는 '하지 않음'으로 표시함 |

## 2. 잘한 점

- **행 만들기를 순수 함수 하나(`householdRowsOf`)로 모았다.** 서버 저장과 e2e `insertHousehold` 가 같은 행을 만들어 둘이 어긋날 수 없다. 단위 시험은 그 함수가 읽는 설정 키가 서버가 한 번에 읽는 목록에 모두 있음을 Proxy 로 증명한다(`tests/unit/first-run.test.ts`:442-457).
- **동시 첫 실행을 두 겹으로 막았다.** 트랜잭션 안 확인이 순차 둘째를 막고, PIN 부분 유일 색인의 23505 가 겹친 둘째를 막는다. 통합 시험이 프로필 · PIN 하나와 트랙 넷을 센다.
- **조용한 기본값이 없다.** 복사본 · 행 만들기는 없는 설정 키에 던지고, 시험이 그 던짐까지 본다(`first-run.test.ts`:200-203).
- **로마자는 고시를 그대로 옮겼다.** 대표음 끝소리 · ㄹㄹ → ll · 성 빼기가 맞고, 시험은 고시의 보기(한복남 · 홍빛나)와 앱 안 이름만 쓴다.
- **차례 1 Minor 다섯이 지적 글 그대로 반영됐다.** 재현으로 M-1 · M-2 를 다시 봤다(4절).

## 3. 지적

### Critical
없음.

### Important

**I-1. 첫 실행 저장 · 이름 확인 중 DB 오류가 나면 아이 이름이나 PIN 해시가 오류 글에 실려 서버 로그로 간다.**
- 무엇이:
  - `saveFirstRun` 의 catch(`src/server/profile/index.ts`:165-167)는 유일 위반이 아닌 오류를 그대로 다시 던진다.
  - drizzle-orm 0.45.4 의 `DrizzleQueryError` 는 글에 매개변수를 싣는다(`node_modules/drizzle-orm/errors.js`:10-19). 꼴은 `Failed query: <sql>\nparams: <params>` 다.
  - `completeFirstRun`(`src/server/actions/first-run.ts`:26-31)은 그 오류를 Next 로 올린다.
  - 같은 길이 `checkEnglishName` → `isVocabName`(`index.ts`:62-66, 매개변수 = 영어 이름 조각)에도 있다.
- 재현(복사본 통합 시험): 시험 DB 에 BEFORE INSERT 트리거로 예외를 내게 하고 `saveFirstRun` 이 던진 글을 봤다.

  | 실패시킨 넣기 | 한글 이름 | 영어 이름 | argon2 PIN 해시 |
  |---|---|---|---|
  | profiles | 실림 | 실림 | — |
  | parent_auth | — | — | 실림 |
- 왜:
  - 코드 주석이 'PIN · 이름을 로그에 내지 않는다'고 약속한다(`first-run.ts`:3 · `index.ts`:5). 브리프 '지킬 것'에도 '아이 이름 · 비밀값 로그 금지'가 있다. 둘 다 오류 길에서 지켜지지 않는다.
  - Next 는 서버 액션 오류를 클라이언트에는 digest 만 주고 서버가 잡아 로그와 맞춘다(설치판 `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`:111-115 · `instrumentation.md`:38-41 · 123). 실제 로그 줄은 실기로 보지 않았다.
  - PIN 은 6자리라 10^6 가지다. 해시가 새면 오프라인으로 풀 수 있다.
  - 디버깅 때 로그를 대화에 붙이면 CLAUDE.md '아이 이름은 대화에 적지 않는다'도 깨진다.
  - 일어나는 때는 DB 오류(풀러 끊김 · 제약 위반)뿐이다. 로그를 읽는 사람은 계정 주인뿐이다. 그래서 Critical 이 아니라 Important 로 둔다.
- 어떻게:
  1. `src/server/db` 에 `safeDbError(error)`(제안)를 둔다. 오류 이름과 Postgres 코드(cause 사슬의 `code`)만 담은 새 Error 이고 `cause` 를 붙이지 않는다.
  2. `saveFirstRun` catch: 유일 위반은 지금처럼 already_done 이다. 그 밖은 `console.error` 로 이름 · 코드만 남기고 `{ ok: false, reason: "unavailable" }` 를 돌려준다. 다른 길은 `safeDbError` 를 던지는 것이다. 화면은 이미 그 밖 reason 을 '지금은 저장할 수 없어요'로 보인다(`first-run-flow.tsx` save).
  3. `checkEnglishName` 도 같은 꼴로 감싼다.
  4. 시험: 통합에 트리거로 profiles · parent_auth 넣기를 실패시키는 사례 둘을 더한다. 결과 · 던진 글에 표시 이름 · 영어 이름 · `$argon2id$` 가 없음을 단언한다(재현 시험과 같은 꼴, 이름은 앱 안 이름).
  5. P11 은 아이 답 글을 attempts 에 넣는다. 같은 도우미를 쓰도록 장부에 한 줄 둔다(6절).

### Minor

**M-1. '알파벳 모름이 고른 단계보다 앞선다'를 증명하는 시험이 없다.**
- 무엇이: 변이 표본 일곱 가운데 이것만 살아남았다. `start.ts`:210 을 `level === undefined && …` 로 바꿔 고른 값이 앞서게 해도 단위 15 가 모두 통과한다.

  | 표본 | 결과 |
  |---|---|
  | 회화 상한 min → max | 2 실패 |
  | ㄹㄹ → ll 없앰 | 1 실패 |
  | 세 글자 성 안 뺌 | 2 실패 |
  | 알파벳 모름보다 고른 값이 앞섬 | **15 통과** |
  | 확인 안 함도 마이크 알림 | 1 실패 |
  | through 넘는 단계 받음 | 1 실패 |
  | 범위 끝 ≥ → > | 2 실패 |
- 왜: 서버 길은 `checkFirstRunInput` 이 그 입력을 막는다. 그러나 `householdRowsOf` 는 e2e `insertHousehold` 가 확인 없이 부른다(`tests/e2e/household.ts`). plan 값 7 은 이 앞섬을 규칙으로 적었다.
- 어떻게: `first-run.test.ts`:132 시험에 사례 하나를 더한다. `chosen: { reading: 3, writing: 2 }` 와 `alphabetUnknown: true` 를 주면 두 영역 모두 `{ level: 1, unit: 0, source: "first_run_alphabet" }` 다.

**M-2. 마이크 알림 칸의 상한을 이름 상한의 곱으로 정했고, 넘으면 첫 실행 저장 전체가 거부된다.**
- 무엇이: `MicResultSchema` 의 `code` · `browser` 상한이 `NAME_MAX_LENGTH * 2` · `* 4` 다(`start.ts`:262-268). 넘으면 `checkFirstRunInput` 이 invalid 를 내고, 부모는 '지금은 저장할 수 없어요'만 본다. 벗어나려면 마이크 확인을 다시 성공시키는 길뿐이다.
- 왜: 이름 칸과 관계없는 수다. 지금의 `describeDevice` 이름(예: 'iPad Safari 26.1')은 넉넉히 들어가 실제로 막힐 일은 드물다.
- 어떻게: 이름 붙인 기술 값 둘(`MIC_CODE_MAX` · `MIC_BROWSER_MAX`, 제안)로 바꾼다. 진단 칸이 저장을 막지 않도록 `.transform((s) => s.slice(0, MAX))` 로 잘라 받는다.

**M-3. 서버 셈을 화면 · 시험 도우미에 한 벌씩 더 두었다.**
- 무엇이:
  - 기기 사실 모으기: `src/lib/mic-state.ts`:71-84 와 `src/lib/speech/browser.ts`:524-533. 다르게 한 것 5 이고 지금은 글자까지 같다.
  - 시작 개정 셈: `tests/e2e/household.ts`:43-58 과 `src/server/seed/read.ts`:25-44. 같은 다섯 테이블이다.
- 왜: 한쪽만 바뀌면 첫 실행과 세션의 기기 판정이 갈린다. e2e 집의 시작 개정도 서버와 갈린다.
- 어떻게:
  - 기기 사실: `browser.ts` 에서 `deviceFacts()`(제안)를 내보내 둘이 쓴다.
  - 시작 개정: 다섯 테이블 목록을 `server-only` 가 아닌 곳(예: `src/db/schema/content.ts` 옆 상수)에 두고 둘이 쓴다.
  - 손이 크면 두 곳 머리 주석에 서로를 가리키는 한 줄만 둔다. 서두를 일은 아니라 장부 행으로도 된다.

## 4. 차례 1 Minor 정리 판정(review-p10-1)

| 지적 | 판정 | 근거 |
|---|---|---|
| M-1 켜 둔 인스턴스의 자료 폴더 지움 | **ADDRESSED** | `scripts/dev-db.ts`:129-136 `postmasterAlive` · 지우기 앞 확인(:386-395). 복사본 재현: A(54418)를 켠 채 `--reset --port 54419` 와 `--port 54419` 둘 다 종료 2 · 같은 한 줄 · `PG_VERSION` 시각 그대로. A 를 끈 뒤 `--reset` 은 `seed=loaded`. 단위 사례 다섯 |
| M-2 시작 중 신호 | **ADDRESSED** | 처리기를 `startCluster` 앞에 건다(:579-589). `shutdown` 은 `STOP_WAIT_MS` 5초 상한이고 finally 에서 임시 폴더를 지운다(:352-365). 재현(묶음 SIGTERM): 0.3 · 0.6 · 0.8 · 0.9초 모두 종료 0 · 0.07초 이내, 1.0 · 1.2초 종료 0 · 5.2초(상한). 여섯 모두 임시 폴더 0 · 포트 닫힘. 개발용 시작 실패에 `--reset` 안내(:434) |
| M-3 예전 `--port` 주소 | **ADDRESSED** | `isLocalDbAddress`(:173-186): 로컬 호스트이고 `/momo_dev` 면 우리 주소. 단위 사례 둘(로컬 54331/momo_dev → 바꿈 · 원격 momo_dev → 다른 주소) |
| M-4 두 벌 | **ADDRESSED** | `scripts/pg-local.ts`(가져오기 없는 순수 조각)를 `dev-db.ts` 와 `tests/integration/global-setup.ts` 가 함께 쓴다. `tests → scripts` 가져오기는 의존 규칙 범위(`check:deps` 는 `src` 만) 밖이라 문제없다. 통합 76 + 1 은 구현자 보고 |
| M-5 적재 수 · 가림 시험 | **ADDRESSED** | `tests/integration/dev-seed.test.ts`: 기대 수를 나무에서 세고 0 이 아님까지 단언한다. 단위 '오류 글은 … 비밀번호는 가린다'는 실제 `describeError` 를 부른다 |

새로 깨뜨린 것: 찾지 못했다.

## 5. 다르게 한 것 판정(구현 보고 '차례 2' 여덟 + 공용 변경 9)

| # | 무엇 | 판정 |
|---|---|---|
| 1 | 구조 상수를 `structure.ts` 가 아니라 `start.ts` 에 | 받아들임. C72 글 고침은 컨트롤러 몫이다. P7b check-ids 는 파일 맨 위 대문자 상수를 이미 뺀다(합친 뒤 `pnpm check:ids` 한 번, 추측) |
| 2 | `insertHousehold` 를 새 파일 `tests/e2e/household.ts` 에 | 타당. 차례 1 파일을 고치지 말라는 지시를 따랐다. 합칠 때 `db.ts` 로 옮길지는 선택 |
| 3 | 범위 끝 알림을 `createAlertOnce` 없이 트랜잭션 안에서 바로 넣음 | 타당. 같은 열 · 같은 기준 키 꼴이라 뒤의 `once: "key"` 가 중복으로 본다. 새 프로필이라 앞선 행 · 잠금이 필요 없다. `createAlertOnce` 는 자기 트랜잭션을 연다 |
| 4 | `isVocabName` 이 `lower(word)` 로 견줌 | 타당 |
| 5 | 기기 사실 모으기를 `mic-state.ts` 에 따로 둠 | 받아들임. 지금은 같다. 합치는 길은 M-3 |
| 6 | 마이크 확인 결과 꼴 `ok · not_checked · failed` | 타당(정할 것 터). 끊김 · 누르지 않음은 알림이 없다 |
| 7 | 고르기 화면을 '골라 두고 다음'으로 | 화면 쪽이라 des-p10 판정 |
| 8 | 묶음 그림을 `img onError` 로 | 타당(정할 것 파). 경로 꼴 `/${path}` 는 P5b 시드 보기(`src/server/seed-viewer/files.ts`:388)와 같다 |
| 공용 9 | `bandOf` 하나로 합치기 안 함 | 선택이라 어긋남이 아니다. 새 코드는 `level-band.ts` 만 쓴다(`start.ts`:6). 장부 행은 열린 채로 둔다 |

## 6. 장부 판정(`ledger-open.md`)

| 행 | 판정 | 근거 |
|---|---|---|
| :17 P4a `bandOf` ↔ `level-band` 중복 | 아직 열림 | 공용 변경 9 를 하지 않았다. 대상을 'P11 또는 P12 때'로 옮기기를 권함 |
| :24 P10 화면 방향 · AREA_TONE → 토큰 · keep-all · 글꼴 뒤 크기 시험 | 코드 몫은 닫힘. 화면 방향은 des-p10 뒤 | 토큰은 `common.tsx` diff, keep-all 은 `globals.css` body, 글꼴은 `layout.tsx`, e2e:local 7 은 구현자 보고(차례 2 끝). 세로 820 · 가로 1180 은 사진 판정이 남았다 |
| :29 · :39 read.ts · `currentSeedRevision` | 아직 열림 | 첫 실행 몫은 맞다(unit_progress 시작 개정 · `readLevelSpec(startRevision)`). 배치 · 세션(차례 5 · 6) · P11 · P12 가 남았다 |
| :34 ActivityCard 20px … | 아직 열림 | `ChildScreen` 기본 20px(`CHILD_SIZE.guide`)는 됐다. 소리 자리 읽기 · `-mx-6` 은 P11 · P5c 몫이다 |

새로 둘 만한 행(컨트롤러 판단):
1. 서버 액션의 DB 오류는 이름 · 코드만 남긴다(I-1 도우미). P10 · P11(아이 답 글) · 1-나 공통.
2. 기기 사실 · 시작 개정 셈의 두 벌(M-3)을 합칠 때 하나로.
3. P12: `unitSnapshotOf` 는 쓰기 6~12 의 level_specs 덮기 값을 담지 않는다(구현 보고 알릴 것 3). 판정 때 덮기를 함께 보거나 복사본에 담는다.

## 7. 범위 밖 · 진행 중 변경 관찰

- 22:45 판의 이름 확인 catch(`first-run-flow.tsx`:261-263)는 어떤 오류든 '인터넷이 끊겼어요'를 보인다. 저장 catch(:335-336)는 `navigator.onLine` 으로 가른다. I-1 을 고치면 서버 오류는 reason 으로 오고 catch 에는 진짜 끊김만 남는다. 둘을 같은 꼴로 맞추는 편이 일관된다(des-p10 과 겹쳐 코드 쪽만 적음).
- `first-run.spec.ts`:46-47 이 `test.beforeEach` 와 `plain.beforeEach` 를 둘 다 건다. 같은 파일 묶음에 걸려 시험마다 `resetHousehold` 가 두 번 돈다. 해는 없다.
