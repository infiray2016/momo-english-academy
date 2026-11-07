# 브리프: e2e 첫 실행 고침 1 — 회화 도우미 · 회화 e2e(구현자 · Opus · high, 2026-11-05 22:1x)

## 맥락
- 첫 프리뷰 커밋의 CI e2e 첫 실행(42024152908) 198건 가운데 52 실패. 분석가 분류 `task-e2e-first-run-triage.md`(2절 묶음 표 · 3절 답 · 5절 차례 · 6절 우려 · 7절 결정). 이 브리프는 묶음 **A · B · E · F · N · flaky** 와 G 의 required-utterance 번호 92 바꿈을 맡는다(같은 파일이라 한 사람이).
- 컨트롤러 결정(7절): N 은 (가) C80 유지 — 시험 장면을 '상한 날에도 첨삭 온 쪽지를 누르면 둘째 세션이 열린다'로 바꾼다(UI · UX spec 표 한 줄은 컨트롤러 몫). 실패 로그 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ci-3-e2e-clean.log`.
- 맡는 파일: `tests/e2e/talk.ts` · `tests/e2e/required-utterance.spec.ts` · `tests/e2e/teacher-window.spec.ts` · `tests/e2e/required-recovery.spec.ts`. (talk-lesson.spec.ts 는 A 가 풀리면 다음 CI 에서 처음 화면을 지난다 — 이번엔 건드리지 않는다.)

## 할 것(분류 보고 2절의 '고칠 방향' 그대로, 근거 줄을 확인하며)
1. **A(18).** `talk.ts` 135줄 근처 talkHousehold 가 `seed.complete_through_level` 을 시험 단계까지 올리게(`lessons.ts` 107줄 atLevel 의 withHouseholdSetting 꼴과 같게 — talk 도 받게). 집 넣기 전에 올리고 끝나면 되돌린다.
2. **B(7).** `talk.ts` 381~393 greetingTalkLesson(1단계 '인사 → 대화' 견본)이 prep 만 지우는데 `talk.prep_mode.1-3` always 면 서버가 노리는 단어로 준비 쪽지를 붙인다(C33) — 견본에서 필수 질문 · 더 이야기할 거리 · 노리는 단어까지 비우거나(서버 규칙 코드 줄로 확인) 그 시험의 집 설정 prep_mode 를 바꿔 대화 첫 질문이 바로 뜨게. 시험의 뜻(인사 뒤 대화 턴 · 말풍선 측정)은 그대로.
3. **E(1).** `teacher-window.spec.ts` 620~629 준비 쪽지 따라 말하기 대본을 낱말만이 아니라 card.todayWords 의 그 낱말 modelLine('I see a <낱말>.' 꼴, builders.ts 2210~2212)으로.
4. **F(1).** `required-utterance.spec.ts` 174~208 sentAtOf 가 Resource Timing 시작 시각이라 붙잡은 요청(1.5초)을 늦게 잼 — 보낸 시각을 화면 쪽 표지(아이 말풍선이 처음 보인 표본 또는 route 처리기 안 기록)로. B 를 고친 뒤 :421 도 같은 문제에 걸리니 함께.
5. **N(1).** `required-recovery.spec.ts` 648~667 장면을 C80 대로(첨삭이 온 초고 + 상한 날 → 둘째 세션이 열림)로 바꾼다.
6. **flaky.** `required-recovery.spec.ts` 302 `orderBy(talkTurns.turnNo)` 에 둘째 정렬 열(recorded_at 또는 id).
7. **G 몫.** `required-utterance.spec.ts` 의 말하기 수업 번호 92 가 다른 파일과 겹침 — 고침 2 담당(impl-e2e-2)이 `lessons.ts` 에 넣는 충돌 검사와 번호표를 따르되, 이 파일의 번호만 겹치지 않는 값(보고 G 행 · lessons.ts 번호표 참고, impl-e2e-2 가 정한 표가 있으면 그 값)으로 바꾼다. 둘이 어긋나지 않게 보고에 쓴 번호를 적는다.

## 지키는 것
- 코드는 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(HEAD ed5d845 위 미커밋 없음). 명령은 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸, 세션 cd 금지. e2e · 통합은 이 Mac 에서 못 돌린다(시험용 Postgres 안 뜸) — 정적으로 고치고 부르는 함수 · 표지 · 설정 키를 코드 줄로 대조해 보고에 적는다. 관문 biome ci · tsc · `vitest run --project unit` 0. 시험 파일은 있으면 Edit 로만. 커밋 · push 금지(컨트롤러). 개발 DB 쓰기 · 환경 파일 값 출력 금지. 다른 구현자가 같은 시각에 다른 파일을 고치므로 **아래 파일 밖은 건드리지 않는다**(필요하면 보고에 적는다). 긴 출력은 스크래치패드 파일로.

## 보고
`task-e2e-fix-1-report.md`: 묶음별 바꾼 줄 · 대조한 코드 줄, 번호 92 → ?, 다음 CI 에서 새로 드러날 수 있는 것(A 뒤 talk-lesson 17건), 관문. 답은 요지 다섯 줄 안.
