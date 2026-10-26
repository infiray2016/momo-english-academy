# fix 브리프: P6b 작업 5 화면 검토 반영 — fix 1(implementer impl-p06b 이어 보기 · Opus · high, 2026-10-17 22:3x)

(`task-p06b-fix1.md` 는 작업 2 때 것이다 — 이 파일이 작업 5 의 fix 1 이다.) `review-p06b-5.md`(des-p06b, Changes requested — C 0 · I 5 · M 11; 207장 뜻 틀린 그림 없음 · Twemoji 159 모두 바로 그린 그림 · 카탈로그 칸 위반 0)의 지적 가운데 **그림 · 파일 몫**을 고친다(고르기 몫은 없음 — 맡긴 Twemoji 아홉은 모두 유지 판정). 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p06b`, 커밋하지 않는다, 코드 파일(`src/` · `scripts/` · `tests/` 공용)은 건드리지 않는다. 생성기 `tests/.tmp/p06b/draw/` 를 다시 쓴다. 검토자의 큰 사진은 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/686cc61d-5a44-4211-9d88-26af0ec4ddfa/scratchpad/rv/`.

## 고칠 것(보고 3절 '고치는 법' 그대로)
1. **Important — 다시 그리기 셋**: catch(throw 와 같은 꼴 → 보고대로 **두 손으로 받는 모습**, 공은 손 쪽으로 오는 궤적), hungry(대야에 서서 떠는 아이로 읽힘 → 보고의 제안대로), toe(노란 원통 → 발 꼴이 분명하게, 가리키기 동그라미는 발가락에).
2. **Important — `CREDITS.md`** 를 plan '그림 규칙 — CREDITS.md' 대로: (1) 그림 — Twemoji n장(attribution 글 그대로 · CC-BY 4.0 주소 · 받은 SVG 를 바꾸지 않고 씀), 자체 그림 n장(이 프로젝트가 만든 그림) (2) 어휘 — 2022 개정 기본 어휘 목록(교육부 고시 제2022-33호 [별책 14])을 뼈대로, 참고한 목록(P6a 근거 문서의 인용 꼴). 수는 images.json 에서 센 값.
3. **Minor 다듬기 여덟**: arm · neck · shoulder · student · nurse · white · skate · doll — 보고의 지적대로.
4. **Minor — 모아 보기 `tests/.tmp/p06b/sheet.html`**: 낡은 머리글 · 빗금 바탕 고침.
5. 사진 다시 찍기(작업 6 요청자 표본용, 보고 5절 권고대로 **다섯 장**): 자체 그림 48장 큰 크기 두 장 · 작은 크기 한 장 · 단원 보기 묶음 한 장 · Twemoji 표본 한 장 → `tests/.tmp/p06b/shot5-*.png`.
6. 완료 판정: `pnpm images:check` 0 · `pnpm seed:validate` 종료 0 · `pnpm test` 167 · `pnpm lint` 0. 보고 `task-p06b-report.md` 에 '작업 5 fix 1' 절(지적마다 ADDRESSED · 전 · 후 · 사진 경로). 끝나면 상태와 요지 5줄 SendMessage → des-p06b 범위 한정 재검토 → 작업 6(요청자 표본, bank ① 🏦 유지 ② 자체 그림 가운데 고름).

## 고르기 몫(장부 · P8 로, 컨트롤러)
헷갈리는 짝 아홉(ant · insect, hat · cap, face · smile, head · hair, tired · sleepy 등 — 보고 짝 표)은 같은 문항 보기에 함께 두지 않는다는 규칙으로 ledger-open · P8 브리프에 넣었다. tired≠sleepy · strong≠arm.
