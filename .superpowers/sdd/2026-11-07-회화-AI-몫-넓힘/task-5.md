# 묶음 5 — 잇기 · e2e(대본 도구 사본 ↔ 서버 짝 시험 · 넓이 시험 · e2e 표본)

브리프: 컨트롤러 · 2026-11-07 (2 · 3 · 4-나 Approved 뒤) · 구현자 Opus high → code-reviewer Opus xhigh(전체 루프)

## 맥락(열 줄 안)
- 닿는 결정: 13절 C211 (5)(배포 전 행동 검증 · 대본 통과는 iPad 검증 전) · 장부 T-157 · T-163 (3)(대본 도구는 서버 턴 끝 처리의 사본 — 사본과 서버가 같은 답을 내야 함). 요청자 최종 목표 '실제 선생님과 영어로 이야기한다고 느끼는 것'.
- plan `intent/2026-11-06-회화-AI-몫-넓힘/plan.md` 바뀌는 파일 표 5 행(79~81줄, 사본 `_rows-5.txt`) · 정한 것 7(core 모듈 셋을 서버와 도구가 같이 부름) · 작업 순서 10번 · 위험 4 · 8. spec 판 4 AC-1 (나 넓이)(다) · AC-5 (나 e2e) · AC-N1.
- 넘겨받은 것: 묶음 2 보고 `task-2-report.md`(core 모듈 셋 · 문장 문 · 신호 말 흘림 줄 · 상황 차례 검사), 묶음 3 보고 `task-3c-report.md`(개정 5 카드 · 목록 넷 · allowed 절차), 4-나 보고 `task-4na-report.md`(지표), 묶음 1 보고 fix 2 절(열쇠 대조 · 계획 칸).
- 손대지 않는 것: 앱 규칙(core · server — 고칠 일이 나오면 그 묶음 fix 로 돌리고 보고에 적음) · 카드 · 목록 내용 · 화면 파일.

## 할 것(plan 5 행 그대로)
- `scripts/talk-observe.ts` 사본 문장 문 · settleTurn 에 묶음 2 의 core 함수(situation · cue-line · made-up · offbandWordsIn)를 잇기 · 새 목록 읽기 · feelingWords · 장면 여는 질문 힌트 · 둘째 인사 대신 줄.
- `tests/unit/talk-observe-parity.test.ts` 신규: 같은 응답 · 계획을 서버(settleLessonTurn · createLessonSentenceFlow)와 도구 사본에 넣어 같은 줄 · 같은 판정이 나오는 짝 시험(상황 차례 · 신호 말 · 지어낸 경험 · 범위 밖 낱말 · 둘째 인사 대신 줄 · 장면 질문 뜻).
- `tests/unit/talk-allowed-coverage.test.ts` 신규(넓이 시험): 정본 · spec 예 문장 · 상황 줄 · 신호 말 · 고정부 1~3 예가 허용 목록 + 1단계 범위로 모두 통과(걸린 낱말 목록을 보고에).
- `tests/e2e/talk-lesson.spec.ts` · `tests/e2e/talk.ts` · `tests/e2e/required-utterance.spec.ts`: 장면 여는 질문 표본 · 신호 말 · 상황 줄 · 요청자 번호(1번 · 1번)에 맞춘 기대 글(e2e 는 CI 에서만 돎 — 보고에 '안 돌림', 가짜 음성 고정 글 29개 파일 가운데 닿는 것은 위험 6 대로 최소로).
- 완료 조건: 관문 0(lint · tsc · 단위 전체) · 짝 시험 · 넓이 시험 0 · `pnpm talk:observe --level 3`(--yes 없이) 정상 · `pnpm build`(되면, 안 되면 CI 빌드로 갈음) · `pnpm check:ids` CI 인자 0 · `pnpm seed:validate` 0.

## 지킬 것
워크트리 · 서브셸 · 스크래치패드 `ai-scope-5-*.txt` · 커밋 금지 · 실호출 금지(`--yes` 는 컨트롤러). 보고 `task-5-report.md`(앱 규칙에서 고칠 일이 보이면 그 묶음 번호와 함께 적음). 저에게는 요지 세 줄.
