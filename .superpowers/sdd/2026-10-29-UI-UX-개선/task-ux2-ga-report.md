# 묶음 2-가 구현 보고(디자인 ② 토큰 · 책상 바탕 · 꾸밈 층 · 공용 조각, 2026-10-30 01:5x, 구현자 Opus · high)
상태: DONE_WITH_CONCERNS. 워크트리 p13d, 커밋 안 함. 통합 · e2e 는 돌리지 않았다(정적 수정만).
## 바뀐 파일
- `src/app/globals.css:7-110` 토큰 묶음을 `@theme static`(style 의 var() 로만 읽는 테이프 색도 늘 내보냄)으로 바꿈. `:root` 에 종이 테 · 바탕 무늬 값, `@utility desk-surface` · `paper-tape` 더함. cork-frame 지움.
- `src/components/board/board.tsx` ICON_STROKE 2.75(42), TILT_DEG(45), PaperTape(63), ChildScreen 화면 테 없앰 · 책상 · DeskDecor(103), PaperBand 종이 테 · 판 모서리 · 왼쪽 위 테이프, PostIt 종이 테 · 카드 모서리 · 열쇠 테이프(`paperKey` 속성 새로), 단추 모서리 · 그림자 · 흐린 단추(315), ConfirmSheet 종이 테 · 테이프 · 1.4°(471).
- 신규 `src/components/board/paper-key.ts`(paperLookOf) · `src/components/board/decor.tsx`(DeskDecor, 낙서 넷 data-decor).
- `src/app/(child)/layout.tsx:13` · `src/app/dev/teacher-probe/teacher-probe.tsx:190` bg-cork → bg-desk.
- `src/core/seed/structure.ts:379-384` TEACHER_LABEL_TEXT `#fffdf7` → `#fffffb`, 주석.
- 보탬: 신규 `src/components/session/stuck-buttons.ts`(MIC_BLOCKED_TEXT · stuckButtonsOf · 형 셋, import 0). `mic-blocked.tsx` 는 그 값을 가져와 그대로 내보냄. `app-trouble.tsx` 는 stuck-buttons 에서 가져옴(동작 같음).
- 시험: 신규 `tests/unit/ux-tokens.test.ts` · `tests/unit/stuck-buttons.test.ts`, `tests/e2e/teacher-window.spec.ts:347` 이름표 글자색 rgb(255, 255, 251).

## 토큰 값(지금 → ②)
| 토큰 | 값 |
|---|---|
| postit 읽기 · 쓰기 · 말하기 · 회화 | #FFE566 · #9FD8FF · #FFB3C7 · #C9F2B2 → #FFDF37 · #88CFFF · #FF9EB9 · #ADF480 |
| ink · ink-soft · paper · kraft | #2B2B2B · #6B5B45 · #FFFDF7 · #C8B48E → #262626 · #5A4C3C · #FFFFFB · #F0E2C4 |
| 새: desk · talk-deep · tape-1~5 · grid · margin-line · doodle | #FBF5E9 · #3F9A2A · 5.1 표 다섯 · rgb(140 165 200/.17) · rgb(240 130 130/.55) · #7C8592 |
| 새: ink-off · ink-off-edge(흐린 단추) · 모서리 card · board · button | 먹색 42% · 36% 를 종이와 섞음 · 5.2 표 네 모서리 값 |
| shadow-postit · shadow-band · shadow-button(새) | 4 6 0 검정 16% · 0 4 0 18% → 6 7 0 먹색 12% · 6 7 0 먹색 10% · 4 5 0 먹색 22% |
| --paper-edge · 모눈 · 여백 선 | 2.6px · 28px(선 1.2px) · 왼쪽 58px(2px) |
| cork · tape(옛) | 남김: cork 는 첫 실행 `bg-cork/20` 한 곳(2-나 몫), 옛 tape 는 회화 파일(묶음 6) |

## 깨진 시험과 고친 것 · 새 순수 함수
seed-teacher 'AC-19a'(paper = TEACHER_LABEL_TEXT)는 structure.ts 를 같이 바꿔 통과한다. teacher-window.spec 이름표 색은 정적으로 고쳤다. teacher-window.test 의 accent 바탕 이름표는 그림이 4-가 몫이라 깨지지 않는다. 명단 accent 대비 검사는 그대로 두었다. paperLookOf(열쇠) → 테이프 길이(104 × 1±0.12 다섯 값) · 두께 30 · 각도(−3 ± 3, 다섯 값) · 기울기(−1.4 · 1 · −0.6 · 1.2) · 테이프 색(tape-1~5). 값마다 FNV-1a 와 다른 표를 써서 서로 묶이지 않는다. stuckButtonsOf 는 옮기기만 했다. 시험 이름: ux-tokens 7개는 'AC-23e (1) …'이고 stuck-buttons 2개는 'AC-23g …'다.

## 관문(2026-10-30 01:4x~01:5x)
| 관문 | 결과 |
|---|---|
| pnpm lint | 483 파일 통과 |
| tsc --noEmit | 오류 0 |
| pnpm test | 109 파일 · 1221 통과 · todo 6 |
| check:deps | 위반 0(246 모듈) |
| check:ids | 규칙 오류 0, design-number 47(기준 49). 이 묶음 파일에서 늘어난 경고 0(board.tsx:549 AvatarCircle 120 은 원래 있던 것) |
| spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0(missing-test 16 은 다른 plan 몫) |
| pnpm build · check:bundle | 빌드 통과, 위반 0(파일 234) |
| 첫 JS app/error · app/not-found | 고치기 전 4파일 212KB, 음성 코드 1. 고친 뒤 3파일 87KB, 음성 0(같은 빌드 방식에서 import 한 줄만 되돌려 잼) |

## 눈 점검 안내(컨트롤러가 찍음, next dev · 개발용 DB · 접근 코드 쿠키, 세로 820×1180 · 가로 1180×820)
1. 홈 `/`: 진행이 있는 프로필로 찍는다. 책상 바탕 · 모눈 · 여백 선 · 양옆 낙서, 띠 왼쪽 위 테이프가 제목을 가리지 않는지 본다.
2. 세션 `/session/<id>`: `/reading/lessons` 에서 수업을 시작한다. 답하기 전 흐린 '다음' 단추와 종이 테 · 단추 그림자를 본다. 수업 목록의 '새 수업' 확인 쪽지도 함께 본다(1.4° · 테이프).
3. 결과 `/result/<id>`: 그 세션을 끝낸 직후다. 없는 주소(예: `/없는-주소`)도 같은 바탕인지 본다.

## 설계와 다르게 한 것 · 우려(6)
1. 낙서는 18px 너비로 화면 옆 여백 24px(ChildScreen px-6) 안에만 둔다. 겹침은 없지만 작게 보일 수 있다. 크게 하려면 옆 여백을 넓혀야 해서 화면 검토에 맡긴다.
2. 바탕 층 표지는 `data-desk` 이고, `data-decor` 는 낙서에만 달았다. 2-다 겹침 훑기는 `[data-decor]` 만 보면 된다(바탕 층은 화면 전체라 늘 겹친다).
3. 브리프의 '각도 −3° ±3%'는 spec · plan 의 ±3° 로 했다.
4. 기울기 이름을 ② 목록 값에 맞췄다(left −1.4 · right 1.2 · slight −0.6, 옛 −2 · 1.5 · −1). 열쇠 기울기는 `paperKey` 를 넘기는 쪽만 받는다. 홈 · 목록에 열쇠를 넘기는 일은 묶음 3 몫이다.
5. 확인 쪽지는 단추까지 통째로 1.4° 기운다(spec '쪽지 1.4°'). 어색하면 기울기를 0 으로 되돌리는 데 한 줄이면 된다.
6. 대비 시험이 시드 모듈의 contrastRatio(check-teacher.ts)를 가져다 쓴다. 다른 손이 그 파일을 고치는 중이라 이름이 바뀌면 이 시험도 함께 고쳐야 한다.
