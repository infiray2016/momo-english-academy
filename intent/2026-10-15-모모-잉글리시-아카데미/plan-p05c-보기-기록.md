# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P5c 시드 보기 화면의 표본 검토 · 사람 확인 쓰기

spec: `specs/` 정본(6.3 사람 표본 검토 문단 '알맞음 · 쉬움 · 어려움 · 오류 … seed/reviews/<영역>-<단계>.json 에 seed_reports 와 같은 열', 6.4 풀이 검사 행 '사람 확인은 … 정답 맞음 · 고침을 seed/checks/ 에 남긴다 … 해시가 바뀌면 다시 확인', 11절 1-가 (2-1), 10절 접근 제어, 15절 AC-7f · NFR-5, 13절 C57, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P5 행(아이 눈 순회 질문 칸, 역분석 제안 9) · 조사 `docs/research/2026-10-16-reverse-engineering.md` 제안 9 · `.claude/skills/reverse-engineering/SKILL.md` '시드' 행 · 공통 사실 · 정할 것 `plan-p05a-풀이-검사.md` · 보기 화면 `plan-p05b-시드-보기.md` · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: approved
승인: 컨트롤러 2026-10-16 23:2x(C62, P5a '컨트롤러 결정'. 요청자는 PR 병합 때 본다) · 브랜치 · 워크트리: `feature/1a-p05c-seed-review`(P5b 끝에 P5a 를 합친 위, 격리 워크트리 하나, 정할 것 가) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P5 셋 가운데 셋째다. 첫째 `plan-p05a-풀이-검사.md`(풀이 검사 명령 · `withHumanDecisions` · P5 전체 정할 것), 둘째 `plan-p05b-시드-보기.md`(활동 표시 컴포넌트 · 보기 화면 읽기)가 끝난 위에서 한다. 확인한 사실 번호는 P5a 표의 번호다.

컨트롤러 결정(2026-10-16 23:2x): 승인. 정할 것 가 · 아 · 차 · 타 · 하의 판정은 `plan-p05a-풀이-검사.md` '컨트롤러 결정' 문단. P5a · P5b 가 끝난 뒤 시작한다.

## 목표 (Goal)

P5b 보기 화면에 쓰기 둘을 더한다. 첫째, 6.3 사람 표본 검토다. 칸 또는 문항마다 '알맞음 · 쉬움 · 어려움 · 오류'와 메모를 `seed/reviews/<영역>-<단계>.json` 에 seed_reports 와 같은 열(칸 · 문항 번호 · 사유 · 메모 · 날짜)로 한 행 더한다(AC-7f). 적재(P7)가 이 파일을 seed_reports 에 신고자 '개발자'로 넣는다(6.3).
판정 기준이 사람과 날에 따라 흔들리지 않게 아이 눈 순회 질문 여덟(인지 순회 넷 + 우리 넷, 역분석 제안 9)을 점검표로 두고, '아니오'인 질문의 짧은 이름을 메모 머리에 붙인다(행 꼴은 그대로, 정할 것 차).
둘째, 6.4 사람 확인이다. 풀이 검사가 사람 확인으로 보낸 칸에서 문항마다 '정답 맞음 · 고침'을 칸 내용 해시와 함께 `seed/checks/` 의 그 칸 기록에 적는다. 화면을 연 뒤 내용이 바뀌었으면 적지 않는다(해시가 바뀌면 다시 확인). '정답 맞음'만 통과로 센다(P4c `solveStatus`).
쓰기는 로컬 next dev 의 서버 액션에서만 하고, 첫 문장은 `await requireAccess()`(NFR-5 · C57)이며 NODE_ENV 확인을 두 겹으로 둔다(정할 것 아).

## 바뀌는 파일 (Files that change)

P5c 가 쓰는 파일은 일곱이다(새 파일 넷 · 고치는 파일 셋). 공용 변경은 없다.

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/seed/review-walkthrough.ts` | 신규 | 아이 눈 순회 질문 여덟(아래 표)과 메모 머리 붙이기 `composeReviewMemo(아니오 질문 id 목록, 메모)` — 순수 |
| `src/app/dev/seed-viewer/actions.ts` | 신규 | `"use server"`. `saveReview` · `saveHumanCheck`(아래 '서버 액션') |
| `src/app/dev/seed-viewer/review-panel.tsx` | 신규 | `"use client"`. 표본 검토 칸 · 사람 확인 칸(아래 '화면') |
| `src/server/seed-viewer/files.ts` | 수정 | 쓰기 둘 `appendReviewRow` · `saveHumanDecisions` 와 기록 날짜(아래 '서버 쓰기') |
| `src/app/dev/seed-viewer/cell-view.tsx` | 수정 | 칸 보기 아래에 `review-panel` 을 붙인다(칸 키 · 내용 파일 경로 · 지금 해시 · 문항 번호 목록 · 걸린 문항을 넘긴다) |
| `tests/unit/seed-viewer-write.test.ts` | 신규 | 쓰기 함수 · 순회 메모(아래 '증명') |
| `tests/e2e-local/seed-viewer.spec.ts` | 수정 | AC-7f 기록 · 사람 확인 · 순회 메모 e2e 셋을 더한다 |

### 서버 쓰기(files.ts 에 더함)

| 함수(제안) | 하는 일 |
|---|---|
| `appendReviewRow(root, row)` | 칸 키를 풀어(`parseCellKey`) 영역 · 단계를 얻고(이야기 칸은 회화 · 구간 첫 단계) `reviewFilePath(영역, 단계)` 를 `resolveSeedFile` 로 확인한다. 파일을 읽어(없으면 `{ rows: [] }`) 행 하나를 더하고 `ReviewFileSchema` 로 확인한 뒤 같은 폴더 임시 파일에 써서 이름을 바꾼다(`JSON.stringify(파일, null, 2) + "\n"`). 있던 행은 건드리지 않는다 |
| `saveHumanDecisions(root, { file, cell, contentHash, items })` | 내용 파일을 다시 읽어 그 칸의 지금 해시(`cellHash`)를 센다. 화면이 보낸 `contentHash` 와 다르면 거부(`'내용이 바뀌었어요. 다시 열어 주세요'`). `checks/<file>` 을 읽어 P5a `withHumanDecisions` 로 합치고(풀이 기록이 없거나 해시가 다르면 거부), `CheckFileSchema` 로 확인한 뒤 임시 파일 → 이름 바꾸기 |
| `reviewDateOf(now, settings)` | 한 시계 `now()`(`src/server/clock`)를 seed/settings.json 의 `app.timezone` 으로 본 달력 날짜 `YYYY-MM-DD`(`Intl.DateTimeFormat`, 정할 것 하). 키가 없으면 쓰지 않고 '설정값 시드에 app.timezone 이 없어요'(코드 기본값 없음). 사람 확인의 `at` 은 `now().toISOString()` |

두 쓰기 모두 쓰기 바로 앞에 파일을 다시 읽는다(P5a 위험 8). 경로는 P5b `resolveSeedFile` 이 뿌리 안 · 배치 안 경로만 받는다.

### 서버 액션(actions.ts)

```ts
"use server";
export async function saveReview(input: unknown): Promise<SaveResult> {
  await requireAccess(); // NFR-5 · C57 — P3b 훑기 시험이 첫 문장을 본다
  assertSeedViewerLocal(); // NODE_ENV !== "development" 이면 notFound()
  // Zod: { file, cell, itemNo: int ≥ 1 | null, reason: "ok" | "easy" | "hard" | "error", memo: string, walkthroughNo: 질문 id[] }
  // row = { cell, itemNo, reason, memo: composeReviewMemo(walkthroughNo, memo), date: reviewDateOf(now(), 설정) } → appendReviewRow
}
export async function saveHumanCheck(input: unknown): Promise<SaveResult> {
  await requireAccess();
  assertSeedViewerLocal();
  // Zod: { file, cell, contentHash: 16진 64자, items: { no: int ≥ 1, decision: "correct" | "fixed" }[](하나 이상) } → saveHumanDecisions
}
```

- `SaveResult` = `{ ok: true, message: "남겼어요" } | { ok: false, message }`. 오류 글은 어른용 해요체이고 경로 · 칸 키 밖의 내부 값(스택 · 파일 시스템 오류 원문)을 내지 않는다.
- `itemNo` 는 그 칸 `itemsOf` 번호 안이어야 한다(밖이면 거부). `file` 은 내용 파일 경로, `cell` 은 그 파일에 있는 칸이어야 한다.
- `assertSeedViewerLocal` 은 P5b `files.ts` 에 두고 `page.local.tsx` 의 확인과 같은 함수를 쓴다.

### 아이 눈 순회 질문(review-walkthrough.ts, 정할 것 차)

질문 글은 조사 제안 9 를 옮긴 것이다. 일곱째만 '아니오'가 문제를 뜻하도록 뒤집어 적었다(원문 '단계 어휘 범위 밖에 남은 모르는 말이 있는가').

| id | 질문(점검표 글) | 짧은 이름(메모 머리) | 갈래 |
|---|---|---|---|
| `try` | 아이가 이 활동에서 맞는 결과를 얻으려고 해 볼까요? | 시도 | 인지 순회 |
| `notice` | 맞는 행동(누를 곳 · 말할 것)이 있다는 것을 알아챌까요? | 알아챔 | 인지 순회 |
| `connect` | 그 행동이 원하는 결과로 이어진다고 알까요? | 연결 | 인지 순회 |
| `progress` | 한 뒤에 잘 되고 있다는 것이 보일까요? | 진전 | 인지 순회 |
| `one-action` | 화면에 할 일이 하나인가요? | 행동 하나 | 우리 질문 |
| `no-instructions` | 안내를 읽지 않고도 할 일이 보이나요? | 안내 없이 | 우리 질문 |
| `no-unknown-words` | 단계 어휘 범위 밖의 모르는 말이 없나요? | 모르는 말 없음 | 우리 질문 |
| `explanation` | 틀렸을 때 해설이 4학년 눈에 이해되나요? | 해설 이해 | 우리 질문 |

`composeReviewMemo(ids, memo)`: '아니오'로 고른 질문이 있으면 표 차례대로 짧은 이름을 ` · ` 로 이어 `[순회 아니오: 알아챔 · 해설 이해] ` 를 메모 앞에 붙이고(메모는 앞뒤 공백을 뺀다), 없으면 메모 그대로다. 모르는 id 는 거부한다.

### 화면(review-panel.tsx)

| 칸 | 보이는 것 · 하는 일 |
|---|---|
| 표본 검토 | 사유 넷(라디오 '알맞음 · 쉬움 · 어려움 · 오류'), 문항('칸 전체' · 문항 1..n), 아이 눈 순회 여덟(질문마다 '아니오' 점검), 메모, '남기기'. 칸 위에 '메모는 적재 때 운영 DB 의 신고 기록으로 들어가요. 아이 이름 · 개인 정보를 적지 않아요' 한 줄. 남기면 '남겼어요'와 `router.refresh()`(P5b 의 표본 검토 행 목록이 다시 읽힌다) |
| 사람 확인 | 칸 상태가 사람 확인(pending-human)일 때만. 걸린 문항(판단 different · multiple · none, 또는 시드 밖 후보)마다 판단 · 풀이 답 · 후보 · 시드 정답을 보이고 '정답 맞음(시드 그대로)' · '고침(시드를 고친 뒤 풀이 검사를 다시 해요)' 가운데 고른다. '사람 확인 남기기'는 화면을 연 때의 내용 해시를 함께 보낸다. 남기면 결과 글과 `router.refresh()` |

어른용 칸이다(4절 부모용 정보 — 작은 글자 허용, 해요체). 서버 모듈을 가져오지 않고 서버 액션만 부른다.

## 작업 순서 (Order of work)

한 구현자(implementer · Opus · high)가 차례로 한다. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴이다. 시험의 시드 나무는 P5b 와 같고, 사람 확인 사례는 P5a 함수(`buildSolveRequest` · `judgeSolve` · `buildCheckRecord`)와 가짜 풀이(`tests/fixtures/seed/fake-solver.ts`)로 '다르게 풀린' 기록을 만들어 쓴다. 견본 settings 에는 `app.timezone` 행(12절 기본 Asia/Seoul)을 시험이 더한다.

1. [검증] 시험 먼저. `tests/unit/seed-viewer-write.test.ts` 와 e2e(로컬) 셋을 쓰고 실패를 본다. 완료: 실패 출력.
2. [서버] `review-walkthrough.ts` 와 `files.ts` 의 쓰기 둘 · 날짜. 완료: 단위 시험 통과, 한 시계 훑기 시험 통과, `pnpm check:deps` 0.
3. [서버] `actions.ts`. 완료: P3b 의 함수 안 확인 훑기 시험("AC-N5 함수 안 확인: 모든 'use server' 함수 …")이 새 액션을 덮고 통과한다.
4. [화면] `review-panel.tsx` 와 `cell-view.tsx` 붙이기. 완료: `pnpm e2e:local` 통과.
5. [검증] 마무리. 흐름 한 번(다르게 풀린 기록이 든 시험용 나무 → 보기 화면에서 '정답 맞음' → `pnpm seed:validate --root <나무>` 의 사람 확인 0) 출력과, CI 와 같은 순서 명령 전부(P5b 작업 6 과 같음) 0, 비밀값 grep 0건. 완료: 출력이 구현 보고에 있다.
6. [사람] 검토 · 커밋(H14). code-reviewer(Opus · xhigh) 검토와 fix(3회까지) 뒤 요청자 지시로 컨트롤러가 커밋한다. 어른용 칸이라 design-reviewer 는 띄우지 않는다(컨트롤러가 화면 사진 한 장을 본다). 완료: 커밋. 요청자가 로컬에서 쓰는 때는 H3 · P7 뒤(정할 것 타)이고 첫 쓰임은 P8 표본 검토(H11)다.

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 운영 묶음에 seed 쓰기 길이 생긴다 | 공개 주소에서 파일 쓰기 | 액션은 `page.local.tsx` 에서만 닿아 운영 빌드에 들지 않는다(P5b 길). 첫 문장 `requireAccess` 와 NODE_ENV 확인 두 겹, 의존 규칙(P5b 공용 변경 5) |
| 2 | 오래된 화면으로 사람 확인을 남긴다 | 바뀐 내용에 '정답 맞음'이 붙는다 | 화면을 연 때의 해시를 보내고 서버가 지금 해시와 견준다. `withHumanDecisions` 는 같은 해시의 풀이 기록에만 적는다 |
| 3 | 같은 파일을 함께 쓴다(두 탭, seed:check 와 함께) | 행 · 기록이 덮인다 | 쓰기 바로 앞에 다시 읽고 임시 파일 → 이름 바꾸기. 남는 틈은 P8 브리프 메모(P5a 위험 8) |
| 4 | 경로를 넘어 뿌리 밖에 쓴다 | 저장소 다른 파일이 바뀐다 | `resolveSeedFile`(배치 안 · 뿌리 안만), `file` · `cell` 이 서로 맞는지 확인. 시험이 거부를 본다 |
| 5 | `app.timezone` 이 없는 시드 | 검토 행을 못 남긴다 | 쓰지 않고 알린다(코드 기본값 없음). P6a 의 settings.json 은 12절 키를 모두 담는다(`app.timezone` 포함, P5a 확인한 사실 17). P4 견본 나무에는 없어 시험이 행을 더한다 |
| 6 | 메모에 아이 이름 · 개인 정보가 들어간다 | 운영 DB seed_reports 로 간다(P7 적재) | 칸 위 안내 한 줄. 요청자 몫이다 |
| 7 | 순회 질문이 걸음(활동)마다가 아니라 칸 · 문항 단위다 | 조사 제안의 '걸음마다'보다 거칠다 | 문항 번호를 고를 수 있게 해 걸음 단위로도 남긴다. P8 표본 두 묶음 뒤 쓸모를 보고 고친다 |

### 정할 것 · 제약 · 확인한 사실

정할 것은 `plan-p05a-풀이-검사.md` 표의 가 · 아 · 차 · 타 · 하 가 이 plan 에 닿는다. 제약은 P5a · P5b 와 같고 아래를 더한다.

- 서버 액션 첫 문장은 `await requireAccess()` 다(P3b, 확인한 사실 11). 서버 액션만 쓰고 Route Handler 를 두지 않는다(`route.local.ts` 는 P3b 훑기가 보지 않는다).
- 시각은 한 시계 `now()` 에서만 읽는다(확인한 사실 12).
- reviews · checks 파일 꼴은 P4a 규격 그대로다(정할 것 차 — 칸을 더하지 않는다).

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름) | 파일 · 명령 |
|---|---|---|
| AC-7f(기록) | e2e(로컬) "AC-7f 시드 보기: '오류'와 메모를 남기면 seed/reviews/<영역>-<단계>.json 에 한 행이 생긴다" | `tests/e2e-local/seed-viewer.spec.ts` · `pnpm e2e:local` |
| 6.4 사람 확인 | e2e(로컬) "6.4 사람 확인: 다르게 풀린 문항에 '정답 맞음'을 남기면 같은 내용 해시로 seed/checks 에 적히고 seed:validate 가 그 칸을 통과로 센다" · 단위 "6.4 사람 확인: 화면을 연 때의 내용 해시가 지금 해시와 다르거나 그 해시의 풀이 기록이 없으면 남기지 않는다" · "6.4 사람 확인: '고침'은 통과가 아니다(pending-human 그대로)" | `tests/e2e-local/seed-viewer.spec.ts` · `tests/unit/seed-viewer-write.test.ts` |
| 6.3 표본 검토 · 순회 | e2e(로컬) "아이 눈 순회: '아니오'로 고른 질문 이름이 남긴 행의 메모 머리에 붙는다" · 단위 "아이 눈 순회: '아니오'인 질문 이름을 [순회 아니오: …] 머리로 붙이고 없으면 메모 그대로다" · "시드 보기 쓰기: 표본 검토 행을 더하면 없던 파일을 만들고 있던 행을 지우지 않으며 ReviewFileSchema 를 지킨다" · "시드 보기 쓰기: 뿌리 밖(..) · 배치에 없는 경로 · 파일에 없는 칸 · 범위 밖 문항 번호는 거부한다" | `tests/e2e-local/seed-viewer.spec.ts` · `tests/unit/seed-viewer-write.test.ts` |
| AC-N5(함수 안 확인) | 단위 P3b "AC-N5 함수 안 확인: 모든 'use server' 함수와 route.ts 처리기의 첫 문장이 requireAccess() 다(Cron 은 requireCron, 허용 목록 밖)"가 새 액션을 덮는다 | `tests/unit/access-gate.test.ts` |
| 공통 | P5b 작업 6 과 같은 명령 전부 0, 비밀값 grep 0건. missing-test 는 그대로(AC-7f 는 P5b 가 덮었다) | 작업 5 |

시험 이름은 글자 그대로 적는다(spec-trace). 시험 안의 글 · 숫자는 견본 시드 객체와 P5a 함수에서 얻는다.

## 완료 보고 (Done)

구현 뒤 채운다.
