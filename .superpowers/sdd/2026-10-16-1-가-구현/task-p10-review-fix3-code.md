# 재검토 브리프: P10 fix 3(B2 수업 목록 코드 지적)(code-reviewer rev-p10 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-18 00:3x)

범위 한정 재검토다. `review-p10-4-code.md` 의 I-1 · M-1~M-4 를 지적별 ADDRESSED · NOT ADDRESSED 로 가르고, 구현자가 다르게 한 것 · 우려를 판정하고, 새로 깨뜨린 것만 적는다. 파일을 고치지 않는다(복사본 재현은 된다). 3001 · 54331 · 3000 · 54329 · 3302 · 54339 는 건드리지 않는다. **차례 5(배치 평가, impl-p10)가 같은 시간에 돈다** — 새 파일(answer · placement)과 `home-cards.tsx` `PLACEMENT_OPEN` 이 바뀔 수 있다. 차례 4 파일은 fix 3 뒤 동결(차례 6 전까지). 로마자 제안(C74) · review-p10-fix2-code N-1 · N-2 · review-p10-fix2-design N-4 는 fix 4 로 미뤄져 범위 밖.

## 대상(구현 보고 `task-p10-report.md` 'fix 3(B2 · 로마자)' 소절 — 구현자 수: biome 0 · tsc 0 · 단위 334 · 통합 91 + 1 · e2e 35 · deps 0 · bundle 0 · spec-trace 0)
- **I-1** `src/core/lesson-list/state.ts` `ListInput.currentPassed` · 통과한 지금 단원의 안 한 수업 untried · 끝낸 수업 retry · `paused` 는 parent_check 안전망만 · 맞대기 표 확장(단위 +6 가운데) · `src/server/lesson-list/index.ts` 가 통과 여부를 넘김.
- **M-1** 잠긴 줄 수 규칙 다섯의 시험(다시 하기 빼기 · 다시 하기 학습일 · 배정 수 max · 회차 경계 · 쓰기 6단계 frame — 통합은 서버 frame 넘김을 잠시 빼서 빨강 확인) · **M-2** practice 상태에서 줄 다시 안 씀 · **M-3** 회차 경계를 끝낸 시각으로(홈과 같게) · **M-4** 수업 포스트잇 이름(고정 aria-label 제거 · 숨은 글 '끝낸 수업' — C72 표에 더함).
- 다르게 한 것: 통과 · 부모 확인 대기 · 단어 익히기 상태에서 잠긴 다음 단원 칸은 남기고 조건 줄만 숨김(컨트롤러 해석은 '줄 숨김' — 칸 남김은 받을 만함, 화면 몫은 des-p10) · 하던 수업이 없으면 '여기부터 해요'는 첨삭 보기 · 단계 평가 차례 그대로.
- 우려(구현자): 부모 확인 대기에서 하던 수업이 지난 단원의 진행 세션이어도 '여기부터 해요'가 붙는 것이 맞는가 — **컨트롤러 판정: 맞다**(4절 차례의 첫 대상은 하던 수업이고 단원을 가리지 않음). 코드가 그 판정과 같은지만 확인.

## 볼 것
1. I-1 변이: `currentPassed` 를 무시하게 바꾸면 맞대기 표가 깨지는지 · 통과 상태에서 regular 가 생기지 않는지 · 단계 평가 대기 상태도 untried 인지 · 서버가 passed_at 으로 넘기는지.
2. M-1 다섯 변이가 이제 각각 깨지는지(복사본 재현). M-3 가 홈 `home/index.ts` 의 경계와 글자까지 같은 뜻인지(끝낸 시각 ≥ 회차 시작). M-2 사례.
3. M-4 — e2e 위치 잡기 변경(`data-*`)과 이름이 '여기부터 해요' · '보강' · '끝낸 수업'을 담는지(탐침).
4. 새로 깨뜨린 것(차례 4 e2e 35 · 통합 91 + 1 — 복사본으로). 장부: '수업 목록 해석' 행 · '실시드 수 넘침' 행 판정.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p10-fix3-code.md`(메인): 지적별 표 · 다르게 한 것 · 우려 판정 · 새 지적 · 장부. 마지막 메시지는 요지 5줄 안쪽 SendMessage.
