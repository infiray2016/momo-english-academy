# 묶음 2-나 구현 보고(토큰 밖 색 걷기 · 아이콘 획 · 듣는 중 고리, 2026-10-30 01:5x, 구현자 Opus · high)
상태: DONE_WITH_CONCERNS. 워크트리 p13d, 커밋 안 함. 색 클래스 · 획 상수 · 고리만 바꿨고 구조 · 동작 · 문구는 그대로다. e2e 는 돌리지 않았다.
## 바꾼 자리(파일별)
| 파일 | 자리 |
|---|---|
| activities/common.tsx | 팔레트 11(neutral-900 → ink · neutral-700 → ink · neutral-500 → ink-soft · white → paper). ICON_STROKE 정의를 여기로 옮김(컨트롤러 허락), 획 2(Check 3 → ICON_STROKE · Volume2) |
| board/board.tsx | ICON_STROKE 를 common 에서 가져오고 `export { ICON_STROKE } from "@/components/activities/common"` 로 다시 내보냄(이름 · 값 · 가져오는 쪽 그대로) |
| session/ai-rest.tsx:20 | 2-가 검토 M1: stuckButtonsOf 를 mic-blocked 대신 stuck-buttons 에서 가져옴(수업 목록 · 결과 첫 JS 에서 음성 층 빠짐) |
| activities/reading · speaking · writing | [#FFFDF7] → bg-paper 2 · 1, 팔레트 2 |
| answer/tiles · typing | bg-white → bg-paper 3 · 2 |
| answer/choice · session/reading · session/writing-guided | MARK_STROKE(3) 상수 지우고 ICON_STROKE 2 · 2 · 1(Volume2 에 획 더함), writing-guided 팔레트 1 |
| session/writing-composition · writing-rewrite | 팔레트 2 · 1. rewrite 의 원문 줄 text-ink/70 → text-ink(색 종이 위 4.3:1 → NFR-U1) |
| (setup)/access/access-code-form | 팔레트 6(입력 테 ink-soft · 바탕 paper · 단추 ink/paper · 초점 테 ink 둘) |
| (setup)/first-run/first-run-flow | bg-cork/20 → bg-desk 1, 아이콘 획 5 |
| answer/speak-button | 남은 시간 고리 conic 을 talk-deep 으로, 소리 물결(AudioLines)에 text-talk-deep, 표지 획 ICON_STROKE |
| app/globals.css | cork 토큰 지움(사용처 0). 옛 tape 는 회화 파일이 써서 둠 |
합계: 기본 팔레트 28 · 날값 셋 · cork/20 하나(plan 수와 같음).
## 시험(tests/unit/ux-tokens.test.ts)
- 고침: 'AC-23e (1) 코르크 토큰 둘(cork · cork-frame)이 없고, 코르크를 쓰는 화면 소스도 없다'
- 더함: 'AC-23e (1) 화면 소스(src/components · src/app, 개발 도구 쪽 뺌)에 날값 색과 기본 팔레트 색 클래스가 없다'(주석 줄 뺌), 'AC-23e (1) 아이콘 획 상수가 설계 5.2 값이고, 묶음 2-나 파일의 strokeWidth 는 모두 ICON_STROKE 다', 'AC-23e (1) 말하기 단추: … talk-deep …(글자 아님 · 3:1 이상)'
## 남은 날값 색(브리프 grep)
`src/app/(child)/page.tsx:66` 한 줄. 주석 안의 목업 값(#8A6134)이라 화면 값이 아니다. 기본 팔레트 클래스는 `src/app/dev/`(시드 보기 · 음성 · 선생님 시험 화면) 밖에 0 이다. 2-다 design-color 규칙은 dev 쪽을 빼거나 따로 다뤄야 한다.
## 관문(fix 뒤 다시, 2026-10-30 02:0x)
| 관문 | 결과 |
|---|---|
| pnpm lint | 오류 6 · 경고 1, 모두 다른 손 파일(core/speaking/judge · core/session/attempt · core/writing/why · server/session/index · tests/unit/ai-request · speaking-judge). 이 묶음 파일은 통과 |
| tsc --noEmit | 오류 2, tests/unit/ai-request.test.ts 300 · 306줄(다른 손, 인자 수). 이 묶음 파일 오류 0 |
| pnpm test | 111 파일 · 1254 통과 · todo 6, 실패 0 |
| check:deps | 위반 0(249 모듈, 순환 없음) |
| check:ids | 규칙 오류 0, design-number 44(기준 49). common.tsx:180 획 3 경고가 없어짐. board.tsx:553 120 은 원래 있던 것 |
| spec:trace --fail-on unknown-ac | 종료 0, unknown-ac 0, missing-test 16(2-가 때와 같음) |
## 우려(5)
1. 소리 물결 색은 spec 5.1 대로 talk-deep 이다. 먹색 단추 위 4.2:1 · 흐린 단추(종이) 위 3.6:1 이다. 시안 ②는 단추 안 소리 막대를 postit-talk 로 그렸으니 화면 검토가 본다.
2. 따라 말하기 '읽는 중' 단추는 opacity-50 그대로다(누를 수 있어 꺼진 단추가 아님, 동작 범위 밖). 흐린 단추 꼴로 맞출지는 묶음 5 몫으로 남긴다.
3. tests/e2e/speaking.spec.ts 302줄 주석 '먹색 몫'이 낡았다. 정규식(첫 deg)은 그대로 맞아 고치지 않았다(범위 밖).
4. Tailwind 기본 그림자(common.tsx ActivityCard shadow-md, tiles · writing 의 shadow-sm)는 색 클래스가 아니라 두었다. 5.2 그림자 토큰으로 바꾸는 일은 화면 가족 묶음 몫이다.
5. 회색 계열을 토큰으로 옮긴 규칙: neutral-900 · 700 → ink, neutral-500 → ink-soft(종이 위 테만, 글자 아님). 점선 빈칸 테가 조금 진해졌다.
