# 코드 재검토: P11b 차례 6 fix 6 · 6b — 코드 B2 M-1~M-3 · 화면 B2 M-1 · M-2(code-reviewer rev-p11b · Opus · xhigh, 2026-10-22, 범위 한정)

대상: 워크트리 p11 작업 트리(HEAD 84b0669 + 차례 6 + fix 6 · 6b, CI 가지 ci/p11-c2 dd5f686 과 같음). 대조: 재검토 브리프 `task-p11-review-fix6-code.md` (1)~(4), fix 브리프 `task-p11-fix6.md` · `task-p11-fix6b.md`, 구현 보고 'fix 6' · 'fix 6b' 줄(`task-p11-report.md` 715 · 717), 앞 검토 `review-p11-6-code.md`, 정본 4절(`specs/03-화면.md` 7행 크기 · 18행 쓰기 세션), 6.1(`specs/05-AI-호출.md` 33행).
직접 확인한 것: `pnpm check:deps` 위반 0 · `pnpm check:bundle` 위반 0 · `pnpm check:ids` code-setting-unknown 0 · design-number 35(새 줄 0, fix 파일에서 나온 줄 0). 힌트 목록(`data-draft-hints`)과 그 조상에 `lang` 이 없음. 단위 · 통합 · e2e 는 다시 돌리지 않았다(CI 15차 도는 중).

## 판정: Approved(CI 15차 초록 조건) — ADDRESSED 4/4(+ 화면 M-1 확인) · 새 지적 0

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| 코드 M-1 생각 꺼내기 `{NAME}` 시험 없음 | **ADDRESSED** | 통합 `tests/integration/writing-feedback.test.ts` "생각 꺼내기: AI 글의 {NAME} 은 턴 결과 · 다시 연 화면 자료에서 영어 이름으로 채우고 저장은 가린 글 그대로다"(483행~). 채움 네 자리를 하나씩 단언한다 — 진행 턴 결과(`composition.ts:203`) = `first` 의 질문 · 보기, 다시 연 화면 자료의 마지막 질문(`session/index.ts:1017`) = `thinkoutTurn`, 끝 턴 결과(`composition.ts:215`) = `done` 의 요약 · 시작 틀, 다시 연 화면 자료의 끝(`session/index.ts:1003`) = `thinkout`. 셋 모두 `{NAME}` 없음, 저장 시도 둘은 `{NAME}` 있고 영어 이름 없음. 어느 한 자리가 빠져도 그 단언이 실패한다 |
| 코드 M-2 '쓸 수 있는 단어' 22px | **ADDRESSED** | `src/components/session/writing-composition.tsx` 459~478행 부근: `SmallButton` 대신 `button` + `CHILD_SIZE.choice`(24px) · `CHILD_SIZE.target`(56 × 56) · `FOCUS_RING` · `lang="en"`, 누르면 읽어 줌 그대로. 크기 훑기(`tests/e2e/child-size.ts:74-97`)의 `lang="en"` 24px · 누르는 곳 56px 기준을 지난다 |
| 코드 M-3 빠진 앞 활동 되찾기 | **ADDRESSED** | 틀의 초고 제출(`src/app/(child)/session/[id]/session-frame.tsx` 806~820행)이 두 번 낸 뒤에도 `incomplete` 면 빠진 번호 가운데 이 기기 대기열에 없는 것만 골라 끝 시도 표시에서 빼고 첫 번호로 옮긴다. a 끝내기(같은 파일 466~476행)와 같은 꼴이고, 대기열에 남은 활동은 건드리지 않아 더 좁다. 대기열에 다 있으면(보내기만 실패) 지금처럼 저장 실패 줄을 보인다. 쓴 초고는 기기 입력에 남아 돌아오면 그대로다. e2e `tests/e2e/resume.spec.ts` "쓰기 6~12: 초고를 낼 때 서버에 빠진 앞 활동이 있으면 그 활동으로 돌아가고 다시 오면 쓴 글 그대로 낸다"는 서버에 닿은 과제 끝 시도를 지워 상황을 만들고, 과제로 돌아감 · 초고 글 그대로 · 결과 주소를 단언한다. 고치기 전이면 초고 화면에 머물러 첫 단언이 실패한다 |
| 화면 M-2 초고 입력란 5줄 고정 | **ADDRESSED** | `writing-composition.tsx:56-59` 이름 붙인 화면 꼴 상수(`DRAFT_ROWS_MIN` 5 · 가로 8 · 세로 10), `useLayoutEffect`(347~366행)가 글 · 방향이 바뀔 때 `min(글 높이, 상한 줄 수 × 줄 높이 + 안쪽 여백 · 테)` 로 높이를 맞추고, 줄 높이를 읽지 못하면(`normal`) 5줄 그대로 둔다. `resize-none`. e2e AC-4c 에 단계 규격 `amount.words.max` 낱말 글로 `fitsBothWays` 와 가로 입력란 `scrollHeight ≤ clientHeight`(poll)를 더했다. 고정 5줄이면 가로 단언이 실패하고, 상한 없이 늘면 문서 높이 단언이 실패한다 |
| 화면 M-1 실패 길 힌트 언어 | **확인(코드 변화 없음)** | 컨트롤러 결정 '힌트는 한국어'. 힌트 목록 `<ul data-draft-hints>` · `<li>` 와 조상에 `lang` 이 없다 |

## 2. 브리프가 특히 물은 것

- **(1) `{NAME}` 시험이 네 자리를 모두 지키는가:** 지킨다. 위 표 첫 행.
- **(2) 칩 24px · 56px:** 크기 훑기 기준(영어 글 24px · 누르는 것 안 글 22px · 상자 56 × 56)을 모두 넘는다. AC-N9 의 P11 화면 훑기는 차례 10 몫이라 지금은 코드로만 확인했다.
- **(3) 빠진 활동 되돌아가기:** 일반 세션 끝내기와 같은 길이다(끝 시도 표시에서 빼고 그 활동으로). 끝내기도 안내 문구 없이 옮기고, 4절은 이 경우의 문구를 정하지 않으므로 어긋나지 않는다. 돌아간 활동은 그 활동의 화면 그대로라 '한 화면에 행동 하나'와도 맞다.
- **(4) 줄 수 상수 · matchMedia · e2e:** 5 · 8 · 10 은 입력란 높이를 정하는 화면 꼴 값이다. 정본 4절 · 12절과 plan 값 7 에 없는 수라 설정값이 아니고, check:ids 도 새 줄을 내지 않는다. `matchMedia` 는 `useEffect` 안에서만 불려 서버 렌더에 닿지 않는다. 첫 그림은 세로 상한으로 재고, 효과가 방향을 읽은 뒤 다시 잰다. `useLayoutEffect` 는 React 19 에서 서버 렌더 경고가 없다. 새 e2e 단언 셋(M-3 되돌아가기, 문서 높이, 가로 입력란 안 넘김)은 모두 고치기 전 코드라면 실패하는 참 단언이다.

## 3. 판정

**Approved(CI 15차 초록 조건).** 앞 검토 B2 의 Minor 셋과 화면 M-2 가 닫혔고, 화면 M-1 은 결정대로 코드 변화 없이 맞다. fix 가 건드린 자리에서 새 지적은 없다.

## 범위 밖 관찰(지적 아님)

- **`fitsBothWays` 는 방향을 바꾼 뒤 한 그림만 기다린다.** 입력란 상한은 `matchMedia` 의 change 사건 → 상태 → 레이아웃 효과로 바뀌므로, 느린 CI 에서 가로 높이를 재는 순간이 그보다 앞서면 흔들릴 수 있다(거짓 초록이 아니라 거짓 빨강 쪽). 15차에서 흔들리면 이 자리를 poll 로 바꾸면 된다.
- 차례 7 에 넘긴 관찰 둘(`restored` 를 실패로 읽는 두 자리 · AC-8k '빈 새 초고' 단언)은 브리프대로 이번에 손대지 않았다.

## 장부 항목

| 항목 | 판정 | 근거 |
|---|---|---|
| review-p11-6-code M-1 · M-2 · M-3 | **닫힘** | 위 1절 |
| review-p11-6-design M-1 · M-2(코드 몫) | **닫힘** | 위 1절. 사진으로 보는 몫은 화면 재검토가 판정 |
