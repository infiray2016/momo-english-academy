# 범위 한정 재검토: 회화 plan 묶음 7 fix 1(코드 검토자 · Opus · xhigh, 2026-11-05, fix 라운드 1/3)

읽기 전용으로 검토했다. 지난 검토 `task-talk-7-review-report.md`(rev-talk-3)와 fix 1 보고 `task-talk-7-fix1.md` 를 먼저 읽고, 보고가 적은 줄을 워크트리 p13d 에서 대조했다. 시험은 다시 돌리지 않았다. 구현자가 남긴 출력 파일(스크래치패드의 fix1-red-i1.txt · fix1-green.txt · fix1-unit.txt)의 요약 줄만 확인했다. 고치기 전에는 1 실패(`RangeError: … prep 0`)와 9 통과였고, 고친 뒤 두 파일은 17 통과, 단위 전체는 138 파일 · 1713 통과 · 6 todo 였다. '5-다' 파일은 보지 않았다.

## 판정: Approved (Critical 0 · Important 0 · Minor 0)

## 1. 지적별 판정

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 다지기 · 보강 카드의 짧은 준비 범위 | ADDRESSED | `src/core/conversation/attempt.ts:178~188` LessonFollowCounts 에 prepWords 칸이 생겼고, 주석은 '부르는 쪽이 설정값에서 넘긴다'(182줄)이다. `attempt.ts:201` 이 짧은 준비 범위를 `Math.max(counts.todayWords, counts.prepWords)` 로 잡고, 바닥선 번호대는 그 뒤(203줄)에서 시작하며 바닥선 범위는 todayWords 그대로다(211줄). 코드에 숫자가 없다. 정본 02-2:173 과 맞는다 |
| M-1 구현 보고의 틀린 문장 | ADDRESSED | `task-talk-7-report.md:81` 이 '옛 흐름이든 새 흐름이든 첫 요청에서 column "move" does not exist 로 깨진다(select · insert · returning 에 모든 열), Approved 뒤 0006 을 먼저 적용'으로 바뀌었다 |
| M-2 마지막 줄 단언 | ADDRESSED | `tests/unit/talk-lesson-attempt.test.ts:311~313` 이 `entries.find((e) => e.tag === "0006_talk_turns_move_prep")` 로 줄을 찾아 `idx: 6` 을 본다. 0007 이 더해져도 깨지지 않는다 |
| M-3 AC-16a 표지 | ADDRESSED | `tests/unit/talk-lesson-state.test.ts:174~175` 가 완료 넷(closing_question · suggestion · floor · stop)마다 `{ outcome: "completed", friendship: true }` 를, 185~188줄이 stop_confirmed 에 `{ outcome: "aborted", friendship: false }` 를 단언한다. AC-16a(11장 187줄)의 묶음 7 몫인 '참고 턴에 닿지 않은 그만하기 · 바닥선 포함 참여 완료는 오르고, 확인해 중단한 대화는 오르지 않음'을 증명한다. 까닭 목록 시험(`talk-lesson-attempt.test.ts:142`)은 표지를 '정한 것 6'으로 바꿨고, 그 시험의 내용(Zod 꼴이 까닭 열 개를 받음)과 맞다 |
| M-4 closing.ts 잠금 · 묶음 8 파일 표 | ADDRESSED(컨트롤러) | `intent/2026-10-29-회화-수업을-대화로/plan.md:168` 묶음 8 행에 closing.ts(보정 11-05 (2))가 들었고, 349줄 보정 문단이 잠금표를 3 · 7 · 8 · 12 · 16 으로, talkClosingStatus 를 부르는 화면 쪽을 묶음 9 · 11 로 적는다. `task-talk-8.md:3` 파일 목록과 27~29줄 보정 절도 같다 |

## 2. I-1 고침 꼴(브리프 할 것 2)

- **설정값을 부르는 쪽에서 받는다.** prepWords 는 counts 의 필수 칸이라 부르는 쪽이 빠뜨리면 tsc 가 막는다. 지금 이 함수를 부르는 곳은 src 안에 없고 시험 파일뿐이다. 상태 쪽은 이미 `src/server/conversation/state.ts:1391` LESSON_BAND_KEYS 로 talk.prep_words 를 구간마다 읽으므로, 묶음 9 가 그 값을 넘기면 된다. 시험도 숫자를 박지 않고 `seed/settings.json` 에서 읽는다(`talk-lesson-attempt.test.ts:22~29`).
- **다지기 카드 시험은 범위 0 을 실제로 막는다.** `talk-lesson-attempt.test.ts:183~202` 는 todayWords 0 · prepWords 설정값(1-3 구간 3)으로 prep 0 이 2 번, prep 마지막이 1 + prepWords 번을 받는지 본다. 고치기 전에는 prep 0 에서 RangeError 가 나서 실패한다(구현자의 실패 출력과 일치). 정리 · 한 번 더 번호가 짧은 준비 범위 뒤로 밀리는지, prep 범위 밖과 바닥선 0 이 던지는지도 단언한다.
- **배정 카드도 그대로 지켜진다.** `talk-lesson-attempt.test.ts:204~217` 은 todayWords 를 prep_words.4-6 + 1 로 두고 prep 마지막(todayWords - 1)이 번호를 받는지 본다. 범위를 prepWords 하나로 잡도록 퇴행하면 이 시험이 실패한다. 기존 시험(163~181줄)은 두 값이 같아 기대값이 그대로다.
- **범위가 정본의 모든 갈래를 덮는다.** 02-2:173 의 짧은 준비 낱말은 1~3단계 배정 카드에서 새 단어(todayWords 이하)이고, 4단계부터와 다지기 · 보강 수업에서는 talk.prep_words.<구간> 개 이하다. 그래서 max 범위를 넘는 차례가 생기지 않는다.

## 3. 지난 검토 4절 물음 2 판정

그대로 유효하다. fix 1 은 0006 · snapshot · 스키마를 건드리지 않았고(세 파일 모두 10-30 09:46 그대로), 바뀐 것은 순수 함수 하나와 시험 둘이다. Approved 뒤 0006 을 개발 DB 에 먼저 적용해도 배포된 옛 코드와 뒤로 맞는다. 적용 뒤에는 0006 내용을 바꾸지 않으며, P12 는 0007 이다.

## 4. 새로 든 것

없다. fix 1 이 바꾼 파일 셋과 보고 문장에서 새 결함을 찾지 못했다.

- **구현자 우려(다지기 카드의 바닥선 듣기 범위 0)는 지금 길을 깨지 않는다.** 바닥선 번호를 부르는 곳은 아직 없다(묶음 16). 정본 02-2:265 는 바닥선에서 '아직 꺼내지 않은 새 단어'를 들려주고 '다 들려주면 정리로 간다'고 하므로, 새 단어가 없는 다지기 카드에서 범위 0 은 정본과 맞는다. 묶음 16 이 다지기 카드의 바닥선 낱말을 따로 둔다면 그때 범위를 넓힌다. 장부의 '구현하며 확인할 것'에 묶음 16 몫으로 한 줄 두기를 권한다.

## 5. 범위 밖 관찰

- LessonFollowCounts.prepWords(수, 설정값)와 TalkLessonState.prepWords(보인 낱말 목록)는 이름이 같다. 형이 달라 tsc 가 섞임을 막고 주석도 구분하므로 고칠 것은 아니다. 묶음 9 브리프에 '설정값 쪽을 넘긴다'를 한 줄 적어 두면 헷갈림이 줄어든다.
