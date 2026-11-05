# 묶음 4-가 구현 보고(둥근 창 · 흰 이름표 · 상태 표지 · 작은 초상 꼴 · 3D 칸 바탕, 2026-10-30 02:1x, 구현자 Opus · high)
상태: DONE_WITH_CONCERNS. 워크트리 p13d, 커밋 안 함. e2e 는 돌리지 않았다(정적 수정, 단언만 고침).
## 바뀐 파일
- `src/components/teacher/teacher-window.tsx`: 맨 위 상수(29~72) TEACHER_WINDOW_PX 가로 262 × 288 · 세로 176 × 152, WINDOW_FRAME(테 10 · 아래 모서리 26 · 둘레 테 8 · 바닥 띠 78% · 방 색 몫 90%), 크기 · 모양 · 둘레 테 · 표지 · 테이프 클래스 글자. 순수 함수 windowStatusOf(85) · roomBackgroundOf(97). 그림(140~): 유리 칸(위 반원 · 연두 10px · 먹색 선 안팎 · 방 벽 + 바닥 띠 · 초상은 아래 끝 맞춤 contain), 3D 칸은 투명이라 같은 방 바탕, 테이프는 유리 칸 밖 오른쪽 위 45°(연두 테에만 걸침, 색 paperLookOf), 오른쪽 아래 표지 하나, 흰 종이 이름표(bg-paper · text-ink · Jua 24 · −2° · 종이 테). 동작(3D · 초상 갈래 · 까닭 속성 · 접근 이름)은 그대로다.
- `teacher-portrait.tsx`: 선택 속성 `shape`("circle" 기본 · "window") · windowCornersOf · PORTRAIT_WINDOW. 기본값이 지금 꼴이라 입력 꼴이 깨지지 않는다(가르치고 라-1).
- `teacher-choice.tsx`: 장 안 초상 둘에 shape="window"를 준다. 문구는 그대로다.
- 시험: `tests/unit/teacher-window.test.ts`(19), e2e `teacher-window.spec.ts`(이름표 rgb(38, 38, 38) 글자 · rgb(255, 255, 251) 바탕, 새 AC-23i 창 상자 · 테이프 · 표지 하나, 생각 때 표지 1개, AC-19h 둘레 테 멈춤), `teacher-choice.spec.ts`(새 AC-23i 둥근 창 꼴 초상).
## 설계와 다르게 한 것
1. 상태는 표지 하나(설계 5.5)에 더해 말하기 · 듣기의 창 둘레 테(R-27 · 정본 4절 그대로)를 둔다. 표지 그림은 말하기 accent 소리 줄 · 듣기 마이크 · 생각 점 셋 · 칭찬 별이다.
2. 세로 창은 잠정 176 × 152 다. 이름표까지 옛 높이 200 안에 들게 했다(화면 검토 1 M-1). 7-가 가 정한다.
3. 둥근 창 꼴 작은 초상은 정사각(지름 × 지름)이다. 장 크기가 바뀌지 않는다.
## 요청하는 변경(다른 묶음 몫)
- talk-frame 의 가로 왼쪽 칸 `lg:w-[260px]` 를 262 로 바꿔야 한다. 지금은 창이 칸 밖으로 2px 나온다(칸 사이 24px 안이라 겹침은 없음).
- 홈 회화 카드 작은 초상은 묶음 3(home-cards)이 `<TeacherPortrait shape="window" size={56}>` 으로 붙인다. 지금 홈 카드에는 초상이 없다.
## 관문(2026-10-30 02:0x~02:1x)
| 관문 | 결과 |
|---|---|
| pnpm lint | 실패 5 · 경고 1. 모두 다른 손 파일(core/session/attempt.ts · core/speaking/judge.ts · core/writing/why.ts · server/session/index.ts · unit/speaking-judge.test.ts). 이 묶음 9파일 biome ci 통과 |
| tsc --noEmit | 처음 오류 0. 마지막에는 오류 10, 모두 다른 손 파일(meaningWords 등: core/session/spares.ts · server/session/index.ts · scripts/teach-metrics.ts · 시험 넷) |
| pnpm test | 처음 110 파일 · 1247 통과. 마지막 1246 통과 · 실패 1(unit/session-attempt '시도 꼴 판 2' — 다른 손). teacher-window 19 통과 |
| check:deps | 위반 0(247 모듈) |
| check:ids | 규칙 오류 0, design-number 45(기준 49, 이 묶음에서 늘어난 것 0) |
| spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0, missing-test 16(다른 plan 몫) |
| pnpm build | 타입 검사 실패(위 tsc 의 다른 손 오류). 대신 `next build --experimental-build-mode compile` 은 통과 |
| check:bundle | 위반 0(파일 220). 이 검사는 비밀만 본다 |
| 첫 JS 3D(직접 잼, 화면 manifest 의 entryJSFiles 에서 WebGLRenderer · three-vrm · GLTFLoader) | 홈 10파일 255KB · 세션 12파일 417KB · 수업 목록 10파일 252KB, 3D 0 |
## 찍을 화면(next dev · 개발용 DB · 접근 코드 쿠키, 세로 820×1180 · 가로 1180×820)
1. 회화 세션 `/session/<id>`: `/talk/lessons` 에서 회화 1단계 수업을 연다(선생님 고른 프로필). '시작!' 화면은 쉬기라 표지가 없다. '시작!' 뒤 말하는 동안에는 accent 테와 소리 줄 표지가 보인다. 아이 차례에 말하기를 누르면 연두 테와 마이크가 보인다. 둥근 창 · 테이프 · 이름표 · 방 바탕을 본다.
2. 상태 넷은 `/dev/teacher-probe` 의 상태 단추로도 찍을 수 있다(WebGL 이 없으면 초상).
3. 선생님 고르기: teacher_key 가 빈 프로필로 회화 수업을 연다(관찰 쪽 '이 프로필의 선생님 지우기'). 장 안 둥근 창 꼴 초상을 세로 · 가로로 본다.
4. 홈 카드 `/`: 작은 초상은 묶음 3 뒤에 보인다. 지금 찍으면 초상이 없다.
## 남은 우려(4)
1. 바닥 띠는 3D 와 세로 창의 양옆에서만 보인다. 지금 초상이 정사각이라 가로 창의 바닥을 덮는다. 4-나 의 방 색 단색 초상 뒤에도 같다.
2. 지금 초상 파일 바탕이 방 색과 다르면 세로 창 양옆에 경계가 보일 수 있다. 4-나 에서 풀린다.
3. 시드 검사의 accent ↔ 종이색 이름표 대비 검사(check-teacher.ts)는 이제 이름표 용도가 아니다. 정리는 시드 쪽 몫이다.
4. 정본 4절 · R-27 은 '창 둘레' 표시이고 설계 5.5 는 '표지 하나'다. 둘 다 따랐고, 둘레 테까지 보이면 시끄러운지는 화면 검토에서 정한다.
