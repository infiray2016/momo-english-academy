# 코드 검토: P11b 차례 5 — AI 길 · 쓰기 4~5 확인(검토 묶음 B1) — code-reviewer rev-p11b(Opus · xhigh, 2026-10-22)

대상: 워크트리 `.claude/worktrees/p11`(HEAD 726198f) 작업 트리의 변경 14 · 새 파일 13(CI 가지 ci/p11-c2 b32a418 과 같은 내용). 대조: 검토 브리프 `task-p11-review-5-code.md`(볼 것 1~9 · 덧), 구현 보고 `task-p11-report.md` 차례 5 절(475~577), plan-p11b 값 1~4 · 6~9 · 'AI 실패 갈래별 화면 길' 표 · 제약(139행) · 위험 4 · 5 · 7 · 8 · 증명 표, plan-p11a 정본 밖 문구 표 b 행(185~187), 정본 6.1(`specs/05-AI-호출.md` 33행 이름 가림) · 3.3 쓰기 4 행(`specs/02-2` 33행) · 4절 쓰기 세션 행(`specs/03-화면.md` 18행) · 7절 '마이크를 쓸 수 없음' 행(`specs/07` 31행), 13절 C50 (2) · C80 · C81.
직접 확인한 것: `pnpm check:deps` 위반 0(모듈 162) · `pnpm check:bundle` 위반 0 · `pnpm check:ids` code-setting-unknown 0 · fixture-setting 0 · design-number 35(바탕 그대로, 새 줄 0). 증명 표 시험 이름 여덟을 plan 글자와 기계 대조했다(모두 같음). `tests/e2e` 에 실제 API 주소 · 키 글자 없음. 단위 · 통합 · e2e 는 다시 돌리지 않았다(CI 9차 run 39726243762 은 시험 결함 1건 빼고 초록, 10차는 컨트롤러 확인 중).

## 판정: Changes requested — Critical 0 · Important 1 · Minor 3

## 0. 앞 라운드(review-p11-fix4-code) 열린 항목

| 지적 | 판정 | 근거 |
|---|---|---|
| M-1 (가) 막힌 안내 '홈'이 첫 활동 갈래를 지나지 않음 | **ADDRESSED** | `tests/e2e/speaking.spec.ts` AC-5c 끝(431~452행 부근): 앞 세션을 중단으로 바꾸고 '쓸 수 없음' 기기로 새 세션을 열어 미리보기에서 막힘 · 시도 0 을 단언한 뒤 '홈' → `in_progress`. `!blocked` 가 빠지면 세션 행이 지워져 실패하는 단언이다 |
| M-1 (나) 고리 '줄어듦' 단언 없음 | **ADDRESSED** | 같은 파일 AC-5b(296~306행): 고리 style 의 첫 각도(먹색 몫 — `speak-button.tsx:73` 꼴과 맞음)를 400ms 사이 두 번 재 작아짐을 단언 |
| M-2 끝내기 실패와 막힘이 겹치면 '홈' 없음 | **ADDRESSED** | `session-frame.tsx:813-815` `stopped` · `showFinishRetry` — 막힌 안내 · 안전 상한 안내가 끝내기 다시 해 보기보다 먼저, 띠 '홈' 숨김도 `stopped` 기준(824) · 몸통도 `showFinishRetry` 기준(867) |
| M-3 P11a 완료 보고에 fix 4 몫 | **ADDRESSED** | 메인 저장소 plan-p11a 435~436행(`repeat.tsx` · `speak-button.tsx` 행) · 470행(다르게 한 것 14) · 424행(`compact`) |

## 1. 설계 준수(브리프 볼 것)

| 볼 것 | 판정 | 근거 |
|---|---|---|
| 1. AI 호출 경로 | ✅ | `src/server/writing/index.ts:17` 이 `@/server/ai`(index)의 `checkWriting` 만 부르고 파일 첫 줄 `server-only`. 서버 액션 `src/server/actions/writing.ts:13` 첫 문장 `await requireAccess()`, 입력은 `GuidedInputSchema` strict(34~39) + 시도 꼴 글자 수 · NUL 검사(197). 응답은 P9c 정규화 · Zod 를 거친 `AiOutcome`. 로그는 `dbErrorTag` 이름 · 코드만(239 · 283). 화면 조각의 `@/server/writing` 가져오기는 `import type` 뿐(`writing-guided.tsx:38`). check:bundle · check:deps 0. 실제 API 로 가는 길: Next env 가 `ANTHROPIC_BASE_URL` · 시험 키로 덮고 `VERCEL_ENV` 를 지운다(`playwright.config.ts` 68~77) — P9a `clientOptionsOf`(`client.ts:51`)는 그때만 SDK 주소를 맡기므로 맞다 |
| 2. 값 1 LevelContext | ✅ | `ai-context.ts:28-89` 단계 규격(can-do · sentenceMaxWords) · 단원 규격(학습 요소 · targetVocab) · 앞 단원(`r.level < level \|\| r.unit < unit`, 단원 0 은 질의에서 뺌, `pickByCell`) · 없는 칸은 `LevelContextError`. 통합 '쓰기 AI: 가변부의 앞 단원 …'이 단계 4 단원 1 · 3 의 목록 · 정정 판 고르기 · 뒤 개정 안 씀 · 없는 판 던짐 · 실제 요청 system 글까지 본다 |
| 3. 값 2 · 9 안전 상한 | ✅ | `ai-gate.ts:25-40` = `preCallGate(dailyUsage)` 거짓, 학습일 app.*. 시작: `session/index.ts` 잠금 전에 `aiNeededLesson` 이고 상한이면 하던 수업(resume)은 열고 새 수업은 확인 쪽지 · 중단 전에 `ai_resting`. 화면 자료 `aiResting`. 틀은 안내 + '홈' 하나 · 세션 진행(`session-frame.tsx:542` 지우지 않음). 통합 '1-가 안전 상한' 둘이 쓰기 4 · 6 · 말하기 10 막힘(상한 행을 지우면 열림) · 읽기 · 쓰기 1 열림 · 세션 0 행, 도중 닿음은 시도 0 · AI 요청 0 · 진행 · 다시 열면 `aiResting` 을 본다. 둘째 세션 몫은 컨트롤러 결정 2 대로 `aiNeededLesson` 단언만 |
| 4. 값 3 checkGuided | ✅(I-1 빼고) | 같은 시도 id → 저장 결과(146~160), 같은 활동의 다른 id 끝 시도 → 그 결과(199~217), 점수 `cleanSentenceRate`(249~251), 실패 → `failed` · 점수 null · `skipped`(246~248 · 81), 서버에서 던짐 → 이유 `error`(237~241), 안전 상한 → 시도 없이 `ai_resting`(243~244), 보기 차례는 시도 id 로(`rotationOf` 70~74 — 저장 결과도 저장된 id 로 다시 만듦). 통합 writing-check 셋이 점수 · 실패 점수 null · 같은 id 요청 1 · 다른 id 요청 1 · 시도 1 행 · 대기열 거부를 단언 |
| 5. 값 4 시도 종류 · aiNeededLesson | ✅ | `attempt.ts` b 종류 · `serverActionOnly`(guided · draft · rewrite 끝, thinkout 전부) · 세션 서버 `needsAiPath` 첫 줄. `aiNeededLesson` 은 시드 꼴로 가름(guided · composition 첫 세션 · presentation). 단위 넷이 표대로 단언 |
| 6. 값 6 · 7 화면 | ❌ 일부(I-1 · M-1 · M-3) | `WaitHint` 즉시 점 셋 · 둘째 값 뒤 `data-wait-line`. 과제 '과제' · '예시' · 4단계 단어 상자, 문장 쓰기 4단계 칩 → 그 문장 첫 빈칸 · 5단계 입력란 다섯 속성, '다 썼어요'는 다 채웠을 때만, 같은 화면 확인 · 색칠 · 보기 · ✕ · '다시 골라 볼까요' · '잘 고쳤어요!' · '다음', hints · rubric 안 보임(e2e 단언), 내 문장 '건너뛰기' · 마이크 없으면 건너뜀. 문구는 plan-p11a 185~187행 글자 그대로. 빠진 것: 화면 글의 `{NAME}` 채우기(I-1), 쓰던 글 진행 시도(M-3) |
| 7. 값 8 가짜 AI | ✅ | webServer 배열 DB → `fake-ai`(준비 줄 `FAKE_AI_READY`, SIGTERM) → Next. 규칙 `when.purpose` 는 P9a 가 `output_config.format.schema.title` 로 맞춤(`fake-anthropic.ts:213-230`), 맞는 규칙이 없으면 501. 응답은 시험 수업 문장 수로 만듦(`writingCheckReply`). `beforeEach` · `afterEach(resetFakeAi)` |
| 8. 시험 이름 · 거짓 초록 | ✅ | 이름 여덟 글자 그대로. 숫자는 `TEST_SETTINGS`(ui.wait_hint_seconds · ai.timeout_seconds.realtime · ai.model.*). 거짓 초록 없음 — e2e 쓰기 4~5 와 AC-N10 은 가짜 규칙에서만 오는 `FAKE_PRAISE` 를 기다리고(실패 길이면 칭찬이 없어 실패), AC-N6 은 시도의 실패 이유가 `timeout` 임을, 안전 상한 e2e 는 세션 0 · AI 요청 0 을 단언한다. 시험 상한(타임아웃 × 2 + 5초)은 P9a 의 기다림 상한(`run.ts:352` `AI_WAIT_TIMEOUT_MULTIPLE`)과 맞음 |
| 9. 제약 | ✅ | 설계 숫자 새 줄 0. 기술 값은 이름 붙인 상수(`E2E_AI_PORT` · `E2E_FAKE_AI_KEY` · `E2E_AI_SHUTDOWN_TIMEOUT_MS` · `ACTIVITY_NO_MAX` · `DOT_DELAY_MS` 등). 아이 이름 · 비밀값 없음(시험 키는 가짜 서버만 받음) |

## 2. 잘한 점

- **안전 상한 판정을 P9c 와 같은 함수 · 같은 사용량으로 묶었다.** `aiRestingToday` 가 `preCallGate(dailyUsage)` 를 그대로 써서, 시작 막음과 호출 앞 막음이 어긋날 수 없다. 1-나가 고칠 자리도 한 곳이다(위험 8).
- **시작 막음 순서가 세심하다.** 잠금 밖에서 읽고, 하던 수업은 열어 화면 자료가 안내를 고르게 하며, 새 수업은 확인 쪽지와 이전 세션 중단보다 먼저 막는다. 상한 날 다른 수업을 고르다 하던 수업이 닫히는 일이 없다.
- **통합 시험이 '막힌 까닭이 상한임'을 증명한다.** 같은 수업이 상한 행을 지우면 열리는 것까지 단언해, 다른 까닭(판정 거부)으로 막혀도 초록이 되는 길을 닫았다.
- **CI 9차 실패를 이름 가림을 지키는 단언으로 바꿨다.** 요청 본문에 영어 이름이 없고 `{NAME}` 으로 바뀐 문장이 있음을 선 위에서 본다.
- **앞 라운드 M-1 · M-2 를 고치기 전 코드라면 실패하는 단언으로 닫았다.**

## 3. 지적

### Important

**I-1. AI 결과의 `{NAME}` 을 영어 이름으로 채우지 않는다 — 칭찬 · 고칠 곳이 자리 표시 글 그대로 아이에게 간다**
- 무엇이: P9c 는 보내는 아이 글의 이름을 `{NAME}` 으로 가리고 모델에게 "Keep the placeholder {NAME} exactly as it is."(`src/core/ai/calls/common.ts:84`)라고 시킨다. 그래서 칭찬 · 고칠 곳의 `original` · `corrected` · `distractors` 에 `{NAME}` 이 그대로 올 수 있다. 그런데 src 어디에서도 `fillName`(`src/core/ai/mask.ts:194-197`, 주석 '화면 · 읽어 주기용, P11')을 부르지 않는다. `checkGuided` 의 `outcomeOf`(`src/server/writing/index.ts:76-104`)는 받은 글을 그대로 돌려주고, 화면은 칭찬을 그대로 그린다(`src/components/session/writing-guided.tsx:410`). 결과가 셋이다. (가) 칭찬에 `{NAME}` 이 그대로 보인다. (나) `original` 에 `{NAME}` 이 들어 있으면 아이 문장(실제 이름)에서 자리를 못 찾아 고칠 곳이 조용히 버려진다(`index.ts:83-87`). (다) `corrected` 에 `{NAME}` 이 들어 있으면 고친 문장에 `{NAME}` 이 박혀 화면에 보이고, 내 문장 듣고 따라 말하기가 그 글을 읽어 준다(`applyFix` → `setOwnSentences`).
- 왜: plan-p11b 제약(139행) "아이 이름은 P9c 가림이 맡고 화면 글의 {NAME} 은 `fillName`", 정본 6.1(`specs/05-AI-호출.md` 33행) '{NAME} 은 영어 이름으로 채워 화면에 보이고 읽어 준다'. 아이 문장에 이름이 들어가는 일은 드물지 않다 — 5단계는 빈칸에 자판으로 직접 쓰고, 시드 문장 틀에 등장인물 이름이 있을 수 있다(CI 9차 실패가 바로 견본 문장 'We can ___ with Momo.' 와 시험 집 영어 이름이 겹친 경우였다, 보고 576행). 지금 e2e 는 가짜 칭찬 · 고칠 곳에 `{NAME}` 이 없어 이 길을 지나지 않는다.
- 어떻게: `checkGuided` 가 결과를 돌려줄 때(새 결과 · 저장 결과 모두 지나는 `outcomeOf`) 프로필 영어 이름(`profile.englishName`)으로 `praise` · `original` · `corrected` · `distractors` 를 `fillName` 한 뒤 고칠 곳 자리를 찾는다. 저장하는 `ai_feedback` 은 가린 글 그대로 둔다(6.1 talk_turns 와 같은 결). 선 위 검증: 통합 writing-check 에 이름이 든 문장 + `{NAME}` 이 든 칭찬 · 고칠 곳 응답 사례를 더해, 돌려준 칭찬에 영어 이름이 있고 `{NAME}` 이 없으며 고칠 곳이 살아남는지 본다. 차례 6 의 생각 꺼내기 · 첨삭도 같은 자리에서 채운다(값 3 thinkoutStep 글에 이미 적힘).

### Minor

**M-1. 쓰기 '내 문장 듣고 따라 말하기'에서 마이크를 쓸 수 없음이 나도 기기 상태를 남기지 않는다**
- 무엇이: `OwnRepeatActivity` 의 `onSpeech`(`src/components/session/writing-guided.tsx:526-536`)는 `mic-unavailable` 판정이면 이 활동만 `no_mic` 로 넘긴다. 말하기 틀(`session-frame.tsx:344-346`)과 달리 `markMicUnavailable` 을 부르지 않는다.
- 왜: 7절 31행 '… not-allowed · service-not-allowed · language-not-supported … 오류가 나면 그 기기를 '마이크를 쓸 수 없음'으로 본다'는 세션 영역을 가리지 않는다. 기기 상태가 안 남으면 홈의 말하기 · 회화 카드가 열린 채로 있고(4절), 아이는 말하기 세션을 연 뒤 첫 누름에서야 막힌다. 쓰기 세션을 막지 않는 판단(다르게 한 것 9)은 맞다.
- 어떻게: 판정이 `mic-unavailable` 일 때만 `markMicUnavailable(code)` 를 부른다(막힌 안내 · 알림은 그대로 없이). 알림까지 남길지는 컨트롤러 판단이다.

**M-2. 지난 수업 쪽의 안전 상한 안내에 '수업 목록' 띠 링크가 함께 남는다**
- 무엇이: `past-lessons.tsx` 는 `resting` 이면 `AiRest`(큰 '홈')만 그리지만, 서버 쪽(`src/app/(child)/[area]/lessons/past/page.tsx:49-54`)의 종이 띠 오른쪽 '수업 목록' 링크는 그대로다. 수업 목록 화면(`lesson-board.tsx`)은 같은 경우 띠의 누르는 것을 모두 뺀다.
- 왜: C80 · plan 값 9 '안내 + '홈'', 4절 '한 화면에 행동 하나'. 수업 목록 화면과 꼴이 다르다. 다르게 한 것 8(B3 몫을 당김)의 범위다.
- 어떻게: 지난 수업 쪽도 안내 동안 띠의 링크를 숨긴다(띠를 클라이언트 쪽으로 옮기거나 안내를 쪽 전체로 그림). 화면 검토가 볼 자리이기도 하다.

**M-3. 쓰던 글의 진행 시도를 보내지 않는다 — plan 값 4 · 7 과 다르고 보고에 없다**
- 무엇이: plan 값 7 '쓰던 글은 진행 시도 · a 의 기기 입력으로 되살림', 값 4 '`writing-guided` 진행 `{ sentences }`(대기열 — 쓰던 글 되살리기)'. 지금은 기기 입력(`onChange={save}`, `session-frame.tsx:651`)만 쓰고 `writing-guided` 진행 시도를 대기열에 넣는 곳이 없으며, 화면 자료(`guidedViewOf`, `src/server/session/index.ts:907-936`)도 그것을 읽지 않는다. 시도 꼴만 받게 되어 있다.
- 왜: 다른 기기 · 저장소가 비워진 기기에서 다시 열면 4~5단계 문장을 처음부터 다시 쓴다. 영향은 작지만 plan 과 다른 것이 '다르게 한 것'에 없다.
- 어떻게: 진행 시도를 보내고 화면 자료가 가장 늦은 것을 돌려주거나, 기기 입력만으로 둔다는 것을 다르게 한 것에 한 줄로 적는다(컨트롤러 판단).

## 4. 다르게 한 것 · 정할 것 판정

| 번호 | 판정 | 근거 |
|---|---|---|
| 다르게 1(넣는 꼴은 `amount.input`) | 받음 | 단계 숫자를 박지 않음, 없으면 던짐(`guidedViewOf`) |
| 2(단어 상자는 문장마다) | 받음 | 시드 `sentences[].wordBox` 꼴 그대로 |
| 3(첫 줄은 시드 과제 글) | 받음 | 정본 밖 새 문구 없음 |
| 4(끝 시도 재사용 · 같은 id 동시 경합) | 받음 — Important 아님 | 같은 id 두 요청이 동시에 닿는 길은 '요청은 서버에 닿았는데 응답이 끊김 → 화면이 다시 냄'이 AI 기다림(많아야 realtime × 2) 안에 겹칠 때뿐이다. 화면은 기다리는 동안 다시 내지 못하고(`busy`), 서버 액션은 저절로 다시 보내지 않는다. 그때도 저장은 하나이고(`onConflictDoNothing` 뒤 먼저 저장된 결과를 돌려줌, 267~280) 늘어나는 것은 짧은 실시간 호출 하나다. CLAUDE.md '실시간 호출은 비용 · 횟수로 아이 진행을 끊지 않는다'와 plan(잡기는 첨삭에만, 위험 2)에 맞다 |
| 5(자리를 못 찾는 고칠 곳은 안 냄) | 받음 — 단 I-1 과 함께 | 채우기 전 `{NAME}` 이 든 `original` 도 여기서 버려진다 |
| 6(서버 오류 → `error` 시도 · 넘어감) | 받음 | plan 표 '서버 오류 … 같음(넘어감)'. 일시적인 DB 오류도 이 갈래로 가 그 세션 점수가 비는 것은 표가 정한 대로다 |
| 7(`dailyUsage` 직접) | 받음 | plan 값 2 가 그 함수를 적었고, 읽기만 하며 SDK 를 가져오지 않는다(check:deps 0) |
| 8(목록 · 지난 수업 · 결과 안내 당김) | 받음 — M-2 하나 | |
| 9(건너뛰기 활동 전체 · 마이크 막힘은 쓰기 안 막음) | 받음 — M-1 하나 | |
| 10(`WaitHint` 즉시) | 받음 | 첫 값은 '이 안에' 상한 |
| 11(뒤 비우기 더함) | 받음 | |
| 정할 것 1~3 | 컨트롤러 결정대로 | 코드가 결정 글과 같다 |

## 5. 판정

**Changes requested.** AI 길 · 안전 상한 · 쓰기 4~5 확인 · 가짜 AI 는 plan 대로 돌고 시험도 참이다. 고칠 것은 I-1 하나다 — plan 제약이 적은 `{NAME}` 채우기가 없어, 이름이 든 문장에서 칭찬 · 고칠 곳 · 따라 말하기 글에 자리 표시가 그대로 나갈 수 있다. M-1~M-3 은 같은 fix 에서 닫거나 장부로 넘기면 된다.

## 범위 밖 관찰(지적 아님)

- **5단계 입력란에 글자 수 상한이 없다.** 시도 꼴 상한(`INPUT_JSON_MAX`)을 넘으면 서버가 `invalid` 를 돌려주고 화면은 '지금은 저장할 수 없어요 …'를 보인다. 아이가 글을 줄이면 풀리지만 문구가 까닭과 다르다. 빈칸 입력에 `maxLength` 를 두면 생기지 않는다.

## 장부 항목

| 항목 | 판정 | 근거 |
|---|---|---|
| ledger 45행 'P11 은 AiOutcome 실패 갈래마다 화면 길' | **쓰기 확인 몫 닫힘 · 생각 꺼내기 · 첨삭 몫 아직 열림(차례 6 · 7)** | 쓰기 확인: 성공 → 칭찬 · 고칠 곳, `safety_cap` → 시도 없이 안내 + '홈'(진행), `config` · 거절 · `invalid` · `output_blocked` · 시간 · 연결 · 서버 · 한도 → `failed` 시도 · 넘어감, 서버에서 던짐 → `error` · 넘어감, 서버에 닿지 못함 → 7절 끊김 안내 · `online` 때 같은 id(`writing-guided.tsx` submit). plan 표 쓰기 확인 행과 같다 |
| review-p11-fix4-code M-1 · M-2 · M-3 | **닫힘** | 위 0절 |
| 새 I-1 · M-1 · M-2 · M-3 | **아직 열림** | 위 3절 |
