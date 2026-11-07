# 검토 브리프: P13a 차례 1 + 3 코드 검토 — 검토 묶음 a1 + a3(code-reviewer rev-p13 · Opus · xhigh, 2026-10-22 16:4x)

대상: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13`(브랜치 `feature/1a-p13-conversation`, HEAD 84b0669 = P11 차례 5) 작업 트리의 미커밋 변경 — src 9 · 시험 5 · 견본 JSON 9(`tests/fixtures/ai/samples/talk/`) · `tests/fixtures/settings.ts`(공용 변경 1 회화 키 스물넷 + speech.slow_rate) · `seed/settings.json`(speech.slow_rate). 구현자 보고 `task-p13-report.md` '차례 1 · 3' 절(다르게 한 것 열여섯 · 회11 (1)~(15) 대조표 · 우려 넷). 순수 함수 · 단위 시험만이라 로컬에서 전부 돈다(단위 581 · 새 77).

요구사항: `intent/2026-10-15-모모-잉글리시-아카데미/plan-p13a-회화-턴-호출과-수업-규칙.md`(approved) 작업 1 · 3, '회화 수업 모델(값 0)' · '파일별 값' · '정본 밖 문구' · 정할 것 회3 · 회7 · 회8 · 회11 · 회12 · 회13(13절 C89 · C92 · C95 · C96 · C97), 브리프 `task-p13-1.md`.

대조 절: 정본 6.1 · 6.2 회화 턴(`specs/05-AI-호출.md`) · 6.4 출력 검사 · 3.3 회화 토막 · 3.4 '말했다' · '안다' · 3.5 친한 정도 · 7절 듣기 끝 · 13절 C2 · C5 · C10 · C19 · C20 · C21 · C23 · C30 · C31 · C33 · C36 · C37 · C41 · C44 · C89 · C92 · C95 · C96 · C97.

볼 것: (1) 규격 Zod 가 6.1 · 6.2 와 1:1(칸 이름 · 상한 · 이름 가림 `{NAME}` 규칙 · 반말 고정부 — 회7), 정규화 · 출력 검사가 6.4 와 같은지. (2) 흘려 받기(회8): 조각 이음 · 문장 단위 검사 · 첫 문장 전 다시 · Haiku → Sonnet · 걸린 문장 첫 자리만 — 경계 사례(빈 조각 · 문장 끝 기호 없음 · 유니코드). (3) 흐름 `talkPositionOf` 등이 회11 (1)~(15) 표와 한 줄씩 맞는지(구현자 대조표를 믿지 말고 코드로), 토리 행 세 값(cardQuestionNo · moreTalkFallback · morePrompt)을 받는 꼴이 b 에 무리 없는지. (4) '말했다' · '안다'(3.4 · C95) — 동음이의어 처리로 'to' 가 'two' 만남으로 세는 것(구현자 우려 4)이 정본 3.4 해석으로 받을 만한지, 아니면 지적. (5) 설계 숫자가 설정 키로만 오는지(talk.* · speech.slow_rate 등), core 가 server-only 를 안 가져오는지(check:deps). (6) 공용 변경 1 이 '더하기만'인지(기존 키 · 값 · 차례 그대로), 견본 JSON 이 samples/talk/ 에 있어 기존 계약 시험이 깨지지 않는지. (7) 다르게 한 것 열여섯을 하나씩 받음 · 지적으로 판정(plan 의 뜻을 깨는 것은 Important). (8) 시험 77 이 거짓 초록이 아닌지, 증명 표 이름 34 글자 그대로.

지적마다 심각도 · 근거(파일:줄 · plan 절 · 정본 절) 필수. 보고 `review-p13-1-code.md`(판정 · 다르게 한 것 판정표 · 장부 판정), 끝나면 SendMessage 한 줄.
