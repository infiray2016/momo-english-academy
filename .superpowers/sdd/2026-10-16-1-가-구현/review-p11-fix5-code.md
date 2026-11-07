# 코드 재검토: P11b 차례 5 fix 5 — 코드 B1 · 화면 B1 · Codex 2 · 3(code-reviewer rev-p11b · Opus · xhigh, 2026-10-22, 범위 한정)

대상: 워크트리 p11 작업 트리(HEAD 726198f + 미커밋, CI 가지 ci/p11-c2 60e4858 과 같음). 대조: 재검토 브리프 `task-p11-review-fix5-code.md` 볼 것 (1)~(10), fix 브리프 `task-p11-fix5.md` 15 항목, 구현 보고 'fix 5' 절(`task-p11-report.md` 578~630), 앞 검토 `review-p11-5-code.md`, 13절 C86(`specs/10-결정-기록.md` 236행) · plan-p11a 문구 표 231행.
직접 확인한 것: `pnpm check:deps` 위반 0(모듈 162) · `pnpm check:bundle` 위반 0 · `pnpm check:ids` code-setting-unknown 0 · fixture-setting 0 · design-number 35(새 줄 0, fix 5 파일에서 나온 줄 0). 단위 · 통합 · e2e 는 다시 돌리지 않았다. CI 11차는 도는 중이라 새 e2e 단언 · 통합 둘의 초록은 아직 확인되지 않았다.

## 판정: Approved(CI 11차 초록 조건) — ADDRESSED 15/15 · 새 지적 Minor 2(Critical 0 · Important 0)

## 1. 지적별 판정

| # | 출처 | 판정 | 근거 |
|---|---|---|---|
| 1 | 코드 I-1 `{NAME}` | **ADDRESSED** | `src/core/ai/mask.ts:199-213` `fillNameDeep`(값 안 글마다, 넘긴 값은 바꾸지 않음 — 차례 6 생각 꺼내기 · 첨삭이 그대로 쓸 수 있는 꼴). `src/server/writing/index.ts` `outcomeOf` 가 `fillNameDeep(feedback.value, englishName)` 뒤에 `fixSpotOf` 로 자리를 찾고, praise · original · corrected · distractors · reason 이 모두 채운 값에서 나온다. 새 결과 · 같은 시도 id · 같은 활동 끝 시도 · 동시 저장 넷 모두 `profile.englishName` 을 넘긴다(notNull 칸). 저장하는 `aiFeedback` 은 채우기 전 `feedback` 이다. 통합 "쓰기 4~5: AI 칭찬 · 고칠 곳 · 이유의 {NAME} 은 …"이 원문 `… with {NAME}` 사례로 고칠 곳이 살아남음 · 돌려준 값에 `{NAME}` 없음 · 저장 결과로 다시 만들어도 같음 · 저장 글에 `{NAME}` 있고 영어 이름 없음을 단언한다. 채우지 않으면 고칠 곳이 사라져 실패하는 참 단언이다 |
| 2 | 코드 M-1 기기 상태 | **ADDRESSED** | `src/core/writing/guided.ts` `ownRepeatStopOf` 가 쓸 수 없음만 `markDevice: true`. `writing-guided.tsx:588-598` 이 그때 `markMicUnavailable(오류 코드)` 뒤 이 활동만 `no_mic`. `mic-unavailable` 판정은 오류 사건에서만 나오므로(`judge.ts` 177~182 · 235~236) 코드가 비지 않는다. 단위 "내 문장 말하기: 마이크를 쓸 수 없음은 기기 상태를 남기고 …"가 판정 표를 본다(기록 호출 두 줄 자체는 코드로 확인) |
| 3 | 코드 M-2 · 화면 M-5 지난 수업 띠 | **ADDRESSED** | `past/page.tsx` 는 단원 고르기 쪽에서만 띠를 그리고, 수업 고르기 쪽은 `PastLessons` 가 띠를 그려 `resting` 동안 오른쪽 '수업 목록'을 뺀다. e2e '1-가 안전 상한 …'에 지난 수업 몫: 안내 보임 · '수업 목록' 링크 0 · '홈' 링크 1 · 세션 0 · 사진 `p11-ai-rest-past` — 고치기 전이면 링크 0 단언이 실패한다 |
| 4 | 코드 M-3 쓰던 글 진행 시도 | **ADDRESSED(컨트롤러 결정 — 기록)** | 보고 '다르게 한 것' 1 에 plan-p11a 값 4 · plan-p11b 값 7 과 다름 · 까닭 · 시도 꼴은 남겨 둠이 적혔다 |
| 5 | 코드 범위 밖 maxLength | **ADDRESSED** | `guided.ts` `BLANK_TEXT_MAX` 60(이름 붙인 기술 상한) · 입력란 `maxLength`(`writing-guided.tsx:397`). 단위 "빈칸 글자 상한: …"이 견본 문장 둘 벌(빈칸 여덟) × 60 자가 `INPUT_JSON_MAX` 아래이고 시도 꼴을 지남을 단언 — 상수 ≤ 시도 꼴 상한 |
| 6 | 화면 I-1 5단계 예시문 | **ADDRESSED** | `writing-guided.tsx:340-351` `input === "slot"` 이면 '예시'(문구 표 b 행) + `EnglishLine` 예시문, 틀이 `example` 을 넘김(`session-frame.tsx:647`). e2e 가 5단계 `[data-guided-example]` 1 · 예시문 보임, 4단계 0 을 단언 |
| 7 | 화면 M-1 입력란 늘림 | **ADDRESSED(새 Minor N-1)** | `w-auto min-w-40` + `size`(글 길이 + 1, 최소 `BLANK_INPUT_SIZE_MIN`). 위쪽 한이 없어 생기는 일은 N-1 |
| 8 | 화면 M-2 초점 꼴 | **ADDRESSED(코드)** | 빈칸 꼴에 `FOCUS_RING`, 입력란은 같은 꼴의 `focus:` 판 `INPUT_FOCUS`(145~146). 보이는 꼴은 화면 재검토 몫 |
| 9 | 화면 M-3 과제 단어 상자 | **ADDRESSED** | `writing-guided.tsx:93-109` 테 · 그림자 없는 굵은 글 줄(`CHILD_SIZE.english`, `lang="en"`), 새 동작 없음 |
| 10 | 화면 M-4 → C86 이유 줄 | **ADDRESSED** | 데이터 길: P9c 정규화가 `reason` 을 한 문장으로 줄이고(`firstSentence`) 출력 검사에 걸리면 그 고칠 곳을 통째로 버린다(`calls/writing.ts` `checkFields` · `applyChecks`) → `outcomeOf` 가 이름 채운 `found.reason` 을 `GuidedFix.reason` 으로 → 화면은 `fixDone` 일 때만 `data-fix-reason`(`writing-guided.tsx:512-518`). 이름 채움은 `reason` 에도 걸린다(통합 1 의 이유 단언). e2e 가 색칠 칸 누르기 전 · '다시 골라 볼까요' 뒤 0, 고친 뒤 `FAKE_REASON` 을 단언 — 가짜 응답에서만 오는 글이라 참 단언 |
| 11 | 화면 M-6 단추 끝 맞춤 | **ADDRESSED(다르게 한 것 4 — 받음)** | `speaking.tsx` 그 줄 `gap-7` + '한 번 더 말하기' 에만 `className="-mx-3"`. 고리 자리(바깥 `p-2` 8px + 안 `p-1` 4px = 12px)를 가로로만 걷어 '다음'과 단추 사이 보이는 간격은 28px 로 같다. 공용 조각 기본값을 두어 배치 · 가운데 '말하기'가 그대로다 |
| 12 | 화면 참고 | **ADDRESSED** | 과제 줄을 결과 단계에서도 그림(341행), 입력란 · 빈 칸 단추 이름 '문장 n 빈칸 m'(`blankName`) |
| 13 | Codex 2 대기열 | **ADDRESSED** | `src/lib/attempt-queue.ts` `add()` 가 `queueAdd(mergeStates(load(storage), state), …)`. 보낸 뒤 저장(`sendOnce`)은 이미 저장소와 합쳐 다른 탭 몫을 지우지 않는다. 다른 탭 메모리에 남은 보낸 시도가 다시 실릴 수 있으나 서버가 같은 시도 id 를 받은 것으로 돌려줘 해가 없다. 단위 "대기열: 한 기기 저장소를 쓰는 두 쪽(탭)이 …"이 저장소 · 다시 연 대기열에 둘 다 있음을 단언(보고: 고치기 전 실패를 봄) |
| 14 | Codex 3 `screenOf(tx)` | **ADDRESSED** | `src/server/placement/index.ts` `screenOf` · `pictureLookup` 첫 매개변수 `DbOrTx`, 답 트랜잭션 안 셋(614 · 673 · 687)이 `tx`. 트랜잭션 몸통의 다른 질의는 모두 `tx`(`trackOf(tx, …)` · `tx.insert` 등), `screenOf` 몸통이 DB 를 쓰는 곳은 `pictureLookup` 하나다. 바깥 호출은 `Db` 를 넘겨 그대로 맞는다(tsc 0). 통합 "배치 평가: 답 저장 트랜잭션 안의 다음 문항 화면은 …"이 `max: 1` 풀로 시작 + 답 셋을 10초 마감 안에 끝냄을 본다 — 고치기 전이면 연결을 기다리다 마감에 걸리는 참 단언 |
| 15 | 화면 '사진 없음' | **ADDRESSED** | `p11-writing-4-blank` · `-5-blank` · `-4-pick-again` · `-5-pick-again` · `p11-ai-rest-session` · `p11-ai-rest-past`. 세션 몫은 하던 세션을 상한 날 다시 연 길(`view.aiResting`)이다 — 아래 관찰 |

## 2. 다르게 한 것(구현자가 브리프와 다르게 한 셋 + 둘)

| 번호 | 판정 | 까닭 |
|---|---|---|
| 2(6 — 예시문을 결과 단계에도) | 받음 | 12 와 같은 까닭(결과가 와도 줄이 뛰지 않음). 5단계 두 방향 넘침은 e2e `fitsBothWays` 가 쓰기 · 고친 뒤 두 번 본다 — CI 11차 결과로 확인 |
| 3(7 — `size` 속성) | 받음 | iPad Safari 의 `field-sizing` 지원을 확인하지 못한 판단이 보수적이다. 위쪽 한은 N-1 |
| 4(11 — `-mx-3` 을 그 줄 단추에만) | 받음 | 공용 조각 기본값을 바꾸면 배치 따라 말하기 · 가운데 '말하기'의 위아래 간격도 바뀐다. 가로만 걷어 브리프 목적을 지켰다 |
| 1(4 — 기기 입력만) · 5(2 — 알림 없이 기기 상태만) | 받음 | 컨트롤러 결정 · 앞 검토 '알림은 컨트롤러 판단'과 같다 |

## 3. 잘한 점

- **이름 채우기를 값 전체에 거는 함수 하나로 만들었다.** 칸을 하나씩 고르지 않아 이유 칸(C86)처럼 뒤에 붙는 칸도 저절로 채워지고, 차례 6 의 생각 꺼내기 · 첨삭도 같은 함수를 쓰면 된다.
- **통합 시험이 '채우지 않으면 고칠 곳이 사라진다'는 사례를 골랐다.** 견본 문장의 등장인물 이름과 집 영어 이름이 겹치는 CI 9차 상황을 그대로 시험으로 바꿨다.
- **Codex 3 시험을 연결 하나짜리 풀로 짰다.** 트랜잭션 안에서 바깥 연결을 잡는 결함을 마감 시간으로 드러내, 같은 결함이 다른 자리에 생겨도 잡힌다.

## 4. 새 지적(fix 5 가 건드린 자리)

### Minor

**N-1. 5단계 입력란이 글 길이만큼 늘어나되 위쪽 한이 없다**
- 무엇이: `writing-guided.tsx:398-405` `size={max(BLANK_INPUT_SIZE_MIN, 글 길이 + 1)}` · `w-auto min-w-40` 이고 `max-w-*` 가 없다. `maxLength` 60 까지 치면 `size` 61 이 된다.
- 왜: 24px 글에서 60자 가까이 되면 입력란 너비가 카드 안 너비를 넘을 수 있다(추정 — 사진 없음). `ChildScreen` 바깥이 `overflow-x-hidden` 이라 쪽은 가로로 밀리지 않지만, 입력란 오른쪽과 쓰는 자리가 카드 밖에서 잘린다. 4절 두 방향 '넘침 없음'에 걸린다. 빈칸 하나에 60자를 쓰는 일은 드물다.
- 어떻게: 입력란에 `max-w-full` 을 더한다.

**N-2. `GuidedFix` 머리 주석이 C86 과 반대다**
- 무엇이: `src/server/writing/index.ts:42` "이유 · 모범 답안은 아이에게 보이지 않는다". 같은 타입의 `reason` 칸 주석(51~52행)과 C86 은 '바르게 고친 뒤 보인다'다.
- 왜: 차례 6 · 7 이 이 타입을 보고 이유를 숨겨야 하는 것으로 읽을 수 있다.
- 어떻게: "모범 답안은 보이지 않고, 이유는 바르게 고친 뒤 한 줄(C86)"로 고친다.

## 5. 판정

**Approved(CI 11차 초록 조건).** 15 항목이 모두 닫혔고, 앞 검토의 I-1 · M-1~M-3 · 범위 밖 하나도 닫혔다. 새 지적은 Minor 둘이라 컨트롤러가 직접 고치거나 다음 차례에 넘기면 된다. CI 11차가 빨강이면 새 단언(지난 수업 몫 · 이유 줄 · 예시문 · 대기열 · 연결 하나 풀) 가운데 깨진 것을 다시 본다.

## 범위 밖 관찰(지적 아님)

- **'세션 도중' 안전 상한 사진은 다시 열기 길이다.** 확인 서버 액션이 `ai_resting` 을 돌려줘 화면이 안내로 바뀌는 길(`session-frame.tsx:660` `onResting`)은 e2e 가 지나지 않는다. 서버 몫은 통합 '1-가 안전 상한: 쓰기 확인 도중 닿으면 …'이 보고, 화면은 같은 `AiRest` 조각이라 사진 꼴은 같다.
- **M-1 의 단위 시험은 판정 표만 본다.** `markMicUnavailable` 을 부르는 두 줄은 코드로만 확인했다.

## 장부 항목

| 항목 | 판정 | 근거 |
|---|---|---|
| review-p11-5-code I-1 · M-1 · M-2 · M-3 · 범위 밖 | **닫힘** | 위 1절 1~5 |
| Codex 2 · 3(review-codex-2026-10-19 판정 2 · 3) | **닫힘** | 위 1절 13 · 14(통합 · e2e 초록은 CI 11차) |
| 새 N-1 · N-2 | **아직 열림** | 위 4절 |
