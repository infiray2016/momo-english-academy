Approved(C 0 · I 0 · M 7)

# 코드 검토: P5b 활동 표시 컴포넌트와 로컬 전용 시드 보기 화면(code-reviewer rev-p05b · Opus · xhigh, 2026-10-17)

대상은 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p05b`(브랜치 `feature/1a-p05b-seed-viewer`, 바탕 e08eaba, 커밋 없음)다. 코드 파일:줄은 이 워크트리 기준이고, plan · 정본 줄은 메인 저장소 기준이다. P5b 첫 검토라 닫힌 장부는 없다. 화면 모습(목업 · 4절 크기 · 문구)은 design-reviewer 몫이라 여기서는 코드 · 설계 준수 · 보안 · 시험만 본다.

확인 방법은 이렇다.
- 수정 여섯(`git diff`)과 새 파일 열하나(files.ts 394 · common 323 · reading 187 · writing 265 · speaking 137 · page.local 261 · cell-view 831 · talk-card 307 · 시험 둘 347 · 19, playwright.local.config 49)을 모두 읽었다.
- 공용 변경 1 · 3 · 5 · 6 은 plan 코드 블록을 잘라 스크래치패드에서 `diff` 로 대조했다. 증명 표 시험 이름 여섯은 `grep -F` 로 대조했다(빠짐 0).
- P4c 계약은 이름 붙일 위험이 있는 곳만 읽었다: validate.ts `itemsOf` · `solveStatus` · `collectCells`(깨진 칸 · 배치 칸 키), structure.ts `cellKey` · `parseCellKey` · `parseSeedPath` · `SEED_FILES`, 규격 assessment.ts · lesson.ts(듣기 `prompt` 칸) · reference.ts(그림 `file` 정규식), check-assessment.ts `isAiItem`, check-bundle.ts 의 서버 변수 출처.
- 시험은 다시 돌리지 않았다(컨트롤러 재확인 통과). 의심 둘은 워크트리에서 `pnpm exec tsx -e` 로 확인했다(파일은 고치지 않음): `sampleSeedTree(smallReferenceSet())` 가 던지는지(던진다 — '읽기 단원 단어: 4 번째 값이 없다'), 기본 견본의 칸 수 · 풀이 상태(칸 127 · 오류 0, unchecked 111 · not-needed 16, 견본 풀이 기록 하나는 해시가 칸과 달라 unchecked).
- 화면 사진은 말하기 하나만 열어 고정 화면 번호(15)가 의도한 질문 화면인지 봤다(맞음).

## 1. 설계 준수

| 갈래 | 판정 | 근거 |
|---|---|---|
| 빠진 것 | 없음 | plan 파일 열 · 공용 변경 1~6 · 보기 화면 표 셋 · 컴포넌트 내보내기 스물넷 · 서버 읽기 함수 다섯 · 증명 표 시험 여섯이 모두 있다. '문항 <itemsOf 번호>'는 같은 수를 손으로 다시 세어 낸다(M-1, 지금 값은 같음) |
| 넘친 것 | 해 없음 | files.ts `publicFileExists` · `pictureCatalog`(다르게 한 것 4), common.tsx `EnglishLine` · `GuideLine` · `TileRow` · `AnswerBox` · `FrameText`, 칸 머리 '파일 안 자리'(cell-view.tsx:749~750), 그림 덧붙임의 파일 경로. 모두 plan 취지(보기 화면 · 그림 확인 H7) 안이다 |
| 잘못 이해한 것 | 없음 | 로컬 전용 두 겹(C62 (1)) · 회화는 어른용 표(정할 것 파) · 읽기만(P5c 쓰기 없음) · 쿠키는 proxy(C57)가 plan 그대로다 |

### 볼 것 1~8

| 번호 | 판정 | 근거 |
|---|---|---|
| 1 로컬 전용 길 | ✅ | next.config.ts:1~29 가 plan 110~138줄과 `diff` 0(reactCompiler · agentRules · authInterrupts · turbopack · preview.tsx 조건 그대로). `local.tsx` 는 `phase === PHASE_DEVELOPMENT_SERVER` 일 때만(:13 · :22). page.local.tsx:207 첫 문장 `assertSeedViewerLocal()`, files.ts:56~58 은 NODE_ENV 가 development 가 아니면 `notFound()`. metadata(page.local.tsx:20~23)가 plan 41줄 그대로. 속성 타입 손으로(:202~206). cell-view · talk-card 는 page · route 이름이 아니다. 구현 보고의 빌드 경로 목록에 `/dev/seed-viewer` 가 없다 |
| 2 보안 | ✅ | `resolveSeedFile`(files.ts:70~85)은 빈 값 · 절대 경로 · 역슬래시 · 빈 · `.` · `..` 조각을 거부하고 `parseSeedPath` 를 통과해야 하며 `relative(root, full)` 로 뿌리 안을 본다. 쿼리의 `file` 은 `loadContentFile` 이 `parseSeedPath` → `contentFilePath` 로 다시 만든 경로만 읽는다(:219~236). `cell` 은 칸 찾기에만 쓴다(page.local.tsx:238). `publicFileExists`(:316~325)는 public/ 밖을 거부하고, 입력은 규격을 통과한 images.json 의 `file`(정규식 `^images/vocab/…` reference.ts:344)뿐이다. 절대 경로 · 오류는 어른용 칸(ValidateHint :73~82 · FileList :87 · FileErrors)에만 있고 아이 화면 틀에는 시드 글만 간다. `import "server-only"` 가 첫 문장(:4). `node:fs` 는 src 전체에서 files.ts 하나. 시각 읽기 0. 쪽에 `requireAccess` 가 없는 것은 C57(proxy) 그대로이고 401 e2e 가 있다. `dangerouslySetInnerHTML` 0 |
| 3 운영 묶음 분리 | ✅ | 규칙 정규식이 plan 211~212줄과 `diff` 0. 막는 예 · 허용 예 견본은 `tests/.tmp/depcruise-<hex>` 에 쓰고 `afterAll` 에서 지운다(dependency-rules.test.ts:100~131) — 워크트리 `src/app` 에 `uses-seed-viewer.tsx` 가 없다. check:bundle 은 .env.example 의 이름을 읽어(check-bundle.ts:18 · 43) `SEED_VIEWER_ROOT` 를 서버 변수로 센다. cell-view · talk-card 를 page.local.tsx 밖에서 가져오는 곳 0(grep) |
| 4 보기 화면 표 셋 | ✅ | 목록은 `CONTENT_DIRS` 넷(files.ts:45~50, checks · reviews 링크 0 을 e2e 가 본다). 뿌리 없음 문구 page.local.tsx:87 이 plan 49줄 그대로. 상태 넷 cell-view.tsx:65~70. 칸 머리 :736~751(해시 앞 12자 :747). 화면 차례 · 덧붙임이 plan 55~67줄 표와 행마다 맞다 — 듣기 대본 :341 · 장면 설명 :383 · 받아쓰기 :235 는 덧붙임에만, 회화 카드 · 평가 장은 표만(:771~787, talk-card 가 plan 65~66줄 칸을 모두 담음), 깨진 칸은 날 JSON + 오류(:754~770), composition 문구 :299, '내용이 바뀌어…' :648, 표본 검토는 읽기만(:698~723) |
| 5 컴포넌트 지킬 것 | ✅(M-4 · M-6 다듬기) | 훅 · 'use client' · server-only 0(grep). 크기 클래스는 `CHILD_SIZE`(common.tsx:15~24). `reveal` 기본 거짓(모든 컴포넌트). `next/image` + `unoptimized`(:109~116), `dangerouslyAllowSVG` 0. 그림 자리 `size-40` 정사각 · `object-contain`. 덧붙임에 그림 키 · 라이선스 · 저작자(cell-view.tsx:106~121). 퍼센트 · 별 · '빠졌어요' 0(grep). `speaking.prepare_seconds` 같은 설계 숫자 0. `AREA_TONE` 넷 |
| 6 시험 | ✅(M-5 · M-7 다듬기) | 아래 '증명 표'. 기대 글은 견본 객체(`lesson.preview` · `question.prompt` …). e2e-local 뿌리는 `SEED_VIEWER_E2E_ROOT`(tests/.tmp, .gitignore 17줄)이고 `beforeAll` 에서 지우고 쓴다(plan 99줄 그대로, 끝에 지우지 않는 것은 plan 과 같다). 크기 시험은 `getComputedStyle` 로 틀 안 글 요소 전부 · `[data-choice]` 상자 · '%' 를 본다(:301~334), 이름에 AC 없음(위험 9). 사진은 환경 변수 있을 때만(:337). 설정 `reuseExistingServer: false` · 3200 · 일꾼 하나 · 60초/120초(위험 3 · 4). 404 e2e 는 쿠키 픽스처 + 홈 200 확인 뒤 404 를 본다. '내용 파일 모두'는 `page.request.get` 으로 칸마다 요청한다(같은 견본 칸 127, 내가 확인) |
| 7 다르게 한 것 | 여섯 모두 받음 | 아래 표 |
| 8 품질 | 다듬기 | 오류 처리: JSON 이 아닌 내용 · 기록 · 검토 파일은 오류 목록으로, 없는 파일은 '파일이 없어요', 배치 밖 경로는 문구로 간다. 어른용 글 해요체(검토 파일 오류 'JSON 이 아니다'는 P4c 문구와 같은 꼴). `bandOf` 안 씀 · `bandInfo`(files.ts:204). 죽은 값 `ViewerCell.items`(M-1). 중복 `isAiItem`(M-2) · 칸 키 손 가르기(M-3). 위험 8: 칸 요청마다 규격 파일 열을 읽고 `collectCells` 를 돈다 — 견본에서는 e2e-local 다섯이 14.7초라 지금은 괜찮고 P6a 뒤 실데이터로 잰다(plan 100줄) |

## 2. 잘한 점

- 쿼리의 파일 값을 그대로 경로로 쓰지 않는다. `parseSeedPath` 로 풀고 `contentFilePath` 로 다시 만든 뒤 `resolveSeedFile` 을 한 번 더 지나게 해서, 인코딩 장난(`%2e%2e`)이 들어갈 길이 없다(files.ts:219~236 · 87~91).
- 그림 파일이 없으면 `src` 를 주지 않아 깨진 그림 · 404 콘솔 오류 없이 한국어 뜻이 보인다(files.ts:384~387). 그래서 '화면 오류 없이' e2e 가 콘솔 오류 0 을 단언할 수 있다.
- 아이 화면 틀 밖으로 빼야 할 글(듣기 대본 · 장면 설명 · 받아쓰기 글 · 해설 · 모범 문장 · 채점 기준)이 컴포넌트 속성에 아예 들어가지 않는다. 컴포넌트가 그 칸을 받지 않으니 P11 이 다시 써도 샐 길이 없다.
- 크기 시험이 클래스 이름이 아니라 계산된 크기와 상자 크기를 보고, 영어 여부를 가장 가까운 `lang` 으로 가른다. 칸 13개의 틀 전부를 본다.
- '다르게 한 것'마다 이유가 사실로 맞다(작은 견본이 던짐 · page.tsx 견본의 기존 단언 · 말하기 그림은 그림 키).

## 3. 지적

Critical · Important 없음.

### Minor

**M-1. 이름표의 '문항 k' 를 itemsOf 가 아니라 손으로 다시 센다(계산한 `items` 는 쓰지 않는다).**
- 무엇이: files.ts:166 · 295 가 칸마다 `itemsOf` 를 내지만 쓰는 곳이 없다. cell-view.tsx 는 :198 · 252 · 272 · 288 · 315~399(말하기 `no` 셈) · 533 · 567 에서 번호를 따로 센다. 지금 차례는 validate.ts:152~230 `itemsOf` 와 같음을 확인했다.
- 왜: plan '보기 화면' 53줄은 이름표를 '문항 <itemsOf 번호>'로, '서버 읽기' 93줄은 `itemsOf` 를 함께 내라고 했다. P5c 는 이 화면에서 표본 검토 행 `itemNo` · 사람 확인 `no` 를 고른다. 두 셈이 갈라지면 seed/reviews · seed/checks 의 문항 번호가 풀이 기록과 어긋난다(plan-p05a 위험 3 · plan-p04c 위험 5 '문항 번호를 다시 짜지 않는다').
- 어떻게: Screen 에 itemsOf 의 `path`(예: `content.questions.0`)를 붙이고 번호는 `cell.items` 에서 찾는다. 아니면 P5c 앞에 '이름표 번호 = itemsOf 번호' 시험 하나를 둔다.

**M-2. AI 과제 규칙을 core 와 두 벌로 둔다.**
- 무엇이: cell-view.tsx:405~412 가 src/core/seed/check-assessment.ts:224~230 의 비공개 `isAiItem` 과 글자까지 같다(구현 보고 '알릴 것' 둘째).
- 왜: 어른용 덧붙임 한 칸이라 지금 해는 없다. 그러나 6.3 · 3.2 의 AI 과제 기준이 바뀌면 검증기만 고쳐지고 보기 화면은 옛 기준을 보인다.
- 어떻게: P5c 의 공용 변경으로 core 에서 `isAiItem` 을 내보내고 cell-view 가 가져온다(core 파일에 `export` 한 단어).

**M-3. 칸 키를 손으로 가른다.**
- 무엇이: files.ts:200 `Number(cell.key.split(":")[2])`(배치 칸의 단계), cell-view.tsx:510 `cell.key.endsWith(":spare")`. structure.ts:446 에 `parseCellKey` 가 있다.
- 왜: 칸 키 꼴(structure.ts:433~441)이 바뀌면 검토 파일 경로가 조용히 `reviews/<영역>-NaN.json` 이 된다. P5c 가 같은 경로에 쓰므로 읽기 · 쓰기 규칙이 한 함수여야 한다.
- 어떻게: `parseCellKey` 로 단계 · 예비를 읽고, `reviewPathOf` 를 내보내 P5c 쓰기가 같은 함수를 쓰게 한다.

**M-4. 평가 · 배치 문항 컴포넌트의 속성이 P4a 규격 타입이 아니고, 말하기는 `as` 를 두 번 쓴다(보고 '다르게 한 것'에 없음).**
- 무엇이: reading.tsx:115~121 `ReadingTestItemData`(`type: string`), speaking.tsx:112~116 `SpeakingTestItemData` 는 손으로 적은 꼴이다. cell-view.tsx:431 은 `item as SpeakingTestItemSchema as SpeakingTestItemData` 다.
- 왜: plan '지킬 것' 셋째(81줄)는 '속성은 P4a 규격 타입'이다. 두 번 쓴 `as` 는 형 검사를 끄므로, P4a 가 칸 이름(예: repeat 의 `sentence`)을 바꿔도 컴파일이 통과하고 아이 화면 틀이 빈다. 읽기 쪽은 값을 속성에 넘길 때 할당 검사가 남아 잡힌다.
- 어떻게: `ListeningData` 처럼 P4a 형에서 `Pick` 으로 끌어오고(speaking.tsx:27~29 꼴), 바깥 `as` 를 하나로 줄인다.

**M-5. 보기 화면의 갈래 넷을 그리는 시험이 없다.**
- 무엇이: 견본 풀이 기록은 해시가 칸과 달라 '내용이 바뀌어…' 갈래만 그려진다(내가 확인: unchecked). 그래서 풀이 검사 표(cell-view.tsx:650~695)는 어느 시험에서도 그려지지 않는다. 읽기 4단계 칸의 검토 행 하나는 화면에 있지만 단언이 없다(seed-viewer.spec.ts:107~156). 규격이 깨진 칸(:754~770)도 시험이 없다. 견본 단계 평가가 읽기 · 회화뿐이라(builders.ts:2407) `FillBlankItem` · `FixSentenceItem` · `CompositionTestItem` · 말하기 질문 · 발표 평가 문항은 그려진 적이 없다.
- 왜: plan 증명 표가 요구하지 않으므로 설계 미충족은 아니다. 다만 P5c 가 이 표들 위에 쓰기를 더한다.
- 어떻게: AC-7f 읽기 시험에 '표본 검토' 표 행 하나와 '내용이 바뀌어 풀이 검사가 안 됐어요' 단언 두 줄을 더한다. 풀이 표 · 깨진 칸 · 쓰기 평가는 P5c 시험으로 넘긴다(아래 메모).

**M-6. 글자 칸 크기가 `CHILD_SIZE` 밖에 있다.**
- 무엇이: writing.tsx:47 의 빈 글자 칸 `h-14 w-12`(56 × 48px).
- 왜: plan '지킬 것' 둘째(80줄)는 4절 크기 클래스를 `common.tsx` 의 이름 붙인 상수 한곳에 모으라고 했다. 높이 56px 은 누르는 곳 값과 같은 수라, 사용 시험 뒤 4절 값이 바뀌면 이 칸만 따라가지 않는다. P11 이 빈칸을 눌러 글자를 빼게 하면 너비 48px 이 4절 56px 아래다.
- 어떻게: `CHILD_SIZE` 에 글자 칸 항목을 두거나 `CHILD_SIZE.target` 을 쓴다.

**M-7. 사진을 찍을 화면 번호를 시험에 박았다.**
- 무엇이: seed-viewer.spec.ts:268~280 의 화면 번호 3 · 2 · 15 · 5.
- 왜: plan 280줄 '시험 안의 글 · 숫자는 견본 시드 객체에서 읽는다'. 견본 말하기 수업의 낱말 · 문장 수가 바뀌면 다른 화면을 찍거나, 사진 변수가 있을 때 그 틀이 없어 실패한다. 크기 단언은 틀 전부를 보므로 영향이 없다.
- 어떻게: 말하기 질문 화면 번호를 `1 + words + sentences + listening + 1` 처럼 견본 수업에서 센다.

## 4. 구현 보고 '계획과 다르게 한 것' 판정

| 번호 | 판정 | 근거 |
|---|---|---|
| 1 견본 = `referenceSet(defaultSettings())` | 받음 | `sampleSeedTree(smallReferenceSet())` 가 '읽기 단원 단어: 4 번째 값이 없다'로 던짐을 재현했다. 기본 견본은 칸 127 · 오류 0 이고 seed-schema.test.ts:352 · 1018 도 같은 견본을 쓴다. plan 99줄의 견본 이름이 틀렸던 것이다(P4a 견본의 한계, 설계 변경 아님) |
| 2 막는 예 새 견본 파일 | 받음 | `src/app/page.tsx` 견본은 이미 `["ai-only-from-server"]` 와 딱 맞게 단언된다(dependency-rules.test.ts:41 · 189~190). 같은 파일에 넣으면 그 시험이 깨진다. 새 견본은 임시 폴더에만 생긴다 |
| 3 `section aria-label` | 받음 | 이름 붙은 `section` 의 암묵 역할이 region 이고 e2e 가 `getByRole("region")` 으로 찾는다. plan 53줄의 뜻 그대로다 |
| 4 `PictureLookup { ofWord, ofKey }` | 받음 | 그림 보고 말하기는 단어 id 가 아니라 그림 키를 쓴다(lesson.ts pictureTask `images: ImageKeySchema`). 파일이 없을 때 `src` 를 빼는 것은 plan 83줄 '그 전에는 alt 가 보인다'와 같은 결과다. P11 은 두 함수를 다 줘야 한다(메모) |
| 5 reveal 범위 | 받음 | plan 55~60줄 표가 문장 틀의 모범 문장 · 작문 채점 기준을 덧붙임에 두므로 그 둘이 reveal 을 받지 않는 것이 맞다 |
| 6 아이 화면 틀 안 문구 | 받음 | '오늘의 새 단어'(B_Reading) · '과제' · '예시' · '단어 상자'(B_Writing) · '힌트'(B_LevelTest) · '다시 듣기'(B_W1_Words · B_Speaking)가 목업에 있음을 grep 으로 확인했다. 정본과의 차이는 design-reviewer 몫이다 |
| 알릴 것 둘째 `isAiItem` 복제 | 지금 그대로, P5c 에서 하나로 | M-2 |

## 5. 증명 표

| 증명 표 행 | 시험 | 판정 |
|---|---|---|
| AC-7f(보기) | e2e-local "AC-7f 시드 보기: 읽기 수업 칸을 열면 아이 화면 모습에 정답 · 해설 · 새 단어가 붙어 보인다"(seed-viewer.spec.ts:107) | 있음, 이름 글자 그대로 |
| AC-7f(빌드에서 빠짐) | e2e "AC-7f 운영 빌드에서는 시드 보기 주소(/dev/seed-viewer)가 접근 쿠키가 있어도 404 다"(seed-viewer-absent.spec.ts:7, `pnpm build && pnpm start` 위) + 작업 1 경로 목록(구현 보고) | 있음 |
| 보기 화면 | "…내용 파일(쓰기 · 말하기 · 회화 카드 · 단계 평가 · 배치 · 토리 이야기)이 모두 화면 오류 없이 열리고 칸마다 머리가 보인다"(:158) · "…듣기 대본 · 그림 장면 설명은 아이 화면 밖 덧붙임에만 보인다"(:207) · "…접근 쿠키가 없으면 /dev/seed-viewer 도 접근 코드 화면(401)이다(C57)"(:229) | 셋 모두 있음 |
| 4절 아이 화면 원칙 | "활동 표시: 아이 화면의 안내 20px · 영어 24px · 버튼 글자 22px 이상, 누르는 곳 56px 이상, '%' 가 없다"(:284) + design-reviewer 보고 | 시험 있음. ⚠️ design-reviewer 보고는 이 검토 밖 |
| 공통 | 명령 열 · CI `ci / e2e-local`(ci.yml:104~115) | 작업 있음. 명령 출력은 컨트롤러 재확인. ⚠️ CI 작업의 실제 실행은 push 뒤 |
| 단위 둘(공용 변경 5) | "의존 규칙: 앱 화면이 src/server/seed-viewer 를 가져오면 seed-viewer-only-from-viewer 위반" · "의존 규칙: 시드 보기 화면(src/app/dev/seed-viewer)이 src/server/seed-viewer 를 가져오는 것은 허용"(dependency-rules.test.ts:271~286) | 있음. 허용 예는 가져오기가 실제로 풀렸는지도 본다 |

## 6. 공용 변경 1~6

| 번호 | 판정 | 근거 |
|---|---|---|
| 1 `next.config.ts` | 글자 그대로 | plan 110~138줄과 `diff` 0 |
| 2 `package.json` | 글자 그대로 | `"e2e:local": "playwright test --config playwright.local.config.ts"` 한 줄 |
| 3 `playwright.local.config.ts` | 글자 그대로(biome 줄바꿈 · 끝 쉼표만) | 공백을 지운 대조에서 `join(…, "seed-viewer-e2e",)` 의 끝 쉼표 하나만 다르다 |
| 4 `.env.example` | 글자 그대로 | 두 줄 |
| 5 `.dependency-cruiser.cjs` + 시험 | 규칙은 글자 그대로, 시험은 다름(막는 예 파일) | 규칙 `diff` 0. 막는 예가 `src/app/page.tsx` 대신 `src/app/uses-seed-viewer.tsx`(다르게 한 것 2, 받음) |
| 6 `.github/workflows/ci.yml` | 글자 그대로 | plan 219~230줄과 `diff` 0 |

## 7. 열린 장부 항목

| 항목 | 판정 |
|---|---|
| P4a `bandOf` · `Band` ↔ P2a `level-band.ts` 중복(ledger-open '구현하며 확인할 것') | 아직 열림. P5b 는 `bandInfo`(structure.ts)만 써서 중복을 늘리지도 줄이지도 않았다(files.ts:22 · 204, 구현 브리프 13줄 '어느 쪽을 써도 된다'). P10 몫으로 남는다 |

## 8. 다른 P 에 넘길 메모

- **P5c**
  - 표본 검토 · 사람 확인을 쓸 때 문항 번호는 `cell.items`(itemsOf)에서 고르고, 검토 파일 경로는 보기 화면과 같은 함수(`reviewPathOf` 를 내보내 `parseCellKey` 로)로 정한다(M-1 · M-3).
  - `resolveSeedFile` 은 `path.resolve` 의 글자 풀기라 심볼릭 링크를 따라가지 않는다(files.ts:79~83). 읽기만 하는 P5b 에는 해가 없지만, P5c 가 쓰기 전에 `realpathSync` 로 부모 폴더가 뿌리 안인지 한 번 더 보면 seed/ 안 링크가 밖으로 쓰는 길이 막힌다.
  - spec-trace 는 AC-7f 를 이미 덮였다고 센다(missing-test −1). AC-7f 의 '오류와 메모를 남기면 seed/reviews/ 에 한 행' 절반은 P5c 시험이 맡아야 하고, 빠져도 spec-trace 가 알리지 않는다.
  - 견본 풀이 기록은 해시가 칸과 달라 늘 unchecked 다. 사람 확인 쓰기 시험은 `cellHash` 로 맞춘 기록을 만들어야 풀이 표 · '정답 맞음 · 고침'이 그려진다(M-5).
  - `isAiItem` 을 core 에서 내보내는 공용 변경 한 줄(M-2).
- **P6c(목업 맞추기)** 아이 화면 틀 안 머리말 다섯('오늘의 새 단어' · '과제' · '예시' · '단어 상자' · '힌트')은 목업 글을 그대로 옮겼다. 목업을 고치면 common.tsx:255 · writing.tsx:140 · 145 · 177 · 200 을 함께 고친다.
- **P8 · 시드 표본** 평가 · 배치 · 이야기 파일은 문항 하나가 규격에 어긋나면 파일 전체가 칸 없이 오류 목록만 보인다(P4c `collectCells` 계약, 수업 칸만 날 JSON 으로 남음). 표본 검토 때 그런 파일은 `pnpm seed:validate` 로 먼저 고친다.
- **P10** `AREA_TONE` 색 값(common.tsx:31~36)과 종이 색(:39)이 지금은 hex 그대로다. board 토큰을 만들 때 globals.css 로 옮긴다. 아이 화면 틀 너비 820(cell-view.tsx:61)은 `TABLET_10_9_VIEWPORT` 와 같은 수를 따로 적은 것이다.
- **P11** 그림 찾기는 `ofWord` · `ofKey` 둘을 준다(DB 판). 보기 · 타일 · 소리 자리는 `<button aria-disabled="true" data-choice>` 라 동작만 붙이면 된다. `reveal` 은 보기 · 타일 답 칸 · 받아쓰기 · 빈칸 · 문장 고치기에만 닿는다. 안내 문장('이 뜻이 되게 카드를 놓아요' 등)은 아직 없다.

## 9. 판정

Approved. Critical 0 · Important 0 · Minor 7. Minor 는 고치지 않아도 이번 변경을 믿을 수 있고, M-1 · M-3 은 P5c 가 쓰기를 더하기 전에 고치는 것이 좋다.
