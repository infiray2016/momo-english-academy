# 닫힌 장부(1-가 구현)

검토자가 다시 읽지 않는 닫힌 항목. 열린 것은 `ledger-open.md`.

| 항목 | 닫힌 근거 | 때 |
|---|---|---|
| H5 단원 틀 값 잠정(1~3구간 25 대 30 · testMix · speaking.answer_max_seconds) | C66 확정, settings 12절 대조 0, testMix 36행 = C66 표(review-p06a 5절) | 2026-10-17 01:0x |
| P6a 묶음 2 ① 3인칭 단수 검출은 he · she · it 주어만 | 알고 둔 거짓 음성으로 근거 문서 (4)에 적힘, 거짓 양성은 I-5 로 따로(review-p06a 5절) | 2026-10-17 03:1x |
| P6a 묶음 2 ③ 둘째 주제 묶음이 배정 경계와 한 칸 어긋남 | 두 묶음 짝짓기의 한계로 받아들임, P8 표본에서 봄(review-p06a 5절) | 2026-10-17 03:1x |
| P6a 묶음 2 ④ 1~3단계 사전은 후보 앞 125 | 묶음 1 뒤 확정 vocab 으로 960 예문 RESULT 0(review-p06a 5절) | 2026-10-17 03:1x |
| 4~6단계 후보의 단계 경계 | CEFR-J B1 · B2 낱말은 아이 구체어로 근거 문서 (1)과 맞음(review-p06a 5절) | 2026-10-17 03:1x |
| P9b 코드 검토 지적 I 3 · M 5(review-p09b) + 재검토 N-1 | fix 1 여덟 ADDRESSED(핵심 셋 재현) · N-1 컨트롤러 고침(review-p09b-2), biome 0 · 단위 234 · 통합 30 · 공용 변화 0 | 2026-10-17 04:2x |
| P6a 묶음 2 ② 활용형 규칙 생성(easts · corns · worlds) | fix 1 M-9 반영(forms [] · 뜻 정리), review-p06a-2 6절 '닫힘'. 새 낱말 dry 는 N-3 으로 fix 2 | 2026-10-17 05:0x |
| P5b 검토 지적(코드 M 7 · 화면 I 2 · M 8 · 재검토 I-A · M-A · M-B) | fix 1 · fix 2 ADDRESSED, review-p05b-design-3 Approved(M-C 는 P11 장부), 컨트롤러 재확인 240 · 34 · 18 · 7 | 2026-10-17 13:0x |
| P6a 재검토 N-1~N-4 · contact 추가 꼴(괄호 지역 · 국가 번호) | fix 2 반영 — 띄어 쓴 '로 + 수 + 단위' 여덟 안 걸림 · 주소 여덟 걸림 · 괄호 전화 걸림(컨트롤러 재현), D5 차례 · head · dry · 7단계 후보 순위 되돌림; 2차 검토에서 다시 봄 | 2026-10-17 13:0x |
| P6a 뺀 32 가운데 20 이 7단계 앞 150 에 들어 원래 후보 30 이 밀린 것 | 묶음 3 에서 원래 순위 1~150 기본 · 당긴 낱말(dialogue · marathon · finally · tire)만큼 밀린 것은 다음 단계로 · 빠지는 낱말 94(초등 권장 0) 근거 문서 표(C68 아님 — 브리프 2절 1 규칙) | 2026-10-17 13:0x |
| P9c 에 넘길 메모 일곱(review-p09a 8절) · 둘(review-p09b 6절) · 흐름 차례 · SettingValues 겹침 | P9c 구현이 반영 표로 모두 반영, review-p09c 7절 '닫힘' | 2026-10-17 13:3x |
| P9 `dailyUsage(profileId)` → `string \| null` 넓히기(review-p09c M-2) | P9c fix 1 store.ts:119~120 · run.ts:317(NO_PROFILE_ID 삭제), review-p09c-2 ADDRESSED · 장부 닫힘 판정. 직접 단언은 fix 2 N-3 | 2026-10-17 14:4x |
| P6 contact 말소리 숫자 꼴(`0 1 0 …` · `zero one zero`)은 거짓 양성 위험으로 넣지 않고 사람 표본 몫(컨트롤러 판정, fix 2 에서 괄호 지역 · 국가 번호는 더함 → ledger-closed) | 근거 문서 1206줄에 넣지 않는 까닭과 사람 표본 몫으로 적힘(review-p06a-3 5절) | 2026-10-17 15:1x |
| 7~12단계 후보의 단계 경계가 거침(7~9 에 A1 86) | 컨트롤러 판정(후보 순위 그대로)대로 7~12 를 정했고 근거 문서 CEFR-J 표 1~12 에 남은 수 적음, 지문 난도는 P8 표본에서(review-p06a-3 5절) | 2026-10-17 15:1x |
| 동음이의어 board · bored(bore 는 candidates-9 124위) | bore(9단계)의 활용형 bored 로 vocab 에 들어 동음이의어 검사 0(review-p06a-3 5절) | 2026-10-17 15:1x |
| P6a: he-she · we-they 검출기는 낱말만 잡아 명사 주어 문장은 사람 표본 몫 · board · bored 는 묶음 4 끝에서 · 빠지는 낱말 94(초등 권장 0, 묶음 4 뒤 누계) · 10단계 후보 앞에 pole · pipe · port(9단계에서 넘김) | 명사 주어 놓침은 근거 문서 '알고 둔 한계' 표, 빠지는 낱말 누계 242 표(검토자 재현 같음), 초등 권장 밖은 일부러 뺀 8, pole · pipe · port 는 10단계 앞(review-p06a-3 5절) | 2026-10-17 15:1x |
| 개발용 로컬 DB 스크립트(스크래치패드 `devdb/dev-pg.mts` — 내장 Postgres 54329 · Supabase 역할 흉내 · 마이그레이션 · `tests/fixtures/settings.ts` 설정 시드, 2026-10-17 14:2x 검증)를 저장소 `scripts/dev-db.ts`(`pnpm db:dev`)로 들일지 — 요청자가 로컬에서 화면을 보는 길(접근 코드 제출이 DB 를 요구) | C70 — P10a 작업 1(가벼운 루프) `scripts/dev-db.ts`(`pnpm db:dev`) · devSeedTree 로 옮김(P7b 에서 뺌) | 2026-10-17 18:3x |
