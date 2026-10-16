# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P5b 활동 표시 컴포넌트와 로컬 전용 시드 보기 화면

spec: `specs/` 정본(11절 1-가 (2-1) 시드 보기 화면, 4절 첫 문단 아이 화면 원칙 · 포스트잇 보드 · '단원 미리보기' 행(2차가 이 화면의 보기 부분을 다시 씀), 3.3 영역별 세션 순서 · 단계표, 6.3 출력 규격 · 사람 표본 검토, 6.4 풀이 검사 행, 10절 접근 제어, 15절 AC-7f · NFR-5, 13절 C57 '/dev/* 도 쿠키', approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P5 행 · 위험 13 · 화면 구현 · 검토 루프 · 공통 사실 · 정할 것 `plan-p05a-풀이-검사.md` · 시드 규격 `plan-p04a-규격.md` · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-16 · 상태: approved
승인: 컨트롤러 2026-10-16 23:2x(C62, P5a '컨트롤러 결정'. 요청자는 PR 병합 때 본다) · 브랜치 · 워크트리: `feature/1a-p05b-seed-viewer`(P2b b1b17d7 · P3b(커밋 뒤) · P4c 6bd6015 를 컨트롤러가 합친 줄기 위, 격리 워크트리 하나, 정할 것 가) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P5 셋 가운데 둘째다. 첫째 `plan-p05a-풀이-검사.md`(풀이 검사 명령, P5 전체의 확인한 사실 · 정할 것 가~하), 셋째 `plan-p05c-보기-기록.md`(이 화면에 표본 검토 · 사람 확인 쓰기를 더함)와 함께 읽는다. P5a 와 함께 돌 수 있다(P5a 코드를 쓰지 않는다). 확인한 사실 번호는 P5a 표의 번호다.

컨트롤러 결정(2026-10-16 23:2x): 승인. 정할 것 가 · 아 · 자 · 타 · 파의 판정은 `plan-p05a-풀이-검사.md` '컨트롤러 결정' 문단. 바탕 줄기(P2b + P3b + P4c)는 P3b 커밋 뒤 컨트롤러가 만든다 — 그때까지 시작하지 않는다.

## 목표 (Goal)

11절 (2-1)의 시드 보기 화면을 만든다. 로컬 개발 서버(next dev)에서만 열리는 어른용 화면이고, seed/ 의 내용 파일 하나를 골라 칸마다 아이 화면 모습에 정답 · 해설 · 새 단어를 덧붙여 보인다. 프리뷰 · 운영 빌드에서는 그 주소가 열리지 않는다(AC-7f, 정할 것 아). /dev/* 도 가족 접근 쿠키가 있어야 열린다(C57).
아이 화면 모습은 이 plan 이 만드는 활동 표시 컴포넌트(`src/components/activities/`)로 그린다. 아이 화면이 쓸 것의 첫 판이고(묶음 위험 13), P11 이 상호작용만 더하며 2차 단원 미리보기가 다시 쓴다(4절 단원 미리보기 행). 범위는 읽기 · 쓰기 · 말하기 수업과 평가 · 배치 문항 · 토리 이야기의 내용 부분이고, 회화 카드는 어른용 표로만 보인다(정할 것 파).
아이 화면 원칙은 4절 그대로다. 한 화면 한 행동, 안내 · 한국어 뜻 20px · 영어 학습 문장 24px · 버튼 글자 22px 이상, 누르는 곳 56 × 56px 이상, 퍼센트 없음. 포스트잇 색(노랑 읽기 · 하늘 쓰기 · 분홍 말하기 · 연두 회화)까지 두고 코르크 바탕 · 종이 띠 · 글꼴은 P10 의 board 가 맡는다.
이 plan 은 읽기만 한다. 표본 검토 · 사람 확인 쓰기는 P5c 다.

## 바뀌는 파일 (Files that change)

P5b 가 쓰는 파일은 열이다(모두 새 파일). 공용 변경은 이 절 끝 '요청하는 공용 변경'.

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/components/activities/common.tsx` | 신규 | 영역 색 · 활동 카드 · 보기 목록 · 단어 그림 · 새 단어 미리보기 · 소리 자리 표시(아래 '활동 표시 컴포넌트') |
| `src/components/activities/reading.tsx` | 신규 | 지문 · 읽기 문항 · 평가 · 배치 읽기 문항 · 토리 이야기 글과 질문 |
| `src/components/activities/writing.tsx` | 신규 | 쓰기 1~3단계 문항 갈래 일곱 · 4~5단계 문장 틀 · 6단계부터 과제 · 평가의 빈칸 채우기 · 문장 고치기 · 작문 문항 |
| `src/components/activities/speaking.tsx` | 신규 | 따라 말하기 · 듣기 · 질문 · 그림 보고 말하기 · 발표 · 평가 · 배치 말하기 문항 |
| `src/app/dev/seed-viewer/page.local.tsx` | 신규 | 보기 화면(서버 컴포넌트). 목록 · 파일 · 칸. next dev 에서만 경로가 된다(공용 변경 1) |
| `src/app/dev/seed-viewer/cell-view.tsx` | 신규 | 칸 하나: 화면 차례마다 아이 화면 틀(너비 820px) + 어른용 덧붙임 · 풀이 검사 결과 · 표본 검토 행(읽기만) |
| `src/app/dev/seed-viewer/talk-card.tsx` | 신규 | 회화 카드 · 회화 평가 장의 어른용 표 |
| `src/server/seed-viewer/files.ts` | 신규 | `server-only`. 시드 뿌리 · 내용 파일 목록 · 파일 읽기 · 경로 확인(P5c 가 쓰기를 더한다) |
| `tests/e2e-local/seed-viewer.spec.ts` | 신규 | AC-7f 보기 · 열리는 칸 갈래 · 아이 화면 밖 칸 · 쿠키 · 4절 크기(P5c 가 시험을 더한다) |
| `tests/e2e/seed-viewer-absent.spec.ts` | 신규 | AC-7f 운영 빌드에서 404 |

### 로컬 전용 길(정할 것 아)

- next.config 를 함수 꼴로 바꿔 `phase === PHASE_DEVELOPMENT_SERVER` 일 때만 `local.tsx` 를 pageExtensions 에 넣는다(공용 변경 1). 그래서 `page.local.tsx` 는 next dev 에서만 경로가 되고, next build(로컬 · 프리뷰 · 운영 모두 같은 빌드 단계)에서는 빠진다. P2b 의 `preview.tsx`(VERCEL_ENV=production 에서만 뺌)는 그대로 둔다(확인한 사실 5 · 6).
- 같은 폴더의 `cell-view.tsx` · `talk-card.tsx`(와 P5c 의 `actions.ts` · `review-panel.tsx`)는 특수 파일 이름이 아니라 경로가 아니고, `page.local.tsx` 가 빠진 빌드에서는 아무도 가져오지 않아 묶음에 들지 않는다.
- 두 겹: `page.local.tsx` 첫 문장은 `assertSeedViewerLocal()`(`files.ts`, NODE_ENV 가 development 가 아니면 `notFound()`)다. P5c 의 서버 액션도 같은 함수를 부른다. 운영 빌드의 404 는 e2e 가 본다(증명).
- 의존 규칙 `seed-viewer-only-from-viewer`(공용 변경 5, 권함): `src/server/seed-viewer` 는 `src/app/dev/seed-viewer` · 자기 폴더에서만 가져온다. 앱 화면이 seed 읽기 · 쓰기를 가져와 운영 묶음에 넣는 일을 막는다.
- 속성 타입은 손으로 적는다(`{ searchParams: Promise<Record<string, string | string[] | undefined>> }`). `PageProps<"/dev/seed-viewer">` 는 빌드의 경로 타입에 없어 타입 오류가 난다.
- `metadata` 는 `{ title: "시드 보기", robots: { index: false, follow: false } }`(P2b 관찰 페이지와 같은 꼴).

### 보기 화면(page.local.tsx)

주소는 `/dev/seed-viewer`(목록), `?file=<내용 파일 경로>`(파일), `&cell=<칸 키>`(칸)이다. 값은 URL 인코딩이고 P5a `seed:check` 가 사람 확인 칸을 이 꼴로 낸다. 화면 글은 어른용이라 정본 문구 규칙 밖이다(해요체로 쓴다). 아이 화면 틀 안에는 새 문구를 만들지 않는다.

| 화면 | 보이는 것 |
|---|---|
| 목록 | 시드 뿌리의 내용 파일(lessons · level-tests · placement · stories)을 영역 · 단계 차례로 묶은 링크. checks · reviews · prompts · manifest · reports 는 목록에 없다. 뿌리 폴더가 없으면 '시드 뿌리 폴더가 없어요: <경로>' |
| 파일 | 칸 목록(칸 키 · 종류 · 수업 제목 또는 문항 유형 · 풀이 검사 상태 · 표본 검토 행 수)과 그 파일의 규격 · 배치 오류, 규격 파일 오류 수. 상태는 `solveStatus` 를 '통과 · 사람 확인 · 풀이 검사 안 됨 · 대상 아님'으로 보인다 |
| 칸 | 머리(칸 키 · 종류 · 제목 · 상태 · 내용 해시 앞 12자) → 화면 차례(아래 표)마다 '아이 화면' 틀과 덧붙임 → 풀이 검사(대상 문항마다 판단 · 풀이 답 · 후보 · 사람 확인 결정, 기록 해시가 지금과 다르면 '내용이 바뀌어 풀이 검사가 안 됐어요') → 표본 검토 행 목록(날짜 · 사유 · 문항 · 메모, 읽기만) |

아이 화면 틀은 `role="region"` · `aria-label="아이 화면 <n>"`, 너비 820px(10.9형, `TABLET_10_9_VIEWPORT`)이고 틀 위에 어른용 이름표 '활동 <n> · <활동 이름> · 문항 <itemsOf 번호>'를 둔다. 덧붙임은 `aria-label="덧붙임 <n>"` 칸이고 머리글은 '정답' · '해설' · '새 단어' 등(아래 표)이다. 4절 '이보다 작은 글자는 부모용 정보에만'에 따라 덧붙임은 작은 글자를 써도 된다.

| 칸 | 화면 차례(활동) | 덧붙임 |
|---|---|---|
| 읽기 수업 | 새 단어 미리보기 → 지문 → 문항 1..n | 정답(번호 · 보기 글) · 해설 · 새 단어(미리보기 · newWords · unitWords) · 글로서리 · targetWords · 목록 제목 |
| 쓰기 수업(items) | 새 단어 미리보기 → 문항 1..n(갈래별) | 허용 정답 전부 · pick-word 정답 번호 · 새 단어 |
| 쓰기 수업(guided) | 새 단어 미리보기 → 과제(과제 · 예시) → 문장 1..n(문장 틀 · 단어 상자) | 모범 문장 · 힌트 · 채점 기준 · 새 단어 |
| 쓰기 수업(composition) | 새 단어 미리보기 → 과제(과제 · 예시 · 힌트) | 채점 기준 · 새 단어 · '생각 꺼내기 · 첨삭은 실시간 호출이라 시드에 없어요' |
| 말하기 수업 | 새 단어 미리보기 → 따라 말하기 낱말 1.. → 문장 1.. → 듣기 1.. → 질문 1.. → 그림 보고 말하기 → 발표(주제 · 쓸 말) | 듣기: 읽어 줄 글 · 정답 / 질문: 한국어 뜻 · 바른 답 · 허용 답 / 그림: 장면 설명(아이에게 안 보임) / 발표: 예비 확인 질문 / 새 단어 |
| 단계 평가 문항(읽기 · 쓰기 · 말하기) | 문항 하나(유형별) | 정답 · 허용 정답 · 해설 · 연결 단원 · 유형 · AI 과제 여부 |
| 배치 문항 | 문항 하나 | 정답 · 허용 정답 · 예비 문항 여부 |
| 토리 이야기 | 이야기 글(1~3 · 4~6 구간은 한국어 뜻) → 질문 1 · 2 | 정답 · 해설 |
| 회화 카드 | 아이 화면 없음(1-나, 정할 것 파) | 어른용 카드 표(talk-card.tsx): 주제 · 목표 표현 · 인사(질문 또는 첫 말) · 오늘 쓸 말 · 대화 첫 질문 · 대화 턴(질문 영어 · 뜻 · 노리는 단어 · 처음 · 다시 · 힌트 단 · 답 두 개 · 그림) 또는 질문 목록 · 더 이야기할 거리 · 정리 · 끝인사 · 안전한 대사 · 미션 |
| 회화 평가 장 | 아이 화면 없음 | 어른용 장 표: 첫 말 · 턴마다 질문 · 허용 답(틀 자리 품사) · 아이가 할 말 뜻 · 영어 틀 · 영어 문장 · 연결 단원 |
| 규격이 깨진 칸 | 없음 | 날 JSON 과 그 칸의 규격 오류 |

### 활동 표시 컴포넌트(src/components/activities, 정할 것 파)

| 파일 | 내보내기(제안) | 그리는 것 |
|---|---|---|
| `common.tsx` | `AREA_TONE` · `ActivityCard` · `ChoiceList` · `VocabPicture` · `NewWordsPreview` · `SoundMark` | 영역 색 이름(포스트잇 노랑 · 하늘 · 분홍 · 연두, 목업 B_Home4 의 색), 활동 카드(영역 색 · 둥근 카드, `className` 을 받아 P10 이 덮음), 보기 목록(글 보기 · 그림 보기, 버튼 꼴 `aria-disabled="true"`, `reveal` 이면 정답 보기에 ✓ 아이콘과 `data-correct="true"`), 단어 그림(정사각 그림 하나 — 같은 너비 · 높이 · `object-contain`, `next/image` `unoptimized`, alt 는 한국어 뜻, 파일이 없으면 alt 글), 새 단어 미리보기(낱말 · 뜻 · 예문), 소리 자리 아이콘(lucide `Volume2`, 글자 없음, 이름표는 목업의 '다시 듣기') |
| `reading.tsx` | `ReadingPassage` · `ReadingQuestion` · `ReadingTestItem` · `StoryText` · `StoryQuestion` | 지문(글로서리 낱말에 밑줄 — 누르면 뜻은 P11), 질문과 보기 넷, 평가 · 배치 읽기 문항(지문 + 질문), 토리 이야기 글(+ 한국어 뜻) · 질문(보기 셋) |
| `writing.tsx` | `WritingItem` · `WritingGuidedTask` · `WritingGuidedSentence` · `WritingComposition` · `FillBlankItem` · `FixSentenceItem` · `CompositionTestItem` | pick-word(그림 + 보기), copy-tiles(낱말 + 글자 타일), build-tiles(한국어 뜻 + 타일), fill-letters(빈 글자 꼴 + 타일), dictation(소리 자리 + 빈 답 칸, 낱말을 보이지 않음), assemble-phrase · assemble-sentence(한국어 뜻 + 카드, 카드는 시드 그대로 소문자 · 문장 부호 카드 따로), 문장 틀 + 단어 상자, 과제 · 예시 · 힌트 |
| `speaking.tsx` | `RepeatItem` · `ListeningItem` · `SpeakingQuestion` · `PictureTask` · `PresentationTask` · `SpeakingTestItem` | 따라 말할 낱말 · 문장(+ 소리 자리), 듣기(읽어 줄 글은 그리지 않음, 소리 자리 · 질문 · 보기), 질문(영어 + 1~4단계 한국어 뜻, C39), 그림 2~3장 + 질문, 발표 주제 · 쓸 말 세 개(생각 화면, speaking.prepare_seconds 수는 보이지 않음) |

지킬 것:
- 내용 부분만 그린다. 누르는 버튼(다음 · 확인 · 다시 듣기 · 말하기 · 처음부터 · 다 놓았어요)과 상태 · 진행 표시 · 세션 틀은 P11 · P10 이다. 아이에게 보일 글은 시드 글과 정본 · 목업 글뿐이다. 목업과 정본이 다르면 정본이 이기고(4절), 11절 '고칠 목업' 표의 빼는 것(퍼센트 · '"is"가 빠졌어요' · 별 수 등)은 그리지 않는다.
- 크기(4절): 안내 · 한국어 뜻 `text-xl`(20px) 이상, 영어 학습 문장 `text-2xl`(24px) 이상, 보기 · 버튼 꼴 글자 `text-2xl`(22px 이상), 누르는 곳 `min-h-14 min-w-14`(56px) 이상, 퍼센트 없음. P3b 접근 코드 화면과 같은 표기다. 4절 값은 잠정이라 사용 시험 뒤 바뀔 수 있다 — 클래스 이름은 컴포넌트 안 한곳(`common.tsx` 의 이름 붙인 상수)에 모은다.
- 서버 · 클라이언트 둘 다에서 쓸 수 있게 훅 · 'use client' · server-only 가져오기 없이 속성만으로 그린다. 속성은 P4a 규격 타입(`ReadingQuestion` · `WritingItem` · `Listening` · `Story` …)과 그림 찾기 함수(`(word) => { image?, meaningKo }`)를 받는다.
- `reveal`(기본 거짓)은 정답 표시다. 보기 화면은 참으로 그리고, P11 은 3.3 '틀리면 정답을 보여 주고 다시 한다'에 같은 속성을 쓴다.
- 그림은 `next/image`(biome noImgElement, 확인한 사실 14)이고 경로는 images.json 의 `file`(public/ 아래)이다. P6 카탈로그는 `public/images/vocab/<키>.svg`(Twemoji v17.0.3 CC-BY 4.0 받은 SVG 와 모자란 낱말을 그린 SVG `generated`, 확인한 사실 17)라 `unoptimized` 로 그 파일을 그대로 내보낸다. src 가 `.svg` 로 끝나면 Next 가 저절로 그렇게 하므로 `dangerouslyAllowSVG` 는 필요 없다(확인한 사실 16 — P6 메모의 '막힐 수 있다'는 최적화기를 거칠 때 얘기다). 그림 자리는 정사각 하나다. 덧붙임에 그림 키 · 라이선스 · 저작자 표시를 적는다(H7 확인용). 그림 파일은 P6b · H7 뒤에 생기고 그 전에는 alt 가 보인다.

### 서버 읽기(src/server/seed-viewer/files.ts)

| 함수(제안) | 하는 일 |
|---|---|
| `assertSeedViewerLocal()` | `process.env.NODE_ENV !== "development"` 이면 `notFound()`(쪽 · P5c 서버 액션의 두 번째 겹) |
| `seedViewerRoot()` | `SEED_VIEWER_ROOT`(있으면, 상대 경로는 `process.cwd()` 기준) 아니면 `seed`(seed-validate 의 기본과 같음) |
| `resolveSeedFile(root, seedPath)` | `parseSeedPath` 가 받는 경로만 받는다. 절대 경로 · `..` 를 거부하고, 풀어 낸 경로가 뿌리 안인지 본다. P5c 쓰기도 쓴다 |
| `listContentFiles(root)` | lessons · level-tests · placement · stories 아래 `.json` 가운데 내용 파일만(영역 · 단계 · 단원 차례) |
| `loadContentFile(root, contentPath)` | 규격 파일 열(SEED_FILES) + 그 내용 파일 + `checks/<경로>` + 그 칸들의 `reviews/<영역>-<단계>.json` 을 읽어 `collectCells` → `{ cells(그 파일 것), records, index, errors(그 파일 것), referenceErrors, reviews(칸 키 → 행) }`. 칸마다 `cellHash` · `solveStatus` · `itemsOf` 를 함께 낸다. 이야기 칸의 검토 파일은 회화 · 구간 첫 단계(`reviews/talk-1.json` 꼴) |

`node:fs` 는 이 파일에서만 쓴다(core-no-io 는 src/core 만 본다). 시각을 읽지 않는다. 시드 전체 검증(`validateSeed`)은 돌리지 않는다 — 칸 검사 결과는 `pnpm seed:validate` 로 본다(보기 화면 머리에 그 명령을 한 줄 적는다).

### 시험 자료와 화면 사진

- e2e-local 은 `test.beforeAll` 에서 `SEED_VIEWER_E2E_ROOT`(공용 변경 3)를 지우고 `writeSeedTree(root, sampleSeedTree(smallReferenceSet()))` 를 쓴다(P4a 견본 `lessonSamples`: 단원 1 의 읽기 1 · 4단계, 쓰기 1 · 3 · 4 · 6단계(items · guided · composition), 말하기 1 · 6 · 10단계(그림 보고 말하기 · 발표 포함), 회화 1 · 3 · 4 · 5단계 수업과 읽기 · 회화 단계 평가, 말하기 배치, 토리 이야기 1~3 구간, 읽기 4단계 수업의 풀이 기록 하나 · 검토 행 하나). 기대 글은 견본 객체에서 읽는다(시험에 박지 않는다). 꽉 찬 1단계 나무가 필요한 사례는 `miniSeed({ areas, through: 1, frame: 'small' })` 를 쓴다.
- P6a 의 실데이터(규격 파일 열, 확인한 사실 17)가 합쳐진 뒤 컨트롤러가 실시드 뿌리(`seed`)로 보기 화면을 한 번 열어 실데이터 꼴(vocab 약 2,000항목 · SVG 그림)에서 깨지지 않는지 본다. e2e-local 은 계속 견본 나무를 쓴다.
- `E2E_SEED_VIEWER_SCREENSHOTS=<폴더>` 가 있으면 읽기 · 쓰기 · 말하기 · 단계 평가 · 토리 이야기 아이 화면 틀을 한 장씩 남긴다(화면 검토용, P3b 의 `E2E_ACCESS_SCREENSHOT` 과 같은 꼴).

### 요청하는 공용 변경(컨트롤러가 합친다)

이 plan 의 구현자가 합친 줄기 위 워크트리에서 1~6 을 글자 그대로 옮긴다(정할 것 가). 다른 줄기와 합칠 때 컨트롤러가 충돌을 푼다.

1. `next.config.ts` 를 함수 꼴로(P1a 의 reactCompiler · agentRules · turbopack, P2b 의 preview.tsx, P3b 의 authInterrupts 를 그대로 담는다).

```ts
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/** 기본 쪽 확장자 넷. 목록을 바꾸면 proxy.ts · instrumentation 도 이 목록으로 잡힌다(P2b). */
const BASE_PAGE_EXTENSIONS = ["tsx", "ts", "jsx", "js"];
/** 관찰 페이지(page.preview.tsx)는 Vercel 운영 배포(VERCEL_ENV=production) 빌드에서만 뺀다(P2b, plan-p02 다-1). */
const PREVIEW_PAGE_EXTENSION = "preview.tsx";
/** 로컬 전용 화면(page.local.tsx, 시드 보기)은 next dev 에서만 넣는다. 프리뷰 · 운영 · 로컬 next build 에서 빠진다(P5b, AC-7f). */
const LOCAL_PAGE_EXTENSION = "local.tsx";

export default function nextConfig(phase: string): NextConfig {
  const isProductionDeployment = process.env.VERCEL_ENV === "production";
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    reactCompiler: true,
    agentRules: false,
    // unauthorized() 로 페이지 · 서버 액션 · Route Handler 가 401 을 낸다(C55 (4), P3b)
    experimental: { authInterrupts: true },
    pageExtensions: [
      ...BASE_PAGE_EXTENSIONS,
      ...(isProductionDeployment ? [] : [PREVIEW_PAGE_EXTENSION]),
      ...(isDevServer ? [LOCAL_PAGE_EXTENSION] : []),
    ],
    turbopack: {
      root: import.meta.dirname,
      rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
    },
  };
}
```

2. `package.json` 의 scripts 에 한 줄.

```json
"e2e:local": "playwright test --config playwright.local.config.ts"
```

3. 새 파일 `playwright.local.config.ts`(뿌리, 정할 것 자). 시험용 접근 코드 · 해시는 `playwright.config.ts` 를 가져올 때 만들어진다(P3b 공용 변경 4 — 일꾼 프로세스도 같은 값을 쓴다).

```ts
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
// playwright.config 를 가져오면 시험용 E2E_ACCESS_CODE · E2E_ACCESS_CODE_HASH 가 만들어진다(P3b)
import { TABLET_10_9_VIEWPORT } from "./playwright.config";

/** 로컬 전용 화면 시험의 개발 서버 자리(e2e 3100 · 요청자 개발 서버 3000 과 다르게). */
const E2E_LOCAL_PORT = 3200;
/** next dev 시작 시간 상한(기술 값). */
const SERVER_START_TIMEOUT_MS = 120_000;
/** 개발 서버의 첫 컴파일까지 든 시험 하나의 시간 상한(기술 값). */
const TEST_TIMEOUT_MS = 60_000;
const CI_RETRIES = 1;
/** 시드 보기 화면이 읽고 쓰는 시험용 시드 뿌리(tests/.tmp 는 .gitignore · tsconfig 에서 빠져 있다). */
export const SEED_VIEWER_E2E_ROOT = join(__dirname, "tests", ".tmp", "seed-viewer-e2e");

const serverEnv: Record<string, string> = {};
for (const [name, value] of Object.entries(process.env)) {
  if (value !== undefined) serverEnv[name] = value;
}
serverEnv.ACCESS_CODE_HASH = process.env.E2E_ACCESS_CODE_HASH ?? "";
serverEnv.SEED_VIEWER_ROOT = SEED_VIEWER_E2E_ROOT;

export default defineConfig({
  testDir: "tests/e2e-local",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? CI_RETRIES : 0,
  workers: 1,
  timeout: TEST_TIMEOUT_MS,
  use: { baseURL: `http://localhost:${E2E_LOCAL_PORT}` },
  projects: [
    {
      name: "tablet-10-9-webkit",
      use: { ...devices["iPad Pro 11"], viewport: TABLET_10_9_VIEWPORT },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${E2E_LOCAL_PORT}`,
    url: `http://localhost:${E2E_LOCAL_PORT}`,
    // 진짜 seed/ 를 읽는 요청자 개발 서버를 시험이 쓰지 않는다(P5c 시험은 seed/reviews 에 쓴다)
    reuseExistingServer: false,
    timeout: SERVER_START_TIMEOUT_MS,
    env: serverEnv,
  },
});
```

4. `.env.example` 에 두 줄.

```
# 시드 보기 화면(로컬 next dev 전용)의 시드 뿌리. 비우면 seed — P5
SEED_VIEWER_ROOT=
```

5. (권함) `.dependency-cruiser.cjs` 에 규칙 하나와 `tests/unit/dependency-rules.test.ts` 에 막는 예(`src/app/page.tsx` → `src/server/seed-viewer/files.ts`) · 허용 예(`src/app/dev/seed-viewer/page.local.tsx` → 같은 파일) 두 줄.

```js
{
  name: "seed-viewer-only-from-viewer",
  comment:
    "로컬 전용 시드 보기(src/server/seed-viewer, seed/ 읽기 · 쓰기)는 그 화면(src/app/dev/seed-viewer)과 자기 폴더에서만 가져온다. 앱 화면이 가져오면 운영 묶음에 seed 쓰기가 들어간다(P5b, AC-7f)",
  severity: "error",
  from: { pathNot: "^src/(app/dev/seed-viewer|server/seed-viewer)/" },
  to: { path: "^src/server/seed-viewer/" },
},
```

6. (권함, 정할 것 자) `.github/workflows/ci.yml` 에 작업 하나. 준비 다섯 줄은 P2b 의 e2e 작업과 같다.

```yaml
  e2e-local: # P5b. 로컬 전용 시드 보기 화면(next dev)을 시험용 시드 나무로 연다. API 0회
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6 # 판은 package.json 의 packageManager 에서 읽는다
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps webkit
      - run: pnpm e2e:local
```

## 작업 순서 (Order of work)

한 구현자(implementer · Opus · high)가 차례로 한다. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴이다. Next 코드는 설치판 문서 `node_modules/next/dist/docs/` 를 먼저 본다. 같은 폴더에서 `pnpm dev` 가 돌고 있으면 `pnpm e2e:local` 의 개발 서버가 뜨지 않는다(위험 3).

1. [문서][검증] 공용 변경 1~6 을 옮기고 빈 `page.local.tsx` 하나로 길을 확인한다. `pnpm build` 가 통과하고 경로 목록에 `/dev/seed-viewer` 가 없다. `pnpm dev` 에서는 그 주소가 쿠키 없이 접근 코드 화면(401)이다. 완료: 두 출력이 구현 보고에 있다.
2. [검증] 시험 먼저. `tests/e2e-local/seed-viewer.spec.ts` · `tests/e2e/seed-viewer-absent.spec.ts` 를 쓰고 실패를 본다. 완료: 실패 출력.
3. [서버] `src/server/seed-viewer/files.ts`. 완료: `pnpm check:deps` 0(공용 변경 5 포함), 한 시계 훑기 시험 통과.
4. [화면] 활동 표시 컴포넌트 `common.tsx` · `reading.tsx` · `writing.tsx` · `speaking.tsx`. 완료: `pnpm build` 통과.
5. [화면] 보기 화면 `page.local.tsx` · `cell-view.tsx` · `talk-card.tsx`. 완료: `pnpm e2e:local` 통과.
6. [검증] 마무리. `pnpm e2e` 통과(운영 빌드 404), 화면 사진 다섯 장(`E2E_SEED_VIEWER_SCREENSHOTS=.superpowers/sdd/2026-10-16-1-가-구현`, 파일 이름 `p05b-<갈래>.png`), CI 와 같은 순서 `pnpm install --frozen-lockfile` → `pnpm exec biome ci .` → `pnpm build` → `pnpm test` → `pnpm test:int` → `pnpm e2e` → `pnpm e2e:local` → `pnpm check:deps` → `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` → `pnpm check:bundle`, 비밀값 grep 0건. 완료: 출력이 구현 보고에 있고 spec-trace missing-test 가 시작 때보다 1 적다(AC-7f).
7. [사람] 검토 · 커밋(H14). code-reviewer(Opus · xhigh)와 design-reviewer(Opus · xhigh)를 나란히 띄운다. design-reviewer 기준은 4절(크기 · 문구 · 한 화면 한 행동 · 퍼센트 없음)과 목업 B_Reading · B_W1_Words · B_W3_Order · B_Writing · B_Speaking · B_LevelTest(11절 '고칠 목업' 표의 빼는 것은 빼고 본다, 목업 승인 H6 은 P6)다. fix(3회까지) 뒤 요청자 지시로 컨트롤러가 커밋한다. 완료: 커밋.

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 로컬 전용이 새어 프리뷰 · 운영 주소에서 seed 를 읽는 화면이 열린다 | 시드 정답이 공개 주소에 보인다(쿠키 뒤지만) | next dev 단계에서만 쪽이 생기는 길 + 쪽 안 NODE_ENV 확인 두 겹, 운영 빌드 404 e2e, 의존 규칙(공용 변경 5). 프리뷰 배포는 같은 빌드 단계라 같이 빠진다. H1 뒤 요청자가 프리뷰에서 404 를 한 번 본다(선택) |
| 2 | next.config 를 함수 꼴로 바꾸며 P2b · P3b 설정과 부딪친다 | 관찰 페이지 · 401 이 빠진다 | 합친 줄기 위에서 한다(정할 것 가). 공용 변경 1 이 셋을 모두 담는다. P2b e2e · P3b e2e 가 그대로 통과하는지 작업 6 에서 본다 |
| 3 | next dev 잠금(`.next/dev/lock`): 같은 폴더의 `pnpm dev` 가 돌면 e2e-local 개발 서버가 기존 서버를 알리고 끝난다(확인한 사실 5) | 요청자 컴퓨터에서 `pnpm e2e:local` 이 실패 | 요청자 개발 서버를 멈추고 돌린다(작업 순서 머리). 구현자 워크트리 · CI 는 폴더가 달라 부딪치지 않는다. `reuseExistingServer: false` 라 진짜 seed/ 를 읽는 서버를 시험이 쓰지 않는다 |
| 4 | 개발 서버가 쪽을 처음 컴파일하는 시간(추측 10~30초) | e2e-local 시간 넘김 | 시험 상한 60초 · 서버 120초(기술 값), 일꾼 하나 |
| 5 | 활동 표시를 P10 · P11 이 다시 짠다(묶음 위험 13) | 같은 그림 두 벌 | 내용 부분만 · `className` · `reveal` · 크기 상수 한곳. '다른 P 에 넘길 것'(보고)에 꼴을 적는다 |
| 6 | 목업이 정본과 다르다(11절 고칠 목업 표, P6 이 고치는 중) | 화면 검토가 목업 쪽으로 끌린다 | 정본이 이긴다(4절). design-reviewer 브리프에 11절 표를 넣는다. 고친 목업(H6) 뒤 P10 · P11 화면 검토가 다시 본다 |
| 7 | 그림 파일이 아직 없다(P6b · H7) | 그림 자리가 비어 보인다 | alt(한국어 뜻)가 보인다. 시험은 그림이 뜨는지 보지 않는다 |
| 8 | 실시드가 크면 칸을 열 때마다 규격 파일을 다 읽어 느리다(추측 — P6a 의 vocab 약 2,000항목 · settings 약 180행이면 수백 KB) | 보기 화면이 느리다 | P6a 뒤 실데이터로 한 번 재고, P8 표본 때 느리면 규격 파일 풀이를 모듈 안에 담아 둔다(바뀐 파일 시각으로 다시 읽기) |
| 9 | 4절 크기를 AC-N9 이름으로 시험하면 아이 화면 전부가 생기기 전에 덮였다고 센다 | spec-trace 가 AC-N9 를 일찍 지운다 | 크기 시험 이름에서 AC 를 뺀다. AC-N9 는 P10~P12 `font-size.spec.ts` 다 |
| 10 | 개발 서버에서만 생긴 경로 타입이 빌드 타입 검사에 남는다 | `pnpm build` 실패 | next build 는 `.next/dev/types` 를 걸러 낸다(확인한 사실 5). 속성 타입은 손으로 적는다 |

### 정할 것 · 제약 · 확인한 사실

정할 것은 `plan-p05a-풀이-검사.md` 표의 가 · 아 · 자 · 타 · 파 가 이 plan 에 닿는다. 제약은 P5a 와 같고 아래를 더한다.

- 아이 화면 틀 안에는 시드 글과 정본 · 목업 글만 둔다(해요체 · 한 화면 한 행동 · 퍼센트 없음). 어른용 글(목록 · 덧붙임 · 오류)은 해요체로 쓰고 작은 글자를 써도 된다.
- 시각은 이 plan 에서 읽지 않는다. 앱 코드의 시각은 한 시계(`src/server/clock`)에서만 읽는다(P5c).
- 접근 확인은 proxy 가 한다(쪽 요청, C57). 이 plan 에는 서버 액션 · Route Handler 가 없다(P5c 에 서버 액션).

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름) | 파일 · 명령 |
|---|---|---|
| AC-7f(보기) | e2e(로컬) "AC-7f 시드 보기: 읽기 수업 칸을 열면 아이 화면 모습에 정답 · 해설 · 새 단어가 붙어 보인다" | `tests/e2e-local/seed-viewer.spec.ts` · `pnpm e2e:local` |
| AC-7f(빌드에서 빠짐) | e2e "AC-7f 운영 빌드에서는 시드 보기 주소(/dev/seed-viewer)가 접근 쿠키가 있어도 404 다" + 작업 1 의 `pnpm build` 경로 목록 | `tests/e2e/seed-viewer-absent.spec.ts` · `pnpm e2e` |
| 보기 화면 | e2e(로컬) "시드 보기: 견본 시드의 내용 파일(쓰기 · 말하기 · 회화 카드 · 단계 평가 · 배치 · 토리 이야기)이 모두 화면 오류 없이 열리고 칸마다 머리가 보인다" · "시드 보기: 듣기 대본 · 그림 장면 설명은 아이 화면 밖 덧붙임에만 보인다" · "시드 보기: 접근 쿠키가 없으면 /dev/seed-viewer 도 접근 코드 화면(401)이다(C57)" | `tests/e2e-local/seed-viewer.spec.ts` |
| 4절 아이 화면 원칙 | e2e(로컬) "활동 표시: 아이 화면의 안내 20px · 영어 24px · 버튼 글자 22px 이상, 누르는 곳 56px 이상, '%' 가 없다" + design-reviewer 보고(심각도 · 근거, 화면 사진 다섯 장) | `tests/e2e-local/seed-viewer.spec.ts` · 장부 `review-p05b-design.md` |
| 공통 | `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm test:int` · `pnpm e2e` · `pnpm e2e:local` · `pnpm check:deps` · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec`(missing-test −1, AC-7f) · `pnpm check:bundle` 0, 비밀값 grep 0건. CI `ci / e2e-local`(공용 변경 6) | 작업 6 |

시험 이름은 글자 그대로 적는다(spec-trace). 시험 안의 글 · 숫자는 견본 시드 객체에서 읽는다.

## 완료 보고 (Done)

구현 뒤 채운다.
