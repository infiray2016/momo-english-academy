# 묶음 3 구현 보고(홈 카드 넷 · 홈 위 띠 · 수업 목록 위 띠 · 영역 그림 · 홈 작은 초상, 2026-10-30 02:3x, 구현자 Opus · high)
상태: DONE_WITH_CONCERNS. 워크트리 p13d, 커밋 안 함. 통합 · e2e 는 정적으로 썼고 돌리지 않았다.
## 바뀐 파일
- `src/core/lesson-list/state.ts`: 형 UnitCell · RecentCell · BandFacts · BandBars, ListInput.bandFacts(선택), ListView.band 에 cells · bars. 순수 함수 unitCellsOf · recentCellsOf · bandBarsOf(끝낸 세션 없으면 null, R-13) · hereStartTitleOf(여기부터 해요 수업 제목).
- 신규 `src/server/lesson-list/band.ts` readBandFacts: 홈에 있던 아는 단어 · 최근 성적 · 끝낸 대화 셈을 옮기고, 통과 단원 · 끝낸 세션 있음 · 친한 정도(profile_tracks.friendship / talk.friendship_max, 이름 자리)를 더함.
- `src/server/lesson-list/index.ts`: 입력 모으기(listInputOf)를 떼고 readLessonList 에 선택 인자 band 를 둠(기본 거짓). readTodayStoryTitle 은 오래 멈춘 진행 세션을 닫지 않고 빼고 본다.
- `src/server/home/index.ts`: HomeCard 에서 unitCells · knownWords · unitWords · unitTopic · recent · talks 를 지우고 storyTitle 을 더함. 회화가 보통 꼴일 때만 제목을 읽고, 실패하면 제목 없이 오류 이름만 남김.
- `src/app/(child)/home-cards.tsx`: UnitCells · Bar · RecentCells · FirstBody 를 지움. 순수 homeTodayOf 와 HomeBandChips(연속 칸 갈래 더함, 0-다 검토 M1) 를 둠. 카드는 머리(영역 이름 + 회화 작은 초상 TeacherPortrait shape="window" 56px) · 단계 · AreaArt · 오늘 자리 · 큰 단추. 닫힌 카드 · 배치 전 카드에도 머리 · 그림을 둠. MicRecheck · micRecheckPressOf · '여기부터 해요'는 그대로.
- `src/app/(child)/page.tsx`: 위 띠 오른쪽을 HomeBandChips 로 그리고 부모 꼬리표에 종이 테를 둠. householdTeacher() 를 카드에 넘김.
- 신규 `src/components/board/area-art.tsx`: il-book · pencil · speak · chat-hand 좌표 그대로, 색은 fill-/stroke- 토큰 클래스, aria-hidden.
- `src/app/(child)/[area]/lessons/lesson-board.tsx`: ListBandDetail(단계 · 단원 줄 · 단원 5칸 · 막대)을 PaperBand detail 자리에 그림. 쉼 한 줄 칸 · selectionKeptOf 는 그대로.
- **브리프 밖 셋**: `[area]/lessons/page.tsx` 는 band: true 한 줄이다. 세션 시작 트랜잭션 · 결과 · 회화의 목록 읽기에 띠 질의가 붙지 않게 했다. `tests/unit/ux-screen-feedback.test.ts` 는 HomeCard 형과 보통 카드 단언을 고쳤다. `tests/integration/teacher.test.ts` 는 unitCells 단언을 목록 band.cells 로 옮겼다.
## 시험
- 신규 `tests/unit/ux-home.test.ts` 11 개: AC-23c 위 띠(별 0 → [data-star-total] 0개 · 첫 별 뒤 1개 · 연속 칸은 값 1 이상일 때 별 앞) · AC-23c 첫 사용 꼴(0 · 이번 주 · 오늘 아직 없음, 배치 전도 이번 주 숨김) · AC-2a 오늘 자리 · 카드 넷 · 작은 초상 · AC-23h 영역 그림(날값 색 · 글자 없음) · AC-2d 단원 칸 · 최근 성적 · 막대 숨김 · 띠 그림 · AC-2a 오늘 이야기 제목.
- `lesson-list-state.test.ts` 띠 단언. 통합(정적): home.test 는 AC-2a 고친 이름 둘과 새 오늘 이야기 시험이고, lesson-list.test 에 AC-2d 위 띠(세 영역 · 회화) 둘을 더했다(홈 단원 칸 · 성적 단언을 옮김).
- e2e(정적): home.spec 은 AC-2a 고친 문장(목록 '여기부터 해요' 제목과 같은지) · 새 AC-23c 첫 사용 띠 · 새 AC-23h 구성 사진(ux3-home · ux3-home-first-use) 이다. lesson-list.spec 에 AC-2d 위 띠를 더했다(사진 ux3-lesson-list-first · ux3-lesson-list · ux3-talk-lesson-list).
- today-done.test 는 판정이 바뀌지 않아 고치지 않았다.
## 관문(2026-10-30 02:2x~02:3x)
| 관문 | 결과 |
|---|---|
| pnpm lint | 502 파일 통과, 경고 1(result-view.tsx:157 쓰지 않는 reward — 다른 손) |
| tsc --noEmit | 종료 0 |
| pnpm test | 113 파일 · 1279 통과 · 실패 6 · todo 6. 실패 여섯은 모두 result-view.tsx 'reward is not defined'(ux-progress 3 · ux-screen-feedback 결과 3, 다른 손 5-가). 묶음 3 시험은 모두 통과 |
| check:deps | 위반 0(257 모듈) |
| check:ids(보고) | 규칙 오류 0 · design-color 0 · design-number 47(기준 49). 이 묶음이 더한 것 0(막대 셈은 calc 글로 둠) |
| spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0, missing-test 16(P12 몫, 전과 같음) |
## 찍을 화면(next dev · 개발용 DB · 접근 코드 쿠키, 세로 820×1180 · 가로 1180×820)
1. 홈 보통: 네 영역 모두 단계가 있고 영역마다 끝낸 수업이 하나 이상인 프로필이다. 선생님을 고른 뒤(회화 수업 '선생님을 골라요') 한 영역은 오늘 수업을 끝내 '오늘 다 했어요'를 함께 본다. 카드 넷 높이 · 그림 · 작은 초상 · 오늘 이야기 · 표지 하나 · 위 띠 별 칸을 본다.
2. 홈 첫 사용: 개발용 DB 의 profiles 행을 지우면 첫 실행으로 간다(되돌릴 수 없으니 다른 개발용 DB 를 권함). /first-run 의 '영역마다 시작 단계를 고를 수 있어요'에서 네 영역 단계를 고르고, 수업을 하지 않은 채 홈을 연다. 위 띠에 별 칸이 없고 카드에 0 이 없는지 본다.
3. 수업 목록: /reading/lessons 를 첫 사용(막대 없음)과 수업 하나 끝낸 뒤(아는 단어 · 최근 성적)로 보고, /talk/lessons 도 본다(끝낸 대화 · 친한 정도). 위 띠가 두 줄로 접히는 모양을 본다.
## 설계와 다르게 한 것 · 우려(7)
1. 연속 칸 글 '연속 n일'은 시안 ② 띠 글이고 설계 6 표에는 없다. 지금은 값을 넘기지 않아 보이지 않는다. P12 가 값을 넣을 때 문구를 확정해야 한다.
2. 회화 카드는 시안 ② 의 '오늘 이야기' 이름표 없이 제목만 둔다(새 문구 금지). 친한 정도 막대 이름은 기존 '[이름]와/과 친한 정도'에 n/max 를 붙였다.
3. 영역 그림에서 손그림 흔들림 필터와 책 빗금을 뺐고, 말하기 말풍선은 분홍 카드 위에서 보이게 종이 색으로 칠했다. 그림 높이 120px 는 시안(178px)보다 작고, 세로 820 에서 카드 넷이 한 화면에 드는지는 화면 검토가 정한다.
4. 배치 전 카드도 첫 사용이면 '이번 주'를 숨겼다(AC-U3 '카드에 숫자 0 없음'). 배치 전 카드 · 닫힌 카드에도 영역 그림 · 회화 작은 초상을 둔다.
5. 목록 위 띠는 공용 PaperBand 를 고치지 않고 둘째 줄 자리(p) 안 span 으로 그렸다. 띠가 높아지고 세로에서 두 줄로 접힌다. 띠 아래 칸을 따로 두려면 board.tsx 를 고쳐야 한다(요청).
6. 홈이 회화가 보통 꼴일 때 회화 목록 입력을 한 번 더 읽는다(질의 넷 안팎). 끝낸 대화의 분모는 홈의 복사본 unit.min_lessons 에서 목록의 minLessonsOf(배정 수와 큰 값)로 바뀌었다.
7. 통합 · e2e 는 돌리지 않았다. 특히 e2e home AC-23h 의 카드 너비 같음 단언과 lesson-list 회화 띠 단언은 첫 실행에서 고칠 수 있다.
