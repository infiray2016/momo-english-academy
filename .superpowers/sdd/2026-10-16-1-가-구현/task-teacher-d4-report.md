# 구현 보고: P13d 묶음 d4 — 아이 화면 글의 선생님 이름 자리(impl-teacher-d4 · Opus · high, 2026-10-23 13:4x)

상태: DONE. 브리프 `task-teacher-d4.md` · plan 값 9 · 작업 순서 5(d4) 차례 1~5. 차례 6의 코드 검토와 화면 검토는 C142 묶음 검토 몫이라 하지 않았다. 워크트리 p13d(바탕 f9651ea)에서 고쳤고 커밋 · push 는 하지 않았다.

## 바뀐 파일

| 파일 | 신규/수정 | 무엇을 |
|---|---|---|
| `src/core/teacher/name.ts` | 신규 | `josa`(34행) · `teacherNameOf` · `TEACHER_FALLBACK_NAME` · `TEACHER_TEXT`(65행~). 값 9 표의 키를 모두 넣었다. d6 · P12 · P13c 가 쓸 키(choose* · talkLock* · recastTitle · story · probeClear)도 함께 넣었다 |
| `src/components/teacher/teacher-provider.tsx` | 신규 | `TeacherProvider` · `useTeacher` · `useTeacherName`(28행) |
| `src/app/(child)/layout.tsx` | 수정 | `await connection()` 뒤 `householdTeacher()`(11행)를 읽어 `TeacherProvider`(14행)로 감쌌다 |
| `src/components/session/ai-rest.tsx` | 수정 | `AI_REST_TEXT.line` 을 지우고 `TEACHER_TEXT.aiRest(teacherName ?? 공유 값)`(30행)으로 바꿨다. prop `teacherName` 이 새로 생겼다 |
| `src/components/conversation/tori.tsx` | 수정 | `TORI_TEXT` 를 지우고 이름 없는 `BUBBLE_TEXT.answer` 만 남겼다. `ToriFigure` · `ToriWaiting` · `ToriBubble` 에 `teacherName` prop 을 더했다. 접근 이름은 windowName(137행), 기다림 글은 thinking(229행), 말풍선 접근 이름은 replay(342행), 글자는 initial '선'(141행)이다 |
| `src/components/conversation/talk-frame.tsx` | 수정 | `TALK_TEXT` 에서 promiseLabel · promise · stopConfirm 을 지웠다. `teacherName = view.teacher?.nameKo`(215행)를 AiRest · TalkStart · ClosingCards · ToriFigure · ToriBubble · ChildTurn · followEnv 에 넘긴다. 약속 줄은 1087~1088행, 그만하기 확인은 1092행이다. 글 자리만 고쳤다 |
| `src/components/conversation/follow-along.tsx` | 수정 | `TALK_START_TEXT.intro` · `FOLLOW_TEXT.guide` · `FOLLOW_TEXT.notHeard` 를 지우고 `TEACHER_TEXT.intro`(201행) · `followGuide`(543 · 808행) · `notHeard`(409행)로 바꿨다. `FollowEnv.teacherName` 과 TalkStart prop `teacherName` 이 새로 생겼다 |
| `src/components/conversation/child-turn.tsx` | 수정 | `CHILD_TURN_TEXT.notHeard` 를 지우고 `TEACHER_TEXT.notHeard(props.teacherName)`(267행)로 바꿨다 |
| `src/components/conversation/closing-cards.tsx` | 수정 | `CLOSING_TEXT.friendship` 을 지우고 `TEACHER_TEXT.friendship`(180행)으로 바꿨다. ClosingCards · ClosingThird 에 `teacherName` 이 생겼고 쉼(265행)에도 넘긴다 |
| `src/app/(child)/home-cards.tsx` | 수정 | needsSpeaking 을 `TEACHER_TEXT.needsSpeaking`(193행)으로 바꿨다 |
| `src/app/(child)/[area]/placement/placement-flow.tsx` | 수정 | meetTori 를 `TEACHER_TEXT.meetTeacher`(288행)로 바꿨다 |
| `src/app/(setup)/first-run/first-run-flow.tsx` | 수정 | 두 글을 `TEACHER_TEXT.firstRunEnglishName` · `firstRunNickname`(449 · 471 · 498행)으로 바꿨다 |

시험 파일은 아래와 같다.
- 신규: `tests/unit/teacher-name.test.ts` · `tests/unit/teacher-scan.test.ts`
- 수정: `tests/unit/talk-follow.test.ts` · `tests/unit/talk-bubble.test.ts`
- e2e 수정: `tests/e2e/conversation.spec.ts` · `first-run.spec.ts` · `home.spec.ts` · `placement.spec.ts` · `writing.spec.ts`

## 덮는 시험 이름

- `teacher-name`:
  - AC-19c 조사 고르기 둘(받침 유무, 한글이 아닌 끝 글자)
  - AC-19c 이름 자리('선생님' 대신 씀)
  - AC-19c 문구 표 셋(미나 · 리오 · 준 · 고르기 전 / 창 · 고르는 화면 · 수업 목록 · 마무리 / '토리' 없음)
  - AC-16c 처음 회화 안내
- `teacher-scan`:
  - 훑기 도구 둘(주석은 보지 않음, '도토리' · '스토리' · 빼는 낱말은 세지 않음)
  - AC-19c 아이 화면 소스의 화면 글자에 '토리'가 없다
  - AC-19c 아이 화면 소스는 명단 선생님의 한글 이름을 직접 쓰지 않는다
- `talk-follow`:
  - AC-16c 처음 회화 안내(세션 선생님 이름 자리 · 고르기 전 '선생님')
  - AC-15e 셋째 장('리오와 친한 정도' · 이름 없음이면 '선생님과 친한 정도')
- `talk-bubble`: AC-19c 말풍선 접근 이름 '[이름] 말 다시 듣기' · 고르기 전 '선생님 말 다시 듣기'
- e2e(CI 에서 확인한다):
  - conversation: 상수(미나 · '선생님의 약속' · 약속 줄 · 처음 안내 첫 줄 · 그만하기 · 쉼 · 잘 안 들림 · 기다림)와 AC-15l 의 말풍선 접근 이름 단언을 바꿨다. AC-15f · AC-16c · 회화 안전 상한 시험 이름의 인용 글과 가로 화면 시험 이름의 '선생님의 약속'도 바꿨다
  - writing: 쉼 글을 고르기 전 '선생님이 …'로 바꿨다(atLevel 집은 선생님 없음)
  - home: needsSpeaking
  - placement: meetTeacher 와 시험 이름
  - first-run: 두 이름표와 시험 이름

## 관문(Node 24 PATH, 워크트리 p13d)

```
pnpm lint                                          → Checked 419 files. No fixes applied.
pnpm exec next typegen && pnpm exec tsc --noEmit   → exit 0
pnpm test                                          → Test Files 88 passed (88) · Tests 924 passed | 6 todo (930)
pnpm check:deps                                    → no dependency violations found (211 modules, 1124 dependencies cruised)
pnpm exec vitest run tests/unit/teacher-name.test.ts tests/unit/teacher-scan.test.ts tests/unit/talk-follow.test.ts tests/unit/talk-bubble.test.ts → 4 files · 35 passed
```

전체 단위 시험에는 같은 워크트리에서 d3 이 고치는 중인 파일이 함께 돌았고 모두 통과했다. e2e 는 이 Mac 에서 돌리지 않았다.

## '토리' 훑기 결과

- 고치기 전 훑기는 화면 글자 18곳을 잡았다. 자리는 tori 3 · ai-rest 1 · talk-frame 3 · follow-along 5 · child-turn 1 · closing-cards 1 · home-cards 1 · placement 1 · first-run 2 이다.
- 고친 뒤에는 0곳이다. 명단 한글 이름(미나 · 리오)을 직접 쓴 화면 글자도 0곳이다.
- 훑기 범위는 `src/app/(child)` · `src/app/(setup)` · `src/components` · `src/core/teacher` 다. 주석과 `src/app/dev`(시드 보기 '토리 이야기' — d10 몫)는 보지 않는다.

## plan 으로 풀리지 않아 정한 것

1. **`josa` 는 조사만 돌려준다.** 이름과 붙이는 일은 표 안의 도우미가 한다. 와/과는 받침이 있으면 '과'다. plan 의 '앞 것' 목록(이 · 은 · 과 · 을 · 아)과 같다. 끝 글자가 한글 음절이 아니면 받침 없는 쪽으로 본다.
2. **고르기 전 windowName 은 '선생님'이다.** '선생님 선생님'이 되지 않게 했다. chooseGo 와 같은 규칙이다.
3. **`TEACHER_TEXT.initial = "선"` 을 더했다.** 표에 없는 키다. ToriFigure 의 글자 동그라미가 '토'였고, d6 초상 조각의 고르기 전 글자 '선'과 맞췄다. ToriFigure 는 d7 에서 지워진다.
4. **훑기는 앞에 한글 음절이 붙지 않은 '토리'만 센다.** '도토리' · '스토리' · '히스토리'를 이름으로 세지 않기 위해서다. 같은 시험에 명단 한글 이름 훑기를 더했다. 근거는 4절 머리 문단 '화면 소스에 선생님 이름이나 토리를 직접 쓰지 않는다'이고, 빼는 낱말(nameKoWordExceptions)은 세지 않는다.
5. **audioSession 훑기는 넣지 않았다.** 브리프대로 d5 의 teacher-speech 시험이 맡는다. plan 값 9 는 같은 파일에 넣으라고 했지만 브리프가 우선한다.
6. **(child) 레이아웃은 `await connection()` 뒤에 읽는다.** 빌드 때 미리 그리지 않게 하려는 것이고, 홈 · 세션 쪽과 같은 꼴이다.
7. **회화 틀 안 조각은 공유 값이 아니라 prop 으로 세션 선생님 이름을 받는다.** 여기에는 마무리 장의 쉼 · 친한 정도도 든다. AiRest 만 prop 이 없을 때 공유 값을 쓴다.
8. **e2e 의 이름은 미나로 적었다.** 회화 시험 집(talkHousehold)의 기본 선생님이 미나여서다. 쓰기 쉼 시험의 집은 고르기 전이라 '선생님이 …'다. 시험 이름 가운데 화면 글을 그대로 인용한 것만 바꿨다. '토리 말풍선'처럼 설명으로 쓴 이름은 d7 이 같은 파일을 고칠 때로 남겼다.

## 요청하는 변경 · 우려

- **d6 에 넘길 것:** 레이아웃은 쪽을 옮겨도 다시 그려지지 않는다(설치된 판 문서 layout.md 'Layouts do not rerender'). 고르기 뒤 공유 값이 새로 읽히려면 d6 가 고르기 성공 뒤 `router.refresh()` 를 불러야 한다. 부르지 않으면 회화 틀 밖 쉼 글이 다음 전체 새로 읽기 때까지 '선생님'으로 남는다. 회화 틀 안은 view.teacher 를 쓰므로 괜찮다.
- **(child) 쪽 요청이 DB 읽기를 하나 더 한다.** householdTeacher 는 React cache 라 요청마다 한 번이다. 읽기 실패는 null 이 되어 '선생님'으로 보인다.
- 공용 파일 · 스키마 · 설정은 고치지 않았다.
- e2e 는 CI 결과를 아직 보지 못했다.
