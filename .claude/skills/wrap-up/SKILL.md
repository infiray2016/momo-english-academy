---
name: wrap-up
description: 작업 세션을 마무리한다. 요청자가 "오늘은 여기까지" · "마무리" · "정리하고 끝내자"라고 하면 쓴다. 오늘 자동 대화 기록을 읽어 원자료 · 위키 · index · log 를 정리(ingest)하고, 일지를 쓰고, 이어하기를 고치고, lint 와 상태표로 끝낸다.
---

# 세션 마무리 (wrap-up)

볼트: `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/infiray/90_AI/프로젝트/momo-english-academy/`. 순서대로 한다.

| 순서 | 하는 일 |
|---|---|
| 1 | `python3 .claude/hooks/vault_check.py --report` 로 상태를 본다(미처리 원자료 · log 보다 새 파일 · 빚) |
| 2 | 오늘 자동 대화 기록 `원자료/대화/YYYY-MM-DD_대화_세션기록.md` 와 log.md 보다 새 원자료를 읽고 `/vault-ingest` 절차대로 위키 · index 를 고친다. 결정 · 지시는 결정-목록과 닿는 제품 · 방법론 쪽에, 검토 보고 · 조사 · 판본은 사본이 있는지 본다 |
| 3 | `/journal` 로 오늘 일지를 쓰거나 더한다(한 일 · 결정 · 막힌 것 · 사람과 AI · 교훈 · 다음) |
| 4 | `이어하기.md` 의 지금 하던 것 · 다음 한 걸음 · 열린 질문을 지금 기준으로 고친다. 다음 세션이 첫 턴에 무엇부터 할지 1번에 적는다 |
| 5 | `log.md` 에 `- YYYY-MM-DD · wrap-up · <정리한 것>` 한 줄 |
| 6 | `python3 .claude/hooks/vault_check.py --lint --fix` 와 `--report` 가 깨끗한지 본다(끊긴 링크 0 · 고아 0 · 미처리 0) |
| 7 | 메모리(`~/.claude/projects/.../memory`)의 프로젝트 상태를 갱신한다 |
| 8 | 요청자에게 정리한 것과 다음 세션 첫 일을 짧게 보고한다. 세션은 저장소 안에서 다시 열어야 훅이 걸린다고 덧붙인다 |
