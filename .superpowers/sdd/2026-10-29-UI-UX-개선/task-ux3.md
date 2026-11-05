# 브리프: UI · UX plan 묶음 3 — 홈 카드 넷 · 홈 위 띠 · 수업 목록 위 띠 · 영역 그림 · 홈 작은 초상(구현자 · Opus · high, 2026-10-30 02:1x 작성, 0-가 · 0-다 · 2-가 Approved 뒤 · 4-가 검토 중에 시작)

plan `intent/2026-10-29-UI-UX-개선/plan.md`(approved C185) 124~129줄 묶음 3 표와 작업 순서 9 를 구현한다. 근거는 spec 2판 `intent/2026-10-29-UI-UX-개선/spec.md` [승인 UX2](홈 카드 넷에서 단원 5칸 · 막대 둘을 빼고 수업 목록 위 띠로, 회화 친한 정도는 회화 수업 목록 위 띠로, '이번 주 n일'은 카드에 남기되 첫 사용 꼴에서는 숨김, 회화 카드의 오늘 자리는 오늘 이야기 제목) · R-8(회화 카드: 고른 선생님의 작은 초상 둥근 꼴 · 방 색 바탕, 고르기 전엔 글자 동그라미) · R-12(위 띠 왼쪽 '[홈 이름]의 공부 보드', 오른쪽 연속 · 별 칸은 값 1 이상일 때만 — 0-다 의 homeBandChipsOf 규칙 그대로, 연속 학습 일수 칸을 그리는 갈래를 더하되 값은 P12 가 넣음) · R-13(끝낸 세션이 없으면 막대 숨김) · R-15 · 설계 5 홈 · 수업 목록 문단(크림 책상 · 같은 크기 카드 넷 · 카드마다 영역 이름 + 영역 그림 · 단계(크게) · 오늘 · 큰 단추 · '여기부터 해요' 표지 하나, 수업 목록 위 띠에 단원 5칸 · 막대 둘) · 설계 6 문구 표('오늘 다 했어요' · '오늘 아직이에요' · '첫 수업을 해 봐요' 그대로, 새 문구 없음) · AC-U3 · AC-U8(홈 사진 구성, 첫 사용 홈 위 띠 0 없음) · AC-23c · AC-23h, 정본 4절 홈 · 수업 목록 행(C180), 0-다 검토 M1 · 우려 1(home.spec 첫 사용 단언 '별 0 → [data-star-total] 0개 · 첫 별 뒤 1개'), 4-가 보고(TeacherPortrait 둥근 꼴 갈래 · 작은 초상 56px — 그 조각을 가져다 쓴다, 파일은 고치지 않음), 2-가 보고(토큰 · 테이프 열쇠 · 흐린 단추). 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지.

## 범위(plan 묶음 3 표 그대로)
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/app/(child)/page.tsx` | 수정 | 위 띠 왼쪽 '[홈 이름]의 공부 보드', 오른쪽 별 칸(0-다 규칙 그대로, 연속 칸 그리는 갈래 더함) · 부모 꼬리표(kraft) |
| `src/app/(child)/home-cards.tsx` | 수정 | 카드: 영역 이름 + 영역 그림 · 단계(크게) · 오늘('오늘 다 했어요' 표지, 또는 '오늘 아직이에요' + '이번 주 n일', 첫 사용은 '첫 수업을 해 봐요' 한 줄만) · 큰 단추. 회화 카드는 작은 초상(TeacherPortrait 둥근 꼴 56px 안팎, 고르기 전엔 글자 동그라미) + 오늘 이야기 제목. UnitCells · Bar · RecentCells 지움, '여기부터 해요' 그대로, 0-가 의 닫힌 카드 다시 확인 줄 · micRecheckPressOf 는 그대로 |
| `src/components/board/area-art.tsx`(제안) | 신규 | 영역 그림 넷: 시안 ② 의 il-book-hand · il-pencil-hand · il-speak-hand · il-chat-hand 선 그림(SVG, 글자 없음, 토리 · 모모 그림은 쓰지 않음, 색은 토큰) |
| `src/server/home/index.ts` · `src/server/lesson-list/band.ts`(제안) | 수정 · 신규 | 단원 5칸 · 아는 단어 · 최근 성적 · 끝낸 대화 셈을 band.ts 로 옮기고 친한 정도 · '끝낸 세션 있음'을 더함. 홈은 오늘 이야기 제목(회화 목록 '여기부터 해요' 수업)을 더함 |
| `src/server/lesson-list/index.ts` · `src/core/lesson-list/state.ts` · `src/app/(child)/[area]/lessons/lesson-board.tsx` | 수정 | 위 띠에 단원 5칸 · 막대 둘(회화는 아는 단어 · 끝낸 대화 · 친한 정도), 끝낸 세션이 없으면 막대 숨김(R-13). 0-가 의 쉼 한 줄 칸 · selectionKeptOf 는 그대로 |
| `tests/unit/ux-home.test.ts`(제안) · `today-done.test.ts` · `lesson-list-state.test.ts` · `tests/integration/home.test.ts` · `lesson-list.test.ts` · e2e `home.spec.ts` · `lesson-list.spec.ts` | 신규 · 수정 | 위 띠 칸 규칙(별 0 → [data-star-total] 0개 · 첫 별 뒤 1개, 연속 칸은 값 있을 때만) · 카드 꼴(첫 사용 꼴에 0 · 막대 · '오늘 아직이에요' 없음) · 목록 띠 · AC-2a · AC-2d 고친 문장 · 사진(home.spec 가로 · 세로 · 첫 사용). e2e 는 정적 |

## 지키는 것
아이 화면 문구는 설계 6 표 그대로(새 문구 금지). 설계 숫자는 토큰 · 파일 머리 상수(check:ids design-number 기준 49). 별 셈 · 판정 함수는 바꾸지 않는다. 4-가 파일(teacher-*)과 회화 파일, 세션 조각(5-가 · 가르치고 라 몫)은 손대지 않는다. 식별자 영어. 커밋하지 않는다.

## 관문 · 보고
TDD. 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드) · `pnpm spec:trace --fail-on unknown-ac`(시험 이름 AC-23c · AC-23h · AC-2a · AC-2d 꼴). 다른 손(다 묶음 파일) 때문에 실패하면 적기만. 눈 점검 사진은 컨트롤러가 찍으니 보고에 '찍을 화면(홈 보통 · 첫 사용 · 수업 목록, 가로 · 세로)'의 조건(첫 사용 프로필 만드는 법 포함)을 적는다. 보고 `task-ux3-report.md`(50줄 안), 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.
