# fix 브리프: P11b 차례 5 fix 5 — 코드 검토 B1(rev-p11b) · 화면 검토 B1(des-p11c) · Codex 지적 둘(implementer impl-p11b · Opus · high, 2026-10-22 15:1x)

보고 둘을 먼저 읽는다: `review-p11-5-code.md`(C 0 · I 1 · M 3 · 범위 밖 1) · `review-p11-5-design.md`(C 0 · I 1 · M 6 · 참고). 워크트리 p11 작업 트리(HEAD 726198f + 미커밋 차례 5)에 이어서 고친다. 시험 먼저, 설계 숫자는 박지 않는다. 다 고치면 로컬 관문(biome ci · tsc · 단위 · check:deps · spec:trace)을 돌리고 보고 `task-p11-report.md` 에 'fix 5' 절(지적마다 고친 파일:줄 · 시험 이름)을 쓴 뒤 SendMessage — 컨트롤러가 CI 가지를 다시 만들어 11차를 돌리고 재검토 둘을 띄운다.

## 고칠 것(컨트롤러 결정 포함)

| 번호 | 출처 | 할 일 | 선 위 검증 |
|---|---|---|---|
| 1 | 코드 I-1 | `checkGuided` 가 결과를 돌려주는 자리(`outcomeOf`, 새 결과 · 저장 결과 모두)에서 프로필 영어 이름으로 `praise` · `original` · `corrected` · `distractors` 를 `fillName`(`src/core/ai/mask.ts`) 한 **뒤** 고칠 곳 자리를 찾는다. 저장하는 ai_feedback 은 가린 글 그대로. 차례 6 의 생각 꺼내기 · 첨삭도 같은 자리에서 채우게 함수를 하나로 | 통합 writing-check: 이름 든 문장 + `{NAME}` 든 칭찬 · 고칠 곳 응답 → 돌려준 칭찬에 영어 이름 있고 `{NAME}` 없고 고칠 곳이 살아남음 |
| 2 | 코드 M-1 | 쓰기 '내 문장 듣고 따라 말하기' `onSpeech` 가 `mic-unavailable` 이면 `markMicUnavailable(code)` 도 부른다(막힌 안내 · 알림은 그대로 없음, 쓰기 세션은 안 막음) | 단위 또는 e2e 한 단언(기기 상태 기록) |
| 3 | 코드 M-2 = 화면 M-5 | 지난 수업 쪽도 안전 상한 안내 동안 띠의 '수업 목록' 링크를 숨겨 '홈' 하나만(수업 목록 · 세션 · 결과와 같은 꼴) | e2e 지난 수업 안전 상한 사진 `p11-ai-rest-past` 한 장 + 띠 링크 없음 단언 |
| 4 | 코드 M-3 | **결정: 고치지 않는다.** 쓰던 글은 기기 입력으로만 되살린다(글자마다 진행 시도는 대기열을 넘치게 하고 다른 기기 이어 쓰기는 드묾). 보고 '다르게 한 것'에 한 줄(plan-p11a 값 4 · 7 과 다름) | — |
| 5 | 코드 범위 밖 | 5단계 빈칸 입력에 `maxLength`(코드 상수 하나, 이름 붙여, 시도 꼴 상한 `INPUT_JSON_MAX` 안에 들게) — 기술 상한이라 설정값 아님 | 단위 한 줄(상수 ≤ 시도 꼴 상한) |
| 6 | 화면 I-1 | `input === "slot"`(5단계)이면 문장 틀 위에 '예시'(문구 표 b 행) + `EnglishLine` 예시문(`content.example`)을 write · checking 단계에 보인다. 4단계는 그대로(단어 상자) | e2e writing 5단계 쓰기 화면에서 예시문 보임 단언 + 사진 `p11-writing-5-write-*` 다시 |
| 7 | 화면 M-1 | 5단계 입력란 `w-40` → `min-w-40` + 글 길이에 맞춰 늘림(`field-sizing: content` 또는 size) | 사진 |
| 8 | 화면 M-2 | 입력란 초점 꼴을 `FOCUS_RING`(먹색 4px 점선 · offset 4)과 같게 | 사진(초점 든 칸) |
| 9 | 화면 M-3 | 과제 화면의 단어 상자는 누르는 칩 꼴이 아니라 테 · 그림자 없는 글 줄(24px, `lang="en"`)로. 새 동작(누르면 읽어 주기)은 넣지 않음 | 사진 `p11-writing-4-task-*` |
| 10 | 화면 M-4 → **C86** | 고칠 곳을 바르게 고친 뒤 '잘 고쳤어요!' 아래 AI 의 한 문장 이유(`reason`, 해요체, 1 의 이름 채움 거침)를 한 줄 보인다. 고르기 전에는 없음. `GuidedFix` 에 reason 추가 | e2e 고친 뒤 이유 줄 보임 · 고르기 전 없음 단언, 사진 `p11-writing-4-fixed-*` |
| 11 | 화면 M-6 | `speak-button.tsx` 바깥 span `-m-3` + `speaking.tsx` 그 줄 `gap-4` → `gap-7`(보이는 간격 그대로, 단추 끝이 내용 끝에 맞음). 가운데 놓인 '말하기'는 바뀌지 않음을 확인 | 사진 `p11-speaking-repeat-close-*` · `-listening-on-*` |
| 12 | 화면 참고 | 확인 결과가 와도 과제 줄을 지우지 않아 문장 줄이 뛰지 않게. 입력란 aria-label 을 '문장 n 빈칸 m' 꼴로 | — |
| 13 | Codex 2(`review-codex-2026-10-19.md` 판정 2) | `src/lib/attempt-queue.ts` `add()` 가 저장 전에 `load(storage)` 와 합친다(`mergeStates`) — 두 탭 오프라인 답안이 둘 다 남게 | 단위: 한 저장소를 쓰는 대기열 둘이 각각 add → 저장소에 둘 다 |
| 14 | Codex 3(판정 3) | `src/server/placement/index.ts` 591줄 트랜잭션 안의 `screenOf(db, …)` 셋(613 · 672 · 686)이 `tx` 를 쓰게 `screenOf` 첫 매개변수 타입을 트랜잭션도 받게 넓힌다 | 통합 placement 하나(트랜잭션 안 호출이 바깥 연결을 안 잡음 — 풀 max 1 로 돌려도 끝남) |
| 15 | 화면 '사진 없음' | e2e 사진 셋 더함: 빈칸 빈 상태(채우기 전) · 틀린 보기 뒤 '다시 골라 볼까요' · 세션 도중 안전 상한 안내 | 사진 이름을 보고에 |

## 하지 않는 것
- 색칠 칸 토큰 이름(`bg-postit-reading`) 바꾸기 — 2차 토큰 정리(장부).
- 4단계 예시문 — 4절이 요구하지 않음.
- 생각 꺼내기 · 첨삭 쪽 `{NAME}` 채움은 1 의 함수를 쓰되 화면은 차례 6 · 7 몫.
