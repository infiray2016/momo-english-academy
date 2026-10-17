# 검토 브리프: P11a 차례 2 화면 검토 — 읽기 세션 · 결과(design-reviewer des-p11 · Opus · xhigh, 2026-10-18 06:3x 작성 — CI 사진을 받은 뒤 보냄)

사진: 컨트롤러가 CI 아티팩트(e2e-photos)에서 내려 둔 폴더 PHOTO_DIR(파일 이름 `p11-reading-<화면>-<portrait|landscape>.png`, 세로 820 × 1180 · 가로 1180 × 820). 로컬 e2e · dev 서버는 이 Mac 에서 못 돌린다(공유 메모리 고갈) — 사진과 코드로만 판정한다. 코드: 워크트리 p11 `src/components/session/reading.tsx` · `src/app/(child)/session/[id]/session-frame.tsx` · `src/app/(child)/result/[id]/result-view.tsx` · `src/components/activities/reading.tsx`. 구현 브리프 `task-p11-2.md` · 보고 `task-p11-report.md` '차례 2' 절(사진 이름 목록) · plan-p11a 값 7 · 8 · 9 · 정본 밖 문구 표(a 행) · 정할 것 사 · 위험 9.

## 대조할 것
- 목업 캔버스 https://claude.ai/artifact/BaG1A1Ewst9AzMLKHD4Zp2 의 **B_Reading** · **B_Result**(Artifact 도구 read 로 읽는다 — 요청자 소유 아티팩트).
- 정본 4절(`specs/03-화면.md`) 첫 문단(아이 화면 원칙 · 글자 크기 · C82 보조 줄) · 세션 공통 · 읽기 세션 행 · 세션 결과 행(C78 포인터 → plan 표 문구), 3.3 읽기(새 단어 미리보기 → 지문 → 문항 · 1~4단계 그림 · 틀린 문제 해설과 다시 풀기), 13절 C77 (1) · C78 · C82.
- CLAUDE.md 아이 화면 원칙: 한 화면 한 행동 · 해요체 · 큰 글자 · 포스트잇 보드(코르크 · 종이 띠 · 노랑 읽기) · 글꼴 Jua · Gowun Dodum · Fredoka.

## 볼 것
1. 지문 활동 — 그림 줄(1~4단계) · 새 단어 표시 · '읽어 주기' 단추(눌러서만, 저절로 읽지 않음) · 안내 '모르는 단어를 누르면 뜻이 보여요' · 낱말 뜻 쪽지(누른 낱말 위, 글로서리 뜻) · '다음' 하나. 긴 지문의 세로 넘김.
2. 문항 활동 — 가로: 지문 칸 · 문항 칸 나란히(B_Reading), 지문 칸은 **글만(그림 줄 없음 — 컨트롤러 결정)**; 세로: 문항 위 작은 '지문 보기' → 쪽지(지문 · '읽어 주기' · '닫기'). 보기 넷 · 고르면 바로 채점 · '맞았어요!' + 해설 + '다음' · 처음 틀리면 해설 + '한 번 더 풀기'(정답 안 보임) · 둘째 뒤 정답 표시 + '다음'. 퍼센트 · 판정 글자 없음.
3. 결과 — '수업을 끝냈어요!' · 큰 '다음 수업' · 작은 '홈'(또는 큰 '수업 목록') · 숫자 없음 · B_Result 와 대조(별 · 단어 · 막대는 P12 — 자리 비움이 어색하지 않은가).
4. 틀 — P10 종이 띠 · 활동 점 · '홈' 그대로, 두 방향 가로 넘침 없음, 글자 크기(안내 20 · 영어 24 · 단추 이름표 22 · 카드 보조 줄 20 · 누르는 곳 56 — 지문 안 낱말 단추는 예외 `data-size-exempt`, 그 예외가 아이 손가락에 알맞은가는 여기서 판정).
5. 문구가 정본 · plan 표 글자 그대로인가, 영어 직역 · 개발 용어 노출 없는가, 아이 이름 없는가.

## 보고
`review-p11-2-design.md` — 판정(Approved · Changes requested) · 지적마다 심각도(Critical · Important · Minor) · 근거(사진 이름 · 목업 자리 · 정본 절 · 코드 줄). 사진이 없는 화면은 '사진 없음 — 코드로만' 표시. 끝나면 SendMessage(team-lead) 한 줄.
