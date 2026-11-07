# 구현 브리프: P5c 시드 보기 화면의 표본 검토 · 사람 확인 쓰기(implementer impl-p05c · Opus · high, 2026-10-22 15:4x)

plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p05c-보기-기록.md`(approved, 컨트롤러 2026-10-16 23:2x, C62)가 요구사항 전부다 — 바뀌는 파일 일곱 · 서버 쓰기 · 서버 액션 · 화면 · 증명 표 · 정할 것 판정(plan-p05a '컨트롤러 결정')을 그대로 따른다. 짝 plan `plan-p05a-풀이-검사.md` · `plan-p05b-시드-보기.md` 의 같은 이름 절도 읽는다.

워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p05c`(브랜치 `feature/1a-p05c-seed-review`, P8 가지 = P11 바탕 + P6b + P5a 위, node_modules 있음). 이 Mac 은 DB 시험 불가 — 단위는 로컬, `tests/e2e-local/seed-viewer.spec.ts` 는 CI 로(push 는 컨트롤러). 시험 먼저 쓰고 통과시킨다. 커밋은 하지 않는다.

**왜 지금인가.** 내일(10-23) 요청자가 시드 표본을 시드 보기 화면(`SEED_VIEWER_ROOT=tests/.tmp/p08-samples/<effort> pnpm dev`)으로 읽고 '알맞음 · 쉬움 · 어려움 · 오류'와 아이 눈 순회 답을 남겨야 한다(6.3 H11). 그래서 표본 검토 쓰기(`saveReview`)가 먼저이고, 사람 확인(`saveHumanCheck`)은 풀이 검사(H4 키) 뒤라 둘째다 — 둘 다 plan 대로 만들되 순서는 그렇게.

**지킬 것.** CLAUDE.md 규칙 전부(접근 쿠키 `requireAccess` 첫 문장 · 로컬 전용 `assertSeedViewerLocal` · Zod · 설계 숫자 박지 않음 · 해요체 안내 — 개발자 화면이라 큰 글자 규칙은 plan 대로). 정본 · plan 을 바꾸지 않는다 — 어긋나면 보고 '정할 것'에. 뿌리 밖 경로 거부(`resolveSeedFile`). 날짜는 한 시계 `now()` + `app.timezone`.

**보고.** `.superpowers/sdd/2026-10-16-1-가-구현/task-p05c-report.md` — plan 꼴(바뀐 파일 · 시험 이름과 결과 · 다르게 한 것 · 정할 것 · 관문 명령 결과). 끝나면 SendMessage 한 줄(단위 수 · e2e-local 시험 이름 셋). 그 뒤 컨트롤러가 CI(가지 재생성) → 코드 검토(가벼운 — 도구 성격) → 커밋.
