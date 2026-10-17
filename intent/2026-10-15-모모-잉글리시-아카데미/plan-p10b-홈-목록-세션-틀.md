# Plan: 모모 잉글리시 아카데미 — 초등 4학년부터 혼자 할 수 있는 영어 읽기 · 쓰기 · 말하기 · 회화 학습 앱 · 1-가 P10b 홈 · 수업 목록 · 세션 틀

spec: `specs/` 정본(4절 첫 문단 '세션 진행 상태는 활동마다 즉시 저장' · 홈 표 · 수업 목록 표, 3.2 수업 목록 문단 · 다시 하기 · 안 해 본 수업 · 연습 수업 · 단원 통과 표, 3.3 첫 활동(새 단어 미리보기 · 다지기는 '안다'가 아닌 단원 단어 k 개까지) · 영역별 세션 순서, 3.5 연속 학습 일수 · '이번 주 n일', 5절 sessions · attempts · unit_progress · 칸 · 시드 판 · 전이 표 · '세션을 여는 서버 액션은 … 다시 판정' 문단, 8절 네트워크 끊김 · 같은 프로필의 동시 사용 · 오래 멈춘 세션 · 다음 단계 시드가 없음, 12절 unit.* · session.resume_hours · seed.complete_through_level · app.*, 13절 '하던 수업이 있을 때 다른 수업을 고르면' · '여기부터 해요' · '모든 영역의 세션은 새 단어를 … 첫 활동' 행 · C50 (1) · C56 (1) · C61, 15절 AC-1b(통합 몫) · 2a · 2b · 2d · 2e · 2f · 5c · N7 · N9, approved 2026-10-16 06:2x) · 묶음 plan `intent/2026-10-15-모모-잉글리시-아카데미/plan.md` 배정표 P10 행 · intent: `intent/2026-10-15-모모-잉글리시-아카데미/intent.md` · 작성일: 2026-10-17 · 상태: done(2026-10-18, 커밋 78db3a2)
승인: 컨트롤러 2026-10-17 18:3x(C70~C73 — 순서 바꿈은 요청자 2026-10-17 14:1x 요청에 따름, 다른 순서를 원하면 되돌림; 정할 것은 모두 권함대로) · 브랜치 · 워크트리: `feature/1a-p10-first-run-home`(P10a 와 같은 브랜치 · 같은 워크트리) · 작업 장부: `.superpowers/sdd/2026-10-16-1-가-구현/`

P10 의 둘째 절반이다. 짝은 `plan-p10a-첫-실행-배치.md` 이고, 두 plan 이 함께 쓰는 사실 — **앞당긴 까닭과 가정 · 화면을 보는 차례 · 바탕 브랜치 · 시험용 시드(값 2) · e2e DB 도우미(값 3) · 마이크 상태(값 4) · 보드(값 5) · 정본 밖 문구 · 확인한 사실** — 은 그 파일의 같은 이름 절에만 있다. 이 plan 의 작업은 그 파일 '화면을 보는 차례'의 차례 3 · 4 · 6 · 7 이다.
정본에 없는 이름은 '(제안)', 확인하지 못한 사실은 '(추측)'이다.

## 목표 (Goal)

- **홈(4절 홈 표 · AC-2a · AC-5c).** 영역 카드 넷(포스트잇 노랑 읽기 · 하늘 쓰기 · 분홍 말하기 · 연두 회화)마다 단계, 단원 진행 5칸(단계 안 단원 다섯 — 통과 · 지금 · 남음), 지금 단원 막대 둘(읽기 · 쓰기 · 말하기는 '아는 단어 n/<단원 단어 수>'와 '최근 성적' — 칸 unit.recent_window(5)에 unit.recent_score(0.80) 넘은 수업만 색칠, 회화는 '아는 단어'('말함' 안다)와 '끝낸 대화 n/<최소 수업 수>'), '이번 주 n일', 오늘 완료(아니면 '오늘 아직이에요')를 보인다. 카드와 카드 안 '시작!' · '이야기 고르기'는 그 영역의 수업 목록으로 간다(R14). 배치 평가 전 카드는 단계 자리에 '내 단계 찾기'이고 배치 평가로 간다. 말하기 시작 단계 전 회화 카드는 '말하기에서 단계를 찾으면 토리를 만날 수 있어요'이고 말하기 배치로 간다. 마이크를 쓸 수 없는 기기(인식 API 없음 · 목록 밖 브라우저 · 저장된 '마이크를 쓸 수 없음')에서는 말하기 · 회화 카드가 '마이크가 필요해요. 부모님께 말해 주세요'이고 눌리지 않는다(이 행이 '배치 평가 전' 행보다 먼저). 1-가의 회화 카드를 누르면 '토리가 준비 중이에요. 곧 만나요'와 '홈'만 보인다(C50 (1)). 별 수(별 원장 합)와 구석 부모 메뉴의 점(확인 안 한 알림이 있을 때)을 보인다. 프로필이 없으면 첫 실행으로 간다.
- **수업 목록(4절 수업 목록 표 · 3.2 · AC-2b · 2d).** 이 화면의 행동은 수업 하나를 고르는 것뿐이다. 위 종이 띠에 지금 단계 · 단원, 지금 단원 묶음(배정 수업 앞줄 · 다지기 수업 뒷줄 · 끝낸 수업 표시 · 수업 번호와 한국어 짧은 제목), 잠긴 다음 단원 한 장(남은 조건 한 줄 — '수업 n개를 더 하면 열려요' → '내일 이 단원 수업을 또 하면 열려요(앞으로 n일)' → '단어를 며칠에 걸쳐 복습하면 열려요' → '남은 수업과 보강을 하면 열려요' 가운데 맨 앞 하나), '지난 수업 다시 하기' 한 장(누르면 단원 → 수업, 통과한 단원의 하지 않은 수업은 '안 해 본 수업')만 보인다. 맨 위 차례는 있을 때만 하던 수업('하던 수업 이어 하기') · 첨삭 보기(P11) · 단계 평가(P12)다. '여기부터 해요'는 한 화면에 하나이고 하던 수업 → 첨삭 보기 → 단계 평가 → 보강 → 남은 배정 → 남은 다지기 → 복습하기(단어 익히기 · 복습할 카드) → 연습 수업 차례로 고른다. 지금 단원의 남은 수업은 순서 없이 고를 수 있고 다음 단원은 통과 전에는 열리지 않는다. 그 프로필의 수업 목록 요청 때 session.resume_hours(24) 지난 진행 세션을 중단으로 닫는다(배치 평가는 닫지 않음, 5절 · 8절).
- **세션 틀(5절 · 8절 · AC-1b · 2b · 2e · 2f).** 세션 시작 서버 액션은 고른 lesson_id 가 수업 목록 상태 함수로 열린 수업인지 서버에서 다시 판정하고 아니면 거부한다(잠긴 다음 단원 · 다른 단계 · seed.complete_through_level 밖 · 배치 전). 세션 종류(정규 · 다시 하기 · 안 해 본 수업 · 보강 · 연습), 주제 변형(프로필 묶음 — 다시 하기는 처음 했을 때와 같은 변형), 판(단원 시작 개정 이하의 가장 높은 판 — 다시 하기는 처음 쓴 개정의 가장 높은 정정)을 정한다. 하던 세션이 있는 영역에서 다른 수업을 고르면 '하던 수업은 처음부터 다시 해야 해요. 새 수업을 할까요?'를 한 번 묻고, 확인 뒤 하던 세션을 중단으로 닫는다(진행 중 세션은 하나). 세션을 여는 동안 AI 호출은 0 이다. 첫 활동은 새 단어 미리보기다 — 이번 수업 새 단어, 새 단어가 없는 다지기 · 보강은 아직 '안다'가 아닌 단원 단어 unit.new_words_per_lesson 개까지, 앞 배정 수업을 건너뛰었으면 이 수업에 나오는 단원 단어 가운데 못 만난 단어를 더한다(AC-2f). 보인 단어는 그때 만난 것으로 기록한다. 활동마다 시도를 기기가 만든 시도 id 로 저장하고(같은 id 는 한 번만), 닫았다 열면 저장한 시도 다음 활동부터 이어진다. 세션 첫 활동에서 '홈'을 누르면 세션 행을 지운다. 끊기면 시도를 기기에 쌓았다가 다시 보낸다. 두 번째 기기가 같은 영역을 열면 진행 중 세션을 이어 하고 새 세션을 만들지 않는다.
- **오늘 완료 · 이번 주 n일(AC-N7 · AC-2a).** 학습일(app.timezone · app.day_start_hour)로 센다. 새벽 3시 50분에 끝낸 새 수업은 전날의 오늘 완료를 켠다.
- 경계: 둘째 활동부터의 상호작용 · 채점 · 점수 · 세션 완료 · 결과 화면은 P11 · P12 다. P10 의 세션 틀은 둘째 활동부터를 P5b 표시 컴포넌트로 **보기만** 하고 '다음'으로 넘기며(시도 저장 없음), 마지막 활동 뒤에는 수업 목록으로 돌아간다(세션은 진행으로 남음 — 정할 것 ㅈ). 연속 학습 일수 · 복습 포스트잇 · 별 계산 · 단원 통과 판정 · 단계 평가는 P12, 회화 · 'AI 쉬는 중' · 부모 화면은 1-나다.

## 바뀌는 파일 (Files that change)

손으로 쓰는 파일은 스물다섯이다(새 파일 스물넷 · P10a 가 만든 자리를 채우는 파일 하나). 검토 묶음 셋(B1 홈 · B2 목록 · B3 세션 틀)과 마무리. 공용 변경은 아래 따로.

| 파일 | 신규 / 수정 | 무엇을 | 묶음 · 차례 |
|---|---|---|---|
| `src/core/today/done.ts` | 신규 | 오늘 완료 · 이번 주 n일(값 2) | B1 · 3 |
| `tests/unit/today-done.test.ts` | 신규 | AC-N7 · AC-2a(오늘 완료 경우들) | B1 · 3 |
| `src/server/home/index.ts` | 신규 | `server-only`. 홈 자료 읽기(값 4) | B1 · 3 |
| `src/app/(child)/page.tsx` | 수정(P10a 작업 4 의 자리) | 홈: 프로필 없으면 첫 실행, 있으면 카드 넷 · 별 · 부모 점 | B1 · 3 |
| `src/app/(child)/home-cards.tsx` | 신규 | 'use client'. 카드 넷 · 마이크 닫힘(P10a 값 4 `micUsable`) · 홈 진입마다 다시 판정 | B1 · 3 |
| `src/app/(child)/talk/page.tsx` | 신규 | '토리가 준비 중이에요. 곧 만나요' · '홈'(C50 (1)) | B1 · 3 |
| `tests/e2e/home.spec.ts` | 신규 | AC-2a · AC-5c(P10 몫) | B1 · 3 |
| `src/core/lesson-list/state.ts` | 신규 | 수업 목록 상태 · 세션 시작 재판정(값 1) | B2 · 4 |
| `tests/unit/lesson-list-state.test.ts` | 신규 | AC-2b · AC-2d(P10 몫) · 재판정 | B2 · 4 |
| `src/server/lesson-list/index.ts` | 신규 | `server-only`. 목록 자료 · 오래 멈춘 세션 닫기(값 5) | B2 · 4 |
| `src/app/(child)/[area]/lessons/page.tsx` | 신규 | 서버: 영역 확인 · 배치 전이면 배치로 · 회화면 `/talk` · 목록 자료 | B2 · 4 |
| `src/app/(child)/[area]/lessons/lesson-board.tsx` | 신규 | 'use client'. 지금 단원 묶음 · 맨 위 차례 · '여기부터 해요' · 잠긴 단원 · 지난 수업 · 고르기 · 확인(차례 6 에서 시작 액션을 붙임) | B2 · 4 |
| `src/app/(child)/[area]/lessons/past/page.tsx` | 신규 | 지난 수업 다시 하기: 단원 고르기 → 수업 고르기(안 해 본 수업 표시) | B2 · 4 |
| `tests/e2e/lesson-list.spec.ts` | 신규 | AC-2b · 2d · 2e · 2f(e2e 몫) | B2 · 4 · 6 |
| `src/core/session/preview.ts` | 신규 | 새 단어 미리보기 단어(AC-2f) · 활동 차례(값 3) | B3 · 6 |
| `tests/unit/session-preview.test.ts` | 신규 | AC-2f · 활동 차례 | B3 · 6 |
| `src/server/session/index.ts` | 신규 | `server-only`. 시작(재판정 · 종류 · 변형 · 판 · 중단) · 시도 저장 · 첫 활동 지움 · 세션 화면 자료(값 6) | B3 · 6 |
| `src/server/actions/session.ts` | 신규 | `'use server'`. `startLesson` · `saveAttempts` · `leaveSession`. 첫 문장 `await requireAccess()` | B3 · 6 |
| `src/app/(child)/session/[id]/page.tsx` | 신규 | 서버: 그 프로필의 진행 세션만, 아니면 수업 목록 | B3 · 6 |
| `src/app/(child)/session/[id]/session-frame.tsx` | 신규 | 'use client'. 종이 띠 · 활동 · '다음' · '홈'(값 7) | B3 · 6 |
| `src/lib/attempt-queue.ts` | 신규 | 'use client'. 시도 대기열(기기에 쌓고 다시 보냄, 값 8). P10a 배치도 씀 | B3 · 6 |
| `tests/unit/attempt-queue.test.ts` | 신규 | 대기열 순수 함수(쌓기 · 받음 · 다시 보내기 · 같은 id) | B3 · 6 |
| `tests/integration/session-start.test.ts` | 신규 | AC-1b(AI 0회) · AC-2b(잠긴 lesson_id 거부) · AC-2e · 세션 틀(시도 id · 이어 하기 · 오래 멈춤 · 두 기기 · 판 · 변형 · 범위 밖) | B3 · 6 |
| `tests/e2e/child-size.ts` | 신규 | 아이 화면 크기 훑기 도우미(P5b e2e-local 꼴, P11 · P12 가 같이 씀, 값 9) | 마무리 · 7 |
| `tests/e2e/font-size.spec.ts` | 신규 | AC-N9(P10 화면 전부, 세로 820 · 가로 1180) | 마무리 · 7 |

### 요청하는 공용 변경(컨트롤러가 합친다)

| # | 파일 | 바꿀 것 | 차례 · 까닭 |
|---|---|---|---|
| 1 | `tests/unit/learning-day.test.ts`(P3a) | 한 시계 정적 검사가 보는 곳에 `src/app/**` 가운데 첫 줄이 `'use client'` 가 아닌 파일(서버 컴포넌트 · 서버 액션 · Route Handler)을 더한다 | 7. P3a 정할 것 아 '서버 컴포넌트까지 넓히는 것은 P10 브리프에'. 화면 쪽 타이머는 `performance.now` · `setTimeout` 이라 'use client' 파일은 뺀다 |
| 2 | `tests/unit/access-gate.test.ts`(P3b) | 함수 안 확인 훑기에 '첫 문장의 `requireAccess` 는 `@/server/access/guard` 에서 가져온 것이다'를 더한다(같은 이름 지역 함수 견본을 잡는 사례 하나) | 7. P3b 완료 보고 메모 'P10 때' |
| 3 | `tests/fixtures/settings.ts` | P10a 공용 변경 4 와 같은 줄(이 plan 은 키를 더하지 않는다) | — |

### 파일별 값(구현자가 옮겨 쓸 것)

1. **`src/core/lesson-list/state.ts`**(DB · 시계를 가져오지 않는다. 시각 · 학습일은 인자).
   - 형: `LessonRef = { unit, kind: "assigned" | "reinforce" | "alphabet" | "remedial", lessonNo }`. `LessonCellView = LessonRef & { lessonId, variant, title, newWords, unitWords, revision, correction }`(프로필 변형으로 고른 행 — 서버가 P7a `readLessonsOfUnit` 로 고른다). `SessionLite = { id, status, kind, ref?: LessonRef, variant?, seedRevision?, startedAt, learningDay? }`(이 영역 · 이 단계). `UnitGate = { remainingLessons, remainingDays, wordsShort?: boolean, scoreShort?: boolean }`.
   - 입력 `ListInput = { area, level, unit, unitsPassed: number[], lessonsByUnit, sessions, gate, state: "normal" | "practice" | "parent_check" | "next_level_pending" | "graduated", feedbackReady: LessonRef[], levelTest?: { ready: boolean }, remedialIssued: LessonRef[], practice: LessonCellView[], reviewDue: boolean, unitsPerLevel }`. P10 의 서버는 `gate` 의 수업 수 · 학습일만 채우고 `state` 는 트랙 · unit_progress 에서(`next_level_pending` · `graduated` · parent_check 가 대기 값 `pending` 이면 `parent_check`, 정할 것 ㅅ), 나머지(`feedbackReady` · `levelTest` · `remedialIssued` · `practice` · `reviewDue` · `wordsShort` · `scoreShort`)는 빈 값 — P11 · P12 가 채운다(다른 P 에 넘길 것).
   - `lessonListState(input) → ListView`:
     - `band`: 단계 · 단원.
     - `current.front` = 보강(발급된 것, '보강' 표시) → 배정 · 알파벳 수업(번호 차례), `current.back` = 다지기 수업. 수업마다 `done`(이 단원 회차에서 끝낸 정규 세션이 있음) · `inProgress`. 모두 고를 수 있다(끝낸 수업은 다시 하기).
     - `top`: 하던 수업(진행 세션) · 첨삭 보기 · 단계 평가 — 있는 것만, 이 차례로.
     - `hereStart`: 4절 차례의 첫 대상 하나(하던 수업 → 첨삭 보기 → 단계 평가 → 보강 → 남은 배정(가장 낮은 번호) → 남은 다지기 → 복습하기(`state` practice 이고 `reviewDue`) → 연습 수업). 없으면 없음.
     - `lockedNext`: 지금 단원 < `unitsPerLevel` 일 때 다음 단원 한 장과 한 줄. 줄은 `remainingLessons > 0` → `{ kind: "lessons", n }`, `remainingDays > 0` → `{ kind: "days", n }`, `wordsShort` → `{ kind: "words" }`, `scoreShort` → `{ kind: "score" }` 가운데 맨 앞 하나(4절 '조건이 여럿이면 맨 앞 것'). `state` 가 practice 면 한 줄을 다시 쓰지 않는다(4절 단어 익히기 행). 지금 단원이 다섯째면 자리를 비운다(단계 평가 포스트잇은 P12, 정할 것 ㅎ). 남은 조건이 없는데 아직 잠김이면 줄 없음.
     - `past`: `unitsPassed` 가 있으면 '지난 수업 다시 하기' 한 장. `pastUnits(input, unit)`: 그 단원 수업마다 `retry`(끝낸 적 있음) · `untried`(통과한 단원에서 끝낸 적 없음).
     - `notice`: `parent_check` → '부모님이 다음 길을 고르고 있어요. 그동안 지난 수업을 해 봐요'(지금 단원 묶음 자리), `next_level_pending` → '다음 단계 수업을 준비하고 있어요. 지난 수업을 다시 해 봐요'(맨 위) — 문구는 4절 그대로.
   - 잠긴 단원 한 줄의 수(서버가 계산해 `gate` 로 넘김 — 정할 것 ㅇ): `remainingLessons = max(0, 최소 수업 수 − 이 단원 회차에서 끝낸 정규 수업 수)`, 최소 수업 수 = `max(배정 수업 수, 복사본 unit.min_lessons)`(3.2 — 쓰기 6단계 이상은 그 단계 level_specs 의 `frame.minLessons`). `remainingDays = max(0, 복사본 unit.min_days − 이 단원의 수업(정규 · 보강 · 연습 · 다시 하기)을 끝낸 서로 다른 학습일 수)`(12절 unit.min_days).
   - `judgeLessonStart(input, chosen: { level, ref, variant }, ctx: { seedThrough, placed })` → `{ ok: true, kind, resume?: sessionId, abort?: sessionId, variantRule: "profile" | "first_session" }` 또는 `{ ok: false, reason: "not_placed" | "beyond_seed" | "other_level" | "locked_unit" | "not_issued" | "unknown" }`. 규칙: 배치 전 영역 거부. `chosen.level > seedThrough` 거부(8절 '시드 범위 밖 단계의 수업을 열지 않는다'). 지금 단계가 아니면 거부(3.2 '지금 단계 안의 지난 수업'). 지금 단원보다 뒤 단원 거부(AC-2b). 보강 · 연습은 발급된 것만. 진행 세션과 같은 칸이면 `resume`. 다른 진행 세션이 있으면 `abort`(부르는 쪽이 확인을 받았을 때만 닫는다). 종류 — 지금 단원: 끝낸 적 없는 정규 · 알파벳 수업 `regular`, 끝낸 적 있음 `retry`, 보강 `remedial`, 연습 `practice`. 통과한 단원: 끝낸 적 있음 `retry`, 없음 `untried`. 변형 — `retry` 는 그 칸을 처음 끝낸 세션의 변형(`first_session`, 3.2 '다시 하기는 처음과 같은 변형'), 그 밖은 프로필 묶음(`profile`).
2. **`src/core/today/done.ts`**.
   - `todayDone({ today, sessions: { kind, status, learningDay }[], reviewDue, reviewDoneToday, noNewLessonPossible })` → `{ done, newLessonDone }`. 새 수업 = 정규 · 보강 · 연습 · 안 해 본 수업(정할 것 ㄴ — 회화는 목표 턴에 닿아 완료된 것, 1-나). 켜짐: 단계 평가 세션 하나를 그날 끝냄 · 또는 `noNewLessonPossible`(부모 확인 대기 · 다음 단계 준비 중 · 졸업 — 'AI 쉬는 중'은 1-나가 더함)이고 다시 하기 · 복습 하나를 끝냄 · 또는 새 수업 하나 이상을 끝냈고 (`reviewDue` 가 아니거나 복습을 끝냄). 학습일은 세션의 `learning_day`(끝낸 학습일, C56 (1)) — 그래서 3시 50분에 끝낸 수업은 전날이다(AC-N7).
   - `thisWeekDays({ today, learningDays })` → 오늘이 든 주(월요일 시작, 3.5)의 오늘까지 서로 다른 학습일 수. 학습일 글('YYYY-MM-DD')의 달력 요일로 주를 가른다. 서버는 그 영역에서 끝낸 세션(복습 포함)의 학습일을 넘긴다(정할 것 ㄴ).
   - 시험은 학습일을 P3a `learningDayOf(시각, TEST_SETTINGS app.timezone, app.day_start_hour)` 로 만들어 경계(23:50 · 0:10 · 3:50 · 4:10 · 일요일 · 월요일)를 지난다.
3. **`src/core/session/preview.ts`**.
   - `previewWordsOf({ lesson: { newWords, unitWords, preview }, metWords, knownWords, k, vocab })` → `{ word, meaningKo, example, added }[]`. 바탕: 새 단어가 있으면 수업 시드의 `preview`(3.3 첫 활동), 없으면(다지기 · 보강) 이 수업 `unitWords` 가운데 `knownWords` 에 없는 것을 앞에서 `k` 개(`k` = 복사본 unit.new_words_per_lesson, 뜻 · 예문은 `vocab(word)`). 더함: 이 수업 `unitWords` 가운데 `metWords` 에 없고 바탕에 없는 단어 전부(3.2 '아직 만나지 않은 단어를 첫 활동에 더해 보여 준다', AC-2f). `knownWords` 는 P12 전에는 빈 모음이다(정할 것 ㅁ).
   - `activitiesOf(area, content)` → 활동 목록(P5b 시드 보기의 '화면 차례' 표와 같은 차례): 읽기 미리보기 → 지문 → 문항 1..n, 쓰기 items 미리보기 → 문항 1..n · guided 미리보기 → 과제 → 문장 1..n · composition 미리보기 → 과제(쓰기 6단계 이상 첫 세션, 생각 꺼내기 · 초고는 P11), 말하기 미리보기 → 따라 말하기 낱말 → 문장 → 듣기 → 질문 → 그림 보고 말하기 → 발표. 회화는 빈 목록(1-나). P11 이 이 함수를 이어받아 활동을 채운다.
4. **홈 자료(`src/server/home/index.ts`)** `readHome(profileId, now)`:
   - 영역마다 `{ area, placed, level?, unit?, unitTopic?, unitCells: ("passed" | "current" | "upcoming")[5], knownWords, unitWords, recent: ("pass" | "miss" | "empty")[], talkTalks?: { done, min }, thisWeek, today, gate: "placement" | "needs_speaking" | null }`. 단원 칸은 그 단계 단원 1~5 의 unit_progress 통과 시각 · 트랙 단원으로(단원 0 알파벳이면 칸은 모두 남음, 주제 줄은 unit_specs). 단원 단어 수는 그 단원 unit_specs(시작 개정)의 낱말 수. 아는 단어는 vocab_progress `known` 이고 상태가 그 영역 몫(읽기 · 말하기 '알아봄', 쓰기 '씀', 회화 '말함', 3.2)인 단원 단어 수 — P12 전에는 0. 최근 성적은 이 단원 회차의 끝낸 정규 세션 최근 unit.recent_window 개의 점수가 unit.recent_score 이상이면 pass — P11 전에는 empty.
   - `starTotal`(star_ledger 합) · `parentDot`(확인 시각이 빈 parent_alerts 가 있음) · `displayName`.
   - 오늘 완료 입력: 오늘 학습일 = `learningDayOf(now, app.timezone, app.day_start_hour)`. `reviewDue` · `reviewDoneToday` 는 P12 전에는 거짓(다른 P 에 넘길 것).
   - 설정은 `getSettings` 한 번(app.* · unit.recent_window · unit.recent_score · 단원 복사본은 unit_progress 에서).
5. **목록 자료(`src/server/lesson-list/index.ts`)** `readLessonList(profileId, area, now)`:
   - 먼저 `closeStaleSessions(profileId, now)`: 그 프로필의 진행 세션 가운데 `kind ≠ placement` 이고 `started_at < now − session.resume_hours` 인 것을 `status = aborted`, `learning_day` = 그 시각의 학습일로(5절 전이 '진행 → 중단', 정할 것 ㄷ). 중단은 완료가 아니라 단원 횟수 · 성적 · 별에 들지 않는다.
   - 트랙 · 지금 단원 회차 unit_progress · 그 단계 다른 단원 회차(통과한 단원) · 수업 행(P7a `readLessonsOfUnit({ area, level, unit, startRevision: 그 회차의 start_revision })` 에서 프로필 묶음 변형 — 그 칸에 없으면 가장 낮은 변형, 정할 것 ㅂ) · 이 단계 세션 · `gate` 수를 모아 `lessonListState` 로.
6. **세션(`src/server/session/index.ts` · `src/server/actions/session.ts`)**.
   - `startLesson({ lessonId, confirmAbort })`: 첫 문장 `await requireAccess()`. 한 트랜잭션: 그 영역 profile_tracks 행 `FOR UPDATE`(두 기기 동시 시작을 줄 세움) → `closeStaleSessions` → lessonId 행에서 칸을 찾고 목록 입력을 다시 모아 `judgeLessonStart` → 거부면 `{ ok: false, reason }`(화면은 목록을 다시 그림). `abort` 가 있고 `confirmAbort` 가 아니면 `{ ok: false, reason: "needs_confirm" }`(아무것도 바꾸지 않음). 확인이면 그 세션을 `aborted`(learning_day = 지금 학습일 — 쓰기 6단계 초고는 attempts 에 그대로, P11 이 다시 채움). `resume` 이면 그 세션 id. 아니면 판을 고른다 — 지금 · 통과한 단원은 그 단원 회차의 `start_revision`, `retry` 는 그 칸을 처음 끝낸 세션의 `seed_revision`(같은 개정의 가장 높은 정정, 13절 시드 판 행) — 으로 P7a `readLessonsOfUnit` 를 읽어 (칸, 변형) 행 하나. 클라이언트가 보낸 lessonId 의 판이 낡았어도 서버가 고른 행을 쓴다(정정은 아직 하지 않은 수업에 바로, R5). sessions `{ profile_id, area, level, unit, lesson_id, kind, status: "in_progress", started_at: now, seed_revision, seed_correction }` 을 넣고 `{ ok: true, sessionId }`. 부분 유일 색인 위반(동시 시작)은 진행 세션을 다시 읽어 그것을 돌려준다(8절 '두 번째 기기는 이어 하고 새 세션을 만들지 않는다'). AI 를 가져오지 않는다(AC-1b).
   - `saveAttempts(batch)`: 첫 문장 `await requireAccess()`. 시도마다 그 프로필의 진행 세션인지 보고, attempts `{ session_id, client_attempt_id, activity_no, input, attempted_at: now, status: "done" }` 을 `onConflictDoNothing({ target: client_attempt_id })` 로(같은 id 는 한 번만, 8절). 받은 id 목록(이미 있던 것 포함)을 돌려준다. 끝나거나 닫힌 세션의 늦은 시도는 받은 것으로 치고 버린다.
   - `leaveSession({ sessionId, onFirstActivity })`: 첫 문장 `await requireAccess()`. 화면이 첫 활동이라고 보냈고 진행 세션에 시도가 하나도 없을 때만 세션 행을 지운다(5절 전이 '진행 → 지움', AC-2e). 둘째 활동에서 누른 '홈'이 대기열이 아직 못 보낸 첫 시도와 엇갈려 세션을 지우지 않게 두 조건을 함께 본다. 그 밖은 그대로(진행으로 남음).
   - `loadSessionView(sessionId, now)`(쪽이 부름): 그 프로필의 진행 세션이 아니면 없음(쪽이 목록으로 보냄). 수업 행 `content` 를 P4a `LESSON_SCHEMAS[area]` 로 풀고(진행 세션은 `lesson_id` 행을 끝까지, 5절), `activitiesOf`, 지금 활동 = 저장한 시도의 가장 큰 `activity_no` + 1(활동 수를 넘지 않음), 미리보기 단어(`metWords` = 이 영역의 다른 세션 미리보기 시도의 `shownWords` — 정할 것 ㄹ), 그림 정보(P10a 값 12 의 그림 꼴), 복사본 k.
7. **세션 화면(`session-frame.tsx`)**. 위 종이 띠(영역 색 · '<n>단계 · 단원 <u>' · 수업 제목 · 활동 점 · 오른쪽 작은 '홈'). 활동 1(미리보기)은 P5b `NewWordsPreview` 와 큰 '다음' — 누르면 시도 `{ activityNo: 1, input: { shownWords } }` 를 대기열에 넣고 다음 활동. 활동 2부터는 P5b 표시 컴포넌트(`ReadingPassage` · `ReadingQuestion` · `WritingItem` · `RepeatItem` · `ListeningItem` …, `reveal` 거짓)와 '다음'(시도 없음, P11 이 바꿈). 마지막 뒤 `/<영역>/lessons`. '홈'은 `leaveSession({ sessionId, onFirstActivity: 지금 활동이 1 인가 })` 뒤 `/`. 읽어 주기 · 소리 자리 동작은 P11.
8. **시도 대기열(`src/lib/attempt-queue.ts`)**. 순수 함수 `queueAdd(state, attempt)` · `queueAccept(state, ids)` · `queuePending(state)` 와 감싼 `createAttemptQueue({ storage, send })`. 시도는 `{ clientAttemptId: crypto.randomUUID(), sessionId, activityNo, input }`. localStorage 키 `momo.attempts.v1`(제안)에 쌓고 곧바로 보내며, 실패하면 남겨 `online` 이벤트와 다음 넣기 때 다시 보낸다(8절 '진행 중 세션의 답만 기기에 쌓는다'). localStorage 를 못 쓰면 메모리로만.
9. **크기 훑기(`tests/e2e/child-size.ts`)**. P5b e2e-local 의 훑기를 일반화: `[data-child-screen]` 안의 글(자기 글이 있는 요소)이 20px 이상, `lang="en"` 조상이 있으면 24px 이상, `button` · `a` · `[role=button]` · `[data-touch]` 는 상자 56 × 56px 이상이고 그 안의 이름표 글은 22px 이상(카드 꼴 단추 안의 보조 줄 — 단원 · 단어 수 · 최근 성적 · 이번 주 · 오늘 · 수업 제목 — 은 `data-size-guide` 표시로 안내 20px, C82 · fix 6), `[data-parent-info]` 안은 뺀다, '%' 없음, 가로 넘침 없음. 기준 수는 4절 잠정 값이라 이 파일 위 이름 붙인 상수(P5b 와 같은 값 · 같은 꼴)다.

### 정본 밖 문구(P10a '정본 밖 문구' 표에 더함 — 정할 것 ㅋ)

| 화면 | 자리 | 제안 문구 |
|---|---|---|
| 홈 | 제목 · 오늘 완료 · 별 · 부모 메뉴 | '<한글 이름>의 공부 보드'(목업 B_Home4) · '오늘 다 했어요'(목업) · '별 n개' · '부모'(목업, 1-가는 점만) |
| 홈 | 회화 카드 단추 | '이야기 고르기'(4절) — 누르면 C50 (1) 화면 |
| 수업 목록 | 지난 수업 단원 고르기 · 끝낸 표시 | '단원 n' · 끝낸 수업은 ✓ 그림(화면에 글 없음) + 읽기 도구용 숨은 글 '끝낸 수업'(review-p10-4-design ✓ 판정, 2026-10-18 컨트롤러 받음 · C72) |
| 수업 목록 | 하던 수업 확인 단추 | '새 수업 할래요' · '하던 수업 할래요' |
| 수업 목록 | 맨 위 차례의 단계 평가 이름 | '<n>단계 평가'(4절 세션 결과 'n단계 평가 보기'에서 '보기'를 뺀 꼴 — 자료는 P12 가 채움. 구현 보고 차례 4 의 표 밖 문구를 2026-10-17 컨트롤러가 받음, C72) |
| 홈 | 배치 전 카드 안내 · 마이크 닫힘 카드 되돌리기 | '단계를 몰라도 돼요. 짧은 문제로 찾아요'(내 단계 찾기 카드 아래) · '마이크를 켰으면 여기를 눌러 다시 확인해요'(마이크 닫힘 카드 아래, 1-가 임시 — 1-나 부모 화면 '마이크 다시 확인'이 생기면 뺌) — 요청자 프리뷰 시험 2026-10-18 02:xx, 컨트롤러 받음(C72) |
| 회화 준비 중 쪽 | 부모용 작은 글(1-가 개발 기간만) | '회화 수업은 다음 차수에 들어와요'(`data-parent-info`, 1-나에서 뺌) — 2026-10-18 컨트롤러(C72) |
| 수업 목록 | 뒷줄 이름표 · 잠긴 단원 읽기 | 뒷줄(다지기 수업) 앞 작은 이름표 '다지기'(정본 3절 용어, review-p10-4-design 앞뒤줄 경계 반영) · 조건 줄을 숨긴 잠긴 단원의 읽기 도구용 숨은 글 '잠긴 단원'(review-p10-fix3-design N-6) — 2026-10-18 컨트롤러 받음(C72) |
| 세션 틀 | 단추 | '다음' · '홈'(4절) |

## 작업 순서 (Order of work)

명령 꼴 · 시험 먼저 · 설정 숫자는 P10a 작업 순서 머리와 같다. 차례 번호는 P10a '화면을 보는 차례'다.

1. (차례 3) [검증] `tests/unit/today-done.test.ts` → `src/core/today/done.ts`. 완료: 단위 초록.
2. (차례 3) [서버][화면] `src/server/home/index.ts` · `src/app/(child)/page.tsx`(P10a 의 자리를 채움) · `home-cards.tsx` · `talk/page.tsx` → `tests/e2e/home.spec.ts`. 완료: e2e 초록, 검토 묶음 B1 → code-reviewer · design-reviewer(B_Home4 · B_Sticky 와 4절, 세로 · 가로 사진). **볼 수 있는 화면: 첫 실행 뒤 홈 카드 넷.**
3. (차례 4) [검증][서버][화면] `tests/unit/lesson-list-state.test.ts` → `src/core/lesson-list/state.ts` → `src/server/lesson-list/index.ts` · `[area]/lessons/*` → `tests/e2e/lesson-list.spec.ts` 의 목록 몫(AC-2b · 2d). 완료: 단위 · e2e 초록, 검토 묶음 B2 → code-reviewer · design-reviewer. **볼 수 있는 화면: 카드 → 수업 목록 · 지난 수업.**
   (차례 5 는 P10a 작업 5~7)
4. (차례 6) [검증][서버][화면] `tests/unit/session-preview.test.ts` · `tests/unit/attempt-queue.test.ts` → `src/core/session/preview.ts` · `src/lib/attempt-queue.ts` → `tests/integration/session-start.test.ts` → `src/server/session/index.ts` · `src/server/actions/session.ts` · `session/[id]/*` · `lesson-board.tsx` 에 시작 액션 · 확인 → `tests/e2e/lesson-list.spec.ts` 의 세션 몫(AC-2e · 2f). P10a 배치 화면의 보내기를 대기열로 합친다. 완료: 통합 · e2e 초록, 검토 묶음 B3 → code-reviewer · design-reviewer. **볼 수 있는 화면: 수업 → 새 단어 미리보기 → 활동 보기 → '홈'(첫 활동이면 지움) · '하던 수업 이어 하기'.**
5. (차례 7) [검증] 공용 변경 1 · 2 → `tests/e2e/child-size.ts` · `tests/e2e/font-size.spec.ts` → P10a 작업 8 과 함께 CI 순서 명령 · 화면 검토 다시(첫 실행 → 세션 시작 한 번에). 완료: 출력이 보고에 있고 missing-test 가 P10b 몫(AC-2a · 2b · 2d · 2e · 2f · 5c · N9)만큼 준다. **볼 수 있는 화면: 처음부터 끝까지.**

## 위험 · 제약 (Risks)

### 위험

| 번호 | 위험 | 깨질 수 있는 것 | 막는 법 · 되돌리기 |
|---|---|---|---|
| 1 | 홈 · 목록의 많은 칸(아는 단어 · 최근 성적 · 별 · 단어 익히기 · 보강 · 단계 평가)이 P11 · P12 가 채울 자료다 | 1-가 중간에 0 · 빈 칸으로 보여 요청자가 고장으로 본다 | 차례 8 안내에 '아직 채우지 않는 칸'을 적는다. 입력 형을 지금 정해 두어 P11 · P12 가 서버만 채운다(다른 P 에 넘길 것) |
| 2 | 잠긴 다음 단원 한 줄이 P10 에서는 수업 수 · 학습일만 안다 | 단어 · 성적이 막는데 '수업 n개' 줄이 사라지면 줄이 없다 | 정할 것 ㅇ. P12 의 판정 함수가 `wordsShort` · `scoreShort` 를 채운다. P10 동안은 끝낸 세션이 없어(P11 전) 늘 '수업 n개' 줄이다 |
| 3 | 재판정과 목록이 다른 함수면 화면에 보인 수업이 거부되거나 잠긴 수업이 열린다 | AC-2b | 같은 `ListInput` 으로 `lessonListState` 와 `judgeLessonStart` 를 한 파일에 둔다. 단위 시험이 '목록에서 고를 수 있는 것 = 재판정 통과'를 표로 맞댄다 |
| 4 | 두 기기 동시 시작 · 동시 중단 | 진행 세션 둘 · 잘못 닫힘 | 트랙 행 `FOR UPDATE` · 부분 유일 색인 · 위반이면 진행 세션을 돌려줌(통합 시험) |
| 5 | 판 고르기를 클라이언트가 보낸 lessonId 그대로 쓰면 정정이 진행 중 단원에 닿지 않는다(R5) | AC-17a 의 화면 몫 | 서버가 칸에서 다시 고른다(값 6). 진행 세션은 `lesson_id` 를 끝까지(5절) |
| 6 | 시험용 시드는 주제 변형이 1 하나뿐이다 | 묶음 2 를 고른 프로필의 수업이 없다 | 정할 것 ㅂ(가장 낮은 변형). AC-1c 의 '고른 묶음 변형'은 e2e 전용 복제(P10a 정할 것 서)로 본다 |
| 7 | 둘째 활동부터 보기만 하는 틀이 아이에게 '고장'처럼 보인다 | 요청자 혼란 | 개발 단계 화면이고 운영 배포는 1-나 뒤 한 번이다. P11 이 곧 바꾼다. 차례 8 안내에 적는다(정할 것 ㅈ) |
| 8 | 오래 멈춘 세션 닫기를 목록 요청 때만 하면 홈의 '하던 수업'이 늦게 사라진다 | 홈 표시가 하루 넘게 낡음 | 5절 글자대로 목록 요청 때. 홈은 진행 세션을 보이지 않는다(목록 맨 위만) |
| 9 | 마이크 상태가 브라우저 저장소라 시험 · 개발 기기에 남는다 | 말하기 카드가 닫힌 채 남음 | P10a 값 4 `clearMicState`. 1-나 '마이크 다시 확인' 전에는 저장소를 비우는 길을 개발 안내에 적는다 |
| 10 | 시도 대기열이 다른 세션 · 다른 기기의 시도를 섞는다 | 남의 세션에 시도 | 서버가 세션 소유 · 진행을 본다. 대기열 키는 기기 하나 |
| 11 | `[area]` 동적 경로가 `/first-run` · `/access` · `/dev` · `/talk` · `/session` 과 겹친다 | 경로 충돌 | 정적 경로가 먼저다(App Router 규칙). 영역 값은 넷만 받고 나머지는 notFound |
| 12 | P5b 표시 컴포넌트가 '읽어 주기' 자리를 그리지만 동작이 없다 | 소리 단추가 눌리지 않음 | P11 몫(장부 '소리 자리의 저절로 읽기와 다시 읽기'). P10 은 첫 활동의 단어 소리도 그리기만 |

### 정할 것(컨트롤러 — 보고와 같은 글자. P10a 의 가~서와 겹치지 않게 ㄱ~ㅎ)

| 번호 | 무엇 | 권함 | 13절 |
|---|---|---|---|
| ㄱ | AC-6a(닫았다 열면 같은 활동 · 같은 입력)의 Playwright 증명 자리 | P11 로 옮김(같은 입력이 있는 활동이 P11 에 생김). P10 은 AC 접두 없는 통합 시험 '세션 틀: 다시 열면 저장한 시도 다음 활동부터 이어진다'로 틀만 증명(접두를 붙이면 spec-trace 가 AC-6a 를 덮은 것으로 셈 — plan-p02 다-8 과 같은 까닭). 묶음 plan 증명 표 AC-6a 의 P 칸을 P11 로 | 아니오 |
| ㄴ | 오늘 완료 · 이번 주 n일이 세는 세션 | 새 수업 = 정규 · 보강 · 연습 · 안 해 본 수업(회화는 목표 턴에 닿은 완료). 이번 주 n일 = 그 영역 세션(복습 포함)을 하나 이상 끝낸 서로 다른 학습일(월요일 시작 주) | 아니오(해석) |
| ㄷ | 오래 멈춘 세션의 기준 시각 | `sessions.started_at`(5절 'session.resume_hours 가 지나도록 끝내지 않는다') | 아니오 |
| ㄹ | '그 단어는 그때 만난 것으로 기록한다'(3.2)의 자리 | 새 단어 미리보기 시도(attempts 활동 1 의 `input.shownWords`). P12 가 단어장(vocab_progress)에 넣을 때 같은 때 · 같은 자리에서 | 아니오 |
| ㅁ | 다지기 미리보기의 '아직 안다가 아닌'의 '안다' | vocab_progress `known`(P12 전에는 없음 → 앞에서 k 개) | 아니오 |
| ㅂ | 고른 묶음의 변형 칸이 없을 때 | 가장 낮은 변형으로 연다(시험용 작은 틀만 해당 — 운영은 완전성 검사로 늘 있다) | 아니오 |
| ㅅ | unit_progress.parent_check 의 '대기' 값 | `pending`(C56 (4) 가 P12 에 맡긴 값을 P10 이 먼저 읽음 — P12 가 같은 값을 쓴다) | 아니오 |
| ㅇ | 잠긴 단원 한 줄의 단어 · 성적 조건 | P12 판정 함수가 채울 때까지 비움 · P10 은 수업 수 · 학습일만 | 아니오 |
| ㅈ | 세션 틀의 둘째 활동부터 | P5b 표시 컴포넌트로 보기만 · '다음'(시도 없음) · 마지막 뒤 목록(진행으로 남음). P11 이 활동마다 바꿈 | 아니오 |
| ㅊ | 홈 부모 메뉴의 1-가 동작 | 점만 보이고 누를 수 없음(PIN 화면은 1-나, 묶음 plan 제약 '홈의 부모 메뉴 점은 1-가') | 아니오 |
| ㅋ | 정본 밖 문구(위 표) | P10a 정할 것 마 와 한 줄 | 예(P10a 마 와 함께) |
| ㅌ | 주소 꼴 | `/<영역>/lessons` · `/<영역>/lessons/past` · `/<영역>/placement` · `/session/<id>` · `/talk` · `/first-run` | 아니오 |
| ㅍ | 공용 시험 둘 넓히기(한 시계 정적 검사 · requireAccess 가져온 곳) | 차례 7 에 넣음(공용 변경 1 · 2) | 아니오 |
| ㅎ | 지금 단원이 다섯째일 때 잠긴 다음 단원 자리 | 비워 둠. 단계 평가 포스트잇 · '여기부터 해요'는 P12 | 아니오 |

### 제약

P10a '제약'과 같다. 더해서 — 아이 화면 문구는 4절에서 옮기고(위 표 밖은 정할 것 ㅋ), 한 화면 한 행동이다. 수업 목록 화면의 행동은 수업 하나 고르기뿐이다(4절). 홈 · 목록 서버 함수는 질의 SQL 에 `now()` 를 쓰지 않고 학습일 · 시각을 매개변수로 넘긴다.

### 다른 P 에 넘길 것

- P11: `activitiesOf` 를 이어받아 둘째 활동부터 상호작용 · 시도 저장(같은 대기열) · 채점(P10a 답 맞춤 · 조각) · 점수 · 세션 완료(`learning_day` = 끝낸 학습일) · 결과로 가기를 붙인다. AC-6a e2e(`tests/e2e/resume.spec.ts`, 정할 것 ㄱ). AC-2e 의 '6단계 초고 채움'. 목록 맨 위 '첨삭 보기'(`feedbackReady`)와 홈 '첨삭이 왔어요'(AC-2a). 소리 자리 동작. 'AI 쉬는 중'(1-나 전 1-가 안전 상한 안내, C50 (2))이 목록 · 시작 재판정에 닿는 자리.
- P12: `ListInput` 의 `gate.wordsShort` · `scoreShort` · `state`(practice · parent_check) · `remedialIssued` · `practice` · `reviewDue` · `levelTest` 를 채운다. 세션 결과의 '다음 수업'은 같은 `hereStart` 로(4절 세션 결과). 홈의 연속 학습 일수 · 복습 포스트잇 · 오늘 완료 복습 칸(`reviewDue` · `reviewDoneToday`) · 아는 단어 막대. 별 · '안 해 본 수업' 처음 끝냄 별(AC-2b '새 수업 셋 → 횟수 3 · 별 3', AC-2d 별 몫). 단어장 '만남'은 정할 것 ㄹ 의 자리에서.
- 1-나: 회화 카드의 친한 정도 · 오늘 이야기 제목 · 회화 수업 목록 · 세션. 'AI 쉬는 중' 카드 · 목록 표시. 부모 메뉴 → PIN 화면.
- P10a: 배치 화면의 답 보내기를 `src/lib/attempt-queue.ts` 로 합친다(차례 6).

## 증명 (Proof)

| 수용 기준 | 증명(시험 이름) | 파일 · 명령 |
|---|---|---|
| AC-1b(P10b 몫) | 통합 "AC-1b 세션을 여는 동안 AI 호출은 0회다(ai_calls 0행 · 세션 모듈이 AI 층을 가져오지 않음)" | `tests/integration/session-start.test.ts` |
| AC-2a(P10 몫) | e2e "AC-2a 홈의 영역 카드 4개에 단계 · 단원 5칸 · 진행 막대 둘 · 이번 주 n일 · 오늘 완료가 보이고 카드 · '시작!' · '이야기 고르기'는 수업 목록(배치 전은 배치 평가)으로 간다" · "AC-2a 부모 확인 대기 영역은 다시 하기 하나로, 단계 평가 세션 하나만 끝낸 영역도 오늘 완료가 켜진다"(DB 손질) + 단위 "AC-2a 오늘 완료: 새 수업과 그날 복습 · 할 수 있는 새 수업이 없는 날의 다시 하기 · 단계 평가 세션 하나로 켜지고 새 수업이 없으면 '오늘 아직이에요'다". 회화 친한 정도 · 제목 1-나, '첨삭이 왔어요' P11 | `tests/e2e/home.spec.ts` · `tests/unit/today-done.test.ts` |
| AC-N7(P10 몫) | 단위 "AC-N7 오늘 완료: 새벽 3시 50분에 끝낸 새 수업은 전날의 오늘 완료를 켠다" · "AC-N7 이번 주 n일: 밤 11시 50분과 0시 10분은 같은 학습일, 4시 10분은 다음 학습일로 세고 월요일에 새 주가 된다" | `today-done.test.ts` |
| AC-2b(P10 몫) | 단위 "AC-2b 수업 목록: 지금 단원의 남은 수업 가운데 셋째 것을 먼저 고를 수 있고 다음 단원은 통과 전에는 고를 수 없다" + 통합 "AC-2b 잠긴 다음 단원의 lesson_id 로 세션 시작 서버 액션을 직접 부르면 거부된다" + e2e "AC-2b 홈의 읽기 포스트잇을 누르면 세션이 아니라 읽기 수업 목록이 열리고 셋째 수업을 먼저 고를 수 있으며 다음 단원 묶음은 눌러도 열리지 않는다". '새 수업 셋 → 횟수 3 · 별 3'은 P12 | `tests/unit/lesson-list-state.test.ts` · `session-start.test.ts` · `tests/e2e/lesson-list.spec.ts` |
| AC-2d(P10 몫) | 단위 "AC-2d 수업 목록 첫 화면: 지금 단원 묶음(배정 앞줄 · 다지기 뒷줄) · 잠긴 다음 단원 한 장 · '지난 수업 다시 하기' 한 장만" · "AC-2d 하던 수업 · 첨삭 보기 · 보강이 함께 있으면 '여기부터 해요'는 하던 수업 하나에만 붙는다" · "AC-2d 잠긴 다음 단원은 남은 조건 하나를 한 줄로 — 학습일만 모자라면 '내일 이 단원 수업을 또 하면 열려요(앞으로 n일)'" · "AC-2d 통과한 단원에서 하지 않은 수업은 '안 해 본 수업' 표시로 열린다" + e2e "AC-2d 수업 포스트잇마다 번호와 한국어 제목이 있고 '여기부터 해요'는 하나다". 단어 익히기 '복습하기' · 단계 평가 맨 위 · 별은 P12 | `lesson-list-state.test.ts` · `lesson-list.spec.ts` |
| AC-2e(P10 몫) | 통합 "AC-2e 진행 중 세션이 있는 영역에서 다른 수업을 고르면 확인을 요구하고, 확인 뒤 이전 세션이 중단으로 닫히며 진행 중 세션은 하나만 남고 중단 세션은 완료 수에 들지 않는다" · "AC-2e 세션 첫 활동에서 '홈'을 누르면 그 세션 행이 남지 않는다" + e2e "AC-2e 하던 수업이 있을 때 다른 수업을 고르면 '하던 수업은 처음부터 다시 해야 해요. 새 수업을 할까요?'를 묻는다". 6단계 초고 채움은 P11 | `session-start.test.ts` · `lesson-list.spec.ts` |
| AC-2f(P10 몫) | 단위 "AC-2f 배정 수업 8을 하지 않은 채 다지기 수업 9를 고르면 수업 8 의 새 단어 가운데 수업 9 에 나오는 단어가 첫 활동에 더해진다" · "AC-2f 배정 수업 3을 하지 않고 배정 수업 4를 고른 경우도 같고 이미 만난 단어는 더하지 않는다" + e2e "AC-2f 앞 배정 수업을 하지 않고 뒤 수업을 고르면 새 단어 미리보기에 앞 수업의 새 단어가 더해 보인다"(작은 틀: 배정 1 을 건너뛴 배정 2). 1단계 회화 몫은 1-나 | `tests/unit/session-preview.test.ts` · `lesson-list.spec.ts` |
| AC-5c(P10 몫) | e2e "AC-5c 음성 인식 API 가 없는 브라우저와 마이크 권한을 거부한 기기에서 홈을 열면 말하기 · 회화 카드에 '마이크가 필요해요. 부모님께 말해 주세요'가 보이고 눌리지 않으며 읽기 · 쓰기 카드는 열린다" · "AC-5c 말하기 배치 전이어도 회화 카드에 같은 문구가 보이고 audio-capture 한 번으로는 닫히지 않으며 인식 API 가 없던 기기는 홈 진입마다 다시 확인한다". 세션 도중 거부 P11, 부모 화면 1-나 | `home.spec.ts` |
| AC-N9(P10 몫) | e2e "AC-N9 아이 화면(접근 코드 · 홈 · 수업 목록 · 지난 수업 · 회화 준비 중 · 배치 평가 시작 · 문항 · 결과 · 세션 틀)의 안내 20px · 영어 24px · 버튼 글자 22px 이상, 누르는 곳 56px 이상, '%' 가 없고 세로 820 · 가로 1180 에서 가로 넘침이 없다" | `tests/e2e/font-size.spec.ts` · `tests/e2e/child-size.ts` |
| 세션 틀(AC 접두 없음) | 통합 "세션 틀: 같은 client_attempt_id 는 한 번만 저장된다" · "세션 틀: 다시 열면 저장한 시도 다음 활동부터 이어진다" · "세션 틀: session.resume_hours 가 지난 진행 세션은 수업 목록 요청 때 중단으로 닫히고 배치 평가는 닫히지 않는다" · "세션 틀: 두 번째 기기에서 같은 영역을 열면 진행 중 세션을 이어 하고 새 세션을 만들지 않는다" · "세션 틀: 판은 그 단원 회차의 시작 개정으로 고르고 다시 하기는 처음 쓴 개정의 가장 높은 정정과 처음 변형으로 연다" · "세션 틀: seed.complete_through_level 보다 높은 단계와 다른 단계의 수업은 열지 않는다" + 단위 "세션 틀: 보내지 못한 시도는 기기에 쌓였다가 다시 보내고 받은 id 는 지운다" | `session-start.test.ts` · `lesson-list.test.ts`(session.resume_hours 몫 — review-p10-4-code 4절 ⑥) · `tests/unit/attempt-queue.test.ts` |
| 공통 | P10a 증명 '공통' 줄과 같은 명령 · CI. missing-test −7(AC-2a · 2b · 2d · 2e · 2f · 5c · N9). 공용 변경 1 · 2 의 시험 초록 | P10a 작업 8 · 이 plan 작업 5 |

## 완료 보고 (Done)

채움: 문서 반영 편집자 2026-10-18 06:4x(브리프 `task-p10-done-edit.md`). **커밋 78db3a2**(가지 `feature/1a-p10-first-run-home` — P10a 와 같은 가지 · 같은 워크트리). 흐름 · 커밋 · CI · 로컬 관문 · 공용 파일 · PR 은 plan-p10a 완료 보고의 같은 이름 절에 있다. 마지막 CI 는 11차 run 39070194023 전부 성공(통합 · e2e 49 · e2e-local)이고, 로컬 관문은 단위 367 · tsc 0 · biome 0 이다. 이 plan 의 검토는 B1(차례 3 · fix 2) · B2(차례 4 · fix 3) · B3(차례 6 — `review-p10-5-6-code.md` · `review-p10-fix5-code.md`) · 마무리(`review-p10-7-code.md`)다.

### 실제 바뀐 파일(※ = 계획과 다름)

계획 표의 손 파일 스물다섯(새 24 · P10a 자리를 채운 `(child)/page.tsx` 하나)은 모두 있다.

| 파일 | 신규 / 수정 | 실제 |
|---|---|---|
| `src/core/today/done.ts` · `tests/unit/today-done.test.ts` | 신규 | `todayDone` · `thisWeekDays` · `weekStartOf`. ※ '이번 주 n일'은 배치 평가 세션도 센다(fix 2) |
| `src/server/home/index.ts` | 신규 | `readHome`. ※ 아는 단어 · 최근 성적 · 끝낸 대화는 실제 질의로 센다(지금은 행이 없어 0 · 빈 칸, P11 · P12 가 행을 넣으면 채워짐). 회화 '끝낸 대화'의 최소 수는 단원 복사본 unit.min_lessons |
| `tests/integration/home.test.ts` | ※ 신규 | 홈 자료(배치 전 · 단원 칸 · 오늘 완료 · 이번 주 · 배치 세션 셈) |
| `src/app/(child)/page.tsx` | 수정(P10a 자리) | ※ 부모 꼬리표를 종이 띠 안으로(세로 820 한 화면) · 점은 먹색 |
| `src/app/(child)/home-cards.tsx` | 신규 | ※ 카드 전체가 링크 하나이고 안의 글이 읽히는 이름 · 판정 전 말하기 · 회화 카드는 링크 없는 틀 · 배치 전 카드 안내 한 줄 · 닫힌 말하기 카드 아래 '다시 확인' 단추(1-가 임시) · 보조 줄 `data-size-guide`(C82) · 판정 끝 표시 `data-hydrated`(fix 7) |
| `src/app/(child)/talk/page.tsx` | 신규 | ※ 부모용 작은 글 '회화 수업은 다음 차수에 들어와요'(1-가 임시) |
| `tests/e2e/home.spec.ts` | 신규 | AC-2a 둘 · AC-5c 둘. ※ AC-5c 둘째는 `audio-capture` 대본으로 두 절을 증명(fix 2) · 가짜 음성은 `speechPage` 도우미로(fix 4) |
| `tests/fixtures/speech/scripts/audio-capture.json` | ※ 신규 | 첫 실행 마이크 확인이 audio-capture 한 번으로 실패하는 대본(fix 2) |
| `src/core/lesson-list/state.ts` · `tests/unit/lesson-list-state.test.ts` | 신규 | `lessonListState` · `pastUnits` · `judgeLessonStart`. ※ 입력 · 출력을 더함(아래 '계획과 다르게 한 것' 5) · 잠긴 줄 수 규칙을 순수 함수 `minLessonsOf` · `unitGateOf` 로 뺌(fix 3 M-1) |
| `src/server/lesson-list/index.ts` | 신규 | `closeStaleSessions` · `readLessonList`. ※ 읽기가 트랜잭션도 받음(`DbOrTx`, fix 5 M-1) |
| `tests/integration/lesson-list.test.ts` | ※ 신규 | 목록 자료 · 잠긴 줄 수 · 쓰기 6단계 `frame.minLessons` · '세션 틀: session.resume_hours …'(증명 표 파일 칸은 `session-start.test.ts` 로 적혀 있음 — review-p10-4-code 4절 ⑥) |
| `src/app/(child)/[area]/lessons/page.tsx` · `lesson-board.tsx` | 신규 | ※ '여기부터 해요'는 두 칸 너비 · 뒷줄 이름표 '다지기' · 끝낸 수업 ✓ 와 숨은 글 '끝낸 수업' · 조건 줄 없는 잠긴 단원의 숨은 글 '잠긴 단원' · 가로는 오른쪽 칸에 잠긴 단원 · 지난 수업(카드 최소 112px) · 수업 제목 `data-size-guide` · 화면 준비 끝 표시 |
| `src/app/(child)/[area]/lessons/use-lesson-start.ts` | ※ 신규 | 수업 고르기 → `startLesson` · 확인 쪽지 · 오류 줄(C72 저장 문장 · 7절 끊김 문장) · 같은 그리기 안 두 번 누름 막기(fix 5) |
| `src/app/(child)/[area]/lessons/past/page.tsx` | 신규 | 단원 고르기 → 수업 고르기(안 해 본 수업 표시) |
| `src/app/(child)/[area]/lessons/past/past-lessons.tsx` | ※ 신규 | 지난 수업 고르기(같은 시작 길) · 제목 `data-size-guide` |
| `tests/e2e/lesson-list.spec.ts` | 신규 | AC-2b · 2d · 2e · 2f 와 지난 수업 · 주소 돌려보내기 · 부모 확인 안내 · 확인 쪽지 초점. ※ AC-2f 는 '배정 1 · 2 를 건너뛴 다지기' |
| `src/core/session/preview.ts` · `tests/unit/session-preview.test.ts` | 신규 | 계획대로 |
| `src/lib/attempt-queue.ts` · `tests/unit/attempt-queue.test.ts` | 신규 | ※ `online` 대상을 주입 받음(`onlineTarget`) · 배치는 이 대기열을 쓰지 않음 |
| `src/server/session/index.ts` · `src/server/actions/session.ts` | 신규 | ※ 재판정 입력은 `readLessonList` 를 그대로 부름 · 목록 읽기도 `profile_tracks` 행 잠금 트랜잭션 안(fix 5 M-1) · 남의 · 끝난 세션의 시도는 '받음'으로만 · 세션 자료에 정답 칸까지 실음 · 유일 위반은 `safe-error.ts` 의 `isUniqueViolation`(차례 7) |
| `src/app/(child)/session/[id]/page.tsx` · `session-frame.tsx` | 신규 | 계획대로(둘째 활동부터 보기만 · 마지막 뒤 수업 목록) |
| `tests/integration/session-start.test.ts` | 신규 | 증명 표 이름 그대로 아홉. ※ '세션 틀: 다시 열면 …'은 CI 4차까지 가려진 실패였고 다지기 번호를 DB 에서 읽게 고침(fix 5 I-2) |
| `tests/e2e/session.spec.ts` | ※ 신규 | 세션 틀 e2e 둘(진행 세션을 넣고 주소로 엶 — 첫 활동 미리보기 · 첫 활동 '홈'이면 지움) |
| `tests/e2e/child-size.ts` | 신규 | ※ `data-size-guide` 안쪽 보조 줄은 20px(C82 · fix 6) · `data-size-exempt` 안쪽은 뺌(plan-p11a 위험 9 가 쓸 표시) |
| `tests/e2e/font-size.spec.ts` | 신규 | AC-N9 하나 — 접근 코드 · 홈 · 회화 준비 중 · 수업 목록 · 지난 수업 · 세션 틀 · 배치(시작 · 쓰기 타일 · 읽기 그림 고르기 · 마이크 안내 · 따라 말하기 · 예비 문항 · 결과), 세로 · 가로 |

공용 변경:

| # | 파일 | 실제 |
|---|---|---|
| 1 | `tests/unit/learning-day.test.ts`(P3a) | 계획대로 — 한 시계 검사가 `src/app` 가운데 첫 문장이 `'use client'` 가 아닌 파일까지 본다 |
| 2 | `tests/unit/access-gate.test.ts`(P3b) | 계획대로 — 같은 이름 지역 함수 · guard 밖 모듈의 `requireAccess` 를 잡는다. ※ 기본 가져오기 · guard 다른 함수의 별칭은 못 잡는다(review-p10-7-code M-4 → ledger-open) |
| 3 | `tests/fixtures/settings.ts` | P10a 공용 변경 4 와 같은 줄 |

세션 시작이 트랜잭션을 넘기려고 고친 공용 파일(`src/server/db/index.ts` · `settings/index.ts` · `seed/read.ts`)은 plan-p10a '공용 파일' 표에 있다.

### 계획과 다르게 한 것

1. **AC-6a 의 Playwright 증명은 P11 이다**(정할 것 ㄱ · C70). P10 은 접두 없는 통합 '세션 틀: 다시 열면 저장한 시도 다음 활동부터 이어진다'로 틀만 본다. 메인 묶음 plan 증명 표의 AC-6a P 칸은 이미 P11 이다.
2. **값 9 문장을 C82 로 고쳤다**(컨트롤러 2026-10-18 06:0x). '버튼 글자 22px'는 이름표에 걸고, 카드 꼴 단추 안 보조 줄(단원 · 단어 수 · 최근 성적 · 이번 주 · 오늘 · 수업 제목)은 `data-size-guide` 표시로 안내 20px 로 잰다. CI 9차 AC-N9 26건 뒤의 결정이고 글자 크기는 바꾸지 않았다.
3. **'이번 주 n일'은 배치 평가 세션을 끝낸 날도 센다**(정할 것 ㄴ 해석, 컨트롤러 결정 — review-p10-3-code M-2 → fix 2). 오늘 완료는 4절대로 배치를 세지 않는다.
4. **지금 단원을 통과한 상태의 목록 해석**(다음 단계 준비 중 · 졸업 · 단계 평가 대기 · 부모 확인 대기, 컨트롤러 2026-10-18 00:1x — review-p10-4-code I-1 → fix 3). 안 한 수업은 '안 해 본 수업'(untried), 끝낸 수업은 다시 하기(retry)다. 잠긴 다음 단원 칸은 남기고 조건 줄만 숨긴다. '여기부터 해요'는 하던 수업 → 첨삭 보기 → 단계 평가 차례이고 지금 단원의 새 수업은 가리키지 않는다. P12 가 이 상태를 만들 때 같은 규칙이다.
5. **순수 함수 입력 · 출력을 더했다**(review-p10-4-code 4절 받아들임). `ListInput.roundStartedAt`(세션 행에 회차가 없음) · `currentPassed`(fix 3) · 거부 까닭 `paused`(부모 확인 대기에만 — fix 3 에서 좁힘) · 다시 하기의 `firstVariant` · `firstRevision` 이다. '이 회차에서 끝냄'은 끝낸 시각으로 가른다(홈과 같게, fix 3 M-3).
6. **AC-2f e2e 는 '배정 1 · 2 를 건너뛴 다지기'로 본다.** 시험용 시드는 배정 2 의 단원 단어에 배정 1 의 새 단어가 없다. 단위 둘은 plan 글자 그대로다(배정 8 → 다지기 9 · 배정 3 → 4). P8 실시드 뒤 원안(배정 1 을 건너뛴 배정 2)으로 다시 본다.
7. **시도 대기열은 세션 첫 활동만 쓴다.** P10a 배치 화면은 대기열로 합치지 않았다(값 8 · 'P10a 에 넘길 것', review-p10-5-6-code 4절 받아들임).
8. **세션 시작 재판정은 목록 자료 함수 `readLessonList` 를 그대로 불러 입력을 모은다**(위험 3). 목록 읽기도 `profile_tracks` 행 잠금과 같은 트랜잭션 안에서 한다(fix 5 M-1).
9. **`saveAttempts` 는 남의 · 끝난 세션 시도도 '받음'으로 돌려주고 넣지는 않는다**(대기열이 비게). 세션 화면 자료에는 정답 칸까지 싣는다(P11 '틀리면 정답을 보여 주고 다시').
10. **홈 꼴.** 비활성 카드는 흐림 대신 영역 색 45% 바탕 · 먹색 글이다(대비 11.18:1 · 12.56:1, review-p10-3-design H-I1 → fix 2). 부모 꼬리표는 종이 띠 안이고 점은 먹색이다(목업 #8A6134 의 2.70:1 → 7.00:1, 목업에서 벗어남).
11. **수업 목록 꼴.** 가로 화면은 오른쪽 칸에 잠긴 단원 · 지난 수업을 두고 카드 최소 너비 112px · 잠긴 칸 200~240px 다(12 · 15장 흉내 한 화면). 확인 쪽지는 `showModal()` 대신 키 처리로 초점을 가두고 덮개 전체가 쪽지다(board.tsx 는 훅 없음, fix 4 · 5).
12. **정본 밖 문구를 더했다**(C72 표에 받음). '끝낸 수업' · '<n>단계 평가' · '단계를 몰라도 돼요. 짧은 문제로 찾아요' · '마이크를 켰으면 여기를 눌러 다시 확인해요'(1-가 임시) · /talk 부모용 '회화 수업은 다음 차수에 들어와요'(1-가 임시) · '다지기' · '잠긴 단원'이다.
13. **세션 e2e 는 새 파일 `tests/e2e/session.spec.ts`** 이고, 목록에서 여는 길은 `lesson-list.spec.ts` 에 있다.

### 안 한 것(계획에 있었음)

1. **B3(세션 틀) 화면 검토와 차례 7 '화면 검토 다시'가 없다**(재부팅 뒤). 배치 전 카드의 누를 곳 표시(review-p10-3-design H-M6)도 그 검토에서 보기로 했다.

### 테스트 결과

- 증명 표의 시험 이름 서른은 모두 78db3a2 에 있다(편집자 대조).
- P10b 몫 AC(AC-1b 통합 · 2a · 2b · 2d · 2e · 2f · 5c · N7 · N9)는 모두 시험이 있고 CI 11차에서 초록이다.
- AC-N9 는 CI 9차에 '20px < 22px' 26건(홈 카드 보조 줄 · 수업 카드 제목)으로 실패했다. C82 · fix 6 뒤 CI 10차 · 11차에서 통과했다. 마이크 안내 · 따라 말하기 · 예비 문항 화면 훑기는 fix 7 이 더했다.
- 화면 검토: 홈(B1) · 수업 목록(B2) 지적은 fix 2 · fix 3 재검토에서 모두 ADDRESSED 다(마이크 닫힘 문구 대비 11.18:1 · 부모 점 7.00:1 · 12 · 15장 흉내 한 화면).
- CI · 로컬 관문 표는 plan-p10a 완료 보고에 있다.

### 남긴 것

- **P11**: `activitiesOf` 를 이어받아 둘째 활동부터 상호작용 · 시도 저장 · 채점 · 점수 · 세션 완료 · 결과로 가기 · 소리 자리 동작, AC-6a e2e(다른 P 에 넘길 것). 목록 '첨삭 보기' · 홈 '첨삭이 왔어요'(P11b). 대기열이 서버의 묶음 전체 거부에서 비지 않는 것 — 나눠 보내기 · 꼴 틀린 시도 버리기(review-p10-5-6-code M-2, ledger-open). `data-size-exempt` 표시를 지문 안 낱말 단추에 단다.
- **P12**: `ListInput` 의 `gate.wordsShort` · `scoreShort` · `state`(practice · parent_check) · `remedialIssued` · `practice` · `reviewDue` · `levelTest` 를 채운다. 통과한 지금 단원 해석은 위 4 그대로다(ledger-open). 홈의 아는 단어 · 최근 성적 · 끝낸 대화 칸(지금 0 · 빈 칸) · 별 · 연속 학습 일수 · 복습 포스트잇.
- **1-나**: 부모 꼬리표를 누를 수 있게 되면 56px 이상(지금 48px). 홈 '다시 확인' 단추와 /talk 부모 글은 1-나 부모 화면 때 빼거나 바꾼다. 회화 카드 · 회화 수업 · 'AI 쉬는 중'. 모두 ledger-open · C72 표.
- **요청자 시각 결정**: 홈 영역 아이콘(목업 B_Home4 에 있고 구현에 없음 — review-p10-3-design H-M5, ledger-open).
- **P8 실시드 뒤**: 수업 목록 세로 15장에 하던 수업 · 보강이 더해지면 세로로 넘칠 수 있다(review-p10-fix3-design 메모). AC-2f e2e 원안. 모두 ledger-open.
- **재부팅 뒤**: B3 세션 틀 화면 검토 · 사진 · 배치 전 카드 누를 곳 표시(H-M6).

### PR

plan-p10a 완료 보고 'PR' 과 같다. PR #1 · #2 는 78db3a2 뒤 닫았다.
