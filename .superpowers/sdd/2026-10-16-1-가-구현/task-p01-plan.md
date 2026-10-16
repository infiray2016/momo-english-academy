# 브리프: P1 하위 plan 작성(뼈대 · 품질 관문)

역할: 계획자(general-purpose · Opus · xhigh). 코드를 만들지 않고 plan 파일만 쓴다. 설치 · 생성 명령(`pnpm create` · `pnpm add` · `npx`)은 실행하지 않는다. 판 확인용 `npm view <패키지> version` 과 공식 문서 읽기(WebFetch · WebSearch)는 된다.

## 만들 것
- `intent/2026-10-15-모모-잉글리시-아카데미/plan-p01-뼈대.md`(상태 draft). 파일 열 개 · 단계 여덟을 넘으면 `plan-p01a-뼈대.md` · `plan-p01b-품질-관문.md` 둘로 나누고 각 파일 머리에 서로를 가리킨다. 생성기(create-next-app · shadcn init)가 만든 파일은 수에서 뺀다(묶음 plan 위험 12).
- 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p01-plan-report.md`: 쓴 파일 · 확인한 사실(출처 URL · 판) · 확인 못 해 '(추측)' 으로 둔 것 · 묶음 plan 과 다르게 한 것 · 컨트롤러가 정할 것.

## 먼저 읽을 것(순서대로)
1. `.claude/skills/plan-build/SKILL.md` — 템플릿과 지킬 것. 템플릿 절 이름을 그대로 쓴다.
2. `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` — 묶음 plan 전체. 특히 배정표 P1 행(73줄), 작업 순서 1 · 2, 위험 4 · 7 · 11 · 12 · 19, 제약 절, 증명 절 머리 문단(CI 작업 이름 · 시험 이름 규칙).
3. `specs/08-테스트와-기술.md` 9절(테스트) · 10절(기술 구성) 전부, `specs/README.md` 지도.
4. `.claude/CLAUDE.md`(Commands · Conventions), `.claude/agents/implementer.md`(Stop 훅 · maxTurns 를 더할 파일), `intent/README.md`(하위 plan 규약).
5. `.claude/skills/graph-engineering/SKILL.md` '자료 그래프' 절(정본 참조 검사의 정의) · `docs/research/2026-10-16-graph-engineering-ai-coding.md` '우리 프로젝트에 적용' 절(조사 P3 spec 추적 · P4 AC ↔ 시험 · P8 의존 규칙, F2 · F3).
6. `specs/11-요구사항과-수용-기준.md` 의 AC 번호 꼴(15절, spec-trace 가 읽을 것). `specs/09-설정값.md` 는 머리만(설정 키 꼴. check-ids 는 P7 이니 범위 밖).

## P1 범위(묶음 plan P1 행 그대로)
- 스택 설치와 폴더 규약: Node 24 · pnpm, Next.js 16(App Router · React Compiler · Turbopack) · React 19 · TypeScript strict · Tailwind 4 · shadcn/ui · Biome 2(린트 · 포맷 하나) · Vitest(unit · integration 프로젝트 둘) · Playwright(10.9형 태블릿 뷰포트, 가짜 음성 · 가짜 AI 는 자리만) · dependency-cruiser. drizzle 은 설치만(스키마는 P3). 폴더 `src/{app,core,server,lib,components,db}` · `scripts/` · `tests/{unit,integration,e2e,e2e-local,contract,fixtures}` · `seed/` 자리.
- `vercel.json`(함수 지역 icn1, 배포는 아직 안 함), `.env.example`(이름만), `.gitignore` 추가분.
- CI `.github/workflows/ci.yml`: lint · build · unit · depcruise · spec-trace · bundle-secrets. integration · e2e · seed-validate 작업은 자리만 두고 뒤 하위 plan 이 채운다.
- 품질 관문 셋.
  - (F2 = 조사 P3 · P4) `scripts/spec-trace.ts` + `tests/unit/spec-trace.test.ts`: 시험 이름이 `AC-<번호><글자>` 로 시작하면 그 번호가 15절에 있는지, 묶음 plan 증명 표의 1-가 AC 마다 시험이 하나 이상 있는지 센다. 처음엔 보고만(종료 코드 0), 빠진 것 0 이 되면 막는 검사로 바꾸는 스위치를 둔다.
  - (조사 P8) `.dependency-cruiser.cjs`: `src/core` 는 db · next · react · `src/server` 를 못 가져오고 순환 금지, `src/server/ai` 는 `src/server` 안에서만.
  - (AC-N4) `scripts/check-bundle.ts`: 빌드 결과의 클라이언트 번들에 서버 환경 변수 이름 · Anthropic 키 꼴 · `server-only` 모듈이 없는지.
- (F3) `.claude/agents/implementer.md` 에 Stop 훅(biome · vitest 실패면 끝내기 거부) · maxTurns. Claude Code 공식 문서(hooks · subagents 프런트매터)로 할 수 있는 꼴을 확인하고, 에이전트 프런트매터로 안 되면 `.claude/settings.json` 의 SubagentStop 훅 대안을 적는다. 확인 못 한 것은 '(추측)'.
- 범위 밖: proxy.ts · 접근 제어 · DB 스키마(P3), 음성(P2), 시드 규격(P4), check-ids(P7), Vercel 프로젝트 연결(H1, P2 때).

## 꼭 확인할 사실(공식 문서 · npm. 출처 URL 과 판을 plan 에 적는다)
- Next.js 16 최신 안정판 번호와 create-next-app 플래그(TypeScript · Tailwind · App Router · src 폴더 · Biome 선택 여부 · Turbopack 기본), `proxy.ts` 이름, React Compiler 켜는 설정, `next.config.ts` 꼴.
- Biome 2 설정 스키마와 Next · React 권장 규칙 묶음. Tailwind 4 를 Next 에 붙이는 방식(PostCSS 플러그인).
- Vitest 최신 안정판과 projects 설정, Playwright 최신 안정판과 iPad 비슷한 기기 · 뷰포트.
- dependency-cruiser 의 TS 경로 별칭(`@/`) 지원과 규칙 꼴.
- GitHub Actions: pnpm 설치 액션 · setup-node(Node 24) · 캐시.
- Claude Code: 서브에이전트 정의 프런트매터에서 hooks 를 둘 수 있는지, Stop · SubagentStop 훅의 입력과 종료 코드(2 = 막기) 규약.
- Node 24 가 LTS 인지, Vercel 의 Node 24 런타임 지원.

## 사람이 하는 일([사람] 로 표시)
- 이 저장소는 원격이 없다(`git remote -v` 빈 결과, 2026-10-16 09:4x). GitHub 저장소 만들기 · 원격 추가 · 첫 push 는 요청자 몫이고 CI 는 그 뒤에 돈다. 그 전에는 로컬 `pnpm lint · build · test` 와 스크립트 직접 실행으로 완료를 판정한다.
- 운영 승격 막기(위험 11)는 H1 때 정한다. P1 에서는 '배포 안 함'만 적는다.

## 지킬 것
- 설계를 바꾸지 않는다. 정본과 다르게 해야 하면 plan '위험' 절에 적고, 컨트롤러가 13절에 한 줄 먼저 넣는다.
- 증명은 시험 · 명령 이름으로(AC-N4 · 공통 명령). "충분히 테스트한다"는 증명이 아니다.
- 용어는 영역 · 단계 · 단원 · 활동. 영어 개발 용어는 알맞은 우리말로(직역 금지). 코드 식별자는 영어.
- 설정 숫자를 코드에 박지 않는다. 시험 값(뷰포트 등)도 설정 파일 상수로.
- 브랜치 이름은 ASCII(`feature/1a-p01-skeleton` 꼴 제안). 커밋 · PR 은 요청자 지시 때(H14)라고 plan 에 적는다.
- 비밀값 · 아이 이름은 어디에도 적지 않는다.
- 마지막 메시지는 보고 파일의 요지 10줄 안쪽.
