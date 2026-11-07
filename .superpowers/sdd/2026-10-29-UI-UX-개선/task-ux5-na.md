# 브리프: UI · UX plan 묶음 5-나 — 소리를 들려주지 못함(말하기 세션 · 배치 · 점수 · 예비 문항)과 질문 답 인식 글(구현자 · Opus · high, 2026-10-30 02:1x 작성, 0-라 · 5-가 Approved 뒤 · 가르치고 라-3 전에 시작)

plan `intent/2026-10-29-UI-UX-개선/plan.md`(approved C185) 147~151줄 묶음 5-나 표 · 작업 순서 10 · 정한 것 2(화면 몫 N-19 는 5-나, N-20 은 6)를 구현한다. 근거는 spec 2판 `intent/2026-10-29-UI-UX-개선/spec.md` R-55(기술 오류 문항은 활동 점수의 분모 · 분자에서 빼고 다 빠지면 그 항 가중치 0) · R-56(배치: 기술 오류 문항은 판정에 넣지 않고 같은 단계 예비 문항, 예비도 못 들려주면 같은 자리에서 '다시 듣기') · R-57(한 번도 들려주지 못함 = 기술 오류, 학습 실패 아님) · 설계 4 N-19(그 자리에 안내 한 줄과 큰 '다시 듣기', 다시도 못 들려주면 무음 모드 줄(아이패드 사파리)과 작은 '다음', 저절로 건너뛰지 않음) · 설계 6 문구 표('소리가 안 나왔어요. 다시 들어 봐요' · 큰 '다시 듣기' · 작은 '다음') · AC-23a (5) · AC-23g, 묶음 0-라(음성 층: SpeakOutcome.heard 필수 칸 · `speakHeardOutcomeOf`(ended → heard, error 는 started 거짓 not_played · 참 no_end, cancelled no_end, unsupported not_played) · paced 모으기 — R-57 '한 번도 들려주지 못함'은 not_played 만; 화면은 heard 를 직접 보지 않고 이 함수를 쓴다) · 0-마 보고의 빈 곳(L-33: 말하기 질문 답 화면 QuestionAnswerActivity 가 인식 글을 그리지 않아 정본 4절 '인식 결과 표시' · AC-23f 와 어긋남 → 이 묶음 첫 항목) · 0-라 재검토가 남긴 paced 시험 둘(5-나 때) · 가르치고 마-1(skipped 는 들려주지 못함이 아님 — 단추 바로 밝힘). 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지.

## 범위
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/components/session/speaking.tsx`(질문 답 활동) | 수정 | **첫 항목(L-33)**: 질문 답 활동이 인식 글을 따라 말하기와 같은 꼴 · 같은 표지(data-heard)로 그리고 다음 문항까지 남긴다(정본 4절 인식 결과 표시). 가르치고 라-3 이 AI 질문 화면을 다시 만들 때 같은 줄 · 표지를 지키게 주석 한 줄 |
| `src/components/session/sound-retry.tsx`(제안) | 신규 | '소리가 안 나왔어요. 다시 들어 봐요' + 큰 '다시 듣기', 다시도 못 들려주면 무음 모드 줄(아이패드 사파리, 설계 6 표 글 그대로) + 작은 '다음'. 저절로 건너뛰지 않는다. 순수 함수(제안 `soundRetryStepOf`): 결과(speakHeardOutcomeOf) · 다시 듣기 횟수 → 보일 것 |
| `src/components/session/speaking.tsx` · `src/components/answer/repeat.tsx` | 수정 | 듣기 이해 문항 · 따라 말하기 본보기 · 배치 따라 말하기에서 들려준 결과가 not_played 면 sound-retry(no_end 는 들려준 것으로 보되 표시 — 기록만, 안내 없음; skipped 는 해당 없음) |
| `src/core/session/attempt.ts` · `src/core/scoring/*` | 수정 | 시도 선택 칸 `techError: "speak_fail"`(가르치고 나 가 판 2 에 자리를 비워 둠 — 그 이름 그대로, 한 번도 못 들려준 채 받은 답). 그 문항은 활동 점수의 분모 · 분자에서 빼고, 다 빠지면 그 항 가중치 0(R-55) |
| `src/core/placement/adaptive.ts` · `src/server/placement/*` · `placement-flow.tsx` | 수정 | 기술 오류 문항은 판정에 넣지 않고 같은 단계 예비 문항, 예비도 못 들려주면 같은 자리에서 '다시 듣기'(R-56) |
| `tests/unit/sound-retry.test.ts`(제안) · `score.test.ts` · `placement.test.ts` · `speech-paced.test.ts`(0-라 재검토가 권한 둘) · e2e `speech-feedback.spec.ts` · `placement.spec.ts` · `required-recovery.spec.ts`(N-19 자리) · `required-utterance.spec.ts`(질문 답 인식 글 — 0-마 가 써 둔 시험이 통과하게) | 신규 · 수정 | AC-23a (5) · N-19 · AC-23f 질문 답 갈래. e2e 는 정적 |

## 지키는 것
문구는 설계 6 표 그대로(새 문구 금지). 설계 숫자는 설정 키(다시 듣기 횟수 상한 같은 것이 필요하면 12절에 없는 새 키를 만들지 말고 보고에 '정할 것'으로). 가르치고 묶음 다 가 바꾼 attempt.ts(판정 · 공용 짝 채점)와 라-3 이 만들 AI 질문 화면과 겹치니, attempt.ts 는 techError 칸과 점수 셈 자리만 고치고 판정 함수는 손대지 않는다. 회화 파일(묶음 6 몫 N-20)은 손대지 않는다. 녹음 없음. 커밋하지 않는다.

## 관문 · 보고
TDD. 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드) · `pnpm spec:trace --fail-on unknown-ac`. 보고 `task-ux5-na-report.md`(50줄 안): 바뀐 파일 · 순수 함수 · 점수 · 배치 규칙 적용 자리 · 시험 · 관문 · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.
