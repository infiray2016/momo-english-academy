# 묶음 5-가 구현 보고(화면 가족 꼴, 2026-10-30 02:5x, 구현자 Opus · high)
상태: DONE_WITH_CONCERNS. 워크트리 p13d, 커밋 안 함. e2e 는 정적으로만 썼다(돌리지 않음).
## 바뀐 파일
- 신규 `src/core/session/progress.ts`: 이름 표 `ACTIVITY_GROUP_NAME`(:8, 한 곳 — 가르치고 라-2 가 여기만 고침) · `ACTIVITY_GROUP_OF`(:39, 활동 종류 전부) · 순수 `activityGroupsOf`(:92, 이웃한 같은 묶음만 합침 · 끝낸 수 · 지금 자리 · 칸 상태).
- 신규 `src/components/session/activity-progress.tsx`: 묶음 이름(20px) + 칸 막대(끝냄 먹색 · 지금 영역 색 · 아직 종이), 지금 묶음 aria-current, 표지 data-activity-progress · data-activity-total.
- **[계획 밖 신규]** `src/components/session/family-board.tsx`: 판 한 장(종이 테 · 판 모서리 · 그림자 · 테이프, fill · standalone(70dvh) · center). 여섯 화면이 같이 쓰고 plan 152줄이 회화 틀에 '5-가 조각'을 쓰라 해서 따로 뒀다. 표지 data-family-board.
- `session-frame.tsx:22`(머리) · `:1096`(막힘 fill) · `:1142~1180`: 점 → 묶음 막대(판 맨 위), 활동 카드 → 영역 색 FamilyBoard fill(data-activity-card 유지), 틀의 '다음'을 판 안 아래(data-frame-next, mt-auto), 쉼 · 막힘은 판 안 가운데. 흐름 · 시도 · 돌아갈 길은 그대로.
- `result-view.tsx:14`(머리) · `:84` 순수 `resultRewardSideOf` · `:160~287` 결과 판: 띠 아래 종이 판 fill, 별 열 → 본 열(DOM 차례), 가로 `landscape:flex-row-reverse`(별 오른쪽 위). 단추 줄 data-result-buttons(판 안 아래, '다음 수업' 큰 · '홈' 작은 — 띠의 '홈'을 옮김), 쉼은 그 자리에 AiRest.
- `reward.tsx:19` RewardStar `size="big"`(결과 별 열, 회화 마무리는 그대로 line) · 아이콘 획 ICON_STROKE · `:79` 단어 카드 둥근 종이(종이 테 · 카드 모서리).
- `mic-blocked.tsx:130` · `ai-rest.tsx:124` 선택 속성 `fill`(판 안 가운데를 채움, 기본 false — 회화 틀 · 결과 단추 자리는 그대로).
- `app-trouble.tsx:91`: PostIt → FamilyBoard standalone center. `placement-flow.tsx:8`(머리) · `:276~495`: 막힘 · 결과 · 시작 · 마이크 안내 · 문항을 판 fill 로, 문항 판 안 아래 단추 줄('몰라요' · 다시 보내는 '다음'), Mic 획.
- `first-run-flow.tsx:827`: 종이 = FamilyBoard(fill 없음 — 높이 = 내용), '이전' · '다음' 줄(data-first-run-nav)을 종이 안 아래로.
- 시험: 신규 `tests/unit/ux-progress.test.ts`(13), 신규 `tests/e2e/board-fill.ts`(순수 deskEmptyShareOf · boardFill · paperOverContent), 신규 `tests/e2e/screen-family.spec.ts`(6), `reading.spec.ts:106` · `speaking.spec.ts:283` 점 수 → data-activity-total.
## 설계와 다르게 한 것
1. 묶음 이름: plan 다섯 밖에 지문 읽기 · 문제 · 문장 쓰기 · 생각 꺼내기 · 초고 쓰기 · 첨삭 보기 · 고쳐 쓰기 · 모범 답안 · 내 문장 말하기 · 주제 말하기 · 확인 질문을 3.3 문장에서, 가르치는 자리(today · model · together · spare)는 3.3 여섯 자리 이름을 썼다. 시험이 이름이 정본 목록 안인지 본다.
2. 결과 판은 종이색(노랑 단어 카드가 읽기 노랑 판에 묻히지 않게), 세션 · 배치 판은 영역 색 그대로다.
3. 진행 막대는 띠 아래 바탕이 아니라 판 맨 위에 뒀다(5.3 '글은 종이 위').
## 시험 이름(덮는 것)
ux-progress: 'D-7 읽기 세션은 …' · 'D-7 말하기 세션은 …' · 'D-7 묶음 이름은 …' · 'D-7 이웃한 …' · 'D-7 진행 막대 그림 …' · 'AC-23j 판 하나에 …' · 'AC-23j · D-10 단추 줄 …' · 'AC-23j 다시 하기는 …' · 'D-1 앱 오류 · 없는 주소 …' · 'D-1 판 꼴 …' · 'D-1 막힘 판 · 쉬는 안내는 fill …' · 'D-14 첫 실행 종이 …' · 'AC-23j 빈 바탕 몫은 …'. e2e(정적): 세션 · 결과(AC-23j) · 막힘 · 쉼 · 앱 오류와 없는 주소 · 첫 실행, 두 방향 판 상자 셈 + 사진 family-*.
## 관문(p13d, Node 24, 02:5x)
| 관문 | 결과 |
|---|---|
| pnpm lint | 502 파일, No fixes applied |
| pnpm exec tsc --noEmit | 종료 0(중간에 `tests/integration/teacher.test.ts` unitCells 오류가 한 번 보였다가 다른 손이 고쳐 사라짐) |
| pnpm test | 113 파일 · 1285 통과 · 6 todo |
| pnpm check:deps | 위반 0(257 모듈) |
| pnpm check:ids | 규칙 위반 0, design-number 47(기준 49, 이 묶음 파일 0건), design-color 0 |
| pnpm spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0, missing-test 16(P12, 전과 같음) |
## 눈 점검(컨트롤러, next dev · 개발용 DB · 접근 쿠키, 세로 820×1180 · 가로 1180×820)
- 세션: 읽기 · 말하기 수업 하나를 연다(점 대신 묶음 막대 · 판 아래 끝 · 판 안 '다음'). 결과: 그 세션을 끝내거나 끝난 세션의 `/result/<id>`.
- 막힘: 말하기 세션을 연 뒤 개발자 도구 콘솔에서 `localStorage.setItem("momo.mic.v1", JSON.stringify({state:"unavailable",code:"not-allowed",at:new Date().toISOString()}))` 하고 새로 고침(열 때 막힘 판). 끝나면 `localStorage.removeItem("momo.mic.v1")`.
- 쉼: 개발용 DB 에 그 프로필의 `ai.safety_daily_calls` 프로필 행(값 0, 판 +1)을 넣고 쓰기 4~5 세션을 연다. 끝나면 그 행을 지운다.
- 오류: 개발용 DB 의 집 전체 `speech.skip_notice_seconds` 행을 적어 두고 지운 뒤 세션을 새로 고침, 행을 되돌린다. 없는 주소는 `/no-such-screen`.
- 첫 실행: 집이 있는 개발용 DB 에서는 못 연다. CI 사진(family-first-run)으로 본다.
## 남은 우려(5)
1. e2e 를 돌리지 못했다. reading.spec 'fitsBothWays'(쪽 높이 ≤ 창)는 묶음 막대가 판 안에 들어가 약 30px 길어져 가로 1180×820 의 '정답 보기' 화면에서 넘칠 수 있다.
2. 활동 조각이 스스로 두는 단추(읽기 · 쓰기 · 말하기 조각 — 2-나 · 가르치고 라 몫 파일)는 판 아래 끝이 아니라 내용 바로 아래에 남는다. 틀의 '다음'만 판 아래다.
3. 단어 카드 꼴(둥근 종이)은 회화 마무리 첫 장에도 같이 바뀐다(묶음 6 화면).
4. 결과의 '홈'이 띠에서 단추 줄로 옮겨져 쉼일 때는 AiRest 의 큰 '홈' 하나만 남는다(전과 같은 규칙). 화면 검토가 띠 오른쪽이 빈 것을 볼 수 있다.
5. family-board.tsx 는 계획 표 밖 새 파일이다(검토자 판단 필요).
