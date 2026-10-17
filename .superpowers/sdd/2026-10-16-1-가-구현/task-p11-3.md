# 구현 브리프: P11a 차례 3 — 쓰기 1~3 · 이어 하기(implementer impl-p11 이어 보기 · Opus · high, 2026-10-18 07:0x 작성 — 차례 2 화면 검토 · fix · 커밋 뒤 보냄)

plan-p11a 작업 순서 4(검토 묶음 A3 — code-reviewer + design-reviewer, 목업 B_W1_Words · B_W3_Order). 시작 조건: 차례 2 커밋 뒤 컨트롤러 알림. 워크트리 p11, 커밋 없음. 통합 · e2e 는 CI(컨트롤러 push — 사진은 `E2E_PHOTOS` 로 `p11-writing-<화면>-<방향>.png` · `p11-resume-<화면>-<방향>.png`).

## 먼저 읽을 것
plan-p11a **값 11**(쓰기 1~3 조각) · 값 6(활동 안 입력) · 값 7(틀) · 정본 밖 문구 표(쓰기 1~3 갈래별 안내 일곱 · '다시 듣기' · '맞았어요!' · '정답은 이거예요') · 정할 것 마 (2) · 사 · 위험 5 · 증명 표(AC-4a e2e · AC-6a e2e 글자 그대로). 13절 C73(문장 조립 대문자 · 마침표 카드 · 차례, 쓴 답 비교) · C77 (2) · C78. 정본 3.3 쓰기 1~3 행(고르기 · 베끼기 · 조립, 기기 자판 없음) · 4절 쓰기 세션 행 · AC-4a · AC-6a. P10 `src/components/answer/{choice,tiles,typing}.tsx`(배치 동작 그대로 두고 선택 속성만) · `src/core/answer/check.ts`(`checkAnswer`) · 시험용 시드 1단계 쓰기 갈래(pick-word · fill-letters · copy-tiles) · 견본 빌더 `writingLesson(ref, 3)`(조립) · 차례 2 가 만든 틀 `session-frame.tsx` · `src/lib/session-input.ts` · 읽기 조각 꼴 `src/components/session/reading.tsx`.

## 이번 몫(파일 — plan 표 A3 행)
- `src/components/answer/{choice,tiles,typing}.tsx` — `initial` · `onChange`(같은 입력 되살리기) · `reveal`(정답 보이기) 속성. **모두 선택 — 없으면 지금 동작 그대로**(배치 e2e 가 그대로 초록, 위험 5).
- `src/components/session/writing-items.tsx` — 값 11: 갈래마다 안내 줄(문구 표 글자 그대로) + 답 조각(pick-word `ChoiceAnswer` · copy-tiles · build-tiles · fill-letters `TileAnswer` · dictation `TypingAnswer` 앱 안 자판 · 어구 · 문장 조립 카드) · 받아쓰기 · 빈 글자 채우기는 들어올 때 낱말을 한 번 읽고 '다시 듣기' · 조립의 놓는 칸은 카드 수만큼(B_W3_Order) · 판정 `checkAnswer`(C73) · 맞으면 '맞았어요!' + 낱말 · 뜻 두 줄(B_W1_Words) + '다음' · 틀리면 '정답은 이거예요' + 정답(타일 · 카드 차례 그대로) + '한 번 더 풀기' → 맞힐 때까지(점수는 첫 시도) · 끝 시도 `tries` · **기기 자판을 띄우는 요소 없음**(input · textarea · contenteditable — AC-4a).
- 틀 — 쓰기 `writing-item` 활동에 조각 연결, 활동 안 입력 되살리기(같은 기기 — 놓은 카드 · 고른 보기), 활동 전환 때 조각을 새로 만든다(key — 장부 '전환 때 입력 재사용' 행).
- 화면 재검토 fix 2 새 Minor 둘(`review-p11-fix2-design.md` N-1 · N-2, 막지 않음 — 여기서 함께): N-1 틀의 상태 줄은 글이 생길 때 새로 붙이지 말고 늘 있는 알림 영역(aria-live)에 글만 넣어 읽기 도구가 끊김 안내를 읽게 · N-2 정답 보기에서 표시된 보기가 이어질 때 고리(테)가 서로 붙지 않게 틈을 둔다.
- 코드 검토 A2 M-1: `src/lib/session-input.ts` — 이 기기에서 끝내지 않은 세션의 활동 안 입력 줄이 남는 틈을 닫는다(예: 세션 자료를 열 때 끝난 · 중단된 세션 줄 지움, 또는 줄 수 상한).
- 시험 `tests/e2e/writing.spec.ts`(AC-4a e2e 이름 글자 그대로 — "AC-4a 쓰기 1 · 3단계 세션은 AI 호출 0회로 채점되고 기기 자판이 뜨지 않으며 첫 활동은 새 단어 미리보기다", 3단계는 견본 빌더로 넣음) · `tests/e2e/resume.spec.ts`(AC-6a 글자 그대로 — "AC-6a 세션 도중 앱을 닫고 다시 열면 같은 활동 · 같은 입력에서 이어진다(읽기 셋째 문항 · 쓰기 3단계 놓은 카드)") · 단위가 필요하면 `writing-items` 순수 부분만. P10 배치 e2e · 차례 2 reading · session e2e 가 그대로 초록.

## 지킬 것
설계 숫자 없음(갈래 · 칸 수는 규격에서). 아이 화면 원칙(안내 20 · 영어 24 · 단추 이름표 22 · 카드 보조 줄 `data-size-guide` · 누르는 곳 56 · 퍼센트 없음) · 정본 밖 문구 글자 그대로 · 해요체. 기기 자판 금지. 시도 입력은 로그에 안 넣음. `check:deps` · `check:bundle` · `check:ids` 새 줄 없음. 아이 이름 · 비밀값 없음. 보고 `task-p11-report.md` '차례 3' 절(바뀐 파일 · 다르게 한 것 · 정할 것 · 사진 이름 · 차례 4 에 넘기는 것) → SendMessage → CI → 검토 A3.
