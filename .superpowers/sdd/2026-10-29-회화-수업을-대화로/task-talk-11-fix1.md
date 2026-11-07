# 구현 보고: 회화 plan 묶음 11 fix 1(구현자 impl-talk-11 · Opus · high, 2026-11-05, fix 라운드 1/3)

상태: DONE. 검토 보고 `task-talk-11-review-report.md` 의 Important 다섯과 Minor 여섯을 고쳤다. 서버 두 파일(lesson-turn.ts · index.ts)은 plan 보정 11-05 (13)의 허용대로 칸을 더하기만 했다. 묶음 10 파일(child-turn · tori · talk-log · log.ts)은 고치지 않았다. e2e 파일은 Edit 로만 고쳤다(묶음 10 덩이는 539줄 그대로). 커밋 · push 는 하지 않았고 개발 DB 에 쓰지 않았다.

## 지적마다 고친 것

| 지적 | 고친 곳 | 한 일 |
|---|---|---|
| I-1 마무리 제안 뒤 말로 답하기 | `talk-frame.tsx` lessonChoiceSpeechOf · 아이 차례 조건(2851줄) | 고르기가 마무리 제안이면 두 버튼과 함께 아이 차례(말하기 단추)를 둔다. 마무리 물음은 두 버튼만이다(02-2 294 · 295줄) |
| I-2 둘째 막힘부터 힌트 다 열기 | `lesson-turn.ts` TalkLessonNext.stuckInSlot(243) · lessonNextOf(1298), `index.ts` positionViewOf(내보냄) · LessonPositionView 에 stuckInSlot, `talk-frame.tsx` | 근사 셈(dontKnowRun)을 걷었다. 아이 차례에 `dontKnowCount={position.stuckInSlot}` 을 넘기고, 끝 줄이 그 칸을 옮긴다. 단추 · 막힘 말 · 이어 열기가 모두 서버 셈을 따른다 |
| I-3 1~3단계 그림 턴(C32) | `lesson-turn.ts` lessonImageKeyOf(250) · 끝 줄 imageKey(245 · 1299), `index.ts` TalkLessonCurrent.imageKey · currentOf, `talk-frame.tsx` | 단계 규격 turnImages 이고 지금 질문 자리의 카드 항목에 그림 키가 있으면 싣는다. 틀은 1~3단계에서 view.pictures 의 그 그림을 말풍선 옆에 보인다(파일이 있을 때만) |
| I-4 정리의 대화 기록 반짝임 | `talk-frame.tsx` wrapShineTextsOf · WrapLog(1788) · 정리 차례(2729) | 정리 차례에도 대화 기록 칸을 두고, 아이 인식 글 가운데 오늘 쓸 말(WrapView.metWords)이 든 줄에 표지 data-wrap-shine 을 달아 한 번 반짝인다. 꼴은 UI · UX 묶음 6 몫이다(아래 '넘길 것') |
| I-5 '소리가 안 나와서 글로 봐요' | `talk-frame.tsx` soundlessStepOf · onSpoken · LessonToriBubble soundless | 들려주지 못한 선생님 글 말(soundlessOf)마다 세션 셈 { at, count } 을 올려 `soundless={{ at, count, noticeMs: speech.skipNoticeMs }}` 로 넘긴다 |
| M-1 끊긴 아이 말 기록 | `talk-frame.tsx` 열 때 다시 보내기 | 다시 보내는 아이 말도 기록 칸에 더한다(childLogEntryOf) |
| M-2 행 번호 어림 | `lesson-turn.ts` 끝 줄 turnNo(247 · 1300), `talk-frame.tsx` applyEnd | 끝 줄이 그 차례 선생님 행 번호를 싣고, 틀은 그 값을 쓴다(+1 어림을 걷음) |
| M-3 쪽 갈래 경합 | `page.tsx` talkViewOf | 옛 자료 읽기가 던지면 undefined 로 받아 갈 곳(sessionDestinationOf)으로 간다. 묶음 12 가 옛 갈래와 함께 걷는다 |
| M-4 시험 단언 셋 | `talk-follow.test.ts` 456줄 · `talk-lesson.spec.ts` | 말하기 단추 수는 toBe(1). 고정 대사 없음은 말풍선에 대해 단언. 띠 시험 이름은 본문대로 줄임('대화 중 셈 · 분모 없음') |
| M-5 들려준 소리 줄만 들은 도움 | `talk-frame.tsx` lessonSpokenItemsOf · lessonPlayedLineOf · played | 소리 줄 항목에 말풍선 줄 차례를 싣고, 들려준 줄만 모아 `childHeardOf(playedSoundsOf(bubble, played))` 로 넘긴다 |
| M-6 이어 열면 설명 사라짐 | `index.ts` TalkLessonCurrent.explanation · currentOf, `talk-frame.tsx` | 그 행에 저장한 설명(보인 때만 저장)을 current 에 싣고, 열 때 · 토막 넘김 뒤 말풍선 아래에 다시 보인다 |

'대화로' 단추는 지시대로 그대로다(정본 요구 없음).

## 시험

먼저 실패를 본 것:
- 새 파일 `tests/unit/talk-lesson-view-fields.test.ts` 4건: 칸 없음(undefined) 3 · positionViewOf 내보내지 않음 1.
- `talk-follow.test.ts` 새 덩이 4건: 함수 없음.

| 시험 이름(머리) | 파일 | 지적 |
|---|---|---|
| AC-15p 끝 줄 stuckInSlot | talk-lesson-view-fields | I-2 |
| 끝 줄 turnNo | talk-lesson-view-fields | M-2 |
| C32 그림 턴: 끝 줄 imageKey · lessonImageKeyOf | talk-lesson-view-fields | I-3 |
| AC-15p 화면 자료 position 의 stuckInSlot | talk-lesson-view-fields | I-2 |
| AC-15t 마무리 제안 뒤 말로 답할 수 있음 | talk-follow | I-1 |
| AC-15q 들려준 소리 줄만 들은 도움 | talk-follow | M-5 |
| '소리가 안 나와서 글로 봐요' 세션 셈 | talk-follow | I-5 |
| 정리의 대화 기록 반짝임 줄 고르기 | talk-follow | I-4 |
| e2e(정적) 마무리 제안 뒤 말로 답하면 보통 턴 · 둘째 막힘부터 힌트 다 열림 · 정리 기록 칸 · 말풍선 고정 대사 없음 | talk-lesson.spec.ts | I-1 · I-2 · I-4 · M-4 |

## 관문(Node 24, 출력은 스크래치패드 `t11f1-*.txt`)

| 명령 | 결과 |
|---|---|
| 새 시험 두 덩이(고치기 전) | 8 실패 |
| `pnpm biome ci` | 0 |
| `pnpm exec tsc --noEmit -p .` | 0 |
| `pnpm vitest run --project unit` | 0, 145 파일 · 1861 통과 · 6 todo(묶음 8 · 9 시험 그대로 통과) |
| `pnpm check:deps` | 위반 0 |
| e2e | 돌리지 않음(정적) |

## 설계와 다르게 한 것 · 해석

1. **서버 칸 셋(stuckInSlot · imageKey · turnNo)과 current 칸 둘(imageKey · explanation)을 더했다.** 보정 (13)이 허용한 것은 stuckInSlot · imageKey 다. turnNo(M-2)와 current.explanation(M-6)은 검토가 '같은 서버 fix 에 묶으라'고 한 것을 같은 꼴(더하기만)로 넣었다. 묶음 8 · 9 시험은 그대로 통과한다.
2. **그림 키의 자리는 '지금 질문 자리'다.** current 는 위치의 slot 카드 항목을 먼저 보고 없으면 그 행 move.item 을 본다. 인사 질문의 그림 키(카드 인사 질문 imageKey)는 카드 항목 참조가 없어 싣지 않는다.
3. **정리 반짝임은 그린 뒤 줄을 찾아 표지를 단다.** 기록 칸 조각(묶음 10, 닫힘)에 줄 표지 속성이 없어서다. 아이 말 줄(data-child-said="speech")의 글이 고른 줄과 같으면 data-wrap-shine 과 반짝임 class 를 달고, 애니메이션 한 바퀴 뒤 class 를 뗀다. 오늘 쓸 말 맞춤은 대소문자 · 끝 s · es 까지만 본다(원형 표가 화면 자료에 없음). '스스로 한 말'(힌트 · 들은 답 없이 한 말)은 기록 칸 자료에 없어 가르지 못한다.

## 넘길 것

- **UI · UX 묶음 6(정리 꼴):** 정리 차례 기록 칸과 되짚을 말 말풍선의 배치 · 반짝임 꼴. 기록 칸 조각에 줄 표지 속성(예: shine 열쇠 목록)을 두면 위 3 의 DOM 찾기를 걷을 수 있다. '스스로 한 말'을 가르려면 화면 자료 log 의 아이 행에 힌트 종류를 실어야 한다.
- **묶음 12:** 쪽 갈래의 옛 길(talkViewOf 의 loadTalkView · catch)을 옛 갈래와 함께 지운다. 검토 5절의 LESSON_SEGMENT_LABEL today_words · practice 두 칸도 지운다.
- **묶음 14 눈 점검(검토 5절 더함):** 마무리 제안 뒤 두 버튼과 말하기 단추가 함께 있는 화면, 3단계 그림 턴(고래 · 조개 질문)의 그림 크기 · 자리, 정리 기록 칸 반짝임, iPad 무음 모드에서 '소리가 안 나와서 글로 봐요'(둘째부터 무음 모드 줄).

## 우려

1. e2e 새 단언은 돌리지 않았다. 둘째 막힘 e2e 는 가짜 응답의 stuck 참이 서버에서 막힘 말로 처리된다는 가정에 기댄다.
2. 반짝임은 DOM 에 표지를 다는 방식이라, 기록 칸 조각이 다시 그려지면 표지가 지워질 수 있다(정리 동안 기록이 바뀌지 않아 드묾).
