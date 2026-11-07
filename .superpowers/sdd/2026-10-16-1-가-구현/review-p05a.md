Changes requested(C 0 · I 1 · M 4)

# 코드 검토: P5a 풀이 검사 명령(code-reviewer rev-p05a · Opus · xhigh, 2026-10-17)

대상은 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a0ffe8037fa827af6`(브랜치 `feature/1a-p05a-seed-check`, 바탕 6bd6015, 커밋 없음)다. 범위는 새 파일 다섯과 `package.json` scripts 한 줄이다. 코드 파일:줄은 이 워크트리 기준이고, plan · 정본 줄은 메인 저장소 기준이다. 첫 검토라 닫힌 장부는 없다.

확인 방법은 이렇다.
- 새 파일 다섯(solve-check.ts 749 · seed-check.ts 916 · fake-solver.ts 158 · 시험 둘)과 package.json diff 를 모두 읽었다.
- P4c 계약은 이름 붙일 위험이 있는 곳만 읽었다: validate.ts `solveStatus` · `collectCells` · `validateSeed`, 규격 lesson.ts · assessment.ts · records.ts · reference.ts, check-lesson.ts · check-assessment.ts 의 `reference-not-ready`, SDK 0.135.0 `client.js` · `lib/transform-json-schema.js`.
- 시험은 다시 돌리지 않았다(컨트롤러 재확인 180 통과). 시험 이름 21개는 plan 증명 표와 스크립트로 대조했다(빠짐 · 더함 0).
- 의심 셋은 스크래치패드의 tsx 스크립트로 재현했다(워크트리 파일은 고치지 않음): zodOutputFormat 결과 스키마, 규격 파일이 깨진 시드의 대상 칸, 그 상태로 `runCheck` 를 돌린 뒤 고친 시드의 대상 칸.

## 1. 설계 준수

| 갈래 | 판정 | 근거 |
|---|---|---|
| 빠진 것 | 하나 | 대상 칸 (2) '검증을 통과한 칸만'(plan '대상 칸' 110줄, 정본 6.4 풀이 검사 행 `specs/06-시드-생성.md` 104줄 '검증을 통과한 문항을')이 규격 파일 오류 때 지켜지지 않는다. I-1 |
| 넘친 것 | 해 없음 | 함수 표 밖 내보내기 여섯(다르게 한 것 3) · `authToken: null`(8) · 미리 보기 줄(5) · `--probe` 와 `--dry-run` 함께 거부(9). 모두 plan 취지 안이다 |
| 잘못 이해한 것 | 없음 | 판정 표 · 기록 · 명령 꼴 · 호출 설정 · 거절 처리가 plan 과 C62 (2) · (3) 그대로다 |

### 볼 것 1~11

| 번호 | 판정 | 근거 |
|---|---|---|
| 1 정답 샘 | 맞음(규격 파일이 멀쩡할 때) | 보기 만들기가 칸을 통째로 넘기지 않고 칸 이름을 하나씩 고른다(solve-check.ts:125~229 · 285~290). answerNo · accepted · explanationKo · glossary · preview · targetWords · unitWords · textKo · title · unit · dictation 의 word 가 들 길이 없다. build-tiles · fill-letters 의 word 도 뺐다(:148~165). 그림은 `그림: <뜻>`(:118~120). 사용자 메시지는 area · level · context · items 뿐이다(:317~324). 시험(solve-check.test.ts:378~447)은 견본 아홉 칸에서 금지 키 열여섯과 숨길 글 값을 실제로 훑는다. 다만 규격 파일이 깨지면 그림 보기가 영어 낱말로 나간다(I-1) |
| 2 판정 ↔ solveStatus | 맞음 | 견주기 `trim().toLowerCase()`(:447~449)가 validate.ts:275~277 · 303~305 와 같다. 후보는 listAlternatives 문항만, 빈 글 · 답 글과 같은 것 · 겹친 것을 대소문자 무시로 뺀다(:499~508). 거절은 대상 모두 none(:460~464, C62 (3)). 실패 갈래 넷(stop_reason · text 없음 · JSON · 규격, 번호 어긋남, SDK 예외)은 모두 `writeRecord` 앞에서 돌아간다(seed-check.ts:517~541) |
| 3 기록 | 맞음 | 해시는 `cellHash`(:308), 번호는 `itemsOf`(:264), 같은 해시 human 유지 · 다르면 뺌(:549~552), 칸 차례 + 옛 기록 뒤(:571~592), 쓰기 앞 다시 읽기 → `CheckFileSchema` 확인 → 임시 파일 → 이름 바꾸기(seed-check.ts:469~498 · 306~312). 같은 프로세스 안에서 읽기 · 쓰기가 동기라 동시 호출에서도 섞이지 않는다 |
| 4 대상 칸 | 어긋남 하나 | 거르기 · 해시 · `--force` · `--max-calls` 는 plan 대로다(:714~749, seed-check.ts:688~690). 사람 확인 칸은 validateSeed 가 errors 가 아닌 pendingHuman 에 두므로(validate.ts:1141~1147) 다음 실행에서 '건너뜀'이 되지 않는다. 규격 파일 오류 때는 I-1 |
| 5 명령 | 맞음 | CI 거부 → 키 없음 차례(seed-check.ts:265~283), 키 값 가림 세 겹(:538 · 756 · 811 · 892), 입력 확인 2(:414~455 · 141~251), 종료 0 · 1 · 2(:741), 첫 줄 꼴(:597~599)이 plan 139줄 글자 그대로, `--json` version 1 꼴이 plan 141줄 칸 그대로, `--probe` 는 파일을 쓰지 않는다(:765~816) |
| 6 호출 설정 | 맞음 | 상수 여섯이 plan 표 값 그대로(:72~82). 요청 본문은 model · max_tokens · thinking · output_config{effort, format} · system · messages 뿐이다(:850~857). `messages.create` 를 쓰고 parse 를 쓰지 않는다 |
| 7 의존 · 구조 | 맞음 | solve-check.ts 는 zod · 규격 타입 · structure · validate 만 가져오고 Date · process · node: 가 없다. SDK 값 가져오기는 scripts/seed-check.ts 하나다(다른 두 파일은 P4c 이전 시험의 글). `Solver` · `SolveMessage` 는 타입뿐인 구조 타입이라 core 에 두어도 의존 규칙에 닿지 않는다 |
| 8 시험 | 맞음, 덧 하나 | 이름 21 글자 그대로. 숫자는 견본(단가 행 · FAKE_USAGE · miniSeed)에서 읽는다. spawn 네 번 모두 `ANTHROPIC_API_KEY: ""`(seed-check-cli.test.ts:226~227 · 237 · 336~337 · 344~345). api-error · max_tokens · refusal · missing-item 은 명령 경로를 지난다(:470~537). 가짜 풀이의 broken 갈래는 쓰이지 않는다(M-4) |
| 9 다르게 한 것 | 아래 표 | 열하나 모두 받는다 |
| 10 우려 1 | 설계 변경 아님 | 아래 M-3 |
| 11 품질 | 덧 둘 | 빈 대상 · 동시성 8 상한 · 한국어 문구 · 영어 식별자 · 한국어 주석은 맞다. 기록 파일이 깨졌을 때의 차례(M-1)와 `--file` 확인(M-2) |

## 2. 잘한 점

- 문제 보기를 '빼기'가 아니라 '고르기'로 만들었다. 칸 객체를 복사해 정답 칸을 지우는 대신 문항 유형마다 보낼 칸을 하나씩 집어(solve-check.ts:125~229), 규격에 칸이 더해져도 정답이 저절로 새지 않는다.
- 실패 갈래가 모두 기록 쓰기 앞에서 끊긴다(seed-check.ts:517~541). 그래서 다음 실행이 그 칸만 다시 푸는 것을 시험이 실제로 보인다(seed-check-cli.test.ts:501~528).
- 기록 쓰기가 칸마다 '다시 읽기 → 그 칸만 바꾸기 → 규격 확인 → 임시 파일 → 이름 바꾸기'다(seed-check.ts:469~498). 위험 8 을 명령 쪽에서 닫았고, 실제 폴더 시험이 임시 파일이 남지 않음을 본다(seed-check-cli.test.ts:163~166).
- `authToken: null` 은 맞는 보완이다. SDK 0.135 는 authToken 이 undefined 일 때만 `ANTHROPIC_AUTH_TOKEN` 을 읽는다(`client.js` 118~119).
- 시험이 끝 상태를 P4c 의 `solveStatus` · `runValidate` 로 본다(solve-check.test.ts:228 · 296, seed-check-cli.test.ts:131 · 168 · 201~204). 위험 2(판정과 상태가 어긋남)를 실제로 덮는다.
- 키 가림을 시험이 키가 섞인 401 오류 글로 확인한다(seed-check-cli.test.ts:309~333).

## 3. 지적

### Critical
없음.

### Important

**I-1. 규격 파일이 깨진 시드에서도 평가 · 배치 · 이야기 칸을 풀고, 그림 보기가 영어 낱말로 나가며, 그 기록이 고친 뒤에도 남는다.**

- 무엇이: vocab · settings · 단계 규격 · 단원 규격 가운데 하나가 Zod 규격에 맞지 않으면 `index.ready` 가 거짓이다(reference-index.ts:516~521). 수업 칸은 `reference-not-ready` 를 칸 키로 내서 건너뛴다(check-lesson.ts:988~994). 평가 · 배치 · 이야기 파일은 같은 오류를 칸 키 없이 낸다(check-assessment.ts:289~296, `makeReport(out, file, undefined)`). `selectSolveTargets` 는 칸 키가 있는 오류만 건너뛰므로(solve-check.ts:720~722) 이 칸들이 대상이 된다. `prepare` 는 규격 파일이 있고 JSON 인지만 본다(seed-check.ts:424~433).
- 재현: miniSeed(넷 · through 1 · small, 기록 뺌)에서 vocab 항목 하나에 모르는 칸을 더해 strict 규격을 깼다.

```
vocab 깨짐 실행: 종료 1 | seed-check: 대상 83 · 푼 칸 83 · 통과 83 · 사람 확인 0 · 실패 0 · 건너뜀 68 · …
영어 낱말 그림 보기로 보낸 문항 46     (예: level-test:reading:1:1:1 → "그림: bubaba", "그림: bebaba", …)
vocab 고친 뒤 대상 68 [ lesson 68 ]     (평가 · 배치 · 이야기 83칸은 다시 풀리지 않는다)
```

- 왜: 6.4 '검증을 통과한 문항을'(정본 06 104줄)과 plan '대상 칸' (2)를 어긴다. 그 칸들은 칸 검사를 한 번도 받지 않았다. 그림 보기가 단어 id 로 나가는 것은 plan 위험 1 · 정할 것 마('영어 낱말을 주면 답이 드러난다')가 막으려던 바로 그 샘이다. 칸 해시는 vocab 을 담지 않으므로 vocab 을 고쳐도 기록이 그대로 '통과'로 남는다. CI 가 믿는 seed/checks 에 근거 없는 통과가 조용히 남는다. 종료 1 은 수업 칸 건너뜀 때문이라 이 문제를 알려 주지 않는다.
- 어떻게: `runCheck` 에서 `selectSolveTargets` 뒤(seed-check.ts:620~625) `picked.seed.referenceErrors > 0` 이면 입력 오류 2 로 끝낸다. 문구 예는 `규격 파일 오류 <n>건 — pnpm seed:validate 로 먼저 고친다` 다. seed:validate 도 규격 파일 오류를 늘 실패로 센다(validate.ts:1159~1176 · 1187~1188). 풀이 · `--dry-run` 둘 다 2 로 두는 편이 단순하다. 좁게 하려면 `!picked.seed.index.ready` 만 막는다. 시험 한 줄을 더한다: vocab 규격을 깨면 2 이고 풀이 함수 호출 0 · checks 쓰기 0. miniSeed 는 정상일 때 referenceErrors 가 0 이라 기존 시험은 그대로 돈다(재현 스크립트에서 확인).

### Minor

**M-1. 기록 파일이 깨졌으면 API 를 먼저 부르고 쓰기에서 실패한다.**
- 무엇이: `solveCell` 은 풀이 함수를 부른 뒤(seed-check.ts:517~518) `writeRecord` 에서 기록 파일이 JSON 이 아니거나 규격에 맞지 않음을 안다(:477~488). 그 내용 파일의 대상 칸 수만큼 호출 비용을 쓰고 모두 실패하며, 다음 실행도 같다. 깨진 checks 파일은 collectCells 에서 칸 키 없는 오류라(validate.ts:720~737 · 965~970) 대상 고르기에서 걸러지지 않는다.
- 어떻게: 대상을 정한 뒤 부르기 전에 대상 칸의 checks 파일을 한 번씩 읽어 보고, 깨졌으면 그 칸들을 실패(까닭 '기록 파일이 …')로 두고 부르지 않는다. 덮어쓰지 않는 지금 규칙(보고 '알릴 것' 5)은 그대로 둔다.

**M-2. `--file` 이 시드에 없는 파일이거나 `--areas` 와 어긋나도 대상 0 · 종료 0 이다.**
- 무엇이: `parseArgs` 는 꼴만 본다(seed-check.ts:199~208). 거르기는 `cell.file !== options.file` 이면 넘긴다(solve-check.ts:735). `lessons/reading/4/2.json` 을 잘못 쳐도 '대상 0' 성공으로 끝난다.
- 어떻게: `runCheck` 에서 `args.file` 이 `deps.files` 에 없으면 입력 오류 2 로 끝낸다. plan 입력 확인 줄('`--file` 이 내용 파일 경로가 아님')의 취지와 같다. `--areas` 와 어긋나는 것도 같은 줄에서 함께 막을 수 있다.

**M-3. 우려 1: SDK 가 status 의 enum 을 API 에 싣지 않는다. 설계 변경은 아니고 관찰 항목이다.**
- 확인: SDK 0.135.0 `lib/transform-json-schema.js` 42~113줄은 type · anyOf · description · title · properties · required · 일부 format · items · minItems 0/1 만 남기고, 나머지(enum · const · minimum)를 description 글로 옮긴다. 실제 결과는 `"status":{"type":"string","description":"{enum: [\"one\",\"multiple\",\"none\"]}"}` 다. plan 확인한 사실 2('제약은 SDK 가 지워 설명으로 옮기며 검증은 클라이언트가 한다')와 같은 갈래다.
- 막는 것: 지시문이 세 값을 적는다(solve-check.ts:353~355). 다른 값은 `SolveOutputSchema.safeParse` 실패로 '규격 깨짐' 실패가 되어 기록을 쓰지 않고 다음 실행이 다시 푼다(:425~435). 틀린 기록이 남는 길은 없다.
- 할 일: 작업 7(H4 `--probe`)과 P8 첫 표본의 관찰표에 '응답이 규격에 맞지 않는다: …status' 실패 수를 한 칸 둔다. 잦으면 그때 `output_config.format` 에 손으로 쓴 JSON 스키마(enum 포함)를 넘길지 컨트롤러가 정한다. 지금 코드는 고치지 않는다.

**M-4. 가짜 풀이의 broken 갈래를 쓰는 시험이 없다.**
- 무엇이: fake-solver.ts:147~148 의 broken 은 어느 시험도 쓰지 않는다. '규격 깨짐' 갈래 자체는 단위 시험이 덮는다(solve-check.test.ts:545~547). 명령 경로에서는 max_tokens 와 같은 `answer.kind === "failed"` 가지를 지나므로 빈 곳은 작다.
- 어떻게: '풀지 못한 칸이 있으면 1' 시험(seed-check-cli.test.ts:470~537)의 다섯째 칸에 broken 을 더하거나, P5c 가 쓸 것이면 그대로 둔다. 어느 쪽이든 브리프 볼 것 8 의 '각 갈래를 실제로 지나는지'는 지금도 단위 시험으로 채워진다.

## '계획과 다르게 한 것' 1~11 판정

| 번호 | 판정 | 근거 · 덧 |
|---|---|---|
| 1 store 주입 · 칸마다 다시 읽기 | 받음 | plan '기록' 105줄과 위험 8 을 지킨다. 실제 폴더 시험 하나가 `fileStore` 를 덮는다 |
| 2 Solver · SolveMessage 타입을 core 에 | 받음 | 타입뿐이고 SDK 를 가져오지 않는다. plan 함수 표가 `interpretSolveMessage` 를 구조 타입으로 core 에 두었으므로 같은 자리다. fixture 가 스크립트를 가져오지 않게 된다 |
| 3 표 밖 내보내기 여섯 | 받음 | 모두 시험 · 명령이 쓴다. `valueAt` 은 validate.ts 의 비공개 `acceptedOf` 경로 걷기와 겹치지만 둘 다 `itemsOf` path 를 따르므로 어긋날 위험은 작다 |
| 4 건너뜀 셈 | 받음 | plan 110줄 '검증에 걸린 칸은 건너뜀으로 센다' 그대로다. 해시가 그대로여도 세어 종료 1 이 되는 것은 seed:validate 도 그 칸으로 실패하므로 맞다 |
| 5 dry-run 미리 보기 줄 | 받음 | plan 125줄 '문항 수'를 사람 출력에 싣는다. JSON 꼴은 그대로다. 덧: dry-run 의 `summary.costUsd` 와 첫 줄 '비용'은 쓴 돈이 아니라 어림이다. P8 브리프에 'mode 가 dry-run 이면 costUsd 는 어림'을 한 줄 적는다 |
| 6 실패 호출 토큰 세기 | 받음 | 낸 토큰은 과금된다(plan 확인한 사실 2). 기록에는 들어가지 않고 요약에만 든다. SDK 예외는 호출 1 · 토큰 0 이다. 재시도 안의 호출은 SDK 가 숨기므로 셀 수 없다 |
| 7 실패 까닭에 API 글 300자 | 받음 | 위험 6(400)을 `--probe` 첫 줄에서 바로 보게 한다. 가림은 까닭을 만들 때(seed-check.ts:339 · 538) · 줄을 낼 때(:756 · 811) · 출력할 때(:892) 세 번이다. 키 꼴이 아닌 자리 값으로 시험한다 |
| 8 authToken: null | 받음 | `client.js` 118~119 로 확인했다. 범위 밖 관찰 1 을 함께 본다 |
| 9 probe 종료 규칙 | 받음 | 호출 · 읽기가 되면 판단이 다르거나 거절이어도 0, API 오류 · 응답 실패는 1 이다. 작업 7 의 목적(조합 · 응답 꼴 확인)과 맞다. 덧: `--probe` 와 함께 온 `--json` · 거르기 인자는 말없이 무시된다(:765~775). 고칠 필요는 없다 |
| 10 인자 범위 · levels JSON 꼴 · 남음 줄 | 받음 | plan 124줄 1~8. `filter.levels` 가 `{ min, max }` 인 것은 P8 브리프에 적는다 |
| 11 지시문 한국어 | 받음 | plan '지시문' 규칙 1~6 이 모두 들어 있다(solve-check.ts:350~358: 1 → 350 · 352, 2 → 353, 3 → 354, 4 → 355, 5 → 357, 6 → 358). 더한 두 줄(task 별 답 꼴 · listen 은 듣기만)은 규칙과 부딪치지 않는다. 지시문을 고친 뒤 다시 풀기는 정할 것 카대로 컨트롤러가 정한다 |

## 범위 밖 관찰

1. SDK 는 `ANTHROPIC_BASE_URL` 도 환경에서 읽는다(`client.js` 102줄). 요청자 셸에 이 값이 있으면 개발용 키가 그 주소로 간다. plan 위험 5('엉뚱한 자격 증명 · 워크스페이스') 취지와 닿는다. H4 안내에 '이 변수가 없는 셸에서 돌린다'를 한 줄 두거나 `--probe` 첫 줄에 호출 호스트를 싣는 길이 있다. 컨트롤러 판단이다.
2. 위험 11(지시문 판이 기록에 없음)은 plan 대로 남아 있다. 지시문을 고치는 커밋에서 `--force` 여부를 정하는 일이 P8 브리프에 들어가야 한다.

## 4. 판정

Changes requested. I-1 하나를 고치고 시험 한 줄을 더하면 Approved 로 본다. M-1 · M-2 는 같은 fix 라운드에서 함께 고치기를 권한다. M-3 은 관찰표 항목이고, M-4 는 선택이다.
