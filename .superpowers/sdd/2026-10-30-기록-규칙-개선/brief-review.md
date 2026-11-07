# 검토 브리프: 기록 규칙 묶음 끝 전환 · 맥락 줄이기 적용(코드 검토자 · Opus · high, 가벼운 루프 · 범위 한정, 2026-10-30 13:3x)

요청자 결정(2026-10-30 11:3x): 볼트로 옮기는 일은 묶음이 닫힐 때 한 번(요청자 결정 · 장부 한 줄은 그 자리에서), 턴마다 하지 않는다. Stop 훅은 13절이 바뀐 턴과 마무리 때만 검사한다. SessionStart 는 '볼트 사본 없는 저장소 보고'를 알린다(막지 않는다). 근거 진단: 볼트 `2026-10-30_조사_작업-속도-토큰-진단` · `-보탬`.

## 검토 대상(컨트롤러가 직접 고침)
1. 훅 `~/.claude/hooks/vault_check.py`(정본 볼트 `지식저장소/도구/vault_check.py` 와 같음). diff 는 같은 폴더 `vault_check.diff`. 고친 곳: RULES INGEST_ON · PENDING_MODE, DECISION_RE · DECISION_VAULT_RE · UNCOPIED_SINCE 상수, `uncopied_reports()` 새 함수, `mode_stop` 의 pending 차단 → 결정 파일 검사, `mode_start` 의 규칙 요약 · 알림 둘 · 이어하기 규칙 줄, 머리 설명.
2. 운영 규칙 쪽 볼트 `지식저장소/위키/지식저장소-운영.md`(ingest 절 · 강제 장치 Stop 행 · 빈도 표 · 점검표 · 명령 표).
3. 스킬 `~/.claude/skills/vault-ingest/SKILL.md` · `wrap-up/SKILL.md`(도구 폴더 정본과 같음).
4. `~/.claude/CLAUDE.md` '맥락 · 토큰 줄이기' 절, `.claude/CLAUDE.md` 기록(강제) 줄 · 맥락 줄이기 줄, `.claude/agents/*.md` 여섯의 '맥락 줄이기' 절.

## 컨트롤러가 확인한 것
- 문법 통과. Stop 모의(세션기록 턴만, 결정 파일 변경 없음): 끝 상태 0 · 차단 없음. SessionStart 모의: 규칙 요약 새 글, 미처리 원자료 알림(막지 않음), 사본 없는 보고 알림 2건(10-30 이후만, 브리프 이름 제외).
- settings.json 은 바꾸지 않았다(훅 이름 · 사건 그대로).

## 볼 것(범위 한정)
1. `mode_stop` 이 옛 pending 차단을 완전히 없앴는지, 결정 파일 검사(DECISION_RE 가 `specs/10-결정-기록.md` 를 잡고 `DECISION_VAULT_RE` 가 볼트 `위키/결정/결정-목록.md` 를 잡는지)가 뜻대로 도는지. 13절을 고친 턴에 볼트 결정 목록을 안 고치면 막고, 고치면 지나는지.
2. `uncopied_reports()` 가 저장소 보고를 볼트 원자료 `source:` 줄과 맞댈 때 거짓 양성 · 음성이 날 자리(이름 겹침 · NFC · 경로 꼴). 10-30 이후 걸린 둘(task-seed-review-l3.md · 회화 spec 3판 요청자 검토 원문)이 왜 걸리는지와 검사 조건을 좁힐 길.
3. PreCompact · SessionEnd · --mark-ingest · --report 는 고치지 않았는데, 새 상수와 어긋나는 문구 · 동작이 남았는지(특히 --report 의 '미처리 원자료' 줄, `mode_end` 의 일지 debt).
4. 규칙 쪽 · 스킬 · CLAUDE.md · 에이전트 정의의 문장이 훅 동작과 어긋나지 않는지(예: '턴마다' 가 남은 곳, Stop 이 막는다고 적힌 곳).
5. Minor 는 보고에 적고 컨트롤러가 직접 고친다.

## 보고
같은 폴더 `review-report.md`: 판정(Approved 또는 Changes requested), 지적마다 심각도 · 근거(파일:줄). 답은 요지 다섯 줄. 파일은 고치지 않는다. 명령은 `CLAUDE_PROJECT_DIR=/Users/hikaru/workspace/momo-english-academy python3 ~/.claude/hooks/vault_check.py --rules|--report` 처럼 읽기 모드만 쓰고, `--stop` · `--start` · `--mark-ingest` · `--end` · `--compact` 는 상태 파일을 바꾸니 돌리지 않는다.
