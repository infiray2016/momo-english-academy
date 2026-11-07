# 구현 브리프: P13d 묶음 d8 — 3D 선생님 그림 층(implementer · Opus · high, 2026-10-23 14:3x)

근거: `intent/2026-10-17-회화-선생님-캐릭터/plan.md`(approved — 13절 C141 · C142, '작업 순서' 머리 컨트롤러 덧). **d8 몫 전부**: '작업 순서' 8(d8) 차례 1~5 · 7(차례 6 '로컬 3D 눈 점검'은 컨트롤러 몫), '바뀌는 파일' 표의 d8 행, '파일별 값' 가운데 d8 이 가리키는 값(three · @pixiv/three-vrm 판 고정 · avatar-3d · 그림 층 순수 함수 layer.ts · teacher-layer.tsx · 창에 3D 붙이기 · 세션 쪽 감쌈 · 마무리에서 그림 층 닫기 · 대신 표시 다섯(no-webgl · load-failed · timeout · context-lost · setting) · 늦게 끝난 불러오기 버림 · proxy 거르기 밖 /teachers/ · 1년 immutable 캐시 · 의존 규칙(3D 는 회화 세션만 따로 불러옴) · CREDITS 라이브러리 줄 · 관찰 쪽 3D 재기), 정본 10절 '선생님 그림' 행 · 4절 회화 세션 선생님 창, '증명' 표의 AC-19i(WebGL 없음 · 설정 — e2e 기본, 늦은 결과 — 단위) · AC-N12(의존 규칙 몫). 시제품 `/Users/hikaru/workspace/momo-english-academy/prototypes/teacher-avatar/`(TeacherAvatar · sampleMotion)을 바탕으로 옮긴다(C115). 바탕: p13d 커밋 1174e13(d7 — 선생님 창 · 상태 연결, 창은 늘 초상).

자리: 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 모든 명령은 이 폴더에서. `export PATH="$HOME/.nvm/versions/node/v24.22.0/bin:$PATH"`. 시험 먼저. **커밋 · push 없음**. git stash 쓰지 않음. 같은 워크트리에서 다른 구현자는 없다(검토자는 읽기만).
- 새 의존(three · @pixiv/three-vrm · @types/three)은 시제품과 같은 판으로 고정하고 lockfile 을 고친다(`pnpm add …` — 판 고정). 3D 코드는 회화 세션 쪽에서만 따로 불러와 다른 쪽 첫 JS 에 들어가지 않아야 한다(NFR-2 — `pnpm build` 뒤 회화 밖 쪽 묶음에 three 가 없는지 스스로 확인).
- 수업은 3D 를 기다리지 않는다(FR-9) — 처음엔 초상, 다 되면 3D 로 바꿈, 실패는 그 세션 끝까지 초상 + 까닭 속성, 아이에게 오류 글 없음.
- e2e 기본 프로젝트는 WebGL 이 꺼져 있다(d7) — AC-19i 의 no-webgl · setting 두 경우는 e2e 기본에서, 늦은 결과 버림은 단위에서. 3D 를 켠 e2e 는 d9 몫이다.
- 관문: `pnpm lint` · `pnpm exec next typegen && pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm build`(번들 확인).

보고: `task-teacher-d8-report.md`(같은 폴더) — 바뀐 파일 · 의존 판 · 시험 이름 · 관문 결과 · 회화 밖 쪽 첫 JS 에 three 가 없다는 확인 · 3D 묶음 크기 · plan 으로 풀리지 않아 정한 것 · 우려. 마지막 답장은 한 줄 요약.
