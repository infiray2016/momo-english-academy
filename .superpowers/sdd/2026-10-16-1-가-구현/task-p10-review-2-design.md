# 화면 검토 브리프: P10 차례 2 — 보드 · 첫 실행 여덟 화면(design-reviewer des-p10 · Opus · xhigh, 읽기 전용, 2026-10-17 22:2x) — 검토 묶음 A1(화면 몫)

plan-p10a 작업 2 · 4(차례 2)의 화면을 정본 4절(첫 실행 행 · 첫 문단) · 13절 C72(정본 밖 문구 표 — plan-p10a '정본 밖 문구') · 아이용 화면 원칙(CLAUDE.md: 해요체 · 한 화면 한 행동 · 큰 글자 · 포스트잇 보드 — 코르크 바탕 · 종이 띠 · 포스트잇 넷, 글꼴 Jua · Gowun Dodum · Fredoka) · 목업(B_Home4 · B_Sticky · B_Profile, `docs/media/mockups/` · 캔버스 https://claude.ai/artifact/BaG1A1Ewst9AzMLKHD4Zp2)과 대조해 판정한다. 첫 실행은 **부모 화면**이다(4절). 지적마다 심각도(Critical · Important · Minor)와 근거(사진 파일 · 4절 행 · C72 표 줄). 저장소 · 워크트리 파일을 고치지 않는다(사진 찍기는 된다). 보고 파일 하나만. 코드 검토는 따로 간다(code-reviewer) — 여기선 화면 · 문구 · 흐름만.

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p10`(feature/1a-p10-first-run-home, 커밋 없음). 화면 코드 `src/app/(setup)/first-run/*`(first-run-flow.tsx 문구 표 포함) · `src/components/board/board.tsx` · `src/app/(child)/layout.tsx` · `src/app/(child)/page.tsx` · `src/app/globals.css`(보드 토큰) · `src/app/layout.tsx`(글꼴 셋) · P5b `src/components/activities/common.tsx`(AREA_TONE · CHILD_SIZE → 토큰).
- 사진 26장: `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/p10-first-run-*.png`(1 PIN · 2 이름 · 3 아바타 · 4 알파벳 · 5 주제 묶음 · 6 시작 단계 · 7 마이크 · 8 넘겨주기 · 9 홈, 세로 820 · 가로 1180, 오류 상태 몇). 직접 보려면 **살아 있는 서버 http://localhost:3001**(DB 54331 — 프로필이 아직 없어 `/` 가 첫 실행으로 간다; 접근 코드는 컨트롤러만 — 쿠키는 `tests/e2e/access-cookie.ts` 꼴로 Playwright 에서 만들어 쓴다. **저장(넘겨주기)은 누르지 말 것 — 요청자가 직접 눌러 볼 DB 다.** 저장까지 보려면 자기 임시 DB · 포트로).
- 구현 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p10-report.md` '차례 2' 절(다르게 한 것 · 우려: C72 표에 없는 문구 둘 '아이 이름을 알려 주세요' · '지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요' — 컨트롤러 받음, 아바타 색 둘(주황 · 보라) · 주제 묶음 대표 낱말은 구현자가 고름 — **이 검토가 판정**).

## 볼 것
1. 4절 첫 실행 행 그대로인지: 한 화면에 하나씩 PIN → 이름(홈에 보일 한글 이름 · 토리가 부를 영어 이름) → 아바타 → 알파벳(3.1 문구) → 주제 묶음(6.3) → 시작 단계(건너뛸 수 있음 · 영역마다 · 고르지 않음 · 회화 · 알파벳 · 단계 예시 줄 = can-do 해요체) → 음성 인식 안내(7절 내용 · iPad 안내 · 성공 · 실패 · 끊김) → 넘겨주기. 뒤로 가기 · 다음, 입력 검증 문구(PIN 다름 · 이름 길이).
2. C72 문구 표와 글자 비교(표 밖 문구는 모두 적는다 — 둘은 받음, 그 밖은 지적). 숫자는 설정값에서 채우는지(PIN 6 · 시작 단계 · 묶음 수 등이 화면 글에 박히지 않았는지는 코드 검토 몫이지만 눈에 보이는 것은 적는다).
3. 크기 · 겹침 · 가로 넘침(세로 · 가로 둘 다), 큰 글자, 단추 크기(아이 손가락), 색 대비, 포스트잇 보드 톤(코르크 · 띠 · 영역 색 넷이 토큰대로), 글꼴 셋 적용(Jua 제목 · Gowun Dodum 본문 · Fredoka 영어).
4. 홈(차례 3 전 임시 상태): '모모의 공부 보드' 제목(C72) · 아직 빈 보드가 어색하지 않은지(차례 3 몫은 지적하지 않음).
5. 아바타 여섯 색 · 이름 첫 글자 동그라미(C72) · 주제 묶음 대표 낱말 · 그림(P6b 카탈로그 대표 그림 또는 이름표 글 — 정할 것 자)이 아이 눈에 맞는지.
6. 접근성 기본(레이블 · 포커스 · 키보드 넘기기) 표본.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p10-2-design.md`(메인 저장소): 판정(Approved · Changes requested) · 지적(심각도 · 근거) · 4절 · C72 대조 표 · 아바타 · 묶음 낱말 판정 · 사진 번호. 마지막 메시지는 판정과 요지 5줄 안쪽을 컨트롤러에게 SendMessage 로.
