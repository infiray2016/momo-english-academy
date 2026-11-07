# 묶음 2(턴 끝 처리 · 실시간 검사) 코드 검토 보고 · rev-2

검토자: code-reviewer(Opus xhigh) · 2026-11-07 · 워크트리 `.claude/worktrees/p13d`(HEAD 6e86881 + 미커밋). 보고의 파일 목록으로 `git diff` 를 떴다(스크래치패드 `rev2-diff-lesson-turn.txt` · `rev2-diff-small.txt` · `rev2-diff-oldtests.txt`). 묶음 5 파일(talk-observe.ts · e2e · 짝 시험)은 보지 않았다. 시험은 다시 돌리지 않았고, 의심 하나를 스크래치패드 스크립트 `rev2-cue-probe.ts` 로 확인했다.

검토 중에 바뀐 파일이 있다. 구현 보고(07:23) 뒤에 `lesson-turn.ts` · `talk-situation.test.ts`(07:24, 넘긴 항목 greetingHintItemOf 열쇠와 짝 시험), `cue-line.ts` · `talk-cue-line.test.ts`(07:30, 설계 검토 des-3 M-2 '긴 꼴 돌림'), `seed/lists/talk-*.json` 셋(07:31)이 바뀌었다. 판정은 07:31 의 파일로 했다. 구현자가 07:31 에 보고 끝에 '넘겨받은 항목 반영' 절과 'des-3 M-2 반영' 절을 더했고, 이 판정은 두 절까지 포함한다(두 절이 적은 변경은 위 파일의 지금 내용과 같다).

## 판정: 수정 필요 (Critical 0 · Important 1 · Minor 4)

## 1. 설계 준수

| 항목 | 판정 | 근거 |
|---|---|---|
| 상황 차례 자리 다섯(situationPlaceOf) | ✅ | `situation.ts:33~45`. 1~3단계(lowBand)만 보고, 들리지 않음을 먼저 가르며, 막힘(단추 · 막힘 말)은 받침 단계로 together · easy · close, 말로 답한 인사 끝은 greeting_end 다. 흐름 계획에서 같은 자리가 나오는 시험이 있다(`talk-situation.test.ts:310~325`) |
| 검사 셋과 차례(금지 구 → 답 글 → 어휘, 범위 없으면 range) | ✅ | `situation.ts:122~156` 이 정본 02-2:208 · 06:221 의 (가)(나)(다)와 같다. 답 글은 받침 · 들리지 않음만 보고(136줄), 축약형을 펼치며(`question-check.ts` offbandWordsIn expand · `text.ts` expandContraction), 닫힌 품사 한 낱말은 통과한다(151~153줄) |
| 첫 걸림은 상황 줄, 뒤 걸림은 지움 | ✅ | `lesson-turn.ts:786~804`(situationUsed). 보내는 글은 바뀐 줄이고(2542줄 `send(flow.lastText())`), AI 원문은 entry.ai 에만 남아 text · rewrite 에 없다. 시험(`talk-situation.test.ts:482~512`)이 결과 전체에 원문 낱말이 없음을 본다 |
| 반응이 비면 상황 줄(신호 말 · 지어낸 경험 지움 뒤 포함) | ✅ | `lesson-turn.ts:1267~1286`. 끝 처리는 held 문장만 지우므로(1257~1266줄) 보낸 반응이 뒤에 사라지는 길이 없고, 상황 줄을 맨 앞에 두어도 화면 차례가 맞다 |
| 두 번 실패 · 거절이면 상황 줄, 인사 끝 뒤 카드 질문 없음 | ✅ | lessonOutcomeViewOf 첫 갈래. 상황 차례는 asksQuestion 이 거짓이라 카드 자리로 바뀌지 않는다(1217~1238줄) |
| 1~3단계 AI 신호 말은 늘 지움(까닭 cue) | ✅ | `lesson-turn.ts:771~777`. 옛 '잡아 둠 · 소리 줄 없으면 지움' 길은 1~3단계에서 빠졌다 |
| 앱 신호 말 흘림 줄의 자리 · 저장 안 함 · move 로 셈 · 다시 흘림 | ✅ | 흘림 차례는 뜻 → cue → 소리 줄(1517~1539줄)이고 다시 흘림도 같다(1586~1589줄). text · rewrite 밖이고 `log.ts:162` 가 기록에서 뺀다. 셈은 끝 처리의 teacherMovesOf(ctx.turns)와 다시 흘림의 state.turns(live 행 전부, 다시 흘릴 행이 마지막)가 같은 목록이다 |
| 지어낸 경험 지움(질문은 남음) · 끝인사 | ✅ | 문장 문은 물음표 아닌 문장만 본다(778~783줄). 정본 06:221 '질문은 남고'와 맞는 해석이다. 끝인사는 `closing.ts:594~606` 이 빈 글로 바꿔 farewellOf 의 카드 끝인사 길(`wrap-up.ts:86~100`)로 보낸다 |
| 들리지 않음 판단 칸 비움(AC-1 (가)) | ✅ | 2503 · 2554 · 2631줄. '모름' 입력에는 ifStuck 이 없어(2391~2400줄) 스트리밍 중 AI 막힘 값이 계획을 바꾸지 못한다. child_kind 는 흘림 뒤에 읽는 곳이 없다(src 에서 `server/ai/talk.ts:687` tellStuck 만) |
| 기술 오류 책임(C210 · C211 (4)) · 호출 수 불변 | ✅ / ⚠️ | 새 AI 호출은 없고, 더한 것은 vocab 기능어 읽기 하나다(2429줄). 마이크 안 잡힘 · 첫 말소리 없음 · 인식 오류 · 권한 · 읽어 주기 오류는 화면이 턴을 보내지 않는 길이라 이 diff 밖이다. AC-1 (다)는 diff 만으로 확인할 수 없다(e2e 몫) |
| 넘긴 항목(검토 1 5절) · 열쇠 · frameEn | ✅ | (1) feelingWords · lemmaOf 2455줄 (2) greetingFallback 1230~1233 · 1415줄 (3) 장면 여는 질문 뜻 questionKoIn 1553~1565줄 · 힌트 sceneHintItemOf 477줄(frameEn 선택 칸) (4) 인사 끝 물음표 지움 단위 `talk-situation.test.ts:717~741` · 통합 348~354 (5) 힌트 · 답 짝 시험 `talk-situation.test.ts:925~999`. greetingHintItemOf 열쇠는 cardQuestionKeyOf 로 바뀌었다(506줄) |
| core 순수 모듈 셋 · speech 불변 | ✅ | 셋 다 server · db 를 가져오지 않는다. `src/core/speech` 변경이 없다. 서버와 대본 도구가 같은 함수(cueLinesOfMoves · checkSituationSentence · madeUpHit)를 부를 수 있는 꼴이다 |
| 첫 신호 말 긴 꼴 돌림(des-3 M-2, 보고 끝 절) | ✅ | `cue-line.ts:117~139 · 156`. 첫 신호 말은 여전히 긴 꼴이고 뒤는 짧은 꼴이라 정본 02-2:212 와 맞다. 순번은 move 차례의 자리에서 나와 저장 없이 다시 흘림이 같은 줄을 낸다. 시험 `talk-cue-line.test.ts:349~396` 이 둘째 긴 꼴에 닿는 길을 본다. 통합 시험 기대는 따라가지 못했다(I-1) |
| 설정값 · 용어 | ✅ | 새 수 글자는 목록 열쇠('1' · '2-3')와 셈의 0 · 1 뿐이다. '트랙' · '유닛'이 없다 |

## 2. 잘한 점
- 상황 줄로 바꾼 문장을 보낼 때 문장 문이 고른 글(lastText)을 보내게 해, 걸린 AI 원문이 화면 · 읽어 주기에 새는 길을 막았다. 시험이 흘림 결과 전체에 원문 낱말이 없음을 본다.
- 신호 말을 저장하지 않고 move 로 다시 고르게 해, 같은 시도 id 다시 흘림과 대본 도구가 같은 줄을 내게 했다. 단위와 통합이 모두 다시 흘림 동일성을 단언한다.
- 시드 신호 말 줄은 문장 전체가 같을 때만 지우게 해 'We play together!' 같은 반응을 지키고, 그 거짓 양성 예를 시험에 묶었다.
- 들리지 않음 판단 칸 비움을 응답 직후와 재질문 뒤 두 자리에 걸었고, '모름' 입력에 ifStuck 이 없음을 이용해 계획이 흔들리지 않게 했다.
- 기능어 읽기는 받침 · 들리지 않음 계획에서만 범위 읽기와 나란히 시작하고, 실패하면 더 걸리는 쪽으로 닫았다.
- 구현을 끈 사본으로 붉음을 따로 확인해(41 가운데 10 실패) 새 시험이 동작을 가른다는 근거를 남겼다.

## 3. 지적

### Important

**I-1. 통합 시험의 신호 말 기대가 지금 cue-line.ts 와 달라 CI 첫 실행에서 실패한다.**
- 어디: `tests/integration/talk-ai-scope.test.ts:300`(`seedTalkCueLines().together["1"].long[0]`)과 `src/core/conversation/cue-line.ts:126 · 134 · 156`(07:30 변경: 긴 꼴을 그 행이 대화의 몇 번째 선생님 행인지(turn)로 돌린다).
- 왜: 그 시험의 세션에는 선생님 행이 셋(인사 첫 질문 · 인사 반응 · 필수 첫 질문) 있어 받침 첫째 행의 turn 이 3 이다. 시드 together '1' 의 긴 꼴이 지금 둘이므로 첫 신호 말은 long[1] 이 된다. 스크래치패드 `rev2-cue-probe.ts` 에 같은 move 목록을 넣으니 "Let's say it together!" 가 나왔고, 시험 기대 long[0] 은 "Say it with me!" 다. 통합 시험은 한 번도 돌지 않아(보고 우려 1) 이 어긋남이 드러나지 않았다. 07:30 변경(보고 끝 'des-3 M-2 반영' 절)은 통합 시험 파일(07:20)보다 뒤라서, 그 시험이 고침을 따라가지 못했다. 그 절의 관문(단위 2173 통과)은 통합 시험을 돌리지 않으므로 이 어긋남을 볼 수 없다.
- 어떻게: 기대 줄을 목록 번호로 박지 말고 같은 함수로 꺼낸다. 저장된 선생님 행의 move 차례로 `cueLinesOfMoves({ moves, band: "1", file: seedTalkCueLines() }).at(-1)` 을 기대로 쓰고, 첫 신호 말이 긴 꼴 목록 안에 드는지를 따로 단언한다. 다시 흘림 동일성 단언(326~328줄)은 그대로 둔다. 보고 끝 절이 적은 대로 des-3 M-2 와 합친 fix 1 에서 함께 고친다.

### Minor

**M-1. 상황 줄이 같은 턴에 보낸 반응, 같은 대화의 앞 상황 줄과 겹칠 수 있다.**
- 어디: `lesson-turn.ts:792~804` · `situation.ts:161~170`(턴 번호로만 돌림). 지금 시드 상황 줄은 'That's okay! …' · 'Okay! …' · 'No problem! …' 으로 시작한다(`seed/lists/talk-situation-lines.json`).
- 왜: AI 첫 문장 'That's okay!' 가 지나고 둘째 문장이 걸리면, 화면 · 읽어 주기가 "That's okay! That's okay! You can do it!" 꼴이 된다. 목록 길이가 3 이면 턴 번호 차가 3 인 두 상황 차례가 같은 줄을 쓴다(spec 설계 8 '상황 반응 되풀이 0'). spec 설계 1 의 '턴 번호로 돌림'은 지켰지만 '실제 선생님' 목표에는 어긋나는 꼴이다.
- 어떻게: 돌림 차례는 그대로 두고, 이 턴에 이미 보낸 문장과 첫 문장이 같은 줄과 이 대화의 선생님 행 text 에 이미 나온 줄은 건너뛰어 다음 줄을 쓴다(cueLineOf 의 '바로 앞과 같으면 건너뜀'과 같은 꼴). 묶음 5 대본에서 같은 턴 겹침 수를 함께 센다.

**M-2. AI 가 쓴 신호 말 가운데 시드 줄과 문장 전체가 같지 않은 꼴은 지워지지 않는다.**
- 어디: `cue-line.ts:61~72`.
- 왜: 정본 06:221 은 '시드 신호 말 목록과 같은 꼴의 신호 구로 잡아 지운다'고 적었다. 지금은 신호 구 여섯과 시드 줄의 문장 전체 같음만 본다. 'Now it's your turn!' · 'Your turn, Mina!' · 'Pick one, okay?' 같은 꼴은 남아 앱 신호 말과 함께 신호 말 둘이 들린다(spec 설계 8 '신호 말 겹침 0'). 고정부가 신호 말을 쓰지 말라고 하므로 드물다.
- 어떻게: 낱말 둘 이상인 시드 꼴(예 'your turn' · 'pick one' · 'you try')은 정규화 글의 문장 시작이나 끝에서 낱말 경계로 보는 갈래를 더하고, 낱말 하나 꼴('Together!')은 지금처럼 문장 전체만 본다. 거짓 양성 예('Is it your turn to play?' · 'We play together!') 시험은 그대로 둔다.

**M-3. 아무것도 가르지 않는 단언 둘.**
- `tests/unit/talk-situation.test.ts:1001~1009`: 제목은 '실패 대신 줄 · 반응 자리 상황 줄이 생기지 않는다'인데, situationPlaceOf 가 null 인지와 시험 견본 상수 `SPEC4.band` 만 본다. 뒤 단언은 상수를 되읽을 뿐이다. 4단계 실패 · 반응 자리 길은 659~715 · 743~772 가 이미 보므로, 제목을 줄이거나 4단계 계획으로 play 를 돌려 release · kept 에 상황 줄이 없음을 단언한다.
- `tests/unit/talk-situation.test.ts:987`: `not.toBe("I am fine.")` 는 답 예시가 무엇이든 지난다. 검토 1 I-1 을 가르려면 AI 답 예시 "Yes, I do." 와 같음을 단언한다.

**M-4. 끝인사 지어낸 경험 길은 배선이 시험되지 않았다.**
- 어디: `closing.ts:594~606`. 시험은 farewellMadeUp 함수 하나(`talk-made-up.test.ts:195~209`)만 본다.
- 왜: `any.kind === "new"` · `deps.talkLists` 기본값 · 빈 글에서 farewellOf 카드 끝인사로 이어지는 길이 시험 밖이다(보고 남은 우려 다섯째가 밝혔다). 지금 구현은 짧고 맞게 읽힌다.
- 어떻게: 통합 `talk-lesson-closing` 에 가짜 끝맺음 응답 'Yesterday I …' 하나를 두고, 끝 줄의 끝인사가 카드 끝인사인지 보는 시험 하나를 더한다(CI 몫).

## 4. 보고 우려의 타당성
1. 통합 미실행: 타당하다. 실제로 I-1 하나가 걸린다. 나머지 여덟은 기존 통합 시험(`talk-lesson-turn.test.ts:126~170 · 293~310`)과 같은 행 넣기 · 가짜 규칙 관례를 따른다(맞는 규칙이 없으면 501 이고 재시도하지 않아 요청이 2 다).
2. 묶음 5 잇기: 타당하다. 07:30 변경 뒤에는 신호 말이 선생님 행 순번에도 기대므로, 도구 사본의 move 목록이 서버 state.turns 와 같은 행(인사 첫 질문 · 장면 여는 질문 같은 앱 행 포함)을 같은 차례로 들어야 같은 줄이 나온다.
3. e2e 신호 말: 타당하다. 화면은 cue 줄을 add 로 받아 글로 보이고 card 로 읽는다(`src/lib/talk-stream.ts:196~198` · `tori.tsx:358 · 410`). 말풍선 글 줄 수나 읽기 차례 수를 세는 e2e 단언은 줄이 하나 늘어 걸릴 수 있다.
4. 기능어 DB 읽기: 타당하다. 받침 · 들리지 않음 계획에서만 범위 읽기와 나란히 시작하고 AI 호출 앞에서 기다린다(2427~2430 · 2498줄). 첫 문장 지연 지표에서 함께 본다.

## 5. 묶음 5 로 넘길 것
- 대본 도구 사본: 문장 문에 isSoundCue(둘째 인자 시드 줄) · madeUpHit · checkSituationSentence(LessonLiveChecks 꼴)를, 끝 처리 사본에 반응 자리 상황 줄 · situationKoOf · cueLineForTurn · greetingFallback 길을 잇는다. 신호 말 move 목록은 서버와 같은 선생님 행 전부여야 한다(4절 2).
- 짝 시험: 같은 입력에서 서버와 도구의 '상황 줄로 바뀐 문장 · 신호 말 줄 · 반응 자리 상황 줄'이 같은지 본다.
- e2e: `talk-lesson.spec.ts` · `required-utterance.spec.ts` 의 가짜 응답 'Listen and say!' · "Let's say it together." 는 이제 지워지고 cue 줄이 하나 흐른다. 줄 수 · 읽기 차례 단언을 확인한다.
- 대본 지표: 상황 줄로 바뀐 문장 수(위험 8) · 같은 턴 상황 줄 겹침(M-1) · 신호 말 겹침(M-2)을 센다.

## 6. 범위 밖 관찰
- 6.4 일반 검사(금지어 · 메타 문장)에 걸린 문장은 스트리밍 단계에서 카드 안전한 대사('That's fun! Let's keep talking.' 꼴)로 바뀌어 문장 문에 들어온다(`src/server/ai/talk.ts:455~469`). 상황 차례에서 그 대사가 어휘 검사를 지나면 들리지 않음 · 받침 차례에 'That's fun!' 이 남는다. spec 설계 1 은 상황 차례의 세 검사만 상황 줄로 바꾸게 적었고 이 자리는 정하지 않았다. 상황 차례에서 그 대사 대신 상황 줄을 쓸지는 spec 쪽에서 정할 거리다.
- LessonSentence 까닭 "together" 는 이제 1~3단계에서 생기지 않는다. 대본 도구 · 지표가 이 까닭을 세고 있다면 cue 로 바꿔 센다.
