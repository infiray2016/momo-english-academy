# 구현 보고: P4c 회화 · 평가 · 묶음 검사와 시드 검증 명령(implementer · Opus · high, P4 워크트리 이어 하기)

상태: DONE_WITH_CONCERNS. 아래 '설계와 다르게 한 것' 1 · 2(회화 문항 번호)와 '요청하는 변경'을 검토에서 확인해 주기 바란다.

- **명령 결과:**
  - 시험 159 통과(새 P4c 시험 40 + 의존 규칙 2).
  - lint · tsc · check:deps · build · check:bundle 은 오류 · 위반 0.
  - spec-trace missing-test 60 → 58.
  - 실기 넷: PR 0 · 완전성 1단계 0 · `--json` · seed/ 없음 2.
- **git 쓰기 0.** 작업 중에 컨트롤러가 P4a(c3f6baf) · P4b(f27ae15)를 커밋했다. 그래서 아래 'P4a · P4b 파일 변경'은 그 두 커밋에 이미 들어 있다(커밋 메시지에 적혀 있음). 이 보고 때의 미커밋 변경은 P4c 새 파일 아홉과 공용 변경 넷(package.json · ci.yml · .dependency-cruiser.cjs · dependency-rules.test.ts)이다.

## P4a · P4b 파일 변경(먼저 할 것 다섯 + 결정 C60)

| 항목 | 고친 곳 | 시험 |
|---|---|---|
| M-1 칸 검사 준비 가름 | `reference-index.ts`: `ReferenceIndex.ready`(settings 정합 통과 · settings · level-specs · unit-specs · vocab 있음). `check-lesson.ts` `checkLessonCell`: 준비가 안 됐으면 `reference-not-ready` 한 건만 내고 멈춘다. `expectedNewWords`: 배정표가 없으면 undefined 를 돌려줘 비교를 건너뛴다. P4c 의 `checkTalkCard` · 평가 검사도 같은 가름을 쓴다 | "6.3 수업 번호: …"에 사례 둘을 더했다. ① `seed.max_offband_ratio` 를 뺀 규격: `ready` false, 결과는 `reference-not-ready` 한 건뿐. ② `unit.regular_lessons.4-6` = 배정 수 − 1: 결과는 layout 오류 한 건뿐 |
| M-2 견본 형태 표 | builders `past-ed` 를 정규식에서 낱말 목록(jumped · looked · played · walked · liked · wanted)으로 바꿨다. `under the bed` 로 되돌렸다 | "6.4 학습 요소 범위: …"에 `I have a red hat.` 이 든 1단계 지문의 학습 요소 오류 0 을 더했다 |
| M-3 메시지 숫자 | '바른 답 문장이 없다(단계 규격 questions.modelAnswer)'로 고쳤다. 메시지를 한 번 훑어, 알파벳 단원 · 단계 범위에 박혀 있던 숫자도 `ALPHABET_UNIT` · `LEVEL_MIN` · `LEVEL_MAX` 에서 읽게 고쳤다(check-lesson · reference-index) | — |
| M-4 보이는 낱말 = 허용 정답 | `check-lesson.ts` `checkShownWord`: 베끼기 · 만들기 · 채우기 · 받아쓰기의 `word` 와 받아쓰기의 `audioText` 가 허용 정답 가운데 하나(소문자)인지 본다(`answer`) | "6.4 정답(쓰기 1~3단계): …"에 더한 사례: 베끼기 word 다름 → `…word`, 받아쓰기 audioText 다름 → `…audioText`, 같으면 통과 |
| WORD_BOX_MIN | `structure.ts` 상수 표로 옮겼다. 주석은 'plan-p04b 쓰기 guided · 3.3 쓰기 4~5단계' | 기존 시험 |
| C60 영어 값 | `TALK_SEGMENTS` 를 `greeting · today_words · practice · talk · more_talk · wrap_up` 으로, 그림 라이선스를 `cc0 · cc_by · generated` 로 바꿨다(reference.ts, 메시지 'cc_by 그림에 …'). 견본(builders 단계 규격 segments · 그림) · 시험 사례도 함께 고쳤다. 증명 표 시험 이름 'CC-BY 그림에 …'은 글자 그대로 두었다 | 기존 시험 |

P4c 를 위한 내보내기도 더했다.
- `check-lesson.ts`: `makeReport` · `Report` · `TextScope` · `checkTextFragments`(학습 요소 + 금지어를 자리 `scope` 로 받는다) · `checkAnswerNo` · `checkPictureWord` · `checkWritingItem`.
- builders: 회화 생성기 `talkCard(ref, place)` · `talkUnitCards`. 회화 견본의 `unitWords` 는 이제 회화 몫 role 로 채운다(unit-words-unlisted 경고 0). `talkLevelTest` 는 수업 질문과 겹치지 않는 장 질문 모음을 쓴다. 토리 이야기 둘째 문장은 'They play with it.'(1단계 상한 안)으로 고쳤다. `seedTreeFiles` · `miniSeed` 도 더했다.

`check-lesson.ts`(1028줄)는 영역별로 나누지 않았다. 구역이 갈려 있고, P4c 새 검사는 파일 넷(check-talk · check-assessment · check-cross · validate)으로 따로 두었다. 나누면 커밋된 P4b 파일을 다시 크게 흔들게 된다.

## 바뀐 파일:줄(P4c 새 파일, Biome 형식 뒤)

| 파일 | 줄 | 무엇 |
|---|---|---|
| `src/core/seed/check-talk.ts` | 1~779 | `TALK_ROLES` · `TALK_ALLOCATION_ROLES` · `checkTalkCard`(규칙 열넷 + 수업 공통) · `againSlots` · `checkTalkUnit`(talk-again-slots · talk-known-days) · `questionKey` |
| `src/core/seed/check-assessment.ts` | 1~802 | `lessonCorpus` · `checkLevelTestFile`(level-test-* · talk-test-*) · `checkPlacementFile` · `checkStoryFile` · `normalizeSentence` |
| `src/core/seed/check-cross.ts` | 1~537 | `checkTopicVariants` · `checkRemedialCoverage` · `checkRelations` · `unitStats` · `checkDistribution` · `checkCanDo` · `SeedWarning` |
| `src/core/seed/validate.ts` | 1~1039 | `canonicalJson` · `cellHash` · `itemsOf` · `solveTargets` · `solveStatus` · `expectedCells` · `validateSeed` · `exitCodeOf` · `SeedReport` |
| `scripts/seed-validate.ts` | 1~272 | `parseArgs` · `runValidate` · `readSeedTree` · `main` · `isDirectRun` |
| `tests/unit/seed-validator-talk.test.ts` | 1~282 | AC-15m 9 · 6.4 회화 4 |
| `tests/unit/seed-validator-complete.test.ts` | 1~492 | AC-7a 7 · 6.4 평가 · 배치 · 이야기 · 규격 완전성 6 |
| `tests/unit/seed-validator-distribution.test.ts` | 1~351 | AC-7d 5 · 묶음 · 관계 · can-do 4 |
| `tests/unit/seed-validate-cli.test.ts` | 1~198 | 명령 5(tsx 띄우기 3) |

## 공용 변경(plan '요청하는 공용 변경' 1~3, 이 워크트리에서 글자 그대로)

1. `package.json` scripts 에 `"seed:validate": "tsx scripts/seed-validate.ts"` 를 더했다.
2. `.github/workflows/ci.yml` 의 seed-validate 작업을 plan yaml 그대로 바꿨다. 준비 네 줄 뒤 단계 `if: ${{ hashFiles('seed/settings.json') != '' }}` 로 `pnpm seed:validate` 를 돈다(seed/ 가 없으면 단계를 건너뜀).
3. `.dependency-cruiser.cjs` 에 `core-no-io` 를 더했다. 규칙 꼴: from `^src/core/`, to `dependencyTypes: ["core"]` · path `^(node:)?(fs|fs/promises|child_process|http|https|http2|net)$`, `node:crypto` 는 허용.
   - `tests/unit/dependency-rules.test.ts` 에 고정 파일 넷과 시험 둘을 더했다: "의존 규칙: src/core 가 fs · https(node: 접두 있든 없든)를 가져오면 core-no-io 위반" · "의존 규칙: src/core 가 node:crypto 를 가져오는 것은 허용".
   - 확인한 사실: dependency-cruiser 18.6.0 은 `node:crypto` · `node:fs` 를 접두를 떼고 `crypto` · `fs`(dependencyTypes `core`)로 적는다. 임시 프로젝트에서 JSON 출력으로 확인했고 시험이 고정한다.
   - P2 · P3 워크트리와 합칠 때 같은 파일 충돌은 컨트롤러가 푼다.

## 설계와 다르게 한 것 · 해석한 것

1. **회화 평가 카드 장의 문항 번호(itemsOf)는 턴 차례로 했다.** plan 표는 '평가 · 배치 칸 = 1'이다. 그러나 5절은 'level_tests 의 문항 점수와 seed_reports 의 문항 번호는 회화 평가에서 (장, 턴)으로 적는다 … 한 문항은 한 턴'이라, 장 칸 안의 번호를 턴으로 두었다. 읽기 · 쓰기 · 말하기 평가 문항 칸과 배치 칸은 1 이다. 풀이 대상이 아니므로 seed/checks 에는 영향이 없다. **확인 바람**(P5 · P11 신고 번호).
2. **회화 카드의 인사(itemsOf).** 4단계부터 카드는 인사 질문이 없으므로 토리 첫 말(`greeting.firstLine`)을 문항 1 로 센다. 1~3단계는 인사 질문 차례대로 센다. plan '인사 → 대화 턴(또는 질문 목록) → 더 이야기할 거리'의 '인사'를 이렇게 풀었다.
3. **다시 묻는 턴 자리(talk-again-slots · talk-known-days)는 대화 턴만 센다.** 더 이야기할 거리는 목표 턴 밖이라 세지 않는다(3.2 '자리는 주제 변형마다 정규 수업만'). 4단계부터는 정할 것 ㅈ 대로 배정 카드에서 새 단어를 그 카드에서 처음 노리는 자리만 처음으로 본다.
4. **단원 단위 오류(talk-again-slots · talk-known-days · remedial-coverage)는 칸 키가 없다.** `--json` 의 `errors[].cell` 은 null, path 는 `variant.<변형>` 이다. P8 이 칸만 되돌릴 때 이 줄은 그 단원 전체를 다시 볼 일이다.
5. **보강 덮기는 그 변형의 보강 수업이 1~seed.remedial_per_unit 다 있을 때만 본다.** 덜 찬 변형은 완전성이 빈 칸으로 센다. `answerTargetWords` 는 변형 가운데 가장 적은 값이다.
6. **겹침 검사의 서명.**
   - `level-test-item-overlap`(수업 문항과 같은 질문 · 보기 묶음)은 질문이 있는 문항만 견준다: 읽기 · 듣기 · 그림 고르기 · 빈칸 · 문장 고치기 · 질문.
   - 타일 · 받아쓰기 · 작문 · 발표는 질문 · 보기 묶음이 없어 견주지 않는다.
   - `level-test-forms-overlap`(벌 사이)은 지문 · 질문 · 낱말 · 보기 · 카드 · 타일 전체 서명으로 견준다.
7. **토리 이야기의 학습 요소.** 형태는 `allowedForms('talk', 구간 첫 단계, 'story')`(구간 첫 단계 앞까지, 검토 메모)로, 문장 길이 상한은 그 구간 첫 단계의 회화 규격으로 본다. 영어 role 은 story · prompt · option 이다.
8. **`--areas` 는 완전성만이 아니라 검사 대상도 거른다.** 그 영역 밖 수업 · 평가 · 배치 파일과, 회화가 없으면 이야기 파일은 이 실행에서 보지 않는다. 규격 파일 정합 · 완전성은 늘 본다.
9. **`--json` 의 stats 줄에 `ranges`(단원 안 최소 · 최대)를 더했다.** plan '평균 · 최소 · 최대'를 담으려는 것이고, 있던 칸은 그대로라 version 1 을 유지했다(P8 확인 바람). P4b 칸 검사의 경고(`unit-words-unlisted`)는 id `<rule>:<칸 키>:<경로>` 로 낸다.
10. **꼭 있어야 하는 일곱 밖의 규격 파일**(model-prices · homophones · meta-sentences)이 없으면 종료 2 가 아니라 `reference-missing` 규격 파일 오류(종료 1)로 센다.
11. **PR 모드의 `completeThrough`** 는 settings 의 seed.complete_through_level 이다(빈 칸 수를 센 범위).
12. **miniSeed 는 지금 through 1 만 만든다**(그 밖이면 예외). 읽기 · 쓰기 · 말하기 생성기가 1단계 꼴(그림 고르기 · 베끼기 · 단어 답)뿐이다. `frame: 'default'` 는 받지만 오류 0 은 `'small'` 로만 시험했다.
13. **관계 경고의 '나옴'**은 보강 덮기와 같은 영어 role(지문 · 듣기 · 질문 · 보기 · 답 · 예문 · 힌트 · 토리 · 아이 말)로 센다. 회화 답 두 개(`pair`)는 세지 않는다.

## 요청하는 변경

- 위 1(회화 평가 장의 문항 번호 = 턴)을 plan-p04c itemsOf 행에 반영할지 컨트롤러가 정해 주기 바란다. P5 · P11 · 1-나 신고가 같은 번호를 쓴다.
- C60 으로 `TALK_SEGMENTS` 에 `more_talk` 가 들어왔지만, 견본 level_specs 의 회화 `segments` 는 3.3 토막 표 다섯(인사 · 오늘 쓸 말 · 말해 보기 · 대화 · 정리)만 쓴다. 더 이야기하기를 단계 규격 토막에 넣을지는 P6 브리프에서 정할 일이다.
- P6 · P8 에 넘길 것(재검토 범위 밖 관찰 포함):
  - 줄임말은 점까지 적는다.
  - 형태 표는 낱말 경계를 정확히 잡는다(견본은 낱말 목록으로 바꿨다).
  - Opus 캐시 단가 견본 값은 옮기지 않는다.

## 시험 이름 전부(증명 표 40개를 글자 그대로 대조함, 더한 이름은 의존 규칙 둘)

`tests/unit/seed-validator-talk.test.ts`(13):
- AC-15m 회화 1단계 카드: 인사 질문 수와 대화 턴 질문 수의 합이 목표 턴과 같으면 통과하고 하나 적으면 거부한다
- AC-15m 회화 배정 카드: 처음 묻는 턴이 대화 토막 뒤쪽 절반에 있으면 거부한다
- AC-15m 회화 카드: 글자가 같은 토리 질문이 세 번이면 거부한다
- AC-15m 회화 1단계 카드: 답 두 개가 같은 꼴 문장이 아니면 거부한다
- AC-15m 회화 3단계 카드: 영어 틀이 없는 턴을 거부한다
- AC-15m 회화 카드: 카탈로그에 없는 그림 키를 거부한다
- AC-15m 회화 카드: 토리 질문에 그 턴이 노리는 단원 단어가 있으면 거부한다
- AC-15m 회화 1단계 단원: 한 주제 변형 정규 카드의 다시 묻는 턴 자리가 단원 단어 수 × talk.said_ratio × talk.known_days 보다 적으면 거부한다
- AC-15m 회화 단원: 단원 단어 하나가 서로 다른 수업의 다시 묻는 턴에 talk.known_days 번 나오지 않으면 거부한다
- 6.4 회화 시나리오 카드: 4단계 질문 목록이 목표 턴 − 인사 턴 수보다 적거나 영어 힌트 단 수가 다르면 거부한다
- 6.4 회화 시나리오 카드: {NAME} 밖의 틀 자리 · 5단계 미션 수 어긋남 · 1~4단계 한국어 뜻 빠짐을 거부한다
- 6.4 어휘 배정(회화): 새 단어가 아이 차례의 힌트 · 답 예시 · 쓸 수 있는 말 · 목표 표현에 없으면 거부한다
- 6.4 회화 시나리오 카드: 더 이야기할 거리가 talk.more_talk_turns 턴이 아니거나 이 대화에서 묻지 않은 단어를 노리면 거부한다

`tests/unit/seed-validator-complete.test.ts`(13):
- AC-7a 완전성: 시험용 시드가 1단계까지 차 있고 풀이 검사를 통과하면 통과한다
- AC-7a 완전성: 칸 하나를 지우면 실패한다
- AC-7a 완전성: 사람 확인 목록에 칸이 남으면 실패한다
- AC-7a 단계 평가: 지문에 그 단계 수업 지문과 같은 문장이 있으면 거부한다
- AC-7a 단계 평가: 단원마다 문항 수가 level.test_items ÷ 단원 수가 아닌 벌을 거부한다
- AC-7a 회화 평가 카드: 장마다 단원별 턴이 level.test_items_per_session ÷ 단원 수가 아니면 거부한다
- AC-7a 회화 평가 카드: 수업 카드와 글자가 같은 질문이 4개인 장을 거부한다
- 6.4 단계 평가: 벌 사이에 같은 문항과 수업 문항과 같은 질문 · 보기 묶음을 거부한다
- 6.4 단계 평가: AI 과제 문항이 셋이거나 둘째 세션 끝이 아니면 거부한다
- 6.4 회화 평가 카드: 허용 답 둘 · 예 쪽만 있는 예 · 아니오 질문 · 장의 턴 수 어긋남을 거부한다
- 6.4 배치 평가: 범위 밖 문항 번호와 읽기 · 쓰기 예비 문항 · 듣기가 아닌 예비 문항을 거부하고 빠진 문항은 완전성에서 실패한다
- 6.3 토리 이야기: 구간마다 번호가 겹치거나 1~6단계 구간에 한국어 뜻이 없으면 거부한다
- 6.3 규격 파일 완전성: level_specs 48행 · unit_specs 240행과 알파벳 2행이 아니면 오류

`tests/unit/seed-validator-distribution.test.ts`(9):
- AC-7d 단계 분포: 같은 단계 단원 평균 지문 길이 차이가 규격 폭의 절반을 넘으면 경고를 내고 종료 코드는 0 이다
- AC-7d 단계 분포: 상한만 있는 지표는 상한의 20% 를 폭으로 본다
- AC-7d 풀이 검사: 앱 정답과 다르게 풀린 문항은 사람 확인 목록에 들고 PR 모드도 실패한다
- AC-7d 풀이 검사: 같은 해시의 사람 확인 '정답 맞음'이 있으면 통과하고 내용이 바뀌면 풀이 검사 안 됨이다
- AC-7d 시드 검증은 API 를 부르지 않는다: 명령의 가져오기 그래프에 @anthropic-ai/sdk · http 가 없고 fetch 가 없다
- 6.4 보강 덮기: 단원 단어가 보강 수업들에 seed.remedial_coverage 번 미만이면 거부하고 답하는 대상 단어 수를 보고한다
- 6.4 주제 변형: 같은 수업의 변형끼리 새 단어 · 분량이 다르면 거부한다
- 조사 P6 관계: 배정 전에 쓰인 단원 단어와 다지기에서 다시 안 나온 단원 단어를 경고한다
- 3.1 can-do: 단계 규격에 없는 숫자가 든 can-do 를 경고한다

`tests/unit/seed-validate-cli.test.ts`(5):
- AC-7a · AC-7d 명령: PR 모드는 빈 칸을 보고만 하고 0, --complete-through 1 은 빈 칸이 있으면 1
- AC-7a 명령: 검증 실패 칸이 있으면 1 이고 칸 · 규칙 · 파일을 한 줄씩 낸다
- 명령: 첫 줄 요약 꼴과 --json 보고 꼴
- 명령: 뿌리 폴더가 없거나 설정값 시드가 깨졌거나 모르는 인자면 2
- 명령: --areas 와 --complete-through settings

`tests/unit/dependency-rules.test.ts`(더함 2): 위 '공용 변경' 3.

시험은 먼저 썼고, 모듈 없음으로 실패하는 것을 본 뒤 구현했다(회화 → 완전성 · 분포 · 명령 차례). 시험 안의 수는 `defaultSettings()` · `settingNumber` · 단계 규격 견본 · structure.ts 상수에서 읽는다. tsx 를 띄우는 시험은 셋이다(`--json` 실기, 뿌리 없음, 모르는 인자).

## 명령과 출력(PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin)

- `pnpm lint`: Checked 50 files, No fixes applied
- `pnpm exec tsc --noEmit`: 오류 0
- `pnpm test`: Tests 159 passed(전 117 + P4c 40 + 의존 규칙 2)
- `pnpm check:deps`: ✔ no dependency violations found (22 modules, 64 dependencies cruised). core-no-io 를 더한 뒤 값이다
- `pnpm build`: Compiled successfully in 289ms, Finished TypeScript in 1427ms, 정적 3/3
- `pnpm check:bundle`: 파일 25 · static 10 · 화면 파일 15 · 서버 변수 이름 5 · 대조한 값 0 · 위반 0
- `pnpm spec:trace`: 15절 AC 116 · 증명 표 AC 67 · AC 이름 시험 52 · unknown-ac 0 · plan-ac-not-in-spec 0 · missing-test 58(60 → 58)
- **실기**(작업 6): `miniSeed({ areas: 넷, through: 1, frame: 'small' })` 를 `writeSeedTree` 로 `tests/.tmp/seed-real` 에 쓰고 돌렸다. 끝난 뒤 지웠다.
  - `pnpm -s seed:validate --root tests/.tmp/seed-real` → `seed-validate: 칸 172 · 통과 172 · 실패 0 · 빈 칸 500 · 풀이 검사 안 됨 0 · 사람 확인 0 · 경고 0 · 규격 파일 오류 0`, exit 0(PR 모드, 빈 칸은 settings 6단계까지라 보고만)
  - `… --complete-through 1` → `칸 172 · 통과 172 · 실패 0 · 빈 칸 0 · …`, exit 0
  - `… --complete-through 2` → `빈 칸 96`, exit 1
  - `… --complete-through 1 --json` → `{ "version": 1, "mode": "complete", "completeThrough": 1, "areas": [넷], "summary": { "cells": 172, "passed": 172, "failed": 0, "empty": 0, "unchecked": 0, "pendingHuman": 0, "warnings": 0, "referenceErrors": 0 }, "errors": [], "warnings": [], "empty": [], "unchecked": [], "pendingHuman": [], "stats": [{ "area": "reading", "level": 1, "unit": 0, … }] }`
  - `… --areas reading --complete-through 1 --stats` → `칸 41 · 통과 41 · …` 와 `통계 reading 1단계 단원 0 · 문장 낱말 1.58 · 지문 낱말 5.0 · 범위 밖 0.0% · 답하는 대상 단원 단어 2` 등, exit 0
  - 저장소에 seed/ 가 없을 때 `pnpm -s seed:validate` → stderr `seed-validate: 시드 뿌리 폴더가 없다: seed`, exit 2
- `tests/.tmp/` 에는 남긴 것이 없다.

## P5 · P7 · P8 이 쓸 것(validate.ts · 명령)

- `cellHash(칸 키, 칸 객체)`: sha256 16진, 입력은 `칸 키 + "\n" + canonicalJson(칸에서 맨 위 revision · correction · generation 을 뺀 것)`. `canonicalJson` 은 JSON 왕복(undefined 칸 빼기) 뒤 키 사전 순, 공백 없음.
  - 칸 객체는 수업 칸 = 수업, 평가 문항 칸 = 문항, 회화 평가 칸 = 장, 배치 칸 = 문항, 이야기 칸 = 이야기 하나.
- `itemsOf(SeedCell)` → `{ no, path }[]`(path 는 칸 객체 기준). 번호 규칙은 위 해석 1 · 2 와 plan 표를 따른다.
- `solveTargets(SeedCell)` → 풀이 대상 문항 번호.
  - 대상: 읽기 수업 전부, 쓰기 items 수업 전부, 말하기 수업의 듣기 번호, 평가 · 배치 문항 칸의 읽기 · 쓰기 앱 채점 · 듣기는 [1], 이야기 질문 전부.
  - 대상 아님(빈 목록): 회화 카드 · 회화 평가 장 · AI 과제 · 따라 말하기 · 질문.
- `solveStatus(SeedCell, CheckRecord?)` → `not-needed | unchecked | pending-human | passed`. `SeedCell` = `{ key, kind: 'lesson' | 'test-item' | 'talk-sheet' | 'placement' | 'story', area?, value }`.
- `--json` 꼴(version 1): plan 꼴 그대로이고, stats 줄에 `ranges` 를 더했다. `errors[].cell` 은 칸 오류면 칸 키, 파일 · 규격 · 단원 단위 오류면 null.
- 경고 id 꼴:
  - `distribution:<영역>:<단계>:<passage-words|sentence-words|offband-ratio>`
  - `relation-early-use:<칸 키>:<단어>`
  - `relation-not-reused:<영역>:<단계>:<단원>:<변형>:<단어>`
  - `can-do-numbers:<영역>:<단계>`
  - 칸 검사 경고는 `<rule>:<칸 키>:<경로>`.
- 명령 함수: `parseArgs` · `runValidate(args, files | null)` · `readSeedTree(root)`(prompts · manifest · reports 는 걷지 않고 .json 만 읽음) · `REQUIRED_FILES`.
- 견본: builders `miniSeed` · `seedTreeFiles` · `talkCard` · `talkUnitCards`.

## 남은 우려

- miniSeed 가 1단계까지만이라, 2단계 이상 꼴(읽기 지문 낱말 범위 · 쓰기 guided · 작문 · 말하기 발표)의 묶음 검사는 견본 단위 시험으로만 덮였다. 실시드(P6 · P8) 첫 묶음에서 시간 · 걸림을 재야 한다(plan 위험 1).
- 예 · 아니오 질문 판별(첫 낱말 YES_NO_AUXILIARIES + 물음표)은 어림이다(plan 위험 6).
- 관계 경고 둘(early-use · not-reused)은 견본에서 0건이다. P8 표본에서 한 번도 잡지 못하면 걷어낸다(plan 위험 10, 스킬 8단계).
- 회화 평가 장의 문항 번호(해석 1)는 plan 글자와 다르다. 확정 전에 P5 가 이 번호로 기록을 만들면 다시 맞춰야 한다.
- validate.ts 는 1039줄이다. 파일 읽기 없이 한 함수가 모든 파일 종류를 걷는다. 나눌지는 검토 판단에 맡긴다.
