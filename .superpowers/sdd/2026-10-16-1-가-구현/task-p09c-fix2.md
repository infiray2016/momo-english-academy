# fix 브리프: P9c AI 흐름 · 계약 fix 2(implementer impl-p09a 이어 보기 · Opus · high, 2026-10-17 14:3x)

`review-p09c-2.md`(rev-p09b, Changes requested — C 0 · I 1 · M 2, 모두 fix 1 이 바꾼 줄에서 새로 생김)의 새 지적 N-1~N-3 과 범위 밖 관찰 하나(덤)를 고친다. 지난 I-1 · M-1~M-5 는 ADDRESSED 로 닫혔으니 건드리지 않는다. 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p09`(feature/1a-p09c-ai-flow, 커밋 없음). 커밋하지 않는다. 공용 파일(`package.json` · 설정 파일) 변경 없음. 실제 API 를 부르지 않는다. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. 이번이 P9c 의 fix 라운드 2(상한 3)다.

## 고칠 것(컨트롤러 판정)
1. **N-1(Important) — `tests/integration/ai-errors.test.ts:353` '설정 문제' 시험.** 설정 없음 사례가 지운 `ai.max_tokens.writing_check` 를 그 사례 바로 뒤에 `seedSettings` 로 TEST_SETTINGS 값으로 다시 넣는다(또는 설정 없음 사례를 시험 맨 끝으로 옮긴다 — 둘 중 하나, afterEach 되돌리기는 그대로). 뒤 사례 셋(조합 오류 · 꼴이 틀린 effort · 키 없음)이 다시 각자의 갈래를 실제로 지나게 한다. 갈래가 구분되는 단언(오류 이름 · 코드)을 꼴 변경 없이 넣을 수 있으면 넣고, 아니면 아래 망가뜨림 표로 증명한다.
   - 망가뜨림 확인(보고에 표): 복사본에서 `src/server/ai/run.ts` `isConfigError` 의 SettingMissingError · ComboError · SettingInvalidError · AiConfigError 를 **하나씩** 지운 판에서 이 시험이 **각각** 깨지는지. 넷 모두 깨져야 한다. 고치기 전 판에서는 넷 가운데 셋이 안 깨진다는 것(지금 상태)도 한 줄.
2. **N-2(Minor) — `scripts/ai-observe.ts:338~343` `chooseThinking`.** 묶음을 '받지 않음'으로 버리는 조건을 400(invalid_request)으로 좁힌다. 5xx · 한도 아닌 429 · 타임아웃 같은 일시 오류는 묶음을 버리지 않고 관찰표에 '일시 오류 n회'로 따로 센다(지연 · 위반 통계에서는 뺀다). 위험 11 의 adaptive 고르기 규칙 문장(관찰표 머리 · 명령 도움말)이 있으면 같이 맞춘다.
3. **N-3(Minor) — `ai-store.test.ts` 의 `dailyUsage` 시험(327~333 근처).** `profileId: null` 사례 한 줄: 호출 수 0 · 집 비용 합은 프로필 있을 때와 같음. SQL 을 `IS NOT DISTINCT FROM` 꼴로 바꾼 복사본에서 깨지는지 한 번.
4. **덤(범위 밖 관찰 2, H4 전에 필요) — `scripts/ai-contract.ts:702~735` `sendCase`.** 상태 없는 오류(타임아웃 · 연결)를 다시 던지지 않고 `status: 0` 의 실패 결과로 돌려준다(오류 이름만, 메시지 본문 · 요청 내용 없이). 관찰 명령은 그 사례를 N-2 의 '일시 오류'로 세고 다음 사례로 간다. 계약 명령은 그 사례를 '어긋남'으로 보고한다. 가짜 서버가 한 번 끊는 사례로 '관찰 실행 중 타임아웃 하나가 나도 산출물이 끝까지 써지는지'를 시험 또는 dry-run 재현으로 보인다.

## 지킬 것
- 아이 이름 · 비밀값 · 응답 본문을 로그 · 산출물에 적지 않는다. 경계 규칙(core-no-io · sdk-only-in-ai 등)은 `pnpm check:deps` 로 확인. 설계 숫자는 설정값에서.
- 고치기 전 실패를 먼저 본다(N-1 망가뜨림 넷, N-3 SQL 바꾼 판, 덤의 끊김 사례).
- 완료 판정: biome 0 · `pnpm build` · `pnpm test` · `pnpm test:int`(59 → 늘어난 수) · `pnpm check:deps` 0 · `pnpm spec:trace` missing-test 46 그대로 또는 줄어듦 · `pnpm check:bundle` 0 · `pnpm ai:contract --dry-run` 종료 0 · `pnpm ai:observe`(예상 비용만) 종료 0 · 비밀값 grep 바탕 둘뿐.

## 보고
`<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p09c-fix2-report.md`: 지적마다 ADDRESSED 와 파일:줄 · 시험 이름, 망가뜨림 표(N-1 넷 · N-3 · 덤), 바뀐 파일 목록, 다르게 한 것, 완료 판정 대조, 끝에 `git status --short`. 마지막 메시지는 상태(DONE · DONE_WITH_CONCERNS · BLOCKED)와 요지 5줄 안쪽을 컨트롤러에게 SendMessage 로.
