# 고침 브리프: 첫 프리뷰 CI 첫 실행 통합 시험 실패 셋(impl-talk-12 · Opus · high, 2026-11-05 20:5x)

## 맥락
- 첫 프리뷰 커밋 87b102d 를 push 하고 CI(workflow_dispatch, 실행 42019538895)를 돌렸다. checks 작업의 integration 단계에서 254건 가운데 3건 실패(251 통과), e2e-local 은 성공, e2e 는 둘째 실행(ded547b, 42022661408)이 띄워지며 취소됨. 로그: `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ci-1-clean.log`(실패 셋의 기대값 · 실제값 포함).
- 요청자 조건(T-117): 실패는 실제 원인을 분석해 수정 · 재검증, 알려진 미실행(이 Mac 에서 못 돌린 통합) 과 새 실패를 구분, 실행 안 한 시험을 통과로 치지 않음. 셋 다 이 Mac 에서 돌린 적 없는 통합 시험의 첫 실행 실패다. **시험을 통과시키려고 정본 규칙을 바꾸지 않는다** — 어느 쪽(시험 · src)이 정본과 어긋나는지 먼저 가린다.

## 실패 셋
1. **`tests/integration/seed-load.test.ts` 881줄 적재 명령 요약 꼴.** 기대 정규식 `SUMMARY` 에 '목표 채움 \d+' 토막이 없다. 실제 첫 줄: `seed-load: 미리 돌림 · 칸 넣음 462 · 건너뜀 0 · 목표 채움 0 · 낱말 넣음 280 고침 0 · …`. '목표 채움' 은 묶음 8 fix 1 의 적재기 규칙(T-87, unit_specs.goals 채움)으로 더한 토막이고 단위 시험은 맞췄으나 통합 시험 정규식을 빠뜨렸다. → 정규식에 `· 목표 채움 \d+` 를 더한다(--json 꼴 단언도 같은 자리가 있으면 함께).
2. **`tests/integration/speaking-eval.test.ts` 449줄 AC-22k.** '혼자 질문을 틀려 낸 짝'의 judge 칸이 기기 값 대신 서버 앱 판정으로 저장되는지 보는 시험. 기대 `{ by: "app", bundle: "meaning", communicative: true, final: "correct", meaning: "ok", expressionDone: false }`, 실제 `{ by: "app", final: "retry", meaning: "wrong_info", expressionDone: false }`(bundle · communicative 없음). 정본(`specs/11-요구사항과-수용-기준.md` AC-22k · `specs/02-2-세션과-단계표.md` 말하기 질문 답 평가 규칙)과 서버 판정 코드(`src/server/speaking/` · `src/core/speaking/`)를 대조해 **어느 쪽이 맞는지 판정**한다: 시험 견본의 답이 정본상 '맞음'이어야 하면 src 결함(고치고 근거), 견본 답이 정본상 '틀린 정보'면 시험 기대값 결함(견본 또는 기대값 고침). 판정 근거(정본 절 · 줄, 코드 줄)를 보고에 적는다.
3. **`tests/integration/talk-lesson-session.test.ts` AC-15j(묶음 12 fix 1 이 옮긴 시험).** `sessions` 넣기가 `sessions_one_in_progress_unique`(profile_id · area 에 진행 중 세션 하나) 위반. 시험이 앞 대화 세션을 끝내거나 중단하지 않고 같은 프로필 · 회화에 둘째 진행 중 세션을 넣는다. → 시험을 고친다(앞 세션을 중단 · 완료로 닫은 뒤 다음 세션을 넣거나, 같은 세션에서 턴을 이어 상한에 닿게). 시험의 뜻(상한 → AI 안 부름 · 카드 끝인사 · 중단 · 학습일 · 끝맺음 대기 · safety_alert_count 번째 부모 알림)은 그대로.

## 할 것
- 셋을 고치고, 통합은 이 Mac 에서 못 돌리니 정적으로 맞추되 부르는 함수 · 제약 · 설정 키를 코드 줄로 대조해 보고에 적는다. 관문 biome ci · tsc · 단위 0.
- 로그의 `[ai] writing_feedback: 설정 문제(SeedListError)` · `[ai] talk_turn: 설정 문제(SettingMissingError)` 줄이 그 시험들이 일부러 만든 경우인지(설정 문제 경로 시험) 확인해 한 줄 적는다.

## 하지 않을 것
- 정본 바꾸기. 셋 밖 파일. 커밋 · push(컨트롤러). 개발 DB 쓰기. 환경 파일 값 출력. 세션 cd 금지(서브셸 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )`). 시험 파일은 Edit 로만.

## 보고
`task-ci-first-run-fix.md`(본 저장소 sdd 폴더): 셋 각각 원인 · 판정(시험 결함 · src 결함) · 근거 · 고친 줄, 관문. 답은 요지 다섯 줄 안.
