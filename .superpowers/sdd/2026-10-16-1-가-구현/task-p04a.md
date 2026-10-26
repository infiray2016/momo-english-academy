# 브리프: P4a 시드 규격 · 글 도구(implementer · Opus · high)

plan `intent/2026-10-15-모모-잉글리시-아카데미/plan-p04a-규격.md`(approved 컨트롤러 2026-10-16 15:5x)를 구현한다. plan 이 유일한 설계이고 이 브리프는 범위 · 허용 파일 · 명령 · 보고 자리를 정한다. 코드는 plan 의 '영어 값과 칸 키' · '상수' · '규격 칸' · '글 도구' · '시험용 시드 만들기 함수' 절과 '정할 것' 끝의 컨트롤러 결정 문단(C54, ㅁ 의 영어 값, `bandOf` 처리)을 글자 그대로 따른다.

## 작업 폴더 · 바탕
- 이 에이전트의 현재 폴더는 격리 워크트리다(바탕은 승인 커밋 뒤 HEAD, 브랜치 `feature/1a-p01b-quality-gates` 끝). 모든 경로는 그 폴더 기준이고, 메인 저장소 폴더(`/Users/hikaru/workspace/momo-english-academy`)의 파일은 읽기만 한다.
- 첫 명령: `source ~/.nvm/nvm.sh && nvm use >/dev/null && pnpm install --frozen-lockfile`(워크트리에는 node_modules 가 없다. 끝내기 관문이 node_modules 를 요구한다). 이후 모든 명령은 `source ~/.nvm/nvm.sh && nvm use >/dev/null && ` 로 시작한다.
- git 쓰기 명령 금지(커밋은 요청자 지시 때 컨트롤러가 한다). 파일 이름 바꾸기는 `mv`.

## 먼저 읽을 것(순서)
1. `.claude/CLAUDE.md`. 2. plan-p04a 전부(목표 · 바뀌는 파일 · 시드 파일 배치 · 영어 값과 칸 키 · 상수 · 규격 칸 · 글 도구 · 만들기 함수 · 작업 순서 1~8 · 위험 · 정할 것과 끝 문단 · 증명 표). 3. plan-p04b · plan-p04c 의 '바뀌는 파일'과 '목표'만(b · c 가 이 plan 의 함수 · 꼴을 어떻게 쓰는지 알기 위해. 구현하지 않는다). 4. 정본 `specs/06-시드-생성.md` 6.3 · 6.4, `specs/04-데이터.md` 5절 시드 테이블, `specs/02-1-영역-단원-승급.md` 3.1 · 3.2, `specs/02-2-세션과-단계표.md` 3.3, `specs/02-3-어휘-복습-동기-점수.md` 3.4 · 3.6, `specs/09-설정값.md` 12절, `specs/10-결정-기록.md` 13절 C49 · C50 · C54. 5. 기존 시험 꼴 `tests/unit/*.test.ts` 와 P1b 스크립트 꼴 `scripts/spec-trace.ts`(순수 함수 + 직접 실행 판별).

## 허용 파일(모두 새 파일)
`src/core/seed/structure.ts` · `src/core/seed/schema/reference.ts` · `src/core/seed/schema/lesson.ts` · `src/core/seed/schema/talk.ts` · `src/core/seed/schema/assessment.ts` · `src/core/seed/schema/records.ts` · `src/core/seed/text.ts` · `tests/unit/seed-schema.test.ts` · `tests/unit/seed-text.test.ts` · `tests/fixtures/seed/builders.ts` · 보고 `.superpowers/sdd/2026-10-16-1-가-구현/task-p04a-report.md`. 그 밖(공용 파일 · `src/core/vocab/` · `scripts/` · 설정 파일)은 손대지 않는다. 새 패키지 없음(zod 4.6.7 · tsx 는 있다. `package.json` · 잠금 파일 변화 0). `src/core` 는 db · next · react · `src/server` · 파일 시스템을 가져올 수 없다(`pnpm check:deps` 가 잡는다. 파일 쓰기는 `tests/fixtures/seed/builders.ts` 의 `writeSeedTree` 만, 시험이 `tests/.tmp/seed-<무작위>/` 에 쓰고 지운다).

## 지킬 것
- 시험을 먼저 쓰고 실패를 본 뒤 구현한다(plan 작업 순서 1~7). 시험 이름은 plan 증명 표의 이름을 **글자 그대로**(이 plan 은 AC 접두가 없다. AC 를 붙이지 않는다).
- 설계 숫자는 12절 키 · level_specs 칸 · plan '상수' 표 밖에 두지 않는다. 시험 숫자는 `builders.ts` 의 `defaultSettings()` · 단계 규격 견본에서 읽는다.
- 영어 값은 plan 표와 C54 (3) 그대로(vocab 의 id 는 `word`, 배치 벌 · 주제 변형은 정수). 모든 객체는 `z.strictObject`(모르는 키 거부), 변환 · 날짜 객체 없음.
- `bandOf` 는 `structure.ts` 에 두되 꼴을 `bandOf(level: number): Band`(`Band` = `'1-3' | '4-6' | '7-9' | '10-12'`)로 한다(컨트롤러가 합칠 때 P2a 의 `src/core/level-band.ts` 로 바꿀 수 있게).
- 정규식 리터럴에 ES2018 문법(`\p{…}` · 뒤보기)을 쓰지 않는다(tsconfig target ES2017). 한글은 문자 범위 이스케이프.
- 시험용 시드에 사람 이름 · 연락처 꼴 원문을 넣지 않는다(Tori · Momo 만, 연락처 꼴은 실행 때 조각을 잇는다). 비밀값 없음.
- 모호하면 지어내지 말고 보고 '요청하는 변경'에 적는다. 정본과 다르게 해야 하면 멈추고 NEEDS_CONTEXT.

## 끝나면
`pnpm lint` · `pnpm build` · `pnpm test` · `pnpm check:deps` · `pnpm spec:trace --plan intent/2026-10-15-모모-잉글리시-아카데미/plan.md`(missing-test 변화 없음, 66) · `pnpm check:bundle`(build 뒤). 빌드 시간을 적는다(plan 위험 6). 보고 `task-p04a-report.md`: 바뀐 파일:줄, 설계와 다르게 한 것과 이유, 요청하는 변경, 시험 이름 전부, 명령과 출력(통과 수 · spec-trace 요약 · 빌드 시간), b · c 가 쓸 내보내기 이름 목록, 남은 우려. 마지막 메시지 첫 줄은 DONE · DONE_WITH_CONCERNS · NEEDS_CONTEXT · BLOCKED, 그 뒤 요지 8줄 안쪽. 끝낼 때 Stop 관문이 `biome ci` 와 단위 시험을 돈다. 실패하면 시험을 지우지 말고 고친다.
