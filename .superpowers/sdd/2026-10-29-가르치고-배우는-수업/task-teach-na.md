# 브리프: 가르치고 배우는 수업 plan 묶음 나 — 여섯 자리 활동 차례 · 시도 꼴 판 2 · 짝 고정 번호 · 이어 하기(구현자 · Opus · high, 2026-10-30 01:0x 작성, UI · UX 0-다 검토 Approved 뒤 시작)

plan `intent/2026-10-29-가르치고-배우는-수업/plan.md`(approved C186) 103~115줄 '나 · 활동 차례 · 시도 꼴' 표, 정한 것 1(teach 칸이 있는 수업에서만 여섯 자리) · 2(시도 꼴 이름) · 3(짝 활동 고정 번호 · sparesToShow) · 4(미리보기 활동 번호 previewActivityNoOf · kind "preview" 질의) · 9(근거 칸은 평가 plan 몫 — 시도 꼴에 사실만 남김), '이름 · 설정값 · 문구' 절의 시도 꼴 판 2 표(53~76줄)를 구현한다. 근거는 spec 3판 설계 1(여섯 자리) · 2 · 3(짝 — lesson.spares_per_session.<영역> 상한 · 영역 차례 · U 문항 뺌) · 9(시도 꼴 · 이어 하기) · AC-2a · 1b · 2c, 정본 3.3(C184 반영 뒤). 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(커밋 전 변경 위 — UI · UX 묶음 0-다 가 `src/server/session/index.ts` · `result.ts` 의 met 이름을 바꿨으니 그 위에 고친다). 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지. 통합 · e2e 는 못 돌린다(정적으로 작성).

## 할 것(plan 나 표 그대로)
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/session/preview.ts` | 수정 | Activity 에 today · model · together · spare 를 더하고, teach 가 있는 수업이면 여섯 자리 차례(오늘 배울 것 → 새 단어 · 본보기 → 같이 해 보기 → 혼자 해 보기 → 짝(모두, 영역 차례로 고정 번호) → 되짚기는 결과 몫), teach 가 없으면 지금 차례. `previewActivityNoOf`(활동 목록에서 preview 번호) |
| `src/core/session/spares.ts`(제안) | 신규 | `sparesToShow`: 혼자 첫 시도 결과 · 상한(lesson.spares_per_session.<영역>, 설정값) · U 문항(건너뜀 · 'AI 쉬는 중' · 소리 없음) 뺌으로 낼 짝을 정한다. 영역 차례(말하기 질문 → 듣기 → 문장 → 낱말, 읽기 · 쓰기는 문항 차례). 내지 않은 짝 번호는 끝난 것으로 본다. 기기와 서버가 같은 함수를 쓰고 서버 값이 정본 |
| `src/core/session/attempt.ts` | 수정 | INPUT_VERSION 2(판 1 시도도 그대로 읽음) · 새 꼴(today · model · together · spare(base 꼴 + slot "spare") · 혼자 문항의 선택 칸 aid · story · judge · techError 자리는 비워 둠(다 · 라 · 바 가 채움)) · inputFitsActivity(spare 의 base) · resumePointOf 가 내지 않은 짝을 건너뜀 · 같이 해 보기와 짝의 결과(점수 null, 단어별 정오는 짝만, 3.7 · 설계 8 '점수와 셈') |
| `src/core/speaking/judge.ts` | 수정 | englishSentencesOf 가 말하기 같이 해 보기를 센다(짝은 base 종류라 이미 셈) |
| `src/server/session/index.ts` · `src/server/session/result.ts` | 수정 | 활동 차례에 teach 를 넘김, PREVIEW_ACTIVITY 를 previewActivityNoOf 와 kind "preview" 질의로(정한 것 4 — 옛 세션 1번 · 새 세션 2번이 섞임), 짝 시도는 서버가 다시 고른 짝만 받음, 끝내기가 내지 않은 짝을 끝난 것으로 셈. 0-다 가 바꾼 met 이름은 그대로 |
| `tests/unit/session-preview.test.ts` · `session-attempt.test.ts` · `session-input.test.ts` · `session-spares.test.ts`(제안) · `tests/integration/session-flow.test.ts` · `tests/fixtures/seed/builders.ts` | 수정 · 신규 | AC-2a(teach 수업 차례 · 짝 번호 고정 · teach 없는 수업은 지금 차례) · AC-1b(빈 목록 · 읽기 둘 틀림 → 그 둘 · 말하기 섞어 여섯 틀림 → 질문 → 듣기 → 문장 → 낱말 앞 넷 · U 문항 뺌) · AC-2c(짝 활동 중 닫고 열면 같은 짝, 서버가 다시 고른 짝이 기기와 같음) · 판 1 시도 읽기 · teach 견본(3단계 정규 시드 셋을 읽어 만듦) |

## 지키는 것
- 화면 · 채점 · 판정(묶음 다 · 라)은 이 묶음 밖이다. 같이 해 보기 · 짝의 채점은 다 가 하므로 여기서는 시도 꼴 · 차례 · 결과 셈 자리만 둔다(채점 함수는 지금 것을 부르되 짝 · 같이 해 보기의 점수는 null).
- 설계 숫자 코드 금지(상한 · 활동 번호 상한은 설정 키 · 기존 상수). 단계 숫자로 갈래를 가르지 않는다(teach 칸 유무로, 정한 것 1). 식별자 영어. 아이 화면 문구 없음(이 묶음은 화면이 없다).
- 다른 구현자가 같은 시각에 `src/core/seed/**`(묶음 타)와 음성 층(마-1)을 고친다. 그 파일은 손대지 않는다. 커밋하지 않는다.

## 관문 · 보고
TDD. 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드 · design-number 기준 49) · `pnpm spec:trace --fail-on unknown-ac`(시험 이름은 정본 15절 번호 — C184 반영 보고의 대응표가 있으면 그것, 없으면 보고에 델타 번호를 적고 차 에서 바꿈). 보고 `task-teach-na-report.md`(50줄 안): 바뀐 파일(계획과 다른 것 표시) · 새 순수 함수 · 시도 꼴 판 2 의 실제 꼴(이름 표와 다른 곳) · 시험 · 관문 · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.
