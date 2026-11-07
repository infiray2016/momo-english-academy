# 코드 검토 브리프: P13d 묶음 검토 1 — d1 · d2 · d5(code-reviewer · Opus · xhigh, 2026-10-23 13:5x)

C142(요청자) — 검토를 묶는다: 이번은 d1(줄인 모델 · 초상 자산 · 명단 칸 · 자산 검사) · d2(profiles.teacher_key · 명단 서버 · 보일 선생님 · 고르기 액션 · 회화 화면 자료의 선생님) · d5(선생님 상태 · 목소리 고르기 · 음성 층) 세 묶음을 한 번에 본다. 화면 검토는 프리뷰 직전에 따로 한 번이다.

## 볼 것
- diff: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d` 에서 `git diff 3b7ed36..8a4cba1 -- . ':!specs'`(커밋 ff745d8 d1 차례 1~2 · f9651ea d2 · d5 · 8a4cba1 d1 차례 3~5). 작업 트리에는 d3 · d4 가 쓰는 중인 파일이 있으니 **커밋된 diff 만** 본다.
- 근거: plan `intent/2026-10-17-회화-선생님-캐릭터/plan.md`(approved — 13절 C141 · C142)의 d1 · d2 · d5 몫(작업 순서 · 바뀌는 파일 · 파일별 값 · 증명 표), spec `intent/2026-10-17-회화-선생님-캐릭터/spec.md`(FR-1 · FR-2 · FR-7 · FR-10 · FR-11 · AC-1 · AC-2 · AC-7 · AC-8 · AC-10 · AC-11 — 정본 번호 AC-19a · 19b · 19g · 19h · 19j · 19k), 정본 `specs/`(5절 명단 · profiles · 6.4 '선생님 이름' · 명단 자료 · 7절 읽어 주기 · 12절 talk.teacher_* · 13절 C109 · C130 · C131 · C141), 저장소 지침 `.claude/CLAUDE.md`(설정값 원칙 · 서버 액션 접근 확인 · RLS · 비밀값).
- 구현 보고: `task-teacher-d1-report.md` · `task-teacher-d2-report.md` · `task-teacher-d5-report.md`(같은 폴더) — 구현자가 plan 으로 풀리지 않아 정한 것을 판정한다.

## 특히 볼 곳
1. d2 고르기 액션: 첫 문장 접근 확인 · 명단 밖 키 · 아이 이름과 같은 선생님 · 이미 고른 프로필 거부 · 조건 UPDATE 하나(두 기기 겹침) · 입력 검증. 마이그레이션 0004 가 더하기만인지.
2. d2 대화의 선생님: 처음 스냅숏 키 우선 · 명단에 없을 때 · 선생님 · 스냅숏 둘 다 없을 때(스냅숏과 첫 대사를 미룸) — 이 길에서 턴 · 토막 넘김 요청이 오면 무엇이 일어나는지(d2 보고 '고치지 않은 길').
3. d5 상태 우선순위 · 칭찬 시간(talk.teacher_praise_seconds) · 움직임 줄이기 · 시작 알림이 실제로 시작한 때만 말하기를 켜는지 · 발화 겹침 · audioSession 쓰기 없음.
4. d1 자산 검사(파일 있음 · 해시 · 크기 상한 · VRM 메타 · 표정 · 뼈) · nameKoWordExceptions 가 코드 상수를 대신하는지 · 원본 VRM 이 저장소에 없는지 · 줄이기 스크립트가 원본을 덮어쓰지 않는지.
5. 설계 숫자가 코드에 박혔는지(설정값이어야 할 것), 시험이 AC 를 이름으로 증명하는지, 새 통합 시험 9건이 무엇을 보는지(이 Mac 에서는 못 돌림 — CI 21차 run 이 ci/p13-c1 8a4cba1 에서 돈다).

## 보고
검토자는 읽기 전용이라 **보고는 마지막 답장으로** 한다 — 컨트롤러가 `review-teacher-1-code.md` 로 옮긴다. 판정(Approved · Changes requested) 한 줄, 지적은 심각도(Critical · Important · Minor)와 근거(파일:줄 · plan · spec · 정본의 절 · 문장)를 반드시 단다. 근거 없는 지적은 넣지 않는다. 구현자가 정한 것마다 받음 · 고침 판정. 지난 장부(`ledger-closed.md`)는 읽지 않는다.
