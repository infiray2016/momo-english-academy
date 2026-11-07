# 브리프 — plan 15번 문서 반영(정본 셋 + spec 예문 + intent 목록), 편집자 Opus high

## 맥락(열 줄 안)
- 닿는 결정: 13절 C211 + 보완, C206(장면 여는 질문), plan `intent/2026-11-06-회화-AI-몫-넓힘/plan.md` 정한 것 1 · 위험 3 · 작업 순서 15번, 컨트롤러 결정(plan 머리 줄: 정본 따라가기 문구를 '1~3단계'로 · 02-2:200 예 문구를 고른 표본으로). 장부 T-224(정본 예 'We are at the lake! Do you like the lake?' 는 수업 1 쉬운 질문과 같은 질문으로 검증기에 걸림) · T-237 · T-239(측정값).
- 정본은 본 저장소 `specs/` 와 워크트리 `.claude/worktrees/p13d/specs/` 두 사본을 같게(본을 고친 뒤 복사, `diff -q`). 13절은 건드리지 않는다.

## 할 것
1. **따라가기 문구 '1~3단계'**: 정본 6.1 표의 따라가기 행('모두' → '1~3단계'), 3.3 따라가기 문단(`specs/02-2-세션과-단계표.md` 194줄 안팎), 12절 talk.follow_child_turns 설명(`specs/09-설정값.md` 78줄 안팎)을 05절 사용자 메시지 문단('1~3단계는 … 이번 차례에 돌아오기')과 같게 — 4단계부터는 고침 전 규칙 그대로라는 한 문장.
2. **예 문구 교체**: `specs/02-2-세션과-단계표.md` 200줄 안팎과 spec `intent/2026-11-06-회화-AI-몫-넓힘/spec.md` 설계 5 의 예 'We are at the lake! Do you like the lake?' 를 고른 표본 'Bikes and ducks at the lake! Do you ride a bike?'(뜻 '호수에 자전거랑 오리가 있어! 너는 자전거 타?')로. 06절 생성 문단에 '같은 단원 안에서 꼴을 겹치지 않게, 'Do you like …?' 꼴은 피함, 주제 겹침은 사람이 확인' 한 문장(3-(다) 보고 `task-3c-report.md` · 설계 검토 `task-des-3-report.md` I-1 근거).
3. **6.6 1~3단계 비용 행**을 잰 값으로: 회차 r1(`/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-r1/2026-11-06-talk-observe-settings-metrics.md` '운영 값' 절 · 합계 표)과 기준선(`/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-base/…-metrics.md` 가 없으면 r1 표의 '기준선' 열) — 턴 중앙 비용 · 호출 수 바퀴당 77 · 첫 문장 p50 · p95 · 토큰. effort medium 값(`/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-medium/2026-11-06-talk-observe-medium-metrics.md`)은 '견주기(전환 안 함, C211 (5))' 로 한 줄만.
4. `intent/README.md` 의 '회화 AI 몫 넓힘' 줄을 '구현 묶음 여덟 닫힘 · 대본 회차 r1 판정 중 · 커밋 전' 으로.
5. 보고 `task-doc-15-report.md`(바뀐 파일 · 줄 · 문장 요약 · p13d 동기 확인). 요지 세 줄.

## 지킬 것
문서만(코드 · 시드 · 13절 금지). 표를 깨지 않기. 숫자는 '잰 값(2026-11-07 r1)' 표지와 함께. 커밋 금지.
