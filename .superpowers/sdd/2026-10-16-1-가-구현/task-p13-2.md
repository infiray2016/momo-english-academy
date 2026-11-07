# 구현 브리프: P13a 차례 2 — 스트리밍 시도 · 회화 턴 흐름 · 가짜 SSE(implementer impl-p13 이어 보기 · Opus · high, 2026-10-22 16:4x — 검토 a1 + a3 fix 뒤 보냄)

plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p13a-회화-턴-호출과-수업-규칙.md` **작업 2(차례 2)** 가 요구사항 전부다 — 13절 C92(회화 턴 전송 NDJSON · 가짜 AI 'stream' 응답 C81 꼴) · C89 · 8절 회화 턴 실패 · 6.1 대체 모델(Haiku → Sonnet) · 캐시 · ai_calls 기록. 워크트리 p13(차례 1 · 3 위, 정본 f76aaac 맞춤). 통합 시험은 CI(컨트롤러 push). 시험 먼저. 커밋은 하지 않는다.

## 범위(plan-p13a 작업 2)
공용 없음 → `tests/fixtures/ai/fake-anthropic.ts`(stream 응답 — 기존 단위 · 통합 그대로 초록 확인) → `tests/integration/conversation-call.test.ts` → `src/server/ai/client.ts` · `src/server/ai/run.ts`(내보냄) · `src/server/ai/talk.ts`(회화 턴 · 끝맺음 턴 스트리밍 시도 — 차례 1 의 `stream.ts` 흘려 받기와 `calls/talk.ts` 규격을 씀, 첫 문장 시간 · 실패 분류 · 대체 모델 · 재시도 규칙 8절 · ai_calls 행) · `src/server/ai/index.ts`(공개 함수). `pnpm check:deps`(sdk-only-in-ai) 초록. **계약 시험에 talk_turn 갈래를 더해** 차례 1 이 `tests/fixtures/ai/samples/talk/` 에 둔 견본 JSON 을 제자리(`samples/`)로 옮긴다(구현자 우려 2).

## 지킬 것
AI 호출은 서버에서만 · 키는 서버에만 · Zod 검증. 설계 숫자(ai.effort · thinking · max_tokens.talk_* · timeout)는 설정 키로(회23 은 결과 뒤 요청자 결정 — 지금은 plan 값). 비용 · 횟수로 아이 진행을 끊지 않음(알림과 안전 상한만). 1~3단계 Haiku · 4단계~ Sonnet(AC-8f · AC-8i), 서버 측 대체 모델 블록이 끼어도 글이 이어지는지(a 위험 4 — 계약 표본). 구조화 출력이 속성 차례대로 흘러 tori_en 이 먼저 온다는 추측(a 위험 3)이 틀리면 끝까지 받아 보내는 길로 — 보고 '정할 것'에. H4 가 있으니 컨트롤러가 뒤에 `pnpm ai:contract` 실호출 표본을 찍는다(차례 11 [사람] 몫).

## 완료 · 보고
단위 · 로컬 관문 초록, 통합은 CI. 보고 `task-p13-report.md` '차례 2' 절. SendMessage 한 줄 → 컨트롤러 CI → 검토 묶음 a2(code-reviewer rev-p13 — 8절 회화 턴 실패 · 6.1 대체 모델 · 캐시 · 기록) → fix → 차례 4 브리프(b 작업 1, 앞에 P11 가지 합침 ①).

## 앞 차례 재검토가 넘긴 Minor 셋(review-p13-fix1-code N1~N3 — 이번 차례에 함께 고친다)
- N1: 4단계 목표 턴이 끊기면(인식 실패 · 연결 끊김 뒤 대신 질문) 카드 질문이 붙어 고르기를 건너뜀 → 끊긴 턴 대신 질문은 목표 턴 뒤면 고르기를 먼저 열게.
- N2: '모름' 턴에도 AI 자리를 '예'로 냄 → '모름'은 같은 질문 다시(답 예시) 이니 AI 자리가 아님.
- N3(컨트롤러 결정): AI 질문의 답 예시 · 힌트를 둘 저장 칸은 새로 만들지 않는다 — 토리 행의 '다시 쓸 토리 차례'(응답 전문, 5절)에서 b 가 읽어 쓴다. 마이그레이션 없음(C89 그대로).
- a2 검토에 넘김: spec-trace 는 묶음 plan 의 AC 토큰만 세므로 AC-15b 통합 시험 이름을 글자로 대조한다.

