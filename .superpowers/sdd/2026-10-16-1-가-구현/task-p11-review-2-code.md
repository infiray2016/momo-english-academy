# 검토 브리프: P11a 차례 2 코드 검토 — 검토 묶음 A2(code-reviewer rev-p11 이어 보기 · Opus · xhigh, 2026-10-18 06:3x 작성 — 차례 2 DONE · CI 초록 뒤 보냄)

워크트리 p11(`feature/1a-p11-session-activities`), 비교 기준 HEAD(차례 2 시작 때 ccbd899 — 바뀌었으면 메시지에 적음). 이번 몫 = `git status` 변경 · 새 파일(세션 서버 · 서버 액션 · 결과 자료 · 대기열 · 활동 안 입력 · 세션 틀 · 읽기 조각 · 결과 화면 · 통합 둘 · 단위 하나 · e2e 셋 · 사진 도우미 · ci.yml). 구현 브리프 `task-p11-2.md`(컨트롤러 결정 둘 — 문항 활동 지문 보기에 그림 줄 없음 · 결과 큰 단추 규칙), 구현자 보고 `task-p11-report.md` '차례 2' 절, plan-p11a 값 5~10 · 위험 2 · 3 · 4 · 9 · 증명 표. CI 결과(run 번호 · 통합 · e2e · e2e-local)는 컨트롤러가 메시지에 적는다. 코드를 고치지 않는다.

## 대조할 정본
4절 세션 공통 · 읽기 세션 행 · 세션 결과 행(`specs/03-화면.md`), 3.3 읽기, 5절 sessions · attempts · 전이 표, 8절 네트워크 끊김 · 같은 프로필 동시 사용 · 오래 멈춘 세션, 13절 C70 · C73 · C76 · C77 (1) · C78 · C82, 12절 ui.* · speaking.* · speech.*.

## 볼 것
1. **값 5 서버** — 시도 낱낱 검사(꼴 틀린 것만 `rejected`, 종류가 활동과 안 맞으면 거부, AI 활동 종류의 끝 시도는 이 길로 안 받음) · 서버 채점이 정본(화면이 보낸 점수 무시) · 늦은 시도 처리 · `finishLessonSession` 한 트랜잭션 FOR UPDATE · `incomplete` · 점수 · 학습일 · 완료 시각 · 영어로 말한 문장 수 · 두 번 불러도 같음 · 남의 세션 거부 · `loadSessionView` 의 `resumePointOf` 와 넘기는 config · 동음이의어 · 원형 표 · `activitiesOf` 한 인자 꼴(두 인자 덧붙임 지워졌나) · 상수는 core 에서.
2. **값 6 기기** — 50개씩 · accepted · rejected 둘 다 지움(장부 M-2 — 영영 안 비는 대기열 없음) · warn 에 입력 글 없음 · `idle()` 뒤 `flush()` · 활동 안 입력 저장 키 · 못 쓰면 메모리 · 끝 시도 넣거나 세션 끝나면 지움.
3. **값 7 틀** — 활동마다 조각 · `onDone` 하나 · 마지막 뒤 idle → finishSession → incomplete 한 번 더 → 끊김 안내 · online 다시 → `/result/<id>` · 첫 누름 `unlockFromGesture()` · P10 종이 띠 · 활동 점 · '홈' 그대로 · 꿰맞춤(M-5 key) 사라졌나.
4. **값 8 결과** — 그 프로필의 끝난 세션만 · '수업을 끝냈어요!' · '다음 수업'(hereStart lesson · resume · practice → startLesson) · 그 밖 '수업 목록' · '홈' · 숫자 · 퍼센트 없음.
5. **값 9 읽기** — 지문 활동('읽어 주기' 눌러서만 · 모든 글로서리 낱말 누르면 뜻 쪽지 · 누른 원형 `tappedWords` · 안내 줄) · 문항 활동(C77 (1): 맞으면 '맞았어요!' + 해설 · 처음 틀리면 해설 + '한 번 더 풀기' 정답 안 보임 · 둘째 뒤 정답 보기 · 둘째는 점수 없음) · 가로 나란히 · 세로 '지문 보기' 쪽지 · **문항의 지문 보기에 그림 줄 없음(컨트롤러 결정)** · 지문 안 낱말 단추 `data-size-exempt` · P5b `ReadingPassage` 는 선택 속성 하나만.
6. **값 10 e2e 견본** — `insertSampleLesson` · `atLevel` · 판 · 정정 처리 · AC-3a 이름 글자 그대로(4단계 지문 55~80 · 문제 4 · 바로 채점 · 해설) · session.spec 이 끝까지 가는가 · 사진 도우미는 env 없으면 아무것도 안 함 · ci.yml 변경이 e2e 작업에만.
7. **시험** — 통합 '세션 바탕:' 넷(서버 재채점 · 낱낱 거부 · 끝내기 · DB 오류 로그에 입력 글 없음) · AC-2c 읽기 몫 · 단위 '대기열:' — 이름 글자 그대로, 숫자는 TEST_SETTINGS, 거짓 초록 없음.
8. **제약** — 서버 액션 첫 문장 requireAccess(이름 있는 가져오기 꼴) · safe-error 로 오류 글 · 시도 입력 · 인식 글 로그 없음 · check:deps · check:bundle(화면 묶음에 서버 변수 금지) · check:ids 새 줄 없음 · 용어 · 정본 밖 문구 표 글자 그대로 · P10 배치 · 첫 실행 · 홈 · 목록 e2e 그대로 초록(CI).

## 장부에서 닫을지 볼 것
- 대기열 묶음 전체 거부(review-p10-5-6-code M-2) — 값 6 으로 닫히나.
- safe-error 단위 사례(서버 액션 · 서버 함수의 DB 오류 행) — 통합 'DB 오류 로그에 시도 입력 글이 없다'로 닫히나.
- M-5 꿰맞춤 key — 틀을 다시 써서 사라졌나.

## 보고
`review-p11-2-code.md` — 판정 · 심각도 · 근거(파일 · 줄 · plan 값 · 정본 절). 장부 항목마다 '닫힘 · 아직 열림(근거)'. 끝나면 SendMessage(team-lead) 한 줄.
