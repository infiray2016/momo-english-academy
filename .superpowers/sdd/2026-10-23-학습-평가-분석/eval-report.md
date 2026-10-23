# 학습 평가 로직 분석 — 지금 구현 정리와 CEFR-J 관점의 유지 · 보완(분석가 · Opus · xhigh · 2026-10-23 16시 무렵)
1. 목표 연결: 단계 can-do 48문장 → 단원 규격(학습 요소 1 · 주제 · 단어 25/30) → 수업 · 카드(새 단어 · 목표 표현 · 노릴 단어) → 평가 문항(연결 단원)의 사슬은 시드에 있다. 그러나 판정까지 올라가는 목표는 '단원 단어'와 '세션 과제 점수'뿐이고, can-do · 학습 요소 · 목표 표현은 AI 가변부 글과 시드 검사에만 쓰인다(수행 근거로 기록되지 않음).
2. '말함': AI 가 낸 '스스로 알맞게 쓴 단원 단어' 가운데 인식 글에도 있고 그 턴에 영어 도움(영어 힌트 · 답 두 개 · 답 예시)이 없던 것만 '말했다', 서로 다른 학습일 둘이면 '안다'. 따라 말하기 · 말해 보기 · 정리는 안 센다. 인식 글만 보고 신뢰도는 안 본다. 노린 단어인지 · 문장인지 · 학습 요소 · 목표 표현을 썼는지는 재지 않는다.
3. 통과 · 승급: 정본 규칙은 갖춰져 있다(숙달 80% · 최근 5회 80% · 최소 수업 · 학습일 / 회화 '말함' 80% + 끝낸 대화 / 단계 평가 16/20). 코드는 판정 설정 복사본 · 활동 · 세션 점수 · 회화 '안다' · 배치까지다. 단원 통과 · 복습 · 보강 · 단계 평가 · 별은 P12 몫이라 아직 없다(회화 쪽 이음매는 빈 함수).
4. 도움 · 독립 · 응용: 읽기 · 쓰기는 첫 시도만 점수, 회화는 힌트 종류 셋 · 들은 도움으로 독립을 가른다. 따라 말하기는 본래 도움받은 수행이다. '다른 상황 응용'은 단계 평가(수업과 다른 문항)에서만 보고 단원 안에는 기록이 없다(같은 카드 다시 하기 두 날로도 '안다'). C144 '도움받은 연습'을 담을 값이 아직 없다.
5. 판정 보류: 아래 한계 · 점수 없는 세션 빼기 · 인식 실패 문항 빼기 · 배치 예비 문항 · '말했다'의 인식 글 확인 · AI 실패 턴 안 셈 · 부모 확인이 보류 구실을 한다. 빈 곳은 말하기 세션 점수의 최소 근거 수 · 'AI 쉬는 중' 말하기 a = 1 점수 · 인식 신뢰도 · 보류 까닭 기록 · 막힘 턴과 되받기의 '말했다'다.
6. 누적 반영: 다음 차례에 실제로 쓰이는 것은 회화 만남(처음/다시 묻는 턴 · 1단계 답 두 개 여부) · 아직 '안다'가 아닌 단어(4단계부터 AI 가 다시 물음, 1~3단계는 다지기 오늘 쓸 말만) · 지난 대화 요약 3개. 간격 반복 · 보강 · 연습 고르기는 정본만(P12). 다음엔 이렇게 · 막힌 질문 · 약한 학습 요소는 어디에도 다음 수업으로 이어지지 않는다.
- 유지 12 · 보완 14(높음 2 · 중간 5 · 낮음 7). 코드 ↔ 정본 어긋남 1 · 정본에 빠진 요구 8 · 우려 6 · 결정 필요 9(요청자 5 · 컨트롤러 4).
- CEFR-J: 정본은 단계 근거로 CEFR(Pre-A1~B1) 3분할 · 2022 개정 교육과정 · CEFR CV 2020 을 쓰고, CEFR-J 는 어휘 단계 대조에만 썼다(정본 본문의 'CEFR-J' 는 C146 한 줄뿐). 요청자의 'CEFR-J 12단계'와 우리 '12단계'는 같은 것이 아니다. 공식 사실은 조사 파일이 아직 없어 '조사 대기'(웹 검색 안 함).

작성: 분석가(Opus · xhigh) · 읽기 전용(intent · spec · 코드 · 시드는 고치지 않음) · 브리프 `brief-eval.md`

---

## 0. 대조 범위와 본 자료

- 정본 `specs/`(본 저장소). 줄 번호는 장 파일:줄 — `02-1:83` 은 `specs/02-1-영역-단원-승급.md` 83줄, `10:312` 는 `specs/10-결정-기록.md` 312줄. 본 장: 02-1 · 02-2 · 02-3 · 04 · 05 · 06 · 07 · 09 · 10 · 11.
- 요청자 결정 C143~C146 원문: `10:312-315`(C146 은 원칙 일곱 — 9절 표).
- 앞선 대조표 `.superpowers/sdd/2026-10-23-선생님-의도-적용/map-report.md` — 겹치는 판정은 다시 하지 않고 `map R32` · `map-report.md:298` 처럼 가리킨다.
- 코드 · 시드: 선생님 가지 작업 트리 `.claude/worktrees/p13d`(머리 e9909c2). **아래 코드 경로는 모두 이 트리 기준**이다. 줄임: `talk.ts` = `src/core/ai/calls/talk.ts`, `said.ts` · `hints.ts` · `flow.ts` = `src/core/conversation/`, `turn.ts` · `state.ts` · `closing.ts` = `src/server/conversation/`, `attempt.ts` = `src/core/session/attempt.ts`, `score.ts` = `src/core/scoring/score.ts`, `learning.ts` · `content.ts` = `src/db/schema/`.
- 계획: `intent/2026-10-15-모모-잉글리시-아카데미/plan.md:87`(P12 몫). CEFR-J 를 쓴 곳: `intent/2026-10-15-모모-잉글리시-아카데미/plan-p06a-규격-파일.md:53 · :268`, p13d `docs/research/2026-10-16-seed-reference-basis.md:19 · :25-26 · :51`.
- 상태 표기: **코드**(정본과 코드 둘 다) · **정본만**(정본에 있고 코드는 아직 — 몫 표시) · **함수만**(순수 함수는 있고 부르는 곳이 없음) · **없음**(정본에도 없음).
- 브리프 사실 바로잡기: 브리프는 'CEFR-J 는 어휘 참고뿐'의 근거로 `10:31` · `02-1:20-29` 를 들었으나, 두 곳은 CEFR 등급 3분할과 교육과정 근거이고 CEFR-J 를 말하지 않는다. CEFR-J 를 쓴 곳은 위 plan-p06a · seed-reference-basis 두 문서다.
- CEFR-J 조사 파일 `docs/research/2026-10-23-cefr-j-official.md` 는 이 보고를 쓰는 동안 없었다(두 번 확인). 11절 외부 사실은 '조사 대기'다.

---

## 1. 12단계 · 단원 목표 · can-do 가 어떻게 이어지나(질문 1)

| 고리 | 어디에 있나(시드 · DB 칸) | 실제로 쓰이는 곳(코드) | 판정 근거로 쓰이나 |
|---|---|---|---|
| 단계의 CEFR 대응 | `02-1:20-29` · `10:31`(CEFR 한 등급을 셋으로), level_specs.cefr(content.ts:175), `seed/level-specs.json` 의 cefr | 시드 검사(구간 · CEFR 이 단계와 맞는지 `src/core/seed/reference-index.ts:374-379`), 2차 배지(C13 `10:161`) | 아니오 |
| 단계 can-do 48 | `02-1:31`, level_specs.can_do(content.ts:177), level-specs.json canDo(예 회화 1 "…다시 묻는 질문에는 스스로 답하며 15번 말을 주고받을 수 있다") | AI 가변부 'Can-do'(`src/core/ai/calls/common.ts:189` · `src/server/session/ai-context.ts:83`), 첫 실행 시작 단계 예시(`src/core/profile/start.ts:328-333`), 숫자 대조 경고(`src/core/seed/check-cross.ts:520-537`), 선생님 이름 검사(`src/core/seed/check-teacher.ts:167-185`) | 아니오 — 기록 칸 없음 |
| 단계표 규격(분량 · 문항 수 · 목표 턴 · 힌트 단) | `02-2:7`, level_specs.spec(content.ts:178) | 시드 검증(6.4), 세션 활동 수, 회화 흐름(flow.ts), 목표 턴 도달(state.ts:1146-1213) | 예 — 목표 턴 도달이 회화의 '끝낸 대화' |
| 단원 학습 요소(1개) | `02-3:46-63`, unit_specs.learning_points(content.ts:204), unit-specs.json learningElement(예 회화 1단계 단원 5 '수 + 복수 -s') | AI 가변부(common.ts:190 — 쓰기 확인 · 첨삭이 이번 단원 요소에서 먼저 고른다 `05:31`), 형태 표 · 문장 길이 시드 검사(`06:94`) | 아니오 — 요소별 근거 칸 없음 |
| 단원 주제 | unit_specs.topic | 홈 · 목록, 시드 생성 | 아니오 |
| 단원 단어 25/30 | unit_specs.target_vocab(content.ts:206), lessons.new_words · unit_words(content.ts:305-306) | 배정(`src/core/vocab/allocate.ts`), 단어별 정오 attempts.word_results(C76 `10:226`), 회화 '말함'(said.ts), 홈 막대(`src/server/home/index.ts:205-220`) | **예 — 판정까지 가는 유일한 목표 단위** |
| 카드 목표 표현 | 카드 targetExpressions(`src/core/seed/schema/talk.ts:71`), 화면에 보이지 않음(`02-2:114`) | AI 가변부 'Target expressions'(talk.ts:406), 시드 검사 | 아니오 |
| 카드 턴의 노릴 단어 · 처음/다시 | 카드 turns[].targets · ask(schema/talk.ts:47-53) | 처음/다시 묻는 턴(flow.ts:208-220) · 1단계 답 두 개 여부 · talk_turns.target_words · ask_kind | 간접 — '말했다'는 노린 단어와 상관없이 센다(said.ts:73-94) |
| 평가 문항의 연결 단원 | level_test_items.item 안 unit(예 `seed/level-tests/talk/1.json` 턴마다 unit 1~5) | 아직 없음 — 재응시 전 보강 고르기(`02-1:108`)는 P12 | 정본만 |

판정: 목표는 '단계 → 단원 → 수업'으로 시드에 내려가 있고 생성 · 검사(6.3 · 6.4)가 그 사슬을 지킨다. 판정 쪽으로 다시 올라오는 근거는 단원 단어(낱말)와 세션 점수(과제)뿐이다. 회화는 세션 점수가 없으므로(`02-3:77`) 단원 단어와 끝낸 대화만 남는다. can-do 문장은 '단계표 숫자를 담은 과제 꼴'이라(예 읽기 4 "55~80단어 글을 읽고 누가 · 무엇 · 어디를 묻는 질문에 답할 수 있다") 세션 과제가 곧 can-do 의 과제다 — 읽기 · 쓰기 · 말하기에서는 세션 점수가 can-do 수행의 근거 구실을 사실상 한다. 회화는 can-do 의 질 조건('다시 묻는 질문에는 스스로')을 '말했다'가 낱말 단위로만 받친다.

---

## 2. '말함' 셈이 실제로 재는 것(질문 2)

| 차례 | 누가 | 하는 일 | 코드 | 정본 |
|---|---|---|---|---|
| 1 | AI | 턴마다 self_used_words 를 낸다(스키마 설명 "Unit words the child used correctly by themselves (not words echoed from your previous line)") | talk.ts:238-242 · 규칙 :359 | `05:54` · `05:31` |
| 2 | 앱 | 단원 단어 원형만 남김 | talk.ts:697(unitLemmas) | `05:39` |
| 3 | 앱 | 입력이 '말'인 턴만, 힌트 종류 '영어'면 0 | turn.ts:404-414 · said.ts:83 | `02-3:15` |
| 4 | 앱 | 인식 글을 같은 정규화(소문자 · 문장 부호 · 숫자 · 축약형 · 원형 · 동음이의어)로 풀어 거기 든 단원 단어와 겹치는 것만 | said.ts:35-67 · :84-92 | `02-3:15` · C99 `10:249` |
| 5 | 앱 | talk_turns 에 AI 쪽(self_used_words)과 앱 쪽(said_words) 둘 다 저장 | turn.ts:1122-1130 | `04:35` |
| 6 | 앱 | vocab_progress('말함').said_days 에 학습일을 겹치지 않게 더하고, 단원 복사본 talk.known_days(2) 이상이면 known | state.ts:1027-1101 · said.ts:119-130 · 복사 키 start.ts:88-89 | `02-3:15` · `09:62` |
| 7 | 앱 | 단원 조건: '말함' '안다' 비율 ≥ talk.said_ratio(0.8) | said.ts:133-150 — **부르는 곳 없음** | `02-1:87` |

힌트 종류(hints.ts:139-148): 영어 단(영어 틀 · 영어 문장 · 쓸 수 있는 말)을 하나라도 열었거나 답 두 개 · 답 예시를 들었으면 '영어', 뜻만 열었으면 '뜻만', 아니면 '없음'. 연 단 수와 들은 도움은 브라우저가 보낸 값(turn.ts:144-146 · `src/components/conversation/talk-frame.tsx:157-171`)이고 서버는 범위만 확인한다.

| 상황 | '말했다'에 드나 | 근거 |
|---|---|---|
| 1단계 처음 묻는 턴 · 인사 턴(답 두 개를 들음) | 안 듦('영어') | `02-2:135` · C2 `10:150` |
| 다시 묻는 턴 · 2~3단계 턴에 힌트 없이 · 뜻만 보고 답함 | 듦 | `02-2:148` |
| 영어 틀 · 영어 문장을 열고 답함(1~3단계는 듣기 단추 포함) | 안 듦 | `02-2:148` |
| '잘 모르겠어요' · 말소리 없음 두 번(입력 '모름') | 안 듦(말이 없음) | turn.ts:405 |
| '모름' 뒤 답 예시를 듣고 말함 | 안 듦('영어') | `02-2:129` |
| 막힘으로 볼 말(stuck) 참 | **들 수 있음 — 앱이 빼지 않는다** | turn.ts:404-415(13절 D1) |
| 선생님 앞 말의 단어를 되받음 | AI 지시로만 뺌, 앱은 다시 거르지 않음 | talk.ts:359 · `05:31` |
| 오늘 쓸 말 · 말해 보기 · 정리 · 한 번 더 따라 말하기 | 안 듦 | said.ts:108-116 · `02-2:92` · `:94` · `:98` |
| 다시 하기 · 중단된 대화의 턴 | 듦 | said.ts:108-116 · `02-3:15` |
| 1~3단계 회화 턴 실패 · 거절 · 첫 문장 뒤 끊김 | 안 듦 | turn.ts:327-339(base said []) · `07:58` |
| '더 이야기하기' 턴 | 듦 | said.ts:108-116(턴이면 셈) |

- **재는 것**: "영어 도움 없이 말한 턴에서, 인식 글에 그 단원 단어가 있고 AI 가 알맞게 썼다고 본 일이 서로 다른 학습일에 두 번". 낱말 단위다.
- **재지 않는 것**: 그 턴이 노린 단어인지(노리지 않은 단원 단어도 센다), 문장으로 말했는지(1~3단계는 낱말 답도 센다 — 회화 1단계 평가 허용 답에도 'blue' · 'ten' 같은 낱말 답이 있다, `seed/level-tests/talk/1.json`), 단원 학습 요소를 썼는지, 목표 표현을 썼는지, 다른 수업 · 상황에서 썼는지, 인식 신뢰도(src 에서 confidence 를 읽는 곳은 가짜 음성 `src/lib/speech/fake-web-speech.ts:73` 뿐).
- '알맞게'는 AI 판단이다. 앱은 '인식 글에 있음 · 단원 단어임 · 영어 도움 없음'만 다시 확인하고 바름은 확인하지 않는다. 인식 글이 틀리면 안 세는 쪽으로 틀린다(보수적).

---

## 3. 평가 항목 표

| 영역 | 무엇을 재나 | 누가 판정 | 기록 자리 | 설정 키(값) | 상태 |
|---|---|---|---|---|---|
| 읽기 | 이해 문제 첫 시도 정오 → 세션 점수 = 첫 시도 정답 수 ÷ 문항 수 | 앱 | attempts.input.tries · score, sessions.score | — | 코드(attempt.ts:370-388 · score.ts:95-96 · `src/server/session/index.ts:915-958`) |
| 읽기 | 그림 문항의 단원 단어 정오 | 앱 | attempts.word_results | — | 코드(C76 · attempt.ts:493-495) |
| 읽기 | 눌러 본 단어 → 단어장 | 앱 | attempts.input.tappedWords | — | 기록만(attempt.ts:60-64), 단어장 넣기 P12 |
| 읽기 · 말하기 | 단원 단어 '알아봄' 숙달(복습 카드, 서로 다른 학습일 3연속) | 앱 | vocab_progress(recognize) | vocab.mastery_streak 3 · review.intervals_days 1·2·4·30·60·120 · review.daily_cards_per_area 15 | 정본만(P12 — 이 행을 쓰는 코드 없음) |
| 쓰기 1~3 | 문항 첫 시도 정오 | 앱 | attempts · sessions.score | writing.rule_check_until_level 3 | 코드(attempt.ts:390-411) |
| 쓰기 4~5 | 첫 제출에서 고칠 곳 없는 문장 비율 | AI(문장마다 맞음) → 앱 비율 | attempts.ai_feedback · score | writing.light_check_until_level 5 | 코드(P11b, score.ts:58-61) |
| 쓰기 6~12 | 첫 초고 채점표 3항목 평균 ÷ 4 | AI(Opus) → 앱 | attempts · sessions.score | writing.max_corrections | 코드(`src/server/writing/composition.ts:595`) |
| 쓰기 | 단원 단어 '씀' 숙달 | 앱 | vocab_progress(write) | 위와 같음 | 정본만(P12) |
| 말하기 | 따라 말하기: 시도 가운데 가장 높은 일치율 | 앱 | attempts | ui.match_phrase_levels(표시만) | 코드(attempt.ts:413-439) |
| 말하기 | 듣기 이해 첫 시도 | 앱 | attempts | — | 코드 |
| 말하기 1~2 | 질문 답: 허용 답 일치율(맞음 1 · 다시 0) | 앱 | attempts | speaking.answer_match_pass 0.8 | 코드(attempt.ts:441-468) |
| 말하기 3~8 | 질문 답 · 그림 보고 말하기 판정(1 · 0.5 · 0) | AI | attempts | — | 정본만(P11c) |
| 말하기 9~12 | 발표 · 확인 질문 내용 · 문법(각 1~4) | AI | attempts | speaking.prepare_seconds | 정본만(P11c) |
| 말하기 | 세션 점수 (1 − L){a · 따라 말하기 + (1 − a) · 질문 답} + L · 듣기 | 앱 | sessions.score | speaking.match_weight 0.5 · speaking.listening_weight 0.2 | 코드(score.ts:69-90) |
| 회화 | 턴 점수 · 맞음 판정 | 없음 | — | — | 정본 · 코드 모두 없음(R2 `10:73`, talk.ts:211-296 판정 칸 없음, score.ts:113-114) |
| 회화 | 스스로 쓴 단원 단어(제안) | AI | talk_turns.self_used_words | — | 코드 |
| 회화 | '말했다' · '안다' · 만남 | 앱 | talk_turns.said_words · vocab_progress(say) | talk.known_days 2 | 코드(2절) |
| 회화 | 힌트 종류 · 쓴 힌트 단 · 들은 도움 · 입력 방식 · 처음/다시 묻는 턴 · 막힘 | 앱(막힘만 AI) | talk_turns | talk.nospeech_dontknow_count 2 · talk.dontknow_max 3 | 코드(turn.ts:201-245) |
| 회화 | 끝낸 대화(목표 턴 도달) | 앱 | sessions.status completed | level_specs targetTurns 15 · 20 · 25 | 코드(state.ts:1146-1213) |
| 회화 | 미션 체크(5~7단계) | AI | talk_turns.mission_checks | — | 칸 · 저장 코드, 화면 P13c |
| 회화 | 잘한 말 · 다음엔 이렇게(5단계부터) | AI | attempts(activity 0).ai_feedback | talk.feedback_from_level 5 · talk.good_lines 2 · talk.next_time_lines 1/2 | 저장 코드(closing.ts:345-352), 화면 P13c |
| 회화 | 단원 단어 조건 | 앱 | 계산(저장 안 함) | talk.said_ratio 0.8 | 함수만(said.ts:133-150) |
| 회화 · 말하기 | 영어로 말한 문장 수 · S-3 단어 수(영어 힌트 턴 뺌) | 앱 | sessions.english_sentences · talk_turns.word_count | talk.s3_baseline_turns 20 | 코드(said.ts:153-168) |
| 단계 평가 | 문항 점수 합 ≥ ⌈n × 0.8⌉. 회화 턴은 허용 답 일치율 0.8 이상일 때 쓴 힌트 단에 따라 1 · 0.5 · 0 | 앱(AI 과제 문항 점수만 AI) | level_tests.item_scores · total_score · passed | level.test_items 20 · level.pass_score 0.80 · talk.test_match_pass 0.8 · talk.test_hint_scores | 시드만(1단계 네 영역 `seed/level-tests/<영역>/1.json` 3벌), 코드 없음(P12 · 회화 턴 판정 P13c) |
| 배치 | 단계 묶음 맞힌 수로 오르내림 → 시작 단계 | 앱 | level_tests(kind placement) | placement.* | 코드(`src/core/placement/adaptive.ts` · `finish.ts` · `src/server/placement/index.ts`) |

---

## 4. 데이터 구조 — 평가와 닿는 표 · 칸

| 표 | 평가에 쓰는 칸 | 정의(파일:줄) | 정본 |
|---|---|---|---|
| level_specs | cefr · band · can_do · spec | content.ts:169-195 | `04:24` |
| unit_specs | learning_points · topic · target_vocab | content.ts:197-225 | `04:25` |
| lessons | new_words · unit_words · content(카드 targetExpressions · turns[].targets · ask) | content.ts:291-331 · schema/talk.ts:47-112 | `04:29` |
| level_test_items | item(문항 · 허용 답과 틀 자리 품사 · 연결 단원) | content.ts:333-362 | `04:30` |
| placement_items | level · item · answer · is_spare | content.ts:257-289 | `04:28` |
| sessions | kind(정규 · 보강 · 연습 · 안 해 본 · 다시 하기 · 복습 · 평가 · 배치) · status · score · learning_day · english_sentences | learning.ts:118-154 · 열거형 content.ts:35-50 | `04:33` |
| attempts | input(tries · heard · failures · skipped · echo) · score · word_results · word_count · ai_feedback · status | learning.ts:161-179 · attempt.ts:44-117 | `04:34` |
| talk_turns | input_mode · hint_kind · hint_level · heard_help · target_words · ask_kind · self_used_words · said_words · stuck_phrase · ai_question · recast · mission_checks · within_target · word_count | learning.ts:181-229 · 열거형 content.ts:66-76 | `04:35` |
| talk_summaries | summary | learning.ts:231-238 | `04:36` |
| vocab_progress | state(recognize · write · say) · streak · next_review_day · known · first_met_day · said_days | learning.ts:240-265 | `04:37` |
| unit_progress | round · settings_snapshot · remedial_count · parent_check · last_judgement · passed_at | learning.ts:267-300(parent_check 값은 'P12 가 정한다' :282) | `04:38` |
| level_tests | kind · form · settings_snapshot · item_ids · answers · item_scores · total_score · passed · placement_start_level | learning.ts:90-116 | `04:39` |
| progress_events | kind(auto_judgement · parent_adjustment · revert · promoted_without_pass · next_level_pending · seed_correction_recalc · recalc_takeback) | `src/db/schema/operations.ts:164` · content.ts:128-136 | `04:45` |
| star_ledger | reason · count | learning.ts:302-312 | `04:46` |

판정: 판정 결과를 담을 칸(unit_progress · level_tests · progress_events · star_ledger)은 이미 다 있다(마이그레이션 0000~0004). 비어 있는 것은 칸이 아니라 그 칸을 쓰는 코드(P12)다. 수행 근거 칸은 단원 단어 단위뿐이다 — 학습 요소 · 목표 표현 · can-do 단위 칸은 어느 표에도 없다. 평가 근거 칸을 더한다면 열거형 값 · 열을 '더하기만' 하는 마이그레이션(`04:15`)으로 된다.

---

## 5. 판단 기준 · 단원 통과 · 단계 승급 · 배치(질문 3)

### 5.1 단원 통과(`02-1:81-88`)

| 조건 | 읽기 · 쓰기 · 말하기 | 회화 | 설정 키 · 값 · 바꾸는 곳(`09:13-20` · `:61-62` · `:93`) | 코드 |
|---|---|---|---|---|
| 끝낸 정규 수업 | ≥ max(배정 수업 수, unit.min_lessons) | 목표 턴까지 끝낸 정규 대화 ≥ 같은 수 | unit.min_lessons 6 · 8 · 9 · 10(쓰기 6~9 5 · 10~12 6 은 level_specs), 결정 기록 먼저 | 정본만 |
| 학습일 | 그 단원 수업(정규 · 보강 · 연습 · 다시 하기)을 끝낸 서로 다른 학습일 ≥ unit.min_days | 같음 | 4 · 5 · 6 · 7, 결정 기록 먼저 | 정본만 |
| 단원 단어 | '안다' ≥ 80%(읽기 · 말하기 '알아봄', 쓰기 '씀', T7 `10:147`) | '말함' '안다' ≥ 80%(S1 `10:108`) | unit.vocab_mastery 0.80 · vocab.mastery_streak 3 / talk.said_ratio 0.80 · talk.known_days 2 | 회화만 함수만(said.ts:133-150) |
| 최근 성적 | 최근 정규 5회 세션 점수 평균 ≥ 80%(점수 없는 세션은 뺌 `02-3:83-93`) | 보지 않음(R2) | unit.recent_window 5 · unit.recent_score 0.80(쓰기 6단계 이상은 사용 시험 뒤 다시 `02-1:116`) | 세션 점수는 코드, 평균 · 판정은 정본만 |
| 판정 때 | 세션 끝 · 복습 끝 | 회화 세션 끝(완료 · 중단) | — | 이음매만: `onTalkSessionEnded` 빈 함수(state.ts:1133-1140), 세션 끝내기에 판정 호출 없음(`src/server/session/index.ts:946-961`) |
| 판정 설정 | 단원 시작 때 복사본으로 끝까지(`09:9`) | 같음 | unit.* · level.* · talk.said_ratio · talk.known_days | 코드(start.ts:66-90 · unitEntryOf 417-470) |

P12 가 만들 자리: `plan.md:87` — `src/core/{review,mastery,unit-pass,level-test,stars,streak,practice-pick}/`. 넘겨 둔 메모: 쓰기 6~12 덮기 값이 복사본에 없음(`.superpowers/sdd/2026-10-16-1-가-구현/ledger-open.md:49`), 보강 칸 둘째 세션 종류(같은 파일 :89).

### 5.2 못 넘을 때(`02-1:90-96`, 모두 정본만)

- 성적 미달 · 복습에서 틀린 단어 · 회화의 한 번도 안 말한 단어 → 보강 unit.remedial_batch(2)회씩, '약한 어휘 · 학습 요소를 가장 많이 다루는' 시드 보강.
- 성적은 넘었고 남은 단어가 복습일 · 다른 학습일만 기다림 → '단어 익히기' 상태, 다른 주제 변형 연습 수업.
- 보강 unit.max_remedial(3 · 4 · 4 · 5) 뒤 → 부모 확인. 사흘(unit.parent_decision_days) 안에 안 고르면 다음 단원(요청자 확인 `10:52`).

### 5.3 단계 승급(`02-1:98-114`, 시드만 · 코드 없음)

- 계기: 단원 5 통과 → 목록 맨 위 단계 평가. 20문항(level.test_items)을 10문항씩 두 세션.
- 문항 점수: 정답 문항 1/0, 따라 말하기는 placement.repeat_pass 기준 1/0, 쓰기 · 말하기 AI 과제는 AI 점수 그대로 0~1(S3 `10:110`), 말하기 1~2 질문은 허용 답, 회화 턴은 일치율 0.8 이상일 때 힌트 단 1 · 0.5 · 0(S2 `10:109`), 회화 평가 턴의 말소리 없음은 '모름' 아님(C35 `10:185`).
- 통과: 합 ≥ ⌈20 × 0.8⌉ = 16. 채점 못 한 AI 문항은 빼고 ⌈남은 × 0.8⌉(`02-1:106`).
- 못 넘으면: 이어진 단원 보강 2(level.remedial_before_retest) 뒤 다른 벌(level.test_forms 3), 다음 학습일부터(level.retest_gap_days 1). 보강 누적 상한 뒤 부모 확인, 사흘 뒤 '평가 미통과 진급'(`02-1:110`).
- 단계는 자동으로 내려가지 않고 부모만 내린다(`02-1:120`). 근거: 20문항 80% 는 실력 80% 아이가 한 번에 통과할 확률 약 63% — 사용 시험 4주 뒤 다시(`10:30`).

### 5.4 배치(`02-1:122-135`, 코드)

- 단계마다 placement.items_per_level(3) 문항, 다 맞히면 두 단계 · 하나 틀리면 한 단계 · 그 밖 못 넘음(C71 `10:221`, adaptive.ts:66-84 · :105-134). 시작 = max(1, 넘은 최고 − 1), seed.complete_through_level 이하(adaptive.ts:193-203).
- 따라 말하기 인식 실패 3회는 틀림으로 세지 않고 같은 단계 듣고 고르기 예비 문항(adaptive.ts:14-15 · :165-167). '몰라요'는 틀림.
- 회화는 배치 없음: min(말하기 시작 단계, talk.placement_cap 4)(`src/core/placement/finish.ts:70-83`).
- 첫 단원 첫 3회 95% · 50% 추천과 재배치는 2차.

