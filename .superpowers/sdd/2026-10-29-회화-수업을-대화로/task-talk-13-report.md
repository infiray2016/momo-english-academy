# 구현 보고: 회화 plan 묶음 13 — 실호출 표본 평가 도구 `talk:observe`(구현자 · Opus · high, 2026-11-05 23시대)

상태: DONE_WITH_CONCERNS. 맡은 파일 넷만 새로 만들었다(워크트리 p13d). 실호출은 하지 않았다(--yes 없이 계획만 확인).

## 1 바뀐 파일

| 파일 | 내용 |
|---|---|
| `scripts/talk-observe.ts`(신규, 2241줄 — biome 서식 뒤) | 인자 169 · 대본 꼴 218~305 · 시드 → 재료 360 · effort 사본 462 · 메모리 대화(서버 끝 처리 사본 598~1066 · `settleTurn` 858 · `evaluateLessonMessage` 1067 · `judgeOf` 1139 · `createTalkSim` 1225) · 계획 · 비용 어림 1712~1790 · 보고 1811~1985 · 흘려 받기 1986 · 실행 2042 |
| `package.json:30` | `"talk:observe": "tsx scripts/talk-observe.ts"` |
| `tests/fixtures/talk-observe/*.json`(신규 여섯) | 대본(3절) |
| `tests/unit/talk-observe.test.ts`(신규, 22건) | 인자 · 대본 · 자료 · 계획 · 메모리 대화(가짜 응답) · 판정 칸 · 보고 |

## 2 쓰는 법

```
pnpm talk:observe                                  # 계획만: 대본 · 아이 차례 · 예상 호출 · 예상 비용(네트워크 없음)
pnpm talk:observe --yes                            # 실제 호출(키는 .env.local, 값은 출력하지 않음)
pnpm talk:observe --yes --script l3-preview-1      # 대본 하나
pnpm talk:observe --yes --level 3 --effort medium  # D7: effort 견줌(low · medium, 그 구간 ai.effort.talk_turn 키만 바꾼 사본)
pnpm talk:observe --yes --out <폴더>               # 보고 자리(기본은 OS 임시 폴더/talk-observe)
```

- 보고는 `<out>/<날짜>-talk-observe-<effort|settings>.md` 와 `.json` 이다. 표는 턴마다 아이(대본) · 계획 · 선생님 말 · 붙인 줄 · tori_ko · 소리 줄(따라 할 말 · 선택지 · 답 소리) · recast(기대 낱말 담음 여부) · 갈래(move kind · next) · 카드 자리 까닭 · 되돌림 · 같은 질문 · 토큰 · 첫 문장 · 전체 ms · 비용 · 표시(출력 검사 걸림 · 막힘 화면 · 앱 다음 차례)다.
- 대본마다 '나란히' 표가 붙는다. 설계된 대화(대본 design) · 실제 선생님 말 옆에 판정 일곱 칸을 '기대 · 자동 · 사람(□)'으로 둔다. 끝에 합계 표가 있고 AC-15o (라) '맥락 없이 끼운 카드 질문' 칸은 사람이 적는다.
- JSON 은 턴마다 정규화 · 검사 뒤 AI 출력 전부와 사용자 메시지를 담는다(시스템 프롬프트는 넣지 않음).
- 실패 처리는 ai:observe 와 같다(`observeFailureOf`). 콘솔 한도 · 계정이면 실행 전체를 멈추고 그때까지를 쓴다. 그 밖의 실패는 그 턴을 카드 안전한 대사 한 줄로 채우고 이어 간다.

## 3 대본 여섯

| 이름 | 단계 | 아이 차례 | 겨눈 것 |
|---|---|---|---|
| `l3-word-answers` | 3 | 8 | 낱말 하나 답(Rice. · Juice. …) — AC-15o (가) recast 기대 낱말 |
| `l3-child-topic` | 3 | 8 | 아이가 꺼낸 이야기(dog · soccer) → 이어 묻기 → follow_child_turns 안 되돌림 — (나) |
| `l3-stuck-three` | 3 | 8 | 첫 질문 '모름' 셋(받침 1 · 2 · 3) · 막힘 말 'Huh?' · 'I don't know.' — (다) |
| `l3-nospeech` | 3 | 7 | 말소리 없음(닫기 · 셋 이어지면 막힘 화면 표시) |
| `l3-preview-1` | 3 | 8 | 첫 프리뷰 기록 장면: 준비 eat · drink 건너뜀 → 첫 질문 막힘 둘 → 쉬운 질문 답 → 카드 답, 그 뒤는 분석 4.2 설계된 대화의 아이 말. design 칸에 분석 4.1 · 4.2 의 설계 대사 |
| `l4-word-answers` | 4 | 7 | 4단계 낱말 답 · 아이 이야기 · 되돌림(둘째) — **4단계 카드 시드가 없어 지금은 계획에서 건너뜀** |

카드는 개발 시드 `seed/lessons/talk/3/1.json` 수업 1 을 실행 때 읽는다(대본에 카드를 베끼지 않음 — 카드 글을 고치면 그대로 따라감).

## 4 메모리 상태가 흉내 낸 것과 못 낸 것

흉내 낸 것(앱 순수 함수를 그대로 씀).
- 흐름: `talkLessonPositionOf` · `nextTeacherTurnOf` · `teacherTurnPlansOf`(말 입력의 답함 · 막힘 두 계획) · `lessonTurnSegmentOf` · `teacherMoveOf` · `reaskWordsOf`.
- 호출: `talkCallTurnOf` · `talkLessonUserMessage`(첫 턴 앱 첫 말 머리) · `talkLessonContextDelta`(바뀐 값만) · `buildAiRequest`(talkLessonTurnSpec · 설정의 모델 · effort · 생각 · 자동 캐시) · 구조화 출력 형식(withFormat) · 흘려 받기(`createToriEnReader` 로 첫 문장 시각).
- 응답: 정규화(규격 normalize) · 출력 검사(`checkOutputFields` + 시드 금지 목록) · 걸린 칸 바꾸기(`applyTalkLessonChecks`) · 문장 문(`createToriSentenceGate` + 시드 메타 문장).
- 앞 턴 전문: 서버 `historyOf` 와 같은 짝(아이 행 n 의 사용자 메시지 ↔ 선생님 행 n+1 의 다시 쓸 글).
- 단계 맥락: 시드 단계 규격 · 단원 규격(단원 단어 25 · 앞 단원 학습 요소 · 목표 글) · 선생님 명단(이름 · 성격 글) · 어휘 범위(그 단계 이하 vocab) · 형태 표.
- 인사 끝 뒤: 1~3단계는 짧은 준비를 지난 것으로 보고 카드 prep 낱말 전부를 보인 낱말로 넘긴다(서버와 같이 건너뛴 낱말도 포함 — 분석 A9). 뒤이어 대화 첫 질문(앱) 행을 더한다.

서버 끝 처리를 줄여 옮긴 것(server-only 라 가져올 수 없어 사본, 묶음 머리 f4ec058 기준).
- `settleLessonTurn`(질문 검사 · 같은 질문 → 카드 자리, 소리 줄, 신호 말 · 겹침 지우기, 겹침 없애기, 뜻 줄, move) · `createLessonSentenceFlow` accept · `lessonCardSlotOf` · `shownAttachOf` · `lessonTextOf` · `aiMoveOf` · `CUE_PHRASES`.
- 흘려 보내는 중에 문장을 내보내는 대신 응답 끝에 문장마다 차례로 넣는다(같은 규칙, 결과도 같다고 본다).

못 낸 것.
- DB 의 세션 · 시도 저장, '말했다' · '만남' 기록(vocab_progress), 친한 정도 · 참여 완료, 끝맺음 턴(talk_closing) · 정리 토막 · 마무리 고르기 뒤 '더 이야기하기'. 마무리 물음 · 마무리 제안에 닿으면 그 대본을 멈춘다.
- 새 아이로만 돈다: '안다' 단어 없음 · 친한 정도 0 · 지난 대화 요약 없음 · 이월 없음 · 앞 세션 만남(metBefore) 없음.
- 실패 길: 다시 부름(같은 모델 · 다른 모델), 첫 문장 뒤 끊김, 1~3단계 두 번 실패의 칭찬 대사는 없다. 실패는 카드 안전한 대사 한 줄로 채운다.
- 대화 안전 상한 · 하루 안전 상한 · 'AI 쉬는 중'. 짧은 준비 시도 자체(4단계 '필요할 때' 준비 열기 포함). 힌트 단은 대본 값과 같은 자리 둘째 '모름'부터 전부 열림만 흉내 낸다.
- 첫 문장 시간은 요청 시작부터 tori_en 첫 문장이 끝난 때까지다. 서버는 요청 받은 때부터 문장 문을 지난 때까지라 서버 준비 시간만큼 짧게 나온다.

## 5 예상 비용(계획 출력, 2026-11-05)

```
l3-* 다섯 · claude-sonnet-5-5 · effort low · 생각 between_tools · 대본마다 아이 차례 7~8
첫 요청 프롬프트(시스템 + 응답 규격) 약 19,000자 ≈ 4,750 토큰
합계: 대본 6(돌릴 것 5) · 예상 호출 39 · 예상 비용 약 0.71달러(캐시 할인을 셈하지 않은 위쪽 어림)
```

어림 상수(추측, 설계 값 아님)는 글자 4 = 1토큰, 턴마다 앞 턴 전문 400토큰, 응답 600토큰이다. 실제는 자동 캐시 읽기($0.1/M)라 더 낮을 것이다. 고침 전후 두 바퀴 · effort 둘이면 네 바퀴 약 2.8달러 이하다.

## 6 시험 · 관문

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit tests/unit/talk-observe.test.ts` | 22 통과 |
| 변이 확인(카드 자리 바꿈 끔 · 장면 단정 정규식 비움) | 4 실패로 잡힘 → 원복 |
| `pnpm biome ci <맡은 파일 넷>` | 0 |
| `pnpm tsc --noEmit` | 0(마지막 실행) |
| `pnpm check:ids` | code-setting-unknown 0 · design-number 47(묶음 전과 같음, src 만 셈) |
| `pnpm talk:observe` · `--level 3 --effort medium --script l3-preview-1` · `--effort high` | 0 · 0 · 2(거부) |
| 가짜 응답으로 대본 다섯 끝까지(스크래치) | 모든 차례를 돎 · 같은 질문만 되풀이하는 가짜에서 셋째부터 same_question 카드 자리 |
| 전체 `biome ci` · 전체 단위 | **실패 — 내 파일 아님**: `src/core/ai/calls/talk-lesson.ts` · `tests/unit/talk-prompt-fix1.test.ts` 서식, `tests/unit/talk-lesson-call.test.ts` 8 · `tests/contract/ai-schemas.test.ts` 1 실패(같은 시각 다른 구현자의 프롬프트 · 거름 고침 중) |

덮는 시험 이름(describe): parseArgs · 대본 · 자료 · 계획 · 메모리 대화(가짜 응답) · 판정 칸 · 보고.

## 7 가져다 쓰는 함수 서명이 작업 중에 바뀐 것(컨트롤러가 맞출 것)

- `TalkLineRange` 에 필수 칸 `reaskWords` 가 생겼다(talk-lesson.ts 238). 도구는 새 `reaskWordsOf`(lesson-flow.ts 460)로 채운다(앞 세션 만남 없음).
- `tori_ko` 가 문장마다 목록이 되었고 `toriKoShownOf` 가 목록을 받는다(spoken.ts, 13절 C202 (5)). 도구는 한 글 · 목록 둘 다 받게 했다(`koOrNull`).
- 서버 `settleLessonTurn` 등이 같은 고침으로 바뀌면 4절 사본이 어긋난다. 지금 사본은 f4ec058 판이다.

## 8 설계와 다르게 한 것 · 요청하는 변경

- 서버 끝 처리의 사본(4절). 요청: `src/server/conversation/lesson-turn.ts` 의 순수 부분(settleLessonTurn · createLessonSentenceFlow · lessonCardSlotOf · shownAttachOf · lessonTextOf · isSoundCue)을 `src/core/conversation/` 로 옮기면 도구가 사본 없이 그대로 쓴다. 어긋남 위험이 사라진다.
- 판정 칸에 '오늘 이야기로 돌아왔는가'(returns)와 recast 기대 낱말(recastWord)을 더했다. 브리프 여섯 칸 밖이지만 AC-15o (가) · (나)를 대본으로 재려면 필요했다.
- 자동 힌트는 사람 판정을 돕는 값일 뿐이다. 장면 단정은 'You are · You're · You look · You feel …' 평서문 정규식이고, '맥락 없이 끼운 카드 질문'은 앞 차례도 카드 질문이고 아이가 말로 답한 턴을 '의심'으로만 표시한다.
- 보고 기본 자리는 OS 임시 폴더다(저장소 안에 쓰지 않음). plan 의 작업 장부 `observe-3.md` 로 옮기는 것은 묶음 14 몫이다.

## 9 남은 우려

1. **4단계 대본은 지금 돌지 않는다.** `seed/lessons/talk/4/1.json` 이 없다. 4단계 카드 시드가 생기면 대본의 낱말(singer · kitchen 등)을 그 카드에 맞게 손봐야 한다.
2. **대화 첫 질문(앱)을 방금 물었다는 사실이 AI 앞 턴 전문에 없다.** 서버 `historyOf` 는 아이 행 n ↔ 선생님 행 n+1 짝만 넣는다. 인사 끝 뒤의 대화 첫 질문 행(앱, 아이 행이 앞에 없음)은 짝이 없어 빠진다. 도구로 확인했다: 첫 질문에 답하는 턴의 앞 턴 전문은 인사 한 짝뿐이다. 카드 질문 글 자체는 시스템 프롬프트 가변부에 있어 AI 가 알지만, 그것을 방금 물었다는 것은 모른다(사용자 메시지에도 그 줄이 없음). 실호출 보고에서 첫 질문 답 뒤 반응을 보면 영향이 드러날 것이다. 도구는 서버를 그대로 흉내 냈다.
3. 실호출을 아직 한 번도 돌리지 않았다. 흘려 받기 · 구조화 출력 · fallbacks 베타가 스크립트 클라이언트로 서버와 같이 도는지는 첫 --yes 때 확인된다.
4. 시드 카드 글이 같은 워크트리에서 바뀌는 중이다(첫 필수 질문이 'Rice and fish for lunch! …'로 바뀜). 대본 design 칸은 분석 4.1 · 4.2 의 옛 카드 글 기준이다.

## fix round 1(검토 rev-night-2 · task-night-2-review.md 지적 표 33 · 34 · 41줄, 2026-11-05 밤)

상태: DONE_WITH_CONCERNS. 맡은 파일 둘만 고쳤다(`scripts/talk-observe.ts` · `tests/unit/talk-observe.test.ts`). 대본은 그대로다.

| 지적 | 판정 | 고친 곳 |
|---|---|---|
| I-1 인사 끝 'Next part' 줄 없음 | 닫힘 | 서버(lesson-turn.ts 1796~1806)처럼 인사 끝 턴이면 `nextPart` 를 얹는다(talk-observe.ts 1448). 기준은 처음 스냅숏의 짧은 준비 계획이다. 서버 index.ts 의 prepPlan 판단(늘 모드일 때만 `startPrepWordsOf`)을 같은 함수로 옮겼고(1266), 인사 끝 뒤 보인 준비 낱말도 그 계획을 쓴다(전에는 카드 prep 을 그대로 씀). |
| I-2 건너뛴 준비 낱말을 만난 낱말에 넣음 | 닫힘 | `createTalkSim` 의 넷째 인자 `skippedPrep`(1250)으로 대본 `prep.skipped` 를 받는다. 만난 낱말에서는 빼고(1350, 서버 lesson-input.ts lessonContextAt), 다시 묻는 낱말(reaskWordsOf)에는 그대로 둔다. 실행 · 계획 둘 다 넘긴다(2112 · 2161). 보고 문구도 '다시 묻는 낱말에는 전부, 이미 만난 낱말에서는 뺀다(서버와 같음, 분석 A9)'로 바꿨다. |
| M-6 사본 두 곳이 옛 판 | 닫힘 | 문장 문에 걸린 문장이 있으면 뜻을 비운다(998, `settleTurn` 의 새 인자 `blockedSentences` = 문장 문 `blocked().length`). 소리 줄 짝은 새 `soundPairsOf` 꼴이다(966): 따라 할 말이 선택지 하나와 같은 말이면 그 짝을 넣지 않는다. 머리 주석과 `settleTurn` 주석은 '이번 패치 판(2026-11-05 밤 작업 트리, f4ec058 위 C202 고침)'으로 바꿨다. |

C203 재질문(impl-talk-prompt-1, 같은 시각).
- 그쪽 보고에는 아직 'fix 1' 절이 없다. `src/core/conversation/question-retry.ts` 가 작업 중이고, 내보내는 이름은 `heldQuestionFailOf` · `questionRetryNoteOf` · `mergeQuestionRetry` 다. 서명이 보고에 적히기 전이라 도구에 잇지 않았다.
- 붙일 자리 1: `settleTurn` 의 카드 자리 바꾸기 직전(933 주석). why 가 question_check 이면 `heldQuestionFailOf` 로 재질문 대상인지 본다.
- 붙일 자리 2: `createTalkSim.finish` 를 둘로 나눈다. 첫 결과를 판정하는 단계와, 재질문 응답을 받아 행을 더하는 단계다. `runTalkObserve` 가 그 사이에 `questionRetryNoteOf` 로 만든 입력으로 `streamTurn` 을 한 번 더 부르고, `mergeQuestionRetry` 로 합친 값을 `settleTurn` 에 다시 넣는다. 다시 걸리면 지금처럼 카드 자리다.
- 보고 꼴은 미리 넣었다. `TurnRecord.reask`(600, 사용량 · 결과)가 있으면 비용 칸에 '본 호출 · 재질문 비용'을 따로 적고, 표시 칸에 '재질문: 결과'를 적는다. 합계에는 재질문 턴 수와 비용을 따로 둔다(1918). 지금은 늘 null 이다.

시험 · 관문.

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit tests/unit/talk-observe.test.ts` | 24 통과(새 둘: 건너뛴 준비 낱말 · 문장 문 걸림 뜻, 넓힌 셋: 인사 답 'Next part: short preparation' · 보고 재질문 칸 · 합계 재질문) |
| 고친 곳 셋을 하나씩 되돌림 | 셋 모두 1 실패로 잡힘, 되돌림 |
| `pnpm tsc --noEmit` | 0 |
| 내 파일 `biome ci` · `check:ids` | 0 · code-setting-unknown 0(design-number 47 그대로) |
| `pnpm talk:observe` | 0(호출 39 · 약 0.71달러) |
| 전체 `biome ci` · 전체 단위 | **실패, 내 파일 아님**: `src/core/conversation/question-retry.ts` 서식, `tests/unit/talk-question-check.test.ts` 2건(C203 작업 중) |

남은 우려.
- 소리 줄 짝 꼴(M-6 둘째)은 시험이 없다. 정규화가 먼저 따라 할 말을 버려 결과가 거의 같아서 가짜 응답으로 가르기 어렵다.
- 사본 위험은 그대로다. 8절 요청(서버 끝 처리의 순수 부분을 core 로)이 묶음 14 전에 되면 사본을 지운다.

## fix round 2(C203 재질문을 도구에 잇기 — 컨트롤러 요청, prompt-1 보고 'fix round 1' 서명 기준, 2026-11-05 밤)

상태: DONE. 맡은 파일 둘만 고쳤다(`scripts/talk-observe.ts` · `tests/unit/talk-observe.test.ts`). 서버 `withQuestionRetry`(lesson-turn.ts 1370 · 턴 길 1976)와 같은 차례이고, 판정 · 입력 · 잇기는 core 함수를 그대로 가져다 쓴다(사본 없음).

| 차례 | 도구 자리 | 쓰는 함수 |
|---|---|---|
| 걸린 질문 찾기 | `sim.retryOf`(1651): 성공 응답 · 질문을 쓰는 AI 차례 · 1~3단계일 때, 첫 응답의 문장 문 entries 에서 | `heldQuestionFailOf`(노리는 단어 = 응답 next_targets, 범위 = 이 대화 아이 낱말 포함 lineOptions) |
| 재질문 입력 | 같은 `retryOf`: 입력에 `retry: { previous: 앞 tori_en(문장 문 지난 문장), note }` 를 얹어 같은 요청 구성(`requestOf` 1419)으로 만든다 | `questionRetryNoteOf` · talk-lesson.ts 메시지 끝 assistant · user 두 줄(가림 포함) |
| 재호출 1회 | `runTalkObserve`(2358): ask 가 있으면 `streamTurn` 한 번 더(한 턴에 1회 상한) | — |
| 잇기 | `sim.finish(p, result, { ask, result })`(1677): 두 응답을 같은 읽기(`evaluateResult` 1446 — 정규화 · 출력 검사 · 걸린 칸 · 새 문장 문)로 읽고, 다시 쓴 응답 entries 를 같은 계획으로 만든 뒤 잇는다. 문장 문 걸림 수는 더한다 | `mergeQuestionRetry` |
| 그래도 걸리면 | `settleTurn` 에 이은 entries 를 넘기고(새 인자 `entries` 878) 같은 검사를 다시 한다 → 걸리면 지금처럼 카드 자리. 다시 쓴 응답에 질문이 없거나 재호출이 실패하면 앞 응답 그대로 카드 자리 | — |

보고 꼴.
- 재질문 턴은 비용 칸에 '본 호출 · 재질문 비용'을 따로 적는다. 표시 칸에는 '재질문: 걸림 <까닭>(<낱말>) → 다시 쓴 질문 통과 / 다시 써도 걸림 → 카드 자리(question_check) / 다시 쓴 응답에 질문 없음 / 재호출 실패' 를 적는다.
- 합계에 '재질문 턴 · 비용(달러, 따로)' 줄이 있고, 본 호출 비용에는 넣지 않는다. 실행 중 로그 줄에도 재질문 비용과 결과가 붙는다.
- 계획 출력은 대본마다 '재질문 최대 +n회(약 x달러)' 를 적는다. n 은 1~3단계에서 질문을 쓸 수 있는 말 입력 차례 수다(첫 차례 인사 끝 뺌, 4단계부터 0). 합계 줄은 다음과 같다.

```
합계: 대본 6(돌릴 것 5) · 예상 호출 39 · 예상 비용 약 0.7144달러 · 재질문 최대 +25회(한 턴에 1회 상한, 1~3단계 질문 검사에 걸린 턴만 — 약 0.4860달러 더) · 캐시 할인을 셈하지 않은 위쪽 어림
```

재질문 요청 비용 어림은 같은 차례 입력에 앞 tori_en · 다시 쓰기 메시지 150토큰(추측, `RETRY_NOTE_TOKENS` 162)을 더한 것이다.

서버와 다른 점(작음).
- 서버는 다시 쓴 응답의 문장을 흘려 받으며 새 문장 문에 넣는다. 도구는 응답 끝에 차례로 넣는다(같은 규칙).
- 재호출 기록 표지(error_code 'question_retry')는 DB 기록이라 흉내 내지 않는다. 보고의 재질문 칸이 그 몫이다.
- 서버의 '1~3단계 범위를 읽지 못한 턴은 다시 쓰지 않음'은 도구에 해당하지 않는다. 범위는 늘 시드에서 읽는다.

시험 · 관문.

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit tests/unit/talk-observe.test.ts` | 29 통과(새 재질문 다섯: 통과한 질문은 재질문 없음 · 걸린 질문은 요청 하나(메시지 +2, 끝이 앞 tori_en · 'App check:') · 다시 쓴 질문 통과(반응 뒤 이음 · recast 는 앞 응답 · 비용 따로) · 다시 써도 걸림 → 카드 자리 · 질문 없음 → 카드 자리, 계획 재질문 상한 단언 하나) |
| 되돌림 확인(재질문 판정 끔 · 잇기 끔) | 4 · 2 실패로 잡힘, 되돌림 |
| `pnpm biome ci`(전체) | 0 |
| `pnpm tsc --noEmit` | 0 |
| `pnpm vitest run --project unit`(전체) | 145 파일 · 1857 통과 · 6 todo |
| `pnpm check:ids` | 0(code-setting-unknown 0 · design-number 47 그대로) |
| 가짜 응답으로 대본 다섯 끝까지(스크래치) | 모든 차례를 돎 |

남은 우려.
- 재질문 상한 25회는 위쪽 어림이다. 실제 빈도와 첫 질문 지연(재호출만큼 늦음, prompt-1 U-f2)은 첫 --yes 실행에서 잰다.
- 서버 끝 처리 사본(8절 요청)은 그대로다. 재질문 흐름은 core 함수를 써서 사본이 늘지 않았다.

## fix round 3(설계 검토 task-talk-quality-review-1.md M-6 · M-2 관찰 — 컨트롤러 요청, 2026-11-06)

상태: DONE_WITH_CONCERNS. 맡은 파일 둘만 고쳤다(`scripts/talk-observe.ts` · `tests/unit/talk-observe.test.ts`). 아이 말 갈래(child_kind)는 prompt-2 보고가 아직 없어 잇지 않았다(아래).

| 지적 | 판정 | 고친 곳 |
|---|---|---|
| M-6 재질문 기록에 첫 시도 글 · 둘째 걸림 까닭 없음 | 닫힘 | `TurnRecord.reask` 에 네 칸을 더했다(608). `firstToriEn` 은 첫 시도 tori_en(정규화 뒤)이다. `firstFail` 은 첫 걸림의 질문 · 까닭 · 걸린 낱말(`QuestionFailNote` 1308)이다. `retryToriEn` 은 다시 쓴 시도 tori_en 이다. `retryFail` 은 이은 질문을 같은 질문 검사에 다시 대 본 걸림이다(1822 — 질문 검사 통과인데 같은 질문으로 바뀌었으면 까닭 same_question). json 은 네 칸을 그대로 담는다. markdown 표시 칸은 `재질문: 첫 시도 "Q1" offband(does) → 다시 쓴 질문 통과("Q2")` 또는 `… → 다시 써도 걸림 "Q2" form → 카드 자리(question_check)` 꼴이다(`failText` 857). 'What does your dog like?' 같은 턴은 이제 까닭과 낱말이 보인다. |
| M-2 '같은 소리 두 번'이 앱 붙임 줄과 AI 문장을 견주지 않음 | 닫힘 | 새 `sameSoundTwiceOf`(1190)는 읽는 줄 전부를 문장마다 정규화해 견준다. 읽는 줄은 AI 선생님 문장, 앱이 붙인 글 줄(카드 질문 · 답 예시 · 앱 대사), 소리 줄(따라 할 말 · 선택지 · 답 소리)이다. AI 문장이 소리 줄의 답을 담아도 참이다. nospeech 6 의 'The sun is down.'(AI 문장) + 카드 'The sun is down. What do you do now?' 가 이제 잡힌다. |

아이 말 갈래(child_kind) · 막힘 덮어쓰기(impl-talk-prompt-1 고침 2).
- `task-talk-prompt-2-report.md` 가 아직 없고, `src/core` 에 child_kind 도 아직 없다(2026-11-06 확인).
- 서명이 적히면 이렇게 잇는다. `evaluateResult` 뒤 `chosenOf` 가 stuck 을 읽는 자리에서 그 순수 함수로 막힘을 다시 판정한다(서버와 같은 함수 — 사본 없음). TurnRecord 에 `childKind` 칸을 두고 턴 표 '계획' 옆에 '아이 말 갈래' 칸을 둔다.
- 검토 149줄 5 의 사람 판정 두 칸('막힘 판정 맞음 · 틀림' · '선생님 자기 반응 한마디 있음')은 이번 요청 밖이라 더하지 않았다. 갈래 칸과 함께 하면 좋다.

시험 · 관문.

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit tests/unit/talk-observe.test.ts` | 30 통과(새 하나: 같은 소리 — 카드 줄과 AI 문장 · 다른 줄 · 답 소리를 담은 AI 문장, 넓힌 둘: 재질문 통과 · 다시 써도 걸림에 네 칸 단언) |
| 되돌림 확인(견줄 줄을 소리 줄만 · 둘째 걸림 계산 끔) | 1 · 1 실패로 잡힘, 되돌림 |
| `pnpm biome ci`(전체) · `pnpm tsc --noEmit` | 0 · 0 |
| `pnpm vitest run --project unit`(전체) | 1862 통과 · 6 todo |
| `pnpm check:ids` | 0(code-setting-unknown 0 · design-number 47 그대로) |

## fix round 4(아이 말 갈래 · 막힘 무름 잇기 · 사람 판정 두 칸 — 컨트롤러 요청, prompt-2 보고 3절 서명 기준, 2026-11-06)

상태: DONE. 맡은 파일 둘만 고쳤다(`scripts/talk-observe.ts` · `tests/unit/talk-observe.test.ts`). 서버 사본은 늘지 않았다. 막힘 판정은 정규화(`normalizeTalkLesson` 안의 `effectiveStuckOf`)를, 통째 다시 쓰기는 core `stuckRewriteNoteOf` · `mergeQuestionRetry({ whole })` 를 그대로 쓴다.

| 요청 | 도구 자리 | 서버 대응 |
|---|---|---|
| 같은 함수로 막힘 판정 | 응답 읽기가 정규화 전 AI stuck(`aiStuck`)을 따로 남긴다. 앱이 본 막힘은 정규화 뒤 value.stuck 이다(effectiveStuckOf). 막힘 무름은 말 입력 · AI 참 · 앱 거짓이다(`overriddenOf` 1520). 계획 고르기(`chosenOf`)는 앱이 본 값을 쓴다 | talk.ts kit.stuckOf → onStuck(stuck, overridden) |
| 무른 1~3단계 턴의 문장 잡아 두기 | 첫 응답 문장을 모두 잡아 둔 문장으로 돌린다(`heldAll` 1522, finish 1796) — 다시 쓰지 못해도 끝 처리가 내보낸다 | holdAll · withQuestionRetry baseFlow |
| 통째로 다시 쓰기 | `retryOf` 는 무른 턴이고 질문을 쓰는 AI 차례면 `kind: "rewrite"` 요청을 만든다. note 는 `stuckRewriteNoteOf(아이 말)`(1752)이다. finish 는 `whole: true` 로 잇는다(1828). 걸린 질문 재질문(`kind: "question"`)과 같은 1회 상한이다 | withQuestionRetry rewrite · mergeQuestionRetry whole |
| 턴 표 '갈래' 칸 · '막힘 무름' 표시 | 턴 표 '아이' 옆에 '갈래(child_kind · 막힘)' 칸을 둔다(`childKindCell` 2184). 꼴은 `new_topic · 막힘 참 → 무름` · `answer · 막힘 거짓` 이다. 표시 칸에는 '막힘 무름(AI stuck → 앱이 무름, C204 (3))'을 적는다. 재질문 결과에는 '첫 시도 막힘 무름 — 통째로 다시 쓰기 → …'를 적는다. json 은 `childKind`(614) · `stuck: { ai, app, overridden }` 을 담는다 | — |
| 사람 판정 두 칸 | JUDGE_KEYS 에 `stuckRight`('막힘 판정 맞음') · `ownReaction`('선생님 자기 반응 한마디 있음')을 더했다. 자동 힌트는 없고(1293), '나란히' 표에 '기대 · 자동 · 사람' 칸으로 붙는다. 대본 expect 에도 같은 키를 쓸 수 있다 | 검토 149줄 5 |

계획 출력의 재질문 설명은 '1~3단계 질문 검사에 걸리거나 막힘을 무른 턴만 — 한 턴에 1회 상한'으로 바꿨다(상한 수는 그대로 말 입력 차례 수).

서버와 다른 점(작음).
- 서버의 다시 부를 시간 판정(`questionRetryFits`, server-only)은 흉내 내지 않는다. 도구는 늘 다시 부른다. 실호출에서 첫 응답이 25초쯤을 넘는 드문 턴만 다르다.
- 서버의 holdAll 조건 '아직 보낸 문장 없음'은 stuck 칸이 tori_en 앞이라 늘 참으로 보았다.

시험 · 관문.

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit tests/unit/talk-observe.test.ts` | 33 통과(새 셋: 무른 질문 차례는 rewrite 요청(앞 tori_en · 'is not stuck' 메시지) · 다시 쓴 응답으로 통째로 바꾸고 갈래 · 막힘 무름 기록 · 막힘 갈래면 무르지 않고 받침 첫째, 넓힌 둘: 사람 판정 두 칸 · 보고 갈래 칸과 판정 칸 머리) |
| 되돌림 확인(막힘 무름 판정 끔 · finish 잡아 두기 끔) | 2 · 1 실패로 잡힘, 되돌림 |
| `pnpm biome ci`(전체) · `pnpm tsc --noEmit` | 0 · 0 |
| `pnpm vitest run --project unit`(전체) | 1878 통과 · 6 todo |
| `pnpm check:ids` | 0(code-setting-unknown 0 · design-number 47 그대로) |
| `pnpm talk:observe` · 가짜 응답으로 대본 다섯 끝까지 | 0(호출 39 · 약 0.76달러 · 재질문 최대 +25회 약 0.52달러) · 모든 차례를 돎 |

대본 3회차에서 볼 것: 갈래 칸이 무른 턴('막힘 참 → 무름')과 그 턴의 재질문 결과, 사람 판정 '막힘 판정 맞음' 칸.

## fix round 5(보낼 응답 규격 펼치기 — 대본 3회차 400 'compiled grammar is too large', 컨트롤러 요청 2026-11-06)

상태: DONE_WITH_CONCERNS. 맡은 파일 둘만 고쳤다(`scripts/talk-observe.ts` · `tests/unit/talk-observe.test.ts`). 실호출은 하지 않았다.

- 고침: 새 `talkBodyOf`(talk-observe.ts 480)가 withFormat(SDK zodOutputFormat) 결과의 응답 규격을 core `inlineJsonSchemaRefs`(src/core/ai/inline-refs.ts)로 펼친다. $defs 를 빼고 '#/$defs/…' 참조를 정의로 바꾼다. 서버 `talkOutputFormatOf`(src/server/ai/talk.ts 361)와 같은 꼴이다. 서버 함수는 server-only 라 같은 core 함수를 거치게 했다(사본 없음). 회화 턴 요청 · 재질문 요청 모두 `requestOf` 하나로 만들므로 둘 다 펼친 꼴이다. 검증은 그대로 Zod 규격(wireSchema)이다.
- 시험(먼저 실패 확인): '보낼 응답 규격은 $defs · $ref 를 펼친 꼴이다'. 인사 끝 요청과 재질문 요청의 output_config.format.schema 에 `hasJsonSchemaRefs` 가 거짓이고, '$defs' 글자가 없으며, child_kind 칸이 남는지 본다. 고치기 전 1 실패 → 고친 뒤 34 통과.

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit tests/unit/talk-observe.test.ts` | 34 통과 |
| `pnpm tsc --noEmit` | 0(첫 실행 때는 src/server/ai/run.ts 291 이 inlineJsonSchemaRefs 를 가져오지 않은 오류 — 다른 구현자 작업 중, 다시 돌려 0) |
| 내 파일 `biome ci` | 0 |
| 전체 `biome ci` | **1 — 내 파일 아님**: src/server/ai/run.ts 7(가져오기 차례) · tests/unit/ai-output-schema-refs.test.ts(같은 시각 run.ts 펼치기 작업 중) |
| `pnpm vitest run --project unit`(전체) | 1905 통과 · 6 todo |
| `pnpm check:ids` | 0(code-setting-unknown 0 · design-number 47 그대로) |
| `pnpm talk:observe`(계획만) | 0 |

우려: 펼친 꼴의 크기 울타리(서버 TALK_OUTPUT_SCHEMA_MAX_CHARS · MAX_PROPS)는 서버 시험이 지킨다. 도구는 같은 규격 · 같은 펼치기라 따로 재지 않았다.

## fix round 6(effectiveStuckOf · 잡아 두기 · 다시 쓰기 실패 길 변경 따라가기 — impl-talk-prompt-1 알림, 고침 2 fix 1 검토 rev-prompt-2 D, 2026-11-06)

상태: DONE. 맡은 파일 둘만 고쳤다(`scripts/talk-observe.ts` · `tests/unit/talk-observe.test.ts`). 알림을 받은 시점에 도구 시험 1건('갈래가 막힘 갈래면 무르지 않는다')이 실패하고 있었다. 새 effectiveStuckOf 는 영어 낱말 셋 이상 문장이면 갈래와 관계없이 막힘을 무르는데, 시험의 아이 말 'I have a big dog.' 가 그 문장이었다.

| 바뀐 서버 동작 | 도구 자리 |
|---|---|
| 잡아 두기는 core `createRewriteHold({ low, rangeOk }).onStuck(overridden, asks)` — 질문을 쓰는 차례만 | `holdsOf`(1555)가 같은 함수로 정한다. 전에는 질문 차례가 아니어도 잡아 두었다. retryOf · finish 둘 다 이 판정이다 |
| 다시 쓰기에 실패하면 앞 응답 문장을 모두 지우고(reason 'rewrite') view.needsQuestion → 끝 처리가 카드 자리(fail) | `droppedAll`(1565) · finish 1896: 잡아 둔 턴이 잇지 못하면 앞 문장을 지운다. `settleTurn` 새 인자 `needsQuestion` 이 질문이 없으면 why fail 로 카드 자리를 만든다. Entry reason 에 'rewrite' 를 더했다. 재질문 결과 글은 '다시 쓴 응답에 질문 없음 → 앞 문장을 모두 지우고 카드 자리'다 |
| mergeQuestionRetry whole 은 child_kind · stuck 만 앞 응답 값 | core 함수 그대로라 바꿀 것 없음 |

시험.
- 깨진 시험의 아이 말을 'Blue car.'(두 낱말)로 바꿨다. 뜻(짧은 말 + 막힘 갈래면 무르지 않고 받침 첫째)은 그대로다.
- 새 시험: '통째 다시 쓴 응답에 질문이 없으면 앞 문장을 모두 지우고 카드 자리다'. replaced fail · card_slot · 앞 문장 없음 · 지운 까닭 rewrite · 카드 질문 붙임을 본다. 앞 문장 지우기를 빼면 실패로 잡히고, 되돌렸다.

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit tests/unit/talk-observe.test.ts` | 35 통과 |
| `pnpm biome ci`(전체) · `pnpm tsc --noEmit` | 0 · 0 |
| `pnpm vitest run --project unit`(전체) | 1909 통과 · 6 todo |
| `pnpm check:ids` | 0(code-setting-unknown 0 · design-number 47 그대로) |
| 가짜 응답으로 대본 다섯 끝까지 | 모든 차례를 돎 |

## fix round 7(sceneWords · 늦은 카드 답 · 선택지 되묻기 · 카드 연쇄 막기 변경 따라가기 — impl-talk-prompt-1 알림 둘째, 고침 3, 2026-11-06)

상태: DONE_WITH_CONCERNS. 맡은 파일 둘만 고쳤다(`scripts/talk-observe.ts` · `tests/unit/talk-observe.test.ts`).

| 바뀐 것 | 도구 |
|---|---|
| effectiveStuckOf 선택 인자 sceneWords(talkSceneWordsOf(input)) — 두 낱말 말이라도 카드 · 장면 · 단원 낱말을 담으면 무름 | 정규화(normalizeTalkLesson) 안이라 그대로 든다. 깨진 시험의 아이 말을 카드에 없는 'Pink moon.' 으로 바꿨다(카드 3-1 에 car 가 있어 'Blue car.' 는 이제 무름) |
| choicesEchoChild — 아이 말을 되묻는 선택지 버림 | 정규화 안(talk-lesson.ts 1381)이라 그대로 든다 |
| cardChainGuardOf(cardItemKind · chained) | 정규화 안(1563)이라 그대로 든다 |
| lateCardAnswerOf — 서버가 회화 턴 입력에 afterCardChance 참을 얹음(lesson-turn.ts 1971~1990) | prepare(1712)가 같은 core 함수로 같은 조건(말 입력 · 계획이 이미 참이 아님)에 얹는다. lemmaOf 는 도구 재료(단원 + 단계 범위)다 |

시험.
- 새 시험 '한 턴 늦게 온 카드 답은 앞 차례가 카드 기회로 알린다': 첫 질문에 딴 말 → AI 이어 묻기 → 노린 낱말을 담은 답에 afterCardChance 참 · 사용자 메시지 'Previous turn was a card chance: yes' 를 본다. 얹기를 빼면 실패로 잡히고, 되돌렸다.

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit tests/unit/talk-observe.test.ts` | 36 통과 |
| `pnpm tsc --noEmit` · 내 파일 `biome ci` · `pnpm check:ids` | 0 · 0 · 0(design-number 47 그대로) |
| 전체 `biome ci` | **1 — 내 파일 아님**: src/core/conversation/child-kind.ts · lesson-flow.ts 507 · src/server/conversation/lesson-turn.ts 46 · tests/unit/talk-prompt-fix3.test.ts(고침 3 작업 중) |
| 전체 단위 | **1 실패 — 내 파일 아님**: tests/unit/talk-prompt-fix1.test.ts 1건 · 1918 통과 |
| 가짜 응답으로 대본 다섯 끝까지 | 모든 차례를 돎 |

## fix round 8(lateCardAnswerOf rows 꼴 · 고침 3 fix 1 변경 따라가기 — impl-talk-prompt-1 알림 셋째, 2026-11-06)

상태: DONE. 맡은 파일 둘만 고쳤다(`scripts/talk-observe.ts` · `tests/unit/talk-observe.test.ts`). 알림을 받았을 때 도구 시험은 36 통과로 깨지지 않았다(옛 `turns` 꼴도 받기 때문). 다만 옛 꼴은 '이미 답함'을 보지 못해 서버와 다르게 판정할 수 있어서 맞췄다.

| 바뀐 것 | 도구 |
|---|---|
| lateCardAnswerOf({ rows: LateCardRow[] }) — 가장 최근 필수 질문 뒤 노린 단어를 처음 담은 말 · 그 뒤 아이 차례 LATE_CARD_ANSWER_MAX_GAP(2) 안 | prepare(1718)가 메모리 행을 같은 꼴(선생님 행 move · 아이 행 인식 글)로 바꿔 `rows` 로 넘긴다. 서버 `lessonCallTurnOf` · `lateCardRowsOf` 는 server-only 라 가져올 수 없고, 같은 차례(말 입력 · 계획이 이미 참이 아님 · 인사 끝이면 다음 토막)를 core 함수로 밟는다 |
| cardChainGuardOf — follow_up · follow_child + 필수 항목이면 카드 항목 비움 | 정규화 안이라 그대로 든다 |
| talkSceneWordsOf — card.flow · topic 뺌 | 정규화 안이라 그대로 든다 |
| choicesEchoChild 넷째 인자 question | 정규화 안이라 그대로 든다 |

시험.
- 새 시험 '이미 노린 낱말로 답한 뒤의 말은 늦은 카드 답이 아니다'. 첫 질문에 노린 낱말로 답하고 AI 가 이어 물은 뒤, 같은 낱말을 다시 담은 말에 afterCardChance 가 참이 아님을 본다. 옛 `turns` 꼴로 되돌리면 실패로 잡히고, 되돌렸다.

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit tests/unit/talk-observe.test.ts` | 37 통과 |
| `pnpm biome ci`(전체) · `pnpm tsc --noEmit` | 0 · 0 |
| `pnpm vitest run --project unit`(전체) | 1926 통과 · 6 todo |
| `pnpm check:ids` | 0(code-setting-unknown 0 · design-number 47 그대로) |
| 가짜 응답으로 대본 다섯 끝까지 | 모든 차례를 돎 |

요청하는 변경: `lessonCallTurnOf` · `lateCardRowsOf` 는 DB 없는 순수 함수다. core 로 옮기면 도구가 사본 없이 같은 함수를 부른다(8절 요청과 같은 갈래).
