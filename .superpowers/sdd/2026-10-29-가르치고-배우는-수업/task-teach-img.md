# 브리프: 가르치고 배우는 수업 plan 묶음 자-2 첫 일 — 3단계 단원 1 새 단어 그림 열(구현자 · Opus · high, 2026-10-30 02:0x)

plan `intent/2026-10-29-가르치고-배우는-수업/plan.md`(approved C186) 정한 것 14 와 작업 순서 6 의 첫 단계다: 3단계 단원 1 새 단어 열 개(eat · drink · go · come · wash · classroom · bedroom · bathroom · living room · restaurant — 읽기 · 말하기가 같은 다섯을 쓰므로 모두 열)의 그림을 만들어 `seed/images.json` 에 더하고 `pnpm images:check` 를 통과시킨다(장부 L-1, C170 (6), 정본 6.3 '모자라는 단어만 이미지 생성 도구로 한 번' — 여기서는 그림 도구 대신 Twemoji 또는 손 그린 SVG, C116 · C65 꼴). 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지.

## 할 것
1. 지금 그림 카탈로그(`seed/images.json` 207장 — Twemoji 159 · 자체 48, `public/images/vocab/`, `CREDITS.md`)의 꼴(키 · 파일 이름 · 출처 칸 · 저작 표시)을 먼저 읽는다. 열 낱말이 이미 있는지 확인한다(있으면 그대로 두고 보고에 적음).
2. 낱말마다 Twemoji 에 그 뜻의 그림이 있으면 그것을 쓴다(지금 Twemoji 그림을 들여온 방법 · 저작 표시 꼴 그대로 — 파일 복사 또는 같은 스크립트). 없거나 뜻이 어긋나면 Claude 가 SVG 로 그린다(C65 꼴: viewBox 36 · 평면 채색 · 글자 없음 · 초등 4학년이 한눈에 알아보는 단순한 그림 — eat 은 숟가락 든 아이 · drink 는 컵을 든 아이 꼴처럼 '하는 일'이 보이게, 방 이름은 그 방의 대표 물건(침대 · 욕조 · 소파 · 식탁과 의자 · 칠판)으로).
3. `seed/images.json` 에 열 행(키는 단어 그대로, 두 낱말 단어 living room 은 지금 카탈로그 규칙대로), `CREDITS.md` 에 출처(Twemoji CC-BY 4.0 표시 · 자체 그림은 자체로), 파일은 `public/images/vocab/`.
4. `pnpm images:check` 종료 0, `pnpm seed:validate --areas reading,writing,speaking` 종료 0(원본 시드 셋 그대로 — 새 단어 그림 키 검사가 있으면 그것도 통과), `pnpm check:ids` 보고 모드.

## 지키는 것
그림에 글자 · 이름 · 상표 없음. 아이가 보는 그림이라 무섭거나 어둡지 않게. 다른 파일(시드 JSON · 코드 · 브리프)은 손대지 않는다. 커밋하지 않는다.

## 보고(`task-teach-img-report.md`, 같은 폴더, 25줄 안)
낱말마다 출처(Twemoji 코드 또는 자체) · 파일 · 크기(바이트) · images:check 결과 · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.
