# intent — 변경 단위 폴더

플레이북대로 **변경 단위마다 폴더 하나**다(요청자 결정 2026-10-16 03:3x). 폴더 이름은 `YYYY-MM-DD-<슬러그>`, 안에 단계마다 산출물이 쌓인다.

| 파일 | 단계 | 쓰는 사람 | 게이트 |
|---|---|---|---|
| `intent.md` | Plan | 요청자가 자기 말로(Claude 가 받아 적음, intent-capture 스킬) | 요청자가 상태를 approved 로 바꾸면 Design 으로 |
| `spec.md` | Design | Claude(spec-design 스킬). 정본 `specs/` 의 어느 장 · 절이 어떻게 바뀌는지만(델타) + 원칙 대조 + 우려 | 요청자가 approved 로 바꾸면 정본 장에 반영하고 Build 로 |
| `plan.md` | Build | Claude(plan-build 스킬, plan mode). 바뀌는 파일 · 순서 · 위험 · 증명 | 요청자가 approved 로 바꾸면 구현. 구현이 벗어나면 같은 커밋에서 갱신 |

승인 지점마다 커밋한다. 폴더의 세 파일이 "무엇을 원했고 · 무엇을 정했고 · 무엇을 만들었나"의 감사 기록이다. 끝난 변경은 intent.md 상태를 closed 로.

## 변경 목록

| 폴더 | 무엇 | 상태 |
|---|---|---|
| `2026-10-15-모모-잉글리시-아카데미/` | 제품 전체 intent(정본 spec 의 바탕) | intent approved(06:1x) → 정본 `specs/` 열한 장(검토 5회차 반영 판 + C44~C49)을 장 하나씩 본문 그대로 되읽기해 승인(새 요약 문서를 쓰지 않는다, 요청자 06:1x) → plan.md(1-가) |
| `2026-10-16-회화-선생님-수업/` | 회화를 원어민 선생님 수업처럼(결정 T2 · T3 · T4 를 사후에 intent 로) | intent approved(03:2x) · spec approved(04:5x, 정본 열한 장에 반영됨) — 다음은 plan.md(1-나 회화 묶음, 1-가 plan 뒤) |
| `2026-10-16-말하기-수업-분량과-단어-카드/` | 말하기 따로 · 1.5배 · 두 단계 카드(T5 · T6 · T7) | intent approved(04:5x) · spec approved(05:5x, 정본 반영 C45 · C47) — 다음은 plan.md(1-가) |
| `2026-10-16-AI-쉬는-중-자동-해제/` | 부모 버튼 없이 저절로 풀림(T1) | intent approved(04:5x) · spec approved(05:5x, 정본 반영 C46 · C48) — 다음은 plan.md(1-가 판정 · 기록, 1-나 상태 · 확인 호출) |
