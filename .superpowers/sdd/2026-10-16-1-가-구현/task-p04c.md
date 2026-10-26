# 브리프: P4c 회화 · 평가 · 묶음 검사와 시드 검증 명령(implementer impl-p04a · Opus · high, 같은 워크트리 이어 하기)

plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p04c-묶음-검사-명령.md`(approved 15:5x, 20:4x 에 명령 꼴 · 공용 변경 방식 고침)를 구현한다. plan 이 유일한 설계이고 이 브리프는 범위 · 허용 파일 · 명령 · 보고 자리를 정한다. P4a · P4b 가 끝난 같은 워크트리(브랜치 `feature/1a-p04a-seed-spec`)에서 그 코드는 그대로 두고 쌓는다. 메인 저장소의 plan 파일을 읽는다(워크트리 사본은 옛 판): `/Users/hikaru/workspace/momo-english-academy/intent/2026-10-15-모모-잉글리시-아카데미/`.

## 먼저 할 것(P4b 검토 `review-p04b.md` 의 Minor 넷 + 결정 하나)
1. **M-1** `check-lesson.ts`(:503 · :673 · :241~249): 규격 파일이 일부 깨졌을 때 칸 검사가 예외를 던지지 않게 한다. `buildReferenceIndex` 결과에 칸 검사를 돌릴 수 있는지(settings 정합 통과 여부)를 내보내고, `checkLessonCell` 은 준비가 안 됐으면 `layout`(또는 새 규칙 `reference-not-ready`) 오류 한 건만 내고 멈춘다. `expectedNewWords` 는 배정표가 없으면 비교를 건너뛴다. 시험: settings.json 에서 `seed.max_offband_ratio` 를 뺀 규격으로 읽기 수업을 검사하면 예외 없이 오류 한 건, `unit.regular_lessons.4-6` 을 3 으로 둔 경우 layout 오류만(배정표 [] 비교 오류 없음).
2. **M-2** `builders.ts`(:1122~1128 · :1686): 견본 형태 표 `past-ed` 를 정규식 `\b[a-z]+ed\b` 대신 낱말 목록(jumped · looked · played …)으로 바꾸고, `under the chair` 를 `under the bed` 로 되돌린다. red 가 든 1단계 문장이 학습 요소 검사를 통과하는 사례를 시험에 고정한다(`seed-validator-reading.test.ts` 의 6.4 학습 요소 범위 시험 안).
3. **M-3** `check-lesson.ts:834`: '바른 답 문장이 없다(1~3단계)' → 숫자 대신 출처 이름('단계 규격 questions.modelAnswer')을 적는다. 다른 메시지도 한 번 훑어 박힌 설계 숫자가 없는지 본다.
4. **M-4** `check-lesson.ts:602~662`: 베끼기(`copy-tiles`) · 만들기(`build-tiles`) · 채우기(`fill-letters`) · 받아쓰기(`dictation`)의 `word` 가 허용 정답 가운데 하나(소문자)인지, `dictation` 은 `audioText` 도 같은지 `answer` 규칙으로 본다(컨트롤러가 plan-p04b '정답' 행에 더함). 시험 사례를 `seed-validator-writing.test.ts` 의 6.4 정답 시험에 더한다.
5. **WORD_BOX_MIN**(해석 8): `check-lesson.ts` 의 상수를 `structure.ts` 상수 표로 옮긴다(정본 출처 주석 'plan-p04b 쓰기 guided · 3.3 쓰기 4~5단계', P7 check-ids 허용 목록 자리).
이 다섯은 P4a · P4b 파일을 고치는 일이라 보고의 'P4a · P4b 파일 변경' 절에 따로 적는다.

## 작업 폴더 · 명령
- 지금 있는 격리 워크트리. git 쓰기 금지. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. `pnpm spec:trace` 는 인자 없이. 공용 변경 1 을 넣기 전에는 `node_modules/.bin/tsx scripts/seed-validate.ts`.
- 이스케이프(`\uXXXX`)는 쓴 뒤 바이트로 확인한다. 시험 시드 · 견본에 사람 이름을 넣지 않는다(앱 안 이름 Tori · Momo 는 된다).

## 먼저 읽을 것(순서)
1. `.claude/CLAUDE.md`. 2. plan-p04c 전부(목표 · 바뀌는 파일 · 회화 카드 검사 두 표 · 평가 검사 표 · 묶음 검사 표 · validate.ts 표 · 완전성 표 · 명령 표 · 모드 표 · `--json` 꼴 · 6.4 행마다 사례 표 · 작업 순서 1~7 · 위험 1~11 · 공용 변경 1~3 · 증명 표). 3. plan-p04a 의 '규격 칸'(회화 카드 · 평가 · 토리 이야기 · 기록) · '상수' · '글 조각 목록'(역할 gloss · option · ko), plan-p04b 의 '규격 파일 정합'(`index` 가 내주는 것) · '칸 검사' 첫 문단(`checkLessonCommon`)과 끝의 결정 문단 둘(20:3x · 20:4x). 4. 워크트리의 P4b 보고 `task-p04b-report.md` 'c 가 쓸 내보내기' 절과 메인 저장소 `review-p04b.md`(M-1~M-4 '고치는 법', 'P4c 에 넘길 메모'). 5. 정본 `specs/06-시드-생성.md` 6.3(완전성 · 보강 수업 행 · 토리 이야기) · 6.4 검사 표 전부 · `specs/02-1-영역-단원-승급.md` 3.2(회화 평가 · 배치 평가 · 관계 표) · `specs/02-2-세션과-단계표.md` 3.3 회화 카드 · `specs/08-테스트와-기술.md` 9절 시드 검증 행 · 11절 (4) · (4-1) · `specs/09-설정값.md` 12절 seed.* · level.* · placement.* · talk.* 키 · `specs/11-요구사항과-수용-기준.md` AC-7a · AC-7d(와 1-나 AC-15m) · `specs/10-결정-기록.md` C50 (4) · C54 · C58. 6. 기존 꼴 `scripts/spec-trace.ts` · `scripts/check-bundle.ts`(순수 함수 + `isDirectRun`, 종료 코드 0 · 1 · 2) · `tests/unit/spec-trace.test.ts`(tsx 띄우는 시험 꼴) · `.github/workflows/ci.yml` · `.dependency-cruiser.cjs` · `tests/unit/dependency-rules.test.ts`.

## 허용 파일
- plan-p04c 표의 열: 새 파일 `src/core/seed/check-talk.ts` · `check-assessment.ts` · `check-cross.ts` · `validate.ts` · `scripts/seed-validate.ts` · `tests/unit/{seed-validator-talk,seed-validator-complete,seed-validator-distribution,seed-validate-cli}.test.ts`, 수정 `tests/fixtures/seed/builders.ts`(`miniSeed` 더하기 · 회화 · 평가 견본 고치기, 있던 꼴은 그대로).
- 먼저 할 것 다섯을 위한 `src/core/seed/check-lesson.ts` · `src/core/seed/reference-index.ts` · `src/core/seed/structure.ts` · `tests/unit/seed-validator-{reading,writing}.test.ts`(사례 더하기만).
- 공용 변경(plan '요청하는 공용 변경' 1~3, 구현자가 자기 워크트리에서 글자 그대로): 1 `package.json` scripts `"seed:validate": "tsx scripts/seed-validate.ts"` · 2 `.github/workflows/ci.yml` seed-validate 작업(plan 의 yaml 그대로, `hashFiles` 는 단계 `if`) · 3 `.dependency-cruiser.cjs` 에 `src/core` 가 `fs` · `child_process` · `http` · `https` · `net`(`node:` 접두 포함)을 가져오지 못하는 규칙(이름 제안 `core-no-io`) + `tests/unit/dependency-rules.test.ts` 막는 예 · 허용 예 두 줄(`node:crypto` 는 허용 — validate.ts 가 쓴다). dependency-cruiser 가 `node:` 내장 모듈을 어떤 경로로 적는지 시험으로 확인한다.
- 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p04c-report.md`.
- 그 밖(P2 · P3 파일 · `src/app` · `src/server` · `src/lib` · `vitest.config.mts` · 잠금 파일)은 손대지 않는다. 새 패키지 없음. `tests/.tmp/` 는 실기(작업 6)에만 쓰고 끝나면 지운다(저장소에 남기지 않는다).

## 지킬 것
- 시험을 먼저 쓰고 실패를 본 뒤 구현한다(작업 순서 1~6). 시험 이름은 증명 표 글자 그대로(AC-7a · AC-7d · AC-15m 접두 그대로, 접두 없는 것 그대로). 시험 숫자는 `defaultSettings()` · 단계 규격 견본 · 상수에서만.
- `checkTalkCard` 는 P4b `checkLessonCommon` 을 회화 몫 role 로 부른다. `allowedForms('story')` 에는 구간 첫 단계를 넘긴다(검토 메모). 칸 검사 path 는 수업 객체 기준이고 파일 안 경로는 validate.ts 가 앞에 붙인다.
- 회화 견본(`talkLesson`)의 `unitWords` 를 수업 글에 나온 단원 단어로 채운다(P4b 요청 3 — `unit-words-unlisted` 경고 0).
- 평가 · 배치 지문에는 범위 밖 · 글로서리 검사를 걸지 않는다(plan 평가 검사 첫 문단). 분포 경고는 종료 0(6.4). 풀이 검사는 seed/checks 기록만 읽고 API 를 부르지 않는다(AC-7d 가져오기 그래프 시험).
- 해시 정의(`cellHash`) · 문항 번호(`itemsOf`) · 풀이 대상(`solveTargets`)은 plan 표 글자 그대로(P5 · P7 · P11 이 기댄다, 위험 5 · 11).
- 명령은 P1b 꼴(순수 함수 + `isDirectRun`, 종료 0 · 1 · 2, 조용히 0 으로 끝나지 않음). tsx 를 띄우는 시험은 넷까지(위험 7). `--json` 꼴은 `version: 1`.
- `check-lesson.ts` 를 영역별로 나눌지는 네가 판단해 보고에 적는다(나누면 P4b 시험이 그대로 통과해야 한다).
- `src/core` 는 db · next · react · 네트워크 · fs 를 가져오지 않는다(`pnpm check:deps`, 공용 변경 3). 순수 함수만.
- 모호하면 지어내지 말고 보고 '요청하는 변경'에 적는다. 정본과 다르게 해야 하면 멈추고 NEEDS_CONTEXT.

## 끝나면
`pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` · `pnpm spec:trace`(인자 없이, missing-test 60 → 58) · `pnpm check:bundle`(build 뒤) · 실기(작업 6: `tests/.tmp/` 시드 나무에 `pnpm seed:validate --root …` · `--complete-through 1` · `--json`, 저장소에 seed/ 가 없을 때 `pnpm seed:validate` 는 2). 보고 `task-p04c-report.md`: 바뀐 파일:줄('P4a · P4b 파일 변경' · '공용 변경' 절 따로), 설계와 다르게 한 것과 이유, 요청하는 변경, 시험 이름 전부, 명령과 출력(통과 수 · spec-trace 요약 · 실기 출력 셋), P5 · P7 · P8 이 쓸 것(`cellHash` · `itemsOf` · `solveTargets` · `--json` 꼴 · 경고 id 꼴), 남은 우려. 마지막 메시지 첫 줄은 DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED, 그 뒤 요지 8줄 안쪽. 끝내기 관문은 기록만 남기므로(C59) 명령 출력을 꼭 보고에 적는다.
