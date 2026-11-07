# 구현 보고: UI · UX plan 묶음 0-가 돌아갈 길(구현자 · Opus · high, 2026-10-30 00:0x)

상태: DONE_WITH_CONCERNS · 워크트리 `.claude/worktrees/p13d`(커밋 안 함) · e2e 는 정적으로만(tsc · lint), 실행 확인은 0-마 · 9.

## 바뀐 파일(계획 표 밖은 ★)
- `src/components/session/mic-blocked.tsx`: `stuckButtonsOf`(:47, 막힘 → 큰 retry · 작은 home, 쉼 → 반대) · `MicBlockedPanel`(:144, 안내 줄 → 큰 '다시 해 볼래요' → 확인 중 '아무 말이나 …' → 작은 '홈', 홈은 단추 · 링크 둘 다). `MicBlockedText` 는 글만(retry 인자 뺌).
- `src/components/session/ai-rest.tsx`: `AI_REST_TEXT.still`('아직 쉬고 있어요. 조금 뒤에 다시 눌러 봐요') · `runAiRestRetry`(:38) · `useAiRestRetry`(:57) · `AiRest`(:92, retry 를 받으면 큰 '홈' · 작은 '다시 해 볼래요' · 아직 쉬면 한 줄) · `AiRestLine`(:164, 단추 없는 한 줄 칸, again 이면 '아직 쉬고 …').
- `src/server/actions/session.ts`: `recheckAiRest`(:71, requireAccess → 프로필 → aiRestingToday) · `micCheckSpeech`(:82, requireAccess → 음성 설정). 후자는 계획에 없던 액션(아래 다르게 한 것 1).
- `session-frame.tsx`: 막힘 → MicBlockedPanel, 쉼 → AiRest + useAiRestRetry(:346, 풀리면 setResting(false) · router.refresh — 같은 활동).
- `talk-frame.tsx`: 막힘 → MicBlockedPanel, 쉼 → AiRest + useAiRestRetry(:339, 풀리면 쉼으로 멈춘 턴 body 를 같은 시도 id 로 다시 submit, 열 때 쉬었으면 여는 길 그대로), `TALK_TEXT.retry` '다시 해 볼래요', `TroubleLine`(:1436, export) 큰 단추.
- `placement-flow.tsx`: 막힘 → MicBlockedPanel(홈은 링크 — 판정 전이면 마이크 안내, 지금 길 그대로).
- `result-view.tsx` · `closing-cards.tsx`: 쉼이면 큰 단추 자리에 AiRest(큰 '홈' · 작은 '다시 해 볼래요' = 마지막 고르기 다시, still = 같은 수업 또 쉼). 마무리 셋째 장은 그대로 둔다.
- `lesson-board.tsx` · `past/past-lessons.tsx`: 전체 쉼 화면을 없애고 누른 카드 아래 한 줄 칸(data-lesson-wait 안 AiRestLine), 띠 링크 그대로. 지난 수업 쪽도 같은 칸(LESSON_ROW).
- `home-cards.tsx`: '첨삭이 왔어요' 쉼 → 쪽지 아래 AiRestLine. 닫힌 카드 다시 확인 → `MicRecheck`(:406, runMicRetry · 확인 중 '아무 말이나 …').
- ★`src/app/(child)/[area]/lessons/use-lesson-start.ts`: `restAfterStartOf`(:60, 순수) · `restAgain` · `retryRest`(:161). 쉼을 고르기마다 다시 정하게(쉬지 않으면 지움) — 목록 한 줄 칸 · 결과 · 마무리의 다시 해 보기가 모두 이 훅을 쓰므로 고치지 않으면 '다시 누르면 다시 판정'을 못 그린다.
- 시험: `tests/unit/ux-recover.test.ts`(새) · `mic-blocked.test.ts` · `speech-feedback.test.ts` · e2e `writing.spec.ts`(쉼 시험 다시 씀 + `liftSafetyCap`) · `conversation.spec.ts` · `speech-feedback.spec.ts`.

## 설계와 다르게 한 것
1. 홈 닫힌 카드의 runMicRetry 는 음성 접점(설정)이 있어야 한다. 홈 쪽(page.tsx)은 범위 밖이라 `micCheckSpeech` 액션으로 카드가 닫혔을 때만 한 번 읽는다. page.tsx 가 speech 를 넘기는 쪽이 더 곧다(0-다 가 page.tsx 를 고칠 때 옮겨도 됨).
2. 결과 · 마무리 · 목록 · 홈의 다시 해 보기는 recheckAiRest 를 따로 부르지 않고 그 수업 시작(startLesson)의 재판정을 쓴다. 같은 판정 함수(aiRestingToday)이고 풀리면 바로 그 수업이 열린다.
3. 쉼 다시 확인이 닿지 않으면(끊김) '아직 쉬고 있어요 …'로 둔다(끊김 글을 따로 두지 않음).
4. 큰 · 작은 단추 고르개는 `data-button-size="big|small"`(막힘 판 · 쉬는 화면 · 끊김 줄)을 새로 달았다.

## 시험(새 13 · 고침 2 · 더함 1)
ux-recover 13: UX3 단추 차례 · UX3 막힘 판 차례 · UX3 음성 접점 없음 · UX4 문구 · UX4 쉬는 화면 차례 · UX4 아직 쉼 · UX4 다시 확인 한 번 · R-15 쉼 한 줄 · R-15 다시 누름 · N-11 끊김 줄 · UX4 recheckAiRest 둘 · R-10 micCheckSpeech. mic-blocked: '마이크 막힘 판 …' 더함 · 안내 글 조각에 단추 없음. speech-feedback: U6-1 을 막힘 판 · 큰 단추로.
e2e(정적): writing '1-가 안전 상한 · 돌아갈 길 …'(목록 한 줄 · 다시 누름 still · 지난 수업 · 세션 큰 '홈'/작은 '다시 해 볼래요' · still · 상한 풀고 같은 활동) · conversation 막힘 큰/작은, 목록 쉼 한 줄 · speech-feedback U6-1 큰/작은.

## 관문(2026-10-30 00:0x, p13d)
| 관문 | 결과 |
|---|---|
| pnpm lint | Checked 453 files, No fixes applied |
| pnpm exec tsc --noEmit | 출력 없음(exit 0) |
| pnpm test | 101 files · 1093 passed · 6 todo |
| pnpm check:deps | no dependency violations (232 modules, 1262 deps) |
| pnpm check:ids | exit 0, 위반 0, design-number 49(plan 기준 49 그대로 — 걸린 둘 lesson-board:252 strokeWidth 3 · home-cards:154 ratio*100 은 원래 줄) |
| pnpm spec:trace --fail-on unknown-ac | exit 0, missing-test 16(모두 P12 몫), unknown-ac 0 |

## 남은 우려(4)
1. e2e 를 돌리지 못했다. 특히 writing 쉼 시험의 `liftSafetyCap`(ai_calls 행 지움)과 세션 쉼 풀림 뒤 같은 활동 번호 확인은 실행으로 봐야 한다.
2. home.spec 'AC-5c 다시 확인' 은 이제 진짜 마이크 확인을 거친다(default-ok 대본이 소리를 넣는다고 보고 고치지 않음, 범위 밖 파일). 단추는 설정을 읽기 전까지 흐리다.
3. 회화 쉼 '다시 해 볼래요'(N-6)와 결과 · 마무리 쉼(N-7)의 e2e 는 쓰지 않았다(필수 경로 나 는 0-마 몫).
4. 세션 쉼이 쓰기 확인 도중에 났으면 풀린 뒤 같은 활동을 다시 그린다(되살린 입력, 확인은 다시 눌러야 함).
