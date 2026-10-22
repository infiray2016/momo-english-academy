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
