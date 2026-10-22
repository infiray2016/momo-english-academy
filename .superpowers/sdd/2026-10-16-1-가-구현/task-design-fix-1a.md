# 구현 브리프: 디자인 fix 1a — 정할 것 둘 판정 · AC-8f 시험 이름 · 정본 맞춤 뒤 확인(implementer impl-p13-2 이어 보기 · Opus · high, 2026-10-23 02:3x)

워크트리 p13(디자인 fix 1 이 커밋 없이 들어 있는 상태). 컨트롤러가 정본 · intent 를 문서 가지 76cb856 + 5절 고침과 맞춰 작업 트리에 옮겨 두었다(specs · intent — 손대지 말 것). 시험 먼저. 커밋 없음. `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`.

| # | 할 일 | 근거 |
|---|---|---|
| a | **'여기부터 해요' 카드는 다른 카드와 같은 크기**: `lesson-board.tsx` 의 `col-span-2` 를 빼고, 구별은 표지(LESSON_BADGE) · 테두리(ring) · 테이프 숨김으로만. #18 셈 표에서 '여기부터 해요' 352px 줄을 지우고, 목록 카드 크기 같음 단언이 '여기부터 해요' 카드도 포함하게 | 13절 C114 · 4절 '여기부터 해요' 행(이제 '크기는 다른 카드와 같고 표지 · 테두리로 구별한다') |
| b | **배치 전 홈 카드(GateBody)의 빈 아래**: '내 단계 찾기'(TEXT.findLevel)를 큰 제목에서 빼어 CardBody 의 '시작!'과 같은 아래 끝 단추 꼴(`mt-auto` · `min-h-14` · `rounded-xl bg-ink … text-paper` · aria-hidden 아님 — 카드 링크의 읽히는 이름에 들어가야 함)로 둔다. 위에는 영역 이름 · 힌트(findLevelHint) · 이번 주 줄. 회화의 needs_speaking 갈래도 같은 아래 단추 꼴로 '내 단계 찾기'(같은 글 — 새 문구 없음). 판정 전(pending)이면 단추 자리만 비워 두는 CardBody 꼴 그대로. e2e: 배치 전 홈에서 카드 넷의 높이가 같고 아래 끝 단추가 같은 줄(±1px) — 첫 실행 뒤 '내 단계 찾기' 홈 사진 두 방향 | taste app-screens §4.2 '늘인 카드의 발에는 단추 · 합계만' · C114 |
| c | **AC-8f 시험 이름**(plan-p13a 증명 표가 바뀜): 1~3단계 기본값 시험 이름을 'AC-8f 회화 턴 요청은 1~3단계 기본값이면 claude-sonnet-5-5 · effort low · thinking between_tools 이고 서버 측 대체 모델 재시도를 켠다(C112)'로 — 이 시험이 fallbacks 켬도 단언하게. Haiku 를 고른 시험은 'AC-8f 설정으로 Haiku 를 고른 회화 턴 요청은 effort low · thinking disabled 이고 fallbacks 가 없다'로 이름을 바꾼다 | 14절 AC-8f(C112 로 고침) · plan-p13a 367행 |
| d | 정본 맞춤 뒤 확인: `pnpm check:ids`(setting-default 0 이어야 — 컨트롤러가 이미 0 확인) · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` · 단위 · biome · tsc · build | — |

보고: `task-p13-report.md` '디자인 fix 1a' 절(번호별 · 파일 · 시험 · 사진 이름) · SendMessage 한 줄 → 컨트롤러 CI(사진) → des-all 재검토.
