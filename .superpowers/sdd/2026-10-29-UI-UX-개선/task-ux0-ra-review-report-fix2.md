# 재검토 보고: UI · UX 묶음 0-라 fix 2(검토자 · Opus · xhigh, 2026-10-30 01:2x, fix 라운드 2/3)

판정: **Approved** · ADDRESSED 2 · NOT ADDRESSED 0 · 새로 깨뜨린 것 없음. 범위는 fix 2 보고의 줄(types.ts · browser.ts onerror · pace.ts speakHeardOutcomeOf · paced.ts · 시험)뿐이다. lint 의 가져오기 차례 둘은 컨트롤러가 고친 범위 밖이라 보지 않았다. 시험은 다시 돌리지 않았다.

## 지적별
- **M1 ADDRESSED.** paced 가 끊긴 문장에서 멈추고(paced.ts:44 · :51 — alive 에 cut, 끝나면 :53 cancelled), 오류 · 읽을 수 없음 문장은 speakHeardOutcomeOf 값으로 모으며(:45), ended 가 하나라도 있으면 speakHeardOfAll, 없으면 마지막 결과다(:55-57). 그래서 [시작 전 오류, 들려줌] · [들려줌, 시작 전 오류] 가 모두 no_end 이고, 오류 자리에 따라 값이 바뀌지 않는다. 컨트롤러 규칙과 같다.
- **M2 ADDRESSED.** 오류 결과가 started 를 싣고(types.ts:21), 음성 접점 onerror 는 그 발화의 시작 알림 여부를 넣는다(browser.ts:528). speakHeardOutcomeOf(pace.ts:87-98)가 ended → heard, 오류 → 시작 전 not_played · 뒤 no_end, cancelled → no_end, unsupported → not_played 로 바꾼다. 받아들인 unsupported 갈래도 '소리가 나지 않음'이라 R-48 과 맞는다. 머리 주석(:83-86)이 '화면은 heard 를 직접 보지 않고 이 함수를 쓴다'고 적어 5-나 · 6 이 오류를 놓칠 길을 닫는다. pace.ts 의 SpokenOutcome 은 core 가 lib 형을 읽지 못해 둔 같은 꼴이고, 접점 결과에 새 갈래가 생기면 paced.ts:45 에서 tsc 가 잡는다.

## 시험 갈래
- 오류 앞 · 뒤: speech-paced.test.ts:135-140. 가운데 cancelled(멈춤 · 셋째 문장 읽지 않음): :142-149. ended 없음(마지막 결과 그대로): :151-160.
- 시작 전 오류(started 거짓): speech-speak.test.ts:190-204. 시작 뒤 오류(started 참) · 끊김: :353-365. 바꾸기 일곱 갈래: :437-463.
- 덧붙이면 좋은 것(비차단): paced 에서 [들려주지 못함 ended, 시작 전 오류] → not_played(R-57 '한 번도'와 이어지는 갈래)와 [시작 뒤 오류, 들려줌] → no_end. 둘 다 순수 함수 둘의 조합으로 이미 맞지만 paced 단에서는 단언이 없다.

## 받는 화면
- heard · started 를 읽는 화면은 아직 없고, 오류를 만드는 곳은 음성 접점 하나다. teacher.ts · speak-button.tsx 는 결과를 그대로 넘긴다. 결과 kind 는 paced 의 끊김 갈래 하나만 바뀌었다.
- 그 바뀜(접점이 문장을 끊으면 paced 도 멈춤)은 받는 화면에 이롭다. 전에는 말하기 세션에서 읽는 중 말하기를 누르면(paced.listen → 접점 listen 이 읽기를 끊음) paced 가 다음 문장을 읽었고, 접점 speak 가 듣던 것을 끊었다(browser.ts:438 activeListen.cancelNow("speak")). 이제는 듣기가 남아 7절 '읽는 중 누르면 읽기를 멈추고 듣는다'(C53 (2))와 맞는다. speaking.tsx:468 · reading.tsx:86 의 then 은 kind 를 보지 않아, 결과가 더 일찍 오는 것 말고 갈래가 바뀌지 않는다.

## 판정
**Approved**(fix 라운드 2 에서 닫힘). 비차단 덧붙임 시험 둘은 5-나 가 paced 결과를 처음 받을 때 같이 넣어도 된다.
