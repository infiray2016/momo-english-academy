# 검토: P1a 뼈대(code-reviewer · Opus · xhigh)

판정: **Changes requested** · 2026-10-16 · 대상 `feature/1a-p01a-skeleton` 작업 트리(커밋 전) · 브리프 `task-p01a-review.md`
심각도별 수: Critical 0 · Important 2 · Minor 4

plan 준수는 거의 그대로다(파일별 값 13 가운데 ✓ 11 · 다름 2). 고칠 것은 컨트롤러 결정 가~다의 적용(다에는 숨은 함정이 있음)과 `.claude/settings.local.json` 한 줄이다.

## 확인한 명령과 결과

모든 명령은 `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null &&` 로 시작했다. 저장소 파일은 바꾸지 않았다(`tsconfig.json` · `package.json` · `pnpm-lock.yaml` · `next.config.ts` 해시가 빌드 앞뒤로 같음). 실험용 사본은 모두 저장소 밖 스크래치 폴더에 두었다.

| 명령 | 결과 |
|---|---|
| `node -v` · `pnpm -v` | v24.22.0 · 10.34.7 |
| `git status --porcelain -uall` | 새 파일은 허용 목록과 생성기 · init 파일뿐, `.gitignore` 수정. `.superpowers/…/progress.md` 수정은 컨트롤러의 11:2x 결정 줄이다(구현자 변경 아님) |
| `git diff .gitignore` | 기존 6줄 그대로, 15줄 더함. `.env*` 는 3줄, `!.env.example` 은 21줄 |
| `pnpm lint` · `pnpm exec biome ci .` | Checked 15 files, 오류 0(15개 = 설정 · 소스 · 시험 14개 + `.claude/settings.json`) |
| `pnpm test` | 1 file · 2 tests passed. Vite 경고 "ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set "type": "module"" |
| `pnpm test:int` | 시험 0개, 종료 코드 0 |
| `pnpm build` | 성공(2.6초, 데운 캐시). 경고 "Next.js ignored package-lock.json in /Users/hikaru because it is outside the current Git repository … set `turbopack.root`" |
| `pnpm ls --depth 0` | 30개. '설치 판' 표 + shadcn 몫 여섯과 같다 |
| `pnpm-lock.yaml` importers | specifier 30개 모두 정확한 판(`^` · `~` 0) |
| `git grep -nE --untracked` 비밀값 꼴(plan 작업 7 의 식) | 0건(종료 코드 1). `.env.local` 없음. `git check-ignore`: `.env.example` 은 21줄 부정 규칙, `.env` · `.env.local` 은 3줄로 무시 |
| `pnpm e2e` | 다시 돌리지 않음(구체적 의심 없음. 보고는 1 passed) |

스크래치 실험(저장소 밖):
- next.config.ts 읽기: Next 의 기본 경로(`transpile-config.js` 가 SWC 로 CommonJS 변환)와 같은 옵션으로 `__dirname` · `import.meta.dirname` 두 꼴을 변환 · 실행 → 둘 다 저장소 뿌리. Node 자체 TypeScript 읽기(실험 플래그 경로)에서는 `__dirname` 이 `ReferenceError: __dirname is not defined in ES module scope`, `import.meta.dirname` 만 됨.
- Vitest: 설정 사본을 `vitest.config.mts` 로 두고 `--config … --root 저장소` 로 실행 → 경고 없이 unit 2 passed, integration 0개 통과.
- Tailwind 4.3.3(`@tailwindcss/node`)로 `globals.css` 를 그대로 · 9줄 지운 채로 컴파일해 `:root` 의 `--font-sans` 비교.
- Biome 2.5.15: `JSON.stringify(…, null, 2)` 꼴 JSON 을 표준 입력으로 포맷해 비교, 임시 git 저장소에서 전역 제외 · `.git/info/exclude` · `.gitignore` 별로 `biome ci` 대상 비교.

## 잘한 점

- 판 고정이 꼼꼼하다. shadcn init 이 `^` 로 넣은 의존까지 잠금 파일 판으로 고정해 importers 30개가 모두 정확한 판이다(`package.json:18-51`).
- 시험을 먼저 쓰고 실패를 본 서술이 코드와 맞는다. 견본 없음 → 두 시험 ENOENT, 값 줄 → 값 시험 실패, 겹친 이름 → 겹침 시험 실패, `lang` 을 `en` 으로 → `smoke.spec.ts:10` 실패. Biome 오류 승격도 탐침 파일로 확인하고 지웠다.
- 견본 시험이 경계를 바르게 가른다. 같은 판정식으로 돌려 보니 뒤 공백 `A= ` · 따옴표 빈 값 `A=""` · `export A=` · BOM 바로 뒤 이름은 막고, 마지막 줄 바꿈 없음 · CRLF · BOM 뒤 주석은 통과시킨다. 경로를 `import.meta.url` 로 잡아 실행 폴더에 흔들리지 않는다(`tests/unit/env-example.test.ts:4`).
- e2e 가 뷰포트 상수를 설정에서 가져오고(`smoke.spec.ts:2`) `lang` 을 확인한다. 시간 · 외부 네트워크에 기대는 단언이 없다.
- plan 과 다르게 한 것 여섯을 까닭과 함께 적었고, 우려 넷이 모두 그대로 재현된다.

## 지적

| 번호 | 심각도 | 파일:줄 | 내용 | 근거 | 고칠 방향 |
|---|---|---|---|---|---|
| 1 | Important | `src/app/layout.tsx:3-6,14` · `src/app/globals.css:9` | (결정 다) shadcn init 이 넣은 Geist(`next/font/google`)로 빌드가 Google Fonts 에 닿고, plan 값 6 의 layout(lang · title)을 넘는다. 빼는 데 함정이 있다. `globals.css:9` 의 `--font-sans: var(--font-sans);` 가 빌드 CSS 에 `:root,:host{--font-sans:var(--font-sans)}` 자기 참조로 나오고, 지금은 Geist 클래스가 `<html>` 에서 덮어 가린다. layout 만 고치면 `--font-sans` 가 순환으로 무효가 되어 `html{font-family:var(--font-sans)}` 가 브라우저 기본 글꼴(macOS WebKit 은 Times 계열, 추측)로 떨어지고, 어떤 시험도 잡지 못한다 | plan 파일별 값 6 · 구현 보고 다름 4 · `node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md:13`("CSS and font files are downloaded at build time") · 빌드 CSS `.next/static/chunks/0210bwg92eeah.css` 의 `:root,:host{--font-sans:var(--font-sans)…}` 와 `.aN_Ytq_variable{--font-sans:"Geist", "Geist Fallback"}` · Tailwind 컴파일 실험(9줄 그대로면 자기 참조, 9줄 지우면 `-apple-system, … sans-serif` 기본 묶음) · CSS Custom Properties Level 1 §2.3 Resolving Dependency Cycles · §3.1 Invalid Variables(https://www.w3.org/TR/css-variables-1/, 절 제목은 2026-10-16 확인) | 최소 변경. `layout.tsx` 3줄(`import { Geist }`) · 4줄(`import { cn }`, 쓰는 곳이 없어짐) · 6줄(`const geist`)을 지우고 14줄을 `<html lang="ko">` 로 한다(글꼴은 `globals.css:126-128` 의 `html { @apply font-sans; }` 가 이미 건다). `globals.css` 는 9줄만 지운다(8줄 `--font-heading: var(--font-sans);` 은 기본 묶음을 가리키게 되므로 둔다). `src/lib/utils.ts` 는 둔다(P5 구성 요소가 씀). 고친 뒤 빌드 CSS 의 `:root` `--font-sans` 가 기본 묶음인지 본다. 컨트롤러는 plan 완료 보고에 '다름 4 → 결정 다로 뺌'을 적는다 |
| 2 | Important | `.gitignore:1-21`(줄 없음) · `biome.json:3-21` | (결정 라) 지금 깨지는 것은 없다(`.claude/settings.json` 은 `{}`, 15개 통과). 그러나 Claude Code 가 권한 물음에 '다시 묻지 않기'로 답하면 `.claude/settings.local.json` 을 줄마다 한 항목 꼴로 만들고, Biome 는 짧은 배열을 한 줄로 접으므로 `biome ci` 가 포맷 오류로 깨진다. 이 컴퓨터에서는 git 도 그 파일을 무시하지 않는다(전역 제외 파일이 `~/.gitignore_global` 로 정해져 있고 거기엔 없음, Claude Code 가 적은 `~/.config/git/ignore` 는 git 이 읽지 않음). 결과로 요청자가 권한을 한 번 허락하면 코드 변경 없이 `pnpm lint` 가 빨개지고, P1b 의 구현자 Stop 관문(`biome ci .`)이 남의 파일 때문에 막으며, 개인 설정이 커밋될 수 있다 | Claude Code 설정 문서 https://code.claude.com/docs/en/settings(2026-10-16 받음: "Claude Code adds it to your global git excludes the first time it writes the file … if you create the file by hand, add it to `.gitignore` yourself", 처음 쓰는 때는 "Yes, and don't ask again") · `~/workspace` 의 다른 `settings.local.json` 셋 모두 배열을 펼친 꼴 · Biome 표준 입력 포맷 실험(`"allow": [` 펼친 꼴 → 한 줄로 바뀜) · 임시 저장소 실험(Biome 는 `.gitignore` · `.git/info/exclude` 는 따르고 `core.excludesFile` 은 안 따름, 이 컴퓨터 설정에서 `git check-ignore` 결과 '무시 안 됨') · plan-p01b 122줄(Stop 관문이 `biome ci .`) | `.gitignore` 끝에 `.claude/settings.local.json` 한 줄을 더한다(P1a 허용 파일, 문서가 권하는 길). git 과 Biome(vcs 무시 파일)가 함께 뺀다. `.claude/` 의 나머지(설정 · P1b 훅)는 결정대로 Biome 범위에 둔다. `.claude/settings.json` 을 `/hooks` 등으로 고친 뒤에는 `pnpm format` 을 돌린다는 한 줄을 P1b 브리프에 넣는다 |
| 3 | Minor | `next.config.ts:6-8` | (결정 가) `/Users/hikaru/package-lock.json` 때문에 빌드 · 시작 때 경고가 난다. 뿌리는 이미 저장소로 잡혀 동작은 같고(16.4.2 는 git 경계 밖 잠금 파일을 버림) 소음만이다. CI · Vercel 에서는 나지 않는다 | `pnpm build` 경고 문구(위 표) · `node_modules/next/dist/lib/find-root.js`(git 경계 · 홈 폴더에서 멈추고 `warnRootBoundary`) · `node_modules/next/dist/server/config.js:737-769`(두 뿌리 값이 없을 때만 경고, 정하면 `outputFileTracingRoot` 도 같은 값으로 채움, 둘을 다르게 정하면 경고) · `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/turbopack.md:49`("`root` … Should be an absolute path") · 같은 문서 104-113줄(CommonJS `next.config.js` 예 `path.join(__dirname, '..')`) · `node_modules/next/dist/build/next-config-ts/transpile-config.js:39-41,66-89`(기본은 SWC CommonJS 변환, `--experimental-next-config-strip-types` 면 Node 자체 읽기) · 스크래치 실험(기본 경로 둘 다 됨, 자체 읽기에서 `__dirname` 실패) · `node_modules/@types/node/module.d.ts:585`(`ImportMeta.dirname: string`) | 키는 `turbopack.root`, 값은 절대 경로 문자열. `turbopack` 객체 안 `rules` 위에 `root: import.meta.dirname,` 한 줄을 더한다(두 읽기 경로 모두에서 저장소 뿌리, 타입 검사 통과). `__dirname` 도 기본 경로에서는 되지만 실험 플래그를 켜면 깨진다. `outputFileTracingRoot` 는 따로 적지 않는다. 컨트롤러는 plan 값 3 의 코드 블록 · 완료 보고에 이 줄을 적는다 |
| 4 | Minor | `vitest.config.ts:1` | (결정 나) Vite 8 이 설정을 CommonJS 로 읽는다는 경고. 시험은 통과한다 | `pnpm test` 경고(위 표) · Vitest 설정 찾기 목록 `node_modules/vitest/dist/chunks/constants.-juJ8b_4.js:6-15`(`vitest.config` × `.ts` · `.mts` · `.cts` · `.js` · `.mjs` · `.cjs`, `.ts` 가 먼저) · 스크래치 `.mts` 실험(경고 없음, unit 2 passed, integration 0개 통과) · `tsconfig.json:31`(include 에 `**/*.mts` 가 이미 있음) | 내용은 그대로 두고 파일 이름만 `vitest.config.mts` 로 바꾼다. `.ts` 를 남기면 `.ts` 가 먼저 잡혀 경고가 그대로다. `package.json` 스크립트 · `ci.yml` 은 설정을 자동으로 찾으므로 바꿀 것이 없고, `next build` 타입 검사 · Biome 도 `.mts` 를 본다. 이름을 적은 곳은 plan-p01a 26 · 36 · 161 · 274 · 367 · 368줄, 묶음 plan.md 28줄, 구현 브리프 19줄, 구현 보고 15줄(P1b plan 에는 없음). 구현자는 plan 을 고칠 수 없으므로 컨트롤러가 고치거나 완료 보고에 적는다 |
| 5 | Minor | `tests/e2e/smoke.spec.ts:9` | `page.viewportSize()` 는 화면을 재지 않고 설정에 넣은 값을 돌려준다. 그래서 이 단언은 `devices['iPad Pro 11']` 펼침 뒤 덮어쓰기 순서만 잡고, 페이지가 실제로 820 × 1180 으로 그려졌는지(예: 뷰포트 메타가 빠져 모바일 흉내가 980 폭으로 그리는 경우)는 보지 못한다 | `node_modules/.pnpm/playwright-core@1.64.1/node_modules/playwright-core/lib/coreBundle.js:62896,63240`(`_viewportSize = initializer.viewportSize`, `viewportSize()` 는 그 값을 돌려줌) · plan 작업 5 완료 '시험이 뷰포트 820 × 1180 을 확인' | 한 줄을 더한다. `page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))` 의 결과가 `TABLET_10_9_VIEWPORT` 와 같은지 본다. 지금 단언은 둔다(덮어쓰기 순서 검사로 쓸모가 있음) |
| 6 | Minor | `tests/unit/env-example.test.ts:11-14` | 주석 줄은 내용을 보지 않아 `# DATABASE_URL=실제값` 처럼 값을 단 채 주석으로 막은 줄이 통과한다. plan 작업 7 의 `git grep` 은 키 · 비밀번호 꼴만 잡고 한 번 돌리는 확인이며, P1b 번들 검사는 `.next/static` 만 본다 | 스크래치 판정식 실험('commented value' 통과) · plan 위험 2(값이 든 견본이 들어오는 것을 막는 시험) · plan-p01b 109-115줄 | 주석 줄 가운데 `^#\s*[A-Z][A-Z0-9_]*=\S` 꼴(이름=값을 주석으로 막은 줄)을 위반으로 세는 조건을 더하고, 시험 이름은 그대로 둔다. 설명 주석 안의 `=` 는 이름 꼴이 아니라 걸리지 않는다 |

## 설계 준수(plan 파일별 값 1~13)

| 값 | 판정 | 확인한 것 |
|---|---|---|
| 1 생성기 명령 | ✓(⚠️ 명령 자체는 diff 밖) | 결과물이 옵션과 맞다. Biome 설정 · `turbopack.rules` · `reactCompiler` · `src/` · `@/*`, `cacheComponents` 없음, AGENTS.md 없음. 옮긴 다섯 그대로, `README.md` · `next-env.d.ts` 안 옮김. 다름 1(`.env.example` 안 생김)은 결과가 같아 타당 |
| 2 `package.json` | ✓ | 머리 · 스크립트가 plan 블록과 글자까지 같다. `packageManager: "pnpm@10.34.7"` · `engines.node: "24.x"`, `"type"` 없음, 모든 판 정확(`^` 없음). 생성기 `"version"` 을 뺀 것은 plan 블록대로 |
| 3 `next.config.ts` | ✓ | `reactCompiler: true` · `agentRules: false` · `turbopack.rules['*.css']` 그대로, `cacheComponents` · `partialPrefetching` 없음(결정 가는 지적 3) |
| 4 `tsconfig.json` | ✓ | `strict: true` · `moduleResolution: "bundler"` · `paths` `@/*` → `./src/*`, `exclude: ["node_modules", "tests/.tmp"]` |
| 5 `biome.json` | ✓ | `$schema` 2.5.15, `rules.preset: "recommended"`, `domains` next · react `recommended`, vcs git · `useIgnoreFile`, `ignoreUnknown`, `includes` 제외 넷(`!docs` · `!specs` · `!intent` · `!.superpowers`, 생성기 넷 함께), 2칸, `tailwindDirectives`, `organizeImports: on`, `overrides` `tests/**` 의 `noFocusedTests` · `noSkippedTests` `error` |
| 6 `src/app` | 다름(부당, 고칠 것) | `lang="ko"` · title · 빈 `<main />` 은 맞다. Geist 줄은 값 6 밖이다(지적 1, 결정 다) |
| 7 shadcn | 다름(타당) | `-b radix` 에 `-p nova` 를 더함(다름 6, plan 값 7 '기본값으로 답함'). `components.json` style `radix-nova` · neutral · CSS 변수 · lucide |
| 8 `.env.example` | ✓ | plan 블록과 글자까지 같다(주석 여섯 · 이름 다섯 · 값 없음, 마지막 줄 바꿈 있음) |
| 9 `.gitignore` | ✓ | 기존 6줄 그대로, 15줄 순서 그대로, `!.env.example`(21줄)이 `.env*`(3줄) 아래. 지적 2 의 한 줄을 더할 몫 |
| 10 `vitest.config.ts` | ✓ | 내용이 plan 블록과 같다(따옴표 · 세미콜론은 Biome 포맷). 결정 나는 지적 4 |
| 11 `playwright.config.ts` | ✓ | 상수 넷(`TABLET_10_9_VIEWPORT` 내보냄 · `E2E_PORT` · `SERVER_START_TIMEOUT_MS` · `CI_RETRIES`), `iPad Pro 11` + 뷰포트 덮어쓰기, `forbidOnly` · `retries` · `webServer` 그대로 |
| 12 `vercel.json` | ✓ | `$schema` · `regions: ["icn1"]` |
| 13 `ci.yml` | ✓ | `actions/checkout@v7` · `pnpm/action-setup@v6`(판 입력 없이 `packageManager` 읽음) · `actions/setup-node@v7`(pnpm 뒤, `node-version-file: .nvmrc` · `cache: pnpm`), `pnpm install --frozen-lockfile`, lint 는 `biome ci --reporter=github .`, build · unit 은 준비 네 줄을 풀어 씀, 자리 integration · e2e · seed-validate 셋 다 `if: ${{ false }}` + `echo` + 채울 하위 plan 주석 |
| 설치 판 · 바뀌는 파일 | ✓ | `pnpm ls --depth 0` 이 표와 같고 shadcn 몫 여섯은 보고 표와 같다. 허용 밖 변경 없음 |

## 구현 보고 '다르게 한 것' 1~6

| 번호 | 판정 | 까닭 |
|---|---|---|
| 1 `.env.example` 생성기 안 만듦 | 타당 | 새로 쓴 결과가 plan 값 8 과 같다 |
| 2 `cn@0.4.0` · `radix-ui` · `shadcn` 런타임 의존 | 타당 | `cn` 은 의존 0개, 저장소 `github.com/shadcn-ui/cn`(`node_modules/cn/package.json`). `shadcn` 은 `globals.css:3` 이 `shadcn/tailwind.css` 를 가져와 빌드에 필요하다(`exports["./tailwind.css"]` → `./dist/tailwind.css`). 의존 33개짜리 CLI 라 잠금 파일이 커지지만 init 기본값이고, devDependencies 로 옮겨도 Vercel 빌드 결과는 같아 지금 옮길 까닭이 약하다. `radix-ui` 는 결정 다(radix 바탕)의 통합 패키지 |
| 3 `^` 를 정확한 판으로 | 타당 | '설치 판' 머리 '모두 정확한 판으로 고정'. 잠금 파일 내용 바뀜 없음 |
| 4 Geist 남김 | 고칠 것 | 결정 다로 뺀다(지적 1의 함정 주의) |
| 5 `pnpm-workspace.yaml` 안 옮김 | 타당 | plan 값 1 의 옮길 다섯에 없다. 내용(`ignoredBuiltDependencies`)은 경고를 줄이는 설정일 뿐이고 sharp · unrs-resolver 는 이 설치에서 막힌 목록에 안 나왔다. 덧붙여 이 파일은 Next 가 작업 공간 표지로 읽어 뿌리 추정에 끼어든다(`find-root.js` 의 `WORKSPACE_MARKERS`). 결정 가로 뿌리를 정하면 상관없다 |
| 6 `-p nova` | 타당 | `-y` 가 프리셋 물음을 건너뛰지 않아 기본 선택을 옵션으로 준 것. plan 값 7 '기본값으로 답함' |

## 살펴봤으나 지적 없음

- webServer 의 빌드 두 번: 데운 캐시에서 `pnpm build` 가 2.6초라 지금 비용은 작다. P1b Stop 관문은 `biome ci` 와 단위 시험만 돌려(plan-p01b 122줄) e2e 빌드가 끼지 않는다. CI e2e 에서 build 작업의 산출물을 넘겨받을지는 P10 몫이다.
- TypeScript strict 위반 · `any` 없음(빌드 타입 검사 통과, `LayoutProps<"/">` 는 Next 가 만드는 타입).
- 비밀값 · 가짜 키 꼴 0건, `.env.local` 없음.
- 아이 화면 문구를 새로 지은 것 없음(`page.tsx` 빈 main, title 은 plan 값 6 그대로).
- 용어: 새 파일의 한국어 주석 · 시험 이름에 '트랙' · '유닛' 없음.

## 재검토 1

판정: **Approved** · 2026-10-16 · fix 라운드 1(구현 보고 `## fix 라운드 1`) · 범위: 지적 1~6 과 이번에 바뀐 파일
지적 6개 모두 ADDRESSED · 새 지적 0 · 새로 깨뜨린 것 없음

### 지적별 판정

| 번호 | 판정 | 근거 |
|---|---|---|
| 1 Important(결정 다) | ADDRESSED | `src/app/layout.tsx:1-14` 에 Geist · `cn` 가져오기와 `const geist` 가 없고 10줄이 `<html lang="ko">` 다. `src/app/globals.css:7-8` 의 `@theme inline` 에서 옛 9줄(`--font-sans: var(--font-sans);`)만 빠졌고, `--font-heading` 과 `html { @apply font-sans; }` 는 남았다. 새 빌드 CSS `.next/static/chunks/1exhgobkgzs7a.css` 의 `@layer theme{:root,:host{--font-sans:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, … sans-serif, …}` 는 기본 묶음이고 `--font-sans:var(--font-sans)` 는 0건이다. `.next/static` 안 Geist 0건, 빌드 HTML 은 `<html lang="ko">` 이고 fonts.g… 참조 0건이다 |
| 2 Important(결정 라) | ADDRESSED | `.gitignore:22` 가 `.claude/settings.local.json` 이다. `git check-ignore -v` 결과는 `.gitignore:22`. Biome 가 저장소 `.gitignore` 를 따르는 것은 1차 검토의 임시 저장소 실험으로 확인했다. 기존 21줄과 순서는 그대로다 |
| 3 Minor(결정 가) | ADDRESSED | `next.config.ts:7` 이 `turbopack` 안 `rules` 위의 `root: import.meta.dirname,` 이고 `outputFileTracingRoot` 는 없다. `pnpm build` 출력에 뿌리 · 잠금 파일 경고가 없다(`warn` · `⚠` · `lockfile` · `package-lock` 0줄). 타입 검사도 통과했다 |
| 4 Minor(결정 나) | ADDRESSED | `vitest.config.ts` 는 없고(`ls`: No such file) `vitest.config.mts:1-23` 의 내용은 옛 파일과 같다. `pnpm test` 출력에 `CommonJS` · `configLoader` 가 0건이고, 2개 통과했다. `pnpm test:int` 는 종료 코드 0 이다. Biome 대상은 그대로 15개(`.mts` 포함)다. plan-p01a 26 · 36 · 162 · 275 · 369줄과 묶음 plan 28줄은 컨트롤러가 새 이름으로 고쳤다. 옛 이름은 지난 구현 브리프 `task-p01a.md:19` 에만 남았고, 기록이므로 둔다 |
| 5 Minor | ADDRESSED | `tests/e2e/smoke.spec.ts:10-15` 가 `page.evaluate` 로 `window.innerWidth` · `innerHeight` 를 재어 `TABLET_10_9_VIEWPORT` 와 비교한다. 9줄의 설정값 단언도 남았다. `pnpm e2e` 는 1 passed(4.8초)이고, 끝난 뒤 3100 포트는 비었다. 구현자의 뷰포트 메타 탐침(`viewport = { width: 1000 }` → 15줄이 `Received width 1000` 로 실패)은 새 단언만 무는 올바른 탐침이다. 상수 탐침이 구조상 실패하지 않는다는 보고도 맞다 |
| 6 Minor | ADDRESSED | `tests/unit/env-example.test.ts:6` 은 `COMMENTED_ASSIGNMENT = /^#\s*[A-Z][A-Z0-9_]*=\S/` 다. 20-24줄은 주석 · 빈 줄에 그 식을 다듬은 줄로 적용하고, 나머지 줄은 전처럼 `이름=` 꼴만 받는다. 시험 이름은 그대로다. 같은 판정식을 스크래치에서 돌리니 저장소 견본은 위반 0이다. `# DATABASE_URL=abc` · `#DATABASE_URL=abc` · 들여 쓴 `  # CRON_SECRET=x` · BOM 뒤 `# CRON_SECRET=x` 는 위반이다. `# CRON_SECRET=`(값 없음) · `# DB 접속 문자열` · `# 설명 a=b` 는 통과다. `pnpm test` 2 passed |

### 다시 돌린 명령

모두 `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null &&` 로 시작했다. 저장소 파일은 이 절 밖에서 바꾸지 않았다.

| 명령 | 결과 |
|---|---|
| `pnpm lint` · `pnpm exec biome ci .` | Checked 15 files, 오류 0 |
| `pnpm test` | 1 file · 2 tests passed, CommonJS · configLoader 경고 0건 |
| `pnpm test:int` | No test files found, 종료 코드 0 |
| `pnpm build` | 종료 코드 0, 경고 0줄 |
| 빌드 CSS · HTML 확인 | 위 지적 1 행 |
| `pnpm e2e` | 1 passed(tablet-10-9-webkit, 4.8초), 앞뒤로 3100 포트 비어 있음 |
| `git check-ignore -v .claude/settings.local.json` | `.gitignore:22` |
| `git grep -nE --untracked` 비밀값 꼴 | 0건(종료 코드 1). `.env.local` · AGENTS.md 없음 |

### 새 지적

없음.

### 범위 밖 관찰(지적 아님)

- 지적 6 의 식은 이 검토가 권한 식 그대로라서 `# 이름= 값`(`=` 뒤 공백) 꼴과 소문자 이름은 통과한다. 지금 견본 꼴에서는 생길 일이 드물다. 더 좁히려면 `=\s*\S` 로 바꾸면 되지만 이번 라운드를 다시 열 까닭은 아니다.
