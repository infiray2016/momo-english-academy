# 구현 브리프: P10 차례 2 — 보드 · 첫 실행 · 마이크 상태(implementer impl-p10 이어 보기 · Opus · high) — 전체 루프, 검토 묶음 A1

plan-p10a 작업 2 · 3 · 4(차례 2). 차례 1 은 끝났고(DONE_WITH_CONCERNS, 컨트롤러 재확인 · code-reviewer 범위 한정 검토 진행) 그 위에서 이어 간다. 같은 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p10`(가지 feature/1a-p10-first-run-home). 커밋하지 않는다. 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴. 시험 먼저. 설계 숫자는 설정값 · 구조 상수. **차례 1 의 검토 지적이 오면 컨트롤러가 따로 보낸다 — 그 전까지 차례 1 파일은 고치지 않는다.**

## 이번 몫
1. 작업 2 [화면] 공용 변경 5 · 6 · 7(· 9): `src/app/layout.tsx` 글꼴 셋(Jua · Gowun Dodum · Fredoka — `next/font/google`, 막히면 plan 위험 5 의 local 길을 보고에 적고 컨트롤러가 고른다) · `src/app/globals.css` 보드 토큰(코르크 바탕 · 종이 띠 · 포스트잇 넷 — 노랑 읽기 · 하늘 쓰기 · 분홍 말하기 · 연두 회화, keep-all) · P5b `src/components/activities/common.tsx` 의 AREA_TONE · CHILD_SIZE 를 토큰으로 → `src/components/board/board.tsx` · `src/app/(child)/layout.tsx` · `src/lib/mic-state.ts`. 완료: `pnpm build` · P5b `pnpm e2e:local` 크기 시험 초록.
2. 작업 3 [검증] `tests/unit/first-run.test.ts` → `src/core/profile/romanize.ts`(국어의 로마자 표기법 제3장 제4항 — 이름의 음운 변화 반영 안 함, plan 확인한 사실 7) · `src/core/profile/start.ts`(시작 단계 · 회화 단계 = 말하기와 talk.placement_cap 가운데 낮은 값 · 알파벳 모름 규칙). 완료: 단위 초록.
3. 작업 4 [서버][화면] `tests/integration/first-run.test.ts` → `src/server/profile/index.ts` · `src/server/actions/first-run.ts`(PIN argon2 — `@node-rs/argon2` 2.2.2, 트랜잭션 안 '프로필 있음' 확인 · `already_done`) · `src/app/(setup)/first-run/*`(여덟 화면: PIN → 이름 둘 → 아바타(목업 꼴 이름 첫 글자 동그라미 · 색 여섯, C72) → 알파벳 → 주제 묶음 → 시작 단계(고르지 않음 · 회화 · 알파벳 · 단계 예시 줄 = can-do 해요체, C72) → 음성 인식 안내(마이크 확인 결과 꼴 — plan 정할 것 터) → 넘겨주기) · `src/app/(child)/page.tsx`(프로필 없으면 첫 실행, `src/app/page.tsx` 지움) · 공용 변경 8(P3b smoke 기대) → `tests/e2e/first-run.spec.ts` 의 AC-1a · AC-1c. 문구는 plan-p10a '정본 밖 문구' 표(C72) 그대로, 숫자는 설정값(PIN 자리 수는 구조 상수 PIN_LENGTH). 첫 실행 상태는 화면 메모리에만 · 마지막 한 번 저장(정할 것 커). 완료: 통합 · e2e 초록.
4. 실기: `pnpm db:dev`(이미 떠 있으면 그대로) · `pnpm dev` 에서 접근 코드 → 첫 실행 여덟 화면 → `/`(아직 빈 보드) → 프로필이 있으면 `/` 가 첫 실행을 건너뜀. 사진(세로 820 · 가로 1180)을 `.superpowers/sdd/…/p10-first-run-*.png` 에.

## 지킬 것 · 보고
아이 화면 원칙(해요체 · 한 화면 한 행동 · 큰 글자, 첫 실행은 부모 화면) · 아이 이름 · 비밀값 로그 금지 · RLS · 가족 접근 쿠키 · 한 시계 · 경계 규칙 · spec-trace · check-bundle. 공용 변경은 보고에 따로. 보고 `task-p10-report.md` 의 '차례 2' 절(바뀐 파일 · 시험 수 · 실기 · 사진 · 다르게 한 것 · 알릴 것) → 상태와 요지 5줄 SendMessage → code-reviewer(Opus xhigh) + design-reviewer(Opus xhigh) 검토 묶음 A1.
