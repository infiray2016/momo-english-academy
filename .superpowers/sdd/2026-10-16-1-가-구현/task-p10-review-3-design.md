# 화면 검토 브리프: P10 차례 2 재검토 + 차례 3 홈(design-reviewer des-p10 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-17 23:2x) — 검토 묶음 B1(화면 몫)

두 몫을 한 보고에 적는다. 저장소 · 워크트리 파일을 고치지 않는다(사진 찍기는 된다). 코드 검토는 rev-p10 이 따로 간다 — 여기선 화면 · 문구 · 흐름만. 지적마다 심각도(Critical · Important · Minor)와 근거(사진 파일 · 4절 행 · C72 표 줄 · 목업).

**(1) 차례 2 재검토(범위 한정).** `review-p10-2-design.md` 의 I-1 · I-2 · M-1~M-10 을 지적별로 ADDRESSED · NOT ADDRESSED 로 가른다. 구현 보고 '차례 2 화면 지적 반영' 소절: 별명 거절은 칸 아래 상태 줄에 4절 문장(경고 표 · 굵게) + 점선 테 · 묶음 2 는 kite · ball · star · bus(카탈로그 대조 표, 그림은 카탈로그 낱말 칸으로 찾음) · 시작 단계는 영역 단추 넷 + 선택지마다 예시 줄 + 가로 두 열 · 고른 표시(굵은 테 + 체크) ≠ 초점(점선 고리) · 오류 줄 경고 표 · iPad 안내 메뉴 길 · 묶음 · 안내 상자는 영역 색 안 씀 · 확인 전 '마이크 확인' 큰 단추 · 묶음 제목 줄바꿈 · **M-10 은 컨트롤러가 다르게 받음**: 이름 확인 요청이 서버에 닿지 않으면 7절 '인터넷이 끊겼어요. 연결되면 다시 해요'. 새로 깨진 것만 새 지적. **fix 1(impl-p10, 같은 시간)이 `first-run-flow.tsx` 의 오류 처리 줄을 고친다** — 규칙(컨트롤러 확정): 서버 DB 오류(reason unavailable)는 이름 확인 · 저장 둘 다 C72 '지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요', 요청이 안 닿음은 `navigator.onLine` false 면 7절 끊김 문장 · 아니면 C72 문장. 지금 판이 그와 다르면 '다음 판에서 볼 것'으로 적는다(지적 아님).

**(2) 차례 3 홈.** plan-p10b 작업 2 의 화면을 정본 4절 홈 표(영역 카드 넷 — 단계 · 단원 5칸 · 진행 막대 둘 · 이번 주 n일 · 오늘 완료 · '시작!' · 회화 '이야기 고르기' · 배치 평가 전 '내 단계 찾기' · 회화 '말하기에서 단계를 찾으면 토리를 만날 수 있어요' · 마이크 닫힘 '마이크가 필요해요. 부모님께 말해 주세요' · 부모 점) · 13절 C72('<한글 이름>의 공부 보드' · '별 n개' · 정본 밖 문구 표 — plan-p10b '정본 밖 문구') · C50 (1)('토리가 준비 중이에요. 곧 만나요' · '홈') · 아이용 원칙(해요체 · 한 화면 한 행동 · 큰 글자 · 포스트잇 보드 · 글꼴 셋) · 목업 B_Home4(`docs/media/mockups/` · 캔버스 https://claude.ai/artifact/BaG1A1Ewst9AzMLKHD4Zp2)와 대조한다.

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p10`(커밋 없음). 화면 코드 `src/app/(child)/page.tsx` · `home-cards.tsx` · `talk/page.tsx` · `src/components/board/board.tsx`(BigLink) · `src/app/globals.css`(--color-kraft) · 첫 실행 `src/app/(setup)/first-run/*`.
- 사진: 홈 여덟 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/p10-home-{placed,mic-closed,placement,talk-soon}-{portrait,landscape}.png`(세로 820 · 가로 1180). 첫 실행 26장 `p10-first-run-*.png` 는 차례 2 반영 뒤 판인지 파일 시각으로 확인하고, 아니면 직접 찍는다. 직접 보려면 자기 임시 DB · 포트로(예: DB `node --conditions=react-server --import tsx scripts/dev-db.ts --ephemeral --port 54341`, 서버 `pnpm build && pnpm start --port 3303`, 집 넣기는 `tests/e2e/household.ts` `insertHousehold` 꼴, 접근 쿠키는 `tests/e2e/access-cookie.ts` 꼴). **3001 · 54331 · 3000 · 54329 · 3302 · 54339 는 건드리지 않는다.** 끝나면 띄운 프로세스를 모두 끈다.
- 구현 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p10-report.md` '차례 3' 절. 다르게 한 것(부모 꼬리표를 종이 띠 안으로 — 목업은 오른쪽 아래 구석, 세로 820 에 맞추려고 · 카드 전체가 링크 하나 · '내 단계 찾기' 는 차례 5 전까지 비활성 · 1-나 · P11 · P12 몫은 안 그림). 알릴 것(카드 → 404 는 차례 4 · 마이크 판정 전 카드 깜빡임 한 번 · 닫힌 · 비활성 카드 opacity-60 대비 · 끝낸 대화 n/min_lessons).

## 볼 것(차례 3)
1. 4절 홈 표 · C72 · C50 (1) 과 글자 비교(표 밖 문구는 모두 적는다). 카드마다 요소가 다 있는지(단원 주제 · 5칸의 지금 칸 표시 · 막대 둘 · 최근 성적 칸 · 이번 주 · 오늘 완료 · 단추 글).
2. 세로 820 · 가로 1180 둘 다 한 화면 · 넘침 없음 · 큰 글자(아이 글 20px 이상 · 제목 Jua · 영어 Fredoka) · 단추 56px · 색 대비 — 특히 닫힌 · 비활성 카드(opacity-60 으로 흐려진 글의 대비를 사진에서 재어 수치로 적는다, 기준 4.5:1) · 가로 화면에서 카드 가운데 큰 빈칸(이번 주 아래 ~ 오늘 완료 위)이 어색한지.
3. 카드 차례(마이크 닫힘 → 배치 전 → 보통)와 상태별 사진 넷이 4절과 맞는지. 부모 점 · 꼬리표의 자리 변경(다르게 한 것 1, 1-가는 누를 수 없음 — 정할 것 ㅊ) 판정. 회화 카드 → '토리가 준비 중이에요. 곧 만나요' · '홈' 으로 돌아오기.
4. 마이크 판정 전 깜빡임(알릴 것 2)이 아이 눈에 거슬리는지 — 화면 쪽 판정만(줄이는 길은 코드 검토에 넘김).
5. 접근성 표본(카드 링크의 읽히는 이름 · 초점 고리 · 비활성 카드가 읽기 도구에 어떻게 읽히는지).

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p10-3-design.md`(메인 저장소): (1) 차례 2 지적별 ADDRESSED · NOT ADDRESSED 표 · 새 지적, (2) 차례 3 판정(Approved · Changes requested) · 지적(심각도 · 근거 · 사진) · 4절 · C72 대조 표. 마지막 메시지는 판정과 요지 5줄 안쪽을 컨트롤러에게 SendMessage 로.
