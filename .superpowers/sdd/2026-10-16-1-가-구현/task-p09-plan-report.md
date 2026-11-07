# 보고: P9 하위 plan 작성(AI 호출 층)

브리프: `task-p09-plan.md` · 쓴 사람: 계획자(general-purpose · Opus · xhigh) · 일시: 2026-10-16 · 상태: DONE_WITH_CONCERNS(셋으로 나눴고 셋 다 파일 열 개를 조금 넘는다. 착수 전에 13절 한 줄이 필요한 정할 것이 넷이다)

## 쓴 파일

| 파일 | 줄 | 손으로 쓰는 파일 | 작업 수 | 바탕 · 브랜치 |
|---|---|---|---|---|
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p09a-AI-호출-바탕.md` | 290 | 14(새 11 · 고침 3, 시험 4) | 7 | P3a `25041d9` + P4c `6bd6015` 를 합친 끝 → `feature/1a-p09a-ai-client` |
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p09b-AI-호출-넷.md` | 227 | 12(새 11 · 고침 1, 시험 3) | 8 | P9a 끝 → `feature/1a-p09b-ai-calls` |
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p09c-AI-흐름-계약.md` | 219 | 12(새 11 · 고침 1, 시험 5) + 자료(응답 표본 JSON) | 8(8 은 [사람]) | P9b 끝 → `feature/1a-p09c-ai-flow` |
| 이 보고 | — | — | — | — |

세 plan 은 머리에서 서로를 가리킨다. draft 로 썼고 컨트롤러가 23:4x 에 승인했다(C63, 머리의 '컨트롤러 결정'). 코드 · 설치 · 생성 명령은 돌리지 않았다. 돌린 것은 읽기뿐이다(설치판 `node_modules` · 워크트리 읽기, `git show`, 이 저장소의 zod · SDK 로 견본 규격을 바꿔 본 `node -e` 한 번, 공식 문서 WebFetch 다섯 쪽). 저장소의 다른 파일은 고치지 않았다.
작성 중에 컨트롤러 커밋 `513b02e`(C61 · plan-p06a 승인)가 들어와 그것에 맞췄다: 6.6 단가는 이미 채워짐, 설정값 꼴(`ai.thinking` `off` · `adaptive`, `writing.max_corrections` 단계 → 수 사전), model_prices `thinkingDefault` 'none' 은 P9 몫(P9a 에 넣음), 대체 모델 Opus 5 행.
이어 컨트롤러 전달(P6 계획이 정한 설정 값 꼴 · 단가 · 규격 빈틈)을 반영했다. P9a 작업 3 에 (가) 규격 한 줄 · (나) 바탕에 `seed/model-prices.json` 이 있으면 opus-4-8 행 'none' · `pnpm test` 전체(P4 시험 포함) · `pnpm seed:validate` 0 을 적었다. P9c 작업 8 · H4 표에는 `models` 사례 결과로 P6 대체 모델 행을 고치는 일을 적었다. 그 확인 중 설치판에서 본 두 가지도 한 줄씩 넣었다: 거절의 `fallback_credit_token` 은 `fallbacks` 와 함께 못 써 쓰지 않는다(P9a 확인한 사실 2), 조직 지출 한도 읽기 끝점은 앱 서버에서 쓰지 않는다(P9c 위험 9).
다시 컨트롤러 전달(P5a 가 정한 SDK 쓰는 꼴, C62)을 승인 뒤에 반영했다. P9a 확인한 사실 12: 요청 본문 칸 · 응답 읽는 차례(stop_reason → text 블록 → `JSON.parse` → `safeParse`) · usage 칸이 P5a 와 같고, GA 요청 형에 `fallbacks` 가 없어 P9 만 베타 create 를 쓴다. 단가 고르기(적용 날짜)는 `src/core/ai/cost.ts` 의 순수 함수 `priceBookOf(rows, onDay)` 로 옮겨 store 는 줄을 읽기만 하고 P5a 가 바꿔 쓸 수 있게 했다. P9a 에 '다른 P 에 넘길 것' · '확인할 사실' 절을 두었고, P9c 흐름 9 의 읽는 차례와 관찰표의 'H4 첫 실호출' 표(P5a `--probe` 줄)를 적었다.

## 요지

- P9a(바탕): 조합 검사 · '끔' 변환 · 요청 구성(`src/core/ai/combo.ts`), 실패 분류(8절 갈래 + 1-나가 쓸 칸), 비용 셈(iterations · 거절 과금 · 정수 마이크로달러), 굳힌 SDK 클라이언트(`maxRetries 0` · 키만 · Vercel 에서 주소 고정 · logLevel warn · 추적 끔), ai_calls 기록 · 단가표 · 하루 사용량 · 알림 한 번(`src/server/ai/{client,store}.ts`), 가짜 Anthropic(SDK `fetch` 주입 + 같은 처리기의 로컬 HTTP 서버).
- P9b(호출 넷): 쓰기 확인 · 첨삭 · 말하기 평가 셋 · 생각 꺼내기의 프롬프트 · 엄격 / 느슨한 규격 · 정규화 · 실시간 출력 검사 · 걸린 칸 바꾸기, 이름 · 연락처 가림, 요청 본문 만들기. 모두 `src/core`(순수)라 서버와 `tsx` 스크립트가 같이 쓴다.
- P9c(흐름 · 계약): 호출 하나의 흐름(설정 → 학습일 → 조합 → 호출 앞 판정 → 가림 → 시도 ≤ 2 → 기록 → 정규화 · 검사), P11 이 부를 공개 함수 넷, 시드 목록 읽기, AC-8a 판정 함수, `pnpm ai:contract`(9절 AI 계약(수동) + Models API 대조) · `pnpm ai:observe`(9절 표본 평가 · 관찰표).
- spec-trace 의 missing-test 는 P9 셋이 끝나면 9 줄어든다(a 8i · b 4b · 5d · c 8a · 8b · 8c · 8d · 8n · N2). AC-N4 는 P1b 시험이 이미 있어 줄지 않는다.

## 확인한 사실(2026-10-16)

P9a '확인한 사실과 출처' 표 1~12 에 출처 · 판과 함께 있다. 요지만 옮긴다.

| 사실 | 출처 |
|---|---|
| 단가(100만 토큰당): Opus 5.5 4 · 20 · 5분 캐시 쓰기 5 · 읽기 0.20, Sonnet 5.5 2 · 10 · 2.50 · 0.10, Haiku 5.5 0.10 · 0.50 · 0.125 · 0.01(10만 이하), Opus 5 · 4.8 5 · 25 · 6.25 · 0.50, Sonnet 5 2 · 10 · 2.50 · 0.20 — C61 (3) 과 같음 | platform.claude.com/docs/en/about-claude/pricing |
| `fallbacks: "default"` + `server-side-fallback-2026-07-01`, Haiku 5.5 는 없음, Sonnet 5.5 between_tools → Sonnet 5 는 disabled, iterations 가 시도별 과금 기록, 출력 전 거절은 bio · frontier_llm · reasoning_extraction 만 과금, 거절의 `fallback_credit_token` 은 `fallbacks` 와 함께 못 써 쓰지 않음 | …/build-with-claude/refusals-and-fallback |
| 직접 건 지출 한도 = 400 'You have reached your specified (workspace) API usage limits …', 등급 상한 = 429 `details.error_code: enforced_spend_limit_reached`(retry-after 없음) | …/api/rate-limits · …/api/errors |
| effort 기본(Opus 5.5 · Haiku 5.5 medium, Sonnet 5.5 high), between_tools 는 Sonnet 5.5 만 · high 이하, Haiku disabled 는 high 이하, Opus 5.5 disabled 는 늘 400 | …/build-with-claude/effort · …/api/errors |
| SDK 0.135.0: `zodOutputFormat` 이 enum · maxItems · minimum · maximum 을 문법에서 빼 설명 글로 옮김(직접 바꿔 봄), `beta.messages.parse` 만 `structured-outputs-2025-12-15` 를 붙이고 Zod 실패 때 응답을 버리고 던짐, apiKey 없으면 프로필 자격 증명으로 넘어감, debug 기록이 요청 본문을 남김, maxRetries 0 이면 타임아웃 = `APIConnectionTimeoutError`, Models API(`beta.models.retrieve`, GET `/v1/models/{id}?beta=true`, `betas` 는 `anthropic-beta` 머리글)에 `allowed_fallback_models` · 생각 형 · effort · lifecycle | 설치판 `node_modules/@anthropic-ai/sdk/src` |
| Next 16.4.2 `outputFileTracingIncludes` 꼴 | 설치판 Next 문서 |
| GA `messages.create` 요청 형에 `fallbacks` 가 없고 베타에만 있다. `output_tokens_details.thinking_tokens` 는 GA · 베타 모두 있고 null 일 수 있으며 머리글이 필요 없다. `messages.parse()` 는 text 가 JSON · 규격에 안 맞으면 `AnthropicError` 를 던져 응답을 잃는다(P5a 와 같은 까닭으로 create 를 씀) | 설치판 0.135.0 `resources/messages/messages.d.ts` · `resources/beta/messages/messages.d.ts` · `lib/parser.js` |

## (추측)으로 둔 것

1. 베타 끝점에서 구조화 출력에 `structured-outputs-2025-12-15` 머리글이 필요한지(SDK 베타 parse 를 따라 붙임, H4 계약이 확인).
2. 생각 끔(between_tools · disabled)과 구조화 출력을 함께 받는지(plan-p05a 위험 6 과 같은 물음). H4 뒤 P5a `--probe` 가 GA 길로 먼저, P9c 계약 `talk_config.*` 가 베타 길로 확인한다.
3. 대체 모델 응답에서 거절 홉 ↔ fallback 블록을 차례로 짝짓는 것(문서 예시 하나).
4. 모델 은퇴가 404 로 오는 것과 정본 밖 4xx(409 · 422)를 '다시 보내도 같은 오류'로 두는 것.
5. 타임아웃으로 끊은 요청의 과금 여부(0 으로 기록).
6. `outputFileTracingIncludes` 의 `"/*"` 가 깊은 경로까지 덮고 Vercel 실행 때 파일이 있는지(작업 7 에서 `.nft.json` 확인).
7. 생각 꺼내기 프롬프트가 모델의 최소 캐시 길이를 넘는지.
8. P6 대체 모델 행의 thinkingOffEfforts 일부(plan-p06a 의 추측 그대로, H4 계약의 Models API 대조가 확인).
9. 관찰 비용 약 4달러 · 계약 약 0.3달러(6.6 1회 비용 × 횟수).
10. 직접 건 한도 400 의 풀리는 시각 꼴(문서에 예 없음, H12 표본).
11. Models API 의 `allowed_fallback_models` 를 채우는 베타 값(설치판 · 문서에 없음). 계약 명령이 머리글 없이 한 번, `server-side-fallback-2026-07-01` 로 한 번 묻고, 둘 다 null 이면 '확인 못 함'으로 적는다.

이 목록은 9(어림)를 빼고 P9a '확인할 사실' 표에 확인하는 곳과 함께 있다.

## 묶음 plan · 브리프와 다르게 한 것

1. 셋(a · b · c)으로 나눴다. 브리프는 a(클라이언트 · 모델 구성 · 가짜 · 기록 · 비용 · 분류 · 가림) · b(나머지 전부)를 예로 들었으나 그러면 b 가 스물넷이 된다. 가림은 호출 넷의 입력 쪽이라 b 로, 조합 검사는 요청 구성과 한 표라 a 로 옮겼다.
2. 배정표 P9 파일 묶음 밖의 파일: `src/db/schema/operations.ts`(error_code 열), `src/core/seed/schema/reference.ts`(thinkingDefault 'none' — plan-p06a 정할 것 아), `src/core/seed/structure.ts`(AI 꼴 수, C54 (2) 한 곳), `src/server/seed-lists.ts`(시드 목록 읽기), `tests/fixtures/settings.ts`(ai.* 키), 시험 파일 더함(`tests/unit/{ai-outcome,ai-client,ai-request}.test.ts` · `tests/integration/{ai-store,safety-cap}.test.ts`).
3. 브리프 범위 줄의 '확인 호출 · AI 쉬는 중 상태 · 상태 전이'는 정본 11절 · 묶음 위험 8 · 델타 spec 대로 1-나에 두고 이음매만 둔다(P9a 정할 것 사).
4. '비용 알림'은 판정 함수(AC-8a)만 1-가, 알림 행 만들기는 1-나(11절, P9c 정할 것 바).
5. AC-8d 의 서버 몫 시험을 P9 에 둔다(묶음 증명 표가 P9 · P11).
6. 계약 명령에 Models API 대조 사례(`models`)를 더했다(plan-p06a 위험 11 'H4 뒤 P9 가 확인'의 길).
7. 단가 고르기(모델마다 적용 날짜가 가장 늦은 줄)를 SQL 대신 `src/core/ai/cost.ts` 의 순수 함수 `priceBookOf` 로 두었다(P5a 와 하나로 모으려고, 컨트롤러 전달 C62).

## 컨트롤러가 정할 것

| 항목 | 권함 | 13절 한 줄 |
|---|---|---|
| a 가. 셋으로 나눔 | 한 워크트리 · 한 구현자로 a → b → c, plan 마다 검토 · fix(P4 와 같음). 다른 길: b · c 를 묶고 검토만 둘로 | 불필요 |
| a 나. ai_calls `error_code` 열 + `learning_day` 색인(더하기만 마이그레이션 0002) | 더함. C17 '같은 목적 · 학습일의 같은 오류 셈'과 알림의 '오류 코드'에 필요 | **필요**(5절 · 6.1 열 목록) |
| a 라. 기술 선택 다섯 — 베타 create 하나 + 구조화 출력 머리글 · 클라이언트 굳히기 · 가짜 고르는 법(fetch 주입 / `ANTHROPIC_BASE_URL` 가짜 서버) · 정수 비용 · 정본 밖 4xx = 같은 오류 | 권함대로. b 나(가림 세부) · c 라(목록 실행 때 읽기)도 같은 줄에 묶기 | 필요(C51 · C55 처럼 한 줄) |
| a 사. '확인 호출 · AI 쉬는 중 상태' 범위 | 정본대로 1-나, P9 는 이음매 | 불필요 |
| b 가. 실시간 출력 검사 세부(길이 = 영어 칸의 3.6 문장 길이, '한 줄 · 한 문장' 칸은 정규화, 걸린 칸 바꾸기 표, 안전한 대사 '좋아요, 다음으로 가 볼까요?', 생각 꺼내기 질문이 걸리면 그 턴 실패) | 권함대로 | **필요**(아이 화면 문구 · 규칙) |
| b 다. 말하기 문법 지적 경계 = level_specs `questions.modelAnswer`(1~3단계) | 권함. 다른 길: level_specs 에 칸 더함(P4 · P6) | 불필요(해석) |
| b 라 · 마 · 바 · 사. 해요체 · 생각 꺼내기 단어 정규화 · 쓰기 확인 문장 수 어긋남 · 프롬프트 지시는 영어 | 권함대로 | 불필요 |
| c 가. 달의 경계: 6.1 '학습일이 속한 달' ↔ AC-8e '1일 0시 30분은 새 달' 어긋남 | 호출 시각의 한국 달력 달(AC-8e · 12절 · 4절), 6.1 문구 고침 | **필요** |
| c 나. 거절의 즉시 다시 요청: 6.1 'end_turn 이 아니면 1회' ↔ 8절 '호출 하나의 실패와 같이' | 즉시 다시 요청하지 않음(8절 · 문서), 6.1 문구 고침. AC-8k 는 다음 앱 진입의 밀린 첨삭으로 그대로 증명 | **필요** |
| c 다. 안전 상한으로 막을 때 ai_calls `safety_cap` 행(호출 수에서 뺌) | 권함 | 불필요 |
| c 마. parent_alerts 종류 값(`cost` · `console_near_limit` · `call_config_check` · `ai_rest` · `talk_safety_cap` · `feedback_failed`) | C56 (4) 위임이라 보고만 | 불필요 |
| c 사. 관찰표 결정 규칙(지연 p95 ≤ 5초 · 규칙 위반 적은 쪽 · 같으면 싼 쪽, max_tokens = ⌈2 × p99 ÷ 100⌉ × 100) | 권함. 결과 값은 H4 뒤 | H4 뒤 결과로 한 줄 |
| c 아. H4 뒤 두 명령을 누가 돌리나 | 요청자가 키를 `.env.local` 에 넣은 뒤 요청자 지시로 컨트롤러(키는 파일에서만 읽고 출력 안 함) | 불필요 |
| c 자. 개발용 워크스페이스 월 한도 금액 | 요청자 | 불필요 |
| C63 'H4 뒤 한쪽에 맞춤'(P5a GA create · P9 베타 create) | P9 는 베타에 둔다. GA 요청 형에 `fallbacks` 가 없어 옮기면 6.1 서버 측 대체가 빠진다(P9a 확인한 사실 12). 맞출 까닭이 생기면(P5a `--probe` 는 200 인데 P9 계약이 400 같은 때) P5a 를 베타 create + 머리글로 옮긴다(한 줄). 둘 다 200 이면 그대로 | 불필요 |

## 요청하는 공용 변경(P9c, 구현자가 자기 워크트리에서 옮기고 컨트롤러가 합칠 때 푼다)

| # | 파일 | 바꿀 것 |
|---|---|---|
| 1 | `package.json` scripts | `"ai:contract": "tsx scripts/ai-contract.ts"` · `"ai:observe": "tsx scripts/ai-observe.ts"` |
| 2 | `next.config.ts` | `outputFileTracingIncludes: { "/*": ["./seed/lists/**/*.json"] }`(시드 목록을 서버 함수 묶음에 넣음) |

P9a · P9b 는 공용 파일을 고치지 않는다. `playwright.config.ts` 의 가짜 AI 연결은 첫 소비자 P11 이 한다(아래).

## H4 전 · 뒤

| 때 | 할 수 있는 것 |
|---|---|
| H4 전 | P9a · b · c 의 작업 1~7 전부(가짜 클라이언트 · 손으로 만든 표본 · 두 명령의 dry-run). P11 은 공개 함수와 가짜로 세션을 짤 수 있다 |
| H4 뒤 | `pnpm ai:contract`(녹화 표본 → 계약 시험이 실제 표본으로, Models API 대조 → `models` 사례가 짚은 대체 모델 목록 · 생각 형 · 수명 어긋남을 P6 의 `seed/model-prices.json` 대체 모델 행에서 고치고 `--case models` 를 다시 돌려 종료 0, P9c 작업 8) · `pnpm ai:observe --yes`(관찰표 → 컨트롤러가 ai.thinking 셋 · ai.max_tokens 넷을 13절로 → P6 settings.json) · 요청자가 먼저 돌려 알린 P5a `pnpm seed:check --probe` 첫 줄을 관찰표 'H4 첫 실호출' 표에 옮긴다 |
| H12(1-나 확인 호출 전) | 개발용 워크스페이스 한도를 잠깐 낮춰 `pnpm ai:contract --case console-limit` → 표본 고정 → 되돌림. 1-가 동작에는 필요 없다 |

## 다른 P 에 넘길 것

- P6: 시험용 단가표(P9a 값 3)와 `seed/model-prices.json` 이 같은 여섯 행이다. opus-4-8 행의 'none' 은 P9a 작업 3 이 한다: (가) 규격 한 줄 → (나) 바탕에 `seed/model-prices.json` 이 있으면 그 행을 'none' 으로 → `pnpm test` 전체(P4 시험 포함) · `pnpm seed:validate` 0. 바탕에 없으면 P6 이 P9a 가 합쳐진 뒤 고치고, 그때까지 P6a 는 'adaptive' 로 둔다(컨트롤러 전달). H4 뒤 `pnpm ai:contract --case models` 결과(`allowed_fallback_models` 등)로 대체 모델 행을 고친다(P9c 작업 8, plan-p06a 위험 11). `lists/forbidden.json` 의 `contact` 정규식은 실시간 입력 가림에도 쓰이므로 전화번호 · 주소 · 전자 우편 꼴(한국어 · 영어)을 넣는다. `personal-info` 질문 패턴(영어 · 한국어)은 실시간 출력 검사가 쓴다. level_specs 말하기 `questions.modelAnswer` 는 1~3단계만 참(문법 지적 경계로 읽음).
- P7: model_prices.capabilities 는 P9a `capabilitiesOf(entry)` 꼴. 설정값 시드 적재는 P9a `checkSettingsCombos` 로 받지 않는 조합을 거부(AC-8i 의 seed-load 몫). 마이그레이션 0002 번호 · journal 충돌은 합치는 차례대로 다시 생성.
- P11: `src/server/ai/index.ts` 의 `checkWriting` · `writeFeedback` · `evaluateSpeaking` · `thinkoutTurn` 과 `AiOutcome` 갈래별 화면 처리(safety_cap → C50 (2) 문구와 '홈'). 서버 액션 첫 문장 `requireAccess()` 뒤에 부른다. 첨삭은 `after()` 안, `ctx.sessionId` 는 초고의 첫 세션, 거절 · 실패 수는 attempts 에서 센다(ai.feedback_max_attempts · '거절 두 번'). 생각 꺼내기 `historyEntry` 는 글자 그대로 저장해 돌려준다(캐시). 화면 · 읽어 주기의 `{NAME}` 은 P9b `fillName`. `LevelContext` 는 level_specs · unit_specs 에서 채운다. e2e 가짜 AI: Playwright 전역 준비에서 `startFakeAnthropicServer`, webServer 환경 `ANTHROPIC_BASE_URL` · 가짜 `ANTHROPIC_API_KEY`, 시험마다 다른 `bodyIncludes` 표시(공용 변경 `playwright.config.ts`). AC-8b 세션 몫은 `tests/integration/safety-cap.test.ts` 에 더하고, AC-8d 화면은 `timeout.spec.ts`. 동음이의어는 `src/server/seed-lists.ts` 의 `loadSeedList("homophones")`.
- P12: 단계 평가 쓰기 과제(6단계부터)는 `writeFeedback`(채점표만 씀, `forLevelTest: true`), 말하기 과제는 `evaluateSpeaking`(발표는 `withConfirmQuestions: false`).
- P5(plan-p05a, C62): P9a `cost.ts` 가 합쳐지면 P5a `src/core/seed/solve-check.ts` 의 `priceOf(models, model, onDate)` · `costOf(usage, price)` 를 P9a `priceBookOf(rows, onDay)` · `priceOf(model, book)` · `costOf(billedAttemptsOf(message, model), book)` 로 바꾼다. 고르기와 소수 6자리는 같고 셈은 정수다. 단가 없음은 지금처럼 입력 오류 2, 기록 `costUsd` 는 `Number(…)`, 시드 파일은 `priceRowsOfSeed(file)` 로 넘긴다(P9a '다른 P 에 넘길 것'에 같은 메모). P5a 위험 6(between_tools + 구조화 출력)은 P5a `--probe` 가 GA 길로 먼저, P9c 계약 `talk_config.*` 가 베타 길로 답한다(P9a '확인할 사실' 1). H4 뒤 P5a `--probe` 첫 줄은 관찰표 'H4 첫 실호출' 표로 옮긴다(P9c 값 7).
- 1-나: 'AI 쉬는 중' 상태 기계는 P9a `classifyFailure` 의 `countsTowardDown` · `rest` 와 `preCallGate` 의 상태 입력 자리를 쓴다. 확인 호출은 `probeConfigOf`. 비용 알림 행은 `dueCostAlerts` + `createAlertOnce`(그날 `"day"`, 그달 `"key"`). 대화 안전 상한은 `talkSafetyOf`. 회화 턴 규격 · 스트리밍(SDK `beta.messages.stream` 의 `text` · `finalMessage`, 첫 문장 시각, fallback 블록 뒤 text 이어 붙이기)과 가짜의 SSE 는 1-나가 더한다. 콘솔 한도 풀리는 시각 꼴은 H12 표본으로. `talk.next_time_lines` 도 단계 → 수 사전(`{ "5": 1, … "12": 2 }`, plan-p06a 정할 것 마)이다. 끝맺음 턴 정규화가 '다음엔 이렇게'를 자를 때 P9b 의 `writing.max_corrections` 와 같은 꼴로 `String(level)` 값을 읽고, talk.feedback_from_level 보다 낮은 단계에서는 읽지 않는다.
