# 검토 브리프: P7b CI 작업 셋 · 식별자 대조 · 활동 유지 명령(code-reviewer rev-p07b · Opus · high, 읽기 전용, 2026-10-17 21:2x) — 가벼운 루프

가벼운 루프(C52, 도구 성격)의 범위 한정 검토다. plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p07b-CI-작업-식별자-대조.md`(approved, C68)와 브리프 `task-p07b.md` 대로 구현됐는지, 설계 준수(빠진 것 · 넘친 것 · 잘못 이해한 것)와 품질(Critical · Important · Minor)을 판정한다. 지적마다 심각도와 근거(파일:줄 · 재현 · 시험)를 적는다. Minor 는 컨트롤러가 직접 고치니 고치는 법까지. 저장소 · 워크트리 파일을 고치지 않는다(복사본 · 스크래치패드 재현은 된다). 보고 파일 하나만. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴, 실제 DB · GitHub 없음(embedded-postgres 통합 시험은 된다).

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p07`, 가지 `feature/1a-p07b-ci-ids`(바탕 P7a df8445e, 커밋 없음). 새 파일: `scripts/check-ids.ts` · `scripts/db-ping.ts` · `.github/workflows/{main,dev-load,keepalive}.yml` · `tests/unit/check-ids.test.ts` · `tests/unit/ci-workflows.test.ts` · `tests/integration/db-ping.test.ts`. 고친 파일: `.github/workflows/ci.yml`(끝에 check-ids 작업) · `package.json`(check:ids · db:ping 두 줄) · `scripts/seed-load.ts` · `tests/integration/seed-load.test.ts`(덤 — finally close 실패 삼킴).
- 구현 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p07b-report.md`(상태 DONE, '고친 뒤' 절 포함). 컨트롤러 재확인(21:2x): biome 0 · build · 단위 239 · 통합 59 + 1 건너뜀 · check:deps 0 · spec-trace missing-test 51 · check-bundle 0 · `pnpm check:ids --specs <메인 specs>` 종료 0(12절 키 184 · 코드 키 글자 184 · 테이블 29/29 · 대조 안 함 8 · 막는 규칙 위반 0) · ci.yml 에 check-ids 작업(109줄~) · 비밀값 꼴 grep 없음.

## 볼 것
1. **식별자 대조 `check-ids.ts`**: plan '파일별 값' 1 의 규칙 목록(spec-setting-missing · seed-setting-unknown · setting-scope · setting-change-via · setting-default · code-setting-unknown · 테이블 · design-number 등)이 글자 그대로 구현됐는지, 12절 표를 어떻게 파싱하는지(장 파일 `specs/09-설정값.md` 꼴 변화에 깨지기 쉬운 곳), '대조 안 함 8'(ai.model · ai.effort 의 '6.1 표')의 처리가 맞는지, 정본 뿌리 선택지(`--specs`)가 실제로 먹는지(모르는 인자를 조용히 넘기지 않는지 — `--help` 가 '모르는 인자'로 나왔다), 해석 둘(max-corrections 는 사전에 있는 단계만 · '첫 실행 화면' 키가 시드에 있으면 setting-change-via)의 타당성, P6a 시드(f447bc5 — 워크트리 agent-a6ef72438a158a2f3 의 `seed/`)를 `--seed-root` 로 주었을 때 막는 위반 0 · design-number 17 이 거짓 양성인지 표본으로.
2. **활동 유지 `db-ping.ts`**: `server-only` 없이 postgres 바로, `sql.reserve()` 로 접속 · 질의 실패 가르기, 질의 하나(settings 읽기), 종료 코드 · 출력에 접속 문자열 없음, 통합 시험 3.
3. **작업 파일 셋 + ci.yml**: plan 글자 그대로인지(차례 · 비밀값 이름 DEV_ · PROD_ · 입력 · 이름), dev-load 가 운영 비밀값을 읽지 않는지, ci-workflows 시험이 건너뜀 없이 check-ids 의 `--fail-on` 이 CI 규칙 목록과 같다고 단언하는지, main.yml 의 운영 승격 보류(PROD_RELEASE)가 10절과 맞는지.
4. **덤**: seed-load finally 의 close 실패를 삼켜도 적재 결과 · 종료 코드가 그대로인지, 시험이 그것을 증명하는지.
5. 공용 변경 셋이 보고에 표시됐는지, 경계 규칙 · 비밀값 · 로그 내용, 열린 장부 P7b 행(`ledger-open.md` — 허용 목록 · fixture-setting 규칙 · dev-load 입력)이 닫히는지 판정.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p07b.md`(메인 저장소): 판정(Approved · Changes requested) · 지적(심각도 · 근거) · 설계 준수 표 · 다르게 한 것(해석 둘) 판정 · 열린 장부 행 판정. 마지막 메시지는 판정과 요지 5줄 안쪽을 컨트롤러에게 SendMessage 로.
