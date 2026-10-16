# fix 1 브리프: P9a AI 호출 바탕(implementer impl-p09a, 2026-10-17 00:5x)

검토 `review-p09a.md`(rev-p09a, Approved — C 0 · I 0 · M 7)의 Minor 일곱을 고친다. Minor 만이라 재검토 없이 컨트롤러가 확인한다(C52). 같은 워크트리(`.claude/worktrees/p09`, feature/1a-p09a-ai-client)에서, 시험을 먼저 더해 실패(또는 형 오류)를 본 뒤 고친다. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. 검토 보고의 파일:줄은 이 워크트리 기준이다. 검토가 받은 '다르게 한 것' 1~9 · '알릴 것' 1~5 는 그대로 둔다. 보고 8절 'P9c 에 넘길 메모' 일곱은 P9c 때 쓴다(지금 고치지 않는다).

| 번호 | 지적 | 고치는 법(검토 보고 3절 그대로) |
|---|---|---|
| M-1 | 본문 금지 칸(temperature · top_p · top_k · metadata)을 막는 `AttemptBody` 형에 시험이 없다 | `ai-client.test.ts` 같은 시험에 `// @ts-expect-error` 한 줄로 temperature 가 든 본문을 `AttemptBody` 에 넣어 본다(형이 풀리면 `pnpm build` 가 깨진다) |
| M-2 | 거절 홉 셋 사슬 시험이 없다 | `ai-outcome.test.ts` 에 iterations `[message(요청 모델, 출력 0), message(대체 A, 출력 0), fallback_message(대체 B)]` + fallback 블록 둘(cyber · bio)로 첫 홉은 빠지고 둘째 홉은 남는 것을 본다 |
| M-3 | `checkSettingsCombos` 의 `invalid-setting` 과 `loadPriceBook` 의 '한 모델 줄이 섞이면 모두 뺌'에 시험이 없다 | `combo.test.ts` 에 `ai.model.thinkout` 지운 값 · `ai.thinking.writing_check: "on"` 으로 invalid-setting; `ai-store.test.ts` 에 같은 모델의 다른 날짜 어긋난 줄을 더해 그 모델이 빠지는 것 |
| M-4 | `seedModelPrices` 가 셋째 인자를 안 넘겨도 적용일을 덮는다 | 인자를 선택으로 두고 `effectiveFrom ?? entry.effectiveFrom` |
| M-5 | `sameErrorCount` 의 LIKE `'same_error:%'` 에서 `_` 가 한 글자 와일드카드 | 이스케이프(`'same\_error:%'`) 또는 `left(error_code, 11) = 'same_error:'` |
| M-6 | `getAnthropicClient` 캐시 규칙(키 · VERCEL_ENV · ANTHROPIC_BASE_URL 바뀌면 새로)에 시험이 없다 | `vi.stubEnv` 로 같은 환경이면 같은 인스턴스 · `ANTHROPIC_BASE_URL` 바꾸면 다른 인스턴스인 단위 시험 하나 |
| M-7 | 시험이 넘기는 `env.ANTHROPIC_BASE_URL` 은 `clientOptionsOf` 가 읽지 않는다 | 시험의 그 칸을 지우고 `clientOptionsOf` 에 '주소는 VERCEL_ENV 가 없으면 SDK 가 process.env 에서 읽는다' 주석 |

끝나면 CI 순서 전부(`pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle`) 0 · 비밀값 grep 0 을 확인하고, 보고 `task-p09a-fix1-report.md`(워크트리 장부, Write 도구)에 지적마다 ADDRESSED · NOT ADDRESSED(까닭) · 파일:줄 · 시험 수(단위 198 · 통합 29 → 새 수)를 적는다. 마지막 메시지는 상태 + 요약 한 줄. 커밋 · 실제 API 호출 · 키 없음.
