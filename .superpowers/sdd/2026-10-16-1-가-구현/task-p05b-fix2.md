# fix 2 브리프: P5b 활동 표시 컴포넌트 · 시드 보기 화면(implementer impl-p05b 이어 하기 · Opus · high, 2026-10-17 06:2x)

화면 재검토 `review-p05b-design-2.md`(des-p05b)는 지난 지적 열을 모두 ADDRESSED 로 보았고, fix 1 이 바꾼 줄에서 새 지적 셋(I 1 · M 2)을 냈다. 아래 컨트롤러 판정대로 고친다. 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p05b`(feature/1a-p05b-seed-viewer). 커밋 없음. 공용 파일은 건드리지 않는다(fix 1 의 isAiItem export 그대로). 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. 시험을 먼저 고치고 실패를 본 뒤 구현한다.

## 지적과 판정
- **I-A(Important) 읽기 평가 · 배치 문항에 '읽어 주기'가 생김** — `ReadingPassage`(reading.tsx:123 SoundMark label="읽어 주기")를 `ReadingTestItem` 이 그대로 써서. 판정: `ReadingPassage` 에 `readAloud`(기본 참) 속성을 두고 `ReadingTestItem`(단계 평가 · 배치 모두)은 거짓으로 넘긴다. 근거 4절 '평가 화면은 B_LevelTest 를 따른다'(03-화면.md:9) · 배치 '평가 중에는 힌트와 뜻 보기가 없다'(:25). 시험 :709 에 '평가 지문에 읽어 주기 0 · 수업 지문에 1' 단언을 더한다.
- **M-A(Minor) 평가 지문 그림의 대체 글이 평가 중 '뜻 보기'가 됨** — 파일 없으면 VocabPicture 가 한국어 뜻 글을 보임(사진 12-01: 정답 낱말의 뜻). 판정: 평가 문항(단계 평가 · 배치)의 지문 그림은 `src` 가 있는 것만 그리고 `alt` 는 비운다(꾸밈 그림, `aria-hidden`), 파일이 없으면 그 자리는 비운다(글 대체 없음). 수업 지문은 지금대로(뜻 글 대체). 덧붙임에는 '평가 그림(파일 없음)' 정보를 남겨도 된다. 시험 :709 에 '평가 지문 그림 자리에 한글 0' 단언.
- **M-B(Minor) 문장 틀 빈칸 밑줄 처짐** — common.tsx:354~357 `min-h-14` 투명 상자 + `border-b-4` + `align-middle` 이라 밑줄이 글 바닥선보다 약 22px 아래. 판정: 빈칸을 바탕이 보이는 상자(종이보다 밝은 바탕 · 아래 굵은 테두리 · 둥근 모서리)로 그리고 `align-bottom`(또는 `inline-flex items-end`)으로 밑줄을 글 바닥선에 맞춘다. 높이 56px(`CHILD_SIZE.blank`) 그대로. 크기 시험(:522)은 그대로 통과해야 한다.

## 완료 판정
`pnpm exec biome ci .` 0 · `pnpm build` · `pnpm test` 240 · `pnpm test:int` 34 · `pnpm e2e` 18 · `pnpm e2e:local` 7(단언 더함) · `pnpm check:deps` 0 · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec`(missing-test 52) · `pnpm check:bundle` 0 · 비밀값 grep 0(바뀐 파일), 공용 파일 변화 없음(`git diff --stat` 에 isAiItem 한 줄만). 사진: 같은 이름 다섯을 다시 찍고(`p05b-level-test.png` 에 읽어 주기 · 뜻 글이 없어야 함) `p05b-writing-blank.png`(쓰기 4단계 빈칸 채우기 'I like the ___ and the ___ .') 한 장을 더 찍는다.

## 보고
`<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p05b-fix2-report.md`(Write 도구): 지적마다 ADDRESSED · 파일:줄 · 시험, 시험 수, 명령 출력 첫 줄, 사진 여섯 경로, 다르게 한 것 · 알릴 것. 마지막 메시지는 상태 + 요약 한 줄.
