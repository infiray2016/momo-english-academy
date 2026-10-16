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
| P8 시드 브리프: 말하기 1~2단계 '질문 답' 질문은 그림 없이 답할 수 있어야 함(C67 (5)); 검증기가 말하기 3~12단계 평가 question 의 '허용 답 셋 이상'(C66)을 세지 않음(check-assessment.ts 228 · 324) — P8 평가 묶음 전 결정 | P8 브리프 · P4c 수정 여부 | review-p05b-design 범위 밖 1 · review-p06a 메모 2 · 3 |
| P4 검사 규칙: '한국어 뜻이 있으면 안 되는 단계'(토리 이야기 7~12 구간 · 질문 5단계 이상) | P4 수정 또는 P8 브리프 | review-p05b-design M-7 · C67 (7) |
| P6 contact 범주 추가 꼴: 괄호 지역 번호 `(02)123-4567` · 국가 번호 `+82 10-…` · 말소리 숫자 꼴(`0 1 0 …` · `zero one zero`) | P6a fix 1 뒤 또는 2차 검토 | review-p09b P6 메모 1 |
| speakingRulesOf 가 9~12단계에서도 문법 지적 1개 허용 — 단계 평가 질문 문항에 닿음(6.2 는 4~8단계만) | P12 단계 평가 화면 | review-p09b P6 · P12 메모 2 |
| P5c: 문항 번호는 cell.items · `reviewPathOf` 공용 · `resolveSeedFile` realpath 확인 · AC-7f 절반(reviews 한 행) 시험 · cellHash 맞춘 풀이 기록 견본 | P5c 브리프 | review-p05b 8절 |
| P9c: 흐름 차례(answerTextOf → JSON.parse → prepareAnswer → wireSchema → validate → normalize → checkOutputFields → applyChecks → historyEntry) · `SettingValues` 이름 겹침 | P9c 브리프 | review-p09b 6절 · review-p09b-2 4절(P9c 3 생각 꺼내기 · buildAiRequest 의 RangeError 는 호출부 결함 — 설정 문제 · AI 실패로 세지 않고 서버 오류, ai_calls 행 없음 · P9c 4 앱 연락처 정규식 다시 쓸 때 BUILTIN_CONTACT_PATTERNS 의 keepsPrefix 로 1번 묶음 되돌림, createMasker · checkOutputFields 그대로) |
| P11: 생각 꺼내기 기록은 fillName 전 historyEntry 로 저장 · turn = history.length + 1 · 걸린 칸 뒤 빈 글은 보이지 않음 · 말하기 6 · 8단계 그림 · 질문 차례 · 쓰기 6단계 생각 꺼내기 결과 자리 · 조립 칸 수 · 4~5단계 제출 단위 · 갈래별 안내 문장 | P11 브리프 | review-p09b 6절 · review-p05b-design 메모 · 범위 밖 2 |
| P10: 화면 방향(목업 가로 1180 · 시험 세로 820) · AREA_TONE hex → board 토큰 · 줄바꿈(keep-all) · 글꼴 입힌 뒤 크기 시험 다시 | P10 브리프 | review-p05b-design 메모 · review-p05b 메모 |
| P6c(H6 목업): 영어 문장의 한국어 뜻 반말 · B_LevelTest '고르세요' → 해요체 · B_Reading 3단계 지문 옆 단어 그림 · B_Speaking 따라 말하기 뜻 · B_W3_Order '다시 듣기' 근거 | P6c 브리프 | review-p05b-design 메모 |
| 시드 검사에 '한국어 뜻이 있으면 안 되는 단계' 규칙(말하기 질문 ko 는 `questions.koMeaning` 거짓인 단계에서 비어야 함 · 이야기 ko 는 7~12 구간 없음) | P4 보강 또는 P6a 2차 검토 | review-p05b-design M-7 · P5b fix 1 보고 범위 밖 |
| P7 check-ids 허용 목록에 화면 구조 수 `PASSAGE_PICTURE_UNTIL_LEVEL = 4`(common.tsx, 12절 키 아님) | P7 plan · 브리프 | P5b fix 1 다르게 한 것 3 |
| P6b 작업 3 그림 목록은 P6a fix 1 vocab 으로 다시 뽑는다(4단계 bread · letter · pilot 들어옴 · plant · toast · dentist · uniform · seat 빠짐 · head 2단계 · old 1단계 · many 1단계 기능어) | P6b 작업 3 브리프 | P6a fix 1 보고 알릴 것 1 · 2 |

## 남은 우려

| 항목 | 상태 | 출처 |
|---|---|---|
| P6a 묶음 2 ②: 활용형은 규칙 생성 — 표본에서 쓰지 않는 꼴(easts · corns · worlds, review-p06a M-9) | P6a fix 1 뒤 재검토 | review-p06a 5절(① · ③ · ④ 는 닫힘 → ledger-closed) |
| 7~12단계 후보의 단계 경계가 거침(7~9 에 A1 86) | 묶음 3 · 4 | task-p06a-report '묶음 0' · review-p06a 5절(4~6 몫 닫힘) |
| 동음이의어 board · bored(bore 는 candidates-9 124위) | 묶음 4 끝 | review-p06a 4절 약한 곳 2 |
| P6a 뺀 32 낱말이 7단계 후보 끝에 있어 묶음 3 의 150 선정에서 다른 후보를 밀 수 있음 · he-she · we-they 검출기는 낱말만 잡아 명사 주어 문장은 사람 표본 몫 · board · bored 는 묶음 4 끝에서 | 묶음 3 · 4 브리프 · 2차 검토 | P6a fix 1 보고 남은 우려 1~3 |

## 잠정 값(요청자 확인 전)

| 값 | 지금 | 확인 |
|---|---|---|
| (없음 — H5 는 C66 으로 확정, ledger-closed) | | |
