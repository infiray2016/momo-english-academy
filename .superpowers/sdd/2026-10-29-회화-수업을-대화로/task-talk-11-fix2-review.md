# 범위 한정 재검토: 회화 plan 묶음 11 fix 2(검토자 rev-talk-11 · Opus · xhigh, 2026-11-05)

판정: **Approved(라운드 2/3에서 닫음)**. N-1 · N-2 · N-3 은 ADDRESSED 다. 새로 깨진 것은 없다. N-4 · N-5 는 컨트롤러 결정으로 묶음 12 에 넘겼고, fix 보고 '넘길 것'(52~59줄)에 받는 값이 적혀 있다.

확인한 것: fix 보고 `task-talk-11-fix2.md`, 지난 재검토 `task-talk-11-fix1-review.md`, 워크트리 p13d 의 `tests/e2e/talk-lesson.spec.ts` · `talk-frame.tsx` · `index.ts`, N-1 대조에 쓴 서버 · 흐름 코드(`talk-lesson.ts` · `chances.ts` · `lesson-flow.ts` · `lesson-turn.ts` · `state.ts` · 수업 규격). 시험은 다시 돌리지 않았다.

## 1. 지난 지적

| 지적 | 판정 | 근거 |
|---|---|---|
| N-1 마무리 제안 e2e 두 건 | ADDRESSED | 아래 2절. 두 시험이 `allChancesLesson()` 견본으로 연다(`talk-lesson.spec.ts:68~77` · `:277` · `:316`). 단언(두 버튼 · 아이 차례 · 말풍선에 고정 대사 없음 · AI 없이 더 이야기할 거리 · 말로 답하면 보통 턴)은 그대로다 |
| N-2 새 턴에 앞 그림 · 설명이 남음 | ADDRESSED | 새 시도마다 그림 키와 받침 설명을 비운다(`talk-frame.tsx` onAttempt 의 setImageKey(undefined) · setExplanation(undefined)). 그 턴 값은 끝 줄이 다시 싣는다(applyEnd). 쉼 · 쉬어 감 · 닫힘 줄은 말풍선을 새로 그리므로 비운 채가 맞다 |
| N-3 들리지 않음 행 다시 보내기 | ADDRESSED | 화면 자료 retryTurn 이 이름 있는 형 LessonRetryTurn 이 됐고 nospeech 칸이 더해졌다(`index.ts:2625~2647`, 더하기만 — 판정은 lessonTurnOf 와 같음). 틀은 같은 입력 `{ mode: "dont_know", nospeech: true }` 로 다시 보내고 기록 줄도 그 입력으로 만든다(`talk-frame.tsx:2047~2065`). 그래서 회색 '못 들었어요'로 남는다. 단위 `talk-lesson-view-fields.test.ts:134~` 가 먼저 실패한 뒤 통과했다 |
| N-4 정리 반짝임 다듬기 | 넘김(묶음 12) | 컨트롤러 결정이다. 넷((가) 움직임 줄이기 · (나) lemmaEntries · (다) 스스로 한 말의 서버 칸 · (라) 그만하기 때 말풍선 올리기)이 fix 보고 54~59줄에 그대로 있다 |
| N-5 쪽 갈래 catch | 넘김(묶음 12) | fix 보고 53줄. 옛 갈래를 지울 때 함께 사라진다 |

## 2. N-1 견본이 서버 규칙과 맞는지(보고 13~28줄 대조)

보고의 여섯 대조는 코드와 맞다.
1. **갈래 마무리.** 정규화는 allChancesUsed 가 참일 때만 closing 을 남긴다(`talk-lesson.ts:1255`). 그 값은 chances.allDealt 다(`:428`).
2. **다 다룸.** 기회 셈의 새 단어는 수업 칸 `lesson.newWords` 다(`state.ts:1544` · `lesson-input.ts:133` · `lesson-flow.ts:915~917`). 견본은 그 칸을 빈 목록으로 두므로 새 단어 조건이 참이다.
   - 수업 규격은 빈 새 단어 목록을 받는다(`src/core/seed/schema/lesson.ts:68~69`, 다지기 · 보강과 같은 꼴). 카드 규격은 필수 질문 하나 이상만 요구한다(`src/core/seed/schema/talk.ts:235`). 그래서 서버가 견본을 읽다 던지지 않는다.
   - 대화 첫 질문 행이 required 1 을 열어 다룬 것이 된다(`chances.ts:125~127`). 필수 질문이 하나뿐이라 아이가 첫 질문에 답하는 턴에 남은 필수 질문이 0 이다. 3단계 카드에 미션은 없다.
3. **고르기 차례.** 마지막 선생님 행 move.next 가 closing 이면 choice "suggestion" 이다(`lesson-flow.ts:312~313`).
4. **카드 자리로 바뀌지 않음.** settleLessonTurn(`lesson-turn.ts:949~`)은 잡아 둔 물음표 문장이 질문 검사 · 같은 질문에 걸릴 때와 끊김 · 한 줄 결과일 때만 카드 자리로 바꾼다. 정상 응답에 물음표 문장이 없으면 바꾸지 않아 갈래가 남는다. 앞 판의 'Shall we stop here?'는 물음표 문장이라 3단계 질문 검사를 거쳐야 했다. 지금 판은 'We can stop here.' 와 'Okay! Let's talk more.' 라 그 길을 타지 않는다.
5. **짧은 준비.** 준비 낱말은 카드 prep 칸에서 고르므로(`chances.ts` startPrepWordsOf) 견본도 인사 → 쪽지 → 대화 첫 질문 차례가 같다.
6. **'더 이야기하기'.** 남은 필수 질문 · 다시 쓰기가 없으면 아직 안 쓴 더 이야기할 거리를 고르므로(`index.ts:1794~` lessonMoreOf), `card.more[0]` 단언과 맞다.

남은 위험은 보고 우려 1 그대로다. 두 시험은 첫 실행(묶음 14 · CI)에서 처음 확인된다.

## 3. 새로 깨뜨린 것

없다. 서버 두 칸(retryTurn nospeech · 형 이름)은 더하기만이고, 옛 꼴 화면 자료의 retryTurn(`index.ts:450~454`)은 그대로다. e2e 파일은 견본 함수 · openLesson 의 선택 칸 · 두 시험만 바뀌었고, 다른 부름은 셋째 칸 없이 그대로다.

## 4. 범위 밖 관찰

- 묶음 14 눈 점검에 fix 보고 61~62줄 두 장면을 더한다. 하나는 같이 말하기 뒤 답할 때 앞 설명 · 그림이 사라지는지, 다른 하나는 들리지 않음으로 끊긴 턴을 이어 열 때 회색 '못 들었어요'인지다.
- 장부에는 N-4 (다)를 'UI · UX 묶음 6 꼴 + 서버 칸(기록 아이 행 힌트 종류)'으로 적어 주인이 둘임을 남긴다.

## 5. 라운드 판정

**Approved.** 묶음 11 을 닫아도 된다. 전체 관문(통합 · e2e 포함)은 컨트롤러가 돌린다.
