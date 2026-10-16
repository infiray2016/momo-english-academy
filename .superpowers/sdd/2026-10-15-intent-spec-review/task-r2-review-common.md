# 2회차 검토 공통 규칙 (검토자 A · B 모두 읽는다)

컨트롤러가 2026-10-15 10:3x 에 씀. 당신은 읽기 전용 검토자다. 문서 · 코드를 고치지 않고, 하위 에이전트를 띄우지 않으며, 커밋하지 않는다. 보고는 지정된 파일 하나에만 쓴다.

## 본 자료
1. `.claude/CLAUDE.md`
2. `intent/01_제품/2026-10-15-모모-잉글리시-아카데미.md`
3. `specs/2026-10-15-모모-잉글리시-아카데미-spec.md` (2회차 편집 뒤 판. 1~15절 전부)
4. `.superpowers/sdd/2026-10-15-intent-spec-review/round-2-edit-applied.md` (이번 편집에서 바뀐 곳 · 편집자가 정한 값)
5. `.superpowers/sdd/2026-10-15-intent-spec-review/task-r2-edit.md` (요청자 결정 여섯: 회화 영역 · 하루 1회 폐지 · 수업 고르기 · 배치 평가 1차 · 수업 시드 전환 · 실시간 끊지 않음)
6. 1회차 보고 `round-1-a.md` · `round-1-b.md` (이미 반영됐다. 같은 지적을 되풀이하지 않기 위해 읽는다)
7. 목업 원본 `docs/media/mockups/*.dc.html` (화면 구성 · 문구의 근거. B_Home4 · B_Talk1 · B_Talk5 · B_TalkEnd · B_LevelTest · B_Reading · B_Writing* · B_Speaking · B_Result · B_Parent)
8. `docs/research/2026-10-15-real-academy.md`
9. 회화 제안 원문 `/Users/hikaru/Library/Mobile Documents/iCloud~md~obsidian/Documents/infiray/90_AI/프로젝트/momo-english-academy/원자료/산출물/2026-10-15_산출물_회화-영역-제안.md`

## 지적 표 형식 (1회차와 같다)
| 번호 | 심각도 | 위치(문서 · 절 · 줄) | 문제 | 왜 문제인가 | 고치는 방법(구체적인 문장으로) |

- 번호 접두는 A2- · B2-(더한 2부는 A2-U- · B2-M-). 심각도는 Critical(이대로 만들면 아이 · 부모가 못 쓰거나 비용 · 안전 사고가 난다) · Important(설계 모순 · 빠진 규칙 · 구현자가 임의로 정하게 된다) · Minor(문구 · 일관성).
- 문제는 문서의 문장을 근거로 적고, 추측이면 추측이라고 쓴다. "고치는 방법"은 편집자가 그대로 옮겨 쓸 수 있는 문장으로.
- 요청자가 정해야 하는 것은 지적과 따로 "결정 필요" 표(번호 · 쟁점 · 선택지 가 · 나 · 권장)에 모은다. 요청자 결정 여섯은 뒤집으라고 하지 않는다(그 결정이 만든 모순 · 빠진 것은 지적한다).
- 외부 사실(교육과정 · 모델 단가 · 브라우저 API)을 쓰면 문서 끝 "근거로 확인한 외부 사실"에 출처를 적는다.
- 용어는 영역 · 단계 · 단원 · 활동. 글은 서술문, 콜론 제목 · 굵은 라벨 불릿 · 예고 문장 금지.
- 답장에는 Critical · Important · Minor 건수와 결정 필요 건수만 적는다.
