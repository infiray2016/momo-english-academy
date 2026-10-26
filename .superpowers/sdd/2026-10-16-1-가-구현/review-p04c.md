Approved(C 0 · I 0 · M 4)

# 코드 검토: P4c 회화 · 평가 · 묶음 검사와 시드 검증 명령(code-reviewer rev-p04a · Opus · xhigh, 2026-10-16)

대상은 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a6ef72438a158a2f3`(브랜치 `feature/1a-p04c-seed-validate`)다. 범위는 미커밋 새 파일 아홉과 공용 변경 넷, 그리고 커밋 c3f6baf · f27ae15 안의 P4c 첫 일이다. 코드 파일:줄은 이 워크트리 기준이고, 정본 · plan 줄은 메인 저장소 기준이다. 첫 검토라 닫힌 장부는 없다.

확인 방법은 이렇다.
- 새 파일 아홉, 공용 diff 넷, 첫 일이 닿은 줄을 모두 읽었다. miniSeed 는 미커밋이 아니라 c3f6baf 의 builders.ts 안에 있다.
- `pnpm test` 를 한 번 돌렸다: 16 파일 · 159 통과.
- 실기는 miniSeed(넷 · through 1 · small)를 `tests/.tmp/seed-review` 에 쓰고 세 모드를 돌린 뒤 지웠다.
  - PR: 칸 172 · 통과 172 · 빈 칸 500 · 종료 0.
  - `--complete-through 1`: 빈 칸 0 · 종료 0.
  - `--complete-through 2`: 빈 칸 96 · 종료 1.
  - 보고의 값과 같다.
- 의심 다섯은 tsx 로 `runValidate` 를 직접 불러 재현했다.

## P4c 첫 일(커밋된 P4a · P4b 파일)

| 항목 | 판정 | 근거 |
|---|---|---|
| P4b M-1 칸 검사 준비 가름 | 고치는 법대로 | reference-index.ts:116 · 506 `ready`, check-lesson.ts:988 `reference-not-ready` 한 건, :264~272 배정표 없으면 비교 건너뜀. check-talk · check-assessment · validate 도 같은 가름을 쓴다 |
| P4b M-2 견본 형태 표 | 고치는 법대로 | builders.ts:1138~1146 낱말 목록, :1703 `under the bed` 되돌림, red 사례 시험 |
| P4b M-3 메시지 숫자 | 고치는 법대로 | check-lesson.ts:898 '단계 규격 questions.modelAnswer', 알파벳 · 단계 범위도 상수에서 읽음 |
| P4b M-4 보이는 낱말 = 허용 정답 | 고치는 법대로 | check-lesson.ts:622~636 `checkShownWord` 를 베끼기 · 만들기(:664) · 채우기(:676) · 받아쓰기 word · audioText(:724~725)에 건다 |
| WORD_BOX_MIN | 결정대로 | structure.ts:240 |
| C60 영어 값 | 결정대로 | structure.ts:209~ `today_words · more_talk …`, reference.ts:352 `cc0 · cc_by · generated` |

## 1. 설계 준수

- 회화 카드 검사 — 맞음. 규칙 열넷과 회화 몫 vocab-allocation 이 plan-p04c:36~52 와 1:1 이다(표 1).
  - 수업 공통은 role 일곱(tori · hint · child · pair · prompt · example · expression)으로 부르고, 배정은 hint · child · expression 으로 센다(check-talk.ts:26~40 · :681~687).
  - 단원 단위 둘은 정규 카드를 변형마다 묶는다(:731~779).
  - '대화 턴만'은 맞다(표 2 해석 3).
- 평가 검사 — 맞음, plan 밖 규칙 하나(M-3).
  - 평가 · 배치 지문에 범위 밖 · 글로서리를 걸지 않는다(check-assessment.ts:235~277 은 정답 · 그림 · 쓰기 채점 · 학습 요소 · 금지어만).
  - AI 과제 문항은 허용 단계 · 벌마다 TEST_AI_ITEMS_MAX · 번호가 벌 끝인지 본다(:389~403 · :435~441).
  - 겹침 정규화는 소문자 · 공백 · 끝 따옴표 · 끝 문장 부호다(:58~70).
- 묶음 검사 — 맞음. 여섯 규칙의 기준 · 심각도가 plan-p04c:86~93 과 같다.
  - 관계 선은 배정 함수(allocation)와 글 도구(lemmasOf)로만 뽑아 결정적이다(check-cross.ts:297~365).
  - 경고 id 는 `distribution:<영역>:<단계>:<지표>` 꼴이다(:498).
- validate.ts — 맞음.
  - `cellHash` 는 sha256 16진, 칸 키 + 줄바꿈 + 정규 JSON 이다. 맨 위 revision · correction · generation 을 빼고 키 사전 순 · 공백 없음이다(:103~137).
  - `itemsOf` 는 plan 표(회화 평가 장 = 턴 차례, 21:3x)와 같다. `solveTargets` · `solveStatus` 도 plan 표와 같다.
  - `expectedCells` 는 완전성 표 다섯 줄과 같다. 규격 파일 완전성은 `reference-complete` 로 늘 본다.
  - `validateSeed` 는 수업 파일 겉을 먼저 풀고 수업마다 풀어 깨진 칸만 실패로 센다. 경로 ↔ 겉을 대조하고 duplicate-cell 을 낸다.
  - `exitCodeOf` 는 모드 표와 같다.
- 명령 — 맞음, 요약 줄 하나(M-1)와 설정값 범위 하나(M-2).
  - 인자 다섯, 종료 0 · 1 · 2 를 다룬다. 첫 줄 · 다음 줄 꼴과 `--json` version 1(+ ranges)도 있다.
  - 순수 함수 + `isDirectRun` 꼴이고, tsx 띄우는 시험은 셋이다.
  - API 0회 시험은 가져오기 그래프를 실제로 걸어 sdk · http · https · net 과 `fetch(` 를 본다.
- 공용 변경 — 맞음.
  - `seed:validate` 한 줄과 ci.yml 은 plan-p04c:212~233 글자대로다(준비 네 줄 · 단계 `if: hashFiles(...)`).
  - `core-no-io` 는 fs · fs/promises · child_process · http · https · http2 · net 을 막고 crypto 를 허용한다. 막는 예 셋(node: 있고 없고)과 허용 예 하나를 시험이 고정한다.

## 2. 잘한 점

- P4b 지적 넷을 '고치는 법' 그대로 고쳤다. 준비 가름(`ready`)은 P4c 의 모든 칸 검사 입구에 같은 꼴로 걸렸다.
- 시험이 경계 짝을 지킨다.
  - 같은 질문 2번 통과 · 3번 거부, 수업과 같은 질문 3개 통과 · 4개 거부.
  - AI 과제 맨 끝 둘 통과 · 셋이나 앞자리 거부, 분포 폭 절반 그대로 통과 · 넘으면 경고.
  - 사람 확인 '정답 맞음'은 통과이고, 내용을 바꾸면 unchecked 다. 판 · 생성 기록만 바꾸면 해시가 그대로다.
- 해시 시험이 견본 기록의 `contentHash` = `cellHash` 를 직접 단언해 P5 약속을 고정한다(seed-validator-distribution.test.ts:182~202).
- dependency-cruiser 가 `node:` 접두를 떼고 적는다는 (추측)을 임시 프로젝트로 확인하고 시험으로 고정했다(dependency-rules.test.ts 더한 둘).
- 숫자는 설정값 · 단계 규격 · structure.ts 상수에서만 온다. 메시지의 '0' · '1번'은 구조 뜻이다.
- src 새 파일은 Date · fs · fetch 가 없고, `node:crypto` 는 validate.ts 한 곳뿐이다. 한글 식별자도 없다.

## 3. 지적

### M-1 Minor — 칸 키가 없는 오류(파일 · 단원 단위)만 있으면 요약 줄이 '실패 0 · 규격 파일 오류 0'인데 종료는 1 이다

- 어디: scripts/seed-validate.ts:113~116(요약 줄), validate.ts:1006~1020(summary).
- 재현: 읽기 단계 평가 파일 문항 하나에 모르는 키를 넣으면 `칸 167 · 통과 167 · 실패 0 · 빈 칸 505 · … · 규격 파일 오류 0` 에 종료 1 이다. 오류 줄은 그 아래에 있다. talk-known-days 같은 단원 단위 오류만 있을 때도 같다.
- 근거:
  - plan-p04c:138 의 첫 줄은 사람이 결과를 한눈에 읽는 줄이다.
  - plan-p04c:137 '다른 파일이 JSON 이 아니면 그 파일 칸 전부 json 오류(1)로 센다'와도 다르다. 지금은 오류 한 줄(cell null)이고, 그 파일 칸은 실패가 아니라 빈 칸으로 빠진다.
  - 종료 코드는 맞으므로 막는 결함은 아니다.
- 고치는 법: 첫 줄 끝에 '그 밖 오류 n'(cell 이 null 인 오류 수)을 더하고 JSON summary 에도 같은 칸을 더한다(더하기만이라 version 1 유지는 P8 과 확인). 또는 plan-p04c:137 · 138 을 지금 동작대로 고친다.

### M-2 Minor — `seed.complete_through_level` 의 범위를 보지 않아 0 이면 완전성 모드가 0 으로 끝난다

- 어디: scripts/seed-validate.ts:180~195(`--complete-through settings`), validate.ts:998~999(PR 모드).
- 재현: 값을 0 으로 두면 `--complete-through settings` 와 PR 모드 둘 다 '빈 칸 0'에 종료 0 이다. 99 는 12 로 잘려 빈 칸 1116 · 종료 1 이다.
- 근거: plan-p04c:137 '조용히 0 으로 끝나지 않는다'. 명령 인자 `--complete-through n` 은 1~12 정수만 받는데(seed-validate.ts:76) 설정값 경로만 열려 있다. P7 의 main · 개발용 적재가 이 경로를 쓴다(11절 (4-1)).
- 고치는 법: 설정값이 1~12 정수가 아니면 `--complete-through settings` 는 종료 2 로 둔다. P4b 정합 `settings` 에도 범위 한 줄을 더한다.

### M-3 Minor — 말하기 단계 평가에서 '질문 답이 없는 단계'의 question 문항을 막는 규칙이 plan 표에 없고 6.3 과 어긋난다

- 어디: check-assessment.ts:322~324.
- 근거:
  - plan-p04c:69 level-test-type 의 말하기 기준은 'question(acceptedMin > 0 단계는 허용 답 필수)'뿐이다.
  - 6.3 단계 평가 행(06-시드-생성.md:32)은 'AI 과제 문항(쓰기 4단계 이상 작문 · 말하기 질문 답 · 발표)은 … 말하기 9단계 이상에서 평가 전체에 2개까지'라, 9~12단계 평가의 AI 질문 문항을 허락한다.
  - 지금은 그 문항이 늘 level-test-type 오류다. 7~12단계 평가는 2차라 지금 막히는 시드는 없다.
- 고치는 법: 이 갈래를 지운다. 또는 컨트롤러가 13절 한 줄로 '말하기 평가의 질문 문항은 수업에 질문 답이 있는 단계만'을 정하고 plan 표에 적는다.

### M-4 Minor — `validateSeed` 한 함수가 498줄이고 칸 목록을 밖으로 내지 않는다

- 어디: validate.ts:531~1028.
- 근거: plan-p04c 위험 5 · 11 — P5 풀이 검사는 칸 · 해시 · 문항 번호 · 풀이 대상에, P7 적재는 칸 키에 기댄다. 지금 칸(키 · 종류 · 값) 모음은 `validateSeed` 안의 지역 변수라, P5 · P7 이 파일 걷기 · 규격 풀기 · 칸 키 만들기를 다시 짜야 한다. 두 벌이 생기면 해시 대상 객체가 어긋날 수 있다.
- 고치는 법: '파일 묶음 → 규격 파일 · 칸 목록(SeedCell[])'을 `collectCells` 같은 함수로 나눠 내보내고 `validateSeed` 가 그것을 부르게 한다. P5 착수 전이면 된다.

## 표 1. 검사 규칙

| 규칙 | 판정 | 근거 · 메모 |
|---|---|---|
| talk-shape | 맞음 | check-talk.ts:75~135 |
| talk-turns | 맞음 | :137~163 |
| talk-hints | 맞음 | 턴 · 더 이야기할 거리의 영어 틀 있고 없음, 힌트 단 = ko 밖 단 수, 쓸 수 있는 말 수(:165~211) |
| talk-pairs | 맞음 | 인사 · 대화 턴에 있고 더 이야기할 거리엔 없음, 낱말 수 같고 한 자리만 다름(:213~218), 처음 묻는 턴 답에 새 단어 |
| talk-first-ask | 맞음 | 새 단어마다 처음 묻는 턴, 새 단어만 노림, 자리 ≤ ⌈대화 턴 ÷ 2⌉, 영어 문장 힌트에 새 단어, 다지기 · 보강엔 없음(:295~355) |
| talk-targets | 맞음 | 1~2개 · 단원 단어 안 · 질문에 노리는 단어 원형 없음 |
| talk-same-question | 맞음 | 인사 · 대화 턴 · 더 이야기할 거리 · 질문 목록 합쳐 소문자 · 공백 정리 |
| talk-more | 맞음 | 단계에만, talk.more_talk_turns, 모두 re_ask, 노린 단어 안 |
| talk-images | 맞음 | turnImages 단계에만, 카탈로그 |
| talk-ko | 맞음 | 정리 · 안전 · 끝인사 · '새 이야기' 끝인사, 질문 목록 카드의 첫 말 |
| talk-today | 맞음 | 모음 = newWords, practice 면 exampleKo, TALK_TODAY_TOPICS |
| talk-missions | 맞음 | |
| talk-first-question | 맞음 | |
| talk-placeholder | 맞음 | 모든 조각 |
| vocab-allocation(회화) | 맞음 | role hint · child · expression |
| talk-again-slots | 맞음 | 대화 턴만, 4단계부터 '그 카드에서 처음 노리는 새 단어'만 처음(정할 것 ㅈ), approxGe |
| talk-known-days | 맞음 | 서로 다른 정규 수업 수 |
| level-test-count | 맞음 | 벌 번호 겹침은 같은 칸 키로 duplicate-cell 이 잡는다 |
| level-test-unit-count | 맞음 | 다 찬 벌만, 나누어떨어지지 않으면 settings |
| level-test-type | 어긋남(M-3) | 말하기 질문 없는 단계의 question 금지가 plan 밖 |
| level-test-ai | 맞음 | |
| level-test-mix | 맞음 | testMix 있을 때만 |
| level-test-forms-overlap | 맞음 | 지문 · 질문 · 낱말 · 보기 · 카드 · 타일 서명(해석 6) |
| level-test-passage-overlap | 맞음 | 지문 · 듣기 문장, 정규화 |
| level-test-item-overlap | 맞음 | 질문이 있는 문항만(해석 6) |
| talk-test-count | 맞음 | |
| talk-test-unit-count | 맞음 | |
| talk-test-allowed | 맞음 | 셋 이상, 예 · 아니오 질문은 yes · no 시작 답 둘 다 |
| talk-test-ko | 맞음 | |
| talk-test-lesson-overlap | 맞음 | 같은 글 > MAX 또는 같은 차례 > RUN_MAX |
| talk-test-forms-overlap | 맞음 | |
| placement-count | 맞음 | 단계 겹침 · 번호 범위 · 예비 문항은 말하기 · listening 만 |
| story-count | 맞음 | |
| story-ko | 맞음 | 학습 요소는 회화 구간 첫 단계 · 'story'(P4b 검토 메모대로) |
| topic-variants | 맞음 · 오류 | 새 단어 모음 + 분량 서명 |
| remedial-coverage | 맞음 · 오류 | role 아홉, 다 찬 변형만, 답하는 대상 단어 수 보고 |
| relation-early-use | 맞음 · 경고 | |
| relation-not-reused | 맞음 · 경고 | 다지기가 있는 변형만 |
| distribution | 맞음 · 경고 | 폭 셋 · id 꼴 · 종료 코드 그대로 |
| can-do-numbers | 맞음 · 경고 | revision · correction 숫자는 뺀다 |

## 표 2. 해석 13 · 남은 우려

| 항목 | 판정 | 근거 |
|---|---|---|
| 해석 1 회화 평가 장 문항 번호 = 턴 | 수용(컨트롤러 21:3x) | 5절 '(장, 턴)', plan 표 고침 |
| 해석 2 4단계부터 첫 말이 문항 1 | 수용 | plan '인사 → …'의 인사 자리가 4단계부터는 첫 말이다. 신고는 회화 마무리 첫 장에서 받으므로(6.3) 첫 말도 고를 대상이다 |
| 해석 3 다시 묻는 턴 자리는 대화 턴만 | 수용(판정 요청) | 3.2 관계 표 셈(02-1-영역-단원-승급.md:71 '배정 6 × 8~9 + 다지기 4 × 13~14')이 목표 턴에서 인사를 뺀 대화 턴만 센다. 더 이야기할 거리는 아이가 고를 때만 쓰여 자리로 보장되지 않는다(3.3 말 표 '더 이야기할 거리' 줄). AC-15m 의 '다시 묻는 턴 자리'와도 맞다 |
| 해석 4 단원 단위 오류의 cell null | 수용(판정 요청) | P8 은 `file`(lessons/<영역>/<단계>/<단원>.json) · `path`(`variant.<n>`) · `rule` 로 범위를 안다. P8 브리프 메모: talk-again-slots · talk-known-days 는 그 변형의 정규 카드, remedial-coverage 는 그 변형의 보강 수업, 파일 단위 schema · json · path 는 그 파일을 다시 만든다 |
| 해석 5 다 찬 변형만 덮기 · 답하는 대상 최솟값 | 수용 | 덜 찬 변형은 완전성이 센다 |
| 해석 6 겹침 서명 | 수용 | 질문 · 보기가 없는 문항은 '같은 질문 · 보기 묶음'이 성립하지 않는다 |
| 해석 7 이야기 학습 요소 | 수용 | P4b 검토 메모(구간 첫 단계 · 'story') 그대로 |
| 해석 8 `--areas` 가 검사 대상도 거름 | 수용(컨트롤러 21:3x) | PR · main 은 인자 없이 넷 다 본다 |
| 해석 9 stats.ranges · version 1 | 수용(컨트롤러 21:3x) | 더하기만이다 |
| 해석 10 일곱 밖 규격 파일 없음은 1 | 수용 | plan 은 2 를 일곱에만 정했다. 조용히 0 은 아니다 |
| 해석 11 PR 의 completeThrough = 설정값 | 수용 | plan-p04c:134. 설정값 범위는 M-2 |
| 해석 12 miniSeed through 1 만 | 수용(남은 우려) | plan 작업 4 의 완료 판정이 through 1 · small 이다 |
| 해석 13 관계 '나옴' role | 수용 | 보강 덮기와 같은 role, pair 는 들려주는 답이라 뺌 |
| 남은 우려 1 2단계 이상 꼴의 묶음 검사 | 기록 | plan 위험 1, P8 첫 묶음에서 잼 |
| 남은 우려 2 예 · 아니오 판별 어림 | 기록 | plan 위험 6 |
| 남은 우려 3 관계 경고 0건 | 기록 | plan 위험 10, 스킬 8단계 |
| 남은 우려 4 회화 평가 장 번호 | 닫힘 | 컨트롤러 21:3x 수용, plan 표 고침 |
| 남은 우려 5 validate.ts 1039줄 | 고칠 것(M-4) | |

## 표 3. 증명 표 행

| 행 | 시험 |
|---|---|
| AC-7a | 있음(7) seed-validator-complete.test.ts:90 · 103 · 124 · 136 · 164 · 175 · 186 |
| 6.4 평가 · 배치 · 이야기 | 있음(6) seed-validator-complete.test.ts:225 · 256 · 320 · 378 · 454 · 475 |
| AC-7d | 있음(5) seed-validator-distribution.test.ts:73 · 104 · 146 · 165 · 206 |
| 6.4 묶음 · 관계 | 있음(4) seed-validator-distribution.test.ts:252 · 276 · 303 · 341 |
| AC-15m(1-나 단위 몫) | 있음(9) seed-validator-talk.test.ts:56 · 69 · 81 · 99 · 113 · 123 · 135 · 146 · 166 |
| 6.4 회화 시나리오 카드 | 있음(4) seed-validator-talk.test.ts:185 · 206 · 232 · 264 |
| 명령 | 있음(5) seed-validate-cli.test.ts:56 · 71 · 96 · 140 · 157 |

이름 40개가 plan 증명 표와 글자 그대로 같고, 더한 이름은 의존 규칙 둘뿐이다. miniSeed(through 1 · small) 오류 0 · 빈 칸 0 은 'AC-7a 완전성: 시험용 시드가 1단계까지 …'가 고정한다. 2단계 이상 꼴은 견본 단위 시험으로만 덮였다(남은 우려 1).

## P8 · P5 에 넘길 메모

- P8: 위 해석 4 의 되돌리기 범위를 적는다. `errors[].cell` 이 null 이면 `file` · `path` · `rule` 로 범위를 정한다.
- P5: 해시 대상 객체는 수업 칸 = 수업, 평가 문항 칸 = 문항, 회화 평가 칸 = 장, 배치 칸 = 문항, 이야기 칸 = 이야기 하나다(보고 'P5 · P7 · P8 이 쓸 것'). M-4 를 고치면 그 함수를 쓴다.

## 4. 판정

Approved(C 0 · I 0 · M 4). 막는 결함은 없다. M-1 · M-2 는 한두 줄이고 '조용히 0' 원칙에 닿으므로 커밋 전에 넣으면 싸다. M-3 은 컨트롤러가 plan 대로 지울지 13절로 정할지 고른다. M-4 는 P5 착수 전에 나누면 된다.
