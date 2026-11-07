# 검토 보고: 회화 plan 묶음 '5-나' 앞 차례(할 것 1 · 2, N-1 · N-2)

검토자 rev-talk-5(Opus · xhigh), 2026-10-30 10시대입니다. 읽기 전용이고, 파일 경로는 워크트리 `.claude/worktrees/p13d` 기준입니다. 단위 시험은 다시 돌리지 않았습니다. 확인한 것은 셋입니다. 옮기기 전 flow.ts 사본(스크래치패드 `flow.before-5b.ts`)과 지금 flow.ts · spoken.ts 를 줄 단위로 견주었고, 워크트리 `tsc --noEmit` 을 돌렸으며(지금 종료 0), 옛 시험 파일의 수정 시각을 봤습니다.

**판정: Changes requested.** Important 1 · Minor 4 입니다. 옮김과 N-1 · N-2 는 그대로 받아들일 수 있습니다. 막는 것은 한국어 설명의 단계 경계 상수 하나(I-1)이고, 고칠 길은 컨트롤러가 정해야 합니다.

## 1. 옮김이 '동작 그대로'인지

| 볼 것 | 결과 | 근거 |
|---|---|---|
| 옮긴 이름 · 몸통 | ✅ | flow.ts 에서 빠진 줄 146 가운데 spoken.ts 에 글자 그대로 없는 줄은 `export type TalkSegment …` 하나입니다. 이 줄은 flow.ts 안에서 자리만 옮겼습니다. spoken.ts 에만 있는 줄은 머리 주석 둘과 절 머리 하나뿐입니다. 도우미(spokenWords · holds · AnswerPair)도 내보내지 않는 그대로입니다. |
| AppendLine 함께 옮김 | ✅ 받아들임 | shownTurnOf 의 매개 형이라 남기면 spoken.ts → flow.ts 가져오기가 생겨 순환이 됩니다. flow.ts 는 `:11` 에서 형으로 가져다 씁니다. |
| flow.ts 다시 내보내기 | ✅ | `src/core/conversation/flow.ts:21-31` 이 옛 flow.ts 의 내보낸 이름 여덟(MORE_PROMPT · AppendLine · normalizeSpoken · SAME_SAYING_MIN_WORDS · sayingAnswer · createAnswerHold · shownTurnOf · toriKoShownOf)을 모두 다시 내보냅니다. 옛 가져오기(server 셋 · hints.ts · 통합 둘 · 옛 단위 넷)는 고치지 않았고 tsc 가 0 입니다. |
| 옛 시험 기대값 | ✅ | talk-hold · conversation-said 는 10-23, talk-repeat 는 그 앞, conversation-flow 는 10-30 08:39(묶음 3)에 마지막으로 바뀌었습니다. 이 묶음(09:4x~09:5x)은 옛 시험을 고치지 않았습니다. `tests/unit/talk-spoken.test.ts:9-18` 은 두 자리가 같은 값(toBe)인지를 봅니다. |
| 새 모듈 가져오기 | ✅ | `question-check.ts:6` · `lesson-flow.ts:45` · `tests/unit/talk-lesson-flow.test.ts:20` 이 spoken.ts 를 씁니다. |

## 2. 새 꼴 갈래와 정본

| 함수 | 판정 | 근거 |
|---|---|---|
| lessonHintTiersOf(`hints.ts:194`) | ✅ | 카드 항목 턴은 카드 힌트, 카드 항목이 없는 턴은 AI 힌트, 둘 다 없으면 단추 없음(정본 02-2:206 · 318). 단 수 · 차례는 단계 규격 hintTiers 를 따르고, 6~9단계 다시 묻는 턴은 뜻이 맨 앞(02-2:320, C20)입니다. 10~12단계는 [] 이고, 1~3단계 영어 문장 단에는 듣기 단추가 붙습니다(02-2:318). 옛 꼴은 AI 힌트를 먼저 썼고 새 꼴은 카드를 먼저 쓰는데, 이것은 C189 의 바뀐 규칙과 맞습니다. 단계 규격 형은 M-3. |
| koExplanationShownOf(`hints.ts:243`) | ✅ 동작 · ❌ 값 자리 | 단추 · 막힘 말 차례에서만, 1~4단계 첫 막힘 · 5단계부터 둘째 막힘(02-2:263)이고, 들리지 않음 · 말로 답한 차례는 거짓입니다. 단계 경계의 자리는 I-1. |
| 힌트 마지막 단 | ✅ | 새 함수 없이 openedTierCount 에 위치의 stuckInSlot 을 넘깁니다. stuckInSlot 은 들리지 않음을 세지 않으므로 '같은 질문 자리의 둘째 막힘부터'(02-2:263)와 맞습니다. |
| heardHelpsOfMove(`hints.ts:264`) | ✅ · M-1 | 1~3단계 서버 소리 줄(app together · answer_example · model_line · choices, sound), AI 소리 줄(ai · sound.model), 꺼내기(intro, 02-2:180)를 들은 도움으로 봅니다. 쉬운 질문(easy_question)은 답이 아니라 빠집니다. 4단계부터 AI 가 말로 답을 준 차례는 M-1. |
| countsAsSaid prep · floor(`said.ts:119-120`) | ✅ | 짧은 준비 · 바닥선 듣기 활동의 따라 말하기는 '말했다'가 아닙니다(02-2:175 · 267). |
| lessonWrapUpFollowOf(`wrap-up.ts:155`) | ✅ · M-2 | 1~3단계 되짚을 말 전체를 한 번(02-2:208 · 정본 4절 정리 행 '말하기 버튼 하나로 한 번')이고, 4단계부터 · 줄이 없으면 [] 입니다. 뜻 이어 붙이기는 M-2. |
| lessonAgainLineOf(`wrap-up.ts:176`) | ✅ | 1~3단계는 둘째 장 없음(AC-15e)이고, 4단계부터는 옛 꼴과 같은 againFrom 입니다. 옛 againLineOf 는 같은 몸통을 부르므로 동작이 같습니다. |
| 옛 꼴 갈래 | ✅ | hintTiersOf · openedTierCount · hintKindOf · heardHelpOf · againLineOf 의 몸통은 그대로이고, 형 이름(V1)은 묶음 3 몫입니다. |

## 3. 지적

### Important

**I-1. 한국어 설명의 단계 경계(4)를 hints.ts 맨 위 상수로 박았습니다.**
- 무엇: `src/core/conversation/hints.ts:234 · 236` 의 `KO_EXPLAIN_EARLY_LAST_LEVEL = 4` · `KO_EXPLAIN_LATE_FROM_STUCK = 2` 입니다.
- 왜(판정): 13절 C54 (2)(`specs/10-결정-기록.md:204`)가 자리를 정해 두었습니다. '12절 키도 level_specs 칸도 아닌 꼴 · 구조 수는 `src/core/seed/structure.ts` 한 곳에 정본 절 주석과 함께 두고, 단계마다 다른 규칙(3.3 의 수 · 6.3 의 단계 경계)은 level_specs 칸으로 옮긴다'입니다.
  - '1~4단계 첫 막힘부터 · 5단계부터 둘째 막힘부터'(02-2:263)는 3.3 의 단계 경계입니다. 그래서 단계 규격 칸이 맞는 자리입니다. 회화 단계 규격이 같은 꼴의 단계 규칙을 이미 칸으로 둡니다(koMeaning · frameInTurns · turnImages · moreTalk · choices, `src/core/seed/schema/reference.ts:263-285`).
  - 둘째 막힘의 2 는 구조 수입니다. 같은 문장의 OPEN_ALL_HINTS_FROM_DONT_KNOW(`hints.ts:28`, 옛 코드)와 같은 결이라 상수로 둘 수 있습니다. 다만 원칙 자리는 structure.ts 입니다.
  - check:ids 의 design-number 47 이 그대로인 것은 맨 위 대문자 상수를 규칙으로 빼기 때문입니다(`scripts/check-ids.ts:500-520`). 4 는 설정값 열일곱 키와 같은 수라 그냥 글자로 썼으면 셈에 들었습니다. 이 빼기는 도구의 허용일 뿐 C54 (2)의 판정이 아닙니다. 단계 경계를 상수로 둔 앞선 예 PASSAGE_PICTURE_UNTIL_LEVEL 은 결정(C67)을 남기고 이름을 허용 목록에 적었습니다(`scripts/check-ids.ts:53-58`).
  - 같은 경계가 묶음 6 고정부 문장(`src/core/ai/calls/talk-lesson.ts:681` 'from the first stuck at levels 1-4 and from the second stuck from level 5')과 옛 고정부(`talk.ts:384`)에도 있습니다. 출처가 둘이 되어 학습 단계 개선(02-2:7, C157 · C159)으로 단계 경계가 움직이면 어긋납니다. 저장소 CLAUDE.md 'Things Claude gets wrong'의 '설계 숫자를 화면 · 코드에 그대로 박지 않는다'에 해당합니다.
- 어떻게(컨트롤러가 정함):
  - (가) 단계 규격 칸을 더합니다. 예를 들어 회화 행에 `koExplainFirstStuck: boolean`(1~4 참)을 두고 13절에 한 줄을 남깁니다. koExplanationShownOf 는 그 칸을 받고, 묶음 6 고정부의 문장도 같은 칸에서 만듭니다(C44 '고정부에 넣는 수도 고정부를 만들 때 읽는다'). 칸 · level-specs 행 · 검증기는 묶음 3 의 파일이고 개정 판이 드므로, 할 것 3(talk-lesson.ts 잇기) 차례에 함께 하는 것이 맞습니다.
  - (나) 예외로 둡니다. C67 처럼 결정 한 줄을 남기고, 두 상수를 OPEN_ALL_HINTS_FROM_DONT_KNOW 와 함께 structure.ts 로 옮깁니다. 그 파일은 지금 묶음 7 이 잡고 있으니 놓인 뒤입니다.
  - 권하는 쪽은 (가)입니다. 출처가 셋(hints.ts · 새 고정부 · 옛 고정부)이고, 단계 경계는 C54 (2)가 단계 규격으로 보낸 몫이기 때문입니다. 회화 행의 koMeaning(1~4 참)과 범위가 같지만 뜻은 다른 규칙이라(선생님 말 아래 뜻 · 막힘 뒤 설명), 같은 칸으로 묶을지는 요청자 확인이 필요합니다.

### Minor

- **M-1. 4단계부터 AI 가 말로 답을 준 차례가 '들은 도움'에서 빠질 수 있습니다.**
  - 무엇: heardHelpsOfMove(`hints.ts:264-286`)는 4단계부터의 같이 말하기(stage 1) · 받침 셋째 닫기 · 들리지 않음 닫기에서 move.ai(AI 의 support 자기 보고)에만 기댑니다. 이런 차례는 move.app 이 비어 있습니다(`lesson-flow.ts:782 · 796 · 822`).
  - 왜: 묶음 6 고정부는 이 차례에 답을 tori_en 에 쓰라고만 하고(`talk-lesson.ts:722` 'say the answer once'), support 값은 정하지 않습니다. AI 가 support 를 none 으로 내면 다음 아이 턴이 '영어'가 되지 않아 '말했다'(3.4)에 듭니다. 정본 02-2:263 은 '답 예시 · 같이 말하기의 답을 들은 뒤의 턴은 힌트 종류가 영어다'입니다.
  - 어떻게: 계획이 정한 사실(move.stage 1 · 3, cause nospeech)이면 answer_example 로 보고 시험을 하나 더합니다. 4단계부터의 몫이라 둘째 프리뷰 전이면 됩니다.
- **M-2. 정리 따라 말하기의 뜻 줄이 영어의 일부만 덮습니다.**
  - 무엇: `wrap-up.ts:163-171` 은 뜻이 있는 줄만 이어 붙입니다. 그런데 wrapUpLinesOf 는 되풀이 문장(recast)에 뜻을 두지 않으므로(`wrap-up.ts:42-46`), 영어는 두 문장인데 뜻은 카드 정리 대사 하나뿐인 꼴이 됩니다. 시험(`tests/unit/talk-lesson-wrap.test.ts:21-27`)이 그 꼴을 그대로 단언합니다.
  - 왜: 화면이 이 뜻을 따라 말할 글 아래 보이면 아이에게 영어와 맞지 않는 뜻이 됩니다. 정본 4절 정리 행은 줄마다 말풍선을 보이고 따라 말하기는 버튼 하나라, 따라 말하기 항목의 뜻은 정하지 않았습니다.
  - 어떻게: 모든 줄에 뜻이 있을 때만 붙이거나, 따라 말하기 항목에는 뜻을 두지 않고 줄마다의 뜻을 화면이 씁니다.
- **M-3. 힌트 쪽 단계 규격 형을 손으로 적었습니다.** `hints.ts:181-185` 의 LessonHintSpec 을 `Pick<TalkLevelSpec, "band" | "hintTiers" | "usablePhrases">` 로 두면, lesson-turns.ts 처럼 묶음 3 의 형이 바뀔 때 tsc 가 잡습니다.
- **M-4. 시험 손질.**
  - (1) 'AC-15h 6단계 처음 묻는 턴의 첫 단은 영어 틀 …'은 ai 를 넘기지 않아 AC-15h 의 'AI 출력과 관계없이'를 보지 않습니다. 카드 항목과 AI 힌트를 함께 넘겨 첫 단이 카드 영어 틀인지 봅니다.
  - (2) 'AC-15h 소리 줄을 들은 턴은 … '말했다'가 아니다'는 hintKindOf 만 봅니다. saidWordsOf 를 함께 부르거나 이름을 줄입니다.
  - (3) AC-15h 의 '8단계 다시 묻는 턴에서 두 번 누르면 뜻 다음 영어 틀'은 시험이 없습니다(hintTiers ['frame'] · re_ask).
  - (4) talk-lesson-wrap 의 'AC-15e 4단계는 마지막 되풀이 문장 …'은 문장 내용을 보는데, AC-15e(정본 11절 165줄)는 장의 차례 · 둘째 장 유무를 정하므로 표지가 넓습니다.

## 4. N-1 · N-2

| 지적 | 판정 | 근거 |
|---|---|---|
| N-1 | ADDRESSED | `lesson-flow.ts:700-706` 주석이 '막힘 말이면 몇 번째 막힘이든 닫기(stage 3)'와 그 까닭(말 입력은 막힘 판단 전에 인사 끝)을 적었습니다. 시험 `talk-lesson-flow.test.ts:727-754` 가 teacherTurnPlansOf 의 두 계획(ai · stage 0 / card_slot · stage 3 · cause stuck · 답 소리 줄)을 단언합니다. |
| N-2 필수 칸 | ADDRESSED | `LessonArgs.prepWords`(`lesson-flow.ts:83`)가 필수입니다. 시험 `talk-lesson-flow.test.ts:90-99` 의 `@ts-expect-error` 는 칸이 다시 선택이 되면 '쓰이지 않은 expect-error'로 tsc 가 실패하므로 양쪽을 지킵니다. |
| N-2 이름 · 뜻 | ADDRESSED | talkChancesOf 의 칸도 prepWords 입니다(`chances.ts:99 · 107-113`). 두 자리 주석이 '인사 뒤 준비 토막을 실제로 지났을 때 쪽지로 보인 낱말 전부(건너뛴 낱말 포함) · talk-start 스냅숏 목록이 아님 · 낱말 수 설정과 다른 칸'을 적었고, 설정을 읽는 자리(`lesson-flow.ts:748`)에도 한 줄이 있습니다. 나란히 도는 묶음 7 의 `src/server/conversation/state.ts:1522 · 1541-1549` 가 talk-prep 시도로 모은 낱말(prepWordsShownOf)을 이 칸에 넘기고 있어, 묶음 8 이 넘길 값도 분명합니다. |
| 재검토 표지 | ADDRESSED | 1~3단계 when_needed 시험 둘의 표지가 '정한 것 17'입니다. |

## 5. 시험의 질

- 새 시험 열여덟(talk-spoken 2 · talk-lesson-hints 11 · talk-lesson-wrap 5)이 갈래마다 양쪽을 대체로 봅니다. 카드 항목 · AI 힌트 · 둘 다 없음, 1~4 · 5단계 경계의 참 · 거짓, 들리지 않음 · 말로 답함의 거짓, 둘째 막힘의 다 열림과 첫 막힘의 0, 쉬운 질문은 들은 도움이 아님, 1~3단계와 4단계부터가 그렇습니다.
- 옮김의 증명은 옛 시험이 그대로 통과하는 것이고, 새 시험은 두 자리가 같은 값임을 toBe 로 봐 다시 내보내기가 감싸기로 바뀌는 것도 잡습니다.
- 빠진 쪽과 표지는 M-4 입니다.

## 6. 범위 밖 관찰

- 할 것 4(선택)를 하지 않은 까닭(견본 카드가 새 꼴 칸 전부를 채워야 함)은 받아들일 만합니다. expectTypeOf 가 맞춤을 지킵니다.
- 구현 보고 우려 1(AI 가 설명을 쓰는 고정부 규칙과 앱 판정의 값이 같은가)은 I-1 (가)로 한 출처가 되면 풀립니다. 할 것 3 브리프에 넣길 권합니다.

## 7. 판정

**Changes requested.** I-1 은 컨트롤러가 (가) · (나)를 정한 뒤 반영합니다. (가)면 할 것 3 차례에 단계 규격 칸과 함께, (나)면 결정 한 줄과 structure.ts 가 놓인 뒤입니다. Minor 넷은 같은 차례에 넣거나 컨트롤러가 직접 고칩니다. 옮김(할 것 1)과 N-1 · N-2 는 그대로 닫아도 됩니다.
