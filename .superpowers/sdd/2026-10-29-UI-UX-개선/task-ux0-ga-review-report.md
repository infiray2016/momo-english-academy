# 코드 검토 보고: UI · UX 묶음 0-가 돌아갈 길(검토자 · Opus · xhigh, 2026-10-30 00:2x)

판정: **Approved** · Critical 0 · Important 0 · Minor 6. 범위는 구현 보고가 적은 '이번에 고친 것'이고, 같은 파일의 1차 묶음 변경과 시드 규격 변경은 판정하지 않았다. 구체적 의심이 없어 시험은 다시 돌리지 않았고, e2e 는 코드와 정적으로만 대조했다. 줄 번호는 워크트리 p13d 의 지금 파일 기준이다.

## 1. 설계 준수
- ✅ [승인 UX3] 막힘 판: 세션(session-frame.tsx:1097) · 회화(talk-frame.tsx:1021) · 배치(placement-flow.tsx:280)가 같은 MicBlockedPanel 을 쓰고, 차례는 안내 줄 → 큰 '다시 해 볼래요' → 확인 중 '아무 말이나 한마디 해 주세요' → 작은 '홈'이다(mic-blocked.tsx:144-215, spec R-47 · 정본 7절 '막힘 화면' 행).
- ✅ [승인 UX3] · [승인 UX4] 쉼: 세션(session-frame.tsx:1088) · 회화(talk-frame.tsx:1052) · 결과(result-view.tsx:180) · 마무리 셋째 장(closing-cards.tsx:268)이 모두 큰 '홈' · 작은 '다시 해 볼래요'이고, 띠의 '홈'을 숨겨 한 화면에 '홈'이 하나다(result-view.tsx:148 · talk-frame.tsx:1354).
- ✅ 같은 자리(N-5 · N-6 · N-7): 세션은 current · finals 상태를 둔 채 쉼만 풀고 router.refresh 하며, page.tsx:44 가 SessionFrame 에 판 키를 주지 않아 틀이 새로 만들어지지 않는다. 회화는 쉼으로 멈춘 턴 body 를 같은 시도 id 로 다시 보내고(talk-frame.tsx:716-720 · 339-347), 서버는 그 아이 행을 남긴 채 쉼을 돌려주므로(turn.ts:832-836) 다시 받는다. 열 때 쉬었으면 ready 효과가 여는 길을 그대로 탄다(talk-frame.tsx:493-517). 결과 · 마무리는 마지막 고르기를 그대로 다시 한다(use-lesson-start.ts:161).
- ✅ R-15 · R-11(N-8 · N-9): 수업 목록 · 지난 수업 · '첨삭이 왔어요'는 화면을 떠나지 않고 누른 카드 아래 한 줄 칸에 쉼 글을 두며 단추가 없다. 같은 수업을 다시 눌러 또 쉬면 '아직 쉬고 있어요 …'를 더하는 것은 spec 이 적지 않은 자리지만, 다시 눌러도 화면이 그대로인 것을 막아 FR-U1(누르면 보이는 반응)과 맞으므로 넘친 것으로 보지 않는다.
- ✅ N-11 · R-10: 회화 끊김 · 실패 줄은 큰 '다시 해 볼래요'이고(talk-frame.tsx:1449), 홈 닫힌 카드 줄은 runMicRetry 로 막힘 판과 같은 확인을 한다(home-cards.tsx:406-447).
- ✅ 1-가 범위(plan 위험 10): recheckAiRest 는 requireAccess 뒤 aiRestingToday 하나만 부르고(session.ts:71-79) ai_status 읽기와 확인 호출이 없다. ai-gate.ts 는 바뀌지 않았다.
- ✅ 설계 6 문구: '아직 쉬고 있어요. 조금 뒤에 다시 눌러 봐요' · '다시 해 볼래요'(세 조각) · '아무 말이나 한마디 해 주세요' · '마이크를 켰으면 여기를 눌러 다시 확인해요'가 표와 글자까지 같다.
- ✅ 계획 밖 변경 둘: use-lesson-start.ts 는 쉼을 고르기마다 다시 정하고 지워야 한 줄 칸과 retryRest 가 성립하므로 필요하다. 다른 묶음의 파일 표에 없어 파일 잠금(plan 위험 1)과 겹치지 않는다. micCheckSpeech 는 첫 문장이 requireAccess 이고(access-gate.test.ts 훑기 시험이 'use server' 함수 전부를 덮음) AI 를 부르지 않아 비용이 0 이다.
- ⚠️ 실행 확인 없음: 같은 활동 복귀(쓰기 e2e)와 회화 · 결과 쉼(N-6 · N-7)은 정적 대조뿐이다. 필수 경로 나 는 0-마 · 9 의 실행 기록으로만 닫힌다(plan 증명 '필수 둘').

## 2. 잘한 점
- 단추 차례를 stuckButtonsOf 한 곳에서 정하고 막힘 판 · 쉬는 화면이 같이 읽어, UX3 규칙이 화면마다 갈라질 자리가 없다.
- 다시 해 보기 한 번을 단추와 떼어 낸 함수(runAiRestRetry · restAfterStartOf)로 두어, 풀림 · 아직 쉼 · 확인 실패 · 같은 수업 다시 · 다른 수업 갈래를 단위 시험이 모두 덮는다(ux-recover.test.ts:141-207).
- 회화 쉼 풀림이 새 시도를 만들지 않고 서버에 남은 아이 행의 시도 id 를 다시 써서, 말 주고받기 수와 '말했다' 기록이 두 번 세어지지 않는다.
- e2e 고르개 data-button-size 를 세 조각에 같이 달았다. 쓰기 e2e 의 상한 풀기(liftSafetyCap, 호출 행 지움)는 상한 채우기(reachSafetyCap, 프로필 상한 1 · 호출 한 행)와 짝이 맞고, 고르는 data-activity-no 도 실제로 있다(session-frame.tsx:1166).

## 3. 지적
Critical · Important 는 없다.

Minor
- **M1 목록 쉼 뒤 고른 표시가 남는다.** lesson-board.tsx:174 가 누를 때 고른 표시를 켜고 :183-185 는 오류 줄(status)일 때만 되돌리므로, 쉼이면 그 카드에 고른 체크가 남은 채 아래에 쉼 글이 붙는다. 같은 파일의 규칙('고르기가 실패하면 고른 표시를 되돌린다', fix 8b N-2 · 화면 검토 M-8)과 어긋난다. resting 이 켜질 때도 setSelected(undefined) 를 하면 된다.
- **M2 쉼 다시 확인이 닿지 않아도 '아직 쉬고 있어요 …'다.** ai-rest.tsx:46-50 이 recheck 실패를 still 로 바꾼다(구현 보고 '다르게 한 것' 3). 끊긴 기기에는 맞지 않는 안내이고, 정본 7절 네트워크 행 · spec N-14 는 끊김을 그 자리 안내로 보인다. 결과를 released · still · failed 셋으로 두고 failed 면 있는 글(LESSON_START_TEXT.offline · failed)을 한 줄로 보이길 권한다. 다시 누르면 풀리므로 Minor 다.
- **M3 홈 다시 확인 줄이 음성 설정을 못 읽으면 계속 흐리다.** home-cards.tsx:412-418 은 micCheckSpeech 실패를 버리고 다시 읽지 않으므로, 그 홈 방문 동안 단추가 꺼진 채 안내도 없다(N-10 이 막다른 줄이 됨). 바뀌기 전에는 서버 없이 눌렸다. 누를 때 설정이 없으면 다시 읽는 길을 권한다. 홈에 다시 들어오면 풀린다.
- **M4 회화 쉼이 아이 말 뒤 60초 안에 풀리면 '시작!'을 다시 거친다.** 쉼 길은 회화 턴 호출 기록을 남기지 않으므로(turn.ts:832-836), 같은 시도 id 의 다시 보냄은 TURN_IN_FLIGHT_MS(60초, turn.ts:122 · 745-757) 동안 stale 이다. 그러면 talk-stream.ts:205-211 의 자료 다시 읽기가 판 키(page.tsx:34 key=talk.version)를 바꿔 틀을 새로 그리고, started(talk-frame.tsx:390)가 비어 '시작!'이 다시 나온다. 1-가 에서는 풀림이 다음 학습일이라 닿지 않지만, 0-마 의 N-6 e2e 는 상한을 바로 풀어 이 길을 탄다. 서버 쉼 길은 회화 plan 몫 파일이라 이 묶음에서 고치지 말고 0-마 브리프에 적어 두길 권한다.
- **M5 회화 쉼 풀림 뒤 체감 대기 기록에 쉼 시간이 들어간다.** 다시 보낸 턴의 첫 문장에서 perceivedWaitOf 가 처음 말을 끝낸 때(listenEndedAt, talk-frame.tsx:683-686 · 836)부터 재므로, 다음 턴의 prevPerceivedWaitMs 로 쉼 시간이 C125 체감 대기 칸에 들어간다. onReleased 에서 listenEndedAt.current 를 비우면 그 턴을 재지 않는다.
- **M6 낡은 주석.** home-cards.tsx:8 · :64 는 다시 확인 줄을 '1-가 임시, 1-나 부모 화면이 대신한다'고 적어 R-10 '1-나 뒤에도 둔다'(같은 파일 :12-14)와 어긋나며, 1-나 구현자가 줄을 지울 위험이 있다. talk-frame.tsx:405 · :577 · talk-stream.ts:14 는 옛 단추 글 '다시 해 보기'를 적는다.

## 4. 구현 보고의 우려 넷
1. 쓰기 쉼 e2e 미실행: 고르개 · 표지 · 상한 풀기가 코드와 맞는다. 결함이 아니고, 실행은 plan 위험 7 대로 0-마 · 9 몫이다.
2. home.spec AC-5c 가 진짜 마이크 확인을 거침: spec R-10 이 요구한 바뀜이다. Playwright click 은 단추가 켜질 때까지 기다리므로 흐린 동안은 문제가 아니고, default-ok 대본이 확인을 통과시키는지는 실행에서 본다. 결함 아님(M3 와 별개).
3. 회화 · 결과 쉼 e2e 없음: plan 증명 AC-23g 가 N-6 · N-7 을 0-마 required-recovery.spec 에 둔다. 결함 아님. N-6 을 쓸 때 M4 를 알아야 한다.
4. 쓰기 확인 도중 쉼 뒤 확인을 다시 눌러야 함: R-50 의 같은 자리는 '그 활동'이고 입력이 되살아나므로 spec 을 지킨다. 결함 아님.

## 5. 부작용
- 1차 묶음 동작: 0-가 가 고친 줄은 막힘 · 쉼 그리기와 끊김 단추뿐이다. 막힘 풀림 뒤 실패 셈 비우기(session-frame.tsx:1104 · talk-frame.tsx:1028)와 따라 말하기 중 막힘의 자료 다시 읽기(검토 A M-3)는 1차 묶음의 같은 처리를 막힘 판으로 옮긴 것이고, 건너뜀 · '모름' 안내와 감시 타이머 줄은 손대지 않았다.
- MicBlockedText 에서 retry 인자를 뺐지만 호출부 셋이 모두 MicBlockedPanel 로 바뀌어 남은 호출부가 없다. 옛 글 '다시 해 보기'를 고르는 시험도 남지 않았다.
- 'AI 쉬는 중' 하루 상한 판정(ai-gate.ts)은 바뀌지 않았고, 새 액션은 같은 함수를 읽기만 한다.

## 6. 판정
**Approved.** 내보내기를 막을 결함은 없다. 고치길 권하는 것(비차단): M1 · M2 · M3 · M5 · M6. 0-마 브리프로 넘길 것: M4.
