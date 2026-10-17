# 재검토 보고: P10 fix 1(review-p10-2-code I-1 · M-1~M-3 · 7절 2) — rev-p10, 2026-10-17 23:5x

**라운드 판정: Approved** — 지적 다섯 모두 ADDRESSED, 새로 깨뜨린 것 없음. 새 Minor 하나(로그에서 설정 키가 빠짐)와 다듬기 하나는 컨트롤러가 직접 고치면 된다. fix 라운드 1회째.

재현(워크트리 파일은 고치지 않음, 막힌 포트는 건드리지 않음):
- 스크래치패드 복사본 `scratchpad/rev-p10-fix1/copy` 를 썼다. 비밀 파일과 `.env.example` 을 뺐고 node_modules 는 링크다.
- I-1: 차례 2 검토 때와 같은 꼴로 다시 재현했다. profiles · parent_auth 에 BEFORE INSERT 트리거를 걸어 저장을 실패시키고, vocab 테이블 이름을 바꿔 이름 확인을 실패시켰다. 돌려준 값 · console.error 글 · 던진 것을 모두 봤다.
- 회귀 확인: 단위 전체 · `check:deps` · 첫 실행 · 개발용 시드 · 홈 통합을 복사본에서 돌렸다.
- e2e 는 포트 54339 를 써서 돌리지 않았다(구현자 보고 29 초록).
- 남은 프로세스 · 임시 폴더 0. 복사본 폴더는 시험용 값뿐이다.

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 DB 오류 글에 이름 · PIN 해시 | **ADDRESSED** | 표 아래에 적음 |
| M-1 알파벳 앞섬 시험 | **ADDRESSED** | `tests/unit/first-run.test.ts`:154 에 `chosen: { reading: 3, writing: 2 }` + 알파벳 모름 사례가 들었다. 차례 2 검토의 변이 표본 D(고른 값이 앞섬)를 이 사례가 잡는다 |
| M-2 마이크 칸 상한 | **ADDRESSED** | `src/core/profile/start.ts`:16-17 맨 위 대문자 상수 `MIC_CODE_MAX` 64 · `MIC_BROWSER_MAX` 120. `MicResultSchema`(:259-273)는 `max` 검증 없이 `.transform(slice)` 로 잘라 받아, 긴 글이 저장을 막지 않는다. 단위 사례(:477-493)가 +10 글자를 넣어 길이를 단언한다 |
| M-3 두 벌 | **ADDRESSED** | 표 아래에 적음 |
| 7절 2 `beforeEach` 두 번 | **ADDRESSED** | `tests/e2e/first-run.spec.ts` 의 `plain.beforeEach` 를 지웠다. 파일 맨 위 `test.beforeEach` 가 같은 파일 묶음의 `plain` 시험도 덮는다. 구현자 e2e 29 초록 |

**I-1 재현 결과.**

| 실패시킨 곳 | 돌려준 값 | console.error 글 | 던짐 | 이름 · 영어 이름 · argon2 |
|---|---|---|---|---|
| profiles 넣기 | `{ ok: false, reason: "unavailable" }` | `첫 실행 저장 실패(Error P0001)` | 없음 | 모두 없음 |
| parent_auth 넣기 | 같음 | 같음 | 없음 | 모두 없음 |
| 이름 확인(vocab 없음) | `{ ok: false, reason: "unavailable" }` | `이름 확인 실패(Error 42P01)` | 없음 | 모두 없음 |

- `dbErrorTag`(`src/server/db/safe-error.ts`)는 원인 사슬에서 첫 글 코드를 뽑는다. drizzle 오류에는 `code` 가 없고 cause 인 postgres 오류의 SQLSTATE 가 잡힌다(P0001 · 42P01). 메시지 · detail 은 쓰지 않는다.
- `safeDbError` 는 새 Error 에 `cause` 를 붙이지 않는다.
- 서버 액션 둘은 결과를 그대로 돌려줄 뿐 던지지 않는다. 그래서 Next 로 올라가는 오류가 없다(`src/server/actions/first-run.ts`).
- 화면(`first-run-flow.tsx`):
  - `submitName` 은 unavailable 이면 C72 문장을 보이고 `goNext` 를 부르지 않는다. 별명이 vocab 인지 모른 채 넘어가지 않는다. 저장 때 서버가 별명을 다시 본다(`saveFirstRunUnsafe` 의 `isVocabName` 둘).
  - 한 번 호출은 `needNickname ? nickname : englishShown` 꼴이다. 별명이 필요한 때는 별명만, 아니면 영어 이름만 본다. 이전의 두 갈래와 같은 판정이다. 별명만 vocab 이면 `nicknameRejected` 로 4절 별명 문장(차례 2 화면 I-1 표시)이 그대로 나온다. 영어 이름을 고치면 `needNickname` 이 풀린다.
  - catch 둘(이름 확인 · 저장)은 같은 꼴이다. 끊겼으면 7절 끊김 문장, 아니면 C72 문장이다.
- 구현자의 통합 셋(`tests/integration/first-run.test.ts`:366-433)은 돌려준 값 · 던진 글 · 로그 글 · 프로필 0 행을 단언한다. 이름 확인 시험은 테이블 이름을 되돌린 뒤 정상 확인까지 본다.

**M-3 확인.**
- (가) 기기 사실: `src/lib/speech/browser.ts`(P2 공용)의 `deviceFacts()` 는 옮기기 전 `device()` 의 여섯 줄과 같다. `device()` 는 `describeDevice(deviceFacts())` 로 동작이 같다. `src/lib/mic-state.ts`:67-69 가 같은 함수를 쓴다. mic-state 는 'use client' 이고 화면에서만 읽혀 `client-only` 경계와 맞는다.
- (나) 시작 개정: `src/db/schema/seed-revision.ts` 의 `SEED_REVISION_TABLES` 는 이전 `read.ts` 목록과 같은 다섯 테이블 · 같은 차례다. `server-only` 가 아니다. `drizzle.config.ts`:8-11 은 스키마 파일 셋을 이름으로 적어 이 파일이 마이그레이션에 들지 않는다. `src/server/seed/read.ts` 와 `tests/e2e/household.ts`:42-51 이 같은 목록을 쓴다.
- 공용 변경 둘은 구현 보고 'fix 1' 소절에 표시됐다.
- 회귀(복사본):

  | 명령 | 결과 |
  |---|---|
  | 단위 전체 | 327 통과. 실패 2 는 복사본에 `.env.example` 을 빼서 난 `env-example.test.ts` 둘이라 워크트리와 관계없음 |
  | `check:deps` | 위반 0(104 모듈) |
  | 통합 first-run · dev-seed · home | 16 통과 |

## 2. 새 지적

**N-1(Minor). 설정이 빠졌을 때 로그에서 그 키 이름까지 사라진다.**
- 무엇이: 이제 `saveFirstRun` 은 모든 오류를 받아 `dbErrorTag` 만 남긴다(`src/server/profile/index.ts`:126-138). 설정 읽기의 `SettingMissingError` 는 글 코드가 없어 로그가 `첫 실행 저장 실패(SettingMissingError)` 로 끝난다(`src/server/settings/index.ts`:13-18 — `key` 를 가진다). 이전에는 그대로 던져 키가 보였고, P3b 접근 코드 제출은 같은 오류에 `설정 ${error.key} 가 없습니다` 를 남긴다(`src/app/(setup)/access/submit/route.ts`).
- 왜: 운영에서 설정 행이 빠지면 부모는 '지금은 저장할 수 없어요'만 본다. 로그로도 어느 키인지 알 수 없다. 설정 키는 비밀값도 아이 정보도 아니다.
- 어떻게: catch 에서 `error instanceof SettingMissingError` 면 `console.error(\`첫 실행 저장: 설정 ${error.key} 가 없습니다\`)` 로 남긴다(P3b 와 같은 꼴). 다른 길은 `dbErrorTag` 가 `key` 를 가진 오류의 키를 덧붙이는 것이다. 이름 확인 쪽은 설정을 읽지 않아 해당 없다.

**N-2(다듬기). `dbErrorTag` 주석의 보기가 실제와 다르다.**
- 무엇이: 주석의 보기는 'DrizzleQueryError P0001' 이지만 실제는 `Error P0001` 이다(재현 로그). drizzle-orm 0.45.4 의 `DrizzleQueryError` 는 `name` 을 정하지 않는다(`node_modules/drizzle-orm/errors.js`:10-19).
- 어떻게: 보기를 `Error P0001` 로 고친다. 갈래를 남기고 싶으면 `error.constructor?.name` 을 쓴다.

## 3. `safeDbError` 판정

둔다. 지금 부르는 곳은 없다. 그러나 장부 :43 이 P11(attempts 의 아이 답 글) · 1-나 공통 규칙으로 이 이름을 가리키고, 크기가 작고, `server-only` 다. P11 이 처음 쓸 때 단위 사례 하나를 더한다(cause 없음 · 글에 매개변수 없음). 장부 :43 에 이 문장을 덧붙이기를 권한다. 지금 빼면 P11 이 같은 것을 다시 짠다.

## 4. 장부 판정(`ledger-open.md`)

| 행 | 판정 | 근거 |
|---|---|---|
| :43 DB 오류는 이름 · 코드만 | P10 몫은 닫힘. 행은 P11 브리프 '지킬 것'으로 옮긴 뒤 닫기를 권함 | 첫 실행 저장 · 이름 확인이 재현으로 확인됐다. P11 · P12 · 1-나 몫은 남았다(3절 덧붙임) |
| :44 기기 사실 · 시작 개정 두 벌 | **닫힘** | M-3 (가) · (나) 모두 한 벌이 됐다 |

## 5. 범위 밖 관찰

- `saveFirstRun` 이 프로그래밍 오류(TypeError 등)까지 이름만 남기고 unavailable 로 바꾼다. 아이 이름을 지키려는 선택이라 맞다. 다만 운영 디버깅은 로그 한 줄로 시작해야 한다. 1-나 관찰 도구(`onRequestError` 등)를 붙일 때 같은 가림 규칙을 쓴다.
- `mic-state.ts` 가 `browser.ts` 를 가져와 홈 묶음에 음성 접점 모듈이 들어간다. 홈은 어차피 차례 6 이후 세션에서 같은 모듈을 읽어 문제는 아니다. 묶음 크기는 차례 7 정적 검사 때 한 번 본다.
