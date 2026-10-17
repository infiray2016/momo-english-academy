# 검토 브리프: P11a 차례 1 코드 검토 — 검토 묶음 A1(code-reviewer rev-p11 · Opus · xhigh, 2026-10-18 06:1x)

워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p11`(브랜치 `feature/1a-p11-session-activities`, HEAD 9b97f4d). 이번 몫 = `git status` 의 변경 7(session-frame.tsx · repeat.tsx · preview.ts · match-rate.ts · 시험 셋)과 새 파일(`src/core/scoring/` · `src/core/session/attempt.ts` · `src/core/speaking/` · `tests/unit/{score,session-attempt,speaking-judge}.test.ts`). 구현 브리프 `task-p11-1.md`, 구현자 보고 `task-p11-report.md` '차례 1' 절(바뀐 파일 · 다르게 한 것 · 정할 것 · 차례 2 에 넘기는 것 · 관문 · 남은 우려). plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p11a-세션-바탕-앱-채점.md`(파일별 값 1~4 · 정할 것 다 · 라 · 마 · 차 · 제약 · 증명 표). 코드를 고치지 않는다. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …`(단위만 — 이 Mac 은 DB 시험 불가).

## 대조할 정본(지도 `specs/README.md`)
3.7 점수 표 전부, 3.3 활동 차례(읽기 문단과 표 · 쓰기 1~3 행 · 말하기 문단과 표 — 6 · 8단계 그림 먼저), 3.4 단어장 '단어별 정오', 6.2 끝 두 문단(앱 채점 · 일치율), 7절 인식 규칙 표(최대 3회 · 마이크 못 씀 · 멈춤 · 말소리 없음 · network), 12절 ui.* · speaking.* · speech.*, 13절 C38 · C39 · C53 · C66 · C67 (6)(7) · C73 · C76 · C77.

## 볼 것
1. **값 1 활동 모델** — 모든 영역 · 단계 · 쓰기 두 세션(draft · rewrite) · thinkout · corrections · 말하기 picture-task 가 question 앞 · presentation · confirm-question 수 · 회화 빈 목록. 시험용 시드 1단계 세 영역의 차례 번호가 P10 과 같은가(시험으로 증명됐나 — 프리뷰 진행 세션이 이어짐). 두 인자 꼴 덧붙임이 차례 2 에서 지울 임시인가.
2. **값 2** 시도 꼴(Zod 판별 합 · P10 꼬리표 없는 미리보기 시도) · 앱 채점(첫 시도 · 가장 높은 일치율 · 1~2단계 질문 답 acceptedMin > 0) · 단어별 정오(C76 · 정할 것 라 — 앱이 정답을 아는 낱말 문항만, AI 판정 · 글 보기 이해 안 냄) · 단어 수 · `resumePointOf`(끝 시도 없는 가장 앞 활동) · `ATTEMPTS_PER_BATCH_MAX` · `INPUT_JSON_MAX`.
3. **값 3 `sessionScoreOf`** — 3.7 표의 모든 행과 경계 · null 규칙(a · L 인자, Q 없으면 a = 1, R 없으면 a = 0, Lr 없으면 L = 0, R · Q 둘 다 없으면 null, 9~12 E 없으면 null, 쓰기 4~5 확인 실패 null, 6~12 첨삭 전 · 둘째 세션 null). 영역별 입력 꼴로 나눈 것이 3.7 과 같은 결과를 내는가.
4. **값 4 말하기 판정** — `resultPhraseOf` 경계(≥ high good · ≥ mid close · 그 밖 again, 경계는 설정 인자), `judgeAppAnswer`(허용 답 여럿 → 가장 높은 일치율), `answerShapeOf`, `speakingCounters`(활동 실패 수 → max_retries 건너뜀, audio-capture `MIC_CAPTURE_STREAK` 연속, 세션 max_retries × 2, no-speech → silent_items_max, network 안 셈, stalled 둘 → 멈춤), `englishSentencesOf`(인식 글 있는 발화마다 하나).
5. **컨트롤러 결정(아래)대로인가.** 아니면 Important.
6. **시험** — 이름이 plan 증명 표 글자 그대로(AC-4a 1 · AC-6c 4 · AC-5f 2 · '세션 바탕:' · '단어별 정오:' · '영어로 말한 문장 수:'), 숫자는 `TEST_SETTINGS`, 경계값 사례가 있나, 거짓 초록(단언 없는 사례 · 자기 구현을 베낀 기대값) 없나, 빨강 먼저의 흔적(보고).
7. **제약** — `src/core` 가 db · next · react 를 안 가져옴(`pnpm check:deps`), 설계 숫자 안 박음(check:ids design-number 38 그대로), 시도 입력 · 인식 글을 오류 글에 안 넣음, 용어 · 식별자 ASCII, `session-frame.tsx` 꿰맞춤이 최소인가, `repeat.tsx` 가 `MIC_CAPTURE_STREAK` 를 core 에서 가져오는가.

## 컨트롤러 결정(구현자 보고 '정할 것' 1~3, 2026-10-18 06:1x)
1. **건너뛴 시도(`skipped` 있음)는 인식 글이 있어도 점수 null · 단어별 정오 없음** — plan 값 2 '건너뛰었으면 null' · 7절 '점수에서 뺀다' 글자대로. 성공(≥ high)이면 저절로 다음이라 '인식 글 있는 건너뜀'의 가장 높은 일치율은 늘 high 아래이므로, 넣으면 오히려 아이에게 불리하다. 영어로 말한 문장 수는 인식 글 수대로 센다. **구현자는 '인식 글이 있으면 점수'로 했으니 그 자리를 Important 로 짚어 달라(fix 라운드에서 바꿈).**
2. 성공이 그 활동의 실패 수를 지우지 않음(성공은 audio-capture 이어짐 · 세션 '여섯 번' · 말소리 없음 이어짐만 끊음) — 받음(7절 · C53 (1)). start-failed · 모르는 코드 · phrases-not-supported · bad-grammar 는 '결과 없음' 다시 듣기 — 받음.
3. 단어별 정오 세부(같은 단어 한 줄 · 하나라도 정렬로 맞으면 맞음 · 여러 낱말 표제어는 전부 · forms 로 원형 맞춤 대소문자 무시 · 조립 첫 허용 정답 · 질문 답 가장 가까운 허용 답) — 받음(C76 안, 13절 한 줄 없음).
plan 과 다른 꼴 넷(두 인자 꼴 임시 · `ctx.appJudgedQuestions` · `sessionScoreOf` 영역별 입력 + part · 덧붙인 공개 함수)은 '값과 같은 결과인가 · 차례 2 가 쓰기에 알맞은가 · 보고에 까닭이 있나'로 판정한다.

## 보고
`.superpowers/sdd/2026-10-16-1-가-구현/review-p11-1-code.md` — 판정(Approved · Changes requested) · 지적마다 심각도(Critical · Important · Minor)와 근거(파일 · 줄 · plan 값 · 정본 절). 근거 없는 지적은 넣지 않는다. 차례 1 에 걸린 열린 장부 항목은 없다. 끝나면 SendMessage(team-lead) 한 줄.
