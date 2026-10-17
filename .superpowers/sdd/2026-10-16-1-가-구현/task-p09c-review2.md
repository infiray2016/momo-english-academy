# 재검토 브리프: P9c AI 흐름 · 계약 fix 1(code-reviewer rev-p09b 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-17 13:5x)

범위 한정 재검토다. `review-p09c.md` 의 I-1 · M-1~M-5 가 fix 1(+ 보충)에서 어떻게 처리됐는지 ADDRESSED · NOT ADDRESSED 로 가른다. 새 지적은 fix 1 이 바꾼 줄에서 생긴 것만 받는다. 저장소 · 워크트리 파일을 고치지 않는다. 보고 파일 하나만. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴, 실제 API 없음.

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p09`(feature/1a-p09c-ai-flow, 커밋 없음). fix 1 이 바꾼 파일: `scripts/ai-observe.ts`(withFormat 으로 형식 · 200 아닌 응답 '받지 않음' 묶음 세기 · 관찰표 줄) · `scripts/ai-contract.ts`(withFormat 내보냄 · 생각 꺼내기 done 멈춤 · 녹화는 보낸 턴까지) · `src/server/ai/run.ts`(둘째 시도 실패 때 lastPrepared 정규화 — 보충 뒤 조건은 `lastPrepared !== undefined` 하나, 거절만 예외 · NO_PROFILE_ID 삭제 · ctx.profileId 그대로) · `src/server/ai/store.ts`(P9a, `dailyUsage` profileId `string | null` 한 줄 + 주석) · 시험 `tests/integration/ai-errors.test.ts`(M-1 기대값 · 첫 시도부터 실패 사례 · 콘솔 한도 400 · 같은 오류 404 사례 · 설정 없음 사례 · afterEach 되돌리기) · `safety-cap.test.ts`(확인 호출 행에 안전 상한만큼 비용) · `tests/contract/ai-schemas.test.ts`(관찰 묶음 요청에 형식 · 제목 단언 · 계약 명령 실제 실행 길을 가짜로 — M-5).
- fix 1 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p09c-fix1-report.md`('보충' 절 포함 — 지적마다 판정 · 파일:줄 · 시험, 고치기 전 실패 넷 · 망가뜨림 확인 둘). fix 브리프 `task-p09c-fix1.md`(컨트롤러 판정 — M-1 은 13절 **C69**: 둘째 시도의 실패 종류와 무관하게 첫 응답 값을 정규화해 쓰고 거절만 실패, 행은 validation_failed + 그 실패 갈래).
- 컨트롤러 재확인(13:5x, 워크트리): biome 0 · build · 단위 255 + todo 6 · 통합 59 · check:deps 0 · spec-trace missing-test 46 · bundle 0 · 비밀값 바탕 둘뿐 · 공용 변경 둘 그대로 · `pnpm ai:contract --dry-run` 사례 15 종료 0 · `pnpm ai:observe` 예상 비용만 종료 0 · store.ts:25 · 120 `profileId: string | null` · run.ts 에 NO_PROFILE_ID 0건 · run.ts:432 조건 `lastPrepared !== undefined`.

## 볼 것
1. I-1: 관찰 요청에 `output_config.format` 이 계약 명령 · 앱 흐름과 같은 길로 붙는지(재현 — 지난 검토의 observe/contract 비교 스크립트), 계약 시험의 관찰 묶음 단언, 200 아닌 응답의 '받지 않음(400 n회)' 요약 · 관찰표 줄과 위험 11 의 adaptive 고르기 규칙 문장.
2. M-1(C69): 둘째 시도의 타임아웃 · 연결 · 서버 · 한도 · 콘솔 한도 400 · 같은 오류 404 모두에서 `ok: true · normalized: true` 와 행 둘(validation_failed · 그 갈래), 거절은 refusal 그대로, 첫 시도부터 실패면 실패. 느슨한 규격 정규화가 null 이면 실패로 떨어지는 길도 맞는지.
3. M-2: store 형 한 줄 · SQL 그대로(NULL 비교 → 호출 수 0 · 집 비용 합 유지) · 주석 · NO_PROFILE_ID 삭제 · 확인 호출 · 프로필 없는 호출의 하루 사용량 시험.
4. M-3: 확인 호출 행에 비용을 실어도 '그래도 나간다' — `ne(purpose, "probe")` 를 지우면 깨지는 시험인지(복사본에서 한 번).
5. M-4: 설정 없음(SettingMissingError) 사례, afterEach 되돌리기가 중간 실패에도 다음 시험에 설정을 남기지 않는지.
6. M-5: 계약 명령 생각 꺼내기가 done 턴에서 멈추고 녹화도 거기까지인지, 가짜 클라이언트로 실제 실행 길을 덮는 새 시험의 가치.
7. fix 1 이 바꾼 줄에서 새로 생긴 문제(경계 규칙 · 비밀값 · 아이 이름 · 로그 내용). 지난 8절 메모(P11 · 1-나 · P6)는 장부에 올렸으니 되풀이하지 않는다. 열린 장부 'dailyUsage 형 넓히기' 행은 닫힘으로 판정될지.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p09c-2.md`(메인 저장소): 판정(Approved · Changes requested) · 지적마다 ADDRESSED · NOT ADDRESSED 와 근거(파일:줄 · 재현 · 시험) · 새 지적(심각도 · 근거, fix 범위 안) · 다르게 한 것(보충 전 '장애' 좁힘은 보충으로 해소) 판정 · 열린 장부 행 판정. 마지막 메시지는 판정과 요지 5줄 안쪽.
