# 구현 보고: UI · UX 묶음 0-다(2026-10-30 00:5x, 구현자 Opus · high) — DONE_WITH_CONCERNS

워크트리 p13d 의 커밋 전 변경 위에 고쳤다. 0-라 fix 1 파일(`src/lib/speech/*` · `pace.ts` · 음성 시험)은 손대지 않았다(Biome 이 고친 파일도 내 파일 둘뿐임을 시각으로 확인). 커밋하지 않았다.

## 바뀐 파일
- `src/app/(child)/page.tsx:5 · 12 · 53` 위 띠 별 칸을 `homeBandChipsOf` 칸 목록으로 그린다(별 0 이면 칸 없음 — R-12 · AC-U3). 연속 학습 일수는 값을 넘기지 않아 칸이 없다(P12 몫).
- **[계획 밖 · 신규]** `src/core/home/band.ts` 순수 함수 `homeBandChipsOf({ starTotal, streakDays? })` → 차례 연속 → 별, 값이 없거나 1 미만이면 칸 없음. 까닭: Next 의 page 파일은 이름 붙은 내보내기를 둘 수 없어 단위 시험이 부를 자리가 따로 필요하다. 묶음 3 이 같은 함수에 칸 모양을 더하면 된다.
- `src/components/conversation/closing-cards.tsx:40` 그만둔 대화 '다음에 조금 더 이야기하면 별을 받아요'(R-54), 머리 주석 · 69줄 주석 고침. `:88` 순수 함수 `closingMetWordsOf` — 다시 하기면 빈 목록(R-19), `:112` 첫 장이 그것만 그림. gotWords → metWords.
- `src/components/conversation/tori.tsx:36` 순수 함수 `answerTipShownOf({ seen, tipTurn, turn })`. 기기 저장(`ANSWER_TIP_KEY` · `answerTipSeen` · `markAnswerTipSeen` · `useAnswerTip` · `deviceStorage`)을 지우고 ToriBubble 이 속성 `answerTip` · `onAnswerTipShown` 을 받는다(`:290 · 387`). 머리 주석 고침.
- `src/components/conversation/talk-frame.tsx:22 · 418~420 · 1200~1213` 보일지는 `view.noticesSeen.talk_answer_tip` 와 이 회화에서 안내한 턴(turnKey)으로 정하고, 처음 그린 뒤 `markTalkNotice({ kind: "talk_answer_tip" })` 한 번(기존 액션 — `requireAccess` 쿠키 확인 그대로). talk-frame 에는 gotWords 자리가 없었다.
- `src/server/conversation/index.ts:119` `TALK_NOTICE_KINDS` 에 `talk_answer_tip`(스키마 z.enum · noticesSeen 지도는 자동으로 따라감). WrapView metWords, aborted 주석 고침(조건은 그대로 — 참여 완료는 회화 구현 몫).
- `src/components/session/reward.tsx` · `src/server/session/result.ts` · `src/server/session/index.ts:89` · `result-view.tsx:29 · 172 · 174` met 계열 이름(MetWordCards · metWordsOf · data-met-words · data-met-word · 글 열쇠 metWords)과 주석 '오늘 만난 단어'. 결과의 다시 하기 주석은 '오늘 만난'이 아님 → R-40 · [승인 UX1] 근거로 바꿈. 화면 문구는 하나도 새로 만들지 않았다.

## 시험
- 단위 `tests/unit/ux-screen-feedback.test.ts` 새 시험 다섯: 'U5-11 · R-29 …프로필마다 한 번…'(순수 함수), 'U5-11 · R-29 ①② 안내 줄은 …'(말풍선 그리기), 'R-12 · AC-U3 홈 위 띠의 별 칸은 …', 'R-54 참여 완료 전에 그만둔 대화 …', 'R-19 다시 하기로 한 대화 …'. 옛 기기 저장 시험은 지움. 이름 · 고르개 data-met-word 맞춤.
- `tests/unit/talk-follow.test.ts:225` 'AC-15f · R-54 · R-19 …' 새 문구 · 다시 하기 단어 없음. `star-count.test.ts` · `tests/integration/session-flow.test.ts` · e2e `reading.spec.ts` · `session.spec.ts` 이름 · 주석 · 고르개.
- e2e `conversation.spec.ts`(정적): F.aborted 새 문구 · AC-15f 이름, 그만둔 대화에 단어 카드 보임, 다시 하기 마무리에 단어 카드 0(`:1559`), 새 시험 `:2232` 'U5-11 · R-29 …'(첫 맥락에서 안내 · notices_seen 에 talk_answer_tip · localStorage 열쇠 없음 · 다음 ①② 턴에 없음 → 같은 프로필의 새 브라우저 맥락 둘째 수업에서 없음).

## 관문(p13d, Node 24)
| 명령 | 결과 |
|---|---|
| `pnpm lint` | 461 파일, 고칠 것 없음 |
| `pnpm exec tsc --noEmit` | 종료 0 |
| `pnpm test` | 102 파일 · 1128 통과 · 6 todo |
| `pnpm check:deps` | 위반 0(238 모듈) |
| `pnpm check:ids`(보고) | 규칙 위반 0, design-number 49(기준 49 이하, 새 파일 0건) |
| `pnpm spec:trace --fail-on unknown-ac` | 종료 0, unknown-ac 0 · missing-test 16(P12 몫, 전과 같음) |
| `grep -rn "얻은\|gotWord\|GotWord\|data-got-" src tests` | 0건 |

통합 · e2e 는 이 Mac 에서 돌리지 않았다(정적 작성).

## 우려 2
1. 첫 사용 홈의 위 띠에 별 칸이 없음을 단위로만 잰다. e2e `home.spec.ts` 는 브리프 범위 밖이라 '별 0 → `[data-star-total]` 0개' 단언을 더하지 않았다. AC-U3 의 Playwright 증명은 묶음 3(home.spec.ts)에서 더해야 한다.
2. ①② 안내 기록(markTalkNotice)이 끊김으로 실패하면 그 회화에서는 다시 보이지 않지만 다음 회화에서 한 번 더 보인다(처음 회화 안내 · '막히면 눌러요'와 같은 꼴). 그만둔 대화 판정(wrap.aborted)은 지금도 목표 턴 기준이고, 참여 완료로 바꾸는 일은 회화 spec 구현 몫이다.
