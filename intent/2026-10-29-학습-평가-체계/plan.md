# Plan: 자체 12단계 번호는 두고, 평가가 아이가 실제로 할 수 있는 것을 재게 — 수행 근거 · 단원 can-do 목표 · 근거가 얇으면 보류(1-가 P12)

spec: `intent/2026-10-29-학습-평가-체계/spec.md`(5판 · 598줄, approved: A1~A8 승인 C171 · C174 · C175 · C176, [승인 A9] 수준 값만 요청자 확인 대기) · intent: `intent/2026-10-29-학습-평가-체계/intent.md`(4판, C160) · 정본 반영: C183(93자리, `.superpowers/sdd/2026-10-29-학습-평가-체계/task-canon-apply-report.md`) · 작성일: 2026-10-30 · 상태: approved(컨트롤러 2026-10-30 09:0x, 13절 C193 — 보정 하나: 정본 밖 문구 표의 단계 평가 문항 모자람 결과 글)
승인: 컨트롤러 2026-10-30 09:0x(13절 C193, C139 · C141 의 하위 plan 승인 규칙) · 브랜치 · 워크트리: `feature/1a-p13d-teacher`(`.claude/worktrees/p13d`, 머리 0c664c3 위 커밋 전 변경)를 잇는다(열린 질문 C3) · 작업 장부: `.superpowers/sdd/2026-10-29-학습-평가-체계/`

읽는 법. 파일 경로는 p13d 기준이다. 정본에 없는 새 이름에는 '(제안)'을 붙였다. 수용 기준은 정본 15절 번호로 적었다(델타 → 정본: AC-1 → 21a, 2 → 21b, 3 → 21c, 4 → 7h, 5 → 21d, 6 → 21e, 7 → 10i, 8 → 10j, 9 → 21f, 10 → 12i, 11 → 21g, N1~N3 → N15~N17). 시험 이름도 정본 번호로 시작한다(spec:trace). '가르치고 L-n' 은 `.superpowers/sdd/2026-10-29-가르치고-배우는-수업/ledger-open.md`, 'UI · UX L-n' 은 그 변경 단위 장부의 항목이다. 묶음 이름은 평1~평20 이다(다른 plan 의 가~카 · 0~9 와 섞이지 않게). 코드 사실은 2026-10-30 05시대 p13d 에서 확인했다(끝 절).

## 목표 (Goal)

이 plan 은 1-가 P12 전체다. (가) 정본 3.2 · 3.4 · 3.5 · 3.7 의 지금 판정 규칙(단어장 · 간격 반복 · 복습 카드, 단원 통과 네 조건과 보강 · 단어 익히기 · 부모 확인, 단계 평가 20문항 16점과 재응시 · 졸업, 별 장부 · 연속 일수, 세션 결과 채움, 회화 갈래)을 처음 짓고, (나) 이 spec 의 평가 델타(근거 칸 넷 · 근거 기록 함수 · 근거 상태와 집계 · 단계 평가 잠재 점수 보류와 복구 · 말하기 얇은 근거 · 시드 목록 넷과 검증기 새 규칙 · 병행 검증 합성 사례와 보고)를 그 위에 얹는다. 운영 판정은 (가)의 지금 규칙이 정하고, 새 근거 상태(0 · 1 · 2 · 3 · U, 최고 · 최근 · 다시 확인 · 복습 필요)는 단원 · 단계 평가 판정 때 last_judgement · judgement 에 옛 판정과 나란히 남기기만 한다(C160, 정본 3.8 '쓰는 곳'). 승인된 운영 규칙인 잠재 점수 보류(3.2 '통과' 행: S ≥ P 이고 단원마다 채점 level.min_scored_per_unit 이상이면 통과, S + R < P 면 미통과, 그 밖은 보류)와 말하기 얇은 근거(3.7 두 행, speaking.min_scored_ratio)는 처음부터 운영에 든다. [승인 A9] 는 근거 칸에 정확도 '부분'과 의사소통 정답 표시만 남기고 표현 목표의 수준 값은 확정 전까지 계산하지 않는다(정한 것 8). '평가 기능 완료'는 seed.goals_required_levels(1 · 3 · 4 · 5) 단원에 실제 목표 ID 와 과제 연결이 있고 그 단계 프리뷰에서 근거가 계산될 때만 적는다(정본 11절 1-가 (11)). 부모 화면 넷 · 알림 둘 · 사람 판정 칸 · 사용 시험은 1-나다.

## 묶음과 배정

구현자는 Opus · high, 코드 검토는 Opus · xhigh, 화면 · 시드 검토(design-reviewer)는 Fable · max, 학습 설계자(목표 용어 목록 다듬기 · 덮음 표 · 평가 브리프 예비 문단)는 Opus · xhigh, 시드 생성(예비 문항)은 seed-generator Opus · xhigh(S10 결론, 가르치고 L-58)이고 호출마다 model · effort 를 적는다. 동시에 다섯까지(다른 plan 의 묶음과 합쳐 셈), 한 파일은 한 구현자만 고친다(위험 3). 기능 묶음은 전체 루프(브리프 → 구현 → 코드 검토 → fix 3회까지 → 화면이면 화면 검토)이고, 설정 · 검사 성격의 평3 · 평16 · 평19 는 가벼운 루프(검토 high · 범위 한정, Minor 는 컨트롤러가 직접)다. 마지막 칸 '운영 · 병행'은 그 묶음이 운영 판정(단원 통과 · 승급 · 별 · 복습 일정)을 짓는지(운영), 새 근거를 계산 · 기록만 하는지(병행)를 적는다(C160). 병행 묶음의 값은 운영 판정 · 아이 화면이 읽지 않는다.

| 묶음 | 범위 | 먼저 끝날 것 | 검토 | 증명하는 AC | 운영 · 병행 |
|---|---|---|---|---|---|
| 평1 | 근거 칸 · 판정 칸 꼴(Zod)과 과제 유형 코드: EvidenceSchema(v 1) · UnitJudgementSchema · LevelTestJudgementSchema · HumanJudgementSchema(쓰는 곳은 1-나) · 과제 유형 코드 목록과 taskCodeOf, 바 의 TeachEvidence 를 Evidence 로 맞춤 | 없음(첫 묶음) | 코드 | N16 | 병행(근거 꼴) |
| 평2 | 마이그레이션 0006(열 넷 + progress_event_kind 'human_judgement', RLS 는 표 단위라 그대로) · Drizzle 스키마 · 시드 적재가 unit_specs.goals 를 씀(칸 해시에 goals, 목표 있는 단원 정정 판) | 평1 · 회화 move 마이그레이션과의 차례(정한 것 18) | 코드 | 21d · N15 바탕 | 바탕(열만) |
| 평3 | 설정 키 열다섯(settings.json · 시험 고정값 · 12절 사본, 정본 12절은 같은 때 편집자) · 단원 시작 · 평가 시작 복사본 · 관계 검사 셋 | 회화 묶음 1(설정 24행, 진행 중 · 같은 파일) Approved | 코드(가벼운 루프) | 10g(복사) 바탕 | 운영 키(level.* · speaking.*) · 병행 키(evidence.*) |
| 평4 | 단어장 · 간격 반복 · 복습 카드(순수, 옛 판정): 단어별 정오 → vocab_progress, 다음 복습일 · '안다' · 유지 복습, 카드 꼴 · 속하는 영역 · 15장 · 차례 · 두 단계 · 겹침 카드 | 없음(∥ 평1) | 코드 | 9a · 9c · 9b · 9f(단위) | 운영 |
| 평5 | 단원 통과 · 최근 성적 · 보강 고르기 · 단어 익히기 · 연습 고르기 · 부모 확인 · 남은 조건 한 줄(순수, 옛 판정), 3.7 '넣지 않는다' 행과 얇은 근거 두 행 | 없음(∥) | 코드 | 9g · 10a · 10c · 7b(단위) · 10j(점수 몫) | 운영 |
| 평6 | 단계 평가 판정(순수): 문항 점수 · 잠재 점수 판정 · 재시도 · 예비 · 복구 경로 고르기 · 재응시 간격 · 재응시 전 보강 · 결과 문구 고르기 · 졸업 · 다음 단계 준비 중 | 없음(∥) | 코드 | 10b · 10f · 10h · 10i(단위) | 운영(잠재 점수 보류 포함) |
| 평7 | 별 장부 · 연속 일수(순수) · 장부 옮김 명령 | 없음(∥) | 코드 | 6b · 6d | 운영 |
| 평8 | 근거 기록 함수, 브리프 셋. 가: 노출 판정 · 목표 연결(순수, 회화 묶음 18 의 앱 확인이 부름). 나: 출처별 기록(1~3단계 앱 채점은 바 의 함수 · 쓰기 4~5 · 6~12 · 말하기 AI 활동 · 복습 카드 · 단계 평가 문항 · 회화 평가 턴). 다: talkEvidenceOf · 회화 연습 시도(talk-prep · talk-floor · talk-wrapup) | 가 는 없음(평1 과 나란히), 나 는 평1 · 평3, 다 는 회화 묶음 5(move Zod) | 코드 | 21d(단위) · N17 · 15s · 15v(근거 몫) | 병행 |
| 평9 | 근거 상태 · 집계(순수): 기회 펼치기 · 세 축 · 수준(A1 · A8 · A9 자리) · 맥락(A2) · 최고 · 최근 · 다시 확인 · 복습 필요(A3) · U 사유(A4) · 후보 판정 · 근거 참조 · 집계 셋 · 단계 평가 단원 근거 요약 | 평8 | 코드 | 21e · 21f · 22g · 22h · 22j(수준) · N15(순수) | 병행 |
| 평10 | 기록 길(서버): 끝 시도 저장과 같은 트랜잭션에 근거 칸(세 영역 · 쓰기 확인 · 첨삭 · 말하기 질문 평가), 회화 쓰기 줄(아이 행은 turn.ts, 연습 시도는 saveFollowAlong. 회화 묶음 9 · 16 · 18 이 못 넣었을 때, 정한 것 21), 개발 DB 채움 명령(정한 것 15) | 평2 · 평8 · server/session/index.ts 잠금 · 회화 서버 파일 잠금(겹침 표) | 코드 | 21d(통합) · N15 | 병행(기록만) |
| 평11 | 단원 판정 길(서버): 세션 끝 · 복습 끝 · 회화 끝 이음매에서 단어장 → 옛 판정 → 통과 · 보강 · 연습 · 부모 확인 · 사흘 넘김 · 다음 단원 · 다음 단계 준비 중 · 진행 사건 · 별 장부를 하고, 근거 상태 · 집계를 따로 불러 last_judgement 에 나란히. 부모 고르기 · 단계 바꾸기 서버 함수(화면은 1-나) | 평4 · 평5 · 평7 · 평9 · 평10, 회화 이음매 한 줄은 회화 묶음 8 Approved 뒤이고 회화 7 · 12 · 18 이 state.ts 를 잡지 않은 때 | 코드 | 7b · 7e · 10a · 10c · 10g · 21e(통합) | 운영 판정 + 병행 기록(나란히) |
| 평12 | 복습 세션(서버 · 화면): 오늘 카드 · 시도 · 세션 끝 다시 낸 카드 · 결과 '맞힌 카드 n장' · '다음 복습', 홈 복습 포스트잇 · 목록 '복습하기' · 오늘 완료의 복습 | 평4 · 평11 | 코드 + 화면 | 9b · 9f(e2e) | 운영 |
| 평13 | 단계 평가 세션(서버 · 화면): 시작 · 벌 고르기 · 두 세션 · 채점(앱 · AI) · 세션 끝 재시도 · 예비 · 판정 · 보류 · 같은 날 이어 보기 · 문항 모자람 닫기와 새 벌 · AI 재채점(앱 진입) · 새 작문 조건 · 부모 조정 닫기 · 미통과 · 재응시 · 졸업 · judgement 와 단원 근거 요약 · 결과 화면 | 평6 · 평9 · 평11 | 코드 + 화면 | 10b · 10d · 10g · 10h · 10i(흐름) | 운영 + 병행(단원 근거 요약) |
| 평14 | 결과 · 목록 · 홈 채움(화면): 결과의 단원 막대 · '단원 n을 통과했어요!' · 다시 하기 '맞힌 단어' · 장부 별 수, 목록의 남은 조건 한 줄 · 단계 평가 자리(평가 보기 · 이어 보기 · 다시 보기 · 결과 보기) · 평가 전 보강 · 연습 · 복습, 홈 위 띠 연속 칸 | 평11 · 평12 · 평13 · UI · UX 5-가 · 3 잠금 | 코드 + 화면 | 6e · 2d(목록 몫) | 운영(아이 화면에 근거 없음) |
| 평15 | 시드 목록 넷 · 덮음 표 파일 · 검증기 새 규칙(목표 용어 · 요구 능력 타당성 · 과제 연결 · 기회 수 · 응용 기회 보고 · 덮음 표 · 단계 평가 목표 문항 · 예비 · 노출 경고 · 참고 대응표 · 시작 목록 · 필수 범위) | 평1 | 코드 | 7h · 21b · 21c(검증) | 검사(운영 적재만 막음) |
| 평16 | 검사: check:ids 새 규칙 cefr-claim, 의존 규칙 둘(판정 → 근거 상태 금지 · 관리용 기준 목록 가져오기 제한), 프리뷰 시작 단계 화면 회색 줄 | 평15 | 코드(가벼운 루프) | 21a(검사) · 21c(가져오기 · 프리뷰) · 21e(가져오기) | 검사 |
| 평17 | 1단계 평가 네 영역 예비 문항 · 예비 턴(개정 판): 브리프 넷에 예비 문단 → 생성 → 검증 → 풀이 검사 → 시드 검토 → 개발 DB 적재 | 평15 | 시드 검토(Fable max) | 7h(예비) · 10i(예비가 있는 흐름) | 시드 |
| 평18 | 병행 검증: 사례 꼴 · 합성 사례 파일 · 보고 순수 함수 · `evidence:report` 명령 · 배치 가름 검증 기록, 보고의 회화 칸 (8)(9)(정한 것 27) | 평9, 회화 칸은 회화 묶음 18 의 candidates.ts | 코드 | 21g · 21c(배치) · 15z(보고 칸) | 병행 검증 |
| 평19 | 정본 · 사본 · 추적: 정본(평3 의 12절 포함) · p13d specs 사본 대조, check:ids · spec:trace 0, 1차 plan P12 행을 이 plan 으로 | 평3 · 평1~평18 | 컨트롤러 | 늘 | 문서 |
| 평20 | 실행 확인 · 프리뷰: 11-01 뒤 CI 통합 · e2e, 시각 당기기로 단원 통과 · 단계 평가 통과 · 보류 뒤 같은 날 이어 보기, 화면 검토, '평가 기능 완료' 점검 | 평19 · 일의 차례 ② | 화면 · 사람 | 10i(사진) · 1-가 끝 점검 | 확인 |

plan 이 정한 것(spec 이 plan 에 맡긴 자리와 구현 길, spec 미결 '컨트롤러 · plan 이 정할 것' 일곱은 3 · 4 · 5 · 6 · 11 · 14 · 15 · 16 · 17 이 답한다):
1. **범위는 1-가 P12 전체다.** 1차 plan P12 행(단어장 · 복습 · 단원 통과 · 단계 평가 · 결과 · 별 · 연속 일수 · 회화 갈래)이 아직 코드에 없고(확인한 사실 1), 근거 · 보류가 그 판정 위에 얹히므로 한 plan 으로 묶는다. spec:trace missing-test 16(AC-6b · 6d · 6e · 7b · 9a · 9b · 9c · 9f · 9g · 10a · 10b · 10c · 10d · 10f · 10g · 10h)은 이 plan 의 증명으로 닫고, 1차 plan 의 P12 행 · 증명 표 파일 칸은 평19 에서 컨트롤러가 이 plan 을 가리키게 고친다.
2. **운영 판정과 병행 계산의 경계(C160).** 통과 · 보강 · 연습 고르기 · 부모 확인 · 승급 · 별 · 복습 일정은 순수 판정 모듈(`src/core/{review,unit-pass,level-test,streak}/` · `reward/star.ts`)만 정한다. 근거 상태 모듈(`src/core/evidence/{state,aggregate}.ts`)은 서버 판정 길(`src/server/progress/`)이 따로 불러 기록만 하고, 판정 모듈은 그것을 가져오지 않는다(의존 규칙, 평16). 운영 반영은 병행 검증 보고 → 13절 → 새 변경 단위다. 잠재 점수 보류와 말하기 얇은 근거는 승인된 운영 규칙이라 판정 모듈에 든다. 되짚기 마무리 줄(가르치고 사 의 recap.ts)은 세션 한 번의 신호라 근거 상태를 읽지 않고 그대로 둔다.
3. **근거 칸 꼴(spec 미결 1).** jsonb 하나에 판 칸 v(1)를 둔 Evidence 다(아래 '근거 칸' 표). 목표 칸은 목록 goals 하나이고 목표마다 나누지 않는다. 목표마다의 판정은 상태 함수가 그 목표의 needs · accept 로 따로 한다(바 의 꼴을 받음). 바 의 TeachEvidence 는 Evidence 의 별칭이 되고 v · 선택 칸만 더한다.
4. **판정 칸 꼴(spec 미결 1).** last_judgement 는 UnitJudgement, level_tests.judgement 는 LevelTestJudgement 다(아래 '판정 칸' 문단). 근거 참조는 최고를 낸 기회와 최근 창의 기회만 둔다(칸 크기를 줄이려는 것).
5. **과제 유형 코드(spec 미결 2).** 시드 문항 type 을 그대로 쓰고 type 이 없는 활동만 이름을 붙인다: 쓰기 4~5 `guided`, 6~12 `composition`, 말하기 `repeat`(낱말 · 문장) · `listening` · `question` · `picture-talk`(활동 picture-task) · `presentation`(9단계 주제 말하기와 10~12단계 발표가 같은 활동이라 정본 목록의 topic-talk 을 따로 두지 않음) · `confirm`(활동 confirm-question), 회화 `card-answer` · `follow-up` · `child-topic` · `child-question` · `mission` · `test-turn`, 복습 `review-recognize` · `review-write`. 한 곳 taskCodeOf(제안)가 활동 · 시드 type 을 코드로 바꾸고, 시험이 '시드 type · testMix 키가 모두 코드 목록 안'을 본다.
6. **허용 과제 유형 표(spec 미결 2).** goal-terms.json 의 핵심 능력 행 tasks 칸이다. 처음 값은 아래 '허용 과제 유형' 표(안)이고, 일의 차례 ②에서 학습 설계자가 다듬어 목표 용어 목록과 함께 요청자 승인을 받는다. 검증기는 파일만 읽으므로 값을 바꿔도 코드는 그대로다. 복습 카드는 단원 단어로만 이어 이 표에 없다(정본 3.8).
7. **lessonKey 와 문항 키.** lessonKey 는 시드 칸 키(cellKey, `lesson:<영역>:<단계>:<단원>:<종류>:<번호>:<변형>`, 판 · 정정 번호 없음)다. 판이 바뀌어도 같은 칸의 반복 성공(ctx.item)이 이어지게 하려는 것이다(바 검토 권고, 가르치고 L-51). ctx.item 은 `<칸 키>:<활동>.<차례>`(짝 `.spare`, 바 그대로), 단계 평가는 `level-test:<영역>:<단계>:<벌>:<번호>`(예비도 같은 꼴, 21번부터), 회화 평가 턴은 `level-test:talk:<단계>:<벌>:<장>:turn.<n>`, 회화 수업 턴은 `<칸 키>:required.<n>` · `more.<n>` · `mission.<n>`, AI 차례는 `<칸 키>:ai.<턴 번호>`(정본의 'ai' 를 턴마다 갈라 다른 AI 질문끼리 반복 성공으로 잇지 않게), 복습 카드는 `vocab:<원형>:<상태>`다.
8. **A9 는 상태 함수 한 곳만 기다린다.** 근거 칸은 지금처럼 정확도 '부분' + communicative 표시다(바 fix 1). 상태 함수의 communicativeLevel(제안) 한 곳이, accept meaning 목표에는 부분 규칙대로 2 를 내고(A1 승인 몫), accept correct 목표에는 확정 전 U(사유 a9_pending, 실패 기회 아님)를 낸다. 확정되면 이 함수 한 줄(0, 또는 다른 길이면 U '목표 꼴 근거 없음')과 합성 사례 기대값만 바뀐다. 세션 점수 · 단원 판정 입력은 판정 그대로(맞음)이고, 부모 화면 '뜻은 통했어요'는 1-나 · 확정 뒤다.
9. **근거 쓰기 자리.** 끝 시도 행과 같은 트랜잭션에 쓴다: 세 영역 수업 저장(saveSessionAttempts), 쓰기 확인(checkGuided), 첨삭(runFeedback · submitRewrite), 말하기 질문 평가(가르치고 다 의 서버), 복습 카드, 단계 평가 문항. 그림 보고 말하기 · 발표 · 확인 질문은 P11c 묶음이 같은 한 줄을 넣는다(정본 11절 '말하기 3~12 AI 판정의 근거는 P11c 와 함께'). 기록 함수가 undefined 면 칸을 비우고, 던지면 시도 저장을 막지 않은 채 칸을 비우고 오류 이름만 남긴다(병행 계산이 학습을 막지 않게). 정확도 경계(바 의 ctx.matchCut, 쓰기 6~12 의 채점표 경계)는 부르는 서버가 그 단원 복사본의 evidence.match_cut · evidence.rubric_cut 에서 읽어 넘긴다(가르치고 L-51). 단계 평가 문항은 문항 점수 정오라 경계를 쓰지 않는다.
10. **단계 평가 · 복습의 기록 꼴.** 배치 평가와 같은 꼴이다: level_tests.answers(낸 문항 · 답 · 재시도 · 예비 · 재채점 줄)와 문항마다 attempts 행(평가 세션, activity_no 는 그 세션에서 낸 차례). 근거는 attempts.evidence, 회화 평가 턴은 talk_turns.evidence 다. 시도 꼴은 `src/core/level-test/attempt.ts` · `src/core/review/attempt.ts`(제안)에 따로 두고 세션 시도 꼴(attempt.ts, 여러 plan 이 잡는 파일)을 고치지 않는다. 예비 문항은 level-test 시드 문항 칸 `spare: "item" | "ai_task"`(제안)로 가리고 번호 21부터 둔다. DB 칸 · 유일 키는 그대로다(정본 04:11).
11. **예비 생성 차례와 1단계 평가 개정(spec 미결 3).** 1단계 네 영역 평가 파일(읽기 · 쓰기 · 말하기 · 회화, 벌 셋)에 예비만 더하는 개정 판이다. 본 문항 글자는 그대로이고, 벌마다 단원마다 level.test_spares_per_unit 개(읽기 · 쓰기 · 말하기는 21번부터), 회화는 장마다 단원마다 예비 턴이다. 학습 설계자가 `seed/prompts/level-test-*-1.md` 넷에 예비 규칙 문단을 더하고(해시 바뀜), seed-generator 가 예비만 만든 뒤 검증 · 풀이 검사 · 시드 검토 · 적재한다(평17). 2~6단계 평가는 P8 생성 차례에서 처음부터 예비 · 목표 칸을 넣는다. 예비 AI 과제(쓰기 6단계 · 말하기 9단계 이상)는 브리프 틀에 규칙만 둔다.
12. **덮음 표 자리.** `seed/lists/goal-coverage.json`(제안)이다. 단원마다 학습 요소 · 단계표 과제 · 수업 과제 유형 · 평가 문항 유형 → 목표 ID 목록(주된 목표 먼저), 목표 밖 처리(목표에 넣음 · 시드에서 뺌), 겹침(주된 능력이 같은 목표 · 목표 여럿에 이은 과제 유형)을 적는다. 학습 설계자가 목표 글과 함께 쓰고 검증기가 시드와 맞댄다. 빌드에 묶고 DB 에 넣지 않는다.
13. **시드 목록 넷의 처음 값.** cefr-j-reference: 머리(판 빈 값 · 출처 주소 · 열람일 · 이용 허락 '요청 전') · 48행 모두 pending_level_review · 과제 빈 목록. start-baseline: 초4 네 영역 3 · 초5 네 영역 4. start-recommendation: 빈 목록. goal-terms: spec 2절 안의 핵심 능력 · purpose 낱말(코드는 지금 시드처럼 한국어 낱말 그대로)과 허용 과제 유형 처음 값, 머리 상태 '안'(일의 차례 ② 승인 전). 모두 빌드에 묶고 DB 에 넣지 않는다. 부모 화면은 참고 대응표 머리의 이용 허락이 '받음'이고 그 행이 confirmed 일 때만 참고 범위를 보인다(1-나, 정본 3.1).
14. **검증 사례 · 보고의 자리(spec 미결 4).** 사례 꼴 Zod `src/core/evidence/cases.ts`, 합성 사례 `tests/fixtures/evidence-cases/synthetic.json`, 보고 순수 함수 `src/core/evidence/report.ts`, 명령 `scripts/evidence-report.ts`(`pnpm evidence:report --synthetic | --usage`, 모두 제안)다. 합성 사례는 예시 2판 SYN 일곱(A3 는 안 나 값으로)에 영역 넷 × 단계 1 · 3 · 4 × 오류 유형마다 둘, 맞는 통과 · 미통과 · 보류 영역마다 둘, 회화 1단계 입문자 단원 하나(AC-15z)를 더한다. 합성 보고는 표준 출력으로만 내고, 사용 시험 보고는 `docs/research/<날짜>-병행-검증-보고.md`(1-나)다. 사용 시험 내보내기는 git 밖 `tests/.tmp/evidence-export/` 에 원문 · 이름 없이 둔다. 보고 명령은 사례 파일에 커밋 안 된 변경이 있으면 돌지 않고(종료 2), 머리에 사례 파일 커밋과 실행 커밋을 적는다(AC-21g '앞 커밋'). 명령은 teach:metrics 와 같은 개발 도구 꼴(react-server 조건 · .env.local 개발 DB)이고 운영 빌드 · 화면에 들지 않는다.
15. **옛 행 되채움(spec 미결 5)은 사실이 남은 개발 DB 행만, 행마다 한 번 한다.** 가르치고 plan 정한 것 9 와 회화 plan 정한 것 22 가 승인 때 이 채움을 기대했다. 채우는 행은 둘이다: 시도 꼴 판 2 의 세 영역 끝 시도(바 의 함수), move 가 있고 앞 선생님 행 원문이 남은 회화 아이 행(talkEvidenceOf). 판 1 시도는 도움 기록이 없어 채워도 독립 여부를 가를 수 없으므로(attempt.ts superRefine 의 뜻) 채우지 않고 U '기록 전'으로 둔다. 명령은 `scripts/evidence-fill.ts`(`pnpm evidence:fill`, 제안: evidence 가 빈 행만, 같은 행을 두 번 채우지 않음, 개발 DB 만)이다. 운영 DB 는 1-가 기록을 옮기지 않아 처음부터 차고, 사용 시험은 1-나 운영 4주다.
16. **정본 밖 문구(spec 미결 6)** 는 아래 '정본 밖 문구' 표다(C72 꼴). 1-가 아이 화면 몫은 컨트롤러 승인, 1-나 부모 화면 몫은 1-나 브리프에서 다시 본다.
17. **사람 판정 칸의 화면 꼴(spec 미결 7, 1-나 몫).** judge_first 이면 단원 카드마다 목표 줄(목표 글) × 단추 넷(혼자 함 · 도움 받아 함 · 아직 못 함 · 판단 못 함)이 먼저 보인다. 검토 근거 셋(쓴 기준: 고른 단추의 기준표 줄이 저절로 / 본 자료: 앱 밖에서 시킴 · 부모 화면의 원래 답안 · 기록 가운데 하나 이상 / 판단 한 줄: 글 칸, 이름 가림 뒤 저장)을 채워 '저장'하면 목표마다 progress_events human_judgement 줄(target 영역 · 단계 · 단원 · 목표, actor parent)이 생기고 그 단원 근거가 열린다. 고치기는 새 줄이고 보고는 첫 줄을 쓴다. 검토 근거가 빈 줄은 '판단 못 함'으로 센다. 꼴은 평1 의 HumanJudgementSchema 다.
18. **마이그레이션은 0006 하나다.** attempts.evidence · talk_turns.evidence · level_tests.judgement · unit_specs.goals(비울 수 있는 jsonb)와 progress_event_kind 값 'human_judgement'. talk_turns.evidence 는 attempts.evidence 와 같은 Evidence 꼴이다. 회화 묶음 7 의 move 열 · talk_segment 'prep' 마이그레이션과 파일을 섞지 않고 먼저 닿는 쪽이 0006 이다(한 워크트리에서 한 사람만 drizzle generate). goals 적재와 함께 칸 해시(unitSpecBody)에 goals 를 넣으므로, 이미 적재된 목표 있는 단원 행(3단계 단원 1 셋)은 같은 내용 + goals 로 정정 번호를 올린다(적재기의 version-content-changed 를 피함).
19. **부모 확인 값(C56 (4)).** unit_progress.parent_check 는 pending(지금 값) · next_unit · restart_unit · level_down · auto_next(사흘 지남)다. 단계 평가 보강이 쌓일 때의 확인은 그 응시 행 judgement.parentCheck(pending · next_level · retest · weak_units · auto_promoted)에 둔다. 고르는 화면은 1-나이고, 사흘 넘김과 진행 사건은 1-가다.
20. **별 장부 · 연속 일수.** 세션을 끝낸 트랜잭션에서 earnsStar 가 참이면 star_ledger 한 줄(count 는 그때 reward.star_complete, reason new_lesson · untried_lesson)을 쓰되, 세션 행을 잠근 채 그 세션의 줄이 이미 있으면 더하지 않는다(세션마다 한 줄, 새 색인 없음). 홈 합 · 결과 · 회화 마무리는 장부를 읽는다. 장부 전 세션은 개발 DB 한 번 옮김 명령(`scripts/star-ledger-backfill.ts`, 제안)이 같은 함수 · 지금 값으로 옮긴다(운영 DB 는 처음부터 장부, 정본 3.5). 연속 일수는 순수 함수 streakOf(끝낸 세션의 학습일 · 회화는 참여 완료만 · streak.rest_days_per_week · 월요일 시작)이고, 홈 위 띠 streakDays 로 넘긴다(칸은 이미 그린다).
21. **회화 경계(회화 plan C192 승인, 정한 것 22 와 같은 말).** P12: talk_turns.evidence 열 · Evidence 꼴 · 노출 판정(exposureOf, 평8 가) · talkEvidenceOf(평8 다: 앞 선생님 행 move + 아이 행 사실 + 카드 · 단원 목표 → 근거 칸, 바 의 teachEvidenceOf 와 같은 형) · 회화 연습 시도의 근거 칸 · 상태 · 집계 · 보고 칸 (8)(9). 회화 plan: move 칸 Zod(묶음 5, `src/core/conversation/move.ts`) · 기록(묶음 7 · 8), 아이가 보인 능력의 앱 확인(묶음 18 goal-link.ts: move.linked · held, word needs 의 노출은 exposureOf 를 부름), 이월(carry.ts) · 유효 수행 턴 후보 셈 · 진도 막힘 후보(candidates.ts). talkEvidenceOf 가 읽는 칸은 move(kind · why · next · item · goals · words · stage · cause · streak · app · ai · intro · suggest · linked · held · sound · floor · prep)와 아이 행(input_mode · stuck_phrase · hint_kind · hint_level · heard_help · client_listen 의 출처 · target_words · said_words · self_used_words · 인식 글)이다. 들은 도움 열거는 그대로라 선택지는 two_answers, 따라 할 말 · 같이 말하기의 답 · 답 예시는 answer_example 이고 종류는 move.app 이 가른다. 근거 쓰기 한 줄은 회화 묶음 8 이 만든 turn.ts 새 갈래(아이 행 '말했다' 갱신과 같은 쓰기)에 든다: 묶음 18 때 열 · 함수가 있으면 18 이 넣고, 없으면 평10 이 18 Approved 뒤 넣는다. 짧은 준비 · 바닥선 듣기 활동 · 정리 따라 말하기는 attempts(talk-prep · talk-floor · talk-wrapup)의 근거 칸 validity practice 이고, 쓰기 줄은 그 시도를 저장하는 saveFollowAlong(`src/server/conversation/index.ts`)에 든다. 규칙은 아이 행과 같아서, 짧은 준비는 회화 묶음 9, 바닥선은 16 때 열 · 함수가 있으면 그 묶음이 넣고 없으면 평10 이 뒤에 넣는다. AC-15v 는 회화 plan 이 주인이고 P12 는 talkEvidenceOf 단위 시험을, AC-15s 의 validity 몫도 P12 단위 시험이 맡는다. AC-15z 는 평18 이 주인이다. 새 흐름에서 회화 이음매 onTalkSessionEnded 는 회화 8 · 9 · 12 뒤 이렇게 불린다: completed 는 참여 완료 셋(마무리 물음에 답함 · 바닥선 끝 · 참여가 있는 '그만하기')에서 세션마다 한 번이고, 마무리 물음 뒤 '더 이야기하기'를 해도 다시 부르지 않는다. aborted 는 참여가 거의 없어 확인 뒤 중단 · 옛 꼴 카드 세션 닫기 · 이어 하기 시간 지남이다. 평11 은 둘 다에서 단원 판정을 하고(정본 3.2 '완료 · 중단 모두'), 별 장부는 completed 에서만 쓴다(정본 3.5 참여 완료).
22. **회화 단계 평가.** 평가 대화 턴의 서버 · 화면과 장 끝 이음매(onTalkTestSheetDone)는 P13c 차례 9 몫이고 아직 코드에 없다(확인한 사실 7). P12 는 시작 화면 · level_tests 행 · 장 끝 뒤 합 · 잠재 점수 판정 · 결과 · 예비 턴 고르기를 붙인다. P13c 9 가 늦으면 회화 평가 몫만 평13 뒤 따로 닫는다(열린 질문 C1).
23. **알림 행 · 부모 화면은 1-나다(정본 9절 차수).** 1-가는 judgement · progress_events 에 사유와 다음 차례를 남겨 1-나가 알림 행을 만들 때 쓴다.
24. **검사 자리.** CEFR 단정 꼴은 check:ids 의 새 규칙 cefr-claim 으로 둔다(새 CI 작업을 만들지 않음, 분 한도). 판정 모듈 → 근거 상태 모듈 금지와 관리용 기준 목록 가져오기 제한은 의존 규칙 둘(check:deps)이다. 프리뷰 회색 줄은 `src/server/preview/` 의 함수가 운영 배포(VERCEL_ENV=production)에서 null 을 내는 꼴이고, 목록 파일을 가져오는 모듈은 preview · 시드 검증 · scripts 뿐이다.
25. **'맞힌 단어'(C178)와 연속 칸 글(UI · UX L-42 M1).** 다시 하기 결과의 '맞힌 단어'는 그 세션 단어별 정오에서 맞은 단원 단어(처음 나온 차례, 겹침 없음)이고, 글은 아래 문구 표다.
26. **회화 목표 출처와 확인 보류를 상태 함수가 읽는 법(정본 3.8 회화 문단).** 회화 아이 행 근거 칸의 goals 는 move.goals(노린 목표, 비면 카드 항목의 목표, 그다음 연결 규칙)에 move.linked(앱 확인으로 이은 목표)를 더한 것이고, confirmed 칸이 linked 몫을 가린다. 상태 함수는 confirmed 목표도 같은 목표별 기준 · 수준 규칙으로 센다. 이은 턴은 앱 확인을 지난 턴뿐이라 실패 기회를 만들지 않고, purpose 는 카드 purpose 라 3 을 내지 않는다. move.held(확인 보류)는 goals 에 넣지 않으므로 기회가 아니고 근거 창 · 최고 · 최근에 들지 않는다. 보고 (9)칸만 held · linked 턴을 사람 판정과 맞댄다. talk.self_goal_link 를 끄면 linked 가 비어 confirmed 도 빈다.
27. **보고의 회화 칸(정본 3.8 보고 꼴 (8)(9)).** (8)은 회화 단원마다 통과 실적(운영, 참여 완료한 정규 대화) · 후보 셈(유효 수행 턴, talk.valid_turns_ratio, 운영 판정에 쓰지 않음, C188) · 최소 수업 수를 나란히 두고, 후보 셈으로 최소 수업 수에 못 닿는 단원에 '진도 막힘 후보'를 단다. 셈은 회화 묶음 18 의 candidates.ts 가 내고 보고 함수는 값만 받는다(근거 상태를 읽지 않음). last_judgement 의 aggregate.talkCandidate 도 같은 값이다. (9)는 확인 보류 턴(move.held)과 앱 확인으로 이은 턴(move.linked)의 사람 판정 일치이고 사용 시험(1-나)에서만 낸다. 합성 보고는 (8)만 내고(AC-15z), candidates.ts 가 늦으면 AC-15z 사례만 그 뒤에 더한다.

## 이름 · 설정값 · 문구

근거 칸 Evidence(v 1, 평1). 정본 04 '수행 근거 칸' 값의 코드 이름이다. 자유 글 칸이 없다. words 는 단어 원형 꼴(WordIdSchema), goals 는 목표 ID 꼴, ctx 는 칸 키 꼴이고, purpose · demands 는 서버가 쓰기 전에 목표 용어 목록으로 확인한다(목록 밖 값은 거부, AC-N16).

| 칸 | 꼴 | 채우는 것 |
|---|---|---|
| v | 1 | 다음 꼴은 2 로 올리고 옛 판도 읽는다 |
| task | 과제 유형 코드(정한 것 5) | taskCodeOf |
| goals · link | 목표 ID 목록(빈 목록 가능) · 빈 까닭 no_goals(목표 정의 전) · ambiguous(연결 모호) | 목표 연결 함수(A8: 목표 칸 → 요구 능력 → (단원, 과제 유형)) |
| confirmed | 목표 ID 목록(선택) | 회화 'AI 제안 · 앱 확인'으로 이은 목표(goals 의 부분, 출처 표시) |
| purpose · demands | 목표 용어 낱말(선택) | 시드 꼬리표. 비면 home · 이어진 목표의 core |
| words | 단원 단어 원형 목록 | 노린 단원 단어 |
| assist · retry | 정본 04 assist 값 목록 · { assist, accuracy } | 첫 시도의 도움(없으면 none) · 같은 칸의 도움받은 시도(바 그대로) |
| exposure | { 원형: answer_exposed · choice · question_word · none } | 아이가 쓴 단원 단어마다(노출 판정 함수, 기록 때) |
| accuracy | correct · partial · wrong · no_answer | 첫 시도 |
| result | correct · rate · judge · ai · bundle · communicative · expressionDone(바 그대로)에 score(평가 문항 0~1) · rubric(채점표 평균 1~4) · appropriate(회화 알맞은 응답 제안) · formOk(학습 요소에 고칠 곳 없음) · expressionRate(목표 표현 일치율)를 더함, 모두 선택 | 원 결과 · 목표별 기준의 앱 확인 사실(response · expression · form) |
| validity | valid · practice · dont_know · stuck · { technical: recognition · no_mic · nospeech · ai_fail · ai_rest · network · speak_fail } | speak_fail 이 7절 '들려주지 못함'의 코드 이름이다(바 그대로) |
| ctx · source | { item, example } · { assist, accuracy, validity }: server · device | 정한 것 7 · NFR-16 |

판정 칸(평1). UnitJudgement(last_judgement) = { v 1, at, settingsVersion, old: { conditions: [{ key: lessons · days · words · recent · talk_said · talk_done, value, threshold }], outcome: pass · continue · remedial · word_practice · parent_check · auto_next, lockLine }, evidence: { words, goals: UnitEvidence[] }, aggregate: { done: { 세션 종류: 수 }, passLessons, passRecent, goalsDone, goalsTotal, talkCandidate? }, candidate: achieved · hold · not_yet }. UnitEvidence = { id, axes(독립 · 도움 · 정확도 넷 · 달성의 수), best 0~3 · U, recent 0~2 · U, recentWhy?, recheck?: one_fail · technical, review?: repeat_fail · stale, uWhy?, apply?: structural_none · not_yet · not_independent, marks(repeat · new_example · applied), refs: [{ kind: attempt · turn · test_item, id, rule }] }. LevelTestJudgement(judgement) = { v 1, S, R, min, max, P, perUnit: [{ unit, scored, required }], result: pass · fail · hold · closed_short · closed_parent, reasons(technical · ai_wait · unit_range · no_form), recheckUnits, log: [{ kind: retry · spare · rescore · new_task · close_short · close_parent, itemNo, at }], unitEvidence?, parentCheck? }. hold · closed_short · closed_parent 동안 passed 는 비운다. HumanJudgement(progress_events.new_value) = { judgement: independent · assisted · not_yet · cannot_judge, basis: { criterion, materials: outside_task · original_answer · record, note } }.

허용 과제 유형 처음 값(안, 정한 것 6). 일의 차례 ②에서 다듬는다. 지금 시드의 목표(read-3-1-1 fact · write-3-1-1 assemble-sentence · speak-3-1-1~3 repeat · listening · question)는 모두 이 안에 든다.

| 영역 | 핵심 능력 → 허용 과제 유형 |
|---|---|
| 읽기 | 낱말 · 문장 뜻 알아보기 → picture · vocab-in-context / 사실 정보 찾기 → fact / 일의 차례 잡기 → sequence / 중심 생각 잡기 → main-idea · topic · gist · structure / 안내대로 할 일 고르기 → fact · inference / 까닭과 의견 찾기 → inference · purpose |
| 쓰기 | 낱말 쓰기 → pick-word · copy-tiles · fill-letters · dictation · build-tiles / 문장 꼴 바르게 쓰기 → assemble-phrase · assemble-sentence · fill-blank · fix-sentence · guided / 자기 소개 쓰기 · 겪은 일 차례로 쓰기 · 설명하기 · 의견과 까닭 쓰기 → guided · composition |
| 말하기 | 듣고 따라 말하기 → repeat / 듣고 뜻 잡기 → listening / 정보 묻고 답하기 → question · confirm / 사물 이름 말하기 · 생김새 말하기 · 좋고 싫음 말하기 → question · picture-talk / 자기 소개하기 · 겪은 일 말하기 · 길과 계획 말하기 · 의견과 까닭 말하기 · 이야기 다시 말하기 → question · picture-talk · presentation |
| 회화 | 모든 회화 핵심 능력 → card-answer · follow-up · child-topic · test-turn. 정보 묻고 답하기는 child-question, 물건 · 도움 부탁하기 · 길과 계획 말하기는 mission 을 더함(인사 나누기 · 물건 · 도움 부탁하기는 회화에만) |

설정 키 열다섯(평3, spec 8절). 정본 12절에는 아직 없다(C183). 범위는 모두 집 전체이고 기본값은 잠정이다. settings.json 의 changeVia 는 결정 기록 먼저 → decision-first, 고급 → advanced, 시드 → seed 다.

| 키 | 기본값 | 바꾸는 곳 | 복사 |
|---|---|---|---|
| evidence.recent_count · recent_min · recent_days · recent_study_days · review_fails | 3 · 2 · 30 · 15 · 2 | 결정 기록 먼저 | 단원 시작(unit_progress) |
| evidence.min_opportunities · apply_new_situations | 2 · 1 | 결정 기록 먼저 | 단원 시작 |
| evidence.rubric_cut · match_cut | [2, 3] · [0.6, 0.8] | 결정 기록 먼저 | 단원 시작 |
| evidence.parent_view | judge_first | 시드 | 단원 시작 |
| speaking.min_scored_ratio | 0.5 | 결정 기록 먼저 | 단원 시작 |
| level.min_scored_per_unit · item_retry_max | 3 · 1 | 결정 기록 먼저 · 고급 | 평가 시작(level_tests) |
| level.test_spares_per_unit · ai_task_spares_per_form | 1 · 1 | 시드(다시 만드는 키) | 없음 |

관계 검사 셋을 더한다: level.min_scored_per_unit ≤ level.test_items ÷ 단원 수(5) · evidence.recent_min ≤ evidence.recent_count · evidence.review_fails ≤ evidence.recent_count(3.2 관계 표). 단원 시작 복사본은 지금 수만 받으므로(unitSnapshotOf) 수 · 수 목록 · 글을 받게 넓힌다. 함께 쓰는 지금 키: unit.* · level.test_items · level.pass_score · level.test_forms · level.retest_gap_days · level.remedial_before_retest · level.near_pass_gap · review.intervals_days · review.daily_cards_per_area · vocab.mastery_streak · reward.star_complete · streak.rest_days_per_week · speaking.answer_match_pass · talk.said_ratio · talk.known_days · talk.test_match_pass · talk.test_hint_scores · ai.feedback_max_attempts · seed.goals_required_levels · seed.unit_goals_max · seed.complete_through_level.

정본 밖 문구(C72 꼴, 정한 것 16). 정본 4절에 있는 글(평가 시작 · '반을 했어요' · 통과 · 범위 끝 · 못 넘음 · '거의 다 왔어요' · 보류 · '결과는 조금 뒤에 볼 수 있어요' · '평가 이어 보기' · '평가 다시 보기' · '평가 결과 보기' · '맞힌 카드 n장' · '다음 복습' · '이제 글자로 만들어 볼까요?' · '단원 n을 통과했어요!' · 남은 조건 줄 · 단어 익히기 줄)은 그대로 쓰고 여기 다시 적지 않는다. 수는 설정값에서 채운다.

| 자리 | 글 | 차수 |
|---|---|---|
| 다시 하기 결과 '맞힌 단어' 칸 | 제목 '이번에 맞힌 단어', 단어 칩(맞은 것이 없으면 칸을 두지 않음) | 1-가 |
| 홈 위 띠 연속 칸 | 이어질 때 '연속 n일'. 끊긴 뒤 다시 시작하면 '다시 1일째'이고, 지난 최고가 지금보다 크면 뒤에 ' · 최고 m일' | 1-가 |
| 단계 평가 결과(문항 모자람으로 닫힘) | '다음에 새 문제로 처음부터 다시 봐요'와 큰 버튼 '수업 목록'(C193 에서 고침: 큰 버튼이 '수업 목록'이라 지금 다시 보는 것으로 읽히지 않게) | 1-가 |
| 부모: U 사유 | 기회 없음 '아직 해 볼 기회가 없었어요' · 기술 오류 '기기 문제로 확인하지 못했어요' · 근거 없음 '확인할 기록이 없어요' · 기록 전 '기록을 남기기 전에 한 공부예요' · 목표 정의 전 '단원 목표를 정하는 중이에요' · 연결 모호 '어느 목표의 문제인지 가르지 못했어요' · 알맞음 근거 없음 '대화가 알맞았는지 확인할 기록이 없어요' · a9_pending '판단 기준을 정하는 중이에요' | 1-나 |
| 부모: 최근 U · 응용 · 맥락 | 최근 U: '기기 문제로 최근 기록이 모자라요' · '최근에 해 본 기회가 모자라요' · '오래전에 했어요'. 응용: '이 단원에는 새 상황 문제가 아직 없어요' · '새 상황 문제를 아직 하지 않았어요' · '새 상황 문제에서 도움을 받았어요'. 맥락: '여러 날 혼자 했어요' · '다른 예에서도 했어요' | 1-나 |

## 바뀌는 파일 (Files that change)

### 평1~평3 · 바탕

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 평1 | `src/core/evidence/schema.ts`(제안) | 신규 | EvidenceSchema · UnitJudgementSchema · LevelTestJudgementSchema · HumanJudgementSchema(위 표), 칸 키 · 목표 ID 꼴, checkEvidenceTerms(목표 용어 확인) |
| 평1 | `src/core/evidence/tasks.ts`(제안) · `src/core/evidence/teach.ts` | 신규 · 수정 | 과제 유형 코드와 taskCodeOf. teach.ts 는 Evidence 꼴(v 1)로 내고 동작은 그대로 |
| 평1 | `tests/unit/evidence-schema.test.ts`(제안) · `teach-evidence.test.ts` | 신규 · 수정 | AC-N16, 코드 닫힘(시드 type · testMix 키 ⊂ 코드 목록) |
| 평2 | `drizzle/0006_*.sql` · `drizzle/meta/*` · `src/db/schema/{learning,content}.ts` | 신규(생성기) · 수정 | 열 넷 · enum 값 하나. 지우기 없음 |
| 평2 | `src/server/seed/load.ts` · `seed/unit-specs.json` · `tests/integration/seed-load.test.ts` | 수정 | unit_specs.goals 적재와 칸 해시, 목표 있는 단원 셋 정정 번호, 적재 시험 |
| 평3 | `seed/settings.json` · `tests/fixtures/settings.ts` · `specs/09-설정값.md`(p13d 사본) · 본 저장소 `specs/09-설정값.md`(편집자) | 수정 | 키 열다섯과 12절 표 · 복사 목록 · 다시 만드는 키 · 관계 문장(C183). p13d 사본의 회화 전용 줄 두 행(talk.practice_rounds · talk.reask_sentence_every_turns)은 회화 묶음 12 까지 그대로 둔다 |
| 평3 | `src/core/profile/start.ts` · `src/core/vocab/allocate.ts` · `tests/unit/{first-run,vocab-allocate}.test.ts` | 수정 | 단원 · 평가 시작 복사 목록과 값 꼴, 관계 셋(checkFrameRelations) |

되돌리기: 열은 비울 수 있는 jsonb 라 코드만 되돌려도 행이 읽힌다. 열은 지우지 않는다(더하기만). 설정 행은 행 단위로 뺀다.

### 평4~평9 · 순수 함수

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 평4 | `src/core/review/{schedule,cards,attempt}.ts`(제안) · `tests/unit/{spaced-review,review-card}.test.ts`(제안) | 신규 | 단어별 정오 → 상태 바뀜(수업 틀림은 다음 학습일 · 다시 하기 · 연습 맞음은 그대로 · 카드 맞음만 연속 정답), 간격 표, 서로 다른 학습일 '안다', 유지 복습 틀림 풀기, 카드 꼴 · 속하는 영역 · 15장 · 차례 · 미룸, 두 단계 · 겹침 카드 · 알파벳 단원 전 철자 건너뜀, 복습 시도 꼴 |
| 평5 | `src/core/unit-pass/{judge,recent,pick}.ts`(제안) · `src/core/scoring/score.ts` · `tests/unit/{unit-pass,practice-pick,score}.test.ts` | 신규 · 수정 | 네 조건(회화 '말함' · 참여 완료한 정규 대화), 최근 창(3.7 '넣지 않는다' 행 · 얇은 근거 두 행. 세션 점수는 그대로 두고 창에서만 뺌), 판정 결과(통과 · 보강 · 단어 익히기 · 부모 확인 · 사흘), 보강 · 연습 고르기, 남은 조건 한 줄 |
| 평6 | `src/core/level-test/{score,judge,recover,remedial,attempt}.ts`(제안) · `tests/unit/level-test.test.ts`(제안) | 신규 | 문항 점수, 잠재 점수 판정(S · R · P · 단원 범위), 재시도 · 예비 · 문항 모자람 · 새 벌 · AI 재채점 · 새 작문 조건 · 부모 조정, 재응시 간격 · 재응시 전 보강 · 벌 되풀이(미통과만), 결과 문구 고르기, 졸업 · 다음 단계 준비 중, 평가 시도 꼴 |
| 평7 | `src/core/reward/star.ts` · `src/core/streak/streak.ts`(제안) · `scripts/star-ledger-backfill.ts`(제안) · `package.json` · `tests/unit/{star-count,streak}.test.ts` | 수정 · 신규 | 장부 줄 만들기, streakOf · 이번 주 n일, 개발 DB 옮김 명령 |
| 평8 | `src/core/evidence/{link,exposure,record,talk}.ts`(제안) · `tests/unit/evidence-{link,exposure,record,talk}.test.ts`(제안) | 신규 | 가: exposureOf(제안: 답 자리 낱말 · 앞 선생님 글 · 소리 줄 글 · 아이 글 · 단원 단어 → 낱말마다 answer_exposed · choice · question_word · none, 'X or Y?' · 'X? Y?' 선택지, 이야기 자극은 밖, 견줌은 metWordsIn 정규화)와 목표 연결. 나: 출처별 기록 함수. 다: talkEvidenceOf(move Zod 를 가져다 씀) · 회화 연습 시도 |
| 평9 | `src/core/evidence/{state,aggregate}.ts`(제안) · `tests/unit/evidence-{state,aggregate}.test.ts`(제안) | 신규 | 기회 펼치기(근거 칸 × 단어 · 목표, 함께 요구한 능력의 목표는 1 · 2 만), 세 축 · 수준, 맥락 셋, 최고 · 최근 · 다시 확인 · 복습 필요, U 사유, communicativeLevel(A9 자리), 후보 판정, 참조, 집계 셋(+ 회화 후보 셈은 회화 plan 함수의 값을 받음), 단계 평가 단원 근거 요약 |

되돌리기: 순수 함수는 부르는 곳을 빼면 영향이 없다.

### 평10~평14 · 서버 · 화면

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 평10 | `src/server/session/index.ts` · `src/server/writing/{index,composition}.ts` · `src/server/speaking/index.ts` · 회화 turn.ts 새 갈래 한 줄 · index.ts saveFollowAlong 한 줄(회화 묶음 9 · 16 · 18 이 못 넣었을 때) · `scripts/evidence-fill.ts`(제안) · `package.json` · `tests/integration/evidence-record.test.ts`(제안) | 수정 · 신규 | 끝 시도와 같은 트랜잭션의 근거 쓰기 한 줄씩(몸통은 core/evidence/record.ts), 개발 DB 채움 명령(정한 것 15) |
| 평11 | `src/server/progress/{index,unit,talk,parent}.ts`(제안) · `src/server/session/index.ts`(finishLessonSession 끝 한 줄) · `src/server/conversation/state.ts`(onTalkSessionEnded 안 한 줄) · `src/server/home/index.ts`(별 합 → 장부) · `tests/integration/unit-progress.test.ts`(제안) | 신규 · 수정 | 단원 판정 길(정한 것 2), unit_progress 새 단원 · 새 회차와 복사본, 진행 사건, 별 장부, 부모 고르기 · 단계 바꾸기 함수(1-나 화면이 부름) |
| 평12 | `src/server/review/index.ts` · `src/server/actions/review.ts` · `src/app/(child)/review/[area]/{page,review-flow}.tsx` · `src/components/review/*`(모두 제안) · `src/core/today/done.ts` · `src/app/(child)/page.tsx` · `tests/integration/review.test.ts` · `tests/e2e/review.spec.ts`(제안) | 신규 · 수정 | 복습 세션(sessions 종류 review) · 카드 화면(뜻 고르기 · 철자 타일, 버튼 '알아요 · 몰라요' 없음) · 결과 · 홈 포스트잇(읽기 → 쓰기 → 말하기) |
| 평13 | `src/server/level-test/{index,recover}.ts` · `src/server/actions/level-test.ts` · `src/app/(child)/level-test/[area]/*` · `src/components/level-test/*`(모두 제안) · `src/server/writing/composition.ts`(앱 진입 재호출 옆 한 줄) · `tests/integration/level-test.test.ts` · `tests/e2e/level-test.spec.ts`(제안) | 신규 · 수정 | 평가 세션 · 채점(AI 과제는 첨삭 · 말하기 평가 호출 그대로) · 판정 · 보류 · 복구 · 결과 화면, 회화 평가는 장 끝 이음매 뒤(정한 것 22) |
| 평14 | `src/server/session/result.ts` · `src/app/(child)/result/[id]/result-view.tsx` · `src/server/lesson-list/{index,band}.ts` · `src/core/lesson-list/state.ts` · `src/app/(child)/[area]/lessons/lesson-board.tsx` · `src/app/(child)/{page,home-cards}.tsx` · `src/server/home/index.ts` · `tests/unit/lesson-list-state.test.ts` · `tests/e2e/{result,lesson-list,home}.spec.ts` | 수정 · 신규 | 결과 막대 · 통과 줄 · 맞힌 단어 · 장부 별, 목록 gate(wordsShort · scoreShort) · levelTest 상태 넷 · 평가 전 보강 · remedialIssued · practice · reviewDue, 연속 칸 값 |

되돌리기: 서버 몸통은 새 파일에 두고 공용 파일에는 부르는 한 줄씩만 둔다. 그 줄을 빼면 앞 동작이다(위험 3).

### 평15~평18 · 시드 · 검사 · 검증

| 묶음 | 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|---|
| 평15 | `seed/lists/{goal-terms,cefr-j-reference,start-baseline,start-recommendation,goal-coverage}.json`(제안) · `src/core/seed/structure.ts`(SEED_FILES) · `src/core/seed/schema/{reference,lesson,assessment}.ts` | 신규 · 수정 | 목록 다섯과 꼴(정한 것 12 · 13), 문항 꼬리표 purpose · demands · goal(선택), 평가 문항 spare 칸. 회화 카드의 같은 칸은 회화 plan 의 카드 새 꼴이 정하고 검사만 같은 함수 |
| 평15 | `src/core/seed/check-goals.ts`(제안) · `check-assessment.ts` · `reference-index.ts` · `validate.ts` · `tests/unit/{seed-validator-goals,seed-lists}.test.ts`(제안) | 신규 · 수정 | 정본 6.4 새 행 여덟과 '단계 평가' 행 보탬(spec 2절 검증기 표). 필수 범위는 완전성 모드 · --require-unit-goals 일 때 오류, 개발 적재와 그 밖의 CI 는 보고만(C160 · C186) |
| 평16 | `scripts/check-ids.ts` · `.dependency-cruiser.cjs` · `src/server/preview/start-baseline.ts`(제안) · `src/app/(setup)/first-run/first-run-flow.tsx` · `tests/unit/check-ids.test.ts` · `tests/e2e/first-run.spec.ts` | 수정 · 신규 | cefr-claim(화면 소스 · 화면으로 가는 시드 글의 'CEFR-J' + 단계 숫자, 하위 수준 이름 곁 '참고' · '공식 판정 아님' 없음, 큰 등급 이름 곁 '처음 배정' 없음), 의존 규칙 둘, 회색 줄 |
| 평17 | `seed/prompts/level-test-{reading,writing,speaking,talk}-1.md` · `seed/prompts/_template.md` · `seed/level-tests/*/1.json` · `seed/manifest/level-test-*-1.jsonl` · `seed/checks/…` | 수정 | 예비 문단 · 예비 AI 과제 규칙 한 문단, 예비 문항 · 예비 턴, 생성 · 풀이 검사 기록 |
| 평18 | `src/core/evidence/{cases,report}.ts`(제안) · `tests/fixtures/evidence-cases/synthetic.json`(제안) · `scripts/evidence-report.ts`(제안) · `package.json` · `tests/fixtures/evidence/placement-split.json`(제안) · `tests/unit/{evidence-cases,placement-split}.test.ts`(제안) | 신규 | 사례 꼴 · 보고 꼴 (1)~(9)(회화 칸은 candidates.ts 값을 받음, 정한 것 27) · 명령 · 배치 가름 기록(답 묶음 여섯, nextPlacementStep 그대로) |

되돌리기: 검사 하나는 그 검사를 부르는 한 줄을 빼면 앞과 같다. 예비 문항은 새 칸이라 그 칸을 지운 판으로 되돌린다.

### 평19 · 평20

| 묶음 | 파일 | 무엇을 |
|---|---|---|
| 평19 | p13d `specs/*.md` 사본(회화 전용 줄 두 행은 회화 묶음 12 까지 그대로) · `intent/2026-10-15-모모-잉글리시-아카데미/plan.md`(P12 행 · 증명 표 파일 칸) | 정본과 사본 맞춤, 1차 plan 이 이 plan 을 가리킴 |
| 평20 | 작업 장부 `review-screen-p12.md`(제안) · 프리뷰 상태표 · 1-가 끝 점검표 | 화면 검토 · 실행 기록 · '평가 기능 완료' 점검 |

## 작업 순서 (Order of work)

명령은 `( cd .claude/worktrees/p13d && PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH … )` 서브셸로만 하고, 시험을 먼저 써서 실패를 본 뒤 통과시킨다. 통합 · e2e 는 이 Mac 에서 돌지 않으므로(UI · UX L-2) 정적으로 쓰고 실행은 차례 13 이다.

1. [사람] 컨트롤러 검토 · 승인(13절 한 줄). 구현 묶음은 회화 첫 프리뷰(회화 묶음 14) 뒤에 시작한다(컨트롤러 10-30 08시대). 그때 브리프 평1 · 평8 가 · 평3 · 평4~평7 을 먼저 낸다(회화 묶음 18 이 exposureOf 와 evidence.match_cut 을 기다림). 끝 판정: plan approved, 브리프가 장부에 있다.
2. [순수] 평1 ∥ 평8 가(노출 판정 · 목표 연결. 회화 묶음 18 이 부르므로 먼저) ∥ 평4 ∥ 평5 ∥ 평6 ∥ 평7(새 파일이 거의 전부라 잠금이 적다. 다른 plan 묶음과 합쳐 다섯까지, 넘치면 평6 · 평7 을 뒤로). 끝 판정: 단위 · 관문 통과와 코드 검토 Approved.
3. [설정] 평3(구현을 시작하면 첫 차례. 같은 파일을 고친 회화 묶음 1 은 그때 Approved 이고, 정본 12절 82줄 꼴은 컨트롤러가 먼저 고침). 평3 이 끝나면 evidence.match_cut 이 settings 에 있으므로 회화 묶음 18 은 expression needs 를 확인 보류 대신 앱 확인으로 본다. 끝 판정: check:ids 보고 규칙 0, 관계 셋 · 복사본 단위 통과, 정본 12절에 열다섯 행.
4. [DB] 평2(평1 뒤, 회화 move 마이그레이션과의 차례는 컨트롤러가 정함). 끝 판정: `pnpm db:generate` 를 다시 돌려 차이 없음, 단위 통과, 적재 통합 작성됨.
5. [순수] 평8 나(평1 · 평3 뒤) ∥ 평8 다(회화 묶음 5 의 move Zod 뒤, 회화 묶음 18 보다 먼저) → 평9. 끝 판정: AC-21d(단위) · 21e · 21f · 22g · 22h · 22j · N17 · 15s · 15v(근거 몫) 단위 통과.
6. [검사] 평15(평1 뒤, 5 와 나란히) → 평16. 끝 판정: 원본 시드(1단계 · 3단계 단원 1)가 새 규칙에서 오류 0(1단계 목표 없음은 경고), 부정 표본 시험 통과, check:deps · check:ids 0.
7. [서버] 평10(평2 · 평8 뒤, server/session/index.ts 잠금이 풀린 뒤. 회화 쓰기 줄은 회화 묶음 9 · 16 · 18 이 넣지 못했을 때 그 묶음 Approved 뒤이고, 그 회화 서버 파일을 다른 회화 묶음이 잡지 않은 때) → 평11(평4 · 5 · 7 · 9 · 10 뒤, onTalkSessionEnded 한 줄은 회화 묶음 8 Approved 뒤이고, state.ts 를 고치는 회화 7 · 12 · 18 이 그 파일을 잡지 않은 때. 잠금 차례는 컨트롤러가 정함). evidence:fill 은 평10 끝과 회화 묶음 18 Approved 뒤에 [사람] 컨트롤러가 개발 DB 에 돌린다(빈 행만 채우므로 다시 돌려도 같은 행을 두 번 채우지 않음). 끝 판정: 단위 · 관문 · 코드 검토 Approved, 통합 작성됨.
8. [서버 · 화면] 평12 ∥ 평13(평11 뒤, 평13 은 평6 도) → 평14(UI · UX 5-가 · 3 과 가르치고 라-4 의 잠금이 풀린 뒤). 끝 판정: 묶음마다 코드 검토 Approved, e2e 작성됨, 로컬 눈 점검 사진(next dev · 개발 DB · 세로 820 · 가로 1180).
9. [시드] 평17(평15 뒤): 브리프 넷 → 예비 생성 → seed:validate → seed:check 실호출([사람] 개발용 키, 컨트롤러) → 시드 검토(Fable max: 예비가 같은 단원 · 유형 · 난이도 결인지, 본 문항 · 수업 문항과 겹치지 않는지) → 개발 DB 적재([사람]). 끝 판정: 1단계 네 영역 예비가 검증 · 풀이 검사를 통과하고 적재됐다.
10. [검증] 평18(평9 뒤, AC-15z 사례는 회화 묶음 18 의 candidates.ts 뒤): 사례 파일을 먼저 쓰고, [사람] 그 파일만 든 커밋을 요청자 지시로 둔 뒤 계산을 돌린다(열린 질문 R6). 끝 판정: AC-21g 단위 통과, `pnpm evidence:report --synthetic` 이 기대값 일치 수를 낸다.
11. [문서] 평19: 정본 · p13d 사본 대조(회화 전용 줄 두 행은 회화 묶음 12 까지 그대로) → check:ids · spec:trace(unknown-ac · plan-ac-not-in-spec · missing-test 0) → 1차 plan P12 행. 끝 판정: 두 명령 종료 0.
12. [검증] 화면 검토 1(Fable max, 로컬 사진: 복습 카드 두 단계 · 결과, 단계 평가 시작 · 문제 · 반을 했어요 · 통과 · 못 넘음 · 보류 · 문항 모자람, 목록 맨 위 넷과 평가 전 보강, 결과 막대 · 통과 줄 · 맞힌 단어, 홈 연속 칸 · 복습 포스트잇), fix 3회까지. 끝 판정: 보고 Approved.
13. [사람] 커밋 · push(요청자 지시, 11-01 뒤 CI) → CI 통합 · e2e 한 번(workflow_dispatch 또는 PR 'e2e' 라벨) → 실패면 고쳐 다시. 끝 판정: 실행 기록(일시 · 커밋 · 시험 수 · 통과).
14. [사람] 평20: 프리뷰에서 시각 당기기로 단원 통과 · 단계 평가 통과 · 보류 → 같은 날 이어 보기를 컨트롤러가 돌리고, 요청자 프리뷰(상태표 첫 줄에 되는 것 · 안 되는 것 · 시험용 자료 여부), '평가 기능 완료' 점검(일의 차례 ② 목표가 1 · 3 · 4 · 5단계에 있을 때만). 끝 판정: 1-가 끝 점검 기록 · 완료 보고 · plan done.

나란히(차례 1 부터): [사람] 일의 차례 ②. 학습 설계자가 목표 글 · 덮음 표 · 목표 용어 목록(허용 과제 유형 처음 값 다듬기)을 쓰고, 설계 검토자(Fable max)가 대표성을 본 뒤 요청자가 승인한다. 승인되면 unit-specs goals 를 정정 판으로 적재하고(goal-coverage 는 빌드에 묶여 적재하지 않음), 그 단계 수업 · 평가 문항의 goal · purpose · demands 칸은 그 단계 시드를 다시 만드는 묶음(가르치고 둘째 묶음 · P8)이 넣는다.

## 차례와 겹침(다른 변경 단위)

| 다른 일 | 겹치는 파일 · 자리 | 먼저 | 까닭 |
|---|---|---|---|
| 회화 plan(C192 승인, 정한 것 22 · 겹침 표가 이 plan 과 같은 말) | 설정 파일(회화 1 이 24행 진행 중), drizzle 번호(회화 7 의 move · prep 파일), move Zod(회화 5 `src/core/conversation/move.ts`), turn.ts 새 갈래(회화 8 이 '말했다' 갱신을 옮김, reachTalkTarget → completeTalk), 회화 서버 파일(index.ts 3 · 9 · 12 · 16 · 18, turn.ts 3 · 8 · 12 · 16 · 17 · 18, state.ts 3 · 7 · 12 · 18, closing.ts 3 · 7 · 12 · 16. 3 은 이름만 바꿈), goal-link · carry · candidates(회화 18), 12절 사본의 회화 전용 줄 두 행(회화 12 에서 지움) | 회화 1 → 평3. 회화 7 ↔ 평2 는 먼저 닿는 쪽이 0006. 평8 가(exposureOf) → 회화 18 의 앱 확인. 회화 5 → 평8 다. 회화 8 Approved → 평11 의 이음매 한 줄(회화 7 · 12 · 18 이 state.ts 를 잡지 않은 때). 회화 18 → 평10 의 회화 한 줄(18 이 못 넣었을 때) · 평18 의 회화 칸 | 같은 파일을 두 구현자가 동시에 고치지 않는다. 회화 '끝낸 세션'의 뜻(참여 완료)과 이음매 이름이 회화 8 에서 바뀐다 |
| 가르치고 배우는 수업 plan(라-2 · 라-3 · 마-2 진행, 바 · 사 끝) | server/session/index.ts · result.ts · result-view.tsx · reward.tsx · evidence/teach.ts · recap.ts | 그 묶음 Approved 뒤 평10 · 평11 · 평14. teach.ts 꼴 맞춤(평1)은 바 가 닫혀 바로 | 근거 값 이름은 바 가 제안하고 이 plan 이 받는다(정한 것 3) |
| UI · UX plan(5-가 · 3 · 0-다) | result-view · reward · lesson-board · home-cards · page.tsx · band.ts | UI · UX → 평14 | 결과 판 · 위 띠 꼴은 UI · UX 가 잡고 이 plan 은 값과 줄만 더한다 |
| P11c(approved, 미구현) | server/speaking · 말하기 AI 활동 끝 시도 | P11c 가 그림 보고 말하기 · 발표 · 확인 질문의 근거 한 줄을 넣는다(평8 함수) | 정본 11절 '말하기 3~12 AI 판정의 근거는 P11c 와 함께' |
| P13c 차례 9(회화 평가 대화, 미구현) | server/conversation 평가 모드 · 장 끝 이음매 | P13c 9 → 평13 의 회화 몫 | 정한 것 22 |
| 시드 생성(P8 · 가르치고 자 · 회화 카드) | seed/prompts/_template.md · manifest · unit-specs.json | 가르치고 자-1 → 평17 의 틀 한 문단, 평2 의 정정 판은 다른 손이 unit-specs 를 잡지 않을 때 | 시드 파일은 한 사람씩 |
| 일의 차례 ② | goal-terms · goal-coverage · unit-specs goals | 평15 꼴 → 학습 설계자 값 | '평가 기능 완료'의 조건 |

## 위험 · 제약 (Risks)

| 번호 | 위험 | 막는 법 | 되돌리기 |
|---|---|---|---|
| 1 | 병행 계산이 운영 판정으로 샌다(spec 우려 9) | 판정 모듈 → 근거 상태 모듈 의존 금지(check:deps), 통합 시험 'evidence.* 를 바꿔 다시 판정해도 통과 · 보강 · 연습 고르기가 같다'(AC-21e), 아이 화면에 근거 낱말 · '%' 없음(평14 e2e 한 줄) | 서버 판정 길의 근거 쓰기 한 줄을 빼면 옛 판정만 남는다 |
| 2 | A9 미확정(가르치고 L-18) | 정한 것 8. 세션 점수 · 단원 판정 입력은 판정 그대로(맞음)이고 상태 함수의 그 칸만 U | 함수 한 줄 |
| 3 | 공용 파일 겹침(위 표). 커밋 전 한 워크트리에 여러 plan 이 섞인다(UI · UX L-19) | 파일 잠금, 서버 몸통은 새 파일(server/progress · level-test · review)에 두고 공용 파일은 한 줄씩, 묶음 보고에 바꾼 줄 목록 | 줄 목록으로 손으로 되돌린다(`git checkout -- <파일>` 금지) |
| 4 | 마이그레이션: 번호 충돌 · enum 값 · 옛 행 | 정한 것 18. ALTER TYPE … ADD VALUE 로 더한 값은 같은 마이그레이션 안에서 쓰지 않는다(Postgres 규칙). 옛 행은 U '기록 전'(정한 것 15) | 열은 비울 수 있어 코드만 되돌려도 된다 |
| 5 | unit_specs.goals 칸 해시 · 정정 번호(정한 것 18) | 목표 있는 단원 셋만 정정 판, 개발 DB 적재 기록, 적재 시험 | unitSpecBody 에서 goals 를 빼면 앞과 같다(정정 판 행은 남음) |
| 6 | 회화 plan 과의 경계(move · goal 출처 · 확인 보류 · 후보 셈) | 정한 것 21 · 26 · 27 과 회화 plan 정한 것 22 가 같은 말(C192), AC-15v · 15s · 15z 주인을 가름, talkEvidenceOf 는 회화 move Zod 를 가져다 씀, exposureOf 를 먼저 냄(평8 가) | 회화 한 줄을 빼면 회화 근거 칸이 빈다(U 기록 전) |
| 7 | 회화 단계 평가 미구현(P13c 9) | 정한 것 22, 세 영역 평가를 먼저 닫음 | 회화 평가 몫만 미룸 |
| 8 | 1-나 부모 화면 의존: 1-가에는 근거를 보는 화면이 없고, 사용 시험은 judge_first 부모 화면이 있어야 한다 | 1-가는 개발 DB 의 last_judgement · judgement 를 `evidence:report --usage` 로 본다. 1-나 브리프에 정한 것 16 · 17 을 넘긴다 | 없음 |
| 9 | CI 분 한도(11-01 전 push 금지) · 이 Mac 에서 통합 · e2e 불가 | 정적으로 쓰고 차례 13 에서 몰아 돌린다(fix 3회까지). 실행 기록 전에는 완료로 적지 않는다 | 없음 |
| 10 | 사람 판정 사례 수집: 사용 시험 전에는 합성 사례뿐이고 합성 일치로 정확도를 말할 수 없다 | 보고 함수가 합성 보고에 정확도 문구를 내지 않고, 영역마다 10건 아래면 비율을 내지 않는다(AC-21g) | 없음 |
| 11 | 커밋 규칙과 AC-21g '앞 커밋': 커밋은 요청자 지시로만 한다 | 차례 10 에서 사례 파일 커밋을 먼저 요청하고, 보고 명령이 커밋 안 된 사례 파일을 거부한다 | 없음 |
| 12 | 평가 시드가 1단계뿐이다. 2~6단계 평가 · AI 과제 문항은 P8 생성 뒤라 1-가 프리뷰에서 AI 채점 · 새 작문 길은 가짜 AI 통합 시험으로만 돈다 | 통합 시험(가짜 AI 클라이언트) · 1단계 예비(평17) | 없음 |
| 13 | 시드 비용 · 시간(spec 우려 2) | 이 plan 은 1단계 예비만, 2~6단계는 P8 차례 | 없음 |
| 14 | 기기 값 신뢰(spec 우려 5): 힌트 0 · 읽기 도움 '안 씀' | source 칸, 기기 값은 도움 · U 쪽으로만 씀(AC-N17) | 없음 |
| 15 | 원칙 경계: 숫자는 설정값(문턱 · 창 · 기간 · 경계는 evidence.* · level.*), AI 호출은 서버만(근거 · 판정 · 집계는 AI 0회, AC-N15), 녹음 없음, 근거 칸에 원문 · 이름 없음(AC-N16), 횟수로 통과시키지 않음(evidence.min_opportunities 는 판단 아래 한계) | 검사 · 시험, check:ids design-number 상한 | 없음 |
| 16 | check:ids 가 정본 12절 82줄(talk.valid_turns_ratio 의 바꾸는 곳 칸)을 읽지 못해 입력 오류로 멈춘다(회화 plan, 10-30 실측) | 컨트롤러가 먼저 고친다(회화 plan 차례 1). 평3 · 평19 는 그 뒤 | 없음 |
| 17 | p13d 12절 사본의 회화 전용 줄 두 행(talk.practice_rounds · talk.reask_sentence_every_turns)을 사본 맞춤이 지우면 회화 묶음 12 전의 check:ids 가 깨진다 | 평3 · 평19 는 그 두 행을 회화 묶음 12 까지 그대로 둔다 | 없음 |

## 증명 (Proof)

| 수용 기준 | 증명 | 파일 · 명령 |
|---|---|---|
| AC-N16 | 단위: 자유 글 · 원문 · 이름 든 가짜 값 거부, 목표 용어 목록 밖 purpose · demands 거부 | `tests/unit/evidence-schema.test.ts` |
| AC-21d | 단위: 장면마다 기록 함수의 칸 값이 기대 표와 같음(질문 속 단어 apple 은 기회 아님 · red 독립, 이야기 낱말 none, 읽기 도움 read_aloud · gloss 출처 device, 의사소통 정답 partial + communicative, 서버가 붙인 답 두 개는 기기 값과 상관없이 two_answers). 통합: 열여섯 장면과 원문 정리 · '이 대화 지우기' 뒤 칸 그대로(회화 아홉 장면은 회화 기록 묶음 뒤 더함) | `tests/unit/evidence-{record,exposure}.test.ts` · `tests/integration/evidence-record.test.ts` |
| AC-N17 | 단위: 서버 도움은 기기 값과 상관없이 남고, client_listen · 실패 수를 바꿔도 수준이 오르지 않음 | `evidence-record.test.ts` · `evidence-state.test.ts` |
| AC-21e | 단위: (1)~(15) 전부. (1′)은 확정 전 표현 목표 U(a9_pending) · accept meaning 2 를 단언하고 확정 값은 todo 로 둔다. 참조 없이 나온 값은 U 뿐. 통합: last_judgement 의 옛 조건 넷 · 새 근거 · 집계 · 후보 판정, judgement 의 단원 근거 요약, evidence.* 를 바꿔도 통과 · 보강 · 연습 고르기가 같음. 가져오기: 의존 규칙 | `tests/unit/evidence-{state,link}.test.ts` · `tests/integration/{unit-progress,level-test}.test.ts` · `pnpm check:deps` |
| AC-21f | 단위: 말하기 단원 하나(정규 10 · 얇은 세션 · a = 1 세션 · 다시 하기 2 · 중단 1)에서 참여 완료 12 · 통과 실적 10 · 8 · 혼자 해낸 목표 1/2 | `tests/unit/evidence-aggregate.test.ts` |
| AC-22g | 단위(수준 몫): 바 의 칸으로 혼자 첫 시도 오답 → 같은 문제 다시 정답 → 짝 정답이 기회 1 · 2('새 예시'), 짝 오답 0, 목표 둘 따로 | `evidence-state.test.ts` |
| AC-22h | 단위(수준 몫): 답 낱말이 질문에 있는 '예' 응답의 첫 시도는 speak-3-1-3 에서 독립 2, 그 낱말의 단어 근거는 기회 아님 | `evidence-state.test.ts` |
| AC-22j | 단위(수준 몫): 읽어 주기 · 뜻 보기를 쓴 첫 답의 수준은 1 을 넘지 않음 | `evidence-state.test.ts` |
| AC-10i | 단위: 보기 일곱 줄과 복구 고르기. 통합(시각 당기기 · 가짜 음성 · 가짜 AI): 인식 3회 실패 → 세션 끝 재시도 → 예비 → 보류 → 마이크 다시 확인 뒤 같은 날 이어 보기 → 통과 · 승급, 예비 바닥 → 문항 모자람 → 새 벌 · 볼 벌 없음 → 보류 남음 · 진행 사건, 'AI 쉬는 중' → R → 풀린 뒤 저장된 답 재채점, 거절 둘 → 예비 AI 과제 한 번, 부모 조정 닫기, 보류 동안 간격 · 보강 · 부모 확인 · 미통과 진급 없음. Playwright: 보류 결과 · '평가 이어 보기' · '평가 다시 보기' | `tests/unit/level-test.test.ts` · `tests/integration/level-test.test.ts` · `tests/e2e/level-test.spec.ts` |
| AC-10j | 단위: 계획 10 가운데 4 만 점수 난 세션과 3~8단계 a = 1 세션은 최근 성적에서 빠지고 최소 수업 수에 듦, 기술 오류 기회는 U | `tests/unit/unit-pass.test.ts` · `evidence-state.test.ts` |
| AC-7h | 단위: 어긴 표본마다 시험 하나(그림 속 과일 이름 × 가게 턴, 목표 밖 일의 순서 문항, 안내문 목표 둘 · 같은 주된 능력 목표 둘의 겹침 칸 있음 통과 · 없음 거부, 듣기 → 정보 묻고 답하기 거부, 응용 기회 0 보고, 예비 수 · 단원 · 유형 · 겹침, 노출 경고), 완전성 실패 · 개발 적재 경고 | `tests/unit/seed-validator-goals.test.ts` · `pnpm seed:validate` |
| AC-21b | 단위: 48행 · 상태 둘 · 결정 번호 · 판 한 값 · 위치 식별자 꼴과 판 · 글 칸 없음 · 과제 범위 · 참고 범위 일치, 처음 적재본 48행 pending | `tests/unit/seed-lists.test.ts` |
| AC-21c | 의존 규칙(관리용 기준 목록) · 단위(결정 번호 없는 추천 행 거부) · 배치 가름 기록 시험(답 묶음 여섯, '1단계만 넘음' · '2단계까지 넘음' 둘 다 1) · Playwright(프리뷰 회색 줄 있음 · 운영 흉내 없음). 부모 화면 몫은 1-나 | `.dependency-cruiser.cjs` · `seed-lists.test.ts` · `tests/unit/placement-split.test.ts` · `tests/e2e/first-run.spec.ts` |
| AC-21a | 검사: cefr-claim 이 단정 꼴 0. 부모 화면 단계 줄은 1-나, 정본 머리 문장 · 48칸 사본 대조는 평19(정본 참조 검사) | `pnpm check:ids` · `tests/unit/check-ids.test.ts` |
| AC-21g | 단위: 칸 빠짐 실패 · 새 근거 = 기대값 · 부당한 보류는 두 칸이 있을 때만 · 정당한 U 는 사유별 · 합성 보고에 정확도 문구 없음 · 10건 아래 비율 없음 · 커밋 안 된 사례 파일이면 종료 2 · 내보내기에 원문 · 이름 없음 | `tests/unit/evidence-cases.test.ts` · `pnpm evidence:report --synthetic` |
| AC-15s | 단위(근거 몫): talkEvidenceOf 가 들리지 않음 '모름'(client_listen 출처 nospeech)에 technical(nospeech), 단추 '모름'에 dont_know 를 냄. 화면 · 통합은 회화 plan | `tests/unit/evidence-talk.test.ts`(제안) |
| AC-15v | 단위(근거 몫, 주인은 회화 plan): task(card-answer · child-topic · child-question) · goals 는 move.goals 와 move.linked 이고 held 는 없음 · confirmed · 노린 턴 질문 속 단원 단어는 그 낱말만 answer_exposed · 같이 말하기 뒤 together · 1단계 선택지 choices | `evidence-talk.test.ts` |
| AC-15z | 단위(보고 칸 몫, 후보 셈 함수는 회화 plan): 회화 1단계 입문자 단원 사례에서 통과 실적 · 후보 셈 · 최소 수업 수 나란히, '진도 막힘 후보' 표시 | `evidence-cases.test.ts` |
| AC-N15 | 단위: 근거 · 상태 · 보류 · 집계 함수가 시각 · 설정 복사본을 인자로 받고 가짜 AI 호출 0. 통합: 회화 턴 근거 쓰기가 아이 행 갱신과 같은 쓰기(회화 한 줄 뒤), AC-N8 그대로 | `evidence-state.test.ts` · `tests/integration/evidence-record.test.ts` |
| AC-9a | 단위: 연속 정답 0~5 → 1 · 2 · 4 · 30 · 60 · 120 학습일, 서로 다른 학습일 3회 '안다', 틀리면 0 | `tests/unit/spaced-review.test.ts` |
| AC-9c | 단위: 다시 하기 · 연습 수업의 틀림 → 다음 학습일, 맞음 → 연속 정답 그대로 | `spaced-review.test.ts` |
| AC-9b | 단위 + Playwright: 버튼 없음 · 철자 타일 · 말하기 소리만 · 두 단계 · 겹침 한 장 · '씀' 먼저 · 글자 가림 · 다시 낸 카드 첫 단계 · 16번째 미룸 · '맞힌 카드 n장' · '다음 복습' | `tests/unit/review-card.test.ts` · `tests/e2e/review.spec.ts` |
| AC-9f | 단위 + Playwright: 말하기만 카드 첫 단계 틀림 → 철자 없음 · '씀' 행 안 생김 · 겹침은 '씀' 먼저 · 처음 만난 영역 15장 | `review-card.test.ts` · `review.spec.ts` |
| AC-9g | 단위: 말하기 단원 단어 24개 '알아봄' 안다 → 단어 조건 충족(철자 · '씀' 무관) | `unit-pass.test.ts` |
| AC-10a | 단위: 80% · 80% · 최소 수업 수 · 학습일(다시 하기 · 연습 학습일 포함) · 회화 갈래 · 복사한 값 | `unit-pass.test.ts` |
| AC-10c | 단위 + 통합: 보강 상한 넘음 → 확인 필요 · 사흘 → 다음 단원 · 진행 사건 | `unit-pass.test.ts` · `tests/integration/unit-progress.test.ts` |
| AC-7b | 단위 + 통합(읽기 세션 AI 0회 · 단어 익히기 → 다른 변형 연습 · 별만 · 같은 날 다시 하기 별 없음 · 회화 연습 고르기) | `tests/unit/practice-pick.test.ts` · `unit-progress.test.ts` |
| AC-7e | 통합(unit_progress 몫): 6단계 통과 → 다음 단계 준비 중 · 다른 영역 열림(알림 행은 1-나) | `unit-progress.test.ts` |
| AC-10b | 단위 + 통합: 16/20 · 12/15 · 2.6 → 0.65 · 부분 0.5 · 1~2단계 0/1 · 다른 벌 · 같은 학습일 재응시 막음 · 따라 말하기 0.8, 거절 둘은 잠재 점수(C183 의 AC-10b 맞춤) | `level-test.test.ts` · `tests/integration/level-test.test.ts` |
| AC-10f | 단위: 안 한 보강 → 다른 변형 → 가장 오래전 것 별 없이 · '평가 전 보강' 묶음 | `level-test.test.ts` |
| AC-10h | 단위 + Playwright: 시작 문구 · '반을 했어요' · 통과 · 범위 끝 · 15 '거의 다 왔어요' · 10 '조금 더 연습해요' · 숫자 없음 · 'n단계 평가 보기' · '나중에 할래요' | `level-test.test.ts` · `tests/e2e/level-test.spec.ts` |
| AC-10d | 통합: 12단계 통과 → 졸업 · 새 수업 없음(시험용 시드 12단계) | `unit-progress.test.ts` |
| AC-10g | 통합: 단원 시작 뒤 unit.min_days 를 바꿔도 복사한 값 · 단계 내림 · '이 단원 처음부터'는 새 회차 · 평가 중 pass_score 를 바꿔도 복사한 값(바꾸는 화면은 1-나라 서버 함수를 직접 부름) | `unit-progress.test.ts` · `tests/integration/level-test.test.ts` |
| AC-6b | 단위: 새 · 안 해 본 · 처음부터 1개, 다시 하기 · 복습 · 평가 0, 하루 다섯 → 5, 회화는 참여 완료, 쓰기 6단계는 고쳐 쓰기 때, 장부 count 는 그때 값 | `tests/unit/star-count.test.ts` |
| AC-6d | 단위: 쉬는 날 2일 · 3일째 '다시 1일째'와 최고 기록 · 참여가 거의 없어 중단한 회화만 한 날은 안 이어짐 | `tests/unit/streak.test.ts` |
| AC-6e | Playwright: '다음 수업' · '홈' · '수업 목록' · '단원 n을 통과했어요!' · 장부 별 수 · 다시 하기 '맞힌 단어' | `tests/e2e/result.spec.ts` |
| 평가 기능 완료 | 1-가 끝 점검표: 1 · 3 · 4 · 5단계 단원의 실제 목표 ID · 과제 연결과 그 단계 프리뷰의 근거 계산 | 장부 점검 기록 |
| 늘 | 린트 · 형 · 단위 · 의존 · 식별자 · 추적 · 시드 · 빌드 · 첫 JS(Node 24 PATH) | `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec,missing-test` · `pnpm seed:validate` · `pnpm build` · `pnpm check:bundle` |

AC-12i(부모 화면)는 1-나, AC-15v 는 회화 plan 이 증명한다. 가르치고 plan 의 'AC-6g · C182 (3) A9 확정 전 운영 미반영' 통합 시험은 그대로 두고, 평11 의 통합이 단원 판정 입력에도 수준 값이 없음을 더 본다(가르치고 L-37 M4).

## 완료 조건 · 커밋 · 프리뷰

- **완료 조건(1-가 P12).** (1) 평1~평18 이 코드 검토 Approved 이고 늘 하는 관문을 통과했으며 spec:trace missing-test 가 0 이다. (2) 통합 · e2e 실행 기록이 있다(11-01 뒤). (3) 프리뷰 시각 당기기로 읽기 · 쓰기 · 말하기 단원 통과와 단계 평가 통과, 기술 오류 보류 → 같은 날 이어 보기가 돌고, 단원 · 단계 평가 판정마다 근거가 옛 판정과 나란히 남는다(정본 11절 1-가 완료 칸). (4) 합성 사례 보고가 기대값 일치를 낸다. (5) 1단계 네 영역 예비가 적재됐다. '평가 기능 완료'는 일의 차례 ② 목표가 1 · 3 · 4 · 5단계에 들어와 그 프리뷰에서 근거가 계산될 때만 따로 적는다(목표 글이 늦어도 개발은 이어 감, C160).
- **커밋.** 커밋 후보 경계는 평1 · 4~7 끝 · 평2 · 3 끝 · 평8 · 9 끝 · 평10~14 끝 · 평15~17 끝 · 평18(사례 파일 먼저) · 평19 끝이다. 실제 커밋 · push 는 요청자 지시대로 하고, 11-01 전 push 면 [skip ci] 를 단다. 이 plan 은 push 하지 않는다.
- **프리뷰.** push 뒤 프리뷰 가지에 나간다. 프리뷰 상태표(아티팩트) 첫 줄에 되는 것 · 안 되는 것(회화 평가 대화 · 부모 화면 · 근거를 보는 화면 없음)과 시험용 자료 여부를 적는다.

## 1-나 · 2차 · 다른 변경 단위로 넘기는 것

| 항목 | 몫 | 이 plan 이 하는 것 |
|---|---|---|
| 부모 화면 넷(학습 목표 근거와 사람 판정 칸 · 평가 보류 · 단계 줄 '앱 자체 단계'와 승인된 시작 추천 · 오늘 한 수업 세 집계) · 알림 둘 · 확인 필요 처리 화면 · 사용 시험 4주(측정 · 내보내기 · 보고) | 1-나 | 꼴(정한 것 4 · 17) · 문구(정한 것 16) · 자료(last_judgement · judgement · progress_events) · 부모 고르기 서버 함수 · `evidence:report --usage` 틀 |
| 사람 판정 기준표 승인 | 요청자(사용 시험 전) | 없음 |
| 근거 상태를 단원 통과 · 복습에 넣는 운영 반영 | 보고 → 13절 → 새 변경 단위 | 경계 시험 |
| CEFR-J 참고 범위 값 · 판 고정 · 사용자 시작 추천 · 배치 판정 규칙 · 응용 과제 시드 | 학습 단계 개선 | 목록 꼴 · 검사 · 배치 가름 기록 |
| 2~6단계 평가 시드(예비 · 목표 칸) · 그 단계 수업의 goal · purpose · demands | P8 · 가르치고 둘째 묶음 | 브리프 틀 문단(평17) · 검사(평15) |
| 배지 문구 · 부모 화면 나머지 | 2차 | 없음 |
| 수업 중 한국어 묻기 기록(ko_help) | 변경 단위 ⑤ | 값 이름만 |
| 쓰기 6단계 이상 첫 세션 결과의 '오늘 만난 말'(가르치고 L-55) | 13절 한 줄(2차 전) | 없음 |

## 열린 질문

요청자 몫:
- R1 [승인 A9]: 의사소통 정답을 표현 목표의 0(실패 기회에 듦)으로 둘지, U(목표 꼴 근거 없음)로 둘지. 답이 오면 정한 것 8 의 함수 한 줄과 사례 기대값만 바뀐다.
- R2 spec 우려 14: 2판 검토 원문 '16채점 13점'의 빈 넷이 학습 쪽 결과였는지. 판정 규칙은 두 갈래를 다 담아 그대로이고 C163 줄의 옮김에만 닿는다.
- R3 CEFR-J can-do 이용 허락 · 1.3 판 양식(바깥 일). 허락 전에는 부모 화면에 참고 범위가 없다.
- R4 일의 차례 ②: 목표 글 · 덮음 표 · 목표 용어 목록(허용 과제 유형 처음 값 포함) 승인. '평가 기능 완료'의 조건이다.
- R5 사람 판정 기준표 승인(1-나 사용 시험 전).
- R6 커밋 차례: 합성 사례 파일만 든 커밋을 계산보다 먼저 두는 지시(AC-21g).

컨트롤러 몫:
- C1 P13c 차례 9(회화 평가 대화)를 누가 언제 짓는지. 회화 재설계 spec 은 평가 대화를 '그대로' 두었다.
- C2 회화 첫 프리뷰 뒤 P12 첫 차례로 평1 · 평8 가 · 평3 을 띄울지(회화 묶음 18 이 exposureOf 와 evidence.match_cut 을 기다림). 회화 plan 과의 경계는 C192 로 맞춰졌다.
- C3 브랜치 · 워크트리(p13d 를 잇는지).
- C4 정본 밖 문구 표의 1-가 몫(다시 하기 '맞힌 단어' · 연속 칸 · 문항 모자람 결과) 승인(UI · UX L-42 M1).
- C5 개발 DB 정정 판(unit-specs 목표 있는 단원 셋) 적재와 별 장부 옮김 명령을 돌릴 때.
- C6 개발 DB 채움 명령(정한 것 15)을 차례 7 의 두 때(평10 끝 · 회화 묶음 18 Approved 뒤)에 돌리는 것을 받을지. 가르치고 정한 것 9 와 회화 정한 것 22 의 기대에 맞춰 판 2 시도와 move 가 있는 회화 아이 행만 채우고, 판 1 시도는 U '기록 전'으로 둔다.

컨트롤러 답(10-30 09:0x, C193): C1 회화 평가 대화(P13c 차례 9)는 회화 갈래가 회화 둘째 묶음(16~20) 뒤에 짓고, 평13 은 세 영역 평가를 먼저 닫는다(정한 것 22 그대로). C2 회화 첫 프리뷰 뒤 첫 차례는 평1 · 평8 가 · 평3 이고, 자리가 남으면 평4~평7 을 함께 낸다. C3 p13d 워크트리와 가지(feature/1a-p13d-teacher)를 잇는다. C4 1-가 몫 셋을 승인하고, 문항 모자람 결과 글은 '다음에 새 문제로 처음부터 다시 봐요'로 고쳤다(문구 표). C5 목표 있는 단원 셋의 unit-specs 정정 판은 평2 Approved 직후, 별 장부 옮김은 평7 · 평11 Approved 뒤에 컨트롤러가 개발 DB 에 한 번 돌린다. C6 evidence:fill 을 평10 끝과 회화 묶음 18 Approved 뒤 두 번 돌리는 것을 받는다(빈 행만 채움). 요청자 몫 R1~R6 은 구현을 시작할 때 하나씩 묻는다.

## 확인한 사실과 출처

모두 2026-10-30 05시대의 p13d(머리 0c664c3 위 커밋 전 변경)와 본 저장소에서 확인했다.
1. `src/core/{review,unit-pass,level-test,streak}` 와 단계 평가 · 복습 서버 · 화면이 없다. 코드의 P12 넘김 자리: 홈 연속 칸(home-cards.tsx · core/home/band.ts), 오늘 완료의 복습(core/today/done.ts), 별 잠정 셈(core/reward/star.ts · server/home), 점수 null · 제외(core/scoring/score.ts 머리), 목록 gate wordsShort · scoreShort · levelTest · remedialIssued · practice · reviewDue(core/lesson-list/state.ts 머리), 결과의 단원 막대 · 통과 줄 · 맞힌 단어(server/session/result.ts · result-view.tsx), 회화 이음매 onTalkSessionEnded(빈 함수, server/conversation/state.ts:1137), 부모 확인 값 'pending'(server/home · server/lesson-list).
2. attempts · talk_turns · level_tests · unit_specs 에 evidence · judgement · goals 열이 없고(src/db/schema), 마지막 마이그레이션은 0005(client_listen)다. progress_event_kind 에 사람 판정 값이 없다. star_ledger · badges · progress_events · parent_alerts(종류 text) 표와 profile_tracks.graduated · next_level_pending 칸은 있다.
3. evidence/teach.ts(가르치고 바, Approved): teachEvidenceOf({ lessonKey, lesson, activity, input, ctx }), 의사소통 정답은 accuracy partial + communicative(fix 1), 정확도 경계는 ctx.matchCut(시험 [0.6, 0.8]), 열이 없어 저장 길은 넣지 않았다.
4. seed/settings.json 225행에 evidence.* · level.min_scored_per_unit · level.item_retry_max · level.test_spares_per_unit · level.ai_task_spares_per_form · speaking.min_scored_ratio 가 없고 seed.goals_required_levels [1, 3, 4, 5] · seed.unit_goals_max 4 는 있다. 단원 시작 복사본(core/profile/start.ts unitSnapshotOf)은 수만 받는다. 관계 검사는 core/vocab/allocate.ts checkFrameRelations 다.
5. 1단계 평가 시드: 읽기 · 쓰기 · 말하기 벌 셋 × 20문항(unit 칸 있음), 회화 벌 셋 × 장 둘. 브리프 `seed/prompts/level-test-{reading,writing,speaking,talk}-1.md`. 예비 칸이 없다.
6. 목표가 있는 단원은 3단계 단원 1 셋(read-3-1-1 · write-3-1-1 · speak-3-1-1~3)이고 core · home 은 spec 2절 안의 낱말이다. 검증기는 목표 수 · id · 유일 · tasks · 영역 needs 만 본다(core/seed/reference-index.ts unit-goals). 적재기는 unit_specs 칸 해시(server/seed/load.ts unitSpecBody)에 goals 를 넣지 않고, 같은 판에서 해시가 바뀌면 version-content-changed 로 거부한다(core/seed/version-pick.ts:205).
7. 회화 평가 대화(P13c 차례 9)와 onTalkTestSheetDone 이 코드에 없다. 회화 spec 4판은 평가 대화를 '그대로' 둔다(설계 0 표).
8. 칸 키는 `lesson:reading:4:2:assigned:3:1` · `level-test:<영역>:<단계>:<벌>:<번호>` 꼴이다(core/seed/structure.ts:549 cellKey).
9. 배치 평가는 level_tests.answers 와 문항마다 attempts 행을 함께 쓴다(server/placement/index.ts). 첨삭 대기 재호출은 앱 진입 때 retryPendingFeedback 이다(server/writing/composition.ts:790).
10. spec:trace(p13d, 1차 plan 증명 표): 15절 AC 199 · 증명 표 AC 67 · missing-test 16 이고, 16 이 모두 P12 몫이다(AC-6b · 6d · 6e · 7b · 9a · 9b · 9c · 9f · 9g · 10a · 10b · 10c · 10d · 10f · 10g · 10h).
11. 프리뷰 전용 기능은 VERCEL_ENV !== production 확인(server/preview/index.ts:41)과 운영 빌드 밖 쪽(next.config pageExtensions)으로 가른다.
12. 이 plan 의 증명 표를 p13d 에서 `pnpm spec:trace --plan <이 파일>` 로 맞대면 AC 36개를 읽고 unknown-ac 0 · plan-ac-not-in-spec 0 이다(15절 AC 199, C189 판 사본, 10-30 08시대). missing-test 32 는 아직 쓰지 않은 시험이다. 증명 표는 첫 칸에 AC 하나만 두어야 읽힌다(scripts/spec-trace.ts parsePlanProofAcs).
13. 회화 plan(C192 승인, 10-30 05:4x): 묶음 1 설정 24행(진행 중) · 5 move Zod(`src/core/conversation/move.ts`) · 7 move · prep 마이그레이션(따로 파일) · 8 turn.ts 새 갈래('말했다' 갱신을 옮기고 reachTalkTarget 을 completeTalk 로 바꿈) · 12 없앤 키 둘 · 18 goal-link · carry · candidates · 근거 쓰기 한 줄(열 · 함수가 있을 때). 정한 것 22 는 talkEvidenceOf 를 P12 몫으로 두고 P12 채움 함수의 개발 DB 채움을 기대한다.

## 완료 보고 (Done)

구현 뒤 채운다: 실제 바뀐 파일(계획과 다른 것 표시) · 시험 결과(단위 수 · 통합 · e2e 실행 기록) · 시드 검증 · 풀이 검사 결과 · 합성 사례 보고 · 화면 검토 · 프리뷰 확인 · '평가 기능 완료' 점검 · 남긴 것 · 커밋.
