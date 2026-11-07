# 재검토 브리프: P9c AI 흐름 · 계약 fix 2(code-reviewer rev-p09b 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-17 14:5x)

범위 한정 재검토다. `review-p09c-2.md` 의 N-1(Important) · N-2 · N-3(Minor) 과 범위 밖 관찰 2(덤 — sendCase 상태 없는 오류)가 fix 2 에서 어떻게 처리됐는지 ADDRESSED · NOT ADDRESSED 로 가른다. 새 지적은 fix 2 가 바꾼 줄에서 생긴 것만 받는다. 저장소 · 워크트리 파일을 고치지 않는다(복사본 · 스크래치패드 재현은 된다). 보고 파일 하나만. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴, 실제 API 없음. 이번이 P9c 의 fix 라운드 2(상한 3)다.

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p09`(feature/1a-p09c-ai-flow, 바탕 6213662, 커밋 없음). fix 2 가 바꾼 파일은 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p09c-fix2-report.md` 의 목록대로(ai-errors.test.ts · ai-observe.ts · ai-contract.ts · ai-store.test.ts 와 관찰 실행부 `runObserve` 추출 — 실제 diff 는 파일 수정 시각 · 보고로 확인). fix 브리프 `task-p09c-fix2.md`(컨트롤러 판정 — N-2 는 400 만 버리고 일시 오류는 따로 셈, 덤은 status 0 실패).
- 컨트롤러 재확인(14:5x, 워크트리): biome 0 · build · 단위 258 + todo 6 · 통합 59 · check:deps 위반 없음 · spec-trace missing-test 줄 수 그대로(46) · check-bundle 위반 0 · `sk-ant-` 는 바탕 번들 검사 둘뿐 · `pnpm ai:contract --dry-run` 종료 0 · `pnpm ai:observe`(--yes 없이 예상 비용만) 종료 0 · 공용 diff next.config.ts · package.json · structure.ts 그대로.

## 볼 것
1. N-1: 설정 없음 사례 뒤 지운 키 되돌림과 사례마다 서버 오류 기록의 오류 이름 단언. **망가뜨림 표를 재현한다** — `isConfigError` 네 갈래(SettingMissingError · ComboError · SettingInvalidError · AiConfigError)를 복사본에서 하나씩 지워 각각 깨지는지. 구현자는 '고치기 전엔 둘(ComboError · AiConfigError)만 안 깨졌다 — 꼴이 틀린 effort 가 설정 읽기 차례에서 앞서 SettingInvalidError 를 먼저 낸다'고 했다(브리프 · 지난 검토의 '셋'과 다름). 그 설명이 맞는지, 그리고 '꼴이 틀린 effort' 사례가 실제로 SettingInvalidError 갈래를 증명하는지 판정.
2. N-2: 묶음을 버리는 조건이 400 뿐인지, 5xx · 한도 아닌 429 · 응답 없음이 '일시 오류 n회'로 세어지고 지연 · 위반 통계 · 고르기에서 빠지는지. **'일시 오류' 열에 400 밖의 4xx(401 · 404 등)도 든다는 선택**을 판정 — 401(키) · 404(모델 이름)는 일시 오류가 아니라 설정 문제라 관찰표에서 따로 보여야 하지 않는지(Minor 면 고치는 법까지).
3. N-3: `profileId: null` 단언(호출 수 0 · 집 비용 합 같음)과 SQL 을 `IS NOT DISTINCT FROM` 으로 바꾼 판에서 깨지는지 한 번.
4. 덤: `sendCase` 가 타임아웃 · 연결 오류를 `status: 0` 실패로 돌려주고(오류 이름만, 본문 · 요청 내용 없음), 계약 명령은 어긋남으로 · 관찰 명령은 일시 오류로 세고 계속 가며 산출물 둘을 끝까지 쓰는지 — 가짜 클라이언트 끊김 시험이 실제 실행 길(`runObserve`)을 덮는지. **`runObserve` 로 실행부를 꺼낸 선택**이 명령의 동작(인자 · --yes · 예상 비용 출력)을 바꾸지 않았는지.
5. fix 2 가 바꾼 줄에서 새로 생긴 문제(경계 규칙 · 비밀값 · 아이 이름 · 로그 내용 · 시험이 실제 코드를 덮는지). 열린 장부 '생각 끔 + 구조화 출력 400' 행은 H4 뒤까지 열림 그대로다.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p09c-3.md`(메인 저장소): 판정(Approved · Changes requested) · 지적마다 ADDRESSED · NOT ADDRESSED 와 근거(파일:줄 · 재현 · 시험) · 새 지적(심각도 · 근거, fix 범위 안; Minor 는 고치는 법까지 — 컨트롤러가 직접 처리) · 다르게 한 것(일시 오류의 4xx · runObserve · '둘 vs 셋') 판정. 마지막 메시지는 판정과 요지 5줄 안쪽을 컨트롤러에게 SendMessage 로.
