# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P6a 규격 파일(시드 확정)

spec: `specs/` 정본(3.1 can-do · 3.2 단원 틀 표 · 관계 표 · 단계 평가, 3.3 단계표 전부, 3.4, 3.6, 5절 시드 테이블, 6.1 모델 구성 · 조합 표, 6.3 (1) · 6.4, 6.6, 12절 전부, 15절 AC-7a · 7c, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P6 행 · 작업 순서 4 · [사람] H5 · 공통 사실 `plan-p04a-규격.md`(규격 칸 · 영어 값 · 상수) · `plan-p04b-배정-칸-검사.md`(규격 파일 정합) · `plan-p04c-묶음-검사-명령.md`(명령 · 평가 검사) · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: approved
승인: 컨트롤러 2026-10-16 23:0x(C61, 아래 '컨트롤러 결정'. 요청자는 H5 와 PR 병합 때 본다) · 브랜치 · 워크트리: `feature/1a-p06a-seed-reference`(바탕 P4c 6bd6015 — `pnpm seed:validate` 가 규격 파일을 검증한다. 격리 워크트리) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P6 은 셋으로 나눴다(묶음 plan 위험 12, 정할 것 가). 이 파일은 첫째(규격 파일 열 · 근거 문서 · H5)다. 둘째 `plan-p06b-그림-카탈로그.md`(그림 · H7)는 이 plan 의 1~2단계 vocab 이 생긴 뒤 이 브랜치 끝에서, 셋째 `plan-p06c-목업-맞추기.md`(목업 · H6)는 이 plan 과 나란히 따로 간다.
세 plan 이 함께 쓰는 사실(어휘 시드 구성 · 정할 것 · 확인한 사실)은 이 파일에만 적고 b · c 는 절 이름으로 가리킨다. 정본에 없는 이름 · 값은 '(제안)', 확인하지 못한 사실은 '(추측)'이다.
정본은 메인 저장소 `/Users/hikaru/workspace/momo-english-academy/specs/`(문서 브랜치 끝)에서 읽는다. 워크트리의 `specs/` 는 바탕 커밋(024a4bc 갈래) 때 판이라 C55~C60 이 없다(확인한 사실 13).

컨트롤러 결정(2026-10-16 23:0x, 정할 것 가~거): 가 셋으로 나눔 — 그대로. 나 역할 — 그대로(b 스크립트 · 자체 그림과 c 목업 편집은 implementer Opus · high, 그림 고르기 curriculum-designer Opus · high, 검토 design-reviewer Opus · xhigh. b 스크립트는 가벼운 루프 C52). 다 어휘 시드 구성 — 그대로, 13절 C61 (1) · 3.4 반영. 라 `profile.start_level.<영역>` 기본 행 없음 — 그대로, C61 (2) · 12절 반영. 마 값 꼴 — 그대로(P9 · P5 계획자에게 전달함). 바 교정 상한 이중 출처 — 같은 값, P7 check-ids 가 맞댐. 사 6.6 단가 — 컨트롤러가 가격 쪽을 다시 받아 확인(2026-10-16, 계획자 값과 같음)하고 C61 (3) · 6.6 반영. 아 `thinkingDefault` 'none' — P9 몫(계획자에게 전달함), 그때까지 adaptive + 근거 문서 메모. 자 H5 — 묶음 0 뒤 컨트롤러가 요청자에게 항목마다 풀어 묻는다. 차 그림 — 요청자에게 H7 로 물었다(23:0x, 권함: Twemoji v17.0.3 + 자체 SVG + svg 꼴 + CREDITS.md), 답 뒤 13절 한 줄. 카 그림 범위 — 그대로. 타 첫 실행 목업 두 판 — 더함, C61 (4) · 11절 표 반영, 한 PR 에 두 검토. 파 예문 일회 검사 — 그대로. 하 P8 표본 시작 — 그대로. 거 design-reviewer 정의 — 고침(누르는 곳 56 × 56px · 연두 회화, 23:0x). 공용 변경 biome `!seed/**/*.json` 은 컨트롤러가 옮겼다 — P4 워크트리 `.claude/worktrees/agent-a6ef72438a158a2f3` 에 브랜치 feature/1a-p06a-seed-reference 를 6bd6015 에서 만들고(node_modules 그대로) lint 0 · seed:validate 종료 2(뿌리 없음)를 확인했다. 브리프의 '`specs/01-개요.md` 11절'은 컨트롤러 착오였고 계획자가 8장 11절로 바로 읽었다.

묶음 0 뒤 컨트롤러 결정(2026-10-17 00:3x, cd-p06a 보고 '결정이 필요한 것' 1~8): ① H5 는 요청자에게 읽기용 쪽(https://claude.ai/artifact/99e44UMgVDD2svrd5h7Q93, H7 과 함께 결정 다섯)으로 물었다 — 답 뒤 13절 한 줄 · 3.2 · 3.4 · 12절 반영 · 묶음 1. ② 형태 범위는 같은 단계 앞 단원까지(C64 (1)) — 컨트롤러가 이 워크트리에서 `src/core/seed/reference-index.ts` allowedForms 한 줄과 `tests/unit/seed-validator-reading.test.ts` 시험 하나를 고쳤다(test 159 → 160, P6a 커밋에 함께 든다). ③ 한 열에만 있는 형태는 다른 열을 같은 (단계, 단원)으로(C64 (2), lets 의 writing 은 (3, 4)). ④ forms.json 은 검출기 있는 요소만, 120 요소 뼈대는 근거 문서 (4) 표 — 그대로. ⑤ 3.3 이 앞서 요구하는 형태는 검출 안 함(C64 (3)). ⑥ 알파벳 대표 낱말 26 은 말하기 · 회화 단원 단어 아님 — 그대로. ⑦ 달 May 는 vocab 밖 고유 명사 — 그대로. ⑧ 기능어 165 — 그대로. 작업 순서 보완: H5 를 기다리는 동안 H5 와 무관한 묶음 2(4~6단계)를 먼저 하고 묶음 1(1~3단계)은 H5 뒤에 한다. design-reviewer 1차는 묶음 0 · 2 · 1 을 함께 본다.

## 목표 (Goal)

정본 6.3 만드는 순서 (1)을 끝낸다. 단계 규격 48개(can-do 포함), 단원 규격 240개와 알파벳 · 소리 단원 2개, 구간별 단원 틀 값(3.2, R9 · C49 의 남은 하나, H5), 어휘(단계 어휘 범위 · 활용형 · 품사), 단계 평가의 영역 × 구간 유형별 문항 수(6.3 · 13절, H5)를 확정한다. 11절 1-가 (3)의 모델 단가표와 조합 표, 설정값 시드(12절 키 전부), 목록 넷(동음이의어 · 금지어 · 형태 표 · 메타 문장)도 이 plan 이 만든다.
산출물은 코드가 아니라 `seed/` 의 규격 파일 열과 근거 문서 하나다. 어휘 배정표는 따로 파일이 아니다 — unit_specs 의 단원 단어 차례가 배정 차례이고, 배정 함수(P4b `allocateUnit`)가 그 차례로 배정 수업을 만든다(3.2).
숫자는 12절 키 · level_specs 칸 · `structure.ts` 상수 셋 밖에 두지 않는다(C54 (2)). 단원 틀 값은 학습 설계자가 교육과정 근거를 달아 제안하고 요청자가 확인한다(R9, H5). 확인 뒤 컨트롤러가 13절에 한 줄 넣고 3.2 표 · 12절 기본값을 고친다.
완료 판정은 `pnpm seed:validate` 종료 0, 첫 줄의 '실패 0 · 규격 파일 오류 0'(PR 모드라 빈 칸은 보고만), can-do 숫자 경고 0, design-reviewer Approved, H5 13절 한 줄이다. 수업 · 평가 본문은 P8, 적재는 P7 이다.
구현자는 curriculum-designer(Opus · xhigh) 한 에이전트가 묶음 0~4 를 이어 한다(SendMessage). 검토는 design-reviewer(Opus · xhigh) 두 번이다. 커밋은 요청자 지시 때(H14).

## 바뀌는 파일 (Files that change)

파일 열하나(모두 새 파일)와 공용 변경 하나다. 규격 파일 열은 검증기가 모두 있어야 오류 0 이 되므로 나누지 않는다(묶음 plan 과 다르게 한 것 1).

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `seed/settings.json` | 신규 | 12절 키 전부를 펼친 약 180행(아래 '설정값 시드'). H5 키는 요청자 확인 값 |
| `seed/level-specs.json` | 신규 | 48행. can-do · 3.3 단계표 수 · 6.3 단계 경계 · 3.6 문장 길이 상한 · 유형별 문항 수(H5) · 쓰기 6단계 이상 단원 틀(H5) |
| `seed/unit-specs.json` | 신규 | 242행(영역 넷 × 12단계 × 단원 5 + 읽기 · 쓰기 단원 0). 학습 요소(3.6) · 주제 · 단원 단어(배정 차례) |
| `seed/vocab.json` | 신규 | 약 2,000항목(내용어 · 알파벳 대표 낱말 · 기능어, 아래 '어휘 시드 구성'). 뜻 · 예문 · 품사 · 단계 · 활용형. 그림 키는 P6b |
| `seed/images.json` | 신규 | `{ "images": [] }`. 채우기는 P6b |
| `seed/model-prices.json` | 신규 | 여섯 행(주 모델 셋 · 대체 모델 셋). 아래 '모델 단가표' 값 그대로 |
| `seed/lists/homophones.json` | 신규 | 동음이의어 묶음(6.2 일치율 · 3.4 '말했다' 확인) |
| `seed/lists/forbidden.json` | 신규 | 금지어(영어 · 한국어)와 정규식(폭력 · 개인 정보 질문 영어 · 한국어 두 벌 · 연락처 꼴) |
| `seed/lists/forms.json` | 신규 | 3.6 학습 요소의 검출 표(읽기 · 말하기 · 회화 차례 rst · 쓰기 차례 writing) |
| `seed/lists/meta-sentences.json` | 신규 | 메타 문장 낱말열(6.4, 검사는 P9 · 1-나) |
| `docs/research/2026-10-1x-seed-reference-basis.md`(이름 제안, 날짜는 쓰는 날) | 신규 | 근거 문서. 어휘 출처와 단계 정하기 · can-do 근거(성취기준 코드 · CEFR 척도) · 단원 주제 · 형태 표 검출 표와 시험 문장 · 금지어 시험 문장 · H5 제안서 · 일회 검사 결과 |

요청하는 공용 변경은 하나다(아래 같은 이름 절). 바꾸지 않는 것: `src/` · `tests/` · `scripts/` 코드 전부, 정본 장(H5 뒤 컨트롤러가 고친다).

## 어휘 시드 구성(P6 셋 공통, 정할 것 다)

3.4 는 '영역마다 단원 60개 × 30개 = 1,800개를 단계 어휘 범위에 고르게 나눠 3 · 6 · 9 · 12단계 누계 450 · 900 · 1,350 · 1,800' 이라 적고, 단원 단어는 '그 단계에 정해 둔 단어에서' 고르며 '네 영역의 단원 어휘는 서로 맞추지 않는다'고 적는다. 이 plan 은 그것을 아래처럼 실현한다(권함, 13절 한 줄).

| 묶음 | 규칙 | 수(추측) |
|---|---|---|
| 내용어 | 단계 n 의 내용어 수 = unit.vocab_count.<구간> × 5. 네 영역이 같은 모음을 쓰고, 단원으로 나누는 방식(어느 단원에 어느 낱말)만 영역마다 다르다. 각 영역은 그 단계 내용어 전부를 단원 단어로 쓴다(영역마다 누계 1,800 = 3.4) | 1,800(H5 로 1~3구간이 25 면 1,725) |
| 알파벳 대표 낱말 | 단원 0(읽기 · 쓰기 1단계)의 단원 단어. 글자마다 소리 대표 낱말 하나(26 안팎), vocab 단계 1. 같은 영역 단원 1~5 의 단어와 겹치면 `reference-unit-word-dup` 오류이므로 단계 1 내용어 150 과 따로 둔다. 말하기 · 회화 단원 단어로는 쓰지 않는다(제안) | 26 안팎 |
| 기능어 | 닫힌 품사만 `function`: 관사 · 대명사(품사 `pronoun` 과 함께) · 지시 · 한정사 · 수량사 · 전치사 · 접속사 · be · 조동사 · 의문사 · not · there(존재) · to(부정사) · yes · no. 단계는 3.6 도입 차례와 필요한 때로 정한다(the · a · is · and · in · on 은 1, because 는 6, if 는 9, although 는 11 처럼). 단원 단어로 쓰지 않는다 | 100~130 |
| 그 밖의 낱말 | 단원 단어가 아닌 내용어(지문에만 쓰는 낱말)는 1-가에서 두지 않는다. P8 표본에서 범위 밖 비율(5%) 걸림이 많으면 13절 한 줄로 더한다 | 0 |

출처와 단계 정하기. 뼈대는 2022 개정 기본 어휘 목록 3,000(교육부 고시 제2022-33호 [별책 14] pp. 254-290)이다. `*` 800 은 초등 권장, `**` 1,200 은 중학교 · 고등학교 공통과목 권장, 나머지 1,000 은 그 밖 과목이다(확인한 사실 4). 1~6단계는 `*` 를 먼저 쓰고(기능어 약 80 을 빼면 `*` 내용어 약 720) 모자라는 몫을 `**` 에서, 7~12단계는 `**` 에서 고른다. 같은 표 안에서 단계를 가를 때는 교과서 빈도 · CEFR-J(A1 · A2 · B1) · 단원 주제와 학습 요소의 필요를 참고로 대조만 한다(목록을 통째로 옮기지 않는다, 확인한 사실 5 · 6). 근거 문서에 낱말마다 출처 표시(`*` · `**` · 그 밖)와 단계 수 표를 남긴다.

크기 추정(추측): vocab 약 1,950~2,050항목 · 약 300KB(항목 하나 한 줄), unit-specs 약 100KB, level-specs 약 35KB, settings 약 16KB, forms 약 25KB. curriculum-designer 출력은 모두 약 160~180K 토큰이고, 구간 묶음 하나에 약 35~50K 토큰이다.

## 파일별 값(구현자가 옮겨 쓸 것)

공통: JSON 은 UTF-8, 들여쓰기 두 칸. 긴 배열(vocab · unitSpecs · settings)은 항목 하나를 한 줄 객체로 쓴다(검토 · 비교가 쉽다). 판은 모든 행 `revision 1 · correction 0`(5절 '개정.정정', P4a 견본과 같음). 키 이름 · 칸은 P4 규격(`src/core/seed/schema/reference.ts`) 그대로이고 모르는 키는 거부된다. 영어 값은 C54 (3) · C60 그대로다(영역 `reading · writing · speaking · talk`, 구간 `1-3 · 4-6 · 7-9 · 10-12`, 회화 토막 `greeting · today_words · practice · talk · more_talk · wrap_up`, 품사 `noun · verb · adjective · adverb · number · pronoun · function`, 그림 라이선스 `cc0 · cc_by · generated`). 서브에이전트 도구 층이 `\u` 이스케이프를 글자로 바꾸므로 정규식은 글자 그대로 쓰거나 바이트로 확인한다.
묶음 조각은 `tests/.tmp/p06/`(.gitignore 에 든 자리)에 쓰고 node 한 줄로 `seed/` 파일에 합친다(정렬 · 겹침 확인). `seed/` 아래에는 배치 밖 파일을 두지 않는다(검증기 `path` 오류).

### 설정값 시드 `settings.json`

12절 표의 121행을 아래 규칙으로 펼친다(약 180행). 12절 밖의 키는 넣지 않는다(P7 check-ids 가 맞댄다). 차례는 12절 표 차례, 구간 차례는 1-3 · 4-6 · 7-9 · 10-12 다.

| 무엇 | 규칙 |
|---|---|
| `scope` | 12절 범위 열: 집 전체 → `household`, 프로필 → `profile`(프로필 키는 profile_id 없는 기본 행) |
| `changeVia` | 12절 바꾸는 곳 열: 시드 → `seed`, 결정 기록 먼저 → `decision-first`, 고급 → `advanced`, 기본 → `basic`(첫 실행 화면 한 행은 정할 것 라) |
| `<구간>` 키 15개 | 행 넷(`unit.regular_lessons.1-3` 꼴). 값은 기본값 칸의 구간 차례 |
| `ai.model.<호출>` · `ai.effort.<호출>` · `ai.thinking.<호출>` | 호출 넷 `writing_feedback · writing_check · speaking_eval · thinkout` 행. 회화 턴은 12절의 따로 행 `ai.*.talk_turn.<구간>` 넷 |
| `ai.max_tokens.<호출>` | 일곱 행: `writing_feedback` 8000 · `writing_check` 4000 · `speaking_eval` 4000 · `thinkout` 4000 · `talk_turn` 1000 · `talk_closing` 2000 · `probe` 1 |
| 모델 값(6.1 표) | `writing_feedback` `claude-opus-5-5`, 나머지 셋 `claude-sonnet-5-5`, talk_turn 구간 `claude-haiku-5-5` · `claude-sonnet-5-5` · `claude-sonnet-5-5` · `claude-sonnet-5-5` |
| effort 값 | `writing_feedback` `medium`, 나머지 셋 `low`, talk_turn 구간 `low` 넷 |
| 생각 값 | 12절 '끔 · 적응' → `off` · `adaptive`(정할 것 마). talk_turn 구간 `off` 넷, 나머지 넷 `adaptive` |
| 목록 값 | `review.intervals_days` [1, 2, 4, 30, 60, 120] · `ui.wait_hint_seconds` [1, 5] · `ui.match_phrase_levels` [0.9, 0.6] · `talk.test_hint_scores` [1, 0.5, 0] · `ai.down_retry_minutes` [5, 15, 30] · `ai.monthly_alert_multiples` [1, 2, 4] |
| 단계마다 다른 값 | `writing.max_corrections` {"6": 2, "7": 2, "8": 2, "9": 2, "10": 3, "11": 3, "12": 3} · `talk.next_time_lines` {"5": 1, "6": 1, "7": 1, "8": 1, "9": 1, "10": 2, "11": 2, "12": 2}(정할 것 마) |
| 글 값 | `speech.lang` "en-US" · `app.timezone` "Asia/Seoul". 수는 JSON 수로 쓰고 숫자 꼴 글을 쓰지 않는다. JSON null 을 뜻으로 쓰지 않는다(P3a 메모) |
| `profile.start_level.<영역>` | 넣지 않는다(정할 것 라) |
| H5 키 | `unit.vocab_count` · `unit.new_words_per_lesson` · `unit.regular_lessons` · `unit.min_lessons` · `unit.min_days` · `unit.max_remedial` · `seed.remedial_per_unit` · `seed.topic_variants` 의 구간 값과 `speaking.answer_max_seconds.<구간>`. 묶음 0 에서는 12절 잠정 값(answer_max_seconds 는 제안 값), H5 뒤 확인 값 |
| 그 밖 | 12절 기본값 그대로. `seed.remedial_coverage` 는 잠정 1 · 2 · 2 · 2 그대로(P8 표본에서 학습 설계자가 정한다, 6.3 순서 2) |

검증기는 이 가운데 45키(구간 키 8종 × 4 + 하나짜리 13)를 읽고, 쓰기 모양 경계(3 < 5, 5 + 1 = 6)와 `seed.complete_through_level` 1~12 와 3.2 관계 표(마지막 배정 수업 새 단어 ≤ 단원 단어 × (1 − unit.vocab_mastery), 배정 수 ≤ 정규 수, unit.max_remedial ≤ seed.remedial_per_unit)를 본다(P4b `settings` · `frame-*`).

### 단계 규격 `level-specs.json`

초안은 P4 견본 `tests/fixtures/seed/builders.ts` 의 `READING_TABLE` · `WRITING_TABLE` · `SPEAKING_TABLE` · `TALK_TABLE` · `levelSpecRows` 값을 옮기고, 줄마다 3.3 · 6.3 · 3.6 과 대조해 고친 곳을 근거 문서에 적는다(P4a 위험 2 — 견본은 검증기를 통과하는 꼴일 뿐 정본 대조를 거치지 않았다). can-do 는 새로 쓴다.

| 칸 | 값 |
|---|---|
| 공통 | `band` · `cefr` 는 단계와 맞게(1~3 Pre-A1 · 4~6 A1 · 7~9 A2 · 10~12 B1). `sentenceMaxWords` 는 3.6 의 5 · 6 · 7 · 8 · 9 · 10 · 12 · 13 · 15 · 18 · 20 · 22. `targetMinutes` 는 3.3 목표 시간(쓰기 6단계 이상 `{ draft, revise }`) |
| 읽기 | `passage`(1단계 `sentences` 1~3, 2단계 `words` 20~35 · `sentences` 3~5, 3단계부터 `words`), `textTypes`(3.3 글 종류), `questions.total` · `mix`(3.3 문제 열, 유형 영어 값은 P4a 표) |
| 쓰기 | `amount`: 1~3 `items`(1단계 단어 6 · pick-word · copy-tiles · fill-letters, 2단계 단어 6 + 어구 3 · dictation · build-tiles · assemble-phrase, 3단계 문장 5 · 3~5단어 · assemble-sentence), 4 `guided` 3문장 `word-box`, 5 `guided` 3~4문장 `slot`, 6~12 `composition`(3.3 분량). `maxCorrections` 4~5 1 · 6~9 2 · 10~12 3(정할 것 바). `frame`(6단계부터만, H5): 6~9 · 10~12 의 k · 정규 · 최소 |
| 말하기 | `repeat` · `listening`(1~2 `picture`, 3부터 `text`) · `questions`(1~3 `modelAnswer` 참, 1~2 `acceptedMin` 3, 1~4 `koMeaning` 참, 3단계부터 `answerSentences`) · 6 · 8 `pictureTask`(6: 그림 2~3 · 차례 없음 · 2문장, 8: 3장 · 차례 있음 · 3~4문장) · 9~12 `presentation`(45 · 60 · 90 · 120초, 쓸 말 3, 예비 확인 질문 3). 수는 3.3 말하기 표 · C9 그대로 |
| 회화 | `segments` 1~3 `greeting · today_words · practice · talk · wrap_up`, 4~12 `greeting · today_words · talk · wrap_up`(`more_talk` 은 턴 표시라 넣지 않는다, 1-나에 넘김). `mode`(3.3 대화 방식 짧게), `targetTurns` 15 · 20 · 25, `missions` 5 · 6 · 7 단계 3 · 4 · 5, `hintTiers`(1~2 ko · sentence, 3~5 ko · frame · sentence, 6~7 frame · sentence, 8~9 frame, 10~12 없음), `usablePhrases` 5단계 3 · 6단계 2, `cardShape` 1~3 `turns` · 4~12 `questions`, `twoAnswers` 1단계, `frameInTurns` 3단계, `turnImages` · `moreTalk` 1~3, `koMeaning` 1~4 |
| `testMix` | 읽기 · 쓰기 · 말하기 36행에 H5 값(아래 'H5 제안'). 회화는 평가 카드 장이라 두지 않는다 |
| `canDo` | 아래 규칙 |

can-do 48개. 한 문장(길어도 두 문장)으로 '~할 수 있다' 꼴이다. 숫자는 아라비아 숫자로 쓰고 그 단계 규격 JSON 에 있는 숫자만 쓴다(검증기 `can-do-numbers` 경고 0 — 단계 숫자 · 문장 길이 상한도 규격 안의 숫자다). 3.1 의 두 예를 그대로 맞춘다(읽기 4단계 '일상 주제의 55~80단어 글을 읽고 누가 · 무엇 · 어디를 묻는 질문에 답할 수 있다', 회화 5단계 '가게 · 학교 같은 상황에서 토리와 20번 말을 주고받으며 미션 3개를 해낼 수 있다'). 이웃 단계는 분량이나 과제 가운데 하나가 다르게 읽혀야 한다(3.3 첫 문단). 근거 한 줄(2022 성취기준 코드, 회화 · 말하기는 CEFR Companion Volume 2020 구어 상호작용 척도 이름)은 근거 문서에 적는다(규격이 모르는 키를 거부해 JSON 에 근거 칸을 둘 수 없다).

### 단원 규격 `unit-specs.json`

| 칸 | 규칙 |
|---|---|
| `area` · `level` · `unit` | 영역 넷 × 1~12 × 1~5, 그리고 `reading 1 0` · `writing 1 0` |
| `learningElement` | 3.6 표 칸 글 그대로. 읽기 · 말하기 · 회화는 '읽기 · 말하기 · 회화' 열, 쓰기는 '쓰기' 열, 단원 1~5 차례 = 표의 '/' 차례. 단원 0 은 '알파벳 이름과 기본 소리'(제안) |
| `topic` | 한국어 짧은 주제(10자 안팎). 아이 일상(가족 · 학교 · 동물 · 음식 · 놀이)에서 고르고 같은 (영역, 단계) 안에서 겹치지 않는다. 주제 묶음 둘(1 동물 · 자연 · 음식 · 가족, 2 놀이 · 운동 · 게임 · 우주 · 탈것)에 등장인물 · 예시만 바꿔 맞출 수 있어야 한다(6.3 '단원 주제는 그대로 두고 … 묶음에 맞춘다'). 학습 요소와 어울리게 고른다 |
| `words` | unit.vocab_count.<구간> 개(단원 0 은 대표 낱말 수). vocab 단계 = 단원 단계(단원 0 은 1). 한 영역 안에서 겹치지 않고 그 단계 내용어 전부를 다섯 단원에 나눈다. 기능어를 넣지 않는다. 차례가 배정 차례다 — 앞 배정 수업일수록 쉽고 그 단원 학습 요소에 필요한 낱말을 먼저, 한 배정 수업의 k 개는 한 수업 글에 함께 쓰기 좋은 낱말로 묶는다. 쓰기 1~3단계는 3.6 쓰기 열의 철자 패턴에 맞는 낱말을 그 단원에 둔다(예: 1단계 단원 1 '단모음 a · e'). 읽기 1~2단계는 그림 고르기가 많으므로 그림이 되는 낱말(구체 명사 · 동작어 · 색 · 수) 비율을 근거 문서에 적는다 |

### 어휘 `vocab.json`

| 칸 | 규칙 |
|---|---|
| `word` | 원형. 소문자로 쓰고, 요일 · 달 이름 같은 고유 명사와 `I` 만 대문자. 띄어 쓴 여러 낱말 표제어 허용(ice cream). 줄임말을 넣으면 점까지(`Mr.` · `Mrs.` · `Dr.` · `a.m.` · `p.m.`). 대소문자 무시하고 겹치지 않는다 |
| `meaningKo` | 짧은 한국어 뜻. 뜻이 여럿이면 그 단계에서 가르치는 뜻 먼저, 둘까지 |
| `example` | 영어 한 문장. 그 낱말(원형 또는 활용형)이 든다. 문장 낱말 수 ≤ 그 단계 `sentenceMaxWords`. 다른 낱말은 단계가 그 낱말 단계 이하인 vocab 낱말. 형태는 그 단계까지 도입된 것만(형태 표 rst 차례, 쓰기 단원 낱말도 rst 로 봄 — 제안). 금지어 없음. 표기 규칙(plan-p02 다-7): 소수 · `a.m.` · `p.m.` · 붙여 쓴 `7:30pm` · had 뜻의 `'d` 를 쓰지 않고, `{NAME}` 을 쓰지 않는다. 숫자는 0~999 정수까지 |
| `pos` | 위 품사 값. 여러 개 가능. `function` 은 위 닫힌 품사만, 대명사는 `["pronoun", "function"]`. 수 낱말(one ~ hundred)은 `number` |
| `level` | 1~12(위 '어휘 시드 구성') |
| `forms` | 활용형 전부. 명사 복수(불규칙 children · feet · teeth · mice · sheep · fish · people …), 동사 3인칭 단수 · 과거 · 과거분사 · -ing(불규칙 전부: went · gone · ate · eaten · saw · seen …), 형용사 · 부사 비교급 · 최상급(good · better · best …), be(am · is · are · was · were · been · being), have(has · had · having), do(does · did · done · doing), 대명사 꼴(me · my · mine · myself 는 그 대명사 항목의 forms 또는 따로 항목 — 근거 문서에 고른 쪽을 적는다). 축약형은 글 도구가 펴므로(n't · 'm · 're · 've · 'll · 'd · 's 와 can't · won't · shan't) 그 바탕 낱말(is · not · will …)이 vocab 에 있으면 된다. 글 도구가 못 펴는 꼴(let's 는 let + is 로 잘못 펴짐)만 forms 에 둔다 |
| `imageKey` | 이 plan 에서는 두지 않는다(P6b) |
| 차례 | 단계 → 낱말 차례 |

예문은 검증기가 보지 않는다(규격 파일 정합 밖). 묶음마다 일회 검사(저장소에 남기지 않는 `tsx` 스크립트, `tests/.tmp/p06/`)로 P4a 글 도구(`sentenceWords` · `offbandRatio` · `formsIn` · `forbiddenHits` · `buildLexicon`)를 돌려 길이 초과 · 범위 밖 · 범위 밖 형태 · 금지어가 0 인지 보고 근거 문서에 적는다(정할 것 파).

### 모델 단가표 `model-prices.json`

`effectiveFrom` 은 모두 "2026-10-16"(확인한 날). 단위는 100만 토큰당 달러, `cacheWriteUsdPerMTok` 는 5분 캐시 쓰기다(앱의 자동 캐시가 5분, 6.1). 출처는 확인한 사실 1 · 2 · 3.

| model | input | output | cacheWrite | cacheRead | thinkingDefault | thinkingOff | thinkingOffEfforts | effortDefault | serverFallback | fallbackOnly |
|---|---|---|---|---|---|---|---|---|---|---|
| `claude-opus-5-5` | 4 | 20 | 5 | 0.2 | adaptive | null | [] | medium | true | (없음) |
| `claude-sonnet-5-5` | 2 | 10 | 2.5 | 0.1 | adaptive | between_tools | low · medium · high | high | true | (없음) |
| `claude-haiku-5-5` | 0.1 | 0.5 | 0.125 | 0.01 | adaptive | disabled | low · medium · high | medium | false | (없음) |
| `claude-sonnet-5` | 2 | 10 | 2.5 | 0.2 | adaptive | disabled | low · medium · high(추측) | high | false | true |
| `claude-opus-5` | 5 | 25 | 6.25 | 0.5 | adaptive | disabled | low · medium · high | high | true | true |
| `claude-opus-4-8` | 5 | 25 | 6.25 | 0.5 | adaptive(규격 한계, 정할 것 아) | disabled | low · medium · high · xhigh · max(추측) | high | false | true |

Haiku 5.5 의 입력 10만 토큰 넘는 가격(0.5 · 2.5 · 0.625 · 0.05)은 규격에 칸이 없다. 앱 호출은 1만 토큰 안쪽이라 영향이 없다(추측, P9 메모). `claude-opus-4-8` 행은 '단가 없는 모델이 답하면 Opus 4.8 단가로 센다'(6.1)에 필요하다. P4a 견본의 Opus 캐시 값(Sonnet 비율)은 옮기지 않는다.

### 목록 넷 `lists/`

| 파일 | 규칙 |
|---|---|
| `homophones.json` | en-US 에서 소리가 같은 낱말 묶음만(to · too · two, for · four, there · their, right · write, see · sea, by · buy · bye, hear · here, know · no, one · won, eight · ate, son · sun, meet · meat, week · weak, blue · blew, new · knew, hour · our, be · bee, wear · where, pair · pear, dear · deer, road · rode, night · knight, whole · hole, piece · peace, tail · tale …). 축약형(it's · they're)은 정규화가 먼저 펴므로 넣지 않는다(plan-p02 값 1). vocab 에 있는 낱말끼리만. 묶음의 첫 낱말이 바꿔 쓸 대표다 |
| `forbidden.json` | `words.en` 은 낱말 단위로 맞으므로 활용형을 함께 적는다(kill · kills · killed · killing — P4a 검토 범위 밖 관찰 2). `words.ko` 는 부분 글로 맞으므로 짧은 조각(예: '죽')을 넣지 않고 걸릴 꼴 그대로 적는다. `patterns`: `personal-info` 영어(집 주소 · 사는 곳 · 전화번호 · 학교 이름 · 성 · 이메일을 묻는 꼴) · 한국어(주소 · 어디 살아 · 전화번호 · 학교 이름 · 몇 반 …) 각 하나 이상, `contact`(전화번호 · 이메일 · 웹 주소 꼴 — 시각 7:30 · 점수 3-2 · 연도는 안 걸리게), `violence`. 정규식은 소문자로 바꾼 글에 `iu` 로 건다 |
| `forms.json` | 3.6 의 읽기 · 말하기 · 회화 60 요소와 쓰기 60 요소마다 검출기를 두거나 '검출하지 않음'과 까닭을 근거 문서 표에 적는다. `introducedAt.rst` · `writing` 은 그 요소가 처음 나오는 (단계, 단원), 한쪽 차례에 없으면 null. 흔한 낱말을 막지 않는다 — and 를 5단계 요소로 막으면 1단계 'cats and dogs' 가 걸린다. 낱말 목록(`words`, 여러 낱말 이음 가능)을 먼저 쓰고 정규식은 여러 낱말 구조에만 쓴다. 낱말 목록은 vocab 활용형에서 뽑는다(과거형 · 불규칙 과거 · -ly 부사 · 비교급 · 최상급). 정규식은 낱말 경계를 정확히(`\b[a-z]+ed\b` 는 red · bed 를 잡는다 — P4b 검토 M-2), 예: be going to 는 'going to school' 을 잡지 않게. 요소마다 맞아야 할 문장 · 안 맞아야 할 문장 둘 이상씩을 근거 문서에 두고 `formsIn` 으로 돌린 결과를 적는다 |
| `meta-sentences.json` | 소문자 낱말열: the child · the user · the student · the learner · i should · i will now · as an ai · my instructions · system prompt · the system 등(6.4) |

### 근거 문서

절: (1) 어휘 출처와 단계 정하기(출처 표시 수 표 · 기능어 목록과 단계 · 알파벳 대표 낱말), (2) can-do 48 근거, (3) 단원 주제 · 학습 요소 표, (4) 형태 표 검출 표(요소 120 → 검출기 · 시험 문장 · 결과), (5) 금지어 시험 문장(맞아야 할 것 · 안 맞아야 할 것 · 결과), (6) H5 제안서, (7) level_specs 를 견본에서 고친 곳, (8) 일회 검사 결과(설정값 12절 대조 · 예문 · 묶음마다 검증 출력).

## H5 제안(묶음 0 뒤, 요청자 확인)

curriculum-designer 가 근거 문서 (6)절에 쓰고, 컨트롤러가 항목마다 배경 · 선택지 · 결과를 푼 읽기용 쪽으로 요청자에게 보인다(메모리 '결정은 하나씩 풀어서'). 담을 것:

1. 지금 값: 3.2 표(1~3 30 · 5 · 10(6 + 4) · 3 · 2 · 6 · 4, 4~6 30 · 4 · 13(8 + 5) · 4 · 2 · 8 · 5, 7~9 30 · 4 · 13 · 4 · 2 · 9 · 6, 10~12 30 · 3 · 15(10 + 5) · 5 · 2 · 10 · 7), 쓰기 6~9 k 6 · 정규 7 · 최소 5, 10~12 k 5 · 정규 8 · 최소 6.
2. 구간마다 제안 값과 까닭. 단원 단어 · k · 정규(배정 + 다지기) · 보강 · 변형 · 최소 수업 · 최소 학습일. 까닭은 2022 학습 어휘 수(초3~4 300 · 초5~6 300 · 중 누계 1,500 · 공통 누계 1,800), CEFR, 3.3 세션 목표 시간, 3.4 복습 간격(새 단어가 '안다'가 되는 데 7학습일), 3.2 관계 표 셈(마지막 배정 수업 새 단어 ≤ V × 0.2, 배정 ≤ 정규, 보강 상한 ≤ 시드 보강, 회화 다시 묻는 턴 자리 ≥ V × 0.8 × 2).
3. 갈림길: 1~3구간 단원 단어 25(배정 5 + 다지기 5) 대 30(6 + 4). 3.2 관계 표가 '가장 어린 아이에게 단어 부담이 가장 크다'며 25 를 검토 대상으로 둔다. 25 면 3 · 6 · 12단계 누계가 375 · 825 · 1,725 가 되고(6단계 825 는 초등 권장 `*` 800 에 가깝다), 마지막 배정 수업 새 단어 5 = 25 × 0.2 경계라 관계 표를 지키며, 3.4 누계 숫자를 고쳐야 한다(13절 · 3.4). 30 이면 지금 정본 그대로다.
4. 바뀐 값이 시드 수 · 생성 시간(6.3 표 · 시간 문단)과 아이 하루 분량에 주는 영향.
5. 단계 평가 유형별 문항 수(영역 × 구간, 단계 예외 표). 검증기 규칙(P4c `level-test-*`)을 지킨다: 20문항(level.test_items)이 단원마다 4, 유형별 수 합 20. 읽기는 읽기 유형만(그 단계 수업 유형을 쓰기 권함, 1단계는 picture). 쓰기 1~3 은 쓰기 문항 유형(pick-word 는 그림 있는 낱말만), 4~5 는 fill-blank · fix-sentence, 6~12 는 둘에 composition. 말하기 repeat 는 따라 말하기가 있는 1~8단계만, presentation 은 9~12 만, 허용 답 없는 question 은 AI 과제다. AI 과제(composition · 허용 답 없는 question · presentation)는 쓰기 6단계 이상 · 말하기 9단계 이상에서 벌마다 2개까지, 둘째 세션 끝. 그래서 말하기 3~8단계 question 은 허용 답을 둔 앱 채점 문항이어야 한다.
6. `speaking.answer_max_seconds.<구간>` 값(C53). 두 문장 이상 답하는 활동(5단계부터 질문 답 · 그림 보고 말하기, 9~12단계 발표 · 확인 질문)을 듣는 상한이고 버튼으로 먼저 끝낸다. 구간 값 하나가 그 구간 가장 긴 발표(9단계 45초, 12단계 120초)보다 길어야 발표를 자르지 않는다. 1~3구간은 쓰는 활동이 없지만 12절 구간 키라 행을 둔다(값과 '쓰지 않음'을 함께 적는다).
7. 13절 한 줄 초안(보고 `task-p06-plan-report.md` 의 초안을 다듬는다).

| H5 전에 할 수 있는 것 | H5 뒤에 할 것 |
|---|---|
| settings.json(H5 키는 잠정 · 제안 값) · level-specs(testMix · frame 빼고) · model-prices · homophones · forbidden · meta · forms 뼈대(3.6 차례) · 근거 문서 (1)~(3) · 단계마다 후보 낱말 모음(순위를 매겨 넉넉히, 25 · 30 어느 쪽이든 앞에서부터 고른다) · 기능어 목록과 단계 · 알파벳 대표 낱말 | H5 키 값 반영 · testMix · frame · 1~3단계 unit_specs 와 vocab 확정. 4~12단계는 H5 가 그 구간 단원 단어 수를 바꾸지 않을 것이 분명하면 H5 전에 시작해도 된다(컨트롤러 판단) |

## 작업 순서 (Order of work)

명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴이다(서브에이전트 환경이 `source ~/.nvm/nvm.sh` 와 한글 경로 인자를 막는다). 묶음 중간 확인(필터 명령)은 아래다. 0 이 나와야 하고, 남은 `reference-complete` 는 아직 만들지 않은 단계의 행뿐이어야 한다.

```bash
PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm -s seed:validate --json | jq '[.errors[] | select(.rule != "reference-complete")] | length'
PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm -s seed:validate --json | jq -r '.errors[] | select(.rule == "reference-complete") | .message' | head
```

1. [문서] 준비(컨트롤러). 바탕 6bd6015 에서 격리 워크트리 · 브랜치를 만들고 공용 변경(biome)을 옮기고 `pnpm install` 뒤 `pnpm seed:validate` 가 2(뿌리 없음)인지 본다. curriculum-designer 브리프에 이 plan 의 '어휘 시드 구성' · '파일별 값' · 'H5 제안' 절과 P6 에 넘어온 메모(위험 절 끝)를 옮긴다. 완료: 브리프 · 워크트리.
2. [검증] 묶음 0(curriculum-designer · Opus · xhigh). settings.json · level-specs.json(testMix · frame 잠정) · model-prices.json · images.json(빈 목록) · homophones · forbidden · meta-sentences · forms 뼈대 · 근거 문서 (1)~(3) · 단계마다 후보 낱말 모음 · 기능어 · 알파벳 대표 낱말 · H5 제안서. 완료: 필터 명령에서 이 파일들의 `schema` · `settings` · `reference-level-spec` · `frame-*` 오류 0, 설정값 12절 대조 일회 검사(12절 표를 펼친 키 모음 = settings.json 키 모음, 값 = 기본값) 0.
3. [사람] H5(묶음 plan H5). 컨트롤러가 제안서를 읽기용 쪽으로 보이고 요청자가 확인한다. 컨트롤러가 13절에 한 줄 넣고 3.2 표 · 12절 기본값(필요하면 3.4 누계 · 6.3 시드 수)을 고쳐 문서 브랜치에 커밋한 뒤, 확인 값을 curriculum-designer 에 보낸다. 완료: 13절 커밋.
4. [검증] 묶음 1(1~3단계와 알파벳). vocab · unit-specs(1~3 · 단원 0) · forms(1~3단계 도입 요소) · settings H5 값 · testMix(1~3) · 근거 문서 (4)~(5)의 1~3 몫. 완료: 필터 명령 0, 남은 `reference-complete` 는 4~12단계 행뿐, 예문 일회 검사 0.
5. [검증] design-reviewer 1차(묶음 0 · 1, Opus · xhigh). 점검표는 증명 절. fix 는 curriculum-designer 가 3회까지. 완료: Critical · Important 0.
6. [검증] 묶음 2 → 3 → 4(4~6 · 7~9 · 10~12) 차례로. 묶음마다 필터 명령 · 예문 일회 검사 0. 완료: `pnpm seed:validate` 종료 0 · 첫 줄 '실패 0 · 규격 파일 오류 0' · `--json` 의 can-do 경고 0.
7. [검증] design-reviewer 2차(묶음 2~4 와 전체 정합) → fix 3회까지. 마무리 명령. 완료: Approved, `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` 0, `pnpm spec:trace` missing-test 변화 없음(58).
8. [사람] 검토 · 커밋(H14). 완료: 커밋. P6b 의 그림 고르기와 P7 · P8 이 이 파일들을 쓴다.

순서 4 가 끝나면(1~2단계 vocab) P6b 의 그림 고르기를 시작할 수 있다. P8 표본은 이 plan 의 순서 7 뒤(규격 파일 오류 0)에 시작한다(정할 것 하).

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | H5 가 늦다(요청자 몫, 작업 순서 3) | 1~3단계 확정과 P8 표본이 밀린다 — 1-가 길목이다 | 묶음 0 을 빨리 끝내 H5 를 일찍 묻는다. 후보 낱말을 넉넉히 만들어 25 · 30 어느 쪽이든 바로 고른다. H7(P6b) 을 같은 읽기용 쪽에 붙여 한 번에 묻는다 |
| 2 | level_specs 를 3.3 · 6.3 과 다르게 옮긴다 | 검증기가 틀린 규칙으로 시드를 통과시킨다(P4a 위험 2) | 견본에서 고친 곳을 근거 문서 (7)에 적고, design-reviewer 1차가 48행을 줄마다 대조한다 |
| 3 | 형태 표 검출기가 흔한 낱말을 잡는다(거짓 양성) | P8 수업이 학습 요소 오류로 계속 걸린다 | 낱말 목록 먼저 · 경계 정확히 · 요소마다 안 맞아야 할 문장. 검출이 어려운 요소는 '검출하지 않음'(사람 표본 검토가 맡음) |
| 4 | 형태 표가 너무 느슨하다(거짓 음성) | 범위 밖 문형이 든 시드가 통과한다 | 3.6 120 요소의 검출 여부 표를 근거 문서에 두고 design-reviewer 가 본다. 묶음 게이트(H11) 표본이 마지막 그물 |
| 5 | 금지어 한국어 부분 글 · 연락처 정규식이 넓다 | 정상 시드 · 한국어 뜻이 걸린다 | 맞아야 할 · 안 맞아야 할 시험 문장을 `forbiddenHits` 로 돌려 근거 문서에 남긴다 |
| 6 | 활용형 · 불규칙형이 빠진다 | 새 단어가 '글에 없다'로 걸리거나 글로서리 빠짐(P4b 위험 1) | forms 규칙(위)과 예문 일회 검사. 표본에서 걸린 낱말을 고친다 |
| 7 | 기능어 단계가 3.6 과 어긋난다 | 범위 밖 비율이 늘거나(너무 높음) 범위가 새는(너무 낮음) 일 | 기능어 목록과 단계를 근거 문서에 표로, design-reviewer 1차가 본다 |
| 8 | 한 영역 단원 단어 겹침 · 단원 단어 수 · 단계 어긋남 | 검증기 오류 | 검증기가 막는다(`reference-unit-word-dup` · `reference-unit-spec`). 필터 명령으로 묶음마다 0 |
| 9 | vocab 예문은 검증기가 안 본다 | 범위 밖 낱말 · 형태가 든 예문이 단어장에 보인다 | 일회 검사(정할 것 파)와 design-reviewer 표본 |
| 10 | 한 에이전트가 2,000항목을 쓰다 품질이 고르지 않다 | 뜻 · 예문 오류 | 구간 묶음으로 나누고 묶음마다 확인, 검토 두 번. 같은 에이전트를 이어 써 원칙을 지킨다 |
| 11 | 대체 모델 행 · 생각 조합의 일부가 추측이다 | P9 조합 검사 · 비용 셈이 틀린다 | fallbackOnly 행은 비용 셈에만 쓰인다. H4 뒤 P9 가 Models API(allowed_fallback_models)로 확인해 고친다 |
| 12 | 쓰기 교정 상한이 두 곳(level_specs · 12절)에 있다 | 한쪽만 고치면 어긋난다 | 같은 값으로 두고 P7 check-ids 가 맞댄다(정할 것 바) |
| 13 | 워크트리의 낡은 specs/ 를 읽는다 | 낡은 규칙을 옮긴다 | 브리프에 메인 저장소 정본 경로를 적는다 |

### 묶음 plan 과 다르게 한 것

1. P6 을 셋(a 규격 파일 · b 그림 · c 목업)으로 나누고 vocab 과 unit_specs 를 a 에 함께 둔다. 브리프는 a · b 둘(b 에 vocab · 그림 · 목업)을 예상했지만, 검증기가 규격 파일 열을 함께 요구해 vocab 이 a 밖이면 a 가 오류 0 에 닿지 못한다(정할 것 가).
2. settings.json 은 12절 키 전부(약 180행)다. 브리프의 '45키'는 검증기가 읽는 키 수다.
3. P6b 에 작은 스크립트와 P4 규격 한 줄(그림 파일 꼴 svg)이 든다. '코드 없는 P' 에서 벗어나므로 그 몫은 가벼운 루프로 검토한다(정할 것 나 · 차).
4. P6c 는 파일 수가 열을 넘고(약 33), 편집자는 implementer 다(정할 것 나 · 타).
5. 그림 범위는 1~4단계와 알파벳 대표 낱말이다(첫 운영 배포 몫, 정할 것 카). 5~12단계 그림은 2차 시드와 함께.
6. 묶음 plan 의 P6 증명(`pnpm seed:validate` · design-reviewer 보고)에 일회 검사(설정값 12절 대조 · 예문 · 형태 표 · 금지어 시험 문장)를 더했다.
7. 브리프의 '`specs/01-개요.md` 11절 (3) · 목업 표'는 `specs/08-테스트와-기술.md` 의 11절로 읽었다.

### 정할 것(P6 전체, 컨트롤러가 정함 — 보고 `task-p06-plan-report.md` 와 같은 글자)

- 가. P6 를 셋으로 나눈다(a 규격 파일 열하나 · 작업 8, b 그림 여덟 파일과 공용 둘 · 작업 8, c 목업 약 33장(고침 16 · 새 17) · 작업 7). 규격 파일 열은 검증기가 모두 있어야 오류 0 이라 vocab 과 unit_specs 를 a 에 함께 둔다. 권함: 셋. 13절 불필요.
- 나. 역할. a 는 curriculum-designer(Opus · xhigh) 하나를 이어 쓰고 design-reviewer(Opus · xhigh) 두 번. b 의 스크립트는 implementer(Opus · high) · 가벼운 루프(C52, code-reviewer Opus · high 범위 한정), 그림 고르기는 curriculum-designer(Opus · high), 자체 그림은 implementer(Opus · high), 그림 검토는 design-reviewer(xhigh). c 의 목업 편집은 implementer(Opus · high, 시험 대신 화면 사진), 검토 design-reviewer(xhigh). 브리프는 curriculum-designer 와 design-reviewer 만 적었으나 코드 · 화면 편집은 그 정의 밖이다. 권함: 이대로. 13절 불필요.
- 다. 어휘 시드 구성(위 절). 권함: 이대로. 13절 한 줄 권함(3.4 의 1,800 을 실현하는 방식과 알파벳 · 기능어 처리).
- 라. `profile.start_level.<영역>`: 12절 기본값 '비움'을 '행 없음'으로 두고 settings.json 에 넣지 않는다(JSON null 금지 · 바꾸는 곳 '첫 실행 화면'은 changeVia 값에 없음). P10 이 행 없음을 '부모가 고르지 않음'으로 읽는다. 13절 한 줄(12절 '프로필 키는 기본 행을 시드로'의 예외).
- 마. 값 꼴. 단계마다 다른 값(`writing.max_corrections` · `talk.next_time_lines`)은 단계 → 수 사전, `ai.thinking.*` 값은 `off` · `adaptive`. 권함: 이대로. 13절 불필요(값의 표기). P9 · 1-나 와 맞춘다.
- 바. 쓰기 교정 상한 이중 출처(level_specs `maxCorrections` 와 12절 `writing.max_corrections`, 5절 · 12절 둘 다 적음). 권함: 둘 다 같은 값, P7 check-ids 가 맞댐. 13절 불필요.
- 사. 6.6 의 Opus 5.5 캐시 단가 빈칸: 5분 쓰기 5 · 1시간 쓰기 8 · 읽기 0.20(0.05배), 대체 모델 Opus 5 · Opus 4.8 5 · 25 · 6.25 · 0.50, Sonnet 5 2 · 10 · 2.50 · 0.20(가격 쪽 2026-10-16). Sonnet 5.5 캐시 읽기 0.10 은 정본이 맞다(claude-api 스킬 묶음의 0.20 은 낡음). 권함: 컨트롤러가 13절 한 줄과 6.6 을 고친다.
- 아. model_prices 규격 빈틈: `thinkingDefault` 가 'adaptive' 하나만 받아 Opus 4.8(생각 기본 꺼짐)을 바르게 못 적는다. 권함: P9 가 조합 검사를 만들 때 규격에 'none' 을 더하고 이 행을 고친다. 그 전까지 'adaptive' 로 두고 근거 문서에 적는다. 13절 불필요.
- 자. H5 갈림길(1~3구간 단원 단어 25 대 30)과 단원 틀 값 · 유형별 문항 수 · `speaking.answer_max_seconds`. 요청자 확인. 13절 한 줄 필요.
- 차. 그림(P6b): Twemoji v17.0.3(그래픽 CC-BY 4.0) 주 묶음, 모자란 낱말은 Claude 가 그린 SVG(`generated`), 그림 파일 꼴에 svg 를 더함(P4 규격 정규식 한 줄), 저작자 표시는 `CREDITS.md` 와 images.json. 요청자 확인(H7). 13절 한 줄(13절 잠정 그림 행을 구체화).
- 카. 그림 범위: 1~4단계 그림 낱말과 알파벳 대표 낱말(첫 운영 배포 몫, 3.3 '1~4단계 그림'), 1~2단계 먼저(1-가). 13절 불필요.
- 타. 목업(P6c): 11절 목업 표 밖의 첫 실행 화면(AC-1c 여덟 화면)을 두 장으로 더 그린다. 11절 표에 줄을 더하므로 13절 한 줄. 파일 수가 열을 넘는다(약 33) — 권함: 한 PR 에 두 검토 차례(원하면 c1 · c2 두 PR).
- 파. vocab 예문 검사: 검증기 밖이라 일회 검사로 한다. 경고 규칙으로 검증기에 더하는 일은 P8 시작 전 작은 고침(컨트롤러 판단). 13절 불필요.
- 하. P8 표본 시작: P6a 끝(규격 파일 오류 0) 뒤. 권함. 1단계 표본만 먼저 하려면 4~12단계 `reference-complete` 오류를 무시하는 걸러 보기가 필요하다. 13절 불필요.
- 거. design-reviewer 정의의 낡은 기준(누르는 곳 44px · 포스트잇 색 셋)을 4절(56 × 56px · 연두 회화)로 고친다(컨트롤러, `.claude/agents/design-reviewer.md`). 13절 불필요.

### 요청하는 공용 변경(컨트롤러가 합친다)

1. `biome.json` 의 `files.includes` 에 `"!seed/**/*.json"` 을 더한다(P4a 정할 것 ㅌ 'P6 전 컨트롤러가'). 6bd6015 에는 아직 없다(확인한 사실 12). 시드 JSON 은 검증기가 보고, 2,000행 JSON 을 Biome 꼴로 맞출 까닭이 없다.

### 제약

- 설계를 바꾸지 않는다. 정본과 다르게 해야 하면 위 '정할 것'에 올리고 컨트롤러가 13절에 한 줄 넣은 뒤 반영한다. H5 값은 요청자 확인 전에 '확정'이라 적지 않는다.
- 쓰기 1~3단계에 문장 생산 과제를 넣지 않는다(CLAUDE.md). 횟수로 단원 통과를 적지 않는다(can-do 에도). 1~3단계 회화 can-do 에 '보이는 영어를 읽는다'를 쓰지 않는다(T2).
- 숫자는 12절 키 · level_specs 칸 · `structure.ts` 상수 밖에 두지 않는다. 시드에 설계 숫자를 새로 만들지 않는다.
- 코드 · 정본 장을 고치지 않는다(curriculum-designer 정의 '앱 코드 · 설계 정본은 고치지 않습니다'). 하위 에이전트를 띄우지 않는다.
- 비밀값 · 아이 이름을 어디에도 적지 않는다. 예문의 이름은 Tori · Momo 같은 앱 안 이름이나 흔한 영어 이름만.
- 용어는 영역 · 단계 · 단원 · 활동 · 토막이다.
- 서브에이전트는 호출마다 model · effort 를 적는다. 동시에 2~3개(P5 · P9 · P6b · P6c 와 나눠 쓴다). 커밋은 요청자 지시 때만.

### P6 에 넘어온 메모(모두 위 규칙에 넣었다)

- P4a 검토: 줄임말은 vocab · 글로서리에 점까지 · `function` 표시는 주로 문법으로 쓰는 낱말만 · 금지어 목록에 활용형 꼴 함께 · 견본 Opus 캐시 값을 옮기지 않음.
- P4b 검토: 형태 표 정규식 낱말 경계(red · bed) · 활용형 칸에 불규칙형 · 축약형 · 줄임말은 점까지.
- plan-p02 다-7: 소수 · a.m. · 'd · `{NAME}` 앞뒤 빈칸 · `{NAME}s` 금지(예문은 `{NAME}` 을 아예 쓰지 않음).
- P3a: JSON null 을 뜻으로 쓰지 않음 · 수는 JSON 수로.
- C53: `speaking.answer_max_seconds.<구간>` 은 P6 가 H5 와 함께.

### 확인한 사실과 출처(2026-10-16)

| 번호 | 사실 | 출처 · 판 |
|---|---|---|
| 1 | 모델 가격(100만 토큰당 달러, 입력 · 5분 캐시 쓰기 · 1시간 캐시 쓰기 · 캐시 읽기 · 출력): Opus 5.5 4 · 5 · 8 · 0.20 · 20, Opus 5 와 Opus 4.8 5 · 6.25 · 10 · 0.50 · 25, Sonnet 5.5 2 · 2.50 · 4 · 0.10 · 10, Sonnet 5 2 · 2.50 · 4 · 0.20 · 10, Haiku 5.5(입력 10만 이하) 0.10 · 0.125 · 0.20 · 0.01 · 0.50, (넘으면) 0.50 · 0.625 · 1 · 0.05 · 2.50. 각주: Opus 5.5 · Sonnet 5.5 캐시 읽기는 기본 입력의 0.05배 | https://platform.claude.com/docs/en/about-claude/pricing (2026-10-16 받음) |
| 2 | `fallbacks: "default"` 는 거절 범주마다 Anthropic 이 권하는 대체 모델로 다시 보낸다. Haiku 5.5 는 서버 측 대체 모델 재시도가 없다. 허용 대체 모델 목록은 베타 헤더를 단 Models API 의 `allowed_fallback_models`. 2026-07-01 헤더에서 Sonnet 5.5 의 between_tools 요청이 Sonnet 5 로 넘어가면 disabled 로 돈다 | https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback (2026-10-16) |
| 3 | 생각 · effort: Opus 5.5 는 생각을 못 끄고 effort 기본 medium, Sonnet 5.5 는 disabled 400 · between_tools 는 high 이하 · 기본 high, Haiku 5.5 는 disabled 가 high 이하 · 기본 medium, Opus 5 는 disabled 가 high 이하, Sonnet 5 · Opus 4.8 은 disabled 받음, Opus 4.8 은 thinking 을 빼면 생각 없이 돈다 | claude-api 스킬 묶음(모델 표 캐시 2026-10-06) · 정본 6.1 표 |
| 4 | 2022 개정 기본 어휘 3,000. `*` 800 초등 권장, `**` 1,200 중학교 · 고등학교 공통과목 권장, 나머지 1,000 그 밖 과목. 출처 교육부 고시 제2022-33호 [별책 14] pp. 254-290. 목록 본문이 안내 PDF 안에 있어 글로 뽑힌다(pdftotext 로 `*` 819 · `**` 1,215 — 미국 · 영국 철자 쌍 포함). `*` 안 기능어 약 79 | 한국교육과정평가원 교과서검정연구기획단 'KICE Word Lister' 안내(경기도교육청 게시) https://www.goe.go.kr/resource/old/BBSMSTR_000000030136/BBS_202307111028067791.pdf |
| 5 | 저작권법 제7조 제2호: 국가 · 지방자치단체의 고시 · 공고 · 훈령은 보호받지 못하는 저작물(법률 제20358호 기준) — 교육과정 고시의 어휘 목록은 쓸 수 있다(부분 확인: 2차 출처, 국가법령정보센터 원문은 보지 않음) | https://www.nepla.ai 유권해석 모음 · 위키문헌 저작권법 |
| 6 | CEFR-J Wordlist: 연구 · 상업 목적 무료, 인용 조건(v1.5 설명). v1.6 공식 조건은 확인 못 함 | https://github.com/openlanguageprofiles/olp-en-cefrj |
| 7 | Twemoji: 태그 v17.0.3(b6b55fe), 그래픽 CC-BY 4.0(LICENSE-GRAPHICS), 코드 MIT(© 2014–2021 Twitter, © 2022– Jason Sofonia & Justine De Caires), 저작자 표시는 README · 'About' · HTML 소스의 언급도 받는다, jsDelivr `https://cdn.jsdelivr.net/gh/jdecked/twemoji@v17.0.3/assets/svg/<코드>.svg` 가 200(1f34e 446바이트), npm `@twemoji/api` 17.0.3 'MIT AND CC-BY-4.0' | https://github.com/jdecked/twemoji · api.github.com tags · raw LICENSE · LICENSE-GRAPHICS · README · `npm view` |
| 8 | CC BY 4.0 2(a)(4): 매체 · 형식에 필요한 기술적 바꿈 허용 | Twemoji LICENSE-GRAPHICS 155줄 |
| 9 | OpenMoji 17.0.0 은 CC-BY-SA-4.0(묶음 밖, SA) | `npm view openmoji license` |
| 10 | Openclipart 는 CC0 1.0(공식 공유 쪽 보관본, 2026 판은 확인 못 함) | https://web-archive.nli.org.il/National_Library/mp_/https://openclipart.org/share |
| 11 | P4 코드(6bd6015): 규격 파일 열이 다 있어야 한다(없으면 `reference-missing`, 일곱은 종료 2). level_specs 48 · unit_specs 242 완전성은 늘 본다. 단원 단어 수 = unit.vocab_count.<구간>, 단원 단어 단계 = 단원 단계(단원 0 은 1 이하), 한 영역 안 겹침 오류. 그림 파일 꼴 `images/vocab/<키>.(png|webp|jpg)`, license `cc0 · cc_by · generated`, cc_by 는 attribution 필수. 설정 키 정규식 `^[a-z][a-z0-9_]*(\.[a-z0-9_-]+)+$`, 값은 수 · 글 · 참거짓 · 수 목록 · 글 목록 · 글→수 사전. can-do 숫자는 규격 JSON 의 숫자 모음과 견준다 | `src/core/seed/{schema/reference.ts,reference-index.ts,validate.ts,check-cross.ts}` · `scripts/seed-validate.ts` |
| 12 | 6bd6015 의 biome.json 에 `!seed/**/*.json` 이 없다. 저장소에 `public/` · README 가 없다 | `git show 6bd6015:biome.json` · `git ls-tree 6bd6015` |
| 13 | 워크트리 바탕(024a4bc 갈래)의 specs/ 는 문서 브랜치 끝(d55ead3)보다 낡았다(5절 · 6.1 · 13절 등 네 파일) | `git diff --stat 6bd6015 d55ead3 -- specs/` |
| 14 | 12절 표는 121행, 바꾸는 곳은 고급 82 · 시드 18 · 결정 기록 먼저 18 · 기본 2 · 첫 실행 화면 1 | `specs/09-설정값.md` 13~133줄 |
| 15 | `pnpm -s` 로 부르면 pnpm 머리줄 없이 JSON 만 나온다(추측, jq 필터 전제) | — |
| 16 | 목업 캔버스는 Design 아티팩트(판 1792072875-98aa)다. `project/` 아래 `.dc.html` 21장과 `canvas.json`(판 21 · 행 제목 메모 4). 저장소 `docs/media/mockups/` 에는 같은 21장이 있고 `canvas.json` 은 없다. B_Reading(9834 대 9822) · B_Sticky(13180 대 13168)가 캔버스와 바이트 수가 다르다. 목업에 `{{ }}` · `sc-for` · `dc-import` 가 없고, 머리의 `./support.js` 는 저장소에 없다 | `Artifact` list(files) · read(`project/canvas.json` · `SKILL.md`) · `ls -la docs/media/mockups` · grep |

## 증명 (Proof)

이 plan 은 AC 시험을 더하지 않는다(spec-trace missing-test 58 그대로). AC-7a · 7c 의 실데이터 몫은 이 규격 파일이 검증기를 통과하는 것으로 보인다(묶음 plan 배정표 P6 행).

| 무엇 | 증명 | 파일 · 명령 |
|---|---|---|
| 규격 파일 완전성 · 정합 | `pnpm seed:validate` 종료 0, 첫 줄 '… 실패 0 · … · 규격 파일 오류 0', `--json` 의 `summary.referenceErrors` 0 · `failed` 0 · `can-do-numbers` 경고 0 | `pnpm seed:validate` · `pnpm -s seed:validate --json \| jq '.summary'` |
| 묶음 중간 | 필터 명령 0 | 작업 순서 머리의 jq 두 줄 |
| 설정값 12절 대조 | 12절 표를 펼친 키 모음 = settings.json 키 모음(정할 것 라의 넷 빼고), 값 = 기본값(H5 키 · answer_max_seconds 빼고) | 일회 검사(근거 문서 (8)), design-reviewer 가 다시 돌림 |
| 단계표 대조 | level_specs 48행이 3.3 · 6.3 · 3.6 과 줄마다 같다 | design-reviewer 1차 보고 |
| 어휘 | 단계마다 내용어 수 = 단원 단어 수 × 5, 출처 표시 비율, 예문 일회 검사 0, 표본 10% 의 뜻 · 예문 · 활용형 · 품사 | 일회 검사 · design-reviewer 보고 |
| 형태 표 · 금지어 정밀도 | 시험 문장 표를 `formsIn` · `forbiddenHits` 로 돌린 결과가 기대와 같다 | 근거 문서 (4) · (5), design-reviewer 가 다시 돌림 |
| 검토 | design-reviewer 1차 · 2차(심각도 Critical · Important · Minor · 근거: 문서 절 · 줄, 외부 사실은 출처) Approved | `.superpowers/sdd/2026-10-16-1-가-구현/review-p06a.md` · `review-p06a-2.md` |
| 공통 | `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` 0, `pnpm spec:trace` missing-test 58 | 작업 7 |

design-reviewer 점검표. 1차: level_specs 48행(3.3 · 6.3 · 3.6) · can-do 48(숫자 · 이웃 단계 차이 · 근거 줄) · settings(12절 대조 다시 · H5 값 · 관계 표) · model-prices(확인한 사실 표) · 1~3단계 내용어(수 · 출처 · 단원 주제 겹침 · 학습 요소 = 3.6 · 배정 차례 · 쓰기 1~3 철자 패턴 · 읽기 1~2 그림 낱말 비율) · 알파벳 대표 낱말 · 기능어 목록과 단계 · vocab 표본 · forms(1~3) · forbidden · homophones. 2차: 4~12단계 같은 항목 · 누계(3.4 또는 H5 뒤 값) · 단계 사이 난도 오름 · `**` 출처 · 형태 표 120 요소 검출 표 전체 · 마지막 검증 출력.

## 완료 보고 (Done)

구현 뒤 채운다.
