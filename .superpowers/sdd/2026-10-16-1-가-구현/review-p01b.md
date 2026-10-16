# 검토: P1b 품질 관문(code-reviewer · Opus · xhigh)

판정: **Changes requested** · 2026-10-16 · 대상 `feature/1a-p01b-quality-gates` 작업 트리(b0b6a46 위, 커밋 전) · 브리프 `task-p01b-review.md`
심각도별 수: Critical 0 · Important 4 · Minor 7

plan 준수는 거의 그대로다(파일별 값 1~9 가운데 ✓ 7 · 다름(타당) 1 · 해당 없음 1, 허용 파일 밖 변경 0, 의존 · 잠금 파일 변화 0, 시험 이름은 증명 표와 글자까지 같다). 고칠 것은 관문 쪽이다. 컨트롤러 결정 A 는 적힌 기준(`process.arch`)대로면 이 컴퓨터에서 바로 그 경우에 실패하고, `.mts` 로 바꿀 때 시험의 가져오기를 함께 고치지 않으면 빌드가 깨진다. 그리고 관문이 막을 때 stdout 이 비어 있어, ENOENT 로 실패하는 시험 하나로도 Claude Code 가 막음을 푼다(설치된 2.1.301 의 판정 코드로 확인).

## 확인한 명령과 결과

저장소 명령은 모두 `source ~/.nvm/nvm.sh && nvm use >/dev/null &&` 로 시작했다(v24.22.0 arm64 · pnpm 10.34.7). 관문 직접 실행 · 탐침은 저장소 밖 스크래치 사본(`git ls-files -co --exclude-standard` 를 옮기고 `node_modules` 는 저장소 것을 연결)에서 했다. `git status --porcelain -uall` 은 검토 시작과 끝이 같다.

| 명령 | 결과 |
|---|---|
| `git status` · `git diff` | 새 파일 8(허용 목록 그대로) + 장부 3, 수정 3(`implementer.md` · `ci.yml` · `package.json`). `progress.md` 수정은 컨트롤러의 11:5x · 12:2x 줄이다 |
| `git diff --quiet -- pnpm-lock.yaml` | 변화 0. `package.json` 은 스크립트 셋만(의존 변화 0) |
| `pnpm lint` | 0, Checked 23 files |
| `pnpm test` | 0, Test Files 5 · Tests 37 passed |
| `pnpm check:deps` | 0, no dependency violations found (6 modules, 3 dependencies cruised) |
| `pnpm spec:trace` | 0. `spec-trace: 15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 8 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 66` |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` · `--fail-on missing-test` · `--fail-on bogus` · `--plan nope.md` | 0 · 1 · 2 · 2 |
| `pnpm build` → `pnpm check:bundle` | 0 → 0. `check-bundle: 파일 25 · 서버 변수 이름 5 · 대조한 값 0 · 위반 0`(static 10 · server/app 의 html · rsc 15) |
| 비밀값 꼴 grep(키 꼴 · 사용자:비밀번호 접속 문자열, 새 · 고친 파일 전부와 보고) | 0건 |
| 프런트매터 Ruby YAML | `maxTurns` 100, `hooks.Stop[0].hooks[0]` = type `command` · command plan 값 6 글자 그대로 · timeout 300 |
| 15절 · 묶음 plan 증명 표 직접 셈(awk) | 15절 116개 모두 엄격한 꼴, 증명 표 AC 줄 67 + '공통' 1, 67개 모두 엄격한 꼴 |

관문 직접 실행(Node 24 · 26 둘 다, `env -i` 로 PATH 를 정해서):

| 관문을 돈 Node | 하위 명령 PATH 의 node | 입력 | 종료 코드 · 까닭 |
|---|---|---|---|
| 24.22 arm64 | 24.22 | DONE | 0 · 통과 |
| 26.8 x64(Rosetta) | 26.8 x64 | DONE | 2 · biome ci · vitest 실패(네이티브 바이너리 못 찾음, 우려 1 재현) |
| 26.8 x64 | 24.22 arm64 를 앞에 | DONE | 0 · 통과 |
| 26.8 x64 | 24.16 x64 를 앞에(결정 A 의 `process.arch` 기준이 고를 판) | DONE | 2 · biome `Cannot find module` |
| 24.22 / 26.8 | — | 빈 줄 둘 뒤 BLOCKED / NEEDS_CONTEXT | 0 / 0 · 명령 안 돎 |
| 24.22 | — | cwd 에 node_modules 없음 | 2 · 'pnpm install 을 먼저 하세요' |
| 24.22 / 26.8 | — | 깨진 JSON | 2 / 2 · 관문 오류 |
| 12.14 x64 | — | DONE | 9(플래그를 빼면 1) · 막지 않는 오류 |
| 24.22 | 24.22 | DONE, ENOENT 로 실패하는 시험 하나 | 2 · stdout 0바이트 · stderr 에 'no such file or directory'(지적 4) |
| `.mts` 사본, 24.22 / 26.8 | — | BLOCKED | 0 / 0 · stderr 0줄(`.ts` 는 저장소 안에서 매번 MODULE_TYPELESS 경고) |
| 지적 1 의 시제품, 26.8 x64 / 24.22 | 관문이 고른 bin = v24.22.0 | DONE | 0 / 0 · 통과 |

내 탐침의 부작용: 깨진 JSON 두 번은 입력에 cwd 가 없어 저장소의 `.claude/state/implementer-stop-gate.log`(gitignore 됨)에 `2026-10-16T04:13:58Z` 줄 둘(agent_id `-`, '관문 오류: 입력 JSON 을 읽지 못했다')을 남겼다. 작업 6 증거와 헷갈리지 않게 적어 둔다. `.next/` 는 `pnpm build` 로 다시 만들어졌다.

## 잘한 점

- dependency-cruiser 의 safe-regex 거부를 갈래 꼴로 풀면서 받는 집합을 지켰다. 경로 18개(평범한 꼴 · `.pnpm` 꼴 · next-themes · postgres-array · @types/react · `src/serverless` · 상대 경로 앞붙이)에서 구현 정규식과 plan 정규식의 판정 차이가 0이고, plan 꼴은 실제로 "has an unsafe regular expression. Bailing out." 으로 거부된다(스크래치 재현). 까닭을 파일 위 주석으로 남겼다(`.dependency-cruiser.cjs:1-2`).
- 허용 예가 '못 찾아서 통과'가 아님을 `couldNotResolve` 와 실제 해석 경로로 증명한다(`tests/unit/dependency-rules.test.ts:96-102,135-163`). 막는 예는 해석이 돼야만 정규식에 걸리므로 그 자체가 증명이다. react 타입 가져오기도 `react@19.3.1/node_modules/react/index.js` 로 풀림을 확인했다.
- spec-trace 자기 시험의 견본 소스가 실제 검사에 시험으로 세이지 않게 따옴표를 실행 때 잇는다(`tests/unit/spec-trace.test.ts:12-17`). 실제 실행의 'AC 이름 시험 8'이 번들 검사의 AC-N4 여덟뿐임으로 맞다. `--fail-on` 의 모르는 규칙을 2 로 막아 철자 실수가 조용한 0 이 되지 않는다.
- 번들 검사 시험이 출력에 키 · 접속 문자열 · 값의 앞 글자까지 없는지 단언한다(`tests/unit/check-bundle.test.ts:137-153`). 가짜 키 · 접속 문자열은 실행 때 조각을 잇고 저장소에 원문 꼴이 0건이다.
- 관문 판단이 `decide` · `runGate` 순수 함수이고 명령 실행 · 존재 확인을 주입받는다. 시험이 진짜 vitest 를 다시 돌리지 않고, 경계(빈 줄 뒤 BLOCKED, 'DONE_WITH_CONCERNS' 줄 안의 BLOCKED, '상태: BLOCKED', 빈 글, 깨진 입력 넷, 시간 초과의 code null)를 고루 짚는다.
- 우려 1~4 가 모두 그대로 재현된다. 보고가 정확하다.

## 지적

| 번호 | 심각도 | 파일:줄 | 내용 | 근거 | 고칠 방향 |
|---|---|---|---|---|---|
| 1 | Important | `.claude/hooks/implementer-stop-gate.ts:225-232` | (결정 A, 우려 1 — 적용 방법) 결정 A 대로 '`process.arch` 와 맞는 `v<판>*`'를 고르면 바로 그 경우에 실패한다. x64 Node 26 은 Rosetta 로 돌아 `process.arch`=x64 · `os.machine()`=x86_64 · `uname -m`=x86_64 이다. 이 컴퓨터 nvm 에는 v24 가 둘(v24.16.0 x64 · v24.22.0 arm64)이라 x64 판을 고르고, 그 PATH 로는 여전히 막힌다. `node_modules/.bin/biome` · `vitest` 가 PATH 의 node 를 부르는 셸 shim 이라는 전제는 맞고, arm64 Node 를 앞에 붙이면 통과한다 | 실행: 관문 26.8 x64 + 하위 PATH 앞 v24.16.0 → 2, v24.22.0 → 0. `sysctl -in sysctl.proc_translated` = 1(26.8) · 0(24.22). shim 은 `exec node "$basedir/../vitest/vitest.mjs"`(`node_modules/.bin/vitest`, biome 도 같은 꼴). biome 런처는 `process.arch` 로 `@biomejs/cli-darwin-<arch>` 를 고른다(`node_modules/@biomejs/biome/bin/biome`). `node_modules/.pnpm` 의 네이티브 패키지는 arm64 뿐(biome · rolldown · esbuild) | 기준을 하드웨어 아키텍처로 바꾼다. darwin 이고 `process.arch` 가 x64 이며 `sysctl.proc_translated` 가 1 이면 arm64, 아니면 `process.arch`. 후보마다 `<bin>/node -p process.arch` 로 판의 아키텍처를 보고, 판 번호 내림차순(숫자 비교)에서 첫 일치를 고른다. `.nvmrc` 는 앞뒤 공백 · 앞 `v` 를 떼고 주 판만이면 `v24.` 앞붙이, `NVM_DIR` 를 먼저 보고 없으면 `~/.nvm`. 못 찾으면 PATH 그대로. 고른 bin 을 로그 줄에 적는다(작업 6 증거). 고르기를 주입받는 순수 함수로 빼고 '이 컴퓨터 꼴(x64 v24.16.0 + arm64 v24.22.0 + 번역 중) → v24.22.0' · '후보 없음 → PATH 그대로' 시험을 단다. 이 길의 시제품을 스크래치 사본에 넣어 26.8 x64 셸에서 0(허락)을 확인했다. 더 단순한 길은 환경을 고치는 것이다(Node 26 을 arm64 로 다시 깔고 x64 v24.16.0 을 지움). 다른 컴퓨터를 막지 못하므로 코드 길과 함께 권한다 |
| 2 | Important | `tests/unit/implementer-stop-gate.test.ts:11` · `.claude/agents/implementer.md:12` | (결정 A, 우려 2 — 적용 방법) `.mts` 로 이름만 바꾸면 시험의 확장자 없는 가져오기를 TypeScript 가 풀지 못한다(TS2307). `next build` 는 tsconfig 의 파일 목록 전체(시험 포함)를 타입 검사하므로 `pnpm build` 와 CI build · bundle-secrets 가 깨진다. Stop 관문은 biome · vitest 만 돌고 vitest 는 `.mts` 를 풀어 통과하므로, 구현자는 빌드가 깨진 채 관문을 넘는다. `.mts` 확장자를 적으면 TS5097 이다. `.mts` 자체는 맞는 선택이다(경고가 사라지고 두 판 모두 타입 지우기 대상) | 스크래치 사본: 확장자 없음 → vitest 8 passed · tsc TS2307. `.mts` → TS5097(`allowImportingTsExtensions` 필요). `.mjs` → vitest 8 passed · tsc 오류 0(빌드 전 사본의 무관한 LayoutProps 제외) · `biome ci` 통과. `node_modules/next/dist/lib/typescript/runTypeCheck.js:35` 가 `effectiveConfiguration.fileNames` 를 검사한다. `.mts` 관문은 24.22 · 26.8 에서 `--disable-warning` 이 있든 없든 stderr 0줄, `process.features.typescript` 는 둘 다 strip | 시험의 가져오기를 `"../../.claude/hooks/implementer-stop-gate.mjs"` 로 쓴다(TypeScript 는 `.mjs` 를 `.mts` 로 풀고 Vite 도 푼다). 프런트매터 command 와 파일별 값 7 대안의 경로도 `.mts` 로. 관문이 빌드를 돌지 않으므로 fix 라운드 완료 조건에 `pnpm build` 를 넣는다 |
| 3 | Important | `.claude/hooks/implementer-stop-gate.ts:17-18,126-129` · `.claude/agents/implementer.md:13` | (결정 B, 우려 3 — 적용 방법) 지금은 명령마다 240초라 두 명령 합이 480초로 훅 300초를 넘는다. 훅이 시간에 닿으면 Claude Code 가 끊고 출력을 버려 판단이 없으므로 막지 못한다(조용한 통과). 결정 B(명령마다 120초, 합 240 < 300)가 맞다 | https://code.claude.com/docs/en/hooks 'Timeouts': "cancels a command … hook that reaches its timeout, discarding the hook's output, so on most events a timed-out hook renders no decision". 같은 쪽: `onFailure` 는 Stop · SubagentStop 에 효과가 없다. `spawnSync` 는 killSignal(기본 SIGTERM)을 보낸 뒤 프로세스가 끝날 때까지 돌아오지 않는다(`node_modules/@types/node/child_process.d.ts:638,1350-1352`) | `COMMAND_TIMEOUT_MS = 120_000` 과 주석(두 명령 합 + 아키텍처 찾기 < 300초). 두 값이 다시 벌어지지 않게 시험 하나를 단다. `implementer.md` 프런트매터의 `timeout:` 을 읽어 '`COMMAND_TIMEOUT_MS` × 명령 수 + 여유 30초 ≤ timeout × 1000'을 단언한다(명령 수를 내보냄). 상한이 정말 상한이 되게 `killSignal: "SIGKILL"` 을 함께 둘 것을 권한다 |
| 4 | Important | `.claude/hooks/implementer-stop-gate.ts:265-270` | 관문이 막을 때 stdout 은 비우고 stderr 에 하위 명령 끝 60줄을 낸다. Claude Code 는 Stop · SubagentStop 에서 '종료 코드 2 + stdout 빔 + stderr 어디든 no such file 또는 can't open(대소문자 무시)'이면 훅 스크립트가 없는 것으로 보고 막지 않는다. 그래서 ENOENT 로 실패하는 시험(픽스처 파일 없음 같은 흔한 실패) 하나만 있어도 빨간 채로 끝난다. F3 이 막으려는 바로 그 경우다 | https://code.claude.com/docs/en/hooks 'Some events have their own rules' 의 Stop · SubagentStop 줄("exits 2 with nothing on stdout and its stderr says a file is missing … treats the run as a non-blocking error"). 설치된 Claude Code 2.1.301(`~/.local/share/claude/versions/2.1.301`)의 판정 코드: 이벤트가 Stop · SubagentStop 이고 stdout 을 trim 해 비었고 stderr 가 `/no such file\|can't open/i` 에 맞으면 "the hook script appears to be missing" 으로 `blocked: false`. 스크래치 재현: 없는 파일을 읽는 시험 하나 → 관문 2 · stdout 0바이트 · stderr 에 "ENOENT: no such file or directory" → 규칙 참 | 막을 때 stdout 에도 한 줄을 쓴다(예: '구현자 끝내기 관문: 막음, 까닭은 stderr'). 문서 표의 'Plain text + Exit 2 → Blocking error, stderr 가 까닭'이고 이 규칙은 stdout 이 빌 때만 걸린다. 또는 `{"decision":"block","reason":…}` JSON 과 종료 0(SubagentStop 결정 제어). 어느 쪽이든 main 의 쓰기를 내보내는 함수로 빼고 '막을 때 stdout 이 비지 않는다' · 'ENOENT 글이 든 실패도 막는다' 시험을 단다. 작업 6 실기 확인에 ENOENT 실패 한 경우를 더한다 |
| 5 | Minor | `scripts/spec-trace.ts:24-25,112-121` | (결정 C, 우려 4 — 적용 방법) 지금 정규식은 이름의 첫 토큰만 잡는다. 결정 C 는 이름 글 전체(같은 따옴표가 닫을 때까지, 역빗금 건너뜀)를 잡은 뒤 그 안의 `AC-` 토큰을 모두 세면 된다. 다만 '모든 토큰'은 'AC-7a 는 AC-3b 와 다르다' 같은 이름에서 AC-3b 도 덮인 것으로 센다(과다 집계). 지금 묶음 plan 증명 표에는 한 이름에 AC 가 둘 든 시험이 없어 당장 숫자는 그대로다 | 스크래치 탐침(`tsx` 로 `extractTestAcs`): 'AC-2b · AC-2c 홈' → 지금 AC-2b 만. 시제품(이름 전체를 잡고 안에서 토큰을 모두 찾기) → AC-2b · AC-2c, 'AC-7a 는 AC-3b …' → AC-7a · AC-3b. 묶음 plan 증명 표(193~261줄)의 큰따옴표 이름 가운데 AC 둘 이상 든 것 0 | 결정 C 대로 하되, 이름 앞에 이어진 토큰(사이가 `·` · `,` · `/`)만 세는 꼴도 같은 목적을 이루고 과다 집계가 없다. 어느 쪽인지 컨트롤러가 고른다. 센 토큰은 모두 unknown-ac 에 맞대고 줄 번호는 토큰 자리로. 시험 '이름 앞의 AC 여럿을 모두 센다'(앞쪽만 고르면 '본문 속 AC 는 세지 않는다'도) |
| 6 | Minor | `scripts/spec-trace.ts:24-25,114` | 주석 처리한 시험(`// it("AC-1a …")`)도 시험으로 센다. 'AC-' 로 시작하나 토큰 꼴이 아닌 이름('AC-가 …')은 조용히 빠진다(unknown-ac 도 안 남). missing-test 를 막는 검사로 올리는 묶음 plan 작업 10 부터는 주석 처리로 덮음을 꾸밀 수 있다 | 스크래치 탐침: `// it("AC-1a 주석 안" …)` → AC-1a 로 셈. `it("AC-가 이상한 이름" …)` → 0개. plan 위험 4(정규식 뽑기의 한계) · C51 라 | 뽑기 전에 줄 주석 · 블록 주석을 같은 길이 공백으로 바꾸고(줄 번호 유지), 따옴표 바로 뒤가 `AC-` 인데 토큰이 없으면 unknown-ac 로 낸다. 시험 하나씩 |
| 7 | Minor | `.claude/hooks/implementer-stop-gate.ts:30,231` | Biome 는 `NO_COLOR` 를 따르지 않아 막을 때 글에 색 조절 문자와 링크 문자(OSC 8)가 섞인다. 보고 '다르게 한 것 5'의 '색 글자가 섞이지 않게 했다'는 vitest 에만 맞다 | 스크래치: `NO_COLOR=1 FORCE_COLOR=0 biome ci .` → ESC 56개, `biome ci --colors=off .` → 0개, vitest → 0개. 관문 막음 글 99줄 가운데 ESC 54개 | biome 인자를 `["ci", "--colors=off", "."]` 로. 시험의 명령 단언(`tests/unit/implementer-stop-gate.test.ts:45-48`)도 맞춘다 |
| 8 | Minor | `.claude/agents/implementer.md:12` | 관문 스크립트가 아예 뜨지 못하면(타입 지우기가 없는 옛 Node 가 PATH 에 있음 · 경로 오타 · 문법 오류) 종료 코드가 1 · 9 · 127 이라 막지 않는 오류로 조용히 지나간다. `onFailure: "block"` 은 SubagentStop 에 효과가 없어 설정으로 못 막는다. plan 판단 4(관문 자체 오류도 막음)의 빈틈이다 | 실행: v12.14.1 로 관문 → 9(모르는 플래그), 플래그 없이 1. `/bin/sh -c "node … \|\| exit 2"` → 2. https://code.claude.com/docs/en/hooks 'Other exit codes'("If your hook is meant to enforce a policy, use exit 2") · onFailure 의 'no effect on … SubagentStop' | 결정 A 로 command 를 고칠 때 끝에 `\|\| exit 2` 를 붙인다(main 은 0 · 2 만 내므로 뜻이 바뀌지 않는다). 대가는 관문이 못 뜨면 구현자가 8번 막힌 뒤 끝나는 것이다. 조용한 통과보다 낫다고 보지만 컨트롤러가 정한다 |
| 9 | Minor | `scripts/check-bundle.ts:121,161-167` | 대상 0개 검사가 두 폴더 합으로만 본다. `.next/static` 배치가 바뀌어 0개가 돼도 미리 만든 화면이 있으면 클라이언트 묶음을 하나도 안 보고 '위반 0'이다. 반대로 접근 쿠키 확인으로 화면이 동적이 되면 html · rsc 가 줄어드는 것은 정상이다 | plan 파일별 값 4 · 위험 8('엉뚱한 곳을 보면 늘 깨끗하다'). 지금 배치는 static 10 · server/app html · rsc 15. CLAUDE.md '모든 요청은 가족 접근 쿠키를 확인' | `.next/static` 아래 파일이 0개면 2(미리 만든 화면 0개는 허용). '검사할 파일이 0개면 실패한다' 시험에 'static 0 · 화면만 있음 → 2' 경우를 더한다 |
| 10 | Minor | `scripts/spec-trace.ts:291-302` | `--plan` 에 절대 경로를 주면 `join(root, 절대경로)` 가 둘을 이어 붙여 못 읽는다. 2 로 멈추므로 조용하지는 않다 | 실행: `pnpm spec:trace --plan "$PWD/intent/…/plan.md"` → 'Users/hikaru/…/plan.md 를 읽지 못했다' | `resolve(root, planPath)` 로 읽고 출력용 경로만 `relative` 로 |
| 11 | Minor | `.dependency-cruiser.cjs:4-5` · `tests/unit/dependency-rules.test.ts` | 정규식 꼴을 plan 과 다르게 바꿨는데(다름 1), 시험은 pnpm 실제 경로 갈래만 지난다. 평범한 `node_modules/<이름>/` 갈래와 이름 경계(next-themes · postgres-array · @types/react 는 안 잡음)는 시험이 없다 | plan 위험 1('두 꼴을 둘 다 받고 시험 2 가 실제로 잡는지 증명'). 스크래치 탐침: 경로 18개 판정 차이 0, 위 셋은 둘 다 안 잡음. depcruise 의 실제 해석은 늘 `.pnpm/…` 꼴 | 설정의 `forbidden[].to.path` 로 `RegExp` 를 만들어 두 꼴 · 음성 예를 맞대는 순수 시험 하나를 더한다 |

## 설계 준수(plan 파일별 값 1~9)

| 값 | 판정 | 확인한 것 |
|---|---|---|
| 1 `.dependency-cruiser.cjs` | 다름(타당) | 규칙 넷(이름 · severity · from · to)과 옵션 셋이 plan 그대로. 패키지 정규식만 갈래 꼴(같은 집합, plan 꼴의 safe-regex 거부 재현). Biome 형식(큰따옴표 · 세미콜론) |
| 2 의존 규칙 시험 | ✓ | 표 11줄 = 시험 11, 이름이 증명 표 꼴. `tests/.tmp/depcruise-<무작위>`, tsconfig 는 `paths` 만, 시험 뒤 지움(지금 빈 폴더). `src/db/schema.ts` · `src/server/clock.ts` 를 더 둔 것은 별칭 해석 증명에 필요(다름 2) |
| 3 `scripts/spec-trace.ts` | ✓ | `node:fs` 만. 입력 상수 셋, 경로를 실행 때 NFC 로 정규화. 뽑기 · 규칙 셋 · 출력 꼴 · 종료 코드 0/1/2, 기대값(unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 66) 재현. 순수 함수 다섯 + 둘(다름 3) |
| 4 `scripts/check-bundle.ts` | ✓ | 대상(static 전부 · server/app 의 html · rsc), 서버 변수 이름 5, `parseEnv` 로 `.env.local` · `.env`(process.env 안 바꿈), `MIN_SECRET_LENGTH` 8, 규칙 다섯, 출력에 원문 없음, 종료 코드 0/1/2. 지적 9 |
| 5 관문 | ✓(지적 1~4 · 7 · 8) | `node:*` 만, `decide` · `runGate({ cwd, run })` 내보냄, 입력 다섯 필드, 판단 1~4, 로그 한 줄(탭), pnpm 안 거침, 시험은 가짜 run. 명령 상한 240초는 결정 B 로 고칠 값 |
| 6 `implementer.md` | ✓ | 프런트매터 두 필드 철자 그대로(Ruby YAML, 공식 필드 이름은 https://code.claude.com/docs/en/sub-agents 의 `maxTurns` · `hooks`, 프런트매터 Stop → SubagentStop). 본문 가(먼저 읽을 것 4) · 나(작업 순서 5) · 다(보고의 답장 줄 + maxTurns 문장) · 사('· 컴포넌트' 뺌) |
| 7 settings.json 대안 | 해당 없음 | 작업 6 몫. `.claude/settings.json` 은 `{}` 그대로 |
| 8 `ci.yml` | ✓ | depcruise · spec-trace(`--fail-on unknown-ac,plan-ac-not-in-spec`) · bundle-secrets(build 뒤 check:bundle). 준비 네 줄(checkout · pnpm/action-setup · setup-node `.nvmrc` · install --frozen-lockfile)이 P1a 작업과 같다 |
| 9 `package.json` | ✓ | 스크립트 셋 글자 그대로, 의존 변화 0, 잠금 파일 변화 0 |

시험 이름: AC-N4 여섯 · spec 추적 여섯 · 구현자 끝내기 관문 일곱 · 의존 규칙 열하나가 plan 증명 표와 글자까지 같다(더한 시험은 AC-N4 둘 · spec 추적 둘 · 관문 하나). 시험에 네트워크 · 현재 시각에 기대는 단언이 없다(로그 시각은 고정 Date, 임시 폴더 이름은 무작위).

## 구현 보고 '다르게 한 것' 1~5

| 번호 | 판정 | 까닭 |
|---|---|---|
| 1 패키지 정규식 갈래 꼴 | 타당 | plan 꼴은 dependency-cruiser 18.6.0 이 실제로 거부한다(스크래치 재현). 갈래 꼴은 `node_modules/<이름>/` 와 `node_modules/.pnpm/<x>/node_modules/<이름>/` 를 둘 다 받고 다른 패키지(이름이 앞으로 같은 것 포함)는 안 받는다. 경로 18개 판정 차이 0. 평범한 갈래의 시험은 지적 11 |
| 2 임시 프로젝트 시험 | 타당 | 허용 예는 위반 없음과 함께 `couldNotResolve` false · 해석 경로를 단언해 '못 찾아서 통과'를 막는다. 막는 예는 해석돼야만 정규식에 걸린다. 순환 한 번 보고를 'a ↔ b 가운데 한 쪽'으로 맞댄 것도 맞다 |
| 3 spec-trace | 타당(지적 5 · 6 · 10) | 넓은 뽑기가 AC-N4 · AC-10a · AC-2b 를 다 잡는다(탐침). 시험 호출 앞붙이가 있어야 하므로 글 속 'AC-' 낱말('중간의 AC-3a', 변수 글)은 세지 않는다. 표 머리가 없거나 AC 0개면 2. 경로 NFC. 숨은 폴더 · node_modules 건너뜀, 여러 줄 호출도 셈. 남은 빈틈은 주석 처리한 시험과 토큰 없는 'AC-' 이름 |
| 4 check-bundle | 타당(지적 9) | 출력은 파일 · 규칙 · 변수 이름뿐이고 시험이 원문 · 앞 글자 없음을 단언한다. 규칙 다섯, 대상 0개 → 2, `.env.example` 없음 → 2 |
| 5 관문 | 타당, 단 지적 3 · 4 · 7 · 8 | main 의 종료 코드는 0 · 2 뿐(관문 안 오류도 2), 깨진 JSON → 2, 빈 줄 건너뛴 첫 줄 NEEDS_CONTEXT · BLOCKED → 0, `node_modules/.bin` 없음 → 2, 로그 한 줄. 린트가 실패해도 단위 시험까지 도는 해석은 실패를 한 번에 알려 좋다(결정 B 뒤 합 240초 안). `NO_COLOR` 는 Biome 에 안 먹고(지적 7), 스크립트가 못 뜨는 경우(지적 8)와 stdout 빈 막음(지적 4)은 0 · 2 밖으로 새는 길이다 |

## 범위 밖 관찰(지적 아님)

- 관문은 저장소 전체에 `biome ci .` 와 단위 시험을 돈다. CLAUDE.md 는 구현자를 '동시에 2~3개까지' 허락하는데, 둘이 한 작업 트리를 쓰면 한쪽의 미완성 파일로 다른 쪽이 브리프 밖 실패에 막힌다. plan 위험 12 는 바탕 브랜치만 다룬다. P1c ∥ P2~P4 를 띄우기 전에 병렬 구현자는 워크트리를 나눌지 정해 두기를 권한다. 관문은 입력 cwd 를 쓰므로 워크트리마다 맞게 돈다(https://code.claude.com/docs/en/hooks 'cwd follows Claude').
- 이 컴퓨터 nvm 의 Node 가운데 arm64 는 v24.22.0 하나이고 나머지(v26.8.2 · v24.16.0 · v22.x · v12 · v11 · v9)는 x64 다. 기본 별칭은 26.8.2 다. 지적 1 의 코드 길과 별개로 정리해 두면 다른 도구도 덜 헷갈린다.
- 결정 A 로 경로가 `.mts` 가 되면 plan 본문 · 브리프의 `.ts` 표기(파일별 값 5 · 6 · 7, 작업 4 의 직접 실행 명령)도 컨트롤러가 맞춘다.
