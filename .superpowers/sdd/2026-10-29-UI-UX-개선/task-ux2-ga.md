# 브리프: UI · UX plan 묶음 2-가 — 디자인 ② 토큰 · 책상 바탕 · 꾸밈 층 · 공용 조각(구현자 · Opus · high, 2026-10-30 01:1x 작성, 시드 규격 fix 3(structure.ts 손 뗌) 뒤 시작)

plan `intent/2026-10-29-UI-UX-개선/plan.md`(approved C185) 묶음 2-가 표(108~113줄)와 정한 것 4(토큰은 이름을 바꾸지 않고 값만 먼저 바꾸고 새 이름은 더하기만, 옛 tape 는 회화 파일(묶음 6)이 옮긴 뒤 지우고 cork · cork-frame 은 2-가 · 2-나 에서 사용처를 모두 옮긴 뒤 지움) · 8(설계 숫자 경고 기준 49)을 구현한다. 근거는 spec 2판 `intent/2026-10-29-UI-UX-개선/spec.md` 설계 5 '디자인 ② 밝은 책상'(5.1 색 토큰 표 · 5.2 모양 · 꾸밈 층 · 공용 조각 문단) · AC-U5 (1) · NFR-U1(대비 7:1, 색 종이 위 뜻 줄은 ink) · C168(디자인 ②) · 정본 4절(C180 반영 — 밝은 책상 문단). 시안 ② 파일은 `.superpowers/sdd/2026-10-29-UI-UX-개선/` 의 디자인 시안 HTML(design-b 류, 낙서 선 그림의 출처)이다. 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(커밋 전 변경 위). 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지. 통합 · e2e 는 못 돌린다.

## 범위(plan 2-가 표 그대로)
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/app/globals.css` | 수정 | 5.1 값: postit 넷 · ink · ink-soft · paper · kraft 값 바꿈, desk · talk-deep · tape-1~5 · grid · margin-line · doodle 더함(cork · cork-frame 은 사용처가 남아 있으면 아직 지우지 않고 2-나 뒤 지움 — 사용처가 이 묶음에서 다 옮겨지면 지움). 5.2 모양: 모서리 셋(카드 · 판 · 단추) · 그림자 값(shadow-postit → 카드, shadow-band → 판, shadow-button 더함) · 종이 테 2.6px |
| `src/components/board/board.tsx` | 수정 | ChildScreen 의 16px 화면 테 없앰 · 책상 바탕 + 꾸밈 층, PaperBand · PostIt · ConfirmSheet 의 종이 테 · 손으로 자른 모서리 · 테이프(열쇠로 고름), 단추 둘 모양, 흐린 단추(opacity-40 대신 종이 바탕 · 먹색 42% 글 · 36% 테 · 그림자 없음), 아이콘 획 상수(제안 `ICON_STROKE` 2.75) |
| `src/components/board/decor.tsx`(제안) · `src/components/board/paper-key.ts`(제안) | 신규 | 바탕 무늬(모눈 28px · 여백 선 왼쪽 58px · 종이 결 한 겹)와 연필 낙서(시안 ② 파일의 선 그림, 가장자리 띠에만, 움직임 없음, data-decor). 순수 함수: 카드 열쇠 → 테이프 길이(104 × 30 ±12%) · 각도(−3° ±3%) · 기울기 · 테이프 색(같은 열쇠면 같은 꼴) |
| `src/app/(child)/layout.tsx` · `src/app/dev/teacher-probe/teacher-probe.tsx` | 수정 | bg-cork → bg-desk |
| `src/core/seed/structure.ts` | 수정 | TEACHER_LABEL_TEXT 를 새 paper 값으로, 주석(이름표는 흰 종이 · 먹색 글자, 명단 accent 대비 검사는 spec 대로 그대로). 시드 규격 작업(fix 3)이 끝난 뒤에만 |
| `tests/unit/ux-tokens.test.ts`(제안) | 신규 | 토큰 값 = 5.1 · 5.2 표, ink 와 종이 · 색 종이 · 책상의 대비 7:1(계산 함수로), cork 사용처 0(또는 남은 수 적기), 같은 열쇠면 같은 꼴 |

토큰 값 바꿈이 깨는 시험(plan 위험 3): seed-teacher.test 'AC-19a'(globals.css paper = TEACHER_LABEL_TEXT), teacher-window.spec 이름표 색, teacher-window.test 의 accent 바탕 이름표 — 같은 묶음에서 시험을 같이 고친다. 명단 accent ↔ paper 대비 검사는 spec 대로 둔다(토큰 한 줄로 되돌릴 수 있게). 설계 숫자(모눈 28 · 여백 58 · 테 2.6 · 테이프 104 × 30 · 각도 범위)는 토큰 · 파일 머리 상수(C72 꼴)로 두고 check:ids design-number 기준 49 를 넘기지 않는다(토큰은 설정값이 아니다, 12절 머리 문단). 아이 화면 문구는 바뀌지 않는다. 회화 파일(talk-frame · teacher-window · tori)과 활동 조각(2-나 몫)은 손대지 않는다.

## 하지 않는 것
2-나(토큰 밖 색 걷기 · 아이콘 획 · 듣는 중 고리) · 2-다(검사) · 3 이상, 회화 화면, 시드 · specs. 커밋하지 않는다.

## 절차 · 관문
TDD(토큰 시험 · 열쇠 순수 함수부터). 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드 · design-number 49) · `pnpm spec:trace --fail-on unknown-ac`. 다른 손 때문에 실패하면 고치지 말고 적는다. 로컬 눈 점검 사진(next dev · 개발용 DB · Playwright MCP, 세로 820 · 가로 1180)은 컨트롤러가 찍는다 — 보고에 '찍을 화면 셋(홈 · 세션 · 결과)'의 주소와 조건을 적는다.

## 보고(`task-ux2-ga-report.md`, 같은 폴더, 50줄 안)
바뀐 파일 · 토큰 값 표(지금 → ②) · 깨진 시험과 고친 것 · 새 순수 함수 · 관문 · 눈 점검 안내 · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.

보탬(01:3x, 0-마 보고 · 0-나 M1 사실 확인): 루트 오류 경계(app/error.tsx)와 없는 주소 판이 app-trouble → mic-blocked → mic-state → lib/speech/browser 를 들여 약 209KB 음성 묶음을 싣는다. 이 묶음에서 단추 차례(stuckButtonsOf 등)와 막힘 문구를 의존 없는 작은 모듈(제안 `src/components/session/stuck-buttons.ts`)로 옮겨 app-trouble 이 음성 층을 들이지 않게 하고, `pnpm build && pnpm check:bundle` 로 루트 오류 경계 · 없는 주소의 첫 JS 를 보고에 적는다(동작은 바꾸지 않음, mic-blocked 의 시험은 그대로 통과).
