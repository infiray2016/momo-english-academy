# 브리프: P1a 뼈대 구현

역할: implementer(Opus · high). plan 이 정본이다: `intent/2026-10-15-모모-잉글리시-아카데미/plan-p01a-뼈대.md`(approved 컨트롤러 2026-10-16 10:3x). 이 브리프는 plan 밖의 사실과 허용 범위만 적는다. plan 의 '파일별 값' 1~13 과 '작업 순서'를 그대로 따른다.

## 환경(컨트롤러가 준비함)
- Node 24(v24.22.0)가 nvm 에 설치돼 있다. 기본 Node 는 26 이므로 모든 명령은 `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && …` 로 시작한다(`.nvmrc` 는 네가 작업 2 에서 만든다. 그 전에는 `nvm use 24` 로 판을 적어 부른다).
- pnpm 10.34.7 이 Node 24 쪽에 설치돼 있다(`pnpm -v`).
- 브랜치 `feature/1a-p01a-skeleton` 이 체크아웃돼 있다. 브랜치를 바꾸지 않는다.
- 원격 저장소가 없다. CI 는 돌지 않으니 완료 판정은 plan 작업 7 의 로컬 명령이다.
- 임시 폴더(생성기 실행 등)는 저장소 밖 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/686cc61d-5a44-4211-9d88-26af0ec4ddfa/scratchpad/p01a/` 아래에 만든다.

## 컨트롤러 결정(plan '정할 것' 가~라, 13절 C51)
- 가 Cache Components 끈다(`--no-cache-components`, `next.config.ts` 에 cacheComponents 없음).
- 나 pnpm 10.34.7(`packageManager`).
- 다 shadcn 바탕 radix(`init -b radix -y`), 지금 한다. 더 묻는 것은 기본값으로 답하고 고른 값을 보고에 적는다.
- 라 명령마다 `nvm use 24`.

## 허용 파일(plan '바뀌는 파일' 표 그대로)
- 새로 쓰는 것: `.nvmrc` · `.env.example` · `vitest.config.ts` · `playwright.config.ts` · `vercel.json` · `.github/workflows/ci.yml` · `tests/unit/env-example.test.ts` · `tests/e2e/smoke.spec.ts`.
- 고치는 것: `.gitignore`(기존 줄은 그대로, 줄만 더함).
- 생성기 · init 이 만드는 것(`package.json` · `pnpm-lock.yaml` · `tsconfig.json` · `next.config.ts` · `biome.json` · `src/app/*` · `components.json` · `src/lib/utils.ts` 등)은 plan 파일별 값 2~7 대로 손본다.
- 그 밖의 파일(`specs/` · `intent/` · `docs/` · `.claude/` · `.superpowers/` 의 다른 파일)은 읽기만 한다.

## 순서
plan '작업 순서' 2~7 을 차례로 한다. 작업 1(도구 · 결정)은 끝났다. 작업 8(커밋 · 원격 · PR)은 하지 않는다 — 커밋은 요청자 지시 때 컨트롤러가 한다. `git add` · `commit` · `push` · `checkout` · `stash` 금지(`git status` · `git diff` 는 된다).
시험은 먼저 쓰고(작업 4 · 5) 실패를 본 뒤 통과시킨다. 시험을 건너뛰거나 지우지 않는다.

## 지킬 것
- 설계 · plan 을 바꾸지 않는다. plan 대로 안 되는 것(생성기 옵션이 없음, 판이 없음, init 이 다르게 묻음)은 가장 가까운 길을 택하고 보고의 '계획과 다르게 한 것'에 까닭과 함께 적는다. 정본 · plan 파일은 고치지 않는다.
- 비밀값을 만들거나 적지 않는다. `.env.local` 을 만들지 않는다. 가짜 키 꼴도 적지 않는다.
- 아이 화면 문구를 새로 짓지 않는다(`page.tsx` 는 빈 `<main />`, `layout.tsx` 는 plan 파일별 값 6).
- 설치는 plan '설치 판' 표의 판으로 정확히(`-E`). `pnpm up --latest` 금지.
- Playwright 브라우저는 `pnpm exec playwright install webkit` 만.
- 용어는 영역 · 단계 · 단원 · 활동. 코드 식별자는 영어.

## 보고
`.superpowers/sdd/2026-10-16-1-가-구현/task-p01a-report.md` 에 적는다: 바뀐 파일(계획과 다른 것 표시) · 명령 출력 요지(`pnpm lint` 오류 0, `pnpm build` 성공, `pnpm test` 통과 수, `pnpm test:int` 0개 통과, `pnpm e2e` 1 통과, `pnpm ls --depth 0`) · shadcn init 이 넣은 판과 고른 값 · pnpm 이 막은 설치 스크립트 이름 · 남긴 것과 우려. 마지막 메시지 첫 줄은 DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED 가운데 하나이고 그 뒤 요지 10줄 안쪽.
