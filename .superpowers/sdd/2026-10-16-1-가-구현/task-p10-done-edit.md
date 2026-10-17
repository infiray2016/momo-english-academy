# 편집 브리프: plan-p10a · plan-p10b 완료 보고 채우기(문서 반영 편집자 · Opus · high, 2026-10-18 06:1x 작성 — P10 커밋 뒤 컨트롤러가 해시 · CI 번호를 채워 띄움)

P10(첫 실행 · 배치 · 홈 · 수업 목록 · 세션 틀) 구현이 끝났다. 두 하위 plan 의 '완료 보고 (Done)' 절을 채우고 상태를 `done` 으로 바꾼다. **설계 · 본문은 고치지 않는다** — 완료 보고 절과 머리의 상태 · 커밋 줄만. 저장소 `/Users/hikaru/workspace/momo-english-academy`(문서 가지 `feature/1a-p01b-quality-gates`). 커밋하지 않는다.

## 채울 자리
- `intent/2026-10-15-모모-잉글리시-아카데미/plan-p10a-첫-실행-배치.md` · `plan-p10b-홈-목록-세션-틀.md` 의 `## 완료 보고 (Done)` 절(plan-build 템플릿: 실제 바뀐 파일(계획과 다른 것 표시) · 테스트 결과 · 남긴 것 · PR). 머리 줄 '상태: in-progress' → `done(2026-10-18, 커밋 78db3a2)`.
- 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 의 P10 행(배정표 · 완료 판정 칸)을 'done · 커밋 78db3a2' 으로.

## 원문(읽을 것 — 여기서 사실을 옮긴다, 지어내지 않는다)
1. 구현자 보고 `.claude/worktrees/p10/.superpowers/sdd/2026-10-16-1-가-구현/task-p10-report.md` 전체 — 차례 1~7, fix 1~7, 'CI 결과 이어 적기', '요청자 안내' 절, '차례 7 덧붙임'(isUniqueViolation 셋 → safe-error.ts), '차례 7 fix 6 · fix 7' 절.
2. 검토 보고(메인 `.superpowers/sdd/2026-10-16-1-가-구현/`): review-p10-1 · -2-code · -2-design · -3-code · -3-design · -4-code · -4-design · -5-6-code · -fix1 · -fix2-code · -fix2-design · -fix3-code · -fix3-design · -fix5-code · -7-code(Approved M 6 — M-4 장부 · M-6 보고 문구 '비밀값 grep 은 지어낸 시험 주소 하나 밖 0').
3. 장부 `progress.md`(P10 행 — 차례 · fix · CI 1~11차 번호와 결과) · `ledger-open.md`(P10 에서 넘긴 것: '다시 확인' 1-나 · 영역 아이콘 시각 결정 · 부모 꼬리표 56px · 수업 목록 해석 P12 · 실시드 15장 세로 넘침 · 대기열 거부 P11 · requireAccess 가져오기 꼴 · 집 초기화 규칙) · `ledger-closed.md`.
4. 13절 C70~C74 · C82(`specs/10-결정-기록.md`)와 plan-p10a · b 의 '정할 것' · '정본 밖 문구' 표(구현 중 더한 문구 둘 · 마이크 확인 안내 · 홈 안내 · 마이크 닫힘 카드 · /talk 부모 글).

## 적을 것(두 plan 각각)
- **실제 바뀐 파일**: 보고의 '바뀐 파일' 절들을 합쳐 plan 표와 대조 — 계획에 없던 파일(예: safe-error.ts 합침, past-lessons.tsx 표시, child-size.ts data-size-guide, romanize-spellings.ts C74, first-run-flow 한글 이름 칸 핫픽스)과 계획에 있었으나 안 한 것을 표시한다.
- **계획과 다르게 한 것**: AC-6a 는 P11 로(C70 — P10 은 접두 없는 통합 시험으로 틀만), 값 9 문장 고침(C82 — 카드 단추 안 보조 줄은 안내 20px · `data-size-guide`), 아바타 제목 M-9 닫음, '이번 주 n일' 배치 세션도 셈, 통과한 지금 단원 수업 상태 해석(untried · retry · 잠긴 줄 숨김), AC-2f e2e '배정 1 · 2 건너뛴 다지기'(시험용 시드 사정, P8 뒤 원안), 그 밖 보고 '다르게 한 것' 절의 항목 전부.
- **테스트 결과**: 마지막 로컬 관문(단위 수 · tsc · biome · deps · bundle · spec-trace missing-test 수)과 CI(ci/p10-c5 1~11차 — 번호 · 결과 · 마지막 초록 run 39070194023, integration · e2e · e2e-local 수). 비밀값 grep 문구는 M-6 대로.
- **남긴 것**: 장부로 넘긴 항목 · 재부팅 뒤 할 것(des-p10 사진 세트 차례 5 · 6 · fix 4~7 · 로컬 통합 한 바퀴) · 1-나 · P11 · P12 몫.
- **PR**: PR #1(ci/p10-c5 → P10 가지, CI 용 초안) · PR #2(P10 → main 초안) — 커밋 뒤 컨트롤러가 닫음, 적는다.
- 숫자는 표로, 문장은 짧게, 군말 없이. 아이 이름 · 비밀값 · 접근 코드 · 프리뷰 주소는 적지 않는다.

## 보고
바뀐 파일 셋의 diff 요약(줄 수)과 '원문에서 못 찾은 것'을 `task-p10-done-edit-report.md` 에 적고 SendMessage(team-lead) 한 줄.
