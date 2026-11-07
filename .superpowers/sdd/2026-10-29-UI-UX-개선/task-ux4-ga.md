# 브리프: UI · UX plan 묶음 4-가 — 둥근 창 · 흰 이름표 · 상태 표지 · 작은 초상 꼴 · 3D 칸 바탕(구현자 · Opus · high, 2026-10-30 01:4x 작성, 2-가 검토 Approved 뒤 · 회화 구현이 선생님 창을 잡기 전에 시작)

plan `intent/2026-10-29-UI-UX-개선/plan.md`(approved C185) 130~132줄 묶음 4-가 표 · 위험 3(토큰 값 바꿈이 깨는 시험: teacher-window.spec 이름표 색 · teacher-window.test 의 accent 바탕 이름표 — 같은 묶음에서 고침)을 구현한다. 근거는 spec 2판 `intent/2026-10-29-UI-UX-개선/spec.md` 설계 5.5 둥근 창(275~280줄: 위가 둥근 창, 크기는 화면 꼴 상수 262 × 288 기준(화면 검토 7-가 가 정함), 연두 10px + 먹색 2.6px 테, 창 안은 방 색(color.room) + 바닥 띠, 테이프는 창 밖, 오른쪽 아래 상태 표지 하나(듣기 연두 테 · 마이크, 말하기 accent 물결, 생각 점 셋, 칭찬 별), 흰 종이 이름표(먹색 Jua 24px, −2°, C141 이름표 줄 — accent 바탕 6.1~6.8:1 이라 바꿈), 홈 카드 작은 초상은 같은 파일을 둥근 창 꼴로 56px 안팎 · 방 색 바탕, '선생님을 골라요' 장도 같은 파일) · R-8 · R-25 · FR-U9 · NFR-U3(회화 밖 화면의 첫 JS 에 3D 없음 — 둥근 창 · 작은 초상은 그림 파일과 스타일만) · AC-23i · 정본 15절 AC-19i. 묶음 2-가 보고(토큰 · 모양 · 테이프 열쇠 함수). 초상 파일 다시 찍기(4-나)는 뒤에 오므로 지금 초상 파일을 그대로 쓴다. 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지.

## 범위(plan 4-가 표 그대로)
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/components/teacher/teacher-window.tsx` | 수정 | 위가 둥근 창 · 테 · 방 벽 + 바닥 띠 · 테이프 창 밖 · 오른쪽 아래 상태 표지 하나 · 흰 종이 이름표 · 크기 상수(파일 맨 위, C72 꼴, 262 × 288 기준) · 3D 칸 바탕 방 색. 동작(3D · 초상 갈래 · 접근 이름)은 그대로 |
| `src/components/teacher/teacher-portrait.tsx` · `teacher-choice.tsx` | 수정 | 둥근 창 꼴 갈래(위 둥근 모서리 · 방 색 바탕): 홈 작은 초상(56px 안팎) · '선생님을 골라요'(문구 C141 (3) 그대로) |
| `tests/unit/teacher-window.test.ts` · e2e `teacher-window.spec.ts` · `teacher-choice.spec.ts` | 수정 | AC-19i · 이름표 색 단언(먹색 글자 · 종이 바탕) · 창 상자 · 상태 표지 하나만 보임 |

## 지키는 것
회화 흐름 · talk-frame 의 창 쓰는 자리는 바꾸지 않는다(창 조각의 꼴만). 가르치고 라-1 이 세 영역 선생님 초상을 TeacherPortrait 에서 가져다 쓰므로 그 조각의 입력 꼴을 깨지 않는다. NFR-U3: 회화 밖 화면은 3D 를 들이지 않는다(check:bundle). 설계 숫자는 파일 맨 위 상수 · 토큰(check:ids design-number 49 넘지 않기). 아이 화면 문구 그대로. 커밋하지 않는다.

## 관문 · 보고
TDD(이름표 색 · 상태 표지 순수 함수부터). 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드) · `pnpm spec:trace --fail-on unknown-ac` · `pnpm build && pnpm check:bundle`(홈 · 세션의 첫 JS 에 3D 없음). 로컬 눈 점검 사진은 컨트롤러가 찍으니 보고에 '찍을 화면(회화 세션 · 선생님 고르기 · 홈 카드)'의 주소와 조건을 적는다. 보고 `task-ux4-ga-report.md`(40줄 안), 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.
