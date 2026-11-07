# 구현 보고: 첫 프리뷰 화면 결함 셋(task-ux-fix-1, 2026-11-05 22:1x)

상태: DONE. 워크트리 `.claude/worktrees/p13d`(HEAD ed5d845 위 미커밋). 커밋 · push · DB 쓰기는 하지 않았습니다.

## 바뀐 파일:줄

| 자리 | 바뀐 줄 | 무엇 | 기준 단언 줄 |
|---|---|---|---|
| I(2) 홈 세로 2×2 높이 | `src/app/(child)/home-cards.tsx:416`(주석 407~409) | 격자에 `auto-rows-fr`를 더했습니다. 두 줄이 가장 높은 줄 높이로 같아집니다. 판은 내용 높이이고(`page.tsx` 79줄, flex-1 없음) 남는 화면을 줄에 나누지 않습니다. | `tests/e2e/home.spec.ts` 329줄 시험(AC-23h, 367~ 높이 · 너비 spread ≤ SAME_PX) · 564줄 시험(583~592 높이 spread · 줄마다 bottom spread) |
| J-1 '다지기' 이름표 | `src/app/(child)/[area]/lessons/lesson-board.tsx:511~525` | 맨 `p` 대신 종이 쪽지 `PostIt tone="paper" tape={false}`(기울기 · 테이프 없음, `self-start px-4 py-1.5`) 안의 span 에 글을 두었습니다. 표지 `data-reinforce-label`을 달았습니다. | `tests/e2e/font-size.spec.ts:92` 이 부르는 `child-size.ts` `childContrastProblems`(글 바로 아래 가장 가까운 불투명 층이 책상이면 위반) |
| J-2 낙서 · 기운 카드 겹침 | `src/components/board/decor.tsx:12~22`, `src/components/board/paper-key.ts:17~31` | 낙서 너비를 18에서 14로, 화면 끝 거리를 3에서 1로 바꿨습니다. 그래서 낙서 띠 끝이 21px 에서 15px 로 옮겨 갔습니다. 옆 여백 24px 안에 9px 빈 몫이 생깁니다. 회전 상자가 옆으로 나오는 너비를 순수 함수 `tiltOverhangPx`로, 최대 기울기를 `PAPER_TILT_MAX`로 두었습니다. 카드 기울기 값(−1.4 · 1 · −0.6 · 1.2°)은 그대로 두었습니다. | `font-size.spec.ts:92` 이 부르는 `child-size.ts:271~322` `decorOverlapProblems`(회전을 포함한 getBoundingClientRect 겹침) |
| 단위 시험 | `tests/unit/ux-tokens.test.ts:389` 새 시험 하나, 가져오기 줄 | 아래 '덮는 테스트' 참고 | |

## 설계와 다르게 한 것과 이유
- **J-2 는 낙서 쪽을 고쳤습니다.** 브리프는 낙서를 옮기거나 기울기를 줄이는 길 둘을 열어 두었습니다. 카드 기울기는 설계 5.2 값이고 `ux-tokens.test.ts:334` 가 그 값을 잠그므로 바꾸지 않았습니다. 분류 보고 2절 J 행이 권한 값(너비 14 · 안쪽 1)을 썼습니다.
- **낙서 크기 값은 decor.tsx 의 화면 꼴 상수로 두었습니다.** 설정값이 아니라 원래부터 그 파일의 상수였습니다(12절 머리 문단, C72 꼴). 옆 여백 24px 는 `board.tsx` main 의 `px-6`이고, 그 파일은 맡은 범위 밖이라 decor.tsx 에 같은 값의 상수 `SCREEN_SIDE_GUTTER`를 두고 주석으로 출처를 적었습니다.

## 요청하는 변경(공용 파일 · 설계)
- **옆 여백 값이 두 곳에 있습니다.** `board.tsx` ChildScreen 의 `px-6`과 `decor.tsx`의 `SCREEN_SIDE_GUTTER = 24`가 같은 값입니다. 이후 여백을 바꿀 때 함께 바꿔야 합니다. 원하시면 board.tsx 가 그 상수를 쓰게 묶는 작은 고침을 따로 맡겨 주세요.

## 덮는 테스트
- `ux-tokens.test.ts` 「AC-23e (3) 낙서 띠는 옆 여백 안에 있고, 가장 크게 기운 카드도 높이 상한까지는 회전 모서리가 낙서 띠에 닿지 않는다(첫 프리뷰 분류 J-2)」: 너비 0~600 카드가 높이 720px(`DOODLE_SAFE_CARD_HEIGHT`) · 1.4° 일 때 나오는 너비가 9px 보다 작은지 셉니다. 고치기 전 꼴(띠 끝 21px)이 세로 홈 카드 374 × 480 과 겹쳤다는 것도 함께 잠급니다.
- I · J-1 은 단위 시험이 없습니다. HomeCards 는 훅 · 서버 액션을 써서 단위 렌더링이 어렵습니다. e2e 기준 단언(위 표)이 덮습니다.

## 실행 명령과 출력
명령은 모두 `( cd …/p13d && export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH" && pnpm … )` 서브셸에서 돌렸습니다. 전문은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ux-fix-1-{biome,tsc,unit}.txt`에 있습니다.

| 관문 | 결과 |
|---|---|
| `pnpm biome ci .` | 0, 575 파일 |
| `pnpm tsc --noEmit` | 0 |
| `pnpm vitest run --project unit` | 0, 142 파일 · 1786 통과 · 6 todo(전보다 1 늘었음) |

e2e 는 이 Mac 에서 돌릴 수 없어(시험용 Postgres 없음) CI 에서 확인해야 합니다.

## 사진으로 확인할 것
- `ux3-home-first-use` · `home-default`(세로 820 × 1180): 네 카드 높이가 같은지 확인합니다. 짧았던 줄이 최대 12px 늘어나므로, 둘째 줄 아래 끝이 1180 안에 드는지도 확인합니다. home.spec 에는 보는 창 안에 드는지를 묻는 단언이 없습니다.
- 수업 목록 · 회화 수업 목록(세로 · 가로): '다지기'가 종이 쪽지 위에 있는지, 뒷줄 카드와 간격이 어색하지 않은지 확인합니다.
- 홈 세로 · 가로: 낙서(물결 · 반짝 · 소용돌이 · 하트)가 좁아져도 보이는지, 카드 모서리와 떨어져 있는지 확인합니다.

## 남은 우려
- **J-2 는 높이 720px 까지만 보장합니다.** 화면 끝에 붙은 1.4° 카드가 그보다 높으면 다시 낙서와 닿을 수 있습니다. 이번 실행에서 위반은 홈에서만 나왔고, 홈 카드는 그 높이 안에 듭니다.
- **I 는 e2e 로만 검증됩니다.** 홈 판 높이가 늘어나 세로 1180 을 넘는지는 사진으로만 확인할 수 있습니다.
