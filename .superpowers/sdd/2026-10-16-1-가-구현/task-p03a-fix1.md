# fix 1 브리프: P3a DB · 시계 · 설정 읽기(implementer impl-p03a · Opus · high, 같은 워크트리)

검토 둘이 모두 Approved 다 — A1 `review-p03a-a1.md`(C 0 · I 0 · M 5) · A2 `review-p03a-a2.md`(C 0 · I 0 · M 3). Minor 가운데 **A1 M-1 · M-2 · M-3 · M-4 와 A2 M1 · M2** 를 고친다. A1 M-5(시드 ↔ DB 영어 값)는 시드 쪽(P4c)이 DB 값을 따르므로 P3a 는 바꾸지 않는다(C60). A2 M3(오류 메시지에 받은 값)은 수용 — 바꾸지 않는다. 검토 보고의 '고치는 법'을 따르고, 컨트롤러 결정은 메인 저장소 plan-p03a 의 '컨트롤러 결정' 문단 끝 'A1 검토(20:5x)' 와 공통 규칙 2 의 jsonb 줄 · 위험 3 · 증명 표(모두 20:5x 고침)에 있다: `/Users/hikaru/workspace/momo-english-academy/intent/2026-10-15-모모-잉글리시-아카데미/plan-p03a-DB-시계-설정.md`(워크트리 사본은 옛 판).

## 작업 폴더 · 명령
- 지금 있는 격리 워크트리(브랜치 `feature/1a-p03a-db-clock`). git 쓰기 금지. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. `pnpm spec:trace` 는 인자 없이.
- 허용 파일: `tests/integration/global-setup.ts`(M-1 · M-2) · 새 파일 `src/db/schema/jsonb.ts` 와 `src/db/schema/{content,learning,operations}.ts`(M-3) · `tests/integration/rls-grants.test.ts`(M-4 와 M-3 왕복 시험) · `tests/integration/settings.test.ts`(M-3 로 '규격에 어긋나면' 사례를 문자열 꼴로 되돌릴 수 있음) · `tests/unit/learning-day.test.ts`(A2 M1 · M2) · 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p03a-fix1-report.md`. `drizzle/` 은 손으로 고치지 않는다(아래 M-3 의 `db:generate` 확인). 공용 파일 · 그 밖은 손대지 않는다.
- 증명 표 시험 이름은 M-4 의 한 줄(plan 증명 표도 같이 고쳤다) 말고는 그대로. 새 시험에 AC 접두를 붙이지 않는다.

## 지적과 고치는 법
1. **A1 M-1**(global-setup.ts:64-129). `initialise()` 부터 `provide` 까지를 try 로 감싸고, catch 에서 `await pg.stop()`(시작 전이면 그냥 돌아오게) 과 `rmSync(databaseDir, { recursive: true, force: true })` 를 한 뒤 다시 던진다. 정상 경로의 정리 함수는 그대로.
2. **A1 M-2**(global-setup.ts:73 `onLog: () => {}`). onLog 로 끝 몇십 줄을 배열에 모은다(담을 줄 수는 파일 위 이름 붙인 상수, 성공 때는 출력하지 않음). `start()` 가 거부하면 그 줄들을 붙인 Error 로 다시 던진다.
3. **A1 M-3**(모든 jsonb 열). `src/db/schema/jsonb.ts` 에 다시 풀지 않는 jsonb 를 둔다 — `customType`, `dataType()` 은 `"jsonb"`, `toDriver` 는 `JSON.stringify(value)`, `fromDriver` 는 받은 값 그대로(postgres.js 가 이미 푼 값). 형은 `.$type<T>()` 로 좁힐 수 있게 한다. 세 스키마 파일의 모든 jsonb 열이 이것을 쓴다. 그 뒤 `pnpm db:generate` 를 돌려 **스키마 변화가 없다**는 출력(새 마이그레이션 파일이 생기지 않음)을 보고에 적는다 — 파일이 생기면 멈추고 NEEDS_CONTEXT. 시험 더하기(`rls-grants.test.ts` 'DB 연결' 묶음, 이름 제안 "DB 연결: jsonb 의 최상위 문자열 · 수 · 불 · null 값은 그대로 읽힌다"): settings.value 에 "12" · 12 · true · null · "1.0" 을 넣고 Drizzle 로 읽어 꼴이 그대로인지 본다. settings.test.ts 의 '규격에 어긋나면' 사례를 원래 뜻(문자열 "4")으로 되돌려도 된다.
4. **A1 M-4**(rls-grants.test.ts:181). 정규식에 `SET DATA TYPE` · `SET NOT NULL` 을 더하고 시험 이름을 "마이그레이션: drizzle/*.sql 에 DROP TABLE · DROP COLUMN · DROP TYPE · DROP SCHEMA · RENAME · SET DATA TYPE · SET NOT NULL 이 없다" 로 바꾼다(plan 증명 표와 같게).
5. **A2 M1**(learning-day.test.ts:149). 한 시계 정적 검사 정규식을 `review-p03a-a2.md` M1 의 대체 정규식으로 바꾼다(`Date.now` 넘기기 · `new Date;` · `Date()` 를 잡고 `new Date(ms)` · `Date.UTC(` · `toDate(` · 꼴 이름 `Date` 는 안 잡음). 시험 안에 표본 문자열 몇 개로 잡힘 · 안 잡힘을 단언해도 좋다.
6. **A2 M2**(learning-day.test.ts:12). 기준 날짜를 "2026-12-31" 로 바꿔 달 · 해를 넘는 하루 빼기를 지나게 한다(다섯 시험이 그대로 맞아야 한다).

## 끝나면
`pnpm exec biome ci --colors=off .` · `pnpm build` · `pnpm test` · `pnpm test:int` · `pnpm check:deps` · `pnpm spec:trace`(missing-test 63 그대로) · `pnpm check:bundle`(build 뒤) · `pnpm db:generate`(변화 없음) · 비밀값 grep 0. 보고 `task-p03a-fix1-report.md`: 지적 여섯마다 ADDRESSED(파일:줄 · 시험 이름) · 설계와 다르게 한 것 · 바뀐 파일:줄 · 명령 출력(시험 수 · db:generate 출력). 마지막 메시지 첫 줄은 DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED. 참고: 네가 전에 둔 `tests/unit/gate-probe.test.ts` 는 컨트롤러가 지웠다(관문 실기 확인 끝, C59).
