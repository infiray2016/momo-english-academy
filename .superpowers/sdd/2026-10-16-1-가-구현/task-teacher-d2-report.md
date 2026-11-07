# 구현 보고: P13d 묶음 d2 — profiles.teacher_key · 명단 서버 · 보일 선생님 · 고르기 액션 · 회화 화면 자료(impl-teacher-d2 · Opus · high, 2026-10-23 13:2x)

상태: DONE_WITH_CONCERNS(통합 · e2e 는 이 Mac 에서 못 돌려 CI 확인 필요 — 브리프대로). 커밋 · push · 개발용 DB 적용 없음. 워크트리 `.claude/worktrees/p13d`(바탕 ff745d8).

## 바뀐 파일(d2 범위만)

| 파일 | 신규/수정 | 무엇을 |
|---|---|---|
| `src/db/schema/learning.ts:56-57` | 수정 | profiles `teacherKey: text("teacher_key")`(비울 수 있음) |
| `drizzle/0004_profiles_teacher_key.sql` · `drizzle/meta/0004_snapshot.json` · `drizzle/meta/_journal.json` | 신규(생성) · 수정 | `pnpm db:generate --name profiles_teacher_key` |
| `src/server/seed-lists.ts:1,16,29` | 수정 | `LIST_SCHEMAS.teachers = TeachersFileSchema` |
| `next.config.ts:21-26` | 수정 | `outputFileTracingIncludes` "/" · "/*" 에 `./seed/teachers.json` |
| `src/core/teacher/roster.ts` | 신규 | `TeacherView` · `teacherViewOf` · `visibleTeachers` · `resolveTeacher`(순수) |
| `src/server/teacher/index.ts` | 신규 | `rosterOf` · `teacherPromptOf` · `teacherChoicesOf` · `readHouseholdTeacher` · `householdTeacher`(React cache) · `chooseTeacherFor` |
| `src/server/actions/teacher.ts` | 신규 | `chooseTeacher`(`'use server'`, 첫 문장 `await requireAccess()`) |
| `src/core/conversation/attempt.ts:52-56` | 수정 | talk-start 꼴에 `teacherKey: z.string().regex(/^[a-z]+$/).optional()` |
| `src/server/conversation/state.ts:43-67,117-121,666-684,740` | 수정 | `TalkState.teacher: Teacher \| null` = `resolveTeacher(rosterOf(), 스냅숏 teacherKey, 프로필 teacherKey) ?? null` |
| `src/server/conversation/index.ts` | 수정 | `TalkTeacherSettings` 형, `TalkView.teacher` · `teacherChoices` · `teacherSettings`, `viewSettingsOf` 가 talk.teacher_render(enum 3d·portrait) · talk.teacher_load_timeout_seconds · talk.teacher_praise_seconds(양수) 읽음, `loadTalkView` 가 선생님 없고 스냅숏 없으면 `ensureStarted` 안 부름, `ensureStarted` 스냅숏에 `teacherKey` |
| `tests/integration/talk-fixture.ts` | 수정 | `resetHousehold(db, level = 1, teacherKey: string \| null = "mina")` |
| `tests/e2e/household.ts` | 수정 | `insertHousehold({ teacherKey?, ...choices })`(기본 null) |
| `tests/e2e/talk.ts` | 수정 | `talkHousehold(level, { teacherKey = "mina" } = {})` |

## 마이그레이션 SQL

```sql
ALTER TABLE "profiles" ADD COLUMN "teacher_key" text;
```

더하기만이고 RLS 는 테이블 그대로다. 개발용 DB 적용은 컨트롤러 몫(plan 최단 차례 3 — 설정 키 다섯과 함께).

## 시험

- 단위 `tests/unit/teacher-roster.test.ts`(신규, 8건): AC-19a 보일 선생님 · 셋째 항목이면 셋 / AC-19b 영어 이름 Mina(대소문자 · 조각 · 별명) / 한글 이름 미나 · 성 뺀 이름 · 리오 / 부분만 같은 이름은 다 보임 / 다 빠지면 명단 전부 / 선생님 정하기 차례 · 명단 밖 키 건너뜀 / 화면 몫에 personaEn · 출처 · 영어 이름 없음 / 명단 서버가 seed/teachers.json 을 읽음.
- 통합 `tests/integration/teacher.test.ts`(신규, 6건 — d6 이 지우기 시험을 더함): 쿠키 없이 401 · teacher_key 비어 있음 / 고르면 남고 집 선생님 / 명단 밖 · 꼴 틀림 unknown / 영어 이름 Mina 면 미나 hidden · 리오 됨 / 이미 고름 already · 명단 밖 키가 남은 프로필은 다시 고름 / 두 요청 겹쳐도 한 번.
- 통합 `tests/integration/conversation-session.test.ts` 새 describe '회화 선생님'(3건): 처음 스냅숏 키 · 프로필이 바뀌어도 스냅숏 키 · 스냅숏 키가 명단 밖이면 프로필 선생님 · 옛 스냅숏(키 없음) 읽힘 · teacherSettings 값 / 선생님 없으면 스냅숏 · 토리 행 1 미룸 → 고른 뒤 들어가고 판이 바뀜 / 영어 이름 Mina 면 고를 선생님 리오만.
- 기존 회화 통합 · e2e 는 시험 집 기본값 미나로 그대로 간다(위험 1).

## 관문(Node 24 PATH, 2026-10-23 13:22)

| 명령 | 결과 |
|---|---|
| `pnpm lint` | Checked 415 files, No fixes applied |
| `pnpm exec next typegen && pnpm exec tsc --noEmit` | 오류 0 |
| `pnpm test` | 86 files · 906 passed · 6 todo(같은 워크트리 d1 · d5 시험 포함) |
| `pnpm check:deps` | no dependency violations found |
| `pnpm seed:validate` | 칸 720 · 통과 720 · 실패 0 · 규격 파일 오류 0 |
| `pnpm check:ids` | 종료 0. 경고는 모두 이전부터 있던 design-number 줄이고 d2 파일은 없음 |
| 통합 · e2e | 이 Mac 에서 돌지 않음 — CI 확인 필요 |

## plan 으로 풀리지 않아 정한 것

1. **액션 입력은 `unknown`.** plan 은 `chooseTeacher({ key })` 지만 다른 액션처럼 `chooseTeacher(input: unknown)` 으로 받고 서버가 `z.strictObject({ key: /^[a-z]+$/ })` 로 다시 본다. 꼴이 틀리면 `unknown`(남는 칸이 있어도).
2. **몸은 `src/server/teacher` 의 `chooseTeacherFor(input, { db, roster })`.** 액션은 접근 확인 뒤 부르기만 한다 — 통합 시험이 시험 DB 로 몸을 부르고, 401 만 액션으로 본다.
3. **집 프로필이 없으면 `already`.** 쓸 행이 없어 조건 UPDATE 가 0 행인 것과 같은 뜻으로 두었다(화면이 다시 읽으면 첫 실행으로 감). 바깥 꼴에 새 까닭을 더하지 않았다.
4. **`TeacherView.modelPath` · `portraitPath` 는 앞에 `/` 를 붙인 같은 출처 주소**(`/teachers/mina.9c5152a7.vrm`). 명단 칸은 public/ 기준 경로(앞 / 없음)라 그림 경로(picturesOf)와 같은 꼴로 바꿨다. d6 · d7 · d8 은 그대로 src 로 쓴다.
5. **`teacherChoices` 는 teacher 가 있으면 빈 목록**(칸은 늘 있다).
6. **`householdTeacher` 는 `readHouseholdTeacher({ db, roster })` 를 감싼 React `cache`.** 시험은 감싸지 않은 쪽을 부른다. 읽기 실패는 null · 오류 이름만 로그(plan 그대로).
7. **TalkState 의 명단은 `rosterOf()`(시드 목록 캐시) 를 바로 읽는다.** 명단이 없거나 깨지면 던진다(readTalkState 의 '카드 · 규격이 깨졌으면 던진다'와 같은 뜻). TalkServerDeps 에 명단 주입 칸은 두지 않았다.
8. **talk.teacher_praise_seconds · talk.teacher_load_timeout_seconds 는 양수, talk.teacher_render 는 `"3d" | "portrait"` enum** — 틀리면 지금 설정 읽기처럼 던진다.
9. **처음 스냅숏 키를 TalkStart 형에 넣지 않았다.** readTalkState 안 지역 값으로만 써서 TalkState.teacher 를 정한다(d3 이 state.ts 를 뒤에 고치므로 바뀐 면을 작게).

## 요청하는 변경(공용 파일 · 설계)

없음.

## 남은 우려

- **통합 · e2e 미확인.** 새 통합 9건과 시험 집 기본값이 기존 회화 통합 · e2e 를 초록으로 지키는지는 CI 에서 본다. 겹침 시험은 Postgres READ COMMITTED 의 UPDATE 재평가(늦은 쪽이 'mina' 를 보고 0 행)에 기댄다.
- **선생님 없이 스냅숏 전인 세션에 턴 · 토막 넘김 요청이 오면** — d6 화면 전에는 막는 화면이 없다. 턴 길(turn.ts) · advanceTalk 는 고치지 않았다(d2 범위 밖). 지금 e2e · 통합은 시험 집이 미나라 이 길을 타지 않는다. 다만 d2 를 담은 코드로 d6 전에 개발용 DB 에서 회화를 열면, 0004 적용 뒤 프로필 teacher_key 가 비어 있어 처음 스냅숏 · 토리 행 1 이 들어가지 않고 화면이 인사 질문 없이 열린다. d6 전에 로컬에서 회화를 볼 일이 있으면 컨트롤러가 0004 적용 때 그 프로필에 'mina' 를 넣을지 정해야 한다(지금 프리뷰 87ea684 에는 영향 없음).
- **readTalkState 마다 profiles 한 줄 읽기가 더해졌다**(명단은 캐시). 턴 길에서 여러 번 부르지만 기본 키 조회 하나다.
- `src/core/teacher/` 폴더의 state.ts · voice.ts 는 d5 몫이고 d2 는 roster.ts 만 만들었다.
