# 재검토 브리프: P5b fix 2(design-reviewer des-p05b 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-17 06:3x)

범위 한정 재검토다. `review-p05b-design-2.md` 의 I-A · M-A · M-B 가 fix 2 에서 어떻게 처리됐는지 ADDRESSED · NOT ADDRESSED 로 가른다. 새 지적은 fix 2 가 바꾼 줄 · 화면에서 생긴 것만 받는다. 저장소 · 워크트리 파일을 고치지 않는다. 보고 파일 하나만. 보는 법은 `task-p05b-design-review.md` 그대로.

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p05b`(feature/1a-p05b-seed-viewer, 커밋 없음). fix 2 가 바꾼 파일: `src/components/activities/reading.tsx`(ReadingPassage `readAloud` 기본 참 · `decorativePictures` 기본 거짓, ReadingTestItem 은 readAloud 거짓 · decorativePictures 참, PassagePictures 꾸밈일 때 src 있는 그림만) · `src/components/activities/common.tsx`(VocabPicture `decorative` — alt 비움 · aria-hidden · 파일 없으면 안 그림; 문장 틀 빈칸 흰 바탕 · 위 둥근 모서리 · 아래 4px 테두리 · align-bottom, 56px 유지) · `tests/e2e-local/seed-viewer.spec.ts`(:712 단언 — 수업 지문 읽어 주기 1 · 평가 지문 0 · 평가 그림 자리 0 · 대체 글 0 · 틀 글 한글 0, :901 빈칸 바닥 ≈ 글 상자 바닥).
- fix 2 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p05b-fix2-report.md`(지적마다 판정 · 파일:줄 · 시험, 다르게 한 것 하나 — decorativePictures 를 readAloud 와 따로, 알릴 것 둘 — 견본에 그림 파일이 없어 꾸밈 그림은 P6b 뒤 실데이터로 · P8 메모는 화면 규칙을 더하지 않음). fix 브리프 `task-p05b-fix2.md`(컨트롤러 판정).
- 컨트롤러 재확인(06:3x): CI 순서 명령 전부 0(biome · build · 240 · 34 · e2e 18 · e2e-local 7 · deps 0 · spec 52 · bundle 0 · 비밀값 0 · 공용 변화 없음). 사진 여섯 가운데 `p05b-level-test.png`(지문 · 질문 · 보기만 — 읽어 주기 · 그림 · 뜻 글 없음) · `p05b-writing-blank.png`(흰 빈칸 상자 둘, 밑줄이 글 바닥선에)을 눈으로 확인.

## 볼 것
1. I-A: 단계 평가 · 배치 문항 모두 '읽어 주기' 0, 수업 지문 · 미리보기 · 이야기는 그대로 있는지. 다르게 한 것(그림 속성 분리)을 받을지.
2. M-A: 평가 문항에서 파일 없으면 자리도 뜻 글도 없는지, 파일 있으면 꾸밈 그림(alt 비움 · aria-hidden)이 되는 코드인지(견본에 파일이 없어 사진으로는 못 봄 — 코드로), 수업 지문은 뜻 글 대체 그대로인지, 덧붙임에 뜻이 남는 것이 평가 중 아이에게 보이지 않는 자리인지.
3. M-B: 빈칸 상자가 글줄과 나란한지(쓰기 4단계 · 쓰기 평가 빈칸 채우기), 목업 B_Writing 의 빈칸 꼴과 맞는지, 56px · 크기 시험 유지.
4. fix 2 범위에서 목업 · 원칙 대조에 새로 어긋난 것이 생겼는지. 지난 '넘길 메모'(P5c · P6c · P8 · P10 · P11)는 장부에 올렸으니 되풀이하지 않는다.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p05b-design-3.md`: 판정(Approved · Changes requested) · 지적 셋 판정과 근거(파일:줄 · 사진 · 시험) · 새 지적(심각도 · 근거) · 다르게 한 것 · 알릴 것 판정. 마지막 메시지는 판정과 요지 5줄 안쪽.
