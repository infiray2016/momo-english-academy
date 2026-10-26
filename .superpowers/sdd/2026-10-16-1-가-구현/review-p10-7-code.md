# 코드 검토 보고: P10 차례 7(마무리 — 크기 훑기 · AC-N9 · AC-1b · 공용 시험 둘 · isUniqueViolation 합침) — rev-p10, 가벼운 검토, 2026-10-18 06:1x

**판정: Approved** — Critical 0 · Important 0 · Minor 6(목록만, 컨트롤러가 직접). 차례 7 의 e2e 셋(AC-N9 · AC-1b · 크기 훑기)은 아직 CI 에서 돈 적이 없다. 그래서 이 판정은 그 CI 가 초록이라는 전제 위에 있다(크기 위반이 나오면 그 목록대로 고침).

범위와 증거:
- 범위는 워크트리 p10 의 `git diff df7f6cd`(추적 파일 일곱)와 새 파일 셋(`tests/e2e/child-size.ts` · `tests/e2e/font-size.spec.ts` · `tests/unit/safe-error.test.ts` — 추적 밖이라 diff 에 안 보임)이다.
- 복사본 `scratchpad/rev-p10-7/copy`(비밀 파일 · `.dev` 뺌)에서 DB 없이 돌렸다.

  | 명령 | 결과 |
  |---|---|
  | 단위 | 40 파일 · 367 통과 |
  | `biome ci` | 고칠 것 없음 |
  | tsc | `.next` 생성 타입 밖 오류 0 |
  | spec-trace | 종료 0 · AC 이름 시험 186 · missing-test 34 |
  | check:ids(P11 워크트리 스크립트를 복사본에 읽기만) | design-number 0 · 그 밖 0 · 종료 0 |
- 통합 · e2e 는 돌리지 않았다(CI 결과는 컨트롤러가 전함).

## 1. 볼 것별 판정

| 볼 것 | 판정 | 근거 |
|---|---|---|
| 1 크기 훑기(plan-p10b 값 9) | ✅ | 아래 |
| 2 AC-N9 이름 · 화면 · 두 방향 | ✅(Minor 셋) | 아래 |
| 3 AC-1b | ✅(Minor 하나) | 아래 |
| 4 공용 시험 둘 | ✅(Minor 하나) | 아래 |
| 5 `isUniqueViolation` 합침 | ✅ | 아래 |
| 6 보고 숫자 | ✅(Minor 하나) | 아래 |

**1. 크기 훑기 `tests/e2e/child-size.ts`.**
- `[data-child-screen]` 안에서 자기 글이 있는 요소 20px, `lang="en"` 조상(가장 가까운 `[lang]` 이 en)이면 24px, 누르는 것(button · a · [role=button] · [data-touch]) 안 글자 22px, 그 상자 56 × 56, '%' 없음, 가로 넘침 없음을 본다. 그리지 않는 0 × 0 은 뺀다. `[data-parent-info]` · `[data-size-exempt]` 는 `closest` 로 빼서 자손까지 빠진다.
- 기준 수 넷(`MIN_GUIDE_PX` 20 · `MIN_ENGLISH_PX` 24 · `MIN_BUTTON_TEXT_PX` 22 · `MIN_TARGET_PX` 56)은 파일 위 이름 붙인 상수이고, P5b `tests/e2e-local/seed-viewer.spec.ts`:44-47 과 같은 이름 · 값이다.
- 뿌리가 없으면 빈 목록이 아니라 위반 한 줄을 돌려준다. 그래서 '요소 없음 = 통과'인 거짓 초록이 없다.
- `childSizeBothWays` 가 세로 820 · 가로 1180 을 돌고 한 그림 기다린 뒤 훑는다.
- 예외 표시 `data-size-exempt` 는 감싸는 요소 하나에 달면 그 안이 다 빠지는 꼴이다. plan-p11a 위험 9(지문 안 낱말 단추)에 그대로 쓸 수 있다.

**2. AC-N9 `tests/e2e/font-size.spec.ts`.**
- 시험 이름이 plan-p10b 증명 표 글자 그대로다.
- 훑는 화면: 접근 코드(쿠키 없는 문맥, 뿌리 main) · 홈 · 회화 준비 중 · 세션 틀(미리보기 · 지문 · 문항) · 수업 목록 · 지난 수업(단원 · 수업) · 배치 시작 · 쓰기 타일 문항 · 결과 · 말하기 마이크 안내 · 읽기 그림 고르기 문항. 이름에 든 아홉이 다 있다.
- 위반을 모아 마지막에 한 번 단언해 어느 화면 · 방향인지 보인다.

**3. AC-1b(`tests/e2e/first-run.spec.ts`).**
- 이름이 plan-p10a 증명 표 글자 그대로다.
- seed.complete_through_level 6 과 읽기 3단계 단원 1 복제(`cloneLessons`, 정할 것 서 — 시험용 시드는 1단계뿐인 C70 사정)는 e2e 전용이고 개발용 DB 길에는 쓰지 않는다.
- 첫 실행에서 읽기 3단계를 고른다. 그러면 홈 읽기 카드는 3단계 · `/reading/lessons`, 쓰기 · 말하기는 `/<영역>/placement` 다. '여기부터 해요'(수업 1)를 누르면 세션의 level 3 · 수업 행(area reading · level 3 · unit 1 · assigned · lessonNo 1)을 DB 로 확인한다.
- 'AI 호출 0회'는 `countRows(aiCalls)` 로 ai_calls 실제 행을 센다.

**4. 공용 시험 둘.**
- `tests/unit/learning-day.test.ts`: `isClientFile` 이 앞 주석 · 빈 줄을 건너뛰고 첫 문장 'use client' 를 본다. 견본 넷(지시 · 주석 뒤 지시 · 지시 없음 · 'use server')이 있고, 서버 파일이 0 이 아님도 단언한다. 보고에 변이(`talk/page.tsx` 에 `Date.now()` 한 줄 → 빨강)가 있다. 'use client' 파일은 범위 밖이다(plan-p10b 정할 것 ㅍ 의 '서버 컴포넌트까지').
- `tests/unit/access-gate.test.ts`: `requireAccessFromElsewhere` 가 같은 이름의 지역 함수 · 변수 선언과 guard 가 아닌 모듈에서 가져온 이름 있는 가져오기를 잡는다(guard.ts 자신은 뺌). 견본 셋이 있다. 첫 문장 판정(`isGuardCall`)은 식별자 호출만 받아 `x.requireAccess()` 꼴 우회는 이미 막힌다. 남는 거짓 음성 둘은 Minor 4.

**5. `isUniqueViolation` 합침.**
- `src/server/db/safe-error.ts` 의 한 함수가 원인 사슬을 `CAUSE_CHAIN_DEPTH`(4) 겹까지 보며 `PG_UNIQUE_VIOLATION`("23505")과 견준다.
- 세 곳(profile · session · placement)의 옛 함수는 깊이 3 이었다. 실제 사슬(drizzle 질의 오류 → postgres 오류)은 두 겹이라 판정이 같다. 한 겹 더 찾을 뿐이다.
- `CAUSE_DEPTH` 는 내보내지 않던 이름이라 이름 바꿈이 다른 호출자를 깨지 않는다.
- 세 파일에 박힌 깊이 · 지역 상수가 더 없다(복사본 grep).
- 단위 시험이 0 겹 · 깊이 − 1 겹은 참, 깊이 겹은 거짓, 다른 코드 · undefined 는 거짓, `dbErrorTag` 는 'Error 23505' 를 단언한다.
- 오류 글에는 이름 · 코드만 실리고 입력 · 이름이 없다(장부 '서버 액션 · 서버 함수의 DB 오류' 규칙 그대로).

**6. 보고 숫자.**
- 단위 366 → 367 · check:ids design-number 0 · P10 몫 missing-test 는 AC-6a 하나다. spec-trace 출력의 `plan.md:217 missing-test AC-6a … (P: P10)` 이고, plan-p10b 정할 것 ㄱ 에서 P11 로 옮김 — 묶음 plan P 칸은 컨트롤러 몫이다.
- 비밀값 grep '0 파일'만 다르다(Minor 6).

## 2. Minor(목록 — 컨트롤러가 직접)

1. **AC-N9 말하기 마이크 안내 훑기가 화면 바뀜을 기다리지 않는다.** `font-size.spec.ts`:167-171 은 말하기 배치 '시작'을 누른 직후 훑는다. 다른 화면은 `[data-placement-item]` · `[data-activity]` 등을 기다린다. 마이크 안내 화면 표시(예: `data-mic-notice` 나 그 화면 문구)를 기다린 뒤 훑어야, 바뀌기 전 시작 화면을 다시 훑고 지나가는 거짓 초록이 없다.
2. **AC-N9 홈 훑기가 하이드레이션 · 마이크 판정 뒤를 기다리지 않는다.** `:90-92` 의 `[data-home-card]` 4 는 서버 HTML 에도 있다. 그래서 말하기 · 회화 카드가 '판정 전 틀'일 때 훑을 수 있다(차례 3 의 판정 전 꼴은 행동 자리를 비움). 홈에도 `data-hydrated`(또는 판정 끝 표시)를 두고 기다리면 '시작!' · '이야기 고르기' 행동 자리까지 훑는다.
3. **AC-N9 가 말하기 따라 말하기 · 듣고 고르기 문항을 훑지 않는다.** 배치 '문항'은 쓰기 타일 · 읽기 그림 고르기 둘이다. 따라 말하기 조각(문장 · '말하기' 단추)은 가짜 음성으로 마이크 안내를 지나면 닿는다. 하나 더하면 조각 넷 가운데 셋을 본다(입력란 조각은 P11 쓰기 4단계 이상).
4. **`requireAccessFromElsewhere` 의 거짓 음성 둘(복사본 탐침으로 위반 0 확인).**
   - (가) 기본 가져오기 `import requireAccess from "./fake-guard"`.
   - (나) guard 의 다른 함수 별칭 `import { hasValidAccess as requireAccess } from "@/server/access/guard"`.
   - 고치는 법: `importClause.name?.text === "requireAccess"` 도 위반, 이름 있는 가져오기는 `element.propertyName` 이 있으면 그것이 `requireAccess` 일 때만 받는다.
5. **AC-1b 의 `countRows(aiCalls)` 가 표 전체를 센다.** `resetHousehold` 는 ai_calls 를 남긴다(`tests/e2e/db.ts` 주석). P10 에는 AI 호출이 없어 0 이다. 그러나 P11 이 가짜 Anthropic e2e 를 더하면 앞 시험의 행 때문에 이 단언이 깨진다. 시험 시작 시각 뒤 행만 세거나(`called_at >=`) 프로필 id 로 좁힌다.
6. **보고의 '비밀값 grep 0 파일'.** 비밀번호가 든 postgres 주소 꼴(`postgres://…:…@`)로 훑으면 `tests/unit/dev-tree.test.ts` 하나가 걸린다. 차례 1 의 `.env.local` 시험이 쓰는 지어낸 주소(`user:secret@db.example…`)라 실제 비밀값은 아니다. 보고 문장을 '지어낸 시험 값 하나 밖 0' 으로 고치거나 grep 에서 그 꼴을 뺀다.

## 3. 덧붙임 — CI 9차 AC-N9 26건('20px < 22px')에 대한 판단(컨트롤러 요청, 2026-10-18)

**`child-size.ts` 의 '누르는 것 안의 모든 글 22px'은 plan-p10b 값 9 의 글자와는 맞지만, 4절과 P5b 꼴보다 넓다. 컨트롤러 해석(22px 는 단추 이름표, 카드 안 보조 줄은 안내 20px)이 정본에 맞는다.**

- **근거 — 4절**(`specs/03-화면.md`:7): '안내 · 한국어 뜻은 20px 이상, … 버튼 글자는 22px 이상'이다. 홈 영역 카드 · 수업 카드 안의 '단원 1 · …' · '아는 단어 0/4' · '이번 주 0일' 같은 줄은 버튼 글자가 아니라 안내다.
- **근거 — P5b 꼴**: 값 9 가 '일반화'한 원본 P5b 훑기(`tests/e2e-local/seed-viewer.spec.ts`:560-562)는 22px 를 `[data-choice]`(보기 · 타일 — 안의 글이 곧 단추 이름표) 안에만 걸었다.
- **근거 — 값 9 의 문장**: 'button · a · [role=button] · [data-touch] 는 글자 22px'는 카드 꼴 링크(`PostIt` — a · button · data-touch)까지 덮는다. 그래서 '같은 꼴'이라는 값 9 의 뜻보다 넓게 적혔다.
- **고치는 법(fix 6)**: 22px 기준을 '단추 이름표'에만 건다. 예: 단추 꼴 조각(BigButton · SmallButton · ChoiceButton · BigLink · SmallLink · 타일 · 자판 · 보기)에 이름표 표시(`data-button-label` 따위)를 두고 그 안 글만 22px 로 잰다. 카드 꼴 누르는 것은 상자 56 × 56 만 재고, 안의 글은 안내 20px · 영어 24px 로 잰다. 카드의 큰 제목(영역 이름 · '시작!' 띠)은 지금도 22px 를 넘어 영향이 없다. 값 9 문장도 같은 뜻으로 고쳐 두면 P11 이 같은 길로 간다.
