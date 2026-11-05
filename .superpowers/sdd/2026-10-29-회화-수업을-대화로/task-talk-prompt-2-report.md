# 구현 보고: 회화 턴 프롬프트 · 흐름 규칙 고침 2(구현자 impl-talk-prompt-1 · Opus · high, 2026-11-06 00:4x)

상태: DONE_WITH_CONCERNS. 할 것 1~5 를 모두 했고 관문 넷은 0 이다. 우려 셋은 7절에 있다. 가장 큰 것은 '새 규칙 먼저 실패 확인'을 지키지 못한 점(U1)이다.
워크트리 `.claude/worktrees/p13d`(HEAD b462c21). 커밋 · push · 개발 DB 쓰기 · 실호출 없음. `scripts/talk-observe.ts` · 카드는 손대지 않았다.

## 1 관문

| 명령 | 결과 |
|---|---|
| `pnpm biome ci` | 590 파일, 오류 0 |
| `pnpm tsc --noEmit -p .` | 오류 0(도구 `scripts/talk-observe.ts` 포함) |
| `pnpm vitest run --project unit` | 146 파일 · 1875 통과 · 6 todo · 실패 0(고침 1 뒤 1861 → 새 시험 14) |
| `pnpm check:ids` | exit 0 · design-number 47 그대로 |

## 2 항목별 바꾼 곳 · 대조한 정본

| 할 것 | 바꾼 곳(워크트리 줄) | 대조 |
|---|---|---|
| 1 (가) 막힘 경계 프롬프트 | `talk-lesson.ts` 778 · 779(막힘 경계 · 'If stuck' 은 비상 계획), stuck 칸 설명 529 | 02-2:251 · 194 · 196, C204 (1)(2) |
| 1 (나) 아이 말 갈래 칸 | 응답 첫 칸 `child_kind` 520(enum 다섯), 느슨한 규격 · 정규화 1419(effectiveStuckOf 로 막힘을 다시 봄 — 계획 고르기 · '말했다' 칸 모두 이 값), 끝맺음은 'answer' | C204 (3) |
| 1 앱 쪽 다시 보기 | 새 순수 모듈 `src/core/conversation/child-kind.ts`(isDontKnowSaying 58 · isEnglishSaying 69 · effectiveStuckOf 81). 흘려 받기 `stream.ts` CHILD_KIND_KEY 21(child_kind 가 stuck 앞에 와도 흘려 보냄 · childKind()), `server/ai/talk.ts` kit.stuckOf 338 · tellStuck 459(onStuck(stuck, overridden)) | C204 (3) |
| 1 막힘을 무른 턴 | `lesson-turn.ts` 2007(1~3단계에서 앱이 막힘을 물렀고 아직 보낸 문장이 없으면 이 응답 문장을 모두 잡아 둠), withQuestionRetry rewrite 1407 · 2049(통째로 다시 쓰기 — `question-retry.ts` stuckRewriteNoteOf 85 · mergeQuestionRetry whole 126). 다시 쓰지 못하면 잡아 둔 앞 응답 문장을 끝 처리가 내보낸다 | C204 (3) '되묻기 차례로 둔다' |
| 2 설명 · 뜻의 영어 문장 | 프롬프트 804(쓰지 않음 · 평하지 않음) · 설명 칸 559, `spoken.ts` withoutEnglishSentencesOf 151, 정규화 1542(1~3단계만 설명과 뜻 문장마다 거름 — 뜻 자리는 남김) | 02-2:204 · 235 · 253, T2, C204 (4) |
| 3 받침 닫기 | 프롬프트 780(받침 3 예 'Let's move on.') · 835(카드 자리 예를 받침 1 · 3 으로 나눔), `lesson-turn.ts` 656(1~3단계 받침 셋째 · 들리지 않음 차례의 신호 말을 지움 — 까닭 'together') | 02-2:261, C204 (5) |
| 4 카드 답 뒤 | 프롬프트 768('In this turn next_move can never be required.'), `talk-lesson.ts` cardChainGuardOf 1394(앞 차례가 카드 기회인 턴의 required 갈래를 follow_up 으로 되돌리고 카드 항목을 비움) | C204 (6) · C202 (2) |
| 5 Minor | M-1 789(인사 끝 예 셋 · 뜻 말투 예), M-2 783(들리지 않음 카드 자리는 짧은 한 줄만), M-4 762(바른 말을 단원 단어로 바꾸지 않음), M-7 840 · 4단계 갈래 줄(힌트는 자기 질문의 답), I-5 759(반응 예 'Me too!' · 'Yum!') | 02-2:169 · 184 · 198 |

## 3 새 응답 칸 · 순수 함수 서명(impl-talk-13 이 도구에 맞출 것)

```ts
// 응답 규격: 첫 칸 child_kind(stuck · tori_en 앞). 표본 JSON 19개 · e2e/통합 견본에 넣음(막힘 참이면 not_understood, 아니면 answer)
child_kind: "answer" | "new_topic" | "short_related" | "not_understood" | "unrelated_words"
// src/core/conversation/child-kind.ts
export const TALK_CHILD_KINDS; export type TalkChildKind;
export const STUCK_CHILD_KINDS: ReadonlySet<TalkChildKind>;   // not_understood · unrelated_words
export const ENGLISH_SAYING_MIN_WORDS = 2;
export function childKindOf(value: unknown): TalkChildKind | undefined;
export function isDontKnowSaying(text: string): boolean;
export function isEnglishSaying(text: string): boolean;
export function effectiveStuckOf({ aiStuck, childKind, child, input }): boolean;  // 무르기만 함
// src/core/conversation/stream.ts — reader.childKind(): string | undefined, CHILD_KIND_KEY
// src/core/conversation/spoken.ts — withoutEnglishSentencesOf(text: string): string
// src/core/conversation/question-retry.ts — stuckRewriteNoteOf(child: string): string;
//   mergeQuestionRetry<V, E extends RetrySentence>({ ..., whole?: boolean }) — RetrySentence.reason 는 string 으로 넓힘(도구 Entry 꼴이 그대로 들어감)
// src/core/ai/calls/talk-lesson.ts — cardChainGuardOf({ nextMove, afterCardChance }): { nextMove; dropCardItem }
// src/server/ai/talk.ts — TalkCallContext.onStuck?: (stuck: boolean, overridden: boolean) => void  (stuck 은 앱이 다시 본 값)
// src/server/conversation/lesson-turn.ts — withQuestionRetry({ ..., rewrite?: { child: string } | null })
```
도구가 서버를 흉내 내려면 두 가지를 더해야 한다. 하나는 onStuck 의 overridden 이 참이고 보낸 문장이 없으면 문장을 잡아 두는 것이다. 다른 하나는 rewrite 로 withQuestionRetry 차례를 부르는 것이다. 정규화(막힘 다시 보기 · 영어 거름 · 갈래 되돌림)는 같은 core 함수라 도구에 그대로 든다.

## 4 프롬프트 바뀐 부분 전문

- 반응: "… a short reaction of at most four words (e.g. 'Oh, soccer!', 'Me too!', 'Yum!')."
- 되풀이 끝에 더함: "If the child's sentence is already correct, do not change its words (never swap in a unit word); just react."
- 카드 답 뒤: "When 'Previous turn was a card chance: yes' and the child answered, your next question must follow up on the child's answer (next_move follow_up). In this turn next_move can never be required. Bring up the next card chance only in a later turn, when the child's words reach it."
- 막힘(옛 'Decide stuck first. …'을 둘로): "Decide child_kind first, then stuck. stuck is true only for not_understood or unrelated_words. A meaningful English sentence is never stuck, even about another topic: it is new_topic, so react and follow it (next_move follow_child), e.g. 'I have a dog.' or 'My dog is big.'. One word from the question or today's scene is never stuck: it is answer or short_related, so say back one correct sentence with it, e.g. 'Rice.' -> 'You eat rice!' or 'Cold.' -> 'Yes, the juice is cold!'. stuck is true for e.g. 'Huh?' or 'I don't know.', or 'Blue car.' when the question and the scene are about lunch." / "When Input is speech and you set stuck to true, follow the 'If stuck' lines instead of Turn, Question, Card line, Support stage and Stuck question. The 'If stuck' lines are only a backup; most answers are not stuck."
- 받침: "… 3 = the answer once and then the next topic ('That's okay! Let's move on.'), with no saying it together."
- 들리지 않음 끝에 더함: "When Turn is card_slot after nospeech, write only that short line: no answer and no question."
- 인사 끝: "… (short preparation: e.g. 'Good to hear! Let's learn some new words!', 'Yay! New words time!' or 'Nice! Let's learn some new words!'; talk: e.g. 'Let's talk!'). Do not ask a question. Its tori_ko is natural child talk (e.g. '다행이다!', '잘 지냈다니 좋다!')."
- 더함: "In explanation and tori_ko, never write an English sentence or the English answer in letters (the app plays the English as sound). One English word with its Korean meaning is fine. Never say the child's words were wrong or not a right answer."
- 1~3단계 카드 자리: "… Write only a short reaction or cue: at Support stage 1 'That's okay! Let's say it together.'; at Support stage 3 or after nospeech 'That's okay! Let's move on.' (never 'say it together' there: the child does not repeat). Do not write the answer or a question."
- 힌트(1~3 · 4단계부터 둘 다): "… for your next question; the hints and the answer example answer your own next question, not an earlier card question."
- 칸 설명: child_kind(갈래 다섯과 예, 말 입력이 아니면 not_understood) · stuck "True only when child_kind is not_understood or unrelated_words" · explanation "… at most one English word with its meaning, never an English sentence or the English answer, and never judging the child's words. …"

## 5 덮는 시험

새 `tests/unit/talk-prompt-fix2.test.ts` 12건: 모름 · 영어 말 가리기 · effectiveStuckOf 갈래별 · 정규화 대본 장면('I have a dog.' · 갈래 없는 'Yes big fish.' · 'Rice.' · 'Huh?') · 흘려 받기 child_kind · 막힘 무른 턴 통째로 다시 쓰기와 못 할 때 앞 문장 내보내기 · 영어 문장 거름(함수 · 1~3단계 정규화 · 4단계 그대로) · 받침 셋째 · 들리지 않음 신호 말 지움 · cardChainGuardOf와 정규화 · 고정부 문장 셋. `talk-stream-call.test.ts` 1건(흘려 받는 중 onStuck 이 '막힘 아님 · 무름'을 첫 문장보다 먼저 알림).
바꾼 기존 시험: 칸 차례(child_kind 가 맨 앞) 두 곳, 'Decide child_kind first, then stuck.', 대화 첫 질문 답 다음 차례의 required → follow_up(C204 (6)), 고침 1 시험의 두 문장(세게 고친 카드 답 규칙 · 인사 끝 예), stream 시험의 막힘 견본(갈래 not_understood) · 첫 문장 끊는 자리.

## 6 talk:observe 로 볼 것(3회차)

1. 막힘 판정 틀림 0인지 본다. child-topic 2 · 4, preview-1 7, word-answers 2 · 5 다섯 자리와 같은 입력 두 번을 본다. AI 의 child_kind 와 앱이 무른 횟수(onStuck overridden)를 함께 센다.
2. 막힘을 무른 턴에서 통째로 다시 쓰기가 이어 묻기가 되는지, 그 지연(재호출 한 번)을 본다.
3. 설명 · 뜻에 영어 문장이 0인지 본다. 걸러 낸 뒤 설명이 빈 글이 되는 빈도도 본다(빈 설명은 보이지 않음).
4. 받침 3 · 들리지 않음 차례에 'say it together' 꼴이 없는지, 카드 답 뒤 required 갈래가 0인지(앱이 되돌린 횟수) 본다.
5. 인사 끝 다섯 대본의 글이 갈리는지 본다.

## 7 우려

- U1 **'새 규칙은 먼저 실패 확인'을 지키지 못했다.** 구현을 먼저 하고 시험을 뒤에 썼다. 새 시험 14건은 모두 지나지만 먼저 실패하는 것을 돌려 보지 않았다. 새 모듈(child-kind) · 새 칸(child_kind)을 쓰는 시험은 옛 코드에서 불러오기부터 실패하는 꼴이다.
- U2 앱의 막힘 다시 보기는 무르기만 한다. AI 가 '막힘 아님'이라 했는데 갈래가 not_understood 인 엇갈림은 AI 판단을 따른다. 갈래가 비거나 모르는 값일 때만 안전망(영어 낱말 둘 이상 · 모름 아님)을 쓴다. 갈래가 있으면 갈래가 정한다(관계없는 두 낱말 'Blue car.' 를 막힘으로 남기려고). 브리프의 '갈래가 비어도'를 '갈래가 빌 때' 로 읽었다.
- U3 막힘을 무른 턴의 통째로 다시 쓰기는 1~3단계 · 범위를 읽은 턴 · 아직 보낸 문장이 없는 턴만이다. 4단계부터는 막힘만 무르고 다시 쓰지 않는다. 그래서 AI 가 막힘 꼴로 쓴 반응(예 'That's okay! Let's say it together.')이 질문 없는 AI 차례로 남을 수 있다. 4단계부터는 질문을 잡아 두지 않아 다시 쓰기를 붙일 자리가 없다.
- U4 영어 문장 거름은 '영어 낱말 둘 이상이 이어진 문장'을 빼므로 '{NAME}' 밖의 영어 고유 이름 두 낱말이 든 한국어 설명도 빠질 수 있다. 한 낱말 영어('eat')는 남긴다.
- U5 cardChainGuardOf 는 갈래 이름표만 되돌린다(카드 항목을 비워 그 필수 질문을 다룬 것으로 세지 않음). AI 가 쓴 질문 글은 그대로 나가므로, 카드 질문 글이 이어서 들리는 연쇄 자체는 프롬프트에 기댄다. 재질문 길로 바꾸는 D8 (나) 강화는 대본을 본 뒤 정할 일이다.

## CI 통합 고침(b462c21 통합 16건 실패 — 컨트롤러 요청 00:2x)

**원인은 재질문이 아니라 고침 1 의 A7(선생님 문장 수 초과) 설정 읽기다.** CI 로그 stderr 에 실패한 턴마다 '회화 수업 턴 길 실패(CallSettingError)' 가 찍혀 있다(로그 707~745줄). 턴 길은 AI 응답을 받은 뒤 저장 전에 `teacherSentencesMaxOf(s, level)`(lesson-turn.ts 2139)로 `talk.teacher_sentences_max.<구간>` 을 읽는다. 그런데 턴 길 설정 묶음 `s` 는 `src/server/conversation/turn.ts` 의 turnSettings 이고, 여기에 그 키가 없었다. 단위 시험은 시험용 설정 전체를 넘겨 이 빈칸을 보지 못했다. 그래서 저장 전에 던져 'error' 끝 줄이 됐다. 저장이 없으니 나머지 꼴(card_slot 대신 first_question · in_progress · 아이 행 없음 · sentUserMessage null)도 모두 같은 뿌리다.

- 고침: `talk-lesson.ts` 358 TEACHER_SENTENCES_SETTING_SCHEMAS(구간 넷 키 규격)를 내보내고, `turn.ts` 72 의 turnSettings 에 펼쳐 넣었다. turnSettings 는 시험이 보게 내보냈다(64). 맡은 파일 밖(turn.ts) 두 줄이며, 내 고침의 결함을 메운 것이다.
- 시험: `talk-prompt-fix2.test.ts` 'CI 통합 16건' 1건. turnSettings 에 키 넷이 있고, 그 키만으로 1 · 3 · 4 · 7 · 10단계 상한이 읽히는지 본다. turn.ts 의 펼침 줄을 잠시 빼고 돌려 이 시험이 실패하는 것을 확인한 뒤 되돌렸다.
- **재질문 실패 → 카드 자리 길은 src 에 있다.** withQuestionRetry 는 다시 부르기가 던지면 잡아 logFailure 만 하고(1450 부근), 응답이 없거나 ok 가 아니면(retry 클로저가 null) 1469 `if (answer === null) return retried` 로 앞 응답 흐름을 그대로 돌려준다. 끝 처리 settleLessonTurn 이 같은 질문 검사로 질문을 지우고 카드 자리(why question_check)로 바꾼다. 다시 쓴 응답에 질문이 없으면 mergeQuestionRetry 가 null 이라 같은 길이다. 단위 시험 '다시 쓴 응답이 없거나 다시 쓴 질문도 걸리면 지금처럼 카드 자리로 바꾸고, 더 다시 부르지 않는다'(talk-prompt-fix1)가 이 길을 덮는다. 가짜 서버에 맞는 규칙이 없으면 501(fake-anthropic 12줄)이라 talkLessonTurn 은 실패 결과로 돌아오고, 같은 길로 카드 자리다.
- 통합 견본: `tests/integration/talk-lesson-closing.test.ts` 236 의 talkedOnce 가짜 응답 질문을 'Nice! What else?' 에서 'Nice! Do you like it?' 로 바꿨다. else 는 시험 어휘(builders.ts)에 없어 C203 재질문이 일어나고, 가짜 응답이 하나뿐이라 501 오류 행이 하나 더 남는다. 턴은 카드 자리로 끝나 시험 뜻에는 영향이 없지만, 오류 행이 쌓이면 같은 오류 알림이 끼어들 수 있어 범위 안 질문으로 둔다. talk-fixture 의 lessonTurnRule 기본 tori_en 은 'Nice!'(질문 없음)이고 tori_ko 목록 · child_kind(막힘 참이면 not_understood)는 이미 맞췄다. AC-15i 의 'zebrafish aquariums' 는 일부러 걸리는 질문이라 그대로 둔다. 재질문 1회 → 501 → 카드 자리(why question_check)로 기대와 같다.
- **'done is not a function' 은 시험 실패와 따로다.** embedded-postgres 17.10.0-beta.17 이 dist/index.js 393 의 AsyncExitHook(gracefulShutdown)에서 done() 을 부른다. vitest 가 실패로 끝나며 프로세스가 나갈 때 이 고리가 콜백 없이 불려 TypeError 가 난다(시험 결과 출력 뒤, 'ELIFECYCLE exit code 1' 은 시험 실패 때문). global-setup 이 importEmbeddedPostgres 로 beforeExit 고리를 떼는 것과 같은 계열의 라이브러리 종료 고리 문제로 보인다. 통과한 CI 실행에서도 찍히는지는 이 로그 하나로 확인하지 못했다. 시험이 모두 지나면 사라지는지 다음 CI 로 본다.

관문: tsc 0 · 단위 146 파일 1879 통과 · check:ids 0 · `biome ci src tests seed/settings.json` 0. 저장소 전체 `biome ci` 는 1(`scripts/talk-observe.ts` 서식 — impl-talk-13 이 고치는 중인 파일이라 손대지 않음). 통합은 이 Mac 에서 돌리지 않았다(CI 몫).

## 규격 크기(대본 3회차 400 'The compiled grammar is too large' — 컨트롤러 Critical 01:0x)

**원인은 규격의 칸 수나 설명 길이가 아니라 SDK 도우미가 만드는 `$defs` · `$ref` 꼴이다.** zodOutputFormat 은 z.toJSONSchema(…, { reused: 'ref' }) 로 칸마다 $defs 항목(이 규격은 마흔넷)을 만들고 $ref 로 가리킨다. 열거값 · 범위 같은 제약은 이미 설명 글로 옮겨져 문법에는 없다(SDK transformJSONSchema). 작은 프롬프트(max_tokens 24)로 규격만 바꿔 실호출로 견준 결과는 아래와 같다.

| 보낸 규격 | 글자 수 | 결과 |
|---|---|---|
| 지금 꼴($ref) | 7667 | 400 grammar too large |
| child_kind 뺀 $ref 꼴(= b462c21 칸 수) | 7612 | 400 |
| 설명 모두 뺀 $ref 꼴 | 3868 | 400 |
| $ref 를 펼친 꼴(설명 그대로) | 5785 | OK |
| 고친 코드의 보낼 꼴 3 · 4 · 5단계 | 5785 | OK × 3 |

child_kind 를 빼도, 설명을 다 빼도 $ref 꼴은 걸렸다. b462c21(칸 스물아홉)이 2회차에서 지난 까닭은 이 탐침으로 가리지 못했다(같은 꼴이 지금은 걸림 — API 쪽 한도가 바뀌었을 수 있으나 확인하지 못함).

- 고침: 새 순수 모듈 `src/core/ai/inline-refs.ts`(inlineJsonSchemaRefs — '#/$defs/<이름>' 참조를 정의로 바꾸고 $defs 를 뺌, 없는 정의 · 바깥 참조 · 순환은 던짐 · hasJsonSchemaRefs). `src/server/ai/talk.ts` talkOutputFormatOf 가 SDK 도우미 결과를 펼쳐 보낼 꼴을 만들고, 회화 턴 · 끝맺음 턴 요청 본문(bodyOf)이 이것을 쓴다. 검증은 그대로 Zod 규격(wireSchema — child_kind · next_move 등 열거값)으로 엄격하다. 응답 칸 · 설명은 바꾸지 않았다.
- 울타리: `talk.ts` TALK_OUTPUT_SCHEMA_MAX_CHARS 6000 · TALK_OUTPUT_SCHEMA_MAX_PROPS 30(탐침으로 받은 꼴 5785자 · 칸 서른). 글자 수는 문법 한도의 직접 척도가 아니어서, 이 값은 '받은 크기를 넘지 않게' 하는 울타리다. 칸을 더하거나 규격을 키우면 단위 시험이 걸린다. 그때 탐침을 다시 한다.
- 시험: 새 `tests/unit/talk-output-schema.test.ts` 10건. 펼치기 둘(겹친 참조 · 던지는 셋)과, 3 · 4 · 5 · 10단계마다 두 건이다. 한 건은 $ref 없음 · 글자 수 · 칸 수 울타리다. 다른 한 건은 보낼 꼴의 칸 · 필수 칸 · 차례가 검증 규격과 같고(보낼 꼴 ⊆ 검증 규격), 검증이 열거값 밖(child_kind 'maybe' · next_move 'jump')을 거부한다. 펼치기를 잠시 빼고 돌려 8건이 실패하는 것을 확인한 뒤 되돌렸다.
- 실호출: 탐침 스크립트(스크래치패드 `prompt1/probe/`, 키는 출력하지 않음)로 7번 불렀다. 400 셋은 문법 컴파일에서 걸려 생성이 없다(과금 없음으로 보지만 청구서로 확인하지 않음). 성공 넷은 각 입력 2,819 · 출력 24 토큰이다. Sonnet 5.5 단가(seed/model-prices.json 입력 2 · 출력 10 달러/백만)로 약 0.024달러다. talk:observe 대본은 돌리지 않았다(아래 우려 1).
- 관문: biome ci 0(저장소 전체) · tsc 0 · 단위 147 파일 1889 통과 · check:ids 0(design-number 47 그대로).

우려:
1. **talk:observe 도 같은 고침이 필요하다.** 도구는 `scripts/ai-contract.ts` 의 withFormat(zodOutputFormat 그대로)으로 본문을 만들므로 지금도 400 이 난다. impl-talk-13 이 withFormat 에서 inlineJsonSchemaRefs(또는 talkOutputFormatOf)를 거쳐야 3회차 대본이 돈다. 맡은 파일 밖이라 손대지 않았다.
2. 다른 목적(쓰기 첨삭 · 확인 · 말하기 평가 · 생각 꺼내기)은 `src/server/ai/run.ts` 가 같은 $ref 꼴로 보낸다. 칸이 적어 지금은 받는 것으로 보이지만 이번 탐침으로 확인하지 않았다. 같은 펼치기를 run.ts 에도 둘지는 컨트롤러가 정한다(한 줄).

### 규격 크기 — 확인 둘(컨트롤러 01:2x)

(1) **실제 앱의 회화 턴 길은 펼친 꼴로 나간다.** 회화 턴은 `lesson-turn.ts` 1992 talkLessonTurn(재질문 2059 도 같음)에서, 끝맺음은 `closing.ts` 492 talkLessonClosing 에서 시작한다. 둘 다 `talk.ts` 825 runTalkLessonCall → runCallCore → 948 streamCore 를 지난다. streamCore 는 469 `let current = built`(다른 모델 재시도면 591 `current = otherBuilt`)를 492 `body: bodyOf(current)` 로 보낸다. bodyOf(374)는 379 `format: talkOutputFormatOf(built.wireSchema)` 이고, talkOutputFormatOf(361)가 inlineJsonSchemaRefs 를 거친다. 그래서 첫 시도 · 같은 입력 재시도 · 다른 모델 재시도 모두 $ref 없는 꼴이다. 단위 시험 `ai-output-schema-refs.test.ts` 가 talk_turn · talk_closing 3 · 4 · 5 · 10단계를 본다. 탐침 3 · 4 · 5단계 OK 는 같은 talkOutputFormatOf 출력이다.

(2) **다른 목적도 $ref 가 생겼다 — 같은 펼치기를 넣었다.** `run.ts` 의 본문(옛 377줄 zodOutputFormat 그대로)을 283 aiOutputFormatOf(같은 inlineJsonSchemaRefs) · 400 `format: aiOutputFormatOf(built.wireSchema)` 로 바꿨다. 새 단위 시험 `tests/unit/ai-output-schema-refs.test.ts` 15건이 회화 밖 일곱 견본(쓰기 확인 · 첨삭 6 · 10 · 말하기 답 · 발표 · 확인 질문 · 생각 꺼내기)과 회화 여덟을 훑는다. 펼치기를 잠시 빼면 회화 밖 일곱이 모두 실패했다($ref 있음). 되돌린 뒤 15건이 지난다. 지금까지 이 목적들은 $ref 꼴로도 받아졌던 것으로 보이며, 규격이 작아 한도 안이었을 것이다. 펼친 꼴이 받히는지는 탐침 6번(각 max_tokens 16)으로 확인했다. 쓰기 확인 1249자 · 첨삭 10단계 1048 · 말하기 답 648 · 발표 634 · 확인 질문 462 · 생각 꺼내기 978 모두 OK 였고, 입력 합 3,562 · 출력 96 토큰으로 약 0.008달러다.

관문: biome ci 0 · tsc 0 · 단위 148 파일 1905 통과 · check:ids 0. 이번 탐침까지 실호출은 모두 13번(400 셋 · 성공 열)이고 약 0.032달러다.

## fix round 1(검토 rev-prompt-2 Changes requested — Important 다섯 · Minor 열)

상태: DONE_WITH_CONCERNS(Important 다섯 닫음, 우려는 끝에). 새 시험은 아래 변이 다섯으로 각 시험이 실패하는 것을 확인한 뒤 되돌렸다.

| # | 바꾼 곳 | 내용 · 시험 |
|---|---|---|
| A | `question-retry.ts` 165 | 통째로 다시 쓴 턴(whole)은 child_kind · stuck 만 앞 응답(앱이 정한 값)에서 가져온다. 나머지 아이 말 칸(self_used_words · goal_suggest · recast · child_topic …)은 다시 쓴 응답 값이다. 질문만 다시 쓴 턴(C203)은 그대로 앞 응답 값이다. 시험 'A 통째로 다시 쓴 턴은 …'(변이: 늘 앞 응답 칸 → 실패) |
| B | `lesson-turn.ts` 1448 droppedAll · fallback, 1051 needsQuestion | 막힘을 무른 턴을 다시 쓰지 못하면(응답 없음 · 질문 없는 다시 쓰기 · 시간 없음 · 범위 없음) 막힘 꼴 앞 응답 문장을 하나도 내보내지 않는다(까닭 'rewrite'). 끝 처리는 needsQuestion 으로 카드 자리(why fail — 다음 카드 기회 질문)를 만든다. 질문 차례가 질문 없이 끝나지 않는다. 시험은 실제 앞 응답 꼴 'That's okay! Let's say it together. Listen and say!' 로 세 경우 모두 release [] · card_slot · 질문 줄 하나를 본다(변이: 규칙 끔 → 실패) |
| C | `child-kind.ts` 112 createRewriteHold, `lesson-turn.ts` 2015(onStuck → hold.onStuck(overridden, asksQuestion(flow.chosen())) · onSentence → hold.sends) | 잡아 두기 판단을 순수 상태 꼴로 뺐다. 조건은 무름 · 보낸 문장 0 · 1~3단계 · 범위 읽음 · 질문 차례이고, 시도마다 덮어쓴다(Minor 5 · 6 함께). 시험 'C 잡아 두기 …'(변이: 조건 빼기 → 실패). 남은 빈틈: 서버의 두 줄 배선 자체(hold 를 부르지 않게 바꿈)는 단위 시험이 가르지 못한다(가짜 AI 로 턴 길을 도는 통합 시험 몫) |
| D | `child-kind.ts` 28 ENGLISH_SENTENCE_MIN_WORDS 3 · 102 | 인식 글이 영어 낱말 셋 이상이고 모름 표현이 아니면 갈래와 관계없이 막힘을 무른다. 두 낱말은 갈래가 정하고, 갈래가 비면 둘 이상으로 본다. 시험: 'I have a dog.' + unrelated_words · 'My dog is big.' + not_understood → 막힘 아님, 'Blue car.' + unrelated_words · 'I don't know.' → 막힘(변이: 셋 이상 안전망 뺌 → 실패). 맞바꿈: 한국어 말이 영어 낱말 셋 이상으로 잘못 인식되면 무른다(C204 에 한 줄 — 컨트롤러 몫) |
| E | `talk-lesson.ts` 1414, `lesson-flow.ts` 338 | 카드 답 뒤 되돌림은 갈래만 follow_up 으로 두고 카드 항목은 남긴다. 들린 필수 질문은 다룬 것으로 세어 같은 글이 뒤 카드 자리에 다시 나오지 않는다. 이어 묻기 뒤 셈은 카드 항목이 있는 차례를 이어 묻기로 세지 않는다. 시험: cardChainGuardOf · 정규화 card_item 남음 · 셈 2(변이: 카드 항목 조건 뺌 → 실패) |

Minor:

| # | 판정 |
|---|---|
| 1 질문에 답한 문장 | ADDRESSED — 789 "if it answers the question it is answer; if it is about something else it is new_topic …" |
| 2 '한국어만' | ADDRESSED — child_kind 설명 534 "Korean words only, or Input not speech: not_understood" |
| 3 4단계부터의 까닭 | ADDRESSED — 815 "At levels 1-3, never write …; At every level, never say the child's words were wrong …" |
| 4 두 낱말 영어 명사 · 쉼표 목록 | 남김 — 설명이 빈 글이 될 뿐 틀린 글은 아니다. 3회차에서 빈 설명 빈도를 세 정한다(도구 몫) |
| 5 질문 차례만 잡아 둠 | ADDRESSED — C 와 함께(asksQuestion(flow.chosen())) |
| 6 시도마다 덮어씀 | ADDRESSED — C 와 함께 |
| 7 다시 쓰기 턴 지연 | 남김 — 3회차에서 첫 문장 시간을 잰다(도구 몫). 흐름을 끊고 바로 다시 부르는 길은 더 큰 고침이다 |
| 8 'just react' | ADDRESSED — 773 "do not say it back, just react to it" |
| 9 입력 'dont_know' | 남김(지적이 맞지 않음) — 회화 턴 입력 칸의 값은 speech · dont_know 다(`lesson-turns.ts` 25 TALK_INPUT_MODES). speech · button · nospeech 는 흐름 쪽 아이 차례 까닭이다 |
| 10 C204 의 '설계 숫자 아님' | 컨트롤러 몫(D 와 함께 C204 한 줄) |

알림: D 때문에 `tests/unit/talk-observe.test.ts` 의 '갈래가 막힘 갈래면 무르지 않는다'('I have a dog.' + not_understood)가 바뀐 규칙과 어긋났다. impl-talk-13 에게 바뀐 서명 셋과 함께 알렸고, 지금은 그쪽이 고쳐 단위가 모두 지난다.

관문(CI 통합 고침 · 규격 펼치기와 함께, 이 워크트리 그대로):

| 명령 | 결과 |
|---|---|
| `pnpm tsc --noEmit -p .` | 0 |
| `pnpm vitest run --project unit` | 148 파일 · 1909 통과 · 6 todo · 실패 0 |
| `pnpm check:ids` | 0(design-number 47 그대로) |
| `pnpm check:deps` | 0(290 모듈 · 1661 의존, 위반 없음) |
| `pnpm biome ci` | 2 — `scripts/talk-observe.ts` 가져오기 차례 · `tests/unit/talk-observe.test.ts` 서식(impl-talk-13 이 고치는 중인 파일, 손대지 않음) |
| `pnpm biome ci src tests/…(내 범위 423 파일) seed/settings.json` | 0 |

우려: (1) B 의 카드 자리는 남은 카드 기회가 없으면 만들어지지 않는다(lessonCardSlotOf 가 null). 그 드문 턴은 반응 없는 빈 AI 차례가 된다. (2) C 의 서버 배선 두 줄은 통합 시험 몫이다. (3) E 는 갈래 이름표만 되돌리고 AI 질문 글은 그대로 나간다. 다시 쓰기 길로 바꾸는 D8 (나) 강화는 3회차 뒤 정할 일이다.

## fix round 1 보탬(검토 rev-prompt-2 7절 — Important F · 재질문 통합 사례 · 크기 울타리)

1. **F — 계약 · 관찰 명령의 본문.** `scripts/ai-contract.ts` withFormat(ai:contract · ai:observe · talk:observe 가 씀)이 SDK 도우미 결과를 inlineJsonSchemaRefs 로 펼친다. 앱 길(run.ts aiOutputFormatOf · talk.ts talkOutputFormatOf)과 같은 꼴이다. 단위 시험 `ai-output-schema-refs.test.ts` '계약 · 관찰 명령의 본문(…)도 …' 1건이 회화 밖 일곱 견본과 회화 3단계 모두에서 $ref 가 없고 앱 꼴과 같은 글인지 본다. 목적마다의 실호출은 다시 부르지 않았다. 앞의 탐침 6번(`prompt1/probe/probe3.ts` — 쓰기 확인 · 첨삭 10 · 말하기 답 · 발표 · 확인 질문 · 생각 꺼내기)이 aiOutputFormatOf 출력, 곧 지금 withFormat 과 같은 글을 보내 모두 OK 였다. 명령은 다음과 같다. `TSX_TSCONFIG_PATH=<워크트리>/tsconfig.json node --env-file-if-exists=<워크트리>/.env.local --conditions=react-server --import tsx <스크래치패드>/prompt1/probe/probe3.ts`(키는 출력하지 않음). 끝맺음은 회화 턴과 같은 규격(talk_closing 도 talkOutputFormatOf)이라 회화 탐침이 덮는다.
2. **재질문 통합 사례.** `tests/integration/talk-lesson-turn.test.ts` '13절 C203 (3) 질문 검사에 걸린 1단계 AI 질문은 한 번 다시 쓰게 하고 …' 1건을 더했다. (가) 가짜 서버에 둘째 응답(범위 안 'Do you like it?')이 있으면 요청은 둘이고, 둘째 본문에 'App check: your question' 이 든다. 화면 줄에는 zebrafish 가 없고 'Do you like it?' 이 있으며, 끝 줄은 end, 선생님 행은 kind ai 다. (나) 둘째 응답이 없으면 요청 둘(둘째는 가짜 서버 501) 뒤 끝 줄은 end 이고 선생님 행은 card_slot · why question_check 다. 이 Mac 에서는 돌리지 않았다(CI 몫). 부르는 길은 lesson-turn 의 withQuestionRetry(재호출 클로저는 talkLessonTurn 실패면 null) → settleLessonTurn 이다.
3. **크기 울타리.** 지금 꼴 그대로(5,799자) 실호출 한 번과, 설명을 늘린 펼친 꼴(6,502자) 한 번 모두 OK 였다(입력 2,824 · 3,058, 출력 24 · 24 토큰, 약 0.012달러, `prompt1/probe/probe4.ts`). 설명 길이는 문법 한도를 움직이지 않는 것으로 보인다. TALK_OUTPUT_SCHEMA_MAX_CHARS 를 받은 가장 큰 꼴 아래인 6,500 으로 두고 근거를 주석에 적었다. 칸 수 울타리 30 은 그대로다.

관문(이 워크트리 그대로): biome ci 0(저장소 전체) · tsc 0 · 단위 148 파일 1910 통과 · check:ids 0(design-number 47) · check:deps 0. 이 묶음 실호출 누계는 15번(400 셋 · 성공 열둘), 약 0.044달러다.

## 고침 3(대본 4회차 설계 재판정 '조건부 통과' — N-1 · N-2 · 두 낱말 관련 말 · Minor)

상태: DONE_WITH_CONCERNS(N-2 (b)의 앱 되돌림은 이름표만이라 효과가 작다 — 우려 1).

| 항목 | 바꾼 곳(워크트리 줄) | 내용 · 시험 |
|---|---|---|
| N-1 프롬프트 | `talk-lesson.ts` 784 | "After you say back a short answer, ask something new about it (another thing, who, where, or whether they like it). Never put the child's last words in the choices (not 'Cold.' -> 'Is it cold or hot?'), and never ask again in the same words a question the child already answered, even with one word." |
| N-1 앱 거름 | `question-check.ts` 340 choicesEchoChild, `talk-lesson.ts` 1381(keptChoicesOf) | 두 선택지의 바뀌는 자리 가운데 하나가 아이의 마지막 말의 낱말(소문자 · 원형)이면 선택지를 버린다. 'Cold.' → cold/hot, 'Yes I like fish.' → fish/rice, 'Yes big fish.' → big/small 은 버린다. 'I drink the juice.' → apple/orange 는 남긴다. 바뀌지 않는 자리(like)는 보지 않는다. 받침 둘째(쉬운 질문)는 그대로다. 시험 `talk-prompt-fix3.test.ts`(변이: 거름 뺌 → 실패) |
| N-2 (a) 늦은 카드 답 | `lesson-flow.ts` 493 lateCardAnswerOf, `lesson-turn.ts` 1972 | 가장 최근 필수 질문 차례의 노린 단원 단어를 아이 말이 담으면(원형 포함) 'Previous turn was a card chance: yes' 로 보낸다. 그래서 프롬프트 규칙과 앱 되돌림이 늦은 답에도 걸린다. 프롬프트 785 "If the child answers an earlier card question late, follow up on that answer first too; do not jump to the next card question." 시험은 lateCardAnswerOf 네 경우다(서버 배선 한 줄은 통합 몫) |
| N-2 (b) 카드 항목만 필수 | `talk-lesson.ts` 1455 | cardChainGuardOf 가 cardItemKind 도 본다. 갈래를 follow_up 으로 적고 card_item 만 required 인 꼴도 되돌림 판정(chained)이 걸린다. 시험은 guard 와 정규화 둘이다 |
| 두 낱말 관련 말 | `child-kind.ts` 156 touchesScene · 169 sceneWordsOf, `talk-lesson.ts` 1426 talkSceneWordsOf, 정규화 · `talk.ts` 346(흘려 받는 중 막힘도) | 영어 낱말 두 개이고 모름 표현이 아니며 그중 하나가 장면 낱말이면 갈래와 관계없이 막힘을 무른다. 장면 낱말은 카드 주제 · 쓸 표현 · 오늘 쓸 말 · 필수 · 더 이야기할 거리 글과 답 예시 · 흐름 · 단원 단어에서 기능어를 뺀 것이다. 'Big fish.' · 'Cold juice.' → 막힘 아님, 'Blue car.'(장면 밖) · 'Yes it.' · 한 낱말 → 갈래가 정함. 시험 세 건(변이: 장면 조건 뺌 → 2건 실패) |
| N-3 | `talk-lesson.ts` 788 · `question-retry.ts` 다시 쓰기 메시지 | 노리는 단어 대신 "ask about the thing or the person instead (e.g. 'Do you like fish?')" |
| N-5 | `talk-lesson.ts` 799 | 들리지 않음 규칙을 "Start with 'I couldn't hear you.'." 로 세게 했다 |
| N-6 | `talk-lesson.ts` 1407 koPerSentenceOf | 뜻 목록 수가 tori_en 문장 수와 다르면 이어서 한국어 문장 끝(문장부호 뒤 띄어쓰기)으로 다시 나눈다. 맞으면 문장마다, 아니면 한 덩이(옛 규칙)다. 옛 한 글 꼴도 같다(고침 1 시험 두 줄을 이 규칙으로 고침) |
| N-8 | `talk-lesson.ts` 572 explanation 칸 | "only about the word your question aims at" |
| N-4 · N-7 · N-9 | 남김 | N-4 다시 쓰기 지연은 도구 몫이다. N-7 꺼내기 턴 신호 말은 규칙이 이미 있다(1~3단계 'When you fill model_line or choices, end tori_en with a cue'). N-9 갈래 오기는 막힘에 영향이 없고 기록 통계만이다 |

알림: 두 낱말 장면 조건 때문에 `tests/unit/talk-observe.test.ts` 의 'Blue car.' 시험(카드 3-1 에 car 가 있음)이 바뀐 규칙과 어긋났다. impl-talk-13 에게 서명 넷과 함께 알렸고, 지금은 단위가 모두 지난다.

관문(이 워크트리 그대로): biome ci 0(594 파일) · tsc 0 · 단위 149 파일 1919 통과 · check:ids 0(design-number 47) · check:deps 0. 실호출 없음.

우려:
1. **N-2 (b) 앱 되돌림은 이름표만이다.** 갈래가 이미 follow_up 이고 카드 항목은 남기므로(fix 1 E), 판정이 걸려도 정규화 값은 그대로다. 변이(카드 항목 조건 뺌)가 정규화 시험에서 살아남는다. AI 가 쓴 카드 질문 글은 그대로 나가므로, 늦은 · 이른 카드 연쇄를 실제로 막는 몫은 프롬프트(785 · 768)에 있다. 판정을 효과로 잇는 길이 하나 있다. 1~3단계는 질문을 잡아 두므로, chained 인 턴을 C203 다시 쓰기 길로 '아이 답에 이어 묻기'를 한 번 쓰게 하는 것이다(D8 (나) 원안, 그 턴마다 호출 하나 더). 대본에서 연쇄가 남으면 컨트롤러가 정한다.
2. 장면 낱말 표는 카드 글에서 만든다. 'fun' · 'day' 같은 흔한 내용 낱말도 들어, 장면 밖의 두 낱말 말이 우연히 이 낱말을 담으면 무른다. 막힘이 아닌데 막힘으로 보는 것보다 덜 해로운 쪽이라 받아들였다.
3. 늦은 카드 답은 아이 말이 최근 필수 질문의 노린 단어를 담았는지로만 본다. 한참 뒤 같은 낱말을 다시 써도 '카드 기회 뒤'로 보아 그 턴의 필수 질문 갈래를 되돌린다(이어 묻기 쪽으로 기우는 오차).

- **CI 여섯째(806801f) 통합 AC-15k 1건.** 첫 턴 가짜 응답의 질문 'Do you like zebrafish aquariums?' 는 범위 밖 두 낱말이라 `question-check.ts` 289 에서 offband 로 걸린다. 그래서 `question-retry.ts` 32 heldQuestionFailOf → `lesson-turn.ts` 1474 · 1488 withQuestionRetry 가 C203 (3) 다시 쓰기를 한 번 부른다. 둘째 규칙이 아직 없어 가짜 서버는 501 이고, 턴은 카드 자리로 닫힌다. 이 시험은 '붙인 카드 질문 포함'을 보려고 일부러 걸리는 질문을 쓰므로 재호출이 맞는 장면이다. 단언을 'TURN_MARK 본문 셋 = 본 턴 둘 + 다시 쓰기 하나(App check 글)' 로 고치고, 둘째 본 턴 본문 대조는 다시 쓰기를 뺀 둘 가운데 둘째로 그대로 둔다(`tests/integration/talk-lesson-turn.test.ts` 323~). biome ci 0 · tsc 0. 통합은 CI 몫이다.

## 고침 3 fix 1(검토 rev-prompt-2 P3-1 NOT ADDRESSED · 설계 재판정 N-10 · Minor P3-2~P3-5, 컨트롤러 잠정 T-161)

상태: DONE. 호출은 늘리지 않았다(D8 (나) 쓰지 않음). 실호출 없음. 새 시험마다 해당 코드를 하나씩 망가뜨리는 변이 여섯으로 실패를 확인하고 되돌렸다(카드 항목 비우기 · 서버 손질의 늦은 답 · 이미 답함 · 폭 · 흐름 글 · 새 낱말 조건).

| 항목 | 바꾼 곳(워크트리 줄) | 내용 · 시험 |
|---|---|---|
| A P3-1 · N-2 (b) | `talk-lesson.ts` 1471 cardChainGuardOf, 고정부 781 | 앞 차례가 카드 기회인 턴에 갈래가 follow_up · follow_child 인데 카드 항목이 필수 질문을 가리키면 카드 항목을 비운다. 그 필수 항목은 다룬 것으로 세지 않고 남은 기회로 둔다. 선생님 말은 그대로다. 갈래가 required 면 이름표만 되돌리고 카드 항목은 남긴다(fix 1 E 그대로 — 아이가 들은 필수 질문). 고정부 "In this turn next_move can never be required, and card_item can never be a required question either." 시험은 정규화 세 경우(이름표 + 필수 → 비움, 필수 갈래 → 남김, 카드 기회 아님 → 그대로)와 고정부 문장이다. 카드 항목 비우기를 빼는 변이에 2건이 실패한다. 남는 점: 카드 항목을 비운 이 차례는 이어 묻기 뒤 셈에서 진짜 이어 묻기로 센다(fix 1 E 의 셈 보정은 카드 항목이 있을 때만 걸림) |
| B 설계 N-10 | `talk-lesson.ts` 775(되풀이 규칙) | "… say back one correct sentence with it …, using the verb of the question you just asked, not 'like' (e.g. 'What do you do with the juice?' + 'Juice.' -> 'You drink juice!'; 'Where do you go?' + 'Lake.' -> 'You go to the lake!')." 02-2 196 · 198. 시험은 고정부 문장이다 |
| C P3-3 · P3-4 | `lesson-flow.ts` 489 LATE_CARD_ANSWER_MAX_GAP 2 · 504 lateCardAnswerOf, `lesson-turn.ts` 1381 lateCardRowsOf · 1406 lessonCallTurnOf · 2026(서버는 이 함수 하나를 부름) | 늦은 카드 답은 가장 최근 필수 질문 뒤 노린 단어를 처음 담은 아이 말일 때만이다. 그 뒤 아이 말 가운데 이미 담은 것이 있거나(이미 답함), 아이 차례가 폭 2 를 넘게 지났으면 켜지 않는다. 판정은 talk_turns 행(선생님 move · 아이 인식 글)으로 한다. 늦은 답 · 다음 토막을 붙이던 서버 줄을 순수 함수 lessonCallTurnOf 로 뺐다. 시험은 판정 넷과 lessonCallTurnOf 다섯이다(서버 손질의 늦은 답을 빼는 변이 → 실패). 폭 2 는 판정 폭(대본 4회차 사례 둘)이라 설계 숫자로 두지 않았다. 12절 키로 올릴지는 컨트롤러가 정한다. 옛 { turns } 입력도 받는다(도구 호환, '이미 답함'은 못 봄) |
| D P3-5 | `talk-lesson.ts` 1439 talkSceneWordsOf, `child-kind.ts` 116 | 장면 낱말 표에서 카드 진행 설명 글(card.flow)과 주제 글을 뺐다. 쓸 표현 · 오늘 쓸 말 · 필수 · 더 이야기할 거리 글과 답 예시 · 단원 단어만 쓴다. 진행 · 지시 말(one · now · time · more · can · me · let · here · there · today)은 장면 낱말로 세지 않는다. 시험: teacher · asks · brings · now · one 이 없고 sport 는 있다(흐름 글을 되살리는 변이 → 실패) |
| E P3-2 | `question-check.ts` 341 · 375 choicesEchoChild 넷째 인자 question, `talk-lesson.ts` 1355 questionField | 선택지의 바뀌는 낱말이 아이 말과 같아도, 딸린 질문(tori_en 의 마지막 물음표 문장)에 아이 말에도 바뀌는 자리에도 없는 내용 낱말이 있으면 새 물음으로 보고 버리지 않는다. 'My mom is big.' + 'Is your dad big or small?' 과 'It is hot.' + 'Is the water hot or cold?' 는 남기고, 'Cold.' + 'Is it cold or hot?' 과 'Yes big fish.' + 'Is the fish big or small?' 은 버린다(새 낱말 조건을 빼는 변이 → 실패). 1 · 2단계의 해는 이 좁힘으로 줄지만, 3단계만 거를지는 iPad 시험 뒤로 미룬다 |

알림: impl-talk-13 에게 바뀐 서명(lateCardAnswerOf rows · lessonCallTurnOf · cardChainGuardOf dropCardItem · talkSceneWordsOf · choicesEchoChild question)을 알렸다. 도구는 지금도 tsc 를 지난다.

관문(이 워크트리 그대로):

| 명령 | 결과 |
|---|---|
| `pnpm biome ci` | 0(594 파일) |
| `pnpm tsc --noEmit -p .` | 0 |
| `pnpm vitest run --project unit` | 149 파일 · 1925 통과 · 6 todo · 실패 0 |
| `pnpm spec:trace` | 0(남은 missing-test 는 AC-10g · AC-10h 등 P12 몫 — 이 고침과 관계없음) |
| `pnpm seed:validate` | 0(경고 둘 — 회화 4 · 5단계 단원 목표 없음, 이 고침과 관계없음) |
| `pnpm check:ids` · `pnpm check:deps` | 0 · 0(design-number 47 그대로) |

고치지 않고 남긴 것: 없음(P3-6 관사 되풀이는 검토자 판정대로 고칠 것이 아니다 — 도구 기대 쪽, impl-talk-13 몫).
