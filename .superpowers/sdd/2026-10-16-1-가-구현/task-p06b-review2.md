# 재검토 브리프: P6b 그림 카탈로그 작업 2 fix 1(code-reviewer rev-p06b 이어 보기 · Opus · high, 범위 한정 · 가벼운 루프, 읽기 전용, 2026-10-17 01:2x)

범위 한정 재검토다. `review-p06b.md` 의 I-1 · M-1 · M-2 · M-3 · M-4 가 fix 1 에서 어떻게 처리됐는지 ADDRESSED · NOT ADDRESSED 로 가른다. 새 지적은 fix 1 이 바꾼 줄에서 생긴 것만 받는다. 저장소 · 워크트리 파일을 고치지 않는다. 보고 파일 하나만(Bash 로 써도 된다). 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴, 네트워크는 쓰지 않는다(fetch 를 돌리지 않는다).

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p06b`(feature/1a-p06b-vocab-images, 바탕 6bd6015, 커밋 없음). fix 1 이 바꾼 파일: `scripts/vocab-images.ts` · `tests/unit/vocab-images.test.ts`(시험 164 → 165, 새 시험 하나 + 기존 시험에 사례 추가).
- fix 1 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p06b-fix1-report.md`(지적마다 판정 · 파일:줄 · 시험, CLI 확인 둘, '남긴 것' — plan 문구는 컨트롤러 몫).
- 컨트롤러 재확인(01:1x, 워크트리): biome 0 · build · 단위 165 · check:deps 0 · spec-trace 58 · bundle 0 · 비밀값 0 · `public/` 없음 · 임시 뿌리(빈 카탈로그 · 폴더 없음)에서 `pnpm images:check --root <임시>` → `vocab-images check: 행 0 · 파일 0 · 위반 0` exit 0. plan-p06b 스크립트 표 check 행 문구는 컨트롤러가 이미 고쳤다('행이 있는데 그림 폴더 없음', 행 0 이면 폴더 없어도 0).

## 볼 것
1. I-1: 행 0 + 폴더 없음 → 0, 행 있음 + 폴더 없음 → 2, 행 0 + 파일 있음 → 1 의 세 갈래가 코드와 새 시험에 있는지, 출력 줄 꼴(`vocab-images check: 행 0 · 파일 0 · 위반 0`)이 단언되는지, 실제 없는 폴더를 읽는 길이 ENOENT 만 삼키고 다른 오류(EACCES 등)는 그대로 던지는지.
2. M-1: href 허용 목록 정규식(`#` 로 시작하는 값만)과 `attributeName` 이 href · xlink:href 인 animate · set 금지가 1차 검토가 보인 다섯 꼴(`javascript:` href · xlink:href, `data:` use, animate · set)을 모두 잡는지, 정상 Twemoji 꼴(`xlink:href="#a"` · `url(#a)` · `xmlns:xlink="http://www.w3.org/1999/xlink"` — 이것은 href 속성이 아님)이 여전히 지나는지(거짓 양성). 옛 'http 바깥 주소' href 규칙을 품는다는 보고 주장이 맞는지(`href="https://…"` 가 여전히 걸리는지).
3. M-2: 하위 폴더 시험(`old/` → 1, 줄에 `images/vocab/old/`)이 실제로 그 갈래를 지나고 임시 폴더를 지우는지.
4. M-3: `parseCatalog(text, root)` · `runCheck(root)` 의 메시지가 resolve 한 뿌리를 담는지(`--root seed` 재현 메시지가 `<절대>/seed/seed/images.json`), 기본 `.` 과 `main` · `runFetch` 의 전달이 맞는지, 바뀐 서명으로 기존 시험 사례가 그대로인지.
5. M-4: `SKIPPED_FILES = [".DS_Store"]` 만 건너뛰고 `.hidden` 은 카탈로그 밖으로 남는지(시험).
6. 새 지적은 바뀐 줄에서만. 머리 주석의 종료 2 설명이 고쳐졌는지.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p06b-2.md`(메인 저장소 장부). 첫 줄 판정(Approved · Changes requested, C · I · M 수), 지적마다 ADDRESSED · NOT ADDRESSED(근거 파일:줄), 새 지적(있으면 심각도 · 근거). 마지막 메시지는 판정 + 요지 세 줄.
