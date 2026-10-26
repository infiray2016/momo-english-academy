# 구현 보고: P5c 시드 보기 화면의 표본 검토 · 사람 확인 쓰기(impl-p05c · Opus · high, 2026-10-22)

상태: DONE_WITH_CONCERNS(우려는 아래 '정할 것 · 요청하는 변경' 둘, 모두 이번 허용 파일 밖)
워크트리: `.claude/worktrees/p05c`(feature/1a-p05c-seed-review), 커밋 안 함.

## 바뀐 파일(plan 의 일곱 그대로, 공용 변경 없음)

| 파일 | 신규 / 수정 | 자리 |
|---|---|---|
| `src/core/seed/review-walkthrough.ts` | 신규(99줄) | 질문 여덟 `WALKTHROUGH_QUESTIONS` · `WALKTHROUGH_IDS` · `composeReviewMemo` — 순수 |
| `src/app/dev/seed-viewer/actions.ts` | 신규(106줄) | `"use server"`. `saveReview` · `saveHumanCheck`, 첫 문장 `await requireAccess()` · 둘째 `assertSeedViewerLocal()`, Zod, 시각은 `now()` |
| `src/app/dev/seed-viewer/review-panel.tsx` | 신규(316줄) | `"use client"`. 사람 확인 칸 · 표본 검토 칸, 서버 액션만 부름 |
| `src/server/seed-viewer/files.ts` | 수정(+230) | 머리 주석 1~5, 쓰기 절 416~: `readSeedSettings` 484 · `reviewDateOf` 499 · `appendReviewRow` 533 · `saveHumanDecisions` 570 |
| `src/app/dev/seed-viewer/cell-view.tsx` | 수정(+58) | 머리 주석, 걸린 문항 `humanCheckItems` 825, `<ReviewPanel key={cell.key} …>` 974 |
| `tests/unit/seed-viewer-write.test.ts` | 신규(488줄) | 단위 7 |
| `tests/e2e-local/seed-viewer.spec.ts` | 수정(+243) | 견본 settings 에 `app.timezone` 행(309, `extraFiles` 로 덮음), e2e 셋(999 · 1033 · 1099) |

## 시험 이름과 결과

단위(`pnpm vitest run tests/unit/seed-viewer-write.test.ts`, 7 통과):
- 아이 눈 순회: '아니오'인 질문 이름을 [순회 아니오: …] 머리로 붙이고 없으면 메모 그대로다
- 시드 보기 쓰기: 표본 검토 행을 더하면 없던 파일을 만들고 있던 행을 지우지 않으며 ReviewFileSchema 를 지킨다
- 시드 보기 쓰기: 뿌리 밖(..) · 배치에 없는 경로 · 파일에 없는 칸 · 범위 밖 문항 번호는 거부한다
- 시드 보기 쓰기: 규격이 깨진 검토 · 풀이 기록 파일은 덮어쓰지 않는다(plan 밖 더함)
- 시드 보기 쓰기: 검토 날짜는 seed/settings.json 의 app.timezone 달력 날짜이고 키가 없으면 남기지 않는다(plan 밖 더함)
- 6.4 사람 확인: 화면을 연 때의 내용 해시가 지금 해시와 다르거나 그 해시의 풀이 기록이 없으면 남기지 않는다
- 6.4 사람 확인: '고침'은 통과가 아니다(pending-human 그대로)

e2e(로컬, `tests/e2e-local/seed-viewer.spec.ts`) — CI 몫이지만 이 Mac 에서 next dev 만으로 돌아 로컬로도 돌렸다(DB 쓰지 않음):
- AC-7f 시드 보기: '오류'와 메모를 남기면 seed/reviews/<영역>-<단계>.json 에 한 행이 생긴다
- 6.4 사람 확인: 다르게 풀린 문항에 '정답 맞음'을 남기면 같은 내용 해시로 seed/checks 에 적히고 seed:validate 가 그 칸을 통과로 센다(기록은 P5a `buildSolveRequest` · 가짜 풀이 · `judgeSolve` · `buildCheckRecord`, 검사는 `tsx scripts/seed-validate.ts --root <시험 뿌리> --json` 을 실제로 돌림)
- 아이 눈 순회: '아니오'로 고른 질문 이름이 남긴 행의 메모 머리에 붙는다

AC-N5: P3b 훑기 "AC-N5 함수 안 확인: 모든 'use server' 함수와 route.ts 처리기의 첫 문장이 requireAccess() 다…"가 새 액션 둘을 덮고 통과. 한 시계 훑기 둘도 통과.

## 관문 명령 결과(Node 24.22.0)

| 명령 | 결과 |
|---|---|
| `pnpm exec biome ci .` | 311 파일, 고칠 것 없음 |
| `pnpm test` | 56 파일 · 531 통과 · 6 todo |
| `pnpm check:deps` | 위반 0(158 모듈) |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 종료 0, missing-test 21(시험만 더해 늘지 않음) |
| `pnpm build` | 종료 0, 경로 목록에 `/dev/seed-viewer` 없음. `.next` 에서 `saveHumanDecisions` · `appendReviewRow` · '표본 검토 남기기' · '순회 아니오' grep 0건 |
| `pnpm check:bundle` | 파일 231 · 위반 0 |
| `pnpm e2e:local`(로컬) | 10 통과(P5b 일곱 + 새 셋, 25.3s) |
| 흐름 한 번: `pnpm seed:validate --root tests/.tmp/seed-viewer-e2e` | `사람 확인 1` — 남은 하나는 P5b 견본이 일부러 둔 `lesson:reading:1:1:assigned:1:1`. 이번에 '정답 맞음'을 남긴 `lesson:writing:1:1:assigned:1:1` 은 human.contentHash 가 기록 해시와 같고 사람 확인 · 풀이 검사 안 됨 목록에 없다 |
| 비밀값 grep(`sk-ant-` · `ACCESS_CODE_HASH=` · 접속 문자열) | 0건 |
| `pnpm e2e`(DB) · `pnpm test:int` | 이 Mac 에서 안 돌림(DB 시험 불가, 브리프). 이번 변경은 그 시험이 보는 파일을 바꾸지 않았다 |
| `tsc --noEmit` | 이번 파일 오류 0. Next 생성 타입(`PageProps` · `LayoutProps`) 없음 오류 7건은 원래부터 있음(`next build` 가 만든다) |

## 설계와 다르게 한 것과 이유

1. `appendReviewRow(root, row)` → `appendReviewRow(root, { file, row })`. plan 이 '`file` 은 내용 파일 경로, `cell` 은 그 파일에 있는 칸, `itemNo` 는 그 칸 번호 안'을 요구해 내용 파일 경로가 필요하다. 확인을 쓰기 함수 안에 두어 단위 시험이 덮는다(액션은 Zod 만).
2. `saveHumanDecisions` 가 `at` 을 인자로 받는다. files.ts 는 시각을 읽지 않는다는 P5b 머리 규칙을 지키려고 액션이 `now().toISOString()` 을 넘긴다.
3. `readSeedSettings(root)` 를 더했다(plan 의 `reviewDateOf(now, 설정)` 에 넘길 설정 읽기). 파일이 없거나 깨졌으면 '설정값 시드(settings.json)를 읽지 못했어요', 키가 없으면 plan 글 '설정값 시드에 app.timezone 이 없어요', 시간대 이름이 아니면 따로 알린다.
4. `composeReviewMemo` 에서 '아니오'를 골랐는데 메모가 비면 머리 뒤 빈칸 없이 `[순회 아니오: …]` 만 남긴다. 같은 id 를 두 번 보내도 한 번만 적는다.
5. 사람 확인 결과 글(`output`, 이름 '사람 확인 결과')은 사람 확인 칸 밖에 둔다. '정답 맞음'으로 칸이 통과되면 `router.refresh()` 뒤 사람 확인 칸이 사라지는데(plan: pending-human 일 때만), 결과 글은 남아야 해서다.
6. 걸린 문항 칸에 '남긴 확인'(같은 해시로 이미 남긴 결정)도 보인다. 사람 확인 상태인 칸 안에서 이미 '정답 맞음'인 문항을 다시 고를 수 있다.
7. 기록 파일(reviews · checks)이 JSON · 규격이 깨져 있으면 덮어쓰지 않고 거부한다(plan 은 '없으면 `{ rows: [] }`'만 적음). 거부 글은 경로까지만 담고 파일 시스템 오류 원문은 터미널(`console.error`)에만 낸다.
8. e2e 의 `app.timezone` 행은 견본 나무(`tree`)를 바꾸지 않고 `extraFiles` 로 settings.json 을 덮어 넣었다(P5b 시험의 기대값이 그 나무에서 나와서). 시간대 값은 `tests/fixtures/settings.ts` 의 `TEST_SETTINGS["app.timezone"]`.
9. 새 e2e 셋은 P5b 시험과 겹치지 않게 다른 칸을 쓴다(말하기 6단계 · 쓰기 1단계 · 쓰기 3단계). 읽기 1단계 견본(일부러 사람 확인으로 둔 칸)은 건드리지 않는다.

## 정할 것 · 요청하는 변경(허용 파일 밖이라 손대지 않음)

1. `src/app/dev/seed-viewer/page.local.tsx` 의 위 안내 '…이 화면은 읽기만 해요.'와 머리 주석 '읽기만 한다(표본 검토 · 사람 확인 쓰기는 P5c)'가 이제 틀리다. 고칠 글 제안: '칸 검사(규격 · 정합 · 분포)는 터미널에서 pnpm seed:validate 로 봐요. 이 화면은 표본 검토 · 사람 확인만 남겨요.' 한 줄 고침이라 컨트롤러가 직접 하거나 다음 fix 에 허용해 주면 된다.
2. P5a 위험 8(seed:check 와 보기 화면이 같은 checks 파일을 함께 쓰는 틈)은 쓰기 바로 앞 다시 읽기 + 임시 파일 → 이름 바꾸기까지 했다. 남는 틈은 '풀이 검사를 돌리는 동안 같은 묶음의 사람 확인을 남기지 않는다'를 P8 브리프에 적는 일(컨트롤러 몫).

## 남은 우려

- 메모 길이에 상한이 없다(개발자 화면, plan 에 없음). 아이 이름 · 개인 정보는 칸 위 안내 한 줄로만 막는다(plan 위험 6, 요청자 몫).
- 화면 사진은 찍지 않았다(plan 작업 6 은 컨트롤러가 한 장 본다). `pnpm dev` 뒤 `/dev/seed-viewer?file=…&cell=…` 칸 끝에 '사람 확인 남기기'(사람 확인 칸만) · '표본 검토 남기기'가 붙는다.
- 요청자가 내일(10-23) `SEED_VIEWER_ROOT=tests/.tmp/p08-samples/<effort> pnpm dev` 로 쓸 때 그 뿌리의 settings.json 에 `app.timezone` 행이 있어야 남길 수 있다(없으면 화면에 '설정값 시드에 app.timezone 이 없어요'). P6a 의 seed/settings.json 에는 있다. P8 표본 뿌리가 그 파일을 복사하는지 확인이 필요하다.

우려 1 고침(컨트롤러 허락, 2026-10-22): `src/app/dev/seed-viewer/page.local.tsx:78` 안내 '이 화면은 읽기만 해요.' → '이 화면은 표본 검토 · 사람 확인만 남겨요.'(그 한 줄만, 머리 주석 3줄은 그대로). `pnpm -s biome ci .` 311 파일 고칠 것 없음, e2e-local "AC-7f 시드 보기: '오류'와 메모를 남기면 …" 1 통과.
