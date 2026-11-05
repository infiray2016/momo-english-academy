# 브리프: UI · UX plan 묶음 0-다 — 보상 문구 · 저장 자리 · met 이름(구현자 · Opus · high, 2026-10-30 00:1x 작성, 0-가 검토 Approved 뒤 시작)

plan `intent/2026-10-29-UI-UX-개선/plan.md`(approved C185)의 묶음 0-다 를 구현한다. spec 은 `intent/2026-10-29-UI-UX-개선/spec.md`(2판) 설계 1 의 R-12(홈 위 띠 별 칸은 값 1 이상일 때만) · R-19(다시 하기 대화는 오늘 만난 단어를 보이지 않음) · R-29(①② 안내는 프로필마다 한 번, 서버 저장) · R-54(그만둔 대화 문구 '다음에 조금 더 이야기하면 별을 받아요') · 설계 2('얻은' → '만난', 식별자는 met 계열) · 설계 6 문구 표 · AC-U3. plan 이 정한 것 3(이름 바꾸기) · 묶음 0-다 표(plan 92~96줄) · 작업 순서 4(끝 판정) 그대로. 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(머리 0c664c3 위 커밋 전 변경 — 불편 1차 묶음 · 시드 규격 · 묶음 0-가 · 0-나 · 0-라 — 모두 그 위에 고친다). 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. 작업 폴더를 옮기지(cd) 않는다. 통합 · e2e 는 이 Mac 에서 못 돌린다(정적으로만).

## 범위(plan '바뀌는 파일' 묶음 0-다 표 그대로)
| 파일 | 무엇을 |
|---|---|
| `src/app/(child)/page.tsx` | 위 띠 별 칸은 별 수 1 이상일 때만 그린다(R-12 · AC-U3 '첫 사용 홈의 위 띠에 0 이 없다'). 순수 함수(제안 `homeBandChipsOf`)가 칸 목록을 정하고, 연속 학습 일수는 P12 가 값을 넣으면 같은 규칙을 탄다(지금은 값이 없으니 칸을 만들지 않는다). 지금은 `별 ${home.starTotal}개`를 늘 그린다(51~55줄) |
| `src/components/conversation/closing-cards.tsx` | 그만둔 대화 문구를 '다음에 조금 더 이야기하면 별을 받아요'로(R-54, 지금 40줄 '다음에 끝까지 …'), 주석 5 · 69줄도 같이. 다시 하기로 한 대화(`wrap.retry`)는 오늘 만난 단어 카드를 그리지 않는다(R-19). gotWords → metWords |
| `src/components/conversation/tori.tsx` · `talk-frame.tsx` · `src/server/conversation/index.ts` | ①② 처음 안내('번호를 누르면 답을 들려줘요')를 기기 저장(`ANSWER_TIP_KEY` = momo.answer-tip.v1, tori.tsx 32~47줄)에서 profiles.notices_seen 으로 옮긴다: `TALK_NOTICE_KINDS` 에 (제안) `talk_answer_tip` 을 더하고, 보았음은 기존 markTalkNotice 액션(1398~1400줄 꼴)으로 기록, 보일지는 세션 자료의 noticesSeen 으로 판단. 기기 저장 열쇠와 그 읽기 · 쓰기는 지운다. WrapView gotWords → metWords |
| `src/components/session/reward.tsx` · `src/server/session/result.ts` · `src/server/session/index.ts` · `src/app/(child)/result/[id]/result-view.tsx` | met 계열 이름(gotWords → metWords, gotWordsOf → metWordsOf, GotWordCards → MetWordCards, 표지 data-got-words · data-got-word → data-met-words · data-met-word)과 주석 '오늘 얻은 단어' → '오늘 만난 단어' |
| `tests/unit/ux-screen-feedback.test.ts` · `talk-follow.test.ts` · `star-count.test.ts` · `tests/integration/session-flow.test.ts` · e2e `reading.spec.ts` · `session.spec.ts` · `conversation.spec.ts` | 시험 이름 · 주석 · 고르개(data-met-*)를 맞추고, 그만둔 문구 · 다시 하기 단어 숨김 · 홈 띠 별 칸 없음(별 0) · 있음(별 1 이상) · ①② 안내가 프로필마다(같은 프로필의 두 브라우저 맥락에서 한 번만, e2e 는 정적으로) 시험을 더한다 |

지키는 것: 화면 문구는 설계 6 표 그대로(새 문구를 만들지 않는다). 이미 들어간 문구('별을 받았어요' · '오늘 만난 단어' · '다시 했어요')는 바꾸지 않는다. core 의 `metWordsIn`(대화 글에 나온 단원 단어)은 그대로 두고 이름만 가깝게 둔다(plan 정한 것 3). 서버 액션은 가족 접근 쿠키 확인(없으면 401). 설계 숫자 코드 금지(설정값 · 토큰). 아이 화면 문구 해요체. 식별자는 영어. 별 셈 함수는 세션 상태만 본다(참여 완료 조건은 회화 구현 몫 — 바꾸지 않는다). 앱 코드에 시험용 갈래를 두지 않는다.

## 하지 않는 것
0-가 · 0-나 · 0-라(끝남) 파일의 다른 줄, 0-마 · 2 이상, 회화 흐름 · 세션 화면 조각, 디자인 토큰, `src/core/seed/**` · `specs/` · 시드는 손대지 않는다. 커밋하지 않는다.

## 절차 · 관문
TDD(홈 띠 칸 순수 함수 · 마무리 카드 갈래 · 안내 저장부터 시험). 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드 · design-number 기준 49 넘지 않기) · `pnpm spec:trace --fail-on unknown-ac`, 그리고 plan 작업 순서 4 의 끝 판정 `( cd <워크트리> && grep -rn "얻은\|gotWord\|GotWord\|data-got-" src tests )` 가 0건. 다른 손 때문에 실패하면 고치지 말고 적는다.

## 보고(`task-ux0-da-report.md`, 같은 폴더, 50줄 안)
바뀐 파일(계획과 다른 것 표시) · 새 순수 함수 · 시험 · 관문 · 끝 판정 grep 결과 · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.
