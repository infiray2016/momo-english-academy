# 검토 브리프: P11b 차례 6 화면 검토 — 쓰기 6~12 첫 세션(design-reviewer des-p11c 이어 보기 · Fable · max, 2026-10-22 16:3x — CI 사진 뒤 보냄)

사진 폴더 /private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/686cc61d-5a44-4211-9d88-26af0ec4ddfa/scratchpad/p11-photos-10(CI 14차 e2e-photos — 생각 꺼내기 → 초고 → '글을 보냈어요' → '첨삭 보기' 자리, 두 방향 + 기존 사진 다시 찍힘). 코드: 워크트리 p11 작업 트리(`src/components/session/writing-composition.tsx` · 결과 · 세션 틀). 대조: 정본 3.3 쓰기 6~12 행 · 생각 꺼내기 문단 · 4절 쓰기 세션 행 · 결과 행 · C82 크기 · 해요체 · '한 화면에 행동 하나' · 목업 B_Writing2 · B_Result(plan-p11a '화면을 보는 차례' 6 행), plan-p11a 정본 밖 문구 표. 구현자 보고 '차례 6' 절(정할 것 둘 — 기기 자판 입력란 · '첨삭 보기' 자리는 컨트롤러가 받음).

볼 것: 생각 꺼내기 질문 · 보기 3개 · 한글 입력란의 크기 · 초점 · 넘침(두 방향), 초고 화면(생각 요약 · 쓸 낱말 · 문장 시작 틀 · 입력란)의 한 화면 · 글자 크기 · 'AI 기다림' 표시, '글을 보냈어요' 결과 화면과 '첨삭 보기' 안내 문구(정본 · 문구 표 글자 그대로), 사진 없는 상태(코드로만)는 따로 표시. 지적마다 심각도 · 근거(사진 이름 · 화소 · 코드 줄 · 정본 절). 열린 장부의 화면 몫 판정(닫힘 · 아직 열림). 보고 `review-p11-6-design.md`, 끝나면 SendMessage 한 줄.

덧(16:4x): 사진은 CI 14차 run 39741128570(ci/p11-c2 e4b1e83, 전부 초록)의 e2e-photos. 그 뒤 fix 6(코드 검토 M 3 — '쓸 수 있는 단어' 칩 24px · 56px 로 바뀜, writing-composition.tsx:421)이 작업 트리에 들어가 있어 초고 화면 칩 크기는 사진(22px)과 코드(24px)가 다르다 — 코드 기준으로 보고 사진은 fix 6b 뒤 CI 15차에서 다시 찍힌다. 코드 검토 B2 는 Approved(M 3 → fix 6).
