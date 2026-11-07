# 검토 브리프: P1b 품질 관문(code-reviewer · Opus · xhigh, 읽기 전용)

대상: 브랜치 `feature/1a-p01b-quality-gates` 의 작업 트리(P1a 커밋 b0b6a46 위, 커밋 전). `git status` 의 새 파일 전부와 수정 셋(`.claude/agents/implementer.md` · `.github/workflows/ci.yml` · `package.json`). 코드를 고치지 않는다. 읽기 전용 명령(`git status` · `git diff` · `pnpm lint` · `pnpm test` · `pnpm build` · `pnpm check:deps` · `pnpm spec:trace` · `pnpm check:bundle` · 관문 직접 실행 · `pnpm ls`)은 돼도 파일을 바꾸는 명령은 안 된다. 탐침이 필요하면 저장소 밖 스크래치 폴더에서만. 셸 명령은 `source ~/.nvm/nvm.sh && nvm use >/dev/null && ` 로 시작한다(`.nvmrc` = 24. 이 컴퓨터의 기본 Node 26 은 x64 판이라 arm64 바이너리를 못 돈다).

## 읽을 것(순서)
1. plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p01b-품질-관문.md` — '파일별 값' 1~9, '작업 순서', '위험', '증명', '정할 것' 끝의 결정(컨트롤러 10:3x).
2. 구현 브리프 `.superpowers/sdd/2026-10-16-1-가-구현/task-p01b.md`, 구현 보고 `task-p01b-report.md`('계획과 다르게 한 것' 1~5 · '우려' 1~4).
3. 작업 트리의 파일들. 정본은 필요한 곳만: `specs/08-테스트와-기술.md` 9절, `specs/11-요구사항과-수용-기준.md` 15절(AC-N4), `.claude/CLAUDE.md`.
4. 조사 `docs/research/2026-10-16-graph-engineering-ai-coding.md` 의 F2 · F3 문단(관문 설계 뜻).

## 볼 것
1. plan 준수. 파일별 값 1~9 마다 실제와 맞대 ✓ · ✗ · 다름(타당 · 부당). 허용 파일 밖 변경 없음. `package.json` 은 스크립트 셋만(의존 변화 0, `pnpm-lock.yaml` 변화 0). `implementer.md` 프런트매터(`maxTurns` · `hooks.Stop[0].hooks[0]` 의 type · command · timeout)가 plan 값 6 철자 그대로인지, 본문 세 줄(가 · 나 · 다)과 '· 컴포넌트' 삭제(결정 사). `ci.yml` 의 작업 셋(depcruise · spec-trace --fail-on unknown-ac,plan-ac-not-in-spec · bundle-secrets 가 build 뒤 check:bundle) 과 준비 네 줄.
2. 다르게 한 것 1~5 의 타당성. 특히 1: dependency-cruiser 의 safe-regex 거부로 바꾼 갈래 꼴 정규식이 plan 꼴과 같은 집합을 받는지(`node_modules/<이름>/` 와 `node_modules/.pnpm/<x>/node_modules/<이름>/` 둘 다, 다른 패키지는 안 받음). 2: 임시 프로젝트 시험이 '못 찾아서 통과'를 막는지. 3: spec-trace 의 넓은 뽑기 `AC-[A-Za-z0-9]+` 가 `AC-N4` · `AC-10a` · `AC-2b` 를 다 잡고 글 속 'AC-' 단어를 오탐하지 않는지, 표 머리를 못 찾으면 2 로 멈추는지, 경로 NFC. 4: check-bundle 출력에 값 원문 · 키 앞 글자가 없는지, 규칙 다섯, 대상 0 → 2. 5: 관문의 종료 코드가 0 · 2 둘뿐인지(그 밖은 조용히 통과되므로), JSON 깨짐 → 2, NEEDS_CONTEXT · BLOCKED 첫 줄(빈 줄 건너뜀) → 0, `node_modules/.bin` 없음 → 2, 로그 한 줄, `NO_COLOR`, 하위 명령 시간 상한.
3. 시험의 질. 관문 시험이 진짜 vitest 를 다시 돌리지 않는지(가짜 `run`), 임시 폴더 `tests/.tmp` 정리, 시험 이름이 plan 증명 표 이름과 같은지(spec-trace 가 그 이름을 센다 — AC-N4 여섯), 가짜 키 · 접속 문자열이 실행 때 조립되는지(저장소에 원문 꼴 0건). 느리거나 흔들릴 요소(네트워크 · 시간).
4. 컨트롤러 결정(구현자 우려 1~4 에 대한 것)의 적용 방법을 검증해 지적 표에 행으로 적는다(적용은 fix 라운드에서 구현자가 한다).
   - A(우려 1 · 2) 관문 스크립트를 `.claude/hooks/implementer-stop-gate.mts` 로 바꾼다(명시 ESM 이라 MODULE_TYPELESS_PACKAGE_JSON 경고가 사라짐. `.mts` 가 Node 24 · 26 의 타입 지우기 대상인지 확인). 프런트매터 command 의 경로도 `.mts`. 그리고 관문이 하위 명령(biome · vitest)을 돌릴 때 PATH 의 node 에 기대지 않게, `<cwd>/.nvmrc` 의 판을 읽어 `$HOME/.nvm/versions/node/v<판>*/bin` 가운데 현재 컴퓨터 아키텍처(`process.arch`)와 맞는 것을 찾아 하위 명령의 PATH 앞에 붙인다(없으면 지금 PATH 그대로). `node_modules/.bin/biome` · `vitest` 가 PATH 의 `node` 를 부르는 셸 shim 인지 확인하고, 이 길이 x64 Node 26 셸에서 띄운 Claude Code 에서도 관문을 통과시키는지 판단한다. 다른 더 단순한 길이 있으면 근거와 함께 제안한다.
   - B(우려 3) `COMMAND_TIMEOUT_MS` 를 120초로 낮춘다(둘 합쳐 240 < 훅 300). 훅 timeout 300 은 그대로.
   - C(우려 4) spec-trace 가 시험 이름의 모든 `AC-…` 토큰을 센다(첫 번째만이 아니라). 한 시험이 둘을 덮으면 둘 다 덮인 것으로. 이름 규칙 'AC-… 로 시작'은 그대로.
   - 그 밖에 보고 '남긴 것' · '우려'에서 더 볼 것이 있으면 지적으로.

## 보고
`.superpowers/sdd/2026-10-16-1-가-구현/review-p01b.md` 에 쓴다(Bash 로 그 파일 하나만. 다른 파일은 만들거나 고치지 않는다).
- 머리: 판정(Approved · Changes requested), 확인한 명령과 결과(관문 직접 실행은 Node 24 · 26 둘 다).
- 지적 표 `| 번호 | 심각도 | 파일:줄 | 내용 | 근거(plan 값 번호 · 정본 절 · 문서 URL 또는 node_modules 안 문서 경로 · 실행 결과) | 고칠 방향 |`. 근거 없는 지적은 넣지 않는다. 컨트롤러 결정 A · B · C 의 적용 방법도 행으로.
- 설계 준수 표(파일별 값 1~9), 다르게 한 것 1~5 판정 표.
- 마지막 메시지: 판정 · 심각도별 수 · 가장 중요한 지적 셋, 10줄 안쪽.
