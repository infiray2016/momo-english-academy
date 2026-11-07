# 검토 브리프: P10 차례 1 — 개발용 로컬 DB 길 · 시험용 시드 나무 · e2e DB(code-reviewer rev-p10 · Opus · high, 읽기 전용, 2026-10-17 22:0x) — 가벼운 루프, 검토 묶음 T

plan-p10a 작업 1(차례 1, 가벼운 루프 C52)의 범위 한정 검토다. 브리프 `task-p10.md` 와 plan-p10a(`intent/2026-10-15-모모-잉글리시-아카데미/plan-p10a-첫-실행-배치.md` — 바뀌는 파일 · 파일별 값 1~3 · 공용 변경 1~4 · 위험 6 · 15 · 정할 것 하 · 서, 13절 C70)대로인지와 품질(Critical · Important · Minor)을 판정한다. 지적마다 심각도 · 근거(파일:줄 · 재현 · 시험). Minor 는 컨트롤러가 직접 고치니 고치는 법까지. 저장소 · 워크트리 파일을 고치지 않는다(복사본 · 스크래치패드 재현은 된다). **같은 워크트리에서 impl-p10 이 차례 2 를 만들고 있다 — 차례 1 파일 넷 + 공용 변경 넷만 본다.** 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. 포트 54329 · 54331 · 3000 · 3001 은 컨트롤러가 쓰고 있다 — 실기는 다른 포트(`--port`)로.

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p10`(가지 feature/1a-p10-first-run-home, 바탕 596137a, 커밋 없음). 차례 1 파일: `scripts/dev-db.ts` · `tests/fixtures/seed/dev-tree.ts` · `tests/e2e/db.ts` · `tests/unit/dev-tree.test.ts`, 공용 변경 `package.json`(db:dev) · `.gitignore`(/.dev/) · `playwright.config.ts`(webServer 배열 · workers 1) · `tests/fixtures/settings.ts`(P10 키).
- 구현 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p10-report.md` '차례 1' 절(다르게 한 것 넷: import.meta 안 씀 · 신호 처리기 뗌 · --port · .env.local 두 줄 다른 주소면 안 건드림; insertHousehold 는 차례 2 로).
- 컨트롤러 재확인(22:0x): biome 0 · tsc 0 · build · 단위 301 · 통합 66 + 1 · deps 0 · spec-trace 47 · bundle 위반 0 · e2e 18 · `pnpm db:dev --port 54331` 첫 실행 seed=loaded · .env.local 두 줄 로컬 주소 · `pnpm dev --port 3001` 에서 쿠키 없이 `/` 401 → 접근 코드 204 → `/` 200.

## 볼 것
1. `dev-db.ts`: persistent 내장 Postgres · Supabase 역할 흉내 · 마이그레이션(Drizzle 폴더) · 설정 시드(`loadableSettings` · 12절 기본값) · devSeedTree 적재가 P7a `loadSeed` 를 통해 가는지(직접 INSERT 아님), 처음 · 다시(kept) · `--reset` · `--port` · 종료 신호 처리, **.env.local 쓰기 규칙**(로컬 주소일 때만 · 다른 주소면 둘 다 안 건드림 · 값 출력 없음 — plan 위험 15), 비밀번호를 파일로 두는 자리와 권한, 자료 폴더 `.dev/` 가 gitignore 에 드는지, Supabase 역할 흉내가 통합 시험 global-setup 과 같은 꼴인지(중복 코드면 Minor).
2. `dev-tree.ts`: loadableSeed 에서 말하기 배치 본 문항을 따라 말하기로 바꾼 것(repeat 꼴 · 풀이 검사 대상 아님)과 P10 설정 키가 12절과 맞는지, 적재 수가 시험으로 고정되는지.
3. `tests/e2e/db.ts` · `playwright.config.ts`: webServer 배열(DB 먼저 · DEV_DB_READY 기다림 · 그다음 Next) · workers 1 · 다시 쓰기 끔 · 임시 DB 폴더 정리 · 기존 e2e 가 모두 도는지(P3b smoke 기대 포함) · 비밀번호 · 포트가 로그에 남지 않는지.
4. 공용 변경 넷이 보고에 표시됐는지 · 경계 규칙(core-no-io 등) · 설계 숫자(포트 · 길이)가 상수 · 설정에서 오는지 · spec-trace 시험 이름.
5. 다르게 한 것 넷 판정. 열린 장부 P10 행(`ledger-open.md`)이 닫히는지.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p10-1.md`(메인 저장소): 판정 · 지적(심각도 · 근거) · 설계 준수 표 · 다르게 한 것 판정 · 장부 판정. 마지막 메시지는 판정과 요지 5줄 안쪽을 컨트롤러에게 SendMessage 로.
