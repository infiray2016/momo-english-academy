# 브리프: P9 하위 plan 작성(AI 호출 층)

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
- `intent/2026-10-15-모모-잉글리시-아카데미/plan-p09-AI-호출-층.md`(상태 draft). 파일 열 개를 넘으면 a(서버 전용 클라이언트 · 모델 구성 · 가짜 클라이언트 · ai_calls 기록 · 비용 · 오류 분류 · 가림) · b(호출 넷 Zod · 정규화 · 실시간 출력 검사 · 조합 검사 · 호출 앞 판정 · 비용 알림 · 안전 상한 · AI 계약 · 관찰표)로 나눈다. 브랜치 제안 `feature/1a-p09a-ai-client` · `feature/1a-p09b-ai-calls`(바탕 P3a 25041d9 — ai_calls · ai_status · model_prices 테이블 · 설정 읽기 · 한 시계를 쓴다. P3b 와 P4 를 쓰면 적는다).
- 보고 `task-p09-plan-report.md`.

## 이 P 에서 더 읽을 것
- 정본 `specs/05-AI-호출.md` 6절 전부(6.1 모델 구성 · 조합 표 · 프롬프트 캐시 · 서버 측 대체 모델 재시도 · 거절 재시도 · ai_calls 열 — C56 (2) learning_day · price_missing · 단가표 · 6.2 호출 넷 규격(쓰기 확인 · 첨삭 · 말하기 평가 · 생각 꺼내기 · 회화 턴은 1-나) · 6.4 끝 문단(실시간 출력 검사) · 6.6 비용), `specs/07-음성과-오류.md` 8절 오류 처리('AI 쉬는 중' 하나로 — 확인 호출 1토큰 · 5 · 15 · 30분 · 한 시간에 한 번, 상황 표), `specs/08-테스트와-기술.md` 9절 AI 계약 · 관찰표 · 실시간 호출 표본 평가, 10절, `specs/09-설정값.md` 12절 ai.* 키 전부(모델 · effort · 생각 · max_tokens · timeout · 안전 상한 · 콘솔 한도 · 알림 비율 · 하루 알림 150), `specs/11-요구사항과-수용-기준.md` AC-4b · 5d · 8a · 8b · 8c · 8i · 8n · N2 · N4, 13절 C17 · C21 · C28 · C48 · C49 · C51(sdk-only-in-ai) · C56. CLAUDE.md Conventions(모델 셋 · structured outputs + Zod · 실시간 호출은 비용으로 아이 진행을 끊지 않음 · 'AI 쉬는 중').
- P3a 코드: `src/db/schema/operations.ts` 의 ai_calls(열거형 ai_purpose · ai_call_status · ai_rest_reason, 열) · ai_status · model_prices(content.ts), `src/server/settings` · `src/server/clock`(시각은 한 시계 값을 매개변수로 — 질의 SQL 안에 now() 금지, P3a 검토 메모), jsonb customType(비울 수 있는 jsonb 는 JSON null 과 NULL 구별 안 됨 — JSON null 을 뜻으로 쓰지 않는다), `tests/integration/test-db.ts`. P3b 의 `requireAccess`(서버 액션 첫 문장 — 훑기 시험이 `requireAccess` 식별자 출처는 안 보므로 가져오기 꼴을 통일). P4 의 `model-prices.json` 규격(reference.ts)과 6.6 Opus 캐시 단가 빈칸(컨트롤러 13절 몫 — '컨트롤러가 정할 것'에 올린다).
- 묶음 plan 역분석 제안 5(관찰표) · 위험(비용 · 거절 · 타임아웃) · [사람] H4(개발용 Anthropic 워크스페이스 · 키 · 월 지출 한도) · H12. 1-가 호출 표본 평가(9절: 생각 단계 기본값 · ai.max_tokens 를 출력 p99 두 배로, C21)는 실제 키가 있어야 하므로 H4 전 · 뒤를 가른다.

## P9 범위(배정표 82줄 그대로)
- `src/server/ai/`(서버 전용 클라이언트 — max_retries 0 · effort · max_tokens 명시 · '끔' 변환 · Sonnet · Opus 에 fallbacks 와 베타 헤더 server-side-fallback-2026-07-01, Haiku 는 없음 — 호출 넷의 Zod · 정규화 · 실시간 출력 검사 · 조합 검사 · ai_calls 기록 · 비용 셈(답한 모델 · usage.iterations · 단가 없음) · 비용 알림 · 안전 상한 판정 · 호출 앞 판정 · 오류 분류 · 가림 · 확인 호출 · 'AI 쉬는 중' 상태) · `src/core/ai/`(순수 함수: 정규화 · 조합 · 비용 알림 · 가림 · 상태 전이) · `scripts/{ai-contract,ai-observe}.ts` · `tests/fixtures/ai/`(가짜 클라이언트 · 응답 표본). 완료 판정: 가짜 클라이언트로 호출 넷이 기록 · 정규화되고, 실제 표본으로 Zod 계약 시험 통과(H4 뒤). 증명: `tests/unit/{normalize,combo,cost-alert,mask}.test.ts` · `tests/contract/ai-schemas.test.ts` · `tests/integration/{ai-calls,ai-errors}.test.ts` · `pnpm ai:contract`.
- 범위 밖: 회화 턴 · 끝맺음 턴 호출 자체(1-나, 규격 자리만), 화면(P10 · P11), 시드 생성용 호출(P8 · P5).

## 꼭 확인할 사실
- `@anthropic-ai/sdk` 0.135.0(설치판 `node_modules/@anthropic-ai/sdk` 의 형 정의와 README 를 먼저): Messages API 의 effort · thinking 설정 · `output_config` · structured outputs(`zodOutputFormat` — zod 4.6.7 과의 조합) · `fallbacks` 와 베타 헤더 이름 · usage(cache 쓰기 · 읽기 · iterations) · 거절 stop_reason · 타임아웃 · max_retries 0, 스트리밍(회화는 1-나지만 꼴은 정한다). 모델 id 셋(`claude-opus-5-5` · `claude-sonnet-5-5` · `claude-haiku-5-5`)과 단가(6.6, 캐시 단가).
- 비용 셈의 소수 처리(num(12,6)), 하루 안전 상한을 학습일로 세는 질의(C56 (2) learning_day), 확인 호출 1토큰의 꼴, 콘솔 한도 · 계정 오류의 구분 방법(SDK 오류 형).
