# 브리프: P4 하위 plan 작성(시드 규격 · 검증기 · 어휘 배정)

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
- `intent/2026-10-15-모모-잉글리시-아카데미/plan-p04-시드-규격-검증기.md`(상태 draft). 넘치면 `plan-p04a-규격.md` · `plan-p04b-검증기-배정.md`. 브랜치 제안 `feature/1a-p04-seed-spec`.
- 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p04-plan-report.md`: 쓴 파일 · 확인한 사실(출처 URL · 판) · (추측) · 묶음 plan 과 다르게 한 것 · 컨트롤러가 정할 것 · 요청하는 공용 변경.

## 이 P 에서 더 읽을 것
- 정본 `specs/06-시드-생성.md` 6.3(출력 규격 전부 — 수업 · 문제 · 회화 카드 · 평가 카드 · 단원 규격 · can-do, 순서 (0) 어휘 배정) · 6.4(검사 전부 · 완전성 · 단계 분포 경고 · 신고와 정정의 규격 쪽), `specs/02-1-영역-단원-승급.md` 3.2(배정 · 관계 표), `specs/02-2-세션과-단계표.md` 3.3 단계표(카드 꼴이 따르는 영역 × 단계 규칙 — 쓰기 1~3단계는 고르기 · 베끼기 · 조립, 회화 1~3단계는 영어 문장을 미리 안 보임), `specs/02-3-어휘-복습-동기-점수.md` 3.4 어휘 · 3.6 학습 요소 범위, `specs/04-데이터.md` 5절의 시드 테이블(규격 ↔ 테이블 대응, 개정 · 적재는 P7), `specs/11-요구사항과-수용-기준.md` AC-3a · 3b · 5g · 5h · 7a · 7c · 7d 와 그 FR, `specs/09-설정값.md` 단원 틀 값 · 단어 수 · 분포 키(H5 로 아직 확정 전인 값은 키로 읽고 고정하지 않는다), 13절 C49(잠정 정리) · C50 의 시드 몫.
- 조사 `docs/research/2026-10-16-graph-engineering.md` 의 P6(칸 사이 관계 경고)과 `docs/research/2026-10-16-graph-engineering-ai-coding.md` 의 시드 생성 흐름(검증기가 생성 세션의 선 위 검사가 됨). 묶음 plan 작업 순서 6(P8 시드 생성이 이 검증기를 쓴다) · 시드 묶음 워크플로 절(107~120줄).

## P4 범위(배정표 77줄 그대로)
- 모든 시드의 Zod 규격(`src/core/seed/`, 회화 카드 · 평가 카드 포함, 6.5 호출 출력과 공유하는 규격이 있으면 표시), 6.4 검사 전부 + 완전성(영역 × 단계 × 단원 수) + 단계 분포 경고 + 칸 사이 관계 경고(조사 P6), 어휘 배정 `src/core/vocab/allocate.ts`(3.2 배정 · 관계 표 — 순수 함수), `scripts/seed-validate.ts`(`pnpm seed:validate`, 종료 코드 · 요약 꼴 · `--complete-through <n>`, 증명 절 머리 참조), 시험용 시드 `tests/fixtures/seed/`(6.4 행마다 통과 · 거부 사례).
- 전부 DB 의존 없는 순수 함수(CLAUDE.md Architecture). 완료 판정: 시험용 시드로 6.4 행마다 통과 · 거부 사례가 있다. 증명: `tests/unit/seed-validator-*.test.ts` · `tests/unit/vocab-allocate.test.ts` · `pnpm seed:validate`.
- 범위 밖: 본 생성(P8, 생성 세션), 적재 · 개정(P7), 그림 카탈로그(H7), 단원 틀 값 확정(H5 — 검증기는 설정값으로 읽는다).

## 꼭 확인할 사실(공식 문서 · npm. 출처와 판을 plan 에)
- Zod 최신 안정판(4.x 인지)과 Anthropic SDK structured outputs 의 Zod 지원 판(6.5 호출 규격과 같은 Zod 를 쓸 수 있는지 — P9 몫이지만 규격 공유 여부를 적는다).
- 시드 파일 꼴(6.3 이 정한 JSON · 폴더 배치 · 이름 규칙)과 `tsx` 로 도는 CLI 의 종료 코드 규약(P1b 의 spec-trace · check-bundle 과 같은 꼴: 0 통과 · 1 위반 · 2 입력 오류).
- 완전성 수(영역 4 × 단계 12 × 단원 5, can-do 48)가 정본 어느 절 · 설정 키에서 오는지.

## 지킬 것
- 설계를 바꾸지 않는다. 정본과 다르게 해야 하면 plan '위험' 절에 적고 보고의 '컨트롤러가 정할 것'에 올린다. 컨트롤러가 13절에 한 줄 먼저 넣은 뒤 구현한다.
- 증명은 시험 · 명령 이름으로. 시험 이름은 증명 표의 AC 로 시작하고(spec-trace 가 센다), 시험 하나가 AC 둘을 덮으면 이름 앞에 `AC-1a · AC-1b` 처럼 이어 적는다. "충분히 테스트한다"는 증명이 아니다.
- 용어는 영역 · 단계 · 단원 · 활동. 영어 개발 용어는 알맞은 우리말로(직역 금지). 코드 식별자는 영어. 아이 화면 문구는 정본 · 목업 그대로(해요체).
- 설계 숫자는 `settings` 설정값(12절 키)에서 읽는다. 코드 · 시험 상수에 박지 않는다. 설정 키가 12절에 없으면 '컨트롤러가 정할 것'.
- 권한이 필요한 단계는 [사람] 으로 표시하고 묶음 plan H 번호를 단다. 커밋 · PR 은 요청자 지시 때(H14).
- 비밀값 · 아이 이름은 어디에도 적지 않는다. 가짜 값도 꼴 그대로는 저장소에 두지 않는다(실행 때 조립).
- 확인한 사실은 출처 URL · 판 · 확인 날짜를 plan '정할 것' 또는 '위험' 절의 표에 적는다. 확인 못 한 것은 '(추측)'.
- 마지막 메시지는 보고 파일의 요지 10줄 안쪽.
