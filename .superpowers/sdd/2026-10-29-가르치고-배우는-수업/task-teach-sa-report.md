# 구현 보고: 가르치고 배우는 수업 묶음 사(되짚기 마무리 줄) — 2026-10-30 02:3x, 구현자 Opus · high — DONE_WITH_CONCERNS

워크트리 p13d 커밋 전 변경 위, 커밋 안 함. attempt.ts · judge.ts · spare-outcome.ts · spares.ts · 화면 파일은 읽기만 했다.

## 바뀐 파일
- `src/core/session/recap.ts`(신규): recapItemsOf · recapLineOf. 입력은 { lesson, activities, finals(활동 번호 → 첫 끝 시도), ctx(OutcomeContext), settings { minEvidence, canRatio } } 이다. 출력은 { line: "closeKo" | "closeKoPracticed", evidence: { valid, done, ratio(유효 0 이면 null) } } 이고, teach 없는 수업은 undefined 다.
- `src/server/session/result.ts`: recapOf 를 더하고 ResultView 에 선택 칸 `recap?` 하나를 실었다. sessionContextOf · scoringOf · firstFinalsOf 로 세션 서버와 같은 차례 · 맥락을 쓴다. 문턱은 설정 lesson.recap_min_evidence · lesson.recap_can_ratio 에서 읽는다. 쓰기 draft 세션은 싣지 않는다.
- `tests/unit/session-recap.test.ts`(신규): AC-6g 시험 11개.

## 판정 규칙(teach.goals 첫 값에 goal 이 닿는 혼자 문항, 따라 말하기는 repeat.goal)
| 결과 | 조건 |
|---|---|
| 독립 해냄 | 첫 시도 맞음(soloOutcomeOf), 또는 첫 시도 틀림 + 짝 첫 시도 맞음(spareOutcomeOf). 센 시도에 도움이 없어야 한다 |
| 도움 해냄(분자 밖) | 센 시도에 aid.readAloud 나 뜻 보기(gloss 하나 이상)가 있거나 judge.communicative 가 참. judge 가 없는 질문은 judgeSpeakingQuestion 으로 가른다 |
| 해내지 못함(분모 안) | 짝도 틀림, 짝이 없음, 상한 때문에 짝 시도가 없음 |
| U(분모 밖) | 첫 시도 없음 · 건너뜀 · 'AI 쉬는 중' · techError · 판정 없는 AI 질문, 또는 낸 짝을 판정하지 못함 |

## 설계와 다르게 한 것
1. 상한 때문에 짝을 못 낸 문항은 분모에 남기고 해내지 못함으로 셌다. 브리프 표는 '분모에서 뺌'이지만 정본 AC-6g · 03 세션 결과 행 · spec 설계 5 · 표본 3판이 모두 '독립 해냄이 아니다'라서 정본을 따랐다.
2. 입력 꼴은 브리프 제안({ goals, attempts, settings })과 다르다. goal 연결 · 짝 판정에 수업 내용과 활동 차례가 필요해서 sparesFromFinals 와 같은 꼴로 받는다.
3. 낸 짝이 U 면 그 문항도 U 로 뺐다. spec 에 없는 판단이다.
4. 결과 자료에는 줄 이름과 근거만 싣는다. 줄 글(teach.recap) · 문장 틀은 라-4 몫으로 남겼다.

## 시험(session-recap, AC-6g) · 관문(p13d 02:30)
- 시험 이름: 문턱 설정 존재, 모두 맞힘과 짝으로 되찾음 → closeKo, U 빼고 하나 → practiced, 유효 모자람 · 모두 U, 읽어 주기 · 뜻 보기, 'Yes, they do.', 상한으로 못 낸 짝, 낸 짝 U, 문턱 설정값, 첫 목표만 셈, teach 없음. 문턱 · 상한은 seed/settings.json 에서 읽는다.
- lint 종료 0(504 파일). tsc 종료 0. test 종료 0(114 파일 · 1296 통과 · 6 todo). check:deps 종료 0. check:ids 종료 0(design-number 47 · fixture-setting 0, 이 묶음 파일 경고 0). spec:trace 종료 0(unknown-ac 0 · missing-test 16).

## 요청하는 변경 · 우려(3)
1. 요청: `tests/fixtures/settings.ts` 에 lesson.recap_min_evidence · lesson.recap_can_ratio(seed 값 2 · 0.8)를 더해야 한다. 통합 시험 'AC-3e 가르치는 수업 짝'이 teach 수업으로 loadResultView 를 부른다. 키가 없으면 SettingMissingError 로 CI 에서 실패한다.
2. result.ts 의 recapOf 는 Postgres 에서 돌려 보지 못했다(통합 시험 없음, CI 첫 실행에서 확인).
3. 1~2단계 앱 판정 질문에서 judge 가 없으면 의사소통 정답을 judgeSpeakingQuestion 으로 가른다. 맞음 판정(questionResult)과 기준이 다를 수 있으나, 지금 teach 수업은 3단계뿐이다.
