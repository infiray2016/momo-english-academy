# 브리프: UI · UX plan 묶음 2-나 — 토큰 밖 색 걷기 · 아이콘 획 · 듣는 중 고리(구현자 · Opus · high, 2026-10-30 01:4x 작성, 2-가 검토 Approved 뒤 시작)

plan `intent/2026-10-29-UI-UX-개선/plan.md`(approved C185) 114~115줄 묶음 2-나 표와 정한 것 4(토큰 이름은 그대로, 옛 tape 는 회화 파일(묶음 6)이 옮긴 뒤 지우고 cork · cork-frame 은 사용처를 모두 옮긴 뒤 지움)를 구현한다. 근거는 spec 2판 `intent/2026-10-29-UI-UX-개선/spec.md` 설계 5(5.1 토큰 표 — talk-deep 듣기 남은 시간 고리 · 소리 물결, ink-soft 는 색 종이 위에서 못 쓰고 ink 로; 5.2 아이콘 획 상수) · AC-U5 (1) · NFR-U1(대비 7:1), 묶음 2-가 보고 `task-ux2-ga-report.md`(토큰 이름 · ICON_STROKE 상수 · 새 모듈). 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지.

## 범위(plan 2-나 표 그대로)
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/components/activities/common.tsx` · `activities/{reading,speaking,writing}.tsx` · `answer/{tiles,typing,choice}.tsx` · `session/{reading,writing-composition,writing-guided,writing-rewrite}.tsx` · `(setup)/access/access-code-form.tsx` · `(setup)/first-run/first-run-flow.tsx` | 수정 | 기본 팔레트 색 클래스 28곳 · [#FFFDF7] 셋 · cork/20 → 토큰, strokeWidth → ICON_STROKE. 색 종이 위의 뜻 줄은 ink(NFR-U1). 동작은 바꾸지 않는다 |
| `src/components/answer/speak-button.tsx` | 수정 | 듣는 중 남은 시간 고리 talk-deep, 소리 물결 표지(글자 아님, 3:1 넘김) |
| `src/app/globals.css` | 수정(조건부) | cork · cork-frame 사용처가 0 이 되면 토큰을 지운다(2-가 가 아직 두었을 때). tape 옛 토큰은 회화 파일이 남아 있으면 둔다 |
| `tests/unit/ux-tokens.test.ts` · 바뀐 조각의 단위 시험 | 수정 | 날값 색 · 기본 팔레트 클래스 0(2-다 의 design-color 규칙이 잡을 것을 미리 단언), cork 사용처 0 |

## 지키는 것
아이 화면 문구 · 동작 · 활동 흐름은 바꾸지 않는다(색 · 획 · 고리만). 가르치고 묶음 라-2 가 같은 세션 조각(reading · writing-items · tiles · common)을 뒤에 고치므로 이 묶음은 색 클래스와 획 상수만 바꾸고 구조를 바꾸지 않는다. 회화 파일(talk-frame · teacher-window · tori · closing-cards)은 손대지 않는다(묶음 6). 설계 숫자 코드 금지. 커밋하지 않는다.

## 관문 · 보고
끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드 · design-number 49) · `pnpm spec:trace --fail-on unknown-ac` · `grep -rn "#[0-9A-Fa-f]\{6\}\|bg-cork\|text-cork" src/components src/app --include=*.tsx | grep -v globals.css` 결과(남은 날값 색 목록). 보고 `task-ux2-na-report.md`(40줄 안): 바꾼 자리 수(파일별) · 남은 날값 색과 까닭 · 관문 · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.
