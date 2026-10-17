# 코드 검토 브리프: P10 차례 2 + 차례 1 Minor 정리(code-reviewer rev-p10 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-17 22:3x) — 검토 묶음 A1(코드 몫)

전체 루프(C52) 코드 검토다. plan-p10a 작업 2 · 3 · 4(차례 2 — 보드 · 첫 실행 · 마이크 상태)와 차례 1 Minor 정리(`task-p10-minor-1.md` M-1~M-5)가 plan · 브리프 `task-p10-2.md` · 13절 C70~C73 · 정본(4절 첫 실행 · 5절 profiles · profile_tracks · parent_auth · parent_alerts · progress_events · settings, 7절 마이크, 3.1 알파벳, 3.2 시작 단계 · 회화 단계 = 말하기와 talk.placement_cap 가운데 낮은 값, 12절 키, C72 문구 · 구조 상수)대로인지와 품질(Critical · Important · Minor)을 판정한다. 지적마다 심각도 · 근거(파일:줄 · 재현 · 시험). 화면 · 문구는 des-p10 이 따로 본다(겹치면 코드 쪽만). 저장소 · 워크트리 파일을 고치지 않는다(복사본 · 스크래치패드 재현은 된다). **같은 워크트리의 3001 dev 서버는 요청자가 쓰고 있다 — 끄지 말 것, `pnpm e2e:local` 은 돌리지 말 것(컨트롤러가 뒤에), 실기는 54329 · 54331 · 3000 · 3001 밖 포트로.** 명령은 `PATH=/Users/hikaru/.nvm/versions/node/v24.22.0/bin:$PATH pnpm …` 꼴.

## 대상
- 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p10`(feature/1a-p10-first-run-home, 바탕 596137a, 커밋 없음). 차례 2 파일: `src/components/board/board.tsx` · `src/app/(child)/layout.tsx` · `src/app/(child)/page.tsx` · `src/app/globals.css` · `src/app/layout.tsx` · `src/lib/mic-state.ts` · `src/core/profile/{romanize,start}.ts` · `src/server/profile/index.ts` · `src/server/actions/first-run.ts` · `src/app/(setup)/first-run/*` · `tests/unit/first-run.test.ts` · `tests/integration/first-run.test.ts` · `tests/e2e/first-run.spec.ts` · `tests/e2e/household.ts` · 공용 변경(P5b `src/components/activities/common.tsx` 토큰 · `tests/e2e/smoke.spec.ts`). 차례 1 Minor 정리: `scripts/dev-db.ts` · 새 `scripts/pg-local.ts`(공용 `tests/integration/global-setup.ts` 도 씀) · `tests/unit/dev-tree.test.ts` · 새 통합 시험(적재 수) · `describeError` 가림 시험.
- 구현 보고 `<워크트리>/.superpowers/sdd/2026-10-16-1-가-구현/task-p10-report.md` '차례 2' 절 · '차례 1 Minor 정리' 소절(다르게 한 것: insertHousehold 새 파일 · 구조 상수 start.ts(컨트롤러 받음, C72 글 고침 예정) · 범위 끝 알림 createAlertOnce 안 쓰고 트랜잭션 안 직접 삽입 · 공용 변경 9 안 함; 우려: first-run 단위 시험 · Minor 시험은 빨강을 먼저 못 봄; 새 문구 둘은 컨트롤러 받음).
- 컨트롤러 재확인(차례 2, 22:2x): build · 단위 316 · 통합 75 + 1 · deps 0 · spec-trace 46 · bundle 0 · 3001 에서 접근 코드 → /first-run PIN 화면. Minor 정리 뒤 구현자 수: tsc 0 · biome 0 · 단위 318 · 통합 76 + 1 · e2e 25.

## 볼 것
1. **첫 실행 액션 · 서버**: PIN argon2(`@node-rs/argon2` 2.2.2, 매개변수) · 트랜잭션 안 '프로필 있음' 확인 · 둘째 기기 `already_done` · 저장이 마지막 한 번(정할 것 커) · profiles · parent_auth(pin 부분 유일) · profile_tracks(비울 수 있는 level · unit) · settings profile.start_level.<영역>(C61 기본 행 없음 — 고른 영역만 행) · parent_alerts 종류 값(정할 것 퍼) · progress_events target 꼴 · 범위 끝 알림 직접 삽입이 `createAlertOnce` 와 같은 기준 키 꼴 · 중복 방지인지(다르게 한 것 판정). 모든 액션이 가족 접근 쿠키를 확인하는지(`requireAccess`), 아이 이름이 로그 · 오류에 안 남는지, 한 시계(`@/server/clock`).
2. **순수 함수**: `romanize.ts`(제3장 제4항 — 음운 변화 반영 안 함 · 표본), `start.ts`(시작 단계 · 회화 = min(말하기, talk.placement_cap) · 알파벳 모름이면 읽기 · 쓰기 칸 고를 수 없음 · 구조 상수 PIN_LENGTH · NAME_MAX_LENGTH · TOPIC_BUNDLES · AVATARS 가 설정값과 섞이지 않는지).
3. **마이크 상태 `mic-state.ts`**: 정할 것 터(끊김은 알림 없이 다시 · 그 밖 실패는 알림 하나 · mic-unavailable 이면 기기 상태 저장), 소리 저장 없음, P2 접점 재사용.
4. **보드 · 토큰**: AREA_TONE · CHILD_SIZE → 토큰 옮김이 P5b 화면을 깨지 않는지(e2e:local 7 은 구현자가 봄), 글꼴 next/font/google 셋 · 빌드 때 내려받기(위험 5).
5. **시험**: AC 접두 이름(AC-1a · 1c, spec-trace 46), 단위 시험이 실제 규칙을 증명하는지(구현자가 빨강을 못 봄 → 규칙을 망가뜨린 복사본에서 깨지는지 둘셋 표본), 통합 시험이 트랜잭션 · 유일 제약 · 둘째 기기를 보는지, e2e 가 쿠키 도우미 · 임시 DB 를 제대로 쓰는지.
6. **Minor 정리**: M-1 postmaster.pid 확인(재현) · M-2 신호 · 상한 · M-3 .env.local 판정(로컬 호스트 + /momo_dev) · M-4 `pg-local.ts` 가 경계 규칙(scripts ↔ tests 공용) 안에 있는지 · global-setup 변경이 통합 시험을 깨지 않는지 · M-5 적재 수 단언.
7. 경계 규칙 · check-bundle(화면 묶음에 서버 변수 없음) · 설계 숫자(설정값 · 구조 상수 밖에 박힌 수) · 공용 변경 표시. 열린 장부 P10 행(`ledger-open.md`) 판정.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p10-2-code.md`(메인 저장소): 판정(Approved · Changes requested) · 지적(심각도 · 근거) · 설계 준수 표 · 다르게 한 것 판정 · 장부 판정. 마지막 메시지는 판정과 요지 5줄 안쪽을 컨트롤러에게 SendMessage 로.
