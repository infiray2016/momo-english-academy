# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P1b 품질 관문

spec: `specs/` 정본(9절 CI 검사 · 15절 수용 기준 번호 · AC-N4, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P1 행 · 조사 `docs/research/2026-10-16-graph-engineering-ai-coding.md`(F2 · F3) · `docs/research/2026-10-16-graph-engineering.md`(조사 P3 · P4 · P8) · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: done(approved 컨트롤러 2026-10-16 10:3x → 구현 · 검토 · fix 1 · 컨트롤러 확인 끝 14:1x → 커밋 cf97f62 14:2x, 요청자 지시. push · PR 은 원격 뒤 H15)
승인: 컨트롤러, 2026-10-16 10:3x(요청자는 PR 병합 때 본다, H14) · 브랜치 · 워크트리: `feature/1a-p01b-quality-gates`(P1a 브랜치 끝에서 가지 침, 워크트리 없음) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P1 의 뒤 절반이다. 앞 절반(스택 · 폴더 규약 · CI 첫 세 작업)은 같은 폴더의 `plan-p01a-뼈대.md` 이고, 이 plan 은 P1a 의 작업 7 이 초록인 뒤 시작한다.
P2 · P3 · P4 의 구현자를 띄우기 전에 이 plan 을 끝내기를 권한다. implementer 정의가 바뀌기 때문이다(위험 16). 정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)' 이다.

## 목표 (Goal)

묶음 plan P1 행의 품질 관문 셋과 구현자 Stop 훅을 만든다. 모두 '모델의 자기 보고 대신 선 위의 코드 검사'다(그래프 엔지니어링 원칙).
- 의존 규칙(조사 P8, 묶음 위험 7). `src/core` 는 DB(`src/db` · drizzle-orm · postgres) · Next · React · `src/server` 를 가져오지 않는다. 가져오기 순환이 없다. `src/server/ai` 는 `src/server` 안에서만 가져온다.
- spec 추적(F2 = 조사 P3 의 번호 뽑기 + 조사 P4 의 AC ↔ 시험). 시험 이름이 `AC-<숫자><소문자>` 또는 `AC-N<숫자>` 로 시작하면 그 번호가 15절 표에 있는지, 묶음 plan 증명 표의 1-가 AC 67개마다 이름이 맞는 시험이 하나 이상 있는지 센다. 기본은 보고만 하고(종료 코드 0), `--fail-on` 스위치로 위반이 0 인 규칙부터 막는다.
- 번들 검사(9절 CI 검사, AC-N4 의 P1 몫). 빌드한 클라이언트 묶음에 Anthropic 키 꼴 · DB 접속 문자열 · 서버 환경 변수 이름과 (환경에 있으면) 그 값이 없는지 본다.
- 구현자 Stop 훅과 maxTurns(F3). implementer 서브에이전트가 끝나려 하면 `biome ci` 와 단위 시험을 다시 돌려 실패면 끝내지 못하게 한다.
끝나면 CI `ci / lint · build · unit · depcruise · spec-trace · bundle-secrets` 여섯이 초록이고 P1 이 끝난다(묶음 plan 작업 순서 2 의 완료).

## 바뀌는 파일 (Files that change)

P1b 가 쓰는 파일은 열이다(새 파일 여덟 · 고치는 파일 둘). 생성기 파일인 `package.json` 은 세지 않는다.

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `.dependency-cruiser.cjs` | 신규 | 규칙 넷(브리프의 셋 + 제안 하나)과 옵션(아래 '파일별 값' 1) |
| `tests/unit/dependency-rules.test.ts` | 신규 | 임시 프로젝트를 만들어 규칙마다 막는 예 · 허용 예를 돌린다(아래 2) |
| `scripts/spec-trace.ts` | 신규 | 15절 · 묶음 plan 증명 표 · 시험 이름을 맞대는 검사(아래 3) |
| `tests/unit/spec-trace.test.ts` | 신규 | 뽑기 · 규칙 · 종료 코드 시험 |
| `scripts/check-bundle.ts` | 신규 | 클라이언트 묶음 검사(아래 4) |
| `tests/unit/check-bundle.test.ts` | 신규 | 시험 이름이 'AC-N4' 로 시작 |
| `.claude/hooks/implementer-stop-gate.mts` | 신규 | 구현자 끝내기 관문(아래 5). fix 1 에서 `.ts` → `.mts`(명시 ESM) |
| `tests/unit/implementer-stop-gate.test.ts` | 신규 | 판단 함수 시험. 명령 실행은 가짜로 넣는다 |
| `.claude/agents/implementer.md` | 수정 | 프런트매터 `maxTurns` · `hooks`, 본문 세 줄(아래 6) |
| `.github/workflows/ci.yml` | 수정 | 작업 depcruise · spec-trace · bundle-secrets(아래 8) |
| `package.json`(생성기 파일, 수에서 뺌) | 수정 | 스크립트 셋(아래 9) |

### 파일별 값(구현자가 옮겨 쓸 것)

1. `.dependency-cruiser.cjs`. pnpm 은 패키지를 `node_modules/.pnpm/<이름>@<판>/node_modules/<이름>/` 에 두고 dependency-cruiser 는 기본으로 실제 경로를 쓴다(`preserveSymlinks` 기본 false). 그래서 패키지 경로 정규식은 두 꼴을 다 받는다(실제 꼴은 (추측), 시험 2 가 확인한다).

```js
/** @type {import('dependency-cruiser').IConfiguration} */
const npm = (names) => `(^|/)node_modules/(\\.pnpm/[^/]+/node_modules/)?(${names})/`

module.exports = {
  forbidden: [
    {
      name: 'core-no-framework',
      comment: 'src/core 는 순수 함수다. DB · Next · React · src/server 를 가져오지 않는다(CLAUDE.md, 묶음 위험 7, 조사 P8)',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: `^src/(db|server)/|${npm('next|react|react-dom|drizzle-orm|drizzle-kit|postgres')}` },
    },
    {
      name: 'no-circular',
      comment: '가져오기 순환 금지(조사 P8)',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'ai-only-from-server',
      comment: 'src/server/ai 는 src/server 안에서만 가져온다(AI 호출은 서버 코드에서만, 조사 P8)',
      severity: 'error',
      from: { pathNot: '^src/server/' },
      to: { path: '^src/server/ai/' },
    },
    {
      name: 'sdk-only-in-ai',
      comment: '(제안) @anthropic-ai/sdk 는 src/server/ai 에서만 가져온다. scripts/ 는 대상 밖(풀이 검사 · AI 계약은 스크립트가 직접 부른다)',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/server/ai/' },
      to: { path: npm('@anthropic-ai/sdk') },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
  },
}
```

`zod` 는 `src/core` 에서 써도 된다(P4 의 시드 Zod 규격이 `src/core/seed/` 에 산다). `tsPreCompilationDeps: true` 라서 `import type` 도 센다. 현재 시각 금지(`Date.now()`)는 의존 규칙으로 잡지 못한다. 그것은 P3 의 한 시계 시험 몫이다.

2. 의존 규칙 시험. 시험이 `tests/.tmp/depcruise-<무작위>/` 에 작은 임시 프로젝트를 만들고(시험 뒤 지움, `.gitignore` · tsconfig 에서 P1a 가 뺐다), 그 폴더를 작업 폴더로 `node_modules/.bin/depcruise --config <저장소>/.dependency-cruiser.cjs --output-type json src` 를 돌려 JSON 의 위반(규칙 이름 · from)을 맞댄다. 임시 프로젝트에는 `paths` 의 `@/*` → `./src/*` 만 든 tsconfig.json 을 둔다. 저장소 안이라 `next` · `react` 같은 패키지는 위로 올라가 저장소 `node_modules` 에서 찾는다.

| 임시 파일 | 가져오는 것 | 기대 |
|---|---|---|
| `src/core/uses-next.ts` | `next/server` | core-no-framework |
| `src/core/uses-react.ts` | `import type { ReactNode } from 'react'` | core-no-framework |
| `src/core/uses-drizzle.ts` | `drizzle-orm` | core-no-framework |
| `src/core/uses-db.ts` | `@/db/schema`(별칭) | core-no-framework |
| `src/core/uses-server.ts` | `@/server/clock`(별칭) | core-no-framework |
| `src/core/uses-zod.ts` | `zod` | 위반 없음 |
| `src/app/page.tsx` | `@/server/ai/client` | ai-only-from-server |
| `src/server/actions/write.ts` | `@/server/ai/client` | 위반 없음 |
| `src/server/ai/client.ts` | `@anthropic-ai/sdk` | 위반 없음 |
| `src/app/direct-sdk.ts` | `@anthropic-ai/sdk` | sdk-only-in-ai |
| `src/lib/a.ts` ↔ `src/lib/b.ts` | 서로 | no-circular |

3. `scripts/spec-trace.ts`(`pnpm spec:trace [--plan <경로>] [--fail-on <규칙,…>]`). 외부 패키지 없이 `node:fs` 로만 읽는다. 순수 함수(`parseSpecAcs` · `parsePlanProofAcs` · `extractTestAcs` · `trace` · `exitCode`, 이름은 제안)를 내보내고, 직접 실행될 때만 본문을 돈다.
   - 입력(파일 위 상수): 15절 `specs/11-요구사항과-수용-기준.md`, 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md`(`--plan` 으로 1-나 묶음 plan 도 줄 수 있음), 시험 폴더 `tests`(파일 이름이 `.test.ts` · `.spec.ts` 로 끝나는 것). 경로의 한글은 NFC 로 적는다(git 이 NFC 로 저장, 위험 5).
   - AC 번호 꼴: `^AC-(?:\d{1,2}[a-z]|N\d{1,2})$`. 15절 116개가 모두 이 꼴이다(2026-10-16 셈).
   - 뽑기: 15절은 `## 15.` 머리부터 다음 `## ` 까지 표 줄의 첫 칸. 묶음 plan 은 `## 증명 (Proof)` 부터 다음 `## ` 까지 표 줄 가운데 첫 칸이 AC 번호인 줄과 그 줄의 넷째 칸(P). 시험은 `test(` · `it(` · `describe(` · `test.describe(`(뒤에 `.only` · `.skip` · `.fixme` · `.todo` · `.concurrent` 가 붙어도)의 첫 인자가 따옴표 · 백틱 글이고 'AC-' 로 시작할 때 번호 · 파일 · 줄. 이름은 글자 그대로 적고 변수로 만들지 않는다(정규식 뽑기의 한계, 위험 4).
   - 규칙 셋: `unknown-ac`(시험 이름의 AC 가 15절에 없다, 시험 파일:줄), `plan-ac-not-in-spec`(증명 표의 AC 가 15절에 없다, plan.md:줄), `missing-test`(증명 표의 AC 에 시험이 없다, plan.md:줄과 P 칸).
   - 출력: 첫 줄 요약(15절 AC 수 · 증명 표 AC 수 · AC 이름 시험 수 · 규칙별 위반 수), 다음 줄부터 `파일:줄 규칙 AC 설명`.
   - 종료 코드: 0 은 보고만(기본) 또는 `--fail-on` 규칙에 위반 없음, 1 은 `--fail-on` 에 든 규칙에 위반, 2 는 입력을 못 읽음(파일 없음 · 표 못 찾음 · AC 0개). 조용히 0 으로 끝나지 않게 한다.
   - P1b 끝의 기대값: `unknown-ac` 0 · `plan-ac-not-in-spec` 0 · `missing-test` 66(묶음 plan 표 67개 가운데 AC-N4 를 번들 검사 시험이 덮는다).
4. `scripts/check-bundle.ts`(`pnpm build && pnpm check:bundle`). 순수 함수(`findLeaks` 등, 이름은 제안)를 내보내고 파일 목록 · 환경 읽기는 본문에서 한다.
   - 대상(파일 위 상수): `.next/static/` 아래 모든 파일, `.next/server/app/` 아래 `*.html` · `*.rsc`(미리 만든 화면). 배치는 (추측)이다. 대상 파일이 0개면 실패(2)로 끝낸다(빌드를 안 했거나 배치가 바뀐 것).
   - 서버 변수 이름: `.env.example` 의 `이름=` 줄 가운데 `NEXT_PUBLIC_` 로 시작하지 않는 것(P1a 가 만든 다섯).
   - 값: `process.env` 와, 있으면 `.env.local` · `.env` 를 `node:util` 의 `parseEnv` 로 읽은 값(`process.env` 를 바꾸지 않는다). 길이 `MIN_SECRET_LENGTH`(8) 미만은 빼고, CI 처럼 값이 없으면 '값 대조 0개'로 적는다.
   - 규칙: `anthropic-key`(`sk-ant-` 뒤 16자 이상), `db-url`(`postgres://` 또는 `postgresql://` 에 사용자:비밀번호@ 가 든 꼴), `server-env-name`(서버 변수 이름이 낱말로 나타남), `server-env-value`(서버 변수 값이 그대로 나타남), `server-only-marker`(`server-only` 패키지의 오류 문장 'This module cannot be imported from a Client Component module'. 보조 검사다. Next 는 이것을 빌드 때 막으므로 정상이면 0).
   - 출력: 요약(파일 수 · 이름 수 · 대조한 값 수)과 `파일 규칙 변수이름` 줄. 키 · 값 · 접속 문자열 원문은 앞 몇 글자도 내지 않는다.
   - 종료 코드: 0 깨끗함, 1 위반, 2 대상 파일 0개 또는 `.env.example` 없음.
   - 접근 코드: 앱은 접근 코드 원문을 갖지 않고 해시만 서버 환경 변수에 둔다(10절). 그래서 AC-N4 의 '접근 코드 없음'은 `ACCESS_CODE_HASH` 의 이름 · 값 검사로 본다.
   - 시험의 가짜 키 · 접속 문자열은 실행 때 조각을 이어 만든다(예: `['sk', 'ant', 'api03', 'x'.repeat(40)].join('-')`). 원문 꼴이 저장소에 들어가면 GitHub push 보호에 걸린다(위험 9).
5. `.claude/hooks/implementer-stop-gate.mts`. Node 24 이상은 타입을 지우고 `.mts` 를 바로 돈다(Node 22.18 부터 기본. `.mts` 라 package.json 의 type 과 무관하게 ESM 으로 읽혀 typeless 경고가 없다 — fix 1 결정, 아래 '정할 것' 끝). `node:*` 만 쓰고 외부 패키지가 없다. 판단 함수(`decide`)와 실행 함수(`runGate({ cwd, run })`)를 내보내고, 직접 실행될 때만 본문을 돈다.
   - 입력: 표준 입력의 SubagentStop JSON 에서 `cwd` · `stop_hook_active` · `agent_id` · `agent_type` · `last_assistant_message` 를 읽는다.
   - 판단 1: `last_assistant_message` 의 빈 줄을 뺀 첫 줄이 `NEEDS_CONTEXT` 또는 `BLOCKED` 로 시작하면 끝내기를 허락한다(종료 코드 0, 정할 것 나).
   - 판단 2: `cwd` 에 `node_modules/.bin/biome` · `node_modules/.bin/vitest` 가 없으면 막는다(2). 메시지는 'pnpm install 을 먼저 하세요'.
   - 판단 3: `cwd` 에서 `node_modules/.bin/biome ci .` 와 `node_modules/.bin/vitest run --project unit` 을 차례로 돈다(명령마다 `COMMAND_TIMEOUT_MS` 240초). 둘 다 0 이면 허락(0), 하나라도 아니면 막는다(2). stderr 에 '끝내기 전에 고칠 것' 한 줄과 실패한 명령마다 끝 `TAIL_LINES`(60)줄을 낸다. pnpm 을 거치지 않는다(훅 환경에 pnpm 이 없을 수 있음, 위험 14).
   - 판단 4: 관문 자체 오류(입력 JSON 이 깨짐 등)도 막음(2)으로 끝낸다. 0 · 2 밖의 종료 코드는 Claude Code 가 막지 않는 오류로 다루므로 조용히 통과하게 된다.
   - 기록: 판단마다 `<cwd>/.claude/state/implementer-stop-gate.log` 에 한 줄(시각 · agent_id · 허락/막음 · 까닭)을 더한다. `.claude/state/` 는 이미 `.gitignore` 에 있다. 실기 확인(작업 6)의 증거다.
   - 시험은 `run` 에 가짜를 넣는다. 시험 안에서 진짜 vitest 를 다시 돌리면 같은 시험이 끝없이 돈다.
6. `.claude/agents/implementer.md`. 프런트매터에 두 필드를 더한다. 서브에이전트로 불리면 프런트매터의 `Stop` 훅은 `SubagentStop` 으로 바뀐다(공식 문서). 필드 이름이 틀리면 오류 없이 무시되므로 철자를 그대로 옮긴다.

```yaml
maxTurns: 100
hooks:
  Stop:
    - hooks:
        - type: command
          command: 'node --disable-warning=ExperimentalWarning "${CLAUDE_PROJECT_DIR}/.claude/hooks/implementer-stop-gate.mts" || exit 2'
          timeout: 300
```

   본문에는 세 줄을 더하거나 고친다. (가) '먼저 읽을 것'에 'Next.js 코드는 설치된 판의 문서 `node_modules/next/dist/docs/` 를 먼저 본다(옛 판 예제를 쓰지 않는다, 묶음 위험 19)'. (나) '작업 순서'에 '끝낼 때 Stop 훅이 `biome ci` 와 단위 시험을 다시 돈다. 실패하면 끝나지 않고 실패 출력이 다음 지시로 온다. 시험을 건너뛰거나 지워서 넘기지 않는다. 브리프 밖 원인으로 못 고치면 답장 첫 줄에 NEEDS_CONTEXT 또는 BLOCKED 를 적고 끝낸다'. (다) '보고'의 답장 줄을 '답장 첫 줄에 상태 하나(DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED)'로 고치고 'maxTurns 에 닿으면 출력이 부분으로 돌아가고 컨트롤러가 이어서 부른다'를 더한다.
7. 프런트매터 훅이 돌지 않을 때의 대안(작업 6 에서 확인되면 쓴다). `.claude/settings.json`(지금 `{}`)에 아래를 넣고 프런트매터의 `hooks` 는 뺀다(두 번 돌지 않게). SubagentStop 은 에이전트 종류로 고르는 조건(matcher)을 받는다.

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "matcher": "^implementer$",
        "hooks": [
          {
            "type": "command",
            "command": "node --disable-warning=ExperimentalWarning \"${CLAUDE_PROJECT_DIR}/.claude/hooks/implementer-stop-gate.mts\" || exit 2",
            "timeout": 300
          }
        ]
      }
    ]
  }
}
```

8. `.github/workflows/ci.yml` 에 더할 작업 셋. 준비 네 줄은 P1a 와 같다. bundle-secrets 는 빌드 결과를 넘겨받지 않고 다시 빌드한다(단순함을 고름, 1~2분 더 듦).

```yaml
  depcruise:       # 준비 네 줄 + pnpm check:deps
  spec-trace:      # 준비 네 줄 + pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec
  bundle-secrets:  # 준비 네 줄 + pnpm build + pnpm check:bundle
```

9. `package.json` 스크립트.

```json
"check:deps": "depcruise src --config .dependency-cruiser.cjs",
"spec:trace": "tsx scripts/spec-trace.ts",
"check:bundle": "tsx scripts/check-bundle.ts"
```

## 작업 순서 (Order of work)

한 구현자(implementer · Opus · high)가 차례로 한다. 작업 1~4 는 파일이 다르지만 모두 `package.json` 스크립트를 고치므로 ∥ 로 나누지 않는다. 명령은 P1a 처럼 `source ~/.nvm/nvm.sh && nvm use >/dev/null &&` 로 시작한다.

1. [검증] 의존 규칙. 시험 먼저 `tests/unit/dependency-rules.test.ts`(파일별 값 2 의 표)를 쓰고 실패를 본 뒤 `.dependency-cruiser.cjs` 와 `check:deps` 를 쓴다. 완료: 시험 통과, `pnpm check:deps` 위반 0.
2. [검증] spec 추적. 시험 먼저(작은 견본 글로 뽑기 · 규칙 · 종료 코드) → `scripts/spec-trace.ts` → `spec:trace`. 완료: 시험 통과, `pnpm spec:trace` 가 종료 코드 0 과 요약(unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 67)을 낸다. `--fail-on missing-test` 는 1 로 끝난다.
3. [검증] 번들 검사. 시험 먼저 → `scripts/check-bundle.ts` → `check:bundle`. 완료: 시험 통과, `pnpm build && pnpm check:bundle` 위반 0. `.next/static` 아래 임시 파일에 실행 때 조립한 가짜 키를 넣으면 1, 지우면 0(확인 뒤 지움). 이제 spec-trace 의 missing-test 가 66.
4. [검증] 구현자 끝내기 관문. 시험 먼저 → `.claude/hooks/implementer-stop-gate.mts` → `implementer.md`(파일별 값 6). 완료: 시험 통과. 직접 실행 확인 둘. 일부러 깨지는 단위 시험 파일을 잠시 두고 `echo '{"cwd":"<저장소>","last_assistant_message":"DONE"}' | node .claude/hooks/implementer-stop-gate.mts` 가 2, 그 파일을 지우면 0. 로그 줄이 생긴다. Node 24 와 x64 Node 26 둘 다(fix 1).
5. [검증] CI 세 작업. `ci.yml` 에 depcruise · spec-trace · bundle-secrets 를 더한다. 완료: 로컬에서 `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` · `pnpm check:bundle` 모두 초록, 출력이 구현 보고에 있다.
6. [검증] 훅 실기 확인(컨트롤러). C52(요청자 13:4x)로 따로 띄우지 않고 P3 구현자의 첫 실행으로 겸한다 — 그 실행의 관문 로그 '막음' · '허락' 줄이 증거다. 원래 절차: 구현자는 하위 에이전트를 띄우지 않으므로 컨트롤러가 한다. 작업 브랜치에서 일부러 깨지는 단위 시험을 잠시 두고, implementer(model opus · effort high)를 '아무것도 고치지 말고 DONE 으로 끝내라'는 짧은 브리프로 띄운다. 기대: 관문 로그에 '막음' 줄이 생기고 구현자가 실패 출력을 받는다. 그 뒤 구현자가 BLOCKED 로 끝내면 '허락' 줄이 생긴다. 시험 파일을 지운다. 완료: 장부에 로그 두 줄과 판정. 로그 줄이 없으면 파일별 값 7 의 대안으로 바꾸고 다시 확인한다.
7. [사람] 커밋 · push · PR(H14). code-reviewer(Opus · xhigh) 검토와 fix 라운드 1 뒤(C52: 정식 재검토 없이 컨트롤러가 Important 넷을 직접 확인), 요청자 지시가 있으면 컨트롤러가 `feature/1a-p01b-quality-gates` 에 커밋하고 요청자가 push 한다. 완료: GitHub 에서 `ci / lint · build · unit · depcruise · spec-trace · bundle-secrets` 초록. 묶음 plan 작업 순서 2 완료.

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | pnpm 의 실제 경로 꼴이 문서에 없다(dependency-cruiser 문서는 `preserveSymlinks` 기본 false 만 적음) | 패키지 규칙이 아무것도 못 잡는다 | 정규식이 `node_modules/<이름>/` 와 `node_modules/.pnpm/…/node_modules/<이름>/` 를 둘 다 받고, 시험 2 가 실제로 잡는지 증명한다 |
| 2 | P1 시점의 `src` 에는 `src/app` 뿐이라 규칙이 늘 통과한다 | 규칙이 틀려도 초록이다 | 임시 프로젝트 시험이 규칙마다 막는 예를 보인다(그래프 엔지니어링 '실패 예와 함께') |
| 3 | dependency-cruiser 18.6.0 은 TypeScript `>=2.0.0 <7.0.0` 만 받는다 | TS 7 로 올리면 TS 파일을 못 읽는다 | P1a 가 5.9.3 으로 고정했다. 올릴 때는 이 검사부터 본다 |
| 4 | spec-trace 는 정규식으로 시험 이름을 뽑는다 | 변수 · 이어 붙인 이름은 못 센다. 표 꼴이 바뀌면 못 뽑는다 | 시험 이름은 'AC-…' 로 시작하는 글자 그대로 쓴다(묶음 plan 증명 절 규칙). 표 · 머리를 못 찾으면 종료 코드 2 로 멈춘다 |
| 5 | 한글 경로. git 은 NFC 로 저장하고(이 저장소 `core.precomposeunicode=true`), CI 는 리눅스다 | NFD 로 적으면 CI 에서 파일을 못 찾는다 | 경로 상수를 NFC 로 적는다. 못 찾으면 2 로 멈춘다 |
| 6 | 묶음 plan 증명 표나 15절이 바뀌면 기대 수가 바뀐다 | 실제 파일 수에 기댄 시험이 깨진다 | 단위 시험은 작은 견본 글로 짠다. 실제 파일은 작업 2 의 실행 출력으로만 본다 |
| 7 | 번들 검사가 볼 수 없는 것이 있다. Next 는 `NEXT_PUBLIC_` 밖의 환경 변수 참조를 빈 글로 바꾸므로 이름 검사는 보조다. `server-only` 는 Next 가 빌드 때 막는다(패키지 내용은 쓰지 않음). 값 대조는 값이 있을 때만 된다(CI 에는 값이 없음) | 실제 비밀값 새는 것을 CI 가 못 볼 수 있다 | 빌드 성공(server-only) + 키 · 접속 문자열 꼴 + 로컬 `.env.local` 값 대조로 덮는다. H1 때 Vercel 빌드에서도 돌릴지는 정할 것 바 |
| 8 | Turbopack 빌드의 출력 배치(`.next/static` · `.next/server/app`)는 (추측)이다 | 엉뚱한 곳을 보면 늘 깨끗하다 | 대상 파일이 0개면 실패(2) |
| 9 | 검사 출력이나 시험에 비밀값 꼴이 들어가면 로그 · 저장소로 샌다. GitHub push 보호는 Anthropic API Key 꼴을 막는다 | 비밀 노출, push 실패 | 출력은 변수 이름 · 파일 · 규칙만. 시험의 가짜 키 · 접속 문자열은 실행 때 조각을 잇는다 |
| 10 | 프로젝트의 서브에이전트 훅은 그 폴더의 작업 공간 신뢰를 받은 뒤에만 돈다. 모르는 프런트매터 필드는 오류 없이 무시된다. `${CLAUDE_PROJECT_DIR}` 펼침은 settings 예시로만 확인했고 프런트매터에서는 (추측). 워크트리에서 돌 때 훅의 `cwd` 가 그 워크트리인지는 (추측) | 훅이 조용히 돌지 않는다 | 작업 6 의 실기 확인과 로그, 안 되면 settings.json 대안(파일별 값 7). 관문은 `cwd` 를 입력 JSON 에서 읽는다 |
| 11 | Stop 훅 연속 막기는 8번까지다(그 뒤 Claude Code 가 끝냄, `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`) | 빨간 채로 끝나고 DONE 이라 쓸 수 있다 | 컨트롤러는 자기 보고만 믿지 않고 code-reviewer 와 CI 로 본다. 관문 로그에 막음이 이어졌는지 본다 |
| 12 | 관문은 저장소 전체 단위 시험을 돈다 | 바탕 브랜치가 빨가면 브리프 밖 실패로 막힌다 | main 은 늘 초록으로 둔다. 바탕이 빨가면 컨트롤러가 먼저 고치고 구현자를 띄운다 |
| 13 | 관문을 넘으려고 시험을 건너뛰거나 지울 수 있다 | 관문이 빈 껍데기가 된다 | P1a 가 `tests/**` 의 `noFocusedTests` · `noSkippedTests` 를 오류로 올렸다. code-reviewer 가 지운 시험을 본다 |
| 14 | 훅 환경의 Node · pnpm. 로컬 기본 Node 는 26 이고 pnpm 은 Node 24 쪽에만 있을 수 있다. 워크트리마다 `node_modules` 가 따로다 | 관문이 명령을 못 찾는다 | 관문은 pnpm 없이 `node_modules/.bin` 을 바로 부르고(vitest 5 · Biome 는 Node 26 도 받음), 없으면 'pnpm install' 을 알려 막는다 |
| 15 | maxTurns 가 너무 낮으면 일이 중간에 끊긴다 | 부분 출력 | 공식 문서대로 부분 출력은 이어 부를 수 있다. 값은 정할 것 가 |
| 16 | implementer 정의는 고치는 즉시 모든 구현자에게 적용된다 | P2~P4 가 도는 중이면 동작이 바뀐다 | P2~P4 구현자를 띄우기 전에 이 plan 을 끝낸다 |
| 17 | 브리프는 '처음엔 보고만'이고, 이 plan 의 CI 는 위반 0 인 두 규칙(unknown-ac · plan-ac-not-in-spec)을 처음부터 막는다 | 브리프와 다르게 읽힐 수 있다 | 묶음 plan P1 행의 '위반 0 이 되면 막는 검사로'를 규칙마다 적용한 해석이다. missing-test 는 묶음 plan 작업 10 에서 0 이 될 때 `--fail-on` 에 더한다(정할 것 라) |

### 정할 것(컨트롤러)

- 가. maxTurns 값. 조사 F3 은 '두자'만 적었다. 권하는 값은 100(제안)이다. 한 하위 plan 은 파일 열 개 이하라 읽기 · 시험 · 구현 · 고치기를 합쳐 60~80 턴쯤으로 본다(추측). 닿으면 출력이 부분으로 돌아오고 이어 부를 수 있어 낮게 잡는 비용이 작다.
- 나. NEEDS_CONTEXT · BLOCKED 로 끝낼 길. F3 은 'biome · vitest 실패면 끝내기 거부'다. 이 길이 없으면 브리프가 모호해 묻고 싶은 구현자도 8번 막힌 뒤에야 끝나고, 시험을 약하게 고쳐 관문을 넘으려는 쪽으로 기운다. 권하는 것은 '둔다'다. 그 상태는 컨트롤러가 요청자에게 올리는 신호라 숨은 통과가 아니다.
- 다. `sdk-only-in-ai` 규칙. 브리프의 셋 밖에 하나를 더했다. 클라이언트 구성 요소가 SDK 를 바로 가져오는 것을 막는다. 권하는 것은 넣기다. 빼면 규칙 셋이 브리프 그대로다.
- 라. spec-trace 를 CI 에서 언제부터 막을지. 권하는 것은 지금 0 인 unknown-ac · plan-ac-not-in-spec 을 처음부터 막고, missing-test 는 묶음 plan 작업 10(차수 경계)에서 0 이 되면 더하는 것이다.
- 마. 조사 P3 의 나머지 규칙. 조사 P3 은 넷(모든 FR 에 AC, AC 가 가리키는 FR · 결정이 있음, 본문 설정 키가 12절에 있음, 13절 '없어진 것'이 되살아나지 않음)이다. 브리프의 P1 범위는 AC 번호와 시험만이라 이 plan 은 넷을 하지 않는다. spec 승인 앞 게이트(F2 원래 뜻)로 따로 변경 단위를 두거나, 설정 키 대조를 P7 의 check-ids 에 합칠지 정한다.
- 바. H1 때 Vercel 빌드 명령을 `pnpm build && pnpm check:bundle` 로 둘지. Vercel 빌드에는 실제 비밀값이 있어 값 대조가 진짜로 돈다. 대신 오탐이면 프리뷰 배포가 깨진다.
- 사. `implementer.md` 의 '테스트를 먼저 쓰고(Vitest 단위 · 컴포넌트, …)' 문구는 9절 '컴포넌트 단위 테스트는 따로 두지 않고'와 어긋난다. 같은 편집에서 '· 컴포넌트' 를 뺄지 정한다(브리프 밖이라 이 plan 은 손대지 않는다).

결정(컨트롤러 2026-10-16 10:3x, 13절 C51): 가 maxTurns 100. 나 NEEDS_CONTEXT · BLOCKED 끝내기를 둔다(컨트롤러가 요청자에게 올리는 신호). 다 `sdk-only-in-ai` 를 넣는다. 라 unknown-ac · plan-ac-not-in-spec 은 처음부터 막고 missing-test 는 묶음 plan 작업 10 에서 0 이 되면 `--fail-on` 에 더한다. 마 설정 키 대조는 P7 check-ids 에, FR ↔ AC · AC → 결정 번호 · 13절 '없어진 것' 되살아남 검사는 P1c(spec-trace 규칙 셋 추가, P1b 뒤 ∥ P2~P4)로 묶음 plan 배정표에 더했다. 바 H1 때 Vercel 빌드 명령을 `pnpm build && pnpm check:bundle` 로 두고 오탐이면 규칙을 고친다(검사를 끄지 않는다). 사 작업 4 의 implementer.md 편집에서 '· 컴포넌트' 를 뺀다(9절과 맞춤, 파일 수 변동 없음).

### 제약

- 설계를 바꾸지 않는다. 묶음 plan 과 다르게 한 것은 보고 파일(`task-p01-plan-report.md`)의 '다르게 한 것'에 적었다.
- 검사 숫자(최소 비밀값 길이 · 시간 · 출력 줄 수)는 각 파일 위의 이름 붙인 상수다. 앱 설정값(12절)은 쓰지 않는다.
- 비밀값 · 아이 이름은 출력 · 로그 · 시험 · 장부 어디에도 적지 않는다.
- 판단 · 검사는 순수 함수와 Vitest 로 먼저 짠다(그래프 엔지니어링 '자료 그래프' 5단계). 고칠 곳은 정본이고 결과 파일을 손으로 고치지 않는다.
- 용어는 영역 · 단계 · 단원 · 활동이다. 코드 식별자와 브랜치 이름은 영어 ASCII 다.
- 서브에이전트는 호출마다 model · effort 를 적는다(implementer Opus · high, code-reviewer Opus · xhigh). 화면 검토는 없다.
- 커밋 · PR 은 요청자 지시 때만 한다(H14).

### 확인한 사실과 출처(2026-10-16)

| 사실 | 출처 · 판 |
|---|---|
| 규칙 꼴(`forbidden` 의 name · severity · from · to, `to.circular`, `dependencyTypes`, `path` 의 `$1` 묶음), 심각도를 빼면 warn | https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md |
| `tsConfig.fileName` 은 tsconfig 의 `paths` 가 있을 때 쓰고 `compilerOptions` 만 본다, `tsPreCompilationDeps`, `preserveSymlinks` 기본 false, `doNotFollow` | https://github.com/sverweij/dependency-cruiser/blob/main/doc/options-reference.md |
| dependency-cruiser 18.6.0 의 지원 TypeScript `>=2.0.0 <7.0.0`, 직접 의존에 tsconfig-paths-webpack-plugin 4.2.0 · enhanced-resolve 5.26.0, engines node `^22 \|\| ^24 \|\| >=26` | https://github.com/sverweij/dependency-cruiser/blob/main/src/meta.cjs · `npm view dependency-cruiser@18.6.0 engines dependencies` |
| 15절 AC 116개가 모두 `^AC-(\d{1,2}[a-z]\|N\d{1,2})$` 꼴, 묶음 plan 증명 표의 AC 67개가 모두 15절에 있음 | 이 저장소 `specs/11-요구사항과-수용-기준.md` · 묶음 plan 을 2026-10-16 에 셈 |
| Anthropic API 키는 `sk-ant-` 로 시작하고 SDK 는 `ANTHROPIC_API_KEY` 를 자동으로 읽는다 | https://platform.claude.com/docs/en/get-api-key |
| Next 는 `NEXT_PUBLIC_` 이 붙은 환경 변수만 클라이언트 묶음에 넣고 나머지 참조는 빈 글로 바꾼다. `server-only` 를 클라이언트 쪽에서 가져오면 빌드 때 오류이고, Next 는 이 패키지를 내부에서 처리한다 | https://nextjs.org/docs/app/getting-started/server-and-client-components (lastUpdated 2026-10-05) |
| `server-only@0.0.1` 은 `react-server` 조건에 빈 파일, 기본에 오류 문장을 던지는 파일 | https://cdn.jsdelivr.net/npm/server-only@0.0.1/ |
| 서브에이전트 프런트매터의 `hooks`(플러그인 서브에이전트는 무시) · `maxTurns`(닿으면 부분 출력, 이어 부를 수 있음), 프런트매터 `Stop` 은 `SubagentStop` 으로 바뀜, 프로젝트 서브에이전트 훅은 작업 공간 신뢰 뒤에만 돎, 모르는 필드는 오류 없이 무시 | https://code.claude.com/docs/en/sub-agents |
| SubagentStop 입력(`stop_hook_active` · `agent_id` · `agent_type` · `agent_transcript_path` · `last_assistant_message`), 종료 코드 2 면 stderr 가 서브에이전트의 다음 지시, `decision: "block"` JSON, 연속 8번 상한(`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`), command 훅 기본 시간 600초, SubagentStop 의 matcher 는 에이전트 종류, 명령 예시의 `${CLAUDE_PROJECT_DIR}` | https://code.claude.com/docs/en/hooks |
| Node 22.18 이상은 TypeScript 지원(`process.features.typescript`)이 기본으로 켜져 있다 | https://nextjs.org/docs/app/api-reference/config/typescript (lastUpdated 2026-08-25) |
| GitHub 비밀 검사에서 Anthropic API Key 는 push 보호 대상 | https://docs.github.com/en/code-security/secret-scanning/introduction/supported-secret-scanning-patterns |
| Biome `noFocusedTests`(권장, 경고) · `noSkippedTests`(비권장, 경고) | https://biomejs.dev/linter/rules/no-focused-tests/ · https://biomejs.dev/linter/rules/no-skipped-tests/ |
| 이 저장소의 git 은 한글 경로를 NFC 로 저장(`core.precomposeunicode=true`), `.gitignore` 에 `.claude/state/` 가 있음, 사용자 설정의 SubagentStop 훅은 상태 표시 하나뿐이라 겹치지 않음 | 2026-10-16 이 저장소 · `~/.claude/settings.json` 확인 |

## 증명 (Proof)

| 수용 기준 | 증명 | 파일 · 명령 |
|---|---|---|
| AC-N4(P1 몫: 클라이언트 번들에 API 키 · DB 접속 문자열 · 접근 코드가 없다) | 단위 "AC-N4 번들 검사: Anthropic 키 꼴이 있으면 위반을 낸다" · "AC-N4 번들 검사: 사용자:비밀번호가 든 DB 접속 문자열이 있으면 위반을 낸다" · "AC-N4 번들 검사: .env.example 의 서버 변수 이름이 있으면 위반을 내고 NEXT_PUBLIC_ 는 뺀다" · "AC-N4 번들 검사: 환경에 있는 서버 변수 값이 있으면 위반을 내고 값은 출력하지 않는다" · "AC-N4 번들 검사: 검사할 파일이 0개면 실패한다" · "AC-N4 번들 검사: 깨끗한 묶음은 위반 0" + `pnpm build && pnpm check:bundle` 0 + CI `ci / bundle-secrets` | `tests/unit/check-bundle.test.ts` · `scripts/check-bundle.ts` |
| 조사 P8 · 묶음 위험 7 | 단위 "의존 규칙: src/core 가 next 를 가져오면 core-no-framework 위반" 외 파일별 값 2 의 표 한 줄마다 시험 하나 + `pnpm check:deps` 0 + CI `ci / depcruise` | `tests/unit/dependency-rules.test.ts` · `.dependency-cruiser.cjs` |
| F2(조사 P3 번호 뽑기 · 조사 P4 AC ↔ 시험) | 단위 "spec 추적: 15절 표에서 AC 번호 두 꼴을 뽑는다" · "spec 추적: 증명 표에서 AC 행만 뽑고 '공통' 행은 뺀다" · "spec 추적: test · it · describe · test.describe 의 AC 이름을 뽑는다" · "spec 추적: 15절에 없는 AC 를 쓴 시험은 unknown-ac" · "spec 추적: 시험 없는 증명 표 AC 는 missing-test" · "spec 추적: 기본 0, --fail-on 규칙 위반이면 1, 입력을 못 읽으면 2" + `pnpm spec:trace` 요약 + CI `ci / spec-trace` | `tests/unit/spec-trace.test.ts` · `scripts/spec-trace.ts` |
| F3(구현자 Stop 훅 · maxTurns) | 단위 "구현자 끝내기 관문: 린트와 단위 시험이 모두 통과하면 허락한다" · "…: 린트가 실패하면 2 로 막고 실패 출력 끝부분을 낸다" · "…: 단위 시험이 실패하면 막는다" · "…: 첫 줄이 NEEDS_CONTEXT · BLOCKED 면 허락한다" · "…: node_modules 가 없으면 막고 pnpm install 을 알린다" · "…: 입력의 cwd 에서 명령을 돈다" · "…: 입력 JSON 이 깨지면 막는다" + 직접 실행 2 / 0(작업 4) + 실기 확인 로그(작업 6) | `tests/unit/implementer-stop-gate.test.ts` · `.claude/hooks/implementer-stop-gate.mts` · `.claude/agents/implementer.md` |
| 공통 | `pnpm lint` · `pnpm build` · `pnpm test` 초록, CI `ci / lint · build · unit · depcruise · spec-trace · bundle-secrets` 초록 | `.github/workflows/ci.yml` |

fix 라운드 1 결정(컨트롤러 2026-10-16 13:3x, 검토 `review-p01b.md` 지적 1~11 모두 수용, 브리프 `task-p01b-fix1.md`). 파일별 값에 반영되는 것: 값 5 — 관문 파일은 `.mts`(typeless 경고 제거), 하위 명령 PATH 앞에 `.nvmrc` 접두와 맞는 nvm 설치 판 가운데 **가장 높은 판**의 bin 을 붙인다(`nvm use` 와 같은 규칙. 아키텍처로 거르지 않는다 — 이 Mac 에 v24.16.0 x64 · v24.22.0 arm64 가 같이 있어 `process.arch` 기준은 x64 Node 26 아래서 틀린 판을 고른다. 검토 지적 1 의 하드웨어 탐침 길보다 단순하고 하위 프로세스가 없다), `COMMAND_TIMEOUT_MS` 120초 + `killSignal: "SIGKILL"`(합 240 < 훅 300, 결정 B), 막을 때 stdout 에 한 줄(Claude Code 는 Stop · SubagentStop 에서 stdout 이 비고 stderr 에 'no such file' 이 있으면 훅이 없는 것으로 보고 막지 않는다 — 지적 4), biome 은 `--colors=off`(지적 7), 로그 줄 끝에 고른 bin 칸. 값 6 · 7 — command 는 `.mts` 경로 + `|| exit 2`(관문이 못 뜨면 조용한 통과 대신 막음, 지적 8. 대가는 8번 막힌 뒤 끝나는 것). 값 3 — spec-trace 는 이름 **앞에 이어진** AC 토큰만 센다(결정 C 를 좁힘, 본문 속 AC 과다 집계 방지, 지적 5), 주석 처리한 호출은 세지 않고 토큰 없는 `AC-` 이름은 unknown-ac(지적 6), `--plan` 절대 경로 허용(지적 10). 값 4 — `.next/static` 대상 0개면 2(지적 9). 값 2 — 패키지 정규식의 두 꼴 · 음성 예 순수 시험(지적 11). 시험 가져오기는 `.mjs` 꼴(TS 가 `.mts` 로 풂, 지적 2). 새 시험 이름은 완료 보고에 적는다. 검토의 범위 밖 관찰대로 병렬 구현자(P2~P4)는 워크트리를 나눈다(관문은 입력 cwd 를 쓴다).

## 완료 보고 (Done)

구현 2026-10-16 11:5x~12:1x(implementer impl-p01b · Opus · high, `task-p01b-report.md`) → 검토 12:2x~13:2x(code-reviewer rev-p01b · Opus · xhigh, Changes requested I 4 · M 7, `review-p01b.md`) → fix 라운드 1 13:3x~13:46(지적 11 모두 ADDRESSED, 보고 '## fix 라운드 1') → 컨트롤러 확인 14:1x(C52 로 정식 재검토 생략). 상태 in-progress(작업 7 커밋 · push · PR 대기).

| 항목 | 결과 |
|---|---|
| 실제 바뀐 파일 | 신규 `.dependency-cruiser.cjs` · `scripts/spec-trace.ts`(392줄) · `scripts/check-bundle.ts`(215줄) · `.claude/hooks/implementer-stop-gate.mts`(392줄, 계획의 `.ts` 와 다름 — fix 1 결정) · `tests/unit/{dependency-rules,spec-trace,check-bundle,implementer-stop-gate}.test.ts`(249 · 296 · 225 · 330줄). 수정 `.claude/agents/implementer.md`(maxTurns 100 · hooks.Stop, command 는 `.mts` + `\|\| exit 2` — 계획과 다름) · `.github/workflows/ci.yml`(depcruise · spec-trace · bundle-secrets) · `package.json`(스크립트 셋만, 의존 · 잠금 파일 변화 0). 계획과 다른 것은 보고 '계획과 다르게 한 것' 1~5(검토가 모두 타당 판정)와 fix 1 결정('정할 것' 끝 문단) |
| `pnpm spec:trace` | `15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 8 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 66`, 종료 0 |
| `pnpm check:bundle` | `파일 25 · static 10 · 화면 파일 15 · 서버 변수 이름 5 · 대조한 값 0 · 위반 0`, 종료 0 |
| 관문 직접 실행(컨트롤러 14:19, 로그 agent_id `ctrl-check-*`) | x64 Node 26 셸 흉내(PATH 에 24 없음, `env -i`) DONE → 0, stdout · stderr 0줄, 고른 bin `…/v24.22.0/bin`. 없는 파일을 읽는 시험을 두고 Node 24 DONE → 2, stdout 1줄, stderr 에 'no such file' 1건 · ESC 0개. 지운 뒤 → 0. 구현자 표(보고)와 같다 |
| 훅 실기 확인(작업 6) | C52 로 P3 구현자의 첫 실행으로 겸한다. 아직 안 했다. settings.json 대안은 쓰지 않았다 |
| 명령(컨트롤러 14:1x, Node 24.22.0) | lint 0(23 파일) · build 0 · test 0(5 파일 49) · test:int 0 · check:deps 0 · spec:trace 0 · check:bundle 0 · 비밀값 grep 0건 |
| 남긴 것 | 작업 6 실기 확인(P3 때). P1c 규칙 셋은 뒤로(C52). 이 Mac 의 nvm 에 x64 판(기본 v26.8.2 · v24.16.0 등)이 남아 있는 것은 요청자 선택(관문은 '가장 높은 설치 판' 규칙으로 돌아 영향 없음). 구현 브리프 `task-p01b.md` 의 `.ts` 표기는 기록이라 그대로 |
| 커밋 · PR | 커밋 cf97f62(요청자 지시 14:2x, 브랜치 `feature/1a-p01b-quality-gates`). 문서 커밋(C52 · 이 plan done)은 그 다음 커밋. push · PR 은 원격 뒤(H15) |
