# 검토 브리프: P11a 차례 3 코드 검토 — 검토 묶음 A3(code-reviewer rev-p11 이어 보기 · Opus · xhigh, 2026-10-18 07:5x 작성 — CI 초록 뒤 보냄)

워크트리 p11(HEAD d798b6e), 이번 몫 = `git status` 의 변경 · 새 파일(쓰기 1~3 조각 `src/components/session/writing-items.tsx` · 답 조각 셋 `src/components/answer/{choice,tiles,typing}.tsx` 선택 속성 · 틀 · `src/lib/session-input.ts` · 서버 화면 자료 · 새 core `src/core/answer/expected.ts`(정답 조각 · displayCardsOf) · e2e writing · resume · reading.spec 쪽지 단언 · 사진 이름). 구현 브리프 `task-p11-3.md`, 보고 `task-p11-report.md` '차례 3' 절(바뀐 파일 · 계획 표 밖 셋 · 다르게 한 것 · 정할 것 · 차례 4 에 넘기는 것), plan-p11a 값 11 · 6 · 7 · 정할 것 마 (2) · 사 · 위험 5 · 증명 표(AC-4a · AC-6a). CI 결과는 컨트롤러 메시지. 코드를 고치지 않는다.

## 대조할 정본
3.3 쓰기 1~3 행(고르기 · 베끼기 · 조립, 기기 자판 없음), 4절 쓰기 세션 행 · 세션 공통, 13절 C73(첫 글자 대문자 · 마침표 카드 · 차례 · 쓴 답 비교) · **C84**(조립 카드 — 고유 명사 · I 는 정답 꼴 표시, 판정 C73 그대로) · C77 (2) · C78 · C82, AC-4a · AC-6a.

## 볼 것
1. **값 11** — 갈래마다 안내 줄(문구 표 글자 그대로) · 답 조각(pick-word · copy-tiles · build-tiles · fill-letters · dictation 앱 안 자판 · 어구 · 문장 조립) · 받아쓰기 · 빈 글자 채우기 들어올 때 한 번 읽기 + '다시 듣기' · 조립 칸은 카드 수만큼 · 판정 `checkAnswer`(C73) · 맞으면 '맞았어요!' + 낱말 · 뜻 두 줄 + '다음' · 틀리면 '정답은 이거예요' + 정답(타일 · 카드 차례 그대로) + '한 번 더 풀기' → 맞힐 때까지(점수는 첫 시도) · 끝 시도 `tries` · **기기 자판 요소 없음**(input · textarea · contenteditable — AC-4a 단언이 실제로 이것을 보나).
2. **답 조각 선택 속성(initial · onChange · reveal · 타일 넷째 속성)** — 모두 선택이고 안 넘기면 P10 배치 동작 그대로인가(코드 · 배치 e2e 통과). `displayCardsOf`(C84)가 판정을 바꾸지 않는가(`checkAnswer` 그대로).
3. **되살리기 · 활동 안 입력** — 같은 기기에서 고른 보기 · 놓은 카드 되살림(값 6), 끝 시도 넣거나 끝내면 지움, A2 M-1(진행 세션이 아닌 줄 지움 — 세션 화면 열 때) 닫혔나, 다른 기기는 빈 채.
4. **활동 전환 때 조각 새로(key)** — 장부 '전환 때 입력 재사용' 행이 닫히나.
5. **작은 것 넷** — A2 M-1 · 화면 재검토 N-1(상태 줄 aria-live, 글 없으면 배치에서만 뺌) · N-2(정답 보기 고리 틈) · 코드 재검토 M(쪽지 단언 오른쪽 끝 낱말 + 앞 조건) 각각 닫혔나.
6. **시험** — AC-4a e2e(이름 글자 그대로 · AI 호출 0 세기 · 기기 자판 없음 단언 · 1 · 3단계 둘) · AC-6a e2e(읽기 셋째 문항 · 쓰기 3단계 놓은 카드 되살림 — 진짜로 닫았다 여는가) · 거짓 초록 없나 · 숫자는 TEST_SETTINGS.
7. **제약** — 서버 액션 첫 문장 requireAccess(이름 있는 가져오기) · safe-error · 시도 입력 로그 없음 · core 의존 · check:ids 새 줄 없음 · 용어 · 문구 글자 그대로. 계획 표 밖 파일 셋(expected.ts · 서버 화면 자료 · 타일 넷째 속성)의 까닭이 보고에 있나.

## 보고
`review-p11-3-code.md` — 판정 · 심각도 · 근거. 장부 항목(전환 때 입력 재사용 · A2 M-1 · N-1 · N-2 · 쪽지 단언) '닫힘 · 아직 열림'. SendMessage 한 줄.
