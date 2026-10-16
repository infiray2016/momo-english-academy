# 브리프: P5b 활동 표시 컴포넌트와 로컬 전용 시드 보기 화면(implementer impl-p05b, 2026-10-17 00:4x)

역할: implementer(Opus · high). plan-p05b 가 정한 파일 열과 공용 변경 1~6 만 만들고 고친다. 시험을 먼저 쓰고 실패를 본 뒤 구현한다. 검토는 하지 않는다(code-reviewer · design-reviewer 가 따로). 하위 에이전트 · 커밋 없음. 실제 API 호출 없음. 비밀값 · 아이 이름 없음(견본 글만).

## 자리
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p05b`(브랜치 feature/1a-p05b-seed-viewer, 바탕 e08eaba = P3a · P4c · P2b · P3b 를 모두 합친 줄기, 의존 설치됨, Playwright webkit 설치됨). 모든 파일은 여기에.
- 정본 · plan 은 메인 저장소 `/Users/hikaru/workspace/momo-english-academy/` 에서 읽는다(워크트리 specs/ · intent/ 는 낡았다): plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p05b-시드-보기.md`(approved, 머리 '컨트롤러 결정' 포함)와 `plan-p05a-풀이-검사.md` 의 정할 것 가 · 아 · 자 · 타 · 파 · 확인한 사실 5~7 · 11~17, 13절 C57 · C62(`specs/10-결정-기록.md`), 4절(`specs/03-화면.md` 첫 문단 · 포스트잇 보드 · 단원 미리보기 행), 11절 (2-1)(`specs/08-테스트와-기술.md`), 3.3 단계표(`specs/02-2-세션과-단계표.md`), 6.3 출력 규격(`specs/06-시드-생성.md`), 15절 AC-7f · NFR-5(`specs/11-요구사항과-수용-기준.md`). 목업 `docs/media/mockups/`(B_Reading · B_W1_Words · B_W3_Order · B_Writing · B_Speaking · B_LevelTest — 11절 '고칠 목업' 표의 빼는 것은 빼고 본다).
- 명령은 워크트리에서 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. Next 코드는 설치판 문서 `node_modules/next/dist/docs/` 를 먼저 본다. 한글 경로는 명령 인자로 넘기지 않고 보고는 Write 도구로. 도구 층이 `\uXXXX` 를 글자로 바꾸므로 이스케이프는 바이트로 확인한다. 같은 폴더에서 `pnpm dev` 가 돌고 있으면 e2e-local 개발 서버가 뜨지 않는다(plan 위험 3).

## 바탕에서 알아 둘 것(컨트롤러 합침 e08eaba)
- `next.config.ts` 는 P2b 의 pageExtensions(`preview.tsx` 를 운영 배포에서 뺌)와 P3b 의 `experimental.authInterrupts` 를 둘 다 담은 객체 꼴이다. 공용 변경 1 의 함수 꼴로 바꿀 때 둘을 그대로 담는다(plan 코드 그대로).
- `tests/e2e/fixtures.ts`(P2b)의 `test` 는 `context` 픽스처에서 `addAccessCookie`(P3b `tests/e2e/access-cookie.ts`)를 먼저 넣는다 — 모든 e2e 가 접근 쿠키를 갖고 시작한다. e2e-local 시험도 이 `test` 를 가져오거나 `addAccessCookie` 를 직접 쓴다. `playwright.config.ts` 는 P3b 판(시험용 접근 코드 · 해시를 실행 때 만듦) — 공용 변경 3 의 `playwright.local.config.ts` 가 그것을 가져와 같은 열쇠를 쓴다.
- P4a 견본 `tests/fixtures/seed/builders.ts` 의 `sampleSeedTree` · `smallReferenceSet` · `miniSeed` · `writeSeedTree`, P4c `src/core/seed/validate.ts` 의 `collectCells` · `cellHash` · `solveStatus` · `itemsOf`, `structure.ts` 의 `parseSeedPath` · `SEED_FILES` · `checksFilePath` · `reviewFilePath` · `TEXT_ROLES`. `bandOf` · `Band` 는 P4a `structure.ts` 와 P2a `src/core/level-band.ts` 둘 다에 있다(중복은 뒤에 하나로 — 이 plan 은 어느 쪽을 써도 된다, 보고에 적는다).
- 바탕 시험 수: 단위 238 · 통합 34 · e2e 17.

## 만들 것(plan 작업 순서 1~6)
1. 공용 변경 1~6 을 글자 그대로 옮기고(`next.config.ts` 함수 꼴 · `package.json` `e2e:local` · 새 `playwright.local.config.ts` · `.env.example` `SEED_VIEWER_ROOT` · `.dependency-cruiser.cjs` 규칙 `seed-viewer-only-from-viewer` + `tests/unit/dependency-rules.test.ts` 막는 예 · 허용 예 · `.github/workflows/ci.yml` e2e-local 작업), 빈 `page.local.tsx` 로 길을 확인한다. 완료: `pnpm build` 통과 · 경로 목록에 `/dev/seed-viewer` 없음, `pnpm dev` 에서 그 주소가 쿠키 없이 접근 코드 화면(401). 두 출력을 보고에.
2. 시험 먼저: `tests/e2e-local/seed-viewer.spec.ts` · `tests/e2e/seed-viewer-absent.spec.ts`(plan 증명 표 이름 글자 그대로 — AC-7f 둘, 보기 화면 셋, 4절 크기 하나(AC 이름 없이)). 실패 출력.
3. `src/server/seed-viewer/files.ts`(server-only, `assertSeedViewerLocal` · `seedViewerRoot` · `resolveSeedFile` · `listContentFiles` · `loadContentFile`, node:fs 는 여기만, 시각 안 읽음, validateSeed 안 돌림). 완료: `pnpm check:deps` 0, 한 시계 훑기 시험 통과.
4. 활동 표시 컴포넌트 `src/components/activities/{common,reading,writing,speaking}.tsx`(plan 표의 내보내기 · 지킬 것: 내용 부분만, 4절 크기 상수 한곳, 훅 · 'use client' · server-only 없음, `reveal`, 그림은 `next/image` unoptimized 정사각 — src 가 .svg 면 Next 가 그대로 `<img>` 로 냄, 덧붙임에 그림 키 · 라이선스 · 저작자 표시). 완료: `pnpm build`.
5. 보기 화면 `src/app/dev/seed-viewer/page.local.tsx` · `cell-view.tsx` · `talk-card.tsx`(목록 · 파일 · 칸, 아이 화면 틀 `role="region"` `aria-label="아이 화면 n"` 너비 820, 덧붙임 `aria-label="덧붙임 n"`, 회화 카드 · 평가 장은 어른용 표, 규격 깨진 칸은 날 JSON, 머리에 `pnpm seed:validate` 안내 한 줄). 완료: `pnpm e2e:local` 통과.
6. 마무리: `pnpm e2e`(운영 빌드 404 포함) 통과, 화면 사진 다섯(`E2E_SEED_VIEWER_SCREENSHOTS=.superpowers/sdd/2026-10-16-1-가-구현`, 파일 `p05b-<갈래>.png` — 읽기 · 쓰기 · 말하기 · 단계 평가 · 토리 이야기), CI 순서 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int` → `pnpm e2e` → `pnpm e2e:local` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle`, 비밀값 grep 0. 완료: missing-test 가 바탕보다 1 적다(AC-7f).
하지 않는 것: P5c(쓰기 · 서버 액션 · review-panel), P5a 파일, 정본 · plan 수정, 다른 공용 파일, 아이 화면 틀 안의 새 문구.

## 지킬 것
- 아이 화면 틀 안에는 시드 글과 정본 · 목업 글만(해요체 · 한 화면 한 행동 · 퍼센트 없음). 어른용 글은 해요체 · 작은 글자 가능.
- 크기(4절): 안내 · 한국어 뜻 20px(`text-xl`) · 영어 24px(`text-2xl`) · 보기 · 버튼 꼴 22px 이상 · 누르는 곳 56px(`min-h-14 min-w-14`) — 클래스 이름은 `common.tsx` 의 이름 붙인 상수 한곳. 색은 `AREA_TONE`(노랑 읽기 · 하늘 쓰기 · 분홍 말하기 · 연두 회화).
- 시험 글 · 숫자는 견본 객체에서 읽는다. 시험 이름은 증명 표 글자 그대로(spec-trace 가 AC-7f 를 센다). 4절 크기 시험 이름에 AC 를 붙이지 않는다(위험 9).
- `src/server/seed-viewer` 는 `src/app/dev/seed-viewer` 와 자기 폴더에서만 가져온다. 시각을 읽지 않는다. 접근 확인은 proxy 가 한다(이 plan 에 서버 액션 · Route Handler 없음).
- 코드 식별자 영어, 주석 · 어른용 문구 · 보고 한국어(용어: 영역 · 단계 · 단원 · 활동 · 칸).

## 보고
`.superpowers/sdd/2026-10-16-1-가-구현/task-p05b-report.md`(워크트리, Write 도구): 상태 · 바뀐 파일(계획과 다른 것 표시) · 시험 수(단위 238 · 통합 34 · e2e 17 → 새 수, e2e-local 수) · 작업 1 의 두 출력 · 작업 6 명령과 출력 첫 줄 · 사진 다섯 경로 · 계획과 다르게 한 것 · 남긴 것 · 검토자에게 알릴 것. 마지막 메시지는 상태(DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED) + 요약 한 줄.
