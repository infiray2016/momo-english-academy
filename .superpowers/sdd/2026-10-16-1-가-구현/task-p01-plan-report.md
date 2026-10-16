# 보고: P1 하위 plan 작성(뼈대 · 품질 관문)

브리프: `task-p01-plan.md` · 쓴 사람: 계획자(브리프 지정 general-purpose · Opus · xhigh) · 일시: 2026-10-16 · 상태: DONE_WITH_CONCERNS(착수 전에 컨트롤러가 정할 것 넷)

## 쓴 파일

| 파일 | 줄 | 파일 수(생성기 뺌) | 작업 수 |
|---|---|---|---|
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p01a-뼈대.md` | 377 | 9(새 8 · 수정 1) | 8 |
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p01b-품질-관문.md` | 262 | 10(새 8 · 수정 2) | 7 |
| 이 보고 | — | — | — |

합치면 파일 19 · 작업 15 라 위험 12 기준(열 · 여덟)을 넘어 둘로 나눴다. 두 파일 머리가 서로를 가리킨다. 순서는 P1a → P1b → (P2 ∥ P3 ∥ P4)를 권한다. P1b 가 implementer 정의를 바꾸기 때문이다.
코드 · 설치 · 프로젝트 생성 명령은 돌리지 않았다. `npm view` 는 `version` 밖에 `engines` · `peerDependencies` · `dependencies` · `repository` · `description` 필드도 읽었다(모두 읽기 전용 조회, 판 호환 확인용). 로컬 확인은 `node -v` · `which` · `git remote -v` · `git config` · `git grep` 같은 읽기 명령뿐이다. 정본과 묶음 plan 은 고치지 않았다.

## 확인한 사실(47건, 2026-10-16)

| 번호 | 사실 | 출처 · 판 |
|---|---|---|
| 1 | 설치 판: next · create-next-app 16.4.2, react · react-dom 19.3.1, typescript 7.0.2(5.x 끝 5.9.3 · 6.x 끝 6.0.3), tailwindcss · @tailwindcss/turbopack · @tailwindcss/postcss 4.3.3, @biomejs/biome 2.5.15, vitest 5.0.5, vite 8.3.4, @playwright/test 1.64.1, dependency-cruiser 18.6.0, drizzle-orm 0.45.4, drizzle-kit 0.31.11, postgres 3.4.9, @anthropic-ai/sdk 0.135.0, zod 4.6.7, motion 14.3.0, server-only 0.0.1, tsx 4.23.15, babel-plugin-react-compiler 1.0.0, shadcn 4.21.5, @types/node 24.19.2, @types/react · react-dom 19.3.0, @node-rs/argon2 2.2.2, pnpm 12.11.2(10.x 끝 10.34.7, 11.x 끝 11.28.6) | `npm view`(2026-10-16) |
| 2 | next@16.4.2 engines node `>=20.9.0`, 피어 react `^19` · babel-plugin-react-compiler `*` | `npm view next@16.4.2 engines peerDependencies` |
| 3 | create-next-app 옵션과 기본값(Cache Components 는 App Router 기본, AGENTS.md 기본, `--biome` · `--react-compiler` · `--empty` · `--skip-install` · `--disable-git` · `--yes`), Turbopack 기본 | https://nextjs.org/docs/app/api-reference/cli/create-next-app (2026-09-29) |
| 4 | 허용 목록(`.claude` · `docs` · `.git` · `.gitignore` 등) 밖 파일이 있는 폴더는 거부 — 이 저장소의 `intent` · `specs` · `.superpowers` 때문에 뿌리에서 못 만든다 | github.com/vercel/next.js v16.4.2 `packages/create-next-app/helpers/is-folder-empty.ts` |
| 5 | 16.4.2 템플릿: Tailwind + Turbopack 이면 `@tailwindcss/turbopack` 과 `turbopack.rules['*.css']`(postcss 설정 없음), typescript `^5`, @types/node `^20`, Biome 2.4.2 와 `lint: biome check`, `reactCompiler: true`, Cache Components 를 켜면 `partialPrefetching` 도 | v16.4.2 `packages/create-next-app/templates/index.ts` |
| 6 | `app-tw-empty` 템플릿에 값이 든 `.env.example`(`MY_HOST="example.com"`)과 `app/` 파일 셋 | v16.4.2 `templates/app-tw-empty/ts` |
| 7 | 템플릿 `.gitignore` 의 `.env*` · `.vercel` · `next-env.d.ts`, tsconfig 의 strict · bundler · `@/*` | v16.4.2 `templates/app-tw/ts` |
| 8 | proxy.ts 는 뿌리나 `src/`, `proxy` 이름이나 default 내보내기, 16.0 부터 Node 런타임 기본(P3 참고) | https://nextjs.org/docs/app/api-reference/file-conventions/proxy (2026-09-04) |
| 9 | `reactCompiler` 는 16.0 부터 최상위 옵션, babel-plugin-react-compiler 를 dev 로 | https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler (2026-10-02) |
| 10 | Cache Components 는 `cacheComponents` 와 `partialPrefetching` 을 함께 적고, 다음 큰 판에서 모두 켜져 옵션이 없어진다 | https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents (2026-10-15) |
| 11 | Turbopack 은 16.0 부터 dev · build 기본, 타입 검사를 하지 않음, tsconfig `paths` · PostCSS 설정을 읽음 | https://nextjs.org/docs/app/api-reference/turbopack (2026-10-06) |
| 12 | `next build` 는 기본으로 저장소 `tsc` CLI 로 tsconfig 전체(시험 포함)를 검사, TS 7 은 CLI 로 받되 JavaScript 컴파일러 API 가 없음, Node 22.18 부터 TypeScript 지원이 기본 | https://nextjs.org/docs/app/api-reference/config/typescript (2026-08-25) |
| 13 | `next dev` 가 에이전트를 알아보면 AGENTS.md 를 만들고 `agentRules: false` 가 끔, 생성기는 `--no-agents-md`, 판에 맞는 문서는 `node_modules/next/dist/docs/` | https://nextjs.org/docs/app/api-reference/config/next-config-js/agentRules (2026-09-22) · https://nextjs.org/docs/app/guides/ai-agents (2026-10-15) |
| 14 | Claude Code 는 CLAUDE.md 가 있으면 AGENTS.md 를 읽지 않음 | https://code.claude.com/docs/en/memory |
| 15 | Tailwind 문서(v4.3)의 Next 설치는 `@tailwindcss/postcss` + `postcss.config.mjs` | https://tailwindcss.com/docs/installation/framework-guides/nextjs |
| 16 | `@tailwindcss/turbopack` 은 tailwindlabs/tailwindcss 저장소의 Turbopack 로더 | `npm view @tailwindcss/turbopack@4.3.3 repository description` |
| 17 | Biome 2.5: 도메인(next · react · test · playwright · drizzle · tailwind 등), `linter.rules.recommended` 는 낡은 이름(`preset`), `biome migrate --write`, `biome ci`, `--reporter=github`, `css.parser.tailwindDirectives`, `files.includes` 의 `!` · `!!` | https://biomejs.dev/linter/domains/ · https://biomejs.dev/reference/configuration/ · https://biomejs.dev/reference/cli/ (schema 2.5.15) |
| 18 | `noFocusedTests`(권장, 경고) · `noSkippedTests`(비권장, 경고) | https://biomejs.dev/linter/rules/no-focused-tests/ · https://biomejs.dev/linter/rules/no-skipped-tests/ |
| 19 | Vitest 5: `test.projects` 인라인 프로젝트가 뿌리 설정을 물려받음, `--project`, Vite 6.4 · Node 22.12 이상, vite 가 직접 의존이 아님, `clearMocks` 기본 켜짐, 부모 폴더 설정을 찾지 않음 | https://vitest.dev/guide/projects (v5.0.5) · https://vitest.dev/guide/migration |
| 20 | vitest 5.0.5 피어 vite `^6.4 · ^7 · ^8`, engines node `^22.12 · ^24 · >=26` | `npm view vitest@5.0.5 peerDependencies engines` |
| 21 | Vite `resolve.tsconfigPaths`(기본 false) | https://vite.dev/config/shared-options (v8.3.4) |
| 22 | Playwright 1.64.1 iPad 기기는 gen 5 · 6 · 7 · 11 · Mini · Pro 11(834 × 1194)뿐, 10.9형 없음. 목록 파일은 `packages/isomorphic/` 로 옮겨짐 | github.com/microsoft/playwright v1.64.1 `packages/isomorphic/deviceDescriptorsSource.json` |
| 23 | iPad Air(5세대) 10.9형 2360 × 1640 · 264ppi(2배율 CSS 820 × 1180 은 계산) | https://support.apple.com/en-ae/111887 |
| 24 | Node 24(Krypton) LTS, 26 Current | https://nodejs.org/en/about/previous-releases (2026-10-14 갱신) |
| 25 | Vercel Node 24.x 기본 · 22.x, `engines.node` 가 프로젝트 설정보다 앞섬 | https://vercel.com/docs/functions/runtimes/node-js/node-js-versions (2026-02-27) |
| 26 | Vercel pnpm 지원 6~10, 잠금 파일 9.0 이면 새 프로젝트는 pnpm 10, Corepack 이면 `packageManager` | https://vercel.com/docs/package-managers (2026-08-11) |
| 27 | Vercel 에서 pnpm 11 실패 글, 직원 답 없음, Corepack 환경 변수로 된다 · 안 된다가 갈림 | https://community.vercel.com/t/pnpm-v11-support/41674 (2026-05-11 ~ 06-12) |
| 28 | pnpm 12 는 Node 18~26, pnpm 11 은 Node 22 · 24 · 26 | https://pnpm.io/installation |
| 29 | pnpm 은 CI 에서 잠금 파일 고정으로 바뀜, 11 부터 맞지 않는 잠금 파일이면 실패 | https://pnpm.io/continuous-integration |
| 30 | `pnpm/action-setup@v6`(packageManager 에서 판, `cache` 입력), `pnpm/setup@v3`(pnpm 11 이상 + 런타임) | https://github.com/pnpm/action-setup · https://github.com/pnpm/setup |
| 31 | `actions/setup-node@v7`(`cache: pnpm` 은 pnpm 을 먼저 설치, `node-version-file`), `actions/checkout@v7` | https://github.com/actions/setup-node · https://github.com/actions/checkout |
| 32 | `vercel.json` `regions`(Hobby 는 지역 하나), `$schema` 주소 | https://vercel.com/docs/project-configuration/vercel-json (2026-08-14) |
| 33 | icn1 = 서울(ap-northeast-2), 함수 기본 지역 iad1 | https://vercel.com/docs/regions (2026-08-11) |
| 34 | shadcn CLI init(`-t` · `-b` base · radix · aria · `-p` · `-y` · `-d`), 의존 설치 · `cn` · CSS 변수, 스타일은 init 뒤 못 바꿈 | https://ui.shadcn.com/docs/cli · https://ui.shadcn.com/docs/components-json |
| 35 | GitHub 비밀 검사에서 Anthropic API Key 는 push 보호 대상 | https://docs.github.com/en/code-security/secret-scanning/introduction/supported-secret-scanning-patterns |
| 36 | dependency-cruiser 규칙 꼴(forbidden · from · to · circular · `$1`), 심각도 기본 warn | https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md |
| 37 | dependency-cruiser 옵션(`tsConfig.fileName` · `tsPreCompilationDeps` · `preserveSymlinks` 기본 false · `doNotFollow`) | https://github.com/sverweij/dependency-cruiser/blob/main/doc/options-reference.md |
| 38 | dependency-cruiser 18.6.0 의 지원 TypeScript `>=2.0.0 <7.0.0`, 직접 의존 tsconfig-paths-webpack-plugin 4.2.0, engines node `^22 · ^24 · >=26` | `src/meta.cjs`(main) · `npm view dependency-cruiser@18.6.0` |
| 39 | 15절 AC 116개가 모두 `AC-<숫자 1~2><소문자>` 또는 `AC-N<숫자>` 꼴, 묶음 plan 증명 표 AC 67개가 모두 15절에 있음 | 이 저장소에서 셈 |
| 40 | Anthropic API 키는 `sk-ant-` 로 시작, SDK 는 `ANTHROPIC_API_KEY` 를 자동으로 읽음 | https://platform.claude.com/docs/en/get-api-key |
| 41 | Next 는 `NEXT_PUBLIC_` 환경 변수만 클라이언트에 넣고 나머지 참조는 빈 글로 바꿈, `server-only` 를 클라이언트에서 가져오면 빌드 오류, 패키지 내용은 쓰지 않음 | https://nextjs.org/docs/app/getting-started/server-and-client-components (2026-10-05) |
| 42 | `server-only@0.0.1` 은 `react-server` 조건에 빈 파일, 기본에 오류 문장을 던지는 파일 | https://cdn.jsdelivr.net/npm/server-only@0.0.1/ |
| 43 | 서브에이전트 프런트매터 `hooks`(플러그인 서브에이전트는 무시) · `maxTurns`(부분 출력, 이어 부름), `Stop` → `SubagentStop`, 프로젝트 훅은 작업 공간 신뢰 뒤, 모르는 필드는 조용히 무시 | https://code.claude.com/docs/en/sub-agents |
| 44 | SubagentStop 입력 필드, 종료 코드 2 의 stderr 가 서브에이전트의 다음 지시, `decision: "block"`, 연속 8번 상한(`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`), command 훅 기본 600초, matcher 는 에이전트 종류, 명령 예시의 `${CLAUDE_PROJECT_DIR}` | https://code.claude.com/docs/en/hooks |
| 45 | 로컬: Node v26.8.2(nvm) · pnpm 없음 · corepack 없음 · jq 있음 · `git remote -v` 빈 결과 | 2026-10-16 이 컴퓨터 |
| 46 | 이 저장소 git 은 한글 경로를 NFC 로 저장(`core.precomposeunicode=true`) | `git ls-files` 확인 |
| 47 | 저장소에 이미 `.gitignore`(6줄, `.env*` 포함)가 있고 `.claude/settings.json` 은 `{}`, 사용자 설정의 SubagentStop 훅은 상태 표시 하나뿐 | 이 저장소 · `~/.claude/settings.json` |

## (추측)으로 둔 것(15건)

1. shadcn init 이 PostCSS 설정 없이(`@tailwindcss/turbopack`) Tailwind 4 를 알아본다. 안 되면 PostCSS 로 되돌리는 길을 P1a 위험 5 에 적었다.
2. shadcn `-b` 의 기본값과 init 이 더 묻는 것(preset 등).
3. radix 가 예제 · 문서가 가장 많고, aria 가 터치 누르기를 꼼꼼히 다룬다.
4. pnpm 10 이 막는 의존 설치 스크립트(esbuild · sharp 등)는 막혀도 동작한다.
5. create-next-app 에 모든 옵션을 주면 `--yes` 가 저장된 선택을 끌어오지 않는다.
6. 실제 Safari 는 주소창만큼 보이는 높이가 1180 보다 작다.
7. CI 자리 작업(skipped)을 필수 검사로 걸면 통과로 셀 수 있다.
8. dependency-cruiser 가 pnpm 패키지를 `node_modules/.pnpm/…` 실제 경로로 낸다(정규식이 두 꼴을 받고 시험이 확인).
9. Turbopack 빌드의 출력 배치(`.next/static` · `.next/server/app/*.html|rsc`). 대상 0개면 실패로 막는다.
10. 프런트매터 훅에서 `${CLAUDE_PROJECT_DIR}` 가 펼쳐진다(settings 예시로만 확인).
11. 워크트리에서 돌 때 훅 입력의 `cwd` 가 그 워크트리다.
12. maxTurns 100 이면 하위 plan 하나(60~80 턴 추정)에 넉넉하다.
13. argon2 패키지 이름 `@node-rs/argon2`(묶음 plan 의 추측 그대로).
14. Cache Components 가 숨겨 둔 이전 화면이 '한 화면 한 행동' 흐름과 진행 저장을 흐릴 수 있다(판단).
15. GitHub push 보호가 시험 속 가짜 키 꼴도 막을 수 있다(그래서 실행 때 조각을 잇게 함).

## 묶음 plan 과 다르게 한 것

1. P1 을 P1a(뼈대) · P1b(품질 관문)로 나눴다(위험 12 허용 범위).
2. Tailwind 4 를 PostCSS 플러그인(브리프 가정)이 아니라 create-next-app 16.4.2 기본인 `@tailwindcss/turbopack` 로더로 붙인다. PostCSS 는 되돌릴 길로 적었다. 정본은 'Tailwind CSS 4' 만이라 설계 변경은 아니다.
3. 판 고정: pnpm 10.34.7(묶음 plan 은 'pnpm'), TypeScript 5.9.3(npm 최신 7.0.2 는 dependency-cruiser 가 못 읽음), `@types/node` 24, Biome 2.5.15(생성기 2.4.2 에서 올림), `vite` 8.3.4 직접 설치.
4. 묶음 plan P1 증명에 없던 시험을 더했다: `tests/unit/env-example.test.ts` · `tests/e2e/smoke.spec.ts`(P1a), `tests/unit/dependency-rules.test.ts` · `tests/unit/implementer-stop-gate.test.ts` · `tests/unit/check-bundle.test.ts`(이름 'AC-N4 …', P1b).
5. 새 파일 `.nvmrc` 와 `.claude/hooks/implementer-stop-gate.ts` 를 더했다(묶음 plan 파일 표에는 implementer.md 만).
6. 의존 규칙에 `sdk-only-in-ai`(제안)를 하나 더했다.
7. CI 의 spec-trace 가 지금 0 인 규칙(unknown-ac · plan-ac-not-in-spec)을 처음부터 막는다. missing-test 는 보고만. 브리프 '처음엔 보고만'을 규칙마다 '0 이 되면 막는다'로 읽은 해석이다.
8. 스크립트 이름 `check:deps`(dependency-cruiser)를 새로 정했다. 묶음 plan 스크립트 목록에 없다.
9. Biome `noFocusedTests` · `noSkippedTests` 를 `tests/**` 에서 오류로 올린다(Stop 관문 우회 막기).
10. CI 자리 작업을 `if: ${{ false }}` 로 둔다. bundle-secrets 는 빌드 결과를 넘겨받지 않고 다시 빌드한다.
11. AGENTS.md 를 끈다(`--no-agents-md` · `agentRules: false`). 대신 implementer.md 에 '판에 맞는 Next 문서 `node_modules/next/dist/docs/` 를 먼저 본다' 줄을 넣는다(묶음 위험 19).
12. Cache Components 를 끄기로 권했다(정할 것, 16.4 생성기 기본은 켬).
13. [사람] 단계 둘을 새로 뒀다: 로컬 도구 준비(Node 24 · pnpm 10), GitHub 원격 만들기와 첫 push. 묶음 plan 의 H 표에는 없다(브리프에는 원격 이야기가 있음).
14. `.gitignore` 에 `!.env.example` · `/tests/.tmp/` · Next · Playwright 산출물 줄을 더한다. 생성기 `.gitignore` 로 덮지 않는다.
15. 빈 폴더 자리 파일(`.gitkeep`)을 두지 않는다. 폴더 규약은 plan 표 · Vitest include · 의존 규칙으로 고정한다.
16. spec-trace 는 조사 P3 의 네 규칙(FR ↔ AC · AC → 결정 · 설정 키 ↔ 12절 · 없어진 것)을 하지 않는다(브리프 범위대로, 정할 것).
17. `.env.example` 이름 다섯 가운데 CRON_SECRET 만 정본 이름이고 나머지(DATABASE_URL · ACCESS_CODE_HASH · CLOCK_SHIFT_DAYS · ANTHROPIC_API_KEY)는 제안이다.
18. P1a 에서 10절 스택 패키지를 모두 설치한다(묶음 plan 표 그대로이나 브리프 목록보다 넓다). 뒤 하위 plan 끼리 잠금 파일이 부딪히지 않게 하려는 것이다.

## 컨트롤러가 정할 것

P1a 작업 1(착수 전)에 정할 넷:
- P1a 가. Cache Components. 권함: 끈다. 모든 아이 화면이 요청마다 동적이라 얻는 것이 적다. 켜면 13절 한 줄과 P3 · P10~P12 브리프 패턴이 필요하다. Next 17 에서는 끌 수 없게 된다.
- P1a 나. pnpm 판. 권함: 10.34.7(Vercel 공식 범위). 12 로 가면 H1 에 Corepack 환경 변수가 필요하고 커뮤니티 실패 사례가 있다.
- P1a 다. shadcn 바탕(`-b`). 권함: radix. 스타일은 init 뒤 못 바꾸므로 P5 까지 미루는 것도 선택지다.
- P1a 라. 로컬 Node 24. 권함: 명령마다 `nvm use`. 다른 길은 `nvm alias default 24`(요청자 컴퓨터 전체).

P1b 검토 때 정해도 되는 일곱:
- P1b 가. maxTurns 값(제안 100).
- P1b 나. Stop 관문에서 NEEDS_CONTEXT · BLOCKED 로 끝낼 길(권함: 둔다).
- P1b 다. `sdk-only-in-ai` 규칙(권함: 넣는다).
- P1b 라. spec-trace 를 막는 시점(권함: 0 인 규칙부터, missing-test 는 묶음 작업 10).
- P1b 마. 조사 P3 의 나머지 규칙을 둘 자리(spec 승인 앞 게이트 변경 단위, 또는 설정 키 대조는 P7 check-ids).
- P1b 바. H1 때 Vercel 빌드 명령에 check:bundle 을 더해 실제 비밀값과 대조할지.
- P1b 사. implementer.md 의 '시험(Vitest 단위 · 컴포넌트)' 문구가 9절 '컴포넌트 단위 테스트는 따로 두지 않고'와 어긋난다. 같은 편집에서 고칠지.

묶음 plan 쪽: H 표에 '로컬 도구 준비'와 'GitHub 원격 만들기 · 첫 push'를 더할지(묶음 plan 은 컨트롤러가 고친다).

## 남은 우려

- 로컬 기본 Node 가 26 이고 pnpm · corepack 이 없다. [사람] 작업 1 없이는 구현자가 아무 명령도 못 돈다.
- Stop 관문이 실제로 도는지는 문서만으로 닫히지 않는다(작업 공간 신뢰 · 필드 철자 · `${CLAUDE_PROJECT_DIR}`). P1b 작업 6 의 실기 확인을 건너뛰지 않기를 권한다.
- 번들 검사는 CI 에 비밀값이 없어 값 대조가 0개다. 이름 · 꼴 검사와 로컬 `.env.local` 대조로 덮지만, 실제 값 대조는 Vercel 빌드(정할 것 P1b 바)나 개발자 로컬에서만 된다.
