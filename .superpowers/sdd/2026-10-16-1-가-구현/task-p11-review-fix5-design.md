# 재검토 브리프: P11b 차례 5 fix 5 — 화면(design-reviewer des-p11c 이어 보기 · Fable · max, 2026-10-22 15:2x, 범위 한정)

사진 폴더 /private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/686cc61d-5a44-4211-9d88-26af0ec4ddfa/scratchpad/p11-photos-9(CI 11차 e2e-photos — `p11-writing-5-write-*`(예시문) · `p11-writing-4-task-*`(칩 → 글 줄) · `p11-writing-4-fixed-*` · `-5-fixed-*`(C86 이유 줄) · `p11-writing-5-*` 입력란 폭 · 초점 · `p11-speaking-repeat-close-*` · `-listening-on-*`(M-6) · 새 사진 `p11-writing-*-blank` · `-pick-again` · `p11-ai-rest-past` · `p11-ai-rest-session`). 코드는 워크트리 p11 작업 트리(CI 가지 60e4858 과 같음).

**지적마다 ADDRESSED · NOT ADDRESSED**(화면 I-1 · M-1~M-6, 근거는 사진 이름 · 화소 측정 · 코드 줄). 새로 볼 것: C86 이유 줄(13절 `specs/10-결정-기록.md` C86 — 고친 뒤에만, '잘 고쳤어요!' 아래 한 줄, 해요체, 20px 이상 · 넘침 없음) · 예시문을 결과 단계에도 둔 것(구현자 다르게 한 것 — 4절과 어긋나지 않는지) · 과제 줄 유지로 문장 줄이 뛰지 않는지(`p11-wait-line-*` ↔ `-check-*`) · 입력란 aria-label. 새 지적은 fix 5 가 건드린 자리에서 생긴 것만. 보고 `review-p11-fix5-design.md`, 끝나면 SendMessage 한 줄.

덧(15:1x): fix 5b 가 더해졌다 — 이유 줄 `data-fix-reason` 표지(writing-guided.tsx:518) · 5단계 입력란 `max-w-full`(:406) · GuidedFix 주석. 사진은 CI 12차(ci/p11-c2 fbb8a07) 것이다.

덧(15:4x): CI 13차(run 39734679449, ci/p11-c2 ac62bcd) 전부 초록. fix 5c 가 더해졌다 — 결과 단계(칭찬 · 고칠 곳 · 보기 · 이유)에서 과제 줄과 5단계 예시문을 숨기고 문장 간격 24 → 8px(writing-guided.tsx:342 · 343 · 353). 그래서 I-1 예시문은 '쓰는 동안 · 기다리는 동안 보임' 기준으로 판정하고, 결과 단계에서 문장 줄이 뛰는 것은 한 화면에 드는 쪽을 고른 결과(지적 아님). 사진은 이 run 의 e2e-photos.
