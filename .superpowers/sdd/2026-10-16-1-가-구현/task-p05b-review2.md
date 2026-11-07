# 재검토 브리프: P5b 활동 표시 컴포넌트 · 시드 보기 화면 fix 1(design-reviewer des-p05b 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-17 04:4x)

범위 한정 재검토다. `review-p05b-design.md` 의 I-1 · I-2 · M-1~M-8 이 fix 1 에서 어떻게 처리됐는지 ADDRESSED · NOT ADDRESSED 로 가른다. 새 지적은 fix 1 이 바꾼 화면 · 줄에서 생긴 것만 받는다. 코드 검토(`review-p05b.md`)의 Minor 일곱은 컨트롤러가 자리마다 확인했으니(아래) 화면에 미친 영향만 본다. 저장소 · 워크트리 파일을 고치지 않는다. 보고 파일 하나만(Bash 로 써도 된다). 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. 보는 법(개발 서버 · Playwright 사진)은 `task-p05b-design-review.md` 그대로.

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p05b`(feature/1a-p05b-seed-viewer, 커밋 없음). fix 1 이 바꾼 파일: `src/components/activities/common.tsx`(PASSAGE_PICTURE_MAX · PASSAGE_PICTURE_UNTIL_LEVEL · CHILD_SIZE.blank · CorrectBadge · VocabPicture 크기 상속 · ActivityCard 기본 크기) · `reading.tsx`(PassagePictures · ReadingPassage · 새 단어 표시 · 읽어 주기) · `writing.tsx`(글자 채우기 그림 · 소리 · 56px 칸) · `speaking.tsx`(PresentationTask 종이 칩 · showKo) · `src/app/dev/seed-viewer/cell-view.tsx`(speakingKo · testPictureWords · itemNoOf · CHILD_FRAME_BLEED · 덧붙임) · `src/server/seed-viewer/files.ts`(reviewPathOf) · `src/core/seed/check-assessment.ts`(isAiItem export 한 줄) · `tests/e2e-local/seed-viewer.spec.ts`(새 시험 :600 · :709, 크기 시험 보강, 시험 시드 extraFiles).
- fix 1 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p05b-fix1-report.md`(지적마다 판정 · 파일:줄 · 시험, 범위 밖 둘 코드 변경 없음, 다르게 한 것 여섯, 알릴 것 셋). fix 브리프 `task-p05b-fix1.md`(컨트롤러 판정 — C67 (6) 지문 옆 그림 최대 4 · (7) 한국어 뜻은 부르는 쪽 showKo).
- 컨트롤러 재확인(04:4x, 워크트리): biome 0 · build · 단위 240 · 통합 34 · e2e 18 · e2e-local 7 · check:deps 0 · spec-trace missing-test 52 · bundle 0 · 비밀값 0(남은 2건은 check-bundle 검출기 자신과 그 시험 주석) · 공용 파일 변화는 P5b 계획분 + isAiItem export 뿐. 코드 Minor 확인: isAiItem export(check-assessment.ts:225) · reviewPathOf(files.ts:196) · itemNoOf(cell-view:838) · 이중 as 0 · speakingKo(cell-view:127, questions.koMeaning) · 새 시험 둘 이름 · 사진 다섯 03:16 새로 찍힘.
- 사진 다섯(같은 이름, 읽기 → 지문 화면 · 쓰기 → 1단계 글자 채우기로 바뀜): `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/p05b-{reading,writing,speaking,level-test,story}.png`. 컨트롤러가 본 것: 읽기 4단계 지문 위 그림 자리 셋(가상 낱말 4-1 · 4-2 · 4-4) · 읽어 주기 · 새 단어만 종이 바탕 굵게; 쓰기 1단계 그림 자리 + 다시 듣기 + 56px 글자 칸 + 타일 둘; 말하기 1단계 질문 + 뜻; 평가 문항 그림 하나 + 정답 굵은 테두리 + ✓ 배지(종이 바탕); 토리 이야기 1 소리 + 뜻.

## 볼 것
1. I-1: 글자 채우기 위 그림(VocabPicture, 파일 없으면 한국어 뜻 글)과 '다시 듣기' 소리 자리가 있는지, 덧붙임에 그 그림 정보가 드는지, 시험(:709)이 글자 채우기 화면마다 보는지.
2. I-2(C67 (6)): 1~4단계만 · 카탈로그에 있는 것 차례대로 최대 4 · 문장마다 짝 짓지 않음 · 수업은 newWords · 평가 · 배치는 연결 단원 단어 가운데 지문에 원형 · 활용형으로 나온 것(배치는 그 단계 단원 전부) · 토리 이야기 없음. 다르게 한 것 3(`PASSAGE_PICTURE_UNTIL_LEVEL = 4` 상수 — 12절 키 아닌 화면 구조 수, 컨트롤러는 받되 P7 check-ids 허용 목록에 올렸다)과 4(평가 지문 그림 낱말 해석)를 받을지 판정.
3. M-1: 정답은 종이 바탕 그대로 + 굵은 테두리 + '정답' ✓ 배지(role img · aria-label), 그림 보기는 배지가 모서리. 세 군데 모두인지.
4. M-2: 대체 글이 부모 크기를 물려받는지(보기 안 24px · 카드 기본 20px — 다르게 한 것 1), 크기 시험이 `[data-choice]` 안 글을 22px 이상으로 보는지.
5. M-3 · 코드 M-6: 글자 칸 `CHILD_SIZE.target` 56 × 56, 문장 틀 빈칸 `CHILD_SIZE.blank`(min-h-14).
6. M-4: 발표 '쓸 말'이 종이 칩 `ul > li`(영어 24px)이고 버튼이 0 인지.
7. M-5: 미리보기 낱말마다 '다시 듣기', 지문 머리 '읽어 주기' 하나, 이야기 머리도(다르게 한 것 5 — 4절 '토리가 이야기를 읽어 주고'에 맞는지).
8. M-6: 표시가 markWords(newWords · targetWords)의 글로서리 표기형에만 붙고 고유 명사 · 나머지 글로서리에는 없는지.
9. M-7(C67 (7)): 컴포넌트는 showKo 일 때만, cell-view 가 정함 — 이야기 `STORY_KO_BANDS`, 말하기 질문(수업 · 평가)은 그 단계 말하기 규격 `questions.koMeaning`(다르게 한 것 2 — 숫자 4 대신 P4a 규격 칸. 그 칸이 C39 1~4단계 규칙을 담는지 `seed/` 견본 · P4a 규격 · P4b 검사에서 확인). 숨긴 뜻은 덧붙임에만.
10. M-8: `CHILD_FRAME_BLEED`(-mx-6)로 820px 에서 가로 넘침이 없는지(시험이 칸마다 scrollWidth ≤ clientWidth).
11. 범위 밖 둘(말하기 질문 그림 칸 · 6 · 8단계 차례와 화면 방향)은 코드 변경 없음 — 그대로인지만. 'M-7 의 시드 검사 규칙은 P4 몫' 은 컨트롤러가 장부에 올렸다.
12. fix 가 바꾼 화면 범위에서 목업 대조 · 원칙 대조(한 화면 한 행동 · 해요체 · 큰 글자 · 접근성)에 새로 어긋난 것이 생겼는지. 코드 Minor M-7(사진을 이름표로 고름) 뒤 사진 다섯이 지적 자리를 보이는지(다르게 한 것 6).

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p05b-design-2.md`(메인 저장소): 판정(Approved · Changes requested) · 지적마다 ADDRESSED · NOT ADDRESSED 와 근거(파일:줄 · 사진 · 시험 이름) · 새 지적(심각도 · 근거, fix 범위 안) · 다르게 한 것 1~6 판정 · 알릴 것 셋 판정 · P5c · P6c · P10 · P11 에 넘길 메모(지난 보고 '넘길 메모'와 겹치지 않게). 마지막 메시지는 판정과 요지 5줄 안쪽.
