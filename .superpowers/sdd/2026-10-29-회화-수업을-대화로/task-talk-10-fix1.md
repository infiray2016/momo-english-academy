# 회화 plan 묶음 10 fix 1(라운드 1/3, 구현자 impl-talk-10 · Opus · high, 2026-11-05)

검토 보고 `task-talk-10-review-report.md`(Changes requested)와 컨트롤러 지시(I-1 · I-2 · M-2 · Minor, 일탈 3 받아들임)를 고쳤다. 시험을 먼저 써서 실패 9 건(`t10f1-red.txt`)을 본 뒤 통과시켰다. M-2 는 컨트롤러 답 (가)에 따라 묶음 11 파일 talk-frame.tsx 의 두 곳만 고쳤다(아래 '설계와 다르게 한 것'). 그 밖의 묶음 11 파일은 고치지 않았다.

## 고친 것

| 지적 | 판정 | 무엇을 · 어디에 |
|---|---|---|
| I-1 e2e T2 단언 | 고침 | 검토가 가리킨 옛 시험(57~69줄)은 묶음 11 이 파일을 다시 쓸 때 이미 없어졌다(보고 '덧붙임 2'). 지금 묶음 10 덩이의 선택지 시험에 같은 문제가 있어 고쳤다. 표본의 소리 줄 글(선택지 둘 a · b)을 이름으로 둔다. 그 글이 선생님 쪽(`[data-tori-bubble]` · `[data-tori-under]` · `[data-talk-log-teacher]` · `[data-talk-log-ko]`)에 없고, 읽어 준 기록(speechRecord().spoken)에는 있음을 단언한다. 아이 말풍선은 견주지 않는다. 따라 할 말(model) 표본은 묶음 11 덩이의 같이 말하기 시험이 이미 선생님 말풍선 · 기록에 없음과 읽기에 있음을 본다 |
| I-2 '소리가 안 나와서 글로 봐요' | 고침 | `tori.tsx`: `soundlessOf`(558, 선생님 문장 tori · 붙인 줄 card 를 들려주지 못함 — speakHeardOutcomeOf not_played, 읽지 않음 · 끊김 · 소리 줄 · 맞장구는 아님), `soundlessNoticeLeftMs`(565), `SILENT_MODE_FROM_SOUNDLESS = 2`(551, 정본 07 33줄 '두 번 나오면' — 차례이지 설정값이 아님). LessonToriBubble 새 속성 `soundless: { at, count, noticeMs }`(663): speech.skip_notice_seconds 동안 말풍선 아래 `data-tori-soundless` 에 안내 한 줄을 보이고 글은 그대로 둔다. count 가 둘 이상이면 아이패드 사파리 무음 모드 줄(SilentModeNote, `data-silent-mode`)을 더한다. 문구는 가르치고 수업과 같은 `TEACH_TEXT.soundless` 하나를 쓴다. 말풍선 누름은 지금처럼 다시 읽는다 |
| M-1 지난 말 다시 읽기 쉼 · w | 고침 | `log.ts`: 기록 줄에 `app` 을 남긴다(`TalkLogLine` 41). `talkLogReplayOf`(193)는 줄마다 문장으로 나눠(core/seed/text splitSentences) 항목으로 넘긴다. 그래서 읽기 줄이 문장 사이에 speech.sentence_pause_ms 를 쉬고(C125), 붙인 줄은 w card 다. `TalkLog` 의 onReplay 는 그 항목을 넘긴다. 틀의 `queue.replay(texts)` 는 형이 그대로 맞는다(tsc 0) |
| M-2 힌트 흐림 지우기 | 고침(컨트롤러 (가)) | `child-turn.tsx` 에서 hintsDimmedOf · ChildTurn hintsDimmed 속성 · data-hint-dimmed 를 걷었고, 머리 주석에 '끝 줄 전에 힌트 단추가 없는 것으로 지킴'(plan 보정 11-05 (11))을 적었다. `talk-bubble.test.ts` 의 흐림 시험 한 건을 지웠다. `talk-frame.tsx` 는 두 곳만 지웠다(아래) |
| M-3 e2e 제목 · 단언 | 고침 | 지금 묶음 10 덩이 셋의 제목과 단언을 다시 맞췄다. 첫 시험 주석의 '바로 보낸 턴 포함'은 표본이 확인 쪽지 길이라 단언이 없어 지웠다. 바로 보낸 턴의 남김은 단위 시험(`childLogEntryOf` — 보낸 입력 꼴이 같음)이 본다. 검토가 든 이어 하기 · AC-N10 시험은 이제 묶음 11 덩이다(아래 넘길 것) |
| M-4 role log | 고침 | `talk-log.tsx`: role log 를 지난 줄 묶음(122)에만 두고, 지금 턴 칸(139)은 그 밖에 aria-live off 로 둔다 |
| M-5 들려준 소리 줄 맞추기 | 고침 | `SpeakItem` 에 `line`(말풍선 줄 차례)을 싣는다. `lessonSpeakItemsOf(line, level, index)`(515) · `lessonSpokenOf` 가 소리 항목에 넣는다. `playedSoundsOf(content, played)`(541)가 들려준 차례의 소리 줄만 돌려준다(2~3단계 선택지 두 항목은 같은 차례) |
| M-6 보고 수치 | 고침 | 아래 관문 표는 저장한 출력 파일 그대로다 |
| 일탈 3 | 그대로 | 컨트롤러가 받아들였다(plan 보정 (10)) |
| 우려 1 | 닫힘 | 묶음 11 이 TalkLessonFrame 에 이었다(talk-frame.tsx 의 TalkLog · LessonToriBubble · ChildTurn 새 속성). 'e2e fixme 풀기'는 묶음 11 덩이가 도우미를 쓰므로 묶음 10 덩이에 fixme 가 없다. 장부에는 'e2e 첫 실행은 묶음 14 · CI'로 둔다 |

## 설계와 다르게 한 것

1. **묶음 11 파일 `src/components/conversation/talk-frame.tsx` 를 두 곳 고쳤다(M-2, plan 보정 11-05 (11), 컨트롤러 결정 (가)).** 139줄 import 의 `hintsDimmedOf` 한 줄과, ChildTurn 에 넘기던 `hintsDimmed={hintsDimmedOf({ lowLevel, aiTurn: true, responseEnded: bubble.done })}` 다섯 줄(옛 2726~2730줄)만 지웠다. 걷어 낸 함수 · 속성을 부르던 자리라 지우지 않으면 형에서 깨진다. 아이 차례는 끝 줄 뒤에만 열려 그 값이 늘 거짓이었으므로 동작은 바뀌지 않는다. 다른 줄은 건드리지 않았다. 묶음 11 검토자에게는 컨트롤러가 알렸다.

## 시험

| 파일 | 더한 · 고친 것 |
|---|---|
| `tests/unit/talk-log.test.ts` | 17 건(+3): 지난 말 다시 읽기가 문장마다 · tori/card(M-1), 다시 읽기에 소리 줄 없음(T2), 알림 칸은 지난 줄만 · 지금 턴 aria-live off(M-4). 줄 꼴 단언 셋에 app 을 더함 |
| `tests/unit/talk-bubble.test.ts` | 흐림 시험 −1(M-2), +4: soundlessOf 대상 일곱 갈래 · 남은 시간 · 말풍선 안내와 둘째 무음 모드 줄 자리 · 지난 뒤 없음(I-2), 읽기 항목 line · playedSoundsOf(M-5). 지금 턴 다시 읽기 단언에 line 을 더함 |
| `tests/e2e/talk-lesson.spec.ts`(정적) | 묶음 10 덩이 선택지 시험 단언 고침(I-1), 주석 고침(M-3) |

## 관문(Node 24, 스크래치패드 `t10f1-*.txt`)

| 명령 | 결과 |
|---|---|
| 고치기 전 덮는 두 파일 | 9 실패 · 43 통과(`t10f1-red.txt`) |
| 덮는 세 파일(talk-log · talk-bubble · talk-child-listen) | 0, 56 통과(`t10f1-green.txt`) |
| `pnpm biome ci` | 0(M-2 뒤 `t10f1b-ci.txt`) |
| `pnpm exec tsc --noEmit -p .` | 0(M-2 뒤 `t10f1b-tsc.txt`) |
| `pnpm vitest run --project unit` | 0, 144 파일 · 1853 통과 · 6 todo(M-2 뒤 `t10f1b-unit.txt` — M-2 전 1854 에서 흐림 시험 한 건을 지움) |
| `pnpm check:deps` | 위반 0(M-2 뒤 `t10f1b-deps.txt`) |

## 묶음 11 · 14 에 넘길 것

- 묶음 11 틀(잇는 길, 고치는 것은 그 묶음 몫):
  - I-2: onSpoken 에서 `soundlessOf(item, outcome)` 이 참이면 `{ at: performance.now(), count: count + 1 }` 을 세션 상태로 두고, LessonToriBubble `soundless={{ at, count, noticeMs: view.settings.speech.skipNoticeMs }}` 로 넘긴다.
  - M-5: 받은 줄을 읽을 때 `lessonSpeakItemsOf(line, level, bubble.lines.length)`(쌓기 전 차례)로 넣는다. onSpoken 에서 item.w 가 sound 이고 speakHeardOutcomeOf 가 not_played 가 아니면 item.line 을 played 에 더한다. heard 는 `childHeardOf(playedSoundsOf(bubble, played))` 로 준다. 지금 틀은 `childHeardOf(lessonSoundsOf(bubble))` 다.
  - M-2: 틀의 두 곳은 이 fix 가 지웠다(위). 묶음 11 검토는 그 두 곳이 지워진 것을 본다.
- 검토가 든 e2e 두 몫은 이제 묶음 11 덩이에 있다. 이어 하기 시험의 'AI 호출 없음'은 그 덩이가 이미 fakeAiRequests 수로 단언한다. AC-N10 시험의 '첫 문장은 맞장구 뒤'는 그 덩이가 waitAt < replyAt 로 본다.
- 묶음 14 눈 점검(검토 5절 넷 더함): (가) iPad 무음 모드에서 1~3단계 소리 줄 안내 · 큰 단추 · 무음 모드 줄과 말풍선 '소리가 안 나와서 글로 봐요'(둘째부터 무음 모드 줄). (나) ①② 처음 안내가 프로필마다 한 번. (다) 글이 다 흐르기 전 소리 줄 단추를 누름. (라) 지난 말 다시 읽기에 소리 줄이 없고 문장 사이 쉼이 있음. 눈 점검 6(힌트 흐림)은 M-2 답에 따라 '끝 줄 전에는 힌트 단추가 없다'로 바꾼다.

## 우려

1. (Minor) I-2 의 안내 셈(세션 한 번째 · 둘째)은 틀이 세션 상태로 가져야 한다. 말풍선은 턴마다 새로 그려지기 때문이다.
