# 코드 검토 보고: 회화 plan 묶음 '5-다'('5-나' 뒤 차례) + 컨트롤러의 검증기 열쇠 고침(T-56)

검토자는 rev-talk-5c(code-reviewer · Opus · xhigh, 읽기 전용)이고, 2026-11-05 에 썼습니다. 줄 번호는 워크트리 `.claude/worktrees/p13d` 기준입니다. 이번 묶음 파일은 대부분 추적되지 않는 새 파일이라 HEAD 대비 diff 가 없습니다. 그래서 구현 보고가 적은 줄 범위를 직접 읽었습니다. 묶음 8 · 9 의 파일(`src/server/conversation/**` · `src/server/ai/talk.ts` · route · seed-lists · structure.ts 고침)은 보지 않았습니다. 단, `src/server/ai/run.ts` 의 오류 갈래 함수 하나는 4절 판정의 근거로 읽었습니다.

기준 판: 컨트롤러가 14:3x 에 (가)의 마지막 변경을 알렸고, 이 판으로 다시 확인했습니다. 코드 파일의 수정 시각은 lesson-turns.ts 14:20:01, talk-lesson.ts 14:20:13 이고, 나머지 파일은 그보다 앞입니다. 제가 읽은 뒤에는 바뀌지 않았습니다. 구현 보고(14:20:42)의 (가) 절과 '설계와 다르게 한 것' 1 도 이 판의 내용과 같습니다. 열거 넷의 정의가 모두 lesson-turns.ts 에 있고 talk-lesson.ts · talk.ts 는 다시 내보내기만 한다는 것을 grep 으로 확인했습니다. check:deps 0 도 이 판에서 돌린 결과입니다. 보고가 적은 줄 번호(talk-lesson.ts `:22-27` · `:54-63`)는 지금 파일에서 한 줄씩 뒤(`:23-28` · `:55-64`)입니다.

**판정: Approved.** Critical · Important 는 없습니다. Minor 넷을 적었고, 그중 M-1 · M-2 는 묶음 8 이 heardHelpsOfMove 와 정규화를 잇기 전에 고치면 좋습니다.

## 1. 설계 준수

| 할 것 | 판정 | 근거 |
|---|---|---|
| (가) calls/talk.ts ↔ talk-lesson.ts 잇기 | ✅(정의 자리는 T-63 승인대로 바뀜) | 열거 넷과 그 형의 정의는 `src/core/conversation/lesson-turns.ts:13-36` 에 하나씩만 있습니다. TalkHistoryEntry · TalkTeacher · englishHintTiersOf · teacherBlockOf 는 `src/core/ai/calls/talk-lesson.ts:200 · 208 · 318 · 658` 에만 있습니다(src · tests 전체 grep). talk-lesson.ts 는 `:54-64` 에서 열거 넷을 다시 내보내고, 옛 talk.ts 는 `:21-30` 에서 가져와 `:50-66` 에서 열두 이름을 다시 내보냅니다. HEAD 대비 talk.ts diff 를 보면, 지운 정의(teacherBlockOf 글, 열거 순서, englishHintTiersOf 몸)가 새 정의와 글자까지 같습니다. 그래서 옛 흐름 동작은 그대로입니다. `lesson-flow.ts:17-28` 의 바뀐 것은 TalkTurnSegment 가져오기 한 줄뿐입니다. `pnpm check:deps` 는 제가 다시 돌려 위반 0 을 보았습니다(281 모듈, `.dependency-cruiser.cjs:114` tsPreCompilationDeps 참이라 형 가져오기도 셉니다). |
| (나) 고정부가 C195 칸을 읽음 | ✅ | `talk-lesson.ts:89` 의 Pick 에 칸이 있고, `:668-679` koExplainRule 이 칸 값으로 서수를 고릅니다. 옛 'at levels 1-4 … from level 5' 문장은 없습니다. hints.ts 는 `:245-251` 에서 같은 칸을 `stuckInSlot >= from` 으로 읽습니다. 그래서 두 자리가 한 칸을 읽고 코드에 단계 경계가 없습니다(C195, `specs/10-결정-기록.md:365`). 실시드 12행은 1~4단계 1 · 5~12단계 2 이고, 견본 입력 `tests/fixtures/ai/talk-lesson-inputs.ts` 의 3 · 4단계 1 · 5 · 10단계 2 와 같습니다(직접 셈). 시험 `talk-lesson-call.test.ts:1148-1163` 은 3 · 4단계 'first', 5단계 'second' 를 보고, 칸 값만 바꾸어도 문장이 바뀌는 것을 봅니다. |
| (다) 묶음 6 N-3 · N-4 | ✅ · Minor M-1 | N-3 은 `talk-lesson.ts:738 · 748` 두 문장 끝이 '(when Question: yes)' 입니다. N-4 는 `:1211-1223` 에서 1~3단계 AI 차례의 받침 둘째이면 model_line 을 비우고 choices 는 남깁니다(02-2:260 둘째 줄과 같음). 시험 입력에 'I play with my friend.' 를 넣었으므로 옛 코드에서는 실패합니다. 다만 새 단어 거르기가 비우기 앞의 원래 글을 봅니다(M-1). |
| (라) 다음 항목 고르기를 실행 열쇠로 | ✅ | 실행 셈은 `lesson-flow.ts:241-245`(asked)과 `:897`(blocked)이고, 둘 다 `turnQuestionOf` 의 마지막 물음표 문장을 `questionKeyOf` 로 만든 열쇠입니다. 새 `question-check.ts:64-66` cardQuestionKeyOf 는 같은 함수를 kind null(AI 차례와 같은 갈래, `:56`)로 불러 같은 열쇠를 냅니다. `chances.ts:196-205` usable 과 `check-talk.ts:640` 이 이 함수 하나를 씁니다. 'You are hungry. What do you do?' 에 막히면 blocked 는 'what do you do' 입니다(흐름 시험 `talk-lesson-flow.test.ts:596` 이 마지막 물음표 문장 열쇠임을 고정함). 'You are thirsty. What do you do?' 의 열쇠도 같아서 slotChanceOf · oldestMoreOf 둘 다 건너뜁니다. 꼬리가 다른 항목은 고릅니다(`talk-chances.test.ts:305-314`). 같은 질문 상한도 꼬리로 셉니다(`:316-321`). 카드 질문은 화면 글 끝에 붙으므로(`lesson-flow.ts:476-490`) 카드 자리 행의 셈 `turnQuestionOf(card_slot)` 끝 문장과도 같은 열쇠입니다. |
| (마) '5-나' N-1 | ✅ · Minor M-2 | `hints.ts:273-277` 의 계획 사실은 `move.kind === "ai"` 일 때만 씁니다. 4단계부터의 받침 · 닫기 · 들리지 않음 계획은 모두 AI 차례이므로 M-1 의 뜻이 그대로 남습니다. 근거는 같이 말하기 `lesson-flow.ts:782`, 셋째 닫기 `:796`, 들리지 않음 `:822`, 인사 `:675 · 685`, 인사 끝 `:726` 입니다. 4단계부터 카드 자리가 되는 길은 대화 중 짧은 준비를 여는 자리(`:752-761`) 하나이고, 그 자리는 답이 있으면 app 에 answer_example 을 싣습니다. 그래서 카드 자리를 app · sound 로만 보아도 빠지는 것이 없습니다. 시험 `talk-lesson-hints.test.ts:310-327` 은 옛 코드에서 실패하는 세 경우를 봅니다. |
| 선택 6 | ✅ | `talk-lesson-hints.test.ts:202-204` |
| 컨트롤러 고침(T-56) | ✅ | `check-talk.ts:7` 이 cardQuestionKeyOf 를 가져오고 `:618-650` 이 그 열쇠로 셉니다. 옛 `sameQuestionKeyOf` 는 남지 않았습니다(grep). 단계 평가 겹침용 `questionKey`(`:80-82`)는 T-56 대로 그대로입니다. 시험 `seed-validator-talk.test.ts:558-570` 은 꼬리 같음과 꼬리 다름을 둘 다 봅니다. 실패 먼저 보기는 돌리지 않았지만, 옛 열쇠는 글 전체(`:80-82`)였습니다. 그래서 세 장면 글이 달라 걸리지 않으므로, 꼬리 같음 단언은 옛 코드에서 실패합니다. 워크트리에는 회화 시드 카드 파일이 없습니다(`seed/lessons/talk` 없음). 따라서 더 엄격해진 검증기가 깨뜨릴 기존 시드도 없습니다. |

⚠️ diff 만으로 확인하지 못한 것: biome 0 · 단위 1720 · tsc 0 · spec:trace · check:ids 는 보고의 주장으로만 받았습니다. 먼저 실패를 본 출력(`hints-red.txt` · `chances-red.txt` · `call-red.txt`)은 구현자 스크래치패드에 있어 보지 못했습니다. 다만 시험 아홉(힌트 1 · 기회 3 · 호출 5)은 모두 옛 코드에서 실패하는 입력임을 코드로 확인했습니다.

## 2. 잘한 점

- 순환을 피하려고 정의를 잎 모듈로 내리고, 두 겹의 다시 내보내기를 두어, 옛 talk.ts 를 가져오는 파일 열아홉(옛 흐름 순수 모듈 둘 · 서버 다섯 · 시험과 견본 열둘)을 고치지 않고 두었습니다. 지운 정의가 새 정의와 글자까지 같아 옛 흐름 동작이 바뀌지 않습니다.
- (나)는 칸이 없으면 hints.ts 와 같은 꼴로 던져, 조용한 기본값으로 단계 경계가 돌아오지 않게 했습니다. 시험이 '칸 값을 바꾸면 문장이 바뀐다'를 따로 단언해, 단계 번호로 고른 것이 아님을 증명합니다.
- (라)에서 열쇠 함수를 하나로 모아 앱과 검증기가 같은 함수를 부릅니다. sameQuestionHit 를 열쇠 꼴로 나누면서 기존 동작도 지켰습니다.
- N-4 시험 입력에 답을 넣어, 늘 참이던 단언을 뜻을 증명하는 단언으로 바꿨습니다.

## 3. 지적

### Critical · Important

없습니다.

### Minor

**M-1. 받침 둘째에서 비운 따라 할 말에만 든 새 단어가 '꺼냄'으로 남습니다(N-4 고침이 만든 어긋남).**
- 무엇: `talk-lesson.ts:1206-1210` 의 새 단어 거르기는 AI 의 원래 `a.model_line` 에 든 낱말도 꺼낸 것으로 봅니다. 그런데 `:1214-1223` 은 1~3단계 받침 둘째에서 그 줄을 비웁니다. 그래서 AI 가 규칙(`:737`)을 어기고 새 단어를 따라 할 말에만 넣으면, 아이는 그 낱말을 듣지 못합니다. 그런데도 정규화 출력 new_words(`:1281`)에는 남습니다.
- 왜: new_words 는 move.intro 의 재료입니다(`move.ts:83` '이 차례에 꺼낸 새 단어(앱 확인 뒤)'). intro 가 있으면 `chances.ts:128 · 140-143` 이 그 낱말을 꺼낸 것으로 보아 기회 알림에서 뺍니다. 또 `hints.ts:286` 이 그 차례를 '답 예시를 들음'으로 봅니다. 그 결과 다음 아이 턴의 힌트 종류가 '영어'가 되고, 그 턴의 단원 단어가 '말했다'에서 빠집니다(02-2:263). 대체 줄 갈래(`:1222`)는 새 단어의 카드 따라 할 말로 채우므로 어긋나지 않습니다. 비우는 갈래만 어긋납니다.
- 어떻게: 거르기 앞에 남을 줄의 재료를 정합니다. 예를 들어 `const modelSource = low && aiTurn && chosen.supportStage !== SUPPORT_STAGE_EASY ? a.model_line : ""` 로 두고, 거르기와 `:1218` 조건이 모두 이것을 쓰게 합니다. 이러면 4단계부터 model_line 을 늘 비우는 경우(`:747`)의 같은 틈도 함께 닫힙니다. 시험 하나: 3단계 받침 둘째 입력에서 새 단어가 model_line 에만 있으면 new_words 가 빈 목록입니다.

**M-2. 계획 사실이 1~3단계 AI 차례에도 걸려, 답 소리 줄이 비었을 때 '답을 들었다'로 남습니다.**
- 무엇: `hints.ts:273-277` 은 kind 만 보고 단계 구간을 보지 않습니다. 그러나 주석 `:257` 은 '4단계부터 AI 가 선생님 말 안에 답을 주는 차례'라고 적었습니다. 1~3단계 AI 차례(같이 말하기 · 셋째 · 들리지 않음)는 답을 model_line 소리 줄로만 줍니다(`talk-lesson.ts:736 · 738`). 그래서 답을 들었다는 사실 기록은 move.sound · ai 이고, 이것은 aiGaveAnswer 없이도 `hints.ts:282-285` 에서 잡힙니다. 따라서 1~3단계에서 aiGaveAnswer 가 결과를 바꾸는 경우는 소리 줄이 비었을 때뿐인데, 그 판정은 틀립니다.
- 소리 줄이 비는 길: 1~3단계 같이 말하기가 AI 차례가 되는 것은 그 자리에 답 예시가 없을 때뿐입니다(`lesson-flow.ts:776-782`). 이때 대체 줄은 `turn.stuckAnswer`(`talk-lesson.ts:364` 의 `answerFallback ?? ""`, `:1097`)라 빈 글입니다. 그래서 AI 의 따라 할 말이 소리 줄 검사에 걸리면 아이는 아무 답도 듣지 못합니다. 셋째 · 들리지 않음의 AI 차례(T-46 의 드문 길)도 답이 없으면 같습니다. N-1 과 같은 결과(다음 턴 '영어' · '말했다' 빠짐)이고, 더 드문 길입니다.
- 어떻게: heardHelpsOfMove 에 단계 구간을 넘깁니다. 예를 들어 `heardHelpsOfMove(move, { low })` 로 받고 `aiGaveAnswer = !low && move.kind === "ai" && …` 로 둡니다. 지금 부르는 곳이 시험뿐이라(src grep) 묶음 8 이 잇기 전에 바꾸는 것이 가장 쌉니다. 시험 하나: 1~3단계에서 `{ kind: "ai", stage: 1, cause: "button", app: [] }` 이고 sound 가 없으면 빈 목록입니다.

**M-3. (선택) 고정부 문장의 '몇 번째 막힘'을 AI 가 보는 값(Support stage)으로 적으면 어림이 줄어듭니다.**
- 무엇: `talk-lesson.ts:678` 은 'from the {n} stuck on the same question' 입니다. 그러나 사용자 메시지가 AI 에 주는 것은 막힘 수가 아니라 'Support stage' 줄입니다(`:852-858`). 구현자 우려 2 와 같은 한계이고 옛 문장에서 생긴 것이 아니라서 회귀는 아닙니다.
- 어떻게: 예를 들어 'When Reason is button or stuck and Support stage is {from} or above, write a short Korean explanation in explanation.' 로 적습니다. 막힘 수 1 · 2 와 받침 단계 1 · 2 는 같은 값이고, 셋째 닫기는 막힘 수가 받침 단계 이상입니다. 짧은 준비를 여는 자리(`lesson-flow.ts:753`)만 막힘 수보다 높은 받침 단계 3 을 싣습니다. 그래도 거기서 생기는 설명은 앱이 koExplanationShownOf 로 가리므로(`hints.ts:250-251`) 해가 없습니다.

**M-4. (선택) 같은 층 모듈은 정의 자리 lesson-turns.ts 에서 가져오는 편이 순환 여지를 줄입니다.**
- 무엇: `hints.ts:3` 은 TalkHeardHelp · TalkHintKind 를 talk-lesson.ts 의 다시 내보내기로 가져옵니다. 그런데 talk-lesson.ts 는 lesson-flow.ts 를 가져옵니다(`talk-lesson.ts:22`). 그래서 뒤 묶음에서 lesson-flow · chances · lesson-turns 가운데 하나가 hints.ts 를 가져오면 hints → talk-lesson → lesson-flow → hints 순환이 생깁니다. 지금은 없습니다(check:deps 0).
- 어떻게: core/conversation 안의 모듈은 lesson-turns.ts 에서 가져오고, 바깥(서버 · 화면)만 talk-lesson.ts 로 가져오게 합니다. plan 163줄의 뜻(바깥은 새 파일에서 가져온다)은 그대로입니다.

### 시험 손질(Minor 아래, 고치지 않아도 됨)
- (라)는 흐름 시험(blocked 가 꼬리 열쇠, `talk-lesson-flow.test.ts:596`)과 기회 시험(usable 이 꼬리 열쇠)이 따로 증명합니다. `nextTeacherTurnOf` 로 'You are hungry. What do you do?' 에 세 번 막힌 뒤 꼬리가 같은 더 이야기할 거리를 건너뛰는 시험 하나를 더하면, 브리프가 든 장면이 한 시험에서 닫힙니다.

## 4. 구현자 우려 판정

- **SUPPORT_STAGE_EASY = 2 가 두 곳에 있는 것**: 지금 어긋날 위험은 없습니다. 둘 다 3.3 막힘 표의 줄 번호이고 설정값이 아닙니다. move 스키마 stage 0~3(`move.ts:51 · 76`)과 고정부 글 'Support stage: 1 = … 2 = … 3 = …'(`talk-lesson.ts:702`)가 같은 번호를 씁니다. 번호를 바꾸려면 고정부 글까지 함께 바꿔야 하므로, 한쪽만 조용히 바뀔 일은 적습니다. 묶음 12 에서 move.ts 에 공용 상수로 모으자는 제안에 동의합니다. 그때 `lesson-flow.ts:56-58` 의 셋과 `hints.ts:275` 의 맨 숫자 1 도 함께 모으기를 권합니다.
- **칸 없는 행에서 던지는 것과 N-2**: 이제 던지는 자리가 둘입니다(`hints.ts:246-249`, `talk-lesson.ts:673-676`). 둘 다 그냥 `Error` 라서 서버의 설정 문제 갈래 `isConfigError`(`src/server/ai/run.ts:137-147`, ZodError · CallSettingError 등)에 들지 않습니다. 그 갈래 밖의 오류는 다시 던집니다(`run.ts:316 · 368`). T-60 · T-65 대로 새 꼴 카드가 칸과 함께 처음 적재되는 개정 3 규격과 짝이라면, 지금은 닿지 않는 길입니다. 다만 묶음 8 이 talkLessonSystem 을 서버 턴에 이으면, 칸 없는 행이 걸린 세션은 매 턴 이 길로 던지고 'AI 쉬는 중'(8절)으로 가지 않습니다. N-2(새 흐름이 좁힌 스키마로 읽어 ZodError 로 막기)를 하면 두 던짐이 모두 닿지 않는 코드가 되고 형에서 칸을 필수로 바꿀 수 있습니다. 그래서 N-2 를 묶음 12 에 두더라도 이 관계는 묶음 8 브리프에 한 줄 적어 두길 권합니다.

## 5. 범위 밖 관찰

- 고정부에는 단계 규격 칸이 정하는 것을 단계 번호로 적은 문장이 둘 더 있습니다. `talk-lesson.ts:740` '(level 3 adds an English frame first)' 는 hintTiers 가 정하고, `:749` 'next_usable_phrases (levels 5-6)' 는 usablePhrases 가 정합니다. 지금 실시드 값(3단계 hintTiers 에 frame, 5 · 6단계 usablePhrases 3 · 2)과 맞으므로 지적하지 않습니다. C195 와 같은 종류라 칸 값을 바꾸는 결정 때 함께 볼 자리입니다.
- 묶음 8 에 넘길 것: 한국어 설명을 보일지는 koExplanationShownOf(`hints.ts:236-252`)가 정합니다. 고정부 문장은 AI 에게 주는 안내일 뿐입니다. 서버 턴 길이 이 함수로 설명을 걸러야 C195 가 화면에서도 지켜집니다.

## 6. 라운드 판정

**Approved(첫 검토).** (가)~(마) · 선택 6 과 컨트롤러 고침은 설계대로입니다. Minor 넷 가운데 M-1 · M-2 는 정규화와 heardHelpsOfMove 안의 작은 고침(각 한두 줄과 시험 하나)이라, 컨트롤러가 직접 고치거나 묶음 8 브리프에 넣을 수 있습니다. M-3 · M-4 는 선택입니다.
