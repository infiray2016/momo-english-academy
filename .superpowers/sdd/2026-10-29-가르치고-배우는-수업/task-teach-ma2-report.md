# 구현 보고: 가르치고 배우는 수업 묶음 마-2, 선생님 고르는 때 당기기 · 첫 화면 읽어 주기 잠금 풀기(2026-10-30 04:1x, 구현자 Opus · high)
상태: DONE_WITH_CONCERNS. 워크트리 p13d이고 커밋은 하지 않았다. 회화 틀(`src/components/conversation/*`) · TeacherChoice 조각 · 선생님 고르기 액션 · 라-1 조각 · speaking.tsx · repeat.tsx · result.ts · result-view.tsx · attempt.ts · 시드 · specs · globals.css · `tests/.tmp/l3-samples` 는 손대지 않았다.

## 바뀐 파일(p13d 기준 줄)
- `src/app/(child)/session/[id]/session-frame.tsx`: 머리 주석 :32~34 · TeacherChoice 가져오기 :126 · openingScreenOf 가져오기 :139 · 선생님 고르기 자리 :1532~1554. 여는 차례만 고쳤다. 고르기 화면은 firstLine 감싸기 뒤, 쉼 · 막힘 덮어쓰기 앞에 두어 막힘 → 쉼 → 고르기 차례를 지킨다. 조각은 `TeacherChoice`(choices · speech · rate=speakRateOf · onChosen=router.refresh) 그대로이고, 큰 단추가 조각 안에 있어 틀의 '다음'은 숨긴다(ownButtons). 활동 조각 · 짝 자리 · 진행 막대는 그대로다
- `src/server/session/index.ts`: 가져오기 :90~94 · SessionView.teaching 꼴에 teacherChoices :1226~1232 · 채우기 :1600~1605. 고른 선생님이 없을 때만 `teacherChoicesOf(rosterOf(), profile)`(회화 view 와 같은 식)이고 있으면 빈 목록이다. 시도 저장 길 · 다른 칸은 그대로다
- `src/core/session/teach-frame.ts`: 머리 주석 :10 · OpeningScreen · openingScreenOf :58~83(순수 — 막힘 → 쉼 → 고르기 → 수업)
- `src/app/(child)/[area]/lessons/use-lesson-start.ts`: 머리 주석 :15~17 · 가져오기 :20 · start 의 첫 await 앞 :100~101 `unlockSpeechInDocument()`
- 신규 `src/lib/speech/unlock.ts`(47줄): unlockSpeechInDocument(target = window). 음성 층에 문서 단위 잠금 풀기가 없어서(있는 것은 음성 접점마다의 unlockFromGesture) 함수 하나만 더했다. 소리 없는 글 · 크기 0 은 browser.ts 와 같은 값이고, API 가 없거나 던지면 false 로 삼킨다. 발화 결과 · 감시 · 접점 상태는 건드리지 않는다
- 시험: `tests/unit/teach-frame.test.ts`(teachView 기본 teaching 에 teacherChoices: [] · 새 묶음 :569~ 여섯) · 신규 `tests/unit/lesson-start.test.ts`(넷) · `tests/e2e/teacher-choice.spec.ts`(머리 주석 · 가져오기 · 새 묶음 :~420~ 셋, 정적) · `tests/e2e/teach.spec.ts`(atTeachLevel :96 — 집이 미나를 이미 고른 채, 네 시험이 씀)
- 장부: `ledger-open.md` L-2 행에 음성 점검 항목(아래 우려 1)을 더했다

## 설계와 다르게 한 것
1. teacherChoices 를 화면 자료 맨 위가 아니라 `view.teaching` 안에 두었다. teach 없는 수업은 teaching 이 null 이라 칸 자체가 없고, 조건(정한 것 1)이 한 자리에 모인다. 꼴은 회화 view 와 같다(TeacherView[], 고른 선생님이 있으면 빈 목록).
2. 보일 선생님이 하나도 없으면(명단 · 이름 거름의 드문 경우) 고르기를 내지 않고 기본 초상으로 간다. 고를 수 없는 막다른 화면을 만들지 않으려는 것이다.
3. 고르기는 '지금 활동이 오늘 배울 것일 때'가 아니라 'teach 수업이고 고른 선생님이 없을 때' 언제나 먼저 나온다. 새 세션에서는 오늘 배울 것 앞과 같고, 마-2 전에 시작해 중간에서 이어 하는 세션도 선생님 없이 진행되지 않는다. 회화 틀(!view.teacher 면 고르기)과 같은 결이다. 활동 번호 · 시도는 바뀌지 않는다(e2e 가 data-activity-no 1 과 시도 0 을 본다).
4. 고르기 화면을 감싼 div 의 onClickCapture 에서 이 세션 음성 접점의 unlockFromGesture 를 부른다. 고른 뒤 router.refresh 로 그려지는 오늘 배울 것의 첫 줄이 새로 고침 · 이어 하기로 연 세션에서도 읽히게 하려는 보탬이다(정한 것 11 은 카드 누름만 정함). 조각은 고치지 않았다.
5. useLessonStart 는 수업 목록 · 홈 카드 · 결과 '다음 수업'이 함께 쓰므로 세 곳 모두에서 잠금 풀기가 불린다. 확인 쪽지 뒤 고르기 · 쉼 '다시 해 볼래요'도 누름 안이다.
6. 소리 없는 글 · 크기 상수는 browser.ts 를 고치지 않으려고 unlock.ts 에 같은 값으로 다시 두었다(주석에 같은 값임을 적음).
7. 쉼이 고르기보다 먼저인 e2e 는 넣지 않았다. 읽기 · 쓰기 3단계 teach 수업은 AI 가 필요한 수업이 아니라 열 때 쉼이 켜지지 않는다. 차례는 순수 함수 시험과 세션 틀 그림 시험(aiResting 켬)이 본다.
8. plan 표의 `page.tsx` 는 고치지 않았다. 화면 자료는 loadSessionView 가 싣고 쪽은 그대로 넘긴다.
9. `tests/unit/lesson-start.test.ts` 는 없던 파일이라 새로 만들었다. 훅은 정적 그림으로 한 번 그려 start 를 꺼내고(상태 갱신은 서버 그림에서 무시됨), 잠금 풀기 모듈은 가짜로 바꿔 호출 차례를 본다.

## 시험(정본 AC 이름)
- 단위 teach-frame 여섯: 'AC-3i 고른 선생님이 없는 집의 가르치는 수업은 막힘 · 쉼이 없으면 …이고, 이미 골랐으면 묻지 않는다' · 'AC-3i teach 없는 수업은 고르기가 없고, 보일 선생님이 없으면 …' · 'AC-3i 막힘(말하기 마이크 못 씀) · 쉼이 고르기보다 먼저고 …' · 'AC-3i 세션 틀: 고른 선생님이 없는 집의 읽기 · 쓰기 가르치는 수업은 오늘 배울 것 앞에 …'(문구 넷 · 카드 · 활동 번호 1) · 'AC-3i 세션 틀: 이미 고른 집은 다른 영역 …' · 'AC-3i 세션 틀: 쉬는 중이면 …'
- 단위 lesson-start 넷: 'AC-3i 수업 카드를 누르면 첫 await 앞(누름 처리 안)에서 문서 단위 잠금 풀기를 한 번 부르고 …' · 'AC-3i 확인 쪽지에서 다른 수업을 고른 때(confirmAbort)도 …' · 'AC-N20 읽어 주기 API 가 있으면 소리 없는 글 하나(크기 0)를 읽고 true' · 'AC-N20 읽어 주기 API 가 없거나 … false'
- e2e(정적) teacher-choice.spec 셋: 'AC-3i 선생님을 고르지 않은 프로필이 읽기 가르치는 수업을 열면 … 쓰기 가르치는 수업을 처음 열 때는 다시 묻지 않는다'(teacher_key · 같은 활동 · 시도 0 · 다시 열기 · 사진 teach-teacher-choice) · 'AC-3i teach 칸이 없는 수업(적재된 1단계 시드 수업)은 …' · 'AC-3i 말하기 가르치는 수업은 마이크를 쓸 수 없는 기기면 … 막힌 안내가 먼저다'(seed/lessons/speaking/3/1.json 을 글자 그대로 넣음)
- e2e teach.spec 네 시험은 이름은 그대로이고 집만 미나를 고른 채로 바꿨다(고르기 화면 없이 오늘 배울 것부터)

## 관문(p13d, Node 24, 04:1x)
| 관문 | 결과 |
|---|---|
| pnpm lint(전체 biome) | 종료 0, 530 파일 |
| pnpm exec tsc --noEmit | 종료 0 |
| pnpm test | 124 파일 · 1465 통과 · 6 todo(바뀐 둘: teach-frame 23 · lesson-start 4 통과) |
| pnpm check:deps | 위반 0(272 모듈) |
| pnpm check:ids | 종료 0, 규칙 위반 0, design-number 47(전과 같음, 이 묶음 0), design-color 0 |
| pnpm spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0, missing-test 16(P12, 전과 같음) |

## 요청하는 변경
1. 화면 검토(7-가): 고르기 화면 동안 위 띠 자리 이름이 '오늘 배울 것'이고 진행 막대도 보인다(브리프대로 막대 · 띠는 손대지 않음). 고르기는 활동이 아니라 이름을 숨길지 정해 주기 바란다.
2. 화면 검토: 회화에서는 고르기 조각(종이 판)이 회화 쪽 위에 바로 놓이지만, 세 영역에서는 영역 색 세션 판 안에 놓여 종이가 겹친다. 그대로 둘지, 판 없이 둘지 확인 바란다.
3. TeacherChoice props 는 모자란 것이 없었다.

## 남은 우려
1. iPad 잠금 풀기 확인 항목(장부 L-2 에 적음): (가) 수업 목록 카드 누름의 문서 단위 잠금 풀기가 클라이언트 이동 뒤 세션의 새 음성 접점 첫 줄(오늘 배울 것 한국어 줄)까지 이어지는지는 추측이다. (나) 새로 고침 · 이어 하기로 연 세션은 감시 상한 뒤 '소리가 안 나와서 글로 봐요'와 밝은 '시작'이어야 한다. (다) 홈 카드 · 결과 '다음 수업'으로 연 때도 같은지 본다. (라) 고르기 화면 누름의 접점 잠금 풀기(위 4) 뒤 router.refresh 로 그려진 오늘 배울 것의 첫 줄이 읽히는지 본다.
2. e2e 는 이 기기에서 돌리지 않았다. 실행은 11-01 뒤 CI 이고, 그 전에는 완료로 적지 않는다. 말하기 막힘 e2e 는 말하기 teach 시드를 시험이 직접 넣으며, 말하기 teach 화면 몫(라-3) 전이라 막힘 안내까지만 본다.
3. 고르기 화면에서도 data-activity 는 today 다. e2e 도움 함수가 data-activity="today" 만 기다리면 고르기 화면을 지나친 것으로 볼 수 있어, teach.spec 은 집이 선생님을 고른 채로 바꿨다.
