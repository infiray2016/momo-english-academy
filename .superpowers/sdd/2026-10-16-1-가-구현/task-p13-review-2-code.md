# 검토 브리프: P13a 차례 2 코드 검토 — 검토 묶음 a2(code-reviewer rev-p13 이어 보기 · Opus · xhigh, 2026-10-22 17:4x)

대상: 워크트리 p13(HEAD f3adcd8) 작업 트리의 미커밋 변경(CI 가지 ci/p13-c1 = b0411eb, CI 3차 도는 중 — 통합 conversation-call 20 은 CI 가 처음 돌림, 빨강이면 알림). 구현자 보고 `task-p13-report.md` '차례 2' 절(다르게 한 것 넷 — streamTalk · runTalkCall 나눔 · run.ts 더 내보냄 · Haiku → Sonnet 은 회화 턴만 · 응답 글 다시 읽기; 우려 둘 — 추측 셋 가짜 확인 · 끊긴 시도 비용 0). 요구사항: plan-p13a 작업 2 · 브리프 `task-p13-2.md`(N1 · N2 · N3 포함) · 13절 C92 · C89 · 6.1 대체 모델 · 8절 회화 턴 실패.

볼 것: (1) 8절 회화 턴 실패 길 — 첫 문장 전 연결 · 타임아웃 한 번 다시, Haiku 거절 → Sonnet 한 번(회화 턴만 — 끝맺음은 실패, 받을 만한지), 첫 문장 뒤 실패는 보낸 문장 두고 닫기, 안전 상한 · 설정 문제 분류. (2) 6.1 — 대체 모델 블록이 끼인 스트림에서 글 이어 쓰기 · 캐시 · ai_calls 행(요청 모델 · 답한 모델 · 토큰 · 비용 · first_sentence_ms), 끊긴 시도 비용 0(우려 2)이 10절 비용 알림을 흔들지 않는지. (3) C92 — NDJSON 전송 · 같은 출처 · 첫 문장 requireAccess 는 b 몫인지 a 몫인지 경계(이번 diff 가 어디까지). (4) 가짜 SSE 가 실제 SDK 스트림 꼴(content_block_delta · fallback 블록 · usage)과 같은지, 기존 단위 · 통합 그대로 초록인지. (5) 계약 시험 talk_turn 갈래 — plan-p13a 증명 표의 **통합 이름 스물을 시험 이름과 글자로 대조**(spec-trace 가 AC-15b 를 못 세는 한계), 견본 아홉 제자리. (6) `pnpm check:deps`(sdk-only-in-ai) 와 core 가 server-only 를 안 가져오는지. (7) 다르게 한 것 넷 · N1 · N2 · N3 반영 판정. (8) 새 시험(단위 14 · 통합 20)이 거짓 초록이 아닌지.

지적마다 심각도 · 근거(파일:줄 · plan 절 · 정본 절). 보고 `review-p13-2-code.md`, 끝나면 SendMessage 한 줄.
