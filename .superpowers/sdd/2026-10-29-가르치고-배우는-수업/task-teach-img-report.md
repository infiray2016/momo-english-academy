# 보고: 3단계 단원 1 새 단어 그림 열(구현자 · 2026-10-30 02:1x) — DONE_WITH_CONCERNS

워크트리 p13d. 바꾼 파일: `seed/images.json`(끝에 10행, 207 → 217) · `public/images/vocab/` 새 SVG 10 · `CREDITS.md`(Twemoji 160장 · 자체 57장 · 자체 목록에 9 낱말). 열 낱말은 전에 없었다. 두 낱말 키는 카탈로그 규칙(`ice-cream` · word `ice cream`, 키 정규식 `^[a-z0-9-]+$`)대로 `living-room` · word `living room`.

| 낱말 | 출처 | 파일 | 바이트 | 그림 |
|---|---|---|---|---|
| eat | self-made 2026-10-30 | eat.svg | 2329 | 그릇을 든 아이가 숟가락을 입에 넣음(hungry 의 '식탁 옆 그릇'과 다름) |
| drink | self-made 2026-10-30 | drink.svg | 2148 | 주스 컵을 기울여 입에 댄 아이(thirsty 의 '컵 들고 땀'과 다름) |
| go | self-made 2026-10-30 | go.svg | 1683 | 오른쪽으로 걸어가는 아이 + 앞으로 향한 초록 화살표 |
| come | self-made 2026-10-30 | come.svg | 1903 | 두 팔을 벌린 아이 + 양쪽에서 아이 쪽으로 오는 초록 화살표 |
| wash | self-made 2026-10-30 | wash.svg | 2710 | 수도꼭지 물 아래 두 손 + 비누 거품 + 세면대 |
| classroom | self-made 2026-10-30 | classroom.svg | 2015 | 칠판(동그라미 · 세모 · 네모, 글자 없음) + 책상 · 의자 세 벌 |
| bedroom | self-made 2026-10-30 | bedroom.svg | 1702 | 방 안: 침대 · 창문 · 협탁 등(bed 의 Twemoji 1f6cf 와 구별) |
| bathroom | self-made 2026-10-30 | bathroom.svg | 2199 | 타일 벽: 욕조 · 샤워기 · 세면대 · 거울 · 수건(bath 의 1f6c1 과 구별) |
| living room | twemoji v17.0.3 1f6cb | living-room.svg | 1714 | 소파와 전등(`pnpm images:fetch` 로 받음, 씀 1 · 같아서 건너뜀 159) |
| restaurant | self-made 2026-10-30 | restaurant.svg | 2694 | 체크 식탁보 식탁 · 의자 둘 · 음식 접시 · 매단 등 · 풍경 액자 |

자체 그림은 C65 꼴(viewBox 36 · 평면 채색 · 글자 · 숫자 · 상표 없음)이고, 아이 몸은 hungry · thirsty 의 꼴과 색을 그대로 썼다. rsvg-convert 로 렌더링해 눈으로 봤다(come 은 처음에 '손을 귀에 댄' 꼴이라 '듣다'로 읽혀 다시 그렸다).

## 관문(그대로)
- `pnpm images:check` → `vocab-images check: 행 217 · 파일 217 · 위반 0`, 종료 0
- `pnpm seed:validate --areas reading,writing,speaking` → `칸 769 · 통과 766 · 실패 0 · … 경고 12 · 규격 파일 오류 0`, 종료 0(경고 12 는 모두 unit-goals 로 그림과 무관)
- `pnpm check:ids` → `design-number 44`, 나머지 항목 0, 종료 0(보고 모드, 그림 파일과 무관한 기존 값)
- `pnpm vitest run tests/unit/vocab-images.test.ts tests/unit/seed-teacher.test.ts tests/unit/seed-validate-cli.test.ts` → 36 통과. Biome 는 두 파일을 설정에서 제외해 검사 대상이 없다.

## 우려 3
1. `seed/vocab.json` 의 열 낱말 행에 `imageKey` 가 없어 그림이 아직 낱말에 이어지지 않는다(시드 JSON 은 이번 범위 밖). 잇는 일은 시드 쪽 작업에서 해야 한다.
2. go · come 은 뜻이 추상적이라 화살표로 방향을 보였다. 아이 눈 검토(design-reviewer)에서 come 이 '오다'로 읽히는지 확인하길 권한다.
3. living room 만 Twemoji 가구 그림이고, 다른 방 셋과 식당은 벽 · 바닥이 있는 방 장면이라 화풍이 조금 다르다. 브리프 규칙(Twemoji 우선)을 따랐다.
