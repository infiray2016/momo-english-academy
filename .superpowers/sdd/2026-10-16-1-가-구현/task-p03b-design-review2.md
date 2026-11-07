# 화면 재검토 브리프: 접근 코드 화면 fix 1(design-reviewer drev-p03b · Opus · xhigh, 읽기 전용, 범위 한정)

`review-p03b-design.md`(C 0 · I 1 · M 4)의 I1 · M1 · M2 · M3 을 impl-p03a 가 fix 1 로 고쳤고, M4(끊김 문구 출처)는 컨트롤러가 정본 4절 · C57 · plan 값 8 을 '7절 네트워크 행'으로 고쳤다(코드 주석도 맞춤). 지적마다 ADDRESSED · NOT ADDRESSED 를 가르고 고친 곳의 새 문제만 본다. 코드를 고치지 않는다. 보고는 `.superpowers/sdd/2026-10-16-1-가-구현/review-p03b-design-2.md`(메인 저장소).

## 대상
- 같은 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a4f928c00fc43a1e8`. 화면 코드 `src/app/(setup)/access/access-code-form.tsx`(focus-visible 고리 · `border-neutral-500` · `required` 제거와 빈 값 처리 · 초점 복귀 · 주석). 새 사진 둘 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/p03b-access-fix1.png` · `p03b-access-fix1-focus.png`(WebKit 만). fix 1 보고 `task-p03b-fix1-report.md` 화면 부분.
- 구현자는 Chromium 대비를 재지 않았다 — 지난번처럼 서버를 띄워(`PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm dev` 또는 e2e 서버) Playwright Chromium · WebKit 에서 초점 고리 · 테두리 대비를 직접 잰다(기존 사진 파일은 덮어쓰지 않고 `p03b-design2-*.png` 로 남긴다).
- 기준: 지난 보고의 '고치는 법'(I1 진한 실선 고리 3:1 이상 · M1 테두리 3:1 이상 · M2 빈 칸이면 요청 없이 초점만, 말풍선 없음 · M3 204 가 아닌 결과 뒤 입력칸 초점), 4절 문구 일곱(바뀌지 않았는지), 한 화면 한 행동 · 크기(그대로인지).

## 판정할 것
1. I1 · M1 · M2 · M3 각각 ADDRESSED · NOT ADDRESSED(실측 값 · 파일:줄). M4 는 코드 주석과 정본 참조가 맞는지만.
2. 고친 곳의 새 문제: 초점 고리가 버튼 배경 · 입력칸 테두리와 겹쳐 보이는지, 빈 칸 제출 때 아무 문구도 없이 초점만 가는 것이 아이 · 부모에게 혼란인지(정본은 새 문구를 두지 않기로 함 — 판단만 적는다), 초점 복귀가 iPad 자판을 띄우는지(알려진 iOS 동작 메모).
3. 문구 일곱 · 한 행동 · 크기가 그대로인지.

## 보고 꼴(`review-p03b-design-2.md`)
- 첫 줄 판정: Approved 또는 Changes requested(C n · I n · M n). 표 하나: I1 · M1~M4 각각 ADDRESSED · NOT ADDRESSED 와 실측. 새 지적은 번호 · 심각도 · 자리 · 근거 · 고치는 법. 마지막 메시지 첫 줄은 판정, 그 뒤 요지 6줄 안쪽.
