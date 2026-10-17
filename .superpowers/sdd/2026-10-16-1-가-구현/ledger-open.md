# 열린 장부(1-가 구현, 2026-10-17 00:5x 시작)

검토 루프의 열린 항목만 둔다(공통 규칙). 닫힌 항목은 `ledger-closed.md` 로 옮긴다. plan 의 완료 보고 · 검토 보고가 원문이고 여기는 상태표다.

## 구현하며 확인할 것

| 항목 | 어디서 확인 | 출처 |
|---|---|---|
| P7a `scripts/seed-load.ts` `finally { await handle.close() }` 가 던지면 적재 결과를 덮어 '예상 밖 오류' 종료 2(넣은 것은 그대로, postgres.js end 는 거의 안 던짐) — 접속 확인 쪽처럼 닫기 실패를 삼키기 | P7b 브리프 덤(가벼운 루프) | review-p07a-2 4절 · task-p07a-fix2-report 알릴 것 |
| SDK `zodOutputFormat` 이 status enum 을 description 으로 옮김 — '규격 깨짐 status' 실패 수를 관찰표에 | H4 뒤 `pnpm seed:check --probe` · P8 첫 표본 | review-p05a M-3 · review-p05a-2 |
| between_tools(생각 끔) + 구조화 출력을 함께 보내면 400 인지 | H4 뒤 P5a `--probe`(GA 길) · P9c 계약 `pnpm ai:contract --case talk_config.haiku,talk_config.sonnet`(베타 길 — P9c 구현됨, dry-run 에 요청 꼴 확인) | plan-p05a 위험 6 · plan-p09a 확인할 사실 1 · task-p09c-report |
| `ANTHROPIC_BASE_URL` 알림 줄 실기(키가 있어야 닿음) | H4 뒤 첫 `--probe` | review-p05a-2 N-1(컨트롤러 고침) |
| `seed/model-prices.json` opus-4-8 행 `thinkingDefault` 'none'(P6a 바탕 6bd6015 의 규격에는 'none' 이 없어 P9a 와 합친 뒤에만 가능) · 첫 개발용 적재(P7b [사람] 1) 전에 반드시(늦으면 새 적용일 행) | P9a 가 P6a 와 합쳐진 뒤 · 첫 개발용 적재 전(P6 몫) | plan-p09a 작업 3 (나) · plan-p07a 위험 13 |
| P4a `bandOf` · `Band` ↔ P2a `src/core/level-band.ts` 중복 | P5b · P10 구현 때 하나로 | plan-p04a 완료 보고 · 바탕 합침 e08eaba |
| P5a `priceOf` · `costOf` → P9a `cost.ts` 로 통합 | P9a 합침 뒤 | plan-p09a '다른 P 에 넘길 것' |
| P8 시드 브리프: 말하기 1~2단계 '질문 답' 질문은 그림 없이 답할 수 있어야 함(C67 (5)); 검증기가 말하기 3~12단계 평가 question 의 '허용 답 셋 이상'(C66)을 세지 않음(check-assessment.ts 228 · 324) — P8 평가 묶음 전 결정 | P8 브리프 · P4c 수정 여부 | review-p05b-design 범위 밖 1 · review-p06a 메모 2 · 3 |
| P4 검사 규칙: '한국어 뜻이 있으면 안 되는 단계'(토리 이야기 7~12 구간 · 질문 5단계 이상) | P4 수정 또는 P8 브리프 | review-p05b-design M-7 · C67 (7) |
| speakingRulesOf 가 9~12단계에서도 문법 지적 1개 허용 — 단계 평가 질문 문항에 닿음(6.2 는 4~8단계만) | P12 단계 평가 화면 | review-p09b P6 · P12 메모 2 |
| P5c: 문항 번호는 cell.items · `reviewPathOf` 공용 · `resolveSeedFile` realpath 확인 · AC-7f 절반(reviews 한 행) 시험 · cellHash 맞춘 풀이 기록 견본 | P5c 브리프 | review-p05b 8절 |
| P11: 생각 꺼내기 기록은 fillName 전 historyEntry 로 저장 · turn = history.length + 1 · 걸린 칸 뒤 빈 글은 보이지 않음 · 말하기 6 · 8단계 그림 · 질문 차례 · 쓰기 6단계 생각 꺼내기 결과 자리 · 조립 칸 수 · 4~5단계 제출 단위 · 갈래별 안내 문장 | P11 브리프 | review-p09b 6절 · review-p05b-design 메모 · 범위 밖 2 |
| P10: 화면 방향(목업 가로 1180 · 시험 세로 820) · AREA_TONE hex → board 토큰 · 줄바꿈(keep-all) · 글꼴 입힌 뒤 크기 시험 다시 | P10 브리프 | review-p05b-design 메모 · review-p05b 메모 |
| P6c(H6 목업): 영어 문장의 한국어 뜻 반말 · B_LevelTest '고르세요' → 해요체 · B_Reading 3단계 지문 옆 단어 그림 · B_Speaking 따라 말하기 뜻 · B_W3_Order '다시 듣기' 근거 | P6c 브리프 | review-p05b-design 메모 |
| 시드 검사에 '한국어 뜻이 있으면 안 되는 단계' 규칙(말하기 질문 ko 는 `questions.koMeaning` 거짓인 단계에서 비어야 함 · 이야기 ko 는 7~12 구간 없음) | P4 보강 또는 P6a 2차 검토 | review-p05b-design M-7 · P5b fix 1 보고 범위 밖 |
| P7 check-ids 허용 목록에 화면 구조 수 `PASSAGE_PICTURE_UNTIL_LEVEL = 4`(common.tsx, 12절 키 아님) | P7 plan · 브리프 | P5b fix 1 다르게 한 것 3 |
| P6b 작업 3 그림 목록은 P6a 묶음 4 끝의 vocab 으로 다시 뽑는다(fix 1: 4단계 bread · letter · pilot 들어옴 · plant · toast · dentist · uniform · seat 빠짐 · head 2단계 · old 1단계 · many 기능어; 묶음 4 끝: 초등 권장 16(math 포함, review-p06a-3) 맞바꿈으로 4단계에 kitchen · tape · tail · touch · ice · mail · point · skin 들어올 수 있음 — 보고 '알릴 것'대로) | P6b 작업 3 브리프(P6a 묶음 4 뒤) | P6a fix 1 보고 알릴 것 1 · 2 · 묶음 4 알림 |
| P8 1-가 실시드에 읽기 · 쓰기 단원 0(정규 10 + 보강 3 · 변형 2)과 1단계 단계 평가 level.test_forms 3벌(C68 (1)); 다시 만든 칸은 시드 전체 최대 개정 + 1, 사람 확인 '고침'은 정정 + 1; 토리 이야기 title · generation; 적재 보고 `--json` inserted 를 seed/manifest 에; P7 완료 판정에서 옮긴 수업 적재(dev-load 세 영역 · through 1) | P8 브리프 · 완료 판정 | plan-p07a '다른 P 에 넘길 것' · C68 (1) · (5) |
| P10 · P11 · P12: 시드는 `src/server/seed/read.ts` 로 읽고 단원 · 단계 평가 · 배치 평가 시작 때 `currentSeedRevision()` 을 start_revision 에 남겨 그 값으로 읽는다. 진행 중 세션은 `sessions.lesson_id` 행을 끝까지 | P10 · P11 · P12 plan · 브리프 | plan-p07a '다른 P 에 넘길 것' |
| P6: 첫 개발용 적재(P7b [사람] 1) 뒤 규격 파일을 고치면 판을 올린다(개정 G + 1 · 정정 + 1) — 안 올리면 version-content-changed 로 막힘 | P6a 커밋 뒤 · P6b 작업 3 이후 | plan-p07a 위험 6 |
| 1-나: seed/reviews → seed_reports(신고자 개발자, C68 (3)) · 옛 개정 행의 정정을 싣는 자리(파) · main 작업의 '신고 판단 기록 · 다시 계산' 단계 · P4 규격의 토리 이야기 title · generation 필수(타, P8 브리프에도) · 2차 단원 미리보기는 startRevision = currentSeedRevision() | 1-나 plan | plan-p07a 정할 것 마 · 타 · 파 · C68 |
| P8: 1~4단계 평가 지문의 그림 낱말이 '무엇' 질문의 정답과 같으면 그림이 답을 가리킴(견본 12-01) — 평가 문항은 정답 낱말이 그림 줄에 들지 않게 쓰거나 화면이 보기 낱말을 그림 줄에서 빼는 규칙 | P8 브리프(또는 P11 화면 규칙) | review-p05b-design-2 넘길 메모 |
| P6c: B_LevelTest 에 1~4단계 평가 지문 그림 줄 자리(읽어 주기 없음) · 토리 이야기 새 화면에 읽어 주기 자리 · 새 단어 표시 색(노랑 카드 위 종이 바탕 · 굵게 vs 목업 종이 위 노랑) | P6c 브리프 | review-p05b-design-2 넘길 메모 |
| P10 · P11 · P5c: ActivityCard 기본 글자 20px — 다른 틀도 20px 줌 · 소리 자리의 저절로 읽기와 다시 읽기(평가 지문은 없음) · 칸 화면 틀 -mx-6 과 820 가로 넘침 시험 유지 | P10 · P11 · P5c 브리프 | review-p05b-design-2 넘길 메모 |
| P9: MIN_RETRY_MS 1초 — 2차 설정 화면의 ai.timeout_seconds.* 범위 검사에 하한(1-나 3) · P11 은 AiOutcome 실패 갈래마다 화면 길(config · safety_cap · output_blocked · RangeError 는 서버 오류) · 첨삭 refusals 는 attempts 에 · 빌드 추적 '/*' 첫 프리뷰 확인 · 1-나 dueCostAlerts → createAlertOnce scope · preCallGate ai_status 상태 · P6 forbidden 목록 iu 컴파일 통과 | P9c fix 1 · P11 · 1-나 · P6 브리프 | review-p09c 3절 M-2 · 8절 |
| P11: 쓰기 평가 '빈칸 채우기'에서 문장 빈칸(흰 상자)과 아래 답 칸이 쓰는 자리 둘로 보임 — 목업 B_LevelTest 대로 답을 빈칸 안에 넣는다(P5b 는 보기 화면이라 그대로) | P11 브리프 | review-p05b-design-3 M-C |
| P9c · P11 · 1-나: 시드 contact 범주 값이 바뀜(한국어 주소 앞보기 좁힘 · 괄호 지역 번호 · 국가 번호 추가, P6a fix 2) — 실행 때 파일로 읽어 코드 변화 없음. P9c 계약 · 관찰과 P11 e2e 는 P6a 합친 뒤 실제 목록으로 한 번 더 | P9c 검토 메모 · P11 브리프 | P6a fix 2 + 묶음 3 보고 알릴 것 |
| P7b: P7a 의 수는 모두 파일 맨 위 대문자 상수라 plan-p07b 허용 규칙이 이미 뺌(허용 목록에 따로 넣을 것 없음, `CONNECTIONS` 는 scripts/ 라 훑기 밖, 시험 고정 값은 design-number 대상 아님 — fixture-setting 규칙이 시험 파일을 보는지 확인) · dev-load 입력 `--complete-through <n> --areas reading,writing,speaking` · 수업 전 `--reference-only` · `--areas` 공백은 fix 1 에서 다듬음(review-p07a-2 확인) · 접속은 `MIGRATION_DATABASE_URL` 하나 · 적재 중 DB 오류도 종료 2(review-p07a-2 확인, 작업 파일은 0 아님만 봄) | P7b 브리프 | task-p07a-report · review-p07a 8절 |
| P8: 행이 있는 단원 · 벌에 새로 생긴 칸(보강 수 늘림 등)은 적재 앞 DB 최대 개정을 넘어야 함(new-cell-in-open-group) · 적재 보고 inserted → seed/manifest | P8 브리프 | review-p07a 8절 |
| P10~P12: read.ts 로 읽고 start_revision 에 currentSeedRevision() · 배치 answer 열은 answerNo · accepted · sentence 가운데 있는 것만 · 회화 평가 카드 장 item_type 'talk-sheet' | P10 · P11 · P12 브리프 | review-p07a 8절 |
| 1-나: 회화 적재 때 `--areas` 에 talk 추가 · 토리 이야기 title · generation 필수 전엔 story-field-missing 거부 | 1-나 plan | review-p07a 8절 |

## 남은 우려

| 항목 | 상태 | 출처 |
|---|---|---|

## 잠정 값(요청자 확인 전)

| 값 | 지금 | 확인 |
|---|---|---|
| (없음 — H5 는 C66 으로 확정, ledger-closed) | | |
