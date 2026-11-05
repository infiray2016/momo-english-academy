# 보고: 회화 plan 묶음 14-가 — 관찰 쪽 '단원 바로 가기' 단계 고르기 · 새 회차 열기(구현자, 2026-11-05 20:4x)

상태: DONE_WITH_CONCERNS(브리프 파일 표 밖 파일 셋을 고쳤다 — 아래 '설계 · 범위와 다르게 한 것' 1).

## 바꾼 파일 · 줄(워크트리 p13d, HEAD 87b102d 위 미커밋)
- `src/server/preview/index.ts` — 머리 주석 5~10 · 가져오기 23~24(LEVEL_MIN · LEVEL_MAX) · `PREVIEW_JUMP_LEVEL` 을 없애고 `PREVIEW_JUMP_DEFAULT_LEVEL = LEVEL_MIN`(36~37) · `previewLevels()`(49) · `previewUnitsOf(area, level)`(56) · 결과 꼴에 `round` · `startRevision`(128~132) · 입력 스키마 `level`(int, LEVEL_MIN~LEVEL_MAX, 기본 LEVEL_MIN) · `newRound`(boolean, 기본 false) · `isUnitOf(area, level, unit)` 검사(137~149) · 회차 고르기와 넣기(206~245).
- `src/app/dev/teacher-probe/teacher-probe.tsx` — 머리 주석 5~7 · `JumpRow`(252~344: 단계 select 1~12 · 단원 고르기 단추 · '그 단원으로' · '새 회차로 열기') · `TeacherProbe` 의 `levels` · `units: Record<Area, UnitsByLevel>` 속성 · `jump(area, level, unit, newRound)`(397~) · 목록을 `JumpRow` 로(468~480).
- `src/app/dev/teacher-probe/probe-text.ts` — 글: `jumpNote` 고침 · `jumpNoSeed`('자료가 없는 단원은 수업 목록이 비어요') · `levelPick` · `levelOption` · `unitPick` · `jumpKeep`('그 단원으로') · `jumpNew`('새 회차로 열기') · `jumpKeepLabel` · `jumpNewLabel` · `jumped(areaLabel, out)`(결과 줄) · 도움 함수 `jumpLevelOf` · `jumpUnitOf`(81~96). `jumpLabel` 은 없앰.
- `src/app/dev/teacher-probe/page.preview.tsx` — `previewLevels()` 와 영역 · 단계마다 `previewUnitsOf(area, level)` 를 넘김(16~66).
- `src/server/actions/teacher-preview.ts:19` — 주석 한 줄만(입력을 그대로 넘기는 꼴 유지).
- 시험: `tests/unit/teacher-probe.test.ts`(+4) · `tests/integration/teacher.test.ts`(+4, 기존 셋 고침) · `tests/e2e/teacher-choice.spec.ts:365~385`(새 단추 이름 · 결과 줄).

## 새 회차 규칙
- 한 트랜잭션에서 그 영역 profile_tracks 행을 FOR UPDATE 로 잠근 뒤, 그 (영역 · 단계 · 단원)의 마지막 회차(round 내림차순 1행)를 읽는다.
- `started = newRound || 회차 없음`. started 면 `unitEntryOf` 가 만든 행을 그대로 쓰고 round 만 `마지막 + 1`(회차가 없으면 unitEntryOf 의 첫 회차 1)로 넣는다. 시작 개정 칸 `start_revision` = `currentSeedRevision`, 복사본 `settings_snapshot` = `unitSnapshotOf(read, area, level)`, `settings_version` = 지금 최대 판, `started_at` = now — 첫 실행 · 배치의 단원 들기와 같은 규칙이다.
- started 가 아니면 행을 넣지 않고 마지막 회차의 round · start_revision 을 돌려준다.
- 프로필 track 은 `{ level, unit }`. 사건은 한 행, 까닭 `preview_jump`, oldValue 는 지난 단계 · 단원, newValue 는 새 단계 · 단원. 범위 끝 알림은 지금처럼 넣지 않는다.
- 옛 회차와 그 회차의 세션은 건드리지 않는다. 동시에 두 요청이 와도 track 행 잠금으로 차례가 서고, 그래도 겹치면 unique(profile, area, level, unit, round)가 막아 unavailable 이 된다.
- 입력에 level 이 없으면 1단계(지난 꼴 입력과 같은 뜻). 단계 밖(0 · 13 · 3.5 · "3") · 그 단계에 없는 단원(3단계 읽기 0 등) · newRound 가 boolean 이 아님 · 모르는 키는 invalid.

## 새 회차를 연 뒤 세션 · 수업 목록이 읽는 회차(코드 확인)
모두 그 단원의 가장 높은 round(최신 회차)를 읽는다.
- 수업 목록 `src/server/lesson-list/index.ts:344~346`: 지금 단원 회차 = round 내림차순 첫 행. 수업 칸은 그 회차의 `startRevision` 으로 고른 판(367~372) → 새 회차면 최신 개정 카드가 보인다. '이 회차에서 끝낸 칸'은 `roundStartedAt = current.startedAt`(458)으로 가른다(`src/core/lesson-list/state.ts:215~231`) → 새 회차를 열면 옛 회차에서 끝낸 칸은 새 회차에서 끝낸 것으로 세지 않는다.
- 세션 시작 `src/server/session/index.ts:659~678`: round 내림차순 첫 행의 `startRevision` 으로 수업 판을 고른다(다시 하기만 처음 쓴 개정).
- 홈 `src/server/home/index.ts:168~170`: 지금 단원의 가장 늦은 회차.
- 회화 상태 `src/server/conversation/state.ts:719~730`: 복사본을 `orderBy(desc(round))` 로 최신 회차에서 읽는다.
- 진행 중 세션은 자기 `sessions.seed_revision`(없으면 lesson 행의 개정)을 끝까지 쓴다(`src/server/session/index.ts:330~342`). 그래서 옛 회차에서 열어 둔 진행 중 회화가 있으면 그 세션은 옛 개정 카드 그대로 이어지고, 새 개정 카드는 새로 시작한 세션에서 보인다.

## 설계 · 범위와 다르게 한 것
1. 파일 표(index.ts · teacher-probe.tsx) 밖 파일을 셋 고쳤다. `page.preview.tsx` 는 `PREVIEW_JUMP_LEVEL` 제거와 `previewUnitsOf` 의 새 매개변수 때문에 고쳐야 컴파일된다. `probe-text.ts` 는 이 쪽의 화면 글이 모인 곳이다(같은 폴더). `tests/e2e/teacher-choice.spec.ts` 는 이 화면의 e2e 시험이 없앤 `jumpLabel` · 옛 `jumped` 꼴을 써서 tsc 관문이 깨졌다. 단원 단추를 누르면 곧장 옮기던 흐름이 '고르기 → 그 단원으로'로 바뀌어 e2e 도 바꿔야 해서, 최소로 고쳤다(단원 3 고르기 → '회화 그 단원으로' → 결과 줄 앞부분 확인). 되돌리길 원하면 이 세 곳이다.
2. 단추가 영역마다 둘씩 있어 접근 이름을 영역 이름으로 가른다(보이는 글 '그 단원으로' · '새 회차로 열기', 이름 '회화 그 단원으로' 등 — 보이는 글을 이름 안에 둠).
3. 결과 줄 꼴: `바꿨어요 — 회화 3단계 · 단원 1 · 회차 2 · 시작 개정 3 · 새로 열었어요`(있던 회차면 '있던 회차예요').

## 덮는 시험
- 단위 `tests/unit/teacher-probe.test.ts`: 'AC-19b 단원 바로 가기 단계 고르기: …' · '… 단원 고르기: …' · '… 단추 둘: …' · '… 결과 줄: …'. 구현 전 코드로 돌려 실패(가져오기 없음)를 확인했다.
- 통합 `tests/integration/teacher.test.ts`(이 Mac 에서 못 돌려 tsc · biome 정적만): '… 단계 고르기: 회화 3단계 단원 1 로 가면 …' · '… 새 회차로 열기(newRound 참): … 둘째 회차 …'(옛 회차 시작 개정 0 으로 두고 둘째 = 최신 · 같은 복사본 · 셋째 회차 3) · '… 그 단원으로(newRound 거짓): … 그대로 쓴다' · '… 단계 고르기: 운영 배포 … 거부 …'. 기존 셋은 결과 꼴(round · startRevision) · invalid 목록(단계 밖 · newRound 꼴 · 3단계 읽기 0) 에 맞춰 고쳤다.
- e2e `tests/e2e/teacher-choice.spec.ts` 의 '단원 바로 가기' 한 경우(정적만).

## 관문(워크트리에서, 출력은 스크래치패드)
- `pnpm biome ci` 0 — 575 파일, 고칠 것 없음.
- `pnpm tsc --noEmit` 0.
- `pnpm vitest run --project unit` 0 — 142 파일, 1785 통과 · 6 todo(전 1781 + 새 4).

## 남은 우려
- `src/server/session/index.ts:1511~1520`(loadSessionView 의 k 복사본)은 회차를 `orderBy` 없이 한 행만 읽는다. 새 회차를 열어 회차가 둘이 되면 어느 회차의 복사본을 읽을지 정해져 있지 않다. 지금은 두 회차의 복사본이 같은 설정에서 만들어져 값이 같지만, 그 사이 설정이 바뀌면 옛 회차 값을 읽을 수 있다. 파일 밖이라 고치지 않았다(`.orderBy(desc(unitProgress.round))` 한 줄 제안).
- 적재된 자료가 없는 단계 · 단원으로 옮기면 수업 목록이 비거나, 지금 단원 회차가 있어도 단계 spec 이 없어 화면이 어떻게 보일지는 확인하지 않았다(브리프대로 안내 한 줄로 대신).
- 통합 · e2e 시험은 CI 에서 처음 돈다.

## 보탬(컨트롤러 결정 2026-11-05 — 회차 복사본 읽기)
- `src/server/session/index.ts:14` 가져오기에 `desc` 를 더했다. `:1510~1523`(loadSessionView 의 k 복사본 읽기)에 `.orderBy(desc(unitProgress.round)).limit(1)` 을 더해 최신 회차 복사본을 읽는다(회화 상태 `state.ts:719~731` 과 같은 꼴).
- 다른 회차 읽기 셋은 이미 최신 회차를 고른다. 그래서 고치지 않았다.
  - `src/server/session/index.ts:659~670`: 회차를 다 읽고 `sort((a, b) => b.round - a.round)[0]`.
  - `src/server/home/index.ts:97~100`: 프로필의 회차를 다 읽고, 영역 · 단원마다 `:168~170` 에서 같은 내림차순 정렬로 첫 행.
  - `src/server/lesson-list/index.ts:334~346`: 단계의 회차를 다 읽고 지금 단원은 같은 정렬로 첫 행(통과한 단원은 `:361~366` 에서 같은 꼴).
- 덮는 시험(통합, 정적): `tests/integration/teacher.test.ts` 'AC-19b 단원 바로 가기 새 회차로 열기 뒤 세션 화면: 단원 복사본의 새 단어 수(unit.new_words_per_lesson)를 최신 회차에서 읽는다(옛 회차 복사본에 그 키가 없어도 연다)'. 읽기 1단계 단원 1 의 옛 회차 복사본에서 그 키를 지우고 새 회차를 연 뒤, 배정 수업 1 세션을 시작해 세션 화면을 읽는다. 옛 회차를 읽으면 '복사본에 키가 없다'로 던지므로 최신 회차 읽기를 가른다. 배정 수업은 새 단어가 있어 k 값이 미리보기 수를 바꾸지 않는다. 그래서 값 대신 키를 어느 회차에서 읽는지로 확인했다.
- 관문: biome ci 0(575 파일) · tsc 0 · 단위 0(142 파일 1785 통과 · 6 todo).
