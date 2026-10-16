# 재검토 브리프: P9b AI 호출 넷 fix 1(code-reviewer rev-p09b 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-17 03:1x)

범위 한정 재검토다. `review-p09b.md` 의 I-1 · I-2 · I-3 · M-1~M-5 가 fix 1 에서 어떻게 처리됐는지 ADDRESSED · NOT ADDRESSED 로 가른다. 새 지적은 fix 1 이 바꾼 줄에서 생긴 것만 받는다. 저장소 · 워크트리 파일을 고치지 않는다. 보고 파일 하나만(Bash 로 써도 된다). 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴, 실제 API 없음.

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p09`(feature/1a-p09b-ai-calls, 커밋 없음). fix 1 이 바꾼 파일: `src/core/ai/calls/common.ts`(firstSentence) · `src/core/ai/mask.ts`(전화번호 경계 · BUILTIN_CONTACT_PATTERNS 꼴) · `src/core/ai/output-check.ts`(CheckField.checkLength · 앱 연락처 묶음) · `src/core/ai/calls/writing.ts` · `speaking.ts` · `thinkout.ts`(상수 끼움 · 빈 글 처리 · validate · assertTurn) · `tests/fixtures/ai/sample-inputs.ts`(주소 꼴) · `tests/unit/normalize.test.ts`(15 → 20) · `tests/unit/ai-request.test.ts`(6 → 7) · `tests/unit/mask.test.ts`(두 줄).
- fix 1 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p09b-fix1-report.md`(지적마다 판정 · 파일:줄 · 시험, 다르게 한 것 둘 — 연락처 정규식 `{ source, keepsPrefix }` 꼴 · 턴 검사 두 곳, 알릴 것 둘 — firstSentence 는 한글 든 첫 조각까지 · 빈 피드백 null 은 필수 칸 없음). fix 브리프 `task-p09b-fix1.md`(컨트롤러 판정).
- 컨트롤러 재확인(03:1x, 워크트리): biome 0 · build · 단위 234 · 통합 30 · check:deps 0 · spec-trace missing-test 52 · bundle 0 · 비밀값 0 · 공용 파일 변화 0.

## 볼 것
1. I-1: 검토 재현 세 문장이 한국어까지 남는지, 한글 없는 글은 첫 조각인지, 쓰이는 네 곳(쓰기 이유 · 질문 답 · 발표 · 확인 질문 답 피드백) 모두 새 함수를 지나는지. 알릴 것 1(영어 조각 둘 이상 앞서면 남김)을 받을지.
2. I-2: 되돌려 넣기가 전화번호에만 적용되고 전자 우편 · 시드 contact 는 `keepsPrefix: false` 로 예전과 같은지, 출력 검사(output-check)가 걸린 글로 2번 묶음을 쓰는지(걸린 글에 앞 글자가 섞이지 않는지), `1010-1234-5678 그대로` 유지, 두 새 사례 통과. 가린 수 `contacts` 셈이 맞는지.
3. I-3: `rules.lastTurn` 이 어디서 오는지(M-2 의 input.turn), 마지막 턴에 done 거짓 · 요약 빈 응답이 검증에 걸리고 보기 넷 → 셋으로 고친 시험 입력이 엄격 규격과 맞는지.
4. M-1: `calls/` 에 '1-2' · '1-4' · 'correct, partial or retry' 글자가 남지 않는지(grep), 끼워 넣은 상수 이름이 structure.ts 의 것과 같은지.
5. M-2: `assertTurn` 두 곳이 같은 조건인지, 던지는 오류가 P9c 가 '설정 문제'와 구별할 수 있는 꼴인지(CallSettingError 와 다른 오류여야 함 — 판정만).
6. M-3: 빈 바른 답 → 시드 바른 답, 빈 고칠 곳 · 교정 버림, 문법 지적 거른 뒤 자름, 빈 피드백 null — 넷이 시험에 있는지, AC-5d 둘째 문장(부분 · 다시에 바른 답 재생)과 맞는지. 알릴 것 2(엄격 규격 min 1 이 먼저 걸림)를 받을지.
7. M-4: 멱등 시험이 여섯 규격 + 생각 꺼내기 두 턴 꼴을 모두 지나는지, 비교가 깊은 같음인지.
8. M-5: `checkLength` 기본 참, 원문 두 곳만 거짓, 금지어 · 연락처는 원문에서도 걸리는지.
9. 다르게 한 것 둘을 받을지. 새 지적은 바뀐 줄에서만.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p09b-2.md`(메인 저장소 장부). 첫 줄 판정(Approved · Changes requested, C · I · M 수), 지적마다 ADDRESSED · NOT ADDRESSED(근거 파일:줄), 새 지적(있으면 심각도 · 근거), 알릴 것 둘 판정, P9c 메모가 더 생기면 끝에. 마지막 메시지는 판정 + 요지 세 줄.
