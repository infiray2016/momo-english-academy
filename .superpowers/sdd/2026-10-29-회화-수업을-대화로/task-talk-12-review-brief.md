# 검토 브리프: 회화 plan 묶음 12 — 옛 흐름 걷기 코드 검토(code-reviewer · Opus · xhigh, 2026-11-05 17:5x 작성)

## 맥락
- 닿는 결정: 13절 C192(회화 plan, 묶음 12 행 = 옛 갈래 · 옛 응답 꼴 · 옛 시험 지우기, 옛 꼴 카드 닫기, 없앤 키 둘, 회화 e2e 를 새 꼴 견본으로, 증명 AC-15d · 15h · 15j · 7a 회귀) · C189(새 흐름이 옛 흐름을 바꿈, plan 정한 것 1 · 2) · C198(첫 프리뷰 하나, 1단계 회화는 둘째 프리뷰까지 닫힘 — plan 위험 14) · C200(커밋 · push 는 이 묶음 Approved · 전체 관문 뒤, AI 장애 때 무한 대기 · 돌아갈 수 없는 화면 없음). plan `intent/2026-10-29-회화-수업을-대화로/plan.md` 끝 보정 11-05 문단 (6)(지울 옛 액션 이름) · (8)(잠금표) · (9)(옛 talk-stream 이름), 위험 12(0c664c3 고침 시험을 새 갈래로 옮긴 뒤 옛 몫만 지움).
- 앞 묶음이 넘긴 것(장부 `ledger-open.md` T-57 · T-65 · T-67 · T-77 · T-83 · T-85 · T-86 · T-99 · T-103 · T-105): '5-나' N-2(공용 스키마 choices · koExplainFromStuck 필수 · twoAnswers 지움), SUPPORT_STAGE_EASY 사본 셋 → move.ts 공용 상수, F-1(출력 검사 뒤 support 다시 맞춤), 옛 액션 여덟 · 옛 감싸기 · 옛 talk-stream 이름, 묶음 10 N-3(tori.tsx 문구), 묶음 11 N-4(정리 반짝임 동작 몫) · N-5(page.tsx catch 오류 기록).
- 요청자가 강조한 뜻: 옛 흐름 걷기로 아이에게 보이는 새 갈래 동작이 바뀌면 안 된다. 1~3단계 회화에서 영어 문장을 보여 읽게 하지 않는다(T2 · R2). 설계 숫자는 설정값. 커밋 · push 는 요청자 지시 때만(이 묶음이 첫 프리뷰 전 마지막 코드 묶음이다).
- 이 Mac 은 통합 · e2e 를 못 돌린다(시험용 Postgres 가 안 뜸). 옮긴 통합 · e2e 는 코드로 정적 대조만 할 수 있고 CI 첫 실행에서 확인된다 — 그만큼 정적 대조를 꼼꼼히.
- 세션 기억은 없다. 먼저 읽을 것: 구현 브리프 `task-talk-12.md`, 구현 보고 `task-talk-12-report.md`, 구현자 메모(스크래치패드 `notes-12.md`), 정본 `specs/02-2-세션과-단계표.md` 3.3 회화 블록 · `specs/09-설정값.md`. 깊은 배경은 plan 묶음 표 29줄 · 파일 표 183~186줄.

## 보는 것(새 발견 + 안 닫힌 것만)
변경은 컨트롤러가 만든 패치로 본다(변경 전 사본 ↔ p13d, 89 파일 · +1,965 · −17,744):
- 패치 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/diff-12.patch`(24,428줄 — 파일 단위로 `grep -n '^diff -ruN'` 해 자리를 찾고 `sed -n` 으로 토막만 읽는다. 전문을 한 번에 읽지 않는다).
- 파일별 통계 `…/scratchpad/diff-12-stat.txt`(더함 · 지움 · 경로). 변경 전 사본 `…/scratchpad/p13d-before-12/`(package.json · scripts · seed · specs · src · tests).
- 구현자 관문 출력 `…/scratchpad/biome-ci2.txt · tsc2.txt · unit2.txt · deps2.txt · ids2.txt · trace2.txt · seed2.txt`.

1. **설계 준수.** 브리프 할 것 1~7 이 다 됐는지(빠진 것 · 넘친 것 · 잘못 이해한 것). 보고 7절 '설계와 다르게 한 것' 1~6 을 하나씩 판정한다. 특히 5(e2e AC-23f '1~3단계 바로 보낸 인사 턴' 단언 걷음, speech-feedback U5-9 · U5-3 지움)가 새 흐름 인사 턴의 실제 동작(소리 줄 없이 인식 확인)과 맞는지 서버 · 화면 코드로 대조한다.
2. **새 갈래 동작 불변.** 새 갈래 파일에 섞인 변경(page.tsx 20/26, child-turn.tsx 7/51, follow-along.tsx 20/421, talk-frame.tsx 93/1275, tori.tsx 49/160, talk-lesson.ts 22/21, hints.ts 6/109, stream.ts 5/14, talk-stream.ts 10/80, closing.ts 27/52, index.ts 101/1194, state.ts 34/804, lesson-turn.ts 7/8, lesson-input.ts 2/2, lesson-list/index.ts 23/1)이 '지움 · 이름 바꿈 · 묶음 11 이 넘긴 동작 몫'을 넘어 아이에게 보이는 동작을 바꾸지 않는지. `lessonTurnReadyOf` 로 꺼낸 조건이 옛 틀 효과 조건과 같은지. `ToriBubble` 을 정리 한 장 꼴로 줄인 것이 정리 조각(`closing-cards.tsx` · `LessonWrapUp`)의 표시를 바꾸지 않는지.
3. **위험 12.** 0c664c3 고침 다섯(C149 듣기 사건 칸 · C148 no-speech · N3 듣는 동안 단추 끔 · AC-N8 체감 대기 · '모름' 턴 A~E · talk-hold C127 잡아 두기)의 뜻이 보고 5절 표대로 새 갈래 시험에 실제로 덮였는지 — 옮긴 시험의 단언을 읽어 이름만 옮긴 빈 시험이 아닌지, 빠진 뜻(예: A~E 가운데 하나)이 없는지.
4. **정한 것 2 · C200.** 옛 꼴 세션 닫기(쪽 자료 읽기 때 중단 · 까닭 aborted · idle, 끝맺음 skipped)와 수업 목록 새 꼴만(`listableLessonsOf`): 열린 옛 꼴 세션을 가진 아이가 홈 → 회화 → 세션 쪽에 들어갈 때 돌아갈 수 없는 화면 · 무한 대기 · 던짐 없이 끝나는지, 학습일 · 이음매 셈이 중단 규칙(02-1 · 02-3)과 맞는지, `talkSegmentOf` 가 DB 옛 값을 던질 때 그 길이 옛 꼴 세션 닫기보다 먼저 닿지 않는지.
5. **공용 스키마 · 시드 · 적재.** `TalkLevelSpecSchema` 필수 칸 둘 · `twoAnswers` 지움 · `TALK_SEGMENTS` 축소가 검증기(`seed:validate` · `level-spec-talk-v1` · AC-15m 'old' 까닭) · 적재기(`scripts/seed-load.ts`) · 개발 DB 개정 3 행(T-60: 새 꼴 세션은 개정 3 행만 읽음)과 맞는지. 옛 개정 행을 읽는 길이 남아 있으면 어디서 깨지는지. `talkCardKindOf` 의 old 판정 칸 넷(firstQuestion · turns · moreTalk · questions)이 옛 꼴을 빠짐없이 잡는지. 시드 보기(`src/app/dev/seed-viewer/talk-card.tsx`)에 옛 몫이 정말 없는지.
6. **없앤 키 둘.** `talk.practice_rounds` · `talk.reask_sentence_every_turns` 참조가 src · tests · seed · scripts · specs 에 0 인지(grep). p13d `specs/09-설정값.md` 사본이 본 저장소 정본 `/Users/hikaru/workspace/momo-english-academy/specs/09-설정값.md` 과 같은지.
7. **넘긴 것 판정.** N-2 · 받침 상수(사본 없음 시험 포함) · F-1(시험이 먼저 실패했다는 보고 — 단언이 support 재맞춤을 실제로 가르는지) · N-3 · N-4 (가)(나)(라) · N-5 각각 ADDRESSED · NOT ADDRESSED(근거).
8. **시험 수 · 관문.** 1862 → 1780 · 6 todo 가 notes-12 의 파일별 변화와 맞는지, 관문 출력 일곱이 보고 6절 수치와 같은지. 지운 시험 파일(단위 셋 · 통합 셋 · e2e 하나 · 견본 아홉)에 새 갈래 시험으로 옮기지 않은 뜻이 남았는지 — 특히 통합 conversation-session(1255줄) · conversation-turn 의 세션 수명 · 학습일 · 이음매 단언.
9. **문장 문.** `stream.ts` 의 lowLevel 옵션 · "question" 갈래 지움이 새 흐름(서버 잡아 두기, plan 정한 것 19)에 닿지 않는지 — `talk-stream.ts` · `src/app/api/talk/turn/route.ts` · `server/ai/talk.ts` 의 호출 자리로 확인.
10. **제약.** 이번 diff 가 AI 호출 서버만 · 키 서버만 · Zod 검증 · 녹음 없음 · 1~3단계 영어 글 노출 없음 · 설계 숫자 설정값을 깨뜨리지 않았는지(새 갈래 전체 재검토는 아님).

## 하지 않을 것
- 코드 고치기 · 개발 DB 쓰기 · 커밋 · push. 통합 · e2e 실행(안 뜸 — 정적 대조). 환경 파일 값 출력. 묶음 13 · 14 · 16~18 몫 지적(넘길 것으로만 적는다).

## 지키는 것
- 지적마다 심각도(Critical · Important · Minor)와 근거(파일 · 줄, 정본 절 · 줄, plan 줄). 근거 없는 지적은 넣지 않는다. 열린 항목마다 '닫힘 · 아직 열림(근거)'.
- 코드는 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`(HEAD 0c664c3 위 미커밋 변경 — `git diff` 는 묶음 1~12 전부라 쓰지 말고 위 패치로 본다). 명령은 `( cd /Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸, 세션 cd 금지. 단위 시험 하나를 다시 돌려 보는 것은 된다(`pnpm vitest run --project unit tests/unit/<파일>`), 긴 출력은 스크래치패드 파일로.
- 문서 · 보고는 본 저장소 `/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-29-회화-수업을-대화로/`(p13d 에는 이 폴더가 없다).

## 보고
`task-talk-12-review-report.md`: 판정(Approved · Changes requested) 첫 줄, Critical · Important · Minor 표(번호 · 자리 · 근거 · 고칠 방향), 보고 7절 '설계와 다르게 한 것' 1~6 판정, 넘긴 것 N-2 · 받침 상수 · F-1 · N-3 · N-4 · N-5 판정, 위험 12 다섯 대조 표, 묶음 14(첫 프리뷰 눈 점검 · CI 첫 실행) 에 넘길 것. 답(메시지)은 요지 열 줄 안 — 판정 · Critical · Important 수 · 한 줄씩.
