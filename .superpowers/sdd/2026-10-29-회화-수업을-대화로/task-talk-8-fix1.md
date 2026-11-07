# 구현 보고: 회화 plan 묶음 8 fix 1(구현자 impl-talk-8 · Opus · high, 2026-11-05, fix 라운드 1/3)

상태: DONE_WITH_CONCERNS. 검토 보고 `task-talk-8-review-report.md` 의 I-1 · I-2 · M-1~M-4 와 컨트롤러 지시(단원 목표 글 · 보정 11-05 (7), M-5 기록)를 고쳤다. 시험을 먼저 써서 새 시험 열 건이 모두 실패하는 것을 본 뒤 고쳤다(스크래치패드 `f1-red-keep.txt`). 개발 DB 에 쓰지 않았다. 화면 파일(`src/components/**` · `src/app/(child)/**` · `src/server/actions/**`)은 건드리지 않았다. 워크트리 `.claude/worktrees/p13d`.

## 지적마다 고친 것

| 지적 | 고친 자리(p13d) | 시험 |
|---|---|---|
| I-1 AI 소리 줄 겹침 없애기 | `lesson-turn.ts:1023~1038` 소리 줄을 정한 뒤 잡아 둔 선생님 문장(신호 말 밖)이 따라 할 말 · 선택지의 답을 담으면 지운다(reason overlap). 그래서 release · text · rewrite 에서 빠지고, 1~3단계 뜻 줄도 저장하지 않는다(T2). 이미 흘린 문장은 지울 수 없다. 그래서 `server/ai/talk.ts:288` lessonSoundFixedOf 가 흘린 문장(gate.sent)과 소리 줄의 겹침을 overlap 으로 알리고, 그 턴의 ai_calls 를 '검증 실패'로 남긴다(talk:observe 가 셀 수 있음). 짝 꼴은 soundPairsOf(312)이다 | 'I-1 … 잡아 둔 선생님 문장은 … 빠진다' · 'I-1 이미 보낸 … 겹침으로 알린다' · 흘려 받기 시험 둘째(표본 v2-l3-model-offband 의 'The weekend is fun!' 이 겹침) |
| I-2 인사 질문 힌트 | `lesson-turn.ts:404` greetingHintItemOf: 질문 자리가 카드 항목 없음이고 그 질문이 카드 인사 질문과 같은 글(questionKeyOf)이면, 인사 질문의 hintKo · 영어 단(hintTiers 차례로 frameEn · hintEn)을 카드 항목 꼴로 만든다. lessonHintsAt(429)은 카드 항목 → 인사 질문 → AI 힌트 차례로 고른다. 아이 행 hintKind · hintLevel, 끝 줄 hints, 묶음 9 의 힌트 단 길이 이 함수를 쓰므로 함께 채워진다. 함수 형은 쓰는 칸만 받게 좁혔다(LessonHintCard) | 'I-2 … 인사 질문 자리에도 '힌트' 단이 있다'(3단계 뜻 · 틀 · 문장, 1단계 뜻 · 문장) |
| M-1 한 턴에 질문 둘 | `lesson-turn.ts:650` 같은 질문으로 지운 뒤 4단계부터 오는 물음표 문장도 지운다. 끝 처리(같은 파일 959 부근)는 앞서 보낸 AI 질문이 남았으면 카드 자리로 바꾸지 않는다. 이때 갈래는 none 이다 | 'M-1 …' |
| M-2 다시 부른 시도의 stuck | createLessonSentenceFlow 의 stuck 은 시도마다 덮어쓴다 | 'M-2 …' |
| M-3 끊긴 턴의 카드 힌트 | `lesson-turn.ts:1060` 값 없이 끊긴 AI 차례에 보낸 질문이 남으면, move 의 item · words · goals 를 비워 다음 차례가 카드 힌트를 고르지 않는다(07 60줄) | 'M-3 …'(받침 둘째 · 'Is math easy for you?' 뒤 끊김) |
| M-4 제목을 단언하지 않는 시험 | 실패 길 갈래를 순수 함수 lessonOutcomeViewOf(`lesson-turn.ts:1325`)로 빼 서버가 그 값을 쓴다. 단위로 4단계 'Oops'(뜻 있음 · 없음) · 1~3단계 칭찬 · 거절 안전한 대사를 단언하고, 통합 두 번 실패 시험에 아이 행 saidWords 빈 목록을 단언했다 | 'M-4 …' · 통합 'AC-15b … '말했다' 없음' |
| 단원 목표 글(보정 11-05 (7)) | 마이그레이션 `drizzle/0007_unit_specs_goals.sql`(`ALTER TABLE "unit_specs" ADD COLUMN "goals" jsonb;`, generate 한 번) · journal idx 7 · snapshot. Drizzle `content.ts:210` goals jsonb. 적재기 `load.ts:247` unitGoalsOf, 행 값 346, 해시 몸통(목표가 있을 때만), DB 되살림 490. 읽기 `lesson-input.ts:53` goalTextsOf · 62 readUnitGoalTexts. 두 부름: `lesson-turn.ts:1584 · 1748`(단계 맥락과 함께 읽음) · `closing.ts:511` | `tests/unit/seed-load-goals.test.ts`(3: 목표를 담고 해시에 넣음 · 목표 없는 행의 해시는 그대로 · 마이그레이션 0007) · '단원 목표 글 …' |

M-5 · M-6 · M-7 은 컨트롤러 장부 몫이라 고치지 않았다. M-5 는 아래 '설계와 다르게 한 것'에 적었다.

## 관문(2026-11-05 후반, 출력은 스크래치패드 `f1-*.txt`)

| 명령 | 결과 |
|---|---|
| 이 fix 의 시험 셋(`talk-lesson-turn` · `talk-lesson-stream` · `seed-load-goals`) | 36 통과 |
| `pnpm check:deps` · `check:ids`(CI 인자) · `spec:trace` | 모두 0 |
| `pnpm exec tsc --noEmit -p .` | 오류 27, 모두 묶음 10 · 11 이 고치는 중인 파일이다(`tests/unit/talk-bubble.test.ts` 17 · `tests/unit/talk-log.test.ts` 9 · `src/app/(child)/session/[id]/page.tsx` 1). 이 fix 파일은 오류 0 |
| `pnpm biome ci` | 1, `tests/unit/talk-bubble.test.ts:3`(묶음 10)만 걸림 |
| `pnpm vitest run --project unit` | 144 파일 중 2 실패 · 1803 통과 · 15 실패 · 6 todo. 실패는 모두 talk-bubble · talk-log(묶음 10 이 실패를 먼저 보는 단계)이다 |

묶음 10 · 11 이 끝난 뒤 관문을 다시 돌려야 0 이 확인된다. 통합 시험은 이 Mac 에서 돌지 않는다.

## 설계와 다르게 한 것 · 해석(앞 보고에 더함)

1. **4단계부터 거절에도 카드 질문을 붙인다(M-5).** 07 60줄은 거절 뒤 '1~3단계는 그 턴을 카드 자리로 보아 카드 질문을 붙인다'만 적는다. 이 구현은 단계와 관계없이 안전한 대사에 질문이 없으면 카드 자리(fail)로 바꾼다. 질문 없는 차례를 남기지 않는 정한 것 18 의 뜻을 따랐다. 4단계는 둘째 프리뷰라 컨트롤러가 확인할 항목이다.
2. **이미 흘린 겹침 문장은 지우지 않고 기록만 한다(I-1 (2)).** 기록은 ai_calls '검증 실패'다. move 에 칸을 더하지 않았다(move.ts 는 이 묶음 파일이 아님).
3. **단원 규격 해시 몸통에는 목표가 있을 때만 goals 를 넣는다.** 그래서 목표 없는 238행의 해시는 그대로다. 비었으면(빈 목록) 열을 null 로 둔다.

## 요청 · 넘길 것

- **목표가 든 단원 규격 행의 해시가 바뀌는 문제는 아래 '보탬'의 목표 채움 규칙으로 닫았다(컨트롤러 결정 T-87).** 정정 번호를 올리지도, 손으로 채우지도 않는다.
- 묶음 9: 인사 질문 자리의 힌트 단은 lessonHintsAt 이 이제 낸다. 형이 쓰는 칸만 받게 좁혀졌으나 TalkLessonState 는 그대로 넘길 수 있다.
- 묶음 10 · 11: 끝 줄 hints 에 1~3단계 인사 질문 단이 들어온다(1~3단계 영어 단 글은 hintViewsOf 가 그대로 뺀다).

## 우려

1. 관문 0 은 묶음 10 · 11 의 시험 · 화면 파일이 맞춰진 뒤에야 확인된다(위 표).
2. 통합 시험(묶음 8 다섯 · 적재 되살림 해시)은 이 Mac 에서 돌지 않아 CI 에서 처음 확인된다.
3. 겹침 판정은 sayingAnswer(정규화 · 두 낱말부터 '들어 있음')를 쓴다. 그래서 'The weekend is fun!' 처럼 따라 할 말을 감싼 반응도 겹침으로 본다. 잡아 둔 문장이면 지워지고, 흘린 문장이면 기록만 남는다.

## 보탬(같은 fix 라운드 — 컨트롤러 결정 장부 T-87 '목표 채움')

같은 판의 단원 규격 행이 DB 에 goals 없이 있고, 들어온 행에서 goals 를 뺀 몸통의 해시가 DB 행 해시와 같은 경우가 있다. 이것은 '같은 내용에 goals 만 뒤늦게 더해진 것'으로 보아 거부하지 않고 goals 만 채운다. 다른 칸이 하나라도 다르면 지금처럼 version-content-changed 로 거부한다. DB 는 해시를 저장하지 않고 열에서 되살리므로, 채운 뒤 되살린 해시는 들어온 해시와 같다. 그래서 '저장 해시 채움'은 goals 채움 하나로 끝난다.

| 자리(p13d) | 무엇 |
|---|---|
| `src/server/seed/load.ts:464` unitGoalKeyOf · `:483` unitGoalFillsOf | 순수 판정. 들어온 행마다 goals 를 뺀 몸통 해시(buildIncoming 이 unitGoalBases 에 둠)와 같은 판 DB 행 해시 · DB goals 빔을 보고, 맞으면 계획용 DB 행 해시를 들어온 해시로 맞추고 채움 목록에 넣는다 |
| 같은 파일 readVersionRows | 단원 규격 행 가운데 goals 가 빈 행의 열쇠를 함께 돌려준다 |
| 같은 파일 판 계획 앞(`goalFill`) · 넣기 뒤(1243~) | 계획은 맞춘 DB 행으로 짜서 그 칸이 건너뜀이 되고, 넣기 단계가 그 행의 goals 만 UPDATE 한다(다른 열 그대로) |
| 같은 파일 LoadReport.counts.unitGoalsFilled(1210) · `scripts/seed-load.ts:160` | 미리 돌림 · 적재 보고에 '목표 채움 N'. 채운 칸은 '건너뜀' 셈에도 든다 |
| 같은 파일 단원 규격 행 값 | 목표가 없으면 goals 칸을 두지 않는다(열 NULL — 머리 주석 '비울 수 있는 jsonb 에 JSON null 을 넣지 않는다') |

시험(`tests/unit/seed-load-goals.test.ts`, 먼저 써서 두 건 실패를 봄 — 스크래치패드 `f1b-red.txt`):
- '같은 판 단원 규격 행이 DB 에 goals 없이 있고 goals 를 뺀 몸통이 같으면 거부하지 않고 그 행의 goals 를 채운다(목표 채움 1)'. 채움 규칙이 없으면 거부 한 건이고, 있으면 거부 0 · 건너뜀 1 · 채움 1 임을 함께 본다.
- 'goals 밖의 칸도 다른 행은 채우지 않고 지금처럼 version-content-changed 로 거부한다(DB 에 목표가 이미 있어도 채우지 않음)'.

관문(이 fix 의 파일 기준, 2026-11-05 후반):

| 명령 | 결과 |
|---|---|
| 시험 넷(talk-lesson-turn · talk-lesson-stream · seed-load-goals · seed-load-partial) | 41 통과 |
| `pnpm biome ci`(이 fix 의 src · scripts · 시험) | 0 |
| `pnpm check:deps` | 0 |
| `pnpm exec tsc --noEmit -p .` | 오류 1, `src/app/(child)/session/[id]/page.tsx`(묶음 11)뿐이다. 이 fix 파일은 0 |

전체 관문은 묶음 10 · 11 이 끝난 뒤 컨트롤러가 다시 돌린다. 통합 적재 시험(seed-load.test.ts)에서 채움이 실제 DB 에 들어가는지는 CI 에서 처음 확인된다.
