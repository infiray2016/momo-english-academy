# fix 1 보고: P4c 시드 검증(implementer · Opus · high, 같은 워크트리)

상태: DONE. 검토 `review-p04c.md` 의 Minor 넷(M-1~M-4)을 모두 고쳤다.

- 고친 파일은 브리프의 허용 목록 안이다: validate.ts · seed-validate.ts · check-assessment.ts · reference-index.ts, 시험 넷.
- git 쓰기 0, 공용 파일 추가 변경 0.
- 시험 이름은 그대로이고 사례만 더했다.

## 지적마다

1. **M-1 ADDRESSED**(첫 줄 요약 · json 오류)
   - `src/core/seed/validate.ts:1160~1170`: summary `failed` = 실패한 칸 + JSON 이 아닌 파일의 칸 + 칸 키 없는 오류(파일 · 단원 단위, 규격 파일 오류 밖) 수. 첫 줄 '실패' 와 `--json` summary 가 같은 셈을 쓴다. 이제 오류가 있으면 첫 줄 실패 수나 규격 파일 오류 수가 0 이 아니라 종료 코드와 맞는다.
   - JSON 이 아닌 내용 파일(`collectCells` 안)은 그 파일이 맡은 칸(`expectedCellsOf`, :318)마다 칸 키를 단 `json` 오류를 낸다.
     - 이 칸은 '빈 칸'이 아니라 '칸 · 실패'로 센다(plan-p04c 명령 절 글자대로).
     - 칸을 알 수 없으면(규격 파일이 준비되지 않음, seed/checks · seed/reviews 파일) 칸 키 없는 오류 한 줄로 낸다.
   - 시험 "AC-7a 명령: 검증 실패 칸이 있으면 1 이고 칸 · 규칙 · 파일을 한 줄씩 낸다"에 사례를 더했다(seed-validate-cli.test.ts:95~):
     - 평가 파일 문항에 모르는 키만 있을 때 첫 줄 `실패 [1-9]` · 종료 1.
     - 쓰기 1단계 단원 3 수업 파일을 JSON 이 아니게 두면 `json` 오류 칸 = 그 파일 수업 칸 전부, 빈 칸 0, summary.failed = 칸 수, 첫 줄 `실패 4 · 빈 칸 0`.
2. **M-2 ADDRESSED**(`seed.complete_through_level` 범위)
   - `src/core/seed/reference-index.ts:232~243`: 정합 `settings` 에 '단계 1~12 정수(`isLevel`)'를 더했다. 벗어나면 settings 오류이고 칸 검사는 준비 안 됨이 된다.
   - `scripts/seed-validate.ts:200~207`: `--complete-through settings` 가 1~12 정수가 아닌 값을 읽으면 종료 2.
   - PR 모드는 정합 오류(규격 파일 오류 ≥ 1, 종료 1)로 끝나고 빈 칸을 세지 않는다.
   - 시험(사례 0 · 13 · 1.5 각각):
     - "규격 파일: 설정값 키가 없거나 수가 아니면 오류"(vocab-allocate.test.ts:304~): settings 오류 하나.
     - "명령: --areas 와 --complete-through settings"(seed-validate-cli.test.ts:241~): settings 모드 2, PR 모드 1 · 첫 줄 `규격 파일 오류 [1-9]`.
3. **M-3 ADDRESSED**(말하기 평가 question)
   - `src/core/seed/check-assessment.ts`(옛 :322~324)의 '질문 답이 없는 단계에 question 문항을 둘 수 없다' 갈래를 지웠다.
   - 이제 말하기 question 은 level-test-type(`acceptedMin` > 0 단계면 허용 답 필수)과 level-test-ai(허용 답 없는 question 은 AI 과제, 말하기 발표 단계, 벌마다 `TEST_AI_ITEMS_MAX` 개까지, 벌 끝)로만 본다.
   - 시험 "6.4 단계 평가: AI 과제 문항이 셋이거나 둘째 세션 끝이 아니면 거부한다"(seed-validator-complete.test.ts:318~)에 말하기 10단계 사례를 더했다:
     - 허용 답 없는 question 둘이 벌 끝이면 통과(옛 코드에선 level-test-type 오류였다).
     - 셋이면 `level-test-ai`.
     - 1번 자리면 `level-test-ai`.
4. **M-4 ADDRESSED**(`collectCells`)
   - `src/core/seed/validate.ts:575~985`: 파일 걷기 · JSON 읽기 · 규격 파일 풀기 · 정합 · 규격 파일 완전성 · 칸 모으기 · 풀이 검사 기록 읽기를 `collectCells` 로 떼어 내보냈다.
   - `validateSeed`(:987~)는 그 결과 위에서 칸 검사 · 단원 단위 · 평가 · 묶음 · 분포 · 상태 · 완전성만 돈다.
   - 완전성도 파일 단위 `expectedCellsOf(target, index)`(:318)로 나눴고, `expectedCells`(:429)가 그것을 모은다.
   - 동작은 그대로다:
     - 고침 직후 시험 159 가 그대로 통과했다.
     - 실기 셋의 첫 줄이 fix 전과 글자까지 같다.
     - 오류 목록의 차례는 '걷기 오류 → 칸 검사 오류'로 바뀌었다(어느 시험도 차례에 기대지 않는다).

## `collectCells` 꼴(P5 · P7 이 쓸 것)

```ts
collectCells(files: ReadonlyMap<string, string>, options?: { areas?: readonly Area[] }): CollectedSeed

type CollectedCell = SeedCell & { file: string; path: string };   // SeedCell = { key, kind, area?, value }
type CollectedSeed = {
  areas: Area[];
  reference: Partial<ReferenceFiles>;   // Zod 를 통과한 규격 파일
  index: ReferenceIndex;
  errors: ReportError[];                // 배치 · JSON · 규격 · 겹친 칸 · 규격 파일 정합 · 규격 파일 완전성
  referenceErrors: number;
  cells: CollectedCell[];               // 칸 키마다 하나, 걷기 차례. 규격이 깨진 수업 칸은 value 가 날 JSON
  failedKeys: Set<string>;              // 걷기에서 이미 실패한 칸
  brokenKeys: Set<string>;              // JSON 이 아닌 내용 파일의 칸
  lessonFiles: { path, area, level, unit, lessons: { lesson, at }[] }[];
  levelTests: { path, file }[];  placements: { path, file }[];  stories: { path, file }[];
  records: Map<string, CheckRecord>;    // 칸 키 → 풀이 검사 기록
};
```

- P5: `cells` 마다 `cellHash(cell.key, cell.value)` · `itemsOf(cell)` · `solveTargets(cell)` 를 쓴다.
- P7: `cells` 의 `key` · `file` · `path` 로 적재 행을 만든다.
- 해시 대상 객체가 검증기와 같은 걷기에서 나오므로 두 벌로 어긋나지 않는다.
- `expectedCellsOf(SeedContentPath, index)` 는 파일 하나가 맡은 칸 키다.

## 설계와 다르게 한 것

- M-1 은 검토의 두 길 가운데 컨트롤러 결정(21:5x)대로 '실패' 수에 넣었고, '그 밖 오류' 칸을 따로 두지 않았다. `--json` summary 꼴은 그대로다(version 1, 칸 이름 변화 없음). 다만 `failed` 의 뜻이 '실패한 칸 + 칸 키 없는 오류'로 넓어졌으니 P8 브리프에 적어 주기 바란다.
- JSON 이 아닌 파일의 칸도 `summary.cells` 에 넣었다(칸이 있었으나 실패한 것).

## 바뀐 파일:줄

| 파일 | 고친 곳 |
|---|---|
| `src/core/seed/validate.ts` | :318~ expectedCellsOf, :429~ expectedCells, :575~985 CollectedCell · CollectedSeed · collectCells, :987~ validateSeed(검사만), :1160~1170 summary.failed. 전체 1195줄 |
| `scripts/seed-validate.ts` | :200~207 범위 확인 |
| `src/core/seed/check-assessment.ts` | question 문항 갈래 두 줄 지움 |
| `src/core/seed/reference-index.ts` | :232~243 settings 범위 |
| `tests/unit/seed-validate-cli.test.ts` | :95~ M-1 사례, :241~ M-2 사례, validateSeed 가져오기 |
| `tests/unit/seed-validator-complete.test.ts` | :318~ M-3 사례 |
| `tests/unit/vocab-allocate.test.ts` | :304~ M-2 사례 |

seed-validator-distribution.test.ts 는 고칠 일이 없었다.

## 명령 출력(PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin)

- `pnpm lint`: Checked 50 files, No fixes applied
- `pnpm exec tsc --noEmit`: 오류 0
- `pnpm test`: Tests 159 passed(시험 수 그대로, 사례만 더함)
- `pnpm check:deps`: ✔ no dependency violations found (22 modules, 64 dependencies cruised)
- `pnpm spec:trace`: 15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 52 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 58(그대로)
- `pnpm build`: Compiled successfully in 299ms, Finished TypeScript in 1342ms
- `pnpm check:bundle`: 파일 25 · static 10 · 화면 파일 15 · 서버 변수 이름 5 · 대조한 값 0 · 위반 0
- 실기(miniSeed small, through 1 을 `tests/.tmp/seed-real` 에 쓰고 끝난 뒤 지움). 셋 모두 fix 전과 같다:
  - PR: `seed-validate: 칸 172 · 통과 172 · 실패 0 · 빈 칸 500 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 0`, exit 0
  - `--complete-through 1`: `… 실패 0 · 빈 칸 0 · …`, exit 0
  - `--complete-through 2`: `… 실패 0 · 빈 칸 96 · …`, exit 1
  - seed/ 없음: `seed-validate: 시드 뿌리 폴더가 없다: seed`, exit 2
