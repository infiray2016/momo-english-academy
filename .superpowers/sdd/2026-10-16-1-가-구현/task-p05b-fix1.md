# fix 1 브리프: P5b 활동 표시 컴포넌트 · 시드 보기 화면(implementer impl-p05b 이어 하기 · Opus · high, 같은 워크트리, 2026-10-17 03:0x)

검토 둘을 한 라운드로 고친다 — 코드 검토 `review-p05b.md`(rev-p05b, Approved · M 7)와 화면 검토 `review-p05b-design.md`(des-p05b, Changes requested · I 2 · M 8). 시험을 먼저 더하거나 고쳐 실패를 본 뒤 고친다. 커밋 · plan · 정본은 건드리지 않는다. 공용 파일은 아래 허용한 것만. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. 같은 폴더에서 `pnpm dev` 가 돌면 `pnpm e2e:local` 이 뜨지 않는다(포트 3200 확인).

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p05b`(feature/1a-p05b-seed-viewer, 커밋 없음). 보고 둘은 메인 저장소 장부 `/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/`. 화면 검토자가 더 찍은 사진 84장 목록 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/686cc61d-5a44-4211-9d88-26af0ec4ddfa/scratchpad/des-p05b/shots/index.tsv`, 렌더링한 목업 `…/scratchpad/des-p05b/mock/`(참고용, 고치지 않는다).

## 고칠 것(컨트롤러 판정)
### 화면 검토 Important
- **I-1** 쓰기 1단계 글자 채우기(writing.tsx:102~112)에 `VocabPicture picture={pictures.ofWord(item.word)}` 와 `SoundMark` 를 둔다(목업 B_W1_Words). 그림 파일이 없으면 한국어 뜻이 보인다.
- **I-2** 읽기 지문 옆 단어 그림(3.3 1~4단계) — 컨트롤러 결정(13절 C67 (6)): `ReadingPassage` 가 `pictures` 와 단계를 받아 **1~4단계에서만** 그 수업 새 단어(newWords) 가운데 카탈로그에 그림이 있는 것을 차례대로 **최대 4개** 지문 위 한 줄에 `VocabPicture` 로 둔다(화면 구조 수 상수 `PASSAGE_PICTURE_MAX = 4` 를 common.tsx 이름 붙인 상수에, P10 이 옮길 수 있음). 1단계도 문장마다 짝 짓지 않는다. 평가 · 배치 읽기 문항의 지문은 연결 단원 단어(targetWords) 가운데 그림 있는 것, 같은 규칙. 토리 이야기는 그림 없음. 화면 꼴은 H6(P6c)에서 맞춘다.
### 화면 검토 Minor
- **M-1** 정답 표시: 바탕을 네 영역 색과 겹치지 않게(종이 바탕 + 4px 테두리 + ✓ 원 배지), 그림 보기의 ✓ 는 모서리에 겹쳐 놓아 그림이 밀리지 않게, ✓ 에 `role="img" aria-label="정답"`.
- **M-2** 그림 대체 글은 부모 크기(보기 24px)를 물려받게 하고, 크기 시험은 `[data-choice]` 안 글 요소도 22px 이상으로 본다.
- **M-3** 글자 칸은 `CHILD_SIZE.target`(56 × 56), 문장 틀 빈칸 높이 56px 이상을 `CHILD_SIZE` 상수로.
- **M-4** 발표 생각 화면의 쓸 말 셋은 버튼이 아니라 글 줄(종이 칩 `ul > li`, 영어 24px).
- **M-5** 새 단어 미리보기 낱말마다, 지문 머리에 `SoundMark`(이름표 '다시 듣기' · '읽어 주기').
- **M-6** 지문 표시는 새 단어(newWords · targetWords)에만, 나머지 글로서리 · 고유 명사는 표시 없음(누르면 뜻은 P11).
- **M-7** 한국어 뜻은 부르는 쪽이 단계 · 구간으로 정한 `showKo` 를 넘길 때만 보인다(토리 이야기 1~3 · 4~6 구간, 말하기 질문 1~4단계 C39 — cell-view 가 `STORY_KO_BANDS` 와 단계로 정해 넘김). 시드 검사에 '뜻이 있으면 안 되는 단계' 규칙을 더하는 것은 P4 몫으로 장부에 적는다(이번 범위 밖).
- **M-8** 칸 화면의 아이 화면 틀을 main 여백 밖으로 빼서(`-mx-6` 꼴) 820px 에서 가로 넘침 0.
### 코드 검토 Minor
- **M-1** '문항 k' 는 `cell.items`(itemsOf)에서 세고 손셈을 없앤다. **M-3** 칸 키는 `parseCellKey` 로 가르고, 검토 파일 경로 함수(`reviewPathOf`)를 내보낸다(P5c 가 쓴다). **M-2** AI 과제 규칙은 core `src/core/seed/check-assessment.ts` 의 `isAiItem` 을 내보내 쓴다(공용 변경 한 줄, 허용 — 보고에 적는다). **M-4** 평가 · 배치 문항 컴포넌트 속성을 P4a 규격 타입으로, `as` 제거. **M-5** 보기 화면 갈래 넷(풀이 검사 표 · 표본 검토 행 · 규격 깨진 칸 · 쓰기 평가 문항)을 그리는 e2e-local 시험을 더한다(견본 풀이 기록은 `cellHash` 로 맞춘 기록을 만들어 풀이 표가 그려지게). **M-6** 글자 칸 크기 클래스를 `CHILD_SIZE` 로. **M-7** 사진 화면 번호는 숫자 대신 화면 이름(aria-label)으로 고른다.
### 범위 밖 관찰(컨트롤러 판정 — 코드 변경 없음)
- 말하기 질문 규격에 그림 칸을 더하지 않는다. 1~2단계 질문 답 활동의 질문은 그림 없이 답할 수 있는 것만 두고 그림이 필요한 질문은 '그림 보고 말하기' 활동으로 — P8 시드 브리프 규칙(C67 (5)). 견본 'What is this?'(P4a 견본)는 그대로 둔다.
- 말하기 6 · 8단계의 그림 · 질문 차례와 화면 방향(가로 1180 · 세로 820)은 P11 · P10 결정으로 장부에.

## 완료 판정
`pnpm exec biome ci .` 0 · `pnpm build`(경로 목록에 /dev/seed-viewer 없음) · `pnpm test`(240 + 새 시험) · `pnpm test:int` 34 · `pnpm e2e` 18 · `pnpm e2e:local`(5 + 새 시험) · `pnpm check:deps` 0 · `pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec` 0(missing-test 52) · `pnpm check:bundle` 0 · 비밀값 grep 0. 사진 다섯을 같은 이름 `p05b-*.png` 로 다시 찍는다(`E2E_SEED_VIEWER_SCREENSHOTS=.superpowers/sdd/2026-10-16-1-가-구현`). 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p05b-fix1-report.md`(지적마다 ADDRESSED · 파일:줄 · 시험, 다르게 한 것, 공용 변경, 알릴 것). 마지막 메시지는 상태 + 요약 한 줄. 그 뒤 des-p05b 범위 한정 재검토(I-1 · I-2 · M), 코드 Minor 는 컨트롤러가 확인.
