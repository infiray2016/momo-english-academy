# 재검토 브리프: P7a 적재 · 판 규칙 fix 1(code-reviewer rev-p07a 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-17 14:3x)

범위 한정 재검토다. `review-p07a.md` 의 I-1 · M-1~M-6 과 덤(`--areas` 공백)이 fix 1 에서 어떻게 처리됐는지 ADDRESSED · NOT ADDRESSED 로 가른다. 새 지적은 fix 1 이 바꾼 줄에서 생긴 것만 받는다. 저장소 · 워크트리 파일을 고치지 않는다(복사본 · 스크래치패드 재현은 된다). 보고 파일 하나만. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴, 실제 DB 접속 없음(embedded-postgres 통합 시험은 된다).

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p07`(feature/1a-p07-seed-load, 바탕 01ff0a9, 커밋 없음). fix 1 이 바꾼 파일: `scripts/seed-load.ts` · `src/server/seed/load.ts` · `tests/integration/seed-load.test.ts` · `tests/integration/seed-version.test.ts`(구현자 보고 기준 — 실제 diff 는 `git -C <워크트리> status --short` 와 파일 수정 시각으로 확인).
- fix 1 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p07a-fix1-report.md`. fix 브리프 `task-p07a-fix1.md`(컨트롤러 판정 — M-2 는 DB 단가 행이 규격에 어긋나면 `price-row-invalid` 하나로 적재 전체 거부, 덤으로 `--areas` 공백 다듬기).
- 컨트롤러 재확인(14:3x, 워크트리): biome 0 · build · 단위 221 · 통합 54 + 1 건너뜀(51 → 54) · check:deps 0 · spec-trace missing-test 줄 수 그대로 · check-bundle 위반 0 · 비밀값 꼴 grep 없음 · 공용 변경 package.json `seed:load` 한 줄 그대로 · `pnpm seed:load --root /nonexistent-root` 종료 2 · 접속 문자열 출력 0 · 규격 파일 없는 뿌리 종료 2.

## 볼 것
1. I-1: 적재 중 DB 오류가 종료 2 와 오류 이름 · 코드 한 줄만 내고 칸 내용 · SQL · 질의 인자가 어디에도(표준 출력 · 오류 출력 · `--json`) 안 나오는지 — 지난 검토의 가짜 접속 재현을 다시 돌린다. 명령 진입 함수의 오류 받기 길도 같은지.
2. M-1: 접속 확인 실패 때 연 접속을 닫는지(끝나지 않는 프로세스 · 열린 핸들 없음).
3. M-2: DB 단가 행 위반 → `price-row-invalid` 하나 · 위반 줄에 모델 · 적용일만 · 조합 검사 건너뜀이 컨트롤러 판정과 맞는지, 건너뛴 사실이 출력에 보이는지(안 보이면 Minor).
4. M-3: 칸 종류 불일치가 칸 키만 담은 오류로 던져지는지(칸 내용 없음).
5. M-4: `kept <키>` · `orphan <키>` 줄(값 없이, 종류마다 20줄 넘으면 '… 외 n'), `--json` 꼴 그대로. **`loadSeedWithKeys` 를 더해 `loadSeed` 꼴을 지킨 선택**이 중복 · 두 길 유지 비용을 만들지 않는지 판정(받음 · 고쳐야 함).
6. M-5 · M-6: '다시 하기' 시험(3.0 끝낸 세션 → 다시 읽으면 3.1 열림)과 배치 문항 정답 열 시험(모든 행 × 칸 객체)이 실제로 그 규칙을 증명하는지 — 규칙을 망가뜨린 복사본에서 깨지는지 한 번씩.
7. 덤: `--areas` 공백 다듬기. 새 시험 넷이 고치기 전에 실패했다는 보고 문장의 신빙성(시험 내용으로 판단).
8. fix 1 이 바꾼 줄에서 새로 생긴 문제(경계 규칙 · 비밀값 · 로그 내용 · 트랜잭션 경계 · 자문 잠금 풀림). 열린 장부(`ledger-open.md`)의 P7 행(new-cell-in-open-group · dev-load 입력 · P7b 허용 목록 등) 가운데 이 fix 로 닫히는 것이 있으면 판정.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p07a-2.md`(메인 저장소): 판정(Approved · Changes requested) · 지적마다 ADDRESSED · NOT ADDRESSED 와 근거(파일:줄 · 재현 · 시험) · 새 지적(심각도 · 근거, fix 범위 안) · 다르게 한 것(`loadSeedWithKeys` · 조합 검사 건너뜀) 판정 · 열린 장부 행 판정. 마지막 메시지는 판정과 요지 5줄 안쪽을 컨트롤러에게 SendMessage 로.
