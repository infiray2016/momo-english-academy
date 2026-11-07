# 재검토 브리프: P10 fix 2(B1 코드 지적 + fix 1 재검토 새 Minor + 컨트롤러 핫픽스 둘)(code-reviewer rev-p10 이어 보기 · Opus · xhigh, 읽기 전용, 2026-10-18 00:2x)

범위 한정 재검토다. 지적별 ADDRESSED · NOT ADDRESSED 와 새로 깨뜨린 것만. 파일을 고치지 않는다(복사본 재현은 된다). 3001 · 54331 · 3000 · 54329 · 3302 · 54339 는 건드리지 않는다. **차례 5(배치 평가, impl-p10)가 같은 시간에 돈다** — 새 파일(`src/core/answer/*` · `src/core/placement/*` · `src/components/answer/*` · `src/server/placement/*` · `src/server/actions/placement.ts` · `[area]/placement/*` · 그 시험)과 `home-cards.tsx` 의 `PLACEMENT_OPEN` 켜기 · `tests/e2e/home.spec.ts` 의 href 단언이 바뀔 수 있다. 그 둘이 바뀌어 있으면 fix 2 몫만 보고 '차례 5 판에서 바뀜'으로 적는다. B2(차례 4) 지적의 fix 3 은 차례 6 뒤라 이번 범위 밖.

## 대상(구현 보고 `task-p10-report.md` 'fix 2(B1)' · 'fix 2 덧붙임' 소절 — 구현자 수: biome 0(경고 1 — fix 3) · tsc 0 · 단위 329 · 통합 88 + 1 · e2e 34 · deps 0 · bundle 0 · spec-trace 42)
- review-p10-3-code: **I-1** `tests/e2e/fixtures.ts`(새 쪽마다 가짜 음성) · 새 대본 `tests/fixtures/speech/scripts/audio-capture.json` · `tests/e2e/home.spec.ts`(AC-5c 둘째: audio-capture 로 첫 실행 마이크 확인 → 기기 상태 없음 · 카드 열림) · **M-1** `tests/integration/home.test.ts`(통과 시각 없는 단원 3 → upcoming · recent_window 다른 수) · **M-2(결정 (가))** `src/server/home/index.ts`(이번 주 n일에 배치 세션 포함 · 오늘 완료만 뺌 + 통합 사례) · **M-3** `home-cards.tsx`(label 안 넘김 → 안의 글이 이름).
- review-p10-fix1 새 Minor: **N-1** `src/server/profile/index.ts`(SettingMissingError 때 설정 키 이름 로그 · 이름 · 해시는 없음) · **N-2** `src/server/db/safe-error.ts` 주석 보기.
- 컨트롤러 핫픽스 둘(`src/app/(setup)/first-run/first-run-flow.tsx`): 한글 이름 input `value` → `defaultValue`(비제어) · `<Fragment key={step}>{body}</Fragment>`(단계마다 입력 요소 새로 — PIN 값이 이름 칸에 남던 결함). 구현자가 더한 e2e 단언 '이름 화면에 들어오면 두 칸이 비어 있다'.
- `board.tsx`: PostIt 닫힘 · 비활성 꼴(opacity → 글 먹색 · 바탕 영역 색 45% 섞음) · 새 `SmallLink`(아직 쓰는 곳 없음 — fix 3 에서 수업 목록이 씀).
- 화면 쪽 코드(des-p10 가 사진으로 보는 것과 겹치면 코드만): 카드 내용 높이 · 판정 전 틀만(링크 아님 · 행동 자리 비움) · 부모 점 먹색 · 시작 단계 화면 N-1~3.

## 볼 것
1. I-1 — 가짜 음성이 **모든** 새 쪽에 들어가는지(컨텍스트 차원인지 쪽마다인지) · audio-capture 대본이 7절 '세 번 이어짐 → 쓸 수 없음' 규칙과 어긋나지 않게 한 번만 내는지 · 시험이 이름의 두 절을 이제 증명하는지(변이: `markMicUnavailable` 조건을 '모든 실패'로 바꾸면 깨지는지). 리눅스 WebKit 의존이 사라졌는지.
2. M-2 — 배치 세션을 이번 주에 세고 오늘 완료에서는 빼는 것이 코드 · 시험에 맞는지(변이 H5). M-1 두 사례가 H3 · H8 변이를 잡는지.
3. 핫픽스 — 비제어 입력이 '다음' 조건 · 저장 값 · e2e fill 과 어긋나지 않는지, `key={step}` 이 단계 전환 때 포커스 효과(`headingRef`) · 상태 보존(화면 메모리 — 정할 것 커)을 깨지 않는지(뒤로 갔다 오면 입력값이 defaultValue 로 복원되는지), 영어 이름 칸(제어 유지)에 한글 입력기 문제가 남을 가능성 판정(실기 재현 불가 — 코드로만).
4. PostIt 꼴 변경이 P5b 시드 보기 · 첫 실행 포스트잇을 깨지 않는지(e2e:local 7 은 돌리지 않음 — 코드로), `SmallLink` 경계.
5. N-1 로그에 키 이름만 들어가고 값 · 이름 · 해시가 없는지(시험). 새로 깨뜨린 것. 장부: 'e2e 픽스처 가짜 음성' 행 · '이번 주 n일 결정' 판정.

## 보고
`/Users/hikaru/workspace/momo-english-academy/.superpowers/sdd/2026-10-16-1-가-구현/review-p10-fix2-code.md`(메인): 지적별 표 · 핫픽스 판정 · 새 지적 · 장부. 마지막 메시지는 요지 5줄 안쪽 SendMessage.
