# 검토 브리프: P6b 그림 카탈로그 작업 2 — 스크립트 · 규격(code-reviewer rev-p06b · Opus · high, 범위 한정 · 가벼운 루프, 읽기 전용, 2026-10-17 00:5x)

도구 · 설정 성격의 작업이라 가벼운 루프(C52)다. Minor 는 컨트롤러가 직접 고치고, Important 이상만 fix 라운드로 간다. 저장소 · 워크트리의 어떤 파일도 고치지 않는다. 보고 파일 하나만 쓴다(Bash 로 써도 된다). 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴, 네트워크는 쓰지 않는다(fetch 를 돌리지 않는다).

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p06b`(브랜치 feature/1a-p06b-vocab-images, 바탕 P4c 6bd6015, 커밋 없음 — 새 파일은 untracked). 바뀐 것: 수정 `src/core/seed/schema/reference.ts`(그림 파일 꼴 svg) · `src/core/seed/structure.ts`(IMAGE_MAX_BYTES) · `tests/unit/seed-schema.test.ts` · `package.json`(images:fetch · images:check) · `.github/workflows/ci.yml`(seed-validate 작업 끝 단계), 새 `scripts/vocab-images.ts`(373줄) · `tests/unit/vocab-images.test.ts`(237줄).
- 구현 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p06b-report.md`('계획과 다르게 한 것 · 더한 것' 1~6, 실기 출력, 우려 1 — 실기 fetch 두 번).
- 기준(메인 저장소 `/Users/hikaru/workspace/momo-english-academy/`): plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p06b-그림-카탈로그.md`(approved, 머리 '컨트롤러 결정' — H7 1안 · C65; '그림 규칙' · 'images.json 행' · '자체 그림 지침' · '스크립트' 함수 표 · 공용 변경 · 증명 표), 13절 C54 · C60 · C65(`specs/10-결정-기록.md`), 5절 images 행(`specs/04-데이터.md`), 10절 그림 행(`specs/08-테스트와-기술.md`), 구현 브리프 `task-p06b.md`. P4 코드: `scripts/seed-validate.ts`(순수 꼴 · isDirectRun · 종료 코드) · `.dependency-cruiser.cjs`(core-no-io).
- 컨트롤러 재확인(00:5x): biome 0 · build · 단위 164 · check:deps 0 · spec-trace 58 · bundle 0 · 비밀값 0 · `public/` 없음(실기 임시 파일 지워짐).

## 볼 것(범위 한정)
1. 규격 한 줄: 정규식이 `images/vocab/<키>.(png|webp|jpg|svg)` 꼴 그대로이고 키 ≠ 파일 이름 · gif 를 거부하는지, P4 시험 전체가 그대로 통과하는지(164 = 159 + 5).
2. `IMAGE_MAX_BYTES` 가 `structure.ts` 상수 원칙(C54 (2)) 자리에 있고 시험이 상수에서 읽는지.
3. `scripts/vocab-images.ts`: 순수 함수 넷(`parseSource` · `twemojiUrl` · `checkSvg` · `checkCatalogFiles`)이 plan 함수 표 규칙과 1:1 인지(Twemoji 주소 `cdn.jsdelivr.net/gh/jdecked/twemoji@v<판>/assets/svg/<코드>.svg`, checkSvg 금지 목록 + xmlns 예외 + 안쪽 참조 허용, 파일 있음 · 이름 = 키 · 크기 ≤ 상한 · 카탈로그 밖 파일 없음), 파일 · 네트워크 · 출력은 직접 실행 때만, 종료 0 · 1 · 2, `src/core` · `seed-validate.ts` 가 이 파일을 가져오지 않는지, fetch 가 받은 글을 checkSvg · 상한으로 거르는지(더한 것 5).
4. 구현자가 더한 것 1~6 을 하나씩 받을지: `--root` = 저장소 뿌리(seed-validate 와 뜻이 다름 — 혼동 위험을 판정), `main().then` 꼴, check 규칙 둘(출처 · 라이선스 짝, Zod 꼴 틀림 → 2), 바깥 주소 범위 넓힘(xlink:href · 작은따옴표 · `//host`), 하위 폴더 처리.
5. 공용 변경 둘이 plan 글자 그대로인지(ci.yml 단계는 P4c hashFiles 꼴, package.json 두 줄).
6. 시험 넷 + 규격 시험의 이름이 증명 표 글자 그대로인지, 네트워크를 쓰지 않는지, 임시 폴더를 지우는지, 사례가 각 갈래를 실제로 지나는지(바깥 주소 변형 · xmlns 예외 · 하위 폴더).
7. 우려 1(실기 fetch 두 번)은 기록만 — 코드 문제 아님.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p06b.md`. 첫 줄 판정(Approved · Changes requested, C · I · M 수), 지적마다 심각도 · 근거(파일:줄 · plan 절 · 13절), '더한 것' 1~6 판정 표, 증명 표 행마다 '시험 있음 · 없음'. 작업 3~4(그림 고르기 · 자체 그림 · CREDITS)에 넘길 메모가 있으면 끝에. 마지막 메시지는 판정 + C · I · M 수 + 요지 세 줄.
