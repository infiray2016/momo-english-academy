# 구현 브리프: 전체 디자인 리뷰 fix 묶음 1(implementer impl-p13-2 이어 보기 · Opus · high, 2026-10-23 01:3x 작성 · 01:5x 보냄(시드 커밋 뒤))

`review-design-all.md`(des-all · Fable max — 수정 필요 C 0 · I 1 · M 11) 6절 fix 묶음 표의 **#1~#5 · #7~#11** 을 한 차례로 고친다. **#6(M-6 세션 활동 카드 둥근 모서리 → 보드 꼴)은 빼 둔다** — 시각 결정이라 요청자 표본 뒤에 따로. 워크트리 p13(HEAD = 개발용 시드 회화 커밋 뒤). 시험 먼저. 커밋 없음. `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`.

| # | 지적 | 할 일(보고 6절 한 줄 그대로 + 컨트롤러 결정) |
|---|---|---|
| 1 | M-1 회화 막힘 · 쉼 안내가 코르크 위 | blocked · resting body 를 `TalkStart` 꼴 종이 판(테이프 연두) 안에. 목록 · 지난 수업 · 세션의 쉼 · 막힘 틀도 같은 꼴로 맞출 수 있으면 함께(공용 조각 하나로) |
| 2 | M-2 세로 띠가 대화 토막에서 두 줄로 늘어 판이 56px 뜀 | 셈 '말 주고받기 n / 목표'를 `detail` 줄로, 오른쪽 묶음은 단추 둘만 — 띠 높이 고정; 네 영역 세션 띠 사진 다시 확인 |
| 3 | M-3 가로 단추 왼쪽 정렬 | 가로 `lg:flex-row lg:justify-between`(힌트 단 왼쪽 flex-1 · 단추 묶음 ml-auto) — 목업 B_Talk1 |
| 4 | M-4 테이프 겹침과 색 | 따라 말하기 토막 카드 테이프 치우침 또는 판 테이프 숨김 · 마무리 테이프 연두 통일 |
| 5 | M-5 ①② 대체 글꼴 | Fredoka 숫자 + 원 테(접근 이름 그대로) |
| 7 | M-7 문장부호 떨어짐(읽기 지문 · 쓰기 5단계) | 뒤따르는 문장부호를 앞 상자에 붙임 · nowrap, 단위 둘 + 지문 e2e 단언(fix 8b N-3 와 같은 뜻) |
| 8 | M-8 목록 기다림 · 안내 · 오류 줄(fix 8b N-1 · N-2) | `grid-auto-flow: dense` + `col-span-full` 한 줄 칸에 기다림 · 안내 · 오류, 실패 때 selected 되돌림, e2e 둘 |
| 9 | **I-1 · M-9 무음 모드 안내 · 스크린 타임 길** | 문구는 plan-p11a 정본 밖 문구 표 새 두 행(13절 **C111**) 그대로: 막힘 안내 셋(`session-frame.tsx` · `talk-frame.tsx` · `placement-flow.tsx`)의 둘째 줄을 **아이패드 사파리일 때만** '아이패드 제어 센터에서 무음 모드를 꺼 주세요'; 첫 실행 아이패드 상자(`first-run-flow.tsx`)에 무음 모드 한 줄 · 스크린 타임 길 한 줄. 기기 판정은 기존 `describeDevice` 꼴 |
| 10 | M-10 aborted + 'Dictation' 메시지 | `aborted` 이고 message 가 /dictation/i 면 `mic-unavailable` 갈래(새 문구 없음 — 막힘 안내가 #9 줄을 보임), 단위 |
| 11 | M-11 시험 · 사진 보강 | 둘째 세션 `fitsBothWays` · `guidedSample(5)` 5단계 과제 글(장부 91행 (2)) · 회화 세로 띠 높이 단언 · 목록 N-1 · N-2 단언 · 사진 `photo()` — 첫 실행 8 · 배치 4 · 홈 기본 · 목록 기본 · 지난 수업 |

지킬 것: 정본 4절 · 포스트잇 보드가 우선. 회화 1~3단계 영어 경계 그대로. 설계 숫자 없음(화면 꼴 상수는 이름 붙임). P10 · P11 · P13 e2e 그대로 초록.

보고: `task-p13-report.md` 에 '디자인 fix 1' 절(번호별 어떻게 · 바뀐 파일 · 시험 · 사진 이름) · SendMessage 한 줄 → 컨트롤러 CI(사진) → des-all 재검토(I-1 + 번호별 한 줄) → 커밋.

## 덧(01:4x, 컨트롤러) — 요청자 지적 · 결정 둘을 같은 묶음에
| # | 지적 · 결정 | 할 일 |
|---|---|---|
| 12 | **C114 포스트잇 크기 일관(요청자 '포스트잇 크기가 서로 다른 게 안 보이나')** — 홈 영역 카드 넷이 내용 길이만큼 높이가 다름(`home-cards.tsx:211` `items-start` — 목업 B_Home4 는 네 장 같은 높이 400px), 수업 목록 카드가 줄 · 상태마다 높이가 다름(사진 `p11-lesson-start-wait-landscape` — 1번 카드 짧고 3~5번 늘어남 · 잠긴 단원 짧음) | 홈: 한 판의 영역 카드는 같은 높이(`items-stretch` + 카드 안 세로 flex · 시작 단추 `mt-auto` 아래 끝, 최소 높이는 이름 붙인 화면 꼴 상수), 가로 네 칸 · 세로 두 칸 모두. 목록: 카드 크기 같음(격자 행 높이 고정 또는 카드 높이 같게 — '여기부터 해요'는 두 칸 너비여도 높이 같게, 기다림 · 안내 · 오류는 #8 의 `col-span-full` 한 줄 칸이라 카드가 늘지 않음, 잠긴 단원 카드도 같은 높이). e2e: 홈 영역 카드 넷의 높이가 같음(±1px) · 목록 카드 높이가 같음 — 두 방향 사진 다시 |
| 13 | **C112 회화 1~3단계 모델 Sonnet** | `seed/settings.json` `ai.model.talk_turn.1-3` → `claude-sonnet-5-5`(실시드), `tests/fixtures/settings.ts` 같은 키, 시험용 시드 설정(loadableSettings) 같은 키. 1~3단계가 Haiku 라는 가정을 하던 시험(거절 뒤 Sonnet 재시도 · 모델 단언)은 그 시험 안에서 Haiku 를 골라 두게 바꿈. 코드의 생각 '끔' → Sonnet between_tools 변환이 1~3 구간에도 맞는지 단위 하나 |

## 덧(01:5x, 컨트롤러) — 보조 스킬 적용(요청자 '디자인 테이스트랑 UI UX 프로 적용')
두 스킬의 기준 가운데 **정본 4절 · 포스트잇 보드와 부딪치지 않는 것만** 이 묶음에 넣는다. 스크립트는 돌리지 않는다. 읽을 곳: `.claude/skills/design-taste-frontend/references/app-screens.md` §4.1 한 간격 · §4.2 한 왼쪽 끝 · 같은 줄 아래 끝 · 늘인 카드의 빈 띠 · §11 기다림 · 오류는 그 칸 안에서, `.claude/skills/ui-ux-pro-max/SKILL.md` Quick Reference §1 · §2 · §3 `content-jumping` · §7. 전체 디자인 리뷰가 §1 · §2(누름 44 · 대비 4.5:1 · 초점 고리 · 그림 단추 이름)는 이미 맞다고 쟀다(`review-design-all.md` 53행) — 다시 하지 않는다. 판 반지름은 바꾸지 않는다(#6 표본 뒤).

| # | 기준(스킬) | 지금 코드 | 할 일 |
|---|---|---|---|
| 14 | 같은 종류 카드는 화면이 달라도 같은 크기 · 한 판 한 간격(taste §4.1 · C114) | 수업 목록 카드 `lesson-board.tsx:202` `min-h-32 p-4 pt-7`(가로 `min-h-24 p-3 pt-6`) · 격자 `:42` gap-4/gap-3 ↔ 지난 수업 카드 `past-lessons.tsx:74` `min-h-36 p-4 pt-8` · 격자 `:64` gap-6 — 같은 '수업 카드'인데 크기 · 간격이 다름 | 수업 카드 크기 · 격자 간격을 이름 붙인 화면 꼴 상수 하나로 두 화면이 함께 씀(#12 의 '높이 같게'와 같은 상수). e2e: 목록 카드 하나와 지난 수업 카드 하나의 높이 · 너비가 같음(±1px) |
| 15 | 같은 줄 카드는 아래 끝이 같고, 늘인 카드 안에 40px 넘는 빈 띠 없음 · 아래 끝에 붙는 것은 단추 하나(taste §4.2) | 홈 `home-cards.tsx:211` `items-start`(#12) | #12 를 할 때 카드 안 내용(이름 · 막대 · 칸)은 위에서부터, 시작 단추만 `mt-auto`. 사진 두 방향에서 가장 짧은 내용 카드의 단추 위 빈 띠를 재어 보고에 적음(40px 넘으면 최소 높이 상수를 줄이거나 내용 순서로 맞춤) |
| 16 | 빠르게 두 번 눌러도 화면이 커지지 않음(ui-ux-pro-max §2 `tap-delay`) — 아이가 타일 · 보기를 빨리 누르는 화면 | `touch-action` 이 저장소에 없음 | `globals.css` 바탕 층에 `button, a, [role=button], label, summary { touch-action: manipulation }`. 손가락 두 개 확대(viewport)는 그대로 둔다. 단위 또는 e2e 하나(계산된 스타일 `touch-action` 이 `manipulation`) |
| 17 | 움직임 줄이기 설정이면 누름 움직임도 없음(ui-ux-pro-max §1 `reduced-motion`) | 토리 · 말하기 단추 · 기다림 점은 `motion-safe` · `motion-reduce` 로 맞음, `board.tsx:175` 누르는 종이의 `transition-transform` 만 빠짐 | `motion-reduce:transition-none` 더함 |
| 18 | 격자 셈이 닫힘(taste §4.2 'Write your sum down') | — | 보고에 홈 두 방향 · 목록 두 방향의 셈을 한 줄씩(카드 너비 × 수 + 간격 × (수 − 1) = 판 안쪽 너비). 판 바깥 여백은 양쪽 같음 |

보고 '디자인 fix 1' 절에 #14~#18 도 같은 꼴로. 재검토(des-all)에는 컨트롤러가 '같은 종류 종이 크기 일관 · 같은 줄 아래 끝 · 한 판 한 간격'을 기준으로 더해 보낸다.
