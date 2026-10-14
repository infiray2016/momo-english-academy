# intent — Plan 산출물

요청을 요청자의 말로 적은 파일이다. 해결책은 적지 않는다 — 화면 · 데이터 · AI 호출은 spec 이 정한다.

## 폴더

| 폴더 | 무엇을 담나 |
|---|---|
| `01_제품/` | 제품 전체 단위의 요청 |
| `02_구현/` | 차수 · 기능 단위로 동작하게 만드는 요청 |

새 주제가 생기면 번호를 이어 폴더를 만든다. 파일 이름은 `YYYY-MM-DD-<슬러그>.md`. 상태는 `draft` → `review` → `approved` → `closed`.

## 파일

| 파일 | 상태 | 승인 |
|---|---|---|
| `01_제품/2026-10-15-모모-잉글리시-아카데미.md` | review — 요청자 되읽기 대기 | — |

## 다음 단계

새 intent 는 `.claude/skills/intent-capture`, 승인된 intent 의 spec 은 `spec-design`, 승인된 spec 의 plan 은 `plan-build` 로 `plans/` 에 둔다.
