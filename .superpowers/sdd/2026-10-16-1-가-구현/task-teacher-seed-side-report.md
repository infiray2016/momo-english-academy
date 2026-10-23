# 구현 보고: 회화 선생님 — 시드 쪽 몫(implementer · Opus · high, 2026-10-23 09:1x)

상태: DONE_WITH_CONCERNS. 자리는 워크트리 p08(가지 feature/1a-p08-seed-generation), 커밋하지 않았다. 0번은 `diff -rq` 로 확인했고 차이가 없어(컨트롤러가 이미 함) 건너뛰었다. seed/vocab.json · seed/prompts/ 는 손대지 않았다.

## 바뀐 파일

새 파일
- `seed/teachers.json`(48줄): 1-가 명단 미나 · 리오. 키 · 꼴 vrm · 한글 · 영어 이름 · 소개 · 성격 세 낱말 · AI 성격 글 · 인사 · 색(room · accent) · 목소리 높이(1.08 · 0.97) · 출처(LICENSES.md 그대로: 제작자 · 배포처 · 원본 제목 · 원본 파일 · 원본 SHA-256(시제품 파일로 다시 셈해 맞음) · licenseName Other / CC0 · 허용 설정 · 조건 주소). 모델 · 초상 · 목소리 순서 · 줄인 방법 칸은 비웠다.
- `src/core/seed/schema/teachers.ts`(88줄): `TeachersFileSchema` · `TeacherSchema` · `TeacherSourceSchema`. 키 영어 소문자, 꼴 enum(vrm), 한글 이름 한글만, 영어 이름 영문자만, 색 `#rrggbb`, 높이 0~2, 출처 빈칸 없음, 주소 칸은 URL. `model` · `portrait` · `voice` · `source.reduction` 넷만 `.optional()` 이고, 파일 머리 주석에 '선생님 화면 plan 때 필수로 바꾼다'고 적었다.
- `src/core/seed/check-teacher.ts`(329줄, 순수 함수)
  - `teacherNamesOf(roster)`: 옛 이름 Tori · 토리와 명단 이름을 합친다. 명단이 없거나 깨지면 옛 이름만 쓴다.
  - `teacherNameHits(text, names)` · `checkTeacherNames(fragments, names, report)` → 규칙 `teacher-name`
  - `checkTeacherRoster(file, ctx)` → 규칙 `teacher-roster`
  - `checkTeacherAssets(file, assetExists)` → 규칙 `teacher-asset`
  - `contrastRatio`
  - `KO_NAME_TAILS`(이름 뒤에 붙는 조사 · 서술격 · 호칭 꼬리 목록)
- `tests/unit/seed-teacher.test.ts`(487줄, 시험 15개)

고친 파일
- `src/core/seed/structure.ts:288-315`
  - 상수 `OLD_TEACHER_NAMES` · `TEACHER_KINDS` · `TEACHER_TRAITS` · `TEACHER_PERSONA_MAX_SENTENCES` · `TEACHER_INTRO_LINES` · `TEACHER_LABEL_CONTRAST_MIN` · `TEACHER_PITCH` · `WCAG`(대비 식 상수) · `TEACHER_GREETING_LEVEL` 을 더했다.
  - `:567` 에 `SEED_FILES.teachers = "teachers.json"` 을 더했다. 이제 시드 파일 배치 안의 파일이고 규격 파일로 걸린다. 없으면 `reference-missing` 이 난다.
- `src/core/seed/reference-index.ts:5-8 · 26 · 77 · 139 · 515-525 · 560`
  - `ReferenceFiles.teachers` 와 `index.teacherNames` 를 더했다.
  - 명단 검사를 정합 이슈로 돌린다(규격 파일 오류로 셈). 인사 문장 상한은 회화 1단계 규격 sentenceMaxWords 에서 읽는다.
  - lexicon 을 한 번만 만들어 함께 쓰도록 올렸다.
  - `index.ready` 는 명단과 상관없게 그대로 두었다.
- `src/core/seed/validate.ts:29 · 67 · 541 · ValidateOptions.assetExists · 1001-1013`: `REFERENCE_SCHEMAS.teachers` 를 더했다. `assetExists` 를 넘기면 채워진 모델 · 초상의 파일 있음을 규격 파일 오류로 본다.
- `src/core/seed/check-talk.ts:703-707`: `checkTalkCard` 끝에서 `checkTeacherNames(textsOfLesson("talk", lesson))` 를 부른다. 목록 제목부터 카드의 모든 글 칸까지 본다.
- `src/core/seed/check-assessment.ts:15 · 653-657 · 805`: 회화 평가 카드 장(`textsOfTalkTestSheet`)과 선생님 이야기(`textsOfStory`)에서도 같은 검사를 돈다.
- `scripts/seed-validate.ts`: `PUBLIC_DIR = "public"` 을 두고 `runValidate(args, files, assetExists?)` 셋째 인자를 받는다. main 은 `public/<경로>` 가 있는지 보는 함수를 넘긴다.
- `seed/settings.json:88-92`: 다섯 키를 넣었다. 범위 · 값 · 바꾸는 곳은 12절 행 그대로다.
  - talk.teacher_model_max_mb 8(seed)
  - talk.teacher_portrait_max_kb 100(seed)
  - talk.teacher_load_timeout_seconds 6(advanced)
  - talk.teacher_praise_seconds 2(advanced)
  - talk.teacher_render "3d"(advanced)
- `tests/fixtures/settings.ts`: `TEST_SETTINGS` 에 같은 다섯 키 · 값을 넣었다. `loadableSettings()` 가 이것을 받아 시험용 나무 설정이 된다.
- `tests/fixtures/seed/loadable.ts`: `changeViaOf` 가 두 자산 상한 키를 seed 로 낸다(12절 바꾸는 곳 '시드').
- `tests/fixtures/seed/builders.ts`
  - `ReferenceSet.teachers` 와 `teacherRoster()` 견본(미나 · 리오, 모델 · 초상 없음)을 더했다.
  - 회화 질문 'What can Tori do? / 토리는 뭘 할 수 있어?' 를 'What can they do? / 걔들은 뭘 할 수 있어?' 로 바꿨다.
  - 예상 흐름 'Tori asks …' 를 'The teacher asks about things.' 로, 'Tori says the words again.' 을 'The teacher says them again.' 으로 바꿨다(6.3 'The teacher asks …' 꼴).
  - 이야기를 바꿨다: 제목 '선생님 이야기 n', 'Momo finds a …', '모모가 그걸 찾아. 다 같이 놀아.', 질문 'What does Momo find?' · 'Who finds it?'(보기 Momo · a cat · a bird, 답 1).
  - 머리 주석에 이름 규칙 두 줄을 더했다.
  - 읽기 · 쓰기 · 말하기의 Tori 는 C122 대로 그대로 두었다.
- `tests/unit/seed-schema.test.ts`: 규격 표에 `teachers: TeachersFileSchema` 를 넣었다. 시드 나무 파일 수는 `SEED_FILES` 로 세므로 그대로 맞는다.
- `tests/e2e-local/seed-viewer.spec.ts:269`: 7~9 구간 이야기 견본의 뜻 '토리가 그걸 찾았어' 를 '모모가 그걸 찾았어' 로 바꿨다. 화면 단언은 같은 값을 읽어 그대로 맞는다. 로컬 전용이라 돌려 보지 않았다.

## 덮는 시험(tests/unit/seed-teacher.test.ts)

시드 검증 선생님 이름
- AC-19e 막는 이름은 옛 이름 Tori · 토리와 명단의 영어 · 한글 이름이다(명단이 없으면 옛 이름만). 셋째 항목 준 · Jun 을 더하면 막는다.
- AC-19e 영어 이름은 대소문자를 가리지 않고 낱말 경계로 본다(TORI · mina · leo · Tori's · 'Mina가' 는 걸리고, stamina · Leon · leopard · Victoria 는 안 걸린다).
- AC-19e 한국어 이름은 이름 뒤 조사를 허용해 보고, 낱말 안에 든 글자는 보지 않는다(토리가 · 토리야 · 미나에게는 · 리오예요 · '미나 선생님' 은 걸리고, 미나리 · 시나리오 · 스토리 · 카테고리 · 도토리 는 안 걸린다).
- AC-19e 글 조각마다 이름이 있으면 그 칸 경로로 teacher-name 오류 하나를 낸다.
- AC-19e 회화 카드의 영어 · 한국어 글 칸(질문 · 예상 흐름 · 오늘 쓸 말 예문 · 안전한 대사 · 끝인사 · 목록 제목)에 이름이 있으면 거부한다.
- AC-19e {TEACHER} 는 지금처럼 틀 자리 오류(talk-placeholder)이고 선생님 이름 오류가 아니다.
- AC-19e 회화 평가 카드 장과 선생님 이야기의 글 칸에 이름이 있으면 거부한다.
- AC-19e 읽기 · 쓰기 · 말하기 글의 Tori · 명단 이름은 이 검사가 보지 않는다.
- AC-19e 고친 시험용 시드 나무(영역 넷 · 회화 카드 · 평가 장 · 이야기)가 시드 검증을 통과하고, 이름 하나를 넣으면 막는다.

명단 검사
- AC-19a 1-가 명단(미나 · 리오)과 견본 명단이 규격과 명단 검사를 통과한다(실제 seed/teachers.json 도 읽어 본다).
- AC-19a 가짜 명단마다 거부 하나. 13 경우가 각각 `teacher-roster` 하나만 낸다.
  - 키 겹침
  - 한글 이름 겹침
  - 영어 이름 겹침(대소문자 무시)
  - vocab 낱말인 영어 이름
  - 물음표 인사
  - 성격 낱말 둘
  - 대비 미달
  - 성격 글 세 문장
  - 성격 글의 {NAME}
  - 인사 문장 상한 넘김
  - 인사 금지어
  - 소개 세 줄
  - 모델은 있는데 줄인 방법이 빔
- AC-19a 규격이 꼴을 거부한다: vrm 밖 꼴 · 한글 밖 한글 이름 · 영문자 밖 영어 이름 · 높이 0~2 밖 · 빈 출처 · 대문자 키. 경우마다 Zod 이슈 하나이고, 모델 · 초상 · 목소리를 비워도 통과한다.
- AC-19a 채워진 모델 · 초상 칸만 파일 있음을 보고, 비면 보지 않는다.
- AC-19a 이름표 색 대비는 WCAG 대비(흰 · 검정 21:1)로 세고, 1-가 명단 둘은 상한을 넘는다.
- AC-19a 명단 검사 오류는 시드 검증의 규격 파일 오류이고, 명단이 없으면 규격 파일이 없다는 오류다.

## 관문(워크트리 p08, Node 24)

| 명령 | 결과 |
|---|---|
| `pnpm lint` · `pnpm exec biome ci` | 310 파일, 고칠 것 없음 |
| `pnpm exec tsc --noEmit` | 이번 변경 오류 0. `PageProps` · `LayoutProps` 없음 7건은 변경 전부터 있다(Next 타입 생성 전 상태, 변경 전 상태에서 같은 7건을 셈) |
| `pnpm test` | Test Files 56 passed · Tests 539 passed · 6 todo. 새 파일 15개 통과 |
| `pnpm -s seed:validate` | 칸 442 · 통과 442 · 실패 0 · 빈 칸 4450 · 경고 0 · 규격 파일 오류 0(읽기 · 쓰기 · 말하기 1단계 그대로, 명단 검사 통과) |
| `pnpm -s check:ids --specs <본 저장소 specs>` | 종료 0. talk.teacher_* 다섯의 spec-setting-missing 은 0이 됐고 fixture-setting 은 0이다. 남은 것은 아래 우려 1 |

## 정본으로 풀리지 않아 정한 것

1. 이름표 대비는 accent(이름표 색)와 room(창 바탕)을 견준다. 6.4 는 '이름표 글자 대비 4.5:1'만 적었고, 명단 칸에는 색이 room · accent 둘뿐이다. 글자 색 칸이 따로 없어서, 이름표 글자를 accent 로 room 위에 쓴다고 보았다. 미나 5.54:1, 리오 4.93:1 이다. 선생님 화면 plan 이 이름표를 다르게 그리면(예: accent 바탕에 흰 글자) 이 한 줄과 명단 칸을 고친다.
2. '소개(길이)'는 줄 수 1~2(`\n` 으로 나눔)로 보았다. 델타 spec 명단 칸이 '소개 한두 줄'이라서다. 글자 수 상한은 정본에 없어 두지 않았다.
3. 한국어 이름 뒤에 허용하는 말(`KO_NAME_TAILS`)은 조사(이 · 가 · 은 · 는 · 을 · 를 · 와 · 과 · 랑 · 이랑 · 하고 · 아 · 야 · 의 · 에 · 에게 · 한테 · 께 · 도 · 만 · 처럼 · 보다 · 부터 · 까지 · 로 · 으로 · 나 · 이나 · 며 …)에 서술격(예요 · 이에요 · 이야 · 이다 · 다 · 였 …)과 호칭 꼬리(님 · 씨 · 들 · 네)를 더한 목록이다. 이것들을 이어 붙인 덩이(예: 에게+는)도 허용한다. 이름 앞이 한글이면 낱말 안으로 보고 걸지 않는다(스토리 · 도토리 · 시나리오). 띄어 쓴 '미나 선생님'은 걸린다.
4. 영어 이름은 모든 글 칸(한국어 칸 포함)에서, 한글 이름도 모든 칸(영어 칸 포함)에서 찾는다. 낱말 경계는 앞뒤가 영문자가 아닌 것이다.
5. 명단 검사 · 자산 검사 오류는 칸 오류가 아니라 규격 파일 오류(`referenceErrors`)로 센다. 명단은 규격 파일 자리(5절 목록들과 같은 길)이기 때문이다. 명단이 깨지거나 없어도 '선생님 이름' 검사는 옛 이름으로 계속 돌고, 실행은 규격 파일 오류로 실패한다.
6. 자산 경로는 public/ 기준 소문자 경로(앞 `/` 없음, `..` 금지)로 두었다. 지금은 비어 있어 쓰이지 않는다. 크기 · 해시 · VRM 메타 검사(talk.teacher_model_max_mb · teacher_portrait_max_kb 를 읽는 쪽)는 선생님 화면 plan 의 자산 검사 몫으로 남겼다. 이번에는 '채워졌으면 파일 있음'만 본다.
7. `source.reduction`(줄인 방법)은 모델과 함께 채운다. 모델 없이 비면 통과하고, 모델이 있는데 비면 `teacher-roster` 다. 정본의 '출처 빈칸 없음'을 지금 그대로 지키면 줄이기 전인 지금 명단이 통과하지 못해서다.
8. 명단 글은 델타 spec 이 가리키는 시제품 `prototypes/teacher-avatar/src/teachers.js`(description · traits · greeting · accent · room)와 델타 spec 의 AI 성격 글 · 리오 인사 · 높이를 그대로 썼다. 브리프의 명단 쪽 아티팩트(VJFgzXHGQXUDKEUSdApjQd)는 이 환경에서 열지 못해 대조하지 않았다. 명단 7판 글이 시제품과 다르면 seed/teachers.json 의 글만 바꾸면 된다.

## 요청하는 변경 · 남은 우려

1. check:ids 에 이번 변경 밖의 것이 남았다. p08 에 아직 들어오지 않은 회화 느낌 고침(C125)의 키(spec-setting-missing speech.rate.<구간> 넷 · speech.sentence_pause_ms)와 setting-default ai.model.talk_turn.1-3(12절 sonnet · 시드 haiku, C112)이다. 셋 다 이 변경 앞부터 있었고 종료 코드는 0이다. design-number 는 36에서 41로 늘었다. 새 값 100(talk.teacher_portrait_max_kb)이 원래 있던 글자 100(home-cards.tsx · check-lesson.ts 둘 · match-rate.ts 둘)과 짝이 된 것이다. 보고만 하는 규칙이고, 내 파일에는 0건이다(WCAG 상수는 structure.ts 로 옮김).
2. 회화 1단계 예상 흐름의 길이가 걸린다. 예상 흐름(flow, role prompt)은 회화 영어 role 이라 1단계 문장 상한 5 낱말을 받는다. 'Tori' 한 낱말이 'The teacher' 두 낱말이 되어, 견본 'The teacher says the words again.'(6)이 learning-elements 에 걸렸고 'them' 으로 줄였다. 1단계 회화 카드 본 생성 때 'The teacher asks …' 꼴이 5 낱말 안에 들게 생성 브리프(학습 설계자 몫)에 적어 두거나, flow 를 길이 검사에서 뺄지 컨트롤러가 정해야 한다. flow 는 아이에게 보이지 않는 칸이다.
3. 생성 브리프 규칙(_template · 회화 브리프의 '선생님 이름 · 자리 표시자 없음 · 어느 선생님이 해도 맞는 말')과 vocab 예문 넷은 브리프대로 손대지 않았다(학습 설계자 몫). 그 예문을 회화 카드 오늘 쓸 말 예문으로 그대로 옮기면 새 검사가 막는다.
4. 앱 쪽에서 명단을 읽는 일(서버 묶음 추적 `next.config.ts outputFileTracingIncludes`, `src/server/seed-lists.ts` 류 읽기, 화면에 AI 성격 글 · 출처를 보내지 않기)은 C118 차례 몫이라 하지 않았다. seed-viewer(`src/server/seed-viewer/files.ts`)는 SEED_FILES 를 다 읽으므로 teachers.json 도 읽는다. 적재(load.ts)는 이 파일을 DB 에 넣지 않는다.
5. 통합 시험(`pnpm test:int`)과 로컬 e2e(seed-viewer)는 DB · 서버가 필요해 돌리지 않았다. 적재 경로는 바꾸지 않았고, 적재가 쓰는 견본 나무는 단위 시험(seed-validate-cli · seed-check-cli · 완전성)으로 검증을 통과한다.
6. 작업 중 tsc 의 기존 오류를 견주려고 워크트리에서 `git stash` · `git stash pop` 을 한 번 했다(1분 안, 추적 파일만). 그 사이 vocab.json · prompts/ 에는 바뀐 것이 없었고, pop 뒤 상태가 그대로임을 확인했다. 같은 워크트리를 다른 사람이 함께 고치는 때에는 쓰지 말아야 할 방법이어서 적어 둔다.
