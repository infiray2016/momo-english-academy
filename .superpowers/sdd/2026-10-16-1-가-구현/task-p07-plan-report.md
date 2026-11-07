# P7 계획자 보고(적재 · 판 규칙 · 개발용 DB · CI 작업)

계획자(Opus · xhigh, 브리프 `task-p07-plan.md`) · 2026-10-17. 코드 · 설치 · 생성 명령 없음. 한 것은 읽기 명령(git show · merge-tree, 출력은 스크래치패드에만), 공식 문서 읽기, p09 워크트리에서 tsx 띄우기 확인(`node -e`), P6a 워크트리 seed 파일 읽기(node 한 줄)다. 저장소 파일은 이 보고와 plan 둘 말고 고치지 않았다.

## 쓴 파일

| 파일 | 무엇 |
|---|---|
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p07a-적재-판.md` | P7a(기능 · 전체 루프): 판 고르기 · 판 적재 규칙(`src/core/seed/version-pick.ts`), 설정값 시드 견주기(`settings-compare.ts`), 적재 함수(`src/server/seed/load.ts`), 판 고르기 읽기(`read.ts`), 명령 `pnpm seed:load`(`scripts/seed-load.ts`), 시험용 자료 · 단위 2 · 통합 2. 파일 열, 작업 여덟. P7 공통의 확인한 사실 · 정할 것 가~파 표가 이 파일에 있다 |
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p07b-CI-작업-식별자-대조.md` | P7b(도구 · 가벼운 루프): 작업 파일 셋 `main` · `dev-load` · `keepalive`(글자 그대로), 활동 유지 명령 `pnpm db:ping`, 식별자 대조 `pnpm check:ids` · CI 작업, 작업 파일 시험, 개발용 DB [사람] 일곱 줄. 파일 여덟, 작업 여덟 |
| 이 보고 | — |

두 plan 은 머리에서 서로를 가리킨다. 둘 다 상태 draft.

## 제안한 바탕 브랜치

`feature/1a-p09a-ai-client` 01ff0a9(= 8791527 P3a + P4c 위에 P9a). 브리프 후보 둘과 다르게 권하는 까닭:
- 5절 '바꾸는 값도 6.1 조합 검사를 통과해야'와 AC-8i 의 적재 몫이 P9a 의 `checkSettingsCombos` · `capabilitiesOf`(model_prices.capabilities 꼴) · `priceRowsOfSeed` · `priceBookOf` 와 P9a 시험용 자료(`MODEL_PRICES_FIXTURE` · `TEST_SETTINGS` ai.* 키)를 쓴다. 8791527 에는 없다.
- P3b 의 `requireCron` · `src/proxy.ts` 는 쓰지 않는다. 활동 유지는 10절 운영 행대로 GitHub Actions 일정 작업이다. 그래서 e08eaba 는 필요 없다. dev-load 마지막 단계의 `pnpm check:data-api`(P3b)는 main 합침 뒤에만 도는 작업이라 그때는 있다.
- e08eaba 까지 담고 싶으면 e08eaba 와 01ff0a9 를 합치면 된다. 두 줄기는 같은 파일을 고치지 않았다(`git merge-tree 8791527 e08eaba 01ff0a9` 충돌 0).
- 브랜치: a `feature/1a-p07-seed-load`(01ff0a9 에서), b `feature/1a-p07b-ci-ids`(a 끝에서, 같은 워크트리). 식별자 대조만 먼저 하려면 b 를 01ff0a9 에서 ∥ 로 띄워도 된다(겹침은 `package.json` scripts 한 줄).
- 이 plan 은 마이그레이션을 만들지 않는다(01ff0a9 에 P9a 의 0002 가 있다).

## 확인한 사실(요지 — 출처 · 날짜는 plan-p07a '확인한 사실과 출처' 표 14줄)

- 스키마(01ff0a9): 판 열이 있는 시드 표 다섯과 유일 제약, vocab 은 uuid + 유일 word, settings 유일 NULLS NOT DISTINCT(key, profile_id) · version int8, settings_history.source 는 'P7 이 정한다'.
- P4c 가 적재에 쓸 것을 이미 내보낸다: `validateSeed` · `exitCodeOf` · `collectCells` · `cellHash` · `canonicalJson` · `readSeedTree` · `REQUIRED_FILES`. `areas` 는 칸 걷기와 완전성을 함께 거르고 규격 파일 완전성은 늘 본다 — `areas: []` 가 곧 '규격만 검증'이다(코드로 확인).
- `node --conditions=react-server --import tsx` 로 띄우면 tsx 스크립트가 `server-only` 모듈(`src/server/db` 등)을 가져온다. 조건이 없으면 던진다. drizzle-orm · postgres · zod · tsx · SDK 에는 react-server 조건이 없다(p09 워크트리에서 돌려 봄).
- GitHub Free 의 비공개 저장소는 환경 비밀값을 못 쓴다(공개 저장소 또는 Pro · Team 부터). 비밀값은 `if:` 에 바로 못 쓴다. 저장소 변수는 작업 `if` 에 쓸 수 있다. 일정 작업은 기본 갈래에서만 돌고 공개 저장소는 60일 무활동이면 꺼진다. `workflow_dispatch` 는 작업 파일이 기본 갈래에 있어야 돈다.
- Vercel Deployment Checks: 운영 배포는 만들어지지만 필수 검사가 통과하기 전에는 운영 도메인에 붙지 않는다. GitHub 검사를 작업 이름으로 고르고, 여러 작업 파일에 같은 이름을 쓰지 말라고 한다(last_updated 2026-08-11).
- Supabase Free: 지난 한 주 '사용자 DB 활동'이 모자라면 멈춘다. 보통 날마다 DB 요청 몇 개면 된다(문서 2026-10-16).
- P6a 시드(커밋 전): settings.json 180행(seed 36 · decision-first 24 · advanced 118 · basic 2), 프로필 키 다섯, `seed.complete_through_level` 6, 판은 모두 1.0, model-prices 의 opus-4-8 `thinkingDefault` 는 아직 'adaptive'(P9a 는 'none'). 쓰기 6단계 maxCorrections 2 = writing.max_corrections["6"].
- 장부 `ledger-open.md` 에 P7 을 이름 댄 행은 없다.

## (추측)

- 첫 운영 범위 적재 시간(내용 JSON 을 모두 읽어 해시를 견줌 — 수십 초로 어림).
- Supabase 세션 풀러에서 긴 트랜잭션 하나가 끊기지 않는 것과 postgres 역할의 statement_timeout.
- Vercel Deployment Checks 의 Hobby 지원, 건너뛴(skipped) 검사를 Vercel 이 어떻게 보는지.
- `select count(*) from settings` 하나가 Supabase 의 '사용자 DB 활동'으로 세어지는 것.
- 비공개 저장소 Actions 분 한도(Free 월 2,000분)와 활동 유지 작업이 그 안인 것.
- embedded-postgres 가 GitHub linux 러너에서 도는 것(P3a 가 H15 뒤 첫 `ci / integration` 으로 증명).

## 묶음 plan 과 다르게 한 것

1. P7 을 a(적재 · 판 규칙, 전체 루프) · b(CI 작업 · 식별자 대조 · 개발용 DB, 가벼운 루프)로 나눴다. 적재 명령은 a 에 두고 명령 시험은 통합 시험 파일 안에 둬 a 를 파일 열로 맞췄다.
2. 바탕에 P9a 를 더했다(배정표 의존 'P3 · P4' → 'P3 · P4 · P9a', '∥ P9' 는 P9a 뒤 · P9b ∥).
3. 완료 판정 '개발용 DB 에 P6 규격과 시험용 수업'에서 시험용 수업은 개발용 DB 에 넣지 않는다. 지어낸 시험 시드는 자기 규격 파일을 가져 실제 규격과 같은 칸 · 같은 판으로 부딪친다. P7 완료는 '규격만 적재 + 프리뷰가 설정을 읽어 접근 코드 제출이 됨'이고, 수업 적재는 P8 1-가 묶음 뒤 dev-load 로(P8 완료 판정으로 옮김).
4. main 작업은 작업 하나에 단계 셋(migrate · seed-validate · seed-load)이다. 묶음 plan 의 'main / migrate · seed-validate · seed-load' 를 단계 이름으로 읽었다 — Vercel 은 작업 이름으로 검사를 고르고 ci 의 `seed-validate` 작업과 이름이 겹치면 안 된다.
5. 활동 유지에 작은 명령 `pnpm db:ping` 을 더했다(Data API 를 끄면 REST 요청은 DB 에 닿지 않는다).
6. 판 고르기 읽기 함수(`src/server/seed/read.ts`)를 P7 에 뒀다. P10 · P12 가 '시드 판 고르기'를 쓰는데 만드는 P 가 없었다.

## 컨트롤러가 정할 것(권하는 답 · 13절 한 줄 필요 여부)

항목마다 배경 · 선택지는 plan-p07a '정할 것' 표(가~파)와 plan-p07b 표(바 · 사 · 자 · 차 · 카)에 있다. 여기는 결정에 필요한 만큼만 푼다.

- **가 바탕 브랜치.** 권함: 01ff0a9(위). 13절 불필요.
- **나 1-가 개발용 적재 범위(P4a 정할 것 ㅇ 가 P7 에 맡김).** 무엇이 부딪히나: P4c 완전성 표는 회화 · 토리 이야기, 읽기 · 쓰기 1단계 알파벳 · 소리 단원(단원 0), 1단계 평가 level.test_forms(3) 벌 전부를 요구하는데 C50 (4)의 1-가 실시드는 '세 영역 1단계 단원 5개 · 평가 1벌 이상'이다. 또 P8 수업이 오기 전에는 어떤 단계로도 완전성이 차지 않아, P3b 프리뷰 확인(설정 행)과 P9 단가표가 P8 끝까지 막힌다. 권함: (1) dev-load 영역은 읽기 · 쓰기 · 말하기(입력 기본값). (2) 완전성 규칙은 운영과 같게 두고 1-가 실시드에 단원 0 과 1단계 평가 3벌을 더한다 — 둘 다 첫 운영 배포 범위에 이미 있어 버리는 일이 아니고 평가는 같은 묶음 안이다. (3) 수업 전에는 '규격만 적재'(`--reference-only`) 한 번. 다른 길: 개발용만 단원 0 · 벌 수를 빼는 선택지(코드 · 정본 예외가 늘고 프리뷰가 운영과 다르게 돈다). **13절 필요.**
- **다 판 적재 규칙과 판 없는 표(5절 해석).** 5절은 '+ 1 · 새 판의 행만 · 이미 있는 행은 건너뜀'만 적었다. 권함: 같은 칸 · 같은 판 · 다른 내용은 실패, 이미 있는 칸의 새 개정과 행이 있는 묶음(단원 · 벌 · 배치 벌)의 새 칸은 DB 최대 개정 초과(쓰는 쪽은 + 1 그대로, 환경마다 적재 간격이 달라 건너뛴 번호는 받음), 정정은 그 개정 행이 있고 정정 자리가 커져야 함. vocab · images 는 제자리 고침(빠진 행은 남김), model_prices 는 (모델, 적용일) 더하기만. **13절 필요.**
- **라 설정 판 · 이력 · 출처 값.** 권함: 한 번의 적재 = 설정 판 하나, 이력은 고친 행만, 출처 `seed_load`. 13절 불필요(C56 (4) 위임).
- **마 seed/reviews → seed_reports(6.3)의 차수.** 권함: 1-나(seed_reports · 신고와 함께). seed_reports 에 두 번 넣기를 막을 유일 키가 없고 검토 행에 판이 없다. **13절 필요(차수 배정).**
- **바 GitHub 비밀값 자리.** 권함: 비공개 저장소 + 저장소 비밀값 `DEV_*` · `PROD_*` + 작업 파일 시험(돈 안 듦 · 코드 비공개 · 일정 작업이 60일 규칙에 안 걸림). 공개 · Pro 면 작업마다 `environment:` 한 줄. 공개 여부는 요청자가 H15 때 정한다. **(1)이면 13절 필요(10절 '운영 환경 비밀값' 보완).**
- **사 main 작업을 켜는 때.** 권함: 저장소 변수 `PROD_RELEASE` 가 `on` 일 때만(H8 전 건너뜀, 실패 메일 없음). 13절 불필요.
- **아 적재 접속 · 실행.** 권함: `MIGRATION_DATABASE_URL`(세션 풀러) · `node --conditions=react-server --import tsx` · 자문 잠금. 13절 불필요(원하면 C55 같은 기술 선택 한 줄).
- **자 활동 유지.** 권함: GitHub 일정 작업 하루 두 번 · `pnpm db:ping`(settings 행 수 읽기). 13절 불필요.
- **차 식별자 대조 규칙.** 권함: 키 · 범위 · 바꾸는 곳 · 기본값 · 코드 키 · 테이블 · 교정 상한 · 시험 설정값은 막고 설계 숫자는 보고(차수 경계 작업 10 에서 막음으로). 허용: structure.ts(C54 (2)) · 맨 위 대문자 이름 상수(C57 등) · 0 · 1 · 2. 13절 불필요.
- **카 시험 설정값.** 권함: P3a 정할 것 사의 '시험이 settings.json 을 읽게 바꾸기' 대신 `fixture-setting` 규칙으로 맞댐. 13절 불필요.
- **타 토리 이야기 칸의 title · generation.** 5절 lessons 의 목록 제목 · 생성 기록은 비울 수 없는데 P4a 규격은 선택이다. 권함: 1-나 전에 P4 규격에서 필수로, 그때까지 적재는 없으면 거부. 13절 불필요(1-나 몫).
- **파 옛 개정 행의 정정을 싣는 길.** 시드 파일은 칸마다 판 하나라 2.0 · 4.0 이 함께 쓰이는 칸의 2.1 은 파일을 잠시 2.1 로 둬야 싣는다. 권함: 1-나 신고 · 정정 plan 에서. 적재 함수는 칸 목록만 받아 따로 자리를 더해도 바뀌지 않는다. 13절 불필요(지금).

13절 한 줄 초안(필요한 넷):
- 나: "1-가 개발용 적재 범위 — 개발용 적재 작업의 영역은 읽기 · 쓰기 · 말하기(회화 · 토리 이야기는 6.3 (4-나) 뒤). 1-가 끝 사용의 실시드(C50 (4))에 읽기 · 쓰기 1단계 알파벳 · 소리 단원(단원 0)과 1단계 단계 평가 level.test_forms 벌 전부를 더해 개발용 적재가 운영과 같은 완전성 규칙으로 돈다. 수업 시드가 오기 전에는 규격 파일만 넣는 적재(규격 파일 완전성 · 오류 0 만 보고 수업 · 평가 · 배치 칸은 넣지 않음, seed.complete_through_level 은 작업 입력값)를 둔다 — 11절 (4-1) '완전성 검사는 그 값까지'의 개발용 예외."
- 다: "시드 적재의 판 규칙(5절 해석) — 같은 칸 · 같은 판인데 내용 해시가 다르면 적재 전체가 실패한다. 이미 행이 있는 칸의 새 개정과, 행이 있는 단원 · 단계 평가 벌 · 배치 벌에 새로 생긴 칸은 적재 앞 DB 의 가장 큰 개정보다 커야 한다(쓰는 쪽은 '가장 큰 개정 + 1', 환경마다 적재 간격이 달라 건너뛴 번호는 받는다). 정정은 DB 에 그 개정 행이 있어야 하고 그 개정의 가장 큰 정정보다 커야 한다. 판 열이 없는 vocab · images 는 낱말 · 키로 제자리에서 고치고 시드에서 빠진 행은 지우지 않으며, model_prices 는 (모델, 적용일) 행을 더하기만 한다(같은 키에 다른 값이면 실패, 바꾸려면 새 적용일)."
- 마: "표본 검토 파일(seed/reviews)을 seed_reports 에 신고자 '개발자'로 넣는 일(6.3)은 1-나(seed_reports · 신고와 함께)다. 1-가 적재는 seed/reviews 를 읽지 않는다."
- 바(비공개 + 저장소 비밀값을 고를 때): "GitHub Actions 비밀값은 저장소 비밀값으로 두고(GitHub Free 비공개 저장소는 환경 비밀값을 쓰지 못한다) 이름 머리 DEV_ · PROD_ 로 가른다. 운영 비밀값은 main · 활동 유지 작업만 읽고 개발용 적재 작업이 읽지 않는 것은 작업 파일 시험이 본다(10절 '운영 환경 비밀값' 보완). 저장소를 공개하거나 Pro 를 쓰면 환경 비밀값으로 바꾼다."

## 요청하는 공용 변경(글자 그대로는 각 plan 의 같은 이름 절)

| plan | 파일 | 바꿀 것 |
|---|---|---|
| a | `package.json` scripts | `"seed:load": "node --conditions=react-server --env-file-if-exists=.env.local --import tsx scripts/seed-load.ts"` |
| b | `package.json` scripts | `"check:ids": "tsx scripts/check-ids.ts"` · `"db:ping": "node --env-file-if-exists=.env.local --import tsx scripts/db-ping.ts"` |
| b | `.github/workflows/ci.yml` | 작업 `check-ids` 하나를 끝에(`pnpm check:ids --fail-on spec-setting-missing,seed-setting-unknown,setting-scope,setting-change-via,setting-default,code-setting-unknown,table-mismatch,max-corrections,fixture-setting`). P5b 가 같은 파일에 `e2e-local` 을 더하는 중 — 이름은 겹치지 않는다 |

새 작업 파일 셋(`main.yml` · `dev-load.yml` · `keepalive.yml`)은 P7 몫 새 파일이다. `.env.example` · `vitest.config.mts` · `.dependency-cruiser.cjs` · `next.config.ts` · `biome.json` · `drizzle.config.ts` 는 바꾸지 않는다. 묶음 plan 증명 절 머리의 `ci / …` 목록에 `check-ids` 를 더하는 일은 묶음 plan 갱신 때.

## 다른 P 에 넘길 것

- P6(fix · 커밋): 첫 개발용 적재 전에 opus-4-8 `thinkingDefault` 'none'(P9a 작업 3 (나)). 첫 적재 뒤 규격 파일을 고치면 판을 올린다(개정 G + 1 · 정정 + 1) — 안 올리면 적재가 `version-content-changed` 로 막힌다.
- P8: (나가 권함대로면) 1-가 실시드에 단원 0 과 1단계 평가 3벌. 다시 만든 칸은 시드 전체 최대 개정 + 1(파일 기준), 사람 확인 '고침'은 같은 개정의 정정 + 1. 토리 이야기에 title · generation. 적재 보고 `--json` 의 `inserted` 를 seed/manifest 판 기록에. P7 완료 판정에서 옮긴 '수업 적재'(dev-load 세 영역 · through 1)를 P8 완료 판정에.
- P10 · P11 · P12: 시드는 `src/server/seed/read.ts` 로 읽고, 단원 · 단계 평가 · 배치 평가 시작 때 `currentSeedRevision()` 을 start_revision 에 남겨 그 값으로 읽는다. 진행 중 세션은 `sessions.lesson_id` 행을 끝까지 쓴다. 내용 JSON 은 P4a 규격으로 푼다(content · item · spec 에 칸 객체 전체가 든다).
- P3b(합칠 때): 프리뷰 실사용 확인(접근 코드 제출)은 P7b [사람] 1 뒤.
- 1-나: seed/reviews → seed_reports(마), 옛 개정 정정 싣기(파), main 작업의 '신고 판단 기록 · 다시 계산' 단계(main.yml 머리 주석의 자리).
- 묶음 plan 갱신 때(컨트롤러): 배정표 P7 의존에 P9a, 증명 절 머리 `ci / …` 에 `check-ids`, P7 완료 판정 문구(위 '다르게 한 것' 3).
