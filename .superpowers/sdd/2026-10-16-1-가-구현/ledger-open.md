# 열린 장부(1-가 구현, 2026-10-17 00:5x 시작)

검토 루프의 열린 항목만 둔다(공통 규칙). 닫힌 항목은 `ledger-closed.md` 로 옮긴다. plan 의 완료 보고 · 검토 보고가 원문이고 여기는 상태표다.

## 구현하며 확인할 것

| 항목 | 어디서 확인 | 출처 |
|---|---|---|
| SDK `zodOutputFormat` 이 status enum 을 description 으로 옮김 — '규격 깨짐 status' 실패 수를 관찰표에 | H4 뒤 `pnpm seed:check --probe` · P8 첫 표본 | review-p05a M-3 · review-p05a-2 |
| between_tools(생각 끔) + 구조화 출력을 함께 보내면 400 인지 | H4 뒤 P5a `--probe`(GA 길) · P9c 계약 `talk_config.*`(베타 길) | plan-p05a 위험 6 · plan-p09a 확인할 사실 1 |
| `ANTHROPIC_BASE_URL` 알림 줄 실기(키가 있어야 닿음) | H4 뒤 첫 `--probe` | review-p05a-2 N-1(컨트롤러 고침) |
| P9c 에 넘길 메모 일곱(시계 인자 꼴 · 단가 0 경고 · 거절 홉 from.model · 회화 턴 첫 문장 전 타임아웃 재시도 · e2e 501 등) | P9c 브리프 | review-p09a 8절 |
| `seed/model-prices.json` opus-4-8 행 `thinkingDefault` 'none' | P9a 가 P6a 와 합쳐진 뒤(P6 몫) | plan-p09a 작업 3 (나) |
| P4a `bandOf` · `Band` ↔ P2a `src/core/level-band.ts` 중복 | P5b · P10 구현 때 하나로 | plan-p04a 완료 보고 · 바탕 합침 e08eaba |
| P5a `priceOf` · `costOf` → P9a `cost.ts` 로 통합 | P9a 합침 뒤 | plan-p09a '다른 P 에 넘길 것' |

## 남은 우려

| 항목 | 상태 | 출처 |
|---|---|---|
| P6a 묶음 2: 3인칭 단수 검출은 he · she · it 주어만 · 활용형은 규칙 생성(표본만 봄) · 둘째 주제 묶음이 배정 수업 경계와 한 칸 어긋남 · 1~3단계 사전은 후보 앞 125 | design-reviewer 1차(묶음 0 · 2 · 1) 와 묶음 1 뒤 예문 재검사 | task-p06a-report '묶음 2' |
| 4~12단계 후보의 단계 경계가 거침(7~9 에 A1 86) | 묶음 3 · 4 에서 다듬음 | task-p06a-report '묶음 0' |

## 잠정 값(요청자 확인 전)

| 값 | 지금 | 확인 |
|---|---|---|
| H5 단원 틀 값(1~3구간 25 대 30 등) · testMix · speaking.answer_max_seconds 30 · 30 · 60 · 150 | settings.json · level-specs 에 12절 잠정 · 제안 값 | 읽기용 쪽 결정 1~4(https://claude.ai/artifact/99e44UMgVDD2svrd5h7Q93) |
