# 브리프: 회화 plan 묶음 7 fix 1(구현자 · Opus · high, 2026-11-05, fix 라운드 1/3)

## 맥락
- 닿는 결정: 13절 C192(회화 plan 승인) · C194(plan 보정), plan 정한 것 6 · 9 · 10 · 22. 묶음 7 브리프 `task-talk-7.md`, 구현 보고 `task-talk-7-report.md`, 코드 검토 `task-talk-7-review-report.md`(rev-talk-3 · Opus xhigh, Changes requested: Critical 0 · Important 1 · Minor 4).
- 앞 묶음이 넘긴 것: 묶음 7 은 서버 상태 · 기록(0006 마이그레이션 · 시도 꼴 · 상태 읽기 새 갈래 · 끝맺음 까닭)이다. Approved 뒤 컨트롤러가 개발 DB 에 0006 을 적용하고 묶음 8 · 9 를 띄운다(장부 T-43 · T-51).
- 요청자가 강조한 뜻: 숫자는 설정값이다(`talk.prep_words.<구간>` 은 `seed/settings.json`, 코드에 두지 않는다). 정본과 plan 이 다르면 정본이 우선한다.
- 읽을 정본: `specs/02-2-세션과-단계표.md` 173줄(다지기 · 보강 수업의 짧은 준비는 이월 단어를 앞세워 talk.prep_words.<구간> 개까지) · 176줄, `specs/11-요구사항과-수용-기준.md` AC-16a(187줄).
- 세션이 초기화되어 지난 구현자(impl-talk-3)의 기억은 없다. 위 보고 · 검토 파일을 먼저 읽는다.

## 할 것(검토 보고 3절의 I-1 · M-1 · M-2 · M-3)
1. **I-1(Important).** `src/core/conversation/attempt.ts` 189~212줄 lessonFollowAlongNo 의 짧은 준비 범위가 `counts.todayWords`(카드 오늘 쓸 말 수)라 다지기 · 보강 카드(todayWords 0)에서 첫 낱말부터 RangeError 가 난다. 범위를 max(오늘 쓸 말 수, talk.prep_words.<구간>)로 잡는다. LessonFollowCounts 에 prepWords 칸을 더하고 값은 부르는 쪽이 설정값에서 넘긴다. 시험을 먼저 쓴다: 다지기 카드(todayWords 0, prepWords 설정값)의 prep 0 번이 활동 번호를 받는 것 — 고치기 전에 실패(RangeError)를 본 뒤 통과시킨다. 구현 보고 `task-talk-7-report.md` '묶음 8 · 9 에 넘길 것' 3 의 부르는 꼴 `{ todayWords: card.todayWords.length }` 도 새 칸을 넣은 꼴로 고친다.
2. **M-1.** `task-talk-7-report.md` 81줄 '옛 흐름은 move 를 쓰지 않으므로 그대로 돈다' 가 틀리다. Drizzle 은 select · insert · returning 에 스키마의 모든 열을 적으므로, 0006 을 적용하지 않은 개발 DB 에서는 옛 흐름의 상태 읽기 · 턴 저장도 `column "move" does not exist` 로 깨진다. 보고 문장만 바로잡는다. 코드는 고칠 것이 없다(운영은 Approved 뒤 0006 을 먼저 적용, 검토 보고 4절 물음 2).
3. **M-2.** `tests/unit/talk-lesson-attempt.test.ts` 265줄이 `journal.entries.at(-1)` 로 '마지막 줄이 0006'을 단언한다. P12 가 0007 을 더하면 깨지므로, tag 로 그 줄을 찾아 idx 6 을 보게 한다.
4. **M-3.** AC-16a 표지 시험(`tests/unit/talk-lesson-state.test.ts` 167 · 181줄, `talk-lesson-attempt.test.ts` 133줄)이 끝맺음 기록의 까닭과 부름만 보고 친한 정도를 보지 않는다. 표지를 정한 것 6 으로 바꾸거나, lessonClosingOf 시험에 talkEndOf 의 friendship(완료 넷 참 · stop_confirmed 거짓)을 함께 단언해 16a 의 묶음 7 몫을 드러낸다. 둘 가운데 하나를 고르고 까닭을 보고에 적는다.

## 하지 않을 것
- M-4(closing.ts 잠금표 · plan 파일 표 · 묶음 8 브리프의 파일 목록)는 컨트롤러가 고친다.
- 다른 손의 파일: `src/core/seed/check-talk.ts` · `tests/unit/seed-validator-talk.test.ts`(컨트롤러가 고치는 중), `seed/prompts/talk-3.md` · `seed/prompts/README.md`(학습 설계자가 고치는 중), '5-나' 파일(`src/core/conversation/{flow,spoken,hints,wrap-up,said,lesson-turns,lesson-flow,question-check,chances}.ts` · `src/core/ai/calls/talk.ts` · `talk-lesson.ts`), 묶음 8 · 9 파일(`src/server/conversation/turn.ts` · `index.ts` · `src/server/ai/talk.ts` · route).
- 0006 마이그레이션 내용과 개발 DB 는 건드리지 않는다. 설계를 바꾸지 않는다.

## 지키는 것
- 시험을 먼저 써서 실패를 본 뒤 통과시킨다. 단위 · 관문(biome ci · vitest unit)은 0 이어야 한다. 통합 시험은 이 Mac 에서 돌지 않으니 정적으로 쓴다.
- 코드는 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸이고 세션 cd 는 하지 않는다. 커밋 · push 금지, 환경 파일 값 출력 금지.
- 문서 · 보고 파일은 본 저장소 `/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-29-회화-수업을-대화로/` 에 있다(p13d 에는 이 폴더가 없다).

## 보고
`task-talk-7-fix1.md`(같은 폴더): 지적마다 고친 파일 · 줄, 시험 이름(먼저 실패를 본 것 표시), 관문 결과, 설계와 다르게 한 것, 우려. 답은 요지 열 줄 안.
