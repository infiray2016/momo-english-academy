# 검토 브리프: P11b 차례 5 코드 검토 — 검토 묶음 B1(code-reviewer rev-p11b 이어 보기 · Opus · xhigh, 2026-10-22 14:0x 작성 — CI 초록 뒤 보냄)

워크트리 p11(HEAD 726198f), 이번 몫 = `git status` 의 변경 · 새 파일 27(+3302 −75): `playwright.config.ts` 공용 변경 1 · `tests/e2e/{fake-ai-server,fake-ai}.ts` · `src/server/session/{ai-context,ai-gate}.ts` · `src/server/writing/index.ts`(checkGuided) · `src/server/actions/writing.ts` · `src/core/session/attempt.ts`(b 종류 · aiNeededLesson) · core 순수 함수 둘(문장 틀 조립 · 고칠 곳 찾기) · `src/components/session/{wait-hint,ai-rest,writing-guided}.tsx` · 세션 서버 · 틀 · 목록 · 지난 수업 · 결과(안전 상한 안내) · 통합 writing-check(3) · safety-cap(2) · e2e writing 4~5 · 안전 상한 · timeout(AC-N6 · N10) · speaking.spec 단언 보강 · 말하기 '같이 말해 볼까요' 36px. 구현 브리프 `task-p11-5.md`, 보고 `task-p11-report.md` '차례 5' 절(바뀐 파일 · 다르게 한 것 열하나 · 정할 것 셋 · 남은 우려 · 차례 6 에 넘기는 것). plan-p11b 값 1 · 2 · 3(checkGuided) · 4 · 6 · 7(writing-guided) · 8 · 9(시작 막음) · 'AI 실패 갈래별 화면 길' 표 · 정할 것 ㄴ(C80) · ㄷ · ㅁ(C81) · 위험 4 · 5 · 7 · 8 · 증명 표. CI 결과는 컨트롤러 메시지. 코드를 고치지 않는다.

## 대조할 정본
6.1 · 6.2(쓰기 확인 규격 · 가변부 — 앞 단원 학습 요소 C64 (1)), 8절(실패 길 · 안전 상한 · '동안'의 예외), 4절 쓰기 세션 행('확인은 같은 화면에') · 기다림 표시 예, 11절 (7) · C50 (2), 12절 ai.* · ui.wait_hint_seconds · writing.*, 13절 C63 (5) · C77 (6) · C79 · C80 · C81. CLAUDE.md: AI 호출은 서버에서만 · 키는 서버에만 · 응답 Zod · 실시간 호출은 비용 · 횟수로 아이 진행을 끊지 않음(알림 · 안전 상한만).

## 컨트롤러 결정(보고 '정할 것' 1~3 — 모두 받음)
1. 상한 날 다시 연 쓰기 4~5 세션은 AI 활동이 끝났어도 안내(plan 값 9 글자대로). 2. 안전 상한 시험의 둘째 세션 몫은 차례 7 이 더함. 3. N-2 는 새 사진으로 다시 잼(화면 검토). 다르게 한 것 열하나는 보고 까닭대로 판정 — 특히 4(끝 시도 있으면 재사용 · 같은 id 동시 경합은 안 막음 → 비용 두 배 위험을 Important 로 볼지 판단: 같은 id 두 요청이 동시에 닿는 길이 실제로 있는가 — 대기열이 아니라 서버 액션 한 번이면 드물다) · 6(서버 오류 → `error` 시도 · 넘어감) · 7(`dailyUsage` 직접 가져옴) · 8(목록 · 지난 수업 · 결과 안내 당김) · 9(건너뛰기 활동 전체 · 마이크 막힘은 쓰기 세션 안 막음).

## 볼 것
1. **AI 호출 경로** — 서버 액션 · `server-only` 에서만, `checkWriting`(P9c)을 통해서만 부르는가, 키 · 주소가 화면 묶음에 안 새는가(`check:bundle`), 응답은 P9c Zod, 아이 글 · AI 글이 로그 · 오류 · 알림 값에 없는가(`dbErrorTag`).
2. **값 1 LevelContext** — canDo · sentenceMaxWords(level_specs 그 판) · learningElement · unitWords(unit_specs) · prevLearningElements(앞 단계 전부 + 같은 단계 앞 단원, 알파벳 단원 0 제외, 판 `pickByCell`) — 없는 칸은 던짐. 통합 '쓰기 AI: 가변부의 앞 단원 학습 요소 …' 가 이것을 보나.
3. **값 2 · 9 안전 상한** — `aiRestingToday` = `preCallGate(dailyUsage)` 거짓, 학습일 app.*; 시작 막음은 `aiNeededLesson` 이고 상한일 때만(읽기 · 쓰기 1~3 · 둘째 세션은 시작됨 — 통합 safety-cap) · 안내 '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요' + '홈' 하나 · 도중에 닿으면 세션 진행 · 시도 없음.
4. **값 3 checkGuided** — 같은 시도 id 는 저장 결과 그대로(AI 두 번 안 부름) · 점수 = 맞음 문장 수 ÷ 문장 수 · 실패는 시도 `failed` · `{ ok: false, reason: "skipped" }`(확인 없이 넘어감 · 점수 null) · safety_cap 은 시도 없이 `ai_resting` · 보기 섞기 차례가 시도 id 로 고정 · 통합 writing-check 셋이 이것을 보나.
5. **값 4 시도 종류 · aiNeededLesson** — 대기열이 `writing-guided` 끝 · thinkout · draft 끝 · rewrite 끝을 안 받음(`serverActionOnly`) · `aiNeededLesson` 표(guided · composition 첫 세션 참, rewrite 거짓, 말하기 presentation 참).
6. **값 6 · 7 화면** — `WaitHint`(즉시 점 셋 · 둘째 값 뒤 '확인하고 있어요' data-wait-line) · `writing-guided`(과제 '과제' · '예시' · 4단계 단어 상자 칩 → 첫 빈칸 · 5단계 입력란 autoComplete · autoCorrect · autoCapitalize off · spellCheck false · lang en · '다 썼어요' · 같은 화면 확인 — 칭찬 + 고칠 곳 색칠 → '색칠한 곳을 눌러 고쳐 봐요' → '알맞은 말을 골라요' → '잘 고쳤어요!' / '다시 골라 볼까요' → '다음' · hints · rubric 안 보임 · 내 문장 듣고 따라 말하기 '건너뛰기' · 마이크 없으면 건너뜀) · 되살리기(진행 시도 · 기기 입력).
7. **값 8 가짜 AI** — `startFakeAnthropicServer` · 준비 줄 `FAKE_AI_READY` · 규칙 `when.purpose`(응답 규격 제목으로 고름) · 응답은 시험 수업 내용으로(`writingCheckReply`) · `beforeEach(resetFakeAi)` · webServer 배열 DB → 가짜 AI → Next · Next env `ANTHROPIC_BASE_URL` · `ANTHROPIC_API_KEY` 시험 키(비밀값 아님) · 실제 API 를 부르는 길이 e2e 에 없는가 · 기존 e2e 전부 초록(CI).
8. **시험 이름** — 증명 표 글자 그대로(쓰기 4~5 통합 셋 + e2e · 1-가 안전 상한 통합 + e2e · AC-N6 · AC-N10), 숫자는 TEST_SETTINGS(ai.* · ui.wait_hint_seconds), 거짓 초록(가짜 응답이 실패 길로 가도 통과?) 없나 — 위험 7.
9. **제약** — 설계 숫자 안 박음(check:ids 새 줄 0) · 기술 값 상수(포트 54349 · 시험 키 · `DRAFT_AUTOSAVE_MS` 등 C72 꼴) · `check:deps`(AI 층은 서버 안) · 용어 · 문구 표 글자 그대로 · 아이 이름 · 비밀값 없음.

## 보고
`review-p11-5-code.md` — 판정 · 심각도 · 근거. 장부: 'AiOutcome 실패 갈래마다 화면 길'(ledger 36행 P11 몫) 닫힘 여부. SendMessage 한 줄.

덧(14:2x): CI 9차(run 39726243762)는 e2e 1건(`tests/e2e/writing.spec.ts` 447 — 시험 결함, 이름 가림 `{NAME}`) 빼고 전부 초록. impl-p11b 가 그 단언만 고쳤고(이름 가림까지 시험이 지킴) CI 10차(ci/p11-c2 b32a418)가 도는 중 — 검토 대상은 워크트리 p11 작업 트리(HEAD 726198f + 미커밋 변경, CI 가지 b32a418 과 같은 내용). 보고 `task-p11-report.md` 'CI 9차 → 10차' 줄(576)도 읽는다. 10차가 빨강이면 컨트롤러가 알린다.
