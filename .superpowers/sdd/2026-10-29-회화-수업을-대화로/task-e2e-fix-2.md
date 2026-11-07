# 브리프: e2e 첫 실행 고침 2 — 수업 칸 충돌 · 견본 · 단언(구현자 · Opus · high, 2026-11-05 22:1x)

## 맥락
- 첫 프리뷰 커밋의 CI e2e 첫 실행(42024152908) 198건 가운데 52 실패. 분석가 분류 `task-e2e-first-run-triage.md`(2절 묶음 표 · 5절 차례 · 6절 우려). 이 브리프는 묶음 **G · C · D · H · K · L · M** 과 우려 1(withHouseholdSetting 되돌림) · 우려 4(CI 실패 증거 올리기)를 맡는다. 실패 로그 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ci-3-e2e-clean.log`.
- 맡는 파일: `tests/e2e/lessons.ts` · `tests/e2e/db.ts` · `tests/e2e/teach.spec.ts` · `tests/e2e/teach-result.spec.ts` · `tests/e2e/speaking.spec.ts` · `tests/e2e/teacher-choice.spec.ts` · `tests/e2e/speech-feedback.spec.ts` · `tests/e2e/writing.spec.ts` · `tests/e2e/lesson-list.spec.ts` · `.github/workflows/ci.yml`(증거 올리기 단계만). 다른 구현자가 talk.ts · required-utterance · teacher-window · required-recovery 와 src 를 고친다 — 건드리지 않는다.

## 할 것(분류 보고 2절 '고칠 방향' 그대로)
1. **G(10) — 먼저.** `insertSampleLesson` 의 onConflictDoNothing 이 앞 파일이 넣은 같은 칸(영역 · 단계 · 단원 · 번호) 수업을 돌려줘 다른 내용으로 돈다. `lessons.ts` · `db.ts` 에 충돌 검사(같은 칸에 다른 내용이면 던짐)와 파일별 수업 칸 · 번호 표를 두고, 충돌 쌍 넷(first-run 읽기 3단계 복제 · resume 쓰기 3단계 견본 · 말하기 번호 92 · 93 — teach · teach-result · speaking · speech-feedback:655 · teacher-choice:469)의 번호 · 칸을 바꾼다. required-utterance 의 92 는 고침 1 담당이 바꾸니 번호표에 그 자리를 비워 두고 보고에 적는다. `teach.spec.ts` 선생님 줄 안내 describe 의 test.setTimeout 도 함께.
2. **C(3).** `speech-feedback.spec.ts` 184 · 253 · 314 의 5초 창이 인사 턴 확인 칸(talk.confirm_seconds 2초) + 끝 침묵(speech.end_silence_seconds.talk.1-3 3초) + 300ms 보다 짧다 — 시험 창을 설정값에서 셈해 넉넉히(또는 인사 턴이 아닌 대화 턴에서 재게).
3. **D(2).** `speech-feedback.spec.ts` 267~268 · 385~386 이 짧은 준비 낱말 둘을 요구하나 견본은 하나(DB talk.prep_words 1) — 시험 안에서 prep 둘인 카드를 만들어 넣고 숫자는 DB 값을 읽게.
4. **H(3).** `writing.spec.ts` 425 · 785 · 978 의 글 찾기를 활동 안으로 좁힘(`page.locator("[data-activity]").getByText(…, { exact: true })`).
5. **K(1).** `lesson-list.spec.ts` 631~634 높이 견줌을 1px 안 허용으로.
6. **L(1) · M(1).** `teacher-choice.spec.ts` 278 초상 src 를 경로 끝으로 견줌, 399~405 홈 회화 카드의 '단원 3' 단언을 회화 수업 목록 위 띠의 지금 단계 · 단원으로.
7. **우려 1.** `db.ts` 97 withHouseholdSetting 의 되돌림이 시험 제한 시간 초과 뒤 CONNECTION_ENDED 로 실패해 값 12 가 남았다 — 되돌림을 afterAll 의 연결 닫기보다 먼저 보장하거나 연결을 따로 열어 되돌리게.
8. **우려 4.** `.github/workflows/ci.yml` e2e 작업에 실패 때 `test-results/**/error-context.md` 와 trace 를 올리는 단계(if: failure(), 분 비용 몇 초).

## 지키는 것
- 코드는 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(HEAD ed5d845 위 미커밋 없음). 명령은 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸, 세션 cd 금지. e2e · 통합은 이 Mac 에서 못 돌린다(시험용 Postgres 안 뜸) — 정적으로 고치고 부르는 함수 · 표지 · 설정 키를 코드 줄로 대조해 보고에 적는다. 관문 biome ci · tsc · `vitest run --project unit` 0. 시험 파일은 있으면 Edit 로만. 커밋 · push 금지(컨트롤러). 개발 DB 쓰기 · 환경 파일 값 출력 금지. 다른 구현자가 같은 시각에 다른 파일을 고치므로 **아래 파일 밖은 건드리지 않는다**(필요하면 보고에 적는다). 긴 출력은 스크래치패드 파일로.

## 보고
`task-e2e-fix-2-report.md`: 묶음별 바꾼 줄 · 대조한 코드 줄, 수업 칸 · 번호표(최종), 관문. 답은 요지 다섯 줄 안.
