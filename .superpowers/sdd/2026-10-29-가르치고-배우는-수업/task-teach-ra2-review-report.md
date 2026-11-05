# 코드 검토: 가르치고 배우는 수업 묶음 라-2(읽기 · 쓰기 연결) — 2026-10-30, 검토자 Opus · xhigh

판정: **Changes Requested** (Critical 0 · Important 1 · Minor 4). fix 라운드 항목은 I1 하나다. 범위는 보고의 바뀐 파일 13 이다. 직접 확인한 것은 둘이다. biome check 13 파일 오류 0, 단위 넷(teach-frame 16 · reading-teach 8 · writing-teach 9 · ux-progress)은 49 통과다(03:51). e2e · 통합은 정적이다.

## 1. 설계 준수
- ✅ 자리 조각: today · preview · model · together(읽기 · 쓰기) · 짝(읽기 · 쓰기)이 라-1 조각을 고른다. 모든 갈래가 `teaching`(teach 칸 있음, 정한 것 1) 아래에만 있어 teach 없는 수업은 지금 차례 그대로다(reading-teach · writing-teach 'teach 없는 수업' 시험).
- ✅ 문구: 위 띠 자리 이름은 TEACH_SLOT_NAME(session-frame.tsx:1580), 혼자 첫 화면 · 짝 첫 장은 라-1 FirstLine(:1505), 쓰기 '왜' 앱 문구는 writingWhyOf, 틀린 뒤 단추는 TEACH_TEXT.retry 다. 모두 설계 5 문구 표 글자 그대로이고, 새 글이 없다(표본 R13 · W10 의 표 밖 글을 뺀 것도 맞다).
- ✅ 진행 막대: progress.ts teach 갈래는 TEACH_SLOT_OF → TEACH_SLOT_NAME 표 하나에서 이름을 가져온다. teach 아닌 표(ACTIVITY_GROUP_OF)는 그대로다(정한 것 16). M1 을 본다.
- ✅ 판 2 · 이어 하기: complete(:811)가 v: INPUT_VERSION 이고, 짝은 base 종류에 slot "spare" 를 단다. resumePointOf 는 처음 열 때(:688)와 advance(:845) 모두 skip 과 함께 부른다.
- ✅ 무음 모드 줄: 여섯 조각 모두 onLineEnd 를 잇는다. 오늘 배울 것 · 새 단어 · 본보기 · 같이 해 보기는 직접, '왜'(reading.tsx:597 · writing-items.tsx:340 · :364)와 첫 장(:1521)은 teachLine 묶음으로 잇는다. teachNoticesAfter 가 두 번째 안내부터 켜고, 아이패드 사파리에서만 C111 글(MIC_BLOCKED_TEXT.ipadSilentMode)을 보인다. M2 를 본다.
- ✅ 읽기: 지문 늘 함께(teach 면 두 방향 모두 지문 칸, C170 (7)) · askRole 이름표 · 처음 틀림 '왜' 말풍선 + '한 번 더 풀기' · 다시에서 retryHighlight 띠 · 둘째 틀림 '정답은 이거예요' · 맞음은 '맞았어요!'만(해설 칸 없음)이다. aid 는 첫 고름 때 한 번 읽어 그 문항의 첫 답 도움으로 보낸다(설계 9 · 설계 8 '지문 화면에서 쓴 것도 뒤 문항의 첫 답 전'). 같이 해 보기 읽기는 띠 친 글 + 보기 둘이고, 맞힐 때까지 rightKo · wrongKo 를 쓰며 시도 꼴은 together 다.
- ✅ 쓰기: 까닭별 '왜'(writingWhyOf) + '한 번 더 하기'다. '왜' 동안은 아이가 낸 답만 보이고 정답은 먼저 보이지 않는다. 다시에서는 색 칸(칩 이름표)과 대문자 단추 반짝임을 켜는데, motion-safe 라 움직임 줄이기면 고리만 남는다. 둘째 틀림에 정답을 보인다. 같이 해 보기 쓰기는 빈칸 수 = 남은 카드 수이고, pieces 는 빈칸 차례 카드, 대문자 자리는 빈 시도다. 이는 공용 togetherOutcomeOf 계약과 같다. C84 는 기존 검증기 · 표시(display.ts:138)가 지킨다.
- ✅ L-34(서버 값 합치기): 아래 4절.
- ✅ NFR-11: 보고의 build · check:bundle 결과(첫 JS 25 덩이에 3D 0)는 구현자 보고 그대로다. 라-1 의 동적 import 구조와도 맞는다.
- ❌ 짝을 틀린 '왜' 화면의 단추(I1).

## 2. 지적
- **I1 짝을 틀린 '왜' 화면에서 '다음'이 읽기 전부터 밝다**(reading.tsx:643~651 과 :670 의 reveal '다음', writing-items.tsx:354~370 의 spare-wrong '다음', 보고 '설계와 다르게 한 것' 7). spec 설계 5 는 '선생님 말 화면(오늘 배울 것 · 보여 주기 · 왜)의 단추는 읽어 주기가 끝나면 밝아진다'고 한다. 짝도 틀린 때의 '바른 답과 짝의 왜 한 줄' 화면은 '왜' 화면이고, 그 화면의 단추는 '다음'이다. 지금은 아이가 '왜'를 듣기 전에 넘길 수 있다. 혼자 문항의 '왜'(WhyBubble 안 '한 번 더 풀기 · 하기')는 규칙대로 흐리다. 라-4 의 '다음 수업 늘 누름'은 결과 화면이라 이 규칙 밖이었고, 이 경우와 다르다. 고칠 방법: 짝 틀림 '왜' 줄의 onLineEnd(라-1 조각이 이미 냄)를 받아, 줄이 멈출 때까지 '다음'을 흐리게 둔다. 읽어 주기 실패 · skipped 도 줄이 멈추면 밝으므로 막다른 화면은 없다. 읽기 · 쓰기에 시험 하나씩을 더한다.
- **M1 진행 막대가 내지 않을 짝 칸도 센다**(progress.ts teach 갈래 · teach-frame progressFinalsOf). plan 위험 9 는 '진행 막대는 낸 짝만 센다'고 한다. 지금은 모든 짝 활동이 칸으로 남고, 혼자 해 보기가 끝나면 내지 않을 짝을 '끝냄'으로 칠한다. 읽기 · 쓰기(짝 3 · 5)는 작지만, 라-3 뒤 말하기(짝 열여덟)에서는 '스스로 해 보기' 묶음이 대부분 저절로 찬 긴 칸이 된다. 혼자 해 보기가 끝난 뒤에는 skip 칸을 묶음에서 빼는 꼴을 권한다. 혼자 해 보기 도중에는 낼 짝을 모르므로 지금처럼 둔다. 화면 검토와 함께 정한다.
- **M2 무음 모드 줄의 횟수**(teach-frame.ts:115~122, 요청 2). spec 설계 10 은 '두 번 나오면 … 무음 모드 한 줄을 한 번 더한다'고 한다. 지금은 소리가 난 줄이 끝나면 거두고, 뒤에 안내가 또 나면 다시 켠다. 그래서 한 세션에 여러 번 보일 수 있다. '한 번'을 세션에 한 번으로 읽을지 화면 검토(UI · UX R-57)에서 정하고, 정해지면 teachNoticesAfter 한 곳만 고치면 된다.
- **M3 첫 화면에서 '왜'가 나오면 초상이 둘이다**(session-frame.tsx:1505~1525 FirstLine 감싸기 + 문항 안 WhyBubble). 쓰기 첫 혼자 문항 · 첫 짝처럼 첫 화면에서 틀리면, 첫 줄의 초상과 '왜'의 초상이 한 화면에 함께 있다. 설계 4 는 혼자 · 짝 문항을 푸는 동안 초상은 '왜'일 때만 나온다고 하므로, '왜'가 나오면 첫 줄은 접는 편이 뜻에 맞는다. 화면 검토 항목으로 둔다.
- **M4(장부, 결함 아님) 쓰기 색 칸의 칩 자리를 정답에서 가린다**(teach-frame.ts assembleRolesOf, 요청 1). 설계 1 쓰기 행은 '칸의 색 이름표(칩)만 켠다'고 한다. 지금 시드(3단계 단원 1 수업 1)의 혼자 문항 다섯 · 짝 다섯은 모두 '무엇 is 어때요.' 꼴이라 'is' 자리로 가리는 규칙이 맞는다(직접 확인). 하지만 'is' 가 없는 꼴(자 묶음이 만들 다른 수업 · 4단계 이후)은 색 칸 없이 대문자 반짝임만 남아 설계 1 의 도움이 빠진다. 시드 칸이 필요하다면, 본보기 칩과 같은 꼴로 혼자 문항 · 짝마다 카드 차례의 role 목록(예 items[].slotRoles: thing · is · how · end)을 6.3 쓰기 규격에 더하는 안이다. 자-2 생성 전에 컨트롤러가 정한다. 근거는 spec 설계 1 쓰기 행 · 설계 6(칩 role 은 시드 칸) · C170 (8)(수업 1 만 is 문장)이다.

## 3. 구현자 판단 · 우려
- 브리프 밖 새 파일 teach-frame.ts: 타당하다. DB · 화면 · 음성 · 시계 없는 순수 함수이고, core(answer · seed · session)만 가져온다. 관문 check:deps 위반 0 은 구현자 보고 그대로다.
- 같이 해 보기는 맞으면 반응 줄과 talk.teacher_praise_seconds 가 모두 끝난 뒤 넘어간다(설정값). 진행을 되살리지 않는 것은 연습이라 점수에 닿지 않으므로 받아들인다.
- aid 를 teach 수업에서만 보내는 것은 정한 것 1 의 조건대로다.
- 다른 묶음 파일: 라-1 조각 · speaking · result · recap · attempt 판정 함수는 바꾸지 않았다(보고). ux-progress.test.ts 는 라-4 의 RESULT_SPEECH 두 줄과 라-2 의 자리 이름 · teach 갈래가 함께 있고 시험이 통과한다. common.tsx 를 바꾸지 않은 것도 맞다(teach 새 단어는 라-1 NewWordsScreen).

## 4. L-34(서버 값 합치기)
타당하다. 서버가 저장된 혼자 첫 시도로 센 결과(view.spares.outcomes, index.ts:1638)를 깔고, 이 기기의 첫 끝 시도(대기열에 남은 것 + 이 화면에서 낸 것)를 빈 자리에만 더해 같은 sparesToShow 로 고른다(teach-frame.ts:69~88). 경우마다 이렇다.
- 기기 첫 시도가 서버에 아직 없을 때: 기기 몫이 빈 자리를 채운다.
- 같은 기기에서 도중에 다시 열 때: 대기열이 지운 앞 문항은 서버 outcomes 가 채운다. 나 fix 1 재검토가 지적한 구멍이 닫혔다.
- 다른 기기에서 이어 할 때: 서버 값만으로 고른다. 통합 시험 session-flow :760~770 이 단언한다.
- 상한은 서버 cap 이다. 짝 활동 번호는 activitiesOf 그대로라 고정이다(정한 것 3).
- 서버 저장 길도 같은 함수 · 같은 맥락(outcomeContextOf)이라 기기와 서버가 갈릴 길은 서버가 기기 첫 시도를 거부한 드문 경우뿐이다.
- 통합 단언 고침(outcomes [] · 다른 기기 값)은 맞다.

## 5. 시험 · 관문 · 넘길 것
- 시험: 새 단위 36 의 이름이 정본 AC-22c · 3d · 4d · 3k 를 품고 정본 뜻과 맞는다. 3d 는 틀린 뒤 차례, 4d 는 같이 해 보기 조립, 3k 는 지문 · 이름표, 22c 는 짝 나옴 · 다 맞히면 결과다(브리프 표의 'AC-3d 같이 해 보기'는 표기 잘못이고 구현자가 정본 뜻대로 붙였다). e2e teach.spec 은 승인 수업 글자 그대로(lessons.ts teachSample — 3단계 단원 1 배정 1 · 변형 1)를 쓴다. 빠진 갈래는 I1 의 '짝 틀림 다음 흐림'이다.
- 관문(구현자 보고 그대로, 03:4x): lint 종료 1(오류 2, result-view.tsx · result.ts 형식 — 라-4 fix 중) · tsc 0 · test 1451 통과 · check:deps 0 · check:ids 0(design-number 47) · spec:trace 0 · build 0 · check:bundle 0.
- 라-3 이 이어받을 자리: session-frame 의 TEACH_INPUT_AREAS(:235, 지금 읽기 · 쓰기만)에 말하기를 더한다. 같이 해 보기 · 짝 말하기 갈래, 질문마다 StoryScreen, evaluateSpeakingAnswer · skipAfterAiRest, echo 를 담을 자리(다 M5)도 라-3 몫이다. 그 전까지 말하기 teach 수업은 같이 해 보기에서 틀의 '다음'(시도 없음)으로만 지나가 끝낼 수 없다. 지금은 teach 시드가 적재 전이라 아이가 닿지 않는다. 라-3 이 끝나기 전에는 말하기 3단계 teach 시드를 아이가 쓰는 DB 에 넣지 않는다는 조건을 장부에 둔다.
- 마-2 가 이어받을 자리: 세션을 여는 차례에서 오늘 배울 것 앞의 '선생님을 골라요'(지금 teaching.teacher 가 null 이면 기본 초상), 수업 목록 카드 누름(use-lesson-start.ts)의 잠금 풀기가 있다. 후자는 TodayScreen 이 들어오자마자 읽게 하려는 것이다.

## 6. 판정
**Changes Requested.** fix 1: I1. Minor M1~M3 은 화면 검토 · 컨트롤러 몫, M4 는 자-2 전 장부 결정이다.
