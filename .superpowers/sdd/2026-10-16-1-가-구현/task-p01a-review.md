# 검토 브리프: P1a 뼈대(code-reviewer · Opus · xhigh, 읽기 전용)

대상: 브랜치 `feature/1a-p01a-skeleton` 의 작업 트리(커밋 전. `git status` 의 새 파일 전부와 `.gitignore` 의 diff). 코드를 고치지 않는다. 읽기 전용 명령(`git status` · `git diff` · `pnpm lint` · `pnpm test` · `pnpm build` · `pnpm ls`)은 돼도 파일을 바꾸는 명령은 안 된다. 셸 명령은 `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && ` 로 시작한다.

## 읽을 것(순서)
1. plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p01a-뼈대.md` — '파일별 값' 1~13, '바뀌는 파일', '설치 판', '증명', '정할 것' 끝의 결정(컨트롤러 10:3x).
2. 구현 브리프 `.superpowers/sdd/2026-10-16-1-가-구현/task-p01a.md` — 허용 파일 · 금지 사항.
3. 구현 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p01a-report.md` — '계획과 다르게 한 것' 6 · '우려' 넷.
4. 작업 트리의 파일들(위 git status).
5. 정본은 필요한 곳만: `specs/08-테스트와-기술.md` 9절(테스트 · CI) · 10절(기술 구성), `.claude/CLAUDE.md` Conventions.

## 볼 것
1. plan 준수. 파일별 값 1~13 마다 실제 파일과 맞대고 ✓ · ✗ · 다름(까닭 타당한지)을 판정한다. 허용 파일 밖 변경이 없는지(`git status`). '설치 판' 표와 `package.json` 의 정확한 판(`^` 없음) · `packageManager` · `engines`. `next.config.ts` 에 `agentRules: false` 가 있고 `cacheComponents` 가 없는지. `biome.json` 의 preset · domains · includes 제외 넷 · `tests/**` 오류 승격 둘. `tsconfig.json` 의 strict · exclude. `.gitignore` 의 줄 순서(`!.env.example` 이 `.env*` 아래). `.env.example` 이 이름만인지. `vercel.json`. CI 작업 파일의 액션 판(checkout v7 · pnpm/action-setup v6 · setup-node v7) · `node-version-file` · `cache: pnpm` · `--frozen-lockfile` · 자리 셋 `if: ${{ false }}`.
2. 시험의 질. `tests/unit/env-example.test.ts` 가 주석 · 빈 줄 · `이름=` 꼴만 허용하고 값 · 겹침을 잡는지(경계: `이름= ` 뒤 공백, 따옴표 빈 값 `이름=""`, BOM, 마지막 줄 바꿈 없음). `tests/e2e/smoke.spec.ts` 가 뷰포트 상수를 설정에서 가져오고 `lang` 을 확인하는지, 흔들릴 요소(시간 · 네트워크)가 있는지. 보고의 '시험 먼저 확인한 실패' 서술이 코드와 맞는지.
3. 품질 · 보안. TypeScript strict 위반 · 불필요한 any, Playwright `webServer` 명령(빌드 두 번 도는 구조의 비용), 비밀값 · 가짜 키 꼴 0건, `.env.local` 없음, 아이 화면 문구 새로 지은 것 없음(`page.tsx` 빈 main), 용어(영역 · 단계 · 단원 · 활동) · 한국어 문구.
4. 구현자 우려 넷과 컨트롤러 결정의 적용 방법을 검증한다(지적 표에 넣고 근거 · 적용 방법을 적는다).
   - 가 `/Users/hikaru/package-lock.json` 때문의 작업 폴더 뿌리 경고 → 컨트롤러 결정: `next.config.ts` 에 `turbopack.root` 를 저장소 뿌리로 둔다. Next 16.4.2 의 설치 문서(`node_modules/next/dist/docs/`)에서 정확한 키 이름 · 값 꼴(`__dirname` · `import.meta.dirname` 가운데 next.config.ts 에서 되는 것)을 확인해 적는다.
   - 나 Vitest 가 `vitest.config.ts` 를 CommonJS 로 읽는 경고 → 컨트롤러 결정: `vitest.config.mts` 로 이름을 바꾼다(`"type": "module"` 은 쓰지 않는다). 이름을 바꿔도 `pnpm test` · `test:int` · CI 가 그대로 도는지, plan · 다른 파일에서 그 이름을 참조하는 곳이 있는지 본다.
   - 다 `layout.tsx` 의 Geist(`next/font/google`) → 컨트롤러 결정: 지금 뺀다(빌드가 Google Fonts 에 닿지 않게). 빼면 `globals.css` 의 글꼴 변수 참조가 어떻게 되는지, 최소 변경(어느 줄)을 적는다. 글꼴 자체는 P5 · P10 몫.
   - 라 `.claude/settings.json` 이 Biome 범위에 듦 → 컨트롤러 결정: 범위에 둔다(P1b 의 `.claude/hooks/*.ts` 도 린트 대상). 지금 깨지는 것이 없는지만 확인.
   - 그 밖에 보고의 '다르게 한 것' 1~6 이 타당한지(특히 shadcn 의 `cn` 패키지 · 런타임 의존 `shadcn` · `radix-ui` 를 그대로 둔 것, `pnpm-workspace.yaml` 을 옮기지 않은 것).

## 보고
`.superpowers/sdd/2026-10-16-1-가-구현/review-p01a.md` 에 쓴다(Bash 로 파일을 쓴다. 다른 파일은 만들거나 고치지 않는다).
- 머리: 판정(Approved · Changes requested), 확인한 명령과 결과.
- 지적 표 `| 번호 | 심각도(Critical · Important · Minor) | 파일:줄 | 내용 | 근거(plan 값 번호 · 정본 절 · 공식 문서 URL · 실행 결과) | 고칠 방향 |`. 근거 없는 지적은 넣지 않는다. 컨트롤러 결정 가~라의 적용 방법도 행으로.
- 설계 준수 표: 파일별 값 1~13 마다 ✓ · ✗ · 다름(타당 · 부당).
- 마지막 메시지: 판정 · 심각도별 수 · 가장 중요한 지적 셋, 10줄 안쪽.
