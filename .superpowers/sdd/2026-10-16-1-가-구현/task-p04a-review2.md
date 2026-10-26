# 재검토 브리프: P4a fix 1(code-reviewer rev-p04a · Opus · xhigh, 읽기 전용, 범위 한정)

`review-p04a.md`(C 0 · I 3 · M 7)의 지적 가운데 I-1 · I-2 · I-3 · M-1 · M-2 · M-3 · M-5 · M-6 · M-7 과 '범위 밖 관찰' 1(끝맺음 조건 역할 ko)을 impl-p04a 가 fix 1 로 고쳤다. M-4 는 컨트롤러가 코드 대신 정본 5절 문구를 고쳤다(13절 C58 — 기능어는 글로서리에서만 빼고 범위 밖 비율은 단계로 판정). 이번은 범위 한정 재검토다 — 항목마다 ADDRESSED · NOT ADDRESSED 를 가르고, 고친 줄에서 새로 생긴 결함만 본다. 코드를 고치지 않는다. 보고는 `.superpowers/sdd/2026-10-16-1-가-구현/review-p04a-2.md`(메인 저장소).

## 대상
- 같은 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a6ef72438a158a2f3`. fix 1 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p04a-fix1-report.md`(지적마다 고친 곳 · 바뀐 파일:줄 표).
- 바뀐 곳(보고 기준): `structure.ts` :33 BAND_INFOS(+ :51 · :67 · :73 · :454 · :597) · :318~319 gloss, `text.ts` :11 · :13 · :28~29 이스케이프 · :92~116 TOKEN · :520~550 stemPieces · forbiddenHits, `schema/reference.ts` :33 Text, `schema/lesson.ts` :427~428 · :457 · :509~510, `schema/talk.ts` :202, `tests/fixtures/seed/builders.ts` :1011~1050 · :1918, `tests/unit/seed-schema.test.ts` 글 조각 시험 :692~ 와 BAND_INFOS, `tests/unit/seed-text.test.ts` :130~ · :277~ · :357~.
- 기준: 메인 저장소 plan-p04a(`intent/2026-10-15-모모-잉글리시-아카데미/plan-p04a-규격.md`)의 '컨트롤러 결정' 문단 끝 '검토 뒤 결정(19:1x)'과 글 조각 역할 표(ko · gloss 줄, 19:1x 고침), `specs/04-데이터.md` 5절 vocab 행(C58 반영), `specs/10-결정-기록.md` C58, `specs/05-AI-호출.md` 6.6(72 · 96줄 단가).
- 컨트롤러 재확인(19:2x): lint 0 · test 74(시험 수 그대로, 사례만 더함) · check:deps 0 · build 통과 · check:bundle 0 · spec-trace missing-test 66. 시험을 다시 돌릴 때는 `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm test`.

## 판정할 것
1. 열 항목(I-1 · I-2 · I-3 · M-1 · M-2 · M-3 · M-5 · M-6 · M-7 · 끝맺음 조건 ko) 각각 ADDRESSED · NOT ADDRESSED(근거: 파일:줄, 검토 보고의 '고치는 법', plan 줄). M-4 는 '정본 문구 고침으로 닫힘'인지 확인(5절 vocab 행과 코드 `offbandWords` 가 이제 맞는지).
2. 고친 줄에서 생긴 새 결함. 특히 (가) I-1 의 줄임말 갈래가 문장 끝 자르기(`splitSentences`)와 어긋나지 않는지, `a.mx` 처럼 뒤에 영문자가 오는 경우와 대소문자 처리, 서수 꼬리가 `3rdx` 같은 꼴을 잘못 받지 않는지; (나) I-3 의 `stemPieces` 가 불규칙 축약형 펼침(can · will · shall · am · not)과 하이픈 조각에서 거짓 양성(예: `can't` 의 can 이 금지어 목록의 'can' 과 겹침?)이나 거짓 음성을 만들지 않는지; (다) M-3 의 경로 정규식 21개가 실제로 좁아졌는지(이름만 더해도 통과하는 빈틈이 남았는지), 시험 안 갈래 견본이 규격을 먼저 통과하는지; (라) M-6 에서 구현자가 정본에 없는 Opus 캐시 단가를 비율로 셈해 넣고 주석에 적은 것 — 견본 값으로 두는 것이 맞는지, P5 · P9 에 넘길 메모인지(6.6 에 Opus 캐시 단가가 없는 것은 정본 빈칸으로 컨트롤러가 기록한다); (마) M-2 의 이스케이프가 바이트로 맞는지(`U+1100-U+11FF` · `U+3130-U+318F` · `U+AC00-U+D7A3`, 따옴표 둘).
3. 구현자가 '설계와 다르게 둔 것'으로 적은 둘(줄임말은 정본 다섯만 — `U.S.` · `e.g.` 는 쪼개짐; 금지어 비교는 불규칙 축약형만 펼침) 판정.
4. 증명 표 시험 이름 22 그대로, 더한 셋 그대로, 새 시험에 AC 접두 없음, 허용 파일 밖 변화 0, P4b 가 알아야 할 이름 변화(BAND_INFOS · gloss · option · ko · tokenize 동작)가 보고에 다 적혔는지.

## 보고 꼴(`review-p04a-2.md`)
- 첫 줄 판정: Approved 또는 Changes requested(C n · I n · M n).
- 표 하나: 열 항목 + M-4 마다 ADDRESSED · NOT ADDRESSED(또는 닫힘)와 근거.
- 새 지적이 있으면 번호 · 심각도 · 파일:줄 · 근거 · 고치는 법 한 줄. 근거 없는 지적은 넣지 않는다.
- 마지막 메시지 첫 줄은 판정, 그 뒤 요지 6줄 안쪽.
