# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P5a 풀이 검사 명령

spec: `specs/` 정본(6.3 순서 (0) '풀이 검사 스크립트' · 사람 표본 검토 문단, 6.4 '풀이 검사' 행, 6.1 모델 조합 표, 6.6 풀이 검사 비용 문단, 9절 시드 검증 행, 10절 AI 행 · 운영 행('개발용 API 호출은 다른 워크스페이스의 키'), 11절 1-가 (2), 15절 AC-7d, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P5 행 · 시드 묶음 워크플로 '풀이 검사' 점 · 위험 10 · [사람] H4 · 공통 사실 `plan-p04a-규격.md`('기록' 절) · `plan-p04c-묶음-검사-명령.md`('해시 · 문항 번호 · 풀이 검사 · 완전성' 절) · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: done(구현 · 검토 · fix 1 · 재검토 Approved 끝 00:5x, 커밋 2c31bee 00:5x. [사람] 작업 7 은 H4 뒤)
승인: 컨트롤러 2026-10-16 23:2x(C62, 아래 '컨트롤러 결정'. 요청자는 PR 병합 때 본다) · 브랜치 · 워크트리: `feature/1a-p05a-seed-check`(P4c 끝 6bd6015 위, 격리 워크트리 하나) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P5 셋 가운데 첫째다. 둘째 `plan-p05b-시드-보기.md`(활동 표시 컴포넌트와 로컬 전용 시드 보기 화면, 읽기만), 셋째 `plan-p05c-보기-기록.md`(보기 화면에서 표본 검토 · 사람 확인을 seed/ 에 쓰기)가 있다. 배정표 P5 행이 파일 열 개를 넘어 셋으로 나눴다(묶음 plan 위험 12). P5 전체의 확인한 사실 · 정할 것 · 비용 어림은 이 파일에 두고 b · c 가 가리킨다. P5a 는 P5b 와 함께 돌 수 있다(겹치는 공용 파일은 `package.json` scripts 한 줄씩).

컨트롤러 결정(2026-10-16 23:2x, 정할 것 가~하): 가 셋으로 나눔 · 바탕 — 그대로. P5a 는 P2 워크트리 `.claude/worktrees/agent-a0ffe8037fa827af6` 에 브랜치 feature/1a-p05a-seed-check 를 6bd6015 에서 만들어 바로 시작한다(P2 코드는 b1b17d7 로 끝남). P5b 는 P3b 커밋 뒤 컨트롤러가 P2b b1b17d7 · P3b · P4c 6bd6015 를 합친 줄기(package.json scripts · next.config.ts · .dependency-cruiser.cjs · tests/e2e/fixtures.ts 충돌, P4a `bandOf` → P2a level-band)를 만든 뒤, P5c 는 P5a · P5b 뒤. 나 호출 설정 상수 · 다 재시도 2 — 그대로(C62 (2)). 라 거절 = 답 없음 · fallbacks 안 보냄 · 사 칸 단위 — 그대로(C62 (3)). 마 그림 보기는 한국어 뜻 · 바 견주기 — 그대로. 아 로컬 전용 길 — 그대로(C62 (1)). 자 e2e-local 따로 설정 + CI 작업 — 그대로(권함인 공용 변경 5 · 6 도 받음). 차 순회 메모 머리 — 그대로(C62 (4)). 카 · 타 · 파 · 하 — 그대로. 보고의 '컨트롤러 전달 반영'(next/image 가 .svg 를 그대로 내보냄 · app.timezone · biome 줄 겹침 없음)을 확인했다. 위험 6(between_tools + 구조화 출력 400)은 H4 뒤 `--probe` 결과로 정한다.

## 목표 (Goal)

6.4 풀이 검사를 명령 `pnpm seed:check` 로 만든다. 검증(`validateSeed`)을 통과한 칸의 풀이 대상 문항(`solveTargets`)을 정답 · 허용 정답 · 해설을 뺀 채 `claude-sonnet-5-5`(effort low · 생각 단계 between_tools, 6.1 조합 표)에게 풀게 하고, 수업 하나의 문항을 한 호출로 푼다(6.4).
앱 정답과 다르거나 '둘 이상 맞음' · '답 없음'이면 그 칸을 사람 확인으로 보낸다. 쓰기 1~3단계 조립 · 받아쓰기 문항은 같은 호출에서 허용 정답 후보를 더 받아, 시드 허용 정답 밖 후보가 있으면 사람 확인으로 보낸다(6.4).
결과(풀이 · 판단 · 모델 · 토큰 · 비용 · 날짜)는 칸마다 `seed/checks/<내용 파일 경로>` 에 칸 내용 해시와 함께 P4a 기록 꼴(`CheckFileSchema`)로 저장하고, 해시가 바뀐 칸만 다시 푼다. 사람 확인 상태 · 완전성 판정은 P4c 의 `solveStatus` · `pnpm seed:validate` 가 하고, CI 는 저장 결과만 읽어 API 를 부르지 않는다(AC-7d, 9절 시드 검증 행).
앱 밖의 개발 스크립트이고 요청자의 개발용 워크스페이스 키(H4, 월 지출 한도)로 요청자 컴퓨터에서만 돈다. 단가와 조합은 시드 `model-prices.json`(5절 model_prices · 6.1 조합 표)에서 읽는다. 비용은 6.6 의 '수업 하나 약 0.006달러'이고, 1-가 실시드 범위는 약 3달러로 어림한다(아래 '비용 어림').

## 바뀌는 파일 (Files that change)

P5a 가 쓰는 파일은 다섯이다(모두 새 파일). 공용 변경은 이 절 끝 '요청하는 공용 변경'.

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/seed/solve-check.ts` | 신규 | 순수 함수(아래 '함수' 표). 풀이 요청 만들기(정답 뺌) · 응답 규격(Zod) · 응답 읽기 · 판정 · 기록 만들기 · 기록 파일 합치기 · 사람 확인 합치기(P5c 가 씀) · 단가 고르기 · 비용 · 조합 확인 · 대상 칸 고르기 · 풀이 지시문. SDK · 파일 · 네트워크 · 시계를 가져오지 않는다(의존 규칙 core-no-io · core-no-framework, 시각은 인자) |
| `scripts/seed-check.ts` | 신규 | 명령. 인자 · 환경 확인 · 시드 읽기(`./seed-validate` 의 `readSeedTree` · `REQUIRED_FILES` · `DEFAULT_ROOT`) · SDK 를 부르는 얇은 함수 · 동시 호출 · 기록 파일 쓰기 · 출력 · 종료 코드 · `--probe`. 순수 꼴(`parseArgs` · `checkEnvironment` · `runCheck`)을 내보내고 파일 읽기 · 쓰기 · 출력은 직접 실행될 때만 한다(`isDirectRun`, seed-validate 와 같은 꼴). `@anthropic-ai/sdk` 를 값으로 가져오는 파일은 이것 하나다(의존 규칙 sdk-only-in-ai 는 설명에 'scripts/ 는 대상 밖(풀이 검사 · AI 계약은 스크립트가 직접 부른다)'으로 두었다. P9 의 `src/server/ai` 를 기다리지 않는다) |
| `tests/unit/solve-check.test.ts` | 신규 | 순수 함수 시험(AC-7d 줄 포함, 아래 '증명') |
| `tests/unit/seed-check-cli.test.ts` | 신규 | 명령 시험. `runCheck` 를 가짜 풀이로 돌려 seed/checks 를 쓰고 `validateSeed` 로 끝을 본다. 환경 · 인자 · 출력 · 종료 코드 |
| `tests/fixtures/seed/fake-solver.ts` | 신규 | 가짜 풀이 함수. 시드 정답대로 풀거나, 지정한 칸 · 문항을 다르게 · 둘 이상 · 없음 · 후보 더함 · 거절 · 규격 깨짐 · max_tokens · API 오류로 돌려준다. 네트워크 없음. P5c 시험도 쓴다 |

### 함수(solve-check.ts, 이름은 제안)

| 함수 | 하는 일 |
|---|---|
| `buildSolveRequest(cell, index)` | 칸 하나의 풀이 요청 `{ cell, contentHash, area, level, context, items }`. 대상이 없으면 null. 문항 번호는 `itemsOf` 번호, 문항은 `solveTargets` 것만(아래 '풀이 요청' 표) |
| `SolveOutputSchema` | 응답 규격(아래 '응답 규격') |
| `SOLVE_INSTRUCTIONS` | 시스템 지시문(아래 '지시문') |
| `interpretSolveMessage(message)` | SDK 응답 꼴(`stop_reason` · `content` · `usage` · `model` 만 읽는 구조 타입)을 `{ kind: 'ok', output, model, usage }` · `{ kind: 'refusal', model, usage }` · `{ kind: 'failed', reason, model?, usage? }` 로 바꾼다. stop_reason 을 먼저 보고, text 블록을 type 으로 찾아 `JSON.parse` 뒤 `SolveOutputSchema.safeParse` |
| `judgeSolve(cell, request, answer)` | 판정 → `CheckRecord['solve']['items']` 또는 실패 까닭(아래 '판정') |
| `buildCheckRecord(...)` | 기록 하나(아래 '기록') |
| `mergeCheckFile(existing, records, cellOrder)` | 기록 파일 합치기(아래 '기록') |
| `withHumanDecisions(file, input)` | 사람 확인 합치기(아래 '기록'). P5c 의 보기 화면 쓰기가 부른다 |
| `priceOf(models, model, onDate)` · `costOf(usage, price)` | 단가 행 고르기(그 모델, `effectiveFrom` ≤ 날짜 가운데 가장 늦은 행) · 비용(입력 · 출력 · 캐시 쓰기 · 캐시 읽기 토큰 × 단가 ÷ 100만, 소수 6자리 반올림 `COST_DECIMALS`) |
| `solveCallAccepted(price, call)` | 단가 행이 이 호출 설정을 받는가: `thinkingOff === 'between_tools'` 이고 `thinkingOffEfforts` 에 `low` 가 있다(6.1 조합 표를 model_prices 시드에서 읽음) |
| `selectSolveTargets(seed, options)` | 대상 칸 고르기(아래 '대상 칸') |

### 풀이 요청(정답을 뺀 문제 보기)

대상 문항은 P4c `solveTargets` 그대로다(읽기 문항 전부, 쓰기 items 단계 문항 전부, 말하기 듣기 문항, 평가 · 배치의 읽기 · 듣기 · 쓰기 앱 채점 문항, 토리 이야기 질문). 번호 `no` 는 `itemsOf` 번호다(P4c 위험 5 — 다시 짜지 않는다). 그림(보기 · pick-word 그림)은 vocab 한국어 뜻으로 `그림: 사과` 꼴로 준다(정할 것 마). vocab 에 없으면 낱말 그대로(검증이 막으므로 드물다).

| 칸 | 문항 보기에 넣는 것 | 빼는 것 | 답 꼴 |
|---|---|---|---|
| 읽기 수업 | `context.passage` = 지문, 문항마다 질문 · 보기 넷(그림 문제는 그림 넷) | answerNo · explanationKo · glossary · preview · targetWords · newWords · unitWords | choice |
| 쓰기 1~3 수업(items) | pick-word: 그림 · 보기 / copy-tiles: 낱말 · 타일 / build-tiles: 한국어 뜻 · 타일 / fill-letters: 빈 글자 꼴(b_ll) · 타일 / dictation: 읽어 줄 글(audioText) / assemble-phrase · assemble-sentence: 카드 · 한국어 뜻(있으면) | answerNo · accepted · dictation 의 word | pick-word 는 choice, 나머지 text. dictation · assemble-* 는 후보 목록을 받는다(`listAlternatives: true`) |
| 말하기 수업 | 듣기 문항마다 읽어 줄 글(script) · 질문(prompt, 있으면) · 보기(그림은 '그림: 뜻') | answerNo · 따라 말하기 · 질문 답 · 그림 과제 · 발표 | choice |
| 단계 평가 · 배치 문항(읽기 유형) | 지문 · 질문 · 보기 | answerNo · explanationKo · unit | choice |
| 단계 평가 · 배치 문항(쓰기 앱 채점) | 쓰기 수업 문항과 같음. fill-blank · fix-sentence 는 질문(prompt) | answerNo · accepted · explanationKo · unit | 쓰기 수업과 같음. fill-blank · fix-sentence 는 text |
| 단계 평가 · 배치 문항(말하기 듣기) | 말하기 듣기와 같음 | answerNo · explanationKo · unit | choice |
| 토리 이야기 | `context.story` = textEn, 질문 둘 · 보기 셋 | answerNo · explanationKo · textKo · title | choice |

요청 꼴: `{ cell, contentHash, area, level, context: { passage?, story? }, items: SolveItemView[] }`. `SolveItemView` 는 `{ no, answer: 'choice', prompt?, listen?, picture?, options: string[] }` 또는 `{ no, answer: 'text', task, prompt?, listen?, word?, meaningKo?, pattern?, tiles?, cards?, listAlternatives }`(task 는 `copy-tiles` · `build-tiles` · `fill-letters` · `dictation` · `assemble-phrase` · `assemble-sentence` · `fill-blank` · `fix-sentence`). API 에 보내는 사용자 메시지는 이 가운데 `area` · `level` · `context` · `items` 만의 JSON 이다(칸 키 · 해시는 보내지 않는다).

### 지시문(SOLVE_INSTRUCTIONS, 글은 구현자가 쓰고 아래 규칙을 다 담는다)

1. 초등학생용 영어 문제를 정답을 모르는 채로 푸는 검토자다. 문항마다 답만 JSON 으로 낸다. 받은 `no` 를 그대로 쓴다.
2. choice 문항은 보기 번호(1부터) 하나를 `choice` 에 쓴다. 맞는 보기가 하나면 `status: "one"`, 둘 이상이면 `"multiple"`, 없으면 `"none"`.
3. text 문항은 아이가 써야 할 답 글을 대소문자 · 문장 부호까지 `text` 에 쓴다. 타일 · 카드 문항은 주어진 것만으로 만든다(카드는 모두 한 번씩). 받아쓰기는 읽어 줄 글을 듣고 쓰는 글이다. 답이 둘 이상 맞으면 `multiple`, 없으면 `none`.
4. `listAlternatives` 가 참인 문항(조립 · 받아쓰기)은 맞는 답이 여럿이어도 `status: "one"` 으로 하나를 `text` 에 쓰고, 같이 맞는 다른 답을 모두 `alternatives` 에 적는다(없으면 빈 목록, 답이 없으면 `none`). 그 밖의 문항은 `alternatives` 가 빈 목록이다.
5. 그림은 `그림: <한국어 뜻>` 으로 주어진다.
6. 풀이 과정 · 이유를 쓰지 않는다(추론을 응답에 적게 하면 reasoning_extraction 거절을 부를 수 있다 — 확인한 사실 2).

### 응답 규격(SolveOutputSchema)

```ts
z.strictObject({
  items: z.array(
    z.strictObject({
      no: z.int(),
      status: z.enum(["one", "multiple", "none"]),
      choice: z.int().nullable(),
      text: z.string().nullable(),
      alternatives: z.array(z.string()),
    }),
  ),
});
```

구조화 출력은 수 · 길이 제약을 API 에 싣지 않으므로(확인한 사실 2) 번호 모음 · 범위는 판정이 본다.

### 판정(judgeSolve)

| 갈래 | 판단(verdict) | 풀이 답(solverAnswer) | 후보(extraAccepted) |
|---|---|---|---|
| status none | none | 없음 | 없음 |
| status multiple | multiple | 고른 것이 있으면 그것 | 없음 |
| choice · status one | 고른 번호 = 시드 answerNo 면 same, 아니면 different(범위 밖 번호 포함) | 고른 번호(정수) | 없음 |
| text · status one | 답 글이 시드 accepted 가운데 하나와 앞뒤 공백 · 대소문자를 빼고 같으면 same, 아니면 different(text 가 null 이면 different). 견주기는 P4c `solveStatus` 의 후보 견주기(`trim().toLowerCase()`)와 같은 규칙이다(정할 것 바) | 답 글 | `listAlternatives` 문항만: 후보에서 빈 글 · 답 글과 같은 것 · 겹친 것을 뺀 나머지. 없으면 칸을 두지 않는다 |
| 응답이 거절(refusal) | 대상 문항 모두 none(정할 것 라) | 없음 | 없음 |

실패(기록을 쓰지 않고 다음 실행에서 다시 푼다): stop_reason 이 end_turn · refusal 밖(max_tokens 등), text 블록 없음 · JSON 아님 · 규격 실패, 응답 문항 번호 모음이 대상 모음과 다름(빠짐 · 더함 · 겹침), SDK 예외(API 오류 · 시간 넘김). 사람 확인 여부는 판정이 정하지 않는다 — 기록을 쓴 뒤 `solveStatus(칸, 기록)` 이 `passed` · `pending-human` 을 낸다.

### 기록(CheckRecord · 파일)

- `cell` = 칸 키, `contentHash` = `cellHash(칸 키, 칸)`, `solve.at` = 실행 시각 ISO(UTC 'Z' — `IsoDateTimeSchema`(`z.iso.datetime({ offset: true })`)가 Z 와 +09:00 을 모두 받는 것을 확인함), `solve.model` = 응답 `model`(실제로 답한 모델), `inputTokens` = `input_tokens` + `cache_creation_input_tokens` + `cache_read_input_tokens`(null 이면 0), `outputTokens` = `output_tokens`, `costUsd` = `costOf`, `items` = 판정.
- `human`: 앞 기록의 `human.contentHash` 가 지금 해시와 같으면 그대로 둔다(같은 내용을 `--force` 로 다시 푼 때), 다르면 뺀다.
- 파일 자리: `checksFilePath(contentFilePath(대상))` = `checks/<내용 파일 경로>`(P4a 시드 파일 배치). 파일 안 차례는 그 내용 파일의 칸 차례(`collectCells` 의 cells 차례)이고, 지금 내용에 없는 칸의 옛 기록은 뒤에 그대로 둔다(지우지 않는다 — 남긴 것).
- 쓰기: `CheckFileSchema` 로 확인한 뒤 `JSON.stringify(파일, null, 2) + "\n"`(P4a `writeSeedTree` 와 같은 꼴)을 같은 폴더 임시 파일에 쓰고 이름을 바꾼다. 쓰기 바로 앞에 그 파일을 다시 읽어 이번 칸 기록만 바꾼다(위험 8). 폴더는 처음 쓸 때 만든다(`.gitkeep` 을 두지 않는다 — P1a 폴더 규약).
- `withHumanDecisions(file, { cell, contentHash, at, items: { no, decision }[] })`: 그 칸 기록이 없거나 기록의 `contentHash` ≠ 주어진 해시면 거부(까닭 '풀이 기록이 없거나 내용이 바뀌었다'). 있으면 `human` 을 `{ contentHash, at, items }` 로 둔다. 같은 해시의 앞 `human` 이 있으면 문항 번호마다 새 결정으로 바꾸고 나머지는 둔다. 결정은 `correct`(정답 맞음 — 시드 그대로)와 `fixed`(고침 — 시드를 고친다, 고치면 해시가 바뀌어 다시 풀이 검사)다. `solveStatus` 는 `correct` 만 통과로 센다(P4c).

### 대상 칸(selectSolveTargets)

`collectCells(files, { areas })` 의 칸 가운데 (1) `solveTargets` 가 비지 않고, (2) `validateSeed(files, { mode: 'pr', areas })` 의 `errors[].cell` · `failedKeys` · `brokenKeys` 에 없고(검증을 통과한 칸만 — 6.4 '검증을 통과한 문항'), (3) `--levels` · `--file` 거르기에 맞고, (4) `--force` 이거나 기록이 없거나 기록 해시 ≠ 지금 해시인 칸. 검증에 걸린 칸은 '건너뜀'으로 센다.

### 명령(scripts/seed-check.ts)

`pnpm seed:check [--root <폴더>] [--areas <영역,…>] [--levels <n|n-m>] [--file <내용 파일 경로>] [--force] [--max-calls <n>] [--concurrency <n>] [--dry-run] [--probe] [--json]`

| 인자 | 뜻 |
|---|---|
| `--root` | 시드 뿌리(기본 `seed`) |
| `--areas` | 영역 거르기(기본 넷, seed:validate 와 같은 꼴) |
| `--levels` | 단계 거르기. 칸 키의 단계(토리 이야기는 구간 첫 단계)로 본다. `4` 또는 `1-6` |
| `--file` | 내용 파일 하나의 칸만(`lessons/reading/4/2.json` 꼴, `parseSeedPath` 가 내용 파일로 받는 경로) |
| `--force` | 해시가 그대로인 칸도 다시 푼다(정할 것 카) |
| `--max-calls` | 이번 실행의 호출 수 상한. 넘으면 남은 칸은 '남음'으로 세고 다음 실행이 푼다 |
| `--concurrency` | 동시 호출 수(기본 1, 1~8, 기술 값 이름 붙인 상수) |
| `--dry-run` | 부르지 않고 대상 칸 · 문항 수와 어림 비용(이미 있는 기록의 칸당 평균 비용 × 대상 칸 수, 기록이 없으면 비용 칸은 비움)을 낸다 |
| `--probe` | 시드 대신 고정 문항 하나(읽기 지문 한 줄 · 보기 넷의 이름 붙인 상수)를 실제로 불러 모델 · stop_reason · 입력 · 출력 토큰 · 판단을 낸다. 파일을 쓰지 않는다. `--root` 에 model-prices 가 있으면 비용도. H4 뒤 첫 실호출 확인용(작업 7) |
| `--json` | 사람 출력 대신 JSON 보고 하나 |

환경 확인(`checkEnvironment(env, 모드)`): `CI` 가 비지 않으면 풀이 · `--probe` 를 거부하고 2(`--dry-run` 은 된다) — CI 는 API 를 부르지 않는다(AC-7d). `ANTHROPIC_API_KEY` 가 없으면 2 이고 '개발용 키(.env.local, H4)가 없다'만 낸다. 키 값 · 접속 정보는 어느 출력 · 오류에도 내지 않는다.

입력 확인(2): 모르는 인자 · 잘못된 값, 뿌리 폴더 없음, `REQUIRED_FILES`(seed-validate) 또는 `model-prices.json` 이 없거나 JSON 이 아님, `priceOf(SOLVE_MODEL, 오늘)` 행 없음, `solveCallAccepted` 거짓, `--file` 이 내용 파일 경로가 아님.

| 종료 | 뜻 |
|---|---|
| 0 | 대상 칸을 모두 풀었다(사람 확인이 생겨도 0 — 사람 확인은 seed:validate 가 막는다). `--dry-run` · `--probe` 성공 |
| 1 | 풀지 못한 칸(실패) · 검증 실패로 건너뛴 칸 · `--max-calls` 로 남은 칸이 있다. `--probe` 실패 |
| 2 | 입력 · 환경 오류 |

사람 출력 첫 줄: `seed-check: 대상 <n> · 푼 칸 <n> · 통과 <n> · 사람 확인 <n> · 실패 <n> · 건너뜀 <n> · 남음 <n> · 거절 <n> · 호출 <n> · 입력 <n> · 출력 <n> 토큰 · 비용 <x>달러`. 다음 줄부터 `사람 확인 <칸 키> /dev/seed-viewer?file=<경로>&cell=<칸 키>`(주소 값은 URL 인코딩, P5b 보기 화면), `실패 <칸 키> <까닭>`, `건너뜀 <칸 키> 검증 실패`.

`--json`(version 1, P8 시드 묶음 워크플로가 읽는다): `{ version: 1, mode: 'solve' | 'dry-run', model, effort, thinking, filter: { areas, levels, file }, summary: { targets, solved, passed, pendingHuman, failed, skipped, remaining, refused, calls, inputTokens, outputTokens, costUsd }, cells: { cell, file, status: 'passed' | 'pending-human' | 'failed' | 'skipped' | 'remaining' | 'planned', verdicts?: { no, verdict }[], reason? }[] }`. 꼴을 바꿀 때는 version 을 올리고 P8 과 맞춘다.

### 호출 설정(스크립트 머리 이름 붙인 상수, 정할 것 나)

| 이름(제안) | 값 | 근거 |
|---|---|---|
| `SOLVE_MODEL` | `claude-sonnet-5-5` | 6.4(잠정) · 10절 AI 행 |
| `SOLVE_EFFORT` | `low` | 6.4 · 6.6 |
| `SOLVE_THINKING` | `{ type: "between_tools" }` | 6.4 · 6.1 '답 앞의 생각 단계 끔'. Sonnet 5.5 는 effort high 이하에서만 받는다(확인한 사실 3) |
| `SOLVE_MAX_TOKENS` | 4000 | 기술 값. 생각을 끈 JSON 답이라 6.6 가정 출력 300 의 열 배 넘게 둔다. 6.3 순서 (2) 표본에서 출력 p99 를 재어 고친다 |
| `SOLVE_TIMEOUT_MS` | 60000 | 기술 값(요청 하나) |
| `SOLVE_MAX_RETRIES` | 2 | SDK 기본(408 · 409 · 429 · 5xx · 연결 오류). 아이가 기다리는 실시간 호출이 아니어서 6.1 의 0(C1)을 쓰지 않는다(정할 것 다) |

- 요청: `client.messages.create({ model, max_tokens, thinking, output_config: { effort, format: zodOutputFormat(SolveOutputSchema) }, system: SOLVE_INSTRUCTIONS, messages: [{ role: "user", content: <문제 보기 JSON> }] })` → `interpretSolveMessage`. `messages.parse()` 는 거절 · 잘림에서 예외를 던져 stop_reason 을 잃으므로 쓰지 않는다(확인한 사실 1 · 2).
- 클라이언트: `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: SOLVE_MAX_RETRIES, timeout: SOLVE_TIMEOUT_MS })`. 키를 넘겨 ant 프로필 · `ANTHROPIC_AUTH_TOKEN` 같은 다른 자격 증명이 끼어들지 않게 한다(10절 개발용 워크스페이스, 위험 5).
- 보내지 않는 것: temperature · top_p · top_k(6.1, 400), `fallbacks` · 베타 헤더(정할 것 라), `cache_control`(전체 비용이 작고 6.6 셈이 캐시 없이 잡았다), metadata.
- `.env.local` 읽기: 명령은 `node --env-file-if-exists=.env.local --import tsx scripts/seed-check.ts` 다(공용 변경 1). 환경에 이미 있는 값이 이긴다(확인한 사실 8).

### 비용 어림(6.6, 문항 칸 토큰은 추측)

| 범위 | 호출 | 어림 |
|---|---|---|
| 1-가 실시드(C50 (4)) | 수업 칸 약 442(읽기 · 쓰기 1단계 단원 0~5 각 156, 말하기 단원 1~5 130 — 단원마다 정규 10 + 보강 3 × 변형 2) + 1단계 단계 평가 1벌 문항 칸 약 46 + 배치 평가 가 벌 문항 칸 약 126 | 약 3달러(수업 0.006 × 442 + 문항 칸 약 0.0016 × 172) |
| 첫 운영 배포(1~6단계, 6.3 표) | 수업 칸 약 2,240(쓰기 4~6단계 과제는 대상 아님) + 단계 평가 문항 칸 약 830 + 배치 약 126 + 토리 이야기 40 | 약 15달러 |

문항 칸 하나는 입력 약 500 · 출력 약 60 토큰(지시문 포함, 추측)으로 셌다. 다시 만든 칸은 다시 푼다(1.5배쯤). 6.6 '전체 약 50달러 이하이고 첫 운영 배포 범위는 그 절반쯤' 안이다. Batch API(50% 할인)는 쓰지 않는다 — 결과를 바로 사람 확인으로 넘겨야 하고 전체가 작다.

### 요청하는 공용 변경(컨트롤러가 합친다)

P5a 의 구현자가 자기 워크트리에서 옮기고 다른 워크트리와 합칠 때 컨트롤러가 충돌을 푼다(P3 · P4 와 같은 방식). P5b 의 공용 변경은 `plan-p05b-시드-보기.md`.

1. `package.json` 의 scripts 에 한 줄.

```json
"seed:check": "node --env-file-if-exists=.env.local --import tsx scripts/seed-check.ts"
```

CI 작업은 더하지 않는다(풀이 검사는 로컬에서 요청자 키로만, AC-7d). biome 의 seed 제외는 P6a 가 `biome.json` includes 에 `"!seed/**/*.json"` 을 더한다(P4a 정할 것 ㅌ, P6a 워크트리 — 컨트롤러 전달 2026-10-16 22:3x). P5 는 같은 줄을 요청하지 않으므로 겹치지 않는다(위험 9).

## 작업 순서 (Order of work)

한 구현자(implementer · Opus · high)가 차례로 한다. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴이다(서브에이전트 환경이 `source` 를 막는다). 시험을 먼저 쓰고 실패를 본 뒤 구현한다. 시험 숫자는 P4a 만들기 함수(`miniSeed` · `smallReferenceSet` · `sampleSeedTree` · 견본 단가 표)에서 읽는다. 구현자는 API 키가 없고 실제 API 를 부르지 않는다.

1. [검증] 풀이 요청 · 판정 · 기록. `solve-check.test.ts` 의 문제 보기 · 판정 · 기록 · 사람 확인 합치기 · 비용 · 조합 · 대상 칸 줄을 먼저 쓴다 → `src/core/seed/solve-check.ts`. 완료: 시험 통과, `pnpm check:deps` 0.
2. [검증] 명령. `fake-solver.ts` · `seed-check-cli.test.ts`(runCheck · parseArgs · checkEnvironment · 출력 · 종료 코드 · 쓰기)를 먼저 쓴다 → `scripts/seed-check.ts` 의 순수 꼴과 쓰기. 완료: 시험 통과.
3. [검증] SDK 를 부르는 함수(`createAnthropicSolver`)와 `--probe`. 시험은 SDK 를 부르지 않는다(응답 읽기는 1 의 `interpretSolveMessage` 시험이 덮는다). 완료: `pnpm build` 통과, 키 없이 `pnpm seed:check --probe` 가 2.
4. [검증] 실기(키 없이). `tests/.tmp/seed-check-<무작위>/` 에 `miniSeed` 나무(풀이 기록을 뺀 것)를 쓰고 `pnpm seed:check --root … --dry-run`, `CI=true pnpm seed:check --root …`(2), 키 없음(2), 뿌리 없음(2)을 본다. 공용 변경 1 이 합쳐지기 전에는 `node --import tsx scripts/seed-check.ts`. 완료: 구현 보고에 출력.
5. [검증] 마무리. 공용 변경 1 을 옮긴 뒤 CI 와 같은 순서 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle`, 비밀값 grep 0건. 완료: 출력이 구현 보고에 있다.
6. [사람] 검토 · 커밋(H14). code-reviewer(Opus · xhigh) 검토와 fix(3회까지) 뒤 요청자 지시로 컨트롤러가 커밋한다. 완료: 커밋.
7. [사람] H4 뒤 첫 실호출. 요청자 터미널에서 `pnpm seed:check --probe`(호출 하나, 0.01달러 안쪽)를 돌려 첫 줄(모델 · stop_reason · 토큰 · 판단)만 컨트롤러에게 알린다. 400 이면 위험 6. P8 첫 표본 전에 한다. 완료: 결과가 장부에 있다.

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 정답이 문제 보기에 샌다(answerNo · accepted · 해설 · 받아쓰기 낱말 · 그림 보기의 영어 낱말) | 풀이 검사가 늘 '같음'이 되어 시드 오류를 못 잡는다 | '풀이 요청' 표의 빼는 칸. 시험 "풀이 검사 문제 보기 …" 가 견본 칸마다 보낼 JSON 에 그 칸 · 값이 없음을 본다. 검토 점검 항목 |
| 2 | 판정과 `solveStatus` 가 어긋난다(같음인데 사람 확인, 후보 견주기 규칙 차이) | 사람 확인이 늘거나 빠진다 | 같은 견주기 규칙. 시험이 판정 뒤 `solveStatus` 로 끝 상태를 본다 |
| 3 | 해시 · 문항 번호 · 대상을 다시 짠다 | 기록이 칸과 어긋나 모두 다시 풀어야 한다 | P4c 의 `cellHash` · `itemsOf` · `solveTargets` · `collectCells` 만 쓴다(plan-p04c 위험 5) |
| 4 | 개발용 키 비용 | 월 한도 초과 | 워크스페이스 월 한도(H4), 해시가 같은 칸은 건너뜀, `--max-calls` · `--dry-run`, CI 거부(묶음 위험 10) |
| 5 | 엉뚱한 자격 증명 · 워크스페이스로 부른다 | 운영 워크스페이스 비용 · 한도를 쓴다 | apiKey 를 `ANTHROPIC_API_KEY` 로만 넘긴다. 키는 요청자 `.env.local` 의 개발용 키이고 운영 키는 기기에 없다(10절). 키는 저장소 · 장부 · 대화에 적지 않는다 |
| 6 | between_tools 와 구조화 출력을 함께 보내면 400 일 수 있다(추측 — 문서에 막는 말이 없고 6.1 이 회화 턴에 같은 조합을 쓴다) | 첫 실호출 실패 | 작업 7 `--probe` 가 P8 전에 확인한다. 400 이면 adaptive · low 로 바꿀지 컨트롤러가 정한다(6.4 값이 바뀌므로 13절 한 줄) |
| 7 | 거절 · max_tokens · 규격 깨짐 | 기록 없는 칸이 남아 완전성이 안 넘는다 | 거절은 none 갈래(정할 것 라), 나머지는 실패로 세고 다음 실행이 다시 푼다. 실패가 되풀이되면 그 칸을 보기 화면으로 사람이 본다 |
| 8 | seed:check 와 보기 화면(P5c)이 같은 checks 파일을 함께 쓴다 | 한쪽 기록이 덮인다 | 둘 다 쓰기 바로 앞에 다시 읽어 자기 칸만 바꾼다. 남는 틈은 '풀이 검사를 돌리는 동안 같은 묶음의 사람 확인을 남기지 않는다'로 P8 브리프에 적는다 |
| 9 | 명령이 쓴 seed JSON 이 biome 포맷과 달라 lint 가 깨진다 | CI lint | P6a 가 `biome.json` 에 `"!seed/**/*.json"` 을 더한다(P4a 정할 것 ㅌ). P6a 가 합쳐지기 전에는 seed/ 가 없어 문제 없다 |
| 10 | 전체 검증(`validateSeed`)을 실행마다 돌리는 시간 | 묶음마다 몇 초 더 든다(추측) | P8 표본에서 잰다(P4c 위험 1). 길면 `--file` 의 파일만 칸 검사를 돌리는 길을 그때 정한다 |
| 11 | 지시문을 고쳐도 해시가 바뀌지 않는다(기록에 지시문 판 칸이 없다) | 옛 지시문의 결과가 남는다 | 지시문을 고친 커밋에서 `--force` 로 다시 풀지 컨트롤러가 정한다(정할 것 카) |
| 12 | `--concurrency` 를 올리면 429 | 실패 칸 | SDK 재시도 2회(retry-after 따름), 기본 동시 1 |

### 정할 것(P5 전체, 컨트롤러가 정함 — 보고 `task-p05-plan-report.md` 와 같은 번호)

| 번호 | 무엇 | 왜 | 권함 | 13절 |
|---|---|---|---|---|
| 가 | P5 를 셋으로 나누고 바탕 브랜치 | 배정표 P5 행이 파일 스물 남짓이다 | P5a(풀이 검사) 6bd6015 위, P5b(활동 표시 · 보기 화면 읽기) P2b b1b17d7 · P3b(커밋 뒤) · P4c 6bd6015 를 컨트롤러가 합친 줄기 위, P5c(보기 기록 쓰기) P5a · P5b 를 합친 위. a ∥ b | 아니오 |
| 나 | 풀이 검사 호출 설정의 자리 | 6.4 는 값만 적고 12절 키가 없다 | 스크립트 머리 이름 붙인 상수(모델 · effort · 생각 단계는 6.4 값, max_tokens 4000 · 시간 60초는 기술 값). 12절 키를 두지 않는다 — 앱 설정이 아니라 개발 도구 값이다. P7 check-ids 허용 목록에 넣는다. 다른 길: 12절 키 `seed.solve_*`(13절 필요) | 아니오 |
| 다 | 스크립트의 재시도 | 6.1 · C1 의 0회는 실시간 호출 규칙이다 | SDK 기본 2회. 다른 길: 0회(묶음 plan 제약 줄 글자대로, 실패 칸은 다시 돌려 푼다) | 아니오 |
| 라 | 거절 처리와 대체 모델 | 6.4 에 거절 갈래가 없다 | 대상 문항 모두 none 으로 적어 사람 확인으로 보낸다('답 없음' 갈래로 읽음). fallbacks 를 보내지 않는다 — Sonnet 5.5 의 서버 측 대체는 cyber · frontier_llm 만 다시 해서 아이용 문항에서 날 수 있는 general_harms 거절에 소용이 없고(확인한 사실 3), 대체 모델 단가 셈을 P5 가 짜지 않는다. 다른 길: 기록 없이 실패(그 칸은 통과할 길이 없다) | 아니오 |
| 마 | 그림 보기를 풀이 모델에 주는 꼴 | 그림 보기는 단어 id 라 영어 낱말을 주면 답이 드러난다 | vocab 한국어 뜻 `그림: 사과` 꼴 | 아니오 |
| 바 | 글 답 견주기 | 앱 채점(P11)의 대문자 · 마침표 규칙(AC-4a)과 풀이 검사의 목적이 다르다 | 앞뒤 공백 · 대소문자만 무시(`solveStatus` 후보 견주기와 같음). 시드 오류 찾기라 느슨하게 둔다 | 아니오 |
| 사 | 한 호출의 단위 | 6.4 는 '수업 하나 한 호출'만 적었다 | 칸 하나(수업 칸 = 수업 하나, 평가 · 배치 문항 칸 = 문항 하나, 토리 이야기 칸 = 이야기 하나). 기록 · 해시가 칸마다다. 다른 길: 평가 벌 · 배치 단계마다 묶음(호출 약 170 줄고 1달러 안쪽 차이) | 아니오 |
| 아 | 시드 보기 화면의 '로컬만' 길 | AC-7f '프리뷰 · 운영 빌드에서 안 열림'. P2b 의 VERCEL_ENV 길은 프리뷰에 남는다 | next.config 를 함수 꼴로 바꿔 `PHASE_DEVELOPMENT_SERVER` 일 때만 `local.tsx` 를 pageExtensions 에 넣고(프리뷰 · 운영 · 로컬 next build 모두 빠짐), 쪽 · 서버 액션 안에서 NODE_ENV 가 development 가 아니면 notFound()(두 겹). 다른 길: 켜는 환경 변수(잘못 켜면 배포에 들어간다) | 아니오(기술 선택 기록을 원하면 한 줄) |
| 자 | e2e-local 꼴과 CI | Playwright 의 webServer 는 설정 단위라 한 설정의 프로젝트 둘로 서버를 가를 수 없다(확인한 사실 7) | 따로 둔 설정 `playwright.local.config.ts`(next dev 3200, 기존 서버 다시 쓰지 않음, 시드 뿌리는 tests/.tmp) + `pnpm e2e:local`. CI 작업 e2e-local 을 더한다(활동 표시 컴포넌트를 P10 · P11 이 고칠 때 회귀를 잡는다, API 0회) | 아니오 |
| 차 | 아이 눈 순회 질문(역분석 제안 9)의 자리 | reviews 행 꼴은 6.3 'seed_reports 와 같은 열' 다섯이다 | 표본 검토 칸에 여덟 질문(인지 순회 넷 + 우리 넷) 점검표를 두고, '아니오'인 질문의 짧은 이름을 메모 머리 `[순회 아니오: …]` 로 적는다. 다른 길: 행에 칸을 더함(P4a 규격 · 5절 열 — 13절 필요) | 아니오 |
| 카 | 지시문을 고친 뒤 다시 풀기 | 기록에 지시문 판 칸이 없다(P4a 규격) | 지시문을 고친 커밋에서 컨트롤러가 `--force` 여부를 정한다(1-가 범위 약 3달러) | 아니오 |
| 타 | 요청자가 로컬에서 보기 화면을 여는 전제 | /dev/* 도 쿠키(C57)이고 접근 코드 제출은 DB 설정 행이 있어야 한다(P3b 위험 14) | 그대로. 요청자가 쓰는 때는 H3 · P7 뒤(`.env.local` 의 `ACCESS_CODE_HASH` · `DATABASE_URL` 개발용)이고 P8 표본 검토(H11)가 그 뒤라 맞는다. 그 전에는 e2e 쿠키로만 연다. 다른 길: next dev 에서만 /dev/* 를 proxy 에서 넘김(C57 과 어긋남 — 13절 필요) | 아니오 |
| 파 | 활동 표시 컴포넌트의 범위 | 위험 13(묶음) — P11 이 상호작용만 더한다 | 읽기 · 쓰기 · 말하기 수업과 평가 · 배치 문항 · 토리 이야기의 '내용 부분'(지문 · 질문 · 보기 · 타일 · 카드 · 문장 틀 · 그림)만. 누르는 버튼 · 상태 · 세션 틀은 P10 · P11, 회화 카드의 아이 화면은 1-나(보기 화면은 회화 카드 · 회화 평가 장을 어른용 표로) | 아니오 |
| 하 | 날짜 · 시각 | 정본에 기록 날짜의 시간대가 없다 | 표본 검토 행 `date` 는 한 시계 `now()` 를 seed/settings.json 의 `app.timezone`(P6a 의 settings.json 에 있다, 확인한 사실 17)으로 본 달력 날짜(학습일 경계 아님), 풀이 · 사람 확인 `at` 은 UTC ISO, 단가 행 고르기는 실행 시각의 UTC 날짜 | 아니오 |

### 제약

- 설계를 바꾸지 않는다. 정본과 다르게 해야 하면 이 절에 적고 보고의 '컨트롤러가 정할 것'에 올린다. 컨트롤러가 13절에 한 줄 먼저 넣은 뒤 구현한다.
- 해시 · 문항 번호 · 풀이 대상 · 상태 · 기록 꼴은 P4 것을 그대로 쓴다(plan-p04a 정할 것 ㅋ). 바꿀 일이 생기면 13절 한 줄과 다시 풀기 비용을 함께 적는다.
- 설계 숫자는 settings 에서 읽는다. 호출 설정은 정할 것 나, 단가 · 조합은 model-prices 시드에서 읽는다. 시험 숫자는 만들기 함수의 견본에서 읽는다.
- AI 는 이 스크립트에서만 부르고 앱 코드(`src/`)는 SDK 를 가져오지 않는다(sdk-only-in-ai). CI · 시험은 실제 API 를 부르지 않는다. temperature · top_p · top_k 를 보내지 않는다.
- 비밀값(키 · 접속 정보)과 아이 이름은 어디에도 적지 않는다. 출력 · 기록 · 보고에 키를 내지 않는다.
- 용어는 영역 · 단계 · 단원 · 활동이다. 코드 식별자와 브랜치 이름은 영어 ASCII 다.
- 서브에이전트는 호출마다 model · effort 를 적는다(implementer Opus · high, code-reviewer Opus · xhigh). 커밋 · PR 은 요청자 지시 때만(H14).

### 확인한 사실과 출처(P5 전체, 2026-10-16)

| 번호 | 사실 | 출처 · 판 |
|---|---|---|
| 1 | SDK 0.135.0: `messages.create` · `messages.parse`(`parsed_output`, 풀기 실패면 `AnthropicError`), `output_config: { effort, format }`, `thinking: { type: 'between_tools' }`(`ThinkingConfigBetweenTools`), `zodOutputFormat`(`@anthropic-ai/sdk/helpers/zod`, 안에서 `zod/v4` · `create` 에 주면 자동으로 풀지 않음), `Usage` 칸 `input_tokens` · `output_tokens` · `cache_creation_input_tokens` · `cache_read_input_tokens` · `output_tokens_details.thinking_tokens` · `service_tier`, 기본 `maxRetries` 2 | 설치판 `node_modules/@anthropic-ai/sdk`(0.135.0) `resources/messages/messages.d.ts` · `helpers/zod.js` · `lib/parser.js`, claude-api 스킬 TS README |
| 2 | 구조화 출력은 `claude-sonnet-5-5` 를 받는다. stop_reason 이 refusal · max_tokens 면 출력이 규격과 안 맞을 수 있다(200, 낸 토큰은 과금). 수 · 길이 · minItems 1 넘는 제약은 API 에 안 가고 SDK 가 지워 설명으로 옮기며 검증은 클라이언트가 한다. 응답에 추론을 적게 하는 칸은 reasoning_extraction 거절을 부를 수 있다 | https://platform.claude.com/docs/en/build-with-claude/structured-outputs |
| 3 | Sonnet 5.5 의 `between_tools` 는 가장 낮은 생각 설정이고 effort high 이하에서만, thinking 안에 다른 칸 없이, Sonnet 5.5 만 받는다. 거절 갈래는 cyber · bio · frontier_llm · reasoning_extraction · general_harms 이고 서버 측 대체(`fallbacks: "default"`)는 cyber · frontier_llm 만 다시 한다 | claude-api 스킬 `shared/model-migration.md` 'Migrating to Claude Sonnet 5.5'(스킬 문서, 공식 문서는 직접 못 봄) |
| 4 | 단가(100만 토큰당): Sonnet 5.5 입력 2 · 5분 캐시 쓰기 2.50 · 캐시 읽기 0.10 · 출력 10달러, 배치 1 · 5. 정본 6.6 과 같다 | https://platform.claude.com/docs/en/about-claude/pricing |
| 5 | Next 16.4.2: next.config 는 `(phase, { defaultConfig })` 함수를 내보낼 수 있고 next.config.ts 도 같은 길(`normalizeConfig`)로 부른다. `PHASE_DEVELOPMENT_SERVER` = `phase-development-server`. next dev 는 `.next/dev` 에 쓰고 next build 와 함께 돌 수 있다. next dev 는 `<distDir>/lock` 을 잡아(`experimental.lockDistDir` 기본 참) 같은 폴더의 둘째 next dev 는 기존 서버를 알리고 끝난다. next build 타입 검사는 `.next/dev/types` 를 걸러 낸다(지운 경로의 옛 개발 타입이 오류를 내지 않게) | 설치판 `next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/index.md` · `06-cli/next.md` · `02-guides/ai-agents.md`, 원본 `server/config.js` · `server/config-shared.js` · `server/lib/router-utils/setup-dev-bundler.js` · `lib/typescript/runTypeCheck.js` · `constants.d.ts` |
| 6 | App Router 의 page · route 파일은 `(page\|route)\.(<확장자들>)$` 로 고르고 pageExtensions 는 목록을 통째로 바꾼다 | plan-p02 확인한 사실(16.4.2 `find-page-file.js`) |
| 7 | Playwright 1.64.1: webServer 는 설정(TestConfig) 칸이고 프로젝트(TestProject)에는 없다. 배열로 여럿 띄울 수 있다. `reuseExistingServer: false` 면 그 포트 · 주소에 서버가 있을 때 던진다. url 대기는 2xx · 3xx · 400 · 401 · 402 · 403 을 받는다. tsconfig paths 를 푼다 | 설치판 `playwright/types/test.d.ts`(TestProject 111~800줄에 webServer 없음, 1091 · 11147줄) · `lib/transform/esmLoader.js` |
| 8 | Node `--env-file-if-exists`(22.9 부터)는 파일이 없어도 오류가 없고, 환경과 파일에 같은 이름이 있으면 환경 값이 이긴다 | https://nodejs.org/api/cli.html |
| 9 | tsx 4.23.15 의 `"."` 내보내기는 `dist/loader.mjs` 다(`node --import tsx`) | 설치판 `tsx/package.json` |
| 10 | 의존 규칙 sdk-only-in-ai 는 `src/` 안에서만 보고 설명에 'scripts/ 는 대상 밖(풀이 검사 · AI 계약은 스크립트가 직접 부른다)'이다. `pnpm check:deps` 는 `depcruise src` 다. ai-only-from-server 는 `src/server/ai` 를 src/server 밖에서 못 가져오게 한다 | `.dependency-cruiser.cjs` · `package.json`(P4c 6bd6015) |
| 11 | P3b 의 함수 안 확인 훑기는 'use server' 파일 · 함수와 이름이 `route.ts` · `route.tsx` 인 파일만 본다(`route.local.ts` 는 안 본다). 첫 문장은 `await requireAccess()` | P3b 워크트리 `tests/unit/access-gate.test.ts` 62 · 74줄 |
| 12 | 한 시계 훑기: src/core · src/server · src/db · src/proxy.ts 에서 `Date.now()` · 인자 없는 `new Date()` 는 src/server/clock 에만 있어야 한다 | `tests/unit/learning-day.test.ts` 175줄(P3a 25041d9) |
| 13 | spec-trace 는 tests 아래 `.test.ts` · `.spec.ts` 를 모두 보고(e2e-local 포함) 묶음 plan 증명 표만 읽는다. vitest unit 은 tests/unit · tests/contract 의 `.test.ts` 만 | `scripts/spec-trace.ts` 13~14 · 338~348줄, `vitest.config.mts`(P3 워크트리) |
| 14 | biome next 도메인이 `<img>` 에 noImgElement 경고를 낸다 | 임시 파일로 확인(biome 2.5.15) |
| 15 | P4 이름: `collectCells`(cells 는 `file` · `path` 가 붙은 칸, `records` · `index`(vocab · images) · `reference.modelPrices` · `failedKeys` · `brokenKeys`) · `cellHash` · `itemsOf` · `solveTargets` · `solveStatus`(후보 견주기 `trim().toLowerCase()`) · `validateSeed` · `checksFilePath` · `contentFilePath` · `reviewFilePath` · `parseSeedPath` · `CheckFileSchema` · `ReviewFileSchema`(행 칸 다섯) · `readSeedTree` · `REQUIRED_FILES`. 견본 단가 표는 6.6 값이다(P4a 검토 M-6 고침) | P4c 6bd6015 `src/core/seed/validate.ts` · `structure.ts` · `schema/records.ts` · `scripts/seed-validate.ts` · `tests/fixtures/seed/builders.ts` 1027~1070줄 |
| 16 | Next 16.4.2 의 `next/image` 는 SVG 를 최적화하지 않는다. `src` 가 `.svg` 로 끝나면 저절로 `unoptimized` 가 되어 그 파일을 그대로 `<img>` 로 내보내고, 최적화기를 거치는 SVG 만 `dangerouslyAllowSVG` 가 있어야 한다. 그래서 P6 의 SVG 카탈로그(`public/images/vocab/<키>.svg`)를 `next/image` 로 보여도 막히지 않는다 | 설치판 `next/dist/docs/01-app/03-api-reference/02-components/image.md` 394 · 923~943줄 |
| 17 | P6a 가 만드는 규격 파일(컨트롤러 전달 2026-10-16 22:3x, P4c 바탕): `settings.json` 약 180행(12절 키 전부 — `app.timezone` 포함, 구간 키는 네 행, 단계마다 다른 값은 단계 → 수 사전, `ai.thinking.*` 은 `off` · `adaptive`), `level-specs.json` 48, `unit-specs.json` 242, `vocab.json` 약 2,000항목(한 줄에 한 항목), `images.json`(SVG, Twemoji v17.0.3 CC-BY 4.0 + 그린 것 `generated`, P4 그림 파일 정규식에 svg 를 더함 — P6b), `model-prices.json` 여섯 행, `lists/` 넷. `biome.json` 에 `"!seed/**/*.json"` | 컨트롤러 메시지(P6 계획자 결과), P6 plan |

(추측): 문항 칸 하나의 토큰 수와 비용 어림, between_tools 와 구조화 출력의 함께 쓰기(위험 6), 아이용 문항에서 거절이 드물다는 것, 실행마다 전체 검증의 시간(위험 10).

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름) | 파일 · 명령 |
|---|---|---|
| AC-7d | 단위 "AC-7d 풀이 검사: 앱 정답과 다르게 풀린 문항은 different 로 적히고 그 칸은 사람 확인(pending-human)이다" · "AC-7d 풀이 검사: '둘 이상 맞음' · '답 없음'은 multiple · none 으로 적히고 사람 확인이다" · "AC-7d 풀이 검사: 조립 · 받아쓰기의 허용 정답 후보가 시드 밖이면 사람 확인이고 시드 안이면 통과다" · "AC-7d 풀이 검사: 정답대로 풀리면 그 칸의 내용 해시로 적히고 solveStatus 가 passed 다" · "AC-7d 풀이 검사 대상: 해시가 그대로이고 기록이 있는 칸은 다시 풀지 않고 검증에 실패한 칸은 건너뛴다" | `tests/unit/solve-check.test.ts` |
| 6.4 풀이 요청 · 판정 · 기록 | 단위 "풀이 검사 문제 보기: 정답 번호 · 허용 정답 · 해설 · 바른 답 · 받아쓰기 낱말이 들어가지 않는다" · "풀이 검사 문제 보기: 듣기 문항은 읽어 줄 글과 보기만 주고 그림 보기는 vocab 한국어 뜻으로 준다" · "풀이 검사 문제 보기: 문항 번호는 itemsOf 번호이고 solveTargets 문항만 든다" · "풀이 검사 응답 읽기: 거절은 대상 문항 모두 none 이고 max_tokens · 규격 깨짐 · 번호 어긋남은 기록 없는 실패다" · "풀이 검사 기록: 같은 해시의 사람 확인은 남기고 해시가 바뀌면 지우며 파일 안 차례는 칸 차례다" · "6.4 사람 확인: 해시가 같은 풀이 기록에만 '정답 맞음' · '고침'을 적고 solveStatus 는 정답 맞음만 통과로 센다" · "풀이 검사 비용: model-prices 에서 그 모델의 그날 이전 가장 늦은 단가로 입력 · 출력 · 캐시 토큰을 센다" · "풀이 검사 조합: 단가 행이 없거나 between_tools · low 를 받지 않는 모델이면 시작하지 않는다" | `tests/unit/solve-check.test.ts` |
| AC-7d(명령, P5 완료 판정 '시험용 칸이 풀리고 CI 는 API 0회로 저장 결과만 읽는다') | 단위 "AC-7d 명령: 기록 없는 시험용 시드를 가짜 풀이로 풀면 seed/checks 에 적히고 seed:validate --complete-through 1 이 API 없이 통과한다" · "AC-7d 명령: 다르게 풀린 칸은 사람 확인 목록으로 나오고 종료 0 이며 seed:validate PR 모드는 그 칸으로 1 이다" · "AC-7d 명령: CI 환경 변수가 있으면 풀지 않고 2 로 끝난다" | `tests/unit/seed-check-cli.test.ts` |
| 명령 | 단위 "명령: 키가 없거나 모르는 인자 · 뿌리 없음 · 단가 행 없음이면 2 이고 출력에 키 값이 없다" · "명령: --dry-run 은 풀이 함수를 부르지 않고 대상 칸 수를 낸다" · "명령: --areas · --levels · --file 로 대상을 거르고 --max-calls 에서 멈춘다" · "명령: 풀지 못한 칸이 있으면 1 이고 다시 돌리면 그 칸만 푼다" · "명령: 첫 줄 요약 꼴과 --json 보고 꼴(version 1)" + 작업 4 실기 출력 | `tests/unit/seed-check-cli.test.ts` · `scripts/seed-check.ts` |
| 실호출(수동) | [사람] H4 뒤 `pnpm seed:check --probe` 첫 줄 | 작업 7 |
| 공통 | `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` · `pnpm check:bundle` 0, 비밀값 grep 0건. missing-test 는 그대로(AC-7d 는 P4c 가 이미 덮었다) | 작업 5 |

시험 이름은 글자 그대로 적는다(spec-trace). 시험 안의 숫자는 만들기 함수의 설정값 · 단계 규격 · 견본 단가에서 읽는다.

## 완료 보고 (Done)

- 구현: impl-p05a(implementer · Opus · high)가 P2 워크트리(`.claude/worktrees/agent-a0ffe8037fa827af6`)에 만든 브랜치 `feature/1a-p05a-seed-check`(바탕 P4c 6bd6015)에서 함. 보고 `task-p05a-report.md` · fix 1 `task-p05a-fix1-report.md`(워크트리 장부 폴더).
- 실제 바뀐 파일: 표의 다섯(새 파일) + 공용 변경 1(`package.json` scripts `seed:check`). `scripts/seed-check.ts` 는 1005줄.
- 계획과 다르게 한 것(검토가 모두 받음) 11: runCheck deps 에 store(읽기 · 쓰기, 임시 파일 → 이름 바꾸기) · Solver 타입은 core · 내보낸 함수 여섯 더함 · 건너뜀 정의 · dry-run 미리 보기 줄 · 실패 호출도 토큰 셈 · 실패 까닭에 API 글 300자(키 가림 세 겹) · authToken null · probe 는 --root 만 · max-calls · concurrency 정수 · 지시문 한국어. 재검토 뒤 컨트롤러 고침(N-1): ANTHROPIC_BASE_URL 알림은 늘 표준 오류 · `seed-check: 주소 <host>` 만(접속 정보 안 냄).
- 시험 · 명령: 단위 159 → 180 → 182(fix 1), 시험 이름 21 은 증명 표 글자 그대로, spec-trace AC 이름 시험 52 → 60 · missing-test 58 그대로, biome 0 · build · check:deps 0 · bundle 0 · 비밀값 0, 키 없이 `--probe` 2 · `CI=true` 2 · `--dry-run` 0.
- 검토: `review-p05a.md`(rev-p05a · Opus · xhigh) Changes requested(C 0 · I 1 · M 4) — I-1 규격 파일이 깨진 시드에서 평가 · 배치 · 이야기 칸이 풀려 그림 보기가 영어 낱말로 샘 → fix 1(referenceErrors > 0 이면 2, 깨진 기록 파일은 부르기 전 실패, --file 확인, broken 사례, 주소 알림) → 재검토 `review-p05a-2.md` Approved(M 1 = N-1, 컨트롤러가 직접 고침, 00:5x). M-3(SDK 가 status enum 을 description 으로 옮김)은 관찰 항목 — H4 `--probe` · P8 첫 표본의 관찰표에 '규격 깨짐 status' 실패 수 칸.
- 남긴 것: [사람] 작업 7 — H4 뒤 요청자 터미널에서 `pnpm seed:check --probe`(호출 하나) 첫 줄을 컨트롤러에게(400 이면 위험 6 → 13절). 단가 고르기 · 비용 셈은 P9a `cost.ts` 가 합쳐지면 그것으로 바꾼다(plan-p09a '다른 P 에 넘길 것'). 커밋: 2c31bee(브랜치 `feature/1a-p05a-seed-check`, 8 파일, 요청자 지시 2026-10-17 00:5x "응 P5a 도 커밋해"). PR 은 H15 뒤. P5c 는 P5b 끝 + 이 커밋을 합친 위에서.
