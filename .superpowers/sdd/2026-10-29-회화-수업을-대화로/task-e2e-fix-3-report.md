# 구현 보고: e2e 실패 12건 고침(시험 쪽, 2026-11-06, 가벼운 루프)

상태: DONE_WITH_CONCERNS. 관문은 tsc · biome ci · 단위 시험 모두 0 입니다. e2e 는 이 Mac 에서 돌리지 않았으므로 검증은 CI 몫입니다. 실호출은 하지 않았고 커밋도 하지 않았습니다. 앱 코드는 바꾸지 않았습니다.

## 1. 먼저 알릴 것

- **새 실패 717번(AC-15q)의 원인은 브리프 추정과 다릅니다.** 여덟째 실행의 실패 증거(`gh run download 42133252064 -n e2e-failure-evidence`, 스크래치패드 `ci8-evidence/files/`)를 보면 733줄 '못 들었어요'와 744 · 745줄은 지났고 758줄 답 소리 단추에서만 실패했습니다. 첫 시도 흉내(noResultRun)는 audiostart 가 아예 없어 '마이크 안 잡힘'으로 분류될 수 없습니다. 실제 원인은 69b1a4d 의 `cardChainGuardOf`(13절 C204 (6))입니다. 카드 답 바로 뒤의 이어 묻기 응답이 card_item 을 필수 1로 두면 앱이 그 항목을 비웁니다(`src/core/ai/calls/talk-lesson.ts:1481~1501 · 1684~1688`). 그래서 자리의 답 예시가 없어지고 막힘 차례에 답 소리 줄이 붙지 않았습니다. 이것은 승인된 설계의 동작이므로 앱 결함이 아니라 시험 결함으로 판정했습니다.
- **'마이크 안 잡힘'(C210) 화면 시험이 없어서 하나 더했습니다.** 쪽지의 기술 사유 건너뜀, 대화 차례의 안내 두 문구, 셈 제외, 턴 보냄 없음을 봅니다.
- **required-utterance 의 sendTurn 에도 같은 뿌리의 결함이 숨어 있었습니다.** 지난 기록 칸의 아이 말풍선을 함께 잡아, 셋째 턴부터 `expect(said).toBeVisible()` 이 엄격 모드 위반으로 실패했을 것입니다. 둘째 턴 표본에서 먼저 실패해 드러나지 않았던 것입니다. T1 과 함께 고쳤습니다.

## 2. 건마다 원인과 고친 방식

| 시험(spec:줄, 고친 뒤 줄) | 원인 | 고친 방식 |
|---|---|---|
| required-utterance:335 AC-23f 1단계 | 분류 T1 | 표본: 아이 말풍선을 마지막 보이는 요소로 읽음(`screen-sampler.ts` Watch 에 pick 더함, TALK_WATCH said `pick: "last"`). 보냄: sendTurn 이 쪽 안 fetch 기록으로 보냄을 확인하고, 확인 칸은 100ms 간격으로 찾아 '보내기'를 누름 |
| required-utterance:396 AC-23f 4단계 | 분류 T1 | 위와 같음 |
| required-utterance:454 AC-23f 안전 상한 | 분류 T1 | 위와 같음 |
| talk-lesson:245 AC-15t(→306) | 분류 T2 | 기다림: 대화 답의 응답 첫 문장 'Wow, me too!' 를 기다린 뒤 그만함. 단언: '말 주고받기 2'(인사 1 + 대화 1) |
| talk-lesson:480 AC-15f(→547) | 분류 T2 | 단언: '말 주고받기 1' → '말 주고받기 2' |
| talk-lesson:512 AC-N8(→580) | 분류 T3 | 기다림: 새 도우미 speakAndSend(확인 칸이 뜨면 '보내기')로 보낸 뒤 기다림 표시를 봄 |
| talk-lesson:551 AC-15p(→620) | 분류 T3 | 기다림: 첫 막힘 뒤 답 소리 줄이 붙은 새 차례를 기다림, 둘째 막힘은 speakAndSend 로 보내고 문장 단은 30초 창으로 봄 |
| talk-lesson:451 AC-15s(→519) | 분류 T4 | 흉내 타이밍: 새 도우미 silentAttempt(누름 → 듣는 중 → 700ms 뒤 다시 눌러 멈춤 → 듣기 끝)를 시도마다 씀. 다음 차례는 '모름으로 보냄' 안내가 사라진 뒤에 기다림 |
| talk-lesson:779 C148 AC-N3(→857) | 분류 T4 | 위 두 도우미를 질문 자리마다 씀(자리마다 talk.nospeech_dontknow_count 번) |
| talk-lesson:378 AC-15q · 15p · 15l(→442) | 분류 T5 | 단언: '막히면 눌러요'를 인사 차례에서 보고, 대화 차례에서는 없음을 봄 |
| talk-lesson:877 AC-15j(→1045) | 분류 T6 | 단언: 공용 셈 talkTurnRequests(끝맺음 'Closing: yes' 뺌)로 셈. 같은 셈을 `talk.ts` 로 옮겨 teacher-window · speech-feedback 도 씀 |
| talk-lesson:717 AC-15q(→792) | 1절 첫째(새 원인: cardChainGuardOf) | 표본 응답: card_item 을 빼고 AI 답 예시 · 힌트(next_answer_example "I like it." · next_hint_ko · next_hints)를 줌. 자리의 답 예시가 선생님 행의 AI 답 예시로 옴(`state.ts:625~630` → `lesson-flow.ts:210`) |
| teacher-window:492 AC-19g(이번엔 통과) | 분류 E1 | 흉내 타이밍: 읽어 주기 대본을 [잠금 풀기 900ms · 첫 실제 발화 6000ms · 그 뒤 900ms]로 둠(HELD_UTTER_MS). 누를 때 첫 발화가 아직 읽히는 중임 |
| talk-lesson:819 7절 버튼 행(이번엔 통과 · 흔들림) | 분류 흔들림 | 기다림: 힌트를 누를 때마다 단이 하나 늘었는지 보고, 문장 단이 열리면 듣기 단추가 그려질 때까지 30초 창으로 기다림 |
| 새 talk-lesson:968 C210 | 시험 없음(브리프 지시) | 새 흉내 deafRun(start 50 · audiostart 80ms, 그 뒤 사건 없음). 쪽지 첫 낱말: 안 잡힘 두 번은 안내 '마이크가 안 잡혔어요. 한 번 더 눌러 주세요' · 실패 수 0 · 결과 말 없음, 셋째(speech.deaf_skip_after)에 '마이크가 계속 안 잡혀서 다음으로 넘어가요' 뒤 다음 낱말. 대화 첫 질문: 세 번 이어 안 잡힘에도 '못 들었어요' · '모름으로 보냄' 안내 · 회화 턴 요청이 없고, 셋째에 '잘 모르겠어요' 안내로 바뀜, 막힘 화면 없음 |

## 3. 바뀐 파일:줄(고친 뒤 기준)

- `tests/e2e/talk.ts:30 · 39~50 · 304~322`: fake-ai 가져오기, CLOSING_MARK · talkTurnRequests, deafRun.
- `tests/e2e/screen-sampler.ts:28~35 · 63~64 · 72~74`: Watch 의 pick, lastVisible.
- `tests/e2e/required-utterance.spec.ts:83~84 · 96~101 · 196~225`: CONFIRM_POLL_MS, TALK_WATCH said pick, sendTurn.
- `tests/e2e/teacher-window.spec.ts:37 · 53 · 85~89 · 303~306 · 494~500`: 공용 셈으로 바꿈, HELD_UTTER_MS, AC-19g 대본.
- `tests/e2e/speech-feedback.spec.ts:34 · 49 · 235 · 306 · 371 · 384 · 386`: 공용 셈으로 바꿈(동작 같음, 이 파일 대본에는 끝맺음 호출이 없음).
- `tests/e2e/talk-lesson.spec.ts:6 · 18 · 27 · 43~47 · 57~63 · 148~200`: 가져오기, 문구 · 설정 상수, 도우미 speakAndSend · silentAttempt · untilNextChildTurnAfterNospeech · deafAttempt. 고친 시험 줄은 2절 표, 새 시험은 965~1041.

## 4. 설계와 다르게 한 것

- 브리프는 717번을 '건강한 마이크 꼴(audiostart ≥ 400ms)로 맞춘다'고 했습니다. 1절 첫째의 근거로 흉내는 그대로 두고 응답 표본을 고쳤습니다.
- 분류 권고는 AC-15t 264줄을 '셈 + 1'로 고치는 것이었습니다. 셈만 보면 다시 대화 답 전에 지나갈 수 있어, 응답 첫 문장을 기다린 뒤 셈을 봅니다.

## 5. 요청하는 변경

없습니다. 공용 파일 · 스키마 · 설정 · 앱 코드는 건드리지 않았습니다.

## 6. 덮는 시험 이름

- required-utterance: AC-23f 회화 1단계(335) · 4단계(396) · 쉬는 안내(426, sendTurn 바뀜) · 안전 상한 끝인사(454)
- talk-lesson: AC-15a · AC-15m · AC-15e(셈 도우미만) · AC-15t 그만하기 · AC-15q · AC-15p · AC-15l · AC-15s · AC-15f · AC-N8 · AC-N10 · AC-15p 둘째 막힘 · AC-15q 인식 실패 시도 · C148 AC-N3 · 7절 말하기 버튼 행 · C210 마이크 안 잡힘(새) · AC-15j
- teacher-window: AC-19g 말하기 기록, 셈 도우미를 쓰는 talkTurn 시험들
- speech-feedback: 셈 도우미를 쓰는 시험들(동작 같음)

## 7. 실행 명령과 결과

```
export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"   # 워크트리 p13d
pnpm biome check --write tests/e2e/    # 39 파일, 2 파일 서식 고침
pnpm exec tsc --noEmit -p .            # 종료 0, 출력 0줄
pnpm biome ci                          # 종료 0, 601 파일
pnpm test                              # 종료 0, 151 파일 · 1960 통과 · 6 todo
```

출력은 스크래치패드 `e2efix3-tsc.txt` · `e2efix3-biome-ci.txt` · `e2efix3-unit.txt`, 전체 diff 는 `e2efix3-diff.txt` 에 있습니다. e2e 는 돌리지 않았습니다(CI 아홉째에서 확인).

## 8. 남은 우려

- **새 C210 시험은 실행해 보지 못했습니다.** 코드 대조로 쓴 것이라 CI 첫 실행에서 표지 · 시각이 어긋날 수 있습니다. 특히 쪽지 셋째 시도 뒤 건너뜀 안내는 speech.skip_notice_seconds(1.5초) 안에 봐야 합니다.
- **teacher-window AC-19g 고침은 발화 차례(0 잠금 풀기 · 1 인사 질문)에 기댑니다.** 잠금 풀기는 '시작!' 누름 때 한 번이라(`browser.ts:547~567`) 차례는 맞다고 봅니다. 차례가 바뀌면 첫 실제 발화가 다시 900ms 가 되어 지금과 같은 꼴로 실패합니다.
- **가짜 응답 규칙도 끝맺음 호출에 걸립니다.** `talkLessonReply` 의 고르는 글이 TURN_MARK 라서, 끝맺음 호출이 회화 턴용으로 넣은 응답 하나를 먹을 수 있습니다. 이번 실패와는 관계없지만, 끝맺음 뒤에 회화 턴 응답을 더 넣는 시험이 생기면 드러납니다.
- **AC-15p 의 첫 막힘 차례는 앱이 카드 답 예시로 같이 말하기를 붙인다는 전제입니다.** 같은 전제를 378번 시험이 이미 단언하므로 같이 지나거나 같이 실패합니다.
- **분류 보고 5절의 'audiostart 뒤 곧 no-speech' 대본(실제 iPad Safari 27 꼴)은 이번 범위에 넣지 않았습니다.** C210 감지 시험이 비슷한 자리를 일부 덮지만, 브라우저가 스스로 no-speech 를 내는 꼴은 아직 e2e 에 없습니다.
