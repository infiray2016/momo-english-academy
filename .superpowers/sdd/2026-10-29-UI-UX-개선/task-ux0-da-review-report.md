# 코드 검토 보고: UI · UX 묶음 0-다 보상 문구 · 저장 자리 · met 이름(검토자 · Opus · xhigh, 2026-10-30 01:0x)

판정: **Approved** · Critical 0 · Important 0 · Minor 1. 범위는 구현 보고가 적은 줄이고, 같은 파일의 0-가 · 0-나 · 0-라 · 1차 묶음 줄은 판정하지 않았다. 시험은 다시 돌리지 않았고, 끝 판정 grep 만 직접 돌렸다.

## 1. 설계 준수
- ✅ R-12 · AC-U3 홈 위 띠: homeBandChipsOf(core/home/band.ts:11-24)가 별 수 1 이상일 때만 별 칸을 만들고, 쪽(page.tsx:53-64)이 그 목록만 그린다. 연속 학습 일수는 쪽이 값을 넘기지 않아 칸이 없다(P12 몫). 기존 home.spec 의 별 단언 둘(:135 · :264)은 별 1 이상인 집이라 깨지지 않는다.
- ✅ R-19 다시 하기 대화: closingMetWordsOf(closing-cards.tsx:88-92)가 retry 면 빈 목록이고 첫 장은 그 값만 그린다(:112 · :157). 친한 정도 막대 숨김은 전과 같다.
- ✅ R-54 그만둔 대화 문구: CLOSING_TEXT.aborted 가 설계 6 표 글자 그대로다(:40). 조건은 wrap.aborted 그대로라, 참여 완료로 바꾸는 일은 회화 구현 몫으로 남는다(브리프 '지키는 것').
- ✅ R-29 ①② 안내 프로필마다 한 번: 보일지는 view.noticesSeen.talk_answer_tip 과 이 회화에서 안내한 턴으로 정하고(talk-frame.tsx:1200-1204, answerTipShownOf tori.tsx:36-46), 처음 그린 뒤 markTalkNotice 를 한 번 부른다(:1205-1212). turnKey 는 보내기마다 늘어나므로(:791) 안내는 처음 ①② 가 뜬 턴의 말풍선에만 남는다. TALK_NOTICE_KINDS(server/conversation/index.ts:114-120)에 더해 스키마 z.enum(:1400)과 noticesSeen 지도(:632-634)가 함께 따라가고, 같은 종류 목록은 이 하나뿐이다. markTalkNotice 의 첫 문장은 requireAccess 다(actions/conversation.ts:76-78).
- ✅ 기기 저장 흔적: src 에 momo.answer-tip.v1 · ANSWER_TIP_KEY · answerTipSeen · markAnswerTipSeen 이 없다. 시험에서는 그 열쇠가 없음을 단언할 때만 쓴다(ux-screen-feedback.test.ts:444 · conversation.spec.ts:2254).
- ✅ 이름 바꾸기(설계 2 · plan 정한 것 3): `grep -rn "얻은\|gotWord\|GotWord\|data-got-" src tests` 가 0건이다(직접 돌림). MetWordCards · metWordsOf · data-met-words · data-met-word · 글 열쇠 metWords 로 바뀌었다. core 의 metWordsIn(대화 글에 나온 단원 단어)과 server/session/index.ts:1304 의 metWords(미리보기 시도, HEAD 때부터 있던 '만났다')는 3.3 의 같은 뜻이라 혼동이 아니다.
- ✅ 계획 밖 새 파일 자리: src/core/home/band.ts 는 import 가 없는 순수 함수라 core 의존 규칙에 맞고, Next page 파일이 이름 붙은 내보내기를 둘 수 없다는 까닭도 맞다. plan 묶음 3(plan.md:129 '위 띠 칸 규칙')이 같은 함수에 칸 모양을 더하면 된다.
- ✅ e2e 정적 고르개: reading.spec.ts:260 · session.spec.ts:169 가 data-met-word 를, conversation.spec.ts 가 새 문구(:713 · :1224) · 다시 하기 단어 0(:1561) · ①② 두 맥락 시험(:2232-2283)을 쓴다. 모두 바뀐 표지 · 글과 맞는다.
- ✅ 화면 문구 새로 만든 것 없음. 설계 숫자 · 시험용 갈래 없음(check:ids design-number 49 그대로).

## 2. 잘한 점
- ①② 안내를 다른 두 안내(처음 회화 · '막히면 눌러요')와 같은 저장 · 같은 액션에 얹어, 프로필 단위 '한 번' 규칙이 한 갈래로 모였다.
- ①② e2e 가 서버 저장 · 기기 열쇠 없음 · 같은 회화 다음 턴 · 같은 프로필 새 브라우저 맥락 넷을 한 시험에서 잰다.
- 마무리 단어 숨김을 순수 함수로 떼어 다시 하기 · 그만둠 · 새 대화 갈래를 단위로 단언했다(ux-screen-feedback.test.ts:498-545 · talk-follow.test.ts:225-248).

## 3. 지적
Critical · Important 는 없다.

Minor
- **M1 연속 학습 일수 칸을 그리는 자리가 없다.** homeBandChipsOf 는 streak 칸을 돌려주지만 쪽은 `chip.kind === "stars" ? … : null`(page.tsx:54-63)이라 streak 칸을 조용히 버린다. 쪽 머리 주석(:5-6)과 함수 주석은 'P12 가 값을 넣으면 같은 규칙을 탄다'고 적어, P12 가 streakDays 만 넘기면 칸이 보이지 않는 채 시험(순수 함수)은 통과한다. 지금 동작에는 영향이 없다. streak 갈래를 그리거나, 쪽 주석에 '그리는 자리는 묶음 3 · P12 가 더함'을 적고 묶음 3 브리프에 남기길 권한다.

## 4. 구현자 우려 둘
1. home.spec 의 첫 사용 단언 없음: 결함이 아니다. plan 이 위 띠 칸 규칙의 home.spec 을 묶음 3 에 두었고(plan.md:129), AC-23c 증명 표도 home.spec 을 든다(:202). 묶음 3 브리프에 '별 0 → [data-star-total] 0개 · 첫 별 뒤 1개'를 적으면 된다. 그 전에는 AC-23c 를 완료로 적지 않는다.
2. markTalkNotice 가 끊기면 다음 회화에 한 번 더: 처음 회화 안내 · '막히면 눌러요'와 같은 꼴(talk-frame.tsx:1099 · :1261)이고 학습 판정과 무관한 안내라 받아들일 만하다. 같은 이유로, 배포 전에 기기 저장으로 이미 본 아이도 배포 뒤 한 번 더 본다. 둘 다 결함으로 보지 않는다.

## 5. 판정
**Approved.** 비차단: M1(쪽 한 줄 또는 주석 한 줄, 컨트롤러가 직접 해도 된다). 우려 1 은 묶음 3 브리프로 넘긴다.
