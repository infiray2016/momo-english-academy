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
| P7a `scripts/seed-load.ts` `finally { await handle.close() }` 가 던지면 적재 결과를 덮어 '예상 밖 오류' 종료 2(넣은 것은 그대로, postgres.js end 는 거의 안 던짐) — 접속 확인 쪽처럼 닫기 실패를 삼키기 | P7b 덤: seed-load finally 의 close 실패를 삼켜 적재 결과 · 종료 코드 그대로(시험 1, review-p07b 5절 닫힘) | 2026-10-17 22:0x |
| P7 check-ids 허용 목록에 화면 구조 수 `PASSAGE_PICTURE_UNTIL_LEVEL = 4`(common.tsx, 12절 키 아님) | P7b check-ids 허용 목록 · 맨 위 대문자 상수 규칙으로 빠짐(review-p07b 5절 닫힘) | 2026-10-17 22:0x |
| P7b: P7a 의 수는 모두 파일 맨 위 대문자 상수라 plan-p07b 허용 규칙이 이미 뺌(허용 목록에 따로 넣을 것 없음, `CONNECTIONS` 는 scripts/ 라 훑기 밖, 시험 고정 값은 design-number 대상 아님 — fixture-setting 규칙이 시험 파일을 보는지 확인) · dev-load 입력 `--complete-through <n> --areas reading,writing,speaking` · 수업 전 `--reference-only` · `--areas` 공백은 fix 1 에서 다듬음(review-p07a-2 확인) · 접속은 `MIGRATION_DATABASE_URL` 하나 · 적재 중 DB 오류도 종료 2(review-p07a-2 확인, 작업 파일은 0 아님만 봄) | P7b 구현: 시험 고정 값 · dev-load 입력 · 허용 규칙 모두 반영(review-p07b 5절 닫힘) | 2026-10-17 22:0x |
| P10 화면 방향(목업 가로 1180 · 시험 세로 820) · AREA_TONE → board 토큰 · keep-all · 글꼴 셋 | 코드 몫 review-p10-2-code 6절 · 사진 판정 review-p10-3-design(첫 실행 26장 · 홈 8장 세로 · 가로 넘침 없음) — 남은 e2e:local 7 확인은 ledger-open 별도 행 | 2026-10-17 23:3x |
| 차례 2 화면 M-9 아바타 화면 제목 | 컨트롤러가 C72 문구 그대로 두기로(review-p10-3-design 차례 2 표 NOT ADDRESSED → 닫음) | 2026-10-17 23:3x |
| P10 기기 사실 모으기(`browser.ts` ↔ `mic-state.ts`) · 시작 개정 다섯 테이블 목록(`read.ts` ↔ e2e `household.ts`) 두 벌 | fix 1 `deviceFacts()` · `SEED_REVISION_TABLES` 한 벌 — review-p10-fix1 ADDRESSED(복사본 단위 327 · deps 0 · 통합 16) | 2026-10-17 23:4x |
| P10 홈 e2e AC-5c 둘째 시험이 이름의 두 절(audio-capture · 인식 API 없는 기기)을 증명하지 않음 · 새 쪽이 실제 WebKit API 에 기댐 | fix 2: 새 쪽마다 가짜 음성 + audio-capture.json 대본으로 첫 실행 마이크 확인 — review-p10-fix2-code ADDRESSED(변이 잡힘) | 2026-10-18 00:3x |
| 컨트롤러 핫픽스 둘(한글 이름 칸 defaultValue · <Fragment key={step}>) 타당성 | review-p10-fix2-code: 둘은 짝(키 없으면 PIN DOM 재사용) · 상태 · 다음 조건 · 저장 값 · 초점 그대로 · 뒤로 오면 복원 — 복원 시험은 fix 3 N-1 | 2026-10-18 00:3x |
| P10: P5b e2e:local 7(토큰 전환 뒤 시드 보기 화면) 컨트롤러 확인 | CI e2e-local 작업 성공(run 39051573610 등) — review-p10-5-6-code 장부 판정 | 2026-10-18 02:3x |
| P10 차례 4 · 5 · 6 행(:46 카드 → 목록 · 배치 · 세션 상수 · 이번 주 배치 · AC-2b 세션 단언) · :49 · :50 · :52 · :31 · :41 P10 몫 · :53 코드 몫 | review-p10-5-6-code 장부 판정(C74 되읽기만 남음 — 로마자 행은 열어 둠) | 2026-10-18 02:3x |
| CI 통합 작업이 실패를 가렸음(embedded-postgres 종료 처리기, P3a 부터) | fix 5 pg-local importEmbeddedPostgres + ci.yml 지킴 — CI 7 · 8차 integration 108 통과, 지난 CI 로그 재확인(가려진 실패는 세션 다시 열기 시험 하나) — review-p10-fix5-code ADDRESSED | 2026-10-18 05:1x |
| 마이크 확인 거짓 양성(API 존재만으로 통과) · '못 씀' 되돌릴 길 없음 | fix 5 소리 · 결과 조건 + '다시 확인' 단추 + 안내 문구 — review-p10-fix5-code ADDRESSED(변이 S1 · S2 잡힘) | 2026-10-18 05:1x |
| P10 fix 1 공용 변경 둘(P2 `browser.ts` `deviceFacts()` · P7a `read.ts` 가 새 `src/db/schema/seed-revision.ts` `SEED_REVISION_TABLES` 를 씀)을 바탕에 합칠 때 공용 변경으로 표시 | plan-p10a 완료 보고 '공용 파일' 절에 적힘(edit-p10-done) · P10 78db3a2 → P11 가지 6e09901 합침 | 2026-10-18 06:5x |
| e2e 픽스처: 가짜 음성을 새 쪽마다 손으로 넣는 꼴 → 픽스처 도우미(`speechPage` 꼴)로 — fix 3(review-p10-fix2-code N-2). AC-5c 몫은 닫힘. 리눅스 WebKit(CI ubuntu-24.04) 인식 API 유무는 이제 e2e 가 기대지 않으… | fix 3 반영(review-p10-fix3-code ADDRESSED) · CI 8~11차 e2e 통과(ubuntu WebKit 에 기대지 않음) | 2026-10-18 06:5x |
| P10 차례 4 순수 함수(먼저 시작)가 plan 값 1 과 다르게 한 것 — `ListInput.roundStartedAt`(회차 시작 시각: 세션 행에 회차가 없음) · 거부 까닭 `paused`(부모 확인 대기 · 다음 단계 준비 · 졸업이면 지금 단원의 안 한 수업 안 열림) ·… | review-p10-5-6-code 6절 받음 · plan-p10b 완료 보고 '계획과 다르게 한 것'에 적힘(edit-p10-done) | 2026-10-18 06:5x |
| P10 차례 5 · 6: 홈 `PLACEMENT_OPEN`(home-cards.tsx)과 목록 `SESSION_START_OPEN`(lesson-board.tsx)을 켤 때 함께 보고, 지난 수업 쪽의 글 상자 포스트잇도 같은 고르기로 · 수업 목록 '홈' · '수업 목록' 링크를 bo… | fix 3 · 차례 5 · 6 반영(review-p10-5-6-code 6절 · ledger-closed 33행) | 2026-10-18 06:5x |
| 시도 대기열이 서버의 묶음 전체 거부에서 영영 비지 않음(review-p10-5-6-code M-2) | P11 차례 2 값 6 — 낱낱 거부 · accepted · rejected 둘 다 지움, 단위 '대기열: 50개씩 …' · 통합 '꼴이 틀린 시도는 그 시도만 거부' — review-p11-2-code 장부 판정 닫힘 | 2026-10-18 07:0x |
| 서버 액션 · 서버 함수의 DB 오류는 오류 이름 · Postgres 코드만(safe-error 호출자 · 단위 사례) | P11 차례 2 서버가 safeDbError 를 쓰고 통합 '세션 바탕: DB 오류 로그에 시도 입력 글이 없다' — review-p11-2-code 장부 판정 닫힘. P12 · 1-나 브리프 '지킬 것'에는 그대로 둔다 | 2026-10-18 07:0x |
| 단계 · 활동 전환 때 입력 요소 재사용(첫 실행 핫픽스 꼴)이 배치 · 세션 틀에도 없는지 | P11 차례 3 — 활동마다 조각을 key 로 새로 만듦, review-p11-3-code 장부 판정 닫힘 | 2026-10-18 08:0x |
| P11 차례 3 작은 것 넷(A2 M-1 활동 안 입력 줄 · N-1 상태 줄 aria-live · N-2 정답 보기 고리 틈 · 쪽지 단언 보강) | review-p11-3-code 장부 판정 모두 닫힘 | 2026-10-18 08:0x |
| displayCardsOf 첫 허용 정답만(review-p11-3-code M-1) | P11 차례 4 — 허용 정답 모두에서 대문자 꼴 모음 + 단위 시험, review-p11-4-code 장부 판정 닫힘 | 2026-10-18 09:0x |
| 동음이의어 읽기 두 벌(세션 · 배치) | P11 차례 4 공용 모듈 하나로(AI 층에 안 닿음), review-p11-4-code 장부 판정 닫힘 | 2026-10-18 09:0x |
