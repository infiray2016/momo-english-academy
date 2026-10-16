# 열린 장부(1-가 구현, 2026-10-17 00:5x 시작)

검토 루프의 열린 항목만 둔다(공통 규칙). 닫힌 항목은 `ledger-closed.md` 로 옮긴다. plan 의 완료 보고 · 검토 보고가 원문이고 여기는 상태표다.

## 구현하며 확인할 것

| 항목 | 어디서 확인 | 출처 |
|---|---|---|
| SDK `zodOutputFormat` 이 status enum 을 description 으로 옮김 — '규격 깨짐 status' 실패 수를 관찰표에 | H4 뒤 `pnpm seed:check --probe` · P8 첫 표본 | review-p05a M-3 · review-p05a-2 |
| between_tools(생각 끔) + 구조화 출력을 함께 보내면 400 인지 | H4 뒤 P5a `--probe`(GA 길) · P9c 계약 `talk_config.*`(베타 길) | plan-p05a 위험 6 · plan-p09a 확인할 사실 1 |
| `ANTHROPIC_BASE_URL` 알림 줄 실기(키가 있어야 닿음) | H4 뒤 첫 `--probe` | review-p05a-2 N-1(컨트롤러 고침) |
| P9c 에 넘길 메모 일곱(시계 인자 꼴 · 단가 0 경고 · 거절 홉 from.model · 회화 턴 첫 문장 전 타임아웃 재시도 · e2e 501 등) | P9c 브리프 | review-p09a 8절 |
| `seed/model-prices.json` opus-4-8 행 `thinkingDefault` 'none'(P6a 바탕 6bd6015 의 규격에는 'none' 이 없어 P9a 와 합친 뒤에만 가능) · 첫 개발용 적재(P7b [사람] 1) 전에 반드시(늦으면 새 적용일 행) | P9a 가 P6a 와 합쳐진 뒤 · 첫 개발용 적재 전(P6 몫) | plan-p09a 작업 3 (나) · plan-p07a 위험 13 |
| P4a `bandOf` · `Band` ↔ P2a `src/core/level-band.ts` 중복 | P5b · P10 구현 때 하나로 | plan-p04a 완료 보고 · 바탕 합침 e08eaba |
| P5a `priceOf` · `costOf` → P9a `cost.ts` 로 통합 | P9a 합침 뒤 | plan-p09a '다른 P 에 넘길 것' |
| P8 시드 브리프: 말하기 1~2단계 '질문 답' 질문은 그림 없이 답할 수 있어야 함(C67 (5)); 검증기가 말하기 3~12단계 평가 question 의 '허용 답 셋 이상'(C66)을 세지 않음(check-assessment.ts 228 · 324) — P8 평가 묶음 전 결정 | P8 브리프 · P4c 수정 여부 | review-p05b-design 범위 밖 1 · review-p06a 메모 2 · 3 |
| P4 검사 규칙: '한국어 뜻이 있으면 안 되는 단계'(토리 이야기 7~12 구간 · 질문 5단계 이상) | P4 수정 또는 P8 브리프 | review-p05b-design M-7 · C67 (7) |
| P6 contact 범주 추가 꼴: 괄호 지역 번호 · 국가 번호는 fix 2 에서 더함, 말소리 숫자 꼴(`0 1 0 …` · `zero one zero`)은 거짓 양성 위험으로 넣지 않고 사람 표본 몫(컨트롤러 판정) | P6a fix 2(task-p06a-fix2-batch3 1절) · 2차 검토 확인 | review-p09b P6 메모 1 · review-p06a-2 6절 |
| speakingRulesOf 가 9~12단계에서도 문법 지적 1개 허용 — 단계 평가 질문 문항에 닿음(6.2 는 4~8단계만) | P12 단계 평가 화면 | review-p09b P6 · P12 메모 2 |
| P5c: 문항 번호는 cell.items · `reviewPathOf` 공용 · `resolveSeedFile` realpath 확인 · AC-7f 절반(reviews 한 행) 시험 · cellHash 맞춘 풀이 기록 견본 | P5c 브리프 | review-p05b 8절 |
| P9c: 흐름 차례(answerTextOf → JSON.parse → prepareAnswer → wireSchema → validate → normalize → checkOutputFields → applyChecks → historyEntry) · `SettingValues` 이름 겹침 | P9c 브리프 | review-p09b 6절 · review-p09b-2 4절(P9c 3 생각 꺼내기 · buildAiRequest 의 RangeError 는 호출부 결함 — 설정 문제 · AI 실패로 세지 않고 서버 오류, ai_calls 행 없음 · P9c 4 앱 연락처 정규식 다시 쓸 때 BUILTIN_CONTACT_PATTERNS 의 keepsPrefix 로 1번 묶음 되돌림, createMasker · checkOutputFields 그대로) |
| P11: 생각 꺼내기 기록은 fillName 전 historyEntry 로 저장 · turn = history.length + 1 · 걸린 칸 뒤 빈 글은 보이지 않음 · 말하기 6 · 8단계 그림 · 질문 차례 · 쓰기 6단계 생각 꺼내기 결과 자리 · 조립 칸 수 · 4~5단계 제출 단위 · 갈래별 안내 문장 | P11 브리프 | review-p09b 6절 · review-p05b-design 메모 · 범위 밖 2 |
| P10: 화면 방향(목업 가로 1180 · 시험 세로 820) · AREA_TONE hex → board 토큰 · 줄바꿈(keep-all) · 글꼴 입힌 뒤 크기 시험 다시 | P10 브리프 | review-p05b-design 메모 · review-p05b 메모 |
| P6c(H6 목업): 영어 문장의 한국어 뜻 반말 · B_LevelTest '고르세요' → 해요체 · B_Reading 3단계 지문 옆 단어 그림 · B_Speaking 따라 말하기 뜻 · B_W3_Order '다시 듣기' 근거 | P6c 브리프 | review-p05b-design 메모 |
| 시드 검사에 '한국어 뜻이 있으면 안 되는 단계' 규칙(말하기 질문 ko 는 `questions.koMeaning` 거짓인 단계에서 비어야 함 · 이야기 ko 는 7~12 구간 없음) | P4 보강 또는 P6a 2차 검토 | review-p05b-design M-7 · P5b fix 1 보고 범위 밖 |
| P7 check-ids 허용 목록에 화면 구조 수 `PASSAGE_PICTURE_UNTIL_LEVEL = 4`(common.tsx, 12절 키 아님) | P7 plan · 브리프 | P5b fix 1 다르게 한 것 3 |
| P6b 작업 3 그림 목록은 P6a fix 1 vocab 으로 다시 뽑는다(4단계 bread · letter · pilot 들어옴 · plant · toast · dentist · uniform · seat 빠짐 · head 2단계 · old 1단계 · many 1단계 기능어) | P6b 작업 3 브리프 | P6a fix 1 보고 알릴 것 1 · 2 |
| P8 1-가 실시드에 읽기 · 쓰기 단원 0(정규 10 + 보강 3 · 변형 2)과 1단계 단계 평가 level.test_forms 3벌(C68 (1)); 다시 만든 칸은 시드 전체 최대 개정 + 1, 사람 확인 '고침'은 정정 + 1; 토리 이야기 title · generation; 적재 보고 `--json` inserted 를 seed/manifest 에; P7 완료 판정에서 옮긴 수업 적재(dev-load 세 영역 · through 1) | P8 브리프 · 완료 판정 | plan-p07a '다른 P 에 넘길 것' · C68 (1) · (5) |
| P10 · P11 · P12: 시드는 `src/server/seed/read.ts` 로 읽고 단원 · 단계 평가 · 배치 평가 시작 때 `currentSeedRevision()` 을 start_revision 에 남겨 그 값으로 읽는다. 진행 중 세션은 `sessions.lesson_id` 행을 끝까지 | P10 · P11 · P12 plan · 브리프 | plan-p07a '다른 P 에 넘길 것' |
| P6: 첫 개발용 적재(P7b [사람] 1) 뒤 규격 파일을 고치면 판을 올린다(개정 G + 1 · 정정 + 1) — 안 올리면 version-content-changed 로 막힘 | P6a 커밋 뒤 · P6b 작업 3 이후 | plan-p07a 위험 6 |
| 1-나: seed/reviews → seed_reports(신고자 개발자, C68 (3)) · 옛 개정 행의 정정을 싣는 자리(파) · main 작업의 '신고 판단 기록 · 다시 계산' 단계 · P4 규격의 토리 이야기 title · generation 필수(타, P8 브리프에도) · 2차 단원 미리보기는 startRevision = currentSeedRevision() | 1-나 plan | plan-p07a 정할 것 마 · 타 · 파 · C68 |

## 남은 우려

| 항목 | 상태 | 출처 |
|---|---|---|
| 7~12단계 후보의 단계 경계가 거침(7~9 에 A1 86) | 묶음 3 · 4 | task-p06a-report '묶음 0' · review-p06a 5절(4~6 몫 닫힘) |
| 동음이의어 board · bored(bore 는 candidates-9 124위) | 묶음 4 끝 | review-p06a 4절 약한 곳 2 |
| P6a 뺀 32 가운데 20 이 7단계 후보 앞 150 안에 들어 원래 후보 30(able · total · prize · dialogue · marathon …)이 150 밖으로 밀렸고 8~12 후보에도 없음 — 컨트롤러 판정: 원래 순위 1~150 기본 · 32 는 여분 · 빠지는 낱말 표(task-p06a-fix2-batch3 2절 1) · he-she · we-they 검출기는 낱말만 잡아 명사 주어 문장은 사람 표본 몫 · board · bored 는 묶음 4 끝에서 | 묶음 3 · 4 · 2차 검토 | review-p06a-2 N-4 · 7절 1~3 |

## 잠정 값(요청자 확인 전)

| 값 | 지금 | 확인 |
|---|---|---|
| (없음 — H5 는 C66 으로 확정, ledger-closed) | | |
