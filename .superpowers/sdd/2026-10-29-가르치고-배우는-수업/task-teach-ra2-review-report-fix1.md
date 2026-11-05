# 재검토 fix 1: 묶음 라-2(I1 · M1 · M2, 범위 한정) — 2026-10-30, 검토자 Opus · xhigh

판정: **Approved** (NOT ADDRESSED 0). M3(화면 검토) · M4(지금 규칙 유지)는 지시대로라 보지 않았다. 직접 확인한 것은 둘이다. 단위 넷(teach-frame · ux-progress · reading-teach · writing-teach)은 53 통과이고, 바뀐 파일 열의 biome check 오류는 0 이다(04:02).

## 지적별
- **I1 ADDRESSED.** 짝 틀림 '왜' 화면의 '다음'은 그 '왜' 줄의 onLineEnd 가 올 때까지 흐리다. 읽기는 `src/components/session/reading.tsx:497 · :650~655 · :679~684`, 쓰기는 `src/components/session/writing-items.tsx:196 · :360~377` 이다. onLineEnd 는 세션 틀 셈(teach.onLineEnd)을 먼저 부르고 spareWhyDone 을 켠다.
  - 라-1 readTeachLine 은 줄이 멈출 때 onEnd 를 한 번 부른다. 다 읽음 · 들려주지 못함(not_played) · 끊김 · 읽지 않음(skipped) 모두가 멈춤이므로, 소리가 안 나도 밝아져 막다른 화면이 없다. 이는 spec 설계 5('왜' 화면 단추는 읽기 뒤 밝음)와 설계 10(어느 경우에도 갇히지 않음)에 맞는다.
  - '왜' 줄이 없는 짝, 혼자 문항의 정답 보기 · 맞음의 '다음'은 그대로 바로 밝다. 이 갈래들은 '왜' 화면이 아니므로 맞다.
  - 시험: reading-teach · writing-teach 'AC-3d 짝도 틀린 왜 화면의 다음은 … 읽기 전에는 흐리고 …'가 흐림(disabled), 짝 맞음 · 정답 보기의 밝음을 단언한다. 줄이 끝난 뒤 밝아지는 갈래는 정적 그림이라 단위로는 못 보고, e2e teach.spec(정적, '다음'이 밝아지기를 기다림)과 라-1 readTeachLine 시험이 덮는다.
- **M1 ADDRESSED.** progressHiddenOf(`src/core/session/teach-frame.ts:94~103`)는 혼자 해 보기를 다 끝낸 뒤의 skip 을 돌려준다. activityGroupsOf 의 넷째 인자 hidden(`src/core/session/progress.ts:143 · :150`)은 그 활동을 칸 · 묶음에서 뺀다. 그래서 끝난 뒤 '스스로 해 보기'는 낸 짝만 센다(plan 위험 9). 혼자 해 보기 도중에는 짝 칸을 그대로 두는데, 이는 받아들일 만하다. plan 정한 것 3 은 짝 활동을 목록에 늘 두고 낼 짝은 sparesToShow 가 혼자 첫 시도 결과로 정한다고 하므로, 결과가 다 모이기 전에는 어느 짝을 낼지 알 수 없다. 그동안 짝 칸을 '아직'으로 두는 것은 사실과 어긋나지 않는다. 라-3 뒤 말하기(짝 열여덟)에서 도중 막대가 길었다가 줄어드는 모습은 화면 검토에서 본다.
  - 부르는 곳: activityGroupsOf 를 부르는 곳은 session-frame.tsx:1614 하나다. teach 없는 수업은 progressHidden 이 undefined 라 기본값(빈 모음)이 쓰이고 5-가 막대는 그대로다(ux-progress 'hidden 을 주지 않으면 지금 그대로' 단언).
- **M2 ADDRESSED.** teachNoticesAfter(`teach-frame.ts:125~133`)는 TeachNotices.shown 으로 세션에 한 번만 더한다. 두 번째 안내에서 켜고, 켜진 동안의 안내는 그대로 두며, 소리가 난 줄이 끝나면 거둔다. 거둔 뒤의 세 번째 · 네 번째 안내에는 다시 켜지 않는다. 이는 spec 설계 10 '두 번 나오면 … 한 번 더한다'와 맞는다. 시험(teach-frame 'AC-N20 … 다시 붙지 않는다')은 안내 · 소리 차례에 따른 silent 값 목록 [false, false, true, false, false]와 shown 을 단언한다.

## 새로 깨뜨린 것
없음. 혼자 문항 '왜'(WhyBubble 안 다시 단추)와 teach 없는 수업의 흐름은 그대로다. 무음 모드 줄 셈의 입력(여섯 조각의 onLineEnd)도 바뀌지 않았다.

## 라운드 판정
fix 1 로 Approved. 다음 fix 라운드는 필요 없다. e2e · 통합은 CI 첫 실행에서 확인한다(⚠️).
