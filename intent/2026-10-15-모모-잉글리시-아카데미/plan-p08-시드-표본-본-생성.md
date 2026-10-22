# Plan: 모모 잉글리시 아카데미 — 1-가 P8 시드 표본 · 본 생성(읽기 · 쓰기 · 말하기 1~6단계 + 단계 평가 · 배치)

spec: `specs/06-시드-생성.md` 6.3 순서 (2)~(4-가) · 6.4, `specs/08-테스트와-기술.md` 9절 '시드 표본 생성 평가', 13절 C66 · C67 · C84 · C85 · C87 · C88 · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-22 · 상태: review(요청자 승인 대기 — 묶음 plan P8 행 · '시드 묶음 워크플로' 표는 승인됨)
승인: — · 브랜치 · 워크트리: `feature/1a-p08-seed-generation`(워크트리 `.claude/worktrees/p08`, P11 가지 + P6b 7767df0 + P5a 2c31bee 합침) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`(브리프 `task-p08-prep.md`, 보고 `task-p08-prep-report.md` — p08 워크트리)

가벼운 루프(생성 파이프라인은 도구 성격, 내용 검토는 6.3 게이트가 맡음). 정본에 없는 이름은 '(제안)', 확인 못 한 사실은 '(추측)'.

## 목표 (Goal)

지금 앱의 수업은 전부 시험용 시드다. 이 plan 은 진짜 수업 · 문제 · 평가 문항을 만든다. 본 생성용 정의(`.claude/agents/seed-generator.md` — 브리프 하나만 읽음, Opus, effort 는 호출 값)와 영역 × 단계 생성 브리프(`seed/prompts/<영역>-<단계>.md`)로 단원 하나씩 만들고, `pnpm seed:validate`(6.4) · `pnpm seed:check`(풀이 검사, Sonnet 5.5 low, H4 키) · 요청자 표본 읽기(H11)를 거쳐 개발용 DB 에 넣는다. 먼저 표본(10-23, 읽기 1 · 말하기 1 단원 1 을 xhigh · high 로, S10) → H10 effort 결정 → 10-24 읽기 1 묶음부터 1~3단계 → 4~6단계 · 단계 평가 · 배치 한 벌(10-28 목표). 회화 카드(6.3 (4-나))는 P13 회화 턴이 표본 카드로 돈 뒤(C85).

## 바뀌는 파일 (Files that change)

| 파일 | 신규 / 수정 | 무엇을 |
|---|---|---|
| `.claude/agents/seed-generator.md` | 신규(p08 · 본 저장소 둘) | 본 생성용 정의 — 규칙 10 · 순서 · 보고 꼴. H10 뒤 프런트매터에 effort(정의 해시 바뀜 → 표본 단원은 새 판으로 다시) |
| `seed/prompts/_template.md` · `reading-1.md` · `speaking-1.md` · 이후 영역 × 단계마다 | 신규 | 생성 브리프(단계 · 단원 규격 발췌 · 배정표 · 단원 틀 값 · 수업 구성 · 출력 규격 + 예시 · 금지 · 검증 명령 · 보고 꼴) |
| `seed/prompts/README.md` | 신규 | 표본 절차 · 재는 표 · manifest 꼴(제안 `seed/manifest/<영역>-<단계>.jsonl`) · 묶음 순서 |
| `seed/lessons/<영역>/<단계>/<단원>.json` · `seed/level-tests/` · `seed/placement/` · `seed/manifest/` · `seed/reviews/` · `seed/checks/` | 신규(묶음마다) | 본 시드와 검사 · 검토 기록 |
| `src/core/seed/check-lesson.ts`(702줄) | 수정(쓰기 3단계 묶음 전) | C84 대로 조립 카드의 고유 명사 · I 대문자 허용 |
| `scripts/` 워크플로(제안) | 신규(선택) | `Workflow` 스크립트 — 단원 생성 pipeline 동시 3 · 검증 · 되돌림 · manifest. 표본은 `Agent` 호출 넷으로 손으로 돌린다 |

## 작업 순서 (Order of work)

1. [사람] H9(seed/ 를 볼트 기록 훅에서 뺄지) · H4(개발용 Anthropic 키 — 풀이 검사) · H7(그림 승인, P11 앱 바탕 합침용) · 표본 비교 묶음 확인(읽기 1 · 말하기 1). 완료: 셋 답.
2. [문서] 본 저장소 `.claude/agents/seed-generator.md` 사본(Agent 호출이 읽는 자리). 완료: 파일 같음(해시).
3. [검증] 표본(10-23): README 2절 명령 차례 — 뿌리 둘 `tests/.tmp/p08-samples/{xhigh,high}` · 판 해시 · manifest 첫 줄 · `Agent(seed-generator, opus, xhigh|high)` 넷 → `seed:validate --root` · `seed:check --dry-run` → 크기 · 시간 표(README 3절). 완료: 재는 표 채움, 요청자 표본 읽기(시드 보기 `SEED_VIEWER_ROOT`).
4. [사람] H10 effort 결정 → 정의 프런트매터 effort → 브리프 고정(해시). 완료: 13절 한 줄(effort 값).
5. [검증] 읽기 1 묶음(단원 1~5, 10-24) → 검증 · 풀이 검사 · 요청자 표본 2개(H11) → 개발용 DB 적재(판 2, dev-load 또는 임시 적재 스크립트). 완료: 프리뷰 읽기 1단계가 진짜 수업.
6. [검증] 쓰기 1 · 말하기 1 → 2~3단계(영역 × 단계 묶음, 동시 2~3 세션). 쓰기 3단계 전에 작업 7. 완료: 1~3단계 세 영역 적재.
7. [검증] P4 검증기 C84 어긋남 고침(가벼운 fix · 단위 시험). 완료: 'I' · 'Momo' 카드 오류 0.
8. [검증] 4~6단계 + 단계 평가 1~6 벌 + 배치 가 벌(평가 브리프 따로, 1단계 묶음과 나란히) → 적재 · seed.complete_through_level 6. 완료: 완전성 검사 통과(C50 의 1-가 끝 사용 조건 넘음).
9. [문서] 완료 보고 · 재는 표 · 묶음 게이트 기록. 1~3단계가 다 차면 시험용 시드 지움(컨트롤러 결정).

## 위험 · 제약 (Risks)

- 주간 사용 한도: 생성은 구독 사용량을 쓴다(6.3). 한도에 닿으면 생성 · 구현 모두 멈춘다 — 한도 근처면 생성을 먼저 돌린다(요청자 2026-10-22 일정 우선).
- 정본 빈틈은 P8 준비 보고 '정할 것' 19 — 5 · 7 은 13절 C87 · C88, 13 은 작업 7, 16 · 17 은 장부(요청자 확인), 나머지(4 effort 기록 · 6 1단계 문장 꼴 표 · 8 듣기 보기 4 · 9 보강 묶음 나누기 · 10 targetWords 뜻 · 11 등장인물 Momo · Tori · 12 {NAME} 은 회화 카드만 · 14 생성자 자기 검증 · 15 manifest 꼴 · 18 평가 브리프 따로 · 19 금지 내용 · 블라인드 표본 읽기)는 컨트롤러가 제안대로 받음 — 생성 지침이라 13절에 두지 않는다.
- 생성자는 브리프만 읽는다 — 브리프에 빠진 사실은 추측하지 않고 보고에 남긴다. 브리프의 사실은 전부 파일에서 옮긴 것(보고 2절 출처).
- 그림 키는 P6b 가 있어야 한다(p08 에 합침). H7 승인 전에는 생성 가지에서만 쓴다.
- 비밀값(H4 키)은 `.env.local` 에만 두고 대화 · 장부에 적지 않는다.
- 되돌리기: 시드는 파일이라 묶음 단위로 지우면 된다. 적재는 판(revision)으로 겹치지 않게 넣는다(5절).

## 증명 (Proof)

| 수용 기준 | 증명 | 파일 · 명령 |
|---|---|---|
| AC-7a(실시드 완전성) | 묶음마다 `pnpm seed:validate --complete-through <n> --areas …` 통과, 마지막에 6 | `scripts/seed-validate.ts` |
| 6.4 검사 전부 | 묶음마다 validate 오류 0 · 경고는 요청자 결정 기록 | `seed/reviews/` · manifest |
| 풀이 검사 | 묶음마다 `pnpm seed:check` 결과 · 사람 확인 '정답 맞음 · 고침' | `seed/checks/` |
| S10 effort 비교 | README 3절 표(통과율 · 걸림 수 · 시간 · 크기) + H10 기록 | `tests/.tmp/p08-samples/*/validate.json` |
| 표본 읽기 H11 | 시드 보기 화면 판정 수업 2개(오류면 5) | `seed/reviews/` |
| 린트 · 빌드 · 테스트 | 새 코드(작업 7 · 워크플로)만 `pnpm lint` · `pnpm test` | CI |

## 완료 보고 (Done)

(구현 뒤 갱신)
