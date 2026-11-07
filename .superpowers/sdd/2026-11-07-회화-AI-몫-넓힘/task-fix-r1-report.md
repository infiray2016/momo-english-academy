# fix 라운드 1 보고 — 대본 회차 r1 설계 판정 Important 6 · Minor 7

상태: DONE_WITH_CONCERNS. 관문 전체 0 · 4단계 골든 shasum 그대로 · 짝 시험 · 넓이 시험 0 · 바퀴당 호출 77(r1 과 같음). 우려는 끝 절.
구현자: Opus high · 2026-11-07 · 워크트리 `.claude/worktrees/p13d` · 커밋 없음 · 실호출(`--yes`) 안 함.

## 지적별 반영 자리(워크트리 줄)

| # | 고친 것 | 자리 |
|---|---|---|
| I-1 (가) | 1~3단계 고정부에서 상황 차례 예 목록을 뺐다. 사용자 메시지 계획 줄에 그 자리 예 하나만 'Example line (자리 이름; only the kind of line, never copy it)' 로 넣는다. 예는 돌림 번호로 셋 가운데 하나다(설정값 아님). 말 입력 턴은 'If stuck, Example line' 도 붙는다. 인사 끝은 nextPart 로 준비 · 대화 예를 고른다. 4단계 계획(lowBand 없음)은 돌림 번호가 있어도 줄이 없다 | `src/core/ai/calls/talk-lesson.ts` 869(lowSituationRules) · 987(베끼기 · 되풀이 금지 줄) · 251(TalkCallTurn.situationExample) · 528(exampleOf) · 1144(SITUATION_PLACE_LABEL · planLines). 예 표는 `src/core/conversation/situation.ts` 37 로 옮기고 talk-lesson 74 가 같은 이름으로 다시 내보낸다 |
| I-1 (나) | 상황 차례 검사에 까닭 둘을 더했다. repeat 는 이 대화 앞 선생님 행 글의 한 문장과 같은 문장이고, copy 는 상황 차례 예 문장(SITUATION_EXAMPLE_SENTENCES)과 같은 문장이다. 걸리면 지금 길대로 첫 걸림은 되풀이를 피한 시드 상황 줄, 뒤 걸림은 지움이다. 서버 · 도구 배선이 `repeat: true` 로 켠다. 지표(4-나)는 그대로다 | `situation.ts` 100 · 191 · 288. `src/server/conversation/lesson-turn.ts` 725 · 750 · 2580. `scripts/talk-observe.ts` 1276 |
| I-2 | 아이가 먼저 말한 필수 답을 앱이 센다. 아이 말 하나가 노리는 단어(원형)와, 답 예시에 그 밖 내용 낱말이 있으면 그 하나를 함께 담아야 한다. 흐름 입력 `LessonArgs.childAnswered` 로 넘기면 남은 기회(기회 알림 · 흐름 카드 자리 · 서버 카드 자리)에서 뺀다. 1~3단계만이다 | `src/core/conversation/lesson-flow.ts` 99 · 569(childAnsweredRequiredOf) · 612(childLinesOf) · 1284. 서버 `lesson-turn.ts` 2444. 도구 `talk-observe.ts` 2566 |
| I-3 (가) | 응답을 읽지 못한 까닭을 가르는 순수 함수를 더했다. 까닭은 not_json_object · field:<칸>:<까닭> · tori_en_empty 다. 대본 도구는 표시 칸에 '까닭 … · stop …' 을, JSON 보고 `rawOnFail` 칸에 응답 원문을 남긴다 | `talk-lesson.ts` 1712. `talk-observe.ts` 959 · 1983 · 2515 · 2217 |
| I-3 (나)(다) | 1~3단계 실패 · 거절의 대신 줄을 바꿨다. 상황 차례면 지금처럼 그 자리 상황 줄이다. 상황 차례가 아니고 아이 말이 모름 꼴('Huh?')이면 받침 둘째 자리 상황 줄(en · ko)이다(failSituationPlaceOf). 그 밖은 칭찬 대사(시드에 뜻 칸 없음) 대신 카드 안전한 대사(en · ko, 턴 번호 돌림)다 | `situation.ts` 144. `lesson-turn.ts` 2009 · 2642. `talk-observe.ts` 1473 · 2858 |
| I-4 | 앱 무름의 장면 낱말 길(touchesScene)을 한 낱말까지 넓혔다. 'Rice.' 처럼 장면 · 카드 낱말 하나면 AI 가 막힘이라 해도 막힘이 아니다. 기능어 · 대답 말 · 모름 말은 아니다. 1~3단계 고정부에 같은 경계 줄을 더했다(C204 (2) 그대로) | `src/core/conversation/child-kind.ts` 191. `talk-lesson.ts` 997 |
| I-5 | 소리 줄 자리 함수 soundLinePlacesOf 를 core 에 두었다. 회화 턴 정규화(따라 할 말 · 선택지)와 지표 soundOutsideOf 가 이 함수 하나를 쓴다. 필수 질문 · 이어 묻기 갈래의 따라 할 말은 꺼낼 새 단어를 담아도 버린다. 갈래 셈(asEnum · cardChainGuardOf)을 거름 앞으로 옮겼다. 고정부 줄에 '꺼낼 새 단어' 정의 한 줄과 next_move introduce 조건을 적었다 | `src/core/conversation/cue-line.ts` 159. `talk-lesson.ts` 982 · 1797. `scripts/talk-metrics.ts` 597 |
| I-6 | 질문 검사에 echo 까닭을 더했다(questionEchoesChild). 하나는 'A or B?' 의 or 양옆이 아이의 이번 말에 있는 경우다. 다른 하나는 예 · 아니요 질문의 내용 낱말(like 만이 아닌)이 모두 아이의 한 말에 있는 경우다. 재료는 `LowLevelLineOptions.childLines`(이 대화 아이 말)이다. 서버 · 도구가 넣는다. 걸리면 지금 재질문(C203) → 카드 자리 길이다. 다시 쓰기 안내에 까닭 줄을 더했다. 고정부에도 되묻기 금지 줄을 더했다 | `src/core/conversation/question-check.ts` 134 · 362 · 408. `question-retry.ts` 57. `lesson-turn.ts` 2565. `talk-observe.ts` 2375. `talk-lesson.ts` 999 |
| M-1 | 고친 것은 둘이다. 예를 그 자리 하나만 보이고, 줄 앞에 지금 자리 이름(예 'Support stage 1: an okay reaction and a short cheer')을 붙였다 | I-1 (가) 자리 |
| M-2 | 길이(too_long) 다시 쓰기 안내에 '낱말을 줄이되 말이 되는 온전한 질문을 둔다' 줄을 더했다. 길이 상한 설정값은 그대로다 | `question-retry.ts` 80 근처 |
| M-3 | 1~3단계 고정부에 '카드 장면 줄을 아이 상태 단정으로 바꾸지 않음' 줄을 더했다. 카드 글 'Sand on your hands!' 자체(M-5 열림)는 시드라 손대지 않았다 | `talk-lesson.ts` 1001 |
| M-4 | 고정부만 고쳤다. 장면 다리 앞 반응을 한 문장으로 둔다는 줄이다. 앱 거름은 더하지 않았다(지금 문장 수 상한은 기록만 하는 칸이고, 거르면 카드 다리 문장을 지울 위험이 있다) | `talk-lesson.ts` 1001 |
| M-5 | 안 고쳤다. 지표 정의 조정 넷과 끼움 셈 보정은 4-나(`talk-metrics`) 몫이다. 이 라운드 묶음(1 · 2 · 4-가 · 5)에 들지 않고, 브리프가 '지표(4-나)는 그대로'라 했다. I-5 의 soundOutsideOf 를 core 함수로 바꾼 것만 지표 파일에서 고쳤다 | — |
| M-6 | 상황 줄 · 예 돌림 번호에 대화마다 다른 값을 더한다(situationRotationOf — 턴 번호 + 열쇠 해시 % 12). 서버 열쇠는 세션 id, 대본 도구는 '대본 이름#바퀴'다. 열쇠가 비면 턴 번호 그대로라 짝 시험 · 다시 흘림이 같다. 판정이 권한 '수업 번호'는 두 바퀴가 같은 수업이라 근거 차례를 풀지 못해 쓰지 않았다 | `situation.ts` 114. `lesson-turn.ts` 2459 · 2536. `talk-observe.ts` 1250 · 2627 · 3651 |
| M-7 | 1~3단계 고정부에 '무엇 · 누구 · 어디 질문을 먼저, like · A or B 꼴은 가끔' 줄을 더했다. 다시 쓰기 안내에도 같은 뜻 줄을 더했다 | `talk-lesson.ts` 999. `question-retry.ts` 80 |

## 설계와 다르게 한 것 · 정한 것
1. **I-3 대신 줄.** 브리프는 '시드 상황 줄(en · ko)'이라 했다. 그러나 상황 줄 목록에는 말로 답한 아이 뒤의 자리가 없다. 그래서 모름 꼴 아이 말만 받침 둘째 상황 줄로 하고, 그 밖은 뜻이 있는 카드 안전한 대사로 했다. 정본 8절 '1~3단계 두 번 실패 → 칭찬 대사' 문구와 달라졌으니 정본 반영이 필요하다(컨트롤러 몫). `lessonOutcomeViewOf` 입력의 praiseLines 칸은 지웠다.
2. **I-1 예 베끼기는 문장 단위다.** 'That's okay!' 같은 짧은 반응도 예 문장이면 걸려 상황 줄로 바뀐다. 근거 35 차례를 모두 잡는 쪽을 골랐다(판정 7절 권고 (나) 그대로).
3. **I-2 · I-6 · 예 줄은 1~3단계만이다.** 4단계 사용자 메시지 · 흐름은 고치기 전 그대로다(plan 정한 것 1).
4. **새 파일은 시험 하나뿐이다.** 예 표는 순환 가져오기를 피하려고 `situation.ts` 로 옮겼다.

## 요청하는 변경(이 라운드 밖 파일)
- **`src/server/ai/talk.ts`(공용):** validation_failed 행의 ai_calls error_code 에 `talkLessonInvalidReasonOf(prepared)` 를 적으면 운영에서도 까닭이 남는다. 한 줄 고침이다. 공용 파일이라 손대지 않았다.
- **4-나 지표(M-5):** 시드 상황 줄도 '고정 문장'으로 센다. 그래서 I-1 이 AI 글을 상황 줄로 바꾸면 고정 문장 수는 크게 줄지 않을 수 있다. r2 는 '상황 줄로 바꿈' 표시 수와 상황 반응 되풀이 0 을 따로 보아야 한다.
- **정본:** 8절 1~3단계 실패 대신 줄(위 1)과 05절 고정부 1~3단계 상황 차례 예 자리(사용자 메시지로 옮김)를 반영해야 한다.

## 덮는 시험
- 새 파일 `tests/unit/talk-fix-r1.test.ts`(22): I-1 (가) 예 줄 · 돌림 · 4단계 없음 · If stuck · 인사 끝 예 · 고정부 목록 없음. I-1 (나) · M-6 repeat · copy · 자기 말 통과 · 돌림 열쇠. I-2 시드 카드 근거 글('We eat rice and fish.' · 'I drink the juice.' · 대조군 'I drink water.') · 흐름 기회 빼기 · 아이 말 목록. I-3 까닭 가름 · 대신 줄 자리. I-4 'Rice.' 무름 · 대조군. I-5 지표 ↔ core 자리 짝(받침 단계 × 갈래 × 들리지 않음 × 고르기 단계 전부) · 'I wash my hands.' · 범위 안 'The weekend.' 필수 · 이어 묻기 버림 · 꺼내기 남김. I-6 근거 글 둘 · 대조군 여섯 · echo 까닭 · 안내 줄. Minor 고정부 · 안내 줄.
- `tests/unit/talk-observe-parity.test.ts` 새 절 '대본 회차 r1 판정 fix 1'(6). 서버 · 도구를 함께 돌려 같은 결과를 본다: 인사 끝 예 베끼기 · stuck-three 받침 첫째 세 번 모두 다른 말 · greet-more L2 3 카드 자리가 필수 2 · preview-1 L1 7 echo → 카드 자리 · 읽지 못한 차례의 까닭 · 원문 · 대신 줄. I-4 는 도구 길로만 본다(아래 우려). 실패 대신 줄 시험 둘(안전한 대사 · 'Huh?' 상황 줄)도 더했다.
- 붉음 확인: 고침 일곱을 하나씩 끈 사본에서 새 시험이 붉어진다(I-1a 2 · I-1b 3 · I-2 2 · I-3 2 · I-4 2 · I-5 1 · I-6 2). 되돌린 뒤 초록이다. 기록은 스크래치패드 `fix-r1-mutations.txt` 다.
- 옛 시험 고친 줄(바뀐 동작 · 문구): talk-lesson-call(따라 할 말 다섯 곳에 next_move introduce 를 넣음, 이어 묻기 차례 기대 ''), talk-prompt-fix1 · fix2 · talk-ai-scope-prompt(고정부 문구), talk-prompt-fix3('Fish.' 한 낱말 닿음 · 실패 줄), talk-lesson-turn · talk-situation(실패 줄), talk-ai-scope-flow(꺼내기 갈래), 짝 시험 서버 흉내(childLines · repeat · 실패 자리) · 예 문장을 반응으로 쓴 셋. 통합(CI 몫, 안 돌림): talk-lesson-turn AC-15b 기대를 안전한 대사로 바꿨고, talk-ai-scope 의 반응 글 'We can do it!'(예 문장)을 'We can do this too!' 로 바꿨다.

## 실행(전문은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/fix-r1-*.txt`)

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit` | 167 파일 · 2240 통과 · 6 todo · 실패 0(시작 2211) |
| `pnpm biome ci` | 종료 0(634 파일) |
| `npx tsc --noEmit` | 종료 0(통합 · e2e 포함) |
| `pnpm build` | 종료 0 |
| `pnpm check:ids`(CI 인자) | 종료 0 · design-number 46(그대로, 제 파일 0) |
| `pnpm seed:validate` | 종료 0(경고는 앞과 같은 4 · 5단계 목표) |
| `shasum tests/fixtures/talk-prompt-l4-before.txt` | 0ad2d535549f6221de855dcee75683c501c1472d(그대로) |
| `pnpm talk:observe --level 3`(--yes 없이) | 종료 0 · 대본 12 · 바퀴당 예상 호출 77(r1 과 같음) |
| 통합 · e2e | 안 돌림(CI 몫) |

## 남은 우려
1. **상황 차례가 시드 줄로 많이 바뀔 수 있다.** copy 는 'That's okay!' 같은 흔한 반응도 건다. r2 에서 상황 차례 AI 글이 대부분 상황 줄로 바뀌면, 예 문장 걸림을 '예 줄 전체 · 두 문장 이상'으로 좁힐지 컨트롤러가 정해야 한다.
2. **답 글 검사가 대명사 'I' 를 답 글 낱말로 본다(앞 묶음 동작).** 장면 여는 질문 답 예시 'Yes, I ride a bike.' 의 'I' 가 기능어 표시에 없어서다. 그래서 받침 첫째의 'I can help.' 같은 자기 말이 상황 줄로 바뀐다. 이번에 짝 시험을 만들다 찾았고 고치지 않았다.
3. **echo 는 재질문을 늘릴 수 있다.** 재질문은 C203 의 턴당 1회 상한 안이다. 기본 호출 수(바퀴당 77)는 그대로지만 재질문 비용은 r2 에서 본다.
4. **읽지 못함의 한 후보를 찾았다.** 느슨한 규격은 tori_ko 칸이 아예 없으면 읽지 못한다(`field:tori_ko:invalid_type`). r1 의 3건이 이 때문인지는 확인하지 못했고, r2 기록의 '까닭' 칸으로 가린다.
5. **짝 시험의 서버 흉내에는 막힘 무름 잡아 두기 · 다시 쓰기(C204 (3))가 없다.** 그래서 I-4 는 도구 길로만 본다. 막힘 판정 자체는 서버와 도구가 같은 정규화 함수를 쓴다.
6. **e2e 는 돌리지 않았다.** 예 문장을 가짜 응답에 쓰는 자리가 있다(talk-lesson.spec 'That's okay!' 등). 다만 시험 어휘에 okay · learn 이 없어 이미 범위 밖으로 바뀌던 자리라, 화면 글 단언이 달라질 곳은 찾지 못했다.

## 추가 단서 반영(컨트롤러 09:1x — 판정 8.1 · 8.2)

### (1) I-3 원인: 한 낱말 · 막힘 꼴 입력 뒤의 읽지 못함
- **r1 · medium JSON 을 다시 읽었다(6/308).** 여섯 모두 `stop end_turn` · 판정 invalid · 계획 'ai · 질문'(If stuck card_slot)이고, 정규화 전 AI stuck 이 모두 참이다. 그러니 원문 JSON 은 읽혔다. 출력 토큰은 246~248 다섯 · 306 하나다. 짧은 정상 차례는 281~293 이다.
- **추론(원문이 없어 확정은 아님): 빈 tori_en 이다.** 응답 규격(`talkLessonWire`)은 입력과 관계없는 정적 꼴이다. 한 낱말 입력에서 달라지는 칸은 없다. 구조화 출력이면 느슨한 규격은 깨지지 않는다. 그러면 정규화가 null 을 내는 남은 길은 `tori_en === ""` 하나다. 앱 확인 검사도 'tori_en 이 비었다'로 엄격 길을 막아, 기록의 판정이 strict 가 아니라 invalid 인 것과 맞는다. 248 토큰은 stuck · child_kind 만 채운 거의 빈 JSON 의 길이와 맞는다. 정리하면 AI 가 막힘을 고른 뒤 If stuck 카드 자리('반응만')에서 반응까지 비운 것으로 본다.
- **시험으로 굳혔다(`talk-fix-r1` 새 시험 하나).** stuck 참 · 갈래 unrelated_words · 나머지 빈 칸인 응답은 규격을 지난다. 그런데도 앱 확인 검사가 'tori_en 이 비었다'로 걸고, 정규화는 null, 까닭은 tori_en_empty 다.
- **기록 칸(4-가):** 도구 표시 칸이 이제 다음 넷을 적는다(`scripts/talk-observe.ts` evaluateLessonMessage · filledFieldsOf).
  - 정규화 까닭
  - 엄격 규격의 첫 걸린 칸, 또는 앱 확인 걸림 목록
  - 채운 칸과 그 값(예 `child_kind="unrelated_words" stuck=true`)
  - 멈춘 까닭
  
  원문 전체는 JSON 보고 `rawOnFail` 에 남는다. r2 는 이 칸으로 추론을 확정하거나 버린다.
- **고칠 길 제안(이번에 하지 않음 — 정규화의 null 뜻이 바뀌어 컨트롤러 결정 거리).** 1~3단계에서 tori_en 만 빈 응답은 '반응이 다 지워진 차례'로 받는 길이 있다. 그러면 상황 차례는 반응 자리 상황 줄(지금 있는 길)로, AI 질문 차례는 needsQuestion 카드 자리로 간다. 이렇게 하면 다시 부르지 않고 막힘 · 갈래 칸을 살린다. 4단계는 그대로다.

### (2) r2 대본 하나 더함
- `tests/fixtures/talk-observe/l3-second-session-recall.json`(8 차례 = 8호출). 3단계 단원 1 수업 1 · 미나다. 요약 줄은 l3-second-session 과 같은 '사과 · 공놀이'이고 대본 칸 settings 로 greeting_recall 을 켠다. 인사 답이 'I am good. I like apples!' 로 요약에 닿고, 셋째 차례 'I play with a ball.' 로 공놀이에 닿는다. 끔 바퀴는 `--set talk.greeting_recall=off` 로 돈다. 판정 기준(요약 밖 기억 0 · 끔에서 지난 대화를 아는 듯 말하지 않음)은 note 칸에 적었다.
- 대본 수를 세는 시험을 고쳤다(`tests/unit/talk-observe.test.ts`: 대본 열넷 · 3단계 열셋 · 요약 대본 둘 · 계획 줄 '대본 13'). `pnpm talk:observe --level 3`(--yes 없이)은 대본 13 · 바퀴당 예상 호출 85(77 + 8)다.

### 관문(추가 뒤)
`pnpm vitest run --project unit` 2241 통과 · 실패 0 / `pnpm biome ci` 0 / `npx tsc --noEmit` 0 / `pnpm check:ids`(CI 인자) 0 · design-number 46 / 골든 shasum 그대로 / observe 계획 모드 0. src 는 이 추가에서 바뀌지 않아 build 는 앞 결과(0) 그대로다.

## 마무리(컨트롤러 09:1x 허용 · 지시 셋)
1. **`src/server/ai/talk.ts` 한 줄(허용).** finishTalk 가 정규화 null 로 남기는 'validation_failed' 행에 이제 `errorCode: closing ? null : talkLessonInvalidReasonOf(prepared)` 를 적는다. 끝맺음 턴은 정규화 까닭이 달라 비운다. 이 함수를 쓰려고 같은 파일 가져오기 목록에 이름 하나(`talkLessonInvalidReasonOf`)를 더했다. 바뀐 것은 이 둘뿐이고, biome 이 record 부름을 여러 줄 꼴로 바꿨다. 재질문 호출은 지금처럼 `taggedErrorCode` 가 '표지:까닭' 꼴로 잇는다.
   - 시험: `tests/unit/talk-lesson-stream.test.ts` 에 '대본 회차 r1 판정 I-3 (가) 읽지 못한 응답(빈 tori_en)은 ai_calls 검증 실패 행의 error_code 에 까닭을 남긴다' 하나를 더했다. 고친 줄을 되돌리면 붉어지고 원본은 초록이다.
   - 맞춰 볼 것: `src/db/schema/operations.ts:138` 칸 설명은 '검증 실패는 비운다(정할 것 나)'라고 적혀 있다. 칸 설명과 정본 · 정할 것 나 문구를 이 고침에 맞출지는 문서 쪽이 정할 일이다. 스키마 파일은 손대지 않았다. 같은 칸에 재질문 표지를 적는 앞선 예가 이미 있다.
2. **r2 대본 'l3-second-session-recall'** 은 앞 절(추가 단서 (2))에서 이미 더했다. 대본 수 단언(대본 열넷 · 3단계 열셋 · 요약 대본 둘 · 계획 줄 '대본 13')도 맞췄다.
3. **정본 8절 '칭찬 대사' 문구**는 컨트롤러가 문서 쪽에서 본다(손대지 않음).

관문: `pnpm vitest run --project unit` 2242 통과 · 실패 0 / `pnpm biome ci` 0 / `npx tsc --noEmit` 0. 커밋 · 실호출 없음.

## 결정 반영(컨트롤러 2026-11-07 — 1~3단계 막힘 응답의 빈 tori_en · operations.ts 칸 설명)
- **core 함수 하나(`src/core/ai/calls/talk-lesson.ts` emptyToriEnStuckOf · EMPTY_TORI_EN_STUCK).** 끝맺음 밖에서 원문이 stuck 참 · tori_en 빈 글이면 참이다. 정규화(`normalizeTalkLesson`)는 1~3단계에서 이 응답을 읽지 못함(null)이 아니라 값으로 받는다. 그 밖의 빈 tori_en 과 4단계는 지금처럼 읽지 못함이다. 서버와 대본 도구는 같은 정규화를 쓰고, 기록 · 표시도 이 함수로 가른다.
- **끝 처리는 지금 길 그대로다.** 문장이 없으니 문장 문에 든 것이 없고, 막힘 계획(받침 첫째 카드 자리)이 골라진다. 끝 처리의 '반응이 다 지워진 상황 차례' 길이 반응 자리에 시드 상황 줄(되풀이 피하기)을 두고, 계획의 답 소리 · 신호 말이 붙는다. 받침 둘째면 쉬운 질문이 붙는다. 다시 부르지 않는다.
- **기록.** 서버(`src/server/ai/talk.ts` finishTalk 기록 줄)는 ai_calls 에 까닭 `empty_tori_en_stuck` 을 적는다. 상태는 엄격 길을 못 지나 'validation_failed' 다. 대본 도구는 표시 칸에 '빈 tori_en 막힘 응답 → 앱 받침(empty_tori_en_stuck, 기술 오류 자리 아님)'을 적는다. failure · techError 는 비워 지표의 기술 오류 자리에 들지 않는다.
- **앱이 막힘을 무른 경우(갈래 · 낱말 셋 이상 등)는 지금 무름 길이다.** 값의 stuck 은 거짓이 되고, 서버는 잡아 두고 통째로 다시 쓰게 한다(C204 (3)의 기존 재호출, 턴당 1회 상한). 이 결정의 '호출 추가 없음'은 진짜 막힘 차례에 해당한다.
- **`src/db/schema/operations.ts:138` 칸 설명:** '성공 · 거절 · 안전 상한은 비우고, 검증 실패는 읽지 못한 까닭을 적는다(2026-11-07 fix r1, 끝맺음 턴은 비움)'로 그 줄만 고쳤다. 마이그레이션 · 열 변경은 없다.
- **시험.**
  - `talk-observe-parity` 새 절 하나(서버 ↔ 도구): 'Huh?' 에 stuck 참 · 빈 tori_en 이면 재질문 판단이 null 이다(호출 추가 없음). failure · techError · reask 가 없고, 받침 첫째에 반응 자리 시드 상황 줄 · 답 소리 · 뜻이 붙으며, 표시 칸에 까닭이 든다.
  - `talk-lesson-stream` 하나: 서버 흘려 받기가 값으로 받고, ai_calls 에 ['validation_failed', 'empty_tori_en_stuck'] 한 행이 남는다. 앞 시험(빈 tori_en → tori_en_empty)은 stuck 거짓 응답으로 바꿔 '읽지 못함' 길을 그대로 본다.
  - `talk-fix-r1` 의 거의 빈 응답 시험: 받음(무름 · 'Huh?') · 막힘 아님 · 4단계는 읽지 못함 · 끝맺음 밖.
  - 붉음 확인: 정규화의 받음 조건을 끄면 세 파일에서 3 실패, 되돌리면 초록이다.
- **관문:** 단위 2244 통과 · 실패 0 / biome ci 0 / tsc 0 / build 0 / check:ids(CI 인자) 0 · design-number 46 / seed:validate 0 / 골든 shasum 그대로 / observe 계획 모드 대본 13 · 바퀴당 85호출. 커밋 · 실호출 없음.

## fix 2(대본 회차 r2 재판정 `task-des-r2-report.md` — N-1 · N-2 · N-3 · Minor 5)

| # | 고친 것 | 자리([N-n] 표지) |
|---|---|---|
| N-1 (가)(나) | 예 베끼기 검사가 맞장구 한 문장을 걸지 않는다(isShortReaction — 네 낱말 이하이고 넘김 낱말이 없음). 그래서 'Good to hear!' 같은 아이 답 반응은 남고, 넘김 문장('Let's learn some new words!' · 'Here is an easy one.' 꼴)만 앱 돌림 상황 줄로 바뀐다. 이 턴에 AI 맞장구가 남았으면 상황 줄의 앞 맞장구를 떼고 넘김만 붙인다(situationTailOf, 뜻도 같은 자리). 기준 수는 core 상수 SHORT_REACTION_MAX_WORDS 하나이고, 대본 지표도 이 상수를 쓴다 | `src/core/conversation/situation.ts`(isShortReaction · situationTailOf · copy 조건) · 서버 `lesson-turn.ts` 와 도구 `talk-observe.ts` 의 문장 문 · `scripts/talk-metrics.ts` 상수 |
| N-1 (다)(라) | 시드 인사 끝 줄 넷을 넘김 꼴로 바꿨다: 'Let's start!' · 'Nice! Here we go!' · 'Now, let's learn new words!' · 'Great! Let's start now.'('Hmm, okay!' 꼴 없음). 1~3단계 고정부에 짧은 반응 예 줄('Yummy!' · 'Wow, nice!' · 'Oh, fun!' — TALK_LOW_REACTION_EXAMPLES)을 더했다. 허용 목록은 3-(다) 절차대로 예 문장에서 걸린 낱말로 다시 뽑아 fun · yummy 를 더했다(41 → 43) | `seed/lists/talk-situation-lines.json` · `seed/lists/talk-allowed-words.json` · `talk-lesson.ts` lowBandRules · `tests/unit/talk-allowed-coverage.test.ts` 출처 |
| N-2 | 상황 차례에서 첫 문장을 상황 줄로 바꾸면 그 뒤 AI 문장은 지운다. 같은 턴에 남긴 문장과 같은 뜻인 문장('You can do it! You can do it with me.' — 낱말이 서로 담김)도 지운다(echoesTurnSentence). 상황 줄 고르기는 앞 선생님 행에 나온 문장을 담은 줄도 건너뛴다. 그래서 'That's okay!' 가 차례마다 다시 나오지 않는다(모두 걸리면 지금처럼 돌림 줄). 시드 받침 첫째 줄에서 'That's okay! You can do it!' 을 빼고 "It's okay! Let's try." 를 넣었다 | 문장 문 두 사본 · `situation.ts`(echoesTurnSentence · situationLineOf) · 시드 |
| N-3 | 기회 목록은 fix 1 의 I-2 로 이미 빠져 있었다. r2 기록의 그 차례 Chances 줄은 '3 · 4 · 5' 였다. 원인은 AI 가 스스로 쓴 이어 묻기다. 그래서 질문 검사 echo 에 (다)를 더했다: 무엇을 하느냐 질문('What do you do …?')이 노리는 단어를 아이가 이번 말에서 말했는데 질문 글에는 없으면 걸린다('I drink juice.' → 'What do you do with the juice?'). 'What juice do you drink?' 는 지난다. 다시 쓰기 안내와 1~3단계 고정부에도 '아이의 바로 앞 말이 답인 질문 금지' 줄과 예를 더했다 | `src/core/conversation/question-check.ts`(questionEchoesChild targets) · `question-retry.ts` · `talk-lesson.ts` |
| M-r2-1 | 고쳤다. 1~3단계 끝 처리에서 잡아 둔 질문이 둘 이상이면 마지막 것만 남긴다(keepLastHeldQuestion, 서버 · 도구 같이 씀) | `question-retry.ts` · 두 끝 처리 |
| M-r2-2 | 안 고쳤다. 비교급 · 파생 정규화(easier)는 대본 지표(4-나) 몫이 함께여야 한다. 서버는 허용 낱말 대조를 사전으로만 하기로 정했다(fix 1 결정 (나)). 근거 차례의 'easier' 문장은 이제 N-2 로 지워지고, yummy 는 허용 목록으로 풀었다 | — |
| M-r2-3 | N-1 (나)로 풀린다(넘김은 앱 줄 하나 · 뒤 넘김 지움) | — |
| M-r2-4 | 안 고쳤다. 꺼내기(소리 줄 허용)를 AI 의 next_move 대신 앱이 정하는 일은 C205 해석 · 설계 결정 거리다(컨트롤러 · 요청자) | — |
| M-r2-5 | 안 고쳤다. 관찰 항목이고(지표 칸 한 건), r3 에서 다시 본다 | — |
| greeting_recall | 판정 5절대로 기본 끔을 유지한다. 코드 변경은 없다 | — |

- **설계와 다르게 · 더한 것:** echoesTurnSentence(같은 턴의 같은 뜻)와 상황 줄 고르기의 '앞 차례 문장 건너뛰기'는 판정 권고 밖이다. 맞장구를 베끼기에서 빼면 AI 자신의 겹침과 시드 줄의 'That's okay!' 되풀이가 다시 열려서 N-2 의 뜻대로 더했다. 4단계는 셋 다 닿지 않는다(1~3단계 상황 차례 · 질문 검사만).
- **시험(근거 차례의 글):**
  - `tests/unit/talk-fix-r1.test.ts` 'fix 2' 절(8): 맞장구 · 넘김 가름 · 넘김만 붙이기 · 시드 인사 끝 · yummy · 시드 받침 · 같은 뜻 · 앞 차례 문장 건너뛰기 · N-3 근거와 대조군 셋 · 질문 하나.
  - `tests/unit/talk-observe-parity.test.ts` 'fix 2' 절(4, 서버 ↔ 도구): recall L1 1 'Apples are yummy!' 가 남음 · stuck-three 받침 셋에 같은 뜻 · 같은 문장 없음 · N-3 echo → 카드 자리 · second-session L2 4 질문 하나.
  - 옛 시험 고친 줄: fix 1 시험 둘(맞장구 copy → 통과)과 talk-situation 하나(앞 행 'Great!' 때문에 다음 돌림 줄).
  - 붉음 확인: 고침 일곱을 하나씩 끄면 모두 붉어진다(2~5 실패). 기록은 스크래치패드 `fix2-mutations.txt` 다.
- **관문(스크래치패드 `fix2-*.txt`):** 단위 2255 통과 · 실패 0 / biome ci 0 / tsc 0 / build 0 / check:ids(CI 인자) 0 · design-number 46 / seed:validate 0 / 4단계 골든 shasum 그대로 / observe 계획 모드 대본 13 · 바퀴당 85호출(그대로 — 고정부 줄이 늘어 예상 비용만 1.7546 → 1.7624달러). 커밋 · 실호출 없음.
- **남은 우려:**
  1. 넘김 낱말 표(MOVE_ON_WORDS)는 손으로 정한 코드 상수다. 'Here we go!' 처럼 표에 든 짧은 넘김을 AI 가 자기 말로 쓰면 예 문장일 때만 바뀌므로 해는 작다.
  2. (다) echo 는 AI 가 적은 next_targets 에 기댄다. 노림을 비우면 걸리지 않는다.
  3. 시드 줄이 바뀌어 e2e 의 상황 줄 기대 글(시험 시드는 견본이라 닿지 않을 것으로 봄)은 CI 에서 본다.

### fix 2 더함(컨트롤러 09:4x — 코드 검토 `task-rev-fix-r1-report.md` · M-5 지표 조정)
- **코드 검토 Important 1(예 베끼기가 문장 단위):** fix 2 의 N-1 이 검토 '어떻게' 2 길(맞장구는 빼고 넘김만 앱 줄, 시드를 넘김 꼴로)이다. 검토 3 의 시험도 넣었다: 짝 시험 인사 끝 'Good to hear! Let's learn some new words!' 가 반응 하나 + 넘김 하나(두 문장)로 남는다.
- **Minor 1(A or B 오탐):** 'or' 양옆에서 기능어를 건너뛴다. 같은 명사가 되풀이되면 꾸밈말을 견준다. 'Red apples or green apples?' · 'big dogs or small dogs' · 'cold juice or hot juice' 는 지나고, 'Is it a cat or a dog?'(아이 'A dog.')는 잡는다(`question-check.ts` questionEchoesChild (가)).
- **Minor 2(먼저 답함 셈):** 소리 줄(따라 할 말 · 답 소리 · 선택지)을 들려준 선생님 행 바로 뒤의 아이 말은 '먼저 답함'에서 뺀다(`lesson-flow.ts` childLinesOf skipAfterSound, 서버 · 도구 같이). 먼저 답한 번호는 talkChancesOf 의 covered 에 넣어, 남은 목록 · 다 다룸 · 제공 수가 같은 셈을 쓴다(`chances.ts` childAnswered — 흐름의 뒤 거름은 지움).
- **Minor 3('Huh?' 실패 줄의 '쉬운' 약속):** 실패 대신 줄 고르기를 core `failSituationLineOf` 하나로 모았다(서버 · 도구 · 짝 시험 흉내). 모름 꼴에서 온 받침 둘째 자리는 easy · easier 가 든 줄을 건너뛴다(`situationLineOf` avoid.words). 진짜 받침 둘째는 그대로다.
- **Minor 4(칸 설명):** `src/db/schema/operations.ts:138` 에 '읽었지만 앱이 고친 행은 비움 · 받은 1~3단계 빈 tori_en 막힘은 empty_tori_en_stuck' 을 더했다(그 줄만). 정본 8절 · 05절은 컨트롤러 몫이다.
- **Minor 5(지표의 고르기 단계):** 지표 재료에 단계 규격 choices(`MetricsKit.choicesLevel`)를 두었다. soundOutsideOf 는 그것을 받는다(없으면 1단계 — 옛 부름 길).
- **Minor 6(시험):** 위 셋의 대조군과 결과 글 질 단언(반응 남음 · 넘김 하나 · 문장 수)을 더했다.
- **Minor 7(무름 차례의 다시 쓰기 1회):** 결정 문구 쪽이라 컨트롤러가 결정 기록에서 정한다(코드 변경 없음).
- **M-5 지표 조정(`scripts/talk-metrics.ts`):** '고정 문장 차례'를 둘로 가른다.
  - (나) AI 가 쓴 문장이 모두 예문 · 고정 문장 그대로인 차례다. 앱이 넣은 상황 줄 문장은 뺀 AI 몫(TurnFacts.aiOwn)으로 세고, 합계 표의 기준 판정(1/10 이하)을 건다.
  - (가) 앱이 상황 줄로 바꾸거나 반응 자리에 둔 차례(TurnFacts.appSituation)다. 판정 없이 건수로 보인다.
  - 대본마다 표 칸은 '(나) · (가)건', 기준선 대비 표는 (나)다. 표 머리글의 '수치는 실측 · 검증 기준이고 선생님이 맞출 목표가 아니다(13절 C211 (2))'는 그대로 두고, 가름 풀이 한 줄을 그 뒤에 더했다.
  - 재료는 대본 도구 보고의 새 칸 `situationLines`(앱이 넣은 상황 줄 글)다. 칸이 없는 옛 보고(r1 · r2)는 표시 글('상황 줄로 바꿈("…" → "…")' · '반응 자리에 상황 줄("…")')에서 읽는다(situationLinesOfRecord).
  - 시험: `tests/unit/talk-metrics.test.ts` 새 절 둘((가) · (나) 가름 · 옛 보고 읽기)과 표 이름 · 머리글 단언.
- **붉음 확인:** 더한 고침 다섯(Minor 1 · 2 둘 · 3 · M-5)을 하나씩 끄면 모두 붉어진다(1~3 실패, `fix2b-mutations.txt`).
- **관문(`fix2b-*.txt`):** 단위 2260 통과 · 실패 0 / biome ci 0 / tsc 0 / build 0 / check:ids 0 · design-number 46 / seed:validate 0 / 4단계 골든 shasum 그대로 / observe 계획 모드 바퀴당 85호출. 커밋 · 실호출 없음.

## fix 3(마지막 3/3 — 설계 재판정 `task-des-r3-report.md` I-r3-1 · 코드 재검토 `task-rev-fix-r1-fix2-report.md` 새 Minor 3 · 앱 몫 Minor 셋)
이번 라운드는 앱 로직 · 시드 · 지표만 고쳤다(고정부 문구는 그대로).

| # | 고친 것 | 자리 |
|---|---|---|
| I-r3-1 | 상황 줄 고르기를 단계로 바꿨다(situationLineOf). (1) 어느 것에도 걸리지 않는 줄, (가) 문장은 앞에 나왔어도 통째로 쓴 적 없는 줄, (나) 이 턴 AI 맞장구가 남았으면(avoid.reacted — 문장 문 두 사본이 넘김) 꼬리가 앞에 나오지 않은 줄의 넘김 꼬리만, (다) 피할 낱말 없는 돌림 순서 첫 줄 · 돌림 차례 줄 차례다. 다 걸려도 이미 통째로 쓴 줄로 바로 돌아가지 않는다. 들리지 않음 · 받침 · 인사 끝 · 실패 대신 줄이 모두 같은 함수다 | `src/core/conversation/situation.ts` situationLineOf · 서버 `lesson-turn.ts` 와 도구 `talk-observe.ts` 문장 문 |
| 재검토 Minor 1 | 같은 턴 같은 뜻 지움(echoesTurnSentence)을 내용 낱말로 견준다(관사 · 대명사 · be 꼴 · 축약형 · 전치사 · 이음말 · 감탄은 뺌). 'It's okay!' 뒤 'Okay, it's hard!' 는 남는다 | `situation.ts` ECHO_FUNCTION_WORDS |
| 재검토 Minor 2 | 시드 들리지 않음 줄 'Sorry, I can't hear well. Let's go on.' → "Sorry, I can't hear! Let's go on."(맞장구 + 넘김). 시드 꼴 시험을 더했다: 여러 문장 상황 줄의 첫 문장은 맞장구다. 실패 대신 줄의 '쉬운' 줄 되돌아감은 (다)가 피할 낱말 없는 줄을 먼저 고르므로 함께 닫힌다 | `seed/lists/talk-situation-lines.json` |
| 재검토 Minor 3 | 맞장구 낱말 수는 core 상수 SHORT_REACTION_MAX_WORDS 하나다(지표도 이것을 씀). 고정부 글 'a short reaction of at most four words'(3 · 4단계)와 같은지 시험이 단언한다. 고정부 글은 4단계 골든이라 그대로 두었다 | 시험 |
| M-r3-7 | 시드 받침 첫째 줄 "It's okay! Let's try." → "It's okay! I am with you."(괜찮아! 내가 같이 있어.). 둘째 문장에 권유가 없음을 시험이 본다 | 시드 |
| M-r3-2 | 되묻기 검사의 건너뛰는 낱말에 now · today · here · there 를 더했다('Are you hungry now?' ← 'Yes I am hungry'). 질문 하나 남기기(keepLastHeldQuestion)는 되묻기를 먼저 빼고, 되묻기 아닌 질문 가운데 마지막을 남긴다(모두 되묻기면 마지막). 서버 · 도구가 같은 되묻기 함수(아이 말 · 노린 단어)를 넘긴다 | `question-check.ts` · `question-retry.ts` · 두 끝 처리 |
| M-r3-5 | 지표 (나)에서 AI 몫이 맞장구뿐이고 예문과 같은 차례를 빼고 '맞장구만 예문과 같은 차례' 건수로 보인다(N-1 (가) 결정과 맞춤). 범위 밖 낱말은 아이에게 나간 글 기준으로 세고, 원문(나가지 않은 글 포함) 수는 따로 보인다. 들리지 않음 표(판정 없는 보조 셈)는 그대로 예문과 같은 차례를 센다 | `scripts/talk-metrics.ts` |
| 허용 목록 | 시드 줄을 바꾼 뒤 3-(다) 절차로 다시 뽑았다. 새 낱말이 없어 43 그대로다(넓이 시험 · seed:validate 통과) | — |

- **하지 않은 것(장부로):** 프롬프트 문구 Minor M-r3-1 · 3 · 4 · 6(실호출 확인 필요), M-r3-8(C204 경계 결정 거리), M-r2-2 · M-r2-4.
- **시험(근거 차례의 글):**
  - `tests/unit/talk-fix-r1.test.ts` 'fix 3' 절(7): stuck-three L2 2~6 앞 행 글로 받침 첫째 줄이 5차례 줄을 다시 내지 않음(돌림 번호 여덟 모두) · (나) 꼬리만 · 맞장구 없는 턴 · 들리지 않음 목록 · 내용 낱말 같은 뜻 · 시드 꼴 · 상수 ↔ 고정부 글 · 받침 둘째 문장 권유 없음 · 되묻기 먼저 빼기와 now.
  - `tests/unit/talk-observe-parity.test.ts` 'fix 3' 절(2, 서버 ↔ 도구): 받침 첫째 네 번 모두 'That's okay!' 여도 네 말이 모두 다름 · 'What food do you like? Are you hungry now?' 는 앞 질문을 남김.
  - `tests/unit/talk-metrics.test.ts`: (나)에서 맞장구만 차례를 빼고 건수로, 넘김 예문 베끼기는 (나), 범위 밖 낱말 나간 글 · 원문 수, 표 글.
  - 붉음 확인: 고침 열을 하나씩 끄면 모두 붉어진다(1~2 실패, 스크래치패드 `fix3-mutations.txt`).
- **관문(`fix3-*.txt`):** 단위 2269 통과 · 실패 0 / biome ci 0 / tsc 0 / build 0 / check:ids(CI 인자) 0 · design-number 46 / seed:validate 0 / 4단계 골든 shasum 그대로 / observe 계획 모드 대본 13 · 바퀴당 85호출(그대로). 커밋 · 실호출 없음.
- **남은 우려:** (나) 꼬리만 붙이기는 '맞장구 + 넘김' 시드 꼴에 기댄다. 시드 꼴 시험이 그 꼴을 지킨다. 세 줄 목록이 통째로 다 쓰인 뒤(같은 자리 네 번째)에는 (다)로 같은 줄이 다시 나올 수 있다. 줄 수를 늘리는 것은 시드 몫이다.
