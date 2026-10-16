# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P1a 뼈대

spec: `specs/` 정본(10절 기술 구성 · 9절 테스트 · 11절 1-가 (1), approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P1 행 · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: approved(컨트롤러 2026-10-16 10:3x)
승인: 컨트롤러, 2026-10-16 10:3x(요청자는 PR 병합 때 본다, H14) · 브랜치 · 워크트리: `feature/1a-p01a-skeleton`(저장소 본 작업 폴더, 워크트리 없음) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P1 은 파일 열 개 · 단계 여덟을 넘어 둘로 나눴다(묶음 plan 위험 12). 이 파일은 앞 절반(뼈대)이고, 뒤 절반(품질 관문 셋과 구현자 Stop 훅)은 같은 폴더의 `plan-p01b-품질-관문.md` 다. P1b 는 이 plan 이 끝난 브랜치 끝에서 시작한다.
생성기(create-next-app · shadcn init)가 만든 파일은 수에서 뺐다. 정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)' 이다. 판과 출처는 2026-10-16 에 확인했다(위험 절 끝 '확인한 사실과 출처').

## 목표 (Goal)

11절 1-가 (1) '프로젝트 뼈대' 가운데 스택 설치와 폴더 규약을 만든다. 접근 제어 · proxy.ts · DB 스키마는 P3 이다.
스택은 10절 그대로다. Next.js 16.4(App Router · Turbopack · React Compiler) · React 19 · TypeScript strict · Tailwind CSS 4 · shadcn/ui · Motion, Supabase Postgres + Drizzle(설치만), `@anthropic-ai/sdk` · Zod 4, Biome 2 · Vitest · Playwright, Node 24 LTS · pnpm, Vercel 함수 지역 서울(icn1).
끝나면 빈 앱이 `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm test:int` · `pnpm e2e` 를 통과하고, CI `ci / lint · build · unit` 가 돌며 `integration · e2e · seed-validate` 는 자리만 있다.
뒤 하위 plan(P2 ∥ P3 ∥ P4)이 잠금 파일(`pnpm-lock.yaml`)을 동시에 고치지 않도록 10절 스택의 패키지를 여기서 한 번에 설치하고 판을 고정한다.
Playwright 는 아이 화면 글자 기준인 10.9형 태블릿 화면(4절, 잠정)으로 돈다. 가짜 음성은 P2, 가짜 AI 는 P9 가 채운다. 배포는 하지 않는다(Vercel 연결은 H1, P2 때).

## 바뀌는 파일 (Files that change)

P1a 가 쓰는 파일은 아홉이다(새 파일 여덟 · 고치는 파일 하나). 생성기 파일은 표 끝에 따로 적고 세지 않는다.

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `.nvmrc` | 신규 | `24` 한 줄. 로컬 `nvm use` 와 CI `setup-node` 의 `node-version-file` 이 같이 읽는다 |
| `.env.example` | 신규(생성기 견본을 통째로 바꿈) | 변수 이름만, 값 없음(아래 '파일별 값' 8) |
| `.gitignore` | 수정(이미 추적 중인 6줄 파일) | Next · 시험 산출물 줄과 `!.env.example`(아래 9) |
| `vitest.config.ts` | 신규 | 프로젝트 둘(unit · integration), 경로 별칭은 tsconfig 에서 읽음(아래 10) |
| `playwright.config.ts` | 신규 | 10.9형 태블릿 프로젝트 하나(WebKit). 뷰포트 · 포트 · 시간은 파일 위 이름 붙인 상수(아래 11) |
| `vercel.json` | 신규 | `regions: ["icn1"]`. Cron 은 1-나(아래 12) |
| `.github/workflows/ci.yml` | 신규 | 작업 lint · build · unit, 자리 integration · e2e · seed-validate(아래 13) |
| `tests/unit/env-example.test.ts` | 신규 | `.env.example` 에 값이 들어오면 막는 시험. 단위 프로젝트의 첫 시험 |
| `tests/e2e/smoke.spec.ts` | 신규 | 첫 화면이 10.9형 화면에서 열리는지 보는 시험 |
| 생성기 파일(수에서 뺌) | 생성 뒤 손봄 | `package.json` · `pnpm-lock.yaml` · `tsconfig.json` · `next.config.ts` · `biome.json` · `src/app/{layout.tsx,page.tsx,globals.css}` · `components.json` · `src/lib/utils.ts` |

### 폴더 규약

빈 폴더 자리 파일(`.gitkeep`)은 두지 않는다. 규약은 이 표와 `vitest.config.ts` 의 include, P1b 의 의존 규칙으로 고정하고, 폴더는 첫 파일과 함께 생긴다.

| 폴더 | 무엇 | 생기는 때 |
|---|---|---|
| `src/app` | 화면(App Router) | P1a(생성기) |
| `src/core` | DB · Next · React 없는 순수 함수(판정 · 스케줄 · 검증 · 일치율). 현재 시각은 인자로 받는다 | P2 · P4 |
| `src/server` | `server-only`. DB 연결 · 한 시계 · 설정 읽기 · 접근 확인 · AI 호출(`src/server/ai`) · 서버 액션 · 시드 적재 | P3 · P9 |
| `src/lib` | 브라우저 쪽 공용(음성 인터페이스 `src/lib/speech`), shadcn 의 `utils.ts` | P1a(생성기) · P2 |
| `src/components` | `ui`(shadcn) · `board` · `activities` | P5 · P10 |
| `src/db` | Drizzle 스키마 | P3 |
| `scripts/` | 검사 · 적재 스크립트(`tsx` 로 실행) | P1b |
| `tests/unit` · `tests/contract` | Vitest 단위 프로젝트 | P1a · P9 |
| `tests/integration` | Vitest 통합 프로젝트(시험용 Postgres) | P3 |
| `tests/e2e` | Playwright | P1a |
| `tests/e2e-local` | 로컬 전용 화면(시드 보기) | P5 |
| `tests/fixtures` | 시험용 자료 | P2 · P4 · P9 |
| `seed/` | 시드 | P4 |

### 설치 판(2026-10-16 `npm view`, 모두 정확한 판으로 고정 `-E`)

| 묶음 | 패키지@판 | 비고 |
|---|---|---|
| 앱 | `next@16.4.2` · `react@19.3.1` · `react-dom@19.3.1` · `motion@14.3.0` | next 의 engines 는 node `>=20.9.0` |
| DB(설치만) | `drizzle-orm@0.45.4` · `postgres@3.4.9` · dev `drizzle-kit@0.31.11` | 스키마 · 연결은 P3 |
| AI · 검증 | `@anthropic-ai/sdk@0.135.0` · `zod@4.6.7` · `server-only@0.0.1` | SDK 판을 올릴 때는 AI 계약(수동, P9) |
| 해시 | `@node-rs/argon2@2.2.2` | 묶음 plan 의 (추측) 이름 그대로. P3 · P10 이 다른 것을 고르면 바꾼다 |
| 스타일 | dev `tailwindcss@4.3.3` · dev `@tailwindcss/turbopack@4.3.3` | shadcn init 이 더하는 것(2026-10-16 최신: class-variance-authority 0.7.1 · clsx 2.1.1 · tailwind-merge 3.7.0 · lucide-react 1.57.0 · tw-animate-css 1.4.0)은 init 이 실제로 넣은 판을 완료 보고에 적는다 |
| 타입 | dev `typescript@5.9.3` · `@types/node@24.19.2` · `@types/react@19.3.0` · `@types/react-dom@19.3.0` · `babel-plugin-react-compiler@1.0.0` | TS 7.0.2 가 npm 최신이지만 쓰지 않는다(위험 3) |
| 도구 | dev `@biomejs/biome@2.5.15` · `vitest@5.0.5` · `vite@8.3.4` · `@playwright/test@1.64.1` · `dependency-cruiser@18.6.0` · `tsx@4.23.15` | dependency-cruiser 는 P1b 가 쓰지만 잠금 파일을 한 번에 만들려고 여기서 설치 |
| 관리 | `packageManager: "pnpm@10.34.7"` · `engines.node: "24.x"` | 정할 것 나 |

### 파일별 값(구현자가 옮겨 쓸 것)

1. 생성기 명령. 저장소 밖 빈 임시 폴더에서 돌린다(위험 1). 모든 물음을 옵션으로 정했으므로 `--yes` 가 전에 저장된 선택을 끌어오지 않는다(추측. `--yes` 는 '전에 고른 것이나 기본값'을 쓰는 옵션이다). 결과의 `next.config.ts` 에 `cacheComponents` 가 없고 AGENTS.md 가 없는지 본다.

```bash
pnpm dlx create-next-app@16.4.2 momo-english-academy \
  --ts --tailwind --biome --app --src-dir --empty --react-compiler \
  --no-cache-components --no-agents-md --no-agent-feedback \
  --import-alias "@/*" --use-pnpm --skip-install --disable-git --yes
```

옮길 것은 `package.json` · `tsconfig.json` · `next.config.ts` · `biome.json` · `src/` 다섯이다. 옮기지 않는 것은 `.gitignore`(저장소 것에 줄만 더함) · `.env.example`(새로 씀) · `README.md` · `next-env.d.ts`(빌드가 만들고 무시됨)다.

2. `package.json` 머리와 스크립트. `--passWithNoTests` 는 P3 가 첫 통합 시험을 넣을 때 뺀다.

```json
{
  "name": "momo-english-academy",
  "private": true,
  "packageManager": "pnpm@10.34.7",
  "engines": { "node": "24.x" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome check",
    "format": "biome format --write",
    "test": "vitest run --project unit",
    "test:int": "vitest run --project integration --passWithNoTests",
    "e2e": "playwright test"
  }
}
```

3. `next.config.ts`. `reactCompiler` 와 `turbopack.rules` 는 생성기가 넣는다. `agentRules: false` 만 더한다(위험 7). Cache Components 를 켜기로 정하면(정할 것 가) 공식 문서대로 `cacheComponents: true` 와 `partialPrefetching: true` 두 줄을 함께 더한다.

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  agentRules: false,
  turbopack: {
    rules: { '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' } },
  },
}

export default nextConfig
```

4. `tsconfig.json`. 생성기 값(`strict: true` · `moduleResolution: "bundler"` · `paths` 의 `@/*` → `./src/*`) 그대로 두고 `exclude` 에 `tests/.tmp` 를 더한다(P1b 시험이 쓰는 임시 폴더).
5. `biome.json`. 판을 2.5.15 로 올린 뒤 `pnpm exec biome migrate --write` 로 옮기고 아래가 되게 한다.
   - vcs: git, `.gitignore` 를 따른다(`useIgnoreFile: true`). `files.ignoreUnknown: true`. `files.includes` 에 `!docs` · `!specs` · `!intent` · `!.superpowers` 를 더한다.
   - formatter: 공백 2칸(생성기 값). `css.parser.tailwindDirectives: true`(생성기 값).
   - linter: `rules.preset: "recommended"`(옛 `recommended: true` 는 migrate 가 바꾼다), `domains` 의 `next` · `react` 는 `"recommended"`. assist 의 가져오기 정리는 켠다.
   - `overrides`: `tests/**` 에서 `suspicious.noFocusedTests` · `suspicious.noSkippedTests` 를 `"error"` 로 올린다. 둘 다 기본은 경고라 `biome ci` 를 깨지 않는다. P1b 의 Stop 관문을 시험 건너뛰기로 넘지 못하게 하는 줄이다.
6. `src/app`. `layout.tsx` 는 `<html lang="ko">`, metadata title '모모 잉글리시 아카데미'. `page.tsx` 는 빈 `<main />` 하나다(아이 화면 문구를 새로 짓지 않는다. P3 · P10 이 바꾼다). `globals.css` 는 생성기 · shadcn 값 그대로다(포스트잇 보드 색 · 글꼴은 P5 · P10).
7. shadcn. `pnpm dlx shadcn@4.21.5 init -b <정할 것 다의 값> -y`. 더 묻는 것이 있으면 기본값으로 답하고 고른 값(스타일 · 바탕 색)을 완료 보고에 적는다. 스타일은 init 뒤 바꿀 수 없다(공식 문서).
8. `.env.example`. 이름은 CRON_SECRET 만 정본(10절)에 있고 나머지는 (제안)이다. 정하는 하위 plan 이 이름을 바꾸면 이 파일을 함께 고친다. P1b 의 번들 검사가 이 파일에서 서버 변수 이름을 읽는다.

```
# 이름만 둔다. 값은 Vercel · GitHub 비밀값과 각자 컴퓨터의 .env.local 에만 넣고 저장소 · 장부 · 대화에 적지 않는다.
# DB 접속 문자열(서버 전용, 트랜잭션 풀러) — P3
DATABASE_URL=
# 가족 접근 코드의 해시(서버 전용) — P3
ACCESS_CODE_HASH=
# Cron 경로 확인(정본 10절의 이름) — P3 확인 함수, Cron 은 1-나
CRON_SECRET=
# 시각 당기기 날 수(프리뷰만, 운영은 읽지 않음) — P3
CLOCK_SHIFT_DAYS=
# Anthropic API 키(서버 전용, SDK 가 읽는 기본 이름) — P9
ANTHROPIC_API_KEY=
```

9. `.gitignore` 에 더할 줄. 저장소 것(`docs/media/*.mp4` · `node_modules/` · `.env*` · `.claude/state/` · `__pycache__/` · `*.swp`)은 그대로 둔다. `!.env.example` 은 `.env*` 줄보다 아래에 와야 한다.

```
/.next/
/out/
/build
/coverage
*.tsbuildinfo
next-env.d.ts
.vercel
/playwright-report/
/test-results/
/blob-report/
/tests/.tmp/
seed/reports/inbox.json
.DS_Store
*.pem
!.env.example
```

10. `vitest.config.ts`. Vitest 5 의 인라인 프로젝트는 뿌리 설정(`resolve.tsconfigPaths`)을 물려받는다. 컴포넌트 단위 시험은 두지 않는다(9절).

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts', 'tests/contract/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
})
```

11. `playwright.config.ts`. 가짜 음성 · 가짜 AI 의 자리는 이렇게 정한다. 모든 e2e 는 P2 가 만들 `tests/e2e/fixtures.ts` 의 `test` 를 가져오고(인식 · 읽어 주기 가짜를 `addInitScript` 로 넣음), 가짜 AI 를 서버에서 고르는 방법은 P9 가 정한다. P1a 의 첫 화면 시험만 `@playwright/test` 를 바로 쓴다.

```ts
import { defineConfig, devices } from '@playwright/test'

/** 10.9형 태블릿(정본 4절 아이 화면 글자 기준, 잠정). Apple iPad Air(5세대) 2360 × 1640 을 2배율로 나눈 값 */
export const TABLET_10_9_VIEWPORT = { width: 820, height: 1180 } as const
const E2E_PORT = 3100
const SERVER_START_TIMEOUT_MS = 180_000
const CI_RETRIES = 1

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? CI_RETRIES : 0,
  use: { baseURL: `http://localhost:${E2E_PORT}` },
  projects: [
    {
      name: 'tablet-10-9-webkit',
      use: { ...devices['iPad Pro 11'], viewport: TABLET_10_9_VIEWPORT },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: SERVER_START_TIMEOUT_MS,
  },
})
```

12. `vercel.json`.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["icn1"]
}
```

13. `.github/workflows/ci.yml`. 작업마다 준비 네 줄(checkout → pnpm → Node → 설치)이 같다. 자리 작업은 `if: ${{ false }}` 로 두어 'skipped' 로 보이게 하고, 채울 하위 plan 을 주석에 적는다.

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
env:
  NEXT_TELEMETRY_DISABLED: "1"
jobs:
  lint:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6        # 판은 package.json 의 packageManager 에서 읽는다
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec biome ci --reporter=github .
  build:      # 준비 네 줄 + pnpm build
  unit:       # 준비 네 줄 + pnpm test
  integration:   # P3 이 채운다(시험용 Postgres)
    if: ${{ false }}
    runs-on: ubuntu-24.04
    steps:
      - run: echo "P3 가 채운다"
  e2e:           # P10 이 채운다. 첫 화면 시험은 P1a 에서 로컬로만 돈다
  seed-validate: # P4 가 채운다
```

## 작업 순서 (Order of work)

구현자 명령은 모두 `source ~/.nvm/nvm.sh && nvm use >/dev/null &&` 로 시작한다(로컬 기본 Node 가 26, 위험 9). 한 구현자(implementer · Opus · high)가 차례로 하고 ∥ 는 없다. 작업마다 같은 `package.json` 을 고치기 때문이다.

1. [사람] 도구 준비와 결정. 요청자가 저장소 밖 도구를 준비한다. `nvm install 24` 뒤 Node 24 를 켠 채 `npm install -g pnpm@10.34.7`(또는 Node 24 의 `corepack enable pnpm`). 컨트롤러가 '정할 것' 가 · 나 · 다 · 라를 정한다. 완료: 저장소에서 `nvm use 24 && node -v` 가 24.x, `pnpm -v` 가 10.34.7. 정할 것의 답이 장부에 있다.
2. [검증] 뼈대 만들기. `.nvmrc` 를 먼저 쓰고, 저장소 밖 빈 임시 폴더에서 생성기 명령(파일별 값 1)을 돌려 다섯 가지를 저장소 뿌리로 옮긴다. `pnpm install` 뒤 '설치 판' 표대로 `pnpm add -E`(앱 묶음)와 `pnpm add -D -E`(dev 묶음)를 하고 shadcn init(파일별 값 7)을 한다. 완료: `pnpm dev` 첫 화면이 뜨고, `git status` 에 위 표의 파일과 생성기 파일만 있으며 AGENTS.md 가 없다. pnpm 이 막은 설치 스크립트 이름을 적어 둔다.
3. [검증] 판 고정과 생성기 파일 손보기(파일별 값 2~6, 9). Biome 를 2.5.15 로 올리고 `biome migrate --write` 를 한다. 완료: `pnpm lint` 오류 0, `pnpm build` 성공(타입 검사 포함), `pnpm ls --depth 0` 이 '설치 판' 표와 같다.
4. [검증] Vitest. 시험 먼저 `tests/unit/env-example.test.ts` 를 쓰고 실패를 본 뒤 `.env.example` 과 `vitest.config.ts` 를 쓴다. 완료: `pnpm test` 통과(시험 2개), `pnpm test:int` 가 시험 0개로 통과.
5. [화면][검증] Playwright. `pnpm exec playwright install webkit`(저장소 밖 캐시에 받는다) → `playwright.config.ts` → `tests/e2e/smoke.spec.ts`. 완료: `pnpm e2e` 1개 통과, 시험이 뷰포트 820 × 1180 을 확인.
6. [서버] `vercel.json`. Vercel 연결 · 배포는 하지 않는다(H1). 완료: `pnpm lint` 가 JSON 도 통과.
7. [검증] CI 와 마무리 검사. `ci.yml` 을 쓰고, CI 와 같은 순서로 로컬에서 돌린다(`pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test`). 완료: 넷 모두 초록, `git grep -nE "sk-ant-[A-Za-z0-9_-]{16,}|postgres(ql)?://[^ ]+:[^ ]+@"` 0건(키 · 비밀번호가 든 꼴만 잡는다. 문서의 설명 글 'sk-ant-' 는 걸리지 않는다), 구현 보고에 실행 출력.
8. [사람] 커밋 · 원격 · PR(H14). code-reviewer(Opus · xhigh) 검토와 fix 라운드 뒤, 요청자가 지시하면 컨트롤러가 `feature/1a-p01a-skeleton` 에 커밋한다. 원격이 없으므로(2026-10-16 `git remote -v` 빈 결과) 요청자가 GitHub 저장소를 만들고 원격을 더해 push 한다. 완료: GitHub 에서 `ci / lint · build · unit` 초록, 자리 셋은 skipped.

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | create-next-app 은 허용 목록(`.claude` · `docs` · `.git` · `.gitignore` 등) 밖의 파일이 있는 폴더를 거부한다. 저장소에는 `intent/` · `specs/` · `.superpowers/` 가 있다 | 저장소 뿌리에서 바로 만들 수 없다 | 저장소 밖 빈 폴더에서 `--skip-install --disable-git` 로 만들고 다섯 가지만 옮긴다. `.gitignore` 는 덮지 않는다 |
| 2 | 생성기 견본 `.env.example` 에 값(`MY_HOST="example.com"`)이 있고, 저장소 `.gitignore` 의 `.env*` 가 `.env.example` 까지 막는다 | 값이 든 견본이 들어오거나 견본이 커밋되지 않는다 | 견본을 통째로 바꾸고 `!.env.example` 을 더한다. `tests/unit/env-example.test.ts` 가 값을 막는다 |
| 3 | TypeScript 7.0.2 가 npm 최신이다. Next 16.4 는 tsc CLI 로 7 을 받지만 TS 7 에는 JavaScript 컴파일러 API 가 없고, dependency-cruiser 18.6.0 은 TypeScript `>=2.0.0 <7.0.0` 만 받는다 | 7 로 올리면 P1b 의존 규칙 검사가 TS 를 못 읽는다 | 생성기 기본(`^5`)인 5.9.3 으로 고정한다. `pnpm up --latest` 를 쓰지 않는다. 올릴 때는 따로 변경 단위로 |
| 4 | 생성기는 Biome 2.4.2 를 넣는다. 2.5 에서 `linter.rules.recommended` 가 낡은 이름이 되었다(`preset` 으로) | 경고 · 설정 오류 | 판과 `$schema` 를 함께 올리고 `biome migrate --write` |
| 5 | Tailwind 를 붙이는 길이 문서마다 다르다. create-next-app 16.4.2 는 Turbopack 일 때 `@tailwindcss/turbopack` 로더와 `turbopack.rules`, Tailwind 문서(v4.3)는 `@tailwindcss/postcss` 와 `postcss.config.mjs` 다 | shadcn init 이나 빌드가 Tailwind 를 못 알아볼 수 있다(추측) | 생성기 길로 간다. 깨지면 `tailwindcss` · `@tailwindcss/postcss` · `postcss` 와 `postcss.config.mjs` 하나로 바꾸고 `turbopack.rules` 를 지운다(완료 보고에 적음) |
| 6 | Next 16.4 는 App Router 새 앱에서 Cache Components 가 기본이고, 공식 문서는 다음 큰 판에서 모두 켜지고 옵션이 없어진다고 적었다 | 끄면 Next 17 로 갈 때 옮기는 일이 남는다. 켜면 동적 읽기마다 `<Suspense>` · `"use cache"` 패턴이 필요하다 | 정할 것 가 |
| 7 | `next dev` 는 코딩 에이전트를 알아보면 저장소 뿌리에 AGENTS.md 를 만든다(agentRules 기본 켜짐). Claude Code 는 CLAUDE.md 가 있으면 AGENTS.md 를 읽지 않는다 | 읽히지 않는 지시 파일이 생겼다 지워졌다 한다 | `--no-agents-md` 와 `agentRules: false`. 판에 맞는 Next 문서(`node_modules/next/dist/docs/`)를 보라는 줄은 P1b 가 implementer 정의에 넣는다(묶음 위험 19) |
| 8 | Vercel 공식 지원은 pnpm 6~10 이다(잠금 파일 9.0 이면 새 프로젝트는 pnpm 10). 11 · 12 는 Corepack(`packageManager` + `ENABLE_EXPERIMENTAL_COREPACK=1`)으로만 쓰고 커뮤니티 글(2026-05~06)에 된다 · 안 된다가 갈린다. pnpm 10 은 의존 패키지의 설치 스크립트를 기본으로 막는다 | H1 의 첫 프리뷰 배포가 깨질 수 있다. 막힌 설치 스크립트 때문에 도구가 안 돌 수 있다(추측: esbuild · sharp 등은 막혀도 동작) | pnpm 10.34.7(정할 것 나). 막힌 이름은 완료 보고에 적고, 실제로 깨지는 것만 `package.json` 의 `pnpm.onlyBuiltDependencies` 에 더한다 |
| 9 | 로컬 기본 Node 가 26.8.2(nvm)이고 pnpm · corepack 이 없다(2026-10-16 확인) | `engines` 경고, 명령마다 다른 Node | [사람] 작업 1, 명령 앞 `nvm use`(정할 것 라) |
| 10 | Vitest 5 는 Node 22.12 이상 · Vite 6.4 이상이 필요하고 `vite` 가 피어 의존이 되었다. 부모 폴더의 설정을 찾지 않는다. `clearMocks` 가 기본 켜짐이다 | 판 어긋남, 하위 폴더에서 돌리면 설정을 못 찾음 | `vite@8.3.4` 를 직접 설치한다. 저장소 뿌리에서 돌린다 |
| 11 | Playwright 1.64.1 의 기기 목록에 10.9형이 없다(가장 가까운 'iPad Pro 11' 834 × 1194). 실제 Safari 는 주소창만큼 보이는 높이가 작다(추측) | 글자 · 누르는 곳 크기 시험이 실기와 다를 수 있다 | 'iPad Pro 11' 설정에 뷰포트만 820 × 1180 으로 바꾼다. AC-N9 화면 시험(P10~)과 H2 실기에서 다시 본다 |
| 12 | `next build` 는 tsconfig 가 고른 파일 전체를 tsc 로 검사한다(시험 · 스크립트 포함) | 시험 파일의 타입 오류도 빌드를 깬다 | 의도한 엄격함이다. 구현자는 `pnpm build` 를 완료 판정에 넣는다 |
| 13 | CI 자리 작업은 GitHub 에 'skipped' 로 보인다. 필수 검사로 걸면 skipped 를 통과로 셀 수 있다(추측) | 빈 검사가 통과로 보인다 | 자리를 채우기 전에는 필수 검사로 걸지 않는다(H8 때 정함) |
| 14 | 원격 저장소가 없다 | CI 는 작업 8 뒤에야 돈다 | 그 전 완료 판정은 작업 7 의 로컬 명령이다 |
| 15 | 첫 화면 시험은 P3 가 proxy · 접근 코드를 넣으면 바뀐다(첫 요청이 접근 코드 화면으로 감) | P3 에서 e2e 가 깨진다 | P3 브리프에 '첫 화면 시험 고치기'를 넣는다 |
| 16 | 뒤 하위 plan 이 새 패키지를 더하면 ∥ 작업끼리 잠금 파일이 부딪힌다 | 병합 충돌 | 10절 패키지를 여기서 모두 설치한다. 그래도 더해야 하면 컨트롤러가 그 하위 plan 의 순서를 정한다 |
| 17 | shadcn 의 스타일은 init 뒤 바꿀 수 없다 | 뒤에 바꾸려면 구성 요소를 다시 받는다 | 정할 것 다를 init 전에 정한다 |
| 18 | 비밀값 꼴의 글이 저장소에 들어오면 GitHub push 보호가 push 를 막는다(Anthropic API Key 는 push 보호 대상) | 작업 8 의 push 실패 | 작업 7 의 `git grep` 0건 |

### 정할 것(컨트롤러)

- 가. Cache Components. 배경은 16.4 의 create-next-app 이 App Router 기본값으로 켜는 것이다(2026-10-16 문서 확인, 정본 10절에는 없음). 켜면 `cookies()` · DB 읽기 같은 동적 읽기를 `<Suspense>` 안에 두거나 `"use cache"` 로 감싸야 빌드가 통과하고, 경로를 떠나도 이전 화면 상태를 숨겨 둔다. 권하는 것은 끄기(`--no-cache-components`)다. 모든 아이 화면이 가족 쿠키 · DB 로 요청마다 동적이라 얻는 것이 적고, 숨겨 둔 세션 화면이 '한 화면 한 행동' 흐름과 진행 저장을 흐릴 수 있다. 끄면 정본 그대로라 13절 줄은 필요 없다. 켜기로 하면 13절에 한 줄을 먼저 넣고 P3 · P10~P12 브리프에 패턴을 적는다.
- 나. pnpm 판. 정본은 'pnpm' 만 적었다. npm 최신은 12.11.2 지만 Vercel 공식 지원은 10 까지다. 권하는 것은 10.34.7 이다(Vercel 기본 동작, CI 는 `pnpm/action-setup@v6`). 12 로 가려면 H1 에서 Vercel 에 `ENABLE_EXPERIMENTAL_COREPACK=1` 을 넣고 CI 를 `pnpm/setup@v3` 로 바꾸며, 커뮤니티 실패 사례를 감수한다.
- 다. shadcn 바탕(`init -b`). shadcn CLI 4 는 구성 요소 바탕을 radix · base · aria 가운데 고르게 하고, 정본은 'shadcn/ui' 만 적었다. 권하는 것은 radix 다(예제와 문서가 가장 많다(추측)). aria(React Aria)는 터치 누르기 처리가 꼼꼼하다(추측). P1a 는 구성 요소를 넣지 않으므로 P5 까지 미뤄도 된다. 미루면 작업 2 에서 init 을 빼고 P5 브리프로 넘긴다(그 경우 P5 가 잠금 파일을 고친다).
- 라. 로컬 Node 24 쓰는 법. 권하는 것은 명령마다 `nvm use`(다른 프로젝트에 영향 없음)다. 다른 길은 `nvm alias default 24` 로 요청자 컴퓨터 전체를 24 로 바꾸는 것이다.

결정(컨트롤러 2026-10-16 10:3x, 13절 C51): 가 끈다(`--no-cache-components`, 모든 아이 화면이 요청마다 동적이라 얻는 것이 적고 Next 17 이행은 그때 변경 단위로). 나 pnpm 10.34.7. 다 radix 로 지금 init 한다(P5 가 잠금 파일을 고치지 않게). 라 명령마다 `nvm use 24`(요청자 컴퓨터 기본은 그대로). 작업 1 의 도구 준비(nvm Node 24 · 그 Node 의 pnpm 10.34.7)는 컨트롤러가 했다.

### 제약

- 설계를 바꾸지 않는다. 묶음 plan 과 다르게 한 것은 보고 파일(`task-p01-plan-report.md`)의 '다르게 한 것'에 적었다.
- 설정 숫자를 코드에 박지 않는다. 시험 값(뷰포트 · 포트 · 시간 · 재시도)은 `playwright.config.ts` 위의 이름 붙인 상수다. 앱 설정값(12절)은 이 plan 에서 쓰지 않는다.
- 비밀값 · 아이 이름은 어디에도 적지 않는다. `.env.example` 은 이름만, `.env.local` 은 커밋하지 않는다.
- 아이 화면 문구를 새로 짓지 않는다. `page.tsx` 는 빈 `<main />` 이다.
- 용어는 영역 · 단계 · 단원 · 활동이다. 코드 식별자와 브랜치 이름은 영어 ASCII 다.
- 서브에이전트는 호출마다 model · effort 를 적는다(implementer Opus · high, code-reviewer Opus · xhigh). 아이 화면이 없으므로 화면 검토는 없다.
- 커밋 · PR 은 요청자 지시 때만 한다(H14).

### 확인한 사실과 출처(2026-10-16)

| 사실 | 출처 · 판 |
|---|---|
| next · create-next-app 최신 16.4.2, react 19.3.1, typescript 최신 7.0.2(5.x 끝은 5.9.3, 6.x 끝은 6.0.3), tailwindcss · @tailwindcss/turbopack 4.3.3, @biomejs/biome 2.5.15, vitest 5.0.5, vite 8.3.4, @playwright/test 1.64.1, dependency-cruiser 18.6.0, pnpm 12.11.2(10.x 끝 10.34.7) 등 '설치 판' 표의 판 | `npm view <패키지> version`(2026-10-16) |
| create-next-app 옵션(`--biome` · `--react-compiler` · `--cache-components`(App Router 기본) · `--agents-md`(기본) · `--agent-feedback` · `--empty` · `--src-dir` · `--skip-install` · `--disable-git` · `--yes`), Turbopack 기본 | https://nextjs.org/docs/app/api-reference/cli/create-next-app (lastUpdated 2026-09-29) |
| 허용 목록 밖 파일이 있는 폴더 거부(`.claude` · `docs` · `.git` · `.gitignore` 등은 허용) | https://github.com/vercel/next.js/blob/v16.4.2/packages/create-next-app/helpers/is-folder-empty.ts |
| 16.4.2 템플릿: Tailwind + Turbopack 이면 `@tailwindcss/turbopack` 과 `turbopack.rules['*.css']`, postcss 설정 없음 · typescript `^5` · @types/node `^20` · Biome 2.4.2 와 `lint: biome check` · `reactCompiler: true` 와 babel-plugin-react-compiler 1.0.0 · Cache Components 를 켜면 `partialPrefetching` 도 | https://github.com/vercel/next.js/blob/v16.4.2/packages/create-next-app/templates/index.ts |
| `app-tw-empty` 템플릿에 값이 든 `.env.example` 과 `app/{globals.css,layout.tsx,page.tsx}`, 템플릿 `.gitignore` 의 `.env*` · `.vercel` · `next-env.d.ts`, tsconfig 의 strict · `@/*` | https://github.com/vercel/next.js/tree/v16.4.2/packages/create-next-app/templates |
| `reactCompiler` 는 16.0 부터 최상위 옵션, `babel-plugin-react-compiler` 를 dev 로 설치 | https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler (lastUpdated 2026-10-02) |
| Cache Components 는 `cacheComponents` 와 `partialPrefetching` 을 함께 적고, 다음 큰 판에서 모두 켜지며 옵션이 없어진다 | https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents (lastUpdated 2026-10-15) |
| Turbopack 은 16.0 부터 dev · build 기본, 타입 검사는 하지 않음, tsconfig `paths` 와 PostCSS 설정을 읽음 | https://nextjs.org/docs/app/api-reference/turbopack (lastUpdated 2026-10-06) |
| `next build` 는 기본으로 저장소의 `tsc` CLI 로 tsconfig 전체(시험 포함)를 검사, TS 7 은 CLI 로 받되 JavaScript 컴파일러 API 가 없음 | https://nextjs.org/docs/app/api-reference/config/typescript (lastUpdated 2026-08-25) |
| `next dev` 가 에이전트를 알아보면 AGENTS.md 를 만들고 `agentRules: false` 가 끈다, 생성기는 `--no-agents-md`, 판에 맞는 문서는 `node_modules/next/dist/docs/` | https://nextjs.org/docs/app/api-reference/config/next-config-js/agentRules (lastUpdated 2026-09-22) · https://nextjs.org/docs/app/guides/ai-agents (lastUpdated 2026-10-15) |
| Claude Code 는 CLAUDE.md 가 있으면 AGENTS.md 를 읽지 않는다 | https://code.claude.com/docs/en/memory |
| Tailwind 문서(v4.3)의 Next 설치는 `@tailwindcss/postcss` + `postcss.config.mjs` + `@import "tailwindcss"` | https://tailwindcss.com/docs/installation/framework-guides/nextjs |
| `@tailwindcss/turbopack` 은 tailwindlabs/tailwindcss 저장소의 'Turbopack loader for Tailwind CSS v4' | `npm view @tailwindcss/turbopack@4.3.3 repository description` |
| Biome 2.5: 도메인(next · react · test · playwright · drizzle · tailwind 등)은 `linter.domains` 에 recommended · all · none, `linter.rules.recommended` 는 낡은 이름(`preset`), `biome migrate --write`, `biome ci`, `--reporter=github`, `css.parser.tailwindDirectives`, `files.includes` 의 `!` · `!!` | https://biomejs.dev/linter/domains/ · https://biomejs.dev/reference/configuration/ · https://biomejs.dev/reference/cli/ ($schema 2.5.15) |
| `noFocusedTests`(권장, 경고) · `noSkippedTests`(비권장, 경고), 둘 다 test 도메인 | https://biomejs.dev/linter/rules/no-focused-tests/ · https://biomejs.dev/linter/rules/no-skipped-tests/ |
| Vitest 5: `test.projects` 인라인 프로젝트는 뿌리 설정을 물려받음(5.0 부터 기본), `--project` 로 하나만, Vite 6.4 · Node 22.12 이상, `vite` 는 직접 의존이 아님, `clearMocks` 기본 켜짐, 부모 폴더 설정을 찾지 않음 | https://vitest.dev/guide/projects (v5.0.5) · https://vitest.dev/guide/migration |
| vitest 5.0.5 피어 `vite ^6.4.0 \|\| ^7 \|\| ^8`, engines node `^22.12.0 \|\| ^24 \|\| >=26` | `npm view vitest@5.0.5 peerDependencies engines` |
| Vite 의 `resolve.tsconfigPaths`(기본 false)가 tsconfig `paths` 를 읽음 | https://vite.dev/config/shared-options (v8.3.4) |
| Playwright 1.64.1 의 iPad 기기: iPad (gen 5 · 6 · 7 · 11) · iPad Mini · iPad Pro 11(834 × 1194, 2배율, WebKit, 터치) — 10.9형 없음 | https://github.com/microsoft/playwright/blob/v1.64.1/packages/isomorphic/deviceDescriptorsSource.json |
| iPad Air(5세대) 10.9형 2360 × 1640, 264ppi → 2배율 CSS 820 × 1180(계산) | https://support.apple.com/en-ae/111887 |
| Node 24(Krypton)는 LTS, 26 은 Current | https://nodejs.org/en/about/previous-releases (2026-10-14 갱신) |
| Vercel Node 24.x 가 기본, `engines.node` 가 프로젝트 설정보다 앞섬 | https://vercel.com/docs/functions/runtimes/node-js/node-js-versions (last_updated 2026-02-27) |
| Vercel pnpm 지원 6~10, 잠금 파일 9.0 이면 새 프로젝트는 pnpm 10, Corepack 이면 `packageManager` 를 따름 | https://vercel.com/docs/package-managers (last_updated 2026-08-11) |
| pnpm 11 을 Vercel 에서 쓰다 실패한 커뮤니티 글, 직원 답 없음, Corepack 환경 변수로 된다 · 안 된다가 갈림 | https://community.vercel.com/t/pnpm-v11-support/41674 (2026-05-11 ~ 06-12) |
| pnpm 12 는 Node 18~26, pnpm 11 은 Node 22 · 24 · 26 을 받음 | https://pnpm.io/installation |
| pnpm 은 CI 에서 잠금 파일 고정으로 바뀌고, 11 부터 맞지 않는 잠금 파일이면 실패 | https://pnpm.io/continuous-integration |
| `pnpm/action-setup@v6` 는 `packageManager` 에서 판을 읽고 `cache` 입력이 있음(예시 판 10), `pnpm/setup@v3` 는 pnpm 11 이상과 런타임을 함께 설치 | https://github.com/pnpm/action-setup · https://github.com/pnpm/setup |
| `actions/setup-node@v7` 의 `cache: pnpm` 은 pnpm 이 먼저 설치되어 있어야 하고 `node-version-file` 로 `.nvmrc` 를 읽음, `actions/checkout@v7` 이 최신 | https://github.com/actions/setup-node · https://github.com/actions/checkout |
| `vercel.json` 의 `regions`(Hobby 는 지역 하나), `$schema` 주소, icn1 = 서울(ap-northeast-2), 함수 기본 지역은 iad1 | https://vercel.com/docs/project-configuration/vercel-json (last_updated 2026-08-14) · https://vercel.com/docs/regions (last_updated 2026-08-11) |
| shadcn CLI init 옵션(`-t` · `-b`(base · radix · aria) · `-p` · `-y` · `-d`), init 은 의존 설치 · `cn` 유틸 · CSS 변수 설정, 스타일은 init 뒤 못 바꿈 | https://ui.shadcn.com/docs/cli · https://ui.shadcn.com/docs/components-json |
| GitHub 비밀 검사에서 Anthropic API Key 는 push 보호 대상 | https://docs.github.com/en/code-security/secret-scanning/introduction/supported-secret-scanning-patterns |
| 로컬: Node v26.8.2(nvm) · pnpm 없음 · corepack 없음 · `git remote -v` 빈 결과, git 이 한글 경로를 NFC 로 저장 | 2026-10-16 이 저장소에서 확인 |

## 증명 (Proof)

| 수용 기준 | 증명 | 파일 · 명령 |
|---|---|---|
| 공통 — 린트 | `pnpm lint`(biome check) 오류 0, CI `ci / lint` | `biome.json` · `.github/workflows/ci.yml` |
| 공통 — 빌드 | `pnpm build`(next build, tsc 타입 검사 포함) 성공, CI `ci / build` | `next.config.ts` · `tsconfig.json` |
| 공통 — 단위 | `pnpm test` 통과. 시험 "환경 변수 견본: 모든 줄이 주석 · 빈 줄 · '이름=' 꼴이고 값이 없다" · "환경 변수 견본: 이름이 겹치지 않는다", CI `ci / unit` | `tests/unit/env-example.test.ts` · `vitest.config.ts` |
| 공통 — 통합 자리 | `pnpm test:int` 가 시험 0개로 통과 | `vitest.config.ts` |
| 공통 — 화면 흐름 자리 | `pnpm e2e` 통과. 시험 "뼈대: 첫 화면이 10.9형 태블릿 화면(820 × 1180)에서 열리고 문서 언어가 ko 다" | `tests/e2e/smoke.spec.ts` · `playwright.config.ts` |
| 10절 판 | `node -v` 24.x · `pnpm -v` 10.34.7 · `pnpm ls --depth 0` 이 '설치 판' 표와 같음(완료 보고에 출력) | `package.json` · `.nvmrc` |
| 10절 함수 지역 | `vercel.json` 의 `regions` 가 `["icn1"]`. 실제 적용 확인은 H1 | `vercel.json` |
| 비밀값 없음 | `git grep -nE "sk-ant-[A-Za-z0-9_-]{16,}\|postgres(ql)?://[^ ]+:[^ ]+@"` 0건, `.env.example` 은 이름만(단위 시험) | 작업 7 |
| CI | GitHub 에서 `ci / lint · build · unit` 초록, `integration · e2e · seed-validate` skipped | `.github/workflows/ci.yml`(작업 8 뒤) |

AC 번호로 시작하는 시험은 이 plan 에 없다. 이 plan 의 몫은 묶음 plan 증명 표의 '공통' 행이고, AC-N4 의 P1 몫은 P1b 다.

## 완료 보고 (Done)

구현 뒤 채운다. 적을 것: 실제 바뀐 파일(계획과 다른 것 표시), init 이 넣은 shadcn 의존 판과 고른 값, pnpm 이 막은 설치 스크립트 이름, 명령 출력(통과 수), 남긴 것, 커밋 · PR.
