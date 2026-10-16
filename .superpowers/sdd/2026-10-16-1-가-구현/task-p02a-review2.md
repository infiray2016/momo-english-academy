# 재검토 브리프: P2a fix 1(code-reviewer rev-p02a · Opus · xhigh, 읽기 전용, 범위 한정)

`review-p02a.md`(C 0 · I 2 · M 2)의 지적 넷을 impl-p02a 가 fix 1 로 고쳤다. 이번은 범위 한정 재검토다 — 지적마다 ADDRESSED · NOT ADDRESSED 를 가르고, 고친 줄에서 새로 생긴 결함만 본다(전체 재검토 아님). 코드를 고치지 않는다. 보고는 `.superpowers/sdd/2026-10-16-1-가-구현/review-p02a-2.md`(메인 저장소).

## 대상
- 같은 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a0ffe8037fa827af6`. fix 1 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p02a-fix1-report.md`(지적별 판정 표 · 바뀐 파일:줄).
- 바뀐 곳(보고 기준): `src/core/speech/listen.ts` :294-306 · :320-321(I-1) · :338-356(I-2) · :410-417(M-2), `src/core/speech/match-rate.ts` :21-23 · :176-181 · :209(M-1), `tests/unit/listen-end.test.ts` :526-542 · :734-867, `tests/unit/match-rate.test.ts` :171-192.
- 기준 plan: 메인 저장소 `intent/2026-10-15-모모-잉글리시-아카데미/plan-p02-음성-접점.md` 값 2 의 82 · 91 · 98~100줄(컨트롤러 19:0x 고침)과 '정할 것' 끝 결정 문단.
- 컨트롤러 재확인(19:1x): lint 0 · test 89(84 + 5) · check:deps 0 · build 통과 · check:bundle 0 · spec-trace missing-test 64. 시험을 다시 돌릴 때는 `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm test`.

## 판정할 것
1. I-1 · I-2 · M-1 · M-2 각각 ADDRESSED · NOT ADDRESSED(근거: 파일:줄, 고친 plan 줄, 7절 문장). 특히 I-2 의 가름(stop 까닭 chunk 또는 모은 글 없음 → 다시 시작, 그 밖 → 모은 글로 done)이 plan 99 · 100줄과 글자대로 같은지, I-1 의 `joinedText(s) === ""` 가 '모은 글' 정의(끝난 조각 + 지금 객체 글)와 같은지.
2. 새 시험 다섯이 검토 재현 장면(60 → 108초, 버튼 뒤 되풀이, 상한 20초, 한 문장 브라우저 끝 뒤 멈춤, {NAME} 문장 부호)을 그대로 옮겼는지. 구현자는 새 시험을 고치기 전 코드에서 돌려 보지 않았다 — 시각 단언(cap 60초 · done 33.1 · 19.0초 · 0.5)이 옛 동작(108초 · 다시 시작 · 34초 · 1)과 갈려 실패했을지 판단한다. 필요하면 워크트리에서 해당 줄만 잠시 되돌려 확인해도 된다(되돌린 뒤 원래대로, 다른 파일은 손대지 않는다).
3. 고친 줄에서 생긴 새 결함(예: M-1 의 '낱말이 표지와 같을 때만 자리'가 `{NAME}’s` 소유 흡수 뒤 다른 낱말을 놓치는지, 입력의 U+E000 지움이 정규화 (1)~(6) 차례와 어긋나는지, M-2 abort 효과가 옛 번호를 가리키는지, I-2 가 '멈추는 중' 밖의 전이를 건드렸는지).
4. 기존 시험 이름 그대로(증명 표 31 글자 그대로), 새 시험에 AC 접두 없음, 허용 파일 밖 변화 0, '범위 밖 관찰' 1~4 를 손대지 않았는지.

## 보고 꼴(`review-p02a-2.md`)
- 첫 줄 판정: Approved 또는 Changes requested(C n · I n · M n).
- 표 하나: 지적 I-1 · I-2 · M-1 · M-2 마다 ADDRESSED · NOT ADDRESSED 와 근거.
- 새 지적이 있으면 번호 · 심각도 · 파일:줄 · 근거 · 고치는 법 한 줄. 근거 없는 지적은 넣지 않는다.
- 마지막 메시지 첫 줄은 판정, 그 뒤 요지 6줄 안쪽.
