# 구현 보고: 회화 plan 묶음 11 fix 2(구현자 impl-talk-11 · Opus · high, 2026-11-05, fix 라운드 2/3)

상태: DONE. 재검토 `task-talk-11-fix1-review.md` 의 N-1(Important)과 아이에게 보이는 Minor 둘(N-2 · N-3)을 고쳤다. 컨트롤러 결정 (가)대로 e2e 두 건은 견본을 바꿔 고쳤고 정적이다(돌리지 않음). e2e 파일은 그 자리만 바꿨고 묶음 10 덩이(566줄)는 그대로다. 커밋 · push 는 하지 않았고 개발 DB 에 쓰지 않았다.

## 고친 것

| 지적 | 고친 곳 | 한 일 |
|---|---|---|
| N-1 마무리 제안 e2e 두 건이 고르기 차례에 닿지 못함 | `tests/e2e/talk-lesson.spec.ts` allChancesLesson · openLesson 의 lesson 칸 · 두 시험 | 두 시험을 '카드 기회 다 다룸' 견본으로 연다. 필수 질문은 첫째 하나, 새 단어는 빈 목록이다. 마무리 제안 말과 그 뒤 반응 말에서 물음표를 뺐다. openLesson 셋째 칸은 선택이라 묶음 10 덩이의 부름은 그대로다 |
| N-2 새 턴이 흐르는 동안 앞 턴 그림 · 설명이 남음 | `talk-frame.tsx` 흘려 받기 onAttempt | 새 시도마다 그림 키 · 한국어 설명을 비운다. 그 턴의 값은 끝 줄이 다시 싣는다 |
| N-3 들리지 않음 행을 다시 보내면 '잘 모르겠어요'로 남음 | `index.ts` LessonRetryTurn · lessonRetryTurnOf(내보냄, 화면 자료 retryTurn), `talk-frame.tsx` 열 때 다시 보내기 | 끊긴 아이 행이 들리지 않음이면 retryTurn 에 nospeech 를 싣는다(lessonTurnOf 와 같은 판정 — client_listen src nospeech). 틀은 같은 입력 `{ mode: "dont_know", nospeech: true }` 로 다시 보내고, 기록은 회색 '못 들었어요'가 된다 |

## N-1 견본이 서버 규칙과 맞는지(코드로 확인)

1. **갈래 '마무리'를 받는 조건.** 정규화는 그 턴의 allChancesUsed 가 참일 때만 next_move closing 을 남긴다(`src/core/ai/calls/talk-lesson.ts:1255`). 그 값은 `chances.allDealt` 다(`:428`).
2. **다 다룸 조건.** `src/core/conversation/chances.ts:157~160` 은 남은 필수 질문 없음 · 남은 미션 없음 · 새 단어마다 다룬 수 ≥ 1 + reaskPerWord 다.
   - 필수 질문은 선생님 행 가운데 자리를 여는 행의 move.item 이 required 면 다룬 것이다(`:125~127`). 대화 첫 질문 행이 required 1 을 연다.
   - 견본은 필수 질문이 첫째 하나라, 아이가 첫 질문에 답하는 턴에 남은 필수 질문이 0 이다.
   - 새 단어 조건은 `newWords.every(…)` 라 빈 목록이면 참이다.
   - 3단계 견본 카드에는 미션이 없다.
3. **고르기 차례가 되는 조건.** 위치 되짚기는 마지막 선생님 행 move.next 가 closing 이고 closing_slot 이 아니면 choice "suggestion" 이다(`src/core/conversation/lesson-flow.ts:312~313`).
4. **카드 자리로 바뀌지 않는 조건.** 끝 처리(`src/server/conversation/lesson-turn.ts` settleLessonTurn, 970~1020줄 근처)는 다음 경우에만 그 턴을 카드 자리로 바꾼다.
   - 잡아 둔 물음표 문장이 1~3단계 질문 검사나 같은 질문에 걸린 경우.
   - 끊김 · 실패 줄인 경우.
   - 정상 응답에 물음표 문장이 없으면 바꾸지 않는다. 그래서 갈래가 남는다.
   - 앞 시험의 'Shall we stop here?'는 'stop' 이 3단계 범위 밖이라(묶음 8 시험 ALLOWED3 주석) 질문 검사에 걸려 카드 자리(갈래 none)가 될 수 있었다. 물음표 없는 말로 바꿨다.
5. **'더 이야기하기'가 붙이는 줄.** 다시 쓰기 남은 낱말이 없으면 lessonMoreOf 는 가장 오래전에 쓴 더 이야기할 거리를 고른다. 아직 안 쓴 것 가운데 첫째(more[0])이므로 시험의 `card.more[0].en` 단언과 맞다.
6. **견본의 다른 칸.** 짧은 준비 낱말은 카드 prep 칸 그대로라 throughGreetingAndPrep 의 차례(인사 → 쪽지 → 대화 첫 질문 required[0])가 같다.

## 시험

- 먼저 실패를 본 것: `tests/unit/talk-lesson-view-fields.test.ts` 새 시험 'AC-15s 들리지 않음으로 끊긴 행은 nospeech 를 실어 다시 보낸다 …'(함수 없음 1건). 고친 뒤 통과했다.
- N-2 는 틀 안 상태 두 줄이라 단위 시험을 두지 않았다. 묶음 14 눈 점검 항목으로 넘긴다(아래).
- e2e 두 건(정적)은 견본 · 말만 바꿨고, 단언(두 버튼 · 말하기 단추 · 고정 대사 없음 · AI 없이 더 이야기할 거리 · 말로 답하면 보통 턴)은 그대로다.

## 관문(Node 24, 출력은 스크래치패드 `t11f2-*.txt`)

| 명령 | 결과 |
|---|---|
| `pnpm biome ci` | 0 |
| `pnpm exec tsc --noEmit -p .` | 0 |
| `pnpm vitest run --project unit` | 0, 145 파일 · 1862 통과 · 6 todo |
| `pnpm check:deps` | 위반 0 |
| e2e | 돌리지 않음(정적) |

## 설계와 다르게 한 것

- 화면 자료 retryTurn 에 nospeech 칸을 더했다(index.ts, 더하기만 — 재검토가 '서버 더하기만'으로 적은 길). 묶음 8 · 9 시험은 그대로 통과한다.

## 넘길 것

- **묶음 12:**
  - 쪽 갈래의 catch 가 오류를 소리 없이 삼킨다(N-5, `page.tsx` talkViewOf). 옛 갈래를 지울 때 함께 사라진다. 남긴다면 오류 이름을 console.error 로 남긴다.
  - 정리 반짝임 다듬기(N-4):
    - (가) 움직임 줄이기에서도 보이는 멈춘 강조 꼴을 둔다.
    - (나) 낱말 맞춤에 화면 자료 lemmaEntries(꼴 목록)를 쓴다. ate · went · came 을 지금은 놓친다.
    - (다) '스스로 한 말' 가르기에는 기록 아이 행의 힌트 종류 칸(서버)이 필요하다.
    - (라) '그만하기'로 정리에 갈 때 지금 말풍선을 기록에 올린다.
  - 컨트롤러 지시대로 N-4 · N-5 는 묶음 12 로 넘긴다. (가) · (다)의 꼴 몫은 UI · UX 묶음 6 과 함께 본다.
- **묶음 14 눈 점검:**
  - 같이 말하기 뒤 아이가 답했을 때 새 반응이 흐르는 동안 앞 설명 · 그림이 사라지는지(N-2).
  - 들리지 않음으로 끊긴 턴을 이어 열었을 때 기록이 회색 '못 들었어요'인지(N-3).

## 우려

1. e2e 두 건은 여전히 돌리지 않았다. 견본은 서버 코드 대조로 맞췄지만, 첫 실행(묶음 14 · CI)에서 처음 확인된다.
