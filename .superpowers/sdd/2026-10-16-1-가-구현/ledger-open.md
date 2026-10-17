# 열린 장부(1-가 구현, 2026-10-17 00:5x 시작)

검토 루프의 열린 항목만 둔다(공통 규칙). 닫힌 항목은 `ledger-closed.md` 로 옮긴다. plan 의 완료 보고 · 검토 보고가 원문이고 여기는 상태표다.

## 구현하며 확인할 것

| 항목 | 어디서 확인 | 출처 |
|---|---|---|
| `requireAccess` 는 `import { requireAccess } from "@/server/access/guard"` 꼴로만 가져온다 — access-gate 정적 검사가 기본 가져오기(`import requireAccess from …`)와 guard 다른 함수의 별칭(`hasValidAccess as requireAccess`)을 못 잡음(거짓 음성 둘). 검사 보강은 1-나 설정 · 도구 몫 | P11 · P12 · 1-나 브리프 '지킬 것' · 1-나 때 검사 보강 | review-p10-7-code M-4 |
| 코드 가지의 specs · intent 가 문서 가지보다 낡으면 CI check-ids(setting-default) · spec-trace 가 어긋남을 낸다 — 바탕 가지 · CI 가지를 만들 때 `git checkout <문서 가지 커밋> -- specs intent` 로 맞춘다(P11 가지는 9b97f4d 로 맞췄음) | P10 을 P11 에 합칠 때 · CI 가지 재생성 때 · 다음 바탕 가지 | P11 가지 dc5308d 뒤 check:ids setting-default 1(unit.vocab_count.1-3 12절 30 ↔ 시드 25) |
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
| P6c(H6 목업): 영어 문장의 한국어 뜻 반말 · B_LevelTest '고르세요' → 해요체 · B_Reading 3단계 지문 옆 단어 그림 · B_Speaking 따라 말하기 뜻 · B_W3_Order '다시 듣기' 근거 | P6c 브리프 | review-p05b-design 메모 |
| 시드 검사에 '한국어 뜻이 있으면 안 되는 단계' 규칙(말하기 질문 ko 는 `questions.koMeaning` 거짓인 단계에서 비어야 함 · 이야기 ko 는 7~12 구간 없음) | P4 보강 또는 P6a 2차 검토 | review-p05b-design M-7 · P5b fix 1 보고 범위 밖 |
| P6b 작업 3 그림 목록은 P6a 묶음 4 끝의 vocab 으로 다시 뽑는다(fix 1: 4단계 bread · letter · pilot 들어옴 · plant · toast · dentist · uniform · seat 빠짐 · head 2단계 · old 1단계 · many 기능어; 묶음 4 끝: 초등 권장 16(math 포함, review-p06a-3) 맞바꿈으로 4단계에 kitchen · tape · tail · touch · ice · mail · point · skin 들어올 수 있음 — 보고 '알릴 것'대로) | P6b 작업 3 브리프(P6a 묶음 4 뒤) | P6a fix 1 보고 알릴 것 1 · 2 · 묶음 4 알림 |
| P8 1-가 실시드에 읽기 · 쓰기 단원 0(정규 10 + 보강 3 · 변형 2)과 1단계 단계 평가 level.test_forms 3벌(C68 (1)); 다시 만든 칸은 시드 전체 최대 개정 + 1, 사람 확인 '고침'은 정정 + 1; 토리 이야기 title · generation; 적재 보고 `--json` inserted 를 seed/manifest 에; P7 완료 판정에서 옮긴 수업 적재(dev-load 세 영역 · through 1) | P8 브리프 · 완료 판정 | plan-p07a '다른 P 에 넘길 것' · C68 (1) · (5) |
| P10 · P11 · P12: 시드는 `src/server/seed/read.ts` 로 읽고 단원 · 단계 평가 · 배치 평가 시작 때 `currentSeedRevision()` 을 start_revision 에 남겨 그 값으로 읽는다. 진행 중 세션은 `sessions.lesson_id` 행을 끝까지 | P10 · P11 · P12 plan · 브리프 | plan-p07a '다른 P 에 넘길 것' |
| P6: **첫 개발용 적재 끝남(2026-10-17 23:0x, P6a f447bc5 판, 최신 개정 1)** — 이제 규격 파일을 고치면 판을 올린다(개정 G + 1 · 정정 + 1): P6b 의 images.json 207 · vocab imageKey · 예문 35 와 opus-4-8 thinkingDefault 'none'(새 적용일 행)은 다음 적재 때 개정 2 로 | P6b 커밋 · 합친 뒤 적재 | plan-p07a 위험 6 · H3 실행 기록 |
| 1-나: seed/reviews → seed_reports(신고자 개발자, C68 (3)) · 옛 개정 행의 정정을 싣는 자리(파) · main 작업의 '신고 판단 기록 · 다시 계산' 단계 · P4 규격의 토리 이야기 title · generation 필수(타, P8 브리프에도) · 2차 단원 미리보기는 startRevision = currentSeedRevision() | 1-나 plan | plan-p07a 정할 것 마 · 타 · 파 · C68 |
| P8 · P12: 1~4단계 평가 지문의 그림 낱말이 '무엇' 질문의 정답과 같으면 그림이 답을 가리킴(견본 12-01). **P11 읽기 수업 몫은 결정(task-p11-2 컨트롤러 결정): 문항 활동의 지문 보기(가로 칸 · 세로 쪽지)에 그림 줄을 두지 않는다.** 평가 문항(P12 화면)도 같은 규칙으로, P8 시드는 정답 낱말이 그림 줄에 들지 않게 | P12 단계 평가 화면 브리프 · P8 브리프 | review-p05b-design-2 넘길 메모 · task-p11-2 |
| P6c: B_LevelTest 에 1~4단계 평가 지문 그림 줄 자리(읽어 주기 없음) · 토리 이야기 새 화면에 읽어 주기 자리 · 새 단어 표시 색(노랑 카드 위 종이 바탕 · 굵게 vs 목업 종이 위 노랑) | P6c 브리프 | review-p05b-design-2 넘길 메모 |
| P10 · P11 · P5c: ActivityCard 기본 글자 20px — 다른 틀도 20px 줌 · 소리 자리의 저절로 읽기와 다시 읽기(평가 지문은 없음) · 칸 화면 틀 -mx-6 과 820 가로 넘침 시험 유지 | P10 · P11 · P5c 브리프 | review-p05b-design-2 넘길 메모 |
| P9: MIN_RETRY_MS 1초 — 2차 설정 화면의 ai.timeout_seconds.* 범위 검사에 하한(1-나 3) · P11 은 AiOutcome 실패 갈래마다 화면 길(config · safety_cap · output_blocked · RangeError 는 서버 오류) · 첨삭 refusals 는 attempts 에 · 빌드 추적 '/*' 첫 프리뷰 확인 · 1-나 dueCostAlerts → createAlertOnce scope · preCallGate ai_status 상태 · P6 forbidden 목록 iu 컴파일 통과 | P9c fix 1 · P11 · 1-나 · P6 브리프 | review-p09c 3절 M-2 · 8절 |
| P11: 쓰기 평가 '빈칸 채우기'에서 문장 빈칸(흰 상자)과 아래 답 칸이 쓰는 자리 둘로 보임 — 목업 B_LevelTest 대로 답을 빈칸 안에 넣는다(P5b 는 보기 화면이라 그대로) | P11 브리프 | review-p05b-design-3 M-C |
| P9c · P11 · 1-나: 시드 contact 범주 값이 바뀜(한국어 주소 앞보기 좁힘 · 괄호 지역 번호 · 국가 번호 추가, P6a fix 2) — 실행 때 파일로 읽어 코드 변화 없음. P9c 계약 · 관찰과 P11 e2e 는 P6a 합친 뒤 실제 목록으로 한 번 더 | P9c 검토 메모 · P11 브리프 | P6a fix 2 + 묶음 3 보고 알릴 것 |
| P8: 행이 있는 단원 · 벌에 새로 생긴 칸(보강 수 늘림 등)은 적재 앞 DB 최대 개정을 넘어야 함(new-cell-in-open-group) · 적재 보고 inserted → seed/manifest | P8 브리프 | review-p07a 8절 |
| P10~P12: read.ts 로 읽고 start_revision 에 currentSeedRevision() · 배치 answer 열은 answerNo · accepted · sentence 가운데 있는 것만 · 회화 평가 카드 장 item_type 'talk-sheet' | P10 · P11 · P12 브리프 | review-p07a 8절 |
| 1-나: 회화 적재 때 `--areas` 에 talk 추가 · 토리 이야기 title · generation 필수 전엔 story-field-missing 거부 | 1-나 plan | review-p07a 8절 |
| 서버 액션 · 서버 함수의 DB 오류는 오류 이름 · Postgres 코드만 남긴다 — P10 몫 닫힘(review-p10-fix1 Approved). `src/server/db/safe-error.ts` 의 `dbErrorTag` · `safeDbError`(호출자 아직 없음 — P11 이 처음 쓸 때 단위 사례 더함)를 P11 아이 답 글(attempts) · P12 · 1-나 브리프 '지킬 것'에 넣고 닫는다 | P11 브리프 작성 때 | review-p10-2-code I-1 · review-p10-fix1 |
| P12: `unitSnapshotOf` 는 쓰기 6~12 의 level_specs 덮기 값을 담지 않는다 — 판정 때 덮기를 함께 보거나 복사본에 담는다 | P12 브리프 | review-p10-2-code 6절 3 · impl-p10 차례 2 알릴 것 3 |
| P10 차례 3 지적 가운데 남은 것: 배치 전 카드 누름 표시(review-p10-3-design H-M6 — 재부팅 뒤 화면 재검토 때 확인) · 홈 카드 '아는 단어 · 최근 성적 · 끝낸 대화' 칸은 P11 · P12 가 채움(입력 형 유지). 나머지(AC-2b · AC-2a 단언 · '이번 주 n일' 배치 셈)는 닫힘(review-p10-5-6-code 6절 · fix 2) | des-p10 사진 세트 · P11 · P12 브리프 | review-p10-3-design H-M6 · review-p10-5-6-code 6절 |
| 홈 영역 카드의 아이콘(목업 B_Home4 에 있음, 구현에 없음) — 이모지 · 그림 가운데 무엇으로 그릴지 요청자 시각 결정(표본 쪽) 뒤 P10 마무리 또는 1-나 | 요청자 표본 쪽 · P10 차례 7 화면 검토 | review-p10-3-design H-M5 |
| 홈 부모 꼬리표 높이 48px — 1-나에서 누를 수 있게 되면 56px 이상으로 | 1-나 부모 화면 브리프 | review-p10-3-design 4절 |
| 단계 · 활동 전환 때 입력 요소 재사용으로 앞 값이 남는 결함(첫 실행 PIN → 이름 칸 — 핫픽스 `key={step}`, review-p10-fix2 닫힘)이 배치 · 세션 틀에도 없는지는 P10 검토에 기록 없음 → P11 차례 3 · 4(활동마다 조각을 새로 만듦 · key) '지킬 것'과 화면 재검토 때 확인 | P11 차례 3 · 4 브리프 · des 사진 | 요청자 재현 23:3x · edit-p10-done 보고 |
| 첫 실행 영어 이름 로마자 C74(관용 철자 표 우선 — fix 4 반영, 코드 몫 닫힘): 요청자 되읽기(잠정 → 확정) | 요청자 | 요청자 23:5x · C74 · review-p10-fix3-code |
| 수업 목록 해석(컨트롤러 2026-10-18 00:1x, fix 3 반영 — 칸은 남기고 줄만 숨김 · 화면 재검토 받음(4절 단어 익히기 행이 칸을 전제), 코드 재검토 Approved — 닫힘, P12 몫만 남음): 지금 단원이 통과한 상태(다음 단계 준비 중 · 졸업 · 단계 평가 대기 · 부모 확인 대기)면 그 단원의 안 한 수업은 untried · 끝낸 수업은 retry(횟수 · 성적에 안 넣음), 잠긴 다음 단원 줄은 숨김, '여기부터 해요'는 하던 수업 → 첨삭 보기 → 단계 평가 차례(지금 단원의 새 수업은 안 가리킴, review-p10-fix3-code 권고로 글 고침). P12 가 이 상태를 만들 때 같은 규칙 | P10 fix 3 · P12 브리프 | review-p10-4-code I-1 · review-p10-4-design 부모 확인 대기 어긋남 |
| 수업 목록이 실시드 수(단원마다 정규 10~15 + 보강)에서 가로 1180 에 넘치지 않는지 — fix 3 에서 12 · 15장 흉내 넘침 없음(가로 카드 최소 112px · 잠긴 단원 칸 200~240px, des-p10 재검토 대기), P8 실시드 적재 뒤 실제로 다시 — des-p10 fix 3 재검토: 12 · 15장 세로 · 가로 한 화면(가로 카드 133 × 138px, 20px 아래 글 없음), **세로 15장에 하던 수업 · 보강이 더해지면 세로로 넘칠 수 있음** | P8 뒤 화면 검토(실시드) | review-p10-4-design M · review-p10-fix3-design 메모 |
| 배포(H1 · H15 끝, 2026-10-18 00:5x): GitHub infiray2016/momo-english-academy · Vercel prj_MYpbaPHFxJduozLsSqGKICFGFTMF(가지마다 프리뷰, 프리뷰 Vercel 인증 끔 — 앱 접근 코드가 지킴). (가) 환경 변수 둘은 요청자가 .env 파일로 올림(production · preview · development — production 에도 개발용 값이 들어가 있어 H8 때 운영 값으로 바꿀 것) (나) 개발용 DB 비움 + 시험용 시드 적재 끝(01:2x, 산출물 기록) **남은 것**: (다) CI(ci.yml · main.yml · keepalive.yml)가 돌려면 GitHub 비밀값 DEV_DATABASE_URL 등(H3 · H4) — 아직 없음, 첫 실행은 실패 예상 (라) production 가지 main 은 앱이 없는 옛 커밋 — 프리뷰만 쓰고 production 은 1-나 뒤 | 요청자 허락 · H4 | 요청자 2026-10-18 00:4x 답 넷 · C75 |
| 개발용 DB 비밀번호 · 접근 코드 해시가 Vercel MCP 호출 인자(세션 전사)에 한 번 들어갈 것 — 운영 전환(H8) 때 개발용 비밀번호 바꾸기 권함 | H8 | 컨트롤러 메모 2026-10-18 |
| **환경(2026-10-18 00:3x~)**: 이 컴퓨터에서 새 Postgres 클러스터가 뜨지 않음 — shmget 56바이트도 ENOMEM(SHMALL), 보이는 세그먼트는 54331 하나뿐 → 커널 SysV 계정이 보이지 않는 세그먼트로 찬 것. macOS 는 kern.sysv.* 를 부팅 뒤 못 바꿈 → 재부팅(요청자 시험 뒤). 재부팅 전엔 통합 · e2e 를 못 돌림 — **CI 로 돌린다**(ci.yml 은 pull_request · main push 트리거: 워크트리 상태를 임시 인덱스로 `ci/p10-c5` 가지에 커밋 · 초안 PR #1 → integration · e2e 작업, 결과를 구현자에게 전달; 실기 사진은 재부팅 뒤). 54331 안에 시험용 DB 를 만드는 길은 안 씀(요청자 DB 서버). 재발 방지로 /etc/sysctl.conf 에 kern.sysv.shmmax · shmall · shmmni · shmseg 올리기 권함(요청자 sudo). 54329 · 3000(시드 보기)은 껐음(필요하면 다시) | 재부팅 뒤 컨트롤러 | impl-p10 · rev-p10 환경 알림 · 컨트롤러 재현 01:0x |
| 개발용(Supabase) DB 의 집 데이터 지우기는 `TRUNCATE … CASCADE` 를 쓰면 안 됨 — settings(profile_id FK) 전체가 함께 비워짐(2026-10-18 01:5x 컨트롤러 실수 → 재적재로 복구). 프로필 테이블은 DELETE(또는 profiles 만 지워 FK CASCADE DELETE)로, settings 는 `profile_id IS NOT NULL` 만. 개발용 '집 초기화' 스크립트(dev-db --reset 의 원격판)를 두면 좋음(1-나 부모 화면 프로필 삭제와 같은 규칙) | 다음 집 초기화 때 · 1-나 | 컨트롤러 2026-10-18 |
| 요청자 시험에서 드러난 안내 빈틈(1-가 차례 8 안내문 · 1-나 화면): 시작 단계를 안 고르면 홈 카드가 '내 단계 찾기'로 바뀌는 것이 '진행이 안 됨'으로 보임(배치 화면이 없던 동안) · 회화 카드 → '준비 중' · 아바타 첫 글자 동그라미가 왜 있는지 → 첫 실행 마지막 화면 또는 홈에 '지금 할 수 있는 것' 한 줄, 아바타 화면은 요청자 답(빼기 · 두기) 대기 | 차례 8 안내 · fix 5 | 요청자 2026-10-18 01:5x~02:0x |
| AC-2f e2e 를 '배정 1 · 2 를 건너뛴 다지기'로 본 것은 시험용 시드 사정 — P8 실시드(배정 수업 여럿 · 새 단어 겹침) 뒤 plan 원안('배정 1 을 건너뛴 배정 2')으로 다시 | P8 뒤 e2e | review-p10-5-6-code 다르게 한 것 · impl-p10 차례 6 |
| 시도 대기열이 서버의 묶음 전체 거부(50 초과 · 꼴 오류)에서 영영 비지 않음 — P11 '지킬 것'(거부된 묶음은 쪼개거나 버리고 알림) | P11 브리프 | review-p10-5-6-code M-2 |
| CI 용 PR(ci/p10-c5 → P10 가지)은 바탕 가지에 새 커밋을 올리면 CONFLICTING 이 되어 GitHub 가 pull_request 워크플로를 만들지 않는다(2026-10-18 02:5x~03:4x 세 번 push 가 무응답). CI 가지는 늘 바탕 가지의 최신 커밋 위에 다시 만들어(commit-tree -p <바탕 HEAD>) force push 한다. PR #1 · #2 는 P10 검토 끝나면 닫기(#2 는 바탕 합침 때 다시) | P10 CI 때마다 · 커밋 뒤 | 컨트롤러 2026-10-18 |
| 홈 닫힌 말하기 카드의 '다시 확인' 단추는 실제 마이크 확인 없이 저장 상태만 지우고 카드를 연다(아이도 누를 수 있음, 막혀 있으면 따라 말하기에서 다시 닫힘 — 해 작음). 1-나 부모 화면 '마이크 다시 확인'이 생기면 홈 단추는 빼거나 성공일 때만 지우게 | 1-나 부모 화면 | review-p10-fix5-code N-1 |

## 남은 우려

| 항목 | 상태 | 출처 |
|---|---|---|

## 잠정 값(요청자 확인 전)

| 값 | 지금 | 확인 |
|---|---|---|
| (없음 — H5 는 C66 으로 확정, ledger-closed) | | |
