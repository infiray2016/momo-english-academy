# 고침 브리프: 회화 plan 묶음 12 fix 1(impl-talk-12 · Opus · high, 라운드 1/3, 2026-11-05 18:3x 작성)

## 맥락
- 검토 `task-talk-12-review-report.md`(rev-talk-12, Changes requested — Critical 0 · Important 2 · Minor 2). 지난 구현 보고 `task-talk-12-report.md`, 구현 브리프 `task-talk-12.md`. 검토 보고 3절(지적 표)과 4절(이탈 판정 5)을 먼저 읽는다.
- 빠진 것의 성격: 옛 시험을 지우면서 새 꼴 세션도 지나는 공용 서버 길(끝맺음 · 요청 꼴 · 안전 상한 · 시도 id)의 뜻이 새 갈래 시험으로 옮겨지지 않았다. 구현 브리프 '지키는 것' 22줄('지울 것은 지우기 전에 새 갈래 시험이 그 뜻을 덮는지 본다')의 몫이다. 옛 시험 원문은 변경 전 사본 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/p13d-before-12/tests/integration/conversation-session.test.ts · conversation-call.test.ts · conversation-turn.test.ts` 와 `…/p13d-before-12/tests/unit/conversation-call.test.ts` 에 있다 — 뜻은 그대로 옮기고 견본만 새 꼴(talk-fixture 새 도우미)로 바꾼다.
- 컨트롤러 결정: 검토가 컨트롤러에게 맡긴 I-2 (다)도 이번 fix 에 넣는다(첫 프리뷰 전 마지막 코드 묶음이고, 옛 원문이 있어 옮기기만 하면 된다). 통합 · e2e 는 이 Mac 에서 못 돌리니 정적으로 쓰되, 부르는 함수 · 화면 표지 · 설정 키를 코드 줄로 대조해 보고에 적는다(CI 첫 실행에서 확인된다).
- 요청자가 강조한 뜻: 새 갈래의 동작은 바꾸지 않는다. 이번 fix 는 시험 · 견본 파일만 고친다. 시험을 쓰다가 src 의 결함을 찾으면 고치지 말고 보고 '우려'에 적는다(컨트롤러가 정한다). 설계 숫자는 설정값(시험도 설정 키로 읽는다). 1~3단계 영어 문장을 보여 읽게 하지 않는다.

## 할 것
1. **I-1 — AC-23f 바로 보낸 1~3단계 턴 e2e.** `tests/e2e/required-utterance.spec.ts` 1단계 시험에 턴 하나를 더한다: 가짜 응답에 `choices` · `support: "choices"` 를 두고, 아이가 그 선택지 하나를 말해 바로 보내지게 한 뒤 `measuredTurn(…, { direct: true })`. 인사 턴 단언을 걷은 것은 그대로 둔다. 바로 보냄 조건은 `child-turn.tsx` 463~480줄(confirmPlanOf — 들은 소리 줄 · 연 힌트와 맞으면 autoSend)과 `talk-frame.tsx` 1561줄(childHeardOf(playedSoundsOf))로 대조한다.
2. **I-2 (가) — 끝맺음 통합 시험.** `runTalkClosing`(closing.ts 509줄) · `talkClosingStatus`(660줄) · `closeIdleTalks`(725줄)를 실제로 부른다. 뜻: '그만하기' 응답 뒤 `tasks` 를 돌려 talk_closing 요청의 최대 출력(설정값) · 60초(AC-8c, 정본 11절 111줄), 요약 저장이 한국어 · 가림 · 다음 대화 요청에 최근 talk.memory_summaries 개(AC-16b, 188줄), 끝난 뒤 보낸 메시지 · 다시 쓸 차례 지움(AC-16c), 끝맺음 두 요청이면 호출 하나, 참여 완료 뒤 떠난 대화는 talk.idle_close_minutes 뒤 첫 홈 진입에 한 번 · 다른 기기 홈 진입은 닫지 않음(AC-15f), 쉬는 날 '그만하기'는 끝맺음 없이 중단, 이번 묶음이 더한 옛 꼴 대기 기록 건너뜀(closing.ts 554~597줄 — 옛 꼴 세션 행 하나를 직접 넣어 skipped · 보낸 메시지 지움 · AI 안 부름).
3. **I-2 (나) — 회화 턴 요청 꼴.** AC-8f 세 갈래(정본 114줄: 모델 설정이 Haiku 면 thinking disabled · fallbacks 없음, 4단계부터), AC-N4 · AC-16b 의 요청 본문 가림 · 요약 n 개, 하루 안전 상한 safety_cap 행 · 설정 문제 config · ai_calls 첫 문장 시간. 새 갈래에는 지금 `talk-stream-call.test.ts` 195줄(1~3단계 기본값) 하나뿐이다.
4. **I-2 (다) — 공용 길 나머지.** 하루 안전 상한 회화 셋(상한 날 새 회화 막힘 · 도중 쉬는 안내와 다음 학습일 같은 시도 id · 쉬는 날 '그만하기'는 끝맺음 없이 중단), 같은 시도 id 겹침 · 두 기기(진행 중이면 AI 없이 다시 읽으라는 답), AC-15f 선생님 말 없는 마지막 턴 다시 받기(`talk-lesson-turn.test.ts` 716줄은 되살리기 순수 몫만), AC-2c 회화 다시 하기(같은 주제 변형 · 친한 정도 안 오름).
5. **M-1.** `tests/unit/talk-lesson-actions.test.ts` 의 lessonFollowOf 시험에 clientListen 을 넘겨 input 에 그대로 실리는지(글 없음) 한 줄(C149 — 따라 말하기 시도에도 듣기 요약이 듦, `index.ts` 518줄 · `follow-along.tsx` 200줄).
6. **M-2.** `tests/e2e/talk-lesson.spec.ts` 229줄 근처 '그만하기' 시험에 두 줄: `[data-wrap-log]` 가 마지막 선생님 말('What do you do on Sunday?')을 담는지, `[data-wrap-shine]` 줄에 `ring-4` 가 남는지(N-4 (가)(라), `talk-frame.tsx` 1340 · 550 · 585~600줄).
7. **관문.** biome ci · tsc · `vitest run --project unit` · check:deps 0(통합 · e2e 는 tsc · biome 만). 새 단위 시험이 있으면 먼저 실패를 확인한다. 시험 파일은 '있으면 Edit 로만'(T-96).

## 하지 않을 것
- src 고치기 · 새 갈래 동작 바꾸기 · 시드 · 정본 · plan 고치기(plan 증명 표의 새 행은 컨트롤러 몫). 커밋 · push · 개발 DB 쓰기 · 환경 파일 값 출력.

## 지키는 것
- 코드는 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸, 세션 cd 금지. 긴 출력은 스크래치패드 파일로.
- 문서 · 보고는 본 저장소 `/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-29-회화-수업을-대화로/`.

## 보고
`task-talk-12-fix1.md`: 항목별 ADDRESSED 근거(파일 · 줄 · 시험 이름), 옮긴 통합 시험 표(옛 시험 ↔ 새 시험 · 부르는 함수 · 대조한 코드 줄 · 설정 키), 새로 만든 시험 파일 이름, 관문 수치, 시험을 쓰다 찾은 src 결함(있으면), 우려. 답(메시지)은 요지 열 줄 안.
