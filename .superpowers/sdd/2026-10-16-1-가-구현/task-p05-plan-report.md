# 보고: P5 하위 plan(풀이 검사 · 시드 보기 화면) — 계획자 plan-p05(Opus · xhigh), 2026-10-16 22:xx

## 쓴 파일

배정표 P5 행이 손으로 쓰는 파일 스물둘(새 열아홉 · 고침 셋)이라 묶음 plan 위험 12 대로 셋으로 나눴다. 파일 머리마다 서로를 가리킨다. 상태는 모두 draft.

| 파일 | 범위 | 파일 · 단계 | 브랜치(제안) · 바탕 |
|---|---|---|---|
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p05a-풀이-검사.md` | `pnpm seed:check`(6.4 풀이 검사) + P5 전체의 확인한 사실 · 정할 것 · 비용 어림 | 파일 5 · 단계 7 | `feature/1a-p05a-seed-check` · P4c 6bd6015 |
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p05b-시드-보기.md` | 활동 표시 컴포넌트 · 로컬 전용 시드 보기 화면(읽기만) | 파일 10 · 단계 7 | `feature/1a-p05b-seed-viewer` · P2b b1b17d7 + P3b(커밋 뒤) + P4c 6bd6015 를 컨트롤러가 합친 줄기 |
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p05c-보기-기록.md` | 보기 화면의 표본 검토(reviews) · 사람 확인(checks) 쓰기, 아이 눈 순회 질문 | 파일 7 · 단계 6 | `feature/1a-p05c-seed-review` · P5b 끝 + P5a |

브리프가 적은 파일 이름 `plan-p05-풀이-검사-시드-보기.md` 는 만들지 않고 P3 · P4 처럼 a · b · c 파일로 나눴다. 저장소의 다른 파일은 고치지 않았고 설치 · 생성 명령은 돌리지 않았다. 확인용 임시 파일(biome `<img>` 경고 · zod 시각 규격)은 스크래치패드에서만 만들었다.

## 확인한 사실(표 전문은 plan-p05a '확인한 사실과 출처' 1~17, 2026-10-16)

- Anthropic SDK 0.135.0(설치판): `output_config: { effort, format }`, `thinking: { type: 'between_tools' }`, `zodOutputFormat`(`@anthropic-ai/sdk/helpers/zod`, `create` 에 주면 자동으로 풀지 않음), `messages.parse` 는 풀기 실패면 예외라 stop_reason 을 먼저 보려면 `create` + 자체 safeParse 가 낫다. usage 칸은 `input_tokens` · `output_tokens` · `cache_creation_input_tokens` · `cache_read_input_tokens`. 기본 재시도 2.
- 구조화 출력(공식 문서): Sonnet 5.5 지원, refusal · max_tokens 면 규격과 안 맞을 수 있음, 수 · 길이 제약은 클라이언트 검증, 응답에 추론을 적게 하면 reasoning_extraction 거절 위험.
- Sonnet 5.5 between_tools 는 effort high 이하 · 다른 칸 없이 · Sonnet 5.5 만, 서버 측 대체는 cyber · frontier_llm 만 다시 함(claude-api 스킬 문서 — 공식 문서 직접 확인은 못 함).
- 단가(공식 가격 쪽): Sonnet 5.5 입력 2 · 캐시 쓰기 2.50 · 캐시 읽기 0.10 · 출력 10달러/MTok — 정본 6.6 과 같다(스킬 문서의 0.20 은 틀림). Opus 5.5 캐시 쓰기 5 · 읽기 0.20 이라 견본 단가 표 값과도 맞다.
- Next 16.4.2(설치판 원본): next.config.ts 도 함수 `(phase)` 꼴을 받는다. `PHASE_DEVELOPMENT_SERVER` 일 때만 쪽 확장자를 더하면 next dev 에만 경로가 생긴다. next dev 는 `.next/dev/lock` 을 잡아 같은 폴더의 둘째 next dev 는 끝난다. next build 타입 검사는 `.next/dev/types` 를 걸러 낸다.
- Playwright 1.64.1: webServer 는 설정 단위이고 프로젝트에는 없다 → 로컬 전용 시험은 따로 둔 설정 파일이어야 한다. tsconfig paths 를 푼다.
- Node `--env-file-if-exists`(22.9+, 환경 값이 이김), tsx 4.23.15 의 `.` 내보내기는 로더(`node --import tsx`).
- 저장소: 의존 규칙 sdk-only-in-ai 의 설명이 '풀이 검사는 스크립트가 직접 부른다'(scripts/ 대상 밖, check:deps 는 src 만). P3b 함수 안 확인 훑기는 'use server' 와 `route.ts` 이름만 본다(`route.local.ts` 는 못 봄 → 서버 액션만 씀). 한 시계 훑기 범위는 src/core · server · db · proxy. spec-trace 는 tests 아래 모든 `.spec.ts` 를 센다(e2e-local 포함). biome next 도메인이 `<img>` 를 경고 → next/image.
- P4: `collectCells` · `cellHash` · `itemsOf` · `solveTargets` · `solveStatus`(후보 견주기 trim · 소문자) · `checksFilePath` · `reviewFilePath` · `CheckFileSchema` · `ReviewFileSchema`(행 칸 다섯) · `readSeedTree` · 견본 `sampleSeedTree` · `miniSeed`(풀이 기록 포함).

## (추측)

- 비용 어림: 1-가 실시드(C50 (4)) 약 3달러, 첫 운영 배포 범위 약 15달러(문항 칸 하나 입력 약 500 · 출력 약 60 토큰으로 셈). 6.6 '전체 50달러 이하 · 첫 배포 절반쯤' 안.
- between_tools 와 구조화 출력을 함께 보내도 400 이 나지 않는다(문서에 막는 말이 없고 6.1 회화 턴이 같은 조합) — P5a 작업 7 `--probe` 가 확인.
- 아이용 문항에서 거절은 드물다. 개발 서버 첫 컴파일 10~30초. 실시드에서 보기 화면 · 전체 검증의 시간.

## 묶음 plan 과 다르게 한 것

1. P5 를 a · b · c 셋으로 나눴다(위 표). 브리프는 a · b 를 예로 들었으나 b 가 파일 열일곱이라 쓰기를 c 로 뗐다.
2. AC-7f 의 '프리뷰 · 운영 빌드에서 안 열림'은 개발 서버 시험(e2e-local)으로 볼 수 없어 `tests/e2e/seed-viewer-absent.spec.ts`(운영 빌드 404)를 더했다.
3. `pnpm e2e:local` 은 같은 설정의 '새 Playwright 프로젝트'가 아니라 따로 둔 설정 `playwright.local.config.ts` 다(webServer 가 설정 단위).
4. 묶음 plan 파일 묶음 밖의 새 파일: `src/core/seed/solve-check.ts` · `src/core/seed/review-walkthrough.ts` · `src/server/seed-viewer/files.ts` · `tests/fixtures/seed/fake-solver.ts` · `tests/unit/seed-check-cli.test.ts` · `tests/unit/seed-viewer-write.test.ts` · `tests/e2e/seed-viewer-absent.spec.ts`. `seed/{checks,reviews}/` 는 폴더 자리 파일 없이 처음 쓸 때 생긴다(P1a 규약).
5. 풀이 검사는 P9 의 `src/server/ai` 를 기다리지 않고 스크립트가 SDK 를 직접 부른다(P1b 의존 규칙 설명대로, 임시 클라이언트를 나중에 바꾸는 일 없음).
6. 아이 눈 순회 '네 질문'은 리버스 엔지니어링 스킬 표대로 인지 순회 넷 + 우리 넷 여덟으로 했고, 행 칸을 늘리지 않고 메모 머리로 남긴다.
7. 회화 카드 · 회화 평가 장은 보기 화면에서 어른용 표로만 보인다(아이 화면은 1-나).
8. H4 뒤 첫 실호출 확인(`pnpm seed:check --probe`, 호출 하나)을 [사람] 단계로 더했다.

## 컨트롤러가 정할 것(번호는 plan-p05a '정할 것' 표와 같다)

13절 한 줄이 꼭 필요한 것은 없다. '아'는 기술 선택이라 C51 · C55 처럼 남기고 싶으면 한 줄을 권한다. 다른 길을 고르면 13절이 필요한 것은 표에 적었다(나 · 차 · 타).

| 번호 | 무엇 | 권하는 답 | 13절 |
|---|---|---|---|
| 가 | 셋으로 나눔 · 바탕 브랜치 | a 는 6bd6015 위, b 는 P2b · P3b(커밋 뒤) · P4c 를 합친 줄기 위, c 는 a · b 를 합친 위. a ∥ b | 아니오 |
| 나 | 풀이 검사 호출 설정 자리 | 스크립트 머리 이름 붙인 상수(6.4 값 + max_tokens 4000 · 60초 기술 값), 12절 키 안 둠, P7 check-ids 허용 목록 | 아니오 |
| 다 | 스크립트 재시도 | SDK 기본 2회(6.1 · C1 의 0회는 실시간 호출 규칙) | 아니오 |
| 라 | 거절 처리 · 대체 모델 | 거절이면 대상 문항 모두 none → 사람 확인, fallbacks 안 보냄 | 아니오 |
| 마 | 그림 보기 꼴 | vocab 한국어 뜻 '그림: 사과' | 아니오 |
| 바 | 글 답 견주기 | 앞뒤 공백 · 대소문자만 무시(solveStatus 와 같음) | 아니오 |
| 사 | 한 호출 단위 | 칸 하나(수업 칸 = 수업 하나) | 아니오 |
| 아 | 로컬 전용 길 | next.config 함수 꼴 + PHASE_DEVELOPMENT_SERVER 일 때만 `local.tsx`, NODE_ENV 확인 두 겹 | 선택(기술 선택 기록) |
| 자 | e2e-local 꼴 · CI | 따로 둔 설정 + `pnpm e2e:local`, CI 작업 e2e-local 더함 | 아니오 |
| 차 | 아이 눈 순회 질문 자리 | 여덟 질문 점검표 + 메모 머리 `[순회 아니오: …]`, 행 꼴 그대로 | 아니오 |
| 카 | 지시문을 고친 뒤 다시 풀기 | 고친 커밋에서 컨트롤러가 `--force` 여부를 정함 | 아니오 |
| 타 | 요청자 로컬 보기 화면 전제 | 그대로(/dev/* 쿠키, 쿠키는 H3 · P7 뒤 접근 코드로 받음 — P8 표본 검토가 그 뒤라 맞음) | 아니오 |
| 파 | 활동 표시 컴포넌트 범위 | 내용 부분만, 버튼 · 상태 · 세션 틀은 P10 · P11, 회화 아이 화면은 1-나 | 아니오 |
| 하 | 날짜 · 시각 | 검토 행 date 는 now() 의 app.timezone 달력 날짜, at 은 UTC ISO, 단가 행은 UTC 날짜 | 아니오 |

정할 것 밖에서 컨트롤러가 먼저 할 일은 P3b 커밋과 P5b 바탕 줄기 합치기다. biome 의 seed 제외(P4a 정할 것 ㅌ)는 P6a 가 `"!seed/**/*.json"` 으로 더하므로 P5 의 일이 아니다(아래 '컨트롤러 전달 반영').

## 요청하는 공용 변경(전문은 각 plan 의 '요청하는 공용 변경')

| 번호 | 파일 | 무엇 | plan |
|---|---|---|---|
| 1 | `package.json` | `"seed:check": "node --env-file-if-exists=.env.local --import tsx scripts/seed-check.ts"` | P5a |
| 2 | `next.config.ts` | 함수 꼴(phase) — P1a 값 · P2b preview.tsx · P3b authInterrupts 를 담고 next dev 에서만 `local.tsx` | P5b |
| 3 | `package.json` | `"e2e:local": "playwright test --config playwright.local.config.ts"` | P5b |
| 4 | `playwright.local.config.ts`(새 뿌리 파일) | next dev 3200, 기존 서버 다시 쓰지 않음, 시험용 접근 해시 · `SEED_VIEWER_ROOT` 를 서버 환경에 | P5b |
| 5 | `.env.example` | `SEED_VIEWER_ROOT=`(로컬 전용) | P5b |
| 6 | `.dependency-cruiser.cjs` + `tests/unit/dependency-rules.test.ts`(권함) | 규칙 `seed-viewer-only-from-viewer` 와 막는 예 · 허용 예 | P5b |
| 7 | `.github/workflows/ci.yml`(권함) | 작업 `e2e-local`(API 0회) | P5b |
| — | `biome.json` | P5 는 요청하지 않는다. P6a 가 includes 에 `"!seed/**/*.json"` 을 더한다(P4a ㅌ) — 겹치는 줄 없음 | P6a |

## 다른 P 에 넘길 것

- P6: settings.json 의 `app.timezone`(P6a 에 있음)으로 검토 행 날짜를 쓴다. model-prices.json 여섯 행 가운데 `claude-sonnet-5-5` 행은 `thinkingOff: "between_tools"` · `thinkingOffEfforts` 에 `low` 가 있어야 seed:check 가 시작한다(단가는 공식 가격 쪽과 같은 6.6 값). 보기 화면 그림은 images.json 의 `file`(`images/vocab/<키>.svg`)을 `next/image` 로 보인다 — src 가 .svg 면 Next 가 저절로 최적화를 건너뛰어 파일을 그대로 `<img>` 로 내보내므로 막히지 않는다(설치판 image.md 935~943줄, P6 메모의 '막힐 수 있다'는 최적화기를 거칠 때 얘기). P6 · P10 이 맨 `<img>` 를 쓰면 biome noImgElement 경고가 난다. CC-BY 그림의 저작자 표시는 보기 화면 덧붙임에도 적는다. 참고로 견본 단가 표의 Opus `thinkingOff`(between_tools) · 세 모델의 `effortDefault` 는 6.1 표와 다르다(견본만, 실데이터는 6.1 대로).
- P7: `seed/reviews` 행을 seed_reports(신고자 '개발자')로 적재할 때 메모의 `[순회 아니오: …]` 머리는 글 그대로 둔다. check-ids 허용 목록에 seed-check 호출 상수(`SOLVE_*`)와 4절 크기 상수를 넣는다. 요청자가 로컬 보기 화면 쿠키를 받으려면 개발용 DB 에 설정 행이 있어야 한다(dev-load 뒤).
- P8: `pnpm seed:check --areas <영역> --levels <단계> --json`(version 1, 종료 0 · 1 · 2, 다시 돌리면 남은 칸만, `--max-calls`) 이 묶음 워크플로 '풀이 검사' 점이다. 사람 확인 칸은 `/dev/seed-viewer?file=…&cell=…` 로 열고 H11 표본 검토는 보기 화면의 검토 칸(순회 질문 여덟)으로 한다. 풀이 검사를 돌리는 동안 같은 묶음의 사람 확인을 남기지 않는다(P5a 위험 8). 6.3 순서 (2) 에서 대상 문항 수 · 사람 확인 비율 · 칸당 비용 · 출력 p99(`SOLVE_MAX_TOKENS` 고치기)를 seed:check 요약에서 잰다.
- P9: SDK 쓰는 꼴(`create` + `zodOutputFormat` + stop_reason 먼저 + safeParse, between_tools · low)을 AI 계약(수동)과 맞추고, `--probe` 첫 응답 꼴을 관찰표(역분석 제안 5)에 한 줄로 남긴다. `src/core/ai` 에 단가 고르기가 생기면 solve-check 의 `priceOf` 를 그것으로 바꾼다.
- P10: `src/components/activities` 는 내용 부분 · 영역 색 이름(`AREA_TONE`) · 4절 크기 상수 · `className` 만 정한다. 코르크 · 종이 띠 · 글꼴은 board 가 맡고 같은 색 이름을 쓴다. 그림은 정사각 하나를 next/image(unoptimized)로 보인다(`VocabPicture` 를 함께 쓴다).
- P11: 활동 표시 컴포넌트에 누름 · 고름 · 타일 · 마이크를 선택 속성으로 더한다(묶음 위험 13). `reveal` 은 3.3 '틀리면 정답을 보여 주고 다시 한다'에 쓴다. 보기 화면 e2e-local 이 회귀를 잡는다.
- 1-나: 회화 카드의 아이 화면 모습(보기 화면은 지금 어른용 표만). 2차: 단원 미리보기가 보기 화면의 칸 보기 · 활동 표시를 다시 쓴다(4절).

## 컨트롤러 전달 반영(P6 계획 결과, 2026-10-16 22:3x)

| 전달 | 반영한 곳 |
|---|---|
| 그림은 `public/images/vocab/<키>.svg`(Twemoji v17.0.3 CC-BY 4.0 + 그린 SVG `generated`), 그림 자리는 정사각 하나, P6 메모 'next/image 가 svg 를 막을 수 있다(추측)' | 설치판 Next 문서로 확인해 막히지 않음을 적었다(P5a 확인한 사실 16). P5b `common.tsx` 의 단어 그림을 정사각 하나 · `next/image` unoptimized 로, 지킬 것에 SVG 경로 · 덧붙임의 그림 키 · 라이선스 · 저작자 표시를, 위험 7 을 P6b · H7 로 고쳤다 |
| 규격 파일은 P6a 가 만든다(settings 약 180행 · level-specs 48 · unit-specs 242 · vocab 약 2,000 · images · model-prices 여섯 · lists 넷), 그 전에는 P4 견본으로 시험 | P5a 확인한 사실 17 과 정할 것 하(`app.timezone` 이 P6a 에 있음), P5b 시험 자료(견본 `sampleSeedTree` · 꽉 찬 1단계는 `miniSeed`, P6a 뒤 컨트롤러가 실시드로 한 번 열어 봄) · 위험 8(실데이터 크기), P5c 위험 5 |
| P6a 가 `biome.json` 에 `"!seed/**/*.json"` 을 더함 | P5a 공용 변경 문단 · 위험 9 와 이 보고의 공용 변경 표에서 P5 의 요청을 뺐다(겹치는 줄 없음) |
