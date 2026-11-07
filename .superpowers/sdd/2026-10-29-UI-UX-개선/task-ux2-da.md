# 브리프: UI · UX plan 묶음 2-다 — 검사(토큰 밖 색 · 설계 숫자 상한 · 대비 7:1 · 꾸밈 겹침)(구현자 · Opus · high, 2026-10-30 02:0x 작성, 2-나 검토 Approved 뒤 시작)

plan `intent/2026-10-29-UI-UX-개선/plan.md`(approved C185) 116~118줄 묶음 2-다 표 · 정한 것 8(설계 숫자 경고의 기준 값은 2-가 시작 때 잰 49 — 지금 45~47) · AC-23e (1)~(3) · AC-N9(고친 문장)를 구현한다. 근거는 spec 2판 설계 5 · NFR-U1(대비 7:1, 흐린 단추 뺌, 글 바로 아래가 책상이면 위반) · AC-U5, 2-가 검토 M2(대비 시험이 시드 검사 모듈 check-teacher 의 contrastRatio 에 기댐 → 공용 자리로) · 2-가 보고(표지 data-desk · data-decor 둘로 나눔 — 겹침 훑기는 `[data-decor]` 만) · 2-나 보고(남은 날값 색은 홈 쪽 주석 한 줄뿐). 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지. CI 는 11-01 전 push 금지라 ci.yml 은 고치되 push 하지 않는다.

## 범위(plan 2-다 표 그대로)
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `scripts/check-ids.ts` · `tests/unit/check-ids.test.ts` | 수정 | 규칙(제안) design-color: 화면 소스(src/components · src/app 의 tsx)의 날값 색(#RRGGBB · rgb()) · 기본 팔레트 색 클래스(bg-yellow-300 꼴) · cork 토큰 — globals.css 와 명단 색 style(선생님 accent 등 자료에서 오는 값)과 주석은 뺌. design-number 상한 인자(제안 `--design-number-max`, 기준 49) |
| `.github/workflows/ci.yml` · `tests/unit/ci-workflows.test.ts` | 수정 | check-ids fail-on 에 design-color, 설계 숫자 상한 인자. push 는 하지 않는다 |
| `tests/e2e/child-size.ts` · `font-size.spec.ts` | 수정 | 대비 훑기(글자색과 가장 가까운 불투명 바탕 7:1, 흐린 단추 뺌, 글 바로 아래가 책상이면 위반) · 꾸밈 상자(`[data-decor]`) 겹침 훑기(글 · 단추와 겹치지 않음), AC-N9 고친 문장. 정적 작성(실행은 11-01 뒤 CI) |
| 대비 셈 공용 모듈(제안 `src/core/color/contrast.ts`) · `tests/unit/ux-tokens.test.ts` | 신규 · 수정 | 2-가 M2: contrastRatio 를 시드 검사 모듈에서 떼어 공용 순수 함수로 두고 ux-tokens 시험과 check-teacher 가 같이 쓴다(동작 같음) |

## 지키는 것
화면 동작 · 문구를 바꾸지 않는다(검사와 시험만). 규칙 이름 · 인자 이름은 check-ids 의 기존 꼴. 설계 숫자 기준 값은 코드에 박지 않고 인자 · 설정으로. 다른 묶음 파일은 손대지 않는다. 커밋하지 않는다.

## 관문 · 보고
TDD. 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids --fail-on <CI 꼴>,design-color`(위반 0, design-number 기준 이하) · `pnpm spec:trace --fail-on unknown-ac`. 보고 `task-ux2-da-report.md`(40줄 안): 규칙 정의 · 걸린 자리와 처리(남은 날값 색 목록) · 관문 · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.

보탬(02:1x, 2-나 검토 M1): 흐림(opacity)으로 옅게 한 글자 넷(틀린 보기 70% · 낱말 칩 disabled · 읽는 중 단추 50% 등)이 남아 있다. 2-다 대비 훑기는 흐린 단추(disabled · aria-disabled · 5.2 흐린 단추 규칙의 종이 바탕 꼴)를 빼되, 흐린 상태가 아닌 글자(틀린 보기 70%)는 위반으로 잡아 보고에 목록으로 남긴다(꼴 맞춤은 묶음 5 몫 — 이 묶음은 규칙과 목록만). 2-가 검토 M2(contrastRatio 공용 모듈)도 이 묶음이다.
