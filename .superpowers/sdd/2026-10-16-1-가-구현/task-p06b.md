# 브리프: P6b 그림 카탈로그 작업 2 — 스크립트 · 규격(implementer impl-p06b, 2026-10-17 00:5x)

역할: implementer(Opus · high). plan-p06b 작업 2 만 한다(가벼운 루프 C52 — code-reviewer high 범위 한정, Minor 는 컨트롤러가 직접). 시험을 먼저 쓰고 실패를 본 뒤 구현한다. 하위 에이전트 · 커밋 없음. 네트워크는 `images:fetch` 명령에서만 쓰고 시험 · check 는 쓰지 않는다. 비밀값 · 아이 이름 없음.

## 자리
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p06b`(브랜치 feature/1a-p06b-vocab-images, 바탕 P4c 6bd6015, 의존 설치됨). 모든 파일은 여기에.
- 정본 · plan 은 메인 저장소 `/Users/hikaru/workspace/momo-english-academy/` 에서 읽는다: plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p06b-그림-카탈로그.md`(approved, 머리 '컨트롤러 결정' — H7 답 1안 · C65), `plan-p06a-규격-파일.md` 확인한 사실 7~11, 13절 C54 · C60 · C65(`specs/10-결정-기록.md`), 5절 images 행(`specs/04-데이터.md`), 10절 그림 행(`specs/08-테스트와-기술.md`).
- 명령은 워크트리에서 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. 한글 경로는 명령 인자로 넘기지 않고 보고는 Write 도구로. 도구 층이 `\uXXXX` 를 글자로 바꾸므로 이스케이프는 바이트로 확인한다.

## 먼저 읽을 것
1. 메인 `.claude/CLAUDE.md`. 2. plan-p06b 전부(목표 · 바뀌는 파일 · 그림 규칙 · images.json 행 · 자체 그림 지침 · 스크립트 함수 표 · CREDITS 규칙 · 작업 순서 2 · 위험 · 공용 변경 · 증명). 3. 워크트리의 P4 코드: `src/core/seed/schema/reference.ts`(ImageEntrySchema · 그림 파일 꼴 정규식) · `structure.ts`(상수 원칙 C54 (2)) · `tests/unit/seed-schema.test.ts` · `scripts/seed-validate.ts`(순수 꼴 · isDirectRun · 종료 코드) · `scripts/spec-trace.ts` · `scripts/check-bundle.ts`(스크립트 꼴 참고) · `tests/fixtures/seed/builders.ts`(images 견본).

## 만들 것(plan 작업 순서 2)
1. `src/core/seed/schema/reference.ts`: 그림 파일 꼴 정규식에 `svg` 를 더한다(`images/vocab/<키>.(png|webp|jpg|svg)`). `src/core/seed/structure.ts`: `IMAGE_MAX_BYTES = 100000`(5절 '한 장 100KB 이하', 1000 배수). `tests/unit/seed-schema.test.ts`: svg 그림 행이 통과하는 사례 하나(시험 이름 "6.3 시드 규격: 그림 파일 꼴 svg 를 받는다").
2. `scripts/vocab-images.ts`(fetch · check): 순수 함수 `parseSource` · `twemojiUrl` · `checkSvg` · `checkCatalogFiles` 를 내보내고 파일 · 네트워크 · 출력은 직접 실행될 때만(`isDirectRun` 꼴, `process.exitCode = main()`). fetch 는 Twemoji 행마다 `https://cdn.jsdelivr.net/gh/jdecked/twemoji@v<판>/assets/svg/<코드>.svg` 를 받아 `public/images/vocab/<키>.svg` 에 쓴다(같은 내용이면 건너뜀). check 는 `checkSvg`(script · foreignObject · image · 바깥 주소 href="http · url(http · on<이름>= · @import 금지, xmlns 는 예외) + `checkCatalogFiles`(행마다 파일 있음 · 이름 = 키 · 크기 ≤ IMAGE_MAX_BYTES · 카탈로그 밖 파일 없음). 종료 0 통과 · 1 위반 · 2 입력 오류. `src/core` 와 `scripts/seed-validate.ts` 가 이 파일을 가져오지 않는다.
3. `tests/unit/vocab-images.test.ts`: plan 증명 표의 시험 이름 넷 글자 그대로("그림 카탈로그: Twemoji 출처 글에서 고정 판 주소를 만든다" · "그림 카탈로그: 출처 글 꼴이 틀리면 거부한다" · "그림 카탈로그: 파일이 없거나 상한을 넘거나 카탈로그 밖 파일이 있으면 잡는다" · "그림 카탈로그: script · foreignObject · 바깥 주소 · 이벤트 속성이 든 SVG 를 잡는다"). 상한 값은 `IMAGE_MAX_BYTES` 에서 읽는다. 임시 폴더는 `tests/.tmp/`.
4. 공용 변경 둘(이 워크트리에 옮김): `package.json` scripts `"images:fetch": "tsx scripts/vocab-images.ts fetch"` · `"images:check": "tsx scripts/vocab-images.ts check"`, `.github/workflows/ci.yml` seed-validate 작업 끝에 `- if: ${{ hashFiles('seed/images.json') != '' }}\n  run: pnpm images:check`(P4c 의 hashFiles 꼴 그대로).
5. 실기(네트워크 한 번): 임시 카탈로그(`tests/.tmp/p06b/`)에 Twemoji 행 하나(1f34e)를 두고 `pnpm images:fetch --root <임시>` 가 파일을 받고 `pnpm images:check --root <임시>` 가 0, 파일을 지우면 1, 행 없는 파일을 더하면 1 인지 본다(--root 인자 꼴은 seed-validate 와 같게). 임시 파일은 지운다. CI 에서는 fetch 를 부르지 않는다.
6. 마무리: `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test`(P4 시험 전체 포함) → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec`(missing-test 58 그대로) → `pnpm check:bundle`, 비밀값 grep 0.
하지 않는 것: 그림 고르기 · 자체 그림 · CREDITS.md 본문 · images.json 채우기(작업 3~4, P6a 묶음 1 뒤), 정본 · plan 수정, 다른 공용 파일.

## 지킬 것
- 시험 숫자는 상수 · 견본에서 읽는다. 스크립트는 `src/core` 에 두지 않는다(core-no-io). 식별자 영어 · 주석 · 출력 한국어.
- `checkSvg` 의 금지 목록은 plan 그대로이고 `xmlns="http://www.w3.org/2000/svg"` 는 바깥 주소로 세지 않는다.

## 보고
`.superpowers/sdd/2026-10-16-1-가-구현/task-p06b-report.md`(워크트리, Write): 상태 · 바뀐 파일 · 시험 수(159 → 새 수) · 실기 출력 첫 줄 · 마무리 명령 출력 · 계획과 다르게 한 것 · 남긴 것. 마지막 메시지는 상태 + 요약 한 줄.
