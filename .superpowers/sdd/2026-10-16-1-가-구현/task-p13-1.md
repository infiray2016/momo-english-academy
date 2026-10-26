# 구현 브리프: P13a 차례 1 + 3 — 회화 턴 규격 · 흘려 받기 · 문장 검사(순수), 수업 규칙 순수 함수(implementer impl-p13 · Opus · high, 2026-10-22 16:0x)

plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p13a-회화-턴-호출과-수업-규칙.md`(approved, 컨트롤러 2026-10-22 — 13절 C85 · C89~C98)가 요구사항 전부다. 이 브리프는 그 plan 의 **차례 1(a 작업 1)과 차례 3(a 작업 3)** 을 한 구현자가 차례로 한다(plan '화면을 보는 차례' — 둘은 파일이 겹치지 않아 ∥ 가능). 검토는 둘을 한 묶음(a1 + a3, code-reviewer)으로 받는다.

워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13`(브랜치 `feature/1a-p13-conversation`, P11 가지 차례 5 커밋 84b0669 위, node_modules 있음, Node 24 는 `~/.nvm/versions/node/v24.22.0/bin`). 이 Mac 은 DB 시험 불가 — 차례 1 · 3 은 순수 함수 · 단위 시험만이라 로컬에서 끝까지 돈다. 시험 먼저 쓰고 실패를 본 뒤 구현. 커밋은 하지 않는다.

## 차례 1(a 작업 1)
`tests/unit/conversation-call.test.ts` · `tests/unit/conversation-stream.test.ts` · 견본 JSON(plan '파일별 값' 의 자리) → `src/core/ai/calls/talk.ts`(회화 턴 · 끝맺음 턴 규격 Zod · 사용자 메시지 꼴 · 정규화 — 정할 것 회7) · `src/core/conversation/stream.ts`(흘려 받기 — 조각 이음 · 문장 단위 검사 · 첫 문장 전 다시 · Haiku → Sonnet · 걸린 문장 첫 자리만, 정할 것 회8). 대조 절: 정본 6.1 · 6.2 회화 턴 · 6.4 · 13절 C19 · C20 · C21 · C36 · C44 · C89 · C92 · C95. P9 `src/core/ai/calls/common.ts` 의 공통 규칙은 plan 대로(회화 고정부는 반말이라 P9b 공통 규칙을 안 씀 — 회7) 가져다 쓰되 깨지 않는다.

## 차례 3(a 작업 3)
`tests/unit/{conversation-flow,conversation-said,conversation-listen}.test.ts` → `src/core/conversation/{flow,hints,said,wrap-up,listen,friendship,attempt}.ts`. 대조 절: 3.3 · 3.4 · 3.5 · 13절 C2 · C5 · C10 · C19 · C20 · C23 · C30 · C31 · C33 · C36 · C37 · C41 · C44 · C95(흐름 해석 열다섯 — plan 정할 것 회11 (1)~(15) 표와 한 줄씩) · C97(말해 보기 예문). 설계 숫자는 설정 키(`talk.*` · `speech.*`)로 받는다 — 시험은 `TEST_SETTINGS` · `loadableSettings()` · 견본 빌더에서 읽는다.

## 지킬 것
CLAUDE.md 규칙 전부(설계 숫자 박지 않음 · 서버 전용 모듈을 core 에 가져오지 않음 · `pnpm check:deps` 초록 · 용어). plan 의 '회화 수업 모델(값 0)' · '파일별 값' · '정본 밖 문구' 를 글자 그대로 쓴다. plan 과 다르게 해야 하면 '다르게 한 것'에 까닭과 함께 적고, 정본과 어긋나면 고치지 말고 '정할 것'에 올린다. 아이 이름 · 비밀값은 시험 자료에도 쓰지 않는다.

## 완료 · 보고
단위 초록(`pnpm test`) · `pnpm -s biome ci .` 0 · `pnpm tsc` 0 · `pnpm check:deps` 0. 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p13-report.md` '차례 1 · 3' 절(바뀐 파일 · 시험 이름과 수 · 다르게 한 것 · 정할 것 · 관문 결과). 끝나면 SendMessage 한 줄(단위 수 · 파일 수). 그 뒤 컨트롤러가 검토 묶음 a1 + a3(code-reviewer) → fix → 차례 2 브리프.
