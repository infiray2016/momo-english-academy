# fix 1 보고: P5b 활동 표시 컴포넌트 · 시드 보기 화면(impl-p05b, 2026-10-17 03:2x)

상태: DONE. 지적 열일곱(화면 I 2 · M 8, 코드 M 7)을 모두 ADDRESSED. 범위 밖 둘은 컨트롤러 판정대로 코드 변경 없음. 커밋 없음.

## 지적마다

### 화면 검토(review-p05b-design.md)

| 지적 | 판정 | 파일:줄 | 시험 |
|---|---|---|---|
| I-1 글자 채우기 단서 | ADDRESSED | writing.tsx:103~ fill-letters 위에 `VocabPicture(ofWord(item.word))` + `SoundMark`. 덧붙임에 그 그림 정보(cell-view `writingItemExtras`) | e2e-local '활동 표시: 지문 그림 · …'(:709) — 글자 채우기 화면마다 한국어 뜻(그림 대체 글)과 '다시 듣기' |
| I-2 지문 옆 단어 그림(C67 (6)) | ADDRESSED | common.tsx:29 `PASSAGE_PICTURE_MAX = 4` · :31 `PASSAGE_PICTURE_UNTIL_LEVEL = 4`, reading.tsx:65 `PassagePictures`(1~4단계만, 카탈로그에 있는 것 차례대로 최대 4, 문장마다 짝 짓지 않음) · :96 `ReadingPassage`(level · pictures · pictureWords). 수업은 newWords(cell-view `readingScreens`), 평가 · 배치는 연결 단원 단어(배치는 그 단계 단원 전부) 가운데 지문에 원형 · 활용형으로 나온 것(cell-view:460 `testPictureWords`). 토리 이야기는 그림 없음 | :709 — 읽기 4단계 지문 그림 수 = 새 단어 중 카탈로그에 있는 것(최대 4), 읽기 1단계 지문 · 읽기 평가 지문에 그림 줄, 이야기에 없음 |
| M-1 정답 표시 | ADDRESSED | common.tsx:158 `CorrectBadge`(✓ 원, `role="img" aria-label="정답"`), ChoiceList 정답은 종이 바탕 그대로 + `border-4` + 배지, 그림 보기는 배지를 `absolute top-2 right-2` 로 모서리에 | :709 — '정답' 그림 하나, 정답 칸 바탕 ≠ 카드 바탕, 그림 보기 넷의 그림 왼쪽 자리가 모두 같음 |
| M-2 그림 대체 글 크기 | ADDRESSED | common.tsx VocabPicture 대체 글에서 크기 클래스를 빼고 부모를 물려받는다. `ActivityCard`(:82)가 기본 크기 `CHILD_SIZE.guide`(20px)를 갖고 보기 안에서는 24px | 크기 시험(:522)이 `[data-choice]` 안 글 요소를 22px 이상으로 본다(:556) |
| M-3 글자 칸 · 빈칸 | ADDRESSED | 글자 칸 writing.tsx:47 `CHILD_SIZE.target`(56 × 56), common.tsx:25 `CHILD_SIZE.blank = "min-h-14"` 를 FrameText 빈칸에 | 크기 시험이 `[data-blank]` 높이 56 이상을 본다 |
| M-4 발표 쓸 말 | ADDRESSED | speaking.tsx:113 `PresentationTask` 쓸 말은 종이 칩 `ul > li`(영어 24px), 버튼 없음 | :709 · :600 — 발표 화면 버튼 0, 목록 항목 = 쓸 말 수 |
| M-5 소리 자리 | ADDRESSED | 새 단어 미리보기 낱말마다 `SoundMark`('다시 듣기'), 지문 머리 `SoundMark label="읽어 주기"`(reading.tsx:96~) | :709 — 미리보기 '다시 듣기' 수 = 미리보기 낱말 수, 지문 '읽어 주기' 하나 |
| M-6 새 단어만 표시 | ADDRESSED | reading.tsx `ReadingPassage` 는 원형이 markWords(newWords · targetWords)에 든 글로서리 표기형만 `data-new-word`(종이 바탕 · 굵게), 고유 명사 · 나머지 글로서리는 표시 없음 | :709 — 표시된 글이 모두 그 표기형, 하나 이상 |
| M-7 한국어 뜻 단계 | ADDRESSED | 컴포넌트는 `showKo` 일 때만(reading.tsx:225 `StoryText` · speaking.tsx:66 `SpeakingQuestion` · `SpeakingTestItem`). cell-view 가 정한다: 이야기는 `STORY_KO_BANDS`, 말하기 질문(수업 · 평가)은 그 단계 말하기 규격 `questions.koMeaning`(cell-view:127 `speakingKo`, C39 를 담은 P4a 규격 칸 — 단계 숫자를 새로 두지 않음). 숨긴 뜻은 덧붙임에 '(이 단계는 · 이 구간은 아이에게 안 보임)'으로 | :709 — 말하기 1단계 질문 뜻 보임, 이야기 1~3 보임 · 7~9 안 보임(덧붙임에만), :600 — 말하기 6단계 평가 질문 뜻 안 보임 |
| M-8 가로 넘침 | ADDRESSED | cell-view:71 `CHILD_FRAME_BLEED = "-mx-6"` 로 아이 화면 틀을 main 여백(px-6) 밖으로, 틀의 둥근 모서리 · 좌우 테두리를 뺌 | 크기 시험이 칸마다 `scrollWidth ≤ clientWidth` 를 본다(:579) |

### 코드 검토(review-p05b.md)

| 지적 | 판정 | 파일:줄 | 시험 |
|---|---|---|---|
| M-1 '문항 k' 손셈 | ADDRESSED | Screen 이 itemsOf 경로(`itemPath`, 예 `content.questions.0`)를 갖고 번호는 `cell.items` 에서 찾는다(cell-view:838 `itemNoOf`). 말하기 `no` 손셈 없앰 | :600 — 말하기 1단계 칸 이름표의 문항 번호 열 = `itemsOf(cell)` 번호 열 |
| M-2 isAiItem 두 벌 | ADDRESSED | `src/core/seed/check-assessment.ts:225` `export function isAiItem`(공용 변경 한 줄, 브리프 허용), cell-view:37 · 587 이 가져옴. 복제 삭제 | :600 — 작문 '예(실시간 채점)', 빈칸 채우기 '아니오(앱 채점)', 허용 답 없는 질문 '예' |
| M-3 칸 키 손 가르기 | ADDRESSED | files.ts:196 `export function reviewPathOf(key)` 가 `parseCellKey` 로 영역 · 단계 · 구간을 푼다(P5c 가 같은 함수로 쓴다). 배치 예비는 cell-view:590 `ref?.type === "placement" && ref.spare` | :600 · 기존 '내용 파일 모두' 시험(검토 행이 칸에 붙음) |
| M-4 규격 타입 · 두 번 as | ADDRESSED | reading.tsx:178 `ReadingTestItemData` = P4a `ReadingTestItem` ∣ `z.infer<ReadingPlacementItemSchema>`, speaking.tsx:143 `SpeakingTestItemData` 같은 꼴, `StoryText` · `StoryQuestion` · `SpeakingQuestion` · `PictureTask` · `GlossaryEntry` 도 P4a 타입에서. cell-view 는 `cell.value` 에서 한 번만 `as`(이중 `as` 0) | tsc · build |
| M-5 갈래 넷 시험 | ADDRESSED | 시험 시드에 해시를 `cellHash` 로 맞춘 읽기 1단계 풀이 기록(같음 · 다름+사람 확인 · 답이 여럿), 검토 행, 규격이 깨진 수업(lessons/reading/2/1.json), 쓰기 4단계 평가(빈칸 · 고치기 · 작문), 말하기 6단계 평가(질문 · 발표 · 따라 말하기), 7~9 구간 이야기를 더 쓴다(seed-viewer.spec.ts `extraFiles`) | 새 시험 '시드 보기: 풀이 검사 표 · 표본 검토 행 · 규격이 깨진 칸 · 쓰기 · 말하기 평가 문항이 그려진다'(:600) |
| M-6 글자 칸 상수 | ADDRESSED | 화면 M-3 과 같이(writing.tsx:47) | 크기 시험 |
| M-7 사진 화면 번호 | ADDRESSED | 화면 하나를 `section aria-labelledby` 로 묶고 이름표('활동 n · 이름 · 문항 k')로 고른다(`screenByLabel`). 숫자 번호 없음 | 크기 시험의 사진 다섯 |

## 범위 밖 관찰(코드 변경 없음, 컨트롤러 판정)

- 말하기 질문 규격에 그림 칸을 더하지 않았다. 견본 'What is this?'(P4a)는 그대로다. 1~2단계 질문은 그림 없이 답할 수 있는 것만 두는 규칙은 P8 시드 브리프(C67 (5)).
- 말하기 6 · 8단계 그림 · 질문 차례와 화면 방향(가로 1180 · 세로 820)은 P11 · P10 결정으로 장부에 남긴다.
- 화면 M-7 의 '시드 검사에 뜻이 있으면 안 되는 단계 규칙'은 P4 몫으로 장부에 적을 것(이번 범위 밖).

## 다르게 한 것

1. **M-2 대체 글 크기.** '부모 크기를 물려받게'를 위해 `ActivityCard` 에 기본 글자 크기 `CHILD_SIZE.guide` 를 두었다. 카드 밖(P10 · P11 의 다른 틀)에서 VocabPicture 를 쓰면 그 틀의 크기를 물려받는다.
2. **M-7 말하기 기준.** 브리프는 '단계'로 정하라 했고, 숫자 4 를 새로 박지 않으려고 말하기 단계 규격(level-specs)의 `questions.koMeaning`(C39 를 담은 칸, P4b 검사가 같은 칸으로 '뜻 없음'을 잡는다)을 썼다. 규격 행이 없으면 보이지 않는다.
3. **지문 그림 기준 단계.** 3.3 · C67 (6) 의 '1~4단계'는 규격 칸이 없어 `PASSAGE_PICTURE_UNTIL_LEVEL = 4` 상수(common.tsx, 4절 크기 상수 곁)로 두었다. 12절 키가 아니다(화면 구조 수, P7 check-ids 허용 목록에 넣을지 컨트롤러 판단).
4. **평가 지문 그림 낱말.** '연결 단원 단어(targetWords) 가운데 그림 있는 것'을 평가 문항에 targetWords 칸이 없어 '연결 단원의 단원 규격 단어 가운데 지문에 원형 · 활용형으로 나온 것'으로 읽었다(배치는 연결 단원이 없어 그 단계 단원 전부). 지문에 없는 낱말 그림을 붙이지 않으려는 것이다.
5. **토리 이야기 소리 자리.** 이야기 글 머리에도 '읽어 주기' 소리 자리를 두었다(4절 '토리가 이야기를 읽어 주고'). 지적 밖이라 알린다.
6. **사진 다섯의 화면.** 같은 이름으로 다시 찍되, 읽기는 문항 → 지문(I-2 · M-5 · M-6 가 보이게), 쓰기는 3단계 조립 → 1단계 글자 채우기(I-1)로 바꿨다. 말하기(질문) · 단계 평가 · 토리 이야기는 같은 화면이다.

## 공용 변경

- `src/core/seed/check-assessment.ts:224~225` — `isAiItem` 에 `export` 와 설명 한 줄(브리프 허용). 동작 변화 없음.

## 확인(모두 종료 코드 0)

| 명령 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | 0 |
| `pnpm exec biome ci .` | 0 |
| `pnpm build` | 0 · 경로 목록 `/` · `/_not-found` · `/access` · `/access/submit` · `/dev/speech-probe`(/dev/seed-viewer 없음) |
| `pnpm test` | 0 · Tests 240 passed |
| `pnpm test:int` | 0 · Tests 34 passed |
| `pnpm e2e` | 0 · 18 passed |
| `pnpm e2e:local` | 0 · 7 passed(5 + 새 둘) |
| `pnpm check:deps` | 0 · no dependency violations found (76 modules, 194 dependencies cruised) |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 · missing-test 52 |
| `pnpm check:bundle` | 0 · 위반 0 |
| 비밀값 grep(바뀐 · 새 파일) | 0건 |

시험 먼저: 시험을 고친 뒤 구현 전 `pnpm e2e:local` 은 3 실패(크기 · 새 갈래 · 화면 지적) · 4 통과였다.

## 사진 다섯(다시 찍음, 이름표로 고른 화면)

- `.superpowers/sdd/2026-10-16-1-가-구현/p05b-reading.png` — 읽기 4단계 지문(그림 줄 셋 · '읽어 주기' · 새 단어 표시)
- `.superpowers/sdd/2026-10-16-1-가-구현/p05b-writing.png` — 쓰기 1단계 글자 채우기(그림 자리 · 소리 자리 · 56px 글자 칸 · 타일)
- `.superpowers/sdd/2026-10-16-1-가-구현/p05b-speaking.png` — 말하기 1단계 질문(뜻 보임)
- `.superpowers/sdd/2026-10-16-1-가-구현/p05b-level-test.png` — 읽기 4단계 평가 문항(지문 그림 · 정답 배지 · 종이 바탕 정답)
- `.superpowers/sdd/2026-10-16-1-가-구현/p05b-story.png` — 토리 이야기 1(1~3 구간, 뜻 보임)

## 알릴 것

- 견본 그림 파일은 아직 없어(P6b) 그림 자리는 한국어 뜻 글이다. 지문 그림 고르기는 '카탈로그에 있음'(`PictureInfo.catalogued`)으로 하고 파일 있음과 따로 본다.
- `reviewPathOf` 는 칸 키 하나로 경로를 낸다. P5c 쓰기는 이 함수를 쓴다.
- 시험 시드에 더 쓴 파일(깨진 칸 · 평가 둘 · 7~9 이야기 · 풀이 기록 · 검토 행)은 '내용 파일 모두' 시험의 대상 목록(견본 나무)에 들지 않는다. 그 시험은 견본 나무 파일만 '오류 없음'으로 본다.
