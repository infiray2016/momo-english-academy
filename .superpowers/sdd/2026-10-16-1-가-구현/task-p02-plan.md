# 브리프: P2 하위 plan 작성(음성 접점과 실기 확인)

역할: 계획자(general-purpose · Opus · xhigh). 코드를 만들지 않고 plan 파일과 보고만 쓴다. 설치 · 생성 명령(`pnpm add` · `npx` · `pnpm create`)은 실행하지 않는다. 판 확인용 `npm view <패키지> version` 과 공식 문서 읽기(WebFetch · WebSearch)는 된다. 저장소의 다른 파일은 고치지 않는다. 읽기 명령은 `source ~/.nvm/nvm.sh && nvm use >/dev/null && ` 로 시작한다.

## 바탕(지금 저장소 상태, 2026-10-16 14:2x)
- 브랜치 `feature/1a-p01b-quality-gates` 끝 08cce00 이 바탕이다(P1a 뼈대 b0b6a46 · P1b 품질 관문 cf97f62 · 문서 08cce00). 원격은 아직 없다(H15, 요청자 몫). 이 하위 plan 의 구현 브랜치는 08cce00 에서 가지 치고 워크트리 하나씩이다(컨트롤러가 만든다). 브랜치 이름은 ASCII.
- 이미 있는 것은 하위 plan 둘을 읽어 안다: `intent/2026-10-15-모모-잉글리시-아카데미/plan-p01a-뼈대.md`(폴더 규약 `src/{app,core,server,lib,components,db}` · `tests/{unit,integration,e2e,…}` · Biome · Vitest unit · integration 프로젝트 · Playwright 10.9형 · `.env.example` 이름만) · `plan-p01b-품질-관문.md`(의존 규칙: `src/core` 는 db · next · react · `src/server` 금지 · 순환 금지, `src/server/ai` 안의 SDK; spec-trace: 시험 이름은 `AC-<번호>` 로 시작하고 15절에 있어야 하며 묶음 plan 증명 표 AC 마다 시험이 있어야 함(지금 missing-test 66); check-bundle; 구현자 끝내기 관문이 끝낼 때마다 `biome ci` 와 단위 시험 전체를 다시 돌림 — 단위 시험은 빠르고 DB · 네트워크 없이, 통합 시험은 `tests/integration` 에 두고 `pnpm test:int` 로).
- P2 · P3 · P4 가 동시에 돈다. 파일 묶음은 배정표 행 그대로이고, 그 밖의 공용 파일(`package.json` · `vitest.config.mts` · `playwright.config.ts` · `.github/workflows/ci.yml` · `.env.example` · `.dependency-cruiser.cjs`)을 고쳐야 하면 plan 에 '요청하는 공용 변경' 절을 두고 모아 적는다(셋이 동시에 고치면 충돌하므로 컨트롤러가 합친다). 다른 P 의 파일 묶음은 손대지 않는다.
- 요청자 결정 C52(13절): 기능 작업은 전체 루프(이 plan → 컨트롤러 승인 → implementer → code-reviewer xhigh → fix ≤3). plan 은 PR 하나 분량(파일 열 개 · 단계 여덟 이하), 넘으면 a · b 로 나누고 각 파일 머리에 서로를 가리킨다(묶음 plan 위험 12).

## 먼저 읽을 것(공통, 순서대로)
1. `.claude/skills/plan-build/SKILL.md` — 템플릿과 지킬 것. 절 이름 그대로.
2. `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` — 묶음 plan. 배정표(69~86줄)의 이 P 행, 작업 순서 3(56줄), [사람] 단계(87~105줄), 위험(136~159줄) · 정할 것(160~170줄, C50 으로 정해짐) · 제약(171~185줄), 증명 절 머리(186~193줄: 공통 명령 · CI 작업 이름 · 시험 이름 규칙)와 증명 표의 이 P 행들.
3. `.claude/CLAUDE.md`(Conventions · Architecture · Things Claude gets wrong), `intent/README.md`(하위 plan 규약), `specs/README.md`(지도), `specs/10-결정-기록.md` 13절의 C49 · C50 · C51 · C52 와 이 P 에 닿는 결정 행.
4. 하위 plan 둘(위 '바탕').

## 만들 것
- `intent/2026-10-15-모모-잉글리시-아카데미/plan-p02-음성-접점.md`(상태 draft). 브랜치 제안 `feature/1a-p02-speech`.
- 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p02-plan-report.md`: 쓴 파일 · 확인한 사실(출처 URL · 판) · (추측) 으로 둔 것 · 묶음 plan 과 다르게 한 것 · 컨트롤러가 정할 것 · 요청하는 공용 변경.

## 이 P 에서 더 읽을 것
- 정본 `specs/07-음성과-오류.md` 7절 전부(인식 · 읽어 주기 · 듣기 끝 · 감시 타이머 · 이어 붙이기 · 오류 행), 8절 가운데 음성 오류 처리 행. `specs/05-AI-호출.md` 6.2(따라 말하기 일치율 — AI 없는 순수 함수). `specs/08-테스트와-기술.md` 9절의 음성 점검 · 가짜 음성 규칙, 11절의 '첫 작업은 실기 확인'. `specs/11-요구사항과-수용-기준.md` AC-5a · AC-5e · AC-N3 과 그 FR. `specs/09-설정값.md` 음성 관련 키(감시 타이머 · 일치율 통과 기준 등 — 숫자는 거기서). `specs/03-화면.md` 의 말하기 세션 · 배치 평가 화면에서 음성 접점이 받는 요구(화면 자체는 P10 · P11).
- 조사 `docs/research/2026-10-16-reverse-engineering.md` 의 제안 4(관찰 페이지와 가짜 대본)와 `docs/research/2026-10-15-program-reverse-engineering.md` 의 브라우저 음성 관찰 결과. 묶음 plan 위험 1(기기 차이) · 2(HTTPS), [사람] H1(Vercel 연결 · 프리뷰, P2 시작) · H2(실기 확인 항목 그대로 점검표로).

## P2 범위(배정표 75줄 그대로)
- 인식 · 읽어 주기 인터페이스(`src/lib/speech/` 브라우저 접점, Web Speech API 감싸기, 가짜 구현을 같은 인터페이스로), 듣기 끝 · 감시 타이머 · 이어 붙이기(`src/core/speech/` 순수 로직), 일치율 순수 함수(6.2, `src/core/speech/`), 관찰 페이지 `src/app/dev/speech-probe/`(읽어 주기 → 인식 교대, 오류 · 이벤트 로그를 화면에 남김, 가짜 대본 `tests/fixtures/speech/`), 점검표 `docs/checklists/speech-check.md`(H2 의 기기 · 항목을 표로, 결과 칸 비움).
- 완료 판정: H2 결과표가 남는다. 실패면 S7 결정이 13절에 있다. 증명: `tests/unit/match-rate.test.ts` · `tests/unit/listen-end.test.ts`(AC-5a · 5e 이름), 관찰 페이지의 e2e 하나(가짜 음성), AC-N3 은 수동(점검표).
- 범위 밖: 말하기 · 배치 세션 화면(P10 · P11), 서버형 음성 인식(S7 뒤), 접근 쿠키(P3 — 관찰 페이지는 1-가 프리뷰 보호로만 가리고 운영 빌드에서는 뺀다, 방법은 확인해 적는다).

## 꼭 확인할 사실(공식 문서 · MDN · caniuse. 출처와 날짜를 plan 에)
- Web Speech API 지원 현황: iPad Safari(`webkitSpeechRecognition`, Siri · 받아쓰기 조건, HTTPS), Android Chrome(`continuous` 무시 · 첫 쉼에서 끝남), Windows Edge. 오류 코드 목록(`not-allowed` · `no-speech` · `network` · `language-not-supported` …)과 7절 오류 행의 대응 — 7절에 없는 코드는 위험 절에.
- SpeechSynthesis 의 영어 음성 선택 · 끝 이벤트 · iOS 의 사용자 동작 요구. 읽어 주기와 인식을 번갈아 할 때의 겹침 처리.
- Next.js 16 에서 브라우저 전용 코드 분리(`'use client'`, 서버 렌더 때 `window` 접근 금지)와 개발용 경로를 운영 빌드에서 빼는 방법. 설치된 판의 문서 `node_modules/next/dist/docs/` 를 먼저 본다.
- Playwright 에서 가짜 음성(인식 결과 주입 · 읽어 주기 끝 이벤트)을 넣는 방법(`addInitScript` 등).

## 지킬 것
- 설계를 바꾸지 않는다. 정본과 다르게 해야 하면 plan '위험' 절에 적고 보고의 '컨트롤러가 정할 것'에 올린다. 컨트롤러가 13절에 한 줄 먼저 넣은 뒤 구현한다.
- 증명은 시험 · 명령 이름으로. 시험 이름은 증명 표의 AC 로 시작하고(spec-trace 가 센다), 시험 하나가 AC 둘을 덮으면 이름 앞에 `AC-1a · AC-1b` 처럼 이어 적는다. "충분히 테스트한다"는 증명이 아니다.
- 용어는 영역 · 단계 · 단원 · 활동. 영어 개발 용어는 알맞은 우리말로(직역 금지). 코드 식별자는 영어. 아이 화면 문구는 정본 · 목업 그대로(해요체).
- 설계 숫자는 `settings` 설정값(12절 키)에서 읽는다. 코드 · 시험 상수에 박지 않는다. 설정 키가 12절에 없으면 '컨트롤러가 정할 것'.
- 권한이 필요한 단계는 [사람] 으로 표시하고 묶음 plan H 번호를 단다. 커밋 · PR 은 요청자 지시 때(H14).
- 비밀값 · 아이 이름은 어디에도 적지 않는다. 가짜 값도 꼴 그대로는 저장소에 두지 않는다(실행 때 조립).
- 확인한 사실은 출처 URL · 판 · 확인 날짜를 plan '정할 것' 또는 '위험' 절의 표에 적는다. 확인 못 한 것은 '(추측)'.
- 마지막 메시지는 보고 파일의 요지 10줄 안쪽.
