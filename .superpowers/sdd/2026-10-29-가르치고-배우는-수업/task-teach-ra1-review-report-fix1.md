# 재검토 fix 1: 묶음 라-1(I1 · M1 · M3 · M4, 범위 한정) — 2026-10-30, 검토자 Opus · xhigh

판정: **Approved** (NOT ADDRESSED 0). M2(움직임 시범)는 지시대로 화면 검토 판정 항목이라 보지 않았다. 시험 두 파일은 직접 돌렸다(53 통과, 03:14).

## 지적별
- **I1 ADDRESSED.** 여섯 조각이 모두 useTeachLine 호출 안에서 `onEnd: onLineEnd` 로 잇고, prop 타입은 `onLineEnd?: (end: TeachLineEnd) => void` 다. 호출 자리를 하나씩 확인했다.
  - TodayScreen: `today.tsx:86`
  - NewWordsScreen: `show.tsx:181`
  - ModelScreen: `show.tsx:337`
  - WhyBubble: `why-bubble.tsx:78`
  - FirstLine: `spare-intro.tsx:48`
  - TogetherFrame: `together.tsx:179`(옛 `() => void` 를 고침)

  readTeachLine(`teacher-line.tsx:189`)은 멈출 때(:211~214) onEnd 를 한 번 부르고, notice 는 teachLineStateOf 의 notice 다. 그래서 not_played 일 때만 참이고 played · no_end · skipped · cancelled 는 거짓이다. 0-라 SpeakHeard 갈래와 같다(no_end · cancelled 의 거짓은 teach-line 시험 'AC-N20 읽기가 끝나면 …' · '… cancelled …'이 상태 함수에서 단언). 화면이 바뀌면(alive 거짓) 알리지 않는다. 시험(`tests/unit/teach-pieces.test.ts`의 'AC-N20 오늘 배울 것이 들려주지 못함 …' 이하 넷)은 `ends` 배열 전체를 `toEqual([{ notice }])` 로 비교하므로, 값과 '한 번'을 함께 단언한다. '왜'의 not_played · played · skipped 세 갈래, alive 거짓의 빈 배열, 들려주지 못하면 영어 토막을 읽지 않음(calls 1)도 단언한다. 조각 여섯의 잇기 시험은 소스 훑기라, 실제 불림은 라-2 e2e(AC-N20 Playwright 몫)가 덮는다(구현자 우려 1). 위 호출 자리 확인으로 지금 판정에는 충분하다.
- **M1 ADDRESSED.** 같이 해 보기 글 textEn 은 teacher_en(`together.tsx:59`)이고, 이야기 storyEn 은 material 그대로다(:55). 설계 4 목소리 표(같이 해 보기 문장 = 선생님 영어, 이야기 = 글 자료)와 맞는다. 시험의 읽는 토막 기대도 teacher_en 으로 고쳤다.
- **M3 ADDRESSED.** ChipSentence 의 `<p>`(`chips.tsx:143`)에서 lang 을 뺐다. lang="en" 은 칩 영어 덩어리(:70)와 칩 밖 영어 조각(:164)에만 남았다. 칩 이름표 span 은 lang="ko"(:82)다. 시험 'AC-3g 영어 덩어리만 lang en 이고 칩 이름표는 lang ko 다'가 이를 단언한다.
- **M4 ADDRESSED.** koreanCountOf(`teacher-line.tsx:66`)가 1~99 를 우리말 수로 읽는다(열하나 · 스물 · 스물셋). 조사는 끝 글자 받침으로 고르므로 '다섯이에요' · '열하나예요' · '스물이에요'로, 문구 표의 '다섯이에요'와 같은 꼴이다. 1~10 의 글은 전과 같다. 100 이상은 숫자 글인데, 설정(new_words_per_lesson ≤ 5)으로는 닿지 않는다.

## 새로 깨뜨린 것
없음. readTeachLine 으로 꺼낸 읽기 차례는 옛 효과 안 고리와 같은 상태 함수 · 같은 목소리 갈래를 쓴다. 기존 47 시험은 그대로 통과한다.

## 라운드 판정
fix 1 로 Approved. 다음 fix 라운드는 필요 없다.
