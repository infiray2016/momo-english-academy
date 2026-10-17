# Minor 정리 브리프: P6a 시드 규격 파일 — fix 3 재검토의 Minor 셋(curriculum-designer cd-p06a 이어 보기 · Opus · high, 2026-10-17 18:4x)

`review-p06a-4.md`(des-p06a, **Approved** — R-1~R-5 ADDRESSED, 진짜 형태 31 잡힘 · 예외 19 통과)의 Minor 셋을 정리한다. fix 라운드가 아니라 컨트롤러 확인 몫(C52)의 Minor 정리이고, 재검토 없이 컨트롤러가 검사로 확인한다. 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a6ef72438a158a2f3`(커밋 없음). 커밋하지 않는다. 코드 파일은 건드리지 않는다.

## 고칠 것(검토의 '고치는 법' 그대로)
1. **N-1 Let's 예외** — `seed/lists/forms.json` lets 의 뒤보기 `(?!\s+(?:learn|talk|keep|start|begin|try|read|listen|say|look|review|practice)\b)` 를 **`(?!\s+(?:learn|talk|keep)\b)`** 로 줄인다(정본 근거는 02-2 'Let's learn some new words!' · 'Now let's talk about colors.' · 06 'Let's keep talking.' 셋뿐). 카드에 꼭 쓸 수업 진행 구가 더 있으면 그 구만(예 `start\s*!`) 근거와 함께. 시험 문장 'Let's read a book.' → lets(1~3단계에서 걸림) 추가.
2. **N-2 to 부정사 예외** — 둘째 갈래에 `\b(?:nice|glad|good|happy|pleased)\s+to\s+(?:meet|see)\s+(?!you\b)` 와 `\bsorry\s+to\s+hear\s+(?!(?:that|about)\b)` 를 더해 가주어 꼴을 잡는다. 시험 문장 'It is good to see the stars.' → to-infinitive, 'Nice to see you again.' → 없음 둘 다. better 쪽('get better grades')은 그대로 두고 근거 문서 '알고 둔 한계' 표에 'get better + 명사' 한 줄.
3. **N-3 keep + -ing** — gerund 트리거에 keep · keeps · kept · keeping 을 되돌리고 `(?!talking\b)` 로 'keep talking' 만 뺀다. 시험 문장 'Keep trying!' · 'He kept running.' → gerund, 'Let's keep talking.' → 없음.

## 완료 판정 · 보고
완료 판정 열여섯(fix 3 절의 표)을 다시 돌려 모두 맞아야 한다 — 특히 check_lists(더한 시험 문장 포함) · check_examples 1~12 · scan_phrases(79 막힘 0 · 진짜 형태 잡힘) · seed:validate 종료 0. `task-p06a-report.md` 'fix 3' 절 끝에 'Minor 정리' 소절(셋마다 바뀐 정규식 · 시험 문장 · 완료 판정 대조). 끝나면 상태와 요지 3줄을 컨트롤러에게 SendMessage 로.
