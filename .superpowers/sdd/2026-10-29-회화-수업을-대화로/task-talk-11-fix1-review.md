# 범위 한정 재검토: 회화 plan 묶음 11 fix 1(검토자 rev-talk-11 · Opus · xhigh, 2026-11-05)

판정: **Changes requested(fix 라운드 2/3로)**. 지난 지적 열하나(Important 다섯 · Minor 여섯)는 모두 ADDRESSED 다. 새로 든 Important 하나(N-1)가 남는다. 마무리 제안 e2e 두 건이 서버 규칙에 막혀 고르기 차례에 닿지 못한다. 이것은 1차 검토가 놓친 것이고(1차는 단언만 짚었다), 고칠 곳은 e2e 파일뿐이다. 코드 쪽은 고칠 것이 Minor 뿐이다.

확인한 것: fix 보고 `task-talk-11-fix1.md`, 지난 보고 `task-talk-11-review-report.md`, plan 보정 11-05 (12) · (13), 워크트리 p13d 의 `talk-frame.tsx` · `lesson-turn.ts` · `index.ts` · `page.tsx` · 시험 세 파일. 시험은 다시 돌리지 않았다.

## 1. 지난 지적

| 지적 | 판정 | 근거 |
|---|---|---|
| I-1 마무리 제안 뒤 말로 답하기 | ADDRESSED | `talk-frame.tsx:1724~1728` lessonChoiceSpeechOf 가 "suggestion" 만 참이다. `:2850~2851` 에서 그때 ChildTurn 을 두 버튼과 함께 그린다. 마무리 물음은 두 버튼만이다(02-2 294줄). 턴 길은 고르기 차례의 아이 행을 거절하지 않고 고르기를 끝낸다(`lesson-flow.ts:254~257`). 단위 `talk-follow.test.ts:709` 가 있다. e2e 증명은 N-1 때문에 아직 서지 않는다 |
| I-2 둘째 막힘부터 힌트 다 열기 | ADDRESSED | 서버는 더하기만이다. 끝 줄 `lesson-turn.ts:242~243` · `:1297`, 화면 자료 `index.ts:2544~2582`(positionViewOf 를 내보냄)이다. 틀은 어림 셈을 걷고 `dontKnowCount={position.stuckInSlot}`(`talk-frame.tsx:2861`)을 넘기며, 끝 줄이 그 칸을 옮긴다(`:2317`). 단위 `talk-lesson-view-fields.test.ts:83~117` 이 있다 |
| I-3 1~3단계 그림 턴 | ADDRESSED | `lesson-turn.ts:250~263` lessonImageKeyOf(turnImages 일 때만) · 끝 줄 `:1298`, `index.ts` currentOf 의 imageKey 가 있다. 틀은 1~3단계에서 view.pictures 의 그림을 말풍선 옆에 둔다(`talk-frame.tsx:2634~2636` · `:2815`, 조각 `tori.tsx` 의 picture 속성과 TurnPicture 는 파일이 있을 때만 그림). ⚠️ 다음 턴이 흐르는 동안 앞 그림이 남는다(N-2) |
| I-4 정리 기록 반짝임 | ADDRESSED(동작) | 정리 차례에 기록 칸을 두고(`talk-frame.tsx:2729~2739`), 오늘 만난 단어가 든 아이 인식 글 줄에 data-wrap-shine 을 달아 한 번 반짝인다(`:1771~1841`). 꼴은 plan 보정 (13)대로 UI · UX 묶음 6 이다. 남은 다듬기는 N-4 에 적었다 |
| I-5 '소리가 안 나와서 글로 봐요' | ADDRESSED | soundlessStepOf(`talk-frame.tsx:1748~1758`)를 onSpoken(`:1980`)이 부르고, 세션 셈을 비우지 않고 쌓아 `soundless={{ …, noticeMs: speech.skipNoticeMs }}`(`:2818~2821`)로 넘긴다. 둘째부터 무음 모드 줄(보정 (12))은 조각이 본다 |
| M-1 끊긴 아이 말 기록 | ADDRESSED | 다시 보낼 때 childLogEntryOf 를 기록에 더한다(`talk-frame.tsx:2047~2058`). ⚠️ 들리지 않음 행이면 잘못 표시된다(N-3) |
| M-2 행 번호 어림 | ADDRESSED | 끝 줄 turnNo(`lesson-turn.ts:1300`)를 틀이 그대로 쓴다(`talk-frame.tsx:2305`) |
| M-3 쪽 갈래 경합 | ADDRESSED | `page.tsx:72~73`. ⚠️ catch 가 모든 오류를 소리 없이 삼킨다(N-5) |
| M-4 단언 셋 | ADDRESSED | `talk-follow.test.ts:461` toBe(1), e2e `talk-lesson.spec.ts:270` 말풍선에 대해 단언, `:522` 이름을 본문대로 줄였다 |
| M-5 들려준 소리 줄만 | ADDRESSED | 받은 소리 줄에 쌓기 전 줄 차례를 싣는다(`talk-frame.tsx:2374~2378`, ref 셈은 lessonBubbleStep 이 s · add · sound 마다 한 줄 더하는 것과 맞음). 들려준 줄만 모아(`:1739~1746` · `:1979`) `childHeardOf(playedSoundsOf(bubble, played))`(`:2772`)로 넘기고, 새 말풍선 · 새 시도마다 비운다 |
| M-6 이어 열면 설명 사라짐 | ADDRESSED | current.explanation(`index.ts` currentOf)을 열 때 · 토막 넘김 뒤 보인다(`talk-frame.tsx:1895~1897` · `:2166`) |

## 2. 구현자 우려 1의 판정 — 둘째 막힘 e2e 의 가정은 맞다

e2e `talk-lesson.spec.ts:486~520` 의 가정은 서버 길과 맞는다. 말 입력 턴에서 응답 첫 칸 stuck 이 참이면 막힘 계획을 고르고(`talk-lesson.ts` chosenCallTurnOf), 그 아이 행을 막힘으로 저장한다(`lesson-turn.ts:354` · `:1844`). 그다음 lesson-flow 가 같은 자리의 막힘을 하나 더한다(`lesson-flow.ts:218~222`). 받침 첫째 · 둘째 선생님 행은 move.stage 로 지금 자리를 잇는다. move.stage 는 앱이 정하고 가짜 응답의 support 칸이 아니므로, 첫 막힘(단추) 뒤 1, 둘째 막힘(말) 뒤 2 가 된다. 2 는 OPEN_ALL_HINTS_FROM_DONT_KNOW(`hints.ts:34`) 이상이라 다음 아이 차례에 문장 단까지 열린다. 첫 막힘 뒤 data-hint-tier 0 개라는 단언도 맞다.

## 3. 새로 든 것

### Important

**N-1 마무리 제안 e2e 두 건이 고르기 차례에 닿지 못한다(1차 검토에서 놓침).** 두 시험은 `talk-lesson.spec.ts:249~280` 과 `:282~316` 이다. 대화 첫 턴 한 번 뒤 가짜 응답에 next_move "closing" 을 주고 `[data-talk-choice]` 가 보이기를 기다린다. 그런데 서버 정규화는 카드 기회를 다 다루지 않은 턴의 갈래 마무리를 "none" 으로 바꾼다(`src/core/ai/calls/talk-lesson.ts:1255`, 검증 `:1369`, plan 정한 것 11). 다 다룸은 남은 필수 질문이 없고 새 단어마다 다시 쓰기가 찼을 때만 참이다(`src/core/conversation/chances.ts:157~160`). 견본 카드는 필수 질문이 새 단어 수만큼이고(`tests/fixtures/seed/builders.ts:2421~2424`, 1~3단계 unit.new_words_per_lesson 5 — `seed/settings.json:7`), 한 턴 뒤에는 남은 필수 질문이 있다. 그래서 두 시험 모두 첫 실행(묶음 14 · CI)에서 고르기 차례를 기다리다 실패하고, AC-15t (다)와 I-1 의 Playwright 증명이 서지 않는다. 고칠 길(이 파일만, 하나를 고름):
- (가) 그 두 시험에서 '다 다룸' 상태로 연다. e2e DB 에 앞 턴 행을 넣거나, 기회가 한 턴에 닫히는 견본(필수 질문 하나 · 다시 쓰기 0 인 집 설정)을 만든다. AC-15t (다)가 말하는 표본이 이 꼴이다.
- (나) 두 시험을 test.fixme 로 두고 까닭을 적는다. 묶음 14 의 고정 표본 실호출 점검이 (다)를 증명하게 장부에 한 줄 남긴다. I-1 의 화면 조건은 단위(`talk-follow.test.ts:709`)가 이미 본다.

### Minor

- **N-2 새 턴이 흐르는 동안 앞 턴의 그림 · 받침 설명이 남는다.** imageKey · explanation 은 끝 줄과 토막 넘김에서만 바뀐다. 새 시도(onAttempt `talk-frame.tsx:2440~2450`)와 보내기(onChildSend `:2473~`)에서는 비우지 않는다. 그래서 같이 말하기 뒤 아이가 답하면, 새 반응이 흐르는 몇 초 동안 앞 질문의 한국어 설명과 그림이 새 말풍선에 붙어 보인다. onAttempt 에서 둘을 비운다.
- **N-3 들리지 않음으로 끊긴 행을 다시 보내면 기록에 '잘 모르겠어요'로 남는다.** 화면 자료 retryTurn 에 nospeech 가 없어서(`index.ts:2607~2611`) 틀이 `{ mode: "dont_know" }` 로 기록 줄을 만든다(`talk-frame.tsx:2049~2057`). 회색 '못 들었어요'여야 한다(03 94줄 · 100줄). retryTurn 에 nospeech 를 더하기만으로 싣고 기록 줄 · 다시 보낼 입력에 넣는다.
- **N-4 정리 반짝임의 남은 다듬기.** 대부분 UI · UX 묶음 6 과 함께 볼 일이다.
  - (가) 움직임 줄이기면 표시가 하나도 없다. motion-safe class 만 달아서다(`talk-frame.tsx:1815`). data-wrap-shine 에 멈춘 강조 꼴을 둔다.
  - (나) 낱말 맞춤이 끝 s · es 만 본다(`:1761~1769`). 화면 자료에 단원 단어 꼴 목록 lemmaEntries(`index.ts:2619`)가 이미 있으니 그것을 쓴다. 3단계 단원 1 오늘 쓸 말 eat · go · come 은 ate · went · came 을 놓친다.
  - (다) '스스로 한 말' 가르기는 꼴이 아니라 자료(기록 아이 행의 힌트 종류)가 필요하다. UI · UX 묶음 6 에 넘길 때 서버 칸 몫이 함께 간다고 장부에 적는다.
  - (라) '그만하기'로 정리에 갈 때 지금 말풍선을 기록에 올리지 않아(`:2527~` stop), 정리 기록 칸에 마지막 선생님 말이 없다.
- **N-5 쪽 갈래의 catch 가 오류를 소리 없이 삼킨다.** `page.tsx:72~73`. 옛 꼴 카드 규격 결함 같은 진짜 오류도 기록 없이 수업 목록으로 간다. 오류 이름만 console.error 로 남긴다. 묶음 12 가 이 길을 지우면 사라진다.

## 4. 범위 밖 관찰

- 묶음 14 눈 점검(fix 보고 '넘길 것')에 N-2 장면을 더한다. 같이 말하기 뒤 답했을 때 앞 설명 · 그림이 남는지 보는 것이다.
- 묶음 12 지울 것은 fix 보고 61줄이 맞다.

## 5. 라운드 판정

**Changes requested(fix 라운드 2/3).** N-1 하나만 Important 이고 e2e 파일만 고친다. Minor N-2 · N-3 · N-5 는 같은 fix 에 묶기 좋다. N-3 은 retryTurn 칸 하나 더하기라 서버 더하기만이다. N-4 는 UI · UX 묶음 6 넘김으로 장부에 둬도 된다. 다음 재검토는 N-1 과 그 fix 가 건드린 줄만 본다. 컨트롤러가 (나)를 고르면 시험 표지 · 장부 한 줄만 확인하면 되므로, 컨트롤러가 직접 하고 재검토 없이 닫아도 된다.
