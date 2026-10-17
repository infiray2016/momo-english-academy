# 열린 장부(1-가 구현, 2026-10-17 00:5x 시작)

검토 루프의 열린 항목만 둔다(공통 규칙). 닫힌 항목은 `ledger-closed.md` 로 옮긴다. plan 의 완료 보고 · 검토 보고가 원문이고 여기는 상태표다.

## 구현하며 확인할 것

| 항목 | 어디서 확인 | 출처 |
|---|---|---|
| P10 첫 실행 주제 묶음 그림은 지금 `images.word` 로 찾는다(P6a vocab 에 imageKey 가 없어서). P6b(imageKey 207) 가 바탕에 합쳐지면 `vocab.imageKey` 로 바꾸고 묶음 대표 낱말을 카탈로그와 다시 맞댄다 | P6b 합친 뒤(P10 또는 P11) | impl-p10 차례 2 화면 지적 반영 보고 |
| P6b 커밋 전: `CREDITS.md` 의 CEFR-J 인용 꼴을 공식 README(TUFS Tono Laboratory 의 CEFR-J Wordlist 인용 문장)와 맞춘다(구현자 · 검토자 모두 네트워크 없이 미확인) · Twemoji attribution 글은 plan 글자 그대로 확인됨 | P6b 커밋 전(컨트롤러, 웹 조회 1회) | review-p06b-5b N-5 · task-p06b-report 작업 5 fix 1 |
| P8 그림 문항 규칙: 그림만으로 풀 수 없는 헷갈리는 짝(ant · insect, hat · cap, face · smile, head · hair, tired · sleepy 등 review-p06b-5 짝 표 아홉; tired≠sleepy · strong≠arm · face≠neck)은 같은 문항 보기에 함께 두지 않는다. **단원 밖 짝**(leg · knee 등 — 복습 · 배치 평가에서 섞일 수 있음, review-p06b-5b N-4)도 같은 규칙. 검증기 목록(homophones.json 꼴)으로 막을지는 P8 때 13절 한 줄로 | P8 브리프 · P8 때 결정 | review-p06b-5 Important 4 |
| H8 안내: 저장소 변수 PROD_RELEASE 를 끈 채 Vercel Deployment Checks 에 main 작업을 걸면 건너뛴 작업이 성공으로 보여 적재 없이 승격될 수 있음(검토자 기억, 원문 · Vercel 동작 미확인) — H8 때 확인하고 10절 '첫 배포에서 보류 확인'에 한 줄 | H8 안내 · plan-p07b [사람] 7 | review-p07b 6절 |
| 쓰기 4~5단계 '고칠 곳 최대 1'(정본 3.3)을 넘는 시드 값을 막는 자동 검사가 없음(12절 키 없음 · check-ids 는 사전 단계만) — 2차 설정 화면 때 키를 둘지 | 2차 · P8 브리프에 한 줄 | review-p07b 6절 |
| P8 수업 · 평가 시드 문장 규칙: 그림이 붙는 문장(그림 문제 · 새 단어 미리보기 · 그림 턴)은 그림의 색 · 모습과 맞춘다(P6b `tests/.tmp/p06b/sheet.html` 참고). vocab 예문 18 은 P6b 작업 3 보충에서 그림에 맞춤 | P8 브리프 | task-p06b-report 작업 3 결정 1 · 컨트롤러 판정 |
| SDK `zodOutputFormat` 이 status enum 을 description 으로 옮김 — '규격 깨짐 status' 실패 수를 관찰표에 | H4 뒤 `pnpm seed:check --probe` · P8 첫 표본 | review-p05a M-3 · review-p05a-2 |
| between_tools(생각 끔) + 구조화 출력을 함께 보내면 400 인지 | H4 뒤 P5a `--probe`(GA 길) · P9c 계약 `pnpm ai:contract --case talk_config.haiku,talk_config.sonnet`(베타 길 — P9c 구현됨, dry-run 에 요청 꼴 확인) | plan-p05a 위험 6 · plan-p09a 확인할 사실 1 · task-p09c-report |
| `ANTHROPIC_BASE_URL` 알림 줄 실기(키가 있어야 닿음) | H4 뒤 첫 `--probe` | review-p05a-2 N-1(컨트롤러 고침) |
| `seed/model-prices.json` opus-4-8 행 `thinkingDefault` 'none'(P6a 바탕 6bd6015 의 규격에는 'none' 이 없어 P9a 와 합친 뒤에만 가능) · 첫 개발용 적재(P7b [사람] 1) 전에 반드시(늦으면 새 적용일 행) | P9a 가 P6a 와 합쳐진 뒤 · 첫 개발용 적재 전(P6 몫) | plan-p09a 작업 3 (나) · plan-p07a 위험 13 |
| P4a `bandOf` · `Band` ↔ P2a `src/core/level-band.ts` 중복 — P10 은 안 함(새 코드는 level-band 만 씀) | P11 또는 P12 구현 때 하나로 | plan-p04a 완료 보고 · 바탕 합침 e08eaba · review-p10-2-code 5절 9 |
| P5a `priceOf` · `costOf` → P9a `cost.ts` 로 통합 | P9a 합침 뒤 | plan-p09a '다른 P 에 넘길 것' |
| P8 시드 브리프: 말하기 1~2단계 '질문 답' 질문은 그림 없이 답할 수 있어야 함(C67 (5)); 검증기가 말하기 3~12단계 평가 question 의 '허용 답 셋 이상'(C66)을 세지 않음(check-assessment.ts 228 · 324) — P8 평가 묶음 전 결정 | P8 브리프 · P4c 수정 여부 | review-p05b-design 범위 밖 1 · review-p06a 메모 2 · 3 |
| P4 검사 규칙: '한국어 뜻이 있으면 안 되는 단계'(토리 이야기 7~12 구간 · 질문 5단계 이상) | P4 수정 또는 P8 브리프 | review-p05b-design M-7 · C67 (7) |
| speakingRulesOf 가 9~12단계에서도 문법 지적 1개 허용 — 단계 평가 질문 문항에 닿음(6.2 는 4~8단계만) | P12 단계 평가 화면 | review-p09b P6 · P12 메모 2 |
| P5c: 문항 번호는 cell.items · `reviewPathOf` 공용 · `resolveSeedFile` realpath 확인 · AC-7f 절반(reviews 한 행) 시험 · cellHash 맞춘 풀이 기록 견본 | P5c 브리프 | review-p05b 8절 |
| P11: 생각 꺼내기 기록은 fillName 전 historyEntry 로 저장 · turn = history.length + 1 · 걸린 칸 뒤 빈 글은 보이지 않음 · 말하기 6 · 8단계 그림 · 질문 차례 · 쓰기 6단계 생각 꺼내기 결과 자리 · 조립 칸 수 · 4~5단계 제출 단위 · 갈래별 안내 문장 | P11 브리프 | review-p09b 6절 · review-p05b-design 메모 · 범위 밖 2 |
| P10: P5b `pnpm e2e:local` 7(시드 보기 화면이 토큰 전환 뒤에도 같은지)을 컨트롤러가 확인 — 3001 dev 서버를 끈 뒤 | P10 커밋 전 | review-p10-2-code 6절(구현자 보고만 있음) |
| P6c(H6 목업): 영어 문장의 한국어 뜻 반말 · B_LevelTest '고르세요' → 해요체 · B_Reading 3단계 지문 옆 단어 그림 · B_Speaking 따라 말하기 뜻 · B_W3_Order '다시 듣기' 근거 | P6c 브리프 | review-p05b-design 메모 |
| 시드 검사에 '한국어 뜻이 있으면 안 되는 단계' 규칙(말하기 질문 ko 는 `questions.koMeaning` 거짓인 단계에서 비어야 함 · 이야기 ko 는 7~12 구간 없음) | P4 보강 또는 P6a 2차 검토 | review-p05b-design M-7 · P5b fix 1 보고 범위 밖 |
| P6b 작업 3 그림 목록은 P6a 묶음 4 끝의 vocab 으로 다시 뽑는다(fix 1: 4단계 bread · letter · pilot 들어옴 · plant · toast · dentist · uniform · seat 빠짐 · head 2단계 · old 1단계 · many 기능어; 묶음 4 끝: 초등 권장 16(math 포함, review-p06a-3) 맞바꿈으로 4단계에 kitchen · tape · tail · touch · ice · mail · point · skin 들어올 수 있음 — 보고 '알릴 것'대로) | P6b 작업 3 브리프(P6a 묶음 4 뒤) | P6a fix 1 보고 알릴 것 1 · 2 · 묶음 4 알림 |
| P8 1-가 실시드에 읽기 · 쓰기 단원 0(정규 10 + 보강 3 · 변형 2)과 1단계 단계 평가 level.test_forms 3벌(C68 (1)); 다시 만든 칸은 시드 전체 최대 개정 + 1, 사람 확인 '고침'은 정정 + 1; 토리 이야기 title · generation; 적재 보고 `--json` inserted 를 seed/manifest 에; P7 완료 판정에서 옮긴 수업 적재(dev-load 세 영역 · through 1) | P8 브리프 · 완료 판정 | plan-p07a '다른 P 에 넘길 것' · C68 (1) · (5) |
| P10 · P11 · P12: 시드는 `src/server/seed/read.ts` 로 읽고 단원 · 단계 평가 · 배치 평가 시작 때 `currentSeedRevision()` 을 start_revision 에 남겨 그 값으로 읽는다. 진행 중 세션은 `sessions.lesson_id` 행을 끝까지 | P10 · P11 · P12 plan · 브리프 | plan-p07a '다른 P 에 넘길 것' |
| P6: **첫 개발용 적재 끝남(2026-10-17 23:0x, P6a f447bc5 판, 최신 개정 1)** — 이제 규격 파일을 고치면 판을 올린다(개정 G + 1 · 정정 + 1): P6b 의 images.json 207 · vocab imageKey · 예문 35 와 opus-4-8 thinkingDefault 'none'(새 적용일 행)은 다음 적재 때 개정 2 로 | P6b 커밋 · 합친 뒤 적재 | plan-p07a 위험 6 · H3 실행 기록 |
| 1-나: seed/reviews → seed_reports(신고자 개발자, C68 (3)) · 옛 개정 행의 정정을 싣는 자리(파) · main 작업의 '신고 판단 기록 · 다시 계산' 단계 · P4 규격의 토리 이야기 title · generation 필수(타, P8 브리프에도) · 2차 단원 미리보기는 startRevision = currentSeedRevision() | 1-나 plan | plan-p07a 정할 것 마 · 타 · 파 · C68 |
| P8: 1~4단계 평가 지문의 그림 낱말이 '무엇' 질문의 정답과 같으면 그림이 답을 가리킴(견본 12-01) — 평가 문항은 정답 낱말이 그림 줄에 들지 않게 쓰거나 화면이 보기 낱말을 그림 줄에서 빼는 규칙 | P8 브리프(또는 P11 화면 규칙) | review-p05b-design-2 넘길 메모 |
| P6c: B_LevelTest 에 1~4단계 평가 지문 그림 줄 자리(읽어 주기 없음) · 토리 이야기 새 화면에 읽어 주기 자리 · 새 단어 표시 색(노랑 카드 위 종이 바탕 · 굵게 vs 목업 종이 위 노랑) | P6c 브리프 | review-p05b-design-2 넘길 메모 |
| P10 · P11 · P5c: ActivityCard 기본 글자 20px — 다른 틀도 20px 줌 · 소리 자리의 저절로 읽기와 다시 읽기(평가 지문은 없음) · 칸 화면 틀 -mx-6 과 820 가로 넘침 시험 유지 | P10 · P11 · P5c 브리프 | review-p05b-design-2 넘길 메모 |
| P9: MIN_RETRY_MS 1초 — 2차 설정 화면의 ai.timeout_seconds.* 범위 검사에 하한(1-나 3) · P11 은 AiOutcome 실패 갈래마다 화면 길(config · safety_cap · output_blocked · RangeError 는 서버 오류) · 첨삭 refusals 는 attempts 에 · 빌드 추적 '/*' 첫 프리뷰 확인 · 1-나 dueCostAlerts → createAlertOnce scope · preCallGate ai_status 상태 · P6 forbidden 목록 iu 컴파일 통과 | P9c fix 1 · P11 · 1-나 · P6 브리프 | review-p09c 3절 M-2 · 8절 |
| P11: 쓰기 평가 '빈칸 채우기'에서 문장 빈칸(흰 상자)과 아래 답 칸이 쓰는 자리 둘로 보임 — 목업 B_LevelTest 대로 답을 빈칸 안에 넣는다(P5b 는 보기 화면이라 그대로) | P11 브리프 | review-p05b-design-3 M-C |
| P9c · P11 · 1-나: 시드 contact 범주 값이 바뀜(한국어 주소 앞보기 좁힘 · 괄호 지역 번호 · 국가 번호 추가, P6a fix 2) — 실행 때 파일로 읽어 코드 변화 없음. P9c 계약 · 관찰과 P11 e2e 는 P6a 합친 뒤 실제 목록으로 한 번 더 | P9c 검토 메모 · P11 브리프 | P6a fix 2 + 묶음 3 보고 알릴 것 |
| P8: 행이 있는 단원 · 벌에 새로 생긴 칸(보강 수 늘림 등)은 적재 앞 DB 최대 개정을 넘어야 함(new-cell-in-open-group) · 적재 보고 inserted → seed/manifest | P8 브리프 | review-p07a 8절 |
| P10~P12: read.ts 로 읽고 start_revision 에 currentSeedRevision() · 배치 answer 열은 answerNo · accepted · sentence 가운데 있는 것만 · 회화 평가 카드 장 item_type 'talk-sheet' | P10 · P11 · P12 브리프 | review-p07a 8절 |
| 1-나: 회화 적재 때 `--areas` 에 talk 추가 · 토리 이야기 title · generation 필수 전엔 story-field-missing 거부 | 1-나 plan | review-p07a 8절 |
| 서버 액션 · 서버 함수의 DB 오류는 오류 이름 · Postgres 코드만 남긴다 — P10 몫 닫힘(review-p10-fix1 Approved). `src/server/db/safe-error.ts` 의 `dbErrorTag` · `safeDbError`(호출자 아직 없음 — P11 이 처음 쓸 때 단위 사례 더함)를 P11 아이 답 글(attempts) · P12 · 1-나 브리프 '지킬 것'에 넣고 닫는다 | P11 브리프 작성 때 | review-p10-2-code I-1 · review-p10-fix1 |
| P10 fix 1 공용 변경 둘(P2 `browser.ts` `deviceFacts()` · P7a `read.ts` 가 새 `src/db/schema/seed-revision.ts` `SEED_REVISION_TABLES` 를 씀)을 바탕에 합칠 때 공용 변경으로 표시 | P10 커밋 · 합칠 때 | review-p10-fix1 장부 판정 |
| P12: `unitSnapshotOf` 는 쓰기 6~12 의 level_specs 덮기 값을 담지 않는다 — 판정 때 덮기를 함께 보거나 복사본에 담는다 | P12 브리프 | review-p10-2-code 6절 3 · impl-p10 차례 2 알릴 것 3 |
| P10 차례 4 · 5: 홈 카드 → `/<area>/lessons` 는 차례 4 에 생김(지금 404) · `PLACEMENT_OPEN` 을 차례 5 에서 켤 때 AC-2a 첫 e2e 에 href 단언 · 눌러 들어가기(review-p10-3-code M-4)와 배치 전 카드 누름 표시(review-p10-3-design H-M6)를 더함 · **'이번 주 n일'은 배치 세션도 센다(컨트롤러 결정 (가), fix 2) — 오늘 완료는 4절대로 배치 안 셈** · 아는 단어 · 최근 성적 · 끝낸 대화 칸은 P11 · P12 가 채움(입력 형 유지) | 차례 4 · 5 브리프 · fix 2 · P11 · P12 브리프 | impl-p10 차례 3 다르게 한 것 2~5 · review-p10-3-code M-2 · M-4 · review-p10-3-design H-M6 |
| 홈 영역 카드의 아이콘(목업 B_Home4 에 있음, 구현에 없음) — 이모지 · 그림 가운데 무엇으로 그릴지 요청자 시각 결정(표본 쪽) 뒤 P10 마무리 또는 1-나 | 요청자 표본 쪽 · P10 차례 7 화면 검토 | review-p10-3-design H-M5 |
| 홈 부모 꼬리표 높이 48px — 1-나에서 누를 수 있게 되면 56px 이상으로 | 1-나 부모 화면 브리프 | review-p10-3-design 4절 |
| e2e 픽스처: 가짜 음성(`installFakeWebSpeech`)이 기본 page 에만 들어감 — 새로 여는 쪽은 실제 브라우저 인식 API 에 기댐. 리눅스 WebKit(CI ubuntu-24.04)에 인식 API 가 있는지 미확인 — fix 2 I-1 에서 새 쪽마다 넣고, H15 뒤 첫 CI e2e 결과로 확인 | P10 fix 2 · H15 뒤 CI | review-p10-3-code I-1 |
| P10 차례 4 순수 함수(먼저 시작)가 plan 값 1 과 다르게 한 것 — `ListInput.roundStartedAt`(회차 시작 시각: 세션 행에 회차가 없음) · 거부 까닭 `paused`(부모 확인 대기 · 다음 단계 준비 · 졸업이면 지금 단원의 안 한 수업 안 열림) · retry 에 `firstVariant` · `firstRevision` — B2 코드 검토가 판정, 받으면 plan-p10b 완료 보고에 | B2 검토 · plan-p10b 완료 보고 | impl-p10 차례 4 먼저 시작 보고 |
| 컨트롤러 핫픽스(first-run-flow.tsx, 23:4x): 한글 이름 input 비제어(defaultValue) · `<Fragment key={step}>` 로 단계마다 입력 요소 새로 만듦(PIN 요소 재사용으로 이름 칸에 '123456' 남던 결함) — fix 2 보고에 적고 B2 코드 검토가 판정. 한글 조합이 깨진 요청자 브라우저는 미확인(Safari 추정). 다른 화면(배치 · 세션 틀)에서도 단계 전환 때 input 재사용이 없는지 B2 · B3 에서 봄 | fix 2 보고 · B2 · B3 검토 | 요청자 재현 23:3x · 컨트롤러 Chromium CDP 재현 |

## 남은 우려

| 항목 | 상태 | 출처 |
|---|---|---|

## 잠정 값(요청자 확인 전)

| 값 | 지금 | 확인 |
|---|---|---|
| (없음 — H5 는 C66 으로 확정, ledger-closed) | | |
