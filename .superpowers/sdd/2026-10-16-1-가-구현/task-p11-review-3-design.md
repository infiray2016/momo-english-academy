# 검토 브리프: P11a 차례 3 화면 검토 — 쓰기 1~3 · 이어 하기(design-reviewer des-p11 이어 보기 · Opus · xhigh, 2026-10-18 07:5x 작성 — CI 사진 뒤 보냄)

사진 폴더 /private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/686cc61d-5a44-4211-9d88-26af0ec4ddfa/scratchpad/p11-photos-3(`p11-writing-<화면>-<방향>.png` · `p11-resume-<화면>-<방향>.png`, 세로 820 × 1180 · 가로 1180 × 820 — 이름 목록은 보고 '차례 3' 절). 코드: 워크트리 p11 `src/components/session/writing-items.tsx` · `src/components/answer/{choice,tiles,typing}.tsx` · `session-frame.tsx`. 구현 브리프 `task-p11-3.md` · 보고 '차례 3' 절 · plan-p11a 값 11 · 정본 밖 문구 표(쓰기 1~3 갈래별 안내 일곱 · '다시 듣기' · '맞았어요!' · '정답은 이거예요') · 정할 것 마 (2) · 사. 목업 원본 `docs/media/mockups/B_W1_Words.dc.html` · `B_W3_Order.dc.html`(앞 검토와 같이 파일로). 정본 4절 첫 문단 · 쓰기 세션 행, 3.3 쓰기 1~3 행, 13절 C73 · C84 · C77 (2) · C78 · C82, CLAUDE.md 아이 화면 원칙(하늘 쓰기). 코드를 고치지 않는다.

## 볼 것
1. 갈래마다 안내 줄이 문구 표 글자 그대로이고 한 화면 한 행동인가(pick-word 그림 보기 · copy-tiles · build-tiles · fill-letters 타일 · dictation 앱 안 자판 · 조립 카드). 1단계 세 갈래(pick-word · fill-letters · copy-tiles)와 3단계 조립(견본) 사진.
2. 맞음: '맞았어요!' + 낱말 · 뜻 두 줄(B_W1_Words) + '다음'. 틀림: '정답은 이거예요' + 정답(타일 · 카드 차례 그대로, 조립은 고유 명사 · I 카드 정답 꼴 — C84) + '한 번 더 풀기'. 다시 풀 때 입력이 비는가.
3. 조립: 놓는 칸이 카드 수만큼(B_W3_Order) · '카드를 누르면 빈칸으로 가요' · 첫 카드 소문자 그대로(판정이 대문자 처리) · 마침표 카드.
4. 받아쓰기 · 빈 글자 채우기: 들어올 때 읽기 + '다시 듣기' 단추(글 보이는 단추). 앱 안 자판 — 기기 자판 뜨지 않음(코드).
5. 이어 하기(`p11-resume-*`): 닫았다 열면 같은 활동 · 놓은 카드 · 고른 보기 그대로.
6. 크기 · 색 · 틀: 하늘 쓰기 카드, 안내 20 · 영어 24 · 단추 이름표 22 · 타일 · 카드 56 이상 · 가로 넘침 없음 · 두 방향 사진 높이 ≤ 보는 창(지난 I-1 꼴).
7. 문구 · 용어 · 아이 이름 없음.

## 보고
`review-p11-3-design.md` — 판정 · 심각도 · 근거(사진 이름 · 목업 자리 · 정본 절 · 코드 줄). 사진 없는 화면은 '코드로만'. SendMessage 한 줄.
