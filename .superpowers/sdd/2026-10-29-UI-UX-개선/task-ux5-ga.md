# 브리프: UI · UX plan 묶음 5-가 — 화면 가족 꼴(세션 · 결과 · 막힘 · 쉼 · 오류 · 배치 · 첫 실행)(구현자 · Opus · high, 2026-10-30 02:1x 작성, 묶음 0 · 2 뒤 · 가르치고 라-2 전에 시작)

plan `intent/2026-10-29-UI-UX-개선/plan.md`(approved C185) 142~146줄 묶음 5-가 표 · 작업 순서 10 · 정한 것 8(진행 막대 묶음 이름은 정본 3.2 · 3.3 활동 이름에서, 가르치고 plan 이 여섯 자리 이름으로 바꿈) · 위험 1(session-frame · result-view 는 가르치고 라-2 · 라-4 와 잠금 — 이 묶음이 먼저)을 구현한다. 근거는 spec 2판 `intent/2026-10-29-UI-UX-개선/spec.md` 설계 5 의 화면 가족 문단(세션 · 결과 · 막힘 · 쉼 · 오류 · 배치 · 첫 실행 — 위 띠 아래 큰 판 하나, 판 아래 끝 = 보는 창 아래 끝, 진행 막대, '다음' 큰 단추를 판 안 아래로, 빈 바탕이 화면 높이 1/3 아래, 첫 실행 종이 높이 = 내용) · 5.4 결과 판(가로 두 열: 왼쪽 제목 · 번호 · 오늘 만난 단어 · 막대 자리 · 단추 줄, 오른쪽 큰 별; 세로 한 열: 별 → 제목 → 단어 → 막대 → 단추; 다시 하기는 별 자리에 '다시 했어요', 쓰기 초고는 별 자리를 접음) · UX 검토 3판 지적 D-1 · D-7 · D-8 · D-10 · D-13 · D-14 · AC-23j · AC-23e, 0-가 · 0-다 보고(막힘 · 쉼 판의 단추 차례 stuckButtonsOf · 문구 · met 이름 · MetWordCards), 2-가 보고(토큰 · 모양 · 테이프 열쇠 · 흐린 단추), 0-나(앱 오류 판 app-trouble). 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지.

## 범위(plan 5-가 표 그대로)
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/app/(child)/session/[id]/session-frame.tsx` | 수정 | 위 띠 아래 큰 판 하나(판 아래 끝 = 보는 창 아래 끝), 진행 막대, '다음' 큰 단추를 판 안 아래로, 막힘 · 쉼 판 화면 가족 꼴. 활동 흐름 · 시도 저장 · 0-가 의 돌아갈 길(router.refresh · 같은 활동 복귀)은 바꾸지 않는다 |
| `src/components/session/activity-progress.tsx`(제안) · `src/core/session/progress.ts`(제안) | 신규 | 활동 묶음 막대(묶음 이름 · 지금 자리), 순수 함수(제안 `activityGroupsOf`): 묶음 이름은 정본 3.2 · 3.3 의 활동 이름(새 단어 · 과제 · 따라 말하기 · 듣기 · 질문)에서 — 가르치고 라-2 가 여섯 자리 이름으로 바꿀 수 있게 이름 표를 한 곳에 |
| `result-view.tsx` · `reward.tsx` | 수정 | 결과 판(5.4) 꼴. 0-다 의 met 이름 · MetWordCards · 0-가 의 쉼 '다시 해 볼래요' 는 그대로 |
| `mic-blocked.tsx` · `ai-rest.tsx` · `app-trouble.tsx` · `placement-flow.tsx` · `first-run-flow.tsx` | 수정 | 화면 가운데 큰 판 하나(빈 바탕이 화면 높이 1/3 아래), 배치 문항 · 결과 판, 첫 실행 종이 높이 = 내용(D-14). 단추 차례 · 문구는 그대로 |
| `tests/unit/ux-progress.test.ts`(제안) · e2e 사진(세션 · 결과 · 막힘 · 쉼 · 오류 · 첫 실행, 가로 · 세로)과 판 상자 높이 셈 | 신규 · 수정 | AC-23j(결과 사진과 판 상자 높이 셈 — 빈 바탕 1/3 아래) · AC-23e. e2e 는 정적 |

## 지키는 것
아이 화면 문구는 바꾸지 않는다(설계 6 표 밖 새 문구 금지). 화면 꼴만 바꾸고 동작(시도 저장 · 판정 · 돌아갈 길 · 단추 차례)은 그대로. 설계 숫자는 토큰 · 파일 머리 상수(design-number 기준 49). 세션 조각(reading · writing-items · speaking · repeat)은 손대지 않는다(2-나 · 5-나 · 가르치고 라 몫). 회화 파일은 손대지 않는다(묶음 6). 커밋하지 않는다.

## 관문 · 보고
TDD(활동 묶음 순수 함수부터). 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드) · `pnpm spec:trace --fail-on unknown-ac`. 다른 손 때문에 실패하면 적기만. 눈 점검 사진은 컨트롤러가 찍으니 보고에 '찍을 화면(세션 · 결과 · 막힘 · 쉼 · 오류 · 첫 실행)과 만드는 조건(쉼 · 막힘은 시험 DB 상한 · 가짜 음성 없이 로컬에서 어떻게 보는지)'을 적는다. 보고 `task-ux5-ga-report.md`(50줄 안), 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.
