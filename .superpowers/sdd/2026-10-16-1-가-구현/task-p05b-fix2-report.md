# fix 2 보고: P5b 활동 표시 컴포넌트 · 시드 보기 화면(impl-p05b, 2026-10-17 06:3x)

상태: DONE. 새 지적 셋(I-A · M-A · M-B)을 모두 ADDRESSED. 공용 파일 변화 없음(fix 1 의 isAiItem 내보내기 그대로). 커밋 없음.

## 지적마다

| 지적 | 판정 | 파일:줄 | 시험 |
|---|---|---|---|
| I-A 평가 · 배치 지문의 '읽어 주기' | ADDRESSED | reading.tsx:109 `ReadingPassage` 에 `readAloud`(기본 참, :121 설명), :143 참일 때만 `SoundMark label="읽어 주기"`. `ReadingTestItem`(단계 평가 · 배치 모두)은 :226 `readAloud={false}` | e2e-local '활동 표시: 지문 그림 · …'(:712) — 수업 지문 '읽어 주기' 1, 읽기 평가 지문 0 |
| M-A 평가 지문 그림의 대체 글 | ADDRESSED | common.tsx:126~150 `VocabPicture` 에 `decorative`(alt 비움 · `aria-hidden` · 파일이 없으면 아무것도 그리지 않음). reading.tsx:110 `decorativePictures`(기본 거짓, :126 설명) → `PassagePictures`(:69~90)는 꾸밈일 때 `src` 있는 그림만 고른다. `ReadingTestItem` 은 :227 `decorativePictures`. 수업 지문은 그대로(파일이 없으면 뜻 글). 덧붙임은 바꾸지 않음 | :712 — 평가 지문에 그림 자리 0 · 대체 글 0 · 아이 화면 틀 글에 한글 0(:814) |
| M-B 문장 틀 빈칸 처짐 | ADDRESSED | common.tsx:368~369 빈칸을 흰 바탕 · 위 둥근 모서리 · 아래 4px 테두리 상자로, `align-middle` → `align-bottom`. 높이 `CHILD_SIZE.blank`(56px) 그대로 | :712 — 쓰기 4단계 문장 1 의 빈칸 바탕이 투명이 아니고, 빈칸 바닥과 옆 글 상자 바닥의 차이가 글자 크기의 1/4 미만(:901). 크기 시험(:525)의 빈칸 높이 56 이상도 통과 |

시험 먼저: 단언을 더한 뒤 구현 전 `pnpm e2e:local` 은 1 실패(평가 지문 '읽어 주기' 1 개) · 6 통과였다. 빈칸 단언은 빈칸 클래스만 옛 꼴로 잠시 되돌려 실패(바탕 투명)하는 것을 따로 확인하고 되돌렸다.

## 시험 수

단위 240 · 통합 34 · e2e 18 · e2e-local 7(시험 수는 같고 :712 에 단언을 더함).

## 확인(모두 종료 코드 0)

| 명령 | 결과 첫 줄 · 요지 |
|---|---|
| `pnpm install --frozen-lockfile` | 0 |
| `pnpm exec biome ci .` | 0 · Checked 124 files. No fixes applied |
| `pnpm build` | 0 · 경로 `/` · `/_not-found` · `/access` · `/access/submit` · `/dev/speech-probe`(/dev/seed-viewer 없음) |
| `pnpm test` | 0 · Tests 240 passed |
| `pnpm test:int` | 0 · Tests 34 passed |
| `pnpm e2e` | 0 · 18 passed |
| `pnpm e2e:local` | 0 · 7 passed |
| `pnpm check:deps` | 0 · no dependency violations found (76 modules, 194 dependencies cruised) |
| `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` | 0 · missing-test 52 |
| `pnpm check:bundle` | 0 · 위반 0 |
| 비밀값 grep(바뀐 파일) | 0건 |
| 공용 파일 | `git diff --stat` 의 공용 파일은 P5b 첫 구현의 공용 변경 1~6 과 fix 1 의 `check-assessment.ts`(isAiItem) 뿐이고 fix 2 에서 바뀐 것 없음 |

## 사진 여섯

- `.superpowers/sdd/2026-10-16-1-가-구현/p05b-reading.png` — 읽기 4단계 지문(그림 줄 · '읽어 주기' · 새 단어 표시, 그대로)
- `.superpowers/sdd/2026-10-16-1-가-구현/p05b-writing.png` — 쓰기 1단계 글자 채우기
- `.superpowers/sdd/2026-10-16-1-가-구현/p05b-speaking.png` — 말하기 1단계 질문
- `.superpowers/sdd/2026-10-16-1-가-구현/p05b-level-test.png` — 읽기 4단계 평가 문항: 지문 · 질문 · 보기만, '읽어 주기' · 그림 대체 뜻 글 없음
- `.superpowers/sdd/2026-10-16-1-가-구현/p05b-story.png` — 토리 이야기 1
- `.superpowers/sdd/2026-10-16-1-가-구현/p05b-writing-blank.png`(새) — 쓰기 4단계 문장 1 'I like the ___ and the ___.'(흰 빈칸 상자, 밑줄이 글줄 바닥에)

## 다르게 한 것

- 판정의 `readAloud` 하나 말고 그림 쪽 속성 `decorativePictures` 를 따로 두었다. 소리 자리와 그림 규칙을 따로 켜고 끌 수 있게 하려는 것이고, `ReadingTestItem` 은 둘 다 평가 쪽 값으로 넘긴다.

## 알릴 것

- 견본에는 그림 파일이 없어(P6b 전) 평가 지문의 그림은 시험에서 늘 0 개다. 파일이 있을 때 꾸밈 그림(alt 비움 · `aria-hidden`)으로 그려지는지는 P6b 뒤 실데이터로 본다(시험이 public/ 에 파일을 쓰지 않게 했다).
- 재검토 넘길 메모의 P8 항목(평가 지문 그림 낱말이 '무엇' 질문 정답과 같으면 그림이 답을 가리킴)은 이번 판정 밖이라 화면 규칙을 더하지 않았다. 그림이 있는 평가 지문에서 정답 낱말 그림이 붙을 수 있는 것은 그대로다.
