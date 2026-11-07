# 브리프: P6b 작업 3 — 그림 낱말 고르기 1~2단계 + 알파벳(curriculum-designer cd-p06b · Opus · high)

plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p06b-그림-카탈로그.md`(in-progress — 작업 2 끝 3caed9c)의 **작업 3** 이다: 1~2단계 내용어와 알파벳 대표 낱말 가운데 그림 낱말을 고르고 `seed/images.json` 행과 `seed/vocab.json` 의 `imageKey` 를 채우고, Twemoji 에 없는 낱말의 '그릴 낱말 목록'을 만들고, `pnpm images:fetch` 로 Twemoji SVG 를 받는다. 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p06b`(가지 feature/1a-p06b-vocab-images, P6a 규격 f447bc5 를 합친 끝 — `seed/` 11 파일 · 근거 문서 있음). 커밋하지 않는다. 코드 파일(`src/` · `scripts/` · `tests/` 공용)은 건드리지 않는다 — 일회 스크립트는 `tests/.tmp/p06b/`. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. 네트워크는 `pnpm images:fetch`(jsDelivr 의 Twemoji v17.0.3)만.

## 먼저 읽을 것
plan-p06b 전부 — 특히 '그림 규칙(파일별 값)'(고를 낱말 · 하나에 하나 · 키 꼴 `^[a-z0-9-]+$` · 1-가 먼저 · 출처 차례(비슷한 그림으로 때우지 않음, 사람 그림은 기본 피부색) · images.json 행 칸(source `twemoji v17.0.3 <코드>` · license `cc_by` · attribution 글 그대로 / 자체 그림은 `self-made <날짜>` · `generated`) · 자체 그림 지침 · CREDITS.md). 13절 C65(H7 확정 — Twemoji 주 묶음, 없는 것만 그림) · C54 · C61. 정본 3.1(알파벳 · 소리 단원 — 대표 낱말), `specs/04-데이터.md` 5절 images 행, `specs/06-시드-생성.md` 6.3 그림. P6a 근거 문서 `docs/research/2026-10-16-seed-reference-basis.md`(1~2단계 낱말 · 4단계 그림 낱말 변화는 작업 7 몫, touch · point 그림 여부는 P6b 가 판정). P6b 작업 2 보고(`task-p06b-report.md` 워크트리)의 명령 사용법(`pnpm images:fetch` · `pnpm images:check`, 종료 0 · 1 · 2).

## 할 것
1. 1~2단계 vocab(각 125 내용어)과 알파벳 대표 낱말(3.1 · level-specs) 전부를 훑어 그림 낱말을 고른다(구체 명사 · 동작어 · 색 · 수 1~10 · 표정 분명한 감정; 추상 · 비교 · 기능어 제외). 낱말마다 Twemoji v17.0.3 에서 **그 뜻을 바로 그린** 그림의 코드를 찾는다(비슷한 것으로 때우지 않음). 없는 낱말은 '그릴 낱말 목록'(`tests/.tmp/p06b/to-draw.json` + 보고 표: 키 · 낱말 · 뜻 · 그릴 모습 한 줄)으로.
2. `seed/images.json` 행(Twemoji 행은 attribution 글 그대로) · `seed/vocab.json` 의 해당 항목 `imageKey`. 한 낱말에 그림 하나. 키는 소문자 · 하이픈.
3. `pnpm images:fetch` 로 받아 `public/images/vocab/<키>.svg`(받은 SVG 는 바꾸지 않음) → `pnpm images:check` → 문제는 '그릴 그림 빠짐'뿐이어야 한다. `pnpm seed:validate` 종료 0(reference-image 검사 포함).
4. 모아 보기 쪽 `tests/.tmp/p06b/sheet.html`(키 · 낱말 · 뜻 · 그림 · 출처, 작업 5 화면 검토가 Playwright 로 찍는다) 초안.
5. 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p06b-report.md` 에 '작업 3' 절: 고른 낱말 수(1단계 · 2단계 · 알파벳) · Twemoji n · 그릴 낱말 n(표) · 뺀 낱말과 까닭 표본 · images:check · seed:validate 첫 줄 · 다르게 한 것 · 결정이 필요한 것(예: 한 뜻에 그림 둘 가운데 고르기 어려운 것). 끝나면 상태(DONE · DONE_WITH_CONCERNS · BLOCKED)와 요지 5줄을 컨트롤러에게 SendMessage 로.

## 지킬 것
아이 눈(한 그림 한 뜻 · 헷갈리지 않음 · 무섭지 않음 · 글자 · 상표 · 실제 인물 없음) · 라이선스 칸 정확히 · 수(IMAGE_MAX_BYTES 등)는 구조 상수 · 금지어 목록(seed/lists/forbidden.json) 낱말은 그림 낱말에서도 제외.
