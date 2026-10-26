# 검토 브리프: P4c 회화 · 평가 · 묶음 검사와 시드 검증 명령(code-reviewer rev-p04a 이어 보기 · Opus · xhigh, 읽기 전용)

impl-p04a 가 P4a · P4b 와 같은 워크트리에서 끝낸 P4c(회화 카드 검사 · 평가 검사 · 묶음 검사 · validate.ts · `pnpm seed:validate` · 공용 변경 셋)를 설계 준수와 품질로 판정한다. P4a(c3f6baf) · P4b(f27ae15)는 커밋됐고 그 파일에 P4c 첫 일(M-1~M-4 · WORD_BOX_MIN · C60)이 들어 있다 — 그 고침이 검토 '고치는 법'대로인지도 함께 본다. 첫 검토라 닫힌 장부는 없다. 코드를 고치지 않는다. 보고는 `.superpowers/sdd/2026-10-16-1-가-구현/review-p04c.md`(메인 저장소).

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a6ef72438a158a2f3`(브랜치 `feature/1a-p04c-seed-validate`). 새 파일 아홉: `src/core/seed/check-talk.ts` · `check-assessment.ts` · `check-cross.ts` · `validate.ts`(1039) · `scripts/seed-validate.ts` · `tests/unit/{seed-validator-talk,seed-validator-complete,seed-validator-distribution,seed-validate-cli}.test.ts`. 고친 공용 파일: `package.json`(seed:validate) · `.github/workflows/ci.yml`(seed-validate 작업) · `.dependency-cruiser.cjs`(core-no-io) · `tests/unit/dependency-rules.test.ts`(`git -C <워크트리> diff`). 커밋된 P4a · P4b 파일의 P4c 첫 일은 `git -C <워크트리> show c3f6baf -- src/core/seed/structure.ts …` 와 `f27ae15` 로 본다(builders.ts 의 miniSeed 는 미커밋 변경에 있는지 확인).
- 구현 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p04c-report.md`('P4a · P4b 파일 변경', '설계 해석' 13, '확인 바람' 회화 평가 장 문항 번호 — 컨트롤러가 턴 차례로 수용, 실기 결과, 남은 우려).
- 명령은 읽기와 시험 실행만: `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm test` · `pnpm seed:validate --root <폴더>`(실기는 `tests/.tmp` 에 `writeSeedTree` 로 시드 나무를 쓴 뒤, 끝나면 지운다). 컨트롤러 재확인(21:3x): lint 0 · 시험 159 · check:deps 0 · spec-trace missing-test 58 · build · check:bundle 0 · seed/ 없을 때 `pnpm seed:validate` 는 2.

## 대조할 정본 · plan(메인 저장소 `/Users/hikaru/workspace/momo-english-academy`)
1. plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p04c-묶음-검사-명령.md` 전부 — 회화 카드 검사 두 표, 평가 검사 표, 묶음 검사 표(심각도 포함), validate.ts 표(`itemsOf` 의 회화 평가 장 = 턴 차례로 21:3x 고침), 완전성 표, 명령 · 모드 표, `--json` 꼴, 6.4 행마다 사례 표, 작업 순서, 위험 1~11, 공용 변경 1~3, 끝의 '컨트롤러 결정(구현 뒤 21:3x)' 문단, 증명 표.
2. plan-p04a · plan-p04b(규격 칸 · 상수 · `index` · `SeedIssue` 꼴 · `checkLessonCommon` 약속), `review-p04b.md` 'P4c 에 넘길 메모'(allowedForms('story') 구간 첫 단계 · path 기준) 와 M-1~M-4 '고치는 법', `review-p04a-2.md` 범위 밖 관찰.
3. 정본 `specs/06-시드-생성.md` 6.3(완전성 · 보강 수업 행 · 토리 이야기 · 회화 카드 규격) · 6.4 검사 표 전부(심각도 · 풀이 검사 · 분포 경고), `specs/02-1-영역-단원-승급.md` 3.2(회화 평가 · 배치 · 관계 표), `specs/02-2-세션과-단계표.md` 3.3 회화 카드, `specs/08-테스트와-기술.md` 9절 시드 검증 행 · 11절 (4) · (4-1), `specs/09-설정값.md` seed.* · level.* · placement.* · talk.* 키, `specs/04-데이터.md` 5절 seed_reports '(장, 턴)', `specs/11-요구사항과-수용-기준.md` AC-7a · AC-7d(1-나 AC-15m 은 1-나 묶음 plan), `specs/10-결정-기록.md` C50 (4) · C54 · C58 · C60.
4. 구현 브리프 `.superpowers/sdd/2026-10-16-1-가-구현/task-p04c.md`.

## 판정할 것
1. 회화 카드 검사(check-talk). 규칙 열넷 + 회화 몫 `vocab-allocation` 이 표의 기준과 1:1 인지(talk-shape · talk-turns · talk-hints · talk-pairs 의 '한 자리만 다름' · talk-first-ask 의 '앞쪽 절반 = ⌈대화 턴 수 ÷ 2⌉' · talk-targets · talk-same-question · talk-more · talk-images · talk-ko · talk-today · talk-missions · talk-first-question · talk-placeholder), 단원 단위 둘(talk-again-slots · talk-known-days — 다시 묻는 턴 자리를 대화 턴만 세는 해석이 3.2 관계 표 · AC-15m 과 맞는지, 4단계부터 처음 · 다시 가름), `checkLessonCommon` 을 회화 role 로 부르는 꼴, 회화 견본의 unitWords.
2. 평가 검사(check-assessment). level-test-* 여덟 · talk-test-* 다섯 · placement-count · story-count · story-ko 가 표대로인지, 평가 · 배치 지문에 범위 밖 · 글로서리 검사를 걸지 않는 것(plan 첫 문단), AI 과제 문항 자리 규칙, 겹침 비교의 정규화(소문자 · 공백 · 끝 문장 부호).
3. 묶음 검사(check-cross). topic-variants 의 분량 서명, remedial-coverage 와 '답하는 대상 단어 수' 보고, 관계 경고 둘(그래프 엔지니어링 '자료 그래프' 절차 — 선을 결정적으로 뽑는지), distribution 의 폭 · 경고 id 꼴 `distribution:<영역>:<단계>:<지표>`, can-do-numbers, 심각도(오류 · 경고)가 표대로.
4. validate.ts. `cellHash`(sha256 16진, 칸 키 + 줄바꿈 + 정규 JSON — revision · correction · generation 뺌, 키 사전 순 · 공백 없음), `itemsOf`(회화 평가 장 = 턴 차례 포함), `solveTargets`, `solveStatus`(not-needed · unchecked · pending-human · passed, 해시 바뀌면 unchecked), `expectedCells`(완전성 표: 규격 파일은 늘, 수업 · 회화 · 평가 · 배치 가 벌 전부 · 토리 이야기), `validateSeed`(겉 먼저 풀기 · 배치 검사 · 깨진 칸만 실패), `exitCodeOf`(모드 표). 단원 단위 오류의 `errors[].cell` null — P8 되돌리기 입력으로 쓸 수 있는지(컨트롤러: P8 이 단원 전체 다시 만들기로 다룸 — 판정).
5. 명령(scripts/seed-validate.ts). 인자 다섯 · 모드 둘 · 종료 0 · 1 · 2 전부(조용히 0 없음), 첫 줄 요약 꼴 · 다음 줄 꼴, `--json` version 1 꼴(+ stats.ranges 추가 — 컨트롤러 수용) · P8 이 쓰는 `errors[].cell`, `--areas` 가 검사 대상도 거르는 것, 순수 함수 + `isDirectRun` 꼴, tsx 띄우는 시험 넷까지, API 0회 시험(가져오기 그래프에 sdk · http · https 없음 · fetch( 없음).
6. 공용 변경 셋 + 시험: `seed:validate` 한 줄, ci.yml seed-validate 작업(준비 네 줄 · `hashFiles('seed/settings.json') != ''` 단계 if · 주석), `core-no-io`(fs · child_process · http · https · http2 · net 금지, crypto 허용, `node:` 접두 처리를 시험이 고정) + 막는 예 · 허용 예.
7. 시험의 실체. 증명 표 40 이름이 글자 그대로인지(AC-7a 일곱 · 6.4 평가 여섯 · AC-7d 다섯 · 6.4 묶음 넷 · AC-15m 아홉 · 6.4 회화 넷 · 명령 다섯), 이름대로 단언하는지, 숫자가 설정값 · 단계 규격 견본 · 상수에서만 오는지, miniSeed(through 1, frame small)가 오류 0 · 빈 칸 0 인지와 2단계 이상 꼴을 덮지 못하는 범위(남은 우려), 실기 셋(PR 모드 칸 172 · 통과 172 · 빈 칸 500 · 0, `--complete-through 1` 빈 칸 0 · 0, `--complete-through 2` 빈 칸 96 · 1)이 보고와 맞는지 한 번 직접 돌려 본다.
8. 품질 · 구조. `check-lesson.ts` 1028줄 · `validate.ts` 1039줄 — 나눠야 할 곳이 있으면 Minor 로(구현자가 검토 판단에 맡김), 순수성(fs · Date · 네트워크는 scripts 에서만), 한국어 메시지 · 영어 식별자, 설계 숫자 박힘 없음, 해석 13(보고) 각각 수용 · 고칠 것.

## 보고 꼴(`review-p04c.md`)
- 첫 줄 판정: Approved 또는 Changes requested(C n · I n · M n).
- 지적마다 번호 · 심각도 · 파일:줄 · 근거(정본 절 · plan 줄 · 문장) · 고치는 법 한 줄. 근거 없는 지적은 넣지 않는다.
- 표 하나: 검사 규칙(회화 열넷 + 단원 둘 · 평가 열다섯 · 묶음 여섯)마다 '맞음 · 어긋남(무엇)'. 표 하나: 해석 13 · 남은 우려 각각 '수용 · 고칠 것(근거)'. 표 하나: 증명 표 행마다 '시험 있음(이름 수) · 없음'.
- 마지막 메시지 첫 줄은 판정, 그 뒤 요지 8줄 안쪽. fix 뒤 재검토는 따로 브리프.
