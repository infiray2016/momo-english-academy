판정: Approved (Critical 0 · Important 0 · Minor 1)

# 검토: 회화 plan 묶음 14-가, 관찰 쪽 '단원 바로 가기' 단계 고르기 · 새 회차 열기(code-reviewer, 2026-11-05 20:5x, 범위 한정 · 한 번)

본 것: 패치 `scratchpad/diff-14a.patch`(워크트리 p13d `git diff` 와 바이트 단위로 같음을 확인, 파일 아홉 +595/−92). diff 밖은 회차를 읽는 여섯 자리 · `unitEntryOf` · `currentSeedRevision` · 세션 시작 관문 · 목록 판정(`core/lesson-list/state.ts`) · 시험 자료(`talk-fixture.ts`)만 봤다.

## 1. 설계 준수

| 브리프 '보는 것' | 판정 | 근거 |
|---|---|---|
| 1. 새 회차 규칙 | ✅ | `src/server/preview/index.ts:175~245`. 한 트랜잭션 안에서 profile_tracks 행을 `for("update")`(185)로 잠그고 그 단원의 마지막 회차를 round 내림차순 1행(206~221)으로 읽는다. `started = newRound \|\| !last`(223), 회차 번호는 마지막 + 1, 없으면 `unitEntryOf` 의 첫 회차(224~228)다. 넣는 행은 `{ ...entry.unitProgress, round }`(230)라서 시작 개정 = `currentSeedRevision`(시드 표 전체 최대 개정, `src/server/seed/read.ts:26~39`) · 복사본 `unitSnapshotOf` · 설정 판 · started_at 이 첫 실행 · 배치와 같다(`src/core/profile/start.ts:424~459`). 사건은 `entry.event` 에 target.source preview_jump · oldValue 지난 단계 · 단원(231~235). 정본 04-데이터 13줄('단원 시작 개정은 시작할 때의 시드 전체 최신 개정')과 맞다. 같은 영역 동시 요청은 행 잠금으로 차례가 서고, 남는 겹침은 unique(profile, area, level, unit, round)(`src/db/schema/learning.ts:293~299`)가 막아 unavailable 이 된다. |
| 2. 읽는 회차 | ✅ | `.from(unitProgress)` 는 src 에 여섯 자리뿐이고, 모두 최신 회차를 고른다. 세션 시작 `src/server/session/index.ts:659~670`(JS 내림차순), 홈 `src/server/home/index.ts:97~100 · 167~170`, 수업 목록 `src/server/lesson-list/index.ts:334~346`(통과 단원도 361~366 같은 꼴), 세션 화면 `src/server/session/index.ts:1510~1523`(이번 보탬 orderBy + limit 1), 회화 상태 `src/server/conversation/state.ts:719~731`. 진행 중 세션은 자기 `sessions.seed_revision`(없으면 lesson 행 개정)으로 규격을 읽고(`session/index.ts:330~342`), 목록의 '하던 수업'은 회차와 상관없이 잡힌다(`src/core/lesson-list/state.ts:208~212`). 그래서 옛 회차 세션은 깨지지 않는다. 옛 회차를 닫지 않는 것은 맞다. 스키마에 회차 상태 칸이 없고 passed_at 을 쓰는 서버 코드도 아직 없다. 정본 02-1 174줄은 '이 단원 처음부터'를 새 회차로 시작해 최소 수업 수 · 최근 성적을 새로 세고 단어장 상태는 그대로 둔다고 적는다. 새 회차의 '이 회차에서 끝냄'은 `roundStartedAt = current.startedAt`(`lesson-list/index.ts:458 · 477`, `state.ts:215~231`)로 새로 센다. vocab_progress 에는 회차 칸이 없다(02-3 단어 상태 영향 없음). 이음매(`conversation/closing.ts`)는 회차를 읽지 않는다. |
| 3. 입력 검사 | ✅ | `preview/index.ts:137~149`. strictObject 에 level(int, LEVEL_MIN~LEVEL_MAX, 기본 LEVEL_MIN) · unit(int) · newRound(boolean, 기본 false)이고 `isUnitOf(area, level, unit)` refine 이다. refused 는 파싱 전(160)이다. 액션 `src/server/actions/teacher-preview.ts:19~` 는 주석 한 줄만 바뀌었고 입력을 그대로 넘긴다. |
| 4. 화면 | ✅ | `src/app/dev/teacher-probe/teacher-probe.tsx:252~344`. 단계 select 는 서버가 준 `previewLevels()`(LEVEL_MIN~LEVEL_MAX, 숫자를 박지 않음), 처음 값은 그 영역의 지금 단계, 배치 전이면 첫 단계다(`probe-text.ts` `jumpLevelOf`). 단원 고르기 단추(aria-pressed), '그 단원으로' · '새 회차로 열기' 두 단추는 접근 이름 안에 보이는 글을 둔다. 결과 줄은 `probe-text.ts:29~39` 에서 영역 · 단계 · 단원 · 회차 · 시작 개정 · '새로 열었어요/있던 회차예요'를 적는다. 안내 '자료가 없는 단원은 수업 목록이 비어요'까지 모두 해요체이고, '트랙' · '유닛'이 없다. `page.preview.tsx` 는 가져오기 · 영역 × 단계 단원 표 · 속성 이름만 바뀌었다(최소). |
| 5. 시험 | ✅ | 단위 `tests/unit/teacher-probe.test.ts:68~167` 넷은 정적 렌더 HTML 의 option 수 · selected · aria-pressed · 단추 이름 · 결과 줄 전문을 단언한다. 통합 `tests/integration/teacher.test.ts` 는 `jump` 도움 함수(202~203)로 `jumpUnitForPreviewFor` 를 실제로 부르고, 시험마다 `resetHousehold`(60~61)로 새로 시작한다. 3단계 첫 회차 · newRound 참(옛 회차 시작 개정 0 으로 둔 뒤 둘째 = 최신 · 같은 복사본 · 셋째 3) · 거짓(둘째 회차와 그 개정 그대로, 행 수 2) · 운영 refused(회차 · 사건 수 그대로) · invalid 목록이 맞다. 세션 화면 보탬 시험(478~522)은 옛 회차 복사본에서 `unit.new_words_per_lesson`(세션의 `NEW_WORDS_KEY` 와 같은 이름, `session/index.ts:110`)을 지운 뒤 세션 화면을 열어, orderBy 가 없으면 던지게 만든다. 읽기 1단계 시드는 시험 자료에 있다(`tests/fixtures/seed/dev-tree.ts:19~26`). e2e `tests/e2e/teacher-choice.spec.ts:365~405` 는 '고르기 → 그 단원으로' 로 바뀌었어도 지금 단원 표시 · DB 행 · 홈 카드 단원 3 단언을 그대로 지킨다. 없앤 `jumpLabel` · `PREVIEW_JUMP_LEVEL` 을 쓰는 곳은 남지 않았다. ⚠️ 통합 · e2e 는 이 Mac 에서 돌리지 않았고 정적 대조만 했다(CI 에서 처음 돈다). |
| 6. 관문 | ✅ | 다시 돌림: biome ci 0(575 파일, 고칠 것 없음) · tsc --noEmit 0 · 단위 `teacher-probe.test.ts` 한 파일 6건 통과(전 2 + 새 4). 단위 전체 1785 는 돌리지 않았다(파일 하나만 허용). 출력은 `scratchpad/rev-14a-biome.txt` · `rev-14a-tsc.txt` · `rev-14a-unit.txt`. |

## 2. 잘한 점
- 새 규칙을 만들지 않았다. 넣는 행이 `unitEntryOf` 행에 round 만 덮어쓴 것이라, 복사본 · 시작 개정 · 설정 판이 첫 실행 · 배치와 어긋날 길이 없다(`preview/index.ts:230`).
- 돌려주는 시작 개정이 넣은 행 · 있던 행과 같은 원천에서 나온다(`preview/index.ts:242`). 결과 줄이 DB 와 다를 수 없다.
- 보고의 남은 우려(세션 화면이 회차를 orderBy 없이 읽음)를 보탬으로 고치고, 키를 지워 '어느 회차를 읽는지'를 가르는 시험으로 덮었다. 값이 같아 구분이 안 되는 함정을 피했다.
- invalid 목록에 단계 밖(0 · 13 · 3.5 · "3") · newRound 꼴 · 모르는 키 · 3단계 읽기 0 을 더해 입력 검사의 가장자리를 다 짚었다.

## 3. 지적

| # | 심각도 | 무엇이 · 근거 | 왜 | 어떻게 |
|---|---|---|---|---|
| m1 | Minor | '새 회차로 열기' 단추가 `onJump(..., true)` 를 부르는 연결(`teacher-probe.tsx:328~340`)을 어떤 시험도 누르지 않는다. 단위는 정적 렌더라 누르지 못하고, e2e(`teacher-choice.spec.ts:373~375`)는 '그 단원으로'만 누르며, 통합은 서버 함수를 직접 부른다. e2e 결과 줄 비교도 '… 회차 1' 앞부분까지만 본다(376~385). | 두 단추의 true/false 가 바뀌어도 시험이 모두 통과한다. 요청자가 이 도구를 쓰는 까닭이 바로 '새 회차로 열기'다. 코드는 읽어서 맞음을 확인했다. | e2e 같은 경우 끝에 '회화 새 회차로 열기'를 한 번 더 눌러 결과 줄에 '회차 2' 와 '새로 열었어요'가 드는지 보는 줄을 더한다. 컨트롤러가 직접 해도 되는 크기다. |

## 4. 넘길 것(범위 밖 관찰, 이번 판정에 넣지 않음)
- 세션 행은 회차를 기억하지 않는다. 그래서 옛 회차에서 시작한 진행 중 세션도 세션 화면 · 회화 상태에서 최신 회차의 복사본을 읽는다(`session/index.ts:1510~1523`, `conversation/state.ts:719~731`). 두 회차 사이에 설정이 바뀌지 않으면 값이 같아 지금은 문제가 없다. 2차 '이 단원 처음부터'(02-1 174줄)를 만들 때 세션이 속한 회차의 복사본을 읽을지 정할 일이다.
- P12(단원 통과)가 passed_at 을 쓰기 시작하면, 통과한 옛 회차와 열린 새 회차가 함께 있는 단원을 `lesson-list/band.ts:90~92` 는 통과 단원으로 센다. 목록 쪽 `lesson-list/index.ts:349~355` 은 지금 단원보다 앞선 단원만 센다. 지금은 passed_at 을 쓰는 코드가 없어 닿지 않는다.
