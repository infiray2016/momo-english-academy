# 브리프: P9a AI 호출 바탕 구현(implementer impl-p09a, 2026-10-16 23:5x)

역할: implementer(Opus · high). plan-p09a 가 정한 파일 열넷(새 11 · 고침 3)만 만들고 고친다. 시험을 먼저 쓰고 실패를 본 뒤 구현한다. 검토는 하지 않는다(code-reviewer 가 따로). 하위 에이전트 · 커밋 없음. 실제 API 를 부르지 않고 키도 없다. 비밀값 · 아이 이름을 어디에도 적지 않는다(시험의 키는 `test-key` 같은 가짜 글).

## 자리
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p09`(브랜치 feature/1a-p09a-ai-client, 바탕은 P3a 25041d9 와 P4c 6bd6015 를 합친 `feature/1a-base-p3a-p4c`, 의존 설치됨). 모든 파일은 여기에 쓴다. P9b · P9c 도 뒤에 같은 워크트리에서 이어 한다(컨트롤러가 SendMessage 로 지시).
- 정본 · plan 은 메인 저장소 `/Users/hikaru/workspace/momo-english-academy/` 에서 읽는다(워크트리의 specs/ · intent/ 는 낡았다): plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p09a-AI-호출-바탕.md`(approved 23:4x — 머리의 '컨트롤러 결정' 문단까지. b · c 는 머리만), 13절 C1 · C17 · C21 · C51 · C55 · C56 · C61 · C63(`specs/10-결정-기록.md`), 6.1 · 6.6(`specs/05-AI-호출.md`), 8절 상황 표(`specs/07-음성과-오류.md`), 12절 ai.*(`specs/09-설정값.md`), 5절 ai_calls(`specs/04-데이터.md`).
- 명령은 워크트리에서 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴(plan 의 `source ~/.nvm/nvm.sh …` 는 이 꼴로 읽는다 — 서브에이전트 환경이 source 를 막는다). 한글 경로를 명령 인자로 넘기지 않고(`pnpm spec:trace` 는 인자 없이), 보고 파일은 Write 도구로 쓴다. 도구 층이 `\uXXXX` 를 글자로 바꾸므로 이스케이프는 바이트로 확인한다.

## 먼저 읽을 것(순서)
1. 메인 저장소 `.claude/CLAUDE.md`.
2. plan-p09a 전부 — 목표 · 바뀌는 파일 · 파일별 값 1~9(표의 이름 · 규칙 그대로) · 작업 순서 · 위험 · 정할 것 · 확인한 사실 1~11 · 증명(시험 이름).
3. 워크트리의 P3a 코드: `src/db/schema/operations.ts`(ai_calls · ai_status · parent_alerts) · `src/db/schema/content.ts`(model_prices) · `src/db/schema/jsonb.ts` · `src/server/db/index.ts`(getDb · createDb) · `src/server/settings/index.ts`(getSettings · getSetting) · `src/server/clock/index.ts`(now · createClock) · `src/core/learning-day.ts` · `tests/integration/{global-setup,test-db}.ts` · `tests/fixtures/settings.ts` · `tests/integration/rls-grants.test.ts`('더하기만' 검사) · `drizzle/` · `drizzle.config.ts`.
4. 워크트리의 P4c 코드: `src/core/seed/structure.ts`(EFFORTS · bandOf) · `src/core/seed/schema/reference.ts`(ModelPriceSchema · ModelPricesFileSchema) · `tests/fixtures/seed/builders.ts`(견본 단가 표) · `.dependency-cruiser.cjs`(sdk-only-in-ai · ai-only-from-server · core-no-framework · core-no-io) · `scripts/spec-trace.ts`.
5. 설치판 SDK `node_modules/@anthropic-ai/sdk/src`(`client.ts` ClientOptions · `core/error.ts` · `resources/beta/messages/messages.ts` · `resources/beta/models.ts` · `helpers/zod.ts` · `lib/transform-json-schema.ts`).

## 만들 것(plan 작업 순서 1~7 (가))
1. [DB] `src/db/schema/operations.ts` 의 ai_calls 에 `error_code` 열 · `learning_day` 색인(값 1) → `pnpm exec drizzle-kit generate --name=ai_calls_error_code`. 완료: 0002 SQL 이 ALTER TABLE ADD COLUMN · CREATE INDEX 두 문장뿐(출력을 보고에), `pnpm test:int` 의 '더하기만' · RLS 시험 통과, `pnpm build` 통과.
2. 시험용 자료: `tests/fixtures/settings.ts`(값 2) · `tests/fixtures/ai/model-prices.ts`(값 3) · `tests/fixtures/ai/fake-anthropic.ts`(값 9). 완료: `ai-client.test.ts` 의 '가짜:' 시험 통과.
3. 조합(시험 먼저): `tests/unit/combo.test.ts` → (가) `src/core/seed/schema/reference.ts` 의 `thinkingDefault` 를 `z.enum(["adaptive", "none"])` 로 → (나) 바탕에 `seed/model-prices.json` 이 있으면 opus-4-8 행을 none 으로(이 바탕에는 seed/ 가 없다 — 건너뜀) → (다) `src/core/ai/combo.ts`(값 4). 완료: AC-8i 시험 통과, `pnpm test` 전체(P4 시험 포함) 통과, `pnpm check:deps` 0.
4. 실패 분류 · 비용(시험 먼저): `tests/unit/ai-outcome.test.ts` → `src/core/ai/failure.ts`(값 6) · `src/core/ai/cost.ts`(값 5).
5. 클라이언트(시험 먼저): `tests/unit/ai-client.test.ts` → `src/server/ai/client.ts`(값 7). 가짜 fetch 로 SDK 오류 갈래 넷(타임아웃 · 연결 · 500 · 400)이 값 6 표대로.
6. 기록(시험 먼저): `tests/integration/ai-store.test.ts` → `src/server/ai/store.ts`(값 8). 완료: `pnpm test:int` 통과(embedded-postgres, 첫 시작 약 4초).
7. 마무리 (가): CI 와 같은 순서 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle`, `grep -rn "sk-ant-" src tests` 0건. 완료: 출력이 보고에 있고 spec-trace 의 missing-test 가 바탕보다 1 적다(AC-8i).
하지 않는 것: P9b · P9c 파일, 공용 파일(package.json · next.config.ts · ci.yml · vitest · playwright · biome · .env.example · .dependency-cruiser.cjs) 수정, 실제 호출, 정본 · plan 수정, 설계 숫자를 코드에 박기.

## 지킬 것
- 시험 이름은 plan 증명 표 글자 그대로(spec-trace 가 AC-8i 로 시작하는 이름을 센다). 시험 숫자는 `TEST_SETTINGS` · `MODEL_PRICES_FIXTURE` 에서 읽는다.
- 의존 규칙: `@anthropic-ai/sdk` 는 `src/server/ai` 에서만, `src/core/ai` 는 SDK · DB · 시계 · Next 를 가져오지 않는다(SDK 형도 구조로 받는다 — 값 5 `MessageLike`). `src/server/ai/*` 첫 줄 `import "server-only"`.
- 요청 본문에 temperature · top_p · top_k · metadata 를 넣지 않는다. maxRetries 0 · logLevel warn · OpenTelemetry 끔 · authToken null · 키는 `ANTHROPIC_API_KEY` 만(C63 (5)). 시각은 넘긴 시계 값으로, SQL 안에 now() 금지(P3a). JSON null 을 뜻으로 쓰지 않는다.
- 비용은 정수 마이크로달러(값 5), 기록은 6.1 · C56 · C63 (3) 열 그대로. 마이그레이션은 더하기만, 시각 기본값 없음.
- 코드 식별자는 영어, 주석 · 보고는 한국어(용어: 영역 · 단계 · 단원 · 활동 · 호출 · 시도).

## 보고
`.superpowers/sdd/2026-10-16-1-가-구현/task-p09a-report.md`(워크트리, Write 도구): 상태 · 바뀐 파일 · 시험 수(바탕 → 새 수, 단위 · 통합) · 0002 SQL 전문 · 작업 7 (가) 명령과 출력 첫 줄 · 계획과 다르게 한 것 · 남긴 것 · 검토자에게 알릴 것. 마지막 메시지는 상태(DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED) + 요약 한 줄.
