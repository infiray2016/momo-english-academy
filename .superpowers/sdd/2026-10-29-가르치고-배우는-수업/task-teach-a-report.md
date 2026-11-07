# 구현 보고: 가르치고 배우는 수업 묶음 아(수업 설계 지표 · 보고 명령) — 2026-10-30 01:3x, 구현자 Opus · high

상태 DONE_WITH_CONCERNS. 워크트리 p13d 커밋 전 변경 위에 새 파일 셋과 package.json 한 줄만 더했고 커밋하지 않았다. 세션 코어(attempt · preview · spares)는 읽기만 했다.

## 바뀐 파일
- `src/core/session/teach-metrics.ts`(신규): TEACH_SLOTS(:32, today · show · together · solo · spare) · slotOfActivity(:42) · spareOutcomeOf(:178) · togetherOutcomeOf(:306) · secondsSummary(:359) · teachMetricsOf(:380) · teachMetricsBy(:545).
- `scripts/teach-metrics.ts`(신규): parseTeachMetricsArgs(:76) · formatTeachReport(:203) · loadTeachSessions(:255, 개발 DB 읽기) · main(직접 실행 때만).
- `package.json`: `teach:metrics`(node --conditions=react-server --env-file-if-exists=.env.local --import tsx).

## 입력 · 출력 꼴
- 입력 MetricSession: profileNo(번호만) · lessonRef { id, area, level, unit, lessonNo } · lesson(수업 시드) · activities(activitiesOf) · startedAt · attempts { activityNo, input, attemptedAt } · ctx(OutcomeContext, 서버 scoringOf 와 같은 값).
- 출력 TeachMetrics: sessions · skippedSessions(teach 없는 세션) · selfDone { hits, total, unscored, missing, rate } · soloFirst · togetherFirst(Ratio) · slotSeconds(자리마다 세션별 초) · items(같이 해 보기 · 혼자 · 짝 문항별 Ratio, 세션을 넘어 합침).
- 첫 시도는 활동마다 가장 먼저 저장된 끝 시도의 첫 시도다. 혼자 문항은 soloOutcomeOf 를 그대로 쓰고, U 는 분모에서 빼 unscored 로 센다. 짝 시도가 없는 틀린 문항은 missing 이다.
- 묶음은 teachMetricsBy(sessions, "area" | "level" | "unit" | "lesson" | "profile") 이다.

## 명령 사용법
`pnpm teach:metrics [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--areas reading,writing,speaking] [--levels n|n-m] [--by area|level|unit|lesson|profile] [--items]`. 출력은 markdown 표 셋(묶음별 지표 · 자리별 시간과 lesson.slot_seconds_max 상한 · 문항별)이다. 아이 이름 · 프로필 id · 수업 id · 접속 문자열은 내지 않는다. 이 Mac 에서는 돌리지 않았다.

## 시험(tests/unit/teach-metrics.test.ts, 정본 AC-22o, 3단계 단원 1 정규 시드 셋 + 합성 시도)
'AC-22o 수업 설계 지표' 열하나(스스로 해냄 · 문항별 첫 시도 · 같이 해 보기 세 영역 · 말하기 같이 해 보기 틀림 · 쓰기 해냄 · U 제외 · missing · 자리별 시간 · 빈 입력 · teach 없는 세션 · 묶음 다섯)와 'AC-22o 수업 설계 지표 보고' 둘(인자 · 표에 프로필 번호만).

## 관문(p13d, 01:3x)
lint 종료 0(478 파일) · tsc 종료 0 · test 종료 0(107 파일 · 1203 통과 · 6 todo) · check:deps 종료 0(위반 없음) · check:ids 종료 0(design-number 49, 기준 49) · spec:trace --fail-on unknown-ac 종료 0(15절 AC 189 · unknown-ac 0 · missing-test 16 은 옛 plan P12 몫).

## 우려(5)
1. 같이 해 보기 시도 꼴의 읽는 법은 화면(라)이 아직 없어 이 묶음이 정했다. 쓰기 pieces 는 빈칸 차례의 카드 또는 온 카드 줄, 말하기 heard 는 허용 답 두 묶음과 speaking.answer_match_pass 로 본다. 대문자 단추처럼 맞출 칸이 없으면 시도가 하나일 때만 맞음이다. 라 · 다 가 꼴을 다르게 채우면 맞춰야 한다.
2. 스스로 해냄의 '맞힘'은 judge.final correct(의사소통 정답 포함)와 판정 칸 없는 질문 짝의 두 묶음 앱 판정이다. 되짚기의 독립 해냄(FR-7)보다 넓다. 의미 검사(다)는 판정 칸이 있을 때만 반영된다.
3. 자리별 시간은 시도 시각만 쓴다. 중단 뒤 이어 한 세션은 쉰 시간까지 들어가고, 되짚기(결과 화면)는 재지 못한다.
4. loadTeachSessions(DB 읽기)는 시험이 없다. 통합 시험이나 프리뷰 DB 첫 실행에서 확인해야 한다.
5. 함정 문항 표시가 시드에 없어 문항별 행에서 사람이 골라 읽는다(표본 Q2 · H4).
