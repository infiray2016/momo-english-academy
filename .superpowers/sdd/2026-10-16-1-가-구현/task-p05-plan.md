# 브리프: P5 하위 plan 작성(풀이 검사 · 시드 보기 화면)

역할: 계획자(general-purpose · Opus · xhigh). 코드를 만들지 않고 plan 파일과 보고만 쓴다. 설치 · 생성 명령(`pnpm add` · `npx` · `pnpm create`)은 실행하지 않는다. 판 확인용 `npm view <패키지> version` 과 공식 문서 읽기(WebFetch · WebSearch)는 된다. 저장소의 다른 파일은 고치지 않는다. 읽기 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH` 를 앞에 둔다(서브에이전트 환경이 `source ~/.nvm/nvm.sh` 와 한글 경로 인자를 막는다).

## 바탕(지금 저장소 상태, 2026-10-16 22:1x)
- 메인 브랜치 `feature/1a-p01b-quality-gates` 끝 d55ead3(문서). 구현은 브랜치마다 격리 워크트리에서 했고 커밋은 요청자 지시로 했다: P2a `feature/1a-p02a-speech-core` 2f222d5 → P2b `feature/1a-p02b-speech-probe` b1b17d7, P3a `feature/1a-p03a-db-clock` 25041d9 → P3b `feature/1a-p03b-access`(커밋 대기, 워크트리 `.claude/worktrees/agent-a4f928c00fc43a1e8`), P4a `feature/1a-p04a-seed-spec` c3f6baf → P4b f27ae15 → P4c `feature/1a-p04c-seed-validate` 6bd6015. 원격은 아직 없다(H15, 요청자 몫) — 브랜치끼리 아직 합치지 않았으므로, 이 plan 의 구현 바탕 브랜치(무엇 위에 가지 칠지)를 plan 머리에 제안한다(필요한 P 의 끝 커밋, 둘 이상이면 컨트롤러가 합친 뒤).
- 코드를 읽을 때는 그 워크트리 또는 `git -C <메인> show <커밋>:<경로>` 로 본다. 워크트리: P2 `.claude/worktrees/agent-a0ffe8037fa827af6`, P3 `agent-a4f928c00fc43a1e8`, P4 `agent-a6ef72438a158a2f3`(모두 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/` 아래).
- 이미 있는 것(하위 plan 과 그 완료 보고 · 구현 보고에서 이름을 확인한다): P1a 뼈대 · P1b 품질 관문(의존 규칙 core-no-framework · sdk-only-in-ai · db-only-from-server · proxy-stays-light · no-fake-speech-in-app · core-no-io, spec-trace, check-bundle, 끝내기 관문은 기록용 — C59). P2 음성(`src/core/speech/*` 순수 함수, `src/core/level-band.ts` 의 `Band` · `bandOf`, `src/lib/speech/{types,browser,fake-web-speech}.ts` 의 `SpeechPort` · `createBrowserSpeech` · `installFakeWebSpeech`, `tests/e2e/fixtures.ts` 의 `test`, 관찰 페이지 `/dev/speech-probe`). P3 DB(스키마 29 `src/db/schema/*`, jsonb 는 `src/db/schema/jsonb.ts` customType, `src/server/db/index.ts` `getDb` · `createDb` · `Db`, `src/server/settings/index.ts` `getSettings` · `getSetting` · 오류 둘, `src/server/clock/index.ts` `now` · `createClock`, `src/core/learning-day.ts`, `tests/integration/{global-setup,test-db}.ts` 의 embedded-postgres · `createTestDatabase` · `seedSettings`, `tests/fixtures/settings.ts`) · 접근 제어(`src/server/access/guard.ts` `requireAccess` · `requireCron` · `hasValidAccess`, `src/proxy.ts`, `src/core/access-token.ts`, `tests/e2e/access-cookie.ts` `addAccessCookie`). P4 시드(`src/core/seed/structure.ts` 상수 · 영어 값 · 역할 `TEXT_ROLES`(gloss · option · ko 포함) · 칸 키 · 경로, `schema/*.ts` Zod 규격, `text.ts` 글 도구, `tests/fixtures/seed/builders.ts` 견본 · `miniSeed`, `src/core/vocab/allocate.ts`, `reference-index.ts` `buildReferenceIndex` · `index`, `check-lesson.ts` · `check-talk.ts` · `check-assessment.ts` · `check-cross.ts`, `validate.ts` 의 `collectCells` · `expectedCellsOf` · `cellHash` · `itemsOf` · `solveTargets` · `solveStatus` · `validateSeed`, `scripts/seed-validate.ts` `--json` version 1(summary.failed = 실패 칸 + 칸 키 없는 오류, stats.ranges)).
- 결정 기록 13절 C52~C60 을 읽는다(루프 무게 · 음성 보완 · 시드 영어 값 · P3 기술 선택 · 해석 · 접근 코드 화면 · 기능어 표시 · 관문 기록용 · 영어 값 통일). 설계를 바꾸지 않는다 — 정본과 다르게 해야 하면 plan '위험 · 정할 것'에 적고 보고의 '컨트롤러가 정할 것'에 올린다. 컨트롤러가 13절에 한 줄 먼저 넣은 뒤 구현한다.
- 요청자 결정 C52: 기능 작업은 전체 루프(이 plan → 컨트롤러 승인 → implementer → code-reviewer xhigh → fix ≤3). plan 은 PR 하나 분량(파일 열 개 · 단계 여덟 이하), 넘으면 a · b 로 나누고 각 파일 머리에 서로를 가리킨다(묶음 plan 위험 12). 공용 파일(`package.json` · `vitest.config.mts` · `playwright.config.ts` · `.github/workflows/ci.yml` · `.env.example` · `.dependency-cruiser.cjs` · `next.config.ts` · `biome.json`)을 고쳐야 하면 '요청하는 공용 변경' 절에 모아 적는다 — 구현자가 자기 워크트리에서 옮기고 컨트롤러가 합칠 때 충돌을 푼다(P3 · P4 에서 그렇게 했다).
- 환경 사실: 서브에이전트 도구 층이 명령 · 파일 글의 `\uXXXX` 를 글자로 바꾸므로 이스케이프는 바이트로 확인한다. 통합 시험은 embedded-postgres(`pnpm test:int`, 첫 시작 약 4초). 구현자는 마이크 · 실기기를 쓸 수 없다.

## 먼저 읽을 것(공통, 순서대로)
1. `.claude/skills/plan-build/SKILL.md` — 템플릿과 지킬 것. 절 이름 그대로.
2. `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` — 묶음 plan. 배정표(69~86줄)의 이 P 행, 작업 순서 4~6(57~59줄), [사람] 단계(87~105줄), 위험(136~159줄) · 정할 것(160~170줄, C50) · 제약(171~185줄), 증명 절 머리(186~193줄)와 증명 표의 이 P 행들.
3. `.claude/CLAUDE.md`, `intent/README.md`, `specs/README.md`, `specs/10-결정-기록.md` 13절(C49~C60 과 이 P 에 닿는 행).
4. 하위 plan 들(`intent/2026-10-15-모모-잉글리시-아카데미/plan-p0{1a,1b,2,3a,3b,4a,4b,4c}-*.md`)의 '완료 보고' · '컨트롤러 결정' 문단 — 특히 이 P 가 가져다 쓰는 이름과 '다른 P 에 넘길 것' 메모.

## 지킬 것
- 증명은 시험 · 명령 이름으로. 시험 이름은 증명 표의 AC 로 시작하고(spec-trace 가 센다, 지금 missing-test 58~62), 시험 하나가 AC 둘을 덮으면 `AC-1a · AC-1b` 처럼 이어 적는다. 단위 시험은 빠르고 DB · 네트워크 없이, 통합 시험은 `tests/integration` 에.
- 용어는 영역 · 단계 · 단원 · 활동. 영어 개발 용어는 알맞은 우리말로. 코드 식별자는 영어. 아이 화면 문구는 정본 · 목업 그대로(해요체, 한 화면 한 행동, 큰 글자).
- 설계 숫자는 `settings` 설정값(12절)에서 읽는다. 꼴 · 구조 수는 `structure.ts`(C54 (2)). 코드 · 시험 상수에 박지 않는다. 키가 12절에 없으면 '컨트롤러가 정할 것'.
- AI 호출은 서버 코드에서만, 키는 서버에만, 응답은 Zod 로 검증(CLAUDE.md). 비밀값 · 아이 이름은 어디에도 적지 않는다.
- 권한이 필요한 단계는 [사람] 으로 표시하고 묶음 plan H 번호를 단다. 커밋 · PR 은 요청자 지시 때(H14).
- 확인한 사실은 출처 URL · 판 · 확인 날짜를 표에 적는다. 확인 못 한 것은 '(추측)'.
- 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p0N-plan-report.md`: 쓴 파일 · 확인한 사실 · (추측) · 묶음 plan 과 다르게 한 것 · 컨트롤러가 정할 것(권하는 답과 13절 한 줄 필요 여부) · 요청하는 공용 변경 · 다른 P 에 넘길 것. 마지막 메시지는 보고 요지 10줄 안쪽.

## 만들 것
- `intent/2026-10-15-모모-잉글리시-아카데미/plan-p05-풀이-검사-시드-보기.md`(상태 draft). 파일 열 개를 넘으면 a(풀이 검사 명령 `pnpm seed:check`) · b(로컬 전용 시드 보기 화면 · 활동 표시 컴포넌트)로 나눈다. 브랜치 제안 `feature/1a-p05a-seed-check` · `feature/1a-p05b-seed-viewer`(바탕은 P4c 6bd6015 — 보기 화면이 P3b 접근 제어를 타면 그것도 적는다).
- 보고 `task-p05-plan-report.md`.

## 이 P 에서 더 읽을 것
- 정본 `specs/06-시드-생성.md` 6.3 만드는 순서 (0) 끝 '풀이 검사' · 6.4 풀이 검사 행(대상 문항 · 판단 same · 사람 확인 · 해시 바뀌면 다시) · 사람 표본 검토, `specs/05-AI-호출.md` 6.1(모델 구성 — 풀이 검사는 claude-sonnet-5-5 · effort low · between_tools, 수업 하나에 한 호출, structured outputs + Zod) · 6.6, `specs/08-테스트와-기술.md` 9절 시드 검증 · 시드 표본 평가 · 11절 (2-1), `specs/03-화면.md` 의 활동 표시(시드 보기는 로컬 개발 서버만 · 어른용), `specs/11-요구사항과-수용-기준.md` AC-7d · AC-7f, 13절 C50 · C51(sdk-only-in-ai) · C54 · C58 · C60.
- P4 코드 · 보고에서 약속된 꼴: `schema/records.ts` 의 `CheckFileSchema` · `CheckRecordSchema`(seed/checks 기록 — `contentHash` · 판단 · `extraAccepted` · `human`), `validate.ts` 의 `cellHash` · `itemsOf` · `solveTargets` · `solveStatus` · `collectCells` · `expectedCellsOf`, `scripts/seed-validate.ts` 의 `--json`(version 1 · summary.failed 뜻 · stats.ranges), `builders.ts` 견본 · `miniSeed`. 풀이 검사가 쓰는 해시 · 문항 번호 · 대상은 그 함수를 그대로 쓴다(바꾸면 13절 — plan-p04c 위험 5).
- `src/server/ai` 는 아직 없다(P9 가 만든다, 작업 순서 4 에서 P5 ∥ P9). 풀이 검사 명령은 개발 때 도는 스크립트라 서버 코드가 아니지만 Anthropic SDK 를 쓴다 — 의존 규칙 `sdk-only-in-ai`(`@anthropic-ai/sdk` 는 `src/server/ai` 에서만)와 어떻게 맞출지 정한다(제안: 스크립트가 `src/server/ai` 의 클라이언트를 가져오되 P9 전에는 얇은 임시 클라이언트를 `scripts/` 안에 두고 P9 뒤 바꾸거나, P9 를 기다린다). CI 는 API 를 부르지 않는다(AC-7d) — 풀이 검사 명령은 로컬에서 요청자 키(H4 개발용 Anthropic 키 · 월 지출 한도)로만 돈다.
- 묶음 plan 역분석 제안 9(아이 눈 순회 질문 넷) · 위험 · [사람] H4(개발용 Anthropic 워크스페이스 · 키) · H6 · H7.

## P5 범위(배정표 78줄 그대로)
- `scripts/seed-check.ts`(수업 하나에 한 호출, 칸 내용 해시로 `seed/checks/` 에 기록, 사람 확인 목록) · `src/app/dev/seed-viewer/`(로컬 전용 보기 화면, 운영 · 프리뷰 빌드에서 빠짐 — P2b 의 `page.preview.tsx` 꼴을 참고하되 '로컬만'의 길을 정한다) · `src/components/activities/`(활동 표시 컴포넌트 — 아이 화면이 쓸 것의 첫 판, 포스트잇 보드 꾸밈은 P10 과 맞춤) · `seed/{checks,reviews}/`. 완료 판정: 시험용 칸이 풀리고 CI 는 API 0회로 저장 결과만 읽는다. 증명: `tests/unit/solve-check.test.ts` · `tests/e2e-local/seed-viewer.spec.ts` · `pnpm e2e:local`(새 Playwright 프로젝트 · 명령 — 공용 변경).
- 범위 밖: 시드 본문(P8), AI 호출 층 자체(P9), 아이 화면 흐름(P10 · P11).

## 꼭 확인할 사실
- Anthropic SDK 0.135.0 의 structured outputs(`zodOutputFormat`) · effort 설정 · between_tools · 비용 계산에 쓰는 usage 칸, Sonnet 5.5 단가(6.6). 풀이 검사 한 호출의 입력 · 출력 토큰 추정과 1-가 범위 비용(묶음 plan 증명 절).
- Next.js 16 에서 '로컬 개발 서버에서만' 페이지를 두는 길(dev 전용 라우트 · `pageExtensions` 접미 · 환경 변수) 과 P3b proxy(쿠키 요구, `/dev/*` 도 쿠키 — C57) 아래서 로컬 보기 화면을 어떻게 여는지(개발 때 접근 코드를 한 번 넣는지).
- Playwright 프로젝트를 둘(`e2e` · `e2e-local`)로 나누는 설정 꼴.
