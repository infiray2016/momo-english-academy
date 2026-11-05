# 닫힌 장부 — 회화 수업을 대화로

| 번호 | 항목 |
|---|---|
| T-9 | 묶음 1 · 2 시작(05:4x, impl-talk-1 · Opus high, 가벼운 루프, `task-talk-1.md`): settings.json · 고정값 24행 · talk.dontknow_max 바꾸는 곳 · p13d specs 사본 복사(없앤 키 두 행 전용 줄, 정한 것 14) · check:ids · seed:load --partial(묶음 2). 개발 DB reference-only 적재는 컨트롤러 → 닫힘 10-30 08:2x(검토 Approved, Minor 셋 직접) |
| T-11 | 묶음 1 · 2 DONE_WITH_CONCERNS(08:1x, `task-talk-1-report.md`): 관문 0 · 단위 1506 · check:ids 위반 0. 가벼운 루프 검토(rev-talk-1 · Opus high, 범위 한정). 우려: --partial --complete-through N 이 개발 DB seed.complete_through_level 을 N 으로 덮음(지금 1 은 무해) · --json 보고에 partial 칸 · ci-workflows.test.ts 의 dev-load 시험에 partial 추가는 요청(허용 밖 파일) — 검토 뒤 컨트롤러가 직접(가벼운 루프 Minor). 검토 Approved 뒤 개발 DB `seed:load --reference-only --complete-through 1`(T-6 닫힘) → 닫힘 10-30 08:2x(검토 Approved, Minor 셋 직접) |
| T-25 | 묶음 3 검토 Changes requested(rev-talk-3, C0 · I2 · M5): I-1 단원 덮기가 배정 카드의 필수 질문까지 셈, I-2 unitComplete 를 지나는 시험 없음, M-1 · M-3 · M-5 고침, M-2 는 C194 (2)로 규칙 유지, M-4 는 보고에 예외 한 줄. → fix 1(impl-talk-3, 09:2x). 묶음 3 몫 T-2 grep 0 · 닫힘 10-30 09:3x(T-32) |
| T-30 | 묶음 3 fix 1 끝(09:2x, impl-talk-3): I-1 · I-2 · M-1 · M-3 · M-5 고침, M-2 는 C194 (2) 근거만, M-4 는 첫 보고에 예외 한 줄. seed-validator-talk 30 → 38(먼저 실패 둘 확인). 범위 한정 재검토 rev-talk-3(09:3x) · 닫힘 10-30 09:3x(T-32) |
| T-26 | 묶음 5 검토 Changes requested(rev-talk-5, C0 · I4 · M6): I-1 1~3단계 when_needed 대화 중 준비의 답 글 줄(T2), I-2 준비 낱말 빼기가 card.prep 기준, I-4 같은 질문 셈에 반응 물음이 듦, Minor 여섯 → fix 1(impl-talk-5, 09:2x). I-3(대신 질문 넓힘)은 C194 (1) 잠정 · 첫 프리뷰에서 요청자 확인. 해석 열둘 가운데 열하나 받아들임. 묶음 3 요청 2(견본 형)는 닫힘 · 닫힘 10-30 09:4x(T-34) |
| T-31 | 묶음 5 fix 1 끝(09:2x, impl-talk-5): I-1(1~3단계 대화 중 준비의 답은 소리 줄만) · I-2(보인 준비 낱말 기준, prepOpened → prepWords) · I-4(turnQuestionOf) · Minor 여섯, I-3 은 C194 (1) 근거만. 새 시험 93 · 전체 단위 1657 · tsc 0. 범위 한정 재검토 rev-talk-5(09:3x). 묶음 8 이 지킬 것: 선생님 행 text 끝에 앱이 붙인 줄(카드 질문 · 쉬운 질문 · 마무리 물음)을 둔다, 인사 뒤 준비에서 보인 낱말을 prepWords 로 넘긴다 · 닫힘 10-30 09:4x(T-34) |
