# 브리프 — '회화 AI 몫 넓힘' plan 작성

브리프 작성: 컨트롤러 · 2026-11-07 05:5x · 대상: plan 작성자(Opus xhigh) · 승인: 컨트롤러(요청자 "별도의 추가 승인 절차 없이 구현과 검증으로")

## 맥락(열 줄 안)

- 닿는 결정: 13절 C211 + C211 보완(요청자 2026-11-07 05:1x · 05:5x — spec 승인, 조건 다섯/여덟: 자기 이야기 간격 3 은 참고값 · 지어내기 금지 · 품질 수치는 검증 기준(측정 구분 넷 · 분모 · 표본 · 비교 기준) · 발화 길이 아이 중심 · 기술 오류 책임 구분 · effort medium 별도 · 평가 승급 · 녹음 정책 불변 · iPad 품질 검증 완료 아님 · 새 승인 단계 없음). 바탕 C205 · C206 · C207 · C209 '나', 경계 C210 · C204 · C202 · C203.
- spec: `intent/2026-11-06-회화-AI-몫-넓힘/spec.md` **판 4**(239줄, FR-1~FR-8 · 설계 1~9 · 수용 기준 AC · 문서 반영) — 정본 반영 끝(02-2 · 03 · 05 · 06 · 07 · 09 · 11, 본 · p13d 같음, 편집 보고 `spec-v4-report.md`). 검토 `spec-review-1.md` · `spec-review-1-fix1.md`.
- 코드: 워크트리 `.claude/worktrees/p13d`(HEAD 6e86881 + 정본 사본 변경 미커밋). 회화 서버 `src/server/conversation/*`(turn.ts turnSettings · lesson-turn.ts · lesson-flow.ts · question-check.ts · question-retry.ts · child-kind.ts · closing.ts · 프롬프트), 순수 `src/core/conversation/*`, 화면 `src/components/conversation/*`, 시드 `seed/`(회화 3단계 단원 1 카드 두 장: 배정 1 · 다지기 6, 검증기 `seed:validate`, 설정 `seed/settings.json`), 대본 도구 `scripts/talk-observe.ts`(core 만 돌림 — 서버 설정 읽기 결함을 못 봄, T-157), 시험 `tests/unit` · `tests/integration` · `tests/e2e`(CI 만, 이 Mac 은 통합 · e2e 불가).
- 교훈(꼭 반영): 새 설정 키(talk.self_line_every_turns 3 · talk.greeting_recall 끔)는 **seed/settings.json + turnSettings 스키마(TEACHER_SENTENCES_SETTING_SCHEMAS 꼴) → `pnpm seed:load … --partial` 적재 → 배포 → 서버 턴 1회 확인** 순서. 지금 p13d `check:ids` 가 spec-setting-missing 2건(새 키 둘)으로 실패하므로 **첫 묶음에서 키 둘을 넣어야 커밋 관문이 통과**한다. 프리뷰 전 행동 검증(실호출 대본 대조 + design-reviewer 판정)은 고정 절차(기억 feedback-behavior-check-before-preview).
- 겹치는 변경 단위: 'iPad 버리는 듣기'(spec 초안 검토 중, 요청자 답 뒤 구현) — `src/lib/speech/browser.ts` · `src/core/speech/*` · `talk-frame.tsx` 읽기 줄 · `child-turn.tsx` · `follow-along.tsx` · 7절 9줄을 만진다. 이 plan 의 묶음은 그 파일들을 **되도록 만지지 않고**, 꼭 만져야 하면 그 묶음을 마지막에 두고 범위를 줄 단위로 적는다.
- 요청자가 강조한 뜻: "최종 목표는 아이가 정해진 대본을 따라가는 것이 아니라 실제 선생님과 영어로 이야기한다고 느끼는 것", "빨리 진행해".

## 할 것

스킬 `.claude/skills/plan-build/SKILL.md` 를 읽고 템플릿대로 `intent/2026-11-06-회화-AI-몫-넓힘/plan.md` 를 쓴다(상태 draft → 컨트롤러 승인). 담을 것:

1. **묶음 나누기**: 파일 범위가 겹치지 않게 나란히 띄울 수 있는 묶음(동시에 다섯까지)으로. 예: (0) 설정 키 둘 + turnSettings 스키마 + seed/settings.json + 12절 대조 시험(먼저, 작게), (1) 프롬프트 · 상황 차례(인사 끝 · 받침 · 들리지 않음 자리의 AI 말, 지어내기 금지 규칙, 말 길이 규칙, 자기 이야기 참고값) + Zod 스키마, (2) 서버 규칙(답 자리 FR-4 · 장면 여는 질문 FR-5 · 신호 말 FR-6 · 카드 '이번 차례에 돌아오기' 알림) + 순수 함수, (3) 검증기 · 카드 칸(시드 규격 · 신호 말 목록 · 지어낸 경험 검사 목록) + 카드 두 장 다시 만들기, (4) 대본 도구(FR-8 지표 — 분모 · 표본 · 비교 기준 · 구분 넷 · `--chance-alert`) + 실호출 대본 회차, (5) 화면 변화가 있으면(최소) 마지막에. 묶음마다 바뀌는 파일 · 안 바뀌는 파일 · 시험(단위 · 통합 · e2e) · 수용 기준 번호(AC-n)를 적는다.
2. **증명**: 묶음별 단위 시험, CI(통합 · e2e, `gh workflow run ci.yml --ref feature/1a-p13d-teacher -f e2e=true`), 실호출 대본 대조(FR-8 의 표본 · 기준선 · 분모대로, 설계 검토자 Fable max 판정 '대화 같다'), 재발 목록(일방통행 · 같은 질문 반복 · 두 번 읽기 · 형식적 인사 · 한글 해석 · 한국어로 묻기 · 지어낸 경험)을 점검표 고정 항목으로, 배포 뒤 서버 턴 1회 확인. iPad 회화 품질 검증 '완료' 는 마이크 우회 뒤(C211 8).
3. **위험 · 비용**: 호출 수 불변(FR-8), 토큰 증가 상한, 선생님 발화량 지표, 프롬프트 변경이 1단계 회화(닫힘)에 미치는 영향 없음, 카드 다시 만들기의 검증 통과 기준.
4. **순서와 커밋 지점**: 묶음 0 → (1 · 2 · 3 · 4 나란히) → 대본 회차 → 설계 판정 → fix → 커밋 · push(정본 사본 변경 포함) → CI → seed:load → 배포 → 서버 확인 → 상태표. 배포는 '마이크 우회' 와 함께 하되 코드 준비는 먼저.
5. **구현 브리프의 머리 '맥락' 절에 넣을 것**(묶음마다 열 줄 안): 닿는 결정 번호 · 넘겨받은 것 · 요청자 강조 · 읽을 정본 절.

길이 200~300줄. 묶음 표는 파일 경로를 정확히(실제 존재 확인). 저에게는 요지 다섯 줄(묶음 수 · 나란히 띄울 조합 · 첫 묶음 · 증명 · 위험)만 보고.
