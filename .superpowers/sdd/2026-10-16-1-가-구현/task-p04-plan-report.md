# 보고: P4 하위 plan 작성(시드 규격 · 검증기 · 어휘 배정)

계획자(general-purpose · Opus) · 2026-10-16 · 바탕 08cce00 · 브리프 `task-p04-plan.md` · 코드 · 설치 명령 없음, 저장소에서 고친 파일은 아래 넷뿐

## 요지

- P4 를 셋으로 나눴다(a 규격 · 글 도구 10파일 · b 어휘 배정 · 칸 검사 9파일 · c 회화 · 평가 · 묶음 검사 · 명령 10파일, 모두 작업 8, a → b → c 차례). 브리프는 둘을 예상했지만 둘이면 뒤 plan 이 18파일이 된다(정할 것 ㄱ).
- 단계마다 다른 규칙(3.3 의 수, '1~2단계 허용 답 셋 이상' 같은 6.3 의 단계 경계)은 level_specs 칸으로, 단원 틀 수는 12절 키 45개에서 읽는다. 키가 없는 꼴 수는 `structure.ts` 한 파일에 정본 절과 함께 모았다(정할 것 ㄷ).
- 정본 빈칸 넷을 찾았다. 글로서리 규칙의 '기능어' 정의가 없음(ㄴ), 알파벳 단원의 수업 수 · 배정(ㅂ), 3.6 '이번 단원의 요소만'의 글자 그대로 풀이(ㅅ), 1-가 개발용 적재의 완전성 범위가 C50 (4)와 부딪침(ㅇ).
- 확인한 사실: zod 최신 4.6.7(설치 판과 같음), SDK 0.135.0 은 zod `^3.25 || ^4` 를 받고 `helpers/zod` 가 `zod/v4` 의 `toJSONSchema` 를 쓴다. 시드 규격은 API 로 보내지 않으므로 structured outputs 한도와 무관하고, 6.2 회화 턴 출력과 나눌 조각만 변환 · 재귀 없이 둔다.
- 브리프의 '6.5 호출 출력'은 6.5 가 지워진 절('배치 흐름')이라 6.2 로 읽었다.
- 공용 변경 요청은 `package.json` 한 줄과 `ci.yml` 의 seed-validate 작업이다(c 끝에 컨트롤러가 합침).
- 같이 쓰인 P3a 초안을 읽고 수업 종류 · 다시 묻는 턴 · 판(정수 둘) 값을 그쪽에 맞췄다. vocab id · 배치 벌 · 주제 변형의 꼴 셋이 아직 다르다(정할 것 ㅁ).

## 쓴 파일

| 파일 | 줄 | 무엇 |
|---|---|---|
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p04a-규격.md` | 약 385 | 규격(Zod) · 글 도구 · 시험용 시드 만들기 함수. 세 plan 공통 사실(시드 배치 · 영어 값 · 칸 키 · 규격 칸 · 상수 · 정할 것 ㄱ~ㅍ · 확인한 사실) |
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p04b-배정-칸-검사.md` | 약 150 | 어휘 배정 · 3.2 관계 표 · 규격 파일 정합 · 읽기 · 쓰기 · 말하기 칸 검사. AC-3a · 3b · 5b · 5g · 5h · 7c |
| `intent/2026-10-15-모모-잉글리시-아카데미/plan-p04c-묶음-검사-명령.md` | 약 250 | 회화 카드 · 평가 · 묶음 검사 · 관계 경고 · 분포 경고 · 풀이 검사 상태 · 완전성 · `pnpm seed:validate`. AC-7a · 7d(+ 1-나 AC-15m 단위 몫) |
| `.superpowers/sdd/2026-10-16-1-가-구현/task-p04-plan-report.md` | 이 파일 | 보고 |

세 plan 은 머리에서 서로를 가리킨다. 상태는 모두 draft 다.

## 브리프의 '꼭 확인할 사실'에 대한 답

| 물음 | 답 | 출처 · 판(2026-10-16) |
|---|---|---|
| Zod 최신 안정판 | 4.6.7(dist-tag latest). 저장소 설치 판과 같다 | `npm view zod version` · `npm view zod dist-tags` · `package.json` |
| SDK 의 Zod 지원 판 | `@anthropic-ai/sdk` 0.135.0(최신 = 설치 판)의 peer 는 `zod ^3.25.0 \|\| ^4.0.0`(선택 peer). `helpers/zod` 의 `zodOutputFormat()` 이 `zod/v4` 를 가져와 `z.toJSONSchema(…, { reused: 'ref' })` → `transformJSONSchema` 로 보내고, 받은 응답을 원래 스키마로 `safeParse` 한다 | `npm view @anthropic-ai/sdk@0.135.0 peerDependencies peerDependenciesMeta` · `node_modules/@anthropic-ai/sdk/helpers/zod.mjs` · `lib/transform-json-schema.mjs` |
| 같은 Zod 를 6.2 호출 규격과 쓸 수 있나 | 쓸 수 있다(같은 zod 4). 다만 structured outputs 는 재귀 · 수 제약 · 길이 제약을 받지 않고(SDK 가 설명 글로 옮기고 응답 때 검증), `minItems` 는 0 · 1 만, 선택 매개변수 24 · anyOf 매개변수 16 한도다. 시드 규격은 API 로 보내지 않으므로(개발 때 Claude Code 세션이 파일로 씀) 이 한도와 무관하다. 나눌 후보는 1-나 회화 턴 출력의 1~3단계 '더 이야기할 거리' 꼴과 4~9단계 힌트 단 꼴뿐이고, 그 조각은 변환 · 재귀 없이 둔다(P4a 위험 9) | https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md · https://zod.dev/json-schema |
| 시드 파일 꼴 | 5절이 정한 것은 `seed/settings.json` 과 `seed/lessons/<영역>/<단계>/<단원>.json`(영역 · 단계 · 단원마다 한 파일)이다. 나머지(level-specs · unit-specs · vocab · images · model-prices · lists 넷 · level-tests · placement · stories · checks · reviews)는 묶음 plan seed/ 행을 따라 이름을 정했다(제안). 폴더 이름은 영어 ASCII(한글 경로 NFC 문제 없음) | `specs/04-데이터.md` 7 · 9줄 · 묶음 plan 43줄 |
| CLI 종료 코드 규약 | P1b 와 같다. 0 통과(경고 있어도) · 1 위반 · 2 입력 오류. 순수 함수 `runValidate` → `{ code, lines }` 를 내보내고 직접 실행 판별 뒤 `process.exitCode = main()` | `scripts/spec-trace.ts` · `scripts/check-bundle.ts`(cf97f62) |
| 완전성 수의 출처 | 영역 4(3.1 영역 표) · 단계 12(3.1) · 단계마다 단원 5(3.2 단위 표, 137줄 '단원 수는 5개로 같게') · can-do 48(3.1 31줄 '영역 × 단계 48개') · level_specs 48행 · unit_specs 240행과 알파벳 2행(5절). 12절 키는 없다. 단원 안 칸 수는 12절 키(unit.regular_lessons · seed.remedial_per_unit · seed.topic_variants, 쓰기 6단계 이상은 level_specs)에서, 평가는 level.test_items · level.test_forms · level.test_items_per_session, 배치는 placement.items_per_level 에서 나온다. 단원별 평가 문항 4 · 회화 장마다 단원별 턴 2 는 키 ÷ 단원 수로 셈하고 코드에 두지 않는다 | `specs/02-1-영역-단원-승급.md` · `specs/04-데이터.md` · `specs/06-시드-생성.md` · `specs/09-설정값.md` |

## 그 밖에 확인한 사실

| 사실 | 출처 · 판 |
|---|---|
| Zod 4 의 `transform` · `date` · `bigint` · `map` · `set` · `custom` 은 JSON 스키마로 못 바꾸고 기본으로 예외를 던진다 | https://zod.dev/json-schema |
| Zod 4 API `z.strictObject` · `z.discriminatedUnion(키, 갈래)` · `.refine` · `.superRefine` · `z.int()` · `z.literal([…])`, 오류 꼴 `z.prettifyError` · `z.treeifyError` · `z.flattenError` | https://zod.dev/api · https://zod.dev/error-formatting |
| tsx 최신 4.23.15 = 설치 판 | `npm view tsx version` |
| 6.5 는 '배치 흐름'으로 지워진 절 | `specs/05-AI-호출.md` 66~68줄 |
| 9절 시드 검증: 실패 · 사람 확인이 남으면 CI 실패, 빈 칸으로 막는 완전성은 main 과 개발용 적재에서만 | `specs/08-테스트와-기술.md` 16줄 |
| 11절 (4-1): 개발용 적재는 seed.complete_through_level 을 작업 입력으로 덮어 그 값까지 완전성을 본다 | `specs/08-테스트와-기술.md` 48줄 |
| GitHub Actions `hashFiles()` 는 맞는 파일이 없으면 빈 글, 단계 `if` 에서만 쓸 수 있다(작업 `if` 는 안 됨) | https://docs.github.com/en/actions/reference/workflows-and-actions/expressions · …/contexts |
| tsconfig target ES2017 · lib esnext, Biome 범위는 `**` 에서 docs · specs · intent · .superpowers 만 뺀다(seed/ 가 들어감) | `tsconfig.json` · `biome.json` |
| 의존 규칙 `check:deps` 는 `src` 만 본다(`scripts/` 는 대상 밖). `src/core` 에서 zod 는 허용 | `package.json` · `.dependency-cruiser.cjs` |

## (추측)으로 둔 것

- Zod 4 의 ISO 날짜 꼴 함수 이름(`z.iso.date()` · `z.iso.datetime()`). 구현자가 설치 판에서 확인한다.
- Zod 4 의 `.refine` 은 JSON 스키마에 나타나지 않고 `safeParse` 때만 돈다(문서에 언급 없음. SDK 는 응답 때 `safeParse` 하므로 그때는 돈다).
- TypeScript 5.9 가 target ES2017 에서 정규식 리터럴의 ES2018 문법을 오류로 볼 수 있다. 그래서 한글은 문자 범위로 쓴다.
- 큰 판별 유니언의 타입 추론이 `next build` 를 느리게 할 수 있다.
- Biome 2 가 seed/ 의 생성 JSON 을 `biome ci` 꼴 검사에 걸 수 있다(정할 것 ㅌ).
- 시드 전체 크기 · 검증 시간(수업 칸 약 7,600 · 평가 칸 약 2,200, 수십 MB). 표본(P8)에서 잰다.
- dependency-cruiser 가 `node:` 붙은 내장 모듈을 어떤 경로로 적는지(선택 공용 변경 3).
- 1~3단계 카드 '앞쪽 절반'을 가운데 턴까지(⌈n ÷ 2⌉)로 푼 것, 예 · 아니오 질문을 조동사 목록으로 가르는 것, 줄바꿈을 문장 끝으로 보는 것은 (제안)이다.

## 묶음 plan 과 다르게 한 것

1. 하위 plan 을 둘이 아니라 셋으로 나눴다(파일 수, 정할 것 ㄱ). 이름은 `plan-p04a-규격.md` · `plan-p04b-배정-칸-검사.md` · `plan-p04c-묶음-검사-명령.md`, 브랜치 `feature/1a-p04a-seed-spec` · `feature/1a-p04b-seed-checks` · `feature/1a-p04c-seed-validate`(차례로 앞 브랜치 끝에서, P4 워크트리 하나).
2. 배정표 P4 행과 브리프의 AC 목록에는 AC-5b 가 없지만 묶음 plan 증명 표의 AC-5b 행이 P4 · P11 을 가리켜, 단위 몫(1 · 6 · 10단계 분량 · 5~8단계 대화 활동 없음)을 b 에 넣었다.
3. 회화 카드 검사 시험 이름에 1-나 AC-15m 을 썼다(1-나 AC 의 단위 몫을 1-가에서 먼저 덮음, 정할 것 ㅍ).
4. 글 도구(`text.ts`)를 P4 파일 묶음 `src/core/seed/` 안에 두고 6.4 끝 문단 실시간 출력 검사(P9 · 1-나)가 다시 쓰게 했다.
5. 시험용 시드를 JSON 파일 묶음 대신 만들기 함수 한 파일(`tests/fixtures/seed/builders.ts`)로 두고, 시험이 실행 때 `tests/.tmp/` 에 시드 나무를 쓴다. P5 · P7 도 같은 함수를 쓴다.
6. 조사 P6 의 관계 셋 가운데 '두 단원에 든 단어'는 3.4 규칙('영역마다 한 단원에서만')과 겹쳐 오류로 올렸고(영역 안만), '어느 수업에서도 닿지 않는 단어'는 6.4 어휘 배정 오류가 이미 잡으므로 남는 몫('다지기에서 다시 안 나옴')만 경고로 뒀다(정할 것 ㄹ).
7. 명령 옵션에 `--root` · `--areas` · `--json` · `--stats` 와 `--complete-through settings` 를 더했다(묶음 plan 은 `--complete-through <n>` 만).
8. CI seed-validate 작업은 seed/settings.json 이 생길 때(P6)부터 검증 단계가 실제로 돈다(`hashFiles` 조건).
9. 브리프의 '6.5 호출 출력과 공유하는 규격'은 6.2 로 읽었다(6.5 는 지워진 절).
10. 시험 파일 이름: 묶음 plan 의 다섯(`seed-validator-reading · image · speaking · complete · distribution`) · `vocab-allocate` 에 더해 `seed-schema` · `seed-text` · `seed-validator-writing` · `seed-validator-talk` · `seed-validate-cli` 를 둔다.

## 컨트롤러가 정할 것(P4a '정할 것'과 같은 번호)

| 번호 | 무엇 | 권함 | 13절 한 줄 |
|---|---|---|---|
| ㄱ | 셋으로 나누기 | 셋, a → b → c 차례 | 아니오(묶음 plan 배정표 P4 행만 고침) |
| ㄴ | 기능어 정의. 6.4 글로서리 규칙의 '기능어' 목록이 없고, vocab 품사 값은 여섯만 적혀 있다. 범위 밖 비율을 세려면 기능어도 vocab 에 단계와 함께 있어야 한다 | vocab 품사 목록에 `function`(기능어) 값을 더하고 틀 자리 품사는 여섯 그대로 | 예 |
| ㄷ | 12절 키 없는 수 | 단계마다 다른 규칙은 level_specs 칸(P6 이 3.3 · 6.3 에서 옮김), 꼴 · 구조 수는 `structure.ts` 한 파일(정본 절 주석). P7 check-ids 는 이 파일을 허용 목록으로 | 권함(원칙) |
| ㄹ | 6.4 표 밖의 오류(규격 파일 정합 · 수업 겉 정합 · 카드 · 타일로 정답 만들기), 조사 P6 의 셋 가운데 하나 오류 · 둘 경고, can-do 숫자 경고 | 이대로 | 아니오(정본 규칙을 검사로 옮김) |
| ㅁ | 영어 값을 P3 DB 열 값과 맞추기. 수업 종류(`assigned` · `reinforce` · `remedial` · `alphabet` · `tori_story`) · 처음 · 다시 묻는 턴(`first` · `re_ask`) · 판(정수 `revision` · `correction`)은 P3a 초안에 맞췄다. 남은 차이 셋: vocab id(P3a `id` · `word` 따로, P4 `word` 가 id) · 배치 벌(P3a 글 '가' · '나', P4 정수) · 주제 변형(P3a 글, P4 정수) | 컨트롤러가 셋을 하나로 정함(P4 는 규격 칸 하나씩) | 아니오 |
| ㅂ | 알파벳 · 소리 단원의 수업 수 · 배정 | 1~3 구간 틀(정규 10 · 보강 3 · 변형 2)에 종류 `alphabet`, 배정 함수를 단원 0 어휘에 그대로, 단원 0 어휘 수는 unit.vocab_count 를 보지 않음 | 예 |
| ㅅ | 3.6 '이전 단계까지와 이번 단원의 요소만' | 글자 그대로 짜고, 표본에서 걸림이 많으면 '같은 단계 앞 단원까지'로 넓힘. 평가 · 배치는 그 단계까지, 토리 이야기는 구간 첫 단계 앞까지(제안) | 넓힐 때 예 |
| ㅇ | 1-가 개발용 적재의 완전성 범위(11절 (4-1) 대 C50 (4): 회화 · 이야기 없음, 단계 평가 1벌 이상 대 level.test_forms 3) | P4 는 `--areas` 만 준다. P7 계획 때 범위를 정함 | 예(P7 때) |
| ㅈ | 회화 '다시 묻는 턴' 세기 | 6.4 글자대로(주제 변형마다 정규 카드, 다시 묻는 턴만). 4단계부터는 배정표로 처음 · 다시를 정함 | 기록 권함 |
| ㅊ | 배치 말하기 예비 문항 수(키 없음) | placement.items_per_level 과 같은 수 | 기록 권함 |
| ㅋ | 풀이 검사 기록 꼴 · 칸 해시 · 문항 번호 · 풀이 대상 | P4 가 정하고 P5 브리프에 그대로 | 아니오 |
| ㅌ | seed/ JSON 과 Biome | P6 착수 전에 `biome.json` 에 `!seed/**/*.json` | 아니오(설정) |
| ㅍ | AC-15m(1-나) 이름을 1-가 시험에 씀 | 이대로, 1-나 묶음 plan 증명 표에 Playwright 몫을 따로 적음 | 아니오 |

## 요청하는 공용 변경(c 의 작업 6 뒤 컨트롤러가 합침)

1. `package.json` scripts: `"seed:validate": "tsx scripts/seed-validate.ts"`.
2. `.github/workflows/ci.yml` 의 seed-validate 자리 작업을 준비 네 줄 + 단계 `if: ${{ hashFiles('seed/settings.json') != '' }}` 의 `pnpm seed:validate` 로 바꾼다(전문은 plan-p04c '요청하는 공용 변경').
3. (선택) `.dependency-cruiser.cjs` 에 `src/core` 의 파일 · 네트워크 모듈 금지 규칙과 P1b 의존 규칙 시험 두 줄. 권함: P1c 와 함께.

`vitest.config.mts` · `playwright.config.ts` · `.env.example` 은 바꾸지 않는다(시험은 모두 `tests/unit`, 환경 변수 없음).

## 다른 P 에 넘길 것

| P | 넘길 것 |
|---|---|
| P3 | P4a '영어 값' 표. 종류 · 묻는 턴 · 판은 P3a 초안 값 그대로이고, vocab id · 배치 벌 · 주제 변형 꼴 셋은 정할 것 ㅁ 의 결정을 따라 한쪽이 고친다. 칸 키 꼴은 P4a 표 |
| P5 | 기록 꼴(P4a records), `cellHash` · `itemsOf` · `solveTargets`(P4c validate.ts)를 그대로 쓴다. 정답 번호는 1부터. seed/checks 파일 배치는 P4a '시드 파일 배치' |
| P6 | level_specs 칸(3.3 · 6.3 의 단계 규칙을 줄마다 옮김, design-reviewer 대조), vocab 활용형에 불규칙형 · 축약형, 기능어 품사(ㄴ 결정 뒤), 형태 표 · 금지어 정규식(`iu`, ES2018 문법 피함), Biome 범위(ㅌ). 완료 판정 '규격 파일 검증 오류 0' 은 `pnpm seed:validate` 의 규격 파일 정합 · 완전성(48 · 242행) |
| P7 | `checkFrameRelations`(설정값 시드 적재의 3.2 관계 검사), 칸 키 만들기 · 풀기(`structure.ts`), main 은 `pnpm seed:validate --complete-through settings`, dev-load 범위(ㅇ) |
| P8 | `--json` 보고(`version: 1`, `errors[].cell` 로 실패 칸만 되돌림), 분포 경고 id `distribution:<영역>:<단계>:<지표>`, 생성 브리프에 규격 표를 옮김 |
| P9 · 1-나 | 글 도구(`splitSentences` · `sentenceWords` · `formsIn` · `forbiddenHits` · `placeholdersIn`)를 실시간 출력 검사에 다시 씀. 회화 턴 출력과 규격 조각을 나눌지는 structured outputs 한도(선택 24 · anyOf 16)를 보고 정함. 축약형 펼치기를 P2 일치율과 합칠지(P4a 위험 7) |
| P11 · 1-나 | 신고 '문항 번호'는 `itemsOf` 번호. 정답 번호는 1부터 |
