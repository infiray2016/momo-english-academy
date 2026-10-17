# 구현 보고: P5b 활동 표시 컴포넌트와 로컬 전용 시드 보기 화면(impl-p05b, 2026-10-17 01:1x)

상태: DONE_WITH_CONCERNS(계획과 다르게 한 것 둘 — 견본 규격 파일 한 벌 · 의존 규칙 막는 예 파일. 아래 '계획과 다르게 한 것')

워크트리 `.claude/worktrees/p05b`(feature/1a-p05b-seed-viewer, 바탕 e08eaba). 커밋 없음.

## 바뀐 파일

| 파일 | 신규/수정 | 계획과 | 무엇 |
|---|---|---|---|
| `next.config.ts` | 수정 | 같음(공용 1) | 함수 꼴. pageExtensions 기본 넷 + preview.tsx(운영 배포만 뺌) + local.tsx(next dev 만). reactCompiler · agentRules · authInterrupts · turbopack 그대로 |
| `package.json` | 수정 | 같음(공용 2) | `e2e:local` |
| `playwright.local.config.ts` | 신규 | 같음(공용 3, biome 줄바꿈만) | next dev 3200, reuseExistingServer false, SEED_VIEWER_ROOT=tests/.tmp/seed-viewer-e2e |
| `.env.example` | 수정 | 같음(공용 4) | `SEED_VIEWER_ROOT=` |
| `.dependency-cruiser.cjs` | 수정 | 같음(공용 5) | 규칙 `seed-viewer-only-from-viewer` |
| `tests/unit/dependency-rules.test.ts` | 수정 | **다름**(막는 예 파일 이름) | 막는 예 · 허용 예 두 시험 |
| `.github/workflows/ci.yml` | 수정 | 같음(공용 6) | 작업 e2e-local |
| `src/server/seed-viewer/files.ts` | 신규 | 같음 + 더함 | assertSeedViewerLocal 56 · seedViewerRoot 61 · resolveSeedFile 70 · listContentFiles 137 · loadContentFile 215 · (더함) publicFileExists 316 · pictureCatalog 346 |
| `src/components/activities/common.tsx` | 신규 | 같음 + 더함 | CHILD_SIZE 15(4절 크기 상수 한곳) · AREA_TONE 31 · ActivityCard · ChoiceList · VocabPicture · NewWordsPreview · SoundMark, (더함) EnglishLine · GuideLine · TileRow · AnswerBox · FrameText |
| `src/components/activities/reading.tsx` | 신규 | 같음 | ReadingPassage · ReadingQuestion · ReadingTestItem · StoryText · StoryQuestion |
| `src/components/activities/writing.tsx` | 신규 | 같음 | WritingItem(갈래 일곱) · WritingGuidedTask · WritingGuidedSentence · WritingComposition · FillBlankItem · FixSentenceItem · CompositionTestItem |
| `src/components/activities/speaking.tsx` | 신규 | 같음 | RepeatItem · ListeningItem · SpeakingQuestion · PictureTask · PresentationTask · SpeakingTestItem |
| `src/app/dev/seed-viewer/page.local.tsx` | 신규 | 같음 | 목록 · 파일 · 칸, 머리에 `pnpm seed:validate` 안내 한 줄, metadata robots noindex |
| `src/app/dev/seed-viewer/cell-view.tsx` | 신규 | 같음 | 칸 머리(`data-cell-head`) · 화면 차례(아이 화면 틀 `section aria-label="아이 화면 n"` 820px + `덧붙임 n`) · 규격 깨진 칸 날 JSON · 풀이 검사 · 표본 검토(읽기만) |
| `src/app/dev/seed-viewer/talk-card.tsx` | 신규 | 같음 | 회화 카드 · 회화 평가 장 어른용 표 |
| `tests/e2e-local/seed-viewer.spec.ts` | 신규 | 같음 | 증명 표 시험 다섯 |
| `tests/e2e/seed-viewer-absent.spec.ts` | 신규 | 같음 | AC-7f 운영 빌드 404 |

`bandOf` 는 쓰지 않았다(구간은 structure.ts `bandInfo` 만 씀).

## 시험 수

| 묶음 | 바탕 | 지금 |
|---|---|---|
| 단위 | 238 | 240(의존 규칙 둘) |
| 통합 | 34 | 34 |
| e2e | 17 | 18(AC-7f 404) |
| e2e-local | 없음 | 5 |

덮는 시험 이름(증명 표 글자 그대로):
- e2e-local "AC-7f 시드 보기: 읽기 수업 칸을 열면 아이 화면 모습에 정답 · 해설 · 새 단어가 붙어 보인다"
- e2e "AC-7f 운영 빌드에서는 시드 보기 주소(/dev/seed-viewer)가 접근 쿠키가 있어도 404 다"
- e2e-local "시드 보기: 견본 시드의 내용 파일(쓰기 · 말하기 · 회화 카드 · 단계 평가 · 배치 · 토리 이야기)이 모두 화면 오류 없이 열리고 칸마다 머리가 보인다"(내용 파일 17개 · 칸 127개 전부, 첫 칸은 브라우저 · 나머지는 요청)
- e2e-local "시드 보기: 듣기 대본 · 그림 장면 설명은 아이 화면 밖 덧붙임에만 보인다"
- e2e-local "시드 보기: 접근 쿠키가 없으면 /dev/seed-viewer 도 접근 코드 화면(401)이다(C57)"
- e2e-local "활동 표시: 아이 화면의 안내 20px · 영어 24px · 버튼 글자 22px 이상, 누르는 곳 56px 이상, '%' 가 없다"(AC 이름 없음, 위험 9). 칸 13개(읽기 1 · 4, 쓰기 1 · 3 · 4 · 6, 말하기 1 · 6 · 10, 읽기 평가, 배치 본 · 예비, 이야기)의 아이 화면 틀 안 모든 글 요소를 계산된 크기로 본다
- 단위 "의존 규칙: 앱 화면이 src/server/seed-viewer 를 가져오면 seed-viewer-only-from-viewer 위반" · "의존 규칙: 시드 보기 화면(src/app/dev/seed-viewer)이 src/server/seed-viewer 를 가져오는 것은 허용"

## 작업 1 의 두 출력

`pnpm build`(빈 page.local.tsx) 경로 목록 — `/dev/seed-viewer` 없음:
```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /access
├ ƒ /access/submit
└ ○ /dev/speech-probe
```
`pnpm dev --port 3300` 에서 쿠키 없이 `curl /dev/seed-viewer`:
```
status=401
부모님이 코드를 넣어 주세요
 GET /dev/seed-viewer 401 in 26ms (next.js: 5ms, proxy.ts: 2ms, application-code: 19ms)
```

## 작업 2 실패 출력(시험 먼저, 빈 쪽에서)

```
4 failed — AC-7f 보기 · 내용 파일 모두 · 듣기 대본 · 활동 표시 크기(모두 heading level 1 을 못 찾음)
1 passed — 쿠키 없음 401(C57, 길이 이미 proxy 에 있어 처음부터 통과)
```

## 작업 6 CI 순서(워크트리, 모두 종료 코드 0)

| 명령 | 결과 첫 줄 · 요지 |
|---|---|
| `pnpm install --frozen-lockfile` | 0 · Done in 417ms using pnpm v10.34.7 |
| `pnpm exec biome ci .` | 0 · Checked 124 files. No fixes applied |
| `pnpm build` | 0 · 경로 목록에 /dev/seed-viewer 없음 |
| `pnpm test` | 0 · Test Files 24 passed · Tests 240 passed |
| `pnpm test:int` | 0 · Test Files 4 passed · Tests 34 passed |
| `pnpm e2e` | 0 · 18 passed(seed-viewer-absent 포함, P2b 관찰 페이지 · P3b 접근 코드 그대로 통과 — 위험 2) |
| `pnpm e2e:local` | 0 · 5 passed(14.7s) |
| `pnpm check:deps` | 0 · no dependency violations found (76 modules, 187 dependencies cruised) |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 · missing-test 53 → 52(AC-7f 줄 사라짐) |
| `pnpm check:bundle` | 0 · 파일 33 · static 13 · 화면 파일 20 · 서버 변수 이름 10(SEED_VIEWER_ROOT 포함) · 위반 0 |
| 비밀값 grep(`sk-ant-` · 접속 문자열 · 값 있는 ACCESS_CODE_HASH · CRON_SECRET, 바뀐 파일) | 0건 |

## 화면 사진 다섯(10.9형 webkit, 아이 화면 틀만, reveal 참)

- `.superpowers/sdd/2026-10-16-1-가-구현/p05b-reading.png` — 읽기 4단계 문항 1(질문 + 보기 넷, 정답 ✓)
- `.superpowers/sdd/2026-10-16-1-가-구현/p05b-writing.png` — 쓰기 3단계 문장 조립(뜻 + 놓는 칸 + 카드)
- `.superpowers/sdd/2026-10-16-1-가-구현/p05b-speaking.png` — 말하기 1단계 질문(소리 자리 + 영어 + 한국어 뜻, C39)
- `.superpowers/sdd/2026-10-16-1-가-구현/p05b-level-test.png` — 읽기 4단계 평가 문항 1(지문 + 질문 + 보기)
- `.superpowers/sdd/2026-10-16-1-가-구현/p05b-story.png` — 토리 이야기 1(제목 + 글 + 한국어 뜻)

사진 시험은 개발 서버의 Next 개발 도구 단추(`nextjs-portal`)를 숨긴 뒤 찍는다.

## 계획과 다르게 한 것

1. **견본 규격 파일 한 벌.** plan '시험 자료'의 `sampleSeedTree(smallReferenceSet())` 는 견본이 단원 단어를 모자라 던진다("읽기 단원 단어: 4 번째 값이 없다"). 다른 시험(seed-schema 등)과 같은 `sampleSeedTree(referenceSet(defaultSettings()))` 를 썼다. 오류 0 · 칸 127개다.
2. **의존 규칙 막는 예 파일.** plan 은 막는 예를 `src/app/page.tsx` → files.ts 로 적었으나, 그 견본 파일은 이미 ai-only-from-server 시험이 위반 목록을 `["ai-only-from-server"]` 로 딱 맞게 본다. 같은 파일에 넣으면 그 시험이 깨지므로 새 견본 `src/app/uses-seed-viewer.tsx` 로 막는 예를 두었다. 허용 예는 plan 그대로(`src/app/dev/seed-viewer/page.local.tsx`).
3. **아이 화면 틀의 요소.** plan 의 `role="region"` 은 이름 붙은 `<section aria-label="아이 화면 n">`(같은 암묵 역할, biome 의 의미 요소 규칙)으로 했다. 접근성 트리에서는 region 이다.
4. **그림 찾기.** plan 의 `(word) => { image?, meaningKo }` 를 `PictureLookup { ofWord, ofKey }` 로 했다(말하기 그림 보고 말하기는 단어 id 가 아니라 그림 키라서). 보기 화면은 files.ts `pictureCatalog` 가 vocab · images 와 public/ 파일 있음을 보고, 파일이 없으면 src 를 주지 않아 그림 자리에 한국어 뜻이 보인다(브라우저가 깨진 그림을 그리지 않게, 404 콘솔 오류 없음). 덧붙임에 그림 키 · 라이선스 · 저작자 표시 · 파일 경로(없으면 '파일 없음')를 적는다.
5. **reveal 의 범위.** 보기 · 글자 타일 · 받아쓰기 · 빈칸 채우기 · 문장 고치기의 정답 칸에 reveal 이면 허용 정답 첫째를 보인다(`data-correct`). 문장 틀(4~5단계) · 작문은 reveal 을 받지 않는다(모범 문장 · 채점 기준은 덧붙임에만).
6. **아이 화면 틀 안 문구.** 시드 글 밖에는 목업 글만 썼다 — '오늘의 새 단어'(B_Reading) · '과제' · '예시' · '단어 상자'(B_Writing) · '힌트'(4절 힌트 버튼 이름), 소리 자리 이름표 '다시 듣기'(보이지 않는 이름). 안내 문장('이 뜻이 되게 카드를 놓아요' 등)은 P11 몫으로 넣지 않았다.

## 남긴 것

- 실시드 뿌리(seed/)로 한 번 열어 보기(plan '시험 자료' 둘째 줄, P6a 합친 뒤 컨트롤러). 견본 이미지 파일 꼴은 png 라 SVG 그림이 실제로 뜨는지는 P6b 뒤에 본다(위험 7).
- 표본 검토 · 사람 확인 쓰기(P5c). `resolveSeedFile` · `assertSeedViewerLocal` 을 P5c 서버 액션이 쓴다.

## 검토자에게 알릴 것

- 활동 표시 컴포넌트는 훅 · 'use client' · server-only 없이 속성만 받는다. 4절 크기 클래스는 `common.tsx` 의 `CHILD_SIZE` 한곳이다. 보기 · 타일 · 소리 자리는 `<button aria-disabled="true" data-choice>` 이고 P11 이 동작을 더한다.
- AI 과제 여부 덧붙임은 core `check-assessment.ts` 의 비공개 `isAiItem` 과 같은 규칙을 cell-view 에 다시 적었다(core 를 고치지 않으려고). 하나로 모으려면 core 에서 내보내는 공용 변경이 필요하다.
- 칸 화면 차례: 읽기 = 미리보기 → 지문 → 문항, 쓰기 items = 미리보기 → 문항, guided = 미리보기 → 과제 → 문장, composition = 미리보기 → 과제, 말하기 = 미리보기 → 낱말 → 문장 → 듣기 → 질문 → 그림 → 발표, 평가 · 배치 = 문항 하나, 이야기 = 글 → 질문. 어른용 이름표 '활동 n · 이름 · 문항 k' 의 k 는 itemsOf 번호와 같게 셌다.
- 지문의 글로서리 밑줄은 고유 명사(Tori · Momo)도 포함한다(3.3 '단어를 누르면 뜻').
- 쓰기 6단계 composition 의 과제 글 · 힌트 언어는 시드에 따라 다를 수 있어 과제는 한국어 줄(20px), 힌트는 영어 줄(24px)로 그린다.
- e2e-local 시험은 요청자 개발 서버가 같은 폴더에서 돌면 뜨지 않는다(위험 3, 워크트리 · CI 는 무관).
