# 코드 검토 보고: UI · UX 묶음 0-라 음성 층 감시 결과 셋(검토자 · Opus · xhigh, 2026-10-30 00:4x)

판정: **Approved** · Critical 0 · Important 0 · Minor 2. 범위는 구현 보고와 fix 1 보고가 적은 줄(types.ts · pace.ts 의 SpeakHeard · speakHeardOf · speakHeardOfAll · browser.ts 의 heard 두 자리 · paced.ts 모으기 · 시험)이다. 같은 파일의 1차 묶음 줄(speakWatchOf · timeout 기록 · ListenCallbacks)과 다른 묶음 변경은 판정하지 않았다. 시험은 다시 돌리지 않았다.

## 1. 설계 준수
- ✅ 세 갈래(R-48 · 정본 7절 33줄): 감시 끝냄 giveUp 이 `speakHeardOf({ started, endNotified: false })` 를 싣고(browser.ts:490-500) 정상 끝 onend 가 `endNotified: true` 를 싣는다(:511-516). started 는 이 발화의 onstart 가 늦은 알림 거름(:505) 뒤에만 켜진다(:506). 그래서 no-start 상한은 not_played, no-end 상한은 no_end, 정상 끝은 played 다. 시작 없이 끝만 온 발화는 컨트롤러 결정대로 not_played 다(pace.ts:53-62).
- ✅ 감시 동작 · 상한 · 기록 그대로: 상한은 speakWatchOf(설정 키 셋 speak_start_timeout · speak_end_extra · speak_chars_per_second)를 그대로 읽고(browser.ts:465), 타이머 거는 자리 · `type: "timeout"` 기록 · synth.cancel() 순서가 0-라 전과 같다. 이번 줄에서 새 숫자가 나오지 않았다(check:ids design-number 49 그대로).
- ✅ 끊김 · 오류에 heard 없음: cancelled 는 앱이나 다른 읽기 · 듣기가 끊은 것이라 재생 실패가 아니므로 맞다. error 는 kind 로 이미 정상과 갈리므로 형으로는 맞지만, 들려주지 못함 판정에서 빠지는 자리가 있다(M2).
- ✅ heard 필수 칸(fix 1 결정 1): types.ts:18 이 `{ kind: "ended"; heard: SpeakHeard }` 라 새 접점이 빠뜨리면 tsc 가 잡는다. src 안에서 ended 를 만드는 곳은 browser.ts · paced.ts 뿐이고, teacher.ts · speak-button.tsx 는 결과를 그대로 넘긴다.
- ✅ 모으기(fix 1 결정 2): speakHeardOfAll(pace.ts:69-73)이 모두 played → played, 모두 not_played → not_played, 그 밖 no_end, 빈 목록 played 다. R-57 '한 번도 들려주지 못함'은 not_played 하나에만 닿는다.
- ✅ 받는 화면 그대로(C166 R1 · 1차 묶음): src 에서 heard 를 읽는 곳이 아직 없고, 받는 쪽(tori.tsx:452-455 · follow-along · reading · speaking)은 kind 만 본다. paced 의 kind 도 0-라 전과 같다(마지막 문장이 ended 면 ended, 아니면 그 결과).
- ⚠️ 가운데 오류 섞임: 설계가 정하지 않은 자리이고, 지금 꼴은 문장 자리에 따라 값이 달라진다(M1).

## 2. 잘한 점
- 감시 결과를 시작 · 끝 알림 두 불값의 순수 함수로 두어, 음성 접점은 '시작이 왔나'만 들고 판정은 core 한 곳에서 한다.
- heard 를 필수 칸으로 바꾸며 범위 밖 시험에는 그 한 칸만 더했다(teacher-speech · speech-paced · speech-feedback, diff 확인).
- 가짜 음성 대본(neverStart · neverEnd)으로 실제 음성 접점이 세 값을 내는지 끝까지 잰다(fake-web-speech-defaults.test.ts:156-190). 상한은 시험용 설정에서 읽어 숫자를 박지 않았다.

## 3. 지적
Critical · Important 는 없다.

Minor
- **M1 paced 모으기가 끝나지 않은 문장(오류)의 자리에 따라 값을 바꾼다.** speakInTurn 은 끝나지 않은 문장 뒤에도 다음 문장으로 간다(pace.ts:143-149). paced 는 ended 문장만 모으고(paced.ts:40) 마지막 결과가 ended 일 때만 모은 값을 돌린다(:48-50). 그래서 [오류, 들려줌] 은 `played`(오류가 표시 없이 사라짐), [들려줌, 오류] 는 `error`(앞 문장을 들려준 것이 사라짐), [오류, 들려주지 못함] 은 `not_played` 다. 컨트롤러 결정의 '섞이면 no_end(들려준 것으로 보되 표시)'와 결이 어긋나고, 같은 지문이 오류 자리에 따라 기술 오류 기록이 달라진다. 지금은 heard 를 읽는 화면이 없어 아이 동작은 바뀌지 않는다. 5-나 전에 규칙을 정하길 권한다. 권하는 꼴은 '끝까지 갔고 한 문장이라도 ended 면, 오류 문장을 not_played 로 넣어 speakHeardOfAll, 하나도 ended 가 없으면 마지막 결과'이고, 그 갈래 시험(오류가 앞 · 뒤)을 더한다.
- **M2 시작 전에 오류로 끝난 발화가 '들려주지 못함' 갈래 밖에 있다.** onerror 는 started 와 관계없이 `{ kind: "error", code }` 를 돌린다(browser.ts:518-529). 정본 7절 33줄은 '시작 알림이 없는 발화는 들려주지 못함'이라 적는데, iPad 사파리에서 누름 없이 읽을 때 나는 not-allowed 처럼 소리가 안 난 대표 경우가 heard 없이 error 로 온다. 5-나 · 6 이 heard === "not_played" 만 보면 R-57 의 다시 듣기 안내 · 기술 오류 기록을 놓친다. error 에 시작 여부를 싣거나, 5-나 · 6 · 가르치고 plan 브리프에 'kind error 도 들려주지 못함으로 다룬다'를 적길 권한다(어느 쪽인지는 컨트롤러 결정).

## 4. 시험
- 세 갈래: 순수 함수 넷(끝만 온 경우 포함, speech-speak.test.ts:326-336), 음성 접점의 not_played · no_end · played(:273 · :300 · :312), 끝만 온 발화(:338-345), 오류 · 끊김에 heard 없음(:347-362).
- 모으기 네 갈래 + no_end 섞임(:366-373), paced 의 not_played → played 섞임 → no_end(:375-401), 모두 not_played → not_played(:403-426). 빈 목록은 순수 함수로만 재고, paced 의 `speak("")` 는 한 문장 길이라 접점 결과를 그대로 넘긴다(speech-paced 기대값 고침이 이를 단언).
- 빈 곳: paced 의 오류 섞임 갈래(M1)는 시험이 없다. 규칙을 정하면 함께 더한다.

## 5. 판정
**Approved.** 비차단: M1 · M2 는 5-나 시작 전에 컨트롤러가 규칙을 정하고(M1 은 paced.ts 고침과 시험 둘, M2 는 접점 고침 또는 5-나 · 6 브리프 한 줄), 그때 fix 로 넣길 권한다.
