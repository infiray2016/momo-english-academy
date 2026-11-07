# 브리프: P6b 작업 4 — 자체 그림 SVG 그리기(implementer impl-p06b 이어 보기 · Opus · high)

plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p06b-그림-카탈로그.md` 작업 4. 작업 3 이 만든 그릴 목록 `tests/.tmp/p06b/to-draw.json`(45) **+ 셋(student · white · glasses — 컨트롤러 판정: Twemoji 가 학사모 · 연회색 · 선글라스로 읽혀 그린다; 그 셋은 images.json 행을 `self-made <오늘>` · `generated` 으로 바꾸고 받은 Twemoji 파일은 지운다)** = 48 장을 plan '자체 그림 지침'대로 그린다. 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p06b`, 커밋하지 않는다, 코드 파일(`src/` · `scripts/` · `tests/` 공용)은 건드리지 않는다. 네트워크 없음.

## 지침(plan 글자 그대로)
`viewBox="0 0 36 36"`, 투명 바탕, 평면 채색(Twemoji 와 비슷한 색 · 면 위주), 가운데 놓기. 글자 · 숫자 · 상표 · 실제 인물 없음. 무섭거나 다치는 모습 없음. 동작어는 사람 하나가 그 동작을 하는 모습, 얼굴은 단순하게. `<svg xmlns="http://www.w3.org/2000/svg" …>` 하나에 도형만 — `<script>` · `<foreignObject>` · `<image>` · 바깥 주소 · on* 속성 · `@import` 금지(`pnpm images:check` 의 checkSvg 가 본다). 크기 ≤ IMAGE_MAX_BYTES. 한 그림 한 뜻 · 헷갈리지 않음 · 아이 눈. 사람 피부는 Twemoji 기본색 계열. 가리키기 틀(head · hair · face 등 몸의 부분)은 몸 그림에 그 부분을 빨간 점선 동그라미로 짚는 방식으로 시도하고, 작업 5 에서 안 읽히면 컨트롤러가 head 를 뺀다.

## 할 것
1. 48 장을 `public/images/vocab/<키>.svg` 로 그린다(스무 장 안팎씩 나눠 그리고 그때마다 `pnpm images:check`).
2. `seed/images.json` 의 자체 그림 행 날짜(`self-made YYYY-MM-DD`)를 그린 날로 맞춘다. 셋(student · white · glasses)의 행 바꾸기.
3. `tests/.tmp/p06b/sheet.html` 에 그린 그림이 보이게(작업 3 의 틀 그대로) → `node tests/.tmp/p06b/shot.mjs` 로 사진을 찍어 보고에 경로.
4. 완료: `pnpm images:check` 0 · `pnpm seed:validate` 종료 0 · `pnpm test` 167 · lint 0.
5. 보고 `task-p06b-report.md` 에 '작업 4' 절(그린 48 표 — 키 · 모습 한 줄 · 크기, 지침 대조, 어려웠던 낱말과 대안, 사진 경로). 끝나면 상태와 요지 5줄 SendMessage. 다음은 작업 5 화면 검토(design-reviewer).
