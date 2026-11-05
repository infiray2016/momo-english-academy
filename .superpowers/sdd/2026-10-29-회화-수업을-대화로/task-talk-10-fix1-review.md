# 범위 한정 재검토: 회화 plan 묶음 10 fix 1(검토자 rev-talk-10 · Opus · xhigh, 2026-11-05, 라운드 1/3)

판정: **Approved.** Important 둘과 컨트롤러 결정 둘, Minor 다섯이 모두 ADDRESSED 다. 새로 든 것은 Minor 셋이고, 묶음 10 을 닫는 데 막힘이 아니다.

확인한 것: fix 보고 `task-talk-10-fix1.md`, plan 보정 11-05 (10) · (11)(plan.md 359줄), p13d 의 바뀐 자리(아래 줄 번호), 관문 출력(`t10f1-red.txt` 실패 9건 · `t10f1b-unit.txt` 144 파일 1853 통과 · `t10f1b-ci.txt` · `t10f1b-tsc.txt` 빈 출력 · `t10f1b-deps.txt` 위반 0). 단위 시험은 다시 돌리지 않았다. 구체적 의심이 없었고 저장된 출력이 보고 수치와 같기 때문이다.

## 지난 지적

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 e2e T2 단언 | ADDRESSED | 옛 시험은 묶음 11 이 파일을 다시 쓸 때 없어졌다. 지금 묶음 10 덩이의 선택지 시험(`tests/e2e/talk-lesson.spec.ts:531~572`)은 표본의 선택지 두 글을 이름으로 둔다. 그 글이 선생님 쪽 네 표지(`:558~562`)에 없고, 읽어 준 기록에는 있으며, 'Or' 가 없음(`:563~566`)을 단언한다. 아이 말풍선은 견주지 않는다. 읽어 준 기록은 untilChildTurn 이 읽기 끝을 기다린 뒤(`:86~91`) 읽으므로 때 맞춤 문제가 없다 |
| I-2 회화 말풍선 '소리가 안 나와서 글로 봐요' | ADDRESSED | `tori.tsx:558~562`(soundlessOf: tori · card 의 not_played 만, speakHeardOutcomeOf 를 씀) · `:565~572` · `:700~720`(speech.skip_notice_seconds 를 noticeMs 로 받아 그동안만 보임) · `:851~862`(글은 그대로, role status). 정본 07:34 의 '글로 이어 가며 … 말풍선을 누르면 다시 읽는다'를 지킨다. 시험 셋(`talk-bubble.test.ts:672~744`)이 대상 갈래 · 남은 시간 · 보임과 사라짐을 단언한다. 틀에 잇는 일은 묶음 11 fix 몫으로 넘겼다(보고 46줄) |
| 일탈 3(작은 '다음' 없음) | ADDRESSED | 컨트롤러가 받아들였고 plan 보정 (10)에 남았다 |
| M-2 힌트 흐림 | ADDRESSED | plan 보정 (11)대로 걷었다. src · tests 에 hintsDimmed · data-hint-dimmed 가 0건이다. 머리 주석은 `child-turn.tsx:17` 에 있다. talk-frame.tsx 의 import · 넘김도 지워졌다(`talk-frame.tsx:131~141` 에 없음). 아이 차례는 끝 줄 뒤에만 열리므로 동작이 바뀌지 않는다 |
| M-1 지난 말 다시 읽기의 쉼 · w | ADDRESSED | 기록 줄이 app 을 남긴다(`log.ts:41` · `:75~78` · `:102` · `:158~161`). talkLogReplayOf(`:193~202`)가 splitSentences 로 문장마다 나누고, 붙인 줄은 card 로 적는다. TalkLog 는 그 항목을 넘긴다(`talk-log.tsx:45`). 시험이 문장 나눔 · w · 소리 줄 없음을 본다(`talk-log.test.ts:304~336`) |
| M-3 e2e 제목과 단언 | ADDRESSED | 묶음 10 덩이 셋의 제목과 단언이 맞는다(`:472~529` 지난 말을 누르면 그 말만 · `:574~619` 회색 시도와 덮음 · '잘 모르겠어요' 남음). 이어 하기의 'AI 호출 없음'은 묶음 11 덩이가 fakeAiRequests 수로 단언한다(`:378~406`). 맞장구 뒤 첫 문장은 waitAt < replyAt 로 단언한다(`:407~444`) |
| M-4 role log | ADDRESSED | role log 는 지난 줄 묶음에만 있다(`talk-log.tsx:122`). 지금 턴 칸은 그 밖에서 aria-live off 다(`:139`). 기록 칸 직속 자식 수를 세는 e2e 는 없다 |
| M-5 들려준 소리 줄 맞추기 | ADDRESSED | SpeakItem 에 line 을 싣는다(`tori.tsx:436` · `:515~535`). playedSoundsOf(`:541~548`)가 들려준 차례의 소리 줄만 돌려준다. 시험은 `talk-bubble.test.ts:748~763` 에 있다. 틀은 아직 lessonSoundsOf 를 넘기며, 바꾸는 것은 묶음 11 몫으로 넘겼다(보고 47줄) |
| M-6 보고 수치 | ADDRESSED | 관문 표가 저장된 출력과 같다 |

## 새로 든 것(모두 Minor)

**N-1. 회화 말풍선의 둘째부터 무음 모드 줄은 정본 · plan 보정에 없는 넓힘이다.** `tori.tsx:551` · `:721` · `:860`
- 근거: 정본 07:33 의 '한 세션에서 이 안내가 두 번 나오면 … 무음 모드 줄'은 '세 영역 수업에서'로 시작하는 문장이다. 07:34 의 회화 말풍선 몫은 안내 한 줄뿐이다. plan 보정 (11)도 안내만 묶음 10 에 맡겼다. 아이패드 사파리에서만 그리고(SilentModeNote → useIpadSafari) 아이에게 해가 없으며, 장부 T-97 에는 적혀 있다.
- 어떻게: 받아들인다면 plan 보정 (11)에 한 구절을 더해 정본과의 차이를 남긴다.

**N-2. 소리 줄 안내와 말풍선 안내가 함께 뜨면 무음 모드 줄이 두 번 그려질 수 있다.** `tori.tsx:840~862`
- 무음 모드에서는 선생님 문장과 소리 줄을 함께 들려주지 못하기 쉽다. 그러면 두 안내 칸이 각자 SilentModeNote 를 그린다. 묶음 14 눈 점검 (가)에서 보고, 겹치면 한 번만 그리게 한다.

**N-3. 회화 말풍선이 가르치는 수업 조각 파일에서 문구 하나를 가져온다.** `tori.tsx:27`
- TEACH_TEXT 를 쓰려고 `components/session/teach/teacher-line.tsx` 전체를 가져온다. 의존 검사는 0 이고 같은 문구를 한곳에 두려는 뜻은 맞다. 다만 회화 화면이 가르치는 수업 조각에 기대게 되므로, 묶음 12 정리 때 문구를 공용 문구 모듈로 옮길지 본다.

## 판정

Approved. 묶음 10 을 닫아도 된다. 틀에 잇는 일 둘(I-2 의 soundless 세션 셈 · M-5 의 playedSoundsOf)은 묶음 11 fix 가 받는다. N-1 은 컨트롤러가 plan 보정으로 남길지 정한다. N-2 는 묶음 14 눈 점검에서, N-3 은 묶음 12 에서 본다.
