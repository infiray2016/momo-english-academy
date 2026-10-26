# 구현 보고: P13d 묶음 d7 — 선생님 창(초상 · 상태 표시 · 이름표) · 상태 연결 · 칭찬(2026-10-23 14:2x, implementer · Opus · high)

상태: DONE_WITH_CONCERNS(관문 넷 초록. e2e 는 이 Mac 에서 못 돌려 CI 에서 처음 돈다)
자리: 워크트리 `.claude/worktrees/p13d`(바탕: d6 이 끝난 작업 트리). 커밋 · push · stash 없음. 손질 1 구현자의 파일(브리프 목록)은 건드리지 않았다.

## 바뀐 파일

| 파일 | 신규 / 수정 | 무엇 |
|---|---|---|
| `src/components/teacher/teacher-window.tsx` | 신규(152줄) | `TeacherWindow({ teacher, state, reducedMotion })`. `<figure data-teacher-window data-teacher-key data-teacher-state data-teacher-render="portrait" role="img" aria-label="[이름] 선생님">`(까닭 속성 없음 — d8). 종이 테 6px · 위 테이프(회화 판 테이프와 같은 꼴) · 안 바탕 color.room · 초상(object-cover, alt "") · 이름표 figcaption(accent 바탕 · `text-paper` · Jua 24px). 상태 표시 `data-teacher-indicator`: speaking = 창 둘레 멈춘 테 + `motion-safe:animate-ping` 테, thinking = 점 셋(`motion-safe:animate-bounce`), praise = 작은 별(lucide Star 32px, `motion-safe:animate-bounce`). 움직임 줄이기면 움직임 클래스를 빼고 표시는 남김. transition 없음. 크기 상수 `TEACHER_WINDOW_PX`(가로 260 × 300 · 세로 200 × 240) · `WINDOW_SIZE_CLASS` |
| `src/components/conversation/talk-frame.tsx` | 수정 | 227 `teacherWindowShown` · 237 `targetReachedNow`(순수, 내보냄) · 245 `TalkFrame` 이 선생님 키를 key 로 `TalkFrameBody` 를 그림 · 351 음성 접점을 `teacherSpeech` 로 감쌈(onSpeaking → speakingNow) · 363 `praise()`(talk.teacher_praise_seconds, 끝에서 다시 그리는 타이머) · 436 목표 턴 닿은 턴의 읽기 줄이 비면 칭찬 · 599 끝 줄에서 목표 턴 처음 참 판정 · 815 `onPraise: praise` · 829 `teacherStateOf(...)` · 1102~1150 선생님 칸 레이아웃(`data-talk-layout` · `data-teacher-column` — 창 + 오늘 이야기 목록) · 대화 판에서 ToriFigure · 옆 칸 뗌 |
| `src/components/conversation/tori.tsx` | 수정 | ToriFigure · ToriState 지움, `useReducedMotion` 내보냄(95), 머리 주석 |
| `src/components/conversation/follow-along.tsx` | 수정 | TalkStart · FollowCard · WrapUp(기다림) · WrapCard 의 ToriFigure 지움, `FollowEnv.onPraise`(245), 결과 말 good 이면 부름(523 · 762), 머리 주석 |
| `src/components/board/board.tsx` | 수정 | 85 띠 왼쪽 묶음 `min-w-0 flex-1`(디자인 리뷰 2 N-3) + 주석 |
| `tests/e2e/fixtures.ts` | 수정 | 선택 `webgl: "off" \| "on"`(기본 off), off 면 문맥 시작 스크립트 `disableWebgl`(45) — page · speechPage 모두 |
| `tests/e2e/conversation.spec.ts` | 수정 | 가로 '보는 창 안' 단언에 `[data-teacher-window]` · `[data-talk-topics]` · 창이 판 왼쪽 · 목록이 창 아래(시험 이름도 고침), `spokenTail` 주석 자리(rev-p13b N-3) |
| `tests/unit/talk-follow.test.ts` | 수정 | TalkStart 에 그림이 없다(`role="img"` 없음)로 기대 고침 |
| `tests/unit/teacher-window.test.ts` | 신규(136줄) | 아래 |
| `tests/e2e/teacher-window.spec.ts` | 신규(717줄) | 아래 |

`data-tori-state` · `data-tori-figure` 를 쓰던 시험은 없었다(바꿀 속성 이름 없음).

## 시험 이름

단위 `tests/unit/teacher-window.test.ts`
- AC-19c 선생님 창은 접근 이름 · 이름표가 '[이름] 선생님'이고 선생님 키 · 상태 · 초상 표시 속성을 달며 3D 를 시작하기 전이라 까닭 속성이 없다
- AC-19c 이름표는 선생님 accent 바탕 · 종이색 글자(C141)이고 창 안 바탕은 선생님 방 색이다
- AC-19g 초상 상태 표시: 말하기는 창 둘레 물결 · 생각은 점 셋 · 칭찬은 작은 별 표지이고 쉬기 · 듣기는 표시가 없다(하나만)
- AC-19h 움직임 줄이기면 상태 표시가 멈춘 꼴(움직임 클래스 없음)이고 표시는 그대로 보이며, 창에는 넘김 효과(transition)가 없다
- 선생님 창 크기는 화면 꼴 상수(가로 260 × 300 · 세로 200 × 240 — 제안 값)와 같은 글자 클래스다
- 선생님 창은 고른 선생님이 있을 때 '시작!' 화면부터 대화 · 정리까지 보이고 고르는 화면 · 막힘 · 쉼 · 마무리 세 장에는 없다
- AC-19g 목표 턴 칭찬은 목표 턴이 이번 턴에 처음 참이 된 때만이다(이미 닿은 뒤 더 이야기하기 턴 · 닿기 전 턴은 아님 — R2)

e2e `tests/e2e/teacher-window.spec.ts`(쪽 안 기록: MutationObserver 로 data-teacher-state 바뀜 + 가짜 speechSynthesis 의 speak · start · end · error 를 같은 시계로 — `speakingProblems` 가 견줌)
- AC-19c 선생님 창은 '시작!' 화면부터 초상(까닭 속성 없음)이고 접근 이름 · 이름표가 '미나 선생님', 말풍선 접근 이름이 '미나 말 다시 듣기'이며 가로는 말풍선 왼쪽 · 세로는 위 띠 아래에 있고 인사 → 대화로 토막이 바뀌어도 같은 창이다
- AC-19c 선생님 창은 마이크를 쓸 수 없는 기기의 막힌 안내 · 1-가 하루 안전 상한의 쉼 안내에는 없다
- AC-19g 선생님 창 말하기는 가짜 읽어 주기의 시작 알림 뒤에만 켜지고 끝 · 취소(말풍선 다시 듣기) 뒤에는 꺼지며 문장 사이 쉼에는 말하기가 아니다
- AC-19g 읽어 주기가 오류로 끝나면 말하기가 꺼지고 아이 차례가 열린다
- AC-19g 잠금 풀기 읽어 주기와 시작 알림이 오지 않는 발화(neverStart)에서는 말하기가 아니다
- AC-19g 듣는 동안 선생님은 듣기, 회화 턴 첫 문장을 기다리는 동안 생각(점 셋)이다
- AC-19g 오늘 쓸 말 따라 말하기 결과가 '잘 말했어요'면 선생님이 칭찬(작은 별)을 talk.teacher_praise_seconds 동안 보인다
- AC-19g 대화 아이 턴 뒤에는 목표 턴 전까지 칭찬이 없고 목표 턴에 닿은 턴은 그 읽어 주기가 끝난 뒤 칭찬한다
- AC-19h 움직임 줄이기 흉내에서 초상 상태 표시(물결 · 점 셋)는 멈춘 꼴로 보이고 창에는 넘김 효과가 없다
- AC-19j 회화 읽어 주기는 선생님 높이(미나 — 명단 값) · speech.rate.1-3 · 순서가 비면 pickVoice 목소리이고, 집 선생님이 있어도 말하기 세션 읽어 주기는 높이 1 이다

e2e `tests/e2e/conversation.spec.ts`(이름 고침)
- 회화 화면: 가로 1180×820 에서 선생님 말 세 줄 · 힌트 끝 단 · 설명이 있는 턴에도 말하기 · 잘 모르겠어요 · 선생님의 약속 · 선생님 창 · 오늘 이야기 목록이 보는 창 안이고 선생님 창은 말풍선 왼쪽 칸(목록은 그 아래)이며 그만하기는 위 띠 안이다

## 관문(Node 24 PATH, 워크트리 p13d, 14:2x)

```
pnpm lint                                        → Checked 432 files in 204ms. No fixes applied.
pnpm exec next typegen && pnpm exec tsc --noEmit → 0(출력 없음)
pnpm test                                        → Test Files 91 passed (91) · Tests 936 passed | 6 todo (942)
pnpm check:deps                                  → ✔ no dependency violations found (219 modules, 1183 dependencies cruised)
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → 0 · unknown-ac 0 · plan-ac-not-in-spec 0(덧붙여 돌림)
```

e2e(`teacher-window.spec.ts` · 고친 `conversation.spec.ts`)는 이 Mac 에서 돌지 않아 쓰기만 했다 — CI 에서 처음 돈다.

## 사진(E2E_PHOTOS 때, 각 portrait · landscape)

- `teacher-window-greeting` — 인사 토막(창 + 오늘 이야기 목록 + 대화 판)
- `teacher-window-talk` — 대화 토막 아이 차례
- `teacher-window-thinking` — 첫 문장 기다림(점 셋)
- `teacher-window-praise` — 오늘 쓸 말 '잘 말했어요' 뒤 별

## plan 으로 풀리지 않아 정한 것

1. **선생님이 바뀌면 틀을 새로 그림**: 판(version)은 행 수 · 토막 · 고아 행이라 선생님 키를 담지 않는다. 옛 스냅숏에 키가 없는 이어 하기에서 고른 뒤에도 판이 같을 수 있어, `TalkFrame` 이 `key={선생님 키}` 로 안쪽 틀을 그린다. 음성 접점은 지금처럼 틀마다 한 번 만들고, 선생님이 있으면 그 자리에서 `teacherSpeech` 로 감싼다(고르는 화면은 감싸지 않음 — '인사 듣기'가 장마다 높이를 넘김). 세션 쪽 파일은 고치지 않았다.
2. **말하기 표시 = 멈춘 테 + 퍼지는 테**: plan 의 `motion-safe:animate-ping` 테 위에 accent 색 멈춘 테를 하나 더 둬서, 움직임 줄이기에도 말하기가 보인다(4절 '멈춘 표시').
3. **칭찬 별의 움직임**: plan 이 움직임을 적지 않아 `motion-safe:animate-bounce`(움직임 줄이기면 멈춤)로 했다. 별은 연노랑 채움 · 먹색 선.
4. **칭찬 시각**: 렌더 중 시계를 읽지 않게 `{ until, now }` 를 상태로 두고, `teacherStateOf` 에 그 값을 넘긴다. 끝 타이머가 `now = until` 로 다시 그린다.
5. **목표 턴 칭찬 때**: 끝 줄에서 `targetReachedNow(지난 끝 줄의 값, 이번 값)` 가 참이면 표시를 세우고, 말풍선이 끝 줄까지 받고 읽기 줄(`queue.speaking`)이 비면 켠다. 처음 값은 열 때 자료의 targetReached(이어 열기에서 다시 칭찬하지 않음).
6. **정리 끝인사 기다림**: WrapUp 의 '생각' 그림을 지웠고, 그동안 선생님 상태는 생각이 아니다(4절 '생각은 회화 턴 첫 문장을 기다리는 동안').
7. **초상을 못 읽으면**: 창 안에 글자 동그라미 '선'(96px — `TeacherPortrait` 의 null 꼴)을 둔다.
8. **창이 없을 때의 몸**: 창이 없으면(고르기 · 막힘 · 쉼 · 마무리) 몸을 예전처럼 바로 그리고, 창이 있으면 `data-talk-layout` 안 같은 자리에 창 칸을 둔다. 가로 칸 안쪽에서 대화 판은 늘려 칸 높이와 맞춘다(예전 옆 칸 꼴과 같음).
9. **WebGL 끔 자리**: page 대신 context 시작 스크립트로 둬서 speechPage 도 같이 끈다.
10. **AC-19j '읽기 세션' 몫**: 들어올 때 읽어 주는 말하기 세션(따라 말하기)으로 봤다. 같은 집에 선생님 미나가 있어도 높이 1 · pickVoice 목소리다.
11. **'취소' 증명**: 말풍선 '미나 말 다시 듣기'로 읽던 발화를 끊는 길로 봤다.

## 요청하는 변경

없음. 공용 파일 · 스키마 · 시드 · 설정은 고치지 않았다. board.tsx 는 plan 이 이 묶음에 허용했다.

## 남은 우려

1. **e2e 미실행**: 상태 기록 견줌은 시간에 기댄다(발화 시작 뒤 600ms 틈 · 결과 뒤 400ms 판정). CI 러너가 느리면 흔들릴 수 있어 첫 CI 결과를 봐야 한다.
2. **말하기 물결 크기**: animate-ping 은 2배로 퍼져 가로 창(260 × 300)이면 약 520 × 600 까지 커지며 흐려진다. 대화 판(뒤 형제)은 덮지 않지만 세로 화면에서는 위 띠 위로 지나갈 수 있다. 화면 검토(C142 묶음)에서 사진으로 봐야 한다.
3. **세로 화면 높이**: 위 띠 아래 창 줄(240 + 간격 24)이 대화 판을 아래로 민다. 세로 '보는 창 안' 단언은 없고(plan 위험 7 은 가로), 힌트를 끝 단까지 열면 세로에서 쪽이 길어질 수 있다. 화면 검토에서 크기를 고친다.
4. **같은 워크트리의 다른 변경**: 손질 1 구현자의 파일들이 함께 바뀌어 있다. 14:21 전체 단위 시험(936)은 그 상태로 초록이었다.

## 덧: 묶음 검토 2 M-2(2026-10-23 14:2x, 컨트롤러 덧붙임)

- 바뀐 파일: `tests/unit/teacher-scan.test.ts` — 머리 주석, 끝에 `audioSessionWritesOf`(TypeScript 컴파일러 API — 대입식 `=` · `??=` 등의 왼쪽에 audioSession 이 있는 식만, 읽기 · 비교 · 주석은 세지 않음)와 describe '선생님 화면 조각의 소리 통로(AC-19g)'. 범위는 `src/components/teacher` 만(src/lib/speech 는 d5 `teacher-speech` 시험이 맡아 겹치지 않음).
- 시험 이름:
  - 훑기: audioSession 대입식(type 바꾸기 · 통째 바꾸기)을 찾고 읽기 · 비교 · 주석은 세지 않는다
  - AC-19g src/components/teacher(선생님 창 · 초상 · 고르기)에는 navigator.audioSession 쓰기가 없다(C109)
- 관문 다시: `pnpm lint` 432 파일 고칠 것 없음 · tsc 0 · `pnpm test` 91 파일 · 938 통과(todo 6) · `pnpm check:deps` 위반 0.
