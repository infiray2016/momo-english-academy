# 구현 브리프: e2e 실패 12건 고침(시험 쪽, 2026-11-06 09:5x, 가벼운 루프)

## 맥락
- 요청자 지시(11-06 08:5x): "E2E 역시 실패 · 보류 항목의 원인과 재검증 결과를 확인해야 합니다." 닿는 결정 C148 · C201 · C210(못 듣는 마이크 감지 — iOS WebKit 에서 audiostart 가 speech.deaf_audiostart_ms(200) 안에 오고 speech.deaf_silence_ms(1500) 동안 소리 · 결과 없으면 '마이크 안 잡힘'으로 끝나고 말소리 없음으로 세지 않음).
- CI 여덟째(72851d7, 42133252064): 통합 260/260, e2e 187 통과 · 12 실패(iPad WebKit 프로젝트 하나뿐). 분류 `task-e2e-webkit-triage.md`(ana-e2e-webkit): (가) 환경 1(teacher-window:492 가짜 발화 900ms 창), (다) 시험 결함 11(표본 선택자 3 · 인사 턴 셈 2 · 짧은 기다림 2 · 말소리 없는 듣기 2 · '막히면 눌러요' 1 · 끝맺음 호출 셈 1). 여덟째에서 teacher-window:492 와 talk-lesson:819(흔들림)는 지났지만 원인은 그대로이니 함께 고친다.
- **새 실패 1(여덟째):** `tests/e2e/talk-lesson.spec.ts:717` AC-15q — `[data-sound-listen="answer"]` 가 안 보임. 추정: 이 시험의 '인식 실패' 흉내가 audiostart 를 200ms 안에 올려 새 감지 규칙에 '마이크 안 잡힘'(deaf)으로 분류됐고(셈에 안 듦 · 받침 없음), 그래서 '못 들었어요' 회색 줄과 받침의 답 소리 단추가 안 생김. `tests/e2e/talk.ts` 의 webkitSilentRun 은 400ms 로 이미 옮겼는데 이 시험은 다른 흉내를 쓸 것이다. 고침: 건강한 마이크 꼴(audiostart ≥ 400ms)로 맞춘다. 단, '마이크 안 잡힘' 꼴을 따로 다루는 시험(새 안내 문구 · 셈 제외 · 세 번 뒤 건너뜀)이 없으면 하나 더한다(C210).
- 로그: `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ci-8-e2e-clean.log`(12건 오류 · 스택), 지난 로그 `ci-6-e2e-clean.log`, 실패 증거 `scratchpad/ci6-evidence/files`.

## 고칠 것
- 분류 (다) 11건과 (가) 1건, 새 1건 — 모두 시험 파일 쪽(`tests/e2e/*.spec.ts`, `tests/e2e/talk.ts` 같은 도우미). 앱 코드는 고치지 않는다. 분류 보고가 앱 결함이라 한 것은 U4-5 하나였고 이미 고쳐졌다. 고치다 앱 결함이 드러나면 고치지 말고 보고에 적는다.
- 각 건마다 원인 한 줄(분류 보고와 같으면 번호만)과 고친 방식(단언 · 기다림 · 표본 · 흉내 타이밍)을 보고에 표로.

## 지킬 것
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 이 Mac 은 e2e 를 못 돌리니 biome · tsc · 단위 관문만 0 으로 맞추고, 검증은 CI 몫이라고 적는다. 실호출 없음. 커밋 안 함.
- 보고 `task-e2e-fix-3-report.md`. 끝나면 요지 한 번만.
