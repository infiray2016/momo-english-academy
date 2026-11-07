# 묶음 2 — 턴 끝 처리 · 실시간 검사(core 순수 모듈 셋 · lesson-turn.ts · closing.ts)

브리프: 컨트롤러 · 2026-11-07 08:0x · 구현자 Opus high → code-reviewer Opus xhigh → fix(전체 루프). 시작 조건: 묶음 1 의 구현자 관문 통과(검토와 겹쳐도 됨).

## 맥락(열 줄 안)
- 닿는 결정: 13절 C207(신호 말은 앱이 시드 목록에서) · C209 '나' · C210(기술 오류는 앱 판단, AI 에 안 보냄) · C211 (4)(기술 오류 책임 구분) · (1)(지어낸 경험 금지 — 실시간 검사) · C125 · C194 (1) · C204 (5). 요청자 최종 목표 '실제 선생님과 영어로 이야기한다고 느끼는 것'.
- plan `intent/2026-11-06-회화-AI-몫-넓힘/plan.md`(approved) 바뀌는 파일 표 2 행(60~67줄, 사본 `_rows-2.txt`), 정한 것 6(신호 말 저장 안 함 · move 로 셈 · 흘림 줄 `{t:"add", kind:"cue", en, ko?}` 뜻 줄 뒤 · 소리 줄 앞 · log.ts 가 뺌) · 7(새 규칙은 core 순수 모듈 셋 `src/core/conversation/situation.ts` · `cue-line.ts` · `made-up.ts` — 서버와 대본 도구가 같이 부름) · 8(축약형 펼치기는 `src/core/seed/text.ts` 표 내보내기, `src/core/speech/*` 는 건드리지 않음), 작업 순서 9번, 위험 4 · 6 · 8.
- 넘겨받은 것: 묶음 1 의 계획 칸(returnNow · greetingFallback · appAsked.scene · talkCallTurnOf feelingWords 인자 — 보고 `task-1-report.md`), 0-나 의 목록 읽기 함수 넷(`src/server/seed-lists.ts`, `task-0na-report.md`), 3-(가)의 검사 상수 · 목록 꼴(`task-3a-report.md`), 0-가 의 설정 키.
- spec 판 4 설계 1(자리별 몫 — 상황 차례: greeting_end · together · easy · close · nospeech, 첫 걸림은 상황 줄로 바꿈) · 2(끝인사) · 6(신호 말) · 8(지표의 '기술 오류 자리') · AC-1 (가)(나)(라)(마) · AC-2 (나 서버) · AC-3 (라) · AC-5 (나 서버) · AC-6 (가). 정본 02-2:198 · 208 · 212 · 06:221.
- 손대지 않는 것: `talk-frame.tsx` · `tori.tsx` · `child-turn.tsx` · `talk-observe.ts`(묶음 5) · `src/core/speech/*` · 카드 · 목록 내용(3-다) · talk-lesson.ts 고정부(묶음 1).

## 할 것(plan 2 행 그대로)
- `src/core/conversation/situation.ts` 신규: situationPlaceOf(계획 · 토막 → greeting_end · together · easy · close · nospeech · null) · 상황 차례 검사(어휘 범위 · 답 글 · 금지 구 · 지어낸 경험 꼴) · 걸리면 시드 상황 줄로 바꾸는 순수 함수.
- `src/core/conversation/cue-line.ts` · `made-up.ts` 신규: CUE_PHRASES(lesson-turn.ts 에서 옮기고 isSoundCue 는 다시 내보냄) · 신호 말 고르기(자리 × 구간 × 긴 · 짧은 꼴, 지난 move 로 몇 번째인지 셈) · 지어낸 경험 꼴 검사(정규화한 구, 낱말 경계).
- `src/core/conversation/question-check.ts` · `src/core/seed/text.ts`: 범위 밖 낱말 셈(offbandWordsIn)을 허용 낱말과 함께 내보냄 / 축약형 표 · 펼치기 함수 내보냄.
- `src/server/conversation/lesson-turn.ts` 문장 문(createLessonSentenceFlow): 1~3 AI 신호 말은 늘 지움(까닭 "cue") · 상황 차례 검사(첫 걸림은 상황 줄로, 둘째는 plan 행대로) · 신호 말 흘림 줄 붙이기 · 기술 오류 자리는 AI 에 보내지 않음.
- `src/server/conversation/closing.ts` · `src/core/conversation/log.ts`: 1~3 끝인사가 지어낸 경험 꼴에 걸리면 카드 끝인사(지금 끝인사 걸림 길) / liveTeacherEntryOf 가 cue 줄을 뺌.
- 시험: `tests/unit/talk-situation.test.ts` · `talk-cue-line.test.ts` · `talk-made-up.test.ts` 신규(AC-1 (가)(나)(마) · AC-6 (가) · AC-3 (라)) · `tests/integration/talk-ai-scope.test.ts` · `talk-fixture.ts`(가짜 클라이언트로 AC-1 (가)(라)(마) · AC-2 (나) · … — CI 에서만 돎, 보고에 '안 돌림') · 옛 시험(talk-lesson-turn · talk-prompt-fix1 · fix2 문장 문 단언 줄 · talk-lesson-stream …) 줄 고침.
- 완료 조건: 관문 0(lint · tsc · 단위) · 통합 시험은 CI 몫(보고에 '안 돌림') · 호출 수 불변(AI 를 더 부르지 않음).

## 지킬 것
워크트리 · 서브셸 명령 · 스크래치패드 `ai-scope-2-*.txt` · BLOCKED 규칙(plan 정한 것 10) · 커밋 금지 · 숫자는 설정값. 보고: `task-2-report.md`. 저에게는 요지 세 줄.
