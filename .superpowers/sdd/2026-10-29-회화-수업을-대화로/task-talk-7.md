# 브리프: 회화 plan 묶음 7 — 서버 상태 · 기록(구현자 · Opus · high, 2026-10-30 09:4x, 묶음 5 · 6 Approved 뒤 · '5-나'와 나란히)

plan `intent/2026-10-29-회화-수업을-대화로/plan.md`(approved C192, 보정 C194) 묶음 표 7 행(24줄: 마이그레이션(move · prep) · 시도 꼴 · 상태 읽기 새 갈래 · 끝맺음 까닭 · 감시 기록 칸, 증명 AC-15v(move) · 16a), 파일 표 165~167줄, '이름 · 설정값 · 문구' 절의 move 꼴 표와 107줄 시도 꼴, 정한 것 6 · 9 · 10 · 17 · 22 를 구현한다. 설계는 spec 4판 설계 1~5 와 정본 02-2 3.3 회화 블록 · 04 5절(talk_turns · attempts · client_listen) · 07 7절이다.

## 할 것(파일 표 165~167줄)
1. **마이그레이션.** `pnpm db:generate` 로 다음 번호 하나를 만든다. 정한 것 22 대로 P12 의 열 넷과 다른 파일이고, P12 구현은 회화 첫 프리뷰 뒤라 이 묶음이 먼저 닿는다. 내용은 `ALTER TYPE talk_segment ADD VALUE 'prep'` 과 `ALTER TABLE talk_turns ADD COLUMN move jsonb`(비울 수 있음)이고, Drizzle 스키마(`src/db/schema/content.ts` · `learning.ts`)를 같이 고친다. ADD VALUE 로 더한 값은 같은 마이그레이션 안에서 쓰지 않는다(Postgres 규칙). drizzle generate 는 이 구현자 혼자 한 번 한다. RLS 는 표 단위라 그대로다. 개발 DB 적용(migrate)은 컨트롤러가 첫 프리뷰 때 한다(작업 순서 10). 이 묶음은 적용하지 않는다.
2. **TALK_SEGMENTS 에 prep.** 묶음 3 이 단계 규격 열거(TALK_LEVEL_SEGMENTS)에만 둔 prep 을 DB 열거와 옛 흐름 형(TALK_SEGMENTS)에도 넣는다(묶음 3 보고 '설계와 다르게 한 것' 1 이 이 묶음으로 미룸). 옛 흐름 형이 깨지면 갈래를 좁혀 동작을 그대로 둔다.
3. **시도 꼴(attempts.input, 판 1 그대로 더하기만, plan 107줄).** talk-start 에 prepWords · carry(선택), talk-prep(새, 따라 말하기 시도), talk-floor(새, 꼴만 — 바닥선 동작은 정한 것 17 대로 둘째 묶음 16), talk-closing 의 reason 넷(정한 것 6: closing_question · suggestion · floor · stop_confirmed, 구석 '그만하기'는 stop 그대로). 활동 번호 차례와 범위는 107줄 그대로다. 자리는 `src/core/conversation/attempt.ts`.
4. **감시 기록 칸 sp(정한 것 10).** client_listen 꼴에 선택 칸 `sp` 를 두고 `{ w: tori · card · sound · wait · prep · floor · wrap, h: no_end · not_played }` 를 최근 CLIENT_LISTENS_MAX 개 남긴다. 들려줌 · 글 · 소리는 남기지 않는다. 아이 행과 따라 말하기 시도가 같은 꼴을 쓴다. 자리는 `client-listen.ts`.
5. **상태 읽기 새 갈래(`src/server/conversation/state.ts`).** talkCardKindOf 가 'new' 인 카드에서 새 위치(묶음 5 의 talkLessonPositionOf)를 move 읽기로 되짚고, 짧은 준비 시도와 새 설정을 읽는다. 묶음 3 이 둔 '새 꼴 카드면 오류' 자리를 이 갈래로 바꾼다. 옛 꼴 카드 갈래는 그대로다. tori_ko 저장 조건은 정한 것 9(1~4단계 모두 저장, 1~3단계 겹침 규칙 toriKoShownOf 그대로)다.
6. **끝맺음 까닭 · 바닥선 뒤 끝맺음(`closing.ts`).** 정본 3.3 끝맺음 턴 행대로 reason 넷을 쓰는 길을 둔다. 바닥선 뒤 끝맺음은 꼴만 두고 실제 동작은 묶음 16 이 맡는다.

## 하지 않을 것
- turn.ts · ai/talk.ts · route(묶음 8), 액션 · 화면 자료(묶음 9), 화면(10 · 11), 근거 칸 talk_turns.evidence(P12), saveFollowAlong 의 근거 쓰기 줄(P12 · 묶음 9 · 16 규칙, 정한 것 22).
- '5-나'의 파일: `src/core/conversation/{flow,spoken,hints,wrap-up,said,lesson-turns,lesson-flow,question-check}.ts` · `src/core/ai/calls/talk.ts`. '5-나'가 나란히 돈다. flow.ts 에서 가져오는 이름은 '5-나' 뒤에도 flow.ts 가 다시 내보낸다.

## 지키는 것
- 시험을 먼저 써서 실패를 본 뒤 통과시킨다. 통합 시험(embedded Postgres)은 이 Mac 에서 돌지 않으니 정적으로 쓰고, 실행은 11-01 뒤 CI 다(작업 순서 12). 단위 · 관문은 늘 0 이어야 한다.
- 숫자는 설정값, T2 · R2 · 녹음 없음 · AI 는 서버만 · Zod, 가족 접근 쿠키 · RLS 그대로.
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`, 서브셸 명령, 세션 cd 금지, 커밋 · push 금지, 환경 파일 값 출력 금지. 개발 DB 에 쓰지 않는다.

## 보고
`task-talk-7-report.md`(같은 폴더): 마이그레이션 파일 이름과 SQL 요지, 바뀐 형 · 꼴 칸 표, 상태 읽기 갈래, 시험 이름(AC 번호 · 단위 · 정적 통합), 관문, 설계와 다르게 한 것, '묶음 8 · 9 에 넘길 것', 우려. 답은 요지 열 줄 안.

## 보정(컨트롤러 09:4x — 묶음 5 Approved · 묶음 6 fix 1 중)
- **지금 시작한다.** 묶음 5 는 Approved 이고, 묶음 6 은 fix 1 중이지만 고치는 파일이 `src/core/ai/calls/talk-lesson.ts` · 그 시험 · 견본 · 표본뿐이라 이 묶음과 겹치지 않는다. 그 파일들은 건드리지 않는다. '5-나'(impl-talk-5)도 나란히 돈다.
- **prepWords 를 만드는 쪽은 이 묶음이다.** 흐름 입력 `prepWords`('5-나'가 필수 칸으로 바꿈)는 '인사 뒤 준비 토막을 실제로 지났을 때 쪽지로 보인 낱말 전부(건너뛴 낱말 포함)'다. 세션 시작 때 정한 계획 목록(talk-start 의 prepWords)을 그대로 넘기면 when_needed 수업에서 묶음 5 검토 I-2 가 다시 생긴다. 상태 읽기가 talk-prep 시도에서 그 값을 되짚게 하고 시험을 둔다(`task-talk-5-fix1-review.md` 3).
- 낱말 수 설정 `settings.prepWords` 의 이름은 그대로다. '5-나'가 기회 쪽 `prepShown` 을 `prepWords` 로 맞춘다.
