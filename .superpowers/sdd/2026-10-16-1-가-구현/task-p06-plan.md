# 브리프: P6 하위 plan 작성(시드 확정 · 규격 파일 · 목업 맞추기)

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
- `intent/2026-10-15-모모-잉글리시-아카데미/plan-p06-시드-확정.md`(상태 draft). 이 P 는 코드가 아니라 자료(JSON 규격 파일 · 그림 카탈로그 · 목업 수정)와 결정(단원 틀 값 H5)이 산출물이다. 분량이 크면 a(규격 파일 — can-do · level_specs · unit_specs · 단원 틀 값 · settings.json · 목록 넷 · model_prices) · b(vocab 과 배정표 · 그림 카탈로그 · 목업 맞추기)로 나눈다. 브랜치 제안 `feature/1a-p06a-seed-reference` · `feature/1a-p06b-vocab-images`(바탕 P4c 6bd6015 — `pnpm seed:validate` 가 규격 파일을 검증한다).
- 구현자는 implementer 가 아니라 `curriculum-designer`(Opus · xhigh)와 `design-reviewer`(검토)다 — 그 에이전트 정의(`.claude/agents/curriculum-designer.md` · `design-reviewer.md`)를 읽고 plan 의 작업 순서를 그 역할에 맞춘다(묶음마다 `pnpm seed:validate` 로 규격 파일 오류 0 을 확인하며 쌓는다).
- 보고 `task-p06-plan-report.md`.

## 이 P 에서 더 읽을 것
- 정본 `specs/02-1-영역-단원-승급.md` 3.1 · 3.2(단원 틀 표 · 배정 · 관계 표), `specs/02-2-세션과-단계표.md` 3.3 단계표 전부 · 3.4 · 3.6, `specs/02-3-어휘-복습-동기-점수.md`, `specs/05-AI-호출.md` 6.1 모델 구성 · 조합 표 · 6.6(Opus 캐시 단가가 비어 있음 — P4a 견본은 Sonnet 비율 값이니 옮기지 말 것), `specs/06-시드-생성.md` 6.3 (1) 규격 확정 · 6.4, `specs/09-설정값.md` 12절 전부(45키 · 기본값 · '결정 기록 먼저' 키), `specs/01-개요.md` 11절 (3) · 목업 표, `specs/11-요구사항과-수용-기준.md` AC-7a · AC-7c, 13절 C44 · C45 · C50 · C54 · C58 · C60. 목업 캔버스(`docs/media/mockups/`, CLAUDE.md 의 캔버스 링크)와 `docs/research/`.
- P4 가 정한 규격 · 영어 값 · 역할을 그대로 따른다: plan-p04a '규격 칸' 절(settings.json · level-specs · unit-specs · vocab · images · model-prices · 목록 넷 · 수업 파일 · 회화 카드 · 평가 · 기록)과 `src/core/seed/schema/reference.ts` · `structure.ts`(영어 값 C54 (3) · C60: 회화 토막 `greeting · today_words · practice · talk · more_talk · wrap_up`, 라이선스 `cc0 · cc_by · generated`, 품사에 `function`), 글 조각 역할(gloss · option · ko — 끝맺음 조건은 한국어). P4 검토에서 P6 에 넘긴 메모를 모두 작업 · 제약에 넣는다: 형태 표 정규식은 낱말 경계를 정확히(견본 `\b[a-z]+ed\b` 가 red · bed 를 잡음 — 낱말 목록 또는 불규칙형과 함께), 활용형 칸에 불규칙형 · 축약형 전부, 줄임말은 점까지(`Mr.` · `a.m.`), `function` 표시는 주로 문법으로 쓰는 낱말만(관대함의 크기를 정함), 금지어 목록에 활용형 꼴 함께, 견본 Opus 캐시 단가 옮기지 말 것(6.6 빈칸은 컨트롤러가 13절로), `{NAME}` 앞뒤는 빈칸 · 바로 뒤에 글자 금지, 소수 · a.m. · 'd 표기 규칙(plan-p02 다-7).
- [사람] H5(단원 틀 값 — 구간별 정규 · 보강 · 변형 수업 수 · 최소 수업 · 최소 학습일 · 단원 단어 수를 curriculum-designer 가 근거와 함께 제안하고 요청자가 확인, 13절 한 줄) · H6 · H7(묶음 plan 87~105줄). 요청자 확인 전에 할 수 있는 것과 뒤에 할 것을 가른다.

## P6 범위(배정표 79줄 그대로)
- can-do 48 · level_specs 48 · unit_specs 240 + 알파벳 2 · 구간별 단원 틀 · vocab(단계 어휘 범위 · 활용형 · 품사 · 그림 키) · 배정표 · 그림 카탈로그(CC0 · CC-BY · 자체 생성 — `public/images/vocab/`, 출처 · 저작자 표시) · model_prices 와 조합 표 · settings.json(12절 45키) · 목록 넷(동음이의어 · 금지어 · 형태 표 · 메타 문장) · 평가 유형별 문항 수 · 목업 맞추기(`docs/media/mockups/`) · 13절 한 줄(H5). 완료 판정: `pnpm seed:validate` 규격 파일 오류 0, H5 · H6 · H7. 증명: `pnpm seed:validate` · design-reviewer 보고(심각도 · 근거).
- 범위 밖: 수업 · 평가 본문(P8), 적재(P7).

## 꼭 확인할 사실
- 그림 출처(CC0 · CC-BY 묶음)와 저작자 표시 꼴, 초등 영어 어휘 목록의 공개 출처(교육과정 · CEFR A1~B1 낱말 목록 — 출처와 라이선스), 1~12단계 어휘 범위를 정하는 근거. 자체 생성 그림의 길(1-가 범위에서 필요한지).
- 규격 파일 크기 · 수(level_specs 48 · unit_specs 242 · vocab 수 추정)와 curriculum-designer 가 한 묶음에 쓸 수 있는 분량(토큰) — 묶음 나누기와 묶음마다 검증 · 검토 차례.
