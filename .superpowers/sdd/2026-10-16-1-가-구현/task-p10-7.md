# 구현 브리프: P10 차례 7 — 마무리(크기 훑기 · 공용 시험 둘 · CI 순서 · AC-1b e2e)(implementer impl-p10 이어 보기 · Opus · high, 2026-10-18 04:1x)

**fix 5 재검토 · 커밋 뒤에 한다.** plan-p10b 작업 5(차례 7) + plan-p10a 작업 8. 워크트리 p10. 이 Mac 은 DB 시험 불가 — 통합 · e2e 는 CI 로(push 는 컨트롤러). 시험 먼저.

## 범위
- `tests/e2e/child-size.ts`(plan-p10b 값 9: `[data-child-screen]` 안 글 20px 이상 · `lang="en"` 조상 24px · button · a · [role=button] · [data-touch] 글자 22px · 상자 56 × 56 · `[data-parent-info]` 제외 · '%' 없음 · 가로 넘침 없음 — 기준 수는 파일 위 이름 붙인 상수, P5b e2e-local 과 같은 값 · 꼴. 지문 안 낱말 단추는 예외 표시(plan-p11a 위험 9 가 쓰려 함 — `data-size-exempt` 같은 표시 하나)).
- `tests/e2e/font-size.spec.ts`(AC-N9: 접근 코드 · 홈 · 수업 목록 · 지난 수업 · 회화 준비 중 · 배치 시작 · 문항 · 결과 · 세션 틀, 세로 820 · 가로 1180 — 이름은 plan-p10b 증명 표 AC-N9 글자 그대로).
- 공용 변경 1 · 2(plan-p10b '요청하는 공용 변경'): `tests/unit/learning-day.test.ts`(P3a) 한 시계 정적 검사에 `src/app/**` 가운데 첫 줄이 'use client' 가 아닌 파일 더하기 · `tests/unit/access-gate.test.ts`(P3b) '첫 문장의 requireAccess 는 @/server/access/guard 에서' + 같은 이름 지역 함수 견본 하나.
- plan-p10a 작업 8: `tests/e2e/first-run.spec.ts` 의 AC-1b(홈 · 목록 · 세션 틀이 생긴 뒤 — '첫 실행에서 세션 시작까지 AI 호출 0회' 꼴, 이름은 plan-p10a 증명 표) · CI 순서 명령 전부 한 번(`pnpm install --frozen-lockfile` → biome ci → build → test → test:int(CI) → e2e(CI) → e2e:local(CI) → check:deps → spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → check:bundle · 비밀값 grep 0)의 출력을 보고에(로컬은 DB 없는 것만, 나머지는 CI 로그 번호).
- 화면 검토 다시(첫 실행 → 세션 시작 한 번에)는 des-p10 몫 — 재부팅 뒤 사진 세트(차례 5 · 6 · fix 4 · 5 · 7)를 그때 함께 찍는다.
- 요청자 안내 글(plan-p10a 차례 8 '볼 수 있는 화면'): 보고 끝에 '프리뷰에서 지금 되는 것 · 안 되는 것 · 시험용 시드 한계' 표를 한 장 — 컨트롤러가 요청자에게 그대로 전한다.

## 완료
DB 없는 관문 초록 · CI 통과(컨트롤러 push) · spec-trace missing-test 가 P10a 몫(AC-1b · 1c · 11a~d) · P10b 몫(2a · 2b · 2d · 2e · 2f · 5c · N9)만큼 줄었음을 보고에. 보고 `task-p10-report.md` '차례 7' 절. 끝나면 SendMessage → 코드 검토(가벼운 — 시험 · 공용 변경) → P10 plan 완료 보고(a · b) → 커밋 → P11 바탕 합침.
