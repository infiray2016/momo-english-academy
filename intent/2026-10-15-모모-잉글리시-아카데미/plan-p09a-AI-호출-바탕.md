# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P9a AI 호출 바탕(요청 구성 · 서버 클라이언트 · 실패 분류 · 비용 · 기록 · 가짜 클라이언트)

spec: `specs/` 정본(6.1 공통 규칙 · 조합 표 · 서버 측 대체 모델 재시도 · ai_calls 열, 6.6 단가, 8절 'AI 쉬는 중' 들어가는 조건 · 상황 표, 9절 AI 계약 · 통합 행, 12절 ai.* 키, 15절 AC-8i, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P9 행 · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: approved
승인: 컨트롤러 2026-10-16 23:4x(C63, 아래 '컨트롤러 결정'. 요청자는 PR 병합 때 본다 — H14) · 브랜치 · 워크트리: `feature/1a-p09a-ai-client`(바탕은 아래 '바탕 브랜치', 격리 워크트리 하나) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P9 는 손으로 쓰는 파일이 서른여덟(a 14 · b 12 · c 12)이라 셋으로 나눴다(묶음 plan 위험 12, 정할 것 가). 이 파일은 첫째(바탕)다. 둘째 `plan-p09b-AI-호출-넷.md`(입력 가림 · 프롬프트 · 응답 규격 · 정규화 · 실시간 출력 검사)는 이 plan 이 끝난 브랜치 끝에서, 셋째 `plan-p09c-AI-흐름-계약.md`(호출 앞 판정 · 비용 알림 판정 · 실행 흐름 · 공개 함수 · 시드 목록 읽기 · AI 계약 · 관찰표)는 b 끝에서 가지 친다. 셋 다 같은 워크트리 · 같은 구현자로 차례로 한다(P4 a → b → c 와 같은 길).
세 plan 이 같이 쓰는 사실(SDK 0.135.0 · 단가 · 오류 문서 · 대체 모델 재시도)은 이 파일 끝 '확인한 사실과 출처'에만 적고 b · c 는 이 절을 가리킨다. 정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)'이다. 판과 출처는 2026-10-16 에 확인했다.

바탕 브랜치: P3a 끝 `25041d9`(ai_calls · ai_status · model_prices · parent_alerts 테이블, 설정 읽기, 한 시계, 학습일, embedded-postgres 시험 도구)와 P4c 끝 `6bd6015`(`src/core/seed/structure.ts` 의 `EFFORTS` · `bandOf`, `schema/reference.ts` 의 `ModelPriceSchema` · `ModelPricesFileSchema` · `ForbiddenFileSchema`, `text.ts` 글 도구, `tests/fixtures/seed/builders.ts`)를 컨트롤러가 합친 끝이다. P2 · P3b 가 먼저 합쳐져 있으면 그 위에서 가지 친다. P9 는 P3b(접근 확인)를 쓰지 않는다 — P9 의 공개 함수는 P11 의 서버 액션이 첫 문장 `requireAccess()` 뒤에 부른다. P2a 가 합쳐져 `bandOf` 가 `src/core/level-band.ts` 로 옮겨졌으면(P4a 완료 보고 메모) 그것을 가져온다.
P6 승인(컨트롤러 22:3x, 13절 C61 · plan-p06a '컨트롤러 결정')에서 P9 에 닿는 것을 그대로 따른다: 6.6 단가가 채워졌고(C61 (3)), 설정값 꼴은 `ai.thinking.*` 가 `off` · `adaptive`, 단계마다 다른 값(`writing.max_corrections`)은 단계 → 수 사전이며(plan-p06a 정할 것 마), model_prices 규격의 `thinkingDefault` 에 'none' 을 더하는 일은 P9 몫이다(plan-p06a 정할 것 아 — 이 plan 작업 3).

컨트롤러 결정(2026-10-16 23:4x, 정할 것 a 가~사 · b 가~사 · c 가~자): a 가 셋으로 나눔 — 그대로(한 워크트리 · 한 구현자 a → b → c, plan 마다 검토 · fix). a 나 error_code 열 · learning_day 색인 — 더함(C63 (3), 5절 · 6.1 반영). a 다 — 정해진 대로. a 라 기술 선택 — 그대로(C63 (5), b 나 가림 세부 · c 라 목록 실행 때 읽기 포함). a 마 — 확인. a 바 정본 밖 4xx = 같은 오류 — 그대로(C63 (5)). a 사 확인 호출 · 'AI 쉬는 중' 은 1-나 — 그대로. b 가 출력 검사 세부 · 안전한 대사 — 그대로(C63 (4), 6.4 반영). b 다 문법 지적 경계 = level_specs `questions.modelAnswer`(1~3단계만 참) — 그대로(P6 에 전달). b 라 해요체 · b 마 생각 꺼내기 단어 정규화 · b 바 문장 판정 수 · b 사 지시는 영어 — 그대로. c 가 달 경계 = 호출 시각의 한국 달력 달 — 그대로(C63 (1), 6.1 고침). c 나 거절 즉시 재요청 없음 — 그대로(C63 (2), 6.1 고침). c 다 safety_cap 행 · c 마 parent_alerts 종류 값 · c 바 비용 알림 행은 1-나 · c 사 관찰표 결정 규칙(결과는 H4 뒤 13절) · c 아 H4 뒤 두 명령은 요청자가 키를 넣은 뒤 요청자 지시로 컨트롤러 · c 자 월 한도 금액은 요청자 — 그대로. 바탕 브랜치: 컨트롤러가 P3a 25041d9 에 P4c 6bd6015 를 합친 `feature/1a-base-p3a-p4c` 를 만들고 그 위에 feature/1a-p09a-ai-client(워크트리 `.claude/worktrees/p09`). 구현자 환경 메모 고침: 서브에이전트 샌드박스가 `source ~/.nvm/nvm.sh` 를 막으므로 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴이다(a · b · c 작업 순서 머리의 `source …` 는 이 꼴로 읽는다). P5a(풀이 검사 명령)는 fallbacks 가 없어 GA `client.messages.create` + `output_config.format` 으로 두고, P9 는 서버 측 대체가 베타 요청 형에만 있어 베타 create + 머리글로 간다(계획자 보충 23:4x, 확인한 사실 12) — 맞추지 않는다. H4 뒤 P5a `--probe`(GA 길)와 P9c 계약 `talk_config.*`(베타 길)의 결과가 다르면 P5a 를 베타로 옮긴다(한 줄). 계획자가 승인 뒤 보충한 것(확인한 사실 12 · `priceBookOf` 순수 함수로 단가 고르기 · '다른 P 에 넘길 것' · '확인할 사실' 표 · P9c 흐름 9 의 읽는 차례 · 관찰표 'H4 첫 실호출' 표)을 컨트롤러가 확인해 받았다(23:5x).

## 목표 (Goal)

- AI 호출은 서버에서만, Anthropic 공식 SDK 로 한다. 키는 서버 환경 변수에만 두고, SDK 기본 재시도(2회)는 끈다(`maxRetries: 0`, 6.1 · 컨트롤러 결정 C1). 클라이언트는 `ANTHROPIC_API_KEY` 만으로 만들고, 다른 자격 증명 · 디버그 기록 · 추적으로 아이 글이 새지 않게 막는다(NFR-4, 정할 것 라).
- 호출마다 모델 · effort · 생각 단계 · 최대 출력 · 타임아웃을 설정값 `ai.model.<호출>` · `ai.effort.<호출>` · `ai.thinking.<호출>` · `ai.max_tokens.<호출>` · `ai.timeout_seconds.{realtime,feedback}` 에서 읽어 명시한다(6.1, C21). 회화 턴은 `talk_turn.<구간>` 키를 쓰고 끝맺음 턴은 그 값을 쓴다(12절). '끔'은 모델마다 다른 값으로 보낸다 — Sonnet 5.5 between_tools, Haiku 5.5 disabled, Opus 5.5 는 끌 수 없어 adaptive(6.1). 받지 않는 조합은 model_prices 의 조합 칸으로 가려 저장하지 않는다(6.1, AC-8i). Sonnet 5.5 · Opus 5.5 에만 `fallbacks: "default"` 와 머리글 `server-side-fallback-2026-07-01` 을 붙이고 Haiku 5.5 에는 붙이지 않는다(6.1).
- 실패는 8절 표대로 나눈다: 콘솔 지출 한도(400 'You have reached your specified …' · 429 `enforced_spend_limit_reached`) · 계정(401 · 402 · 403) · 장애(연결 · 5xx · 529 · 타임아웃 · 한도 아닌 429) · 다시 보내도 같은 오류(한도 아닌 400 · 404 · 413, C17). 1-가는 분류해 기록만 하고 'AI 쉬는 중' 상태 · 확인 호출은 1-나다(11절, 묶음 위험 8). 분류 결과에 1-나가 쓸 칸(이어진 실패 수에 더하나 · 바로 쉬는 까닭)을 미리 둔다.
- 비용은 호출 시점의 단가표(model_prices)로 센다. 답한 모델이 요청 모델과 다르면 `usage.iterations` 항목마다 그 모델 단가로 더하고, 단가표에 없는 모델은 `claude-opus-4-8` 단가로 세어 '단가 없음'을 표시한다. 출력 전 거절은 분류가 bio · frontier_llm · reasoning_extraction 일 때만, 출력 도중 거절은 나온 만큼 센다(6.1).
- 시도 하나마다 ai_calls 에 한 행을 남긴다(profile_id · session_id · 호출 시각 · 학습일 · 목적 · 요청 모델 · 답한 모델 · 토큰 넷 · 비용 · 단가 없음 · 지연 · 결과 상태, 6.1 · C56 (2)). 같은 날 같은 목적의 '다시 보내도 같은 오류'를 세려고 실패 갈래 열 `error_code` 를 더한다(정할 것 나). 프롬프트 · 응답 본문은 저장하지 않는다(5절 · AC-8c).
- 가짜 Anthropic 클라이언트는 SDK 의 `fetch` 자리에 끼우는 가짜와, 같은 처리기를 감싼 로컬 HTTP 서버다. Vitest 는 fetch 를 주입하고, e2e(P11)는 Next 서버에 `ANTHROPIC_BASE_URL` 로 가짜 서버를 준다. Vercel 배포는 그 변수를 읽지 않으므로 운영 · 프리뷰에서 가짜를 고를 수 없다(묶음 위험 10, P1a 가 P9 에 맡긴 '가짜 AI 고르는 법').
- 완료 판정: 단위 · 통합 시험이 가짜 클라이언트로 요청 본문 · 머리글 · 실패 분류 · 비용 · 기록을 증명하고, 새 마이그레이션이 더하기만이다. 실제 API 는 부르지 않는다(실제 표본은 P9c 의 H4 뒤).

## 바뀌는 파일 (Files that change)

손으로 쓰는 파일은 열넷이다(새 파일 열하나 · 고치는 파일 셋, 시험 파일 넷 포함). drizzle-kit 이 만든 파일은 세지 않는다. 공용 파일은 고치지 않는다.

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/db/schema/operations.ts` | 수정 | ai_calls 에 `error_code` 열 · `learning_day` 색인(파일별 값 1) |
| `src/core/seed/schema/reference.ts` | 수정 | `ModelPriceSchema.thinkingDefault` 를 `z.enum(["adaptive", "none"])` 로(Opus 4.8 은 생각 기본이 꺼짐 — plan-p06a 정할 것 아, 값 4 머리) |
| `src/core/ai/combo.ts` | 신규 | 호출 목적 · 설정 키 · 조합 칸 규격 · 조합 검사 · '끔' 변환 · 요청 구성 · 확인 호출 구성(값 4) |
| `src/core/ai/cost.ts` | 신규 | 과금 시도 뽑기(iterations · 거절 과금) · 단가 고르기(모델마다 적용 날짜가 가장 늦은 줄) · 단가 찾기 · 소수 셈(값 5) |
| `src/core/ai/failure.ts` | 신규 | 시도 실패를 8절 갈래로 나누기(값 6) |
| `src/server/ai/client.ts` | 신규 | `server-only`. SDK 클라이언트 만들기(굳힌 선택) · 시도 하나 보내기 · SDK 오류 바꾸기(값 7) |
| `src/server/ai/store.ts` | 신규 | `server-only`. ai_calls 쓰기 · 단가표 읽기 · 하루 사용량 · 같은 오류 세기 · 알림 한 번 만들기(값 8) |
| `tests/fixtures/settings.ts` | 수정 | `TEST_SETTINGS` 에 ai.* · writing.max_corrections · writing.thinkout_max_turns · talk.safety_* 키(12절 기본값, 값 2) |
| `tests/fixtures/ai/model-prices.ts` | 신규 | 확인한 단가 · 조합 칸 시험용 자료와 `seedModelPrices`(값 3) |
| `tests/fixtures/ai/fake-anthropic.ts` | 신규 | 가짜 fetch 처리기 · 규칙 · 요청 기록 · 응답 만들기 · 로컬 HTTP 서버(값 9) |
| `tests/unit/combo.test.ts` | 신규 | AC-8i(P9 몫) · '끔' 변환 · 대체 모델 재시도 머리글 · 설정 키 |
| `tests/unit/ai-outcome.test.ts` | 신규 | 비용 셈 · 실패 분류 |
| `tests/unit/ai-client.test.ts` | 신규 | 클라이언트 선택 · 시도 보내기(가짜 fetch, 네트워크 없음) |
| `tests/integration/ai-store.test.ts` | 신규 | ai_calls 쓰기 · 단가표 · 하루 사용량 · 같은 오류 세기 · 알림 한 번 · 가짜 HTTP 서버(로컬 포트) |
| drizzle-kit 이 만든 파일(수에서 뺌) | 생성 | `drizzle/0002_ai_calls_error_code.sql` · `drizzle/meta/_journal.json`(수정) · `drizzle/meta/0002_snapshot.json`. 적용한 뒤에는 손으로 고치지 않는다 |
| `seed/model-prices.json`(자료, 바탕에 있을 때만 — 수에서 뺌) | 수정 | P6a 가 먼저 합쳐져 바탕에 있으면 `claude-opus-4-8` 행의 `thinkingDefault` 를 'none' 으로(plan-p06a 정할 것 아 '그 행을 고친다', 컨트롤러 전달 22:3x). 없으면 P6 이 이 plan 이 합쳐진 뒤 고친다 |

### 파일별 값(구현자가 옮겨 쓸 것)

1. `src/db/schema/operations.ts`. ai_calls 의 `status` 다음에 `errorCode: text("error_code")`(비울 수 있음)를 더하고, 셋째 인자 `(t) => [index("ai_calls_learning_day_idx").on(t.learningDay)]` 를 둔다(`index` 는 `drizzle-orm/pg-core`). 주석: "실패 갈래(값 6 의 errorCode). 성공 · 거절 · 검증 실패 · 안전 상한은 비운다(정할 것 나)". 값은 `<갈래>` 또는 `<갈래>:<HTTP 상태>` 꼴 — `timeout` · `connection` · `server:529` · `rate_limit:429` · `console_limit:400` · `console_limit:429` · `account:401` · `same_error:404`. 생성은 `pnpm exec drizzle-kit generate --name=ai_calls_error_code` 다. 기대하는 SQL 은 둘뿐이다.

```sql
ALTER TABLE "ai_calls" ADD COLUMN "error_code" text;--> statement-breakpoint
CREATE INDEX "ai_calls_learning_day_idx" ON "ai_calls" USING btree ("learning_day");
```

   P3a 의 '더하기만' 정적 검사(`rls-grants.test.ts`)가 이 파일도 본다. 시각 기본값은 두지 않는다(한 시계). 다른 하위 plan 이 먼저 0002 를 만들어 병합됐으면 그 브랜치 위에서 `db:generate` 를 다시 돌린다(P3a 위험 5).

2. `tests/fixtures/settings.ts` 에 더할 키(12절 기본값 그대로, 범위 표시도 12절대로). 값 꼴은 P6 settings.json 과 같다(plan-p06a 정할 것 마, 컨트롤러 22:3x): `ai.thinking` 은 '끔' → `"off"`, '적응' → `"adaptive"`, `writing.max_corrections` 는 단계 → 수 사전 `{ "6": 2, "7": 2, "8": 2, "9": 2, "10": 3, "11": 3, "12": 3 }`.

| 키 | 범위 | 값 |
|---|---|---|
| `ai.model.writing_feedback` · `ai.model.writing_check` · `ai.model.speaking_eval` · `ai.model.thinkout` | 집 전체 | `claude-opus-5-5` · `claude-sonnet-5-5` · `claude-sonnet-5-5` · `claude-sonnet-5-5` |
| `ai.model.talk_turn.1-3` · `.4-6` · `.7-9` · `.10-12` | 집 전체 | `claude-haiku-5-5` · `claude-sonnet-5-5` × 3 |
| `ai.effort.writing_feedback` · `writing_check` · `speaking_eval` · `thinkout` | 집 전체 | `medium` · `low` · `low` · `low` |
| `ai.effort.talk_turn.<구간 넷>` | 집 전체 | `low` |
| `ai.thinking.writing_feedback` · `writing_check` · `speaking_eval` · `thinkout` | 집 전체 | `adaptive` |
| `ai.thinking.talk_turn.<구간 넷>` | 집 전체 | `off` |
| `ai.max_tokens.writing_feedback` · `writing_check` · `speaking_eval` · `thinkout` · `talk_turn` · `talk_closing` · `probe` | 집 전체 | 8000 · 4000 · 4000 · 4000 · 1000 · 2000 · 1 |
| `ai.timeout_seconds.realtime` · `ai.timeout_seconds.feedback` | 집 전체 | 10 · 60 |
| `ai.feedback_max_attempts` | 집 전체 | 5 |
| `ai.daily_call_alert` | 프로필 | 150 |
| `ai.daily_cost_alert_usd` · `ai.monthly_cost_alert_usd` · `ai.monthly_alert_multiples` | 집 전체 | 1.0 · 12 · [1, 2, 4] |
| `ai.console_limit_usd` · `ai.console_alert_ratio` | 집 전체 | 70 · 0.8 |
| `ai.safety_daily_calls` | 프로필 | 1000 |
| `ai.safety_daily_cost_usd` · `ai.down_after_failures` · `ai.down_retry_minutes` · `ai.probe_interval_minutes` | 집 전체 | 15 · 3 · [5, 15, 30] · 60 |
| `talk.safety_max_turns` · `talk.safety_alert_count` | 집 전체 | 80 · 2 |
| `writing.max_corrections` · `writing.thinkout_max_turns` | 집 전체 | `{ "6": 2, … "9": 2, "10": 3, … "12": 3 }` · 3 |

3. `tests/fixtures/ai/model-prices.ts`. `MODEL_PRICES_FIXTURE: ModelPricesFile`(P4a 규격으로 검증되는 꼴)과 `seedModelPrices(db, file = MODEL_PRICES_FIXTURE, effectiveFrom = "2026-10-16")`(model_prices 행을 넣고 `capabilities` 칸은 `capabilitiesOf(entry)`)을 내보낸다. 값은 P6 의 `seed/model-prices.json`(plan-p06a '모델 단가표', 승인 22:3x)과 같은 여섯 행이고 단가는 6.6(C61 (3)) · 확인한 사실 1 과 같다. P4a 견본(`builders.ts`)의 조합 칸은 시험용으로 지어낸 값이라 옮기지 않는다(Opus 를 끌 수 있게, Sonnet 기본 effort 를 medium 으로 적음).

| model | 입력 · 출력 · 5분 캐시 쓰기 · 캐시 읽기(달러 / 100만 토큰) | thinkingDefault | thinkingOff | thinkingOffEfforts | effortDefault | serverFallback | fallbackOnly |
|---|---|---|---|---|---|---|---|
| `claude-opus-5-5` | 4 · 20 · 5 · 0.2 | adaptive | null(끌 수 없음) | [] | medium | true | (없음) |
| `claude-sonnet-5-5` | 2 · 10 · 2.5 · 0.1 | adaptive | between_tools | low · medium · high | high | true | (없음) |
| `claude-haiku-5-5` | 0.1 · 0.5 · 0.125 · 0.01(프롬프트 10만 토큰 이하) | adaptive | disabled | low · medium · high | medium | false | (없음) |
| `claude-sonnet-5` | 2 · 10 · 2.5 · 0.2 | adaptive | disabled | low · medium · high(추측) | high | false | true |
| `claude-opus-5` | 5 · 25 · 6.25 · 0.5 | adaptive | disabled | low · medium · high | high | true | true |
| `claude-opus-4-8` | 5 · 25 · 6.25 · 0.5 | none(이 plan 이 규격에 더함) | disabled | low · medium · high · xhigh · max(추측) | high | false | true |

   뒤 세 줄은 서버 측 대체 모델로 답할 수 있는 모델(5절 model_prices '서버 측 대체 모델로 답할 수 있는 모델도 넣는다', 6.6 '대체 모델')이고 `claude-opus-4-8` 은 '단가 없음'일 때 쓰는 단가이기도 하다(6.1). 기본 경로가 어느 모델로 넘기는지는 공개되지 않지만 `client.beta.models.retrieve` 의 `allowed_fallback_models` 가 받는 대체 모델 목록을 알려 준다(확인한 사실 11) — P9c 의 계약 명령이 H4 뒤 이 목록 · 조합 칸 · 수명(lifecycle)을 단가표와 대조한다(plan-p06a 위험 11 의 확인). 직접 부르지 않는 줄이라 조합 칸의 (추측)은 요청에 쓰이지 않는다.

4. 먼저 `src/core/seed/schema/reference.ts` 의 `thinkingDefault: z.literal("adaptive")` 를 `z.enum(["adaptive", "none"])` 로 바꾸고 주석 "'none' = thinking 을 빼면 생각 없이 돈다(Opus 4.8 등, plan-p06a 정할 것 아)"를 단다. 요청은 늘 thinking 을 적어 보내므로 이 칸은 기록 · 대조용이다. P4 시험과 견본은 그대로 통과해야 한다.
   그다음 `src/core/ai/combo.ts`(제안 이름은 모두 이 파일에서 내보낸다). 현재 시각 · DB · SDK 를 가져오지 않는다(의존 규칙 core-no-framework · sdk-only-in-ai).

| 이름 | 무엇 · 규칙 | 정본 |
|---|---|---|
| `AI_PURPOSES` | `writing_feedback · writing_check · speaking_eval · thinkout · talk_turn · talk_closing · probe`(DB 열거형 `ai_purpose` 와 같은 값 · 차례) · 형 `AiPurpose` | 5절 · P3a |
| `REALTIME_PURPOSES` | `writing_check · speaking_eval · thinkout · talk_turn` — 아이가 기다리는 대화형 호출. 첫 바이트 전 연결 오류에만 1회 다시 보낸다(P9c) | 6.1 · 8절 |
| `THINKING_SETTINGS` | `["off", "adaptive"]`(12절 '끔' · '적응'의 저장 값, plan-p06a 정할 것 마) | 12절 |
| `SERVER_SIDE_FALLBACK_BETA` · `STRUCTURED_OUTPUTS_BETA` | `"server-side-fallback-2026-07-01"` · `"structured-outputs-2025-12-15"`(SDK 의 `beta.messages.parse` 가 붙이는 값을 따른다, 정할 것 라 · 위험 1) | 6.1 · 확인한 사실 2 · 3 |
| `ModelCapabilitiesSchema` · `capabilitiesOf(entry)` | P4a `ModelPriceSchema.pick({ thinkingDefault, thinkingOff, thinkingOffEfforts, effortDefault, serverFallback, fallbackOnly })`. model_prices.capabilities jsonb 의 꼴이고 P7 적재가 이 함수로 채운다 | 5절 · 6.1 조합 표 |
| `settingKeysOf(purpose, level)` | `{ model, effort, thinking, maxTokens, timeout }` 키 이름. 회화 턴 · 끝맺음 턴은 `ai.model|effort|thinking.talk_turn.<bandOf(level)>`(끝맺음 턴은 talk_turn 값, 12절), 최대 출력은 `ai.max_tokens.<목적>`(끝맺음은 `talk_closing`), 타임아웃은 `writing_feedback · talk_closing` 이 `ai.timeout_seconds.feedback` · 나머지 `realtime`. `probe` 는 던진다(확인 호출은 이 키들을 쓰지 않는다, 12절 · 13절 '데이터 · 운영 세부') | 6.1 · 12절 · C21 |
| `aiSettingSchemasOf(purpose, level)` | 위 키마다 Zod 규격(model 빈 글 아님 · effort `EFFORTS` · thinking `THINKING_SETTINGS` · maxTokens 1 이상 정수 · timeout 양수). P3a `getSettings` 에 그대로 넘긴다 | 12절 |
| `checkCombo({ model, effort, thinking }, book)` | `{ ok: true } \| { ok: false; reasons }`. 이유: `unknown-model`(단가표에 없음 또는 fallbackOnly) · `thinking-off-unsupported`('끔'인데 thinkingOff 가 null — Opus) · `effort-not-allowed-with-off`('끔'인데 effort 가 thinkingOffEfforts 밖 — xhigh · max) | 6.1 '받지 않는 조합은 저장하지 않는다' · AC-8i |
| `checkSettingsCombos(values, book)` | 호출 목적 넷과 talk_turn 구간 넷의 조합을 모두 보고 위반 목록(`{ keyBase, reasons }[]`)을 돌려준다. P7 의 설정값 시드 적재와 2차 고급 화면이 '저장하지 않는다'에 쓴다(AC-8i 의 seed-load 몫은 P7) | 6.1 · AC-8i |
| `thinkingParamOf(thinking, caps)` | `"adaptive"` → `{ type: "adaptive" }`. `"off"` → `{ type: caps.thinkingOff }`, 단 thinkingOff 가 null 이면 `{ type: "adaptive" }`(Opus 는 끌 수 없어 adaptive 로 보낸다) | 6.1 |
| `requestConfigOf({ purpose, level, values, book })` | `AiRequestConfig = { purpose, model, effort, thinking, maxTokens, timeoutMs, fallbacks: "default" \| null, betas: string[] }`. 조합 검사에 걸리면 `ComboError` 를 던진다(설정이 적재 때 이미 걸러졌어야 한다 — P9c 는 '설정 문제'로 처리). serverFallback 이면 `fallbacks: "default"` · betas `[SERVER_SIDE_FALLBACK_BETA]`, 아니면 null · []. timeoutMs = 초 × `MS_PER_SECOND`(단위 상수) | 6.1 · 8절 · C21 |
| `probeConfigOf(model, caps, probeMaxTokens, realtimeTimeoutSeconds)` | 확인 호출의 가장 가벼운 조합: effort `low`, thinking = caps.thinkingOff 가 있으면 그것(Haiku disabled · Sonnet between_tools) 없으면 adaptive(Opus), fallbacks 없음, 최대 출력 `ai.max_tokens.probe`, 타임아웃 realtime. 1-가는 P9c 의 계약 명령만 쓰고 앱의 확인 호출은 1-나다 | 6.1 표 확인 호출 행 · C1 · AC-8i 끝 문장 |

5. `src/core/ai/cost.ts`. SDK 형을 가져오지 않고 응답의 필요한 칸만 구조로 받는다(`MessageLike` · `UsageLike` · `IterationLike`).

| 이름 | 무엇 · 규칙 | 정본 · 근거 |
|---|---|---|
| `BILLED_REFUSAL_CATEGORIES` | `["bio", "frontier_llm", "reasoning_extraction"]` — 출력 전 거절이 과금되는 분류 | 6.1 · 확인한 사실 2 |
| `PRICE_MISSING_MODEL` | `"claude-opus-4-8"` — 단가표에 없는 모델을 셀 단가 | 6.1 |
| `billedAttemptsOf(message, requestedModel)` | `{ model, input, output, cacheWrite, cacheRead }[]`. `usage.iterations` 가 있으면 `message` · `fallback_message` 항목만 시도로 본다(모델이 비면 요청 모델). 거절로 넘어간 홉은 i 번째 `message` 항목 ↔ 응답 내용의 i 번째 `fallback` 블록(`trigger.category`)으로 짝짓고, 그 홉의 출력 토큰이 0 이고 분류가 과금 목록 밖이면 뺀다. 마지막 응답이 `refusal` 이고 그 항목 출력이 0 이고 `stop_details.category` 가 과금 목록 밖이면 그 항목도 뺀다. iterations 가 없으면 top-level usage 하나(모델은 `message.model`). 캐시 쓰기는 `cache_creation_input_tokens`(5분 쓰기만 쓴다 — 1시간 캐시는 걸지 않는다) | 6.1 · 확인한 사실 2('iterations 가 과금 기록, top-level 은 답한 시도만') |
| `parseUsd4(text)` · `formatUsd6(micros)` · `usdToMicros(n)` · `sumToMicros(text)` | 단가(numeric(10,4) 글)를 1만 배 정수로, 비용을 100만 배 정수(마이크로달러)로 다룬다. 부동소수를 쓰지 않는다. 비용 = Σ 토큰 × 단가4 ÷ 10⁴ 를 반올림(반 올림)해 마이크로달러, 글은 소수 여섯 자리(`ai_calls.cost_usd` numeric(12,6)) | 5절 · P3a |
| `priceOf(model, book)` | 단가표에 있으면 그 줄, 없으면 `PRICE_MISSING_MODEL` 줄과 `missing: true`. 그것도 없으면 0 단가와 `missing: true`(서버 경고 기록) | 6.1 |
| `costOf(attempts, book)` | `{ costUsd: string, priceMissing: boolean, tokens: { input, output, cacheWrite, cacheRead } }`. 토큰도 과금 시도만 더한다(뺀 홉은 비용 · 토큰 모두 0) | 6.1 · AC-8c |
| `PriceBook` | `Map<model, { input4, output4, cacheWrite4, cacheRead4, caps }>`(`priceBookOf` 로 만든다) | 5절 |
| `priceBookOf(rows, onDay)` | 단가 고르기. `rows: PriceRowLike[]` = `{ model, effectiveFrom, inputUsd, outputUsd, cacheWriteUsd, cacheReadUsd, caps }`(단가는 DB 의 numeric 글 또는 시드 파일의 수 — 수는 `toFixed(4)` 글로 바꿔 `parseUsd4` 하나로 읽는다). 시드 파일 `ModelPricesFile` 은 `priceRowsOfSeed(file)` 가 칸 이름(`inputUsdPerMTok` → `inputUsd` 등)을 바꾸고 `caps = capabilitiesOf(entry)`(값 4)를 붙여 넘긴다. 모델마다 `effectiveFrom ≤ onDay` 가운데 가장 늦은 줄로 `PriceBook` 을 만들고 미래 줄은 뺀다. 같은 (모델, 날짜) 줄이 둘이면 던진다(DB 는 고유 키 `model_prices_model_effective_from_unique` 가 막는다). 날짜 고르기는 이 함수 하나다 — store 는 줄을 읽기만 하고, P5a 의 `priceOf(models, model, onDate)` 도 이것으로 바꾼다(다른 P 에 넘길 것) | 5절 · 6.1 · plan-p05a 함수 표 |

6. `src/core/ai/failure.ts`.

| 이름 | 무엇 · 규칙 |
|---|---|
| `AttemptFailure` | `{ kind: "timeout" } \| { kind: "connection" } \| { kind: "http"; status: number; errorType: string \| null; message: string; errorCode: string \| null; hasRetryAfter: boolean }` |
| `httpFailureOf(status, body, hasRetryAfter)` | API 오류 본문(`{ type: "error", error: { type, message, details? }, request_id }`)에서 위 꼴을 만든다. `errorCode` 는 `error.details.error_code`. 시험 표본(P9c 계약 시험)도 이것으로 읽는다 |
| `CONSOLE_LIMIT_MESSAGE_PREFIX` · `ENFORCED_SPEND_LIMIT_CODE` | `"You have reached your specified"`(조직 · 워크스페이스 한도 둘 다 이 머리로 시작) · `"enforced_spend_limit_reached"`(확인한 사실 4) |
| `classifyFailure(f)` | `FailureClass = { reason, status, errorCode, retryConnection, countsTowardDown, rest }`. 표는 아래 |

| 받은 것 | reason | ai_calls status | errorCode | retryConnection | countsTowardDown(1-나) | rest(1-나) |
|---|---|---|---|---|---|---|
| 타임아웃 | timeout | timeout | `timeout` | false | true | null |
| 연결 실패(응답 전) | connection | error | `connection` | true | true | null |
| 400 이고 메시지가 한도 머리로 시작 | console_limit | limit | `console_limit:400` | false | false | console_limit |
| 429 이고 `enforced_spend_limit_reached` | console_limit | limit | `console_limit:429` | false | false | console_limit |
| 401 · 402 · 403 | account | error | `account:<상태>` | false | false | account |
| 그 밖의 429 | rate_limit | error | `rate_limit:429` | false | true | null |
| 500 이상(500 · 504 · 529 …) | server | error | `server:<상태>` | false | true | null |
| 그 밖의 400 · 404 · 413 과 정본에 없는 4xx(409 · 422 등) | same_error | error | `same_error:<상태>` | false | false | null |

   한도가 아닌 429 · 장애를 '이어진 실패 수'에 더하는 일과 바로 쉬는 상태에 드는 일은 1-나가 이 칸을 읽어 한다. 정본에 없는 4xx 를 같은 오류로 두는 것과 모델 은퇴가 404 로 오는 것은 (추측)이다(정할 것 바).

7. `src/server/ai/client.ts`(`import "server-only"`).

| 이름 | 무엇 · 규칙 |
|---|---|
| `ANTHROPIC_API_BASE_URL` | `"https://api.anthropic.com"`(SDK 기본 주소) |
| `AiConfigError` | 키가 없을 때. 메시지에 값을 넣지 않는다 |
| `clientOptionsOf(env, { fetch? })` | `apiKey`: `env.ANTHROPIC_API_KEY` 를 다듬은 값. 비면 `AiConfigError`(SDK 의 프로필 · 워크로드 연동 자격 증명으로 넘어가지 않게, 확인한 사실 5). `authToken: null`. `baseURL`: `env.VERCEL_ENV` 가 있으면(프리뷰 · 운영 · vercel dev) `ANTHROPIC_API_BASE_URL` 로 고정, 없으면 `undefined`(SDK 가 `ANTHROPIC_BASE_URL` 을 읽는다 — 로컬 · e2e 의 가짜 서버). `maxRetries: 0`(C1). `logLevel: "warn"`(`ANTHROPIC_LOG=debug` 이면 SDK 가 요청 본문 — 아이 글 — 을 남긴다, 확인한 사실 5). `openTelemetry: { traces: false, propagation: false }`. `fetch` 는 시험만 넘긴다 |
| `createAnthropicClient(opts?)` · `getAnthropicClient()` | 앞은 매번 새로, 뒤는 모듈 안에 하나(키 · 주소가 바뀌면 새로 — P3a `getDb` 와 같은 꼴) |
| `sendAttempt(client, { body, betas, timeoutMs }, clock)` | `client.beta.messages.create({ ...body, betas, stream: false }, { timeout: timeoutMs })` 를 한 번 부른다. 돌려주는 것: `{ ok: true; message; requestId; latencyMs } \| { ok: false; failure: AttemptFailure; requestId; latencyMs }`. 지연은 넘긴 시계(기본 `@/server/clock` 의 `now`)의 차이다. 본문에 temperature · top_p · top_k · metadata 를 넣지 않는다(형으로 막을 수 없으니 시험이 본다) |
| `toAttemptFailure(error)` | `APIConnectionTimeoutError` · `APIUserAbortError` → timeout, 그 밖의 `APIConnectionError` → connection, 상태가 있는 `APIError` → `httpFailureOf(status, error.error, headers.has("retry-after"))`. 그 밖(`AnthropicError` 등 프로그램 오류)은 그대로 던진다 |

   스트리밍(회화 턴, 1-나)의 꼴만 정해 둔다 — 이 plan 은 짜지 않는다. 1-나는 같은 파일에 `sendStreamingAttempt(client, { body, betas, timeoutMs }, clock, onText)` 를 더한다: `client.beta.messages.stream({ ...body, betas }, { timeout })` 의 `text` 이벤트(조각 · 지금까지 글)로 `tori_en` 을 풀고, 첫 `text` 까지를 '첫 바이트 전'으로 본다(그 전 연결 실패 · 타임아웃만 1회 다시, 8절 '회화 턴 실패'). 끝은 `finalMessage()`(usage · iterations · stop_reason 은 비스트리밍과 같은 꼴이라 값 5 · 6 을 그대로 쓴다). 스트림 중간의 대체 모델 재시도는 `fallback` 블록이 경계이고 그 뒤 text 블록을 앞 text 에 이어 붙여 JSON 하나로 푼다(8절 끝 문장, 확인한 사실 2). 끊을 때는 `stream.abort()`. 가짜 클라이언트의 SSE 응답도 1-나가 값 9 에 더한다.

8. `src/server/ai/store.ts`(`import "server-only"`). 시각은 부르는 쪽이 한 시계 값으로 넘긴다. 질의 SQL 안에 `now()` 를 쓰지 않는다(P3a 검토 메모).

| 이름 | 무엇 · 규칙 |
|---|---|
| `insertAiCall(db, row)` | 6.1 · C56 의 열 그대로 한 행. `costUsd` 는 소수 여섯 자리 글, `errorCode` 는 값 6 |
| `loadPriceBook(db, onDay)` | model_prices 줄을 모두 읽고(여남은 줄) `capabilities` 를 `ModelCapabilitiesSchema` 로 검증해(어긋나면 그 모델의 줄을 모두 빼고 서버 경고) 값 5 `priceBookOf(rows, onDay)` 로 고른다. 날짜 고르기를 SQL 에 두지 않는다(P5a 와 같은 순수 함수 하나). onDay 는 호출의 학습일(위험 7) |
| `dailyUsage(db, { profileId, learningDay })` | `{ profileCalls, householdCostMicros }`. 같은 학습일 · 목적 `probe` 밖. 호출 수는 그 프로필 행 가운데 결과 상태 `safety_cap` 밖(막힌 호출은 부른 것이 아니다), 비용은 집 전체 합. 한 질의(`count(*) filter (…)` · `sum(cost_usd)::text`) |
| `sameErrorCount(db, { purpose, learningDay })` | 같은 목적 · 학습일에 `status = 'error'` 이고 `error_code like 'same_error:%'` 인 행 수(C17) |
| `createAlertOnce(db, { kind, profileId, thresholdKey, learningDay, value, createdAt, once: "day" \| "key" })` | 한 트랜잭션에서 `pg_advisory_xact_lock(hashtext(kind · profileId · thresholdKey 를 이은 글))` 을 잡고, 같은 행이 없을 때만 넣는다. 같은 행은 `once: "day"` 면 (kind, profile_id, threshold_key, learning_day), `"key"` 면 (kind, profile_id, threshold_key) 다. 넣었으면 true. profile_id 가 빈 집 전체 알림은 `IS NULL` 로 견준다. 비울 수 있는 jsonb 에 JSON null 을 뜻으로 쓰지 않는다(P3a 메모). 1-가는 '호출 설정 확인 필요'(P9c, `"day"`)만 쓴다. 달마다 한 번인 비용 알림 · 콘솔 한도 근접(1-나)은 thresholdKey 에 달을 넣고 `"key"` 로 같은 함수를 쓴다 |

9. `tests/fixtures/ai/fake-anthropic.ts`. 앱 코드(`src/`)는 이 파일을 가져오지 않는다.

| 이름 | 무엇 · 규칙 |
|---|---|
| `createFakeAnthropic(rules?)` | `{ fetch, requests, push(rule), reset() }`. `fetch(url, init)` 는 본문 JSON · 머리글을 `requests` 에 쌓고 규칙을 앞에서부터 맞춰 답한다. 맞는 규칙이 없으면 501 과 '가짜에 규칙 없음' 본문 |
| `FakeRule` | `{ when?: { purpose?, model?, bodyIncludes? }, reply, times? }`. `purpose` 는 요청의 `output_config.format.schema.title`(P9b 가 규격 제목을 목적 이름으로 둔다), `bodyIncludes` 는 본문 JSON 글에 든 낱말(e2e 시험끼리 섞이지 않게 시험마다 다른 표시를 쓴다). `times` 를 다 쓰면 그 규칙을 버린다 |
| `FakeReply` | `{ kind: "message", body, delayMs? }` · `{ kind: "error", status, body, headers? }` · `{ kind: "network-error" }`(fetch 가 TypeError 로 거절 → SDK 연결 오류) · `{ kind: "hang" }`(요청의 `signal` 이 끊을 때까지 기다림 → SDK 타임아웃). `delayMs` · `hang` 은 `init.signal` 의 abort 를 따른다 |
| `messageBody({ model, json, stopReason?, usage?, iterations?, fallback?, stopDetails? })` | 올바른 Messages 응답 JSON(내용은 `text` 블록 하나에 `JSON.stringify(json)`, `fallback` 이 있으면 그 앞에 `{ type: "fallback", from, to, trigger }` 블록) |
| `errorBody(status, type, message, details?)` · `consoleLimitBody("workspace" \| "tier")` | 문서의 오류 본문 꼴. 한도 둘은 확인한 사실 4 의 문구를 그대로 쓴다 |
| `startFakeAnthropicServer({ port?, rules? })` | `node:http` 로 같은 처리기를 띄운다. `POST /v1/messages` 는 처리기, `POST /__fake/rules`(선언 규칙만) · `POST /__fake/reset` · `GET /__fake/requests` · `GET /health` 는 다른 프로세스(e2e)의 조종용. `{ url, close() }` 를 돌려준다 |

   e2e(P11) 쓰는 법: Playwright 전역 준비에서 `startFakeAnthropicServer({ port })` 를 띄우고, webServer 환경에 `ANTHROPIC_BASE_URL=http://127.0.0.1:<port>` · `ANTHROPIC_API_KEY=e2e-fake-key` 를 준다. 이 plan 은 `playwright.config.ts` 를 고치지 않는다(첫 소비자 P11 이 공용 변경으로).

## 작업 순서 (Order of work)

시작 전(구현자). 격리 워크트리(바탕 브랜치 끝)에서 `pnpm install --frozen-lockfile`. 명령은 `source ~/.nvm/nvm.sh && nvm use >/dev/null &&` 로 시작한다(구현자 환경 — 계획자 환경과 다르다). SDK 코드는 온라인 문서보다 설치판 `node_modules/@anthropic-ai/sdk/src`(형 정의 · `helpers/zod.ts` · `lib/transform-json-schema.ts` · `core/error.ts` · `client.ts`)를 먼저 본다. 실제 API 는 부르지 않는다(키도 없다). 구현자 하나(implementer · Opus · high)가 차례로 하고 ∥ 는 없다.

1. [DB] ai_calls 열 · 색인(값 1) → `pnpm exec drizzle-kit generate --name=ai_calls_error_code`. 완료: 0002 SQL 이 위 두 문장뿐이다(`cat` 출력을 보고에). `pnpm test:int` 의 '더하기만' · RLS 시험 통과, `pnpm build` 통과.
2. [검증] 시험용 자료. `tests/fixtures/settings.ts`(값 2) · `tests/fixtures/ai/model-prices.ts`(값 3) · `fake-anthropic.ts`(값 9). 완료: `ai-client.test.ts` 의 '가짜:' 시험(가짜 fetch 를 바로 불러 규칙 차례 · times · bodyIncludes · 요청 기록을 봄) 통과. 단가표 규격 시험은 작업 3 의 `combo.test.ts` 에 둔다.
3. [서버] 조합(시험 먼저). `combo.test.ts` → (가) `src/core/seed/schema/reference.ts` 의 `thinkingDefault` 한 줄(값 4 머리, 공용 변경 아님) → (나) 바탕에 `seed/model-prices.json` 이 있으면 `claude-opus-4-8` 행을 'none' 으로 → (다) `src/core/ai/combo.ts`(값 4). 완료: AC-8i 시험 통과, `pnpm test` 전체(P4 의 seed-validator 시험 모두 포함)가 그대로 통과, 바탕에 `seed/` 가 있으면 `pnpm seed:validate` 오류 0, `pnpm check:deps` 위반 0.
4. [서버] 실패 분류 · 비용(시험 먼저). `ai-outcome.test.ts` → `failure.ts`(값 6) · `cost.ts`(값 5). 완료: 시험 통과.
5. [서버] 클라이언트(시험 먼저). `ai-client.test.ts` → `src/server/ai/client.ts`(값 7). 완료: 시험 통과, 가짜 fetch 로 SDK 오류 갈래 넷(타임아웃 · 연결 · 500 · 400)이 값 6 표대로 나온다.
6. [DB][서버] 기록(시험 먼저). `ai-store.test.ts` → `src/server/ai/store.ts`(값 8). 완료: `pnpm test:int` 통과.
7. [검증] 마무리 · 검토 · H14. (가) 구현자: CI 순서대로 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle`, 그리고 `grep -rn "sk-ant-" src tests` 0건. (나) code-reviewer(Opus · xhigh) 검토와 fix ≤3. (다) 요청자 지시로 컨트롤러가 커밋한다(H14). 완료: 명령 출력이 구현 보고에 있고, spec-trace 의 missing-test 가 1 줄어든다(AC-8i).

### H4 전 · 뒤

| 때 | 할 수 있는 것 |
|---|---|
| H4 전(지금) | 이 plan 전부. 가짜 클라이언트만 쓰고 실제 API · 키가 없다 |
| H4 뒤 | 이 plan 에는 할 일이 없다. 실제 응답 표본 · 관찰은 P9c 작업 8 |

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 베타 끝점(`/v1/messages?beta=true`)에서 구조화 출력이 머리글 없이 받아지는지 확인하지 못했다. 문서는 GA `output_config.format` 에 머리글이 필요 없다고 적고, SDK 의 `beta.messages.parse` 는 `structured-outputs-2025-12-15` 를 붙인다(확인한 사실 3) | 모든 호출이 400 '같은 오류'로 끝난다 | SDK 베타 parse 를 따라 머리글을 붙인다(정할 것 라). P9c 의 H4 계약 명령이 실제로 200 인지 본다. 400 이면 머리글 하나를 빼거나 더하는 한 줄 고침 |
| 2 | `zodOutputFormat` 은 열거형(`enum`) · 개수 · 범위 · 길이를 문법에 싣지 않고 설명 글로 옮긴다(설치판으로 직접 확인). 문서도 열거값 대소문자가 바뀔 수 있다고 적는다 | 판정 · 점수 값이 규격과 다르게 온다 | P9b 가 엄격 검증 전에 글을 다듬고(앞뒤 공백 · 열거값 소문자) 엄격 규격 → 1회 다시 요청 → 느슨한 규격 + 정규화로 받는다(6.1). P9c 관찰표가 엄격 통과율을 잰다 |
| 3 | 대체 모델 재시도 응답의 비용 셈. 거절 홉 ↔ fallback 블록 짝(차례로 짝지음)은 문서 예시 하나로 짰다(추측). 실제로 일으키기 어렵다 | 비용이 조금 틀린다(대개 0.01달러 아래) | 문서 예시 모양을 시험에 그대로 넣는다. 실제로 일어나면 요청 번호 · 모델 · 분류를 서버 경고로 남긴다(P9c, 역분석 제안 5) |
| 4 | 하위 plan 여럿이 마이그레이션을 만들면 0002 번호 · journal 이 부딪힌다(P7 · P10~P12) | 병합 뒤 journal 이 깨진다 | 컨트롤러가 병합 순서를 정하고, 뒤에 합치는 쪽이 앞 것이 합쳐진 브랜치에서 `db:generate` 를 다시 돌린다(P3a 위험 5) |
| 5 | 개발용 DB 에 단가표가 비어 있으면(P7 적재 전) 모든 호출이 조합 검사에서 '모르는 모델'이 된다 | 프리뷰에서 AI 활동이 모두 실패 경로로 간다 | 의도한 동작(코드 기본값 금지). 프리뷰 실사용은 P7 적재 뒤(P3a 정할 것 사와 같은 길) |
| 6 | 'AI 쉬는 중' 경계(묶음 위험 8). 1-가는 분류 · 기록만 한다 | 1-나가 분류를 다시 짠다 | 분류 결과에 `countsTowardDown` · `rest` 칸을 지금 둔다. 1-나는 이 칸만 읽어 ai_status 를 바꾼다 |
| 7 | 단가 줄을 고르는 날을 학습일로 잡았다. 새벽 4시 전 호출은 전날 단가로 센다 | 단가가 바뀌는 날 몇 시간 어긋난다 | 단가는 드물게 바뀐다. 바꿀 때 `effective_from` 을 하루 앞당겨 넣으면 된다(P6 · P7 메모) |
| 8 | Haiku 5.5 는 프롬프트 10만 토큰을 넘으면 단가가 다르다(확인한 사실 1). model_prices 는 한 줄 단가만 둔다 | 비용이 낮게 셈 | 실시간 호출 입력은 1만 토큰 아래다(6.6 회화 턴 최대 약 8,400). P9c 관찰표가 입력 최대를 적는다 |
| 9 | 타임아웃으로 끊은 요청이 과금되는지 모른다(추측) | 하루 비용 합이 조금 낮다 | 토큰 0 · 비용 0 으로 남기고, 관찰 · 사용 시험에서 콘솔 사용량과 견준다 |
| 10 | SDK 는 `ANTHROPIC_CUSTOM_HEADERS` 환경 변수를 언제나 읽는다(끌 길 없음, 설치판 확인) | 누가 Vercel 환경에 넣으면 머리글이 붙는다 | Vercel 환경 변수에 두지 않는다(H4 안내). 키 · 본문은 새지 않는다 |
| 11 | 가짜와 실제가 어긋난다 | 시험은 통과하는데 실제 응답에서 깨진다 | 손으로 만든 응답은 문서의 꼴을 그대로 쓰고, P9c 의 H4 계약이 녹화 표본으로 바꿔 계약 시험에 넣는다 |
| 12 | `src/server` 는 `server-only` 라 `tsx` 스크립트가 가져올 수 없다 | P9c 의 계약 · 관찰 명령이 요청 구성 · 비용 셈을 다시 짠다 | 순수한 부분(조합 · 비용 · 분류)은 모두 `src/core/ai` 에 두고 스크립트는 SDK 를 직접 부른다(sdk-only-in-ai 는 scripts/ 를 보지 않는다) |
| 13 | 개발 키 비용(묶음 위험 10) | 개발용 워크스페이스 한도 초과 | 이 plan 은 실제 호출이 없다 |

### 정할 것(컨트롤러)

- 가. P9 를 셋(a 바탕 · b 호출 넷 · c 흐름 · 계약)으로 나누기. 브리프는 a · b 둘을 예로 들었지만 둘이면 b 가 손으로 쓰는 파일 스물넷이 된다. 권하는 것은 셋을 한 워크트리 · 한 구현자로 차례로 하고 plan 마다 검토 · fix 를 도는 것이다(P4 와 같다). 셋이 열넷 · 열둘 · 열둘이라 열 개를 조금 넘는다(시험 파일을 넣어 셌다). 다른 길은 b · c 를 하나로 묶고 검토만 둘로 나누는 것이다(P3a 의 A1 · A2).
- 나. ai_calls 에 `error_code` 열과 `learning_day` 색인을 더하는 마이그레이션. 8절 · C17 의 '같은 호출 목적에서 다시 보내도 같은 오류가 한 학습일에 ai.down_after_failures 번'을 세려면 행마다 실패 갈래가 있어야 한다(지금 열거형 `error` 하나에 장애 · 같은 오류가 섞인다). 알림 내용 '오류 코드'도 이 열에서 읽는다. 권하는 것은 더하기다(더하기만 마이그레이션, 비울 수 있는 열). 5절 ai_calls 행 · 6.1 열 목록에 한 구절이 늘어나므로 13절 한 줄이 필요하다(C56 (2) 와 같은 꼴). 색인은 하루 합 질의가 호출마다 돌기 때문이다(물리 설계, 13절 불필요).
- 다. (정해짐 — 따르기만 함) 설정값 꼴과 model_prices 규격 빈틈. `ai.thinking.*` 는 `off` · `adaptive`, `writing.max_corrections` 는 단계 → 수 사전(plan-p06a 정할 것 마), `thinkingDefault` 'none' 은 P9 가 규격에 더한다(plan-p06a 정할 것 아 — 이 plan 값 4 머리). 컨트롤러 22:3x 결정이라 새로 정할 것은 없다. 규격 한 줄과 opus-4-8 행 고침은 작업 3 (가) · (나)다. P6a 의 `seed/model-prices.json` 이 바탕에 아직 없으면 P6 이 이 plan 이 합쳐진 뒤 고친다(합치는 차례는 컨트롤러). 그때까지 P6a 는 'adaptive' 로 둔다.
- 라. 기술 선택 다섯(13절 한 줄 — C51 · C55 처럼). (1) 모든 호출은 `client.beta.messages.create` 하나로 보내고, 구조화 출력이 있는 호출은 `structured-outputs-2025-12-15` 머리글을 붙인다(SDK 베타 parse 를 따름). parse 대신 create 를 쓰는 까닭은 parse 가 Zod · JSON 실패(잘림 · 거절 도중 글 포함) 때 응답(stop_reason · 토큰 · 비용)을 버리고 던지기 때문이다(설치판 확인, P5a 와 같은 까닭). 본문 칸 · 응답 읽는 차례 · usage 칸은 P5a(C62)의 GA `client.messages.create` 와 같고, P9 만 서버 측 대체(`fallbacks`)가 베타 요청 형에만 있어 베타 create 를 쓴다(확인한 사실 12). (2) 클라이언트 굳히기 — 키만 쓰고 authToken null, Vercel 배포에서는 기본 주소 고정, maxRetries 0, logLevel warn, OpenTelemetry 끔. (3) 가짜 고르는 법 — 시험은 SDK `fetch` 주입, e2e 는 `ANTHROPIC_BASE_URL` 로 가짜 HTTP 서버(Vercel 배포는 읽지 않음). (4) 비용은 정수(마이크로달러)로 센다. (5) 정본에 없는 4xx 는 '다시 보내도 같은 오류'로 둔다(바).
- 마. (정해짐) 6.6 의 단가 빈칸은 C61 (3) 로 채워졌다. 이 계획자가 가격 쪽에서 따로 확인한 값(확인한 사실 1)도 같다 — Opus 5.5 5분 캐시 쓰기 5 · 캐시 읽기 0.20, 대체 모델 Opus 5 · Opus 4.8 5 · 25 · 6.25 · 0.50, Sonnet 5 2 · 10 · 2.50 · 0.20. 6.6 에 없는 1시간 캐시 쓰기(Opus 5.5 8 · Sonnet 5.5 4 · Haiku 5.5 0.20)는 1시간 캐시를 걸지 않으므로 쓰지 않는다.
- 바. 정본에 없는 4xx(409 · 422 등)의 갈래. 권하는 것은 '다시 보내도 같은 오류'(다시 보내 나아질 까닭이 없고, 집 전체를 쉬게 할 까닭도 없다)다. 모델 은퇴가 404 로 오는지는 (추측)이고 같은 갈래에 든다.
- 사. 브리프 범위 줄의 '확인 호출 · AI 쉬는 중 상태'. 정본 11절 · 묶음 위험 8 · 델타 spec('AI 쉬는 중' 자동 해제 30 · 71줄)은 1-가를 '판정과 기록까지'로, 상태 · 확인 호출을 1-나로 둔다. 권하는 것은 정본대로 1-나에 두고 P9 는 이음매(분류 칸 · 확인 호출 구성 함수 · 알림 한 번 함수 · 호출 앞 판정의 상태 입력 자리)만 두는 것이다. 13절 불필요.

### 제약

- 설계를 바꾸지 않는다. 정본과 다르게 해야 하면 이 절에 적고 보고의 '컨트롤러가 정할 것'에 올린다. 컨트롤러가 13절에 한 줄 먼저 넣은 뒤 구현한다.
- 설계 숫자는 settings 에서 읽는다. 시험도 `tests/fixtures/settings.ts` 에서 읽는다. 머리글 이름 · 기본 주소 · 단위 바꿈 같은 기술 값은 파일 위 이름 붙인 상수다.
- AI 호출은 서버에서만. `@anthropic-ai/sdk` 는 `src/server/ai` 에서만 가져온다(sdk-only-in-ai — 규칙 설명대로 `scripts/` 는 대상 밖이라 P5a 풀이 검사와 P9c 의 계약 · 관찰 명령은 SDK 를 직접 부른다), `src/server/ai` 는 `src/server` 안에서만 가져온다(ai-only-from-server). 시험 · 계약에서 실제 API 를 부르지 않는다.
- 시각은 한 시계에서 읽고 SQL 안에 now() 를 쓰지 않는다.
- 비밀값 · 아이 이름은 어디에도 적지 않는다. 시험의 키는 `"test-key"` 같은 가짜 글이다. 시험의 아이 이름은 지어낸 이름만 쓴다(P9b).
- 용어는 영역 · 단계 · 단원 · 활동이다. 코드 식별자는 영어다. 서브에이전트는 호출마다 model · effort 를 적는다(implementer Opus · high, code-reviewer Opus · xhigh). 아이 화면이 없어 화면 검토는 없다. 커밋 · PR 은 요청자 지시 때만(H14).

### 다른 P 에 넘길 것(이 plan 몫 — 나머지는 보고 `task-p09-plan-report.md` 같은 절)

- P5(plan-p05a, C62): 이 plan 의 `src/core/ai/cost.ts` 가 합쳐지면 P5a `src/core/seed/solve-check.ts` 의 `priceOf(models, model, onDate)` · `costOf(usage, price)` 를 값 5 의 `priceBookOf(rows, onDay)` · `priceOf(model, book)` · `costOf(billedAttemptsOf(message, model), book)` 로 바꾼다. 고르기(그 모델 · `effectiveFrom` ≤ 날짜 가운데 가장 늦은 줄)와 비용(소수 6자리)은 같고, 셈이 정수(마이크로달러)라 부동소수 반올림 차이가 없어진다. 바꿀 때 지킬 것 셋: 단가 없음(`missing: true`)은 지금처럼 입력 오류 2 로 둔다(opus-4-8 단가로 세지 않는다) · 기록의 `costUsd` 는 P4 규격이 수(`z.number()`)라 `Number(costUsd)` 로 넣는다 · 시드 파일은 `priceRowsOfSeed(file)`(값 5)로 넘긴다. 맡기는 때와 사람은 컨트롤러가 정한다(P9a 가 합쳐진 뒤의 작은 고침).

### 확인한 사실과 출처(2026-10-16, P9a · b · c 공통)

| 번호 | 사실 | 출처 · 판 |
|---|---|---|
| 1 | 100만 토큰당: Opus 5.5 입력 4 · 5분 캐시 쓰기 5 · 1시간 8 · 캐시 읽기 0.20 · 출력 20. Sonnet 5.5 2 · 2.50 · 4 · 0.10 · 10. Haiku 5.5(프롬프트 10만 이하) 0.10 · 0.125 · 0.20 · 0.01 · 0.50, 10만 초과 0.50 · 0.625 · 1 · 0.05 · 2.50. Sonnet 5 2 · 2.50 · 4 · 0.20 · 10. Opus 5 · Opus 4.8 5 · 6.25 · 10 · 0.50 · 25. Opus 5.5 · Sonnet 5.5 캐시 읽기는 입력의 0.05배(6.6 · C61 (3) 과 같음) | https://platform.claude.com/docs/en/about-claude/pricing (2026-10-16 읽음) |
| 2 | 서버 측 대체 모델 재시도: `fallbacks: "default"` + 머리글 `server-side-fallback-2026-07-01`(06-01 은 목록 꼴만). Haiku 5.5 는 없음 — "default" 면 거절이 그대로, 목록이면 400. 2026-07-01 머리글에서 Sonnet 5.5 의 between_tools 요청이 Sonnet 5 로 넘어가면 disabled 로 돈다. 기본 경로의 대체 모델은 공개되지 않는다. 안전 분류기 거절만 넘기고 한도 · 과부하 · 서버 오류는 그대로 돌려준다. `usage.iterations` 가 시도마다의 과금 기록이고 top-level usage 는 답한 시도만 적는다(모델이 다른 토큰을 한 칸에 더하지 않는다). 출력 전 거절은 bio · frontier_llm · reasoning_extraction 만 과금, 출력 도중 거절은 나온 만큼 과금. 끈끈한 경로는 약 1시간. 거절은 HTTP 200 · `stop_reason: "refusal"` · `stop_details.category`. 거절의 `stop_details.fallback_credit_token`(5분 유효)은 클라이언트가 거절된 요청을 대체 모델로 다시 보낼 때 캐시 미스 비용을 돌려받는 표이고 `fallbacks` 와 함께 보낼 수 없다 — 이 plan 은 거절을 즉시 다시 보내지 않아(P9c 정할 것 나) 쓰지 않는다 | https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback (2026-10-16 읽음) · 설치판 `src/resources/beta/messages/messages.ts`(`BetaFallbacksParam` · `BetaFallbackBlock` · `BetaIterationsUsage` · `BetaRefusalStopDetails` · `BetaFallbackCreditTokenParam`) |
| 3 | SDK 0.135.0(2026-10-15 판): `client.beta.messages.create` 의 `betas` → `anthropic-beta` 머리글, URL `/v1/messages?beta=true`. `beta.messages.parse` 만 `structured-outputs-2025-12-15` 를 붙이고 비베타 parse 는 붙이지 않는다. 문서는 GA `output_config.format` 에 머리글이 필요 없다고 적는다 | 설치판 `package.json` · `CHANGELOG.md` · `src/resources/beta/messages/messages.ts` 85~186줄 · `src/lib/internal/beta-messages-request.ts` · https://platform.claude.com/docs/en/build-with-claude/structured-outputs (2026-10-16 읽음) |
| 4 | 직접 건 지출 한도: HTTP 400 `invalid_request_error`, 메시지가 `You have reached your specified API usage limits` 또는 `… specified workspace API usage limits` 로 시작하고 풀리는 때를 적는다. 등급 월 상한: HTTP 429 `rate_limit_error`, `error.details.error_code = "enforced_spend_limit_reached"`, `retry-after` 없음, 메시지 예 'You will regain access on 2026-09-01 at 00:00 UTC.'. 오류 상태: 400 · 401 · 402 billing_error · 403 · 404 · 409 · 413 request_too_large · 429 · 500 · 504 timeout_error · 529 overloaded_error. 오류 본문은 `{ type: "error", error: { type, message }, request_id }` | https://platform.claude.com/docs/en/api/rate-limits · https://platform.claude.com/docs/en/api/errors (2026-10-16 읽음) |
| 5 | SDK 클라이언트: `apiKey` · `authToken` 이 둘 다 null 이면 설정 파일 프로필 · 워크로드 연동으로 자격 증명을 찾는다. `baseURL` 기본은 `ANTHROPIC_BASE_URL`, `ANTHROPIC_CUSTOM_HEADERS` 를 늘 읽는다, `maxRetries` 기본 2, `timeout` 은 밀리초, `fetch` 주입, `openTelemetry: false` 또는 `{ traces, propagation }`, `logLevel`(`off · error · warn · info · debug`, 기본 warn, `ANTHROPIC_LOG` 로 바뀜). debug 기록은 요청 옵션(본문)을 남긴다. 재시도가 0 이면 타임아웃은 `APIConnectionTimeoutError`, 연결 실패는 `APIConnectionError`, 상태별로 400 BadRequest · 401 Authentication · 403 PermissionDenied · 404 NotFound · 409 · 422 · 429 RateLimit · 500 이상 InternalServer, 그 밖(402 · 413)은 `APIError`. `APIError` 는 `status` · `headers` · `error`(본문) · `requestID` · `type` 을 갖는다 | 설치판 `src/client.ts`(ClientOptions 610~760줄, 생성자 870~990줄, 1488~1535줄) · `src/core/error.ts` · `src/internal/utils/log.ts` · `README.md` |
| 6 | effort 기본: Opus 5.5 · Haiku 5.5 medium, Sonnet 5.5 high. 세 모델 모두 다섯 단계. Sonnet 5.5 의 between_tools 는 low · medium · high 에서만(xhigh · max 는 400), Haiku 5.5 의 disabled 는 high 이하에서만, Opus 5.5 는 disabled 가 모든 effort 에서 400. between_tools 는 Sonnet 5.5 만 받는다. 생각 토큰은 max_tokens 에 든다 | https://platform.claude.com/docs/en/build-with-claude/effort · https://platform.claude.com/docs/en/api/errors ('Thinking cannot be disabled' 절) (2026-10-16 읽음) |
| 7 | 구조화 출력: 지원 모델에 opus-5-5 · sonnet-5-5 · sonnet-5 · opus-4-8 · haiku-5-5. 한도 — 선택 칸 합 24, anyOf · 꼴 배열 16. 받지 않는 키워드 minimum · maximum · minLength · maxLength · maxItems · minItems 2 이상. 거절 · max_tokens 면 규격과 안 맞을 수 있다. 열거값 대소문자가 바뀔 수 있다. 새 규격은 첫 요청에 문법 만들기 지연이 있고 24시간 캐시된다. 형식을 바꾸면 그 대화의 프롬프트 캐시가 깨진다 | https://platform.claude.com/docs/en/build-with-claude/structured-outputs (2026-10-16 읽음) |
| 8 | `zodOutputFormat(schema)` 는 `z.toJSONSchema(schema, { reused: "ref" })` 뒤 `transformJSONSchema` 로 type · properties · required · items · minItems(0 · 1) · 지원 format · title · description · `$ref` · `$defs` · anyOf 만 남기고 그 밖(maxItems · minimum · maximum · **enum**)은 설명 글로 옮긴다. 루트 `title` 은 남는다. `parse` 는 원래 Zod 규격으로 검증하고 실패하면 `AnthropicError` 를 던진다 | 설치판 `src/helpers/zod.ts` · `src/lib/transform-json-schema.ts` · 2026-10-16 이 저장소에서 `node -e` 로 견본 규격을 바꿔 봄(zod 4.6.7) |
| 9 | Next 16.4.2 `outputFileTracingIncludes`: 키는 경로 glob(picomatch), 값은 프로젝트 뿌리 기준 glob, `'/*'` 로 모든 경로 | 설치판 `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md` |
| 10 | spec-trace 는 묶음 plan 증명 표와 `tests/` 의 시험 이름만 센다(하위 plan 은 읽지 않는다). AC-N4 는 P1b 시험이 이미 있다 | 설치판 `scripts/spec-trace.ts` · 2026-10-16 시험 이름 grep |
| 11 | Models API: `client.models.retrieve(id)` 의 `capabilities.thinking.types.{adaptive, between_tools, disabled, enabled}.supported` · `capabilities.effort.{low … max}` · `capabilities.structured_outputs`, `lifecycle`(active · deprecated · retired) · `retires_at`. 베타 `client.beta.models.retrieve(id)` 는 여기에 `allowed_fallback_models`(그 모델이 `fallbacks[i].model` 로 받는 모델 목록, 빈 목록이면 fallbacks 를 받지 않음)를 더한다. 베타 조회는 GET `/v1/models/{id}?beta=true` 이고 `betas` 는 `anthropic-beta` 머리글, `workspace_id` 는 워크스페이스 선택 머리글로 간다. 어느 베타 값이 `allowed_fallback_models` 를 채우는지는 설치판 · 문서에 없다(추측 — P9c 계약 명령이 머리글 없이 한 번, `server-side-fallback-2026-07-01` 로 한 번 묻는다) | 설치판 `src/resources/models.ts` · `src/resources/beta/models.ts`(0.135.0) |
| 12 | P5a(C62)와 같은 SDK 꼴. 요청 본문 칸은 `model` · `max_tokens` · `thinking` · `output_config: { effort, format: zodOutputFormat(규격) }` · `system` · `messages`. 응답은 stop_reason 을 먼저 보고(end_turn · refusal · max_tokens) text 블록을 type 으로 찾아 `JSON.parse` 뒤 Zod `safeParse`. `messages.parse()` 는 text 블록이 JSON · 규격에 안 맞으면(잘림 · 거절 도중 글 포함) `AnthropicError` 를 던져 응답(stop_reason · usage)을 잃으므로 쓰지 않는다. usage 칸은 `input_tokens` · `output_tokens` · `cache_creation_input_tokens` · `cache_read_input_tokens` · `output_tokens_details.thinking_tokens`(GA · 베타 모두 있고 null 일 수 있으며 머리글이 필요 없다 — `thinking-token-count-2026-05-13` 은 스트리밍 생각 조각의 어림 수에만 쓴다). 다른 점 하나: GA 요청 형에는 `fallbacks` 가 없고 베타에만 있어(`fallbacks?: BetaFallbacksParam`) P9 는 `client.beta.messages.create` + `betas` 로 보낸다. P5a 는 대체 모델을 쓰지 않아(plan-p05a 정할 것 라) GA 로 보낸다 | plan-p05a 확인한 사실 1 · 2 · 함수 표 `interpretSolveMessage` · 설치판 0.135.0 `resources/messages/messages.d.ts`(`fallbacks` 0건 · `OutputTokensDetails`) · `resources/beta/messages/messages.d.ts`(`fallbacks?` · `BetaOutputTokensDetails` · `BetaThinkingDelta`) · `lib/parser.js`(`parseOutputFormat` 이 던짐) |

### 확인할 사실(추측으로 둔 것, P9a · b · c 공통 — 확인하는 곳)

| 번호 | 확인 못 한 것 | 확인하는 곳 · 때 |
|---|---|---|
| 1 | 생각 끔(Sonnet 5.5 between_tools · Haiku 5.5 disabled)과 구조화 출력을 함께 보내도 400 이 아닌지. 문서에 막는 말이 없고 6.1 이 회화 턴에 같은 조합을 쓴다(plan-p05a 위험 6 · P9c 위험 11) | H4 뒤 P5a `pnpm seed:check --probe`(GA 끝점 · Sonnet 5.5 between_tools)가 먼저 본다. 이 plan 의 길(베타 끝점 · 머리글 · Haiku disabled)은 P9c 계약 `talk_config.haiku` · `talk_config.sonnet` 과 관찰의 'off' 묶음이 따로 본다 |
| 2 | 베타 끝점의 구조화 출력이 `structured-outputs-2025-12-15` 머리글을 붙인 채 받아지는지(위험 1) | P9c 계약 명령의 모든 사례가 200 인지 |
| 3 | Models API 의 `allowed_fallback_models` 를 채우는 베타 값(확인한 사실 11) | P9c 계약 `models`(머리글 없이 한 번 · `server-side-fallback-2026-07-01` 로 한 번) |
| 4 | 대체 모델 응답에서 거절 홉과 fallback 블록을 차례로 짝짓는 것(값 5 `billedAttemptsOf`, 문서 예시 하나) | 대체가 실제로 일어난 응답이 녹화되면 그 표본으로 시험을 더한다(드물다) |
| 5 | 모델 은퇴가 404 로 오는지와 정본 밖 4xx 를 '같은 오류'로 두는 것(정할 것 바) | P9c 계약 `models` 의 수명 칸(deprecated 면 `retires_at`) |
| 6 | 타임아웃으로 끊은 요청의 과금(0 으로 기록) | 운영 뒤 콘솔 사용량과 ai_calls 합 비교(9절 사용 시험) |
| 7 | 직접 건 한도 400 의 풀리는 시각 꼴(확인한 사실 4) | H12 `pnpm ai:contract --case console-limit` |
| 8 | `outputFileTracingIncludes` 의 `"/*"` 범위와 Vercel 실행 때 목록 파일(P9c 위험 3) | P9c 작업 7 (나) `.nft.json` · H1 뒤 첫 프리뷰 |
| 9 | 생각 꺼내기 프롬프트가 모델의 최소 캐시 길이를 넘는지(P9b) | P9c 관찰의 캐시 읽기 토큰 |
| 10 | P6 대체 모델 행의 `thinkingOffEfforts` 일부(plan-p06a 의 추측) | P9c 계약 `models` |

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름 · 검사) | 파일 · 명령 |
|---|---|---|
| AC-8i(P9 몫: 조합 · 구간 키) | 단위 "AC-8i ai.effort.talk_turn 을 xhigh(또는 max)로 두면 '끔'과 함께 받지 않는다" · "AC-8i 쓰기 확인 모델을 Opus 5.5 로 두고 '끔'을 고르면 받지 않는다" · "AC-8i 4~6 구간 회화 모델을 Haiku 5.5 로 바꾸면 그 구간 회화 턴은 disabled 로 나가고 대체 모델 재시도가 없다" · "AC-8i 1-3 구간 effort 를 medium 으로 바꿔도 4-6 구간 회화 턴은 low 로 나간다" · "AC-8i 확인 호출 구성은 ai.model · ai.effort · ai.thinking 값과 관계없이 6.1 표의 조합이다". 저장 거부의 적재 몫(seed-load)은 P7, 회화 턴 · 확인 호출 요청 자체는 1-나 | `tests/unit/combo.test.ts` · `pnpm test` |
| 6.1 조합 · 요청 구성 | 단위 "6.1 '끔'은 Sonnet 5.5 between_tools · Haiku 5.5 disabled · Opus 5.5 adaptive 로 보낸다" · "6.1 Sonnet · Opus 는 fallbacks default 와 server-side-fallback-2026-07-01, Haiku 는 둘 다 없다" · "6.1 최대 출력은 ai.max_tokens.<목적>, 끝맺음 턴은 talk_turn 모델 값과 talk_closing 최대 출력" · "6.1 첨삭 · 끝맺음 턴은 feedback 타임아웃, 나머지는 realtime" · "6.1 시험용 단가표(여섯 행)가 P4a ModelPricesFileSchema 를 통과하고 조합 칸을 그대로 옮긴다 · thinkingDefault 'none'(Opus 4.8)을 받는다" | `combo.test.ts` |
| 6.1 비용 | 단위 "6.1 비용: 단가표 단가로 토큰 넷을 센다(소수 여섯 자리, 부동소수 없음)" · "6.1 비용: 대체 모델이 답하면 iterations 항목마다 그 모델 단가로 더한다" · "6.1 비용: 단가표에 없는 모델은 claude-opus-4-8 단가와 단가 없음" · "6.1 비용: 출력 전 거절은 bio · frontier_llm · reasoning_extraction 일 때만 세고 출력 도중 거절은 나온 만큼 센다" · "6.1 단가 고르기: 모델마다 effectiveFrom 이 날짜 이하인 줄 가운데 가장 늦은 줄을 쓰고 미래 줄은 뺀다(시드 파일의 수 · DB 의 글 모두)" · "6.1 단가 고르기: 같은 모델 · 같은 날짜 줄이 둘이면 던진다" · "6.1 단가 고르기: 시드 파일을 priceRowsOfSeed 로 바꾸면 같은 값의 DB 줄과 같은 단가표가 된다" | `tests/unit/ai-outcome.test.ts` |
| 8절 분류 | 단위 "8절 분류: 한도 머리 400(조직 · 워크스페이스)과 enforced_spend_limit_reached 429 는 콘솔 한도" · "8절 분류: 401 · 402 · 403 은 계정 확인 필요" · "8절 분류: 한도 아닌 429 · 5xx · 529 · 타임아웃 · 연결 실패는 장애(이어진 실패 수에 듦)" · "8절 분류: 한도 아닌 400 · 404 · 413 과 정본 밖 4xx 는 다시 보내도 같은 오류(C17, 실패 수에 들지 않음)" · "8절 분류: 연결 실패만 다시 보내기 대상이다" | `ai-outcome.test.ts` |
| 6.1 클라이언트 · 시도 | 단위 "6.1 클라이언트: 키가 없으면 만들지 않는다(프로필 자격 증명으로 넘어가지 않음)" · "6.1 클라이언트: Vercel 배포(VERCEL_ENV 있음)는 ANTHROPIC_BASE_URL 을 읽지 않는다" · "6.1 클라이언트: maxRetries 0 · logLevel warn · OpenTelemetry 끔 · authToken null" · "6.1 시도: 500 을 받으면 요청은 한 번뿐이다(SDK 기본 재시도 없음)" · "6.1 시도: 요청 본문에 temperature · top_p · top_k · metadata 가 없고 betas 는 anthropic-beta 머리글로 간다" · "6.1 시도: 가짜가 답을 늦추면 timeoutMs 뒤 타임아웃 실패다" · "가짜: 규칙 차례 · times · bodyIncludes · 요청 기록" | `tests/unit/ai-client.test.ts` |
| 6.1 · 5절 기록 | 통합 "6.1 기록: ai_calls 한 행에 학습일 · 요청 · 답한 모델 · 토큰 넷 · 비용 글 · 단가 없음 · 결과 상태 · error_code 가 그대로 남는다" · "6.1 단가표: 학습일보다 늦은 적용일 줄은 쓰지 않고 모델마다 가장 늦은 줄을 쓴다" · "6.1 하루 사용량: 확인 호출 밖, 막힌 호출(safety_cap)은 호출 수에서 빼고 비용은 집 전체 합" · "C17 같은 오류 세기: 같은 목적 · 학습일의 same_error 만 센다" · "알림 한 번: 같은 (종류 · 프로필 · 기준 키 · 학습일)은 동시에 두 번 불러도 한 행" · "가짜 HTTP 서버: SDK 가 baseURL 로 가짜 서버에 붙어 같은 규칙으로 답을 받는다" | `tests/integration/ai-store.test.ts` · `pnpm test:int` |
| 5절 더하기만 | 기존 통합 "마이그레이션: drizzle/*.sql 에 DROP … SET NOT NULL 이 없다"가 0002 도 본다 | `rls-grants.test.ts`(P3a) |
| 공통 | `pnpm exec biome ci .` · `pnpm build` · `pnpm test` · `pnpm test:int` · `pnpm check:deps` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` · `pnpm check:bundle` | CI `ci / lint · build · unit · integration · depcruise · spec-trace · bundle-secrets` |

## 완료 보고 (Done)

구현 뒤 채운다.
