# 구현 보고: 가르치고 배우는 수업 묶음 라-1, 자리 조각(2026-10-30 02:4x, 구현자 Opus · high)
상태: DONE_WITH_CONCERNS. 워크트리 p13d이고 커밋은 하지 않았다. 새 파일 열하나와 globals.css 칩 토큰 더하기뿐이며, 세션 틀 · 활동 조각 · 선생님 창 · 음성 층 · 시드 · specs 는 읽기만 했다.
## 바뀐 파일
- 신규 `src/core/session/teach-line.ts`(227줄): TEACH_SLOT_NAME(:16) · teachLineStateOf(:50) · STORY_REPLAYS · storyPlaysOf(:81) · chipSegmentsOf(:119) · chipLightOf · chipsLitOf · lineProgressOf(:176) · highlightSegmentsOf(:199)
- 신규 `src/components/session/teach/` 여덟 파일: teacher-line(TEACH_TEXT :65 · useTeachLine :164 · TeacherLine :265) · chips · today · show · together · why-bubble · story · spare-intro
- `src/app/globals.css:52-64`: 칩 토큰 여덟을 더했다.
- 시험(신규): `tests/unit/teach-line.test.ts`(16) · `tests/unit/teach-pieces.test.ts`(31)
## 조각마다 입력 꼴과 콜백(모두 teacher: TeacherView | null · speech · speechSettings(skipNoticeMs · speakCharsPerSecondKo · rateKo)를 받음)
| 조각 | 입력(시드 칸) | 콜백 |
|---|---|---|
| TodayScreen | teach.todayKo · todayEn | onStart('시작') |
| NewWordsScreen | preview[].word · meaningKo · parts + 부르는 쪽이 찾은 그림(예문은 받지 않음) | onNext |
| ModelScreen | teach.models[i] 그대로(en · ko · chips[].role · from · lineKo · fromEn · storyEn · questionEn · wordAnswerEn) + 그림 | onNext |
| TogetherFrame | lineKo · textEn · highlight · storyEn · questionEn(=en) · questionKo(=ko) · meaningKo · prompt(filled) · askRole, reaction{kind, ko=rightKo/wrongKo} · praise · children(영역 입력) | onLineEnd({notice}) |
| WhyBubble | whyKo(시드 · WRITING_WHY_KO · TEACH_TEXT.whyRepeat) · retry(solve · do · speak, 없으면 단추 없음) | onRetry |
| StoryScreen | storyEn(글자 안 그림) | onNext({heard, replayed}) |
| FirstLine | kind(solo · spare) · area | 없음 |
| ChipSentence · AskTag | chips[] · lit[] / askRole | 없음 |
그림만 그리는 쪽(…View)도 내보낸다. 읽는 쓰임은 한국어 줄 lang ko-KR, 선생님 영어는 teacherSpeech, 글 자료(이야기 · 짧은 글)는 감싸지 않은 접점이다(마-1).
## 칩 토큰(값은 ② 팔레트 토큰을 가리킴, 먹색 글자 7:1 이상은 시험이 잼)
| 토큰 | role · 이름 | 값 |
|---|---|---|
| chip-who · chip-do · chip-what · chip-where | 누가 · 하는 일 · 무엇(thing 도) · 어디 | tape-1 · tape-4 · tape-2 · tape-5 |
| chip-is · chip-how · chip-end · chip-spare | is · 어때요 · 마침표 · 예비 | tape-3 · avatar-orange · kraft · postit-talk |
## 시험(47, 모두 AC-3g · AC-N20 으로 시작)
teach-line: 단추 상태 여섯 갈래(읽는 중 · 끝 · 들려주지 못함 · skipped · 끊김 · 토막 없음), 이야기 셈 넷, 칩 · 띠 나누기 여섯. teach-pieces: 정본 밖 문구 · 자리 이름, 오늘 배울 것(초상 · 이름표 · 영어 토막 · 단추 세 경우 · 고르기 전), 새 단어(parts · 예문 없음 · 그림), 본보기 세 영역, 칩 이름 · 토큰 대비 · 색 안 겹침 · 이름표, 같이 해 보기 셋, '왜' 셋, 이야기 · 첫 장, 3D import 없음.
## 관문(p13d, Node 24, 02:4x)
| 관문 | 결과 |
|---|---|
| pnpm lint | 515 파일, No fixes applied(종료 0) |
| pnpm exec tsc --noEmit | 종료 0 |
| pnpm test | 116 파일 · 1343 통과 · 6 todo |
| pnpm check:deps | 위반 0(267 모듈) |
| pnpm check:ids(보고 모드) | 규칙 위반 0, design-number 47(기준 49, 이 묶음 파일 0건), design-color 0 |
| pnpm spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0, missing-test 16(P12, 전과 같음) |
## 설계와 다르게 한 것 · 남은 우려(7)
1. 칩 켜짐은 한국어 줄 시작 뒤 지난 시간을 글자 수 ÷ (speak_chars_per_second_ko × rate_ko)로 나눈 몫이다. 이 값은 감시용이라 느려서 칩이 말보다 조금 늦게 켜질 수 있고, 줄이 끝나면 모두 켜진다. 화면 검토에서 볼 것이다.
2. 말하기 본보기 2 의 칩이 옮겨 가는 움직임(S4)과 쓰기 카드 움직임(W3 · W4)은 그리지 않았다. 질문 칩(from)은 켠 채 위에 두고, 답 칩은 선생님 말에 맞춰 켠다. 쓰기 본보기는 spec 차례(본보기 → 선생님 줄)를 따랐다(표본 W4 · W5 는 줄이 먼저다).
3. 다른 읽기가 끊은 줄(cancelled)은 거기서 끝내고 단추를 밝힌다. 들려주지 못함이 나면 남은 영어 토막은 읽지 않는다(설계 10 '앱이 읽기를 멈춘다').
4. 세션에서 안내가 두 번이면 무음 모드 줄을 더하는 셈은 세션 틀(라-2) 몫이다. 그래서 onEnd 가 {notice}를 넘긴다.
5. 상태 표지는 teacher-window.tsx 의 windowStatusOf · STATUS_BADGE_CLASS 를 가져다 쓴다. 그래서 세션 묶음에 teacher-layer 모듈이 함께 들어온다(avatar-3d 는 동적 import 라 첫 JS 밖). 첫 JS 3D 0 은 라-2 가 붙인 뒤 빌드로 확인해야 한다.
6. 위 띠 이름 표 TEACH_SLOT_NAME('살펴보기')은 5-가 progress.ts 의 '보여 주기'와 다르다. 라-2 가 progress.ts 를 이 표로 바꾼다(정한 것 16).
7. 접점(speech)이 없으면 단추가 흐린 채다. 세션 틀이 그린 뒤 늘 만들어서 지금은 막히지 않는다. 새 단어가 열을 넘으면 '11개예요'로 읽는데, 이 꼴은 문구 표에 없다(3단계는 다섯).
