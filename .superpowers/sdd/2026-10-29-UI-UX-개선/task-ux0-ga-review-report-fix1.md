# 재검토 보고: UI · UX 묶음 0-가 fix 1(검토자 · Opus · xhigh, 2026-10-30, fix 라운드 1/3)

판정: **Approved** · ADDRESSED 5 · NOT ADDRESSED 0 · 새로 생긴 것 Minor 1. 범위는 fix 1 보고가 적은 줄뿐이고, 같은 워크트리의 0-나 · 0-라 · 0-다 변경은 판정하지 않았다. 시험은 다시 돌리지 않았다.

## 지적별
- **M1 ADDRESSED.** lesson-board.tsx:116-124 의 selectionKeptOf 가 오류 줄 또는 쉼 글이면 거짓이고, 효과(:194-196)가 그때 고른 표시를 지운다. 다시 누르면 choose(:185)가 표시를 켜고 busy 로 쉼 글이 숨는 동안은 남으며, 또 쉬면 다시 지운다. 위 칸 '첨삭 보기'(:304-308)도 같은 효과를 탄다.
- **M2 ADDRESSED.** runAiRestRetry 가 던짐을 "failed" 로 돌려주고(ai-rest.tsx:62-67), useAiRestRetry 가 aiRestTroubleOf 로 있는 글(LESSON_START_TEXT.offline · failed)을 싣고(:84-97), AiRest 가 still 과 따로 오류 한 줄을 그린다(:180-184). 세션 · 회화 틀은 이 훅을 쓰고, 결과 · 마무리는 원래 use-lesson-start 의 status 줄이 실패를 보이므로(result-view.tsx:235 · closing-cards.tsx:367) 쉬는 화면 넷 모두 끊김이 '아직 쉬고 있어요'로 보이지 않는다. 새 문구는 없다.
- **M3 ADDRESSED.** home-cards.tsx:405-410 micRecheckPressOf 와 MicRecheck(:418-487)가 읽기 실패면 단추를 켠 채 오류 한 줄(data-mic-recheck-trouble)을 보이고, 누르면 attempt 를 늘려 다시 읽는다. 단추가 꺼지는 때는 읽는 중과 확인 중뿐이다. 다시 읽은 뒤 확인은 한 번 더 눌러야 하는데, iPad 에서 인식 시작을 누름 처리 안에 두려면 맞는 꼴이다.
- **M5 ADDRESSED.** takeRestResend(talk-frame.tsx:295-306)가 멈춘 턴을 꺼내며 listenEndedAt 을 비우고, 쉼 풀림(:360)이 이를 쓴다. 다시 보낸 턴의 첫 문장에서 perceivedWaitOf 가 undefined 를 돌려 다음 턴에 prevPerceivedWaitMs 가 실리지 않는다(:701 · :847-853).
- **M6 ADDRESSED.** home-cards.tsx:8 · :64 가 R-10(1-나 뒤에도 둠)과 맞고, talk-frame.tsx:422 · :594 와 talk-stream.ts:14 가 '다시 해 볼래요'다. 남은 '다시 해 보기'(mic-blocked · ai-rest · app-trouble 주석)는 단추 글을 따온 것이 아니라 행동을 이르는 말이라 그대로 둬도 된다.

## 새로 깨뜨린 것
- **Minor: perceivedWaitOf 의 설명 주석이 떨어져 나갔다.** takeRestResend 를 그 함수 바로 위에 끼워 넣어, '체감 대기(ms) = …' 주석(talk-frame.tsx:290)이 takeRestResend 의 설명 주석 바로 앞에 붙고 perceivedWaitOf(:308)에는 설명이 없다. 주석 한 줄을 :307 로 옮기면 된다. 컨트롤러가 직접 고쳐도 되는 크기다.
- 시험: ux-recover.test.ts:310-366 의 넷이 고친 순수 함수 넷(selectionKeptOf · troubleTextOf/aiRestTroubleOf · micRecheckPressOf · takeRestResend)의 갈래를 모두 단언하고, 'UX4 다시 확인 한 번'(:153)은 던짐을 failed 로 고쳐 단언한다. 빈 시험은 없다.

## 구현자 우려(ai-rest.tsx 가 app 쪽 use-lesson-start.ts 의 문구를 읽음)
- **지금은 받아들일 만하다.** .dependency-cruiser.cjs 에 components → app 금지 규칙이 없고(check:deps 통과), closing-cards.tsx:19 는 이번 변경 전부터 같은 모듈을 읽는다. use-lesson-start.ts 는 ai-rest 를 읽지 않아 고리가 없다. AiRest 를 쓰는 화면은 모두 이미 그 모듈이나 세션 서버 액션을 싣고 있어 묶음 크기도 거의 늘지 않는다.
- 다만 공용 조각이 특정 쪽 폴더의 파일에 기대므로, 그 파일이 옮겨지거나 이름이 바뀌면 함께 깨진다. 문구(LESSON_START_TEXT 의 failed · offline 등)를 components 쪽 작은 문구 모듈로 옮기길 권한다.
- **둘 자리: 0-다 Approved 뒤, 2-가 시작 전에 컨트롤러가 직접 하는 작은 손질.** 옮기면 closing-cards · result-view 의 import 도 바뀌는데, 두 파일은 지금 0-다 구현자가 잡고 있어(plan 위험 1 파일 잠금) 0-다 진행 중에는 겹친다. 동작이 바뀌지 않는 옮김이라 가벼운 루프로 충분하다.

## 판정
**Approved**(fix 라운드 1 에서 닫힘). 남은 것은 새 Minor 하나(주석 자리)와 문구 옮기기 권고이고, 둘 다 비차단이다.
