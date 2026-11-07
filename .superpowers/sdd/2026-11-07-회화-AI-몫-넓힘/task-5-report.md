# 묶음 5 구현 보고 — 잇기 · e2e(대본 도구 사본 ↔ 서버 짝 시험 · 넓이 시험 · e2e 표본)

상태: DONE_WITH_CONCERNS(완료 조건 일곱 모두 통과 · e2e 는 CI 몫이라 **안 돌림** · 범위 밖 e2e 세 파일이 CI 에서 깨질 수 있음, 아래 '요청하는 변경').
구현자: Opus high · 2026-11-07 · 워크트리 `.claude/worktrees/p13d` · 커밋 없음 · 실호출(`--yes`) 안 함. 묶음 2 fix 1 · 2(07:5x)를 받은 뒤의 코드에 맞췄다.

## 바뀐 파일(워크트리 줄)

| 파일 | 줄 | 무엇을 |
|---|---|---|
| `scripts/talk-observe.ts` | 476~530 | 시드 목록 넷 읽기(talkListsOf · ObserveTalkLists, 없으면 서버 seedListOrEmpty 와 같은 빈 꼴) · SeedFiles 선택 칸 넷 · readSeedFiles 가 seed/lists 넷을 읽음 |
| 같은 파일 | 640~670 | Materials 에 talkLists · functionWords(모든 단계 기능어) · allowedLemmaOf(core allowedLemmaOfVocab — 서버 readAllowedLemmaOf 와 같은 사전) |
| 같은 파일 | 989 | isSoundCue 를 core cue-line 으로(옛 CUE_PHRASES 사본 지움, talk-metrics 가 그대로 씀) |
| 같은 파일 | 1139~1300 | greetingFallbackSlotOf 사본 · Entry(서버 LessonSentence 꼴: cue · made_up · situation · ai · ko) · ObserveLiveChecks · ObserveSituationChecks(allowedLemmaOf · spoken) · ObserveSettleLive · slotQuestionTextOf · teacherTextsOf · observeLiveOf(서버 배선과 같은 재료) · situationContextOf |
| 같은 파일 | 1302~1400 | sentenceEntriesOf = 서버 createLessonSentenceFlow accept 사본(liveDrop: 신호 말 늘 지움 · 지어낸 경험 · 상황 검사 첫 걸림은 상황 줄(되풀이 피하기 sentences · texts) · 뒤 걸림 지움) |
| 같은 파일 | 1432~1470 | observeFailLineOf = 서버 lessonOutcomeViewOf 의 거절 · 실패 길(1~3 상황 차례는 상황 줄 · 거절은 안전한 대사 · 그 밖 1~3 은 칭찬 대사) |
| 같은 파일 | 1470~1555 | situationKoOf · keptHasWord · teacherMovesOf 사본 · Settled 에 situation · aiQuestion · cue |
| 같은 파일 | 1556~1895 | settleTurn = 서버 settleLessonTurn 사본(실패 한 줄 failLine · 둘째 인사 대신 줄 · 반응 자리 상황 줄(되풀이 피하기) · 상황 줄 뜻 · 신호 말 cueLineForTurn · AI 질문 힌트) |
| 같은 파일 | 1896~1960 | observeHintTiersOf = 서버 lessonHintsAt 사본(카드 항목 → 장면 여는 질문 → 인사 질문 → AI 힌트) · askKindOf 사본 |
| 같은 파일 | 2383~2400 · 2532~2560 · 2793~2830 · 2942 | 배선: liveFor · blankIfNotHeard(들리지 않음 판단 칸 비움 — 첫 응답 · 재질문 이은 응답) · 힌트 단(openedTierCount) · talkCallTurnOf 에 feelingWords · lemmaOf · 실패 한 줄 · 보고 attach 맨 앞에 신호 말 · record.cue · 상황 줄 표시 칸. PreparedTurn 에 flowArgs · slot · hintTiers(832) |
| `tests/unit/talk-observe-parity.test.ts` | 신규 969줄 · 24 시험 | 짝 시험(아래) |
| `tests/unit/talk-allowed-coverage.test.ts` | 신규 225줄 · 8 시험 | 넓이 시험(아래) |
| `tests/e2e/talk.ts` | 529~540(덩이 끝에만 더함) | withoutSceneOpener |
| `tests/e2e/talk-lesson.spec.ts` | 95 · 101~108 · 125 · 219 · 240 · 262~276 · 700~760 · 816~826 · 967~973 · 1140~1300 | 옛 시험은 장면 여는 질문 칸을 뺀 견본(plan 정한 것 3 의 개정 4 길) · 대화 첫 질문 기대 firstQuestionOf · 인사 끝 반응 글을 시험 어휘 안으로 · 선택지 시험 둘을 받침 둘째 길(untilEasyChoices)로 · 새 덩이 시험 둘 |
| `tests/e2e/required-utterance.spec.ts` | 62 · 165~176 · 343~358 · 386~393 | 장면 여는 질문 칸을 뺀 견본 · 1단계 선택지를 '아직 묻지 않은 새 단어를 처음 묻는 AI 질문'으로(next_targets) · AI 신호 말 글 뺌 |

다른 파일은 고치지 않았다(`tests/unit/talk-observe.test.ts` · `talk-metrics` 도 깨진 줄이 없었다).

## 설계와 다르게 한 것 · 정한 것

1. **4단계 실패는 흉내 못 냄(앞부터 그렇다).** 서버는 4단계 두 번 실패면 'Oops' 쉼(선생님 행 없음)이다. 도구는 대화를 잇기 위해 안전한 대사 한 줄을 둔다. 1~3단계 실패 · 거절은 서버와 같게 바꿨다(짝 시험).
2. **힌트 단은 서버 셈으로.** 대본 칸 hint 가 있으면 그대로 쓰고, 없으면 서버 lessonChildRowOf 처럼 그 자리 힌트 단과 열린 단 수(둘째 '모름'부터 다 엶)로 센다. 옛 도구는 '다 엶이면 영어'로 어림했다. 그래서 AI 힌트가 없는 AI 질문 자리에서 hintKind 가 english 대신 none 이 될 수 있다(서버와 같은 쪽).
3. **허용 낱말 원형 사전 · 기능어는 늘 넘긴다.** 서버는 상황 차례 계획일 때만 읽지만 그 둘은 상황 차례 검사만 쓰므로 판정이 같다. 짝 시험은 함수 칸을 빼고 재료를 견주고, 사전은 표기형 열 개(words · going · went · keeping · kept · helps · tried · swords · news · Words)의 원형으로 따로 견준다.
4. **보고 꼴.** record.attach 맨 앞에 신호 말을 둔다(talk-metrics 의 '신호 말 겹침' · 선생님 낱말 셈이 attach 를 읽음 — 4-나 시험 꼴 그대로). record.cue 는 선택 칸이라 옛 보고도 읽힌다. 상황 줄로 바뀐 문장은 표시 칸에 '상황 줄로 바꿈("AI 원문" → "상황 줄")'로 적는다.
5. **e2e 의 옛 시험은 장면 여는 질문 칸을 뺀 견본으로 돌렸다.** 견본 빌더(talkCard)가 1~3단계 카드에 칸을 두어(0-나 · 3) 대화 첫 질문이 바뀐다. 카드 필수 질문 자리의 힌트 · 받침 · 이어 하기 같은 옛 시험의 뜻을 지키려고 그 단언들을 고치지 않고 정한 것 3 의 길(칸 없는 카드)로 돌렸다(위험 6 '최소로'). 장면 여는 질문 길은 새 시험 둘이 본다.
6. **'요청자 번호(1번 · 1번)'는 e2e 에 닿지 않는다.** e2e 는 시험 DB 의 견본 카드('This is it. Do we like it?')를 쓰고 시드 카드를 적재하지 않는다. 시드 카드의 1번 문장은 짝 시험 · 도구 시험이 카드 값으로 읽는다(글을 박지 않음).

## 덮는 시험

- **짝 시험 `talk-observe-parity`(24 — went · news 시험을 더한 뒤 25, 끝 절)**: 재료가 같다(목록 넷 = seedLessonTalkLists · 빈 꼴 · 질문 글 · 4단계 null) / 상황 차례(인사 끝 첫 걸림 상황 줄 · 뒤 걸림 지움, 받침 첫째 'That's okay!' 남음 · AI 신호 말 지움 · 앱 신호 말, 답 글 'You eat it!', 들리지 않음 들은 척 칭찬 · 판단 칸 비움, 이 턴 문장 · 앞 선생님 행 글 되풀이 피하기 둘, 반응 다 지워진 차례) / 신호 말 차례 셋 / 지어낸 경험 · AI 질문 범위 밖 / 둘째 인사 대신 줄 / 실패 대신 줄 셋 / 힌트 단(인사 · 장면 · 둘째 '모름' · AI 힌트) · 장면 쉬운 질문 뜻 · 대화 첫 질문 행 뜻 / 4단계 불변 / 직접 끝 처리. 한 차례마다 문장 문 결과(지운 까닭 · 상황 줄 원문 · 뜻) · 선생님 행 text · rewrite · move · 화면 글 · 뜻 · 신호 말 · 붙일 줄 · 소리 줄 · 카드 자리 까닭 · 응답 값을 서버와 견준다.
- **붉음 확인**: 도구 사본을 열두 가지로 잠시 바꿔 모두 붉어짐을 봤다(지어낸 경험 · 신호 말 · 둘째 인사 · 장면 힌트 · 실패 상황 줄 · 판단 칸 비움 · 둘째 걸림 · 되풀이 피하기 넷 · 사전). 셋은 처음에 못 잡아 시험을 더했다. 기록 `ai-scope-5-mutations.txt`.
- **넓이 시험 `talk-allowed-coverage`(8)**: 출처 다섯(신호 말 30 · 상황 줄 17 · 고정부 1~3 예 18 · 짧은 반응 예 3 · 정본 · spec 예 4)이 1단계 범위 + 허용 목록 + 사전으로 모두 지남 · 사전 없는 길(꼬리 떼기)로도 지남 · 허용 목록이 없으면 걸림 · 허용 낱말은 모두 예 문장에서 걸린 낱말(손으로 더한 것 없음) · 'That's okay!' 받침 · 들리지 않음 넷 · 3단계 답 글('Rice and fish, yum!' 남음 · 'You eat it!' 걸림) · 상황 줄 3단계.
- **e2e(안 돌림, CI 몫)**: 새 시험 둘 — 'AC-5 (나) · AC-N1 · AC-1 (다)'(짧은 준비 뒤 장면 여는 질문 AI 없이 보이고 읽힘 · 마이크 안 잡힘 요청 0 · 답 뒤 사용자 메시지 'App question just before' · 그 질문 · 'Follow up on the child's answer: yes' · 요청은 아이 차례마다 하나), 'AC-5 (나) · AC-6 (가) · AC-1 (나)'(막힘 첫째: 상황 줄 반응 · 앱 긴 꼴 신호 말이 답 소리 앞에 읽힘 · AI 신호 말 없음 / 둘째: 그 칸 쉬운 질문과 뜻 · 신호 말은 기록 칸에 없음 · 요청 수).

### 넓이 시험이 잡은 낱말(허용 목록 없이, 축약형 펼친 뒤 — `ai-scope-5-coverage-hits.txt`)

| 출처 | 1단계 범위 | 3단계 범위 |
|---|---|---|
| 신호 말 | choose let listen now pick say then together turn with | choose then together |
| 상황 줄 | answer can easy go going hear help here hmm keep let new now oops problem sorry sound start then try we well | easy hear hmm keep oops problem sound start then try well |
| 고정부 1~3 예 | answer ask can easy go good great hear help here hmm learn let new now oops problem some sorry sound talk then time try way we well will words yay | easy hear hmm oops problem some sound then time try well will words yay |
| 짧은 반응 예 | good hear too yum | hear too yum |
| 정본 · spec 예 | go let listen oops say turn with | oops |

허용 목록 41 + 사전을 더하면 남는 낱말이 없다. 처음 돌렸을 때는 words · going 이 남아 컨트롤러에 알렸고(07:3x), 묶음 2 fix 1 이 사전(결정 (나))과 꼬리 떼기로 고쳤다.

## 실행 명령과 결과(전문은 스크래치패드 `/private/tmp/claude-501/-Users-hikaru-workspace-momo-english-academy/e161c2b7-4c0e-4695-a4a6-2632b2ed070e/scratchpad/ai-scope-5-*.txt`)

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit`(단위 전체) | 166 파일 · 2210 통과 · 6 todo · 실패 0(`ai-scope-5-unit-final.txt`). 시작 때 164 파일 · 2172 |
| 짝 · 넓이 · 도구 · 지표 시험 | 4 파일 · 짝 24 · 넓이 8 · talk-observe 56 · talk-metrics 29 통과 |
| `pnpm biome ci .` | 종료 0(633 파일) |
| `npx tsc --noEmit` | 종료 0 |
| `pnpm talk:observe --level 3`(--yes 없이) | 종료 0 · 대본 12 · 예상 호출 77(기준선 (가)의 77 과 같음) · 약 1.55달러(`ai-scope-5-observe-plan.txt`) |
| `pnpm build` | 종료 0(`ai-scope-5-build.txt`) |
| `pnpm check:ids`(ci.yml 인자) | 종료 0 · fail-on 규칙 모두 0 · design-number 46 ≤ 49 |
| `pnpm seed:validate` | 종료 0 · 칸 797 · 실패 0 · 규격 파일 오류 0 · 경고 17(앞부터) |
| e2e 세 파일 | **안 돌림**(CI 몫) |

## 요청하는 변경(공용 파일 · 다른 묶음)

1. **[e2e · 컨트롤러 판단] 범위 밖 e2e 세 파일도 CI 에서 깨질 수 있다.** `tests/e2e/required-recovery.spec.ts:269 · 581`, `tests/e2e/teacher-window.spec.ts:275 · 395`, `tests/e2e/speech-feedback.spec.ts:123 · 161` 이 견본 빌더 카드(이제 1~3단계에 장면 여는 질문 칸이 있음)를 쓰고 대화 첫 질문을 `card.required[0]` 로 본다. 같은 한 줄 꼴(`withoutSceneOpener(...)`, talk.ts 에 둠)로 고칠 수 있다. 브리프 밖 파일이라 손대지 않았다.
2. **[e2e 사실] 시험 어휘에 okay 가 없다.** e2e 서버는 'That's okay!' 꼴 가짜 반응을 상황 차례에서 상황 줄로 바꾼다(실제 시드 어휘에서는 남는다). 새 e2e 시험은 이것을 전제로 '그 자리 상황 줄 하나'를 본다. 옛 시험 가운데 그 글을 단언하는 줄은 없었다.
3. **[묶음 2 넘김 확인]** 까닭 'together' 는 Entry 꼴에 남겨 두었다(옛 보고 읽기). 새로 생기지 않는다.

앱 규칙(core · server)에서 새로 고칠 일은 찾지 못했다. 넓이 시험이 잡은 활용형 건은 묶음 2 fix 1 이 닫았다.

## 남은 우려

- **e2e 는 한 번도 돌지 않았다.** 특히 선택지 시험 셋은 묶음 1 의 C205 변경(이어 묻는 고르기 답은 질문만)으로 길을 바꿨다. 3단계 둘은 받침 둘째 AI 차례(노리는 단어 하나를 담은 선택지 · 막힌 질문과 다른 쉬운 질문), 1단계 하나는 아직 묻지 않은 새 단어를 노린 AI 질문(next_targets · 아이 말을 되묻지 않는 선택지)이다. 코드(keptChoicesOf · checkChoices · stuckPlan)를 읽고 맞췄지만 CI 첫 실행에서 정규화의 다른 거름에 걸릴 수 있다.
- **e2e 신호 말 기대는 긴 꼴 목록 가운데 하나로 둔다.** 묶음 2 fix 1 이 첫 긴 꼴을 선생님 행 차례로 돌리게 바꿔 어느 줄인지 고정하지 않았다.
- **도구의 사본은 여전히 사본이다.** 서버 settleLessonTurn · createLessonSentenceFlow 를 고치면 짝 시험이 잡지만, 짝 시험이 덮지 않는 길(끊김 cut · 4단계 실패 쉼 · 범위를 못 읽은 턴)은 도구가 흉내 내지 않는다.

## 묶음 2 에서 넘어온 열린 항목 닫기(컨트롤러 알림 셋 뒤, 2026-11-07)

- **(1) 같은 사전 잇기 — 닫힘.** 대본 도구는 `materialsOf` 에서 core `allowedLemmaOfVocab(seed/vocab.json 모든 행, 허용 낱말)` 로 사전을 만들어 상황 차례 검사에 넘긴다(talk-observe.ts 663 · observeLiveOf · situationContextOf). 넓이 시험도 같은 사전(`materials.allowedLemmaOf`)으로 잰다. 사전 없는 길(꼬리 떼기)도 지나는지는 따로 한 시험이 본다. 넓이 시험은 건너뛰지 않았고, 묶음 2 fix 1 뒤 초록이다.
- **(2) 'went' · 'news' 가르기 — 닫힘.** 짝 시험에 시험 하나를 더했다. 1단계 범위(go · word 가 범위 밖)에서 받침 첫째 반응 'It went well. The news is good.' 을 서버와 도구에 함께 넣는다. 두 쪽 모두 'went' 는 사전으로 지나고 'news' 는 걸려 상황 줄로 바뀐다. 같은 재료로 사전 없이 검사하면 거꾸로('went' 걸림 · 'news' 통과)라 두 길이 실제로 가른다. 붉음 확인: 도구의 상황 검사에 사전을 넘기지 않게 바꾸면 이 시험이 실패한다(`ai-scope-5-mutations.txt` 13).
- **관문(`ai-scope-5-*-final2.txt`)**: 단위 전체 166 파일 · 2211 통과 · 실패 0(짝 25 · 넓이 8) · `pnpm biome ci .` 0 · `npx tsc --noEmit` 0.

## 추가 — 범위 밖 e2e 세 파일 한 줄 고침(컨트롤러 지시, 2026-11-07)

견본 빌더 카드에 장면 여는 질문 칸이 생겨 대화 첫 질문이 바뀌는 것을 막으려고, 카드를 DB 에 넣는 자리 한 곳만 `withoutSceneOpener(...)` 로 감쌌다(plan 정한 것 3 의 칸 없는 카드 길 · 정한 것 10 그 줄만 Edit). 가져오기 줄도 하나씩 더했다.

| 파일 | 줄 | 고친 것 |
|---|---|---|
| `tests/e2e/required-recovery.spec.ts` | 70 · 270 | 가져오기 · `lesson: withoutSceneOpener(greetingTalkLesson(level))` |
| `tests/e2e/teacher-window.spec.ts` | 54 · 276 | 가져오기 · `lesson: withoutSceneOpener(lesson ?? greetingTalkLesson(1))`(넘겨받은 talkLessonCard(1) 견본도 덮음) |
| `tests/e2e/speech-feedback.spec.ts` | 50 · 161~163 | 가져오기 · `withoutSceneOpener(lesson ?? (greetingOnly ? greetingTalkLesson(1) : talkLessonCard(1)))` |

대본에서 카드 값을 읽는 견본(teacher-window 684 · 865 의 probe)은 인사 턴 수 · 정리 대사만 읽어 칸과 관계없어 그대로 두었다. 결과: `pnpm biome ci .` 0 · `npx tsc --noEmit` 0 · 단위 전체 166 파일 · 2211 통과. e2e 는 **안 돌림**(CI 몫).

## fix 1(검토 rev-5 — I-1 Important · M-1~M-3 Minor · CI 위험 줄 여덟 · 범위 밖 관찰, 2026-11-07)

상태: DONE. 커밋 없음. e2e · 통합은 **안 돌림**(CI 몫).

| 지적 | 판정 | 고친 곳 |
|---|---|---|
| I-1 e2e 'App question just before' · 'Follow up' 단언이 시스템 프롬프트로 늘 지남 | 고침 | `tests/e2e/talk-lesson.spec.ts:1234~1240`: 사용자 메시지 줄 꼴 `App question just before (not in the turns above): ${scene}` 과 `\nFollow up on the child's answer: yes`(본문 JSON 의 줄바꿈 두 글자, TURN_MARK 꼴)로 좁혔다. 가르는지 확인: 같은 도구 요청 본문에서 옛 글은 인사 차례(장면 답 전)에도 참(고정부 규칙), 새 두 꼴은 장면 답 뒤에만 참이다(`ai-scope-5-fix1-followprobe.txt`) |
| (범위 밖 관찰) 통합 `talk-ai-scope.test.ts:468` 같은 꼴 | 고침(그 줄만, 정한 것 10) | `tests/integration/talk-ai-scope.test.ts:466~472`: 같은 두 줄 꼴로 바꿨다(장면 질문 단언은 앱 질문 줄 꼴로 합침). 묶음 2 파일이고 닫힌 묶음이라 보고에만 적는다 |
| M-1 신호 말 시험 이름과 단언이 어긋남 | 고침 | parity '같은 자리 둘째 신호 말은 짧은 꼴, 받침 둘째(소리 줄 없음) · 셋째 · 들리지 않음에는 없다': 첫째는 긴 꼴 목록 안, 둘째 · 셋째 null, 닫기 뒤 다음 카드 자리의 받침 첫째(stage 1 확인)는 짧은 꼴 목록 안, 들리지 않음 차례는 null. 늘 참인 단언은 지웠다 |
| M-2 열린 힌트 단 수를 서버와 견주지 않음 | 고침 | parity sameHints: 대본 칸 hint 가 없을 때 서버 `lessonChildRowOf`(같은 상태 · 빈 heard · 가리개 없음)의 hintLevel · hintKind · heardHelp 를 도구 값과 견준다. 붉음 확인: 도구의 열린 단 수를 0 으로 바꾸면 1 실패(`ai-scope-5-mutations.txt` 14) |
| M-3 server-only 순수 도우미 사본이 늚 | 안 고침 | 근거: lesson-turn.ts 가 server-only 라 도구가 부를 수 없고 core · server 는 이 묶음이 고칠 수 없다(검토자도 '이번 선택은 맞다'). 사본 열 개(greetingFallbackSlotOf · slotQuestionTextOf · teacherTextsOf · situationContextOf · cueLineView · observeFailLineOf · situationKoOf · keptHasWord · teacherMovesOf · 장면 · 인사 힌트 항목)를 core 로 옮기는 일은 컨트롤러가 장부 열린 항목으로 두기를 요청한다(T-163 (3) 과 합칠 수 있음) |
| 보고 숫자(짝 시험 24 · 25) | 고침 | '덮는 시험' 절에 25 를 함께 적었다 |

### CI 위험 e2e 줄 여덟 — 하나씩

e2e 를 돌릴 수 없어, 대본 도구 sim(짝 시험으로 서버 끝 처리와 같음)에 **e2e 와 같은 재료**(시험 DB 견본 카드 talkCard · smallReferenceSet 어휘 · 단계 · 단원 규격 · 설정과 실제 `seed/lists`)를 넣어 그 길을 따라가 봤다(스크립트 `scratchpad/ai-scope-5/e2esim.ts`, 출력 `ai-scope-5-fix1-e2esim.txt`). 화면 · 읽어 주기 몫은 코드로 읽었다.

| 줄 | 판정 | 근거 |
|---|---|---|
| 1 untilEasyChoices(841 · 985) | 확인 · 고칠 것 없음 | sim: 받침 첫째 'It's okay!' → 상황 줄 'Okay! We can do this.' · 답 소리 'I like it.' · 신호 말, 받침 둘째 AI 차례 `ai · 질문 · 받침 2` 에서 선택지 ['I like pababa.','I like pebaba.'] 가 남고 고르기 신호 말이 붙는다 |
| 2 iPad 말하기 단추 시험(985~1003) | 확인 · 고칠 것 없음 | 위 받침 둘째 응답에 힌트 칸을 넣은 같은 sim 차례에서 선택지가 남는다. 힌트 단은 그 행 aiQuestion 으로 읽히고(짝 시험 'AI 질문 자리 힌트'), 이미 다 열렸으면 while 이 받는다 |
| 3 required-utterance 1단계 선택지(384~395 · 414) | 확인 · 고칠 것 없음 | sim: 1단계 첫 필수 질문 답 뒤 AI 차례에서 선택지 ['I like bebaba.','I like it.'] 가 남고 고르기 신호 말이 붙는다 |
| 4 장면 여는 질문 읽음(1205~1210) | 확인 · 고칠 것 없음 | sim: 인사 끝 뒤 앱 차례가 'This is it. Do we like it?' 이다. 붙인 줄은 읽기 항목 card 로 읽힌다(tori.tsx 410~411 lessonSpeakItemsOf). 단언은 마지막 문장 포함으로 본다 |
| 5 신호 말이 답 소리 앞(1268~1287) | 확인 · 고칠 것 없음 | sim: 받침 첫째 신호 말 'Listen, then say it with me!'(긴 꼴 둘째 — 행 차례 돌림이라 시험은 긴 꼴 목록 안으로 본다) · 답 소리 'Yes, I do.'. 흘림 차례 뜻 → 신호 말 → 소리 줄(lessonAfterLinesOf), 읽기 항목은 add → card · sound → sound 로 따로다(tori.tsx 410~415) |
| 6 받침 둘째 뜻 줄(1298~1301) | 확인 · 고칠 것 없음 | sim: 받침 둘째 붙일 줄이 장면 쉬운 질문 'Is it here?'. 붙인 줄의 뜻은 뜻 줄에 잇는다(tori.tsx 383~388) |
| 7 신호 말이 기록 칸에 없음(1303) | 확인 · 고칠 것 없음 | log.ts liveTeacherEntryOf 가 add kind cue 를 뺀다(묶음 2, 단위 talk-cue-line '기록 밖'). 행 text 에도 없다(짝 시험의 teacherRow.text 견줌) |
| 8 옛 시험의 상황 차례 가짜 반응 | 확인 · 고칠 것 없음 | sim 에서도 'Let's learn some new words!' 는 상황 줄로 바뀐다(e2e 어휘에 word 가 없고 사전이 있으면 꼬리를 떼지 않음 — 검토와 같음). e2e 단언(toContainText · toHaveText)을 grep 하니 이 글들을 보는 줄은 없고, 'Nice!' 를 보는 talk-lesson:894 는 카드 답 뒤 AI 차례(상황 차례 아님)라 남는다(sim A 둘째 차례 'Nice! Do you like it?' 그대로). teacher-window:695 의 인사 끝 'Nice!' 는 단언하지 않는다 |

### 실행(스크래치패드 `ai-scope-5-fix1-*.txt`)

| 명령 | 결과 |
|---|---|
| `pnpm vitest run --project unit`(단위 전체) | 166 파일 · 2211 통과 · 6 todo · 실패 0(짝 25) |
| `pnpm biome ci .` | 종료 0 |
| `npx tsc --noEmit` | 종료 0 |
| e2e · 통합 | **안 돌림**(CI 몫) |
