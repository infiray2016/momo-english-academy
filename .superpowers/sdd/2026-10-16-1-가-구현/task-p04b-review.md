# 검토 브리프: P4b 어휘 배정 · 칸 검사(code-reviewer rev-p04a 이어 보기 · Opus · xhigh, 읽기 전용)

impl-p04a 가 P4a 와 같은 워크트리에서 끝낸 P4b(어휘 배정 · 규격 파일 정합 · 읽기 · 쓰기 · 말하기 칸 검사)를 설계 준수와 품질로 판정한다. P4a 는 재검토 Approved 로 닫혔고(`review-p04a-2.md`), 이번 대상은 P4b 새 파일 여덟과 P4a 파일 변경 셋(text.ts 의 M-8 · M-9, builders.ts 견본, seed-text.test.ts 사례)이다. 첫 검토라 닫힌 장부는 없다. 코드를 고치지 않는다. 보고는 `.superpowers/sdd/2026-10-16-1-가-구현/review-p04b.md`(메인 저장소).

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/agent-a6ef72438a158a2f3`(브랜치 `feature/1a-p04a-seed-spec`). 새 파일: `src/core/vocab/allocate.ts`(229) · `src/core/seed/reference-index.ts`(535) · `src/core/seed/check-lesson.ts`(956) · `tests/unit/{vocab-allocate,seed-validator-reading,seed-validator-image,seed-validator-speaking,seed-validator-writing}.test.ts`. P4a 파일 변경: `src/core/seed/text.ts`(:34~41 `endsWithAbbreviation` · :108 수 갈래) · `tests/unit/seed-text.test.ts`(:102~ · :154~ 사례) · `tests/fixtures/seed/builders.ts`(견본 함수 본문을 `…Draft` 로 옮기고 `withUsedUnitWords` 로 `unitWords` 채움, 말하기 6단계 보기 `under the chair`).
- 구현 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p04b-report.md`('P4a 파일 변경', '설계와 다르게 한 것 · 해석' 1~11, '요청하는 변경' 1~3, 'c 가 쓸 내보내기', '남은 우려').
- 명령은 읽기와 시험 실행만: `PATH=$HOME/.nvm/versions/node/v24.22.0/bin:$PATH pnpm test`. 컨트롤러 재확인(20:3x): lint 0 · test 117(74 + 43) · check:deps 0 · build 통과 · check:bundle 0 · spec-trace missing-test 66 → 60.

## 대조할 정본 · plan(메인 저장소 `/Users/hikaru/workspace/momo-english-academy`)
1. plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p04b-배정-칸-검사.md` 전부 — 목표, 배정 함수 표, 규격 파일 정합 표(`index` 가 c 에 내주는 것), 칸 검사 세 표(수업 공통 · 읽기 · 쓰기 · 말하기), 위험 1~7, 끝의 '컨트롤러 결정(구현 뒤 20:3x)' 문단, 증명 표(AC-7c · 3.2 관계 표 · AC-3a · 6.4 공통 · AC-3b · AC-5b · AC-5g · AC-5h · 6.4 쓰기).
2. plan-p04a 의 '규격 칸' · '상수' · '글 도구' · '글 조각 목록'(역할 gloss · option · ko 반영 판)과 '컨트롤러 결정' 문단, `review-p04a-2.md` 의 M-8 · M-9 '고치는 법'.
3. 정본 `specs/02-1-영역-단원-승급.md` 3.2(배정 규칙 · 관계 표 · 단원 틀 표 · 쓰기 6단계 이상 문단) · `specs/02-2-세션과-단계표.md` 3.3(단계표 수 · 쓰기 3단계 카드 규칙) · 3.4(원형 · '한 단어는 영역마다 한 단원에서만 새 단어') · 3.6(학습 요소 범위 · 알파벳 단원) · `specs/06-시드-생성.md` 6.3(수업 겉 · 미리보기 · 글로서리) · 6.4 검사 표 · `specs/09-설정값.md` 12절 unit.* · seed.* · writing.* 키 · `specs/11-요구사항과-수용-기준.md` AC-3a · 3b · 5b · 5g · 5h · 7c · `specs/10-결정-기록.md` C54 · C58.
4. 구현 브리프 `.superpowers/sdd/2026-10-16-1-가-구현/task-p04b.md`.

## 판정할 것
1. 설계 준수. (가) `allocateUnit` · `resolveUnitFrame` · `checkFrameRelations` 가 3.2 와 plan 표대로인지(A = ⌈V ÷ k⌉, 나머지는 마지막 수업, 다지기 = 정규 − A, minLessons = max(A, 설정), 쓰기 6단계 이상은 level_specs `frame`, 보강 · 변형 · 덮기는 구간 키, 관계 표 셋을 `V − L ≥ V × 비율` 꼴로). (나) 규격 파일 정합 열 규칙이 plan 표와 1:1 이고 모두 `error` 인지, `index` 가 내주는 것(`num` · `levelSpec` · `unitSpec` · `unitsOf` · `lexicon` · `frame` · `allocation` · `allowedForms` · `writingShape`)이 plan 과 맞는지, `allowedForms` 가 3.6 글자대로(C54 ㅅ: 수업은 앞 단계 전부 + 이번 단원, 평가 · 배치는 그 단계까지, 토리 이야기는 구간 첫 단계 앞까지, 쓰기는 writing 차례 · 나머지 rst 차례, null 차례는 늘 밖)인지. (다) 칸 검사 규칙(`layout` · `vocab-allocation` · `unit-words` · `unit-words-unlisted` · `learning-elements` · `forbidden` · `answer` · `image` · `amount` · `offband` · `glossary` · `writing-shape` · `writing-cards` · `speaking`)이 세 표의 기준과 맞는지 — 특히 영어 검사 role 모음(`passage` · `script` · `prompt` · `option` · `answer` · `example` · `hint`)과 금지어 '모든 조각', `offband` 가 기능어도 단계로(C58), `glossary` 가 기능어를 빼는지, 쓰기 작문의 배정 role(`prompt` · `example` · `hint`). (라) 결과 꼴 `SeedIssue`(rule · severity · message 한국어 · file · cell · path)가 plan 약속대로 c 가 그대로 쓸 수 있는지.
2. 구현자 '설계와 다르게 한 것 · 해석' 1~11 각각 판정(수용 · 고칠 것 · 근거). 특히 1(미리보기를 배정 · 단원 단어 확인에서 뺌 — 6.3 '첫 활동인 새 단어 미리보기' 와 어긋나지 않는지, 학습 요소 · 금지어는 포함), 3(모음 같음 · 알파벳 단원의 A 넘는 수업은 빈 목록), 5(설정값 오류 때 건너뛰기 범위), 7(타일 · fill-letters · 조립 판정의 정확성 — 헷갈리게 하는 타일, 각 타일 한 번, 빈칸 꼴), 8(`WORD_BOX_MIN` — 컨트롤러가 structure.ts 로 옮기기로 함, fix 때), 9(바른 답 유무를 양쪽으로 보는 것이 3.3 · 6.4 와 맞는지), 11(AC-5b 를 규격 거부로 증명하는 것이 충분한지).
3. P4a 파일 변경 셋. M-8 · M-9 가 재검토 '고치는 법'대로인지(왼쪽 경계 · 서수 꼬리 `(?![A-Za-z])`, `OPENERS` 제거의 부작용, `2ND` 처리), 시험 사례가 사례마다 단언하는지. builders.ts 의 `…Draft` 분리와 `withUsedUnitWords`(check-lesson 의 `ENGLISH_ROLES` 를 fixture 가 가져오는 것 — fixture 가 검사 코드에 기대는 순환 우려는 없는지), `under the chair` 바꿈이 견본 정규식의 거친 꼴을 가린 것은 아닌지(요청 2 와 함께 판정), P4a 시험 25 그대로 통과.
4. 시험의 실체. 증명 표 43 이름 글자 그대로인지, 각 시험이 이름대로 단언하는지(경계 그대로 통과 + 경계 + 1 거부), 숫자가 `defaultSettings()` · `settingNumber` · 단계 규격 견본 · 상수에서만 오는지, 견본 수업 아홉의 칸 검사 결과 0 과 정합 0 이 실제 시험으로 고정됐는지, 시험 사이 견본 공유로 생기는 순서 의존이 없는지.
5. 품질. 순수성(fs · Date · 네트워크 없음), `check-lesson.ts` 956줄의 구조(영역별 나누기는 c 몫이라 지적 아님 — 읽기 어려운 곳만), 형 안전, 한국어 메시지에 설계 숫자가 박혔는지(메시지에 수를 넣더라도 상수 · 설정에서 온 값인지), 한글 식별자 없음, 요청 2 · 3 과 남은 우려 넷 판정.

## 보고 꼴(`review-p04b.md`)
- 첫 줄 판정: Approved 또는 Changes requested(C n · I n · M n).
- 지적마다 번호 · 심각도 · 파일:줄 · 근거(정본 절 · plan 줄 · 문장) · 고치는 법 한 줄. 근거 없는 지적은 넣지 않는다.
- 표 하나: 해석 1~11 · 요청 1~3 · 남은 우려 넷 각각 '수용 · 고칠 것(근거)'. 표 하나: 증명 표 행(AC-7c · 3.2 관계 표 · AC-3a · 6.4 공통 · AC-3b · AC-5b · AC-5g · AC-5h · 6.4 쓰기)마다 '시험 있음(이름 수) · 없음'. 표 하나: 칸 검사 규칙 열넷마다 '맞음 · 어긋남(무엇)'.
- 마지막 메시지 첫 줄은 판정, 그 뒤 요지 8줄 안쪽. fix 뒤 재검토는 따로 브리프.
