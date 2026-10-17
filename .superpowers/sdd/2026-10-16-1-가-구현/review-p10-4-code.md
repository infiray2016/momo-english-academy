# 코드 검토 보고: P10 차례 4 수업 목록 — 검토 묶음 B2 코드 몫(rev-p10, 2026-10-18 00:2x)

**판정: Changes requested** — Critical 0 · Important 1 · Minor 4.

범위와 기준:
- 브리프 `task-p10-review-4-code.md` 의 차례 4 파일 여덟을 봤다.
- 기준은 plan-p10b(값 1 · 값 5 · 정할 것 ㄷ · ㅂ · ㅅ · ㅇ · ㅌ · ㅎ · 위험 2 · 3 · 8 · 11) · 정본 4절 수업 목록 표 · 3.2 수업 목록 · 다시 하기 · 안 해 본 수업 · 단계 평가 · 다음 단계가 아직 없을 때 · 5절 전이 · 8절 오래 멈춘 세션이다.
- 화면 · 문구는 des-p10 몫이라 코드 쪽만 적었다. fix 2 는 넣지 않았다.

재현(워크트리 파일은 고치지 않음, 막힌 포트는 건드리지 않음, e2e 는 돌리지 않음):
- 스크래치패드 복사본 `scratchpad/rev-p10-4/copy` 에서 했다. 비밀 파일 · `.dev` 를 뺐고 node_modules 는 링크다. 바탕 실행은 단위 7 · 통합 4 모두 통과였다.
- 변이 표본 열: 순수 함수 넷 · 서버 여섯을 하나씩 망가뜨리고 `tests/unit/lesson-list-state.test.ts` · `tests/integration/lesson-list.test.ts` 를 돌렸다(3절 M-1 표).
- 남은 프로세스 · 임시 폴더 0.

## 1. 설계 준수

| 항목 | 판정 | 근거 |
|---|---|---|
| 지금 단원 묶음: 앞줄 발급된 보강 → 배정 · 알파벳(번호 차례), 뒷줄 다지기 · 끝냄 · 하던 중 | ✅ | `src/core/lesson-list/state.ts`:196-208. 단위 AC-2d 첫 화면 |
| 맨 위 차례: 하던 수업 → 첨삭 보기 → 단계 평가(있는 것만) | ✅ | `state.ts`:210-223 |
| '여기부터 해요' 여덟 단계 차례 · 한 화면 하나 | ✅ | `state.ts`:227-249. 단위 AC-2d '하던 수업 · 첨삭 · 보강'과 e2e AC-2d 가 하나임을 단언 |
| 잠긴 다음 단원 한 줄(수업 수 → 학습일 → 단어 → 성적 맨 앞 하나) · 남은 조건 없으면 줄 없음 · 다섯째 단원 자리 비움(ㅎ) | ✅ | `state.ts`:186-193 · 259-262 |
| 단어 익히기(practice)면 한 줄을 다시 쓰지 않음(값 1 · 4절 단어 익히기 행) | ❌ **M-2** | `state.ts`:259-262 는 상태를 보지 않는다 |
| 지난 수업 한 장 · `pastUnits` retry/untried | ✅ | `state.ts`:263 · 280-290. 단위 · e2e '안 해 본 수업' |
| 안내 둘(부모 확인 대기는 묶음 자리 · 다음 단계 준비 중은 맨 위) | ✅ | `state.ts`:253-268 · `lesson-board.tsx`:218-246 |
| `judgeLessonStart` 거부 여섯 · resume · abort · 종류 다섯 · 변형 규칙(retry 는 first_session) | ✅ | `state.ts`:321-392. 단위 '세션 틀: 목록에서 고를 수 있는 …'이 거부 까닭마다 단언 |
| 거부 까닭 `paused`(다르게 한 것 ①) | ❌ **I-1** | 다음 단계 준비 중 · 졸업에서 정본 3.2 와 어긋나고 위험 3 이 깨진다 |
| 위험 3 '목록에서 고를 수 있는 것 = 재판정 통과'를 단위가 맞댐 | ⚠️ 보통 상태만 | `tests/unit/lesson-list-state.test.ts`:278-302. 다음 단계 준비 중은 맞대지 않는다(I-1) |
| `closeStaleSessions`: 프로필 전체 · 배치 아님 · started_at < now − resume_hours · aborted · learning_day = 지금 학습일 | ✅ | `src/server/lesson-list/index.ts`:66-99. 단계 평가도 닫는 것은 5절 :59 · 8절 :69 가 배치만 빼므로 맞다. 통합이 배치 · 덜 지난 세션이 남음을 단언 |
| gate 수: 최소 수업 수 = max(배정 · 알파벳 수, 복사본 unit.min_lessons), 쓰기 6단계 이상 frame.minLessons · remainingDays = unit.min_days − 이 회차 서로 다른 학습일(정규 · 보강 · 연습 · 다시 하기) | ✅(시험 빈틈 M-1) | `index.ts`:246-303 |
| 변형이 없으면 가장 낮은 변형(ㅂ) | ✅ | `index.ts`:102-133. `readLessonsOfUnit` 이 칸 · 변형마다 한 행이라(`src/server/seed/read.ts`:52-80) 개정 섞임이 없다. 통합이 묶음 2 → 변형 1 을 단언 |
| parent_check `pending`(ㅅ) · 단어 · 성적 조건 비움(ㅇ) | ✅ | `index.ts`:283-310 |
| 시작 개정으로 읽기(장부 :31 · :41) | ✅ | `index.ts`:193-208 — 칸마다 그 단원 가장 늦은 회차의 `startRevision` |
| `server-only` · now 주입 · SQL 안 now() 없음 | ✅ | `index.ts`:1 · 76-96 |
| 질의 수 | ✅(관찰) | 프로필 · 설정 · 닫기 · 트랙 · 회차 · 단원마다 수업(≤5) · 세션 · (쓰기 6+ 규격) ≈ 12 |
| `[area]` 넷만 · 그 밖 notFound · 회화 `/talk` · 프로필 없음 `/first-run` · 배치 전 `/<area>/placement` | ✅ | `src/app/(child)/[area]/lessons/page.tsx`:11-20 · `past/page.tsx`:27-40. e2e 가 `/music/lessons` 404 · 회화 · 배치 전을 단언 |
| 접근 쿠키 없는 요청 | ✅ | `src/proxy.ts`:15 · 52-54 · 61-63(B1 과 같음) |
| 'use client' 경계 | ✅ | `lesson-board.tsx` 는 `ListView` · 제목 사전만 받고 core 형만 `import type` 한다 |
| `SESSION_START_OPEN` · 확인 쪽지가 아무것도 바꾸지 않음 | ✅ | `lesson-board.tsx`:32 · 106-115 · 279-290 — 고른 표시만 바꾼다 |
| `?unit=n` 검증 | ✅ | `past/page.tsx`:41-46 — 통과한 단원이 아니면(NaN 포함) 지난 수업 첫 쪽으로 되돌린다 |
| 시험 이름(plan 증명 표 글자 그대로) | ✅ | 단위 AC-2b 1 · AC-2d 4 · e2e AC-2b · AC-2d. '세션 틀: resume_hours …'은 이름 그대로 통합 파일에 있다(다르게 한 것 ⑥) |
| e2e 가 DB 도우미로 상태를 만듦 | ✅ | `tests/e2e/lesson-list.spec.ts` 가 `insertHousehold` · `insertSessions` 와 회차 · 트랙 손질(통과 단원 · 하던 수업 · parent_check)을 쓴다 |

## 2. 잘한 점

- **목록과 재판정이 한 파일 · 같은 입력이다.** 위험 3 의 막는 법을 그대로 따랐다. 단위 시험이 목록에 나온 칸 전부를 재판정에 넣어 통과를 본다.
- **판 고르기가 시작 개정을 지킨다.** 지난 단원은 그 단원 회차의 `startRevision` 으로 읽어, 정정이 진행 중이던 단원의 판을 바꾸지 않는다(R5).
- **오래 멈춘 세션 닫기가 5절 글자 그대로다.** 프로필 전체 · 배치 제외 · 지금 학습일. 통합이 세 갈래(닫힘 · 배치 남음 · 덜 지남 남음)를 한 시험에서 본다.
- **주소 검증이 단단하다.** 영역 넷 밖은 404, `?unit=` 은 통과한 단원만 받는다.

## 3. 지적

### Critical
없음.

### Important

**I-1. `paused` 가 '다음 단계 준비 중' · '졸업'에서 통과한 지금 단원의 안 한 수업을 막는다. 그런데 목록은 그 수업을 고를 수 있게 내놓는다.**
- 무엇이:
  - `judgeLessonStart` 는 지금 단원(`ref.unit === input.unit`)의 끝내지 않은 수업을 `PAUSED_STATES`(parent_check · next_level_pending · graduated)에서 `paused` 로 거부한다(`state.ts`:363-365).
  - 그러나 `lessonListState` 는 next_level_pending · graduated 에서 `current` 묶음을 그대로 낸다(:253-256). 화면은 그 칸을 모두 누를 수 있는 포스트잇으로 그린다(`lesson-board.tsx`:117-159 · 231-241).
  - 단위 '세션 틀: 부모 확인 대기 · 다음 단계 준비 중이면 …'(:398-431)은 이 거부를 옳은 동작으로 못 박는다. 위험 3 맞대기(:278-302)는 보통 상태만 본다.
- 왜(정본):
  - 다음 단계 준비 중은 단계 평가를 통과한 상태다. 그래서 지금 단원(다섯째)도 통과한 단원이다(3.2 `specs/02-1-영역-단원-승급.md`:107 '통과를 기록하고 … 단계 숫자는 그대로 … 다시 하기와 다른 영역은 그대로 열린다').
  - 통과한 단원의 안 한 수업은 '안 해 본 수업'으로 연다(:47).
  - 단원 5 통과 뒤 단계 평가를 기다리는 동안에도 '다시 하기 · 안 해 본 수업 · 복습도 고를 수 있다'(:102).
  - 지금 코드는 세 경우 모두 지금 단원의 안 한 수업을 잘못 다룬다. 다음 단계 준비 중 · 졸업은 거부하고, 단계 평가 대기(보통 상태)는 `regular` 로 연다. `regular` 는 '단원 횟수 · 최근 성적에 넣지 않는다'(:47)는 안 해 본 수업 규칙과 어긋난다.
  - 뿌리는 서버가 지금 단원의 통과를 순수 함수에 넘기지 않는 데 있다. `unitsPassed` 는 `r.unit < unit` 만 담는다(`src/server/lesson-list/index.ts`:185-191).
  - P10 실행 중에는 이 상태들이 생기지 않는다(P12 가 만든다). 그러나 차례 6 에서 `SESSION_START_OPEN` 을 켜면 화면에 보인 수업이 거부되는 위험 3 의 꼴이 그대로 남는다. P12 는 이 함수를 입력만 채워 쓴다.
- 어떻게:
  1. `ListInput` 에 `currentPassed: boolean`(제안)을 더한다. 서버는 지금 회차의 `passedAt !== null` 로 채운다.
  2. `currentPassed` 면 지금 단원 칸을 지난 단원처럼 판정한다. 끝낸 적 있음은 `retry`(회차 무관), 없음은 `untried` 이고 `paused` 를 거치지 않는다.
  3. 목록은 그 칸에 '안 해 본 수업' 표시를 내고 '여기부터 해요' 후보(남은 배정 · 다지기)에서 뺀다.
  4. `paused` 는 지금 단원이 통과 전인 parent_check 에만 남긴다. 그때 묶음은 이미 숨겨져(`current: null`) 목록과 재판정이 맞는다.
  5. 시험:
     - 위험 3 맞대기 표에 next_level_pending + `currentPassed` 와 단계 평가 대기(normal + `levelTest.ready` + `currentPassed`)를 더한다. 목록에 나온 칸이 모두 재판정을 지나고 안 한 칸의 종류가 `untried` 임을 본다.
     - :398 시험 이름에서 '다음 단계 준비 중'을 빼거나 기대를 고친다.

### Minor

**M-1. 잠긴 단원 줄의 수를 만드는 규칙 다섯을 시험이 구별하지 못한다.**
- 무엇이: 변이 표본 표.

  | 표본 | 단위 | 통합 |
  |---|---|---|
  | S1 잠긴 줄 차례: 학습일이 먼저 | **2 실패** | **1 실패** |
  | S2 끝냄이 회차를 안 봄(순수 함수) | **1 실패** | 4 통과 |
  | S3 통과 안 한 앞 단원도 열림 | 7 통과 | 4 통과 |
  | S4 다시 하기 변형 규칙이 profile | **2 실패** | 4 통과 |
  | V1 닫기가 배치도 닫음 | 7 통과 | **1 실패** |
  | V2 끝낸 수업 수에 모든 종류를 셈 | 7 통과 | 4 통과 |
  | V3 학습일에서 다시 하기를 뺌 | 7 통과 | 4 통과 |
  | V4 쓰기 6단계 frame 무시 | 7 통과 | 4 통과 |
  | V5 최소 수업 수에 배정 수를 안 봄 | 7 통과 | 4 통과 |
  | V6 서버 gate 의 회차 경계 없음 | 7 통과 | 4 통과 |
- 왜:
  - V2 가 특히 중요하다. 다시 하기를 수업 수에 세면, 같은 수업을 되풀이해 단원이 열리는 쪽으로 기운다. CLAUDE.md '횟수로 단원을 통과시키지 않는다'의 아래 한계(최소 수업 수)가 무너진다.
  - 통합은 정규 세션만, 같은 학습일에만, 회차 시작 뒤에만 넣는다. 그래서 V2 · V3 · V6 이 갈리지 않는다.
  - 시험용 작은 틀의 배정 수와 unit.min_lessons 가 같아 V5 도 갈리지 않는다.
  - S3 은 서버가 통과한 단원만 칸을 실어 `unknown` 으로도 막히므로 낮다.
- 어떻게: `tests/integration/lesson-list.test.ts` 둘째 시험 꼴로 사례를 더한다.
  - (가) 다시 하기 세션 하나를 다른 학습일에 넣는다. 수업 수 줄은 그대로이고 학습일 수는 하나 준다(V2 · V3).
  - (나) 회차 시작 전에 시작한 정규 세션을 넣는다. 줄이 바뀌지 않는다(V6).
  - (다) 회차 복사본의 `unit.min_lessons` 를 배정 수보다 작게 바꾼다. 줄의 n 이 배정 수다(V5).
  - (라) 쓰기 6단계 frame 은 시험용 시드에 6단계가 없어 단위로 뺀다. `minLessonsOf({ area, level, assignedCount, snapshot, frame })`(제안) 순수 함수를 둔다.

**M-2. 단어 익히기(practice) 상태에서 잠긴 단원 한 줄을 다시 쓰지 않는 규칙이 빠졌다.**
- 무엇이: plan 값 1 은 '`state` 가 practice 면 한 줄을 다시 쓰지 않는다(4절 단어 익히기 행)'다. `lockedNext` 는 상태와 관계없이 `lockLine(input.gate)` 를 넣는다(`state.ts`:259-262).
- 왜: P12 가 practice 와 `wordsShort` 를 채우면, '새 단어를 며칠에 걸쳐 복습하면 다음 단원이 열려요'(단어 익히기 안내)와 '단어를 며칠에 걸쳐 복습하면 열려요'(잠긴 줄)가 한 화면에 함께 나온다. 4절 '이때 잠긴 다음 단원에는 남은 조건 한 줄을 다시 쓰지 않는다'와 어긋난다.
- 어떻게: `line: input.state === "practice" ? null : lockLine(input.gate)` 로 바꾸고, 단위 사례 하나(practice + wordsShort → 줄 null)를 더한다.

**M-3. '이 회차에서 끝낸 수업'을 홈은 끝낸 시각으로, 목록은 시작 시각으로 가른다.**
- 무엇이: 홈 최근 성적은 `gte(sessions.completedAt, current.startedAt)`(`src/server/home/index.ts`:218)다. 목록 끝냄 · gate 는 `startedAt >= roundStartedAt`(`state.ts`:151 · 165, `index.ts`:267)다.
- 왜: 부모가 단원을 옮기면 진행 세션은 보관되고, 그 단원에 다시 들어가면 이어 한다(5절 :58 '진행 → 보관 → 진행'). 그러면 앞 회차에 시작해 새 회차에 끝낸 세션이 생긴다. 그 세션이 홈 최근 성적에는 들고 목록 끝냄 · 남은 수업 수에는 빠진다. 3.2 의 말은 '끝낸'이다.
- 어떻게: 한쪽으로 맞춘다. 끝낸 시각을 권한다. `SessionLite` 에 `completedAt` 을 더해 `triedRef` · `remedialDone` · 서버 `inRound` 가 `completedAt >= roundStartedAt` 를 보게 한다. 이름도 `roundStartedAt` 그대로 두면 된다.

**M-4. 수업 포스트잇의 접근성 이름에 끝냄 · 보강 · '여기부터 해요'가 없다.**
- 무엇이: `label={\`${lessonNo} ${title}\`}` 가 `aria-label` 로 이름을 덮는다(`lesson-board.tsx`:125 · `src/components/board/board.tsx` PostIt). ✓ 표는 `aria-hidden`, 보강 · 여기부터 표시는 이름 밖이다.
- 왜: B1 M-3 과 같은 꼴이다. 보조 기술로는 끝낸 수업과 남은 수업이 같게 들린다.
- 어떻게: B1 M-3 고치는 법을 같이 쓴다(이름은 안의 글로, 또는 `aria-describedby`). ✓ 그림에는 sr-only 글 '끝냄'을 둔다. des-p10 판정이 겹치면 그쪽을 따른다.

## 4. 다르게 한 것 판정(구현 보고 '차례 4' ①~⑥)

| # | 무엇 | 판정 |
|---|---|---|
| ① 가 | `ListInput.roundStartedAt` | 받아들임. 5절 sessions 에는 회차 열이 없고 unit_progress 의 `started_at` · `round` 가 회차를 가른다. 시각 경계가 맞는 대리다. 다만 시작 · 끝 기준을 홈과 맞춘다(M-3) |
| ① 나 | 거부 까닭 `paused` | parent_check 에는 받아들임(묶음이 숨겨져 목록과 맞음 · 4절 '그동안 지난 수업을 해 봐요'). next_level_pending · graduated 에는 거절(I-1 — 3.2:47 · 102 · 107) |
| ① 다 | retry 에 `firstVariant` · `firstRevision` | 받아들임. 3.2 '다시 하기는 처음과 같은 변형'과 plan 증명 표 '세션 틀: 판은 … 다시 하기는 처음 쓴 개정의 가장 높은 정정과 처음 변형'에 필요하다. 단위가 `first_session` 을 단언한다 |
| ② | `SESSION_START_OPEN = false` · 지난 수업 포스트잇은 글 상자 | 받아들임(차례 6). 장부 :52 그대로 |
| ③ | 맨 위 '<n>단계 평가' 이름 | 문구는 des-p10 · 컨트롤러 몫. 코드는 단계 수를 `view.band.level` 에서 채워 수를 박지 않는다 |
| ④ | '홈' · '수업 목록' 작은 링크를 쪽 파일에서 꾸밈 | 받아들임. 같은 클래스 글이 두 파일(`lesson-board.tsx`:206-215 · `past/page.tsx`:54-63)에 있으니 fix 2/3 의 SmallLink 로 바꿀 때 둘 다 바꾼다(장부 :52) |
| ⑤ | 가로 화면 오른쪽 칸 | 화면 쪽(des-p10) |
| ⑥ | 통합 파일 더함 · 'resume_hours' 시험을 여기로 | 받아들임. 이름이 plan 증명 표 글자 그대로다. 표의 파일 칸(`session-start.test.ts`)만 `lesson-list.test.ts` 로 고치면 된다(컨트롤러) |

알릴 것: ✓ 는 그림만 — M-4. 오래 멈춘 세션 닫기는 목록 요청 때만 — 위험 8 · 5절 글자대로라 맞다(홈은 진행 세션을 보이지 않음).

## 5. 장부 판정(`ledger-open.md`)

| 행 | 판정 | 근거 |
|---|---|---|
| :50 순수 함수 다르게 한 것 | 위 4절 ①로 판정 — roundStartedAt · firstVariant/firstRevision 은 받음(완료 보고에), `paused` 는 I-1 고친 뒤 닫음 | — |
| :52 차례 5 · 6 `PLACEMENT_OPEN` · `SESSION_START_OPEN` | 아직 열림. 한 줄 더하기를 권한다: '`SESSION_START_OPEN` 을 켤 때 e2e AC-2b 에 셋째 수업이 실제로 세션을 연다는 단언을 더함(지금은 `aria-pressed` 까지)' | `tests/e2e/lesson-list.spec.ts`:69-77 |
| :46 차례 4 · 5 | 차례 4 몫('/<area>/lessons 는 차례 4 에 생김')은 닫힘 — e2e AC-2b 가 홈 카드 → 목록을 지난다. 나머지는 차례 5 · P11 · P12 몫으로 열림 | `lesson-list.spec.ts`:60-66 |
| :31 · :41 시작 개정 | 목록 몫은 맞음 · 행은 열림(배치 · 세션 · P11 · P12) | `index.ts`:193-208 |

## 6. 범위 밖 관찰

- `closeStaleSessions` 가 쪽 그리기(GET) 안에서 쓴다. 5절 '목록 요청 때'대로다. 링크 미리 읽기(prefetch)가 동적 쪽을 미리 그리게 바뀌면 사용자가 누르기 전에 닫힐 수 있다. 차례 6 에서 `loading.tsx` 를 더하거나 Next 설정을 바꿀 때 한 번 본다.
- 지난 수업 쪽(`past/page.tsx`)도 `readLessonList` 를 불러 닫기가 한 번 더 돈다. 해는 없다.
