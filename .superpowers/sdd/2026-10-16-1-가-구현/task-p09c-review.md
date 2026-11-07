# 검토 브리프: P9c AI 흐름 · 계약(code-reviewer rev-p09b 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-17 06:2x)

P9c(plan-p09c) 구현의 전체 검토다. 설계 준수(빠진 것 · 넘친 것 · 잘못 이해한 것)와 품질(Critical · Important · Minor, 근거 — 파일:줄 · 정본 절 · 재현)을 판정한다. 저장소 · 워크트리 파일을 고치지 않는다. 보고 파일 하나만. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴, 실제 API 없음(키 없음 — 두 명령은 dry-run · 키 없는 종료 2 · `--yes` 없는 종료 0 만).

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p09`(브랜치 feature/1a-p09c-ai-flow, 바탕 P9b 6213662, 커밋 없음). 새 파일: `src/core/ai/cost-alert.ts` · `src/server/seed-lists.ts` · `src/server/ai/run.ts` · `src/server/ai/index.ts` · `scripts/ai-contract.ts` · `scripts/ai-observe.ts` · `tests/unit/cost-alert.test.ts` · `tests/integration/{ai-calls,ai-errors,safety-cap}.test.ts` · `tests/contract/ai-schemas.test.ts` · 자료 `tests/fixtures/ai/samples/*.json`(29) · `recorded/.gitkeep`. 수정: `src/core/seed/structure.ts`(AI_ATTEMPTS_MAX · AI_WAIT_TIMEOUT_MULTIPLE), 공용 변경 둘 `package.json`(ai:contract · ai:observe) · `next.config.ts`(outputFileTracingIncludes).
- 구현 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p09c-report.md`(DONE_WITH_CONCERNS — 바뀐 파일 · 시험 수 · 작업 7 (가) 출력 · (나) 빌드 추적 · 다르게 한 것 1~9 · 검토 메모 반영 표 · 남긴 것 · 알릴 것 1~5). 브리프 `task-p09c.md`.
- 기준: `intent/2026-10-15-모모-잉글리시-아카데미/plan-p09c-AI-흐름-계약.md`(값 1~8 · 작업 1~7 · 위험 1~11 · 정할 것 가~자 → 판정은 plan-p09a '컨트롤러 결정' · 13절 C63 · 증명 표), 정본 6.1 · 6.6(05) · 6.4 끝 문단(06) · 8절 상황 표(07) · 9절 AI 계약 · 관찰 · 10절(08) · 12절 ai.* · talk.safety_* · app.*(09) · AC-8a · 8b · 8c · 8d · 8n · N2(11) · 13절 C17 · C21 · C28 · C46 · C48 · C50 (2) · C63, P9a · P9b 코드(같은 워크트리), review-p09a 8절 · review-p09b 6절 · review-p09b-2 4절의 P9c 메모(반영 표와 맞대기).
- 컨트롤러 재확인(06:2x, 워크트리): biome 0 · build · 단위 252 + todo 6 · 통합 57 · check:deps 0(56 모듈) · spec-trace missing-test 46 · bundle 0 · 비밀값은 바탕의 check-bundle 둘뿐 · 공용 변경 둘 글자 그대로 · `pnpm ai:contract --dry-run` 사례 15 종료 0 · `pnpm ai:observe` 예상 비용 약 3.24달러만 종료 0.

## 볼 것
1. **흐름(값 4 차례 1~10)과 행 규칙** — 시도 하나 = ai_calls 행 하나, 상태는 그 시도에서 본 것(success · validation_failed · 실패 갈래 · refusal · safety_cap), 두 시도 기다림 ≤ 타임아웃 × 2(deadline · MIN_RETRY_MS 1초 — 알릴 것 3), 거절은 다시 요청 안 함(C63 (2)), 안전 상한 막음은 행 하나(토큰 0 · 비용 0)와 호출 수에서 뺌, 다시 보내기는 retryConnection + REALTIME_PURPOSES 만(첨삭은 안 함), same_error 는 down_after_failures 때 createAlertOnce(call_config_check, once day). 설정 없음 · ZodError · ComboError · 키 없음 · 시드 목록 missing/invalid → `config`(행 없음, 값 · 아이 글 안 남김). RangeError(턴 번호 · 목적 불일치 · ctx.level ≠ input.level)는 던짐(행 없음).
2. **정규화 · 출력 검사 차례** — answerTextOf → JSON.parse → prepareAnswer → wireSchema.safeParse → validate → normalize(엄격 통과도) → checkOutputFields(sentenceMaxWords) → applyChecks → historyEntry; changed → validation_failed, fatal → output_blocked. 둘째 시도 전송 실패 때 첫 시도 값으로 안 돌아감(다르게 한 것 5 — plan 값 4 의 7 · 9 글자대로인지 판정).
3. **판정 함수(값 2)** — preCallGate(≥) · dueCostAlerts(기준 키 꼴 · 배수 · 콘솔 근접, 다르게 한 것 8) · talkSafetyOf · monthKeyOf(한국 달력 달, 1일 0시 30분은 새 달 — C63 (1)). 마이크로달러 정수.
4. **시드 목록(값 3)** — (root, name) 캐시, 실패는 캐시 안 함, 메시지에 내용 없음, P4a 규격으로 검증, server-only.
5. **공개 함수 넷(값 5)** — AiOutcome · AiFailureReason 형(P11 계약) · 결과 형을 run.ts 에 두고 재수출(다르게 한 것 1, 순환 회피) · thinkoutTurn 이 allowedWords 를 vocab 에서 채움(다르게 한 것 4 — 입력 칸은 선택) · ctx.sessionId · 접근 확인 없음(부르는 서버 액션 몫).
6. **프로필 없는 호출의 nil uuid(다르게 한 것 2 · 알릴 것 2)** — P9a store `dailyUsage(profileId: string)` 형을 `string | null` 로 넓히는 고침을 P9c fix 에 넣을지(P9a 파일 수정 — 한 줄) 판정한다.
7. **두 명령(값 6 · 7)** — 순수 함수와 직접 실행의 분리(P4c 꼴), `src/server` 안 가져옴, .env.local 은 loadEnvFile 만 · 키 출력 없음 · 녹화 머리글 셋만 · 사례 표 15(talk_config 둘 포함) · models 대조(두 번 묻기 · 확인 못 함) · 관찰 요약 p50 · p95 · p99 · recommendMaxTokens(C21) · chooseThinking(정할 것 사) · 산출물 경로 · 'H4 첫 실호출' 표 머리. 실제 호출 길은 코드 읽기로만(알릴 것 1).
8. **시험** — 증명 표의 시험 이름 글자 그대로(AC-8a · 8b · 8c · 8d · 8n · N2, spec-trace 46), 표 밖 시험 다섯의 가치, 표본 29 꼴(값 8), 흐름 시험이 갈림 여섯을 실제로 가르는지(구현자가 망가뜨려 확인했다고 함 — 하나쯤 재현), 통합 시험이 시험 DB 설정 행을 작은 값으로 넣어 '설정값을 읽는 것'을 보이는지(AC-8d).
9. **경계 · 규칙** — core-no-io · sdk-only-in-ai · db-only-from-server · server-only · 시각 한 시계 · SQL now() 없음 · 비밀값 · 아이 이름 없음(로그 · 오류 · 경고 — 요청 번호 · 목적 · 모델 · 분류 · 단가 없음 여부만, 알릴 것 4).
10. **열린 장부 판정** — `ledger-open.md` 의 P9 관련 행('생각 끔 + 구조화 출력 400' → P9c talk_config 사례가 H4 뒤 증명, P9c 메모 행들, opus-4-8 'none')을 닫힘 · 아직 열림으로.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p09c.md`(메인 저장소): 1 설계 준수(plan 값 · 정본 절마다) · 2 잘한 점 · 3 지적(심각도 · 근거 · 권하는 고침) · 4 다르게 한 것 1~9 판정 · 5 알릴 것 1~5 판정 · 6 증명 표 행마다 시험 · 7 열린 장부 판정 · 8 P11 · 1-나 · P6 에 넘길 메모. 마지막 메시지는 판정(Approved · Changes requested)과 요지 5줄 안쪽.
