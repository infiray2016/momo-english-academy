**판정: Approved — I-1 ADDRESSED · I-2 ADDRESSED · M-1~M-4 ADDRESSED · 새 Minor 1(N-1, 막지 않음)**

# 화면 재검토: P13b 차례 5 fix 2(I-1 · I-2 범위 한정) — des-p13 · design-reviewer · Fable · max · 2026-10-22 23:xx

대상: CI 9차(run 39789362496, ci/p13-c1 67797f9 = 워크트리 p13 작업 트리) e2e-photos `p13-talk-*` 두 방향 16장(`p13-talk-hint` 다시 · `p13-talk-picture` 새로). 코드 `src/components/conversation/{talk-frame,tori,child-turn}.tsx` · `src/server/conversation/index.ts`(picturesOf) · `tests/e2e/conversation.spec.ts:493-558`. 구현 보고 `task-p13-report.md` '차례 5 fix 2' 절, fix 브리프 `task-p13-5-fix2.md`.
방법: 사진을 BMP 로 바꿔 python3 표준 라이브러리로 화소를 쟀다(`scratchpad/p13-measure-2/`, 기기 px ÷ 2 = CSS px, 가로 보는 창 820 CSS = 기기 1640). 가로 사진은 쪽 높이가 1640 이면 보는 창과 같다.

## 1. I-1 · I-2 판정

| 번호 | 판정 | 근거(화소 · 코드) |
|---|---|---|
| I-1 가로에서 아이 차례가 보는 창 밖 | **ADDRESSED** | hint-landscape(쪽 높이 1640 = 보는 창): '말하기' 아래 끝 기기 1094 → **547 CSS** · '잘 모르겠어요' 아래 끝 1158 → **579** · '토리의 약속' 1467–1559 → 아래 끝 **779.5**(전부 ≤ 820; 7차는 791 · 823 · 966). confirm-landscape(쪽 1704 = 852 CSS): '말하기' 649 · '잘 모르겠어요' 681 · '토리의 약속' 1531–1623 → **811.5** ≤ 820(남는 32px 는 코르크 여백 24 + 나무 테 8 뿐). dontknow · greeting · dialogue · answers · picture 가로는 쪽 1640. '그만하기'는 위 띠 안 y 104–215(56 CSS, 띠 80–210 안) · x 1821–2069(124 CSS), 그 오른쪽 '홈' 2094–2231 — 판 위 끝이 288 기기 px(144 CSS)로 7차 greeting 과 같아 따로 한 줄(80px)이 사라졌다. 가로에서 힌트 단은 단추 줄 오른쪽(`child-turn.tsx:315` `lg:flex-row-reverse`, 영어 단 x 947–1248 · 듣기 동그라미 1051–1162 = 56). e2e `conversation.spec.ts:496-532` 가 세 선택자의 boundingBox 아래 끝 ≤ 820 과 `[data-paper-band] [data-talk-stop]` 을 단언 |
| I-2 그림 깨짐 때 영어 글 · 자리 | **ADDRESSED** | picture-landscape · -portrait: 말풍선 오른쪽 그림 자리에 글(어두운 화소 0, x 850–1600 · y 530 과 x 1150 · y 300–800) · 깨진 그림 표시(파란 화소 0, x 1303 · y 300–800) 없음, 7차에 있던 'bababa' 글 없음. 말풍선 오른 테 823–828 → 폭 289.5 CSS(240px 자리가 접혀 말풍선 폭을 쓴다 — `w-fit` 이라 글 길이만큼). 코드: `tori.tsx:50-85` `TurnPicture` 가 미리 열어 보고(`new window.Image()` probe) `onError` 로도 깨지면 `null`, `alt=""`; `index.ts:184` `meaningKo: row?.meaning ?? ""`(영어 낱말을 화면 자료로 내리지 않음). e2e `:534-557` 이 naturalWidth 0 인 `[data-turn-picture]` 0 · `main img:not([alt=""])` 0 · 노린 낱말 글 없음을 단언 |

## 2. M-1~M-4(결정대로 고쳤는가)

| 번호 | 판정 | 한 줄 근거 |
|---|---|---|
| M-1 글이 다 흐른 뒤 아이 차례 | ADDRESSED | `tori.tsx:298-315` `onAllTyped` → `talk-frame.tsx:171` `typedDone` · `:255-263` 끝 줄 · 다 흐름 · 읽기 줄 빔이 모두 참일 때만 child. greeting-landscape 가 'How are you today?' 완성 글과 함께 찍혔다(7차는 'How are you to' 중간) |
| M-2 뜻 · ①② 묶음 | ADDRESSED | `tori.tsx:357-390` `data-tori-under`(min-h 56, ①② 먼저 · 뜻 옆). answers-landscape: ① 667–778, 뜻 글 '좋아! 뭐가 보여?' y 722 에서 x 805 부터 — 같은 줄, 7차의 40px 뛰어내림 자리 없음 |
| M-3 말풍선 폭 ≤ 520 | ADDRESSED | `tori.tsx:45-48` `w-fit max-w-[520px]`(상수 `TORI_BUBBLE_MAX_PX` 와 단위 시험). 측정 폭: 세 줄 말풍선 289.5 CSS(answers · picture · hint) · 한 줄 greeting 약 315 — 7차 647 |
| M-4 인식 확인 중 힌트 비활성 | ADDRESSED | `child-turn.tsx:380-382` `confirm !== null`. confirm-landscape: '힌트' 테가 흐림(회색 1123–1234, 56) — '말하기' · '잘 모르겠어요'와 같이 |

## 3. 새 지적(fix 2 가 건드린 자리)

| 번호 | 심각도 | 무엇 | 왜(근거) | 어떻게 |
|---|---|---|---|---|
| N-1 | Minor | **세로(820×1180)에서 위 띠가 두 줄로 접히고 둘째 줄('말 주고받기 n / 목표 턴' · '그만하기' · '홈')이 왼쪽에 붙는다.** hint-portrait · answers-portrait · confirm-portrait: 띠 y 80–351 기기 px(40–176 CSS, 7차는 한 줄 약 70), 둘째 줄 '그만하기' x 232–355 · '홈' 373–438 CSS — 820 폭의 왼쪽 반. 7차 세로는 한 줄이고 '홈'이 오른쪽 끝(690–755)이었다. 원인: 띠 오른쪽에 단추가 하나 늘어 `PaperBand`(`board.tsx:82` `flex-wrap justify-between`)가 접히는데 오른쪽 묶음(`:90`)에 `ml-auto` 가 없어 접힌 줄이 왼쪽 정렬 | 4절 목표 턴 행 ''그만하기'는 대화 중 늘 **구석**에 있다' — 세로에서는 구석이 아니다. 가로는 그대로 오른쪽 위(I-1) | `board.tsx:90` 오른쪽 묶음에 `ml-auto`(접힐 때만 효과, 다른 화면은 그대로) 또는 회화 틀에서 셈 글을 제목 줄에 두고 단추 둘만 오른쪽. e2e 세로 하나: `[data-talk-stop]` 오른쪽 끝이 띠 오른쪽 절반 |

## 4. 참고(막지 않음 — 전체 디자인 리뷰로)

1. 가로에서 아이 차례 단추 묶음이 판 왼쪽 끝(말하기 x 76–236 CSS)에 붙는다(`lg:justify-end` + `flex-row-reverse`). 힌트 단이 없는 턴(dialogue · answers · dontknow 가로)에는 오른쪽이 빈다 — 7차는 가운데. 규칙 위반은 아니나 목업 B_Talk1 은 말하기 단추가 오른쪽 끝이다.
2. 가로의 DOM 차례(힌트 단 → 단추)와 보이는 차례(단추 → 힌트 단)가 다르다(`flex-row-reverse`) — 초점 차례가 눈 차례와 어긋남(보조 스킬 접근성 항목, 정본 규칙 없음).
3. 남은 가로 여유: hint-landscape 에서 판 아래 끝 649 → 약속 위 733.5 사이 약 60 CSS px. 3단계 3단(틀 단 +60)이면 여유 0 으로 딱 맞고, 거기에 토리 말이 네 줄이면 약 4px 넘친다 — 3단계 견본이 생기면 같은 e2e 를 3단계로 한 번.
4. confirm 가로 쪽 높이 852(약속은 811.5 로 안) · hint-portrait 쪽 높이 1188(약속 1147.5 로 안) — 나무 테 아래만 보는 창 밖.
5. ko 뜻이 ①② 오른쪽에 온다(목업은 말풍선 바로 아래 왼쪽) — M-2 결정 '한 묶음'대로이고 20px · 반말 그대로.

## 5. 장부

- `ledger-open.md` 101행(차례 5 코드 검토 b2 → fix 1 · fix 2): 화면 몫은 닫힘(I-1 · I-2 · M-1~M-4 ADDRESSED). N-1 은 막지 않는 Minor — 차례 5 커밋에 넣거나 전체 디자인 리뷰 fix 묶음(85행)으로.
- 85행 전체 디자인 리뷰: 4절 참고 다섯을 넘긴다(앞 보고의 아홉에 더해).
