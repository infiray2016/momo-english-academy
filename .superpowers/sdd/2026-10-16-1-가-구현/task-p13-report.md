# P13a 구현 보고(implementer impl-p13 · Opus · high)

## 차례 1 · 3 (2026-10-22 16:4x)

브리프 `task-p13-1.md`, plan `plan-p13a-회화-턴-호출과-수업-규칙.md` 차례 1(a 작업 1) · 차례 3(a 작업 3). 워크트리 `.claude/worktrees/p13`(브랜치 `feature/1a-p13-conversation`, HEAD 84b0669). 커밋하지 않았다. 순수 함수 · 단위 시험만(DB · SDK · 시각 없음).

### 바뀐 파일

| 파일 | 신규/수정 | 줄 | 무엇 |
|---|---|---|---|
| `src/core/ai/calls/talk.ts` | 신규 | 935 | 회화 턴 · 끝맺음 턴 규격(`talkTurnSpec` · `talkClosingSpec` — P9b `CallSpec` 꼴, 같은 응답 규격 · 같은 고정부) · `TalkTurnInput` · 응답 규격 21칸(tori_en 첫 속성, 끝맺음 칸 차례 C21) · 고정부(공통 + 1~3 / 4+ 구간 규칙, 반말 · 해요체 지시 없음) · 가변부 · `talkUserMessage` · `talkContextDelta` · `toriRewriteOf` · `twoAnswersLine` · `normalizeTalk` · `talkCheckFields` · `applyTalkChecks` · `checkLowLevelAiQuestion` · `englishHintTiersOf` · `TORI_NAME` |
| `src/core/conversation/stream.ts` | 신규 | 363 | `createToriEnReader`(조각 이음 · 이스케이프 · 문장 끝) · `checkToriSentence` · `isQuestionSentence` · `isOverLength` · `safeLineOf` · `createToriSentenceGate`(첫 자리만 안전한 대사) · `talkAttemptNext`(첫 문장 전 다시 · Haiku → Sonnet · 첫 문장 뒤 닫기) |
| `src/core/conversation/flow.ts` | 신규 | 830 | `talkFlowSettingsFrom` · `talkFlowOf` · `nextSegmentOf` · `todayWordsOf` · `practiceItemsOf` · `practiceOrderOf` · `askKindOf` · `talkPositionOf` · `turnSegmentOf` · `nextUnusedQuestionNo` · `appendAfter` · `praiseLineOf` · `talkTargetsOf` · `sendsAsDontKnow` · `MORE_PROMPT` |
| `src/core/conversation/hints.ts` | 신규 | 157 | `hintTiersOf` · `openedTierCount` · `hintKindOf` · `heardHelpOf` |
| `src/core/conversation/said.ts` | 신규 | 161 | `saidWordsOf` · `metWordsIn` · `countsAsSaid` · `sayStateAfter` · `talkWordConditionOf` · `talkEnglishSentenceDelta` · `s3WordCountOf` |
| `src/core/conversation/wrap-up.ts` | 신규 | 129 | `wrapUpLinesOf` · `farewellOf` · `againLineOf` |
| `src/core/conversation/listen.ts` | 신규 | 191 | `talkSpeechSettingsFrom` · `talkEndRuleFor` · `confirmPlanOf` · `maskNameAnswer` |
| `src/core/conversation/friendship.ts` | 신규 | 44 | `friendshipAfter` |
| `src/core/conversation/attempt.ts` | 신규 | 110 | `TalkAttemptInputSchema` · `parseTalkAttemptInput` · `followAlongNo` · `talkStartAttemptId` · `talkClosingAttemptId` · 활동 번호 상수 둘 |
| `tests/unit/conversation-{stream,call,flow,said,listen}.test.ts` | 신규 | 325 · 753 · 917 · 350 · 164 | 아래 시험 |
| `tests/fixtures/ai/samples/talk/talk_turn.*.json` | 신규 9개 | — | l1-ok · l1-question-in-reaction · l1-blocked · l1-more-talk-ai · l4-ok · l5-closing · refusal · fallback(블록 경계에서 이어지는 글) · max-tokens |
| `tests/fixtures/settings.ts` | 수정(더하기만) | +40 | 공용 변경 1 — 12절 회화 키 스물넷(아래 '다르게 한 것' 1) |

### 시험(단위 77 — 파일별 stream 16 · call 19 · flow 21 · said 15 · listen 6)

plan 증명 표의 단위 시험 이름 34개가 글자 그대로 있다(스크립트로 대조, 0 빠짐). 그 밖은 접두 없는 보강 시험이다.

- AC 시험: AC-15b(흘려 받은 tori_en 검사 · 첫 문장 뒤 거절이면 닫힘) · AC-15k(사용자 메시지 · 다시 쓸 토리 차례) · AC-15c ×3(판정 칸 없음 · 단어 조건 24/30 · S-3) · AC-15d · AC-9d ×5 · AC-16a ×3 · AC-16b · AC-2f · AC-15m ×2 · AC-15h ×3 · AC-15n ×2 · AC-5e ×2.
- 접두 없는 plan 이름: '회화 흐름:' 다섯(넘어간 질문 → 더 이야기할 거리 → AI · '모름' 둘째부터 힌트 · '모름' · 막힘 셈 제외 · 'Do you want to talk more?' · 대신 질문) · 1~3단계 AI 질문 검사 · 영어로 말한 문장 수 · 인식 확인 · 흘려 받기 이스케이프 · 회화 턴 첫 문장 전 다시(순수 몫).

### 관문(워크트리 p13, Node 24)

```
pnpm -s biome ci .            → exit 0 (336 files)
pnpm test                     → 16:3x exit 0(581 통과). slow_rate 보충 뒤 f76aaac 맞춤 다음 exit 0 · 582 통과(P13 78)
pnpm exec next typegen && pnpm exec tsc --noEmit → exit 0  (typegen 없으면 PageProps 오류 일곱 — 바탕 그대로, 내 파일과 무관)
pnpm check:deps               → no dependency violations (171 modules)
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0 (missing-test 는 P11 · P12 몫 보고만)
pnpm check:ids                → 보고만(exit 0). 새 파일의 design-number 0건(listen.ts 캡처 묶음 번호 3 을 고쳐 없앰)
```
check:bundle 은 빌드 뒤 명령이라 돌리지 않았다(화면 파일 없음).

### 다르게 한 것(까닭)

1. **공용 변경 1(컨트롤러 허락 16:0x).** `tests/fixtures/settings.ts` TEST_SETTINGS 끝에 plan 값 그대로 회화 키 스물넷을 더하기만 했다(실시드와 같은 값, 구간 키는 펼침, 기존 키 · 차례 그대로). `defaultSettings()` 는 plan 이 요구하지 않아 손대지 않았다. 보충(컨트롤러 지시 16:4x, C96): `seed/settings.json` 에 `speech.slow_rate` 한 행(0.8 · 고급, 12절 차례대로 speech.silent_items_max 뒤)과 TEST_SETTINGS 같은 키를 더했고, listen.ts 가 이 키를 읽는다(`talkSpeechSettingsFrom().slowRate` · `talkSpeakRateOf(level)` — 1~2단계 경계는 상수 `TALK_SLOW_READ_UNTIL_LEVEL`, 시험 1개 더함). `pnpm seed:validate` exit 0. `pnpm check:ids --specs <본 저장소 specs>`(C96 행 있음) 위반 0. **워크트리 specs/09 에는 아직 그 행이 없어** `pnpm check:ids` 가 seed-setting-unknown · code-setting-unknown 을 보고하고 단위 시험 `check-ids.test.ts`('저장소의 5절 테이블이 스키마와 같고 코드의 설정 키 글자가 모두 12절에 있다') 하나가 빨강이다 — 정본 장 반영(본 저장소 specs 미커밋 C89~C98)을 이 가지에 합치면 초록이 된다(요청 0).
2. **회화 견본 JSON 자리를 `tests/fixtures/ai/samples/talk/` 로.** `tests/contract/ai-schemas.test.ts` 가 samples 폴더의 JSON 을 모두 읽고 모르는 규격 제목이면 던진다(`specCase` default, 엄격 표본 제목 집합도 여섯으로 고정). 그 파일은 허용 밖이라 아래 폴더에 두었다(readdirSync 가 하위 폴더를 읽지 않음). 계약 시험에 talk_turn 갈래를 더하면 제자리로 옮길 수 있다(요청 1).
3. **`TalkCallSpec` 대신 P9b `CallSpec` 그대로.** 스트리밍 몫(문장 검사 · 다음 할 일)은 stream.ts 의 순수 함수로 두었다 — `buildAiRequest` 를 그대로 쓰기 위해서다.
4. **`TalkTurnInput` 에 `lemmaOf` 를 더했다.** 정규화(self_used_words · next_targets 원형)에 필요하다. b 가 P11a `lemmaLookup` 으로 채운다.
5. **규칙 키 둘을 더 읽는다.** `talk.feedback_from_level`(잘한 말 · 다음엔 이렇게를 비우는 단계 — 5 를 박지 않으려고), `talk.dontknow_max`(4단계부터 고정부에 '같은 질문 n 번 모름이면 다음 질문' — 3.3, C44 의 두 수와 같은 꼴). 5단계부터 tori_ko · farewell_ko 비우기는 level_specs `koMeaning` 으로, 1~3 / 4+ 구간 규칙은 `cardShape` 로 가른다.
6. **`normalizeTalk` 가 그 턴에 쓰지 않는 칸을 비운다.** 끝맺음 턴은 끝인사 · 잘한 말 · 다음엔 이렇게 · 요약만(tori_en ''), 다른 턴은 끝맺음 칸 빈 값, 1~3단계 AI 질문 · 힌트는 '더 이야기할 거리'를 다 쓴 '더 이야기하기' 턴만, 평가 대화는 힌트 · 카드 번호 없음, 10~12단계는 힌트를 비우되 답 예시 · 노리는 단어는 남김. 필수 칸: tori_en(대화 턴은 빈 글이면 null), 끝맺음은 끝인사나 요약 하나는 있어야.
7. **`talkCheckFields` 의 길이 검사.** 아이가 말할 학습 글(질문 · 힌트 · 쓸 수 있는 말 · 답 예시 · 다음엔 이렇게)만 본다. 토리 자신의 말(되풀이 · 끝인사)은 3.6 '길이 초과' 기록 대상이라 막지 않고, 잘한 말은 아이 말 인용이라 보지 않는다(P9b 원문 칸 선례).
8. **`applyTalkChecks` 의 잘한 말 · 다음엔 이렇게는 걸린 줄만 뺀다**(plan '비움' — 6.4 '그 항목을 빼고' 와 같은 줄 단위로 읽음). 힌트 묶음 · 끝인사 묶음 · 요약은 통째로 비우고 `hintsBlocked` · `farewellBlocked` · `summaryBlocked` 를 돌려준다.
9. **`checkLowLevelAiQuestion` 옵션.** plan 의 `forms` 를 `forms`(시드 형태 표) + `allowedForms`(reference-index `allowedForms` 결과)로, 어휘 범위는 `allowedWords`(P9c) + `lemmaOf` 로 받는다. 걸린 갈래: question · too_long · hint_pair · answer_example · offband · form.
10. **`createToriEnReader` 는 문자열이 닫히는 조각에서 마지막 문장을 바로 낸다**(finish 를 기다리지 않음 — 첫 문장 시간과 무관하나 마지막 문장이 JSON 끝까지 기다리지 않게). 끊겨 닫히지 않은 조각은 내지 않는다. `closed()` · `text()` 를 더했다.
11. **`talkPositionOf` 입력.** plan 은 토막을 흐름이 정한다고 적었으나 '더 이야기하기' · '그만하기'는 아이가 고르는 것이라 sessions.talk_segment(저장된 토막)를 `segment` 로 받는다. 따라 말하기 자리는 `follow: { done, total }`. 토리 행 가벼운 꼴에 칸 셋을 둔다: `cardQuestionNo`(4+ C19), `moreTalkFallback`(1~3 AI 질문을 대신한 '더 이야기할 거리' 차례), `morePrompt`(이 토리 행이 '더 이야기할래?'로 끝나고 그 뒤 질문을 붙이지 않음). 질문 차례는 아이 행을 되짚어 정하므로 1~3단계 카드 턴 번호를 행에 적지 않아도 된다(요청 2).
12. **`talkFlowOf({ spec, todayWordCount, practiceCount })`.** 오늘 쓸 말 · 말해 보기를 건너뛰는지는 수업 상태(C33 · C97)라 카드만으로 정할 수 없다.
13. **힌트 '쓸 수 있는 말'은 영어 틀 단의 속성(`usable`)으로.** 따로 단을 두면 C20 의 단 수가 달라진다(5단계 둘째 단 · 6단계 첫 단과 함께 열림 — 3.3).
14. **`talkTargetsOf(card)`** — 카드 꼴(turns · questions)로 가를 수 있어 spec 을 받지 않는다.
15. **회화 시도의 건너뛴 까닭에 `stalled` 를 더했다**(P11a 시도 꼴과 같게, 7절 감시 타이머 멈춤). `countsAsSaid` · `sendsAsDontKnow` · `turnSegmentOf` · `talkContextDelta` · `praiseLineOf` · `safeLineOf` 는 plan 에 없던 작은 도우미다(b 가 같은 판정을 두 군데에서 짜지 않게).
16. **listen.ts 의 8단계 경계는 상수 `TALK_LONG_ANSWER_FROM_LEVEL`**(3.3 단계표 · C37, 12절 키가 아님 — `PASSAGE_PICTURE_UNTIL_LEVEL` 선례). `confirmPlanOf` 는 `level` 대신 `lowLevel`(카드 꼴)을 받는다. `friendshipAfter` 는 band 를 받지 않고 지금 구간의 연 수(`opened`)를 받는다(C98 jsonb 를 b 가 읽음).

### 회11 (1)~(15) 대조

| 해석 | 이 차례에서 | 자리 |
|---|---|---|
| (1) 오늘 쓸 말 차례 · 따라 말할 것 | 단어 목록 · 활동 번호 · 듣기 규칙(follow) | `todayWordsOf` · `followAlongNo` · `talkEndRuleFor` — 화면은 b |
| (2) 결과 말 뒤 저절로 다음 · 인식 실패 건너뜀 | 시도 꼴의 `skipped` · `failures` | 화면 흐름은 b |
| (3) 둘째 바퀴 섞기 | 세션 id 해시, 첫 바퀴와 다름 | `practiceOrderOf` |
| (4) 1~3단계 질문 차례 | 카드 턴 → 넘어간 질문(답 예시) → 더 이야기할 거리 → AI, 목표 턴 뒤는 남은 거리부터 | `talkPositionOf` |
| (5) 처음 묻는 턴 | 하나라도 처음이면 first, 인사 턴 · 더 이야기할 거리 · AI 턴은 고정 | `askKindOf` · `talkPositionOf` |
| (6) '모름' 수 · 답 두 개 다시 | 질문이 바뀌면 0, 처음 묻는 턴 '모름' 뒤 답 두 개 | `talkPositionOf` · `appendAfter` |
| (7) 1~4단계 뜻 줄 | 붙일 말마다 뜻(koMeaning) | `appendAfter` — 잇는 것은 b |
| (8) 대신 질문 | 아직 쓰지 않은 가장 앞 카드 질문 | `nextUnusedQuestionNo` · `appendAfter`(cut) |
| (9) 이어 할 때 | 지금 질문 · AI 자리면 `fallback`(가장 오래전에 쓴 거리), 4+ 힌트는 카드 번호 · 0 이면 없음 | `talkPositionOf` · `hintTiersOf` |
| (10) 홈 · 안전 상한 닫힘의 끝맺음 | — | b |
| (11) 되짚을 말 | 값 10 | `wrapUpLinesOf` |
| (12) 오늘 얻은 단어 듣기 단추 | 만남 찾기만 | `metWordsIn` — 화면 b · c |
| (13) 한 번 더 말해 보기 문장 | 값 10 | `againLineOf` |
| (14) 안전 상한 턴 수 | '모름' 포함 아이 턴 | `TalkPosition.childTurns`(P9c `talkSafetyOf` 에 넘김) |
| (15) 처음 안내 · 마이크 안내 | — | b |

### 정할 것 · 요청

0. (닫힘) 컨트롤러가 f76aaac 맞춤으로 닫음 — 워크트리 specs/09 에 C96 `speech.slow_rate` 행이 들어와 `pnpm test` 58 파일 · 582 통과 · 6 todo, check-ids.test.ts 초록.

1. (요청, 컨트롤러) `tests/contract/ai-schemas.test.ts` 에 talk_turn 갈래(규격 제목 `talk_turn` → `talkTurnSpec` · 끝맺음은 case 이름으로 `talkClosingSpec`, 입력은 견본 빌더)를 더하면 견본을 `samples/` 제자리로 옮긴다. 차례 2 브리프에 넣기를 권한다.
2. (b 에 넘김, fix 1 I2 · M3 · M6 로 고침) 토리 행 가벼운 꼴의 네 칸을 C101 의 `ai_question` jsonb 열에(컨트롤러 고침 18:3x — 앞 글 'DB 열 없이' 는 틀림) b 가 만든다: `cardQuestionNo` = talk_turns.card_question_no(4단계부터 — 대화 첫 질문 1번은 흐름이 스스로 넣으므로 인사 끝 토리 행에 1 을 따로 적지 않아도 된다), `moreTalkFallback` = 붙인 질문이 '더 이야기할 거리' 질문과 같은지, `aiQuestion` = 1~3단계 그 행이 붙인 AI 질문(영어 · 뜻 · 답 예시 · 힌트 — 토리 행 원문에 붙인 말에서, 없으면 null), `moreChosen` = 고르기 차례의 토리 행에 아이가 '더 이야기하기'를 골라 앱이 다음 질문을 붙였음(1~3단계는 원문 마지막 줄이 `MORE_PROMPT.en` 이 아님, 4단계부터는 AI 글 줄 뒤에 앱이 붙인 카드 질문 줄이 있음). 고르기 차례 자체는 흐름이 목표 턴 · 바퀴 끝 아이 행으로 스스로 판정한다. '더 이야기하기'를 고르면 b 가 다음 질문(1~3단계 position.pending, 4단계부터 `nextUnusedQuestionNo` 의 카드 질문을 권함)을 그 토리 행에 붙이고 그 번호를 cardQuestionNo 로 둔다. 1~3단계 회화 턴 입력의 `aiQuestionSlot` 은 `nextQuestionIsAi`(C100)로 채운다. 차례 2 보충(재검토 N1 · N2 · N3): 4단계부터 `moreChosen` 은 붙인 줄이 `MORE_PROMPT.en` 이면 '골랐음'이 아니다(끊긴 목표 턴에 앱이 '더 이야기할래?'를 붙이므로). `aiQuestionSlot` 은 `nextQuestionIsAi(args, 이번 입력)` 로 — '모름'을 보낼 턴은 talk.dontknow_max 번째가 아니면 거짓. `aiQuestion` 은 talk_turns 토리 행의 `ai_question` jsonb 열(13절 C101, fix 2 에서 앞 결정 N3 를 고침 — 마이그레이션은 b 차례 4 에서 C98 열과 함께)에 그 행이 붙인 AI 질문(영어 · 뜻 · 답 예시 · 힌트)을 저장하고 이 칸으로 읽는다. '다시 쓸 토리 차례'는 화면에 보인 영어 글 그대로라(6.1 · AC-15k) 거기에 넣지 않는다. b 계약 하나 더: `talkTurn` 의 `onSentence` 는 던지지 않는다 — 브라우저 연결이 닫혀도 쓰기 실패를 삼키고 응답을 끝까지 받아 토리 행을 저장한다(던지면 흐름이 그 시도를 연결 실패로 기록한 뒤 다시 던짐).
3. (정할 것) 인사 끝 턴에서 AI 가 막힘(stuck)으로 알리면 흐름은 '모름'처럼 같은 인사 질문을 다시 묻지만 AI 는 이미 '넘어가는 말'을 썼다. 드문 경우라 그대로 두었다 — b 가 그 턴의 붙일 말(답 예시 + 같은 질문)로 덮는다.
4. (닫힘, fix 1 I1 · 13절 C99) 만남 찾기는 동음이의어 묶음을 쓰지 않는다 — `metWordsIn` 이 homophones 를 받지 않음.
5. (확인함) 1~3단계 AI 질문 검사의 어휘 범위는 vocab 에 있는 낱말(원형 · 활용형)만 범위 안으로 본다. 실시드 `seed/vocab.json` 에 기능어가 1단계로 있다(my · the · a · what · your · I · it, is 는 be 의 활용형). 과거형 was 같은 꼴은 어휘가 아니라 형태 표(past-be, rst 6단계)가 막는다.

## fix round 1 (2026-10-22 17:2x)

브리프 `task-p13-fix1.md`, 검토 `review-p13-1-code.md`(C 0 · I 2 · M 6). 커밋하지 않았다.

| 지적 | 고친 자리 | 덮는 시험 |
|---|---|---|
| I1(C99) | `src/core/conversation/said.ts:101` `metWordsIn(text, { unitWords, lemmaOf })` — 동음이의어 묶음 없이(빈 묶음) 소문자 · 문장 부호 · 숫자 · 축약형 · 원형까지. `saidWordsOf` 그대로 | `conversation-said.test.ts:131` "회화 만남: 토리 말 · 카드 질문 · 오늘 쓸 말에서 단원 단어를 원형까지 맞춰 찾고 동음이의어는 맞추지 않는다(C99)" — 'I see it too. I want to go.' → go 만, '말했다'의 'to dogs' → two 는 그대로 |
| I2(권함 가) | `flow.ts` 커서의 `choicePending`(:621 · :636 · :640) — 목표 턴 · '더 이야기하기' 한 바퀴를 끝낸 아이 행에서 서고, 다음 아이 행이나 `moreChosen` 토리 행(:597)에서만 내린다. 토리 행 칸 `morePrompt` 를 반대 표지 `moreChosen`(:283)으로 바꿈. 보고 '요청 2' 의 b 유도 규칙을 고쳐 적음 | `conversation-flow.test.ts:643` "회화 흐름: 4단계부터 목표 턴과 '더 이야기하기' 한 바퀴 끝에서도 흐름이 스스로 고르기를 열고 고른 표지가 설 때까지 기다린다"(AI 가 제 말로 묻는 토리 행 · 두 바퀴) · 1단계 시험(:477~)은 도우미가 `moreChosen` 으로 고름 |
| M1(C100) | `talk.ts:110` `TalkTurn.aiQuestionSlot` · 사용자 메시지 늘 넣는 줄 `AI question slot: yes|no`(:460) · `normalizeTalk` 조건(:633) · 1~3단계 고정부(:360). `flow.ts:742` `nextQuestionIsAi(args)` — 지금 질문에 답한 아이 행을 하나 더한 자리가 AI 자리인지(목표 턴 전 · 뒤) | `conversation-call.test.ts:509` "회화 턴 정규화: 목표 턴 전 대화 토막의 AI 자리에서도 next_question_en 이 남는다(C100)" · `:480` 이름을 'AI question slot' 기준으로 고침 · flow 시험의 넘어간 질문 시험에 `nextQuestionIsAi` 단언(마지막 '더 이야기할 거리'에서만 참) |
| M2 | `flow.ts:623` `onChild` 첫머리에서 `row.targets` 를 `cur.asked` 에 더함 | `conversation-flow.test.ts:696` "회화 흐름: 4단계부터 이어 묻는 질문이 노린 단어를 뒤 카드 질문이 노리면 다시 묻는 턴이다" |
| M3 | `flow.ts:278` 토리 행 칸 `aiQuestion: AiQuestionLite | null`(:287 — 영어 · 뜻 · 답 예시 · 선택 힌트), `withAiQuestion`(:571)이 AI 자리 질문을 채움 → '모름'이면 `appendAfter` 가 답 예시 + 같은 질문, `hintTiersOf` 가 실린 힌트 | `conversation-flow.test.ts:727` "회화 흐름: 1~3단계 AI 질문에 '모름'이면 토리 행에 실린 그 AI 질문을 답 예시와 함께 다시 붙인다". 채우기는 b(요청 2) |
| M4 | 이름만 | `conversation-stream.test.ts:301` "회화 턴: 첫 문장 뒤 실패(거절 · max_tokens · 타임아웃 · 연결 · 서버)는 다시 부르지 않고 그 턴을 닫는다" — AC-15b 통합 이름은 차례 2 |
| M5 | `talk.ts:701` `talkValidate` — 잘한 말 · 다음엔 이렇게를 같은 조건(level ≥ talk.feedback_from_level, 아니면 0개) | `conversation-call.test.ts:534` "회화 턴 정규화: 엄격 검증은 잘한 말도 다음엔 이렇게와 같이 talk.feedback_from_level 미만이면 0개를 기준으로 본다" |
| M6 | `flow.ts:536` 4단계부터 대화 토막에 들어갈 때 1 을 `usedQuestionNos` 에 넣음(상수 `FIRST_CARD_QUESTION_NO`) | `conversation-flow.test.ts:613` "회화 흐름: 4단계부터 대화 첫 질문(카드 1번)은 흐름이 스스로 쓴 카드 질문에 넣어 끊긴 턴의 대신 질문으로 다시 나오지 않는다" · 대신 질문 시험의 'b 가 1 을 적는다' 가정을 지움(인사 끝 토리 행 cardQuestionNo 0, 쓴 번호 [1, 0, 3, 0]) |

다르게 한 것: M3 의 실린 AI 질문에 선택 칸 `hintKo` · `hints` 를 더했다(브리프는 영어 · 뜻 · 답 예시). '모름' 둘째부터 힌트 마지막 단까지 열어야 하는데(3.3) 실린 힌트가 없으면 AI 자리 질문의 힌트 단이 비기 때문이다. M5 · M2 의 코드는 시험보다 먼저 고쳤다(시험은 고치기 전 꼴에서 실패함을 코드로 대조: M2 전에는 'first', M6 전에는 다음 대신 질문 1, I2 전에는 4단계 고르기가 열리지 않음).

관문(워크트리 p13, Node 24):
```
pnpm -s biome ci .           → exit 0
pnpm test                    → exit 0, 58 파일 · 588 통과 · 6 todo (회화 단위 84 = 차례 1 · 3 의 78 + fix 6)
pnpm exec tsc --noEmit       → exit 0
pnpm check:deps              → exit 0
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0
pnpm check:ids               → 보고만, 설정 키 위반 0 · 새 파일 design-number 0
```
남은 우려: 13절 C99 · C100 은 본 저장소 정본에만 있다(워크트리 정본 맞춤은 컨트롤러 몫). 정할 것 3(인사 끝 턴의 막힘)은 그대로 열림 — b 확인.

## 차례 2 (2026-10-22 18:1x)

브리프 `task-p13-2.md`, plan-p13a 작업 2(파일별 값 3~6). 워크트리 p13(HEAD f3adcd8 위). 커밋하지 않았다. 통합 시험은 이 Mac 에서 embedded-postgres 가 뜨지 않아(`TypeError: done is not a function`, 장부 환경 행 그대로) CI 몫이다.

### 바뀐 파일

| 파일 | 신규/수정 | 무엇 |
|---|---|---|
| `src/server/ai/client.ts` | 수정 | `sendStreamingAttempt`(:215) — beta `messages.stream` 의 text 조각만 `onText` 로, 첫 text 기다림 · 전체 기다림을 제 시계로 재고 `stream.abort()`(위험 1), 끝은 `finalMessage()`. 끊긴 스트림의 `AnthropicError`('terminated')는 connection 으로(:197 `toStreamingFailure`) |
| `src/server/ai/talk.ts` | 신규(660줄) | `streamTalk`(:232 — DB 없는 몫: 시도 · 흘려 받기 · 문장 검사 · 다음 할 일 · 정규화 · 출력 검사, 행은 `record` 로) · `finishTalk`(:417) · `runTalkCall`(:540 — 설정 · 학습일 · 단가표 · 조합 → 하루 안전 상한 → 목록 · 가림 → `streamTalk`, 같은 오류 알림) · `TALK_REFUSAL_RETRY`(:80, 6.1 Sonnet 5.5 · low · 끔) · `otherModelConfigOf`(:500 — 서버 측 대체 모델 재시도가 없는 모델의 talk_turn 만) · 결과 꼴 `TalkOutcome` · `TalkSuccess` |
| `src/server/ai/run.ts` | 수정(동작 그대로) | `BASE_SETTING_SCHEMAS` · `logConfigProblem` · `isConfigError` · `maskerFor` · `warnAnswer` 를 내보냄, 같은 오류 알림을 `alertSameError`(:242)로 꺼냄(runAiCall 이 부름) |
| `src/server/ai/index.ts` | 수정 | `talkTurn`(:134) · `talkClosing`(:146 — closing 이 아니면 던짐) · 결과 형 다시 내보냄 |
| `tests/fixtures/ai/fake-anthropic.ts` | 수정 | `FakeReply` `stream`(body · chunks · delayMs · firstDelayMs · cutAfterChars) · `streamStepsOf`(:247 — 문서의 SSE 차례, fallback 블록 그대로 끼움, usage · iterations 는 message_delta) · fetch 가짜(ReadableStream, 끊음 = 'terminated')와 node:http(e2e) 둘 다. 비스트리밍 응답 그대로 |
| `tests/fixtures/ai/sample-inputs.ts` | 수정 | `TALK_BASE_TURN` · `talkSample(level, over)`(:382) · `talkSampleFor(case, level)`(:415) — 계약 · 통합 · 단위가 같이 씀 |
| `tests/contract/ai-schemas.test.ts` | 수정 | talk_turn 갈래(:190 — 끝맺음 견본은 이름으로 talkClosingSpec), 회화 턴 글은 text 블록을 차례로 이음(위험 4), 엄격 표본 제목에 talk_turn |
| `tests/fixtures/ai/samples/talk_turn.*.json` | 옮김 9개 | `samples/talk/` → `samples/`(요청 1 닫음). 읽는 단위 시험 둘의 경로도 |
| `tests/integration/conversation-call.test.ts` | 신규 | plan 증명 표 통합 이름 스물(글자 대조 0 빠짐) |
| `tests/unit/talk-stream-call.test.ts` | 신규 | `streamTalk` 단위 열둘(가짜 SSE · SDK 실제 스트림 처리) — 통합을 로컬에서 못 돌려 같은 길을 DB 없이 본다 |
| `src/core/conversation/flow.ts` | 수정 | N1 `appendAfter` 4단계부터 끊긴 턴이 고르기 차례면 '더 이야기할래?'(:875) · N2 `nextQuestionIsAi(args, input)`(:746 · :767) · N3 `aiQuestion` 설명 |
| `tests/unit/conversation-flow.test.ts` | 수정 | N1 · N2 시험 둘 |

### 시험

- 단위: 59 파일 · 602 통과 · 6 todo(차례 1 · 3 · fix 1 뒤 588 + talk-stream-call 12 + flow N1 · N2 2). 계약 22 통과(회화 견본 아홉 포함).
- 통합(CI): `tests/integration/conversation-call.test.ts` 20 — AC-15b 일곱 · AC-15k · AC-8f 셋 · AC-8i 둘 · AC-8c · AC-16b · AC-N4 · '회화 턴:' 넷.
- talk-stream-call 이 보는 것: 걸린 문장 미발송 · 첫 자리만 안전한 대사 · tori_en = 보낸 문장 · 행 상태 검증 실패 / 뜻이 걸리면 전체 '' / 힌트 Zod 실패 → 다시 요청 없이 빈 힌트 / 첫 속성이 tori_en 이 아니면 끝에서 한 번에 / fallback 블록에서 한 번만 · 답한 모델 · 비용 / 끝맺음 흘려 보내지 않음 / 첫 문장 뒤 끊김 → cut_after_first(connection) / 첫 문장 전 연결 오류 1회 다시(같은 본문) · 두 번이면 실패 / 첫 text 타임아웃 → abort → 1회 다시 / Haiku 거절 → Sonnet 1회(같은 메시지 · low · between_tools) · 둘 다 거절이면 refusal 2 · 다시 부른 쪽이 답하면 그 답 / 첫 문장 뒤 거절 → 다시 없이 닫음 / max_tokens.

### 관문(워크트리 p13, Node 24)
```
pnpm -s biome ci .           → exit 0
pnpm test                    → exit 0, 59 파일 · 602 통과 · 6 todo
pnpm exec tsc --noEmit       → exit 0
pnpm check:deps              → no dependency violations (172 modules · sdk-only-in-ai 포함)
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0
pnpm check:ids               → 설정 키 위반 0, design-number 35(바탕 그대로 — 새 파일 0)
pnpm vitest run --project integration tests/integration/conversation-call.test.ts → 로컬 불가(embedded-postgres), CI 몫
```

### 다르게 한 것

1. **흐름을 둘로 나눴다(`streamTalk` · `runTalkCall`).** plan 값 4 는 한 함수였다. 통합 시험을 로컬에서 못 돌리므로 시도 · 흘려 보내기 · 실패 길을 DB 없이 단위 시험으로 보려고 갈랐다. 앞머리 차례(설정 → 학습일 → 단가표 → 조합 → 안전 상한 → 목록 → 가림)는 runAiCall 과 같다.
2. **run.ts 에서 셋을 더 내보냈다**(plan 은 maskerFor · isConfigError 둘): `BASE_SETTING_SCHEMAS` · `logConfigProblem` · `warnAnswer`, 그리고 같은 오류 알림을 `alertSameError` 로 꺼냈다(runAiCall 동작 그대로 — 기존 단위 · 계약 초록, 통합은 CI).
3. **응답 글은 text 블록을 모두 이은 글이고, JSON 이 아니면 마지막 fallback 뒤 글로 한 번 더 본다**(위험 4 — 대체 모델이 처음부터 다시 쓰는 꼴이어도 받게). 흘려 보낸 문장은 이은 글 기준이다.
4. **메타 문장 목록을 `TalkDeps.metaPhrases` 로 받는다**(기본 `loadSeedList("metaSentences")`). P9c `OutputCheckLists` 는 금지어뿐이라 고치지 않았다.
5. **Haiku → Sonnet 재시도는 talk_turn 에만**(6.1 '회화 턴'). 끝맺음 턴의 거절은 그대로 실패다. 재시도 구성은 `requestConfigOf` 에 모델 · effort · 생각 키만 바꾼 값을 넣어 만든다(조합 검사 그대로, 안 되면 재시도 없음).
6. **결과에 `streamed`(흘려 보냈는지) · `retriedOtherModel` 을 더했다**(plan 값 4 의 `toriEnChecked` 는 `blocked` 목록으로).
7. **견본 입력 빌더를 `sample-inputs.ts` 에 더했다** — 계약 시험 갈래가 입력을 요구한다(plan 파일 표 밖, 시험 자료).

### 정할 것 · 우려

1. (위험 3 · 4 — 추측 그대로) 구조화 출력이 tori_en 을 먼저 흘린다는 것과 대체 모델이 이어 쓴다는 것은 가짜로만 봤다. 틀리면 첫 길은 끝에서 한 번에 보냄(`streamed: false`, 맞게는 돎), 둘째 길은 마지막 fallback 뒤 글로 다시 읽음. 실호출 표본(`pnpm ai:contract`, 차례 11 [사람])으로 확인할 것.
2. (위험 2) 생각 끔 + 구조화 출력 + 스트리밍의 실제 400 여부도 실호출 표본 몫.
3. 첫 문장 뒤 끊김 · 거절 · max_tokens 행의 토큰 · 비용: 거절 · max_tokens 는 finalMessage 의 usage 로 셈, 연결이 끊긴 시도는 usage 가 없어 0 으로 남는다(8절 '출력 도중 거절은 나온 만큼' — 거절은 셈, 끊김은 셀 길이 없음).
4. 정할 것 3(인사 끝 턴의 막힘) 그대로 열림 — b.

## fix round 2 (2026-10-22 18:5x)

브리프 `task-p13-fix2.md`, 검토 `review-p13-2-code.md`(C 0 · I 1 · M 3). 커밋하지 않았다.

| 지적 | 고친 자리 | 덮는 시험(`tests/unit/talk-stream-call.test.ts`) |
|---|---|---|
| I1 | `src/server/ai/client.ts:204` `STREAM_ERROR_STATUS`(overloaded_error 529 · api_error 500 · rate_limit_error 429, 모르는 종류 500) — `toStreamingFailure` 가 상태 없는 APIError(SSE `error` 이벤트)를 그 상태의 HTTP 실패로 바꿔 8절 갈래(server · rate_limit)로 보낸다. 연결 · 끊음 오류도 상태 없는 APIError 의 하위 꼴이라 먼저 가른다. 가짜 SSE 에 `errorAfterChars` · `errorType` 걸음(`fake-anthropic.ts` stream 응답) | "회화 턴 흐름: 스트림 도중 오류 이벤트(overloaded)가 첫 문장 전이면 다시 부르지 않고 서버 실패로 끝나며 행 하나를 남긴다" · "회화 턴 흐름: 스트림 도중 오류 이벤트가 첫 문장 뒤면 보낸 문장을 두고 그 턴을 닫는다" |
| M1 | `client.ts` — onText 예외를 다시 던지지 않고 결과(`listenerError`, 실패 갈래 connection)로 돌려줌. `talk.ts:317` 그 시도를 기록한 뒤 다시 던짐. `index.ts` `talkTurn` 설명과 보고 '요청 2' 에 b 계약(onSentence 는 던지지 않고 응답을 끝까지 받음) | "회화 턴 흐름: 문장을 받는 쪽이 던지면 그 시도를 기록한 뒤 그 오류를 다시 던진다" |
| M2 | `client.ts` 실패 결과에 `snapshot`(stream.currentMessage), `talk.ts:401` `snapshotUsage` 가 그 usage 로 토큰 · 비용 · 답한 모델을 행에 넣음(첫 이벤트 전 끊김은 0) | "회화 턴 흐름: 끊기거나 끊은 시도의 ai_calls 행은 그때까지의 스냅숏 usage 로 입력 토큰 · 비용을 센다" |
| M3 | `fake-anthropic.ts` `streamStepsOf` — message_start 모델을 첫 fallback 블록의 `from.model`(없으면 body.model)로 | "가짜 SSE: message_start 는 요청 모델로 시작하고 fallback 블록에서 대체 모델로 바뀐다"(고치기 전에는 claude-sonnet-5 로 시작해 이 단언이 실패). 기존 fallback 시험 · 통합 AC-8f 비용의 '답한 모델 claude-sonnet-5' 는 이제 SDK 가 fallback 블록에서 바꾼 값을 본다 |
| N3 보정(C101) | `flow.ts` `aiQuestion` 설명을 `ai_question` jsonb 열로, 보고 '요청 2' 를 C101 로 고침. 마이그레이션은 하지 않음(b 차례 4) | — |

다르게 한 것: I1 의 첫 문장 전 오류 이벤트는 브리프 표의 '한 번 다시'가 아니라 다시 부르지 않는다. 8절 '회화 턴 실패'와 6.1 의 '한 번 다시'는 첫 문장 전 연결 오류 · 타임아웃만이고, 오류 이벤트는 서버 오류(5xx · 529) 갈래라 비스트리밍 흐름(runAiCall)과 같이 다시 보내지 않는다. 검토 I1 '어떻게'의 시험 꼴(첫 문장 전이면 실패 · 행 1 · 다시 부르지 않음)을 따랐다. 바꾸려면 13절 한 줄이 먼저다. 오류 코드는 `server:529` 처럼 그 종류의 상태를 붙인다(스트림 안 오류라 실제 HTTP 상태는 200).

관문(워크트리 p13, Node 24):
```
pnpm -s biome ci .           → exit 0
pnpm test                    → exit 0, 59 파일 · 607 통과 · 6 todo (talk-stream-call 17)
pnpm exec tsc --noEmit       → exit 0
pnpm check:deps              → exit 0
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0
pnpm check:ids               → 설정 키 위반 0 · design-number 35(바탕 그대로)
```
통합 20 은 CI 몫(로컬 embedded-postgres 불가).

## 차례 4 (2026-10-22 20:1x) — P13b 작업 2: 회화 세션 서버 · 턴 길 · 끝맺음 · 안전 상한

브리프 `task-p13-4.md`(덧 19:2x 까지), plan-p13b 작업 2 · 파일별 값 1~6 · 정할 것 회16~회18, a '회화 수업 모델' 4 · 5. 워크트리 p13(HEAD 6d1f929 = 합침 ① 뒤). 커밋하지 않았다. 통합 시험은 이 Mac 에서 embedded-postgres 가 뜨지 않아(`TypeError: done is not a function` — 20:0x 에 다시 확인) CI 몫이다.

### 바뀐 파일

| 파일 | 신규/수정 | 무엇 |
|---|---|---|
| `src/db/schema/learning.ts` | 수정 +4 | `profile_tracks.tori_stories_by_band` jsonb(C98, 구간 → 연 수) · `talk_turns.ai_question` jsonb(C101). 둘 다 비울 수 있음 |
| `drizzle/0003_talk_ai_question_stories_by_band.sql` · `drizzle/meta/0003_snapshot.json` · `_journal.json` | 신규 · 수정 | `pnpm exec drizzle-kit generate` 로 만든 마이그레이션 하나(ALTER TABLE ADD COLUMN 둘). 적용(`db:migrate`)은 CI |
| `src/server/conversation/state.ts` | 신규 | 공용 바탕: `readTalkState`(:596, 세션 행 FOR UPDATE 선택 · 카드 · 단계 규격 · talk_turns · 처음 스냅숏 · 따라 말하기 · 끝의 토리 말 없는 아이 행 떼기 · a `talkPositionOf`) · 토리 행 원문 꼴(`toriTextOf` :165 — 첫 줄 AI 글, 뒤 줄 붙인 말) · 네 칸 유도(`liteOf` :231 · `moreTalkFallbackOf` :186 · `moreChosenOf` :204 · `aiQuestionOf` :225) · 흘려 보낼 줄(`TalkLine` · `addLinesOf` :352 · `appendLinesFromText` :419) · 1~3단계 영어 빼기(`pendingViewOf` :466 · `hintViewsOf` :487) · 회화 턴 입력(`talkInputOf` :914 · `historyOf` :796 · `openingLineOf` :814 · `talkContextAt` :832 · `summariesBefore` :773) · '말함' 행(`writeSay` :992 · `metSayOf` :1069) · `reachTalkTarget`(:1111) · 이음매 `onTalkSessionEnded`(:1102, 빈 함수) |
| `src/server/conversation/index.ts` | 신규 | 값 1: `loadTalkView`(:438, 처음 열 때 한 트랜잭션으로 처음 스냅숏 · 토리 행 1) · `readTalkSessionArea`(:544) · `saveFollowAlong`(:612) · `advanceTalk`(:777) · `chooseMoreTalk`(:896) · `stopTalk`(:1144) · `leaveTalk`(:1195) · `markTalkNotice`(:1246) · `revealTalkHint`(:1278) · 끝맺음 · 이음매 다시 내보냄 |
| `src/server/conversation/turn.ts` | 신규 | 값 2: `runTalkTurnRequest`(:589) · 아이 행 칸 `childRowOf`(:179, 이름 묻기 턴 가림 `childTextOf` :161) · 결과 → 토리 행 순수 함수 `toriPlanOf`(:295) · 1~3단계 AI 질문 검사 재료 · `TALK_BREAK_LINE` |
| `src/server/conversation/closing.ts` | 신규 | 값 3: 끝맺음 기록(attempts activity_no 0 · `talk-closing:<세션 id>`) 상태 `ClosingStateSchema`(대기 · 옴 · 못 함 · 건너뜀) · `insertClosingRecord`(:120) · `runTalkClosing`(:245, 잡기 · 미룸 · 요약 저장 · 지우기) · `talkClosingStatus`(:414) · `closeIdleTalks`(:476, (가) (나) (다)) · `safetyClosesOn`(:182) · `clearSentMessages`(:149) · `closeWithoutClosing`(:163) |
| `src/server/actions/conversation.ts` | 신규 | 값 4: 액션 여덟(첫 문장 `await requireAccess()`, 끝맺음은 `after()`) |
| `src/app/api/talk/turn/route.ts` | 신규 | 값 5: `POST` — 첫 문장 `requireAccess()` · 같은 출처 아니면 403 · 본문 4000자 넘으면 413 · NDJSON `ReadableStream`(줄마다 enqueue, 쓰기 실패 삼킴) · `dynamic = "force-dynamic"` · `maxDuration = 60` · `content-type: application/x-ndjson; charset=utf-8` · `cache-control: no-store` |
| `src/server/session/index.ts` | 수정 +26 −13 | 값 6: `START_AREAS`(:85 — 회화 더함) · `startUnsafe` 회화는 AI 필요 판정을 `area === "talk" ||`(카드 `.content` 읽지 않음) · 세션 행 `talkSegment: "greeting"`(회화만) · 유일 색인 충돌 길의 `lesson.area !== "talk"` 지움 · `inProgressOf` 영역 형 `Area` · `readSessionPlace` 가 회화도 돌려주되 `completed` 는 회화면 늘 거짓(결과 쪽 없음 — 회16). 쓰기 둘째 세션 · feedback_pending · 되살림 길은 손대지 않음 |
| `src/server/lesson-list/index.ts` | 수정 +2 −1 | 값 6: `readLessonList` 영역 형 `Exclude<Area,"talk">` → `Area` |
| `tests/integration/conversation-session.test.ts` | 신규 | 통합 21 |
| `tests/integration/conversation-turn.test.ts` | 신규 | 통합 11 |
| `tests/integration/talk-fixture.ts` | 신규 | 두 통합 파일의 공용 바탕(시드 · 회화 1 · 4단계 수업 행 · 가짜 SSE 규칙 · 화면 흉내) |
| `tests/unit/conversation-server.test.ts` | 신규 | 단위 19(순수 몫 — 로컬에서 도는 대조) |

### 시험

- 단위: 61 파일 · **631 통과 · 6 todo**(합침 ① 뒤 612 + conversation-server 19). `access-gate.test.ts` 11 통과 — 새 route.ts 처리기와 `'use server'` 액션 여덟을 허용 목록 없이 저절로 본다.
- 통합(CI): plan 증명 표의 통합 이름 **32개 전부 글자 그대로**(스크립트 대조, 0 빠짐). conversation-session 21: AC-15c · AC-15f 넷 · AC-16b 둘 · AC-16c · AC-2c · AC-8c · '1-가 안전 상한(회화):' 셋 · '회화 세션:' 여덟. conversation-turn 11: AC-15b 넷 · AC-15i 셋 · AC-15j · AC-15k 둘 · AC-8b.
- 단위 19(접두 '회화 서버:' · AC-15b · 15i · 15k · 16b 의 '(순수 몫)'): 원문 첫 줄 꼴 · moreChosen 1~3 / 4+ 규칙 · moreTalkFallback · aiQuestion 꼴 읽기 · 막힘 · 턴 차례 · 끝 아이 행 떼기 · 붙일 말 → 줄(again · two_answers · 칭찬은 s) · 저장 줄 다시 가르기 · 1~3단계 서버 자료에 아이가 말할 영어 없음 · 성공 / 끊김 / 첫 문장 전 실패(1~3 칭찬 · 4+ 쉼, 뜻은 koMeaning) / 거절 / 4단계 끊김 카드 번호 / AI 자리 검사 통과 · 걸림 되돌림 / 4단계 인사 토리 행 번호 비움 · 이름 묻기 턴 가림 · 끝맺음 상태 · 앞 턴 짝 · 바뀐 칸.
- 순서: 계획대로 시험 먼저가 아니었다 — 서버 세 파일을 먼저 쓰고 단위 · 통합을 뒤에 썼다(통합을 로컬에서 빨강으로 볼 수 없어 길을 먼저 굳힌 뒤 손 대조로 맞춤). 단위 19 는 첫 실행에서 초록이었다.

### b 에 넘긴 값 넷(a 보고 '요청 2')의 유도 규칙 — 구현함

| 칸 | 저장 · 유도 | 자리 |
|---|---|---|
| cardQuestionNo | talk_turns.card_question_no 열 그대로. 4단계부터 AI 값, 첫 문장 뒤 끊김 · 거절은 앱이 붙인 카드 질문 번호(물음표 문장이 있으면 0), '더 이야기하기'는 앱이 붙인 번호. 1~3단계와 **인사 토막 토리 행은 비움**(대화 첫 질문 1번은 흐름이 스스로 넣음) | `state.ts liteOf` · `turn.ts toriPlanOf` · `index.ts chooseMoreTalk` |
| moreTalkFallback | 토리 행 원문의 붙인 줄 가운데 카드 '더 이야기할 거리' 질문과 같은 줄의 차례(없으면 null). 흐름은 AI 자리에서만 쓴다 | `moreTalkFallbackOf` |
| aiQuestion | talk_turns.ai_question jsonb(C101) — 1~3단계 AI 자리에서 `checkLowLevelAiQuestion` 을 지난 AI 질문만(영어 · 뜻 · 답 예시 · 뜻 힌트 · 영어 힌트 단). 이어 하기는 흐름이 이 칸으로 같은 질문을 다시 낸다 | `aiQuestionOf` · `toriPlanOf` |
| moreChosen | 1~3단계: 원문 마지막 줄이 'Do you want to talk more?' 가 아니면 참. 4단계부터: AI 글 줄 뒤에 붙인 줄이 있고 그 마지막이 그 말이 아니면 참(N1 — 끊긴 목표 턴의 '더 이야기할래?'는 골랐음 아님). '더 이야기하기'를 고르면 앱이 그 토리 행 원문 · 다시 쓸 토리 차례에 다음 질문을 붙인다 | `moreChosenOf` · `chooseMoreTalk` |

`aiQuestionSlot` 은 a `nextQuestionIsAi(args, 이번 입력)`(C100 · N2)로 채운다. `onSentence` 는 try 로 감싸 던지지 않는다(a2 M1).

### 다르게 한 것(까닭)

1. **파일 셋을 더했다.** `src/server/conversation/state.ts`(index · turn · closing 이 같이 쓰는 상태 읽기 · 유도 · '말함' 행 — 셋 사이 가져오기 순환을 없애려고, check:deps no-circular), `tests/integration/talk-fixture.ts`(두 통합 파일의 같은 준비), `tests/unit/conversation-server.test.ts`(통합을 로컬에서 못 돌려 순수 몫을 로컬에서 봄 — 차례 2 talk-stream-call 과 같은 까닭). plan 의 `reachTalkTarget` · `onTalkSessionEnded` 는 state.ts 에 두고 index.ts 가 다시 내보낸다.
2. **1~3단계 서버 자료에 아이가 말할 영어를 넣지 않는다**(브리프 '서버 자료에도 글을 내려 주지 않게'). 끝 줄 · 화면 자료의 지금 질문은 답 예시 · 힌트 글을 빼고, 힌트 영어 단은 글 없이 종류 · 듣기 표시만 내린다. 연 단의 글은 새 액션 `revealTalkHint`(첫 문장 requireAccess)로 받는다 — plan 값 4 의 액션 목록에 없던 것이다. 토리가 읽어 주는 말(답 두 개 · '모름' 뒤 답 예시 + 같은 질문)은 읽어 주기에 글이 있어야 해서 `add` 줄에 든다(답 두 개는 글로 보이지 않는 칸 `answers`). 4단계부터는 그대로 내린다.
3. **`ko` 줄은 토리 반응 뜻(tori_ko)만**, 붙인 카드 질문 뜻은 그 `add` 줄의 `ko` 로 낸다(plan 은 'tori_ko + 붙일 카드 질문 뜻'을 한 줄로 적음 — 같은 뜻을 두 번 보내지 않게).
4. **'모름' 뒤 답 예시 + 같은 질문은 `add` 한 줄 `kind: "again"`(en = 답 예시 + 질문)**, 실패 길 칭찬 대사 · 거절 안전한 대사는 `{ t: "s" }`.
5. **4단계부터 거절에도 카드 질문을 붙인다**(plan 은 1~3단계만). 안전한 대사에는 질문이 없어 아이가 답할 질문이 비므로, 끊긴 턴과 같은 규칙(물음표 문장이 없으면 아직 쓰지 않은 가장 앞 카드 질문 · 그 번호)을 썼다. 정본 8절 '대화가 이어진다'의 해석 — 정할 것 4.
6. **AI 질문 검사의 어휘 원형을 그 단계 이하 vocab 전체 활용형으로 넓혔다**(`aiQuestionCheckOf`). 단원 단어 원형 표만으로는 기능어 활용형(is → be)이 범위 밖으로 걸린다(a 정할 것 5 의 '활용형'과 같은 뜻). 형태 표는 저장소 `seed/lists/forms.json`(rst 차례 · 그 단계 앞 단원까지)로, 읽지 못하면 AI 질문을 쓰지 않는다.
7. **대화 안전 상한의 '그 학습일 닿은 수'는 끝맺음 기록 시도 행의 입력 칸 `{ kind: "talk-closing", reason: "safety" }` 으로 센다**(`safetyClosesOn` — 닫은 까닭을 둘 다른 자리가 없음). 끝맺음 기록 입력은 a 시도 꼴(`TalkAttemptInputSchema`) 밖이라 closing.ts 의 자체 꼴로 읽는다.
8. **목표 턴 전에 대화 안전 상한 · (있을 수 없지만) 1-가 상한 닫힘에 닿으면 중단(aborted) + 학습일 + 이음매**로 둔다. 회화 수업 모델 5 표는 '대화 안전 상한 | completed'만 적었다('모름'이 많으면 목표 턴 전에도 아이 턴 80 에 닿을 수 있음).
9. **끝맺음 실패 셈**: 하루 안전 상한만 셈에서 빼고 설정 문제(키 없음)도 센다 — 셈하지 않으면 키 없는 프리뷰에서 대기가 영영 남아 보낸 메시지를 지우지 못한다. 두 번이면 못 함(`CLOSING_FAILURES_TO_GIVE_UP` 2 — 8절 고정 수, 12절 키 아님).
10. **'바뀐 턴에만 넣는 값'의 앞 값**은 저장 칸이 없어 다시 셈한다: 만난 단어는 처음 스냅숏 + 오늘 쓸 말(대화 토막부터) + 그 자리까지 토리 말에서 찾은 단원 단어, 미션은 그 자리까지 미션 체크. 아직 '안다'가 아닌 단어 · 새 단어 · 친한 정도는 지금 값을 앞 값에도 써서 대화 안에서 바뀌어도 넣지 않는다 — 정할 것 2.
11. **같은 시도 id 다시 흘림**: 그 토리 행이 마지막 행일 때만 다시 흘리고(첫 줄 = 문장, 붙인 줄은 지금 질문 · 카드로 갈래를 다시 가름), 그 뒤 행이 더 있으면 stale. 저장 칸에 토리 반응 뜻(tori_ko)이 없어 다시 흘릴 때 · 이어 할 때 반응 뜻은 없다 — 정할 것 3.
12. **이음매 `onTalkSessionEnded` 부르는 자리**: 목표 턴 닿음(`reachTalkTarget`), 목표 턴 전 '그만하기' · 안전 상한 닫힘(같은 트랜잭션), 다른 수업 고르기 · 시간 지남으로 닫힌 회화는 홈 진입 정리 (다)가 부르고 건너뜀 기록을 남겨 두 번 부르지 않는다(P10 파일 손대지 않음).
13. 통합 시험은 쓰기 6단계 첨삭 시험 꼴로 시험용 시드를 넣고 회화 1 · 4단계 단원 1 카드(같은 시드 나무 규격의 `talkUnitCards`)를 수업 행으로 더한다. 가짜 규칙은 사용자 메시지 줄 `\nClosing: no|yes`(JSON 본문 글)로 가른다 — 고정부의 'Closing: yes' 설명 글과 겹치지 않게.

### 정할 것(컨트롤러)

1. (회16 연장) `readSessionPlace` 는 회화 세션을 `{ area: "talk", completed: false }` 로 돌려 지금 쪽이 `/talk/lessons` 로 보낸다(결과 쪽으로 가지 않음). 열린 회화를 회화 틀로 그리는 갈래(`readTalkSessionArea` → `loadTalkView`)는 차례 5 의 쪽 고침이다.
2. 바뀐 턴 칸 가운데 '안다'가 아닌 단어 · 친한 정도가 대화 안에서 바뀐 것은 넣지 않는다(다른 까닭 10). 넣으려면 아이 행에 보낸 칸 값을 남길 자리(열)가 있어야 한다.
3. 이어 할 때 · 같은 시도 id 다시 흘릴 때 1~3단계 토리 반응 뜻이 없다(저장 칸 없음). 뜻을 다시 보이려면 talk_turns 에 열 하나가 필요하다(13절 한 줄).
4. 4단계부터 거절 턴의 카드 질문 붙임(다른 까닭 5) — 8절 해석 확인.
5. 4단계부터 '더 이야기하기'에서 카드 질문을 다 썼으면 가장 적게 쓴 번호(같으면 앞)를 다시 붙인다(`moreQuestionNoOf`) — 정본에 그 경우가 없다.
6. `advanceTalk` 는 오늘 쓸 말 · 말해 보기를 다 따라 말했는지 보지 않고 차례만 본다(인식 실패 건너뜀 · 마이크 막힘이 화면 몫이라).
7. 끝맺음 기록 입력 칸(`kind: "talk-closing"`, reason)을 a 시도 꼴에 넣을지 — 지금은 closing.ts 만 읽는다.

### 남은 우려

- **같은 기기가 같은 시도 id 를 겹쳐 보내면(첫 요청이 아직 AI 를 기다리는 중 재시도) AI 가 두 번 불릴 수 있다.** 마지막 저장 트랜잭션이 토리 행 n+1 이 이미 있으면 넣지 않아 대화는 하나로 남지만 호출 · 비용은 둘이다. 두 기기(다른 시도 id)는 세션 행 FOR UPDATE + 끝 아이 행 확인으로 하나만 받는다. 세션 행 잠금을 AI 호출 동안 쥐지 않은 까닭: 5절 '아이 말은 보내기 전에 저장'과 Supabase 연결 풀.
- 통합 32 는 로컬에서 한 번도 돌지 않았다 — 손으로 길을 따라 대조했다(가짜 규칙 소비 차례 · 세션 상태 표 · 끊김 글자 수 · 1단계 어휘 범위 · 형태 표). 첫 CI 에서 빨강이 나올 수 있는 자리: 견본 카드의 '모름'/질문 흐름 턴 수(1단계 목표 15 · 더 이야기할 거리 2), `cutAfterChars`(22 · 28) 문장 경계, 1단계 AI 질문 'What is it?' · 'It is <단원 단어>.' 의 어휘 · 형태 검사, 1-가 상한 프로필 설정 행.
- `check:ids` 설계 숫자 보고에 새 줄 하나: `route.ts:13 maxDuration = 60`(Next 가 정적 글자만 받는 구간 설정이라 설정값으로 못 읽음 — 기술 값 주석). 보고 전체 37(합침 ① 뒤 바탕 포함), 설정 키 위반 0.
- 4단계부터 AI 힌트는 저장하지 않아 이어 할 때 카드 힌트로 바뀐다(plan 위험 12 받아들임).
- 홈 진입 정리(`closeIdleTalks`)를 홈 쪽 `after()` 에 거는 한 줄은 plan 값 12(차례 6)라 이번에 넣지 않았다 — 그 전까지 미룬 끝맺음 · 시간 지난 대화 정리는 돌지 않는다.

### 관문(워크트리 p13, Node 24.22.0)

```
pnpm -s biome ci .                     → exit 0 (356 files)
pnpm exec tsc --noEmit                 → exit 0
pnpm test                              → exit 0, 61 파일 · 631 통과 · 6 todo
pnpm build                             → exit 0 (/api/talk/turn ƒ 동적)
pnpm check:deps                        → no dependency violations (183 modules)
pnpm check:ids                         → exit 0(보고만) · 설정 키 위반 0 · design-number 37(새 줄 route.ts:13 하나)
pnpm check:bundle                      → 위반 0 (파일 232 · 화면 파일 20)
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0 (missing-test 는 P12 몫 보고만)
pnpm vitest run --project integration … → 로컬 불가(embedded-postgres), CI 몫
```

## fix round 1 (2026-10-22 21:0x) — 차례 4 코드 검토 b1(I 3 · M 9) + 컨트롤러 결정 둘

브리프 `task-p13-fix1.md`, 검토 `review-p13-4-code.md`. 워크트리 p13 작업 트리, 커밋하지 않았다. 순서: I-1 · I-2(와 M-1) 통합 시험을 먼저 더한 상태에서 '빨강 확인 요청'을 SendMessage 로 보내고(20:4x), 기다리지 않고 고침으로 이어 갔다. 통합은 여전히 CI 몫이다.

| 지적 | 어떻게 고쳤나 | 덮는 시험 |
|---|---|---|
| 결정 1(C103) | `talk_turns.tori_ko text`(비울 수 있음). 0003 을 지우고(`_journal` idx 3 · sql · 스냅숏) 다시 만들었다 — `drizzle/0003_talk_ai_question_tori_ko_stories_by_band.sql` 한 파일에 ADD COLUMN 셋. 턴 길은 1~3단계(카드 턴 꼴)에서만 반응 뜻을 저장하고(`turn.ts` ToriPlan `toriKo`), 이어 하기 화면 자료 `lastTori.ko` · 같은 시도 id 다시 흘림 `{ t: "ko" }` 로 다시 낸다 | 단위 '회화 서버: 토리 반응 뜻은 1~3단계만 저장 재료가 되고 4단계부터는 비운다(C103)' · 통합 AC-15f 이어 하기(`lastTori.ko` "좋아!") · AC-15f 고아 아이 행(4단계 `tori_ko` null · `lastTori.ko` 없음) |
| 결정 2(정할 것 7) | a `TalkAttemptInputSchema` 에 `{ v, kind: "talk-closing", step: "final", reason }` 갈래와 `TALK_CLOSING_REASONS` 를 더했다(`src/core/conversation/attempt.ts`). closing.ts 는 그 꼴로 쓰고(`insertClosingRecord`) `parseTalkAttemptInput` 으로 센다(`safetyClosesOn`). 자체 꼴 `ClosingInputSchema` 는 지웠다 | 단위 '회화 서버: 끝맺음 기록 입력은 a 시도 꼴의 talk-closing 갈래(닫힌 까닭)로 읽고 모르는 까닭은 받지 않는다' |
| I-1 | `src/server/writing/composition.ts`: `retryPendingFeedback` 고르기에 `sessions.area = 'writing'` · `attempts.input->>'kind' = 'draft'`, `runFeedback` 은 **잡기 UPDATE 전에** 영역 쓰기 · 입력 종류 draft 를 본다(아니면 거짓, claimedAt 안 씀) | 통합(먼저) '회화 세션: 회화 끝맺음 대기 둘이 있어도 홈 진입 밀린 첨삭은 쓰기 초고만 부르고 끝맺음 claimedAt 은 그대로다' — 끝맺음 대기 둘(더 오래됨) + 쓰기 대기 초고 하나 → 끝맺음 요청 0 · 두 기록 ai_feedback 그대로 · 초고 실패 수 1(견본이 첨삭 꼴이 아니라 실패로 셈) · 뒤이어 홈 진입 정리가 끝맺음 둘을 부름 |
| I-2 | `saveFollowAlong`: 중단 세션은 정리 토막(`wrap_up`)일 때만 받고, 다른 수업 고르기 · 시간 지남으로 중단된 회화(토막 그대로)는 지금처럼 not_found | 통합(먼저) '회화 세션: 목표 턴 전 그만하기 뒤 정리 따라 말하기는 attempts 에 남고 영어로 말한 문장 수가 는다' |
| I-3 | 붙일 말 줄 꼴을 나눴다(`state.ts` `AddLineOut`): `{ t: "add", kind: "again", say: <답 예시>, en?: <같은 질문>, ko? }` · `{ t: "add", kind: "two_answers", answers: [a, b] }`(en 없음 — 'Or' 이음은 화면 공용 `twoAnswersLine`) · question · more_prompt 는 그대로. say · answers 는 읽어 주기 재료이고 1~3단계 화면에서 글로 보이지 않는다는 것을 형 주석으로 적었다. 이어 하기 · 다시 흘림도 같은 함수(`addLinesOf`)라 같은 꼴. 저장 원문 · 다시 쓸 토리 차례는 그대로 | 단위 '회화 서버: 1~3단계 '모름' 뒤 붙일 말 줄의 글 칸(en)에는 답 예시가 없고 읽어 주기 칸(say)에만 있다' · 줄 꼴 시험 이름 고침('… 답 예시는 again 의 읽어 주기 칸 say 로, 답 두 개는 two_answers 의 answers 로만 낸다') |
| M-1 | 같은 시도 id 의 고아 아이 행이 `TURN_IN_FLIGHT_MS`(60초 — 라우트 maxDuration 과 같은 기술 값, 라우트가 정적 글자만 받아 따로 둠) 안이고 그 뒤 그 세션 talk_turn ai_calls 행이 없으면 AI 대신 `{ t: "stale" }`(새 줄 종류 없음). 4단계 'Oops' 뒤 다시 보냄(실패 시도 행이 있음) · 다음 학습일 같은 시도 id(시간 지남)는 그대로 돈다 | 통합 '회화 세션: 같은 시도 id 를 겹쳐 보내면 둘째 요청은 AI 를 부르지 않고 다시 읽으라는 답을 받는다'(지연 가짜 · 회화 턴 요청 1) |
| M-2 | 형태 표 읽기 실패에 오류 이름 로그. 검사 재료(형태 표 · 그 단계 vocab)는 성공 턴이고 다음 자리가 1~3단계 AI 자리일 때만 읽는다 | 기존 AC-15i 통합 · 단위 AI 자리 시험 그대로 |
| M-3 | `content-length` 가 상한을 넘으면 본문을 읽기 전에 413(읽은 뒤 글자 수 확인도 그대로) | 단위 `tests/unit/talk-turn-route.test.ts` 셋(403 · 머리글 413 + 본문 안 읽음 · 400) |
| M-4 | 라우트를 `TransformStream` 으로 바꾸고 턴 길 약속을 `after(done)` 으로 넘긴다(응답 스트림이 끊겨도 저장이 함수 수명 안에서) — 쓰기 실패는 삼킴 그대로 | 실기는 차례 11 |
| M-5 | `closeIdleTalks` (가)는 `talk_segment` 비었거나 ≠ wrap_up · 컷오프 뒤 턴 NOT EXISTS, (다)는 끝맺음 기록 NOT EXISTS, (나)는 대기 기록을 SQL 로 골라 오래된 차례로 | 기존 통합 그대로(AC-15f 둘 · 1-가 셋 · I-1 시험 끝 단언) |
| M-6 | (1) 따라 말하기 시험 앞에 인사 '모름' 턴을 더해 영어로 말한 문장 수 0 단언. (2) AC-15j 는 `max - 1 - card.greetingTurns`, AC-15k 는 `safeLineOf(card.safeLines, 1)`(문장 검사의 차례 — 앞 턴 짝 0 + 1), 거절 시험은 `safeLineOf(card.safeLines, 아이 턴 번호)` | — |
| M-7 | `toriPlanOf` 거절 대사를 `safeLineOf(card.safeLines, turnNo)` 하나로(뜻은 같은 줄의 ko) | 단위 거절 시험이 safeLineOf 로 기대 |
| M-8 | 주석 '회화 트랙' → '회화 영역 행'(index · state) | — |
| M-9 | C107 그대로(코드 쪽이 정본). AC-15j 통합에 닫힌 세션 `status` 중단 · 학습일 단언 | 통합 AC-15j |

### 바뀐 파일(fix 1)

`src/core/conversation/attempt.ts`(갈래 하나) · `src/db/schema/learning.ts`(`toriKo`) · `drizzle/0003_talk_ai_question_tori_ko_stories_by_band.sql` · `drizzle/meta/0003_snapshot.json` · `drizzle/meta/_journal.json`(옛 0003 셋 지움) · `src/server/writing/composition.ts`(I-1, P11 파일 — 합침 ② 때 손 맞춤 한 자리) · `src/server/conversation/{state,index,turn,closing}.ts` · `src/app/api/talk/turn/route.ts` · `tests/unit/conversation-server.test.ts` · 새 `tests/unit/talk-turn-route.test.ts` · `tests/integration/conversation-{session,turn}.test.ts`.

### 시험 수

- 단위 62 파일 · **637 통과 · 6 todo**(차례 4 의 631 + conversation-server 3 + talk-turn-route 3).
- 통합(CI): conversation-session **24**(21 + I-1 · I-2 · M-1), conversation-turn 11(단언 보강). plan 증명 표 이름 32 는 그대로 있다.

### 다르게 한 것

1. I-1 시험의 쓰기 대기 초고는 시험용 시드의 1단계 쓰기 수업 행에 넣은 첫 세션 · 초고 끝 시도(첨삭 꼴이 아닌 수업)다 — 첨삭은 부르지 않고 실패 하나로 센다. '쓰기 초고만 부른다'는 그 실패 수 1 로 단언하고, 끝맺음 쪽은 요청 0 · ai_feedback 그대로로 단언한다.
2. M-1 시험은 고정 시계라 앞 턴 호출 기록과 같은 시각이 되지 않게 시계를 한 칸(1분) 옮긴다. 판정은 '그 시각 이후 호출 기록'(`calledAt ≥ 아이 행 recorded_at`)이라 실제 시계에서는 늘 뒤다.
3. M-4 는 `ReadableStream` start 안에서 기다리던 꼴을 `TransformStream` 쓰기 쪽 + `after(done)` 으로 바꿨다(약속을 응답 전에 만들어 after 에 넘기려고).
4. I-3 의 `again` 은 AI 자리에서 질문 글이 없을 때 `en` 이 빈다(선택 칸) — 그 밖은 늘 질문이 있다.

### 관문(워크트리 p13, Node 24.22.0)

```
pnpm -s biome ci .                     → exit 0 (357 files)
pnpm exec tsc --noEmit                 → exit 0
pnpm test                              → exit 0, 62 파일 · 637 통과 · 6 todo
pnpm build                             → exit 0 (/api/talk/turn ƒ)
pnpm check:deps                        → no dependency violations (183 modules)
pnpm check:ids                         → exit 0(보고만) · 설정 키 위반 0 · design-number 37(새 줄 없음 — route.ts:13 그대로)
pnpm check:bundle                      → 위반 0
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0
통합                                   → 로컬 불가, CI 몫(시험만 든 스냅숏은 20:4x 에 알림)
```

남은 우려: 통합의 새 셋은 로컬에서 빨강 · 초록을 본 적이 없다(CI 두 스냅숏 몫). I-1 고침은 P11 파일이라 P11 가지 쪽 시험(writing-feedback 의 밀린 첨삭)이 영역 · 종류 조건으로도 그대로인지 CI 에서 함께 본다.

## 차례 5 (2026-10-22 22:xx) — P13b 작업 순서 3: 회화 틀 · 토리 표시 · 말풍선 · 아이 차례 · 턴 요청 · 읽어 주기 빠르기 · 1단계 인사 → 대화

브리프 `task-p13-5.md`, plan-p13b 파일별 값 7 · 8 · 9 · 10 · 11 · 12(세션 쪽 갈래) · 13, 4절 회화 세션 표 · 3.3 · 7절 · C30 · C34 · C53 (2) · C92 · C96 · C103 · 재검토 N-1 · N-2. 워크트리 p13(HEAD 2645768). 커밋하지 않았다. e2e 는 이 Mac 에서 돌지 않아(임시 DB 가 embedded-postgres) CI 몫이다 — 사진도 CI 아티팩트.

### 바뀐 파일

| 파일 | 신규/수정 | 무엇 |
|---|---|---|
| `src/lib/speech/types.ts` · `browser.ts` · `fake-web-speech.ts` | 수정 | 값 11: `speak(text, options?: { rate? })` — 브라우저는 넘긴 때만 `utterance.rate`(관찰 기록에도), 가짜는 `record.rates`(spoken 과 같은 차례). 넘기지 않는 말하기 · 배치는 그대로 |
| `src/lib/talk-stream.ts` | 신규 | 값 10: `sendTalkTurn(body, handlers, { signal, fetchImpl })` — POST /api/talk/turn, 조각 경계를 넘는 NDJSON 줄 나누기, 갈래 처리기 아홉, 끝 줄 없이 끊기면 `"offline"`, HTTP 오류는 onError. `STALE_RETRY_MS` 1500(N-1, 기술 값) |
| `src/components/conversation/tori.tsx` | 신규 | 값 8: `ToriFigure`(토 동그라미 — 연두 · 먹색 테 · Jua, 말하는 중 물결 · 생각 중 점 셋, 움직임 줄이기 motion-safe) · `ToriBubble`(문장 흘러나오기 `TYPE_MS_PER_CHAR` 30 · 1~4단계 뜻은 다 흐른 뒤 아래 20px · 그림 턴 · 답 두 개는 글 없는 ①② 듣기 단추 · 말풍선 누르면 다시 읽기 · 설명은 글로만) · `ToriWaiting`(점 셋 data-wait-hint → ui.wait_hint_seconds 둘째 값 뒤 '토리가 생각하고 있어요' data-wait-line) · `useSpeakQueue`(문장마다 차례대로 하나씩, 1~2단계 rate) · `spokenOf` · `shownEnglishOf` · `answersLine` |
| `src/components/conversation/child-turn.tsx` | 신규 | 값 9: SpeakButton(고리 틈 연두) 크게 · 작은 '힌트' · '잘 모르겠어요' · `talkEndRuleFor(대화)` · 읽어 주는 중 누르면 읽기 멈추고 듣기 · 힌트 단(1~3단계 영어 단은 연 단만 `revealTalkHint` 로 받음 · 영어 문장 단에 천천히 듣기 단추 · 둘째 '모름'부터 마지막 단까지) · '막히면 눌러요' 한 번 · 인식 확인 `confirmPlanOf`(바로 보냄 · 아이 말풍선 + '다시 말하기' · '보내기', 1~3단계 맞지 않으면 '다시 말하기' 크게) · '모름'(단추 · 말소리 없음 talk.nospeech_dontknow_count) · 들은 도움(two_answers · answer_example) |
| `src/components/conversation/talk-frame.tsx` | 신규 | 값 7: 종이 띠(오늘 이야기 제목 · '회화 · n단계 · 단원 u' · '말 주고받기 n / 목표 턴' — 목표 턴 뒤 '다 했어요! 더 이야기하기 n / …' · '홈') · 구석 '그만하기'(대화 · 더 이야기하기 동안, 목표 턴 전 C34 확인 쪽지) · 옆 칸 오늘 이야기 목록 · '토리의 약속' 한 줄 · 열 때 차례(마이크 못 씀 → (처음 회화 안내 자리 — 차례 6) → 처음 마이크 안내 → 1-가 상한이면 AiRest) · 턴 보내기(talk-stream — 문장마다 그림 · 읽기, 체감 대기를 다음 턴에) · 인사 끝 뒤 advanceTalk · 목표 턴 뒤 '더 이야기하기' · '그만하기' · stale 은 STALE_RETRY_MS 뒤 router.refresh(N-1) · 끊김은 online 때 같은 시도 id · 4단계부터 'Oops' 쉼 · 안전 상한 닫힘 · 고아 아이 행(view.retryTurn)은 열 때 같은 시도 id 로 다시 · 인식 실패 셈(speakingCounters) · 막힌 안내 셋 + reportSessionMic |
| `src/app/(child)/session/[id]/page.tsx` | 수정 | 값 12 의 세션 갈래: `readTalkSessionArea` 가 회화면 열린 대화만 `loadTalkView` → `<TalkFrame key={view.version}>`, 아니면 `/talk/lessons`. 다른 영역은 그대로 |
| `src/server/conversation/index.ts` | 수정 | 화면 자료에 `pictures`(1~3단계 그림 턴의 카탈로그 그림) · `settings.silentItemsMax`(speech.silent_items_max — 말소리 없음 막힌 안내) · `version`(다시 읽기 열쇠) · 형 다시 내보냄(AddLine · AddLineOut · HintView · PendingView) |
| `src/server/conversation/state.ts` | 수정 | N-2: 죽은 형 `AddKind` 지움 |
| `tests/e2e/talk.ts` | 신규 | 값 13: `greetingToTalkLesson`(견본 talkCard 작은 틀 — 새 단어 · 단원 단어 · 오늘 쓸 말을 비워 인사 → 대화) · `insertTalkLesson`(같은 칸을 지우고 넣음) · `talkHousehold` · `openTalkSession` · `talkReply`(가짜 SSE — 조각 · 지연 · 첫 조각 늦춤, '\nClosing: no' 로 고름) · `talkAnswer` · `saidRun` · `talkScript`(읽어 주기 짧게) · `speechRecord` |
| `tests/e2e/conversation.spec.ts` | 신규 | e2e 열 |
| `tests/unit/talk-stream.test.ts` · `tests/unit/talk-bubble.test.ts` | 신규 | 단위 넷 · 셋 |

### 시험

- 단위: 64 파일 · **644 통과 · 6 todo**(차례 4 fix 1 의 637 + talk-stream 4 + talk-bubble 3). 이름: '회화 턴 요청: 조각 경계에서 나뉜 NDJSON 줄을 …' · '… 끝 줄 없이 끊기면 offline …' · '… 끝 줄 갈래 … HTTP 오류는 error …' · '… 다시 읽기 전 기다림은 이름 붙인 기술 값 …(재검토 N-1)' · '회화 화면: 말풍선 글은 토리 말과 다시 묻는 질문만이고 답 예시 · 답 두 개는 넣지 않는다' · '회화 화면: 읽어 줄 차례는 토리 말 → 답 예시 → 같은 질문 → 'Or' 를 사이에 둔 답 두 개다' · '회화 화면: 답 두 개를 잇는 말은 회화 턴 규격의 이음과 같다'.
- e2e(CI) 열 — plan 증명 표 이름 그대로: AC-15a 셋('… 답 두 개가 'Or' 를 사이에 두고 들리고 화면에는 답 글 없이 듣기 버튼 ①② 만 있다' · '… '힌트'를 한 번 누르면 한국어 뜻, 두 번 누르면 영어 문장과 듣기 버튼이 보인다' · '인식 글이 들려준 답이나 연 영어 문장과 … 바로 보내지고 아니면 talk.confirm_seconds 보인 뒤 보내지며 …') · AC-N8 둘('… 첫 문장이 끝나면 전체 응답을 기다리지 않고 …' · '인식 확인 중 '보내기'를 누르면 바로 보낸다') · AC-15g 하나(''잘 모르겠어요'를 누르면 …') · AC-15l 둘(말풍선 다시 읽기 · 천천히 / 듣기 버튼 ① · '다시 듣기' 없음) · AC-15b 하나(검사에 걸린 문장 · 안전한 대사) · AC-8b 하나(알림 기준 넘긴 날 제한 문구 없음).
- 사진(E2E_PHOTOS, 두 방향 각각 -portrait · -landscape): `p13-talk-greeting` · `p13-talk-dialogue` · `p13-talk-answers` · `p13-talk-hint` · `p13-talk-confirm` · `p13-talk-waiting` · `p13-talk-dontknow`.

### 다르게 한 것

1. **`:lang(en)` 규칙은 이미 p13 에 있다**(합침 ①이 cce2238 를 가져옴 — `src/app/globals.css:152`). 브리프의 '아직 없음'과 다르다. 영어 글은 `lang="en"` 에 `font-en` 토큰도 함께 붙였다(겹쳐도 같은 글꼴).
2. **화면 자료를 서버에서 조금 더 받는다**: 그림 턴 그림(`pictures`), 말소리 없음 상한(`silentItemsMax`), 다시 읽기 열쇠(`version`). stale 뒤 router.refresh 가 같은 컴포넌트를 그대로 두면 처음 자료로 그린 상태가 남아, 쪽이 `key={view.version}` 으로 틀을 새로 그린다.
3. **처음 회화 안내 · 오늘 쓸 말 · 말해 보기 · 정리 · 마무리 조각은 차례 6** — 틀은 그 자리를 비우고(안내 차례 주석만), 인사 끝 뒤 다음 토막이 오늘 쓸 말이면 advanceTalk 로 넘긴 뒤 그 조각을 기다린다(지금은 띠 · '홈'만). e2e 견본은 오늘 쓸 말이 없어 닿지 않는다. '그만하기' · 목표 턴 뒤 '그만하기' · 안전 상한 닫힘 · 'Oops' 뒤는 지금 수업 목록(/talk/lessons — 차례 6 전까지는 '토리가 준비 중이에요')으로 간다.
4. **답 두 개 잇기는 화면 쪽 작은 함수(`answersLine`)** — 회화 턴 규격 모듈(고정부 글 · Zod)을 화면 묶음에 끌어오지 않으려고. 같은 글인지는 단위 시험이 a `twoAnswersLine` 과 견준다.
5. **말소리 없음 막힌 안내(C22)의 셈**: speakingCounters 는 인식 실패 · 마이크 판정에 쓰고, 회화의 '말소리 없이 '모름'으로 넘어간 질문'은 틀이 따로 센다(이어진 수가 speech.silent_items_max 이면 막힌 안내 + 알림). 같은 질문 안 말소리 없음 talk.nospeech_dontknow_count 번이면 '모름'(nospeech) 으로 보낸다.
6. **확인 건너뜀(confirmSkipped)** 은 바로 보낸 턴만 참, '보내기' · 시간 지남은 거짓. 듣기 끝 대기(listenEndSeconds)는 그 규칙의 끝 조용함 초.
7. **'막히면 눌러요'** 는 첫 회화 수업의 아이 차례가 처음 그려질 때 notices_seen 에 남기고(다른 기기에서는 다시 안 보임), 그 화면에서는 '힌트'를 누르거나 말하기를 누를 때까지 보인다.

### 정할 것

1. 처음 마이크 안내를 이미 본 기기에서는 열 때 첫 읽어 주기에 누름이 없다 — iPad Safari 는 첫 읽기가 막힐 수 있다(말풍선을 누르면 다시 읽음). 처음 회화 안내('시작!')가 그 누름이 되는 것은 첫 회화 한 번뿐이라, 차례 6 에서 열 때마다 한 번 누르는 자리를 둘지(iPad 실기 — 차례 11).
2. '그만하기'(목표 턴 전 · 뒤) 뒤 정리 · 마무리 세 장(차례 6) 전까지는 수업 목록으로 간다 — 차례 6 브리프에서 이 길을 정리 조각으로 바꾼다.

### 남은 우려

- e2e 열 · 사진 일곱(두 방향)은 로컬에서 한 번도 돌지 않았다. 흐름을 손으로 따라 대조했다(가짜 음성 대본 차례 · 인식 확인 2초 · 1단계 끝 조용함 3초 · 첫 조각 늦춤 6초 < 첫 글 기다림 10초). CI 첫 실행에서 시간 여유(시험 120초) · 셋째 시험의 둘째 대화 턴 답 글(견본 카드 둘째 턴 답 두 개의 첫째)을 본다.
- 열 때 처음 읽기 직후 아이 차례로 넘어가는 경합을 '여는 동안' 표지로 막았다(토리가 다 읽은 뒤 아이 차례).
- 화면 검토(design-reviewer)는 사진 뒤 — 4절 회화 세션 표 · 목업 B_Talk1 꼴. 옛 목업의 '골라서 말해 보세요'(답 글 단추)는 T2 · C 에 따라 따르지 않았다.

### 관문(워크트리 p13, Node 24.22.0)

```
pnpm -s biome ci .                     → exit 0 (365 files)
pnpm exec tsc --noEmit                 → exit 0
pnpm test                              → exit 0, 64 파일 · 644 통과 · 6 todo
pnpm build                             → exit 0 (/session/[id] ƒ)
pnpm check:deps                        → no dependency violations (187 modules)
pnpm check:ids                         → exit 0(보고만) · design-number 37(새 줄 없음)
pnpm check:bundle                      → 위반 0
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0
pnpm e2e                               → 로컬 불가, CI 몫(사진 E2E_PHOTOS)
```

## 차례 5 fix 1 (2026-10-22 22:xx) — 코드 검토 b2(I 3 · M 11)

브리프 `task-p13-5-fix1.md`, 검토 `review-p13-5-code.md`. 워크트리 p13 작업 트리, 커밋하지 않았다. 순서: I-1 · I-2 단위 시험(되풀이 · 끊음 · dispose 뒤 읽기)을 먼저 써서 빨강(새 함수 없음 · dispose 뒤 `ended`)을 본 뒤 고쳤다. e2e 는 이 Mac 에서 돌지 않아 고침과 함께 쓰고 손으로 대조했다(CI 8차 몫).

| 지적 | 어떻게 | 덮는 시험 |
|---|---|---|
| I-1 | `src/lib/talk-stream.ts` 에 되풀이 `sendTalkTurnRetrying` — 같은 시도 id 로: 끊김은 브라우저가 온라인이면 `OFFLINE_RETRY_MS` 기다렸다 다시(`OFFLINE_RETRIES_MAX` 3 번까지), 오프라인이면 'offline'. stale 은 처리기로 넘기지 않고 `STALE_RETRY_MS` 기다림 → `router.refresh()`(판이 바뀌면 쪽이 key 로 틀을 새로 그려 이 요청을 끊음) → 또 기다림 → 같은 시도 id 로 다시(`STALE_RESENDS_MAX` 20 번 — 한 번에 3초라 TURN_IN_FLIGHT_MS · maxDuration 60초 안). 다 쓰면 끊김처럼. 틀은 'offline' 화면에 7절 문구 + '다시 해 보기'(그리고 online 때 다시) | 단위 '회화 턴 요청: 끊겼는데 브라우저가 온라인이면 기다렸다 같은 시도 id 로 다시 보내고 오프라인이면 …' · '… 온라인 끊김 다시 보내기는 상한까지 …' · '… stale 이면 바로 되풀이하지 않고 기다렸다 자료를 다시 읽고 판이 같으면 같은 시도 id 로 다시 보낸다' · '… 자료를 다시 읽어 틀이 바뀌면(끊음 신호) 되풀이를 멈추고 stale 되풀이는 상한까지다'(M-7 상수 시험을 이것으로 바꿈). e2e '회화 화면: 같은 시도 id 가 아직 진행 중이라 stale 을 받으면 기다렸다 다시 읽어 토리 말이 그려진다'(둘째 쪽이 고아 아이 행을 다시 보냄 · AI 요청 1) |
| I-2 | 틀: `submit` 마다 AbortController(`inflight`) — 다음 submit · '홈' · '그만하기' · 틀 사라짐(언마운트)에서 끊고, 끊긴 결과(`aborted`)는 아무것도 바꾸지 않음. `sendTalkTurn` 은 신호가 서면 줄을 처리기로 넘기지 않는다. `useSpeakQueue` 는 사라진 뒤 enqueue 무시(마운트마다 다시 켬 — 개발 모드 두 번 마운트에도). `browser.ts` `speak` 는 dispose 뒤 `unsupported`(말하기 · 배치는 dispose 뒤 부르지 않아 길 그대로) | 단위 '회화 턴 요청: 끊음 신호로 멈춘 요청은 offline 이 아니라 aborted 이고 처리기를 더 부르지 않는다' · `tests/unit/speech-speak.test.ts` '음성 접점: 넘긴 빠르기는 utterance.rate 로 …' · '음성 접점: 닫은 뒤 speak 는 읽지 않고 unsupported 다'. e2e '회화 화면: 토리 말을 흘려 받는 중 '홈'을 누르면 홈에서 토리 말을 더 읽지 않는다' |
| I-3 | e2e AC-15l 둘째의 /다시 듣기/ 찾기를 `[data-child-turn]` 안으로(코드 그대로 — 말풍선 자체가 다시 읽기) | CI 8차 |
| M-1 | 아이 차례가 `listenEndedAt`(듣기 끝 − 끝 조용함, '모름' 단추는 누른 때)을 넘기고 틀이 첫 문장 때와의 차를 다음 턴 `prevPerceivedWaitMs` 로 — `perceivedWaitOf` | 단위 '… 체감 대기는 아이가 말을 멈춘 때부터 첫 문장까지 …' |
| M-2 | 힌트 문장 듣기는 1~3단계면 `speech.slow_rate`(토리 말은 1~2단계 그대로 — `hintRate`) | e2e '회화 화면: 3단계 힌트 영어 문장 듣기는 천천히 읽고 토리 말은 보통 빠르기로 읽는다'(뜻 → 영어 틀 → 영어 문장도 봄) |
| M-3 | 옆 칸 제목을 4절 '오늘 이야기 목록'으로. 나머지 둘은 코드 그대로(컨트롤러 표) | — |
| M-4 | 그림 턴 `alt=""`(꾸밈 그림) | 단위 '… 그림 턴 그림은 꾸밈 그림이라 대체 글이 비어 있다' |
| M-5 | 앞 줄이 다 흐른 뒤 다음 줄(`english.slice(0, typed + 1)` — onTyped 셈) | 단위 '… 처음 그림에는 첫 줄만 있다' |
| M-6 | 회화는 P11a 셈에 말소리 없음 상한을 두지 않음(`talkCounterLimits` — 무한). 틀 셈만 C22 | 단위 '… P11a 셈이 막힌 안내를 따로 내지 않는다' |
| M-7 | I-1 단위로 바꿈 | — |
| M-8 | `shouldMarkNudge(nudge, 힌트 단 수)` — 힌트 단추가 있어 글이 보인 턴만 기록 | 단위 '… '막히면 눌러요'는 힌트 단추가 있어 보인 턴에만 남긴다' |
| M-9 | 기다림 표시를 말풍선 단추 밖 같은 꼴 칸(`data-tori-waiting`)으로 | 단위 '… 기다림 표시(상태 줄)는 말풍선 단추 밖 칸에 있다' · e2e 기존 그대로(data-wait-hint · data-wait-line) |
| M-10 | AC-N8 시험 끝에 아이 차례(끝 줄)까지 기다림 | CI 8차(23503 줄 없음) |
| M-11 | 토막 넘김 · '더 이야기하기' 실패도 다시 부를 일(`retryAction`)을 남겨 같은 '다시 해 보기'로(턴 보내기 · 끊김도 같은 자리) | 단위 없음(틀 안 흐름 — e2e 로 닿는 길 없음, 보고) |

### 바뀐 파일(fix 1)

`src/lib/talk-stream.ts` · `src/lib/speech/browser.ts` · `src/components/conversation/{talk-frame,tori,child-turn}.tsx` · `tests/unit/talk-stream.test.ts` · `tests/unit/talk-bubble.test.ts` · 새 `tests/unit/speech-speak.test.ts` · `tests/e2e/conversation.spec.ts`.

### 시험 수

- 단위 65 파일 · **656 통과 · 6 todo**(차례 5 의 644 + 12: talk-stream 상수 시험 하나 빼고 되풀이 다섯 · speech-speak 둘 · talk-bubble 여섯).
- e2e(CI): conversation.spec **13**(차례 5 의 10 + '홈' 끊음 · stale 다시 읽기 · 3단계 힌트 빠르기).

### 다르게 한 것

1. 되풀이 정책을 틀이 아니라 `talk-stream.ts` 함수 하나에 두어 가짜 fetch · 가짜 기다림으로 단위 시험한다. 판이 같은지는 따로 묻지 않고 '자료 다시 읽기(router.refresh) 뒤 틀이 그대로 있으면(끊음 신호가 서지 않으면) 같은 판'으로 본다 — 판이 바뀌면 쪽이 `key={view.version}` 으로 틀을 새로 그리며 언마운트가 그 요청을 끊는다.
2. 보내기 · 다시 보내기마다 말풍선을 비우고 기다림 표시부터 다시 시작한다(다시 흘림이 같은 줄을 처음부터 보냄 — `onAttempt`).
3. M-11 은 틀 안 흐름이라 단위 시험이 없다(서버 액션 실패를 e2e 로 만들 길이 없음).

### 남은 우려

- e2e 13 은 로컬에서 돌지 않았다. stale 시험은 첫 요청이 AI 호출 기록을 남긴 뒤 토리 행을 저장하기 전 짧은 틈에 둘째 쪽이 다시 보내면 서버가 AI 를 한 번 더 부를 수 있다(차례 4 M-1 판정이 '그 아이 행 뒤 호출 기록'이라) — 그 틈은 밀리초라 드물지만 그때 AI 요청 수 단언이 빨강이 된다.
- 화면 검토(fix 2)는 따로 온다.

### 관문(워크트리 p13, Node 24.22.0)

```
pnpm -s biome ci .                     → exit 0 (366 files)
pnpm exec tsc --noEmit                 → exit 0
pnpm test                              → exit 0, 65 파일 · 656 통과 · 6 todo
pnpm build                             → exit 0
pnpm check:deps                        → no dependency violations (187 modules)
pnpm check:ids                         → exit 0(보고만) · design-number 37(새 줄 없음)
pnpm check:bundle                      → 위반 0
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0
pnpm e2e                               → 로컬 불가, CI 몫
```

## 차례 5 fix 2 (2026-10-22 22:xx) — 화면 검토 b2(I 2 · M 4)

브리프 `task-p13-5-fix2.md`(검토 보고 `review-p13-5-design.md` 요지). 워크트리 p13 작업 트리(차례 5 + fix 1), 커밋하지 않았다. 단위 시험(그림 깨짐 · 말풍선 폭 · 뜻 묶음)을 먼저 써서 빨강(함수 없음 · w-fit 없음)을 본 뒤 고쳤다. e2e · 사진은 CI 9차 몫. 1~3단계 영어 경계(답 두 개 · 답 예시 · 힌트 영어 글 없음)는 그대로다.

| 지적 | 어떻게 | 덮는 시험 |
|---|---|---|
| I-1 | '그만하기'를 `PaperBand` 의 right 자리('말 주고받기' · '그만하기' · '홈' 차례 — 작은 단추)로 옮겨 따로 한 줄을 없앴다. 가로(lg)에서는 아이 차례의 힌트 단을 단추 줄 옆(`lg:flex-row-reverse` — 단추 왼쪽 · 힌트 단 오른쪽)에 두고, 판 여백을 `landscape:py-4 · gap-3` 으로 줄였다(손 셈: 토리 세 줄 · 답 두 개 · 뜻 · 설명 · 힌트 두 단 턴에서 판 ≈ 496px, 남는 창 ≈ 568px) | e2e '회화 화면: 가로 1180×820 에서 토리 세 줄 · 힌트 끝 단 · 설명이 있는 턴에도 말하기 · 잘 모르겠어요 · 토리의 약속이 보는 창 안이고 그만하기는 위 띠 안이다'(아래 끝 ≤ 820 · 사진 `p13-talk-hint` 다시) |
| I-2 | 그림 턴 그림을 `TurnPicture` 로 — P11 `SafePicture` 꼴로 그림을 미리 열어 보고(Image probe) · `onError` 로도, 깨지면 그리지 않아 자리도 접힌다(말풍선이 그 폭을 씀). `alt=""` 그대로. 서버 `picturesOf` 의 `meaningKo` 를 그 낱말의 vocab 한국어 뜻으로(없으면 빈 글) — 그림 낱말(영어)을 화면 자료 글로 내리지 않는다 | 단위 '회화 화면: 그림 턴 그림은 파일이 있고 깨지지 않았을 때만 그리고 깨지면 자리도 접는다' · e2e '회화 화면: 그림 턴 그림이 깨지면 그리지 않고 그림 낱말(영어)이 글로 보이지 않는다'(보이는 그림은 naturalWidth > 0 · 대체 글 있는 그림 0 · 노린 낱말 글 없음 · 사진 `p13-talk-picture`) |
| M-1 | 말풍선이 '글이 다 흘러나왔는가'를 틀에 알리고(`onAllTyped`) 틀은 끝 줄 · 다 흐름 · 읽기 줄 빔이 모두 되어야 아이 차례를 연다. 그 뒤 말풍선을 다시 누른 읽기 중의 '말하기'는 읽기를 멈추고 듣는다(C53 (2) 그대로) | 기존 e2e(아이 차례가 열리는 때를 기다리는 시험 전부) |
| M-2 | 뜻 줄과 ①② 를 한 묶음 줄(`data-tori-under`, 최소 높이 56px)로 — ①② 가 먼저, 뜻은 그 옆(넘치면 아래)에 와 단추가 뛰지 않는다 | 단위 '… 뜻 줄과 답 두 개 단추는 한 묶음 자리에 있다' · 사진 비교 |
| M-3 | 말풍선을 글 길이만큼(`w-fit`) · 상한 `TORI_BUBBLE_MAX_PX` 520(화면 꼴 상수 — Tailwind 가 소스 글을 훑으므로 클래스는 글자 그대로 `max-w-[520px]`, 단위 시험이 같은 수인지 봄) · 토리 쪽(왼쪽) 정렬. 기다림 칸도 같은 폭 | 단위(같은 시험) · 사진 |
| M-4 | 인식 확인 중에는 '힌트'도 비활성('잘 모르겠어요'는 이미 비활성) | e2e AC-15a 인식 확인 시험에 두 단추 비활성 단언 |

### 바뀐 파일(fix 2)

`src/components/conversation/{tori,talk-frame,child-turn}.tsx` · `src/server/conversation/index.ts`(picturesOf 뜻 칸) · `tests/unit/talk-bubble.test.ts` · `tests/e2e/conversation.spec.ts`.

### 시험 수

- 단위 65 파일 · **658 통과 · 6 todo**(fix 1 의 656 + talk-bubble 둘).
- e2e(CI): conversation.spec **15**(fix 1 의 13 + 가로 보는 창 · 그림 깨짐). 사진 더함 `p13-talk-picture`.

### 다르게 한 것 · 남은 우려

1. 가로 맞춤은 '그만하기' 옮김만으로는 손 셈이 820 을 넘어(힌트 두 단 + 단추 열 줄), 힌트 단을 단추 옆으로 두는 가로 배치와 여백 줄임을 함께 했다. 실제 높이는 CI 9차 e2e · 사진에서 본다(로컬 브라우저 실행 불가).
2. 그림 턴의 지금 질문 자료(`pending.imageKey`)와 그림 파일 경로에는 그림 키가 남는다 — 글로 보이지 않고 화면 읽기 프로그램도 읽지 않지만, 견본처럼 그림 키가 곧 영어 낱말이면 자료에는 들어 있다. 키를 서버에서 그림 정보로 바꿔 내리려면 턴 길 끝 줄도 그림 표를 읽어야 해 범위를 넘는다 — 정할 것(컨트롤러).
3. 말풍선 글이 없는(드문) 턴도 '다 흐름'으로 보아 아이 차례가 막히지 않게 했다.

### 관문(워크트리 p13, Node 24.22.0)

```
pnpm -s biome ci .                     → exit 0 (366 files)
pnpm exec tsc --noEmit                 → exit 0
pnpm test                              → exit 0, 65 파일 · 658 통과 · 6 todo
pnpm build                             → exit 0
pnpm check:deps                        → no dependency violations (187 modules)
pnpm check:ids                         → exit 0(보고만) · design-number 37(새 줄 없음)
pnpm check:bundle                      → 위반 0
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0
pnpm e2e                               → 로컬 불가, CI 몫(사진 E2E_PHOTOS)
```

### 덧(22:3x) — fix 1 재검토 새 지적 N-1 · N-2 · N-3

| 지적 | 어떻게 | 덮는 시험 |
|---|---|---|
| N-1(Important) | 음성 접점을 세션 동안 하나로 — 틀이 처음 받은 음성 설정을 ref 로 쥐고 `useEffect(…, [])` 로 한 번만 만들고 틀이 사라질 때만 닫는다(자료 다시 읽기가 새 설정 객체를 줘도 다시 만들지 않음). `useSpeakQueue` 는 접점을 ref(`port`)로 읽어 처리기가 보낸 때의 함수를 쥐고 있어도 늘 지금 접점으로 읽는다 | e2e(아래 N-3)의 '둘째 쪽 가짜 음성 기록에 다시 흘린 문장' 단언. 단위는 없다(훅을 그릴 DOM 시험 도구가 저장소에 없음 — jsdom · testing-library 없음) |
| N-2(Minor) | 서버 '진행 중' 판정을 `turnInFlight` 로: TURN_IN_FLIGHT_MS 안이고, 그 아이 행 뒤 회화 턴 호출 기록이 없거나 마지막 호출이 끝난 지(called_at + latency_ms) `TURN_SAVE_GRACE_MS`(5초, 기술 값) 안이면 stale | 통합 'AC-15f 토리의 말이 없는 마지막 턴이 있으면 같은 시도 id 로 다시 받는다'에 단언 더함(호출이 막 끝난 때 같은 시도 id → stale · AI 요청 그대로, 시계를 2분 옮긴 뒤 다시 받음) |
| N-3(시험) | stale e2e 를 둘째 쪽 `page.route("**/api/talk/turn")` 로 묶음 — 첫 요청만 통과(진행 중이라 stale), 나머지는 첫 쪽 `[data-child-turn]` 이 보인 뒤 `route.continue()`. 둘째 쪽은 첫 쪽 AI 요청이 들어온 뒤 연다. 첫 조각 6초(첫 글 기다림 10초 안) | e2e '회화 화면: 같은 시도 id 가 아직 진행 중이라 stale 을 받으면 기다렸다 다시 읽어 토리 말이 그려지고 읽힌다'(둘째 쪽 턴 요청 ≥ 2 · AI 요청 1 · 둘째 쪽 읽은 글에 'Welcome back, friend.') |

바뀐 파일 더함: `src/server/conversation/turn.ts`(turnInFlight · TURN_SAVE_GRACE_MS) · `tests/integration/conversation-session.test.ts`. 관문은 덧 뒤 다시 돌렸다 — biome ci 0 · tsc 0 · 단위 65 파일 658 통과 · 6 todo · build 0 · check:deps 0 · check:ids 37(새 줄 없음) · check:bundle 0 · spec:trace 0. 통합 · e2e 는 CI 9차 몫.

남은 우려(덧): N-1 에 단위 시험이 없다. N-3 은 시간이 아니라 요청 문으로 묶었지만, 둘째 쪽이 자료를 다시 읽기 전에 첫 요청이 끝나면(첫 조각 6초보다 둘째 쪽 열기 · 첫 기다림이 길면) 둘째 쪽이 새 판으로 다시 그려져 턴 요청이 하나뿐일 수 있다 — 그때 '≥ 2' 단언이 빨강이다(읽은 글 단언은 그대로 지남).

#### 덧 셋의 자리(컨트롤러 확인 요청 22:4x — fix 2b 없이 이미 들어 있음)

- N-1: `src/components/conversation/talk-frame.tsx:216-221`(처음 받은 음성 설정 ref · `[]` 효과로 한 번 만들고 틀이 사라질 때만 dispose) · `src/components/conversation/tori.tsx:413-414 · :427`(읽기 줄이 ref `port` 로 늘 지금 접점을 씀). 시험: e2e `tests/e2e/conversation.spec.ts:411` '회화 화면: 같은 시도 id 가 아직 진행 중이라 stale 을 받으면 기다렸다 다시 읽어 토리 말이 그려지고 읽힌다'의 `:446`(둘째 쪽 가짜 음성 spoken 에 다시 흘린 문장). 단위 없음(DOM 시험 도구 없음).
- N-2: `src/server/conversation/turn.ts:109`(`TURN_SAVE_GRACE_MS` 5000 — 기술 값) · `:507`(`turnInFlight` — 마지막 talk_turn 호출의 called_at + latency_ms 가 그 안이면 진행 중) · `:689`(같은 시도 id 고아 아이 행 갈래). 시험: 통합 `tests/integration/conversation-session.test.ts:483` 'AC-15f 토리의 말이 없는 마지막 턴이 있으면 같은 시도 id 로 다시 받는다' 안 단언(호출이 막 끝난 때 → stale · AI 요청 그대로).
- N-3: `tests/e2e/conversation.spec.ts:430`(둘째 쪽 `page.route("**/api/talk/turn")` — 첫 요청만 통과, 나머지는 첫 쪽 `[data-child-turn]` 뒤 `route.continue()`), 단언 셋(둘째 쪽 턴 요청 ≥ 2 · AI 요청 1 · 둘째 쪽 spoken 에 'Welcome back, friend.').
- CI 9차(67797f9)에 이 셋이 들어 있는지는 그 커밋 내용 기준 — 덧은 화면 지적 고침 뒤 같은 작업 트리에서 이어 넣었다(보고 '덧' 표). 67797f9 가 덧 전 스냅숏이면 CI 10차에 들어간다.
- 확인(22:4x): CI 9차 스냅숏 67797f9 에 셋 모두 들어 있다 — `git show 67797f9:<경로>` 로 `TURN_SAVE_GRACE_MS`(turn.ts) · `speechSettings.current`(talk-frame.tsx) · `second.route`(conversation.spec.ts)를 찾았다. fix 2b 는 필요 없다.

## 차례 6 (2026-10-22 23:4x) — P13b 작업 순서 5: 처음 안내 · 오늘 쓸 말 · 말해 보기 · 정리 · 마무리 세 장 · 쪽 · 연결 · 홈 진입 정리

워크트리 p13, 시작 HEAD e32032d(합침 ②). 커밋 없음. 브리프 `task-p13-6.md` + 덧(23:1x) N-1.

### 바뀐 파일

| 파일 | 무엇 |
|---|---|
| `src/components/conversation/follow-along.tsx`(새) | 값 14. `TALK_START_TEXT`(3.3 안내 글 그대로 · '시작!') · `FOLLOW_TEXT` · `followStepsOf`(:94 — 남은 차례, 1~3단계 단어 · 4단계부터 예문, 말해 보기 바퀴 차례 = 처음 스냅숏 practiceOrder, 저장한 차례 뺌) · `practiceRevealOf`(:152 — 둘째 바퀴부터 일치율 < talk.hint_read_match) · `TalkStart`(:165) · `FollowAlong`(:391 — 카드 단어 · 뜻 · 예문, 들어올 때 단어 → 예문 읽기, 결과 말 ui.auto_next_seconds 뒤 결과와 관계없이 다음, 인식 실패 speech.max_retries 면 건너뜀 skipped recognition) · `WrapUp`(:599 — 되짚을 말 말풍선 + 뜻, 1~3단계 문장마다 따라 말하기 → `talkClosingStatus` 한 번 → 끝인사 → 마무리). 따라 말하기 저장은 `saveTalkFollowAlong`(시도 id `talk-follow:<세션>:<토막>:<바퀴>:<차례>` — 다시 열어도 한 번) |
| `src/components/conversation/closing-cards.tsx`(새) | 값 15. `CLOSING_TEXT` · `closingCardsOf`(:48 — 목표 턴 뒤 '홈'은 첫 장만, 1~3단계 첫 장 · 셋째 장) · `friendshipCellsOf`(:60) · `ClosingFirst`(:65 — 별 · 미션 자리(P12 · c) · '다음에 끝까지 이야기하면 별을 받아요' / '다시 했어요' · 오늘 얻은 단어(대화에 원형이 안 나온 것만 듣기 단추) · '다음') · `ClosingThird`(:148 — 친한 정도 막대(다시 하기 없음) · 다음 이야기 제목 · 큰 '다음 이야기'(없으면 '수업 목록') · 작은 '홈', '다음' 없음) · `ClosingCards`(:231 — 다음 이야기는 수업 목록과 같은 `useLessonStart` 길: 하던 수업 확인 쪽지 · 1-가 상한 AiRest · 기다림 표시) |
| `src/components/conversation/talk-frame.tsx` | 머리 주석 · 단계 상태(`stage` talk/wrap/closing, `started`, `followShown`). 열 때 차례 막힘 → 쉼 → '시작!'(:726, 처음 회화면 안내 글 · `markTalkNotice("talk_intro")`) → 처음 마이크 안내. 토막 넘김 `moveTo`(:340) · `afterFollow`(:332). '그만하기'(:591) → stopTalk 뒤 정리 → 마무리(차례 5 정할 것 2 — 수업 목록 임시 길 지움, 실패면 '다시 해 보기'). '홈'(:569) — 목표 턴 뒤 닫히면 마무리 첫 장 뒤 홈, 막힘 · 쉼의 '홈'은 바로. 목표 턴 뒤 1-가 상한 닫힘(close · resting · 되짚을 말 있음)은 `readTalkWrap`(:494) → 정리 → 마무리, 대화 안전 상한은 그대로 끝인사 + '수업 목록'(`showClosed` :404). 띠의 수 · '그만하기'는 대화 단계만, 마무리 중 띠 '홈' 숨김(셋째 장 '홈' 하나). 끊김 줄 `TroubleLine`(:1030)을 따라 말하기 조각에도 |
| `src/components/board/board.tsx:90-93` | 덧 N-1 — PaperBand 오른쪽 묶음 `ml-auto`(브리프가 허용한 공용 한 토큰) |
| `src/server/conversation/index.ts:1312` | `readTalkWrap` · `WrapOutcome`(정리 토막 세션의 마무리 자료 — 열린 대화 · 남의 세션 not_found, AI 없음) |
| `src/server/actions/conversation.ts:70` | 액션 `readTalkWrap`(첫 문장 requireAccess — access-gate 시험이 저절로 봄) |
| `src/server/conversation/turn.ts:515-548 · :716` | 재검토 P-1 — `turnInFlight` 에 요청 기다림 상한: 마지막 호출이 실패면 `max(마지막 끝, 첫 호출 + AI_WAIT_TIMEOUT_MULTIPLE × ai.timeout_seconds.realtime) + TURN_SAVE_GRACE_MS` 까지 진행 중, 성공이면 지금처럼 `마지막 끝 + 여유`. 설정 키 `ai.timeout_seconds.realtime` 을 turnSettings 에 |
| `src/app/(child)/[area]/lessons/page.tsx` · `past/page.tsx` · `lesson-board.tsx` · `past/past-lessons.tsx` | talk redirect · `Exclude<Area,"talk">` 지움. 단계 없는 회화는 `/speaking/placement`(새 `placement-path.ts` — 쪽 파일은 다른 이름을 내보낼 수 없어 따로) |
| `src/app/(child)/talk/page.tsx` | 지움(작업 트리에서만 — 색인은 건드리지 않음). `/talk` 404 |
| `src/app/(child)/home-cards.tsx` | `TALK_PATH` 지움 — 회화 카드도 `/${area}/lessons` |
| `src/app/(child)/page.tsx:26-31` | `after(() => closeIdleTalks({ profileId, at: now() }, { now }))`(P11b 꼴 — 쿠키 · 머리글은 after 안에서 안 읽음) |
| `next.config.ts:19-25` | X-1 — 추적 포함 키 `/` 더함(까닭 주석). 빌드 뒤 `.next/server/app/(child)/page.js.nft.json` 에 seed/lists 넷(forbidden · forms · homophones · meta-sentences)이 든 것을 확인 |
| `tests/e2e/talk.ts` | `fullTalkLesson`(다섯 토막 견본 — 단원 단어를 새 단어로 좁혀 오늘 쓸 말 = 카드 차례) · `openTalkSession(…, { kind })` · `failingRun` · `reachSafetyCap` |
| `tests/e2e/conversation.spec.ts` | 열기 도우미 `pastStart`('시작!' → 처음 마이크 안내), 차례 5 시험 둘(stale 둘째 쪽 · 3단계 빠르기)을 '시작!'에 맞춤, 새 describe 셋 · 시험 16(아래) |
| `tests/e2e/home.spec.ts` · `lesson-list.spec.ts` · `placement.spec.ts` · `font-size.spec.ts` | P10 시험 넷 — 회화 카드 href `/talk/lessons`, 목록 '토리 준비' 대신 말하기 배치 평가로 · `/talk` 404, font-size 는 '회화 준비 중' 대신 '회화 수업 목록'(집에 회화 1단계 · 견본 수업) |
| `tests/unit/talk-follow.test.ts`(새) | 단위 9 |
| `tests/integration/conversation-session.test.ts` | P-1 · P-2 새 시험 하나 + `readTalkWrap` 단언 둘 |

### 설계와 다르게 한 것 · 정한 것(까닭)

1. 열 때 차례를 막힘 → **쉼** → '시작!' → 마이크 안내로 했다(plan 값 7 은 안내 → 마이크 안내 → 쉼). 쉬는 날 첫 회화면 안내 · '시작!'을 누른 뒤 곧 쉼 안내가 나와 한 화면 두 행동이 된다. 안내 표시는 '시작!'에서만 남기므로 쉬는 날에는 다음에 안내가 나온다.
2. '시작!'을 처음 마이크 안내보다 앞에 늘 둔다(컨트롤러 결정). 마이크 안내는 지금처럼 기기마다 한 번이라 처음 기기에서는 두 번 누른다.
3. 지난 수업 쪽(`past/page.tsx`)도 talk redirect 를 지웠다. 브리프는 수업 목록 쪽만 적었지만 그 쪽도 `/talk` 로 보내 404 가 된다. 단계 없는 회화를 `/speaking/placement` 로 보내는 것은 4절 홈 표 회화 카드 행과 같은 길이다(전에는 `/talk/placement` 404 였을 자리).
4. 서버 함수 하나(`readTalkWrap`)를 더했다. 목표 턴 뒤 1-가 상한 닫힘 줄에는 마무리 자료(오늘 얻은 단어 · 친한 정도 · 다음 이야기)가 없어서, 8절 '목표 턴 뒤의 회화' 행(정리 → 마무리 첫 장 · 셋째 장)을 그리려고 닫힌 뒤 읽는다. 못 읽으면 끝인사 + '수업 목록'.
5. P-1 은 검토 권고(늘 두 값 가운데 늦은 쪽)보다 좁게 했다. 마지막 호출이 성공이면 다시 시도가 없으므로 지금처럼 끝 + 5초, 실패일 때만 요청 기다림 상한까지 본다. 실패로 끝난 요청이 정말 죽었으면 같은 시도 id 다시 보냄이 그 상한(시험 값 25초)까지 stale 이다. 화면 되풀이(1.5초 × 20)가 그 안에 닿는다.
6. 따라 말하기 조각에는 인식 글을 보이지 않는다(4절 '결과 말로만'). 말하기 영역 따라 말하기와 다르다.
7. 4단계부터 둘째 장은 c 몫이라 `closingCardsOf` 가 지금은 단계와 관계없이 첫 장 · 셋째 장이다.
8. 마무리 중에는 띠의 수 · '그만하기' · '홈'을 숨겼다(셋째 장 '홈' 하나 — 한 화면 '홈' 하나).
9. 장 이름을 글자(first · third)로 했다. 숫자 1 · 3 이 설계 숫자 검사에 오탐으로 잡혀서다. 화면 표지 `data-closing-card` 는 1 · 3.

### 정본 밖 문구(새로 쓴 것)

'토리를 따라 말해 봐요' · '보고 말해 봐요' · '뜻을 보고 영어로 말해 봐요'(plan 값 14 제안 그대로) · '토리와 친한 정도'(목업 B_TalkEnd) · '단어 듣기'(듣기 단추 이름). 나머지는 4절 · 3.3 글 그대로('오늘 얻은 단어' · '다음' · '다음 이야기' · '수업 목록' · '홈' · '다시 했어요' · '다음에 끝까지 이야기하면 별을 받아요' · 3.3 안내 다섯 문장 · '시작!').

### 요청하는 변경(공용 · 설계)

없음. 공용 변경은 브리프가 허용한 둘(board.tsx `ml-auto` · next.config 키 `/`)만 했다.

### 덮는 시험

단위 `tests/unit/talk-follow.test.ts`(9):
- 회화 따라 말하기: 오늘 쓸 말은 단어 차례, 말해 보기는 바퀴마다 정한 차례이고 1~3단계 따라 말할 것은 단어 · 4단계부터 예문이다
- 회화 따라 말하기: 이어 열면 이미 저장한 차례는 건너뛴다
- 회화 말해 보기: 둘째 바퀴부터 일치율이 talk.hint_read_match 아래이면 영어 문장을 보이고 들려준다(첫 바퀴는 이미 보임)
- AC-16c 처음 회화 안내는 3.3 글 그대로이고 처음이 아니면 안내 글 없이 '시작!'만 있다
- AC-15e 1~3단계 마무리는 둘째 장 없이 첫 장 · 셋째 장이고 목표 턴 뒤 '홈'은 첫 장만이다
- 회화 마무리: 친한 정도 막대는 talk.friendship_max 칸 가운데 지금 값만큼 찬다(숫자 없음)
- AC-15g 마무리 첫 장의 오늘 얻은 단어는 대화에 원형이 안 나온 것에만 듣기 단추가 있고 끝인사 · 숫자 · 퍼센트 · '내일'이 없다
- AC-15f 목표 턴 전 그만둔 대화의 첫 장은 '다음에 끝까지 이야기하면 별을 받아요', 다시 하기는 '다시 했어요'다
- AC-15e 셋째 장은 친한 정도 막대 · 다음 이야기 · 큰 '다음 이야기' · 작은 '홈'이고 '다음'이 없으며 다음 수업이 없으면 큰 단추는 '수업 목록', 다시 하기는 막대가 없다

통합 `conversation-session.test.ts`:
- 새 'AC-15f 토리의 말이 없는 마지막 턴의 같은 시도 id 는 마지막 호출이 실패면 그 요청의 기다림 상한과 저장 여유가 지날 때까지 다시 부르지 않고 그 뒤 TURN_IN_FLIGHT_MS 안이면 다시 부른다'(P-1 · P-2 — 여유 + 1초는 stale · AI 그대로, 상한 + 여유 + 1초(< 60초)는 다시 부름. 2분 단언은 원래 시험에 그대로)
- '1-가 안전 상한(회화): 목표 턴 뒤 더 이야기하기 중에 닿으면 …'에 `readTalkWrap` 단언(되짚을 말 = 닫힘 줄 · 카드 끝인사 · 중단 아님 · 막대 있음 · AI 없음)
- 'AC-15f 목표 턴 전에 떠난 대화는 …'에 열린 대화는 `readTalkWrap` not_found

e2e `conversation.spec.ts` 새 16(사진 이름은 괄호):
- AC-15a 회화 1단계 수업은 인사 → 오늘 쓸 말 → 말해 보기 → 대화 → 정리 순서로 이어지고 대화 토막의 아이 차례에 영어 문장이 보이지 않는다 — 홈 카드 → 회화 수업 목록 → 세션 → 안내 '시작!' → 오늘 쓸 말 → 말해 보기 → 대화 열네 턴 → 목표 턴 고르기 '그만하기' → 정리 → 첫 장 → 셋째 장(막대 · 다음 이야기 = 둘째 수업) → '다음 이야기'로 새 세션('시작!'만). 듣기 끝 조용함은 그 시험 동안 0.3초(`withHouseholdSetting`) (closing-1 · closing-3)
- AC-16c 처음 회화를 열면 … 안내가 보이고 … '토리의 약속' 한 줄이 늘 보인다 — notices_seen talk_intro · 다시 열면 '시작!'만 (intro)
- AC-15g 회화 오늘 쓸 말은 … 인식이 speech.max_retries 번 실패한 단어는 건너뛴다 — 단어 · 뜻 · 예문, 단어 → 예문 읽기, 결과 말 뒤 저절로 다음, 실패 셋이면 말해 보기로 · attempts(said · recognition) (today-words)
- AC-15a 회화 1단계 말해 보기는 첫 바퀴를 예문 모두에 한 뒤 둘째 바퀴를 다른 순서로 하고 … 영어 문장이 보이고 들린다 (say-it · say-it-reveal)
- AC-15f 목표 턴 전에 '그만하기'를 누르면 '토리와 그만 이야기할까요? …'를 묻고 그만두면 마무리 첫 장에 '다음에 끝까지 이야기하면 별을 받아요'가 보인다 (stop-confirm)
- AC-15a '그만하기'를 누르면 AI 응답을 기다리지 않고 토리가 오늘 쓴 말을 되짚고 아이가 따라 말한 뒤 마무리 화면으로 간다 — 정리 따라 말하기 attempts 1 (wrapup)
- AC-15g 대화에서 나오지 않은 새 단어는 마무리 첫 장에 듣기 버튼과 함께 보인다
- AC-15e 회화 마무리는 장마다 '다음' 버튼으로 넘어가고 1~3단계는 둘째 장 없이 셋째 장으로 가며 …
- AC-15e 끝인사는 정리 토막에서 한 번만 나오고 마무리 첫 장에는 없으며 … 다음 이야기는 수업 목록의 '여기부터 해요' 회화 수업 주제와 같다
- AC-15e 다시 하기로 한 대화의 첫 장에는 '다시 했어요'가 보이고 친한 정도 막대가 없다
- AC-15f 목표 턴 전에 회화 화면에서 '홈'을 누르면 확인 없이 홈으로 가고 다시 열면 '하던 수업 이어 하기'로 토리의 마지막 질문부터 이어진다 — 뜻 tori_ko · AI 요청 그대로 (resume)
- AC-15p 회화 3단계 대화 턴에서 '힌트'를 누르면 한국어 뜻 → 영어 틀 → 영어 문장 순으로 열린다
- AC-15p 1단계 카드 턴에 그림 키가 있으면 토리 말풍선 옆에 그림이 크게 보이고 글은 보이지 않는다 — 그림 주소에 `page.route` 로 작은 PNG
- AC-5c 회화 세션 도중 마이크 권한을 거두면 세션이 진행으로 남고 '마이크가 필요해요. 부모님께 말해 주세요'와 '홈'이 보인다 (needs-mic)
- 1-가 안전 상한(회화): 상한 날 회화 수업을 고르면 '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요'와 '홈'이 보인다
- AC-15j 대화 안전 상한에 닿으면 끝인사 뒤 수업 목록으로 간다(talk.safety_max_turns 를 그 시험 동안 2)

사진(두 방향, E2E_PHOTOS): p13-talk-intro · -today-words · -say-it · -wrapup · -closing-1 · -closing-3 · -stop-confirm · -resume(브리프 여덟) + -say-it-reveal · -needs-mic. 덧 N-1(세로 띠 접힘)은 이 사진들의 띠로 본다.

### 실행 명령과 출력(Node 24.22.0)

```
pnpm -s biome ci .                     → exit 0 (373 files)
pnpm exec tsc --noEmit                 → exit 0(지운 /talk 의 옛 경로 타입은 next typegen 으로 다시 만듦)
pnpm test                              → exit 0, 68 파일 · 718 통과 · 6 todo
pnpm build                             → exit 0(경로 표에 /talk 없음)
pnpm check:deps                        → no dependency violations (191 modules, 1039 dependencies)
pnpm check:ids                         → exit 0 · design-number 37(새 줄 없음)
pnpm check:bundle                      → 위반 0
pnpm spec:trace --fail-on unknown-ac,plan-ac-not-in-spec → exit 0
pnpm vitest run --project integration  → 로컬 불가(embedded-postgres 'done is not a function'), CI 몫
pnpm e2e                               → 로컬 불가, CI 몫(사진 E2E_PHOTOS)
```

### 남은 우려

- e2e 16 과 통합 새 시험은 여기서 한 번도 돌지 않았다. 첫 CI 가 첫 실행이다. 홈부터 끝까지 시험은 열다섯 턴 · 따라 말하기 열 번이라 길다(제한 300초).
- 그림 시험은 시험용 DB 그림 경로가 `/images/…` 꼴이라는 가정에 기댄다(빌더 `images/vocab/<키>.png`). 다르면 route 가 안 맞아 그림이 접힌다.
- 덧 N-1 · 마무리 · 따라 말하기 화면 꼴은 단위 정적 그림과 사진으로만 본다. 자동 다음 · 다시 보임 같은 시간 흐름은 e2e 만 덮는다(DOM 시험 도구 없음).
- 차례 5 의 열린 결정(그림 키 = 영어 낱말이 자료 · 그림 주소에 드러남)은 그대로다. 이번 그림 시험 route 도 그 주소를 쓴다.
- 3.3 은 '마무리 첫 장에 이 문제 이상해요 작은 버튼'이지만 1-나 몫이라 자리만 두었다(버튼 없음).
