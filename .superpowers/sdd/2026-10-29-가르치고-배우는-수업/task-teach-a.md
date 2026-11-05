# 브리프: 가르치고 배우는 수업 plan 묶음 아 — 수업 설계 지표 순수 함수 · 보고 명령(구현자 · Opus · high, 2026-10-30 01:0x 작성, 묶음 나 보고(시도 꼴 판 2 확정) 뒤 시작)

plan `intent/2026-10-29-가르치고-배우는-수업/plan.md`(approved C186) 160~168줄 '바 · 사 · 아' 표의 아 행을 구현한다. 근거는 spec 3판 FR-10(44줄)과 설계 8 '수업 설계 지표'(354줄~: DB 없는 순수 함수가 세션 · 시도 기록에서 '스스로 해냄'(첫 시도에 틀린 혼자 문항의 짝을 첫 시도에 혼자 맞힌 비율) · 혼자 문항 첫 시도 정답률(문항별) · 같이 해 보기 첫 시도 정답률 · 자리별 걸린 시간을 낸다. 프리뷰 첫 주 보고 · 사용 시험 보고에 싣고 아이 · 부모 화면에는 보이지 않는다) · AC-10a, 묶음 나 의 시도 꼴 판 2(plan '이름' 표와 나 보고 `task-teach-na-report.md` 의 실제 꼴). 코드 워크트리 `/Users/hikaru/workspace/momo-english-academy/.claude/worktrees/p13d`. 명령은 `( cd <워크트리> && … )` 서브셸로만, PATH 앞에 `/Users/hikaru/.nvm/versions/node/v24.22.0/bin`. cd 금지.

## 할 것
| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `src/core/session/teach-metrics.ts`(제안) | 신규 | 순수 함수(제안 `teachMetricsOf`): 세션 · 시도 행 묶음(판 2 꼴: together · 혼자 · spare(slot "spare" · base) · 자리별 시작 · 끝 시각)에서 지표 넷. 영역 · 단계 · 단원 · 수업 · 문항별로 묶어 낼 수 있게. U 문항(건너뜀 · 'AI 쉬는 중' · 소리 없음)은 비율의 분모에서 뺀다(평가 spec 의 validity 와 같은 결) |
| `scripts/teach-metrics.ts`(제안) · `package.json`(`teach:metrics`) | 신규 · 수정 | 개발 DB 를 서버 Drizzle 로 읽어(접속값은 .env.local, 출력하지 않음) 표로 낸다(markdown 표, 기간 · 영역 · 단계 인자). 아이 이름 · 프로필 식별 정보 없음(프로필은 번호만). 운영 빌드 · 앱 화면에는 들지 않는다 |
| `tests/unit/teach-metrics.test.ts`(제안) | 신규 | 합성 시도 묶음에서 지표 넷(AC-10a): 첫 시도 틀림 → 짝 첫 시도 맞힘 비율, 문항별 정답률, 같이 해 보기 정답률, 자리별 시간, U 제외, 빈 입력 |

## 지키는 것
- DB 의존 없는 순수 함수(CLAUDE.md 분리 규칙). 설계 숫자 코드 금지. 식별자 영어. 보고 명령은 개발용(운영 DB 에 돌리지 않는다). 아이 이름 · 비밀값을 찍지 않는다.
- 다른 묶음 파일(세션 코어의 attempt · preview 는 읽기만)은 손대지 않는다. 커밋하지 않는다.

## 관문 · 보고
TDD. 끝에 `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm check:deps` · `pnpm check:ids`(보고 모드) · `pnpm spec:trace --fail-on unknown-ac`(시험 이름은 정본 15절 번호 — C184 대응표). 보고 `task-teach-a-report.md`(30줄 안): 바뀐 파일 · 함수 입력 · 출력 꼴 · 명령 사용법 · 시험 · 관문 · 우려. 마지막 답은 파일 경로 · 관문 결과 · 우려 수만.

보탬(01:1x): 델타 → 정본 15절 번호(C184 반영 보고 대응표): 1a~1d → AC-22a~d · 2a~2d → AC-3c~3f · 2e → AC-4d · 3a~3c → AC-3g~3i · 4a 4b → AC-3j 3k · 4c 4d → AC-5i 5j · 5a 5b → AC-3l 3m · 6a~6g → AC-22e~k · 7a~7c → AC-6f~6h · 8a 8b → AC-22l m · 9a → AC-22n · 10a → AC-22o · N1~N4 → AC-N18~N21. 시험 이름은 정본 번호로.
